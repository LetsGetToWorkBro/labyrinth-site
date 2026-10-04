/* ========================================
   LABYRINTH BJJ WHARTON. Behaviour
   ========================================
   Small on purpose. The main site's app.js is 1,600 lines of schedule, map,
   counters and tournament feeds; this site needs only the nav, the FAQ
   accordion, reveal-on-scroll and the enquiry form. */

(function () {
  'use strict';

  // ===== NAV =====
  var nav = document.getElementById('nav');
  var hamburger = document.getElementById('hamburger');
  var mobileNav = document.getElementById('mobileNav');

  if (nav) {
    var onScroll = function () { nav.classList.toggle('nav--scrolled', window.scrollY > 50); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  function setMenu(open) {
    if (!hamburger || !mobileNav) return;
    mobileNav.classList.toggle('open', open);
    hamburger.classList.toggle('active', open);
    hamburger.setAttribute('aria-expanded', open ? 'true' : 'false');
    document.body.style.overflow = open ? 'hidden' : '';
  }

  if (hamburger && mobileNav) {
    hamburger.addEventListener('click', function () {
      setMenu(!mobileNav.classList.contains('open'));
    });
    mobileNav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () { setMenu(false); });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && mobileNav.classList.contains('open')) {
        setMenu(false);
        hamburger.focus();
      }
    });
    // A phone turned sideways, or a window widened, must not leave the page locked.
    window.addEventListener('resize', function () {
      if (window.innerWidth > 1000 && mobileNav.classList.contains('open')) setMenu(false);
    });
  }

  // ===== REVEAL ON SCROLL =====
  // style.css hides .fade-in and .stagger children until they carry .visible.
  // Without IntersectionObserver (or with reduced motion) show everything now.
  var reveals = document.querySelectorAll('.fade-in, .stagger');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('visible'); });
  }

  // ===== FAQ ACCORDION =====
  var faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(function (item) {
    var btn = item.querySelector('.faq-item__question');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var wasOpen = item.classList.contains('faq-item--active');
      faqItems.forEach(function (other) {
        other.classList.remove('faq-item--active');
        var b = other.querySelector('.faq-item__question');
        if (b) b.setAttribute('aria-expanded', 'false');
      });
      if (!wasOpen) {
        item.classList.add('faq-item--active');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });

  // ===== MOBILE CALL / FREE CLASS BAR =====
  var bar = document.getElementById('mobileCta');
  if (bar) {
    var showBar = function () { bar.classList.toggle('visible', window.scrollY > 300); };
    window.addEventListener('scroll', showBar, { passive: true });
    showBar();
  }

  // ===== THE ENQUIRY FORM =====
  /*
   * Posts to the same CRM endpoint as labyrinth.vision (the book-trial
   * function behind crm.labyrinth.vision), and tells the visitor it worked
   * ONLY if the CRM says it saved: { ok: true }. Anything else, including a
   * network failure, shows the error and the phone number. A visitor who is
   * told they are on the list when nobody recorded it is worse off than one
   * who is told to call.
   *
   * Differences from the main site's booking form, all deliberate:
   *  - there is no class date, because Wharton has no timetable yet, so no
   *    trialAt is sent;
   *  - the note starts with "WHARTON: ", which is how the CRM tags a lead
   *    from this site;
   *  - a hidden "company" field catches form-filling bots: if it has a value
   *    nothing is sent and nothing is shown.
   */
  var CRM_URL = 'https://jctufxvmuvobaggxcwfn.supabase.co/functions/v1/book-trial';

  // The CRM accepts only its own programmes and silently substitutes a default
  // for anything else, so a blank is better than a wrong label.
  var PROGRAMS = { 'adult': 'Adult BJJ', 'kids-3-6': 'Kids 3-6', 'kids-7-12': 'Kids 7-12', 'teens': 'Teens', 'several': '' };
  var WHO = {
    'adult': 'an adult', 'kids-3-6': 'a child aged 3-6', 'kids-7-12': 'a child aged 7-12',
    'teens': 'a teen aged 13-17', 'several': 'more than one person'
  };

  function sendToCrm(payload) {
    return fetch(CRM_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (res) { return res.json().catch(function () { return {}; }); })
      .then(function (out) { return !!(out && out.ok === true); })
      .catch(function () { return false; });
  }

  function buildPayload(form) {
    var v = function (n) {
      var el = form.elements[n];
      return el ? String(el.value || '').trim() : '';
    };
    var who = v('who');
    var parts = ['WHARTON: free first class enquiry'];
    if (WHO[who]) parts.push('for ' + WHO[who]);
    if (v('message')) parts.push(v('message'));
    parts.push('from ' + location.pathname);
    return {
      name: v('name'),
      email: v('email'),
      phone: v('phone'),
      program: PROGRAMS[who] || '',
      note: parts.join(', ')
    };
  }

  function validate(form) {
    var bad = [];
    var name = form.elements.name, email = form.elements.email;
    [name, email].forEach(function (el) { el.classList.remove('is-error'); el.removeAttribute('aria-invalid'); });
    if (!name.value.trim()) bad.push(name);
    var e = email.value.trim();
    if (!e || e.indexOf('@') < 1 || e.lastIndexOf('.') < e.indexOf('@')) bad.push(email);
    bad.forEach(function (el) { el.classList.add('is-error'); el.setAttribute('aria-invalid', 'true'); });
    return bad;
  }

  document.querySelectorAll('form[data-wharton-form]').forEach(function (form) {
    var wrap = form.closest('.trial-form');
    var errorEl = form.querySelector('.w-form__error');
    var btn = form.querySelector('button[type="submit"]');
    var success = wrap && wrap.querySelector('.form-success');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (errorEl) errorEl.hidden = true;

      // Bots fill every field. Say nothing and send nothing.
      var trap = form.elements.company;
      if (trap && trap.value) return;

      var bad = validate(form);
      if (bad.length) { bad[0].focus(); return; }

      var label = btn ? btn.textContent : '';
      if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }

      sendToCrm(buildPayload(form)).then(function (ok) {
        if (btn) { btn.disabled = false; btn.textContent = label; }
        if (ok) {
          form.hidden = true;
          if (success) {
            success.querySelector('.form-success__title').textContent = form.getAttribute('data-success-title') || 'Thank you!';
            success.querySelector('.form-success__text').textContent = form.getAttribute('data-success-text') || '';
            success.classList.add('show');
            success.focus();
          }
        } else if (errorEl) {
          errorEl.hidden = false;
        }
      });
    });
  });

  // Exposed so the test suite can drive the CRM call without a real form.
  window.WhartonCrm = { send: sendToCrm, url: CRM_URL };
})();
