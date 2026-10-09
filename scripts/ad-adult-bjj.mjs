// The "get people in" ad for the adult classes (Adult BJJ, Fulshear): "Never trained? Good." with the first class free.
// The same idea as the printed flyer (scripts/poster-adult-bjj.mjs), so the club wall and the feed say the same thing.
// Renders assets/social/adult-bjj-ad-feed.png (1080x1350, 4:5) and adult-bjj-ad-story.png (1080x1920, 9:16).
// Run: node scripts/ad-adult-bjj.mjs   (needs playwright-core, resolved from the CRM repo when not installed here)
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { mkdirSync, readFileSync } from 'node:fs'
const here = dirname(fileURLToPath(import.meta.url))
const req = createRequire(import.meta.url)
let chromium
try { ({ chromium } = req('playwright-core')) } catch { ({ chromium } = req('/home/user/labyrinth-app/node_modules/playwright-core')) }
const out = process.env.OUT_DIR ?? join(here, '..', 'assets', 'social')
mkdirSync(out, { recursive: true })

const b64 = (p, mime) => `data:${mime};base64,${readFileSync(p).toString('base64')}`
const anton = b64(join(here, 'fonts', 'anton-latin-400-normal.woff2'), 'font/woff2')
const oswald = b64(join(here, 'fonts', 'oswald-latin-700-normal.woff2'), 'font/woff2')
const photo = b64(join(here, '..', 'assets', 'hero-poster-logo.jpg'), 'image/jpeg')
const logo = b64(join(here, '..', 'assets', 'logo-maze-480.png'), 'image/png')
const belt = b64(join(here, '..', 'assets', 'adult_white.svg'), 'image/svg+xml')

const BG = '#0A0A0A', GOLD = '#C8A24C', TEXT = '#F0F0F0', MUTED = '#a8a8a8'

// The story keeps its words between y=250 and y=1580, clear of Stories' own bar at the top and reply box at the bottom.
function ad(h, story) {
  const ph = story ? 780 : 560           // the photograph's height
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:Anton;src:url(${anton}) format('woff2')}@font-face{font-family:Oswald;font-weight:700;src:url(${oswald}) format('woff2')}
*{margin:0;box-sizing:border-box}
body{width:1080px;height:${h}px;position:relative;overflow:hidden;background:${BG};font-family:Oswald,sans-serif;font-weight:700;color:${TEXT}}
.glow{position:absolute;inset:0;background:radial-gradient(90% 55% at 15% 78%, rgba(200,162,76,.16) 0%, rgba(200,162,76,0) 70%)}
.photo{position:absolute;left:0;top:0;width:1080px;height:${ph}px;background:url(${photo}) ${story ? '16% 50%' : '28% 50%'}/cover no-repeat;filter:contrast(1.06) saturate(.9)}
.photo::after{content:'';position:absolute;inset:0;background:linear-gradient(to bottom, rgba(10,10,10,.6) 0%, rgba(10,10,10,0) 26%, rgba(10,10,10,0) 52%, ${BG} 100%)}
.logo{position:absolute;left:70px;top:${story ? 270 : 52}px;width:108px;height:108px;filter:invert(1)}
.badge{position:absolute;right:62px;top:${story ? 322 : 196}px;width:232px;height:232px;border-radius:50%;background:${GOLD};border:8px solid ${BG};box-shadow:0 0 0 4px ${GOLD};transform:rotate(9deg);
  display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:Anton,sans-serif;font-weight:400;color:${BG};text-transform:uppercase;line-height:.98;text-align:center}
.badge span{font-size:31px;letter-spacing:.05em}.badge b{font-weight:400;font-size:100px}
.pad{position:absolute;left:70px;right:70px;top:0;bottom:0}
.kick{position:absolute;left:0;top:${story ? 690 : 462}px;font-size:31px;letter-spacing:.2em;text-transform:uppercase;color:${GOLD};white-space:nowrap}
.h{position:absolute;left:0;top:${story ? 742 : 512}px;font-family:Anton,sans-serif;font-weight:400;text-transform:uppercase;line-height:1;white-space:nowrap}
.h .a{display:block;font-size:152px;letter-spacing:.005em}
.good{position:absolute;left:0;top:${story ? 922 : 690}px;display:flex;align-items:center;gap:30px}
.good .gold{display:inline-block;background:${GOLD};color:${BG};font-family:Anton,sans-serif;font-weight:400;text-transform:uppercase;font-size:276px;line-height:1.02;padding:0 .09em;white-space:nowrap}
.beltbox{width:252px}
.beltbox img{display:block;width:100%;height:auto}
.beltbox p{margin-top:16px;font-size:26px;line-height:1.2;letter-spacing:.07em;text-transform:uppercase;color:${TEXT}}
.sub{position:absolute;left:0;right:0;top:${story ? 1246 : 1004}px;font-size:42px;line-height:1.26;letter-spacing:.03em}
.sub b{color:${GOLD};font-weight:700}
.cta{position:absolute;left:0;right:0;top:${story ? 1396 : 1142}px;display:flex;align-items:center;gap:30px}
.btn{background:${GOLD};color:${BG};border-radius:999px;padding:24px 50px;font-family:Anton,sans-serif;font-weight:400;font-size:62px;line-height:1.05;letter-spacing:.04em;text-transform:uppercase;white-space:nowrap}
.url{font-size:32px;line-height:1.25;letter-spacing:.06em;text-transform:uppercase;white-space:nowrap}
.url small{display:block;font-size:24px;color:${MUTED};letter-spacing:.12em}
.foot{position:absolute;left:0;right:0;bottom:${story ? 346 : 34}px;display:flex;justify-content:space-between;font-size:25px;letter-spacing:.14em;text-transform:uppercase;color:${MUTED};white-space:nowrap}
</style></head><body>
  <div class="glow"></div>
  <div class="photo"></div>
  <img class="logo" src="${logo}" alt="">
  <div class="badge"><span>First class</span><b>Free</b></div>
  <div class="pad">
    <div class="kick">Adult jiu-jitsu &middot; Fulshear, TX</div>
    <div class="h"><span class="a">Never trained?</span></div>
    <div class="good"><span class="gold">Good.</span><div class="beltbox"><img src="${belt}" alt=""><p>Every black belt<br>started as a<br>white belt.</p></div></div>
    <div class="sub">No experience needed. We lend you the gi. <b>Mornings, middays and evenings.</b></div>
    <div class="cta"><div class="btn">Book a free class</div><div class="url">labyrinth.vision<small>Pick any class time</small></div></div>
    <div class="foot"><span>Labyrinth BJJ</span><span>Gi &amp; No-Gi &middot; All levels</span></div>
  </div>
</body></html>`
}

const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/opt/pw-browsers/chromium' })
let bad = 0
for (const [name, h, story] of [['adult-bjj-ad-feed', 1350, false], ['adult-bjj-ad-story', 1920, true]]) {
  const page = await browser.newPage({ viewport: { width: 1080, height: h } })
  await page.setContent(ad(h, story), { waitUntil: 'load' })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(300)
  // Words must stay inside the side margins and, in the story, between Stories' top bar and bottom reply box.
  const problems = await page.evaluate(({ h, story }) => {
    const out = []
    const name = el => el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className ? '.' + el.className.split(' ')[0] : '')
    for (const el of document.querySelectorAll('.kick, .h .a, .good .gold, .beltbox, .beltbox p, .sub, .btn, .url, .foot, .foot span')) {
      const r = el.getBoundingClientRect()
      if (r.right > 1010.5) out.push(`${name(el)} runs to ${Math.round(r.right)}px (right margin is 1010px)`)
      if (r.left < 69.5) out.push(`${name(el)} starts at ${Math.round(r.left)}px (left margin is 70px)`)
      if (story && r.top < 249) out.push(`${name(el)} starts at y=${Math.round(r.top)}, inside Stories' top bar`)
      if (story && r.bottom > 1581) out.push(`${name(el)} ends at y=${Math.round(r.bottom)}, inside Stories' reply box`)
      if (!story && r.bottom > h - 20) out.push(`${name(el)} ends at y=${Math.round(r.bottom)}, too close to the edge`)
      if (el.scrollWidth > el.clientWidth + 1 && el.clientWidth) out.push(`${name(el)} is wider than its box (${el.scrollWidth} > ${el.clientWidth})`)
    }
    // stacked blocks must not overlap each other
    const order = ['.kick', '.h', '.good', '.sub', '.cta', '.foot'].map(s => [s, document.querySelector(s).getBoundingClientRect()])
    for (let i = 0; i < order.length - 1; i++) if (order[i][1].bottom > order[i + 1][1].top + 0.5) out.push(`${order[i][0]} runs into ${order[i + 1][0]} (${Math.round(order[i][1].bottom)} > ${Math.round(order[i + 1][1].top)})`)
    // the badge sits on the photograph: clear of the headline and of the logo
    const b = document.querySelector('.badge').getBoundingClientRect(), hd = document.querySelector('.h').getBoundingClientRect(), lg = document.querySelector('.logo').getBoundingClientRect()
    if (b.bottom > hd.top - 6) out.push('the badge runs into the headline')
    if (b.left < lg.right + 20 && b.top < lg.bottom) out.push('the badge runs into the logo')
    return out
  }, { h, story })
  if (problems.length) { bad++; console.error(`PROBLEM ${name}:\n  ` + problems.join('\n  ')) }
  await page.screenshot({ path: join(out, name + '.png') })
  console.log('wrote ' + join(out, name + '.png'))
  await page.close()
}
await browser.close()
if (bad) process.exit(1)
