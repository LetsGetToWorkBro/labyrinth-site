/* Easter: the homepage's scene for all of March, and on through Easter Sunday in the years Easter falls in April (index.html's <head> turns it on from the
   date and loads this with season-kit.css, season-kit.js and season-easter.css, which draws it). Secular and springtime: a dark indigo dusk with pastel
   accents. Over the hero: a lavender and peach sky, clouds drifting, butterflies crossing, blossom petals falling, a blossom branch, and along the foot a
   grassy hill with tulips, daffodils, a white picket fence, painted eggs, a basket, and a bunny that hops across on a loop. A layer behind every section
   (egg bunting, flowers, nests, baskets, carrots, a rainbow, a bunny peeking from the grass), and a meadow above the footer with four egg-shaped signs.
   Tap the bunny, an egg (it cracks open in confetti) or a chick and it answers. Nothing here reads or writes anything about a visitor, and nothing is
   built unless the page is in the season. */
(function () {
  // A seeded random of this file's own, for the art that is drawn before the kit's helper exists (patterns).
  function R(seed) {
    var a = (seed >>> 0) || 1;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  var P = { pink: '#ff9ec4', pinkL: '#ffc9de', pinkD: '#f0709f', peach: '#ffb48a', peachL: '#ffd3b8', yel: '#ffd86b', yelL: '#ffeaa6', yelD: '#f5b83a',
    mint: '#8fe3c0', mintL: '#c6f5e0', lilac: '#b9a2ff', lilacL: '#dccfff', sky: '#8cc8ff', skyL: '#c4e3ff', cream: '#fff6e6', white: '#fffaf3',
    leaf: '#52b96f', leafD: '#3fa65f', leafL: '#8fdc8e', ind: '#2c2560', wood: '#b07a45', woodD: '#8f6236' };
  var EGGCOL = [P.pink, P.mint, P.lilac, P.sky, P.yel, P.peach];
  var PETALCOL = [P.pinkL, '#ffffff', P.pink, P.lilacL, P.pinkL];
  var BFLYCOL = [P.pink, P.sky, P.yel, P.mint, P.lilac, P.peach];

  // The size of every drawing's box, so it can be placed with the right shape.
  var VB = { egg: '0 0 60 80', hang: '0 -16 60 96', tulip: '0 0 44 104', daff: '0 0 56 108', blossom: '0 0 48 48', petal: '0 0 24 30', cloud: '0 0 140 72', bfly: '0 0 60 56',
    bunny: '0 0 114 120', peek: '0 0 100 96', chick: '0 0 80 86', carrot: '0 0 40 104', nest: '0 0 110 64', basket: '0 0 120 110', tuft: '0 0 80 40', fence: '0 0 120 80',
    rain: '0 0 160 96', branch: '0 0 240 300', tree: '0 0 90 110', conf: '0 0 12 20', cl: '0 0 190 120' };

  function sym(id, vb, body) { return '<symbol id="' + id + '" viewBox="' + vb + '">' + body + '</symbol>'; }
  function rot(body, n, cx, cy, start) { var o = '', i; for (i = 0; i < n; i++) o += '<g transform="rotate(' + ((start || 0) + 360 / n * i).toFixed(1) + ' ' + cx + ' ' + cy + ')">' + body + '</g>'; return o; }
  function f2(c) { return 'style="fill:var(--c2,' + (c || P.cream) + ')"'; }
  function f3(c) { return 'style="fill:var(--c3,' + (c || P.cream) + ')"'; }
  function s2(c) { return 'style="stroke:var(--c2,' + (c || P.cream) + ')"'; }
  function s3(c) { return 'style="stroke:var(--c3,' + (c || P.cream) + ')"'; }

  // ── Eggs: one shape, five painted patterns. The egg takes its colour from `color`, the paint from --c2 and --c3 (set on the <svg> or <use> that draws it). ──
  var EGG = 'M30 3C45 3 57 29 57 49C57 67 45 77 30 77C15 77 3 67 3 49C3 29 15 3 30 3Z';
  var PAT = {
    z: '<path d="M-6 38l8-8 8 8 8-8 8 8 8-8 8 8 8-8 8 8 8-8 8 8 8-8" fill="none" ' + s2() + ' stroke-width="5" stroke-linejoin="round"/>' +
       '<path d="M-6 57l8-6 8 6 8-6 8 6 8-6 8 6 8-6 8 6 8-6 8 6 8-6" fill="none" ' + s3() + ' stroke-width="2.6" stroke-linejoin="round"/>' +
       '<circle cx="30" cy="19" r="3.2" ' + f3() + '/><circle cx="19" cy="23" r="2" ' + f3() + '/><circle cx="41" cy="23" r="2" ' + f3() + '/>',
    d: '<g ' + f2() + '><circle cx="18" cy="23" r="4.4"/><circle cx="38" cy="14" r="3"/><circle cx="46" cy="31" r="4.8"/><circle cx="14" cy="43" r="4.8"/><circle cx="31" cy="39" r="3.4"/>' +
       '<circle cx="46" cy="53" r="3.2"/><circle cx="24" cy="58" r="4"/><circle cx="39" cy="66" r="4.4"/><circle cx="12" cy="61" r="2.4"/></g>' +
       '<g ' + f3() + '><circle cx="30" cy="25" r="2"/><circle cx="23" cy="48" r="2.2"/><circle cx="36" cy="54" r="2"/><circle cx="48" cy="42" r="1.8"/></g>',
    b: '<rect x="-2" y="19" width="64" height="7" ' + f2() + '/><rect x="-2" y="35" width="64" height="14" ' + f3() + '/><rect x="-2" y="58" width="64" height="5" ' + f2() + '/>' +
       '<g ' + f2() + '><circle cx="14" cy="42" r="2.6"/><circle cx="26" cy="42" r="2.6"/><circle cx="38" cy="42" r="2.6"/><circle cx="50" cy="42" r="2.6"/></g>',
    l: '<g fill="none" ' + s2() + ' stroke-width="3" opacity=".8"><path d="M-4 8L64 76M-4 28L64 96M-4 -12L64 56M64 8L-4 76M64 28L-4 96M64 -12L-4 56"/></g>' +
       '<g ' + f3() + '><circle cx="30" cy="30" r="3"/><circle cx="30" cy="54" r="3"/><circle cx="17" cy="42" r="3"/><circle cx="43" cy="42" r="3"/></g>',
    w: '<path d="M-6 36q7.5-10 15 0t15 0 15 0 15 0 15 0 15 0" fill="none" ' + s2() + ' stroke-width="4.2" stroke-linecap="round"/>' +
       '<path d="M-6 53q7.5-10 15 0t15 0 15 0 15 0 15 0 15 0" fill="none" ' + s3() + ' stroke-width="2.6" stroke-linecap="round"/>' +
       '<g ' + f2() + '><circle cx="14" cy="20" r="2.6"/><circle cx="30" cy="16" r="2.6"/><circle cx="46" cy="20" r="2.6"/><circle cx="22" cy="66" r="2.6"/><circle cx="38" cy="66" r="2.6"/></g>'
  };
  function eggSym(key) {
    return sym('es-egg-' + key, VB.egg, '<path d="' + EGG + '" fill="currentColor"/><g clip-path="url(#es-ec)">' + PAT[key] +
      '<path d="M63 16C38 30 44 68 18 86L63 86Z" fill="#2c2560" opacity=".13"/></g><ellipse cx="19.5" cy="23" rx="5.2" ry="10" transform="rotate(24 19.5 23)" fill="#fff" opacity=".45"/>');
  }
  // The same egg hanging from a little ring and bow (for the pendants).
  function hangSym(key) {
    return sym('es-h-' + key, VB.hang, '<circle cx="30" cy="-9" r="5" fill="none" stroke="#fff6e6" stroke-width="2.2"/><path d="M30 -4V2" stroke="#fff6e6" stroke-width="2"/>' +
      '<use href="#es-egg-' + key + '" y="0" width="60" height="80"/><path d="M30 3C21 -5 16 4 25 7ZM30 3C39 -5 44 4 35 7Z" fill="#ff8fb9"/><circle cx="30" cy="4.2" r="2.8" fill="#f0709f"/>');
  }

  // ── Things that grow ──
  function leaf(d, c) { return '<path d="' + d + '" fill="' + c + '"/>'; }
  var TULIP = sym('es-tulip', VB.tulip,
    '<path d="M22 46C23 64 21 84 22 102" fill="none" stroke="' + P.leafD + '" stroke-width="4.5" stroke-linecap="round"/>' +
    leaf('M22 100C8 94 3 74 7 54C17 64 24 82 22 100Z', P.leaf) + leaf('M22 100C36 96 42 82 40 66C31 74 23 86 22 100Z', P.leafD) +
    '<path d="M22 98C16 84 12 70 8 58" fill="none" stroke="#2f8f55" stroke-opacity=".5" stroke-width="1.3" stroke-linecap="round"/>' +
    '<path d="M7 12L15 19L22 3L29 19L37 12C40 32 33 46 22 48C11 46 4 32 7 12Z" fill="currentColor"/>' +
    '<path d="M7 12L15 19L17 36C11 32 6 26 7 12Z" fill="#fff" opacity=".3"/><path d="M37 12L29 19L27 38C34 34 39 26 37 12Z" fill="#2c2560" opacity=".17"/>' +
    '<path d="M15 19L22 3L29 19L27 40C25 43 19 43 17 40Z" fill="#fff" opacity=".13"/>');
  var DAFF = sym('es-daff', VB.daff,
    '<path d="M28 40C27 62 30 86 28 106" fill="none" stroke="' + P.leafD + '" stroke-width="4.5" stroke-linecap="round"/>' +
    leaf('M28 106C14 98 9 76 13 54C22 68 30 88 28 106Z', P.leaf) + leaf('M28 106C43 101 49 84 47 66C37 76 29 90 28 106Z', P.leafD) +
    rot('<path d="M28 29C20 23 19 8 28 2C37 8 36 23 28 29Z" fill="currentColor"/><path d="M28 25C24 20 23.5 11 28 6C32.5 11 32 20 28 25Z" fill="#fff" opacity=".22"/>', 6, 28, 28, 0) +
    '<circle cx="28" cy="28" r="11.5" fill="#ffb02e" stroke="#ffc65e" stroke-width="2.2" stroke-dasharray="5 3.1"/><circle cx="28" cy="28" r="8" fill="#f58a1f"/>' +
    '<circle cx="28" cy="28" r="4.4" fill="#d9660f" opacity=".55"/><path d="M21 24C23 20 27 19 31 20" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="1.6" stroke-linecap="round"/>');
  var BLOSSOM_P = 'M24 25C15 20 11 9 17 4C20 2 23 4 24 8C25 4 28 2 31 4C37 9 33 20 24 25Z';
  var BLOSSOM = sym('es-blossom', VB.blossom,
    rot('<path d="' + BLOSSOM_P + '" fill="currentColor"/><path d="M24 21C19 17 17 11 20 8C22 7 23.5 8.5 24 11C24.5 8.5 26 7 28 8C31 11 29 17 24 21Z" fill="#fff" opacity=".32"/>', 5, 24, 24, 0) +
    '<circle cx="24" cy="24" r="5.6" fill="#ffe08a"/>' + rot('<circle cx="24" cy="19.4" r="1.5" fill="#e8943a"/>', 5, 24, 24, 36) + '<circle cx="24" cy="24" r="1.8" fill="#e8943a"/>');
  var PETAL = sym('es-petal', VB.petal,
    '<path d="M12 5C10 2 7 2 6 5C2 11 2 19 6 24C8 27 10 28 12 28C14 28 16 27 18 24C22 19 22 11 18 5C17 2 14 2 12 5Z" fill="currentColor"/>' +
    '<path d="M12 9C9 13 8 19 11 25C13 21 14 14 12 9Z" fill="#fff" opacity=".3"/>');
  function blade(x, base, h, lean, w, c) {
    return '<path d="M' + (x - w / 2).toFixed(1) + ' ' + base + 'Q' + (x - w / 2 + lean * 0.3).toFixed(1) + ' ' + (base - h * 0.6).toFixed(1) + ' ' + (x + lean).toFixed(1) + ' ' + (base - h).toFixed(1) +
      'Q' + (x + w / 2 + lean * 0.1).toFixed(1) + ' ' + (base - h * 0.5).toFixed(1) + ' ' + (x + w / 2).toFixed(1) + ' ' + base + 'Z" fill="' + c + '"/>';
  }
  var GREENS = [P.leaf, P.leafD, P.leafL, '#2f9a5c'];
  function tuftBody(w, h, n, seed) {
    var r = R(seed), o = '', i;
    for (i = 0; i < n; i++) { var x = 6 + (w - 12) * (i + r() * 0.6) / n; o += blade(x, h, h * (0.5 + r() * 0.5), (r() - 0.5) * w * 0.22, 6 + r() * 4, GREENS[i % 4]); }
    return o;
  }
  var TUFT = sym('es-tuft', VB.tuft, tuftBody(80, 40, 9, 3));
  var TREE = sym('es-tree', VB.tree,
    '<path d="M43 110C45 92 43 78 40 64" fill="none" stroke="#6a4a5c" stroke-width="7" stroke-linecap="round"/><path d="M44 86C52 78 60 74 68 72M42 76C34 70 28 66 22 64" fill="none" stroke="#6a4a5c" stroke-width="4.5" stroke-linecap="round"/>' +
    '<g fill="currentColor"><circle cx="45" cy="36" r="26"/><circle cx="22" cy="48" r="19"/><circle cx="68" cy="48" r="20"/><circle cx="34" cy="20" r="15"/><circle cx="58" cy="20" r="15"/><circle cx="45" cy="58" r="17"/></g>' +
    '<g fill="#fff" opacity=".3"><circle cx="36" cy="28" r="10"/><circle cx="62" cy="40" r="7"/><circle cx="20" cy="44" r="6"/></g><g fill="#ff8fb9" opacity=".5"><circle cx="50" cy="46" r="4"/><circle cx="30" cy="58" r="3"/><circle cx="62" cy="60" r="3.5"/><circle cx="46" cy="20" r="3"/></g>');
  var CARROT = sym('es-carrot', VB.carrot,
    leaf('M20 32C12 22 6 12 10 3C16 7 20 16 20 32Z', P.leaf) + leaf('M20 32C20 16 24 5 30 0C35 9 28 24 20 32Z', P.leafD) + leaf('M20 32C16 20 18 8 22 4C26 10 24 22 20 32Z', P.leafL) +
    '<path d="M6 34C6 28 34 28 34 34C34 56 26 90 20 102C14 90 6 56 6 34Z" fill="#ff9b4a"/><path d="M9 36C9 52 14 76 19 92C14 74 11 54 11 36Z" fill="#ffc08a" opacity=".65"/>' +
    '<path d="M24 38C28 38 30 37 31 36V50C29 50 27 47 24 38Z" fill="#e0702a" opacity=".25"/>' +
    '<path d="M8 44H18M23 54H32M10 64H19M22 74H29M13 84H19" fill="none" stroke="#e0702a" stroke-width="2" stroke-linecap="round" opacity=".8"/>');
  var CLOUD = sym('es-cloud', VB.cloud,
    '<g fill="currentColor"><rect x="6" y="38" width="128" height="26" rx="13"/><circle cx="42" cy="38" r="20"/><circle cx="72" cy="30" r="26"/><circle cx="102" cy="38" r="18"/><circle cx="24" cy="46" r="13"/><circle cx="120" cy="46" r="12"/></g>' +
    '<rect x="6" y="52" width="128" height="12" rx="6" fill="#6b5aa8" opacity=".13"/>');
  function wing() {
    return '<path d="M36 25C44 22 52 12 47 4C42 -1 28 3 24 13C21 20 27 24 36 25Z" fill="currentColor"/><path d="M26 25C19 25 9 22 7 14C5 8 13 4 19 8C25 12 28 19 26 25Z" fill="currentColor"/>' +
      '<path d="M34 24C40 21 46 14 44 8C38 8 32 14 32 22Z" fill="#fff" opacity=".24"/><circle cx="42" cy="10" r="3.2" fill="#fff" opacity=".85"/><circle cx="34" cy="8" r="2" fill="#fff" opacity=".8"/><circle cx="14" cy="12" r="3" fill="#fff" opacity=".75"/>' +
      '<path d="M36 25C44 22 52 12 47 4C42 -1 28 3 24 13C21 20 27 24 36 25Z" fill="none" stroke="#3b2f6b" stroke-opacity=".35" stroke-width="1.2"/>';
  }
  // Seen from above, head to the right: so the kit's flap (which squashes a flyer up and down) closes the wings toward the body, as a butterfly's do.
  var BFLY = sym('es-bfly', VB.bfly, '<g>' + wing() + '</g><g transform="translate(0 56) scale(1 -1)">' + wing() + '</g>' +
    '<rect x="14" y="25" width="31" height="6" rx="3" fill="#3b2f6b"/><circle cx="47" cy="28" r="4" fill="#3b2f6b"/><path d="M49 25C53 19 56 18 59 19M49 31C53 37 56 38 59 37" fill="none" stroke="#3b2f6b" stroke-width="1.6" stroke-linecap="round"/>');

  // ── Creatures ──
  var BUNNY = sym('es-bunny', VB.bunny,
    '<path d="M70 32C60 18 56 2 62 0C72 0 78 16 80 32Z" fill="#ece1f4"/><path d="M72 30C66 18 63 7 65 5C71 7 75 17 76 30Z" fill="#ffc2d6"/>' +
    '<path d="M16 96C12 72 28 54 52 52C76 50 92 64 94 86C96 102 84 112 66 112H36C24 112 17 106 16 96Z" fill="#fff8ee"/><path d="M60 58C70 44 86 46 92 60C96 72 92 90 84 102L56 102Z" fill="#fff8ee"/>' +
    '<ellipse cx="42" cy="90" rx="23" ry="21" fill="#f0e7f6"/><path d="M26 86C28 76 36 70 45 70C37 73 31 79 29 90Z" fill="#fff" opacity=".7"/><ellipse cx="51" cy="111" rx="22" ry="6.5" fill="#fff8ee"/>' +
    '<circle cx="14" cy="92" r="10" fill="#fff"/><circle cx="12" cy="90" r="5.5" fill="#f4edf9"/>' +
    '<path d="M78 76C76 92 77 102 80 108L95 108C92 100 94 90 96 76Z" fill="#fff8ee"/><ellipse cx="89" cy="110" rx="11" ry="5.5" fill="#fff8ee"/>' +
    '<circle cx="82" cy="46" r="21" fill="#fff8ee"/><ellipse cx="98" cy="53" rx="12" ry="9.5" fill="#fff8ee"/>' +
    '<path d="M82 30C82 14 88 0 96 1C102 4 96 20 92 33Z" fill="#fff8ee"/><path d="M85 29C85 17 89 7 94 6C96 10 93 20 90 30Z" fill="#ffb3cb"/>' +
    '<circle cx="92" cy="43" r="3.6" fill="#2c2560"/><circle cx="93.2" cy="41.8" r="1.2" fill="#fff"/><ellipse cx="94" cy="54" rx="5.5" ry="3.6" fill="#ffb3cb" opacity=".55"/>' +
    '<path d="M106 49Q110 49 110 52Q110 55 107 55Q104 54 104 52Z" fill="#ff8fb3"/><path d="M104 57Q106 60 109 58" fill="none" stroke="#d08aa6" stroke-width="1.3" stroke-linecap="round"/>' +
    '<path d="M102 56L113 58M102 59L112 63" fill="none" stroke="#d3c4e6" stroke-width="1.3" stroke-linecap="round"/>');
  var PEEK = sym('es-peek', VB.peek,
    '<g transform="rotate(-7 36 44)"><path d="M32 44C22 26 20 4 29 2C39 2 44 26 44 44Z" fill="#fff8ee"/><path d="M33 40C27 26 26 11 30 8C36 9 39 26 40 40Z" fill="#ffb3cb"/></g>' +
    '<g transform="rotate(9 64 44)"><path d="M68 44C78 26 80 4 71 2C61 2 56 26 56 44Z" fill="#fff8ee"/><path d="M67 40C73 26 74 11 70 8C64 9 61 26 60 40Z" fill="#ffb3cb"/></g>' +
    '<ellipse cx="50" cy="62" rx="33" ry="28" fill="#fff8ee"/><path d="M20 66C24 80 38 90 50 90C42 82 30 76 26 58Z" fill="#f0e7f6" opacity=".7"/>' +
    '<circle cx="30" cy="70" r="5.5" fill="#ffb3cb" opacity=".55"/><circle cx="70" cy="70" r="5.5" fill="#ffb3cb" opacity=".55"/>' +
    '<circle cx="38" cy="58" r="3.9" fill="#2c2560"/><circle cx="62" cy="58" r="3.9" fill="#2c2560"/><circle cx="39.2" cy="56.7" r="1.3" fill="#fff"/><circle cx="63.2" cy="56.7" r="1.3" fill="#fff"/>' +
    '<path d="M45.5 65Q50 62.5 54.5 65Q52.5 70.5 50 71Q47.5 70.5 45.5 65Z" fill="#ff8fb3"/><path d="M50 71V74M50 74Q46.5 77.5 43 74.5M50 74Q53.5 77.5 57 74.5" fill="none" stroke="#c78aa5" stroke-width="1.4" stroke-linecap="round"/>' +
    '<path d="M31 64L14 61M31 68L14 70M69 64L86 61M69 68L86 70" fill="none" stroke="#d3c4e6" stroke-width="1.3" stroke-linecap="round"/>' +
    '<use href="#es-tuft" x="-4" y="54" width="108" height="42"/>');
  var CHICK = sym('es-chick', VB.chick,
    '<ellipse cx="13" cy="50" rx="7" ry="11" transform="rotate(18 13 50)" fill="#f5c04a"/><ellipse cx="67" cy="50" rx="7" ry="11" transform="rotate(-18 67 50)" fill="#f5c04a"/>' +
    '<circle cx="40" cy="44" r="28" fill="#ffd86b"/><ellipse cx="40" cy="55" rx="19" ry="14" fill="#ffe9a3"/><path d="M18 40C16 30 22 20 30 18C24 24 22 32 24 42Z" fill="#fff" opacity=".35"/>' +
    '<circle cx="30.5" cy="43" r="3.5" fill="#2c2560"/><circle cx="49.5" cy="43" r="3.5" fill="#2c2560"/><circle cx="31.7" cy="41.8" r="1.2" fill="#fff"/><circle cx="50.7" cy="41.8" r="1.2" fill="#fff"/>' +
    '<ellipse cx="23.5" cy="52" rx="5" ry="3.3" fill="#ff9ec4" opacity=".55"/><ellipse cx="56.5" cy="52" rx="5" ry="3.3" fill="#ff9ec4" opacity=".55"/><path d="M35 49Q40 45 45 49Q42 56 40 56Q38 56 35 49Z" fill="#ff9a3d"/>' +
    '<path d="M8 56L16 49L24 56L32 49L40 56L48 49L56 56L64 49L72 56C72 72 58 82 40 82C22 82 8 72 8 56Z" fill="#fff6e6"/><path d="M72 56C72 72 58 82 40 82C52 78 63 70 63 56Z" fill="#e6dac9" opacity=".7"/>' +
    '<g fill="#b9a2ff"><circle cx="22" cy="68" r="1.8"/><circle cx="34" cy="74" r="1.5"/><circle cx="50" cy="70" r="1.8"/></g>' +
    '<g transform="rotate(-9 41 18)"><path d="M17 30L23 22L29 30L35 21L41 30L47 21L53 30L59 22L65 30C64 14 52 6 41 6C30 6 18 14 17 30Z" fill="#fff6e6"/><path d="M65 30C64 14 52 6 41 6C54 10 59 20 56 30Z" fill="#e6dac9" opacity=".7"/><circle cx="30" cy="16" r="1.6" fill="#ff9ec4"/><circle cx="46" cy="13" r="1.6" fill="#8fe3c0"/></g>');

  // ── Homes for eggs: a nest and a basket ──
  var NEST = sym('es-nest', VB.nest,
    '<ellipse cx="55" cy="32" rx="48" ry="15" fill="#6e4a28"/>' +
    '<use href="#es-egg-d" x="19" y="2" width="27" height="36" style="color:#ff9ec4;--c2:#fff6e6;--c3:#ffd86b"/><use href="#es-egg-z" x="42" y="-4" width="27" height="36" style="color:#8fe3c0;--c2:#fff6e6;--c3:#ffd86b"/>' +
    '<use href="#es-egg-b" x="64" y="3" width="27" height="36" style="color:#b9a2ff;--c2:#fff6e6;--c3:#ffd86b"/>' +
    '<path d="M4 32C4 52 28 62 55 62C82 62 106 52 106 32C92 44 18 44 4 32Z" fill="' + P.wood + '"/>' +
    '<g fill="none" stroke-linecap="round"><path d="M8 40C30 52 80 52 102 40" stroke="' + P.woodD + '" stroke-width="2.4"/><path d="M12 47C34 58 76 58 98 47" stroke="#d4a468" stroke-width="2.4"/>' +
    '<path d="M16 38L26 58M34 42L40 60M54 44L56 62M74 42L70 60M92 38L84 58" stroke="#7a4f27" stroke-width="1.8" opacity=".6"/><path d="M2 30C-2 26 0 22 6 24M108 30C112 26 110 22 104 24M14 28L8 22M96 28L102 22" stroke="' + P.woodD + '" stroke-width="2.2"/></g>');
  var BASKET = sym('es-basket', VB.basket,
    '<path d="M22 56C20 6 100 6 98 56" fill="none" stroke="#a9733c" stroke-width="7" stroke-linecap="round"/><path d="M27 54C27 15 93 15 93 54" fill="none" stroke="#e0b178" stroke-width="2.2" stroke-linecap="round"/>' +
    '<path d="M20 58C24 40 30 50 36 36C40 48 46 34 52 46C58 32 64 46 70 36C76 48 82 38 86 50C90 44 94 50 100 58Z" fill="#7fd68a"/>' +
    '<use href="#es-egg-z" x="22" y="30" width="27" height="36" style="color:#ff9ec4;--c2:#fff6e6;--c3:#ffd86b"/><use href="#es-egg-w" x="47" y="22" width="29" height="39" style="color:#ffe08a;--c2:#fff6e6;--c3:#ff9ec4"/>' +
    '<use href="#es-egg-l" x="71" y="31" width="27" height="36" style="color:#8fe3c0;--c2:#fff6e6;--c3:#b9a2ff"/>' +
    '<path d="M8 58H112L104 98C103 103 99 106 94 106H26C21 106 17 103 16 98Z" fill="#d9a060"/><rect x="4" y="52" width="112" height="14" rx="7" fill="#c68b4c"/><rect x="10" y="55" width="100" height="3" rx="1.5" fill="#f0c58c" opacity=".7"/>' +
    '<path d="M12 78H108M14 90H106M16 101H104" stroke="' + P.wood + '" stroke-width="2.4"/><path d="M24 68V78M42 68V78M60 68V78M78 68V78M96 68V78M33 78V90M51 78V90M69 78V90M87 78V90M24 90V101M42 90V101M60 90V101M78 90V101M96 90V101" stroke="' + P.wood + '" stroke-width="2.2" opacity=".65"/>' +
    '<path d="M60 70C44 56 34 74 52 78ZM60 70C76 56 86 74 68 78Z" fill="#ff9ec4"/><path d="M58 76L48 100L56 95L59 102ZM62 76L72 100L64 95L61 102Z" fill="#f0709f"/><circle cx="60" cy="72" r="5.2" fill="#ffc9de"/>');
  var FENCE = (function () {
    var o = '<rect x="0" y="28" width="120" height="8" rx="2" fill="#e4dcf1"/><rect x="0" y="54" width="120" height="8" rx="2" fill="#e4dcf1"/>', i, x;
    for (i = 0; i < 3; i++) { x = 6 + 40 * i; o += '<path d="M' + x + ' 14L' + (x + 14) + ' 0L' + (x + 28) + ' 14V80H' + x + 'Z" fill="#fffaf3"/><path d="M' + (x + 20) + ' 6L' + (x + 28) + ' 14V80H' + (x + 20) + 'Z" fill="#e8e0f2"/><path d="M' + (x + 5) + ' 17V76" stroke="#fff" stroke-width="2" opacity=".7"/>'; }
    return sym('es-fence', VB.fence, o);
  })();
  var RAIN = (function () {
    var cols = ['#ff9ec4', '#ffb48a', '#ffe08a', '#8fe3c0', '#8cc8ff', '#b9a2ff'], o = '', i, r;
    for (i = 0; i < 6; i++) { r = 74 - i * 8.5; o += '<path d="M' + (80 - r) + ' 90A' + r + ' ' + r + ' 0 0 1 ' + (80 + r) + ' 90" fill="none" stroke="' + cols[i] + '" stroke-width="8.8"/>'; }
    o += '<g fill="#fff6fb"><circle cx="20" cy="84" r="12"/><circle cx="36" cy="79" r="14"/><circle cx="52" cy="86" r="10"/><rect x="6" y="84" width="54" height="12" rx="6"/>' +
      '<circle cx="140" cy="84" r="12"/><circle cx="124" cy="79" r="14"/><circle cx="108" cy="86" r="10"/><rect x="100" y="84" width="54" height="12" rx="6"/></g>' +
      '<rect x="6" y="90" width="54" height="6" rx="3" fill="#6b5aa8" opacity=".12"/><rect x="100" y="90" width="54" height="6" rx="3" fill="#6b5aa8" opacity=".12"/>';
    return sym('es-rain', VB.rain, o);
  })();
  var CONF = sym('es-conf', VB.conf, '<rect x="1" y="1" width="10" height="18" rx="3.4" fill="currentColor"/>');

  // A blossom branch hanging from the top corner: a plum-brown limb, young leaves, and blossoms and buds on every twig.
  var BRANCH = (function () {
    var o = '', t = ['M250 4C222 8 196 24 182 52C170 76 172 104 158 130C146 152 128 168 114 192', 'M182 52C166 46 150 50 136 40', 'M171 98C190 108 204 124 210 148', 'M158 130C140 124 122 128 104 118',
      'M114 192C124 208 120 226 130 246', 'M114 192C132 190 146 198 156 214', 'M200 22C206 12 218 8 230 10'], i;
    for (i = 0; i < t.length; i++) o += '<path d="' + t[i] + '" fill="none" stroke="#6a4a5c" stroke-width="' + (i ? 4.4 : 7.5) + '" stroke-linecap="round"/>';
    o += '<path d="M250 4C222 8 196 24 182 52C170 76 172 104 158 130" fill="none" stroke="#8d6a7c" stroke-width="2" stroke-linecap="round" transform="translate(-2 -1)"/>';
    [[142, 62, 20], [194, 118, -30], [118, 140, 60], [148, 186, -20], [124, 224, 40], [214, 118, 10]].forEach(function (l) {
      o += '<g transform="translate(' + l[0] + ' ' + l[1] + ') rotate(' + l[2] + ')"><path d="M0 0C6 -9 18 -9 24 0C18 8 6 8 0 0Z" fill="#7fd68a"/><path d="M2 0H20" stroke="#52b96f" stroke-width="1.2"/></g>';
    });
    [[136, 40, 36, '#ffc9de'], [224, 12, 30, '#fff0f6'], [210, 148, 38, '#ff9ec4'], [104, 118, 36, '#ffd9e8'], [130, 246, 34, '#ffc9de'], [156, 214, 32, '#fff0f6'], [114, 192, 38, '#ff9ec4'], [182, 52, 32, '#ffe0ec'], [164, 112, 28, '#ffc9de'], [212, 74, 26, '#fff0f6']].forEach(function (b) {
      o += '<use href="#es-blossom" x="' + (b[0] - b[2] / 2) + '" y="' + (b[1] - b[2] / 2) + '" width="' + b[2] + '" height="' + b[2] + '" style="color:' + b[3] + '"/>';
    });
    [[150, 66], [190, 134], [100, 140], [140, 226], [166, 196], [236, 28]].forEach(function (b) { o += '<circle cx="' + b[0] + '" cy="' + b[1] + '" r="4.6" fill="#ff8fb9"/><circle cx="' + (b[0] - 1.4) + '" cy="' + (b[1] - 1.4) + '" r="1.6" fill="#ffd9e8"/>'; });
    return sym('es-branch', VB.branch, o);
  })();

  // ── Clusters that grow in a corner: grass, flowers, eggs. Each is one drawing, placed with CSS. ──
  var DIM = { tulip: [44, 104], daff: [56, 108], carrot: [40, 104] };
  function fl(kind, cx, base, h, col) {
    var w = h * DIM[kind][0] / DIM[kind][1];
    return '<use href="#es-' + kind + '" x="' + (cx - w / 2).toFixed(1) + '" y="' + (base - h).toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + h + '"' + (col ? ' style="color:' + col + '"' : '') + '/>';
  }
  function eg(key, cx, base, w, col, c2, c3, a) {
    var h = w * 4 / 3;
    return '<use href="#es-egg-' + key + '" x="' + (cx - w / 2).toFixed(1) + '" y="' + (base - h).toFixed(1) + '" width="' + w + '" height="' + h.toFixed(1) + '" transform="rotate(' + (a || 0) + ' ' + cx + ' ' + base + ')" style="color:' + col + ';--c2:' + (c2 || P.cream) + ';--c3:' + (c3 || P.yel) + '"/>';
  }
  function tf(x, y, w) { return '<use href="#es-tuft" x="' + x + '" y="' + y + '" width="' + w + '" height="' + (w / 2).toFixed(0) + '"/>'; }
  function mound(col, hi) {
    return '<path d="M0 122C16 104 50 98 95 100C140 98 174 104 190 122Z" fill="' + (col || '#3fae6e') + '"/><path d="M12 113C40 102 70 99 95 100C62 102 32 106 12 113Z" fill="' + (hi || '#7bdc8f') + '" opacity=".6"/>';
  }
  function cluster(id, body) { return sym('es-cl-' + id, VB.cl, body); }
  var CLUSTERS =
    cluster('tulips', mound() + fl('tulip', 30, 108, 78, P.pink) + fl('tulip', 160, 108, 74, P.yel) + fl('tulip', 62, 110, 98, P.lilac) + fl('tulip', 128, 110, 90, P.peach) + fl('tulip', 95, 112, 106, P.pink) + tf(0, 98, 46) + tf(144, 98, 46) + tf(70, 102, 50)) +
    cluster('daffs', mound() + fl('daff', 28, 108, 80, '#ffe27a') + fl('daff', 158, 108, 84, '#fff3b0') + fl('daff', 60, 110, 100, '#ffd23f') + fl('tulip', 128, 110, 84, P.pink) + fl('daff', 94, 112, 104, '#ffe27a') + eg('d', 150, 118, 20, P.mint, P.cream, P.yel, 14) + tf(0, 98, 46) + tf(70, 102, 52)) +
    cluster('mixed', mound() + fl('tulip', 36, 108, 88, P.lilac) + fl('daff', 150, 108, 90, '#ffe27a') + fl('tulip', 106, 110, 100, P.peach) + eg('z', 66, 120, 24, P.pink, P.cream, P.yel, -12) + eg('w', 128, 121, 22, P.sky, P.cream, P.pink, 10) +
      '<use href="#es-blossom" x="46" y="86" width="22" height="22" style="color:#fff0f6"/><use href="#es-blossom" x="138" y="82" width="18" height="18" style="color:#ffc9de"/>' + tf(0, 98, 48) + tf(142, 98, 48)) +
    cluster('eggs', mound() + eg('l', 50, 118, 32, P.lilac, P.cream, P.mint, -10) + eg('d', 92, 120, 36, P.pink, P.cream, P.yel, 6) + eg('b', 134, 119, 30, P.sky, P.cream, P.pink, 14) + eg('z', 76, 106, 22, P.yel, P.cream, P.pink, -4) + fl('tulip', 24, 110, 66, P.peach) + tf(0, 98, 54) + tf(56, 104, 60) + tf(120, 98, 66)) +
    cluster('carrots', '<path d="M0 122C14 108 50 102 95 104C140 102 176 108 190 122Z" fill="#8a5a3a"/><path d="M12 114C40 105 70 103 95 104C62 106 32 110 12 114Z" fill="#a8744c" opacity=".7"/>' +
      fl('carrot', 36, 112, 70, null) + fl('carrot', 70, 112, 84, null) + fl('carrot', 108, 112, 76, null) + fl('carrot', 146, 112, 88, null) + tf(0, 98, 40) + tf(150, 96, 44) + fl('tulip', 170, 110, 56, P.pink)) +
    cluster('nest', mound() + fl('tulip', 28, 108, 82, P.pink) + fl('daff', 164, 108, 82, '#ffe27a') + fl('tulip', 150, 110, 70, P.lilac) + '<use href="#es-nest" x="42" y="70" width="104" height="60"/>' + tf(0, 98, 44) + tf(152, 100, 40)) +
    cluster('basket', mound() + fl('tulip', 24, 108, 84, P.peach) + fl('daff', 168, 108, 86, '#fff3b0') + fl('tulip', 40, 110, 66, P.lilac) + '<use href="#es-basket" x="48" y="30" width="100" height="92"/>' + tf(0, 98, 44) + tf(150, 100, 40)) +
    cluster('fence', mound() + '<use href="#es-fence" x="22" y="40" width="150" height="100"/>' + fl('tulip', 36, 112, 76, P.pink) + fl('daff', 100, 114, 92, '#ffe27a') + fl('tulip', 160, 112, 80, P.lilac) + tf(0, 98, 50) + tf(70, 102, 52) + tf(142, 100, 48)) +
    cluster('chicks', mound() + '<use href="#es-chick" x="30" y="66" width="52" height="56"/><use href="#es-chick" x="102" y="76" width="42" height="45"/>' + eg('b', 160, 120, 22, P.pink, P.cream, P.yel, 12) + fl('tulip', 14, 110, 60, P.yel) + tf(0, 100, 40) + tf(76, 104, 50) + tf(142, 100, 46));

  // ── Bunting and grass as repeating strips (patterns), so a whole garland is two elements ──
  var CORD = '#cdbcff';
  function bunting(kind) {
    var w = kind === 'egg' ? 150 : kind === 'flag' ? 132 : 144, n = kind === 'daisy' ? 3 : 2, sw = w / n, sag = kind === 'egg' ? 11 : 9, h = kind === 'egg' ? 46 : kind === 'flag' ? 44 : 38;
    var m = kind === 'daisy' ? 2 : 3, d = 'M0 4', i, j, o;
    for (i = 0; i < n; i++) d += 'Q' + (sw * i + sw / 2) + ' ' + (4 + 2 * sag) + ' ' + (sw * (i + 1)) + ' 4';
    o = '<pattern id="es-pat-' + kind + '" width="' + w + '" height="' + h + '" patternUnits="userSpaceOnUse"><path d="' + d + '" fill="none" stroke="' + CORD + '" stroke-width="2" stroke-linecap="round"/>';
    for (i = 0; i < n; i++) for (j = 0; j < m; j++) {
      var t = (j + 0.5) / m, x = sw * i + sw * t, y = 4 + 4 * sag * t * (1 - t), c = EGGCOL[(i * m + j) % 6], k = i * m + j, ang = Math.atan(4 * sag * (1 - 2 * t) / sw) * 180 / Math.PI;
      if (kind === 'egg') {
        o += '<g transform="translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ')"><path d="M0 0V3" stroke="' + CORD + '" stroke-width="1.6"/><path d="M0 3C5.2 3 7.8 10 7.8 15C7.8 20 4.4 23 0 23C-4.4 23 -7.8 20 -7.8 15C-7.8 10 -5.2 3 0 3Z" fill="' + c + '"/>' +
          (k % 2 ? '<path d="M-7 13l3.5-3 3.5 3 3.5-3 3.5 3" fill="none" stroke="#fff6e6" stroke-width="1.8" stroke-linejoin="round"/>' : '<g fill="#fff6e6"><circle cx="-2.6" cy="10" r="1.4"/><circle cx="2.8" cy="13" r="1.4"/><circle cx="-1" cy="18" r="1.4"/></g>') +
          '<ellipse cx="-3" cy="9" rx="1.3" ry="2.6" fill="#fff" opacity=".5"/></g>';
      } else if (kind === 'flag') {
        o += '<g transform="translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ') rotate(' + ang.toFixed(1) + ')"><path d="M-9 0H9L0 19Z" fill="' + c + '"/><path d="M-9 0H9L8 2H-8Z" fill="#fff" opacity=".35"/><circle cx="0" cy="6.5" r="1.8" fill="#fff6e6"/></g>';
      } else {
        o += '<g transform="translate(' + x.toFixed(1) + ' ' + (y + 8).toFixed(1) + ')"><path d="M0 -8V0" stroke="' + CORD + '" stroke-width="1.6"/>' + rot('<circle cx="0" cy="-5.2" r="3.4" fill="' + (k % 2 ? '#fff6e6' : c) + '"/>', 6, 0, 0, 0) + '<circle r="3" fill="#ffd86b"/></g>';
      }
    }
    return o + '</pattern>';
  }
  function grassPattern() {
    var r = R(5), w = 260, h = 44, o = '<pattern id="es-pat-grass" width="' + w + '" height="' + h + '" patternUnits="userSpaceOnUse">', x, bh, lean, c, bw;
    var fls = [[34, 20, P.pink], [96, 24, '#fff6e6'], [152, 17, P.yel], [214, 22, P.lilac], [246, 26, P.pink]];
    fls.forEach(function (f) { o += '<path d="M' + f[0] + ' ' + f[1] + 'V38" stroke="#3fa65f" stroke-width="1.8"/><g transform="translate(' + f[0] + ' ' + f[1] + ')">' + rot('<circle cx="0" cy="-3.2" r="2.4" fill="' + f[2] + '"/>', 5, 0, 0, 0) + '<circle r="2" fill="#ffd86b"/></g>'; });
    for (x = 2; x < w; x += 5 + r() * 5) {
      bh = 10 + r() * 20; lean = (r() - 0.5) * 9; c = GREENS[Math.floor(r() * 4)]; bw = 5 + r() * 3;
      o += blade(x, 40, bh, lean, bw, c);
      if (x < 12) o += blade(x + w, 40, bh, lean, bw, c);
      if (x > w - 12) o += blade(x - w, 40, bh, lean, bw, c);
    }
    return o + '<rect y="34" width="' + w + '" height="10" fill="#3aa86a"/><rect y="40" width="' + w + '" height="4" fill="#2f8f55"/></pattern>';
  }

  var DEFS =
    '<clipPath id="es-ec"><path d="' + EGG + '"/></clipPath>' +
    '<clipPath id="es-ct"><path d="M-6 -20H66V42L56 35L48 44L40 35L32 44L24 35L16 44L8 35L-6 42Z"/></clipPath>' +
    '<clipPath id="es-cb"><path d="M-6 42L8 35L16 44L24 35L32 44L40 35L48 44L56 35L66 42V90H-6Z"/></clipPath>' +
    '<linearGradient id="es-g-far" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ab9ff2"/><stop offset="1" stop-color="#6c69c8"/></linearGradient>' +
    '<linearGradient id="es-g-mid" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#72d3aa"/><stop offset="1" stop-color="#2f8f86"/></linearGradient>' +
    '<linearGradient id="es-g-front" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8be59d"/><stop offset=".42" stop-color="#46b574"/><stop offset=".82" stop-color="#1f6552"/><stop offset="1" stop-color="#143a3a"/></linearGradient>' +
    '<linearGradient id="es-g-fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0f1424" stop-opacity="0"/><stop offset="1" stop-color="#0f1424"/></linearGradient>' +
    bunting('egg') + bunting('flag') + bunting('daisy') + grassPattern() +
    ['z', 'd', 'b', 'l', 'w'].map(function (key) { return eggSym(key) + hangSym(key); }).join('') +
    TULIP + DAFF + BLOSSOM + PETAL + TUFT + TREE + CARROT + CLOUD + BFLY + BUNNY + PEEK + CHICK + NEST + BASKET + FENCE + RAIN + CONF + BRANCH + CLUSTERS;

  // ── Small builders the scenes share ──
  function svgUse(k, id, vb, style, cls) { return k.use(id, cls || '', vb).replace('<svg ', '<svg style="' + style + '" '); }
  function eggUse(k, key, col, c2, c3, cls) { return svgUse(k, 'es-egg-' + key, VB.egg, 'color:' + col + ';--c2:' + (c2 || P.cream) + ';--c3:' + (c3 || P.yel), cls); }
  // A tappable egg that cracks: two halves, the top lifts and a pop of confetti goes up (the pop is in onTap).
  function crackEgg(col, c2, c3) {
    var half = function (cls, clip) { return '<g class="' + cls + '" clip-path="url(#' + clip + ')"><use href="#es-egg-z" width="60" height="80" style="color:' + col + ';--c2:' + c2 + ';--c3:' + c3 + '"/></g>'; };
    return '<svg viewBox="0 -16 60 98" aria-hidden="true" focusable="false">' + half('es-eb', 'es-cb') + half('es-et', 'es-ct') + '</svg>';
  }
  // Reduced motion draws nothing moving, so each flyer is given its own resting place across the layer (the CSS reads --lx only then).
  function spread(html, seed) {
    var r = R(seed);
    return html.replace(/(<i class="sk-fly [^"]*" style=")/g, function (m, a) { return a + '--lx:' + Math.round(6 + r() * 78) + '%;'; });
  }
  function hill(fn, step, bottom) {
    var d = 'M-20 ' + fn(-20).toFixed(1), x;
    for (x = -20 + step; x <= 1460; x += step) d += 'L' + x + ' ' + fn(x).toFixed(1);
    return d + 'L1460 ' + bottom + 'L-20 ' + bottom + 'Z';
  }
  var TREECOL = ['#ffc9de', '#fff0f6', '#ffb3d1', '#e8dcff', '#ffd9e8'];

  // The hill along the foot of the hero: lavender hills with blossom trees and a low sun, a white picket fence, then the green meadow with tulips,
  // daffodils, painted eggs, tufts of grass and a basket, fading to the page's own indigo at the bottom.
  function meadow(k) {
    var r = k.rng(77), x, i, s, out = '<svg viewBox="0 0 1440 280" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">';
    var far = function (x) { return 66 + 16 * Math.sin(x / 170 + 0.6) + 8 * Math.sin(x / 61 + 2); };
    var mid = function (x) { return 116 + 9 * Math.sin(x / 230 + 1.7) + 4 * Math.sin(x / 83); };
    var front = function (x) { return 158 + 12 * Math.sin(x / 190 + 4.1) + 5 * Math.sin(x / 70 + 0.5); };
    out += '<circle cx="1010" cy="76" r="76" fill="#ffe9a3" opacity=".15"/><circle cx="1010" cy="76" r="48" fill="#fff0b8"/>';
    out += '<path d="' + hill(far, 12, 280) + '" fill="url(#es-g-far)"/>';
    for (x = 20; x < 1430; x += 56 + r() * 84) {
      s = 52 + r() * 34;
      out += '<use href="#es-tree" x="' + (x - s * 0.5).toFixed(0) + '" y="' + (far(x) + 8 - s * 1.222).toFixed(0) + '" width="' + s.toFixed(0) + '" height="' + (s * 1.222).toFixed(0) + '" style="color:' + TREECOL[Math.floor(r() * 5)] + '"/>';
    }
    out += '<path d="' + hill(mid, 12, 280) + '" fill="url(#es-g-mid)"/>';
    for (x = -30; x < 1450; x += 120) out += '<use href="#es-fence" x="' + x + '" y="104" width="120" height="80"/>';
    out += '<path d="' + hill(front, 12, 280) + '" fill="url(#es-g-front)"/>';
    var items = [], TC = [P.pink, P.lilac, P.peach, P.yel, P.pinkL, P.pink], DC = ['#ffe27a', '#fff3b0', '#ffd23f', '#ffe27a'];
    for (x = -10; x < 1450; x += 20 + r() * 32) {
      var kind = r() < 0.58 ? 'tulip' : 'daff', h = 56 + r() * 58, base = front(x) + 22 + r() * 56, w = h * DIM[kind][0] / DIM[kind][1];
      items.push({ y: base, s: '<use href="#es-' + kind + '" x="' + (x - w / 2).toFixed(0) + '" y="' + (base - h).toFixed(0) + '" width="' + w.toFixed(0) + '" height="' + h.toFixed(0) + '" style="color:' + (kind === 'tulip' ? TC[Math.floor(r() * 6)] : DC[Math.floor(r() * 4)]) + '"/>' });
    }
    var KEYS = ['z', 'd', 'b', 'l', 'w'];
    for (i = 0; i < 15; i++) {
      x = 30 + r() * 1380; var ew = 22 + r() * 18, eb = front(x) + 48 + r() * 50, col = EGGCOL[i % 6];
      items.push({ y: eb, s: eg(KEYS[i % 5], x, eb, +ew.toFixed(0), col, P.cream, EGGCOL[(i + 3) % 6], Math.round((r() - 0.5) * 50)) });
    }
    for (i = 0; i < 24; i++) { x = r() * 1440; var tw = 40 + r() * 34, tb = front(x) + 34 + r() * 66; items.push({ y: tb, s: '<use href="#es-tuft" x="' + (x - tw / 2).toFixed(0) + '" y="' + (tb - tw / 2).toFixed(0) + '" width="' + tw.toFixed(0) + '" height="' + (tw / 2).toFixed(0) + '"/>' }); }
    for (i = 0; i < 10; i++) { x = r() * 1440; var bs = 12 + r() * 9, bb = front(x) + 40 + r() * 52; items.push({ y: bb, s: '<use href="#es-blossom" x="' + (x - bs / 2).toFixed(0) + '" y="' + (bb - bs).toFixed(0) + '" width="' + bs.toFixed(0) + '" height="' + bs.toFixed(0) + '" style="color:' + (i % 2 ? '#fff6e6' : P.pinkL) + '"/>' }); }
    items.push({ y: 266, s: '<use href="#es-basket" x="1150" y="168" width="112" height="102"/>' });
    items.sort(function (a, b) { return a.y - b.y; });
    items.forEach(function (it) { out += it.s; });
    return out + '<rect y="232" width="1440" height="48" fill="url(#es-g-fade)"/></svg>';
  }

  // The bunny that hops across the foot of the hero on a loop. Three nested things so each can do one job: the runner crosses, the hopper hops, the sprite squashes.
  function hopper(k) {
    return '<div class="es-run"><div class="es-hop">' + k.tap('<span class="es-bunny">' + k.use('es-bunny', '', VB.bunny) + '</span>', 'Hop to it!', 'es-tap es-tap--bunny') + '</div></div>';
  }

  // The hero: a lavender and peach dusk, a low sun, clouds drifting, butterflies and petals, a blossom branch, the meadow, and a bunny, an egg and a chick that answer a tap.
  function hero(k) {
    var cloud = function (style) { return '<svg class="es-cloud" style="' + style + '" viewBox="' + VB.cloud + '" aria-hidden="true" focusable="false"><use href="#es-cloud"/></svg>'; };
    return '<div class="es-glow"></div><div class="es-glow es-glow--2"></div>' +
      k.twinkles(11, { id: 'sk-sparkle', size: [8, 15], dur: [3, 6], colors: [P.yelL, P.pinkL, P.skyL, '#ffffff', P.lilacL], areaY: [3, 40], seed: 21, mobile: 0.6 }) +
      cloud('top:7%;--l:5vw;--d:190s;--o:-30s;width:clamp(150px,22vw,330px)') + cloud('top:19%;--l:42vw;--d:150s;--o:-90s;width:clamp(110px,15vw,230px);opacity:.24') + cloud('top:33%;--l:70vw;--d:230s;--o:-150s;width:clamp(130px,19vw,290px);opacity:.2') +
      '<div class="es-branch">' + k.use('es-branch', '', VB.branch) + '</div>' +
      spread(k.flyers(6, { id: 'es-bfly', vb: VB.bfly, size: [26, 46], dur: [28, 46], top: [8, 66], wave: 40, flap: true, colors: BFLYCOL, seed: 31, mobile: 0.5 }), 3) +
      k.particles(24, { id: ['es-petal', 'es-petal', 'es-blossom'], colors: PETALCOL, size: [14, 30], dur: [14, 26], drift: 170, sway: 36, seed: 41, mobile: 0.5, opacity: [0.7, 1] }) +
      '<div class="es-meadow">' + meadow(k) + '</div>' + hopper(k) +
      k.tap(crackEgg(P.pink, P.cream, P.yel), 'Surprise!', 'es-tap es-tap--egg', '') +
      k.tap(k.use('es-chick', '', VB.chick), 'Peep!', 'es-tap es-tap--chick', '');
  }

  // A layer behind each section, different on every one so the page does not repeat itself. Each piece is  kind:...  (see section()).
  var SECTIONS = {
    eventStrip:     ['bunt:egg', 'cl:l:tulips', 'pend:r:3:78:36:z:pink', 'fly:22:2', 'petals:5:1', 'cloud:10:1'],
    programs:       ['branch:r', 'cl:r:nest', 'cl:l:carrots', 'tap:chick:l:46:54', 'fly:62:2:rtl', 'petals:4:2', 'cloud:28:1:rtl'],
    competition:    ['bunt:flag', 'cl:l:daffs', 'peek:b:80', 'pend:l:2:96:34:d:mint', 'cloud:16:1:rtl', 'petals:5:3', 'fly:56:2'],
    coaches:        ['rain:l', 'cl:r:eggs', 'pend:r:3:66:30:w:yel', 'tap:egg:l:56:54', 'fly:34:2:rtl', 'petals:4:4', 'grass'],
    gallery:        ['bunt:egg', 'cl:l:basket', 'cl:r:mixed', 'cloud:12:1', 'fly:40:2:rtl', 'petals:3:5', 'spark:r:18'],
    'belt-journey': ['branch:l', 'cl:r:carrots', 'cl:l:fence', 'pend:r:2:104:34:l:lilac', 'tap:bunny:r:46:56', 'fly:30:2', 'petals:5:6'],
    locations:      ['bunt:daisy', 'cl:r:tulips', 'cl:l:chicks', 'tap:peek:l:30:56', 'cloud:20:1', 'fly:58:2:rtl', 'petals:4:7'],
    faq:            ['rain:r', 'cl:l:nest', 'cl:r:daffs', 'pend:l:1.5:100:32:b:sky', 'peek:b:22', 'petals:5:8', 'grass'],
    schedule:       ['bunt:flag', 'cl:l:eggs', 'cl:r:basket', 'cloud:14:1:rtl', 'fly:50:2', 'spark:l:24', 'tap:egg:r:34:54', 'petals:4:9'],
    testimonials:   ['bunt:daisy', 'cl:l:mixed', 'cl:r:tulips', 'peek:b:56', 'pend:r:2.5:84:32:z:peach', 'cloud:18:1', 'fly:42:2:rtl', 'petals:3:10'],
    pricing:        ['bunt:egg', 'cl:r:daffs', 'cl:l:fence', 'pend:l:2:110:34:w:pink', 'cloud:10:1:rtl', 'fly:48:2', 'petals:5:11', 'grass'],
    contact:        ['bunt:daisy', 'cl:l:basket', 'cl:r:chicks', 'cl:r:eggs', 'tap:chick:r:30:54', 'pend:l:3:78:30:d:lilac', 'fly:36:2', 'petals:4:12', 'cloud:22:1:rtl']
  };
  var HOUSE = { bunt: { egg: 46, flag: 44, daisy: 38 } };
  var TAPS = {
    chick: ['es-chick', VB.chick, 'Peep!'], egg: ['egg', VB.egg, 'Surprise!'], bunny: ['es-bunny', VB.bunny, 'Hop to it!'], peek: ['es-peek', VB.peek, 'Peekaboo!']
  };
  var PCOLS = { pink: [P.pink, P.cream, P.yel], mint: [P.mint, P.cream, P.pink], yel: [P.yel, P.cream, P.pink], lilac: [P.lilac, P.cream, P.yel], sky: [P.sky, P.cream, P.yel], peach: [P.peach, P.cream, P.mint] };

  function section(specs, k, idx) {
    var out = '', n = 0;
    specs.forEach(function (spec) {
      var a = spec.split(':'), kind = a[0], seed = 300 + idx * 17 + (n++);
      if (kind === 'bunt') {
        out += '<svg class="es-bunt es-bunt--' + a[1] + '" width="100%" height="' + HOUSE.bunt[a[1]] + '" aria-hidden="true" focusable="false"><rect width="100%" height="100%" fill="url(#es-pat-' + a[1] + ')"/></svg>';
      } else if (kind === 'grass') {
        out += '<svg class="es-grass" width="100%" height="44" aria-hidden="true" focusable="false"><rect width="100%" height="100%" fill="url(#es-pat-grass)"/></svg>';
      } else if (kind === 'cl') {
        out += k.use('es-cl-' + a[2], 'es-cl es-cl--' + a[1] + ' es-cl--' + a[2], VB.cl);
      } else if (kind === 'pend') {
        var pc = PCOLS[a[6]] || PCOLS.pink;
        out += k.pendant(svgUse(k, 'es-h-' + a[5], VB.hang, 'color:' + pc[0] + ';--c2:' + pc[1] + ';--c3:' + pc[2]), { side: a[1], at: +a[2], len: +a[3], w: +a[4], delay: (idx % 5) + 1 });
      } else if (kind === 'fly') {
        out += spread(k.flyers(+a[2], { id: 'es-bfly', vb: VB.bfly, top: [+a[1] - 5, +a[1] + 9], size: [20, 36], dur: [26, 44], wave: 28, flap: true, colors: BFLYCOL, seed: seed, mobile: 0.5, dir: a[3] === 'rtl' ? 'rtl' : 'ltr' }), seed);
      } else if (kind === 'cloud') {
        out += spread(k.flyers(+a[2], { id: 'es-cloud', vb: VB.cloud, top: [+a[1], +a[1] + 4], size: [90, 150], dur: [70, 110], wave: 8, colors: ['#efe3ff'], seed: seed, mobile: 1, cls: 'es-cloudfly', dir: a[3] === 'rtl' ? 'rtl' : 'ltr' }), seed);
      } else if (kind === 'petals') {
        out += k.particles(+a[1], { id: ['es-petal', 'es-petal', 'es-blossom'], colors: PETALCOL, size: [10, 22], dur: [16, 30], drift: 90, sway: 28, seed: 100 + +a[2], mobile: 0.5, opacity: [0.5, 0.9] });
      } else if (kind === 'rain') {
        out += k.use('es-rain', 'es-rain es-rain--' + a[1] + ' sk-hide-m', VB.rain);
      } else if (kind === 'branch') {
        out += '<div class="es-branch-s es-branch-s--' + a[1] + ' sk-hide-m">' + k.use('es-branch', '', VB.branch) + '</div>';
      } else if (kind === 'peek') {
        out += k.use('es-peek', 'es-peekb es-peekb--' + a[1], VB.peek).replace('class="es-peekb', 'style="left:' + a[2] + '%" class="es-peekb');
      } else if (kind === 'spark') {
        out += '<div class="es-sparks es-sparks--' + a[1] + ' sk-hide-m" style="top:' + a[2] + '%">' + k.twinkles(4, { id: 'sk-sparkle', size: [9, 16], dur: [3, 6], colors: [P.yelL, P.pinkL, P.skyL, P.mintL], area: [0, 100], areaY: [0, 100], seed: seed }) + '</div>';
      } else if (kind === 'tap') {
        var t = TAPS[a[1]], inner = t[0] === 'egg' ? crackEgg(EGGCOL[idx % 6], P.cream, P.yel) : k.use(t[0], '', t[1]);
        out += k.tap(inner, t[2], 'es-tap es-tap--' + a[1] + ' sk-hide-m', (a[2] === 'l' ? 'left' : 'right') + ':0.4%;top:' + a[3] + '%;width:' + a[4] + 'px');
      }
    });
    return out;
  }

  // The meadow above the footer: lavender hills with blossom trees, a long white picket fence, four egg-shaped signs on stakes in the grass, nests, a basket and a bunny.
  var SAYINGS = ['one hop at a time', 'fresh air, fresh moves', 'grow a little each day', 'every champ starts small'];
  var TITLES = ['HOP', 'SPRING', 'BLOOM', 'EGGS'];
  function hills(k) {
    var r = k.rng(909), x, s, out = '<svg viewBox="0 0 1440 340" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">';
    var far = function (x) { return 124 + 20 * Math.sin(x / 210 + 1.2) + 9 * Math.sin(x / 70); };
    var mid = function (x) { return 196 + 8 * Math.sin(x / 260 + 0.4) + 4 * Math.sin(x / 90); };
    out += '<path d="' + hill(far, 12, 340) + '" fill="url(#es-g-far)" opacity=".92"/>';
    for (x = 10; x < 1440; x += 50 + r() * 70) { s = 56 + r() * 40; out += '<use href="#es-tree" x="' + (x - s / 2).toFixed(0) + '" y="' + (far(x) + 10 - s * 1.222).toFixed(0) + '" width="' + s.toFixed(0) + '" height="' + (s * 1.222).toFixed(0) + '" style="color:' + TREECOL[Math.floor(r() * 5)] + '"/>'; }
    out += '<path d="' + hill(mid, 12, 340) + '" fill="url(#es-g-mid)"/>';
    for (x = -30; x < 1450; x += 120) out += '<use href="#es-fence" x="' + x + '" y="188" width="120" height="80"/>';
    for (x = 20; x < 1440; x += 70 + r() * 110) { var h = 54 + r() * 30, bs = 250 + r() * 14; out += '<use href="#es-' + (r() < 0.5 ? 'tulip' : 'daff') + '" x="' + (x - h * 0.2).toFixed(0) + '" y="' + (bs - h).toFixed(0) + '" width="' + (h * 0.45).toFixed(0) + '" height="' + h.toFixed(0) + '" style="color:' + EGGCOL[Math.floor(r() * 6)] + '"/>'; }
    return out + '<rect y="290" width="1440" height="50" fill="url(#es-g-fade)" opacity=".5"/></svg>';
  }
  function footer(k) {
    var signs = SAYINGS.map(function (s, i) { return '<div class="es-sign es-sign--' + (i + 1) + '"><span>' + TITLES[i] + '</span><em>' + s + '</em></div>'; }).join('');
    return '<div class="es-hills">' + hills(k) + '</div>' +
      '<div class="es-props sk-props es-props--l">' + k.use('es-cl-daffs', 'es-i es-i--daffs', VB.cl) + k.use('es-nest', 'es-i es-i--nest', VB.nest) + '</div>' +
      '<div class="es-eggs sk-signs">' + signs + '</div>' +
      '<div class="es-props sk-props es-props--r">' + k.use('es-basket', 'es-i es-i--basket', VB.basket) + k.use('es-bunny', 'es-i es-i--bunny', VB.bunny) + k.use('es-cl-tulips', 'es-i es-i--tulips', VB.cl) + '</div>' +
      '<div class="es-ground"><svg width="100%" height="44" aria-hidden="true" focusable="false"><rect width="100%" height="100%" fill="url(#es-pat-grass)"/></svg></div>' +
      '<div class="es-lays sk-hide-m">' + eggUse(k, 'd', P.pink, P.cream, P.yel, 'es-lay es-lay--1') + eggUse(k, 'z', P.mint, P.cream, P.yel, 'es-lay es-lay--2') + eggUse(k, 'w', P.lilac, P.cream, P.pink, 'es-lay es-lay--3') + eggUse(k, 'b', P.yel, P.cream, P.pink, 'es-lay es-lay--4') + '</div>' +
      spread(k.flyers(3, { id: 'es-bfly', vb: VB.bfly, size: [24, 40], top: [20, 60], dur: [26, 40], wave: 30, flap: true, colors: BFLYCOL, seed: 920, mobile: 0.67 }), 9) +
      k.particles(7, { id: ['es-petal', 'es-petal', 'es-blossom'], colors: PETALCOL, size: [12, 22], dur: [12, 20], drift: 70, sway: 24, seed: 300, mobile: 0.5, opacity: [0.6, 0.9] });
  }

  // A tap on the egg cracks it open in confetti, a chick sends up hearts, the bunny a few too.
  function onTap(el, k) {
    var c = String(el.className || '');
    if (c.indexOf('es-tap--egg') > -1) {
      k.burst(el, { id: 'es-conf', n: 18, colors: [P.pink, P.yel, P.mint, P.sky, P.lilac, P.peach], dist: [50, 130], size: [8, 15], ms: 1000 });
      k.burst(el, { id: 'sk-dot', n: 8, colors: [P.cream, P.yelL, P.pinkL], dist: [30, 90], size: [5, 9], ms: 900 });
    } else if (c.indexOf('es-tap--chick') > -1) {
      k.burst(el, { id: 'sk-heart', n: 6, colors: [P.pinkL, P.yelL], dist: [30, 80], size: [10, 15] });
    } else if (c.indexOf('es-tap--bunny') > -1 || c.indexOf('es-tap--peek') > -1) {
      k.burst(el, { id: 'sk-heart', n: 7, colors: [P.pink, P.pinkL, '#fff6e6'], dist: [30, 85], size: [10, 16] });
    }
  }

  var T = {
    name: 'easter', prefix: 'es',
    meta: { bg: '#0f1424', gold: '#ffd86b', emoji: '🐰', tapSay: ['Hop to it!', 'Surprise!', 'Peep!', 'Peekaboo!'], sayings: SAYINGS },
    defs: DEFS,
    hero: hero,
    sections: {},
    footer: footer,
    onTap: onTap
  };
  Object.keys(SECTIONS).forEach(function (id, idx) { T.sections[id] = function (k) { return section(SECTIONS[id], k, idx); }; });
  (window.SeasonKit ? window.SeasonKit.mount : function (t) { (window.__skq = window.__skq || []).push(t); })(T);
})();
