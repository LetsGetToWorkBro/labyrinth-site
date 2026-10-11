// The "we hit the goal" video for Rolling for Ribbons: 1080x1920 (9:16, Reels, Stories and the Facebook feed), 15 seconds, H.264 MP4. This file is
// the picture with no sound. scripts/audio-goal-reached.py reads the timeline below (the `const T` block), makes the sound effects and an original
// music bed to match it, and joins them to this picture without re-encoding it: goal-reached-video-sound.mp4 and goal-reached-video-effects.mp4.
// The story it tells is the one the donation page tells once the goal is reached: the community raises $500, two anonymous donors each
// match it, $500 becomes $1,500 for a family affected by breast cancer, thank you. No donor names, no total beyond the $500 goal (new
// gifts keep arriving, and a video does not update).
//   assets/social/goal-reached-video.mp4
//
// It is drawn as a web page whose every element is a pure function of the clock (window.__render(t)), and the frames are photographed one
// at a time, so the result does not depend on how fast this machine is. The layout is checked at the moments the picture is fullest, the
// same way the posters are: nothing past the margins, nothing outside the Stories safe area (270px to 1580px), nothing overlapping.
//
// Run: node scripts/video-goal-reached.mjs   (needs playwright-core and an ffmpeg with libx264; set FFMPEG=/path/to/ffmpeg if it is not on PATH)
//   OUT_DIR=<dir>   where the MP4 goes (default assets/social)
//   KEEP_FRAMES=1   keep the PNG frames (in OUT_DIR/goal-frames) instead of deleting them
//   CHECK_ONLY=1    run only the layout checks and write a few still frames, no video
//   WORKERS=3       how many pages photograph frames at once (default 3)
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { mkdirSync, readFileSync, rmSync, existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { ribbonSVG } from './ribbon-art.mjs'
const here = dirname(fileURLToPath(import.meta.url))
const req = createRequire(import.meta.url)
let chromium
try { ({ chromium } = req('playwright-core')) } catch { ({ chromium } = req('/home/user/labyrinth-app/node_modules/playwright-core')) }
const out = process.env.OUT_DIR ?? join(here, '..', 'assets', 'social')
mkdirSync(out, { recursive: true })

const FPS = 30, DURATION = 15
const b64 = (p, mime) => `data:${mime};base64,${readFileSync(p).toString('base64')}`
const anton = b64(join(here, 'fonts', 'anton-latin-400-normal.woff2'), 'font/woff2')
const oswald = b64(join(here, 'fonts', 'oswald-latin-700-normal.woff2'), 'font/woff2')
const PLUM = '#2a0f1c', PINK = '#e58fb5', MAG = '#b0306b', SOFT = '#ffe3ee'
const CHECK = (c, bg) => `<svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="${bg}"/><path d="M6.4 12.6l3.7 3.7 7.5-8.2" fill="none" stroke="${c}" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`

const page = () => `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:Anton;src:url(${anton}) format('woff2')}@font-face{font-family:Oswald;font-weight:700;src:url(${oswald}) format('woff2')}
*{margin:0;box-sizing:border-box}
html,body{width:1080px;height:1920px;overflow:hidden}
body{position:relative;font-family:Oswald,sans-serif;color:#fff;background:#1c0a13}
#bg{position:absolute;inset:0;background:radial-gradient(110% 55% at 82% 0%, #7a2650 0%, #46142d 40%, #2a0f1c 78%, #1c0a13 100%)}
#glow{position:absolute;width:1300px;height:1300px;border-radius:50%;background:radial-gradient(closest-side, rgba(229,143,181,.20), rgba(229,143,181,0));left:-100px;top:700px}
#wm{position:absolute;right:-170px;top:430px;width:640px;opacity:.10;transform-origin:50% 60%;-webkit-mask-image:linear-gradient(#000 35%,transparent 85%);mask-image:linear-gradient(#000 35%,transparent 85%)}
#wm svg{width:100%;height:auto;display:block}
.lay{position:absolute;left:0;top:0;width:1080px;height:1920px}
.abs{position:absolute;left:70px;right:70px}
.mid{position:absolute;left:0;right:0;text-align:center;white-space:nowrap}
.kick{top:290px;display:flex;align-items:center;gap:16px;font-size:28px;letter-spacing:.22em;text-transform:uppercase;color:${PINK};white-space:nowrap;height:52px}
.kick .ico{width:30px;flex:none}.kick .ico svg{width:100%;height:auto;display:block}
.chips{position:absolute;right:70px;top:290px;height:52px;width:300px}
.chip{position:absolute;right:0;top:0;background:${PINK};color:${PLUM};border-radius:999px;padding:9px 22px 8px;font-size:24px;letter-spacing:.14em;text-transform:uppercase;white-space:nowrap;transform-origin:100% 50%}
.h{font-family:Anton,sans-serif;text-transform:uppercase;line-height:.92;white-space:nowrap}
/* scene A: the count */
#aLabel{top:455px;font-size:40px;letter-spacing:.2em;text-transform:uppercase;color:${SOFT}}
#aNum{top:530px;font-family:Anton,sans-serif;font-size:380px;line-height:1;color:#fff}
#aBar{position:absolute;left:90px;top:990px;width:900px;height:60px;border-radius:30px;background:rgba(255,255,255,.14)}
#aFill{position:absolute;left:0;top:0;height:60px;width:0;border-radius:30px;background:linear-gradient(90deg,#c9578a,${PINK} 70%,#f6bcd3)}
#aRib{position:absolute;left:100%;top:-84px;width:46px;margin-left:-23px}#aRib svg{width:100%;height:auto;display:block}
#aMarks{position:absolute;left:90px;top:1068px;width:900px;display:flex;justify-content:space-between;font-size:34px;letter-spacing:.14em;text-transform:uppercase;color:${SOFT}}
#aStamp{top:1196px;display:flex;justify-content:center}
#aStamp .in{display:flex;align-items:center;gap:22px;background:${PINK};color:${PLUM};border-radius:30px;padding:18px 44px 16px 30px;font-family:Anton,sans-serif;font-size:116px;line-height:1;text-transform:uppercase;white-space:nowrap}
#aStamp i{display:block;width:104px;height:104px;flex:none}
/* scene B: the matches */
#bT1{top:372px;font-size:140px;color:#fff}
#bT2{top:508px;font-size:180px;color:${PINK}}
.row{position:absolute;left:70px;right:70px;height:104px;border-radius:26px;display:flex;align-items:center;justify-content:space-between;padding:0 40px}
.row .l{font-size:29px;letter-spacing:.14em;text-transform:uppercase;white-space:nowrap}
.row .n{font-family:Anton,sans-serif;font-size:76px;line-height:1;margin-right:62px}
.row .ck{position:absolute;right:22px;top:32px;width:40px;height:40px}
.r1{top:728px;background:${PINK};color:${PLUM}}
.r2,.r3{border:4px solid ${PINK};background:rgba(255,255,255,.07);color:#fff}
.r2 .l,.r3 .l{color:${PINK}}
.r2{top:870px}.r3{top:1012px}
.pl{position:absolute;left:0;right:0;text-align:center;font-family:Anton,sans-serif;font-size:46px;line-height:1;color:${PINK}}
#p1{top:828px}#p2{top:970px}
#bTotal{position:absolute;left:70px;right:70px;top:1150px;height:118px;background:#fff7fa;color:${PLUM};border-radius:30px;display:flex;align-items:center;justify-content:center;gap:26px;white-space:nowrap}
#bTotal .eqs{font-family:Anton,sans-serif;font-size:80px;color:${MAG}}
#bTotal .t{font-family:Anton,sans-serif;font-size:100px;line-height:1;color:${PLUM};min-width:300px;text-align:left}
#bTotal .u{font-size:24px;letter-spacing:.12em;text-transform:uppercase;color:${MAG};line-height:1.25}
#bFor{top:1296px;font-size:42px;color:${SOFT}}
/* scene C: thanks */
#cT1{top:528px;font-size:230px;color:#fff}
#cT2{top:752px;font-size:230px;color:${PINK}}
#cSub{top:1030px;font-size:46px;color:${SOFT}}
#cPill{position:absolute;left:70px;right:70px;top:1150px;height:128px;background:${PINK};color:${PLUM};border-radius:34px;display:flex;align-items:center;justify-content:center;font-family:Anton,sans-serif;font-size:70px;text-transform:uppercase;white-space:nowrap;letter-spacing:.02em}
#cSem{top:1304px;font-size:36px;letter-spacing:.06em;text-transform:uppercase;color:#fff}
#cUrl{top:1360px;font-size:36px;letter-spacing:.03em;color:${PINK}}
#cBrand{top:1490px;font-size:30px;letter-spacing:.2em;text-transform:uppercase;color:#cfb5c2}
.fxc{position:absolute;left:0;top:0;width:1080px;height:1920px;pointer-events:none}
</style></head><body>
<div id="bg"></div><div id="glow"></div>
<div id="wm">${ribbonSVG('#ffffff', { uid: 'v' })}</div>
<canvas id="fxb" class="fxc" width="1080" height="1920"></canvas>

<div class="lay" id="kick">
  <div class="abs kick" data-chk><span class="ico">${ribbonSVG(PINK, { uid: 'vk' })}</span><span>Rolling for Ribbons</span></div>
  <div class="chips"><span class="chip" id="chip1">Pink October</span><span class="chip" id="chip2">Goal reached</span></div>
</div>

<div class="lay" id="A">
  <div class="mid" id="aLabel" data-chk>Raised by our community</div>
  <div class="mid" id="aNum" data-chk>$0</div>
  <div id="aBar"><div id="aFill"><div id="aRib">${ribbonSVG(PINK, { uid: 'va' })}</div></div></div>
  <div id="aMarks" data-chk><span>$0</span><span>$500 goal</span></div>
  <div class="mid" id="aStamp"><div class="in" data-chk><i>${CHECK(PINK, PLUM)}</i><span>Goal reached</span></div></div>
</div>

<div class="lay" id="B">
  <div class="mid h" id="bT1" data-chk>Both matches</div>
  <div class="mid h" id="bT2" data-chk>unlocked</div>
  <div class="row r1" id="r1" data-chk><span class="l">We raised</span><span class="n">$500</span><span class="ck">${CHECK(PINK, PLUM)}</span></div>
  <div class="pl" id="p1">+</div>
  <div class="row r2" id="r2" data-chk><span class="l">Donor 1 matches</span><span class="n">$500</span><span class="ck">${CHECK(PLUM, PINK)}</span></div>
  <div class="pl" id="p2">+</div>
  <div class="row r3" id="r3" data-chk><span class="l">Donor 2 matches</span><span class="n">$500</span><span class="ck">${CHECK(PLUM, PINK)}</span></div>
  <div id="bTotal" data-chk><span class="eqs">=</span><span class="t" id="bTot">$0</span><span class="u">for a family<br>affected by breast cancer</span></div>
  <div class="mid" id="bFor" data-chk>Every gift goes directly to the family.</div>
</div>

<div class="lay" id="C">
  <div class="mid h" id="cT1" data-chk>Thank you</div>
  <div class="mid h" id="cT2" data-chk>Fulshear</div>
  <div class="mid" id="cSub" data-chk>Every gift goes directly to the family.</div>
  <div id="cPill" data-chk>See you Saturday, Oct 24</div>
  <div class="mid" id="cSem" data-chk>Free women's self defense seminar</div>
  <div class="mid" id="cUrl" data-chk>labyrinth.vision/self-defense-for-women</div>
  <div class="mid" id="cBrand" data-chk>Labyrinth BJJ &middot; Fulshear, TX</div>
</div>
<canvas id="fxf" class="fxc" width="1080" height="1920"></canvas>

<script>
const PINK='${PINK}', PLUM='${PLUM}', MAG='${MAG}'
const $ = id => document.getElementById(id)
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x))
const prog = (t, s, d) => clamp((t - s) / d)
const eo3 = p => 1 - Math.pow(1 - p, 3)
const eob = p => { const s = 1.70158; return 1 + (s + 1) * Math.pow(p - 1, 3) + s * Math.pow(p - 1, 2) }
const lerp = (a, b, p) => a + (b - a) * p
const money = n => '$' + Math.round(n).toLocaleString('en-US')
const put = (el, o, x = 0, y = 0, s = 1, r = 0) => { el.style.opacity = o; el.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(' + s + ') rotate(' + r + 'deg)' }

// The timeline, in seconds.
const T = {
  count: [0.5, 2.7],          // $0 to $500
  hit: 3.2,                   // the goal: stamp, confetti
  aOut: [4.3, 0.5],
  bIn: 4.6, rows: [5.1, 5.7, 6.3], total: 7.1, burst2: 7.8, bFor: 8.4, bOut: [9.3, 0.5],
  cIn: 9.8, cSub: 10.6, cPill: 11.2, cBrand: 11.7, burst3: 9.9,
}

// Confetti: every piece's whole life is a formula of the clock, with a seeded generator, so a frame is the same however it is asked for.
function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 } }
const COLORS = ['#e58fb5', '#ffe3ee', '#ffffff', '#b0306b', '#f4b7d0', '#ff7fb0']
function burst(seed, t0, n, origin) {
  const r = rng(seed), out = []
  for (let i = 0; i < n; i++) {
    const o = origin(r, i), sp = o.sp[0] + r() * (o.sp[1] - o.sp[0]), ang = o.ang + (r() - .5) * o.spread
    out.push({ t0: t0 + r() * (o.delay || 0), x: o.x + (r() - .5) * (o.jx || 0), y: o.y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
      rot: r() * 6.283, spin: (r() - .5) * 16, w: 14 + r() * 20, h: 7 + r() * 11, c: COLORS[(r() * COLORS.length) | 0], round: r() < .22, flap: 5 + r() * 9, life: o.life + r() * 1.0, front: r() < (o.front ?? .18) })
  }
  return out
}
const cannon = (x, ang) => (r) => ({ x, y: 1540, ang, spread: .55, sp: [2300, 4300], delay: .12, life: 2.0 })
const PIECES = [
  ...burst(11, T.hit, 90, cannon(40, -1.12)), ...burst(12, T.hit, 90, cannon(1040, -2.02)),
  ...burst(21, T.burst2, 110, cannon(40, -1.12)), ...burst(22, T.burst2, 110, cannon(1040, -2.02)),
  // thank you: a shower from above
  ...burst(31, T.burst3, 90, (r) => ({ x: 540, y: -60, ang: 1.5708, spread: 1.2, sp: [500, 1500], delay: .8, life: 1.5, jx: 1100, front: .05 })),
]
const fxBack = $('fxb').getContext('2d'), fxFront = $('fxf').getContext('2d')
function drawConfetti(t) {
  fxBack.clearRect(0, 0, 1080, 1920); fxFront.clearRect(0, 0, 1080, 1920)
  const k = 3.2, g = 1400
  for (const p of PIECES) {
    const dt = t - p.t0
    if (dt < 0 || dt > p.life) continue
    const e = (1 - Math.exp(-k * dt)) / k
    const x = p.x + p.vx * e, y = p.y + (p.vy - g / k) * e + (g / k) * dt
    if (y > 2000 || x < -100 || x > 1180) continue
    const fx = p.front ? fxFront : fxBack
    fx.save(); fx.globalAlpha = dt > p.life - .6 ? Math.max(0, (p.life - dt) / .6) : 1
    fx.translate(x, y); fx.rotate(p.rot + p.spin * dt); fx.scale(1, Math.cos(p.flap * dt + p.rot)); fx.fillStyle = p.c
    if (p.round) { fx.beginPath(); fx.arc(0, 0, p.h * .75, 0, 6.283); fx.fill() } else fx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
    fx.restore()
  }
}

window.__render = function (t) {
  // the quiet background life: a slow drift of the glow and the ribbon, so nothing is ever a still picture
  $('glow').style.transform = 'translate(' + (Math.sin(t * .35) * 90) + 'px,' + (Math.cos(t * .27) * 60) + 'px)'
  $('wm').style.transform = 'rotate(' + (14 + Math.sin(t * .5) * 2) + 'deg) translateY(' + (Math.sin(t * .4) * 14) + 'px)'

  // the chip beside the title: "Pink October" until the goal, then "Goal reached" pops in
  const cp = prog(t, T.hit, .4)
  put($('chip1'), 1 - clamp(cp * 3), 0, 0, 1)
  put($('chip2'), clamp(cp * 3), 0, 0, lerp(.6, 1, eob(cp)))
  put($('kick'), 1, 0, 0, 1)

  // ---- A: the count
  const aOut = prog(t, T.aOut[0], T.aOut[1])
  const aOp = (t < T.aOut[0] + T.aOut[1] ? 1 : 0) * (1 - aOut)
  const A = $('A'); A.style.opacity = aOp; A.style.display = aOp > 0 ? 'block' : 'none'
  if (aOp > 0) {
    A.style.transform = 'translateY(' + (-aOut * 70) + 'px)'
    put($('aLabel'), 1, 0, 0)
    const c = eo3(prog(t, T.count[0], T.count[1]))
    const hp = prog(t, T.hit, .6)
    const pop = 1 + .14 * Math.sin(Math.PI * Math.min(1, hp * 1.4)) * (1 - hp)
    $('aNum').textContent = money(500 * c)
    $('aNum').style.color = t >= T.hit ? PINK : '#fff'
    put($('aNum'), 1, 0, 0, pop)
    $('aFill').style.width = (900 * c) + 'px'
    $('aFill').style.boxShadow = t >= T.hit ? '0 0 ' + (60 * Math.sin(Math.PI * Math.min(1, hp * 1.2)) + 6) + 'px rgba(246,188,211,.9)' : 'none'
    const rp = prog(t, .9, .4)
    $('aRib').style.opacity = rp * (c > .02 ? 1 : 0)
    $('aRib').style.transform = 'rotate(' + (8 + Math.sin(t * 6) * 5) + 'deg) scale(' + (t >= T.hit ? 1 + .25 * Math.sin(Math.PI * Math.min(1, hp * 1.5)) : 1) + ')'
    put($('aMarks'), 1, 0, 0, 1)
    const sp = prog(t, T.hit, .55)
    put($('aStamp'), clamp(sp * 4), 0, 0, lerp(.35, 1, eob(sp)), lerp(-14, -3, eo3(sp)))
  }

  // ---- B: the matches
  const bOut = prog(t, T.bOut[0], T.bOut[1])
  const bOp = (t >= T.bIn && t < T.bOut[0] + T.bOut[1] ? 1 : 0) * (1 - bOut)
  const B = $('B'); B.style.opacity = bOp; B.style.display = bOp > 0 ? 'block' : 'none'
  if (bOp > 0) {
    B.style.transform = 'translateY(' + (-bOut * 70) + 'px)'
    const t1 = prog(t, T.bIn, .5), t2 = prog(t, T.bIn + .15, .5)
    put($('bT1'), t1, 0, (1 - eo3(t1)) * 50); put($('bT2'), t2, 0, (1 - eo3(t2)) * 50, lerp(.9, 1, eob(t2)))
    ;['r1', 'r2', 'r3'].forEach((id, i) => {
      const p = prog(t, T.rows[i], .5), side = i === 1 ? 1 : -1
      put($(id), clamp(p * 3), side * (1 - eo3(p)) * 900, 0, 1)
      const kp = prog(t, T.rows[i] + .4, .3)
      const ck = $(id).querySelector('.ck'); ck.style.transform = 'scale(' + (kp > 0 ? lerp(.2, 1, eob(kp)) : 0) + ')'; ck.style.opacity = clamp(kp * 3)
    })
    put($('p1'), prog(t, T.rows[1] - .1, .25), 0, 0, 1); put($('p2'), prog(t, T.rows[2] - .1, .25), 0, 0, 1)
    const tp = prog(t, T.total, .55), vp = eo3(prog(t, T.total + .05, .75))
    put($('bTotal'), clamp(tp * 3), 0, 0, lerp(.55, 1, eob(tp)))
    $('bTot').textContent = money(1500 * vp)
    const fp = prog(t, T.bFor, .45); put($('bFor'), fp, 0, (1 - eo3(fp)) * 20)
  }

  // ---- C: thank you
  const cIn = prog(t, T.cIn, .5)
  const C = $('C'); C.style.opacity = cIn > 0 ? 1 : 0; C.style.display = cIn > 0 ? 'block' : 'none'
  if (cIn > 0) {
    const a = prog(t, T.cIn, .55), b = prog(t, T.cIn + .18, .55)
    const breathe = 1 + Math.sin(t * 2.2) * .008
    put($('cT1'), a, 0, (1 - eo3(a)) * 60, lerp(.82, 1, eob(a)) * breathe); put($('cT2'), b, 0, (1 - eo3(b)) * 60, lerp(.82, 1, eob(b)) * breathe)
    const s = prog(t, T.cSub, .5); put($('cSub'), s, 0, (1 - eo3(s)) * 20)
    const p = prog(t, T.cPill, .55); put($('cPill'), clamp(p * 3), 0, 0, lerp(.7, 1, eob(p)) * (p >= 1 ? 1 + Math.sin(t * 3) * .006 : 1))
    const q = prog(t, T.cPill + .25, .5); put($('cSem'), q, 0, (1 - eo3(q)) * 16); const u = prog(t, T.cPill + .4, .5); put($('cUrl'), u, 0, (1 - eo3(u)) * 16)
    const br = prog(t, T.cBrand, .6); put($('cBrand'), br, 0, 0, 1)
  }
  drawConfetti(t)
}

// What the layout checks see: the elements that carry words, in the scene on screen at time t, with their boxes.
window.__check = function (t, safe) {
  window.__render(t)
  const out = [], seen = []
  const name = el => el.id || el.className
  for (const el of document.querySelectorAll('[data-chk]')) {
    let vis = true
    for (let n = el; n && n !== document.body; n = n.parentElement) { const cs = getComputedStyle(n); if (cs.display === 'none' || Number(cs.opacity) < .95) { vis = false; break } }
    if (!vis) continue
    let r = el.getBoundingClientRect()
    if (!r.width || !r.height) continue
    // a centred line sits in a box as wide as the screen: judge where its words are, not where the box is
    if (el.classList.contains('mid')) { const g = document.createRange(); g.selectNodeContents(el); const b = g.getBoundingClientRect(); r = { left: b.left, right: b.right, top: r.top, bottom: r.bottom, width: b.width, height: r.height } }
    seen.push([name(el), r])
    if (r.right > 1080 - 60 + .5) out.push(name(el) + ' runs to ' + Math.round(r.right) + 'px (right margin is 1020px)')
    if (r.left < 60 - .5) out.push(name(el) + ' starts at ' + Math.round(r.left) + 'px (left margin is 60px)')
    if (r.top < safe[0] - .5) out.push(name(el) + ' starts above the safe area (' + Math.round(r.top) + ' < ' + safe[0] + ')')
    if (r.bottom > safe[1] + .5) out.push(name(el) + ' ends below the safe area (' + Math.round(r.bottom) + ' > ' + safe[1] + ')')
    if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).display !== 'inline') out.push(name(el) + ' is wider than its box (' + el.scrollWidth + ' > ' + el.clientWidth + ')')
  }
  for (let i = 0; i < seen.length; i++) for (let j = i + 1; j < seen.length; j++) {
    const a = seen[i][1], b = seen[j][1]
    if (a.left < b.right - 1 && a.right > b.left + 1 && a.top < b.bottom - 2 && a.bottom > b.top + 2) out.push(seen[i][0] + ' overlaps ' + seen[j][0])
  }
  return { problems: [...new Set(out)], seen: seen.map(s => s[0]) }
}
window.__render(0)
</script></body></html>`

const ffmpeg = process.env.FFMPEG ?? 'ffmpeg'
const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/opt/pw-browsers/chromium' })
const pg = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 })
await pg.setContent(page(), { waitUntil: 'load' })
await pg.evaluate(() => document.fonts.ready)
await pg.waitForTimeout(300)

// The layout, at the moments the picture is fullest in each scene.
let bad = 0
for (const t of [3.9, 4.2, 8.9, 9.1, 14.9]) {
  const { problems, seen } = await pg.evaluate(t => window.__check(t, [270, 1580]), t)
  if (!seen.length) { bad++; console.error(`PROBLEM t=${t}s: nothing to check was on screen`) }
  if (problems.length) { bad++; console.error(`PROBLEM t=${t}s:\n  ` + problems.join('\n  ')) }
}
if (bad) { await browser.close(); process.exit(1) }
console.log('layout checks passed at 5 moments')

const frames = join(out, 'goal-frames')
if (existsSync(frames)) rmSync(frames, { recursive: true, force: true })
mkdirSync(frames, { recursive: true })
if (process.env.CHECK_ONLY) {
  for (const [name, t] of [['a-hit', 3.9], ['b-total', 8.9], ['c-thanks', 14.9]]) { await pg.evaluate(t => window.__render(t), t); await pg.screenshot({ path: join(frames, name + '.png') }) }
  await browser.close(); console.log('wrote stills to ' + frames); process.exit(0)
}
const N = FPS * DURATION
// Several pages photograph the frames side by side; each frame is a pure function of its time, so who takes it makes no difference.
const WORKERS = Math.max(1, Number(process.env.WORKERS ?? 3))
const pages = [pg]
for (let w = 1; w < WORKERS; w++) {
  const extra = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 })
  await extra.setContent(page(), { waitUntil: 'load' })
  await extra.evaluate(() => document.fonts.ready)
  pages.push(extra)
}
await pg.waitForTimeout(300)
await Promise.all(pages.map(async (p, w) => {
  for (let i = w; i < N; i += WORKERS) {
    await p.evaluate(t => window.__render(t), i / FPS)
    await p.screenshot({ path: join(frames, String(i).padStart(4, '0') + '.png') })
  }
}))
await browser.close()
console.log(`photographed ${N} frames`)

const mp4 = join(out, 'goal-reached-video.mp4')
// BT.709 on the way to YUV, tagged as such, or the pinks drift on a phone. yuv420p, faststart and 30 fps are what Instagram and Facebook want.
const r = spawnSync(ffmpeg, ['-y', '-hide_banner', '-loglevel', 'error', '-framerate', String(FPS), '-i', join(frames, '%04d.png'),
  '-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p', '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-profile:v', 'high', '-level', '4.1',
  '-x264-params', 'aq-mode=3', '-r', String(FPS), '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-an', '-movflags', '+faststart', mp4], { stdio: 'inherit' })
if (r.status !== 0) { console.error('ffmpeg failed (is FFMPEG set to a build with libx264?)'); process.exit(1) }
if (!process.env.KEEP_FRAMES) rmSync(frames, { recursive: true, force: true })
console.log('wrote ' + mp4)
