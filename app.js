/* ========================================
   LABYRINTH BJJ — Application JavaScript
   ======================================== */

(function () {
  'use strict';

  // ===== LIVE STATS FROM GOOGLE SHEET =====
  // Replace with your actual Google Sheet ID (same one used for the tournament calendar)
  var SHEET_ID = '1rUtzsV6l1fHcgYuCjaqCh-oG2XosggrW1el3aqaDOME';

  // Promise that resolves when live stats are loaded (or fails silently)
  var statsReady;

  /**
   * Fetches live stats from the Google Sheet Config tab and updates
   * all data-target attributes + hardcoded text on the page.
   * Falls back silently to the defaults already in the HTML if fetch fails.
   */
  function fetchLiveStats() {
    if (!SHEET_ID) {
      statsReady = Promise.resolve();
      return;
    }

    var url = 'https://docs.google.com/spreadsheets/d/' + SHEET_ID +
              '/gviz/tq?tqx=out:csv&sheet=Config';

    statsReady = fetch(url)
      .then(function (res) { return res.text(); })
      .then(function (csv) {
        var stats = parseConfigCSV(csv);
        if (stats) applyStats(stats);
      })
      .catch(function () {
        // Silent fail — hardcoded defaults remain
      });
  }

  function parseConfigCSV(csv) {
    var lines = csv.split('\n').map(function (l) {
      return l.replace(/"/g, '').split(',');
    });
    var stats = {};
    lines.forEach(function (row) {
      if (!row[0]) return;
      var key = row[0].trim().toLowerCase();
      var val = (row[1] || '').trim();
      if (key === 'national rank' && val) stats.nationalRank = parseInt(val, 10) || null;
      if (key === 'gold medals' && val) stats.goldMedals = parseInt(val, 10) || null;
      if (key === 'total medals' && val) stats.totalMedals = parseInt(val, 10) || null;
      if (key === 'submission rate' && val) stats.submissionRate = parseFloat(val) || null;
      if (key === 'active competitors' && val) stats.activeCompetitors = parseInt(val, 10) || null;
      if (key === 'total matches' && val) stats.totalMatches = parseInt(val, 10) || null;
      if (key === 'total wins' && val) stats.totalWins = parseInt(val, 10) || null;
      if (key === 'state rank' && val) stats.stateRank = parseInt(val, 10) || null;
      if (key === 'academy score' && val) stats.academyScore = parseInt(val, 10) || null;
      if (key === 'tournaments' && val) stats.tournaments = parseInt(val, 10) || null;
    });
    // Only return if we got at least some data
    return (stats.nationalRank || stats.goldMedals) ? stats : null;
  }

  function applyStats(s) {
    // Helper: update data-target on elements matching a label
    function updateByLabel(labelText, value, containerId) {
      if (!value) return;
      var container = containerId ? document.getElementById(containerId) : document;
      if (!container) return;
      var labels = container.querySelectorAll('.hero__stat-label, .stat-card__label');
      labels.forEach(function (label) {
        if (label.textContent.trim().toLowerCase() === labelText.toLowerCase()) {
          var valEl = label.previousElementSibling ||
                      label.parentElement.querySelector('[data-target]');
          if (valEl && valEl.hasAttribute('data-target')) {
            valEl.setAttribute('data-target', value);
          }
        }
      });
    }

    // ── Hero stats ──
    updateByLabel('Gold Medals', s.goldMedals, 'heroStats');
    var winsVal = s.totalWins || s.totalMatches;
    if (winsVal) updateByLabel('Total Wins', winsVal, 'heroStats');
    updateByLabel('Ranked Athletes', s.activeCompetitors, 'heroStats');

    // ── Stats grid ──
    updateByLabel('National Rank', s.nationalRank, 'statsGrid');
    updateByLabel('Gold Medals', s.goldMedals, 'statsGrid');
    if (winsVal) updateByLabel('Total Wins', winsVal, 'statsGrid');
    if (s.submissionRate) updateByLabel('Submission Rate', Math.round(s.submissionRate), 'statsGrid');

    // ── Meters ──
    if (s.submissionRate) {
      var subFill = document.querySelector('.meter__fill[data-width]');
      var subValue = document.querySelector('.meter__value');
      if (subFill) subFill.setAttribute('data-width', Math.round(s.submissionRate));
      if (subValue) subValue.textContent = Math.round(s.submissionRate) + '%';
    }

    // ── Hero title (h1) — update ranking text dynamically while preserving SEO H1 spans ──
    var heroVisual = document.querySelector('.hero__h1-visual');
    if (heroVisual) {
      var natRank = s.nationalRank || 9;
      var stRank  = s.stateRank || 1;
      heroVisual.innerHTML = 'RANKED #' + natRank + ' IN THE NATION. <span>#' + stRank + ' IN TEXAS.</span>';
    } else {
      // Fallback for old markup
      var heroTitle = document.querySelector('.hero__title');
      if (heroTitle) {
        var natRank = s.nationalRank || 9;
        var stRank  = s.stateRank || 1;
        heroTitle.innerHTML = 'RANKED #' + natRank + ' IN THE NATION. <span>#' + stRank + ' IN TEXAS.</span>';
      }
    }

    // ── Hero subtitle text ──
    var heroSub = document.querySelector('.hero__subtitle');
    if (heroSub) {
      var goldText = s.goldMedals ? s.goldMedals : '267';
      var winsText = s.totalWins ? s.totalWins : (s.totalMatches ? s.totalMatches : '890');
      heroSub.textContent = goldText + ' gold medals. ' + winsText +
        '+ wins. IBJJF Pan Am, ADCC, and JJWL champions \u2014 built from the ground up in Fulshear.';
    }

    // ── Hero stat: "In Texas" — update state rank ──
    updateByLabel('In Texas', s.stateRank || 1, 'heroStats');
  }

  /**
   * Fetches live athlete stats from the Athletes tab and updates
   * the athlete cards on the page. Falls back to hardcoded defaults.
   */
  function fetchAthleteStats() {
    if (!SHEET_ID) return;

    var url = 'https://docs.google.com/spreadsheets/d/' + SHEET_ID +
              '/gviz/tq?tqx=out:csv&sheet=Athletes';

    fetch(url)
      .then(function (res) { return res.text(); })
      .then(function (csv) {
        var athletes = parseAthletesCSV(csv);
        athletes.forEach(function (a) { applyAthleteStats(a); });
      })
      .catch(function () {
        // Silent fail — hardcoded defaults remain
      });
  }

  function parseAthletesCSV(csv) {
    var lines = csv.trim().split('\n');
    if (lines.length < 2) return [];

    // Parse header
    var headers = lines[0].replace(/"/g, '').split(',').map(function (h) { return h.trim().toLowerCase().replace(/\s+/g, '_'); });
    var athletes = [];

    for (var i = 1; i < lines.length; i++) {
      var vals = lines[i].replace(/"/g, '').split(',');
      var obj = {};
      headers.forEach(function (h, idx) { obj[h] = (vals[idx] || '').trim(); });
      if (obj.slug) athletes.push(obj);
    }
    return athletes;
  }

  function applyAthleteStats(a) {
    var card = document.querySelector('[data-athlete="' + a.slug + '"]');
    if (!card) return;

    // Update tier + rating
    var tierEl = card.querySelector('.athlete-card__tier');
    if (tierEl && a.tier && a.rating) {
      tierEl.textContent = a.tier + ' \u00B7 ' + Number(a.rating).toLocaleString();
    } else if (tierEl && a.tier) {
      tierEl.textContent = a.tier;
    }

    // Update stat spans in order: record, win rate, sub rate/golds
    var statEls = card.querySelectorAll('.athlete-card__stat');
    statEls.forEach(function (el) {
      var text = el.textContent.toLowerCase();
      if (text.includes('record') && a.wins && a.losses) {
        el.innerHTML = '<strong>' + a.wins + '-' + a.losses + '</strong> record';
      } else if (text.includes('win rate') && a.win_rate) {
        el.innerHTML = '<strong>' + a.win_rate + '%</strong> win rate';
      } else if (text.includes('sub rate') && a.sub_rate) {
        el.innerHTML = '<strong>' + a.sub_rate + '%</strong> sub rate';
      } else if (text.includes('gold') && a.golds) {
        el.innerHTML = '<strong>' + a.golds + '</strong> golds';
      }
    });
  }

  // ===== UPCOMING TOURNAMENTS FROM GOOGLE SHEET =====
  var ORG_HEX = {
    jjwl:'#22c55e', ibjjf:'#3b82f6', adcc:'#f59e0b',
    naga:'#6b7280', agf:'#6b7280', battleground:'#6b7280',
    shp:'#a855f7', elevate:'#ec4899', other:'#6b7280'
  };
  var DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  var MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var INITIAL_SHOW = 3;

  function fetchUpcomingTournaments() {
    if (!SHEET_ID) return;
    var url = 'https://docs.google.com/spreadsheets/d/' + SHEET_ID +
              '/gviz/tq?tqx=out:csv&sheet=Events';
    fetch(url)
      .then(function (res) { return res.text(); })
      .then(function (csv) {
        var events = parseEventsCSV(csv);
        renderTournaments(events);
      })
      .catch(function () {
        // Silent fail
      });
  }

  function parseCSVRow(line) {
    var fields = [];
    var current = '';
    var inQuotes = false;
    for (var i = 0; i < line.length; i++) {
      var ch = line[i];
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (ch === ',' && !inQuotes) { fields.push(current.trim()); current = ''; continue; }
      current += ch;
    }
    fields.push(current.trim());
    return fields;
  }

  function parseDate(str) {
    if (!str) return null;
    // Try ISO format first: YYYY-MM-DD
    var d = new Date(str + 'T00:00:00');
    if (!isNaN(d.getTime())) return d;
    // Try M/D/YYYY format
    var parts = str.split('/');
    if (parts.length === 3) {
      d = new Date(parseInt(parts[2],10), parseInt(parts[0],10)-1, parseInt(parts[1],10));
      if (!isNaN(d.getTime())) return d;
    }
    return null;
  }

  function parseEventsCSV(csv) {
    var lines = csv.trim().split('\n');
    if (lines.length < 2) return [];
    var headers = parseCSVRow(lines[0]).map(function (h) { return h.toLowerCase(); });
    var rawEvents = [];
    var now = new Date();
    now.setHours(0, 0, 0, 0);
    for (var i = 1; i < lines.length; i++) {
      var row = parseCSVRow(lines[i]);
      var obj = {};
      headers.forEach(function (h, idx) { obj[h] = (row[idx] || '').trim(); });
      if (!obj.date || !obj.name) continue;
      var d = parseDate(obj.date);
      if (!d || d < now) continue;
      obj._date = d;
      obj._diff = Math.ceil((d - now) / 86400000);
      // Normalize end_date
      if (obj.end_date) {
        var ed = parseDate(obj.end_date);
        obj._endDate = ed;
      }
      rawEvents.push(obj);
    }

    // Combine JJWL sub-events on the same date
    var jjwlByDate = {};
    var nonJjwl = [];
    rawEvents.forEach(function(ev) {
      var orgKey = (ev.org || '').toLowerCase().replace(/[^a-z]/g, '');
      if (orgKey === 'jjwl') {
        var key = ev._date.toISOString().split('T')[0];
        if (!jjwlByDate[key]) jjwlByDate[key] = [];
        jjwlByDate[key].push(ev);
      } else {
        nonJjwl.push(ev);
      }
    });
    var combined = nonJjwl.slice();
    Object.keys(jjwlByDate).forEach(function(dateKey) {
      var group = jjwlByDate[dateKey];
      if (group.length <= 1) { combined.push(group[0]); return; }
      // Merge into one entry with the base name
      var baseName = (group[0].name || '').replace(/\s*\([^)]*\)\s*$/,'').replace(/\s*(Gi|NoGi|No-?Gi|NoGI|Adults|Youth|Masters|and|And|&)\s*/gi,' ').replace(/\s+/g,' ').trim();
      var bestLoc = group.reduce(function(best, e) { return (e.location||'').length > best.length ? e.location : best; }, '');
      var bestLink = '';
      group.forEach(function(e) { if (e.link && !bestLink) bestLink = e.link; });
      var isFeat = group.some(function(e) { return (e.priority||'').toUpperCase() === 'TRUE'; });
      combined.push({
        name: baseName || group[0].name,
        date: group[0].date,
        org: 'JJWL',
        location: bestLoc || group[0].location,
        link: bestLink,
        priority: isFeat ? 'TRUE' : 'FALSE',
        _date: group[0]._date,
        _diff: group[0]._diff
      });
    });

    // Dedup: same org + same date = keep the one with better data
    var dedupMap = {};
    var deduped = [];
    combined.forEach(function(ev) {
      var orgKey = (ev.org || '').toLowerCase().replace(/[^a-z]/g, '');
      var dateKey = ev._date.toISOString().split('T')[0];
      var key = orgKey + '_' + dateKey;
      if (dedupMap[key]) {
        var existing = dedupMap[key];
        var scoreA = (existing.name||'').length + (existing.link?10:0) + (existing.location||'').length + (existing.end_date?15:0);
        var scoreB = (ev.name||'').length + (ev.link?10:0) + (ev.location||'').length + (ev.end_date?15:0);
        if (scoreB > scoreA) {
          var idx = deduped.indexOf(existing);
          if (idx !== -1) deduped[idx] = ev;
          dedupMap[key] = ev;
        }
      } else {
        dedupMap[key] = ev;
        deduped.push(ev);
      }
    });

    // Fuzzy dedup helpers
    function nameWords(n) {
      return (n||'').toLowerCase().replace(/[^a-z0-9\s]/g,'').split(/\s+/).filter(function(w) {
        return w.length > 2 && ['the','and','for','jiu','jitsu','championship','open','international'].indexOf(w) === -1;
      });
    }
    function nameOverlap(a, b) {
      var wa = nameWords(a), wb = nameWords(b);
      if (wa.length === 0 || wb.length === 0) return 0;
      var shared = wa.filter(function(w) { return wb.indexOf(w) !== -1; }).length;
      return shared / Math.min(wa.length, wb.length);
    }
    function locMatch(a, b) {
      if (!a || !b) return false;
      var la = a.toLowerCase().replace(/[^a-z0-9]/g,'').substring(0,40);
      var lb = b.toLowerCase().replace(/[^a-z0-9]/g,'').substring(0,40);
      return la.length > 10 && la === lb;
    }

    // Remove subset events (multi-day covers single-day)
    var toRemove = {};
    for (var a = 0; a < deduped.length; a++) {
      var evA = deduped[a];
      if (!evA._endDate || evA._endDate <= evA._date) continue;
      for (var b = 0; b < deduped.length; b++) {
        if (a === b || toRemove[b]) continue;
        var evB = deduped[b];
        var orgA = (evA.org||'').toLowerCase().replace(/[^a-z]/g,'');
        var orgB = (evB.org||'').toLowerCase().replace(/[^a-z]/g,'');
        if (orgA !== orgB) continue;
        if (evB._date >= evA._date && evB._date <= evA._endDate) {
          var normA = (evA.name||'').toLowerCase().replace(/[^a-z0-9]/g,'');
          var normB = (evB.name||'').toLowerCase().replace(/[^a-z0-9]/g,'');
          var nameMatch = normA === normB || normA.indexOf(normB) !== -1 || normB.indexOf(normA) !== -1 || nameOverlap(evA.name, evB.name) >= 0.5;
          var locationMatch = locMatch(evA.location, evB.location);
          if (nameMatch || locationMatch) {
            // Keep the one with better data (end_date)
            if (!evA.end_date && evB.end_date) evA.end_date = evB.end_date;
            if (!evA._endDate && evB._endDate) evA._endDate = evB._endDate;
            toRemove[b] = true;
          }
        }
      }
    }
    // Also catch close-date dupes with same org + same location
    for (var i = 0; i < deduped.length; i++) {
      if (toRemove[i]) continue;
      for (var j = i + 1; j < deduped.length; j++) {
        if (toRemove[j]) continue;
        var ei = deduped[i], ej = deduped[j];
        if ((ei.org||'').toLowerCase() !== (ej.org||'').toLowerCase()) continue;
        if (!locMatch(ei.location, ej.location)) continue;
        var diff = Math.abs(ei._date - ej._date) / (1000*60*60*24);
        if (diff <= 2) {
          var si = (ei.name||'').length + (ei.link?10:0) + (ei.end_date?20:0);
          var sj = (ej.name||'').length + (ej.link?10:0) + (ej.end_date?20:0);
          if (si >= sj) {
            if (!ei._endDate && ej._endDate) { ei._endDate = ej._endDate; ei.end_date = ej.end_date; }
            toRemove[j] = true;
          } else {
            if (!ej._endDate && ei._endDate) { ej._endDate = ei._endDate; ej.end_date = ei.end_date; }
            toRemove[i] = true;
            break;
          }
        }
      }
    }
    var final = deduped.filter(function(_, idx) { return !toRemove[idx]; });

    final.sort(function (a, b) { return a._date - b._date; });
    return final;
  }

  function renderTournaments(events) {
    var listEl = document.getElementById('tournamentList');
    var actionsEl = document.getElementById('tournamentActions');
    var emptyEl = document.getElementById('tournamentEmpty');
    var toggleBtn = document.getElementById('tournamentToggle');
    if (!listEl) return;

    if (!events.length) {
      listEl.style.display = 'none';
      if (emptyEl) emptyEl.style.display = '';
      return;
    }

    var html = '';
    events.forEach(function (ev, idx) {
      var orgKey = (ev.org || '').toLowerCase().replace(/[^a-z]/g, '');
      var hex = ORG_HEX[orgKey] || '#C8A24C';
      var d = ev._date;
      var dayNum = d.getDate();
      var dow = DAYS[d.getDay()];
      var monthStr = MONTHS_SHORT[d.getMonth()];
      var hiddenClass = idx >= INITIAL_SHOW ? ' is-hidden' : '';
      var isFeatured = (ev.priority || '').toUpperCase() === 'TRUE';
      var orgLabel = (ev.org || 'Event').toUpperCase();
      var link = ev.link || '#';

      // Multi-day support
      var dateDisplay, dowDisplay;
      if (ev._endDate && ev._endDate > ev._date) {
        dateDisplay = dayNum + '-' + ev._endDate.getDate();
        dowDisplay = DAYS[d.getDay()].substring(0,3) + '-' + DAYS[ev._endDate.getDay()].substring(0,3);
      } else {
        dateDisplay = dayNum;
        dowDisplay = dow;
      }

      html += '<a class="tournament-card' + hiddenClass + '" style="--tc-color:' + hex + '" href="' + link + '" target="_blank" rel="noopener noreferrer">';
      html += '<div class="tournament-card__date"><span class="tournament-card__day">' + dateDisplay + '</span><span class="tournament-card__dow">' + dowDisplay + '</span></div>';
      html += '<div class="tournament-card__info"><div class="tournament-card__name">' + (isFeatured ? '\u2B50 ' : '') + ev.name + '</div>';
      html += '<div class="tournament-card__meta"><span class="tournament-card__org">' + orgLabel + '</span>';
      if (ev.location) html += '<span>' + ev.location + '</span>';
      html += '</div></div>';
      html += '<span class="tournament-card__countdown">In ' + ev._diff + ' day' + (ev._diff !== 1 ? 's' : '') + '</span>';
      html += '</a>';
    });

    listEl.innerHTML = html;

    // Show toggle if more than INITIAL_SHOW
    if (events.length > INITIAL_SHOW && actionsEl && toggleBtn) {
      actionsEl.style.display = '';
      var expanded = false;
      toggleBtn.addEventListener('click', function () {
        expanded = !expanded;
        var cards = listEl.querySelectorAll('.tournament-card');
        cards.forEach(function (card, idx) {
          if (idx >= INITIAL_SHOW) {
            card.classList.toggle('is-hidden', !expanded);
          }
        });
        toggleBtn.textContent = expanded
          ? 'Show Less'
          : 'Show All (' + events.length + ')';
      });
      toggleBtn.textContent = 'Show All (' + events.length + ')';
    }
  }

  // Kick off all fetches immediately
  fetchLiveStats();
  fetchAthleteStats();
  fetchUpcomingTournaments();

  // ===== HERO VIDEO AUTOPLAY =====
  (function() {
    var video = document.querySelector('.hero__video');
    if (!video) return;

    // Safari requires muted before load
    video.muted = true;
    video.defaultMuted = true;
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');

    function tryPlay() {
      var playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.then(function() {
          // Playing successfully
          video.style.opacity = '1';
        }).catch(function() {
          // Autoplay blocked — show fallback image
          video.style.display = 'none';
          var fallback = video.parentElement.querySelector('.hero__fallback');
          if (fallback) {
            fallback.style.position = 'static';
            fallback.style.zIndex = 'auto';
          }
        });
      }
    }

    // Try immediately
    tryPlay();

    // Safari sometimes needs a delay after DOM ready
    if (video.paused) {
      setTimeout(tryPlay, 100);
    }

    // Also try on loadeddata event
    video.addEventListener('loadeddata', function() {
      if (video.paused) tryPlay();
    }, { once: true });

    // Also try on user interaction as last resort
    document.addEventListener('click', function safariFix() {
      if (video.paused) tryPlay();
      document.removeEventListener('click', safariFix);
    }, { once: true });
  })();

  // ===== NAVIGATION =====
  const nav = document.getElementById('nav');
  const hamburger = document.getElementById('hamburger');
  const mobileNav = document.getElementById('mobileNav');

  // Sticky nav background on scroll
  let lastScroll = 0;
  function handleNavScroll() {
    const scrollY = window.scrollY;
    if (scrollY > 50) {
      nav.classList.add('nav--scrolled');
    } else {
      nav.classList.remove('nav--scrolled');
    }
    lastScroll = scrollY;
  }

  window.addEventListener('scroll', handleNavScroll, { passive: true });

  // Hamburger toggle
  hamburger.addEventListener('click', function () {
    const isOpen = mobileNav.classList.contains('open');
    mobileNav.classList.toggle('open');
    hamburger.classList.toggle('active');
    hamburger.setAttribute('aria-expanded', !isOpen);
    document.body.style.overflow = isOpen ? '' : 'hidden';
  });

  // Close mobile nav on link click
  mobileNav.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () {
      mobileNav.classList.remove('open');
      hamburger.classList.remove('active');
      hamburger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    });
  });

  // ===== SCROLL ANIMATIONS =====
  const observerOptions = {
    threshold: 0.15,
    rootMargin: '0px 0px -40px 0px'
  };

  const fadeObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        fadeObserver.unobserve(entry.target);
      }
    });
  }, observerOptions);

  document.querySelectorAll('.fade-in, .stagger').forEach(function (el) {
    fadeObserver.observe(el);
  });

  // ===== COUNTER ANIMATION =====
  function animateCounter(element) {
    const target = parseInt(element.getAttribute('data-target'), 10);
    const prefix = element.getAttribute('data-prefix') || '';
    const suffix = element.getAttribute('data-suffix') || '';
    const duration = 1200;
    const startTime = performance.now();

    function easeOut(t) {
      return 1 - Math.pow(1 - t, 3);
    }

    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOut(progress);
      const current = Math.round(easedProgress * target);

      element.textContent = prefix + current.toLocaleString() + suffix;

      if (progress < 1) {
        requestAnimationFrame(update);
      }
    }

    requestAnimationFrame(update);
  }

  // Observe counters — wait for live stats before animating so we count to the right numbers
  function animateAllCounters(container) {
    var counters = container.querySelectorAll('[data-target]');
    counters.forEach(function (counter) {
      animateCounter(counter);
    });
  }

  const counterObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        var target = entry.target;
        counterObserver.unobserve(target);
        // Wait for live stats to load so data-target values are updated first
        (statsReady || Promise.resolve()).then(function () {
          animateAllCounters(target);
        });
      }
    });
  }, { threshold: 0.3 });

  var heroStats = document.getElementById('heroStats');
  if (heroStats) counterObserver.observe(heroStats);

  var statsGrid = document.getElementById('statsGrid');
  if (statsGrid) counterObserver.observe(statsGrid);

  // ===== METER FILL ANIMATION =====
  const meterObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        var fills = entry.target.querySelectorAll('.meter__fill');
        fills.forEach(function (fill) {
          var width = fill.getAttribute('data-width');
          setTimeout(function () {
            fill.style.width = width + '%';
          }, 200);
        });
        meterObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });

  document.querySelectorAll('.meters').forEach(function (el) {
    meterObserver.observe(el);
  });


  // ===== LABYRINTH CRM =====
  // Bookings land on the Leads board at crm.labyrinth.vision.
  var CRM_BOOKING_URL = 'https://jctufxvmuvobaggxcwfn.supabase.co/functions/v1/book-trial';

  /**
   * The academy's classes are in Fulshear, whoever is booking them.
   *
   * The popup hands over a date and time as words — "Monday, August 3, 2026"
   * and "6:30 PM". Sent as-is, a server is free to read 6:30 as UTC, and a
   * visitor browsing from another state would stamp their own zone on it.
   * Neither is what the class is. So the wall-clock reading is kept exactly as
   * written and Central's offset FOR THAT DATE is attached — not a constant,
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
    } catch (e) { /* very old browser — CST is the safer default */ }
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

  // ===== FORM HANDLING =====
  var contactForm = document.getElementById('contactForm');
  var formSuccess = document.getElementById('formSuccess');

  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();

      /*
       * This used to hide the form and show "thanks" — and do nothing else.
       * There was no endpoint. Every enquiry made through it was discarded, and
       * the person was told it had worked. It now goes to the CRM, and the
       * success message is shown only if the CRM says it saved.
       */
      var btn = contactForm.querySelector('button[type="submit"]');
      var original = btn ? btn.textContent : '';
      if (btn) { btn.disabled = true; btn.textContent = 'Sending\u2026'; }

      // The <select> holds slugs; the Leads board is read by people.
      var PROGRAM_LABELS = {
        'kids-3-6': 'Kids 3-6', 'kids-7-12': 'Kids 7-12', 'teens': 'Teens',
        'adult-gi': 'Adult BJJ', 'adult-nogi': 'Adult BJJ',
        'competition': 'Adult BJJ', 'wrestling': 'Wrestling'
      };
      var val = function (n) {
        var el = contactForm.querySelector('[name="' + n + '"]');
        return el ? el.value : '';
      };

      sendToCrm({
        name: val('name'),
        email: val('email'),
        phone: val('phone'),
        program: PROGRAM_LABELS[val('program')] || '',
        note: val('message')
      }).then(function (ok) {
        if (btn) { btn.disabled = false; btn.textContent = original; }
        if (ok) {
          contactForm.style.display = 'none';
          formSuccess.classList.add('show');
        } else {
          // Telling somebody they are booked when nothing was recorded is
          // worse than telling them to call.
          alert('Sorry \u2014 we could not send that. Please call the academy on (281) 393-7983 and we will book you in.');
        }
      });
    });
  }

  // ===== LEAFLET MAP =====
  function initMap() {
    if (typeof L === 'undefined') return;

    var mapEl = document.getElementById('map');
    if (!mapEl) return;

    var lat = 29.6898;
    var lng = -95.8963;

    var map = L.map('map', {
      center: [lat, lng],
      zoom: 14,
      scrollWheelZoom: false,
      attributionControl: true
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> &copy; <a href="https://carto.com/" target="_blank" rel="noopener noreferrer">CARTO</a>',
      maxZoom: 19
    }).addTo(map);

    // Custom gold marker
    var goldIcon = L.divIcon({
      className: 'custom-marker',
      html: '<div style="width:20px;height:20px;background:#C8A24C;border-radius:50%;border:3px solid #0A0A0A;box-shadow:0 0 10px rgba(200,162,76,0.5);"></div>',
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });

    L.marker([lat, lng], { icon: goldIcon })
      .addTo(map)
      .bindPopup('<strong style="font-size:14px;">Labyrinth BJJ</strong><br>6615 W Cross Creek Bend Ln<br>Suite #400, Fulshear, TX 77441');
  }

  // Initialize map when it comes into view
  var mapObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        initMap();
        mapObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  var footerEl = document.getElementById('footer');
  if (footerEl) mapObserver.observe(footerEl);

  // ===== ADVANCED CLASS MODAL =====
  var advModal = document.getElementById('advModal');
  var modalClose = document.getElementById('modalClose');
  var modalCancel = document.getElementById('modalCancel');
  var modalConfirm = document.getElementById('modalConfirm');
  var pendingAdvClass = null; // stores {name, type, day, time} of the ADV class that triggered the modal

  function openAdvModal() {
    advModal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeAdvModal() {
    advModal.classList.remove('open');
    document.body.style.overflow = '';
  }

  // All advanced book buttons (both desktop and mobile schedule tables)
  document.querySelectorAll('.sched-book--adv').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      // Extract class context from the surrounding cell/card
      var schedCell = btn.closest('.sched-cell');
      var dayClassEl = btn.closest('.schedule-day__class');
      if (schedCell) {
        pendingAdvClass = extractFromSchedCell(schedCell);
      } else if (dayClassEl) {
        pendingAdvClass = extractFromDayCard(dayClassEl);
      } else {
        pendingAdvClass = null;
      }
      openAdvModal();
    });
  });

  if (modalClose) modalClose.addEventListener('click', closeAdvModal);
  if (modalCancel) modalCancel.addEventListener('click', closeAdvModal);

  // Close modal when confirm is clicked (after navigating to contact)
  if (modalConfirm) {
    modalConfirm.addEventListener('click', function () {
      closeAdvModal();
    });
  }

  // Close modal on overlay click
  if (advModal) {
    advModal.addEventListener('click', function (e) {
      if (e.target === advModal) closeAdvModal();
    });
  }

  // Close modal on Escape key
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && advModal.classList.contains('open')) {
      closeAdvModal();
    }
  });

  // ===== PROGRAM CARD EXPAND/COLLAPSE =====
  document.querySelectorAll('.program-card[data-program]').forEach(function (card) {
    card.addEventListener('click', function (e) {
      // Don't toggle card when clicking links inside expanded area
      if (e.target.closest('a')) return;
      var isExpanded = card.classList.contains('program-card--expanded');
      // Close all other expanded cards
      document.querySelectorAll('.program-card--expanded').forEach(function (c) {
        c.classList.remove('program-card--expanded');
        var more = c.querySelector('.program-card__more');
        if (more) more.textContent = 'Learn More +';
      });
      if (!isExpanded) {
        card.classList.add('program-card--expanded');
        var more = card.querySelector('.program-card__more');
        if (more) more.textContent = 'Close −';
      }
    });
    card.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        card.click();
      }
    });
  });

  // ===== ATHLETE CARD EXPAND/COLLAPSE =====
  document.querySelectorAll('.athlete-card[role="button"]').forEach(function (card) {
    card.addEventListener('click', function (e) {
      // Don't toggle card when clicking links inside expanded area
      if (e.target.closest('a')) return;
      var isExpanded = card.classList.contains('athlete-card--expanded');
      // Close all other expanded cards
      document.querySelectorAll('.athlete-card--expanded').forEach(function (c) {
        c.classList.remove('athlete-card--expanded');
      });
      if (!isExpanded) {
        card.classList.add('athlete-card--expanded');
      }
    });
    card.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        card.click();
      }
    });
  });

  // ===== SMOOTH SCROLL FOR NAV LINKS =====
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      var targetId = this.getAttribute('href');
      if (targetId === '#') return;

      var targetEl = document.querySelector(targetId);
      if (targetEl) {
        e.preventDefault();
        targetEl.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });

  // ===== GALLERY LIGHTBOX =====
  var lightbox = document.getElementById('lightbox');
  var lightboxImg = document.getElementById('lightboxImg');
  var lightboxClose = document.getElementById('lightboxClose');
  var lightboxPrev = document.getElementById('lightboxPrev');
  var lightboxNext = document.getElementById('lightboxNext');
  var galleryItems = document.querySelectorAll('.gallery__item');
  var currentIndex = 0;

  function openLightbox(index) {
    currentIndex = index;
    var img = galleryItems[currentIndex].querySelector('img');
    lightboxImg.src = img.src;
    lightboxImg.alt = img.alt;
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lightbox.classList.remove('active');
    document.body.style.overflow = '';
  }

  function navigateLightbox(dir) {
    currentIndex = (currentIndex + dir + galleryItems.length) % galleryItems.length;
    var img = galleryItems[currentIndex].querySelector('img');
    lightboxImg.src = img.src;
    lightboxImg.alt = img.alt;
  }

  galleryItems.forEach(function (item, i) {
    item.addEventListener('click', function () { openLightbox(i); });
  });

  if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
  if (lightboxPrev) lightboxPrev.addEventListener('click', function () { navigateLightbox(-1); });
  if (lightboxNext) lightboxNext.addEventListener('click', function () { navigateLightbox(1); });

  if (lightbox) {
    lightbox.addEventListener('click', function (e) {
      if (e.target === lightbox) closeLightbox();
    });
  }

  document.addEventListener('keydown', function (e) {
    if (!lightbox || !lightbox.classList.contains('active')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') navigateLightbox(-1);
    if (e.key === 'ArrowRight') navigateLightbox(1);
  });

  // ===== BACK TO TOP BUTTON =====
  var backToTopBtn = document.getElementById('backToTop');
  if (backToTopBtn) {
    window.addEventListener('scroll', function () {
      if (window.scrollY > 600) {
        backToTopBtn.classList.add('visible');
      } else {
        backToTopBtn.classList.remove('visible');
      }
    });
    backToTopBtn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // ===== TYPE CARD SCHEDULE DRAWERS =====
  var typeCards = document.querySelectorAll('.type-card[data-schedule]');
  typeCards.forEach(function (card) {
    card.addEventListener('click', function () {
      var schedKey = card.getAttribute('data-schedule');
      var drawer = document.getElementById('drawer-' + schedKey);
      if (!drawer) return;

      var isActive = card.classList.contains('is-active');

      // Close all drawers and deactivate all cards
      typeCards.forEach(function (c) { c.classList.remove('is-active'); });
      document.querySelectorAll('.type-schedule-drawer').forEach(function (d) {
        d.classList.remove('is-open');
      });

      // If this card was not active, open its drawer
      if (!isActive) {
        card.classList.add('is-active');
        drawer.classList.add('is-open');
        // Smooth scroll the drawer into view after animation
        setTimeout(function () {
          drawer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
      }
    });

    // Keyboard support
    card.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        card.click();
      }
    });
  });

  // ===== BOOKING POPUP SYSTEM =====
  // Retired 28 July 2026. Bookings now go to the CRM via sendToCrm(); this is
  // kept only so the Apps Script can be re-pointed if anything needs rolling
  // back. Nothing reads it.
  var LEGACY_GAS_ENDPOINT = 'https://script.google.com/macros/s/AKfycbwybO9_NBFjSYmpDWVjM0TloiyQl5-oI7UZxgAHDILYHjhez8RUp7ncOgwKLoEHa6kj/exec';

  // Schedule data for class picker
  var ADULT_CLASSES = [
    {name:'Adult BJJ', type:'Gi', day:'Mon', time:'6:30 AM'},
    {name:'Adult BJJ', type:'Gi', day:'Mon', time:'11:00 AM'},
    {name:'Adult BJJ', type:'Gi', day:'Mon', time:'6:30 PM'},
    {name:'Adult BJJ', type:'No-Gi', day:'Tue', time:'6:30 AM'},
    {name:'Adult BJJ', type:'No-Gi', day:'Tue', time:'6:30 PM'},
    {name:'Adult BJJ', type:'No-Gi', day:'Wed', time:'11:00 AM'},
    {name:'Adult BJJ', type:'Gi', day:'Wed', time:'6:30 PM'},
    {name:'Adult BJJ', type:'No-Gi', day:'Thu', time:'6:30 AM'},
    {name:'Adult BJJ', type:'No-Gi', day:'Thu', time:'6:30 PM'},
    {name:'Adult BJJ', type:'Gi', day:'Fri', time:'6:30 AM'},
    {name:'Adult BJJ', type:'Gi', day:'Fri', time:'11:00 AM'},
    {name:'Adult Comp', type:'Gi', day:'Fri', time:'6:30 PM'},
    {name:'Adult Comp', type:'No-Gi', day:'Sat', time:'9:00 AM'},
    {name:'Adult & Teens', type:'No-Gi', day:'Sat', time:'11:00 AM'},
    {name:'Open Mat', type:'', day:'Sun', time:'10:30 AM'}
  ];

  var KIDS_FRIDAY_CLASSES = [
    {name:'Kids BJJ (3\u20136)', type:'Gi', day:'Fri', time:'4:45 PM'},
    {name:'Kids BJJ Comp (7\u201312)', type:'Gi', day:'Fri', time:'5:15 PM'},
    {name:'Teens BJJ Comp (12\u201315)', type:'Gi', day:'Fri', time:'5:15 PM'}
  ];

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
  function detectType(el) {
    if (!el) return '';
    // Check for sched-type badge text nearby
    var typeEl = el.querySelector('.sched-type');
    if (typeEl) return typeEl.textContent.trim();
    // Check for type-sched-bar class
    var bar = el.closest('.type-sched-bar');
    if (bar) {
      if (bar.classList.contains('type-sched-bar--gi')) return 'Gi';
      if (bar.classList.contains('type-sched-bar--nogi')) return 'No-Gi';
    }
    // Check schedule-day__class
    var dayClass = el.closest('.schedule-day__class');
    if (dayClass) {
      if (dayClass.classList.contains('schedule-day__class--gi')) return 'Gi';
      if (dayClass.classList.contains('schedule-day__class--nogi')) return 'No-Gi';
    }
    // Check sched-cell parent
    var cell = el.closest('td');
    if (cell) {
      if (cell.classList.contains('sched-gi')) return 'Gi';
      if (cell.classList.contains('sched-nogi') || cell.classList.contains('sched-comp')) return 'No-Gi';
    }
    return '';
  }

  // Normalize short day names: Mon, Tue, etc from full text
  function parseDayAbbr(text) {
    if (!text) return '';
    text = text.trim();
    // Already short?
    if (DAY_MAP[text] !== undefined) return text;
    // Full name?
    var abbrs = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    var fulls = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
    var lower = text.toLowerCase();
    for (var i = 0; i < fulls.length; i++) {
      if (lower.indexOf(fulls[i]) !== -1) return abbrs[i];
    }
    // Try first 3 chars
    var first3 = text.substring(0,3);
    if (DAY_MAP[first3] !== undefined) return first3;
    return '';
  }

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
    // Close mobile nav if open
    if (mobileNav.classList.contains('open')) {
      mobileNav.classList.remove('open');
      hamburger.classList.remove('active');
      hamburger.setAttribute('aria-expanded', 'false');
    }
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
          showClassList(KIDS_FRIDAY_CLASSES, 'Kids & Teens (Fridays)');
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
      html += '<span class="booking-class-row__name">' + cls.name + (cls.type ? ' \u2014 ' + cls.type : '') + '</span>';
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
      className: className + (typeLabel ? ' \u2014 ' + typeLabel : ''),
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
     * and then show success 800ms later regardless — the old comment read
     * "Silent fail — user still sees success". A broken script was therefore
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
      program: data.className,
      // They picked a real class off the schedule, so the lead arrives already
      // at "Trial Booked" with the right time — and the confirmation email
      // names that class instead of promising to be in touch.
      trialAt: toCentralISO(data.classDate, data.classTime),
      note: data.classDay + ' ' + data.classTime + ' \u2014 booked from the website'
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
  function showFridayOnly() {
    var nextFri = getNextDayDate('Fri');
    var dateStr = formatDate(nextFri);

    var html = '<div class="booking-content-enter">';
    html += '<div class="booking-step-header"><h3>Kids Trials \u2014 Fridays Only</h3></div>';
    html += '<div class="booking-friday-info">';
    html += '<div class="booking-friday-info__icon">\uD83E\uDD4B</div>';
    html += '<p>We offer kids trial classes exclusively on Fridays so our coaches can give your child the best introduction experience.</p>';
    html += '<span class="booking-friday-info__date">Next Friday: ' + dateStr + '</span>';
    html += '</div>';
    html += '<div class="booking-friday-classes">';
    KIDS_FRIDAY_CLASSES.forEach(function (cls, i) {
      html += '<div class="booking-friday-class">';
      html += '<div class="booking-friday-class__info"><span class="booking-friday-class__name">' + cls.name + '</span><span class="booking-friday-class__time">' + cls.time + ' \u2014 ' + cls.type + '</span></div>';
      html += '<button class="booking-friday-class__btn" data-fri-idx="' + i + '">Book This Class</button>';
      html += '</div>';
    });
    html += '</div></div>';
    bookingContent.innerHTML = html;

    bookingContent.querySelectorAll('.booking-friday-class__btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = parseInt(btn.getAttribute('data-fri-idx'), 10);
        var cls = KIDS_FRIDAY_CLASSES[idx];
        showBookingForm(cls.name, cls.type, cls.day, cls.time);
      });
    });

    openBookingModal();
  }

  // ── Extract context from schedule drawer bar ──
  function extractFromSchedBar(bar) {
    var dayEl = bar.querySelector('.type-sched-bar__day');
    var timeEl = bar.querySelector('.type-sched-bar__time');
    var nameEl = bar.querySelector('.type-sched-bar__name');
    var day = dayEl ? dayEl.textContent.trim() : '';
    var time = timeEl ? timeEl.textContent.trim() : '';
    var name = nameEl ? nameEl.textContent.replace(/\(.*\)/g,'').replace(/Trials Fri Only/g,'').trim() : '';
    var type = detectType(bar);
    return { day: day, time: time, name: name, type: type };
  }

  // ── Extract context from schedule table cell ──
  function extractFromSchedCell(cell) {
    var nameEl = cell.querySelector('.sched-cell__name');
    var name = nameEl ? nameEl.textContent.replace(/\(.*\)/g,'').trim() : '';
    var type = detectType(cell);
    // Get time from the row's first cell
    var tr = cell.closest('tr');
    var time = '';
    if (tr) {
      var firstTd = tr.querySelector('td');
      if (firstTd) time = firstTd.textContent.trim();
      // If empty, walk up to find the time row
      if (!time) {
        var prev = tr.previousElementSibling;
        while (prev) {
          var firstCell = prev.querySelector('td');
          if (firstCell && firstCell.textContent.trim().match(/\d/)) {
            time = firstCell.textContent.trim();
            break;
          }
          prev = prev.previousElementSibling;
        }
      }
    }
    // Get day from column index
    var dayNames = ['','Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    var td = cell.closest('td');
    var day = '';
    if (td && tr) {
      var tds = Array.prototype.slice.call(tr.querySelectorAll('td'));
      var colIdx = tds.indexOf(td);
      if (colIdx >= 0 && colIdx < dayNames.length) day = dayNames[colIdx];
    }
    return { day: day, time: time, name: name, type: type };
  }

  // ── Extract context from schedule day card ──
  function extractFromDayCard(classEl) {
    var dayCard = classEl.closest('.schedule-day');
    var dayHeader = dayCard ? dayCard.querySelector('.schedule-day__header') : null;
    var dayFull = dayHeader ? dayHeader.textContent.trim() : '';
    var dayAbbr = parseDayAbbr(dayFull);
    var timeEl = classEl.querySelector('.schedule-day__time');
    var nameEl = classEl.querySelector('.schedule-day__name');
    var time = timeEl ? timeEl.textContent.trim() : '';
    var name = nameEl ? nameEl.textContent.replace(/\(.*\)/g,'').trim() : '';
    var type = detectType(classEl);
    return { day: dayAbbr, time: time, name: name, type: type };
  }

  // ── EVENT DELEGATION: Intercept ALL gymdesk link clicks ──
  document.addEventListener('click', function (e) {
    // Check for "Trials Fri Only" badges
    var trialBadge = e.target.closest('.type-sched-bar__trial-badge, .sched-trial-badge');
    if (trialBadge) {
      e.preventDefault();
      e.stopPropagation();
      showFridayOnly();
      return;
    }

    // Check for gymdesk links
    var link = e.target.closest('[href*="gymdesk.com/signup"], .type-sched-bar__book, .sched-book, .sched-book-mobile, .program-card__trial-btn');
    if (!link) return;

    // Skip ADV buttons in desktop/mobile schedule tables — they use their own modal first
    if (link.classList.contains('sched-book--adv')) return;

    // Catch ADV book buttons in mobile drawers (type-sched-bar with badge-adv sibling)
    var parentBar = link.closest('.type-sched-bar');
    if (parentBar && parentBar.querySelector('.type-sched-bar__badge-adv')) {
      e.preventDefault();
      e.stopPropagation();
      pendingAdvClass = extractFromSchedBar(parentBar);
      openAdvModal();
      return;
    }

    var href = link.getAttribute('href') || '';
    if (href.indexOf('gymdesk.com') === -1 && !link.classList.contains('type-sched-bar__book') && !link.classList.contains('sched-book') && !link.classList.contains('sched-book-mobile') && !link.classList.contains('program-card__trial-btn')) return;

    e.preventDefault();
    e.stopPropagation();

    // ── Determine context ──

    // 1. Inside a type-sched-bar (drawer bars)
    var schedBar = link.closest('.type-sched-bar');
    if (schedBar) {
      var ctx = extractFromSchedBar(schedBar);
      showBookingForm(ctx.name, ctx.type, ctx.day, ctx.time);
      openBookingModal();
      return;
    }

    // 2. Inside a schedule-day__class (day card)
    var dayClassEl = link.closest('.schedule-day__class');
    if (dayClassEl) {
      var ctx2 = extractFromDayCard(dayClassEl);
      showBookingForm(ctx2.name, ctx2.type, ctx2.day, ctx2.time);
      openBookingModal();
      return;
    }

    // 3. Inside a schedule table cell
    var schedCell = link.closest('.sched-cell');
    if (schedCell) {
      var ctx3 = extractFromSchedCell(schedCell);
      showBookingForm(ctx3.name, ctx3.type, ctx3.day, ctx3.time);
      openBookingModal();
      return;
    }

    // 4. Inside a program-card
    var programCard = link.closest('.program-card');
    if (programCard) {
      var prog = programCard.getAttribute('data-program');
      if (prog === 'youth-bjj') {
        // Show Friday kids classes directly
        showFridayOnly();
      } else if (prog === 'adult-bjj' || prog === 'competition') {
        showClassList(ADULT_CLASSES, 'Adult Classes');
        openBookingModal();
      } else {
        // Generic: show class picker
        showClassPicker();
      }
      return;
    }

    // 5. Generic buttons (nav CTA, hero, pricing, footer)
    showClassPicker();
  }, true); // Use capture phase to beat other handlers

  // ── ADV Modal: "Continue to Book" now opens booking form for that specific class ──
  if (modalConfirm) {
    // Remove old click behavior and add new one
    var newConfirm = modalConfirm.cloneNode(true);
    modalConfirm.parentNode.replaceChild(newConfirm, modalConfirm);
    modalConfirm = newConfirm;

    modalConfirm.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      closeAdvModal();
      if (pendingAdvClass && pendingAdvClass.name) {
        // Go directly to the booking form for this specific advanced class
        showBookingForm(pendingAdvClass.name, pendingAdvClass.type, pendingAdvClass.day, pendingAdvClass.time);
        openBookingModal();
      } else {
        // Fallback if context was lost
        showClassPicker();
      }
      pendingAdvClass = null;
    });
  }

  // ===== VISUAL ENHANCEMENTS =====
  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!prefersReducedMotion) {

    // ── 1. Hero Labyrinth Maze Canvas ──
    (function initHeroMaze() {
      var canvas = document.getElementById('hero-maze-canvas');
      if (!canvas) return;
      var ctx = canvas.getContext('2d');
      var heroEl = document.getElementById('hero');
      if (!heroEl) return;

      function resize() {
        var rect = heroEl.getBoundingClientRect();
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;
        ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
      }
      resize();
      window.addEventListener('resize', resize);

      // Build a static labyrinth pattern (concentric square maze)
      var paths = [];
      function buildMaze() {
        paths = [];
        var w = heroEl.offsetWidth;
        var h = heroEl.offsetHeight;
        var cx = w / 2;
        var cy = h / 2;
        var maxR = Math.max(w, h) * 0.45;
        var rings = 12;
        var gap = maxR / rings;

        for (var i = 1; i <= rings; i++) {
          var r = i * gap;
          var sides = 4; // square labyrinth
          var angle = (i % 2) * (Math.PI / 4); // alternate rotation
          var pts = [];
          for (var s = 0; s <= sides; s++) {
            var a = angle + (s / sides) * Math.PI * 2;
            pts.push({
              x: cx + Math.cos(a) * r,
              y: cy + Math.sin(a) * r
            });
          }
          // Create openings — remove one segment per ring
          var openSeg = (i * 3) % sides;
          for (var s = 0; s < sides; s++) {
            if (s === openSeg) continue;
            paths.push({ x1: pts[s].x, y1: pts[s].y, x2: pts[s + 1].x, y2: pts[s + 1].y });
          }

          // Add connecting passages between rings
          if (i > 1) {
            var prevR = (i - 1) * gap;
            var connectAngle = angle + (openSeg / sides) * Math.PI * 2 + Math.PI / sides;
            paths.push({
              x1: cx + Math.cos(connectAngle) * prevR,
              y1: cy + Math.sin(connectAngle) * prevR,
              x2: cx + Math.cos(connectAngle) * r,
              y2: cy + Math.sin(connectAngle) * r
            });
          }
        }

        // Add circular arcs as additional labyrinth detail
        for (var i = 2; i <= rings; i += 2) {
          var r = i * gap;
          for (var j = 0; j < 3; j++) {
            var startAngle = (j * Math.PI * 2 / 3) + (i * 0.4);
            var endAngle = startAngle + Math.PI / 3;
            var segs = 8;
            for (var k = 0; k < segs; k++) {
              var a1 = startAngle + (k / segs) * (endAngle - startAngle);
              var a2 = startAngle + ((k + 1) / segs) * (endAngle - startAngle);
              paths.push({
                x1: cx + Math.cos(a1) * r * 0.7,
                y1: cy + Math.sin(a1) * r * 0.7,
                x2: cx + Math.cos(a2) * r * 0.7,
                y2: cy + Math.sin(a2) * r * 0.7
              });
            }
          }
        }
      }
      buildMaze();
      window.addEventListener('resize', buildMaze);

      var t = 0;
      function drawMaze() {
        t += 0.003;
        var w = heroEl.offsetWidth;
        var h = heroEl.offsetHeight;
        var cx = w / 2;
        var cy = h / 2;

        ctx.clearRect(0, 0, w, h);

        // Radial fade gradient
        var grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.5);
        grad.addColorStop(0, 'rgba(200,162,76,0.06)');
        grad.addColorStop(0.6, 'rgba(200,162,76,0.04)');
        grad.addColorStop(1, 'rgba(200,162,76,0)');

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(Math.sin(t) * 0.03);
        ctx.translate(-cx, -cy);

        ctx.strokeStyle = grad;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (var i = 0; i < paths.length; i++) {
          var p = paths[i];
          ctx.moveTo(p.x1, p.y1);
          ctx.lineTo(p.x2, p.y2);
        }
        ctx.stroke();
        ctx.restore();

        requestAnimationFrame(drawMaze);
      }
      requestAnimationFrame(drawMaze);
    })();

    // ── 2. Gold Dust Particle System ──
    (function initParticles() {
      var canvas = document.getElementById('particle-canvas');
      if (!canvas) return;
      var ctx = canvas.getContext('2d');
      var particles = [];
      var MAX_PARTICLES = 35;
      var scrollY = 0;
      var heroBottom = 0;

      function resize() {
        canvas.width = window.innerWidth * window.devicePixelRatio;
        canvas.height = window.innerHeight * window.devicePixelRatio;
        ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
        var heroEl = document.getElementById('hero');
        heroBottom = heroEl ? heroEl.offsetTop + heroEl.offsetHeight : 600;
      }
      resize();
      window.addEventListener('resize', resize);
      window.addEventListener('scroll', function () { scrollY = window.scrollY; }, { passive: true });

      function spawnParticle() {
        return {
          x: Math.random() * window.innerWidth,
          y: window.innerHeight + 10,
          size: 1 + Math.random() * 2,
          speedY: -(0.3 + Math.random() * 0.5),
          speedX: (Math.random() - 0.5) * 0.3,
          opacity: 0.15 + Math.random() * 0.15,
          life: 0,
          maxLife: 300 + Math.random() * 200
        };
      }

      function animate() {
        var w = window.innerWidth;
        var h = window.innerHeight;
        ctx.clearRect(0, 0, w, h);

        // Only spawn particles when scrolled past hero
        if (scrollY > heroBottom * 0.5 && particles.length < MAX_PARTICLES) {
          if (Math.random() < 0.08) {
            particles.push(spawnParticle());
          }
        }

        for (var i = particles.length - 1; i >= 0; i--) {
          var p = particles[i];
          p.x += p.speedX + Math.sin(p.life * 0.02) * 0.2;
          p.y += p.speedY;
          p.life++;

          var fadeIn = Math.min(p.life / 30, 1);
          var fadeOut = Math.max(1 - (p.life / p.maxLife), 0);
          var alpha = p.opacity * fadeIn * fadeOut;

          if (p.life > p.maxLife || p.y < -10) {
            particles.splice(i, 1);
            continue;
          }

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(200,162,76,' + alpha + ')';
          ctx.fill();
        }

        requestAnimationFrame(animate);
      }
      requestAnimationFrame(animate);
    })();

    // ── 3. Custom Cursor Trail (Desktop Only) ──
    (function initCursorTrail() {
      if (!window.matchMedia('(pointer: fine)').matches) return;
      var MAX_DOTS = 20;
      var dots = [];
      var lastX = 0, lastY = 0;
      var throttleTimer = null;

      document.addEventListener('mousemove', function (e) {
        if (throttleTimer) return;
        throttleTimer = setTimeout(function () { throttleTimer = null; }, 30);

        // Only create if mouse moved enough
        var dx = e.clientX - lastX;
        var dy = e.clientY - lastY;
        if (dx * dx + dy * dy < 100) return;
        lastX = e.clientX;
        lastY = e.clientY;

        var dot = document.createElement('div');
        dot.className = 'cursor-trail-dot';
        var size = 4 + Math.random() * 2;
        dot.style.width = size + 'px';
        dot.style.height = size + 'px';
        dot.style.left = (e.clientX - size / 2) + 'px';
        dot.style.top = (e.clientY - size / 2) + 'px';
        document.body.appendChild(dot);
        dots.push(dot);

        // Trigger fade
        requestAnimationFrame(function () {
          dot.classList.add('fade');
        });

        // Remove after animation
        setTimeout(function () {
          if (dot.parentNode) dot.parentNode.removeChild(dot);
          var idx = dots.indexOf(dot);
          if (idx > -1) dots.splice(idx, 1);
        }, 450);

        // Enforce max
        while (dots.length > MAX_DOTS) {
          var old = dots.shift();
          if (old.parentNode) old.parentNode.removeChild(old);
        }
      });
    })();

    // ── 4. Section Reveal — Staggered Parallax Upgrade ──
    (function initStaggerParallax() {
      var staggerEls = document.querySelectorAll('.stagger');
      staggerEls.forEach(function (el) {
        var children = el.children;
        for (var i = 0; i < children.length; i++) {
          children[i].style.opacity = '0';
          children[i].style.transform = 'translateY(30px) scale(0.97)';
          children[i].style.transition = 'opacity 0.5s ease, transform 0.5s ease';
          children[i].style.transitionDelay = (i * 80) + 'ms';
        }
      });

      var staggerObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            var children = entry.target.children;
            for (var i = 0; i < children.length; i++) {
              children[i].style.opacity = '1';
              children[i].style.transform = 'translateY(0) scale(1)';
            }
            staggerObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });

      staggerEls.forEach(function (el) {
        staggerObserver.observe(el);
      });
    })();

    // ── 5. Stats Counter Glow Pulse ──
    // Patch the existing animateCounter to add glow when done
    var _origAnimateCounter = typeof animateCounter === 'function' ? animateCounter : null;
    if (_origAnimateCounter) {
      // The original function is in scope; we monkey-patch by adding glow class after animation
      // Since we can't easily override the closure, add glow after the known duration (1200ms)
    }
    // Fallback: observe stat values directly
    (function initCounterGlow() {
      var statValues = document.querySelectorAll('.stat-card__value, .hero__stat-value');
      var glowObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            // Wait for counter animation to finish (1200ms) then add glow
            setTimeout(function () {
              entry.target.classList.add('counter-glow');
            }, 1300);
            glowObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.3 });
      statValues.forEach(function (el) { glowObserver.observe(el); });
    })();

    // ── 6. Coach Card Tilt Effect (Desktop Only) ──
    (function initCoachTilt() {
      if (!window.matchMedia('(pointer: fine)').matches) return;
      var cards = document.querySelectorAll('.coach-card');
      cards.forEach(function (card) {
        // Add shine overlay
        var shine = document.createElement('div');
        shine.className = 'coach-card__shine';
        card.style.position = 'relative';
        card.style.overflow = 'hidden';
        card.appendChild(shine);

        card.addEventListener('mousemove', function (e) {
          var rect = card.getBoundingClientRect();
          var x = e.clientX - rect.left;
          var y = e.clientY - rect.top;
          var centerX = rect.width / 2;
          var centerY = rect.height / 2;
          var rotateX = ((y - centerY) / centerY) * -5;
          var rotateY = ((x - centerX) / centerX) * 5;

          card.style.transform = 'perspective(800px) rotateX(' + rotateX + 'deg) rotateY(' + rotateY + 'deg)';
          card.style.transition = 'transform 0.1s ease';

          // Move shine
          var shineX = (x / rect.width * 100);
          var shineY = (y / rect.height * 100);
          shine.style.setProperty('--shine-x', shineX + '%');
          shine.style.setProperty('--shine-y', shineY + '%');
        });

        card.addEventListener('mouseleave', function () {
          card.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg)';
          card.style.transition = 'transform 0.4s ease';
        });
      });
    })();

    // ── 8. Scroll Progress Indicator ──
    (function initScrollProgress() {
      var bar = document.getElementById('scroll-progress');
      if (!bar) return;
      var ticking = false;

      function updateProgress() {
        var scrollTop = window.scrollY;
        var docHeight = document.documentElement.scrollHeight - window.innerHeight;
        var pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
        bar.style.width = pct + '%';
        ticking = false;
      }

      window.addEventListener('scroll', function () {
        if (!ticking) {
          requestAnimationFrame(updateProgress);
          ticking = true;
        }
      }, { passive: true });
    })();

  } // end !prefersReducedMotion

  // ===== LOCATION MAPS (lazy loaded) =====
  (function initLocationMaps() {
    var locSection = document.getElementById('locations');
    if (!locSection) return;

    var mapsInitialized = false;

    function createLocationMap(elId, lat, lng) {
      var el = document.getElementById(elId);
      if (!el || typeof L === 'undefined') return;

      var map = L.map(el, {
        center: [lat, lng],
        zoom: 14,
        scrollWheelZoom: false,
        zoomControl: false,
        dragging: false,
        attributionControl: false
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19
      }).addTo(map);

      var goldIcon = L.divIcon({
        className: 'custom-marker',
        html: '<div style="width:16px;height:16px;background:#C8A24C;border-radius:50%;border:2px solid #0A0A0A;box-shadow:0 0 8px rgba(200,162,76,0.4);"></div>',
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });

      L.marker([lat, lng], { icon: goldIcon }).addTo(map);
    }

    var locObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && !mapsInitialized) {
          mapsInitialized = true;
          createLocationMap('map-fulshear', 29.6898, -95.8963);
          createLocationMap('map-katy', 29.7858, -95.8172);
          locObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    locObserver.observe(locSection);
  })();

  // ===== FAQ ACCORDION =====
  (function initFaqAccordion() {
    var faqItems = document.querySelectorAll('.faq-item');
    if (!faqItems.length) return;

    faqItems.forEach(function (item) {
      var btn = item.querySelector('.faq-item__question');
      if (!btn) return;

      btn.addEventListener('click', function () {
        var isActive = item.classList.contains('faq-item--active');

        // Close all items
        faqItems.forEach(function (other) {
          other.classList.remove('faq-item--active');
          var otherBtn = other.querySelector('.faq-item__question');
          if (otherBtn) otherBtn.setAttribute('aria-expanded', 'false');
        });

        // Open this one if it wasn't active
        if (!isActive) {
          item.classList.add('faq-item--active');
          btn.setAttribute('aria-expanded', 'true');
        }
      });
    });
  })();

})();

/* ======================================
   SEO AUDIT: MOBILE CTA BAR + EXIT INTENT
   ====================================== */
(function () {
  'use strict';

  // --- Mobile Bottom CTA Bar ---
  var mobileCta = document.getElementById('mobileCta');
  if (mobileCta) {
    var lastScroll = 0;
    var showThreshold = 300; // px scrolled before showing

    function handleMobileCta() {
      var st = window.pageYOffset || document.documentElement.scrollTop;
      if (st > showThreshold) {
        mobileCta.classList.add('visible');
      } else {
        mobileCta.classList.remove('visible');
      }
      lastScroll = st;
    }

    window.addEventListener('scroll', handleMobileCta, { passive: true });
  }

  // --- Exit Intent Popup ---
  var exitPopup = document.getElementById('exitPopup');
  var exitShown = false;
  var exitDismissed = false;

  // Limit popup frequency: max 2 times per session, and not if dismissed recently
  var exitPopupCount = 0;
  var exitPopupLastDismissed = 0;
  var _ss = (function() { try { return window['session' + 'Storage']; } catch(e) { return null; } })();
  if (_ss) {
    try {
      exitPopupCount = parseInt(_ss.getItem('exitPopupCount') || '0', 10);
      exitPopupLastDismissed = parseInt(_ss.getItem('exitPopupDismissedAt') || '0', 10);
    } catch(e) {}
  }
  var MAX_POPUP_SHOWS = 2;
  var COOLDOWN_MS = 300000; // 5 minutes between shows

  function canShowPopup() {
    if (exitShown || exitDismissed || !exitPopup) return false;
    if (exitPopupCount >= MAX_POPUP_SHOWS) return false;
    if (Date.now() - exitPopupLastDismissed < COOLDOWN_MS) return false;
    if (performance.now() < 30000) return false; // Wait 30s before first show
    return true;
  }

  function showExitPopup() {
    if (!canShowPopup()) return;

    exitPopup.classList.add('active');
    exitShown = true;
    document.body.style.overflow = 'hidden';
    exitPopupCount++;
    if (_ss) try { _ss.setItem('exitPopupCount', exitPopupCount.toString()); } catch(e) {}
  }

  function hideExitPopup() {
    if (exitPopup) {
      exitPopup.classList.remove('active');
      document.body.style.overflow = '';
      exitDismissed = true;
      if (_ss) try { _ss.setItem('exitPopupDismissedAt', Date.now().toString()); } catch(e) {}
    }
  }

  // Trigger on mouse leaving viewport (desktop)
  document.addEventListener('mouseout', function (e) {
    if (!e.relatedTarget && e.clientY < 5) {
      showExitPopup();
    }
  });

  // Mobile fallback: show after 60 seconds (not 45)
  setTimeout(function () {
    showExitPopup();
  }, 60000);

  // Close handlers
  var exitClose = document.getElementById('exitPopupClose');
  var exitOverlay = document.getElementById('exitPopupOverlay');
  var exitDismiss = document.getElementById('exitPopupDismiss');

  if (exitClose) exitClose.addEventListener('click', hideExitPopup);
  if (exitOverlay) exitOverlay.addEventListener('click', hideExitPopup);
  if (exitDismiss) exitDismiss.addEventListener('click', hideExitPopup);

  // --- Google Reviews Carousel ---
  var GOOGLE_REVIEWS = [
    { name: 'Heather Bone', text: 'My daughter and husband both have been training here for three years now. Tony is an amazing Professor. Along with Professor Shaun and Jared. They have amazing patience with kids. My daughter has competed in many tournaments and has excelled.', time: '10 months ago' },
    { name: 'Jay G.', text: 'I cannot say enough positive things about Labyrinth BJJ and the owner Tony, who himself leads the classes. My daughter 11, son 14 and I, 45 years young, started training here at the beginning of 2023. From the moment you step in, you feel the passion.', time: '2 years ago' },
    { name: 'Justin McAnally', text: 'Incredible gym with an incredible culture. If you are an adult looking to get started this is the place to go. The coaches and more advanced folks are all extremely helpful. This is also the absolute best place if you have kids looking to train.', time: '2 years ago' },
    { name: 'Israel', text: 'Our daughters started training at Labyrinth Jiu-jitsu about a year ago. We wanted to boost their confidence and get them active. They\'ve come a long way in a year. We\'re so happy with their progress.', time: '2 years ago' },
    { name: 'Hashir Azam', text: 'Absolutely great experience at Labyrinth! The vibes were awesome from the moment I walked in. Tony was a fantastic instructor \u2014 super knowledgeable and welcoming. The mats and facility were clean and well-maintained.', time: '8 months ago' },
    { name: 'Jesse Lea', text: 'This place is the real deal. The team at Labyrinth places value on learning the art of jiu jitsu correctly allowing children and adults to take pride in their technique. It is a great place for beginners and skilled practitioners alike.', time: '2 years ago' },
    { name: 'Armand S.', text: 'We\'ve had an outstanding experience at Labyrinth, where our kids 7 and 4, transitioned from Taekwondo. The instructors, led by Professor Tony, are not only highly skilled but also excel in engaging children of all ages.', time: 'a year ago' },
    { name: 'Jared Vevera', text: 'The training and culture at Labyrinth Brazilian Jiu Jitsu is top notch. I received a warm welcome my first day at the gym and that community has only grown stronger since I\'ve been here.', time: '10 months ago' },
    { name: 'craig wardman', text: 'I started learning BJJ at Labyrinth just under a year ago. What a fantastic experience it has been so far! Tony and the team are awesome and take the time to make you feel comfortable whilst ensuring you are always learning.', time: '2 years ago' },
    { name: 'DC', text: 'A little over a year since we started our kids here, and I couldn\'t be happier. I\'ve seen a dramatic change in my kids\' general demeanor, their attitude towards wins and losses, and a giant improvement in their confidence.', time: '2 years ago' },
    { name: 'Andrew Chaddick', text: 'Great place for kids! Professor Tony, Coach Sean, and Coach Erika do such a good job teaching skills, building confidence and creating quality people. We\'ve been attending for over a year, nothing but good things.', time: '2 years ago' },
    { name: 'Ricky Manzanares', text: 'Top-notch jiu-jitsu instruction with a friendly and motivating atmosphere. You learn fast and always feel encouraged on and off the mats!', time: '6 months ago' }
  ];

  var reviewsGrid = document.getElementById('reviewsGrid');
  var reviewsDots = document.getElementById('reviewsDots');
  var reviewsPrev = document.getElementById('reviewsPrev');
  var reviewsNext = document.getElementById('reviewsNext');

  if (reviewsGrid && GOOGLE_REVIEWS.length) {
    var perPage = window.innerWidth <= 900 ? 1 : 3;
    var totalPages = Math.ceil(GOOGLE_REVIEWS.length / perPage);
    var currentPage = 0;

    function renderReviewCard(r) {
      return '<div class="testimonial-card">' +
        '<div class="testimonial-card__stars">\u2605\u2605\u2605\u2605\u2605</div>' +
        '<blockquote class="testimonial-card__quote">\u201c' + r.text + '\u201d</blockquote>' +
        '<div class="testimonial-card__author">' +
          '<span class="testimonial-card__name">' + r.name + '</span>' +
          '<span class="testimonial-card__detail">Google Review \u00b7 ' + r.time + '</span>' +
        '</div>' +
      '</div>';
    }

    function renderDots() {
      if (!reviewsDots) return;
      reviewsDots.innerHTML = '';
      for (var i = 0; i < totalPages; i++) {
        var dot = document.createElement('div');
        dot.className = 'testimonials__dot' + (i === currentPage ? ' testimonials__dot--active' : '');
        dot.setAttribute('data-page', i);
        dot.addEventListener('click', function () {
          currentPage = parseInt(this.getAttribute('data-page'));
          showPage(currentPage);
        });
        reviewsDots.appendChild(dot);
      }
    }

    function showPage(page) {
      currentPage = page;
      var start = page * perPage;
      var slice = GOOGLE_REVIEWS.slice(start, start + perPage);
      reviewsGrid.innerHTML = slice.map(renderReviewCard).join('');
      // Update dots
      var dots = reviewsDots ? reviewsDots.querySelectorAll('.testimonials__dot') : [];
      dots.forEach(function (d, i) {
        d.className = 'testimonials__dot' + (i === currentPage ? ' testimonials__dot--active' : '');
      });
    }

    renderDots();
    showPage(0);

    // Ensure reviews are visible once populated (stagger class starts at opacity:0)
    // The IntersectionObserver adds 'visible' on scroll, but as a safety net
    // we also add it programmatically if the section is already in view
    function ensureReviewsVisible() {
      if (reviewsGrid && !reviewsGrid.classList.contains('visible')) {
        var rect = reviewsGrid.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          reviewsGrid.classList.add('visible');
        }
      }
    }
    window.addEventListener('scroll', ensureReviewsVisible, { passive: true });
    setTimeout(ensureReviewsVisible, 500);

    if (reviewsPrev) reviewsPrev.addEventListener('click', function () {
      currentPage = (currentPage - 1 + totalPages) % totalPages;
      showPage(currentPage);
    });
    if (reviewsNext) reviewsNext.addEventListener('click', function () {
      currentPage = (currentPage + 1) % totalPages;
      showPage(currentPage);
    });

    // Auto-advance every 8 seconds
    setInterval(function () {
      currentPage = (currentPage + 1) % totalPages;
      showPage(currentPage);
    }, 8000);

    // Recalc on resize
    window.addEventListener('resize', function () {
      var newPerPage = window.innerWidth <= 900 ? 1 : 3;
      if (newPerPage !== perPage) {
        perPage = newPerPage;
        totalPages = Math.ceil(GOOGLE_REVIEWS.length / perPage);
        currentPage = 0;
        renderDots();
        showPage(0);
      }
    });
  }

})();
