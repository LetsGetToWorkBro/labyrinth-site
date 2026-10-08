/**
 * The donation page (/donate): the live total, the leaderboard, and the thank-you after a gift.
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
 */
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }

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

  var money = function (n) { return '$' + (Math.round(n * 100) % 100 === 0 ? String(Math.round(n)) : n.toFixed(2)); };
  // Someone who has just given should see their gift counted, not a minute-old total.
  var bust = justGave ? ('?t=' + Date.now()) : '';

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
    board.hidden = false;
    board.setAttribute('aria-busy', 'true');
    showFirst(false);
  }
  function closeBoard() {
    if (!board) return;
    board.hidden = true;
    board.removeAttribute('aria-busy');
  }

  // 1 plus the number of bigger gifts: two gifts of $100 are both first, and the next one is third.
  function rank(rows, i) {
    var n = 1;
    rows.forEach(function (r) { if (r.amount > rows[i].amount) n++; });
    return n;
  }

  function fillTop(rows) {
    var ol = $('fund-top');
    ol.textContent = '';
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

  // What the answer says, on the page. `first` is the visit's own first answer: only that one may take the
  // board away or put the invitation back, so a minute-later answer that fails changes nothing.
  function show(d, first) {
    if (typeof d.raised !== 'number' || !(d.goal > 0)) {
      if (first) { closeBoard(); showFirst(true); }
      return;
    }
    var pct = Math.max(0, Math.min(100, Math.round(d.raised / d.goal * 100)));
    $('fund-raised').textContent = money(d.raised);
    $('fund-goal').textContent = money(d.goal);
    $('fund-fill').style.width = pct + '%';
    $('fund-bar').setAttribute('aria-valuenow', String(Math.min(d.raised, d.goal)));
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
      showFirst(d.raised < d.goal);
    }
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
