/* St. Patrick's Day: the homepage's scene for March 17 only (index.html's <head> turns it on from the date, and it wins over the Easter month that one day;
   it loads this with season-kit.css, season-kit.js and season-stpatricks.css, which draws it). An emerald dusk with a golden glow: shamrocks drifting down
   over the hero, gold coins and sparkles twinkling, a big soft rainbow ending in a pot of gold with coins spilling out, a green top hat with a gold buckle,
   rolling hills with clover patches along the foot of the hero, a layer behind every section (Celtic knot borders, shamrock bunting, clovers and rainbows
   in the corners, pots of gold and coin stacks, coins falling, a hat or a clover swinging on a string), and a hillside above the footer where a rainbow
   ends in a pot of gold between four signs. Tap the pot, the hat, a four-leaf clover or a coin and it answers.
   Nothing here reads or writes anything about a visitor, and nothing is built unless the page is in the season. */
(function () {
  var GOLD = '#ffc83d', GOLD2 = '#e8a30d', GOLD3 = '#d68f08', MINT = '#b8f5d0';
  var GREENS = ['#2fbf71', '#1f9d55', '#4fd88b', '#16874a', '#6ee7a0', '#27b868'];
  var RB = ['#ff4d5e', '#ff8a3d', '#ffd23d', '#3ddc84', '#3aa0ff', '#9a74ff'];

  // The viewBox of each shape, so a shape can be drawn at any size and keep its proportions.
  var VB = { c3: '-50 -50 100 112', c4: '-52 -52 104 124', coin: '0 0 40 40', flat: '0 0 44 22', pot: '-8 -24 236 208', hat: '0 14 150 144',
    stack: '0 0 120 92', cloud: '0 0 140 70', bow: '0 0 100 100', shoe: '0 0 60 66' };

  // The same boxes with their corner at 0 0: that is what k.use() wants (a shape whose own box starts below zero would be pushed out of its frame).
  var AR = {};
  Object.keys(VB).forEach(function (n) { var p = VB[n].split(' '); AR[n] = '0 0 ' + p[2] + ' ' + p[3]; });

  // A rainbow ring around the top-left corner of a 100 by 100 box (red outside, violet inside); turn it for the other corners.
  function quarter(r0, w) {
    var o = '', i, a, b;
    for (i = 0; i < 6; i++) { a = r0 - i * w; b = a - w - 0.4; o += '<path d="M' + b + ' 0H' + a + 'A' + a + ' ' + a + ' 0 0 1 0 ' + a + 'V' + b + 'A' + b + ' ' + b + ' 0 0 0 ' + b + ' 0Z" fill="' + RB[i] + '"/>'; }
    return o;
  }
  // A rainbow arch standing on the line y=cy, centred on cx, as wide as 2*rx and as high as ry, each band w thick.
  function arch(cx, cy, rx, ry, w) {
    var o = '', i, ax, ay, bx, by;
    for (i = 0; i < 6; i++) {
      ax = rx - i * w; ay = ry - i * w; bx = ax - w - 0.5; by = ay - w - 0.5;
      o += '<path d="M' + (cx - ax) + ' ' + cy + 'A' + ax + ' ' + ay + ' 0 0 1 ' + (cx + ax) + ' ' + cy + 'H' + (cx + bx) + 'A' + bx + ' ' + by + ' 0 0 0 ' + (cx - bx) + ' ' + cy + 'Z" fill="' + RB[i] + '"/>';
    }
    return o;
  }

  // One heart-shaped leaf with its tip at the origin, pointing up; a clover is three or four of them turned about the middle.
  var LEAF = 'M0 0C-6-5-30-12-29-30C-28-46-8-50 0-35C8-50 28-46 29-30C30-12 6-5 0 0Z';
  function clover(n) {
    var o = '', i, a, s = n === 3 ? '' : ' scale(.9)';
    for (i = 0; i < n; i++) {
      a = n === 3 ? i * 120 : i * 90;
      o += '<g transform="rotate(' + a + ')' + s + '"><path d="' + LEAF + '" fill="currentColor"/>' +
        '<path d="M-3-9C-14-14-25-21-24-31C-23-41-12-44-5-37C-7-27-6-17-3-9Z" fill="#fff" fill-opacity=".27"/>' +
        '<path d="M0-5V-30M0-16L-9-24M0-16L9-24" fill="none" stroke="#052b14" stroke-opacity=".3" stroke-width="1.8" stroke-linecap="round"/></g>';
    }
    return o;
  }

  // A coin heaped in the mouth of the pot: [x, y, size, turn].
  var HEAP = [[44, 66, 36, -10], [78, 70, 36, 8], [112, 68, 36, -6], [146, 70, 36, 12], [178, 66, 34, -14],
    [60, 48, 36, 14], [94, 50, 36, -8], [128, 50, 36, 10], [162, 50, 34, -4],
    [78, 31, 36, -12], [110, 32, 36, 6], [142, 33, 34, 16],
    [94, 14, 34, 8], [126, 15, 34, -10], [110, -3, 32, -6]];
  function heap() {
    return HEAP.map(function (c) { return '<use href="#sp-coin" x="' + (c[0] - c[2] / 2) + '" y="' + (c[1] - c[2] / 2) + '" width="' + c[2] + '" height="' + c[2] + '" transform="rotate(' + c[3] + ' ' + c[0] + ' ' + c[1] + ')"/>'; }).join('');
  }

  // Shapes drawn once and reused with <use>: clovers (they take their green from `color`), coin, flat coin, pot of gold, top hat, coin stack, cloud, rainbow corner, horseshoe.
  var DEFS =
    '<symbol id="sp-clover3" viewBox="' + VB.c3 + '"><path d="M0 0C0 20 2 38 8 54" fill="none" stroke="#0d5b30" stroke-width="5.5" stroke-linecap="round"/>' + clover(3) + '<circle r="5" fill="currentColor"/></symbol>' +
    '<symbol id="sp-clover4" viewBox="' + VB.c4 + '"><path d="M0 0L22 22C30 30 38 42 36 64" fill="none" stroke="#0d5b30" stroke-width="5.5" stroke-linecap="round"/>' + clover(4) + '<circle r="5" fill="currentColor"/></symbol>' +
    '<symbol id="sp-coin" viewBox="' + VB.coin + '"><circle cx="20" cy="20" r="19" fill="' + GOLD3 + '"/><circle cx="20" cy="20" r="16.4" fill="' + GOLD + '"/>' +
      '<circle cx="20" cy="20" r="12.6" fill="none" stroke="' + GOLD2 + '" stroke-width="1.7"/>' +
      '<g fill="' + GOLD2 + '"><circle cx="20" cy="14.8" r="3.5"/><circle cx="15.7" cy="21" r="3.5"/><circle cx="24.3" cy="21" r="3.5"/><path d="M20 21.5L21.4 27" stroke="' + GOLD2 + '" stroke-width="1.8" stroke-linecap="round"/></g>' +
      '<path d="M7.6 14.2A13.8 13.8 0 0 1 16 6.8" fill="none" stroke="#fff6b8" stroke-width="2.6" stroke-linecap="round"/>' +
      '<path d="M33.4 26A13.8 13.8 0 0 1 25 33" fill="none" stroke="#a96a05" stroke-opacity=".45" stroke-width="2.2" stroke-linecap="round"/></symbol>' +
    '<symbol id="sp-coinflat" viewBox="' + VB.flat + '"><ellipse cx="22" cy="14.5" rx="20" ry="7" fill="#c07d05"/><rect x="2" y="10.5" width="40" height="4" fill="#c07d05"/>' +
      '<ellipse cx="22" cy="10.5" rx="20" ry="7" fill="' + GOLD + '"/><ellipse cx="22" cy="10.5" rx="14.5" ry="4.6" fill="none" stroke="' + GOLD2 + '" stroke-width="1.4"/>' +
      '<path d="M8 8.4Q14 4 22 3.9" fill="none" stroke="#fff6b8" stroke-width="1.8" stroke-linecap="round"/></symbol>' +
    '<symbol id="sp-pot" viewBox="' + VB.pot + '"><ellipse cx="110" cy="172" rx="102" ry="9" fill="#000" opacity=".32"/>' +
      '<path d="M50 140l-8 26q-1 5 4 5h14q4 0 3-5l-4-24z" fill="#0f1518"/><path d="M170 140l8 26q1 5-4 5h-14q-4 0-3-5l4-24z" fill="#0f1518"/>' +
      '<path d="M32 92C10 88 6 114 28 120" fill="none" stroke="#1b2428" stroke-width="9" stroke-linecap="round"/><path d="M188 92C210 88 214 114 192 120" fill="none" stroke="#1b2428" stroke-width="9" stroke-linecap="round"/>' +
      '<path d="M30 76C32 38 70 10 110 10S188 38 190 76Z" fill="' + GOLD3 + '"/>' + heap() +
      '<path d="M30 78C0 108 14 168 110 168S220 108 190 78Z" fill="#222c31"/>' +
      '<path d="M150 80C198 108 194 160 120 168C166 150 172 112 150 80Z" fill="#000" opacity=".3"/>' +
      '<path d="M44 100C38 124 52 150 82 160" fill="none" stroke="#86a0a8" stroke-width="7" stroke-linecap="round" opacity=".5"/>' +
      '<rect x="20" y="66" width="180" height="24" rx="12" fill="#303b41"/><path d="M34 73H186" stroke="#7a929a" stroke-width="3.5" stroke-linecap="round" opacity=".65"/>' +
      '<use href="#sp-coinflat" x="-8" y="150" width="46" height="23"/><use href="#sp-coinflat" x="14" y="160" width="44" height="22"/>' +
      '<use href="#sp-coin" x="-6" y="120" width="26" height="26" transform="rotate(-18 7 133)"/>' +
      '<use href="#sp-coinflat" x="164" y="162" width="46" height="23"/><use href="#sp-coinflat" x="186" y="150" width="44" height="22"/><use href="#sp-coin" x="196" y="128" width="26" height="26" transform="rotate(14 209 141)"/></symbol>' +
    '<symbol id="sp-hat" viewBox="' + VB.hat + '"><rect x="5" y="128" width="140" height="7" fill="#0a5a31"/><ellipse cx="75" cy="135" rx="70" ry="17" fill="#0a5a31"/><ellipse cx="75" cy="128" rx="70" ry="17" fill="#1fa05a"/>' +
      '<path d="M12 132Q30 146 75 146" fill="none" stroke="#7de9ad" stroke-opacity=".4" stroke-width="2.4" stroke-linecap="round"/>' +
      '<path d="M36 126L43 36A32 9 0 0 0 107 36L114 126A39 11 0 0 1 36 126Z" fill="#25b565"/>' +
      '<path d="M92 45C104 44 108 40 107 36L114 126A39 11 0 0 1 96 135Z" fill="#06452a" opacity=".35"/>' +
      '<path d="M53 48L50 116" stroke="#b9f8d4" stroke-opacity=".42" stroke-width="6" stroke-linecap="round"/>' +
      '<ellipse cx="75" cy="36" rx="32" ry="9" fill="#5fe09a"/>' +
      '<path d="M38.3 98C58 108 92 108 111.6 98L113.4 119A39 11 0 0 1 36.6 119Z" fill="#082f1b"/>' +
      '<rect x="60" y="106" width="30" height="23" rx="4.5" fill="' + GOLD + '"/><rect x="66" y="111.5" width="18" height="12" rx="2.5" fill="#082f1b"/><rect x="66" y="116.2" width="18" height="2.8" rx="1.4" fill="' + GOLD2 + '"/>' +
      '<path d="M63 109.4H87" stroke="#fff3b0" stroke-width="2" stroke-linecap="round"/></symbol>' +
    '<symbol id="sp-stack" viewBox="' + VB.stack + '">' +
      [[34, 78, 46], [32, 67, 46], [36, 56, 46], [33, 45, 46], [35, 34, 46]].map(function (c) { return '<rect x="' + (c[0] - 22) + '" y="' + c[1] + '" width="' + c[2] + '" height="12" rx="6" fill="#c07d05"/><rect x="' + (c[0] - 22) + '" y="' + c[1] + '" width="' + c[2] + '" height="9.4" rx="4.7" fill="' + GOLD + '"/><path d="M' + (c[0] - 14) + ' ' + (c[1] + 3.2) + 'H' + (c[0] + 14) + '" stroke="#fff6b8" stroke-width="1.6" stroke-linecap="round" opacity=".7"/>'; }).join('') +
      '<ellipse cx="35" cy="34" rx="22" ry="6.5" fill="#ffd95a"/><ellipse cx="35" cy="34" rx="15" ry="4" fill="none" stroke="' + GOLD2 + '" stroke-width="1.3"/>' +
      [[84, 82, 40], [86, 71, 40], [83, 60, 40]].map(function (c) { return '<rect x="' + (c[0] - 20) + '" y="' + c[1] + '" width="' + c[2] + '" height="12" rx="6" fill="#c07d05"/><rect x="' + (c[0] - 20) + '" y="' + c[1] + '" width="' + c[2] + '" height="9.4" rx="4.7" fill="' + GOLD + '"/><path d="M' + (c[0] - 12) + ' ' + (c[1] + 3.2) + 'H' + (c[0] + 12) + '" stroke="#fff6b8" stroke-width="1.6" stroke-linecap="round" opacity=".7"/>'; }).join('') +
      '<ellipse cx="83" cy="60" rx="20" ry="6" fill="#ffd95a"/><ellipse cx="83" cy="60" rx="13" ry="3.6" fill="none" stroke="' + GOLD2 + '" stroke-width="1.3"/>' +
      '<use href="#sp-coin" x="58" y="62" width="30" height="30" transform="rotate(-12 73 77)"/></symbol>' +
    '<symbol id="sp-cloud" viewBox="' + VB.cloud + '"><path d="M24 64C8 64 2 46 18 40C16 22 40 12 56 24C64 6 98 6 104 30C124 24 140 42 126 56C124 62 118 64 112 64Z" fill="currentColor"/></symbol>' +
    '<symbol id="sp-bowq" viewBox="' + VB.bow + '">' + quarter(100, 8) + '</symbol>' +
    '<symbol id="sp-shoe" viewBox="' + VB.shoe + '"><path d="M12 6V34C12 50 22 60 30 60S48 50 48 34V6" fill="none" stroke="' + GOLD3 + '" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="M12 6V34C12 50 22 60 30 60S48 50 48 34V6" fill="none" stroke="' + GOLD + '" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="M8.5 8V34C8.5 52 20 63.5 30 63.5" fill="none" stroke="#fff6b8" stroke-width="2" stroke-linecap="round" opacity=".7"/>' +
      '<g fill="#a96a05"><circle cx="12" cy="16" r="2.2"/><circle cx="12" cy="28" r="2.2"/><circle cx="16" cy="43" r="2.2"/><circle cx="48" cy="16" r="2.2"/><circle cx="48" cy="28" r="2.2"/><circle cx="44" cy="43" r="2.2"/></g></symbol>';

  // The hills along the foot of the hero: three ranks of hills, clover patches on them, and a few coins near the rainbow's end.
  function hills(k) {
    var r = k.rng(17), o = '<svg viewBox="0 0 1440 260" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">', x, i, s, c;
    o += '<path d="M0 124C120 84 260 82 400 112S660 144 820 108S1120 64 1260 100S1400 122 1440 108V260H0Z" fill="#0d4a2a"/>';
    o += '<path d="M0 164C160 126 300 134 460 158S760 182 940 146S1250 112 1440 152V260H0Z" fill="#117a42"/>';
    for (x = 20, i = 0; x < 1440; x += 70 + r() * 70, i++) { s = 26 + r() * 22; o += '<use href="#sp-clover3" x="' + x.toFixed(0) + '" y="' + (150 + r() * 26).toFixed(0) + '" width="' + s.toFixed(0) + '" height="' + (s * 1.12).toFixed(0) + '" opacity=".55" style="color:#3fd183"/>'; }
    o += '<path d="M0 210C200 176 380 184 560 204S900 226 1100 194S1340 174 1440 200V260H0Z" fill="#17924d"/>';
    for (x = 10, i = 0; x < 1440; x += 56 + r() * 90, i++) {
      s = 24 + r() * 26; c = GREENS[Math.floor(r() * GREENS.length)];
      o += '<use href="#' + (i % 9 === 4 ? 'sp-clover4' : 'sp-clover3') + '" x="' + x.toFixed(0) + '" y="' + (208 + r() * 34).toFixed(0) + '" width="' + s.toFixed(0) + '" height="' + (s * 1.12).toFixed(0) + '" style="color:' + c + '"/>';
      if (i % 3 === 1) o += '<circle cx="' + (x + 30 + r() * 20).toFixed(0) + '" cy="' + (214 + r() * 26).toFixed(0) + '" r="' + (3 + r() * 2).toFixed(1) + '" fill="#f4fff8" opacity=".9"/>';
    }
    o += '<path d="M0 244C240 230 480 238 720 242S1200 232 1440 244V260H0Z" fill="#06130c"/>';
    return o + '</svg>';
  }

  // The hero: an emerald dusk with a golden glow, a big soft rainbow in the bottom right corner ending in a pot of gold, clouds, shamrocks and
  // sparkles drifting, hills with clover patches, a green top hat, and a lucky clover; the pot, the hat and the clover answer a tap.
  function hero(k) {
    return '<div class="sp-aura"></div><div class="sp-sun"></div><div class="sp-horizon"></div><div class="sp-glow"></div>' +
      k.use('sp-clover4', 'sp-ghost sp-ghost--a', AR.c4) + k.use('sp-clover3', 'sp-ghost sp-ghost--b', AR.c3) +
      '<svg class="sp-bow" viewBox="0 0 100 100" aria-hidden="true" focusable="false"><defs><linearGradient id="sp-fadeg" gradientUnits="userSpaceOnUse" x1="0" y1="100" x2="100" y2="0"><stop offset="0" stop-color="#fff"/><stop offset=".55" stop-color="#fff" stop-opacity=".8"/><stop offset="1" stop-color="#fff" stop-opacity=".12"/></linearGradient>' +
        '<mask id="sp-fadem"><rect width="100" height="100" fill="url(#sp-fadeg)"/></mask></defs><g mask="url(#sp-fadem)"><use href="#sp-bowq" transform="rotate(180 50 50)"/></g></svg>' +
      k.twinkles(12, { id: ['sk-sparkle', 'sk-sparkle', 'sp-coin'], size: [10, 24], dur: [3, 6.5], colors: [GOLD, '#fff3b0', MINT, GOLD], seed: 5, areaY: [3, 64], mobile: 0.5 }) +
      k.twinkles(9, { id: ['sp-clover3', 'sp-clover3', 'sp-clover4'], colors: GREENS, size: [22, 40], seed: 41, areaY: [4, 66], mobile: 0.5, cls: 'sp-still' }) +
      k.particles(16, { id: ['sp-clover3', 'sp-clover3', 'sp-clover3', 'sp-clover3', 'sp-clover3', 'sp-clover4'], colors: GREENS, size: [24, 50], dur: [15, 27], drift: 130, sway: 40, seed: 11, mobile: 0.5, opacity: [0.75, 1] }) +
      k.particles(8, { id: ['sp-clover3', 'sp-clover3', 'sp-clover3', 'sp-clover4'], colors: GREENS, size: [12, 22], dur: [20, 34], drift: 90, sway: 24, seed: 12, mobile: 0.4, opacity: [0.4, 0.7] }) +
      k.particles(6, { id: 'sk-sparkle', dir: 'rise', colors: [GOLD, '#fff3b0'], size: [8, 16], dur: [16, 26], drift: 30, sway: 14, spin: 0.3, area: [60, 86], seed: 21, mobile: 0.5, opacity: [0.5, 0.9] }) +
      '<div class="sp-hills">' + hills(k) + '</div>' +
      k.twinkles(5, { id: 'sk-sparkle', size: [10, 20], dur: [2.4, 4.4], colors: [GOLD, '#fff3b0'], seed: 51, area: [66, 84], areaY: [72, 90], mobile: 0.6 }) +
      '<div class="sp-potglow"></div>' +
      k.tap(k.use('sp-pot', '', AR.pot), 'Lucky you!', 'sp-tap sp-tap--pot') +
      k.tap(k.use('sp-hat', '', AR.hat), 'Lucky!', 'sp-tap sp-tap--hat') +
      k.tap(k.use('sp-clover4', '', AR.c4), 'Found one!', 'sp-tap sp-tap--clo');
  }

  // A layer behind each section, different on every one so the page does not repeat itself.
  // The page's headers are on the left except in the gallery, locations, faq and pricing, where they are centred: a rainbow or a clover corner goes top right (or
  // either side where the header is centred), bottoms stay low, and what falls keeps to one margin.
  var SECTIONS = {
    eventStrip:     ['knot:a', 'bow:tr:110', 'clov:bl:1', 'base:r:stack,coins', 'leaves:4:1:l', 'glint:6:1:b'],
    programs:       ['knot:b', 'pend:hat:r:3:92:36', 'base:l:pot', 'clov:br:2', 'rain:5:2:r', 'glint:8:2:b', 'tap:clover:l:30:52', 'peek:r:40:clover4:60:14', 'peek:l:66:coin:44:-10'],
    competition:    ['knot:c', 'bow:tr:130', 'pend:coin:l:2:76:30', 'base:l:stack', 'rain:4:3:l', 'glint:6:3:r', 'peek:r:46:shoe:46:10'],
    coaches:        ['knot:d', 'bunt:b:low', 'clov:tr:3', 'base:r:pot,coins', 'leaves:4:4:l', 'glint:6:4:b', 'tap:hat:r:58:54', 'peek:l:34:clover3:58:-16', 'peek:l:78:coin:42:8'],
    gallery:        ['knot:e', 'bow:tl:130', 'pend:clover:r:2.5:80:32', 'bow:bl:130', 'base:r:stack,shoe', 'rain:4:5:r', 'leaves:3:5:l'],
    'belt-journey': ['knot:a', 'bunt:a:low', 'clov:tr:1', 'base:l:coins,stack', 'rain:5:6:r', 'glint:5:6:l', 'tap:pot:r:46:54'],
    locations:      ['knot:b', 'bow:tr:120', 'pend:hat:l:3:70:34', 'base:l:shoe,pot', 'leaves:5:7:r', 'glint:5:7:l', 'peek:r:52:clover3:56:12'],
    faq:            ['knot:c', 'clov:tl:2', 'pend:clover:r:1.5:100:32', 'bow:br:130', 'rain:4:8:l', 'glint:5:8:r', 'tap:coin:l:34:40'],
    schedule:       ['knot:d', 'bunt:b:low', 'clov:tr:1', 'base:r:stack,coins', 'leaves:4:9:l', 'glint:6:9:b', 'tap:hat:l:62:54'],
    testimonials:   ['knot:e', 'bow:tr:120', 'pend:coin:l:2:96:30', 'base:l:stack,pot', 'rain:5:10:r', 'glint:5:10:l', 'tap:clover:r:34:50'],
    pricing:        ['knot:a', 'clov:tl:3', 'pend:hat:r:2.5:84:34', 'bow:bl:130', 'leaves:4:11:r', 'glint:6:11:b', 'peek:r:34:shoe:46:-12', 'peek:l:52:clover4:62:12', 'peek:r:74:coin:44:6'],
    contact:        ['knot:b', 'bunt:a:low', 'clov:tr:2', 'base:l:coins,stack', 'base:r:shoe,coins', 'rain:4:12:l', 'glint:4:12:r', 'tap:pot:r:30:54']
  };
  var ITEMS = { pot: ['sp-pot', AR.pot], stack: ['sp-stack', AR.stack], coins: ['sp-coinflat', AR.flat], coin: ['sp-coin', AR.coin], shoe: ['sp-shoe', AR.shoe],
    hat: ['sp-hat', AR.hat], clover3: ['sp-clover3', AR.c3], clover4: ['sp-clover4', AR.c4] };
  var TAPS = { hat: ['sp-hat', AR.hat, 'Lucky!'], pot: ['sp-pot', AR.pot, 'Lucky you!'], clover: ['sp-clover4', AR.c4, 'Found one!'], coin: ['sp-coin', AR.coin, 'Shiny!'] };
  // Clovers in a corner, [x, y, size, turn, colour, leaves] measured from the corner (the other corners turn the group over).
  var CORNERS = {
    1: [[0, 0, 40, -12, 0, 3], [38, -2, 28, 18, 2, 3], [6, 36, 30, 8, 1, 4], [50, 32, 22, -20, 3, 3]],
    2: [[0, 4, 42, 10, 1, 3], [36, 22, 30, -8, 0, 4], [66, 0, 24, 25, 2, 3], [8, 54, 24, -18, 3, 3], [52, 52, 18, 12, 4, 3]],
    3: [[2, 0, 36, -6, 2, 4], [36, 12, 30, 16, 0, 3], [4, 36, 26, -14, 1, 3]]
  };
  // Where what falls or twinkles may start: the left margin, the right margin, both, or anywhere.
  var AREA = { l: [[0, 5]], r: [[95, 100]], b: [[0, 5], [95, 100]] };

  function section(specs, k) {
    var out = '', hung = specs.some(function (x) { return /^bunt:[a-z]+:low$/.test(x); });   // bunting hangs from the knot; on a phone it takes the knot's place
    specs.forEach(function (spec) {
      var a = spec.split(':'), kind = a[0], i, bits, d, t;
      if (kind === 'knot') {
        out += '<div class="sp-knot sp-knot--' + a[1] + (hung ? ' sp-knot--hb' : '') + '"></div>';
      } else if (kind === 'bunt') {
        out += '<div class="sp-bunt sp-bunt--' + a[1] + (a[2] ? ' sp-bunt--' + a[2] : '') + '"></div>';
      } else if (kind === 'clov') {
        bits = '';
        CORNERS[a[2]].forEach(function (c) {
          bits += '<span class="sp-cl" style="left:' + c[0] + 'px;top:' + c[1] + 'px;width:' + c[2] + 'px;rotate:' + c[3] + 'deg;color:' + GREENS[c[4]] + '">' + k.use(c[5] === 4 ? 'sp-clover4' : 'sp-clover3', '', c[5] === 4 ? AR.c4 : AR.c3) + '</span>';
        });
        out += '<div class="sp-corner sp-corner--' + a[1] + '">' + bits + '</div>';
      } else if (kind === 'bow') {
        out += '<div class="sp-bowc sp-bowc--' + a[1] + '" style="width:' + a[2] + 'px">' + k.use('sp-bowq', '', AR.bow) + '</div>';
      } else if (kind === 'base') {
        bits = '';
        a[2].split(',').forEach(function (it) { d = ITEMS[it]; if (d) bits += k.use(d[0], 'sp-i sp-i--' + it, d[1]); });
        out += '<div class="sp-base sp-base--' + a[1] + '">' + bits + '</div>';
      } else if (kind === 'peek') {
        d = ITEMS[a[3]];
        out += '<span class="sp-peek sp-peek--' + a[1] + ' sk-hide-m" style="top:' + a[2] + '%;width:' + a[4] + 'px;rotate:' + a[5] + 'deg">' + k.use(d[0], '', d[1]) + '</span>';
      } else if (kind === 'rain' || kind === 'leaves' || kind === 'glint') {
        (AREA[a[3]] || [[0, 100]]).forEach(function (ar, j, all) {
          var n = Math.max(1, Math.round(+a[1] / all.length)), seed = (kind === 'rain' ? 200 : kind === 'leaves' ? 100 : 300) + +a[2] + j * 7;
          if (kind === 'rain') out += k.particles(n, { id: 'sp-coin', size: [12, 21], dur: [14, 24], drift: 40, sway: 12, spin: 0, seed: seed, area: ar, mobile: 0.5, opacity: [0.45, 0.85], cls: 'sp-coinp' });
          else if (kind === 'leaves') out += k.particles(n, { id: ['sp-clover3', 'sp-clover3', 'sp-clover4'], colors: GREENS, size: [14, 28], dur: [16, 30], drift: 70, sway: 24, seed: seed, area: ar, mobile: 0.5, opacity: [0.5, 0.9] });
          else out += k.twinkles(n, { id: ['sk-sparkle', 'sk-sparkle', 'sp-coin'], size: [8, 16], dur: [3, 6], colors: [GOLD, '#fff3b0', MINT], seed: seed, area: ar, mobile: 0.5 });
        });
      } else if (kind === 'pend') {
        t = a[1] === 'hat' ? ['sp-hat', AR.hat] : a[1] === 'clover' ? ['sp-clover4', AR.c4] : ['sp-coin', AR.coin];
        out += k.pendant(k.use(t[0], '', t[1]), { side: a[2], at: a[3], len: +a[4], w: +a[5] });
      } else if (kind === 'tap') {
        t = TAPS[a[1]];
        out += k.tap(k.use(t[0], '', t[1]), t[2], 'sp-tap sp-tap--' + a[1] + ' sk-hide-m', (a[2] === 'l' ? 'left' : 'right') + ':0.4%;top:' + a[3] + '%;width:' + a[4] + 'px');
      }
    });
    return out;
  }

  // The hillside above the footer: a rainbow ending in a pot of gold on one side and a clover patch on the other, four signs between them.
  var SAYINGS = ['Luck loves showing up', 'Practice is pure gold', 'Grow a little each day', 'Good friends, good luck'];
  var TITLES = ['LUCKY', 'GOLD', 'GREEN', 'CLOVER'];
  function footer(k) {
    var signs = SAYINGS.map(function (s, i) {
      return '<div class="sp-sign sp-sign--' + (i + 1) + '">' + (i % 2 ? k.use('sp-clover4', 'sp-sign__c', AR.c4) : k.use('sp-clover3', 'sp-sign__c', AR.c3)) + '<span>' + TITLES[i] + '</span><em>' + s + '</em></div>';
    }).join('');
    var r = k.rng(31), patch = '', i, s;
    for (i = 0; i < 16; i++) {
      s = 22 + r() * 22;
      patch += '<use href="#' + (i === 5 ? 'sp-clover4' : 'sp-clover3') + '" x="' + (r() * 1380).toFixed(0) + '" y="' + (50 + r() * 70).toFixed(0) + '" width="' + s.toFixed(0) + '" height="' + (s * 1.12).toFixed(0) + '" style="color:' + GREENS[Math.floor(r() * GREENS.length)] + '"/>';
    }
    return '<svg class="sp-farch" viewBox="0 0 1000 300" aria-hidden="true" focusable="false"><g opacity=".92">' + arch(500, 290, 490, 285, 17) + '</g>' +
        '<use href="#sp-cloud" x="-14" y="188" width="190" height="95" style="color:#eafff2" opacity=".92"/><use href="#sp-cloud" x="838" y="188" width="190" height="95" style="color:#eafff2" opacity=".92"/></svg>' +
      '<div class="sp-fhills"><svg viewBox="0 0 1440 200" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">' +
        '<path d="M0 80C160 40 320 44 500 76S840 110 1040 70S1340 36 1440 66V200H0Z" fill="#0f5a31"/>' +
        '<path d="M0 118C200 84 420 96 640 120S1040 142 1240 108S1400 98 1440 110V200H0Z" fill="#14733d"/>' + patch +
        '<path d="M0 160C260 140 520 150 780 158S1200 148 1440 156V200H0Z" fill="#0b3a21"/></svg></div>' +
      '<div class="sp-props sk-props sp-props--l">' + k.use('sp-clover4', 'sp-i sp-i--c4', AR.c4) + k.use('sp-clover3', 'sp-i sp-i--c3', AR.c3) + k.use('sp-hat', 'sp-i sp-i--hat', AR.hat) + '</div>' +
      '<div class="sp-signs sk-signs">' + signs + '</div>' +
      '<div class="sp-props sk-props sp-props--r">' + k.use('sp-pot', 'sp-i sp-i--pot', AR.pot) + '</div>' +
      k.particles(6, { id: ['sp-clover3', 'sp-clover4'], colors: GREENS, size: [12, 22], dur: [12, 20], drift: 70, sway: 24, seed: 300, mobile: 0.5, opacity: [0.6, 0.9] }) +
      k.twinkles(8, { id: ['sk-sparkle', 'sp-coin'], size: [8, 16], dur: [3, 6], colors: [GOLD, '#fff3b0'], seed: 301, mobile: 0.5, areaY: [4, 60] });
  }

  // What each tap does besides showing its bubble: the pot bursts into coins, the hat into shamrocks, the clover into sparkles, the coin into more coins.
  function onTap(el, k) {
    var c = el.classList;
    if (c.contains('sp-tap--pot')) k.burst(el, { id: 'sp-coin', n: 18, dist: [60, 160], size: [14, 26], ms: 1100 });
    else if (c.contains('sp-tap--hat')) k.burst(el, { id: 'sp-clover3', n: 12, colors: GREENS, dist: [50, 130], size: [16, 30], ms: 1000 });
    else if (c.contains('sp-tap--clo')) k.burst(el, { id: 'sk-sparkle', n: 14, colors: [GOLD, '#fff3b0', MINT], dist: [40, 110], size: [10, 22], ms: 900 });
    else if (c.contains('sp-tap--coin')) k.burst(el, { id: 'sp-coin', n: 8, dist: [40, 90], size: [12, 20], ms: 900 });
  }

  var T = {
    name: 'stpatricks', prefix: 'sp',
    meta: { bg: '#06130c', gold: '#ffc83d', emoji: '\uD83C\uDF40', tapSay: ['Lucky you!', 'Lucky!', 'Found one!', 'Shiny!'], sayings: SAYINGS },
    defs: DEFS,
    hero: hero,
    sections: {},
    footer: footer,
    onTap: onTap
  };
  Object.keys(SECTIONS).forEach(function (id) { T.sections[id] = function (k) { return section(SECTIONS[id], k); }; });
  (window.SeasonKit ? window.SeasonKit.mount : function (t) { (window.__skq = window.__skq || []).push(t); })(T);
})();
