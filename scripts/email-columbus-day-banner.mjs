// The banner at the top of the Columbus Day reminder email (assets/email/columbus-day-reminder.html).
//   assets/social/columbus-day-email-banner.jpg   1200x600 (shown at 600 wide, so it is sharp on a phone)
// The same navy, gold, compass rose and caravel as the post pictures (scripts/post-columbus-day-mat.mjs), with what the email says in big type.
// The email repeats everything the picture says in real text, because some mail apps do not show images until they are asked to.
// Run: node scripts/email-columbus-day-banner.mjs   (needs playwright-core, resolved from the CRM repo when not installed here)
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { mkdirSync, readFileSync, statSync } from 'node:fs'
import { NAVY, NAVY_LIT, GOLD, CREAM, RED, compass, ship, star } from './columbus-art.mjs'
const here = dirname(fileURLToPath(import.meta.url))
const req = createRequire(import.meta.url)
let chromium
try { ({ chromium } = req('playwright-core')) } catch { ({ chromium } = req('/home/user/labyrinth-app/node_modules/playwright-core')) }
const out = process.env.OUT_DIR ?? join(here, '..', 'assets', 'social')
mkdirSync(out, { recursive: true })

const b64 = (p, mime) => `data:${mime};base64,${readFileSync(p).toString('base64')}`
const anton = b64(join(here, 'fonts', 'anton-latin-400-normal.woff2'), 'font/woff2')
const oswald = b64(join(here, 'fonts', 'oswald-latin-700-normal.woff2'), 'font/woff2')
const logo = b64(join(here, '..', 'assets', 'logo-maze-480.png'), 'image/png')

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:Anton;src:url(${anton}) format('woff2')}@font-face{font-family:Oswald;font-weight:700;src:url(${oswald}) format('woff2')}
*{margin:0;box-sizing:border-box}
body{width:1200px;height:600px;overflow:hidden;position:relative;color:${CREAM};font-family:Oswald,sans-serif;font-weight:700;
  background:radial-gradient(70% 90% at 92% 12%, ${NAVY_LIT} 0%, rgba(23,48,106,0) 74%), ${NAVY}}
.grid{position:absolute;inset:0;background-image:linear-gradient(rgba(244,241,232,.04) 1px, transparent 1px),linear-gradient(90deg, rgba(244,241,232,.04) 1px, transparent 1px);background-size:80px 80px}
.wm{position:absolute;width:700px;right:-120px;top:-70px}
.wm svg,.ship svg{display:block;width:100%;height:auto}
.ship{position:absolute;right:56px;top:98px;width:430px}
.logo{position:absolute;left:56px;top:40px;width:72px;height:72px;filter:invert(1)}
.brand{position:absolute;left:148px;top:62px;font-size:27px;letter-spacing:.2em;text-transform:uppercase;color:${GOLD};white-space:nowrap}
.head{position:absolute;left:56px;top:122px;font-family:Anton,sans-serif;font-weight:400;font-size:148px;line-height:.98;text-transform:uppercase;letter-spacing:.005em;white-space:nowrap}
.date{position:absolute;left:56px;top:424px;display:flex;align-items:center;gap:20px;font-size:34px;letter-spacing:.16em;text-transform:uppercase;color:${GOLD};white-space:nowrap}
.today{background:${RED};color:${CREAM};font-family:Anton,sans-serif;font-weight:400;font-size:30px;letter-spacing:.1em;line-height:1;padding:9px 17px 7px;border-radius:6px}
.times{position:absolute;left:56px;top:488px;font-size:36px;letter-spacing:.07em;text-transform:uppercase;white-space:nowrap}
.times i{font-style:normal;color:${GOLD};padding:0 14px}
.band{position:absolute;left:0;right:0;bottom:0;height:26px;background:repeating-linear-gradient(to bottom, ${RED} 0 5px, ${CREAM} 5px 10px)}
.canton{position:absolute;left:0;bottom:0;width:190px;height:26px;background:${NAVY}}
</style></head><body>
  <div class="grid"></div>
  <div class="wm">${compass('rgba(200,162,76,.20)', 'rgba(200,162,76,.12)', 1.2)}</div>
  <div class="ship">${ship()}</div>
  <img class="logo" src="${logo}" alt="">
  <div class="brand">Labyrinth BJJ &middot; Fulshear, TX</div>
  <div class="head">Columbus<br>Day</div>
  <div class="date"><span>Monday &middot; October 12</span><span class="today">Today</span></div>
  <div class="times">Open mat 10:00 to 11:30 AM<i>&middot;</i>Wrestling 2:00 PM</div>
  <div class="band"></div>
  <div class="canton"><svg width="190" height="26" viewBox="0 0 190 26">${[24, 59, 95, 131, 166].map(x => star(x, 13, 8)).join('')}</svg></div>
</body></html>`

const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/opt/pw-browsers/chromium' })
const page = await browser.newPage({ viewport: { width: 1200, height: 600 } })
await page.setContent(html, { waitUntil: 'load' })
await page.evaluate(() => document.fonts.ready)
await page.waitForTimeout(300)
// Everything stays inside the picture with room to spare, and nothing runs into the ship.
const problems = await page.evaluate(() => {
  const out = [], R = s => document.querySelector(s).getBoundingClientRect()
  for (const s of ['.brand', '.head', '.date', '.times', '.logo']) {
    const r = R(s)
    if (r.left < 55.5) out.push(`${s} starts at ${Math.round(r.left)}px (the margin is 56px)`)
    if (r.right > 1144.5) out.push(`${s} runs to ${Math.round(r.right)}px (the margin is 56px)`)
  }
  const head = R('.head'), date = R('.date'), times = R('.times'), ship = R('.ship'), band = R('.band'), brand = R('.brand')
  if (head.right > ship.left - 20) out.push(`"Columbus Day" runs into the ship (${Math.round(head.right)} > ${Math.round(ship.left - 20)})`)
  if (brand.right > ship.left - 20) out.push('the name runs into the ship')
  if (head.bottom > date.top - 8) out.push('the headline runs into the date line')
  if (date.bottom > times.top - 8) out.push('the date line runs into the times')
  if (times.bottom > band.top - 14) out.push(`the times run into the stripes (${Math.round(times.bottom)} > ${Math.round(band.top - 14)})`)
  if (ship.bottom > times.top && ship.left < times.right) out.push('the ship runs into the times line')
  return out
})
if (problems.length) { console.error('PROBLEM columbus-day-email-banner:\n  ' + problems.join('\n  ')); process.exitCode = 1 }
const file = join(out, 'columbus-day-email-banner.jpg')
await page.screenshot({ path: file, type: 'jpeg', quality: 86 })
await browser.close()
const kb = Math.round(statSync(file).size / 1024)
console.log(`wrote ${file} (${kb} KB)`)
if (kb > 200) { console.error('PROBLEM: the banner is over 200 KB'); process.exitCode = 1 }
