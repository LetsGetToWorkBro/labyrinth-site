// The "we hit the goal" post for Rolling for Ribbons: the $500 goal is reached, so both anonymous donors' matches are unlocked and
// $500 from the community becomes $1,500 for a family affected by breast cancer. Same look as the matching-gift post it follows
// (donation-match-feed.png), so the two read as a pair on the page.
//   assets/social/goal-reached-feed.png    1080x1350 (4:5, Facebook and Instagram feed)
//   assets/social/goal-reached-story.png   1080x1920 (9:16, Stories; everything that matters sits between 270px and 1580px, clear of the
//                                          Stories header and reply bar)
// Facts are the ones the donation page already states once the goal is reached: nothing about who the donors are, no donor names,
// no total beyond the $500 goal (new gifts keep arriving, and an image does not update).
// Run: node scripts/post-goal-reached.mjs   (needs playwright-core, resolved from the CRM repo when not installed here)
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { mkdirSync, readFileSync } from 'node:fs'
import { ribbonSVG } from './ribbon-art.mjs'
const here = dirname(fileURLToPath(import.meta.url))
const req = createRequire(import.meta.url)
let chromium
try { ({ chromium } = req('playwright-core')) } catch { ({ chromium } = req('/home/user/labyrinth-app/node_modules/playwright-core')) }
const out = process.env.OUT_DIR ?? join(here, '..', 'assets', 'social')
mkdirSync(out, { recursive: true })

const b64 = (p, mime) => `data:${mime};base64,${readFileSync(p).toString('base64')}`
const anton = b64(join(here, 'fonts', 'anton-latin-400-normal.woff2'), 'font/woff2')
const oswald = b64(join(here, 'fonts', 'oswald-latin-700-normal.woff2'), 'font/woff2')

const PLUM = '#2a0f1c', PINK = '#e58fb5', MAG = '#b0306b', SOFT = '#ffe3ee'
const RSVP_URL = 'labyrinth.vision/self-defense-for-women'
const CHECK = (c, bg) => `<svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="${bg}"/><path d="M6.4 12.6l3.7 3.7 7.5-8.2" fill="none" stroke="${c}" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`

const CSS = `
@font-face{font-family:Anton;src:url(${anton}) format('woff2')}@font-face{font-family:Oswald;font-weight:700;src:url(${oswald}) format('woff2')}
*{margin:0;box-sizing:border-box}
body{width:1080px;position:relative;overflow:hidden;font-family:Oswald,sans-serif;color:#fff;
  background:radial-gradient(110% 55% at 82% 0%, #7a2650 0%, #46142d 40%, #2a0f1c 78%, #1c0a13 100%)}
.wm{position:absolute;opacity:.10;transform:rotate(14deg);-webkit-mask-image:linear-gradient(#000 35%,transparent 80%);mask-image:linear-gradient(#000 35%,transparent 80%)}
.wm svg{width:100%;height:auto;display:block}
.abs{position:absolute;left:70px;right:70px}
.kick{display:flex;align-items:center;gap:16px;font-size:28px;letter-spacing:.22em;text-transform:uppercase;color:${PINK};white-space:nowrap}
.kick .ico{width:30px;flex:none}.kick .ico svg{width:100%;height:auto;display:block}
.kick .chip{margin-left:auto;background:${PINK};color:${PLUM};border-radius:999px;padding:8px 22px 7px;font-size:24px;letter-spacing:.14em}
.h{font-family:Anton,sans-serif;text-transform:uppercase;line-height:.92;white-space:nowrap}
.h .a{display:block;color:#fff}
.h .b{display:flex;align-items:center;gap:22px;color:${PINK}}
.h .b i{display:block;flex:none}
.sub{font-size:38px;line-height:1.28;color:${SOFT}}
.sub b{color:#fff}
.eq{display:flex;align-items:stretch;justify-content:space-between}
.card{flex:1;border-radius:26px;text-align:center;display:flex;flex-direction:column;justify-content:center;position:relative}
.card .l{font-size:25px;letter-spacing:.14em;text-transform:uppercase}
.card .n{font-family:Anton,sans-serif;line-height:1}
.card .ck{position:absolute;right:14px;top:12px;width:40px;height:40px}
.c1{background:${PINK};color:${PLUM}}
.c2,.c3{border:4px solid ${PINK};background:rgba(255,255,255,.07);color:#fff}
.c2 .l,.c3 .l{color:${PINK}}
.plus{font-family:Anton,sans-serif;color:${PINK};display:flex;align-items:center;justify-content:center}
.total{background:#fff7fa;color:${PLUM};border-radius:30px;display:flex;align-items:center;justify-content:center;gap:26px;white-space:nowrap}
.total .eqs{font-family:Anton,sans-serif;color:${MAG}}
.total .t{font-family:Anton,sans-serif;color:${PLUM};line-height:1}
.total .u{font-size:26px;letter-spacing:.12em;text-transform:uppercase;color:${MAG};line-height:1.25}
.thanks{font-size:31px;line-height:1.3;text-align:center;color:${SOFT}}
.thanks b{color:#fff}
.cta{display:flex;align-items:center;gap:30px}
.btn{background:${PINK};color:${PLUM};border-radius:999px;font-family:Anton,sans-serif;letter-spacing:.04em;text-transform:uppercase;white-space:nowrap}
.url{font-size:34px;line-height:1.2;letter-spacing:.03em;white-space:nowrap}
.url small{display:block;margin-top:4px;font-size:25px;letter-spacing:.1em;text-transform:uppercase;color:${PINK}}
.foot{display:flex;justify-content:space-between;font-size:25px;letter-spacing:.16em;text-transform:uppercase;color:#cfb5c2;white-space:nowrap}
`

const body = (uid) => `
  <div class="wm">${ribbonSVG('#ffffff', { uid: 'w' + uid })}</div>
  <div class="abs kick" style="position:absolute"><span class="ico">${ribbonSVG(PINK, { uid: 'k' + uid })}</span><span>Rolling for Ribbons</span><span class="chip">Goal reached</span></div>
  <div class="abs h" style="position:absolute"><span class="a">We did it</span><span class="b"><i class="ckh">${CHECK(PLUM, PINK)}</i><span>$500 goal hit</span></span></div>
  <div class="abs sub" style="position:absolute">Our community gave, and <b>both matches are unlocked.</b></div>
  <div class="abs eq" style="position:absolute">
    <div class="card c1"><span class="ck">${CHECK(PINK, PLUM)}</span><span class="l">We raised</span><span class="n">$500</span></div>
    <div class="plus">+</div>
    <div class="card c2"><span class="ck">${CHECK(PLUM, PINK)}</span><span class="l">Donor 1 matches</span><span class="n">$500</span></div>
    <div class="plus">+</div>
    <div class="card c3"><span class="ck">${CHECK(PLUM, PINK)}</span><span class="l">Donor 2 matches</span><span class="n">$500</span></div>
  </div>
  <div class="abs total" style="position:absolute"><span class="eqs">=</span><span class="t">$1,500</span><span class="u">for a family<br>affected by breast cancer</span></div>
  <div class="abs thanks" style="position:absolute"><b>Thank you, Fulshear.</b> Every gift goes directly to the family.</div>`

const feed = () => `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}
body{height:1350px}
.wm{right:-110px;top:90px;width:520px}
.kick{top:62px}
.h{top:122px}
.h .a{font-size:262px}
.h .b{font-size:122px;margin-top:6px}
.h .b i{width:96px;height:96px}
.sub{top:504px}
.eq{top:612px;height:190px}
.card .n{font-size:98px;margin-top:2px}
.card .ck{top:-22px;right:auto;left:50%;margin-left:-20px}
.plus{width:56px;font-size:70px}
.total{top:824px;height:122px}
.total .eqs{font-size:92px}
.total .t{font-size:112px}
.thanks{top:972px}
.cta{top:1062px;gap:24px}
.btn{font-size:48px;padding:20px 42px 18px}
.url{font-size:30px}
.url small{font-size:21px}
.foot{bottom:40px}
</style></head><body>${body('f')}
  <div class="abs cta" style="position:absolute"><div class="btn">RSVP free &rarr;</div><div class="url">${RSVP_URL}<small>Free seminar &middot; Sat, Oct 24</small></div></div>
  <div class="abs foot" style="position:absolute"><span>Labyrinth BJJ &middot; Fulshear, TX</span><span>Pink October</span></div>
</body></html>`

const story = () => `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}
body{height:1920px}
.wm{right:-150px;top:470px;width:600px}
.kick{top:272px}
.h{top:330px}
.h .a{font-size:236px}
.h .b{font-size:112px;margin-top:6px}
.h .b i{width:88px;height:88px}
.sub{top:690px;font-size:38px}
.eq{top:812px;flex-direction:column;gap:0}
.card{flex:none;height:100px;flex-direction:row;justify-content:space-between;align-items:center;padding:0 40px}
.card .l{font-size:29px;text-align:left}
.card .n{font-size:76px;margin-right:62px}
.card .ck{top:30px;right:20px}
.plus{height:38px;font-size:46px}
.total{top:1214px;height:108px}
.total .eqs{font-size:78px}
.total .t{font-size:98px}
.total .u{font-size:24px}
.thanks{top:1346px;font-size:30px}
.cta{top:1424px;justify-content:center;gap:24px}
.btn{font-size:48px;padding:20px 42px 18px}
.url{font-size:30px}
.url small{font-size:21px}
</style></head><body>${body('s')}
  <div class="abs cta" style="position:absolute"><div class="btn">RSVP free &rarr;</div><div class="url">${RSVP_URL}<small>Free seminar &middot; Sat, Oct 24</small></div></div>
</body></html>`

const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/opt/pw-browsers/chromium' })
let bad = 0
for (const [name, w, h, html, safe] of [
  ['goal-reached-feed.png', 1080, 1350, feed(), null],
  ['goal-reached-story.png', 1080, 1920, story(), [270, 1580]],
]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } })
  await page.setContent(html, { waitUntil: 'load' })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(300)
  // The picture is a fixed size, so anything that does not fit is cut off or runs into its neighbour without a word: say so instead.
  const problems = await page.evaluate(({ w, safe }) => {
    const out = [], q = s => document.querySelector(s)
    const name = el => el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className ? '.' + el.className.split(' ')[0] : '')
    for (const el of document.querySelectorAll('.abs, .abs *')) {
      const r = el.getBoundingClientRect()
      if (!r.width || !r.height || el.closest('svg') || el.closest('.wm')) continue
      if (r.right > w - 70 + 0.5) out.push(`${name(el)} runs to ${Math.round(r.right)}px (right margin is ${w - 70}px)`)
      if (r.left < 70 - 0.5) out.push(`${name(el)} starts at ${Math.round(r.left)}px (left margin is 70px)`)
    }
    for (const el of document.querySelectorAll('.kick, .h .a, .h .b, .sub, .card, .total, .thanks, .url, .btn, .foot')) {
      if (el.scrollWidth > el.clientWidth + 1) out.push(`${name(el)} is wider than its box (${el.scrollWidth} > ${el.clientWidth})`)
    }
    // Top to bottom, each block clear of the one above.
    const order = ['.kick', '.h', '.sub', '.eq', '.total', '.thanks', '.cta'].map(s => [s, q(s).getBoundingClientRect()])
    for (let i = 1; i < order.length; i++) if (order[i][1].top < order[i - 1][1].bottom + 6) out.push(`${order[i][0]} comes within 6px of ${order[i - 1][0]} (${Math.round(order[i][1].top)} vs ${Math.round(order[i - 1][1].bottom)})`)
    const foot = q('.foot'); if (foot) { const last = order[order.length - 1][1]; if (foot.getBoundingClientRect().top < last.bottom + 24) out.push('the footer is within 24px of the button row') }
    if (safe) for (const [s, r] of order) { if (r.top < safe[0]) out.push(`${s} starts above the Stories safe area (${Math.round(r.top)} < ${safe[0]})`); if (r.bottom > safe[1]) out.push(`${s} ends below the Stories safe area (${Math.round(r.bottom)} > ${safe[1]})`) }
    // Inside a tile, the number and the label must not run into the check badge.
    for (const c of document.querySelectorAll('.card')) {
      const ck = c.querySelector('.ck').getBoundingClientRect(), n = c.querySelector('.n').getBoundingClientRect(), l = c.querySelector('.l').getBoundingClientRect()
      const hit = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
      if (hit(ck, n) || hit(ck, l)) out.push(`the check badge overlaps the text in ${c.className}`)
    }
    return [...new Set(out)]
  }, { w, safe })
  if (problems.length) { bad++; console.error(`PROBLEM ${name}:\n  ` + problems.join('\n  ')) }
  await page.screenshot({ path: join(out, name) })
  console.log('wrote ' + join(out, name))
  await page.close()
}
await browser.close()
if (bad) process.exit(1)
