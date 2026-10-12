// The checks every seasonal pack must pass (season-kit.js explains what a pack is). site-test.mjs runs them for every pack, and one pack can be
// checked alone while it is being made:
//     node season-theme-test.mjs christmas
// Each check pins the browser's clock to a day inside the pack's window, so it is the page a visitor gets that day.

// A day inside each pack's window, on the academy's clock (Central).
export const PACKS = {
  thanksgiving: '2026-11-10T15:00:00Z',
  christmas: '2026-12-10T15:00:00Z',
  newyear: '2027-01-10T15:00:00Z',
  valentines: '2027-02-10T15:00:00Z',
  easter: '2027-03-15T15:00:00Z',
  stpatricks: '2027-03-17T15:00:00Z',
  cinco: '2027-05-05T15:00:00Z',
  memorial: '2027-05-24T15:00:00Z',
  independence: '2027-07-04T15:00:00Z',
}
// The twelve places a pack decorates, after the hero.
export const SECTIONS = ['eventStrip', 'programs', 'competition', 'coaches', 'gallery', 'belt-journey', 'locations', 'faq', 'schedule', 'testimonials', 'pricing', 'contact']

const lum = hex => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim()); if (!m) return null
  const c = [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16) / 255).map(v => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}
export const contrast = (a, b) => { const x = lum(a), y = lum(b); if (x == null || y == null) return 0; return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05) }


// Any tap decoration (they are buttons you can press) that is on the screen and lies over words people read: the text of the page outside the decoration layers.
const overText = () => {
  const out = []
  const taps = [...document.querySelectorAll('.sk-tap')].filter(t => getComputedStyle(t).display !== 'none' && t.getBoundingClientRect().width > 0)
  if (!taps.length) return out
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode: n => (n.nodeValue.trim() && n.parentElement && !n.parentElement.closest('.sk-defs, .sk-hero, .sk-sec, .sk-footer, script, style, noscript, [hidden]') && n.parentElement.offsetParent !== null) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT })
  const rects = []
  for (let n; (n = walker.nextNode());) { const r = document.createRange(); r.selectNodeContents(n); for (const b of r.getClientRects()) if (b.width > 2 && b.height > 2) rects.push({ b, t: n.nodeValue.trim().slice(0, 28) }) }
  for (const t of taps) {
    const a = t.getBoundingClientRect(), i = 3
    for (const { b, t: text } of rects) if (a.left + i < b.right && a.right - i > b.left && a.top + i < b.bottom && a.bottom - i > b.top) { out.push(`${[...t.classList].filter(c => c !== 'sk-tap').join('.')} over "${text}"`); break }
  }
  return out
}


// Every tap decoration that is on the screen can be pressed with a real click: what is under the middle of it is the decoration itself, not the page's content.
const pressable = () => {
  const bad = []
  for (const t of document.querySelectorAll('.sk-tap')) {
    if (getComputedStyle(t).display === 'none' || t.getBoundingClientRect().width === 0) continue
    // scroll the page (not scrollIntoView, which would also scroll the decoration layers themselves) so the tap is in the middle of the window
    // (instantly: the page scrolls smoothly otherwise, and the tap would not be there yet)
    const r0 = t.getBoundingClientRect(); window.scrollTo({ top: Math.max(0, window.scrollY + r0.top + r0.height / 2 - innerHeight / 2), left: 0, behavior: 'instant' })
    const r = t.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2
    if (x < 0 || x > innerWidth) continue          // a tap that moves (a hopping bunny) is off the screen at times: nothing to press then
    const top = document.elementFromPoint(x, y)
    if (!top || top.closest('[data-tap]') !== t) bad.push(`${[...t.classList].filter(c => c !== 'sk-tap').join('.')} is under ${top ? top.tagName + '.' + String(top.className).split(' ')[0] : 'nothing'}`)
  }
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  return bad
}

// A page for `name` on the day `iso` (a pinned clock), with the requests it made for the pack's files and anything that went wrong in it.
async function open(browser, base, iso, q, size, reduced) {
  const ctx = await browser.newContext({ viewport: size ?? { width: 1280, height: 800 }, ...(reduced ? { reducedMotion: 'reduce' } : {}) })
  const page = await ctx.newPage()
  const seen = { asked: [], errors: [] }
  page.on('request', r => { const m = /\/(season-[a-z]+\.(?:css|js))(\?v=[0-9a-f]+)?$/.exec(r.url()); if (m) seen.asked.push(m[1] + (m[2] ?? '')) })
  page.on('pageerror', e => seen.errors.push(String(e)))
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_/.test(m.text())) seen.errors.push(m.text()) })
  await page.clock.setFixedTime(new Date(iso))
  await page.goto(base + '/' + (q ?? ''), { waitUntil: 'load' })
  await page.waitForTimeout(450)
  return { ctx, page, seen }
}

export async function checkPack({ browser, base, check, name, iso }) {
  const L = `L2s ${name}`
  const d = await open(browser, base, iso ?? PACKS[name])
  const page = d.page
  const st = await page.evaluate(({ SECTIONS }) => {
    const css = getComputedStyle(document.documentElement), vis = sel => [...document.querySelectorAll(sel)].filter(e => getComputedStyle(e).display !== 'none')
    const T = window.SeasonKit && window.SeasonKit.theme
    const strip = document.getElementById('eventStrip'), wasHidden = strip.hidden
    strip.hidden = false
    const emoji = getComputedStyle(document.querySelector('.event-strip__title'), '::after').content
    strip.hidden = wasHidden
    const secs = SECTIONS.map(id => { const s = document.getElementById(id), l = s && s.querySelector(':scope > .sk-sec'); return l ? l.innerHTML : null })
    return {
      season: document.documentElement.dataset.season, meta: T ? T.meta : null, name: T ? T.name : null, prefix: T ? T.prefix : null,
      hero: document.querySelectorAll('#hero > .sk-hero').length, secs: secs.filter(Boolean).length, secHtml: secs, footer: document.querySelectorAll('.sk-footer').length,
      particles: document.querySelectorAll('.sk-hero .sk-p').length, secParticles: document.querySelectorAll('.sk-sec .sk-p').length,
      bg: css.getPropertyValue('--bg').trim(), gold: css.getPropertyValue('--gold').trim(), muted: css.getPropertyValue('--text-muted').trim(), surface: css.getPropertyValue('--surface').trim(),
      text: css.getPropertyValue('--text').trim(), awareness: css.getPropertyValue('--awareness').trim(),
      emoji, halloween: vis('.season-hero').length + vis('.season-footer').length + vis('.season-sec').length, columbus: document.querySelectorAll('.cd-hero, .cd-sec, .cd-footer').length,
      heroEls: document.querySelector('.sk-hero').getElementsByTagName('*').length, secEls: Math.max(...[...document.querySelectorAll('.sk-sec')].map(e => e.getElementsByTagName('*').length)),
      footerEls: document.querySelector('.sk-footer').getElementsByTagName('*').length,
      taps: [...document.querySelectorAll('[data-tap]')].map(t => ({ tab: t.tabIndex, tag: t.tagName, say: t.querySelector('.sk-bubble')?.textContent ?? null, inHero: !!t.closest('.sk-hero'), inSec: !!t.closest('.sk-sec'), inFooter: !!t.closest('.sk-footer') })),
      focusable: [...document.querySelectorAll('.sk-hero, .sk-sec, .sk-footer')].flatMap(l => [...l.querySelectorAll('a[href], input, select, textarea, summary, [tabindex]')]).filter(e => e.tabIndex >= 0 || e.tagName === 'A').length,
      footerText: document.querySelector('.sk-footer').textContent.replace(/\s+/g, ' '),
      pe: ['.sk-hero', '.sk-sec', '.sk-footer'].map(s => getComputedStyle(document.querySelector(s)).pointerEvents),
      hit: (() => { const b = document.querySelector('.hero__ctas a.btn'), r = b.getBoundingClientRect(), top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!top && top.closest('a.btn') === b })(),
      behind: (() => { const sec = document.querySelector('#programs > .sk-sec'), c = document.querySelector('#programs > .container'); return +getComputedStyle(sec).zIndex < +getComputedStyle(c).zIndex })(),
      overflow: document.documentElement.scrollWidth > innerWidth,
    }
  }, { SECTIONS })

  check(`${L} on its day the page is the ${name} season, with no errors in the page`, st.season === name && st.name === name && d.seen.errors.length === 0, JSON.stringify({ season: st.season, errors: d.seen.errors }))
  const names = d.seen.asked.map(a => a.replace(/\?v=.*$/, ''))
  check(`${L} it fetches the kit and its own two files and nothing else of a season, each by a versioned address`,
    JSON.stringify([...new Set(names)].sort()) === JSON.stringify(['season-kit.css', 'season-kit.js', `season-${name}.css`, `season-${name}.js`].sort()) && d.seen.asked.every(a => /\?v=[0-9a-f]{8}$/.test(a)), JSON.stringify(d.seen.asked))
  check(`${L} it dresses the hero (a scene with things falling or rising), all twelve sections after it (each its own layer), and the foot of the page`,
    st.hero === 1 && st.secs === 12 && st.footer === 1 && st.particles >= 8 && st.secParticles >= 12, JSON.stringify({ hero: st.hero, secs: st.secs, footer: st.footer, particles: st.particles, secParticles: st.secParticles }))
  check(`${L} no two sections carry the same decoration, and each has several pieces`,
    new Set(st.secHtml).size === 12 && st.secHtml.every(h => h && (h.match(/<(svg|i|div|button)\b/g) || []).length >= 4), 'distinct: ' + new Set(st.secHtml).size)
  check(`${L} it says what it is: a meta with the page colour, the accent, the strip's emoji, every tap bubble and the four signs at the foot`,
    !!st.meta && /^#[0-9a-f]{6}$/i.test(st.meta.bg) && /^#[0-9a-f]{6}$/i.test(st.meta.gold) && !!st.meta.emoji && Array.isArray(st.meta.tapSay) && st.meta.tapSay.length >= 3 && Array.isArray(st.meta.sayings) && st.meta.sayings.length === 4, JSON.stringify(st.meta))
  const meta = st.meta ?? { bg: '', gold: '', emoji: '', tapSay: [], sayings: [] }
  check(`${L} the page takes its colours: the background and the accent are the pack's, not the usual black and gold`,
    st.bg.toLowerCase() === meta.bg.toLowerCase() && st.gold.toLowerCase() === meta.gold.toLowerCase() && st.bg.toLowerCase() !== '#0a0a0a' && st.gold.toLowerCase() !== '#c8a24c', JSON.stringify({ bg: st.bg, gold: st.gold, meta }))
  const ratio = { gold: contrast(st.gold, st.bg), muted: contrast(st.muted, st.bg), mutedOnCard: contrast(st.muted, st.surface), button: contrast('#0a0a0a', st.gold), text: contrast(st.text, st.bg) }
  check(`${L} the colours stay readable: the accent and the grey text on the page (4.5 or more), the grey text on a card, and the dark letters of a gold button`,
    ratio.gold >= 4.5 && ratio.muted >= 4.5 && ratio.mutedOnCard >= 4.5 && ratio.button >= 4.5 && ratio.text >= 7, JSON.stringify(ratio))
  check(`${L} the "this month" title gets its emoji`, st.emoji.includes(meta.emoji), JSON.stringify({ got: st.emoji, want: meta.emoji }))
  check(`${L} the foot of the page carries its four signs`, meta.sayings.every(s => st.footerText.includes(s)), st.footerText.slice(0, 300))
  check(`${L} nothing of Halloween or Columbus Day shows`, st.halloween === 0 && st.columbus === 0, JSON.stringify({ halloween: st.halloween, columbus: st.columbus }))
  check(`${L} the decoration never takes a tap from the page (its layers let every tap through, and the hero button is what is under its own middle), and sits behind the content`,
    st.pe.every(p => p === 'none') && st.hit && st.behind, JSON.stringify({ pe: st.pe, hit: st.hit, behind: st.behind }))
  check(`${L} nothing in it can be reached with the keyboard: no links, no fields, every tap decoration out of the tab order`,
    st.focusable === 0 && st.taps.every(t => t.tab === -1 && t.tag === 'BUTTON'), JSON.stringify({ focusable: st.focusable, taps: st.taps.length }))
  check(`${L} it keeps within a budget a phone can carry: the hero under 500 pieces, any section under 300, the foot under 300`, st.heroEls < 500 && st.secEls < 300 && st.footerEls < 300, JSON.stringify({ hero: st.heroEls, sec: st.secEls, foot: st.footerEls }))

  const over = await page.evaluate(overText)
  check(`${L} at 1280px no tap decoration lies over any words (the margins are 64px: keep them to the sides)`, over.length === 0, JSON.stringify(over))
  const press = await page.evaluate(pressable)
  check(`${L} at 1280px every tap decoration can be pressed with a real click (its middle is not under the page's content)`, press.length === 0, JSON.stringify(press))

  // The taps: at least three decorations answer a tap, one of them in the hero, each with its own words from the pack's meta.
  const tapCount = st.taps.length
  const said = []
  for (let i = 0; i < tapCount; i++) {
    const r = await page.evaluate(async i => {
      const t = document.querySelectorAll('[data-tap]')[i]; t.click()
      const b = t.querySelector('.sk-bubble')
      // wait (up to 1.2 s; the bubble stays 1.4 s) until it is fully shown, so a slow machine does not fail a pack that is right
      for (const t0 = performance.now(); performance.now() - t0 < 1200 && !(t.classList.contains('is-tap') && b && getComputedStyle(b).opacity === '1');) await new Promise(r => setTimeout(r, 40))
      // (measured with the little wiggle a tap gives its decoration stopped: it turns the whole thing a few degrees for a moment, which is not where the bubble stays)
      const was = t.style.animation; t.style.animation = 'none'
      const br = b ? b.getBoundingClientRect() : null
      t.style.animation = was
      return { on: t.classList.contains('is-tap'), text: b ? b.textContent : '', shown: b ? getComputedStyle(b).opacity : '0', inView: !!br && br.left >= -1 && br.right <= document.documentElement.clientWidth + 1, cls: [...t.classList].filter(c => c !== 'sk-tap').join('.') }
    }, i)
    said.push(r)
  }
  check(`${L} tapping a decoration shows its bubble, and the bubbles say what the pack's meta lists (three or more places, one in the hero)`,
    tapCount >= 3 && st.taps.some(t => t.inHero) && said.every(r => r.on && r.shown === '1' && meta.tapSay.includes(r.text)) && meta.tapSay.every(s => said.some(r => r.text === s)), JSON.stringify({ said, meta: meta.tapSay }))
  const gone = await page.evaluate(async () => { await new Promise(r => setTimeout(r, 1700)); return [...document.querySelectorAll('[data-tap]')].every(t => !t.classList.contains('is-tap')) })
  check(`${L} and the bubble goes away again by itself`, gone)
  check(`${L} every bubble stays on the screen when its decoration is tapped (not cut off at the edge)`, said.every(r => r.inView), JSON.stringify(said.filter(r => !r.inView).map(r => r.cls)))
  check(`${L} nothing sticks out sideways on a desktop screen`, !st.overflow)
  await d.ctx.close()

  // Tablets: below 1280px the margins are too narrow for decorations in a section, which the kit hides; the hero's must still keep off the words.
  for (const [w, h] of [[1024, 768], [820, 1000]]) {
    const t = await open(browser, base, iso ?? PACKS[name], '', { width: w, height: h })
    const o = await t.page.evaluate(overText), pr = await t.page.evaluate(pressable)
    check(`${L} at ${w}px no tap decoration lies over any words or can not be pressed, and nothing sticks out sideways`, o.length === 0 && pr.length === 0 && !(await t.page.evaluate(() => document.documentElement.scrollWidth > innerWidth)), JSON.stringify({ o, pr }))
    await t.ctx.close()
  }

  // Phones: nothing sideways, and no tap decoration lies over a link, button or field.
  for (const [w, h] of [[390, 844], [320, 640]]) {
    const m = await open(browser, base, iso ?? PACKS[name], '', { width: w, height: h })
    const r = await m.page.evaluate(() => {
      const rects = e => e.getBoundingClientRect()
      const over = []
      const live = [...document.querySelectorAll('a[href], button:not(.sk-tap), input, select, textarea, summary')].filter(e => !e.closest('.sk-hero, .sk-sec, .sk-footer') && e.offsetParent !== null)
      for (const t of document.querySelectorAll('.sk-tap')) {
        if (getComputedStyle(t).display === 'none') continue
        const a = rects(t); if (a.width === 0) continue
        for (const e of live) { const b = rects(e); if (b.width && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top) over.push((e.className || e.tagName) + ' under ' + (t.className)) }
      }
      const cards = [...document.querySelectorAll('#eventStrip a.event-strip__link')].filter(a => a.offsetParent !== null).every(a => { const b = a.getBoundingClientRect(); return b.left >= -0.5 && b.right <= innerWidth + 0.5 })
      return { overflow: document.documentElement.scrollWidth > innerWidth, over, cards, taps: [...document.querySelectorAll('.sk-tap')].filter(t => getComputedStyle(t).display !== 'none').length }
    })
    const words = await m.page.evaluate(overText), pr = await m.page.evaluate(pressable)
    check(`${L} on a ${w}px phone nothing sticks out sideways, the cards stay on the screen, and no tap decoration lies over a link, a button or any words, or can not be pressed`, !r.overflow && r.cards && r.over.length === 0 && words.length === 0 && pr.length === 0, JSON.stringify({ ...r, words, pr }))
    await m.ctx.close()
  }

  // Less motion: whatever moves stops, and what only exists to fall or rise is not drawn.
  const rm = await open(browser, base, iso ?? PACKS[name], '', null, true)
  const calm = await rm.page.evaluate(() => ({
    moving: [...document.querySelectorAll('.sk-hero *, .sk-sec *, .sk-footer *')].filter(e => getComputedStyle(e).animationName !== 'none' || getComputedStyle(e, '::before').animationName !== 'none' || getComputedStyle(e, '::after').animationName !== 'none').length,
    falling: [...document.querySelectorAll('.sk-p, .sk-fly')].filter(e => getComputedStyle(e).display !== 'none').length,
  }))
  check(`${L} with reduced motion on, nothing moves and nothing falls or rises`, calm.moving === 0 && calm.falling === 0, JSON.stringify(calm))
  await rm.ctx.close()

  // On a day in no season the previews still work, and with the season off nothing of the pack is built or fetched.
  const pv = await open(browser, base, '2026-06-15T15:00:00Z', `?season=${name}`)
  const pvOn = await pv.page.evaluate(() => ({ season: document.documentElement.dataset.season, layers: document.querySelectorAll('.sk-hero, .sk-sec, .sk-footer').length }))
  check(`${L} ?season=${name} previews it in June`, pvOn.season === name && pvOn.layers === 14, JSON.stringify(pvOn))
  await pv.ctx.close()
  const off = await open(browser, base, iso ?? PACKS[name], '?season=off')
  const offOn = await off.page.evaluate(() => ({ season: document.documentElement.dataset.season || '', layers: document.querySelectorAll('.sk-defs, .sk-hero, .sk-sec, .sk-footer, .sk-p, .sk-tap').length }))
  check(`${L} ?season=off turns it off on its own day: nothing built, nothing fetched`, offOn.season === '' && offOn.layers === 0 && off.seen.asked.length === 0, JSON.stringify({ offOn, asked: off.seen.asked }))
  // And if its files were ever run on a day it is not on, they build nothing (the kit looks at the season before it builds).
  await off.page.addScriptTag({ url: '/season-kit.js' })
  await off.page.addScriptTag({ url: `/season-${name}.js` })
  await off.page.waitForTimeout(300)
  const stray = await off.page.evaluate(() => document.querySelectorAll('.sk-defs, .sk-hero, .sk-sec, .sk-footer, .sk-p, .sk-tap').length)
  check(`${L} and its files run on a day it is off build nothing`, stray === 0, String(stray))
  await off.ctx.close()
}
