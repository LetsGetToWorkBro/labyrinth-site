// The Columbus Day Monday post: an open mat in the morning and a wrestling class at 2 PM, said at a glance, in the colours of the day.
// Navy, red and cream with the academy's gold, a compass rose and a sailing ship, and no photograph of anybody to have a release for.
// Renders assets/social/columbus-day-mat-feed.png (1080x1350, 4:5) and columbus-day-mat-story.png (1080x1920, 9:16).
// The captions are in assets/social/columbus-day-mat-post.txt; change the times in both places or in neither.
// Run: node scripts/post-columbus-day-mat.mjs   (needs playwright-core, resolved from the CRM repo when not installed here)
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { mkdirSync, readFileSync } from 'node:fs'
import { NAVY, NAVY_LIT, GOLD, CREAM, RED, MUTED, compass, ship, star } from './columbus-art.mjs'
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


// What is on, in the words of the pictures. The captions say the same things in sentences.
const SESSIONS = [
  { name: 'Open mat', time: '10:00 to 11:30 AM', note: 'All levels welcome.<br>Visitors from other academies too.' },
  { name: 'Wrestling class', time: '2:00 PM', note: 'Youth wrestling is for ages 7 to 17.<br>No experience needed.' }
]

// The story keeps its words between y=250 and y=1580, clear of Stories' own bar at the top and reply box at the bottom.
function art(h, story) {
  const top = story ? 290 : 46                  // the logo
  const head = story ? 428 : 172                // "Columbus Day"
  const date = head + (story ? 108 : 100)       // the date line under it
  const stack = story ? 610 : 352               // where the two sessions and the footer start; they flow down from here
  const wave = 'M0,12 ' + 'q 15,-14 30,0 '.repeat(1) + 't 30,0 '.repeat(30)
  const session = s => `<div class="s"><div class="name">${s.name}</div><div class="time"><span>${s.time}</span></div><div class="note">${s.note}</div></div>`
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:Anton;src:url(${anton}) format('woff2')}@font-face{font-family:Oswald;font-weight:700;src:url(${oswald}) format('woff2')}
*{margin:0;box-sizing:border-box}
body{width:1080px;height:${h}px;position:relative;overflow:hidden;font-family:Oswald,sans-serif;font-weight:700;color:${CREAM};
  background:radial-gradient(90% 46% at 92% ${story ? 14 : 8}%, ${NAVY_LIT} 0%, rgba(23,48,106,0) 74%), ${NAVY}}
.grid{position:absolute;inset:0;background-image:linear-gradient(rgba(244,241,232,.04) 1px, transparent 1px),linear-gradient(90deg, rgba(244,241,232,.04) 1px, transparent 1px);background-size:90px 90px}
.wm{position:absolute;width:${story ? 940 : 820}px;right:${story ? -310 : -250}px;top:${story ? 150 : -120}px;opacity:1}
.wm svg{display:block;width:100%;height:auto}
.logo{position:absolute;left:70px;top:${top}px;width:96px;height:96px;filter:invert(1)}
.ship{position:absolute;right:70px;top:${story ? 292 : 62}px;width:${story ? 340 : 330}px}
.ship svg{display:block;width:100%;height:auto}
.head{position:absolute;left:70px;top:${head}px;font-family:Anton,sans-serif;font-weight:400;font-size:${story ? 90 : 88}px;line-height:1;text-transform:uppercase;letter-spacing:.01em;white-space:nowrap}
.kick{position:absolute;left:70px;top:${date}px;display:flex;align-items:center;gap:22px;font-size:32px;letter-spacing:.18em;text-transform:uppercase;color:${GOLD};white-space:nowrap}
.today{display:inline-block;background:${RED};color:${CREAM};font-family:Anton,sans-serif;font-weight:400;font-size:30px;letter-spacing:.1em;line-height:1;padding:9px 18px 7px;border-radius:6px}
.stack{position:absolute;left:70px;right:70px;top:${stack}px}
.s{padding-left:34px;border-left:8px solid ${GOLD}}
.name{font-family:Anton,sans-serif;font-weight:400;font-size:${story ? 108 : 108}px;line-height:1.02;text-transform:uppercase;white-space:nowrap}
.time{margin-top:${story ? 20 : 18}px}
.time span{display:inline-block;background:${GOLD};color:${NAVY};font-family:Anton,sans-serif;font-weight:400;font-size:${story ? 94 : 94}px;line-height:1.04;padding:0 .14em;text-transform:uppercase;white-space:nowrap}
.note{margin-top:${story ? 24 : 22}px;font-size:${story ? 35 : 34}px;line-height:1.28;letter-spacing:.03em;color:${CREAM}}
.sea{display:block;width:940px;height:24px;margin:${story ? 30 : 24}px 0}
.foot{margin-top:${story ? 46 : 40}px;font-size:${story ? 32 : 30}px;line-height:1.5;letter-spacing:.1em;text-transform:uppercase;color:${MUTED}}
.foot b{color:${CREAM};font-weight:700}
.foot .who{color:${GOLD}}
.band{position:absolute;left:0;right:0;bottom:0;height:36px;background:repeating-linear-gradient(to bottom, ${RED} 0 6px, ${CREAM} 6px 12px)}
.canton{position:absolute;left:0;bottom:0;width:230px;height:36px;background:${NAVY}}
.canton svg{display:block}
</style></head><body>
  <div class="grid"></div>
  <div class="wm">${compass('rgba(200,162,76,.20)', 'rgba(200,162,76,.12)', 1.2)}</div>
  <img class="logo" src="${logo}" alt="">
  <div class="ship">${ship()}</div>
  <div class="head">Columbus Day</div>
  <div class="kick"><span>Monday &middot; October 12</span><span class="today">Today</span></div>
  <div class="stack">
    ${session(SESSIONS[0])}
    <svg class="sea" viewBox="0 0 940 24"><path d="${wave}" fill="none" stroke="${GOLD}" stroke-opacity=".6" stroke-width="3" stroke-linecap="round"/></svg>
    ${session(SESSIONS[1])}
    <div class="foot"><div class="who">Labyrinth BJJ &middot; Fulshear, TX</div><div>6615 West Cross Creek Bend Lane, Suite #400</div><div>Questions? Call or text <b>(281) 393-7983</b></div></div>
  </div>
  <div class="band"></div>
  <div class="canton"><svg width="230" height="36" viewBox="0 0 230 36">${[28, 69, 115, 161, 202].map(x => star(x, 18, 11)).join('')}</svg></div>
</body></html>`
}

const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/opt/pw-browsers/chromium' })
let bad = 0
for (const [name, h, story] of [['columbus-day-mat-feed', 1350, false], ['columbus-day-mat-story', 1920, true]]) {
  const page = await browser.newPage({ viewport: { width: 1080, height: h } })
  await page.setContent(art(h, story), { waitUntil: 'load' })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(300)
  // Words must stay inside the side margins and, in the story, between Stories' top bar and bottom reply box; nothing may touch anything else.
  const problems = await page.evaluate(({ h, story }) => {
    const out = []
    const name = el => el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className ? '.' + el.className.split(' ')[0] : (el.className && el.className.baseVal ? '.' + el.className.baseVal.split(' ')[0] : ''))
    for (const el of document.querySelectorAll('.head, .kick, .kick span, .name, .time span, .note, .foot, .foot div, .logo, .ship')) {
      const r = el.getBoundingClientRect()
      if (r.right > 1010.5) out.push(`${name(el)} runs to ${Math.round(r.right)}px (right margin is 1010px)`)
      if (r.left < 69.5) out.push(`${name(el)} starts at ${Math.round(r.left)}px (left margin is 70px)`)
      if (story && r.top < 249) out.push(`${name(el)} starts at y=${Math.round(r.top)}, inside Stories' top bar`)
      if (story && r.bottom > 1581 && !el.classList.contains('band')) out.push(`${name(el)} ends at y=${Math.round(r.bottom)}, inside Stories' reply box`)
      if (!story && r.bottom > h - 50) out.push(`${name(el)} ends at y=${Math.round(r.bottom)}, too close to the stripes`)
      if (el.scrollWidth > el.clientWidth + 1 && el.clientWidth) out.push(`${name(el)} is wider than its box (${el.scrollWidth} > ${el.clientWidth})`)
    }
    const R = s => document.querySelector(s).getBoundingClientRect()
    const first = R('.s'), head = R('.head'), kick = R('.kick'), logo = R('.logo'), ship = R('.ship'), foot = R('.foot'), band = R('.band')
    const rects = [...document.querySelectorAll('.s')].map(e => e.getBoundingClientRect())
    // the top of the picture: the logo, the day, the date and the ship each keep to their own space
    if (logo.bottom > head.top - 10) out.push('the logo runs into "Columbus Day"')
    if (head.bottom > kick.top - 4) out.push('"Columbus Day" runs into the date line')
    if (head.right > ship.left - 24) out.push(`"Columbus Day" runs into the ship (${Math.round(head.right)} > ${Math.round(ship.left - 24)})`)
    if (kick.right > ship.left - 24 && kick.top < ship.bottom) out.push('the date line runs into the ship')
    if (kick.bottom > first.top - 20) out.push(`the date line runs into the first session (${Math.round(kick.bottom)} > ${Math.round(first.top - 20)})`)
    if (ship.bottom > first.top - 6) out.push(`the ship runs into the first session (${Math.round(ship.bottom)} > ${Math.round(first.top - 6)})`)
    if (rects[0].bottom > rects[1].top - 20) out.push('the two sessions run into each other')
    if (rects[1].bottom > foot.top - 24) out.push('the second session runs into the footer')
    if (foot.bottom > band.top - 24) out.push(`the footer runs into the stripes (${Math.round(foot.bottom)} > ${Math.round(band.top - 24)})`)
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
