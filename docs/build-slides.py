import base64, pathlib, subprocess, sys, glob

OUT = pathlib.Path('/home/hatch/workspace/goals/tixwar-web-and-api-launch/files/tixwar-report')
BASE = pathlib.Path('/home/hatch/workspace/goals/tixwar-web-and-api-launch/files')

def b64(p):
    return 'data:image/png;base64,' + base64.b64encode(pathlib.Path(p).read_bytes()).decode()

tpl = pathlib.Path('/tmp/slide-template.html').read_text()
html = tpl.replace('__API_ARCH__', b64(BASE / 'tixwar-api-architecture-v2/tixwar-api-architecture.png'))
html = html.replace('__ORDER_FLOW__', b64(BASE / 'tixwar-api-architecture-v2/tixwar-api-architecture-order-flow.png'))
assert '__API_ARCH__' not in html and '__ORDER_FLOW__' not in html
(OUT / 'slide-tixwar.html').write_text(html)
print('html bytes:', len(html))

# Render PDF via CDP-driven headless Chromium (direct --print-to-pdf exits silently in this build)
subprocess.run(['rm', '-rf', '/tmp/chrome-cdp-prof'], check=False)
r = subprocess.run(['node', '/tmp/cdp-print.js',
                    'file://' + str(OUT / 'slide-tixwar.html'),
                    str(OUT / 'slide-tixwar.pdf')],
                   capture_output=True, text=True, timeout=180)
print(r.stdout)
print(r.stderr[-800:])
assert (OUT / 'slide-tixwar.pdf').exists(), 'PDF was not produced'
r = subprocess.run(['pdfinfo', str(OUT / 'slide-tixwar.pdf')], capture_output=True, text=True)
print([l for l in r.stdout.splitlines() if 'Pages' in l or 'Page size' in l])

# Render each slide to PNG
for p in glob.glob('/tmp/slide-png-*.png'):
    pathlib.Path(p).unlink()
r = subprocess.run(['pdftoppm', '-png', '-r', '150', str(OUT / 'slide-tixwar.pdf'), '/tmp/slide-png'],
                   capture_output=True, text=True)
print('pdftoppm rc:', r.returncode, r.stderr[-300:])
pngs = sorted(glob.glob('/tmp/slide-png-*.png'))
print('png count:', len(pngs))
assert len(pngs) == 12

# Build PPTX with python-pptx, one full-slide image per slide
from pptx import Presentation
from pptx.util import Inches
prs = Presentation()
prs.slide_width = Inches(13.33)
prs.slide_height = Inches(7.5)
blank = prs.slide_layouts[6]
for p in pngs:
    s = prs.slides.add_slide(blank)
    s.shapes.add_picture(p, 0, 0, width=prs.slide_width, height=prs.slide_height)
prs.save(str(OUT / 'slide-tixwar.pptx'))
print('pptx saved')

# Verify PPTX by reopening
prs2 = Presentation(str(OUT / 'slide-tixwar.pptx'))
print('pptx slides:', len(prs2.slides))
for i, s in enumerate(prs2.slides, 1):
    pics = [sh for sh in s.shapes if sh.shape_type == 13]
    assert len(pics) == 1, f'slide {i} has {len(pics)} pictures'
print('pptx verification OK: 12 slides, 1 picture each')
