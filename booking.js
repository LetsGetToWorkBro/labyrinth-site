/**
 * The free-trial booking modal, the site's one booking flow, in one file.
 *
 * It used to live inside app.js, which only the front page loads. So the blog's
 * "Book a Free Trial →" could not open it and pointed at labyrinth.vision/#contact
 * instead: somebody who read to the end of an article and decided to come in was
 * thrown back to the front page to find the booking button themselves. Every one
 * of those is a trial that had already been won and then had a page load put in
 * front of it.
 *
 * Now index.html and all eighteen blog posts load this same file, so there is
 * still exactly one booking form, one class list and one CRM call. The
 * timetable does not get to disagree with itself.
 *
 * What is NOT in here is how the front page works out which class you clicked:
 * reading a schedule table cell, a drawer bar or a day card is front-page markup
 * and stays in app.js. That code calls in through the small API at the bottom.
 *
 *   LabyrinthBooking.openPicker()                      adult or kids?
 *   LabyrinthBooking.openAdultList()                   straight to adult classes
 *   LabyrinthBooking.openKidsTrials()                  straight to the kids trial classes
 *   LabyrinthBooking.openForm(name, type, day, time)   straight to the form
 *   LabyrinthBooking.close()
 *
 * On close it fires a "labyrinth:booking-closed" event on document, which is how
 * the front page knows to shut its mobile nav without this file knowing that a
 * mobile nav exists.
 */
(function () {
  'use strict';

  // Schedule data for class picker
  /* `crm` is the programme the CRM files the lead under, and it is not the
     same string as `name`. The booking endpoint takes the programme from a
     public form, so it accepts only its own six values and quietly defaults
     anything else to "Adult BJJ" — which is why every trial booked here, kids
     included, arrived labelled Adult BJJ and went out in a confirmation email
     saying so. The display name is what the visitor reads; `crm` is what the
     pipeline is told. Both travel: the exact class goes in the note. */
  var ADULT_CLASSES = [
    {name:'Adult BJJ', type:'Gi', day:'Mon', time:'6:30 AM', crm:'Adult BJJ'},
    {name:'Adult BJJ', type:'Gi', day:'Mon', time:'11:00 AM', crm:'Adult BJJ'},
    {name:'Adult BJJ', type:'Gi', day:'Mon', time:'6:30 PM', crm:'Adult BJJ'},
    {name:'Adult BJJ', type:'No-Gi', day:'Tue', time:'6:30 AM', crm:'Adult BJJ'},
    {name:'Adult BJJ', type:'No-Gi', day:'Tue', time:'6:30 PM', crm:'Adult BJJ'},
    {name:'Adult BJJ', type:'Gi', day:'Wed', time:'6:30 AM', crm:'Adult BJJ'},
    {name:'Adult BJJ', type:'No-Gi', day:'Wed', time:'11:00 AM', crm:'Adult BJJ'},
    {name:'Adult BJJ', type:'Gi', day:'Wed', time:'6:30 PM', crm:'Adult BJJ'},
    {name:'Adult BJJ', type:'No-Gi', day:'Thu', time:'6:30 AM', crm:'Adult BJJ'},
    {name:'Adult BJJ', type:'No-Gi', day:'Thu', time:'6:30 PM', crm:'Adult BJJ'},
    {name:'Adult BJJ', type:'Gi', day:'Fri', time:'11:00 AM', crm:'Adult BJJ'},
    {name:'Adult Comp', type:'Gi', day:'Fri', time:'6:30 PM', crm:'Adult BJJ'},
    {name:'Adult Comp', type:'No-Gi', day:'Sat', time:'9:00 AM', crm:'Adult BJJ'},
    {name:'Adult & Teens', type:'No-Gi', day:'Sat', time:'11:00 AM', crm:'Adult BJJ'},
    {name:'Strength & Conditioning', type:'', day:'Tue', time:'4:15 PM', crm:'Adult BJJ'},
    {name:'Strength & Conditioning', type:'', day:'Thu', time:'4:15 PM', crm:'Adult BJJ'},
    {name:'Open Mat', type:'', day:'Sun', time:'10:30 AM', crm:'Adult BJJ'}
  ];
  /* The classes a child who has never trained here may book into.
     Friday is the Gi afternoon and covers every age from three up. Saturday
     morning is No-Gi and starts at seven, because there is no 3\u20136 class on a
     Saturday to put a younger child in. Everything else on the kids timetable
     is either a regular class that trial students do not drop into or an
     advanced one with a belt requirement. */
  var KIDS_TRIAL_CLASSES = [
    {name:'Kids BJJ (3\u20136)', type:'Gi', day:'Fri', time:'4:45 PM', crm:'Kids 3-6'},
    {name:'Kids BJJ Comp (7\u201312)', type:'Gi', day:'Fri', time:'5:15 PM', crm:'Kids 7-12'},
    {name:'Teens BJJ Comp (12\u201315)', type:'Gi', day:'Fri', time:'5:15 PM', crm:'Teens'},
    {name:'Kids Grappling (7\u201312)', type:'No-Gi', day:'Sat', time:'10:00 AM', crm:'Kids 7-12'}
  ];

  /* The six the booking endpoint will accept. Anything else is discarded there
     and replaced with the default, silently, so a class added above without a
     `crm` has to fail loudly here instead. */
  var CRM_PROGRAMS = ['Adult BJJ', 'Kids 3-6', 'Kids 7-12', 'Teens', 'Wrestling', 'Womens'];

  /**
   * Which of the CRM's programmes a class belongs to.
   *
   * Not a lookup by name alone. The schedule carries far more classes than are
   * bookable as trials, and app.js reads the name off the page, so this has to
   * cope with anything printed on the timetable rather than only the entries
   * above. Day and time come along because Friday 5:15 PM is two different
   * classes and the name is what separates them.
   */
  function crmProgramFor(name, day, time) {
    var norm = function (v) {
      return String(v || '').toLowerCase().replace(/[\s\u2013\u2014_-]+/g, ' ').trim();
    };
    var all = ADULT_CLASSES.concat(KIDS_TRIAL_CLASSES);
    var i;
    for (i = 0; i < all.length; i++) {
      if (norm(all[i].name) === norm(name)
        && (!day || all[i].day === day) && (!time || all[i].time === time)) return all[i].crm;
    }
    for (i = 0; i < all.length; i++) {
      if (norm(all[i].name) === norm(name)) return all[i].crm;
    }
    return programFromName(name);
  }

  /**
   * The fallback, for a class that is on the timetable but not bookable here.
   *
   * The age range is the whole point of it: "Kids BJJ" on its own could be the
   * 3-6 class or the 7-12 one. app.js used to strip the range before this ever
   * saw the name, which is how a four-year-old's Friday trial was filed as an
   * adult class.
   */
  function programFromName(name) {
    var n = String(name || '').toLowerCase();
    if (/wom[ae]n/.test(n)) return 'Womens';
    if (/wrestl/.test(n)) return 'Wrestling';
    if (/teen/.test(n) && !/adult/.test(n)) return 'Teens';
    if (/kid|youth|grappl|tiny/.test(n)) {
      var ages = n.match(/(\d{1,2})\s*[\u2013\u2014-]\s*(\d{1,2})/);
      if (ages && parseInt(ages[2], 10) <= 6) return 'Kids 3-6';
      return 'Kids 7-12';
    }
    return 'Adult BJJ';
  }
  var DAY_MAP = {Sun:0, Mon:1, Tue:2, Wed:3, Thu:4, Fri:5, Sat:6};
  var DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  var MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  function getNextDayDate(dayAbbr) {
    var target = DAY_MAP[dayAbbr];
    if (target === undefined) return new Date();
    var now = new Date();
    var diff = (target - now.getDay() + 7) % 7;
    if (diff === 0) diff = 7; // always next week for same day
    var next = new Date(now);
    next.setDate(now.getDate() + diff);
    return next;
  }

  function formatDate(d) {
    return DAY_NAMES[d.getDay()] + ', ' + MONTH_NAMES[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
  }

  function dayAbbrToFull(abbr) {
    var map = {Sun:'Sunday',Mon:'Monday',Tue:'Tuesday',Wed:'Wednesday',Thu:'Thursday',Fri:'Friday',Sat:'Saturday'};
    return map[abbr] || abbr;
  }

  // Detect the type (Gi/No-Gi) from the parent context

  /**
   * The overlay markup, injected when the page has not got it already.
   *
   * index.html carries its own copy in the HTML; a blog post does not, and
   * adding the same nine lines to eighteen files is how they drift apart.
   */
  function ensureOverlay() {
    if (document.getElementById('bookingOverlay')) return;
    var el = document.createElement('div');
    el.className = 'booking-overlay';
    el.id = 'bookingOverlay';
    el.innerHTML =
      '<div class="booking-modal">'
      + '<button class="booking-modal__close" id="bookingClose" aria-label="Close">&times;</button>'
      + '<div id="bookingContent"></div>'
      + '</div>';
    document.body.appendChild(el);
  }
  ensureOverlay();


  // ── Booking overlay / modal references ──
  var bookingOverlay = document.getElementById('bookingOverlay');
  var bookingContent = document.getElementById('bookingContent');
  var bookingCloseBtn = document.getElementById('bookingClose');

  // Store last form data for retry
  var lastBookingData = null;

  function openBookingModal() {
    bookingOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeBookingModal() {
    bookingOverlay.classList.remove('open');
    document.body.style.overflow = '';
    // The front page also wants its mobile nav shut. Said as an event, because
    // this file is loaded on pages that have no mobile nav at all.
    document.dispatchEvent(new CustomEvent('labyrinth:booking-closed'));
  }

  if (bookingCloseBtn) bookingCloseBtn.addEventListener('click', closeBookingModal);
  if (bookingOverlay) {
    bookingOverlay.addEventListener('click', function (e) {
      if (e.target === bookingOverlay) closeBookingModal();
    });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && bookingOverlay && bookingOverlay.classList.contains('open')) {
      closeBookingModal();
    }
  });

  var lastBookingData = null;

  // ===== LABYRINTH CRM =====
  // Bookings land on the Leads board at crm.labyrinth.vision.
  var CRM_BOOKING_URL = 'https://jctufxvmuvobaggxcwfn.supabase.co/functions/v1/book-trial';

  /**
   * The academy's classes are in Fulshear, whoever is booking them.
   *
   * The popup hands over a date and time as words: "Monday, August 3, 2026"
   * and "6:30 PM". Sent as-is, a server is free to read 6:30 as UTC, and a
   * visitor browsing from another state would stamp their own zone on it.
   * Neither is what the class is. So the wall-clock reading is kept exactly as
   * written and Central's offset FOR THAT DATE is attached, not a constant,
   * because the academy runs through both CST and CDT.
   */
  function toCentralISO(dateStr, timeStr) {
    var d = new Date(dateStr + ' ' + timeStr);
    if (isNaN(d)) return null;
    var probe = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 12));
    var offset = -6;
    try {
      var label = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Chicago', timeZoneName: 'shortOffset'
      }).formatToParts(probe).find(function (x) { return x.type === 'timeZoneName'; }).value;
      var m = /GMT([+-]\d{1,2})/.exec(label);
      if (m) offset = parseInt(m[1], 10);
    } catch (e) { /* very old browser. CST is the safer default */ }
    var pad = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
      + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':00'
      + (offset < 0 ? '-' : '+') + pad(Math.abs(offset)) + ':00';
  }

  /** Returns true only if the CRM actually recorded the lead. */
  function sendToCrm(payload) {
    return fetch(CRM_BOOKING_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (res) { return res.json().catch(function () { return {}; }); })
      .then(function (out) { return out && out.ok === true; })
      .catch(function () { return false; });
  }

  // ── Render State A: Class Picker ──
  function showClassPicker() {
    var html = '<div class="booking-content-enter">';
    html += '<div class="booking-step-header"><h3>Book Your Free Trial</h3><p>Choose a program to get started</p></div>';
    html += '<div class="booking-category-btns">';
    html += '<button class="booking-category-btn" data-category="adult"><span class="booking-category-btn__icon">\uD83E\uDD4B</span><span class="booking-category-btn__label">Adult Classes</span></button>';
    html += '<button class="booking-category-btn" data-category="kids"><span class="booking-category-btn__icon">\uD83C\uDFC6</span><span class="booking-category-btn__label">Kids & Teens</span></button>';
    html += '</div></div>';
    bookingContent.innerHTML = html;

    bookingContent.querySelectorAll('.booking-category-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var cat = btn.getAttribute('data-category');
        if (cat === 'adult') {
          showClassList(ADULT_CLASSES, 'Adult Classes');
        } else {
          showKidsTrials();
        }
      });
    });

    openBookingModal();
  }

  // ── Render class list within picker ──
  function showClassList(classes, title) {
    var html = '<div class="booking-content-enter">';
    html += '<button class="booking-back-btn" id="bookingBackBtn">\u2190 Back</button>';
    html += '<div class="booking-step-header"><h3>' + title + '</h3><p>Select a class to book your trial</p></div>';
    html += '<div class="booking-class-list">';
    classes.forEach(function (cls, i) {
      html += '<div class="booking-class-row" data-idx="' + i + '">';
      html += '<span class="booking-class-row__day">' + cls.day + '</span>';
      html += '<span class="booking-class-row__time">' + cls.time + '</span>';
      html += '<span class="booking-class-row__name">' + cls.name + (cls.type ? ', ' + cls.type : '') + '</span>';
      html += '<span class="booking-class-row__arrow">\u2192</span>';
      html += '</div>';
    });
    html += '</div></div>';
    bookingContent.innerHTML = html;

    // Back button
    var backBtn = document.getElementById('bookingBackBtn');
    if (backBtn) backBtn.addEventListener('click', function () { showClassPicker(); });

    // Row clicks
    bookingContent.querySelectorAll('.booking-class-row').forEach(function (row) {
      row.addEventListener('click', function () {
        var idx = parseInt(row.getAttribute('data-idx'), 10);
        var cls = classes[idx];
        showBookingForm(cls.name, cls.type, cls.day, cls.time);
      });
    });
  }

  // ── Render State B: Booking Form ──
  function showBookingForm(className, classType, dayAbbr, timeStr) {
    var nextDate = getNextDayDate(dayAbbr);
    var dateStr = formatDate(nextDate);
    var dayFull = dayAbbrToFull(dayAbbr);

    var typeClass = classType && classType.toLowerCase().replace('-','').replace(' ','') === 'nogi' ? 'nogi' : 'gi';
    var typeLabel = classType || '';

    var html = '<div class="booking-content-enter">';
    html += '<div class="booking-class-info">';
    html += '<div class="booking-class-badge">';
    html += '<span class="booking-class-badge__name">' + className + '</span>';
    if (typeLabel) html += '<span class="booking-class-badge__type booking-class-badge__type--' + typeClass + '">' + typeLabel + '</span>';
    html += '</div>';
    html += '<div class="booking-class-info__datetime">' + dayFull + ' at ' + timeStr + '</div>';
    html += '<div class="booking-class-info__next">Next class: ' + dateStr + '</div>';
    html += '</div>';

    html += '<form class="booking-form" id="bookingForm" autocomplete="on">';
    html += '<div class="booking-form__group"><label class="booking-form__label" for="bookingName">Full Name</label><input class="booking-form__input" type="text" id="bookingName" name="name" placeholder="Your full name" required autocomplete="name"></div>';
    html += '<div class="booking-form__group"><label class="booking-form__label" for="bookingEmail">Email</label><input class="booking-form__input" type="email" id="bookingEmail" name="email" placeholder="you@email.com" required autocomplete="email"></div>';
    html += '<div class="booking-form__group"><label class="booking-form__label" for="bookingPhone">Phone</label><input class="booking-form__input" type="tel" id="bookingPhone" name="phone" placeholder="(281) 555-0000" required autocomplete="tel"></div>';
    html += '<button type="submit" class="booking-submit-btn" id="bookingSubmitBtn">Confirm Booking</button>';
    html += '</form>';
    html += '</div>';

    bookingContent.innerHTML = html;

    // Store class info for submission
    var classInfo = {
      className: className + (typeLabel ? ', ' + typeLabel : ''),
      crmProgram: crmProgramFor(className, dayAbbr, timeStr),
      classDay: dayFull,
      classTime: timeStr,
      classDate: dateStr
    };

    var form = document.getElementById('bookingForm');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var nameVal = document.getElementById('bookingName').value.trim();
      var emailVal = document.getElementById('bookingEmail').value.trim();
      var phoneVal = document.getElementById('bookingPhone').value.trim();

      // Basic validation
      var valid = true;
      if (!nameVal) { document.getElementById('bookingName').classList.add('is-error'); valid = false; }
      else { document.getElementById('bookingName').classList.remove('is-error'); }
      if (!emailVal || emailVal.indexOf('@') === -1) { document.getElementById('bookingEmail').classList.add('is-error'); valid = false; }
      else { document.getElementById('bookingEmail').classList.remove('is-error'); }
      if (!phoneVal) { document.getElementById('bookingPhone').classList.add('is-error'); valid = false; }
      else { document.getElementById('bookingPhone').classList.remove('is-error'); }

      if (!valid) return;

      lastBookingData = {
        name: nameVal,
        email: emailVal,
        phone: phoneVal,
        className: classInfo.className,
        crmProgram: classInfo.crmProgram,
        classDay: classInfo.classDay,
        classTime: classInfo.classTime,
        classDate: classInfo.classDate
      };

      submitBooking(lastBookingData);
    });
  }

  // ── Submit booking ──
  function submitBooking(data) {
    var submitBtn = document.getElementById('bookingSubmitBtn');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="booking-spinner"></span> Booking...';
    }

    /*
     * This used to fire at a Google Apps Script by assigning to an Image src
     * and then show success 800ms later regardless. The old comment read
     * "Silent fail, user still sees success". A broken script was therefore
     * invisible: the visitor was told they were booked and nobody was.
     *
     * It now posts to the CRM and reads the reply. showBookingError() already
     * existed just below and was unreachable, because nothing ever reported a
     * failure.
     */
    sendToCrm({
      name: data.name,
      email: data.email,
      phone: data.phone,
      program: data.crmProgram,
      // They picked a real class off the schedule, so the lead arrives already
      // at "Trial Booked" with the right time, and the confirmation email
      // names that class instead of promising to be in touch.
      trialAt: toCentralISO(data.classDate, data.classTime),
      note: data.className + ', ' + data.classDay + ' ' + data.classTime + ', booked from the website'
    }).then(function (ok) {
      if (ok) {
        showBookingSuccess(data);
      } else {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = 'Book My Free Class';
        }
        showBookingError();
      }
    });
  }

  // ── Render Success State ──
  function showBookingSuccess(data) {
    var html = '<div class="booking-content-enter">';
    html += '<div class="booking-success">';
    html += '<div class="booking-success__check"><svg viewBox="0 0 24 24" fill="none" stroke="#C8A24C" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></div>';
    html += '<h3>You\u2019re Booked!</h3>';
    html += '<p class="booking-success__detail">We\u2019ll see you on ' + data.classDate + ' at ' + data.classTime + '</p>';
    html += '<p class="booking-success__email-note">A confirmation will be sent to ' + data.email + '</p>';
    html += '<button class="booking-success__close-btn" id="bookingSuccessClose">Done</button>';
    html += '</div></div>';
    bookingContent.innerHTML = html;

    document.getElementById('bookingSuccessClose').addEventListener('click', closeBookingModal);
  }

  // ── Render Error State ──
  function showBookingError() {
    var html = '<div class="booking-content-enter">';
    html += '<div class="booking-error">';
    html += '<div class="booking-error__icon">\u26A0\uFE0F</div>';
    html += '<h3>Something Went Wrong</h3>';
    html += '<p>We couldn\u2019t submit your booking. Please try again.</p>';
    html += '<div class="booking-error__actions">';
    html += '<button class="booking-retry-btn" id="bookingRetryBtn">Try Again</button>';
    html += '<button class="booking-success__close-btn" id="bookingErrorClose">Close</button>';
    html += '</div></div></div>';
    bookingContent.innerHTML = html;

    document.getElementById('bookingRetryBtn').addEventListener('click', function () {
      if (lastBookingData) submitBooking(lastBookingData);
    });
    document.getElementById('bookingErrorClose').addEventListener('click', closeBookingModal);
  }

  // ── Render State C: Kids Friday Only ──
  function showKidsTrials() {
    /* Each class carries its own next date now that the list spans two days.
       It used to print one "Next Friday: ..." line above the whole list, which
       stops being true the moment a Saturday class is in it. */
    var html = '<div class="booking-content-enter">';
    html += '<div class="booking-step-header"><h3>Kids Trials</h3></div>';
    html += '<div class="booking-kidstrial-info">';
    html += '<div class="booking-kidstrial-info__icon">\uD83E\uDD4B</div>';
    html += '<p>Kids trials run on <strong>Friday afternoons</strong> in the Gi, for every age from three up, and on <strong>Saturday morning</strong> in No-Gi for ages seven and above. Pick whichever suits you.</p>';
    html += '</div>';
    html += '<div class="booking-kidstrial-classes">';
    KIDS_TRIAL_CLASSES.forEach(function (cls, i) {
      var when = formatDate(getNextDayDate(cls.day));
      html += '<div class="booking-kidstrial-class">';
      html += '<div class="booking-kidstrial-class__info"><span class="booking-kidstrial-class__name">' + cls.name + '</span>';
      html += '<span class="booking-kidstrial-class__time">' + cls.time + ', ' + cls.type + '</span>';
      html += '<span class="booking-kidstrial-class__date">Next: ' + when + '</span></div>';
      html += '<button class="booking-kidstrial-class__btn" data-kid-idx="' + i + '">Book This Class</button>';
      html += '</div>';
    });
    html += '</div></div>';
    bookingContent.innerHTML = html;

    bookingContent.querySelectorAll('.booking-kidstrial-class__btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = parseInt(btn.getAttribute('data-kid-idx'), 10);
        var cls = KIDS_TRIAL_CLASSES[idx];
        showBookingForm(cls.name, cls.type, cls.day, cls.time);
      });
    });

    openBookingModal();
  }

  /**
   * The CRM endpoint, for anything on the site that captures a lead.
   *
   * The contact form on the front page uses it too. It is the same Leads
   * board, so it is exposed separately from the booking modal rather than
   * being reachable only through it.
   */
  window.LabyrinthCrm = { send: sendToCrm, toCentralISO: toCentralISO };

  // ── What the rest of the site may call ──
  window.LabyrinthBooking = {
    openPicker: showClassPicker,
    openAdultList: function () { showClassList(ADULT_CLASSES, 'Adult Classes'); openBookingModal(); },
    openKidsTrials: showKidsTrials,
    openForm: function (name, type, day, time) {
      showBookingForm(name, type, day, time);
      openBookingModal();
    },
    close: closeBookingModal,
    // Read by schedule-check.mjs, which compares what the site offers against
    // the CRM's timetable. Exposed so that check has one place to look.
    adultClasses: ADULT_CLASSES,
    kidsTrialClasses: KIDS_TRIAL_CLASSES,
    // Exposed so a test can walk every row on the schedule and check where it
    // would be filed, without submitting a booking for each one.
    programFor: crmProgramFor
  };

  /**
   * Anything asking to book, anywhere, without a class in mind.
   *
   * A blog post's call to action, and any link to /#book. Bound here rather
   * than in each page so a new post gets it by including this file. The front
   * page's own schedule buttons are handled in app.js, which runs on the
   * capture phase and stops the event before it reaches this.
   */
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-book-trial], a[href$="/#book"], a[href="#book"]');
    if (!el) return;
    e.preventDefault();
    showClassPicker();
  });

  // Someone arriving at labyrinth.vision/#book, from an old blog link, an
  // email, or anywhere else. Should land with the picker already open.
  if (window.location.hash === '#book') {
    showClassPicker();
  }
})();
