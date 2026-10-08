import { chromium } from 'playwright-core'
import { createServer } from 'node:http'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

// The repository itself, wherever it happens to be checked out. This was a
// hard-coded /workspace path, which made the suite unrunnable from any other
// clone: it served 404 for every page and the failures looked like site bugs.
const ROOT = fileURLToPath(new URL('.', import.meta.url))
const TYPES = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.ico':'image/x-icon','.xml':'application/xml','.txt':'text/plain'}
// Mimic Cloudflare Pages: /foo serves foo.html
const server = createServer((req,res)=>{
  let p = decodeURIComponent(req.url.split('?')[0])
  let f = join(ROOT, p)
  if (p.endsWith('/')) f = join(ROOT, p, 'index.html')
  if (!existsSync(f) && existsSync(f + '.html')) f = f + '.html'
  if (!existsSync(f)) { res.statusCode = 404; res.end('404'); return }
  res.setHeader('content-type', TYPES[extname(f)] ?? 'application/octet-stream')
  res.end(readFileSync(f))
})
await new Promise(r=>server.listen(4620,'127.0.0.1',r))

const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-proxy-server'] })
const page = await (await browser.newContext()).newPage()
let pass=0, fail=0
const check=(n,c,x='')=>{ if(c){console.log('PASS  '+n);pass++}else{console.log('FAIL  '+n+'  '+x);fail++} }

// ── L1: every internal link on every page resolves ──
const posts = readdirSync(join(ROOT,'blog')).filter(f=>f.endsWith('.html')&&f!=='index.html').map(f=>'/blog/'+f.replace('.html',''))
const programs = readdirSync(join(ROOT,'programs')).filter(f=>f.endsWith('.html')&&f!=='index.html').map(f=>'/programs/'+f.replace('.html',''))
const areas = readdirSync(join(ROOT,'areas')).filter(f=>f.endsWith('.html')&&f!=='index.html').map(f=>'/areas/'+f.replace('.html',''))
const coaches = readdirSync(join(ROOT,'coaches')).filter(f=>f.endsWith('.html')&&f!=='index.html').map(f=>'/coaches/'+f.replace('.html',''))
const pages = ['/', '/blog/', '/programs/', '/areas/', '/coaches/', '/schedule', '/pricing',
  '/support', '/privacy-policy', '/ennova', '/self-defense-for-women', '/donate', '/pink-october', '/legacy/', '/legacy/transfer',
  ...posts, ...programs, ...areas, ...coaches]
const broken = []
for (const path of pages) {
  const r = await page.goto('http://localhost:4620'+path, { waitUntil:'domcontentloaded' })
  if (r.status() !== 200) { broken.push(path + ' -> ' + r.status()); continue }
  const hrefs = await page.$$eval('a[href]', as => as.map(a => a.getAttribute('href')))
  for (const h of hrefs) {
    if (!h || h.startsWith('http') || h.startsWith('#') || h.startsWith('mailto:') || h.startsWith('tel:') || h.startsWith('sms:') || h.startsWith('data:')) continue
    const url = new URL(h, 'http://localhost:4620' + path)
    const res = await page.request.get(url.href)
    if (res.status() !== 200) broken.push(`${path}  ->  ${h}  (${res.status()})`)
  }
}
check('L1 no broken internal links', broken.length === 0, '\n    ' + broken.slice(0,8).join('\n    '))
check('L1 all 50 pages served 200', pages.length === 50, 'pages: ' + pages.length)

// ── L1b: every program page carries the schema and the canonical it exists for ──
// A program page whose Service block is missing is still a page, and still
// looks fine. It has just stopped doing the one job it was built for.
const schemaFails = []
for (const path of programs) {
  await page.goto('http://localhost:4620'+path, { waitUntil:'domcontentloaded' })
  const blocks = await page.$$eval('script[type="application/ld+json"]', ss => ss.map(s => s.textContent))
  let types = []
  for (const b of blocks) { try { types.push(JSON.parse(b)['@type']) } catch { schemaFails.push(path+' unparseable JSON-LD') } }
  for (const want of ['Service','BreadcrumbList','FAQPage'])
    if (!types.includes(want)) schemaFails.push(`${path} missing ${want}`)
  const canon = await page.$eval('link[rel=canonical]', el => el.getAttribute('href')).catch(() => null)
  if (canon !== 'https://labyrinth.vision' + path) schemaFails.push(`${path} canonical is ${canon}`)
  const inSitemap = readFileSync(join(ROOT,'sitemap.xml'),'utf8').includes('https://labyrinth.vision'+path)
  if (!inSitemap) schemaFails.push(`${path} not in sitemap.xml`)
}
check('L1b program pages have Service/Breadcrumb/FAQ schema, canonical and sitemap entry',
  schemaFails.length === 0, '\n    ' + schemaFails.join('\n    '))

// ── L1c: the generator and the committed HTML agree ──
// programs/*.html is generated. If somebody edits the HTML by hand the next
// build silently reverts them, so the check is that a rebuild changes nothing.
const before = programs.concat(['/programs/']).map(p =>
  readFileSync(join(ROOT, p === '/programs/' ? 'programs/index.html' : p.slice(1)+'.html'), 'utf8'))
execFileSync('python3', [join(ROOT,'scripts/build_programs.py')], { cwd: ROOT, stdio: 'ignore' })
const after = programs.concat(['/programs/']).map(p =>
  readFileSync(join(ROOT, p === '/programs/' ? 'programs/index.html' : p.slice(1)+'.html'), 'utf8'))
check('L1c programs/ matches scripts/build_programs.py',
  before.every((b,i) => b === after[i]), 'run: python3 scripts/build_programs.py')

// blog/index.html is generated from the posts. Same guard: a hand-edit that
// the next build would revert should fail here rather than vanish quietly.
const idxBefore = readFileSync(join(ROOT,'blog/index.html'),'utf8')
execFileSync('python3', [join(ROOT,'scripts/build_blog_index.py')], { cwd: ROOT, stdio: 'ignore' })
check('L1d blog/index.html matches scripts/build_blog_index.py',
  idxBefore === readFileSync(join(ROOT,'blog/index.html'),'utf8'),
  'run: python3 scripts/build_blog_index.py')

// Every post needs its own share image: nineteen of them shared one, so a
// link to any of them looked like a link to all of them.
const heroes = posts.map(p => {
  const f = readFileSync(join(ROOT, p.slice(1) + '.html'), 'utf8')
  return (f.match(/og:image" content="[^"]*\/(assets\/[^"]+)"/) || [])[1]
})
check('L1e every post has a distinct og:image',
  heroes.every(Boolean) && new Set(heroes).size === heroes.length,
  'reused: ' + heroes.filter((h,i) => heroes.indexOf(h) !== i).join(', '))

// ── L1f: the area pages must not be doorway pages ──
// Seven near-identical pages differing only by a place name is the thing
// Google penalises the whole site for. The guard is on shared sentences: the
// address, the program list and the closing CTA are legitimately common
// chrome, and almost nothing else should be.
const areaText = areas.map(p => {
  const f = readFileSync(join(ROOT, p.slice(1) + '.html'), 'utf8')
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<(nav|footer|head)\b[\s\S]*?<\/\1>/g, '')
  return new Set(f.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').toLowerCase()
    .split(/(?<=[.!?]) /).map(x => x.trim()).filter(x => x.length > 40))
})
const allSentences = areaText.flatMap(s => [...s])
const counts = allSentences.reduce((m, s) => m.set(s, (m.get(s) || 0) + 1), new Map())
const sharedCount = [...counts.values()].filter(n => n > 1).length
const uniqueCount = counts.size
check('L1f area pages are substantially distinct',
  sharedCount <= 6 && uniqueCount >= 100,
  `${sharedCount} shared sentences across ${uniqueCount} distinct. Cap is 6`)

// No area page may claim a street address of its own. There is one academy.
const fakeAddress = areas.filter(p => {
  const f = readFileSync(join(ROOT, p.slice(1) + '.html'), 'utf8')
  return /"@type":\s*"(LocalBusiness|SportsActivityLocation)"[\s\S]{0,400}"addressLocality":\s*"(?!Fulshear)/.test(f)
})
check('L1g no area page invents a location', fakeAddress.length === 0, fakeAddress.join(', '))

// ── L1h: the generated pages match their generator ──
const generated = ['schedule.html','pricing.html','support.html','ennova.html','self-defense-for-women.html','donate.html','pink-october.html',
  'legacy/index.html','legacy/transfer.html','coaches/index.html',
  ...coaches.map(c=>c.slice(1)+'.html')]
const genBefore = generated.map(f=>readFileSync(join(ROOT,f),'utf8'))
execFileSync('python3', [join(ROOT,'scripts/build_pages.py')], { cwd: ROOT, stdio: 'ignore' })
const genAfter = generated.map(f=>readFileSync(join(ROOT,f),'utf8'))
check('L1h schedule/pricing/support/ennova/legacy/coaches match scripts/build_pages.py',
  genBefore.every((b,i)=>b===genAfter[i]), 'run: python3 scripts/build_pages.py')

// ── L1i: the timetable has one source ──
// schedule_data.py is canonical for everything generated. booking.js keeps its
// own copy because the browser needs it, so both of its arrays are compared
// here. This is the check that would have caught the Friday-only kids trials
// contradiction, where two copies of the timetable disagreed in public.
const bookingJs = readFileSync(join(ROOT,'booking.js'),'utf8')
const DAYFULL = {Mon:'Monday',Tue:'Tuesday',Wed:'Wednesday',Thu:'Thursday',Fri:'Friday',Sat:'Saturday',Sun:'Sunday'}
const jsArray = name => {
  const body = bookingJs.match(new RegExp('var ' + name + ' = \\[([\\s\\S]*?)\\];'))[1]
  // `crm:` follows `time:` on every entry now, so the closing brace is no
  // longer straight after the time and the old anchor swallowed it whole.
  return new Set([...body.matchAll(/\{name:'(.*?)', ?type:'(.*?)', ?day:'(.*?)', ?time:'(.*?)'[,}]/g)]
    .map(m => [m[1].replace(/\\u2013/g,'\u2013'), m[2], DAYFULL[m[3]], m[4]].join('|')))
}
const pyArray = expr => new Set(JSON.parse(execFileSync('python3', ['-c',
  "import sys; sys.path.insert(0,'scripts'); import json, schedule_data as s; print(json.dumps(" + expr + "))"],
  { cwd: ROOT }).toString()).map(r => r.join('|')))

const drift = []
const compare = (label, a, b) => {
  for (const x of a) if (!b.has(x)) drift.push(label + ' only in booking.js: ' + x)
  for (const x of b) if (!a.has(x)) drift.push(label + ' only in schedule_data: ' + x)
}
compare('adult',
  jsArray('ADULT_CLASSES'),
  pyArray("[[n,st,d,t] for d,t,n,a,st,au,f in s.CLASSES if au in ('adult','all')]"))
compare('kids trials',
  jsArray('KIDS_TRIAL_CLASSES'),
  pyArray("[[n+((' ('+a+')') if a else ''),st,d,t] for d,t,n,a,st,au,f in s.CLASSES if 'trial' in f]"))
check('L1i schedule_data.py and booking.js agree on the timetable',
  drift.length === 0, '\n    ' + drift.join('\n    '))

// ── L1j: every bookable class maps to a programme the CRM will accept ──
// The booking endpoint validates `program` against its own six values and
// replaces anything else with the default, without saying so. That is why
// every trial, kids included, arrived as "Adult BJJ" and was confirmed by
// email as one. A class added without a valid `crm` fails here instead.
{
  const js = readFileSync(join(ROOT, 'booking.js'), 'utf8')
  // The six the endpoint accepts today, plus the two it will accept once
  // PROGRAMS in _shared/trial-emails.ts is extended. Sending a pending one
  // degrades to exactly today's behaviour rather than breaking.
  const LIVE = ['Adult BJJ', 'Kids 3-6', 'Kids 7-12', 'Teens', 'Wrestling', 'Womens', 'MMA Conditioning']
  const PENDING = ['Strength & Conditioning', 'Open Mat']
  const ALLOWED = LIVE.concat(PENDING)
  const entries = [...js.matchAll(/\{name:'(.*?)',[^}]*?crm:'(.*?)'\}/g)]
  const missing = [...js.matchAll(/\{name:'(.*?)', ?type:.*?\}/g)]
    .filter(m => !/crm:/.test(m[0])).map(m => m[1])
  const wrong = entries.filter(m => !ALLOWED.includes(m[2])).map(m => `${m[1]} -> ${m[2]}`)
  check('L1j every bookable class carries a CRM programme the endpoint accepts',
    entries.length > 0 && missing.length === 0 && wrong.length === 0,
    [...missing.map(m => 'no crm: ' + m), ...wrong].join('; '))

  // The kids classes must not be filed as adult ones, which is the bug a
  // reader of the confirmation email actually saw.
  const kidsBlock = js.slice(js.indexOf('KIDS_TRIAL_CLASSES = ['))
  const kids = [...kidsBlock.slice(0, kidsBlock.indexOf('];')).matchAll(/crm:'(.*?)'/g)].map(m => m[1])
  check('L1j kids trial classes are not filed as Adult BJJ',
    kids.length === 5 && kids.every(k => k !== 'Adult BJJ'), kids.join(', '))

  check('L1j the booking payload sends the CRM programme, not the display name',
    /program: data\.crmProgram/.test(js) && !/program: data\.className/.test(js))
}

// ── L1k: booking from a schedule row files it under the right programme ──
// The picker lists were only ever one way in. Most people book from the
// timetable itself, and app.js reads the class name off the page there. It
// used to strip the age range first, so "Kids BJJ (3-6)" arrived as "Kids
// BJJ", matched nothing, and every schedule booking became Adult BJJ.
//
// This clicks the real button and reads the real request. Recomputing the
// mapping inside the test would pass with the bug still in app.js, because the
// bug is in how the name is read off the page, not in the mapping.
{
  const wanted = [
    { match: /Kids BJJ/i, ages: '(3\u20136)', expect: 'Kids 3-6' },
    { match: /Kids BJJ Comp/i, ages: '(7\u201312)', expect: 'Kids 7-12' },
    { match: /Teens BJJ Comp/i, ages: '(12\u201315)', expect: 'Teens' },
  ]
  const results = []
  for (const w of wanted) {
    await page.goto('http://localhost:4620/', { waitUntil:'domcontentloaded' })
    let sent = null
    await page.route('**/functions/v1/book-trial', route => {
      sent = JSON.parse(route.request().postData() || '{}')
      return route.fulfill({ status:200, contentType:'application/json', body:'{"ok":true}' })
    })
    await page.waitForTimeout(200)
    const opened = await page.evaluate(({ src, ages }) => {
      document.querySelectorAll('.type-card').forEach(c => c.click())
      const bar = [...document.querySelectorAll('.type-sched-bar')].find(b => {
        const n = b.querySelector('.type-sched-bar__name')
        const a = b.querySelector('.type-sched-bar__ages')
        return n && a && new RegExp(src, 'i').test(n.textContent) && a.textContent.trim() === ages
          && b.querySelector('.type-sched-bar__book')
      })
      if (!bar) return false
      bar.querySelector('.type-sched-bar__book').click()
      return true
    }, { src: w.match.source, ages: w.ages })
    if (opened && await page.locator('#bookingName').count()) {
      await page.fill('#bookingName', 'Site Test')
      await page.fill('#bookingEmail', 'test@example.com')
      await page.fill('#bookingPhone', '2813937983')
      await page.click('#bookingSubmitBtn')
      await page.waitForTimeout(500)
    }
    await page.unroute('**/functions/v1/book-trial')
    results.push({ want: w.expect, got: sent?.program ?? '(no request)', note: sent?.note ?? '' })
  }
  check('L1k booking a kids or teens class off the schedule sends its own programme',
    results.every(r => r.got === r.want),
    results.map(r => `${r.want} -> ${r.got}`).join('; '))
  check('L1k the note keeps the age range the class is identified by',
    results.every(r => /\(\d+\u2013\d+\)/.test(r.note)),
    results.map(r => r.note).join(' | '))
}

// ── L1m: nothing in the sitemap is marked noindex ──
// A sitemap says "please index these" and a robots meta says "do not index
// this". Submitting both for one URL is an error Search Console reports, and
// it is easy to do by adding a legal page to the sitemap for tidiness.
{
  const sm = readFileSync(join(ROOT,'sitemap.xml'),'utf8')
  const locs = [...sm.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1])
  const conflicts = []
  for (const f of [...readdirSync(ROOT).filter(x=>x.endsWith('.html')),
                   ...readdirSync(join(ROOT,'review')).map(x=>'review/'+x)]) {
    let html; try { html = readFileSync(join(ROOT,f),'utf8') } catch { continue }
    if (!/name="robots"[^>]*noindex/.test(html)) continue
    const canon = html.match(/rel="canonical" href="([^"]*)"/)
    if (canon && locs.includes(canon[1])) conflicts.push(f)
  }
  check('L1m no noindex page is listed in sitemap.xml', conflicts.length === 0, conflicts.join(', '))
}

// ── L1n: the booking dialog is usable without a mouse ──
// The front page ships its own overlay in the markup, so anything applied only
// where the overlay is built missed the page most people book from.
{
  await page.goto('http://localhost:4620/', { waitUntil:'networkidle' })
  await page.evaluate(() => window.LabyrinthBooking.openPicker())
  await page.waitForTimeout(400)
  const d = await page.evaluate(() => {
    const ov = document.getElementById('bookingOverlay')
    return { role: ov?.getAttribute('role'), modal: ov?.getAttribute('aria-modal'),
             named: !!(ov?.getAttribute('aria-label') || ov?.getAttribute('aria-labelledby')),
             focusInside: ov?.contains(document.activeElement) }
  })
  check('L1n booking dialog announces itself and takes focus',
    d.role === 'dialog' && d.modal === 'true' && d.named && d.focusInside, JSON.stringify(d))

  // Tab must not walk out of an open dialog.
  await page.keyboard.press('Shift+Tab')
  const stillIn = await page.evaluate(() =>
    document.getElementById('bookingOverlay').contains(document.activeElement))
  check('L1n tab stays inside the open dialog', stillIn)

  await page.keyboard.press('Escape')
  await page.waitForTimeout(250)
  const closed = await page.evaluate(() =>
    !document.getElementById('bookingOverlay').classList.contains('open'))
  check('L1n escape closes it', closed)
}

// ── L1o: every page offers a way past the nav ──
{
  const missing = []
  for (const path of ['/', '/schedule', '/coaches/', '/programs/', '/areas/', '/blog/',
                      '/support', '/blog/benefits-of-bjj-for-kids']) {
    await page.goto('http://localhost:4620'+path, { waitUntil:'domcontentloaded' })
    const ok = await page.evaluate(() => !!document.querySelector('.skip-link')
      && document.querySelectorAll('main').length === 1)
    if (!ok) missing.push(path)
  }
  check('L1o skip link and a single main landmark on every page type',
    missing.length === 0, missing.join(', '))
}

// ── L1p: the Ennova offer stays a resident offer ──
// It is a rate for one apartment complex, not a public promotion. If it ranks,
// "exclusively for Ennova residents" stops meaning anything, so it is noindex,
// absent from the sitemap, and nothing on the public site links to it. The
// residency gate is the other half: the form must refuse to send without it.
{
  const html = readFileSync(join(ROOT,'ennova.html'),'utf8')
  check('L1p the offer page is noindex', /name="robots"[^>]*noindex/.test(html))
  check('L1p the offer page is not in the sitemap',
    !readFileSync(join(ROOT,'sitemap.xml'),'utf8').includes('labyrinth.vision/ennova'))

  const linkers = []
  for (const f of [...readdirSync(ROOT).filter(x=>x.endsWith('.html')),
                   ...readdirSync(join(ROOT,'blog')).map(x=>'blog/'+x),
                   ...readdirSync(join(ROOT,'programs')).map(x=>'programs/'+x),
                   ...readdirSync(join(ROOT,'areas')).map(x=>'areas/'+x),
                   ...readdirSync(join(ROOT,'coaches')).map(x=>'coaches/'+x)]) {
    if (f === 'ennova.html' || !f.endsWith('.html')) continue
    if (/href="[^"]*\/ennova"/.test(readFileSync(join(ROOT,f),'utf8'))) linkers.push(f)
  }
  check('L1p nothing on the public site links to it', linkers.length === 0, linkers.join(', '))

  await page.goto('http://localhost:4620/ennova', { waitUntil:'networkidle' })
  let posted = null
  await page.route('**/functions/v1/book-trial', route => {
    posted = JSON.parse(route.request().postData() || '{}')
    return route.fulfill({ status:200, contentType:'application/json', body:'{"ok":true}' })
  })
  const fill = async () => {
    await page.fill('#ennovaName','Site Test'); await page.fill('#ennovaPhone','2813937983')
    await page.fill('#ennovaEmail','test@example.com')
  }
  // no unit, no confirmation: must not reach the CRM
  await fill(); await page.click('#ennovaSubmit'); await page.waitForTimeout(300)
  check('L1p the form will not send without proof of residency', posted === null,
    JSON.stringify(posted))

  await page.fill('#ennovaUnit','B-214')
  await page.check('#ennovaResident')
  await page.selectOption('#ennovaProgram','kids-3-6')
  await page.click('#ennovaSubmit'); await page.waitForTimeout(500)
  check('L1p a complete claim reaches the CRM under the right programme',
    posted?.program === 'Kids 3-6', JSON.stringify(posted?.program))
  check('L1p the note names the offer and the unit for the desk',
    /ENNOVA RESIDENT OFFER/.test(posted?.note || '') && /B-214/.test(posted?.note || ''),
    posted?.note)
  await page.unroute('**/functions/v1/book-trial')
}

// ── L1q: nothing rewrites the ranking from the spreadsheet any more ──
// app.js used to pull the ranking and medal counts from a Google Sheet and
// write them into the front page hero. The sheet stopped updating in March
// 2026 and still said "#9 nationally, #1 in Texas", so every visit replaced
// the current jits.gg numbers with stale ones. The numbers now come from
// scripts/jits_data.py and are built into the HTML. Serve a sheet that says
// something else entirely and make sure neither page takes any of it.
{
  await page.route('**/spreadsheets/**', route => route.fulfill({
    status: 200, contentType: 'text/csv',
    body: 'Key,Value\nNational Rank,3\nState Rank,2\nGold Medals,999\nTotal Wins,888\n'
  }))

  await page.goto('http://localhost:4620/ennova', { waitUntil: 'networkidle' })
  await page.waitForTimeout(600)
  const offer = await page.evaluate(() => ({
    h1: document.querySelector('.hero__h1-visual')?.textContent || '',
    sub: document.querySelector('.hero__subtitle')?.textContent || ''
  }))
  check('L1q the offer page keeps its own headline',
    offer.h1.includes('$0 ENROLLMENT') && !/RANKED #/.test(offer.h1), offer.h1)
  check('L1q the offer page keeps its own subtitle',
    offer.sub.includes('Ennova') && !/gold medals/.test(offer.sub), offer.sub)

  await page.goto('http://localhost:4620/', { waitUntil: 'networkidle' })
  await page.evaluate(() => document.getElementById('competition')?.scrollIntoView())
  await page.waitForTimeout(1800)
  const home = await page.evaluate(() => ({
    h1: document.querySelector('.hero__h1-visual')?.textContent || '',
    all: document.body.innerText
  }))
  check('L1q the front page headline is the one it was built with',
    home.h1.includes('TOP 1% IN THE NATION') && !/#3|#2 IN TEXAS/.test(home.h1), home.h1)
  check('L1q no sheet number reaches the page', !/\b(999|888)\b/.test(home.all))
  await page.unroute('**/spreadsheets/**')
}

// ── L1x: the RSVP page for Rolling for Ribbons (BJJ for Self Defense for Women) ──
// What the owner asked for, held in place: the facts on the page, a form that
// asks for exactly the right things, validation that stops a bad RSVP before it
// is sent, an RSVP that is sent once, and a failure that tells the person what
// to do instead of nothing. The endpoint is mocked: no real RSVP, and no real
// email, is created by a test run.
//
// Its own browser context with a pinned clock. The page hides itself after the
// event, so a test that read the real date would start failing on October 22
// for a reason that has nothing to do with the code.
{
  const ctx = await browser.newContext()
  const rp = await ctx.newPage()
  await rp.clock.setFixedTime(new Date('2026-10-05T15:00:00Z'))
  const URL = 'http://localhost:4620/self-defense-for-women'
  const DONATE = 'https://donate.stripe.com/14AdRa0tL1Ea1Br3bJgjC0a'

  let posts = []
  let reply = { status: 200, body: { ok: true }, delay: 0, abort: false }
  await rp.route('**/functions/v1/event-rsvp', async route => {
    posts.push(JSON.parse(route.request().postData() || '{}'))
    if (reply.delay) await new Promise(r => setTimeout(r, reply.delay))
    if (reply.abort) return route.abort()
    return route.fulfill({ status: reply.status, contentType: 'application/json', body: JSON.stringify(reply.body) })
  })
  const fresh = async () => {
    posts = []; reply = { status: 200, body: { ok: true }, delay: 0, abort: false }
    await rp.goto(URL, { waitUntil: 'networkidle' })
  }
  const fillValid = async (extra = {}) => {
    await rp.fill('#rsvp-name', extra.name ?? 'Jane Q Doe')
    await rp.fill('#rsvp-email', extra.email ?? 'Jane@Example.com')
    if (extra.phone !== undefined) await rp.fill('#rsvp-phone', extra.phone)
    if (extra.party) await rp.selectOption('#rsvp-party', extra.party)
    if (extra.notes) await rp.fill('#rsvp-notes', extra.notes)
  }

  await fresh()
  const text = await rp.evaluate(() => document.body.innerText)
  check('L1x the page leads with Rolling for Ribbons and keeps the descriptive name under it',
    /Rolling for Ribbons/i.test(await rp.textContent('h1')) && /BJJ for Self Defense for Women/.test(await rp.textContent('.rsvp-hero__sub')))
  check('L1x date, time and place are in the header',
    /Sat, Oct 24/.test(text) && /11:00 AM/.test(text) && /Central/i.test(text) && /Fulshear, TX/.test(text), text.slice(0, 200))
  check('L1x it says the seminar is free and no experience is needed',
    /free, and no experience is needed/i.test(text) && (await rp.locator('.prog-fact__value em', { hasText: 'Free' }).count()) === 1)
  check('L1x it names the cause and where the money goes',
    /breast cancer/i.test(text) && /directly to a family affected by breast cancer/i.test(text))
  check('L1x it says merch will be sold at the event', /selling merch at the event/i.test(text))
  const pointer = await rp.evaluate(() => ({
    btns: [...document.querySelectorAll('a.btn--pink')].map(a => a.getAttribute('href')),
    section: document.querySelector('#donate')?.textContent || '',
    sectionLink: document.querySelector('#donate a.btn--pink')?.getAttribute('href') || '',
    amounts: document.querySelectorAll('.rsvp-give__amt').length, fund: document.querySelectorAll('#fund').length,
  }))
  check('L1x the seminar page carries no second copy of the donation: its Donate buttons and its Help a family section lead to /donate',
    pointer.btns.length === 3 && pointer.btns.every(h => h === '/donate') && pointer.sectionLink === '/donate'
      && /two anonymous donors/i.test(pointer.section) && pointer.amounts === 0 && pointer.fund === 0, JSON.stringify(pointer))
  const ld = await rp.$$eval('script[type="application/ld+json"]', ss => ss.map(s => JSON.parse(s.textContent)))
  const ev = ld.find(o => o['@type'] === 'Event')
  check('L1x structured data describes a free event at the right time',
    !!ev && ev.startDate === '2026-10-24T11:00:00-05:00' && ev.isAccessibleForFree === true
      && ev.location?.address?.addressLocality === 'Fulshear', JSON.stringify(ev)?.slice(0, 120))
  const led = await rp.$$eval('#instructors a.rsvp-led__card', as => as.map(a => [a.getAttribute('href'), a.textContent]))
  check('L1x it names the two instructors and links to their pages',
    led.length === 2 && led[0][0] === '/coaches/scott-jones' && /Scott Jones/.test(led[0][1]) && /self defense/i.test(led[0][1])
      && led[1][0] === '/coaches/anthony-curry' && /Anthony Curry/.test(led[1][1]) && /Professor/.test(led[1][1]), JSON.stringify(led).slice(0, 160))
  check('L1x structured data lists both instructors as performers',
    !!ev && Array.isArray(ev.performer) && ev.performer.map(p => p.name).join() === 'Scott Jones,Anthony Curry')
  // Making the RSVP worth doing: what to expect, a real countdown, a button that follows on a phone, and next steps.
  await rp.clock.setFixedTime(new Date('2026-10-14T15:00:00Z'))
  await rp.goto(URL, { waitUntil: 'networkidle' })
  const wow = await rp.evaluate(() => ({
    perks: [...document.querySelectorAll('.rsvp-perks li strong')].map(e => e.textContent),
    count: [...document.querySelectorAll('#cd-d,#cd-h,#cd-m,#cd-s')].map(e => e.textContent).join(':'),
    cdLabel: document.getElementById('cd-label').textContent,
    button: document.getElementById('rsvp-submit').textContent,
    party: document.getElementById('rsvp-party').options[1].textContent,
    title: document.querySelector('.rsvp__form-title')?.textContent,
  }))
  check('L1x the RSVP says what to expect: free, come as you are, real instructors, bring a friend',
    wow.perks.length === 4 && /Free/.test(wow.perks[0]) && /Come as you are/.test(wow.perks[1]) && /Coach Scott and Professor Tony/.test(wow.perks[2]) && /Bring a friend/.test(wow.perks[3]), JSON.stringify(wow))
  check('L1x a big live countdown in the hero (10 days 1 hour before the 11:00 AM start) and a button that says what it does',
    wow.count === '10:01:00:00' && wow.cdLabel === 'Starts in' && wow.button === 'Save My Spot' && /friend/.test(wow.party) && /Save your spot/.test(wow.title), JSON.stringify(wow))
  // It really ticks, and it knows when the seminar is on and when it is over.
  {
    const cx = await browser.newContext(); const cp = await cx.newPage()
    await cp.clock.install({ time: new Date('2026-10-24T14:00:00Z') })
    await cp.goto(URL, { waitUntil: 'load' })
    const read = () => cp.evaluate(() => ({ t: ['cd-d', 'cd-h', 'cd-m', 'cd-s'].map(i => document.getElementById(i).textContent).join(':'), label: document.getElementById('cd-label').textContent, vis: !document.getElementById('cd').hidden, state: document.getElementById('cd').dataset.state || '' }))
    const sec = t => t.split(':').reduce((n, v, i) => n + (+v) * [86400, 3600, 60, 1][i], 0)
    const a0 = await read(); await cp.clock.runFor(3000); const a1 = await read()
    check('L1x the countdown is live: two hours out it reads about 0:02:00:00 and ticks down three seconds in three seconds',
      a0.vis && /^0:0(2:00:00|1:59:59)$/.test(a0.t) && a0.label === 'Starts today' && sec(a0.t) - sec(a1.t) === 3, JSON.stringify({ a0, a1 }))
    await cp.clock.setFixedTime(new Date('2026-10-24T16:10:00Z')); await cp.clock.runFor(1500)
    const live = await read()
    check('L1x while the seminar is on, it says so instead of counting', live.state === 'live' && /Happening now/.test(live.label), JSON.stringify(live))
    await cp.clock.setFixedTime(new Date('2026-10-24T18:00:00Z')); await cp.clock.runFor(1500)
    const over = await read()
    check('L1x afterwards it thanks people', over.state === 'over' && /Thank you/.test(over.label), JSON.stringify(over))
    await cx.close()
  }
  await rp.setViewportSize({ width: 390, height: 800 })
  const stickyTop = await rp.evaluate(() => !document.getElementById('rsvp-sticky').hidden)
  await rp.evaluate(() => document.getElementById('donate').scrollIntoView({ behavior: 'instant' })); await rp.waitForTimeout(500)
  const stickyMid = await rp.evaluate(() => !document.getElementById('rsvp-sticky').hidden)
  await rp.evaluate(() => document.getElementById('rsvp').scrollIntoView({ behavior: 'instant' })); await rp.waitForTimeout(500)
  const stickyAtForm = await rp.evaluate(() => !document.getElementById('rsvp-sticky').hidden)
  check('L1x on a phone the RSVP button waits at the top, appears once you have scrolled past the form, and gets out of the way at the form',
    stickyTop === false && stickyMid === true && stickyAtForm === false, JSON.stringify({ stickyTop, stickyMid, stickyAtForm }))
  await rp.setViewportSize({ width: 1200, height: 900 })
  const cal = await rp.evaluate(() => ({
    g: document.getElementById('rsvp-cal-google').href, ics: decodeURIComponent(document.getElementById('rsvp-cal-ics').href),
  }))
  check('L1x the calendar links carry the real time (11:00 AM to 12:30 PM Central is 16:00 to 17:30 UTC) and the place',
    /dates=20261024T160000Z\/20261024T173000Z/.test(cal.g) && /DTSTART:20261024T160000Z/.test(cal.ics) && /Fulshear/.test(cal.ics) && /SUMMARY:Rolling for Ribbons/.test(cal.ics), cal.g.slice(0, 160))

  check('L1x no em dashes in what a visitor reads', !/—/.test(text))
  const pink = await rp.evaluate(() => {
    const rgb = c => c.match(/\d+/g).slice(0, 3).map(Number)
    const lin = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }
    const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
    const label = getComputedStyle(document.querySelector('.rsvp-label')).color
    const bg = getComputedStyle(document.body).backgroundColor
    const hi = Math.max(lum(rgb(label)), lum(rgb(bg))), lo = Math.min(lum(rgb(label)), lum(rgb(bg)))
    const ribbons = [...document.querySelectorAll('svg.ribbon')]
    return {
      label,
      ribbons: ribbons.length,
      decorative: ribbons.every(r => r.getAttribute('aria-hidden') === 'true'),
      donateBtns: [...document.querySelectorAll('a[href="/donate"]')].map(a => a.classList.contains('btn--pink')),
      ratio: (hi + 0.05) / (lo + 0.05),
    }
  })
  check('L1x the page wears the awareness pink: ribbons, pink labels, pink Donate buttons',
    pink.label === 'rgb(229, 143, 181)' && pink.ribbons >= 4 && pink.donateBtns.length === 3 && pink.donateBtns.every(Boolean),
    JSON.stringify(pink))
  check('L1x the ribbons are decoration, hidden from screen readers', pink.decorative)
  check('L1x the pink is readable on the page background (WCAG AA, 4.5:1)', pink.ratio >= 4.5, pink.ratio.toFixed(1))
  check('L1x the page is indexable (an event is meant to be found)',
    (await rp.locator('meta[name="robots"][content*="noindex"]').count()) === 0
      && readFileSync(join(ROOT,'sitemap.xml'),'utf8').includes('labyrinth.vision/self-defense-for-women'))

  // The form asks for exactly what was specified, and nothing else.
  const fields = await rp.evaluate(() => {
    const f = document.getElementById('rsvp-form')
    const el = id => document.getElementById(id)
    return {
      names: [...f.querySelectorAll('input:not(#rsvp-hp), select:not(#rsvp-shirts select), textarea')].map(e => e.name),
      required: ['rsvp-name', 'rsvp-email', 'rsvp-phone', 'rsvp-party', 'rsvp-notes'].map(id => el(id).required),
      party: [...el('rsvp-party').options].map(o => o.value),
      notesMax: el('rsvp-notes').maxLength,
      emailType: el('rsvp-email').type, phoneType: el('rsvp-phone').type,
      labels: [...f.querySelectorAll('label')].map(l => l.textContent.trim().replace(/\s+/g, ' ')),
    }
  })
  check('L1x the form has name, email, phone, number attending and a notes box',
    JSON.stringify(fields.names) === JSON.stringify(['name', 'email', 'phone', 'party', 'notes']), fields.names.join(','))
  check('L1x name, email and number attending are required; phone and notes are not',
    JSON.stringify(fields.required) === JSON.stringify([true, true, false, true, false]), fields.required.join(','))
  check('L1x number attending offers 1 to 5 and nothing else', fields.party.join(',') === '1,2,3,4,5', fields.party.join(','))
  check('L1x email and phone use the right keyboards, and the notes box is capped',
    fields.emailType === 'email' && fields.phoneType === 'tel' && fields.notesMax === 600)
  check('L1x phone and notes are labeled optional',
    fields.labels.filter(l => /\(optional\)/.test(l)).length === 2, fields.labels.join(' | '))
  const hp = await rp.evaluate(() => {
    const i = document.getElementById('rsvp-hp'); const r = i.getBoundingClientRect()
    return { off: r.right < 0 || r.left < -1000, tab: i.tabIndex, hidden: i.closest('[aria-hidden="true"]') !== null }
  })
  check('L1x the honeypot is there but invisible and unreachable', hp.off && hp.tab === -1 && hp.hidden, JSON.stringify(hp))

  // Validation stops a bad RSVP before anything is sent.
  await fresh()
  await rp.click('#rsvp-submit')
  check('L1x an empty form sends nothing and says what is missing',
    posts.length === 0
      && /full name/i.test(await rp.textContent('#rsvp-name-err'))
      && /email/i.test(await rp.textContent('#rsvp-email-err')))
  check('L1x focus goes to the first thing to fix', await rp.evaluate(() => document.activeElement.id) === 'rsvp-name')
  await fillValid({ email: 'not-an-email', phone: '123' })
  await rp.click('#rsvp-submit')
  check('L1x a bad email and a short phone number are caught, and nothing is sent',
    posts.length === 0 && /email/i.test(await rp.textContent('#rsvp-email-err'))
      && /phone/i.test(await rp.textContent('#rsvp-phone-err')))
  await rp.fill('#rsvp-email', 'jane@example.com')
  check('L1x fixing a field clears its message at once',
    (await rp.textContent('#rsvp-email-err')) === '' && !(await rp.getAttribute('#rsvp-email', 'aria-invalid')))
  await fillValid({ name: 'A', phone: '' })
  await rp.click('#rsvp-submit')
  check('L1x a one-letter name is refused', posts.length === 0 && /full name/i.test(await rp.textContent('#rsvp-name-err')))

  // A good RSVP goes once, with the right shape, and ends on a confirmation.
  await fresh()
  await fillValid({ phone: '(281) 555-0100', party: '3', notes: 'First time. A little nervous.' })
  check('L1x the form offers an optional T-shirt size per person coming (3 people, 3 size boxes, none chosen)',
    (await rp.locator('.rsvp-shirt select').count()) === 3 && (await rp.$$eval('.rsvp-shirt select', ss => ss.every(x => x.value === ''))) &&
    /Reserve a T-shirt/.test(await rp.textContent('#rsvp-shirts')))
  await rp.selectOption('#rsvp-shirt-1', 'M'); await rp.selectOption('#rsvp-shirt-3', 'L')
  await rp.click('#rsvp-submit')
  await rp.waitForSelector('#rsvp-success:not([hidden])')
  check('L1x a valid RSVP is sent exactly once', posts.length === 1, 'posts: ' + posts.length)
  check('L1x only the shirts asked for are sent, and the confirmation says a shirt is being set aside',
    posts[0].sizes === 'M, L' && /T-shirts/.test(await rp.textContent('#rsvp-success-shirt')) && /M, L/.test(await rp.textContent('#rsvp-success-shirt')), JSON.stringify(posts[0]))
  check('L1x it carries the event, the details, the party size as a number and an empty honeypot',
    posts[0].event === 'self-defense-women-2026-10-21' && posts[0].name === 'Jane Q Doe'
      && posts[0].email === 'jane@example.com' && posts[0].phone === '(281) 555-0100'
      && posts[0].party === 3 && posts[0].notes === 'First time. A little nervous.' && posts[0].website === '',
    JSON.stringify(posts[0]))
  const done = await rp.evaluate(() => ({
    form: document.getElementById('rsvp-form').hidden,
    text: document.getElementById('rsvp-success').innerText,
    focus: document.activeElement.id,
  }))
  check('L1x the form gives way to a confirmation naming the date, party and email',
    done.form && /Jane/.test(done.text) && /3 people/.test(done.text) && /Saturday, October 24, 11:00 AM to 12:30 PM/.test(done.text)
      && /jane@example\.com/.test(done.text), done.text.slice(0, 160))
  check('L1x focus moves to the confirmation for screen readers', done.focus === 'rsvp-success')

  // A bot that fills the honeypot is still posted as written: the server drops it.
  await fresh()
  await fillValid()
  await rp.evaluate(() => { document.getElementById('rsvp-hp').value = 'http://spam.example' })
  await rp.click('#rsvp-submit')
  await rp.waitForSelector('#rsvp-success:not([hidden])')
  check('L1x the honeypot value reaches the server under the key it checks', posts[0]?.website === 'http://spam.example')

  // A double tap is one RSVP.
  await fresh()
  reply.delay = 500
  await fillValid()
  await rp.click('#rsvp-submit'); await rp.click('#rsvp-submit', { force: true }).catch(() => {})
  await rp.waitForSelector('#rsvp-success:not([hidden])')
  check('L1x tapping RSVP twice sends it once', posts.length === 1, 'posts: ' + posts.length)

  // Things going wrong tell the person what to do.
  await fresh()
  reply.status = 429
  reply.body = { error: 'Too many RSVPs from this connection today. Please call us on (281) 393-7983.' }
  await fillValid()
  await rp.click('#rsvp-submit')
  await rp.waitForSelector('#rsvp-status:not([hidden])')
  const busy = await rp.evaluate(() => ({
    tel: [...document.querySelectorAll('#rsvp-status a')].map(a => a.getAttribute('href')),
    formShown: !document.getElementById('rsvp-form').hidden,
    enabled: !document.getElementById('rsvp-submit').disabled,
    kept: document.getElementById('rsvp-name').value,
  }))
  check('L1x a refusal shows the server\'s words with a tap-to-call number, and keeps what was typed',
    busy.tel.includes('tel:2813937983') && busy.formShown && busy.enabled && busy.kept === 'Jane Q Doe', JSON.stringify(busy))
  await fresh()
  reply.abort = true
  await fillValid()
  await rp.click('#rsvp-submit')
  await rp.waitForSelector('#rsvp-status:not([hidden])')
  check('L1x no connection says so, offers the phone, and lets them try again',
    /could not reach/i.test(await rp.textContent('#rsvp-status'))
      && (await rp.locator('#rsvp-status a[href="tel:2813937983"]').count()) === 1
      && !(await rp.evaluate(() => document.getElementById('rsvp-submit').disabled)))
  await fresh()
  reply.status = 400
  reply.body = { error: 'That email address does not look right', field: 'email' }
  await fillValid()
  await rp.click('#rsvp-submit')
  await rp.waitForFunction(() => document.getElementById('rsvp-email-err').textContent !== '')
  check('L1x a field the server rejects is marked on that field',
    /email/i.test(await rp.textContent('#rsvp-email-err')) && (await rp.getAttribute('#rsvp-email', 'aria-invalid')) === 'true')

  // After a donation Stripe sends people back here with ?donated=1. They gave on the donation page,
  // so this page passes them on to it, and it is there that they are thanked.
  await rp.route('**/functions/v1/event-donations**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ raised: 0, count: 0, goal: 500, top: [], recent: [] }) }))
  await rp.goto(URL + '?donated=1', { waitUntil: 'commit' }).catch(() => {})
  await rp.waitForURL('**/donate?donated=1', { timeout: 5000 }).catch(() => {})
  await rp.waitForLoadState('networkidle')
  check('L1x a returning donor is sent from here to the donation page and thanked there',
    new globalThis.URL(rp.url()).pathname === '/donate' && new globalThis.URL(rp.url()).search === '?donated=1' && await rp.isVisible('#donate-thanks'), rp.url())
  await rp.unroute('**/functions/v1/event-donations**')

  // Homepage: the strip is there before the event, and gone after it.
  await rp.goto('http://localhost:4620/', { waitUntil: 'networkidle' })
  check('L1x the homepage links to the event page before the event',
    (await rp.locator('a.event-strip__link[href="/self-defense-for-women"]').count()) === 1
      && await rp.isVisible('#eventStrip'))
  check('L1x each October strip link carries a pink ribbon and a pink button (the HYROX row has its own volt look, the donation card is solid pink with a dark button)',
    (await rp.locator('#eventStrip svg.ribbon').count()) === 3
      && await rp.evaluate(() => [...document.querySelectorAll('.event-strip__link:not(.event-strip__link--hyrox):not(.event-strip__link--donate) .event-strip__icon')].every(i => getComputedStyle(i).color === 'rgb(229, 143, 181)')
        && [...document.querySelectorAll('.event-strip__link:not(.event-strip__link--hyrox):not(.event-strip__link--donate) .event-strip__cta')].every(c => getComputedStyle(c).backgroundColor === 'rgb(229, 143, 181)')))
  check('L1x the strip names the event, the date and the cause',
    /Rolling for Ribbons/.test(await rp.textContent('#eventStrip'))
      && /Oct 24/.test(await rp.textContent('#eventStrip')) && /Breast cancer/i.test(await rp.textContent('#eventStrip')))

  // The morning after, the strip is gone and the page stops taking RSVPs.
  await rp.clock.setFixedTime(new Date('2026-10-26T15:00:00Z'))
  await rp.goto('http://localhost:4620/', { waitUntil: 'networkidle' })
  check('L1x the event link leaves the homepage after the event, the October offer stays until Oct 31',
    !(await rp.isVisible('a.event-strip__link[href="/self-defense-for-women"]'))
      && await rp.isVisible('a.event-strip__link[href="/pink-october"]'))
  await rp.clock.setFixedTime(new Date('2026-11-02T15:00:00Z'))
  await rp.goto('http://localhost:4620/', { waitUntil: 'networkidle' })
  check('L1x once October is over both pink links are gone and only the HYROX row is left',
    !(await rp.isVisible('a.event-strip__link[href="/pink-october"]')) && !(await rp.isVisible('a.event-strip__link[href="/self-defense-for-women"]'))
      && await rp.isVisible('a.event-strip__link--hyrox'))
  await rp.goto(URL, { waitUntil: 'networkidle' })
  check('L1x the page says the event has passed and offers no form',
    (await rp.isVisible('#rsvp-over')) && !(await rp.isVisible('#rsvp-form')))
  await ctx.close()
}

// ── L1y: Pink October, and the pink theme on both awareness pages ──
// The two offers exactly as the owner stated them and nothing more, the pages
// linking to each other, the theme actually applied (not just promised in a
// class name), the booking buttons working, and the offers ending on schedule.
{
  const ctx = await browser.newContext()
  const pp = await ctx.newPage()
  await pp.clock.setFixedTime(new Date('2026-10-05T15:00:00Z'))
  const PINK = 'rgb(229, 143, 181)', GOLD = 'rgb(200, 162, 76)'

  await pp.goto('http://localhost:4620/pink-october', { waitUntil: 'networkidle' })
  const t = await pp.evaluate(() => document.body.innerText)
  check('L1y the page leads with Pink October and the awareness month',
    /PINK\s*OCTOBER/i.test(await pp.textContent('h1')) && /Breast Cancer Awareness Month/i.test(t))
  check('L1y moms of current and new students train free all October',
    /moms train free/i.test(t) && /current and new students/i.test(t) && /whole month of October/i.test(t))
  check('L1y every woman gets 50% off her first month, child enrolled or not',
    /50% off/i.test(t) && /every woman/i.test(t) && /first month/i.test(t) && /whether or not she has a child enrolled/i.test(t))
  check('L1y it runs Oct 1 to 31 and needs no experience', /Oct 1 to 31/.test(t) && /No experience needed/i.test(t))
  check('L1y no em dashes, and American spelling', !/—/.test(t) && !/\b(colour|programme|centre|neighbour)\b/i.test(t))
  check('L1y it links to the self defense event, and the event links back',
    (await pp.locator('a[href="/self-defense-for-women"]').count()) >= 1)
  const inPage = await pp.evaluate(() => ({
    cta: [...document.querySelectorAll('[data-book-trial]')].length,
    theme: document.body.classList.contains('theme-pink'),
    primary: getComputedStyle(document.querySelector('main .btn--gold')).backgroundColor,
    nav: getComputedStyle(document.querySelector('.nav__cta')).backgroundColor,
    ribbons: document.querySelectorAll('svg.ribbon').length,
    band: getComputedStyle(document.querySelector('.pink-band')).backgroundImage.includes('rgb(229, 143, 181)'),
    heroBg: getComputedStyle(document.querySelector('.pink-hero')).backgroundImage.includes('gradient'),
    mainBg: getComputedStyle(document.querySelector('main')).backgroundColor,
  }))
  check('L1y the page is fully pink: pink primary buttons, a pink hero, a pink band, rose-black ground',
    inPage.theme && inPage.primary === PINK && inPage.band && inPage.heroBg && inPage.mainBg !== 'rgb(10, 10, 10)', JSON.stringify(inPage))
  check('L1y the site nav keeps its gold, so it is still the same academy', inPage.nav === GOLD, inPage.nav)
  check('L1y ribbons are used throughout', inPage.ribbons >= 6, 'ribbons: ' + inPage.ribbons)
  check('L1y the page has a "see kids times" link that opens the class picker', inPage.cta >= 1, 'cta: ' + inPage.cta)
  // The class calendar: pinned to Friday Oct 9, 10:00 AM Central so the test does not depend on the day it runs.
  await pp.clock.setFixedTime(new Date('2026-10-09T15:00:00Z'))
  await pp.goto('http://localhost:4620/pink-october', { waitUntil: 'load' })
  const cal = await pp.evaluate(() => ({
    month: document.querySelector('.pick__head')?.textContent,
    open: [...document.querySelectorAll('.pick__d.is-open')].map(b => +b.textContent).join(),
    shut: [...document.querySelectorAll('.pick__d.is-shut')].map(b => +b.textContent).join(),
    on: document.querySelector('.pick__d.is-on')?.textContent,
    shown: [...document.querySelectorAll('#pick-panel .pick__time')].map(b => b.dataset.time + '|' + b.dataset.name).join(),
    title: document.querySelector('#pick-panel .pick__day-title')?.textContent,
  }))
  check('L1y the picker is a calendar of the whole month, not one week',
    cal.month === 'October 2026' && /^9,10,13,14,15,16,17,19,20,21,22,23,24,26,27,28,29,30,31$/.test(cal.open), JSON.stringify(cal))
  check('L1y past days, Sundays (no beginner class) and the Columbus Day closure are not selectable; the closure is marked',
    cal.shut === '12' && !/(^|,)(1|8|11|12|18|25)(,|$)/.test(cal.open), JSON.stringify(cal))
  check('L1y on a Friday morning it opens on today, Friday Oct 9, listing the 11:00 AM and the Friday adult comp class',
    cal.on === '9' && cal.title === 'Friday, October 9' && cal.shown === '11:00 AM|Adult BJJ,6:30 PM|Adult Comp', JSON.stringify(cal))
  await pp.click('[data-pick-date="2026-10-14"]')
  check('L1y tapping a date lists that weekday\'s classes',
    (await pp.$$eval('#pick-panel .pick__time', bs => bs.map(b => b.dataset.time).join())) === '6:30 AM,11:00 AM,6:30 PM' &&
    (await pp.textContent('#pick-panel .pick__day-title')) === 'Wednesday, October 14')
  await pp.click('[data-pick-date="2026-10-23"]')
  check('L1y every Friday in the month lists the adult comp class',
    (await pp.$$eval('#pick-panel .pick__time', bs => bs.map(b => b.dataset.name).join())).includes('Adult Comp'))
  check('L1y the special event shows only on its own date, linked to its RSVP page',
    (await pp.locator('#pick-panel .pick__event').count()) === 0)
  await pp.click('[data-pick-date="2026-10-24"]')
  check('L1y Saturday Oct 24 shows the Rolling for Ribbons seminar with an RSVP link',
    (await pp.locator('#pick-panel a.pick__event[href="/self-defense-for-women"]').count()) === 1 &&
    /Rolling for Ribbons/.test(await pp.textContent('#pick-panel .pick__event')) && (await pp.locator('.pick__d.is-event').count()) === 1)
  await pp.click('[data-pick-date="2026-10-21"]')
  await pp.click('#pick-panel .pick__time >> nth=0')
  await pp.waitForTimeout(500)
  const form = await pp.evaluate(() => ({
    open: !!document.querySelector('.booking-overlay.open'), text: document.querySelector('.booking-overlay.open')?.innerText || '',
    date: document.querySelector('input[name="bookingDate"]:checked')?.id,
  }))
  check('L1y tapping a class opens the booking form for that class on the date picked',
    form.open && /Adult BJJ/.test(form.text) && /Wed/i.test(form.text) && /6:30 AM/.test(form.text) && form.date === 'bookingDate-2026-10-21', JSON.stringify(form).slice(0, 200))
  await pp.evaluate(() => window.LabyrinthBooking.close())
  // A booking from the Pink October calendar says so in the lead's note; one from anywhere else does not.
  {
    const leads = []
    await pp.route('**/functions/v1/book-trial', async route => {
      leads.push(JSON.parse(route.request().postData() || '{}'))
      await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{"ok":true}' })
    })
    const book = async () => {
      await pp.fill('#bookingName', 'Test Person'); await pp.fill('#bookingEmail', 'test@example.com'); await pp.fill('#bookingPhone', '(281) 555-0100')
      await pp.click('#bookingSubmitBtn'); await pp.waitForSelector('.booking-success'); await pp.evaluate(() => window.LabyrinthBooking.close())
    }
    await pp.goto('http://localhost:4620/pink-october', { waitUntil: 'load' })
    await pp.click('[data-pick-date="2026-10-14"]'); await pp.click('#pick-panel .pick__time >> nth=0'); await pp.waitForSelector('#bookingForm')
    await book()
    await pp.evaluate(() => window.LabyrinthBooking.openForm('Adult BJJ', 'Gi', 'Tue', '6:30 AM'))
    await pp.waitForSelector('#bookingForm'); await book()
    check('L1y a booking from the Pink October calendar is tagged PINK OCTOBER at the front of the lead note, on the date picked',
      /^PINK OCTOBER: Adult BJJ, Gi, Wednesday 6:30 AM, booked from the website$/.test(leads[0]?.note) && /2026-10-14T06:30/.test(leads[0]?.trialAt), JSON.stringify(leads[0]))
    check('L1y a booking from anywhere else carries no Pink October tag', leads.length === 2 && !/PINK/i.test(leads[1].note), JSON.stringify(leads[1]))
    await pp.unroute('**/functions/v1/book-trial')
  }
  // A Friday evening: the day's classes are gone, so it opens on the next day that has some.
  await pp.clock.setFixedTime(new Date('2026-10-10T02:00:00Z'))
  await pp.goto('http://localhost:4620/pink-october', { waitUntil: 'load' })
  check('L1y when a day has no classes left it opens on the next day that does',
    (await pp.evaluate(() => document.querySelector('.pick__d.is-on')?.textContent)) === '10')
  await pp.click('main .pink-band a[href="#pick-class"]')
  {
    // The booking is the first thing on both women's pages: in the hero, beside the headline.
    await pp.setViewportSize({ width: 1280, height: 900 })
    await pp.goto('http://localhost:4620/pink-october', { waitUntil: 'load' })
    const pk2 = await pp.evaluate(() => ({ inHero: !!document.getElementById('pick-class').closest('header.pink-hero'), top: Math.round(document.getElementById('pick-class').getBoundingClientRect().top), days: document.querySelectorAll('#pick-class .pick__d.is-open').length, h1top: Math.round(document.querySelector('h1').getBoundingClientRect().top) }))
    check('L1y on Pink October the class calendar is in the hero, beside the headline and in view without scrolling',
      pk2.inHero && pk2.top < 300 && pk2.days > 5 && Math.abs(pk2.top - pk2.h1top) < 160, JSON.stringify(pk2))
    await pp.goto('http://localhost:4620/self-defense-for-women', { waitUntil: 'load' })
    const sd2 = await pp.evaluate(() => ({ inHero: !!document.getElementById('rsvp-form').closest('header.rsvp-hero'), top: Math.round(document.getElementById('rsvp').getBoundingClientRect().top) }))
    check('L1y on the seminar page the RSVP form is in the hero, in view without scrolling', sd2.inHero && sd2.top < 300, JSON.stringify(sd2))
    await pp.setViewportSize({ width: 390, height: 844 })
    await pp.goto('http://localhost:4620/pink-october', { waitUntil: 'load' })
    check('L1y on a phone the Pink October calendar is within the first screen and a half',
      (await pp.evaluate(() => Math.round(document.getElementById('pick-class').getBoundingClientRect().top))) < 1300)
    await pp.setViewportSize({ width: 1200, height: 900 })
  }
  check('L1y the page buttons lead to the picker', (await pp.locator('a[href="#pick-class"]').count()) >= 3)
  await pp.goto('http://localhost:4620/pink-october', { waitUntil: 'networkidle' })
  const muted = await pp.evaluate(() => {
    const rgb = c => c.match(/\d+/g).slice(0, 3).map(Number)
    const lin = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }
    const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
    const fg = getComputedStyle(document.querySelector('.offer-card p:not(.offer-card__big)')).color
    const bg = getComputedStyle(document.querySelector('main')).backgroundColor
    const a = lum(rgb(fg)), b = lum(rgb(bg))
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
  })
  check('L1y body text is readable on the rose-black (WCAG AA, 4.5:1)', muted >= 4.5, muted.toFixed(1))
  const big = await pp.evaluate(() => getComputedStyle(document.querySelector('.offer-card__big')).color)
  check('L1y the FREE and 50% OFF numerals are the bright pink, not washed out', big === PINK, big)

  // The event page wears the same theme and points at the offers.
  await pp.goto('http://localhost:4620/self-defense-for-women', { waitUntil: 'networkidle' })
  const ev = await pp.evaluate(() => ({
    theme: document.body.classList.contains('theme-pink'),
    primary: getComputedStyle(document.querySelector('main .btn--gold')).backgroundColor,
    hero: getComputedStyle(document.querySelector('.rsvp-hero')).backgroundImage.includes('gradient'),
    link: !!document.querySelector('a.pink-link-card[href="/pink-october"]'),
  }))
  check('L1y the event page is fully pink too, and links to Pink October',
    ev.theme && ev.primary === PINK && ev.hero && ev.link, JSON.stringify(ev))

  const bg = await pp.evaluate(() => ({
    mark: !!document.querySelector('.rsvp-hero__mark svg.ribbon'),
    markDecor: document.querySelector('.rsvp-hero__mark')?.getAttribute('aria-hidden') === 'true',
    pattern: getComputedStyle(document.querySelector('.rsvp-hero'), '::before').display !== 'none'
      && getComputedStyle(document.querySelector('.rsvp-hero'), '::before').backgroundImage.includes('svg'),
    og: document.querySelector('meta[property="og:image"]')?.content,
  }))
  check('L1y the header has the big background ribbon and the repeating ribbon pattern behind it',
    bg.mark && bg.markDecor && bg.pattern, JSON.stringify(bg))
  const og = readFileSync(join(ROOT, 'assets/og-self-defense.jpg'))
  const ogSize = (() => { let i = 2; while (i < og.length) { if (og[i] !== 0xFF) { i++; continue } const m = og[i + 1]
    if (m >= 0xC0 && m <= 0xCF && m !== 0xC4 && m !== 0xC8 && m !== 0xCC) return [og.readUInt16BE(i + 7), og.readUInt16BE(i + 5)]
    i += 2 + og.readUInt16BE(i + 2) } return null })()
  check('L1y the share image is 1200x630 and is what the page advertises',
    JSON.stringify(ogSize) === '[1200,630]' && bg.og === 'https://labyrinth.vision/assets/og-self-defense.jpg', JSON.stringify(ogSize) + ' ' + bg.og)

  // The offers end on October 31.
  await pp.clock.setFixedTime(new Date('2026-10-31T23:00:00Z'))
  await pp.goto('http://localhost:4620/pink-october', { waitUntil: 'networkidle' })
  check('L1y the offers are still up on October 31 (6:00 PM Central)', !(await pp.isVisible('#pink-ended')) && await pp.isVisible('#offers'))
  await pp.clock.setFixedTime(new Date('2026-11-01T06:00:00Z'))
  await pp.goto('http://localhost:4620/pink-october', { waitUntil: 'networkidle' })
  check('L1y after October the page says the offers ended and shows none',
    (await pp.isVisible('#pink-ended')) && !(await pp.isVisible('#offers')) && !(await pp.isVisible('#start')))
  await ctx.close()
}

// ── L1r: every page asks for the stylesheet it was built against ──
// Cloudflare Pages serves CSS with max-age=14400 and HTML with max-age=0,
// so for four hours after a CSS change a returning visitor gets new markup
// and the old stylesheet. Setting Cache-Control in _headers does not work:
// Pages applies the other headers in that file and overrides this one. The
// fix is a content hash in the URL, and this check is what keeps it honest,
// because a stale stamp is invisible until it reaches somebody's phone.
{
  const stamped = execFileSync('python3', [join(ROOT,'scripts/stamp_assets.py')],
    { cwd: ROOT, encoding: 'utf8' })
  check('L1r asset stamps are up to date',
    /stamped 0 file\(s\)/.test(stamped),
    'run: python3 scripts/stamp_assets.py\n' + stamped.trim())

  // The stamp is worthless if the page stops naming the file. Check the shape
  // on one generated page and one hand-maintained one.
  for (const f of ['ennova.html', 'index.html']) {
    const html = readFileSync(join(ROOT, f), 'utf8')
    const refs = html.match(/(?:href|src)="[^"]*\/(?:style|base|programs|booking)\.css[^"]*"/g) || []
    check(`L1r ${f} versions every stylesheet it loads`,
      refs.length > 0 && refs.every(r => /\?v=[0-9a-f]{8}"/.test(r)),
      refs.filter(r => !/\?v=/.test(r)).join(', ') || `found ${refs.length}`)
  }
}

// ── L1s: the Team Legacy transfer ──
// The announcement is public and indexable; the transfer form is a billing
// page for people already enrolled somewhere else, so it is noindex and stays
// out of the sitemap.
//
// The form itself is the part that matters. A transferring family is a MEMBER
// from the moment they sign, so it creates roster rows rather than a lead, and
// it hands off to Stripe in setup mode: the card is stored and NOTHING is
// charged, because every rate here is negotiated and gets set afterwards by a
// person. The signature and both agreements are the legal basis for storing
// that card, so none of them may be optional and all of them must be sent.
{
  const announce = readFileSync(join(ROOT,'legacy/index.html'),'utf8')
  const transfer = readFileSync(join(ROOT,'legacy/transfer.html'),'utf8')

  // It shipped pointing at /legacy, which is the announcement itself.
  check('L1s the announcement links to the transfer form',
    /href="\/legacy\/transfer"/.test(announce))
  check('L1s the transfer form is noindex',
    /name="robots"[^>]*noindex/.test(transfer))
  const locs = [...readFileSync(join(ROOT,'sitemap.xml'),'utf8')
    .matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1])
  check('L1s the transfer form is not in the sitemap',
    !locs.some(u => u.includes('/legacy/transfer')), locs.filter(u => u.includes('legacy')).join(', '))

  // Storing a card to charge later is only lawful on terms that say what is
  // charged, when, how the amount is arrived at, and how to stop it. Every
  // rate here is different, so "how the amount is determined" is the sentence
  // doing the real work, and losing it in an edit would be invisible.
  for (const [what, re] of [
    ['nothing is charged today', /Nothing is charged today/i],
    ['when the last Team Legacy payment lands', /final payment in September/i],
    ['when Labyrinth billing starts', /billing starts in October/i],
    ['how the rate is decided', /rate is the one we agree/i],
    ['when it recurs', /repeats monthly/i],
    ['how to cancel', /cancel at any time/i],
  ]) {
    check(`L1s the billing consent states ${what}`, re.test(transfer))
  }

  let posted = null
  await page.route('**/functions/v1/member-transfer', route => {
    posted = JSON.parse(route.request().postData() || '{}')
    return route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ ok: true, recorded: true, url: 'http://localhost:4620/pricing' }),
    })
  })

  // Neither agreement ticked: nothing may leave the page.
  await page.goto('http://localhost:4620/legacy/transfer', { waitUntil:'networkidle' })
  await page.fill('#tfStudent', 'Site Test')
  await page.fill('#tfPhone', '2813937983')
  await page.fill('#tfEmail', 'site-test@example.com')
  await page.fill('#tfSig', 'Site Test')
  await page.click('#tfSubmit')
  await page.waitForTimeout(300)
  check('L1s no card step without the waiver and the billing authority',
    posted === null, JSON.stringify(posted))

  // Complete, and it goes.
  await page.selectOption('#tfProgram', 'kids-3-6')
  await page.check('#tfWaiver')
  await page.check('#tfAuth')
  await page.click('#tfSubmit')
  await page.waitForTimeout(800)

  check('L1s a complete transfer is sent to member-transfer',
    posted !== null && posted.students === 'Site Test', JSON.stringify(posted))
  check('L1s with the programme the family picked',
    posted?.program === 'kids-3-6', JSON.stringify(posted?.program))
  check('L1s and the signature and both agreements',
    posted?.signature === 'Site Test'
    && posted?.waiver_accepted === true && posted?.billing_authorized === true,
    JSON.stringify(posted))
  check('L1s then hands off to the Stripe URL it was given',
    page.url() === 'http://localhost:4620/pricing', page.url())

  // Stripe returns them with ?done=1. Nothing was charged, so the page has to
  // say that rather than thank them for a payment they have not made.
  await page.goto('http://localhost:4620/legacy/transfer?done=1', { waitUntil:'networkidle' })
  check('L1s coming back from Stripe shows the confirmation, not the form',
    await page.isVisible('#tfDone') && !(await page.isVisible('#tfPanel')))
  check('L1s and says nothing has been charged',
    /nothing has been charged/i.test(await page.textContent('#tfDone')))
  await page.unroute('**/functions/v1/member-transfer')
}

// ── L1t: who may book what, and until when ──
// The rule: a brand-new child books a trial only into the classes flagged
// "trial" (Friday afternoon, Saturday morning); youth wrestling is its own
// program and books directly; adults book anything; and a class is bookable
// right up to its start.
//
// This used to sweep three hand-kept copies of the week and exempted Friday
// and Saturday wholesale, which let the Saturday-noon advanced classes carry a
// Book button behind the belt warning. There is now one generated schedule and
// one set of drawers, and the check is exact: every directly bookable kids
// class must be one the kids trial list actually offers.
{
  await page.goto('http://localhost:4620/', { waitUntil:'domcontentloaded' })

  const leaks = await page.evaluate(() => {
    const out = []
    const trials = new Set(LabyrinthBooking.kidsTrialClasses.map(c => `${c.name}|${c.day}|${c.time}`))
    const norm = n => n.replace(/\s+/g, ' ').trim()
    document.querySelectorAll('.sc__class[data-aud="kids"][data-book="form"]').forEach(c => {
      const name = c.getAttribute('data-name')
      if (/wrestl/i.test(name)) return
      const key = `${name}|${c.getAttribute('data-day')}|${c.getAttribute('data-time')}`
      if (!trials.has(key)) out.push(`schedule ${key}`)
    })
    // Only the kids drawers: guessing from the name caught "Adult & Teens".
    document.querySelectorAll('#drawer-kids-gi .type-sched-bar, #drawer-kids-nogi .type-sched-bar').forEach(bar => {
      const nameEl = bar.querySelector('.type-sched-bar__name')
      const name = norm(nameEl?.textContent || '').replace(/\((\d)/, ' ($1').replace(/\s+\(/, ' (')
      if (/wrestl/i.test(name) || !bar.querySelector('.type-sched-bar__book')) return
      const day = bar.querySelector('.type-sched-bar__day')?.textContent.trim()
      const time = bar.querySelector('.type-sched-bar__time')?.textContent.trim()
      if (!trials.has(`${name}|${day}|${time}`)) out.push(`drawer ${name}|${day}|${time}`)
    })
    return out
  })
  // A sweep that finds nothing to sweep proves nothing. The old version of
  // this check passed silently for as long as its selectors matched nothing.
  const swept = await page.evaluate(() =>
    document.querySelectorAll('.sc__class[data-aud="kids"]').length)
  check('L1t the sweep below is looking at the real schedule', swept > 10, 'kids cards: ' + swept)
  check('L1t kids classes outside the trial list are never bookable',
    leaks.length === 0, leaks.join('; '))

  // The same rule from the data side: the picker offers kids exactly these.
  const kidsList = await page.evaluate(() =>
    LabyrinthBooking.kidsTrialClasses.map(c => c.day + ' ' + c.type))
  check('L1t the kids trial list is Friday Gi, Saturday No-Gi and Saturday MMA Conditioning',
    kidsList.length > 0 && kidsList.every(x => x.startsWith('Fri ') || x === 'Sat No-Gi' || x === 'Sat '),
    kidsList.join(', '))

  // Bookable until the class starts. Behaviour, on the academy's clock: a
  // class starting a minute from now is offered today; one that started a
  // minute ago is offered next week. Skipped in the minute either side of
  // midnight, where "a minute ago" wraps into yesterday.
  const cut = await page.evaluate(() => {
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }))
    const mins = now.getHours() * 60 + now.getMinutes()
    if (mins < 2 || mins > 1437) return { skip: true }
    const abbr = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][now.getDay()]
    const fmt = m => {
      let h = Math.floor(m / 60); const ap = h >= 12 ? 'PM' : 'AM'
      return (h % 12 || 12) + ':' + String(m % 60).padStart(2, '0') + ' ' + ap
    }
    const soon = LabyrinthBooking.nextDate(abbr, fmt(mins + 1))
    const past = LabyrinthBooking.nextDate(abbr, fmt(mins - 1))
    return { skip: false,
      soonToday: soon.getDate() === now.getDate() && soon.getMonth() === now.getMonth(),
      pastNextWeek: past.getDate() !== now.getDate() || past.getMonth() !== now.getMonth() }
  })
  check('L1t a class is bookable up to the minute it starts',
    cut.skip || (cut.soonToday && cut.pastNextWeek), JSON.stringify(cut))

  // The campaign pages carry the booking modal at the top, and Legacy leads
  // with the transfer.
  const ennova = readFileSync(join(ROOT,'ennova.html'),'utf8')
  check('L1t the Ennova hero opens the booking modal',
    /hero__ctas[\s\S]{0,400}data-book-trial/.test(ennova))
  const legacyPage = readFileSync(join(ROOT,'legacy/index.html'),'utf8')
  check('L1t the Legacy hero leads with the transfer and can book a class',
    /hero__ctas\s*">\s*<a href="\/legacy\/transfer"/.test(legacyPage)
    && /hero__ctas[\s\S]{0,600}data-book-trial/.test(legacyPage))

  // And the Ennova button actually opens it.
  await page.goto('http://localhost:4620/ennova', { waitUntil:'networkidle' })
  await page.click('.hero__ctas [data-book-trial]')
  await page.waitForTimeout(400)
  check('L1t the Ennova hero button opens the booking modal',
    await page.evaluate(() =>
      document.getElementById('bookingOverlay')?.classList.contains('open') === true))
  await page.keyboard.press('Escape')
}

// ── L2: no .html blog links survive ──
await page.goto('http://localhost:4620/blog/', { waitUntil:'domcontentloaded' })
const dotHtml = await page.$$eval('a[href]', as => as.map(a=>a.getAttribute('href')).filter(h=>h && /[a-z0-9-]+\.html/.test(h)))
check('L2 blog index has no .html links', dotHtml.length === 0, JSON.stringify(dotHtml))

// ── L3: canonical points at a URL that serves 200 ──
await page.goto('http://localhost:4620/blog/what-to-expect-first-bjj-class', { waitUntil:'domcontentloaded' })
const canon = await page.$eval('link[rel=canonical]', el => el.href)
check('L3 canonical is extensionless', !canon.endsWith('.html'), canon)

// ── L4: the CTA is present and points at the booking form ──
const cta = await page.$('.article-cta__btn')
check('L4 blog post has a booking CTA', !!cta)
const ctas = await page.$$('.article-cta__btn, .blog-cta__btn')
check('L4 exactly one in-article CTA', ctas.length === 1, 'found ' + ctas.length)
// It used to point at the front page's #contact section, which meant a reader
// who had decided to come in was sent back to the front page to find the
// booking button. It now opens the booking modal on the post itself, and keeps
// an href to /#book so it still reaches a booking form with JavaScript off.
// booking.test.mjs drives the modal itself; this only guards the markup.
check('L4 CTA opens the booking modal', await cta.getAttribute('data-book-trial') !== null)
check('L4 CTA still works without JS', (await cta.getAttribute('href')).includes('#book'))

// ── L5: the contact form now POSTs to the CRM and honours the response ──
await page.goto('http://localhost:4620/', { waitUntil:'domcontentloaded' })
let posted = null
await page.route('**/functions/v1/book-trial', async route => {
  posted = JSON.parse(route.request().postData() || '{}')
  await route.fulfill({ status:200, contentType:'application/json', body: JSON.stringify({ok:true}) })
})
await page.fill('#contactForm [name="name"]', 'Site Test')
await page.fill('#contactForm [name="email"]', 'site-test@example.com')
await page.fill('#contactForm [name="phone"]', '555-0111')
await page.selectOption('#contactForm [name="program"]', 'kids-7-12')
await page.fill('#contactForm [name="message"]', 'from the local test')
await page.click('#contactForm button[type="submit"]')
await page.waitForTimeout(600)
check('L5 contact form posts to the CRM', posted !== null)
check('L5 sends the real name', posted?.name === 'Site Test', JSON.stringify(posted))
check('L5 maps the program slug to a label', posted?.program === 'Kids 7-12', posted?.program)
check('L5 sends the message as a note', posted?.note === 'from the local test')
check('L5 shows success only after ok', await page.isHidden('#contactForm'))

// ── L6: a CRM failure must NOT show success ──
await page.goto('http://localhost:4620/', { waitUntil:'domcontentloaded' })
await page.route('**/functions/v1/book-trial', route =>
  route.fulfill({ status:500, contentType:'application/json', body: JSON.stringify({error:'nope'}) }))
let alerted = null
page.on('dialog', d => { alerted = d.message(); d.dismiss() })
await page.fill('#contactForm [name="name"]', 'Fail Case')
await page.fill('#contactForm [name="email"]', 'fail@example.com')
await page.click('#contactForm button[type="submit"]')
await page.waitForTimeout(700)
check('L6 failure does not fake success', await page.isVisible('#contactForm'))
check('L6 tells them to call', (alerted||'').includes('call the academy'), JSON.stringify(alerted))

// ── L1u: the Enigma drop ──
// The page comes from the CRM as a fragment and is pasted in verbatim
// (scripts/drop-fragment.html), so the two things worth guarding are the
// values that have to agree with the endpoint taking the money, and the one
// bug the fragment shipped with.
//
// That bug: `hidden` only gets its display:none from the browser's own
// stylesheet, so the author rules setting .drop__bar and .drop__sheet to
// display:flex beat it, and the empty basket sheet covered the whole viewport
// on load — inset:0, z-index:70 — swallowing every tap. Nothing could be
// ordered and the page still looked fine in a screenshot. A fresh copy pasted
// in from the CRM would bring it straight back, which is what this catches.
{
  const drop = readFileSync(join(ROOT,'drop.html'),'utf8')

  check('L1u the drop page is wrapped in the site chrome',
    /<nav class="nav"/.test(drop) && /<footer class="footer"/.test(drop) && /<main id="main">/.test(drop))
  check('L1u the drop page is noindex', /name="robots"[^>]*noindex/.test(drop))
  const locs = [...readFileSync(join(ROOT,'sitemap.xml'),'utf8')
    .matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1])
  check('L1u the drop page is not in the sitemap',
    !locs.some(l => l.replace(/\/$/,'') === 'https://labyrinth.vision/drop'))

  // Must match the CRM's own copy. The server charges its own price, so a
  // number that drifts here only makes the button lie.
  for (const [what, re] of [
    ['the endpoint', /https:\/\/jctufxvmuvobaggxcwfn\.supabase\.co\/functions\/v1\/gi-preorder/],
    ['the price', /var PRICE = 109;/],
    ['both colourways', /id: 'ariadne'[\s\S]*id: 'asterion'/],
    ['the returnTo line', /returnTo: window\.location\.origin \+ window\.location\.pathname/],
    ['the returnTo line', /returnTo: window\.location\.origin \+ window\.location\.pathname/],
    ['Turnstile still off', /TURNSTILE_SITE_KEY = ''/],
  ]) check(`L1u the drop page keeps ${what}`, re.test(drop))

  // The real gi, front and back, per colorway — and now per fit as well.
  check('L1u the models are a scrolling reel',
    /<div class="drop__reel"/.test(drop) && /scroll-snap-type: x mandatory/.test(drop))
  check('L1u and it covers all three fits', /key: 'kids'/.test(drop)
    && /key: 'mens'/.test(drop) && /key: 'womens'/.test(drop))
  check('L1u the tabs it replaced are gone',
    !/drop__fits|drop__shots|drop-front|drop-back/.test(drop))
  // Every photograph the script can ask for has to exist on the CRM's host, or
  // a tap lands on a broken image. Named here so a typo in one filename fails
  // rather than shipping.
  for (const f of ['ariadne-kids-front', 'ariadne-kids-back',
                   'ariadne-womens-front', 'ariadne-womens-back',
                   'asterion-kids-front', 'asterion-kids-back',
                   'asterion-womens-front', 'asterion-womens-back'])
    check(`L1u the script names ${f}.webp`, new RegExp(`'${f}\\.webp'`).test(drop))
  // Every fit is now shot from both sides, so nobody meets a half-populated
  // figure whichever tab they open.
  // Keyed on the fit name, because `front`/`back` also sit at the top level of
  // each colorway as the men's pair — counting bare pairs finds 8, not 6.
  const withBoth = drop.match(/(kids|mens|womens): \{ front: '[a-z-]+\.webp', back: '[a-z-]+\.webp' \}/g) || []
  check('L1u all three fits have a front and a back, in both colorways',
    withBoth.length === 6, `${withBoth.length} of 6`)

  /**
   * The size run, exactly.
   *
   * This is the check that matters most on this page, and a loose one would
   * have missed the reason it exists: the endpoint validates every size server
   * side and refuses anything outside its own list, so a page offering a size
   * the server has dropped sends somebody to a dead end at the pay button, and
   * a page missing a size the server accepts silently loses the sale. Both
   * happened here — this page went on offering eight sizes (A0H, A1H, A3H,
   * A4L, A4H, F1H, F2H, F3H) after the endpoint stopped accepting them, and
   * never offered the twelve it had gained, the two smallest kids sizes among
   * them.
   *
   * So it is asserted as an exact list rather than a spot check. When the CRM
   * changes the run again this fails until scripts/drop-fragment.html is
   * re-synced, which is the whole point: the two must not be allowed to drift
   * quietly a second time.
   */
  const ENDPOINT_SIZES = [
    'M0000', 'M000', 'M00', 'M0', 'M1', 'M2', 'M3', 'M4',
    'A0', 'A0L', 'A1', 'A1F', 'A1L', 'A2', 'A2S', 'A2H', 'A2L', 'A2XL',
    'A3', 'A3S', 'A3L', 'A4', 'A5', 'A6',
    'F1', 'F1L', 'F2', 'F2C', 'F2L', 'F3', 'F3C', 'F3L', 'F4', 'F4L',
  ]
  const groupBlock = /var SIZE_GROUPS = \[([\s\S]*?)\n  \];/.exec(drop)
  const offered = groupBlock ? [...groupBlock[1].matchAll(/'([A-Z0-9]+)'/g)].map(m => m[1]) : []
  const rejected = offered.filter(s => !ENDPOINT_SIZES.includes(s))
  const unoffered = ENDPOINT_SIZES.filter(s => !offered.includes(s))
  check('L1u every size offered is one the endpoint accepts',
    rejected.length === 0, 'server would refuse: ' + rejected.join(', '))
  check('L1u and every size the endpoint accepts is offered',
    unoffered.length === 0, 'missing from the page: ' + unoffered.join(', '))
  check('L1u the run is the full 34', offered.length === 34, 'offered: ' + offered.length)

  /**
   * The size guide is keyed by size code, and a code that is not in the run is
   * a row nobody can ever buy — or worse, a hint that a size exists when the
   * endpoint would refuse it. Kept out of SIZE_GROUPS on purpose: that block is
   * parsed for the run itself, and a size written twice in there would fail a
   * check that is right to be strict.
   */
  const chartBlock = /var SIZE_CHART = \{([\s\S]*?)\n  \};/.exec(drop)
  check('L1u the size guide is declared apart from the run', !!chartBlock)
  const charted = chartBlock ? [...chartBlock[1].matchAll(/^\s{4}([A-Z0-9]+):/gm)].map(m => m[1]) : []
  const orphans = charted.filter(c => !ENDPOINT_SIZES.includes(c))
  check('L1u every size in the guide is a size that can be ordered',
    orphans.length === 0, 'not in the run: ' + orphans.join(', '))
  check('L1u the guide covers the whole run', charted.length === 34, charted.length + ' charted')

  await page.setViewportSize({ width:390, height:844 })
  await page.goto('http://localhost:4620/drop', { waitUntil:'domcontentloaded' })
  await page.waitForTimeout(250)

  check('L1u the basket sheet is hidden until it is asked for',
    await page.isHidden('#drop-sheet'))
  check('L1u the reserve bar is hidden until something is in the basket',
    await page.isHidden('#drop-bar'))
  // The proof the tap actually lands: what is under the middle of the screen.
  check('L1u nothing is covering the page on load',
    !(await page.evaluate(() => {
      const t = document.elementFromPoint(195, 400)
      return !!(t && t.closest && t.closest('#drop-sheet'))
    })))
  check('L1u no horizontal overflow on a phone',
    await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth))
  // A modal drawn under the fixed header is a modal the header sits on top of.
  check('L1u the basket sheet is above the site header',
    await page.evaluate(() => {
      const z = el => parseInt(getComputedStyle(el).zIndex || '0', 10)
      return z(document.getElementById('drop-sheet')) > z(document.querySelector('.nav'))
    }))

  // A size can be chosen, and the bar then says what it will charge.
  await page.click('.drop__size:text-is("A2")')
  await page.waitForTimeout(200)
  check('L1u the guide is folded away until asked for',
    await page.$$eval('.drop__guide', e => e.length === 3 && e.every(x => !x.open)))
  check('L1u a size can be added', await page.isVisible('#drop-bar'))
  check('L1u the bar totals at the advertised price',
    (await page.textContent('#drop-go')).includes('$109.00'),
    await page.textContent('#drop-go'))

  /**
   * Review has to be reachable with a thumb.
   *
   * It is the only way into the basket, and it lives in the bottom bar — which
   * on a phone shares the bottom of the screen with the home indicator's swipe
   * strip. Safari reports `safe-area-inset-bottom` as 0 while its toolbar is
   * collapsed, which is exactly when this bar is flush to the glass, so the
   * padding meant to keep clear of that strip disappeared at the one moment it
   * mattered and the word "Review" sat half off the bottom of the screen.
   *
   * Headless Chromium reports 0 for that inset too, so this is the same case
   * rather than an approximation of it — which is what makes the clearance
   * assertion below meaningful rather than decorative.
   */
  const review = await page.evaluate(() => {
    const el = document.getElementById('drop-review')
    const r = el.getBoundingClientRect()
    const hit = document.elementFromPoint(
      Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2))
    return {
      w: Math.round(r.width), h: Math.round(r.height),
      clearance: Math.round(window.innerHeight - r.bottom),
      hits: !!(hit && hit.closest && hit.closest('#drop-review')),
    }
  })
  check('L1u the Review target is big enough for a thumb',
    review.w >= 44 && review.h >= 44, `${review.w}×${review.h}`)
  check('L1u and sits clear of the home-indicator strip',
    review.clearance >= 12, `${review.clearance}px above the bottom`)
  check('L1u and a tap in the middle of it lands on it', review.hits)

  // What it would send. returnTo is the string the endpoint's allow-list
  // checks and Stripe returns people to, so it has to be the page's own URL.
  let dropPosted = null
  await page.route('**/functions/v1/gi-preorder', route => {
    dropPosted = JSON.parse(route.request().postData() || '{}')
    return route.fulfill({ status:200, contentType:'application/json',
      body: JSON.stringify({ ok:false, error:'test' }) })
  })
  /**
   * The bar opens the basket. It must NOT pay.
   *
   * It used to go straight to Stripe, and the abandonment pattern said that
   * was costing orders: people reached the payment page and left without
   * typing a character, several retrying the same size minutes later. This is
   * the assertion that keeps the confirmation step in place — wiring the bar
   * back to `checkout` is a one-word change and would look harmless.
   */
  await page.click('#drop-go')
  await page.waitForTimeout(400)
  check('L1u the bar opens the basket rather than paying',
    dropPosted === null && await page.isVisible('#drop-sheet'),
    JSON.stringify(dropPosted))
  check('L1u and the basket shows what is about to be charged',
    (await page.textContent('#drop-total')).includes('109.00'),
    await page.textContent('#drop-total'))

  /**
   * Nobody reaches Stripe without an address the academy can write to.
   *
   * Of the drop's first 19 visits, 14 left without buying and Stripe held an
   * email for none of them — it only asks once somebody is already on its
   * page, and they left before typing a character. So the basket asks, and
   * this is the check that keeps it asking.
   */
  await page.click('#drop-sheet-go')
  await page.waitForTimeout(400)
  check('L1u reserving without an email posts nothing',
    dropPosted === null, JSON.stringify(dropPosted))
  check('L1u and says so inside the basket, where it can be seen',
    await page.isVisible('#drop-mail-err') && await page.isVisible('#drop-sheet'),
    `err=${await page.isVisible('#drop-mail-err')} sheet=${await page.isVisible('#drop-sheet')}`)

  await page.fill('#drop-email', 'not-an-address')
  await page.click('#drop-sheet-go')
  await page.waitForTimeout(300)
  check('L1u nor with something that is not an address',
    dropPosted === null, JSON.stringify(dropPosted))

  // Only the button inside the basket sends anybody to Stripe.
  await page.fill('#drop-email', 'buyer@example.com')
  await page.click('#drop-sheet-go')
  await page.waitForTimeout(500)
  check('L1u reserving sends the chosen gi',
    dropPosted?.items?.[0]?.size === 'A2' && dropPosted?.items?.[0]?.colourway === 'ariadne',
    JSON.stringify(dropPosted))
  check('L1u and the address the basket collected',
    dropPosted?.email === 'buyer@example.com', dropPosted?.email)
  check('L1u and sends this page as the place to come back to',
    dropPosted?.returnTo === 'http://localhost:4620/drop', dropPosted?.returnTo)

  /**
   * The basket survives leaving the page.
   *
   * Reserve sends people to Stripe on another origin, and coming back used to
   * land on an empty shop: no bar, no sign of the size chosen, and the only
   * way on was to pick again and press Reserve again — a fresh Stripe session
   * every time. The drop's worst visit was eleven sessions in one sitting,
   * eleven different sizes, not one email typed. That is one person who could
   * not get back to where they were.
   */
  await page.goto('http://localhost:4620/drop')
  await page.waitForTimeout(500)
  check('L1u coming back finds the basket still there',
    (await page.textContent('#drop-go')).includes('109.00'),
    await page.textContent('#drop-go'))
  check('L1u and the address still typed in',
    await page.inputValue('#drop-email'), 'buyer@example.com')

  // And it is spent once the order lands, so it cannot sell the same gi twice.
  await page.goto('http://localhost:4620/drop?paid=cs_test_x')
  await page.waitForTimeout(500)
  await page.goto('http://localhost:4620/drop')
  await page.waitForTimeout(500)
  check('L1u a completed order clears it',
    await page.isHidden('#drop-bar'), 'bar still showing after a paid return')

  await page.unroute('**/functions/v1/gi-preorder')
  await page.setViewportSize({ width:1280, height:800 })
}

// ── L1w: the discount code ──
// A staff code takes the whole $109, and a redemption is a real garment the
// academy pays a maker to produce. Two things therefore have to stay true, and
// only one of them is about the page working.
//
// The first is that THE CODE IS NOT IN THE PAGE. This is static HTML served to
// the public: a code written into its script is readable by anybody who presses
// View Source, and "100% off" published to the internet is not a discount, it
// is a free shop. The page holds no codes at all — it posts what somebody typed
// and the endpoint decides — and the check below is what keeps it that way when
// somebody later reaches for the obvious shortcut of validating in the browser.
//
// The second is that a free order still says whose gi it is. It never reaches
// Stripe (Stripe will not open a session for a zero total), and Stripe is what
// collects the name and email on every other order — so without these fields a
// comped gi arrives with nobody attached to it.
{
  const drop = readFileSync(join(ROOT,'drop.html'),'utf8')

  // Every code in the table, not just the one that exists today. If a second
  // code is ever added, add it here — the point is that none of them ship.
  for (const secret of ['100lab', '100LAB', '100Lab'])
    check(`L1w the code ${secret} is nowhere in the page`,
      !drop.toLowerCase().includes(secret.toLowerCase()))
  check('L1w the page validates nothing about codes on its own',
    !/percent_off|max_redemptions|claim_gi_promo/.test(drop))
  check('L1w the code box posts to the endpoint to find out',
    /checkPromo:/.test(drop))

  // The closing date is the one fact that decides whether somebody orders
  // today, so it is on the page and not only in the email that announced it.
  check('L1w the page says when pre-orders close',
    /Pre-orders close <strong>Wednesday, September 30<\/strong>/.test(drop))
  check('L1w and says there is no second run to catch',
    /order nothing extra/.test(drop))

  await page.setViewportSize({ width:390, height:844 })
  await page.goto('http://localhost:4620/drop', { waitUntil:'domcontentloaded' })
  /* The basket now outlives a navigation on purpose, so a block that assumes an
     empty shop has to say so. Without this, L1u's A2 is still in the basket and
     every total here reads $218.00 — which is the persistence working, not a
     fault, but it is not what this block is testing. */
  await page.evaluate(() => sessionStorage.clear())
  await page.reload({ waitUntil:'domcontentloaded' })
  await page.waitForTimeout(250)

  // One handler for both shapes of request. Registering a second route for the
  // same URL does not layer — the later one wins and swallows the first.
  let posted = null, reply = { ok:false, error:'test' }
  await page.route('**/functions/v1/gi-preorder', route => {
    const body = JSON.parse(route.request().postData() || '{}')
    if (body.checkPromo) {
      const ok = String(body.checkPromo).trim().toLowerCase() === 'goodcode'
      return route.fulfill({ status:200, contentType:'application/json',
        body: JSON.stringify(ok
          ? { ok:true, valid:true, percent:100, maxUnits:1, label:'Staff' }
          : { ok:true, valid:false, error:'That code is not valid for this order.' }) })
    }
    posted = body
    return route.fulfill({ status:200, contentType:'application/json',
      body: JSON.stringify(reply) })
  })

  await page.click('.drop__size:text-is("A2")')
  await page.click('#drop-review')
  await page.waitForTimeout(200)
  check('L1w the basket has a code box', await page.isVisible('#drop-promo'))
  check('L1w and asks for nobody\'s name until a code takes the whole price',
    await page.isHidden('#drop-who'))
  check('L1w and shows no struck-through price before there is a discount',
    await page.isHidden('#drop-was'))
  check('L1w and says nothing under the code box before one is tried',
    await page.isHidden('#drop-promo-msg'))

  // A wrong code changes nothing about what is owed.
  await page.fill('#drop-promo', 'nope')
  await page.click('#drop-promo-go')
  await page.waitForTimeout(300)
  check('L1w a code that is not real is refused',
    await page.getAttribute('#drop-promo-msg', 'data-ok') === '0')
  check('L1w and the total is untouched by it',
    (await page.textContent('#drop-total')).includes('109.00'),
    await page.textContent('#drop-total'))
  check('L1w and it still does not ask who you are',
    await page.isHidden('#drop-who'))

  // A real one takes it to nothing, and only then asks who it is for.
  await page.fill('#drop-promo', 'goodcode')
  await page.click('#drop-promo-go')
  await page.waitForTimeout(300)
  check('L1w a real code applies',
    await page.getAttribute('#drop-promo-msg', 'data-ok') === '1')
  check('L1w the total goes to nothing',
    (await page.textContent('#drop-total')).trim() === 'Free',
    await page.textContent('#drop-total'))
  check('L1w the old price is shown struck through',
    await page.isVisible('#drop-was')
      && (await page.textContent('#drop-was')).includes('109.00'))
  check('L1w and now it asks whose gi it is', await page.isVisible('#drop-who'))

  // The cap is per order, and the basket can change after the code is applied.
  // The warning has to arrive in the basket, where it can still be fixed —
  // and has to LEAVE again when the basket goes back under the cap.
  await page.click('#drop-more')
  await page.click('.drop__size:text-is("A2")')
  await page.click('#drop-review')
  await page.waitForTimeout(200)
  check('L1w a basket over what the code covers says so',
    await page.getAttribute('#drop-promo-msg', 'data-ok') === '0'
      && (await page.textContent('#drop-promo-msg')).includes('covers 1 gi'),
    await page.textContent('#drop-promo-msg'))
  await page.click('.drop__qty button:has-text("−")')
  await page.waitForTimeout(200)
  check('L1w and stops saying so once the basket fits again',
    await page.getAttribute('#drop-promo-msg', 'data-ok') === '1',
    await page.textContent('#drop-promo-msg'))

  // Reserve must not go anywhere without a name on a free order.
  posted = null
  await page.click('#drop-sheet-go')
  await page.waitForTimeout(300)
  check('L1w a free order will not send without a name',
    posted === null && await page.isVisible('#drop-sheet'))

  await page.fill('#drop-name', 'Sam Coach')
  await page.fill('#drop-email', 'not-an-email')
  await page.click('#drop-sheet-go')
  await page.waitForTimeout(300)
  check('L1w nor with an address that is not one', posted === null)

  reply = { ok:true, status:'reserved', comped:true }
  await page.fill('#drop-email', 'sam@example.com')
  await page.click('#drop-sheet-go')
  await page.waitForTimeout(500)
  check('L1w it sends the code as typed, for the server to judge',
    posted?.promo === 'goodcode', JSON.stringify(posted?.promo))
  check('L1w with the name and email Stripe never got to ask for',
    posted?.name === 'Sam Coach' && posted?.email === 'sam@example.com',
    JSON.stringify([posted?.name, posted?.email]))
  check('L1w it never posts a price of its own',
    posted && !('amount' in posted) && !('price' in posted) && !('percent' in posted),
    JSON.stringify(Object.keys(posted || {})))
  check('L1w a comped order lands on the confirmation without going to Stripe',
    await page.isVisible('#drop-done'))
  check('L1w and does not promise a receipt nobody sent',
    !(await page.textContent('#drop-done-lede')).includes('Stripe'),
    await page.textContent('#drop-done-lede'))

  await page.unroute('**/functions/v1/gi-preorder')
  await page.setViewportSize({ width:1280, height:800 })
}

// ── L1z: the HYROX Youngstars interest-list page ──
// Its own look (black and volt yellow, not the academy gold or awareness pink), the
// facts exactly as the academy announced them, and a form that writes each child
// into the notes the edge function reads. The endpoint is mocked.
{
  const ctx = await browser.newContext()
  const hp = await ctx.newPage()
  await hp.clock.setFixedTime(new Date('2026-10-20T15:00:00Z'))
  const URL = 'http://localhost:4620/hyrox-youngstars'
  let posts = []
  let reply = { status: 200, body: { ok: true }, delay: 0 }
  await hp.route('**/functions/v1/event-rsvp', async route => {
    posts.push(JSON.parse(route.request().postData() || '{}'))
    if (reply.delay) await new Promise(r => setTimeout(r, reply.delay))
    await route.fulfill({ status: reply.status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(reply.body) })
  })
  await hp.goto(URL, { waitUntil: 'networkidle' })
  const t = await hp.evaluate(() => document.body.innerText)
  check('L1z the page leads with HYROX Youngstars, Houston, April 3 to 4, 2027',
    /HYROX\s*YOUNGSTARS/i.test(await hp.textContent('h1')) && /Houston/i.test(t) && /April 3.4, 2027/i.test(t))
  check('L1z ages 8 to 15, Saturday for 8 to 11 and Sunday for 12 to 15, times still to come',
    /8.15/.test(t) && /Saturday, April 3\s*Ages 8.11/.test(t) && /Sunday, April 4\s*Ages 12.15/.test(t) && /still to be announced/i.test(t))
  check('L1z the plan: keep BJJ, S&C classes introduce the movements, structured training after November tickets',
    /Strength & Conditioning/.test(t) && /November/.test(t) && /at least one Strength & Conditioning class a week/i.test(t) && /one HYROX workout a week/i.test(t))
  const cells = await hp.$$eval('.hx-table tbody tr', rs => rs.map(r => [...r.children].map(c => c.textContent.replace(/\s+/g, ' ').trim()).join('|')))
  check('L1z the station table matches the announcement for ages 8-9 and 10-11',
    cells.length === 8 && cells[0] === 'SkiErg|300 m|400 m' && cells[1] === 'Sled Push|15 m \u00b7 35 kg|15 m \u00b7 50 kg' &&
    cells[2] === 'Sled Pull|15 m \u00b7 25 kg|15 m \u00b7 40 kg' && cells[4] === 'Row|200 m|300 m' && cells[5] === 'Farmers Carry|50 m \u00b7 4 kg|50 m \u00b7 6 kg' &&
    /Frogger/.test(cells[3]) && /Burpee broad/.test(cells[3]) && cells[7] === 'Weighted Squats|50 \u00b7 1 kg|50 \u00b7 2 kg', JSON.stringify(cells))
  check('L1z the running distances by age group', /400.550 m total/.test(t) && /800.1,100 m total/.test(t) && /1\.6.2\.2 km total/.test(t))
  const links = await hp.$$eval('a[href*="hyrox.com"]', as => as.map(a => a.href))
  check('L1z it links to the official Youngstars and Houston pages, and says it is not affiliated',
    links.includes('https://hyrox.com/hyrox-youngstars/') && links.includes('https://hyrox.com/event/hyrox-youngstars-houston/') && /not affiliated with or endorsed by HYROX/.test(t))
  const look = await hp.evaluate(() => ({
    theme: document.body.classList.contains('theme-hyrox'),
    primary: getComputedStyle(document.querySelector('.hx-btn--volt')).backgroundColor,
    mainBg: getComputedStyle(document.querySelector('main')).backgroundColor,
    title: getComputedStyle(document.querySelector('.hx-title span')).color,
  }))
  check('L1z it has its own look: volt yellow on near-black, not the academy gold or the awareness pink',
    look.theme && look.primary === 'rgb(227, 255, 46)' && look.title === 'rgb(227, 255, 46)' && look.mainBg === 'rgb(10, 11, 8)', JSON.stringify(look))
  const pics = await hp.evaluate(async () => {
    const imgs = [...document.querySelectorAll('.hx-photo img, .hx-coach img')]
    imgs.forEach(i => { i.loading = 'eager' })
    await Promise.all(imgs.map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r })))
    return { n: imgs.length, srcs: imgs.map(i => i.getAttribute('src')), broken: imgs.filter(i => !i.naturalWidth).map(i => i.src), alts: imgs.every(i => i.alt.length > 5) }
  })
  check('L1z real academy photos load, have alt text, and are not the group photo used on the Pink October and seminar pages',
    pics.n === 5 && pics.broken.length === 0 && pics.alts && !pics.srcs.some(x => /strength-conditioning|gallery-2|gallery-4/.test(x)), JSON.stringify(pics))
  check('L1z Coach Malik follows Professor Shaun in the coach line-up',
    await hp.evaluate(() => { const c = [...document.querySelectorAll('.hx-coaches > a')]; return c.length === 3 && /Shaun/.test(c[0].textContent) && /Malik/.test(c[1].textContent) && c[1].getAttribute('href') === '/coaches/malik-pickett' && /Scott/.test(c[2].textContent) }))
  check('L1z the coaches are Professor Shaun Lawler and Coach Scott Jones, each linking to their page',
    (await hp.locator('.hx-coach[href="/coaches/shaun-lawler"]:has-text("Professor Shaun Lawler")').count()) === 1 &&
    (await hp.locator('.hx-coach[href="/coaches/scott-jones"]:has-text("Coach Scott Jones")').count()) === 1)
  check('L1z no em dashes, no pink, and American spelling', !/\u2014/.test(t) && (await hp.locator('.ribbon').count()) === 0)

  // Pointers from the rest of the site.
  await hp.goto('http://localhost:4620/', { waitUntil: 'networkidle' })
  check('L1z the homepage strip points at the HYROX page',
    (await hp.locator('#eventStrip a.event-strip__link--hyrox[href="/hyrox-youngstars"]').count()) === 1 && await hp.isVisible('#eventStrip a.event-strip__link--hyrox'))
  await hp.goto('http://localhost:4620/programs/kids-bjj-fulshear', { waitUntil: 'networkidle' })
  check('L1z the kids program page has a HYROX Youngstars card that links to the page',
    (await hp.locator('a.hx-link-card[href="/hyrox-youngstars"]:has-text("HYROX Youngstars Houston")').count()) === 1)
  await hp.goto(URL, { waitUntil: 'networkidle' })

  // The live countdown to race weekend, right under the headline.
  const cd = await hp.evaluate(() => ({
    t: ['hx-cd-d', 'hx-cd-h', 'hx-cd-m', 'hx-cd-s'].map(i => document.getElementById(i).textContent).join(':'),
    label: document.getElementById('hx-cd-label').textContent,
    vis: !document.getElementById('hx-cd').hidden,
    above: document.getElementById('hx-cd').getBoundingClientRect().top < document.getElementById('hx-form').getBoundingClientRect().bottom,
    big: parseFloat(getComputedStyle(document.getElementById('hx-cd-d')).fontSize),
  }))
  // 2026-10-20 10:00 CDT to 2027-04-03 00:00 CDT = 164 days 14 hours.
  check('L1z a big live countdown to Saturday April 3 sits in the hero (164 days 14 hours from Oct 20 10:00 AM)',
    cd.vis && cd.t === '164:14:00:00' && /Race weekend starts in/.test(cd.label) && cd.big >= 30, JSON.stringify(cd))
  check('L1z the sign-up form is in the hero too, in view without scrolling past the page',
    await hp.evaluate(() => document.getElementById('hx-form').closest('header.hx-hero') !== null))
  {
    const cx = await browser.newContext(); const cp = await cx.newPage()
    await cp.clock.install({ time: new Date('2027-04-02T05:00:00Z') })
    await cp.goto(URL, { waitUntil: 'load' })
    const rd = () => cp.evaluate(() => ({ t: ['hx-cd-d', 'hx-cd-h', 'hx-cd-m', 'hx-cd-s'].map(i => document.getElementById(i).textContent).join(':'), label: document.getElementById('hx-cd-label').textContent, state: document.getElementById('hx-cd').dataset.state || '' }))
    const sec = t => t.split(':').reduce((n, v, i) => n + (+v) * [86400, 3600, 60, 1][i], 0)
    const a0 = await rd(); await cp.clock.runFor(3000); const a1 = await rd()
    check('L1z the HYROX countdown really ticks down by the second', sec(a0.t) - sec(a1.t) === 3 && sec(a0.t) <= 86400, JSON.stringify({ a0, a1 }))
    await cp.clock.setFixedTime(new Date('2027-04-03T15:00:00Z')); await cp.clock.runFor(1500)
    const live = await rd()
    check('L1z on race weekend it says so', live.state === 'live' && /Race weekend is here/.test(live.label), JSON.stringify(live))
    await cp.clock.setFixedTime(new Date('2027-04-05T15:00:00Z')); await cp.clock.runFor(1500)
    const over = await rd()
    check('L1z afterwards it thanks people', over.state === 'over' && /Thank you/.test(over.label), JSON.stringify(over))
    await cx.close()
  }

  // The form.
  check('L1z the form starts with one child row and grows with the count',
    (await hp.locator('.hx-kid').count()) === 1)
  await hp.selectOption('#hx-count', '3')
  check('L1z choosing 3 kids shows three name-and-age rows', (await hp.locator('.hx-kid').count()) === 3)
  await hp.selectOption('#hx-count', '2')
  check('L1z and choosing 2 takes one away', (await hp.locator('.hx-kid').count()) === 2)
  await hp.click('#hx-submit')
  check('L1z sending it empty is stopped, with messages, and nothing is posted',
    posts.length === 0 && /full name/.test(await hp.textContent('#hx-name-err')) && /email/.test(await hp.textContent('#hx-email-err')) && /each child/.test(await hp.textContent('#hx-notes-err')))
  check('L1z phone and note are tucked under an optional "Add a phone number or a note" line', !(await hp.locator('.hx-more').evaluate(d => d.open)))
  await hp.click('.hx-more summary')
  await hp.fill('#hx-name', 'Dana Reyes'); await hp.fill('#hx-email', 'Dana@Example.com'); await hp.fill('#hx-phone', '281 555 0100')
  await hp.fill('#hx-kid-name-1', 'Emma (the) Reyes'); await hp.selectOption('#hx-kid-age-1', '9')
  await hp.selectOption('#hx-kid-size-1', 'Youth M'); await hp.selectOption('#hx-kid-size-2', 'Adult S')
  await hp.fill('#hx-kid-name-2', 'Jack'); await hp.fill('#hx-note', 'Jack has done two seasons of cross country')
  await hp.click('#hx-submit')
  check('L1z a child without an age is caught', posts.length === 0 && /each child/.test(await hp.textContent('#hx-notes-err')))
  await hp.selectOption('#hx-kid-age-2', '12')
  reply = { status: 200, body: { ok: true }, delay: 300 }
  await hp.dblclick('#hx-submit')
  await hp.waitForSelector('#hx-success:not([hidden])')
  check('L1z it posts once to the RSVP function with the event, the parent, the count and each kid in the notes',
    posts.length === 1 && posts[0].event === 'hyrox-youngstars-houston-2027' && posts[0].name === 'Dana Reyes' && posts[0].email === 'dana@example.com' &&
    posts[0].party === 2 && posts[0].notes === 'Kids: Emma the Reyes (9), Jack (12). Note: Jack has done two seasons of cross country' &&
    posts[0].sizes === 'Emma the Reyes: Youth M, Jack: Adult S', JSON.stringify(posts))
  check('L1z and then confirms to the parent by name, kids and email, and says what is next',
    /Dana/.test(await hp.textContent('#hx-success')) && /Emma the Reyes, Jack/.test(await hp.textContent('#hx-success-kids')) &&
    /dana@example\.com/.test(await hp.textContent('#hx-success-email')) && /November/.test(await hp.textContent('#hx-success')) && await hp.isHidden('#hx-form'))

  // The server's own refusal comes back next to the field; a failure says to call.
  await hp.goto(URL, { waitUntil: 'networkidle' })
  posts = []
  await hp.fill('#hx-name', 'Dana Reyes'); await hp.fill('#hx-email', 'dana@example.com')
  await hp.fill('#hx-kid-name-1', 'Emma'); await hp.selectOption('#hx-kid-age-1', '8')
  reply = { status: 400, body: { error: 'HYROX Youngstars is for ages 8 to 15 on race day', field: 'notes' }, delay: 0 }
  await hp.click('#hx-submit')
  await hp.waitForFunction(() => document.getElementById('hx-notes-err').textContent.length > 0)
  check('L1z a refusal from the server appears beside the kids', /ages 8 to 15/.test(await hp.textContent('#hx-notes-err')) && (await hp.isVisible('#hx-form')))
  reply = { status: 500, body: { error: 'Could not save your RSVP. Please call us on (281) 393-7983.' }, delay: 0 }
  await hp.click('#hx-submit')
  await hp.waitForSelector('#hx-status:not([hidden])')
  check('L1z a failed save keeps the form and gives a tap-to-call number',
    (await hp.locator('#hx-status a[href="tel:2813937983"]').count()) === 1 && await hp.isVisible('#hx-form'))

  // After the weekend the list is closed.
  await hp.clock.setFixedTime(new Date('2027-04-03T15:00:00Z'))
  await hp.goto(URL, { waitUntil: 'networkidle' })
  check('L1z once the race weekend arrives the form is replaced by a closed notice',
    await hp.isHidden('#hx-form') && await hp.isVisible('#hx-over'))
  await ctx.close()
}

// ── L2h: the homepage dresses for the holiday (Halloween) ──
// season.js turns it on from the date on the academy's clock, so each case pins the clock.
// Pink October, the seminar and the kids' HYROX race stay the loudest things on the page.
{
  const URLH = 'http://localhost:4620/'
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const hh = await ctx.newPage()
  await hh.clock.setFixedTime(new Date('2026-10-14T15:00:00Z'))
  await hh.goto(URLH, { waitUntil: 'load' })
  const h1 = await hh.evaluate(() => {
    const vis = sel => [...document.querySelectorAll(sel)].filter(e => getComputedStyle(e).display !== 'none').length
    const strip = document.getElementById('eventStrip')
    return {
      season: document.documentElement.dataset.season,
      ghosts: vis('.season-hero .season-ghost'), bats: vis('.season-hero .season-bat'), moon: vis('.season-moon'), yard: vis('.season-yard'),
      stones: vis('.season-stone'), pumpkins: vis('.season-pump'),
      secs: [...document.querySelectorAll('main > section')].filter(x => x.id !== 'hero' && x.querySelector(':scope > .season-sec') && getComputedStyle(x.querySelector(':scope > .season-sec')).display !== 'none').length,
      secSpiders: vis('.season-sec .ss-spider'), secWebs: vis('.season-sec .ss-web'), secPatches: vis('.season-sec .ss-patch'), secGhosts: vis('.season-sec .ss-ghost'), secBunting: vis('.season-sec .ss-bunting'),
      gold: getComputedStyle(document.documentElement).getPropertyValue('--gold').trim(),
      cards: [...strip.querySelectorAll('a.event-strip__link')].filter(a => !a.hidden).map(a => a.getAttribute('href')),
      stripTop: Math.round(strip.getBoundingClientRect().top + window.scrollY),
      badge: strip.querySelector('.event-strip__badge').textContent,
      chip: document.getElementById('heroChip').hidden ? '' : document.getElementById('heroChip').textContent,
      title: strip.querySelector('.event-strip__title').textContent,
    }
  })
  check('L2h in October the homepage is Halloween: moon, bats, ghosts, a graveyard, and tombstones with epitaphs above the footer',
    h1.season === 'halloween' && h1.ghosts === 3 && h1.bats === 3 && h1.moon === 1 && h1.yard === 1 && h1.stones === 4 && h1.pumpkins >= 6, JSON.stringify(h1))
  check('L2h Halloween runs through the whole page: every section after the hero has its own webs, spiders, ghosts, bunting and a pumpkin patch',
    h1.secs === 12 && h1.secSpiders >= 10 && h1.secWebs >= 12 && h1.secPatches >= 10 && h1.secGhosts >= 6 && h1.secBunting >= 10, JSON.stringify(h1))
  check('L2h the section decoration sits behind the content and never blocks it',
    await hh.evaluate(() => {
      const sec = document.querySelector('#programs .season-sec'), c = document.querySelector('#programs > .container')
      return getComputedStyle(sec).pointerEvents === 'none' && +getComputedStyle(sec).zIndex < +getComputedStyle(c).zIndex
    }))
  check('L2h the gold turns pumpkin orange', h1.gold === '#ff8a1f', h1.gold)
  check('L2h the donation, Pink October, the seminar and HYROX are four cards right under the hero, in that order',
    JSON.stringify(h1.cards) === JSON.stringify(['/donate', '/pink-october', '/self-defense-for-women', '/hyrox-youngstars']) && h1.stripTop < 1000 && /THIS MONTH AT LABYRINTH/i.test(h1.title), JSON.stringify(h1))
  check('L2h the seminar card counts down the days and the hero has a line that jumps to the cards',
    h1.badge === '10 days to go' && /Pink October/.test(h1.chip) && /self defense/i.test(h1.chip) && /HYROX/.test(h1.chip) && !/donat/i.test(h1.chip), JSON.stringify(h1))
  const colors = await hh.evaluate(() => [...document.querySelectorAll('#eventStrip .event-strip__cta')].map(c => getComputedStyle(c).backgroundColor))
  check('L2h each card keeps its own color on the dark page: a dark Donate button on the solid pink card, then pink, pink, volt yellow',
    colors.join('|') === 'rgb(26, 11, 18)|rgb(229, 143, 181)|rgb(229, 143, 181)|rgb(227, 255, 46)', colors.join('|'))
  await hh.dispatchEvent('.season-ghost--1', 'click')
  check('L2h tapping a ghost makes it say Boo', await hh.evaluate(() => document.querySelector('.season-ghost--1').classList.contains('is-boo')))
  check('L2h the hero chip leads to the cards', (await hh.getAttribute('#heroChip', 'href')) === '#eventStrip')

  const mp = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage()
  await mp.clock.setFixedTime(new Date('2026-10-14T15:00:00Z'))
  await mp.goto(URLH, { waitUntil: 'load' })
  check('L2h on a phone nothing sticks out sideways and the cards stack',
    !(await mp.evaluate(() => document.documentElement.scrollWidth > innerWidth)) &&
    (await mp.evaluate(() => { const c = [...document.querySelectorAll('#eventStrip a.event-strip__link')]; return c[1].getBoundingClientRect().top > c[0].getBoundingClientRect().bottom })))

  const rm = await (await browser.newContext({ reducedMotion: 'reduce' })).newPage()
  await rm.clock.setFixedTime(new Date('2026-10-14T15:00:00Z'))
  await rm.goto(URLH, { waitUntil: 'load' })
  check('L2h with reduced motion on, nothing flies, floats or flickers',
    (await rm.evaluate(() => ['.season-bat--1', '.season-ghost--1', '.season-pump--a', '.season-fog--1'].every(sel => getComputedStyle(document.querySelector(sel)).animationName === 'none'))))

  // After October: the page is itself again and only the kids' race is left.
  await hh.clock.setFixedTime(new Date('2026-11-02T15:00:00Z'))
  await hh.goto(URLH, { waitUntil: 'load' })
  const h2 = await hh.evaluate(() => ({
    season: document.documentElement.dataset.season || '',
    deco: [...document.querySelectorAll('.season-hero, .season-footer, .season-sec')].every(e => getComputedStyle(e).display === 'none'),
    gold: getComputedStyle(document.documentElement).getPropertyValue('--gold').trim(),
    cards: [...document.querySelectorAll('#eventStrip a.event-strip__link')].filter(a => !a.hidden).map(a => a.getAttribute('href')),
    chip: document.getElementById('heroChip').textContent,
    title: getComputedStyle(document.querySelector('.event-strip__title')).fontFamily,
  }))
  check('L2h on November 2 the decorations are gone and the gold is back',
    h2.season === '' && h2.deco && h2.gold === '#C8A24C', JSON.stringify(h2))
  check('L2h and only the HYROX card (and its chip) are left of the October block',
    JSON.stringify(h2.cards) === JSON.stringify(['/hyrox-youngstars']) && /HYROX/.test(h2.chip) && !/Pink/.test(h2.chip), JSON.stringify(h2))

  // The preview switches work any time of year.
  await hh.clock.setFixedTime(new Date('2026-07-10T15:00:00Z'))
  await hh.goto(URLH + '?season=halloween', { waitUntil: 'load' })
  check('L2h ?season=halloween previews the theme in July', (await hh.evaluate(() => document.documentElement.dataset.season)) === 'halloween')
  await hh.clock.setFixedTime(new Date('2026-10-14T15:00:00Z'))
  await hh.goto(URLH + '?season=off', { waitUntil: 'load' })
  check('L2h ?season=off turns it off in October', (await hh.evaluate(() => document.documentElement.dataset.season || '')) === '')
  await ctx.close()
}

// ── L1v: the academy is in Texas, so the spelling is American ──
// This kept coming back — colour, programme, grey, sceptical, organised — and
// "remember not to" is not a mechanism. Checked against what a visitor
// actually reads: scripts, styles and comments are stripped first, because
// identifiers legitimately carry British spellings the wire format depends on
// (the drop page posts a `colourway` key and reads a `cancelled` parameter,
// both of which the endpoint defines and neither of which anybody sees).
{
  const BRITISH = /\b(colour\w*|honour\w*|favourite\w*|behaviour\w*|neighbour\w*|labour\w*|organis\w*|recognis\w*|authoris\w*|apologis\w*|realis(?:e|ed|ing|ation)\w*|analys(?:e|ed|ing)\w*|centre|metre|litre|fibre|theatre|defence|offence|licence|practis(?:e|ed|ing)|programmes?|travell\w*|jewell\w*|enrolment|fulfil|skilful|instalment|whilst|amongst|learnt|spelt|aluminium|artefact|judgement|ageing|manoeuvre|sceptic\w*|speciality|catalogue|cancelled|grey\w*)\b/gi
  const offenders = []
  const pages = readdirSync(ROOT).filter(f => f.endsWith('.html'))
    .concat(['blog','programs','areas','coaches','legacy'].flatMap(d => {
      try { return readdirSync(join(ROOT,d)).filter(f=>f.endsWith('.html')).map(f=>d+'/'+f) }
      catch { return [] }
    }))
  for (const f of pages) {
    const visible = readFileSync(join(ROOT,f),'utf8')
      .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<!--[\s\S]*?-->/g,' ')
      .replace(/<[^>]+>/g,' ')
    for (const m of visible.matchAll(BRITISH)) offenders.push(`${f}: ${m[0]}`)
  }
  check('L1v no British spelling in anything a visitor reads',
    offenders.length === 0, [...new Set(offenders)].slice(0,10).join(', '))
}

// ── D: the donation page ──
// /donate is one page about one thing: the donation, its goal, how far along it is, the amounts and how the
// match works. The total is Stripe's, through the event-donations function, so it is mocked here and no real
// total is read. Its own context with a pinned clock, so the page is checked on a day the seminar line is
// still showing.
{
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 } })
  const dp = await ctx.newPage()
  await dp.clock.setFixedTime(new Date('2026-10-05T15:00:00Z'))
  const URLD = 'http://localhost:4620/donate'
  const OTHER = 'https://donate.stripe.com/14AdRa0tL1Ea1Br3bJgjC0a'
  const EMPTY = { raised: 0, count: 0, goal: 500, top: [], recent: [] }
  let feed = EMPTY, feedFail = false, asked = []
  const answer = route => { asked.push(route.request().url()); return feedFail
    ? route.fulfill({ status: 502, contentType: 'application/json', body: '{"error":"x"}' })
    : route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(feed) }) }
  await dp.route('**/functions/v1/event-donations**', answer)
  const fresh = async (q = '') => { asked = []; await dp.goto(URLD + q, { waitUntil: 'networkidle' }) }

  await fresh()
  const text = await dp.evaluate(() => document.body.innerText)
  check('D1 the page is about the donation and nothing else: no RSVP form, no class booking, no schedule',
    /Donate to\s+Rolling for Ribbons/i.test(await dp.textContent('h1')) && (await dp.locator('#rsvp-form, #rsvp, .rsvp-sticky').count()) === 0
      && !/RSVP now|save my spot|first class|schedule/i.test(await dp.textContent('main')), (await dp.textContent('h1')))
  check('D2 it says where the money goes and how the match works, in the words of the posts',
    /directly to a family affected by breast cancer/i.test(text)
      && /two anonymous donors will each match every dollar we raise, up to our \$500 goal/i.test(text)
      && /\$1,500/.test(text) && /Give \$25\s+it becomes \$75/.test(text) && /Give \$100\s+it becomes \$300/.test(text), text.slice(0, 400))
  check('D3 nothing is claimed that the academy has not said: no tax-deductible wording',
    !/tax[- ]deductible|501\s?\(c\)|deduct/i.test(text))
  const amts = await dp.$$eval('#give a.rsvp-give__amt', as => as.map(a => [a.textContent.trim(), a.getAttribute('href'), a.getAttribute('target')]))
  check('D4 eight ways to give: $1, $3, $5, $10, $25, $50, $100 and Other, each its own Stripe link, opening in the same tab',
    amts.map(a => a[0]).join() === '$1,$3,$5,$10,$25,$50,$100,Other amount'
      && amts.every(([, h, t]) => /^https:\/\/donate\.stripe\.com\/\w+$/.test(h) && t === null)
      && new Set(amts.map(a => a[1])).size === 8 && amts[7][1] === OTHER, JSON.stringify(amts).slice(0, 200))

  // The fundraiser: honest at $0, and the real feed rendered when there is one.
  const f0 = await dp.evaluate(() => ({
    raised: document.getElementById('fund-raised').textContent, goal: document.getElementById('fund-goal').textContent,
    first: !document.getElementById('fund-first').hidden, board: !document.getElementById('fund-board').hidden,
    width: document.getElementById('fund-fill').style.width }))
  check('D5 fundraiser at $0: shows $0 of $500, invites the first gift, shows no leaderboard and invents no donors',
    f0.raised === '$0' && f0.goal === '$500' && f0.first && !f0.board && /^0(%|px)?$/.test(f0.width), JSON.stringify(f0))
  // `at` is a few minutes, an hour and a morning before the pinned clock (15:00 UTC), for "just now", "40m ago" and "6h ago".
  const FEED3 = { raised: 135, count: 3, goal: 500, top: [{ name: 'Sam T.', amount: 100 }, { name: 'Anonymous', amount: 25 }, { name: 'Pat <b>x</b>', amount: 10 }],
    recent: [{ name: 'Pat <b>x</b>', amount: 10, at: '2026-10-05T14:59:00Z' }, { name: 'Anonymous', amount: 25, at: '2026-10-05T14:20:00Z' }, { name: 'Sam T.', amount: 100, at: '2026-10-05T09:00:00Z' }] }
  feed = FEED3
  await fresh()
  const board = () => dp.evaluate(() => ({
    raised: document.getElementById('fund-raised').textContent, count: document.getElementById('fund-count').textContent,
    width: document.getElementById('fund-fill').style.width, now: document.getElementById('fund-bar').getAttribute('aria-valuenow'),
    first: document.getElementById('fund-first').hidden, shown: !document.getElementById('fund-board').hidden,
    busy: document.getElementById('fund-board').hasAttribute('aria-busy'),
    rows: [...document.querySelectorAll('#fund-top > li')].map(li => ({
      rank: li.querySelector('.lb__medal').textContent, medal: li.querySelector('.lb__medal').className.replace('lb__medal ', ''),
      name: li.querySelector('.lb__name').textContent, amt: li.querySelector('.lb__amt').textContent,
      gold: li.classList.contains('lb__row--first'), anon: li.querySelector('.lb__name').classList.contains('lb__name--anon') })),
    chips: [...document.querySelectorAll('#fund-recent > li')].map(li => li.textContent.replace(/\s+/g, ' ').trim()),
    injected: !!document.querySelector('#fund-top b, #fund-top em, .lb__name b, .lb__chip em b') }))
  const f1 = await board()
  check('D6 fundraiser with gifts: total, percent, supporter count, and the leaderboard instead of the invitation',
    f1.raised === '$135' && f1.count === '3 supporters' && f1.width === '27%' && f1.now === '135' && f1.first && f1.shown && !f1.busy, JSON.stringify(f1))
  check('D6a the leaderboard ranks the biggest gifts with medals: gold, silver, bronze, the first one picked out, Anonymous toned down',
    JSON.stringify(f1.rows.map(r => [r.rank, r.medal, r.name, r.amt, r.gold, r.anon]))
      === JSON.stringify([['1', 'lb__medal--1', 'Sam T.', '$100', true, false], ['2', 'lb__medal--2', 'Anonymous', '$25', false, true], ['3', 'lb__medal--3', 'Pat <b>x</b>', '$10', false, false]]),
    JSON.stringify(f1.rows))
  check('D6b the latest gifts follow, newest first, with how long ago and the name only when the donor chose to show it',
    JSON.stringify(f1.chips) === JSON.stringify(['Pat <b>x</b> $10 just now', '$25 40m ago', 'Sam T. $100 6h ago']), JSON.stringify(f1.chips))
  check('D7 a donor name is shown as text, never as markup', f1.injected === false && f1.rows[2].name.includes('<b>') && f1.chips[0].includes('<b>'))
  // Equal gifts share a rank, and the next one is placed after them; past third there is no medal, only the number.
  feed = { raised: 525, count: 5, goal: 500,
    top: [{ name: 'A', amount: 250 }, { name: 'B', amount: 100 }, { name: 'Anonymous', amount: 100 }, { name: 'C', amount: 50 }, { name: 'Anonymous', amount: 25 }], recent: [] }
  await fresh()
  const f2 = await board()
  check('D6c equal gifts share a rank (1, 2, 2, 4, 5), and only the first three places get a medal',
    JSON.stringify(f2.rows.map(r => [r.rank, r.medal])) === JSON.stringify([['1', 'lb__medal--1'], ['2', 'lb__medal--2'], ['2', 'lb__medal--2'], ['4', 'lb__medal--n'], ['5', 'lb__medal--n']])
      && f2.rows.filter(r => r.gold).length === 1 && f2.width === '100%' && f2.chips.length === 0, JSON.stringify(f2.rows))
  feed = { raised: 203, count: 3, goal: 500, top: [{ name: 'Anonymous', amount: 100 }, { name: 'Anonymous', amount: 100 }, { name: 'Anonymous', amount: 3 }], recent: [] }
  await fresh()
  const f3 = await board()
  check('D6d two gifts of the same size are both first (two gold rows), and the next is third',
    JSON.stringify(f3.rows.map(r => [r.rank, r.medal, r.gold])) === JSON.stringify([['1', 'lb__medal--1', true], ['1', 'lb__medal--1', true], ['3', 'lb__medal--3', false]]), JSON.stringify(f3.rows))
  // Right by the goal: inside the card, under the bar, over the amounts, and on the screen with them.
  feed = FEED3
  await fresh()
  const place = await dp.evaluate(() => {
    const give = document.getElementById('give'), bar = document.getElementById('fund-bar'), bd = document.getElementById('fund-board'), pick = document.getElementById('donate-pick')
    const r = e => e.getBoundingClientRect()
    return { inside: give.contains(bd), afterBar: !!(bar.compareDocumentPosition(bd) & Node.DOCUMENT_POSITION_FOLLOWING),
      beforeAmounts: !!(bd.compareDocumentPosition(pick) & Node.DOCUMENT_POSITION_FOLLOWING), gap: Math.round(r(bd).top - r(bar).bottom),
      clear: Math.round(r(pick).top - r(bd).bottom), onScreen: r(bd).bottom <= innerHeight, copies: document.querySelectorAll('#fund-top').length,
      footer: document.querySelectorAll('#where ol, #where .lb').length }
  })
  check('D6e the leaderboard is in the card right under the goal bar (within 40px) and above the amounts, and nowhere else on the page',
    place.inside && place.afterBar && place.beforeAmounts && place.gap >= 0 && place.gap <= 40 && place.clear >= 0 && place.onScreen && place.copies === 1 && place.footer === 0, JSON.stringify(place))
  check('D8 the total is asked for once, plainly, on an ordinary visit', asked.length === 1 && !/[?]/.test(asked[0].split('event-donations')[1]), asked.join())
  feedFail = true
  await fresh()
  const down = await dp.evaluate(() => ({ board: !document.getElementById('fund-board').hidden, first: !document.getElementById('fund-first').hidden }))
  check('D9 if the total cannot load the page stays calm: $0 line, no error, no half-empty leaderboard, and every amount is still there',
    (await dp.textContent('#fund-raised')) === '$0' && (await dp.locator('#give a.rsvp-give__amt').count()) === 8 && !down.board && down.first, JSON.stringify(down))
  feedFail = false; feed = EMPTY

  // While the answer is on its way the board holds grey placeholders, so the amounts do not jump down when it arrives.
  {
    const lp = await ctx.newPage()
    await lp.clock.setFixedTime(new Date('2026-10-05T15:00:00Z'))
    let release
    const gate = new Promise(r => { release = r })
    await lp.route('**/functions/v1/event-donations**', async route => { await gate; await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(FEED3) }) })
    await lp.goto(URLD, { waitUntil: 'domcontentloaded' })
    await lp.waitForSelector('#fund-board:not([hidden])')
    const probe = () => lp.evaluate(() => ({
      busy: document.getElementById('fund-board').getAttribute('aria-busy'), first: !document.getElementById('fund-first').hidden,
      ghostRows: document.querySelectorAll('#fund-top .lb__row--ghost').length, ghostChips: document.querySelectorAll('#fund-recent .lb__chip--ghost').length,
      rows: document.querySelectorAll('#fund-top > li:not(.lb__row--ghost)').length,
      amountsTop: Math.round(document.querySelector('#give a.rsvp-give__amt').getBoundingClientRect().top + scrollY) }))
    const during = await probe()
    release()
    await lp.waitForSelector('#fund-board:not([aria-busy])')
    const after = await probe()
    await lp.close()
    check('D6f until the answer comes the board shows placeholders (and not the invitation), and when it comes the amounts have not moved',
      during.busy === 'true' && during.ghostRows === 3 && during.ghostChips === 3 && during.rows === 0 && !during.first
        && after.ghostRows === 0 && after.rows === 3 && Math.abs(after.amountsTop - during.amountsTop) <= 2, JSON.stringify({ during, after }))
  }

  // A long name is cut with an ellipsis and never pushes the page sideways, on the narrowest phone.
  {
    const nc = await browser.newContext({ viewport: { width: 320, height: 700 } })
    const np = await nc.newPage()
    await np.clock.setFixedTime(new Date('2026-10-05T15:00:00Z'))
    const LONG = 'Maximiliano-Alexander-Bartholomew W.'
    await np.route('**/functions/v1/event-donations**', route => route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ raised: 400, count: 4, goal: 500, top: [{ name: LONG, amount: 250 }, { name: 'Anonymous', amount: 100 }], recent: [{ name: LONG, amount: 250, at: '2026-10-05T14:00:00Z' }] }) }))
    await np.goto(URLD, { waitUntil: 'networkidle' })
    const lng = await np.evaluate(() => {
      const n = document.querySelector('#fund-top .lb__name'), c = document.querySelector('#fund-recent em')
      return { cut: n.scrollWidth > n.clientWidth && getComputedStyle(n).textOverflow === 'ellipsis', chipCut: c.scrollWidth > c.clientWidth,
        wide: document.documentElement.scrollWidth > innerWidth, boardFits: document.getElementById('fund-board').getBoundingClientRect().right <= innerWidth,
        cardFits: document.getElementById('give').getBoundingClientRect().right <= innerWidth,
        amountsFit: [...document.querySelectorAll('#give a.rsvp-give__amt')].every(a => a.getBoundingClientRect().right <= innerWidth) }
    })
    await nc.close()
    check('D6g a very long name is cut with an ellipsis, and the card, the board and every amount fit a 320px phone', lng.cut && lng.chipCut && !lng.wide && lng.boardFits && lng.cardFits && lng.amountsFit, JSON.stringify(lng))
  }

  // Left open (on a screen at the seminar, say) the page asks again once a minute and shows what is new.
  {
    const rc = await browser.newContext({ viewport: { width: 1200, height: 900 } })
    const rp = await rc.newPage()
    await rp.clock.install({ time: new Date('2026-10-05T15:00:00Z') })
    const SECOND = { raised: 160, count: 4, goal: 500, top: [{ name: 'Sam T.', amount: 100 }, { name: 'Jo L.', amount: 25 }, { name: 'Anonymous', amount: 25 }, { name: 'Pat <b>x</b>', amount: 10 }],
      recent: [{ name: 'Jo L.', amount: 25, at: '2026-10-05T15:00:30Z' }] }
    let asks = 0
    await rp.route('**/functions/v1/event-donations**', route => { asks++; return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(asks === 1 ? FEED3 : SECOND) }) })
    await rp.goto(URLD, { waitUntil: 'networkidle' })
    const until = async fn => { for (let i = 0; i < 60; i++) { if (await rp.evaluate(fn)) return true; await new Promise(r => setTimeout(r, 50)) } return false }
    const before = await rp.evaluate(() => document.getElementById('fund-raised').textContent)
    await rp.clock.runFor(30000)
    const quiet = asks
    await rp.clock.runFor(31000)
    const updated = await until(() => document.getElementById('fund-raised').textContent === '$160')
    const now = await rp.evaluate(() => ({ count: document.getElementById('fund-count').textContent, rows: document.querySelectorAll('#fund-top > li').length,
      settled: document.getElementById('fund-board').classList.contains('lb--settled'), anim: getComputedStyle(document.querySelector('#fund-top > li')).animationName }))
    await rc.close()
    check('D6h left open, the page asks again once a minute and shows the new gift, without replaying the entrances',
      before === '$135' && quiet === 1 && asks === 2 && updated && now.count === '4 supporters' && now.rows === 4 && now.settled && now.anim === 'none', JSON.stringify({ before, quiet, asks, updated, now }))
  }

  // With reduced motion asked for, and for anyone reading it: nothing moves, and the small print is readable.
  {
    const mc = await browser.newContext({ viewport: { width: 1200, height: 900 }, reducedMotion: 'reduce' })
    const mp = await mc.newPage()
    await mp.clock.setFixedTime(new Date('2026-10-05T15:00:00Z'))
    await mp.route('**/functions/v1/event-donations**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(FEED3) }))
    await mp.goto(URLD, { waitUntil: 'networkidle' })
    const calm = await mp.evaluate(() => {
      const moving = [...document.querySelectorAll('#fund-top > li, #fund-recent > li, .lb__live i')].map(e => getComputedStyle(e).animationName)
      // Text colour against the lightest the panel gets (its pink glow over the card), so the real thing is at least this readable.
      const rgb = c => c.match(/[\d.]+/g).slice(0, 3).map(Number)
      const lin = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }
      const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
      const worst = lum([74, 42, 58])
      const ratios = Object.fromEntries(['.lb__title', '.lb__live', '.lb__sub', '.lb__name', '.lb__name--anon', '.lb__amt', '.lb__chip b', '.lb__chip span'].map(sel => {
        const L = lum(rgb(getComputedStyle(document.querySelector(sel)).color))
        return [sel, Math.round((Math.max(L, worst) + 0.05) / (Math.min(L, worst) + 0.05) * 10) / 10]
      }))
      return { moving, ratios }
    })
    await mc.close()
    check('D6i with reduced motion asked for nothing on the board moves, and every piece of its text is at least 4.5:1 on the panel',
      calm.moving.length >= 6 && calm.moving.every(a => a === 'none') && Object.values(calm.ratios).every(r => r >= 4.5), JSON.stringify(calm))
  }

  // The thank-you, for the donor Stripe sends back, and nobody else.
  await fresh()
  const quiet = await dp.isVisible('#donate-thanks')
  await fresh('?donated=1')
  check('D10 a returning donor is thanked, and only a returning donor; their total is fetched fresh',
    !quiet && (await dp.isVisible('#donate-thanks')) && /goes directly to a family affected by breast cancer/.test(await dp.textContent('#donate-thanks'))
      && asked.length === 1 && /[?]t=\d+/.test(asked[0]), asked.join())

  // The line about the seminar goes with the seminar.
  await fresh()
  const evBefore = await dp.isVisible('a.pink-link-card[href="/self-defense-for-women"]')
  await dp.clock.setFixedTime(new Date('2026-10-26T15:00:00Z')); await fresh()
  check('D11 the line that points to the seminar is there before it and gone after it',
    evBefore && !(await dp.isVisible('a.pink-link-card')))
  await dp.clock.setFixedTime(new Date('2026-10-05T15:00:00Z'))

  // Looks: the awareness pink, readable.
  await fresh()
  const pk = await dp.evaluate(() => {
    const rgb = c => c.match(/\d+/g).slice(0, 3).map(Number)
    const lin = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }
    const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
    const label = getComputedStyle(document.querySelector('.rsvp-label')).color
    const bg = getComputedStyle(document.querySelector('main')).backgroundColor
    const hi = Math.max(lum(rgb(label)), lum(rgb(bg))), lo = Math.min(lum(rgb(label)), lum(rgb(bg)))
    return { label, ribbons: document.querySelectorAll('svg.ribbon').length, decorative: [...document.querySelectorAll('svg.ribbon')].every(r => r.getAttribute('aria-hidden') === 'true'), ratio: (hi + 0.05) / (lo + 0.05) }
  })
  check('D12 the page wears the awareness pink, with decorative ribbons, readably (WCAG AA, 4.5:1)',
    pk.label === 'rgb(229, 143, 181)' && pk.ribbons >= 4 && pk.decorative && pk.ratio >= 4.5, JSON.stringify(pk))

  // On a phone the first row of amounts is on the first screen.
  const pc = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const ph = await pc.newPage()
  await ph.clock.setFixedTime(new Date('2026-10-05T15:00:00Z'))
  let phoneFeed = EMPTY
  await ph.route('**/functions/v1/event-donations**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(phoneFeed) }))
  await ph.goto(URLD, { waitUntil: 'networkidle' })
  const row = await ph.evaluate(() => ({
    bottom: Math.round(Math.max(...[...document.querySelectorAll('#give a.rsvp-give__amt')].slice(0, 4).map(a => a.getBoundingClientRect().bottom))),
    wide: document.documentElement.scrollWidth > innerWidth }))
  check('D13 on a phone the first row of amounts is on the first screen, and nothing sticks out sideways', row.bottom <= 844 && !row.wide, JSON.stringify(row))
  // With gifts the leaderboard is what the first screen holds, right under the goal: the amounts follow within a thumb's reach of the fold.
  const phoneBoard = async feedBody => {
    phoneFeed = feedBody
    await ph.goto(URLD, { waitUntil: 'networkidle' })
    return ph.evaluate(() => {
      const r = s => document.querySelector(s).getBoundingClientRect()
      const rows = [...document.querySelectorAll('#fund-top > li')].filter(li => li.offsetParent !== null).length
      const chips = [...document.querySelectorAll('#fund-recent > li')].filter(li => li.offsetParent !== null).length
      return { barBottom: Math.round(r('#fund-bar').bottom), boardTop: Math.round(r('#fund-board').top), boardBottom: Math.round(r('#fund-board').bottom),
        amountsTop: Math.round(Math.min(...[...document.querySelectorAll('#give a.rsvp-give__amt')].map(a => a.getBoundingClientRect().top))),
        rows, chips, wide: document.documentElement.scrollWidth > innerWidth }
    })
  }
  const live3 = await phoneBoard({ raised: 203, count: 3, goal: 500, top: [{ name: 'Anonymous', amount: 100 }, { name: 'Anonymous', amount: 100 }, { name: 'Anonymous', amount: 3 }],
    recent: [{ name: 'Anonymous', amount: 100, at: '2026-10-05T14:00:00Z' }, { name: 'Anonymous', amount: 3, at: '2026-10-05T13:00:00Z' }, { name: 'Anonymous', amount: 100, at: '2026-10-05T12:00:00Z' }] })
  check('D13b on a phone the whole leaderboard is on the first screen, under the goal bar, and the amounts start within 100px of the fold',
    live3.boardTop - live3.barBottom <= 40 && live3.boardBottom <= 844 && live3.amountsTop <= 944 && live3.rows === 3 && live3.chips === 2 && !live3.wide, JSON.stringify(live3))
  const five = await phoneBoard({ raised: 437.5, count: 9, goal: 500, top: [{ name: 'A', amount: 250 }, { name: 'B', amount: 100 }, { name: 'C', amount: 100 }, { name: 'D', amount: 50 }, { name: 'E', amount: 25 }],
    recent: [1, 2, 3, 4, 5].map(i => ({ name: 'Anonymous', amount: i * 10, at: '2026-10-05T14:00:00Z' })) })
  check('D13c with five gifts a phone still shows only the best three and the latest two, so the amounts stay close',
    five.rows === 3 && five.chips === 2 && five.boardTop - five.barBottom <= 40 && !five.wide, JSON.stringify(five))
  await pc.close()

  // Found, shared and listed.
  const meta = await dp.evaluate(() => ({
    canon: document.querySelector('link[rel=canonical]')?.href, og: document.querySelector('meta[property="og:image"]')?.content,
    noindex: !!document.querySelector('meta[name="robots"][content*="noindex"]'),
    types: [...document.querySelectorAll('script[type="application/ld+json"]')].map(x => JSON.parse(x.textContent)['@type']) }))
  const ogRes = await dp.request.get('http://localhost:4620' + new URL(meta.og).pathname)
  check('D14 indexable, with its own canonical, a breadcrumb, and a link-preview image that exists',
    meta.canon === 'https://labyrinth.vision/donate' && !meta.noindex && meta.types.includes('BreadcrumbList')
      && /\/assets\/og-donate\.jpg$/.test(meta.og) && ogRes.status() === 200, JSON.stringify(meta))
  check('D15 it is in the sitemap', readFileSync(join(ROOT, 'sitemap.xml'), 'utf8').includes('<loc>https://labyrinth.vision/donate</loc>'))
  check('D16 no em dashes in what a visitor reads', !/—/.test(text))
  const rd = readFileSync(join(ROOT, '_redirects'), 'utf8')
  check('D17 /donate is served by the page itself (nothing redirects it) and the other ways people say it land there',
    !/^\/donate\s/m.test(rd) && ['/Donate', '/donations', '/give'].every(x => new RegExp('^' + x + '\\s+/donate\\s+301\\s*$', 'm').test(rd)))
  await ctx.close()
}

// ── H: the way in from the homepage ──
// People could not find where to donate, so the homepage has four ways in and every one of them goes to /donate: a
// pink bar under the nav (the first thing on the page, at every width), a button in the nav where it fits, the first
// item in the phone menu, and the full-width card that opens the "this month" strip. One script takes them all away
// at the end of Pink October, and none of them touches the nav's room (nav-fit.test.mjs checks that).
{
  const URLH = 'http://localhost:4620/'
  const open = async (w, h, when, menu = false) => {
    const c = await browser.newContext({ viewport: { width: w, height: h } })
    const pg = await c.newPage()
    await pg.clock.setFixedTime(new Date(when))
    await pg.goto(URLH, { waitUntil: 'load' })
    return pg
  }
  const OPEN = '2026-10-05T15:00:00Z'
  const d = await open(1440, 900, OPEN)
  const bar = await d.evaluate(() => {
    const b = document.getElementById('donateBar'), r = b.getBoundingClientRect(), nav = document.querySelector('.nav').getBoundingClientRect()
    const rgb = c => c.match(/\d+/g).slice(0, 3).map(Number)
    const lin = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }
    const lum = ([x, y, z]) => 0.2126 * lin(x) + 0.7152 * lin(y) + 0.0722 * lin(z)
    const cs = getComputedStyle(b), hi = Math.max(lum(rgb(cs.color)), lum(rgb(cs.backgroundColor))), lo = Math.min(lum(rgb(cs.color)), lum(rgb(cs.backgroundColor)))
    return { href: b.getAttribute('href'), top: Math.round(r.top), navBottom: Math.round(nav.bottom), bottom: Math.round(r.bottom), width: Math.round(r.width), vw: innerWidth,
      bg: cs.backgroundColor, ratio: (hi + 0.05) / (lo + 0.05), text: b.querySelector('.donate-bar__long').textContent.replace(/\s+/g, ' ').trim(), vis: r.height > 0 }
  })
  check('H1 the first thing under the nav is a pink bar the full width of the screen that goes to /donate, and its text is readable',
    bar.vis && bar.href === '/donate' && bar.top === bar.navBottom && bar.width === bar.vw && bar.bg === 'rgb(229, 143, 181)' && bar.bottom < 140 && bar.ratio >= 4.5, JSON.stringify(bar))
  check('H2 it says what the drive is and what the match is, the same as everywhere else',
    /Rolling for Ribbons/.test(bar.text) && /two anonymous donors will each match every dollar we raise, up to \$500/.test(bar.text) && /Give \$25 and it becomes \$75/.test(bar.text), bar.text)
  const pill = await d.evaluate(() => {
    const a = document.querySelector('.nav__links a.nav__donate'), r = a.getBoundingClientRect(), cta = document.querySelector('.nav__cta').getBoundingClientRect()
    return { href: a.getAttribute('href'), shown: r.width > 0, bg: getComputedStyle(a).backgroundColor, beforeCta: r.right <= cta.left, text: a.textContent.trim() }
  })
  check('H3 on a desktop the nav has a pink Donate button right before Try a Free Class',
    pill.href === '/donate' && pill.shown && pill.bg === 'rgb(229, 143, 181)' && pill.beforeCta && pill.text === 'Donate', JSON.stringify(pill))
  const card = await d.evaluate(() => {
    const cards = [...document.querySelectorAll('#eventStrip a.event-strip__link:not([hidden])')], first = cards[0], last = cards[cards.length - 1]
    return { href: first.getAttribute('href'), cls: first.className, wide: first.getBoundingClientRect().width > 2 * last.getBoundingClientRect().width,
      top: first.getBoundingClientRect().top < last.getBoundingClientRect().top, text: first.textContent.replace(/\s+/g, ' ') }
  })
  check('H4 the "this month" strip opens with a card for the donation that spans the whole row',
    card.href === '/donate' && /--donate/.test(card.cls) && card.wide && card.top && /Triple your gift/.test(card.text) && /two anonymous donors/i.test(card.text), JSON.stringify(card))
  const links = await d.$$eval('a[href*="donat"]', as => as.map(a => a.getAttribute('href')))
  check('H5 every donation link on the homepage is /donate itself: the bar, the nav button, the menu item and the card',
    links.length === 4 && links.every(h => h === '/donate'), links.join())

  // Where the nav has no room for the button, the bar is still there.
  const mid = await open(1300, 800, OPEN)
  check('H6 between 1261px and 1339px the nav button steps aside and the bar is still there',
    !(await mid.isVisible('.nav__links a.nav__donate')) && await mid.isVisible('#donateBar'))

  // A phone: the bar, then the menu opening on Donate.
  const ph = await open(390, 844, OPEN)
  const pb = await ph.evaluate(() => {
    const b = document.getElementById('donateBar'), r = b.getBoundingClientRect(), nav = document.querySelector('.nav').getBoundingClientRect()
    return { top: Math.round(r.top), navBottom: Math.round(nav.bottom), height: Math.round(r.height), width: Math.round(r.width), vw: innerWidth,
      long: getComputedStyle(b.querySelector('.donate-bar__long')).display, short: b.querySelector('.donate-bar__short').textContent, wide: document.documentElement.scrollWidth > innerWidth,
      heroBadgeTop: Math.round(document.querySelector('.hero__badge').getBoundingClientRect().top) }
  })
  check('H7 on a phone the bar sits under the nav, says it in a short line, fits (at most two lines) and does not run into the hero',
    pb.top === pb.navBottom && pb.width === pb.vw && pb.long === 'none' && /Triple your gift/.test(pb.short) && pb.height <= 64 && !pb.wide && pb.heroBadgeTop >= pb.top + pb.height, JSON.stringify(pb))
  await ph.click('#hamburger')
  await ph.waitForTimeout(400)
  const menu = await ph.evaluate(() => {
    const items = [...document.querySelectorAll('#mobileNav > a')], a = items[0], r = a.getBoundingClientRect()
    return { href: a.getAttribute('href'), cls: a.className, visible: r.width > 0 && r.top > 0 && r.bottom < innerHeight, bg: getComputedStyle(a).backgroundColor,
      fits: a.scrollWidth <= a.clientWidth + 1, text: a.textContent.trim() }
  })
  check('H8 the phone menu opens with a big pink Donate item, in full',
    menu.href === '/donate' && /nav__donate--mobile/.test(menu.cls) && menu.visible && menu.bg === 'rgb(229, 143, 181)' && menu.fits && /Donate to Rolling for Ribbons/.test(menu.text), JSON.stringify(menu))

  // The drive ends with October: the last evening it is there, the next morning all four are gone together.
  const last = await open(1440, 900, '2026-11-01T04:30:00Z')
  const lastSeen = await last.evaluate(() => [...document.querySelectorAll('#donateBar, .nav__links a.nav__donate, .event-strip__link--donate')].map(e => e.getBoundingClientRect().width > 0))
  check('H9 at 11:30 PM on October 31 (Central) the bar, the nav button and the card are still there', lastSeen.length === 3 && lastSeen.every(Boolean), JSON.stringify(lastSeen))
  const late = await open(1440, 900, '2026-11-01T05:30:00Z')
  const gone = await late.evaluate(() => [...document.querySelectorAll('[data-donate], .event-strip__link--donate')].map(e => e.hidden || getComputedStyle(e).display === 'none'))
  check('H10 once October is over the bar, the nav button, the menu item and the card all go together',
    gone.length === 4 && gone.every(Boolean), JSON.stringify(gone))
  check('H11 and the page underneath is untouched: the hero is still the first thing and nothing is left over', await late.evaluate(() =>
    !document.getElementById('donateBar').getBoundingClientRect().height && document.querySelector('.hero__badge').getBoundingClientRect().height > 0))
}

// ── E: the matching-gift email (scripts/email-donation-match.html and .txt) ──
// It is pasted into the CRM's Broadcast screen and goes to the whole roster, so it is checked as the CRM will treat it:
// the merge tag it fills in, the placeholder it swaps for each person's unsubscribe link, links that go somewhere that
// exists, and a banner that is where the email says it is. Nobody sees it before it is sent.
{
  const html = readFileSync(join(ROOT, 'scripts/email-donation-match.html'), 'utf8')
  const txt = readFileSync(join(ROOT, 'scripts/email-donation-match.txt'), 'utf8')
  const urls = [...html.matchAll(/(?:href|src)="(https:\/\/[^"]+)"/g)].map(m => m[1])
  const here = urls.filter(u => u.startsWith('https://labyrinth.vision'))
  const exists = u => { const q = new globalThis.URL(u).pathname; return q === '/' || (existsSync(join(ROOT, q)) && !q.endsWith('/')) || existsSync(join(ROOT, q + '.html')) }
  check('E1 every link and image in the email is on labyrinth.vision and exists in this repository',
    urls.length >= 6 && here.length === urls.length && here.every(exists), urls.filter(u => !u.startsWith('https://labyrinth.vision') || !exists(u)).join(', '))
  check('E2 the donation page is the link: on the banner, the button and in the words, and in the plain text too',
    (html.match(/href="https:\/\/labyrinth\.vision\/donate"/g) || []).length >= 3 && txt.includes('https://labyrinth.vision/donate') && existsSync(join(ROOT, 'donate.html')))
  check('E3 it uses the CRM\'s own tags and nothing else: one {First Name} greeting, one {{unsubscribe}}, no stray placeholders',
    (html.match(/\{First Name\}/g) || []).length === 1 && (html.match(/\{\{unsubscribe\}\}/g) || []).length === 1 && /\{First Name\}/.test(txt)
      && !/\[First name\]|\[name\]|%%|\{\{(?!unsubscribe)/i.test(html + txt) && (html.replace(/\{First Name\}|\{\{unsubscribe\}\}/g, '').match(/[{}]/g) || []).length === 0)
  const banner = readFileSync(join(ROOT, 'assets/social/donation-email-banner.jpg'))
  let bw = 0, bh = 0
  for (let i = 2; i < banner.length;) { if (banner[i] !== 0xFF) { i++; continue } const m = banner[i + 1]; if (m >= 0xC0 && m <= 0xC2) { bh = banner.readUInt16BE(i + 5); bw = banner.readUInt16BE(i + 7); break } i += 2 + banner.readUInt16BE(i + 2) }
  check('E4 the banner is a 1200x600 picture under 200 KB, shown at 600 wide with a description for the apps that do not load images',
    bw === 1200 && bh === 600 && banner.length < 200000 && /<img[^>]+width="600"[^>]+alt="[^"]{30,}"/.test(html) && html.includes('/assets/social/donation-email-banner.jpg'), `${bw}x${bh} ${banner.length}`)
  check('E5 it is plain, safe mail: no scripts, forms, external styles or <style> blocks, and small enough that Gmail does not clip it',
    !/<(script|form|link|style|iframe|object)\b/i.test(html) && html.length < 60000, String(html.length))
  const nums = ['$500', '$1,500', '$10', '$30', '$25', '$75', '$100', '$300']
  check('E6 the html and the plain text tell the same story: the same match, the same examples, the same date',
    nums.every(n => html.includes(n) && txt.includes(n)) && /two anonymous donors will each match every dollar we raise, up to our \$500 goal/i.test(html.replace(/<[^>]+>/g, ''))
      && /two anonymous donors will each match every dollar we raise, up to our \$500 goal/i.test(txt) && /Saturday, October 24, 11:00 AM to 12:30 PM/.test(html + txt))
  const subject = (txt.match(/^Subject: (.+)$/m) || [])[1] || ''
  const pre = (html.match(/Preview text[^]*?<div style="display:none[^>]*>([^<]+)<\/div>/) || [])[1] || ''
  check('E7 a subject that fits an inbox and a preview line that adds to it, with no em dashes anywhere',
    subject.length > 20 && subject.length <= 60 && pre.length > 40 && pre.length <= 140 && !/—/.test(html + txt), `${subject.length}: ${subject} / ${pre.length}`)
  check('E8 it promises nothing the academy has not said: no deadline invented, no tax wording, the donors stay anonymous',
    !/tax[- ]deductible|deduct|501\s?\(c\)/i.test(html + txt) && !/\b(by|before|until|through) (oct(ober)?\.? ?\d|friday|sunday|midnight)/i.test(html.replace(/<[^>]+>/g, ' ') + txt.replace(/Saturday, October 24/g, ''))
      && !/Donor (1|2) (is|are|named)/i.test(html + txt))
}

console.log(`\n${pass} passed, ${fail} failed`)
await browser.close(); server.close()
process.exit(fail?1:0)
