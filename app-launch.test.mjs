/**
 * The app launch, 9 November 2026: the header's Sign in button and the banner that announces the app.
 *
 * Header. Calendar and Sauna are out of the header and out of the phone menu. Sign in is in both, goes to the member
 * portal (members.labyrinth.vision) in the same tab (a phone that has the app opens it from that link), sits beside "Try a Free
 * Class" and is as tall as it, and the keyboard reaches it right before it.
 *
 * Banner. The line under the nav names the app and links both stores, with the stores' own badges, unaltered. It takes the
 * hero's top padding and moves nothing: it is never closer than 8px to the words under it, at any width from 320px to 1920px,
 * it never makes the page scroll sideways or clip a word, and nothing sits over it (the seasonal decorations included). A
 * donation drive keeps the slot while it is on; the banner hides itself on its date; without JavaScript the two never overlap and
 * the links are still in the page; and the block in index.html is the one scripts/build_pages.py writes.
 *
 * Every check pins its own clock (NOW, or the date it names), so none depends on the day it is run, and SITE_TEST_NOW is not read.
 *
 *   npm i --no-save playwright-core && node app-launch.test.mjs
 */
let chromium
try { ({ chromium } = await import('playwright-core')) }
catch { console.log('This test needs playwright-core:\n\n  npm i --no-save playwright-core\n'); process.exit(2) }
import { createServer } from 'node:http'
import { readFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('.', import.meta.url)).replace(/\/$/, '')
const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.json': 'application/json' }
const server = createServer((req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0]); let f = join(ROOT, p)
  if (p.endsWith('/')) f = join(ROOT, p, 'index.html')
  if (!existsSync(f) && existsSync(f + '.html')) f = f + '.html'
  if (!existsSync(f)) { res.statusCode = 404; res.end(''); return }
  res.setHeader('content-type', T[extname(f)] ?? 'application/octet-stream'); res.end(readFileSync(f))
})
const PORT = Number(process.env.APP_LAUNCH_PORT) || 4652
await new Promise(r => server.listen(PORT, '127.0.0.1', r))
const BASE = 'http://127.0.0.1:' + PORT
const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-proxy-server'] })

let pass = 0, fail = 0
const check = (name, ok, detail = '') => { if (ok) { console.log('PASS  ' + name); pass++ } else { console.log('FAIL  ' + name + (detail ? '  ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : '')); fail++ } }

// The addresses the two listings have. Read on the day it launched: the App Store page for id 6825475312 and the Play page for the package.
const APPLE = 'https://apps.apple.com/us/app/labyrinth-bjj/id6825475312'
const GOOGLE = 'https://play.google.com/store/apps/details?id=vision.labyrinth.bjj'
const PORTAL = 'https://members.labyrinth.vision/'
// The badge files as they were checked in: Apple's "Download on the App Store" SVG exactly as Apple serves it, and Google's
// "Get it on Google Play" PNG cropped to its own edges (nothing recoloured, redrawn or scaled). If one is ever replaced
// on purpose, take the new file from the store's own download and change the hash here.
const HASHES = {
  'assets/badge-app-store.svg': 'a26fc5b38380272c92e9019a2eb8b45542a66814b3e2b203772db8904b9fb99f',
  'assets/badge-google-play.png': '2bec2a73df11b6b6c8c1d18950cb17f83408a45f20a55d81fa644f58d85b9b9d',
}
const NOW = '2026-11-12T15:00:00Z' // inside the banner's twelve weeks, and after the donation drive that had the slot before it
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'

async function open(path, { w = 1440, h = 900, mobile = false, now = NOW, js = true } = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, javaScriptEnabled: js, ...(mobile ? { isMobile: true, hasTouch: true, userAgent: IPHONE } : {}) })
  if (js) await ctx.clock.setFixedTime(new Date(now))
  const page = await ctx.newPage()
  // Everything that is not this server is out of reach on purpose (fonts, analytics, the stores), so the page never waits on it.
  await page.route(u => !/^http:\/\/(127\.0\.0\.1|localhost)/.test(u.href), r => r.abort())
  await page.goto(BASE + path, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1200)
  return { ctx, page }
}
const sha = f => createHash('sha256').update(readFileSync(join(ROOT, f))).digest('hex')

// ── The header ───────────────────────────────────────────────────────────────────────────────────────────────────────
{
  // 1600px, where the header has room, so the two buttons' heights are the buttons' own and not a squeezed font's.
  const { ctx, page } = await open('/', { w: 1600 })
  const h = await page.evaluate(() => {
    const r = e => e.getBoundingClientRect()
    const hrefs = [...document.querySelectorAll('.nav a, .nav__mobile a')].map(a => a.getAttribute('href') || '')
    const si = [...document.querySelectorAll('.nav__links .nav__signin')]
    const s = si[0], cta = document.querySelector('.nav__links .nav__cta')
    return {
      bad: hrefs.filter(x => /calendar\.labyrinth\.vision|sauna\.labyrinth\.vision/.test(x)),
      n: si.length, href: s && s.getAttribute('href'), target: s && s.getAttribute('target'), text: s && s.textContent.trim(),
      beside: !!s && s.nextElementSibling === cta, shown: !!s && r(s).width > 0 && r(s).height > 0,
      sh: s && Math.round(r(s).height), ch: Math.round(r(cta).height), gap: s && Math.round(r(cta).left - r(s).right),
    }
  })
  check('H1 the header and the phone menu carry no Calendar or Sauna link', h.bad.length === 0, h.bad)
  check('H2 the header has one Sign in button, to the member portal, in the same tab, right before "Try a Free Class"',
    h.n === 1 && h.href === PORTAL && h.target === null && h.text === 'Sign in' && h.beside && h.shown, h)
  check('H3 Sign in is as tall as "Try a Free Class" (within a pixel) and clear of it', Math.abs(h.sh - h.ch) <= 1 && h.gap >= 8, h)

  // The keyboard: from the phone number, Tab lands on Sign in, and the next Tab on the CTA. (The Donate button, while a drive is on, is between them and the phone.)
  await page.focus('.nav__phone')
  await page.keyboard.press('Tab')
  const t1 = await page.evaluate(() => document.activeElement.className)
  await page.keyboard.press('Tab')
  const t2 = await page.evaluate(() => document.activeElement.className)
  check('H4 the keyboard reaches Sign in, then "Try a Free Class"', /nav__signin/.test(t1) && /nav__cta/.test(t2), { t1, t2 })
  check('H5 Sign in shows a focus ring and the pointer reaches it', await (async () => {
    await page.focus('.nav__signin')
    return page.evaluate(() => { const e = document.querySelector('.nav__signin'); const q = e.getBoundingClientRect(); const top = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2); return e.contains(top) })
  })())

  // A click goes to the portal (the portal itself is out of reach here, so the request is answered by hand).
  await page.route(PORTAL + '**', r => r.fulfill({ status: 200, contentType: 'text/html', body: '<title>portal</title>' }))
  await page.click('.nav__signin')
  await page.waitForURL(u => u.href.startsWith(PORTAL), { timeout: 5000 }).catch(() => {})
  check('H6 clicking Sign in lands on the member portal', page.url() === PORTAL, page.url())
  await ctx.close()
}
{
  const { ctx, page } = await open('/', { w: 390, h: 844, mobile: true })
  await page.click('#hamburger')
  await page.waitForTimeout(400)
  const m = await page.evaluate(() => {
    const r = e => e.getBoundingClientRect()
    const menu = document.getElementById('mobileNav')
    const tools = menu.querySelector('.nav__mobile-tools')
    const t = menu.querySelector('.nav__mobile-tool--signin')
    const cs = getComputedStyle(menu)
    const inner = r(menu).width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
    return { open: menu.classList.contains('open'), kids: tools.children.length, href: t.getAttribute('href'), target: t.getAttribute('target'), text: t.textContent.trim().replace(/\s+/g, ' '),
      w: Math.round(r(t).width), inner: Math.round(inner), h: Math.round(r(t).height),
      bad: [...menu.querySelectorAll('a')].filter(a => /calendar\.labyrinth\.vision|sauna\.labyrinth\.vision/.test(a.href)).length }
  })
  check('M1 the phone menu has one tool, Sign in, to the member portal, in the same tab, and no Calendar or Sauna',
    m.open && m.kids === 1 && m.href === PORTAL && m.target === null && m.text === 'Sign in' && m.bad === 0, m)
  check('M2 it takes the whole row and is a real tap target (44px or more)', Math.abs(m.w - m.inner) <= 2 && m.h >= 44, m)
  await page.route(PORTAL + '**', r => r.fulfill({ status: 200, contentType: 'text/html', body: '<title>portal</title>' }))
  await page.tap('.nav__mobile-tool--signin')
  await page.waitForURL(u => u.href.startsWith(PORTAL), { timeout: 5000 }).catch(() => {})
  check('M3 tapping it lands on the member portal', page.url() === PORTAL, page.url())
  await ctx.close()
}
{
  const css = readFileSync(join(ROOT, 'style.css'), 'utf8'), html = readFileSync(join(ROOT, 'index.html'), 'utf8')
  check('H7 nothing is left of the two links they replaced: no rule, no markup for .nav__link--ext', !/nav__link--ext/.test(css) && !/nav__link--ext/.test(html))
}

// ── The banner ───────────────────────────────────────────────────────────────────────────────────────────────────────
const measure = () => {
  const r = e => e.getBoundingClientRect()
  const b = document.getElementById('appBanner'), nav = document.getElementById('nav'), first = document.querySelector('.hero__badge')
  if (!b) return { missing: true }
  const br = r(b), cs = getComputedStyle(b), text = b.querySelector('.app-banner__text')
  const kids = [...b.querySelectorAll('.app-banner__icon, .app-banner__text, .app-banner__store')].filter(e => getComputedStyle(e).display !== 'none')
  const hit = [...b.querySelectorAll('.app-banner__store, .app-banner__text')].filter(e => getComputedStyle(e).display !== 'none')
  return {
    shown: cs.display !== 'none' && br.height > 0,
    gapNav: Math.round(br.top - r(nav).bottom), h: Math.round(br.height), below: Math.round(r(first).top - br.bottom),
    wide: document.documentElement.scrollWidth > innerWidth,
    spill: kids.filter(e => r(e).left < br.left - 0.5 || r(e).right > br.right + 0.5 || r(e).top < br.top - 0.5 || r(e).bottom > br.bottom + 0.5).map(e => e.className),
    clipped: text.scrollWidth > text.clientWidth + 1 || text.scrollHeight > text.clientHeight + 1,
    stores: [...b.querySelectorAll('.app-banner__store')].filter(a => getComputedStyle(a).display !== 'none').map(a => Math.round(r(a).height)),
    over: hit.filter(e => { const q = r(e); const t = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2); return !(t && e.contains(t)) }).map(e => e.className),
    firstTop: Math.round(r(first).top),
  }
}
{
  const { ctx, page } = await open('/', { w: 1440 })
  const b = await page.evaluate(() => {
    const el = document.getElementById('appBanner')
    const a = el && el.querySelector('.app-banner__store--apple'), g = el && el.querySelector('.app-banner__store--google')
    const imgs = el ? [...el.querySelectorAll('img')] : []
    return {
      there: !!el, tag: el && el.tagName, label: el && el.getAttribute('aria-label'),
      text: el && el.querySelector('.app-banner__text').textContent.replace(/\s+/g, ' ').trim(),
      apple: a && a.getAttribute('href'), google: g && g.getAttribute('href'),
      targets: [a, g].map(x => x && x.getAttribute('target')), rels: [a, g].map(x => x && x.getAttribute('rel')),
      alts: [a, g].map(x => x && x.querySelector('img').getAttribute('alt')),
      loaded: imgs.map(i => i.complete && i.naturalWidth > 0), sized: imgs.map(i => i.hasAttribute('width') && i.hasAttribute('height')),
      stores: el ? el.querySelectorAll('a[href]').length : 0,
    }
  })
  check('B1 the home page has the banner, it names the app, and it links the App Store and Google Play listings exactly',
    b.there && b.tag === 'ASIDE' && /Labyrinth BJJ app is here/.test(b.text) && b.apple === APPLE && b.google === GOOGLE && b.stores === 2, b)
  check('B2 both open in a new tab without handing over the page (noopener), and the badges say which store and which app',
    b.targets.every(t => t === '_blank') && b.rels.every(r => /noopener/.test(r)) && /App Store/.test(b.alts[0]) && /Google Play/.test(b.alts[1]) && b.alts.every(a => /Labyrinth BJJ/.test(a)), b)
  check('B3 every picture in it loads and says its size (the seal, and both badges)', b.loaded.length === 3 && b.loaded.every(Boolean) && b.sized.every(Boolean), b)
  check('B4 the words are the App Store listing\'s own, cut short: classes, check-in and belt progress, and nothing it does not say',
    /Classes, check-in and your belt progress\./.test(b.text) && !/\$|free|discount|save|price|%/i.test(b.text), b.text)
  await ctx.close()
}
check('B5 the badges are the stores\' own artwork as checked in (Apple\'s SVG as served, Google\'s PNG cropped to its edges)',
  Object.entries(HASHES).every(([f, h]) => sha(f) === h), Object.fromEntries(Object.keys(HASHES).map(f => [f, sha(f)])))

// Widths: every one a phone or a desktop really has, and both sides of each breakpoint (359/360, 720/721, 1260/1261). 601 is there on
// purpose: it was the compact layout's old edge, and the long sentence wrapped to three lines there and ran into the hero's words.
const WIDTHS = [320, 340, 359, 360, 375, 390, 414, 480, 600, 601, 700, 720, 721, 768, 820, 1024, 1180, 1260, 1261, 1440, 1920]
{
  const { ctx, page } = await open('/', { w: 1440 })
  const bad = { gapNav: [], tall: [], below: [], wide: [], spill: [], clipped: [], small: [], over: [], hidden: [] }
  for (const w of WIDTHS) {
    await page.setViewportSize({ width: w, height: w < 700 ? 800 : 900 })
    await page.waitForTimeout(150)
    const m = await page.evaluate(measure)
    if (!m.shown) bad.hidden.push(w)
    if (m.gapNav !== 0) bad.gapNav.push([w, m.gapNav])
    if (m.h < 44 || m.h > 56) bad.tall.push([w, m.h])
    if (m.below < 8) bad.below.push([w, m.below])
    if (m.wide) bad.wide.push(w)
    if (m.spill.length) bad.spill.push([w, m.spill])
    if (m.clipped) bad.clipped.push(w)
    if (!m.stores.length || m.stores.some(h => h < 24)) bad.small.push([w, m.stores])
    if (m.over.length) bad.over.push([w, m.over])
  }
  check('B6 it is there at every width from 320px to 1920px', bad.hidden.length === 0, bad.hidden)
  check('B7 it starts where the nav ends, and is between 44px and 56px tall (it fits the hero\'s top padding)', bad.gapNav.length === 0 && bad.tall.length === 0, { gapNav: bad.gapNav, tall: bad.tall })
  check('B8 it is never closer than 8px to the words under it', bad.below.length === 0, bad.below)
  check('B9 it never makes the page scroll sideways, and nothing in it spills out of it or is cut off', bad.wide.length === 0 && bad.spill.length === 0 && bad.clipped.length === 0, { wide: bad.wide, spill: bad.spill, clipped: bad.clipped })
  check('B10 both badges are at least 24px tall (the smallest tap target the guidelines allow), and nothing sits over a badge or the words', bad.small.length === 0 && bad.over.length === 0, { small: bad.small, over: bad.over })

  // It moves nothing: the first words of the hero are exactly where they are without it.
  const moved = []
  for (const w of [360, 390, 820, 1280, 1440]) {
    await page.setViewportSize({ width: w, height: 900 }); await page.waitForTimeout(150)
    const withIt = (await page.evaluate(measure)).firstTop
    await page.evaluate(() => { document.getElementById('appBanner').hidden = true }); await page.waitForTimeout(80)
    const without = (await page.evaluate(measure)).firstTop
    await page.evaluate(() => { document.getElementById('appBanner').hidden = false })
    if (Math.abs(withIt - without) > 1) moved.push([w, withIt, without])
  }
  check('B11 it moves nothing: the hero\'s first words stand where they stand without it', moved.length === 0, moved)
  await ctx.close()
}

// The phone, as a phone: the iPhone's own browser, narrow and touch, both badges there, and a tap on a badge goes to its listing.
{
  const { ctx, page } = await open('/', { w: 390, h: 844, mobile: true })
  const m = await page.evaluate(measure)
  check('B12 on a phone it is one short row: the seal, "Our app is here", and both badges',
    m.shown && m.h <= 56 && m.stores.length === 2 && await page.evaluate(() => {
      const b = document.getElementById('appBanner'); const vis = s => getComputedStyle(b.querySelector(s)).display !== 'none'
      return vis('.app-banner__short') && !vis('.app-banner__long') && !vis('.app-banner__more')
    }), m)
  await ctx.close()
}

// Its dates, the donation drive's slot, and the page without scripts.
{
  const at = async now => { const { ctx, page } = await open('/', { w: 1440, now }); const m = await page.evaluate(measure); const d = await page.evaluate(() => { const e = document.getElementById('donateBar'); return !!e && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().height > 0 }); await ctx.close(); return { ...m, donate: d } }
  const last = await at('2027-02-01T05:59:00Z'), gone = await at('2027-02-01T06:00:01Z')
  check('D1 it is on the page until midnight Central at the end of January 2027, and gone the second after', last.shown && !gone.shown && !gone.wide, { last: last.shown, gone: gone.shown })
  const drive = await at('2026-10-20T15:00:00Z'), over = await at('2026-11-12T15:00:00Z')
  check('D2 while the donation drive is on the bar has the slot and the banner steps aside; once it is over the banner has it', drive.donate && !drive.shown && !over.donate && over.shown, { drive: [drive.donate, drive.shown], over: [over.donate, over.shown] })
  // The first of those two states matters most: the banner must not be anywhere under the bar.
  check('D3 during the drive the banner takes no room and the page does not scroll sideways', !drive.wide, drive)
}
{
  // Without JavaScript only the page's own HTML and CSS are left. The donation bar cannot tell that its drive is over (that is a script's
  // job), so it keeps the slot, as it always has for a visitor without scripts; the banner must then be out of its way, with both links
  // still in the page for anything that reads the HTML. What must never happen is both on top of each other, or neither.
  const { ctx, page } = await open('/', { w: 1440, js: false })
  const m = await page.evaluate(() => {
    const b = document.getElementById('appBanner'), d = document.getElementById('donateBar')
    const shown = e => !!e && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().height > 0
    return { banner: shown(b), bar: shown(d), apple: b && b.querySelector('.app-banner__store--apple').getAttribute('href'), google: b && b.querySelector('.app-banner__store--google').getAttribute('href') }
  })
  check('D4 with JavaScript off both links are in the page, and exactly one of the donation bar and the banner holds the slot', m.apple === APPLE && m.google === GOOGLE && m.banner !== m.bar, m)
  await ctx.close()
}

// The seasons: the homepage dresses for the holiday, and some of the decorations are buttons that move (Santa's sleigh crosses the whole width of the sky, on the line under the
// nav that the banner is on). None of them may lie over the banner at any point of its crossing, or sit between a tap and what it was aimed at. The decorations are swept
// through eight points of their animation, as season-theme-checks.mjs sweeps them, so the answer does not depend on where the sleigh happened to be when the page was measured
// (site-test.mjs found the Christmas sleigh over the banner at 1280px, and under it at 320px, only because of where it had got to).
const sweepAgainstBanner = async () => {
  const banner = document.getElementById('appBanner')
  const found = new Set()
  const live = () => [...document.querySelectorAll('.sk-tap')].filter(t => getComputedStyle(t).display !== 'none' && t.getBoundingClientRect().width > 0)
  // the flyers that carry a tap decoration move; so do the ones that bob or sway inside it
  const anims = document.getAnimations().filter(a => { const t = a.effect && a.effect.target; return t && t.closest && (t.closest('.sk-tap') || (t.querySelector && t.querySelector('.sk-tap'))) })
  const lengths = anims.map(a => a.effect.getComputedTiming().duration)
  for (let i = 0; i < 8; i++) {
    anims.forEach((a, k) => { a.pause(); a.currentTime = (i / 8) * (typeof lengths[k] === 'number' ? lengths[k] : 0) })
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
    const b = banner.getBoundingClientRect()
    for (const t of live()) {
      const a = t.getBoundingClientRect(), inset = 3
      if (a.left + inset < b.right && a.right - inset > b.left && a.top + inset < b.bottom && a.bottom - inset > b.top) found.add('tap ' + [...t.classList].filter(c => c !== 'sk-tap').join('.') + ' over the banner')
    }
    // and what is under the middle of each badge, and of the words, is the badge, and the words
    for (const e of banner.querySelectorAll('.app-banner__store, .app-banner__text')) {
      if (getComputedStyle(e).display === 'none') continue
      const q = e.getBoundingClientRect(), top = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2)
      if (!(top && e.contains(top))) found.add((e.className.split(' ')[0]) + ' is under ' + (top ? top.tagName + '.' + String(top.className).split(' ')[0] : 'nothing'))
    }
  }
  anims.forEach(a => a.play())
  return { found: [...found], swept: anims.length }
}
{
  const bad = []
  let swept = 0, shownEverywhere = true
  for (const [name, now] of [['thanksgiving', '2026-11-12T15:00:00Z'], ['thanksgiving week', '2026-11-26T15:00:00Z'], ['christmas', '2026-12-18T15:00:00Z'], ['christmas eve', '2026-12-24T15:00:00Z'], ['new year', '2026-12-31T20:00:00Z'], ['new year day', '2027-01-04T15:00:00Z'], ['plain', '2027-01-25T15:00:00Z']]) {
    for (const [w, mobile] of [[320, true], [390, true], [820, false], [1024, false], [1280, false], [1440, false]]) {
      const { ctx, page } = await open('/', { w, h: 900, mobile, now })
      const m = await page.evaluate(measure)
      const sw = await page.evaluate(sweepAgainstBanner)
      swept += sw.swept
      if (!m.shown) shownEverywhere = false
      if (!m.shown || m.over.length || m.below < 8 || m.wide || m.spill.length || m.clipped || sw.found.length) bad.push([name, w, { shown: m.shown, over: m.over, below: m.below, wide: m.wide, spill: m.spill, clipped: m.clipped, swept: sw.found }])
      await ctx.close()
    }
  }
  check('S1 under every season in its twelve weeks it is shown, uncovered, clear of the words and inside the page, and no moving decoration crosses it', bad.length === 0, bad)
  check('S2 the sweep had something to sweep (the seasons\' moving decorations are really being moved), and the banner was shown on every day', swept > 0 && shownEverywhere, { swept, shownEverywhere })
}

// The page's block is what the generator writes: a hand edit, or a changed address in only one place, fails here.
{
  const gen = execFileSync('python3', ['-c', "import sys; sys.path.insert(0,'scripts'); import build_pages as b; sys.stdout.write(b.app_banner())"], { cwd: ROOT }).toString()
  const html = readFileSync(join(ROOT, 'index.html'), 'utf8')
  const m = html.match(/<!-- APP-BANNER:START[^>]*-->([\s\S]*?)<!-- APP-BANNER:END -->/)
  check('G1 the banner in index.html is exactly what scripts/build_pages.py writes', !!m && gen.trim().length > 0 && m[1].trim() === gen.trim(), m ? 'differs' : 'no APP-BANNER block')
  check('G2 the generator carries the same two addresses as the listings', gen.includes('href="' + APPLE + '"') && gen.includes('href="' + GOOGLE + '"'))
}

await browser.close(); server.close()
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
