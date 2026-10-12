/* New Year: the homepage's scene for all of January (index.html's <head> turns it on from the date and loads this with season-kit.css,
   season-kit.js and season-newyear.css, which draws it). A glittering midnight countdown in navy, champagne gold and silver with hot pink, cyan and
   violet for the fireworks: rockets climbing and bursting over the hero (in turn, on a loop), confetti and sparkles falling, a very faint outlined year
   behind the headline, foil balloons that carry the digits of the year, a city skyline along the foot of the hero with a glowing clock tower that
   reads midnight, a layer behind every section (garlands of stars, pennants and lights, curly streamers, party hats, noisemakers, sparklers, small
   clocks, balloons rising), and a party stage above the footer (confetti cannons, balloons, a glittering floor and four signs).
   Tap a balloon, the clock tower, the party popper (and a few things further down) and they answer. The year is the academy's current year (k.now.year).
   Nothing here reads or writes anything about a visitor, and nothing is built unless the page is in the season. */
(function () {
  var K0 = window.SeasonKit;

  // The year on the academy's clock (the kit's k.now.year), read now so that the tap bubbles listed in meta say exactly what the page shows.
  function yearNow() {
    try { if (K0 && K0.helpers) return K0.helpers().now.year; } catch (e) { /* fall through */ }
    try { return +new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', year: 'numeric' }).format(new Date()); } catch (e) { /* fall through */ }
    return new Date().getFullYear();
  }
  var YEAR = yearNow();

  var C = { gold: '#f0d58a', gold2: '#c9a24a', gold3: '#8f6a1f', pink: '#ff4fa3', pink2: '#b3225f', cyan: '#3fe0ff', cyan2: '#10829f', violet: '#9b6bff', violet2: '#5a34b8',
    silver: '#dfe4f5', silver2: '#8c96b8', navy: '#0b1030', orange: '#ff9a3d' };
  var CONF = [C.gold, C.pink, C.cyan, C.violet, C.silver, C.orange];
  var SPARK = [C.gold, '#ffffff', C.cyan, C.pink, C.silver];
  // Foil balloon colours: the face and the darker seam around it.
  var BAL = { gold: ['#f0d58a', '#a57a22'], pink: ['#ff5aa8', '#a81f5c'], cyan: ['#46dfff', '#0e7f9c'], violet: ['#a98aff', '#5a34b8'], silver: ['#e8ecf8', '#7c86a8'] };

  function f(n) { return String(Math.round(n * 10) / 10); }
  function star5(cx, cy, R, r) {
    var d = '', i, a, rad;
    for (i = 0; i < 10; i++) { a = -Math.PI / 2 + i * Math.PI / 5; rad = i % 2 ? r : R; d += (i ? 'L' : 'M') + f(cx + rad * Math.cos(a)) + ' ' + f(cy + rad * Math.sin(a)); }
    return d + 'Z';
  }
  function ring(n, rad, r, off) {
    var o = '', i, a;
    for (i = 0; i < n; i++) { a = (i + (off || 0)) / n * Math.PI * 2; o += '<circle cx="' + f(rad * Math.cos(a)) + '" cy="' + f(rad * Math.sin(a)) + '" r="' + r + '"/>'; }
    return o;
  }
  // Rotate a path made only of M and C commands half a turn about the middle of an 80 by 120 box.
  function rot180(d) {
    return d.replace(/([MC])([^MC]*)/g, function (m, c, nums) {
      var v = nums.trim().split(/[ ,]+/).map(Number), out = [], i;
      for (i = 0; i < v.length; i += 2) out.push(f(80 - v[i]) + ' ' + f(120 - v[i + 1]));
      return c + out.join(' ');
    });
  }

  // ── The digits: each a bold rounded stroke (the centre line of the numeral), drawn thick for a foil balloon and as an outline for the year in the sky.
  var DIG = [
    'M40 18C58 18 64 38 64 60C64 82 58 102 40 102C22 102 16 82 16 60C16 38 22 18 40 18Z',
    'M24 40L46 18V102',
    'M18 40C18 26 28 18 40 18C54 18 62 26 62 38C62 50 54 58 44 68L18 102H64',
    'M20 30C24 22 32 18 40 18C54 18 62 26 62 38C62 50 54 58 40 59C56 60 64 70 64 82C64 96 54 102 40 102C28 102 20 98 16 90',
    'M48 102V18L14 76H66',
    'M60 18H26L21 56C28 50 35 48 43 48C57 48 65 58 65 76C65 92 55 102 40 102C28 102 20 98 15 90',
    'M58 24C50 20 44 18 38 18C24 18 16 36 16 66C16 90 26 102 40 102C54 102 64 92 64 78C64 64 54 54 40 54C28 54 19 62 16 74',
    'M14 18H64C54 44 45 72 40 102',
    'M40 18C53 18 59 26 59 36C59 46 51 55 40 58C26 62 16 70 16 82C16 95 26 102 40 102C54 102 64 95 64 82C64 70 54 62 40 58C29 55 21 46 21 36C21 26 27 18 40 18Z',
    ''
  ];
  DIG[9] = rot180(DIG[6]);

  function digitDefs() {
    var o = '', i, p, g = ' fill="none" stroke-linecap="round" stroke-linejoin="round"';
    for (i = 0; i < 10; i++) {
      p = '#ny-p' + i;
      o += '<path id="ny-p' + i + '" d="' + DIG[i] + '"/>';
      // The foil balloon: a dark seam, the coloured face, a soft shine and a thin glint.
      o += '<symbol id="ny-d' + i + '" viewBox="0 0 80 120">' +
        '<use href="' + p + '"' + g + ' style="stroke:var(--bd,#a57a22)" stroke-width="31"/>' +
        '<use href="' + p + '"' + g + ' style="stroke:var(--bc,#f0d58a)" stroke-width="23"/>' +
        '<use href="' + p + '"' + g + ' stroke="url(#ny-shine)" stroke-width="23"/>' +
        '<use href="' + p + '" transform="translate(-3.4 -3.4)"' + g + ' stroke="#fff" stroke-opacity=".55" stroke-width="3.4" stroke-dasharray="30 24"/></symbol>';
      // The same numeral as an outline (a wide stroke with a narrower one cut out of it), for the year behind the headline.
      o += '<symbol id="ny-o' + i + '" viewBox="0 0 80 120"><mask id="ny-m' + i + '" maskUnits="userSpaceOnUse" x="-10" y="-10" width="100" height="140">' +
        '<use href="' + p + '"' + g + ' stroke="#fff" stroke-width="29"/><use href="' + p + '"' + g + ' stroke="#000" stroke-width="24"/></mask>' +
        '<use href="' + p + '"' + g + ' stroke="currentColor" stroke-opacity=".12" stroke-width="29"/>' +
        '<rect x="-10" y="-10" width="100" height="140" fill="currentColor" mask="url(#ny-m' + i + ')"/></symbol>';
    }
    return o;
  }

  // ── Fireworks: four kinds of burst, each a 200 by 200 shape in the current colour with white sparks at the tips. They scale up and fade in the CSS.
  function spk(a, s) { return '<use href="#ny-spk" transform="rotate(' + f(a) + ') scale(' + s + ')"/>'; }
  function fireworkDefs() {
    var o = '<g id="ny-spk"><path d="M0 -12C3.6 -34 2.8 -62 0 -90C-2.8 -62 -3.6 -34 0 -12Z"/><circle cx="0" cy="-94" r="3.8" fill="#fff"/></g>' +
      '<g id="ny-spkf"><path d="M0 -10C7.5 -30 6.5 -62 0 -88C-6.5 -62 -7.5 -30 0 -10Z"/><circle cx="0" cy="-92" r="3.2" fill="#fff"/></g>', i, a, x, y, t;
    // a: a round peony, long and short rays alternating
    o += '<symbol id="ny-fw-a" viewBox="0 0 200 200" fill="currentColor"><g transform="translate(100 100)">';
    for (i = 0; i < 16; i++) o += spk(i * 22.5, i % 2 ? 0.66 : 1);
    o += ring(8, 26, 2.4, 0.5) + '<circle r="9" fill="#fff" fill-opacity=".92"/></g></symbol>';
    // b: rings of beads around a bright star
    o += '<symbol id="ny-fw-b" viewBox="0 0 200 200" fill="currentColor"><g transform="translate(100 100)">' + ring(28, 88, 3.7) + ring(14, 64, 3.2, 0.5) + ring(8, 40, 2.8) +
      '<path d="M0 -17L3.8 -3.8L17 0L3.8 3.8L0 17L-3.8 3.8L-17 0L-3.8 -3.8Z" fill="#fff"/></g></symbol>';
    // c: a fat star of eight rays with thin ones between and a halo of dots
    o += '<symbol id="ny-fw-c" viewBox="0 0 200 200" fill="currentColor"><g transform="translate(100 100)">';
    for (i = 0; i < 8; i++) o += '<use href="#ny-spkf" transform="rotate(' + (i * 45) + ')"/><use href="#ny-spk" transform="rotate(' + (i * 45 + 22.5) + ') scale(.56)"/>';
    o += ring(16, 100, 2.4, 0.5) + '<circle r="8" fill="#fff"/></g></symbol>';
    // d: a willow: arcs that climb, then droop
    o += '<symbol id="ny-fw-d" viewBox="0 0 200 200" fill="currentColor"><g transform="translate(100 100)" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">';
    var angles = [-168, -152, -136, -120, -104, -90, -76, -60, -44, -28, -12, 12, 36, 60, 90, 120, 144, 168];
    for (i = 0; i < angles.length; i++) {
      a = angles[i] * Math.PI / 180;
      var len = (angles[i] > 0 ? 70 : 88), pts = '';
      for (t = 0.08; t <= 1.001; t += 0.12) { x = len * Math.cos(a) * t; y = len * Math.sin(a) * t + 52 * t * t; pts += (pts ? 'L' : 'M') + f(x) + ' ' + f(y); }
      o += '<path d="' + pts + '"/>';
      x = len * Math.cos(a); y = len * Math.sin(a) + 52;
      o += '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="3.4" fill="#fff" stroke="none"/>';
    }
    o += '<circle r="8" fill="#fff" stroke="none"/></g></symbol>';
    return o;
  }

  // ── Confetti, balloons, stars and glints that fall, rise and twinkle.
  var SMALL =
    '<symbol id="ny-cf" viewBox="0 0 12 20"><rect x="1" y="1" width="10" height="18" rx="2.5" fill="currentColor"/><rect x="1" y="1" width="4" height="18" rx="2" fill="#fff" fill-opacity=".3"/></symbol>' +
    '<symbol id="ny-rib" viewBox="0 0 14 40"><path d="M4 3C13 9 1 15 10 21S1 33 9 37" fill="none" stroke="currentColor" stroke-width="4.4" stroke-linecap="round"/></symbol>' +
    '<symbol id="ny-tri" viewBox="0 0 20 20"><path d="M10 3L18 17H2Z" fill="currentColor" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/></symbol>' +
    '<symbol id="ny-ring" viewBox="0 0 20 20"><circle cx="10" cy="10" r="6.4" fill="none" stroke="currentColor" stroke-width="3.6"/></symbol>' +
    '<symbol id="ny-glint" viewBox="0 0 40 40"><path d="M20 0L22.6 17.4L40 20L22.6 22.6L20 40L17.4 22.6L0 20L17.4 17.4Z" fill="currentColor"/><circle cx="20" cy="20" r="3.2" fill="#fff"/></symbol>' +
    // a round balloon on its string (the colour is the current colour)
    '<symbol id="ny-bal" viewBox="0 0 50 80"><path d="M25 60C21 66 29 71 25 79" fill="none" stroke="#cfd5ec" stroke-opacity=".85" stroke-width="1.7" stroke-linecap="round"/>' +
      '<path d="M25 3C39 3 47 14 47 27C47 42 36 52 25 53C14 52 3 42 3 27C3 14 11 3 25 3Z" fill="currentColor"/>' +
      '<path d="M35 8C45 17 45 37 33 49C40 36 40 20 35 8Z" fill="#000" fill-opacity=".17"/><path d="M25 52L20 60H30Z" fill="currentColor"/>' +
      '<ellipse cx="15.5" cy="17" rx="4.4" ry="8" transform="rotate(26 15.5 17)" fill="#fff" fill-opacity=".55"/></symbol>' +
    // a foil star: two tones, a rim, a glint
    '<symbol id="ny-star" viewBox="0 0 50 50"><path d="' + star5(25, 26, 22, 10) + '" fill="#f0d58a" stroke="#f0d58a" stroke-width="3" stroke-linejoin="round"/>' +
      '<path d="M25 26L47 20L34.5 36.5ZM25 26L40 46L25 37ZM25 26L10 46L15.5 36.5Z" fill="#c9a24a" fill-opacity=".55"/>' +
      '<path d="M25 26L25 4L31 18Z" fill="#fff" fill-opacity=".4"/><circle cx="19" cy="17" r="2.4" fill="#fff" fill-opacity=".8"/></symbol>' +
    // a foil star balloon on its string (the colour is the current colour)
    '<symbol id="ny-sbal" viewBox="0 0 60 100"><path d="M30 60C25 70 35 76 30 99" fill="none" stroke="#cfd5ec" stroke-opacity=".85" stroke-width="1.7" stroke-linecap="round"/>' +
      '<path d="' + star5(30, 29, 28, 13) + '" fill="currentColor" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/>' +
      '<path d="M30 29L58 22L42 43ZM30 29L50 56L30 46ZM30 29L10 56L18 43Z" fill="#000" fill-opacity=".16"/><path d="M30 29L30 2L38 21Z" fill="#fff" fill-opacity=".38"/>' +
      '<path d="M30 57L26 64H34Z" fill="currentColor"/></symbol>';

  // ── Things to wear and to make a noise with.
  var PROPS =
    // a party hat: a cone with bands and a pompom (two colours: --c1 and --c2)
    '<clipPath id="ny-hatclip"><path d="M32 13L60 84C46 91 18 91 4 84Z"/></clipPath>' +
    '<symbol id="ny-hat" viewBox="0 0 64 94"><path d="M32 13L60 84C46 91 18 91 4 84Z" style="fill:var(--c1,#ff4fa3)"/>' +
      '<g clip-path="url(#ny-hatclip)"><path d="M0 52L64 30V42L0 64ZM0 74L64 52V64L0 86Z" style="fill:var(--c2,#f0d58a)"/><path d="M32 8L66 100H40Z" fill="#000" fill-opacity=".16"/>' +
      '<circle cx="24" cy="44" r="2.4" fill="#fff" fill-opacity=".7"/><circle cx="38" cy="66" r="2.6" fill="#fff" fill-opacity=".7"/><circle cx="21" cy="80" r="2.4" fill="#fff" fill-opacity=".7"/></g>' +
      '<path d="M5 84C20 92 44 92 59 84" fill="none" style="stroke:var(--c2,#f0d58a)" stroke-width="5" stroke-linecap="round"/>' +
      '<circle cx="32" cy="10" r="8.5" style="fill:var(--c2,#f0d58a)"/><circle cx="29" cy="7" r="2.8" fill="#fff" fill-opacity=".7"/></symbol>' +
    // a noisemaker horn: a bell with bands, a mouthpiece and a ribbon
    '<clipPath id="ny-hornclip"><path d="M24 25C48 22 72 13 90 3C99 20 99 40 90 57C72 47 48 38 24 35Z"/></clipPath>' +
    '<symbol id="ny-horn" viewBox="0 0 112 60"><rect x="2" y="23" width="16" height="14" rx="6" fill="#f0d58a"/><path d="M16 25L28 24V36L16 35Z" fill="#c9a24a"/>' +
      '<path d="M24 25C48 22 72 13 90 3C99 20 99 40 90 57C72 47 48 38 24 35Z" style="fill:var(--c1,#3fe0ff)"/>' +
      '<g clip-path="url(#ny-hornclip)" style="fill:var(--c2,#ff4fa3)"><path d="M38 20L50 18L52 44L40 41ZM64 14L76 8L78 52L66 46Z"/><path d="M24 36L100 62V70L24 42Z" fill="#000" fill-opacity=".16"/></g>' +
      '<ellipse cx="92" cy="30" rx="7.5" ry="27" fill="#0b1030" fill-opacity=".62"/><ellipse cx="92" cy="30" rx="7.5" ry="27" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="2.4"/>' +
      '<path d="M98 8C110 14 108 24 100 26" fill="none" style="stroke:var(--c2,#ff4fa3)" stroke-width="3.2" stroke-linecap="round"/>' +
      '<path d="M98 52C110 46 108 36 100 34" fill="none" style="stroke:var(--c2,#ff4fa3)" stroke-width="3.2" stroke-linecap="round"/></symbol>' +
    // a party blower: a mouthpiece and a rolled paper curl
    '<symbol id="ny-blower" viewBox="0 0 112 56"><rect x="2" y="19" width="22" height="16" rx="7" fill="#f0d58a"/><rect x="2" y="19" width="22" height="6" rx="3" fill="#fff" fill-opacity=".35"/>' +
      '<path id="ny-curlpath" d="' + (function () {
        var d = 'M24 27H52', i, a, rr, n = 44;
        for (i = 0; i <= n; i++) { a = Math.PI + i / n * Math.PI * 4.6; rr = 25 - i / n * 18; d += 'L' + f(77 + rr * Math.cos(a)) + ' ' + f(28 + rr * Math.sin(a)); }
        return d;
      })() + '" fill="none" style="stroke:var(--c1,#ff4fa3)" stroke-width="8.5" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<use href="#ny-curlpath" transform="translate(-1.6 -1.8)" fill="none" stroke="#fff" stroke-opacity=".38" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></symbol>' +
    // a face for the clocks (no hands) and a clock that reads almost midnight
    '<symbol id="ny-clockface" viewBox="0 0 60 60"><circle cx="30" cy="30" r="28" fill="#c9a24a"/><circle cx="30" cy="30" r="25.2" fill="#f0d58a"/><circle cx="30" cy="30" r="20.6" fill="#fff8e3"/>' +
      '<path d="M30 12V16M48 30H44M30 48V44M12 30H16" stroke="#0b1030" stroke-width="2.6" stroke-linecap="round" fill="none"/>' +
      '<path d="M39 13.5L38 15M46.5 21L45 22M46.5 39L45 38M39 46.5L38 45M21 46.5L22 45M13.5 39L15 38M13.5 21L15 22M21 13.5L22 15" stroke="#0b1030" stroke-opacity=".5" stroke-width="1.5" stroke-linecap="round" fill="none"/>' +
      '<path d="M12 22C16 12 24 8 32 8" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="2.4" stroke-linecap="round"/></symbol>' +
    '<symbol id="ny-clock" viewBox="0 0 60 60"><use href="#ny-clockface"/><path d="M30 31V17.5" stroke="#0b1030" stroke-width="3.2" stroke-linecap="round"/>' +
      '<path d="M30 31L22.6 24" stroke="#0b1030" stroke-width="3.8" stroke-linecap="round"/><circle cx="30" cy="31" r="3" fill="#ff4fa3"/></symbol>' +
    // a mirror ball
    '<symbol id="ny-disco" viewBox="0 0 60 68"><rect x="26" y="0" width="8" height="9" rx="2" fill="#aab3d1"/><circle cx="30" cy="39" r="27" fill="url(#ny-mirror)"/>' +
      '<g fill="none" stroke="#5a6396" stroke-opacity=".55" stroke-width="1.3"><ellipse cx="30" cy="39" rx="27" ry="9"/><ellipse cx="30" cy="39" rx="27" ry="19"/><path d="M3 39H57M30 12V66"/><ellipse cx="30" cy="39" rx="10" ry="27"/><ellipse cx="30" cy="39" rx="20" ry="27"/></g>' +
      '<g fill-opacity=".85"><rect x="20" y="20" width="7" height="7" fill="#fff"/><rect x="38" y="30" width="7" height="7" fill="#3fe0ff"/><rect x="14" y="43" width="6" height="6" fill="#ff4fa3"/><rect x="33" y="50" width="7" height="6" fill="#fff"/><rect x="26" y="33" width="6" height="6" fill="#f0d58a"/></g>' +
      '<ellipse cx="20" cy="26" rx="6" ry="10" transform="rotate(28 20 26)" fill="#fff" fill-opacity=".5"/></symbol>' +
    // a sparkler: a thin wire and a burst of sparks at the tip
    '<symbol id="ny-sparkler" viewBox="0 0 100 110"><path d="M12 106L56 50" stroke="#aeb6d2" stroke-width="3.4" stroke-linecap="round"/><path d="M12 106L30 83" stroke="#6c7699" stroke-width="3.4" stroke-linecap="round"/>' +
      '<circle cx="62" cy="42" r="26" fill="url(#ny-glowg)"/><g stroke-linecap="round" fill="none">' + (function () {
        var o = '', i, a, l;
        for (i = 0; i < 16; i++) { a = i / 16 * Math.PI * 2; l = i % 2 ? 17 : 27; o += '<path d="M' + f(62 + 6 * Math.cos(a)) + ' ' + f(42 + 6 * Math.sin(a)) + 'L' + f(62 + l * Math.cos(a)) + ' ' + f(42 + l * Math.sin(a)) + '" stroke="' + (i % 4 === 0 ? '#fff' : i % 4 === 2 ? '#ffe28a' : '#ffc94d') + '" stroke-width="' + (i % 2 ? 2.2 : 3) + '"/>'; }
        return o;
      })() + '</g><circle cx="62" cy="42" r="6" fill="#fff"/><circle cx="92" cy="22" r="2.4" fill="#ffe28a"/><circle cx="36" cy="14" r="2.2" fill="#fff"/><circle cx="90" cy="64" r="2" fill="#ffc94d"/></symbol>' +
    // curly streamers: a paper ribbon that hangs and winds up in a coil
    '<symbol id="ny-curl" viewBox="0 0 44 150"><g fill="none" stroke-linecap="round" stroke-linejoin="round"><path id="ny-curlrib" d="M22 0C22 18 8 24 8 40C8 56 36 58 36 74C36 90 12 92 12 106C12 120 30 124 34 114C38 104 24 98 21 108" stroke="currentColor" stroke-width="7.5"/>' +
      '<use href="#ny-curlrib" transform="translate(-1.8 0)" stroke="#fff" stroke-opacity=".34" stroke-width="2.4"/></g></symbol>';

  // ── Gradients and the little pieces they need.
  var PAINT =
    '<linearGradient id="ny-shine" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".62"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
    '<linearGradient id="ny-strfade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#dfe4f5" stop-opacity=".9"/><stop offset="1" stop-color="#dfe4f5" stop-opacity="0"/></linearGradient>' +
    '<radialGradient id="ny-mirror" cx=".36" cy=".3" r=".85"><stop offset="0" stop-color="#fff"/><stop offset=".3" stop-color="#d4daf0"/><stop offset=".7" stop-color="#8f99c9"/><stop offset="1" stop-color="#555d92"/></radialGradient>' +
    '<radialGradient id="ny-glowg"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".35" stop-color="#ffe9a0" stop-opacity=".55"/><stop offset="1" stop-color="#ffd36a" stop-opacity="0"/></radialGradient>' +
    '<linearGradient id="ny-foil" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset="1" stop-color="#fff" stop-opacity=".35"/></linearGradient>';

  var DEFS = PAINT + digitDefs() + fireworkDefs() + SMALL + PROPS;

  window.__nyDefs = DEFS;                                    // (art sheet only; harmless)

  var T = {
    name: 'newyear', prefix: 'ny',
    meta: { bg: '#070a16', gold: '#f0d58a', emoji: '🎆', tapSay: ['Happy New Year!', 'Midnight!', 'Pop!'], sayings: ['big goals, small steps', 'show up, even when tired', 'new year, fresh start', 'oss, onward together'] },
    defs: DEFS,
    hero: function () { return ''; },
    sections: {},
    footer: function () { return ''; }
  };
  (window.SeasonKit ? window.SeasonKit.mount : function (t) { (window.__skq = window.__skq || []).push(t); })(T);
})();
