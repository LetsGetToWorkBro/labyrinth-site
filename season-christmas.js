/* Christmas: the homepage's scene for all of December (index.html's <head> turns it on from the date and loads this with season-kit.css,
   season-kit.js and season-christmas.css, which draws it). A dark evergreen night: snow in three sizes over the hero, a string of blinking lights
   drooping along its top, Santa's sleigh crossing a big warm moon, snowy hills with lit fir trees and gifts along its foot, a layer behind every
   section (light strings, garlands, baubles swinging on strings, holly, candy canes, gifts, small trees, snowdrifts, a little snow) and a snowy
   foot scene with four gift tags strung on a line of lights. Tap the snowman, Santa or a bell and it answers.
   Nothing here reads or writes anything about a visitor, and nothing is built unless the page is in the season. */
(function () {
  var C = { red: '#c8283a', redL: '#e24a5c', redD: '#8f1a2b', green: '#1f7a43', greenL: '#2f9a58', greenD: '#0f4a2a', gold: '#f2c14e', goldL: '#ffe08a', goldD: '#c9922a',
    snow: '#f4f8fb', snowS: '#d3e3ee', snowB: '#a8c3d6', blue: '#3d86d1', blueL: '#6bb4f0', brown: '#7a4a22', brownD: '#4d2c12', brownL: '#a8683a', ink: '#1b1b24' };
  var BULB = ['#ff4056', '#ffc83a', '#3fd47a', '#4aa8ff', '#fff0cf'];
  var SNOWC = ['#ffffff', '#eaf4fb', '#d6e9f7'];
  var SPARK = ['#fff6d6', '#ffe08a', '#d6ecff', '#ffffff'];

  // ── small helpers for drawing ──────────────────────────────────────────────────────────────────────────────────────────────────
  function n(v) { return String(Math.round(v * 10) / 10); }
  function pt(p) { return n(p[0]) + ' ' + n(p[1]); }
  function lerp(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; }
  function head(p0, p1, p2, p3, t) { var a = lerp(p0, p1, t), b = lerp(p1, p2, t), c = lerp(p2, p3, t), d = lerp(a, b, t), e = lerp(b, c, t); return [p0, a, d, lerp(d, e, t)]; }
  function sym(id, vb, body) { return '<symbol id="' + id + '" viewBox="' + vb + '">' + body + '</symbol>'; }
  function starPts(cx, cy, R, r, pts, rot) {
    var out = [], i, a;
    for (i = 0; i < pts * 2; i++) { a = ((rot == null ? -90 : rot) + i * 180 / pts) * Math.PI / 180; out.push([cx + (i % 2 ? r : R) * Math.cos(a), cy + (i % 2 ? r : R) * Math.sin(a)]); }
    return out;
  }
  function poly(p) { return 'M' + p.map(pt).join('L') + 'Z'; }
  // A star with every point split into a light half and a dark half (folded paper).
  function facet(cx, cy, R, r, pts, light, dark) {
    var p = starPts(cx, cy, R, r, pts), m = p.length, out = '', i, a, b, c;
    for (i = 0; i < m; i += 2) {
      a = p[(i + m - 1) % m]; b = p[i]; c = p[(i + 1) % m];
      out += '<path d="M' + pt([cx, cy]) + 'L' + pt(a) + 'L' + pt(b) + 'Z" fill="' + light + '"/><path d="M' + pt([cx, cy]) + 'L' + pt(b) + 'L' + pt(c) + 'Z" fill="' + dark + '"/>';
    }
    return out;
  }
  // A smooth curve through points (Catmull-Rom as cubic beziers), for hills.
  function smooth(p) {
    var d = 'M' + pt(p[0]), i, p0, p1, p2, p3;
    for (i = 0; i < p.length - 1; i++) {
      p0 = p[i - 1] || p[i]; p1 = p[i]; p2 = p[i + 1]; p3 = p[i + 2] || p2;
      d += 'C' + pt([p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]) + ' ' + pt([p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]) + ' ' + pt(p2);
    }
    return d;
  }
  function hill(fn, step, bottom, x0, x1) { var p = [], x; for (x = x0; x <= x1 + step; x += step) p.push([x, fn(x)]); return smooth(p) + 'V' + bottom + 'H' + x0 + 'Z'; }

  // ── fir trees: four-tier and three-tier, drawn from numbers: [apex y, base y, half width, skirt sag] ───────────────────────────────
  var FIR_VB = '0 -24 100 170', FIR_OUT = '0 0 100 170';   // the symbol's viewBox, and the one an <svg> that uses it needs
  var FIR4 = [[3, 48, 21, 5], [26, 76, 31, 6], [50, 104, 41, 7], [74, 128, 49, 7]];
  var FIR3 = [[14, 58, 27, 6], [40, 94, 38, 7], [66, 128, 49, 7]];
  function tier(t) {
    var cx = 50, ya = t[0], yb = t[1], hw = t[2], sag = t[3], h = yb - ya, A = [cx, ya], R = [cx + hw, yb], L = [cx - hw, yb];
    var r1 = [cx + hw * 0.16, ya + h * 0.3], r2 = [cx + hw * 0.56, ya + h * 0.66], l1 = [cx - hw * 0.16, ya + h * 0.3], l2 = [cx - hw * 0.56, ya + h * 0.66];
    var b1 = [cx - hw * 0.5, yb + sag * 1.33], b2 = [cx + hw * 0.5, yb + sag * 1.33];
    var hl = head(L, b1, b2, R, 0.5), hr = head(R, b2, b1, L, 0.5);
    var ts = ya < 10 ? 0.5 : 0.56, sr = head(A, r1, r2, R, ts), sl = head(A, l1, l2, L, ts), SR = sr[3], SL = sl[3], span = SR[0] - cx, dip = Math.max(2.8, span * 0.36);
    var x1 = cx + span / 2, y0 = SR[1], y1 = SR[1] + 1.6, y2 = SR[1] + 0.4;
    var capR = 'M' + pt(A) + 'C' + pt(sr[1]) + ' ' + pt(sr[2]) + ' ' + pt(SR) + 'Q' + n((SR[0] + x1) / 2) + ' ' + n(y0 + dip) + ' ' + n(x1) + ' ' + n(y1) + 'Q' + n((x1 + cx) / 2) + ' ' + n(y1 + dip) + ' ' + n(cx) + ' ' + n(y2) + 'Z';
    var x1l = cx - span / 2, capL = 'M' + pt(A) + 'C' + pt(sl[1]) + ' ' + pt(sl[2]) + ' ' + pt(SL) + 'Q' + n((SL[0] + x1l) / 2) + ' ' + n(y0 + dip) + ' ' + n(x1l) + ' ' + n(y1) + 'Q' + n((x1l + cx) / 2) + ' ' + n(y1 + dip) + ' ' + n(cx) + ' ' + n(y2) + 'Z';
    return '<path d="M' + pt(A) + 'C' + pt(r1) + ' ' + pt(r2) + ' ' + pt(R) + 'C' + pt(b2) + ' ' + pt(b1) + ' ' + pt(L) + 'C' + pt(l2) + ' ' + pt(l1) + ' ' + pt(A) + 'Z" fill="url(#xm-tg)"/>' +
      '<path d="M' + pt(A) + 'C' + pt(l1) + ' ' + pt(l2) + ' ' + pt(L) + 'C' + pt(hl[1]) + ' ' + pt(hl[2]) + ' ' + pt(hl[3]) + 'Z" fill="#fff" fill-opacity=".1"/>' +
      '<path d="M' + pt(A) + 'C' + pt(r1) + ' ' + pt(r2) + ' ' + pt(R) + 'C' + pt(hr[1]) + ' ' + pt(hr[2]) + ' ' + pt(hr[3]) + 'Z" fill="#000" fill-opacity=".17"/>' +
      '<path d="' + capL + '" fill="' + C.snow + '"/><path d="' + capR + '" fill="' + C.snowS + '"/>';
  }
  function firBody(tiers) {
    var out = '<path d="M43 124h14v22H43z" fill="#5a3418"/><path d="M43 124h5v22h-5z" fill="#7a4a22"/>', i;
    for (i = tiers.length - 1; i >= 0; i--) out += tier(tiers[i]);
    return out;
  }
  // The bulbs of a lit tree, in two sets that blink against each other, and the baubles, swags and star that stay on.
  function firLights(tiers) {
    var a = '', b = '', i, j, t, us, u, x, y, col, k = 0, s;
    for (i = 0; i < tiers.length; i++) {
      t = tiers[i]; us = i === 0 ? [-0.36, 0.36] : (i % 2 ? [-0.72, -0.24, 0.24, 0.72] : [-0.52, 0, 0.52]);
      for (j = 0; j < us.length; j++) {
        u = us[j]; x = 50 + u * t[2]; y = t[1] + t[3] * (1 - u * u) * 0.85 - 3.2; col = BULB[k % BULB.length]; k++;
        s = '<circle cx="' + n(x) + '" cy="' + n(y) + '" r="5.2" fill="' + col + '" fill-opacity=".26"/><circle cx="' + n(x) + '" cy="' + n(y) + '" r="2.7" fill="' + col + '"/><circle cx="' + n(x - 0.8) + '" cy="' + n(y - 0.9) + '" r=".8" fill="#fff" fill-opacity=".9"/>';
        if (k % 2) a += s; else b += s;
      }
    }
    return [a, b];
  }
  function firOrn(tiers) {
    var out = '', i, t, bc = [C.red, C.gold, C.blueL, C.red];
    for (i = 1; i < tiers.length; i++) {
      t = tiers[i];
      out += '<path d="M' + n(50 - t[2] * 0.88) + ' ' + n(t[1] - 3) + 'Q50 ' + n(t[1] + t[3] * 2) + ' ' + n(50 + t[2] * 0.88) + ' ' + n(t[1] - 3) + '" fill="none" stroke="' + C.goldL + '" stroke-opacity=".75" stroke-width="1.3" stroke-linecap="round"/>';
      out += '<circle cx="' + n(50 - t[2] * 0.9) + '" cy="' + n(t[1] - 1) + '" r="3.7" fill="' + bc[i % 4] + '"/><circle cx="' + n(50 - t[2] * 0.9 - 1) + '" cy="' + n(t[1] - 2.2) + '" r="1" fill="#fff" fill-opacity=".8"/>';
      out += '<circle cx="' + n(50 + t[2] * 0.9) + '" cy="' + n(t[1] - 1) + '" r="3.7" fill="' + bc[(i + 2) % 4] + '"/><circle cx="' + n(50 + t[2] * 0.9 - 1) + '" cy="' + n(t[1] - 2.2) + '" r="1" fill="#fff" fill-opacity=".8"/>';
    }
    var ty = tiers[0][0] - 5;
    return out + '<circle cx="50" cy="' + n(ty) + '" r="15" fill="' + C.gold + '" fill-opacity=".16"/>' + facet(50, ty, 10.5, 4.6, 5, C.goldL, C.gold);
  }
  function firSet(id, tiers) {
    var l = firLights(tiers);
    return sym(id, FIR_VB, firBody(tiers)) + sym(id + '-orn', FIR_VB, firOrn(tiers)) + sym(id + '-la', FIR_VB, l[0]) + sym(id + '-lb', FIR_VB, l[1]);
  }

  // ── gifts: a box, a lid, a ribbon and a bow ──────────────────────────────────────────────────────────────────────────────────────
  function gift(id, w, h, body, lid, rib, ribD, deco) {
    var cx = w / 2, by = 26, bh = h - by - 1, o = '', i, j;
    o += '<rect x="6" y="' + by + '" width="' + (w - 12) + '" height="' + bh + '" rx="3" fill="' + body + '"/>';
    if (deco === 'dots') { for (j = 0; j < 3; j++) for (i = 0; i < 4; i++) o += '<circle cx="' + n(11 + i * (w - 22) / 3 + (j % 2) * 4) + '" cy="' + n(by + 8 + j * (bh - 12) / 2.2) + '" r="1.9" fill="#fff" fill-opacity=".5"/>'; }
    if (deco === 'stripes') { for (i = 0; i < 5; i++) o += '<rect x="' + n(6 + (i * 2 + 0.5) * (w - 12) / 10) + '" y="' + by + '" width="' + n((w - 12) / 10) + '" height="' + bh + '" fill="' + C.red + '"/>'; }
    if (deco === 'bands') { o += '<rect x="6" y="' + n(by + bh * 0.62) + '" width="' + (w - 12) + '" height="' + n(bh * 0.14) + '" fill="#fff" fill-opacity=".38"/>'; }
    o += '<path d="M' + (w - 16) + ' ' + by + 'H' + (w - 9) + 'Q' + (w - 6) + ' ' + by + ' ' + (w - 6) + ' ' + (by + 3) + 'V' + (by + bh - 3) + 'Q' + (w - 6) + ' ' + (by + bh) + ' ' + (w - 9) + ' ' + (by + bh) + 'H' + (w - 16) + 'Z" fill="#000" fill-opacity=".17"/>';
    o += '<rect x="2" y="15" width="' + (w - 4) + '" height="13" rx="3.5" fill="' + lid + '"/><rect x="2" y="24" width="' + (w - 4) + '" height="4" rx="2" fill="#000" fill-opacity=".14"/>';
    o += '<rect x="' + (cx - 5) + '" y="15" width="10" height="' + (h - 16) + '" fill="' + rib + '"/><rect x="' + cx + '" y="15" width="5" height="' + (h - 16) + '" fill="#000" fill-opacity=".1"/>';
    o += '<path d="M' + cx + ' 15C' + (cx - 3) + ' 6 ' + (cx - 17) + ' 0 ' + (cx - 15) + ' 8C' + (cx - 14) + ' 14 ' + (cx - 6) + ' 16 ' + cx + ' 15Z" fill="' + rib + '"/><path d="M' + cx + ' 15C' + (cx + 3) + ' 6 ' + (cx + 17) + ' 0 ' + (cx + 15) + ' 8C' + (cx + 14) + ' 14 ' + (cx + 6) + ' 16 ' + cx + ' 15Z" fill="' + rib + '"/>';
    o += '<path d="M' + (cx - 3) + ' 13C' + (cx - 6) + ' 8 ' + (cx - 11) + ' 5 ' + (cx - 12) + ' 8C' + (cx - 11) + ' 11 ' + (cx - 7) + ' 13 ' + (cx - 3) + ' 13Z" fill="' + ribD + '" fill-opacity=".55"/><path d="M' + (cx + 3) + ' 13C' + (cx + 6) + ' 8 ' + (cx + 11) + ' 5 ' + (cx + 12) + ' 8C' + (cx + 11) + ' 11 ' + (cx + 7) + ' 13 ' + (cx + 3) + ' 13Z" fill="' + ribD + '" fill-opacity=".55"/>';
    o += '<circle cx="' + cx + '" cy="14.6" r="4.2" fill="' + rib + '" stroke="' + ribD + '" stroke-width="1.1"/>';
    return sym(id, '0 0 ' + w + ' ' + h, o);
  }

  // ── a candy cane: stripes clipped to the cane ──────────────────────────────────────────────────────────────────────────────────
  function cane() {
    var stripes = '', y;
    for (y = 96; y > -6; y -= 15) stripes += '<path d="M-6 ' + (y + 8) + 'L56 ' + (y - 14) + 'V' + (y - 6) + 'L-6 ' + (y + 16) + 'Z"/>';
    return '<clipPath id="xm-cc"><path d="M7 88V28A18 18 0 0 1 43 28V35A5 5 0 0 1 33 35V28A8 8 0 0 0 17 28V88Z"/></clipPath>' +
      sym('xm-cane', '0 6 50 86', '<g clip-path="url(#xm-cc)"><rect x="0" y="0" width="50" height="92" fill="' + C.snow + '"/><g fill="' + C.red + '">' + stripes + '</g>' +
        '<path d="M7 88V28A18 18 0 0 1 22 10.6" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="2.4" stroke-linecap="round"/>' +
        '<path d="M17 88V28A8 8 0 0 1 22 20.4M43 28V35" fill="none" stroke="#000" stroke-opacity=".14" stroke-width="3"/></g>');
  }

  // ── holly: three spiky leaves and three berries ────────────────────────────────────────────────────────────────────────────────
  function leaf(x, y, ang, s, fill, dark) {
    return '<g transform="translate(' + x + ' ' + y + ') rotate(' + ang + ') scale(' + s + ')"><path d="M0 0L3 -3L7 -7.5L11 -4.2L16 -9L21 -4.6L26 -6L30.5 -2.4L34 0L30.5 2.4L26 6L21 4.6L16 9L11 4.2L7 7.5L3 3Z" fill="' + fill + '" stroke="' + fill + '" stroke-width="1.6" stroke-linejoin="round"/>' +
      '<path d="M0 0L7 -7.5L11 -4.2L16 -9L21 -4.6L26 -6L30.5 -2.4L34 0Z" fill="#fff" fill-opacity=".1"/>' +
      '<path d="M1 0H30M10 0L15 -4M10 0L15 4M19 0L24 -3.4M19 0L24 3.4" fill="none" stroke="' + dark + '" stroke-opacity=".7" stroke-width="1.1" stroke-linecap="round"/></g>';
  }
  function berry(x, y, r) { return '<circle cx="' + n(x) + '" cy="' + n(y) + '" r="' + r + '" fill="' + C.red + '"/><path d="M' + n(x + r * 0.2) + ' ' + n(y + r) + 'A' + r + ' ' + r + ' 0 0 0 ' + n(x + r) + ' ' + n(y - r * 0.1) + 'A' + n(r * 1.3) + ' ' + n(r * 1.3) + ' 0 0 1 ' + n(x + r * 0.2) + ' ' + n(y + r) + 'Z" fill="#000" fill-opacity=".2"/><circle cx="' + n(x - r * 0.35) + '" cy="' + n(y - r * 0.4) + '" r="' + n(r * 0.28) + '" fill="#fff" fill-opacity=".85"/>'; }
  function holly() {
    return sym('xm-holly', '0 0 88 68', leaf(44, 50, -150, 1.05, '#1b7a40', '#0b3f22') + leaf(44, 50, -30, 1.05, '#238a4a', '#0b3f22') + leaf(44, 50, -92, 0.8, '#1b7a40', '#0b3f22') + berry(38, 47, 6) + berry(50, 48, 6) + berry(44, 38, 6));
  }

  // ── baubles: a cap, a round body in the colour the use gives it, a shaded side, a shine ───────────────────────────────────────────
  function bauble(id, deco) {
    var o = '<circle cx="20" cy="3.2" r="3" fill="none" stroke="' + C.goldD + '" stroke-width="1.5"/><path d="M16.5 11H23.5L26 17.5H14Z" fill="' + C.goldD + '"/><rect x="15.4" y="4.6" width="9.2" height="8" rx="1.6" fill="' + C.gold + '"/><rect x="15.4" y="4.6" width="9.2" height="2.6" rx="1.3" fill="' + C.goldL + '"/>';
    o += '<circle cx="20" cy="34" r="17.5" fill="currentColor"/><circle cx="20" cy="34" r="17.5" fill="#000" fill-opacity=".2"/><circle cx="18" cy="32" r="15.2" fill="currentColor"/>';
    if (deco === 'stripe') o += '<path d="M3.6 30Q20 38 36.4 30V36Q20 44 3.6 36Z" fill="#fff" fill-opacity=".6"/>';
    if (deco === 'dots') for (var i = 0; i < 6; i++) o += '<circle cx="' + n(20 + 11 * Math.cos(i * 1.0472 + 0.5)) + '" cy="' + n(36 + 9 * Math.sin(i * 1.0472 + 0.5)) + '" r="1.9" fill="#fff" fill-opacity=".7"/>';
    if (deco === 'zig') o += '<path d="M4 34L9 29L14 34L19 29L24 34L29 29L34 34L36.4 31.5" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>';
    o += '<path d="M8.6 30A12 12 0 0 1 17.5 20.6" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="2.6" stroke-linecap="round"/><circle cx="11.6" cy="35.4" r="1.5" fill="#fff" fill-opacity=".75"/>';
    return sym(id, '0 0 40 54', o);
  }
  function starOrn() {
    return sym('xm-star-orn', '0 0 44 50', '<circle cx="22" cy="3.4" r="3" fill="none" stroke="' + C.goldD + '" stroke-width="1.5"/><path d="M22 6.4V10" stroke="' + C.goldD + '" stroke-width="1.5"/>' + facet(22, 29, 19.5, 8.6, 5, C.goldL, C.gold) + '<circle cx="22" cy="29" r="3.4" fill="#fff" fill-opacity=".35"/>');
  }
  function bell() {
    return sym('xm-bell', '0 0 44 58',
      '<path d="M22 12C13.5 12 10.5 20 10.5 29C10.5 36 6.5 40 4 45H40C37.5 40 33.5 36 33.5 29C33.5 20 30.5 12 22 12Z" fill="' + C.gold + '"/>' +
      '<path d="M22 12C13.5 12 10.5 20 10.5 29C10.5 36 6.5 40 4 45H14C16 38 17 28 22 12Z" fill="#fff" fill-opacity=".2"/>' +
      '<path d="M30 17C32 24 31.4 33 35 41L40 45H34C33 38 31 33 30 17Z" fill="#000" fill-opacity=".16"/>' +
      '<path d="M14.6 21C13.6 27 14 33 11.6 40" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="2.4" stroke-linecap="round"/>' +
      '<rect x="1" y="44.4" width="42" height="6" rx="3" fill="' + C.goldD + '"/><rect x="1" y="44.4" width="42" height="2.4" rx="1.2" fill="#fff" fill-opacity=".25"/>' +
      '<circle cx="22" cy="52.6" r="4.4" fill="' + C.goldD + '"/><circle cx="20.8" cy="51.4" r="1.3" fill="#fff" fill-opacity=".5"/>' +
      '<path d="M22 12C14 2 5 4 8 10C10 14 17 13.5 22 12Z" fill="' + C.red + '"/><path d="M22 12C30 2 39 4 36 10C34 14 27 13.5 22 12Z" fill="' + C.red + '"/>' +
      '<path d="M20 12L15 21L18.4 19.6L19.6 22.4Z" fill="' + C.redL + '"/><path d="M24 12L29 21L25.6 19.6L24.4 22.4Z" fill="' + C.redD + '"/><circle cx="22" cy="11" r="3.8" fill="' + C.redD + '"/>');
  }


  // ── a wreath, a stocking and a gingerbread man (the last two hang from a loop at the top, so a string can hold them) ───────────────
  function wreath() {
    var o = '<circle cx="50" cy="50" r="33" fill="none" stroke="#0c4a27" stroke-width="20"/>', i, a, r, x, y, cols = ['#1d8a47', '#2fa75b', '#17703a'], bx = [20, 105, 195, 290];
    for (i = 0; i < 28; i++) {
      a = i * 360 / 28; r = 33 + (i % 2 ? 6 : -6); x = 50 + r * Math.cos(a * Math.PI / 180); y = 50 + r * Math.sin(a * Math.PI / 180);
      o += '<ellipse cx="' + n(x) + '" cy="' + n(y) + '" rx="10" ry="3.8" transform="rotate(' + n(a + 90 + (i % 2 ? 36 : -36)) + ' ' + n(x) + ' ' + n(y) + ')" fill="' + cols[i % 3] + '"/>';
    }
    for (i = 0; i < bx.length; i++) {
      a = bx[i] * Math.PI / 180; x = 50 + 33 * Math.cos(a); y = 50 + 33 * Math.sin(a);
      o += berry(x - 3.4, y + 2, 3.6) + berry(x + 3.6, y + 1, 3.6) + berry(x, y - 3.6, 3.6);
    }
    o += '<g fill="' + C.snow + '" fill-opacity=".9"><circle cx="33" cy="22" r="2.2"/><circle cx="72" cy="20" r="1.8"/><circle cx="84" cy="62" r="2"/><circle cx="14" cy="60" r="1.8"/></g>';
    o += '<path d="M50 83C36 70 22 76 28 88C32 95 45 90 50 83Z" fill="' + C.red + '"/><path d="M50 83C64 70 78 76 72 88C68 95 55 90 50 83Z" fill="' + C.red + '"/><path d="M47 85L40 101L48 97L50 101Z" fill="' + C.redD + '"/><path d="M53 85L60 101L52 97L50 101Z" fill="' + C.redL + '"/><path d="M50 83C42 78 34 78 31 84" fill="none" stroke="#fff" stroke-opacity=".3" stroke-width="2" stroke-linecap="round"/><circle cx="50" cy="84" r="5.4" fill="' + C.redD + '"/>';
    return sym('xm-wreath', '0 0 100 104', o);
  }
  function stocking() {
    return sym('xm-stocking', '0 -4 60 94',
      '<path d="M24 9C24 -1 36 -1 36 9" fill="none" stroke="' + C.gold + '" stroke-width="2.4" stroke-linecap="round"/>' +
      '<path d="M12 18H44V54C44 62 52 64 56 70C60 78 54 88 44 88C34 88 28 84 24 78C20 70 12 66 12 56Z" fill="' + C.red + '"/>' +
      '<path d="M12 18H22V60C20 64 24 72 28 80C26 80 24 78 24 78C20 70 12 66 12 56Z" fill="#fff" fill-opacity=".14"/><path d="M36 18H44V54C44 62 52 64 56 70C60 78 54 88 44 88C46 80 38 70 38 58Z" fill="#000" fill-opacity=".16"/>' +
      '<path d="M12 58C12 64 18 68 22 74L36 70C30 66 28 62 28 58Z" fill="' + C.green + '"/><path d="M44 80C50 82 54 78 56 72C58 78 54 88 44 88C40 88 36 87 34 85C38 85 41 83 44 80Z" fill="' + C.green + '"/>' +
      '<g fill="' + C.snow + '" fill-opacity=".85"><circle cx="22" cy="34" r="2.2"/><circle cx="34" cy="42" r="2.2"/><circle cx="24" cy="48" r="1.8"/><circle cx="36" cy="28" r="1.8"/></g>' +
      '<rect x="9" y="10" width="38" height="14" rx="7" fill="' + C.snow + '"/><rect x="9" y="19" width="38" height="5" rx="2.5" fill="' + C.snowS + '"/>' +
      '<g fill="' + C.snowS + '"><circle cx="17" cy="15" r="1.6"/><circle cx="26" cy="13" r="1.6"/><circle cx="35" cy="15" r="1.6"/><circle cx="42" cy="13" r="1.4"/></g>');
  }
  function ginger() {
    var body = '<circle cx="30" cy="14" r="11"/><rect x="19" y="22" width="22" height="28" rx="9"/><path d="M8 30H52M24 50L16 64M36 50L44 64" fill="none" stroke="#000" stroke-width="10" stroke-linecap="round"/>';
    return sym('xm-ginger', '0 -8 60 78',
      '<path d="M30 3C30 -4 22 -4 22 1M30 3C30 -4 38 -4 38 1" fill="none" stroke="' + C.red + '" stroke-width="2.6" stroke-linecap="round"/>' +
      '<g fill="#8c4f1e" stroke="#8c4f1e" stroke-width="3.2" stroke-linejoin="round">' + body.replace('stroke="#000"', 'stroke="#8c4f1e"') + '</g>' +
      '<g fill="#c9803d" stroke="#c9803d" stroke-width="0">' + body.replace('stroke="#000"', 'stroke="#c9803d"') + '</g>' +
      '<path d="M22 8C24 5 30 3 36 5C32 4 26 5 22 8Z" fill="#e0a05a" fill-opacity=".7"/>' +
      '<circle cx="26" cy="12" r="1.8" fill="' + C.snow + '"/><circle cx="34" cy="12" r="1.8" fill="' + C.snow + '"/><path d="M25 17Q30 22 35 17" fill="none" stroke="' + C.snow + '" stroke-width="1.8" stroke-linecap="round"/>' +
      '<circle cx="30" cy="30" r="2.4" fill="' + C.red + '"/><circle cx="30" cy="38" r="2.4" fill="' + C.green + '"/><circle cx="30" cy="46" r="2.4" fill="' + C.red + '"/>' +
      '<path d="M5 33Q8 28 11 33Q14 28 17 33M43 33Q46 28 49 33Q52 28 55 33" fill="none" stroke="' + C.snow + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" transform="translate(0 -4)"/>' +
      '<path d="M12 60Q15 55 18 60M42 60Q45 55 48 60" fill="none" stroke="' + C.snow + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>');
  }

  // ── snow: a crystal, a thick star and a soft dot ──────────────────────────────────────────────────────────────────────────────────
  function flakes() {
    var arm = 'M20 3V37M20 9L14.6 4.2M20 9L25.4 4.2M20 31L14.6 35.8M20 31L25.4 35.8M20 16L15.4 11.8M20 16L24.6 11.8M20 24L15.4 28.2M20 24L24.6 28.2';
    var bar = 'M20 5V35M14.4 10.4L20 15.6L25.6 10.4M14.4 29.6L20 24.4L25.6 29.6';
    return sym('xm-flake-a', '0 0 40 40', '<g fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"><path d="' + arm + '"/><path d="' + arm + '" transform="rotate(60 20 20)"/><path d="' + arm + '" transform="rotate(120 20 20)"/></g><circle cx="20" cy="20" r="2.8" fill="currentColor"/>') +
      sym('xm-flake-b', '0 0 40 40', '<g fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="' + bar + '"/><path d="' + bar + '" transform="rotate(60 20 20)"/><path d="' + bar + '" transform="rotate(120 20 20)"/></g>') +
      sym('xm-flake-c', '0 0 24 24', '<circle cx="12" cy="12" r="11" fill="currentColor" fill-opacity=".28"/><circle cx="12" cy="12" r="6.6" fill="currentColor"/>');
  }

  // ── lights and stars ───────────────────────────────────────────────────────────────────────────────────────────────────────────
  function lights() {
    return sym('xm-bulb', '-14 -2 28 34',
      '<circle cy="17" r="12.6" fill="currentColor" fill-opacity=".15"/><circle cy="17" r="9" fill="currentColor" fill-opacity=".2"/>' +
      '<path d="M-3.4 0H3.4V6.4H-3.4Z" fill="#14301f"/><path d="M-3.4 2.4H3.4M-3.4 4.4H3.4" stroke="#3b7a54" stroke-width=".8"/>' +
      '<path d="M0 5C-6.6 5 -7.4 12.4 -5.4 18C-4.2 21.6 -2 24.6 0 27C2 24.6 4.2 21.6 5.4 18C7.4 12.4 6.6 5 0 5Z" fill="currentColor"/>' +
      '<path d="M-2.6 9C-3.4 12.4 -3 15.6 -1.8 18.2" fill="none" stroke="#fff" stroke-opacity=".65" stroke-width="1.8" stroke-linecap="round"/>');
  }
  function stars() {
    return sym('xm-star5', '0 0 24 24', '<path d="' + poly(starPts(12, 12.6, 11.6, 5, 5)) + '" fill="currentColor"/>') +
      sym('xm-bigstar', '-50 -50 100 100', '<path d="M0 -49C2 -12 12 -2 49 0C12 2 2 12 0 49C-2 12 -12 2 -49 0C-12 -2 -2 -12 0 -49Z" fill="#fff" fill-opacity=".85"/>' + facet(0, 0, 30, 13, 8, C.goldL, C.gold) + '<circle r="6" fill="#fff"/>');
  }

  // ── people and animals ─────────────────────────────────────────────────────────────────────────────────────────────────────────
  function ball(cx, cy, r, base, lit) { var o = r * 0.08; return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + base + '"/><circle cx="' + n(cx - o) + '" cy="' + n(cy - o) + '" r="' + n(r - o * 1.42) + '" fill="' + lit + '"/>'; }
  function snowman() {
    return sym('xm-snowman', '0 0 100 150',
      '<ellipse cx="50" cy="146" rx="37" ry="4" fill="#06141c" fill-opacity=".35"/>' +
      '<g fill="none" stroke="#6b3f1e" stroke-width="3.4" stroke-linecap="round"><path d="M28 82L6 66M13 71L8 60M16 74L5 74"/><path d="M72 82L94 64M87 69L92 58M84 72L96 72"/></g>' +
      ball(50, 113, 33, C.snowB, C.snow) + ball(50, 74, 25, C.snowB, C.snow) + ball(50, 40, 19.5, C.snowB, C.snow) +
      '<path d="M31 56Q50 68 69 56L68 64Q50 76 32 64Z" fill="' + C.green + '"/><path d="M31.5 60.4Q50 72 68.5 60.4" fill="none" stroke="' + C.snow + '" stroke-width="2.4"/><path d="M58 68L64 90L72 87L68 64Z" fill="' + C.green + '"/><path d="M60.4 76.5L69.4 73.5" stroke="' + C.snow + '" stroke-width="2.4"/><path d="M64 90L72 87M66 91L74 88.6" stroke="' + C.green + '" stroke-width="1.6" stroke-linecap="round"/>' +
      '<path d="M31 34C29 16 71 16 69 34Z" fill="' + C.red + '"/><path d="M31 34C29 16 50 17 50 19C45 22 36 26 31 34Z" fill="#fff" fill-opacity=".14"/><rect x="29" y="30" width="42" height="9.4" rx="4.7" fill="' + C.snow + '"/><path d="M36 31V38M43 31V38M50 31V38M57 31V38M64 31V38" stroke="' + C.snowS + '" stroke-width="1.6"/><circle cx="50" cy="16" r="6.2" fill="' + C.snow + '"/><circle cx="48" cy="14" r="2.2" fill="#fff"/>' +
      '<circle cx="43" cy="41" r="2.3" fill="' + C.ink + '"/><circle cx="57" cy="41" r="2.3" fill="' + C.ink + '"/><circle cx="43.7" cy="40.2" r=".8" fill="#fff"/><circle cx="57.7" cy="40.2" r=".8" fill="#fff"/>' +
      '<path d="M50 44.4L69 48.6L50 51.6Z" fill="#f08a2c"/><path d="M50 44.4L69 48.6L50 47Z" fill="#ffb04a"/>' +
      '<ellipse cx="37.6" cy="48" rx="3.8" ry="2.5" fill="#ff8f9f" fill-opacity=".5"/><ellipse cx="62.6" cy="52" rx="3" ry="2" fill="#ff8f9f" fill-opacity=".4"/>' +
      '<g fill="' + C.ink + '"><circle cx="42.6" cy="52.6" r="1.3"/><circle cx="46" cy="55" r="1.3"/><circle cx="50.4" cy="55.6" r="1.3"/></g>' +
      '<g fill="' + C.ink + '"><circle cx="50" cy="71" r="2.8"/><circle cx="50" cy="82" r="2.8"/><circle cx="50" cy="93" r="2.8"/></g>');
  }
  function santa() {
    return sym('xm-santa', '0 0 104 150',
      '<ellipse cx="56" cy="146" rx="42" ry="4" fill="#06141c" fill-opacity=".35"/>' +
      // the sack, with a gift and a cane peeking out
      '<path d="M4 146C-3 118 5 98 20 91H38C48 102 50 126 46 146Z" fill="#b98a4a"/><path d="M4 146C-3 118 5 98 20 91C13 104 13 128 16 146Z" fill="#d6aa66" fill-opacity=".7"/><path d="M38 91C48 102 50 126 46 146H38C42 126 41 106 32 93Z" fill="#7d5524" fill-opacity=".5"/>' +
      '<rect x="13" y="75" width="16" height="16" rx="2" fill="' + C.blue + '"/><rect x="19.5" y="75" width="4" height="16" fill="' + C.snow + '"/><path d="M21.5 75C17 66 12 69 15 74ZM21.5 75C26 66 31 69 28 74Z" fill="' + C.snow + '"/>' +
      '<path d="M32 92V76A6 6 0 0 1 44 76" fill="none" stroke="' + C.snow + '" stroke-width="3.6" stroke-linecap="round"/><path d="M32 86V78M44 78" fill="none" stroke="' + C.red + '" stroke-width="3.6" stroke-dasharray="3 4"/>' +
      '<path d="M16 93C22 101 34 101 40 93L38 88C32 94 22 94 18 88Z" fill="' + C.red + '"/>' +
      // boots and legs
      '<rect x="46" y="116" width="15" height="20" fill="#a81f30"/><rect x="65" y="116" width="15" height="20" fill="#a81f30"/>' +
      '<rect x="44" y="131" width="19" height="17" rx="6.5" fill="' + C.ink + '"/><rect x="63" y="131" width="19" height="17" rx="6.5" fill="' + C.ink + '"/><rect x="44" y="143" width="19" height="5" rx="2.5" fill="#3a3a48"/><rect x="63" y="143" width="19" height="5" rx="2.5" fill="#3a3a48"/>' +
      // coat
      '<path d="M40 127C36 101 38 81 44 69C50 61 76 61 82 69C88 81 90 101 86 127Z" fill="' + C.red + '"/><path d="M70 63C78 63 82 66 82 69C88 81 90 101 86 127H76C80 101 78 81 70 63Z" fill="' + C.redD + '" fill-opacity=".5"/>' +
      '<rect x="38" y="120" width="50" height="9" rx="4.5" fill="' + C.snow + '"/><rect x="60" y="66" width="6" height="56" fill="' + C.snow + '"/>' +
      '<rect x="39" y="96" width="48" height="10" fill="' + C.ink + '"/><rect x="56" y="94" width="14" height="14" rx="2.5" fill="' + C.gold + '"/><rect x="60" y="98" width="6" height="6" rx="1" fill="' + C.ink + '"/>' +
      // arms: one down on the sack, one up in a wave
      '<path d="M46 75L35 100" stroke="' + C.red + '" stroke-width="13" stroke-linecap="round"/><circle cx="34" cy="102" r="7.2" fill="' + C.snow + '"/><circle cx="33" cy="106" r="6.2" fill="' + C.ink + '"/>' +
      '<g class="xm-wave"><path d="M80 76L92 58" stroke="' + C.red + '" stroke-width="13" stroke-linecap="round"/><circle cx="93" cy="56" r="7.2" fill="' + C.snow + '"/><circle cx="95" cy="49" r="6.4" fill="' + C.ink + '"/></g>' +
      // head: beard, face, moustache, cheeks, nose, eyes
      '<path d="M42 44C40 70 52 85 63 85C74 85 86 70 84 44C84 36 74 32 63 32C52 32 42 36 42 44Z" fill="' + C.snow + '"/><path d="M63 85C74 85 86 70 84 44C80 63 74 75 63 79Z" fill="' + C.snowS + '"/>' +
      '<ellipse cx="63" cy="49" rx="14.5" ry="11.5" fill="#f6c9a6"/><circle cx="52.4" cy="53.4" r="3.6" fill="#f0828c" fill-opacity=".55"/><circle cx="73.6" cy="53.4" r="3.6" fill="#f0828c" fill-opacity=".55"/>' +
      '<circle cx="57" cy="46" r="1.9" fill="' + C.ink + '"/><circle cx="69" cy="46" r="1.9" fill="' + C.ink + '"/><path d="M53 41.6Q57 39.4 61 41.2M65 41.2Q69 39.4 73 41.6" fill="none" stroke="' + C.snow + '" stroke-width="2.2" stroke-linecap="round"/>' +
      '<circle cx="63" cy="52" r="3.8" fill="#f09a9a"/><path d="M63 57C56 53 47 57 49 63C53 65 60 63 63 59C66 63 73 65 77 63C79 57 70 53 63 57Z" fill="' + C.snow + '" stroke="' + C.snowS + '" stroke-width="1"/><path d="M59 66Q63 70.4 67 66" fill="#a8283a"/>' +
      // hat
      '<path d="M44 38C42 20 54 8 72 12C84 15 86 30 84 38Z" fill="' + C.red + '"/><path d="M47 36C46 25 53 15 63 13C57 20 54 28 54 36Z" fill="#fff" fill-opacity=".14"/><path d="M72 12C87 8 98 16 93 31" fill="none" stroke="' + C.red + '" stroke-width="10" stroke-linecap="round"/><circle cx="93" cy="33" r="6.6" fill="' + C.snow + '"/><rect x="40" y="33" width="48" height="11" rx="5.5" fill="' + C.snow + '"/>');
  }
  // A reindeer in a gallop (it pulls the sleigh) and one standing in the snow (at the foot of the page); both look to the right.
  function deer() {
    return sym('xm-deer', '0 -10 60 52',
      '<g fill="none" stroke="#d4b07a" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M48 3C48 -3 44 -7 39 -8M45.6 -1.6L41.6 -7.4M49.4 -0.4L53.6 -5.4"/></g>' +
      '<g fill="none" stroke="#4a2a14" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M36 24L49 27.6M21 25L8 27"/></g>' +
      '<path d="M12.4 15.4L6.6 13L9.6 19Z" fill="#f4f8fb"/>' +
      '<ellipse cx="27" cy="19" rx="16" ry="8" transform="rotate(-6 27 19)" fill="#7b4a2a"/><path d="M13.6 22C20 28 35 28 41.6 21.6C37 25 20 25.4 13.6 22Z" fill="#d9bd92"/><ellipse cx="27" cy="15.4" rx="12" ry="3.2" transform="rotate(-6 27 15)" fill="#a8683a" fill-opacity=".6"/>' +
      '<g fill="none" stroke="#5a3317" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M33 25L43 30.4L46.4 38M24 26L15.6 32L8 37.4"/></g>' +
      '<g fill="#2c1708"><circle cx="49.4" cy="27.8" r="1.7"/><circle cx="46.6" cy="38.4" r="1.8"/><circle cx="8" cy="27" r="1.7"/><circle cx="7.6" cy="37.6" r="1.8"/></g>' +
      '<path d="M37 14L47 4L53 8L48 18L40 23Z" fill="#7b4a2a"/><ellipse cx="51" cy="6" rx="6.6" ry="4.2" transform="rotate(-24 51 6)" fill="#8d5733"/><ellipse cx="56" cy="9" rx="3.6" ry="2.7" fill="#6b3f22"/><circle cx="52.6" cy="4.4" r="1.2" fill="#fff"/>');
  }
  function sleigh() {
    var o = '', i, xs = [150, 200, 250], ys = [48, 38, 26], w = 48, sc = w / 60;
    // dust behind the sleigh
    o += '<path d="M2 66L10 62L18 66L10 70Z" fill="' + C.goldL + '" fill-opacity=".9"/><path d="M20 58L25 55L30 58L25 61Z" fill="#fff" fill-opacity=".8"/><path d="M12 80L16 78L20 80L16 82Z" fill="' + C.goldL + '" fill-opacity=".7"/><circle cx="32" cy="72" r="2" fill="#fff" fill-opacity=".6"/><circle cx="24" cy="70" r="1.4" fill="' + C.goldL + '" fill-opacity=".7"/>';
    // reins, then the three reindeer (the leader has a red nose)
    o += '<path d="M128 68L172 64L222 55L272 42" fill="none" stroke="#e8c76a" stroke-width="1.5" stroke-opacity=".9"/>';
    for (i = 0; i < 3; i++) o += '<use href="#xm-deer" x="' + xs[i] + '" y="' + ys[i] + '" width="' + w + '" height="' + n(w * 52 / 60) + '"/>';
    o += '<circle cx="' + n(xs[2] + 58.6 * sc) + '" cy="' + n(ys[2] + 19.6 * sc) + '" r="5" fill="#ff4056" fill-opacity=".35"/><circle cx="' + n(xs[2] + 58.6 * sc) + '" cy="' + n(ys[2] + 19.6 * sc) + '" r="2.6" fill="#ff4056"/>';
    // runners, body, sack, Santa
    o += '<path d="M44 90H118Q130 90 132 78" fill="none" stroke="#e8b84a" stroke-width="3.6" stroke-linecap="round"/><path d="M60 90V78M104 90V78" stroke="#e8b84a" stroke-width="3"/>';
    o += '<path d="M44 74C42 62 48 56 58 56H120C126 56 128 62 126 68C122 82 110 86 100 86H58C50 86 44 82 44 74Z" fill="' + C.red + '"/><path d="M44 74C42 62 48 56 58 56H120C126 56 128 62 126 68L44 70Z" fill="#fff" fill-opacity=".12"/><path d="M48 66H124" stroke="' + C.gold + '" stroke-width="3" stroke-linecap="round"/><path d="M48 78Q80 84 118 76" fill="none" stroke="' + C.redD + '" stroke-width="2.4" stroke-linecap="round" stroke-opacity=".7"/>';
    o += '<path d="M44 74C36 72 34 58 42 52" fill="none" stroke="#e8b84a" stroke-width="3.6" stroke-linecap="round"/>';
    o += '<path d="M44 60C40 40 56 32 68 44L72 60Z" fill="#b98a4a"/><path d="M44 60C40 40 56 32 60 38C52 42 48 50 50 60Z" fill="#d6aa66" fill-opacity=".7"/><rect x="50" y="30" width="13" height="13" rx="2" fill="' + C.green + '" transform="rotate(-12 56 36)"/><rect x="54" y="30" width="4" height="13" fill="' + C.red + '" transform="rotate(-12 56 36)"/>';
    o += '<path d="M72 60C70 44 92 40 98 60Z" fill="' + C.red + '"/><circle cx="86" cy="38" r="9" fill="#f6c9a6"/><path d="M76 40C76 54 86 56 96 40C96 46 90 52 86 52C82 52 76 48 76 40Z" fill="' + C.snow + '"/><path d="M77 36C76 26 88 22 98 28L94 36Z" fill="' + C.red + '"/><path d="M98 28C104 30 105 36 102 40" fill="none" stroke="' + C.red + '" stroke-width="5" stroke-linecap="round"/><circle cx="102" cy="42" r="3.6" fill="' + C.snow + '"/><rect x="76" y="34" width="21" height="5" rx="2.5" fill="' + C.snow + '"/>';
    o += '<path d="M92 56L104 50" stroke="' + C.red + '" stroke-width="6" stroke-linecap="round"/><circle cx="106" cy="49" r="3.4" fill="' + C.ink + '"/>';
    return sym('xm-sleigh', '0 -4 300 100', o);
  }
  function standDeer() {
    return sym('xm-reindeer', '0 0 130 130',
      '<ellipse cx="62" cy="126" rx="44" ry="4" fill="#06141c" fill-opacity=".35"/>' +
      '<path d="M44 92L42 119M84 92L86 119" stroke="#6b3a1e" stroke-width="7.4" stroke-linecap="round"/><path d="M39 123H47M82 123H90" stroke="' + C.brownD + '" stroke-width="5" stroke-linecap="round"/>' +
      '<ellipse cx="62" cy="82" rx="34" ry="20" fill="' + C.brownL + '"/><path d="M33 92C43 106 81 106 91 92C85 100 41 100 33 92Z" fill="#e7cfa9"/><ellipse cx="62" cy="72" rx="26" ry="6" fill="#fff" fill-opacity=".1"/>' +
      '<path d="M50 94L51 119M74 94L76 119" stroke="' + C.brownL + '" stroke-width="7.4" stroke-linecap="round"/><path d="M46 123H55M72 123H81" stroke="' + C.brownD + '" stroke-width="5" stroke-linecap="round"/>' +
      '<path d="M30 74C23 73 21 66 25 62C30 66 32 70 33 75Z" fill="' + C.snow + '"/>' +
      '<path d="M84 70C90 56 93 46 97 38L110 44C106 54 104 66 100 80Z" fill="' + C.brownL + '"/>' +
      '<g fill="none" stroke="#d6b27a" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M104 30C104 18 98 10 90 8M99 17L93 20M102 22L96 28M96 10L97 3"/><path d="M110 30C112 20 108 12 104 8" stroke-opacity=".7"/></g>' +
      '<path d="M98 36C92 32 90 25 94 23C98 25 101 29 101 35Z" fill="#8f5530"/>' +
      '<ellipse cx="106" cy="40" rx="12" ry="9.5" transform="rotate(-18 106 40)" fill="#b4733f"/><ellipse cx="116" cy="46" rx="7" ry="5.6" transform="rotate(-18 116 46)" fill="#c58850"/>' +
      '<circle cx="121.4" cy="46.4" r="6.4" fill="#ff4056" fill-opacity=".3"/><circle cx="121.4" cy="46.4" r="3.6" fill="#ff4056"/><circle cx="120.4" cy="45.3" r="1" fill="#fff" fill-opacity=".8"/>' +
      '<circle cx="108" cy="37.4" r="2.1" fill="' + C.ink + '"/><circle cx="108.7" cy="36.7" r=".7" fill="#fff"/>' +
      '<path d="M85 67C92 74 98 76 103 74" fill="none" stroke="' + C.red + '" stroke-width="6" stroke-linecap="round"/><circle cx="95" cy="77.4" r="3.6" fill="' + C.gold + '"/><circle cx="94.2" cy="76.6" r="1.1" fill="#fff" fill-opacity=".7"/><circle cx="102.6" cy="73.4" r="2.6" fill="' + C.gold + '"/>');
  }
  // A snowdrift for a corner (it is mirrored with CSS for the other side).
  function drift() {
    return sym('xm-drift', '0 0 260 80', '<path d="M0 80C16 66 42 50 84 46C108 30 146 26 178 40C208 36 238 54 260 80Z" fill="url(#xm-dg2)"/><path d="M0 80C22 68 50 56 84 52C110 38 146 34 178 46C208 44 240 58 260 80Z" fill="url(#xm-dg)"/>' +
      '<path d="M84 46C108 30 146 26 178 40C150 36 118 42 96 54Z" fill="#fff" fill-opacity=".9"/>' +
      '<path d="M120 52L123 58L129 61L123 64L120 70L117 64L111 61L117 58Z" fill="#fff" fill-opacity=".85"/><path d="M196 60L198 64L202 66L198 68L196 72L194 68L190 66L194 64Z" fill="#fff" fill-opacity=".8"/>');
  }

  // ── a strip of the things along the top of a section: tiles that repeat across it (patterns), each in a still set and two sets that blink against each other ──
  var TW = 200, WIRE = '#4f9a6c';
  function swagY(t, sag) { return 4 + 4 * sag * t * (1 - t); }
  function pat(id, h, body) { return '<pattern id="' + id + '" width="' + TW + '" height="' + h + '" patternUnits="userSpaceOnUse">' + body + '</pattern>'; }
  function pair(id, h, items) {                      // the items take turns: one set blinks while the other is on
    var a = '', b = '';
    items.forEach(function (it, i) { if (i % 2) b += it; else a += it; });
    return pat(id + '-a', h, a) + pat(id + '-b', h, b);
  }
  function anchors(y) { return '<circle cx="0" cy="' + y + '" r="2.8" fill="#bcd8c6"/><circle cx="' + TW + '" cy="' + y + '" r="2.8" fill="#bcd8c6"/>'; }
  function glint(x, y, col) { return '<circle cx="' + n(x) + '" cy="' + n(y) + '" r="5.2" fill="' + col + '" fill-opacity=".25"/><circle cx="' + n(x) + '" cy="' + n(y) + '" r="2.2" fill="' + col + '"/>'; }
  function bulbAt(x, y, col) {
    return '<g transform="translate(' + n(x) + ' ' + n(y) + ')"><circle cy="10" r="7.6" fill="' + col + '" fill-opacity=".22"/><path d="M-2.2 0H2.2V3.4H-2.2Z" fill="#14301f"/><path d="M0 2.6C-4.4 2.6 -5 7.6 -3.5 11.4C-2.6 14 -1.2 15.8 0 17C1.2 15.8 2.6 14 3.5 11.4C5 7.6 4.4 2.6 0 2.6Z" fill="' + col + '"/><ellipse cx="-1.4" cy="7.4" rx=".9" ry="2.3" fill="#fff" fill-opacity=".55"/></g>';
  }
  function swagLights(name, cols) {
    return pair('xm-lt-' + name, 44, cols.map(function (c, i) { var t = (i + 0.5) / cols.length; return bulbAt(TW * t, swagY(t, 14), c); }));
  }
  function iceLights(name, cols) {
    var xs = [16, 47, 80, 112, 146, 178], ls = [1.5, 1.0, 1.9, 1.2, 1.7, 1.0];
    return pair('xm-ic-' + name, 64, xs.map(function (x, i) {
      var c = cols[i % cols.length];
      return '<g transform="translate(' + x + ' 3) scale(1 ' + ls[i] + ')"><ellipse cy="11" rx="6" ry="13" fill="' + c + '" fill-opacity=".2"/><path d="M-3.4 0H3.4L2.6 8Q1.4 20 0 25Q-1.4 20 -2.6 8Z" fill="' + c + '"/><path d="M-1.2 3Q-1.6 11 -0.4 18" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="1.2" stroke-linecap="round"/></g>';
    }));
  }
  function paperStars() {
    var sp = [[26, 14, 9, 0], [72, 30, 11, 1], [120, 18, 8, 0], [164, 32, 10, 1]];
    return pair('xm-st', 58, sp.map(function (a) {
      var cs = a[3] ? [C.snow, C.snowS] : [C.goldL, C.gold];
      return '<path d="M' + a[0] + ' 3V' + (a[1] + 2) + '" stroke="' + WIRE + '" stroke-width="1.1"/>' + facet(a[0], a[1] + a[2], a[2], a[2] * 0.44, 5, cs[0], cs[1]);
    }));
  }
  function pennants() {
    var cs = [C.red, C.snow, C.green, C.gold, C.red, C.snow, C.green, C.gold], flags = '', i, t, x, y, glints = [];
    for (i = 0; i < 8; i++) {
      t = (i + 0.5) / 8; x = TW * t; y = swagY(t, 12);
      flags += '<path d="M' + n(x - 9.5) + ' ' + n(y - 0.4) + 'L' + n(x + 9.5) + ' ' + n(y - 0.4) + 'L' + n(x) + ' ' + n(y + 24) + 'Z" fill="' + cs[i] + '"/><path d="M' + n(x - 9.5) + ' ' + n(y - 0.4) + 'L' + n(x) + ' ' + n(y - 0.4) + 'L' + n(x) + ' ' + n(y + 24) + 'Z" fill="#fff" fill-opacity=".14"/>';
    }
    for (i = 0; i < 4; i++) { t = i / 4 + 0.125; glints.push(glint(TW * t, swagY(t, 12) + 30, C.goldL)); }
    return pat('xm-pn-w', 48, '<path d="M0 4Q100 28 200 4" fill="none" stroke="' + WIRE + '" stroke-width="1.6"/>' + anchors(4) + flags) + pair('xm-pn', 48, glints);
  }
  function garland() {
    var path = 'M0 8Q100 40 200 8', body = '', glints = [], i, t, bc = [C.red, C.gold, C.red, C.blueL, C.gold];
    body += '<path d="' + path + '" fill="none" stroke="#10532c" stroke-width="13" stroke-linecap="round"/><path d="' + path + '" fill="none" stroke="#1f8a48" stroke-width="12" stroke-linecap="round" stroke-dasharray="2.4 3.6"/><path d="' + path + '" fill="none" stroke="#2fa75b" stroke-width="6" stroke-linecap="round" stroke-dasharray="1.8 5.2" transform="translate(0 -2)"/>';
    body += '<path d="' + path + '" fill="none" stroke="#fff" stroke-opacity=".85" stroke-width="2.6" stroke-linecap="round" stroke-dasharray="7 15" transform="translate(0 -5.4)"/>';
    for (i = 0; i < 5; i++) { t = 0.1 + i * 0.2; body += '<circle cx="' + n(TW * t) + '" cy="' + n(swagY(t, 16) + 4) + '" r="4.4" fill="' + bc[i] + '"/><circle cx="' + n(TW * t - 1.3) + '" cy="' + n(swagY(t, 16) + 2.6) + '" r="1.2" fill="#fff" fill-opacity=".8"/>'; }
    body += '<g fill="' + C.red + '"><path d="M0 8C-5 -1 -14 2 -11 8C-9 12 -4 11 0 8Z"/><path d="M0 8C5 -1 14 2 11 8C9 12 4 11 0 8Z"/><path d="M' + TW + ' 8C' + (TW - 5) + ' -1 ' + (TW - 14) + ' 2 ' + (TW - 11) + ' 8C' + (TW - 9) + ' 12 ' + (TW - 4) + ' 11 ' + TW + ' 8Z"/><path d="M' + TW + ' 8C' + (TW + 5) + ' -1 ' + (TW + 14) + ' 2 ' + (TW + 11) + ' 8C' + (TW + 9) + ' 12 ' + (TW + 4) + ' 11 ' + TW + ' 8Z"/></g><circle cx="0" cy="8" r="3.4" fill="' + C.redD + '"/><circle cx="' + TW + '" cy="8" r="3.4" fill="' + C.redD + '"/>';
    for (i = 0; i < 6; i++) { t = 0.08 + i * 0.168; glints.push(glint(TW * t, swagY(t, 16) + 7, C.goldL)); }
    return pat('xm-gl-w', 52, body) + pair('xm-gl', 52, glints);
  }

  // ── the colours of every gradient and the two shared patterns ───────────────────────────────────────────────────────────────────
  var GRAD =
    '<linearGradient id="xm-tg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b4526"/><stop offset=".5" stop-color="#17703a"/><stop offset="1" stop-color="#209050"/></linearGradient>' +
    '<linearGradient id="xm-snowg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#eef7fc"/><stop offset=".45" stop-color="#bcd8ea"/><stop offset="1" stop-color="#5f8fae"/></linearGradient>' +
    '<linearGradient id="xm-snowg2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b6d2e6"/><stop offset="1" stop-color="#3f6f8e"/></linearGradient>' +
    '<linearGradient id="xm-ridge" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b7396"/><stop offset="1" stop-color="#0f3040"/></linearGradient>' +
    '<linearGradient id="xm-gnd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e6f2f9"/><stop offset=".5" stop-color="#a9c8dc"/><stop offset="1" stop-color="#0c2a26"/></linearGradient>' +
    '<linearGradient id="xm-dg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#b3d0e2"/></linearGradient>' +
    '<linearGradient id="xm-dg2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cfe2ee"/><stop offset="1" stop-color="#7ea3bd"/></linearGradient>' +
    '<linearGradient id="xm-gnd2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#86aec9"/><stop offset="1" stop-color="#0a2420"/></linearGradient>';

  var DEFS = GRAD + flakes() + lights() + stars() + bauble('xm-bauble', 'plain') + bauble('xm-bauble-s', 'stripe') + bauble('xm-bauble-d', 'dots') + bauble('xm-bauble-z', 'zig') + starOrn() + bell() + cane() + holly() +
    wreath() + stocking() + ginger() + firSet('xm-fir', FIR4) + firSet('xm-fir3', FIR3) +
    gift('xm-gift-a', 60, 56, C.red, '#dd3a4c', C.gold, C.goldD, 'none') + gift('xm-gift-b', 56, 60, C.green, '#27904f', C.red, C.redD, 'bands') + gift('xm-gift-c', 64, 50, C.blue, '#4f9be3', C.snow, C.snowB, 'dots') +
    gift('xm-gift-d', 50, 74, C.gold, '#f7d878', C.red, C.redD, 'none') + gift('xm-gift-e', 54, 52, '#e4eef5', '#f8fbfd', C.green, C.greenD, 'dots') + gift('xm-gift-f', 60, 60, C.snow, '#ffffff', C.green, C.greenD, 'stripes') +
    sym('xm-stack', '0 0 132 124', '<use href="#xm-gift-c" x="0" y="72" width="64" height="50"/><use href="#xm-gift-a" x="68" y="64" width="62" height="58"/><use href="#xm-gift-e" x="32" y="6" width="58" height="56"/>') +
    snowman() + santa() + deer() + sleigh() + standDeer() + drift() +
    swagLights('multi', BULB) + swagLights('warm', ['#ffe9b0', '#ffd98a', '#fff3d2', '#ffd98a', '#ffe9b0']) + swagLights('rg', ['#ff4056', '#3fd47a', '#ff4056', '#3fd47a']) + swagLights('cool', ['#8fd3ff', '#f2fbff', '#4aa8ff', '#f2fbff', '#8fd3ff']) + swagLights('gold', ['#ffd45a', '#fff0b0', '#ffd45a', '#fff0b0', '#ffd45a']) +
    iceLights('cool', ['#e8f7ff', '#9fd8ff']) + iceLights('warm', ['#fff0c8', '#ffd98a']) + paperStars() + pennants() + garland() +
    pat('xm-lw', 44, '<path d="M0 4Q100 32 200 4" fill="none" stroke="' + WIRE + '" stroke-width="1.8"/>' + anchors(4)) +
    pat('xm-icw', 64, '<path d="M0 3H200" fill="none" stroke="' + WIRE + '" stroke-width="1.8"/>') +
    pat('xm-stw', 58, '<path d="M0 3H200" fill="none" stroke="' + WIRE + '" stroke-width="1.6"/>');

  // ── the string of lights along the top of the hero: a wire that sags between hooks, and bulbs that each blink on their own beat ───
  function heroLights(k) {
    var r = k.rng(21), out = '<svg class="xm-lights" viewBox="0 0 1600 72" preserveAspectRatio="xMidYMin slice" aria-hidden="true" focusable="false">', segs = 8, w = 200, sag = 21, i, j, d = 'M0 5', x, y, t, c = 0, cls, s = 1.12;
    for (i = 0; i < segs; i++) d += 'Q' + (i * w + w / 2) + ' ' + (5 + 2 * sag) + ' ' + ((i + 1) * w) + ' 5';
    out += '<path d="' + d + '" fill="none" stroke="#6bb88a" stroke-width="2.2" stroke-linecap="round"/>';
    for (i = 0; i <= segs; i++) out += '<circle cx="' + i * w + '" cy="5" r="3.6" fill="#cfe8d8"/>';
    for (i = 0; i < segs; i++) {
      for (j = 0; j < 4; j++) {
        t = (j + 0.5) / 4; x = i * w + w * t; y = 5 + 4 * sag * t * (1 - t); cls = r(); cls = cls < 0.4 ? 'a' : (cls < 0.8 ? 'b' : 'c');
        out += '<use href="#xm-bulb" class="xm-b xm-b--' + cls + '" x="' + n(x - 14 * s) + '" y="' + n(y - 2 * s) + '" width="' + n(28 * s) + '" height="' + n(34 * s) + '" style="color:' + BULB[c++ % BULB.length] + ';animation-duration:' + (2.2 + r() * 3).toFixed(1) + 's;animation-delay:-' + (r() * 5).toFixed(1) + 's"/>';
      }
    }
    return out + '</svg>';
  }

  // ── the scene along the foot of the hero: ridges, a far tree line, hills with lit trees, gifts at their feet, glints on the snow ───────────
  function tree(kind, x, ground, w, delay) {
    var s = w / 100, y = ground - 170 * s, h = 170 * s, id = kind === 'q' || kind === 'm' ? 'xm-fir3' : 'xm-fir', at = 'x="' + n(x - w / 2) + '" y="' + n(y) + '" width="' + n(w) + '" height="' + n(h) + '"';
    var out = '<use href="#' + id + '" ' + at + '/>';
    if (kind === 'l' || kind === 'm') out += '<use href="#' + id + '-orn" ' + at + '/><use href="#' + id + '-la" class="xm-la" ' + at + ' style="animation-delay:-' + delay + 's"/><use href="#' + id + '-lb" class="xm-lb" ' + at + ' style="animation-delay:-' + delay + 's"/>';
    return out;
  }
  function scene(k) {
    var r = k.rng(5), out = '<svg viewBox="0 0 1440 280" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">', x, i, p, ridge, far = '';
    ridge = function (x) { return 138 + 20 * Math.sin(x / 250 + 2) + 8 * Math.sin(x / 93); };
    var mid = function (x) { return 184 + 12 * Math.sin(x / 200 + 1.2) + 5 * Math.sin(x / 79); };
    var near = function (x) { return 222 + 7 * Math.sin(x / 150 + 0.6) + 4 * Math.sin(x / 61 + 2); };
    out += '<path d="' + hill(ridge, 40, 280, -20, 1460) + '" fill="url(#xm-ridge)"/><path d="' + hill(ridge, 40, 280, -20, 1460).replace(/V280H-20Z$/, '') + '" fill="none" stroke="#9fd0ea" stroke-opacity=".35" stroke-width="2.2"/>';
    for (x = -10; x < 1450; x += 13 + r() * 15) { p = ridge(x) + 6; far += 'M' + n(x - 7 - r() * 4) + ' ' + n(p) + 'L' + n(x) + ' ' + n(p - 22 - r() * 22) + 'L' + n(x + 7 + r() * 4) + ' ' + n(p) + 'Z'; }
    out += '<path d="' + far + '" fill="#0a3626" fill-opacity=".92"/>';
    out += '<path d="' + hill(mid, 40, 280, -20, 1460) + '" fill="url(#xm-snowg2)"/>';
    [[60, 70], [250, 62], [338, 58], [520, 64], [640, 58], [840, 66], [930, 58], [1070, 62], [1180, 70], [1330, 62], [1420, 58]].forEach(function (a) { out += tree('q', a[0], mid(a[0]) + 10, a[1], 0); });
    out += '<path d="' + hill(near, 30, 280, -20, 1460) + '" fill="url(#xm-snowg)" fill-opacity="0"/>';
    // the trees: [x, width, kind]  (l = lit four-tier, m = lit three-tier, p = plain four-tier, q = plain three-tier)
    [[176, 112, 'l'], [292, 82, 'q'], [402, 138, 'l'], [520, 98, 'p'], [610, 78, 'q'], [722, 126, 'l'], [832, 90, 'q'], [940, 116, 'p'], [1042, 120, 'l'], [1150, 92, 'q'], [1246, 110, 'm'], [1340, 80, 'p']].forEach(function (a, ix) {
      out += tree(a[2], a[0], near(a[0]) + 7, a[1], (ix * 0.7).toFixed(1));
    });
    out += '<path d="' + hill(near, 30, 280, -20, 1460) + '" fill="url(#xm-gnd)"/>';
    out += '<path d="' + hill(function (x) { return 252 + 6 * Math.sin(x / 120 + 1) + 3 * Math.sin(x / 41); }, 30, 280, -20, 1460) + '" fill="url(#xm-gnd2)" fill-opacity=".85"/>';
    // gifts at the feet of the trees: [x, id, width]
    var G = { a: [60, 56], b: [56, 60], c: [64, 50], d: [50, 74], e: [54, 52], f: [60, 60] };
    [[130, 'a', 34], [226, 'c', 36], [352, 'b', 30], [468, 'd', 24], [548, 'e', 32], [676, 'f', 30], [776, 'a', 36], [888, 'c', 30], [988, 'b', 34], [1096, 'e', 32], [1196, 'd', 24], [1300, 'a', 34], [1390, 'f', 28]].forEach(function (g) {
      var d = G[g[1]], w = g[2], h = w * d[1] / d[0], y = near(g[0]) + 20 + (g[0] % 5) * 2;
      out += '<use href="#xm-gift-' + g[1] + '" x="' + n(g[0] - w / 2) + '" y="' + n(y - h) + '" width="' + w + '" height="' + n(h) + '"/>';
    });
    for (i = 0; i < 16; i++) out += '<use href="#sk-sparkle" class="xm-sp" x="' + n(20 + r() * 1400) + '" y="' + n(236 + r() * 36) + '" width="' + n(8 + r() * 8) + '" height="' + n(8 + r() * 8) + '" style="color:' + (r() < 0.5 ? '#ffffff' : '#fff0b0') + ';animation-duration:' + (2.4 + r() * 3).toFixed(1) + 's;animation-delay:-' + (r() * 5).toFixed(1) + 's"/>';
    return out + '</svg>';
  }

  // ── the hero ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  function hero(k) {
    var sl = '<i class="sk-fly sk-fly--ltr xm-sleigh" style="--s:176px;--d:84s;--o:-24s;--wv:-4px">' + k.tap(k.use('xm-sleigh', '', '0 0 300 100'), 'Ho ho ho!', 'xm-sleigh-tap') + '</i>';
    return '<div class="xm-sky"></div><div class="xm-halo"></div>' +
      k.twinkles(8, { id: ['sk-sparkle', 'xm-star5'], colors: SPARK, size: [8, 16], dur: [3, 6], area: [0, 100], areaY: [7.5, 12], seed: 3, mobile: 0.5 }) +
      k.twinkles(8, { id: ['sk-sparkle', 'xm-star5'], colors: SPARK, size: [8, 17], dur: [3, 6], area: [76, 99], areaY: [11, 44], seed: 8, mobile: 0.4 }) +
      k.twinkles(6, { id: ['sk-sparkle', 'xm-star5'], colors: SPARK, size: [7, 14], dur: [3, 6], area: [0.5, 6], areaY: [14, 62], seed: 12, mobile: 0.5 }) +
      '<div class="xm-moon"></div>' +
      '<i class="xm-bigstar">' + k.use('xm-bigstar', '', '0 0 100 100') + '</i>' +
      '<i class="xm-shoot xm-shoot--1"></i><i class="xm-shoot xm-shoot--2"></i>' +
      k.twinkles(7, { id: ['xm-flake-a', 'xm-flake-b'], colors: SNOWC, size: [12, 24], dur: [4, 8], area: [0.4, 7], areaY: [10, 64], seed: 41, mobile: 0.5 }) +
      k.twinkles(7, { id: ['xm-flake-a', 'xm-flake-b'], colors: SNOWC, size: [12, 24], dur: [4, 8], area: [92, 99], areaY: [38, 70], seed: 42, mobile: 0.5 }) +
      k.particles(24, { id: 'xm-flake-c', colors: SNOWC, size: [4, 9], dur: [18, 30], opacity: [0.55, 0.95], drift: 50, sway: 22, spin: 0, seed: 33, mobile: 0.5 }) +
      heroLights(k) + sl +
      '<div class="xm-scene">' + scene(k) + '</div>' +
      k.particles(16, { id: ['xm-flake-b', 'xm-flake-a'], colors: SNOWC, size: [13, 22], dur: [15, 24], opacity: [0.5, 0.9], drift: 70, sway: 30, seed: 32, mobile: 0.5 }) +
      k.tap(k.use('xm-snowman', '', '0 0 100 150'), 'Brr!', 'xm-snowman-tap xm-l', 'left:0.4%') +
      k.tap(k.use('xm-santa', '', '0 0 104 150'), 'Ho ho ho!', 'xm-santa-tap xm-r', 'right:0.4%') +
      k.particles(8, { id: ['xm-flake-a', 'xm-flake-b'], colors: SNOWC, size: [24, 40], dur: [12, 18], opacity: [0.5, 0.85], drift: 90, sway: 40, seed: 31, mobile: 0.5 });
  }

  // ── a layer behind each section, different on every one so the page does not repeat itself ──────────────────────────────────────
  var SECTIONS = {
    eventStrip:     ['top:multi:8', 'holly:tl', 'pile:l:gift-c,gift-a,fir3', 'orn:r:1.6:96:30:bauble:red', 'orn:r:4.4:60:24:star', 'snow:5:1', 'stars:l:30'],
    programs:       ['top:garland', 'pile:l:firlit3,stack', 'orn:r:1.6:110:34:bauble-s:gold', 'orn:r:4.6:64:26:cane', 'tap:r:58', 'snow:4:2', 'stars:r:24', 'drift:r'],
    competition:    ['top:warm', 'holly:tl', 'pile:r:cane,gift-d,cane', 'orn:r:1.6:90:28:stocking', 'snow:5:3', 'stars:l:60', 'drift:l'],
    coaches:        ['top:icicle:cool', 'wreath:tr', 'pile:r:fir,gift-e,gift-a', 'orn:l:1.4:76:30:bauble-d:blue', 'orn:l:4:114:24:bauble:red', 'tap:l:34', 'snow:4:4', 'stars:r:50'],
    gallery:        ['top:rg', 'pile:l:gift-d,gift-a,gift-c', 'pile:r:snowman,gift-f', 'orn:r:1.6:70:28:ginger', 'drift:l', 'snow:3:5', 'stars:r:20'],
    'belt-journey': ['top:stars', 'pile:r:gift-f,gift-b', 'holly:tl', 'orn:r:1.6:104:30:cane', 'snow:5:6', 'drift:r', 'stars:l:52'],
    locations:      ['top:cool', 'pile:l:firlit3,gift-b', 'wreath:tr', 'orn:l:1.6:80:30:bauble-z:green', 'snow:4:7', 'stars:l:40', 'stars:r:70'],
    faq:            ['top:pennant', 'pile:r:cane,stack', 'orn:l:1.4:100:32:bauble:gold', 'orn:l:4.2:56:22:star', 'drift:l', 'snow:5:8', 'stars:r:30'],
    schedule:       ['top:gold', 'wreath:tl', 'pile:l:fir3,gift-f', 'pile:r:gift-a,holly', 'orn:r:1.6:76:30:bauble-d:red', 'tap:r:68', 'snow:4:9', 'stars:l:50'],
    testimonials:   ['top:garland', 'pile:l:holly,gift-b', 'pile:r:firlit,gift-d', 'orn:l:1.6:90:28:stocking', 'orn:r:1.6:60:24:bauble-z:blue', 'snow:3:10', 'drift:r', 'stars:l:30'],
    pricing:        ['top:multi', 'wreath:tr', 'pile:r:stack,cane', 'pile:l:holly,gift-a', 'orn:l:1.6:110:30:ginger', 'snow:5:11', 'stars:l:24', 'stars:r:56'],
    contact:        ['top:icicle:warm', 'tap:l:26', 'pile:l:firlit,gift-e,gift-a', 'pile:r:fir3,gift-d,gift-b', 'orn:r:1.6:90:30:bauble:gold', 'drift:r', 'snow:6:12', 'stars:r:40']
  };
  var ITEMS = {
    fir: ['xm-fir', FIR_OUT], fir3: ['xm-fir3', FIR_OUT], firlit: ['xm-fir', FIR_OUT, 1], firlit3: ['xm-fir3', FIR_OUT, 1],
    'gift-a': ['xm-gift-a', '0 0 60 56'], 'gift-b': ['xm-gift-b', '0 0 56 60'], 'gift-c': ['xm-gift-c', '0 0 64 50'], 'gift-d': ['xm-gift-d', '0 0 50 74'], 'gift-e': ['xm-gift-e', '0 0 54 52'], 'gift-f': ['xm-gift-f', '0 0 60 60'],
    cane: ['xm-cane', '0 0 50 86'], holly: ['xm-holly', '0 0 88 68'], snowman: ['xm-snowman', '0 0 100 150'], stack: ['xm-stack', '0 0 132 124']
  };
  var ORN = { bauble: ['xm-bauble', '0 0 40 54'], 'bauble-s': ['xm-bauble-s', '0 0 40 54'], 'bauble-d': ['xm-bauble-d', '0 0 40 54'], 'bauble-z': ['xm-bauble-z', '0 0 40 54'], star: ['xm-star-orn', '0 0 44 50'], cane: ['xm-cane', '0 0 50 86'], stocking: ['xm-stocking', '0 0 60 94'], ginger: ['xm-ginger', '0 0 60 78'] };
  var TOPS = {
    multi: ['xm-lw', 'xm-lt-multi', 44], warm: ['xm-lw', 'xm-lt-warm', 44], rg: ['xm-lw', 'xm-lt-rg', 44], cool: ['xm-lw', 'xm-lt-cool', 44], gold: ['xm-lw', 'xm-lt-gold', 44],
    icicle: ['xm-icw', 'xm-ic', 64], stars: ['xm-stw', 'xm-st', 58], pennant: ['xm-pn-w', 'xm-pn', 48], garland: ['xm-gl-w', 'xm-gl', 52]
  };
  function section(specs, k) {
    var out = '', pends = 0;                         // a phone puts every pendant at the same place, so only the first of a section is kept there
    specs.forEach(function (spec) {
      var a = spec.split(':'), kind = a[0], bits = '', d, h;
      if (kind === 'top') {
        d = TOPS[a[1]]; h = d[2]; var set = d[1] + (a[1] === 'icicle' ? '-' + a[2] : '');
        out += '<svg class="xm-top xm-top--' + a[1] + '" style="top:' + (+a[2] || 0) + 'px;height:' + h + 'px" aria-hidden="true" focusable="false"><rect width="100%" height="' + h + '" fill="url(#' + d[0] + ')"/>' +
          '<rect class="xm-bl xm-bl--a" width="100%" height="' + h + '" fill="url(#' + set + '-a)"/><rect class="xm-bl xm-bl--b" width="100%" height="' + h + '" fill="url(#' + set + '-b)"/></svg>';
      } else if (kind === 'pile') {
        a[2].split(',').forEach(function (it) {
          var m = ITEMS[it], cls = 'xm-i xm-i--' + it;
          if (!m) return;
          if (m[2]) bits += '<svg class="' + cls + '" viewBox="' + m[1] + '" aria-hidden="true" focusable="false"><use href="#' + m[0] + '"/><use href="#' + m[0] + '-orn"/><use class="xm-la" href="#' + m[0] + '-la"/><use class="xm-lb" href="#' + m[0] + '-lb"/></svg>';
          else bits += k.use(m[0], cls, m[1]);
        });
        out += '<div class="xm-pile xm-pile--' + a[1] + '">' + bits + '</div>';
      } else if (kind === 'orn') {
        d = ORN[a[5]];
        out += k.pendant(k.use(d[0], '', d[1]), { side: a[1], at: a[2], len: +a[3], w: +a[4], cls: (a[5].indexOf('bauble') === 0 ? 'xm-c-' + (a[6] || 'red') : 'xm-o-' + a[5]) + (pends++ ? ' sk-hide-m' : '') });
      } else if (kind === 'wreath') {
        out += k.use('xm-wreath', 'xm-wreath xm-wreath--' + a[1], '0 0 100 104');
      } else if (kind === 'holly') {
        out += k.use('xm-holly', 'xm-holly xm-holly--' + a[1], '0 0 88 68');
      } else if (kind === 'drift') {
        out += k.use('xm-drift', 'xm-drift xm-drift--' + a[1], '0 0 260 80');
      } else if (kind === 'snow') {
        out += k.particles(+a[1], { id: ['xm-flake-a', 'xm-flake-b', 'xm-flake-c'], colors: SNOWC, size: [7, 15], dur: [16, 28], opacity: [0.35, 0.8], drift: 60, sway: 24, seed: 100 + +a[2], mobile: 0.5 });
      } else if (kind === 'stars') {
        var y = +a[2];
        out += k.twinkles(5, { id: ['sk-sparkle', 'xm-star5'], colors: SPARK, size: [7, 13], dur: [3, 6], area: a[1] === 'l' ? [0.6, 6] : [94, 99.4], areaY: [Math.max(1, y - 9), y + 12], seed: 200 + y, mobile: 0.6 });
      } else if (kind === 'tap') {
        out += k.tap(k.use('xm-bell', '', '0 0 44 58'), 'Ding!', 'xm-tap xm-' + a[1] + ' sk-hide-m', (a[1] === 'l' ? 'left' : 'right') + ':0.4%;top:' + a[2] + '%;width:48px');
      }
    });
    return out;
  }

  // ── the foot of the page: a line of lights strung between two trees, four gift tags hanging from it, snow underneath ────────────────
  var SAYINGS = ['Oh what fun it is to roll', 'Ho ho hold your base', 'Snow place like the mat', 'Cheer for your partner'];
  var TITLES = ['MERRY', 'JOLLY', 'COZY', 'CHEER'];
  function footBg(k) {
    var r = k.rng(9), out = '<svg class="xm-f-bg" viewBox="0 0 1440 300" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">', far = '', x, p, ridge = function (x) { return 214 + 12 * Math.sin(x / 190 + 1) + 6 * Math.sin(x / 71); };
    out += '<path d="' + hill(ridge, 40, 300, -20, 1460) + '" fill="url(#xm-ridge)" fill-opacity=".8"/>';
    for (x = -10; x < 1450; x += 12 + r() * 14) { p = ridge(x) + 6; far += 'M' + n(x - 7 - r() * 4) + ' ' + n(p) + 'L' + n(x) + ' ' + n(p - 26 - r() * 30) + 'L' + n(x + 7 + r() * 4) + ' ' + n(p) + 'Z'; }
    out += '<path d="' + far + '" fill="#0a3626" fill-opacity=".9"/>';
    [[110, 'q', 70], [250, 'q', 56], [470, 'q', 60], [980, 'q', 62], [1190, 'q', 56], [1330, 'q', 70]].forEach(function (a) { out += tree(a[1], a[0], 262, a[2], 0); });
    return out + '</svg>';
  }
  function footLights(k) {
    var r = k.rng(14), out = '<svg class="xm-f-wire" viewBox="0 0 1200 40" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="M0 4H1200" stroke="#6bb88a" stroke-width="2.2" fill="none" vector-effect="non-scaling-stroke"/></svg>';
    var bulbs = '', i;
    for (i = 0; i < 26; i++) bulbs += '<i class="xm-fb" style="left:' + (2 + i * 3.84).toFixed(2) + '%;color:' + BULB[i % BULB.length] + ';animation-delay:-' + (r() * 5).toFixed(1) + 's;animation-duration:' + (2.4 + r() * 2.6).toFixed(1) + 's"><svg viewBox="0 0 28 34" aria-hidden="true" focusable="false"><use href="#xm-bulb"/></svg></i>';
    return '<div class="xm-f-lights">' + out + bulbs + '</div>';
  }
  function footer(k) {
    var tags = SAYINGS.map(function (s, i) { return '<div class="xm-tag xm-tag--' + (i + 1) + '"><span>' + TITLES[i] + '</span><em>' + s + '</em></div>'; }).join('');
    var litTree = '<svg class="xm-i xm-i--tree" viewBox="' + FIR_OUT + '" aria-hidden="true" focusable="false"><use href="#xm-fir"/><use href="#xm-fir-orn"/><use class="xm-la" href="#xm-fir-la"/><use class="xm-lb" href="#xm-fir-lb"/></svg>';
    return footBg(k) + footLights(k) +
      '<div class="xm-props sk-props xm-props--l">' + litTree + k.use('xm-stack', 'xm-i xm-i--stack', '0 0 132 124') + '</div>' +
      '<div class="xm-tags sk-signs">' + tags + '</div>' +
      '<div class="xm-props sk-props xm-props--r">' + k.use('xm-reindeer', 'xm-i xm-i--deer', '0 0 130 130') + k.use('xm-fir3', 'xm-i xm-i--tree3', FIR_OUT) + k.use('xm-gift-d', 'xm-i xm-i--gift', '0 0 50 74') + '</div>' +
      '<svg class="xm-f-ground" viewBox="0 0 1440 80" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="M0 40C200 22 380 38 600 34S1040 20 1440 36V80H0Z" fill="url(#xm-gnd2)"/><path d="M0 54C220 40 420 54 700 50S1120 40 1440 52V80H0Z" fill="url(#xm-gnd)"/></svg>' +
      k.particles(8, { id: ['xm-flake-a', 'xm-flake-b', 'xm-flake-c'], colors: SNOWC, size: [8, 16], dur: [12, 20], opacity: [0.45, 0.85], drift: 60, sway: 26, seed: 300, mobile: 0.5 }) +
      k.twinkles(7, { id: ['sk-sparkle', 'xm-star5'], colors: SPARK, size: [7, 13], dur: [3, 6], area: [0, 100], areaY: [4, 40], seed: 301, mobile: 0.5 });
  }

  // Tap the snowman, Santa or a bell and a little pop of flakes or gold leaves the thing you tapped.
  function onTap(el, k) {
    var c = el.classList;
    if (c.contains('xm-snowman-tap')) k.burst(el, { id: 'xm-flake-b', n: 12, colors: ['#ffffff', '#d6ecff'], size: [9, 16], dist: [40, 90] });
    else if (c.contains('xm-santa-tap') || c.contains('xm-sleigh-tap')) {
      if (c.contains('xm-sleigh-tap')) c.toggle('xm-bub-r', el.getBoundingClientRect().left + el.offsetWidth / 2 < window.innerWidth / 2);
      k.burst(el, { id: 'xm-star5', n: 12, colors: ['#ffe08a', '#ff4056', '#3fd47a', '#ffffff'], size: [9, 15], dist: [46, 96] });
    } else k.burst(el, { id: 'sk-sparkle', n: 10, colors: ['#ffe08a', '#fff6d6'], size: [8, 14], dist: [30, 70] });
  }

  var T = {
    name: 'christmas', prefix: 'xm',
    meta: { bg: '#07140d', gold: '#f2c14e', emoji: '🎄', tapSay: ['Ho ho ho!', 'Brr!', 'Ding!'], sayings: SAYINGS },
    defs: DEFS,
    hero: hero,
    sections: {},
    footer: footer,
    onTap: onTap
  };
  Object.keys(SECTIONS).forEach(function (id) { T.sections[id] = function (k) { return section(SECTIONS[id], k); }; });
  (window.SeasonKit ? window.SeasonKit.mount : function (t) { (window.__skq = window.__skq || []).push(t); })(T);
})();
