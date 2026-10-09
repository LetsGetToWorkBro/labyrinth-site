// Printable flyers for the adult Brazilian jiu-jitsu program: three concepts, one US Letter page each, for a bulletin board
// (a community club, a gym wall, a coffee shop). White background and thin black bands on purpose: office printers cannot
// reach the edge of the paper, a dark page costs a fortune in toner, and a QR code needs white around it.
//   assets/print/adult-flyer-never-trained.pdf/.png      "Never trained? Good."   the fear of being the beginner
//   assets/print/adult-flyer-calm-beats-young.pdf/.png   "Calm beats young."      adults who think they are too old
//   assets/print/adult-flyer-pick-a-time.pdf/.png        "Pick a time."           the week's timetable, for people who ask "when?"
// Every flyer carries the same QR code: labyrinth.vision/#book opens the free-class picker straight away (see booking.js).
// The times on "Pick a time" are scripts/schedule_data.py as of the day this was written: change them there, then run this again.
// Run: node scripts/poster-adult-bjj.mjs   (needs playwright-core and qrcode, resolved from the CRM repo when not installed here)
//   OUT_DIR=<dir> SCALE=1 node scripts/poster-adult-bjj.mjs   writes PNG previews only, for looking at a change quickly
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { mkdirSync, readFileSync } from 'node:fs'
const here = dirname(fileURLToPath(import.meta.url))
const req = createRequire(import.meta.url)
let chromium, QR
try { ({ chromium } = req('playwright-core')) } catch { ({ chromium } = req('/home/user/labyrinth-app/node_modules/playwright-core')) }
try { QR = req('qrcode') } catch { QR = req('/home/user/labyrinth-app/node_modules/qrcode') }

const BOOK = 'https://labyrinth.vision/#book'
const INK = '#0a0a0a', GOLD = '#C8A24C', GRAY = '#4a4a4a', BRONZE = '#7a5f1f'
const qr = async url => (await QR.toString(url, { type: 'svg', errorCorrectionLevel: 'H', margin: 1, color: { dark: INK, light: '#ffffff' } })).replace(/<svg /, '<svg class="qr" ')

const b64 = (p, mime) => `data:${mime};base64,${readFileSync(p).toString('base64')}`
const anton = b64(join(here, 'fonts', 'anton-latin-400-normal.woff2'), 'font/woff2')
const oswald = b64(join(here, 'fonts', 'oswald-latin-700-normal.woff2'), 'font/woff2')
const logo = b64(join(here, '..', 'assets', 'logo-maze-480.png'), 'image/png')
const belt = b64(join(here, '..', 'assets', 'adult_white.svg'), 'image/svg+xml')
const qrBook = await qr(BOOK)

const tick = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="${GOLD}"/><path d="M6.6 12.6l3.6 3.6 7.2-8.2" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`

const shell = (title, css, main) => `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>
@font-face{font-family:Anton;src:url(${anton}) format('woff2')}@font-face{font-family:Oswald;font-weight:700;src:url(${oswald}) format('woff2')}
@page{size:8.5in 11in;margin:0}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:816px;height:1056px}
body{position:relative;overflow:hidden;background:#fff;color:${INK};font-family:'Liberation Sans',Arial,Helvetica,sans-serif;
  -webkit-print-color-adjust:exact;print-color-adjust:exact;display:flex;flex-direction:column}
.mast{flex:none;height:116px;display:flex;align-items:center;gap:18px;padding:0 52px}
.mast img{width:82px;height:82px;display:block}
.mast .n{font-family:Oswald,sans-serif;font-weight:700;font-size:35px;letter-spacing:.24em;line-height:1;text-transform:uppercase}
.mast .s{margin-top:9px;font-family:Oswald,sans-serif;font-weight:700;font-size:14.5px;letter-spacing:.2em;text-transform:uppercase;color:${GRAY}}
main{flex:1;min-height:0;padding:4px 52px 22px;display:flex;flex-direction:column}
.foot{flex:none;height:62px;background:${INK};color:#f6ecd2;display:flex;align-items:center;justify-content:center;font-family:Oswald,sans-serif;font-weight:700;font-size:15px;letter-spacing:.07em;white-space:nowrap;text-transform:uppercase}
.foot b{color:${GOLD}}
.h{font-family:Anton,sans-serif;font-weight:400;text-transform:uppercase;line-height:1;white-space:nowrap}
.gold{display:inline-block;background:${GOLD};padding:0 .09em}
.lead{font-size:21.5px;line-height:1.42}
.ticks{list-style:none;display:grid;gap:11px}
.ticks li{display:flex;align-items:center;gap:14px;font-family:Oswald,sans-serif;font-weight:700;font-size:25px;letter-spacing:.05em;text-transform:uppercase;white-space:nowrap}
.ticks svg{width:32px;height:32px;flex:none}
.card{flex:none;width:290px;border:4px solid ${INK};border-radius:22px;padding:14px 14px 11px;text-align:center;background:#fff}
.card h2{font-family:Anton,sans-serif;font-weight:400;font-size:39px;line-height:1.04;letter-spacing:.02em;text-transform:uppercase}
.card p{margin-top:6px;font-family:Oswald,sans-serif;font-weight:700;font-size:15.5px;letter-spacing:.09em;text-transform:uppercase;white-space:nowrap}
.qr{display:block;width:206px;height:206px;margin:8px auto 0}
.card .url{margin-top:5px;font-family:Oswald,sans-serif;font-weight:700;font-size:17px;letter-spacing:.1em;text-transform:uppercase}
.badge{position:absolute;right:42px;top:7px;width:114px;height:114px;border-radius:50%;background:${GOLD};border:4px solid ${INK};transform:rotate(9deg);
  display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:Anton,sans-serif;text-transform:uppercase;line-height:.98;text-align:center}
.badge span{font-size:17px;letter-spacing:.04em}.badge b{font-weight:400;font-size:46px}
${css}
</style></head><body>
  <header class="mast"><img src="${logo}" alt=""><div><div class="n">Labyrinth</div><div class="s">Brazilian Jiu-Jitsu &middot; Fulshear, TX</div></div></header>
  <main>${main}</main>
  <footer class="foot"><span><b>Labyrinth BJJ</b> &nbsp;&middot;&nbsp; 6615 W Cross Creek Bend Ln, Suite #400, Fulshear &nbsp;&middot;&nbsp; (281) 393-7983</span></footer>
</body></html>`

const card = () => `<div class="card"><h2>Book your<br>free class</h2><p>Scan with your camera</p>${qrBook}<div class="url">labyrinth.vision</div></div>`
const badge = `<div class="badge"><span>First class</span><b>Free</b></div>`

// 1. Never trained? Good.
const neverTrained = shell('Adult BJJ flyer: never trained? good.', `
.h1a{font-size:116px;letter-spacing:.005em}
.h1b{display:flex;align-items:center;gap:26px;margin-top:10px}
.h1b .gold{font-size:210px;line-height:1.02;padding:0 .09em}
.beltbox{flex:1;min-width:0}
.beltbox img{display:block;width:100%;height:auto;max-width:250px}
.beltbox p{margin-top:12px;font-family:Oswald,sans-serif;font-weight:700;font-size:21px;line-height:1.2;letter-spacing:.07em;text-transform:uppercase}
.kick{margin-top:26px;font-family:Oswald,sans-serif;font-weight:700;font-size:29px;letter-spacing:.06em;text-transform:uppercase}
.row{margin-top:20px;display:flex;gap:28px;align-items:stretch;flex:1;min-height:0}
.row .l{flex:1;min-width:0;display:flex;flex-direction:column}
.row .l .ticks{margin-top:20px}
.row .l .when{margin-top:auto;padding-top:12px;border-top:4px solid ${INK};font-family:Oswald,sans-serif;font-weight:700;font-size:19px;line-height:1.3;letter-spacing:.07em;text-transform:uppercase}
`, `
  ${badge}
  <div class="h h1a">Never trained?</div>
  <div class="h1b"><div class="h"><span class="gold">Good.</span></div><div class="beltbox"><img src="${belt}" alt=""><p>Every black belt started as a white belt.</p></div></div>
  <div class="kick">Adult Brazilian jiu-jitsu in Fulshear</div>
  <div class="row"><div class="l">
    <p class="lead">Almost everyone who walks in has never done a combat sport. You get a loaner gi, a partner who looks after you, and a class built for beginners.</p>
    <ul class="ticks"><li>${tick}No experience needed</li><li>${tick}Loaner gi provided</li><li>${tick}Your first class is free</li></ul>
    <div class="when">Mornings, middays and evenings.<br>Seven days a week.</div>
  </div>${card()}</div>
`)

// 2. Calm beats young.
const calmBeatsYoung = shell('Adult BJJ flyer: calm beats young.', `
.h2a{font-size:142px;letter-spacing:.005em}
.h2b{margin-top:4px}.h2b .gold{font-size:250px;line-height:1.02;padding:0 .08em}
.kick{margin-top:24px;font-family:Oswald,sans-serif;font-weight:700;font-size:26px;line-height:1.2;letter-spacing:.06em;text-transform:uppercase;white-space:nowrap}
.row{margin-top:20px;display:flex;gap:28px;align-items:stretch;flex:1;min-height:0}
.row .l{flex:1;min-width:0;display:flex;flex-direction:column}
.row .l .lead + .lead{margin-top:14px}
.row .l .meta{margin-top:auto;padding-top:12px;border-top:4px solid ${INK};font-family:Oswald,sans-serif;font-weight:700;font-size:17px;line-height:1.4;letter-spacing:.06em;text-transform:uppercase;white-space:nowrap}
.row .l .meta span{color:${BRONZE}}
`, `
  ${badge}
  <div class="h h2a">Calm beats</div>
  <div class="h h2b"><span class="gold">Young.</span></div>
  <div class="kick">Jiu-jitsu rewards patience and technique over speed</div>
  <div class="row"><div class="l">
    <p class="lead">A 45-year-old who understands position can control a 22-year-old athlete who doesn&rsquo;t. It happens on our mats most weeks.</p>
    <p class="lead">A good share of our adults started after forty, and almost all started with no experience at all.</p>
    <div class="meta">Gi &amp; No-Gi &middot; All levels &middot; <span>Beginners welcome</span><br>Taught by 3 black belts and 2 brown belts</div>
  </div>${card()}</div>
`)

// 3. Pick a time.
const pickATime = shell('Adult BJJ flyer: pick a time.', `
.kick{font-family:Oswald,sans-serif;font-weight:700;font-size:23px;letter-spacing:.12em;text-transform:uppercase;color:${GRAY}}
.h3{font-size:128px;letter-spacing:.005em;margin-top:2px}
.times{margin-top:10px}
.t{display:grid;grid-template-columns:300px 1fr;align-items:center;border-top:7px solid ${INK};padding:8px 0 7px}
.t:last-child{border-bottom:7px solid ${INK}}
.t .when{font-family:Anton,sans-serif;font-size:72px;line-height:1;white-space:nowrap}
.t .when small{font-size:36px;margin-left:7px}
.t .what b{display:block;font-family:Oswald,sans-serif;font-weight:700;font-size:30px;letter-spacing:.1em;line-height:1.1;text-transform:uppercase;white-space:nowrap}
.t .what b em{font-family:'Liberation Sans',Arial,sans-serif;font-style:normal;font-weight:400;font-size:17px;letter-spacing:0;text-transform:none;color:${GRAY};margin-left:8px}
.t .what span{display:block;margin-top:5px;font-family:Oswald,sans-serif;font-weight:700;font-size:20px;letter-spacing:.09em;text-transform:uppercase;white-space:nowrap}
.weekend{margin-top:11px;font-family:Oswald,sans-serif;font-weight:700;font-size:20px;line-height:1.3;letter-spacing:.07em;text-transform:uppercase;white-space:nowrap}
.weekend span{color:${BRONZE}}
.row{margin-top:16px;display:flex;gap:26px;align-items:stretch;flex:1;min-height:0}
.row .l{flex:1;min-width:0;display:flex;flex-direction:column;justify-content:space-between}
.free{background:${GOLD};padding:14px 22px 16px;border-radius:6px}
.free .h{font-size:60px;line-height:1}
.free p{margin-top:9px;font-family:Oswald,sans-serif;font-weight:700;font-size:19px;line-height:1.28;letter-spacing:.06em;text-transform:uppercase}
.note{font-family:Oswald,sans-serif;font-weight:700;font-size:14.5px;letter-spacing:.1em;text-transform:uppercase;color:${GRAY};line-height:1.35}
.row .card{width:262px;padding:12px 12px 10px}.row .card h2{font-size:34px}.row .card p{font-size:14px}.row .qr{width:172px;height:172px}.row .card .url{font-size:15px}
`, `
  <div class="kick">Adult Brazilian jiu-jitsu &middot; Gi &amp; No-Gi</div>
  <div class="h h3">Pick a <span class="gold">time.</span></div>
  <div class="times">
    <div class="t"><div class="when">6:30<small>AM</small></div><div class="what"><b>Mornings<em>before work</em></b><span>Mon &middot; Tue &middot; Wed &middot; Thu</span></div></div>
    <div class="t"><div class="when">11:00<small>AM</small></div><div class="what"><b>Middays<em>shift and remote workers</em></b><span>Mon &middot; Wed &middot; Fri</span></div></div>
    <div class="t"><div class="when">6:30<small>PM</small></div><div class="what"><b>Evenings<em>after work</em></b><span>Mon &middot; Tue &middot; Wed &middot; Thu &middot; Fri</span></div></div>
  </div>
  <div class="weekend">Plus <span>Sat 11:00 AM</span> No-Gi &nbsp;&middot;&nbsp; <span>Sun 10:30 AM</span> open mat, all levels</div>
  <div class="row"><div class="l">
    <div class="free"><div class="h">Your first<br>class is free</div><p>No experience needed. Loaner gi provided. Book any class on the timetable.</p></div>
    <div class="note">Times can change. Current timetable:<br>labyrinth.vision/schedule</div>
  </div>${card()}</div>
`)

const flyers = [
  ['adult-flyer-never-trained', neverTrained],
  ['adult-flyer-calm-beats-young', calmBeatsYoung],
  ['adult-flyer-pick-a-time', pickATime],
]

const outDir = process.env.OUT_DIR ?? join(here, '..', 'assets', 'print')
const scale = Number(process.env.SCALE ?? 3)
const previewOnly = process.env.SCALE !== undefined && Number(process.env.SCALE) < 3
mkdirSync(outDir, { recursive: true })
const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/opt/pw-browsers/chromium' })
let bad = 0
for (const [name, html] of flyers) {
  const pg = await browser.newPage({ viewport: { width: 816, height: 1056 }, deviceScaleFactor: scale })
  await pg.setContent(html, { waitUntil: 'load' })
  await pg.evaluate(() => document.fonts.ready)
  await pg.waitForTimeout(300)
  // Nothing may run past the page or the margins: the page is fixed-size and clips, so overflow would silently print cut off.
  const problems = await pg.evaluate(() => {
    const out = [], main = document.querySelector('main'), foot = document.querySelector('.foot').getBoundingClientRect()
    const name = el => el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className ? '.' + el.className.split(' ')[0] : '')
    if (main.scrollHeight > main.clientHeight + 1) out.push(`main content is ${main.scrollHeight - main.clientHeight}px taller than the space for it`)
    for (const el of main.querySelectorAll('*')) {
      const r = el.getBoundingClientRect()
      if (!r.width || !r.height || el.closest('.badge') || el.closest('svg')) continue
      if (r.right > 764 + 0.5) out.push(`${name(el)} runs to ${Math.round(r.right)}px (right margin is 764px)`)
      if (r.left < 52 - 0.5) out.push(`${name(el)} starts at ${Math.round(r.left)}px (left margin is 52px)`)
      if (r.bottom > foot.top - 10) out.push(`${name(el)} comes within 10px of the footer (${Math.round(r.bottom)} vs ${Math.round(foot.top)})`)
    }
    for (const el of document.querySelectorAll('.foot span, .ticks li, .h, .kick, .weekend, .what b, .what span, .card p, .meta')) {
      if (el.scrollWidth > el.clientWidth + 1) out.push(`${name(el)} is wider than its box (${el.scrollWidth} > ${el.clientWidth})`)
    }
    for (const el of document.querySelectorAll('.card, .free, .row .l')) {
      if (el.scrollHeight > el.clientHeight + 1) out.push(`${name(el)} holds ${el.scrollHeight - el.clientHeight}px more than fits inside it`)
    }
    return [...new Set(out)]
  })
  if (problems.length) { bad++; console.error(`PROBLEM ${name}:\n  ` + problems.join('\n  ')) }
  if (!previewOnly) await pg.pdf({ path: join(outDir, name + '.pdf'), width: '8.5in', height: '11in', printBackground: true })
  await pg.screenshot({ path: join(outDir, name + '.png') })
  await pg.close()
  console.log('wrote ' + join(outDir, name) + (previewOnly ? '.png' : '.pdf and .png'))
}
await browser.close()
if (bad) process.exit(1)
