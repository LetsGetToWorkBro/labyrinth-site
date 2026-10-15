// The photo showcase post, October 2026: twenty pictures from the 2 October 2026 shoot by Israel De Leon (Lightroom album "Labyrinth 10-03-2026 - Ray"), shown as they are.
// One carousel for Instagram and Facebook together: Instagram takes at most 20 pictures in a post, and the same twenty go to Facebook.
//   assets/social/photo-showcase-01.jpg … -20.jpg   1080x1350 (4:5)
// Slide 1 and slide 20 carry the words (a title; the free first class and the web address). The eighteen between are the photographs and nothing else:
// each is the photographer's own frame cropped to 4:5 around whoever the picture is about, with no filter, text or logo on it.
// scripts/photo-showcase-captions.txt holds what is said with the post and one alt text per picture, in this order; this script checks the two agree on how many.
//
// The four photographs the kids "any day" post already used (RFH-1, 38, 39, 50) are left out of this one, and the script refuses to include them.
// The other 26 photographs in the album are held back for a second post, if one is wanted.
// Numbers below are the file names (Labyrinth_RFH-<n>.jpg), which run one more than a photograph's position in the album.
//
// Run: python3 scripts/lightroom-album.py https://lightroom.adobe.com/shares/14c3aee9382a420b944695d057ea0267 <folder>
//      node scripts/instagram-photo-showcase.mjs <folder>      (needs playwright-core, resolved from the CRM repo when not installed here)
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync } from 'node:fs'
const here = dirname(fileURLToPath(import.meta.url))
const req = createRequire(import.meta.url)
let chromium
try { ({ chromium } = req('playwright-core')) } catch { ({ chromium } = req('/home/user/labyrinth-app/node_modules/playwright-core')) }
const album = process.argv[2] ?? process.env.ALBUM_DIR
if (!album || !existsSync(album)) {
  console.error('usage: node scripts/instagram-photo-showcase.mjs <album folder>\n  (python3 scripts/lightroom-album.py <share link> <album folder> downloads it)')
  process.exit(2)
}
const out = process.env.OUT_DIR ?? join(here, '..', 'assets', 'social')
mkdirSync(out, { recursive: true })

const b64 = (p, mime) => `data:${mime};base64,${readFileSync(p).toString('base64')}`
const anton = b64(join(here, 'fonts', 'anton-latin-400-normal.woff2'), 'font/woff2')
const oswald = b64(join(here, 'fonts', 'oswald-latin-700-normal.woff2'), 'font/woff2')
const logo = b64(join(here, '..', 'assets', 'logo-maze-480.png'), 'image/png')

const BG = '#0A0A0A', GOLD = '#C8A24C', TEXT = '#F0F0F0', MUTED = '#a8a8a8'
const W = 1080, H = 1350, PH = 950           // slide size; the height of the photograph on the two slides that carry words

// ── The twenty, in the order they are shown ──
// rfh  the photograph's number in the album (Labyrinth_RFH-<rfh>.jpg)
// cx   where across the frame the picture is about, 0 (left edge) to 1 (right edge): the 4:5 window is centred there, and kept inside the frame
// cy   the same, down the frame; only a portrait or a very tall crop needs it
// How: 'cover' | 'close' carry words over a band under the photograph; 'wide' shows the whole frame on a blurred copy of itself; the rest are full-bleed.
const SLIDES = [
  { rfh: 46, cx: 0.56, how: 'cover' },   // girl with the top-knot over a girl in guard, the club's lettering behind
  { rfh: 23, cx: 0.43 },                  // teen grinning in a headlock
  { rfh: 5,  cx: 0.55 },                  // two women in a scramble, the wall's lettering above
  { rfh: 49, cx: 0.55 },                  // coach in the grey rash guard, talking to the class
  { rfh: 42, cx: 0.51 },                  // teen over a guard, one foot in the air
  { rfh: 48, cx: 0.48 },                  // girl with the top-knot and a front headlock
  { rfh: 2,  cx: 0.62 },                  // coach smiling at the camera, trees behind
  { rfh: 31, cx: 0.46 },                  // the tangle of legs
  { rfh: 19, cx: 0.47 },                  // two women, one of them laughing
  { rfh: 37, cx: 0.52 },                  // teen with a kid across his shoulders
  { rfh: 44, cx: 0.55 },                  // girl pinning a boy under the big team logo
  { rfh: 26, cx: 0.55 },                  // adult in the blue shirt, concentrating
  { rfh: 45, cx: 0.38 },                  // two girls drilling
  { rfh: 8,  cx: 0.58 },                  // teen bridging over an adult, the team logo behind
  { rfh: 40, cx: 0.55 },                  // coach and a girl, one kid on the mat
  { rfh: 47, cx: 0.40 },                  // teen girl standing over a girl in guard, holding the legs
  { rfh: 27, cx: 0.36 },                  // two training partners laughing mid-roll
  { rfh: 41, cx: 0.47 },                  // coach with two kids
  { rfh: 18, cx: 0.70 },                  // friends against the wall, laughing
  { rfh: 36, cx: 0.55, how: 'close' },    // girl grinning with a kid on her shoulders
]
const USED_ALREADY = [1, 38, 39, 50]
const seen = new Set()
for (const s of SLIDES) if (USED_ALREADY.includes(s.rfh)) throw new Error('RFH-' + s.rfh + ' was in the kids any-day post')
for (const s of SLIDES) { if (seen.has(s.rfh)) throw new Error('RFH-' + s.rfh + ' is in the post twice'); seen.add(s.rfh) }
if (SLIDES.length > 20) throw new Error('Instagram takes at most 20 pictures in a post')
if (SLIDES[0].how !== 'cover' || SLIDES.at(-1).how !== 'close') throw new Error('the first slide is the cover and the last is the close')

// The album folder holds <position>-Labyrinth_RFH-<n>.jpg
const files = readdirSync(album)
const fileFor = n => {
  const hit = files.find(f => new RegExp('(^|[-_])RFH-' + n + '\\.jpe?g$', 'i').test(f))
  if (!hit) throw new Error('RFH-' + n + ' is not in ' + album)
  return join(album, hit)
}

// The captions file lists one alt text per picture, "Picture 1: …" down to "Picture 20: …": the same count, in the same order.
const capFile = join(here, 'photo-showcase-captions.txt')
if (existsSync(capFile)) {
  const nums = [...readFileSync(capFile, 'utf8').matchAll(/^Picture (\d+): /gm)].map(m => +m[1])
  const want = SLIDES.map((_, i) => i + 1).join(',')
  if (nums.join(',') !== want) throw new Error('photo-showcase-captions.txt has alt text for pictures ' + (nums.join(',') || '(none)') + ', and the post has ' + want)
}

const fonts = `@font-face{font-family:Anton;src:url(${anton}) format('woff2')}@font-face{font-family:Oswald;font-weight:700;src:url(${oswald}) format('woff2')}`

// One slide's page. The photograph's crop is set in the page once the picture is decoded (it needs the photograph's own size).
function page(s) {
  const src = b64(fileFor(s.rfh), 'image/jpeg')
  const base = `${fonts}*{margin:0;box-sizing:border-box}body{width:${W}px;height:${H}px;position:relative;overflow:hidden;background:${BG};font-family:Oswald,sans-serif;font-weight:700;color:${TEXT}}img.p{display:block;width:100%;height:100%;object-fit:cover}`
  if (s.how === 'wide') {
    return `<!doctype html><html><head><meta charset="utf-8"><style>${base}
.bg{position:absolute;inset:-60px;width:${W + 120}px;height:${H + 120}px;object-fit:cover;filter:blur(38px) brightness(.55) saturate(1.1)}
.fg{position:absolute;left:0;width:${W}px;top:50%;transform:translateY(-50%);height:auto;box-shadow:0 0 60px rgba(0,0,0,.55)}
</style></head><body><img class="bg" src="${src}" alt=""><img class="fg" src="${src}" alt=""></body></html>`
  }
  if (!s.how) return `<!doctype html><html><head><meta charset="utf-8"><style>${base}</style></head><body><img class="p" src="${src}" alt=""></body></html>`
  const cover = s.how === 'cover'
  // The two slides that carry words: the photograph on top, fading into a dark band with the words in it.
  const words = cover ? `
    <div class="kick">Kids &middot; Teens &middot; Adults</div>
    <div class="h">This is <span>Labyrinth</span></div>
    <div class="row"><span class="swipe">Swipe for the pictures</span><img class="logo" src="${logo}" alt=""></div>` : `
    <div class="kick">Your first class is free</div>
    <div class="h">See you on <span>the mat</span></div>
    <div class="row"><div class="btn">Book a free class</div><div class="url">labyrinth.vision<small>Book in a minute</small></div></div>`
  return `<!doctype html><html><head><meta charset="utf-8"><style>${base}
.ph{position:absolute;left:0;top:0;width:${W}px;height:${PH}px;overflow:hidden}
.ph::after{content:'';position:absolute;inset:0;background:linear-gradient(to bottom, rgba(10,10,10,0) 70%, ${BG} 100%)}
.pad{position:absolute;left:70px;right:70px;top:0;bottom:0}
.kick{position:absolute;left:0;top:${PH + 34}px;font-size:31px;letter-spacing:.2em;text-transform:uppercase;color:${GOLD};white-space:nowrap}
.h{position:absolute;left:0;top:${PH + 82}px;font-family:Anton,sans-serif;font-weight:400;font-size:${cover ? 124 : 118}px;line-height:1.04;letter-spacing:.004em;text-transform:uppercase;white-space:nowrap}
.h span{color:${GOLD}}
.row{position:absolute;left:0;right:0;top:${PH + 232}px;height:100px;display:flex;align-items:center}
.swipe{font-size:30px;letter-spacing:.16em;text-transform:uppercase;color:${MUTED};white-space:nowrap}
.swipe::after{content:'';display:inline-block;margin-left:16px;border-left:16px solid ${GOLD};border-top:10px solid transparent;border-bottom:10px solid transparent}
.logo{width:92px;height:92px;filter:invert(1);margin-left:auto}
.btn{background:${GOLD};color:${BG};border-radius:999px;padding:22px 48px;font-family:Anton,sans-serif;font-weight:400;font-size:58px;line-height:1.05;letter-spacing:.04em;text-transform:uppercase;white-space:nowrap}
.url{margin-left:30px;font-size:32px;line-height:1.25;letter-spacing:.06em;text-transform:uppercase;white-space:nowrap}
.url small{display:block;font-size:24px;color:${MUTED};letter-spacing:.12em}
</style></head><body>
  <div class="ph"><img class="p" src="${src}" alt=""></div>
  <div class="pad">${words}
  </div>
</body></html>`
}

const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/opt/pw-browsers/chromium' })
let bad = 0
const report = []
for (const [i, s] of SLIDES.entries()) {
  const name = 'photo-showcase-' + String(i + 1).padStart(2, '0') + '.jpg'
  const pg = await browser.newPage({ viewport: { width: W, height: H } })
  await pg.setContent(page(s), { waitUntil: 'load' })
  await pg.evaluate(() => document.fonts.ready)
  await pg.evaluate(() => Promise.all([...document.images].map(im => im.decode())))
  // Centre the 4:5 window (or, on the cover and the close, the shorter window) on the subject, without leaving the frame.
  const crop = await pg.evaluate(({ cx, cy }) => {
    const im = document.querySelector('img.p')
    if (!im) return null
    const box = im.getBoundingClientRect()
    const scale = Math.max(box.width / im.naturalWidth, box.height / im.naturalHeight)
    const vw = box.width / (im.naturalWidth * scale), vh = box.height / (im.naturalHeight * scale)
    const place = (c, v) => v >= 0.9999 ? 0.5 : Math.min(1, Math.max(0, (c - v / 2) / (1 - v)))
    im.style.objectPosition = `${place(cx, vw) * 100}% ${place(cy ?? 0.5, vh) * 100}%`
    const x0 = place(cx, vw) * (1 - vw)
    return { x0: +x0.toFixed(3), x1: +(x0 + vw).toFixed(3), upscale: +scale.toFixed(2) }
  }, { cx: s.cx, cy: s.cy })
  // Words on the cover and the close must stay inside the side margins and clear of each other and of the foot of the slide.
  if (s.how === 'cover' || s.how === 'close') {
    const problems = await pg.evaluate(({ H }) => {
      const out = []
      const name = el => el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className ? '.' + el.className.split(' ')[0] : '')
      for (const el of document.querySelectorAll('.kick, .h, .swipe, .logo, .btn, .url')) {
        const r = el.getBoundingClientRect()
        if (r.right > 1010.5) out.push(`${name(el)} runs to ${Math.round(r.right)}px (right margin is 1010px)`)
        if (r.left < 69.5) out.push(`${name(el)} starts at ${Math.round(r.left)}px (left margin is 70px)`)
        if (r.bottom > H - 30) out.push(`${name(el)} ends at y=${Math.round(r.bottom)}, too close to the foot of the slide`)
      }
      const stack = ['.kick', '.h', '.row'].map(sel => [sel, document.querySelector(sel).getBoundingClientRect()])
      for (let k = 0; k < stack.length - 1; k++) if (stack[k][1].bottom > stack[k + 1][1].top + 0.5) out.push(`${stack[k][0]} runs into ${stack[k + 1][0]}`)
      const row = document.querySelector('.row'), kids = [...row.children].map(c => c.getBoundingClientRect())
      for (let k = 0; k < kids.length - 1; k++) if (kids[k].right > kids[k + 1].left) out.push('the two things on the bottom row overlap')
      return out
    }, { H })
    if (problems.length) { bad++; console.error(`PROBLEM ${name}:\n  ` + problems.join('\n  ')) }
  }
  await pg.screenshot({ path: join(out, name), type: 'jpeg', quality: 90 })
  report.push(`${String(i + 1).padStart(2)}  RFH-${String(s.rfh).padEnd(2)} ${s.how ?? 'photo'}${crop ? `  frame ${crop.x0}–${crop.x1}${crop.upscale > 1 ? `  UPSCALED ${crop.upscale}x` : ''}` : ''}  ${(statSync(join(out, name)).size / 1024).toFixed(0)} KB`)
  await pg.close()
}
await browser.close()
console.log(report.join('\n'))
if (bad) process.exit(1)
