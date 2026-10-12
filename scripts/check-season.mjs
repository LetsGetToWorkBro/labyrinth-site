// A season has just switched on: is the live homepage that season, with the files that were tested?
//   node scripts/check-season.mjs <name> [--shot out.png]      (set PIN_ISO to rehearse it at another moment; CHROME to use another Chromium)
// Run it from a checkout of main (npm i --no-save playwright-core first).
// The live files are fetched with curl and byte-compared with the repo's (the browser here cannot open the live https site); the page is then loaded from a local server
// on the REAL clock, so the date decides (nothing is pinned unless PIN_ISO is set). One line per check; exits 1 if any fails.
import { createRequire } from 'node:module'
import { createServer } from 'node:http'
import { readFileSync, existsSync } from 'node:fs'
import { extname, join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
const req = createRequire(import.meta.url)
const { chromium } = req('playwright-core')
const ROOT = fileURLToPath(new URL('..', import.meta.url)).replace(/\/$/, '')
const name = process.argv[2]
const shot = process.argv.includes('--shot') ? process.argv[process.argv.indexOf('--shot') + 1] : null
if (!name) { console.error('which season?'); process.exit(2) }
let bad = 0
const say = (ok, msg) => { console.log((ok ? 'PASS ' : 'FAIL ') + msg); if (!ok) bad++ }
const sha = b => createHash('sha256').update(b).digest('hex').slice(0, 16)
const live = p => execFileSync('curl', ['-sS', '--max-time', '30', `https://labyrinth.vision/${p}${p.includes('?') ? '&' : '?'}cb=${Date.now()}`], { maxBuffer: 50e6 })
const strip = b => Buffer.from(b.toString('utf8').replace(/<!-- Cloudflare Pages Analytics -->[\s\S]*?<\/body>/, '</body>'))
const idx = readFileSync(join(ROOT, 'index.html'), 'utf8')
say(sha(strip(live(''))) === sha(Buffer.from(idx)), 'live / is the home page in the repo')
for (const f of ['season-kit.css', 'season-kit.js', `season-${name}.css`, `season-${name}.js`]) {
  const v = new RegExp(`"\\./${f.replace('.', '\\.')}\\?v=([0-9a-f]{8})"`).exec(idx)?.[1]
  const got = v ? live(`${f}?v=${v}`) : Buffer.alloc(0)
  say(!!v && existsSync(join(ROOT, f)) && sha(got) === sha(readFileSync(join(ROOT, f))), `live ${f} (version ${v}) is the file in the repo`)
}
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.webp': 'image/webp', '.jpg': 'image/jpeg' }
const server = createServer((rq, rs) => { const p = decodeURIComponent(rq.url.split('?')[0]); let f = join(ROOT, p); if (p.endsWith('/')) f = join(f, 'index.html'); if (!existsSync(f) && existsSync(f + '.html')) f += '.html'; if (!existsSync(f)) { rs.statusCode = 404; rs.end(''); return } rs.setHeader('content-type', TYPES[extname(f)] ?? 'application/octet-stream'); rs.end(readFileSync(f)) })
await new Promise(r => server.listen(4696, '127.0.0.1', r))
const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-proxy-server'] })
const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage()
await page.route('**', r => r.request().url().startsWith('http://127.0.0.1:4696') ? r.continue() : r.abort())
const errors = [], asked = []
page.on('pageerror', e => errors.push(String(e)))
page.on('request', r => { const m = /\/(season-[a-z]+\.(?:css|js))/.exec(r.url()); if (m) asked.push(m[1]) })
if (process.env.PIN_ISO) await page.clock.setFixedTime(new Date(process.env.PIN_ISO))
await page.goto('http://127.0.0.1:4696/', { waitUntil: 'load' })
await page.waitForTimeout(700)
const r = await page.evaluate(() => ({
  when: new Date().toLocaleString('en-US', { timeZone: 'America/Chicago', dateStyle: 'full', timeStyle: 'short' }), season: document.documentElement.dataset.season || '',
  layers: document.querySelectorAll('.sk-hero, .sk-sec, .sk-footer').length, particles: document.querySelectorAll('.sk-hero .sk-p, .sk-hero .sk-tw, .sk-hero .sk-fly').length,
  taps: document.querySelectorAll('[data-tap]').length, bg: getComputedStyle(document.documentElement).getPropertyValue('--bg').trim(), halloween: [...document.querySelectorAll('.season-hero')].filter(e => getComputedStyle(e).display !== 'none').length,
  overflow: document.documentElement.scrollWidth > innerWidth,
}))
console.log('the page thinks it is:', r.when)
say(r.season === name, `the page is the ${name} season (it says ${r.season || 'none'})`)
say(r.layers === 14 && r.taps >= 3, `its decoration is built: ${r.layers} layers (hero, twelve sections, foot), ${r.taps} tap decorations`)
say([...new Set(asked)].sort().join() === ['season-kit.css', 'season-kit.js', `season-${name}.css`, `season-${name}.js`].sort().join(), `it fetched the kit and its own two files and nothing else of a season (${[...new Set(asked)].join(', ')})`)
say(errors.length === 0 && !r.overflow && r.halloween === 0, `no errors (${errors.length}), nothing sideways (${r.overflow}), no Halloween left (${r.halloween})`)
if (shot) { await page.screenshot({ path: shot }); console.log('wrote', shot) }
await browser.close(); server.close()
process.exit(bad ? 1 : 0)
