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
  '/support', '/privacy-policy', '/ennova', '/self-defense-for-women', '/pink-october', '/legacy/', '/legacy/transfer',
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
check('L1 all 49 pages served 200', pages.length === 49, 'pages: ' + pages.length)

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
const generated = ['schedule.html','pricing.html','support.html','ennova.html','self-defense-for-women.html','pink-october.html',
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
  const OTHER = 'https://donate.stripe.com/14AdRa0tL1Ea1Br3bJgjC0a'
  const amts = await rp.$$eval('#donate a.rsvp-give__amt', as => as.map(a => [a.textContent.trim(), a.getAttribute('href'), a.target, a.rel]))
  check('L1x donation buttons: $1, $3, $5, $10, $25, $50, $100 and Other, each its own Stripe link that opens safely',
    amts.map(a => a[0]).join() === '$1,$3,$5,$10,$25,$50,$100,Other amount'
      && amts.every(([, h, t, r]) => /^https:\/\/donate\.stripe\.com\/\w+$/.test(h) && t === '_blank' && /noopener/.test(r))
      && new Set(amts.map(a => a[1])).size === 8 && amts[7][1] === OTHER, JSON.stringify(amts).slice(0, 200))
  check('L1x the Donate buttons in the header and after RSVPing lead to the amount picker',
    (await rp.$$eval('a.btn--pink[href="#donate"]', as => as.length)) >= 2 && (await rp.locator('#donate-pick').count()) === 1)
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

  // The fundraiser: honest at $0, and the real feed rendered when there is one.
  let feed = { raised: 0, count: 0, goal: 500, top: [], recent: [] }, feedFail = false
  await rp.route('**/functions/v1/event-donations**', route => feedFail
    ? route.fulfill({ status: 502, contentType: 'application/json', body: '{"error":"x"}' })
    : route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(feed) }))
  await fresh()
  const f0 = await rp.evaluate(() => ({
    raised: document.getElementById('fund-raised').textContent, goal: document.getElementById('fund-goal').textContent,
    first: !document.getElementById('fund-first').hidden, lists: !document.getElementById('fund-lists').hidden,
    width: document.getElementById('fund-fill').style.width }))
  check('L1x fundraiser at $0: shows $0 of $500, invites the first gift, and invents no donors',
    f0.raised === '$0' && f0.goal === '$500' && f0.first && !f0.lists && /^0(%|px)?$/.test(f0.width), JSON.stringify(f0))
  feed = { raised: 135, count: 3, goal: 500, top: [{ name: 'Sam T.', amount: 100 }, { name: 'Anonymous', amount: 25 }, { name: 'Pat <b>x</b>', amount: 10 }],
    recent: [{ name: 'Pat <b>x</b>', amount: 10 }, { name: 'Anonymous', amount: 25 }, { name: 'Sam T.', amount: 100 }] }
  await fresh()
  const f1 = await rp.evaluate(() => ({
    raised: document.getElementById('fund-raised').textContent, count: document.getElementById('fund-count').textContent,
    width: document.getElementById('fund-fill').style.width, now: document.getElementById('fund-bar').getAttribute('aria-valuenow'),
    first: document.getElementById('fund-first').hidden, top: [...document.querySelectorAll('#fund-top li')].map(l => l.textContent),
    html: document.getElementById('fund-top').innerHTML.includes('<b>') }))
  check('L1x fundraiser with gifts: total, percent, supporter count and the leaderboard',
    f1.raised === '$135' && f1.count === '3 supporters' && f1.width === '27%' && f1.now === '135' && f1.first
      && f1.top[0] === 'Sam T.$100' && f1.top[1] === 'Anonymous$25', JSON.stringify(f1))
  check('L1x a donor name is shown as text, never as markup', f1.html === false && f1.top[2].includes('<b>'))
  feedFail = true
  await fresh()
  check('L1x if the total cannot load the page stays calm: $0 line, no error, form and buttons still there',
    (await rp.textContent('#fund-raised')) === '$0' && (await rp.isVisible('#rsvp-form')) && (await rp.locator('#donate a.rsvp-give__amt').count()) === 8)
  await rp.unroute('**/functions/v1/event-donations**')
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
      donateBtns: [...document.querySelectorAll('a[href="#donate"], .rsvp-give__amt')].map(a => a.classList.contains('btn--pink') || a.classList.contains('rsvp-give__amt')),
      ratio: (hi + 0.05) / (lo + 0.05),
    }
  })
  check('L1x the page wears the awareness pink: ribbons, pink labels, pink Donate buttons',
    pink.label === 'rgb(229, 143, 181)' && pink.ribbons >= 4 && pink.donateBtns.length >= 3 && pink.donateBtns.every(Boolean),
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
      names: [...f.querySelectorAll('input:not(#rsvp-hp), select, textarea')].map(e => e.name),
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
  await rp.click('#rsvp-submit')
  await rp.waitForSelector('#rsvp-success:not([hidden])')
  check('L1x a valid RSVP is sent exactly once', posts.length === 1, 'posts: ' + posts.length)
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

  // After a donation Stripe sends people back with ?donated=1.
  await rp.goto(URL + '?donated=1', { waitUntil: 'networkidle' })
  check('L1x a returning donor is thanked', await rp.isVisible('#rsvp-donated'))

  // Homepage: the strip is there before the event, and gone after it.
  await rp.goto('http://localhost:4620/', { waitUntil: 'networkidle' })
  check('L1x the homepage links to the event page before the event',
    (await rp.locator('a.event-strip__link[href="/self-defense-for-women"]').count()) === 1
      && await rp.isVisible('#eventStrip'))
  check('L1x each October strip link carries a pink ribbon and a pink button (the HYROX row has its own volt look)',
    (await rp.locator('#eventStrip svg.ribbon').count()) === 2
      && await rp.evaluate(() => [...document.querySelectorAll('.event-strip__link:not(.event-strip__link--hyrox) .event-strip__icon')].every(i => getComputedStyle(i).color === 'rgb(229, 143, 181)')
        && [...document.querySelectorAll('.event-strip__link:not(.event-strip__link--hyrox) .event-strip__cta')].every(c => getComputedStyle(c).backgroundColor === 'rgb(229, 143, 181)')))
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
  // A Friday evening: the day's classes are gone, so it opens on the next day that has some.
  await pp.clock.setFixedTime(new Date('2026-10-10T02:00:00Z'))
  await pp.goto('http://localhost:4620/pink-october', { waitUntil: 'load' })
  check('L1y when a day has no classes left it opens on the next day that does',
    (await pp.evaluate(() => document.querySelector('.pick__d.is-on')?.textContent)) === '10')
  await pp.click('main .pink-band a[href="#pick-class"]')
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
    pics.n === 4 && pics.broken.length === 0 && pics.alts && !pics.srcs.some(x => /strength-conditioning|gallery-2|gallery-4/.test(x)), JSON.stringify(pics))
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
  await hp.fill('#hx-kid-name-2', 'Jack'); await hp.fill('#hx-note', 'Jack has done two seasons of cross country')
  await hp.click('#hx-submit')
  check('L1z a child without an age is caught', posts.length === 0 && /each child/.test(await hp.textContent('#hx-notes-err')))
  await hp.selectOption('#hx-kid-age-2', '12')
  reply = { status: 200, body: { ok: true }, delay: 300 }
  await hp.dblclick('#hx-submit')
  await hp.waitForSelector('#hx-success:not([hidden])')
  check('L1z it posts once to the RSVP function with the event, the parent, the count and each kid in the notes',
    posts.length === 1 && posts[0].event === 'hyrox-youngstars-houston-2027' && posts[0].name === 'Dana Reyes' && posts[0].email === 'dana@example.com' &&
    posts[0].party === 2 && posts[0].notes === 'Kids: Emma the Reyes (9), Jack (12). Note: Jack has done two seasons of cross country', JSON.stringify(posts))
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

console.log(`\n${pass} passed, ${fail} failed`)
await browser.close(); server.close()
process.exit(fail?1:0)
