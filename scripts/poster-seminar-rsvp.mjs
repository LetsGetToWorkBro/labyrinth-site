// Printable poster for the free women's self defense seminar (Rolling for Ribbons, Sat Oct 24, 11:00 AM to 12:30 PM), for booking
// only: no donation code and no donation wording, one large RSVP code, and "Free women's self defense seminar" as the headline.
// The older flyer (poster-seminar-free.mjs) carries both an RSVP and a donate code; this one is for the walls where only the sign-up matters.
//   assets/print/seminar-poster-rsvp-color.pdf/.png     full-colour pink (a colour printer or a print shop)
//   assets/print/seminar-poster-rsvp-inksaver.pdf/.png  white background, pink accents (office printers, lots of copies)
// Run: node scripts/poster-seminar-rsvp.mjs   (needs playwright-core and qrcode, resolved from the CRM repo when not installed here)
//   OUT_DIR=<dir> SCALE=1 node scripts/poster-seminar-rsvp.mjs   writes PNG previews only, for looking at a change quickly
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { mkdirSync, readFileSync } from 'node:fs'
import { ribbonSVG } from './ribbon-art.mjs'
const here = dirname(fileURLToPath(import.meta.url))
const req = createRequire(import.meta.url)
let chromium, QR
try { ({ chromium } = req('playwright-core')) } catch { ({ chromium } = req('/home/user/labyrinth-app/node_modules/playwright-core')) }
try { QR = req('qrcode') } catch { QR = req('/home/user/labyrinth-app/node_modules/qrcode') }

const RSVP = 'https://labyrinth.vision/self-defense-for-women'
const PLUM = '#2a0f1c', MAG = '#b0306b', PINK = '#e58fb5'
const qr = async url => (await QR.toString(url, { type: 'svg', errorCorrectionLevel: 'H', margin: 1, color: { dark: PLUM, light: '#ffffff' } })).replace(/<svg /, '<svg class="qr" ')

const b64 = (p, mime) => `data:${mime};base64,${readFileSync(p).toString('base64')}`
const anton = b64(join(here, 'fonts', 'anton-latin-400-normal.woff2'), 'font/woff2')
const oswald = b64(join(here, 'fonts', 'oswald-latin-700-normal.woff2'), 'font/woff2')
const qrRsvp = await qr(RSVP)

const page = ink => `<!doctype html><html><head><meta charset="utf-8"><title>Free women's self defense seminar: poster</title><style>
@font-face{font-family:Anton;src:url(${anton}) format('woff2')}@font-face{font-family:Oswald;font-weight:700;src:url(${oswald}) format('woff2')}
@page{size:8.5in 11in;margin:0}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:816px;height:1056px}
body{position:relative;overflow:hidden;font-family:Oswald,sans-serif;font-weight:700;color:${PLUM};-webkit-print-color-adjust:exact;print-color-adjust:exact;
  display:flex;flex-direction:column;background:${ink ? '#ffffff' : `radial-gradient(120% 80% at 85% 6%, #fbd9e6 0%, #f4b7d0 48%, ${PINK} 100%)`}}
.kick{flex:none;padding:40px 52px 0;font-size:20px;letter-spacing:.22em;text-transform:uppercase;white-space:nowrap}
.kick b{color:${MAG}}
main{flex:1;min-height:0;padding:12px 52px 22px;display:flex;flex-direction:column;position:relative}
.h{font-family:Anton,sans-serif;font-weight:400;text-transform:uppercase;line-height:.98;white-space:nowrap}
.h span.l{display:block;font-size:126px}
.h .pill{display:inline-block;background:${MAG};color:#fff;padding:0 .11em;border-radius:.07em;margin-right:.1em}
.h .l3{color:${MAG};position:relative}
.rib{position:absolute;right:30px;top:50%;width:76px;transform:translateY(-50%) rotate(8deg)}
.rib svg{display:block;width:100%;height:auto}
.date{margin-top:16px;background:${PLUM};color:#fff;border-radius:18px;padding:15px 28px;display:flex;justify-content:space-between;align-items:center}
.date .a{font-family:Anton,sans-serif;font-weight:400;font-size:56px;line-height:1;text-transform:uppercase;white-space:nowrap}
.date .b{font-size:21px;line-height:1.25;text-align:right;letter-spacing:.07em;text-transform:uppercase;color:#ffe3ee;white-space:nowrap}
.date .b span{color:${PINK}}
.sub{margin-top:14px;text-align:center;font-size:22px;letter-spacing:.07em;text-transform:uppercase;white-space:nowrap}
.sub b{color:${MAG}}
.sub2{margin-top:4px;text-align:center;font-size:16px;letter-spacing:.12em;text-transform:uppercase;opacity:.82;white-space:nowrap}
.rsvp{margin-top:16px;flex:1;min-height:0;display:flex;align-items:center;gap:30px;background:#fff;border:5px solid ${ink ? PLUM : MAG};border-radius:26px;padding:16px 26px}
.rsvp .qr{flex:none;width:256px;height:256px;display:block}
.rsvp .t{flex:1;min-width:0}
.rsvp h2{font-family:Anton,sans-serif;font-weight:400;font-size:80px;line-height:.95;color:${MAG};text-transform:uppercase;white-space:nowrap}
.rsvp .scan{margin-top:8px;font-size:24px;line-height:1.15;letter-spacing:.07em;text-transform:uppercase}
.rsvp .small{margin-top:10px;font-family:'Liberation Sans',Arial,Helvetica,sans-serif;font-weight:400;font-size:18px;line-height:1.35;color:${PLUM}}
.rsvp .url{margin-top:12px;font-size:13.5px;letter-spacing:.05em;text-transform:uppercase;opacity:.85;white-space:nowrap}
.foot{flex:none;height:58px;background:${PLUM};color:#ffe3ee;display:flex;align-items:center;justify-content:center;font-size:14.5px;letter-spacing:.06em;white-space:nowrap;text-transform:uppercase}
.foot b{color:#fff}
</style></head><body>
  <div class="kick"><b>Pink October</b> &middot; Breast cancer awareness</div>
  <main>
    <div class="h"><span class="l l1"><span class="pill">Free</span>Women&rsquo;s</span><span class="l l2">Self defense</span><span class="l l3">Seminar<span class="rib">${ribbonSVG(PLUM, { uid: ink ? 'i' : 'c' })}</span></span></div>
    <div class="date"><div class="a">Sat, Oct 24</div><div class="b"><span>11:00 AM to 12:30 PM</span><br>Labyrinth BJJ &middot; Fulshear, TX</div></div>
    <div class="sub"><b>No experience needed.</b> Come alone or bring a friend.</div>
    <div class="sub2">Led by Coach Scott and Professor Tony</div>
    <div class="rsvp">${qrRsvp}<div class="t"><h2>RSVP free</h2><div class="scan">Scan to reserve<br>your spot</div><div class="small">It takes 30 seconds, and we email you a confirmation.</div><div class="url">labyrinth.vision/self-defense-for-women</div></div></div>
  </main>
  <div class="foot"><span><b>Labyrinth BJJ</b> &nbsp;&middot;&nbsp; 6615 W Cross Creek Bend Ln, Suite #400, Fulshear &nbsp;&middot;&nbsp; (281) 393-7983</span></div>
</body></html>`

const outDir = process.env.OUT_DIR ?? join(here, '..', 'assets', 'print')
const scale = Number(process.env.SCALE ?? 3)
const previewOnly = process.env.SCALE !== undefined && Number(process.env.SCALE) < 3
mkdirSync(outDir, { recursive: true })
const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/opt/pw-browsers/chromium' })
let bad = 0
for (const [name, ink] of [['seminar-poster-rsvp-color', false], ['seminar-poster-rsvp-inksaver', true]]) {
  const pg = await browser.newPage({ viewport: { width: 816, height: 1056 }, deviceScaleFactor: scale })
  await pg.setContent(page(ink), { waitUntil: 'load' })
  await pg.evaluate(() => document.fonts.ready)
  await pg.waitForTimeout(300)
  // The page is fixed-size and clips, so anything that overflows would silently print cut off: say so instead.
  const problems = await pg.evaluate(() => {
    const out = [], main = document.querySelector('main'), foot = document.querySelector('.foot').getBoundingClientRect()
    const name = el => el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className ? '.' + el.className.split(' ')[0] : '')
    if (main.scrollHeight > main.clientHeight + 1) out.push(`main content is ${main.scrollHeight - main.clientHeight}px taller than the space for it`)
    for (const el of main.querySelectorAll('*')) {
      const r = el.getBoundingClientRect()
      if (!r.width || !r.height || el.closest('svg') || el.closest('.rib')) continue
      if (r.right > 764 + 0.5) out.push(`${name(el)} runs to ${Math.round(r.right)}px (right margin is 764px)`)
      if (r.left < 52 - 0.5) out.push(`${name(el)} starts at ${Math.round(r.left)}px (left margin is 52px)`)
      if (r.bottom > foot.top - 8) out.push(`${name(el)} comes within 8px of the footer (${Math.round(r.bottom)} vs ${Math.round(foot.top)})`)
    }
    for (const el of document.querySelectorAll('.kick, .foot span, .h span.l, .date .a, .date .b, .sub, .sub2, .rsvp h2, .rsvp .url')) {
      if (el.scrollWidth > el.clientWidth + 1) out.push(`${name(el)} is wider than its box (${el.scrollWidth} > ${el.clientWidth})`)
    }
    for (const el of document.querySelectorAll('.rsvp, .date')) if (el.scrollHeight > el.clientHeight + 1) out.push(`${name(el)} holds ${el.scrollHeight - el.clientHeight}px more than fits inside it`)
    // The ribbon is meant to sit at the right end of the "Seminar" line: inside that line's own height (so it cannot reach the line
    // above or the date bar) and clear of the word. A text range is taller than the capitals in it, so overlap with the letters of
    // other lines is judged by the line box instead.
    const rib = document.querySelector('.rib').getBoundingClientRect(), l3 = document.querySelector('.h .l3')
    const lb = l3.getBoundingClientRect(), g = document.createRange(); g.selectNodeContents(l3.firstChild)
    if (rib.top < lb.top - 4 || rib.bottom > lb.bottom + 4) out.push('the ribbon runs outside the "Seminar" line, into the line above or the date bar')
    if (rib.left < g.getBoundingClientRect().right + 16) out.push('the ribbon is within 16px of the word "Seminar"')
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
