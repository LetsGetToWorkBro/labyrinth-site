/**
 * The donation page (/donate): the live total, and the thank-you after a gift.
 *
 * The page works without this file. The amounts, the Stripe links, the goal and the
 * match are plain HTML. This adds what only Stripe knows (how much has been given, how
 * many people gave, the biggest and the latest gifts), the thank-you a donor sees when
 * Stripe sends them back, and it tucks away the lines that belong to a day once the day
 * has passed.
 *
 * The total comes from the event-donations function, which reads it from Stripe, so the
 * number here is the number in Stripe. If the function cannot be reached the page keeps
 * its plain "goal" line and says nothing false.
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
  var ctrl = typeof AbortController === 'function' ? new AbortController() : null;
  var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 8000);

  // Names are written as text, never as markup: they are whatever a donor typed at checkout.
  function fill(listId, rows) {
    var ol = $(listId);
    ol.textContent = '';
    rows.forEach(function (r) {
      var li = document.createElement('li');
      var who = document.createElement('span'); who.textContent = r.name;
      var amt = document.createElement('strong'); amt.textContent = money(r.amount);
      li.appendChild(who); li.appendChild(amt); ol.appendChild(li);
    });
  }

  fetch(box.getAttribute('data-endpoint') + bust, { signal: ctrl ? ctrl.signal : undefined })
    .then(function (res) { return res.ok ? res.json() : Promise.reject(); })
    .then(function (d) {
      clearTimeout(timer);
      if (typeof d.raised !== 'number' || !(d.goal > 0)) return;
      var pct = Math.max(0, Math.min(100, Math.round(d.raised / d.goal * 100)));
      $('fund-raised').textContent = money(d.raised);
      $('fund-goal').textContent = money(d.goal);
      $('fund-fill').style.width = pct + '%';
      $('fund-bar').setAttribute('aria-valuenow', String(Math.min(d.raised, d.goal)));
      if (d.count > 0) {
        var c = $('fund-count');
        c.textContent = d.count + (d.count === 1 ? ' supporter' : ' supporters');
        c.hidden = false;
        $('fund-first').hidden = true;
        fill('fund-top', d.top || []);
        fill('fund-recent', d.recent || []);
        $('fund-lists').hidden = false;
      }
      if (d.raised >= d.goal) $('fund-first').hidden = true;
    })
    .catch(function () { clearTimeout(timer); });
})();
