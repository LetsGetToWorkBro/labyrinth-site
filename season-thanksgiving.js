/* Thanksgiving: the homepage's scene for all of November (index.html's <head> turns it on from the date and loads this with season-kit.css,
   season-kit.js and season-thanksgiving.css, which draws it). Warm brown and amber: leaves drifting down over the hero, geese crossing a harvest
   moon, a cornfield with pumpkins and hay along the foot of the hero, a layer behind every section (leaf garlands, acorns on strings, pumpkin
   patches, wheat, corn, a pie), and a harvest-table scene above the footer. Tap the turkey, a pumpkin or an acorn and it answers.
   Nothing here reads or writes anything about a visitor, and nothing is built unless the page is in the season. */
(function () {
  var C = { orange: '#e2761b', red: '#b8402a', yellow: '#f2c14e', rust: '#c9531e', amber: '#d9a62e', maroon: '#8a3a1c', green: '#6f8a2a', brown: '#7a4a22', cream: '#f7e9d0' };
  var LEAF_COLORS = [C.orange, C.red, C.yellow, C.rust, C.amber, C.maroon];

  // Shapes drawn once and reused with <use>: three leaves (they take their colour from `color`), acorn, pumpkin, gourd, corn, wheat, hay bale, pie, turkey, goose, cornstalk.
  var DEFS =
    '<symbol id="tg-maple" viewBox="0 0 100 100"><path d="M50 4L58 20L68 14L66 34L84 28L78 44L96 46L84 58L92 72L72 68L66 76L54 70L54 96L46 96L46 70L34 76L28 68L8 72L16 58L4 46L22 44L16 28L34 34L32 14L42 20Z" fill="currentColor"/>' +
      '<path d="M50 96V36M50 70L24 48M50 70L76 48M50 54L32 30M50 54L68 30" fill="none" stroke="#2a0f02" stroke-opacity=".28" stroke-width="2" stroke-linecap="round"/></symbol>' +
    '<symbol id="tg-oak" viewBox="0 0 60 100"><path d="M30 3C37 8 36 16 41 18C48 17 51 25 45 29C52 32 53 41 45 44C51 49 49 58 41 59C45 66 40 74 32 72L32 96L28 96L28 72C20 74 15 66 19 59C11 58 9 49 15 44C7 41 8 32 15 29C9 25 12 17 19 18C24 16 23 8 30 3Z" fill="currentColor"/>' +
      '<path d="M30 96V12M30 62L18 52M30 62L42 52M30 44L16 36M30 44L44 36M30 28L20 22M30 28L40 22" fill="none" stroke="#2a0f02" stroke-opacity=".28" stroke-width="1.8" stroke-linecap="round"/></symbol>' +
    '<symbol id="tg-aspen" viewBox="0 0 60 80"><path d="M30 2C52 22 56 52 30 74C4 52 8 22 30 2Z" fill="currentColor"/><path d="M30 74V80M30 70V14M30 56L18 44M30 56L42 44M30 40L21 30M30 40L39 30" fill="none" stroke="#2a0f02" stroke-opacity=".28" stroke-width="1.8" stroke-linecap="round"/></symbol>' +
    '<symbol id="tg-acorn" viewBox="0 0 40 62"><path d="M20 4V0" stroke="#5a3418" stroke-width="3" stroke-linecap="round"/><path d="M6 24H34C34 44 26 58 20 60C14 58 6 44 6 24Z" fill="#c98a3d"/><path d="M12 28C12 42 16 52 20 55" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width="3" stroke-linecap="round"/>' +
      '<path d="M3 26C2 12 12 5 20 5C28 5 38 12 37 26Z" fill="#7a4a22"/><path d="M8 14L14 24M16 9L22 24M25 9L31 24M32 14L36 22M7 22H35" stroke="#4d2c12" stroke-opacity=".7" stroke-width="1.6" fill="none" stroke-linecap="round"/></symbol>' +
    '<symbol id="tg-pumpkin" viewBox="0 0 100 90"><path d="M50 15C48 8 48 4 54 1C55 5 55 10 52 16Z" fill="#5b7a22"/>' +
      '<path d="M50 18C20 10 4 26 4 48C4 72 24 86 50 86S96 72 96 48C96 26 80 10 50 18Z" fill="#e2761b"/><path d="M50 18C36 24 30 40 30 52S36 80 50 86C64 80 70 64 70 52S64 24 50 18Z" fill="#f08a2c"/>' +
      '<path d="M50 18V86M30 24C20 34 18 62 30 80M70 24C80 34 82 62 70 80" fill="none" stroke="#a9500c" stroke-opacity=".7" stroke-width="2" stroke-linecap="round"/>' +
      '<path d="M52 16C62 8 74 10 78 18C70 16 62 18 52 16Z" fill="#6b8f2a"/><path d="M56 15C62 22 60 28 54 28" fill="none" stroke="#6b8f2a" stroke-width="2" stroke-linecap="round"/></symbol>' +
    '<symbol id="tg-gourd" viewBox="0 0 60 70"><path d="M30 10C28 6 28 3 32 1" fill="none" stroke="#5b7a22" stroke-width="3" stroke-linecap="round"/>' +
      '<path d="M30 9C20 9 8 22 8 42C8 58 18 67 30 67S52 58 52 42C52 22 40 9 30 9Z" fill="#d9a62e"/><path d="M30 9C24 14 22 28 22 42S24 62 30 67C36 62 38 54 38 42S36 14 30 9Z" fill="#e8bd4a"/>' +
      '<path d="M18 16C12 28 12 50 20 62M42 16C48 28 48 50 40 62" fill="none" stroke="#6b8f2a" stroke-opacity=".75" stroke-width="3" stroke-linecap="round"/></symbol>' +
    '<symbol id="tg-corn" viewBox="0 0 50 124"><path d="M25 6C39 18 43 58 25 104C7 58 11 18 25 6Z" fill="#f2c14e"/><path d="M25 6C32 30 32 70 25 104C18 70 18 30 25 6Z" fill="#f8d56e"/>' +
      '<path d="M15 30H35M13 46H37M13 62H37M15 78H35M18 92H32M25 8V104" stroke="#c98a1c" stroke-opacity=".55" stroke-width="1.5" fill="none"/>' +
      '<path d="M25 108C8 98 2 76 8 52C14 72 20 88 25 108Z" fill="#7a9a2a"/><path d="M25 108C42 98 48 76 42 52C36 72 30 88 25 108Z" fill="#6b8a22"/><path d="M25 108C20 96 22 78 25 66C28 78 30 96 25 108Z" fill="#8bab34"/>' +
      '<path d="M25 108V122" stroke="#5b7a22" stroke-width="4" stroke-linecap="round"/></symbol>' +
    '<symbol id="tg-wheat" viewBox="0 0 70 130"><g fill="none" stroke="#b98a3a" stroke-width="2.4" stroke-linecap="round"><path d="M35 130V24"/><path d="M33 130C28 100 18 70 16 28"/><path d="M37 130C42 100 52 70 54 28"/></g>' +
      '<g fill="#e8bd4a"><path d="M35 4C40 10 40 18 35 24C30 18 30 10 35 4Z"/><path d="M28 14C34 16 36 24 34 30C28 28 26 20 28 14ZM42 14C36 16 34 24 36 30C42 28 44 20 42 14Z"/><path d="M28 30C34 32 36 40 34 46C28 44 26 36 28 30ZM42 30C36 32 34 40 36 46C42 44 44 36 42 30Z"/>' +
      '<path d="M16 6C21 12 21 20 16 26C11 20 11 12 16 6Z"/><path d="M10 16C16 18 18 26 16 32C10 30 8 22 10 16ZM22 16C16 18 14 26 16 32C22 30 24 22 22 16Z"/>' +
      '<path d="M54 6C59 12 59 20 54 26C49 20 49 12 54 6Z"/><path d="M48 16C54 18 56 26 54 32C48 30 46 22 48 16ZM60 16C54 18 52 26 54 32C60 30 62 22 60 16Z"/></g>' +
      '<path d="M26 112C32 106 38 106 44 112L46 120H24Z" fill="#8a5a2a"/><path d="M24 112H46" stroke="#5c3a17" stroke-width="3" stroke-linecap="round"/></symbol>' +
    '<symbol id="tg-hay" viewBox="0 0 90 64"><rect x="3" y="6" width="84" height="54" rx="9" fill="#d9a62e"/><rect x="3" y="6" width="84" height="20" rx="9" fill="#e8bd4a"/>' +
      '<path d="M12 18H40M52 14H80M10 34H34M46 30H78M16 48H46M58 46H82" stroke="#a97a1c" stroke-width="2.4" stroke-linecap="round" fill="none"/>' +
      '<path d="M28 6V60M62 6V60" stroke="#7a4a22" stroke-width="5"/><path d="M6 2L12 10M16 0L20 8M70 1L76 9M80 2L84 10" stroke="#e8bd4a" stroke-width="2.6" stroke-linecap="round"/></symbol>' +
    '<symbol id="tg-pie" viewBox="0 0 90 64"><path d="M4 50L84 22L84 50Z" fill="#b97a34"/><path d="M4 50L84 22L84 40L4 50Z" fill="#e2761b"/><path d="M4 50L84 22" stroke="#d9a62e" stroke-width="5" stroke-linecap="round"/>' +
      '<path d="M4 50H84V56C84 60 80 62 76 62H12C8 62 4 60 4 56Z" fill="#d9a85a"/><path d="M10 56H78" stroke="#a9722c" stroke-width="2" stroke-linecap="round" stroke-dasharray="6 5"/>' +
      '<path d="M22 40C16 28 28 20 34 26C38 16 52 18 50 30C58 28 62 38 52 40Z" fill="#fff6e0"/></symbol>' +
    '<symbol id="tg-goose" viewBox="0 0 64 28"><path d="M3 21Q17 2 32 18Q47 2 61 21" fill="none" stroke="currentColor" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/></symbol>' +
    '<symbol id="tg-stalk" viewBox="0 0 70 180"><path d="M35 180C36 130 34 70 36 12" fill="none" stroke="#5b6a22" stroke-width="5" stroke-linecap="round"/>' +
      '<path d="M35 150C20 140 8 124 4 104C20 112 30 130 35 150ZM35 120C50 110 62 94 66 74C50 82 40 100 35 120ZM36 92C24 80 14 66 12 48C26 56 34 72 36 92ZM36 64C48 52 56 40 56 22C44 30 38 44 36 64Z" fill="#6b7a2a"/>' +
      '<path d="M36 126C48 126 52 112 48 98C44 108 38 116 36 126Z" fill="#c9a23a"/></symbol>' +
    '<symbol id="tg-turkey" viewBox="0 0 190 176">' +
      '<g transform="translate(95 108)">' +
        '<g transform="rotate(-84)"><path d="M0 0C-16-36-14-78 0-92C14-78 16-36 0 0Z" fill="' + C.maroon + '"/></g><g transform="rotate(-56)"><path d="M0 0C-17-40-15-86 0-100C15-86 17-40 0 0Z" fill="' + C.red + '"/></g>' +
        '<g transform="rotate(-28)"><path d="M0 0C-18-44-16-92 0-106C16-92 18-44 0 0Z" fill="' + C.orange + '"/></g><g transform="rotate(0)"><path d="M0 0C-18-46-16-96 0-110C16-96 18-46 0 0Z" fill="' + C.yellow + '"/></g>' +
        '<g transform="rotate(28)"><path d="M0 0C-18-44-16-92 0-106C16-92 18-44 0 0Z" fill="' + C.orange + '"/></g><g transform="rotate(56)"><path d="M0 0C-17-40-15-86 0-100C15-86 17-40 0 0Z" fill="' + C.red + '"/></g>' +
        '<g transform="rotate(84)"><path d="M0 0C-16-36-14-78 0-92C14-78 16-36 0 0Z" fill="' + C.maroon + '"/></g>' +
        '<g fill="none" stroke="#2a0f02" stroke-opacity=".25" stroke-width="2"><path d="M0-34V-84" transform="rotate(0)"/><path d="M0-34V-80" transform="rotate(-28)"/><path d="M0-34V-80" transform="rotate(28)"/><path d="M0-34V-74" transform="rotate(-56)"/><path d="M0-34V-74" transform="rotate(56)"/></g>' +
      '</g>' +
      '<path d="M78 138L74 164M112 138L116 164" stroke="#d9a62e" stroke-width="5" stroke-linecap="round"/><path d="M66 166H82M110 166H126" stroke="#d9a62e" stroke-width="5" stroke-linecap="round"/>' +
      '<ellipse cx="95" cy="116" rx="42" ry="36" fill="#7a4a22"/><path d="M62 112C66 134 84 146 104 144C88 134 80 122 82 106Z" fill="#5a3418"/>' +
      '<path d="M84 104C94 100 108 104 112 116C100 112 90 114 84 104Z" fill="#a0662e"/>' +
      '<circle cx="95" cy="76" r="17" fill="#8a5428"/><path d="M96 80C108 80 114 90 108 100C100 98 96 92 96 80Z" fill="#d1402f"/>' +
      '<path d="M104 70L120 74L104 80Z" fill="' + C.yellow + '"/><circle cx="100" cy="70" r="4.2" fill="#fff"/><circle cx="101" cy="70.4" r="2.1" fill="#1a0b05"/>' +
      '<path d="M90 60C92 54 98 54 100 58" fill="none" stroke="#5a3418" stroke-width="3" stroke-linecap="round"/>' +
    '</symbol>';

  // A tiny maze of cornstalks, pumpkins and bales along the foot of the hero.
  function field(k) {
    var r = k.rng(7), out = '<svg viewBox="0 0 1440 240" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">' +
      '<path d="M0 118Q240 96 480 112T960 106T1440 114V240H0Z" fill="#1e1308"/>';
    var x, i, w;
    for (x = -20, i = 0; x < 1460; x += 52 + r() * 22, i++) { w = 58 + r() * 24; out += '<use href="#tg-stalk" x="' + x.toFixed(0) + '" y="' + (50 + r() * 22).toFixed(0) + '" width="' + w.toFixed(0) + '" height="' + (w * 2.57).toFixed(0) + '" opacity=".5" style="color:#3a2a10"/>'; }
    out += '<path d="M0 156Q200 140 420 150T860 146T1440 152V240H0Z" fill="#251709"/>';
    for (x = 10, i = 0; x < 1440; x += 72 + r() * 40, i++) { w = 64 + r() * 26; out += '<use href="#tg-stalk" x="' + x.toFixed(0) + '" y="' + (74 + r() * 26).toFixed(0) + '" width="' + w.toFixed(0) + '" height="' + (w * 2.57).toFixed(0) + '" opacity=".92"/>'; }
    out += '<path d="M0 196Q260 182 520 192T1040 188T1440 194V240H0Z" fill="#150c07"/>';
    [[236, 150, 96, 'tg-pumpkin', 86], [350, 176, 52, 'tg-gourd', 61], [560, 164, 120, 'tg-hay', 86], [806, 156, 90, 'tg-pumpkin', 81], [908, 176, 54, 'tg-gourd', 63], [1040, 166, 112, 'tg-hay', 80], [150, 182, 70, 'tg-hay', 50]]
      .forEach(function (p) { out += '<use href="#' + p[3] + '" x="' + p[0] + '" y="' + p[1] + '" width="' + p[2] + '" height="' + p[4] + '"/>'; });
    return out + '</svg>';
  }

  // The hero: a low sun, a harvest moon, two skeins of geese, leaves coming down, the field, and a turkey and two pumpkins that answer a tap.
  function hero(k) {
    var geese = function (cls) { return '<div class="tg-geese ' + cls + '">' + [[0, 0], [34, 16], [-34, 16], [68, 34], [-68, 34]].map(function (g) { return '<svg class="tg-goose" style="left:' + g[0] + 'px;top:' + g[1] + 'px" viewBox="0 0 64 28" aria-hidden="true"><use href="#tg-goose"/></svg>'; }).join('') + '</div>'; };
    return '<div class="tg-glow"></div><div class="tg-moon"></div>' + geese('tg-geese--1') + geese('tg-geese--2') +
      k.particles(30, { id: ['tg-maple', 'tg-oak', 'tg-aspen'], colors: LEAF_COLORS, size: [22, 48], dur: [14, 26], drift: 140, sway: 40, seed: 11, mobile: 0.5, opacity: [0.75, 1] }) +
      '<div class="tg-field">' + field(k) + '</div>' +
      k.tap(k.use('tg-turkey', '', '0 0 190 176'), 'Gobble gobble!', 'tg-turkey', 'right:4%;bottom:7px;width:clamp(86px,12vw,158px)') +
      k.tap(k.use('tg-pumpkin', '', '0 0 100 90'), 'Pie time!', 'tg-pump-tap', 'left:3%;bottom:6px;width:clamp(50px,7vw,92px)') +
      k.tap(k.use('tg-acorn', '', '0 0 40 62'), 'Nuts!', 'tg-acorn-tap', 'right:2%;top:44%;width:clamp(22px,3vw,40px)');
  }

  // A layer behind each section, different on every one so the page does not repeat itself.
  var SECTIONS = {
    eventStrip:     ['garland', 'pile:l:pumpkin,gourd,maple', 'acorns:r:3:70:30', 'leaves:5:1'],
    programs:       ['garland', 'pile:l:corn,pumpkin', 'acorns:r:2:96:32', 'tap:turkey:r:56:56', 'leaves:4:2', 'geese:14'],
    competition:    ['garland', 'pile:r:wheat,pumpkin,gourd', 'acorns:l:1.2:80:30', 'leaves:5:3', 'pile:l:hay'],
    coaches:        ['garland', 'pile:r:pumpkin,corn', 'acorns:l:4:110:32', 'tap:pumpkin:l:30:54', 'leaves:4:4'],
    gallery:        ['garland', 'pile:l:hay,pumpkin,maple', 'pile:r:wheat,gourd', 'geese:10', 'acorns:r:2.5:70:30', 'leaves:3:5'],
    'belt-journey': ['garland', 'pile:r:pie,gourd', 'acorns:r:3:104:34', 'tap:acorn:l:22:34', 'leaves:5:6', 'pile:l:corn'],
    locations:      ['garland', 'pile:l:pumpkin,wheat', 'tap:turkey:r:40:56', 'acorns:r:2:84:30', 'leaves:4:7'],
    faq:            ['garland', 'pile:r:hay,gourd,oak', 'acorns:l:1.5:100:32', 'geese:40', 'leaves:5:8'],
    schedule:       ['garland', 'pile:l:corn,gourd', 'tap:pumpkin:r:68:54', 'pile:r:pumpkin,hay', 'acorns:r:3.5:76:30', 'leaves:4:9'],
    testimonials:   ['garland', 'pile:l:wheat,pumpkin', 'pile:r:pie,maple', 'acorns:l:2:90:32', 'tap:acorn:r:46:34', 'leaves:3:10'],
    pricing:        ['garland', 'pile:r:pumpkin,corn,gourd', 'acorns:r:2.5:110:34', 'geese:16', 'leaves:5:11'],
    contact:        ['garland', 'tap:turkey:l:26:56', 'pile:l:hay,pumpkin,wheat', 'pile:r:corn,pumpkin,gourd', 'acorns:r:4:90:30', 'leaves:4:12']
  };
  var ITEMS = { pumpkin: ['tg-pumpkin', '0 0 100 90'], gourd: ['tg-gourd', '0 0 60 70'], maple: ['tg-maple', '0 0 100 100'], oak: ['tg-oak', '0 0 60 100'], corn: ['tg-corn', '0 0 50 124'],
    wheat: ['tg-wheat', '0 0 70 130'], hay: ['tg-hay', '0 0 90 64'], pie: ['tg-pie', '0 0 90 64'], acorn: ['tg-acorn', '0 0 40 62'] };
  var TAPS = { turkey: ['tg-turkey', '0 0 190 176', 'Gobble gobble!'], pumpkin: ['tg-pumpkin', '0 0 100 90', 'Pie time!'], acorn: ['tg-acorn', '0 0 40 62', 'Nuts!'] };

  function section(specs, k) {
    var out = '';
    specs.forEach(function (spec) {
      var a = spec.split(':'), kind = a[0];
      if (kind === 'garland') {
        out += '<div class="tg-garland"></div>';
      } else if (kind === 'pile') {
        var bits = '';
        a[2].split(',').forEach(function (it) { var d = ITEMS[it]; if (d) bits += k.use(d[0], 'tg-i tg-i--' + it, d[1]); });
        out += '<div class="tg-pile tg-pile--' + a[1] + '">' + bits + '</div>';
      } else if (kind === 'acorns') {
        out += k.pendant(k.use('tg-acorn', '', '0 0 40 62'), { side: a[1], at: a[2], len: +a[3], w: +a[4] });
      } else if (kind === 'leaves') {
        out += k.particles(+a[1], { id: ['tg-maple', 'tg-oak', 'tg-aspen'], colors: LEAF_COLORS, size: [12, 24], dur: [16, 30], drift: 90, sway: 30, seed: 100 + +a[2], mobile: 0.5, opacity: [0.5, 0.9] });
      } else if (kind === 'tap') {
        var t = TAPS[a[1]];
        out += k.tap(k.use(t[0], '', t[1]), t[2], 'tg-tap tg-tap--' + a[1] + ' sk-hide-m', (a[2] === 'l' ? 'left' : 'right') + ':0.4%;top:' + a[3] + '%;width:' + a[4] + 'px');
      } else if (kind === 'geese') {
        out += k.flyers(3, { id: 'tg-goose', vb: '0 0 64 28', top: [+a[1] - 4, +a[1] + 5], size: [22, 40], dur: [24, 36], wave: 20, flap: true, colors: ['rgba(247,233,208,.7)'], seed: 500 + +a[1], mobile: 0.67 });
      }
    });
    return out;
  }

  // The harvest table above the footer: four signs on posts between a pumpkin patch, a turkey and a hay bale.
  var SAYINGS = ['for every training partner', 'your best, every class', 'after class, not before', 'then go roll'];
  var TITLES = ['THANKS', 'GIVING', 'PIE', 'GOBBLE'];
  function footer(k) {
    var planks = SAYINGS.map(function (s, i) { return '<div class="tg-plank"><span>' + TITLES[i] + '</span><em>' + s + '</em></div>'; }).join('');
    return '<div class="tg-props sk-props tg-props--l">' + k.use('tg-corn', 'tg-i tg-i--corn', '0 0 50 124') + k.use('tg-pumpkin', 'tg-i tg-i--pumpkin', '0 0 100 90') + k.use('tg-gourd', 'tg-i tg-i--gourd', '0 0 60 70') + '</div>' +
      '<div class="tg-planks sk-signs">' + planks + '</div>' +
      '<div class="tg-props sk-props tg-props--r">' + k.use('tg-hay', 'tg-i tg-i--hay', '0 0 90 64') + k.use('tg-turkey', 'tg-i tg-i--turkey', '0 0 190 176') + k.use('tg-pie', 'tg-i tg-i--pie', '0 0 90 64') + '</div>' +
      '<div class="tg-ground"></div>' +
      k.particles(6, { id: ['tg-maple', 'tg-oak', 'tg-aspen'], colors: LEAF_COLORS, size: [12, 22], dur: [12, 20], drift: 70, sway: 24, seed: 300, mobile: 0.5, opacity: [0.6, 0.9] });
  }

  var T = {
    name: 'thanksgiving', prefix: 'tg',
    meta: { bg: '#150c07', gold: '#f0a23c', emoji: '🦃', tapSay: ['Gobble gobble!', 'Pie time!', 'Nuts!'], sayings: SAYINGS },
    defs: DEFS,
    hero: hero,
    sections: {},
    footer: footer
  };
  Object.keys(SECTIONS).forEach(function (id) { T.sections[id] = function (k) { return section(SECTIONS[id], k); }; });
  (window.SeasonKit ? window.SeasonKit.mount : function (t) { (window.__skq = window.__skq || []).push(t); })(T);
})();
