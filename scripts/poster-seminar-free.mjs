// Printable flyer for the free women's self defense seminar (Rolling for Ribbons, Sat Oct 24, 11:00 AM to 12:30 PM),
// with a QR code to RSVP and a QR code to donate. Matches the seminar ad.
//   assets/print/seminar-flyer-color.pdf/.png   full-colour pink (for a print shop or a colour printer)
//   assets/print/seminar-flyer-inksaver.pdf/.png white background, pink accents (office printers, lots of copies)
// Run: node scripts/poster-seminar-free.mjs   (needs playwright-core and qrcode, resolved from the CRM repo when not installed here)
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
const DONATE = 'https://donate.stripe.com/14AdRa0tL1Ea1Br3bJgjC0a'
const PLUM = '#2a0f1c', MAG = '#b0306b', PINK = '#e58fb5'
const qr = async url => (await QR.toString(url, { type: 'svg', errorCorrectionLevel: 'H', margin: 1, color: { dark: PLUM, light: '#ffffff' } })).replace(/<svg /, '<svg class="qr" ')

const b64 = (p, mime) => `data:${mime};base64,${readFileSync(p).toString('base64')}`
const anton = b64(join(here, 'fonts', 'anton-latin-400-normal.woff2'), 'font/woff2')
const oswald = b64(join(here, 'fonts', 'oswald-latin-700-normal.woff2'), 'font/woff2')
const qrRsvp = await qr(RSVP), qrDonate = await qr(DONATE)

const page = ink => `<!doctype html><html><head><meta charset="utf-8"><title>Free women's self defense seminar: flyer</title><style>
@font-face{font-family:Anton;src:url(${anton}) format('woff2')}@font-face{font-family:Oswald;font-weight:700;src:url(${oswald}) format('woff2')}
@page{size:8.5in 11in;margin:0}
*{box-sizing:border-box;margin:0}
html,body{width:816px;height:1056px}
body{position:relative;overflow:hidden;font-family:Oswald,sans-serif;color:${PLUM};-webkit-print-color-adjust:exact;print-color-adjust:exact;
  background:${ink ? '#ffffff' : `radial-gradient(120% 80% at 85% 6%, #fbd9e6 0%, #f4b7d0 48%, ${PINK} 100%)`}}
.rib{position:absolute;right:-30px;top:14px;width:250px;transform:rotate(8deg)}
.rib svg{width:100%;height:auto;display:block}
.kick{position:absolute;left:52px;top:44px;font-size:21px;letter-spacing:.22em;text-transform:uppercase}
.kick b{color:${MAG}}
.h{position:absolute;left:52px;top:84px;font-family:Anton,sans-serif;text-transform:uppercase;line-height:.95}
.h .free{display:block;font-size:196px;letter-spacing:-.01em}
.h .l2{display:block;font-size:72px}
.h .l3{display:block;font-size:72px;color:${MAG}}
.date{position:absolute;left:52px;right:52px;top:412px;background:${PLUM};color:#fff;border-radius:18px;padding:16px 28px;display:flex;justify-content:space-between;align-items:center}
.date .a{font-family:Anton,sans-serif;font-size:56px;line-height:1;text-transform:uppercase}
.date .a span{color:${PINK}}
.date .b{font-size:21px;line-height:1.25;text-align:right;letter-spacing:.07em;text-transform:uppercase;color:#ffe3ee}
.sub{position:absolute;left:52px;right:52px;top:512px;text-align:center;font-size:22px;letter-spacing:.07em;text-transform:uppercase}
.sub b{color:${MAG}}
.qrs{position:absolute;left:52px;right:52px;top:552px;display:flex;gap:22px}
.card{flex:1;background:#fff;border:4px solid ${ink ? PLUM : MAG};border-radius:20px;padding:12px 14px 10px;text-align:center}
.card h2{font-family:Anton,sans-serif;font-weight:400;font-size:44px;line-height:1;letter-spacing:.03em;text-transform:uppercase;color:${MAG}}
.card p{margin-top:2px;font-size:19px;letter-spacing:.08em;text-transform:uppercase}
.qr{display:block;width:236px;height:236px;margin:6px auto 0}
.card .url{margin-top:4px;font-size:13px;letter-spacing:.06em;text-transform:uppercase;color:${PLUM};opacity:.85}
.goal{position:absolute;left:52px;right:52px;top:930px;text-align:center;font-size:20px;line-height:1.25;letter-spacing:.06em;text-transform:uppercase}
.goal b{color:${MAG}}
.foot{position:absolute;left:0;right:0;bottom:0;padding:13px 30px;background:${PLUM};color:#ffe3ee;text-align:center;font-size:14.5px;letter-spacing:.06em;white-space:nowrap;text-transform:uppercase}
.foot b{color:#fff}
</style></head><body>
  <div class="rib">${ribbonSVG(PLUM, { uid: ink ? 'i' : 'c' })}</div>
  <div class="kick"><b>Pink October</b> &middot; Women&rsquo;s seminar</div>
  <div class="h"><span class="free">Free</span><span class="l2">Self defense</span><span class="l3">for women</span></div>
  <div class="date"><div class="a">Sat, Oct 24</div><div class="b"><span style="color:${PINK}">11:00 AM to 12:30 PM</span><br>Labyrinth BJJ &middot; Fulshear, TX</div></div>
  <div class="sub"><b>No experience needed.</b> Come alone or bring a friend.</div>
  <div class="qrs">
    <div class="card"><h2>RSVP free</h2><p>Scan to reserve your spot</p>${qrRsvp}<div class="url">labyrinth.vision/self-defense-for-women</div></div>
    <div class="card"><h2>Donate</h2><p>Scan to give any amount</p>${qrDonate}<div class="url">Every dollar goes to a family</div></div>
  </div>
  <div class="goal">Donations go directly to a family affected by breast cancer.<br><b>Our goal: $500</b></div>
  <div class="foot"><b>Labyrinth BJJ</b> &nbsp;&middot;&nbsp; 6615 W Cross Creek Bend Ln, Suite #400, Fulshear &nbsp;&middot;&nbsp; (281) 393-7983</div>
</body></html>`

const outDir = join(here, '..', 'assets', 'print')
mkdirSync(outDir, { recursive: true })
const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/opt/pw-browsers/chromium' })
for (const [name, ink] of [['seminar-flyer-color', false], ['seminar-flyer-inksaver', true]]) {
  const pg = await browser.newPage({ viewport: { width: 816, height: 1056 }, deviceScaleFactor: 3 })
  await pg.setContent(page(ink), { waitUntil: 'load' })
  await pg.evaluate(() => document.fonts.ready)
  await pg.waitForTimeout(300)
  await pg.pdf({ path: join(outDir, name + '.pdf'), width: '8.5in', height: '11in', printBackground: true })
  await pg.screenshot({ path: join(outDir, name + '.png') })
  await pg.close()
  console.log('wrote assets/print/' + name + '.pdf and .png')
}
await browser.close()
