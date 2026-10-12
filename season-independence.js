/* Independence Day: the homepage's scene for all of July (index.html's <head> turns it on from the date and loads this with season-kit.css,
   season-kit.js and season-independence.css, which draws it). A bright summer night in red, white and blue: big fireworks bursting in turn over the
   hero (each one climbs, pops, spreads and fades), stars-and-stripes bunting strung across the top, a flag waving on its pole, and along the bottom a
   treeline with rockets and sparklers standing in the grass. Behind every section sits a layer of its own (bunting, pinwheels, little flags,
   sparklers, ribbons and rosettes, bursts going off in the corners, comets), and above the footer is a fireworks launch field at night with four
   signs. Tap the rocket, a sparkler or a star and it answers. Nothing here reads or writes anything about a visitor, and nothing is built unless
   the page is in the season. */
(function () {
  var C = {
    red: '#e63946', red2: '#b3202e', redHi: '#ff5a66', blue: '#3a6fd8', blue2: '#1f46a8', blueHi: '#6fa0ff', white: '#ffffff', ice: '#dce6ff',
    gold: '#ffcc4d', gold2: '#f0a31b', goldHi: '#ffe699', wood: '#c98a3d', wood2: '#8f5e22', steel: '#9aa7cf', navy: '#0b1a4a'
  };
  var SPARKS = [C.redHi, C.white, C.blueHi, C.gold];

  // ── A little geometry, so the art can be drawn from numbers ───────────────────────────────────────────────────────────────────
  function f(n) { return Math.round(n * 10) / 10; }
  function pol(cx, cy, r, deg) { var a = deg * Math.PI / 180; return [f(cx + r * Math.cos(a)), f(cy + r * Math.sin(a))]; }
  // an n-pointed star as a path (R outer radius, r inner radius, rot degrees of the first point)
  function starD(cx, cy, R, r, n, rot) {
    var d = '', i, p;
    for (i = 0; i < n * 2; i++) { p = pol(cx, cy, i % 2 ? r : R, (rot == null ? -90 : rot) + i * 180 / n); d += (i ? 'L' : 'M') + p[0] + ' ' + p[1]; }
    return d + 'Z';
  }
  // a four-point twinkle with curved arms
  function glintD(x, y, s) {
    var q = s * 0.16;
    return 'M' + f(x) + ' ' + f(y - s) + 'Q' + f(x + q) + ' ' + f(y - q) + ' ' + f(x + s) + ' ' + f(y) + 'Q' + f(x + q) + ' ' + f(y + q) + ' ' + f(x) + ' ' + f(y + s) +
      'Q' + f(x - q) + ' ' + f(y + q) + ' ' + f(x - s) + ' ' + f(y) + 'Q' + f(x - q) + ' ' + f(y - q) + ' ' + f(x) + ' ' + f(y - s) + 'Z';
  }
  // n spokes from radius r1 to r2 (every other one shorter by `shortBy` when given)
  function spokes(n, r1, r2, rot, shortBy) {
    var d = '', i, p, q;
    for (i = 0; i < n; i++) { p = pol(0, 0, r1, rot + i * 360 / n); q = pol(0, 0, (i % 2 && shortBy) ? r2 * shortBy : r2, rot + i * 360 / n); d += 'M' + p[0] + ' ' + p[1] + 'L' + q[0] + ' ' + q[1]; }
    return d;
  }
  // n dots on a ring (a zero-length stroke with round caps is a dot)
  function dots(n, r, rot) {
    var d = '', i, p;
    for (i = 0; i < n; i++) { p = pol(0, 0, r, rot + i * 360 / n); d += 'M' + p[0] + ' ' + p[1] + 'h.01'; }
    return d;
  }
  // n curved sparks that fly out and droop, like a willow
  function willow(n, r1, r2, droop, rot) {
    var d = '', e = '', g = '', i, a, p, c, t;
    for (i = 0; i < n; i++) {
      a = rot + i * 360 / n; p = pol(0, 0, r1, a); c = pol(0, 0, (r1 + r2) * 0.55, a); t = pol(0, 0, r2, a);
      d += 'M' + p[0] + ' ' + p[1] + 'Q' + c[0] + ' ' + f(c[1] + droop * 0.1) + ' ' + t[0] + ' ' + f(t[1] + droop);
      e += 'M' + t[0] + ' ' + f(t[1] + droop) + 'h.01';
      g += 'M' + t[0] + ' ' + f(t[1] + droop + 10) + 'h.01';
    }
    return [d, e, g];
  }
  function P(d, w, col, op) { return '<path d="' + d + '" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="' + w + '" style="stroke:' + col + '"' + (op ? ' stroke-opacity="' + op + '"' : '') + '/>'; }
  function F(d, fill, extra) { return '<path d="' + d + '" fill="' + fill + '"' + (extra || '') + '/>'; }

  // The five shells that burst over the hero: --c is the colour of the burst and --c2 its second colour (set on the element that holds it).
  var C2 = 'var(--c2,#fff)', WL = willow(16, 8, 42, 20, 0);
  var BURSTS =
    '<symbol id="id-bA" viewBox="-64 -64 128 128">' + P(spokes(14, 16, 38, 0), 4.2, 'currentColor') + P(dots(14, 48, 0), 7.5, 'currentColor') +
      P(spokes(14, 18, 28, 180 / 14), 2.6, C2) + P(dots(14, 11, 180 / 14), 4.6, C2) + '<path d="' + glintD(0, 0, 12) + '" style="fill:' + C2 + '"/></symbol>' +
    '<symbol id="id-bB" viewBox="-64 -64 128 128">' + P(spokes(28, 12, 50, 0, 0.62), 2.6, 'currentColor') + P(dots(14, 56, 0), 5.8, 'currentColor') + P(dots(14, 37, 180 / 14), 4.6, 'currentColor') +
      P(dots(14, 22, 0), 3.4, C2) + '<circle r="5.5" style="fill:' + C2 + '"/></symbol>' +
    '<symbol id="id-bC" viewBox="-64 -64 128 128">' + F(glintD(40, 0, 10) + glintD(-40, 0, 10) + glintD(0, 40, 10) + glintD(0, -40, 10) + glintD(28.3, 28.3, 7) + glintD(-28.3, 28.3, 7) + glintD(28.3, -28.3, 7) + glintD(-28.3, -28.3, 7), 'currentColor') +
      P(dots(16, 24, 0), 5, 'currentColor') + P(dots(16, 54, 11.25), 3.6, C2) + P(spokes(8, 7, 17, 22.5), 3, C2) + '<path d="' + glintD(0, 0, 9) + '" style="fill:' + C2 + '"/></symbol>' +
    '<symbol id="id-bD" viewBox="-64 -64 128 128">' + P(WL[0], 2.4, 'currentColor') + P(WL[1], 6.2, 'currentColor') + P(WL[2], 3.6, 'currentColor', '.7') + P(dots(16, 20, 11.25), 3.4, C2) + '<circle r="5" style="fill:' + C2 + '"/></symbol>' +
    '<symbol id="id-bE" viewBox="-64 -64 128 128">' +
      P(dots(5, 14, -90) + dots(5, 25, -90), 7.4, 'currentColor') + P(dots(5, 36, -90) + dots(5, 47, -90), 6.4, 'currentColor') + P(dots(5, 57, -90), 7.6, 'currentColor') +
      P(dots(5, 36, -54), 4.6, C2) + P(dots(5, 52, -54), 3.4, C2) + '<path d="' + starD(0, 0, 10, 4.2, 5) + '" style="fill:' + C2 + '"/></symbol>';

  // One firework rocket (the paper tube, the nose, two fins, a wooden stick and a lit fuse), in three colourways.
  function rocket(id, c) {
    return '<symbol id="' + id + '" viewBox="0 0 40 124">' +
      '<rect x="18.6" y="88" width="2.8" height="35" rx="1.4" fill="' + C.wood + '"/><rect x="18.6" y="88" width="1.1" height="35" rx=".55" fill="#e6b266"/>' +
      F('M11.5 64L2.5 90L11.5 85Z', c.fin) + F('M28.5 64L37.5 90L28.5 85Z', c.fin) +
      '<rect x="11" y="34" width="18" height="52" rx="2.5" fill="' + c.body + '"/>' + F('M20 34h6.5a2.5 2.5 0 0 1 2.5 2.5v47a2.5 2.5 0 0 1-2.5 2.5H20z', c.shade) +
      '<rect x="11" y="48" width="18" height="13" fill="' + c.band + '"/>' + F(starD(20, 54.6, 5.4, 2.3, 5), c.star) +
      '<rect x="11" y="72" width="18" height="6" fill="' + c.trim + '"/>' +
      F('M11 36C11 22 15.5 9 20 1C24.5 9 29 22 29 36Z', c.nose) + F('M20 1C24.5 9 29 22 29 36H22C22 22 21.3 9.5 20 1Z', c.noseShade) +
      '<path d="M16 10C14.6 15 14.1 22 14.6 29" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="2" stroke-linecap="round"/>' +
      '<rect x="13.5" y="85" width="13" height="6" rx="2" fill="' + C.blue2 + '"/>' +
      '<path d="M26.5 88C30.5 87.5 32.6 84.5 32 80.5" fill="none" stroke="#6b4a1a" stroke-width="1.4" stroke-linecap="round"/>' + F(glintD(32, 78, 5.5), C.gold) + '</symbol>';
  }

  // The sparkler: a wire, a dark coated end, a glowing tip, and a spray of sparks round it.
  var SPARKLER = '<symbol id="id-sparkler" viewBox="0 0 60 130">' +
    '<path d="M30 30V128" stroke="' + C.steel + '" stroke-width="2.6" stroke-linecap="round" fill="none"/>' +
    '<rect x="27.6" y="28" width="4.8" height="50" rx="2.4" fill="#5b6490"/><rect x="27.6" y="28" width="1.6" height="50" rx=".8" fill="#8e98c4"/><rect x="27.6" y="28" width="4.8" height="10" rx="2.4" fill="#ff9d3d"/>' +
    '<g transform="translate(30 24)">' + P(spokes(12, 7, 22, 0, 0.66), 2.4, C.gold) + P(dots(12, 25, 0), 4, C.gold) + P(dots(6, 14, 15), 3, C.white) + F(glintD(0, 0, 12), C.white) + '</g></symbol>';

  // A pinwheel's head: four folded vanes, red, white, blue and white, pinned in gold.
  function blade(fill, fold) { return F('M50 50L50 5L88 12Z', fill) + F('M50 50L88 12L84 46Z', fold, ' stroke="' + fold + '" stroke-width=".9" stroke-linejoin="round"'); }
  var PINWHEEL = '<symbol id="id-pinw" viewBox="0 0 100 100">' + blade(C.red, C.red2) + '<g transform="rotate(90 50 50)">' + blade(C.white, C.ice) + '</g><g transform="rotate(180 50 50)">' + blade(C.blue, C.blue2) + '</g><g transform="rotate(270 50 50)">' + blade(C.white, C.ice) + '</g>' +
    '<circle cx="50" cy="50" r="8" fill="' + C.gold2 + '"/><circle cx="50" cy="50" r="5.4" fill="' + C.gold + '"/><circle cx="48.4" cy="48.4" r="1.7" fill="#fff" fill-opacity=".85"/></symbol>';

  // A chunky gold star, lit from the top left (each point has a light side and a dark side).
  function starFacets(cx, cy, R, r) {
    var L = '', D = '', i, p, qa, qb, Pp = [], Q = [];
    for (i = 0; i < 5; i++) { Pp.push(pol(cx, cy, R, -90 + i * 72)); Q.push(pol(cx, cy, r, -54 + i * 72)); }
    for (i = 0; i < 5; i++) {
      p = Pp[i]; qa = Q[(i + 4) % 5]; qb = Q[i];
      L += 'M' + cx + ' ' + cy + 'L' + qa[0] + ' ' + qa[1] + 'L' + p[0] + ' ' + p[1] + 'Z';
      D += 'M' + cx + ' ' + cy + 'L' + p[0] + ' ' + p[1] + 'L' + qb[0] + ' ' + qb[1] + 'Z';
    }
    return [L, D];
  }
  var SF = starFacets(32, 34, 28, 12.5);
  var BSTAR = '<symbol id="id-bstar" viewBox="0 0 64 64">' + '<path d="' + starD(32, 34, 28, 12.5, 5) + '" fill="' + C.gold2 + '" stroke="' + C.gold2 + '" stroke-width="5" stroke-linejoin="round"/>' +
    '<path d="' + SF[0] + '" fill="' + C.goldHi + '" stroke="' + C.goldHi + '" stroke-width="1.8" stroke-linejoin="round"/><path d="' + SF[1] + '" fill="' + C.gold + '" stroke="' + C.gold + '" stroke-width="1.8" stroke-linejoin="round"/>' +
    F(glintD(24, 19, 4.6), '#fff', ' fill-opacity=".9"') + '</symbol>';
  // The same star on a stick with two ribbons tied below it: the one that answers "Hooray!".
  var STARSTICK = '<symbol id="id-starstick" viewBox="0 0 64 132">' + '<rect x="30.4" y="58" width="3.2" height="72" rx="1.6" fill="' + C.wood + '"/><rect x="30.4" y="58" width="1.2" height="72" rx=".6" fill="#e6b266"/>' +
    '<path d="M32 64C20 72 28 86 18 98" fill="none" stroke="' + C.red + '" stroke-width="5" stroke-linecap="round"/><path d="M32 64C44 72 36 86 46 98" fill="none" stroke="' + C.blue + '" stroke-width="5" stroke-linecap="round"/>' +
    '<g transform="translate(0 -2)"><path d="' + starD(32, 34, 28, 12.5, 5) + '" fill="' + C.gold2 + '" stroke="' + C.gold2 + '" stroke-width="5" stroke-linejoin="round"/>' +
    '<path d="' + SF[0] + '" fill="' + C.goldHi + '" stroke="' + C.goldHi + '" stroke-width="1.8" stroke-linejoin="round"/><path d="' + SF[1] + '" fill="' + C.gold + '" stroke="' + C.gold + '" stroke-width="1.8" stroke-linejoin="round"/>' +
    F(glintD(24, 19, 4.6), '#fff', ' fill-opacity=".9"') + '</g><circle cx="32" cy="62" r="3.4" fill="' + C.gold + '"/></symbol>';

  // A small flag on a pole (a wavy cloth: seven stripes and a field of stars).
  var CLOTH = 'M10 10C20 4 30 4 42 10S64 16 80 8V52C64 60 54 60 44 54S24 48 10 54Z';
  function canton(x, y, w, h) {
    var d = '', row, col, n, cx, cy;
    for (row = 0; row < 3; row++) { n = row % 2 ? 2 : 3; for (col = 0; col < n; col++) { cx = x + w * (n === 3 ? (col + 0.5) / 3 : (col + 1) / 3); cy = y + h * (row + 0.5) / 3; d += starD(cx, cy, 2.6, 1.1, 5); } }
    return d;
  }
  var FLAG = '<symbol id="id-flag" viewBox="0 0 84 110"><clipPath id="id-fclip"><path d="' + CLOTH + '"/></clipPath>' +
    '<rect x="6" y="3" width="3.6" height="106" rx="1.8" fill="' + C.ice + '"/><circle cx="7.8" cy="3.6" r="3.6" fill="' + C.gold + '"/>' +
    '<g clip-path="url(#id-fclip)"><rect x="9" y="0" width="76" height="64" fill="' + C.red + '"/><path d="M9 17.4H85V25H9ZM9 32.6H85V40.2H9ZM9 47.8H85V55.4H9Z" fill="#fff"/>' +
    '<rect x="9" y="0" width="34" height="32" fill="' + C.blue2 + '"/><path d="' + canton(12, 8, 28, 19) + '" fill="#fff"/>' +
    '<path d="M34 0C40 18 30 40 38 64H54C46 40 56 18 48 0Z" fill="#0a1233" fill-opacity=".14"/></g></symbol>';

  // An award rosette with two ribbon tails: a pleated blue rosette, a white ring, a red heart and a gold star.
  var ROSETTE = '<symbol id="id-rosette" viewBox="0 0 80 120">' +
    F('M30 52L16 112L28 104L36 116L44 56Z', C.red) + F('M26 80L33 77L36 116L28 104L16 112Z', C.red2, ' fill-opacity=".35"') + F('M23 70L38 60L39 66L22 76Z', '#fff', ' fill-opacity=".85"') +
    F('M50 52L64 112L52 104L44 116L36 56Z', C.blue) + F('M54 80L47 77L44 116L52 104L64 112Z', C.blue2, ' fill-opacity=".45"') + F('M57 70L42 60L41 66L58 76Z', '#fff', ' fill-opacity=".85"') +
    '<path d="' + starD(40, 36, 33, 28.5, 24, -90) + '" fill="' + C.blue + '" stroke="' + C.blue + '" stroke-width="2" stroke-linejoin="round"/>' +
    '<path d="' + starD(40, 36, 25, 22, 20, -90) + '" fill="#fff" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/>' +
    '<circle cx="40" cy="36" r="16" fill="' + C.red + '"/><circle cx="40" cy="36" r="16" fill="none" stroke="' + C.red2 + '" stroke-width="2" stroke-opacity=".6"/>' +
    F(starD(40, 36.6, 10.5, 4.4, 5), C.gold) + F(glintD(32, 26, 3.4), '#fff', ' fill-opacity=".85"') + '</symbol>';

  // A comet with a long tail of light.
  var COMET = '<symbol id="id-comet" viewBox="0 0 100 30"><defs><linearGradient id="id-cg" x1="0" x2="1"><stop offset="0" stop-color="' + C.gold + '" stop-opacity="0"/><stop offset="1" stop-color="' + C.goldHi + '" stop-opacity=".95"/></linearGradient></defs>' +
    '<path d="M82 9L2 15L82 21Z" fill="url(#id-cg)"/><path d="M82 12L30 15L82 18Z" fill="#fff" fill-opacity=".55"/>' + F(starD(86, 15, 12, 5.2, 5), C.gold) + F(starD(86, 15, 6.6, 3, 5), C.goldHi) +
    '<path d="M44 7h.01M60 22h.01M24 21h.01M70 6h.01" stroke="' + C.goldHi + '" stroke-width="3" stroke-linecap="round"/></symbol>';

  // A wooden crate with a painted star, and a fountain: a short striped tube with a fan of sparks.
  var CRATE = '<symbol id="id-crate" viewBox="0 0 64 56"><rect x="3" y="4" width="58" height="50" rx="3" fill="' + C.wood + '" stroke="' + C.wood2 + '" stroke-width="2.4"/>' +
    '<path d="M3 20H61M3 38H61" stroke="' + C.wood2 + '" stroke-width="2.2"/><path d="M7 8L57 50M57 8L7 50" stroke="' + C.wood2 + '" stroke-width="2.6" stroke-opacity=".55"/>' +
    '<rect x="20" y="16" width="24" height="24" rx="3" fill="#fff7e0"/>' + F(starD(32, 28.4, 8.6, 3.6, 5), C.red) + '<rect x="20" y="16" width="24" height="5" rx="2" fill="' + C.blue + '"/>' +
    '<circle cx="8" cy="9" r="1.7" fill="#fff4d6"/><circle cx="56" cy="9" r="1.7" fill="#fff4d6"/><circle cx="8" cy="49" r="1.7" fill="#fff4d6"/><circle cx="56" cy="49" r="1.7" fill="#fff4d6"/></symbol>';
  function fanD() {
    var d = '', e = '', i, a, s, c, t, ang = [-74, -52, -30, -10, 10, 30, 52, 74];
    for (i = 0; i < ang.length; i++) {
      a = ang[i] * Math.PI / 180; s = Math.sin(a); c = Math.cos(a);
      t = [f(45 + 40 * s), f(60 - 44 * c + 12 * Math.abs(s))];
      d += 'M45 60Q' + f(45 + 22 * s) + ' ' + f(60 - 40 * c) + ' ' + t[0] + ' ' + t[1]; e += 'M' + t[0] + ' ' + f(t[1] + 8) + 'h.01';
    }
    return [d, e];
  }
  var FAN = fanD();
  var FOUNTAIN = '<symbol id="id-fountain" viewBox="0 0 90 110">' + P(FAN[0], 2.6, C.gold) + P(FAN[1], 3.4, C.goldHi) + P('M45 58V12M33 56L26 22M57 56L64 22', 2.4, '#fff', '.8') + F(glintD(45, 14, 9), '#fff') +
    '<rect x="26" y="66" width="38" height="30" rx="3" fill="' + C.red + '"/><rect x="26" y="66" width="12" height="30" rx="3" fill="' + C.red2 + '" fill-opacity=".4"/><rect x="26" y="78" width="38" height="8" fill="#fff"/><rect x="26" y="78" width="12" height="8" fill="' + C.ice + '"/>' +
    '<rect x="31" y="60" width="28" height="8" rx="2" fill="' + C.blue + '"/><rect x="20" y="94" width="50" height="9" rx="2" fill="' + C.wood + '"/><rect x="20" y="94" width="50" height="3" rx="1.5" fill="#e6b266"/></symbol>';

  // The two gradients that shade the folds of the waving flag in the hero.
  var FLAGSH = '<linearGradient id="id-fsh" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".18"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#0a1233" stop-opacity=".26"/></linearGradient>' +
    '<linearGradient id="id-fsh2" x1="0" x2="1"><stop offset="0" stop-color="#0a1233" stop-opacity=".22"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity=".16"/></linearGradient>';

  var DEFS = '<symbol id="id-glint" viewBox="0 0 20 20"><path d="' + glintD(10, 10, 10) + '" fill="currentColor"/></symbol>' + BURSTS +
    rocket('id-rocket', { body: '#fff', shade: '#cfd9fb', band: C.blue, star: '#fff', trim: C.red, nose: C.red, noseShade: C.red2, fin: C.red2 }) +
    rocket('id-rocket2', { body: '#fff', shade: '#cfd9fb', band: C.red, star: '#fff', trim: C.blue, nose: C.blue, noseShade: C.blue2, fin: C.blue2 }) +
    rocket('id-rocket3', { body: C.blue, shade: C.blue2, band: '#fff', star: C.red, trim: C.red, nose: C.red, noseShade: C.red2, fin: C.red2 }) +
    SPARKLER + PINWHEEL + BSTAR + STARSTICK + FLAG + ROSETTE + COMET + CRATE + FOUNTAIN + '<defs>' + FLAGSH + '</defs>';

  // ── The hero ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  // A firework: it climbs (a bright streak), pops into one of the five shells, spreads, and fades, then waits its turn. Each has its own place, colours and delay.
  function fw(sym, x, y, size, c, c2, delay, cycle, cls) {
    return '<i class="id-fw' + (cls ? ' ' + cls : '') + '" style="left:' + x + '%;top:' + y + '%;--z:' + size + ';--c:' + c + ';--c2:' + c2 + ';--dl:' + delay + 's;--cy:' + cycle + 's">' +
      '<svg viewBox="0 0 128 128" aria-hidden="true" focusable="false"><use href="#' + sym + '"/></svg><i class="id-tr"></i></i>';
  }
  var BIG = 'clamp(190px,29vw,600px)', MID = 'clamp(170px,22vw,440px)', SMALL = 'clamp(140px,17vw,330px)';
  // sym, left %, top %, size, colour, second colour, delay (s), extra class: seven in turn, one every 1.6 s of a 13 s round. The gold ones keep to the empty sky
  // (the headline and the numbers are gold too), and the ones at the edges are cut by the screen, as if they were going off just out of sight.
  var HERO_FW = [
    ['id-bD', 90, 36, BIG, C.gold, '#fff', 0.2, 'id-fw--a'],
    ['id-bA', 66, 15, 'clamp(130px,15vw,300px)', C.redHi, '#fff', 1.8, 'id-fw--x sk-hide-m'],
    ['id-bC', 3, 50, MID, C.blueHi, '#fff', 3.4, 'sk-hide-m'],
    ['id-bE', 72, 54, SMALL, '#ffffff', C.gold, 5.0, 'id-fw--x sk-hide-m'],
    ['id-bB', 97, 70, MID, '#ffffff', C.gold, 6.6, 'id-fw--b'],
    ['id-bA', 86, 14, SMALL, C.blueHi, '#fff', 8.2, 'id-fw--x sk-hide-m'],
    ['id-bE', 3, 78, SMALL, C.redHi, '#fff', 9.8, 'id-fw--x sk-hide-m']
  ];

  // The bottom of the hero is a night field seen from the grass: layers of hills and trees, grass at the front, and rockets and sparklers standing in it.
  function oak(x, b, w, h) {
    var cy = b - h * 0.55, rx = w / 2, ry = h * 0.5;
    return 'M' + f(x - rx) + ' ' + f(cy) + 'A' + f(rx) + ' ' + f(ry) + ' 0 1 1 ' + f(x + rx) + ' ' + f(cy) + 'Q' + f(x + rx * 0.5) + ' ' + f(b - h * 0.08) + ' ' + f(x + 3) + ' ' + f(b) + 'H' + f(x - 3) + 'Q' + f(x - rx * 0.5) + ' ' + f(b - h * 0.08) + ' ' + f(x - rx) + ' ' + f(cy) + 'Z';
  }
  function fir(x, b, w, h) {
    var d = '', i, yb, yt, hw;
    for (i = 0; i < 3; i++) { yb = b - h * (0.08 + i * 0.28); yt = b - h * (0.5 + i * 0.25); hw = w * (0.5 - i * 0.1); d += 'M' + f(x - hw) + ' ' + f(yb) + 'L' + f(x) + ' ' + f(yt) + 'L' + f(x + hw) + ' ' + f(yb) + 'Z'; }
    return d + 'M' + f(x - 3) + ' ' + f(b) + 'V' + f(b - h * 0.12) + 'H' + f(x + 3) + 'V' + f(b) + 'Z';
  }
  function cypress(x, b, w, h) {
    return 'M' + f(x - w / 2) + ' ' + f(b) + 'C' + f(x - w / 2) + ' ' + f(b - h * 0.62) + ' ' + f(x - w * 0.18) + ' ' + f(b - h * 0.92) + ' ' + f(x) + ' ' + f(b - h) + 'C' + f(x + w * 0.18) + ' ' + f(b - h * 0.92) + ' ' + f(x + w / 2) + ' ' + f(b - h * 0.62) + ' ' + f(x + w / 2) + ' ' + f(b) + 'Z';
  }
  function trees(r, base, h0, h1, pines, framed) {
    var d = '', x = -20, h, w, edge, q;
    while (x < 1470) {
      h = h0 + (h1 - h0) * r(); edge = framed && (x < 190 || x > 1250); q = r();
      if (edge) { h *= 1.5 + r() * 0.5; d += fir(x, base, h * 0.5, h); x += h * 0.2 + 14; continue; }
      w = h * (0.55 + r() * 0.3);
      d += q < pines ? fir(x, base, w * 0.9, h) : (q < pines + 0.2 ? cypress(x, base, w * 0.42, h * 1.15) : oak(x, base, w, h));
      x += w * (0.42 + r() * 0.34);
    }
    return d + 'M-20 ' + base + 'H1470V270H-20Z';
  }
  function grass(r, y) {
    var d = 'M-10 270V' + y, x = -10;
    while (x < 1450) { d += 'L' + f(x + 2) + ' ' + f(y - 4 - r() * 11) + 'L' + f(x + 5.5) + ' ' + y; x += 6 + r() * 4; }
    return d + 'V270Z';
  }
  var SPARKLERS = [[212, 78, -14], [412, 66, 10], [704, 84, -8], [898, 70, 14], [1086, 80, -12], [1256, 66, 9]];   // x, height, tilt
  function field(k) {
    var r = k.rng(4), out = '<svg viewBox="0 0 1440 260" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">', i;
    out += '<path d="M0 150Q220 120 460 140T930 128T1440 146V260H0Z" fill="#101c58"/>';
    out += '<path d="' + trees(r, 160, 26, 54, 0.28) + '" fill="#0c1648"/>';
    out += '<path d="' + trees(r, 200, 38, 84, 0.3, true) + '" fill="#070e34"/>';
    out += '<path d="M0 208Q260 190 560 202T1100 198T1440 204V262H0Z" fill="#050b2a"/>';
    // rockets (x, height, tilt, colourway) and sparklers (x, height, tilt) standing in the grass; their feet are hidden by the grass in front
    [[96, 96, -5, ''], [172, 76, 4, '2'], [262, 112, -3, '3'], [352, 70, 6, ''], [470, 100, -6, '2'], [560, 82, 3, '3'], [640, 118, -2, ''], [752, 74, 5, '2'],
      [850, 104, -4, '3'], [938, 80, 4, ''], [1040, 114, -5, '2'], [1128, 72, 6, '3'], [1210, 98, -3, ''], [1300, 80, 4, '2'], [1390, 108, -4, '3']].forEach(function (p) {
      var w = p[1] / 3.1;
      out += '<use href="#id-rocket' + p[3] + '" x="' + f(p[0] - w / 2) + '" y="' + (246 - p[1]) + '" width="' + f(w) + '" height="' + p[1] + '" transform="rotate(' + p[2] + ' ' + p[0] + ' 246)"/>';
    });
    SPARKLERS.forEach(function (p) {
      var w = p[1] / 2.16;
      out += '<use href="#id-sparkler" x="' + f(p[0] - w / 2) + '" y="' + (246 - p[1]) + '" width="' + f(w) + '" height="' + p[1] + '" transform="rotate(' + p[2] + ' ' + p[0] + ' 246)"/>';
    });
    out += '<path d="' + grass(r, 240) + '" fill="#030822"/>';
    return out + '</svg>';
  }
  // The same sparklers' tips, twinkling: a layer of its own over the field, drawn the same size, with nothing else in it.
  function glints() {
    var out = '<svg viewBox="0 0 1440 260" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">';
    SPARKLERS.forEach(function (p, j) {
      var ty = 246 - p[1] + p[1] * 0.185;
      out += '<g transform="rotate(' + p[2] + ' ' + p[0] + ' 246)"><use class="id-spw" href="#id-glint" x="' + f(p[0] - 10) + '" y="' + f(ty - 10) + '" width="20" height="20" style="color:#fff;--d:' + (1 + j * 0.23).toFixed(2) + 's;--o:-' + (j * 0.37).toFixed(2) + 's"/></g>';
    });
    return out + '</svg>';
  }

  // A flag on a pole waves in three folds: each fold is a group of its own, nested in the last, that tips up and down a moment after its neighbour.
  function waveFlag() {
    var H = 112, sh = H / 7, W1 = 76, W2 = 52, W3 = 52;
    function stripes(w) { var s = '<rect width="' + w + '" height="' + H + '" fill="' + C.red + '"/>', i; for (i = 1; i < 7; i += 2) s += '<rect y="' + f(i * sh) + '" width="' + w + '" height="' + f(sh + 0.4) + '" fill="#fff"/>'; return s; }
    var stars = '', row, col, n;
    for (row = 0; row < 5; row++) { n = row % 2 ? 4 : 5; for (col = 0; col < n; col++) stars += starD(row % 2 ? 16.4 + col * 14.4 : 9.4 + col * 14.4, 8 + row * 12, 3.5, 1.5, 5); }
    return '<svg class="id-wf" viewBox="0 0 184 126" aria-hidden="true" focusable="false"><g transform="translate(2 6)">' +
      '<g class="id-w id-w1">' + stripes(W1 + 1) + '<rect width="' + (W1 + 1) + '" height="' + f(sh * 4) + '" fill="' + C.blue2 + '"/><path d="' + stars + '" fill="#fff"/><rect width="' + (W1 + 1) + '" height="' + H + '" fill="url(#id-fsh)"/>' +
        '<g transform="translate(' + W1 + ' 0)"><g class="id-w id-w2">' + stripes(W2 + 1) + '<rect width="' + (W2 + 1) + '" height="' + H + '" fill="url(#id-fsh2)"/>' +
          '<g transform="translate(' + W2 + ' 0)"><g class="id-w id-w3">' + stripes(W3) + '<rect width="' + W3 + '" height="' + H + '" fill="url(#id-fsh)"/></g></g>' +
        '</g></g></g></g></svg>';
  }

  // The hero: a dusk glow and a moon, twinkling stars, the fireworks in turn, bunting, the flag, glitter drifting down, the field, embers rising, and three taps.
  function hero(k) {
    var fws = '';
    HERO_FW.forEach(function (b) { fws += fw(b[0], b[1], b[2], b[3], b[4], b[5], b[6], 13, b[7]); });
    return '<div class="id-glow"></div><i class="id-moon sk-hide-m"></i>' +
      k.twinkles(6, { id: ['id-glint', 'sk-star'], size: [7, 15], dur: [2.6, 5.2], colors: ['#ffffff', C.gold, '#bcd0ff'], area: [40, 100], areaY: [13, 24], seed: 3, mobile: 0.5 }) +
      k.twinkles(5, { id: ['id-glint', 'sk-star'], size: [7, 16], dur: [2.6, 5.2], colors: ['#ffffff', C.gold, '#bcd0ff'], area: [80, 99], areaY: [26, 66], seed: 4, mobile: 0.5 }) +
      k.twinkles(3, { id: ['id-glint', 'sk-star'], size: [7, 14], dur: [2.6, 5.2], colors: ['#ffffff', C.gold, '#bcd0ff'], area: [0.5, 6], areaY: [20, 68], seed: 5, mobile: 0.5, cls: 'sk-hide-m' }) +
      k.twinkles(4, { id: ['id-glint', 'sk-star'], size: [6, 12], dur: [2.6, 5.2], colors: ['#ffffff', C.gold, '#bcd0ff'], areaY: [68, 80], seed: 6, mobile: 0.5 }) +
      fws +
      '<div class="id-bunt id-bunt--hero"></div>' +
      '<div class="id-pole"><i class="id-pole__rod"></i><i class="id-pole__ball"></i>' + waveFlag() + '</div>' +
      k.particles(10, { id: ['id-glint', 'sk-star', 'sk-sparkle'], colors: SPARKS, size: [8, 17], dur: [11, 20], drift: 70, sway: 24, seed: 21, mobile: 0.5, opacity: [0.5, 0.9] }) +
      '<div class="id-field">' + field(k) + '</div><div class="id-field id-field--g">' + glints() + '</div>' +
      k.particles(6, { dir: 'rise', id: ['sk-dot', 'id-glint'], colors: [C.gold, '#ffffff', C.goldHi], size: [4, 9], dur: [7, 13], drift: 40, sway: 12, seed: 33, mobile: 0.5, opacity: [0.55, 0.95], spin: 0 }) +
      k.tap(k.use('id-rocket', '', '0 0 40 124'), 'Boom!', 'id-tap id-t-rocket', 'right:clamp(120px,19vw,330px)') +
      k.tap(k.use('id-sparkler', '', '0 0 60 130') + '<i class="id-spk__g"></i>', 'Sparkle!', 'id-tap id-t-spk', 'left:2.4%') +
      k.tap(k.use('id-starstick', '', '0 0 64 132'), 'Hooray!', 'id-tap id-t-star', 'left:clamp(120px,17vw,260px)');
  }

  // ── A layer behind each section: different on every one so the page does not repeat itself ─────────────────────────────────
  // bunt:kind[:top px]   bunting along the top (flags, flags2, stars, lights)          rib:t|b   a red, white and blue ribbon along the top or the foot
  // fw:side:top%:hue:size:delay:shell[:m]   a firework going off by the edge, in turn with the others (m: it stays on a phone)    pin:side:top%:width   a spinning pinwheel
  // flags:side:n   little flags in a corner at the foot       spk:side:top%:width:tilt   a sparkler       stars:side:top%:n:seed   twinkles in the margin       sky:n:seed   faint stars everywhere
  // rose:side:at:len:w and pstar:side:at:len:w   an award rosette or a gold star swinging on a string        tap:kind:side:top px:width   a decoration that answers a tap (they stand in the top band, beside the heading: the bubble shows over free background)
  // conf:n:seed:side   glitter falling        rise:n:seed:side   sparks rising        comet:top%   a comet crossing the layer
  var SECTIONS = {
    eventStrip:     ['bunt:flags:7', 'fw:r:20:gold:200:-1:id-bD:m', 'rose:l:0.9:70:40', 'stars:r:56:4:1', 'fw:l:66:blue:170:-6:id-bC', 'spk:l:34:44:-12', 'conf:3:1:l', 'sky:6:1', 'rib:b'],
    programs:       ['bunt:stars', 'stars:l:5:4:2', 'fw:l:20:blue:210:-4:id-bC:m', 'spk:l:40:44:-14', 'fw:l:62:gold:200:-9:id-bB', 'flags:l:3', 'fw:r:14:red:190:-2:id-bA', 'pin:r:29:46', 'tap:star:r:84:56',
                     'fw:r:72:white:200:-6:id-bE', 'flags:r:3', 'conf:3:2:r', 'rise:3:21:l', 'comet:36', 'comet:80', 'sky:6:7'],
    competition:    ['rib:t', 'fw:l:26:red:200:-2:id-bA:m', 'pin:l:40:46', 'tap:rocket:l:78:46', 'flags:l:2', 'stars:l:76:4:3', 'pstar:r:0.9:96:34', 'fw:r:38:gold:200:-7:id-bD', 'spk:r:60:44:12', 'stars:r:84:4:13',
                     'rise:3:3:r', 'comet:46', 'sky:6:8'],
    coaches:        ['bunt:lights', 'pin:l:27:46', 'fw:l:52:blue:200:-6:id-bB', 'stars:l:78:4:4', 'tap:spk:r:90:46', 'fw:r:40:gold:200:-3:id-bC:m', 'flags:r:2', 'stars:r:66:4:14', 'rose:l:0.8:60:36',
                     'rib:b', 'conf:3:4:l', 'comet:72', 'sky:6:9'],
    gallery:        ['bunt:flags2', 'rose:l:0.8:70:38', 'rose:r:0.8:104:40', 'fw:r:78:red:190:-1:id-bE:m', 'fw:l:58:gold:170:-8:id-bA', 'comet:14', 'stars:l:28:4:5', 'rise:3:5:l', 'flags:l:2', 'sky:6:10'],
    'belt-journey': ['rib:t', 'fw:r:10:white:180:-5:id-bC:m', 'flags:r:2', 'spk:l:54:44:-12', 'stars:r:42:4:6', 'tap:star:l:82:56', 'conf:3:6:r', 'fw:l:78:blue:170:-2:id-bD', 'pin:r:64:44', 'sky:6:11'],
    locations:      ['bunt:stars', 'pin:r:30:46', 'fw:l:44:blue:200:-3:id-bD:m', 'flags:l:3', 'rise:3:7:r', 'tap:rocket:r:74:46', 'comet:50', 'fw:r:72:gold:180:-9:id-bB', 'spk:l:68:44:10', 'stars:l:14:4:7', 'sky:6:12'],
    faq:            ['bunt:lights', 'fw:l:12:gold:190:-7:id-bA:m', 'pstar:l:0.9:110:34', 'rib:b', 'conf:3:8:l', 'stars:r:30:4:8', 'spk:r:62:44:10', 'fw:r:48:red:180:-2:id-bE', 'pin:l:56:44', 'sky:6:13'],
    schedule:       ['bunt:flags', 'spk:r:30:44:12', 'fw:l:70:red:190:-2:id-bB:m', 'pin:l:44:46', 'comet:20', 'tap:spk:l:88:44', 'stars:r:70:4:9', 'fw:r:50:blue:180:-8:id-bC', 'flags:r:3', 'sky:6:14'],
    testimonials:   ['rib:t', 'rose:l:0.8:92:38', 'fw:r:46:blue:180:-4:id-bE:m', 'fw:l:78:gold:160:-8:id-bC', 'flags:r:3', 'stars:l:40:4:10', 'tap:star:r:80:56', 'conf:3:10:r', 'sky:6:15'],
    pricing:        ['bunt:stars', 'fw:l:18:gold:200:-6:id-bD:m', 'pin:l:38:46', 'spk:l:58:44:-10', 'stars:l:84:4:11', 'flags:l:2', 'pin:r:28:46', 'fw:r:50:red:210:-1:id-bA', 'rose:r:0.8:80:38', 'stars:r:14:4:21',
                     'fw:r:84:blue:180:-9:id-bB', 'rise:3:11:l', 'comet:66', 'comet:24', 'rib:b', 'sky:6:16'],
    contact:        ['bunt:lights', 'flags:l:3', 'flags:r:3', 'pstar:r:0.9:90:34', 'spk:l:24:44:-10', 'fw:r:60:red:190:-1:id-bA:m', 'tap:rocket:l:76:46', 'conf:3:12:l', 'fw:l:76:blue:180:-7:id-bC', 'stars:r:28:4:12', 'sky:6:17']
  };
  var HUES = { red: [C.redHi, '#fff'], blue: [C.blueHi, '#fff'], gold: [C.gold, '#fff'], white: ['#ffffff', C.gold] };
  var TAPS = { rocket: ['id-rocket', '0 0 40 124', 'Boom!'], spk: ['id-sparkler', '0 0 60 130', 'Sparkle!'], star: ['id-starstick', '0 0 64 132', 'Hooray!'] };
  var SIDE = { l: 'left', r: 'right' };

  // The strips and the faint stars run the full width; everything that lives in the margins sits in a wrapper that stops growing at 1640px, so on a very wide screen it stays near the content.
  var FULL = { bunt: 1, rib: 1, sky: 1, comet: 1 };
  function section(specs, k) {
    var full = '', edge = '', i, pends = 0;
    specs.forEach(function (spec, n) {
      var a = spec.split(':'), kind = a[0], side = SIDE[a[1]], hue, bits, t, o = '';
      if (kind === 'bunt') {
        o = '<div class="id-bunt id-bunt--' + a[1] + '"' + (a[2] ? ' style="top:' + a[2] + 'px"' : '') + '></div>';
      } else if (kind === 'rib') {
        o = '<div class="id-rib id-rib--' + a[1] + '"></div>';
      } else if (kind === 'fw') {
        hue = HUES[a[3]];
        o = '<i class="id-fw id-fw--s id-fw--' + a[1] + (a[7] === 'm' ? '' : ' sk-hide-m') + '" style="' + side + ':4%;top:' + a[2] + '%;--z:' + a[4] + 'px;--c:' + hue[0] + ';--c2:' + hue[1] + ';--dl:' + a[5] + 's;--cy:' + [11, 12.5, 14][n % 3] +
          's"><svg viewBox="0 0 128 128" aria-hidden="true" focusable="false"><use href="#' + a[6] + '"/></svg></i>';
      } else if (kind === 'pin') {
        o = '<div class="id-pin sk-hide-m" style="' + side + ':1%;top:' + a[2] + '%;width:' + a[3] + 'px"><i class="id-pin__s"></i>' + k.use('id-pinw', 'id-pin__h', '0 0 100 100') + '</div>';
      } else if (kind === 'flags') {
        bits = '';
        for (i = 0; i < +a[2]; i++) bits += k.use('id-flag', 'id-fl id-fl--' + i, '0 0 84 110');
        o = '<div class="id-fpile id-fpile--' + a[1] + ' sk-hide-m">' + bits + '</div>';
      } else if (kind === 'spk') {
        o = '<div class="id-spk sk-hide-m" style="' + side + ':1.4%;top:' + a[2] + '%;width:' + a[3] + 'px;rotate:' + a[4] + 'deg">' + k.use('id-sparkler', '', '0 0 60 130') + '<i class="id-spk__g"></i></div>';
      } else if (kind === 'stars') {
        o = k.twinkles(+a[3], { id: ['id-glint', 'sk-star'], size: [8, 16], dur: [3, 6], colors: ['#ffffff', C.gold, '#bcd0ff', C.redHi], area: a[1] === 'l' ? [0.6, 4.6] : [95.4, 99.4], areaY: [+a[2], +a[2] + 14], seed: 40 + +a[4], mobile: 0.5 });
      } else if (kind === 'sky') {
        o = k.twinkles(+a[1], { id: ['id-glint', 'sk-star'], size: [5, 10], dur: [3, 6.5], colors: ['rgba(255,255,255,.6)', 'rgba(255,204,77,.6)', 'rgba(188,208,255,.6)', 'rgba(255,90,102,.55)'], areaY: [2, 98], seed: 300 + +a[2], mobile: 0.5 });
      } else if (kind === 'rose') {
        o = k.pendant(k.use('id-rosette', '', '0 0 80 120'), { side: a[1], at: +a[2], len: +a[3], w: +a[4], cls: 'id-p' + (++pends) });
      } else if (kind === 'pstar') {
        o = k.pendant(k.use('id-bstar', '', '0 0 64 64'), { side: a[1], at: +a[2], len: +a[3], w: +a[4], cls: 'id-pstar id-p' + (++pends) });
      } else if (kind === 'tap') {
        t = TAPS[a[1]];
        o = k.tap(k.use(t[0], '', t[1]) + (a[1] === 'spk' ? '<i class="id-spk__g"></i>' : ''), t[2], 'id-tap id-t-' + a[1] + ' sk-hide-m', (a[2] === 'l' ? 'left' : 'right') + ':0.4%;top:' + a[3] + 'px;width:' + a[4] + 'px');
      } else if (kind === 'conf') {
        o = k.particles(+a[1], { id: ['id-glint', 'sk-star', 'sk-sparkle', 'sk-dot'], colors: SPARKS, size: [8, 16], dur: [16, 28], drift: 60, sway: 24, area: a[3] === 'l' ? [0, 9] : [91, 100], seed: 100 + +a[2], mobile: 0.5, opacity: [0.45, 0.85] });
      } else if (kind === 'rise') {
        o = k.particles(+a[1], { dir: 'rise', id: ['sk-dot', 'id-glint'], colors: [C.gold, '#ffffff', C.redHi, C.blueHi], size: [4, 9], dur: [9, 16], drift: 30, sway: 10, area: a[3] === 'l' ? [0, 9] : [91, 100], seed: 200 + +a[2], mobile: 0.5, opacity: [0.5, 0.9], spin: 0 });
      } else if (kind === 'comet') {
        o = k.flyers(1, { id: 'id-comet', vb: '0 0 100 30', top: [+a[1] - 3, +a[1] + 3], size: [64, 96], dur: [28, 40], wave: 14, seed: 700 + +a[1], mobile: 0 });
      }
      if (FULL[kind]) full += o; else edge += o;
    });
    return full + '<div class="id-wrap">' + edge + '</div>';
  }

  // ── The launch field above the footer: a night sky with bursts, bunting between poles, crates, rockets and fountains, four signs, a glowing ground ───
  var SAYINGS = ['Go off with a bang!', 'Shine bright all night', 'Dream big, aim high', 'Brave hearts, big sparks'];
  var TITLES = ['BOOM', 'STARS', 'FREEDOM', 'BRAVE'];
  function fountain(k) {
    return '<div class="id-fount">' + k.use('id-fountain', 'id-i id-i--fountain', '0 0 90 110') + '<i class="id-fz id-fz--1">' + k.use('id-glint', '', '0 0 20 20') + '</i><i class="id-fz id-fz--2">' + k.use('id-glint', '', '0 0 20 20') + '</i><i class="id-fz id-fz--3">' + k.use('id-glint', '', '0 0 20 20') + '</i></div>';
  }
  function footer(k) {
    var signs = SAYINGS.map(function (s, i) { return '<div class="id-sign id-sign--' + i + '"><span>' + TITLES[i] + '</span><em>' + s + '</em></div>'; }).join('');
    return '<div class="id-fsky">' +
      k.twinkles(12, { id: ['id-glint', 'sk-star'], size: [7, 14], dur: [2.8, 5.4], colors: ['#ffffff', C.gold, '#bcd0ff'], areaY: [2, 52], seed: 61, mobile: 0.5 }) +
      fw('id-bA', 14, 24, 'clamp(120px,15vw,210px)', C.redHi, '#fff', -2, 12, 'sk-hide-m') + fw('id-bD', 50, 12, 'clamp(140px,17vw,240px)', C.gold, '#fff', -7, 12, '') + fw('id-bC', 86, 26, 'clamp(120px,15vw,210px)', C.blueHi, '#fff', -10, 12, 'sk-hide-m') +
      '</div>' +
      '<div class="id-bunt id-bunt--foot"></div>' +
      '<div class="id-beam id-beam--l"></div><div class="id-beam id-beam--r"></div>' +
      '<div class="id-props sk-props id-props--l">' + k.use('id-rocket', 'id-i id-i--rocket id-i--r1', '0 0 40 124') + k.use('id-crate', 'id-i id-i--crate', '0 0 64 56') + k.use('id-rocket2', 'id-i id-i--rocket id-i--r2', '0 0 40 124') + fountain(k) + k.use('id-rocket3', 'id-i id-i--rocket id-i--r3', '0 0 40 124') + '</div>' +
      '<div class="id-signs sk-signs">' + signs + '</div>' +
      '<div class="id-props sk-props id-props--r">' + k.use('id-rocket3', 'id-i id-i--rocket id-i--r3', '0 0 40 124') + fountain(k) + k.use('id-flag', 'id-i id-i--flag', '0 0 84 110') + k.use('id-crate', 'id-i id-i--crate', '0 0 64 56') + k.use('id-rocket', 'id-i id-i--rocket id-i--r1', '0 0 40 124') + '</div>' +
      '<div class="id-ground"><i class="id-lights"></i></div>' +
      k.particles(5, { dir: 'rise', id: ['sk-dot', 'id-glint'], colors: [C.gold, '#ffffff', C.goldHi], size: [4, 9], dur: [6, 11], drift: 30, sway: 10, seed: 71, mobile: 0.5, opacity: [0.55, 0.95], spin: 0 });
  }

  // What is far from the screen need not move: a layer that leaves the window is marked .id-off (the stylesheet pauses it), and runs again when it comes back.
  function init() {
    if (!window.IntersectionObserver) return;
    var io = new IntersectionObserver(function (entries) { entries.forEach(function (e) { e.target.classList.toggle('id-off', !e.isIntersecting); }); }, { rootMargin: '250px 0px' });
    [].forEach.call(document.querySelectorAll('.sk-hero, .sk-sec, .sk-footer'), function (el) { io.observe(el); });
  }

  function onTap(el, k) {
    if (el.classList.contains('id-t-rocket')) k.burst(el, { id: 'sk-star', n: 26, colors: [C.white, C.gold, C.redHi, C.goldHi, C.blueHi, C.white], dist: [80, 200], size: [14, 28], ms: 1250 });
    else if (el.classList.contains('id-t-spk')) k.burst(el, { id: 'id-glint', n: 16, colors: [C.gold, C.white, C.goldHi], dist: [50, 130], size: [14, 26], ms: 1000 });
    else k.burst(el, { id: 'sk-star', n: 14, colors: [C.gold, C.white, C.redHi, C.blueHi, C.goldHi], dist: [60, 150], size: [14, 24], ms: 1100 });
  }

  var T = {
    name: 'independence', prefix: 'id',
    meta: { bg: '#060f2e', gold: '#ffcc4d', emoji: '🎇', tapSay: ['Boom!', 'Sparkle!', 'Hooray!'], sayings: SAYINGS },
    defs: DEFS,
    hero: hero,
    sections: {},
    footer: footer,
    init: init,
    onTap: onTap
  };
  Object.keys(SECTIONS).forEach(function (id) { T.sections[id] = function (k) { return section(SECTIONS[id], k); }; });
  (window.SeasonKit ? window.SeasonKit.mount : function (t) { (window.__skq = window.__skq || []).push(t); })(T);
})();
