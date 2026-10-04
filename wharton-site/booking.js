/**
 * Labyrinth BJJ Wharton: book a free class from the timetable.
 *
 * The same flow as labyrinth.vision (pick a class, pick a date on a calendar,
 * leave your details, get a confirmation), reading Wharton's own timetable
 * instead of Fulshear's. The classes come from site.config.json through the
 * generator, which writes them into the page as JSON; nothing is hard-coded
 * here, so the schedule on the page and the schedule you can book can never
 * disagree.
 *
 * What is different from the main site's booking.js, on purpose:
 *  - the booking is filed under location "wharton" with the exact class, so the
 *    CRM, the confirmation email and the reminders all name the Wharton address
 *    and the class and never the Fulshear gym;
 *  - no closure list is invented. Federal holidays are not assumed to be days
 *    Wharton is shut; the owner lists real closures in site.config.json
 *    ("closed_dates") and they are drawn on the calendar;
 *  - nothing is offered before "first_bookable" when the owner sets one, so the
 *    calendar never sells a class in a gym that has not opened.
 *
 *   WhartonBooking.openPicker()          choose a class
 *   WhartonBooking.openForm(classIndex)  straight to the calendar for a class
 *   WhartonBooking.close()
 */
(function () {
  'use strict';

  var dataEl = document.getElementById('whartonBooking');
  var CONFIG = { classes: [], closed: [], firstBookable: '', address: '', phone: '', mapUrl: '' };
  if (dataEl) {
    try { CONFIG = Object.assign(CONFIG, JSON.parse(dataEl.textContent)); } catch (e) { /* no classes: nothing to book */ }
  }
  var CLASSES = CONFIG.classes || [];

  var CRM_BOOKING_URL = 'https://jctufxvmuvobaggxcwfn.supabase.co/functions/v1/book-trial';
  var DAY_MAP = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  var DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var WEEKDAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  var GROUPS = [
    { key: 'kids', title: 'Kids' },
    { key: 'adult', title: 'Adults' },
    { key: 'women', title: 'Women' }
  ];

  /* How far ahead a class can be booked: twelve weeks, far enough to plan around
     a school term and short enough that the timetable is still the timetable. */
  var BOOK_AHEAD_DAYS = 84;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function pad(n) { return String(n).padStart(2, '0'); }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function formatDate(d) {
    return DAY_NAMES[d.getDay()] + ', ' + MONTH_NAMES[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
  }

  /* Now, on the gym's clock rather than the visitor's. Wharton and Fulshear are
     both Central; somebody browsing from California at 3pm is already past a
     4pm class here. */
  function centralNow() {
    var parsed = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }));
    return isNaN(parsed) ? new Date() : parsed;
  }
  function minutesOfDay(t) {
    var m = /^(\d{1,2}):(\d{2})\s*([AP])M$/i.exec(String(t || '').trim());
    if (!m) return null;
    var h = parseInt(m[1], 10) % 12;
    if (/p/i.test(m[3])) h += 12;
    return h * 60 + parseInt(m[2], 10);
  }

  /* ── Closed days ─────────────────────────────────────────────────────── */
  var CLOSED = {};
  (CONFIG.closed || []).forEach(function (c) {
    if (c && /^\d{4}-\d{2}-\d{2}$/.test(c.date)) CLOSED[c.date] = c.reason || 'Closed';
  });
  function shutReason(d) { return CLOSED[ymd(d)] || null; }
  function isShut(d) { return shutReason(d) !== null; }

  /* ── Dates ───────────────────────────────────────────────────────────── */

  /* The earliest day anything can be booked: today, or the opening day if the
     gym has not opened yet. */
  function earliestDay() {
    var now = centralNow();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var fb = /^(\d{4})-(\d{2})-(\d{2})$/.exec(CONFIG.firstBookable || '');
    if (fb) {
      var open = new Date(Number(fb[1]), Number(fb[2]) - 1, Number(fb[3]));
      if (open > today) return open;
    }
    return today;
  }

  /* The next date this class runs. Today counts while there is still time to
     get here: a website stricter than the front desk loses the person already
     in the car park. */
  function nextDayDate(dayAbbr, timeStr) {
    var target = DAY_MAP[dayAbbr];
    if (target === undefined) return earliestDay();
    var now = centralNow();
    var start = earliestDay();
    var d = new Date(start);
    d.setDate(start.getDate() + ((target - start.getDay() + 7) % 7));
    var sameDay = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
    if (sameDay) {
      var starts = minutesOfDay(timeStr);
      var nowMins = now.getHours() * 60 + now.getMinutes();
      if (starts === null || starts <= nowMins) d.setDate(d.getDate() + 7);
    }
    return d;
  }

  /* The dates this class runs, soonest first, out to the horizon, skipping
     closed days. Weekly, and stepping 7 days on a Date carries across a month
     or a daylight-saving change correctly. */
  function upcomingDayDates(dayAbbr, timeStr, count) {
    var first = nextDayDate(dayAbbr, timeStr);
    var out = [];
    var weeks = Math.floor(BOOK_AHEAD_DAYS / 7);
    for (var i = 0; i <= weeks; i++) {
      var d = new Date(first);
      d.setDate(first.getDate() + i * 7);
      if (isShut(d)) continue;
      out.push(d);
      if (count && out.length >= count) break;
    }
    return out;
  }

  /* The class's wall-clock time with Central's offset FOR THAT DATE attached,
     because the gym runs through both CST and CDT. */
  function toCentralISO(dateStr, timeStr) {
    var d = new Date(dateStr + ' ' + timeStr);
    if (isNaN(d)) return null;
    var probe = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 12));
    var offset = -6;
    try {
      var label = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', timeZoneName: 'shortOffset' })
        .formatToParts(probe).find(function (x) { return x.type === 'timeZoneName'; }).value;
      var m = /GMT([+-]\d{1,2})/.exec(label);
      if (m) offset = parseInt(m[1], 10);
    } catch (e) { /* very old browser: CST is the safer default */ }
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
      + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':00'
      + (offset < 0 ? '-' : '+') + pad(Math.abs(offset)) + ':00';
  }

  /* ── Calendar ────────────────────────────────────────────────────────── */

  /* A month grid. Every day is drawn so the shape is the one everybody knows,
     but only this class's own weekday is a control; the rest are plain text.
     A closed class day is called out with its reason rather than dimmed. */
  function calendarHTML(dayAbbr, view, sel, first, last) {
    var target = DAY_MAP[dayAbbr];
    var y = view.getFullYear(), mo = view.getMonth();
    var daysInMonth = new Date(y, mo + 1, 0).getDate();
    var lead = new Date(y, mo, 1).getDay();
    var nextOff = new Date(y, mo + 1, 1);
    var prevOk = new Date(y, mo, 0) >= new Date(first.getFullYear(), first.getMonth(), first.getDate());
    var nextOk = nextOff <= last;

    var html = '<div class="booking-cal__head">';
    html += '<button type="button" class="booking-cal__nav" data-cal-move="-1"' + (prevOk ? '' : ' disabled') + ' aria-label="Previous month">‹</button>';
    html += '<span class="booking-cal__month" aria-live="polite">' + MONTH_NAMES[mo] + ' ' + y + '</span>';
    html += '<button type="button" class="booking-cal__nav" data-cal-move="1"' + (nextOk ? '' : ' disabled') + ' aria-label="Next month">›</button>';
    html += '</div><div class="booking-cal__grid">';
    for (var w = 0; w < 7; w++) html += '<span class="booking-cal__dow" aria-hidden="true">' + WEEKDAY_INITIALS[w] + '</span>';
    for (var b = 0; b < lead; b++) html += '<span class="booking-cal__pad"></span>';

    var shutSeen = [];
    for (var day = 1; day <= daysInMonth; day++) {
      var d = new Date(y, mo, day);
      var key = ymd(d);
      var inRange = key >= ymd(first) && key <= ymd(last);
      var isClassDay = d.getDay() === target;
      if (isClassDay && inRange && isShut(d)) {
        var why = shutReason(d);
        shutSeen.push(MONTH_NAMES[mo].slice(0, 3) + ' ' + day + ' — ' + why);
        html += '<span class="booking-cal__day booking-cal__day--shut" title="Closed — ' + esc(why) + '">' + day + '</span>';
        continue;
      }
      if (!isClassDay || !inRange) {
        html += '<span class="booking-cal__day booking-cal__day--off">' + day + '</span>';
        continue;
      }
      var id = 'bookingDate-' + key;
      html += '<input class="booking-cal__radio" type="radio" name="bookingDate" id="' + id + '" value="' + formatDate(d) + '"' + (key === sel ? ' checked' : '') + '>';
      html += '<label class="booking-cal__day booking-cal__day--open" for="' + id + '"><span aria-hidden="true">' + day + '</span><span class="booking-cal__sr">' + formatDate(d) + '</span></label>';
    }
    html += '</div>';
    if (shutSeen.length) html += '<p class="booking-cal__note">Closed ' + esc(shutSeen.join('; ')) + '</p>';
    return html;
  }

  /* ── The overlay ─────────────────────────────────────────────────────── */

  function ensureOverlay() {
    if (document.getElementById('bookingOverlay')) return;
    var el = document.createElement('div');
    el.className = 'booking-overlay';
    el.id = 'bookingOverlay';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', 'Book a free class');
    el.innerHTML = '<div class="booking-modal"><button class="booking-modal__close" id="bookingClose" aria-label="Close">&times;</button><div id="bookingContent"></div></div>';
    document.body.appendChild(el);
  }
  ensureOverlay();

  var overlay = document.getElementById('bookingOverlay');
  var content = document.getElementById('bookingContent');
  var closeBtn = document.getElementById('bookingClose');
  var lastBooking = null;
  var returnFocusTo = null;
  var FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

  function focusables() {
    return [].slice.call(overlay.querySelectorAll(FOCUSABLE)).filter(function (el) { return el.offsetParent !== null; });
  }
  function openModal() {
    if (!overlay.classList.contains('open')) returnFocusTo = document.activeElement;
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        if (!overlay.classList.contains('open')) return;
        var items = focusables();
        var first = items[1] || items[0];
        if (first) first.focus();
      });
    });
  }
  function closeModal() {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
    if (returnFocusTo && document.contains(returnFocusTo)) returnFocusTo.focus();
    returnFocusTo = null;
  }
  closeBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', function (e) { if (e.target === overlay) closeModal(); });
  document.addEventListener('keydown', function (e) {
    if (!overlay.classList.contains('open')) return;
    if (e.key === 'Escape') { closeModal(); return; }
    if (e.key !== 'Tab') return;
    var items = focusables();
    if (!items.length) return;
    var first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    else if (!overlay.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
  });

  /* ── Step 1: pick a class ────────────────────────────────────────────── */

  function showPicker() {
    var html = '<div class="booking-content-enter">';
    html += '<div class="booking-step-header"><h3>Book Your Free Class</h3><p>Pick a class, then pick your day on the calendar. Your first class is free.</p></div>';
    if (!CLASSES.length) {
      html += '<p class="booking-form__consent">Wharton class times are not posted yet. Call us on ' + esc(CONFIG.phone) + ' and we will set you up.</p></div>';
      content.innerHTML = html;
      openModal();
      return;
    }
    GROUPS.forEach(function (g) {
      var rows = CLASSES.map(function (c, i) { return { c: c, i: i }; }).filter(function (r) { return r.c.audience === g.key; });
      if (!rows.length) return;
      html += '<h4 class="booking-group-title">' + g.title + '</h4><div class="booking-class-list">';
      rows.forEach(function (r) {
        html += '<div class="booking-class-row" role="button" tabindex="0" data-idx="' + r.i + '">';
        html += '<span class="booking-class-row__day">' + esc(r.c.day) + '</span>';
        html += '<span class="booking-class-row__time">' + esc(r.c.time) + '</span>';
        html += '<span class="booking-class-row__name">' + esc(r.c.name) + '</span>';
        html += '<span class="booking-class-row__arrow">→</span></div>';
      });
      html += '</div>';
    });
    html += '</div>';
    content.innerHTML = html;
    content.querySelectorAll('.booking-class-row').forEach(function (row) {
      var go = function () { showForm(parseInt(row.getAttribute('data-idx'), 10)); };
      row.addEventListener('click', go);
      row.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
    });
    openModal();
  }

  /* ── Step 2: calendar and details ────────────────────────────────────── */

  function showForm(idx, dateKey) {
    var cls = CLASSES[idx];
    if (!cls) { showPicker(); return; }
    var dayFull = DAY_NAMES[DAY_MAP[cls.day]];
    var dates = upcomingDayDates(cls.day, cls.time);
    if (!dates.length) { showPicker(); return; }

    var html = '<div class="booking-content-enter">';
    html += '<button class="booking-back-btn" id="bookingBackBtn" type="button">← All classes</button>';
    html += '<div class="booking-class-info"><div class="booking-class-badge"><span class="booking-class-badge__name">' + esc(cls.name) + '</span></div>';
    html += '<div class="booking-class-info__datetime">' + dayFull + 's at ' + esc(cls.time) + ' · Labyrinth BJJ Wharton</div></div>';
    html += '<fieldset class="booking-cal"><legend class="booking-cal__legend">Which ' + dayFull + '?</legend><div class="booking-cal__body" id="bookingCal"></div></fieldset>';
    html += '<form class="booking-form" id="bookingForm" autocomplete="on" novalidate>';
    html += '<div class="booking-form__group"><label class="booking-form__label" for="bookingName">Full Name</label><input class="booking-form__input" type="text" id="bookingName" name="name" placeholder="Your full name" required autocomplete="name"></div>';
    html += '<div class="booking-form__group"><label class="booking-form__label" for="bookingEmail">Email</label><input class="booking-form__input" type="email" id="bookingEmail" name="email" placeholder="you@email.com" required autocomplete="email"></div>';
    html += '<div class="booking-form__group"><label class="booking-form__label" for="bookingPhone">Phone</label><input class="booking-form__input" type="tel" id="bookingPhone" name="phone" placeholder="(281) 555-0000" required autocomplete="tel"></div>';
    html += '<div class="hp-field" aria-hidden="true"><label for="bookingCompany">Leave this field empty</label><input type="text" id="bookingCompany" name="company" tabindex="-1" autocomplete="off"></div>';
    html += '<p class="booking-form__consent">We will email and text you to confirm this booking. Reply STOP to any message to opt out.</p>';
    html += '<button type="submit" class="booking-submit-btn" id="bookingSubmitBtn">Confirm Booking</button>';
    html += '</form></div>';
    content.innerHTML = html;

    var firstDate = dates[0];
    var lastDate = new Date(firstDate);
    lastDate.setDate(firstDate.getDate() + BOOK_AHEAD_DAYS);
    var selected = ymd(firstDate);
    var view = new Date(firstDate.getFullYear(), firstDate.getMonth(), 1);
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateKey || '')) {
      var wp = dateKey.split('-');
      var want = new Date(Number(wp[0]), Number(wp[1]) - 1, Number(wp[2]));
      if (want.getDay() === DAY_MAP[cls.day] && dateKey >= ymd(firstDate) && dateKey <= ymd(lastDate) && !isShut(want)) {
        selected = dateKey;
        view = new Date(want.getFullYear(), want.getMonth(), 1);
      }
    }
    var calEl = document.getElementById('bookingCal');
    function drawCal() { calEl.innerHTML = calendarHTML(cls.day, view, selected, firstDate, lastDate); }
    drawCal();

    calEl.addEventListener('click', function (e) {
      var nav = e.target.closest('[data-cal-move]');
      if (!nav || nav.disabled) return;
      view = new Date(view.getFullYear(), view.getMonth() + Number(nav.getAttribute('data-cal-move')), 1);
      drawCal();
      var again = calEl.querySelector('[data-cal-move="' + nav.getAttribute('data-cal-move') + '"]');
      if (again && !again.disabled) again.focus();
      else { var other = calEl.querySelector('[data-cal-move]:not([disabled])'); if (other) other.focus(); }
    });
    calEl.addEventListener('change', function (e) {
      if (e.target.name === 'bookingDate') selected = e.target.id.replace('bookingDate-', '');
    });
    function chosenDate() {
      var picked = calEl.querySelector('input[name="bookingDate"]:checked');
      if (picked) return picked.value;
      var p = selected.split('-');
      return formatDate(new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2])));
    }

    document.getElementById('bookingBackBtn').addEventListener('click', showPicker);
    var form = document.getElementById('bookingForm');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      // Bots fill every field. Say nothing, send nothing.
      if (form.elements.company && form.elements.company.value) return;
      var nameEl = form.elements.name, emailEl = form.elements.email, phoneEl = form.elements.phone;
      var email = emailEl.value.trim();
      var okName = !!nameEl.value.trim();
      var okEmail = email.indexOf('@') > 0 && email.lastIndexOf('.') > email.indexOf('@');
      var okPhone = !!phoneEl.value.trim();
      nameEl.classList.toggle('is-error', !okName);
      emailEl.classList.toggle('is-error', !okEmail);
      phoneEl.classList.toggle('is-error', !okPhone);
      if (!(okName && okEmail && okPhone)) return;
      lastBooking = {
        name: nameEl.value.trim(), email: email, phone: phoneEl.value.trim(),
        cls: cls, classDate: chosenDate()
      };
      submitBooking(lastBooking);
    });
  }

  /* ── Submit ──────────────────────────────────────────────────────────── */

  /* True only if the CRM actually recorded the lead. A visitor told they are
     booked when nobody recorded it is worse off than one told to call. */
  function sendToCrm(payload) {
    return fetch(CRM_BOOKING_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (res) { return res.json().catch(function () { return {}; }); })
      .then(function (out) { return !!(out && out.ok === true); })
      .catch(function () { return false; });
  }

  function payloadFor(data) {
    var c = data.cls;
    return {
      name: data.name,
      email: data.email,
      phone: data.phone,
      program: c.crm || '',
      trialAt: toCentralISO(data.classDate, c.time),
      location: 'wharton',
      className: c.name,
      note: 'WHARTON: ' + c.name + ', ' + DAY_NAMES[DAY_MAP[c.day]] + ' ' + c.time + ', booked from the website'
    };
  }

  function submitBooking(data) {
    var btn = document.getElementById('bookingSubmitBtn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="booking-spinner"></span> Booking...'; }
    sendToCrm(payloadFor(data)).then(function (ok) {
      if (ok) { showSuccess(data); return; }
      if (btn) { btn.disabled = false; btn.innerHTML = 'Confirm Booking'; }
      showError();
    });
  }

  function showSuccess(data) {
    var html = '<div class="booking-content-enter"><div class="booking-success">';
    html += '<div class="booking-success__check"><svg viewBox="0 0 24 24" fill="none" stroke="#C8A24C" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></div>';
    html += '<h3>You’re Booked!</h3>';
    html += '<p class="booking-success__detail">' + esc(data.cls.name) + ' on ' + esc(data.classDate) + ' at ' + esc(data.cls.time) + '</p>';
    if (CONFIG.address) html += '<p class="booking-success__email-note">' + esc(CONFIG.address) + '</p>';
    html += '<p class="booking-success__email-note">A confirmation will be sent to ' + esc(data.email) + '</p>';
    html += '<button class="booking-success__close-btn" id="bookingSuccessClose" type="button">Done</button>';
    html += '</div></div>';
    content.innerHTML = html;
    document.getElementById('bookingSuccessClose').addEventListener('click', closeModal);
  }

  function showError() {
    var html = '<div class="booking-content-enter"><div class="booking-error">';
    html += '<div class="booking-error__icon">⚠️</div><h3>Something Went Wrong</h3>';
    html += '<p>We couldn’t submit your booking. Please try again, or call us on ' + esc(CONFIG.phone) + '.</p>';
    html += '<div class="booking-error__actions"><button class="booking-retry-btn" id="bookingRetryBtn" type="button">Try Again</button>';
    html += '<button class="booking-success__close-btn" id="bookingErrorClose" type="button">Close</button></div></div></div>';
    content.innerHTML = html;
    document.getElementById('bookingRetryBtn').addEventListener('click', function () { if (lastBooking) submitBooking(lastBooking); });
    document.getElementById('bookingErrorClose').addEventListener('click', closeModal);
  }

  /* ── Wiring ──────────────────────────────────────────────────────────── */

  window.WhartonBooking = {
    openPicker: showPicker,
    openForm: function (idx, dateKey) { showForm(idx, dateKey); openModal(); },
    close: closeModal,
    classes: CLASSES,
    nextDate: nextDayDate,
    upcomingDates: upcomingDayDates,
    toCentralISO: toCentralISO,
    payloadFor: payloadFor
  };

  /* Any button or link asking to book without a class in mind. Also the
     no-JavaScript fallback: these are real links to /schedule. */
  document.addEventListener('click', function (e) {
    var cell = e.target.closest('[data-book-class]');
    if (cell) {
      e.preventDefault();
      showForm(parseInt(cell.getAttribute('data-book-class'), 10));
      openModal();
      return;
    }
    var el = e.target.closest('[data-book-trial]');
    if (!el) return;
    e.preventDefault();
    showPicker();
  });

  /* Today's column on a timetable, and the audience filter above it. */
  var todayAbbr = DAY_ABBR[centralNow().getDay()];
  document.querySelectorAll('[data-sc-col]').forEach(function (col) {
    if (col.getAttribute('data-sc-col') === todayAbbr) {
      col.classList.add('is-today');
      var tag = col.querySelector('.sc__today');
      if (tag) tag.hidden = false;
    }
  });
  document.querySelectorAll('[data-sc]').forEach(function (sc) {
    var buttons = sc.querySelectorAll('[data-sc-filter]');
    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var want = btn.getAttribute('data-sc-filter');
        buttons.forEach(function (b) {
          var on = b === btn;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        sc.querySelectorAll('.sc__class').forEach(function (c) {
          c.parentNode.hidden = !(want === 'all' || c.getAttribute('data-aud') === want);
        });
        sc.querySelectorAll('[data-sc-col]').forEach(function (col) {
          col.hidden = !col.querySelector('.sc__list > li:not([hidden])');
        });
      });
    });
  });

  // Arriving at /schedule#book (the no-JavaScript link) opens the picker.
  if (window.location.hash === '#book' && CLASSES.length) showPicker();
})();
