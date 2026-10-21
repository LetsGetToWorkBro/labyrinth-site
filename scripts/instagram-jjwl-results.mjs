// The JJWL Houston results post, October 2026, redone October 21 and then made longer: ten pictures from the Lightroom album "JJWL Houston 10/17/2026 by Aivizuals"
// (https://lightroom.adobe.com/shares/bf71694e81744114b32282be1bd48681, 257 photos exported at 2048 px). One Instagram carousel, and the same ten pictures go to
// Facebook as one post. The result is the owner's (October 20, 2026): Team Labyrinth finished 1st overall in no-gi and 3rd in the gi at The Nationals South II.
//
//   assets/social/jjwl-results/jjwl-houston-01-no-gi-first.jpg ... jjwl-houston-10-gi-third.jpg      1080x1350 (4:5)
//
// What is on them (SLIDES, below): the first and the last carry the two results, a gold I over "No-Gi, First overall" and a gold III over "Gi, Third place"; the
// sixth is the team, under the kanji nameplate from our logo; the others are the day, each with three words at most that say what the photograph shows and
// nothing it does not (no names, no roles, no results, no medal counts). Every photograph has Labyrinth in it: the shirt, the hoodie, the gi, the patch, the
// nameplate on the chest. Chosen from all 257: only our own people, children only where they are ours and are smiling or at ease (one photograph of a child
// in tears was left out), nobody from another team in focus; bystanders in the background are darkened into the black. What is said with them, and the alt
// text, is in scripts/jjwl-results-captions.txt.
//
// Why it looks the way it does. The first version was a bold title over a plain photograph, which is what every results post looks like. This one is meant to
// read as a label, not a template: black, bone and gold only, the photographs as warm silver prints with gold and skin the only colours left
// (scripts/jjwl-results-grade.py), each laid on a black plate and dissolving into it. Above each plate stands one masthead on one baseline: a Roman numeral in
// gold foil or the kanji nameplate at the left, a short gold ledge under it, the words set flush right in small capitals. One ribbon of gold smoke runs behind
// every plate and across every seam, the thread of the labyrinth (the swipe is one 10,800 px picture, cut into slides), and the maze mark, without its lettering,
// is ghosted into the black behind each masthead. The foil, the ribbon and the stone are Higgsfield plates made from text prompts alone
// (scripts/jjwl-results-plates/PROMPTS.txt); no picture of a person is ever sent to a generator, and the photographs are graded here, not altered.
//
// The slides follow the October 2026 photo posts (scripts/instagram-photo-posts.mjs): everything that matters is in the middle 1080x1080 square, because
// Instagram's composer and some posting tools crop a carousel to a square (135px off the top and bottom of a 4:5 slide), and the words stay in the middle 810px
// (a square post's grid thumbnail is a 3:4 slice). This script checks the words against both.
//
// Run: python3 scripts/lightroom-album.py https://lightroom.adobe.com/shares/bf71694e81744114b32282be1bd48681 <folder>
//      node scripts/instagram-jjwl-results.mjs --album <folder> [--out <folder>] [--work <folder> [--reuse]]
// (needs playwright-core, resolved from node_modules here or from the CRM repo; and python3 with numpy, opencv-python-headless, scipy and pillow.
//  --work keeps the graded photographs and the whole-swipe panorama, which shows how the slides join, for looking at; --reuse skips grading what is already there)
import { createRequire } from 'node:module'
import { createServer } from 'node:http'
import { fileURLToPath } from 'node:url'
import { dirname, join, extname } from 'node:path'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const req = createRequire(import.meta.url)
let chromium
try { ({ chromium } = req('playwright-core')) } catch { ({ chromium } = req('/home/user/labyrinth-app/node_modules/playwright-core')) }

const args = process.argv.slice(2)
const opt = name => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : undefined }
const album = opt('album') ?? process.env.ALBUM_DIR
const out = opt('out') ?? process.env.OUT_DIR ?? join(root, 'assets', 'social', 'jjwl-results')
if (!album || !existsSync(album)) {
  console.error('usage: node scripts/instagram-jjwl-results.mjs --album <folder of the "JJWL Houston 10/17/2026 by Aivizuals" album>\n  (python3 scripts/lightroom-album.py https://lightroom.adobe.com/shares/bf71694e81744114b32282be1bd48681 <folder> downloads it)')
  process.exit(2)
}
const work = opt('work') ?? mkdtempSync(join(tmpdir(), 'jjwl-results-'))
const reuse = args.includes('--reuse')
mkdirSync(out, { recursive: true })
mkdirSync(join(work, 'brand'), { recursive: true })

// photograph numbers are the positions in the album (the first part of each downloaded file's name).
//   grade: the preset in scripts/jjwl-results-grade.py; tune: what this photograph says differently (cy: which part of the photograph the 4:5 window shows, spot: where the light falls)
//   glyph: a Roman numeral in foil, or the nameplate; words and small: the lines of the masthead; plate: how the photograph sits (s: its width as a share of the slide's,
//   top, fb: the fade at its foot, sl/sr: how dark its left and right edges go, extra: dark spots for whoever stands in the background)
const SLIDES = [
  { photo: 101, file: 'jjwl-houston-01-no-gi-first.jpg', grade: 'cover', glyph: { numeral: 'I', top: 177, fx: -120, fy: -80 }, words: ['No-Gi', 'First overall'], small: ['JJWL Houston', 'October 17'],
    plate: { s: .78, top: 300, sl: .3, sr: .5 } },
  { photo: 35, file: 'jjwl-houston-02-mat-edge.jpg', grade: 'hall', tune: { cy: .65, spot: [.52, .60, .50, .45, .05] }, words: ["At the mat's edge"],
    plate: { s: .78, sl: .5, sr: .5 } },
  { photo: 137, file: 'jjwl-houston-03-eyes-up.jpg', grade: 'arena', tune: { cy: .10, spot: [.52, .60, .55, .50, .05] }, words: ['Eyes up'],
    plate: { s: .78, sl: .35, sr: .4 } },
  { photo: 58, file: 'jjwl-houston-04-hoodie.jpg', grade: 'hall', tune: { cy: .45, spot: [.55, .52, .50, .45, .05] }, words: ['The hoodie'],
    plate: { s: .78, sl: .9, slw: '38%', sr: .5, extra: 'radial-gradient(ellipse 70px 120px at 665px 400px,rgba(6,5,4,.88),rgba(6,5,4,0) 100%)' } },
  { photo: 114, file: 'jjwl-houston-05-lights.jpg', grade: 'arena', tune: { cy: .15, spot: [.50, .58, .60, .55, .05] }, words: ['Under the lights'],
    plate: { s: .78, sl: .35, sr: .4 } },
  { photo: 96, file: 'jjwl-houston-06-team.jpg', grade: 'team', glyph: { plaque: true }, words: ['Team', 'Labyrinth'], small: ['JJWL Houston', 'October 17'],
    plate: { s: .76, sl: .78, slw: '34%', sr: .78, srw: '34%' } },
  { photo: 56, file: 'jjwl-houston-07-grin.jpg', grade: 'hall', tune: { cy: .45, spot: [.50, .50, .55, .50, .05] }, words: ['The grin'],
    plate: { s: .78, top: 310, sl: .5, sr: .5 } },
  { photo: 129, file: 'jjwl-houston-08-facing-the-mat.jpg', grade: 'arena', tune: { cy: .30, spot: [.55, .55, .60, .55, .05] }, words: ['Facing the mat'],
    plate: { s: .78, sl: .35, sr: .4 } },
  { photo: 72, file: 'jjwl-houston-09-trophy.jpg', grade: 'hall', tune: { cy: .50, spot: [.50, .55, .55, .50, .05] }, words: ['The trophy'],
    plate: { s: .78, top: 300, sl: .7, slw: '34%', sr: .7, srw: '34%',
      extra: 'radial-gradient(ellipse 120px 100px at 95px 400px,rgba(6,5,4,.92),rgba(6,5,4,0) 100%),radial-gradient(ellipse 95px 220px at 700px 470px,rgba(6,5,4,.93),rgba(6,5,4,0) 100%)' } },
  { photo: 78, file: 'jjwl-houston-10-gi-third.jpg', grade: 'trophy', glyph: { numeral: 'III', top: 176, fx: -600, fy: -300 }, words: ['Gi', 'Third place'], small: ['迷宮を征服せよ'], japanese: true,
    plate: { s: .72, top: 277, fb: 56, sl: .94, slw: '52%', sr: .9, srw: '44%',
      extra: 'radial-gradient(ellipse 171px 135px at 229px 73px,rgba(6,5,4,.95),rgba(6,5,4,.8) 55%,rgba(6,5,4,0) 100%),radial-gradient(ellipse 108px 99px at 657px 263px,rgba(6,5,4,.8),rgba(6,5,4,0) 100%)' } },
]
const W = 1080, H = 1350
const SAFE = { x0: 135, x1: W - 135, y0: (H - W) / 2, y1: H - (H - W) / 2 }     // the words stay in the middle 810px; everything that matters, in the middle square
const N = SLIDES.length

// the thread: Higgsfield's ribbon plate (2688x1520; the smoke enters at the top edge about x=580 and leaves at the bottom right about (2380, 1500)) is laid, turned flat,
// in pieces of about 3,000 px, each one flipped over the one before, each starting where the last one thins out
const RIBBON = { start: [580, 0], end: [2380, 1500] }
function ribbonPieces(length) {
  const out = []
  let start = [34, 256]
  for (let i = 0; start[0] < length; i++) {
    const flip = i % 2 === 1, k = [1.3, 1.15, 1.45, 1.25][i % 4], deg = flip ? 38 : -38
    const th = deg * Math.PI / 180, c = Math.cos(th), s = Math.sin(th)
    const at = p => { const x = k * p[0], y = (flip ? -k : k) * p[1]; return [x * c - y * s, x * s + y * c] }
    const a = at(RIBBON.start), b = at(RIBBON.end)
    const tx = start[0] - a[0], ty = start[1] - a[1]
    out.push(`translate(${tx.toFixed(0)}px,${ty.toFixed(0)}px) rotate(${deg}deg) scale(${k},${flip ? -k : k})`)
    start = [tx + b[0] - 220, ty + b[1]]
  }
  return out
}

const esc = t => t.replace(/&/g, '&amp;').replace(/</g, '&lt;')
const lines = a => a.map(esc).join('<br>')
function pageHtml() {
  const plate = (s, i) => {
    const p = { s: .78, top: 270, fb: 90, sl: .4, slw: '30%', sr: .5, srw: '30%', ...s.plate }
    const vars = `--s:${p.s};top:${p.top}px;--fb:${p.fb}px;--sl:${p.sl};--slw:${p.slw};--sr:${p.sr};--srw:${p.srw}` + (p.extra ? `;--extra:${p.extra}` : '')
    return `<div class="at" style="left:${i * W}px"><div class="plate" style="${vars}"><img src="/work/photo-${s.photo}.png" alt=""></div></div>`
  }
  const glyphCentre = s => s.glyph?.numeral === 'I' ? 198 : s.glyph?.numeral === 'III' ? 320 : 210
  const mast = (s, i) => {
    const g = s.glyph
    const glyph = !g ? '' : g.plaque
      ? '<div class="abs lit" style="left:135px;top:166px"><div class="plaque"></div></div>'
      : `<div class="abs lit" style="left:119px;top:${g.top}px"><div class="num foil" style="--fx:${g.fx}px;--fy:${g.fy}px">${g.numeral}</div></div>`
    const small = s.small ? `<i class="s"></i><div class="b${s.japanese ? ' j' : ''}">${lines(s.small)}</div>` : ''
    return `<div class="at" style="left:${i * W}px">${glyph}<div class="ledge"></div><div class="tb"><div class="a">${lines(s.words)}</div>${small}</div></div>`
  }
  const rings = SLIDES.map((s, i) => `<i class="maze" style="--x:${i * W + glyphCentre(s) - 450}px;--y:-153px"></i>`).join('')
  const tiles = Array.from({ length: Math.ceil(N * W / 3240) }, (_, k) => `<div class="tile" style="left:${k * 3240}px;transform:${k % 2 ? 'scaleX(-1)' : 'none'}"></div>`).join('')
  const ribbons = ribbonPieces(N * W).map(t => `<img class="ribbon" src="/scripts/jjwl-results-plates/ribbon.jpg" width="2688" height="1520" alt="" style="opacity:.9;transform:${t}">`).join('')
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>JJWL Houston results: the whole swipe as one picture</title>
<link rel="stylesheet" href="/scripts/jjwl-results-slides.css"></head><body>
<div id="pano" style="width:${N * W}px">
  <div class="layer ground">${tiles}</div>
  <div class="layer" style="pointer-events:none">${rings}</div>
  <div class="layer thread" style="pointer-events:none;--end1:${(N - 1) * W + 130}px;--end2:${(N - 1) * W + 320}px">${ribbons}</div>
  <div class="layer">${SLIDES.map(plate).join('')}</div>
  <div class="layer">${SLIDES.map(mast).join('')}</div>
</div></body></html>`
}

const py = (...a) => execFileSync(process.env.PYTHON ?? 'python3', [join(here, 'jjwl-results-grade.py'), ...a], { stdio: 'inherit' })
const files = readdirSync(album)
const fileFor = n => {
  const hit = files.find(f => new RegExp('^0*' + n + '-.*\\.jpe?g$', 'i').test(f))
  if (!hit) throw new Error(`photograph ${n} is not in ${album}`)
  return join(album, hit)
}

py('masks', join(work, 'brand'))
for (const s of SLIDES) {
  const graded = join(work, `photo-${s.photo}.png`)
  if (!(reuse && existsSync(graded))) py('photo', fileFor(s.photo), graded, s.grade, ...(s.tune ? [JSON.stringify(s.tune)] : []))
}

// the page is served, not opened from disk: it names its fonts, plates and masks by absolute path (the repository root; /work is the folder above)
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' }
const server = createServer((rq, rs) => {
  const p = decodeURIComponent(rq.url.split('?')[0])
  if (p === '/slides.html') { rs.setHeader('content-type', 'text/html'); rs.end(pageHtml()); return }
  const f = p.startsWith('/work/') ? join(work, p.slice(6)) : join(root, p)
  if (!f.startsWith(p.startsWith('/work/') ? work : root) || f.includes('..') || !existsSync(f)) { rs.statusCode = 404; rs.end('404'); return }
  rs.setHeader('content-type', TYPES[extname(f)] ?? 'application/octet-stream')
  rs.end(readFileSync(f))
})
await new Promise(r => server.listen(0, '127.0.0.1', r))

const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/opt/pw-browsers/chromium', args: ['--no-proxy-server'] })
const pg = await browser.newPage({ viewport: { width: N * W, height: H }, deviceScaleFactor: 1 })
await pg.goto(`http://127.0.0.1:${server.address().port}/slides.html`, { waitUntil: 'load' })
await pg.evaluate(() => document.fonts.ready)
await pg.waitForFunction(() => [...document.images].every(i => i.complete && i.naturalWidth > 0))
await pg.waitForTimeout(400)

// the words must fit the safe area on every slide, and every font they use must have loaded
const boxes = await pg.evaluate(() => [...document.querySelectorAll('.layer:last-child .at')].map((at, i) => {
  const left = at.getBoundingClientRect().left
  return [...at.querySelectorAll('.tb, .plaque, .ledge')].map(el => { const r = el.getBoundingClientRect(); return { slide: i + 1, el: el.className, x0: r.left - left, x1: r.right - left, y0: r.top, y1: r.bottom } })
}).flat())
const outside = boxes.filter(b => b.x0 < SAFE.x0 - 0.5 || b.x1 > SAFE.x1 + 0.5 || b.y0 < SAFE.y0 || b.y1 > SAFE.y1)
const fonts = await pg.evaluate(() => ['600 100px Corm', '400 20px Jost', '500 20px Jost', '500 20px "Noto Sans JP"'].map(f => [f, document.fonts.check(f, f.includes('Noto') ? '迷宮を征服せよ' : 'Ag')]))
const missing = fonts.filter(([, ok]) => !ok)
if (outside.length || missing.length) {
  console.error('not safe:', JSON.stringify(outside), 'fonts that did not load:', JSON.stringify(missing))
  await browser.close(); server.close(); process.exit(1)
}

await pg.screenshot({ path: join(work, 'panorama.png'), clip: { x: 0, y: 0, width: N * W, height: H } })
for (const [i, s] of SLIDES.entries()) {
  const png = join(work, `slide-${i + 1}.png`)
  await pg.screenshot({ path: png, clip: { x: i * W, y: 0, width: W, height: H } })
  py('finish', png, join(out, s.file))
  console.log('wrote', join(out, s.file))
}
await browser.close()
server.close()
console.log('work folder (graded photographs, panorama):', work)
