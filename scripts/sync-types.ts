import { mkdir } from 'node:fs/promises'

await mkdir('docs', { recursive: true })
await Bun.write('docs/api-types.d.ts', await Bun.file('../api/docs/api-types.d.ts').text())
console.log('docs/api-types.d.ts synced')
