/* Cinco de Mayo: the homepage's scene for May 1 through May 15 (index.html's <head> turns it on from the date and loads this with season-kit.css,
   season-kit.js and season-cinco.css, which draws it). A festival of color on a dark warm-indigo night: strings of papel picado (cut-paper banners)
   swaying across the top of the hero, a star pinata swinging on its rope, confetti coming down, a wall of tiles along the foot of the hero with
   clay pots, marigolds, dahlias and flowering cacti and a string of glowing chili lights; a layer behind every section (papel picado, marigold
   garlands, flower mounds, potted cacti, chili ristras, small pinatas, butterflies, tile strips) and a market stall above the footer. Tap the
   pinata, a cactus or a pot of flowers and it answers. Nothing here reads or writes anything about a visitor, and nothing is built unless the
   page is in the season. */
(function () {
  var C = {
    green: '#1f9d55', greenD: '#0f6b38', greenL: '#46c97f', red: '#d62839', pink: '#ff3f8e', turq: '#17c3b2', yellow: '#ffd23f', orange: '#ff7b00',
    gold: '#ffb627', cream: '#fff1d6', indigo: '#2a1450', clay: '#d9653a', clayL: '#ea7c4d', clayD: '#a8441f'
  };
  var FEST = [C.pink, C.turq, C.yellow, C.orange, C.green, C.red];                  // the festival colors, for confetti and paper

  /* ── Geometry: little helpers that write SVG path data ─────────────────────────────────────────────────────────────────────── */
  function r1(v) { return Math.round(v * 10) / 10; }
  function pol(cx, cy, r, deg) { var a = deg * Math.PI / 180; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; }
  function circ(cx, cy, r) { return 'M' + r1(cx - r) + ' ' + r1(cy) + 'a' + r + ' ' + r + ' 0 1 0 ' + 2 * r + ' 0a' + r + ' ' + r + ' 0 1 0 ' + (-2 * r) + ' 0Z'; }
  function poly(pts) { return 'M' + pts.map(function (p) { return r1(p[0]) + ' ' + r1(p[1]); }).join('L') + 'Z'; }
  function starPts(cx, cy, ro, ri, n, rot) { var pts = [], i; for (i = 0; i < n * 2; i++) pts.push(pol(cx, cy, i % 2 ? ri : ro, rot + i * 180 / n)); return pts; }
  function lobed(cx, cy, r, amp, n, rot) {                                          // a flower outline with n round lobes
    var pts = [], i, steps = n * 8, a; for (i = 0; i < steps; i++) { a = i * 360 / steps; pts.push(pol(cx, cy, r + amp * Math.cos(n * a * Math.PI / 180), a + rot)); } return poly(pts);
  }
  function ring(cx, cy, n, R, r, off) { var d = '', i, p; for (i = 0; i < n; i++) { p = pol(cx, cy, R, off + i * 360 / n); d += circ(p[0], p[1], r); } return d; }
  function petal(cx, cy, ang, r0, L, w) {                                           // a pointed oval petal, base at radius r0, pointing out at angle ang
    var c = Math.cos(ang * Math.PI / 180), s = Math.sin(ang * Math.PI / 180);
    function P(x, y) { return r1(cx + x * c - y * s) + ' ' + r1(cy + x * s + y * c); }
    return 'M' + P(r0, 0) + 'C' + P(r0 + L * 0.22, -w) + ' ' + P(r0 + L * 0.72, -w * 0.95) + ' ' + P(r0 + L, 0) + 'C' + P(r0 + L * 0.72, w * 0.95) + ' ' + P(r0 + L * 0.22, w) + ' ' + P(r0, 0) + 'Z';
  }
  function petals(cx, cy, n, r0, L, w, off) { var d = '', i; for (i = 0; i < n; i++) d += petal(cx, cy, off + i * 360 / n, r0, L, w); return d; }

  /* ── Art: every shape is drawn once here and reused with <use>. Many take their colour from `color` (currentColor) ─────────────── */
  var VB = {};                                                                      // symbol id -> its viewBox, so a <use> is never given the wrong one
  function sym(id, vb, inner) { VB[id] = vb; return '<symbol id="' + id + '" viewBox="' + vb + '">' + inner + '</symbol>'; }

  // Marigold (cempasuchil): a round, ruffled pompom of petals in rings, each ring a little lighter. Orange, gold or yellow by `color`.
  var mg1 = ring(50, 50, 14, 35, 13.5, 0), mg2 = ring(50, 50, 12, 25, 12.5, 15), mg3 = ring(50, 50, 9, 15, 11, 0);
  var MARIGOLD = sym('cm-marigold', '0 0 100 100',
    '<path d="' + mg1 + '" fill="currentColor" stroke="#5a1f00" stroke-opacity=".3" stroke-width="1.3"/>' +
    '<path d="' + mg2 + '" fill="currentColor" stroke="#5a1f00" stroke-opacity=".26" stroke-width="1.3"/><path d="' + mg2 + '" fill="#fff" fill-opacity=".13"/>' +
    '<path d="' + mg3 + '" fill="currentColor" stroke="#5a1f00" stroke-opacity=".24" stroke-width="1.3"/><path d="' + mg3 + '" fill="#fff" fill-opacity=".26"/>' +
    '<circle cx="50" cy="50" r="8.5" fill="currentColor"/><circle cx="50" cy="50" r="8.5" fill="#fff" fill-opacity=".45"/>');

  // Dahlia: rings of pointed petals, lighter toward the middle. Pink, red, orange or yellow by `color`.
  var dh = [petals(50, 50, 13, 6, 42, 8.5, 0), petals(50, 50, 13, 5, 34, 8, 13.8), petals(50, 50, 11, 4, 26, 7, 0), petals(50, 50, 9, 3, 18, 6, 10), petals(50, 50, 7, 2, 10, 4.6, 0)];
  var DAHLIA = sym('cm-dahlia', '0 0 100 100',
    '<path d="' + dh[0] + '" fill="currentColor" stroke="#000" stroke-opacity=".22" stroke-width="1.1"/>' +
    '<path d="' + dh[1] + '" fill="currentColor" stroke="#000" stroke-opacity=".2" stroke-width="1.1"/><path d="' + dh[1] + '" fill="#fff" fill-opacity=".16"/>' +
    '<path d="' + dh[2] + '" fill="currentColor" stroke="#000" stroke-opacity=".18" stroke-width="1.1"/><path d="' + dh[2] + '" fill="#fff" fill-opacity=".28"/>' +
    '<path d="' + dh[3] + '" fill="currentColor" stroke="#000" stroke-opacity=".16" stroke-width="1"/><path d="' + dh[3] + '" fill="#fff" fill-opacity=".4"/>' +
    '<path d="' + dh[4] + '" fill="#fff" fill-opacity=".55"/><circle cx="50" cy="50" r="3.6" fill="' + C.yellow + '"/>');

  // A five-petal bloom for the cacti, and a leaf.
  var bl = ring(20, 20, 5, 10, 8.5, -90);
  var BLOOM = sym('cm-bloom', '0 0 40 40',
    '<path d="' + bl + '" fill="currentColor" stroke="#000" stroke-opacity=".22" stroke-width="1.2"/><path d="' + bl + '" fill="#fff" fill-opacity=".14"/>' +
    '<circle cx="20" cy="20" r="6" fill="' + C.yellow + '"/><circle cx="20" cy="20" r="2.6" fill="' + C.orange + '"/>');
  var LEAF = sym('cm-leaf', '0 0 40 80',
    '<path d="M20 78C3 60 2 30 20 2C38 30 37 60 20 78Z" fill="currentColor"/><path d="M20 2C38 30 37 60 20 78Z" fill="#000" fill-opacity=".14"/><path d="M20 74V12" stroke="#000" stroke-opacity=".22" stroke-width="2" stroke-linecap="round"/>');

  // Saguaro with two raised arms and a flower on each tip (the arms-up pose says arriba).
  var SAGUARO = sym('cm-saguaro', '0 0 100 170',
    '<g fill="none" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M50 114H29Q18 114 18 103V56" stroke="' + C.green + '" stroke-width="19"/><path d="M50 94H71Q82 94 82 83V40" stroke="' + C.green + '" stroke-width="19"/>' +
      '<path d="M50 170V30" stroke="' + C.green + '" stroke-width="29"/>' +
      '<path d="M58 164V36" stroke="' + C.greenL + '" stroke-width="7" opacity=".5"/><path d="M24 108V60" stroke="' + C.greenL + '" stroke-width="5" opacity=".5"/><path d="M88 78V44" stroke="' + C.greenL + '" stroke-width="5" opacity=".5"/>' +
      '<path d="M43 38V168M57 38V168M13 100V62M23 100V62M77 80V46M87 80V46" stroke="' + C.greenD + '" stroke-opacity=".5" stroke-width="1.6"/>' +
      '<path d="M43 40V166M57 40V166" stroke="' + C.cream + '" stroke-opacity=".7" stroke-width="1.6" stroke-dasharray="1 7"/>' +
    '</g>' +
    '<use href="#cm-bloom" x="35" y="1" width="30" height="30" style="color:' + C.pink + '"/><use href="#cm-bloom" x="6" y="32" width="24" height="24" style="color:' + C.yellow + '"/><use href="#cm-bloom" x="70" y="16" width="24" height="24" style="color:' + C.red + '"/>');

  // Prickly pear (nopal): stacked paddles with red fruit and a yellow bloom.
  var pad = function (cx, cy, rx, ry, rot) {
    return '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '" transform="rotate(' + rot + ' ' + cx + ' ' + cy + ')" fill="' + C.green + '" stroke="' + C.greenD + '" stroke-width="1.6"/>' +
      '<ellipse cx="' + (cx - rx * 0.28) + '" cy="' + (cy - ry * 0.12) + '" rx="' + rx * 0.5 + '" ry="' + ry * 0.62 + '" transform="rotate(' + rot + ' ' + cx + ' ' + cy + ')" fill="' + C.greenL + '" fill-opacity=".3"/>';
  };
  var dots = function (cx, cy, rx, ry, rot) {
    var d = '', i, j, p; for (i = -1; i <= 1; i++) for (j = -1; j <= 1; j++) { if (i === 0 && j === 0) continue; p = [cx + i * rx * 0.46, cy + j * ry * 0.46]; d += '<circle cx="' + r1(p[0]) + '" cy="' + r1(p[1]) + '" r="1.2"/>'; }
    return '<g transform="rotate(' + rot + ' ' + cx + ' ' + cy + ')" fill="' + C.cream + '" fill-opacity=".85">' + d + '</g>';
  };
  var NOPAL = sym('cm-nopal', '0 0 110 120',
    pad(25, 24, 13, 18, -30) + pad(87, 20, 13, 18, 28) + pad(34, 57, 20, 27, -16) + pad(78, 53, 20, 27, 15) + pad(55, 91, 25, 29, 0) +
    dots(34, 57, 20, 27, -16) + dots(78, 53, 20, 27, 15) + dots(55, 91, 25, 29, 0) +
    '<ellipse cx="17" cy="7" rx="5" ry="7" fill="' + C.pink + '"/><ellipse cx="17" cy="5" rx="3" ry="2.4" fill="' + C.red + '"/>' +
    '<ellipse cx="93" cy="4" rx="5" ry="7" fill="' + C.pink + '"/><ellipse cx="93" cy="2" rx="3" ry="2.4" fill="' + C.red + '"/>' +
    '<ellipse cx="53" cy="62" rx="4.5" ry="6" fill="' + C.red + '"/><use href="#cm-bloom" x="40" y="38" width="30" height="30" style="color:' + C.yellow + '"/>');

  // Barrel cactus: a round ribbed cactus crowned with flowers.
  var BARREL = sym('cm-barrel', '0 0 100 92',
    '<ellipse cx="50" cy="60" rx="38" ry="30" fill="' + C.green + '"/><ellipse cx="38" cy="52" rx="13" ry="18" fill="' + C.greenL + '" fill-opacity=".28"/>' +
    '<g fill="none" stroke="' + C.greenD + '" stroke-opacity=".55" stroke-width="2"><path d="M50 31V90"/><path d="M37 32Q23 60 36 89"/><path d="M63 32Q77 60 64 89"/><path d="M26 38Q11 62 24 83"/><path d="M74 38Q89 62 76 83"/></g>' +
    '<g fill="none" stroke="' + C.cream + '" stroke-opacity=".85" stroke-width="1.8" stroke-linecap="round" stroke-dasharray="1 6"><path d="M50 33V88"/><path d="M37 34Q24 60 36 87"/><path d="M63 34Q76 60 64 87"/></g>' +
    '<use href="#cm-bloom" x="26" y="14" width="26" height="26" style="color:' + C.pink + '"/><use href="#cm-bloom" x="50" y="10" width="28" height="28" style="color:' + C.yellow + '"/><use href="#cm-bloom" x="40" y="20" width="22" height="22" style="color:' + C.red + '"/>');

  // Agave: a rosette of pointed blue-green leaves.
  var lf = function (ang, L, w, col) {
    var c = Math.cos(ang * Math.PI / 180), s = Math.sin(ang * Math.PI / 180);
    function P(x, y) { return r1(50 + (x * c - y * s)) + ' ' + r1(88 + (x * s + y * c)); }
    return '<path d="M' + P(0, 0) + 'C' + P(-w, -L * 0.18) + ' ' + P(-w * 1.05, -L * 0.62) + ' ' + P(0, -L) + 'C' + P(w * 1.05, -L * 0.62) + ' ' + P(w, -L * 0.18) + ' ' + P(0, 0) + 'Z" fill="' + col + '" stroke="#0b5d52" stroke-opacity=".5" stroke-width="1.2"/>' +
      '<path d="M' + P(0, -4) + 'L' + P(0, -L * 0.82) + '" stroke="#fff" stroke-opacity=".35" stroke-width="2" stroke-linecap="round"/>';
  };
  var AGAVE = sym('cm-agave', '0 0 100 90',
    lf(-78, 52, 11, '#14917f') + lf(78, 52, 11, '#14917f') + lf(-54, 66, 12, '#1aa890') + lf(54, 66, 12, '#1aa890') + lf(-28, 78, 12.5, '#22bba2') + lf(28, 78, 12.5, '#22bba2') + lf(0, 84, 13, '#31cfb4'));

  // Clay pots: a flower pot with a turquoise band, and a round olla.
  var diamonds = ''; (function () { for (var i = 0; i < 5; i++) diamonds += poly([[18 + i * 11, 28.5], [22.5 + i * 11, 32], [18 + i * 11, 35.5], [13.5 + i * 11, 32]]); })();
  var POT = sym('cm-pot', '0 0 80 66',
    '<path d="M10 14H70L63 63Q62.5 66 59.5 66H20.5Q17.5 66 17 63Z" fill="' + C.clay + '"/><path d="M11 14H27L24.5 66H19Z" fill="#fff" fill-opacity=".16"/><path d="M56 14H70L63 63Q62.5 66 59.5 66H52Z" fill="#000" fill-opacity=".17"/>' +
    '<path d="M11.9 25H68.1L66.7 39H13.3Z" fill="' + C.turq + '"/><path d="M11.9 25H68.1L67.9 27H12.1Z" fill="#fff" fill-opacity=".35"/><path d="' + diamonds + '" fill="' + C.cream + '"/>' +
    '<rect x="4" y="0" width="72" height="16" rx="4.5" fill="' + C.clayL + '"/><path d="M4 12H76V16H4Z" fill="#000" fill-opacity=".14"/><rect x="9" y="3.2" width="30" height="3.2" rx="1.6" fill="#fff" fill-opacity=".35"/>');
  var OLLA_BODY = 'M28 12C14 18 4 32 6 52C8 70 24 82 40 82S72 70 74 52C76 32 66 18 52 12Z';
  var OLLA = sym('cm-olla', '0 0 80 84',
    '<clipPath id="cm-olla-c"><path d="' + OLLA_BODY + '"/></clipPath><path d="' + OLLA_BODY + '" fill="' + C.clay + '"/>' +
    '<g clip-path="url(#cm-olla-c)"><path d="M0 14H18L16 84H0Z" fill="#fff" fill-opacity=".0"/><path d="M12 22C8 36 8 58 14 76L24 80C16 62 16 40 22 18Z" fill="#fff" fill-opacity=".17"/><path d="M80 14H62C70 36 70 62 58 84H80Z" fill="#000" fill-opacity=".17"/>' +
    '<path d="M0 38H80V50H0Z" fill="' + C.yellow + '"/><path d="M0 40H80V48H0Z" fill="' + C.pink + '"/><path d="M0 54H80V58H0Z" fill="' + C.turq + '"/><path d="M0 32H80V35H0Z" fill="' + C.turq + '"/>' +
    '<g fill="' + C.cream + '"><circle cx="14" cy="44" r="2.4"/><circle cx="26" cy="44" r="2.4"/><circle cx="38" cy="44" r="2.4"/><circle cx="50" cy="44" r="2.4"/><circle cx="62" cy="44" r="2.4"/><circle cx="74" cy="44" r="2.4"/></g></g>' +
    '<rect x="22" y="0" width="36" height="14" rx="5" fill="' + C.clayL + '"/><path d="M22 10H58V14H22Z" fill="#000" fill-opacity=".14"/><rect x="26" y="2.6" width="14" height="3" rx="1.5" fill="#fff" fill-opacity=".35"/>');

  // Potted plants (a plant on a pot, one symbol each, so a row of them is just a row of <svg>s).
  function stack(parts) { var out = '', i; for (i = 0; i < parts.length; i++) out += '<use href="#' + parts[i][0] + '" x="' + parts[i][1] + '" y="' + parts[i][2] + '" width="' + parts[i][3] + '" height="' + parts[i][4] + '"' + (parts[i][5] ? ' style="color:' + parts[i][5] + '"' : '') + '/>'; return out; }
  var stems = function (list) { var d = '', i; for (i = 0; i < list.length; i++) d += 'M' + list[i][0] + ' ' + list[i][1] + 'Q' + list[i][2] + ' ' + list[i][3] + ' ' + list[i][4] + ' ' + list[i][5]; return '<path d="' + d + '" fill="none" stroke="' + C.greenD + '" stroke-width="3.2" stroke-linecap="round"/>'; };
  var P_SAG = sym('cm-p-sag', '0 0 100 226', stack([['cm-saguaro', 0, 0, 100, 170], ['cm-pot', 10, 160, 80, 66]]));
  var P_NOPAL = sym('cm-p-nopal', '0 0 110 176', stack([['cm-nopal', 0, 0, 110, 120], ['cm-pot', 15, 110, 80, 66]]));
  var P_BARREL = sym('cm-p-barrel', '0 0 100 146', stack([['cm-barrel', 0, 0, 100, 92], ['cm-olla', 10, 62, 80, 84]]));
  var P_AGAVE = sym('cm-p-agave', '0 0 100 150', stack([['cm-agave', 0, 0, 100, 90], ['cm-pot', 10, 84, 80, 66]]));
  var P_MARI = sym('cm-p-mari', '0 0 110 150',
    stems([[55, 96, 55, 60, 55, 30], [55, 98, 36, 76, 28, 50], [55, 98, 76, 78, 84, 52]]) +
    '<use href="#cm-leaf" x="38" y="66" width="14" height="28" transform="rotate(-38 45 94)" style="color:' + C.green + '"/><use href="#cm-leaf" x="58" y="66" width="14" height="28" transform="rotate(38 65 94)" style="color:' + C.green + '"/>' +
    stack([['cm-marigold', 6, 24, 44, 44], ['cm-marigold', 60, 26, 44, 44], ['cm-marigold', 31, 0, 50, 50], ['cm-pot', 15, 84, 80, 66]]));
  var P_DAHL = sym('cm-p-dahl', '0 0 110 150',
    stems([[55, 96, 55, 60, 55, 30], [55, 98, 36, 76, 28, 50], [55, 98, 76, 78, 84, 52]]) +
    '<use href="#cm-leaf" x="38" y="66" width="14" height="28" transform="rotate(-38 45 94)" style="color:' + C.green + '"/><use href="#cm-leaf" x="58" y="66" width="14" height="28" transform="rotate(38 65 94)" style="color:' + C.green + '"/>' +
    stack([['cm-dahlia', 4, 24, 46, 46], ['cm-dahlia', 60, 26, 46, 46], ['cm-dahlia', 29, 0, 54, 54], ['cm-pot', 15, 84, 80, 66]]));
  var P_OLLA = sym('cm-p-olla', '0 0 110 156',
    stems([[55, 80, 55, 50, 55, 26], [52, 82, 34, 62, 26, 40], [58, 82, 76, 62, 84, 40]]) +
    stack([['cm-marigold', 8, 18, 40, 40], ['cm-marigold', 62, 18, 40, 40], ['cm-marigold', 33, 0, 46, 46], ['cm-olla', 15, 70, 80, 84]]));

  // Chili pepper, a ristra (a hanging bunch of them) and a wrapped candy.
  var CHILI = sym('cm-chili', '0 0 36 90',
    '<path d="M18 13C8 13 4 24 6.5 39C9 55 14 71 22 87C22.5 71 29 58 31 42C33 26 28 13 18 13Z" fill="currentColor"/>' +
    '<path d="M30 30C32.5 46 25 60 22 87C23 72 28 58 31 42C32 36 31 33 30 30Z" fill="#000" fill-opacity=".2"/><path d="M11 26C9.5 37 11.5 49 15 59" stroke="#fff" stroke-opacity=".42" stroke-width="3" stroke-linecap="round" fill="none"/>' +
    '<path d="M9 15C8 8 28 8 27 15C26 19 10 19 9 15Z" fill="' + C.green + '"/><path d="M13 12H23" stroke="#fff" stroke-opacity=".3" stroke-width="1.6" stroke-linecap="round"/><path d="M18 10C18 5 21 2 26 1" stroke="' + C.greenD + '" stroke-width="3.6" stroke-linecap="round" fill="none"/>');
  var rs = '', ri;
  for (ri = 0; ri < 5; ri++) {
    rs += '<use href="#cm-chili" x="-11" y="0" width="22" height="55" transform="translate(' + (30 - 5) + ' ' + (10 + ri * 29) + ') rotate(' + (14 + ri * 1.5) + ')" style="color:' + (ri % 2 ? '#d62839' : '#b81d2d') + '"/>' +
      '<use href="#cm-chili" x="-11" y="0" width="22" height="55" transform="translate(' + (30 + 5) + ' ' + (16 + ri * 29) + ') rotate(' + (-14 - ri * 1.5) + ')" style="color:' + (ri % 2 ? '#c4202f' : '#e0472f') + '"/>';
  }
  var RISTRA = sym('cm-ristra', '0 0 60 200', '<path d="M30 0V176" stroke="#d6b27a" stroke-width="2.6"/>' + rs + '<circle cx="30" cy="8" r="3.4" fill="#d6b27a"/>');
  var PETAL = sym('cm-petal', '0 0 20 24', '<path d="M10 23C2 19 0 9 4 3C6.5 -0.5 13.5 -0.5 16 3C20 9 18 19 10 23Z" fill="currentColor"/><path d="M10 20C6 16 5.5 9 8 5C8.8 3.8 11.2 3.8 12 5C14.5 9 14 16 10 20Z" fill="#fff" fill-opacity=".24"/><path d="M10 21V8" stroke="#5a1f00" stroke-opacity=".3" stroke-width="1" stroke-linecap="round"/>');
  var CANDY = sym('cm-candy', '0 0 40 20',
    '<path d="M11 10L1 2V18Z" fill="currentColor"/><path d="M29 10L39 2V18Z" fill="currentColor"/><path d="M11 10L1 2V18Z" fill="#fff" fill-opacity=".3"/><path d="M29 10L39 2V18Z" fill="#fff" fill-opacity=".3"/>' +
    '<ellipse cx="20" cy="10" rx="11" ry="7.5" fill="currentColor"/><path d="M15 4.4L19 15.6M21 3L25 16.5" stroke="#fff" stroke-opacity=".75" stroke-width="2.4" stroke-linecap="round"/>');

  // The pinatas: a seven-point star and a fringed ball.
  var pn = '', pcols = [C.pink, C.turq, C.yellow, C.orange, C.green, C.red, C.turq], pi;
  for (pi = 0; pi < 7; pi++) {
    var pa = -90 + pi * 360 / 7, tip = pol(70, 84, 64, pa), bl2 = pol(70, 84, 37, pa - 180 / 7), br2 = pol(70, 84, 37, pa + 180 / 7);
    var lerp = function (a, b, f) { return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]; };
    var fr = function (f) { var l = lerp(bl2, tip, f), r = lerp(br2, tip, f); return 'M' + r1(l[0]) + ' ' + r1(l[1]) + 'L' + r1(r[0]) + ' ' + r1(r[1]); };
    pn += '<path d="' + poly([bl2, tip, br2, [70, 84]]) + '" fill="' + pcols[pi] + '"/><path d="' + poly([tip, br2, [70, 84]]) + '" fill="#fff" fill-opacity=".2"/>' +
      '<path d="' + fr(0.3) + fr(0.52) + fr(0.74) + '" stroke="#fff" stroke-opacity=".6" stroke-width="2.6" stroke-dasharray="3 2.4" fill="none"/><circle cx="' + r1(tip[0]) + '" cy="' + r1(tip[1]) + '" r="3.4" fill="#fff" fill-opacity=".85"/>';
  }
  var stream = function (d, col) { return '<path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="3.4" stroke-linecap="round"/>'; };
  var PINATA = sym('cm-pinata', '0 0 140 176',
    stream('M98 141c3 7-3 12 0 19s-2 11 1 15', C.pink) + stream('M102 139c5 5 1 11 5 17s1 9 4 12', C.yellow) + stream('M42 141c-3 7 3 12 0 19s2 11-1 15', C.turq) + stream('M38 139c-5 5-1 11-5 17s-1 9-4 12', C.orange) +
    '<path d="M70 17V24" stroke="' + C.cream + '" stroke-width="3" stroke-linecap="round"/><circle cx="70" cy="11" r="6" fill="none" stroke="' + C.cream + '" stroke-width="3"/>' + pn +
    '<circle cx="70" cy="84" r="29" fill="' + C.yellow + '"/><circle cx="70" cy="84" r="22.5" fill="none" stroke="' + C.pink + '" stroke-width="3" stroke-dasharray="4 4"/><circle cx="70" cy="84" r="10" fill="' + C.orange + '"/>' +
    '<path d="M52 72A24 24 0 0 1 65 61" stroke="#fff" stroke-opacity=".7" stroke-width="3" stroke-linecap="round" fill="none"/>');
  var bands = '', bi, bcols = [C.pink, C.yellow, C.turq, C.orange, C.green, C.red];
  for (bi = 5; bi >= 0; bi--) {
    var by = 24 + bi * 15, sc = '';
    for (var bj = 0; bj < 8; bj++) sc += 'A6.25 6.25 0 0 1 ' + (100 - 12.5 * (bj + 1)) + ' ' + (by + 20);
    bands += '<path d="M0 ' + by + 'H100V' + (by + 20) + sc + 'V' + by + 'Z" fill="' + bcols[bi] + '"/><path d="M0 ' + by + 'H100V' + (by + 4) + 'H0Z" fill="#000" fill-opacity=".14"/>';
  }
  var PINBALL = sym('cm-pinball', '0 0 100 112',
    '<clipPath id="cm-ball-c"><circle cx="50" cy="64" r="40"/></clipPath><path d="M50 8V20" stroke="' + C.cream + '" stroke-width="3" stroke-linecap="round"/><circle cx="50" cy="7" r="5.5" fill="none" stroke="' + C.cream + '" stroke-width="3"/>' +
    '<g clip-path="url(#cm-ball-c)">' + bands + '</g><path d="M26 44A28 28 0 0 1 40 30" stroke="#fff" stroke-opacity=".6" stroke-width="4" stroke-linecap="round" fill="none"/>');

  // Papel picado: a flag of cut paper, 64 by 52. The outline and the cut-outs are one path, filled even-odd, so the cut-outs are real holes the night shows through.
  function flag(id, d) { return sym('cm-pp-' + id, '0 0 64 52', '<path fill="currentColor" fill-rule="evenodd" d="' + d + '"/><path d="M0 0H64V6H0Z" fill="#000" fill-opacity=".17"/><path d="M0 6.4H64" stroke="#fff" stroke-opacity=".3" stroke-width="1"/>'); }
  var tabs = ''; (function () { for (var k = 7; k >= 0; k--) tabs += 'H' + (8 * k + 6.5) + 'V50H' + (8 * k + 1.5) + 'V38'; })();
  var zig = ''; (function () { for (var k = 7; k >= 0; k--) zig += 'L' + (8 * k + 4) + ' 48L' + (8 * k) + ' 42'; })();
  var PP = [
    flag('a', 'M0 0H64V40A8 8 0 0 1 48 40A8 8 0 0 1 32 40A8 8 0 0 1 16 40A8 8 0 0 1 0 40Z' + lobed(32, 22, 8.8, 3.4, 6, -90) + circ(32, 22, 3) + circ(8, 37, 2.7) + circ(24, 37, 2.7) + circ(40, 37, 2.7) + circ(56, 37, 2.7) + circ(7, 14, 2.2) + circ(7, 24, 2.2) + circ(57, 14, 2.2) + circ(57, 24, 2.2)),
    flag('b', 'M0 0H64V38L56 50L48 38L40 50L32 38L24 50L16 38L8 50L0 38Z' + poly([[32, 8], [46.5, 20.5], [32, 33], [17.5, 20.5]]) + poly([[32, 14], [40, 20.5], [32, 27], [24, 20.5]]) + poly([[3, 15], [11, 20.5], [3, 26]]) + poly([[61, 15], [53, 20.5], [61, 26]])),
    flag('c', 'M0 0H64V38A10.67 10 0 0 1 42.67 38A10.67 10 0 0 1 21.33 38A10.67 10 0 0 1 0 38Z' + 'M22 9L27 14L32 6L37 14L42 9V21C42 26 38.5 29 33.5 30.4V43H30.5V30.4C25.5 29 22 26 22 21Z' +
      'M29 40C23 40 19 36 18 30C23.5 30.5 27.5 33.5 29 38Z' + 'M35 40C41 40 45 36 46 30C40.5 30.5 36.5 33.5 35 38Z' + circ(7, 13, 2.3) + circ(57, 13, 2.3) + circ(7, 24, 2.3) + circ(57, 24, 2.3)),
    flag('d', 'M0 0H64V38' + tabs + 'H0Z' + poly(starPts(32, 20, 13.5, 6, 8, -90)) + circ(32, 20, 3.2) + circ(6, 9, 2.4) + circ(58, 9, 2.4) + circ(6, 28, 2.4) + circ(58, 28, 2.4)),
    flag('e', 'M0 0H64V42' + zig + 'Z' + 'M28 9A4 4 0 0 1 36 9V19H41V14A3 3 0 0 1 47 14V24A5 5 0 0 1 42 29H36V36H28V31H22A5 5 0 0 1 17 26V19A3 3 0 0 1 23 19V25H28Z' + circ(8, 10, 2.3) + circ(56, 10, 2.3) + circ(8, 26, 2.3) + circ(56, 30, 2.3)),
    flag('f', 'M0 0H64V44L56 50L48 44L40 50L32 44L24 50L16 44L8 50L0 44Z' + poly([[16, 7], [23, 14.5], [16, 22], [9, 14.5]]) + poly([[32, 7], [39, 14.5], [32, 22], [25, 14.5]]) + poly([[48, 7], [55, 14.5], [48, 22], [41, 14.5]]) + poly([[24, 24], [31, 31.5], [24, 39], [17, 31.5]]) + poly([[40, 24], [47, 31.5], [40, 39], [33, 31.5]]))
  ].join('');

  // Confetti shapes, a butterfly (wings up and down, so its wing-beat squashes it the way the kit's flap does) and the tile pattern.
  var CONFETTI =
    sym('cm-cf-r', '0 0 20 20', '<rect x="2" y="6" width="16" height="8" rx="1.6" fill="currentColor"/><rect x="2" y="6" width="16" height="3" rx="1.2" fill="#fff" fill-opacity=".28"/>') +
    sym('cm-cf-t', '0 0 20 20', '<path d="M10 2L18.5 17H1.5Z" fill="currentColor"/><path d="M10 2L18.5 17H10Z" fill="#fff" fill-opacity=".24"/>') +
    sym('cm-cf-s', '0 0 30 20', '<path d="M2 10C6 0 10 20 15 10S24 0 28 10" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>');
  var wing = '<path d="M35 21C34 14 36 6 43 2C48 -0.5 53 3 51 9C49 15 42 20 35 21Z" fill="currentColor" stroke="#1a1030" stroke-width="1.7" stroke-linejoin="round"/>' +
    '<path d="M31 21C25 21 16 17 15 10C14.5 5 21 3 25 6C30 10 33 16 31 21Z" fill="currentColor" stroke="#1a1030" stroke-width="1.7" stroke-linejoin="round"/>' +
    '<path d="M37 19C40 14 43 10 46 6M29 19C25 16 21 12 19 8" stroke="#1a1030" stroke-opacity=".6" stroke-width="1.2" fill="none" stroke-linecap="round"/>' +
    '<path d="M35 21C34 14 36 6 43 2C48 -0.5 53 3 51 9C49 15 46 18 44 19C47 12 46 6 41 5C38 8 36 15 35 21Z" fill="#fff" fill-opacity=".22"/>' +
    '<g fill="#fff"><circle cx="49" cy="5.5" r="1.4"/><circle cx="51" cy="9.5" r="1.3"/><circle cx="19" cy="5.5" r="1.3"/><circle cx="16" cy="9.5" r="1.2"/></g>';
  var BFLY = sym('cm-bfly', '0 0 60 44', wing + '<g transform="matrix(1 0 0 -1 0 44)">' + wing + '</g><ellipse cx="32" cy="22" rx="13" ry="2.4" fill="#fff1d6"/><ellipse cx="32" cy="22" rx="13" ry="2.4" fill="#1a1030" fill-opacity=".85"/><circle cx="46" cy="22" r="2.8" fill="#1a1030"/><path d="M47 21L56 16M47 23L56 28" stroke="#fff1d6" stroke-width="1.2" stroke-linecap="round"/>');
  var TILE = '<pattern id="cm-tile" width="48" height="48" patternUnits="userSpaceOnUse"><rect width="48" height="48" fill="' + C.cream + '"/>' +
    '<g fill="' + C.turq + '"><ellipse cx="24" cy="24" rx="3.6" ry="12"/><ellipse cx="24" cy="24" rx="3.6" ry="12" transform="rotate(90 24 24)"/></g><g fill="' + C.pink + '"><ellipse cx="24" cy="24" rx="3" ry="9.5" transform="rotate(45 24 24)"/><ellipse cx="24" cy="24" rx="3" ry="9.5" transform="rotate(-45 24 24)"/></g>' +
    '<circle cx="24" cy="24" r="4.6" fill="' + C.orange + '"/><circle cx="24" cy="24" r="1.8" fill="' + C.yellow + '"/>' +
    '<g fill="' + C.indigo + '"><circle cx="0" cy="0" r="5"/><circle cx="48" cy="0" r="5"/><circle cx="0" cy="48" r="5"/><circle cx="48" cy="48" r="5"/></g><g fill="' + C.yellow + '"><circle cx="0" cy="0" r="2"/><circle cx="48" cy="0" r="2"/><circle cx="0" cy="48" r="2"/><circle cx="48" cy="48" r="2"/></g>' +
    '<rect x="1" y="1" width="46" height="46" fill="none" stroke="' + C.indigo + '" stroke-opacity=".45" stroke-width="2"/></pattern>';

  var DEFS = PETAL + MARIGOLD + DAHLIA + BLOOM + LEAF + SAGUARO + NOPAL + BARREL + AGAVE + POT + OLLA + P_SAG + P_NOPAL + P_BARREL + P_AGAVE + P_MARI + P_DAHL + P_OLLA +
    CHILI + RISTRA + CANDY + PINATA + PINBALL + PP + CONFETTI + BFLY + TILE;

  /* ── Pieces the scenes are built from ─────────────────────────────────────────────────────────────────────────────────────── */
  function U(id, cls, style) { return '<svg class="' + (cls || '') + '" viewBox="' + VB[id] + '"' + (style ? ' style="' + style + '"' : '') + ' aria-hidden="true" focusable="false"><use href="#' + id + '"/></svg>'; }
  function asp(id) { var p = VB[id].split(' '); return p[2] / p[3]; }
  function place(id, cx, base, h, color) { var w = h * asp(id); return '<use href="#' + id + '" x="' + r1(cx - w / 2) + '" y="' + r1(base - h) + '" width="' + r1(w) + '" height="' + r1(h) + '"' + (color ? ' style="color:' + color + '"' : '') + '/>'; }
  function pick(r, list) { return list[Math.floor(r() * list.length)]; }

  // A cord from (x0, y0) to (x1, y1) that sags by `sag`, with n flags of papel picado hanging from it. A flag leans with the cord, and every o.fl-th one flutters on its own beat.
  function swag(k, o) {
    var r = k.rng(o.seed || 1), cx = (o.x0 + o.x1) / 2, cy = (o.y0 + o.y1) / 2 + o.sag * 2, off = o.off || 0, i, t, u, x, y, dx, dy, ang, w, col, type, st,
      out = '<path d="M' + o.x0 + ' ' + o.y0 + 'Q' + cx + ' ' + cy + ' ' + o.x1 + ' ' + o.y1 + '" fill="none" stroke="' + C.cream + '" stroke-opacity=".78" stroke-width="2" stroke-linecap="round"/>';
    for (i = 0; i < o.n; i++) {
      t = (i + 0.5) / o.n; u = 1 - t;
      x = u * u * o.x0 + 2 * u * t * cx + t * t * o.x1; y = u * u * o.y0 + 2 * u * t * cy + t * t * o.y1;
      dx = 2 * u * (cx - o.x0) + 2 * t * (o.x1 - cx); dy = 2 * u * (cy - o.y0) + 2 * t * (o.y1 - cy);
      ang = Math.atan2(dy, dx) * 180 / Math.PI * 0.8;
      w = o.fw * (0.94 + r() * 0.12); col = o.cols[(i + off) % o.cols.length]; type = o.types.charAt((i * 5 + off) % o.types.length);
      st = 'color:' + col;
      if (o.fl && i % o.fl === 0) {                                                // a flag that flutters turns about its own cord point: a <g> puts that point at the origin, the flag turns about it
        out += '<g transform="translate(' + r1(x) + ' ' + r1(y) + ') rotate(' + r1(ang) + ')"><use class="cm-fl" href="#cm-pp-' + type + '" x="' + r1(-w / 2) + '" y="-1.5" width="' + r1(w) + '" height="' + r1(w * 52 / 64) + '" style="' + st + ';animation-delay:-' + (r() * 5).toFixed(1) + 's;animation-duration:' + (3.4 + r() * 2).toFixed(1) + 's"/></g>';
      } else {
        out += '<use href="#cm-pp-' + type + '" x="' + r1(-w / 2) + '" y="-1.5" width="' + r1(w) + '" height="' + r1(w * 52 / 64) + '" transform="translate(' + r1(x) + ' ' + r1(y) + ') rotate(' + r1(ang) + ')" style="' + st + '"/>';
      }
    }
    return out;
  }
  function strings(k, cls, vw, vh, swags) {
    return '<svg class="' + cls + '" viewBox="0 0 ' + vw + ' ' + vh + '" preserveAspectRatio="xMidYMin slice" aria-hidden="true" focusable="false">' + swags.map(function (s) { return swag(k, s); }).join('') + '</svg>';
  }
  var PALS = [
    [C.pink, C.turq, C.yellow, C.orange, C.green, C.red], [C.yellow, C.red, C.turq, C.pink, C.orange, C.green], [C.turq, C.orange, C.pink, C.green, C.yellow, C.red],
    [C.orange, C.green, C.pink, C.yellow, C.turq, C.red], [C.red, C.yellow, C.green, C.turq, C.pink, C.orange], [C.green, C.pink, C.orange, C.turq, C.red, C.yellow]
  ];
  // The strings along the top of a section: where the cord is hung from, how many flags, how big. Each is different.
  var STRIPS = {
    a: { parts: [[-30, 1830, 20, 31]], fw: 58, pal: 0, types: 'abcdef' },                                         // one long swag
    b: { parts: [[-30, 600, 26, 11], [600, 1200, 26, 11], [1200, 1830, 26, 11]], fw: 54, pal: 1, types: 'cfaebd' },  // three arcs
    c: { parts: [[-30, 1830, 14, 46]], fw: 40, pal: 2, types: 'dbefac' },                                         // small flags, close together
    d: { parts: [[-30, 760, 22, 14], [1060, 1830, 22, 14]], fw: 60, pal: 3, types: 'eacfdb' },                      // a swag from each corner, the middle free
    e: { parts: [[-30, 1000, 18, 18]], fw: 56, pal: 4, types: 'bdfcae' },                                          // from the left corner only
    f: { parts: [[800, 1830, 18, 18]], fw: 56, pal: 5, types: 'fbaecd' },                                          // from the right corner only
    g: { parts: [[-30, 520, 20, 9], [740, 1300, 20, 10], [1500, 1830, 14, 5]], fw: 56, pal: 2, types: 'ceabfd' },   // three short pieces
    h: { parts: [[-30, 1830, 14, 25]], fw: 64, pal: 3, types: 'dcbfea' },                                         // big flags
    i: { parts: [[-30, 450, 24, 8], [450, 900, 24, 8], [900, 1350, 24, 8], [1350, 1830, 24, 8]], fw: 52, pal: 0, types: 'fecbad' }, // four arcs
    j: { parts: [[500, 1830, 18, 23]], fw: 56, pal: 1, types: 'afdbec' }                                           // from the right, running a long way
  };
  function strip(k, key) {
    var c = STRIPS[key], sw = c.parts.map(function (p, i) { return { x0: p[0], y0: -3, x1: p[1], y1: -3, sag: p[2], n: p[3], fw: c.fw, cols: PALS[c.pal], types: c.types, off: i * 2, fl: 3, seed: key.charCodeAt(0) * 7 + i }; });
    return strings(k, 'cm-pps cm-pps--' + key, 1800, 100, sw);
  }

  // A garland of marigolds draped down the edge of a section (it lives in the margin, so a phone does without it).
  function garland(k, side, seed) {
    var r = k.rng(300 + seed), pts = [], flw = '', lv = '', y, x, i = 0, ph = r() * 6, cols = [C.orange, '#ff9f1a', C.gold, C.yellow, C.orange];
    for (y = 6; y < 452; y += 7) pts.push(r1(40 + 19 * Math.sin(y / 58 + ph)) + ' ' + y);
    for (y = 22; y < 446; y += 33, i++) {
      x = 40 + 19 * Math.sin(y / 58 + ph); var s = 36 + r() * 12;
      flw += '<use href="#cm-marigold" x="' + r1(x - s / 2) + '" y="' + r1(y - s / 2) + '" width="' + r1(s) + '" height="' + r1(s) + '" style="color:' + cols[i % cols.length] + '"/>';
      lv += '<use href="#cm-leaf" x="-6" y="-24" width="12" height="30" transform="translate(' + r1(x + (i % 2 ? 13 : -13)) + ' ' + (y + 15) + ') rotate(' + (i % 2 ? 62 : -62) + ')" style="color:' + (i % 2 ? C.green : C.greenD) + '"/>';
    }
    return '<svg class="cm-gar cm-gar--' + side + '" viewBox="0 0 80 460" aria-hidden="true" focusable="false"><path d="M' + pts.join('L') + '" fill="none" stroke="' + C.greenD + '" stroke-width="2.6"/>' + lv + flw + '</svg>';
  }

  // A heap of flowers for a bottom corner: leaves fanned out behind, then rows of marigolds, dahlias and blooms, the front row last.
  function mound(k, side, seed) {
    var r = k.rng(400 + seed), out = '', i, j, a, n, rows = [[34, 1, 34], [58, 3, 38], [84, 5, 43], [112, 6, 50]], x, y, w, s, c, t;
    var warm = [C.orange, '#ff9f1a', C.gold, C.yellow], hot = [C.pink, C.red, '#ff6b3d', C.orange, C.pink];
    for (i = 0; i < 9; i++) { a = -78 + i * 156 / 8 + (r() - 0.5) * 8; out += '<use href="#cm-leaf" x="-10" y="-84" width="20" height="' + r1(62 + r() * 24) + '" transform="translate(140 128) rotate(' + r1(a) + ')" style="color:' + (i % 2 ? C.green : C.greenD) + '"/>'; }
    for (j = 0; j < rows.length; j++) {
      n = rows[j][1]; w = 70 + j * 46;
      for (i = 0; i < n; i++) {
        x = 140 + (n === 1 ? 0 : (i / (n - 1) - 0.5) * w) + (r() - 0.5) * 8; y = rows[j][0] + (r() - 0.5) * 6; s = rows[j][2] * (0.92 + r() * 0.16); t = r();
        c = t < 0.55 ? 'marigold' : (t < 0.9 ? 'dahlia' : 'bloom');
        out += '<use href="#cm-' + c + '" x="' + r1(x - s / 2) + '" y="' + r1(y - s / 2) + '" width="' + r1(s) + '" height="' + r1(s) + '" style="color:' + (c === 'marigold' ? pick(r, warm) : (c === 'dahlia' ? pick(r, hot.concat(warm)) : pick(r, [C.yellow, C.pink]))) + '"/>';
      }
    }
    return '<svg class="cm-mound cm-mound--' + side + '" viewBox="0 0 280 140" aria-hidden="true" focusable="false">' + out + '</svg>';
  }

  var POTS = {
    sag: ['cm-p-sag'], nopal: ['cm-p-nopal'], barrel: ['cm-p-barrel'], agave: ['cm-p-agave'], mari: ['cm-p-mari', C.orange], mari2: ['cm-p-mari', C.gold], dahl: ['cm-p-dahl', C.pink],
    dahl2: ['cm-p-dahl', C.red], dahl3: ['cm-p-dahl', C.yellow], olla: ['cm-p-olla', C.gold], olla2: ['cm-p-olla', C.orange]
  };
  function pots(side, list, cls) {
    return '<div class="cm-pots cm-pots--' + side + (cls ? ' ' + cls : '') + '">' + list.split(',').map(function (id) { var d = POTS[id]; return d ? U(d[0], 'cm-i cm-i--' + d[0].slice(5), d[1] ? 'color:' + d[1] : '') : ''; }).join('') + '</div>';
  }
  function pend(k, kind, side, at, len, w, cls) {
    var art = kind === 'star' ? U('cm-pinata') : (kind === 'ball' ? U('cm-pinball') : U('cm-ristra'));
    return k.pendant(art, { side: side, at: at, len: len, w: w, cls: 'cm-pd cm-pd--' + kind + (side === 'l' ? ' cm-pdl' : '') + (cls ? ' ' + cls : '') });
  }
  function confetti(k, n, seed, o) {
    o = o || {};
    return k.particles(n, { id: ['cm-cf-r', 'cm-cf-t', 'cm-cf-s', 'sk-dot', 'cm-cf-r'], colors: FEST.concat([C.gold]), size: o.size || [8, 17], dur: [14, 26], drift: 90, sway: 30, seed: seed, mobile: 0.5, opacity: o.opacity || [0.55, 0.95] });
  }
  function fallingPetals(k, n, seed, size) {
    return k.particles(n, { id: 'cm-petal', colors: [C.orange, C.gold, C.yellow, '#ff9f1a'], size: size || [8, 15], dur: [16, 28], drift: 70, sway: 26, spin: 1, seed: seed, mobile: 0.5, opacity: [0.75, 1] });
  }
  function butterflies(k, n, top, seed) {
    return k.flyers(n, { id: 'cm-bfly', vb: '0 0 60 44', size: [26, 40], dur: [26, 40], top: [top - 5, top + 6], wave: 24, flap: true, colors: [C.orange, C.pink, C.turq, C.yellow, C.orange], seed: seed, mobile: 0.5, cls: 'cm-bf' });
  }

  /* ── The hero: an evening glow, two strings of papel picado, a swinging pinata, confetti, and a tiled wall with pots, flowers, cacti and chili lights ──────────────── */
  // Chili lights: a cord that sags across the wall, a chili hanging from it every so often, each with a soft halo. The halos pulse in three groups, and the lights
  // are an SVG of their own, so that a pulse repaints a thin string of chilis and never the plants behind it.
  function lights(k) {
    var r = k.rng(61), n = 19, x0 = -20, x1 = 1460, y0 = 30, cx = 720, cy = 30 + 2 * 66, i, t, u, x, y, a, col, hx, hy, glow = ['', '', ''], bulbs = '', cols = [C.red, C.green, C.orange, C.yellow, C.red, C.pink];
    for (i = 0; i < n; i++) {
      t = (i + 0.5) / n; u = 1 - t; x = u * u * x0 + 2 * u * t * cx + t * t * x1; y = u * u * y0 + 2 * u * t * cy + t * t * y0; col = cols[i % cols.length]; a = (r() - 0.5) * 16;
      hx = x - Math.sin(a * Math.PI / 180) * 24; hy = y + Math.cos(a * Math.PI / 180) * 24;
      glow[i % 3] += '<circle cx="' + r1(hx) + '" cy="' + r1(hy) + '" r="25" fill="' + col + '" fill-opacity=".14"/><circle cx="' + r1(hx) + '" cy="' + r1(hy) + '" r="14" fill="' + col + '" fill-opacity=".22"/>';
      bulbs += '<use href="#cm-chili" x="-9" y="0" width="18" height="45" transform="translate(' + r1(x) + ' ' + r1(y) + ') rotate(' + r1(a) + ')" style="color:' + col + '"/>';
    }
    return '<svg class="cm-lights" viewBox="0 0 1440 260" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false"><path d="M' + x0 + ' ' + y0 + 'Q' + cx + ' ' + cy + ' ' + x1 + ' ' + y0 + '" fill="none" stroke="' + C.cream + '" stroke-opacity=".55" stroke-width="2"/>' +
      glow.map(function (g, gi) { return '<g class="cm-hl cm-hl--' + 'abc'.charAt(gi) + '">' + g + '</g>'; }).join('') + bulbs + '</svg>';
  }
  function ground(k) {
    var r = k.rng(17), out = '<svg viewBox="0 0 1440 260" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">', i, x, base = 232;
    // the back row: smaller, dimmer, a little higher up
    out += '<g opacity=".5">' + place('cm-p-sag', 120, base - 8, 150) + place('cm-p-nopal', 450, base - 8, 100) + place('cm-p-barrel', 690, base - 8, 82) + place('cm-p-sag', 960, base - 8, 160) + place('cm-p-agave', 1230, base - 8, 90) + place('cm-p-nopal', 1380, base - 8, 96) + '</g>';
    // marigolds lined along the wall like a garland
    for (x = 20, i = 0; x < 1440; x += 26 + r() * 22, i++) out += place('cm-marigold', x, base + 3, 22 + r() * 12, [C.orange, C.gold, '#ff9f1a', C.yellow][i % 4]);
    // the front row of pots
    out += place('cm-p-mari', 205, base, 128, C.orange) + place('cm-p-sag', 318, base, 200) + place('cm-p-agave', 410, base, 100) + place('cm-p-dahl', 508, base, 134, C.pink) + place('cm-p-nopal', 612, base, 130) +
      place('cm-p-olla', 724, base, 152, C.gold) + place('cm-p-barrel', 832, base, 98) + place('cm-p-dahl', 930, base, 128, C.red) + place('cm-p-sag', 1040, base, 188) + place('cm-p-mari', 1146, base, 124, C.gold) +
      place('cm-p-agave', 1236, base, 104) + place('cm-p-dahl', 1316, base, 112, C.yellow);
    // the wall: a cream coping and a band of tiles
    out += '<rect x="-10" y="' + base + '" width="1460" height="7" fill="#f3d9aa"/><rect x="-10" y="' + base + '" width="1460" height="2.4" fill="#fff" fill-opacity=".5"/><rect x="-10" y="' + (base + 7) + '" width="1460" height="3" fill="#000" fill-opacity=".3"/>' +
      '<g transform="translate(-10 ' + (base + 7) + ') scale(.5)"><rect width="2920" height="' + (2 * (260 - base - 7)) + '" fill="url(#cm-tile)"/></g>';
    return out + '</svg>';
  }

  function hero(k) {
    var out = '<div class="cm-wash"></div>';
    out += k.twinkles(14, { id: ['sk-sparkle', 'sk-dot', 'sk-sparkle'], colors: [C.yellow, C.pink, C.turq, C.gold, C.cream, C.orange], size: [7, 16], dur: [2.6, 5.2], area: [2, 98], areaY: [8, 60], seed: 41, mobile: 0.5 });
    out += butterflies(k, 2, 40, 53);
    out += strings(k, 'cm-pps cm-pps--hero cm-pps--back', 2000, 120, [{ x0: -30, y0: 8, x1: 2030, y1: 8, sag: 18, n: 38, fw: 42, cols: PALS[1], types: 'bfcdae', off: 3, fl: 1, seed: 5 }]);
    out += strings(k, 'cm-pps cm-pps--hero cm-pps--front', 2000, 120, [{ x0: -30, y0: 2, x1: 2030, y1: 2, sag: 8, n: 36, fw: 52, cols: PALS[0], types: 'abcdef', off: 0, fl: 1, seed: 9 }]);
    out += confetti(k, 34, 7, { size: [10, 24], opacity: [0.7, 1] }) + fallingPetals(k, 12, 13, [11, 20]);
    out += pend(k, 'rist', 'l', 1.4, 8, 44, 'cm-pd-h sk-hide-m');
    out += '<div class="cm-ground">' + ground(k) + lights(k) + '</div>';
    out += k.tap('<span class="cm-sw"><i class="cm-rope"></i>' + U('cm-pinata') + '</span>', '¡Olé!', 'cm-pin cm-t-pin');
    out += k.tap(U('cm-saguaro'), '¡Arriba!', 'cm-tap cm-t-cac cm-tap-l', 'left:0.4%');
    out += k.tap(U('cm-p-olla', '', 'color:' + C.gold), '¡Fiesta!', 'cm-tap cm-t-pot cm-tap-r', 'right:0.4%');
    return out;
  }

  /* ── A layer behind each section, different on every one so the page does not repeat itself ─────────────────────────────────────────────────────────── */
  var SECTIONS = {
    eventStrip:     ['gar:l:1', 'mound:r:1', 'pin:star:r:1.2:92:54', 'pin:ball:r:7:60:42', 'confetti:6:1', 'petals:4:1', 'fly:2:30'],
    programs:       ['pp:a', 'pots:l:sag,mari,agave', 'mound:r:2', 'pin:star:r:1:70:54', 'tap:nopal:l:38', 'confetti:5:2'],
    competition:    ['pp:e', 'gar:r:2', 'pots:r:nopal,dahl,olla', 'pin:rist:l:0.8:30:40', 'tap:pin:l:50', 'confetti:5:3', 'tiles:b'],
    coaches:        ['pp:d', 'mound:l:3', 'pots:r:barrel,mari2', 'pin:ball:r:1:70:46', 'confetti:4:4', 'petals:3:2', 'fly:2:60'],
    gallery:        ['pp:c', 'pots:l:olla,sag', 'pots:r:agave,dahl2,barrel', 'confetti:4:5', 'fly:3:42', 'tiles:b'],
    'belt-journey': ['pp:f', 'tiles:r', 'mound:l:4', 'pin:ball:r:5:60:42', 'pin:star:l:0.8:80:52', 'tap:sag:l:44', 'confetti:5:6', 'petals:4:3'],
    locations:      ['pp:g', 'pots:l:agave,barrel', 'mound:r:5', 'pin:rist:r:1:40:42', 'tap:olla:l:60', 'confetti:4:7', 'fly:2:50'],
    faq:            ['gar:l:3', 'gar:r:4', 'tiles:t', 'pots:r:sag,dahl3', 'pots:l:mari2,nopal', 'pin:ball:l:9:70:40', 'confetti:5:8', 'petals:4:4'],
    schedule:       ['pp:h', 'pots:l:mari,nopal', 'pin:rist:l:0.8:36:40', 'pin:star:r:1:84:52', 'tap:chili:r:52', 'confetti:4:9', 'fly:2:70'],
    testimonials:   ['pp:i', 'mound:l:6', 'mound:r:7', 'pin:star:r:8:50:48', 'tap:pin:l:40', 'confetti:5:10', 'petals:3:5'],
    pricing:        ['pp:j', 'tiles:l', 'mound:r:8', 'pin:ball:r:4:64:44', 'tap:nopal:r:46', 'confetti:5:11', 'fly:2:55'],
    contact:        ['pp:b', 'mound:l:9', 'mound:r:10', 'pots:l:olla2,agave', 'pin:rist:r:1:40:42', 'tap:sag:l:42', 'confetti:5:12', 'petals:4:6', 'fly:2:36']
  };
  var TAPS = {
    pin: ['cm-pinball', '¡Olé!', 'cm-t-pin'], star: ['cm-pinata', '¡Olé!', 'cm-t-pin'], sag: ['cm-p-sag', '¡Arriba!', 'cm-t-cac'], nopal: ['cm-p-nopal', '¡Hola!', 'cm-t-cac'],
    olla: ['cm-p-olla', '¡Fiesta!', 'cm-t-pot', C.gold], chili: ['cm-chili', '¡Vamos!', 'cm-t-chili', C.red]
  };
  function section(specs, k) {
    var out = '', pn = 0;
    specs.forEach(function (spec) {
      var a = spec.split(':'), kind = a[0], t;
      if (kind === 'pp') out += strip(k, a[1]);
      else if (kind === 'gar') out += garland(k, a[1], +a[2]);
      else if (kind === 'mound') out += mound(k, a[1], +a[2]);
      else if (kind === 'pots') out += pots(a[1], a[2]);
      else if (kind === 'pin') out += pend(k, a[1], a[2], +a[3], +a[4], +a[5], pn++ ? 'sk-hide-m' : '');
      else if (kind === 'confetti') out += confetti(k, +a[1], 100 + +a[2]);
      else if (kind === 'petals') out += fallingPetals(k, +a[1], 700 + +a[2]);
      else if (kind === 'fly') out += butterflies(k, +a[1], +a[2], 600 + +a[2]);
      else if (kind === 'tiles') out += '<div class="cm-tiles cm-tiles--' + a[1] + '"></div>';
      else if (kind === 'tap') {
        t = TAPS[a[1]];
        out += k.tap(U(t[0], '', t[3] ? 'color:' + t[3] : ''), t[1], 'cm-tap ' + t[2] + ' cm-tap-' + a[2] + ' sk-hide-m', (a[2] === 'l' ? 'left' : 'right') + ':0.4%;top:' + a[3] + '%');
      }
    });
    return out;
  }

  /* ── The market stall above the footer: a striped awning, four painted signs hung under it, a tiled counter with pots of cacti and flowers on it ─────────────────── */
  var SAYINGS = ['Train hard, then celebrate', 'Let\'s roll together', 'Aim high, roll on', 'Every roll is a party'];
  var TITLES = ['FIESTA', '¡VAMOS!', 'ARRIBA', '¡OLÉ!'];
  function awning() {
    var out = '', i, x, col = [C.pink, C.yellow, C.turq, C.orange, C.green, C.red];
    for (i = 0; i < 26; i++) { x = i * 60 - 30; out += '<path d="M' + x + ' 0H' + (x + 60) + 'V44A30 30 0 0 1 ' + x + ' 44Z" fill="' + col[i % 6] + '"/><path d="M' + (x + 30) + ' 0H' + (x + 60) + 'V44A30 30 0 0 1 ' + (x + 30) + ' 74Z" fill="#000" fill-opacity=".11"/>'; }
    return '<svg class="cm-awning" viewBox="0 0 1440 80" preserveAspectRatio="xMidYMin slice" aria-hidden="true" focusable="false">' + out +
      '<path d="M0 0H1440V12H0Z" fill="#000" fill-opacity=".22"/><path d="M0 12H1440V15H0Z" fill="#fff" fill-opacity=".28"/><path d="M0 44H1440V80H0Z" fill="none"/></svg>';
  }
  // marigolds laid along the counter, in front of the pots
  function mrow(k) {
    var r = k.rng(29), out = '', x, i = 0;
    for (x = 12; x < 1440; x += 30 + r() * 22, i++) out += place('cm-marigold', x, 40, 24 + r() * 12, [C.orange, C.gold, '#ff9f1a', C.yellow][i % 4]);
    return '<svg class="cm-mrow" viewBox="0 0 1440 40" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">' + out + '</svg>';
  }
  function footer(k) {
    var signs = SAYINGS.map(function (s, i) { return '<div class="cm-sign cm-sign--' + (i + 1) + '"><span>' + TITLES[i] + '</span><em>' + s + '</em></div>'; }).join('');
    return '<div class="cm-bunting"></div>' + awning() +
      '<div class="cm-post cm-post--l"></div><div class="cm-post cm-post--r"></div>' +
      pend(k, 'rist', 'l', 1.6, 6, 30, 'cm-pd-f sk-hide-m') + pend(k, 'rist', 'r', 1.6, 6, 30, 'cm-pd-f sk-hide-m') +
      '<div class="cm-stall">' +
        '<div class="cm-props sk-props cm-props--l">' + U('cm-p-sag', 'cm-i cm-i--sag') + U('cm-p-mari', 'cm-i cm-i--mari', 'color:' + C.orange) + U('cm-p-olla', 'cm-i cm-i--olla', 'color:' + C.gold) + '</div>' +
        '<div class="cm-signs sk-signs">' + signs + '</div>' +
        '<div class="cm-props sk-props cm-props--r">' + U('cm-p-barrel', 'cm-i cm-i--barrel') + U('cm-p-dahl', 'cm-i cm-i--dahl', 'color:' + C.pink) + U('cm-p-nopal', 'cm-i cm-i--nopal') + '</div>' +
      '</div>' +
      '<div class="cm-counter"><div class="cm-board"></div><div class="cm-front"></div></div>' + mrow(k) +
      confetti(k, 8, 300, { size: [8, 15] });
  }

  var T = {
    name: 'cinco', prefix: 'cm',
    meta: { bg: '#0d0a14', gold: '#ffb627', emoji: '\u{1F389}', tapSay: ['¡Olé!', '¡Arriba!', '¡Fiesta!', '¡Hola!', '¡Vamos!'], sayings: SAYINGS },
    defs: DEFS,
    hero: hero,
    sections: {},
    footer: footer,
    onTap: function (el, k) {
      var c = el.classList, target = el.querySelector('svg') || el, all = FEST.concat([C.gold]);
      if (c.contains('cm-t-pin')) {
        k.burst(target, { id: 'cm-candy', n: 10, colors: all, dist: [70, 170], size: [20, 32], ms: 1300 });
        k.burst(target, { id: 'cm-cf-r', n: 22, colors: all, dist: [50, 160], size: [10, 18], ms: 1100 });
        k.burst(target, { id: 'sk-sparkle', n: 8, colors: [C.cream, C.yellow], dist: [30, 90], size: [10, 18], ms: 800 });
      } else if (c.contains('cm-t-cac')) {
        k.burst(target, { id: 'cm-bloom', n: 7, colors: [C.pink, C.yellow, C.red], dist: [50, 110], size: [14, 22], ms: 1100 });
        k.burst(target, { id: 'sk-sparkle', n: 8, colors: [C.yellow, C.cream], dist: [40, 100], size: [8, 14], ms: 900 });
      } else if (c.contains('cm-t-pot')) {
        k.burst(target, { id: 'cm-marigold', n: 6, colors: [C.orange, C.gold, C.yellow], dist: [60, 130], size: [20, 30], ms: 1200 });
        k.burst(target, { id: 'cm-petal', n: 14, colors: [C.orange, C.gold, C.yellow], dist: [50, 140], size: [12, 20], ms: 1100 });
        k.burst(target, { id: 'cm-cf-t', n: 8, colors: all, dist: [40, 110], size: [9, 15], ms: 1000 });
      } else {
        k.burst(target, { id: 'cm-cf-s', n: 10, colors: all, dist: [40, 120], size: [12, 20], ms: 1000 });
        k.burst(target, { id: 'sk-star', n: 6, colors: [C.yellow, C.pink], dist: [40, 100], size: [10, 16], ms: 900 });
      }
    }
  };
  Object.keys(SECTIONS).forEach(function (id) { T.sections[id] = function (k) { return section(SECTIONS[id], k); }; });
  (window.SeasonKit ? window.SeasonKit.mount : function (t) { (window.__skq = window.__skq || []).push(t); })(T);
})();
