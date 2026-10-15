/* Valentine's Day: the homepage's scene for all of February (index.html's <head> turns it on from the date and loads this with season-kit.css,
   season-kit.js and season-valentines.css, which draws it). Deep wine and rose pink: hearts rising through a rosy hero, a huge soft heart-shaped
   glow, Cupid's arrow trailing ribbons across a bed of roses with a bundle of heart balloons, heart bunting along the top, a layer behind every
   section (garlands, rose and vine corners, love letters, candy hearts, arrows, balloons, drifting petals), and a rose garden above the footer
   with four candy-heart signs. Tap an arrow, a balloon bundle, a letter or a candy heart and it answers.
   Nothing here reads or writes anything about a visitor, and nothing is built unless the page is in the season. */
(function () {
  var C = {
    red: '#e0234e', love: '#c4153f', hot: '#f0457a', rose: '#ff6f9a', pink: '#ff8fb1', blush: '#ffc2d1', cream: '#fff1ec', gold: '#e8a598',
    ink: '#4a0a24', leaf: '#2f7d5b', leaf2: '#3b9168', leaf3: '#256a4c', lilac: '#d9b8ff', peach: '#ffc7a6', mint: '#bfe8d4', butter: '#fff0b8'
  };
  var HEARTS = [C.rose, C.red, C.blush, C.pink, C.hot, '#ffdce5'];
  var PETALS = [C.red, C.rose, C.blush, C.pink, C.love];
  var BIGHEARTS = [C.rose, C.hot, C.red, C.pink];
  var LEAVES = [C.leaf, C.leaf2, C.leaf3];
  var LEAVES_BACK = ['#1d4f3a', '#215a41', '#1a4533'], LEAVES_MID = ['#256a4c', '#2a7452', '#215f44'];
  var HEART = 'M50 90C22 70 2 52 2 29C2 13 14 3 28 3C38 3 46 9 50 19C54 9 62 3 72 3C86 3 98 13 98 29C98 52 78 70 50 90Z';
  var HEART_VB = '0 0 100 92';
  var BUNDLE_VB = '0 0 164 232';
  var BOUQUET_VB = '0 0 200 116';
  var LOVE_VB = '0 0 112 118';

  function f1(n) { return Math.round(n * 10) / 10; }
  function mix(a, b) { var o = {}, key; for (key in a) o[key] = a[key]; for (key in b) o[key] = b[key]; return o; }
  // An icon the pack draws (the kit's k.use has no colour): an <svg> that reuses a symbol, coloured by `color`.
  function ic(id, cls, vb, col) { return '<svg class="' + cls + '" viewBox="' + vb + '"' + (col ? ' style="color:' + col + '"' : '') + ' aria-hidden="true" focusable="false"><use href="#' + id + '"/></svg>'; }
  // Placed inside a scene's own <svg>: a leaf with its base at (x, y), turned by rot degrees and scaled by s; a rose of diameter d; a bud on its stem.
  function leafAt(x, y, rot, s, col) { return '<use href="#vd-leaf" x="-20" y="-62" width="40" height="64" transform="translate(' + f1(x) + ' ' + f1(y) + ') rotate(' + f1(rot) + ') scale(' + f1(s) + ')" style="color:' + col + '"/>'; }
  function roseAt(cx, cy, d, col) { return '<use href="#vd-rose" x="' + f1(cx - d / 2) + '" y="' + f1(cy - d / 2) + '" width="' + f1(d) + '" height="' + f1(d) + '" style="color:' + col + '"/>'; }
  function budAt(x, y, rot, s, col) { return '<use href="#vd-bud" x="-25" y="-118" width="50" height="120" transform="translate(' + f1(x) + ' ' + f1(y) + ') rotate(' + f1(rot) + ') scale(' + f1(s) + ')" style="color:' + col + '"/>'; }
  function heartAt(x, y, d, col, rot) { return '<use href="#vd-heart" x="' + f1(x - d / 2) + '" y="' + f1(y - d * 0.46) + '" width="' + f1(d) + '" height="' + f1(d * 0.92) + '"' + (rot ? ' transform="rotate(' + rot + ' ' + f1(x) + ' ' + f1(y) + ')"' : '') + ' style="color:' + col + '"/>'; }
  function petalAt(x, y, rot, s, col) { return '<use href="#vd-petal" x="-15" y="-20" width="30" height="40" transform="translate(' + f1(x) + ' ' + f1(y) + ') rotate(' + f1(rot) + ') scale(' + f1(s) + ')" style="color:' + col + '"/>'; }

  // The rose from above: seven outer petals, five in the middle, three at the heart of it, and a little swirl.
  function roseArt() {
    function petal(ang, rad, r, edge, hi) {
      var a = ang * Math.PI / 180, x = 50 + rad * Math.cos(a), y = 50 + rad * Math.sin(a);
      var s = '<circle cx="' + f1(x) + '" cy="' + f1(y) + '" r="' + r + '" fill="currentColor" stroke="' + C.ink + '" stroke-opacity="' + edge + '" stroke-width="2"/>';
      if (hi) {
        var r2 = r - 4, a0 = (ang - 50) * Math.PI / 180, a1 = (ang + 50) * Math.PI / 180;
        s += '<path d="M' + f1(x + r2 * Math.cos(a0)) + ' ' + f1(y + r2 * Math.sin(a0)) + 'A' + r2 + ' ' + r2 + ' 0 0 1 ' + f1(x + r2 * Math.cos(a1)) + ' ' + f1(y + r2 * Math.sin(a1)) + '" fill="none" stroke="#fff" stroke-opacity="' + hi + '" stroke-width="3" stroke-linecap="round"/>';
      }
      return s;
    }
    var s = '', i;
    for (i = 0; i < 7; i++) s += petal(i * 360 / 7 - 90, 28, 21, 0.24, 0.22);
    s += '<circle cx="50" cy="50" r="33" fill="' + C.ink + '" fill-opacity=".16"/>';
    for (i = 0; i < 5; i++) s += petal(i * 72 - 54, 16, 17, 0.26, 0.2);
    s += '<circle cx="50" cy="50" r="17" fill="' + C.ink + '" fill-opacity=".14"/>';
    for (i = 0; i < 3; i++) s += petal(i * 120 - 30, 6.5, 10.5, 0.28, 0);
    return s + '<path d="M50 50a2.5 2.5 0 0 1 5 0a5 5 0 0 1-10 0a7.5 7.5 0 0 1 15 0" fill="none" stroke="' + C.ink + '" stroke-opacity=".42" stroke-width="2.2" stroke-linecap="round"/>';
  }

  // A ribbon that streams behind the arrow: a tapering wave, thin at its free end. phase turns the wave; col is its colour.
  function ribbon(phase, col, hi) {
    var up = [], dn = [], mid = [], i, x, t, w, yc, n = 36, len = 126;
    for (i = 0; i <= n; i++) {
      t = i / n; x = 2 + t * len;
      yc = 32 + (14 * Math.pow(1 - t, 0.9) + 1.5) * Math.sin(t * 8.6 + phase);        // the free end swings widest, the end by the arrow hardly at all
      w = 1.4 + 6.4 * Math.pow(t, 0.55);                                                // and is thinnest
      up.push(f1(x) + ' ' + f1(yc - w / 2)); dn.push(f1(x) + ' ' + f1(yc + w / 2)); mid.push(f1(x) + ' ' + f1(yc - w * 0.18));
    }
    return '<path d="M' + up.join('L') + 'L' + dn.reverse().join('L') + 'Z" fill="' + col + '"/>' +
      '<path d="M' + mid.slice(4, 32).join('L') + '" fill="none" stroke="' + hi + '" stroke-opacity=".5" stroke-width="1.1" stroke-linecap="round"/>';
  }

  // The bundle of heart balloons: five hearts on strings that meet in a bow.
  function bundleArt() {
    var b = [[44, 2, -3, 1.12, C.red], [-2, 34, -16, 1, C.rose], [90, 30, 14, 1, C.blush], [18, 92, -9, 0.94, C.hot], [76, 90, 10, 0.94, C.gold]];
    var tie = [75, 196], strings = '', bodies = '';
    b.forEach(function (p) {
      var a = p[2] * Math.PI / 180, kx = p[0] + p[3] * (30 - 27 * Math.sin(a)), ky = p[1] + p[3] * (32 + 27 * Math.cos(a));
      strings += '<path d="M' + f1(kx) + ' ' + f1(ky + 5) + 'C' + f1(kx) + ' ' + f1(ky + 40) + ' ' + f1(tie[0] + (kx - tie[0]) * 0.2) + ' ' + (tie[1] - 38) + ' ' + tie[0] + ' ' + tie[1] + '"/>';
      bodies += '<use href="#vd-hb" width="60" height="64" transform="translate(' + p[0] + ' ' + p[1] + ') scale(' + p[3] + ') rotate(' + p[2] + ' 30 32)" style="color:' + p[4] + '"/>';
    });
    return '<g fill="none" stroke="' + C.cream + '" stroke-opacity=".62" stroke-width="1.3" stroke-linecap="round">' + strings + '</g>' + bodies +
      '<rect x="72.6" y="203" width="4.8" height="29" rx="2" fill="' + C.gold + '"/><rect x="72.6" y="203" width="1.6" height="29" rx="0.8" fill="#fff" fill-opacity=".4"/>' +
      '<path d="M75 204C69 213 80 218 71 224M75 204C82 213 71 219 80 225" fill="none" stroke="' + C.pink + '" stroke-width="2.6" stroke-linecap="round"/>' +
      '<use href="#vd-bow" x="57" y="190" width="36" height="25" style="color:' + C.pink + '"/>';
  }

  // A tendril of vine: the stem with its curls and leaves. Drawn bottom left, growing up and to the right (the css turns it for the other corners).
  function vineArt() {
    var s = '<g fill="none" stroke="' + C.leaf3 + '" stroke-width="3.4" stroke-linecap="round">' +
      '<path d="M-2 98C28 96 54 84 70 66C84 50 104 44 124 50C142 56 146 72 132 76C120 80 112 70 120 64"/>' +
      '<path d="M70 66C62 50 66 34 80 26C92 20 106 24 104 34C102 42 92 40 94 33"/>' +
      '<path d="M28 94C38 82 36 68 24 60C16 54 20 46 28 48"/>' +
      '<path d="M124 50C136 38 154 38 162 30C168 24 178 26 176 34C175 40 168 39 169 34"/></g>';
    [[28, 95, -52, 0.5, C.leaf], [44, 90, 40, 0.46, C.leaf2], [60, 78, -48, 0.52, C.leaf2], [70, 66, 52, 0.5, C.leaf], [74, 40, -46, 0.46, C.leaf],
     [88, 22, 30, 0.44, C.leaf2], [100, 46, 36, 0.5, C.leaf], [112, 46, -38, 0.46, C.leaf2], [132, 54, 50, 0.46, C.leaf], [26, 62, -40, 0.4, C.leaf2], [150, 36, -34, 0.42, C.leaf]]
      .forEach(function (l) { s += leafAt(l[0], l[1], l[2], l[3], l[4]); });
    return s + heartAt(112, 70, 13, C.rose, -12) + heartAt(168, 48, 9, C.blush, 14) + heartAt(52, 58, 8, C.pink, -10);
  }

  // A cluster of roses, buds and leaves for the bottom-left corner of a section (the css turns it for the other corners).
  function bouquetArt() {
    var s = '';
    [[56, 150, -72, 1.5, C.leaf3], [60, 150, -44, 1.7, C.leaf], [64, 150, -16, 1.8, C.leaf2], [68, 150, 14, 1.7, C.leaf], [72, 150, 42, 1.6, C.leaf3], [76, 150, 70, 1.4, C.leaf2]]
      .forEach(function (l) { s += leafAt(l[0], l[1], l[2], l[3], l[4]); });
    s += '<g fill="none" stroke="' + C.leaf3 + '" stroke-width="3.2" stroke-linecap="round"><path d="M92 146C120 140 148 124 166 100C176 86 190 84 196 92C200 100 192 106 186 102"/><path d="M130 130C142 126 156 128 164 138"/></g>';
    [[120, 138, 64, 0.5, C.leaf], [146, 122, -40, 0.46, C.leaf2], [160, 104, 62, 0.44, C.leaf], [176, 88, -30, 0.42, C.leaf2]].forEach(function (l) { s += leafAt(l[0], l[1], l[2], l[3], l[4]); });
    s += budAt(44, 150, -9, 0.95, C.rose) + budAt(102, 150, 20, 0.8, C.blush);
    s += roseAt(50, 98, 60, C.red) + roseAt(110, 120, 52, C.pink) + roseAt(20, 124, 40, C.blush) + roseAt(74, 126, 66, C.rose);
    return s + heartAt(130, 66, 14, C.rose, 12) + heartAt(168, 56, 10, C.blush, -10) + heartAt(30, 56, 10, C.pink, -14);
  }

  // The butterfly's heart wings.
  function butterflyArt() {
    function w(rot, s, shade) { return '<g transform="translate(30 24) rotate(' + rot + ') scale(' + s + ') translate(-50 -90)"><path d="' + HEART + '" fill="currentColor"/>' + (shade ? '<path d="' + HEART + '" fill="' + C.ink + '" fill-opacity="' + shade + '"/>' : '<path d="M14 26C14 18 20 12 28 12" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="6" stroke-linecap="round"/>') + '</g>'; }
    return w(-125, 0.2, 0.2) + w(125, 0.2, 0.2) + w(-58, 0.3, 0) + w(58, 0.3, 0) +
      '<rect x="28.6" y="12" width="2.8" height="26" rx="1.4" fill="' + C.ink + '"/><path d="M29 13C27 8 23 6 21 7M31 13C33 8 37 6 39 7" fill="none" stroke="' + C.ink + '" stroke-width="1.2" stroke-linecap="round"/>';
  }

  // Shapes drawn once and reused with <use>: heart, outline heart, petal, leaf, rose, bud, heart balloon, bundle, bow, love letter, candy hearts,
  // chocolates, flying arrow, arrow through a heart, cloud, vine, rose corner, butterfly. (They take their colour from `color`.)
  var DEFS =
    '<symbol id="vd-heart" viewBox="' + HEART_VB + '"><path d="' + HEART + '" fill="currentColor"/>' +
      '<path d="M98 29C98 52 78 70 50 90C69 66 87 50 91 22C95 24 97 26 98 29Z" fill="' + C.ink + '" fill-opacity=".17"/>' +
      '<path d="M12 28C12 19 18 12 27 11" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="5" stroke-linecap="round"/><circle cx="13" cy="39" r="2.8" fill="#fff" fill-opacity=".55"/></symbol>' +
    '<symbol id="vd-heart-o" viewBox="' + HEART_VB + '"><path d="' + HEART + '" transform="translate(5 4.5) scale(.9)" fill="none" stroke="currentColor" stroke-width="9" stroke-linejoin="round"/></symbol>' +
    '<symbol id="vd-petal" viewBox="0 0 30 40"><path d="M15 39C6 33 1 23 3 13C4 6 9 2 14 4.5Q15 5 16 4.5C21 2 26 6 27 13C29 23 24 33 15 39Z" fill="currentColor"/>' +
      '<path d="M15 35C14 27 14 19 15 11" fill="none" stroke="' + C.ink + '" stroke-opacity=".2" stroke-width="1.6" stroke-linecap="round"/><path d="M6.5 14C7.5 10 9.5 8 12 7" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="2.2" stroke-linecap="round"/></symbol>' +
    '<symbol id="vd-leaf" viewBox="0 0 40 64"><path d="M20 62C4 50 0 26 20 2C40 26 36 50 20 62Z" fill="currentColor"/><path d="M20 62C36 50 40 26 20 2Z" fill="#fff" fill-opacity=".13"/>' +
      '<path d="M20 62V10M20 46L11 38M20 36L10 27M20 46L29 38M20 36L30 27" fill="none" stroke="#0e2a1d" stroke-opacity=".42" stroke-width="1.8" stroke-linecap="round"/></symbol>' +
    '<symbol id="vd-rose" viewBox="0 0 100 100">' + roseArt() + '</symbol>' +
    '<symbol id="vd-bud" viewBox="0 0 50 120"><path d="M25 52C23 74 27 96 24 118" fill="none" stroke="' + C.leaf3 + '" stroke-width="4" stroke-linecap="round"/>' +
      '<path d="M26 98C15 100 6 94 3 84C13 82 24 87 26 98Z" fill="' + C.leaf + '"/><path d="M25 80C36 80 45 72 47 62C37 60 27 67 25 80Z" fill="' + C.leaf2 + '"/>' +
      '<path d="M25 2C37 9 44 22 41 36C39 46 32 54 25 56C18 54 11 46 9 36C6 22 13 9 25 2Z" fill="currentColor"/><path d="M25 2C19 12 17 26 20 40C22 48 24 53 25 56C32 54 39 46 41 36C44 22 37 9 25 2Z" fill="#fff" fill-opacity=".14"/>' +
      '<path d="M25 2C29 14 29 30 25 44M12 26C18 32 22 38 24 50M38 26C32 32 28 38 26 50" fill="none" stroke="' + C.ink + '" stroke-opacity=".3" stroke-width="2" stroke-linecap="round"/>' +
      '<path d="M25 58C19 58 11 52 7 42C14 46 21 47 25 46C29 47 36 46 43 42C39 52 31 58 25 58Z" fill="' + C.leaf + '"/></symbol>' +
    '<symbol id="vd-hb" viewBox="0 0 60 64"><path d="M30 52C13 39 1 29 1 16C1 7 8 1 16 1C22 1 27 4 30 10C33 4 38 1 44 1C52 1 59 7 59 16C59 29 47 39 30 52Z" fill="currentColor"/>' +
      '<path d="M59 16C59 29 47 39 30 52C41 38 52 30 54 11C57 12 59 14 59 16Z" fill="' + C.ink + '" fill-opacity=".17"/><path d="M9 17C9 11 13 7 19 7" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="3.4" stroke-linecap="round"/>' +
      '<path d="M30 51L25 59H35Z" fill="currentColor"/><path d="M30 51L25 59H35Z" fill="' + C.ink + '" fill-opacity=".25"/></symbol>' +
    '<symbol id="vd-bundle" viewBox="' + BUNDLE_VB + '"><g transform="translate(6 0)">' + bundleArt() + '</g></symbol>' +
    '<symbol id="vd-bow" viewBox="0 0 64 44"><path d="M32 22C27 9 10 3 4 10C0 17 9 29 32 22Z" fill="currentColor"/><path d="M32 22C37 9 54 3 60 10C64 17 55 29 32 22Z" fill="currentColor"/>' +
      '<path d="M32 22C20 26 9 22 5 14C14 21 25 19 32 22Z" fill="' + C.ink + '" fill-opacity=".22"/><path d="M32 22C44 26 55 22 59 14C50 21 39 19 32 22Z" fill="' + C.ink + '" fill-opacity=".22"/>' +
      '<path d="M29 26L19 42L26 40L30 44L35 28Z" fill="currentColor"/><path d="M35 26L45 42L38 40L34 44L29 28Z" fill="currentColor"/><path d="M29 26L19 42L26 40L30 44L35 28Z" fill="' + C.ink + '" fill-opacity=".18"/>' +
      '<rect x="27" y="16" width="10" height="12" rx="4.5" fill="currentColor"/><rect x="27" y="16" width="10" height="12" rx="4.5" fill="#fff" fill-opacity=".2"/>' +
      '<path d="M9 11C14 8 20 9 25 14M55 11C50 8 44 9 39 14" fill="none" stroke="#fff" stroke-opacity=".42" stroke-width="2" stroke-linecap="round"/></symbol>' +
    '<symbol id="vd-env" viewBox="0 0 100 74"><rect x="3" y="8" width="94" height="62" rx="7" fill="currentColor"/>' +
      '<path d="M3 15C3 11 5 8 9 8H91C95 8 97 11 97 15L50 47Z" fill="#fff" fill-opacity=".24"/><path d="M3 66L38 38M97 66L62 38" fill="none" stroke="' + C.ink + '" stroke-opacity=".22" stroke-width="2" stroke-linecap="round"/>' +
      '<path d="M3 15L50 47L97 15" fill="none" stroke="' + C.ink + '" stroke-opacity=".3" stroke-width="2" stroke-linejoin="round"/>' +
      '<g transform="translate(35 29) scale(.3)"><path d="' + HEART + '" fill="#d41f4b"/><path d="M98 29C98 52 78 70 50 90C69 66 87 50 91 22C95 24 97 26 98 29Z" fill="' + C.ink + '" fill-opacity=".2"/><path d="M12 28C12 19 18 12 27 11" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="7" stroke-linecap="round"/></g></symbol>' +
    '<symbol id="vd-candybody" viewBox="' + HEART_VB + '"><path d="' + HEART + '" fill="currentColor"/>' +
      '<path d="M50 82C28 66 10 50 10 31C10 19 19 10 30 10C38 10 45 15 50 24C55 15 62 10 70 10C81 10 90 19 90 31C90 50 72 66 50 82Z" fill="#fff" fill-opacity=".18"/>' +
      '<path d="' + HEART + '" fill="none" stroke="' + C.ink + '" stroke-opacity=".16" stroke-width="2"/><path d="M12 27C12 19 18 12 27 11" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="5" stroke-linecap="round"/></symbol>' +
    '<symbol id="vd-candy" viewBox="' + HEART_VB + '"><path d="' + HEART + '" fill="currentColor"/>' +
      '<path d="M50 82C28 66 10 50 10 31C10 19 19 10 30 10C38 10 45 15 50 24C55 15 62 10 70 10C81 10 90 19 90 31C90 50 72 66 50 82Z" fill="#fff" fill-opacity=".18"/>' +
      '<path d="' + HEART + '" fill="none" stroke="' + C.ink + '" stroke-opacity=".16" stroke-width="2"/><path d="M12 27C12 19 18 12 27 11" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="5" stroke-linecap="round"/>' +
      '<path d="M37 34H50M54 34H64M32 46H44M48 46H68" fill="none" stroke="' + C.ink + '" stroke-opacity=".34" stroke-width="3.6" stroke-linecap="round"/><g transform="translate(44.5 55) scale(.1)"><path d="' + HEART + '" fill="' + C.ink + '" fill-opacity=".4"/></g></symbol>' +
    '<symbol id="vd-choc" viewBox="' + HEART_VB + '"><path d="' + HEART + '" fill="#7d0f2f"/><path d="' + HEART + '" transform="translate(6 3) scale(.88)" fill="#d41f4b"/>' +
      '<path d="' + HEART + '" transform="translate(12 7) scale(.76)" fill="none" stroke="' + C.blush + '" stroke-opacity=".6" stroke-width="2" stroke-dasharray="4 3"/>' +
      '<path d="M16 27C16 20 21 15 29 14" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="4" stroke-linecap="round"/><use href="#vd-bow" x="30" y="9" width="40" height="27.5" style="color:' + C.blush + '"/></symbol>' +
    '<symbol id="vd-arrow" viewBox="0 0 260 64">' + ribbon(0, C.red, '#fff') + ribbon(2.4, C.pink, '#fff') +
      '<g transform="translate(64 30) scale(.1)"><path d="' + HEART + '" fill="' + C.blush + '"/></g><g transform="translate(92 36) scale(.085)"><path d="' + HEART + '" fill="' + C.rose + '"/></g><g transform="translate(36 26) scale(.075)"><path d="' + HEART + '" fill="' + C.blush + '"/></g>' +
      '<path d="M112 32H238" fill="none" stroke="' + C.gold + '" stroke-width="4.4" stroke-linecap="round"/><path d="M114 30.6H236" fill="none" stroke="' + C.cream + '" stroke-opacity=".6" stroke-width="1.3" stroke-linecap="round"/>' +
      '<path d="M112 32L124 19H148L140 32Z" fill="' + C.cream + '"/><path d="M112 32L124 45H148L140 32Z" fill="' + C.pink + '"/><path d="M126 22H144M126 42H144" stroke="' + C.ink + '" stroke-opacity=".18" stroke-width="1.5" stroke-linecap="round"/>' +
      '<path d="M258 32L232 19L238 32L232 45Z" fill="' + C.red + '"/><path d="M258 32L232 19L238 32Z" fill="' + C.rose + '"/></symbol>' +
    '<symbol id="vd-lovearrow" viewBox="' + LOVE_VB + '"><g transform="translate(6 0)"><g transform="translate(36 78) rotate(-45) scale(.43) translate(-128 -32)">' + ribbon(0, C.red, '#fff') + ribbon(2.4, C.pink, '#fff') + '</g>' +
      '<g transform="translate(22 10) scale(.68)"><path d="' + HEART + '" fill="' + C.red + '"/><path d="M98 29C98 52 78 70 50 90C69 66 87 50 91 22C95 24 97 26 98 29Z" fill="' + C.ink + '" fill-opacity=".22"/>' +
      '<path d="M12 28C12 19 18 12 27 11" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="6" stroke-linecap="round"/></g>' +
      '<path d="M36 78L84 30" fill="none" stroke="' + C.gold + '" stroke-width="4.2" stroke-linecap="round"/><path d="M37.4 76.6L83 31" fill="none" stroke="' + C.cream + '" stroke-opacity=".6" stroke-width="1.3" stroke-linecap="round"/>' +
      '<g transform="translate(38 76) rotate(-45)"><path d="M2 0L-5 -9H-18L-12 0Z" fill="' + C.cream + '"/><path d="M2 0L-5 9H-18L-12 0Z" fill="' + C.pink + '"/></g>' +
      '<g transform="translate(86 28) rotate(-45)"><path d="M14 0L-4 -9L2 0L-4 9Z" fill="' + C.gold + '"/><path d="M14 0L-4 -9L2 0Z" fill="' + C.cream + '" fill-opacity=".5"/></g></g></symbol>' +
    '<symbol id="vd-cloud" viewBox="0 0 200 80"><path d="M22 72C6 72 0 60 5 50C9 41 19 38 27 41C29 27 43 17 59 21C67 8 89 6 101 19C111 6 135 8 143 23C159 15 181 23 181 41C195 41 201 53 195 63C191 70 185 72 179 72Z" fill="currentColor"/></symbol>' +
    '<symbol id="vd-vine" viewBox="0 0 200 100">' + vineArt() + '</symbol>' +
    '<symbol id="vd-bouquet" viewBox="' + BOUQUET_VB + '"><g transform="translate(0 -34)">' + bouquetArt() + '</g></symbol>' +
    '<symbol id="vd-butterfly" viewBox="0 0 60 46">' + butterflyArt() + '</symbol>';

  // ── The hero ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────

  // The huge soft glow in the shape of a heart: the same heart drawn eighteen times, each a little smaller and very faint, so the light is thickest at the
  // middle and fades out toward the edge (no blur filter: it is only paths), with the faintest rim round it.
  function glow() {
    var s = '<svg viewBox="-44 -44 188 180" aria-hidden="true" focusable="false">', i, k;
    for (i = 0; i < 18; i++) {
      k = 1.24 + (0.4 - 1.24) * i / 17;
      s += '<path d="' + HEART + '" transform="translate(50 46) scale(' + k.toFixed(3) + ') translate(-50 -46)" fill="#ff6e9f" fill-opacity=".05"/>';
    }
    return s + '<path d="' + HEART + '" fill="none" stroke="#ff9cbc" stroke-opacity=".09" stroke-width="5" stroke-linejoin="round"/></svg>';
  }

  // The bed of roses along the foot of the hero: three rises of ground, leaves and vines, roses of every pink and red, buds, petals and little hearts.
  function bed(k) {
    var r = k.rng(21), out = '<svg viewBox="0 0 1440 270" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">', x, i;
    out += '<path d="M0 132Q200 108 400 126T800 120T1200 128T1440 118V270H0Z" fill="#1d0a15"/>';
    for (x = -14; x < 1456; x += 30 + r() * 22) out += leafAt(x, 150 + r() * 30, -80 + r() * 160, 0.8 + r() * 0.55, LEAVES_BACK[Math.floor(r() * 3)]);
    out += '<g fill="none" stroke="#1d5a41" stroke-width="3.4" stroke-linecap="round"><path d="M-10 168C80 130 150 150 230 124S380 120 450 146"/><path d="M520 150C600 112 700 134 790 118S950 112 1030 140"/><path d="M1060 142C1150 108 1250 130 1330 112S1420 108 1460 128"/></g>';
    function curl(cx, cy, sc, fl) { return '<path d="M0 0c6-9 20-8 20 3c0 8-10 9-12 3c-1-3 2-6 5-4" transform="translate(' + cx + ' ' + cy + ') scale(' + fl * sc + ' ' + sc + ')" fill="none" stroke="#1d5a41" stroke-width="3" stroke-linecap="round"/>'; }
    [[232, 124, 1, 1], [452, 146, 0.9, -1], [522, 150, 1, -1], [792, 118, 1, 1], [1032, 140, 0.9, 1], [1062, 142, 1, -1], [1332, 112, 1, 1], [150, 141, 0.8, -1], [680, 126, 0.8, -1]].forEach(function (c) { out += curl(c[0], c[1], c[2], c[3]); });
    [[110, 144, 24], [260, 124, -30], [600, 122, 28], [760, 120, -24], [1130, 130, 26], [1290, 114, -28]].forEach(function (l) { out += leafAt(l[0], l[1], l[2], 0.7, LEAVES_MID[1]); });
    [[84, 118, 'bud'], [330, 136, 'bud'], [690, 126, 'bud'], [980, 128, 'bud'], [1370, 120, 'bud']].forEach(function (b, n) { out += budAt(b[0], b[1] + 70, (n % 2 ? 8 : -9), 0.78, [C.rose, C.blush, C.pink, C.hot, C.rose][n]); });
    out += '<path d="M0 182Q220 160 440 172T880 166T1440 174V270H0Z" fill="#26101d"/>';
    for (x = 20, i = 0; x < 1440; x += 78 + r() * 44, i++) {
      out += leafAt(x - 22, 196 + r() * 14, -62 + r() * 18, 1.0, LEAVES_MID[i % 3]) + leafAt(x + 24, 196 + r() * 14, 52 - r() * 18, 1.0, LEAVES_MID[(i + 1) % 3]);
      var ry = 176 + r() * 18, rd = 40 + r() * 16;
      if (x < 1230 || x > 1400) out += roseAt(x, ry, rd, [C.red, C.pink, C.rose, C.blush, C.hot, C.red][i % 6]);       // the corner under the balloons is left to the leaves
    }
    out += '<path d="M0 218Q260 202 520 214T1040 208T1440 214V270H0Z" fill="#14070d"/>';
    for (x = 70, i = 0; x < 1420; x += 190 + r() * 60, i++) {
      out += leafAt(x - 44, 244, -66, 1.5, LEAVES[i % 3]) + leafAt(x + 46, 244, 62, 1.5, LEAVES[(i + 2) % 3]) + leafAt(x, 238, -8 + r() * 16, 1.6, LEAVES[(i + 1) % 3]);
      var fy = 218 + r() * 12, fd = 78 + r() * 28;
      if (x < 1230 || x > 1400) out += roseAt(x, fy, fd, [C.rose, C.red, C.pink, C.blush, C.hot][i % 5]);
    }
    for (i = 0; i < 20; i++) out += petalAt(20 + r() * 1400, 246 + r() * 18, r() * 360, 0.5 + r() * 0.3, PETALS[i % 5]);
    for (i = 0; i < 7; i++) out += heartAt(60 + r() * 1320, 232 + r() * 28, 10 + r() * 8, HEARTS[i % 6], -20 + r() * 40);
    return out + '</svg>';
  }

  // Two soft clouds of cotton candy, each crossing the sky at its own height.
  function clouds(k) {
    return k.flyers(1, { id: 'vd-cloud', vb: '0 0 200 80', size: [190, 250], dur: [150, 150], top: [9, 11], wave: 0, colors: ['rgba(255,186,216,.26)'], seed: 5, cls: 'vd-cloud vd-cloud--1' }) +
      k.flyers(1, { id: 'vd-cloud', vb: '0 0 200 80', size: [130, 170], dur: [190, 190], top: [24, 26], wave: 0, colors: ['rgba(255,150,198,.22)'], seed: 6, cls: 'vd-cloud vd-cloud--2', dir: 'rtl' });
  }

  // For anyone who has asked for less motion, the hearts that rise are not drawn: these few stand still along the two edges instead (the css shows them only then).
  function stills() {
    return [[1.5, 15, 34, 'vd-heart-o', C.rose, -12], [3, 44, 22, 'vd-heart', C.hot, 10], [1.2, 70, 38, 'vd-heart-o', C.pink, 8], [93.5, 27, 30, 'vd-heart', C.rose, 12],
      [95, 52, 42, 'vd-heart-o', C.hot, -8], [91.5, 72, 24, 'vd-heart', C.blush, 10]].map(function (h) {
      return '<i class="vd-still" style="left:' + h[0] + '%;top:' + h[1] + '%;width:' + h[2] + 'px;rotate:' + h[5] + 'deg;color:' + h[4] + '">' + ic(h[3], '', HEART_VB) + '</i>';
    }).join('');
  }

  // The hero: a rosy wash, a huge heart of light, cotton-candy clouds, hearts and sparkles rising and twinkling through all of it, Cupid's arrow trailing ribbons
  // (one shot up through the glow on a wide screen, one skimming across the roses), bunting along the top, and two things that answer a tap: an arrow through
  // a heart and a bundle of heart balloons.
  function hero(k) {
    return '<div class="vd-wash"></div><div class="vd-glow">' + glow() + '</div><div class="vd-scrim"></div>' + clouds(k) +
      k.twinkles(14, { id: 'sk-sparkle', size: [8, 18], dur: [3, 6], colors: [C.blush, C.cream, C.rose, '#ffd6df'], seed: 31, mobile: 0.5 }) +
      k.twinkles(4, { id: 'vd-heart', vb: HEART_VB, size: [9, 17], dur: [4, 7], colors: HEARTS, seed: 32, area: [1, 9], areaY: [8, 88], mobile: 0.5, cls: 'vd-tw-heart' }) +
      k.twinkles(4, { id: 'vd-heart', vb: HEART_VB, size: [9, 17], dur: [4, 7], colors: HEARTS, seed: 33, area: [90, 98], areaY: [8, 88], mobile: 0.5, cls: 'vd-tw-heart' }) +
      k.particles(7, { id: ['vd-heart-o', 'vd-heart', 'vd-heart-o'], vb: HEART_VB, dir: 'rise', size: [34, 58], dur: [24, 36], area: [0, 13], drift: 30, sway: 18, spin: 0.1, opacity: [0.35, 0.62], colors: BIGHEARTS, seed: 41, mobile: 0.4 }) +
      k.particles(7, { id: ['vd-heart-o', 'vd-heart', 'vd-heart-o'], vb: HEART_VB, dir: 'rise', size: [34, 58], dur: [24, 36], area: [87, 100], drift: 30, sway: 18, spin: 0.1, opacity: [0.35, 0.62], colors: BIGHEARTS, seed: 42, mobile: 0.4 }) +
      k.particles(14, { id: ['vd-heart', 'vd-heart', 'vd-heart-o'], vb: HEART_VB, dir: 'rise', size: [18, 34], dur: [15, 26], area: [0, 100], drift: 60, sway: 26, spin: 0.14, opacity: [0.45, 0.88], colors: HEARTS, seed: 43, mobile: 0.4 }) +
      k.particles(10, { id: 'vd-heart', vb: HEART_VB, dir: 'rise', size: [8, 16], dur: [12, 22], area: [0, 100], drift: 50, sway: 20, spin: 0.2, opacity: [0.5, 0.95], colors: HEARTS, seed: 44, mobile: 0.4 }) +
      k.particles(5, { id: 'vd-petal', vb: '0 0 30 40', dir: 'fall', size: [12, 22], dur: [16, 28], area: [0, 100], drift: 90, sway: 30, spin: 1, opacity: [0.4, 0.8], colors: PETALS, seed: 45, mobile: 0.5 }) +
      stills() + '<div class="vd-bed">' + bed(k) + '</div>' +
      '<i class="vd-shoot">' + ic('vd-arrow', '', '0 0 260 64') + '</i>' +
      k.flyers(1, { id: 'vd-arrow', vb: '0 0 260 64', size: [196, 196], dur: [30, 30], top: [50, 50], wave: 22, seed: 9, cls: 'vd-arrowfly' }) +
      '<div class="vd-bunting"></div>' +
      k.tap(ic('vd-lovearrow', '', LOVE_VB), 'Love ya!', 'vd-tap vd-tap--r vd-tap--arrow sk-hide-m', 'right:0.4%;top:15%;width:68px') +
      k.tap(ic('vd-bundle', '', BUNDLE_VB), 'Aww!', 'vd-tap vd-tap--r vd-tap--balloons', 'right:2.5%;bottom:0;width:clamp(64px,9vw,122px)');
  }

  // ── The sections ──────────────────────────────────────────────────────────────────────────────────────────────────────────────

  // A layer behind each section, different on every one so the page does not repeat itself:
  //   top:<style>               a garland along the top edge (bunting, chain, pearls, ribbon, lights, lace, curtain, streamer)
  //   bouquet:<bl|br>           roses, a bud, leaves and a vine in a bottom corner      vine:<tl|tr|bl|br>   a curling vine in a corner
  //   pile:<l|r>:<things>       things along the bottom of a side (candies, letters, roses, buds, chocolates)
  //   pend:<l|r>:<at%>:<len>:<w>:<kind>    something swinging on a string              balloons:<l|r>   a bundle of heart balloons, bottom corner
  //   petals:<n>:<seed>  petals drifting down    hearts:<n>:<seed>  hearts rising     spark:<n>:<seed>  twinkling sparkles
  //   arrow:<top%>:<ltr|rtl>    Cupid's arrow crossing     tap:<kind>:<l|r>:<top%>:<px>  something that answers a tap
  var SECTIONS = {
    eventStrip:     ['bouquet:bl', 'pend:r:2.4:70:30:heart', 'arrow:34.5:ltr', 'balloons:r', 'petals:5:1', 'spark:7:1'],
    programs:       ['top:bunting', 'pile:l:candyP,candyL,envC', 'pend:r:2:96:32:candyL', 'tap:env:r:56:62', 'petals:4:2', 'arrow:11.3:ltr'],
    competition:    ['top:chain', 'bouquet:br', 'pend:l:1.4:80:30:pinkh', 'hearts:6:3', 'pile:l:candyY,bud', 'spark:6:3'],
    coaches:        ['top:pearls', 'vine:tr', 'pend:l:1.4:110:32:peachc', 'tap:lovearrow:l:30:62', 'petals:4:4', 'balloons:r'],
    gallery:        ['top:curtain', 'pile:l:envP,envC,candyM', 'pile:r:roseR,roseP,bud', 'hearts:5:5', 'pend:r:2.5:70:30:bow', 'petals:3:5'],
    'belt-journey': ['top:lights', 'bouquet:br', 'pend:r:3:104:34:rose', 'tap:candy:l:22:34', 'petals:5:6', 'spark:6:6'],
    locations:      ['top:ribbon', 'balloons:l', 'tap:env:r:40:62', 'pend:r:2:84:30:heart', 'petals:4:7', 'arrow:97:ltr'],
    faq:            ['top:streamer', 'bouquet:bl', 'vine:tr', 'pend:l:1.6:100:32:pinkh', 'arrow:24:rtl', 'petals:5:8'],
    schedule:       ['top:lace', 'pile:l:choc,candyP', 'tap:balloons:r:68:54', 'pile:r:roseR,envP', 'pend:r:3.5:76:30:peachc', 'petals:4:9'],
    testimonials:   ['top:bunting', 'pile:l:roseP,roseR', 'pile:r:envC,candyL', 'pend:l:1.4:90:32:bow', 'tap:candy:r:46:34', 'petals:3:10', 'hearts:4:10'],
    pricing:        ['top:curtain', 'bouquet:br', 'pend:r:2.5:110:34:heart', 'arrow:12.6:ltr', 'petals:5:11', 'balloons:l'],
    contact:        ['top:lights', 'tap:lovearrow:l:26:56', 'pile:l:envP,candyL,roseR', 'pile:r:choc,roseP,candyP', 'pend:r:4:90:30:pinkh', 'petals:4:12']
  };
  // What a pile can hold: the symbol, its viewBox, its colour and its size class.
  var ITEMS = {
    candyP: ['vd-candy', HEART_VB, C.pink, 'candy'], candyL: ['vd-candy', HEART_VB, C.lilac, 'candy'], candyY: ['vd-candy', HEART_VB, C.butter, 'candy'], candyM: ['vd-candy', HEART_VB, C.mint, 'candy'],
    envP: ['vd-env', '0 0 100 74', C.blush, 'env'], envC: ['vd-env', '0 0 100 74', C.cream, 'env'],
    roseR: ['vd-rose', '0 0 100 100', C.red, 'rose'], roseP: ['vd-rose', '0 0 100 100', C.pink, 'rose'], bud: ['vd-bud', '0 0 50 120', C.rose, 'bud'], choc: ['vd-choc', HEART_VB, '', 'choc']
  };
  // What can hang on a string.
  var PEND = {
    heart: ['vd-heart', HEART_VB, C.red], pinkh: ['vd-heart', HEART_VB, C.rose], candyL: ['vd-candy', HEART_VB, C.lilac], peachc: ['vd-candy', HEART_VB, C.peach],
    rose: ['vd-rose', '0 0 100 100', C.pink], bow: ['vd-bow', '0 0 64 44', C.rose]
  };
  // What answers a tap, and what it says.
  var TAPS = {
    env: ['vd-env', '0 0 100 74', C.blush, "You've got mail!"], candy: ['vd-candy', HEART_VB, C.lilac, 'Sweet!'],
    lovearrow: ['vd-lovearrow', LOVE_VB, '', 'Love ya!'], balloons: ['vd-bundle', BUNDLE_VB, '', 'Aww!']
  };

  function section(specs, k) {
    var out = '';
    specs.forEach(function (spec) {
      var a = spec.split(':'), kind = a[0];
      if (kind === 'top') {
        out += '<div class="vd-garland vd-garland--' + a[1] + '"></div>';
      } else if (kind === 'bouquet') {
        out += ic('vd-bouquet', 'vd-corner vd-corner--' + a[1], BOUQUET_VB);
      } else if (kind === 'vine') {
        out += ic('vd-vine', 'vd-vinec vd-vinec--' + a[1], '0 0 200 100');
      } else if (kind === 'pile') {
        var bits = '';
        a[2].split(',').forEach(function (it) { var d = ITEMS[it]; if (d) bits += ic(d[0], 'vd-i vd-i--' + d[3], d[1], d[2]); });
        out += '<div class="vd-pile vd-pile--' + a[1] + '">' + bits + '</div>';
      } else if (kind === 'pend') {
        var p = PEND[a[5]];
        out += k.pendant(ic(p[0], '', p[1], p[2]), { side: a[1], at: a[2], len: +a[3], w: +a[4], cls: 'vd-pend' });
      } else if (kind === 'balloons') {
        out += ic('vd-bundle', 'vd-bal vd-bal--' + a[1], BUNDLE_VB);
      } else if (kind === 'petals' || kind === 'hearts' || kind === 'spark') {
        // These keep to the two side margins (a few small, faint ones cross the middle), so the cards and words are left alone.
        var n = +a[1], nl = Math.round(n * 0.4), nr = Math.round(n * 0.4), nm = n - nl - nr, seed = +a[2];
        var base = kind === 'petals' ? { id: 'vd-petal', vb: '0 0 30 40', dur: [16, 30], spin: 1, colors: PETALS, mobile: 0.5, seed: 100 + seed }
          : kind === 'hearts' ? { id: ['vd-heart', 'vd-heart-o'], vb: HEART_VB, dir: 'rise', dur: [16, 28], spin: 0.14, colors: HEARTS, mobile: 0.5, seed: 200 + seed }
          : { id: ['sk-sparkle', 'sk-sparkle', 'vd-heart'], vb: '', dur: [3, 6], colors: [C.blush, C.cream, C.rose, '#ffd6df'], mobile: 0.5, seed: 300 + seed };
        var edge = kind === 'spark' ? { size: [8, 15] } : { size: kind === 'petals' ? [10, 18] : [12, 24], drift: 40, sway: 16, opacity: kind === 'petals' ? [0.45, 0.85] : [0.4, 0.8] };
        var mid = kind === 'spark' ? { size: [7, 11], areaY: [4, 96] } : { size: [8, 13], drift: 70, sway: 24, opacity: [0.28, 0.5] };
        var fn = kind === 'spark' ? k.twinkles : k.particles;
        out += fn(nl, mix(mix(base, edge), { area: [0, 4.5], seed: base.seed })) + fn(nr, mix(mix(base, edge), { area: [95.5, 100], seed: base.seed + 1 })) + fn(nm, mix(mix(base, mid), { area: [10, 90], seed: base.seed + 2 }));
      } else if (kind === 'arrow') {
        out += k.flyers(1, { id: 'vd-arrow', vb: '0 0 260 64', size: [92, 118], dur: [30, 38], top: [+a[1], +a[1] + 0.1], wave: 8, seed: 400 + Math.round(+a[1]), dir: a[2], cls: 'vd-arrowfly vd-arrowfly--s', mobile: 0 });
      } else if (kind === 'tap') {
        var t = TAPS[a[1]];
        out += k.tap(ic(t[0], '', t[1], t[2]), t[3], 'vd-tap vd-tap--' + (a[2] === 'l' ? 'l' : 'r') + ' vd-tap--' + a[1] + ' sk-hide-m', (a[2] === 'l' ? 'left' : 'right') + ':0.4%;top:' + a[3] + '%;width:' + a[4] + 'px');
      }
    });
    return out;
  }

  // ── The foot of the page ──────────────────────────────────────────────────────────────────────────────────────────────────────

  // The rose garden: a clipped hedge with roses along it, one big trellis arch of roses standing over the signs with hearts hanging from its crown, and rose bushes
  // at the foot of each post and in the corners.
  function garden(k) {
    var r = k.rng(63), out = '<svg viewBox="0 -34 1440 354" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">', x, i, w, d, n;
    // the hedge: two clipped tops of round bumps
    d = 'M0 320V150';
    for (x = 0; x < 1440;) { w = 30 + r() * 26; d += 'a' + f1(w / 2) + ' ' + f1(w / 2.4) + ' 0 0 1 ' + f1(w) + ' 0'; x += w; }
    out += '<path d="' + d + 'V320Z" fill="#10261c"/>';
    d = 'M0 320V196';
    for (x = 0; x < 1440;) { w = 26 + r() * 22; d += 'a' + f1(w / 2) + ' ' + f1(w / 2.6) + ' 0 0 1 ' + f1(w) + ' 0'; x += w; }
    out += '<path d="' + d + 'V320Z" fill="#163423"/>';
    for (x = 20, i = 0; x < 1440; x += 56 + r() * 46, i++) {
      out += leafAt(x + (i % 2 ? 16 : -16), 170 + r() * 20, (i % 2 ? 42 : -48) + r() * 16, 0.8, LEAVES_MID[i % 3]);
      out += roseAt(x, 160 + r() * 30, 34 + r() * 16, [C.red, C.pink, C.rose, C.blush, C.hot][i % 5]);
    }
    // the arch: two rails with lattice between them, up the posts and over the top (a half ellipse), then roses and leaves climbing along it
    var cx = 720, rx = 430, ry = 150, sy = 170, bot = 304, line = [], pts = [], th, rails = '', lat = '';
    for (n = 0; n <= 130; n += 2) line.push([cx - rx, bot - n, 0]);                       // up the left post
    for (th = Math.PI; th <= 2 * Math.PI + 1e-6; th += 0.012) line.push([cx + rx * Math.cos(th), sy + ry * Math.sin(th), th]);
    for (n = 130; n >= 0; n -= 2) line.push([cx + rx, bot - n, 0]);                       // down the right post
    rails = '<path d="M' + (cx - rx - 18) + ' ' + bot + 'V' + sy + 'A' + (rx + 18) + ' ' + (ry + 18) + ' 0 0 1 ' + (cx + rx + 18) + ' ' + sy + 'V' + bot + '" fill="none" stroke="' + C.gold + '" stroke-width="4.4" stroke-linecap="round"/>' +
      '<path d="M' + (cx - rx + 18) + ' ' + bot + 'V' + sy + 'A' + (rx - 18) + ' ' + (ry - 18) + ' 0 0 1 ' + (cx + rx - 18) + ' ' + sy + 'V' + bot + '" fill="none" stroke="' + C.gold + '" stroke-width="3.2" stroke-linecap="round"/>';
    var dist = 0, next = 0, prev = line[0];
    line.forEach(function (p, j) {
      dist += Math.sqrt(Math.pow(p[0] - prev[0], 2) + Math.pow(p[1] - prev[1], 2)); prev = p;
      if (dist >= next) {
        var q = line[Math.min(j + 3, line.length - 1)], tx = q[0] - p[0], ty = q[1] - p[1], tl = Math.sqrt(tx * tx + ty * ty) || 1;
        pts.push([p[0], p[1], tx / tl, ty / tl]); next += 52;
      }
    });
    pts.forEach(function (p, j) {                                                          // lattice: a little cross between the rails at every sample
      var nx = -p[3], ny = p[2];
      lat += 'M' + f1(p[0] - nx * 18 - p[2] * 14) + ' ' + f1(p[1] - ny * 18 - p[3] * 14) + 'L' + f1(p[0] + nx * 18 + p[2] * 14) + ' ' + f1(p[1] + ny * 18 + p[3] * 14) +
        'M' + f1(p[0] - nx * 18 + p[2] * 14) + ' ' + f1(p[1] - ny * 18 + p[3] * 14) + 'L' + f1(p[0] + nx * 18 - p[2] * 14) + ' ' + f1(p[1] + ny * 18 - p[3] * 14);
    });
    out += rails + '<path d="' + lat + '" fill="none" stroke="' + C.gold + '" stroke-opacity=".6" stroke-width="1.6" stroke-linecap="round"/>';
    pts.forEach(function (p, j) {
      if (j % 2) out += leafAt(p[0] + p[3] * 14, p[1] - p[2] * 14, Math.atan2(p[3], p[2]) * 180 / Math.PI + (j % 4 ? 28 : -28), 0.75, LEAVES[j % 3]);
    });
    pts.forEach(function (p, j) { if (!(j % 2) || j % 4 === 1) out += roseAt(p[0], p[1], 30 + (j % 3) * 7, [C.red, C.pink, C.rose, C.blush, C.hot][j % 5]); });
    // the crown: a bow, and three hearts on strings
    out += '<g stroke="' + C.gold + '" stroke-width="1.6" fill="none"><path d="M676 34V66M720 34V84M764 34V66"/></g>' + heartAt(676, 72, 20, C.rose) + heartAt(720, 92, 24, C.red) + heartAt(764, 72, 20, C.blush) +
      '<use href="#vd-bow" x="694" y="4" width="52" height="36" style="color:' + C.pink + '"/>';
    out += '<path d="M0 262Q300 244 600 256T1200 252T1440 256V320H0Z" fill="#14070d"/>';
    // rose bushes at the foot of each post and in the corners
    [[300, 1], [1140, 1], [40, 1], [1400, 1]].forEach(function (B, m) {
      var bx = B[0];
      out += leafAt(bx - 40, 300, -64, 1.5, LEAVES[m % 3]) + leafAt(bx + 42, 300, 62, 1.5, LEAVES[(m + 1) % 3]) + leafAt(bx, 296, -6, 1.7, LEAVES[(m + 2) % 3]);
      out += roseAt(bx, 272, 72, [C.rose, C.red, C.pink, C.blush][m]);
    });
    for (i = 0; i < 18; i++) out += petalAt(20 + r() * 1400, 288 + r() * 26, r() * 360, 0.5 + r() * 0.3, PETALS[i % 5]);
    return out + '</svg>';
  }

  // Four candy-heart signs on stakes, between a bundle of balloons and a rose bush on one side and a box of chocolates, candy hearts and a rose on the other.
  var SAYINGS = ['our word for respect', 'we cheer for each other', 'friends made on the mat', 'for the love of the sport'];
  var TITLES = ['OSS', 'TEAM', 'FRIENDS', 'LOVE IT'];
  var SIGN_COLORS = [C.pink, C.lilac, C.peach, C.blush];
  function footer(k) {
    var signs = SAYINGS.map(function (s, i) {
      return '<div class="vd-sign vd-sign--' + (i + 1) + '">' + ic('vd-candybody', 'vd-sign__bg', HEART_VB, SIGN_COLORS[i]) + '<span>' + TITLES[i] + '</span> <em>' + s + '</em><i class="vd-stake"></i></div>';
    }).join('');
    // Back to front: the heart of light and the garden, then whatever drifts through it (behind the signs, so no words are covered), then the props, signs and ground.
    return '<div class="vd-fglow">' + glow() + '</div><div class="vd-garden">' + garden(k) + '</div>' +
      k.flyers(1, { id: 'vd-butterfly', vb: '0 0 60 46', size: [30, 34], dur: [34, 34], top: [34, 36], wave: 24, flap: true, colors: [C.pink], seed: 71, cls: 'vd-bfly vd-bfly--1', mobile: 1 }) +
      k.flyers(1, { id: 'vd-butterfly', vb: '0 0 60 46', size: [24, 28], dur: [44, 44], top: [20, 22], wave: -18, flap: true, colors: [C.blush], seed: 72, cls: 'vd-bfly vd-bfly--2', dir: 'rtl', mobile: 0 }) +
      k.particles(7, { id: ['vd-heart', 'vd-heart-o'], vb: HEART_VB, dir: 'rise', size: [12, 28], dur: [14, 24], drift: 50, sway: 24, spin: 0.14, opacity: [0.4, 0.85], colors: HEARTS, seed: 310, mobile: 0.5 }) +
      k.particles(6, { id: 'vd-petal', vb: '0 0 30 40', size: [10, 18], dur: [12, 20], drift: 70, sway: 24, spin: 1, opacity: [0.5, 0.85], colors: PETALS, seed: 311, mobile: 0.5 }) +
      k.twinkles(10, { id: 'sk-sparkle', size: [8, 14], dur: [3, 6], colors: [C.blush, C.cream, C.rose], seed: 312, mobile: 0.5, areaY: [4, 70] }) +
      '<div class="vd-props vd-props--l sk-props">' + ic('vd-bundle', 'vd-p vd-p--bundle', BUNDLE_VB) + ic('vd-rose', 'vd-p vd-p--rose', '0 0 100 100', C.rose) + ic('vd-bud', 'vd-p vd-p--bud', '0 0 50 120', C.blush) + '</div>' +
      '<div class="vd-signs sk-signs">' + signs + '</div>' +
      '<div class="vd-props vd-props--r sk-props">' + ic('vd-candy', 'vd-p vd-p--candy', HEART_VB, C.lilac) + ic('vd-choc', 'vd-p vd-p--choc', HEART_VB) + ic('vd-candy', 'vd-p vd-p--candy2', HEART_VB, C.peach) + ic('vd-bud', 'vd-p vd-p--bud', '0 0 50 120', C.rose) + '</div>' +
      '<div class="vd-ground"></div>';
  }

  var T = {
    name: 'valentines', prefix: 'vd',
    meta: { bg: '#14070d', gold: '#ff6f9a', emoji: '💝', tapSay: ['Love ya!', 'Aww!', "You've got mail!", 'Sweet!'], sayings: SAYINGS },
    defs: DEFS,
    hero: hero,
    sections: {},
    footer: footer,
    // Tap the balloons and hearts pop out of them; the letter lets a few go, the arrow a few sparkles.
    onTap: function (el, k) {
      var cl = el.classList;
      if (cl.contains('vd-tap--balloons')) k.burst(el, { id: 'vd-heart', vb: HEART_VB, n: 16, colors: HEARTS, dist: [50, 130], size: [10, 20] });
      else if (cl.contains('vd-tap--env')) k.burst(el, { id: 'vd-heart', vb: HEART_VB, n: 8, colors: [C.rose, C.red, C.blush], dist: [34, 84], size: [9, 16] });
      else if (cl.contains('vd-tap--lovearrow') || cl.contains('vd-tap--arrow')) k.burst(el, { id: 'sk-sparkle', vb: '0 0 20 20', n: 10, colors: [C.blush, C.cream, C.rose], dist: [34, 90], size: [8, 16] });
      else if (cl.contains('vd-tap--candy')) k.burst(el, { id: 'vd-heart', vb: HEART_VB, n: 6, colors: [C.lilac, C.pink, C.peach], dist: [30, 70], size: [8, 14] });
    }
  };
  Object.keys(SECTIONS).forEach(function (id) { T.sections[id] = function (k) { return section(SECTIONS[id], k); }; });
  (window.SeasonKit ? window.SeasonKit.mount : function (t) { (window.__skq = window.__skq || []).push(t); })(T);
})();
