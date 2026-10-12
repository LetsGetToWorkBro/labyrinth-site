/* Memorial Day: the homepage's scene for May 16 through May 31 (index.html's <head> turns it on from the date and loads this with season-kit.css,
   season-kit.js and season-memorial.css, which draws it). A calm, dignified dusk: deep navy and soft starlight over the hero photograph, a large flag
   waving slowly, an eagle soaring across very slowly, a few red and white petals drifting down, a field of red poppies with a row of small flags along the
   foot of the hero, a quiet layer behind every section (ribbon bows, small flags and poppies in the corners, a few stars, a swaying stem) and a field at
   dusk above the footer with four banners hung from a rail. Tap a poppy, the flag or a star and it answers, softly.
   Nothing here reads or writes anything about a visitor, and nothing is built unless the page is in the season. */
(function () {
  var C = {
    red: '#c8283a', white: '#f3f1ea', blue: '#2a4390', blueLt: '#3b58b3',
    poppy: '#d92d3a', poppyDk: '#7d1220',
    stem: '#2a5a3b', leaf: '#2f6b44', leafLt: '#4a8c5c', brass: '#d9bd6a', pole: '#cfd5e8', slate: '#8294c2', slateDk: '#5f72a6'
  };
  var PETALS = ['#d9343f', '#ff6b6b', '#e8505c', '#f3f1ea', '#ffffff', '#dfe6f7'];

  /* ── little helpers for hand-built shapes ───────────────────────────────────────────────────────────────────────────────────── */
  function r1(x) { return Math.round(x * 10) / 10; }
  function r2(x) { return Math.round(x * 100) / 100; }
  function starPts(cx, cy, R, r) {
    var p = [], i, a, d;
    for (i = 0; i < 10; i++) { a = -Math.PI / 2 + i * Math.PI / 5; d = i % 2 ? r : R; p.push([cx + d * Math.cos(a), cy + d * Math.sin(a)]); }
    return p;
  }
  function poly(p) { return 'M' + p.map(function (q) { return r2(q[0]) + ' ' + r2(q[1]); }).join('L') + 'Z'; }
  function facets(cx, cy, p) {
    var d = '', j;
    for (j = 0; j < 5; j++) d += 'M' + cx + ' ' + cy + 'L' + r2(p[2 * j][0]) + ' ' + r2(p[2 * j][1]) + 'L' + r2(p[2 * j + 1][0]) + ' ' + r2(p[2 * j + 1][1]) + 'Z';
    return d;
  }
  // A feather: a narrow rounded blade from (bx,by) pointing `deg` degrees (0 = right, 90 = down), `len` long and `w` wide.
  function blade(bx, by, deg, len, w) {
    var a = deg * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
    function P(t, s) { return r1(bx + ca * len * t - sa * w * s) + ' ' + r1(by + sa * len * t + ca * w * s); }
    return 'M' + P(0, -0.5) + 'C' + P(0.3, -0.62) + ' ' + P(0.82, -0.52) + ' ' + P(1, 0) + 'C' + P(0.82, 0.52) + ' ' + P(0.3, 0.62) + ' ' + P(0, 0.5) + 'Z';
  }
  // A ribbon with three stripes lengthwise (red edges, white, blue heart): the same centre line drawn three times, narrower each time.
  function ribbon(d, w, cap) {
    var s = ' fill="none" stroke-linejoin="round" stroke-linecap="' + (cap || 'butt') + '"';
    return '<path d="' + d + '"' + s + ' stroke="' + C.red + '" stroke-width="' + w + '"/><path d="' + d + '"' + s + ' stroke="' + C.white + '" stroke-width="' + r1(w * 0.54) + '"/><path d="' + d + '"' + s + ' stroke="' + C.blueLt + '" stroke-width="' + r1(w * 0.3) + '"/>';
  }

  /* ── the flag: 13 stripes, the blue field and its 50 stars, drawn once; waved by cutting it into strips that rise and fall in turn ── */
  var FW = 380, FH = 200, SH = FH / 13;
  var STRIPS = [18, 10, 8];
  function flagArt() {
    var white = '', red = '', stars = '', i, row, col, n, x, y, cw = FW * 0.4, ch = SH * 7;
    function band(y0, y1) { return 'M0 ' + r2(y0) + 'H' + FW + 'V' + r2(y1) + 'H0Z'; }
    for (i = 0; i < 13; i++) {
      if (i % 2) white += band(i * SH, (i + 1) * SH);
      else red += band(Math.max(0, i * SH - 0.25), Math.min(FH, (i + 1) * SH + 0.25));      // red overlaps the white a hair, so no seam shows and no pale fringe forms at the edge
    }
    for (row = 0; row < 9; row++) {
      n = row % 2 ? 5 : 6;
      for (col = 0; col < n; col++) { x = (row % 2 ? 2 + 2 * col : 1 + 2 * col) * cw / 12; y = (row + 1) * ch / 10; stars += poly(starPts(x, y, 5.2, 2.2)); }
    }
    return '<g id="md-flagart"><path d="' + white + '" fill="' + C.white + '"/><path d="' + red + '" fill="' + C.red + '"/>' +
      '<rect width="' + cw + '" height="' + r2(ch) + '" fill="' + C.blue + '"/><path d="' + stars + '" fill="' + C.white + '"/></g>';
  }
  function stripClips() {
    var out = '';
    STRIPS.forEach(function (N) {
      var w = FW / N, i;
      for (i = 0; i < N; i++) out += '<clipPath id="md-fc' + N + '-' + i + '"><rect x="' + r2(i * w) + '" y="-40" width="' + r2(w + 0.8) + '" height="290"/></clipPath>';
    });
    return out;
  }
  // The flag on its pole as an inline <svg>: N strips of cloth. Each strip rises and falls a little after the one before it, so a slow ripple runs from the pole to
  // the free end; each also tilts to follow the slope of the wave (a quarter beat ahead of its rise), which keeps the edges smooth, and a soft shade deepens and
  // eases with the slope. Rise and tilt are two nested groups because each animates `transform` (Chromium does not repaint animated individual `translate` on SVG parts).
  // o.amp is how far the free end rises, o.T the seconds for one swell, o.shade how strong the shade is, o.fade lets the pole dissolve.
  function flagSvg(cls, N, poleLen, o) {
    o = o || {};
    var pw = o.pole || 5, w = FW / N, amp = o.amp == null ? 8 : o.amp, T = o.T || 3.6, P = 2 * T, kw = 2 * Math.PI * 1.25 / FW, sk = o.shade == null ? 1 : o.shade, u0 = 0.4, s = '', i, t, xc, a, lag, ph, y0, ks, k0, lo, hi, s0, deg = 180 / Math.PI;
    for (i = 0; i < N; i++) {
      xc = (i + 0.5) * w; t = xc / FW; a = amp * (0.12 + 0.88 * t); lag = 1.25 * t * P;
      ph = u0 - kw * xc; y0 = -a * Math.cos(ph); ks = Math.atan(a * kw) * deg; k0 = Math.atan(-a * kw * Math.sin(ph)) * deg;
      lo = 0.02; hi = 0.02 + 0.22 * sk; s0 = (lo + hi) / 2 + (hi - lo) / 2 * Math.sin(ph);
      s += '<g class="md-wp" style="--ya:' + r2(-a) + 'px;--yb:' + r2(a) + 'px;--y0:' + r2(y0) + 'px;--o:' + r2(lag - 2 * P) + 's">' +
        '<g class="md-wk" style="--xc:' + r2(xc) + 'px;--ka:' + r2(-ks) + 'deg;--kb:' + r2(ks) + 'deg;--k0:' + r2(k0) + 'deg;--os:' + r2(lag + T / 2 - 2 * P) + 's">' +
        '<use href="#md-flagart" clip-path="url(#md-fc' + N + '-' + i + ')"/>' +
        '<rect class="md-wsh" x="' + r2(i * w) + '" y="0" width="' + r2(w) + '" height="' + FH + '" style="--o:' + r2(lag - T / 2 - 2 * P) + 's;--sa:' + lo + ';--sb:' + r2(hi) + ';--s0:' + r2(s0) + '"/></g></g>';
    }
    return '<svg class="' + cls + '" viewBox="-16 -36 408 ' + (36 + FH + 14 + poleLen) + '" aria-hidden="true" focusable="false" style="--d:' + T + 's">' +
      '<rect x="' + -pw + '" y="-14" width="' + pw + '" height="' + (14 + FH + 14 + poleLen) + '" rx="' + pw / 2 + '" fill="url(#' + (o.fade ? 'md-polefade' : 'md-pole') + ')"/>' +
      '<circle cx="' + -pw / 2 + '" cy="-17" r="' + r1(7 + (pw - 5) * 0.7) + '" fill="' + C.brass + '"/><circle cx="' + r1(-pw / 2 - 2.3) + '" cy="-19.6" r="2.3" fill="#fff3c4"/>' + s + '</svg>';
  }

  /* ── the poppy: four crinkled petals round a dark heart. Built once as a bloom (centred on 0,0) and reused on stems, in wreaths and on strings ── */
  function bloom() {
    var cols = ['#d92d3a', '#c32534', '#e0343f', '#cc2a38'], s = '<g id="md-bloom">', i, a;
    [-45, 45, 135, 225].forEach(function (deg, j) {
      s += '<g transform="rotate(' + deg + ')"><use href="#md-pet" fill="' + cols[j] + '" stroke="' + C.poppyDk + '" stroke-opacity=".38" stroke-width="1"/>' +
        '<path d="M-9 -24C-4 -29 4 -29 9 -24" fill="none" stroke="#ff9a9a" stroke-opacity=".6" stroke-width="1.7" stroke-linecap="round"/>' +
        '<path d="M-3 -7C-5 -13 -5 -18 -4 -22M4 -7C5 -12 6 -17 5 -21" fill="none" stroke="' + C.poppyDk + '" stroke-opacity=".45" stroke-width="1" stroke-linecap="round"/></g>';
    });
    s += '<circle r="12.5" fill="' + C.poppyDk + '" opacity=".5"/><circle r="6.6" fill="#1d0f24"/>';
    for (i = 0; i < 10; i++) { a = i * Math.PI / 5; s += '<circle cx="' + r1(9.6 * Math.cos(a)) + '" cy="' + r1(9.6 * Math.sin(a)) + '" r="1.25" fill="#3d2849"/>'; }
    return s + '<circle r="2.3" fill="#4b3358"/></g>';
  }
  // A lighter bloom for the small, distant poppies of a field (about a third of the shapes): four petals round a dark heart, the stamens as one dotted ring.
  function bloomLite() {
    var cols = ['#d92d3a', '#c32534', '#e0343f', '#cc2a38'], s = '<g id="md-bloomlite">';
    [-45, 45, 135, 225].forEach(function (deg, j) { s += '<use href="#md-pet" fill="' + cols[j] + '" stroke="' + C.poppyDk + '" stroke-opacity=".4" stroke-width="1.2" transform="rotate(' + deg + ')"/>'; });
    return s + '<circle r="12" fill="' + C.poppyDk + '" opacity=".5"/><circle r="6.8" fill="#1d0f24"/><circle r="9.6" fill="none" stroke="#3d2849" stroke-width="2.2" stroke-dasharray="1.3 4.7"/></g>';
  }
  // The same flower seen from the side: a cup with its dark mouth and a few stamens.
  function bloomSide() {
    return '<g id="md-bloomside"><path d="M-27 6C-31 -10 -19 -24 0 -24C19 -24 31 -10 27 6C23 16 -23 16 -27 6Z" fill="#b5222f"/>' +
      '<ellipse cx="0" cy="-17" rx="15.5" ry="5.4" fill="#1d0f24"/><path d="M-9 -19L-7 -25M-3 -20L-2 -27M4 -20L5 -26M10 -19L12 -24" stroke="#3d2849" stroke-width="1.3" stroke-linecap="round"/>' +
      '<path d="M-27 6C-31 -8 -23 -18 -15 -15C-8 -11 -8 6 -12 15C-20 15 -25 11 -27 6Z" fill="#d92d3a"/><path d="M27 6C31 -8 23 -18 15 -15C8 -11 8 6 12 15C20 15 25 11 27 6Z" fill="#cc2a38"/>' +
      '<path d="M-3 -11C-5 -2 -4 7 -1 14M4 -11C6 -2 6 7 3 14" fill="none" stroke="' + C.poppyDk + '" stroke-opacity=".45" stroke-width="1.1" stroke-linecap="round"/>' +
      '<path d="M-22 -4C-19 -12 -14 -14 -10 -13M22 -4C19 -12 14 -14 10 -13" fill="none" stroke="#ff9a9a" stroke-opacity=".55" stroke-width="1.6" stroke-linecap="round"/></g>';
  }
  function leaf(d, c) { return '<path d="' + d + '" fill="' + (c || C.leaf) + '"/>'; }

  /* ── a small flag on a short pole: the cloth is cut into 7 stripes that follow one gentle wave ── */
  function smallFlag() {
    var x0 = 10.2, w = 36, y0 = 8, h = 26, amp = 2.6, N = 9, i, k, s = '';
    function dy(x) { var t = (x - x0) / w; return amp * Math.sin(t * Math.PI * 2.1 + 0.5) * (0.25 + 0.75 * t); }
    function band(xa, xb, ya, yb) {
      var top = [], bot = [];
      for (i = 0; i <= N; i++) { var x = xa + (xb - xa) * i / N; top.push([x, ya + dy(x)]); bot.push([x, yb + dy(x)]); }
      return poly(top.concat(bot.reverse()));
    }
    var red = '';
    for (k = 0; k < 7; k += 2) red += band(x0, x0 + w, y0 + k * h / 7, y0 + (k + 1) * h / 7);
    var dots = '', cw = w * 0.42, ch = h * 4 / 7;
    [[0.2, 0.28], [0.5, 0.28], [0.8, 0.28], [0.35, 0.68], [0.65, 0.68]].forEach(function (d) { var x = x0 + cw * d[0]; dots += '<circle cx="' + r1(x) + '" cy="' + r1(y0 + ch * d[1] + dy(x)) + '" r="1"/>'; });
    s = '<rect x="7" y="4" width="3.2" height="96" rx="1.6" fill="' + C.pole + '"/><rect x="8.7" y="4" width="1.5" height="96" fill="#7f8aae" opacity=".6"/>' +
      '<circle cx="8.6" cy="3.6" r="3.5" fill="' + C.brass + '"/><circle cx="7.6" cy="2.6" r="1.1" fill="#fff3c4"/>' +
      '<path d="' + band(x0, x0 + w, y0, y0 + h) + '" fill="' + C.white + '"/><path d="' + red + '" fill="' + C.red + '"/>' +
      '<path d="' + band(x0, x0 + w * 0.42, y0, y0 + h * 4 / 7) + '" fill="' + C.blue + '"/><g fill="' + C.white + '">' + dots + '</g>';
    return s;
  }

  /* ── the ribbon bow: loops and tails of a red, white and blue ribbon, tied with a small knot ── */
  function bowGroup() {
    return '<g id="md-bowg">' +
      '<g clip-path="url(#md-bowtl)">' + ribbon('M47 52C42 74 36 94 30 118', 16) + '</g><g clip-path="url(#md-bowtr)">' + ribbon('M53 52C58 74 64 94 70 118', 16) + '</g>' +
      ribbon('M50 46C42 24 15 12 10 31C6 51 32 57 50 46', 16, 'round') + ribbon('M50 46C58 24 85 12 90 31C94 51 68 57 50 46', 16, 'round') +
      '<rect x="40" y="36" width="20" height="20" rx="6" fill="' + C.red + '"/><rect x="43" y="39" width="14" height="14" rx="4" fill="' + C.white + '"/><rect x="46.5" y="42.5" width="7" height="7" rx="2" fill="' + C.blueLt + '"/></g>';
  }

  /* ── the eagle: wings spread, the fingered tips of its feathers, a white head and tail. Drawn on a 320 by 140 sheet, centred on x = 160 ── */
  function eagleWing() {
    var s = '';
    // trailing edge first (the shorter secondary feathers), then the long primaries over them, then the shoulder and its highlight
    [[178, 74, 97, 29, 16], [190, 73, 91, 30, 16], [202, 72, 85, 29, 16], [213, 70, 78, 27, 15], [222, 66, 70, 25, 14]].forEach(function (f) { s += '<path d="' + blade(f[0], f[1], f[2], f[3], f[4]) + '" fill="' + C.slateDk + '"/>'; });
    [[236, 34, -12, 78, 11.5], [234, 41, -3, 80, 12.5], [231, 48, 6, 78, 12.5], [226, 55, 16, 70, 12.5], [219, 62, 28, 60, 12.5], [210, 68, 42, 50, 12]].forEach(function (f, j) {
      s += '<path d="' + blade(f[0], f[1], f[2], f[3], f[4]) + '" fill="' + (j % 2 ? C.slateDk : C.slate) + '"/>';
    });
    s += '<path d="M164 52C186 40 212 33 238 30L242 62L214 72L180 80L164 78Z" fill="' + C.slate + '"/>' +
      '<path d="M170 55C190 45 212 39 236 36L234 51C214 53 192 59 172 67Z" fill="#9fb0da"/>' +
      '<path d="M166 52C188 40 214 32 238 30C262 28 290 22 312 18" fill="none" stroke="#c4d0ee" stroke-width="2.2" stroke-linecap="round"/>' +
      '<path d="M246 40L300 30M246 48L304 48M242 55L292 66M236 62L272 84" fill="none" stroke="' + C.slateDk + '" stroke-opacity=".5" stroke-width="1.3" stroke-linecap="round"/>';
    return s;
  }
  function eagle() {
    var s = '<symbol id="md-eagle" viewBox="0 0 320 140">', j;
    for (j = 0; j < 5; j++) s += '<path d="' + blade(160 + (j - 2) * 4, 88, 60 + j * 15, 44, 15) + '" fill="' + (j % 2 ? C.white : '#e1e6f3') + '"/>';
    s += '<g>' + eagleWing() + '</g><g transform="translate(320 0) scale(-1 1)">' + eagleWing() + '</g>' +
      '<path d="M160 42C169 42 173 52 173 64C173 78 169 92 165 99L155 99C151 92 147 78 147 64C147 52 151 42 160 42Z" fill="#6b7fb2"/>' +
      '<path d="M160 44C166 46 169 54 169 64C169 76 166 88 163 96C165 86 164 70 160 44Z" fill="#8294c2"/>' +
      '<path d="M152 49C150 40 155 31 164 31C172 31 176 38 173 45C170 51 160 53 152 49Z" fill="' + C.white + '"/>' +
      '<path d="M171 37C180 36 187 40 186 47C183 44 178 44 174 45Z" fill="#e8c25a"/><path d="M174 45C178 44 183 44 186 47" fill="none" stroke="#b8902a" stroke-width="1"/>' +
      '<circle cx="166.5" cy="38" r="1.7" fill="#16203f"/><path d="M163.6 35.2L169 36.2" stroke="#16203f" stroke-opacity=".7" stroke-width=".9" stroke-linecap="round"/>' +
      '</symbol>';
    return s;
  }

  /* ── a wreath of laurel leaves and poppies with a ribbon bow, on its own, and standing on an easel ── */
  function wreathGroup() {
    var s = '<g id="md-wreathg">', i, N = 28, a, rad, x, y, R = 45;
    for (i = 0; i < N; i++) {
      a = i * 360 / N - 90; rad = a * Math.PI / 180; x = 70 + R * Math.cos(rad); y = 68 + R * Math.sin(rad);
      s += '<g transform="translate(' + r1(x) + ' ' + r1(y) + ') rotate(' + r1(a + 90 + (i % 2 ? 32 : -32)) + ')"><path d="M0 0C6 -6 15 -5 21 0C15 6 6 6 0 0Z" fill="' + (i % 3 ? C.leaf : C.leafLt) + '"/><path d="M2 0H17" stroke="#163a26" stroke-opacity=".5" stroke-width="1"/></g>';
    }
    for (i = 0; i < 14; i++) {
      a = i * 360 / 14 - 82; rad = a * Math.PI / 180; x = 70 + (R - 6) * Math.cos(rad); y = 68 + (R - 6) * Math.sin(rad);
      s += '<g transform="translate(' + r1(x) + ' ' + r1(y) + ') rotate(' + r1(a + 90 - (i % 2 ? 40 : -40)) + ')"><path d="M0 0C5 -5 12 -4 16 0C12 4 5 5 0 0Z" fill="' + C.leafLt + '"/></g>';
    }
    [-62, -18, 30, 150, 205, 250].forEach(function (deg, j) {
      var q = deg * Math.PI / 180;
      s += '<use href="#md-bloom" transform="translate(' + r1(70 + (R - 3) * Math.cos(q)) + ' ' + r1(68 + (R - 3) * Math.sin(q)) + ') scale(' + (j % 2 ? 0.3 : 0.36) + ') rotate(' + (j * 37) + ')"/>';
    });
    return s + '<use href="#md-bowg" transform="translate(48 100) scale(.44)"/></g>';
  }

  // A bare tall poppy: a long, slightly bowed stem, leaves, a nodding bud on a side shoot and the flower on top.
  function stemTall() {
    return '<symbol id="md-stemtall" viewBox="0 0 70 240"><path d="M35 240C32 200 40 160 36 120C33 90 40 70 38 52" fill="none" stroke="' + C.stem + '" stroke-width="3.6" stroke-linecap="round"/>' +
      '<path d="M37 132C46 120 52 112 53 98" fill="none" stroke="' + C.stem + '" stroke-width="2.6" stroke-linecap="round"/>' +
      '<path d="M45 96C44 86 58 84 60 94C61 104 54 110 53 110C50 108 45 102 45 96Z" fill="' + C.leafLt + '"/><path d="M53 109C56 106 59 101 60 94C61 103 58 109 53 109Z" fill="' + C.red + '"/>' +
      leaf('M35 196C24 190 13 180 9 166C21 168 31 178 35 196Z') + leaf('M37.5 160C48 156 58 148 62 134C50 134 41 144 37.5 160Z', C.leafLt) + leaf('M35 224C27 222 19 216 15 207C24 208 31 214 35 224Z') +
      '<use href="#md-bloom" transform="translate(39 33) scale(.92)"/></symbol>';
  }

  var DEFS = (function () {
    var s = '', i, a, ang, blades = '';
    // the flag and its cloth strips, the poles, the pole shading
    s += flagArt() + stripClips() +
      '<linearGradient id="md-pole" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8f9ac0"/><stop offset=".45" stop-color="#e9edf8"/><stop offset="1" stop-color="#7a86ac"/></linearGradient>' +
      '<linearGradient id="md-polefade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e3e8f6"/><stop offset=".5" stop-color="#b9c3df" stop-opacity=".85"/><stop offset="1" stop-color="#9aa6cb" stop-opacity="0"/></linearGradient>' +
      '<clipPath id="md-bowtl"><path clip-rule="evenodd" d="M0 0H100V130H0Z M22 128L30 104L38 128Z"/></clipPath><clipPath id="md-bowtr"><path clip-rule="evenodd" d="M0 0H100V130H0Z M62 128L70 104L78 128Z"/></clipPath>';
    // a five pointed star with a lit side, and one petal
    var sp = starPts(12, 13, 11.2, 4.9);
    s += '<symbol id="md-star" viewBox="0 0 24 25"><path d="' + poly(sp) + '" fill="currentColor" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/><path d="' + facets(12, 13, sp) + '" fill="#fff" fill-opacity=".34"/></symbol>' +
      '<symbol id="md-petal" viewBox="0 0 24 32"><path d="M12 1C21 7 23 19 17 27C14 31 10 31 7 27C1 19 3 7 12 1Z" fill="currentColor"/><path d="M12 5C13 13 13 21 12 28" fill="none" stroke="#000" stroke-opacity=".16" stroke-width="1.2" stroke-linecap="round"/></symbol>';
    // the flower, its petal, and the plants that carry it
    s += '<path id="md-pet" d="M0 3C-10 2 -18 -7 -16 -17C-14 -26 -6 -30 0 -27C6 -30 14 -26 16 -17C18 -7 10 2 0 3Z"/>' + bloom() + bloomSide();
    s += bloomLite() + '<symbol id="md-poppyl" viewBox="0 0 64 128"><path d="M32 54C30 76 35 100 32 128" fill="none" stroke="' + C.stem + '" stroke-width="3.6" stroke-linecap="round"/>' +
        leaf('M32 104C23 102 13 94 8 82C19 84 28 92 32 104Z') + '<use href="#md-bloomlite" transform="translate(32 30)"/></symbol>' +
      '<symbol id="md-poppybl" viewBox="0 0 64 128"><path d="M32 40C34 70 30 100 32 128" fill="none" stroke="' + C.stem + '" stroke-width="3.6" stroke-linecap="round"/>' +
        leaf('M32 110C41 108 51 100 56 88C45 90 36 98 32 110Z', C.leafLt) + '<path d="M5 34C1 18 14 4 32 4C50 4 63 18 59 34C55 44 9 44 5 34Z" fill="#c32534"/><ellipse cx="32" cy="12" rx="15" ry="5.4" fill="#1d0f24"/><path d="M5 34C1 20 9 10 17 14C23 18 23 36 19 44C11 44 7 40 5 34Z" fill="#d92d3a"/></symbol>';
    s += '<symbol id="md-head" viewBox="0 0 64 64"><use href="#md-bloom" transform="translate(32 32)"/></symbol>' +
      '<symbol id="md-poppy" viewBox="0 0 64 128"><path d="M32 54C30 76 35 100 32 128" fill="none" stroke="' + C.stem + '" stroke-width="3.4" stroke-linecap="round"/>' +
        leaf('M32 104C23 102 13 94 8 82C19 84 28 92 32 104Z') + leaf('M32.5 88C41 86 50 78 54 66C44 68 35 76 32.5 88Z', C.leafLt) + '<use href="#md-bloom" transform="translate(32 30)"/></symbol>' +
      '<symbol id="md-poppyb" viewBox="0 0 64 128"><path d="M32 40C34 70 30 100 32 128" fill="none" stroke="' + C.stem + '" stroke-width="3.4" stroke-linecap="round"/>' +
        leaf('M32 110C41 108 51 100 56 88C45 90 36 98 32 110Z', C.leafLt) + leaf('M31.5 92C23 90 14 82 10 70C20 72 28 80 31.5 92Z') + '<use href="#md-bloomside" transform="translate(32 28)"/></symbol>' +
      '<symbol id="md-bud" viewBox="0 0 64 128"><path d="M32 128C34 100 30 70 33 52C35 38 46 34 46 44" fill="none" stroke="' + C.stem + '" stroke-width="3.2" stroke-linecap="round"/>' +
        leaf('M32 104C23 102 14 94 10 82C20 84 28 92 32 104Z') + leaf('M33 84C41 82 49 76 52 66C43 68 36 74 33 84Z', C.leafLt) +
        '<path d="M37 52C36 42 56 40 56 52C56 63 46 72 46 72C46 72 37 63 37 52Z" fill="' + C.leafLt + '"/><path d="M46 72C52 66 56 60 56 52C56 60 52 68 46 72Z" fill="' + C.red + '"/><path d="M42 48C42 54 44 62 46 70" fill="none" stroke="#163a26" stroke-opacity=".4" stroke-width="1"/></symbol>' +
      '<symbol id="md-flagsm" viewBox="0 0 52 100">' + smallFlag() + '</symbol>' + stemTall();
    // clumps of grass for the front of the field
    for (i = 0; i < 9; i++) {
      a = 6 + i * 9.5; ang = (i - 4) * 5.5;
      blades += 'M' + r1(a - 3) + ' 60C' + r1(a - 2) + ' ' + (46 - (i % 3) * 3) + ' ' + r1(a + ang * 0.35) + ' ' + (30 - (i % 4) * 3) + ' ' + r1(a + ang) + ' ' + (12 + ((i * 7) % 12)) + 'C' + r1(a + ang * 0.6 + 4) + ' ' + (32 - (i % 3) * 2) + ' ' + r1(a + 4) + ' 46 ' + r1(a + 3) + ' 60Z';
    }
    s += '<symbol id="md-grass" viewBox="0 0 96 60"><path d="' + blades + '" fill="#16301f"/></symbol>';
    s += eagle() + bowGroup();
    s += '<symbol id="md-bow" viewBox="0 4 100 118"><use href="#md-bowg"/></symbol>';
    s += wreathGroup() + '<symbol id="md-wreath" viewBox="0 0 140 156"><use href="#md-wreathg"/></symbol>';
    s += '<symbol id="md-wreathstand" viewBox="0 0 140 214"><path d="M52 118L30 212M88 118L110 212M46 168H94" fill="none" stroke="#51412f" stroke-width="5" stroke-linecap="round"/><path d="M54 118L32 212M90 118L112 212" fill="none" stroke="#7a6446" stroke-width="1.6" stroke-linecap="round" opacity=".7"/><use href="#md-wreathg"/></symbol>';
    return s;
  })();

  /* ── the field: rows of poppies and a row of small flags, each row a little darker and smaller the further it is ──────────────────────────────────
     Built as a stack of <svg> layers the size of the field (static ground bands between the rows, then the plants of each row split over two layers, then the flags, then the
     grass). A layer leans a little from side to side (a skew about its base, which moves every head by its height whatever its place along the row), each in its own time:
     a transform animation on a layer is composited, so the sway costs no repainting. */
  function field(k, o) {
    var r = k.rng(o.seed), W = 1440, plain = ['md-poppy', 'md-poppy', 'md-poppy', 'md-poppyb', 'md-bud'], lite = ['md-poppyl', 'md-poppyl', 'md-poppyl', 'md-poppybl', 'md-bud'], x, out = '';
    function layer(inner, cls, style) { return '<svg class="md-fl' + (cls ? ' ' + cls : '') + '" viewBox="0 0 ' + W + ' ' + o.h + '" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false"' + (style ? ' style="' + style + '"' : '') + '>' + inner + '</svg>'; }
    function lean() { return '--a:' + r1(0.8 + r() * 1.1) + 'deg;--d:' + r1(8 + r() * 5) + 's;--o:-' + r1(r() * 11) + 's'; }
    o.rows.forEach(function (row) {
      var kinds = row.lite ? lite : plain, sets = ['', ''], flags = ['', ''], cnt = 0, set = 0, fset = 0, nextFlag = row.flagEvery ? row.flagEvery * (0.4 + r() * 0.5) : 1e9, w, base, tilt;
      x = -20 + r() * 20;
      while (x < W + 20) {
        w = row.w[0] + r() * (row.w[1] - row.w[0]); base = row.base + (r() - 0.5) * row.jit; tilt = (r() - 0.5) * 12;
        if (row.tall && r() < row.tall) w *= 1.5;                                  // now and then one stands taller than the rest
        sets[set] += '<use href="#' + kinds[Math.floor(r() * kinds.length)] + '" x="' + r1(x) + '" y="' + r1(base - w * 2) + '" width="' + r1(w) + '" height="' + r1(w * 2) + '" transform="rotate(' + r1(tilt) + ' ' + r1(x + w / 2) + ' ' + r1(base) + ')"/>';
        x += row.gap[0] + r() * (row.gap[1] - row.gap[0]);
        if (++cnt % row.clump === 0) {
          set = 1 - set;
          if (x >= nextFlag && row.flagW) {
            w = row.flagW[0] + r() * (row.flagW[1] - row.flagW[0]); base = row.base + (r() - 0.5) * row.jit * 0.6;
            flags[fset] += '<use href="#md-flagsm" x="' + r1(x) + '" y="' + r1(base - w * 1.92) + '" width="' + r1(w) + '" height="' + r1(w * 1.92) + '"/>';
            fset = 1 - fset; x += w * 0.6; nextFlag = x + row.flagEvery * (0.75 + r() * 0.5);
          }
        }
      }
      out += layer(row.ground || '');
      sets.forEach(function (st) { if (st) out += layer('<g' + (row.op < 1 ? ' opacity="' + row.op + '"' : '') + '>' + st + '</g>', 'md-sk', lean()); });
      flags.forEach(function (fl) { if (fl) out += layer(fl, 'md-sk', lean()); });
    });
    if (o.grass) {
      var g = '';
      for (x = -10; x < W; x += 56 + r() * 44) g += '<use href="#md-grass" x="' + r1(x) + '" y="' + r1(o.h - 40 - r() * 12) + '" width="' + r1(78 + r() * 34) + '" height="' + r1(50 + r() * 14) + '"/>';
      out += layer(g);
    }
    return out;
  }
  var HERO_FIELD = { seed: 7, h: 240, grass: true, rows: [
    { ground: '<path d="M0 120Q240 98 480 114T960 108T1440 116V240H0Z" fill="#0b1a3c"/><path d="M0 120Q240 98 480 114T960 108T1440 116" fill="none" stroke="#ff9a8a" stroke-opacity=".2" stroke-width="2"/>', base: 152, jit: 16, w: [20, 28], gap: [22, 38], clump: 7, op: 0.45, tall: 0.12, lite: true },
    { ground: '<path d="M0 158Q200 144 420 154T860 150T1440 156V240H0Z" fill="#0a1632"/>', base: 190, jit: 20, w: [28, 42], gap: [40, 64], clump: 6, op: 0.92, tall: 0.14, lite: true, flagEvery: 175, flagW: [48, 58] },
    { ground: '<path d="M0 200Q260 186 520 196T1040 192T1440 198V240H0Z" fill="#070d1c"/>', base: 246, jit: 14, w: [44, 66], gap: [84, 134], clump: 3, op: 1, tall: 0.1 }
  ] };
  var FOOT_BACK = { seed: 23, h: 150, rows: [
    { ground: '<path d="M0 50Q240 36 480 48T960 42T1440 50V150H0Z" fill="#0b1a3c"/>', base: 78, jit: 10, w: [20, 28], gap: [34, 52], clump: 7, op: 0.5, lite: true },
    { ground: '<path d="M0 82Q200 70 420 80T860 76T1440 82V150H0Z" fill="#0a1632"/>', base: 112, jit: 14, w: [26, 38], gap: [46, 70], clump: 5, op: 1, tall: 0.12, lite: true, flagEvery: 150, flagW: [34, 42] }
  ] };
  var FOOT_FRONT = { seed: 41, h: 150, grass: true, rows: [
    { ground: '<path d="M0 126Q260 114 520 124T1040 120T1440 126V150H0Z" fill="#050a16"/>', base: 160, jit: 10, w: [34, 50], gap: [100, 160], clump: 3, op: 1 }
  ] };

  // A far line of low hills and trees for the foot scene.
  function hills(k) {
    var r = k.rng(9), x = 0, d = 'M0 78Q180 52 360 70T720 62T1080 72T1440 58V120H0Z', e = 'M0 100';
    while (x < 1440) { var dx = 26 + r() * 40, h = 10 + r() * 16; e += 'Q' + r1(x + dx / 2) + ' ' + r1(98 - h) + ' ' + r1(x + dx) + ' 100'; x += dx; }
    e += 'V120H0Z';
    return '<svg viewBox="0 0 1440 120" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="' + d + '" fill="#121f4a" opacity=".55"/><path d="' + e + '" fill="#0c1738" opacity=".9"/></svg>';
  }

  /* ── the hero: the dusk glow, stars, a flag on a tall pole, an eagle, petals, the field, and a poppy, the flag and a star that answer a tap ── */
  // Each tap has its words and two drawings: the one in the hero's field (a poppy on its stem, a flag on a tall pole) and a compact one for the margins of a section.
  var TAPS = {
    poppy: { say: 'We remember', hero: function (k) { return k.use('md-poppy', '', '0 0 64 128'); }, sec: function (k) { return k.use('md-head', '', '0 0 64 64'); } },
    flag: { say: 'Honor', hero: function () { return flagSvg('', 8, 500, { T: 3.4, amp: 6, shade: 0.55, pole: 8 }); }, sec: function () { return flagSvg('', 8, 110, { T: 3.4, amp: 6, shade: 0.55, pole: 9 }); } },
    star: { say: 'Thank you', hero: function (k) { return k.use('md-star', '', '0 0 24 25'); }, sec: function (k) { return k.use('md-star', '', '0 0 24 25'); } }
  };
  function hero(k) {
    return '<div class="md-dusk"></div>' +
      k.twinkles(8, { id: ['md-star', 'sk-sparkle'], size: [6, 13], dur: [5, 9], colors: ['#f3f1ea', '#cdd8f2', '#ffe9b8'], area: [3, 97], areaY: [13, 26], seed: 21, mobile: 0.5, cls: 'md-tw' }) +
      k.twinkles(5, { id: ['md-star', 'sk-sparkle'], size: [6, 12], dur: [5, 9], colors: ['#f3f1ea', '#cdd8f2'], area: [82, 98], areaY: [26, 62], seed: 22, mobile: 0.4, cls: 'md-tw' }) +
      k.twinkles(4, { id: ['md-star', 'sk-sparkle'], size: [6, 11], dur: [5, 9], colors: ['#f3f1ea', '#ffe9b8'], area: [1, 7], areaY: [32, 70], seed: 23, mobile: 0.5, cls: 'md-tw' }) +
      k.flyers(1, { id: 'md-eagle', vb: '0 0 320 140', size: [150, 176], dur: [92, 96], top: [13, 15], wave: 14, seed: 4, cls: 'md-eagle md-eagle--h' }) +
      flagSvg('md-bigflag', 18, 520, { fade: true, T: 3.8, amp: 9 }) +
      k.particles(16, { id: 'md-petal', vb: '0 0 24 32', colors: PETALS, size: [10, 20], dur: [20, 34], drift: 90, sway: 28, spin: 0.35, seed: 31, mobile: 0.5, opacity: [0.5, 0.85] }) +
      '<div class="md-field">' + field(k, HERO_FIELD) + '</div>' +
      k.tap(TAPS.flag.hero(k), TAPS.flag.say, 'md-t md-t-flag md-bl', 'left:2.2%;bottom:5px;width:clamp(44px,5vw,68px)') +
      k.tap(TAPS.poppy.hero(k), TAPS.poppy.say, 'md-t md-t-poppy md-br', 'right:3.4%;bottom:3px;width:clamp(32px,4vw,54px)') +
      k.tap(TAPS.star.hero(k), TAPS.star.say, 'md-t md-t-star md-bl', 'left:1.4%;top:23%;width:clamp(26px,3vw,40px)');
  }

  /* ── a layer behind each section, different on every one so the page does not repeat itself ──────────────────────────────────
     glow:<corner>:<tone>   top:<style>   bow:<side>:<at%>:<string px>:<width px>   pend:<kind>:<side>:<at%>:<string px>:<width px>   pile:<side>:<things>
     stem:<side>:<at%>:<width px>   flagpole:<side>:<width px>   stars:<side>:<top px>:<n>:<seed>   petals:<n>:<seed>   eagle:<top px>:<dir>:<seed>
     wreath:<side>:<top px>:<width px>:<offset %>   tap:<kind>:<side>:<top px>:<offset %>:<width px>
     A tap has to sit beyond the page's content box (x < 40 or x > 1240 at 1280px wide), or that box takes its clicks: so a tap on the edge is at most 36px wide (the kit
     hides these below 1280px), and a section with a narrow column, like the FAQ, can hold a bigger one in its wide margin. */
  var SECTIONS = {
    eventStrip:     ['glow:tr:red', 'bow:r:4:36:40', 'pile:l:flag,poppy,bud', 'stars:r:40:4:1', 'petals:4:1', 'tap:star:r:96:0.3:34'],
    programs:       ['top:bunting', 'glow:tl:blue', 'stem:l:0.6:46', 'pend:star:r:3:96:30', 'petals:5:2', 'eagle:46:ltr:1', 'pile:r:poppy,flag'],
    competition:    ['top:stars', 'glow:br:red', 'pile:r:poppy,flag,bloom', 'pend:head:l:2:80:34', 'stars:r:60:4:2', 'petals:4:3'],
    coaches:        ['top:ribbon', 'stem:r:0.6:46', 'pile:l:bud,flag', 'tap:poppy:r:104:0.3:36', 'stars:l:70:2:3', 'petals:4:4', 'glow:tl:white'],
    gallery:        ['top:swag', 'wreath:l:-36:140:-3', 'pile:r:flag,poppy', 'pend:star:r:5:70:26', 'petals:3:5', 'glow:bl:blue'],
    'belt-journey': ['top:bunting', 'stem:r:0.8:42', 'pend:star:l:2:92:28', 'tap:star:r:150:0.3:34', 'pile:l:poppy,bloom,flag', 'petals:5:6', 'glow:br:blue'],
    locations:      ['top:stars', 'flagpole:l:72', 'pile:r:poppy,bud', 'stars:r:50:4:4', 'pend:head:r:3:100:32', 'petals:4:7'],
    faq:            ['top:ribbon', 'wreath:r:200:130:7', 'stem:l:3:50', 'bow:l:6:60:44', 'stars:r:90:3:5', 'petals:4:8', 'tap:flag:l:360:8:62'],
    schedule:       ['top:swag', 'pile:l:flag,poppy,flag', 'pend:star:r:2:84:30', 'stars:r:50:4:6', 'petals:4:9', 'glow:tr:blue'],
    testimonials:   ['top:bunting', 'bow:r:3:50:46', 'pile:r:bud,poppy,flag', 'stars:r:56:4:7', 'petals:3:10', 'glow:bl:red'],
    pricing:        ['top:ribbon', 'stem:r:0.6:44', 'flagpole:l:66', 'pend:head:l:12:74:30', 'petals:5:11', 'eagle:50:ltr:3', 'stars:r:80:3:8'],
    contact:        ['top:stars', 'pile:l:poppy,flag,poppy', 'pile:r:flag,poppy,bud', 'bow:r:5:70:42', 'stars:l:80:3:9', 'petals:4:12', 'glow:tl:red']
  };
  var ITEMS = { poppy: ['md-poppy', '0 0 64 128'], bloom: ['md-poppyb', '0 0 64 128'], bud: ['md-bud', '0 0 64 128'], flag: ['md-flagsm', '0 0 52 100'] };
  var PENDS = { star: ['md-star', '0 0 24 25', 'md-pst'], head: ['md-head', '0 0 64 64', 'md-phd'] };

  function section(specs, k) {
    var out = '';
    specs.forEach(function (spec) {
      var a = spec.split(':'), kind = a[0], side = a[1], t, bits;
      if (kind === 'glow') {
        out += '<div class="md-glow md-glow--' + a[1] + ' md-glow--' + a[2] + '"></div>';
      } else if (kind === 'top') {
        out += '<div class="md-top md-top--' + a[1] + '"></div>';
      } else if (kind === 'bow') {
        out += k.pendant(k.use('md-bow', 'md-pbw', '0 4 100 118'), { side: a[1], at: +a[2], len: +a[3], w: +a[4], cls: 'md-pend' });
      } else if (kind === 'pend') {
        t = PENDS[a[1]];
        out += k.pendant(k.use(t[0], t[2], t[1]), { side: a[2], at: +a[3], len: +a[4], w: +a[5], cls: 'md-pend' });
      } else if (kind === 'pile') {
        bits = '';
        a[2].split(',').forEach(function (it) { var d = ITEMS[it]; if (d) bits += k.use(d[0], 'md-i md-i--' + it, d[1]); });
        out += '<div class="md-pile md-pile--' + side + '">' + bits + '</div>';
      } else if (kind === 'stem') {
        out += '<div class="md-stem md-stem--' + side + ' sk-hide-m" style="--at:' + a[2] + '%;width:' + a[3] + 'px">' + k.use('md-stemtall', '', '0 0 70 240') + '</div>';
      } else if (kind === 'flagpole') {
        out += '<div class="md-fp md-fp--' + side + '" style="width:' + a[2] + 'px">' + flagSvg('', 10, 330, { T: 4.4, amp: 6, shade: 0.6, pole: 9 }) + '</div>';
      } else if (kind === 'stars') {
        out += '<div class="md-tg md-tg--' + side + ' sk-hide-m" style="top:' + a[2] + 'px">' + k.twinkles(+a[3], { id: ['md-star', 'sk-sparkle'], size: [7, 13], dur: [5, 9], colors: ['#f3f1ea', '#cdd8f2', '#ffe9b8'], seed: +a[4], cls: 'md-tw' }) + '</div>';
      } else if (kind === 'petals') {
        out += k.particles(+a[1], { id: 'md-petal', vb: '0 0 24 32', colors: PETALS, size: [9, 16], dur: [24, 40], drift: 70, sway: 22, spin: 0.3, seed: 200 + +a[2], mobile: 0.5, opacity: [0.4, 0.75] });
      } else if (kind === 'eagle') {
        out += k.flyers(1, { id: 'md-eagle', vb: '0 0 320 140', size: [100, 124], dur: [72, 90], top: [3, 4], wave: 10, dir: a[2], seed: 700 + +a[3], cls: 'md-eagle md-eagle--s' }).replace(/top:[\d.]+%/, 'top:' + a[1] + 'px');
      } else if (kind === 'wreath') {
        out += '<div class="md-wr sk-hide-m" style="' + (side === 'l' ? 'left' : 'right') + ':' + a[4] + '%;top:' + a[2] + 'px;width:' + a[3] + 'px">' + k.use('md-wreath', '', '0 0 140 156') + '</div>';
      } else if (kind === 'tap') {
        t = TAPS[a[1]];
        out += k.tap(t.sec(k), t.say, 'md-t md-t-' + a[1] + ' md-b' + a[2] + ' sk-hide-m', (a[2] === 'l' ? 'left' : 'right') + ':' + a[4] + '%;top:' + a[3] + 'px;width:' + a[5] + 'px');
      }
    });
    return out;
  }

  /* ── the field at dusk above the footer: four banners hung from a rail between two posts, among the poppies and small flags, a flag on a tall pole and a wreath on its easel ── */
  var SAYINGS = ['those who served', 'of those we lost', 'to every family', 'in our hearts'];
  var TITLES = ['HONOR', 'MEMORY', 'THANKS', 'ALWAYS'];
  function footer(k) {
    var signs = SAYINGS.map(function (s, i) { return '<div class="md-sign"><div class="md-banner"><span>' + TITLES[i] + '</span><em>' + s + '</em></div></div>'; }).join('');
    return '<div class="md-fsky"></div>' +
      k.twinkles(8, { id: ['md-star', 'sk-sparkle'], size: [6, 12], dur: [5, 9], colors: ['#f3f1ea', '#cdd8f2', '#ffe9b8'], area: [2, 98], areaY: [4, 46], seed: 61, mobile: 0.5, cls: 'md-tw' }) +
      '<div class="md-hills">' + hills(k) + '</div>' +
      '<div class="md-meadow md-meadow--b">' + field(k, FOOT_BACK) + '</div>' +
      '<div class="md-props md-props--l sk-props">' + flagSvg('md-pflag', 10, 430, { T: 4.2, amp: 7, shade: 0.6, pole: 7 }) + k.use('md-poppy', 'md-fi md-fi--a', '0 0 64 128') + k.use('md-bud', 'md-fi md-fi--b', '0 0 64 128') + '</div>' +
      '<div class="md-signs sk-signs">' + signs + '</div>' +
      '<div class="md-props md-props--r sk-props">' + k.use('md-poppyb', 'md-fi md-fi--c', '0 0 64 128') + k.use('md-wreathstand', 'md-wst', '0 0 140 214') + '</div>' +
      '<div class="md-meadow md-meadow--f">' + field(k, FOOT_FRONT) + '</div>' +
      k.particles(5, { id: 'md-petal', vb: '0 0 24 32', colors: PETALS, size: [9, 15], dur: [14, 22], drift: 60, sway: 20, spin: 0.3, seed: 300, mobile: 0.5, opacity: [0.45, 0.8] });
  }

  var T = {
    name: 'memorial', prefix: 'md',
    meta: { bg: '#070d1c', gold: '#ff6b6b', emoji: '⭐', tapSay: ['We remember', 'Honor', 'Thank you'], sayings: SAYINGS },
    defs: DEFS,
    hero: hero,
    sections: {},
    footer: footer,
    // Only the layers on (or just about to be on) the screen keep their animations going; the rest are paused, which spares phones and laptops about four hundred animations.
    init: function () {
      if (!window.IntersectionObserver) return;
      var io = new IntersectionObserver(function (entries) { entries.forEach(function (en) { en.target.classList.toggle('md-off', !en.isIntersecting); }); }, { rootMargin: '160px 0px' });
      [].forEach.call(document.querySelectorAll('.sk-hero, .sk-sec, .sk-footer'), function (el) { io.observe(el); });
    },
    // A tap is answered softly: a few petals or stars drift up from it, no more.
    onTap: function (el, k) {
      try {
        if (el.classList.contains('md-t-poppy')) k.burst(el, { id: 'md-petal', vb: '0 0 24 32', n: 7, colors: ['#d9343f', '#ff6b6b', '#f3f1ea'], dist: [30, 70], size: [10, 16], ms: 1800 });
        else if (el.classList.contains('md-t-star')) k.burst(el, { id: 'md-star', vb: '0 0 24 25', n: 6, colors: ['#f3f1ea', '#cdd8f2', '#ffe9b8'], dist: [26, 60], size: [7, 12], ms: 1800 });
        else k.burst(el, { id: 'md-star', vb: '0 0 24 25', n: 5, colors: ['#f3f1ea', '#cdd8f2'], dist: [30, 64], size: [8, 12], ms: 1800 });
      } catch (e) { /* a tap that cannot pop is still answered by its bubble */ }
    }
  };
  Object.keys(SECTIONS).forEach(function (id) { T.sections[id] = function (k) { return section(SECTIONS[id], k); }; });
  (window.SeasonKit ? window.SeasonKit.mount : function (t) { (window.__skq = window.__skq || []).push(t); })(T);
})();
