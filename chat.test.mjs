/**
 * The live chat bubble (chat.js), against a stand-in for the CRM's site-chat function.
 *
 * The function is never called. Every request to it is answered by fakeFunction() below, which keeps its chats in
 * memory the way the real one keeps them in the CRM, and every other request that leaves this box is blocked.
 * The timings (a poll every 4 s with the panel open and every 60 s with it closed, the 8 / 16 / 30 s back-off, the
 * 15 s give-up) are driven with Playwright's clock (page.clock), so chat.js carries no test hooks.
 *
 *   node chat.test.mjs
 *   SHOTS=/some/folder node chat.test.mjs     also saves screenshots: the bubble, the start form and a conversation,
 *                                              each at 1280x800 and 390x844
 *
 * Needs playwright-core; set CHROME to override the browser path. Serves this folder itself on 127.0.0.1:4652.
 */
import { chromium } from 'playwright-core'
import { createServer } from 'node:http'
import { readFileSync, existsSync, statSync, mkdirSync } from 'node:fs'
import { extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomBytes } from 'node:crypto'

const ROOT = fileURLToPath(new URL('.', import.meta.url))
const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.json': 'application/json', '.ico': 'image/x-icon', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.txt': 'text/plain',
  '.mp4': 'video/mp4', '.webm': 'video/webm',
}
// Like Cloudflare Pages: /schedule serves schedule.html.
const server = createServer((req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0])
  let f = join(ROOT, p)
  if (p.endsWith('/')) f = join(f, 'index.html')
  if (!existsSync(f) && existsSync(f + '.html')) f += '.html'
  if (!existsSync(f) || statSync(f).isDirectory()) { res.statusCode = 404; res.end(''); return }
  res.setHeader('content-type', TYPES[extname(f)] ?? 'application/octet-stream')
  res.end(readFileSync(f))
})
await new Promise(r => server.listen(4652, '127.0.0.1', r))
const BASE = 'http://127.0.0.1:4652'
const KEY = 'labyrinth.chat.v1'
const FN = '**/functions/v1/site-chat'
const GENERIC = "Couldn't reach us just now. Check your connection, or call or text (281) 393-7983."
const SHOTS = process.env.SHOTS || ''
if (SHOTS) mkdirSync(SHOTS, { recursive: true })

const browser = await chromium.launch({
  executablePath: process.env.CHROME ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-proxy-server'],
})

let failed = 0, passed = 0
const check = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  if (ok) passed++; else failed++
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${label}` +
    (ok ? '' : `\n          got ${JSON.stringify(got)}\n          want ${JSON.stringify(want)}`))
}

/**
 * The CRM's site-chat function, in memory. `reply(r)` queues a canned answer for the next call ({ status, body },
 * a function of the payload, 'offline' to fail the request, or 'hang' to never answer); otherwise it answers the
 * way the contract says. `say(token, body)` is the academy replying from the CRM.
 */
function fakeFunction() {
  const chats = new Map(), calls = [], queued = [], hung = []
  let n = 0
  const msg = (from, body) => ({ id: 'm' + (++n), from, body, at: new Date().toISOString() })
  const self = {
    calls, chats, hung,
    reply(r) { queued.push(r) },
    say(token, body) { const m = msg('academy', body); chats.get(token).push(m); return m },
    token() { return [...chats.keys()].pop() },
    count(action) { return calls.filter(c => c.body.action === action).length },
    answer(body) {
      if (queued.length) { const q = queued.shift(); return typeof q === 'function' ? q(body) : q }
      if (body.action === 'start') {
        const token = randomBytes(32).toString('base64url')
        // The honeypot: answered like a success, and nothing is kept.
        if (body.website) return { status: 200, body: { ok: true, token, messages: [] } }
        chats.set(token, [msg('visitor', body.message)])
        return { status: 200, body: { ok: true, token, messages: chats.get(token).slice(-200) } }
      }
      const c = chats.get(body.token)
      if (!c) return { status: 404, body: { ok: false, gone: true, error: 'That chat has ended.' } }
      if (body.action === 'send') c.push(msg('visitor', body.message))
      if (body.action === 'send' || body.action === 'poll') return { status: 200, body: { ok: true, messages: c.slice(-200) } }
      return { status: 400, body: { ok: false, error: 'Unknown action.' } }
    },
    async route(route) {
      const req = route.request()
      const body = JSON.parse(req.postData() || '{}')
      calls.push({ body, headers: await req.allHeaders(), method: req.method() })
      const r = self.answer(body)
      if (r === 'offline') return route.abort('internetdisconnected')
      if (r === 'hang') { hung.push(route); return }
      await route.fulfill({ status: r.status, contentType: 'application/json',
        headers: { 'access-control-allow-origin': '*' }, body: r.raw ?? JSON.stringify(r.body) })
    },
  }
  return self
}

/**
 * A page with the function faked, everything else off this box blocked, and what went wrong collected.
 * `chat` is put in localStorage before the page loads. `clock` installs Playwright's clock at that time, paused, so
 * no timer runs until the test moves it on (page.clock.fastForward). `fixed` pins only the date. `host` loads the page under
 * another host name (served from here).
 */
async function open(path, { viewport, chat, raw, init, arg, clock, fixed, touch, fn = fakeFunction(), host } = {}) {
  const ctx = await browser.newContext({ viewport: viewport ?? { width: 1280, height: 800 }, ...(touch ? { hasTouch: true } : {}) })
  // The home page's exit popup (app.js) opens after a minute on the page, which the tests' clock gets to; it is not
  // what is under test, so it is told it has already been shown twice this session.
  await ctx.addInitScript(() => { try { sessionStorage.setItem('exitPopupCount', '2') } catch (e) { /* storage blocked */ } })
  if (init) await ctx.addInitScript(init, arg)
  // What chat.js hands to fetch, exactly as it hands it.
  await ctx.addInitScript(() => {
    const real = window.fetch
    window.__chatFetches = []
    window.fetch = function (url, opts) {
      if (/site-chat/.test(String(url))) window.__chatFetches.push({ url: String(url), opts: opts ? { method: opts.method, headers: opts.headers, body: opts.body, keys: Object.keys(opts) } : null })
      return real.apply(this, arguments)
    }
  })
  // Playwright matches routes in reverse order of registration: the catch-all first, the function last.
  await ctx.route('**', route => route.request().url().startsWith(BASE) ? route.continue() : route.abort())
  if (host) {
    await ctx.route(`http://${host}/**`, async route => {
      const u = new URL(route.request().url())
      const res = await fetch(BASE + u.pathname + u.search)
      await route.fulfill({ status: res.status, headers: { 'content-type': res.headers.get('content-type') || 'text/html' }, body: Buffer.from(await res.arrayBuffer()) })
    })
  }
  await ctx.route(FN, route => fn.route(route))
  const page = await ctx.newPage()
  const errors = [], requests = []
  page.on('request', r => requests.push(r.url()))
  page.on('pageerror', e => errors.push(String(e)))
  page.on('console', m => {
    // A blocked request is this harness, not the page.
    if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text())
  })
  if (fixed) await page.clock.setFixedTime(fixed)
  if (clock) { await page.clock.install({ time: clock }); await page.clock.pauseAt(new Date(+clock + 1000)) }
  const origin = host ? `http://${host}` : BASE
  if (chat || raw) {
    await page.goto(origin + '/robots.txt')
    await page.evaluate(([k, v]) => localStorage.setItem(k, v), [KEY, raw ?? JSON.stringify(chat)])
  }
  await page.goto(origin + path, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(300)
  return { ctx, page, fn, errors, requests }
}

/** Ask the page until `test` is true (real time, so it works with the page's clock paused). */
async function until(page, test, arg, ms = 4000) {
  const end = Date.now() + ms
  for (;;) {
    const v = await page.evaluate(test, arg)
    if (v || Date.now() > end) return v
    await new Promise(r => setTimeout(r, 40))
  }
}
/** Until the fake function has had `n` calls. */
async function calls(fn, n, ms = 4000) {
  const end = Date.now() + ms
  while (fn.calls.length < n && Date.now() < end) await new Promise(r => setTimeout(r, 25))
  if (fn.calls.length >= n) await new Promise(r => setTimeout(r, 120))  // and for the page to have drawn the answer
  return fn.calls.length
}

const state = page => page.evaluate(() => {
  const q = s => document.querySelector(s)
  const panel = q('#lab-chat-panel'), badge = q('.lab-chat__badge')
  const a = document.activeElement
  return {
    expanded: q('.lab-chat__bubble').getAttribute('aria-expanded'),
    view: panel.hidden ? 'closed' : !q('.lab-chat__start').hidden ? 'start' : 'convo',
    focus: a ? (a.id || a.className || a.tagName) : '',
    badge: badge.hidden ? '' : badge.textContent,
    unread: q('#lab-chat-unread').textContent,
    msgs: [...document.querySelectorAll('.lab-chat__msg')].map(li => [li.classList.contains('lab-chat__msg--me') ? 'me' : 'them', li.querySelector('.lab-chat__body').textContent]),
    ids: [...document.querySelectorAll('.lab-chat__msg')].map(li => li.dataset.id),
    stored: (() => { try { return localStorage.getItem('labyrinth.chat.v1') } catch (e) { return 'blocked' } })(),
    status: q('.lab-chat__status').textContent,
    live: q('.lab-chat__live').textContent,
    system: q('.lab-chat__system').textContent,
  }
})
const stored = async page => JSON.parse(await page.evaluate(k => localStorage.getItem(k), KEY))

async function fillStart(page, { name = 'Sam Rivera', email = 'sam@example.com', phone = '', message = 'Do you have a kids class on Saturday mornings?' } = {}) {
  if (!(await page.isVisible('#lab-chat-panel'))) await page.click('.lab-chat__bubble')
  await page.fill('#lab-chat-name', name)
  await page.fill('#lab-chat-email', email)
  await page.fill('#lab-chat-phone', phone)
  await page.fill('#lab-chat-message', message)
}
async function startChat(page, fn, opts) {
  await fillStart(page, opts)
  const before = fn.calls.length
  await page.click('.lab-chat__go')
  await calls(fn, before + 1)
  await until(page, () => !document.querySelector('.lab-chat__convo').hidden)
  return fn.token()
}
const fieldErrors = page => page.evaluate(() => ({
  name: document.getElementById('lab-chat-name-err').textContent,
  email: document.getElementById('lab-chat-email-err').textContent,
  phone: document.getElementById('lab-chat-phone-err').textContent,
  message: document.getElementById('lab-chat-message-err').textContent,
  hint: document.getElementById('lab-chat-contact-hint').textContent,
  hintIsError: document.getElementById('lab-chat-contact-hint').classList.contains('is-error'),
  invalid: ['name', 'email', 'phone', 'message'].filter(k => document.getElementById('lab-chat-' + k).getAttribute('aria-invalid') === 'true'),
  alert: document.querySelector('.lab-chat__alert').hidden ? '' : document.querySelector('.lab-chat__alert').textContent,
  focus: document.activeElement && document.activeElement.id,
}))

const box = (page, sel) => page.evaluate(s => {
  const el = document.querySelector(s)
  if (!el) return null
  const r = el.getBoundingClientRect()
  return { l: Math.round(r.left), t: Math.round(r.top), r: Math.round(r.right), b: Math.round(r.bottom) }
}, sel)
const overlaps = (a, b) => !!a && !!b && a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t
/** What is under the middle of `sel` is `sel` (or inside it): nothing is lying over it. */
const onTop = (page, sel) => page.evaluate(s => {
  const el = document.querySelector(s), r = el.getBoundingClientRect()
  const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
  return !!top && (top === el || el.contains(top))
}, sel)
const visible = (page, sel) => page.isVisible(sel)
const scrollTo = (page, y) => page.evaluate(y => window.scrollTo({ top: y, behavior: 'instant' }), y)

// ── The source ────────────────────────────────────────────────────────────────
console.log('\nThe source:')
{
  const js = readFileSync(join(ROOT, 'chat.js'), 'utf8'), css = readFileSync(join(ROOT, 'chat.css'), 'utf8')
  check('chat.js never parses a string as HTML (no innerHTML, outerHTML, insertAdjacentHTML or document.write)',
    /innerHTML|outerHTML|insertAdjacentHTML|document\.write/.test(js), false)
  check('it does not read the ad tags (booking.js is the only script that does: site-test L1src)', /utm_source|gclid|fbclid/.test(js), false)
  check('it calls the one function, with no key of any kind', [js.match(/https:\/\/[a-z0-9.]+\/functions\/v1\/[a-z-]+/g), /apikey|authorization|bearer|anon/i.test(js)],
    [['https://jctufxvmuvobaggxcwfn.supabase.co/functions/v1/site-chat'], false])
  check('no long dashes and no British spellings in either file', /[–—]|&[mn]dash;|\b(colour|centre|behaviour|programme|neighbour|organis|recognis|favour)/i.test(js + css), false)
}

// ── Nothing happens on a page load with no chat stored ────────────────────────
console.log('\nA page load with no chat stored sends nothing:')
for (const path of ['/legacy/transfer', '/', '/blog/what-to-expect-first-bjj-class']) {
  const { page, ctx, fn, errors, requests } = await open(path, { clock: new Date('2026-10-21T15:00:00Z') })
  await scrollTo(page, 100000)
  for (let i = 0; i < 10; i++) await page.clock.fastForward(60000)  // ten minutes of page time: no poll, no timer of chat.js's sends anything
  await page.waitForTimeout(300)
  await scrollTo(page, 0)
  check(`${path}: the bubble is there, and the panel starts closed`, [await visible(page, '.lab-chat__bubble'), (await state(page)).view], [true, 'closed'])
  // The home page's donation total (goal.js) asks supabase.co for itself; nothing may ask the chat function.
  const own = path === '/' ? /site-chat/ : /supabase\.co|site-chat/
  check(`${path}: not one request to ${path === '/' ? 'the chat function' : 'supabase.co'} in ten minutes`,
    [requests.filter(u => own.test(u)), fn.calls.length], [[], 0])
  check(`${path}: and nothing in storage`, await page.evaluate(k => localStorage.getItem(k), KEY), null)
  check(`${path}: loads clean`, errors, [])
  await ctx.close()
}
{
  const { page, ctx, fn, errors } = await open('/', { raw: '{not json', clock: new Date('2026-10-21T15:00:00Z') })
  await page.clock.fastForward(120000)
  await page.waitForTimeout(200)
  check('junk in storage is no chat: no request, and the start form', [fn.calls.length, (await state(page)).view], [0, 'closed'])
  check('and no error', errors, [])
  await ctx.close()
}

// ── Opening and closing ───────────────────────────────────────────────────────
console.log('\nThe bubble opens and closes the panel:')
{
  const { page, ctx, errors } = await open('/')
  const bubble = await page.evaluate(() => {
    const b = document.querySelector('.lab-chat__bubble'), p = document.getElementById('lab-chat-panel'), live = document.querySelector('.lab-chat__live')
    return { tag: b.tagName, label: b.getAttribute('aria-label'), expanded: b.getAttribute('aria-expanded'), text: b.textContent.trim(),
      role: p.getAttribute('role'), dialogLabel: p.getAttribute('aria-label'), live: live.getAttribute('aria-live'), liveOutside: !p.contains(live),
      z: [getComputedStyle(b).zIndex, getComputedStyle(p).zIndex], color: getComputedStyle(b).backgroundColor }
  })
  check('a round button, icon only, labelled "Chat with us", aria-expanded false', [bubble.tag, bubble.label, bubble.expanded, bubble.text], ['BUTTON', 'Chat with us', 'false', ''])
  check('the panel is a dialog with a label, and replies are announced from a polite live region outside it',
    [bubble.role, bubble.dialogLabel, bubble.live, bubble.liveOutside], ['dialog', 'Chat with Labyrinth BJJ', 'polite', true])
  check('bubble and panel sit at z-index 9000 (above the page and its bars, under the booking popup)', bubble.z, ['9000', '9000'])
  const b = await box(page, '.lab-chat__bubble')
  check('the bubble is a 56px circle 24px in from the bottom right corner at 1280x800', [b.r - b.l, b.b - b.t, 1280 - b.r, 800 - b.b], [56, 56, 24, 24])

  await page.click('.lab-chat__bubble')
  await page.waitForTimeout(350)  // it rises into place over a quarter of a second
  let s = await state(page)
  check('a click opens it on the start form, and the first field has the focus', [s.expanded, s.view, s.focus], ['true', 'start', 'lab-chat-name'])
  const p = await box(page, '#lab-chat-panel')
  check('on a desktop it is a card about 360 wide and 540 tall, above the bubble, at the right', [p.r - p.l, p.b - p.t, 1280 - p.r, p.b <= b.t], [360, 540, 24, true])
  await page.keyboard.press('Escape')
  s = await state(page)
  check('Escape closes it and puts the focus back on the bubble', [s.expanded, s.view, s.focus], ['false', 'closed', 'lab-chat__bubble'])
  await page.keyboard.press('Enter')
  check('the bubble opens from the keyboard too', (await state(page)).view, 'start')
  await page.click('.lab-chat__close')
  s = await state(page)
  check('the close button closes it, and the focus goes back to the bubble', [s.view, s.focus], ['closed', 'lab-chat__bubble'])
  await page.click('.lab-chat__bubble'); await page.click('.lab-chat__bubble')
  check('the bubble itself toggles it shut', (await state(page)).view, 'closed')
  await page.evaluate(() => window.LabyrinthChat.open())
  s = await state(page)
  check('LabyrinthChat.open() opens it from anywhere', [s.view, s.focus], ['start', 'lab-chat-name'])
  await page.evaluate(() => window.LabyrinthChat.close())
  check('and LabyrinthChat.close() closes it', (await state(page)).view, 'closed')
  check('loads clean', errors, [])
  await ctx.close()
}

// ── The start form's own checks ───────────────────────────────────────────────
console.log('\nThe start form checks what the server checks, before sending:')
{
  const { page, ctx, fn, errors } = await open('/schedule')
  await page.click('.lab-chat__bubble')
  await page.click('.lab-chat__go')
  let e = await fieldErrors(page)
  check('nothing filled in: the name is asked for first, beside the name, with the focus there',
    [e.name, e.message, e.focus, e.invalid], ['Please tell us your name.', 'Please write a message.', 'lab-chat-name', ['name', 'email', 'phone', 'message']])
  check('and the line under email and phone turns into the error', [e.hint, e.hintIsError], ['Email or phone, so we can reply if you leave', true])
  await fillStart(page, { email: '', phone: '' })
  await page.click('.lab-chat__go')
  e = await fieldErrors(page)
  check('a name and a message but no email and no phone: "Email or phone, so we can reply if you leave", beside them',
    [e.hint, e.hintIsError, e.invalid, e.focus, e.name, e.message], ['Email or phone, so we can reply if you leave', true, ['email', 'phone'], 'lab-chat-email', '', ''])
  await page.fill('#lab-chat-phone', '281 555 0100')
  e = await fieldErrors(page)
  check('typing a phone number clears that straight away', [e.hintIsError, e.invalid], [false, []])
  await page.fill('#lab-chat-phone', '')
  await page.fill('#lab-chat-email', 'sam@nowhere')
  await page.click('.lab-chat__go')
  e = await fieldErrors(page)
  check('a bad email: "That email doesn\'t look right.", beside the email, with the focus there', [e.email, e.invalid, e.focus, e.hintIsError], ["That email doesn't look right.", ['email'], 'lab-chat-email', false])
  await page.fill('#lab-chat-email', '')
  await page.fill('#lab-chat-phone', '555-12ab')
  await page.click('.lab-chat__go')
  e = await fieldErrors(page)
  check('a bad phone number (7 to 40 of digits, spaces and ()+.-): beside the phone', [e.phone, e.invalid], ["That phone number doesn't look right.", ['phone']])
  await page.fill('#lab-chat-phone', '(281) 555-0100')
  await page.evaluate(() => { document.getElementById('lab-chat-name').value = 'N'.repeat(61) })
  await page.click('.lab-chat__go')
  e = await fieldErrors(page)
  check('a name over 60 characters', [e.name, e.invalid], ['Please keep your name to 60 characters.', ['name']])
  await page.fill('#lab-chat-name', 'Sam Rivera')
  await page.evaluate(() => { document.getElementById('lab-chat-message').value = 'x'.repeat(2001) })
  await page.click('.lab-chat__go')
  e = await fieldErrors(page)
  check('a message over 2,000 characters', [e.message, e.invalid], ['Please keep it to 2,000 characters.', ['message']])
  check('the boxes stop at the limits themselves', await page.evaluate(() => ['name', 'email', 'phone', 'message'].map(k => document.getElementById('lab-chat-' + k).maxLength)), [60, 254, 40, 2000])
  check('none of that was sent', fn.calls.length, 0)
  check('the line under the button says how replies come', await page.textContent('.lab-chat__fine'), "We'll answer here. If you've left, we may reply by text or email.")
  check('loads clean', errors, [])
  await ctx.close()
}

// ── What the server says back ─────────────────────────────────────────────────
console.log('\nThe server\'s answers land in the right place:')
{
  const { page, ctx, fn, errors } = await open('/pricing')
  await fillStart(page, { phone: '281 555 0100' })
  for (const [field, error, where] of [
    ['name', 'Please use your real name.', 'name'], ['email', 'We could not use that email address.', 'email'],
    ['phone', 'We could not use that phone number.', 'phone'], ['message', 'That message is too long.', 'message']]) {
    fn.reply({ status: 400, body: { ok: false, error, field } })
    const before = fn.calls.length
    await page.click('.lab-chat__go')
    await calls(fn, before + 1)
    const e = await fieldErrors(page)
    check(`a 400 about "${field}" shows its words beside the ${where} field, with the focus there`, [e[where], e.invalid, e.focus], [error, [where], 'lab-chat-' + where])
  }
  fn.reply({ status: 400, body: { ok: false, error: 'Give us an email or a phone number so we can reply.', field: 'contact' } })
  await page.click('.lab-chat__go'); await calls(fn, 5)
  let e = await fieldErrors(page)
  check('a 400 about "contact" goes on the line under email and phone', [e.hint, e.hintIsError, e.invalid], ['Give us an email or a phone number so we can reply.', true, ['email', 'phone']])
  fn.reply({ status: 429, body: { ok: false, error: 'You have sent a lot of messages. Please wait a few minutes.' } })
  await page.click('.lab-chat__go'); await calls(fn, 6)
  e = await fieldErrors(page)
  check('a 429 shows what the server said', e.alert, 'You have sent a lot of messages. Please wait a few minutes.')
  fn.reply({ status: 503, raw: '' })
  await page.click('.lab-chat__go'); await calls(fn, 7)
  e = await fieldErrors(page)
  check('a 503 with nothing to say gets the plain line, with the number to call or text', e.alert, GENERIC)
  check('and the number is a tap-to-call link', await page.evaluate(() => [...document.querySelectorAll('.lab-chat__alert a')].map(a => [a.getAttribute('href'), a.textContent])), [['tel:2813937983', '(281) 393-7983']])
  fn.reply('offline')
  await page.click('.lab-chat__go'); await calls(fn, 8)
  await until(page, g => document.querySelector('.lab-chat__alert').textContent === g, GENERIC)
  check('no connection at all: the same plain line', (await fieldErrors(page)).alert, GENERIC)
  check('nothing was stored by any of that, and the form is still there to try again', [await page.evaluate(k => localStorage.getItem(k), KEY), (await state(page)).view], [null, 'start'])
  check('no error in the page', errors, [])
  await ctx.close()
}
{
  const { page, ctx, fn, errors } = await open('/', { clock: new Date('2026-10-21T15:00:00Z') })
  await fillStart(page)
  fn.reply('hang')
  await page.click('.lab-chat__go')
  await calls(fn, 1)
  const busy = await page.evaluate(() => [document.querySelector('.lab-chat__go').getAttribute('aria-disabled'), document.querySelector('.lab-chat__go').textContent])
  await page.clock.fastForward(15000)
  await until(page, () => !document.querySelector('.lab-chat__alert').hidden)
  check('a start that has had no answer in 15 seconds gives up and says so', [busy, (await fieldErrors(page)).alert], [['true', 'Starting'], GENERIC])
  check('and the button is back', await page.evaluate(() => [document.querySelector('.lab-chat__go').getAttribute('aria-disabled'), document.querySelector('.lab-chat__go').textContent]), ['false', 'Start chat'])
  for (const r of fn.hung) await r.fulfill({ status: 200, body: '{}' }).catch(() => {})
  check('no error in the page', errors, [])
  await ctx.close()
}

// ── A chat starts ─────────────────────────────────────────────────────────────
console.log('\nStarting a chat:')
{
  const { page, ctx, fn, errors, requests } = await open('/blog/bjj-for-women', { clock: new Date('2026-10-21T15:00:00Z') })
  const token = await startChat(page, fn, { name: '  Sam   Rivera ', email: 'Sam@Example.com', phone: '(281) 555-0100', message: 'Do you have a women\'s class?\nI am new.' })
  const sent = fn.calls[0]
  check('one start call, with exactly the fields the contract names', [fn.calls.length, Object.keys(sent.body).sort()], [1, ['action', 'email', 'message', 'name', 'page', 'phone', 'website']])
  check('what the visitor typed, tidied', [sent.body.action, sent.body.name, sent.body.email, sent.body.phone, sent.body.message, sent.body.page, sent.body.website],
    ['start', 'Sam Rivera', 'sam@example.com', '(281) 555-0100', "Do you have a women's class?\nI am new.", '/blog/bjj-for-women', ''])
  const f = await page.evaluate(() => window.__chatFetches[0].opts)
  check('a POST with Content-Type and no other header', [f.method, f.headers, f.keys.sort()], ['POST', { 'Content-Type': 'application/json' }, ['body', 'headers', 'method', 'signal']])
  check('on the wire: no apikey, no authorization', [sent.method, sent.headers['content-type'], Object.keys(sent.headers).filter(h => /apikey|authorization|x-client/i.test(h))], ['POST', 'application/json', []])
  const kept = await stored(page)
  check('storage holds { token, name, seen } and nothing else', [Object.keys(kept).sort(), kept.token, kept.name, kept.seen], [['name', 'seen', 'token'], token, 'Sam Rivera', null])
  check('no email and no phone anywhere in storage', await page.evaluate(() => JSON.stringify(localStorage) + JSON.stringify(sessionStorage)).then(t => /example\.com|555-0100|281/.test(t)), false)
  const s = await state(page)
  check('the conversation shows: the thank-you line, then the visitor\'s message on the right', [s.view, s.system, s.msgs],
    ['convo', "Thanks, Sam. We'll reply here as soon as we can.", [['me', "Do you have a women's class?\nI am new."]]])
  check('and the focus is in the message box', s.focus, 'lab-chat-text')
  const time = await page.evaluate(() => document.querySelector('.lab-chat__time').textContent)
  check('each message has its time, small, like "3:42 PM"', /^\d{1,2}:\d\d (AM|PM)$/.test(time), true)
  check('nothing else went to supabase.co', requests.filter(u => /supabase\.co/.test(u)).length, 1)
  check('loads clean', errors, [])
  await ctx.close()
}
{
  const { page, ctx, fn, errors } = await open('/')
  await fillStart(page)
  await page.evaluate(() => { document.getElementById('lab-chat-hp').value = 'https://spam.example' })
  await page.click('.lab-chat__go')
  await calls(fn, 1)
  await until(page, () => !document.querySelector('.lab-chat__convo').hidden)
  const s = await state(page)
  check('the honeypot travels as `website`', fn.calls[0].body.website, 'https://spam.example')
  check('and an answer with no messages at all (the honeypot\'s) is shown without a fuss', [s.view, s.msgs, errors], ['convo', [], []])
  await ctx.close()
}
{
  const blocked = () => { Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new Error('SecurityError: storage is blocked') } }) }
  const { page, ctx, fn, errors } = await open('/', { init: blocked, clock: new Date('2026-10-21T15:00:00Z') })
  const token = await startChat(page, fn)
  fn.say(token, 'Hi Sam, yes we do.')
  await page.clock.fastForward(4000); await calls(fn, 2)
  const s = await state(page)
  check('with storage blocked the chat still starts and works, from the page\'s memory', [s.view, s.msgs.length], ['convo', 2])
  check('and nothing goes wrong', errors, [])
  await ctx.close()
}

// ── Polling, the unread number, announcements ─────────────────────────────────
console.log('\nReplies arrive by polling:')
{
  const T0 = new Date('2026-10-21T15:00:00Z')
  const { page, ctx, fn, errors } = await open('/', { clock: T0 })
  const token = await startChat(page, fn)
  check('right after the start: no poll yet', fn.count('poll'), 0)
  await page.clock.fastForward(3900); await page.waitForTimeout(150)
  check('nothing before 4 seconds', fn.count('poll'), 0)
  await page.clock.fastForward(100); await calls(fn, 2)
  check('a poll at 4 seconds while the panel is open', fn.count('poll'), 1)
  for (let i = 0; i < 3; i++) { await page.clock.fastForward(4000); await calls(fn, 3 + i) }
  check('and every 4 seconds after that', fn.count('poll'), 4)
  check('every poll is { action: "poll", token } and nothing else', fn.calls.filter(c => c.body.action === 'poll').every(c => JSON.stringify(Object.keys(c.body).sort()) === '["action","token"]' && c.body.token === token), true)

  await page.click('.lab-chat__close')
  const polls = fn.count('poll')
  await page.clock.fastForward(59000); await page.waitForTimeout(200)
  check('closed: nothing for a minute', fn.count('poll'), polls)
  const reply = fn.say(token, 'Hi Sam! Yes, we do.')
  await page.clock.fastForward(1000); await calls(fn, fn.calls.length + 1)
  await until(page, () => !document.querySelector('.lab-chat__badge').hidden)
  let s = await state(page)
  check('then a poll at 60 seconds, and the reply raises the badge on the closed bubble', [fn.count('poll'), s.badge, s.unread], [polls + 1, '1', '1 new message'])
  check('the reply is announced, politely, even with the panel closed', s.live, 'New message from Labyrinth BJJ: Hi Sam! Yes, we do.')
  check('it is not "seen" until the panel has shown it', (await stored(page)).seen, null)
  fn.say(token, 'Your first class is free.')
  await page.clock.fastForward(60000); await calls(fn, fn.calls.length + 1)
  await until(page, () => document.querySelector('.lab-chat__badge').textContent === '2')
  check('a second reply: the badge says 2', (await state(page)).badge, '2')

  const before = fn.count('poll')
  await page.click('.lab-chat__bubble')
  await calls(fn, fn.calls.length + 1)
  s = await state(page)
  check('opening the panel asks at once, shows both replies on the left, labelled Labyrinth BJJ, and clears the badge',
    [fn.count('poll'), s.msgs.map(m => m[0]), s.badge, s.unread, s.focus], [before + 1, ['me', 'them', 'them'], '', '', 'lab-chat-text'])
  const labels = await page.evaluate(() => [...document.querySelectorAll('.lab-chat__msg--them .lab-chat__who')].map(w => [w.textContent, w.getBoundingClientRect().width > 1]))
  check('"Labyrinth BJJ" is shown once over a run of replies (and read out for each)', labels, [['Labyrinth BJJ', true], ['Labyrinth BJJ', false]])
  check('seen is now the newest reply', (await stored(page)).seen, s.ids[2])

  fn.say(token, 'See you then!')
  await page.clock.fastForward(4000); await calls(fn, fn.calls.length + 1)
  s = await state(page)
  check('with the panel open a new reply appears within 4 seconds, is announced, and is seen at once',
    [s.msgs.length, s.live, (await stored(page)).seen, s.badge], [4, 'Labyrinth BJJ: See you then!', s.ids[3], ''])

  // The tab goes into the background.
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true })
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  const hiddenAt = fn.calls.length
  for (let i = 0; i < 10; i++) await page.clock.fastForward(60000)
  await page.waitForTimeout(200)
  check('a hidden tab asks nothing, however long it stays hidden', fn.calls.length, hiddenAt)
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false })
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await calls(fn, hiddenAt + 1)
  check('coming back to the tab asks at once', fn.calls.length, hiddenAt + 1)
  check('no error in the page', errors, [])

  // A page load with that chat stored: the first poll runs on load and the badge counts from `seen`.
  const kept = await stored(page)
  fn.say(token, 'One more thing: bring a water bottle.')
  const later = await open('/schedule', { chat: kept, fn, clock: T0 })
  await calls(fn, fn.calls.length)
  await until(later.page, () => document.querySelectorAll('.lab-chat__msg').length === 5)
  s = await state(later.page)
  check('another page with the chat stored polls once on load, draws the chat, and counts only what is new since seen', [s.msgs.length, s.badge], [5, '1'])
  check('that load announces the one new reply only', s.live, 'New message from Labyrinth BJJ: One more thing: bring a water bottle.')
  check('no error on that page either', later.errors, [])
  await later.ctx.close()
  await ctx.close()
}
{
  const T0 = new Date('2026-10-21T15:00:00Z')
  const { page, ctx, fn, errors } = await open('/', { clock: T0 })
  await startChat(page, fn)
  const at = [], said = []
  let t = 0
  // Six failures in a row (a 503, then no connection, by turns), the time of each ask noted, and what the panel said after it.
  for (let i = 0; i < 6; i++) fn.reply(i % 2 ? 'offline' : { status: 503, body: { ok: false, error: 'busy' } })
  for (let step = 0; step < 150 && at.length < 6; step++) {
    const n = fn.calls.length
    await page.clock.fastForward(1000); t += 1000
    if (await calls(fn, n + 1, 60) > n) { at.push(t); said.push((await state(page)).status) }
  }
  check('the first poll is 4 seconds in; after a failure it waits 8 seconds, then 16, then 30, and stays at 30', at.map((x, i, a) => i ? x - a[i - 1] : x), [4000, 8000, 16000, 30000, 30000, 30000])
  check('one failure says nothing; from the second in a row it says "Reconnecting…", quietly, in the panel',
    [said, await page.evaluate(() => document.querySelector('.lab-chat__status').getAttribute('role'))], [['', 'Reconnecting…', 'Reconnecting…', 'Reconnecting…', 'Reconnecting…', 'Reconnecting…'], 'status'])
  let n = fn.calls.length
  await page.clock.fastForward(29000); await page.waitForTimeout(150)
  const early = fn.calls.length - n
  await page.clock.fastForward(1000); await calls(fn, n + 1)
  check('the next try is 30 seconds on, and an answer that comes through clears the line', [early, fn.calls.length - n, (await state(page)).status], [0, 1, ''])
  n = fn.calls.length
  await page.clock.fastForward(4000); await calls(fn, n + 1)
  check('and it is back to every 4 seconds', fn.calls.length - n, 1)
  check('no error in the page', errors, [])
  await ctx.close()
}

// ── Sending ───────────────────────────────────────────────────────────────────
console.log('\nSending:')
{
  const { page, ctx, fn, errors } = await open('/', { clock: new Date('2026-10-21T15:00:00Z') })
  const token = await startChat(page, fn)
  fn.say(token, 'Hi Sam, how old is he?')
  await page.clock.fastForward(4000); await calls(fn, 2)
  await page.fill('#lab-chat-text', 'He is 7.')
  await page.keyboard.press('Shift+Enter')
  await page.keyboard.type('Which class is that?')
  check('Shift+Enter is a new line, and sends nothing', [await page.inputValue('#lab-chat-text'), fn.count('send')], ['He is 7.\nWhich class is that?', 0])
  await page.keyboard.press('Enter')
  await calls(fn, 3)
  let s = await state(page)
  check('Enter sends it, as { action: "send", token, message }', [fn.count('send'), fn.calls[2].body], [1, { action: 'send', token, message: 'He is 7.\nWhich class is that?' }])
  check('the whole chat comes back and the new message is added once, in order, and the box is empty',
    [s.msgs.map(m => m[0]), s.msgs[2][1], await page.inputValue('#lab-chat-text')], [['me', 'them', 'me'], 'He is 7.\nWhich class is that?', ''])
  await page.clock.fastForward(4000); await calls(fn, 4)
  await page.clock.fastForward(4000); await calls(fn, 5)
  s = await state(page)
  check('polls that bring the same chat back add nothing twice', [s.ids.length, new Set(s.ids).size], [3, 3])
  await page.fill('#lab-chat-text', 'And what should he wear?')
  await page.click('.lab-chat__send')
  await calls(fn, 6)
  check('the Send button sends too', (await state(page)).msgs.length, 4)
  // An answer whose list has a message the page has not drawn yet, older than one it has: it goes in its place.
  const list = fn.chats.get(token)
  const late = { id: 'late-1', from: 'academy', body: 'Sorry, missed this one earlier.', at: list[2].at }
  fn.reply({ status: 200, body: { ok: true, messages: [...list.slice(0, 3), late, ...list.slice(3)] } })
  await page.clock.fastForward(4000); await calls(fn, 7)
  s = await state(page)
  check('a message that turns up out of order is put where the server has it', s.ids, [list[0].id, list[1].id, list[2].id, 'late-1', list[3].id])
  await page.fill('#lab-chat-text', '   ')
  await page.keyboard.press('Enter')
  check('an empty message is not sent', [fn.count('send'), await page.textContent('#lab-chat-text-err')], [2, 'Please write a message.'])
  await page.fill('#lab-chat-text', 'Thanks!')
  fn.reply({ status: 429, body: { ok: false, error: 'Slow down a little. Try again in a minute.' } })
  await page.keyboard.press('Enter'); await calls(fn, 8)
  check('a 429 shows what the server said, and keeps the message in the box', [await page.textContent('#lab-chat-text-err'), await page.inputValue('#lab-chat-text')], ['Slow down a little. Try again in a minute.', 'Thanks!'])
  fn.reply({ status: 400, body: { ok: false, error: 'Messages can be up to 2,000 characters.', field: 'message' } })
  await page.keyboard.press('Enter'); await calls(fn, 9)
  check('a 400 about the message shows beside the box', await page.textContent('#lab-chat-text-err'), 'Messages can be up to 2,000 characters.')
  fn.reply('offline')
  await page.keyboard.press('Enter'); await calls(fn, 10)
  await until(page, g => document.getElementById('lab-chat-text-err').textContent === g, GENERIC)
  check('no connection: the plain line, and the message is still in the box', [await page.textContent('#lab-chat-text-err'), await page.inputValue('#lab-chat-text')], [GENERIC, 'Thanks!'])
  check('no error in the page', errors, [])
  await ctx.close()
}
{
  const { page, ctx, fn, errors } = await open('/', { touch: true, viewport: { width: 390, height: 844 } })
  await startChat(page, fn)
  await page.fill('#lab-chat-text', 'On a phone')
  await page.focus('#lab-chat-text')
  await page.keyboard.press('Enter')
  check('on a touch screen Enter is a new line, and the button sends', [await page.inputValue('#lab-chat-text'), fn.count('send')], ['On a phone\n', 0])
  await page.tap('.lab-chat__send'); await calls(fn, 2)
  check('a tap on Send sends it', fn.count('send'), 1)
  check('no error in the page', errors, [])
  await ctx.close()
}

// ── The chat ends ─────────────────────────────────────────────────────────────
console.log('\nWhen the chat has ended:')
{
  const { page, ctx, fn, errors } = await open('/', { chat: { token: 'a'.repeat(43), name: 'Sam Rivera', seen: null }, clock: new Date('2026-10-21T15:00:00Z') })
  await calls(fn, 1)
  await until(page, () => !document.querySelector('.lab-chat__start').hidden)
  check('a poll that says gone (404) forgets the stored chat', [fn.calls[0].body.action, await page.evaluate(k => localStorage.getItem(k), KEY)], ['poll', null])
  await page.click('.lab-chat__bubble')
  check('and the panel offers a new one, with a short note, the name kept',
    [(await state(page)).view, await page.textContent('.lab-chat__notice'), await page.inputValue('#lab-chat-name')], ['start', 'That chat has ended. Start a new one any time.', 'Sam Rivera'])
  const token = await startChat(page, fn, { name: 'Sam Rivera' })
  check('a new chat starts from there, and the note goes', [!!token, await page.isVisible('.lab-chat__notice')], [true, false])
  fn.reply({ status: 404, body: { ok: false, gone: true, error: 'That chat has ended.' } })
  await page.fill('#lab-chat-text', 'Are you open on Sunday?')
  await page.keyboard.press('Enter')
  await calls(fn, 3)
  await until(page, () => !document.querySelector('.lab-chat__start').hidden)
  check('a send that says gone: forgotten, and the message that did not go is in the new form, not lost',
    [await page.evaluate(k => localStorage.getItem(k), KEY), await page.inputValue('#lab-chat-message'), (await state(page)).focus], [null, 'Are you open on Sunday?', 'lab-chat-name'])
  check('no error in the page', errors, [])
  await ctx.close()
}

// ── "Start a new chat" ────────────────────────────────────────────────────────
console.log('\n"Start a new chat" asks first:')
{
  const { page, ctx, fn, errors } = await open('/', { clock: new Date('2026-10-21T15:00:00Z') })
  await startChat(page, fn)
  const n = fn.calls.length
  await page.click('.lab-chat__again .lab-chat__link')
  check('the first press only asks, in the panel', [await page.isVisible('.lab-chat__confirm'), await page.textContent('.lab-chat__ask'), !!(await stored(page))], [true, 'Clear this chat from this device?', true])
  await page.click('.lab-chat__confirm .lab-chat__link:not(.lab-chat__link--yes)')
  check('"Keep this chat" keeps it', [await page.isVisible('.lab-chat__confirm'), !!(await stored(page)), (await state(page)).view], [false, true, 'convo'])
  await page.click('.lab-chat__again .lab-chat__link')
  await page.click('.lab-chat__link--yes')
  check('"Yes, start over" forgets it: storage is empty and the start form is back, the name kept',
    [await page.evaluate(k => localStorage.getItem(k), KEY), (await state(page)).view, await page.inputValue('#lab-chat-name'), (await state(page)).focus], [null, 'start', 'Sam Rivera', 'lab-chat-name'])
  check('without a request', fn.calls.length, n)
  check('no error in the page', errors, [])
  await ctx.close()
}

// ── Two tabs ──────────────────────────────────────────────────────────────────
console.log('\nTwo tabs share one chat:')
{
  const { page, ctx, fn, errors } = await open('/')
  const other = await ctx.newPage()
  await other.goto(BASE + '/schedule', { waitUntil: 'domcontentloaded' })
  await other.waitForTimeout(300)
  await startChat(page, fn)
  await until(other, () => !document.querySelector('.lab-chat__convo').hidden)
  await calls(fn, 2)
  check('a chat started in one tab is picked up by the other, which asks for it', [await other.evaluate(() => !document.querySelector('.lab-chat__convo').hidden), fn.calls[1].body.action, (await state(other)).msgs.length], [true, 'poll', 1])
  await page.click('.lab-chat__again .lab-chat__link'); await page.click('.lab-chat__link--yes')
  await until(other, () => document.querySelector('.lab-chat__convo').hidden)
  check('and starting over in one forgets it in the other, which is back to the start form',
    await other.evaluate(() => [document.querySelector('.lab-chat__convo').hidden, document.querySelector('.lab-chat__start').hidden]), [true, false])
  check('no error in either', errors, [])
  await ctx.close()
}

// ── What a message can carry ──────────────────────────────────────────────────
console.log('\nA message is only ever text:')
{
  const { page, ctx, fn, errors, requests } = await open('/', { clock: new Date('2026-10-21T15:00:00Z') })
  const evil = '<img src=x onerror="window.__pwned=1"><script>window.__pwned=2</script><b>bold</b> & <a href="javascript:alert(1)">x</a>'
  const token = await startChat(page, fn, { message: evil })
  fn.say(token, evil)
  const links = 'Times: https://labyrinth.vision/schedule. Map (https://example.com/a_(b)) or www.example.com, javascript:alert(1), http://, http://exa<mple and https://labyrinth.vision/#book!'
  fn.say(token, links)
  await page.clock.fastForward(4000); await calls(fn, 2)
  await page.waitForTimeout(300)
  const r = await page.evaluate(() => {
    const bodies = [...document.querySelectorAll('.lab-chat__body')]
    return {
      text: bodies.map(b => b.textContent),
      tags: [...new Set(bodies.flatMap(b => [...b.querySelectorAll('*')].map(e => e.tagName)))],
      pwned: window.__pwned ?? null,
      links: [...bodies[2].querySelectorAll('a')].map(a => [a.textContent, a.getAttribute('href'), a.target, a.rel]),
    }
  })
  check('a body with <img onerror>, <script> and markup shows as the same text, from the visitor and from the academy alike', r.text.slice(0, 2), [evil, evil])
  check('and nothing in it ran or loaded', [r.pwned, requests.filter(u => /\/x$/.test(u))], [null, []])
  check('the only elements in any message are the links it made', r.tags, ['A'])
  check('http(s) addresses become links (sentence punctuation left out), opening in a new tab with noopener noreferrer, and nothing else does',
    r.links, [
      ['https://labyrinth.vision/schedule', 'https://labyrinth.vision/schedule', '_blank', 'noopener noreferrer'],
      ['https://example.com/a_(b)', 'https://example.com/a_(b)', '_blank', 'noopener noreferrer'],
      ['http://exa', 'http://exa/', '_blank', 'noopener noreferrer'],
      ['https://labyrinth.vision/#book', 'https://labyrinth.vision/#book', '_blank', 'noopener noreferrer'],
    ])
  check('the words around the links are untouched', r.text[2], links)
  await ctx.route('https://labyrinth.vision/**', r => r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><p>schedule</p>' }))
  const [popup] = await Promise.all([ctx.waitForEvent('page'), page.click('.lab-chat__body a[href="https://labyrinth.vision/schedule"]')])
  await popup.waitForLoadState('domcontentloaded')
  check('a link can be clicked, and opens in a new tab with no way back to this page', [popup.url(), await popup.evaluate(() => window.opener)], ['https://labyrinth.vision/schedule', null])
  check('no error in the page', errors, [])
  await ctx.close()
}

// ── Getting along with the page ───────────────────────────────────────────────
console.log('\nThe booking popup and the menus come first:')
{
  const { page, ctx, errors } = await open('/')
  await page.evaluate(() => window.LabyrinthBooking.openPicker())
  await page.waitForTimeout(150)
  check('while the booking popup is open the bubble is hidden', await visible(page, '.lab-chat__bubble'), false)
  await page.evaluate(() => window.LabyrinthBooking.close())
  await page.waitForTimeout(150)
  check('and back when it closes', await visible(page, '.lab-chat__bubble'), true)
  await page.click('.lab-chat__bubble')
  await page.click('.hero__ctas a[data-book-trial]')
  await page.waitForTimeout(400)
  check('with the panel open, a "Try a Free Class" button opens the popup, and the panel and bubble step aside',
    [await page.evaluate(() => document.getElementById('bookingOverlay').classList.contains('open')), await visible(page, '#lab-chat-panel'), await visible(page, '.lab-chat__bubble')], [true, false, false])
  await page.keyboard.press('Escape')
  await page.waitForTimeout(400)
  check('closing the popup brings the panel back as it was', [await visible(page, '#lab-chat-panel'), (await state(page)).expanded], [true, 'true'])
  check('no error in the page', errors, [])
  await ctx.close()
}
{
  const { page, ctx, errors } = await open('/', { viewport: { width: 390, height: 844 } })
  await page.click('#hamburger')
  await page.waitForTimeout(200)
  check('on a phone the bubble steps aside while the menu is open', await visible(page, '.lab-chat__bubble'), false)
  await page.click('#hamburger')
  await page.waitForTimeout(200)
  check('and comes back when it closes', await visible(page, '.lab-chat__bubble'), true)
  check('no error in the page', errors, [])
  await ctx.close()
}

console.log('\nOn a phone the panel is the whole screen:')
{
  const { page, ctx, fn, errors } = await open('/', { viewport: { width: 390, height: 844 } })
  const b = await box(page, '.lab-chat__bubble')
  check('the bubble is 52px, 16px in from the corner', [b.r - b.l, b.b - b.t, 390 - b.r, 844 - b.b], [52, 52, 16, 16])
  await scrollTo(page, 1500); await page.waitForTimeout(500)
  await page.click('.lab-chat__bubble')
  await page.waitForTimeout(350)
  const p = await box(page, '#lab-chat-panel')
  const held = await page.evaluate(() => ({ overflow: document.body.style.overflow, modal: document.getElementById('lab-chat-panel').getAttribute('aria-modal'),
    bar: getComputedStyle(document.getElementById('mobileCta')).visibility, wide: document.documentElement.scrollWidth <= innerWidth }))
  check('open, it fills the screen', p, { l: 0, t: 0, r: 390, b: 844 })
  check('the page behind is held still, the dialog is modal, and the call/book bar steps out of the way', [held.overflow, held.modal, held.bar, held.wide], ['hidden', 'true', 'hidden', true])
  const walk = []
  for (const k of ['Shift+Tab', 'Shift+Tab', 'Tab']) { await page.keyboard.press(k); walk.push((await state(page)).focus) }
  check('Tab stays inside it: back from the first control to the last, and on from the last to the first', walk, ['lab-chat__close', 'lab-chat__go', 'lab-chat__close'])
  await startChat(page, fn)
  const t = await box(page, '#lab-chat-text'), sendBtn = await box(page, '.lab-chat__send')
  check('the message box and Send are on the screen, at the bottom', [t.b <= 844, sendBtn.r <= 390, t.t > 600], [true, true, true])
  await page.click('.lab-chat__close')
  const after = await page.evaluate(() => ({ overflow: document.body.style.overflow, modal: document.getElementById('lab-chat-panel').getAttribute('aria-modal'), sheet: document.documentElement.classList.contains('lab-chat-sheet') }))
  check('closed, the page scrolls again and the focus is back on the bubble', [after.overflow, after.modal, after.sheet, (await state(page)).focus], ['', null, false, 'lab-chat__bubble'])
  check('no error in the page', errors, [])
  await ctx.close()
}
{
  const { page, ctx, errors } = await open('/', { viewport: { width: 844, height: 390 }, touch: true })
  await page.tap('.lab-chat__bubble')
  await page.waitForTimeout(350)
  const p = await box(page, '#lab-chat-panel')
  const fs = await page.evaluate(() => getComputedStyle(document.getElementById('lab-chat-name')).fontSize)
  check('a phone on its side (844x390) gets the whole screen too, and on a touch screen the fields are 16px so iOS does not zoom',
    [p, fs, await page.evaluate(() => document.body.style.overflow)], [{ l: 0, t: 0, r: 844, b: 390 }, '16px', 'hidden'])
  check('no error in the page', errors, [])
  await ctx.close()
}

console.log('\nThe bubble covers nothing the page puts in its corner:')
for (const vp of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
  const size = `${vp.width}x${vp.height}`
  {
    const { page, ctx, errors } = await open('/', { viewport: vp })
    await scrollTo(page, 2400)
    await page.waitForTimeout(900)  // the bar slides in and the bubble rises over 0.3 s
    const bubble = await box(page, '.lab-chat__bubble'), top = await box(page, '#backToTop')
    const shown = await page.evaluate(() => [document.getElementById('backToTop').classList.contains('visible'), document.getElementById('mobileCta').classList.contains('visible') && getComputedStyle(document.getElementById('mobileCta')).display !== 'none'])
    check(`${size} home: back-to-top is showing, above the bubble and clear of it, and both can be pressed`,
      [shown[0], top.b <= bubble.t, overlaps(bubble, top), await onTop(page, '#backToTop'), await onTop(page, '.lab-chat__bubble')], [true, true, false, true, true])
    check(`${size} home: the two are lined up on one column`, Math.abs((top.l + top.r) / 2 - (bubble.l + bubble.r) / 2) <= 1, true)
    if (vp.width < 769) {
      const bar = await box(page, '#mobileCta')
      check(`${size} home: the phone call/book bar is showing, and the bubble sits above it, clear of it`,
        [shown[1], bubble.b <= bar.t, overlaps(bubble, bar), await onTop(page, '.mobile-cta-bar__phone'), await onTop(page, '.mobile-cta-bar__trial')], [true, true, false, true, true])
      await scrollTo(page, 0)
      await page.waitForTimeout(900)
      const low = await box(page, '.lab-chat__bubble')
      check(`${size} home: when the bar goes, the bubble goes back down to the corner`, 844 - low.b, 16)
    }
    check(`${size} home: no error`, errors, [])
    await ctx.close()
  }
  {
    const { page, ctx, errors } = await open('/self-defense-for-women', { viewport: vp, fixed: new Date('2026-10-21T15:00:00Z') })
    await page.evaluate(() => document.getElementById('donate').scrollIntoView({ behavior: 'instant' }))
    await page.waitForTimeout(700)
    const bubble = await box(page, '.lab-chat__bubble'), sticky = await box(page, '#rsvp-sticky')
    check(`${size} seminar: the RSVP button is showing, and the bubble sits above it, clear of it, and both can be pressed`,
      [await visible(page, '#rsvp-sticky'), bubble.b <= sticky.t, overlaps(bubble, sticky), await onTop(page, '#rsvp-sticky b'), await onTop(page, '.lab-chat__bubble')], [true, true, false, true, true])
    check(`${size} seminar: no error`, errors, [])
    await ctx.close()
  }
  {
    const { page, ctx, errors } = await open('/drop', { viewport: vp })
    await page.click('.drop__size:text-is("A2")')
    await page.waitForTimeout(700)
    const bubble = await box(page, '.lab-chat__bubble'), bar = await box(page, '#drop-bar')
    check(`${size} drop: the basket bar is showing, and the bubble sits above it, clear of it, and Review and the basket can be pressed`,
      [await visible(page, '#drop-bar'), bubble.b <= bar.t, overlaps(bubble, bar), await onTop(page, '#drop-go'), await onTop(page, '#drop-review'), await onTop(page, '.lab-chat__bubble')], [true, true, false, true, true, true])
    await page.click('#drop-review')
    await page.waitForTimeout(300)
    check(`${size} drop: while the basket sheet is open the bubble steps aside`, [await visible(page, '#drop-sheet'), await visible(page, '.lab-chat__bubble')], [true, false])
    check(`${size} drop: no error`, errors, [])
    await ctx.close()
  }
}

// ── Other hosts ───────────────────────────────────────────────────────────────
console.log('\nOnly on our own hosts:')
for (const host of ['teamlegacydojo.com', 'www.teamlegacydojo.com']) {
  const { page, ctx, fn, errors, requests } = await open('/legacy/', { host, chat: { token: 'b'.repeat(43), name: 'Sam', seen: null }, clock: new Date('2026-10-21T15:00:00Z') })
  await page.clock.fastForward(120000)
  await page.waitForTimeout(200)
  const r = await page.evaluate(() => ({ root: !!document.getElementById('labChat'), api: typeof window.LabyrinthChat, on: document.documentElement.classList.contains('lab-chat-on'), host: location.hostname }))
  check(`on ${host} (which serves /legacy too) chat.js is loaded and does nothing: no bubble, no API, no request, even with a chat stored`,
    [r.host, requests.some(u => /\/chat\.js\?v=/.test(u)), r.root, r.api, r.on, fn.calls.length], [host, true, false, 'undefined', false, 0])
  check(`on ${host}: no error`, errors, [])
  await ctx.close()
}
for (const host of ['localhost:4652']) {
  const { page, ctx, errors } = await open('/', { host })
  check(`and on ${host.split(':')[0]} it is there`, await visible(page, '.lab-chat__bubble'), true)
  check(`${host}: no error`, errors, [])
  await ctx.close()
}

// ── Pictures, for a person to look at ─────────────────────────────────────────
if (SHOTS) {
  console.log('\nScreenshots, into ' + SHOTS + ':')
  for (const vp of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
    const w = vp.width
    const { page, ctx, fn } = await open('/?season=off', { viewport: vp })
    await page.waitForTimeout(500)
    await page.screenshot({ path: join(SHOTS, `home-${w}.png`) })
    await page.click('.lab-chat__bubble')
    await page.waitForTimeout(400)
    await page.screenshot({ path: join(SHOTS, `start-form-${w}.png`) })
    const token = await startChat(page, fn, { name: 'Sam Rivera', message: 'Hi! Do you have a kids class on Saturday mornings? My son is 7.' })
    fn.say(token, 'Hi Sam! Yes, we do. The whole timetable is here: https://labyrinth.vision/schedule')
    fn.say(token, 'Your first class is free, so just bring him along in comfortable clothes.')
    await calls(fn, 2, 8000)
    await page.fill('#lab-chat-text', 'Perfect, see you Saturday. Thank you!')
    await page.keyboard.press('Enter'); await calls(fn, 3)
    await page.waitForTimeout(300)
    await page.screenshot({ path: join(SHOTS, `conversation-${w}.png`) })
    console.log(`  saved home-${w}.png, start-form-${w}.png, conversation-${w}.png`)
    await ctx.close()
  }
}

console.log(`\n${passed} passed, ${failed} failed`)
console.log(failed ? `${failed} check(s) failed.` : 'Every check passed.')
await browser.close()
server.close()
process.exit(failed ? 1 : 0)
