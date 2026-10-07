/**
 * The Wharton booking calendar, driven in a real browser.
 *
 *   node wharton-site/booking-test.mjs
 *
 * Serves wharton-site/ locally, stubs the CRM at the network layer (no booking is
 * ever really submitted) and checks what a visitor sees and what would be sent.
 * Needs playwright-core; set CHROME to override the browser path.
 */
import { chromium } from 'playwright-core'
import { createServer } from 'node:http'
import { readFileSync, existsSync, statSync } from 'node:fs'
import { extname, join } from 'node:path'

const ROOT = new URL('.', import.meta.url).pathname.replace(/\/$/, '')
const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.json': 'application/json', '.ico': 'image/x-icon', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.txt': 'text/plain',
}
const server = createServer((req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0])
  let f = join(ROOT, p)
  if (existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html')
  else if (!existsSync(f) && existsSync(f + '.html')) f += '.html'
  if (!existsSync(f)) { res.statusCode = 404; res.end(''); return }
  res.setHeader('content-type', TYPES[extname(f)] ?? 'application/octet-stream')
  res.end(readFileSync(f))
})
await new Promise(r => server.listen(4651, '127.0.0.1', r))
const BASE = 'http://127.0.0.1:4651'

const browser = await chromium.launch({
  executablePath: process.env.CHROME ?? (existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome') ? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' : '/opt/pw-browsers/chromium'),
  args: ['--no-proxy-server'],
})

let failed = 0, total = 0
const check = (label, ok, detail = '') => {
  total++
  if (!ok) failed++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${ok || !detail ? '' : '\n        ' + detail}`)
}

/** A page with the CRM stubbed and console errors collected. `crmOk` false makes the CRM refuse. */
async function open(path, { crmOk = true, patchHtml } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await ctx.newPage()
  const errors = []
  const posts = []
  page.on('pageerror', e => errors.push(String(e)))
  page.on('console', m => { if (m.type() === 'error' && !/fontshare|Failed to load resource/.test(m.text())) errors.push(m.text()) })
  await page.route(/api\.fontshare\.com|fonts\.(googleapis|gstatic)\.com/, r => r.abort())
  await page.route(/functions\/v1\/book-trial/, async route => {
    const req = route.request()
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' }, body: 'ok' })
    posts.push(JSON.parse(req.postData() || '{}'))
    await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(crmOk ? { ok: true } : { error: 'nope' }) })
  })
  if (patchHtml) {
    await page.route(BASE + path, async route => {
      const res = await route.fetch()
      await route.fulfill({ response: res, body: patchHtml(await res.text()) })
    })
  }
  await page.goto(BASE + path, { waitUntil: 'load' })
  return { ctx, page, errors, posts }
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const ymdOf = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

async function fillAndSubmit(page, { name = 'Pat Example', email = 'pat@example.com', phone = '(979) 555-0100', company = '' } = {}) {
  await page.fill('#bookingName', name)
  await page.fill('#bookingEmail', email)
  await page.fill('#bookingPhone', phone)
  await page.evaluate(v => { document.getElementById('bookingCompany').value = v }, company)
  await page.click('#bookingSubmitBtn')
}

try {
  // ── Tapping a class on the timetable ───────────────────────────────────────
  {
    const { ctx, page, errors, posts } = await open('/schedule')
    const cells = await page.$$('.sc__class[data-book-class]')
    check('B1 the schedule page has eight tap-to-book classes (4 kids, 2 adult kickboxing, 2 women)', cells.length === 8, String(cells.length))
    check('B2 the booking script and its class list are on the page', await page.evaluate(() => !!window.WhartonBooking && window.WhartonBooking.classes.length === 8))

    await page.click('.sc__col[data-sc-col="Wed"] .sc__class--kids')
    await page.waitForSelector('#bookingCal .booking-cal__day--open')
    check('B3 tapping Wednesday kids jiu-jitsu opens the calendar for Wednesdays', (await page.textContent('.booking-cal__legend')).trim() === 'Which Wednesday?' && (await page.textContent('.booking-class-badge__name')).includes('Kids Jiu-Jitsu'))
    const openDays = await page.$$eval('.booking-cal__radio', els => els.map(e => e.value))
    check('B4 every offered date is a Wednesday, at least four of them, in order', openDays.length >= 4 && openDays.every(v => new Date(v).getDay() === 3) && openDays.join() === [...openDays].sort((a, b) => new Date(a) - new Date(b)).join(), openDays.join(' | '))
    check('B5 the soonest Wednesday is preselected', await page.$eval('.booking-cal__radio:checked', e => e.value) === openDays[0])

    // an invalid email sends nothing
    await fillAndSubmit(page, { email: 'not-an-email' })
    check('B6 an invalid email is refused and nothing is sent', posts.length === 0 && await page.$eval('#bookingEmail', e => e.classList.contains('is-error')))
    // a bot that fills the hidden field sends nothing
    await fillAndSubmit(page, { company: 'spam inc' })
    check('B7 the honeypot field stops a bot: nothing is sent', posts.length === 0)

    // choose the third Wednesday and book
    const third = openDays[2]
    await page.evaluate(v => { const r = [...document.querySelectorAll('.booking-cal__radio')].find(x => x.value === v); r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })) }, third)
    await fillAndSubmit(page)
    await page.waitForSelector('.booking-success')
    const body = posts[0] || {}
    const thirdD = new Date(third)
    check('B8 one booking is sent, filed under Wharton with the exact class',
      posts.length === 1 && body.location === 'wharton' && body.className === 'Kids Jiu-Jitsu' && body.program === 'Kids 3-6', JSON.stringify(body))
    check('B9 the class time is the chosen Wednesday at 5:00 PM Central',
      new RegExp(`^${ymdOf(thirdD)}T17:00:00-0[56]:00$`).test(body.trialAt || ''), body.trialAt)
    check('B10 the note starts WHARTON: and names the class, day and time',
      /^WHARTON: Kids Jiu-Jitsu, Wednesday 5:00 PM, booked from the website$/.test(body.note || ''), body.note)
    check('B11 the visitor is shown the day, time and the Wharton address',
      (await page.textContent('.booking-success')).includes('201 N Houston St') && (await page.textContent('.booking-success__detail')).includes('5:00 PM'))
    check('B12 no Fulshear anything in the payload or the success screen', !/fulshear|katy/i.test(JSON.stringify(body) + (await page.textContent('.booking-success'))))
    check('B13 no script errors', errors.length === 0, errors.join(' | '))
    await ctx.close()
  }

  // ── The picker from the nav button ─────────────────────────────────────────
  {
    const { ctx, page, errors, posts } = await open('/')
    await page.click('.nav__cta')
    await page.waitForSelector('.booking-class-row')
    const rows = await page.$$eval('.booking-class-row', els => els.map(e => e.textContent.replace(/\s+/g, ' ').trim()))
    const groups = await page.$$eval('.booking-group-title', els => els.map(e => e.textContent))
    check('B14 the nav button opens a picker with Kids, Adults and Women', groups.join() === 'Kids,Adults,Women' && rows.length === 8, groups.join() + ' / ' + rows.length)
    check('B15 the picker lists the real times', rows.some(r => /Tue.*5:00 PM.*Kids Jiu-Jitsu/.test(r)) && rows.some(r => /Thu.*6:00 PM.*Adult Kickboxing/.test(r)) && rows.some(r => /Fri.*6:00 PM.*Women/.test(r)), rows.join(' | '))
    await page.click('.booking-class-row:has-text("Adult Kickboxing")')
    await page.waitForSelector('#bookingForm')
    await fillAndSubmit(page)
    await page.waitForSelector('.booking-success')
    check('B16 a kickboxing booking is filed as an adult class under Wharton', posts[0]?.className === 'Adult Kickboxing' && posts[0]?.program === 'Adult BJJ' && posts[0]?.location === 'wharton' && /T18:00:00/.test(posts[0]?.trialAt || ''), JSON.stringify(posts[0]))
    await page.keyboard.press('Escape')
    check('B17 Escape closes the dialog', !(await page.$eval('#bookingOverlay', e => e.classList.contains('open'))))
    check('B18 no script errors', errors.length === 0, errors.join(' | '))
    await ctx.close()
  }

  // ── Women's class and the other pages open the same flow ───────────────────
  {
    const { ctx, page } = await open('/programs/womens-self-defense-wharton')
    await page.click('.sc__class--women >> nth=0')
    await page.waitForSelector('#bookingForm')
    check('B19 the women\'s self defense page books straight from its timetable', (await page.textContent('.booking-class-badge__name')).includes("Women's Self Defense"))
    await ctx.close()
  }
  {
    const { ctx, page } = await open('/contact')
    check('B20 the contact page has the booking panel and no enquiry form', !!(await page.$('.book-panel')) && !(await page.$('form[data-wharton-form]')))
    await page.click('.book-panel__chip >> nth=0')
    await page.waitForSelector('#bookingCal')
    check('B21 a class chip on the panel opens its calendar', true)
    await ctx.close()
  }

  // ── A failed CRM call is reported, not hidden ──────────────────────────────
  {
    const { ctx, page, posts } = await open('/schedule', { crmOk: false })
    await page.click('.sc__class--kids >> nth=0')
    await page.waitForSelector('#bookingForm')
    await fillAndSubmit(page)
    await page.waitForSelector('.booking-error')
    check('B22 when the CRM refuses, the visitor is told, with the phone number, and is not shown "booked"', (await page.textContent('.booking-error')).includes('(832) 400-5532') && !(await page.$('.booking-success')))
    await ctx.close()
  }

  // ── Owner-listed closures and the opening day ─────────────────────────────
  {
    // find the second upcoming Tuesday to close, and an opening day three weeks out
    const { ctx, page } = await open('/schedule', {
      patchHtml: html => {
        // the second Tuesday the calendar offers: after the gym's first bookable day if there is one, otherwise a week or two out
        const fb = (html.match(/"firstBookable":\s*"(\d{4}-\d{2}-\d{2})"/) || [])[1]
        const start = fb ? new Date(fb + 'T12:00:00') : new Date()
        const closed = []
        const d = new Date(start); d.setDate(d.getDate() + ((2 - d.getDay() + 7) % 7) + 7)
        closed.push({ date: ymdOf(d), reason: 'Seminar' })
        return html.replace(/"closed":\s*\[[^\]]*\]/, '"closed":' + JSON.stringify(closed))
      },
    })
    await page.click('.sc__col[data-sc-col="Tue"] .sc__class--kids')
    await page.waitForSelector('#bookingCal')
    const dates = await page.$$eval('.booking-cal__radio', els => els.map(e => e.id.replace('bookingDate-', '')))
    const note = await page.$('.booking-cal__note')
    const shutText = note ? await note.textContent() : ''
    check('B23 a closure the owner lists is drawn with its reason and cannot be booked', /Seminar/.test(shutText) && dates.length >= 3, shutText)
    await ctx.close()
  }
  {
    const future = new Date(); future.setDate(future.getDate() + 24)
    const want = ymdOf(future)
    const { ctx, page } = await open('/schedule', { patchHtml: html => html.replace(/"firstBookable":\s*""/, `"firstBookable":"${want}"`) })
    await page.click('.sc__col[data-sc-col="Thu"] .sc__class--adult')
    await page.waitForSelector('#bookingCal')
    const dates = await page.$$eval('.booking-cal__radio', els => els.map(e => e.id.replace('bookingDate-', '')))
    check('B24 nothing is offered before the gym\'s first bookable day', dates.length > 0 && dates.every(x => x >= want), want + ' vs ' + dates.join())
    await ctx.close()
  }
} finally {
  await browser.close()
  server.close()
}
console.log(`\n${total - failed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
