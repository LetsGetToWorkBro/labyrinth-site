/**
 * The interest-list form on /hyrox-youngstars.
 *
 * Plain HTML does everything but the sending: this adds one name-and-age row
 * per child, the same checks the server makes, the post to the event-rsvp edge
 * function, and the confirmation. The server is the check that counts; these
 * save a round trip. Each child goes into the `notes` field as
 * "Kids: Emma (9), Jack (12). Note: ...", which is the shape the function reads.
 */
(function () {
  'use strict';

  var form = document.getElementById('hx-form');
  if (!form) return;

  var endpoint = form.getAttribute('data-endpoint');
  var eventSlug = form.getAttribute('data-event');
  var closes = Date.parse(form.getAttribute('data-closes'));
  var PHONE_TEXT = '(281) 393-7983';

  function $(id) { return document.getElementById(id); }
  var statusEl = $('hx-status'), submitBtn = $('hx-submit'), successEl = $('hx-success');
  var countEl = $('hx-count'), kidsBox = $('hx-kids');

  // After the list closes the form is replaced by a sentence. The server refuses too.
  if (closes && Date.now() > closes) {
    form.hidden = true;
    $('hx-over').hidden = false;
    return;
  }

  // ── One row per child ──────────────────────────────────────────────────────
  var ageOptions = $('hx-kid-age-1').innerHTML;

  function rows() { return kidsBox.querySelectorAll('.hx-kid'); }

  function syncRows() {
    var want = Math.max(1, Math.min(5, parseInt(countEl.value, 10) || 1));
    var have = rows().length;
    var anchor = $('hx-notes-err');
    for (var n = have + 1; n <= want; n++) {
      var row = document.createElement('div');
      row.className = 'hx-kid';
      row.setAttribute('data-kid', String(n));
      row.innerHTML =
        '<input class="booking-form__input" type="text" id="hx-kid-name-' + n + '" aria-label="Child ' + n + ' name" placeholder="Child’s first name" maxlength="40" autocomplete="off">' +
        '<select class="booking-form__input booking-form__select" id="hx-kid-age-' + n + '" aria-label="Child ' + n + ' age on race day">' + ageOptions + '</select>';
      kidsBox.insertBefore(row, anchor);
    }
    for (var m = have; m > want; m--) kidsBox.removeChild(rows()[m - 1]);
  }
  countEl.addEventListener('change', syncRows);
  syncRows();

  // ── Validation (mirrors the server) ───────────────────────────────────────
  var hasLetter;
  try { hasLetter = new RegExp('\\p{L}', 'u'); } catch (e) { hasLetter = /[A-Za-z]/; }
  var EMAIL = /^[^@\s]+@[^@\s.]+(\.[^@\s.]+)+$/;

  function squash(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }
  // Parentheses are how the server finds an age, so they cannot be part of a name.
  function nameOnly(s) { return squash(String(s || '').replace(/[()]/g, ' ')); }

  function read() {
    var kids = [];
    [].forEach.call(rows(), function (r, i) {
      kids.push({ name: nameOnly($('hx-kid-name-' + (i + 1)).value), age: $('hx-kid-age-' + (i + 1)).value });
    });
    return {
      name: squash($('hx-name').value),
      email: squash($('hx-email').value).toLowerCase(),
      phone: squash($('hx-phone').value),
      party: String(kids.length),
      kids: kids,
      note: squash($('hx-note').value)
    };
  }

  function notesFor(v) {
    var list = v.kids.map(function (k) { return k.name + ' (' + k.age + ')'; }).join(', ');
    return 'Kids: ' + list + (v.note ? '. Note: ' + v.note : '');
  }

  function validate(v) {
    var errs = {};
    if (v.name.length < 2 || !hasLetter.test(v.name)) errs.name = 'Please enter your full name';
    if (!EMAIL.test(v.email) || v.email.length > 160) errs.email = 'That email address does not look right';
    if (v.phone) {
      var digits = v.phone.replace(/\D/g, '').length;
      if (!/^[\d\s()+.-]+$/.test(v.phone) || digits < 10 || digits > 15) errs.phone = 'That phone number does not look right';
    }
    var incomplete = v.kids.some(function (k) { return !k.name || !hasLetter.test(k.name) || !k.age; });
    if (incomplete) errs.notes = v.kids.length === 1 ? 'Please add your child’s name and age' : 'Please add a name and age for each child';
    return errs;
  }

  function fieldFor(f) {
    if (f === 'party') return countEl;
    if (f === 'notes') return $('hx-kid-name-1');
    return $('hx-' + f);
  }
  function errFor(f) { return $('hx-' + f + '-err'); }

  function showErrors(errs) {
    var first = null;
    ['name', 'email', 'phone', 'party', 'notes'].forEach(function (f) {
      var input = fieldFor(f), msg = errFor(f), bad = !!errs[f];
      if (!input || !msg) return;
      input.classList.toggle('is-error', bad);
      if (bad) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
      msg.textContent = bad ? errs[f] : '';
      if (bad && !first) first = input;
    });
    return first;
  }

  function clearStatus() { statusEl.hidden = true; statusEl.textContent = ''; }

  form.addEventListener('input', function (e) {
    var t = e.target;
    if (t.classList && t.classList.contains('is-error')) {
      t.classList.remove('is-error');
      t.removeAttribute('aria-invalid');
      var id = t.id.replace(/^hx-/, '');
      var msg = /^kid-/.test(id) ? $('hx-notes-err') : errFor(id);
      if (msg) msg.textContent = '';
    }
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
      submitBtn.textContent = submitBtn.getAttribute('data-label') || 'Add Us to the List';
    }
  }

  function showStatus(message, appendPhone) {
    statusEl.textContent = '';
    var at = message.indexOf(PHONE_TEXT);
    function phoneLink() { var a = document.createElement('a'); a.href = 'tel:2813937983'; a.textContent = PHONE_TEXT; return a; }
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
    $('hx-success-name').textContent = v.name.split(' ')[0];
    $('hx-success-kids').textContent = v.kids.map(function (k) { return k.name; }).join(', ');
    $('hx-success-email').textContent = v.email;
    form.hidden = true;
    successEl.hidden = false;
    successEl.focus();
    if (successEl.scrollIntoView) successEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (sending) return; // a double tap is one sign-up
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
        name: v.name, email: v.email, phone: v.phone, party: Number(v.party), notes: notesFor(v),
        website: $('hx-hp').value
      })
    })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (body) { return { status: res.status, body: body || {} }; });
      })
      .then(function (r) {
        clearTimeout(timer);
        if (r.status === 200 && r.body.ok === true) { succeed(v); return; }
        setBusy(false);
        if (r.status === 400 && r.body.field && errFor(r.body.field)) {
          var errs = {}; errs[r.body.field] = r.body.error || 'Please check this field';
          var bad = showErrors(errs);
          if (bad) bad.focus();
          return;
        }
        if (r.status === 410) { form.hidden = true; $('hx-over').hidden = false; return; }
        showStatus(r.body.error || 'We could not send your sign-up.', !(r.body.error && r.body.error.indexOf(PHONE_TEXT) !== -1));
      })
      .catch(function () {
        clearTimeout(timer);
        setBusy(false);
        showStatus('We could not reach the server.', true);
      });
  });
})();
