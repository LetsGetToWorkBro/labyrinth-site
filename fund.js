/**
 * The donation page (/donate): the live total, the leaderboard, the goal reached, and the thank-you after a gift.
 *
 * The page works without this file. The amounts, the Stripe links, the goal and the
 * match are plain HTML. This adds what only Stripe knows (how much has been given, how
 * many people gave, the biggest and the latest gifts, shown as a leaderboard right under
 * the goal bar), the thank-you a donor sees when Stripe sends them back, and it tucks away
 * the lines that belong to a day once the day has passed.
 *
 * The total comes from the event-donations function, which reads it from Stripe, so the
 * number here is the number in Stripe. If the function cannot be reached the page keeps
 * its plain "goal" line and says nothing false. A page that is left open (on a screen at
 * the seminar, say) asks again every minute, which is as often as the answer changes.
 *
 * When the total reaches the goal the match is used up, and the page becomes the goal-reached
 * version: data-goal="reached" goes on <html> (style.css swaps the words and dresses the page
 * in gold), the numbers count up and confetti falls once. Whoever is looking when it happens
 * sees it happen. ?preview=goal shows all of that ahead of time, with a tag that says so.
 */
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }

  var root = document.documentElement;
  var preview = /[?&]preview=goal\b/.test(window.location.search);
  var baseTitle = document.title;

  // Stripe sends donors back with ?donated=1 (set on every Payment Link; the seminar
  // page passes them on to here).
  var justGave = /[?&]donated=1\b/.test(window.location.search);
  try {
    if (justGave && $('donate-thanks')) $('donate-thanks').hidden = false;
  } catch (e) { /* the thank-you is a nicety */ }

  // A line about the seminar goes away after the seminar.
  [].forEach.call(document.querySelectorAll('[data-closes]'), function (el) {
    if (Date.now() > Date.parse(el.getAttribute('data-closes'))) el.hidden = true;
  });

  var box = $('fund');
  if (!box || !window.fetch) return;

  // $1,500, $135, $437.50: whole dollars when it is whole dollars, with thousands separated.
  var money = function (n) {
    var s = Math.round(n * 100) % 100 === 0 ? String(Math.round(n)) : n.toFixed(2);
    var parts = s.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+$)/g, ',');
    return '$' + parts.join('.');
  };
  // Someone who has just given should see their gift counted, not a minute-old total.
  var bust = justGave ? ('?t=' + Date.now()) : '';

  function recall(k) { try { return window.sessionStorage.getItem(k); } catch (e) { return null; } }
  function remember(k, v) { try { window.sessionStorage.setItem(k, v); } catch (e) { /* private mode */ } }
  function reduced() { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }

  // Names are written as text, never as markup: they are whatever a donor typed at checkout.
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  // The leaderboard. It holds grey placeholders from the first moment until the answer comes, so the
  // amounts below it do not jump down when it does, and it goes away again if there is nothing to show.
  var board = $('fund-board');
  // "Be the first to give" is for when there is nothing to show: while the board is loading, and when it has gifts, it stays out of the way.
  function showFirst(on) { var f = $('fund-first'); if (f) f.hidden = !on; }
  function placeholders() {
    var ol = $('fund-top'), ul = $('fund-recent');
    ol.textContent = ''; ul.textContent = '';
    for (var i = 0; i < 3; i++) {
      var row = el('li', 'lb__row lb__row--ghost' + (i === 0 ? ' lb__row--first' : ''));
      row.setAttribute('aria-hidden', 'true');
      row.appendChild(el('span', 'lb__medal'));
      row.appendChild(el('span', 'lb__name'));
      row.appendChild(el('span', 'lb__amt'));
      ol.appendChild(row);
      var chip = el('li', 'lb__chip lb__chip--ghost');
      chip.setAttribute('aria-hidden', 'true');
      ul.appendChild(chip);
    }
    if (more) { more.hidden = false; more.className = 'lb__more lb__more--ghost'; more.textContent = '\u2193 0 more'; }
    board.hidden = false;
    board.setAttribute('aria-busy', 'true');
    showFirst(false);
  }
  function closeBoard() {
    if (!board) return;
    board.hidden = true;
    board.removeAttribute('aria-busy');
  }

  // Who ranks above whom: a donor who chose to show their name comes before everybody who did not, and within each group
  // the bigger gift comes first. The function sends the gifts in that order already; sorting again here keeps the page
  // right whichever answer it is handed (an older one may still be remembered for a minute).
  function isNamed(r) { return !!r.name && r.name !== 'Anonymous'; }
  function compare(a, b) { return (isNamed(b) ? 1 : 0) - (isNamed(a) ? 1 : 0) || (Number(b.amount) || 0) - (Number(a.amount) || 0); }
  function ordered(rows) {
    return rows.map(function (r, i) { return { r: r, i: i }; })
      .sort(function (a, b) { return compare(a.r, b.r) || a.i - b.i; })
      .map(function (x) { return x.r; });
  }
  // 1 plus the number of gifts that rank above this one: two equal gifts share a rank, and the next one is placed after both.
  function rank(rows, i) {
    var n = 1;
    rows.forEach(function (r) { if (compare(r, rows[i]) < 0) n++; });
    return n;
  }

  // Three rows show and the rest are a scroll away. The board is the same height whoever gave, so it can be a skeleton first.
  var scroller = $('fund-top'), more = $('fund-more');
  function hints() {
    var scrollable = scroller.scrollHeight > scroller.clientHeight + 1;
    var edge = scroller.scrollTop + scroller.clientHeight;
    var below = 0;
    [].forEach.call(scroller.children, function (li) { if (li.offsetTop + li.offsetHeight > edge + 2) below++; });
    // A list that scrolls can be reached by keyboard too.
    if (scrollable) scroller.setAttribute('tabindex', '0'); else scroller.removeAttribute('tabindex');
    scroller.className = scroller.className.replace(/\s*lb__top--more/, '') + (scrollable && below ? ' lb__top--more' : '');
    if (!more) return;
    more.hidden = !scrollable;
    more.className = 'lb__more' + (below ? '' : ' lb__more--end');
    more.textContent = below ? '\u2193 ' + below + ' more' : 'That\u2019s everyone';
  }
  scroller.addEventListener('scroll', hints, { passive: true });
  // ...and once more when the rows have settled, in case anything moved while they came in.
  scroller.addEventListener('animationend', hints);

  function fillTop(rows) {
    rows = ordered(rows);
    var ol = scroller;
    // A minute's refresh must not throw somebody back to the top of the list they are reading.
    var keep = ol.scrollTop;
    ol.textContent = '';
    ol.setAttribute('aria-label', 'Top supporters, ' + rows.length + (rows.length === 1 ? ' gift' : ' gifts'));
    rows.forEach(function (r, i) {
      var n = rank(rows, i);
      var name = String(r.name || 'Anonymous');
      var li = el('li', 'lb__row' + (n === 1 ? ' lb__row--first' : ''));
      li.style.setProperty('--i', String(i));
      li.appendChild(el('span', 'lb__medal lb__medal--' + (n < 4 ? n : 'n'), String(n)));
      li.appendChild(el('span', 'lb__name' + (name === 'Anonymous' ? ' lb__name--anon' : ''), name));
      li.appendChild(el('strong', 'lb__amt', money(Number(r.amount) || 0)));
      ol.appendChild(li);
    });
    ol.scrollTop = keep;
    hints();
  }

  function ago(iso) {
    var t = Date.parse(iso);
    if (!(t > 0)) return '';
    var m = Math.floor(Math.max(0, Date.now() - t) / 60000);
    if (m < 2) return 'just now';
    if (m < 60) return m + 'm ago';
    var h = Math.floor(m / 60);
    return h < 24 ? h + 'h ago' : Math.floor(h / 24) + 'd ago';
  }

  function fillRecent(rows) {
    var ul = $('fund-recent');
    ul.textContent = '';
    rows.forEach(function (r, i) {
      var li = el('li', 'lb__chip');
      li.style.setProperty('--i', String(i + 3));
      if (r.name && r.name !== 'Anonymous') {
        li.appendChild(el('em', '', String(r.name)));
        li.appendChild(document.createTextNode(' '));
      }
      li.appendChild(el('b', '', money(Number(r.amount) || 0)));
      var when = ago(r.at);
      if (when) {
        li.appendChild(document.createTextNode(' '));
        li.appendChild(el('span', '', when));
      }
      ul.appendChild(li);
    });
    $('fund-latest').hidden = rows.length === 0;
  }

  // ── The goal reached ─────────────────────────────────────────────────────────────────────────

  // A number that runs up from $0 to where it ends, so the moment is seen and not just printed.
  function countUp(node, to, ms) {
    if (!node) return;
    node.textContent = money(to);
    if (reduced()) return;
    // The words beside a number must not shuffle along as its digits grow: hold the width it will end at.
    var w = node.offsetWidth;
    if (w) { node.style.display = 'inline-block'; node.style.minWidth = w + 'px'; }
    var t0 = performance.now();
    (function step(t) {
      var k = Math.min(1, (t - t0) / ms);
      var e = 1 - Math.pow(1 - k, 3);
      node.textContent = money(k < 1 ? Math.round(to * e) : to);
      if (k < 1) requestAnimationFrame(step);
    })(t0);
  }

  // Ribbons, dots and strips in the page's own pink, blush, white and gold, falling for five seconds. Not at all when the
  // visitor has asked for less motion.
  function confetti() {
    if (reduced() || !document.body) return;
    var c = document.createElement('canvas');
    c.setAttribute('aria-hidden', 'true');
    c.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:80';
    document.body.appendChild(c);
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = 0, H = 0;
    function size() { W = c.width = Math.round(window.innerWidth * dpr); H = c.height = Math.round(window.innerHeight * dpr); }
    size();
    var ctx = c.getContext('2d');
    var colors = ['#E58FB5', '#FBD3E3', '#FFF7FA', '#F6DC8E', '#C8A24C', '#FF7EB3'];
    var ribbon = typeof Path2D === 'function'
      ? new Path2D('M12 14C8 11 7.5 9 7.5 6.8 7.5 4.6 9.5 3 12 3s4.5 1.6 4.5 3.8C16.5 9 16 11 12 14zM12 14 8 21M12 14l4 7') : null;
    var parts = [];
    for (var i = 0; i < (window.innerWidth < 600 ? 90 : 170); i++) {
      parts.push({
        x: Math.random() * W, y: -Math.random() * H * 0.7 - 20 * dpr,
        vx: (Math.random() - 0.5) * 2.4 * dpr, vy: (2.2 + Math.random() * 3.4) * dpr,
        s: (7 + Math.random() * 9) * dpr, r: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.28,
        sway: Math.random() * 6.28, swayV: 0.02 + Math.random() * 0.05, col: colors[i % colors.length],
        kind: ribbon && i % 5 === 0 ? 'ribbon' : (i % 3 === 0 ? 'dot' : 'strip')
      });
    }
    var DUR = 5200, t0 = performance.now();
    window.addEventListener('resize', size);
    function done() {
      window.removeEventListener('resize', size);
      if (c.parentNode) c.parentNode.removeChild(c);
    }
    (function frame(t) {
      var k = t - t0;
      ctx.clearRect(0, 0, W, H);
      ctx.globalAlpha = k > DUR - 900 ? Math.max(0, (DUR - k) / 900) : 1;
      parts.forEach(function (p) {
        p.sway += p.swayV;
        p.x += p.vx + Math.sin(p.sway) * 0.9 * dpr;
        p.y += p.vy;
        p.r += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.fillStyle = p.col;
        ctx.strokeStyle = p.col;
        if (p.kind === 'ribbon') {
          var sc = p.s / 14;
          ctx.scale(sc, sc);
          ctx.translate(-12, -12);
          ctx.lineWidth = 2.4;
          ctx.lineCap = 'round';
          ctx.stroke(ribbon);
        } else if (p.kind === 'dot') {
          ctx.beginPath(); ctx.arc(0, 0, p.s * 0.32, 0, 6.2832); ctx.fill();
        } else {
          ctx.fillRect(-p.s * 0.2, -p.s * 0.5, p.s * 0.4, p.s);
        }
        ctx.restore();
      });
      if (k < DUR) requestAnimationFrame(frame); else done();
    })(t0);
  }

  function announce(text) { var s = $('goal-status'); if (s) s.textContent = text; }

  // Keeps data-goal on <html> true, and celebrates when this is the moment (or the visitor's first look at it).
  // `first` is the visit's own first answer; a minute-later answer that crosses the goal is celebrated as it happens.
  function setGoal(reached, raised, goal, first) {
    var was = root.getAttribute('data-goal') === 'reached';
    if (reached) root.setAttribute('data-goal', 'reached');
    else if (!preview) root.removeAttribute('data-goal');
    if (!preview) {
      remember('goalReached', reached ? '1' : '0');
      remember('goalAsked', String(Date.now()));
    }
    // The tab says it too, for whoever has the page open somewhere else.
    document.title = reached ? 'We hit ' + money(goal) + '! ' + baseTitle : baseTitle;
    if (!reached) return;
    $('fund-pct').textContent = Math.round(raised / goal * 100) + '% of our ' + money(goal) + ' goal';
    var celebrate = preview ? first : (!was || !recall('goalCelebrated'));
    if (!celebrate) return;
    if (!preview) remember('goalCelebrated', '1');
    announce('Goal reached. Thank you to everyone who gave.');
    countUp($('fund-raised'), raised, 1500);
    countUp($('goal-total'), Number($('goal-total').getAttribute('data-to')) || 0, 1900);
    confetti();
  }

  // What the answer says, on the page. `first` is the visit's own first answer: only that one may take the
  // board away or put the invitation back, so a minute-later answer that fails changes nothing.
  function show(d, first) {
    if (typeof d.raised !== 'number' || !(d.goal > 0)) {
      if (first) { closeBoard(); showFirst(true); }
      return;
    }
    var reached = preview || d.raised >= d.goal;
    // In a preview the total is shown as the goal at least, so the page looks as it will when it is real.
    var raised = preview ? Math.max(d.raised, d.goal) : d.raised;
    var pct = Math.max(0, Math.min(100, Math.round(raised / d.goal * 100)));
    $('fund-raised').textContent = money(raised);
    $('fund-goal').textContent = money(d.goal);
    $('fund-fill').style.width = pct + '%';
    $('fund-bar').setAttribute('aria-valuenow', String(Math.min(raised, d.goal)));
    if (d.count > 0) {
      var c = $('fund-count');
      c.textContent = d.count + (d.count === 1 ? ' supporter' : ' supporters');
      c.hidden = false;
      showFirst(false);
      if (board && d.top && d.top.length) {
        fillTop(d.top);
        fillRecent(d.recent || []);
        board.hidden = false;
        board.removeAttribute('aria-busy');
        // Entrances are for the first sight of the board, not for every minute's refresh.
        if (!first) board.className += board.className.indexOf('lb--settled') < 0 ? ' lb--settled' : '';
      } else {
        closeBoard();
      }
    } else {
      closeBoard();
      showFirst(raised < d.goal);
    }
    setGoal(reached, raised, d.goal, first);
  }

  var lastAsked = Date.now();
  function load(first) {
    lastAsked = Date.now();
    var ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 8000);
    return fetch(box.getAttribute('data-endpoint') + (first ? bust : ''), { signal: ctrl ? ctrl.signal : undefined })
      .then(function (res) { return res.ok ? res.json() : Promise.reject(); })
      .then(function (d) { clearTimeout(timer); show(d, first); })
      .catch(function () {
        clearTimeout(timer);
        if (first) { closeBoard(); showFirst(true); }
      });
  }

  if (board) placeholders();
  load(true);

  // Left open on a screen, the page keeps up: every minute while it is on show, and as soon as it comes back after a while away.
  var EVERY = 60000;
  function again() { if (!document.hidden) load(false); }
  setInterval(again, EVERY);
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && Date.now() - lastAsked >= EVERY) again();
  });
})();
