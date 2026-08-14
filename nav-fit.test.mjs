/**
 * The nav must fit at every desktop width.
 *
 * It carries 12 links, a phone number and a CTA. The gap used to be
 * clamp(12px, 1.5vw, 32px) (scaled to the VIEWPORT) while .nav__inner stayed
 * capped at 1200px, so a wider monitor pushed the links further past the box:
 * 82px over at 1280, 176px at 1728. On a MacBook that reads as the nav bar
 * running off the page.
 *
 * This sweeps every desktop width and fails if the nav's children ever exceed
 * the space available to them.
 *
 *   npm i --no-save playwright-core && node nav-fit.test.mjs
 */
let chromium
try { ({ chromium } = await import('playwright-core')) }
catch { console.log('This test needs playwright-core:\n\n  npm i --no-save playwright-core\n'); process.exit(2) }
import { createServer } from 'node:http'
import { readFileSync, existsSync } from 'node:fs'
import { extname, join } from 'node:path'
const ROOT = new URL('.', import.meta.url).pathname.replace(/\/$/, '')
const T={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.ico':'image/x-icon'}
const server=createServer((req,res)=>{let p=decodeURIComponent(req.url.split('?')[0]);let f=join(ROOT,p)
  if(p.endsWith('/'))f=join(ROOT,p,'index.html'); if(!existsSync(f)&&existsSync(f+'.html'))f=f+'.html'
  if(!existsSync(f)){res.statusCode=404;res.end('');return}
  res.setHeader('content-type',T[extname(f)]??'application/octet-stream');res.end(readFileSync(f))})
await new Promise(r=>server.listen(4651,'127.0.0.1',r))
const browser=await chromium.launch({executablePath: process.env.CHROME ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-proxy-server']})
const ctx=await browser.newContext(); const page=await ctx.newPage()
let worst=null
for(let w=1261; w<=1920; w+=20){
  await page.setViewportSize({width:w,height:900})
  await page.goto('http://localhost:4651/',{waitUntil:'domcontentloaded'})
  await page.waitForTimeout(120)
  const r=await page.evaluate(()=>{
    const inner=document.querySelector('.nav__inner')
    const links=document.querySelector('.nav__links')
    if(getComputedStyle(links).display==='none') return null
    const avail=inner.clientWidth - parseFloat(getComputedStyle(inner).paddingLeft) - parseFloat(getComputedStyle(inner).paddingRight)
    const used=[...inner.children].reduce((a,c)=>a+c.getBoundingClientRect().width,0)
    return {avail:Math.round(avail), used:Math.round(used), slack:Math.round(avail-used)}
  })
  if(!r) continue
  if(!worst || r.slack<worst.slack) worst={w,...r}
  if(r.slack<0) console.log(`  ${w}px  OVERFLOW by ${-r.slack}px  (avail ${r.avail}, used ${r.used})`)
}
console.log(`\ntightest point: ${worst.w}px. ${worst.slack>=0?'fits with '+worst.slack+'px spare':'OVERFLOWS by '+(-worst.slack)+'px'}`)
await browser.close(); server.close()
process.exit(worst.slack >= 0 ? 0 : 1)
