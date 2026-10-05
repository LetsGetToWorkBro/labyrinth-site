// The "get people in" ad for the free women's self defense seminar (Rolling for Ribbons, Sat Oct 24, 11:00 AM to 12:30 PM).
// Renders assets/social/seminar-ad-feed.png (1080x1350, 4:5) and seminar-ad-story.png (1080x1920, 9:16).
// Run: node scripts/ad-seminar-free.mjs   (needs playwright-core, resolved from the CRM repo when not installed here)
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { mkdirSync, readFileSync } from 'node:fs'
import { ribbonSVG } from './ribbon-art.mjs'
const here = dirname(fileURLToPath(import.meta.url))
const req = createRequire(import.meta.url)
let chromium
try { ({ chromium } = req('playwright-core')) } catch { ({ chromium } = req('/home/user/labyrinth-app/node_modules/playwright-core')) }
const out = join(here, '..', 'assets', 'social')
mkdirSync(out, { recursive: true })

const b64 = (p, mime) => `data:${mime};base64,${readFileSync(p).toString('base64')}`
const anton = b64(join(here, 'fonts', 'anton-latin-400-normal.woff2'), 'font/woff2')
const oswald = b64(join(here, 'fonts', 'oswald-latin-700-normal.woff2'), 'font/woff2')

const RSVP = 'labyrinth.vision/self-defense-for-women'
const PLUM = '#2a0f1c', MAG = '#b0306b', PINK = '#e58fb5'

function ad(h, story) {
  const k = 1                         // same type size on both; the story only gets more air (and keeps clear of Stories' top and bottom UI)
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:Anton;src:url(${anton}) format('woff2')}@font-face{font-family:Oswald;font-weight:700;src:url(${oswald}) format('woff2')}
*{margin:0;box-sizing:border-box}
body{width:1080px;height:${h}px;position:relative;overflow:hidden;font-family:Oswald,sans-serif;color:${PLUM};
  background:radial-gradient(120% 90% at 85% 8%, #fbd9e6 0%, #f4b7d0 45%, ${PINK} 100%)}
.rib{position:absolute;right:-70px;top:${story ? 250 : 40}px;width:470px;opacity:.95;transform:rotate(8deg)}
.rib svg{width:100%;height:auto;display:block}
.pad{position:absolute;left:70px;right:70px;top:0;bottom:0}
.kick{position:absolute;left:0;top:${story ? 270 : 70}px;font-size:${34 * k}px;letter-spacing:.22em;text-transform:uppercase;color:${PLUM}}
.kick b{color:${MAG}}
.h{position:absolute;left:0;top:${story ? 400 : 190}px;font-family:Anton,sans-serif;text-transform:uppercase;line-height:.95}
.h .free{display:block;font-size:330px;color:${PLUM};letter-spacing:-.01em}
.h .l2{display:block;font-size:124px;color:${PLUM}}
.h .l3{display:block;font-size:124px;color:${MAG}}
.date{position:absolute;left:0;right:0;top:${story ? 1080 : 760}px;background:${PLUM};color:#fff;border-radius:26px;padding:28px 40px;display:flex;justify-content:space-between;align-items:center}
.date .a{font-family:Anton,sans-serif;font-size:78px;line-height:1;text-transform:uppercase}
.date .a span{color:${PINK}}
.date .b{font-size:34px;line-height:1.25;text-align:right;letter-spacing:.06em;text-transform:uppercase;color:#ffe3ee}
.pts{position:absolute;left:0;right:0;top:${story ? 1290 : 950}px;display:flex;gap:18px}
.pt{flex:1;border:4px solid ${PLUM};border-radius:22px;padding:20px 22px;font-size:31px;line-height:1.15;text-align:center;text-transform:uppercase;letter-spacing:.04em;background:rgba(255,255,255,.35)}
.pt b{display:block;font-family:Anton,sans-serif;font-weight:400;font-size:42px;color:${MAG};letter-spacing:.02em}
.cta{position:absolute;left:0;right:0;top:${story ? 1470 : 1100}px;display:flex;align-items:center;gap:28px}
.btn{background:${MAG};color:#fff;border-radius:999px;padding:26px 52px;font-family:Anton,sans-serif;font-size:60px;letter-spacing:.04em;text-transform:uppercase;white-space:nowrap}
.url{font-size:27px;line-height:1.25;letter-spacing:.05em;text-transform:uppercase;color:${PLUM}}
.url small{display:block;font-size:24px;opacity:.8;letter-spacing:.12em}
.foot{position:absolute;left:0;right:0;bottom:${story ? 250 : 34}px;display:flex;justify-content:space-between;font-size:25px;letter-spacing:.14em;text-transform:uppercase;color:${PLUM};opacity:.85}
</style></head><body>
  <div class="rib">${ribbonSVG(PLUM, { uid: 'ad' })}</div>
  <div class="pad">
    <div class="kick"><b>Pink October</b> &middot; Women&rsquo;s seminar</div>
    <div class="h"><span class="free">Free</span><span class="l2">Self defense</span><span class="l3">for women</span></div>
    <div class="date"><div class="a">Sat, Oct 24 <span>&middot; 11 AM</span></div><div class="b">Labyrinth BJJ<br>Fulshear, TX</div></div>
    <div class="pts"><div class="pt"><b>No experience</b>needed</div><div class="pt"><b>Bring a</b>friend</div><div class="pt"><b>Real</b>techniques</div></div>
    <div class="cta"><div class="btn">RSVP free &rarr;</div><div class="url">labyrinth.vision/<br>self-defense-for-women<small>Takes 30 seconds</small></div></div>
    <div class="foot"><span>Led by Coach Scott &amp; Professor Tony</span><span>Donations welcome</span></div>
  </div>
</body></html>`
}

const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/opt/pw-browsers/chromium' })
for (const [name, h, story] of [['seminar-ad-feed', 1350, false], ['seminar-ad-story', 1920, true]]) {
  const page = await browser.newPage({ viewport: { width: 1080, height: h } })
  await page.setContent(ad(h, story), { waitUntil: 'load' })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(300)
  await page.screenshot({ path: join(out, name + '.png') })
  console.log('wrote assets/social/' + name + '.png')
  await page.close()
}
await browser.close()
