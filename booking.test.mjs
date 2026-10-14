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

await browser.close()
server.close()
console.log(failed ? `\n${failed} check(s) failed.` : '\nEvery check passed.')
process.exit(failed ? 1 : 0)
