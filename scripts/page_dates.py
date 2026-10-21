#!/usr/bin/env python3
"""The date each page last changed, decided by what is in the page.

    python3 scripts/page_dates.py                  every page that has changed gets today's date
    python3 scripts/page_dates.py --check          list whatever is out of step, exit 1 if anything is (site-test runs this)
    python3 scripts/page_dates.py --touch pricing.html schedule.html
                                                   "I checked it and it is still right": move those dates to today
    python3 scripts/page_dates.py --date 2027-07-01
                                                   use that day instead of today (the move kit does)

Why. sitemap.xml named a lastmod for every page, typed by hand, and most of them
had not moved since July and August while the pages kept changing. Google keeps
a record of whether a site's lastmod dates can be believed, and a site whose
dates are wrong loses the use of all of them. And the two pages that state our
prices and our timetable said nothing about when they were last right, which is
the first thing a person asks of a price and the first thing an assistant
weighs when two pages disagree.

How. page_dates.json holds, for every page in the sitemap and for llms.txt, a
fingerprint of what is in the page and the day that fingerprint first appeared.
Run this after changing pages and each page whose fingerprint moved gets
today's date. sitemap.xml and the "Last updated" lines (on /pricing, /schedule
and in llms.txt) are then written from that one file, so a page has one date
and nobody types it. It does not ask git: the repository is cloned shallow in
places, and a date that depends on how much history was fetched depends on who
is looking.

What counts as a change is what a reader or a crawler takes from the page: the
words, where the links go, what the pictures are said to show, the description
and the structured data (see readable()). A new ?v= stamp on a stylesheet
(scripts/stamp_assets.py), a reworked class name, an edited script or comment,
and the "Last updated" line itself, which would otherwise make every refresh a
change to the thing it measures, do not count.

Days are Central time, because the academy is in Texas and a page must not be
dated tomorrow at seven in the evening.
"""
import argparse
import datetime
import hashlib
import html
import json
import os
import re
import sys
from zoneinfo import ZoneInfo

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATE = os.path.join(ROOT, "scripts", "page_dates.json")
SITEMAP = os.path.join(ROOT, "sitemap.xml")
SITE = "https://labyrinth.vision"
# Not in the sitemap, but read by every assistant that comes to the site.
EXTRA = ["llms.txt"]

STAMP = re.compile(r"\?v=[0-9a-f]{8}")
SHOWN_HTML = re.compile(r"<!-- updated -->.*?<!-- /updated -->", re.S)
SHOWN_TEXT = re.compile(r"^Last updated: .*$", re.M)
ENTRY = re.compile(r"(<loc>(%s[^<]*)</loc>\s*<lastmod>)([^<]*)(</lastmod>)" % re.escape(SITE))


def today():
    return datetime.datetime.now(ZoneInfo("America/Chicago")).date().isoformat()


def pretty(iso):
    d = datetime.date.fromisoformat(iso)
    return "%s %d, %d" % (d.strftime("%B"), d.day, d.year)


def shown_html(iso):
    """The line a page prints about itself; scripts/build_pages.py puts this under the heading of /pricing and /schedule."""
    return ('<!-- updated --><p class="prog-hero__updated">Last updated <time datetime="%s">%s</time></p><!-- /updated -->'
            % (iso, pretty(iso)))


def shown_text(iso):
    return "Last updated: " + pretty(iso)


def page_file(loc):
    path = loc[len(SITE):]
    if path in ("", "/"):
        return "index.html"
    if path.endswith("/"):
        return path.lstrip("/") + "index.html"
    return path.lstrip("/") + ".html"


def tracked():
    with open(SITEMAP, encoding="utf-8") as fh:
        locs = [m.group(2) for m in ENTRY.finditer(fh.read())]
    return sorted({page_file(loc) for loc in locs} | {f for f in EXTRA if os.path.exists(os.path.join(ROOT, f))})


def readable(rel, text):
    """What a reader or a crawler takes from a page: the words, where the links go, what the pictures are said to show,
    the description and the structured data. Not the markup around them, scripts, styles or comments."""
    if not rel.endswith(".html"):
        return re.sub(r"\s+", " ", SHOWN_TEXT.sub("", text))
    text = SHOWN_HTML.sub("", STAMP.sub("", text))
    parts = [re.findall(r'<script type="application/ld\+json">(.*?)</script>', text, re.S),
             re.findall(r'<meta name="description" content="([^"]*)"', text),
             re.findall(r'\balt="([^"]*)"', text),
             re.findall(r'\bhref="([^"]*)"', text)]
    body = re.sub(r"<(script|style)\b.*?</\1>|<!--.*?-->", " ", text, flags=re.S | re.I)
    body = html.unescape(re.sub(r"<[^>]+>", " ", body))
    return re.sub(r"\s+", " ", " ".join([body] + [x for group in parts for x in group]))


def fingerprint_text(rel, text):
    return hashlib.sha256(readable(rel, text).encode("utf-8")).hexdigest()[:16]


def fingerprint(rel):
    with open(os.path.join(ROOT, rel), encoding="utf-8") as fh:
        return fingerprint_text(rel, fh.read())


def load():
    try:
        with open(STATE, encoding="utf-8") as fh:
            return json.load(fh)
    except FileNotFoundError:
        return {}


def save(state):
    # one line a page, so a change to one page is a change to one line
    rows = ['  %s: %s' % (json.dumps(k), json.dumps(state[k], sort_keys=True)) for k in sorted(state)]
    with open(STATE, "w", encoding="utf-8") as fh:
        fh.write("{\n" + ",\n".join(rows) + "\n}\n")


def date_of(rel):
    """The date a page shows. A page nobody has dated yet shows today, which is also the date refresh() will give it."""
    return load().get(rel, {}).get("date") or today()


def write_if_changed(path, new):
    with open(path, encoding="utf-8") as fh:
        if fh.read() == new:
            return False
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(new)
    return True


def write_sitemap(state):
    with open(SITEMAP, encoding="utf-8") as fh:
        text = fh.read()
    text = ENTRY.sub(lambda m: m.group(1) + state[page_file(m.group(2))]["date"] + m.group(4), text)
    write_if_changed(SITEMAP, text)


def write_shown(state):
    for rel, cur in state.items():
        path = os.path.join(ROOT, rel)
        with open(path, encoding="utf-8") as fh:
            text = fh.read()
        if rel.endswith(".html"):
            new = SHOWN_HTML.sub(lambda m: shown_html(cur["date"]), text)
        else:
            new = SHOWN_TEXT.sub(lambda m: shown_text(cur["date"]), text)
        write_if_changed(path, new)


def refresh(day=None, touch=()):
    """Date what has changed, then write sitemap.xml and the printed lines from the result. Returns the pages whose date moved."""
    day = day or today()
    files = tracked()
    unknown = [t for t in touch if t not in files]
    if unknown:
        sys.exit("not a page this file dates: " + ", ".join(unknown))
    state = load()
    moved = []
    for rel in files:
        fp = fingerprint(rel)
        cur = state.get(rel)
        if cur is None or cur["fingerprint"] != fp:
            state[rel] = {"date": day, "fingerprint": fp}
            moved.append(rel)
        elif rel in touch and cur["date"] != day:
            cur["date"] = day
            moved.append(rel)
    for rel in [r for r in state if r not in files]:
        del state[rel]
    save(state)
    write_sitemap(state)
    write_shown(state)
    return moved


def problems():
    out = []
    state = load()
    files = tracked()
    for rel in files:
        cur = state.get(rel)
        if cur is None:
            out.append("%s has no date yet" % rel)
            continue
        try:
            datetime.date.fromisoformat(cur["date"])
        except ValueError:
            out.append("%s: %r is not a date" % (rel, cur["date"]))
        if cur["fingerprint"] != fingerprint(rel):
            out.append("%s has changed since %s" % (rel, cur["date"]))
        path = os.path.join(ROOT, rel)
        with open(path, encoding="utf-8") as fh:
            text = fh.read()
        for found in (SHOWN_HTML if rel.endswith(".html") else SHOWN_TEXT).findall(text):
            want = shown_html(cur["date"]) if rel.endswith(".html") else shown_text(cur["date"])
            if found != want:
                out.append("%s prints %r, not the date it was given (%s)" % (rel, found, cur["date"]))
    for rel in state:
        if rel not in files:
            out.append("%s is dated but is no longer a page in the sitemap" % rel)
    with open(SITEMAP, encoding="utf-8") as fh:
        for m in ENTRY.finditer(fh.read()):
            rel = page_file(m.group(2))
            if rel in state and m.group(3) != state[rel]["date"]:
                out.append("sitemap.xml says %s for %s, not %s" % (m.group(3), m.group(2), state[rel]["date"]))
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--check", action="store_true", help="report what is out of step and change nothing")
    ap.add_argument("--touch", nargs="+", metavar="FILE", help="give these pages today's date although they have not changed")
    ap.add_argument("--date", help="YYYY-MM-DD to use instead of today")
    a = ap.parse_args()
    if a.date:
        datetime.date.fromisoformat(a.date)
    if a.check:
        found = problems()
        for line in found:
            print("page dates: " + line)
        if found:
            print("run: python3 scripts/page_dates.py")
        sys.exit(1 if found else 0)
    moved = refresh(a.date, a.touch or ())
    print("%d page(s) dated %s: %s" % (len(moved), a.date or today(), ", ".join(moved) if moved else "none had changed"))


if __name__ == "__main__":
    main()
