// The banner at the top of the JJWL Houston email (assets/email/jjwl-houston-no-classes.html).
//   assets/social/jjwl-houston-email-banner.jpg   1200x600 (shown at 600 wide, so it is sharp on a phone)
// Near-black with JJWL's green (the color the site gives JJWL) and the academy's gold, the coaches' photo from JJWL Houston (assets/adult-card.jpg, the one on the front page) in a framed
// picture, and what the email says in big type. The email repeats everything the picture says in real text, because some mail apps do not show images until they are asked to.
// Run: node scripts/email-jjwl-banner.mjs   (needs playwright-core, resolved from the CRM repo when not installed here)
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { mkdirSync, readFileSync, statSync } from 'node:fs'
const here = dirname(fileURLToPath(import.meta.url))
const req = createRequire(import.meta.url)
let chromium
try { ({ chromium } = req('playwright-core')) } catch { ({ chromium } = req('/home/user/labyrinth-app/node_modules/playwright-core')) }
const out = process.env.OUT_DIR ?? join(here, '..', 'assets', 'social')
mkdirSync(out, { recursive: true })

const INK = '#070b09', GREEN = '#22c55e', GREEN_LIT = '#4ade80', GOLD = '#c8a24c', CREAM = '#f3f1ea'
const b64 = (p, mime) => `data:${mime};base64,${readFileSync(p).toString('base64')}`
const anton = b64(join(here, 'fonts', 'anton-latin-400-normal.woff2'), 'font/woff2')
const oswald = b64(join(here, 'fonts', 'oswald-latin-700-normal.woff2'), 'font/woff2')
const logo = b64(join(here, '..', 'assets', 'logo-maze-480.png'), 'image/png')
const photo = b64(join(here, '..', 'assets', 'adult-card.jpg'), 'image/jpeg')

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:Anton;src:url(${anton}) format('woff2')}@font-face{font-family:Oswald;font-weight:700;src:url(${oswald}) format('woff2')}
*{margin:0;box-sizing:border-box}
body{width:1200px;height:600px;overflow:hidden;position:relative;color:${CREAM};font-family:Oswald,sans-serif;font-weight:700;
  background:radial-gradient(62% 95% at 90% 8%, rgba(34,197,94,.22) 0%, rgba(34,197,94,0) 72%), ${INK}}
.stripes{position:absolute;inset:0;background:repeating-linear-gradient(135deg, rgba(243,241,234,.028) 0 2px, transparent 2px 64px)}
.logo{position:absolute;left:56px;top:38px;width:68px;height:68px;filter:invert(1)}
.brand{position:absolute;left:142px;top:58px;font-size:25px;letter-spacing:.2em;text-transform:uppercase;color:${GOLD};white-space:nowrap}
.kicker{position:absolute;left:56px;top:118px;font-size:30px;letter-spacing:.22em;text-transform:uppercase;color:${GREEN_LIT};white-space:nowrap}
.head{position:absolute;left:56px;top:176px;font-family:Anton,sans-serif;font-weight:400;font-size:124px;line-height:.98;text-transform:uppercase;letter-spacing:.005em;white-space:nowrap}
.head b{display:block;font-weight:400;color:${GREEN}}
.date{position:absolute;left:56px;top:436px;font-size:36px;letter-spacing:.14em;text-transform:uppercase;white-space:nowrap}
.date i{font-style:normal;color:${GOLD};padding:0 14px}
.pill{position:absolute;left:56px;top:510px;display:inline-flex;align-items:center;gap:12px;font-size:25px;letter-spacing:.12em;text-transform:uppercase;color:${GREEN_LIT};border:2.5px solid ${GREEN};border-radius:999px;padding:7px 22px 6px;white-space:nowrap;background:rgba(34,197,94,.10)}
.frame{position:absolute;left:690px;top:150px;width:454px;height:330px;border-radius:20px;border:4px solid ${GREEN};overflow:hidden;box-shadow:0 0 54px rgba(34,197,94,.34), 0 18px 40px rgba(0,0,0,.5)}
.frame img{display:block;width:100%;height:100%;object-fit:cover;object-position:50% 42%}
.tag{position:absolute;left:690px;top:496px;width:454px;text-align:right;font-size:23px;letter-spacing:.2em;text-transform:uppercase;white-space:nowrap}
.tag span{color:${GOLD}}
.band{position:absolute;left:0;right:0;bottom:0;height:16px;background:linear-gradient(90deg, ${GREEN} 0 62%, ${GOLD} 62% 100%)}
</style></head><body>
  <div class="stripes"></div>
  <img class="logo" src="${logo}" alt="">
  <div class="brand">Labyrinth BJJ &middot; Fulshear, TX</div>
  <div class="kicker">All hands on deck</div>
  <div class="head">No classes<b>Saturday</b></div>
  <div class="date">JJWL Houston<i>&middot;</i>October 17</div>
  <div class="pill">68 registrations</div>
  <div class="frame"><img src="${photo}" alt=""></div>
  <div class="tag"><span>Our coaches</span> at JJWL Houston</div>
  <div class="band"></div>
</body></html>`

const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/opt/pw-browsers/chromium' })
const page = await browser.newPage({ viewport: { width: 1200, height: 600 } })
await page.setContent(html, { waitUntil: 'load' })
await page.evaluate(() => document.fonts.ready)
await page.waitForTimeout(300)
// Everything stays inside the picture with room to spare, and nothing runs into anything else.
const problems = await page.evaluate(() => {
  const out = [], R = s => document.querySelector(s).getBoundingClientRect()
  for (const s of ['.brand', '.kicker', '.head', '.date', '.pill', '.logo']) {
    const r = R(s)
    if (r.left < 55.5) out.push(`${s} starts at ${Math.round(r.left)}px (the margin is 56px)`)
  }
  const head = R('.head'), date = R('.date'), pill = R('.pill'), frame = R('.frame'), band = R('.band'), brand = R('.brand'), kicker = R('.kicker'), logo = R('.logo'), tag = R('.tag')
  for (const [name, r] of [['the headline', head], ['the date line', date], ['the pill', pill], ['the name', brand], ['the label', kicker]]) {
    if (r.right > frame.left - 24) out.push(`${name} runs into the photo (${Math.round(r.right)} > ${Math.round(frame.left - 24)})`)
  }
  if (frame.right > 1144.5) out.push(`the photo runs to ${Math.round(frame.right)}px (the margin is 56px)`)
  if (logo.bottom > kicker.top - 8) out.push('the logo runs into the label')
  if (kicker.bottom > head.top - 4) out.push('the label runs into the headline')
  if (head.bottom > date.top - 8) out.push(`the headline runs into the date line (${Math.round(head.bottom)} > ${Math.round(date.top - 8)})`)
  if (date.bottom > pill.top - 8) out.push('the date line runs into the pill')
  if (pill.bottom > band.top - 14) out.push(`the pill runs into the stripe (${Math.round(pill.bottom)} > ${Math.round(band.top - 14)})`)
  if (frame.bottom > tag.top - 6) out.push('the photo runs into its caption')
  if (tag.bottom > band.top - 14) out.push('the caption runs into the stripe')
  return out
})
if (problems.length) { console.error('PROBLEM jjwl-houston-email-banner:\n  ' + problems.join('\n  ')); process.exitCode = 1 }
const file = join(out, 'jjwl-houston-email-banner.jpg')
await page.screenshot({ path: file, type: 'jpeg', quality: 86 })
await browser.close()
const kb = Math.round(statSync(file).size / 1024)
console.log(`wrote ${file} (${kb} KB)`)
if (kb > 200) { console.error('PROBLEM: the banner is over 200 KB'); process.exitCode = 1 }
