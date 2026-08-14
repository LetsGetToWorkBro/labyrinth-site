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
