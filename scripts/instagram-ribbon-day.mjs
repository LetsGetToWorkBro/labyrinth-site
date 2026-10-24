// The Saturday morning reminder post, October 24, 2026: "Rolling for Ribbons is today at 11, and the regular Saturday classes are off." One Instagram carousel of two
// pictures (the same two go to Facebook as one post) and one story.
//
//   assets/social/ribbon-day/ribbon-day-01.jpg       1080x1350 (4:5)   the cover: a big 11 AM in rose foil, "Today", the two women rolling, "No regular classes today"
//   assets/social/ribbon-day/ribbon-day-02.jpg       1080x1350 (4:5)   the whole day: 9 workout, 10 open mat, 11 Rolling for Ribbons, what is off, how to RSVP
//   assets/social/ribbon-day/ribbon-day-story.jpg    1080x1920 (9:16)  all of it in one picture, with the words between y 250 and y 1580 (the app covers the rest of a story)
//
// The facts are the seminar page's (labyrinth.vision/self-defense-for-women: Saturday, October 24, 11:00 AM to 12:30 PM, free, no experience needed) and the owner's plan
// for the day (scripts/schedule_data.py: SPECIAL_DAYS): a workout 9:00 to 10:00, an open mat 10:00 to about 10:45, the seminar 11:00 to 12:30, the regular Saturday classes
// off. What is said with the pictures, and the alt text, is in scripts/ribbon-day-captions.txt.
//
// Why it looks the way it does. The Saturday post of October 20 (scripts/instagram-saturday-seminar.mjs) is a bold title over a photograph and a list on plum, which is what
// every event post looks like. This one is made like the JJWL results post (scripts/instagram-jjwl-results.mjs), in the seminar's own colours: plum-black stone, bone
// and rose; the hour is the picture (a big 11 cut from rose foil, the numerals of the day's three parts likewise), the photograph is graded to a plum-and-bone print and melts
// into the dark, and one satin ribbon, the event's own symbol, runs behind both slides and across the seam between them, the way the gold smoke did. The maze mark,
// without its lettering, is ghosted into the dark. The foil, the ribbon and the stone are Higgsfield plates made from text prompts alone
// (scripts/ribbon-day-plates/PROMPTS.txt); no picture of a person is ever sent to a generator, and the photograph is graded here (scripts/ribbon-day-grade.py), not altered.
//
// The slides follow the October 2026 photo posts (scripts/instagram-photo-posts.mjs): everything that matters is in the middle 1080x1080 square (Instagram's composer and
// some posting tools crop a carousel to a square, 135px off the top and bottom of a 4:5 slide), and the words stay in the middle 810px (a square post's grid thumbnail is a
// 3:4 slice). This script checks the words against both, and against the story's safe area, and fails if one is outside.
//
// Run: node scripts/instagram-ribbon-day.mjs [--out <folder>] [--work <folder>] [--album <folder>]
//   (needs playwright-core, resolved from node_modules here or from the CRM repo; and python3 with numpy, opencv-python-headless, scipy and pillow.
//    --album: the folder of Ray Harkness's album "Labyrinth_RFH" (photograph 18, "Labyrinth_RFH-19.jpg"): grade the photograph again from it instead of using the
//    graded copy in scripts/ribbon-day-plates/women-18.jpg. --work keeps the graded photograph, the masks and the PNGs the JPEGs are made from, for looking at)
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
const out = opt('out') ?? process.env.OUT_DIR ?? join(root, 'assets', 'social', 'ribbon-day')
const album = opt('album') ?? process.env.ALBUM_DIR
const work = opt('work') ?? mkdtempSync(join(tmpdir(), 'ribbon-day-'))
mkdirSync(out, { recursive: true })
mkdirSync(join(work, 'brand'), { recursive: true })

const W = 1080
const SLIDES = [{ file: 'ribbon-day-01.jpg', x: 0 }, { file: 'ribbon-day-02.jpg', x: W }]
const FEED = { w: 2 * W, h: 1350, safe: { x0: 135, x1: W - 135, y0: 135, y1: 1350 - 135 } }          // the middle 810px, and the middle square
const STORY = { w: W, h: 1920, safe: { x0: 135, x1: W - 135, y0: 250, y1: 1580 } }                  // the app covers the top 250px and the bottom 340px of a story

const py = (script, ...a) => execFileSync(process.env.PYTHON ?? 'python3', [join(here, script), ...a], { stdio: 'inherit' })
py('jjwl-results-grade.py', 'masks', join(work, 'brand'))
let photoOverride
if (album) {
  const hit = readdirSync(album).find(f => /^0*18-.*\.jpe?g$/i.test(f))
  if (!hit) throw new Error(`photograph 18 is not in ${album}`)
  photoOverride = join(work, 'women-18.png')
  py('ribbon-day-grade.py', 'photo', join(album, hit), photoOverride)
}

// the pages name their fonts, plates and masks by absolute path (the repository root; /work is the folder above)
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' }
const server = createServer((rq, rs) => {
  const p = decodeURIComponent(rq.url.split('?')[0])
  let dir = root, f
  if (photoOverride && p === '/scripts/ribbon-day-plates/women-18.jpg') { dir = work; f = photoOverride }
  else if (p.startsWith('/work/')) { dir = work; f = join(work, p.slice(6)) }
  else f = join(root, p)
  if (!f.startsWith(dir) || f.includes('..') || !existsSync(f)) { rs.statusCode = 404; rs.end('404'); return }
  rs.setHeader('content-type', TYPES[extname(f)] ?? 'application/octet-stream')
  rs.end(readFileSync(f))
})
await new Promise(r => server.listen(0, '127.0.0.1', r))
const base = `http://127.0.0.1:${server.address().port}`

const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/opt/pw-browsers/chromium', args: ['--no-proxy-server'] })
let failed = false

// loads a page, checks that its fonts and pictures are there, that its words are inside the safe area, and that no dash got into the words
async function open(pagePath, spec) {
  const pg = await browser.newPage({ viewport: { width: spec.w, height: spec.h }, deviceScaleFactor: 1 })
  await pg.goto(`${base}${pagePath}`, { waitUntil: 'load' })
  await pg.evaluate(() => document.fonts.ready)
  await pg.waitForFunction(() => [...document.images].every(i => i.complete && i.naturalWidth > 0))
  await pg.waitForTimeout(400)
  const report = await pg.evaluate(safe => {
    const fonts = ['400 100px DMS', '500 20px Jost'].map(f => [f, document.fonts.check(f, 'Ag0')])
    const rects = el => {                                                               // one box per line of words, not the boxes of the blocks round them
      const out = [], walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
      for (let n = walk.nextNode(); n; n = walk.nextNode()) {
        if (!n.textContent.trim()) continue
        const r = document.createRange(); r.selectNodeContents(n)
        out.push(...[...r.getClientRects()].filter(c => c.width > 0.5 && c.height > 0.5))
      }
      return out
    }
    const boxes = []
    for (const el of document.querySelectorAll('[data-safe]')) {
      const at = el.closest('.at'), dx = at ? at.getBoundingClientRect().left : 0
      for (const c of rects(el)) boxes.push({ el: el.className, text: el.textContent.trim().slice(0, 30), x0: c.left - dx, x1: c.right - dx, y0: c.top, y1: c.bottom })
    }
    for (const el of document.querySelectorAll('[data-num]')) {                      // the numerals' boxes have side bearings and a tall line box: only their sides are checked
      const at = el.closest('.at'), dx = at ? at.getBoundingClientRect().left : 0
      for (const n of el.querySelectorAll('.num')) { const c = n.getBoundingClientRect(); boxes.push({ el: 'num ' + n.textContent, text: n.textContent, x0: c.left - dx + 12, x1: c.right - dx - 12, y0: safe.y0, y1: safe.y1 }) }
    }
    const outside = boxes.filter(b => b.x0 < safe.x0 - 0.5 || b.x1 > safe.x1 + 0.5 || b.y0 < safe.y0 - 0.5 || b.y1 > safe.y1 + 0.5)
    const dashes = /[‒–—―]/.test(document.body.innerText)
    return { fonts, outside, dashes, count: boxes.length }
  }, spec.safe)
  const missing = report.fonts.filter(([, ok]) => !ok)
  if (missing.length || report.outside.length || report.dashes || report.count < 5) {
    console.error(pagePath, 'not right:', JSON.stringify({ missing, outside: report.outside, dashes: report.dashes, boxes: report.count }))
    failed = true
  }
  return pg
}

const feed = await open('/scripts/instagram-ribbon-day-feed.html', FEED)
const story = await open('/scripts/instagram-ribbon-day-story.html', STORY)
if (failed) { await browser.close(); server.close(); process.exit(1) }

for (const s of SLIDES) {
  const png = join(work, s.file.replace('.jpg', '.png'))
  await feed.screenshot({ path: png, clip: { x: s.x, y: 0, width: W, height: FEED.h } })
  py('ribbon-day-grade.py', 'finish', png, join(out, s.file))
  console.log('wrote', join(out, s.file))
}
const spng = join(work, 'ribbon-day-story.png')
await story.screenshot({ path: spng, clip: { x: 0, y: 0, width: W, height: STORY.h } })
py('ribbon-day-grade.py', 'finish', spng, join(out, 'ribbon-day-story.jpg'))
console.log('wrote', join(out, 'ribbon-day-story.jpg'))
await browser.close()
server.close()
console.log('work folder (graded photograph, masks, PNGs):', work)
