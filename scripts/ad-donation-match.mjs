// The donation-only post for Rolling for Ribbons: two anonymous donors each match every dollar raised, up to the $500 goal,
// so $500 from the community becomes $1,500 for a family affected by breast cancer.
//   assets/social/donation-match-feed.png    1080x1350 (4:5, Facebook and Instagram feed)
//   assets/social/donation-match-story.png   1080x1920 (9:16, Stories and Reels; everything that matters sits between 270px and 1580px, clear of the Stories header and reply bar)
//   assets/og-donate.jpg                     1200x630 (the preview card when labyrinth.vision/donate is shared; the donation page names it)
// Run: node scripts/ad-donation-match.mjs   (needs playwright-core, resolved from the CRM repo when not installed here)
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { mkdirSync, readFileSync } from 'node:fs'
import { ribbonSVG } from './ribbon-art.mjs'
const here = dirname(fileURLToPath(import.meta.url))
const req = createRequire(import.meta.url)
let chromium
try { ({ chromium } = req('playwright-core')) } catch { ({ chromium } = req('/home/user/labyrinth-app/node_modules/playwright-core')) }
const out = join(here, '..', 'assets', 'social')
mkdirSync(out, { recursive: true })

const b64 = (p, mime) => `data:${mime};base64,${readFileSync(p).toString('base64')}`
const anton = b64(join(here, 'fonts', 'anton-latin-400-normal.woff2'), 'font/woff2')
const oswald = b64(join(here, 'fonts', 'oswald-latin-700-normal.woff2'), 'font/woff2')

const PLUM = '#2a0f1c', PINK = '#e58fb5', MAG = '#b0306b', SOFT = '#ffe3ee'
const URL_TEXT = 'labyrinth.vision/donate'

const CSS = `
@font-face{font-family:Anton;src:url(${anton}) format('woff2')}@font-face{font-family:Oswald;font-weight:700;src:url(${oswald}) format('woff2')}
*{margin:0;box-sizing:border-box}
body{width:1080px;position:relative;overflow:hidden;font-family:Oswald,sans-serif;color:#fff;
  background:radial-gradient(110% 55% at 82% 0%, #7a2650 0%, #46142d 40%, #2a0f1c 78%, #1c0a13 100%)}
.wm{position:absolute;opacity:.10;transform:rotate(14deg);-webkit-mask-image:linear-gradient(#000 35%,transparent 80%);mask-image:linear-gradient(#000 35%,transparent 80%)}
.wm svg{width:100%;height:auto;display:block}
.abs{position:absolute;left:70px;right:70px}
.kick{display:flex;align-items:center;gap:16px;font-size:28px;letter-spacing:.22em;text-transform:uppercase;color:${PINK}}
.kick .ico{width:30px;flex:none}.kick .ico svg{width:100%;height:auto;display:block}
.kick .chip{margin-left:auto;background:${PINK};color:${PLUM};border-radius:999px;padding:8px 22px 7px;font-size:24px;letter-spacing:.14em}
.h{font-family:Anton,sans-serif;text-transform:uppercase;line-height:.92}
.h .a{display:block;color:#fff}
.h .b{display:block;color:${PINK}}
.sub{font-size:38px;line-height:1.28;color:${SOFT}}
.sub b{color:#fff}
.eq{display:flex;align-items:stretch;justify-content:space-between}
.card{flex:1;border-radius:26px;text-align:center;display:flex;flex-direction:column;justify-content:center}
.card .l{font-size:25px;letter-spacing:.14em;text-transform:uppercase}
.card .n{font-family:Anton,sans-serif;line-height:1}
.c1{background:${PINK};color:${PLUM}}
.c2,.c3{border:4px solid ${PINK};background:rgba(255,255,255,.07);color:#fff}
.c2 .l,.c3 .l{color:${PINK}}
.plus{font-family:Anton,sans-serif;color:${PINK};display:flex;align-items:center;justify-content:center}
.total{background:#fff7fa;color:${PLUM};border-radius:30px;display:flex;align-items:center;justify-content:center;gap:26px}
.total .eqs{font-family:Anton,sans-serif;color:${MAG}}
.total .t{font-family:Anton,sans-serif;color:${PLUM};line-height:1}
.total .u{font-size:26px;letter-spacing:.12em;text-transform:uppercase;color:${MAG};line-height:1.25}
.for{font-size:31px;line-height:1.3;text-align:center;color:${SOFT}}
.cta{display:flex;align-items:center;gap:30px}
.btn{background:${PINK};color:${PLUM};border-radius:999px;font-family:Anton,sans-serif;letter-spacing:.04em;text-transform:uppercase;white-space:nowrap}
.url{font-size:36px;line-height:1.2;letter-spacing:.04em}
.url small{display:block;margin-top:4px;font-size:25px;letter-spacing:.1em;text-transform:uppercase;color:${PINK}}
.foot{display:flex;justify-content:space-between;font-size:25px;letter-spacing:.16em;text-transform:uppercase;color:#cfb5c2}
`

const feed = () => `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}
body{height:1350px}
.wm{right:-110px;top:90px;width:520px}
.kick{top:62px}
.h{top:122px}
.h .a{font-size:300px}
.h .b{font-size:140px;margin-top:-2px}
.sub{top:546px}
.eq{top:656px;height:190px}
.card .n{font-size:98px;margin-top:2px}
.plus{width:56px;font-size:70px}
.total{top:866px;height:122px}
.total .eqs{font-size:92px}
.total .t{font-size:112px}
.for{top:1012px}
.cta{top:1084px}
.btn{font-size:60px;padding:24px 54px 22px}
.foot{bottom:40px}
</style></head><body>
  <div class="wm">${ribbonSVG('#ffffff', { uid: 'wf' })}</div>
  <div class="abs kick" style="position:absolute"><span class="ico">${ribbonSVG(PINK, { uid: 'kf' })}</span><span>Rolling for Ribbons</span><span class="chip">Matching gift</span></div>
  <div class="abs h" style="position:absolute"><span class="a">Triple</span><span class="b">your gift</span></div>
  <div class="abs sub" style="position:absolute">Two anonymous donors will <b>each match every dollar</b> we raise, up to our $500 goal.</div>
  <div class="abs eq" style="position:absolute">
    <div class="card c1"><span class="l">We raise</span><span class="n">$500</span></div>
    <div class="plus">+</div>
    <div class="card c2"><span class="l">Donor 1 matches</span><span class="n">$500</span></div>
    <div class="plus">+</div>
    <div class="card c3"><span class="l">Donor 2 matches</span><span class="n">$500</span></div>
  </div>
  <div class="abs total" style="position:absolute"><span class="eqs">=</span><span class="t">$1,500</span><span class="u">for a family<br>affected by breast cancer</span></div>
  <div class="abs for" style="position:absolute">Every gift goes directly to the family.</div>
  <div class="abs cta" style="position:absolute"><div class="btn">Give now &rarr;</div><div class="url">${URL_TEXT}<small>Any amount counts</small></div></div>
  <div class="abs foot" style="position:absolute"><span>Labyrinth BJJ &middot; Fulshear, TX</span><span>Pink October</span></div>
</body></html>`

const story = () => `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}
body{height:1920px}
.wm{right:-150px;top:470px;width:600px}
.kick{top:272px}
.h{top:330px}
.h .a{font-size:270px}
.h .b{font-size:128px;margin-top:-2px}
.sub{top:716px;font-size:38px}
.eq{top:842px;flex-direction:column;gap:0}
.card{flex:none;height:100px;flex-direction:row;justify-content:space-between;align-items:center;padding:0 40px}
.card .l{font-size:29px;text-align:left}
.card .n{font-size:76px}
.plus{height:38px;font-size:46px}
.total{top:1244px;height:108px}
.total .eqs{font-size:78px}
.total .t{font-size:98px}
.total .u{font-size:24px}
.for{top:1372px;font-size:30px}
.cta{top:1462px;justify-content:center}
.btn{font-size:54px;padding:20px 46px 18px}
.url{font-size:32px}
.url small{font-size:22px}
</style></head><body>
  <div class="wm">${ribbonSVG('#ffffff', { uid: 'ws' })}</div>
  <div class="abs kick" style="position:absolute"><span class="ico">${ribbonSVG(PINK, { uid: 'ks' })}</span><span>Rolling for Ribbons</span><span class="chip">Matching gift</span></div>
  <div class="abs h" style="position:absolute"><span class="a">Triple</span><span class="b">your gift</span></div>
  <div class="abs sub" style="position:absolute">Two anonymous donors will <b>each match every dollar</b> we raise, up to our $500 goal.</div>
  <div class="abs eq" style="position:absolute">
    <div class="card c1"><span class="l">We raise</span><span class="n">$500</span></div>
    <div class="plus">+</div>
    <div class="card c2"><span class="l">Donor 1 matches</span><span class="n">$500</span></div>
    <div class="plus">+</div>
    <div class="card c3"><span class="l">Donor 2 matches</span><span class="n">$500</span></div>
  </div>
  <div class="abs total" style="position:absolute"><span class="eqs">=</span><span class="t">$1,500</span><span class="u">for a family<br>affected by breast cancer</span></div>
  <div class="abs for" style="position:absolute">Every gift goes directly to the family.</div>
  <div class="abs cta" style="position:absolute"><div class="btn">Give now &rarr;</div><div class="url">${URL_TEXT}<small>Any amount counts</small></div></div>
</body></html>`

const og = () => `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}
body{width:1200px;height:630px}
.wm{right:-120px;top:-60px;width:560px}
.kick{left:60px;right:auto;top:42px;font-size:26px;gap:14px}
.kick .ico{width:26px}
.h{left:60px;right:auto;top:88px}
.h .a{font-size:200px}
.h .b{font-size:98px;margin-top:-4px}
.sub{left:60px;right:auto;width:580px;top:392px;font-size:31px;line-height:1.26}
.col{left:690px;right:60px;top:56px;display:flex;flex-direction:column}
.col .card{flex:none;height:82px;flex-direction:row;justify-content:space-between;align-items:center;padding:0 30px}
.col .card .l{font-size:25px;text-align:left}
.col .card .n{font-size:62px}
.col .plus{height:36px;font-size:42px}
.col .total{position:static;height:138px;margin-top:8px;flex-direction:column;gap:0;border-radius:26px;padding:0 8px}
.col .total .t{font-size:84px;display:block}
.col .total .eqs{font-size:84px}
.col .total .tt{display:flex;align-items:center;justify-content:center;gap:20px;line-height:1}
.col .total .u{font-size:18px;letter-spacing:.07em;margin-top:8px;white-space:nowrap;text-align:center;line-height:1}
.cta{left:60px;right:auto;top:520px}
.btn{font-size:48px;padding:18px 44px 16px}
.url{font-size:32px}
.url small{font-size:22px}
</style></head><body>
  <div class="wm">${ribbonSVG('#ffffff', { uid: 'wo' })}</div>
  <div class="abs kick" style="position:absolute"><span class="ico">${ribbonSVG(PINK, { uid: 'ko' })}</span><span>Rolling for Ribbons</span></div>
  <div class="abs h" style="position:absolute"><span class="a">Triple</span><span class="b">your gift</span></div>
  <div class="abs sub" style="position:absolute">Two anonymous donors will <b>each match every dollar</b> we raise, up to our $500 goal.</div>
  <div class="abs col" style="position:absolute">
    <div class="card c1"><span class="l">We raise</span><span class="n">$500</span></div>
    <div class="plus">+</div>
    <div class="card c2"><span class="l">Donor 1 matches</span><span class="n">$500</span></div>
    <div class="plus">+</div>
    <div class="card c3"><span class="l">Donor 2 matches</span><span class="n">$500</span></div>
    <div class="total"><div class="tt"><span class="eqs">=</span><span class="t">$1,500</span></div><span class="u">for a family affected by breast cancer</span></div>
  </div>
  <div class="abs cta" style="position:absolute"><div class="btn">Give now &rarr;</div><div class="url">${URL_TEXT}<small>Any amount counts</small></div></div>
</body></html>`

const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/opt/pw-browsers/chromium' })
for (const [file, w, h, html, jpeg] of [
  [join(out, 'donation-match-feed.png'), 1080, 1350, feed()],
  [join(out, 'donation-match-story.png'), 1080, 1920, story()],
  [join(out, '..', 'og-donate.jpg'), 1200, 630, og(), true],
]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } })
  await page.setContent(html, { waitUntil: 'load' })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(300)
  await page.screenshot(jpeg ? { path: file, type: 'jpeg', quality: 90 } : { path: file })
  console.log('wrote ' + file.replace(join(here, '..') + '/', ''))
  await page.close()
}
await browser.close()
