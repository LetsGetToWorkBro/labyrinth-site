// The JJWL Houston results post, October 2026, redone October 21: three pictures from the Lightroom album "JJWL Houston 10/17/2026 by Aivizuals"
// (https://lightroom.adobe.com/shares/bf71694e81744114b32282be1bd48681, 257 photos exported at 2048 px). One Instagram carousel, and the same three pictures
// go to Facebook as one post. The result is the owner's (October 20, 2026): Team Labyrinth finished 1st overall in no-gi and 3rd in the gi at The Nationals South II.
//
//   assets/social/jjwl-results/jjwl-results-1-no-gi-first.jpg   photograph 101 (a person in the Labyrinth rash guard, seen from behind, under the arena lamps), a gold I, "No-Gi, First overall"
//   assets/social/jjwl-results/jjwl-results-2-team.jpg          photograph 96 (the children with their medals, two adults behind them), the kanji nameplate, "Team Labyrinth"
//   assets/social/jjwl-results/jjwl-results-3-gi-third.jpg      photograph 78 (a child holding the 3RD PLACE, GI, YOUTH ACADEMY trophy), a gold III, "Gi, Third place", the team's motto
//   all 1080x1350 (4:5). What is said with them, and the alt text, is in scripts/jjwl-results-captions.txt.
//
// Why it looks the way it does. The first version was a bold title over a plain photograph, which is what every results post looks like. This one is meant to
// read as a label, not a template: black, bone and gold only, the photographs as warm silver prints with gold and skin the only colours left
// (scripts/jjwl-results-grade.py), each laid on a black plate and dissolving into it. Above each plate stands one masthead on one baseline: a Roman numeral in
// gold foil (I, III) or the kanji nameplate from our logo, a short gold ledge under it, and the words set flush right in small capitals. One ribbon of gold smoke
// runs behind all three plates and across the seams, the thread of the labyrinth, and the maze mark, without its lettering, is ghosted into the black behind
// each masthead. The foil, the ribbon and the stone are Higgsfield plates made from text prompts alone (scripts/jjwl-results-plates/PROMPTS.txt); no picture of
// a person is ever sent to a generator, and the photographs are graded here, not altered.
//
// The slides follow the October 2026 photo posts (scripts/instagram-photo-posts.mjs): everything that matters is in the middle 1080x1080 square, because
// Instagram's composer and some posting tools crop a carousel to a square (135px off the top and bottom of a 4:5 slide), and the words stay in the middle 810px
// (a square post's grid thumbnail is a 3:4 slice). This script checks the words against both.
//
// Run: python3 scripts/lightroom-album.py https://lightroom.adobe.com/shares/bf71694e81744114b32282be1bd48681 <folder>
//      node scripts/instagram-jjwl-results.mjs --album <folder> [--out <folder>] [--work <folder>]
// (needs playwright-core, resolved from node_modules here or from the CRM repo; and python3 with numpy, opencv-python-headless, scipy and pillow.
//  --work keeps the graded photographs and the 3240x1350 panorama, which shows how the three slides join, for looking at)
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
mkdirSync(out, { recursive: true })
mkdirSync(join(work, 'brand'), { recursive: true })

// photograph numbers are the positions in the album (the first part of each downloaded file's name)
const SLIDES = [
  { photo: 101, grade: 'cover', file: 'jjwl-results-1-no-gi-first.jpg' },
  { photo: 96, grade: 'team', file: 'jjwl-results-2-team.jpg' },
  { photo: 78, grade: 'trophy', file: 'jjwl-results-3-gi-third.jpg' },
]
const W = 1080, H = 1350
const SAFE = { x0: 135, x1: W - 135, y0: (H - W) / 2, y1: H - (H - W) / 2 }     // the words stay in the middle 810px; everything that matters, in the middle square

const py = (...a) => execFileSync(process.env.PYTHON ?? 'python3', [join(here, 'jjwl-results-grade.py'), ...a], { stdio: 'inherit' })
const files = readdirSync(album)
const fileFor = n => {
  const hit = files.find(f => new RegExp('^0*' + n + '-.*\\.jpe?g$', 'i').test(f))
  if (!hit) throw new Error(`photograph ${n} is not in ${album}`)
  return join(album, hit)
}

py('masks', join(work, 'brand'))
for (const s of SLIDES) py('photo', fileFor(s.photo), join(work, s.grade + '.png'), s.grade)

// the page is served, not opened from disk: it names its fonts, plates and masks by absolute path (the repository root; /work is the folder above)
const TYPES = { '.html': 'text/html', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' }
const server = createServer((rq, rs) => {
  const p = decodeURIComponent(rq.url.split('?')[0])
  const f = p.startsWith('/work/') ? join(work, p.slice(6)) : join(root, p)
  if (!f.startsWith(p.startsWith('/work/') ? work : root) || f.includes('..') || !existsSync(f)) { rs.statusCode = 404; rs.end('404'); return }
  rs.setHeader('content-type', TYPES[extname(f)] ?? 'application/octet-stream')
  rs.end(readFileSync(f))
})
await new Promise(r => server.listen(0, '127.0.0.1', r))

const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/opt/pw-browsers/chromium', args: ['--no-proxy-server'] })
const pg = await browser.newPage({ viewport: { width: 3 * W, height: H }, deviceScaleFactor: 1 })
await pg.goto(`http://127.0.0.1:${server.address().port}/scripts/jjwl-results-slides.html`, { waitUntil: 'load' })
await pg.evaluate(() => document.fonts.ready)
await pg.waitForFunction(() => [...document.images].every(i => i.complete && i.naturalWidth > 0))
await pg.waitForTimeout(400)

// the words must fit the safe area on every slide, and every font they use must have loaded
const boxes = await pg.evaluate(() => [...document.querySelectorAll('.at')].map((at, i) => {
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

await pg.screenshot({ path: join(work, 'panorama.png'), clip: { x: 0, y: 0, width: 3 * W, height: H } })
for (const [i, s] of SLIDES.entries()) {
  const png = join(work, `slide-${i + 1}.png`)
  await pg.screenshot({ path: png, clip: { x: i * W, y: 0, width: W, height: H } })
  py('finish', png, join(out, s.file))
  console.log('wrote', join(out, s.file))
}
await browser.close()
server.close()
console.log('work folder (graded photographs, panorama):', work)
