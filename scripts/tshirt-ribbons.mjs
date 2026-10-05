// Builds the Rolling for Ribbons t-shirt art (Pink October, women's self defense seminar):
//   assets/print/tshirt/  FRONT = the pocket ribbon alone, 1.05in wide x 1.5in tall (2100x3000 px), BACK = the full design (4500x5400 = 15x18in at 300dpi),
//   each for dark shirts (white + pink ink) and light shirts (plum + magenta ink), as transparent PNGs,
//   plus a preview sheet showing the front and the back of each shirt colour.
// Run: node scripts/tshirt-ribbons.mjs   (needs playwright-core, resolved from the CRM repo when not installed here)
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { crc32 } from 'node:zlib'
import { ribbonSVG } from './ribbon-art.mjs'
const here = dirname(fileURLToPath(import.meta.url))
const req = createRequire(import.meta.url)
let chromium
try { ({ chromium } = req('playwright-core')) } catch { ({ chromium } = req('/home/user/labyrinth-app/node_modules/playwright-core')) }
const out = join(here, '..', 'assets', 'print', 'tshirt')
mkdirSync(out, { recursive: true })

// Writes the physical print size into a PNG (a pHYs chunk), so design software opens it at its true size.
function setPrintSize(file, widthInches) {
  const buf = readFileSync(file)
  const width = buf.readUInt32BE(16)
  const ppm = Math.round(width / widthInches / 0.0254)
  const data = Buffer.alloc(9); data.writeUInt32BE(ppm, 0); data.writeUInt32BE(ppm, 4); data[8] = 1
  const body = Buffer.concat([Buffer.from('pHYs'), data])
  const chunk = Buffer.alloc(12 + 9); chunk.writeUInt32BE(9, 0); body.copy(chunk, 4); chunk.writeUInt32BE(crc32(body), 17)
  writeFileSync(file, Buffer.concat([buf.subarray(0, 33), chunk, buf.subarray(33)]))
}

const b64 = (p, mime) => `data:${mime};base64,${readFileSync(p).toString('base64')}`
const anton = b64(join(here, 'fonts', 'anton-latin-400-normal.woff2'), 'font/woff2')
const oswald = b64(join(here, 'fonts', 'oswald-latin-700-normal.woff2'), 'font/woff2')
const logoJpg = b64(join(here, '..', 'assets', 'logo-maze.jpg'), 'image/jpeg')   // 625px black on white

const INK = {
  dark: { main: '#ffffff', accent: '#ee9bc0' },
  light: { main: '#3a0f25', accent: '#b0306b' },
}
const FONTS = `@font-face{font-family:Anton;src:url(${anton}) format('woff2')}@font-face{font-family:Oswald;font-weight:700;src:url(${oswald}) format('woff2')}`
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)).join(',')

// Fits a line of text to `w` px wide (never larger than data-max), so the lockup is the same width in any font.
// Also redraws the Labyrinth emblem crisp: the logo file is only 625px, so it is upscaled and thresholded into a
// 2400px single-colour shape instead of being stretched soft.
const SCRIPT = `<img id="lg" src="${logoJpg}" style="display:none"><script>
document.querySelectorAll('[data-fit]').forEach(e=>{const w=+e.dataset.fit,mx=+(e.dataset.max||9999);e.style.fontSize='100px';e.style.display='inline-block';
  const k=w/e.getBoundingClientRect().width;e.style.fontSize=Math.min(100*k,mx)+'px'});
const img=new Image();img.src=document.getElementById('lg').src;img.onload=()=>{
  const S=2400,c=document.createElement('canvas');c.width=c.height=S;const x=c.getContext('2d');x.imageSmoothingQuality='high';x.fillStyle='#fff';x.fillRect(0,0,S,S);x.drawImage(img,0,0,S,S);
  const d=x.getImageData(0,0,S,S),col=document.body.dataset.ink.split(',').map(Number);
  for(let i=0;i<d.data.length;i+=4){const l=d.data[i];let a=1-(l-90)/(170-90);a=a<0?0:a>1?1:a;a=a*a*(3-2*a);d.data[i]=col[0];d.data[i+1]=col[1];d.data[i+2]=col[2];d.data[i+3]=Math.round(a*255)}
  x.putImageData(d,0,0);const u=c.toDataURL('image/png');
  document.querySelectorAll('.emblem').forEach(e=>e.src=u);
  document.querySelectorAll('image.emblem-slot').forEach(e=>e.setAttribute('href',u));
  document.body.dataset.ready='1'}
</script>`

const BASE = c => `${FONTS}
  *{margin:0;box-sizing:border-box} body{display:flex;flex-direction:column;align-items:center;font-family:Oswald,sans-serif;color:${c.main};background:transparent}
  .t{font-family:Anton,sans-serif;text-transform:uppercase;line-height:1.02;white-space:nowrap}
  .a{color:${c.accent};font-weight:400}
  .s{font-weight:700;letter-spacing:.2em;text-transform:uppercase;white-space:nowrap}`

// BACK: the full design, 1500x1800 css px rendered at 3x = 4500x5400
function back(ink) {
  const c = INK[ink]
  return `<!doctype html><html><head><meta charset="utf-8"><style>${BASE(c)}
  html,body{width:1500px;height:1800px} body{padding-top:10px}
  .rib{width:560px;height:840px;flex:none}
  .rule{width:1300px;height:10px;background:${c.accent};border-radius:5px;margin:46px 0 40px;flex:none}
  .s{margin-top:22px}
</style></head><body data-ink="${hex(c.main)}">
  <div class="rib">${ribbonSVG(c.accent, { emblem: true, uid: 'b' })}</div>
  <div class="t" style="margin-top:14px"><span data-fit="1300" data-max="380">Rolling</span></div>
  <div class="t"><span data-fit="1300" data-max="300">for <b class="a">Ribbons</b></span></div>
  <div class="rule"></div>
  <div class="s"><span data-fit="1300" data-max="66">Women&rsquo;s Self Defense</span></div>
  <div class="s a" style="font-weight:700"><span data-fit="1300" data-max="50">Pink October 2026</span></div>
  <div class="s" style="opacity:.92"><span data-fit="1000" data-max="40">Labyrinth BJJ &middot; Fulshear, Texas</span></div>
  ${SCRIPT}</body></html>`
}

// FRONT: the pocket graphic, just the ribbon (plain, no emblem, so it stays clean at about 3in tall), 700x1000 css px at 3x = 2100x3000
function front(ink) {
  const c = INK[ink]
  return `<!doctype html><html><head><meta charset="utf-8"><style>${BASE(c)}
  html,body{width:700px;height:1000px} body{padding-top:0}
  .rib{width:667px;height:1000px;flex:none}
</style></head><body data-ink="${hex(c.main)}">
  <div class="rib">${ribbonSVG(c.accent, { uid: 'f' })}</div>
  ${SCRIPT}</body></html>`
}

const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/opt/pw-browsers/chromium' })
const shots = {}
for (const [name, html, vw, vh, scale] of [
  ['front-dark-shirt', front('dark'), 700, 1000, 3], ['front-light-shirt', front('light'), 700, 1000, 3],
  ['back-dark-shirt', back('dark'), 1500, 1800, 3], ['back-light-shirt', back('light'), 1500, 1800, 3],
]) {
  const ctx = await browser.newContext({ viewport: { width: vw, height: vh }, deviceScaleFactor: scale })
  const page = await ctx.newPage()
  await page.setContent(html, { waitUntil: 'load' })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForFunction(() => document.body.dataset.ready === '1')
  await page.waitForTimeout(300)
  const file = join(out, `rolling-for-ribbons-${name}.png`)
  await page.screenshot({ path: file, omitBackground: true })
  setPrintSize(file, name.startsWith('front') ? 1.05 : 15)
  shots[name] = file
  await ctx.close()
}

// Preview sheet: the front and the back of each shirt colour on a flat tee mockup.
const SHIRT = {
  front: (fill, shade) => `<svg viewBox="0 0 600 640" width="480" height="512"><path d="M205 30c20 22 48 34 95 34s75-12 95-34l130 52 56 120-86 36-28-48v394H133V190l-28 48-86-36 56-120z" fill="${fill}"/><path d="M205 30c20 40 48 58 95 58s75-18 95-58" fill="none" stroke="${shade}" stroke-width="10" stroke-linecap="round"/></svg>`,
  back: (fill, shade) => `<svg viewBox="0 0 600 640" width="480" height="512"><path d="M205 30c20 8 48 12 95 12s75-4 95-12l130 52 56 120-86 36-28-48v394H133V190l-28 48-86-36 56-120z" fill="${fill}"/><path d="M205 30c20 14 48 20 95 20s75-6 95-20" fill="none" stroke="${shade}" stroke-width="8" stroke-linecap="round"/></svg>`,
}
const img = p => `data:image/png;base64,${readFileSync(p).toString('base64')}`
const shirt = (side, label, fill, shade, art) => {
  const place = side === 'front' ? 'left:305px;top:122px;width:28px' : 'left:150px;top:96px;width:180px'   // chest mark on the wearer's left, full design across the back
  return `<figure style="margin:0;width:480px"><div style="position:relative">${SHIRT[side](fill, shade)}<img src="${img(art)}" style="position:absolute;${place}"></div><figcaption>${label}</figcaption></figure>`
}
const COLORS = [['Black', '#141414', '#2b2b2b', 'dark'], ['Soft pink', '#f4c9da', '#e6a9c3', 'light'], ['Plum', '#4a1733', '#6a2a4b', 'dark'], ['Heather grey', '#c9c9cc', '#aeaeb3', 'light']]
const cells = COLORS.map(([n, f, sh, ink]) => shirt('front', `${n}: FRONT (pocket ribbon)`, f, sh, shots[`front-${ink}-shirt`]) + shirt('back', `${n}: BACK (full design)`, f, sh, shots[`back-${ink}-shirt`])).join('\n')
const sheet = `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;padding:36px;background:#e9e6e8;font-family:Helvetica,Arial,sans-serif;display:flex;flex-wrap:wrap;gap:20px 24px;width:2060px}figcaption{text-align:center;font-weight:700;color:#444;margin-top:4px}</style></head><body>${cells}</body></html>`
const pg = await browser.newPage({ viewport: { width: 2060, height: 1200 } })
await pg.setContent(sheet, { waitUntil: 'load' })
await pg.waitForTimeout(500)
await pg.screenshot({ path: join(out, 'rolling-for-ribbons-tshirt-preview.png'), fullPage: true })
await browser.close()
console.log('wrote', out)
