/* Seasonal packs: the mechanics every holiday theme shares (Halloween and Columbus Day predate this and keep their own).
   Loaded by index.html's <head> together with season-kit.css and the pack's own season-<name>.css / season-<name>.js, in that order, and only
   when <html data-season="<name>"> says that season is on. On every other day none of these files is fetched and nothing here runs.

   A pack is two files and a call:   SeasonKit.mount({ name, prefix, meta, defs, hero, sections, footer, init, onTap })

     name      the season, as in <html data-season="…"> ('thanksgiving'); mount() does nothing on any other season
     prefix    the two or three letters the pack's own classes start with ('tg'); the kit adds .sk-hero/.tg-hero, .sk-sec/.tg-sec, .sk-footer/.tg-footer
     meta      what the pack says about itself, read by site-test.mjs's checks: { bg, gold, emoji, tapSay: [every tap bubble], sayings: [the footer's signs] }
     defs      the pack's <symbol> shapes (a string of SVG), drawn once and reused with <use>; the kit adds sk-sparkle, sk-star, sk-heart and sk-dot
     hero      function (k) -> html: the scene over the hero photograph (behind the headline and buttons, which keep every tap)
     sections  { eventStrip, programs, competition, coaches, gallery, 'belt-journey', locations, faq, schedule, testimonials, pricing, contact }:
               each a string or function (k) -> html: a layer behind that section, different on every one so the page does not repeat itself
     footer    function (k) -> html: the scene above the footer
     init      optional function (k): run once after everything is built
     onTap     optional function (el, k): run on each tap of a [data-tap] element (the kit has already shown its bubble)

   Everything is built by script, aria-hidden, behind the content, and lets every tap through except the [data-tap] bubbles a pack places in the
   margins. Nothing here reads or writes anything about a visitor. The helper k gives a pack: k.now (the date on the academy's clock), k.use,
   k.rng (a seeded random, so a build is always the same), k.particles (things that fall or rise), k.twinkles (stars and lights that pulse in place),
   k.flyers (birds, butterflies, a sleigh crossing a layer), k.pendant (something swinging on a string), k.tap (a tappable decoration with a bubble)
   and k.burst (a little pop of confetti, hearts or leaves from an element). Each layer also knows its own size, as CSS variables --h and --lw (px). */
(function () {
  'use strict';
  var K = window.SeasonKit = window.SeasonKit || {};
  K.SECTIONS = ['eventStrip', 'programs', 'competition', 'coaches', 'gallery', 'belt-journey', 'locations', 'faq', 'schedule', 'testimonials', 'pricing', 'contact'];
  if (K.mount) return;                                         // loaded twice: keep the first

  var BASE_DEFS =
    '<symbol id="sk-sparkle" viewBox="0 0 20 20"><path d="M10 0L12.5 7.5L20 10L12.5 12.5L10 20L7.5 12.5L0 10L7.5 7.5Z" fill="currentColor"/></symbol>' +
    '<symbol id="sk-star" viewBox="0 0 24 24"><path d="M12 1.5l3 6.6 7.2.8-5.4 4.9 1.5 7.1L12 17.3 5.7 20.9l1.5-7.1L1.8 8.9l7.2-.8z" fill="currentColor"/></symbol>' +
    '<symbol id="sk-heart" viewBox="0 0 24 24"><path d="M12 21s-8.5-5.3-8.5-11.2C3.5 6.5 5.8 4.5 8.3 4.5c1.6 0 2.9.8 3.7 2.1.8-1.3 2.1-2.1 3.7-2.1 2.5 0 4.8 2 4.8 5.3C20.5 15.7 12 21 12 21z" fill="currentColor"/></symbol>' +
    '<symbol id="sk-dot" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="currentColor"/></symbol>';

  // The date on the academy's clock (Central), the same clock index.html's <head> decides the season by.
  function central() {
    var p = {};
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(new Date()).forEach(function (x) { p[x.type] = +x.value; });
    } catch (e) { var d = new Date(); p = { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() }; }
    return { year: p.year, month: p.month, day: p.day };
  }

  // A seeded random (mulberry32): the same pack builds the same page every time, so what was looked at is what is live.
  function rng(seed) {
    var a = (seed >>> 0) || 1;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function between(r, a) { return a[0] + (a[1] - a[0]) * r(); }
  function use(id, cls, vb) { return '<svg class="' + (cls || '') + '"' + (vb ? ' viewBox="' + vb + '"' : '') + ' aria-hidden="true" focusable="false"><use href="#' + id + '"/></svg>'; }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }

  // N things that fall (dir 'fall': snow, leaves, confetti, petals) or rise (dir 'rise': hearts, balloons, sparks) through the layer they are in.
  //   o.id      a symbol id, or an array of them (each thing takes one)       o.vb      their viewBox when it is not the symbol's own
  //   o.size    [min, max] px          o.dur  [min, max] seconds for one trip   o.opacity [min, max]     o.colors  the colours (they set `color`, which a symbol uses as currentColor)
  //   o.area    [min, max] percent of the width they start in                   o.drift   px they end up sideways (+/-)   o.sway px they swing about while they go
  //   o.spin    turns (0 for none)     o.seed  any number                       o.mobile  the share (0 to 1) that stays on a phone      o.cls  an extra class
  function particles(n, o) {
    var r = rng(o.seed || 1), ids = [].concat(o.id), cols = o.colors || ['currentColor'], out = '', i;
    var size = o.size || [12, 24], dur = o.dur || [14, 26], op = o.opacity || [0.6, 0.95], area = o.area || [0, 100], dir = o.dir === 'rise' ? 'rise' : 'fall';
    var drift = o.drift == null ? 60 : o.drift, sway = o.sway == null ? 24 : o.sway;
    for (i = 0; i < n; i++) {
      var d = between(r, dur), s = between(r, size);
      var style = 'left:' + between(r, area).toFixed(1) + '%;--s:' + s.toFixed(1) + 'px;--d:' + d.toFixed(1) + 's;--o:-' + (r() * d).toFixed(1) + 's;' +
        '--x:' + ((r() - 0.5) * 2 * drift).toFixed(0) + 'px;--sw:' + (sway * (r() < 0.5 ? -1 : 1)).toFixed(0) + 'px;--sd:' + (3 + r() * 4).toFixed(1) + 's;' +
        '--op:' + between(r, op).toFixed(2) + ';--r:' + ((r() < 0.5 ? -1 : 1) * (o.spin == null ? 1 : o.spin) * 360) + 'deg;color:' + cols[Math.floor(r() * cols.length)];
      out += '<i class="sk-p sk-p--' + dir + (o.mobile != null && i >= Math.ceil(n * o.mobile) ? ' sk-hide-m' : '') + (o.cls ? ' ' + o.cls : '') + '" style="' + style + '">' +
        use(ids[Math.floor(r() * ids.length)], '', o.vb) + '</i>';
    }
    return out;
  }

  // N small things that twinkle in place (stars, sparkles, lights): each fades and swells on its own beat.
  //   o.id, o.vb, o.size [min, max] px, o.dur [min, max] s, o.colors, o.seed, o.cls as in particles(); o.area [min, max] percent across, o.areaY [min, max] percent down
  function twinkles(n, o) {
    var r = rng(o.seed || 1), ids = [].concat(o.id || 'sk-sparkle'), cols = o.colors || ['currentColor'], out = '', i;
    var size = o.size || [8, 16], dur = o.dur || [3, 6], area = o.area || [0, 100], areaY = o.areaY || [0, 100];
    for (i = 0; i < n; i++) {
      var d = between(r, dur);
      out += '<i class="sk-tw' + (o.mobile != null && i >= Math.ceil(n * o.mobile) ? ' sk-hide-m' : '') + (o.cls ? ' ' + o.cls : '') + '" style="left:' + between(r, area).toFixed(1) + '%;top:' + between(r, areaY).toFixed(1) +
        '%;--s:' + between(r, size).toFixed(1) + 'px;--d:' + d.toFixed(1) + 's;--o:-' + (r() * d).toFixed(1) + 's;color:' + cols[Math.floor(r() * cols.length)] + '">' + use(ids[Math.floor(r() * ids.length)], '', o.vb) + '</i>';
    }
    return out;
  }

  // N things that cross the layer from one side to the other (birds, butterflies, a sleigh, a plane), each at its own height and speed.
  //   o.id, o.vb, o.size [min, max] px, o.dur [min, max] s, o.colors, o.seed, o.mobile, o.cls as above; o.top [min, max] percent down; o.dir 'ltr' (default) or 'rtl'; o.wave px they rise and fall
  //   by in the middle; o.flap true to make their wings beat (they squash up and down)
  function flyers(n, o) {
    var r = rng(o.seed || 1), ids = [].concat(o.id), cols = o.colors || ['currentColor'], out = '', i;
    var size = o.size || [24, 44], dur = o.dur || [22, 36], top = o.top || [10, 40], dir = o.dir === 'rtl' ? 'rtl' : 'ltr';
    for (i = 0; i < n; i++) {
      var d = between(r, dur);
      out += '<i class="sk-fly sk-fly--' + dir + (o.flap ? ' sk-fly--flap' : '') + (o.mobile != null && i >= Math.ceil(n * o.mobile) ? ' sk-hide-m' : '') + (o.cls ? ' ' + o.cls : '') + '" style="top:' + between(r, top).toFixed(1) +
        '%;--s:' + between(r, size).toFixed(1) + 'px;--d:' + d.toFixed(1) + 's;--o:-' + (r() * d).toFixed(1) + 's;--wv:' + ((r() < 0.5 ? -1 : 1) * (o.wave == null ? 20 : o.wave) * (0.5 + r())).toFixed(0) + 'px;color:' + cols[Math.floor(r() * cols.length)] + '">' +
        use(ids[Math.floor(r() * ids.length)], '', o.vb) + '</i>';
    }
    return out;
  }

  // Something hanging from the top of the layer on a string and swinging (an ornament, a lantern, a pinata, an acorn): inner is its html.
  //   o.side 'l' or 'r', o.at percent in from that side, o.len px of string, o.w px wide, o.delay seconds into the swing, o.cls an extra class
  function pendant(inner, o) {
    return '<div class="sk-pend' + (o.cls ? ' ' + o.cls : '') + '" style="' + (o.side === 'l' ? 'left' : 'right') + ':' + o.at + '%;--len:' + o.len + 'px;--w:' + (o.w || 30) + 'px;animation-delay:-' + (o.delay == null ? (+o.len % 4) + 1 : o.delay) + 's"><i></i>' + inner + '</div>';
  }

  // A decoration that answers a tap with a bubble: <button data-tap> holding html and a speech bubble that says `say`.
  function tap(html, say, cls, style) {
    return '<button type="button" class="sk-tap' + (cls ? ' ' + cls : '') + '" tabindex="-1" data-tap' + (style ? ' style="' + style + '"' : '') + '>' + html + '<span class="sk-bubble">' + esc(say) + '</span></button>';
  }

  // A pop from the middle of an element: n small shapes fly out and fade (hearts, leaves, confetti). Skipped for anyone who has asked for less motion.
  //   o.id and o.vb as in particles(); o.n how many; o.colors; o.dist [min, max] px they travel; o.size [min, max] px; o.ms how long it lasts
  function burst(el, o) {
    o = o || {};
    if (!el || !el.animate || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
    var host = el.closest && el.closest('.sk-hero, .sk-sec, .sk-footer');
    if (!host) return;
    var hr = host.getBoundingClientRect(), er = el.getBoundingClientRect(), cx = er.left - hr.left + er.width / 2, cy = er.top - hr.top + er.height / 2;
    var r = rng(Math.round(cx * 7 + cy * 13) || 1), n = o.n || 14, cols = o.colors || ['#ffffff'], dist = o.dist || [50, 120], size = o.size || [8, 16], ms = o.ms || 900;
    for (var i = 0; i < n; i++) {
      var a = (i / n + r() * 0.06) * Math.PI * 2, d = between(r, dist), s = between(r, size), b = document.createElement('i');
      b.className = 'sk-burst';
      b.style.cssText = 'left:' + cx.toFixed(0) + 'px;top:' + cy.toFixed(0) + 'px;width:' + s.toFixed(0) + 'px;height:' + s.toFixed(0) + 'px;color:' + cols[i % cols.length];
      b.innerHTML = use(o.id || 'sk-dot', '', o.vb);
      host.appendChild(b);
      var an = b.animate([
        { transform: 'translate(-50%,-50%) scale(.3)', opacity: 1 },
        { transform: 'translate(calc(-50% + ' + (Math.cos(a) * d).toFixed(0) + 'px),calc(-50% + ' + (Math.sin(a) * d - 24).toFixed(0) + 'px)) scale(1) rotate(' + ((r() - 0.5) * 360).toFixed(0) + 'deg)', opacity: 1, offset: 0.55 },
        { transform: 'translate(calc(-50% + ' + (Math.cos(a) * d * 1.15).toFixed(0) + 'px),calc(-50% + ' + (Math.sin(a) * d * 1.15 + 30).toFixed(0) + 'px)) scale(.7)', opacity: 0 }
      ], { duration: ms * (0.8 + r() * 0.4), easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' });
      an.onfinish = (function (node) { return function () { node.remove(); }; })(b);
    }
  }

  function helpers() {
    return { now: central(), use: use, rng: rng, particles: particles, twinkles: twinkles, flyers: flyers, pendant: pendant, tap: tap, burst: burst, esc: esc, between: between };
  }
  K.helpers = helpers;

  // Each layer knows its own height (a CSS variable, in px), so things can fall exactly through it.
  function measure(root) {
    [].forEach.call((root || document).querySelectorAll('.sk-hero, .sk-sec, .sk-footer'), function (e) { var b = e.getBoundingClientRect(); e.style.setProperty('--h', Math.round(b.height)); e.style.setProperty('--lw', Math.round(b.width)); });
  }

  K.mount = function (theme) {
    if (!theme || document.documentElement.getAttribute('data-season') !== theme.name) return;
    K.theme = theme;
    var k = helpers();
    function build() {
      if (document.querySelector('.sk-defs')) return;          // once only, however the files came to run
      document.body.insertAdjacentHTML('afterbegin', '<svg class="sk-defs" width="0" height="0" aria-hidden="true" focusable="false"><defs>' + BASE_DEFS + (theme.defs || '') + '</defs></svg>');
      var hero = document.getElementById('hero');
      if (hero && theme.hero) hero.insertAdjacentHTML('beforeend', '<div class="sk-hero ' + theme.prefix + '-hero" aria-hidden="true">' + theme.hero(k) + '</div>');
      K.SECTIONS.forEach(function (id) {
        var sec = document.getElementById(id), spec = theme.sections && theme.sections[id];
        if (!sec || !spec) return;
        sec.insertAdjacentHTML('afterbegin', '<div class="sk-sec ' + theme.prefix + '-sec" aria-hidden="true">' + (typeof spec === 'function' ? spec(k) : spec) + '</div>');
      });
      var foot = document.getElementById('footer');
      if (foot && foot.parentNode && theme.footer) foot.insertAdjacentHTML('beforebegin', '<div class="sk-footer ' + theme.prefix + '-footer" aria-hidden="true">' + theme.footer(k) + '</div>');
      measure();
      if (window.ResizeObserver) {
        var ro = new ResizeObserver(function (entries) { entries.forEach(function (en) { en.target.style.setProperty('--h', Math.round(en.contentRect.height)); en.target.style.setProperty('--lw', Math.round(en.contentRect.width)); }); });
        [].forEach.call(document.querySelectorAll('.sk-hero, .sk-sec, .sk-footer'), function (e) { ro.observe(e); });
      } else { window.addEventListener('resize', function () { measure(); }); }
      window.addEventListener('load', function () { measure(); });
      if (theme.init) theme.init(k);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
  };

  // Tap a [data-tap] decoration and its bubble shows for a moment.
  document.addEventListener('click', function (e) {
    var t = e.target && e.target.closest && e.target.closest('[data-tap]');
    if (!t) return;
    // A decoration in a margin has its bubble start at the screen's edge instead of being centred over it (and cut off). One that is itself partly off the screen
    // (peeking round the edge, or hopping in from it) has the bubble start at the screen's edge, --sk-bx past the decoration's own. It is worked out at every tap,
    // because a decoration that moves is somewhere else each time, and the bubble is put there without a transition: it appears where it stays instead of sliding in.
    var b = t.querySelector('.sk-bubble');
    if (b) {
      var tr = t.getBoundingClientRect(), mid = tr.left + tr.width / 2, half = b.offsetWidth / 2, vw = document.documentElement.clientWidth;
      var side = mid - half < 4 ? 'l' : mid + half > vw - 4 ? 'r' : '';
      t.style.setProperty('--sk-bx', (side === 'l' ? Math.max(0, 4 - tr.left) : side === 'r' ? Math.max(0, tr.right - (vw - 4)) : 0) + 'px');
      b.style.transition = 'none';
      t.classList.toggle('sk-edge-l', side === 'l'); t.classList.toggle('sk-edge-r', side === 'r');
      void b.offsetWidth;
      b.style.transition = '';
    }
    t.classList.add('is-tap');
    clearTimeout(t._skTimer);
    t._skTimer = setTimeout(function () { t.classList.remove('is-tap'); }, 1400);
    if (K.theme && K.theme.onTap) K.theme.onTap(t, helpers());
  });

  // A pack whose file ran before this one (it should not: the loader keeps the order) is mounted now.
  if (window.__skq) { window.__skq.forEach(K.mount); window.__skq = []; }
})();
