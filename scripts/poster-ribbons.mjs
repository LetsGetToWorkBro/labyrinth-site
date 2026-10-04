// Builds the printable Rolling for Ribbons donation poster:
//   assets/print/rolling-for-ribbons-poster.pdf (US Letter) and .png (preview)
// QR codes: the RSVP page and the donation link. Run: node scripts/poster-ribbons.mjs
// Needs playwright-core and the qrcode package (resolved from the CRM repo when not installed here).
import { chromium } from 'playwright-core'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { mkdirSync, writeFileSync } from 'node:fs'
const here = dirname(fileURLToPath(import.meta.url))
const req = createRequire(import.meta.url)
let QR
try { QR = req('qrcode') } catch { QR = req('/home/user/labyrinth-app/node_modules/qrcode') }

const RSVP = 'https://labyrinth.vision/self-defense-for-women'
const DONATE = 'https://donate.stripe.com/14AdRa0tL1Ea1Br3bJgjC0a'
const svg = async url => (await QR.toString(url, { type: 'svg', errorCorrectionLevel: 'H', margin: 1, color: { dark: '#2a0f1c', light: '#ffffff' } }))
  .replace(/<svg /, '<svg class="qr" ')

const ribbon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 14C8 11 7.5 9 7.5 6.8 7.5 4.6 9.5 3 12 3s4.5 1.6 4.5 3.8C16.5 9 16 11 12 14zM12 14 8 21M12 14l4 7" fill="currentColor" fill-opacity=".18"/></svg>'

const html = `<!doctype html><html><head><meta charset="utf-8"><title>Rolling for Ribbons poster</title><style>
  @page { size: 8.5in 11in; margin: 0 }
  * { box-sizing: border-box; margin: 0 }
  html, body { width: 8.5in; height: 11in }
  body { font-family: "Helvetica Neue", Arial, sans-serif; color: #2a0f1c; background: #fff7fa; position: relative; overflow: hidden; -webkit-print-color-adjust: exact; print-color-adjust: exact }
  .band { position: absolute; left: 0; right: 0; top: 0; height: 3.65in; background: linear-gradient(160deg, #46142d, #7a2650); color: #fff }
  .wrap { position: relative; padding: .35in .6in 0; text-align: center; color: #fff }
  .rib { width: .62in; height: .62in; color: #f2a8c8; margin: 0 auto }
  .kick { margin-top: .12in; font-size: 15pt; font-weight: 800; letter-spacing: .22em; text-transform: uppercase; color: #f7c4da }
  h1 { margin-top: .06in; font-size: 56pt; line-height: .95; font-weight: 900; letter-spacing: -.01em; text-transform: uppercase }
  h1 span { color: #f2a8c8 }
  .sub { margin-top: .14in; font-size: 17pt; font-weight: 700; color: #ffe3ee }
  .when { position: relative; margin: .3in .6in 0; padding: .14in .25in; border: 3px solid #e58fb5; border-radius: .18in; background: #fff; text-align: center }
  .when b { display: block; font-size: 22pt; font-weight: 900; color: #46142d }
  .when span { display: block; margin-top: 2pt; font-size: 14pt; font-weight: 700; color: #7a2650 }
  .why { margin: .2in .75in 0; text-align: center; font-size: 13.5pt; line-height: 1.3; font-weight: 600 }
  .why strong { color: #b0306b }
  .qrs { display: flex; gap: .3in; justify-content: center; margin: .2in .6in 0 }
  .card { width: 3.35in; padding: .14in .15in .12in; text-align: center; background: #fff; border: 3px solid #e58fb5; border-radius: .2in }
  .card h2 { font-size: 24pt; font-weight: 900; letter-spacing: .04em; text-transform: uppercase; color: #b0306b }
  .card p { margin-top: 2pt; font-size: 12pt; font-weight: 700; color: #46142d }
  .qr { width: 2.55in; height: 2.55in; margin: .08in auto 0; display: block }
  .url { margin-top: .08in; font-size: 9.5pt; font-weight: 700; color: #7a2650; word-break: break-all }
  .goal { margin: .2in .6in 0; text-align: center; font-size: 16pt; font-weight: 900; color: #46142d }
  .goal span { color: #b0306b }
  .foot { position: absolute; left: 0; right: 0; bottom: 0; padding: .16in .5in; background: #46142d; color: #ffe3ee; text-align: center; font-size: 11pt; font-weight: 700; letter-spacing: .06em }
  .foot b { color: #fff }
</style></head><body>
  <div class="band"></div>
  <div class="wrap">
    <div class="rib">${ribbon}</div>
    <div class="kick">Pink October</div>
    <h1>Rolling<br>for <span>Ribbons</span></h1>
    <div class="sub">Free women&rsquo;s self defense seminar</div>
  </div>
  <div class="when"><b>Saturday, October 24 &middot; 11:00 AM to 12:30 PM</b><span>Labyrinth BJJ &middot; 6615 West Cross Creek Bend Lane, Suite #400, Fulshear</span></div>
  <p class="why">No experience needed. <strong>Every donation goes directly to a family affected by breast cancer.</strong> Scan to reserve your spot or to give.</p>
  <div class="qrs">
    <div class="card"><h2>RSVP</h2><p>Reserve your free spot</p>${await svg(RSVP)}<div class="url">labyrinth.vision/self-defense-for-women</div></div>
    <div class="card"><h2>Donate</h2><p>Any amount helps</p>${await svg(DONATE)}<div class="url">Scan to give online</div></div>
  </div>
  <div class="goal">Our goal: <span>$500</span> for a family in our community</div>
  <div class="foot"><b>LABYRINTH BJJ</b> &nbsp;&middot;&nbsp; (281) 393-7983 &nbsp;&middot;&nbsp; labyrinth.vision</div>
</body></html>`

mkdirSync(join(here, '..', 'assets', 'print'), { recursive: true })
writeFileSync(join(here, 'poster-ribbons.html'), html)
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' })
const page = await browser.newPage({ viewport: { width: 816, height: 1056 } })
await page.setContent(html, { waitUntil: 'load' })
await page.pdf({ path: join(here, '..', 'assets', 'print', 'rolling-for-ribbons-poster.pdf'), width: '8.5in', height: '11in', printBackground: true })
await page.screenshot({ path: join(here, '..', 'assets', 'print', 'rolling-for-ribbons-poster.png') })
await browser.close()
console.log('wrote assets/print/rolling-for-ribbons-poster.pdf and .png')
