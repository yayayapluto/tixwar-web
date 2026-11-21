// Print a local HTML file to PDF via Chrome DevTools Protocol.
// Usage: node cdp-print.js <html-file-url> <out.pdf>
const { execFile } = require('child_process');
const fs = require('fs');
const crypto = require('crypto');

const [,, url, outPdf] = process.argv;
if (!url || !outPdf) { console.error('usage: node cdp-print.js <url> <out.pdf>'); process.exit(2); }

const policyFile = '/tmp/webgl-policy.txt';
const sha = crypto.createHash('sha256').update(fs.readFileSync(policyFile)).digest('hex');
const port = 9223;
const profile = '/tmp/chrome-cdp-prof';

const chrome = execFile('/opt/meta-chromium/chrome', [
  '--headless', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
  '--no-proxy-server', `--user-data-dir=${profile}`,
  `--hatch-webgl-allowed-domains-file=${policyFile}`,
  `--hatch-webgl-allowed-domains-sha256=${sha}`,
  `--remote-debugging-port=${port}`, 'about:blank',
], { env: { ...process.env, http_proxy: '', https_proxy: '', HTTP_PROXY: '', HTTPS_PROXY: '', ALL_PROXY: '', all_proxy: '' } });
chrome.stdout.on('data', d => process.stderr.write('[chrome] ' + d));
chrome.stderr.on('data', d => { const s = String(d); if (!/dbus|DBus|UPower|NetworkManager|SODA/.test(s)) process.stderr.write('[chrome] ' + s); });

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function getJson(path) {
  for (let i = 0; i < 50; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}${path}`);
      if (res.ok) return await res.json();
    } catch (e) { /* not up yet */ }
    await sleep(300);
  }
  throw new Error('CDP endpoint did not come up');
}

(async () => {
  let ws;
  try {
    const version = await getJson('/json/version');
    ws = new WebSocket(version.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
    let id = 0;
    const pending = new Map();
    const events = [];
    ws.onmessage = (m) => {
      const msg = JSON.parse(m.data);
      if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
      else if (msg.method) events.push(msg);
    };
    const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
      const mid = ++id;
      pending.set(mid, (msg) => msg.error ? reject(new Error(method + ': ' + JSON.stringify(msg.error))) : resolve(msg.result));
      ws.send(JSON.stringify({ id: mid, method, params, sessionId }));
      setTimeout(() => { if (pending.has(mid)) { pending.delete(mid); reject(new Error(method + ' timeout')); } }, 60000);
    });

    const { result: { targetId } } = await send('Target.createTarget', { url: 'about:blank' }).then(r => ({ result: r }));
    const attached = await send('Target.attachToTarget', { targetId, flatten: true });
    const sessionId = attached.sessionId;
    await send('Page.enable', {}, sessionId);
    const navPromise = new Promise((resolve) => {
      const check = setInterval(() => {
        if (events.some(e => e.method === 'Page.loadEventFired' && e.sessionId === sessionId)) { clearInterval(check); resolve(); }
      }, 200);
      setTimeout(() => { clearInterval(check); resolve(); }, 30000);
    });
    await send('Page.navigate', { url }, sessionId);
    await navPromise;
    await sleep(1500); // let base64 images decode and layout settle
    const pdf = await send('Page.printToPDF', {
      preferCSSPageSize: true, printBackground: true,
      marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0,
    }, sessionId);
    fs.writeFileSync(outPdf, Buffer.from(pdf.data, 'base64'));
    console.log('wrote', outPdf, fs.statSync(outPdf).size, 'bytes');
  } catch (e) {
    console.error('FAILED:', e.message);
    process.exitCode = 1;
  } finally {
    if (ws) ws.close();
    chrome.kill('SIGKILL');
  }
})();
