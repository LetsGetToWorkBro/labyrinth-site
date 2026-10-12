// Check one seasonal pack (or all that exist) on its own, while it is being made:
//     node season-theme-test.mjs christmas          PORT=4701 CHROME=/path/to/chrome node season-theme-test.mjs all
// It serves this folder itself and runs the same checks site-test.mjs runs for every pack (season-theme-checks.mjs). Exits 1 if any fails.
import { chromium } from 'playwright-core'
import { createServer } from 'node:http'
import { readFileSync, existsSync } from 'node:fs'
import { extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PACKS, checkPack } from './season-theme-checks.mjs'

const ROOT = fileURLToPath(new URL('.', import.meta.url))
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.xml': 'application/xml', '.txt': 'text/plain' }
const port = +(process.env.PORT ?? 4700)
const server = createServer((req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0]); let f = join(ROOT, p)
  if (p.endsWith('/')) f = join(ROOT, p, 'index.html')
  if (!existsSync(f) && existsSync(f + '.html')) f += '.html'
  if (!existsSync(f)) { res.statusCode = 404; res.end('404'); return }
  res.setHeader('content-type', TYPES[extname(f)] ?? 'application/octet-stream'); res.end(readFileSync(f))
})
await new Promise(r => server.listen(port, '127.0.0.1', r))
const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-proxy-server'] })
let pass = 0, fail = 0
const check = (n, c, x = '') => { if (c) { console.log('PASS  ' + n); pass++ } else { console.log('FAIL  ' + n + '  ' + x); fail++ } }
const want = process.argv[2] ?? 'all'
const names = want === 'all' ? Object.keys(PACKS).filter(n => existsSync(join(ROOT, `season-${n}.js`))) : [want]
if (!names.length || names.some(n => !PACKS[n])) { console.error('which pack? one of: ' + Object.keys(PACKS).join(', ') + ', or all'); process.exit(2) }
for (const name of names) await checkPack({ browser, base: `http://127.0.0.1:${port}`, check, name })
console.log(`\n${pass} passed, ${fail} failed`)
await browser.close(); server.close()
process.exit(fail ? 1 : 0)
