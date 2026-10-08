// The banner at the top of the Rolling for Ribbons matching-gift email (scripts/email-donation-match.html).
//   assets/social/donation-email-banner.jpg   1200x600 (shown at 600 wide, so it is sharp on a phone)
// The same community photo and the same plum wash as the Pink October email, so the two read as one family;
// the headline is the one on the posts. The email repeats everything the picture says in real text, because
// some mail apps do not show images until they are asked to.
// Run: node scripts/email-donation-banner.mjs   (needs playwright-core, resolved from the CRM repo when not installed here)
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
const photo = b64(join(here, '..', 'assets', 'strength-conditioning.jpg'), 'image/jpeg')

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:Anton;src:url(${anton}) format('woff2')}@font-face{font-family:Oswald;font-weight:700;src:url(${oswald}) format('woff2')}
*{margin:0;box-sizing:border-box}
body{width:1200px;height:600px;overflow:hidden;position:relative;background:#270e1a;color:#fff;font-family:Oswald,sans-serif}
.photo{position:absolute;inset:0;background:url(${photo}) 50% 12%/cover}
.photo::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(229,143,181,.26) 0%,rgba(229,143,181,.10) 42%,rgba(39,14,26,.62) 70%,#270e1a 100%);mix-blend-mode:multiply}
.shade{position:absolute;left:0;right:0;bottom:0;height:380px;background:linear-gradient(180deg,transparent,rgba(39,14,26,.9) 55%,rgba(39,14,26,.96))}
.chip{position:absolute;right:48px;top:40px;background:#E58FB5;color:#2a0f1c;border-radius:999px;padding:11px 28px 9px;font-size:27px;letter-spacing:.14em;text-transform:uppercase}
.copy{position:absolute;left:56px;right:56px;bottom:44px}
.tag{color:#f6b4d0;font-size:29px;letter-spacing:.2em;text-transform:uppercase;text-shadow:0 2px 12px rgba(39,14,26,.95)}
h1{margin-top:6px;font-family:Anton,sans-serif;font-weight:400;font-size:176px;line-height:.98;text-transform:uppercase;white-space:nowrap}
h1 span{color:#E58FB5}
</style></head><body>
  <div class="photo"></div><div class="shade"></div>
  <div class="chip">Matching gift</div>
  <div class="copy"><div class="tag">Rolling for Ribbons &middot; Pink October</div><h1>Triple <span>your gift</span></h1></div>
</body></html>`

const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/opt/pw-browsers/chromium' })
const page = await browser.newPage({ viewport: { width: 1200, height: 600 } })
await page.setContent(html, { waitUntil: 'load' })
await page.evaluate(() => document.fonts.ready)
await page.waitForTimeout(300)
await page.screenshot({ path: join(here, '..', 'assets', 'social', 'donation-email-banner.jpg'), type: 'jpeg', quality: 86 })
await browser.close()
console.log('wrote assets/social/donation-email-banner.jpg')
