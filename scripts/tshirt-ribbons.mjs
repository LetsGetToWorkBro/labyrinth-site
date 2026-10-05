// Builds the Rolling for Ribbons t-shirt art (Pink October, women's self defense seminar):
//   assets/print/tshirt/  FRONT = small chest mark (2400x3000), BACK = the full design (4500x5400 = 15x18in at 300dpi),
//   each for dark shirts (white + pink ink) and light shirts (plum + magenta ink), as transparent PNGs,
//   plus a preview sheet showing the front and the back of each shirt colour.
// Run: node scripts/tshirt-ribbons.mjs   (needs playwright-core, resolved from the CRM repo when not installed here)
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
const here = dirname(fileURLToPath(import.meta.url))
const req = createRequire(import.meta.url)
let chromium
try { ({ chromium } = req('playwright-core')) } catch { ({ chromium } = req('/home/user/labyrinth-app/node_modules/playwright-core')) }
const out = join(here, '..', 'assets', 'print', 'tshirt')
mkdirSync(out, { recursive: true })

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

/**
 * The awareness ribbon, drawn as a real folded ribbon rather than a line icon: two strands of one width that
 * cross at the waist (the right-hand strand passes over, with a thin gap cut out of the one underneath), a
 * round loop at the top, and tails cut with a swallowtail notch. One colour, so it prints as one screen.
 * viewBox 0 0 200 300. With `emblem`, the Labyrinth maze sits inside the loop (the page script fills <img class="emblem">).
 */
function ribbonSVG(color, { emblem = false, uid = 'r' } = {}) {
  const W = 30                                    // ribbon width
  const GAP = 5                                   // the cut-out around the strand that passes over
  const segs = [[[42, 286], [62, 248], [84, 206], [100, 176]], [[100, 176], [124, 134], [152, 120], [152, 84]], [[152, 84], [152, 44], [128, 22], [100, 22]]]
  const R = 'M 42 286 C 62 248 84 206 100 176 C 124 134 152 120 152 84 C 152 44 128 22 100 22'
  const L = 'M 158 286 C 138 248 116 206 100 176 C 76 134 48 120 48 84 C 48 44 72 22 100 22'
  // Everything below is vector clipping (not SVG masks, which the browser rasterises at screen size and softens at print size).
  const big = 'M -20 -20 H 220 V 320 H -20 Z'
  const bez = ([p0, p1, p2, p3], t) => {
    const u = 1 - t
    const pt = [0, 1].map(k => u * u * u * p0[k] + 3 * u * u * t * p1[k] + 3 * u * t * t * p2[k] + t * t * t * p3[k])
    const d = [0, 1].map(k => 3 * u * u * (p1[k] - p0[k]) + 6 * u * t * (p2[k] - p1[k]) + 3 * t * t * (p3[k] - p2[k]))
    const m = Math.hypot(d[0], d[1])
    return { pt, n: [-d[1] / m, d[0] / m] }
  }
  // swallowtail notch at each tail end: a polygon biting into the end of the strand, overshooting the end so no sliver is left
  const notch = (ex, ey, dx, dy) => {
    const m = Math.hypot(dx, dy), ux = dx / m, uy = dy / m, nx = -uy, ny = ux, hw = W / 2 + 3, back = 8
    const P = [[ex + nx * hw - ux * back, ey + ny * hw - uy * back], [ex + nx * hw, ey + ny * hw], [ex + ux * W * 0.95, ey + uy * W * 0.95], [ex - nx * hw, ey - ny * hw], [ex - nx * hw - ux * back, ey - ny * hw - uy * back]]
    return 'M ' + P.map(q => q.map(v => v.toFixed(2)).join(' ')).join(' L ') + ' Z'
  }
  const notches = notch(42, 286, 20, -38) + ' ' + notch(158, 286, -20, -38)
  // the band around the over-strand, near the crossing, expanded by GAP: cut out of the under-strand
  const left = [], right = []
  for (const sg of segs.slice(0, 2)) for (let k = 0; k <= 60; k++) {
    const { pt, n } = bez(sg, k / 60)
    if (Math.hypot(pt[0] - 100, pt[1] - 176) > 46) continue
    const h = W / 2 + GAP
    left.push([pt[0] + n[0] * h, pt[1] + n[1] * h]); right.push([pt[0] - n[0] * h, pt[1] - n[1] * h])
  }
  const band = 'M ' + left.concat(right.reverse()).map(q => q.map(v => v.toFixed(2)).join(' ')).join(' L ') + ' Z'
  const img = emblem ? '<image class="emblem-slot" x="68" y="48" width="64" height="64"/>' : ''
  return `<svg viewBox="0 0 200 300" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="${color}">
  <defs>
    <clipPath id="${uid}r" clip-rule="evenodd"><path clip-rule="evenodd" d="${big} ${notches}"/></clipPath>
    <clipPath id="${uid}l" clip-rule="evenodd"><path clip-rule="evenodd" d="${big} ${notches} ${band}"/></clipPath>
  </defs>
  <g stroke-width="${W}" stroke-linecap="butt" stroke-linejoin="round">
    <path d="${L}" clip-path="url(#${uid}l)"/>
    <path d="${R}" clip-path="url(#${uid}r)"/>
  </g>${img}
</svg>`
}

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

// FRONT: a small chest mark, 1000x1250 css px rendered at 2x = 2000x2500 (prints at about 4in wide)
function front(ink) {
  const c = INK[ink]
  return `<!doctype html><html><head><meta charset="utf-8"><style>${BASE(c)}
  html,body{width:1000px;height:1250px} body{padding-top:10px}
  .rib{width:440px;height:660px;flex:none}
</style></head><body data-ink="${hex(c.main)}">
  <div class="rib">${ribbonSVG(c.accent, { emblem: true, uid: 'f' })}</div>
  <div class="t" style="margin-top:10px"><span data-fit="880" data-max="260">Rolling</span></div>
  <div class="t"><span data-fit="880" data-max="200">for <b class="a">Ribbons</b></span></div>
  <div class="s" style="margin-top:30px;opacity:.92"><span data-fit="620" data-max="36">Labyrinth BJJ</span></div>
  ${SCRIPT}</body></html>`
}

const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/opt/pw-browsers/chromium' })
const shots = {}
for (const [name, html, vw, vh, scale] of [
  ['front-dark-shirt', front('dark'), 1000, 1250, 2], ['front-light-shirt', front('light'), 1000, 1250, 2],
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
  const place = side === 'front' ? 'left:268px;top:118px;width:96px' : 'left:150px;top:96px;width:180px'   // chest mark on the wearer's left, full design across the back
  return `<figure style="margin:0;width:480px"><div style="position:relative">${SHIRT[side](fill, shade)}<img src="${img(art)}" style="position:absolute;${place}"></div><figcaption>${label}</figcaption></figure>`
}
const COLORS = [['Black', '#141414', '#2b2b2b', 'dark'], ['Soft pink', '#f4c9da', '#e6a9c3', 'light'], ['Plum', '#4a1733', '#6a2a4b', 'dark'], ['Heather grey', '#c9c9cc', '#aeaeb3', 'light']]
const cells = COLORS.map(([n, f, sh, ink]) => shirt('front', `${n}: FRONT (chest mark)`, f, sh, shots[`front-${ink}-shirt`]) + shirt('back', `${n}: BACK (full design)`, f, sh, shots[`back-${ink}-shirt`])).join('\n')
const sheet = `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;padding:36px;background:#e9e6e8;font-family:Helvetica,Arial,sans-serif;display:flex;flex-wrap:wrap;gap:20px 24px;width:2060px}figcaption{text-align:center;font-weight:700;color:#444;margin-top:4px}</style></head><body>${cells}</body></html>`
const pg = await browser.newPage({ viewport: { width: 2060, height: 1200 } })
await pg.setContent(sheet, { waitUntil: 'load' })
await pg.waitForTimeout(500)
await pg.screenshot({ path: join(out, 'rolling-for-ribbons-tshirt-preview.png'), fullPage: true })
await browser.close()
console.log('wrote', out)
