// The "kids can start any day of the week" post, October 2026: membership is open, so a child's free first class is no longer a Friday or Saturday thing.
// The first post made from the academy's own photographs (the 2 October 2026 shoot by Israel De Leon, scripts/lightroom-album.py fetches an album)
// instead of the hero poster.
//   assets/social/kids-any-day-feed-1.png   1080x1350 (4:5)  the picture, the promise, the seven days, the button
//   assets/social/kids-any-day-feed-2.png   1080x1350 (4:5)  "Pick your day": the classes a new child can start in, by day, and the advanced No-Gi classes marked as such
//   assets/social/kids-any-day-story.png    1080x1920 (9:16) the same promise for Stories
// Slide 2 is read from scripts/schedule_data.py (the classes flagged "trial", and the advanced ones), so it cannot say something the timetable does not.
// Run: node scripts/instagram-kids-any-day.mjs   (needs playwright-core, resolved from the CRM repo when not installed here)
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { mkdirSync, readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
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
const photo = n => b64(join(here, '..', 'assets', 'social', 'photos', n), 'image/jpeg')
const PHOTO = { carry: photo('kids-carry-laugh.jpg'), highfive: photo('kids-high-five.jpg'), lineup: photo('kids-lineup-high-fives.jpg') }

const BG = '#0A0A0A', GOLD = '#C8A24C', TEXT = '#F0F0F0', MUTED = '#a8a8a8', ADV = '#FF9E80'

// ── What a new child can start in, by day, and the advanced classes beside them: straight from the timetable ──
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const classes = JSON.parse(execFileSync('python3', ['-c',
  'import sys, json; sys.path.insert(0, sys.argv[1]); import schedule_data as s; ' +
  "print(json.dumps([[d, t, n, a, st, 'adv' in f] for d, t, n, a, st, au, f in s.CLASSES if 'trial' in f or 'adv' in f]))", here]).toString())
const label = (n, a) => !a ? n : /\d/.test(a) ? `${n} ${a}` : `${n}, ${a}`
const byDay = DAYS.map(day => {
  const slots = []
  for (const [d, time, name, ages, style, adv] of classes) {
    if (d !== day) continue
    let s = slots.find(x => x.time === time && x.adv === adv)
    if (!s) slots.push(s = { time, adv, style, names: [] })
    // The advanced grappling classes are named by who they are for ("Kids 7-12"), under one "Advanced No-Gi" label.
    s.names.push(adv ? `${name.replace(/ Grappling$/, '')} ${ages}` : label(name, ages))
  }
  return { day, slots }
})
const noStart = byDay.filter(d => !d.slots.some(s => !s.adv)).map(d => d.day)
if (noStart.length) throw new Error('a day of the week has no class a new child can start in: ' + noStart)

const chips = DAYS.map(d => `<i>${d.slice(0, 3)}</i>`).join('')

// The story keeps its words between y=250 and y=1580, clear of Stories' own bar at the top and reply box at the bottom.
function slide1(h, story) {
  const ph = story ? 960 : 700            // the photograph's height
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:Anton;src:url(${anton}) format('woff2')}@font-face{font-family:Oswald;font-weight:700;src:url(${oswald}) format('woff2')}
*{margin:0;box-sizing:border-box}
body{width:1080px;height:${h}px;position:relative;overflow:hidden;background:${BG};font-family:Oswald,sans-serif;font-weight:700;color:${TEXT}}
.glow{position:absolute;inset:0;background:radial-gradient(90% 50% at 12% 84%, rgba(200,162,76,.15) 0%, rgba(200,162,76,0) 70%)}
.photo{position:absolute;left:0;top:0;width:1080px;height:${ph}px;background:url(${story ? PHOTO.highfive : PHOTO.carry}) ${story ? '56% 40%' : '62% 0%'}/cover no-repeat;filter:contrast(1.05) saturate(.95)}
.photo::after{content:'';position:absolute;inset:0;background:linear-gradient(to bottom, rgba(10,10,10,${story ? .5 : .42}) 0%, rgba(10,10,10,0) ${story ? 24 : 20}%, rgba(10,10,10,0) ${story ? 52 : 46}%, ${BG} 100%)}
.logo{position:absolute;${story ? 'right' : 'left'}:70px;top:${story ? 272 : 52}px;width:108px;height:108px;filter:invert(1) drop-shadow(0 2px 9px rgba(0,0,0,.65))}
.pad{position:absolute;left:70px;right:70px;top:0;bottom:0}
.kick{position:absolute;left:0;top:${story ? 890 : 640}px;font-size:31px;letter-spacing:.2em;text-transform:uppercase;color:${GOLD};white-space:nowrap}
.h{position:absolute;left:0;top:${story ? 942 : 690}px;font-family:Anton,sans-serif;font-weight:400;text-transform:uppercase;line-height:1.04;white-space:nowrap}
.h span{display:block;font-size:112px;letter-spacing:.004em}
.h .b{color:${GOLD}}
.days{position:absolute;left:0;right:0;top:${story ? 1212 : 960}px;display:flex;justify-content:space-between}
.days i{font-style:normal;width:124px;height:78px;display:flex;align-items:center;justify-content:center;background:${GOLD};color:${BG};border-radius:15px;font-family:Anton,sans-serif;font-weight:400;font-size:40px;letter-spacing:.06em;text-transform:uppercase;padding-top:3px}
.sub{position:absolute;left:0;right:0;top:${story ? 1320 : 1058}px;font-size:40px;line-height:1.26;letter-spacing:.03em}
.sub b{color:${GOLD};font-weight:700}
.cta{position:absolute;left:0;right:0;top:${story ? 1404 : 1150}px;display:flex;align-items:center;gap:30px}
.btn{background:${GOLD};color:${BG};border-radius:999px;padding:24px 50px;font-family:Anton,sans-serif;font-weight:400;font-size:62px;line-height:1.05;letter-spacing:.04em;text-transform:uppercase;white-space:nowrap}
.url{font-size:32px;line-height:1.25;letter-spacing:.06em;text-transform:uppercase;white-space:nowrap}
.url small{display:block;font-size:24px;color:${MUTED};letter-spacing:.12em}
.foot{position:absolute;left:0;right:0;bottom:${story ? 346 : 34}px;display:flex;justify-content:space-between;font-size:25px;letter-spacing:.14em;text-transform:uppercase;color:${MUTED};white-space:nowrap}
.swipe::after{content:'';display:inline-block;margin-left:14px;border-left:15px solid ${GOLD};border-top:9px solid transparent;border-bottom:9px solid transparent}
</style></head><body>
  <div class="glow"></div>
  <div class="photo"></div>
  <img class="logo" src="${logo}" alt="">
  <div class="pad">
    <div class="kick">Now enrolling &middot; ages 3&ndash;15</div>
    <div class="h"><span class="a">Free class for kids</span><span class="b">Any day of the week</span></div>
    <div class="days">${chips}</div>
    <div class="sub">No experience needed. <b>We lend you the gi.</b></div>
    <div class="cta"><div class="btn">Book a free class</div><div class="url">labyrinth.vision<small>Book in a minute</small></div></div>
    <div class="foot"><span>Labyrinth BJJ</span>${story ? '<span>Gi &amp; No-Gi</span>' : '<span class="swipe">Swipe for class times</span>'}</div>
  </div>
</body></html>`
}

// Slide 2: the same week, written out. One row a day; classes that run at the same time share a line.
function slide2(h) {
  const rows = byDay.map(({ day, slots }) => `
    <div class="row"><div class="day">${day.slice(0, 3)}</div><div class="cls">${slots.map(s =>
      `<span class="t${s.adv ? ' adv' : ''}">${s.time}</span><span class="n${s.adv ? ' adv' : ''}">${((s.adv ? `Advanced ${s.style}: ` : '') + s.names.join(' &middot; ')).replace(/&(?!middot;)/g, '&amp;')}</span>`).join('')}</div></div>`).join('')
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:Anton;src:url(${anton}) format('woff2')}@font-face{font-family:Oswald;font-weight:700;src:url(${oswald}) format('woff2')}
*{margin:0;box-sizing:border-box}
body{width:1080px;height:${h}px;position:relative;overflow:hidden;background:${BG};font-family:Oswald,sans-serif;font-weight:700;color:${TEXT}}
.glow{position:absolute;inset:0;background:radial-gradient(90% 40% at 90% 92%, rgba(200,162,76,.13) 0%, rgba(200,162,76,0) 70%)}
.photo{position:absolute;left:0;top:0;width:1080px;height:280px;background:url(${PHOTO.lineup}) 50% 42%/cover no-repeat;filter:contrast(1.05) saturate(.95)}
.photo::after{content:'';position:absolute;inset:0;background:linear-gradient(to bottom, rgba(10,10,10,0) 0%, rgba(10,10,10,0) 38%, ${BG} 100%)}
.pad{position:absolute;left:70px;right:70px;top:0;bottom:0}
.kick{position:absolute;left:0;top:184px;font-size:29px;letter-spacing:.2em;text-transform:uppercase;color:${GOLD};white-space:nowrap}
.h{position:absolute;left:0;top:232px;font-family:Anton,sans-serif;font-weight:400;font-size:104px;line-height:1.04;text-transform:uppercase;white-space:nowrap}
.list{position:absolute;left:0;right:0;top:356px}
.row{display:grid;grid-template-columns:128px 1fr;column-gap:26px;align-items:start;padding:9px 0;border-top:2px solid rgba(200,162,76,.3)}
.row:last-child{border-bottom:2px solid rgba(200,162,76,.3)}
.day{background:${GOLD};color:${BG};border-radius:12px;font-family:Anton,sans-serif;font-weight:400;font-size:40px;letter-spacing:.06em;text-transform:uppercase;text-align:center;padding:7px 0 5px;line-height:1.1}
.cls{display:grid;grid-template-columns:152px 1fr;row-gap:5px;font-size:28px;line-height:1.15;letter-spacing:.02em;padding-top:3px}
.cls .t{color:${GOLD};letter-spacing:.05em;white-space:nowrap}
.cls .n{color:${TEXT}}
.cls .adv{color:${ADV}}
.note{position:absolute;left:0;right:0;top:1114px;font-size:26px;line-height:1.25;letter-spacing:.04em;color:${MUTED};white-space:nowrap}
.note b{color:${ADV};font-weight:700}
.cta{position:absolute;left:0;right:0;top:1164px;display:flex;align-items:center;gap:30px}
.btn{background:${GOLD};color:${BG};border-radius:999px;padding:22px 46px;font-family:Anton,sans-serif;font-weight:400;font-size:56px;line-height:1.05;letter-spacing:.04em;text-transform:uppercase;white-space:nowrap}
.url{font-size:32px;line-height:1.25;letter-spacing:.06em;text-transform:uppercase;white-space:nowrap}
.url small{display:block;font-size:24px;color:${MUTED};letter-spacing:.12em}
.foot{position:absolute;left:0;right:0;bottom:34px;display:flex;justify-content:space-between;font-size:25px;letter-spacing:.14em;text-transform:uppercase;color:${MUTED};white-space:nowrap}
</style></head><body>
  <div class="glow"></div>
  <div class="photo"></div>
  <div class="pad">
    <div class="kick">Kids&rsquo; free first class</div>
    <div class="h">Pick your day</div>
    <div class="list">${rows}</div>
    <div class="note"><b>Advanced No-Gi</b> needs a gray-white belt or 2 years of wrestling.</div>
    <div class="cta"><div class="btn">Book a free class</div><div class="url">labyrinth.vision<small>Book in a minute</small></div></div>
    <div class="foot"><span>Labyrinth BJJ</span><span>Ages 3&ndash;15</span></div>
  </div>
</body></html>`
}

// What slide 2 says, as alt text for Instagram, from the same data (paste into scripts/kids-any-day-captions.txt, for Instagram and Facebook)
const altOf = a => a.replace(/&/g, 'and').replace(/(\d)\u2013(\d+)/g, '$1 to $2')
console.log('ALT TEXT, picture 2:\n' + altOf(byDay.map(({ day, slots }) => `${day}: ` + slots.map(s =>
  `${s.time} ${s.adv ? `Advanced ${s.style}: ` : ''}${s.names.join(' and ')}`).join('; ') + '.').join(' ')) + '\n')
const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/opt/pw-browsers/chromium' })
let bad = 0
const JOBS = [
  ['kids-any-day-feed-1', 1350, false, slide1(1350, false), '.kick, .h span, .days, .days i, .sub, .btn, .url, .foot, .foot span', ['.kick', '.h', '.days', '.sub', '.cta', '.foot']],
  ['kids-any-day-feed-2', 1350, false, slide2(1350), '.kick, .h, .row, .cls .n, .note, .btn, .url, .foot, .foot span', ['.kick', '.h', '.list', '.note', '.cta', '.foot']],
  ['kids-any-day-story', 1920, true, slide1(1920, true), '.kick, .h span, .days, .days i, .sub, .btn, .url, .foot, .foot span', ['.kick', '.h', '.days', '.sub', '.cta', '.foot']],
]
for (const [name, h, story, html, selector, stack] of JOBS) {
  const page = await browser.newPage({ viewport: { width: 1080, height: h } })
  await page.setContent(html, { waitUntil: 'load' })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(300)
  // Words must stay inside the side margins and, in the story, between Stories' top bar and bottom reply box.
  const problems = await page.evaluate(({ h, story, selector, stack }) => {
    const out = []
    const name = el => el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className ? '.' + el.className.split(' ')[0] : '')
    for (const el of document.querySelectorAll(selector)) {
      const r = el.getBoundingClientRect()
      if (r.right > 1010.5) out.push(`${name(el)} runs to ${Math.round(r.right)}px (right margin is 1010px)`)
      if (r.left < 69.5) out.push(`${name(el)} starts at ${Math.round(r.left)}px (left margin is 70px)`)
      if (story && r.top < 249) out.push(`${name(el)} starts at y=${Math.round(r.top)}, inside Stories' top bar`)
      if (story && r.bottom > 1581) out.push(`${name(el)} ends at y=${Math.round(r.bottom)}, inside Stories' reply box`)
      if (!story && r.bottom > h - 20) out.push(`${name(el)} ends at y=${Math.round(r.bottom)}, too close to the edge`)
      if (el.scrollWidth > el.clientWidth + 1 && el.clientWidth) out.push(`${name(el)} is wider than its box (${el.scrollWidth} > ${el.clientWidth})`)
    }
    // stacked blocks must not overlap each other
    const order = stack.map(s => [s, document.querySelector(s).getBoundingClientRect()])
    for (let i = 0; i < order.length - 1; i++) if (order[i][1].bottom > order[i + 1][1].top + 0.5) out.push(`${order[i][0]} runs into ${order[i + 1][0]} (${Math.round(order[i][1].bottom)} > ${Math.round(order[i + 1][1].top)})`)
    // the logo sits on the photograph: clear of what is under it
    const logoEl = document.querySelector('.logo'), kick = document.querySelector('.kick').getBoundingClientRect()
    if (logoEl && logoEl.getBoundingClientRect().bottom > kick.top - 8) out.push('the logo runs into the label')
    return out
  }, { h, story, selector, stack })
  if (problems.length) { bad++; console.error(`PROBLEM ${name}:\n  ` + problems.join('\n  ')) }
  await page.screenshot({ path: join(out, name + '.png') })
  console.log('wrote ' + join(out, name + '.png'))
  await page.close()
}
await browser.close()
if (bad) process.exit(1)
