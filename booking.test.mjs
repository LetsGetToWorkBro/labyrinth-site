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

let failed = 0
const check = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  if (!ok) failed++
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${label}` +
    (ok ? '' : `\n          got ${JSON.stringify(got)}\n          want ${JSON.stringify(want)}`))
}

/** A page with the CRM stubbed out and console errors collected. */
async function open(path) {
  const ctx = await browser.newContext()
  const errors = []
  let posted = null
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
  await page.goto(BASE + path, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(500)
  return { page, ctx, errors, posted: () => posted }
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

  // A specific class off the schedule keeps its context. The page carries both
  // a desktop table and mobile day cards and hides one of them, so take
  // whichever "Book Trial" this viewport actually shows.
  await page.locator('.sched-book--trial:visible, .sched-book-mobile:visible').first().click()
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

// ── /#book opens the picker on arrival ───────────────────────────────────────
console.log('\nArriving at the front page on #book:')
{
  const { page, ctx } = await open('/index.html#book')
  check('the picker is already open', await isOpen(page), true)
  check('and it is the picker', await heading(page), 'Book Your Free Trial')
  await ctx.close()
}

await browser.close()
server.close()
console.log(failed ? `\n${failed} check(s) failed.` : '\nEvery check passed.')
process.exit(failed ? 1 : 0)
