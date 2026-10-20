// The Saturday post, October 2026: this Saturday (October 24) the academy runs a changed schedule around the Rolling for Ribbons women's self defense seminar.
// Two slides, one Instagram carousel, and the same two pictures go to Facebook as one post (the owner's plan of October 20, 2026):
//
//   assets/social/saturday-seminar/saturday-seminar-01.jpg   the cover: photograph 62 of the Lightroom album "JJWL Houston 10/17/2026 by Aivizuals"
//                                                            (https://lightroom.adobe.com/shares/bf71694e81744114b32282be1bd48681), the words over its foot
//   assets/social/saturday-seminar/saturday-seminar-02.jpg   the day: 9:00 workout, 10:00 open mat, 11:00 the seminar; the regular Saturday classes are off
//   both 1080x1350 (4:5). What is said with them, and the alt text, is in scripts/saturday-seminar-captions.txt.
//
// The facts on the slides are the seminar page's (labyrinth.vision/self-defense-for-women: Saturday, October 24, 11:00 AM to 12:30 PM, free, no experience needed)
// and the owner's plan for the rest of the day (a workout 9:00 to 10:00, an open mat from 10:00 to about 10:45, the regular Saturday classes off).
//
// The slides follow the October 2026 photo posts (scripts/instagram-photo-posts.mjs): everything that matters is in the middle 1080x1080 square, because Instagram's
// composer and some posting tools crop a carousel to a square (135px off the top and bottom of a 4:5 slide), and the words stay in the middle 810px (a square post's
// grid thumbnail is a 3:4 slice). The colours are the seminar's own (the pink and plum of the seminar page, its banner and its email), not the gold of the photo posts.
//
// Run: python3 scripts/lightroom-album.py https://lightroom.adobe.com/shares/bf71694e81744114b32282be1bd48681 <folder>
//      node scripts/instagram-saturday-seminar.mjs --album <folder> [--out <folder>]
// (needs playwright-core, resolved from node_modules here or from the CRM repo)
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs'
const here = dirname(fileURLToPath(import.meta.url))
const req = createRequire(import.meta.url)
let chromium
try { ({ chromium } = req('playwright-core')) } catch { ({ chromium } = req('/home/user/labyrinth-app/node_modules/playwright-core')) }

const args = process.argv.slice(2)
const opt = name => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : undefined }
const album = opt('album') ?? process.env.ALBUM_DIR
const out = opt('out') ?? process.env.OUT_DIR ?? join(here, '..', 'assets', 'social', 'saturday-seminar')
if (!album || !existsSync(album)) {
  console.error('usage: node scripts/instagram-saturday-seminar.mjs --album <folder of the "JJWL Houston 10/17/2026 by Aivizuals" album>\n  (python3 scripts/lightroom-album.py https://lightroom.adobe.com/shares/bf71694e81744114b32282be1bd48681 <folder> downloads it)')
  process.exit(2)
}
mkdirSync(out, { recursive: true })

const b64 = (p, mime) => `data:${mime};base64,${readFileSync(p).toString('base64')}`
const anton = b64(join(here, 'fonts', 'anton-latin-400-normal.woff2'), 'font/woff2')
const oswald = b64(join(here, 'fonts', 'oswald-latin-700-normal.woff2'), 'font/woff2')
const logo = b64(join(here, '..', 'assets', 'logo-maze-480.png'), 'image/png')
const BG = '#1a0b12', PLUM = '#46142d', PINK = '#E58FB5', TEXT = '#F4EDF0', MUTED = '#cdb3c0'
const W = 1080, H = 1350                    // slide size (4:5)
const SQ = 1080, TOP = (H - SQ) / 2          // the middle square, which is all a square crop keeps
const COL = 135                              // the words stay in the middle 810px
const MAX = W - 2 * COL

const PHOTO = 62                             // position in the album: two Labyrinth people at the Nationals banner, portrait 1365x2048
const files = readdirSync(album)
const fileFor = n => {
  const hit = files.find(f => new RegExp('^0*' + n + '-.*\\.jpe?g$', 'i').test(f))
  if (!hit) throw new Error(`photograph ${n} is not in ${album}`)
  return join(album, hit)
}

const fonts = `@font-face{font-family:Anton;src:url(${anton}) format('woff2')}@font-face{font-family:Oswald;font-weight:700;src:url(${oswald}) format('woff2')}`
const base = `${fonts}*{margin:0;box-sizing:border-box}body{width:${W}px;height:${H}px;position:relative;overflow:hidden;background:${BG};font-family:Oswald,sans-serif;font-weight:700;color:${TEXT}}`
const esc = t => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/·/g, '&middot;')

// The cover: the whole portrait photograph at the full height of the slide on a blurred copy of itself, a plum shade over its foot, the words on the shade.
// What matters in the photograph (both faces) runs from 23% to 64% of its height, inside the middle 80% that a square crop keeps; the words are below the faces.
function coverPage() {
  const src = b64(fileFor(PHOTO), 'image/jpeg')
  return `<!doctype html><html><head><meta charset="utf-8"><style>${base}
.bg{position:absolute;inset:-60px;width:${W + 120}px;height:${H + 120}px;object-fit:cover;filter:blur(38px) brightness(.42) saturate(1.1)}
.fg{position:absolute;top:0;left:50%;transform:translateX(-50%);height:${H}px;width:auto;box-shadow:0 0 60px rgba(0,0,0,.55)}
.shade{position:absolute;left:90px;width:900px;top:760px;height:${H - 760}px;background:linear-gradient(to bottom, rgba(26,11,18,0) 0%, rgba(26,11,18,.78) 30%, rgba(26,11,18,.94) 55%, ${BG} 100%)}
.kick{position:absolute;left:${COL}px;top:884px;font-size:31px;letter-spacing:.2em;text-transform:uppercase;color:${PINK};white-space:nowrap}
.h{position:absolute;left:${COL}px;top:944px;font-family:Anton,sans-serif;font-weight:400;font-size:112px;line-height:1.04;letter-spacing:.004em;text-transform:uppercase;white-space:nowrap}
.h span{color:${PINK}}
.row{position:absolute;left:${COL}px;right:${COL}px;top:1086px;height:88px;display:flex;align-items:center}
.when{font-size:34px;letter-spacing:.12em;text-transform:uppercase;white-space:nowrap}
.logo{width:84px;height:84px;filter:invert(1);margin-left:auto}
</style></head><body>
  <img class="bg" src="${src}" alt=""><img class="fg" src="${src}" alt="">
  <div class="shade"></div>
  <div class="kick">${esc('Rolling for Ribbons · Free')}</div>
  <div class="h">${esc("Women's")} <span>${esc('Self Defense')}</span></div>
  <div class="row"><span class="when">${esc('Sat, Oct 24 · 11 AM')}</span><img class="logo" src="${logo}" alt=""></div>
</body></html>`
}

// The day: three parts, the seminar's in a pink box, and what is off. Plain plum, no photograph: the words are the picture.
const DAY = [
  { t: '9:00 to 10:00 AM', d: 'Workout' },
  { t: '10:00 to about 10:45 AM', d: 'Open mat' },
  { t: '11:00 AM to 12:30 PM', d: 'Rolling for Ribbons', s: "Free women's self defense seminar", hot: true },
]
function dayPage() {
  const rows = DAY.map(r => `<div class="r${r.hot ? ' hot' : ''}"><div class="t">${esc(r.t)}</div><div class="d">${esc(r.d)}</div>${r.s ? `<div class="s">${esc(r.s)}</div>` : ''}</div>`).join('')
  return `<!doctype html><html><head><meta charset="utf-8"><style>${base}
body{background:radial-gradient(ellipse at 50% 38%, #2b1220 0%, ${BG} 70%)}
.kick{position:absolute;left:${COL}px;top:${TOP + 52}px;font-size:31px;letter-spacing:.2em;text-transform:uppercase;color:${PINK};white-space:nowrap}
.h{position:absolute;left:${COL}px;top:${TOP + 98}px;font-family:Anton,sans-serif;font-weight:400;font-size:118px;line-height:1.04;text-transform:uppercase;white-space:nowrap}
.logo{position:absolute;right:${COL}px;top:${TOP + 40}px;width:84px;height:84px;filter:invert(1)}
.rows{position:absolute;left:${COL}px;right:${COL}px;top:${TOP + 266}px}
.r{padding:18px 0 20px 26px;border-left:6px solid rgba(229,143,181,.45);margin-bottom:30px}
.r.hot{background:rgba(229,143,181,.16);border-left-color:${PINK};padding:24px 0 26px 26px}
.t{font-family:Anton,sans-serif;font-weight:400;font-size:60px;line-height:1.05;letter-spacing:.01em;text-transform:uppercase;color:${PINK};white-space:nowrap}
.d{margin-top:6px;font-size:44px;line-height:1.1;letter-spacing:.06em;text-transform:uppercase;white-space:nowrap}
.s{margin-top:8px;font-size:29px;line-height:1.15;letter-spacing:.1em;text-transform:uppercase;color:${MUTED};white-space:nowrap}
.off{position:absolute;left:${COL}px;top:${TOP + 880}px;font-size:30px;letter-spacing:.14em;text-transform:uppercase;color:${MUTED};white-space:nowrap}
.rsvp{position:absolute;left:${COL}px;top:${TOP + 944}px;font-size:28px;letter-spacing:.08em;text-transform:uppercase;white-space:nowrap}
.rsvp u{text-decoration:none;text-transform:none;letter-spacing:.04em;color:${TEXT}}
.rsvp b{color:${PINK};font-weight:700}
</style></head><body>
  <div class="kick">${esc('This Saturday · Oct 24')}</div>
  <div class="h">${esc('The whole day')}</div>
  <img class="logo" src="${logo}" alt="">
  <div class="rows">${rows}</div>
  <div class="off">${esc('Regular Saturday classes are off')}</div>
  <div class="rsvp"><b>RSVP free</b> &nbsp;<u>${esc('labyrinth.vision/self-defense-for-women')}</u></div>
</body></html>`
}

const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/opt/pw-browsers/chromium' })
let bad = 0
for (const [i, kind] of ['cover', 'day'].entries()) {
  const name = `saturday-seminar-${String(i + 1).padStart(2, '0')}.jpg`
  const pg = await browser.newPage({ viewport: { width: W, height: H } })
  await pg.setContent(kind === 'cover' ? coverPage() : dayPage(), { waitUntil: 'load' })
  await pg.evaluate(() => document.fonts.ready)
  await pg.evaluate(() => Promise.all([...document.images].map(im => im.decode())))
  // The cover's headline is shrunk until it fits the 810px column; then every piece of text must be inside the column and the middle square, clear of the next.
  const res = await pg.evaluate(({ TOP, SQ, W, COL, MAX, kind }) => {
    const out = []
    const h = document.querySelector('.h')
    let fs = parseFloat(getComputedStyle(h).fontSize)
    if (kind === 'cover') while (h.getBoundingClientRect().width > MAX && fs > 88) { fs -= 2; h.style.fontSize = fs + 'px' }
    const name = el => el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className ? '.' + el.className.split(' ')[0] : '')
    const sel = kind === 'cover' ? '.kick, .h, .when, .logo' : '.kick, .h, .logo, .t, .d, .s, .off, .rsvp'
    for (const el of document.querySelectorAll(sel)) {
      const r = el.getBoundingClientRect()
      if (r.right > W - COL + 0.5) out.push(`${name(el)} runs to ${Math.round(r.right)}px (the words end at ${W - COL}px)`)
      if (r.left < COL - 0.5) out.push(`${name(el)} starts at ${Math.round(r.left)}px (the words start at ${COL}px)`)
      if (r.bottom > TOP + SQ - 30) out.push(`${name(el)} ends at y=${Math.round(r.bottom)}, too close to the foot of the square (it ends at ${TOP + SQ})`)
      if (r.top < TOP + 30) out.push(`${name(el)} starts at y=${Math.round(r.top)}, too close to the top of the square (it starts at ${TOP})`)
    }
    const stack = (kind === 'cover' ? ['.kick', '.h', '.row'] : ['.kick', '.h', '.rows', '.off', '.rsvp']).map(s => [s, document.querySelector(s).getBoundingClientRect()])
    for (let k = 0; k < stack.length - 1; k++) if (stack[k][1].bottom > stack[k + 1][1].top + 0.5) out.push(`${stack[k][0]} runs into ${stack[k + 1][0]}`)
    if (kind === 'day') {
      const lg = document.querySelector('.logo').getBoundingClientRect(), hh = document.querySelector('.h').getBoundingClientRect(), kk = document.querySelector('.kick').getBoundingClientRect()
      const hw = Math.max(hh.right, kk.right)
      if (hw > lg.left) out.push('the title runs into the logo')
    } else {
      const r = [...document.querySelector('.row').children].map(c => c.getBoundingClientRect())
      if (r[0].right > r[1].left) out.push('the date runs into the logo')
    }
    return { out, fs: Math.round(fs) }
  }, { TOP, SQ, W, COL, MAX, kind })
  if (res.out.length) { bad++; console.error(`PROBLEM ${name}:\n  ` + res.out.join('\n  ')) }
  console.log(`${name}  ${kind}${kind === 'cover' ? `  photograph ${PHOTO}  headline ${res.fs}px` : ''}`)
  await pg.screenshot({ path: join(out, name), type: 'jpeg', quality: 90 })
  await pg.close()
}
await browser.close()
if (bad) process.exit(1)
