/**
 * The RSVP form on /self-defense-for-women.
 *
 * The page works without this file for everything except sending: the details,
 * the donation link and the phone number are plain HTML. This adds validation,
 * the post to the event-rsvp edge function, the confirmation, and two
 * date-aware touches (a thank-you after a donation, and "this event has passed").
 *
 * The checks below are the same ones the server makes, in the same order, so a
 * message the server would send has already been shown next to the field. The
 * server is the check that counts; this one saves a round trip.
 */
(function () {
  'use strict';

  var form = document.getElementById('rsvp-form');
  if (!form) return;

  // ── Fundraiser total ────────────────────────────────────────────────────────
  // Real numbers from Stripe via the event-donations function. If it can't be
  // reached the page keeps its plain "goal" line and says nothing false.
  (function fundraiser() {
    var box = document.getElementById('fund');
    if (!box || !window.fetch) return;
    var money = function (n) { return '$' + (Math.round(n * 100) % 100 === 0 ? String(Math.round(n)) : n.toFixed(2)); };
    var bust = /[?&]donated=1\b/.test(window.location.search) ? ('?t=' + Date.now()) : '';
    var ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 8000);
    function fill(listId, rows) {
      var ol = document.getElementById(listId);
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
        document.getElementById('fund-raised').textContent = money(d.raised);
        document.getElementById('fund-goal').textContent = money(d.goal);
        document.getElementById('fund-fill').style.width = pct + '%';
        document.getElementById('fund-bar').setAttribute('aria-valuenow', String(Math.min(d.raised, d.goal)));
        if (d.count > 0) {
          var c = document.getElementById('fund-count');
          c.textContent = d.count + (d.count === 1 ? ' supporter' : ' supporters');
          c.hidden = false;
          document.getElementById('fund-first').hidden = true;
          fill('fund-top', d.top || []);
          fill('fund-recent', d.recent || []);
          document.getElementById('fund-lists').hidden = false;
        }
        if (d.raised >= d.goal) document.getElementById('fund-first').hidden = true;
      })
      .catch(function () { clearTimeout(timer); });
  })();

  var endpoint = form.getAttribute('data-endpoint');
  var eventSlug = form.getAttribute('data-event');
  var closes = Date.parse(form.getAttribute('data-closes'));

  var statusEl = document.getElementById('rsvp-status');
  var submitBtn = document.getElementById('rsvp-submit');
  var successEl = document.getElementById('rsvp-success');
  var PHONE_TEXT = '(281) 393-7983';
  var FIELDS = ['name', 'email', 'phone', 'party', 'notes'];

  function $(id) { return document.getElementById(id); }

  // ── Dates ──────────────────────────────────────────────────────────────────
  // After the event the form is replaced by a plain sentence. The server
  // refuses too, so this is courtesy, not the lock.
  if (closes && Date.now() > closes) {
    form.hidden = true;
    $('rsvp-over').hidden = false;
    return;
  }

  // Stripe sends donors back here with ?donated=1 (set on the Payment Link).
  try {
    if (/[?&]donated=1\b/.test(window.location.search)) $('rsvp-donated').hidden = false;
  } catch (e) { /* the thank-you is a nicety */ }

  // ── Validation (mirrors the server) ───────────────────────────────────────
  var hasLetter;
  try { hasLetter = new RegExp('\\p{L}', 'u'); } catch (e) { hasLetter = /[A-Za-z]/; }
  var EMAIL = /^[^@\s]+@[^@\s.]+(\.[^@\s.]+)+$/;

  function squash(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }

  function read() {
    return {
      name: squash($('rsvp-name').value),
      email: squash($('rsvp-email').value).toLowerCase(),
      phone: squash($('rsvp-phone').value),
      party: $('rsvp-party').value,
      notes: squash($('rsvp-notes').value)
    };
  }

  function validate(v) {
    var errs = {};
    if (v.name.length < 2 || !hasLetter.test(v.name)) errs.name = 'Please enter your full name';
    if (!EMAIL.test(v.email) || v.email.length > 160) errs.email = 'That email address does not look right';
    if (v.phone) {
      var digits = v.phone.replace(/\D/g, '').length;
      if (!/^[\d\s()+.-]+$/.test(v.phone) || digits < 10 || digits > 15) {
        errs.phone = 'That phone number does not look right';
      }
    }
    var n = Number(v.party);
    if (!(n % 1 === 0) || n < 1 || n > 5) errs.party = 'Please choose between 1 and 5 people';
    if (v.notes.length > 600) errs.notes = 'Please keep that under 600 characters';
    return errs;
  }

  function showErrors(errs) {
    var first = null;
    FIELDS.forEach(function (f) {
      var input = $('rsvp-' + f);
      var msg = $('rsvp-' + f + '-err');
      var bad = !!errs[f];
      input.classList.toggle('is-error', bad);
      if (bad) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
      msg.textContent = bad ? errs[f] : '';
      if (bad && !first) first = input;
    });
    return first;
  }

  function clearStatus() { statusEl.hidden = true; statusEl.textContent = ''; }

  // Fixing a field clears its message straight away, not at the next submit.
  FIELDS.forEach(function (f) {
    $('rsvp-' + f).addEventListener('input', function () {
      var input = $('rsvp-' + f);
      if (input.classList.contains('is-error')) {
        input.classList.remove('is-error');
        input.removeAttribute('aria-invalid');
        $('rsvp-' + f + '-err').textContent = '';
      }
    });
  });

  // ── Sending ───────────────────────────────────────────────────────────────
  var sending = false;

  function setBusy(on) {
    sending = on;
    submitBtn.disabled = on;
    submitBtn.setAttribute('aria-busy', on ? 'true' : 'false');
    if (on) {
      submitBtn.setAttribute('data-label', submitBtn.textContent);
      submitBtn.innerHTML = '<span class="booking-spinner" aria-hidden="true"></span>Sending';
    } else {
      submitBtn.textContent = submitBtn.getAttribute('data-label') || 'RSVP';
    }
  }

  function phoneLink() {
    var a = document.createElement('a');
    a.href = 'tel:2813937983';
    a.textContent = PHONE_TEXT;
    return a;
  }

  // The number is always a tap-to-call link, whether the sentence came from
  // here or from the server.
  function showStatus(message, appendPhone) {
    statusEl.textContent = '';
    var at = message.indexOf(PHONE_TEXT);
    if (at !== -1) {
      statusEl.appendChild(document.createTextNode(message.slice(0, at)));
      statusEl.appendChild(phoneLink());
      statusEl.appendChild(document.createTextNode(message.slice(at + PHONE_TEXT.length)));
    } else {
      statusEl.appendChild(document.createTextNode(message));
      if (appendPhone) {
        statusEl.appendChild(document.createTextNode(' Please try again, or call us on '));
        statusEl.appendChild(phoneLink());
        statusEl.appendChild(document.createTextNode('.'));
      }
    }
    statusEl.hidden = false;
  }

  function succeed(v) {
    $('rsvp-success-name').textContent = v.name.split(' ')[0];
    $('rsvp-success-party').textContent = Number(v.party) === 1 ? '1 person' : v.party + ' people';
    $('rsvp-success-email').textContent = v.email;
    form.hidden = true;
    successEl.hidden = false;
    successEl.focus();
    if (successEl.scrollIntoView) successEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (sending) return; // a double tap is one RSVP
    clearStatus();

    var v = read();
    var first = showErrors(validate(v));
    if (first) { first.focus(); return; }

    setBusy(true);
    var ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 20000);

    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: ctrl ? ctrl.signal : undefined,
      body: JSON.stringify({
        event: eventSlug,
        name: v.name, email: v.email, phone: v.phone, party: Number(v.party), notes: v.notes,
        // The honeypot goes along as the key the server looks for.
        website: $('rsvp-hp').value
      })
    })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (body) {
          return { status: res.status, body: body || {} };
        });
      })
      .then(function (r) {
        clearTimeout(timer);
        if (r.status === 200 && r.body.ok === true) { succeed(v); return; }
        setBusy(false);
        if (r.status === 400 && r.body.field && FIELDS.indexOf(r.body.field) !== -1) {
          var errs = {}; errs[r.body.field] = r.body.error || 'Please check this field';
          var bad = showErrors(errs);
          if (bad) bad.focus();
          return;
        }
        if (r.status === 410) {
          form.hidden = true;
          $('rsvp-over').hidden = false;
          return;
        }
        // The server's own wording already carries the phone number for the
        // cases where it matters (rate limits, a failed save).
        showStatus(r.body.error || 'We could not send your RSVP.', !(r.body.error && r.body.error.indexOf(PHONE_TEXT) !== -1));
      })
      .catch(function () {
        clearTimeout(timer);
        setBusy(false);
        showStatus('We could not reach the server.', true);
      });
  });
})();
