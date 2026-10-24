/**
 * The class schedule's behavior: who it is for, which day, and booking.
 *
 * The markup is complete without this file (scripts/schedule_component.py
 * draws the whole week, stacked by day, every class a real button). This adds:
 *
 *   - the Adults / Kids & Teens filter, collapsing days left with nothing in them
 *   - on narrow screens, a day picker showing one day at a time, opening on
 *     today, so a phone is not a 3,000-pixel scroll through seven days
 *   - a "Today" marker, on the academy's clock rather than the visitor's
 *   - booking: the whole card opens the form for that class, or, for a kids
 *     class a new child cannot trial into, the classes they can
 *   - a day that runs differently (scripts/schedule_data.py, SPECIAL_DAYS): the
 *     plan above the week is marked "Today" on the day, and the plan and the
 *     "Off" words on the classes it switches off go once the day has passed
 *
 * Loaded on the front page and on /schedule. Everything is scoped to [data-sc]
 * so a page could carry two without them fighting.
 */
(function () {
  'use strict';

  var ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  var JS_DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  /* Fulshear's day, not the visitor's. Somebody in California at 11 PM on
     Monday is already on Tuesday here, and "today" is about which door is
     open, not where the phone is. */
  function academyDay() {
    try {
      var s = new Date().toLocaleDateString('en-US', { timeZone: 'America/Chicago', weekday: 'short' });
      if (ORDER.indexOf(s) !== -1) return s;
    } catch (e) { /* an old browser without time zones: the device's day will do */ }
    return JS_DAY[new Date().getDay()];
  }

  /* Fulshear's date as YYYY-MM-DD, for the same reason. 'en-CA' is the one locale that writes it that way. */
  function academyDate() {
    try {
      var s = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    } catch (e) { /* an old browser without time zones: the device's date will do */ }
    var d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }

  /* A day that runs differently. The markup carries the plan (data-special="YYYY-MM-DD") and marks each class it switches off
     (data-off="YYYY-MM-DD"), complete without this file. This only keeps the words true: "Today" on the day, dimmed classes on the
     day, and once the day is over, none of it. A page that is open all night turns itself off at midnight on the next paint. */
  function specials(root) {
    var today = academyDate();
    root.querySelectorAll('[data-special]').forEach(function (box) {
      var date = box.getAttribute('data-special');
      var over = today > date;
      box.hidden = over;
      var pill = box.querySelector('.sc__special-pill');
      if (pill) pill.hidden = today !== date;
      box.classList.toggle('is-today', today === date);
    });
    root.querySelectorAll('[data-off]').forEach(function (card) {
      var date = card.getAttribute('data-off');
      var tag = card.querySelector('.sc__tag--off');
      if (today > date) {
        card.removeAttribute('data-off');
        if (tag) tag.remove();
        card.setAttribute('aria-label', card.getAttribute('aria-label').replace(/, no class on [A-Z][a-z]{2} \d+$/, ''));
        card.classList.remove('is-off');
        return;
      }
      card.classList.toggle('is-off', today === date);
      if (tag && today === date) tag.textContent = 'Off today';
    });
  }

  /* One day at a time below this width. Seven columns fit a laptop; on a phone
     they are seven slivers, and stacking them was the 3,000-pixel scroll. */
  var narrow = window.matchMedia ? window.matchMedia('(max-width: 1023px)') : { matches: false };

  function init(root) {
    var filters = root.querySelectorAll('[data-sc-filter]');
    var picker = root.querySelector('.sc__picker');
    var picks = root.querySelectorAll('[data-sc-pick]');
    var cols = root.querySelectorAll('[data-sc-col]');
    var kidsNote = root.querySelector('.sc__kids-note');
    var today = academyDay();
    var want = 'all';
    var day = today;

    root.classList.add('sc--js');
    if (picker) picker.hidden = false;
    specials(root);

    // Today, marked everywhere it appears.
    cols.forEach(function (col) {
      var isToday = col.getAttribute('data-sc-col') === today;
      col.classList.toggle('is-today', isToday);
      var badge = col.querySelector('.sc__today');
      if (badge) badge.hidden = !isToday;
    });
    picks.forEach(function (b) {
      b.classList.toggle('is-today', b.getAttribute('data-sc-pick') === today);
    });

    function colHasClasses(col) {
      return !!col.querySelector('.sc__list > li:not([hidden])');
    }

    function paint() {
      // The filter: adults see adult and all-ages classes, kids see kids and
      // all-ages classes. "all" is everything.
      cols.forEach(function (col) {
        col.querySelectorAll('.sc__class').forEach(function (card) {
          var aud = card.getAttribute('data-aud');
          var on = want === 'all' || aud === want || aud === 'all';
          card.parentNode.hidden = !on;
        });
      });

      // The picked day must have something in it under this filter. Sunday
      // has no adult BJJ; a phone opened on a Sunday with "Adults" chosen
      // should show the next day that does, not an empty screen.
      var chosen = root.querySelector('[data-sc-col="' + day + '"]');
      if (!chosen || !colHasClasses(chosen)) {
        var start = ORDER.indexOf(day);
        for (var i = 1; i <= 7; i++) {
          var next = ORDER[(start + i) % 7];
          var c = root.querySelector('[data-sc-col="' + next + '"]');
          if (c && colHasClasses(c)) { day = next; break; }
        }
      }

      var single = narrow.matches;
      cols.forEach(function (col) {
        var isDay = col.getAttribute('data-sc-col') === day;
        /* Wide: all seven, always. A column hidden under a filter would
           shift every day after it one place left, and "the third column is
           Wednesday" is the thing people rely on in a timetable. No day is
           empty under any filter today (Sunday has open mat and wrestling).
           Narrow: just the picked one. */
        col.hidden = single ? !isDay : false;
      });
      picks.forEach(function (b) {
        var d = b.getAttribute('data-sc-pick');
        var col = root.querySelector('[data-sc-col="' + d + '"]');
        var empty = !col || !colHasClasses(col);
        b.disabled = empty;
        b.setAttribute('aria-pressed', d === day ? 'true' : 'false');
        b.classList.toggle('is-active', d === day);
      });
      if (kidsNote) kidsNote.hidden = want !== 'kids';
    }

    filters.forEach(function (b) {
      b.addEventListener('click', function () {
        want = b.getAttribute('data-sc-filter');
        filters.forEach(function (o) {
          var on = o === b;
          o.classList.toggle('is-active', on);
          o.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        paint();
      });
    });

    picks.forEach(function (b) {
      b.addEventListener('click', function () {
        day = b.getAttribute('data-sc-pick');
        paint();
      });
    });

    root.addEventListener('click', function (e) {
      var card = e.target.closest('.sc__class');
      if (!card || !root.contains(card)) return;
      var B = window.LabyrinthBooking;
      if (!B) { window.location.href = '/#book'; return; }
      if (card.getAttribute('data-book') === 'kids') {
        B.openKidsTrials();
        return;
      }
      B.openForm(card.getAttribute('data-name'), card.getAttribute('data-type'),
        card.getAttribute('data-day'), card.getAttribute('data-time'));
    });

    // Rotating a tablet or resizing a window crosses the breakpoint.
    if (narrow.addEventListener) narrow.addEventListener('change', paint);
    else if (narrow.addListener) narrow.addListener(paint);

    paint();
  }

  function start() {
    document.querySelectorAll('[data-sc]').forEach(init);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();

  // For the test suite: the day this page considers "today".
  window.LabyrinthSchedule = { academyDay: academyDay, academyDate: academyDate };
})();
