/**
 * The booking modal opens where the visitor already is.
 *
 * The flow lived in app.js, which only the front page loads, so the blog's
 * "Book a Free Trial →" pointed at labyrinth.vision/#contact: somebody who had
 * read to the end of an article and decided to come in was sent back to the
 * front page to find the booking button themselves. Moving it into booking.js
 * fixed that, and also put the front page's own booking behind a refactor, so
 * both are checked here.
 *
 * No booking is ever submitted: the CRM call is stubbed at the network layer.
 *
 *   node booking.test.mjs
 *
 * Needs playwright-core; set CHROME to override the browser path.
 */
import { chromium } from 'playwright-core'
import { createServer } from 'node:http'
import { readFileSync, existsSync } from 'node:fs'
import { extname, join } from 'node:path'

const ROOT = new URL('.', import.meta.url).pathname.replace(/\/$/, '')
const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.json': 'application/json', '.ico': 'image/x-icon',
  '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.mp4': 'video/mp4',
}
const server = createServer((req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0])
  let f = join(ROOT, p)
  if (p.endsWith('/')) f = join(f, 'index.html')
  if (!existsSync(f)) { res.statusCode = 404; res.end(''); return }
  try {
    res.setHeader('content-type', TYPES[extname(f)] ?? 'application/octet-stream')
    res.end(readFileSync(f))
  } catch { res.statusCode = 404; res.end('') }
})
await new Promise(r => server.listen(4641, '127.0.0.1', r))
const BASE = 'http://127.0.0.1:4641'

const browser = await chromium.launch({
  executablePath: process.env.CHROME ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-proxy-server'],
})
// SITE_TEST_NOW=2026-12-10T15:00:00Z node booking.test.mjs runs the whole suite as if it were that day (a test that pins its own clock still does), to prove that no check depends on which season
// the homepage happens to be wearing on the day somebody runs it.
if (process.env.SITE_TEST_NOW) { const nc = browser.newContext.bind(browser); browser.newContext = async o => { const c = await nc(o); await c.clock.setFixedTime(new Date(process.env.SITE_TEST_NOW)); return c } }

let failed = 0
const check = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  if (!ok) failed++
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${label}` +
    (ok ? '' : `\n          got ${JSON.stringify(got)}\n          want ${JSON.stringify(want)}`))
}

/**
 * A page with the CRM stubbed out and console errors collected.
 * `referer` is what the first page believes sent the visitor; `init` is a function (with `arg`) run in the page before any of its own
 * scripts, for seeding or breaking browser storage.
 * `viewport` is a { width, height } for a phone-sized page.
 */
async function open(path, { referer, init, arg, viewport } = {}) {
  const ctx = await browser.newContext(viewport ? { viewport } : {})
  const errors = []
  let posted = null
  if (init) await ctx.addInitScript(init, arg)
  // Order matters: Playwright matches routes in REVERSE registration order, so
  // the catch-all goes on first and the CRM stub last, or the catch-all eats it.
  // Anything else off-box (fonts, maps, sheets) is not what is under test.
  await ctx.route('**', route =>
    route.request().url().startsWith(BASE) ? route.continue() : route.abort())
  await ctx.route('**/functions/v1/book-trial', async route => {
    posted = JSON.parse(route.request().postData() ?? '{}')
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' })
  })
  const page = await ctx.newPage()
  page.on('pageerror', e => errors.push(String(e)))
  page.on('console', m => {
    // Resource failures are this harness blocking the network, not the page.
    if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text())
  })
  await page.goto(BASE + path, { waitUntil: 'domcontentloaded', ...(referer ? { referer } : {}) })
  await page.waitForTimeout(500)
  return { page, ctx, errors, posted: () => posted }
}

/** What the page has told Google so far: the conversion events (Arguments objects in dataLayer, so they are copied out). */
const conversions = (page) => page.evaluate(() => (window.dataLayer || []).map(e => Array.from(e))
  .filter(a => a[0] === 'event' && a[1] === 'conversion').map(a => a[2]))
/** Is the Google tag set up, and how many times? (The harness blocks the network, so only what the page itself did can be seen.) */
const googleSetup = (page) => page.evaluate(() => ({
  gtag: typeof window.gtag,
  configs: (window.dataLayer || []).map(e => Array.from(e)).filter(a => a[0] === 'config' && a[1] === 'AW-18504205012').length,
  scripts: [...document.scripts].filter(x => /googletagmanager\.com\/gtag\/js\?id=AW-18504205012/.test(x.src)).length,
}))

/** Open the adult list on whatever page this is, take the first class, fill the form (choosing from the menu when asked), submit; the note posted. */
async function bookFirstAdultClass(page, posted, { heard } = {}) {
  await page.evaluate(() => window.LabyrinthBooking.openAdultList())
  await page.waitForTimeout(250)
  await page.click('.booking-class-row')
  await page.waitForTimeout(250)
  await page.fill('#bookingName', 'Test Person')
  await page.fill('#bookingEmail', 'test@example.com')
  await page.fill('#bookingPhone', '2815550000')
  if (heard) await page.selectOption('#bookingHeard', heard)
  await page.click('#bookingSubmitBtn')
  await page.waitForTimeout(500)
  return posted().note
}
/** Go to another page of the same site, as a visitor browsing on would (nothing external sent them). */
const goOn = async (page, path, referer) => {
  await page.goto(BASE + path, { waitUntil: 'domcontentloaded', ...(referer ? { referer } : {}) })
  await page.waitForTimeout(300)
}

const isOpen = (page) => page.evaluate(() =>
  !!document.querySelector('.booking-overlay.open'))
const heading = (page) => page.evaluate(() =>
  (document.querySelector('#bookingContent h3') || {}).textContent || '')

// ── A blog post ──────────────────────────────────────────────────────────────
console.log('\nA blog post, the thing that was broken:')
{
  const { page, ctx, errors } = await open('/blog/is-bjj-good-for-adhd-kids.html')
  check('the page loads clean', errors, [])
  check('booking.js is present', await page.evaluate(() => typeof window.LabyrinthBooking), 'object')
  check('the modal starts closed', await isOpen(page), false)

  await page.click('.article-cta__btn')
  await page.waitForTimeout(250)
  check('the article CTA opens the modal', await isOpen(page), true)
  check('and it is the trial picker', await heading(page), 'Book Your Free Trial')
  check('without leaving the article',
    new URL(page.url()).pathname, '/blog/is-bjj-good-for-adhd-kids.html')

  // All the way through to a booking.
  await page.click('.booking-category-btn[data-category="adult"]')
  await page.waitForTimeout(200)
  const rows = await page.evaluate(() => document.querySelectorAll('.booking-class-row').length)
  check('adult classes are listed', rows > 5, true)
  await page.click('.booking-class-row')
  await page.waitForTimeout(200)
  check('picking one shows the form',
    await page.evaluate(() => !!document.getElementById('bookingForm')), true)

  await page.fill('#bookingName', 'Test Person')
  await page.fill('#bookingEmail', 'test@example.com')
  await page.fill('#bookingPhone', '2815550000')
  await page.click('#bookingSubmitBtn')
  await page.waitForTimeout(600)
  check('it reaches the success screen', await heading(page), 'You’re Booked!')

  // Google Ads. A blog post has no tag of its own, so booking.js sets it up, once.
  check('this page has no Google tag of its own, so booking.js set it up once',
    await googleSetup(page), { gtag: 'function', configs: 1, scripts: 1 })
  check('the saved booking is counted as exactly one Google Ads conversion', (await conversions(page)).length, 1)
  check('with the Booking conversion label and the fixed $1 the action is set to',
    (await conversions(page))[0], { send_to: 'AW-18504205012/cJvGCNeNupgdENSFv_dE', value: 1, currency: 'USD' })
  await ctx.close()
}

// ── Google Ads counts bookings that were saved, and only those ─────────────────
console.log('\nA booking the CRM did not save is not counted:')
{
  const { page, ctx, errors } = await open('/blog/is-bjj-good-for-adhd-kids.html')
  let saved = false
  await page.route('**/functions/v1/book-trial', route => route.fulfill({
    status: 200, contentType: 'application/json', body: saved ? '{"ok":true}' : '{"ok":false}' }))
  await page.click('.article-cta__btn')
  await page.waitForTimeout(250)
  await page.click('.booking-category-btn[data-category="adult"]')
  await page.waitForTimeout(200)
  await page.click('.booking-class-row')
  await page.waitForTimeout(200)
  await page.fill('#bookingName', 'Test Person')
  await page.fill('#bookingEmail', 'test@example.com')
  await page.fill('#bookingPhone', '2815550000')
  await page.click('#bookingSubmitBtn')
  await page.waitForTimeout(600)
  check('a booking the CRM refused shows the error', await heading(page), 'Something Went Wrong')
  check('and is not counted', (await conversions(page)).length, 0)
  saved = true
  await page.click('#bookingRetryBtn')
  await page.waitForTimeout(600)
  check('trying again and succeeding reaches the success screen', await heading(page), 'You’re Booked!')
  check('and the booking is counted once, not once per try', (await conversions(page)).length, 1)
  check('with no page errors', errors, [])
  await ctx.close()
}

// ── The blog nav and footer ──────────────────────────────────────────────────
console.log('\nThe other two booking links on a post:')
{
  for (const [what, sel] of [['nav', '.blog-nav__cta'], ['footer', '.blog-footer__links [data-book-trial]']]) {
    const { page, ctx } = await open('/blog/bjj-for-women.html')
    await page.click(sel)
    await page.waitForTimeout(250)
    check(`the ${what} link opens the modal`, await isOpen(page), true)
    await ctx.close()
  }
}

// ── With JavaScript off, they still reach a booking form ─────────────────────
console.log('\nEvery booking link still points somewhere useful without JS:')
{
  const html = readFileSync(join(ROOT, 'blog/bjj-for-women.html'), 'utf8')
  const hrefs = [...html.matchAll(/<a[^>]*data-book-trial[^>]*href="([^"]+)"/g)].map(m => m[1])
  const hrefsAfter = [...html.matchAll(/<a[^>]*href="([^"]+)"[^>]*data-book-trial/g)].map(m => m[1])
  const all = [...hrefs, ...hrefsAfter]
  check('all three are anchors with an href', all.length, 3)
  check('and they go to the front page booking hash',
    [...new Set(all)], ['https://labyrinth.vision/#book'])
}

// ── The front page, which the refactor moved out from under ──────────────────
console.log('\nThe front page still books, after the move:')
{
  const { page, ctx, errors } = await open('/index.html')
  check('the page loads clean', errors, [])
  check('the modal starts closed', await isOpen(page), false)

  // The nav's always-visible call to action.
  await page.click('nav .nav__cta')
  await page.waitForTimeout(300)
  check('the nav CTA opens the modal', await isOpen(page), true)
  const h = await heading(page)
  check('showing a class or a picker', h.length > 0, true)

  await page.keyboard.press('Escape')
  await page.waitForTimeout(200)
  check('Escape closes it', await isOpen(page), false)

  // A specific class off the schedule keeps its context. Every card on the
  // schedule is the button; take the first one that books straight to a form.
  await page.locator('.sc__class[data-book="form"]:visible').first().click()
  await page.waitForTimeout(300)
  check('a schedule button goes straight to the form',
    await page.evaluate(() => !!document.getElementById('bookingForm')), true)
  check('naming the class that was clicked',
    await page.evaluate(() =>
      (document.querySelector('.booking-class-badge__name') || {}).textContent?.length > 0), true)
  await ctx.close()
}

// ── Choosing WHICH Friday, on a calendar ────────────────────────────────────
//
// The form used to pin every booking to the next occurrence of the class's
// weekday and say so in a line of text. A parent who could not make this
// Friday had no way to say which one they could, so they either came on a day
// that did not suit them or did not come — and the academy never learned
// which. The soonest is still selected on open, so nothing changes for
// somebody who wants the next one.
console.log('\nPicking the date on a calendar:')
{
  const { page, ctx } = await open('/index.html')
  await page.evaluate(() => window.LabyrinthBooking.openForm('Kids BJJ Comp (7–12)', 'Gi', 'Fri', '5:15 PM'))
  await page.waitForTimeout(300)

  check('the form draws a month', await page.locator('.booking-cal__grid').count(), 1)
  check('the question names the day',
    (await page.textContent('.booking-cal__legend')).trim(), 'Which Friday?')
  check('with a weekday header row', await page.locator('.booking-cal__dow').count(), 7)

  // Every day of the month is drawn, so the shape is the familiar one.
  const shown = await page.evaluate(() => {
    const cells = [...document.querySelectorAll('.booking-cal__day')]
    const m = document.querySelector('.booking-cal__month').textContent.trim()
    return { cells: cells.length, month: m,
             open: [...document.querySelectorAll('.booking-cal__day--open')].map(c => c.textContent.replace(/\D+/g, ' ').trim().split(' ')[0]) }
  })
  const daysInMonth = await page.evaluate(() => {
    const [name, yr] = document.querySelector('.booking-cal__month').textContent.trim().split(' ')
    const mi = ['January','February','March','April','May','June','July','August','September','October','November','December'].indexOf(name)
    return new Date(Number(yr), mi + 1, 0).getDate()
  })
  check('every day of the month is drawn', shown.cells, daysInMonth)

  // Only the class's own weekday is selectable.
  check('only Fridays are bookable', await page.evaluate(() => {
    const opens = [...document.querySelectorAll('.booking-cal__day--open')]
    return opens.every(l => {
      const v = document.getElementById(l.getAttribute('for')).value
      return v.startsWith('Friday,')
    })
  }), true)
  check('and the other days are not controls', await page.evaluate(() =>
    document.querySelectorAll('.booking-cal__day--off button, .booking-cal__day--off input').length), 0)

  // The soonest is preselected, so the fast path is unchanged.
  const soonest = await page.evaluate(() => {
    const d = window.LabyrinthBooking.nextDate('Fri', '5:15 PM')
    const p = n => (n < 10 ? '0' : '') + n
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
  })
  check('the soonest class is chosen on open', await page.evaluate(() => {
    const r = document.querySelector('input[name="bookingDate"]:checked')
    return r ? r.id.replace('bookingDate-', '') : null
  }), soonest)

  // Nothing in the past, and nothing beyond the booking horizon.
  check('no day before the soonest is offered', await page.evaluate(s => {
    return [...document.querySelectorAll('input[name="bookingDate"]')]
      .every(r => r.id.replace('bookingDate-', '') >= s)
  }, soonest), true)

  // Paging to the next month keeps the choice made in this one.
  await page.click('[data-cal-move="1"]')
  await page.waitForTimeout(200)
  const monthAfter = await page.textContent('.booking-cal__month')
  check('the next-month arrow moves the calendar', monthAfter.trim() !== shown.month, true)
  check('and the earlier choice survives being off screen', await page.evaluate(() =>
    document.querySelectorAll('input[name="bookingDate"]:checked').length), 0)

  await page.click('[data-cal-move="-1"]')
  await page.waitForTimeout(200)
  check('coming back shows it still chosen', await page.evaluate(() => {
    const r = document.querySelector('input[name="bookingDate"]:checked')
    return r ? r.id.replace('bookingDate-', '') : null
  }), soonest)

  // You cannot page back before the soonest bookable class.
  check('there is no paging into the past', await page.evaluate(() =>
    document.querySelector('[data-cal-move="-1"]').disabled), true)

  // Pick a later Friday and confirm THAT is what gets submitted.
  let sent = null
  await page.route('**/functions/v1/book-trial', route => {
    sent = JSON.parse(route.request().postData() || '{}')
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' })
  })
  /* Page forward to find one. The month the form opens on can hold only a
     single remaining class — late September has one Friday left — so a test
     that assumed two in view passed for eleven months of the year and failed
     in the twelfth. */
  let later = await page.evaluate(s => {
    const rs = [...document.querySelectorAll('input[name="bookingDate"]')]
      .map(r => r.id.replace('bookingDate-', '')).filter(k => k !== s)
    return rs[0] || null
  }, soonest)
  if (!later) {
    await page.click('[data-cal-move="1"]')
    await page.waitForTimeout(200)
    later = await page.evaluate(() => {
      const r = document.querySelector('input[name="bookingDate"]')
      return r ? r.id.replace('bookingDate-', '') : null
    })
  }
  check('a later class can be reached', typeof later === 'string' && later > soonest, true)
  const laterLong = await page.evaluate(k => document.getElementById('bookingDate-' + k).value, later)
  await page.locator(`label[for="bookingDate-${later}"]`).click()
  await page.waitForTimeout(150)
  await page.fill('#bookingName', 'Test Parent')
  await page.fill('#bookingEmail', 'parent@example.com')
  await page.fill('#bookingPhone', '(281) 555-0000')
  await page.click('#bookingSubmitBtn')
  await page.waitForTimeout(800)

  check('the chosen date is what reaches the CRM',
    sent && sent.trialAt ? sent.trialAt.slice(0, 10) : sent, later)
  check('and it is not the soonest one', later !== soonest, true)
  check('the confirmation names the date they picked',
    (await page.textContent('.booking-success__detail') || '').includes(laterLong.replace(/^[A-Za-z]+, /, '')), true)

  await page.unroute('**/functions/v1/book-trial')
  await ctx.close()
}

// ── The academy is shut on federal holidays ─────────────────────────────────
//
// The calendar would otherwise offer Christmas Day if it fell on a Friday, and
// a wider date range makes that easier to hit than it used to be.
console.log('\nHolidays are not offered:')
{
  const { page, ctx } = await open('/index.html')
  // This block is about Thanksgiving 2026: the calendar shows November 2026 only from a day before it, and "the other Thursdays still are" needs three of them still ahead.
  // So it runs on a day of its own whatever day the suite is run on (Monday, October 12, 2026: Thanksgiving is six weeks out, inside the twelve-week horizon).
  await ctx.clock.setFixedTime(new Date('2026-10-12T15:00:00Z'))

  // The arithmetic, against the published dates. Computed rather than listed
  // because everything but the five fixed dates moves each year — a hardcoded
  // table is right until January and then books people into a shut gym.
  const holidays = await page.evaluate(() => {
    const p = n => (n < 10 ? '0' : '') + n
    const ymd = d => d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
    return window.LabyrinthBooking.holidays(2027).map(ymd)
  })
  check('the eleven federal holidays, for 2027', holidays, [
    '2027-01-01', '2027-01-18', '2027-02-15', '2027-05-31', '2027-06-19',
    '2027-07-04', '2027-09-06', '2027-10-11', '2027-11-11', '2027-11-25', '2027-12-25',
  ])

  /* A holiday that lands on a class day INSIDE the booking horizon.
     Thanksgiving is always a Thursday and there is a Thursday class, so this
     is the case a real visitor meets. Christmas 2026 is also a Friday, but it
     falls past the twelve-week horizon from most of the year — a day that is
     simply not open yet is dimmed like any other, which is a different state
     from closed and would make this assertion pass or fail by the calendar
     date the suite happens to run on. */
  const thanksgiving = await page.evaluate(() => {
    const p = n => (n < 10 ? '0' : '') + n
    const d = window.LabyrinthBooking.holidays(2026)[9]
    return { key: d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()), day: d.getDay() }
  })
  check('Thanksgiving 2026 is a Thursday', [thanksgiving.key, thanksgiving.day], ['2026-11-26', 4])

  await page.evaluate(() => window.LabyrinthBooking.openForm('Adult BJJ', 'No-Gi', 'Thu', '6:30 PM'))
  await page.waitForTimeout(300)
  let reached = false
  for (let i = 0; i < 12; i++) {
    if ((await page.textContent('.booking-cal__month')).trim() === 'November 2026') { reached = true; break }
    const nav = page.locator('[data-cal-move="1"]')
    if (await nav.isDisabled()) break
    await nav.click(); await page.waitForTimeout(120)
  }
  check('November 2026 is reachable', reached, true)
  const nov = await page.evaluate(() => ({
    shut: [...document.querySelectorAll('.booking-cal__day--shut')].map(e => e.textContent.trim()),
    open: [...document.querySelectorAll('.booking-cal__day--open')].map(e => e.textContent.replace(/\D+/g, ' ').trim().split(' ')[0]),
  }))
  check('Thanksgiving is drawn, not missing', nov.shut.includes('26'), true)
  check('and it is not bookable', nov.open.includes('26'), false)
  check('the other Thursdays that month still are', nov.open.length >= 3, true)
  // Named under the grid: a struck-through two-digit number is easy to miss on
  // a phone and says nothing about why the class is not there.
  check('and the reason is spelled out under the calendar',
    (await page.textContent('.booking-cal__note') || '').trim(), 'Closed Nov 26 \u2014 Thanksgiving')

  // Whatever month is on screen, nothing shut is ever a control.
  check('no bookable day is a holiday', await page.evaluate(() => {
    const p = n => (n < 10 ? '0' : '') + n
    const ymd = d => d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
    const shut = new Set()
    for (const y of [2026, 2027]) window.LabyrinthBooking.holidays(y).forEach(h => shut.add(ymd(h)))
    return [...document.querySelectorAll('input[name="bookingDate"]')]
      .every(r => !shut.has(r.id.replace('bookingDate-', '')))
  }), true)

  // And the list the form derives its default from skips them too, so the
  // preselected date can never be a day the academy is closed.
  check('the offered run skips holidays', await page.evaluate(() => {
    const p = n => (n < 10 ? '0' : '') + n
    const ymd = d => d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
    const shut = new Set()
    for (const y of [2026, 2027]) window.LabyrinthBooking.holidays(y).forEach(h => shut.add(ymd(h)))
    return window.LabyrinthBooking.upcomingDates('Fri', '5:15 PM').every(d => !shut.has(ymd(d)))
  }), true)

  await ctx.close()
}

// ── A day that runs differently ──────────────────────────────────────────────
//
// Saturday, October 24, 2026 is the Rolling for Ribbons seminar: the 9:00 workout still runs, an open mat follows, the seminar takes the 11:00 hour, and the regular 10:00, 11:00 and 12:00
// classes are off (scripts/schedule_data.py SPECIAL_DAYS; booking.js CLASS_OFF). Nobody may book a trial into a class that is not running that day, and the workout, which is running, stays
// bookable. The academy is open, so this is not a closed day: it is the classes that are off, drawn and explained like one. This runs at 8:00 AM Central that Saturday, whatever day the
// suite is run on.
console.log('\nA day that runs differently (Saturday, October 24, 2026):')
{
  const { page, ctx } = await open('/index.html')
  await ctx.clock.setFixedTime(new Date('2026-10-24T13:00:00Z'))
  const dates = await page.evaluate(() => {
    const p = n => (n < 10 ? '0' : '') + n
    const ymd = d => d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
    const B = window.LabyrinthBooking
    const first = (day, t) => ymd(B.upcomingDates(day, t)[0])
    return {
      workout: first('Sat', '9:00 AM'), kids: first('Sat', '10:00 AM'), adult: first('Sat', '11:00 AM'), noon: first('Sat', '12:00 PM'), sunday: first('Sun', '10:30 AM'),
      why: ['9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM'].map(t => B.classOff(new Date(2026, 9, 24), t)),
      nextSaturday: B.classOff(new Date(2026, 9, 31), '11:00 AM'), noTime: B.classOff(new Date(2026, 9, 24)), table: B.classOffDates,
    }
  })
  check('the 9:00 workout is still offered that morning; the 10:00, 11:00 and 12:00 classes are offered a week on, and Sunday is untouched',
    [dates.workout, dates.kids, dates.adult, dates.noon, dates.sunday], ['2026-10-24', '2026-10-31', '2026-10-31', '2026-10-31', '2026-10-25'])
  check('the reason is given for the classes that are off, and for them only',
    [dates.why, dates.nextSaturday, dates.noTime], [[null, 'Rolling for Ribbons day', 'Rolling for Ribbons day', 'Rolling for Ribbons day'], null, null])
  check('the table is exposed for the test of its agreement with scripts/schedule_data.py',
    dates.table, { '2026-10-24': { why: 'Rolling for Ribbons day', times: ['10:00 AM', '11:00 AM', '12:00 PM'] } })

  // The calendar of a class that is off: the day is drawn, not a control, and the words under the grid say why.
  await page.evaluate(() => window.LabyrinthBooking.openForm('Adult & Teens', 'No-Gi', 'Sat', '11:00 AM'))
  await page.waitForTimeout(300)
  const off = await page.evaluate(() => ({
    month: document.querySelector('.booking-cal__month')?.textContent.trim(),
    checked: document.querySelector('input[name="bookingDate"]:checked')?.id,
    shut: [...document.querySelectorAll('.booking-cal__day--shut')].map(e => [e.textContent.trim(), e.getAttribute('title')]),
    controls: [...document.querySelectorAll('input[name="bookingDate"]')].map(r => r.id.replace('bookingDate-', '')),
    notes: [...document.querySelectorAll('.booking-cal__note')].map(e => e.textContent.trim()),
  }))
  check('the 11:00 class opens on the Saturday after, not on the day it is off', [off.month, off.checked], ['October 2026', 'bookingDate-2026-10-31'])
  check('October 24 is drawn but is not a control, and says why when it is looked at',
    [off.shut, off.controls.includes('2026-10-24'), off.controls.includes('2026-10-31')], [[['24', 'No class — Rolling for Ribbons day']], false, true])
  check('and the reason is spelled out under the calendar, as it is for a holiday',
    off.notes, ['No class Oct 24 — Rolling for Ribbons day'])
  await page.evaluate(() => window.LabyrinthBooking.close())

  // A page that already knows the day (the Pink October calendar) may ask for it: it is not honoured for a class that is off.
  await page.evaluate(() => window.LabyrinthBooking.openForm('Adult & Teens', 'No-Gi', 'Sat', '11:00 AM', '2026-10-24'))
  await page.waitForTimeout(300)
  check('a calendar asking for the day a class is off gets the next one instead',
    await page.evaluate(() => document.querySelector('input[name="bookingDate"]:checked')?.id), 'bookingDate-2026-10-31')
  await page.evaluate(() => window.LabyrinthBooking.close())

  // The workout, which is running, can be booked that very morning, and its calendar has nothing to explain.
  await page.evaluate(() => window.LabyrinthBooking.openForm('MMA Conditioning', '', 'Sat', '9:00 AM'))
  await page.waitForTimeout(300)
  const work = await page.evaluate(() => ({
    checked: document.querySelector('input[name="bookingDate"]:checked')?.id,
    shut: document.querySelectorAll('.booking-cal__day--shut').length, notes: document.querySelectorAll('.booking-cal__note').length,
  }))
  check('the 9:00 workout opens on October 24 itself, with no day crossed out and nothing to explain', work, { checked: 'bookingDate-2026-10-24', shut: 0, notes: 0 })
  await page.evaluate(() => window.LabyrinthBooking.close())

  // The kids trial list says the same: the 10:00 class is a week away, the workout is today.
  await page.evaluate(() => window.LabyrinthBooking.openKidsTrials())
  await page.waitForSelector('.booking-kidstrial-class__btn')
  const sat = await page.evaluate(() => [...document.querySelectorAll('.booking-kidstrial-day[data-day="Sat"] .booking-kidstrial-class')]
    .map(r => `${r.querySelector('.booking-kidstrial-class__name')?.textContent} ${r.querySelector('.booking-kidstrial-class__date')?.textContent}`))
  check('the kids trial list has the workout today and the 10:00 class on October 31', sat, ['MMA Conditioning (all ages) Next: today', 'Kids Grappling (7–12) Next: Oct 31'])
  await page.evaluate(() => window.LabyrinthBooking.close())

  // Once the day has passed it does nothing: on the Sunday every Saturday class is offered the Saturday after (October 31), as any week.
  await ctx.clock.setFixedTime(new Date('2026-10-25T15:00:00Z'))
  const after = await page.evaluate(() => {
    const p = n => (n < 10 ? '0' : '') + n
    const ymd = d => d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
    return ['9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM'].map(t => ymd(window.LabyrinthBooking.upcomingDates('Sat', t)[0]))
  })
  check('the day after, every Saturday class is offered on October 31', after, ['2026-10-31', '2026-10-31', '2026-10-31', '2026-10-31'])
  await ctx.close()
}

// ── Kids can try a class on any day of the week ──────────────────────────────
//
// Kids trials were Friday afternoon and Saturday morning, and the picker was
// five rows under a paragraph saying so. Membership is open and a child can
// start on any day, so the picker is every class a new child may start in,
// grouped under the day it runs with the soonest day first, and the date beside
// each class is the date the form will open on. This runs on a Friday evening
// with Labor Day on the Monday, so the order, today, tomorrow, and a shut Monday
// being skipped rather than promised are all in view at once.
console.log('\nKids can try a class on any day of the week:')
{
  const { page, ctx, errors, posted } = await open('/index.html')
  // Friday, September 4, 2026, 5:00 PM Central: the 4:45 class has started (so it is next Friday), the 5:15 classes have not (so they are today), Saturday is tomorrow, and Monday the 7th is Labor Day.
  await ctx.clock.setFixedTime(new Date('2026-09-04T22:00:00Z'))
  await page.evaluate(() => window.LabyrinthBooking.openKidsTrials())
  await page.waitForSelector('.booking-kidstrial-class__btn')

  const pick = await page.evaluate(() => ({
    heading: document.querySelector('#bookingContent h3')?.textContent,
    sub: document.querySelector('#bookingContent .booking-step-header p')?.textContent,
    days: [...document.querySelectorAll('.booking-kidstrial-day')].map(d => ({
      day: d.getAttribute('data-day'),
      title: d.querySelector('.booking-kidstrial-day__name')?.textContent,
      rows: [...d.querySelectorAll('.booking-kidstrial-class')].map(r => ({
        name: r.querySelector('.booking-kidstrial-class__name')?.textContent,
        time: r.querySelector('.booking-kidstrial-class__time')?.textContent,
        next: r.querySelector('.booking-kidstrial-class__date')?.textContent,
        label: r.querySelector('.booking-kidstrial-class__btn')?.getAttribute('aria-label'),
      })),
    })),
    buttons: document.querySelectorAll('.booking-kidstrial-class__btn').length,
    listed: window.LabyrinthBooking.kidsTrialClasses.length,
  }))
  const byDay = Object.fromEntries(pick.days.map(d => [d.day, d]))
  const nexts = d => byDay[d].rows.map(r => r.next)

  check('it is the kids trial list, and says trials are free on any day', [pick.heading, pick.sub], ['Kids Trials', 'Free, on any day of the week'])
  check('the days come in the order they come round: Friday is today, Monday is after Labor Day',
    pick.days.map(d => d.day), ['Fri', 'Sat', 'Sun', 'Tue', 'Wed', 'Thu', 'Mon'])
  check('each day is headed by its name', pick.days.map(d => d.title),
    ['Friday', 'Saturday', 'Sunday', 'Tuesday', 'Wednesday', 'Thursday', 'Monday'])
  check('every class a new child may start in is there once, each with a button', [pick.buttons, pick.days.flatMap(d => d.rows).length], [pick.listed, pick.listed])
  check('and that is sixteen classes across all seven days', [pick.listed, pick.days.length], [16, 7])
  check('Friday: the 4:45 that has started is next Friday, the 5:15s are today',
    nexts('Fri'), ['Next: Sep 11', 'Next: today', 'Next: today'])
  check('Saturday is tomorrow', nexts('Sat'), ['Next: tomorrow', 'Next: tomorrow'])
  check('Sunday is the 6th', nexts('Sun'), ['Next: Sep 6'])
  check('Tuesday to Thursday are the 8th to the 10th',
    [nexts('Tue'), nexts('Wed'), nexts('Thu')],
    [['Next: Sep 8'], ['Next: Sep 9', 'Next: Sep 9', 'Next: Sep 9', 'Next: Sep 9'], ['Next: Sep 10', 'Next: Sep 10']])
  check('Monday is Labor Day, so Monday’s classes say the 14th and never the 7th',
    nexts('Mon'), ['Next: Sep 14', 'Next: Sep 14', 'Next: Sep 14'])

  // Who is on it, by day: the class a child of any age can start in on every day, and nothing that needs a belt.
  const names = d => byDay[d].rows.map(r => r.name)
  check('Monday and Wednesday: the three Gi groups, and wrestling on Wednesday evening',
    [names('Mon'), names('Wed')],
    [['Kids BJJ (3–6)', 'Kids BJJ (7–12)', 'Teens BJJ (12–15)'],
     ['Kids BJJ (3–6)', 'Kids BJJ (7–12)', 'Teens BJJ (12–15)', 'Youth Wrestling (7–17)']])
  check('Tuesday is strength and conditioning for all ages, and the advanced grappling class is not offered',
    names('Tue'), ['Strength & Conditioning (all ages)'])
  check('Thursday is strength and conditioning and wrestling, not the advanced grappling',
    names('Thu'), ['Strength & Conditioning (all ages)', 'Youth Wrestling (7–17)'])
  check('Friday keeps its three Gi classes', names('Fri'), ['Kids BJJ (3–6)', 'Kids BJJ Comp (7–12)', 'Teens BJJ Comp (12–15)'])
  check('Saturday morning is MMA conditioning and the 10:00 No-Gi, and not the noon advanced classes',
    byDay.Sat.rows.map(r => `${r.name} ${r.time}`), ['MMA Conditioning (all ages) 9:00 AM', 'Kids Grappling (7–12) 10:00 AM, No-Gi'])
  check('Sunday is youth wrestling', names('Sun'), ['Youth Wrestling (7–17)'])
  check('no class is shown with a dangling comma after its time',
    pick.days.flatMap(d => d.rows).every(r => !/[,\s]$/.test(r.time)), true)
  const labels = pick.days.flatMap(d => d.rows.map(r => r.label))
  check('sixteen identical buttons are told apart by their labels',
    [new Set(labels).size, labels.includes('Book Kids BJJ (3–6), Monday at 4:45 PM')], [16, true])

  // All the way through for every class on the list: the picker's own button,
  // the form it opens, and what actually reaches the CRM.
  const groupOf = n => /Wrestling/.test(n) ? 'Wrestling' : /^MMA/.test(n) ? 'MMA Conditioning'
    : /^Strength/.test(n) ? 'Strength & Conditioning' : /^Teens/.test(n) ? 'Teens'
    : /\(3–6\)/.test(n) ? 'Kids 3-6' : 'Kids 7-12'
  const filed = []
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  for (let i = 0; i < pick.listed; i++) {
    await page.evaluate(() => window.LabyrinthBooking.openKidsTrials())
    await page.waitForSelector(`.booking-kidstrial-class__btn[data-kid-idx="${i}"]`)
    const cls = await page.evaluate(i => window.LabyrinthBooking.kidsTrialClasses[i], i)
    await page.click(`.booking-kidstrial-class__btn[data-kid-idx="${i}"]`)
    await page.waitForSelector('#bookingForm')
    const form = await page.evaluate(() => ({
      name: document.querySelector('.booking-class-badge__name')?.textContent,
      when: document.querySelector('.booking-class-info__datetime')?.textContent,
      date: document.querySelector('input[name="bookingDate"]:checked')?.value,
    }))
    await page.fill('#bookingName', 'Test Parent')
    await page.fill('#bookingEmail', 'test@example.com')
    await page.fill('#bookingPhone', '2815550000')
    // The success screen is the end of this booking: the stub has answered and the page has drawn the reply. Moving on any sooner lets that
    // screen replace the next list. Each booking the stub receives is a new object, so a stale one is told from this one.
    const before = posted()
    await page.click('#bookingSubmitBtn')
    await page.waitForSelector('.booking-success')
    const sent = posted() === before ? null : posted()
    const [, month, day, year] = form.date.match(/^\w+, (\w+) (\d+), (\d+)$/)
    const iso = `${year}-${String(MONTHS.indexOf(month) + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    filed.push({ cls: `${cls.day} ${cls.time} ${cls.name}`, form: `${form.name} | ${form.when}`,
      ok: form.name === cls.name && sent?.program === groupOf(cls.name)
        && (sent?.trialAt ?? '').startsWith(iso) && (sent?.note ?? '').includes(cls.name),
      got: `${sent?.program} @ ${sent?.trialAt}` })
  }
  check('every one books into its own class and is filed under its own group, on the date the list promised',
    filed.filter(f => !f.ok), [])
  check('the first Monday class is the 14th, 4:45 PM Central, filed as Kids 3-6',
    filed.find(f => f.cls.startsWith('Mon 4:45 PM'))?.got.startsWith('Kids 3-6 @ 2026-09-14T16:45:00'), true)
  check('and the page is clean throughout', errors, [])
  await ctx.close()
}

// The timetable sends a child to the right place from either kind of card.
console.log('\nThe timetable and the kids list agree:')
{
  const { page, ctx } = await open('/index.html')
  await ctx.clock.setFixedTime(new Date('2026-09-04T22:00:00Z'))
  const kind = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('.sc__class[data-aud="kids"]')]
    const list = new Set(window.LabyrinthBooking.kidsTrialClasses.map(c => `${c.name}|${c.day}|${c.time}`))
    return {
      kids: cards.length,
      // A kids card books straight to a form exactly when its class is on the list.
      agree: cards.every(c => (c.getAttribute('data-book') === 'form') === list.has(`${c.getAttribute('data-name')}|${c.getAttribute('data-day')}|${c.getAttribute('data-time')}`)),
      kidsMode: cards.filter(c => c.getAttribute('data-book') === 'kids').map(c => c.textContent).every(t => /Advanced/.test(t)),
      kidsModeCount: cards.filter(c => c.getAttribute('data-book') === 'kids').length,
    }
  })
  check('every kids class on the timetable books straight to a form exactly when the list offers it',
    [kind.kids > 10, kind.agree], [true, true])
  check('and the six that send you to the list are the advanced ones', [kind.kidsModeCount, kind.kidsMode], [6, true])

  await page.locator('.sc__class[data-book="kids"]:visible').first().click()
  await page.waitForTimeout(300)
  check('an advanced class opens the list of classes a new child can start in, not a form',
    await page.evaluate(() => [document.querySelectorAll('.booking-kidstrial-day').length, !!document.getElementById('bookingForm')]), [7, false])
  await page.keyboard.press('Escape')
  await page.waitForTimeout(200)

  await page.locator('.sc__class[data-day="Mon"][data-name="Kids BJJ (3–6)"]').first().click()
  await page.waitForTimeout(300)
  check('a Monday kids class books straight to its form, which says Monday',
    await page.evaluate(() => [document.querySelector('.booking-class-badge__name')?.textContent, document.querySelector('.booking-class-info__datetime')?.textContent]),
    ['Kids BJJ (3–6)', 'Monday at 4:45 PM'])
  await ctx.close()
}

// A phone: sixteen rows must not be wider than the screen or push a button out of its row.
console.log('\nThe kids list on a phone:')
{
  const { page, ctx } = await open('/index.html', { viewport: { width: 375, height: 667 } })
  await page.evaluate(() => window.LabyrinthBooking.openKidsTrials())
  await page.waitForTimeout(400)
  const fit = await page.evaluate(() => {
    const modal = document.querySelector('.booking-modal')
    const rows = [...document.querySelectorAll('.booking-kidstrial-class')]
    const bad = []
    rows.forEach((r, i) => {
      const rb = r.getBoundingClientRect(), info = r.querySelector('.booking-kidstrial-class__info').getBoundingClientRect(),
        btn = r.querySelector('.booking-kidstrial-class__btn').getBoundingClientRect()
      if (btn.right > rb.right + 0.5 || btn.left < rb.left - 0.5) bad.push(`row ${i}: the button is outside its row`)
      if (info.right > btn.left + 0.5) bad.push(`row ${i}: the text runs under the button`)
      if (rb.right > window.innerWidth + 0.5) bad.push(`row ${i}: wider than the screen`)
    })
    return { rows: rows.length, bad, sideways: modal.scrollWidth > modal.clientWidth + 1 }
  })
  check('sixteen rows, each with its button inside it and clear of the text', [fit.rows, fit.bad], [16, []])
  check('and nothing scrolls sideways', fit.sideways, false)
  await ctx.close()
}

// ── /#book opens the picker on arrival ───────────────────────────────────────
console.log('\nArriving at the front page on #book:')
{
  const { page, ctx } = await open('/index.html#book')
  check('the picker is already open', await isOpen(page), true)
  check('and it is the picker', await heading(page), 'Book Your Free Trial')
  check('the front page keeps Google\'s own snippet, and booking.js does not set the tag up a second time',
    await googleSetup(page), { gtag: 'function', configs: 1, scripts: 1 })
  await ctx.close()
}

// ── The front page's own booking calendar ────────────────────────────────────
//
// "Your first class" was a contact form: name, email, phone, a program menu and a message, and nothing was booked, so everyone who
// used it was an enquiry somebody had to chase for a time, while the popup beside it booked people straight onto the schedule. The
// section is the booking flow now, drawn into the page (makeBooker in booking.js): the same choice of program, list of classes,
// calendar and details, and the same CRM call, note and Google Ads conversion. What is guarded here is that it really is the same
// flow, that the two copies on one page stay out of each other's way, and that the section's own text styles do not reach into it.
console.log('\nThe front page\'s own booking calendar:')

/** The heading of the step the page's own copy is on. */
const stageHeading = (page) => page.evaluate(() => document.querySelector('#bookingInline h3')?.textContent ?? '')
/** Fill in the page copy's details form. Its ids carry their own prefix, so they never meet the popup's. */
async function fillStage(page, { heard } = {}) {
  await page.fill('#trialBookingName', 'Test Person')
  await page.fill('#trialBookingEmail', 'test@example.com')
  await page.fill('#trialBookingPhone', '2815550000')
  if (heard) await page.selectOption('#trialBookingHeard', heard)
}

{
  const { page, ctx, errors } = await open('/index.html')
  check('the page loads clean', errors, [])
  check('"Reserve Your Free Class" is not a contact form any more',
    await page.evaluate(() => document.querySelectorAll('#contact form, #contact select, #contact textarea, #contactForm, #formSuccess').length), 0)
  check('the section starts at the choice of program, as a labelled region',
    await page.evaluate(() => { const r = document.getElementById('bookingInline'); return [r.getAttribute('role'), r.getAttribute('aria-label'), r.querySelector('h3')?.textContent] }),
    ['region', 'Book a free class', 'Book Your Free Trial'])
  check('with adult classes and kids to choose between',
    await page.evaluate(() => [...document.querySelectorAll('#bookingInline .booking-category-btn')].map(b => b.dataset.category)), ['adult', 'kids'])
  check('drawing it on load opens no popup and takes neither the focus nor the scroll',
    await page.evaluate(() => [!!document.querySelector('.booking-overlay.open'), document.activeElement === document.body, Math.round(window.scrollY)]), [false, true, 0])
  await ctx.close()
}

// Booked through the page, it is the booking the popup makes.
{
  const url = '/index.html?utm_source=Instagram&utm_campaign=adult-ad'
  const a = await open(url)
  await a.page.click('#bookingInline .booking-category-btn[data-category="adult"]')
  await a.page.waitForTimeout(250)
  check('the adult classes are listed in the page, and the popup stays shut',
    [(await a.page.locator('#bookingInline .booking-class-row').count()) > 5, await isOpen(a.page)], [true, false])
  check('the new step has the keyboard focus, on its heading',
    await a.page.evaluate(() => document.activeElement?.textContent), 'Adult Classes')
  await a.page.click('#bookingInline .booking-back-btn')
  await a.page.waitForTimeout(250)
  check('Back goes to the choice of program', await stageHeading(a.page), 'Book Your Free Trial')
  await a.page.click('#bookingInline .booking-category-btn[data-category="adult"]')
  await a.page.waitForTimeout(250)
  await a.page.click('#bookingInline .booking-class-row >> nth=0')
  await a.page.waitForTimeout(250)
  check('picking a class draws its form in the page, with ids of its own',
    await a.page.evaluate(() => [!!document.getElementById('trialBookingForm'), !!document.getElementById('bookingForm')]), [true, false])
  check('and a calendar, with the soonest day of that class chosen',
    await a.page.evaluate(() => [document.querySelectorAll('#bookingInline .booking-cal__grid').length, document.querySelectorAll('#bookingInline input[name="trialBookingDate"]:checked').length]), [1, 1])
  await a.page.click('#bookingInline .booking-back-btn')
  await a.page.waitForTimeout(250)
  check('Back from the form goes to the list the class came from', await stageHeading(a.page), 'Adult Classes')
  await a.page.click('#bookingInline .booking-class-row >> nth=0')
  await a.page.waitForTimeout(250)
  await fillStage(a.page, { heard: 'instagram' })
  await a.page.click('#trialBookingSubmitBtn')
  await a.page.waitForTimeout(500)
  check('a saved booking says so, in the page', [await stageHeading(a.page), await isOpen(a.page)], ['You’re Booked!', false])
  check('and is counted as exactly one Google Ads conversion', (await conversions(a.page)).length, 1)
  const fromPage = a.posted()

  const b = await open(url)
  await b.page.evaluate(() => window.LabyrinthBooking.openAdultList())
  await b.page.waitForTimeout(250)
  await b.page.click('#bookingContent .booking-class-row >> nth=0')
  await b.page.waitForTimeout(250)
  await b.page.fill('#bookingName', 'Test Person')
  await b.page.fill('#bookingEmail', 'test@example.com')
  await b.page.fill('#bookingPhone', '2815550000')
  await b.page.selectOption('#bookingHeard', 'instagram')
  await b.page.click('#bookingSubmitBtn')
  await b.page.waitForTimeout(500)
  check('what the page sends is, field for field, what the popup sends for the same class and person', fromPage, b.posted())
  check('with the class, where the visit came from and what they said, in the note',
    fromPage.note.endsWith('. Came from: instagram / adult-ad. Heard about us: Instagram.'), true)
  check('and a program and a time, so the lead arrives as a booked trial',
    [typeof fromPage.program, /^\d{4}-\d\d-\d\dT\d\d:\d\d/.test(fromPage.trialAt)], ['string', true])
  check('and neither page had an error', [a.errors, b.errors], [[], []])

  await a.page.click('#trialBookingSuccessClose')
  await a.page.waitForTimeout(250)
  check('"Book another class" starts again at the choice of program', await stageHeading(a.page), 'Book Your Free Trial')
  await a.ctx.close()
  await b.ctx.close()
}

// Kids & Teens: the list for every day, a way back, and the right group at the CRM.
{
  const { page, ctx, errors, posted } = await open('/index.html')
  await page.click('#bookingInline .booking-category-btn[data-category="kids"]')
  await page.waitForTimeout(250)
  check('the kids list is in the page: a section for each day of the week, sixteen classes, no popup',
    await page.evaluate(() => [document.querySelectorAll('#bookingInline .booking-kidstrial-day').length,
      document.querySelectorAll('#bookingInline .booking-kidstrial-class__btn').length, !!document.querySelector('.booking-overlay.open')]), [7, 16, false])
  await page.click('#bookingInline .booking-back-btn')
  await page.waitForTimeout(250)
  check('Back goes to the choice of program', await stageHeading(page), 'Book Your Free Trial')
  await page.click('#bookingInline .booking-category-btn[data-category="kids"]')
  await page.waitForTimeout(250)
  await page.click('#bookingInline .booking-kidstrial-class__btn[data-kid-idx="2"]')
  await page.waitForTimeout(250)
  const cls = await page.evaluate(() => window.LabyrinthBooking.kidsTrialClasses[2])
  check('a class opens its form, naming that class',
    await page.evaluate(() => document.querySelector('#bookingInline .booking-class-badge__name')?.textContent), cls.name)
  await page.click('#bookingInline .booking-back-btn')
  await page.waitForTimeout(250)
  check('and Back from the form goes to the kids list, not to the start', await stageHeading(page), 'Kids Trials')
  await page.click('#bookingInline .booking-kidstrial-class__btn[data-kid-idx="2"]')
  await page.waitForTimeout(250)
  await fillStage(page)
  await page.click('#trialBookingSubmitBtn')
  await page.waitForTimeout(500)
  const sent = posted()
  const want = await page.evaluate(c => window.LabyrinthBooking.programFor(c.name, c.day, c.time), cls)
  check('booked, and filed under the group that class belongs to, with its name in the note',
    [await stageHeading(page), sent.program, sent.note.includes(cls.name)], ['You’re Booked!', want, true])
  check('and the page is clean', errors, [])
  await ctx.close()
}

// A refusal is not shown as a booking; the person is told how else to get in; trying again sends the same booking.
{
  const { page, ctx, errors } = await open('/index.html')
  const bodies = []
  let saved = false
  await page.route('**/functions/v1/book-trial', route => {
    bodies.push(JSON.parse(route.request().postData() ?? '{}'))
    return route.fulfill({ status: 200, contentType: 'application/json', body: saved ? '{"ok":true}' : '{"ok":false}' })
  })
  await page.click('#bookingInline .booking-category-btn[data-category="adult"]')
  await page.waitForTimeout(250)
  await page.click('#bookingInline .booking-class-row >> nth=0')
  await page.waitForTimeout(250)
  await fillStage(page)
  await page.click('#trialBookingSubmitBtn')
  await page.waitForTimeout(500)
  check('a booking the CRM refused is not shown as booked',
    [await stageHeading(page), await page.locator('#bookingInline .booking-success').count()], ['Something Went Wrong', 0])
  check('and it is not counted', (await conversions(page)).length, 0)
  check('the person is told to call or text, by a link that dials',
    await page.evaluate(() => document.querySelector('#bookingInline .booking-error a')?.getAttribute('href')), 'tel:2813937983')
  saved = true
  await page.click('#trialBookingRetryBtn')
  await page.waitForTimeout(500)
  check('Try Again sends the same booking and, once saved, is booked and counted once',
    [await stageHeading(page), bodies.length === 2 && JSON.stringify(bodies[0]) === JSON.stringify(bodies[1]), (await conversions(page)).length], ['You’re Booked!', true, 1])
  // Start over, from a second refusal
  await page.click('#trialBookingSuccessClose')
  await page.waitForTimeout(250)
  saved = false
  await page.click('#bookingInline .booking-category-btn[data-category="adult"]')
  await page.waitForTimeout(250)
  await page.click('#bookingInline .booking-class-row >> nth=1')
  await page.waitForTimeout(250)
  await fillStage(page)
  await page.click('#trialBookingSubmitBtn')
  await page.waitForTimeout(500)
  await page.click('#trialBookingErrorClose')
  await page.waitForTimeout(250)
  check('"Start over" goes back to the choice of program', await stageHeading(page), 'Book Your Free Trial')
  check('and the page is clean throughout', errors, [])
  await ctx.close()
}

// The keyboard: a class row is a control, so it can be reached and chosen without a mouse.
{
  const { page, ctx } = await open('/index.html')
  await page.click('#bookingInline .booking-category-btn[data-category="adult"]')
  await page.waitForTimeout(250)
  check('every class on the list is a control a keyboard can reach, and says so to a screen reader',
    await page.evaluate(() => [...document.querySelectorAll('#bookingInline .booking-class-row')].every(r => r.getAttribute('role') === 'button' && r.tabIndex === 0)), true)
  await page.locator('#bookingInline .booking-class-row').first().focus()
  await page.keyboard.press('Enter')
  await page.waitForTimeout(250)
  check('Enter on a class picks it', await page.evaluate(() => !!document.getElementById('trialBookingForm')), true)
  await page.click('#bookingInline .booking-back-btn')
  await page.waitForTimeout(250)
  await page.evaluate(() => { window.__space = null; document.addEventListener('keydown', e => { if (e.key === ' ') window.__space = e.defaultPrevented }) })
  await page.locator('#bookingInline .booking-class-row').nth(1).focus()
  await page.keyboard.press('Space')
  await page.waitForTimeout(250)
  check('Space picks it too, and does not also scroll the page',
    await page.evaluate(() => [!!document.getElementById('trialBookingForm'), window.__space]), [true, true])
  await ctx.close()
}

// A phone, and the narrowest one: no step is wider than the screen.
for (const width of [375, 320]) {
  const { page, ctx, errors } = await open('/index.html', { viewport: { width, height: 700 } })
  let saved = true
  await page.route('**/functions/v1/book-trial', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: saved ? '{"ok":true}' : '{"ok":false}' }))
  const seen = []
  // Not only the page: the card the steps sit in clips what is wider than itself, so a calendar that is too wide for it would not scroll
  // the page and would still be cut off. Nothing inside the stage may stick out of the card.
  const measure = async (label) => {
    await page.waitForTimeout(300)
    const s = await page.evaluate(() => {
      const box = document.getElementById('trialForm').getBoundingClientRect()
      const poking = [...document.querySelectorAll('#bookingInline *')].filter(e => {
        const r = e.getBoundingClientRect()
        return r.width > 0 && (r.right > box.right + 0.5 || r.left < box.left - 0.5)
      }).slice(0, 3).map(e => String(e.className || e.tagName))
      return { page: document.documentElement.scrollWidth > window.innerWidth, stage: box.left < 0 || box.right > window.innerWidth + 0.5, poking }
    })
    if (s.page || s.stage || s.poking.length) seen.push(`${label} ${JSON.stringify(s)}`)
  }
  await measure('picker')
  await page.click('#bookingInline .booking-category-btn[data-category="adult"]')
  await measure('adult list')
  await page.click('#bookingInline .booking-class-row >> nth=3')
  await measure('form')
  await fillStage(page, { heard: 'instagram' })
  await page.click('#trialBookingSubmitBtn')
  await page.waitForTimeout(400)
  await measure('success')
  await page.click('#trialBookingSuccessClose')
  await page.waitForTimeout(250)
  await page.click('#bookingInline .booking-category-btn[data-category="kids"]')
  await measure('kids list')
  await page.click('#bookingInline .booking-kidstrial-class__btn[data-kid-idx="2"]')
  await measure('kids form')
  await fillStage(page)
  saved = false
  await page.click('#trialBookingSubmitBtn')
  await page.waitForTimeout(400)
  await measure('error')
  check(`at ${width}px wide, no step is wider than the screen or than its box`, seen, [])
  check(`and the page is clean at ${width}px`, errors, [])
  await ctx.close()
}

// The popup and the page copy can both be on the page, and neither disturbs the other.
{
  const { page, ctx, errors } = await open('/index.html')
  await page.click('#bookingInline .booking-category-btn[data-category="adult"]')
  await page.waitForTimeout(250)
  await page.click('#bookingInline .booking-class-row >> nth=0')
  await page.waitForTimeout(250)
  await page.fill('#trialBookingName', 'Kept In The Page')
  await page.evaluate(() => window.LabyrinthBooking.openForm('Kids BJJ Comp (7–12)', 'Gi', 'Fri', '5:15 PM'))
  await page.waitForTimeout(300)
  const both = await page.evaluate(() => {
    const ids = [...document.querySelectorAll('[id]')].map(e => e.id)
    return {
      dupes: ids.filter((id, i) => ids.indexOf(id) !== i),
      pageDate: document.querySelectorAll('input[name="trialBookingDate"]:checked').length,
      popupDate: document.querySelectorAll('input[name="bookingDate"]:checked').length,
      labels: [...document.querySelectorAll('label[for]')].filter(l => !document.getElementById(l.getAttribute('for'))).length,
    }
  })
  check('with a form showing in both, no id is used twice', both.dupes, [])
  check('and every label points at a field', both.labels, 0)
  check('each has its own calendar with its own day chosen', [both.pageDate, both.popupDate], [1, 1])
  check('the popup\'s form has no Back button, as before: it is closed instead',
    await page.locator('#bookingContent .booking-back-btn').count(), 0)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(250)
  check('closing the popup leaves what was typed in the page where it was', await page.inputValue('#trialBookingName'), 'Kept In The Page')
  check('and nothing the popup showed has been drawn into the page',
    await page.evaluate(() => document.querySelector('#bookingInline .booking-class-badge__name')?.textContent), 'Adult BJJ')
  check('without errors', errors, [])
  await ctx.close()
}

// The section's own text rules (.trial__content p: 16px, a 1.65 line height, the muted colour) are heavier than a booking class that
// styles a paragraph by that class alone. Every kind of line a booking step has is read in the page and in the popup, in the theme the
// day brings and in the plain one: they must look the same.
for (const url of ['/index.html', '/index.html?season=off']) {
  const { page, ctx } = await open(url)
  let saved = true
  await page.route('**/functions/v1/book-trial', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: saved ? '{"ok":true}' : '{"ok":false}' }))
  const SEL = ['.booking-step-header p', '.booking-form__consent', '.booking-success__detail', '.booking-success__email-note', '.booking-error p', '.booking-error a']
  const looks = (root) => page.evaluate(([root, SEL]) => Object.fromEntries(SEL.flatMap(s => {
    const el = document.querySelector(root + ' ' + s)
    if (!el) return []
    const c = getComputedStyle(el)
    return [[s, [c.fontSize, c.lineHeight, c.color, c.fontFamily]]]
  })), [root, SEL])
  const walk = async (root, idp, kind) => {
    const seen = {}
    const add = async () => Object.assign(seen, await looks(root))
    const toForm = async () => {
      await page.click(`${root} .booking-category-btn[data-category="adult"]`)
      await page.waitForTimeout(250)
      await page.click(`${root} .booking-class-row >> nth=0`)
      await page.waitForTimeout(250)
      await page.fill(`#${idp}Name`, 'Test Person')
      await page.fill(`#${idp}Email`, 'test@example.com')
      await page.fill(`#${idp}Phone`, '2815550000')
    }
    if (kind === 'popup') { await page.evaluate(() => window.LabyrinthBooking.openPicker()); await page.waitForTimeout(300) }
    await add()
    await toForm()
    await add()
    saved = true
    await page.click(`#${idp}SubmitBtn`)
    await page.waitForTimeout(500)
    await add()
    if (kind === 'popup') await page.evaluate(() => window.LabyrinthBooking.openPicker())
    else await page.click('#trialBookingSuccessClose')
    await page.waitForTimeout(300)
    await toForm()
    saved = false
    await page.click(`#${idp}SubmitBtn`)
    await page.waitForTimeout(500)
    await add()
    return seen
  }
  const inPage = await walk('#bookingInline', 'trialBooking', 'page')
  const inPopup = await walk('#bookingContent', 'booking', 'popup')
  check(`${url}: all six kinds of line are there to compare`, [Object.keys(inPage), Object.keys(inPopup)], [SEL, SEL])
  check(`${url}: the page copy sets each in the same size, line height, colour and face as the popup`, inPage, inPopup)
  await ctx.close()
}

// A step that is taller than the one it replaced is brought into view, under the fixed nav; one that begins where the person is looking
// does not move the page. (The page smooth-scrolls, so the test's own scrolling is told to jump, or it would be measured mid-flight.)
{
  const { page, ctx } = await open('/index.html', { viewport: { width: 390, height: 700 } })
  const geometry = () => page.evaluate(() => {
    const top = document.getElementById('bookingInline').getBoundingClientRect().top
    const nav = document.querySelector('nav.nav, .nav')
    return { top: Math.round(top), navBottom: Math.round(nav ? nav.getBoundingClientRect().bottom : 0), y: Math.round(window.scrollY) }
  })
  await page.evaluate(() => { const r = document.getElementById('bookingInline'); window.scrollTo({ top: r.getBoundingClientRect().top + window.scrollY - 40, behavior: 'instant' }) })
  await page.waitForTimeout(300)
  const before = await geometry()
  check('the section is scrolled up under the nav to begin with', before.top < before.navBottom, true)
  await page.click('#bookingInline .booking-category-btn[data-category="adult"]')
  await page.waitForTimeout(1500)
  const after = await geometry()
  check('the list that replaces the picker starts below the nav, not behind it', [after.top >= after.navBottom, after.top <= after.navBottom + 40], [true, true])
  await page.evaluate(() => { const r = document.getElementById('bookingInline'); window.scrollTo({ top: r.getBoundingClientRect().top + window.scrollY - 150, behavior: 'instant' }) })
  await page.waitForTimeout(300)
  const rest = await geometry()
  await page.click('#bookingInline .booking-back-btn')
  await page.waitForTimeout(1200)
  check('a step that begins where the person is looking leaves the page where it is', (await geometry()).y, rest.y)
  await ctx.close()
}

// Without JavaScript the section is still useful: it says how to book, with a number that dials, and has no form that nothing would receive.
{
  const html = readFileSync(join(ROOT, 'index.html'), 'utf8')
  const stageHtml = html.match(/<div class="booking-inline" id="bookingInline"[\s\S]*?<\/div>\s*<p class="trial-form__help"[\s\S]*?<\/p>/)?.[0] ?? ''
  check('the page as served has the number twice, as links that dial', (stageHtml.match(/href="tel:2813937983"/g) || []).length, 2)
  check('and no field, button or form in the section', /<form|<input|<select|<textarea|<button/.test(stageHtml), false)
}

// ── Where each booking came from ─────────────────────────────────────────────
//
// Instagram counts the people who tapped through, Google counts clicks, and the CRM counts the people who booked, and nothing joined
// them: there was no telling which ad had booked anybody. A booking now carries where its person came from (a tagged link, a click on
// a Google ad, or the site that sent them) and, if they chose to say, what they picked in the menu. It rides in the lead's note, which
// the booking endpoint cuts at 400 characters, so the class stays first and the whole has to fit.
console.log('\nA booking says where its person came from:')
{
  const CLASS = String.raw`Adult BJJ, Gi, [A-Z][a-z]+ \d{1,2}:\d{2} [AP]M, booked from the website`
  const AD = '/programs/adult-bjj-fulshear.html?utm_source=Instagram&utm_campaign=adult-ad&fbclid=IwAR0x'
  const noteFrom = async (path, opts = {}, then = []) => {
    const { page, ctx, posted, errors } = await open(path, opts)
    for (const [to, referer] of then) await goOn(page, to, referer)
    const note = await bookFirstAdultClass(page, posted, opts.book)
    await ctx.close()
    return { note, errors }
  }

  // The ad link, read on the landing page, is still there when they book from another page.
  {
    const { note, errors } = await noteFrom(AD, {}, [['/schedule.html']])
    check('the ad link is remembered on the next page and named in the note',
      new RegExp(`^${CLASS}\\. Came from: instagram / adult-ad\\.$`).test(note), true)
    check('and no page errors came with it', errors, [])
  }
  // The same link, booked from the page it landed on.
  check('booked from the landing page itself, it is named too',
    new RegExp(`^${CLASS}\\. Came from: instagram / adult-ad\\.$`).test((await noteFrom(AD)).note), true)
  // Nothing known: the note is exactly what it always was.
  check('a direct visit leaves the note exactly as it was, with nothing added',
    new RegExp(`^${CLASS}$`).test((await noteFrom('/schedule.html')).note), true)
  // The booking is otherwise untouched.
  {
    const { page, ctx, posted } = await open(AD)
    await bookFirstAdultClass(page, posted)
    const body = posted()
    check('nothing else about the booking changed', Object.keys(body).sort(), ['email', 'name', 'note', 'phone', 'program', 'trialAt'])
    check('the program is still the CRM\'s own value, not read off the note', body.program, 'Adult BJJ')
    await ctx.close()
  }

  // Source, medium and campaign are all kept, in that order, when a link has them.
  check('a link with source, medium and campaign names all three',
    (await noteFrom('/schedule.html?utm_source=google&utm_medium=cpc&utm_campaign=adult-search&gclid=abc')).note.endsWith('. Came from: google / cpc / adult-search.'), true)
  // Google's own click id is enough when there are no tags.
  for (const q of ['gclid=Cj0KCQ', 'gbraid=0AAAA', 'wbraid=CjkKCQ'])
    check(`a Google ad click is recognised from ${q.split('=')[0]} alone`,
      (await noteFrom('/schedule.html?' + q)).note.endsWith('. Came from: Google Ads click.'), true)
  // Facebook and Instagram add fbclid to every link, ad or not: it says only which of the two, from who sent them.
  for (const [ref, want] of [['https://l.instagram.com/?u=x', 'Instagram link'], ['https://l.facebook.com/l.php?u=x', 'Facebook link'], [undefined, 'Facebook or Instagram link']])
    check(`fbclid from ${ref ? new URL(ref).hostname : 'no referrer'} reads "${want}"`,
      (await noteFrom('/schedule.html?fbclid=IwAR0x', { referer: ref })).note.endsWith(`. Came from: ${want}.`), true)

  // The site that sent them, when nothing carries tags.
  check('a visitor sent by Google search is named by the site, without www',
    (await noteFrom('/schedule.html', { referer: 'https://www.google.com/' })).note.endsWith('. Came from: google.com.'), true)
  check('the academy\'s own pages are not a way of finding it',
    new RegExp(`^${CLASS}$`).test((await noteFrom('/schedule.html', { referer: 'https://www.labyrinth.vision/pricing' })).note), true)
  check('nor is the page Stripe sends people back from after they pay',
    new RegExp(`^${CLASS}$`).test((await noteFrom('/schedule.html', { referer: 'https://checkout.stripe.com/c/pay/cs_live_x' })).note), true)
  check('nor a click from one page of this site to another',
    new RegExp(`^${CLASS}$`).test((await noteFrom('/schedule.html', {}, [['/pricing.html', BASE + '/schedule.html']])).note), true)

  // Which one wins when there are several: a tag outranks a referrer, and the latest of each kind replaces the earlier.
  check('a tagged link is not overwritten by a later visit from Google search',
    (await noteFrom(AD, {}, [['/schedule.html', 'https://www.google.com/']])).note.endsWith('. Came from: instagram / adult-ad.'), true)
  check('a visit from Google search is replaced by a later tagged link',
    (await noteFrom('/schedule.html', { referer: 'https://www.google.com/' }, [[AD.replace('Instagram', 'x'), 'https://www.google.com/']])).note.endsWith('. Came from: x / adult-ad.'), true)
  check('one referrer is replaced by a later one',
    (await noteFrom('/schedule.html', { referer: 'https://www.google.com/' }, [['/pricing.html', 'https://www.yelp.com/biz/x']])).note.endsWith('. Came from: yelp.com.'), true)
  check('a click out of Instagram is only a referrer, so a later visit from Google search replaces it',
    (await noteFrom('/schedule.html?fbclid=IwAR0x', { referer: 'https://l.instagram.com/' }, [['/pricing.html', 'https://www.google.com/']])).note.endsWith('. Came from: google.com.'), true)
  check('a click on a Google ad is a tag, so a later visit from Google search does not replace it',
    (await noteFrom('/schedule.html?gclid=Cj0KCQ', {}, [['/pricing.html', 'https://www.google.com/']])).note.endsWith('. Came from: Google Ads click.'), true)
  check('of two tagged links, the later one is the one named',
    (await noteFrom('/schedule.html?utm_source=facebook&utm_campaign=first', {}, [['/pricing.html?utm_source=instagram&utm_campaign=second']])).note.endsWith('. Came from: instagram / second.'), true)

  // Anything in a link is stranger-typed, and it is printed in the CRM between quote marks.
  {
    const evil = encodeURIComponent('"><script>alert(1)</script>\n')
    const { note } = await noteFrom(`/schedule.html?utm_source=${evil}&utm_medium=${'m'.repeat(500)}&utm_campaign=${'c'.repeat(500)}`)
    check('markup, quote marks and line breaks in a tag do not reach the note', /[<>"\n\r]/.test(note), false)
    check('each part of a tag is cut to 40 characters', note.endsWith('. Came from: script alert 1 script / ' + 'm'.repeat(40) + ' / ' + 'c'.repeat(40) + '.'), true)
    check('and the whole note stays under the 400 the endpoint keeps, with the class first',
      note.length < 400 && new RegExp(`^${CLASS}\\. Came from: `).test(note), true)
  }

  // Blocked storage (private modes, some in-app browsers) falls back to the page's own memory.
  {
    const { page, ctx, posted, errors } = await open(AD, { init: () => {
      Storage.prototype.getItem = () => { throw new Error('blocked') }
      Storage.prototype.setItem = () => { throw new Error('blocked') }
    } })
    const note = await bookFirstAdultClass(page, posted)
    check('with storage blocked, the page still names the ad it landed from', note.endsWith('. Came from: instagram / adult-ad.'), true)
    check('and the booking goes through without a page error', errors, [])
    await ctx.close()
  }
  // A visit is remembered for 30 days, not forever.
  for (const [days, remembered] of [[29, true], [31, false]]) {
    const { page, ctx, posted } = await open('/schedule.html', { init: ({ days }) => {
      localStorage.setItem('labyrinth.source', JSON.stringify({ k: 'tag', v: 'instagram / old-ad', t: Date.now() - days * 864e5 }))
    }, arg: { days } })
    const note = await bookFirstAdultClass(page, posted)
    check(`an ad link seen ${days} days ago is ${remembered ? 'still' : 'no longer'} named`, note.includes('Came from: instagram / old-ad'), remembered)
    await ctx.close()
  }
  // Whatever else is in that storage slot, it is not trusted.
  for (const junk of ['not json', '{"k":"tag","v":"x"}', '{"k":"evil","v":"x","t":1}', '{"k":"tag","v":"<b>x</b>","t":"now"}']) {
    const { page, ctx, posted, errors } = await open('/schedule.html', { init: ({ junk }) => localStorage.setItem('labyrinth.source', junk), arg: { junk } })
    const note = await bookFirstAdultClass(page, posted)
    check(`a stored value of ${JSON.stringify(junk)} is ignored and nothing breaks`, new RegExp(`^${CLASS}$`).test(note) && errors.length === 0, true)
    await ctx.close()
  }
  // A well-formed entry with markup in it is cleaned on the way out, the same as a tag that came in on a link.
  {
    const { page, ctx, posted } = await open('/schedule.html', { init: () => localStorage.setItem('labyrinth.source',
      JSON.stringify({ k: 'tag', v: '<b>x</b>\n"q"', t: Date.now() })) })
    const note = await bookFirstAdultClass(page, posted)
    check('markup in a remembered value never reaches the note', /[<>"\n\r]/.test(note) === false && note.includes('Came from: b x /b q.'), true)
    await ctx.close()
  }
}

console.log('\nThe optional "How did you hear about us?" menu:')
{
  const CLASS = String.raw`Adult BJJ, Gi, [A-Z][a-z]+ \d{1,2}:\d{2} [AP]M, booked from the website`
  const { page, ctx, posted } = await open('/schedule.html')
  await page.evaluate(() => window.LabyrinthBooking.openAdultList())
  await page.waitForTimeout(250)
  await page.click('.booking-class-row')
  await page.waitForTimeout(250)
  const menu = await page.evaluate(() => {
    const sel = document.getElementById('bookingHeard'), lab = document.querySelector('label[for="bookingHeard"]')
    return { tag: sel && sel.tagName, required: sel && sel.required, value: sel && sel.value,
             label: lab && lab.textContent.trim(), options: sel ? [...sel.options].map(o => o.textContent) : [],
             after: !!document.querySelector('#bookingPhone').closest('.booking-form__group').nextElementSibling.contains(sel) }
  })
  check('the form has the menu, and it follows the phone number', [menu.tag, menu.after], ['SELECT', true])
  check('it is labelled and says it is optional', menu.label, 'How did you hear about us? (optional)')
  check('it does not have to be filled in, and starts empty', [menu.required, menu.value], [false, ''])
  check('and offers these, in this order', menu.options, ['Choose one', 'Instagram', 'Facebook', 'Google search', 'Google Maps',
    'Friend or family', 'Saw the gym', 'Flyer or poster', 'An event or seminar', 'Other'])
  await page.fill('#bookingName', 'Test Person')
  await page.fill('#bookingEmail', 'test@example.com')
  await page.fill('#bookingPhone', '2815550000')
  await page.click('#bookingSubmitBtn')
  await page.waitForTimeout(500)
  check('leaving it alone adds nothing to the note', new RegExp(`^${CLASS}$`).test(posted().note), true)
  await ctx.close()
}
{
  const CLASS = String.raw`Adult BJJ, Gi, [A-Z][a-z]+ \d{1,2}:\d{2} [AP]M, booked from the website`
  const { note } = await (async () => {
    const { page, ctx, posted } = await open('/schedule.html')
    const note = await bookFirstAdultClass(page, posted, { heard: 'friend' })
    await ctx.close()
    return { note }
  })()
  check('an answer is added to the note, in the CRM\'s words', new RegExp(`^${CLASS}\\. Heard about us: Friend or family\\.$`).test(note), true)

  const both = await (async () => {
    const { page, ctx, posted } = await open('/programs/adult-bjj-fulshear.html?utm_source=Instagram&utm_campaign=adult-ad&fbclid=IwAR0x')
    const note = await bookFirstAdultClass(page, posted, { heard: 'instagram' })
    await ctx.close()
    return note
  })()
  check('beside where the visit came from, which stays separate', both.endsWith('. Came from: instagram / adult-ad. Heard about us: Instagram.'), true)

  // The select carries a slug and only the academy's own labels can be sent: an edited option reaches the CRM as nothing.
  const { page, ctx, posted } = await open('/schedule.html')
  await page.evaluate(() => window.LabyrinthBooking.openAdultList())
  await page.waitForTimeout(250)
  await page.click('.booking-class-row')
  await page.waitForTimeout(250)
  await page.evaluate(() => { const o = document.querySelector('#bookingHeard option:nth-child(2)'); o.value = '<b>free gym</b>'; o.textContent = 'Everything is free' })
  await page.fill('#bookingName', 'Test Person')
  await page.fill('#bookingEmail', 'test@example.com')
  await page.fill('#bookingPhone', '2815550000')
  await page.selectOption('#bookingHeard', { index: 1 })
  await page.click('#bookingSubmitBtn')
  await page.waitForTimeout(500)
  check('an option edited in the page cannot put its own words in the note', new RegExp(`^${CLASS}$`).test(posted().note), true)
  await ctx.close()
}
{
  // The same menu on a kids class, and the Pink October tag still goes first.
  const { page, ctx, posted } = await open('/index.html')
  await page.evaluate(() => window.LabyrinthBooking.openForm('Kids BJJ Comp (7–12)', 'Gi', 'Fri', '5:15 PM', undefined, 'Pink October'))
  await page.waitForTimeout(300)
  await page.fill('#bookingName', 'Test Person')
  await page.fill('#bookingEmail', 'test@example.com')
  await page.fill('#bookingPhone', '2815550000')
  await page.selectOption('#bookingHeard', 'google-maps')
  await page.click('#bookingSubmitBtn')
  await page.waitForTimeout(500)
  check('a kids class has the menu too, and the page tag stays at the front',
    /^PINK OCTOBER: Kids BJJ Comp \(7–12\), Gi, Friday 5:15 PM, booked from the website\. Heard about us: Google Maps\.$/.test(posted().note), true)
  check('and the program is still the one the form chose', posted().program.startsWith('Kids'), true)
  await ctx.close()
}
{
  // A refused booking and the try again send the same answer, not an emptied form's.
  const { page, ctx, errors } = await open('/programs/adult-bjj-fulshear.html?utm_source=Instagram&utm_campaign=adult-ad&fbclid=IwAR0x')
  const bodies = []
  let saved = false
  await page.route('**/functions/v1/book-trial', route => {
    bodies.push(JSON.parse(route.request().postData() ?? '{}'))
    return route.fulfill({ status: 200, contentType: 'application/json', body: saved ? '{"ok":true}' : '{"ok":false}' })
  })
  await page.evaluate(() => window.LabyrinthBooking.openAdultList())
  await page.waitForTimeout(250)
  await page.click('.booking-class-row')
  await page.waitForTimeout(250)
  await page.fill('#bookingName', 'Test Person')
  await page.fill('#bookingEmail', 'test@example.com')
  await page.fill('#bookingPhone', '2815550000')
  await page.selectOption('#bookingHeard', 'instagram')
  await page.click('#bookingSubmitBtn')
  await page.waitForTimeout(500)
  saved = true
  await page.click('#bookingRetryBtn')
  await page.waitForTimeout(500)
  check('the retry sends the same note as the first try', bodies.length === 2 && bodies[0].note === bodies[1].note, true)
  check('with where it came from and what they said, both', bodies[1].note.endsWith('. Came from: instagram / adult-ad. Heard about us: Instagram.'), true)
  check('and the page is clean throughout', errors, [])
  await ctx.close()
}

console.log('\nA class is bookable right up until it starts, and a form still open when it starts is not wasted:')
{
  // Thursday, October 15, 2026, a week with no holiday in it. The No-Gi class is at 6:30 PM Central (23:30 UTC, CDT).
  const T = (hh, mm) => new Date(Date.UTC(2026, 9, 15, hh + 5, mm))
  /** The page on a clock the test holds, the CRM stubbed, and every body it was sent. */
  async function openAt(when, { viewport } = {}) {
    const ctx = await browser.newContext(viewport ? { viewport } : {})
    const bodies = []
    await ctx.route('**', route => route.request().url().startsWith(BASE) ? route.continue() : route.abort())
    await ctx.route('**/functions/v1/book-trial', async route => {
      bodies.push(JSON.parse(route.request().postData() ?? '{}'))
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' })
    })
    const page = await ctx.newPage()
    await page.clock.setFixedTime(when)
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(400)
    return { page, ctx, bodies }
  }
  const fill = async page => {
    await page.fill('#bookingName', 'Test Person')
    await page.fill('#bookingEmail', 'test@example.com')
    await page.fill('#bookingPhone', '2815550000')
  }
  const calendar = page => page.evaluate(() => ({
    checked: document.querySelector('input[name="bookingDate"]:checked')?.id ?? '',
    today: document.querySelector('.booking-class-info__soon')?.textContent ?? '',
    late: document.querySelector('.booking-form__late')?.textContent ?? '',
  }))

  check('the CRM is given the same fifteen minutes as the form (LATE_GRACE_MINUTES in book-trial)',
    await (await openAt(T(17, 0))).page.evaluate(() => window.LabyrinthBooking.lateGraceMins), 15)

  // 6:25 PM: the form opens on today, and says that it may be booked until the class starts.
  {
    const { page, ctx, bodies } = await openAt(T(18, 25))
    await page.evaluate(() => window.LabyrinthBooking.openForm('Adult BJJ', 'No-Gi', 'Thu', '6:30 PM'))
    await page.waitForTimeout(250)
    const c = await calendar(page)
    check('at 6:25 the class at 6:30 is offered for today', c.checked, 'bookingDate-2026-10-15')
    check('and the form says it can be booked right up until it starts', c.today, 'This class is today. You can book right up until it starts.')

    // Three minutes after the start: they are on the way, so it is booked as asked.
    await page.clock.setFixedTime(T(18, 33))
    await fill(page)
    await page.click('#bookingSubmitBtn')
    await page.waitForTimeout(400)
    check('a form still open three minutes after the start books the class they chose, for the time it started',
      [bodies.length, bodies[0]?.trialAt], [1, '2026-10-15T18:30:00-05:00'])
    check('and says they are booked', await page.evaluate(() => document.querySelector('.booking-success h3')?.textContent), 'You’re Booked!')
    await ctx.close()
  }

  // Twenty minutes after: nothing is sent, nobody is told they are booked, and the next one is ready.
  {
    const { page, ctx, bodies } = await openAt(T(18, 25))
    await page.evaluate(() => window.LabyrinthBooking.openForm('Adult BJJ', 'No-Gi', 'Thu', '6:30 PM'))
    await page.waitForTimeout(250)
    await fill(page)
    await page.clock.setFixedTime(T(18, 50))
    await page.click('#bookingSubmitBtn')
    await page.waitForTimeout(400)
    const c = await calendar(page)
    check('twenty minutes after the start nothing is sent', bodies.length, 0)
    check('the form says the class has started and picks next Thursday',
      [/already started/.test(c.late), /Thursday, October 22, 2026/.test(c.late), c.checked], [true, true, 'bookingDate-2026-10-22'])
    check('and is not a success page: the form is still there, with what was typed',
      await page.evaluate(() => [!!document.querySelector('.booking-success'), document.getElementById('bookingName')?.value, document.querySelector('.booking-form__late')?.getAttribute('role')]), [false, 'Test Person', 'alert'])
    await page.click('#bookingSubmitBtn')
    await page.waitForTimeout(400)
    check('one more tap books next Thursday', [bodies.length, bodies[0]?.trialAt], [1, '2026-10-22T18:30:00-05:00'])
    await ctx.close()
  }

  // A later date is never late, and a class that is not today does not claim to be.
  {
    const { page, ctx, bodies } = await openAt(T(18, 25))
    await page.evaluate(() => window.LabyrinthBooking.openForm('Adult BJJ', 'No-Gi', 'Fri', '11:00 AM'))
    await page.waitForTimeout(250)
    check('a class that is not today does not say it is', (await calendar(page)).today, '')
    await page.clock.setFixedTime(T(18, 50))
    await fill(page)
    await page.click('#bookingSubmitBtn')
    await page.waitForTimeout(400)
    check('and a booking for another day goes whatever the time', [bodies.length, bodies[0]?.trialAt], [1, '2026-10-16T11:00:00-05:00'])
    await ctx.close()
  }

  // Every class on both lists, on the academy's own clock: offered today up to its start, next week from the minute after.
  {
    const { page, ctx } = await openAt(T(12, 0))
    const classes = await page.evaluate(() => [...window.LabyrinthBooking.adultClasses, ...window.LabyrinthBooking.kidsTrialClasses].map(c => ({ name: c.name, day: c.day, time: c.time })))
    const offset = { Mon: 19, Tue: 20, Wed: 21, Thu: 22, Fri: 23, Sat: 24, Sun: 25 }   // October 19 to 25, 2026: no holiday
    const wrong = []
    for (const c of classes) {
      const m = /^(\d{1,2}):(\d{2}) ([AP])M$/.exec(c.time)
      const hh = (Number(m[1]) % 12) + (m[3] === 'P' ? 12 : 0), mm = Number(m[2])
      for (const [delta, want] of [[-1, 0], [0, 0], [1, 7]]) {
        // The class's own start (CDT, UTC-5) plus the delta in minutes, on its day that week.
        await page.clock.setFixedTime(new Date(Date.UTC(2026, 9, offset[c.day], hh + 5, mm + delta)))
        const days = await page.evaluate(([day, time]) => {
          const d = window.LabyrinthBooking.nextDate(day, time), n = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }))
          return Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - new Date(n.getFullYear(), n.getMonth(), n.getDate())) / 864e5)
        }, [c.day, c.time])
        if (days !== want) wrong.push(`${c.name} ${c.day} ${c.time} at ${delta >= 0 ? '+' : ''}${delta} min: offered in ${days} days, wanted ${want}`)
      }
    }
    check(`all ${classes.length} classes (adult, kids, teens, wrestling, strength, MMA, open mat) are offered today until the minute they start, and next week after it`, wrong, [])
    await ctx.close()
  }
}

await browser.close()
server.close()
console.log(failed ? `\n${failed} check(s) failed.` : '\nEvery check passed.')
process.exit(failed ? 1 : 0)
