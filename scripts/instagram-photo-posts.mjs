// The photo posts, October 2026: pictures from the 3 October 2026 shoot (two photographers, two Lightroom albums), shown as they are.
// Each post is one Instagram carousel, and the same pictures go to Facebook as one post. Instagram takes at most 20 pictures in a post.
// What goes in each post, in what order and how each picture is cropped is in scripts/photo-posts.json; what is said with each post, and one alt text
// per picture, is in scripts/photo-posts-captions.txt (this script checks the two agree on how many pictures a post has).
//
//   assets/social/photo-posts/<post>-01.jpg … <post>-NN.jpg   1080x1350 (4:5)
//   (assets/social/shoot/ holds the first version of these pictures, made 4:5 edge to edge; Instagram squared the first post made from them and cut
//   the logo, the button and the heads off, so that folder now holds these same pictures under the old names, for any prompt that still points there)
//
// EVERYTHING THAT MATTERS IS IN THE MIDDLE SQUARE. A slide is 4:5, but Instagram's composer (and some posting tools) crop a carousel to a
// 1:1 square unless they are told not to, and a square crop is the middle 1080x1080 of the slide: 135px come off the top and 135px off the bottom.
// The first post went up that way and lost the logo, "Swipe for the pictures", the close's button and web address, and the tops of heads. So each
// slide is built as a square (the "card") sitting in the middle of the 4:5 frame, with a soft blurred copy of the photograph above and below it:
// shown 4:5 it is a photograph on its own backdrop, shown square it is the whole card and nothing is cut. Nothing on a slide may lie outside the
// card, and the words stay in its middle 810px (a square post's grid thumbnail is a 3:4 slice of it); the words are checked against that below.
//
// The first slide of a post (the cover) and the last (the close) carry words under the photograph: who the post is about, and the free first class.
// Every slide between is the photograph and nothing else, the photographer's own frame cropped to a square around the people it is about,
// with no filter, text or logo on it.
//   how: (none)  a square crop, centred on cx (and cy, for a portrait)
//        'wide'  the whole frame at full width on a blurred copy of itself, for a wide shot that a crop would spoil
//        'stack' two wide frames, one above the other inside the card, the second given as "with": { photo, cx }
//
// Run: python3 scripts/lightroom-album.py <share link> <folder>        (once for each album in the plan)
//      node scripts/instagram-photo-posts.mjs --ray <folder> --israel <folder> [--only teens,women] [--out <folder>]
// (needs playwright-core, resolved from the CRM repo when not installed here)
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync } from 'node:fs'
const here = dirname(fileURLToPath(import.meta.url))
const req = createRequire(import.meta.url)
let chromium
try { ({ chromium } = req('playwright-core')) } catch { ({ chromium } = req('/home/user/labyrinth-app/node_modules/playwright-core')) }

const args = process.argv.slice(2)
const opt = name => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : undefined }
const plan = JSON.parse(readFileSync(join(here, 'photo-posts.json'), 'utf8'))
const folders = Object.fromEntries(Object.keys(plan.albums).map(k => [k, opt(k) ?? process.env[k.toUpperCase() + '_DIR']]))
const only = (opt('only') ?? '').split(',').filter(Boolean)
const out = opt('out') ?? process.env.OUT_DIR ?? join(here, '..', 'assets', 'social', 'photo-posts')
const posts = plan.posts.filter(p => !only.length || only.includes(p.id))
if (!posts.length) { console.error('no post matches --only ' + only.join(',') + '; the plan has: ' + plan.posts.map(p => p.id).join(', ')); process.exit(2) }
for (const a of new Set(posts.map(p => p.album))) {
  if (!folders[a] || !existsSync(folders[a])) {
    console.error(`usage: node scripts/instagram-photo-posts.mjs --${a} <folder of the "${plan.albums[a].label}" album> …\n  (python3 scripts/lightroom-album.py ${plan.albums[a].share} <folder> downloads it)`)
    process.exit(2)
  }
}
mkdirSync(out, { recursive: true })

const b64 = (p, mime) => `data:${mime};base64,${readFileSync(p).toString('base64')}`
const anton = b64(join(here, 'fonts', 'anton-latin-400-normal.woff2'), 'font/woff2')
const oswald = b64(join(here, 'fonts', 'oswald-latin-700-normal.woff2'), 'font/woff2')
const logo = b64(join(here, '..', 'assets', 'logo-maze-480.png'), 'image/png')
const BG = '#0A0A0A', GOLD = '#C8A24C', TEXT = '#F0F0F0', MUTED = '#a8a8a8'
const W = 1080, H = 1350                    // slide size (4:5)
const SQ = 1080, TOP = (H - SQ) / 2          // the card: the middle square, which is all a square crop keeps (135px from the top of the slide)
const PH = 728                               // the height of the photograph in the card on the two slides that carry words (a whole 3:2 frame)
const COL = 135                              // the words stay in the middle 810px: Instagram's profile grid shows a square post as a 3:4 slice (135px off each side)
const MAX_TITLE = W - 2 * COL

// ── Checks on the plan itself ──
const problems = []
const claimed = new Map()
for (const p of plan.posts) {
  if (p.slides.length > 20) problems.push(`${p.id}: ${p.slides.length} pictures; Instagram takes at most 20`)
  if (p.slides.length < 3) problems.push(`${p.id}: a post needs a cover, a close and something between`)
  for (const s of p.slides) for (const n of [s.photo, s.with?.photo].filter(Boolean)) {
    const key = p.album + ':' + n
    if (claimed.has(key)) problems.push(`${key} is in ${claimed.get(key)} and in ${p.id}`)
    claimed.set(key, p.id)
  }
}
if (problems.length) { console.error('PLAN PROBLEMS:\n  ' + problems.join('\n  ')); process.exit(1) }

const listed = Object.fromEntries(Object.entries(folders).filter(([, d]) => d && existsSync(d)).map(([k, d]) => [k, readdirSync(d)]))
const fileFor = (album, n) => {
  const tail = plan.albums[album].file.replace('{n}', n).replace(/\./g, '\\.')
  const hit = listed[album].find(f => new RegExp('(^|[-_])' + tail + '$', 'i').test(f))
  if (!hit) throw new Error(`${album} photograph ${n} is not in ${folders[album]}`)
  return join(folders[album], hit)
}

// The captions file lists one alt text per picture: "Picture 1: …" down to the last, under "==== <post>: ALT TEXT ====".
const capFile = join(here, 'photo-posts-captions.txt')
const caps = existsSync(capFile) ? readFileSync(capFile, 'utf8') : ''
for (const p of posts) {
  const m = caps.match(new RegExp('^={20} ' + p.id + ': ALT TEXT ={20}\\n([\\s\\S]*?)(?=^={20} |(?![\\s\\S]))', 'm'))
  if (!m) { console.warn(`note: no alt text yet for ${p.id} in photo-posts-captions.txt`); continue }
  const nums = [...m[1].matchAll(/^Picture (\d+): /gm)].map(x => +x[1])
  const want = p.slides.map((_, i) => i + 1).join(',')
  if (nums.join(',') !== want) { console.error(`photo-posts-captions.txt has alt text for pictures ${nums.join(',') || '(none)'} of ${p.id}, and the post has ${want}`); process.exit(1) }
}

const fonts = `@font-face{font-family:Anton;src:url(${anton}) format('woff2')}@font-face{font-family:Oswald;font-weight:700;src:url(${oswald}) format('woff2')}`
const base = `${fonts}*{margin:0;box-sizing:border-box}body{width:${W}px;height:${H}px;position:relative;overflow:hidden;background:${BG};font-family:Oswald,sans-serif;font-weight:700;color:${TEXT}}img.p{display:block;width:100%;height:100%;object-fit:cover}`
const img = (post, s, extra = '') => `<img class="p" src="${b64(fileFor(post.album, s.photo), 'image/jpeg')}" data-cx="${s.cx ?? 0.5}" data-cy="${s.cy ?? 0.5}" alt=""${extra}>`

// The blurred copy of the photograph that fills the whole 4:5 frame behind the card: it is what shows above and below the card when a slide is seen 4:5.
const backdrop = (post, s) => `<img class="bg" src="${b64(fileFor(post.album, s.photo), 'image/jpeg')}" style="object-position:${((s.cx ?? 0.5) * 100).toFixed(1)}% 50%" alt="">`
const back = dim => `.bg{position:absolute;inset:-60px;width:${W + 120}px;height:${H + 120}px;object-fit:cover;filter:blur(38px) brightness(${dim}) saturate(1.1)}`
const GAP = 24, SH = (SQ - GAP) / 2           // the two frames of a stack, and the gap between them

// One slide's page. The photograph's crop is set in the page once the picture is decoded (it needs the photograph's own size).
function slidePage(post, s, role) {
  if (s.how === 'wide') {
    const src = b64(fileFor(post.album, s.photo), 'image/jpeg')
    return `<!doctype html><html><head><meta charset="utf-8"><style>${base}
.bg{position:absolute;inset:-60px;width:${W + 120}px;height:${H + 120}px;object-fit:cover;filter:blur(38px) brightness(.55) saturate(1.1)}
.fg{position:absolute;left:0;width:${W}px;top:50%;transform:translateY(-50%);height:auto;box-shadow:0 0 60px rgba(0,0,0,.55)}
</style></head><body><img class="bg" src="${src}" alt=""><img class="fg" src="${src}" alt=""></body></html>`
  }
  if (s.how === 'stack') {
    return `<!doctype html><html><head><meta charset="utf-8"><style>${base}${back(0.45)}
.a,.b{position:absolute;left:0;width:${W}px;height:${SH}px;overflow:hidden;box-shadow:0 0 50px rgba(0,0,0,.5)}.a{top:${TOP}px}.b{top:${TOP + SH + GAP}px}
</style></head><body>${backdrop(post, s)}<div class="a">${img(post, s)}</div><div class="b">${img(post, s.with)}</div></body></html>`
  }
  if (!role) return `<!doctype html><html><head><meta charset="utf-8"><style>${base}${back(0.45)}
.sq{position:absolute;left:0;top:${TOP}px;width:${W}px;height:${SQ}px;overflow:hidden;box-shadow:0 0 70px rgba(0,0,0,.6)}
</style></head><body>${backdrop(post, s)}<div class="sq">${img(post, s)}</div></body></html>`
  const cover = role === 'cover'
  // The two slides that carry words: inside the card, the photograph on top, fading into a dark band with the words in it.
  const words = cover ? `
    <div class="kick">${esc(post.kicker)}</div>
    <div class="h">${esc(post.title[0])} <span>${esc(post.title[1])}</span></div>
    <div class="row"><span class="swipe">Swipe for the pictures</span><img class="logo" src="${logo}" alt=""></div>` : `
    <div class="kick">${esc(post.closeKicker)}</div>
    <div class="h">See you on <span>the mat</span></div>
    <div class="row"><div class="btn">Book a free class</div><div class="url">labyrinth.vision<small>Book in a minute</small></div></div>`
  return `<!doctype html><html><head><meta charset="utf-8"><style>${base}${back(0.36)}
.below{position:absolute;left:0;top:${TOP + SQ}px;width:${W}px;height:${H - TOP - SQ}px;background:${BG}}
.card{position:absolute;left:0;top:${TOP}px;width:${W}px;height:${SQ}px;overflow:hidden;background:${BG}}
.ph{position:absolute;left:0;top:0;width:${W}px;height:${PH}px;overflow:hidden}
.ph::after{content:'';position:absolute;inset:0;background:linear-gradient(to bottom, rgba(10,10,10,0) 70%, ${BG} 100%)}
.pad{position:absolute;left:${COL}px;right:${COL}px;top:0;bottom:0}
.kick{position:absolute;left:0;top:${PH + 18}px;font-size:31px;letter-spacing:.2em;text-transform:uppercase;color:${GOLD};white-space:nowrap}
.h{position:absolute;left:0;top:${PH + 66}px;font-family:Anton,sans-serif;font-weight:400;font-size:124px;line-height:1.04;letter-spacing:.004em;text-transform:uppercase;white-space:nowrap}
.h span{color:${GOLD}}
.row{position:absolute;left:0;right:0;top:${PH + 206}px;height:100px;display:flex;align-items:center}
.swipe{font-size:30px;letter-spacing:.16em;text-transform:uppercase;color:${MUTED};white-space:nowrap}
.swipe::after{content:'';display:inline-block;margin-left:16px;border-left:16px solid ${GOLD};border-top:10px solid transparent;border-bottom:10px solid transparent}
.logo{width:92px;height:92px;filter:invert(1);margin-left:auto}
.btn{background:${GOLD};color:${BG};border-radius:999px;padding:20px 40px;font-family:Anton,sans-serif;font-weight:400;font-size:54px;line-height:1.05;letter-spacing:.04em;text-transform:uppercase;white-space:nowrap}
.url{margin-left:26px;font-size:30px;line-height:1.25;letter-spacing:.06em;text-transform:uppercase;white-space:nowrap}
.url small{display:block;font-size:22px;color:${MUTED};letter-spacing:.12em}
</style></head><body>
  ${backdrop(post, s)}
  <div class="below"></div>
  <div class="card"><div class="ph">${img(post, s)}</div>
  <div class="pad">${words}
  </div></div>
</body></html>`
}
const esc = t => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/·/g, '&middot;')

const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/opt/pw-browsers/chromium' })
let bad = 0
for (const post of posts) {
  const report = []
  for (const [i, s] of post.slides.entries()) {
    const role = i === 0 ? 'cover' : i === post.slides.length - 1 ? 'close' : null
    const name = `${post.id}-${String(i + 1).padStart(2, '0')}.jpg`
    const pg = await browser.newPage({ viewport: { width: W, height: H } })
    await pg.setContent(slidePage(post, s, role), { waitUntil: 'load' })
    await pg.evaluate(() => document.fonts.ready)
    await pg.evaluate(() => Promise.all([...document.images].map(im => im.decode())))
    // Centre each 4:5 window (or, on the cover and the close, the shorter window) on its subject, without leaving the frame.
    const crop = await pg.evaluate(() => {
      let first = null
      for (const im of document.querySelectorAll('img.p')) {
        const box = im.getBoundingClientRect(), cx = +im.dataset.cx, cy = +im.dataset.cy
        const scale = Math.max(box.width / im.naturalWidth, box.height / im.naturalHeight)
        const vw = box.width / (im.naturalWidth * scale), vh = box.height / (im.naturalHeight * scale)
        const place = (c, v) => v >= 0.9999 ? 0.5 : Math.min(1, Math.max(0, (c - v / 2) / (1 - v)))
        im.style.objectPosition = `${place(cx, vw) * 100}% ${place(cy, vh) * 100}%`
        if (!first) { const x0 = place(cx, vw) * (1 - vw); first = { x0: +x0.toFixed(3), x1: +(x0 + vw).toFixed(3), upscale: +scale.toFixed(2), portrait: im.naturalHeight > im.naturalWidth } }
      }
      return first
    })
    // Words on the cover and the close must stay inside the side margins and clear of each other and of the foot of the slide.
    let fit = ''
    if (role) {
      const res = await pg.evaluate(({ TOP, SQ, W, COL, MAX }) => {
        const h = document.querySelector('.h'); let fs = 124
        while (h.getBoundingClientRect().width > MAX && fs > 90) { fs -= 2; h.style.fontSize = fs + 'px' }
        const out = []
        const name = el => el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className ? '.' + el.className.split(' ')[0] : '')
        for (const el of document.querySelectorAll('.kick, .h, .swipe, .logo, .btn, .url')) {
          const r = el.getBoundingClientRect()
          if (r.right > W - COL + 0.5) out.push(`${name(el)} runs to ${Math.round(r.right)}px (the words end at ${W - COL}px)`)
          if (r.left < COL - 0.5) out.push(`${name(el)} starts at ${Math.round(r.left)}px (the words start at ${COL}px)`)
          if (r.bottom > TOP + SQ - 30) out.push(`${name(el)} ends at y=${Math.round(r.bottom)}, too close to the foot of the card (a square crop ends at ${TOP + SQ})`)
          if (r.top < TOP + 30) out.push(`${name(el)} starts at y=${Math.round(r.top)}, too close to the top of the card (a square crop starts at ${TOP})`)
        }
        const stack = ['.kick', '.h', '.row'].map(sel => [sel, document.querySelector(sel).getBoundingClientRect()])
        for (let k = 0; k < stack.length - 1; k++) if (stack[k][1].bottom > stack[k + 1][1].top + 0.5) out.push(`${stack[k][0]} runs into ${stack[k + 1][0]}`)
        const row = document.querySelector('.row'), kids = [...row.children].map(c => c.getBoundingClientRect())
        for (let k = 0; k < kids.length - 1; k++) if (kids[k].right > kids[k + 1].left) out.push('the two things on the bottom row overlap')
        return { out, fs }
      }, { TOP, SQ, W, COL, MAX: MAX_TITLE })
      if (res.fs < 124) fit = `  title set at ${res.fs}px`
      if (res.out.length) { bad++; console.error(`PROBLEM ${name}:\n  ` + res.out.join('\n  ')) }
    }
    await pg.screenshot({ path: join(out, name), type: 'jpeg', quality: 90 })
    report.push(`${String(i + 1).padStart(2)}  ${post.album}:${String(s.photo).padEnd(5)} ${(role ?? s.how ?? 'photo').padEnd(5)}${crop ? `  ${crop.portrait ? 'portrait' : `frame ${crop.x0}–${crop.x1}`}${crop.upscale > 1 ? `  UPSCALED ${crop.upscale}x` : ''}` : ''}${fit}  ${(statSync(join(out, name)).size / 1024).toFixed(0)} KB`)
    await pg.close()
  }
  console.log(`\n${post.id}  (${post.slides.length} pictures)\n` + report.join('\n'))
}
await browser.close()
if (bad) process.exit(1)
