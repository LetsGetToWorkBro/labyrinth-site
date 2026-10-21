/**
 * Live chat: the round button at the bottom right of every page that can book, and the panel it opens.
 *
 * The owner asked for it on 21 October 2026: "a little live chat bubble at the bottom right of the page that goes to
 * this same chat within the CRM and allows us to message back and forth". The CRM half is the public edge function
 * site-chat and the CRM's Messages screen. This file is the website half, all of it: it builds its own markup (no page
 * carries any), keeps one small record in the browser, and makes three calls to the function:
 *
 *   start  { action: 'start', name, email, phone, message, page, website }  200 { ok, token, messages }
 *   send   { action: 'send', token, message }                              200 { ok, messages }
 *   poll   { action: 'poll', token }                                       200 { ok, messages }
 *
 * Every answer carries the whole chat (the last 200 messages, oldest first, each { id, from: 'visitor' | 'academy',
 * body, at }), so the panel renders by id and never shows a message twice. A 400 names the field it is about
 * ('contact' means "give an email or a phone"). A 404, or gone: true, means the chat has ended on the CRM's side: the
 * panel forgets it and offers a new one. `website` is a honeypot that people never see; a start that fills it is
 * answered like a success and saves nothing, which is why a start can come back with no messages at all.
 * Each call is a plain POST with Content-Type and no other header, since the function's CORS allows only that one.
 *
 * What it keeps: localStorage "labyrinth.chat.v1" = { token, name, seen }, and nothing else (no email, no phone).
 * `seen` is the newest academy message that was on the screen while the panel was open; the number on the bubble
 * counts the academy's messages after it. If storage is blocked, the page's own memory is used and the chat lasts
 * as long as the page. A chat started or forgotten in one tab is picked up by the others.
 *
 * When it talks: never on a page load with no chat stored (site-test's L1s holds /legacy/transfer to sending nothing
 * to supabase.co). With a chat stored it asks once on load, then every 4 seconds while the panel is open, every 60
 * while it is closed, and not at all while the tab is hidden (coming back to the tab asks at once). One request at a
 * time. After a failure it waits 8, then 16, then 30 seconds between tries, and after two failures in a row the panel
 * says "Reconnecting…".
 *
 * Where: labyrinth.vision, www.labyrinth.vision, and localhost or 127.0.0.1 for the tests. The /legacy pages are also
 * served on teamlegacydojo.com, where the function refuses the origin, so anywhere else this file does nothing.
 *
 * What came from the network or from the visitor is only ever written as text. Nothing in this file parses a string
 * as HTML. A link in a message is made with DOM methods, for an http(s) address that new URL() accepts, and it opens
 * in a new tab with rel="noopener noreferrer".
 *
 * Getting along with the page: the bubble sits above the phone call/book bar, the seminar's RSVP button and the drop
 * page's basket bar while they show; chat.css moves the home page's back-to-top button up above the bubble (keyed on
 * html.lab-chat-on); the bubble and panel step aside while the booking popup, the mobile menu or another of the
 * page's dialogs is open; and on a phone the open panel is a full-screen sheet that holds the page still the way the
 * booking popup does.
 *
 *   LabyrinthChat.open()    open the panel (so a link anywhere can say "chat with us")
 *   LabyrinthChat.close()
 *
 * chat.test.mjs walks all of it with the function mocked; it uses Playwright's clock for the timings, so this file
 * has no test hooks.
 */
(function () {
  'use strict';

  var HOSTS = ['labyrinth.vision', 'www.labyrinth.vision', 'localhost', '127.0.0.1'];
  if (HOSTS.indexOf(String(window.location.hostname || '').toLowerCase()) === -1) return;
  if (window.LabyrinthChat) return;  // loaded twice: the first copy is in charge
  if (typeof window.fetch !== 'function' || typeof window.Promise !== 'function' || !window.JSON || !document.querySelector) return;

  var ENDPOINT = 'https://jctufxvmuvobaggxcwfn.supabase.co/functions/v1/site-chat';
  var KEY = 'labyrinth.chat.v1';
  var TIMEOUT_MS = 15000;
  var EVERY_OPEN = 4000, EVERY_CLOSED = 60000, BACKOFF = [8000, 16000, 30000];
  var MAX_NAME = 60, MAX_MESSAGE = 2000;
  var ACADEMY = 'Labyrinth BJJ';
  var PHONE_TEXT = '(281) 393-7983', PHONE_HREF = 'tel:2813937983';
  var GENERIC = "Couldn't reach us just now. Check your connection, or call or text " + PHONE_TEXT + '.';
  var ENDED = 'That chat has ended. Start a new one any time.';
  var HINT = 'Email or phone, so we can reply if you leave';
  var FINE = "We'll answer here. If you've left, we may reply by text or email.";
  var RECONNECTING = 'Reconnecting…';
  // The checks the server makes, so a message it would send back is already beside the field.
  var EMAIL = /^[^@\s]+@[^@\s.]+(\.[^@\s.]+)+$/;
  var PHONE = /^[\d\s()+.\-]{7,40}$/;

  var html = document.documentElement;
  var ui = {};
  var chat = null;              // { token, name, seen }: the chat as this page knows it, and the fallback when storage is blocked
  var isOpen = false;
  var shown = Object.create(null);  // message id -> its element, so nothing is drawn twice
  var lastList = [];            // the newest whole chat the function sent, for the unread count
  var lastSeq = 0, appliedSeq = 0;
  var inflight = 0, timer = 0, failures = 0;
  var starting = false, sending = false, loaded = false;
  var locked = false, lockedOverflow = '';
  var covered = false;
  var sheetMQ = window.matchMedia ? window.matchMedia('(max-width: 560px), (max-height: 480px)') : null;  // as in chat.css
  var coarseMQ = window.matchMedia ? window.matchMedia('(pointer: coarse)') : null;

  function noop() {}

  // ── Storage ───────────────────────────────────────────────────────────────
  function tidy(c) {
    if (!c || typeof c !== 'object' || typeof c.token !== 'string' || !c.token || c.token.length > 512) return null;
    return {
      token: c.token,
      name: typeof c.name === 'string' ? squash(c.name).slice(0, MAX_NAME) : '',
      seen: typeof c.seen === 'string' && c.seen ? c.seen : null
    };
  }
  // undefined: storage is blocked. null: nothing (or nothing usable) stored.
  function readStored() {
    var raw;
    try { raw = window.localStorage.getItem(KEY); } catch (e) { return undefined; }
    if (raw == null) return null;
    try { return tidy(JSON.parse(raw)); } catch (e) { return null; }
  }
  function store(c) {
    chat = c;
    try {
      if (c) window.localStorage.setItem(KEY, JSON.stringify({ token: c.token, name: c.name, seen: c.seen }));
      else window.localStorage.removeItem(KEY);
    } catch (e) { /* blocked or full: this page's memory carries on */ }
  }

  // ── The function ──────────────────────────────────────────────────────────
  // Always resolves, never rejects: { status, body }, with status 0 for no answer at all (offline, or 15 s passed).
  function call(payload) {
    var ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    var timeout = setTimeout(function () { if (ctrl) ctrl.abort(); }, TIMEOUT_MS);
    var req;
    try {
      req = window.fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: ctrl ? ctrl.signal : undefined
      });
    } catch (e) { req = Promise.reject(e); }
    return req.then(function (res) {
      return res.json().then(null, function () { return null; }).then(function (body) {
        return { status: res.status, body: body && typeof body === 'object' ? body : {} };
      });
    }).then(function (r) { clearTimeout(timeout); return r; },
      function () { clearTimeout(timeout); return { status: 0, body: {} }; });
  }

  function cleanList(list) {
    var out = [];
    if (!Array.isArray(list)) return out;
    for (var i = 0; i < list.length; i++) {
      var m = list[i];
      if (!m || typeof m !== 'object' || m.id == null || m.id === '') continue;
      if ((m.from !== 'visitor' && m.from !== 'academy') || typeof m.body !== 'string') continue;
      out.push({ id: String(m.id), from: m.from, body: m.body, at: typeof m.at === 'string' ? m.at : '' });
    }
    return out;
  }

  function serverText(body) {
    return body && typeof body.error === 'string' && body.error.trim() ? body.error.trim().slice(0, 400) : '';
  }

  // ── Building things ───────────────────────────────────────────────────────
  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    if (attrs) {
      for (var k in attrs) {
        if (!Object.prototype.hasOwnProperty.call(attrs, k) || attrs[k] == null || attrs[k] === false) continue;
        if (k === 'text') n.textContent = attrs[k];
        else if (k === 'cls') n.className = attrs[k];
        else n.setAttribute(k, attrs[k] === true ? '' : String(attrs[k]));
      }
    }
    if (kids) {
      for (var i = 0; i < kids.length; i++) {
        if (kids[i] != null) n.appendChild(typeof kids[i] === 'string' ? document.createTextNode(kids[i]) : kids[i]);
      }
    }
    return n;
  }

  var SVG = 'http://www.w3.org/2000/svg';
  function icon(cls, paths) {
    var s = document.createElementNS(SVG, 'svg');
    var a = { 'class': cls, viewBox: '0 0 24 24', width: '24', height: '24', fill: 'none', stroke: 'currentColor',
      'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', focusable: 'false' };
    for (var k in a) s.setAttribute(k, a[k]);
    for (var i = 0; i < paths.length; i++) {
      var p = document.createElementNS(SVG, 'path');
      p.setAttribute('d', paths[i]);
      s.appendChild(p);
    }
    return s;
  }
  var ICON_CHAT = ['M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z',
    'M8.5 11.5h.01', 'M12 11.5h.01', 'M15.5 11.5h.01'];
  var ICON_DOWN = ['M6 9l6 6 6-6'];
  var ICON_X = ['M18 6 6 18', 'M6 6l12 12'];

  // A sentence with the academy's number in it gets the number as a tap-to-call link, whoever wrote the sentence.
  function sayInto(node, text) {
    node.textContent = '';
    var at = text.indexOf(PHONE_TEXT);
    if (at === -1) { node.appendChild(document.createTextNode(text)); return; }
    node.appendChild(document.createTextNode(text.slice(0, at)));
    node.appendChild(el('a', { href: PHONE_HREF, text: PHONE_TEXT }));
    node.appendChild(document.createTextNode(text.slice(at + PHONE_TEXT.length)));
  }

  function field(key, label, control) {
    return el('div', { cls: 'lab-chat__field lab-chat__field--' + key }, [
      el('label', { cls: 'lab-chat__label', 'for': control.id, text: label }),
      control,
      el('p', { cls: 'lab-chat__err', id: 'lab-chat-' + key + '-err' })
    ]);
  }

  function build() {
    var root = el('div', { cls: 'lab-chat', id: 'labChat' });

    ui.badge = el('span', { cls: 'lab-chat__badge', 'aria-hidden': 'true', hidden: true });
    ui.unread = el('span', { cls: 'lab-chat__sr', id: 'lab-chat-unread' });
    ui.bubble = el('button', { type: 'button', cls: 'lab-chat__bubble', 'aria-label': 'Chat with us', 'aria-expanded': 'false',
      'aria-controls': 'lab-chat-panel', 'aria-describedby': 'lab-chat-unread' },
      [icon('lab-chat__ico lab-chat__ico--chat', ICON_CHAT), icon('lab-chat__ico lab-chat__ico--down', ICON_DOWN), ui.badge]);

    ui.close = el('button', { type: 'button', cls: 'lab-chat__close', 'aria-label': 'Close chat' }, [icon('lab-chat__ico', ICON_X)]);
    var head = el('div', { cls: 'lab-chat__head' }, [
      el('div', { cls: 'lab-chat__heading' }, [
        el('p', { cls: 'lab-chat__title', text: ACADEMY }),
        el('p', { cls: 'lab-chat__sub', text: 'Questions about classes or prices? Ask us here.' })
      ]),
      ui.close
    ]);

    // The start form.
    ui.f = {
      name: el('input', { cls: 'lab-chat__input', id: 'lab-chat-name', name: 'name', type: 'text', autocomplete: 'name',
        maxlength: String(MAX_NAME), required: true, 'aria-describedby': 'lab-chat-name-err' }),
      email: el('input', { cls: 'lab-chat__input', id: 'lab-chat-email', name: 'email', type: 'email', autocomplete: 'email',
        inputmode: 'email', maxlength: '254', 'aria-describedby': 'lab-chat-contact-hint lab-chat-email-err' }),
      phone: el('input', { cls: 'lab-chat__input', id: 'lab-chat-phone', name: 'phone', type: 'tel', autocomplete: 'tel',
        inputmode: 'tel', maxlength: '40', 'aria-describedby': 'lab-chat-contact-hint lab-chat-phone-err' }),
      message: el('textarea', { cls: 'lab-chat__input lab-chat__input--area', id: 'lab-chat-message', name: 'message', rows: '3',
        maxlength: String(MAX_MESSAGE), required: true, 'aria-describedby': 'lab-chat-message-err' })
    };
    ui.hint = el('p', { cls: 'lab-chat__hint', id: 'lab-chat-contact-hint', text: HINT });
    // The honeypot. People never see it or tab to it; a bot that fills in every box fills this one too, and the
    // function then answers as if it had worked and keeps nothing.
    ui.hp = el('input', { type: 'text', name: 'lab_chat_hp', id: 'lab-chat-hp', tabindex: '-1', autocomplete: 'off' });
    ui.notice = el('p', { cls: 'lab-chat__notice', role: 'status', hidden: true });
    ui.alert = el('p', { cls: 'lab-chat__alert', role: 'alert', hidden: true });
    ui.startBtn = el('button', { type: 'submit', cls: 'lab-chat__go', text: 'Start chat' });
    ui.start = el('form', { cls: 'lab-chat__start', novalidate: true, 'aria-label': 'Start a chat' }, [
      ui.notice,
      field('name', 'Name', ui.f.name),
      el('div', { cls: 'lab-chat__pair' }, [field('email', 'Email', ui.f.email), field('phone', 'Phone', ui.f.phone)]),
      ui.hint,
      field('message', 'Message', ui.f.message),
      el('div', { cls: 'lab-chat__hp', 'aria-hidden': 'true' }, [el('label', { 'for': 'lab-chat-hp', text: 'Leave this field empty' }), ui.hp]),
      ui.alert,
      ui.startBtn,
      el('p', { cls: 'lab-chat__fine', text: FINE })
    ]);

    // The conversation.
    ui.system = el('p', { cls: 'lab-chat__system' });
    ui.loading = el('p', { cls: 'lab-chat__system lab-chat__loading', text: 'Loading your chat…' });
    ui.list = el('ol', { cls: 'lab-chat__list' });
    ui.scroll = el('div', { cls: 'lab-chat__scroll', tabindex: '0', role: 'region', 'aria-label': 'Messages' }, [ui.system, ui.loading, ui.list]);
    ui.status = el('p', { cls: 'lab-chat__status', role: 'status' });
    ui.text = el('textarea', { cls: 'lab-chat__input lab-chat__text', id: 'lab-chat-text', rows: '1', maxlength: String(MAX_MESSAGE),
      placeholder: 'Write a message', 'aria-describedby': 'lab-chat-text-err' });
    ui.sendBtn = el('button', { type: 'submit', cls: 'lab-chat__send', text: 'Send' });
    ui.compose = el('form', { cls: 'lab-chat__compose', novalidate: true, 'aria-label': 'Send a message' }, [
      el('label', { cls: 'lab-chat__sr', 'for': 'lab-chat-text', text: 'Message' }), ui.text, ui.sendBtn
    ]);
    ui.composeErr = el('p', { cls: 'lab-chat__err lab-chat__err--compose', id: 'lab-chat-text-err', role: 'alert' });
    ui.restart = el('button', { type: 'button', cls: 'lab-chat__link', text: 'Start a new chat' });
    ui.yes = el('button', { type: 'button', cls: 'lab-chat__link lab-chat__link--yes', text: 'Yes, start over' });
    ui.no = el('button', { type: 'button', cls: 'lab-chat__link', text: 'Keep this chat' });
    ui.confirm = el('div', { cls: 'lab-chat__confirm', hidden: true }, [
      el('span', { cls: 'lab-chat__ask', text: 'Clear this chat from this device?' }), ui.yes, ui.no
    ]);
    ui.convo = el('div', { cls: 'lab-chat__convo', hidden: true }, [
      ui.scroll,
      el('div', { cls: 'lab-chat__foot' }, [ui.status, ui.compose, ui.composeErr, el('div', { cls: 'lab-chat__again' }, [ui.restart, ui.confirm])])
    ]);

    ui.panel = el('div', { cls: 'lab-chat__panel', id: 'lab-chat-panel', role: 'dialog', 'aria-label': 'Chat with ' + ACADEMY, hidden: true },
      [head, ui.start, ui.convo]);
    // Outside the panel, so a reply is announced even while the panel is closed.
    ui.live = el('div', { cls: 'lab-chat__sr lab-chat__live', 'aria-live': 'polite' });

    root.appendChild(ui.bubble);
    root.appendChild(ui.unread);
    root.appendChild(ui.panel);
    root.appendChild(ui.live);
    ui.root = root;
    return root;
  }

  // ── Messages ──────────────────────────────────────────────────────────────
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  // "3:42 PM" today, "Oct 20, 3:42 PM" on another day, in the visitor's own time. Written out by hand rather than by
  // toLocaleTimeString, whose spacing before PM differs from one browser version to the next.
  function whenText(iso) {
    var t = Date.parse(iso);
    if (isNaN(t)) return '';
    var d = new Date(t), now = new Date();
    var h = d.getHours(), m = d.getMinutes();
    var clock = (h % 12 || 12) + ':' + (m < 10 ? '0' : '') + m + (h < 12 ? ' AM' : ' PM');
    if (d.toDateString() === now.toDateString()) return clock;
    return MONTHS[d.getMonth()] + ' ' + d.getDate() + (d.getFullYear() !== now.getFullYear() ? ', ' + d.getFullYear() : '') + ', ' + clock;
  }

  // Sentence punctuation after an address belongs to the sentence ("see https://labyrinth.vision/schedule."), but a
  // closing bracket that closes one inside the address stays.
  function trimUrl(s) {
    function count(ch) { return s.split(ch).length - 1; }
    for (;;) {
      var c = s.charAt(s.length - 1);
      if (/[.,!?;:'"*]/.test(c)) { s = s.slice(0, -1); continue; }
      if (c === ')' && count('(') < count(')')) { s = s.slice(0, -1); continue; }
      if (c === ']' && count('[') < count(']')) { s = s.slice(0, -1); continue; }
      return s;
    }
  }
  function safeHref(s) {
    var u;
    try { u = new URL(s); } catch (e) { return ''; }
    return (u.protocol === 'http:' || u.protocol === 'https:') && u.hostname ? u.href : '';
  }
  var URLISH = /\bhttps?:\/\/[^\s<>"'`]+/gi;
  function writeBody(node, text) {
    var last = 0, m;
    URLISH.lastIndex = 0;
    while ((m = URLISH.exec(text))) {
      var raw = trimUrl(m[0]);
      var href = safeHref(raw);
      URLISH.lastIndex = m.index + raw.length;
      if (!href) continue;
      if (m.index > last) node.appendChild(document.createTextNode(text.slice(last, m.index)));
      node.appendChild(el('a', { href: href, target: '_blank', rel: 'noopener noreferrer', text: raw }));
      last = m.index + raw.length;
    }
    if (last < text.length) node.appendChild(document.createTextNode(text.slice(last)));
  }

  function messageNode(m) {
    var mine = m.from === 'visitor';
    var body = el('p', { cls: 'lab-chat__body' });
    writeBody(body, m.body);
    var when = whenText(m.at);
    return el('li', { cls: 'lab-chat__msg lab-chat__msg--' + (mine ? 'me' : 'them'), 'data-id': m.id }, [
      el('p', { cls: 'lab-chat__who' + (mine ? ' lab-chat__sr' : ''), text: mine ? 'You' : ACADEMY }),
      body,
      when ? el('time', { cls: 'lab-chat__time', datetime: m.at, text: when }) : null
    ]);
  }

  function nearBottom() {
    var s = ui.scroll;
    return !s.clientHeight || s.scrollHeight - s.scrollTop - s.clientHeight < 48;
  }
  function toBottom() { ui.scroll.scrollTop = ui.scroll.scrollHeight; }

  // Puts each message the page has not drawn yet in its place (just before the next one it has), so a reply that
  // turns up out of order still lands in order. Returns the new ones, oldest first.
  function draw(list) {
    var stay = nearBottom();
    var anchor = null, fresh = [];
    for (var i = list.length - 1; i >= 0; i--) {
      var have = shown[list[i].id];
      if (have) { anchor = have; continue; }
      var node = messageNode(list[i]);
      ui.list.insertBefore(node, anchor);
      shown[list[i].id] = node;
      anchor = node;
      fresh.unshift(list[i]);
    }
    if (fresh.length && stay) toBottom();
    return fresh;
  }

  function indexOfId(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return i;
    return -1;
  }
  // The academy's messages after the newest one the visitor has seen. A seen id that is no longer in the chat (it
  // fell off the end of the 200) is older than all of it.
  function unreadIn(list) {
    var from = chat && chat.seen ? indexOfId(list, chat.seen) : -1, out = [];
    for (var i = from + 1; i < list.length; i++) if (list[i].from === 'academy') out.push(list[i]);
    return out;
  }
  function newestAcademy(list) {
    for (var i = list.length - 1; i >= 0; i--) if (list[i].from === 'academy') return list[i].id;
    return null;
  }
  function markSeen() {
    if (!chat || !isOpen || covered || document.hidden) return;
    var id = newestAcademy(lastList);
    if (id && id !== chat.seen) store({ token: chat.token, name: chat.name, seen: id });
  }

  function updateBadge() {
    var n = chat && !isOpen ? unreadIn(lastList).length : 0;
    ui.badge.textContent = n === 0 ? '' : n > 9 ? '9+' : String(n);
    ui.badge.hidden = n === 0;
    ui.unread.textContent = n === 0 ? '' : n === 1 ? '1 new message' : n + ' new messages';
  }

  function announce(msgs) {
    if (!msgs.length) return;
    var said = msgs.map(function (m) { return m.body.length > 240 ? m.body.slice(0, 240) + '…' : m.body; }).join(' ');
    ui.live.textContent = (isOpen ? ACADEMY + ': ' : 'New message from ' + ACADEMY + ': ') + said;
  }

  // One whole chat from the function. `seq` says how recent the request was, so an answer that was overtaken by a
  // newer one can still add what it has but does not get the last word on the unread count.
  function apply(raw, seq) {
    var list = cleanList(raw);
    var unread = unreadIn(list);
    var fresh = draw(list);
    if (seq >= appliedSeq) { appliedSeq = seq; lastList = list; }
    if (!loaded) { loaded = true; ui.loading.hidden = true; }
    var news = unread.filter(function (m) { return fresh.indexOf(m) !== -1; });
    announce(news);
    markSeen();
    updateBadge();
  }

  function setReconnecting(on) { ui.status.textContent = on ? RECONNECTING : ''; }

  // ── Views ─────────────────────────────────────────────────────────────────
  function firstName(name) { return squash(name).split(' ')[0] || ''; }

  function resetConvo() {
    shown = Object.create(null);
    lastList = [];
    appliedSeq = lastSeq;
    loaded = false;
    failures = 0;
    ui.list.textContent = '';
    ui.loading.hidden = false;
    setReconnecting(false);
    composeError('');
    resetConfirm();
  }

  function showConvo() {
    var first = chat ? firstName(chat.name) : '';
    ui.system.textContent = (first ? 'Thanks, ' + first + '.' : 'Thanks.') + " We'll reply here as soon as we can.";
    ui.start.hidden = true;
    ui.convo.hidden = false;
  }

  function showStart(opts) {
    opts = opts || {};
    ui.convo.hidden = true;
    ui.start.hidden = false;
    ui.notice.textContent = opts.notice || '';
    ui.notice.hidden = !opts.notice;
    clearAlert();
    showErrors({});
    if (opts.name != null && !ui.f.name.value) ui.f.name.value = opts.name;
    if (opts.message && !ui.f.message.value) ui.f.message.value = opts.message;
  }

  function focusTarget() { return chat ? ui.text : ui.f.name; }

  // The chat has ended on the CRM's side (or another tab started over). `unsent` is a message that did not go,
  // carried over into the new form rather than lost.
  function ended(unsent) {
    var name = chat ? chat.name : '';
    var hadFocus = ui.panel.contains(document.activeElement);
    store(null);
    stopPolling();
    resetConvo();
    showStart({ notice: ENDED, name: name, message: unsent });
    updateBadge();
    if (isOpen && hadFocus) ui.f.name.focus();
  }

  // ── Polling ───────────────────────────────────────────────────────────────
  function nextDelay() {
    var base = isOpen ? EVERY_OPEN : EVERY_CLOSED;
    return failures ? Math.max(base, BACKOFF[Math.min(failures, BACKOFF.length) - 1]) : base;
  }
  function stopPolling() { clearTimeout(timer); timer = 0; }
  function schedule(ms) {
    stopPolling();
    if (!chat || document.hidden) return;
    timer = setTimeout(tick, ms);
  }
  function tick() {
    timer = 0;
    if (!chat || document.hidden) return;
    if (inflight) { schedule(nextDelay()); return; }  // one request at a time: this tick is skipped
    poll();
  }
  function pollNow() {
    if (!chat || document.hidden) return;
    if (inflight) { schedule(nextDelay()); return; }
    poll();
  }
  function poll() {
    var mine = chat, seq = ++lastSeq;
    stopPolling();
    inflight++;
    call({ action: 'poll', token: mine.token }).then(function (r) {
      inflight--;
      if (chat !== mine && (!chat || chat.token !== mine.token)) { schedule(nextDelay()); return; }
      if (r.status === 200 && r.body.ok === true) {
        failures = 0;
        setReconnecting(false);
        apply(r.body.messages, seq);
      } else if (r.status === 404 || r.body.gone === true) {
        ended();
        return;
      } else {
        failures++;
        if (failures >= 2) setReconnecting(true);
      }
      schedule(nextDelay());
    }).then(null, noop);
  }

  // ── Starting a chat ───────────────────────────────────────────────────────
  function squash(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }
  function tidyMessage(s) { return String(s || '').replace(/\r\n?/g, '\n').trim(); }

  function readStart() {
    return {
      name: squash(ui.f.name.value),
      email: squash(ui.f.email.value).toLowerCase(),
      phone: squash(ui.f.phone.value),
      message: tidyMessage(ui.f.message.value)
    };
  }

  function validate(v) {
    var errs = {};
    if (!v.name) errs.name = 'Please tell us your name.';
    else if (v.name.length > MAX_NAME) errs.name = 'Please keep your name to 60 characters.';
    if (!v.email && !v.phone) errs.contact = HINT;
    if (v.email && (!EMAIL.test(v.email) || v.email.length > 254)) errs.email = "That email doesn't look right.";
    if (v.phone && !PHONE.test(v.phone)) errs.phone = "That phone number doesn't look right.";
    if (!v.message) errs.message = 'Please write a message.';
    else if (v.message.length > MAX_MESSAGE) errs.message = 'Please keep it to 2,000 characters.';
    return errs;
  }

  function setInvalid(input, bad) {
    if (bad) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
  }
  // Each message beside its field; "contact" is the line under email and phone. Returns the field to focus.
  function showErrors(errs) {
    var first = null;
    ['name', 'email', 'phone', 'message'].forEach(function (k) {
      var msg = errs[k] || '';
      document.getElementById('lab-chat-' + k + '-err').textContent = msg;
      var bad = !!msg || (errs.contact && (k === 'email' || k === 'phone'));
      setInvalid(ui.f[k], bad);
      if (bad && !first) first = ui.f[k];
    });
    ui.hint.textContent = errs.contact || HINT;
    ui.hint.classList.toggle('is-error', !!errs.contact);
    return errs.name ? ui.f.name : first;
  }

  function clearAlert() { ui.alert.hidden = true; ui.alert.textContent = ''; }
  function showAlert(text) { sayInto(ui.alert, text); ui.alert.hidden = false; }

  function busy(btn, on, label) {
    btn.setAttribute('aria-disabled', on ? 'true' : 'false');
    btn.classList.toggle('is-busy', on);
    if (on) {
      btn.setAttribute('data-label', btn.textContent);
      btn.textContent = '';
      btn.appendChild(el('span', { cls: 'lab-chat__spin', 'aria-hidden': 'true' }));
      btn.appendChild(document.createTextNode(label));
    } else {
      btn.textContent = btn.getAttribute('data-label') || btn.textContent;
    }
  }

  var FIELD_FOR = { name: 'name', email: 'email', phone: 'phone', message: 'message', contact: 'contact' };

  function onStart(e) {
    e.preventDefault();
    if (starting) return;  // a double tap is one chat
    clearAlert();
    var v = readStart();
    var bad = showErrors(validate(v));
    if (bad) { bad.focus(); return; }
    starting = true;
    busy(ui.startBtn, true, 'Starting');
    call({
      action: 'start', name: v.name, email: v.email, phone: v.phone, message: v.message,
      page: String(window.location.pathname || '/').slice(0, 300),
      website: ui.hp.value
    }).then(function (r) {
      starting = false;
      busy(ui.startBtn, false);
      if (r.status === 200 && r.body.ok === true && typeof r.body.token === 'string' && r.body.token) {
        begin(r.body.token, v.name, r.body.messages);
        return;
      }
      var f = r.status === 400 && FIELD_FOR[r.body.field];
      if (f) {
        var errs = {};
        errs[f] = serverText(r.body) || (f === 'contact' ? HINT : 'Please check this.');
        var at = showErrors(errs);
        if (at) at.focus();
        return;
      }
      showAlert(serverText(r.body) || GENERIC);
    }).then(null, noop);
  }

  function begin(token, name, messages) {
    stopPolling();
    store({ token: token, name: name.slice(0, MAX_NAME), seen: null });
    resetConvo();
    showConvo();
    apply(messages, ++lastSeq);
    ui.f.message.value = '';
    ui.notice.hidden = true;
    if (isOpen) { toBottom(); ui.text.focus(); }
    schedule(nextDelay());
  }

  // ── Sending ───────────────────────────────────────────────────────────────
  function composeError(text) { sayInto(ui.composeErr, text || ''); }

  function autosize() {
    ui.text.style.height = '';
    var h = ui.text.scrollHeight;
    if (h) ui.text.style.height = Math.min(h + 2, 128) + 'px';
  }

  function onSend(e) {
    if (e) e.preventDefault();
    if (sending || !chat) return;
    var raw = ui.text.value, text = tidyMessage(raw);
    if (!text) { composeError('Please write a message.'); ui.text.focus(); return; }
    if (text.length > MAX_MESSAGE) { composeError('Please keep it to 2,000 characters.'); ui.text.focus(); return; }
    composeError('');
    sending = true;
    busy(ui.sendBtn, true, 'Sending');
    var mine = chat, seq = ++lastSeq;
    inflight++;
    call({ action: 'send', token: mine.token, message: text }).then(function (r) {
      inflight--;
      sending = false;
      busy(ui.sendBtn, false);
      if (chat !== mine && (!chat || chat.token !== mine.token)) return;
      if (r.status === 200 && r.body.ok === true) {
        // Only what was sent comes out of the box: anything typed while it was on its way stays.
        var now = ui.text.value;
        ui.text.value = now === raw ? '' : now.indexOf(raw) === 0 ? now.slice(raw.length).replace(/^\s+/, '') : now;
        autosize();
        failures = 0;
        setReconnecting(false);
        apply(r.body.messages, seq);
        toBottom();
        schedule(nextDelay());
        return;
      }
      if (r.status === 404 || r.body.gone === true) { ended(text); return; }
      if (r.status === 400 && r.body.field === 'message') {
        composeError(serverText(r.body) || 'Please check your message.');
        ui.text.focus();
        return;
      }
      composeError(serverText(r.body) || GENERIC);
    }).then(null, noop);
  }

  function onTextKey(e) {
    if (e.key !== 'Enter' || e.shiftKey || e.altKey || e.ctrlKey || e.metaKey || e.isComposing || e.keyCode === 229) return;
    // On a touch screen Enter is a new line and the button sends; with a keyboard and a mouse, Enter sends.
    if (coarseMQ && coarseMQ.matches) return;
    e.preventDefault();
    onSend();
  }

  // ── "Start a new chat", in two steps ─────────────────────────────────────
  function resetConfirm() { ui.confirm.hidden = true; ui.restart.hidden = false; }
  function startOver() {
    var name = chat ? chat.name : '';
    store(null);
    stopPolling();
    resetConvo();
    showStart({ name: name });
    updateBadge();
    ui.f.name.focus();
  }

  // ── Opening and closing ───────────────────────────────────────────────────
  function isSheet() { return !!(sheetMQ && sheetMQ.matches); }

  // On a phone the open panel is the whole screen: the page behind it is held still the way booking.js holds it, and
  // the bars that float above everything else step out of the way.
  function syncSheet() {
    var want = isOpen && isSheet();
    if (want && !locked) {
      lockedOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      locked = true;
      html.classList.add('lab-chat-sheet');
      ui.panel.setAttribute('aria-modal', 'true');
      fitViewport();
    } else if (!want && locked) {
      document.body.style.overflow = lockedOverflow;
      locked = false;
      html.classList.remove('lab-chat-sheet');
      ui.panel.removeAttribute('aria-modal');
      ui.panel.style.top = ui.panel.style.height = ui.panel.style.bottom = '';
    }
  }
  // The phone's keyboard covers the bottom of the layout viewport, which is where the message box is, so the sheet
  // follows the visual viewport while it is open.
  function fitViewport() {
    var vv = window.visualViewport;
    if (!locked || !vv) return;
    ui.panel.style.top = Math.max(0, vv.offsetTop) + 'px';
    ui.panel.style.height = vv.height + 'px';
    ui.panel.style.bottom = 'auto';
  }

  function open() {
    if (!isOpen) {
      isOpen = true;
      ui.panel.hidden = false;
      ui.bubble.setAttribute('aria-expanded', 'true');
      ui.root.classList.add('lab-chat--open');
      syncSheet();
      if (chat) {
        toBottom();
        markSeen();
        pollNow();
      }
      updateBadge();
    }
    var t = focusTarget();
    if (t && !covered) t.focus();
  }

  function close() {
    if (!isOpen) return;
    var hadFocus = ui.panel.contains(document.activeElement) || document.activeElement === document.body;
    isOpen = false;
    ui.panel.hidden = true;
    ui.bubble.setAttribute('aria-expanded', 'false');
    ui.root.classList.remove('lab-chat--open');
    syncSheet();
    resetConfirm();
    updateBadge();
    if (chat && !inflight) schedule(nextDelay());
    if (hadFocus && !covered) ui.bubble.focus();
  }

  function trapTab(e) {
    var items = [].filter.call(ui.panel.querySelectorAll('a[href], button, input, textarea, [tabindex]'), function (n) {
      return n.tabIndex >= 0 && !n.disabled && n.getClientRects().length > 0;
    });
    if (!items.length) return;
    var first = items[0], last = items[items.length - 1], at = document.activeElement;
    if (e.shiftKey && (at === first || !ui.panel.contains(at))) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && (at === last || !ui.panel.contains(at))) { e.preventDefault(); first.focus(); }
  }

  // ── The page around it ────────────────────────────────────────────────────
  // Whatever else is pinned to the bottom of the screen and showing: the phone call/book bar (shown with .visible
  // once the home page is scrolled), the seminar's RSVP button and the drop page's basket bar (both shown by taking
  // away their hidden attribute). The bubble goes above the tallest, through --lab-chat-lift, which chat.css also uses
  // to put the back-to-top button above the bubble.
  var LIFTS = '.mobile-cta-bar, .rsvp-sticky, .drop__bar';
  // Dialogs and menus that sit under the bubble's layer: while one is open the bubble and the panel step aside.
  // (The exit popup and the photo lightbox are drawn above the bubble, so they cover it on their own.)
  var COVERS = '.booking-overlay.open, .modal-overlay.open, .nav__mobile.open, .drop__sheet:not([hidden])';
  var lift = -1;

  function measureLift() {
    var most = 0, nodes = document.querySelectorAll(LIFTS);
    var col = window.innerWidth - 120;  // the bubble's column, with room to spare
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      if (n.hidden || (n.classList.contains('mobile-cta-bar') && !n.classList.contains('visible'))) continue;
      var cs = window.getComputedStyle(n);
      if (cs.display === 'none' || cs.visibility === 'hidden' || cs.position !== 'fixed') continue;
      var r = n.getBoundingClientRect();
      if (r.right < col || !n.offsetHeight) continue;
      most = Math.max(most, Math.ceil((parseFloat(cs.bottom) || 0) + n.offsetHeight));
    }
    if (most !== lift) {
      lift = most;
      html.style.setProperty('--lab-chat-lift', most + 'px');
    }
  }

  function checkCovered() {
    var now = !!document.querySelector(COVERS);
    if (now === covered) return;
    covered = now;
    ui.root.classList.toggle('lab-chat--covered', now);
    if (!now) markSeen();
  }

  function watchPage() {
    var again = function () { measureLift(); checkCovered(); };
    var queued = false;
    var soon = function () {
      if (queued) return;
      queued = true;
      (window.requestAnimationFrame || setTimeout)(function () { queued = false; again(); });
    };
    // The bars and dialogs all show and hide by a class or the hidden attribute, so watching those is enough.
    if (window.MutationObserver) {
      var mo = new MutationObserver(again);
      var nodes = document.querySelectorAll(LIFTS + ', .booking-overlay, .modal-overlay, .nav__mobile, .drop__sheet');
      for (var i = 0; i < nodes.length; i++) mo.observe(nodes[i], { attributes: true, attributeFilter: ['class', 'hidden', 'style'] });
    } else {
      window.addEventListener('scroll', soon, { passive: true });
    }
    window.addEventListener('resize', function () { soon(); syncSheet(); });
    if (sheetMQ) {
      if (sheetMQ.addEventListener) sheetMQ.addEventListener('change', syncSheet);
      else if (sheetMQ.addListener) sheetMQ.addListener(syncSheet);
    }
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', fitViewport);
      window.visualViewport.addEventListener('scroll', fitViewport);
    }
    // booking.js gives the page its scroll back when it closes; if the sheet is still open it keeps the page still.
    document.addEventListener('labyrinth:booking-closed', function () {
      again();
      if (locked) document.body.style.overflow = 'hidden';
    });
    again();
  }

  function wire() {
    ui.bubble.addEventListener('click', function () { if (isOpen) close(); else open(); });
    ui.close.addEventListener('click', close);
    ui.root.addEventListener('keydown', function (e) {
      if (!isOpen) return;
      if (e.key === 'Escape' || e.key === 'Esc') { e.stopPropagation(); close(); return; }
      if (e.key === 'Tab' && locked) trapTab(e);
    });
    ui.start.addEventListener('submit', onStart);
    // Fixing a field clears its message straight away, not at the next press of the button.
    ['name', 'email', 'phone', 'message'].forEach(function (k) {
      ui.f[k].addEventListener('input', function () {
        var err = document.getElementById('lab-chat-' + k + '-err');
        if (err.textContent) { err.textContent = ''; setInvalid(ui.f[k], false); }
        if ((k === 'email' || k === 'phone') && ui.hint.classList.contains('is-error')) {
          ui.hint.classList.remove('is-error');
          ui.hint.textContent = HINT;
          if (!document.getElementById('lab-chat-email-err').textContent) setInvalid(ui.f.email, false);
          if (!document.getElementById('lab-chat-phone-err').textContent) setInvalid(ui.f.phone, false);
        }
      });
    });
    ui.compose.addEventListener('submit', onSend);
    ui.text.addEventListener('keydown', onTextKey);
    ui.text.addEventListener('input', function () { autosize(); if (ui.composeErr.textContent) composeError(''); });
    ui.restart.addEventListener('click', function () { ui.restart.hidden = true; ui.confirm.hidden = false; ui.no.focus(); });
    ui.no.addEventListener('click', function () { resetConfirm(); ui.restart.focus(); });
    ui.yes.addEventListener('click', startOver);

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { stopPolling(); return; }
      if (chat) pollNow();
      markSeen();
      updateBadge();
    });

    // Another tab started a chat, ended one, or saw a reply.
    window.addEventListener('storage', function (e) {
      if (e.key !== KEY && e.key !== null) return;
      var next = readStored();
      if (next === undefined) return;
      var hadFocus = ui.panel.contains(document.activeElement);
      if (!next) {
        if (chat) {
          var name = chat.name;
          chat = null;
          stopPolling();
          resetConvo();
          showStart({ name: name });
          updateBadge();
          if (hadFocus) ui.f.name.focus();
        }
        return;
      }
      if (!chat || chat.token !== next.token) {
        chat = next;
        stopPolling();
        resetConvo();
        showConvo();
        updateBadge();
        pollNow();
        if (hadFocus) ui.text.focus();
        return;
      }
      chat = next;
      updateBadge();
    });
  }

  function init() {
    if (!document.body || document.getElementById('labChat')) return;
    document.body.appendChild(build());
    // Without its stylesheet the bubble would be a stray button at the foot of the page: better no chat than that.
    if (window.getComputedStyle(ui.bubble).position !== 'fixed') {
      ui.root.parentNode.removeChild(ui.root);
      return;
    }
    html.classList.add('lab-chat-on');
    wire();
    var stored = readStored();
    chat = stored || null;
    if (chat) {
      showConvo();
      pollNow();  // the first poll, on load: only ever with a chat stored
    } else {
      showStart();
    }
    watchPage();
    updateBadge();
    window.LabyrinthChat = { open: open, close: close };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
