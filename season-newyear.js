/* New Year: the homepage's scene for all of January (index.html's <head> turns it on from the date and loads this with season-kit.css,
   season-kit.js and season-newyear.css, which draws it). A glittering midnight countdown in navy, champagne gold and silver, with hot pink, cyan and
   violet for the fireworks: rockets climbing and bursting over the hero in turn, confetti and sparkles falling, a very faint outlined year behind the
   headline, foil balloons that carry the digits of the year, a city skyline along the foot of the hero with a glowing clock tower that reads midnight,
   a layer behind every section (garlands of stars, pennants and lights, curly streamers, party hats, noisemakers, sparklers, small clocks, balloons
   rising), and a party stage above the footer (confetti cannons, balloons, a glittering floor and four signs). Tap a balloon, the clock tower or the
   party popper (and a few things further down the page) and they answer. The year is the one the page welcomes: January's own year all through January
   and the coming year at any other time, so a preview in the autumn already says the next one (see yearNow below).
   Nothing here reads or writes anything about a visitor, and nothing is built unless the page is in the season. */
(function () {
  var K0 = window.SeasonKit;

  // The year this page welcomes, on the academy's clock (the kit's k.now), read now so that the tap bubbles listed in meta say exactly what the page shows.
  // All through January (the season) it is that January's year; at any other time (a preview in the autumn, say) it is the New Year that is coming, so
  // looked at in October 2026 it says 2027, and in January 2027 it says 2027 too.
  function yearNow() {
    var d = null;
    try { if (K0 && K0.helpers) d = K0.helpers().now; } catch (e) { d = null; }
    if (!d) {
      try {
        var p = {};
        new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', year: 'numeric', month: 'numeric' }).formatToParts(new Date()).forEach(function (x) { p[x.type] = +x.value; });
        if (p.year && p.month) d = p;
      } catch (e) { d = null; }
    }
    if (!d) { var n = new Date(); d = { year: n.getFullYear(), month: n.getMonth() + 1 }; }
    return d.month === 1 ? d.year : d.year + 1;
  }
  var YEAR = yearNow();

  var C = { gold: '#f0d58a', pink: '#ff4fa3', cyan: '#3fe0ff', violet: '#9b6bff', silver: '#dfe4f5', orange: '#ff9a3d' };
  var CONF = [C.gold, C.pink, C.cyan, C.violet, C.silver, C.orange];
  var STARS = [C.gold, '#ffffff', C.silver, C.gold];
  // Foil balloon colours: the face and the darker seam around it.
  var BAL = { gold: ['#f0d58a', '#a57a22'], pink: ['#ff5aa8', '#a81f5c'], cyan: ['#46dfff', '#0e7f9c'], violet: ['#a98aff', '#5a34b8'], silver: ['#e8ecf8', '#7c86a8'] };
  // Two-colour party things (hats, horns, blowers): the body and the trim.
  var DUO = ['--c1:#ff4fa3;--c2:#f0d58a', '--c1:#3fe0ff;--c2:#9b6bff', '--c1:#9b6bff;--c2:#f0d58a', '--c1:#f0d58a;--c2:#ff4fa3', '--c1:#ff9a3d;--c2:#3fe0ff'];

  // What a tap says (and what meta lists): all of it family-friendly, the year is the real one.
  var SAY = { balloon: 'Happy New Year!', tower: 'Midnight!', popper: 'Pop!', clock: 'Tick tock!', horn: 'Hooray!', hat: 'Ta-da!', star: 'Hello ' + YEAR + '!', spark: 'Sparkle!' };
  var SAYINGS = ['big goals, small steps', 'show up, one day at a time', 'new year, fresh start', 'patience, respect, effort'];
  var TITLES = ['GOALS', 'GRIND', 'FRESH', 'OSS'];

  function f(n) { return String(Math.round(n * 10) / 10); }
  function rnd(seed) {                                         // a small seeded random (the same art every time)
    var a = (seed >>> 0) || 1;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function ico(id, cls, vb, style) {
    return '<svg class="' + cls + '"' + (vb ? ' viewBox="' + vb + '"' : '') + (style ? ' style="' + style + '"' : '') + ' aria-hidden="true" focusable="false"><use href="#' + id + '"/></svg>';
  }
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
        '<use href="' + p + '"' + g + ' stroke="currentColor" stroke-width="29" mask="url(#ny-m' + i + ')"/></symbol>';
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
    o += '<symbol id="ny-fw-d" viewBox="0 0 200 200" fill="currentColor"><g transform="translate(100 80)" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">';
    var angles = [-168, -152, -136, -120, -104, -90, -76, -60, -44, -28, -12, 12, 36, 60, 90, 120, 144, 168];
    for (i = 0; i < angles.length; i++) {
      a = angles[i] * Math.PI / 180;
      var len = (angles[i] > 0 ? 54 : 74), pts = '';
      for (t = 0.08; t <= 1.001; t += 0.12) { x = len * Math.cos(a) * t; y = len * Math.sin(a) * t + 46 * t * t; pts += (pts ? 'L' : 'M') + f(x) + ' ' + f(y); }
      o += '<path d="' + pts + '"/>';
      x = len * Math.cos(a); y = len * Math.sin(a) + 46;
      o += '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="3.4" fill="#fff" stroke="none"/>';
    }
    o += '<circle r="8" fill="#fff" stroke="none"/></g></symbol>';
    return o;
  }

  // The curly streamer: a paper ribbon that twirls as it hangs, its loops growing toward the bottom (a looping curve: x swings, y advances and doubles back).
  var CURL_VB = '0 0 44 120';
  function curlDef() {
    var pts = [], t, a, x, y, d = '', i, minX = 99, maxX = -99, maxY = 0;
    for (t = 0; t <= 4.6 * Math.PI; t += 0.12) {
      a = 5 + 10 * Math.min(1, t / 6);
      x = 22 + a * Math.sin(t); y = 7 * t + 19 * Math.min(1, t / 4) * (1 - Math.cos(t));
      pts.push([x, y]); if (x < minX) minX = x; if (x > maxX) maxX = x; if (y > maxY) maxY = y;
    }
    for (i = 0; i < pts.length; i++) d += (i ? 'L' : 'M') + f(pts[i][0]) + ' ' + f(pts[i][1]);
    CURL_VB = f(minX - 6) + ' -4 ' + f(maxX - minX + 12) + ' ' + f(maxY + 12);
    return '<symbol id="ny-curl" viewBox="' + CURL_VB + '"><g fill="none" stroke-linecap="round" stroke-linejoin="round"><path id="ny-curlrib" d="' + d + '" stroke="currentColor" stroke-width="6.2"/>' +
      '<use href="#ny-curlrib" transform="translate(-1.5 -.4)" stroke="#fff" stroke-opacity=".38" stroke-width="2"/></g></symbol>';
  }

  // ── Confetti, balloons, stars and glints that fall, rise and twinkle.
  var SMALL =
    '<symbol id="ny-cf" viewBox="0 0 12 20"><rect x="1" y="1" width="10" height="18" rx="2.5" fill="currentColor"/><rect x="1" y="1" width="4" height="18" rx="2" fill="#fff" fill-opacity=".3"/></symbol>' +
    '<symbol id="ny-rib" viewBox="-1 0 17 40"><path d="M4 3C13 9 1 15 10 21S1 33 9 37" fill="none" stroke="currentColor" stroke-width="4.4" stroke-linecap="round"/></symbol>' +
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
      '<path d="M25 26L47 20L34.5 36.5ZM25 26L40 46L25 37ZM25 26L10 46L15.5 36.5Z" fill="#c9a24a" fill-opacity=".4"/>' +
      '<path d="M25 26L25 4L31 18Z" fill="#fff" fill-opacity=".4"/><circle cx="19" cy="17" r="2.4" fill="#fff" fill-opacity=".8"/></symbol>' +
    // a foil star balloon on its string (the colour is the current colour)
    '<symbol id="ny-sbal" viewBox="0 0 60 100"><path d="M30 64C25 74 35 80 30 99" fill="none" stroke="#cfd5ec" stroke-opacity=".85" stroke-width="1.7" stroke-linecap="round"/>' +
      '<path d="' + star5(30, 32, 27, 12.5) + '" fill="currentColor" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/>' +
      '<path d="M30 32L57 25.5L41.5 46ZM30 32L49 58L30 49ZM30 32L11 58L18.5 46Z" fill="#000" fill-opacity=".16"/><path d="M30 32L30 5.5L37.5 24Z" fill="#fff" fill-opacity=".38"/>' +
      '<path d="M30 60L26 67H34Z" fill="currentColor"/></symbol>';

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
        var d = 'M24 27H52', i, a, rr, n = 40;
        for (i = 0; i <= n; i++) { a = Math.PI + i / n * Math.PI * 4.4; rr = 25 - i / n * 15; d += 'L' + f(77 + rr * Math.cos(a)) + ' ' + f(28 + rr * Math.sin(a)); }
        return d;
      })() + '" fill="none" style="stroke:var(--c1,#ff4fa3)" stroke-width="6.4" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<use href="#ny-curlpath" transform="translate(-1.4 -1.6)" fill="none" stroke="#fff" stroke-opacity=".38" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></symbol>' +
    // a face for the clocks (no hands) and a clock that reads five to midnight
    '<symbol id="ny-clockface" viewBox="0 0 60 60"><circle cx="30" cy="30" r="28" fill="#c9a24a"/><circle cx="30" cy="30" r="25.2" fill="#f0d58a"/><circle cx="30" cy="30" r="20.6" fill="#fff8e3"/>' +
      '<path d="M30 12V16M48 30H44M30 48V44M12 30H16" stroke="#0b1030" stroke-width="2.6" stroke-linecap="round" fill="none"/>' +
      '<path d="M39 13.5L38 15M46.5 21L45 22M46.5 39L45 38M39 46.5L38 45M21 46.5L22 45M13.5 39L15 38M13.5 21L15 22M21 13.5L22 15" stroke="#0b1030" stroke-opacity=".5" stroke-width="1.5" stroke-linecap="round" fill="none"/>' +
      '<path d="M12 22C16 12 24 8 32 8" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="2.4" stroke-linecap="round"/></symbol>' +
    '<symbol id="ny-clock" viewBox="0 0 60 60"><use href="#ny-clockface"/><path d="M30 31V21" stroke="#0b1030" stroke-width="4" stroke-linecap="round"/>' +
      '<path d="M30 31L22.6 18.6" stroke="#0b1030" stroke-width="2.6" stroke-linecap="round"/><circle cx="30" cy="31" r="3" fill="#ff4fa3"/></symbol>' +
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
    // a party popper: a striped cone tipped up and to the right, with streamers and confetti bursting out of it
    '<clipPath id="ny-popclip"><path d="M14 106L76.3 74.9L45.1 43.7Z"/></clipPath>' +
    '<symbol id="ny-popper" viewBox="0 0 124 120"><path d="M62 54C58 40 72 32 68 18S80 4 90 10" fill="none" stroke="#f0d58a" stroke-width="3.8" stroke-linecap="round"/>' +
      '<path d="M66 56C80 44 90 54 98 44S108 30 118 34" fill="none" stroke="#ff4fa3" stroke-width="3.8" stroke-linecap="round"/>' +
      '<path d="M70 62C86 60 92 72 104 66S114 56 120 62" fill="none" stroke="#3fe0ff" stroke-width="3.8" stroke-linecap="round"/>' +
      '<path d="M14 106L76.3 74.9L45.1 43.7Z" fill="#ff4fa3"/>' +
      '<g clip-path="url(#ny-popclip)"><path d="M-3.7 60.1L59.9 123.7M7.7 48.7L71.3 112.3M19 37.4L82.6 101" stroke="#f0d58a" stroke-width="8" fill="none"/><path d="M-1 76L62 128M12 62L74 114" stroke="#3fe0ff" stroke-width="4" fill="none"/>' +
      '<path d="M14 106L76.3 74.9L60.7 59.3Z" fill="#000" fill-opacity=".16"/><circle cx="40" cy="78" r="2.6" fill="#fff" fill-opacity=".8"/><circle cx="54" cy="68" r="2.6" fill="#fff" fill-opacity=".8"/></g>' +
      '<ellipse cx="60.7" cy="59.3" rx="22" ry="6.6" transform="rotate(45 60.7 59.3)" fill="#0b1030" fill-opacity=".7"/><ellipse cx="60.7" cy="59.3" rx="22" ry="6.6" transform="rotate(45 60.7 59.3)" fill="none" stroke="#f0d58a" stroke-width="3"/>' +
      '<rect x="80" y="20" width="7" height="12" rx="1.5" transform="rotate(30 83 26)" fill="#f0d58a"/><circle cx="76" cy="36" r="2.8" fill="#ff4fa3"/><path d="M92 48L98 58L86 58Z" fill="#3fe0ff"/>' +
      '<rect x="102" y="18" width="6" height="11" rx="1.5" transform="rotate(-24 105 24)" fill="#9b6bff"/><circle cx="112" cy="48" r="2.4" fill="#fff"/><circle cx="96" cy="28" r="2.2" fill="#3fe0ff"/><path d="M110 8L112 14L118 16L112 18L110 24L108 18L102 16L108 14Z" fill="#fff"/></symbol>' +
    // a confetti cannon for the stage: an upright striped cone with a rim, a foot and streamers
    '<clipPath id="ny-cancl"><path d="M23 118L8 36H52L37 118Z"/></clipPath>' +
    '<symbol id="ny-cannon" viewBox="0 0 60 124"><path d="M23 118L8 36H52L37 118Z" fill="#ff4fa3"/>' +
      '<g clip-path="url(#ny-cancl)"><path d="M0 52H60V62H0ZM0 78H60V88H0Z" fill="#f0d58a"/><path d="M0 100H60V104H0Z" fill="#3fe0ff"/><path d="M30 30H60V124H30Z" fill="#000" fill-opacity=".17"/><circle cx="22" cy="70" r="2.4" fill="#fff" fill-opacity=".7"/><circle cx="36" cy="94" r="2.4" fill="#fff" fill-opacity=".7"/></g>' +
      '<ellipse cx="30" cy="36" rx="22" ry="6.4" fill="#0b1030" fill-opacity=".72"/><ellipse cx="30" cy="36" rx="22" ry="6.4" fill="none" stroke="#f0d58a" stroke-width="3"/>' +
      '<rect x="16" y="116" width="28" height="7" rx="3.5" fill="#c9a24a"/><path d="M22 34C16 24 24 18 20 10" fill="none" stroke="#3fe0ff" stroke-width="3" stroke-linecap="round"/><path d="M38 34C44 24 36 16 42 8" fill="none" stroke="#f0d58a" stroke-width="3" stroke-linecap="round"/></symbol>' +
    // a clock tower for the skyline: it reads midnight, and its face glows
    '<symbol id="ny-tower" viewBox="0 0 100 250"><path d="M26 250V132H74V250Z" fill="#0c1131"/><path d="M26 250V132" stroke="#2c3578" stroke-width="2.4"/><path d="M74 132V250" stroke="#05081a" stroke-width="3"/>' +
      '<path d="M14 250V200H26V250ZM74 250V200H86V250Z" fill="#0a0e28"/>' +
      '<rect x="18" y="62" width="64" height="74" rx="3" fill="#10163b"/><rect x="18" y="62" width="4" height="74" fill="#2c3578" fill-opacity=".7"/><rect x="12" y="130" width="76" height="8" rx="2" fill="#1a2152"/><rect x="12" y="55" width="76" height="9" rx="2" fill="#1a2152"/>' +
      '<path d="M14 56L50 12L86 56Z" fill="#141b48"/><path d="M50 12L86 56H50Z" fill="#000" fill-opacity=".22"/><path d="M50 12V2" stroke="#f0d58a" stroke-width="2.6" stroke-linecap="round"/><circle cx="50" cy="3" r="3.2" fill="#f0d58a"/>' +
      '<circle cx="50" cy="99" r="30" fill="#f0d58a"/><circle cx="50" cy="99" r="26.4" fill="#fff6d0"/>' +
      '<path d="M50 76V80M73 99H69M50 122V118M27 99H31" stroke="#0b1030" stroke-width="2.8" stroke-linecap="round" fill="none"/>' +
      '<path d="M50 99V82" stroke="#0b1030" stroke-width="4" stroke-linecap="round"/><path d="M50 99V79" stroke="#0b1030" stroke-width="2.4" stroke-linecap="round"/><circle cx="50" cy="99" r="3.4" fill="#c42a78"/>' +
      '<g fill="#ffd978"><rect x="44" y="152" width="12" height="18" rx="6"/><rect x="44" y="184" width="12" height="18" rx="6"/><rect x="44" y="216" width="12" height="18" rx="6"/></g></symbol>';

  // ── Paint: gradients, garlands, the windows of the city.
  var PAINT =
    '<linearGradient id="ny-shine" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".62"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
    '<linearGradient id="ny-strfade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#dfe4f5" stop-opacity=".9"/><stop offset="1" stop-color="#dfe4f5" stop-opacity="0"/></linearGradient>' +
    '<radialGradient id="ny-mirror" cx=".36" cy=".3" r=".85"><stop offset="0" stop-color="#fff"/><stop offset=".3" stop-color="#d4daf0"/><stop offset=".7" stop-color="#8f99c9"/><stop offset="1" stop-color="#555d92"/></radialGradient>' +
    '<radialGradient id="ny-glowg"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".35" stop-color="#ffe9a0" stop-opacity=".55"/><stop offset="1" stop-color="#ffd36a" stop-opacity="0"/></radialGradient>';

  // A garland is a tile that repeats along the top of a section (a pattern a <rect> is filled with).
  function swagY(x, h) { var t = x / 120; return 3 + 4 * h * t * (1 - t); }
  function garStar(id, cols, depth, rad) {                       // a swag with stars hanging from it (depth: how far it sags; rad: the size of the big stars)
    depth = depth || 15; rad = rad || 11.5;
    var h = Math.ceil(3 + depth + 7 + 2 * rad + 4);
    var o = '<pattern id="' + id + '" width="120" height="' + h + '" patternUnits="userSpaceOnUse"><path d="M0 3Q60 ' + f(3 + 2 * depth) + ' 120 3" fill="none" stroke="#c9cfe8" stroke-opacity=".75" stroke-width="2"/><circle cx="0" cy="3" r="3" fill="#c9cfe8"/><circle cx="120" cy="3" r="3" fill="#c9cfe8"/>';
    [[20, 0], [60, 1], [100, 2]].forEach(function (p) {
      var y = swagY(p[0], depth), c = cols[p[1] % cols.length];
      o += '<path d="M' + p[0] + ' ' + f(y) + 'V' + f(y + 7) + '" stroke="#c9cfe8" stroke-opacity=".7" stroke-width="1.4"/><path d="' + star5(p[0], y + 7 + rad, rad, rad * 0.45) + '" fill="' + c + '" stroke="' + c + '" stroke-width="2" stroke-linejoin="round"/>' +
        '<path d="' + star5(p[0] - 1.2, y + 6 + rad, rad * 0.47, rad * 0.22) + '" fill="#fff" fill-opacity=".5"/>';
    });
    [40, 80].forEach(function (x, i) { var y = swagY(x, depth); o += '<path d="' + star5(x, y + 6 + rad * 0.5, rad * 0.56, rad * 0.26) + '" fill="' + cols[(i + 3) % cols.length] + '" stroke="' + cols[(i + 3) % cols.length] + '" stroke-width="1.4" stroke-linejoin="round"/>'; });
    return o + '</pattern>';
  }
  function garFlag(id, cols) {                                  // pennant bunting
    var o = '<pattern id="' + id + '" width="120" height="56" patternUnits="userSpaceOnUse"><path d="M0 3Q60 ' + f(3 + 2 * 12) + ' 120 3" fill="none" stroke="#c9cfe8" stroke-opacity=".8" stroke-width="1.8"/><circle cx="0" cy="3" r="2.6" fill="#c9cfe8"/><circle cx="120" cy="3" r="2.6" fill="#c9cfe8"/>';
    [12, 36, 60, 84, 108].forEach(function (x, i) {
      var y1 = swagY(x - 10, 12), y2 = swagY(x + 10, 12), ym = swagY(x, 12), c = cols[i % cols.length];
      o += '<path d="M' + (x - 10) + ' ' + f(y1) + 'L' + (x + 10) + ' ' + f(y2) + 'L' + x + ' ' + f(ym + 26) + 'Z" fill="' + c + '" stroke="' + c + '" stroke-width="1.6" stroke-linejoin="round"/>' +
        '<path d="M' + (x - 10) + ' ' + f(y1) + 'L' + x + ' ' + f(ym + 26) + 'L' + x + ' ' + f(ym) + 'Z" fill="#fff" fill-opacity=".22"/>';
    });
    return o + '</pattern>';
  }
  function garLight(id, cols, mode) {                           // string lights: all dim (base), or the even or odd ones lit (a chase)
    var o = '<pattern id="' + id + '" width="120" height="50" patternUnits="userSpaceOnUse">';
    if (mode === 'base') o += '<path d="M0 3Q60 ' + f(3 + 2 * 13) + ' 120 3" fill="none" stroke="#8d96bd" stroke-opacity=".8" stroke-width="1.8"/>';
    [10, 30, 50, 70, 90, 110].forEach(function (x, i) {
      var y = swagY(x, 13) + 1, c = cols[i % cols.length], lit = (mode === 'a' && i % 2 === 0) || (mode === 'b' && i % 2 === 1);
      if (mode === 'base') o += '<path d="M' + x + ' ' + f(y) + 'V' + f(y + 4) + '" stroke="#8d96bd" stroke-width="2"/><ellipse cx="' + x + '" cy="' + f(y + 9) + '" rx="4" ry="5.4" fill="' + c + '" fill-opacity=".42"/>';
      if (lit) o += '<circle cx="' + x + '" cy="' + f(y + 9) + '" r="11" fill="' + c + '" fill-opacity=".28"/><ellipse cx="' + x + '" cy="' + f(y + 9) + '" rx="4.4" ry="5.8" fill="' + c + '"/><ellipse cx="' + (x - 1.4) + '" cy="' + f(y + 7) + '" rx="1.4" ry="2" fill="#fff" fill-opacity=".85"/>';
    });
    return o + '</pattern>';
  }
  function garFringe(id, cols) {                                // a foil fringe curtain: thin strands in two tones of one family that fade toward their ends
    var L = [60, 82, 68, 90, 56, 76, 86, 64, 74, 92, 58, 72], i, x, o = '';
    [0, 1].forEach(function (j) { o += '<linearGradient id="' + id + '-g' + j + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + cols[j] + '"/><stop offset=".5" stop-color="' + cols[j] + '" stop-opacity=".8"/><stop offset="1" stop-color="' + cols[j] + '" stop-opacity=".08"/></linearGradient>'; });
    o += '<pattern id="' + id + '" width="60" height="96" patternUnits="userSpaceOnUse"><rect width="60" height="4.4" fill="' + cols[2] + '"/><rect width="60" height="1.4" fill="#fff" fill-opacity=".4"/>';
    for (i = 0; i < 12; i++) {
      x = i * 5 + 0.9;
      o += '<rect x="' + f(x) + '" y="3" width="3.2" height="' + L[i] + '" rx="1.6" fill="url(#' + id + '-g' + (i % 2) + ')"/><rect x="' + f(x) + '" y="3" width="1" height="' + Math.round(L[i] * 0.7) + '" fill="#fff" fill-opacity=".38"/>';
    }
    return o + '</pattern>';
  }
  function garBead(id, cols) {                                  // a swag of beads with a tassel
    var o = '<pattern id="' + id + '" width="120" height="50" patternUnits="userSpaceOnUse"><path d="M0 3Q60 ' + f(3 + 2 * 12) + ' 120 3" fill="none" stroke="#9aa3c8" stroke-opacity=".6" stroke-width="1.4"/>', i, t, x, y;
    for (i = 0; i <= 20; i++) { t = i / 20; x = 120 * t; y = swagY(x, 12); o += '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="' + (i % 2 ? 2.8 : 3.8) + '" fill="' + cols[i % cols.length] + '"/>'; }
    var ym = swagY(60, 12);
    o += '<path d="M60 ' + f(ym) + 'V' + f(ym + 9) + '" stroke="#c9cfe8" stroke-width="1.6"/><path d="M60 ' + f(ym + 9) + 'L52 ' + f(ym + 28) + 'H68Z" fill="' + cols[0] + '"/><circle cx="60" cy="' + f(ym + 9) + '" r="4.6" fill="' + cols[1 % cols.length] + '"/>';
    return o + '</pattern>';
  }
  function confFloor(id) {                                      // confetti scattered on the floor
    var r = rnd(77), o = '<pattern id="' + id + '" width="240" height="30" patternUnits="userSpaceOnUse">', i, x, y, c, k;
    for (i = 0; i < 26; i++) {
      x = r() * 236 + 2; y = 8 + r() * 20; c = CONF[Math.floor(r() * CONF.length)]; k = r();
      if (k < 0.5) o += '<rect x="' + f(x) + '" y="' + f(y) + '" width="' + f(5 + r() * 4) + '" height="' + f(3 + r() * 3) + '" rx="1" fill="' + c + '" transform="rotate(' + f(r() * 180) + ' ' + f(x) + ' ' + f(y) + ')"/>';
      else if (k < 0.8) o += '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="' + f(2 + r() * 1.6) + '" fill="' + c + '"/>';
      else o += '<path d="M' + f(x) + ' ' + f(y - 4) + 'L' + f(x + 4) + ' ' + f(y + 3) + 'L' + f(x - 4) + ' ' + f(y + 3) + 'Z" fill="' + c + '"/>';
    }
    return o + '</pattern>';
  }
  var GARLANDS =
    garStar('ny-g-star-a', [C.gold, C.silver, C.pink], 9, 9.5) + garStar('ny-g-star-b', [C.cyan, C.violet, C.gold]) +
    garFlag('ny-g-flag-a', [C.gold, C.pink, C.cyan, C.violet, C.silver]) + garFlag('ny-g-flag-b', [C.violet, C.gold, C.silver, C.cyan, C.pink]) + garFlag('ny-g-flag-c', [C.pink, C.silver, C.gold, C.violet, C.cyan]) +
    garLight('ny-g-lt-a0', [C.gold, C.pink, C.cyan, C.violet, '#ffffff', C.orange], 'base') + garLight('ny-g-lt-a1', [C.gold, C.pink, C.cyan, C.violet, '#ffffff', C.orange], 'a') + garLight('ny-g-lt-a2', [C.gold, C.pink, C.cyan, C.violet, '#ffffff', C.orange], 'b') +
    garLight('ny-g-lt-b0', [C.cyan, C.gold, C.violet, C.pink, C.silver, C.cyan], 'base') + garLight('ny-g-lt-b1', [C.cyan, C.gold, C.violet, C.pink, C.silver, C.cyan], 'a') + garLight('ny-g-lt-b2', [C.cyan, C.gold, C.violet, C.pink, C.silver, C.cyan], 'b') +
    garFringe('ny-g-fr-a', ['#f0d58a', '#d9b866', '#a57a22']) + garFringe('ny-g-fr-b', ['#dfe4f5', '#a9b4dc', '#6a74a6']) +
    garBead('ny-g-bd-a', [C.gold, C.silver, C.pink, C.silver]) + garBead('ny-g-bd-b', [C.cyan, C.violet, C.gold, C.silver]) + confFloor('ny-g-conf');

  // Windows for the city: a tile of small windows, some lit (warm, pale, a few pink and cyan), the rest dark blue.
  function windows(id, seed) {
    var r = rnd(seed), o = '<pattern id="' + id + '" width="48" height="60" patternUnits="userSpaceOnUse">', i, j, v, c;
    for (i = 0; i < 4; i++) for (j = 0; j < 4; j++) {
      v = r();
      c = v < 0.1 ? '#ff9ccf' : v < 0.17 ? '#8be9ff' : v < 0.42 ? '#ffd978' : v < 0.56 ? '#fff0c2' : '#1c2352';
      o += '<rect x="' + (4 + i * 12) + '" y="' + (3 + j * 15) + '" width="6.5" height="9" rx="1" fill="' + c + '"' + (c === '#1c2352' ? '' : ' fill-opacity=".92"') + '/>';
    }
    return o + '</pattern>';
  }
  var WINDOWS = windows('ny-w1', 11) + windows('ny-w2', 29) + windows('ny-w3', 53);

  var DEFS = PAINT + digitDefs() + fireworkDefs() + curlDef() + SMALL + PROPS + GARLANDS + WINDOWS;

  // ═══ The hero ═════════════════════════════════════════════════════════════════════════════════════════════════════════

  // The skyline along the foot of the hero: three rows of towers (far, middle, near), lit windows, a few that blink, and the street.
  function skyline() {
    var r = rnd(2027), W = 1440, H = 270, out = '', blinks = '', i;
    function bld(x, w, h, kind) {
      var y = H - h, iw, ix, ih, d = '';
      if (kind === 1) { iw = w * 0.62; ix = x + (w - iw) / 2; ih = Math.min(26, h * 0.2); d = 'M' + f(x) + ' ' + H + 'V' + f(y + ih) + 'H' + f(ix) + 'V' + f(y) + 'H' + f(ix + iw) + 'V' + f(y + ih) + 'H' + f(x + w) + 'V' + H + 'Z'; }
      else if (kind === 2) d = 'M' + f(x) + ' ' + H + 'V' + f(y + 12) + 'L' + f(x + w) + ' ' + f(y) + 'V' + H + 'Z';
      else if (kind === 3) d = 'M' + f(x) + ' ' + H + 'V' + f(y) + 'H' + f(x + w) + 'V' + H + 'Z' + 'M' + f(x + w / 2 - 1.3) + ' ' + f(y + 1) + 'V' + f(y - 26) + 'H' + f(x + w / 2 + 1.3) + 'V' + f(y + 1) + 'Z';
      else d = 'M' + f(x) + ' ' + H + 'V' + f(y) + 'H' + f(x + w) + 'V' + H + 'Z';
      return d;
    }
    // a row of buildings: returns the outline and, for each pattern, the window panels
    function row(o) {
      var x = -30, sil = '', wins = ['', '', ''], boxes = [], w, h, k, p;
      while (x < W + 30) {
        w = o.w[0] + r() * (o.w[1] - o.w[0]); h = o.h[0] + r() * (o.h[1] - o.h[0]); k = r() < 0.25 ? 1 : r() < 0.3 ? 2 : r() < 0.35 ? 3 : 0;
        sil += bld(x, w, h, k);
        if (o.win) { p = Math.floor(r() * 3); wins[p] += 'M' + f(x + 6) + ' ' + f(H - h + (k === 1 ? 30 : 12)) + 'H' + f(x + w - 6) + 'V' + (H - 4) + 'H' + f(x + 6) + 'Z'; boxes.push([x, w, h]); }
        x += w + (r() < 0.3 ? 0 : 2 + r() * 8);
      }
      return { sil: sil, wins: wins, boxes: boxes };
    }
    var far = row({ w: [38, 84], h: [96, 178], win: false });
    var mid = row({ w: [44, 100], h: [64, 148], win: true });
    var near = row({ w: [60, 130], h: [30, 86], win: true });
    // landmarks: a tall needle, a stepped tower, a dome, a water tank
    var land = 'M214 ' + H + 'V92H220L226 60L232 24L238 60L244 92H250V' + H + 'Z' +
      'M1010 ' + H + 'V120H1016V96H1062V120H1068V' + H + 'Z' +
      'M1210 ' + H + 'V150C1210 112 1270 112 1270 150V' + H + 'ZM1238 118V104H1242V118Z' +
      'M430 ' + H + 'V196H436L440 178H474L478 196H484V' + H + 'Z';
    out += '<path d="' + far.sil + '" fill="#171d4a" fill-opacity=".92"/>';
    out += '<path d="' + mid.sil + land + '" fill="#0e1334"/>';
    for (i = 0; i < 3; i++) if (mid.wins[i]) out += '<path d="' + mid.wins[i] + '" fill="url(#ny-w' + (i + 1) + ')"/>';
    out += '<path d="' + near.sil + '" fill="#080b1f"/>';
    for (i = 0; i < 3; i++) if (near.wins[i]) out += '<path d="' + near.wins[i] + '" fill="url(#ny-w' + (3 - i) + ')" fill-opacity=".8"/>';
    // windows that blink, on the middle row: small boxes laid over the picture (an animated piece inside the SVG would redraw the whole skyline every frame)
    var n = 0, b, gx, gy, wx, wy;
    while (n < 12 && n < mid.boxes.length * 2) {
      b = mid.boxes[Math.floor(r() * mid.boxes.length)];
      gx = b[0] + 8 + 12 * Math.floor(r() * Math.max(1, Math.floor((b[1] - 16) / 12))); gy = H - b[2] + 14 + 15 * Math.floor(r() * Math.max(1, Math.floor((b[2] - 24) / 15)));
      wx = Math.round(gx / 12) * 12 + 4; wy = Math.floor((gy - 3) / 15) * 15 + 3;
      blinks += '<i class="ny-blink" style="left:' + f(wx / W * 100) + '%;top:' + f(wy / H * 100) + '%;background:' + (n % 3 === 0 ? '#ff9ccf' : '#ffe08a') + ';animation-delay:-' + f(r() * 6) + 's;animation-duration:' + f(3 + r() * 4) + 's"></i>';
      n++;
    }
    // the street
    out += '<rect x="0" y="' + (H - 12) + '" width="' + W + '" height="12" fill="#070a16"/>';
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true" focusable="false">' + out + '</svg>' + blinks + '<i class="ny-blink ny-blink--beacon" style="left:' + f(232 / W * 100) + '%;top:' + f(17 / H * 100) + '%"></i>';
  }

  // One balloon that carries a digit: the foil face, a knot, a string that fades out (a short one on the balloon that answers a tap, so its box stays small).
  function digitBalloon(d, tone, cls, style, tapSay, k) {
    var c = BAL[tone], tall = !tapSay, svg = '<svg viewBox="0 0 80 ' + (tall ? 200 : 150) + '" aria-hidden="true" focusable="false"><path d="' + (tall ? 'M40 122C33 140 47 152 40 170S34 190 40 199' : 'M40 122C35 130 45 138 40 149') +
      '" fill="none" stroke="url(#ny-strfade)" stroke-width="1.8" stroke-linecap="round"/><use href="#ny-d' + d + '" width="80" height="120"/><path d="M40 116L35 127H45Z" style="fill:var(--bd)"/></svg>';
    style = '--bc:' + c[0] + ';--bd:' + c[1] + ';' + style;
    if (tapSay) return k.tap(svg, tapSay, cls, style);
    return '<div class="' + cls + '" style="' + style + '">' + svg + '</div>';
  }

  // One burst: where it goes off (percent across and down, and a size), its colour, when in the loop, and where it goes off on a phone (opts.m).
  function firework(kind, x, y, kk, color, dl, opts) {
    opts = opts || {};
    var m = opts.m;
    return '<div class="ny-fw' + (opts.far ? ' ny-fw--far' : '') + (opts.noStill ? ' ny-fw--x' : '') + (opts.hideM ? ' sk-hide-m' : '') + '" style="--x:' + x + ';--y:' + y + ';--k:' + kk + (m ? ';--xm:' + m[0] + ';--ym:' + m[1] + ';--km:' + m[2] : '') + ';--dl:' + dl + 's;color:' + color + '">' +
      (opts.far ? '' : '<i class="ny-trail"></i>') + '<svg viewBox="0 0 200 200" aria-hidden="true" focusable="false"><use href="#ny-fw-' + kind + '"/></svg></div>';
  }

  // The hero: a night sky with bursts going off in turn, the year in outline behind the headline, confetti and sparkles, foil digit balloons,
  // the skyline with its clock tower, and a party popper, all kept to the edges so the headline and buttons stay clear.
  function hero(k) {
    var ys = String(YEAR), year = '', i, o = '';
    for (i = 0; i < ys.length; i++) year += '<use href="#ny-o' + ys.charAt(i) + '" x="' + (i * 74) + '" y="0" width="80" height="120"/>';
    o += '<div class="ny-aurora"></div>';
    o += '<svg class="ny-year" viewBox="0 0 ' + (74 * (ys.length - 1) + 80) + ' 120" aria-hidden="true" focusable="false">' + year + '</svg>';
    // ghosts: big, faint bursts far back (behind the balloons and the photograph, away from the words), then the near ones, one every two seconds around the edges of the sky
    o += firework('c', 56, 60, 1.5, C.cyan, 3, { far: true, m: [30, 52, 1.5] }) + firework('a', 86, 40, 1.5, C.violet, 9, { far: true, m: [78, 40, 1.4] }) + firework('d', 5, 56, 1.3, C.pink, 5, { far: true, hideM: true });
    o += firework('a', 90, 17, 1.0, C.gold, 1, { m: [86, 8.5, 0.8] }) + firework('b', 4, 36, 0.66, C.pink, 3.2, { hideM: true }) + firework('c', 69, 13, 0.66, C.cyan, 5.4, { m: [13, 9.5, 0.72] }) +
      firework('d', 93, 52, 1.0, C.gold, 7.6, { m: [94, 38, 0.8], noStill: true }) + firework('a', 74, 47, 0.7, '#ffffff', 9.8, { hideM: true, noStill: true }) + firework('b', 3, 62, 0.6, C.violet, 12, { hideM: true }) + firework('c', 80, 12, 0.56, C.gold, 11.2, { hideM: true, noStill: true });
    o += '<i class="ny-shoot ny-shoot--1"></i><i class="ny-shoot ny-shoot--2"></i>';
    o += k.twinkles(18, { id: ['sk-sparkle', 'sk-star', 'ny-glint'], size: [7, 15], dur: [2.4, 5], colors: STARS, seed: 31, area: [1, 98], areaY: [4, 72], mobile: 0.5 });
    o += k.twinkles(5, { id: ['ny-glint', 'sk-sparkle'], size: [18, 30], dur: [3, 5.5], colors: ['#ffffff', C.gold, C.cyan], seed: 37, area: [64, 98], areaY: [10, 50], mobile: 0.3, cls: 'ny-bigtw' });
    o += k.particles(12, { id: ['ny-cf', 'ny-rib', 'ny-cf'], colors: CONF, size: [12, 22], dur: [12, 22], drift: 120, sway: 36, spin: 2, seed: 21, mobile: 0.5, opacity: [0.75, 1], cls: 'ny-flip' }) +
      k.particles(14, { id: ['ny-tri', 'ny-ring', 'sk-star', 'sk-dot'], colors: CONF, size: [10, 20], dur: [12, 22], drift: 120, sway: 36, spin: 2, seed: 22, mobile: 0.5, opacity: [0.7, 1] });
    o += k.twinkles(8, { id: ['sk-sparkle', 'ny-glint'], size: [8, 14], dur: [1.8, 3.6], colors: ['#ffe9a8', '#ffffff', C.pink], seed: 41, area: [3, 97], areaY: [78, 96], mobile: 0.5 });
    o += k.particles(3, { id: ['ny-bal', 'ny-sbal', 'ny-bal'], colors: ['#ff5aa8', '#46dfff', '#ffd25e'], dir: 'rise', size: [36, 54], dur: [30, 44], area: [0.5, 5], drift: 24, sway: 14, spin: 0.03, opacity: [0.75, 0.95], seed: 61, mobile: 0.34, cls: 'ny-rise' });
    // the city and its tower
    o += '<div class="ny-city">' + skyline() +
      k.tap('<i class="ny-halo"></i>' + ico('ny-tower', '', '0 0 100 250'), SAY.tower, 'ny-tower ny-t-tower', 'left:62.5%;bottom:0;width:6.4%') + '</div>';
    // foil balloons: the digits of the year (the last of them answers a tap)
    var tones = ['gold', 'pink', 'cyan', 'violet'], pos = ['right:17.5%;top:34%;--r0:-8deg;--r1:-3deg;--bt:7s;--bd0:-1s', 'right:11.2%;top:27%;--r0:5deg;--r1:9deg;--bt:6s;--bd0:-3s',
      'right:5.8%;top:37%;--r0:-4deg;--r1:1deg;--bt:7.5s;--bd0:-2s'], last = ys.length - 1;
    for (i = 0; i < last && i < 3; i++) o += digitBalloon(ys.charAt(i), tones[i], 'ny-bn sk-hide-m', pos[i]);
    o += digitBalloon(ys.charAt(last), tones[3], 'ny-bn ny-tap ny-t-bal ny-edge-r sk-hide-m', 'right:1.6%;top:16%;--r0:3deg;--r1:7deg;--bt:6.4s;--bd0:-.5s', SAY.balloon, k);
    // the party popper
    o += k.tap(ico('ny-popper', '', '0 0 124 120'), SAY.popper, 'ny-popper ny-t-pop ny-edge-l', 'left:1.6%;bottom:6px;width:clamp(58px,7vw,98px)');
    return o;
  }

  // ═══ Behind the sections ══════════════════════════════════════════════════════════════════════════════════════════════
  var SECTIONS = {
    eventStrip:     ['garland:star:a', 'curl:l:2', 'hang:r:disco:3:72:44', 'bal:2:1', 'conf:5:1', 'twink:r:34'],
    programs:       ['garland:flag:a', 'pile:l:hat0,horn1', 'hang:r:star:2:96:36', 'tap:horn:r:62:58', 'conf:4:2', 'twink:l:46', 'bal:1:2'],
    competition:    ['garland:light:a', 'clock:l:38:46', 'pile:r:hat2,clock', 'rain:5:3', 'spark:r:26:60', 'bal:2:3'],
    coaches:        ['garland:fringe:a', 'curl:r:2', 'pile:l:horn2,hat3', 'tap:hat:l:44:56', 'conf:4:4', 'fw:r:52:150:b:pink', 'twink:r:70'],
    gallery:        ['garland:bead:a', 'spark:l:30:64', 'spark:r:58:64', 'hang:l:star:2:84:32', 'bal:3:5', 'conf:3:5', 'floor'],
    'belt-journey': ['garland:flag:b', 'pile:r:blower0,hat1', 'hang:r:glint:3:104:30', 'tap:star:l:30:58', 'rain:4:6', 'fw:l:62:140:c:cyan', 'conf:3:6'],
    locations:      ['garland:star:b', 'hang:r:clock:3:76:40', 'pile:l:hat4,blower1', 'tap:clock:l:56:50', 'conf:4:7', 'bal:2:7', 'twink:r:50'],
    faq:            ['garland:light:b', 'curl:l:2', 'hang:r:disco:2.5:100:42', 'pile:r:blower2,horn0', 'twink:l:50', 'conf:4:8', 'fw:l:46:130:a:gold'],
    schedule:       ['garland:fringe:b', 'clock:l:22:44', 'clock:r:52:50', 'tap:clock:r:30:56', 'pile:l:hat2,horn1', 'conf:5:9', 'bal:2:9', 'twink:l:70'],
    testimonials:   ['garland:bead:b', 'pile:l:hat1,star', 'pile:r:hat3,horn2', 'hang:l:glint:2:90:32', 'tap:spark:r:42:58', 'rain:4:10', 'fw:r:20:130:d:gold'],
    pricing:        ['garland:flag:c', 'spark:r:44:62', 'curl:l:2', 'pile:r:hat4,hat0', 'hang:r:disco:2:80:38', 'conf:4:11', 'bal:3:11', 'twink:l:40'],
    contact:        ['garland:light:a', 'curl:l:2', 'pile:l:hat0,horn1,hat3', 'pile:r:hat2,blower0,hat4', 'hang:r:star:3.5:90:34', 'tap:horn:l:46:58', 'bal:3:12', 'conf:6:12', 'fw:l:30:150:b:violet', 'floor']
  };
  var PILE = {
    hat0: ['ny-hat', '0 0 64 94', DUO[0]], hat1: ['ny-hat', '0 0 64 94', DUO[1]], hat2: ['ny-hat', '0 0 64 94', DUO[2]], hat3: ['ny-hat', '0 0 64 94', DUO[3]], hat4: ['ny-hat', '0 0 64 94', DUO[4]],
    horn0: ['ny-horn', '0 0 112 60', DUO[1]], horn1: ['ny-horn', '0 0 112 60', DUO[0]], horn2: ['ny-horn', '0 0 112 60', DUO[3]],
    blower0: ['ny-blower', '0 0 112 56', DUO[0]], blower1: ['ny-blower', '0 0 112 56', DUO[1]], blower2: ['ny-blower', '0 0 112 56', DUO[2]],
    clock: ['ny-clock', '0 0 60 60', ''], star: ['ny-star', '0 0 50 50', '']
  };
  var HANG = { disco: ['ny-disco', '0 0 60 68'], star: ['ny-star', '0 0 50 50'], clock: ['ny-clock', '0 0 60 60'], glint: ['ny-glint', '0 0 40 40'] };
  var TAPS = {
    horn: ['ny-horn', '0 0 112 60', SAY.horn, DUO[0], 'horn'], hat: ['ny-hat', '0 0 64 94', SAY.hat, DUO[1], 'hat'], clock: ['ny-clock', '0 0 60 60', SAY.clock, '', 'clock'],
    star: ['ny-star', '0 0 50 50', SAY.star, '', 'star'], spark: ['ny-sparkler', '0 0 100 110', SAY.spark, '', 'spark']
  };
  var CURL_COLS = [C.pink, C.cyan, C.gold, C.violet, C.silver];

  // A small clock whose hands run (the minute hand a lap every few seconds, the hour hand a twelfth of that).
  function tickClock(cls, style) {
    return '<svg class="ny-tick ' + cls + '" viewBox="0 0 60 60" style="' + style + '" aria-hidden="true" focusable="false"><use href="#ny-clockface"/>' +
      '<path class="ny-hh" d="M30 31V20" stroke="#0b1030" stroke-width="4" stroke-linecap="round"/><path class="ny-mh" d="M30 31V14.5" stroke="#0b1030" stroke-width="2.6" stroke-linecap="round"/><circle cx="30" cy="31" r="3" fill="#ff4fa3"/></svg>';
  }
  function sparklerBit(side, top, w) {                    // a sparkler with sparks that come and go around its tip
    return '<div class="ny-spk ny-spk--' + side + '" style="' + (side === 'l' ? 'left' : 'right') + ':0.6%;top:' + top + '%;width:' + w + 'px">' + ico('ny-sparkler', 'ny-spk__art', '0 0 100 110') +
      '<i class="sk-tw" style="left:56%;top:6%;--s:14px;--d:1.6s;--o:-.3s;color:#fff">' + ico('sk-sparkle') + '</i><i class="sk-tw" style="left:84%;top:20%;--s:10px;--d:2.1s;--o:-1s;color:#ffe28a">' + ico('sk-sparkle') + '</i>' +
      '<i class="sk-tw" style="left:36%;top:-4%;--s:9px;--d:1.9s;--o:-.7s;color:#ffc94d">' + ico('sk-sparkle') + '</i></div>';
  }

  function section(specs, k) {
    var out = '';
    specs.forEach(function (spec) {
      var a = spec.split(':'), kind = a[0], side, bits, t, i, n;
      if (kind === 'garland') {
        if (a[1] === 'light') out += '<svg class="ny-gar ny-gar--light" aria-hidden="true" focusable="false"><rect width="100%" height="100%" fill="url(#ny-g-lt-' + a[2] + '0)"/></svg>' +
          '<svg class="ny-gar ny-gar--light ny-gar--c1" aria-hidden="true" focusable="false"><rect width="100%" height="100%" fill="url(#ny-g-lt-' + a[2] + '1)"/></svg>' +
          '<svg class="ny-gar ny-gar--light ny-gar--c2" aria-hidden="true" focusable="false"><rect width="100%" height="100%" fill="url(#ny-g-lt-' + a[2] + '2)"/></svg>';
        else out += '<svg class="ny-gar ny-gar--' + a[1] + '" aria-hidden="true" focusable="false"><rect width="100%" height="100%" fill="url(#ny-g-' + { star: 'star', flag: 'flag', fringe: 'fr', bead: 'bd' }[a[1]] + '-' + a[2] + ')"/></svg>';
      } else if (kind === 'floor') {
        out += '<svg class="ny-floorconf" aria-hidden="true" focusable="false"><rect width="100%" height="100%" fill="url(#ny-g-conf)"/></svg>';
      } else if (kind === 'pile') {
        bits = '';
        a[2].split(',').forEach(function (it) { var d = PILE[it]; if (d) bits += ico(d[0], 'ny-i ny-i--' + d[0].slice(3), d[1], d[2]); });
        out += '<div class="ny-pile ny-pile--' + a[1] + '">' + bits + '</div>';
      } else if (kind === 'hang') {
        t = HANG[a[2]];
        out += k.pendant(ico(t[0], '', t[1]), { side: a[1], at: +a[3], len: +a[4], w: +a[5], cls: 'ny-pd ny-pd--' + a[2] });
      } else if (kind === 'curl') {
        side = a[1]; n = +a[2]; bits = '';
        for (i = 0; i < n; i++) bits += ico('ny-curl', 'ny-curl', CURL_VB, (side === 'l' ? 'left' : 'right') + ':' + (i * 20) + 'px;--w:' + (22 + (i % 2) * 4) + 'px;color:' + CURL_COLS[(i + (side === 'l' ? 0 : 2)) % CURL_COLS.length] + ';animation-delay:-' + (i * 1.7) + 's');
        out += '<div class="ny-curls ny-curls--' + side + '">' + bits + '</div>';
      } else if (kind === 'bal') {
        out += k.particles(+a[1], { id: ['ny-bal', 'ny-bal', 'ny-sbal'], colors: ['#ff5aa8', '#46dfff', '#a98aff', '#ffd25e', '#e8ecf8'], dir: 'rise', size: [34, 52], dur: [26, 42], drift: 50, sway: 22, spin: 0.03, opacity: [0.72, 0.95], seed: 700 + +a[2], mobile: 0.34, cls: 'ny-rise' });
      } else if (kind === 'conf') {
        out += k.particles(+a[1], { id: ['ny-cf', 'ny-rib', 'ny-tri', 'ny-ring', 'sk-dot', 'sk-star'], colors: CONF, size: [9, 17], dur: [13, 24], drift: 80, sway: 28, spin: 2, opacity: [0.5, 0.88], seed: 100 + +a[2], mobile: 0.5 });
      } else if (kind === 'rain') {
        out += k.particles(+a[1], { id: ['sk-star', 'ny-star', 'sk-sparkle'], colors: [C.gold, C.silver, '#ffffff', C.gold], size: [10, 20], dur: [15, 26], drift: 60, sway: 24, spin: 1, opacity: [0.55, 0.9], seed: 200 + +a[2], mobile: 0.5 });
      } else if (kind === 'twink') {
        side = a[1]; t = +a[2];
        out += k.twinkles(4, { id: ['sk-sparkle', 'sk-star', 'ny-glint'], size: [8, 17], dur: [2.6, 5], colors: STARS, seed: 300 + t, area: side === 'l' ? [0.5, 4.5] : [94.5, 99], areaY: [Math.max(2, t - 14), Math.min(97, t + 14)], mobile: 0.5, cls: 'sk-hide-m' });
      } else if (kind === 'spark') {
        out += sparklerBit(a[1], +a[2], +a[3]);
      } else if (kind === 'clock') {
        out += tickClock('ny-tick--' + a[1], (a[1] === 'l' ? 'left' : 'right') + ':0.8%;top:' + a[2] + '%;width:' + a[3] + 'px;--cd:-' + (+a[2] % 11) + 's');
      } else if (kind === 'fw') {
        out += '<div class="ny-fwx ny-fwx--' + a[1] + '" style="' + (a[1] === 'l' ? 'left' : 'right') + ':-2%;top:' + a[2] + '%;width:' + a[3] + 'px;color:' + C[a[5]] + '"><svg viewBox="0 0 200 200" aria-hidden="true" focusable="false"><use href="#ny-fw-' + a[4] + '"/></svg></div>';
      } else if (kind === 'tap') {
        t = TAPS[a[1]];
        out += k.tap(ico(t[0], '', t[1], t[3]), t[2], 'ny-tap ny-t-' + t[4] + ' ny-edge-' + a[2] + ' sk-hide-m', (a[2] === 'l' ? 'left' : 'right') + ':0.4%;top:' + a[3] + '%;width:' + a[4] + 'px');
      }
    });
    return out;
  }

  // ═══ The party stage above the footer ═════════════════════════════════════════════════════════════════════════════════
  function footer(k) {
    var signs = SAYINGS.map(function (s, i) { return '<div class="ny-sign ny-sign--' + i + '"><span>' + TITLES[i] + '</span><em>' + s + '</em></div>'; }).join('');
    var shots = function (side) {
      var r = rnd(side === 'l' ? 5 : 9), o = '', i, dx;
      for (i = 0; i < 8; i++) {
        dx = (side === 'l' ? -1 : 1) * (10 + r() * 80) * (r() < 0.25 ? -0.4 : 1);
        o += '<i class="ny-shot" style="--dx:' + f(dx) + 'px;--dy:-' + f(110 + r() * 90) + 'px;--r1:' + f((r() - 0.5) * 500) + 'deg;--r2:' + f((r() - 0.5) * 900) + 'deg;--dl:' + f(r() * 0.5) + 's;color:' + CONF[i % CONF.length] + '">' + ico(i % 3 === 0 ? 'ny-rib' : i % 3 === 1 ? 'ny-cf' : 'ny-tri') + '</i>';
      }
      return o;
    };
    var bunch = function (cols, ids) {
      var o = '<div class="ny-bunch">';
      ids.forEach(function (id, i) { o += ico(id, 'ny-bb ny-bb--' + i, id === 'ny-sbal' ? '0 0 60 100' : '0 0 50 80', 'color:' + cols[i % cols.length]); });
      return o + '</div>';
    };
    var beams = '';
    [[16, C.gold, 0], [38, '#ffffff', -3], [62, C.pink, -5], [84, C.cyan, -1.5]].forEach(function (b) { beams += '<i class="ny-beam" style="left:' + b[0] + '%;color:' + b[1] + ';animation-delay:' + b[2] + 's"></i><i class="ny-lamp" style="left:' + b[0] + '%;color:' + b[1] + '"></i>'; });
    var fy = '', ysf = String(YEAR), j;
    for (j = 0; j < ysf.length; j++) fy += '<use href="#ny-o' + ysf.charAt(j) + '" x="' + (j * 74) + '" y="0" width="80" height="120"/>';
    return '<div class="ny-fbg"></div><svg class="ny-fyear" viewBox="0 0 ' + (74 * (ysf.length - 1) + 80) + ' 120" aria-hidden="true" focusable="false">' + fy + '</svg><div class="ny-beams">' + beams + '</div>' +
      '<svg class="ny-gar ny-gar--light ny-fl" aria-hidden="true" focusable="false"><rect width="100%" height="100%" fill="url(#ny-g-lt-a0)"/></svg>' +
      '<svg class="ny-gar ny-gar--light ny-gar--c1 ny-fl" aria-hidden="true" focusable="false"><rect width="100%" height="100%" fill="url(#ny-g-lt-a1)"/></svg>' +
      '<svg class="ny-gar ny-gar--light ny-gar--c2 ny-fl" aria-hidden="true" focusable="false"><rect width="100%" height="100%" fill="url(#ny-g-lt-a2)"/></svg>' +
      '<div class="ny-props sk-props ny-props--l"><div class="ny-cannon">' + ico('ny-cannon', '', '0 0 60 124') + shots('l') + '</div>' + bunch([C.pink, C.gold, C.cyan], ['ny-bal', 'ny-sbal', 'ny-bal']) + '</div>' +
      '<div class="ny-signs sk-signs">' + signs + '</div>' +
      '<div class="ny-props sk-props ny-props--r">' + bunch([C.violet, C.gold, C.pink], ['ny-bal', 'ny-sbal', 'ny-bal']) + '<div class="ny-cannon ny-cannon--r">' + ico('ny-cannon', '', '0 0 60 124') + shots('r') + '</div></div>' +
      k.pendant(ico('ny-disco', '', '0 0 60 68'), { side: 'l', at: 50, len: 30, w: 58, delay: 2, cls: 'ny-fdisco' }) +
      k.twinkles(5, { id: ['sk-sparkle', 'ny-glint'], size: [9, 17], dur: [1.6, 3], colors: ['#ffffff', C.gold, C.cyan, C.pink], seed: 845, area: [45.5, 54.5], areaY: [16, 44], mobile: 0, cls: 'sk-hide-m' }) +
      '<div class="ny-floor"><i class="ny-sheen"></i></div>' +
      k.particles(4, { id: ['ny-bal', 'ny-sbal'], colors: ['#ff5aa8', '#46dfff', '#ffd25e', '#a98aff'], dir: 'rise', size: [32, 48], dur: [18, 30], drift: 40, sway: 22, spin: 0.03, opacity: [0.7, 0.95], seed: 810, mobile: 0.5, cls: 'ny-rise' }) +
      k.particles(7, { id: ['ny-cf', 'ny-rib', 'ny-tri', 'ny-ring', 'sk-dot'], colors: CONF, size: [9, 16], dur: [10, 18], drift: 70, sway: 26, spin: 2, opacity: [0.6, 0.95], seed: 820, mobile: 0.5 }) +
      k.twinkles(12, { id: ['sk-sparkle', 'ny-glint', 'sk-star'], size: [6, 13], dur: [1.8, 3.6], colors: STARS.concat([C.cyan, C.pink]), seed: 830, area: [1, 99], areaY: [70, 98], mobile: 0.5 }) +
      k.twinkles(5, { id: ['sk-sparkle', 'ny-glint'], size: [8, 16], dur: [2.5, 5], colors: STARS, seed: 840, area: [1, 99], areaY: [8, 40], mobile: 0.4 });
  }

  // A tap shows its bubble (the kit does that); these add a pop of the right kind.
  function onTap(el, k) {
    var c = ' ' + el.className + ' ';
    if (c.indexOf(' ny-t-pop ') > -1) {
      k.burst(el, { id: 'ny-cf', n: 18, colors: CONF, dist: [70, 170], size: [10, 17], ms: 1300 });
      k.burst(el, { id: 'sk-star', n: 9, colors: [C.gold, '#ffffff', C.pink], dist: [60, 150], size: [10, 18], ms: 1200 });
    } else if (c.indexOf(' ny-t-tower ') > -1) {
      k.burst(el, { id: 'sk-sparkle', n: 14, colors: [C.gold, '#ffffff', C.cyan, C.pink], dist: [60, 150], size: [12, 22], ms: 1300 });
      k.burst(el, { id: 'sk-star', n: 8, colors: [C.gold, C.silver], dist: [40, 110], size: [8, 14], ms: 1100 });
    } else if (c.indexOf(' ny-t-bal ') > -1) {
      k.burst(el, { id: 'sk-star', n: 10, colors: [C.gold, C.pink, C.cyan, C.violet], dist: [50, 130], size: [10, 18], ms: 1200 });
      k.burst(el, { id: 'ny-cf', n: 8, colors: CONF, dist: [40, 110], size: [8, 14], ms: 1100 });
    } else if (c.indexOf(' ny-tap ') > -1) {
      k.burst(el, { id: 'ny-cf', n: 7, colors: CONF, dist: [30, 80], size: [7, 12], ms: 1000 });
      k.burst(el, { id: 'sk-sparkle', n: 5, colors: [C.gold, '#ffffff'], dist: [24, 64], size: [8, 14], ms: 900 });
    }
  }

  // A layer that is off the screen stands still (and moves again as it comes into view), so the page stays light however many layers it has.
  // Without IntersectionObserver every layer simply keeps moving. Nothing is read or kept about the visitor.
  function init() {
    if (!window.IntersectionObserver) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { en.target.classList.toggle('ny-asleep', !en.isIntersecting); });
    }, { rootMargin: '160px 0px' });
    [].forEach.call(document.querySelectorAll('.ny-hero, .ny-sec, .ny-footer'), function (e) { io.observe(e); });
  }

  var T = {
    name: 'newyear', prefix: 'ny',
    meta: { bg: '#070a16', gold: '#f0d58a', emoji: '🎆', tapSay: Object.keys(SAY).map(function (key) { return SAY[key]; }), sayings: SAYINGS },
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
