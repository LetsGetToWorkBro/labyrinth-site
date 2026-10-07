// Facebook cover for the Labyrinth BJJ Wharton page.
//   assets/social/wharton-facebook-cover.png   1640x624 (2x of Facebook's 820x312 desktop cover)
// Facebook shows the cover at 820x312 on desktop and crops it to roughly the middle two thirds on phones (16:9),
// and the profile picture covers the bottom-left corner, so everything that matters sits in x 300 to 1380.
// Run: node scripts/banner-wharton-facebook.mjs   (needs playwright-core, resolved from the CRM repo when not installed here)
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { readFileSync } from 'node:fs'
const here = dirname(fileURLToPath(import.meta.url))
const req = createRequire(import.meta.url)
let chromium
try { ({ chromium } = req('playwright-core')) } catch { ({ chromium } = req('/home/user/labyrinth-app/node_modules/playwright-core')) }
const b64 = (p, mime) => `data:${mime};base64,${readFileSync(p).toString('base64')}`
const anton = b64(join(here, 'fonts', 'anton-latin-400-normal.woff2'), 'font/woff2')
const oswald = b64(join(here, 'fonts', 'oswald-latin-700-normal.woff2'), 'font/woff2')
const photo = b64(join(here, '..', 'wharton-site', 'assets', 'wharton-kids.jpg'), 'image/jpeg')
const GOLD = '#c8a24c'

const html = (guides) => `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:Anton;src:url(${anton}) format('woff2')}@font-face{font-family:Oswald;font-weight:700;src:url(${oswald}) format('woff2')}
*{margin:0;box-sizing:border-box}
body{width:1640px;height:624px;position:relative;overflow:hidden;font-family:Oswald,sans-serif;color:#fff;
  background:radial-gradient(90% 140% at 20% 0%, #2a2112 0%, #0f0e0c 55%, #0a0a0a 100%)}
.photo{position:absolute;right:0;top:0;width:860px;height:624px;background:url(${photo}) center 28%/cover}
.photo::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,#0b0a09 0%,rgba(11,10,9,.88) 14%,rgba(11,10,9,.35) 48%,rgba(11,10,9,0) 78%),linear-gradient(0deg,rgba(10,10,10,.45),rgba(10,10,10,0) 40%)}
.text{position:absolute;left:350px;top:66px;width:760px}
.chip{display:inline-block;background:${GOLD};color:#0a0a0a;border-radius:999px;padding:9px 24px 8px;font-size:29px;letter-spacing:.14em;text-transform:uppercase}
.h{margin-top:16px;font-family:Anton,sans-serif;text-transform:uppercase;line-height:.98;font-size:116px;letter-spacing:.005em}
.h span{display:block;color:${GOLD}}
.s{margin-top:20px;font-size:30px;line-height:1.35;letter-spacing:.09em;text-transform:uppercase;color:#f1ece0}
.s i{font-style:normal;color:${GOLD};padding:0 10px}
.u{position:absolute;left:350px;bottom:38px;font-size:25px;letter-spacing:.12em;text-transform:uppercase;color:#cfc7b4}
${guides ? `.g{position:absolute;border:3px dashed #ff3b3b;pointer-events:none}.g1{left:262px;right:262px;top:0;bottom:0}.g2{left:0;top:384px;width:340px;height:240px}` : ''}
</style></head><body>
  <div class="photo"></div>
  <div class="text">
    <div class="chip">Opens February 1, 2027</div>
    <div class="h">Labyrinth BJJ<span>Wharton</span></div>
    <div class="s">Kids Jiu-Jitsu<i>&middot;</i>Adult Kickboxing<br>Women&rsquo;s Self Defense<i>&middot;</i>Adult Jiu-Jitsu soon</div>
  </div>
  <div class="u">201 N Houston St, Wharton, TX &nbsp;&middot;&nbsp; First class free</div>
  ${guides ? '<div class="g g1"></div><div class="g g2"></div>' : ''}
</body></html>`

const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/opt/pw-browsers/chromium' })
const out = join(here, '..', 'assets', 'social')
for (const [file, guides] of [['wharton-facebook-cover.png', false], ['/tmp/claude-0/wharton-cover-guides.png', true]]) {
  const page = await browser.newPage({ viewport: { width: 1640, height: 624 } })
  await page.setContent(html(guides), { waitUntil: 'load' })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(300)
  await page.screenshot({ path: file.startsWith('/') ? file : join(out, file) })
  await page.close()
}
await browser.close()
console.log('wrote assets/social/wharton-facebook-cover.png')
