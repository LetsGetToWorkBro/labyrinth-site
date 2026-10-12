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
  var CANDY = sym('cm-candy', '0 0 40 20',
    '<path d="M11 10L1 2V18Z" fill="currentColor"/><path d="M29 10L39 2V18Z" fill="currentColor"/><path d="M11 10L1 2V18Z" fill="#fff" fill-opacity=".3"/><path d="M29 10L39 2V18Z" fill="#fff" fill-opacity=".3"/>' +
    '<ellipse cx="20" cy="10" rx="11" ry="7.5" fill="currentColor"/><path d="M15 4.4L19 15.6M21 3L25 16.5" stroke="#fff" stroke-opacity=".75" stroke-width="2.4" stroke-linecap="round"/>');

  // The pinatas: a seven-point star and a fringed ball.
  var pn = '', pcols = [C.pink, C.turq, C.yellow, C.orange, C.green, C.red, C.turq], pi;
  for (pi = 0; pi < 7; pi++) {
    var pa = -90 + pi * 360 / 7, tip = pol(70, 84, 64, pa), bl2 = pol(70, 84, 31, pa - 180 / 7), br2 = pol(70, 84, 31, pa + 180 / 7);
    var lerp = function (a, b, f) { return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]; };
    var fr = function (f) { var l = lerp(bl2, tip, f), r = lerp(br2, tip, f); return 'M' + r1(l[0]) + ' ' + r1(l[1]) + 'L' + r1(r[0]) + ' ' + r1(r[1]); };
    pn += '<path d="' + poly([bl2, tip, br2, [70, 84]]) + '" fill="' + pcols[pi] + '"/><path d="' + poly([tip, br2, [70, 84]]) + '" fill="#fff" fill-opacity=".2"/>' +
      '<path d="' + fr(0.3) + fr(0.52) + fr(0.74) + '" stroke="#fff" stroke-opacity=".6" stroke-width="2.6" stroke-dasharray="3 2.4" fill="none"/><circle cx="' + r1(tip[0]) + '" cy="' + r1(tip[1]) + '" r="3.4" fill="#fff" fill-opacity=".85"/>';
  }
  var PINATA = sym('cm-pinata', '0 0 140 150',
    '<path d="M70 17V24" stroke="' + C.cream + '" stroke-width="3" stroke-linecap="round"/><circle cx="70" cy="11" r="6" fill="none" stroke="' + C.cream + '" stroke-width="3"/>' + pn +
    '<circle cx="70" cy="84" r="27" fill="' + C.yellow + '"/><circle cx="70" cy="84" r="21" fill="none" stroke="' + C.pink + '" stroke-width="3" stroke-dasharray="4 4"/><circle cx="70" cy="84" r="9" fill="' + C.orange + '"/>' +
    '<path d="M54 70A22 22 0 0 1 66 62" stroke="#fff" stroke-opacity=".7" stroke-width="3" stroke-linecap="round" fill="none"/>');
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
  var wing = '<path d="M30 21C20 7 24 -1 36 2C44 4 46 14 36 21Z" fill="currentColor" stroke="#1a1030" stroke-width="1.6" stroke-linejoin="round"/><path d="M28 23C17 24 14 34 22 35C28 36 33 29 31 23Z" fill="currentColor" stroke="#1a1030" stroke-width="1.6" stroke-linejoin="round"/>' +
    '<path d="M31 20C34 12 36 8 38 5M30 22L22 32" stroke="#1a1030" stroke-opacity=".6" stroke-width="1.1" fill="none"/><g fill="#fff"><circle cx="38" cy="7" r="1.5"/><circle cx="42" cy="12" r="1.3"/><circle cx="23" cy="32" r="1.3"/></g>';
  var BFLY = sym('cm-bfly', '0 0 60 44', wing + '<g transform="matrix(1 0 0 -1 0 44)">' + wing + '</g><ellipse cx="32" cy="22" rx="12" ry="2.4" fill="#1a1030"/><circle cx="45" cy="22" r="2.8" fill="#1a1030"/><path d="M46 21L55 16M46 23L55 28" stroke="#1a1030" stroke-width="1.1" stroke-linecap="round"/>');
  var TILE = '<pattern id="cm-tile" width="48" height="48" patternUnits="userSpaceOnUse"><rect width="48" height="48" fill="' + C.cream + '"/>' +
    '<g fill="' + C.turq + '"><ellipse cx="24" cy="24" rx="3.6" ry="12"/><ellipse cx="24" cy="24" rx="3.6" ry="12" transform="rotate(90 24 24)"/></g><g fill="' + C.pink + '"><ellipse cx="24" cy="24" rx="3" ry="9.5" transform="rotate(45 24 24)"/><ellipse cx="24" cy="24" rx="3" ry="9.5" transform="rotate(-45 24 24)"/></g>' +
    '<circle cx="24" cy="24" r="4.6" fill="' + C.orange + '"/><circle cx="24" cy="24" r="1.8" fill="' + C.yellow + '"/>' +
    '<g fill="' + C.indigo + '"><circle cx="0" cy="0" r="5"/><circle cx="48" cy="0" r="5"/><circle cx="0" cy="48" r="5"/><circle cx="48" cy="48" r="5"/></g><g fill="' + C.yellow + '"><circle cx="0" cy="0" r="2"/><circle cx="48" cy="0" r="2"/><circle cx="0" cy="48" r="2"/><circle cx="48" cy="48" r="2"/></g>' +
    '<rect x="1" y="1" width="46" height="46" fill="none" stroke="' + C.indigo + '" stroke-opacity=".45" stroke-width="2"/></pattern>';

  var DEFS = MARIGOLD + DAHLIA + BLOOM + LEAF + SAGUARO + NOPAL + BARREL + AGAVE + POT + OLLA + P_SAG + P_NOPAL + P_BARREL + P_AGAVE + P_MARI + P_DAHL + P_OLLA +
    CHILI + RISTRA + CANDY + PINATA + PINBALL + PP + CONFETTI + BFLY + TILE;

  // ── scenes follow ──
  function hero(k) { return ''; }
  var T = {
    name: 'cinco', prefix: 'cm',
    meta: { bg: '#0d0a14', gold: '#ffb627', emoji: '\u{1F389}', tapSay: ['¡Olé!', '¡Arriba!', '¡Fiesta!'], sayings: ['a', 'b', 'c', 'd'] },
    defs: DEFS,
    hero: hero,
    sections: {},
    footer: function () { return ''; }
  };
  (window.SeasonKit ? window.SeasonKit.mount : function (t) { (window.__skq = window.__skq || []).push(t); })(T);
})();
