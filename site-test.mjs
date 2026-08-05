import { chromium } from 'playwright-core'
import { createServer } from 'node:http'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

// The repository itself, wherever it happens to be checked out. This was a
// hard-coded /workspace path, which made the suite unrunnable from any other
// clone — it served 404 for every page and the failures looked like site bugs.
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
const pages = ['/', '/blog/', '/programs/', ...posts, ...programs]
const broken = []
for (const path of pages) {
  const r = await page.goto('http://localhost:4620'+path, { waitUntil:'domcontentloaded' })
  if (r.status() !== 200) { broken.push(path + ' -> ' + r.status()); continue }
  const hrefs = await page.$$eval('a[href]', as => as.map(a => a.getAttribute('href')))
  for (const h of hrefs) {
    if (!h || h.startsWith('http') || h.startsWith('#') || h.startsWith('mailto:') || h.startsWith('tel:')) continue
    const url = new URL(h, 'http://localhost:4620' + path)
    const res = await page.request.get(url.href)
    if (res.status() !== 200) broken.push(`${path}  ->  ${h}  (${res.status()})`)
  }
}
check('L1 no broken internal links', broken.length === 0, '\n    ' + broken.slice(0,8).join('\n    '))
check('L1 all 27 pages served 200', pages.length === 27, 'pages: ' + pages.length)

// ── L1b: every program page carries the schema and the canonical it exists for ──
// A program page whose Service block is missing is still a page, and still
// looks fine — it has just stopped doing the one job it was built for.
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

// Every post needs its own share image — nineteen of them shared one, so a
// link to any of them looked like a link to all of them.
const heroes = posts.map(p => {
  const f = readFileSync(join(ROOT, p.slice(1) + '.html'), 'utf8')
  return (f.match(/og:image" content="[^"]*\/(assets\/[^"]+)"/) || [])[1]
})
check('L1e every post has a distinct og:image',
  heroes.every(Boolean) && new Set(heroes).size === heroes.length,
  'reused: ' + heroes.filter((h,i) => heroes.indexOf(h) !== i).join(', '))

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
// booking button. It now opens the booking modal on the post itself — and keeps
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

console.log(`\n${pass} passed, ${fail} failed`)
await browser.close(); server.close()
process.exit(fail?1:0)
