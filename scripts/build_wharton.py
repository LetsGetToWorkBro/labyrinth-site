#!/usr/bin/env python3
"""Build the Labyrinth BJJ Wharton website into wharton-site/.

    python3 scripts/build_wharton.py                         # build in place
    python3 scripts/build_wharton.py --out /tmp/w --config other.json   # elsewhere

THIS FILE IS THE SOURCE. The HTML, robots.txt, sitemap.xml, llms.txt, _headers
and _redirects under wharton-site/ are generated and committed (committed so
the Cloudflare Pages deploy needs no build step, generated so fourteen pages
that share a nav, a footer and a schema shape cannot drift apart). Edit the
copy here and re-run; do not hand-edit the generated files.

Not generated, written by hand: wharton-site/wharton.css, wharton-site/app.js,
wharton-site/site.config.json. The copies of the main site's base.css,
style.css and programs.css come from scripts/wharton_sync.py.

THE ONE RULE: no fact is invented. The street address, class schedule, opening
date, hours, prices, map link and Joe Herrera's photo are not decided, so they
live in wharton-site/site.config.json and nowhere else. While "live" is false
every page says "coming soon" and the site is noindex whether or not those
fields have been filled in; when "live" is true whatever is filled in renders
everywhere at once, and whatever is still empty keeps its coming-soon message.

What may be stated as fact comes from exactly three places:
  - the brief for this site (Joe Herrera is a brown belt under Prof. Anthony
    Curry and the lead instructor at Wharton; the first class is free;
    programs are Adults and Kids & Teens; phone and email)
  - the main site's coach page for Prof. Anthony Curry
  - scripts/jits_data.py, the Labyrinth team's results as jits.gg reports them
    (always presented as the Labyrinth team's, never as Wharton's)
Everything else a page says about class length, age groups, equipment,
discounts or contracts has been left out on purpose.
"""
import argparse
import datetime
import hashlib
import html
import json
import os
import re
import struct
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC = os.path.join(ROOT, "wharton-site")          # static files live here
DEFAULT_CONFIG = os.path.join(SRC, "site.config.json")

sys.path.insert(0, HERE)
import jits_data  # noqa: E402  (the Labyrinth team's results, one source for the whole project)

PARENT_URL = "https://labyrinth.vision"
KATY_URL = "https://labyrinthbjjkaty.com"
ANTHONY_URL = PARENT_URL + "/coaches/anthony-curry"
CRM_URL = "https://jctufxvmuvobaggxcwfn.supabase.co/functions/v1/book-trial"
SITE_NAME = "Labyrinth BJJ Wharton"
LEGAL_NAME = "Labyrinth Brazilian Jiu Jitsu LLC"

DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
AUDIENCES = {"adult": "Adults", "kids": "Kids & Teens", "family": "Family", "other": "More"}

FONT_URL = ("https://api.fontshare.com/v2/css?f[]=clash-display@400,500,600,700"
            "&f[]=general-sans@300,400,500,600,700&display=swap")


def esc(s):
    return html.escape(str(s), quote=True)


# ── Config and the live switch ───────────────────────────────────────────────

class Site:
    """The config, read once, plus every question a page asks of it.

    Every TBD fact reaches a page through a method here, and every one of those
    methods returns nothing unless `live` is true. That is the single gate:
    a page cannot print an address in coming-soon mode because it has no way to
    ask for one.
    """

    def __init__(self, cfg):
        self.cfg = cfg
        self.live = cfg.get("live") is True
        self.url = cfg.get("site_url", "https://wharton.labyrinth.vision").rstrip("/")
        self.phone = cfg["phone"]
        self.tel = cfg["phone_tel"]
        self.email = cfg["email"]
        self.lastmod = cfg.get("lastmod") or datetime.date.today().isoformat()
        self.year = int(self.lastmod[:4])
        self.warnings = []

    # -- links ---------------------------------------------------------------
    def abs(self, path):
        return self.url + (path if path != "/" else "")

    # -- the TBD facts: all gated on live -----------------------------------
    @property
    def street(self):
        if not self.live:
            return ""
        a = self.cfg.get("address") or {}
        return " ".join(x for x in [a.get("street", "").strip(), a.get("suite", "").strip()] if x)

    @property
    def has_address(self):
        return bool(self.street)

    def address_lines(self):
        """['123 Main St, Suite 2', 'Wharton, TX 77488'] or []."""
        if not self.has_address:
            return []
        a = self.cfg["address"]
        line2 = "%s, %s" % (a.get("city", "Wharton"), a.get("state", "TX"))
        if a.get("zip", "").strip():
            line2 += " " + a["zip"].strip()
        return [self.street, line2]

    def address_oneline(self):
        return ", ".join(self.address_lines())

    @property
    def opening(self):
        """('future'|'past', 'December 1, 2026') or None."""
        if not self.live:
            return None
        raw = (self.cfg.get("opening_date") or "").strip()
        if not raw:
            return None
        try:
            d = datetime.date.fromisoformat(raw)
        except ValueError:
            return ("future", raw)
        pretty = "%s %d, %d" % (d.strftime("%B"), d.day, d.year)
        built = datetime.date.fromisoformat(self.lastmod)
        return ("past" if d <= built else "future", pretty)

    @property
    def schedule(self):
        return normalise_schedule(self.cfg.get("schedule") or []) if self.live else []

    @property
    def pricing(self):
        return normalise_pricing(self.cfg.get("pricing") or []) if self.live else []

    @property
    def hours(self):
        return normalise_hours(self.cfg.get("hours") or []) if self.live else []

    @property
    def map_url(self):
        return (self.cfg.get("map_url") or "").strip() if self.live else ""

    @property
    def kids_ages(self):
        return (self.cfg.get("kids_ages") or "").strip() if self.live else ""

    @property
    def social(self):
        s = self.cfg.get("social") or {}
        return {k: v.strip() for k, v in s.items() if v and v.strip()} if self.live else {}

    @property
    def joe_photo(self):
        """Path under wharton-site/ or '' (the monogram card)."""
        if not self.live:
            return ""
        p = (self.cfg.get("joe_photo") or "").strip().lstrip("/")
        return p if p and os.path.exists(os.path.join(SRC, p)) else ""

    def check(self):
        """Warnings about a config that says live but is not finished."""
        w = []
        if not self.live:
            return w
        if not self.has_address:
            w.append("live is true but address.street is empty: pages will say the address is coming soon")
        if not self.schedule:
            w.append("live is true but schedule is empty: /schedule will say class times are coming soon")
        if not self.pricing:
            w.append("live is true but pricing is empty: /pricing will say prices are coming soon")
        if not self.hours:
            w.append("live is true but hours is empty: the footer will point to the schedule")
        if not self.map_url:
            w.append("live is true but map_url is empty: no directions button")
        if not (self.cfg.get("opening_date") or "").strip():
            w.append("live is true but opening_date is empty: no opening line")
        raw = (self.cfg.get("joe_photo") or "").strip()
        if raw and not os.path.exists(os.path.join(SRC, raw.lstrip("/"))):
            w.append("joe_photo is %s but that file does not exist: the monogram card will be used" % raw)
        return w


def _need(cond, msg):
    if not cond:
        raise SystemExit("site.config.json: " + msg)


def hhmm(t, field):
    m = re.fullmatch(r"([01]?\d|2[0-3]):([0-5]\d)", str(t).strip())
    _need(m, "%s %r is not a 24-hour HH:MM time" % (field, t))
    return int(m.group(1)), int(m.group(2))


def fmt_time(t):
    h, m = hhmm(t, "time")
    return "%d:%02d %s" % ((h % 12) or 12, m, "AM" if h < 12 else "PM")


def normalise_schedule(rows):
    out = []
    for r in rows:
        _need(r.get("day") in DAYS, "schedule day %r must be one of %s" % (r.get("day"), ", ".join(DAYS)))
        hhmm(r.get("start"), "schedule start")
        if r.get("end"):
            hhmm(r["end"], "schedule end")
        _need(str(r.get("class", "")).strip(), "every schedule row needs a class name")
        aud = r.get("audience", "all")
        _need(aud in ("adult", "kids", "all"), "schedule audience must be adult, kids or all")
        out.append({"day": r["day"], "start": r["start"], "end": r.get("end", ""), "class": r["class"].strip(),
                    "type": (r.get("type") or "").strip(), "audience": aud, "note": (r.get("note") or "").strip()})
    out.sort(key=lambda r: (DAYS.index(r["day"]), hhmm(r["start"], "start")))
    return out


def normalise_pricing(rows):
    out = []
    for r in rows:
        _need(str(r.get("name", "")).strip(), "every pricing row needs a name")
        aud = r.get("audience", "other")
        _need(aud in AUDIENCES, "pricing audience must be adult, kids, family or other")
        _need(str(r.get("price", "")).strip() != "", "pricing row %r needs a price" % r.get("name"))
        out.append({"name": r["name"].strip(), "audience": aud, "price": str(r["price"]).strip(),
                    "period": (r.get("period") or "").strip(), "note": (r.get("note") or "").strip(),
                    "features": [f for f in (r.get("features") or []) if str(f).strip()],
                    "featured": bool(r.get("featured"))})
    return out


def normalise_hours(rows):
    out = []
    for r in rows:
        days = r.get("days") or []
        _need(days and all(d in DAYS for d in days), "hours days must be a list of full day names")
        hhmm(r.get("opens"), "hours opens")
        hhmm(r.get("closes"), "hours closes")
        out.append({"days": sorted(days, key=DAYS.index), "opens": r["opens"], "closes": r["closes"]})
    return out


def money(price):
    p = str(price).strip()
    if re.fullmatch(r"\d+(\.\d{1,2})?", p):
        return "$" + (p[:-3] if p.endswith(".00") else p)
    return p


def is_number(price):
    return bool(re.fullmatch(r"\d+(\.\d{1,2})?", str(price).strip()))


def day_span(days):
    """['Monday','Tuesday','Wednesday'] -> 'Mon to Wed'; otherwise 'Mon, Wed, Fri'."""
    idx = [DAYS.index(d) for d in days]
    short = [DAYS[i][:3] for i in idx]
    if len(idx) >= 3 and idx == list(range(idx[0], idx[0] + len(idx))):
        return "%s to %s" % (short[0], short[-1])
    return ", ".join(short)


# ── Assets ───────────────────────────────────────────────────────────────────

_dim_cache = {}


def image_size(rel):
    """(width, height) of a jpg or png under wharton-site/, read from its header."""
    if rel in _dim_cache:
        return _dim_cache[rel]
    path = os.path.join(SRC, rel)
    with open(path, "rb") as f:
        data = f.read()
    w = h = None
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        w, h = struct.unpack(">II", data[16:24])
    elif data[:2] == b"\xff\xd8":
        i = 2
        while i < len(data):
            if data[i] != 0xFF:
                i += 1
                continue
            marker = data[i + 1]
            if marker in (0xC0, 0xC1, 0xC2):
                h, w = struct.unpack(">HH", data[i + 5:i + 9])
                break
            i += 2 + struct.unpack(">H", data[i + 2:i + 4])[0]
    if not w:
        raise SystemExit("cannot read the size of " + rel)
    _dim_cache[rel] = (w, h)
    return w, h


def picture(stem_or_path, alt, cls="", loading="lazy", fetchpriority=None, ext=".jpg"):
    """<picture> with a webp source and a jpg fallback, sized so the page does not jump."""
    rel = stem_or_path if "." in os.path.basename(stem_or_path) else "assets/%s%s" % (stem_or_path, ext)
    base, e = os.path.splitext(rel)
    w, h = image_size(rel)
    webp = base + ".webp"
    src = ""
    if os.path.exists(os.path.join(SRC, webp)):
        src = '<source srcset="/%s" type="image/webp">' % webp
    attrs = 'src="/%s" alt="%s" width="%d" height="%d" loading="%s" decoding="async"' % (rel, esc(alt), w, h, loading)
    if fetchpriority:
        attrs += ' fetchpriority="%s"' % fetchpriority
    return '<picture%s>%s<img %s></picture>' % (' class="%s"' % cls if cls else "", src, attrs)


_ver_cache = {}


def ver(name):
    if name not in _ver_cache:
        with open(os.path.join(SRC, name), "rb") as f:
            _ver_cache[name] = hashlib.sha256(f.read()).hexdigest()[:8]
    return _ver_cache[name]


def jsonld(obj):
    return '<script type="application/ld+json">\n%s\n</script>' % json.dumps(obj, indent=2, ensure_ascii=False)


# ── Page chrome ──────────────────────────────────────────────────────────────

NAV_LINKS = [
    ("/programs/", "Programs"),
    ("/schedule", "Schedule"),
    ("/pricing", "Pricing"),
    ("/coaches/", "Coaches"),
    ("/areas/", "Areas"),
    ("/contact", "Contact"),
]

PHONE_ICON = ('<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" '
              'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 01-2.18 2 '
              '19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 '
              '1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>')


class Page:
    """Everything one page needs. Built by the page functions, written by emit()."""

    def __init__(self, route, file, title, description, h1=None, og_image="assets/og-wharton.jpg",
                 og_title=None, always_noindex=False, has_form=False, crumbs=None, schema=None,
                 preload=None, in_sitemap=True, priority="0.7", changefreq="monthly"):
        self.route, self.file = route, file
        self.title, self.description = title, description
        self.og_image, self.og_title = og_image, og_title or title
        self.always_noindex = always_noindex
        self.has_form = has_form
        self.crumbs = crumbs or []
        self.schema = schema or []
        self.preload = preload
        self.in_sitemap = in_sitemap and not always_noindex
        self.priority, self.changefreq = priority, changefreq
        self.body = ""


def cta_href(page):
    """Where "Get my free first class" goes: the form on this page, or the contact page's."""
    return "#free-class" if page.has_form else "/contact#free-class"


def head(S, p):
    robots = "index, follow, max-image-preview:large" if (S.live and not p.always_noindex) else \
        ("noindex, follow" if (S.live and p.always_noindex) else "noindex, nofollow")
    canon = ""
    if S.live:
        canon = '<link rel="canonical" href="%s">\n<meta property="og:url" content="%s">\n' % (S.abs(p.route), S.abs(p.route))
    img = S.url + "/" + p.og_image
    preload = ""
    if p.preload:
        preload = '<link rel="preload" as="image" href="%s" type="image/webp" fetchpriority="high">\n' % p.preload
    schema = "\n".join(jsonld(s) for s in p.schema)
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="theme-color" content="#0A0A0A">
<script>document.documentElement.classList.add('js')</script>
<title>{esc(p.title)}</title>
<meta name="description" content="{esc(p.description)}">
<meta name="robots" content="{robots}">
{canon}<meta property="og:title" content="{esc(p.og_title)}">
<meta property="og:description" content="{esc(p.description)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="{SITE_NAME}">
<meta property="og:locale" content="en_US">
<meta property="og:image" content="{img}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{esc(p.og_title)}">
<meta name="twitter:description" content="{esc(p.description)}">
<meta name="twitter:image" content="{img}">
<meta name="geo.region" content="US-TX">
<meta name="geo.placename" content="Wharton">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon.png">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
{preload}<link rel="preconnect" href="https://api.fontshare.com" crossorigin>
<link rel="preload" as="style" href="{FONT_URL}" onload="this.onload=null;this.rel='stylesheet'">
<noscript><link href="{FONT_URL}" rel="stylesheet"></noscript>
<link rel="stylesheet" href="/base.css?v={ver('base.css')}">
<link rel="stylesheet" href="/style.css?v={ver('style.css')}">
<link rel="stylesheet" href="/programs.css?v={ver('programs.css')}">
<link rel="stylesheet" href="/wharton.css?v={ver('wharton.css')}">
{schema}
</head>
"""


def strip(S, p):
    if S.live:
        return ""
    return ('<div class="soon-strip" role="status"><span class="soon-badge">Coming soon</span>'
            '<span class="soon-strip__text">Labyrinth BJJ Wharton is opening soon. Class times, prices and the address are coming soon.</span>'
            '<span class="soon-strip__short">Opening soon in Wharton.</span>'
            '<a href="%s">Get notified</a></div>\n' % cta_href(p))


def nav(S, p):
    def link(h, t, cls="nav__link"):
        cur = ' aria-current="page"' if (h == p.route or (h.endswith("/") and p.route.startswith(h) and h != "/")) else ""
        klass = ' class="%s"' % cls if cls else ""
        return '<a href="%s"%s%s>%s</a>' % (h, klass, cur, t)
    desk = "\n      ".join(link(h, t) for h, t in NAV_LINKS)
    mob = "\n  ".join(link(h, t, "") for h, t in NAV_LINKS)
    cta = cta_href(p)
    return f"""<a href="#main" class="skip-link">Skip to main content</a>
{strip(S, p)}<nav class="nav" id="nav" aria-label="Main navigation">
  <div class="nav__inner">
    <a href="/" class="nav__logo" aria-label="Labyrinth BJJ Wharton home">
      <img src="/assets/logo-maze-transparent.png" alt="" class="nav__logo-img" width="36" height="36">
      <span class="nav__logo-text">LABYRINTH</span><span class="nav__logo-loc">WHARTON</span>
    </a>

    <div class="nav__links">
      {desk}
      <span class="nav__divider"></span>
      <a href="tel:{S.tel}" class="nav__phone" aria-label="Call us">{PHONE_ICON} {S.phone}</a>
      <a href="{cta}" class="nav__cta">Free First Class</a>
    </div>

    <button class="nav__hamburger" id="hamburger" aria-label="Toggle navigation menu" aria-expanded="false" aria-controls="mobileNav">
      <span></span><span></span><span></span>
    </button>
  </div>
</nav>

<div class="nav__mobile" id="mobileNav" aria-label="Mobile navigation">
  {mob}
  <a href="{cta}" class="nav__cta">Free First Class</a>
</div>

<main id="main">
"""


def hours_html(S):
    if not S.hours:
        return None
    return "".join("<p>%s<br>%s to %s</p>" % (esc(day_span(h["days"])), fmt_time(h["opens"]), fmt_time(h["closes"]))
                   for h in S.hours)


def footer(S, p):
    if S.has_address:
        loc = "<p>%s</p>" % "<br>".join(esc(x) for x in S.address_lines())
    else:
        loc = '<p>Address coming soon.</p><p class="footer__soon">Join the list and we will send it to you first.</p>'
    if S.map_url:
        loc += '<p><a href="%s" target="_blank" rel="noopener noreferrer">Get directions</a></p>' % esc(S.map_url)
    hrs = hours_html(S)
    if hrs is None:
        hrs = ('<p>Hours coming soon.</p>' if not S.live else '<p>See the <a href="/schedule">class schedule</a>.</p>')
    social = ""
    soc = S.social
    if soc:
        icons = {
            "instagram": ('Instagram', '<rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>'),
            "facebook": ('Facebook', '<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>'),
        }
        items = []
        for k, (label, d) in icons.items():
            if k in soc:
                items.append('<a href="%s" target="_blank" rel="noopener noreferrer" aria-label="%s %s"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">%s</svg></a>' % (esc(soc[k]), SITE_NAME, label, d))
        social = '<div class="footer__social">%s</div>' % "".join(items)
    return f"""</main>

<footer class="footer" id="footer">
  <div class="container">
    <div class="footer__top footer__top--wharton">
      <div class="footer__brand">
        <a href="/" class="nav__logo" aria-label="{SITE_NAME} home">
          <img src="/assets/logo-kanji-full.jpg" alt="Labyrinth Brazilian Jiu-Jitsu" class="footer__logo-img" width="160" height="140" loading="lazy">
        </a>
        <p>Labyrinth BJJ Wharton: Brazilian jiu-jitsu in Wharton, Texas, led by Joe Herrera. Part of the Labyrinth family.</p>
        {social}
      </div>
      <div class="footer__col">
        <h4>Location</h4>
        {loc}
        <p><a href="tel:{S.tel}">{S.phone}</a></p>
        <p><a href="mailto:{S.email}">{S.email}</a></p>
      </div>
      <div class="footer__col">
        <h4>Hours</h4>
        {hrs}
      </div>
      <div class="footer__col">
        <h4>Explore</h4>
        <a href="/programs/">Programs</a>
        <a href="/schedule">Schedule</a>
        <a href="/pricing">Pricing</a>
        <a href="/coaches/">Coaches</a>
        <a href="/areas/">Areas we serve</a>
        <a href="/contact">Contact</a>
      </div>
      <div class="footer__col">
        <h4>Labyrinth family</h4>
        <a href="{PARENT_URL}" target="_blank" rel="noopener noreferrer">labyrinth.vision</a>
        <a href="{KATY_URL}" target="_blank" rel="noopener noreferrer">Labyrinth BJJ Katy</a>
        <a href="{jits_data.ACADEMY_URL}" target="_blank" rel="noopener noreferrer">Competition stats on jits.gg</a>
      </div>
    </div>
    <div class="footer__bottom">
      <p>&copy; {S.year} {LEGAL_NAME} &middot; {SITE_NAME} &middot; <a href="/privacy-policy">Privacy</a></p>
    </div>
  </div>
</footer>

<div class="mobile-cta-bar" id="mobileCta">
  <a href="tel:{S.tel}" class="mobile-cta-bar__phone" aria-label="Call {SITE_NAME}">{PHONE_ICON} Call</a>
  <a href="{cta_href(p)}" class="mobile-cta-bar__trial">Free First Class</a>
</div>

<script src="/app.js?v={ver('app.js')}" defer></script>
</body>
</html>
"""


def emit(S, p, outdir, written):
    body_class = "" if S.live else ' class="is-soon"'
    text = head(S, p) + "<body%s>\n" % body_class + nav(S, p) + p.body + footer(S, p)
    path = os.path.join(outdir, p.file)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)
    written.append(p.file)


# ── Shared components ────────────────────────────────────────────────────────

def crumbs_html(trail):
    """trail: [(href, name), ..., (None, current)]"""
    parts = []
    for i, (h, n) in enumerate(trail):
        if i:
            parts.append('<span class="prog-crumbs__sep">&rsaquo;</span>')
        parts.append('<a href="%s">%s</a>' % (h, esc(n)) if h else '<span class="prog-crumbs__current">%s</span>' % esc(n))
    return ('<div class="container">\n  <nav class="prog-crumbs" aria-label="Breadcrumb">\n    %s\n  </nav>\n</div>\n'
            % "\n    ".join(parts))


def breadcrumb_schema(S, trail):
    items = [{"@type": "ListItem", "position": 1, "name": "Home", "item": S.abs("/")}]
    for i, (h, n) in enumerate(trail, start=2):
        items.append({"@type": "ListItem", "position": i, "name": n, "item": S.abs(h)})
    return {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": items}


def faq_schema(faqs):
    return {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faqs]}


def faq_html(faqs, label="Questions", title="FAQ", wrap=True):
    items = []
    for q, a in faqs:
        items.append(f"""      <div class="faq-item">
        <button class="faq-item__question" aria-expanded="false">
          <span>{esc(q)}</span>
          <svg class="faq-item__icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        <div class="faq-item__answer"><p>{esc(a)}</p></div>
      </div>""")
    inner = "\n".join(items)
    return f"""<section class="faq" id="faq">
  <div class="container container--narrow">
    <div class="fade-in section-head">
      <p class="section-label">{esc(label)}</p>
      <h2 class="section-title section-title--lg">{esc(title)}</h2>
    </div>
    <div class="faq__list stagger">
{inner}
    </div>
  </div>
</section>
"""


def soon_badge(text="Coming soon"):
    return '<span class="soon-badge">%s</span>' % esc(text)


def soon_card(title, text, cta=None):
    btn = ""
    if cta:
        btn = '<a href="%s" class="btn btn--gold">%s</a>' % (cta[0], esc(cta[1]))
    return f"""<div class="soon-card fade-in">
  {soon_badge()}
  <h3 class="soon-card__title">{esc(title)}</h3>
  <p>{esc(text)}</p>
  {btn}
</div>"""


def section_head(label, title, sub=None):
    s = '<p class="section-subtitle">%s</p>' % sub if sub else ""
    return f"""    <div class="fade-in section-head">
      <p class="section-label">{esc(label)}</p>
      <h2 class="section-title section-title--lg">{title}</h2>
      {s}
    </div>"""


def close_block(title, text, cta_label="Get Your Free First Class", href="/contact#free-class", phone=True, S=None):
    ph = ('\n      <a href="tel:%s" class="btn btn--ghost">Call %s</a>' % (S.tel, S.phone)) if phone and S else ""
    return f"""<div class="container">
  <div class="prog-close fade-in">
    <h2 class="prog-close__title">{esc(title)}</h2>
    <p class="prog-close__text">{esc(text)}</p>
    <div class="prog-hero__cta" style="justify-content:center">
      <a href="{href}" class="btn btn--gold">{esc(cta_label)}</a>{ph}
    </div>
  </div>
</div>
"""


WHO_OPTIONS = [
    ("", "Choose one"),
    ("adult", "Me (an adult)"),
    ("kids-3-6", "My child, ages 3 to 6"),
    ("kids-7-12", "My child, ages 7 to 12"),
    ("teens", "My teen, ages 13 to 17"),
    ("several", "More than one of us"),
]


def form_html(S, uid, compact=False, title=None, wrapper_id="free-class"):
    """The free-first-class / notify-me enquiry. Behaviour is in app.js, which reads the data-* attributes.

    Not a class picker: Wharton has no schedule yet, so there is nothing to pick
    and no class date is ever sent.
    """
    if title is None:
        title = "Get your free first class"
    if S.live:
        success_title = "Thank you!"
        success_text = "We have your details and will be in touch about your free first class."
    else:
        success_title = "You're on the list!"
        success_text = ("We will email you as soon as the class times and address for Wharton are confirmed, "
                        "and we will be in touch about your free first class.")
    opts = "".join('<option value="%s">%s</option>' % (v, esc(t)) for v, t in WHO_OPTIONS)
    msg = "" if compact else f"""
      <div class="form-row">
        <div class="form-group form-group--full">
          <label for="{uid}-message">Message (optional)</label>
          <textarea id="{uid}-message" name="message" rows="3" placeholder="Anything you would like us to know?"></textarea>
        </div>
      </div>"""
    return f"""<div class="trial-form" id="{wrapper_id}">
  <h3 class="trial-form__title">{esc(title)}</h3>
  <form class="w-form" data-wharton-form data-success-title="{esc(success_title)}" data-success-text="{esc(success_text)}" novalidate>
    <div class="form-row">
      <div class="form-group">
        <label for="{uid}-name">Name</label>
        <input type="text" id="{uid}-name" name="name" placeholder="Your name" autocomplete="name" required>
      </div>
      <div class="form-group">
        <label for="{uid}-email">Email</label>
        <input type="email" id="{uid}-email" name="email" placeholder="you@email.com" autocomplete="email" required>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label for="{uid}-phone">Phone (optional)</label>
        <input type="tel" id="{uid}-phone" name="phone" placeholder="(281) 555-0000" autocomplete="tel">
      </div>
      <div class="form-group">
        <label for="{uid}-who">Who would be training?</label>
        <select id="{uid}-who" name="who">{opts}</select>
      </div>
    </div>{msg}
    <div class="hp-field" aria-hidden="true">
      <label for="{uid}-company">Leave this field empty</label>
      <input type="text" id="{uid}-company" name="company" tabindex="-1" autocomplete="off">
    </div>
    <p class="w-form__consent">We will email you, and text you if you add a phone number, about your free first class and when Wharton classes open. Reply STOP to any text to opt out.</p>
    <button type="submit" class="btn btn--gold w-form__submit">Get My Free First Class</button>
    <p class="w-form__error" role="alert" hidden>Sorry, we could not send that. Please call us on {S.phone} or email {S.email} and we will sort out your free first class.</p>
  </form>
  <noscript><p class="w-form__noscript">This form needs JavaScript. Please call {S.phone} or email {S.email} instead.</p></noscript>
  <div class="form-success" role="status" tabindex="-1">
    <div class="form-success__icon" aria-hidden="true">&#129355;</div>
    <h3 class="form-success__title"></h3>
    <p class="form-success__text"></p>
  </div>
</div>
"""


# ── Components that depend on the live switch ────────────────────────────────

def portrait(S, small=False):
    """Joe's portrait: the photo if config has one and live is true, else a monogram card.

    There is no photo of Joe. The card is deliberately its own thing, initials
    and the Labyrinth mark, rather than anyone else's picture standing in.
    """
    cls = "portrait portrait--sm" if small else "portrait"
    if S.joe_photo:
        pic = picture(S.joe_photo, "Joe Herrera, lead instructor at Labyrinth BJJ Wharton", cls="portrait__pic",
                      loading="eager" if not small else "lazy")
        return '<div class="%s portrait--photo">%s</div>' % (cls, pic)
    return f"""<div class="{cls}">
  <img class="portrait__mark" src="/assets/logo-maze-transparent.png" alt="" aria-hidden="true" width="64" height="64">
  <div class="portrait__ring" aria-hidden="true"><span class="portrait__initials">JH</span></div>
  <div class="portrait__cap"><strong>Joe Herrera</strong><span>Lead instructor</span></div>
  <span class="portrait__soon">Photo coming soon</span>
</div>"""


def belt_bar(color):
    return ('<div class="belt-bar belt-bar--%s"><span class="belt-bar__belt"></span><span class="belt-bar__tab"></span></div>' % color)


def slot_html(r):
    badge = ""
    if r["type"].lower() == "gi":
        badge = '<span class="prog-slot__badge prog-slot__badge--gi">Gi</span>'
    elif r["type"].lower() in ("no-gi", "nogi"):
        badge = '<span class="prog-slot__badge prog-slot__badge--nogi">No-Gi</span>'
    elif r["type"]:
        badge = '<span class="prog-slot__badge">%s</span>' % esc(r["type"])
    t = fmt_time(r["start"]) + ((" to " + fmt_time(r["end"])) if r["end"] else "")
    name = esc(r["class"]) + ((" <span class=\"prog-slot__note\">%s</span>" % esc(r["note"])) if r["note"] else "")
    return ('<div class="prog-slot"><div class="prog-slot__time">%s%s</div><div class="prog-slot__name">%s</div></div>'
            % (t, badge, name))


def schedule_week(S, audiences=None, limit=None):
    """The real timetable, or None when there is nothing to show (not live, or no rows)."""
    rows = [r for r in S.schedule if audiences is None or r["audience"] in audiences]
    if limit:
        rows = rows[:limit]
    if not rows:
        return None
    days = []
    for d in DAYS:
        today = [r for r in rows if r["day"] == d]
        if today:
            days.append('<div class="prog-day"><div class="prog-day__name">%s</div>%s</div>'
                        % (d, "".join(slot_html(r) for r in today)))
    return '<div class="prog-week stagger">%s</div>' % "".join(days)


def period_label(period):
    return {"month": "/mo", "class": "/class", "hour": "/hr", "day": "/day", "year": "/yr", "week": "/wk", "": ""}.get(period, "/" + period)


def price_cards(S, audiences=None, limit=None):
    """Real plans grouped by who they are for, or None when there is nothing to show."""
    items = [p for p in S.pricing if audiences is None or p["audience"] in audiences]
    if limit:
        items = items[:limit]
    if not items:
        return None
    out = []
    for aud in ("adult", "kids", "family"):
        grp = [p for p in items if p["audience"] == aud]
        if not grp:
            continue
        cards = []
        for p in grp:
            feats = "".join("<li>%s</li>" % esc(f) for f in p["features"])
            lst = '<ul class="price-card__list">%s</ul>' % feats if feats else '<ul class="price-card__list"></ul>'
            note = '<p class="price-card__note">%s</p>' % esc(p["note"]) if p["note"] else ""
            cards.append(f"""<div class="price-card{' price-card--feature' if p['featured'] else ''}">
        <h3 class="price-card__name">{esc(p['name'])}</h3>
        <div class="price-card__amount">{esc(money(p['price']))}<span>{esc(period_label(p['period']))}</span></div>
        {note}{lst}
        <a href="/contact#free-class" class="price-card__btn">Start Free</a>
      </div>""")
        label = AUDIENCES[aud]
        out.append(f'<h3 class="price-group__title fade-in">{esc(label)}</h3><div class="price-grid stagger">{"".join(cards)}</div>')
    extras = [p for p in items if p["audience"] == "other"]
    if extras:
        rows = "".join(f"""<div class="price-extra"><div class="price-extra__name">{esc(p['name'])}</div>
        <div class="price-extra__amount">{esc(money(p['price']))}<span>{esc(period_label(p['period']))}</span></div>
        <p class="price-extra__note">{esc(p['note'])}</p></div>""" for p in extras)
        out.append('<h3 class="price-group__title fade-in">More</h3><div class="price-extras stagger">%s</div>' % rows)
    return "\n".join(out)


def opening_line(S):
    o = S.opening
    if not o:
        return None
    return ("Now open in Wharton" if o[0] == "past" else "Classes start %s" % o[1])


def loc_cards(S):
    """Opening / address / hours / map, each a real value when live and a coming-soon card otherwise."""
    cards = []
    op = opening_line(S)
    if op:
        cards.append(("Opening", "<p class=\"loc-card__big\">%s</p>" % esc(op)))
    else:
        cards.append(("Opening", soon_badge() + "<p>Opening date to be announced. Join the list to hear first.</p>"))
    if S.has_address:
        cards.append(("Address", "<p class=\"loc-card__big\">%s</p>" % "<br>".join(esc(x) for x in S.address_lines())))
    else:
        cards.append(("Address", soon_badge() + "<p>The Wharton address is not confirmed yet. We will send it to everyone on the list first.</p>"))
    hrs = hours_html(S)
    if hrs:
        cards.append(("Hours", hrs))
    else:
        cards.append(("Hours", soon_badge() + "<p>Hours will follow the class schedule once it is set.</p>"))
    if S.map_url:
        cards.append(("Map", '<p><a href="%s" class="btn btn--ghost" target="_blank" rel="noopener noreferrer">Get directions</a></p>' % esc(S.map_url)))
    else:
        cards.append(("Map", soon_badge() + "<p>A map and directions will be added with the address.</p>"))
    inner = "".join('<div class="loc-card"><h3 class="loc-card__title">%s</h3>%s</div>' % (t, b) for t, b in cards)
    return '<div class="loc-grid stagger">%s</div>' % inner


# ── JSON-LD ──────────────────────────────────────────────────────────────────

AREAS_SERVED = ["Wharton", "El Campo", "East Bernard", "Boling", "Hungerford", "Louise"]


def joe_person(S, full=False):
    d = {"@type": "Person", "name": "Joe Herrera", "jobTitle": "Lead Instructor", "url": S.abs("/coaches/joe-herrera")}
    if S.joe_photo:
        d["image"] = S.url + "/" + S.joe_photo
    return d


def business_schema(S):
    b = {
        "@context": "https://schema.org",
        "@type": ["SportsActivityLocation", "LocalBusiness"],
        "@id": S.url + "/#business",
        "name": SITE_NAME,
        "alternateName": "Labyrinth Brazilian Jiu-Jitsu Wharton",
        "description": ("Brazilian jiu-jitsu for adults, kids and teens in Wharton, Texas, led by Joe Herrera, a brown belt "
                        "under Prof. Anthony Curry. Part of Labyrinth BJJ. Your first class is free."),
        "url": S.url,
        "telephone": "+1-" + S.phone.strip("() ").replace(") ", "-").replace(")", "-"),
        "email": S.email,
        "image": [S.url + "/assets/og-wharton.jpg", S.url + "/assets/hero-team.jpg"],
        "logo": S.url + "/assets/logo-maze.jpg",
        "parentOrganization": {"@type": "Organization", "name": "Labyrinth BJJ", "legalName": LEGAL_NAME, "url": PARENT_URL},
        "sport": "Brazilian Jiu-Jitsu",
        "areaServed": [{"@type": "City", "name": n + ", TX"} for n in AREAS_SERVED],
        "employee": [joe_person(S)],
    }
    offers = []
    for name, url, desc in (("Adult Brazilian Jiu-Jitsu", "/programs/adult-bjj-wharton", "Brazilian jiu-jitsu classes for adults in Wharton, TX."),
                            ("Kids & Teens Brazilian Jiu-Jitsu", "/programs/kids-bjj-wharton", "Brazilian jiu-jitsu classes for kids and teens in Wharton, TX.")):
        offers.append({"@type": "Offer", "itemOffered": {"@type": "Service", "name": name, "url": S.abs(url), "description": desc}})
    for p in S.pricing:                                  # empty unless live
        if is_number(p["price"]):
            offers.append({"@type": "Offer", "name": p["name"], "price": p["price"], "priceCurrency": "USD",
                           "url": S.abs("/pricing")})
    b["hasOfferCatalog"] = {"@type": "OfferCatalog", "name": "Programs", "itemListElement": offers}
    if S.has_address:
        a = S.cfg["address"]
        addr = {"@type": "PostalAddress", "streetAddress": S.street, "addressLocality": a.get("city", "Wharton"),
                "addressRegion": a.get("state", "TX"), "addressCountry": "US"}
        if a.get("zip", "").strip():
            addr["postalCode"] = a["zip"].strip()
        b["address"] = addr
    if S.hours:
        b["openingHoursSpecification"] = [{"@type": "OpeningHoursSpecification", "dayOfWeek": h["days"],
                                           "opens": h["opens"], "closes": h["closes"]} for h in S.hours]
    if S.map_url:
        b["hasMap"] = S.map_url
    if S.social:
        b["sameAs"] = list(S.social.values())
    return b


def service_schema(S, name, desc, route):
    return {"@context": "https://schema.org", "@type": "Service", "name": name, "description": desc,
            "url": S.abs(route), "serviceType": name, "areaServed": [{"@type": "City", "name": n + ", TX"} for n in AREAS_SERVED],
            "provider": {"@id": S.url + "/#business", "@type": "SportsActivityLocation", "name": SITE_NAME, "url": S.url}}


# ── Facts the Labyrinth team can truthfully claim (from scripts/jits_data.py) ──

def team_facts_strip():
    j = jits_data
    return f"""<div class="prog-facts stagger">
      <div class="prog-fact"><div class="prog-fact__label">Nationally</div><div class="prog-fact__value"><em>Top {j.NATIONAL_TOP_PCT}%</em> of academies</div></div>
      <div class="prog-fact"><div class="prog-fact__label">jits.gg rank</div><div class="prog-fact__value"><em>#{j.NATIONAL_RANK}</em> of {j.NATIONAL_OF:,}</div></div>
      <div class="prog-fact"><div class="prog-fact__label">Gold medals</div><div class="prog-fact__value"><em>{j.GOLDS}</em></div></div>
      <div class="prog-fact"><div class="prog-fact__label">Wins tracked</div><div class="prog-fact__value"><em>{j.WINS:,}</em></div></div>
    </div>
    <p class="team-note fade-in">These are the results of the Labyrinth BJJ team as reported by <a href="{j.ACADEMY_URL}" target="_blank" rel="noopener noreferrer">jits.gg</a> as of {j.AS_OF}. They are the whole team's record. Labyrinth BJJ Wharton is new, and none of these numbers are Wharton's.</p>"""


# ── FAQ copy, one place, so the page and its JSON-LD cannot disagree ──────────

def faq_when(S):
    op = S.opening
    if op and op[0] == "future":
        return ("When does Labyrinth BJJ Wharton open?",
                "Classes start %s. Use the form to claim your free first class and we will be in touch." % op[1])
    if op:
        return ("When does Labyrinth BJJ Wharton open?",
                "Labyrinth BJJ Wharton is open. See the schedule for class times and use the form to claim your free first class.")
    return ("When does Labyrinth BJJ Wharton open?",
            "We have not announced an opening date yet. Put your name on the list and we will tell you first, along with the class times and the address.")


def faq_where(S):
    if S.has_address:
        return ("Where is Labyrinth BJJ Wharton?", "We are at %s. The contact page has directions." % S.address_oneline())
    return ("Where is Labyrinth BJJ Wharton?",
            "The gym is in Wharton, Texas. The street address is not confirmed yet. We will post it here and send it to everyone on the list as soon as it is.")


def faq_price(S):
    if S.pricing:
        return ("How much does it cost?", "Plans and prices are on the pricing page. Your first class is free whatever you decide afterwards.")
    return ("How much does it cost?",
            "Wharton prices are not set yet. Your first class is free, and prices will be posted on the pricing page once they are confirmed.")


def faq_ages(S):
    if S.kids_ages:
        return ("What ages can train?", "Wharton has programs for adults and for kids and teens. Kids and teens: %s." % S.kids_ages)
    return ("What ages can train?",
            "Wharton has programs for adults and for kids and teens. The exact age groups will be confirmed with the class schedule, so tell us your child's age on the form and we will let you know where they fit.")


def home_faqs(S):
    return [
        faq_when(S),
        faq_where(S),
        ("Is the first class really free?",
         "Yes. Your first class at Labyrinth BJJ Wharton is free, with no commitment. Use the form on this page to claim it."),
        ("Do I need experience, or to be in shape?",
         "No. Beginners are welcome, and waiting until you are fit is the most common reason people never start. Jiu-jitsu will get you in shape. You can scale the warm-up and sit out a round whenever you need to."),
        faq_ages(S),
        ("Who teaches at Labyrinth BJJ Wharton?",
         "Joe Herrera, a brown belt under Prof. Anthony Curry, is the lead instructor at Labyrinth BJJ Wharton."),
        faq_price(S),
        ("Is this connected to the other Labyrinth gyms?",
         "Yes. Labyrinth BJJ Wharton is a Labyrinth location. Labyrinth was founded in 2021 by Prof. Anthony Curry, the owner and head instructor, and Joe trains under him."),
        ("Does my child have to compete?",
         "No. Competition is always optional at Labyrinth. Many students train purely for fitness, self-defense, confidence and community."),
        ("What should I wear to my first class?",
         "Comfortable athletic clothes with no zippers, buttons or pockets, and a water bottle. If you do not own a gi, tell us when you sign up and we will let you know what to bring."),
    ]


# ── Pages ────────────────────────────────────────────────────────────────────

def page_home(S):
    has_form = True
    p = Page("/", "index.html", "Labyrinth BJJ Wharton | Brazilian Jiu-Jitsu in Wharton, TX",
             "", og_title="Labyrinth BJJ Wharton: Brazilian Jiu-Jitsu in Wharton, Texas", has_form=has_form,
             preload="/assets/hero-team.webp", priority="1.0", changefreq="weekly")
    op = opening_line(S)
    if S.live:
        p.description = ("Brazilian jiu-jitsu for adults, kids and teens in Wharton, TX. Led by Joe Herrera, a brown belt under Prof. Anthony Curry. "
                         "Part of Labyrinth BJJ. Your first class is free.")
        badge = soon_badge(op) if op else ""
        h1 = 'Brazilian <b class="nw">Jiu-Jitsu</b> in <span>Wharton, Texas</span>'
        sub = ("Adults, kids and teens, led by Joe Herrera, a brown belt under Prof. Anthony Curry. "
               "Part of the Labyrinth BJJ family. Your first class is free.")
    else:
        p.description = ("Labyrinth BJJ is bringing Brazilian jiu-jitsu to Wharton, TX, led by Joe Herrera, a brown belt under Prof. Anthony Curry. "
                         "Coming soon. Get notified and claim a free first class.")
        badge = soon_badge("Coming soon to Wharton, TX")
        h1 = 'Brazilian <b class="nw">Jiu-Jitsu</b> is coming to <span>Wharton, Texas</span>'
        sub = ("Labyrinth BJJ is opening a Wharton gym for adults, kids and teens, led by Joe Herrera, a brown belt under "
               "Prof. Anthony Curry. Class times, prices and the address are coming soon. Your first class is free.")
    p.schema = [business_schema(S), faq_schema(home_faqs(S))]

    sched = schedule_week(S, limit=12)
    sched_block = sched or soon_card("Class schedule coming soon",
                                     "The Wharton timetable is not set yet. Join the list and we will email you the moment it is, with your free first class on us.",
                                     ("#free-class", "Get notified"))
    sched_more = '<p class="more-link fade-in"><a href="/schedule" class="coach-card__link">See the full schedule &rarr;</a></p>' if sched else ""
    pr = price_cards(S, limit=3)
    price_block = pr or soon_card("Prices coming soon",
                                  "Wharton prices are not set yet. What we can tell you now: your first class is free. We will post prices here as soon as they are confirmed.",
                                  ("#free-class", "Claim your free class"))
    price_more = '<p class="more-link fade-in"><a href="/pricing" class="coach-card__link">See all plans &rarr;</a></p>' if pr else ""
    kids_line = ("Ages: %s." % S.kids_ages) if S.kids_ages else "Age groups will be confirmed with the class schedule."
    if S.live:
        intro2 = ("Classes are on the <a href=\"/schedule\">schedule</a> and your first one is free. "
                  "Use the form at the bottom of this page, or call us on %s." % S.phone)
    else:
        intro2 = ("We are still setting the Wharton schedule. Until it is ready, the best thing you can do is put your name on the list "
                  "below: you will hear first when class times, prices and the address are confirmed, and your first class is free.")
    p.body = f"""
<section class="hero hero--wharton" id="hero">
  <div class="hero__bg">
    {picture('hero-team', 'Labyrinth BJJ team celebrating with medals and trophies at a tournament', cls='hero__still', loading='eager', fetchpriority='high', ext='.jpg')}
  </div>
  <div class="hero__content">
    <div class="hero__badges">{badge}</div>
    <h1 class="hero__title">{h1}</h1>
    <p class="hero__subtitle">{sub}</p>
    <div class="hero__ctas">
      <a href="#free-class" class="btn btn--gold">Get Your Free First Class</a>
      <a href="/programs/" class="btn btn--ghost">See the Programs</a>
    </div>
    <div class="hero__stats hero__stats--3 stagger">
      <div class="hero__stat"><div class="hero__stat-value">Free</div><div class="hero__stat-label">First class</div></div>
      <div class="hero__stat"><div class="hero__stat-value">Top {jits_data.NATIONAL_TOP_PCT}%</div><div class="hero__stat-label">Labyrinth BJJ nationally, per <a href="{jits_data.ACADEMY_URL}" target="_blank" rel="noopener noreferrer">jits.gg</a></div></div>
      <div class="hero__stat"><div class="hero__stat-value">2021</div><div class="hero__stat-label">Labyrinth BJJ founded</div></div>
    </div>
  </div>
</section>

<section class="prog-section" id="about">
  <div class="container">
    <div class="split">
      <div>
{section_head('The Wharton gym', 'A NEW LABYRINTH GYM FOR WHARTON')}
        <div class="prog-prose fade-in">
          <p>Labyrinth BJJ Wharton is a Brazilian jiu-jitsu gym in Wharton, Texas, part of the Labyrinth family of gyms. It is led by <strong>Joe Herrera</strong>, a brown belt under Prof. Anthony Curry, who founded Labyrinth in 2021.</p>
          <p>Brazilian jiu-jitsu is a grappling art built on leverage, position and control. There is no striking in it. It is a practical way to get fit, to learn real self-defense, and to be part of a room full of people who are working on the same hard thing.</p>
          <p>{intro2}</p>
        </div>
        <div class="prog-hero__cta fade-in">
          <a href="#free-class" class="btn btn--gold">Get Your Free First Class</a>
          <a href="/contact" class="btn btn--ghost">Contact Us</a>
        </div>
      </div>
      <div class="split__media fade-in">{picture('community-real', 'Members of the Labyrinth BJJ team with their medals', cls='')}</div>
    </div>
  </div>
</section>

<section class="prog-section prog-section--surface" id="programs">
  <div class="container">
{section_head('Programs', 'TWO PROGRAMS, ONE FIRST CLASS FREE', 'Pick the one that is for you, or for your child. Both start with a free first class.')}
    <div class="program-duo stagger">
      <a href="/programs/adult-bjj-wharton" class="w-program">
        <div class="w-program__media">{picture('adult-gi', 'Adult Brazilian jiu-jitsu competitor in a Labyrinth BJJ gi')}</div>
        <div class="w-program__body">
          <p class="w-program__tag">Adults &middot; Gi &amp; No-Gi</p>
          <h3 class="w-program__title">Adult Brazilian Jiu-Jitsu</h3>
          <p>For complete beginners and experienced grapplers alike. You do not need to be in shape to start. Jiu-jitsu gets you in shape.</p>
          <span class="coach-card__link">Adult BJJ &rarr;</span>
        </div>
      </a>
      <a href="/programs/kids-bjj-wharton" class="w-program">
        <div class="w-program__media">{picture('kids-gi', 'Young Labyrinth BJJ student in a white gi')}</div>
        <div class="w-program__body">
          <p class="w-program__tag">Kids &amp; Teens &middot; {esc(kids_line)}</p>
          <h3 class="w-program__title">Kids &amp; Teens Jiu-Jitsu</h3>
          <p>Focus, confidence and the ability to handle pressure, through a grappling art with no striking. Competition is always optional.</p>
          <span class="coach-card__link">Kids &amp; Teens BJJ &rarr;</span>
        </div>
      </a>
    </div>
  </div>
</section>

<section class="prog-section" id="coach">
  <div class="container">
    <div class="split split--portrait">
      <div class="split__media fade-in">{portrait(S)}</div>
      <div>
{section_head('Meet your coach', 'JOE HERRERA')}
        <div class="prog-prose fade-in">
          <p>Joe Herrera, brown belt under Prof. Anthony Curry, lead instructor at Labyrinth BJJ Wharton.</p>
          <p>Prof. Curry founded Labyrinth in 2021 and is a black belt under Matt Leighton of Citadel BJJ. <a href="{ANTHONY_URL}" target="_blank" rel="noopener noreferrer">Read his profile on labyrinth.vision</a>.</p>
        </div>
        <div class="prog-hero__cta fade-in">
          <a href="/coaches/joe-herrera" class="btn btn--ghost">About Joe</a>
          <a href="/coaches/" class="btn btn--ghost">Coaches</a>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="prog-section prog-section--surface" id="why">
  <div class="container">
{section_head('Why Labyrinth', 'THE LABYRINTH WAY', 'Wharton is new. The Labyrinth name behind it is not.')}
    {team_facts_strip()}
    <div class="prog-groups stagger">
      <div class="prog-group"><p class="prog-group__tag">Lineage</p><h3 class="prog-group__title">A lineage you can check</h3><p class="prog-group__desc">Joe trains under Prof. Anthony Curry, a black belt under Matt Leighton of Citadel BJJ. In jiu-jitsu a belt is awarded by a person, so who stands behind the rank matters.</p></div>
      <div class="prog-group"><p class="prog-group__tag">Beginners</p><h3 class="prog-group__title">Built for people who are new</h3><p class="prog-group__desc">You do not need to be in shape, flexible or athletic. Most people who start jiu-jitsu have never done a combat sport, and that is who a first class is for.</p></div>
      <div class="prog-group"><p class="prog-group__tag">Your pace</p><h3 class="prog-group__title">Competition is your choice</h3><p class="prog-group__desc">Labyrinth has a strong competition record, and competing is always optional. Plenty of students train for fitness, self-defense and community and never enter a tournament.</p></div>
    </div>
  </div>
</section>

<section class="prog-section" id="family">
  <div class="container">
    <div class="family">
      <div class="family__logo fade-in"><img src="/assets/logo-maze-480.png" alt="Labyrinth BJJ maze logo" width="480" height="480" loading="lazy"></div>
      <div>
{section_head('Part of the Labyrinth family', 'ONE FAMILY OF GYMS')}
        <div class="prog-prose fade-in">
          <p>Labyrinth BJJ began in 2021 under Prof. Anthony Curry and trains in Fulshear and Katy, Texas. Wharton is the newest Labyrinth gym, and it shares the same lineage, the same standards and the same name.</p>
          <p>Want to see the wider Labyrinth community, the team's tournament results and the other gyms? Visit <a href="{PARENT_URL}" target="_blank" rel="noopener noreferrer">labyrinth.vision</a>.</p>
        </div>
        <div class="prog-hero__cta fade-in">
          <a href="{PARENT_URL}" class="btn btn--ghost" target="_blank" rel="noopener noreferrer">Visit labyrinth.vision</a>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="prog-section prog-section--surface" id="schedule">
  <div class="container">
{section_head('Schedule', 'CLASS TIMES')}
    {sched_block}
    {sched_more}
  </div>
</section>

<section class="prog-section" id="pricing">
  <div class="container">
{section_head('Membership', 'WHAT IT COSTS')}
    {price_block}
    {price_more}
  </div>
</section>

<section class="prog-section prog-section--surface" id="find-us">
  <div class="container">
{section_head('Find us', 'LOCATION &amp; HOURS')}
    {loc_cards(S)}
  </div>
</section>

{faq_html(home_faqs(S), 'Questions', 'FREQUENTLY ASKED')}
<section class="trial" id="contact-form">
  <div class="container">
{section_head('Get started', 'YOUR FIRST CLASS IS FREE')}
    <div class="trial__layout">
      <div class="trial__content fade-in">
        <p>Walking into a new gym is the hardest part. That is why the first class is free, with no pressure and no commitment. {"Tell us a little about who is coming and we will be in touch." if S.live else "Tell us who is coming and we will email you the moment the Wharton class times and address are confirmed."}</p>
        <h3>What to expect</h3>
        <ul>
          <li>A welcoming room for every experience level</li>
          <li>A warm-up you can scale to your fitness</li>
          <li>Technique, then drilling with a partner at your pace</li>
        </ul>
        <h3>What to bring</h3>
        <ul>
          <li>Comfortable athletic clothes with no zippers or pockets</li>
          <li>A water bottle</li>
          <li>Tell us if you do not own a gi</li>
        </ul>
        {form_html(S, 'home')}
      </div>
      <div class="trial__image fade-in">{picture('kids-podium', 'Young Labyrinth BJJ athletes with medals and trophies on a podium')}</div>
    </div>
  </div>
</section>
"""
    return p


def page_programs_hub(S):
    trail = [("/programs/", "Programs")]
    p = Page("/programs/", "programs/index.html", "Programs: Adult & Kids BJJ in Wharton, TX | Labyrinth BJJ Wharton",
             "Two programs at Labyrinth BJJ Wharton: Brazilian jiu-jitsu for adults, and for kids and teens. Beginners welcome. Your first class is free.",
             og_title="Programs at Labyrinth BJJ Wharton", crumbs=trail, priority="0.9")
    p.schema = [breadcrumb_schema(S, trail)]
    if S.live:
        hub_note = 'Class times and prices are on the <a href="/schedule">schedule</a> and <a href="/pricing">pricing</a> pages.'
    else:
        hub_note = "The Wharton class schedule and prices are coming soon. Until then, the free first class form is the way to get on the list."
    p.body = crumbs_html([("/", "Home"), (None, "Programs")]) + f"""
<header class="prog-hero">
  <div class="container">
    <p class="section-label">Programs</p>
    <h1 class="prog-hero__title">Find Your Path</h1>
    <p class="prog-hero__lead">Two programs at Labyrinth BJJ Wharton: Brazilian jiu-jitsu for adults, and Brazilian jiu-jitsu for kids and teens. Both start with a free first class.</p>
    <div class="prog-prose" style="margin-top:var(--space-6)">
      <p>If it is for you, it is <a href="/programs/adult-bjj-wharton">adult BJJ</a>, and it does not matter that you have never done a combat sport, because most people who start have not. If it is for a child or a teenager, it is <a href="/programs/kids-bjj-wharton">kids and teens BJJ</a>, a grappling art with no striking in it.</p>
      <p>{hub_note}</p>
    </div>
    <div class="prog-hero__cta">
      <a href="/contact#free-class" class="btn btn--gold">Get Your Free First Class</a>
      <a href="/areas/" class="btn btn--ghost">Areas We Serve</a>
    </div>
  </div>
</header>

<section class="prog-section">
  <div class="container">
    <div class="program-duo stagger">
      <a href="/programs/adult-bjj-wharton" class="w-program">
        <div class="w-program__media">{picture('adult-gi', 'Adult Brazilian jiu-jitsu competitor in a Labyrinth BJJ gi')}</div>
        <div class="w-program__body">
          <p class="w-program__tag">Adults &middot; Gi &amp; No-Gi</p>
          <h2 class="w-program__title">Adult Brazilian Jiu-Jitsu</h2>
          <p>For complete beginners up to experienced grapplers. Calm, patient and technical beats young and explosive.</p>
          <span class="coach-card__link">Adult BJJ &rarr;</span>
        </div>
      </a>
      <a href="/programs/kids-bjj-wharton" class="w-program">
        <div class="w-program__media">{picture('kids-gi', 'Young Labyrinth BJJ student in a white gi')}</div>
        <div class="w-program__body">
          <p class="w-program__tag">Kids &amp; Teens</p>
          <h2 class="w-program__title">Kids &amp; Teens Jiu-Jitsu</h2>
          <p>Focus, confidence and the ability to handle pressure, with competition always optional.</p>
          <span class="coach-card__link">Kids &amp; Teens BJJ &rarr;</span>
        </div>
      </a>
    </div>
  </div>
</section>

<section class="prog-section prog-section--surface">
  <div class="container">
{section_head('What stays the same', 'ON EVERY MAT')}
    <div class="prog-groups stagger">
      <div class="prog-group"><p class="prog-group__tag">Start here</p><h3 class="prog-group__title">Beginners are welcome</h3><p class="prog-group__desc">Nobody expects you to know anything. Show up, ask questions and go at your own pace.</p></div>
      <div class="prog-group"><p class="prog-group__tag">Grappling</p><h3 class="prog-group__title">No striking</h3><p class="prog-group__desc">Brazilian jiu-jitsu is leverage, position and control. Nobody is hitting anyone.</p></div>
      <div class="prog-group"><p class="prog-group__tag">Free</p><h3 class="prog-group__title">The first class costs nothing</h3><p class="prog-group__desc">No commitment. Try it, then decide.</p></div>
    </div>
  </div>
</section>
""" + close_block("NOT SURE WHICH ONE?", "Tell us who would be training and we will point you to the right program, including if the answer is that we are not the right fit.", S=S)
    return p


def adult_faqs(S):
    return [
        ("Do I need to be in shape before I start?",
         "No, and waiting until you are is the single most common reason people never start. Jiu-jitsu will get you in shape. You build the specific conditioning it needs by doing it, and there is no fitness test at the door. Scale the warm-up, sit out a round when you need to, and let the fitness arrive on its own."),
        ("I am in my forties or older. Am I too old for this?",
         "No. Jiu-jitsu is the martial art most forgiving of a late start because leverage and patience beat athleticism in it more often than in anything else. Train at your pace, tap early, and you can keep doing this for decades."),
        ("What is the difference between Gi and No-Gi?",
         "Gi is the traditional uniform, and the jacket and trousers become part of the game: grips, collar chokes, sweeps off the sleeve. No-Gi is a rashguard and shorts: faster, more wrestling-like, nothing to hold on to. Labyrinth teaches both, and the Wharton classes will be labeled on the schedule."),
        ("What do I wear and what do I need to bring?",
         "For a first class, athletic clothes with no zippers or pockets, and a water bottle. If you do not own a gi, tell us when you sign up and we will let you know what to bring. Trim your nails."),
        ("Do I have to commit to anything?",
         "No. The first class is free and carries no commitment. A free class costs you the same as watching and tells you far more."),
    ]


def page_adult(S):
    trail = [("/programs/", "Programs"), ("/programs/adult-bjj-wharton", "Adult BJJ")]
    desc = ("Adult Brazilian jiu-jitsu in Wharton, TX at Labyrinth BJJ Wharton. Gi and No-Gi, beginners welcome, led by Joe Herrera. "
            "Your first class is free.")
    p = Page("/programs/adult-bjj-wharton", "programs/adult-bjj-wharton.html", "Adult BJJ Classes in Wharton, TX | Labyrinth BJJ Wharton",
             desc, og_title="Adult BJJ in Wharton, TX | Labyrinth BJJ Wharton", og_image="assets/og-wharton.jpg",
             crumbs=trail, priority="0.9")
    faqs = adult_faqs(S)
    p.schema = [service_schema(S, "Adult Brazilian Jiu-Jitsu", desc, p.route), breadcrumb_schema(S, trail), faq_schema(faqs)]
    sched = schedule_week(S, audiences=("adult", "all"))
    sched_block = sched or soon_card("Adult class times coming soon",
                                     "The Wharton class schedule is not set yet. Put your name on the list and we will email you as soon as adult class times are confirmed.",
                                     ("/contact#free-class", "Get notified"))
    pr = price_cards(S, audiences=("adult", "family", "other"))
    price_block = pr or soon_card("Prices coming soon",
                                  "Wharton prices are not set yet. Your first class is free, and prices will be posted on the pricing page once they are confirmed.",
                                  ("/pricing", "About pricing"))
    fact_sched = "On the schedule" if sched else "Coming soon"
    p.body = crumbs_html([("/", "Home"), ("/programs/", "Programs"), (None, "Adult BJJ")]) + f"""
<header class="prog-hero">
  <div class="container">
    <div class="prog-hero__grid">
      <div>
        <p class="section-label">All levels &middot; Gi &amp; No-Gi</p>
        <h1 class="prog-hero__title">Adult Brazilian Jiu-Jitsu in Wharton</h1>
        <p class="prog-hero__lead">Brazilian jiu-jitsu for adults at Labyrinth BJJ Wharton, from complete beginner up. Led by Joe Herrera. Your first class is free.</p>
        <div class="prog-hero__cta">
          <a href="/contact#free-class" class="btn btn--gold">Get Your Free First Class</a>
          <a href="#times" class="btn btn--ghost">Class Times</a>
        </div>
      </div>
      <div class="prog-hero__shot">{picture('adult-gi', 'Adult Brazilian jiu-jitsu competitor in a Labyrinth BJJ gi', loading='eager')}</div>
    </div>
    <div class="prog-facts">
      <div class="prog-fact"><div class="prog-fact__label">Levels</div><div class="prog-fact__value">Complete beginner and up</div></div>
      <div class="prog-fact"><div class="prog-fact__label">Styles</div><div class="prog-fact__value">Gi &amp; No-Gi</div></div>
      <div class="prog-fact"><div class="prog-fact__label">Class times</div><div class="prog-fact__value">{fact_sched}</div></div>
      <div class="prog-fact"><div class="prog-fact__label">First class</div><div class="prog-fact__value"><em>Free</em></div></div>
    </div>
  </div>
</header>

<section class="prog-section">
  <div class="container">
{section_head('The program', 'WHAT IT IS')}
    <div class="prog-prose fade-in">
      <p>Most adults who walk into a jiu-jitsu gym for the first time have never done a combat sport. They have a job, a busy week and maybe a bad shoulder, and they have been meaning to try this for a long time. That is the normal case, not the exception, and the classes are built around it.</p>
      <p>Jiu-jitsu suits adults who start late better than almost any other martial art, for a reason that is not obvious until you have done it: it is the one where being calm, patient and technical beats being young and explosive. Position and leverage count for more than strength or speed.</p>
      <p>Labyrinth teaches <strong>Gi and No-Gi</strong>: the traditional uniform, and the shorts-and-rashguard version. You can do one, or both. Which Wharton classes are Gi and which are No-Gi will be labeled on the schedule.</p>
    </div>
  </div>
</section>

<section class="prog-section prog-section--surface">
  <div class="container">
{section_head('Detail', 'YOUR FIRST CLASS, HONESTLY')}
    <div class="prog-prose fade-in">
      <p>A jiu-jitsu class has the same basic shape wherever you train: a warm-up you can scale down, a technique broken into pieces, and then drilling, where you and one partner take turns with no resistance. That drilling is not intimidating and it is most of the class. Most classes finish with live training, and you are free to sit it out.</p>
      <p>You will be worse at this than you expect for about three months, and then something clicks. Everybody goes through it. The people who quit almost always quit in the third week, which is exactly when it is about to start making sense.</p>
      <p>Come in athletic clothes with no zippers or pockets, bring a water bottle, and tell us when you sign up if you do not own a gi.</p>
    </div>
  </div>
</section>

<section class="prog-section" id="times">
  <div class="container">
{section_head('Timetable', 'ADULT CLASS TIMES')}
    {sched_block}
  </div>
</section>

<section class="prog-section prog-section--surface">
  <div class="container">
{section_head('Coaching', 'WHO TEACHES IT')}
    <div class="coach-pair stagger">
{coach_card_joe(S)}
    </div>
  </div>
</section>

<section class="prog-section">
  <div class="container">
{section_head('Membership', 'WHAT IT COSTS')}
    {price_block}
  </div>
</section>

{faq_html(faqs, 'Questions', 'ADULT BJJ FAQ')}
<section class="prog-section">
  <div class="container">
{section_head('Keep reading', 'MORE FROM WHARTON')}
    <div class="prog-siblings stagger">
      <a href="/programs/kids-bjj-wharton" class="prog-sibling"><div class="prog-sibling__title">Kids &amp; Teens BJJ</div><div class="prog-sibling__desc">Focus, confidence and no striking</div></a>
      <a href="/schedule" class="prog-sibling"><div class="prog-sibling__title">Class schedule</div><div class="prog-sibling__desc">{"Weekly timetable" if S.schedule else "Coming soon"}</div></a>
      <a href="/pricing" class="prog-sibling"><div class="prog-sibling__title">Pricing</div><div class="prog-sibling__desc">{"Plans and prices" if S.pricing else "Coming soon"}</div></a>
      <a href="/areas/" class="prog-sibling"><div class="prog-sibling__title">Areas we serve</div><div class="prog-sibling__desc">El Campo, East Bernard, Boling and more</div></a>
    </div>
  </div>
</section>
""" + close_block("TAKE A FREE CLASS", "No commitment, no pressure. Tell us you are interested and we will set up your free first class.", S=S)
    return p


def kids_faqs(S):
    if S.kids_ages:
        youngest = ("What is the youngest age you take?", "Wharton kids and teens classes are for %s. Tell us your child's age on the form and we will confirm where they fit." % S.kids_ages)
    else:
        youngest = ("What is the youngest age you take?",
                    "The Wharton age groups are not confirmed yet. They will be set with the class schedule. Tell us your child's age on the form and we will let you know where they fit.")
    return [
        youngest,
        ("Is jiu-jitsu safe for a young child?",
         "It is one of the safest martial arts a child can do, because there is no striking in it at all. Jiu-jitsu is grappling: leverage, position and control. Children are not being hit, and they are not hitting anyone. Falling safely is one of the first skills of the art, and it is the one parents tell us shows up outside the gym."),
        ("What should my child wear to the first class?",
         "A t-shirt and shorts or leggings with no zippers, buttons or pockets, and a water bottle. If your child does not have a gi, tell us when you sign up and we will let you know what to bring. Nobody needs to spend money to find out whether their kid likes it."),
        ("Will my child have to compete?",
         "No. Competition is always optional at Labyrinth. Plenty of students train for years and never enter a tournament."),
        ("My child is shy, or has never played a sport. Is that a problem?",
         "No. Many of the children who start jiu-jitsu have tried a team sport, sat on a bench and decided they are not sporty. Jiu-jitsu is one of the few activities where a small child who thinks carefully can genuinely beat a bigger one who does not."),
    ]


def page_kids(S):
    trail = [("/programs/", "Programs"), ("/programs/kids-bjj-wharton", "Kids & Teens BJJ")]
    desc = ("Kids and teens Brazilian jiu-jitsu in Wharton, TX at Labyrinth BJJ Wharton. No striking, competition always optional, "
            "led by Joe Herrera. Your child's first class is free.")
    p = Page("/programs/kids-bjj-wharton", "programs/kids-bjj-wharton.html", "Kids & Teens BJJ in Wharton, TX | Labyrinth BJJ Wharton",
             desc, og_title="Kids & Teens BJJ in Wharton, TX | Labyrinth BJJ Wharton", crumbs=trail, priority="0.9")
    faqs = kids_faqs(S)
    p.schema = [service_schema(S, "Kids & Teens Brazilian Jiu-Jitsu", desc, p.route), breadcrumb_schema(S, trail), faq_schema(faqs)]
    sched = schedule_week(S, audiences=("kids", "all"))
    sched_block = sched or soon_card("Kids & teens class times coming soon",
                                     "The Wharton class schedule is not set yet. Put your name on the list and we will email you as soon as kids and teens class times are confirmed.",
                                     ("/contact#free-class", "Get notified"))
    pr = price_cards(S, audiences=("kids", "family", "other"))
    price_block = pr or soon_card("Prices coming soon",
                                  "Wharton prices are not set yet. Your child's first class is free, and prices will be posted on the pricing page once they are confirmed.",
                                  ("/pricing", "About pricing"))
    ages_fact = esc(S.kids_ages[0].upper() + S.kids_ages[1:]) if S.kids_ages else "Confirmed with the schedule"
    p.body = crumbs_html([("/", "Home"), ("/programs/", "Programs"), (None, "Kids & Teens BJJ")]) + f"""
<header class="prog-hero">
  <div class="container">
    <div class="prog-hero__grid">
      <div>
        <p class="section-label">Kids &amp; Teens &middot; No striking</p>
        <h1 class="prog-hero__title">Kids &amp; Teens Jiu-Jitsu in Wharton</h1>
        <p class="prog-hero__lead">Brazilian jiu-jitsu for children and teens at Labyrinth BJJ Wharton, led by Joe Herrera. Your child's first class is free.</p>
        <div class="prog-hero__cta">
          <a href="/contact#free-class" class="btn btn--gold">Get a Free First Class</a>
          <a href="#times" class="btn btn--ghost">Class Times</a>
        </div>
      </div>
      <div class="prog-hero__shot">{picture('kids-gi', 'Young Labyrinth BJJ student in a white gi with a coach raising their hand', loading='eager')}</div>
    </div>
    <div class="prog-facts">
      <div class="prog-fact"><div class="prog-fact__label">Ages</div><div class="prog-fact__value">{ages_fact}</div></div>
      <div class="prog-fact"><div class="prog-fact__label">Contact</div><div class="prog-fact__value">Grappling, no striking</div></div>
      <div class="prog-fact"><div class="prog-fact__label">Competition</div><div class="prog-fact__value">Always optional</div></div>
      <div class="prog-fact"><div class="prog-fact__label">First class</div><div class="prog-fact__value"><em>Free</em></div></div>
    </div>
  </div>
</header>

<section class="prog-section">
  <div class="container">
{section_head('The program', 'WHAT IT IS')}
    <div class="prog-prose fade-in">
      <p>Most parents come to jiu-jitsu for one of three reasons. Their child is being pushed around at school and they want them to be able to handle it. Their child has energy that no amount of playground time absorbs. Or their child has tried a sport, sat on a bench for a season, and quietly decided they are not sporty.</p>
      <p>Brazilian jiu-jitsu answers all three, and it does it without a single punch being thrown. It is a grappling art, leverage, position and control, which makes it the martial art parents and pediatricians tend to be least nervous about. It is also one of the few children's activities where a small child who thinks carefully genuinely beats a bigger one who does not.</p>
      <p>Labyrinth BJJ is ranked in the top {jits_data.NATIONAL_TOP_PCT}% of academies nationally on jits.gg (#{jits_data.NATIONAL_RANK} of {jits_data.NATIONAL_OF:,}, as of {jits_data.AS_OF}). That is a competition statistic about the whole Labyrinth team, not about Wharton. It is the record of the school Wharton belongs to, founded by the instructor Joe trains under.</p>
    </div>
  </div>
</section>

<section class="prog-section prog-section--surface">
  <div class="container">
{section_head('What kids get', 'MORE THAN TECHNIQUE', 'Jiu-jitsu is the vehicle. These are the things parents tell us they notice.')}
    <div class="prog-groups stagger">
      <div class="prog-group"><p class="prog-group__tag">Focus</p><h3 class="prog-group__title">Listening and following instructions</h3><p class="prog-group__desc">A class has a structure and a respectful way of working with a partner. Children learn to listen, wait their turn and try again.</p></div>
      <div class="prog-group"><p class="prog-group__tag">Body control</p><h3 class="prog-group__title">Falling safely and moving well</h3><p class="prog-group__desc">Coordination, balance and falling without getting hurt are among the first skills of the art, and they carry over to every other sport.</p></div>
      <div class="prog-group"><p class="prog-group__tag">Confidence</p><h3 class="prog-group__title">Handling pressure calmly</h3><p class="prog-group__desc">Working with a partner who is trying to control you, and staying calm while you solve it, is a skill that shows up well outside the gym.</p></div>
    </div>
  </div>
</section>

<section class="prog-section" id="times">
  <div class="container">
{section_head('Timetable', 'KIDS &amp; TEENS CLASS TIMES')}
    {sched_block}
  </div>
</section>

<section class="prog-section prog-section--surface">
  <div class="container">
{section_head('Coaching', 'WHO TEACHES IT')}
    <div class="coach-pair stagger">
{coach_card_joe(S)}
    </div>
  </div>
</section>

<section class="prog-section">
  <div class="container">
{section_head('Membership', 'WHAT IT COSTS')}
    {price_block}
  </div>
</section>

{faq_html(faqs, 'Questions', 'KIDS &amp; TEENS BJJ FAQ')}
<section class="prog-section">
  <div class="container">
{section_head('Keep reading', 'MORE FROM WHARTON')}
    <div class="prog-siblings stagger">
      <a href="/programs/adult-bjj-wharton" class="prog-sibling"><div class="prog-sibling__title">Adult BJJ</div><div class="prog-sibling__desc">Gi &amp; No-Gi, beginners welcome</div></a>
      <a href="/schedule" class="prog-sibling"><div class="prog-sibling__title">Class schedule</div><div class="prog-sibling__desc">{"Weekly timetable" if S.schedule else "Coming soon"}</div></a>
      <a href="/pricing" class="prog-sibling"><div class="prog-sibling__title">Pricing</div><div class="prog-sibling__desc">{"Plans and prices" if S.pricing else "Coming soon"}</div></a>
      <a href="/areas/" class="prog-sibling"><div class="prog-sibling__title">Areas we serve</div><div class="prog-sibling__desc">El Campo, East Bernard, Boling and more</div></a>
    </div>
  </div>
</section>
""" + close_block("BOOK THEIR FIRST CLASS", "Free, with no commitment. Tell us your child's age and we will set up their first class.", S=S)
    return p


def coach_card_joe(S):
    return f"""      <article class="w-coach">
        <div class="w-coach__media">{portrait(S, small=True)}</div>
        <div class="w-coach__info">
          <h3 class="w-coach__name">Joe Herrera</h3>
          <p class="w-coach__role">Lead Instructor, Labyrinth BJJ Wharton</p>
          <div class="coach-card__rank">{belt_bar('brown')}<span class="coach-card__rank-label">Brown Belt</span></div>
          <p class="w-coach__bio">Joe Herrera, brown belt under Prof. Anthony Curry, lead instructor at Labyrinth BJJ Wharton.</p>
          <a href="/coaches/joe-herrera" class="coach-card__link">About Joe &rarr;</a>
        </div>
      </article>"""


def coach_card_anthony(S):
    pic = picture("coach-tony", "Prof. Anthony Curry, owner and head instructor of Labyrinth BJJ", cls="portrait__pic")
    return f"""      <article class="w-coach">
        <div class="w-coach__media"><div class="portrait portrait--sm portrait--photo">{pic}</div></div>
        <div class="w-coach__info">
          <h3 class="w-coach__name">Prof. Anthony Curry</h3>
          <p class="w-coach__role">Owner &amp; Head Instructor, Labyrinth BJJ</p>
          <div class="coach-card__rank">{belt_bar('black')}<span class="coach-card__rank-label">Black Belt</span></div>
          <p class="w-coach__bio">Founded Labyrinth in 2021. Black belt under Matt Leighton of Citadel BJJ. Joe Herrera trains under him.</p>
          <a href="{ANTHONY_URL}" class="coach-card__link" target="_blank" rel="noopener noreferrer">Full profile on labyrinth.vision &rarr;</a>
        </div>
      </article>"""


def page_coaches(S):
    trail = [("/coaches/", "Coaches")]
    desc = ("Meet the coach at Labyrinth BJJ Wharton: Joe Herrera, a brown belt under Prof. Anthony Curry, lead instructor in Wharton, TX.")
    p = Page("/coaches/", "coaches/index.html", "Coaches | Labyrinth BJJ Wharton", desc,
             og_title="Coaches at Labyrinth BJJ Wharton", crumbs=trail, priority="0.8")
    faqs = [("Who teaches at Labyrinth BJJ Wharton?",
             "Joe Herrera, a brown belt under Prof. Anthony Curry, is the lead instructor at Labyrinth BJJ Wharton."),
            ("Who is Prof. Anthony Curry?",
             "The owner and head instructor of Labyrinth BJJ. He founded Labyrinth in 2021 and is a black belt under Matt Leighton of Citadel BJJ. His full profile is on labyrinth.vision.")]
    p.schema = [breadcrumb_schema(S, trail), faq_schema(faqs)]
    p.body = crumbs_html([("/", "Home"), (None, "Coaches")]) + f"""
<header class="prog-hero">
  <div class="container">
    <p class="section-label">Coaches</p>
    <h1 class="prog-hero__title">Your Coach at Wharton</h1>
    <p class="prog-hero__lead">Joe Herrera is the lead instructor at Labyrinth BJJ Wharton. He trains under Prof. Anthony Curry, who founded Labyrinth.</p>
  </div>
</header>

<section class="prog-section">
  <div class="container">
    <div class="coach-pair stagger">
{coach_card_joe(S)}
{coach_card_anthony(S)}
    </div>
  </div>
</section>

<section class="prog-section prog-section--surface">
  <div class="container">
{section_head('Lineage', 'WHO STANDS BEHIND THE RANK')}
    <div class="lineage">
      <div class="lineage__card">
        <div class="lineage__label">Joe Herrera trains under</div>
        <div class="lineage__name">Prof. Anthony Curry</div>
        <div class="lineage__where">Black belt under Matt Leighton<br>Citadel BJJ</div>
      </div>
      <div class="prog-prose">
        <p>There is no central licensing body in jiu-jitsu. A belt is awarded by a person, not issued by an institution, so asking whose judgment stands behind a coach's rank is a fair first question.</p>
        <p>Joe is a brown belt who trains under Prof. Anthony Curry. Prof. Curry founded Labyrinth in 2021 and received his black belt from Matt Leighton of Citadel BJJ. <a href="{ANTHONY_URL}" target="_blank" rel="noopener noreferrer">His full profile</a> is on the main Labyrinth site.</p>
      </div>
    </div>
  </div>
</section>

{faq_html(faqs, 'Questions', 'ABOUT THE COACHES')}
""" + close_block("MEET THE TEAM", "The best way to meet the Wharton coaches is the free first class. Tell us you are interested and we will be in touch.", S=S)
    return p


def page_joe(S):
    trail = [("/coaches/", "Coaches"), ("/coaches/joe-herrera", "Joe Herrera")]
    desc = "Joe Herrera, brown belt under Prof. Anthony Curry, lead instructor at Labyrinth BJJ Wharton in Wharton, TX."
    p = Page("/coaches/joe-herrera", "coaches/joe-herrera.html", "Joe Herrera, Lead Instructor | Labyrinth BJJ Wharton", desc,
             og_title="Joe Herrera: Lead Instructor, Labyrinth BJJ Wharton", crumbs=trail, priority="0.8")
    person = {"@context": "https://schema.org", **joe_person(S),
              "description": desc,
              "worksFor": {"@id": S.url + "/#business", "@type": "SportsActivityLocation", "name": SITE_NAME, "url": S.url},
              "hasCredential": {"@type": "EducationalOccupationalCredential", "credentialCategory": "Brazilian Jiu-Jitsu Brown Belt"}}
    faqs = [("Who is Joe Herrera?", "Joe Herrera is a brown belt under Prof. Anthony Curry and the lead instructor at Labyrinth BJJ Wharton."),
            ("Who does Joe train under?", "Prof. Anthony Curry, the owner and head instructor of Labyrinth BJJ, who founded Labyrinth in 2021 and is a black belt under Matt Leighton of Citadel BJJ."),
            ("How can I meet Joe?", "Claim a free first class with the form on this page. It is the best way to meet the Wharton team.")]
    p.schema = [person, breadcrumb_schema(S, trail), faq_schema(faqs)]
    p.body = crumbs_html([("/", "Home"), ("/coaches/", "Coaches"), (None, "Joe Herrera")]) + f"""
<header class="prog-hero">
  <div class="container">
    <div class="prog-hero__grid prog-hero__grid--portrait">
      <div>
        <p class="section-label">Lead Instructor &middot; Labyrinth BJJ Wharton</p>
        <h1 class="prog-hero__title">Joe Herrera</h1>
        <p class="prog-hero__lead">Joe Herrera, brown belt under Prof. Anthony Curry, lead instructor at Labyrinth BJJ Wharton.</p>
        <div class="prog-hero__cta">
          <a href="#free-class" class="btn btn--gold">Train With Us</a>
          <a href="/programs/" class="btn btn--ghost">See the Programs</a>
        </div>
      </div>
      <div class="prog-hero__portrait">{portrait(S)}</div>
    </div>
    <div class="prog-facts">
      <div class="prog-fact"><div class="prog-fact__label">Rank</div><div class="prog-fact__value"><em>Brown belt</em></div></div>
      <div class="prog-fact"><div class="prog-fact__label">Trains under</div><div class="prog-fact__value">Prof. Anthony Curry</div></div>
      <div class="prog-fact"><div class="prog-fact__label">Role</div><div class="prog-fact__value">Lead instructor</div></div>
      <div class="prog-fact"><div class="prog-fact__label">Gym</div><div class="prog-fact__value">Labyrinth BJJ Wharton</div></div>
    </div>
  </div>
</header>

<section class="prog-section prog-section--surface">
  <div class="container">
{section_head('Lineage', 'WHO HE TRAINS UNDER')}
    <div class="lineage">
      <div class="lineage__card">
        <div class="lineage__label">Trains under</div>
        <div class="lineage__name">Prof. Anthony Curry</div>
        <div class="lineage__where">Owner &amp; head instructor, Labyrinth BJJ<br>Black belt under Matt Leighton, Citadel BJJ</div>
      </div>
      <div class="prog-prose">
        <p>Joe trains under Prof. Anthony Curry, who founded Labyrinth in 2021 and received his black belt from Matt Leighton of Citadel BJJ in Iowa City.</p>
        <p>Read more on <a href="{ANTHONY_URL}" target="_blank" rel="noopener noreferrer">Prof. Curry's profile</a> on labyrinth.vision.</p>
      </div>
    </div>
  </div>
</section>

{faq_html(faqs, 'Questions', 'ABOUT JOE')}
<section class="trial" id="contact-form">
  <div class="container container--narrow">
{section_head('Meet Joe', 'START WITH A FREE CLASS')}
    {form_html(S, 'joe', compact=True)}
  </div>
</section>
"""
    p.has_form = True
    return p


def page_schedule(S):
    trail = [("/schedule", "Schedule")]
    has_real = bool(S.schedule)
    p = Page("/schedule", "schedule.html", "Class Schedule | Labyrinth BJJ Wharton",
             "", og_title="Class Schedule: Labyrinth BJJ Wharton", crumbs=trail, has_form=not has_real, priority="0.9", changefreq="weekly")
    if has_real:
        p.description = "The weekly class schedule at Labyrinth BJJ Wharton in Wharton, TX: adult, kids and teens Brazilian jiu-jitsu. Your first class is free."
        lead = "The weekly timetable for adults, kids and teens at Labyrinth BJJ Wharton. Your first class is free, in whichever class suits you."
    else:
        p.description = "The Labyrinth BJJ Wharton class schedule is coming soon. Get notified when class times are set and claim a free first class."
        lead = "The Wharton class schedule is not set yet. Tell us you are interested and you will be the first to know when it is, with your free first class on us."
    faqs = [("When will the Wharton class schedule be posted?",
             "It is on this page." if has_real else "As soon as it is confirmed. Put your name on the list and we will email you the moment it is posted."),
            ("Is the first class free?", "Yes. Your first class at Labyrinth BJJ Wharton is free, with no commitment."),
            ("Are there classes for kids?", "Wharton has a kids and teens program as well as an adult program. " +
             ("Look for the kids and teens classes on the timetable." if has_real else "Kids and teens class times will be on this page when the schedule is set."))]
    p.schema = [breadcrumb_schema(S, trail), faq_schema(faqs)]
    week = schedule_week(S)
    if has_real:
        main = f"""<section class="prog-section" id="times">
  <div class="container">
{section_head('Weekly timetable', 'CLASS TIMES')}
    {week}
    <p class="prog-week__note fade-in">Your first class is free in any class that suits you. Tell us when you sign up if you do not own a gi.</p>
    <div class="prog-hero__cta fade-in">
      <a href="/contact#free-class" class="btn btn--gold">Get Your Free First Class</a>
    </div>
  </div>
</section>
"""
        tail = ""
    else:
        main = f"""<section class="prog-section">
  <div class="container">
    {soon_card("Class times coming soon", "We are setting the Wharton timetable now. The classes will be for adults and for kids and teens. When the times are confirmed they will be posted on this page, and everyone on the list will get an email first.")}
  </div>
</section>

<section class="prog-section prog-section--surface">
  <div class="container">
{section_head('While you wait', 'WHAT YOU CAN DO NOW')}
    <div class="prog-groups stagger">
      <div class="prog-group"><p class="prog-group__tag">1</p><h3 class="prog-group__title">Join the list</h3><p class="prog-group__desc">Tell us who would be training. You will hear about class times, prices and the address before anyone else.</p></div>
      <div class="prog-group"><p class="prog-group__tag">2</p><h3 class="prog-group__title">Read about the programs</h3><p class="prog-group__desc">See what <a href="/programs/adult-bjj-wharton">adult</a> and <a href="/programs/kids-bjj-wharton">kids and teens</a> jiu-jitsu involves and what to expect from a first class.</p></div>
      <div class="prog-group"><p class="prog-group__tag">3</p><h3 class="prog-group__title">Claim your free first class</h3><p class="prog-group__desc">Your first class costs nothing and carries no commitment. The form below reserves your place on the list for it.</p></div>
    </div>
  </div>
</section>

<section class="trial" id="contact-form">
  <div class="container container--narrow">
{section_head('Get notified', 'TELL US YOU ARE INTERESTED')}
    {form_html(S, 'sched', compact=True, title='Get notified and claim a free first class')}
  </div>
</section>
"""
    p.body = crumbs_html([("/", "Home"), (None, "Schedule")]) + f"""
<header class="prog-hero">
  <div class="container">
    <p class="section-label">Schedule{" " + soon_badge() if not has_real else ""}</p>
    <h1 class="prog-hero__title">Class Schedule</h1>
    <p class="prog-hero__lead">{esc(lead)}</p>
  </div>
</header>

{main}
{faq_html(faqs, 'Questions', 'SCHEDULE FAQ')}
"""
    if has_real:
        p.body += close_block("TRY A CLASS ON US", "Pick a class from the timetable and tell us you are coming. The first one is free.", S=S)
    return p


def page_pricing(S):
    trail = [("/pricing", "Pricing")]
    has_real = bool(S.pricing)
    p = Page("/pricing", "pricing.html", "Pricing | Labyrinth BJJ Wharton", "", og_title="Pricing: Labyrinth BJJ Wharton",
             crumbs=trail, priority="0.8")
    if has_real:
        p.description = "Membership prices at Labyrinth BJJ Wharton in Wharton, TX, for adults, kids and teens. Your first class is free."
        lead = "Membership prices for Labyrinth BJJ Wharton are on this page, and the first class is free whatever you decide afterwards."
    else:
        p.description = "Labyrinth BJJ Wharton prices are coming soon. Your first class is free. Get notified when prices are posted."
        lead = "Wharton prices are not set yet. What we can tell you now: your first class is free. Prices will be posted on this page as soon as they are confirmed."
    faqs = [("Is the first class free?", "Yes. Your first class at Labyrinth BJJ Wharton is free, with no commitment."),
            ("When will prices be posted?" if not has_real else "Where can I see the prices?",
             "Right here on this page." if has_real else "On this page, as soon as they are confirmed. Put your name on the list and we will email you when they are.")]
    p.schema = [breadcrumb_schema(S, trail), faq_schema(faqs)]
    if has_real:
        body = f"""<section class="prog-section">
  <div class="container">
{section_head('Plans', 'MEMBERSHIPS')}
    {price_cards(S)}
  </div>
</section>
"""
    else:
        body = f"""<section class="prog-section">
  <div class="container">
    {soon_card("Prices coming soon", "We have not set Wharton membership prices yet, so we are not going to guess. They will be posted here before you need to decide anything, and your first class is free.", ("/contact#free-class", "Get notified"))}
  </div>
</section>
"""
    p.body = crumbs_html([("/", "Home"), (None, "Pricing")]) + f"""
<header class="prog-hero">
  <div class="container">
    <p class="section-label">Membership{" " + soon_badge() if not has_real else ""}</p>
    <h1 class="prog-hero__title">What It Costs</h1>
    <p class="prog-hero__lead">{esc(lead)}</p>
    <div class="prog-hero__cta">
      <a href="/contact#free-class" class="btn btn--gold">Get Your Free First Class</a>
      <a href="/schedule" class="btn btn--ghost">See the Schedule</a>
    </div>
    <div class="prog-facts">
      <div class="prog-fact"><div class="prog-fact__label">First class</div><div class="prog-fact__value"><em>Free</em></div></div>
      <div class="prog-fact"><div class="prog-fact__label">Programs</div><div class="prog-fact__value">Adults, kids &amp; teens</div></div>
      <div class="prog-fact"><div class="prog-fact__label">Prices</div><div class="prog-fact__value">{"On this page" if has_real else "Coming soon"}</div></div>
    </div>
  </div>
</header>

{body}
{faq_html(faqs, 'Questions', 'ABOUT PRICING')}
""" + close_block("TRY IT BEFORE YOU PAY", "The first class is free for everybody. Decide about money afterwards.", S=S)
    return p


def page_contact(S):
    trail = [("/contact", "Contact")]
    desc = "Contact Labyrinth BJJ Wharton: call, email or use the form to claim your free first class and get notified about class times in Wharton, TX."
    p = Page("/contact", "contact.html", "Contact & Free First Class | Labyrinth BJJ Wharton", desc,
             og_title="Contact Labyrinth BJJ Wharton", crumbs=trail, has_form=True, priority="0.9")
    p.schema = [breadcrumb_schema(S, trail),
                {"@context": "https://schema.org", "@type": "ContactPage", "name": "Contact Labyrinth BJJ Wharton",
                 "url": S.abs("/contact"), "mainEntity": {"@id": S.url + "/#business"}}]
    if S.has_address:
        addr = "<p>%s</p>" % "<br>".join(esc(x) for x in S.address_lines())
        if S.map_url:
            addr += '<p><a href="%s" target="_blank" rel="noopener noreferrer">Get directions</a></p>' % esc(S.map_url)
    else:
        addr = soon_badge() + "<p>The Wharton street address is not confirmed yet. We will send it to everyone on the list first.</p>"
    p.body = crumbs_html([("/", "Home"), (None, "Contact")]) + f"""
<header class="prog-hero">
  <div class="container">
    <p class="section-label">Contact</p>
    <h1 class="prog-hero__title">Talk to Wharton</h1>
    <p class="prog-hero__lead">Call, email, or use the form to claim your free first class. {"" if S.live else "Class times, prices and the address are coming soon, and the form is how you get them first."}</p>
  </div>
</header>

<section class="prog-section" id="contact-form">
  <div class="container">
    <div class="contact-grid">
      <div>
        {form_html(S, 'contact')}
      </div>
      <aside class="contact-card fade-in" aria-label="Contact details">
        <h2 class="contact-card__title">Reach us directly</h2>
        <p class="contact-card__row"><span>Phone</span><a href="tel:{S.tel}">{S.phone}</a></p>
        <p class="contact-card__row"><span>Email</span><a href="mailto:{S.email}">{S.email}</a></p>
        <div class="contact-card__loc"><span>Location</span>{addr}</div>
      </aside>
    </div>
  </div>
</section>

<section class="prog-section prog-section--surface" id="find-us">
  <div class="container">
{section_head('Find us', 'LOCATION &amp; HOURS')}
    {loc_cards(S)}
  </div>
</section>
"""
    return p


# ── Area pages ───────────────────────────────────────────────────────────────

AREAS = [
    {
        "slug": "bjj-el-campo", "place": "El Campo", "isd": "El Campo ISD",
        "eyebrow": "El Campo, Wharton County",
        "title": "Brazilian Jiu-Jitsu Near El Campo, TX | Labyrinth BJJ Wharton",
        "description": "Brazilian jiu-jitsu for adults, kids and teens, serving families from El Campo, TX. Labyrinth BJJ Wharton is in the same county. First class free.",
        "lead": "Labyrinth BJJ Wharton is the new Labyrinth gym in Wharton County, and we are serving families from El Campo, up US 59.",
        "body": [
            "If you live in El Campo, Wharton is up US 59, and a Labyrinth gym that close is the whole reason this page exists. We have not published a drive time because the Wharton address is not set yet. When it is, it will be on this page and on the contact page, and your own maps app will give you a better answer than any estimate of ours.",
            "Adults in El Campo who work shifts or long days are the people we hear from most when a new gym is announced, so the first thing to do is tell us what suits you. Before work, at lunch, evenings or weekends: put it in the message box on the form. We cannot promise a class at every hour, but we would rather know.",
            "For families in the El Campo ISD, the first question is always after-school. The kids and teens class times are not set yet; they will be on the schedule page when they are, and your child's first class is free either way.",
        ],
        "cards": [
            ("Same county", "In Wharton County with you", "El Campo and Wharton are both in Wharton County, so this is a local gym, not a trip to the city."),
            ("US 59", "Up the highway", "We are not quoting minutes. When the address is published, check the drive on your own map."),
            ("Free", "Try before you decide", "Adults, kids and teens all get a free first class with no commitment."),
        ],
        "faqs": [
            ("Is there a Labyrinth gym near El Campo?",
             "Labyrinth BJJ Wharton is in Wharton, in the same county as El Campo. The street address is {addr}."),
            ("Can El Campo families get the free first class?",
             "Yes. Use the form, mention El Campo if you like, and tell us who would be training. Adults, kids and teens all get a free first class."),
        ],
    },
    {
        "slug": "bjj-east-bernard", "place": "East Bernard", "isd": "East Bernard ISD",
        "eyebrow": "East Bernard, Wharton County",
        "title": "Brazilian Jiu-Jitsu Near East Bernard, TX | Labyrinth BJJ Wharton",
        "description": "Brazilian jiu-jitsu for adults, kids and teens, serving families from East Bernard, TX. Labyrinth BJJ Wharton, in Wharton County. First class free.",
        "lead": "A Labyrinth gym is coming to Wharton, and we are serving families from East Bernard who want jiu-jitsu without a trip into Houston.",
        "body": [
            "East Bernard and Wharton are both in Wharton County. We have not worked out a drive time, because the Wharton address is not set yet; once it is published you can check it on your own map and decide whether a regular class fits your week.",
            "Two kinds of family tend to ask about jiu-jitsu first. The first is the one with a school athlete: a student who plays football, volleyball or runs track and wants something that builds strength, balance and grit between seasons. Jiu-jitsu is an individual-pace art with no season, which is why it pairs well with team sports.",
            "The second is the household that wants to train together, a parent and one or two children in the same evening. If that is you, choose \"More than one of us\" on the form and tell us the ages. Class times are not set yet, and knowing who is coming helps us answer you properly.",
        ],
        "cards": [
            ("Cross-training", "A fit for school athletes", "Strength, balance and grit that carry across to football, volleyball, track and wrestling."),
            ("Together", "Parents and kids", "Adults and kids and teens each have a program. Tell us who is coming and we will point you to the right ones."),
            ("Free", "Try before you decide", "Your first class is free, with no commitment."),
        ],
        "faqs": [
            ("Can a parent and child both try a class?",
             "Yes. Both get a free first class. Choose \"More than one of us\" on the form and tell us the ages, and we will be in touch about class times when they are set."),
            ("Is jiu-jitsu a good fit for a child who plays other sports?",
             "Many people find it is. Jiu-jitsu builds balance, body control and the habit of staying calm under pressure, and it has no season that clashes with team sports. Competition is always optional at Labyrinth."),
        ],
    },
    {
        "slug": "bjj-boling", "place": "Boling", "isd": "Boling ISD",
        "eyebrow": "Boling, Wharton County",
        "title": "Brazilian Jiu-Jitsu Near Boling, TX | Labyrinth BJJ Wharton",
        "description": "Brazilian jiu-jitsu for beginners, adults, kids and teens, serving families from Boling, TX. Labyrinth BJJ Wharton in Wharton County. First class free.",
        "lead": "Labyrinth BJJ Wharton is opening in the county seat, and we are serving families from Boling who have never trained and are curious.",
        "body": [
            "Boling and Wharton are in the same county. The Wharton address is not set yet and we are not going to guess a drive time; when it is published, your map will tell you.",
            "Most people who start jiu-jitsu have never done a combat sport, and this page is written for them. You do not have to be fit, flexible or athletic. You scale the warm-up, you tap early, and you go at your own pace. Fitness, self-defense and a good room full of people are what most adults come for, and none of it requires experience.",
            "For Boling ISD families, the program for kids and teens is grappling with no striking, built around focus, body control and handling pressure. Age groups will be confirmed with the schedule, so put your child's age in the form and we will tell you where they fit.",
        ],
        "cards": [
            ("Never trained", "Beginners are the point", "You do not need any experience or fitness to start. Most people who begin have never done a combat sport."),
            ("Grappling", "No striking", "Brazilian jiu-jitsu is leverage, position and control. Nobody is hitting anyone."),
            ("Free", "Try before you decide", "Your first class is free. Tell us who is coming and we will be in touch."),
        ],
        "faqs": [
            ("I have never done any martial art. Can I just turn up?",
             "Yes. Beginners are welcome and a first class is built for people who have never trained. Come in comfortable athletic clothes with no zippers or pockets, and tell us when you sign up if you do not own a gi."),
            ("Is Boling close enough to train regularly?",
             "That depends on your week, and we have not measured it. The address will be published as soon as it is confirmed. A free first class means you can find out how the drive feels before you commit to anything."),
        ],
    },
    {
        "slug": "bjj-hungerford", "place": "Hungerford", "isd": None,
        "eyebrow": "Hungerford, Wharton County",
        "title": "Brazilian Jiu-Jitsu Near Hungerford, TX | Labyrinth BJJ Wharton",
        "description": "Brazilian jiu-jitsu for adults, kids and teens, serving families from Hungerford, TX. Labyrinth BJJ Wharton, in Wharton County. First class free.",
        "lead": "Hungerford is a small community, so this is a short page: Labyrinth BJJ Wharton is the nearest Labyrinth gym and we are serving families from Hungerford.",
        "body": [
            "Hungerford and Wharton are both in Wharton County. We have not published a drive time, because the Wharton address is not set yet. When it is, check the route on your own map.",
            "Here is what is useful to know today. There is a program for adults and a program for kids and teens. Both are Brazilian jiu-jitsu, which is grappling with no striking. The first class is free. Class times and prices are coming soon, and the form is the way to hear about them first.",
            "If you are from Hungerford, say so in the message box. It costs nothing, and it tells us which communities people are writing from.",
        ],
        "cards": [
            ("Programs", "Adults, kids and teens", "Two programs, both starting with a free first class."),
            ("Coming soon", "Times and prices", "Not set yet, and we are not going to guess. Join the list to hear first."),
            ("Contact", "Call or email", "You can also call or email us directly with any question."),
        ],
        "faqs": [
            ("Is there a Labyrinth gym near Hungerford?",
             "Labyrinth BJJ Wharton is in Wharton, in the same county as Hungerford. The street address is {addr}."),
            ("What do I need to do to try a class?",
             "Fill in the short form on this page, or call or email us. Your first class is free, and we will be in touch about when."),
        ],
    },
    {
        "slug": "bjj-louise", "place": "Louise", "isd": "Louise ISD",
        "eyebrow": "Louise, Wharton County",
        "title": "Brazilian Jiu-Jitsu Near Louise, TX | Labyrinth BJJ Wharton",
        "description": "Brazilian jiu-jitsu for adults, kids and teens, serving families from Louise, TX. Labyrinth BJJ Wharton, in Wharton County. First class free.",
        "lead": "Labyrinth BJJ Wharton is serving families from Louise and the surrounding area, and the first class is free so you can find out how the drive feels.",
        "body": [
            "Louise and Wharton are in the same county, but we have not measured the drive and we are not going to pretend it is short or long. The Wharton address is not set yet. When it is published, check the route on your own map against the days and times you would actually be driving.",
            "A regular class is a commitment of time as well as money, and families in smaller communities know that better than anyone. That is one reason the first class is free: it costs you one trip to find out whether jiu-jitsu, and the drive, fit your week.",
            "For Louise ISD families thinking about kids and teens jiu-jitsu: it is grappling with no striking, and the point is confidence, focus and learning to stay calm under pressure. Age groups will be confirmed with the schedule. Put your child's age in the form and we will tell you where they fit.",
        ],
        "cards": [
            ("Your week", "Check the drive yourself", "We are not quoting minutes. Compare the address, once published, with the times you would travel."),
            ("Kids & teens", "Confidence and focus", "A grappling art with no striking, and competition is always optional."),
            ("Free", "One trip to find out", "Your first class is free, with no commitment."),
        ],
        "faqs": [
            ("How far is Louise from the Wharton gym?",
             "We have not measured it and will not guess. Both are in Wharton County. The address will be published as soon as it is confirmed, and your maps app will give you a drive time for the hours you would actually travel."),
            ("Can my child try a class before we commit?",
             "Yes. Your child's first class is free, with no commitment. Tell us their age on the form and we will let you know where they fit."),
        ],
    },
]


def area_faqs(S, a):
    out = []
    for q, ans in a["faqs"]:
        if "{addr}" in ans:
            ans = ans.replace("{addr}", S.address_oneline() if S.has_address else "not confirmed yet. We will post it here and send it to everyone on the list as soon as it is")
        out.append((q, ans))
    out.append(faq_when(S))
    return out


def page_area(S, a):
    route = "/areas/" + a["slug"]
    trail = [("/areas/", "Areas"), (route, a["place"])]
    p = Page(route, "areas/%s.html" % a["slug"], a["title"], a["description"],
             og_title="Brazilian Jiu-Jitsu near %s, TX | Labyrinth BJJ Wharton" % a["place"], crumbs=trail, has_form=True, priority="0.6")
    faqs = area_faqs(S, a)
    svc = service_schema(S, "Brazilian Jiu-Jitsu near %s, TX" % a["place"], a["description"], route)
    svc["areaServed"] = [{"@type": "City", "name": a["place"] + ", TX"}]
    p.schema = [svc, breadcrumb_schema(S, trail), faq_schema(faqs)]
    others = [x for x in AREAS if x["slug"] != a["slug"]]
    sib = "".join('<a href="/areas/%s" class="prog-sibling"><div class="prog-sibling__title">Near %s</div><div class="prog-sibling__desc">Wharton County, TX</div></a>' % (x["slug"], x["place"]) for x in others[:3])
    paras = "".join("<p>%s</p>" % esc(t) for t in a["body"])
    cards = "".join('<div class="prog-group"><p class="prog-group__tag">%s</p><h3 class="prog-group__title">%s</h3><p class="prog-group__desc">%s</p></div>' % (esc(t), esc(h), esc(d)) for t, h, d in a["cards"])
    p.body = crumbs_html([("/", "Home"), ("/areas/", "Areas"), (None, a["place"])]) + f"""
<header class="prog-hero">
  <div class="container">
    <p class="section-label">{esc(a['eyebrow'])}{" " + soon_badge() if not S.live else ""}</p>
    <h1 class="prog-hero__title">Brazilian Jiu-Jitsu Near {esc(a['place'])}, TX</h1>
    <p class="prog-hero__lead">{esc(a['lead'])}</p>
    <div class="prog-hero__cta">
      <a href="#free-class" class="btn btn--gold">Get Your Free First Class</a>
      <a href="/programs/" class="btn btn--ghost">See the Programs</a>
    </div>
    <div class="prog-facts">
      <div class="prog-fact"><div class="prog-fact__label">Serving</div><div class="prog-fact__value">{esc(a['place'])}, TX</div></div>
      <div class="prog-fact"><div class="prog-fact__label">Gym</div><div class="prog-fact__value">Labyrinth BJJ Wharton</div></div>
      <div class="prog-fact"><div class="prog-fact__label">Programs</div><div class="prog-fact__value">Adults, kids &amp; teens</div></div>
      <div class="prog-fact"><div class="prog-fact__label">First class</div><div class="prog-fact__value"><em>Free</em></div></div>
    </div>
  </div>
</header>

<section class="prog-section">
  <div class="container">
{section_head('Serving families from ' + a['place'], 'JIU-JITSU FOR ' + a['place'].upper())}
    <div class="prog-prose fade-in">{paras}</div>
  </div>
</section>

<section class="prog-section prog-section--surface">
  <div class="container">
{section_head('Good to know', 'BEFORE YOU COME')}
    <div class="prog-groups stagger">{cards}</div>
  </div>
</section>

<section class="prog-section" id="find-us">
  <div class="container">
{section_head('Where the gym is', 'LABYRINTH BJJ WHARTON')}
    {loc_cards(S)}
  </div>
</section>

{faq_html(faqs, 'Questions', 'NEAR ' + a['place'].upper() + ': FAQ')}
<section class="trial" id="contact-form">
  <div class="container container--narrow">
{section_head('Get started', 'YOUR FIRST CLASS IS FREE')}
    {form_html(S, 'area', compact=True)}
  </div>
</section>

<section class="prog-section">
  <div class="container">
{section_head('Nearby', 'OTHER TOWNS WE SERVE')}
    <div class="prog-siblings stagger">{sib}
      <a href="/areas/" class="prog-sibling"><div class="prog-sibling__title">All areas</div><div class="prog-sibling__desc">Towns near Wharton</div></a>
    </div>
  </div>
</section>
"""
    return p


def page_areas_hub(S):
    trail = [("/areas/", "Areas")]
    desc = ("Towns near Wharton, TX served by Labyrinth BJJ Wharton: El Campo, East Bernard, Boling, Hungerford and Louise. "
            "Brazilian jiu-jitsu for adults, kids and teens. First class free.")
    p = Page("/areas/", "areas/index.html", "Areas We Serve Near Wharton, TX | Labyrinth BJJ Wharton", desc,
             og_title="Towns near Wharton served by Labyrinth BJJ Wharton", crumbs=trail, priority="0.7")
    p.schema = [breadcrumb_schema(S, trail), {
        "@context": "https://schema.org", "@type": "ItemList",
        "itemListElement": [{"@type": "ListItem", "position": i, "name": "Brazilian Jiu-Jitsu near %s, TX" % a["place"],
                             "url": S.abs("/areas/" + a["slug"])} for i, a in enumerate(AREAS, start=1)]}]
    addr_note = 'The address is on the <a href="/contact">contact page</a>.' if S.has_address else "The Wharton address is not confirmed yet, and we will post it as soon as it is."
    cards = "".join('<a href="/areas/%s" class="prog-sibling"><div class="prog-sibling__title">Near %s</div><div class="prog-sibling__desc">%s</div></a>'
                    % (a["slug"], a["place"], esc(a["lead"])) for a in AREAS)
    p.body = crumbs_html([("/", "Home"), (None, "Areas")]) + f"""
<header class="prog-hero">
  <div class="container">
    <p class="section-label">Areas{" " + soon_badge() if not S.live else ""}</p>
    <h1 class="prog-hero__title">Towns Near Wharton</h1>
    <p class="prog-hero__lead">Labyrinth BJJ Wharton serves Wharton and the communities around it. These are the towns we hear from, with what is useful to know from each.</p>
    <div class="prog-prose" style="margin-top:var(--space-6)">
      <p>We do not quote drive times, because we would rather you check the route on your own map once the address is published. {addr_note} Whichever town you are in, the first class is free.</p>
    </div>
  </div>
</header>

<section class="prog-section">
  <div class="container">
    <div class="prog-siblings stagger">{cards}</div>
  </div>
</section>
""" + close_block("NOT SEE YOUR TOWN?", "If you are within reach of Wharton, you are welcome. Tell us where you are writing from and we will be in touch.", S=S)
    return p


# ── Privacy policy: the main site's, adjusted for this domain ────────────────

def page_privacy(S):
    """The main site's privacy-policy.html with this site's nav, footer, domain and contact details.

    Every substitution must hit exactly once or the build stops: if the main
    policy is reworded, a silent miss would leave the Fulshear street address
    on the Wharton site.
    """
    src = open(os.path.join(ROOT, "privacy-policy.html"), encoding="utf-8").read()
    pretty = datetime.date.fromisoformat(S.lastmod)
    pretty = "%s %d, %d" % (pretty.strftime("%B"), pretty.day, pretty.year)
    if S.has_address:
        addr_sentence = "The Labyrinth BJJ Wharton gym is at <strong>%s</strong>." % esc(S.address_oneline())
        addr_row = "<p><strong>Address:</strong> %s</p>" % esc(S.address_oneline())
    else:
        addr_sentence = "The street address of the Labyrinth BJJ Wharton gym will be published on our <a href=\"/contact\">contact page</a> once it is confirmed."
        addr_row = "<p><strong>Address:</strong> To be published on the <a href=\"/contact\">contact page</a>.</p>"
    subs = [
        ("<title>Privacy Policy | Labyrinth BJJ</title>", "<title>Privacy Policy | Labyrinth BJJ Wharton</title>"),
        ('content="Privacy Policy for Labyrinth BJJ. Learn how we collect, use, and protect your personal information."',
         'content="Privacy Policy for Labyrinth BJJ Wharton. Learn how we collect, use, and protect your personal information."'),
        ('  <link rel="canonical" href="https://labyrinth.vision/privacy-policy" />\n',
         ('  <link rel="canonical" href="%s" />\n' % S.abs("/privacy-policy")) if S.live else ""),
        ("operates the website at <strong>labyrinth.vision</strong>.",
         "operates the Labyrinth BJJ Wharton website at <strong>wharton.labyrinth.vision</strong>, on behalf of %s." % LEGAL_NAME),
        ("<p>Our business address is: <strong>6615 West Cross Creek Bend Lane, Suite #400, Fulshear, TX 77441</strong>. You can reach us at",
         "<p>%s You can reach us at" % addr_sentence),
        ("<p>Labyrinth BJJ is headquartered in Fulshear, Texas. If you are a Texas resident,",
         "<p>Labyrinth BJJ is a Texas business. If you are a Texas resident,"),
        ("<p><strong>Address:</strong> 6615 West Cross Creek Bend Lane, Suite #400, Fulshear, TX 77441</p>", addr_row),
        ("Effective Date: April 9, 2026 &nbsp;·&nbsp; Last Updated: August 10, 2026",
         "Effective Date: April 9, 2026 &nbsp;·&nbsp; Last Updated: %s" % pretty),
    ]
    for old, new in subs:
        if src.count(old) != 1:
            raise SystemExit("privacy-policy.html no longer contains exactly one copy of:\n  %s\nUpdate page_privacy() in scripts/build_wharton.py." % old[:100])
        src = src.replace(old, new)

    # Nav and mobile nav: from <!-- NAV --> up to <!-- PAGE HERO -->
    new_nav = f"""<!-- NAV -->
  <nav class="nav" id="nav" aria-label="Main navigation">
    <div class="nav__inner">
      <a href="/" class="nav__logo" aria-label="Labyrinth BJJ Wharton home">
        <svg viewBox="0 0 36 36" fill="none" aria-hidden="true">
          <rect width="36" height="36" rx="8" fill="#C8A24C" fill-opacity="0.12"/>
          <path d="M18 6 L30 13 L30 23 L18 30 L6 23 L6 13 Z" stroke="#C8A24C" stroke-width="1.5" fill="none"/>
          <path d="M18 6 L18 30 M6 13 L30 23 M30 13 L6 23" stroke="#C8A24C" stroke-width="1" opacity="0.4"/>
        </svg>
        <span class="nav__logo-text">LABYRINTH WHARTON</span>
      </a>
      <div class="nav__links">
        <a href="/programs/" class="nav__link">Programs</a>
        <a href="/schedule" class="nav__link">Schedule</a>
        <a href="/coaches/" class="nav__link">Coaches</a>
        <a href="/contact" class="nav__link">Contact</a>
        <div class="nav__divider" aria-hidden="true"></div>
        <a href="/contact#free-class" class="nav__cta">Free First Class</a>
      </div>
      <button class="nav__hamburger" id="hamburger" aria-label="Open menu" aria-expanded="false">
        <span></span><span></span><span></span>
      </button>
    </div>
  </nav>

  <!-- MOBILE NAV -->
  <div class="nav__mobile" id="mobileNav" role="dialog" aria-label="Mobile navigation">
    <a href="/programs/">Programs</a>
    <a href="/schedule">Schedule</a>
    <a href="/coaches/">Coaches</a>
    <a href="/contact">Contact</a>
    <a href="/contact#free-class" class="nav__cta">Free First Class</a>
  </div>

  """
    a, b = src.index("<!-- NAV -->"), src.index("<!-- PAGE HERO -->")
    src = src[:a] + new_nav + src[b:]

    new_footer = f"""<!-- FOOTER -->
  <footer class="footer">
    <div class="footer__inner">
      <div class="footer__grid">
        <div class="footer__brand">
          <p class="footer__brand-name">
            <svg viewBox="0 0 28 28" fill="none" aria-hidden="true">
              <rect width="28" height="28" rx="6" fill="#C8A24C" fill-opacity="0.12"/>
              <path d="M14 4 L23 9 L23 19 L14 24 L5 19 L5 9 Z" stroke="#C8A24C" stroke-width="1.2" fill="none"/>
              <path d="M14 4 L14 24 M5 9 L23 19 M23 9 L5 19" stroke="#C8A24C" stroke-width="0.8" opacity="0.4"/>
            </svg>
            LABYRINTH BJJ WHARTON
          </p>
          <p class="footer__brand-desc">Brazilian jiu-jitsu in Wharton, Texas, led by Joe Herrera. Part of the Labyrinth family.</p>
        </div>
        <div>
          <p class="footer__col-title">Programs</p>
          <ul class="footer__links" role="list">
            <li><a href="/programs/adult-bjj-wharton">Adult BJJ</a></li>
            <li><a href="/programs/kids-bjj-wharton">Kids &amp; Teens BJJ</a></li>
          </ul>
        </div>
        <div>
          <p class="footer__col-title">Gym</p>
          <ul class="footer__links" role="list">
            <li><a href="/coaches/">Coaches</a></li>
            <li><a href="/schedule">Schedule</a></li>
            <li><a href="/pricing">Pricing</a></li>
            <li><a href="/areas/">Areas we serve</a></li>
          </ul>
        </div>
        <div>
          <p class="footer__col-title">Labyrinth</p>
          <ul class="footer__links" role="list">
            <li><a href="{PARENT_URL}">labyrinth.vision</a></li>
            <li><a href="/contact#free-class">Free first class</a></li>
            <li><a href="/privacy-policy">Privacy Policy</a></li>
          </ul>
        </div>
      </div>
      <div class="footer__bottom">
        <p class="footer__copy">&copy; {S.year} {LEGAL_NAME}. All rights reserved.</p>
        <div class="footer__legal-links">
          <a href="/privacy-policy" class="active">Privacy Policy</a>
          <a href="/contact#free-class">Free First Class</a>
        </div>
      </div>
    </div>
  </footer>

  """
    a = src.index("<!-- FOOTER -->")
    b = src.index("<script>", a)
    src = src[:a] + new_footer + src[b:]
    if "Fulshear" in src and "6615" in src:
        raise SystemExit("the Fulshear address survived in the Wharton privacy policy")
    return src


NOT_FOUND = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Page Not Found | Labyrinth BJJ Wharton</title>
<meta name="robots" content="noindex">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon.png">
<link rel="stylesheet" href="%(font)s">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'General Sans', -apple-system, BlinkMacSystemFont, sans-serif;
    background: #0A0A0A; color: #E8E8E8; min-height: 100vh; min-height: 100dvh;
    display: flex; align-items: center; justify-content: center; text-align: center; padding: 24px;
  }
  .container { max-width: 480px; }
  .code {
    font-family: 'Clash Display', sans-serif; font-size: 6rem; font-weight: 700;
    background: linear-gradient(135deg, #D4A843, #F0D68A);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
    line-height: 1; margin-bottom: 16px;
  }
  h1 { font-family: 'Clash Display', sans-serif; font-size: 1.5rem; font-weight: 600; margin-bottom: 12px; color: #fff; }
  p { color: #999; font-size: 1rem; line-height: 1.6; margin-bottom: 32px; }
  .links { display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; }
  a {
    display: inline-block; padding: 12px 28px; border-radius: 6px; font-size: 0.9rem; font-weight: 600;
    text-decoration: none; transition: transform 0.2s, box-shadow 0.2s;
  }
  a:hover { transform: translateY(-2px); }
  .btn-primary { background: linear-gradient(135deg, #D4A843, #F0D68A); color: #0A0A0A; }
  .btn-secondary { border: 1px solid #333; color: #D4A843; background: transparent; }
  .btn-secondary:hover { border-color: #D4A843; }
</style>
</head>
<body>
  <main class="container">
    <div class="code" aria-hidden="true">404</div>
    <h1>Lost in the Labyrinth</h1>
    <p>The page you are looking for does not exist or has moved. Let's get you back on the mat.</p>
    <div class="links">
      <a href="/" class="btn-primary">Back to Home</a>
      <a href="/contact#free-class" class="btn-secondary">Free First Class</a>
    </div>
  </main>
</body>
</html>
""" % {"font": FONT_URL}


# ── Files that are not pages ─────────────────────────────────────────────────

def robots_txt(S):
    if not S.live:
        return ("# Labyrinth BJJ Wharton. Robots.txt\n"
                "# Coming soon: this site asks to be left alone until wharton-site/site.config.json sets \"live\": true\n"
                "# and scripts/build_wharton.py is re-run.\n\n"
                "User-agent: *\nDisallow: /\n")
    return f"""# Labyrinth BJJ Wharton. Robots.txt
# {S.url}

User-agent: *
Allow: /
Disallow: /api/

# Sitemap
Sitemap: {S.url}/sitemap.xml

# The assistants people now ask "where can my kid do jiu jitsu near Wharton" are
# named explicitly, as on labyrinth.vision, rather than left to the wildcard.
User-agent: GPTBot
User-agent: OAI-SearchBot
User-agent: ChatGPT-User
User-agent: ClaudeBot
User-agent: Claude-User
User-agent: Claude-SearchBot
User-agent: PerplexityBot
User-agent: Perplexity-User
User-agent: Google-Extended
User-agent: Applebot-Extended
User-agent: Bingbot
Allow: /
# Repeated, not inherited: a crawler that matches a named group ignores the wildcard one.
Disallow: /api/
"""


def sitemap_xml(S, pages):
    """None (file omitted) when not live: there is nothing indexable to list."""
    if not S.live:
        return None
    rows = []
    for p in pages:
        if not p.in_sitemap:
            continue
        rows.append("  <url>\n    <loc>%s</loc>\n    <lastmod>%s</lastmod>\n    <changefreq>%s</changefreq>\n    <priority>%s</priority>\n  </url>"
                    % (S.abs(p.route), S.lastmod, p.changefreq, p.priority))
    return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n%s\n</urlset>\n' % "\n".join(rows)


def headers_file(S):
    lines = ["/*",
             "  Strict-Transport-Security: max-age=31536000; includeSubDomains",
             "  X-Content-Type-Options: nosniff",
             "  X-Frame-Options: SAMEORIGIN",
             "  Referrer-Policy: strict-origin-when-cross-origin",
             "  Permissions-Policy: camera=(), microphone=(), geolocation=()"]
    if not S.live:
        lines.append("  X-Robots-Tag: noindex, nofollow")
    return "\n".join(lines) + """

# Cache-Control is deliberately not set here, for the reason given in the main
# site's _headers: Pages applies it unpredictably. The CSS and JS are requested
# with ?v=<hash> (scripts/build_wharton.py), so a changed file is a changed URL.
#
# While the site is coming soon (site.config.json "live": false) every response
# also carries X-Robots-Tag: noindex, nofollow, in addition to the robots meta
# tag on each page and robots.txt. Setting live to true and rebuilding removes it.
"""


def redirects_file(S):
    return """# Cloudflare Pages redirects for wharton.labyrinth.vision.
#
# Common guesses at URLs this site does not have, so a mistyped or remembered
# address lands somewhere useful instead of on the 404 page.
/classes              /programs/                  301
/class-schedule       /schedule                   301
/classes-schedule     /schedule                   301
/plans                /pricing                    301
/plans-and-pricing    /pricing                    301
/instructors          /coaches/                   301
/coach                /coaches/                   301
/joe                  /coaches/joe-herrera        301
/adult-bjj            /programs/adult-bjj-wharton 301
/kids-bjj             /programs/kids-bjj-wharton  301
/adults               /programs/adult-bjj-wharton 301
/kids                 /programs/kids-bjj-wharton  301
/contact-us           /contact                    301
/free-trial           /contact#free-class         301
/trial                /contact#free-class         301
/free-class           /contact#free-class         301
/locations            /areas/                     301
/location             /contact                    301
/faq                  /#faq                       301
/privacy              /privacy-policy             301
"""


def llms_txt(S):
    j = jits_data
    if not S.live:
        return f"""# Labyrinth BJJ Wharton

> A Labyrinth Brazilian jiu-jitsu gym coming soon to Wharton, Texas. It is not open yet. The street address, class schedule, opening date, hours and prices have NOT been announced; please do not guess them. Lead instructor: Joe Herrera, a brown belt under Prof. Anthony Curry.

This file follows the llms.txt convention (https://llmstxt.org). While the site is in coming-soon mode it is deliberately short: it states only what is settled. If this file and a page ever disagree, the page is right.

## The essentials

- **Status**: coming soon, not yet open
- **Programs**: Brazilian jiu-jitsu for adults, and for kids and teens
- **First class**: free
- **Lead instructor**: Joe Herrera, brown belt under Prof. Anthony Curry (owner and head instructor of Labyrinth BJJ)
- **Phone**: {S.phone}
- **Email**: {S.email}
- **Not announced yet**: street address, class schedule, opening date, hours, prices

## Pages

- [Home]({S.url}/)
- [Programs]({S.url}/programs/)
- [Coaches]({S.url}/coaches/)
- [Contact and free first class]({S.url}/contact)

## Part of Labyrinth BJJ

Labyrinth BJJ was founded in 2021 by Prof. Anthony Curry and is ranked in the top {j.NATIONAL_TOP_PCT}% of academies nationally on jits.gg (#{j.NATIONAL_RANK} of {j.NATIONAL_OF:,} as of {j.AS_OF}). Those results belong to the whole Labyrinth team, not to the Wharton gym. Main site: {PARENT_URL}
"""
    out = [f"# {SITE_NAME}", "",
           f"> Brazilian jiu-jitsu gym in Wharton, Texas, part of Labyrinth BJJ. Adults, kids and teens. Lead instructor: Joe Herrera, a brown belt under Prof. Anthony Curry. The first class is free.", "",
           "This file follows the llms.txt convention (https://llmstxt.org). Every fact here is also on the pages linked beneath it; if the two ever disagree, the page is right and this file is stale.", "",
           "## The essentials", ""]
    if S.has_address:
        out.append("- **Address**: " + S.address_oneline())
    op = opening_line(S)
    if op:
        out.append("- **Opening**: " + op)
    out += [f"- **Phone**: {S.phone}", f"- **Email**: {S.email}", "- **First class**: free",
            "- **Programs**: Brazilian jiu-jitsu for adults, and for kids and teens",
            "- **Lead instructor**: Joe Herrera, brown belt under Prof. Anthony Curry"]
    if S.map_url:
        out.append("- **Map**: " + S.map_url)
    if S.hours:
        out += ["", "## Hours", ""]
        out += ["- %s: %s to %s" % (day_span(h["days"]), fmt_time(h["opens"]), fmt_time(h["closes"])) for h in S.hours]
    if S.schedule:
        out += ["", "## Class schedule", ""]
        for r in S.schedule:
            t = fmt_time(r["start"]) + ((" to " + fmt_time(r["end"])) if r["end"] else "")
            out.append("- %s %s: %s%s%s" % (r["day"], t, r["class"], (" (%s)" % r["type"]) if r["type"] else "",
                                            (", " + r["note"]) if r["note"] else ""))
    if S.pricing:
        out += ["", "## Pricing", ""]
        for p in S.pricing:
            out.append("- %s: %s%s%s" % (p["name"], money(p["price"]), period_label(p["period"]), (". " + p["note"]) if p["note"] else ""))
    out += ["", "## Pages", "",
            f"- [Programs]({S.url}/programs/)", f"- [Schedule]({S.url}/schedule)", f"- [Pricing]({S.url}/pricing)",
            f"- [Coaches]({S.url}/coaches/)", f"- [Contact and free first class]({S.url}/contact)",
            f"- [Areas served]({S.url}/areas/): El Campo, East Bernard, Boling, Hungerford, Louise",
            "", "## Part of Labyrinth BJJ", "",
            f"Labyrinth BJJ was founded in 2021 by Prof. Anthony Curry and is ranked in the top {j.NATIONAL_TOP_PCT}% of academies nationally on jits.gg (#{j.NATIONAL_RANK} of {j.NATIONAL_OF:,} as of {j.AS_OF}). Those results belong to the whole Labyrinth team, not to the Wharton gym. Main site: {PARENT_URL}", ""]
    return "\n".join(out)


# ── Build ────────────────────────────────────────────────────────────────────

def all_pages(S):
    pages = [page_home(S), page_programs_hub(S), page_adult(S), page_kids(S), page_coaches(S), page_joe(S),
             page_schedule(S), page_pricing(S), page_contact(S), page_areas_hub(S)]
    pages += [page_area(S, a) for a in AREAS]
    return pages


def build(cfg, outdir, quiet=False):
    S = Site(cfg)
    pages = all_pages(S)
    # The privacy policy is raw text, wrapped in a Page only so the sitemap logic can see it.
    written = []
    for p in pages:
        emit(S, p, outdir, written)
    def put(rel, text):
        path = os.path.join(outdir, rel)
        os.makedirs(os.path.dirname(path) or outdir, exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            f.write(text)
        written.append(rel)
    put("privacy-policy.html", page_privacy(S))
    put("404.html", NOT_FOUND)
    put("robots.txt", robots_txt(S))
    put("llms.txt", llms_txt(S))
    put("_headers", headers_file(S))
    put("_redirects", redirects_file(S))
    sm = sitemap_xml(S, pages)
    smpath = os.path.join(outdir, "sitemap.xml")
    if sm is None:
        if os.path.exists(smpath):
            os.remove(smpath)
    else:
        put("sitemap.xml", sm)
    if not quiet:
        print("%s: wrote %d files to %s" % ("LIVE" if S.live else "coming soon (noindex)", len(written), outdir))
        for w in S.check():
            print("  warning: " + w)
    return S, pages


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--out", default=SRC, help="directory to write into (default wharton-site/)")
    ap.add_argument("--config", default=DEFAULT_CONFIG, help="config JSON (default wharton-site/site.config.json)")
    ap.add_argument("--live", choices=("true", "false"), help="override the config's live flag for this build only")
    ap.add_argument("--strict", action="store_true", help="exit 1 if live is true and a TBD field is still empty")
    args = ap.parse_args(argv)
    with open(args.config, encoding="utf-8") as f:
        cfg = json.load(f)
    if args.live:
        cfg["live"] = args.live == "true"
    S, _ = build(cfg, args.out)
    if args.strict and S.check():
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
