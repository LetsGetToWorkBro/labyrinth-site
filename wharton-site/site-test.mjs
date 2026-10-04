// Tests for the Labyrinth BJJ Wharton site. Run from anywhere:
//
//     node wharton-site/site-test.mjs
//
// Needs playwright-core (it is in the repository's node_modules) and a Chromium
// at /opt/pw-browsers/chromium (CHROMIUM_PATH overrides), and python3, because
// the live-mode checks run scripts/build_wharton.py into a temporary copy of
// the site. Nothing here touches wharton-site/ itself or the main site.
//
// What it proves:
//   - every internal link (and every #fragment it points at) resolves
//   - coming-soon mode is noindex everywhere, robots.txt disallows all, there is
//     no sitemap; live mode is indexable, canonical, in the sitemap
//   - not one TBD value (address, prices, schedule, hours, opening date, map,
//     photo, kids' ages) renders while live is false, even when the config
//     holds real-looking values; and all of them render when live is true
//   - no forbidden strings (the Fulshear street address, lorem, "undefined",
//     Perplexity, seasonal/promotional leftovers, em dashes, British spelling)
//   - the enquiry form posts the expected payload to the CRM and shows success
//     only when the CRM confirms it saved
//   - no horizontal overflow at 390px or 1280px
import { chromium } from 'playwright-core'
import { createServer } from 'node:http'
import { readFileSync, existsSync, readdirSync, mkdtempSync, cpSync, writeFileSync, copyFileSync, statSync } from 'node:fs'
import { extname, join, relative, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import { execFileSync, spawnSync } from 'node:child_process'

const SITE = dirname(fileURLToPath(import.meta.url))          // .../wharton-site
const REPO = dirname(SITE)
const GEN = join(REPO, 'scripts', 'build_wharton.py')
const CRM = 'https://jctufxvmuvobaggxcwfn.supabase.co/functions/v1/book-trial'
const TYPES = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.ico':'image/x-icon','.xml':'application/xml','.txt':'text/plain'}

let pass = 0, fail = 0
const check = (n, c, x = '') => { if (c) { console.log('PASS  ' + n); pass++ } else { console.log('FAIL  ' + n + (x ? '  ' + x : '')); fail++ } }
const read = (root, f) => readFileSync(join(root, f), 'utf8')

// ── Static server that behaves like Cloudflare Pages: /foo serves foo.html, /dir/ serves dir/index.html ──
function serve(root) {
  const server = createServer((req, res) => {
    const p = decodeURIComponent(req.url.split('?')[0])
    let f = join(root, p)
    if (p.endsWith('/')) f = join(root, p, 'index.html')
    if (!existsSync(f) && existsSync(f + '.html')) f = f + '.html'
    if (!existsSync(f) || statSync(f).isDirectory()) { res.statusCode = 404; res.end(existsSync(join(root, '404.html')) ? readFileSync(join(root, '404.html')) : '404'); return }
    res.setHeader('content-type', TYPES[extname(f)] ?? 'application/octet-stream')
    res.end(readFileSync(f))
  })
  return new Promise(r => server.listen(0, '127.0.0.1', () => r({ server, base: 'http://127.0.0.1:' + server.address().port })))
}

// ── Build a throwaway copy of the site with a given config ──
const work = mkdtempSync(join(tmpdir(), 'wharton-test-'))
function build(name, cfg) {
  const dir = join(work, name)
  cpSync(SITE, dir, { recursive: true })
  copyFileSync(join(SITE, 'assets', 'kids-gi.jpg'), join(dir, 'assets', 'test-joe.jpg'))
  const cfgPath = join(work, name + '.json')
  writeFileSync(cfgPath, JSON.stringify(cfg, null, 2))
  const r = spawnSync('python3', [GEN, '--out', dir, '--config', cfgPath], { encoding: 'utf8' })
  if (r.status !== 0) throw new Error('generator failed for ' + name + ': ' + r.stderr)
  return dir
}

const committedCfg = JSON.parse(readFileSync(join(SITE, 'site.config.json'), 'utf8'))
// The blank template: every unknown fact empty. The committed config may be filled in and live;
// the coming-soon behaviour is tested on this blank one instead.
const base = {
  ...committedCfg, live: false,
  address: { street: '', suite: '', city: 'Wharton', state: 'TX', zip: '' },
  opening_date: '', hours: [], schedule: [], pricing: [], kids_ages: '', joe_photo: '', map_url: '',
  social: { instagram: '', facebook: '' },
}
// Values that look real, so a leak is unmistakable. Every one carries SENTINEL.
const filled = {
  ...base,
  lastmod: '2027-01-01',
  address: { street: 'SENTINEL-STREET 4242 Test Rd', suite: 'Suite SENTINEL-9', city: 'Wharton', state: 'TX', zip: '99999' },
  opening_date: '2027-02-14',
  hours: [{ days: ['Monday', 'Wednesday'], opens: '17:00', closes: '20:30' }],
  schedule: [
    { day: 'Monday', start: '18:00', end: '19:00', class: 'SENTINEL Adult Class', type: 'Gi', audience: 'adult' },
    { day: 'Tuesday', start: '', class: 'SENTINEL Kids Untimed', type: '', audience: 'kids', note: 'SENTINEL untimed note' },
    { day: 'Tuesday', start: '17:15', class: 'SENTINEL Kids Class', type: 'No-Gi', audience: 'kids', note: 'SENTINEL note' },
    { day: 'Wednesday', start: '19:30', class: 'SENTINEL Women Class', type: '', audience: 'women' },
  ],
  pricing: [
    { name: 'SENTINEL Adult Plan', audience: 'adult', price: '987', period: 'month', features: ['SENTINEL feature'], featured: true },
    { name: 'SENTINEL Kids Plan', audience: 'kids', price: '654', period: 'month' },
  ],
  kids_ages: 'SENTINEL ages 5 to 6',
  joe_photo: 'assets/test-joe.jpg',
  map_url: 'https://maps.example.test/SENTINEL',
  social: { instagram: 'https://instagram.example.test/SENTINEL', facebook: '' },
}
const SENTINELS = ['SENTINEL', '$987', '$654', '99999', 'February 14, 2027', 'maps.example.test', 'test-joe.jpg', '5:00 PM', '8:30 PM', '6:00 PM to 7:00 PM', '7:30 PM']

const dirCommitted = build('soon-empty', base)   // coming-soon mode, nothing filled in
const dirSoonFilled = build('soon-filled', { ...filled, live: false })   // live false, config full of real-looking values
const dirLive = build('live', { ...filled, live: true })                 // live true, same values
const dirLiveEmpty = build('live-empty', { ...base, live: true })        // live true but nothing filled in
const dirReal = build('real', committedCfg)                              // the committed config, exactly as the owner has it

function htmlFiles(root) {
  const out = []
  const walk = d => { for (const e of readdirSync(d, { withFileTypes: true })) {
    if (e.name === 'node_modules') continue
    const p = join(d, e.name)
    if (e.isDirectory()) walk(p); else if (e.name.endsWith('.html')) out.push(relative(root, p))
  } }
  walk(root)
  return out.sort()
}
const routeOf = f => f === 'index.html' ? '/' : f.endsWith('/index.html') ? '/' + f.slice(0, -10) : '/' + f.slice(0, -5)
const strip = h => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<!--[\s\S]*?-->/g, ' ').replace(/<[^>]+>/g, ' ')
const everything = root => [...htmlFiles(root), 'robots.txt', 'llms.txt', '_headers', '_redirects', ...(existsSync(join(root, 'sitemap.xml')) ? ['sitemap.xml'] : [])]
const allText = root => everything(root).map(f => f + '\n' + read(root, f)).join('\n\n')

const pagesCommitted = htmlFiles(SITE).filter(f => !['site-test.mjs'].includes(f))
check('00 the site has the expected pages', [
  'index.html', '404.html', 'contact.html', 'schedule.html', 'pricing.html', 'privacy-policy.html',
  'programs/index.html', 'programs/adult-bjj-wharton.html', 'programs/kids-bjj-wharton.html', 'programs/womens-self-defense-wharton.html',
  'coaches/index.html', 'coaches/joe-herrera.html', 'areas/index.html',
  'areas/bjj-el-campo.html', 'areas/bjj-east-bernard.html', 'areas/bjj-boling.html', 'areas/bjj-hungerford.html', 'areas/bjj-louise.html',
].every(f => pagesCommitted.includes(f)), pagesCommitted.join(', '))

// ── G: the generator and the committed files agree ──
{
  const dir = join(work, 'regen')
  cpSync(SITE, dir, { recursive: true })
  const r = spawnSync('python3', [GEN, '--out', dir], { encoding: 'utf8' })
  const diffs = r.status !== 0 ? ['generator exited ' + r.status + ': ' + r.stderr.slice(0, 200)] :
    everything(SITE).filter(f => read(SITE, f) !== read(dir, f))
  check('G1 committed pages match scripts/build_wharton.py (run: python3 scripts/build_wharton.py)', diffs.length === 0, diffs.join(', '))
  const bad = spawnSync('python3', [GEN, '--out', join(work, 'bad'), '--config', (() => {
    const p = join(work, 'bad.json'); writeFileSync(p, JSON.stringify({ ...base, live: true, schedule: [{ day: 'Funday', start: '18:00', class: 'x' }] })); return p })()], { encoding: 'utf8' })
  check('G2 a malformed schedule stops the build instead of rendering garbage', bad.status !== 0 && /Funday/.test(bad.stderr + bad.stdout), bad.stderr.slice(0, 120))
  const priv = spawnSync('python3', [GEN, '--out', join(work, 'strict'), '--strict', '--config', join(work, 'live-empty.json')], { encoding: 'utf8' })
  // The committed site is the real, live one: the facts the owner has given are on it.
  const homeC = read(SITE, 'index.html'), contactC = read(SITE, 'contact.html'), pricingC = read(SITE, 'pricing.html'), joeC = read(SITE, 'coaches/joe-herrera.html')
  check('G4 committed site shows the real address, price and Joe\'s photo, and no test values', /201 N Houston St/.test(contactC) && /77488/.test(contactC) && /\$150/.test(pricingC) && /joe-herrera\.(jpg|webp)/.test(joeC) && !/SENTINEL/.test(homeC + contactC + pricingC + joeC) && existsSync(join(SITE, 'assets', 'joe-herrera.jpg')))
  check('G3 --strict fails when live is true and a TBD field is still empty', priv.status === 1 && /address\.street is empty/.test(priv.stdout), priv.stdout.slice(0, 200))
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium', args: ['--no-proxy-server'] })

async function newPage(base, vw = 1280, vh = 900) {
  const ctx = await browser.newContext({ viewport: { width: vw, height: vh } })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', e => errors.push(String(e)))
  // The font CDN is not reachable from a test box and is not what is under test.
  await page.route(/api\.fontshare\.com/, r => r.abort())
  return { ctx, page, errors }
}

// ── L: every internal link resolves, fragments included ──
async function linkCheck(label, root) {
  const { server, base } = await serve(root)
  const { ctx, page } = await newPage(base)
  const files = htmlFiles(root).filter(f => !f.startsWith('node_modules'))
  const broken = []
  const idsCache = {}
  const idsOf = async path => {
    if (idsCache[path]) return idsCache[path]
    const r = await page.request.get(base + path)
    const html = await r.text()
    return (idsCache[path] = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1])))
  }
  for (const f of files) {
    const path = routeOf(f)
    const r = await page.goto(base + path, { waitUntil: 'domcontentloaded' })
    if (f !== '404.html' && r.status() !== 200) { broken.push(path + ' -> ' + r.status()); continue }
    const hrefs = await page.$$eval('a[href], link[rel=stylesheet][href], script[src], img[src], source[srcset], link[rel=icon][href], link[rel=apple-touch-icon][href]',
      els => els.map(e => e.getAttribute('href') || e.getAttribute('src') || e.getAttribute('srcset')))
    for (const h of new Set(hrefs)) {
      if (!h || /^(https?:|mailto:|tel:|sms:|data:|javascript:)/.test(h)) continue
      const url = new URL(h, base + path)
      if (h.startsWith('#')) { if (!(await idsOf(path)).has(h.slice(1))) broken.push(`${path} -> ${h} (no such id)`); continue }
      const res = await page.request.get(url.origin + url.pathname + url.search)
      if (res.status() !== 200) { broken.push(`${path} -> ${h} (${res.status()})`); continue }
      if (url.hash && /\.html$|\/|[^.]+$/.test(url.pathname) && !/\.(css|js|png|jpg|webp|svg|ico)$/.test(url.pathname)) {
        if (!(await idsOf(url.pathname)).has(url.hash.slice(1))) broken.push(`${path} -> ${h} (no such id)`)
      }
    }
  }
  check(`L1 [${label}] every internal link, asset and #fragment resolves (${files.length} pages)`, broken.length === 0, '\n    ' + broken.slice(0, 8).join('\n    '))
  // The redirect file's targets are real pages
  const targets = read(root, '_redirects').split('\n').filter(l => l.trim() && !l.startsWith('#')).map(l => l.trim().split(/\s+/)[1])
  const bad = []
  for (const t of targets) {
    const u = new URL(t, base)
    const res = await page.request.get(u.origin + u.pathname)
    if (res.status() !== 200) bad.push(t + ' (' + res.status() + ')')
  }
  check(`L2 [${label}] every _redirects target resolves (${targets.length})`, bad.length === 0, bad.join(', '))
  const nf = await page.request.get(base + '/definitely-not-a-page')
  check(`L3 [${label}] an unknown URL serves the 404 page`, nf.status() === 404 && /Lost in the Labyrinth/.test(await nf.text()))
  await ctx.close(); server.close()
}
await linkCheck('coming soon', dirCommitted)
await linkCheck('live', dirLive)

// ── S: search engines: noindex while coming soon, indexable when live ──
{
  const robotsMeta = h => (h.match(/<meta name="robots" content="([^"]*)"/) || [])[1] || ''
  const soonFiles = htmlFiles(dirCommitted)
  const notNoindex = soonFiles.filter(f => !/noindex/.test(robotsMeta(read(dirCommitted, f))))
  check('S1 coming soon: every page carries noindex', notNoindex.length === 0, notNoindex.join(', '))
  check('S2 coming soon: robots.txt disallows everything and names no sitemap',
    /User-agent: \*\s*\nDisallow: \/\s*(\n|$)/.test(read(dirCommitted, 'robots.txt')) && !/Sitemap:/i.test(read(dirCommitted, 'robots.txt')) && !/^Allow:/m.test(read(dirCommitted, 'robots.txt')))
  check('S3 coming soon: there is no sitemap, or it lists nothing', !existsSync(join(dirCommitted, 'sitemap.xml')) || !/<loc>/.test(read(dirCommitted, 'sitemap.xml')))
  check('S4 coming soon: no canonical or og:url points anywhere yet', soonFiles.every(f => !/rel="canonical"/.test(read(dirCommitted, f))))
  check('S5 coming soon: _headers adds X-Robots-Tag noindex', /X-Robots-Tag: noindex/.test(read(dirCommitted, '_headers')))
  check('S5b coming soon: the "coming soon" strip is on every page except 404 and the privacy policy',
    soonFiles.filter(f => !['404.html', 'privacy-policy.html'].includes(f)).every(f => /class="soon-strip"/.test(read(dirCommitted, f))))
  const soonLd = soonFiles.flatMap(f => [...read(dirCommitted, f).matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => m[1])).join('\n')
  check('S6 coming soon: JSON-LD omits address, hours and prices', !/streetAddress|postalCode|openingHours|"price"|priceRange|hasMap|"address"/.test(soonLd))

  const liveFiles = htmlFiles(dirLive)
  const idx = liveFiles.filter(f => !['404.html', 'privacy-policy.html'].includes(f))
  check('S7 live: no indexable page carries noindex', idx.every(f => !/noindex/.test(robotsMeta(read(dirLive, f)))), idx.filter(f => /noindex/.test(robotsMeta(read(dirLive, f)))).join(', '))
  check('S8 live: the 404 and the privacy policy stay noindex', ['404.html', 'privacy-policy.html'].every(f => /noindex/.test(robotsMeta(read(dirLive, f) ))))
  const canon = f => (read(dirLive, f).match(/rel="canonical" href="([^"]*)"/) || [])[1]
  const badCanon = idx.filter(f => { const c = canon(f); return !c || /\.html$/.test(c) || c !== 'https://wharton.labyrinth.vision' + (routeOf(f) === '/' ? '' : routeOf(f)) })
  check('S9 live: canonicals are wharton.labyrinth.vision, extensionless, one per page', badCanon.length === 0, badCanon.map(f => f + ' ' + canon(f)).join(', '))
  const sm = read(dirLive, 'sitemap.xml')
  const locs = [...sm.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1])
  check('S10 live: sitemap lists every indexable page, on the Wharton domain, and nothing noindex',
    locs.length === idx.length && locs.every(l => l.startsWith('https://wharton.labyrinth.vision')) && !locs.some(l => /privacy|404/.test(l)), `${locs.length} locs vs ${idx.length} pages`)
  check('S11 live: sitemap locs equal the canonicals', idx.every(f => locs.includes(canon(f))))
  const rob = read(dirLive, 'robots.txt')
  check('S12 live: robots.txt allows crawling and names the Wharton sitemap', /Allow: \//.test(rob) && /Sitemap: https:\/\/wharton\.labyrinth\.vision\/sitemap\.xml/.test(rob) && !/^Disallow: \/\s*$/m.test(rob))
  check('S13 live: _headers drops X-Robots-Tag', !/X-Robots-Tag/.test(read(dirLive, '_headers').split('\n').filter(l => !l.startsWith('#')).join('\n')))
  check('S14 live: no coming-soon strip', idx.every(f => !/class="soon-strip"/.test(read(dirLive, f))))
  const liveLd = liveFiles.flatMap(f => [...read(dirLive, f).matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => m[1])).join('\n')
  check('S15 live: JSON-LD carries the address, hours and prices, and only wharton.labyrinth.vision URLs for this site',
    /SENTINEL-STREET/.test(liveLd) && /openingHoursSpecification/.test(liveLd) && /"price": "987"/.test(liveLd) &&
    ![...liveLd.matchAll(/"(?:url|@id|item)": "(https?:\/\/[^"]+)"/g)].some(m => !/^https:\/\/(wharton\.labyrinth\.vision|labyrinth\.vision|jits\.gg)/.test(m[1])))
  // every JSON-LD block parses
  const unparsable = []
  for (const [root, files] of [[dirCommitted, soonFiles], [dirLive, liveFiles]])
    for (const f of files) for (const m of read(root, f).matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) { try { JSON.parse(m[1]) } catch { unparsable.push(f) } }
  check('S16 every JSON-LD block is valid JSON', unparsable.length === 0, unparsable.join(', '))
}

// ── T: no TBD value is ever presented as a fact before launch ──
{
  const leaked = SENTINELS.filter(s => allText(dirSoonFilled).includes(s))
  check('T1 live=false with a fully filled config: not one filled-in value reaches any page, file or JSON-LD', leaked.length === 0, leaked.join(', '))
  const soonText = htmlFiles(dirCommitted).map(f => strip(read(dirCommitted, f))).join(' ')
  check('T2 coming soon: no dollar amount appears on any page', !/\$\s?\d/.test(soonText), (soonText.match(/.{30}\$\s?\d.{20}/) || [''])[0])
  check('T3 coming soon: no street address, ZIP or clock time appears as a fact',
    !/\b\d{2,5}\s+[A-Z][A-Za-z]+\s+(St|Street|Ave|Avenue|Rd|Road|Blvd|Dr|Drive|Ln|Lane|Hwy|Highway)\b/.test(soonText) && !/\b77488\b|\b774\d\d\b/.test(soonText) &&
    !/\b\d{1,2}:\d{2}\s?(AM|PM|am|pm)\b/.test(soonText))
  const home = strip(read(dirCommitted, 'index.html'))
  check('T4 coming soon: the home page says coming soon for address, schedule, prices and the map',
    /Address coming soon/i.test(strip(read(dirCommitted, 'index.html')) + strip(read(dirCommitted, 'contact.html'))) &&
    /schedule coming soon|Class times coming soon/i.test(home) && /Prices coming soon/i.test(home) && /map and directions will be added/i.test(home))
  check('T5 coming soon: the schedule and pricing pages say coming soon and offer the notify form / free class',
    /Class times coming soon/.test(read(dirCommitted, 'schedule.html')) && /data-wharton-form/.test(read(dirCommitted, 'schedule.html')) &&
    /Prices coming soon/.test(read(dirCommitted, 'pricing.html')) && /first class is free/i.test(strip(read(dirCommitted, 'pricing.html'))))
  check('T6 coming soon: Joe has the monogram card, not a photograph',
    /portrait__initials/.test(read(dirCommitted, 'coaches/joe-herrera.html')) && !/<img[^>]*portrait__pic/.test(read(dirCommitted, 'coaches/joe-herrera.html')) && !/test-joe/.test(read(dirSoonFilled, 'coaches/joe-herrera.html')))

  const liveAll = allText(dirLive)
  check('T7 live: every filled-in value renders', ['SENTINEL-STREET 4242 Test Rd', '99999', 'February 14, 2027', 'maps.example.test/SENTINEL', 'SENTINEL ages 5 to 6',
    'SENTINEL Adult Class', 'SENTINEL Kids Class', 'SENTINEL Women Class', '7:30 PM', '$987', '$654', '5:00 PM to 8:30 PM', 'instagram.example.test/SENTINEL'].every(s => liveAll.includes(s)),
    ['SENTINEL-STREET 4242 Test Rd', '99999', 'February 14, 2027', 'maps.example.test/SENTINEL', 'SENTINEL ages 5 to 6', 'SENTINEL Adult Class', '$987', '$654', '5:00 PM to 8:30 PM'].filter(s => !liveAll.includes(s)).join(', '))
  check('T8 live: the address is in the footer on every page, the schedule on /schedule, prices on /pricing, the hours in the footer',
    htmlFiles(dirLive).filter(f => f !== '404.html' && f !== 'privacy-policy.html').every(f => /SENTINEL-STREET/.test(read(dirLive, f.replace(/\\/g, '/'))) && /Mon, Wed/.test(read(dirLive, f))) &&
    /SENTINEL Adult Class/.test(read(dirLive, 'schedule.html')) && /\$987/.test(read(dirLive, 'pricing.html')))
  check('T9 live: each program page shows only its own classes (adult, kids, women)',
    /SENTINEL Adult Class/.test(read(dirLive, 'programs/adult-bjj-wharton.html')) && !/SENTINEL (Kids|Women) (Class|Untimed)/.test(read(dirLive, 'programs/adult-bjj-wharton.html')) &&
    /SENTINEL Kids Class/.test(read(dirLive, 'programs/kids-bjj-wharton.html')) && !/SENTINEL (Adult|Women) Class/.test(read(dirLive, 'programs/kids-bjj-wharton.html')) &&
    /SENTINEL Women Class/.test(read(dirLive, 'programs/womens-self-defense-wharton.html')) && !/SENTINEL (Adult|Kids) (Class|Untimed)/.test(read(dirLive, 'programs/womens-self-defense-wharton.html')))
  check('T10 live: Joe\'s photo replaces the monogram', /<img[^>]*src="\/assets\/test-joe.jpg"/.test(read(dirLive, 'coaches/joe-herrera.html')) && !/portrait__initials/.test(read(dirLive, 'coaches/joe-herrera.html')))
  check('T11 live: llms.txt carries the address, hours, schedule and prices', /SENTINEL-STREET/.test(read(dirLive, 'llms.txt')) && /\$987/.test(read(dirLive, 'llms.txt')) && /SENTINEL Adult Class/.test(read(dirLive, 'llms.txt')))
  check('T12 coming soon: llms.txt tells a model not to guess', /have NOT been announced/.test(read(dirCommitted, 'llms.txt')) && !/\$\d/.test(read(dirCommitted, 'llms.txt')))
  const liveEmpty = htmlFiles(dirLiveEmpty).map(f => strip(read(dirLiveEmpty, f))).join(' ')
  check('T13 live with an empty config: still no invented facts, and the coming-soon messages remain',
    !/\$\s?\d/.test(liveEmpty) && /Address coming soon/.test(liveEmpty) && /Class times coming soon/.test(liveEmpty) && /Prices coming soon/.test(liveEmpty))
  check('T14 live: the opening line says classes start on the date', /Classes start February 14, 2027/.test(read(dirLive, 'index.html')) || /Classes start February 14, 2027/.test(read(dirLive, 'contact.html')))
}

// ── K: the real schedule, and schedule rows with no time yet ──
{
  const sh = read(dirLive, 'schedule.html')
  const tue = sh.slice(sh.indexOf('>Tuesday<'), sh.indexOf('>Wednesday<'))
  check('K1 a row with no start time renders "Time to be announced", with its note, on the schedule, kids page, home page and llms.txt',
    ['schedule.html', 'programs/kids-bjj-wharton.html', 'index.html'].every(f => /Time to be announced/.test(read(dirLive, f)) && /SENTINEL untimed note/.test(read(dirLive, f))) && /time to be announced/.test(read(dirLive, 'llms.txt')))
  check('K2 on a day with both, timed rows come before rows with no time', tue.indexOf('SENTINEL Kids Class') > -1 && tue.indexOf('SENTINEL Kids Untimed') > tue.indexOf('SENTINEL Kids Class'), tue.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 200))
  const gen = (rows) => { const pth = join(work, 'k-' + Math.random().toString(36).slice(2) + '.json'); writeFileSync(pth, JSON.stringify({ ...base, live: true, schedule: rows })); return spawnSync('python3', [GEN, '--out', join(work, 'k-out'), '--config', pth], { encoding: 'utf8' }) }
  const badTimes = [['25:99', ''], ['6pm', ''], ['18:00', '7pm'], ['', '19:00']].map(([st, en]) => gen([{ day: 'Monday', start: st, end: en, class: 'x', audience: 'kids' }]))
  check('K3 a start time that IS given must be a real 24-hour time, and an end needs a start (4 bad rows all stop the build)',
    badTimes.every(r => r.status !== 0), badTimes.map(r => r.status).join(','))
  check('K4 a row with no start key at all, or an empty one, is accepted',
    gen([{ day: 'Monday', class: 'x', audience: 'kids' }, { day: 'Friday', start: '', class: 'y', audience: 'all' }]).status === 0)

  // The committed config, as the owner has it
  const real = committedCfg.schedule
  const find = (cls, day) => real.filter(r => r.class === cls && r.day === day)
  check('K5 the committed schedule is exactly Joe\'s (adult kickboxing Tue/Thu 6 to 7 PM is checked in K8): kids jiu-jitsu Tue/Wed/Thu/Fri at 5 to 6 PM (no kids kickboxing), adult kickboxing Tue/Thu and women\'s self defense Wed/Fri 6 to 7 PM',
    real.length === 8 && !real.some(r => /Kids Kickboxing/.test(r.class)) &&
    ['Tuesday', 'Wednesday', 'Thursday', 'Friday'].every(d => find('Kids Jiu-Jitsu', d).length === 1) &&
    real.filter(r => r.class.startsWith('Kids')).every(r => r.start === '17:00' && r.end === '18:00') &&
    find("Women's Self Defense Jiu-Jitsu", 'Friday')[0].start === '18:00' && find("Women's Self Defense Jiu-Jitsu", 'Friday')[0].end === '19:00' && find("Women's Self Defense Jiu-Jitsu", 'Monday').length === 0 &&
    find("Women's Self Defense Jiu-Jitsu", 'Wednesday')[0].start === '18:00' && committedCfg.kids_ages === '', JSON.stringify(real).slice(0, 200))
  const times = new Set(htmlFiles(dirReal).flatMap(f => [...strip(read(dirReal, f)).matchAll(/\b\d{1,2}:\d{2}\s?(?:AM|PM)\b/g)].map(m => m[0])).concat([...read(dirReal, 'llms.txt').matchAll(/\b\d{1,2}:\d{2}\s?(?:AM|PM)\b/g)].map(m => m[0])))
  check('K6 the only clock times anywhere on the real site are 5:00 to 7:00 PM (nothing invented)', [...times].every(t => /^[567]:00 PM$/.test(t)) && times.size === 3, [...times].join(', '))
  const rs = htmlFiles(dirReal).filter(f => f !== 'privacy-policy.html').map(f => f + strip(read(dirReal, f))).join(' ')
  check('K7 the real site: no kids age range is claimed anywhere', !/ages? (3|4|5|6|7|8|9|10|11|12)\b|aged \d|(\d) to (\d+) years/i.test(rs))
  const adultReal = strip(read(dirReal, 'programs/adult-bjj-wharton.html'))
  check('K8 the real site: adult jiu-jitsu says its times are coming soon, does not borrow the women\'s class, and shows adult kickboxing Tue/Thu 6 to 7 PM',
    /Adult class times coming soon/.test(adultReal) && !/Women's Self Defense Jiu-Jitsu/.test(adultReal.replace(/Women's Self Defense/g, '')) && /Adult Kickboxing/.test(adultReal) && /6:00 PM to 7:00 PM/.test(adultReal) && !/Adult Jiu-Jitsu\b.{0,40}6:00 PM/.test(adultReal))
  const kidsReal = strip(read(dirReal, 'programs/kids-bjj-wharton.html'))
  check('K9 the real site: the kids page is jiu-jitsu only, Tuesday to Friday 5 to 6 PM, with no kickboxing',
    /Kids Jiu-Jitsu: Tuesday, Wednesday, Thursday, Friday/.test(kidsReal) && !/kickbox/i.test(kidsReal) && /5:00 PM to 6:00 PM/.test(kidsReal))
  const wom = strip(read(dirReal, 'programs/womens-self-defense-wharton.html'))
  check('K10 the women\'s self defense page exists with Wednesday and Friday, 6:00 to 7:00 PM, and is linked from nav-level pages and the footer',
    /Friday/.test(wom) && /Wednesday/.test(wom) && !/Monday/.test(wom) && /6:00 PM to 7:00 PM/.test(wom) &&
    htmlFiles(dirReal).filter(f => !['404.html', 'privacy-policy.html'].includes(f)).every(f => /href="\/programs\/womens-self-defense-wharton"/.test(read(dirReal, f))))
  const kick = ['index.html', 'programs/index.html', 'programs/adult-bjj-wharton.html', 'llms.txt'].every(f => /kickboxing/i.test(read(dirReal, f)))
  const kickSoon = ['index.html', 'programs/index.html', 'llms.txt'].every(f => /kickboxing/i.test(read(dirCommitted, f)))
  const noKidsKb = htmlFiles(dirReal).concat(['llms.txt']).every(f => !/kids?\s+(and adult\s+)?kickbox/i.test(strip(read(dirReal, f))))
  check('K11 adult kickboxing is named wherever programs are listed (home, programs, adult page, llms.txt), live and coming soon, and no page mentions kids kickboxing',
    kick && kickSoon && noKidsKb && /"Kickboxing"/.test(read(dirCommitted, 'index.html')))
  const smReal = read(dirReal, 'sitemap.xml')
  check('K12 the sitemap lists the women\'s page and the kids page', /programs\/womens-self-defense-wharton</.test(smReal) && /programs\/kids-bjj-wharton</.test(smReal))
  const metas = htmlFiles(dirReal).map(f => (read(dirReal, f).match(/<meta name="description" content="([^"]*)"/) || [])[1] || '').join(' ')
  check('K13 no meta description, OG text or JSON-LD still says "kids and teens"', !/teen/i.test(metas) && !/teen/i.test(htmlFiles(dirReal).filter(f => f !== 'privacy-policy.html').map(f => read(dirReal, f)).join(' ')) && !/teen/i.test(read(dirReal, 'llms.txt')))
  const og = read(join(REPO, 'scripts'), 'og-wharton.html')
  check('K14 the OG image text does not mention teens', !/teen/i.test(og))
  const home = strip(read(dirReal, 'index.html'))
  check('K15 the real home page: price shown once as the single grand opening membership, address shown, no hours or opening date invented',
    /Grand Opening Membership/.test(home) && /\$150/.test(home) && /201 N Houston St/.test(home) && !/Classes start|Now open in Wharton/.test(home))
}

// ── F: nothing forbidden is on any page, in either mode ──
{
  const BRITISH = /\b(colour\w*|honour\w*|favourite\w*|behaviour\w*|neighbour\w*|labour\w*|organis\w*|recognis\w*|authoris\w*|apologis\w*|centre|metre|litre|defence|offence|licence|programmes?|travell\w*|whilst|amongst|learnt|judgement|ageing|cancelled|grey\w*)\b/gi
  const FORBIDDEN = [
    [/6615\b|Cross Creek|77441/i, 'the Fulshear street address'],
    [/lorem|ipsum/i, 'lorem ipsum'],
    [/\bundefined\b|\bNaN\b|\[object |\{\{|\}\}/, 'a template leak'],
    [/\bTBD\b|\bTODO\b|\bFIXME\b/, 'a to-do marker'],
    [/\bteens?\b|\bteenagers?\b|13 to 17|ages 7 to 12|ages 3 to 6/i, 'a teens or other-age program claim (no kids age range has been given for Wharton)'],
    [/perplexity\.ai|created with perplexity|name="generator"/i, 'Perplexity attribution'],
    [/halloween|data-season|season\.css|pink october|rolling for ribbons|hyrox|ribbon/i, 'seasonal or promotional content'],
    [/live ?stream|member portal|pre-?order|apple tv|cornerman/i, 'stream, portal or pre-order content'],
    [/—|&mdash;/, 'an em dash'],
    [/coach-(shaun|jared|christian|jake|malik|scott|emma|hadley)/i, "another coach's photo"],
    [/Shaun Lawler|Jared Vevera|Christian Solano|Jake Maronge|Malik Pickett|Scott Jones/, "another coach presented on this site"],
    [/\bgymdesk\b|calendar\.labyrinth|sauna\.labyrinth/i, 'main-site tooling links'],
  ]
  for (const [label, root] of [['coming soon', dirCommitted], ['live', dirLive], ['live, empty config', dirLiveEmpty], ['the real config', dirReal]]) {
    const hits = []
    for (const f of everything(root)) {
      if (f === 'privacy-policy.html') continue          // the policy names its own vendors (Stripe, GymDesk, Cornerman)
      const text = read(root, f)
      for (const [re, what] of FORBIDDEN) if (re.test(f === '_redirects' || f === '_headers' ? text.split('\n').filter(l => !l.startsWith('#')).join('\n') : strip(text) + text.replace(/<[^>]+>/g, m => m))) hits.push(`${f}: ${what}`)
      if (f.endsWith('.html')) for (const m of strip(text).matchAll(BRITISH)) hits.push(`${f}: British spelling "${m[0]}"`)
    }
    check(`F1 [${label}] no forbidden strings`, hits.length === 0, '\n    ' + [...new Set(hits)].slice(0, 8).join('\n    '))
  }
  // The privacy policy: this domain, not Fulshear's address
  const priv = read(dirCommitted, 'privacy-policy.html')
  check('F2 the privacy policy is adjusted: Wharton domain, no Fulshear street address, no leftover main-site nav',
    /wharton\.labyrinth\.vision/.test(priv) && !/6615|Cross Creek|77441/.test(priv) && !/labyrinth\.vision\/#(programs|schedule|instructors|contact)/.test(priv) && /noindex/.test(priv) && /info@labyrinth\.vision/.test(priv))
  const allPages = htmlFiles(dirCommitted)
  const imgProblems = []
  for (const f of allPages.filter(f => f !== 'privacy-policy.html' && f !== '404.html')) {
    const h = read(dirCommitted, f)
    for (const m of h.matchAll(/<img\b[^>]*>/g)) {
      const tag = m[0]
      if (!/\balt="/.test(tag)) imgProblems.push(`${f}: img without alt`)
      if (!/\bwidth="\d+"/.test(tag) || !/\bheight="\d+"/.test(tag)) imgProblems.push(`${f}: img without width/height`)
    }
    const eager = [...h.matchAll(/<img\b[^>]*loading="eager"[^>]*>/g)].length
    if (eager > 2) imgProblems.push(`${f}: ${eager} eager images`)
    for (const m of h.matchAll(/<picture[^>]*>\s*<source srcset="([^"]+)"/g)) if (!existsSync(join(SITE, m[1].replace(/^\//, '')))) imgProblems.push(`${f}: missing ${m[1]}`)
  }
  check('F3 every image has alt, width and height, a webp source that exists, and at most two load eagerly', imgProblems.length === 0, '\n    ' + imgProblems.slice(0, 6).join('\n    '))
  const meta = []
  for (const f of allPages.filter(f => f !== '404.html' && f !== 'privacy-policy.html')) {
    const h = read(dirLive, f)
    const t = (h.match(/<title>([^<]*)<\/title>/) || [])[1] || ''
    const d = (h.match(/<meta name="description" content="([^"]*)"/) || [])[1] || ''
    if (t.length < 15 || t.length > 75) meta.push(`${f}: title ${t.length} chars`)
    if (d.length < 70 || d.length > 175) meta.push(`${f}: description ${d.length} chars`)
    if ((h.match(/<h1[\s>]/g) || []).length !== 1) meta.push(`${f}: ${(h.match(/<h1[\s>]/g) || []).length} h1`)
    if (!/<html lang="en">/.test(h) || !/<main id="main">/.test(h) || !/class="skip-link"/.test(h)) meta.push(`${f}: missing lang, main or skip link`)
    for (const k of ['og:title', 'og:description', 'og:image', 'og:url', 'twitter:card']) if (!new RegExp('(property|name)="' + k + '"').test(h)) meta.push(`${f}: no ${k}`)
  }
  check('F4 every page has a sensible title and description, one h1, lang, main, skip link, OG and Twitter tags', meta.length === 0, '\n    ' + meta.slice(0, 6).join('\n    '))
  const titles = allPages.map(f => (read(dirCommitted, f).match(/<title>([^<]*)<\/title>/) || [])[1])
  check('F5 titles are unique', new Set(titles).size === titles.length)
  // The copy that is meant to be unique to each town: the prose and the three "good to know" cards.
  const unique = f => {
    const h = read(dirCommitted, f)
    const parts = [...h.matchAll(/<div class="prog-prose fade-in">([\s\S]*?)<\/div>/g)].map(m => m[1]).concat([...h.matchAll(/prog-group__desc">([^<]*)</g)].map(m => m[1]))
    return new Set(strip(parts.join(' ')).replace(/\s+/g, ' ').toLowerCase().split(/(?<=[.!?])\s/).filter(s => s.length > 40))
  }
  const areaSets = allPages.filter(f => /^areas\/bjj-/.test(f)).map(unique)
  let dup = []
  areaSets.forEach((a, i) => areaSets.forEach((b, j) => { if (j > i) for (const s of a) if (b.has(s)) dup.push(s.slice(0, 60)) }))
  check('F6 the five area pages share no sentence of their own copy (no doorway-page text)', areaSets.length === 5 && areaSets.every(s => s.size >= 6) && dup.length === 0, dup.join(' | '))
  const mainRobots = readFileSync(join(REPO, 'robots.txt'), 'utf8') + readFileSync(join(REPO, 'sitemap.xml'), 'utf8')
  check('F7 the main site\'s robots.txt and sitemap.xml do not advertise the Wharton site (only a Disallow for the preview folder)', !/wharton\.labyrinth\.vision/i.test(mainRobots) && !/wharton/i.test(readFileSync(join(REPO, 'sitemap.xml'), 'utf8')))
  const st = spawnSync('python3', [join(REPO, 'scripts', 'stamp_assets.py')], { cwd: REPO, encoding: 'utf8' })
  check('F8 the main site\'s asset stamper leaves wharton-site/ alone (stamped 0 files)', /stamped 0 file\(s\)/.test(st.stdout), st.stdout.trim().slice(0, 200))
  const stamped = allPages.filter(f => f !== 'privacy-policy.html' && f !== '404.html').every(f => /href="\/style\.css\?v=[0-9a-f]{8}"/.test(read(dirCommitted, f)) && /src="\/app\.js\?v=[0-9a-f]{8}"/.test(read(dirCommitted, f)))
  check('F9 style.css and app.js are requested with a content hash', stamped)
}

// ── B: behaviour, in a browser ──
const SOON = await serve(dirCommitted)
const LIVE = await serve(dirLive)
{
  // B1/B2: no horizontal overflow, no script errors, the page paints, at phone and desktop widths
  for (const [label, srv, root] of [['coming soon', SOON, dirCommitted], ['live', LIVE, dirLive]]) {
    for (const [vw, vh] of [[390, 844], [1280, 900]]) {
      const { ctx, page, errors } = await newPage(srv.base, vw, vh)
      const over = []
      for (const f of htmlFiles(root)) {
        await page.goto(srv.base + routeOf(f), { waitUntil: 'load' })
        const m = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth,
          wide: [...document.querySelectorAll('body *')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > document.documentElement.clientWidth + 1 && getComputedStyle(e).position !== 'fixed' && !e.closest('.hp-field') }).slice(0, 2).map(e => e.tagName + '.' + e.className) }))
        if (m.sw > m.cw) over.push(`${routeOf(f)} ${m.sw}>${m.cw} ${m.wide.join(',')}`)
      }
      check(`B1 [${label}] no horizontal overflow at ${vw}px on any page`, over.length === 0, '\n    ' + over.slice(0, 5).join('\n    '))
      check(`B2 [${label}] no script errors at ${vw}px`, errors.length === 0, errors.slice(0, 3).join(' | '))
      await ctx.close()
    }
  }

  // B3: reveal-on-scroll never leaves content invisible
  {
    const { ctx, page } = await newPage(SOON.base, 390, 844)
    await page.goto(SOON.base + '/', { waitUntil: 'load' })
    const h = await page.evaluate(() => document.documentElement.scrollHeight)
    for (let y = 0; y < h; y += 400) { await page.evaluate(y => window.scrollTo({ top: y, behavior: 'instant' }), y); await page.waitForTimeout(80) }
    await page.waitForTimeout(700)
    const hidden = await page.evaluate(() => [...document.querySelectorAll('.fade-in')].filter(e => !e.classList.contains('visible')).length)
    check('B3 scrolling the home page reveals every .fade-in block', hidden === 0, hidden + ' still hidden')
    await ctx.close()
    const nojs = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } })
    const p2 = await nojs.newPage(); await p2.route(/fontshare/, r => r.abort())
    await p2.goto(SOON.base + '/', { waitUntil: 'load' })
    const op = await p2.evaluate(() => Math.min(...[...document.querySelectorAll('.fade-in')].map(e => +getComputedStyle(e).opacity)))
    check('B4 without JavaScript nothing stays invisible', op === 1, 'min opacity ' + op)
    await nojs.close()
  }

  // B5: nav, mobile menu, FAQ accordion
  {
    const { ctx, page } = await newPage(SOON.base, 390, 844)
    await page.goto(SOON.base + '/', { waitUntil: 'load' })
    const before = await page.getAttribute('#hamburger', 'aria-expanded')
    await page.click('#hamburger')
    const open = await page.evaluate(() => document.getElementById('mobileNav').classList.contains('open') && getComputedStyle(document.getElementById('mobileNav')).display !== 'none')
    const exp = await page.getAttribute('#hamburger', 'aria-expanded')
    await page.keyboard.press('Escape')
    const closed = await page.evaluate(() => !document.getElementById('mobileNav').classList.contains('open'))
    check('B5 the mobile menu opens, reports aria-expanded, and closes on Escape', before === 'false' && open && exp === 'true' && closed, `${before} ${open} ${exp} ${closed}`)
    await page.evaluate(() => document.querySelector('#faq').scrollIntoView())
    const q = page.locator('.faq-item__question').first()
    await q.click()
    await page.waitForTimeout(700)
    const a1 = await q.getAttribute('aria-expanded')
    const vis = await page.evaluate(() => document.querySelector('.faq-item--active .faq-item__answer').getBoundingClientRect().height > 20)
    await page.locator('.faq-item__question').nth(1).click()
    const a0 = await q.getAttribute('aria-expanded')
    check('B6 the FAQ accordion opens one answer at a time and keeps aria-expanded true to what is shown', a1 === 'true' && vis && a0 === 'false', `${a1} ${vis} ${a0}`)
    await ctx.close()
    const d = await newPage(SOON.base, 1280, 900)
    await d.page.goto(SOON.base + '/', { waitUntil: 'load' })
    const navShown = await d.page.evaluate(() => getComputedStyle(document.querySelector('.nav__links')).display !== 'none' && getComputedStyle(document.getElementById('hamburger')).display === 'none')
    check('B7 at 1280px the full nav shows and the hamburger is hidden', navShown)
    await d.ctx.close()
  }

  // B8..B14: the enquiry form
  {
    const fill = async (page, f) => {
      for (const [k, v] of Object.entries(f)) {
        const el = page.locator(`form[data-wharton-form] [name="${k}"]`).first()
        if (k === 'who') await el.selectOption(v)
        else if (k === 'company') await el.evaluate((e, x) => { e.value = x }, v)   // off-screen on purpose
        else await el.fill(v)
      }
    }
    const run = async (respond, fields, { path = '/contact' } = {}) => {
      const { ctx, page, errors } = await newPage(SOON.base, 1280, 900)
      const sent = []
      await page.route(CRM, async route => {
        sent.push({ method: route.request().method(), ct: route.request().headers()['content-type'], body: route.request().postData() })
        await respond(route)
      })
      await page.goto(SOON.base + path, { waitUntil: 'load' })
      await fill(page, fields)
      await page.locator('form[data-wharton-form] button[type=submit]').first().click()
      await page.waitForTimeout(500)
      const state = await page.evaluate(() => {
        const f = document.querySelector('form[data-wharton-form]')
        const ok = f.closest('.trial-form').querySelector('.form-success')
        const err = f.querySelector('.w-form__error')
        return { formHidden: f.hidden || getComputedStyle(f).display === 'none', success: ok.classList.contains('show') && getComputedStyle(ok).display !== 'none',
          successText: ok.innerText, errorShown: !err.hidden && getComputedStyle(err).display !== 'none', errorText: err.innerText, btn: f.querySelector('button[type=submit]').disabled }
      })
      await ctx.close()
      return { sent, state, errors }
    }
    const good = { name: 'Test Parent', email: 'test@example.com', phone: '2815550100', who: 'kids', message: 'We can only do evenings.' }
    const ok = await run(r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) }), good)
    const payload = ok.sent[0] && JSON.parse(ok.sent[0].body)
    check('B8 the form posts once, as JSON, to the CRM book-trial endpoint', ok.sent.length === 1 && ok.sent[0].method === 'POST' && /application\/json/.test(ok.sent[0].ct))
    check('B9 the payload is name, email, phone, program and a note that starts "WHARTON: ", with no class date',
      payload && payload.name === 'Test Parent' && payload.email === 'test@example.com' && payload.phone === '2815550100' && payload.program === 'Kids 3-6' &&
      payload.note.startsWith('WHARTON: ') && /We can only do evenings\./.test(payload.note) && !('trialAt' in payload) && !('company' in payload) &&
      Object.keys(payload).sort().join() === 'email,name,note,phone,program', JSON.stringify(payload))
    check('B10 success is shown when the CRM confirms it saved', ok.state.success && ok.state.formHidden && !ok.state.errorShown && /on the list/i.test(ok.state.successText), JSON.stringify(ok.state))
    const adult = await run(r => r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }), { name: 'A', email: 'a@b.co', who: 'adult' })
    const ap = JSON.parse(adult.sent[0].body)
    check('B11 an adult enquiry maps to the CRM programme "Adult BJJ"; an unanswered "who" sends none', ap.program === 'Adult BJJ' && /for an adult/.test(ap.note) && ap.phone === '')
    const notOk = [
      ['{ok:false}', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":false}' })],
      ['HTTP 500 with no body', r => r.fulfill({ status: 500, body: 'oops' })],
      ['an empty object', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' })],
      ['"ok": "true" (a string)', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":"true"}' })],
      ['a network failure', r => r.abort()],
    ]
    const wrongly = []
    for (const [label, respond] of notOk) {
      const r = await run(respond, good)
      if (r.state.success || r.state.formHidden || !r.state.errorShown || !/\(281\) 393-7983/.test(r.state.errorText) || r.state.btn) wrongly.push(label)
    }
    check('B12 success is NEVER shown unless the CRM said ok:true (error + phone number instead, form kept)', wrongly.length === 0, wrongly.join(', '))
    const hp = await run(r => r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }), { ...good, company: 'http://spam.example' })
    check('B13 the honeypot field stops a bot: nothing is sent and no success is shown', hp.sent.length === 0 && !hp.state.success)
    const bad = await run(r => r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }), { name: '', email: 'not-an-email' })
    check('B14 invalid input is not sent', bad.sent.length === 0 && !bad.state.success)
    const home = await run(r => r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }), good, { path: '/' })
    check('B15 the same form works on the home page', home.sent.length === 1 && home.state.success)
    const { ctx, page } = await newPage(SOON.base, 1280, 900)
    await page.goto(SOON.base + '/contact', { waitUntil: 'load' })
    const consent = await page.locator('.w-form__consent').first().innerText()
    const hpHidden = await page.evaluate(() => { const e = document.querySelector('.hp-field input'); const r = e.getBoundingClientRect(); return r.right < 0 || r.left < -1000 || r.width <= 1 })
    check('B16 the email/SMS consent line sits above the button, and the honeypot is off-screen and out of the tab order',
      /email you/.test(consent) && /text you/.test(consent) && /Reply STOP/.test(consent) && hpHidden && (await page.getAttribute('.hp-field input', 'tabindex')) === '-1')
    await ctx.close()
    const labels = await (async () => { const c = await newPage(SOON.base); await c.page.goto(SOON.base + '/contact'); const r = await c.page.evaluate(() => [...document.querySelectorAll('form input:not([type=hidden]), form select, form textarea')].filter(e => !e.closest('.hp-field')).map(e => !!document.querySelector(`label[for="${e.id}"]`))); await c.ctx.close(); return r })()
    check('B17 every visible form control has a label', labels.length >= 5 && labels.every(Boolean))
    // The live site's form tells the visitor something different from the coming-soon one
    const l = await newPage(LIVE.base)
    await l.page.route(CRM, r => r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }))
    await l.page.goto(LIVE.base + '/contact', { waitUntil: 'load' })
    await l.page.fill('form[data-wharton-form] [name=name]', 'X'); await l.page.fill('form[data-wharton-form] [name=email]', 'x@y.zz')
    await l.page.click('form[data-wharton-form] button[type=submit]'); await l.page.waitForTimeout(400)
    check('B18 live: the success message does not promise "when classes are confirmed"', !/confirmed/.test(await l.page.locator('.form-success').first().innerText()) && await l.page.locator('.form-success.show').count() === 1)
    await l.ctx.close()
  }
}
SOON.server.close(); LIVE.server.close()

console.log(`\n${pass} passed, ${fail} failed`)
await browser.close()
process.exit(fail ? 1 : 0)
