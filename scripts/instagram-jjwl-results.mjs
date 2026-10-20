// The JJWL Houston results post, October 2026: two pictures from the Lightroom album "JJWL Houston 10/17/2026 by Aivizuals"
// (https://lightroom.adobe.com/shares/bf71694e81744114b32282be1bd48681, 257 photos exported at 2048 px). One Instagram carousel, and the same two pictures
// go to Facebook as one post. The result is the owner's (October 20, 2026): Team Labyrinth finished 1st overall in no-gi and 3rd in the gi at The Nationals South II.
//
//   assets/social/jjwl-results/jjwl-results-01.jpg   the cover: photograph 91 (the children with their gold medals and two coaches), the result in words under it
//   assets/social/jjwl-results/jjwl-results-02.jpg   photograph 78 (a child holding the 3RD PLACE, GI, YOUTH ACADEMY trophy), nothing on it but the photograph
//   both 1080x1350 (4:5). What is said with them, and the alt text, is in scripts/jjwl-results-captions.txt.
//
// The slides follow the October 2026 photo posts (scripts/instagram-photo-posts.mjs): everything that matters is in the middle 1080x1080 square, because
// Instagram's composer and some posting tools crop a carousel to a square (135px off the top and bottom of a 4:5 slide), and the words stay in the middle
// 810px (a square post's grid thumbnail is a 3:4 slice). The cover is a 1080x1080 card with the photograph on top fading into a dark band with the words in it,
// a soft blurred copy of the photograph above and below it; the second slide is the whole portrait photograph, full height, on a blurred copy of itself.
//
// Run: python3 scripts/lightroom-album.py https://lightroom.adobe.com/shares/bf71694e81744114b32282be1bd48681 <folder>
//      node scripts/instagram-jjwl-results.mjs --album <folder> [--out <folder>]
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
const out = opt('out') ?? process.env.OUT_DIR ?? join(here, '..', 'assets', 'social', 'jjwl-results')
if (!album || !existsSync(album)) {
  console.error('usage: node scripts/instagram-jjwl-results.mjs --album <folder of the "JJWL Houston 10/17/2026 by Aivizuals" album>\n  (python3 scripts/lightroom-album.py https://lightroom.adobe.com/shares/bf71694e81744114b32282be1bd48681 <folder> downloads it)')
  process.exit(2)
}
mkdirSync(out, { recursive: true })

const b64 = (p, mime) => `data:${mime};base64,${readFileSync(p).toString('base64')}`
const anton = b64(join(here, 'fonts', 'anton-latin-400-normal.woff2'), 'font/woff2')
const oswald = b64(join(here, 'fonts', 'oswald-latin-700-normal.woff2'), 'font/woff2')
const logo = b64(join(here, '..', 'assets', 'logo-maze-480.png'), 'image/png')
const BG = '#0A0A0A', GOLD = '#C8A24C', TEXT = '#F0F0F0', MUTED = '#a8a8a8'
const W = 1080, H = 1350                    // slide size (4:5)
const SQ = 1080, TOP = (H - SQ) / 2          // the card: the middle square, which is all a square crop keeps
const PH = 700                               // the photograph's height in the cover's card (the whole 3:2 frame is 720: 20px off the ceiling)
const COL = 135                              // the words stay in the middle 810px
const MAX = W - 2 * COL

// photograph numbers are the positions in the album (the first part of each downloaded file's name)
const SLIDES = [
  { photo: 91, role: 'cover', cy: 1 },       // cy 1: keep the bottom of the frame (the children's feet), trim the ceiling
  { photo: 78, role: 'tall' },
]
const COVER = {
  kicker: 'JJWL Houston · Oct 17',
  stats: [{ n: '1st', l: 'Overall in no-gi' }, { n: '3rd', l: 'In the gi' }],
  swipe: 'Swipe for the trophy',
}

const files = readdirSync(album)
const fileFor = n => {
  const hit = files.find(f => new RegExp('^0*' + n + '-.*\\.jpe?g$', 'i').test(f))
  if (!hit) throw new Error(`photograph ${n} is not in ${album}`)
  return join(album, hit)
}

const fonts = `@font-face{font-family:Anton;src:url(${anton}) format('woff2')}@font-face{font-family:Oswald;font-weight:700;src:url(${oswald}) format('woff2')}`
const base = `${fonts}*{margin:0;box-sizing:border-box}body{width:${W}px;height:${H}px;position:relative;overflow:hidden;background:${BG};font-family:Oswald,sans-serif;font-weight:700;color:${TEXT}}img.p{display:block;width:100%;height:100%;object-fit:cover}`
const esc = t => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/·/g, '&middot;')

function coverPage(s) {
  const src = b64(fileFor(s.photo), 'image/jpeg')
  return `<!doctype html><html><head><meta charset="utf-8"><style>${base}
.bg{position:absolute;inset:-60px;width:${W + 120}px;height:${H + 120}px;object-fit:cover;filter:blur(38px) brightness(.36) saturate(1.1)}
.below{position:absolute;left:0;top:${TOP + SQ}px;width:${W}px;height:${H - TOP - SQ}px;background:${BG}}
.card{position:absolute;left:0;top:${TOP}px;width:${W}px;height:${SQ}px;overflow:hidden;background:${BG}}
.ph{position:absolute;left:0;top:0;width:${W}px;height:${PH}px;overflow:hidden}
.ph::after{content:'';position:absolute;inset:0;background:linear-gradient(to bottom, rgba(10,10,10,0) 72%, ${BG} 100%)}
.pad{position:absolute;left:${COL}px;right:${COL}px;top:0;bottom:0}
.kick{position:absolute;left:0;top:${PH + 14}px;font-size:31px;letter-spacing:.2em;text-transform:uppercase;color:${GOLD};white-space:nowrap}
.stats{position:absolute;left:0;right:0;top:${PH + 60}px;display:flex}
.stat{width:50%}
.stat + .stat{padding-left:44px;border-left:2px solid rgba(200,162,76,.45)}
.n{font-family:Anton,sans-serif;font-weight:400;font-size:124px;line-height:1.02;color:${GOLD};text-transform:uppercase}
.l{margin-top:2px;font-size:31px;letter-spacing:.12em;text-transform:uppercase;color:${TEXT};white-space:nowrap}
.row{position:absolute;left:0;right:0;top:${PH + 246}px;height:84px;display:flex;align-items:center}
.swipe{font-size:28px;letter-spacing:.16em;text-transform:uppercase;color:${MUTED};white-space:nowrap}
.swipe::after{content:'';display:inline-block;margin-left:16px;border-left:15px solid ${GOLD};border-top:9px solid transparent;border-bottom:9px solid transparent}
.logo{width:84px;height:84px;filter:invert(1);margin-left:auto}
</style></head><body>
  <img class="bg" src="${src}" style="object-position:50% 50%" alt="">
  <div class="below"></div>
  <div class="card"><div class="ph"><img class="p" src="${src}" data-cx="0.5" data-cy="${s.cy ?? 0.5}" alt=""></div>
  <div class="pad">
    <div class="kick">${esc(COVER.kicker)}</div>
    <div class="stats">${COVER.stats.map(x => `<div class="stat"><div class="n">${esc(x.n)}</div><div class="l">${esc(x.l)}</div></div>`).join('')}</div>
    <div class="row"><span class="swipe">${esc(COVER.swipe)}</span><img class="logo" src="${logo}" alt=""></div>
  </div></div>
</body></html>`
}

// A portrait photograph, whole, at the full height of the slide on a blurred copy of itself. What matters in it must sit inside the middle 80% of its
// height, which is all a square crop keeps; photograph 78's child and trophy run from 12% to 85%.
function tallPage(s) {
  const src = b64(fileFor(s.photo), 'image/jpeg')
  return `<!doctype html><html><head><meta charset="utf-8"><style>${base}
.bg{position:absolute;inset:-60px;width:${W + 120}px;height:${H + 120}px;object-fit:cover;filter:blur(38px) brightness(.5) saturate(1.1)}
.fg{position:absolute;top:0;left:50%;transform:translateX(-50%);height:${H}px;width:auto;box-shadow:0 0 60px rgba(0,0,0,.55)}
</style></head><body><img class="bg" src="${src}" alt=""><img class="fg" src="${src}" alt=""></body></html>`
}

const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/opt/pw-browsers/chromium' })
let bad = 0
for (const [i, s] of SLIDES.entries()) {
  const name = `jjwl-results-${String(i + 1).padStart(2, '0')}.jpg`
  const pg = await browser.newPage({ viewport: { width: W, height: H } })
  await pg.setContent(s.role === 'cover' ? coverPage(s) : tallPage(s), { waitUntil: 'load' })
  await pg.evaluate(() => document.fonts.ready)
  await pg.evaluate(() => Promise.all([...document.images].map(im => im.decode())))
  if (s.role === 'cover') {
    // the cover's window on the photograph: centred on the subject without leaving the frame
    const crop = await pg.evaluate(() => {
      const im = document.querySelector('img.p'), box = im.getBoundingClientRect(), cx = +im.dataset.cx, cy = +im.dataset.cy
      const scale = Math.max(box.width / im.naturalWidth, box.height / im.naturalHeight)
      const vw = box.width / (im.naturalWidth * scale), vh = box.height / (im.naturalHeight * scale)
      const place = (c, v) => v >= 0.9999 ? 0.5 : Math.min(1, Math.max(0, (c - v / 2) / (1 - v)))
      im.style.objectPosition = `${place(cx, vw) * 100}% ${place(cy, vh) * 100}%`
      return { upscale: +scale.toFixed(2), shows: `${(vw * 100).toFixed(0)}% x ${(vh * 100).toFixed(0)}% of the frame` }
    })
    // the words stay inside the side margins, clear of each other and of the foot of the card
    const res = await pg.evaluate(({ TOP, SQ, W, COL }) => {
      const out = []
      const name = el => el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className ? '.' + el.className.split(' ')[0] : '')
      for (const el of document.querySelectorAll('.kick, .n, .l, .swipe, .logo')) {
        const r = el.getBoundingClientRect()
        if (r.right > W - COL + 0.5) out.push(`${name(el)} runs to ${Math.round(r.right)}px (the words end at ${W - COL}px)`)
        if (r.left < COL - 0.5) out.push(`${name(el)} starts at ${Math.round(r.left)}px (the words start at ${COL}px)`)
        if (r.bottom > TOP + SQ - 30) out.push(`${name(el)} ends at y=${Math.round(r.bottom)}, too close to the foot of the card (a square crop ends at ${TOP + SQ})`)
      }
      const stack = ['.kick', '.stats', '.row'].map(sel => [sel, document.querySelector(sel).getBoundingClientRect()])
      for (let k = 0; k < stack.length - 1; k++) if (stack[k][1].bottom > stack[k + 1][1].top + 0.5) out.push(`${stack[k][0]} runs into ${stack[k + 1][0]}`)
      const row = [...document.querySelector('.row').children].map(c => c.getBoundingClientRect())
      if (row[0].right > row[1].left) out.push('the two things on the bottom row overlap')
      return out
    }, { TOP, SQ, W, COL })
    if (res.length) { bad++; console.error(`PROBLEM ${name}:\n  ` + res.join('\n  ')) }
    console.log(`${name}  cover  photograph ${s.photo}  shows ${crop.shows}${crop.upscale > 1 ? `  UPSCALED ${crop.upscale}x` : ''}`)
  } else {
    console.log(`${name}  tall   photograph ${s.photo}`)
  }
  await pg.screenshot({ path: join(out, name), type: 'jpeg', quality: 90 })
  await pg.close()
}
await browser.close()
if (bad) process.exit(1)
