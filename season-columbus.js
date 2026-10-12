/* Columbus Day: the homepage's scene, for Monday, October 12, 2026 only.
   Loaded by index.html's <head> when <html data-season="columbus"> (and never otherwise), together with season-columbus.css, which
   draws it. This builds the decoration: the sea and the caravels along the hero, a layer behind every section, the harbour above
   the footer, and the tap that makes a spyglass call Land ho! All of it is aria-hidden and sits behind the content. Nothing here
   reads or writes anything about a visitor, and nothing is built unless the page is in the season. */
(function () {
  if (document.documentElement.getAttribute('data-season') !== 'columbus') return;

  var GOLD = '#e2b85a', GOLD2 = '#c99a3d', CREAM = '#f4f1e8', RED = '#d1303f', NAVY = '#07112b', WOOD = '#8a5a2b', WOOD2 = '#5c3a17';

  // Shapes drawn once and reused with <use>: ship, gull, lantern, spyglass, anchor, barrel, crate, flag, rope, star, compass.
  var DEFS = '<svg class="cd-defs" width="0" height="0" aria-hidden="true" focusable="false"><defs>' +
    '<symbol id="cd-ship" viewBox="-14 0 318 232">' +
      '<path d="M18,150 L286,150 L270,192 Q152,216 58,194 Z" fill="' + GOLD + '"/>' +
      '<path d="M236,116 L288,116 L286,150 L236,150 Z" fill="' + GOLD + '"/><path d="M18,133 L58,133 L58,150 L18,150 Z" fill="' + GOLD + '"/>' +
      '<path d="M60,176 Q152,198 262,174" fill="none" stroke="' + NAVY + '" stroke-opacity=".35" stroke-width="3"/>' +
      '<g stroke="' + GOLD + '" stroke-width="5" stroke-linecap="round"><line x1="70" y1="150" x2="70" y2="40"/><line x1="156" y1="150" x2="156" y2="12"/><line x1="244" y1="116" x2="244" y2="62"/><line x1="22" y1="138" x2="-8" y2="112"/></g>' +
      '<g stroke="' + GOLD + '" stroke-width="4" stroke-linecap="round"><line x1="36" y1="56" x2="104" y2="56"/><line x1="112" y1="26" x2="200" y2="26"/></g>' +
      '<path d="M40,58 Q70,68 100,58 L102,112 Q70,126 38,112 Z" fill="' + CREAM + '"/><path d="M116,28 Q156,40 196,28 L204,106 Q156,124 108,106 Z" fill="' + CREAM + '"/><path d="M244,64 L290,114 L208,114 Z" fill="' + CREAM + '"/>' +
      '<g stroke="' + NAVY + '" stroke-opacity=".22" stroke-width="2"><line x1="42" y1="78" x2="100" y2="78"/><line x1="40" y1="96" x2="102" y2="96"/><line x1="118" y1="54" x2="194" y2="54"/><line x1="114" y1="76" x2="198" y2="76"/><line x1="110" y1="94" x2="202" y2="94"/></g>' +
      '<path d="M156,12 L194,21 L156,30 Z" fill="' + RED + '"/><path d="M70,40 L98,47 L70,54 Z" fill="' + RED + '"/><path d="M244,62 L272,69 L244,76 Z" fill="' + RED + '"/>' +
    '</symbol>' +
    '<symbol id="cd-gull" viewBox="0 0 64 28"><path d="M3 21Q17 2 32 18Q47 2 61 21" fill="none" stroke="currentColor" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/></symbol>' +
    '<symbol id="cd-lantern" viewBox="0 0 40 78">' +
      '<circle cx="20" cy="5" r="4" fill="none" stroke="' + GOLD2 + '" stroke-width="2.5"/><path d="M10 18L14 10H26L30 18Z" fill="' + GOLD2 + '"/>' +
      '<path d="M11 18H29L31 54H9Z" fill="#ffd978"/><path d="M15 22H25L26 50H14Z" fill="#fff3c4"/><path d="M11 18L9 54M29 18L31 54M20 18V54" stroke="' + GOLD2 + '" stroke-width="2"/>' +
      '<path d="M7 54H33L30 62H10Z" fill="' + GOLD2 + '"/><circle cx="20" cy="67" r="3.5" fill="' + GOLD2 + '"/>' +
    '</symbol>' +
    '<symbol id="cd-spyglass" viewBox="0 0 124 50">' +
      '<rect x="70" y="8" width="44" height="34" rx="6" fill="' + GOLD + '"/><rect x="38" y="13" width="36" height="24" rx="5" fill="' + GOLD2 + '"/><rect x="8" y="17" width="34" height="16" rx="4" fill="#b0832f"/><rect x="0" y="19" width="10" height="12" rx="3" fill="#7a5a1f"/>' +
      '<ellipse cx="114" cy="25" rx="5" ry="17" fill="#9fd3ff" opacity=".85"/><path d="M72 13H110" stroke="' + CREAM + '" stroke-opacity=".55" stroke-width="3" stroke-linecap="round"/>' +
      '<path d="M72 8V42M40 13V37M26 17V33" stroke="' + NAVY + '" stroke-opacity=".4" stroke-width="2"/>' +
    '</symbol>' +
    '<symbol id="cd-anchor" viewBox="0 0 80 100">' +
      '<circle cx="40" cy="12" r="8" fill="none" stroke="' + GOLD + '" stroke-width="5"/><path d="M40 20V88M22 32H58M12 62Q14 92 40 92Q66 92 68 62" fill="none" stroke="' + GOLD + '" stroke-width="6" stroke-linecap="round"/>' +
      '<path d="M5 66L19 56V74ZM75 66L61 56V74Z" fill="' + GOLD + '"/>' +
    '</symbol>' +
    '<symbol id="cd-barrel" viewBox="0 0 60 72">' +
      '<path d="M10 6Q-2 36 10 66H50Q62 36 50 6Z" fill="' + WOOD + '" stroke="' + WOOD2 + '" stroke-width="2"/><ellipse cx="30" cy="6" rx="20" ry="5" fill="#a77438"/>' +
      '<path d="M22 8Q18 36 22 66M38 8Q42 36 38 66" fill="none" stroke="' + WOOD2 + '" stroke-width="1.5" opacity=".6"/><path d="M5 20Q30 27 55 20M2 36Q30 44 58 36M5 52Q30 59 55 52" fill="none" stroke="' + GOLD + '" stroke-width="3.5"/>' +
    '</symbol>' +
    '<symbol id="cd-crate" viewBox="0 0 64 60">' +
      '<rect x="4" y="6" width="56" height="48" rx="3" fill="#a77438" stroke="' + WOOD2 + '" stroke-width="2.5"/><path d="M4 22H60M4 38H60" stroke="' + WOOD2 + '" stroke-width="2"/><path d="M8 10L56 50M56 10L8 50" stroke="' + WOOD2 + '" stroke-width="3" opacity=".7"/>' +
      '<circle cx="9" cy="11" r="1.6" fill="' + CREAM + '"/><circle cx="55" cy="11" r="1.6" fill="' + CREAM + '"/><circle cx="9" cy="49" r="1.6" fill="' + CREAM + '"/><circle cx="55" cy="49" r="1.6" fill="' + CREAM + '"/>' +
    '</symbol>' +
    '<symbol id="cd-flag" viewBox="0 0 74 104">' +
      '<rect x="5" y="0" width="4" height="104" rx="2" fill="#d9d4c3"/><circle cx="7" cy="4" r="4" fill="' + GOLD + '"/>' +
      '<g class="cd-flagcloth"><rect x="10" y="8" width="60" height="6" fill="' + RED + '"/><rect x="10" y="14" width="60" height="6" fill="' + CREAM + '"/><rect x="10" y="20" width="60" height="6" fill="' + RED + '"/><rect x="10" y="26" width="60" height="6" fill="' + CREAM + '"/><rect x="10" y="32" width="60" height="6" fill="' + RED + '"/><rect x="10" y="38" width="60" height="6" fill="' + CREAM + '"/><rect x="10" y="44" width="60" height="6" fill="' + RED + '"/>' +
      '<rect x="10" y="8" width="26" height="24" fill="#17306a"/><g fill="' + CREAM + '"><circle cx="16" cy="14" r="1.8"/><circle cx="23" cy="14" r="1.8"/><circle cx="30" cy="14" r="1.8"/><circle cx="19.5" cy="21" r="1.8"/><circle cx="26.5" cy="21" r="1.8"/><circle cx="16" cy="27" r="1.8"/><circle cx="23" cy="27" r="1.8"/><circle cx="30" cy="27" r="1.8"/></g></g>' +
    '</symbol>' +
    '<symbol id="cd-rope" viewBox="0 0 64 32"><g fill="none" stroke="#cdb27a" stroke-width="5"><ellipse cx="32" cy="18" rx="28" ry="11"/><ellipse cx="32" cy="18" rx="19" ry="7"/><ellipse cx="32" cy="18" rx="10" ry="3.5"/></g></symbol>' +
    '<symbol id="cd-star" viewBox="0 0 20 20"><path d="M10 0L12.5 7.5L20 10L12.5 12.5L10 20L7.5 12.5L0 10L7.5 7.5Z" fill="currentColor"/></symbol>' +
    '<symbol id="cd-compass" viewBox="-104 -112 208 216">' +
      '<g fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><circle r="97"/><circle r="78"/><circle r="50"/>' + compassTicks() + '</g>' +
      '<g fill="currentColor"><polygon points="0,-62 7,-7 0,0 -7,-7" transform="rotate(45)"/><polygon points="0,-62 7,-7 0,0 -7,-7" transform="rotate(135)"/><polygon points="0,-62 7,-7 0,0 -7,-7" transform="rotate(225)"/><polygon points="0,-62 7,-7 0,0 -7,-7" transform="rotate(315)"/>' +
      '<polygon points="0,-93 11,-11 0,0 -11,-11"/><polygon points="0,-93 11,-11 0,0 -11,-11" transform="rotate(90)"/><polygon points="0,-93 11,-11 0,0 -11,-11" transform="rotate(180)"/><polygon points="0,-93 11,-11 0,0 -11,-11" transform="rotate(270)"/><circle r="5"/></g>' +
    '</symbol>' +
  '</defs></svg>';

  function compassTicks() {
    var out = '';
    for (var i = 0; i < 24; i++) {
      var a = i * 15 * Math.PI / 180, r1 = i % 6 === 0 ? 82 : 89, r2 = 97;
      out += '<line x1="' + (r1 * Math.sin(a)).toFixed(1) + '" y1="' + (-r1 * Math.cos(a)).toFixed(1) + '" x2="' + (r2 * Math.sin(a)).toFixed(1) + '" y2="' + (-r2 * Math.cos(a)).toFixed(1) + '"/>';
    }
    return out;
  }
  function use(id, cls, vb) { return '<svg class="' + cls + '" viewBox="' + vb + '" aria-hidden="true"><use href="#' + id + '"/></svg>'; }
  function wave(y, amp) { return 'M0 ' + y + ' q 90 ' + (-amp) + ' 180 0' + ' t 180 0'.repeat(13) + ' V200 H0 Z'; }
  function lookout(cls, style) {
    return '<button type="button" class="cd-lookout ' + cls + '" tabindex="-1" data-land' + (style ? ' style="' + style + '"' : '') + '>' + use('cd-spyglass', '', '0 0 124 50') + '<span class="cd-bubble">Land ho!</span></button>';
  }

  // The hero: the sun behind the water, a slow compass, stars, three gulls, three spyglasses, and the sea with its fleet.
  function hero() {
    var stars = '';
    [[6, 11, 12, 3.6, 0], [14, 6, 16, 4.4, -1.2], [24, 14, 10, 3.2, -2.1], [33, 8, 14, 5, -0.6], [47, 12, 12, 4, -3], [58, 7, 16, 3.8, -1.8], [66, 16, 10, 4.6, -2.6],
     [74, 9, 14, 3.4, -0.9], [83, 13, 12, 5.2, -3.4], [90, 6, 16, 4.2, -1.5], [95, 18, 10, 3.6, -2.8], [40, 20, 10, 4.8, -0.3]].forEach(function (s) {
      stars += '<i class="cd-twinkle" style="left:' + s[0] + '%;top:' + s[1] + '%;--s:' + s[2] + 'px;--d:' + s[3] + 's;--o:' + s[4] + 's">' + use('cd-star', '', '0 0 20 20') + '</i>';
    });
    return '<div class="cd-hero" aria-hidden="true">' +
      '<div class="cd-sun"></div>' +
      use('cd-compass', 'cd-compass cd-compass--hero', '-104 -112 208 216') +
      stars +
      use('cd-gull', 'cd-gull cd-gull--1', '0 0 64 28') + use('cd-gull', 'cd-gull cd-gull--2', '0 0 64 28') + use('cd-gull', 'cd-gull cd-gull--3', '0 0 64 28') +
      lookout('cd-lookout--1') + lookout('cd-lookout--2') + lookout('cd-lookout--3') +
      '<div class="cd-sea"><svg viewBox="0 0 1440 200" preserveAspectRatio="xMidYMax slice">' +
        '<g class="cd-wave cd-wave--b"><path d="' + wave(120, 24) + '" fill="#12306e" opacity=".8"/></g>' +
        '<g class="cd-fleet">' +
          '<g class="cd-ship-s"><use href="#cd-ship" x="150" y="22" width="190" height="139"/></g>' +
          '<g class="cd-ship-s cd-ship-s--b"><use href="#cd-ship" x="660" y="52" width="130" height="95"/></g>' +
          '<g class="cd-ship-s cd-ship-s--c"><use href="#cd-ship" x="1080" y="30" width="170" height="124"/></g>' +
        '</g>' +
        '<g class="cd-wave"><path d="' + wave(142, 22) + '" fill="#0c2255"/><path d="' + wave(142, 22).replace(' V200 H0 Z', '') + '" fill="none" stroke="' + CREAM + '" stroke-opacity=".3" stroke-width="3"/></g>' +
        '<path d="M0 172 q 120 -18 240 0 t 240 0 t 240 0 t 240 0 t 240 0 t 240 0 V200 H0 Z" fill="' + NAVY + '"/>' +
      '</svg></div>' +
    '</div>';
  }

  // A layer behind each section, different on every one so the page does not repeat itself.
  var SECTIONS = {
    eventStrip:     ['compass:l', 'lantern:r:3:70:34', 'gulls:18'],
    programs:       ['compass:l', 'lantern:r:2:96:36', 'lookout:l:34:56:0', 'dock:r:barrel,anchor', 'stars:l:72', 'bunting'],
    competition:    ['compass:r', 'lantern:l:1.2:80:34', 'gulls:12', 'dock:l:crate,barrel,rope', 'lookout:r:58:56:2', 'bunting'],
    coaches:        ['compass:l', 'lookout:r:18:56:1', 'dock:r:barrel,flag', 'lantern:r:4:120:38', 'gulls:70', 'bunting'],
    gallery:        ['compass:l', 'compass:r', 'gulls:10', 'lookout:l:62:56:3', 'dock:l:barrel,anchor,crate', 'lantern:r:2.5:70:32', 'bunting'],
    'belt-journey': ['compass:r', 'lantern:r:3:110:38', 'stars:r:52', 'dock:l:flag,barrel', 'lookout:l:20:56:0', 'bunting'],
    locations:      ['compass:l', 'lookout:r:40:56:2', 'dock:l:flag,crate,barrel', 'lantern:r:2:84:34', 'bunting'],
    faq:            ['compass:r', 'lantern:l:1.5:100:36', 'stars:r:30', 'gulls:40', 'dock:r:anchor,barrel', 'bunting'],
    schedule:       ['compass:l', 'lookout:l:72:56:1', 'dock:r:barrel,barrel,rope', 'lantern:r:3.5:76:32', 'bunting'],
    testimonials:   ['compass:l', 'compass:r', 'lantern:l:2:90:34', 'lookout:r:44:56:3', 'dock:l:anchor,barrel', 'bunting'],
    pricing:        ['compass:l', 'gulls:16', 'dock:r:barrel,flag,barrel', 'lantern:r:2.5:110:38', 'stars:l:60', 'bunting'],
    contact:        ['compass:r', 'lookout:l:30:56:0', 'lookout:r:55:56:2', 'dock:l:barrel,rope,crate', 'dock:r:anchor,barrel,barrel', 'lantern:r:4:90:34', 'bunting']
  };
  var ITEMS = {
    barrel: ['cd-barrel', '0 0 60 72'], crate: ['cd-crate', '0 0 64 60'], anchor: ['cd-anchor', '0 0 80 100'], rope: ['cd-rope', '0 0 64 32'], flag: ['cd-flag', '0 0 74 104']
  };
  function section(specs) {
    var out = '';
    specs.forEach(function (spec) {
      var a = spec.split(':'), kind = a[0];
      if (kind === 'compass') {
        out += use('cd-compass', 'cd-compass-s cd-compass-s--' + a[1], '-104 -112 208 216');
      } else if (kind === 'lantern') {
        out += '<div class="cd-lantern" style="' + (a[1] === 'l' ? 'left' : 'right') + ':' + a[2] + '%;--len:' + a[3] + 'px;--w:' + a[4] + 'px;animation-delay:-' + (+a[3] % 4 + 1) + 's"><i></i>' + use('cd-lantern', '', '0 0 40 78') + '</div>';
      } else if (kind === 'lookout') {
        out += lookout('cd-lookout-s', (a[1] === 'l' ? 'left' : 'right') + ':0.4%;top:' + a[2] + '%;width:' + a[3] + 'px;animation-delay:-' + a[4] + 's');
      } else if (kind === 'gulls') {
        var top = +a[1];
        [[0, 40, 22, 0], [5, 28, 28, 9], [-4, 22, 34, 17]].forEach(function (g) {
          out += '<svg class="cd-gull cd-gull-s" viewBox="0 0 64 28" aria-hidden="true" style="top:' + (top + g[0]) + '%;width:' + g[1] + 'px;animation:cd-gull-fly ' + g[2] + 's linear -' + g[3] + 's infinite,cd-gull-flap .45s ease-in-out infinite alternate"><use href="#cd-gull"/></svg>';
        });
      } else if (kind === 'stars') {
        out += '<div class="cd-stars" style="' + (a[1] === 'l' ? 'left' : 'right') + ':0;top:' + a[2] + '%">' +
          '<i class="cd-twinkle" style="position:static;--s:12px;--d:4s">' + use('cd-star', '', '0 0 20 20') + '</i><i class="cd-twinkle" style="position:static;--s:16px;--d:5s;--o:-2s">' + use('cd-star', '', '0 0 20 20') + '</i><i class="cd-twinkle" style="position:static;--s:10px;--d:3.4s;--o:-1s">' + use('cd-star', '', '0 0 20 20') + '</i></div>';
      } else if (kind === 'dock') {
        var bits = '';
        a[2].split(',').forEach(function (it) { var d = ITEMS[it]; if (d) bits += use(d[0], 'cd-i cd-i--' + it, d[1]); });
        out += '<div class="cd-dock cd-dock--' + a[1] + '">' + bits + '</div>';
      } else if (kind === 'bunting') {
        out += '<div class="cd-bunting"></div>';
      }
    });
    return '<div class="cd-sec" aria-hidden="true">' + out + '</div>';
  }

  // The harbour above the footer: four planks on posts, barrels, a flag and a ship, with a strip of sea.
  function footer() {
    var sayings = ['Chart your course', 'No excuses, full sail', 'Land ho, new belt', 'Tap early, sail often'];
    var planks = sayings.map(function (s) { return '<div class="cd-plank"><span>AHOY</span><em>' + s + '</em></div>'; }).join('');
    return '<div class="cd-footer" aria-hidden="true">' +
      use('cd-barrel', 'cd-i cd-i--barrel', '0 0 60 72') + use('cd-flag', 'cd-i cd-i--flag', '0 0 74 104') +
      '<div class="cd-planks">' + planks + '</div>' +
      use('cd-ship', 'cd-i cd-i--ship', '-14 0 318 232') + use('cd-barrel', 'cd-i cd-i--barrel', '0 0 60 72') +
      '<div class="cd-footer-sea"><svg viewBox="0 0 1440 34" preserveAspectRatio="none"><path d="M0 14 q 90 -14 180 0 t 180 0 t 180 0 t 180 0 t 180 0 t 180 0 t 180 0 t 180 0 V34 H0 Z" fill="#12306e"/><path d="M0 24 q 120 -12 240 0 t 240 0 t 240 0 t 240 0 t 240 0 t 240 0 V34 H0 Z" fill="' + NAVY + '"/></svg></div>' +
    '</div>';
  }

  function build() {
    if (document.querySelector('.cd-defs')) return;          // once only, however the file came to run
    document.body.insertAdjacentHTML('afterbegin', DEFS);
    var h = document.getElementById('hero') || document.querySelector('.hero');
    if (h) h.insertAdjacentHTML('beforeend', hero());
    Object.keys(SECTIONS).forEach(function (id) {
      var s = document.getElementById(id);
      if (s) s.insertAdjacentHTML('afterbegin', section(SECTIONS[id]));
    });
    var f = document.getElementById('footer');
    if (f && f.parentNode) f.insertAdjacentHTML('beforebegin', footer());
  }

  // Tap a spyglass and it calls Land ho!
  document.addEventListener('click', function (e) {
    var g = e.target.closest && e.target.closest('[data-land]');
    if (!g) return;
    g.classList.add('is-land');
    setTimeout(function () { g.classList.remove('is-land'); }, 1400);
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
})();
