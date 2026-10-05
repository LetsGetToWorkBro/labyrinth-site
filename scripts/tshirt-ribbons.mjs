// Builds the Rolling for Ribbons t-shirt art (Pink October, women's self defense seminar):
//   assets/print/tshirt/  front + back print files (transparent PNG, 4500x5400 = 15x18in at 300dpi)
//   for dark shirts (white + pink ink) and light shirts (plum + magenta ink), and a preview sheet on shirt mockups.
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
  dark: { main: '#ffffff', accent: '#ee9bc0', },
  light: { main: '#3a0f25', accent: '#b0306b' },
}
const FONTS = `@font-face{font-family:Anton;src:url(${anton}) format('woff2')}@font-face{font-family:Oswald;font-weight:700;src:url(${oswald}) format('woff2')}`
const RIBBON = '<path d="M12 14C8 11 7.5 9 7.5 6.8 7.5 4.6 9.5 3 12 3s4.5 1.6 4.5 3.8C16.5 9 16 11 12 14zM12 14 8 21M12 14l4 7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'

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
  x.putImageData(d,0,0);const u=c.toDataURL('image/png');document.querySelectorAll('.emblem').forEach(e=>e.src=u);document.body.dataset.ready='1'}
</script>`
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)).join(',')

function front(ink) {
  const c = INK[ink]
  return `<!doctype html><html><head><meta charset="utf-8"><style>${FONTS}
  *{margin:0;box-sizing:border-box} html,body{width:1500px;height:1800px;background:transparent}
  body{display:flex;flex-direction:column;align-items:center;font-family:Oswald,sans-serif;color:${c.main};padding-top:10px}
  .rib{position:relative;width:700px;height:720px;flex:none}
  .rib svg{position:absolute;inset:0;width:100%;height:100%;stroke:${c.accent};stroke-width:2.15;overflow:visible}
  .rib .emblem{position:absolute;left:36.6%;top:17.2%;width:27%;height:26.5%;object-fit:contain}
  .t{font-family:Anton,sans-serif;text-transform:uppercase;line-height:1.02;white-space:nowrap}
  .a{color:${c.accent};font-weight:400}
  .rule{width:1300px;height:10px;background:${c.accent};border-radius:5px;margin:46px 0 40px;flex:none}
  .s{font-weight:700;letter-spacing:.2em;text-transform:uppercase;white-space:nowrap;margin-top:22px}
</style></head><body data-ink="${hex(c.main)}">
  <div class="rib"><svg viewBox="1.6 0.9 20.8 21.2">${RIBBON}</svg><img class="emblem" alt=""></div>
  <div class="t"><span data-fit="1300" data-max="380">Rolling</span></div>
  <div class="t"><span data-fit="1300" data-max="300">for <b class="a">Ribbons</b></span></div>
  <div class="rule"></div>
  <div class="s"><span data-fit="1300" data-max="66">Women&rsquo;s Self Defense</span></div>
  <div class="s a" style="font-weight:700"><span data-fit="1300" data-max="50">Pink October 2026</span></div>
  <div class="s" style="opacity:.92"><span data-fit="1000" data-max="40">Labyrinth BJJ &middot; Fulshear, Texas</span></div>
  ${SCRIPT}</body></html>`
}

function back(ink) {
  const c = INK[ink]
  return `<!doctype html><html><head><meta charset="utf-8"><style>${FONTS}
  *{margin:0;box-sizing:border-box} html,body{width:1500px;height:1800px;background:transparent}
  body{display:flex;flex-direction:column;align-items:center;font-family:Oswald,sans-serif;color:${c.main};padding-top:20px}
  .rib{width:360px;height:370px;flex:none;stroke:${c.accent};stroke-width:2.15}
  .t{font-family:Anton,sans-serif;text-transform:uppercase;line-height:1.02;white-space:nowrap}
  .a{color:${c.accent}}
  .rule{width:1300px;height:10px;background:${c.accent};border-radius:5px;margin:60px 0 50px;flex:none}
  .s{font-weight:700;letter-spacing:.24em;text-transform:uppercase;white-space:nowrap;margin-top:24px}
</style></head><body data-ink="${hex(c.main)}">
  <svg class="rib" viewBox="1.6 0.9 20.8 21.2">${RIBBON}</svg>
  <div class="t" style="margin-top:30px"><span data-fit="1300" data-max="420">Strong</span></div>
  <div class="t a"><span data-fit="1300" data-max="420">Together</span></div>
  <div class="rule"></div>
  <img class="emblem" alt="" style="width:330px;height:330px;flex:none">
  <div class="s" style="margin-top:40px"><span data-fit="1100" data-max="76">Labyrinth BJJ</span></div>
  <div class="s a"><span data-fit="1100" data-max="46">Self defense for women</span></div>
  ${SCRIPT}</body></html>`
}

const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/opt/pw-browsers/chromium' })
const ctx = await browser.newContext({ viewport: { width: 1500, height: 1800 }, deviceScaleFactor: 3 })
const shots = {}
for (const [name, html] of [['front-dark-shirt', front('dark')], ['front-light-shirt', front('light')], ['back-dark-shirt', back('dark')], ['back-light-shirt', back('light')]]) {
  const page = await ctx.newPage()
  await page.setContent(html, { waitUntil: 'load' })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForFunction(() => document.body.dataset.ready === '1')
  await page.waitForTimeout(300)
  await page.screenshot({ path: join(out, `rolling-for-ribbons-${name}.png`), omitBackground: true })
  shots[name] = join(out, `rolling-for-ribbons-${name}.png`)
  await page.close()
}

// Preview sheet: the art on shirt mockups (a simple flat tee), so the owner can see it as worn.
const tee = (fill, shade) => `<svg viewBox="0 0 600 640" width="600" height="640"><path d="M205 30c20 22 48 34 95 34s75-12 95-34l130 52 56 120-86 36-28-48v394H133V190l-28 48-86-36 56-120z" fill="${fill}"/><path d="M205 30c20 40 48 58 95 58s75-18 95-58" fill="none" stroke="${shade}" stroke-width="10" stroke-linecap="round"/></svg>`
const img = p => `data:image/png;base64,${readFileSync(p).toString('base64')}`
const card = (label, fill, shade, art) => `<figure style="margin:0;position:relative;width:600px"><div style="position:relative">${tee(fill, shade)}<img src="${img(art)}" style="position:absolute;left:170px;top:130px;width:260px"></div><figcaption>${label}</figcaption></figure>`
const sheet = `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;padding:40px;background:#e9e6e8;font-family:Helvetica,Arial,sans-serif;display:flex;flex-wrap:wrap;gap:30px;width:1920px}figcaption{text-align:center;font-weight:700;color:#444;margin-top:6px}</style></head><body>
${card('Front, black shirt', '#141414', '#2b2b2b', shots['front-dark-shirt'])}
${card('Back, black shirt', '#141414', '#2b2b2b', shots['back-dark-shirt'])}
${card('Front, soft pink shirt', '#f4c9da', '#e6a9c3', shots['front-light-shirt'])}
${card('Front, heather grey shirt', '#c9c9cc', '#aeaeb3', shots['front-light-shirt'])}
${card('Back, soft pink shirt', '#f4c9da', '#e6a9c3', shots['back-light-shirt'])}
${card('Front, plum shirt', '#4a1733', '#6a2a4b', shots['front-dark-shirt'])}
</body></html>`
const pg = await browser.newPage({ viewport: { width: 1920, height: 1500 } })
await pg.setContent(sheet, { waitUntil: 'load' })
await pg.waitForTimeout(400)
await pg.screenshot({ path: join(out, 'rolling-for-ribbons-tshirt-preview.png'), fullPage: true })
await browser.close()
console.log('wrote', out)
