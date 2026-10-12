// The holiday Monday post: an open mat in the morning and a wrestling class at 2 PM, said at a glance.
// Words only, in the house type (Anton and Oswald on near-black with the gold), so there is no photograph of anybody to have a release for.
// Renders assets/social/holiday-mat-feed.png (1080x1350, 4:5) and holiday-mat-story.png (1080x1920, 9:16).
// The captions are in assets/social/holiday-mat-post.txt; change the times in both places or in neither.
// Run: node scripts/post-holiday-mat.mjs   (needs playwright-core, resolved from the CRM repo when not installed here)
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
const logo = b64(join(here, '..', 'assets', 'logo-maze-480.png'), 'image/png')

const BG = '#0A0A0A', GOLD = '#C8A24C', TEXT = '#F0F0F0', MUTED = '#a8a8a8'

// What is on, in the words of the pictures. The captions say the same things in sentences.
const SESSIONS = [
  { name: 'Open mat', time: '10:00 to 11:30 AM', note: 'All levels welcome.<br>Visitors from other academies too.' },
  { name: 'Wrestling class', time: '2:00 PM', note: 'Youth wrestling is for ages 7 to 17.<br>No experience needed.' }
]

// The story keeps its words between y=250 and y=1580, clear of Stories' own bar at the top and reply box at the bottom.
function art(h, story) {
  const top = story ? 290 : 52                 // the logo and the badge
  const stack = story ? 528 : 286              // where the two sessions and the footer start; they flow down from here
  const session = s => `<div class="s"><div class="name">${s.name}</div><div class="time"><span>${s.time}</span></div><div class="note">${s.note}</div></div>`
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:Anton;src:url(${anton}) format('woff2')}@font-face{font-family:Oswald;font-weight:700;src:url(${oswald}) format('woff2')}
*{margin:0;box-sizing:border-box}
body{width:1080px;height:${h}px;position:relative;overflow:hidden;background:${BG};font-family:Oswald,sans-serif;font-weight:700;color:${TEXT}}
.glow{position:absolute;inset:0;background:radial-gradient(85% 45% at 88% ${story ? 18 : 12}%, rgba(200,162,76,.20) 0%, rgba(200,162,76,0) 72%),radial-gradient(90% 40% at 8% 96%, rgba(200,162,76,.12) 0%, rgba(200,162,76,0) 70%)}
.logo{position:absolute;left:70px;top:${top}px;width:108px;height:108px;filter:invert(1)}
.badge{position:absolute;right:70px;top:${top - 6}px;width:206px;height:206px;border-radius:50%;background:${GOLD};border:7px solid ${BG};box-shadow:0 0 0 4px ${GOLD};transform:rotate(9deg);
  display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:Anton,sans-serif;font-weight:400;color:${BG};text-transform:uppercase;line-height:.98;text-align:center}
.badge span{font-size:27px;letter-spacing:.07em}.badge b{font-weight:400;font-size:72px}
.kick{position:absolute;left:70px;top:${top + 138}px;font-size:31px;letter-spacing:.2em;text-transform:uppercase;color:${GOLD};white-space:nowrap}
.stack{position:absolute;left:70px;right:70px;top:${stack}px}
.s{padding-left:34px;border-left:8px solid ${GOLD}}
.name{font-family:Anton,sans-serif;font-weight:400;font-size:${story ? 120 : 124}px;line-height:1.02;text-transform:uppercase;white-space:nowrap}
.time{margin-top:${story ? 22 : 20}px}
.time span{display:inline-block;background:${GOLD};color:${BG};font-family:Anton,sans-serif;font-weight:400;font-size:${story ? 104 : 108}px;line-height:1.04;padding:0 .14em;text-transform:uppercase;white-space:nowrap}
.note{margin-top:${story ? 26 : 24}px;font-size:${story ? 39 : 38}px;line-height:1.28;letter-spacing:.03em;color:${TEXT}}
.rule{height:2px;margin:${story ? 38 : 30}px 0;background:rgba(200,162,76,.38)}
.foot{margin-top:${story ? 58 : 48}px;font-size:${story ? 33 : 31}px;line-height:1.5;letter-spacing:.1em;text-transform:uppercase;color:${MUTED}}
.foot b{color:${TEXT};font-weight:700}
.foot .who{color:${GOLD}}
</style></head><body>
  <div class="glow"></div>
  <img class="logo" src="${logo}" alt="">
  <div class="badge"><span>Holiday</span><b>Today</b></div>
  <div class="kick">Monday &middot; October 12</div>
  <div class="stack">
    ${session(SESSIONS[0])}
    <div class="rule"></div>
    ${session(SESSIONS[1])}
    <div class="foot"><div class="who">Labyrinth BJJ &middot; Fulshear, TX</div><div>6615 West Cross Creek Bend Lane, Suite #400</div><div>Questions? Call or text <b>(281) 393-7983</b></div></div>
  </div>
</body></html>`
}

const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/opt/pw-browsers/chromium' })
let bad = 0
for (const [name, h, story] of [['holiday-mat-feed', 1350, false], ['holiday-mat-story', 1920, true]]) {
  const page = await browser.newPage({ viewport: { width: 1080, height: h } })
  await page.setContent(art(h, story), { waitUntil: 'load' })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(300)
  // Words must stay inside the side margins and, in the story, between Stories' top bar and bottom reply box; nothing may touch anything else.
  const problems = await page.evaluate(({ h, story }) => {
    const out = []
    const name = el => el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className ? '.' + el.className.split(' ')[0] : '')
    for (const el of document.querySelectorAll('.kick, .name, .time span, .note, .foot, .foot div, .logo, .badge')) {
      const r = el.getBoundingClientRect()
      if (r.right > 1010.5 && !el.classList.contains('badge')) out.push(`${name(el)} runs to ${Math.round(r.right)}px (right margin is 1010px)`)
      if (r.left < 69.5) out.push(`${name(el)} starts at ${Math.round(r.left)}px (left margin is 70px)`)
      if (story && r.top < 249) out.push(`${name(el)} starts at y=${Math.round(r.top)}, inside Stories' top bar`)
      if (story && r.bottom > 1581) out.push(`${name(el)} ends at y=${Math.round(r.bottom)}, inside Stories' reply box`)
      if (!story && r.bottom > h - 50) out.push(`${name(el)} ends at y=${Math.round(r.bottom)}, too close to the edge`)
      if (el.scrollWidth > el.clientWidth + 1 && el.clientWidth && !el.classList.contains('badge')) out.push(`${name(el)} is wider than its box (${el.scrollWidth} > ${el.clientWidth})`)
    }
    // the date line and the badge sit above the sessions and clear of the logo and of each other
    const first = document.querySelector('.s').getBoundingClientRect()
    const kick = document.querySelector('.kick').getBoundingClientRect(), logo = document.querySelector('.logo').getBoundingClientRect(), badge = document.querySelector('.badge').getBoundingClientRect()
    if (kick.bottom > first.top - 20) out.push(`the date line runs into the first session (${Math.round(kick.bottom)} > ${Math.round(first.top - 20)})`)
    if (badge.bottom > first.top - 4) out.push('the badge runs into the first session')
    if (badge.left < logo.right + 20) out.push('the badge runs into the logo')
    if (badge.bottom > kick.top + 40 && badge.left < kick.right + 10) out.push('the badge runs into the date line')
    // the two sessions are the same size, so neither looks like the afterthought
    const [a, b] = [...document.querySelectorAll('.name')].map(e => e.getBoundingClientRect().height)
    if (Math.abs(a - b) > 2) out.push('the two sessions are not set in the same size')
    return out
  }, { h, story })
  if (problems.length) { bad++; console.error(`PROBLEM ${name}:\n  ` + problems.join('\n  ')) }
  await page.screenshot({ path: join(out, name + '.png') })
  console.log('wrote ' + join(out, name + '.png'))
  await page.close()
}
await browser.close()
if (bad) process.exit(1)
