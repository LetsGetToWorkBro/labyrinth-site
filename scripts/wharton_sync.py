#!/usr/bin/env python3
"""Copy the main site's design system and images into wharton-site/.

    python3 scripts/wharton_sync.py

wharton-site/ is deployed as its own Cloudflare Pages project with that folder
as its root, so it cannot reach ../style.css or ../assets. Nothing is hotlinked
across projects: everything the Wharton pages use is copied in here, and the
copy is committed.

What is copied:

  base.css, style.css, programs.css   the main site's stylesheets, with the
                                      promotional blocks removed (see PRUNE)
  favicon.* and apple-touch-icon.png  the same marks as the main site
  assets/<name>.jpg + .webp           only the photographs and logos the Wharton
                                      pages use (see ASSETS)

What is deliberately NOT copied: the coach portraits other than Prof. Anthony
Curry's (those people do not teach at Wharton and must not appear as if they
did), the Halloween and Pink October / HYROX stylesheets and artwork, the
videos, and anything to do with the live stream, the member portal or
pre-orders.

wharton.css (the Wharton-only components) and app.js are written by hand and
are never touched by this script.

Run it again when the main site's design system changes and the Wharton site
should follow. It overwrites base.css, style.css and programs.css, so do not
hand-edit those three: put Wharton-only rules in wharton.css instead.
"""
import os
import re
import shutil
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "wharton-site")

# Photographs and logos. Each name is copied as .jpg and .webp when both exist.
ASSETS = [
    "hero-team",         # the Labyrinth team at a tournament (home hero)
    "community-real",    # team group photo
    "kids-gi", "kids-nogi", "kids-podium",
    "adult-gi", "adult-nogi",
    "gallery-2", "gallery-4", "gallery-8",
    "coach-tony",        # Prof. Anthony Curry, owner and head instructor
    "logo-maze", "logo-kanji-full", "logo-maze-480",
]
EXTRA_ASSETS = ["logo-maze-transparent.png"]
ROOT_FILES = ["favicon.ico", "favicon.png", "favicon.svg", "apple-touch-icon.png", "base.css"]

# Rules whose selectors mention any of these classes are dropped from the
# copied stylesheets. They belong to pages and promotions the Wharton site does
# not have: the Pink October and HYROX blocks, the Ennova resident page, the
# legacy transfer flow, the RSVP form, the Halloween season.
PRUNE = re.compile(
    r"(?:\.|#)(?:event-strip|hero__chip|btn--pink|pink-|ribbon|hx-|ennova|legacy-|rsvp|fund(?:__|\b)|"
    r"cd(?:__|\b)|pick(?:__|-|\b)|offer-card|offer-grid|bolt|season|ss-|halloween|hyrox|awareness|"
    r"sched-pg|hero-split|drop-|stream|portal|preorder|pre-order)"
)


def split_top(css):
    """Yield (prelude, body_or_None, raw) for each top-level construct."""
    i, n = 0, len(css)
    while i < n:
        # comments and whitespace pass through attached to the next rule
        start = i
        while i < n:
            if css.startswith("/*", i):
                j = css.find("*/", i)
                i = n if j < 0 else j + 2
            elif css[i].isspace():
                i += 1
            else:
                break
        lead = css[start:i]
        if i >= n:
            if lead.strip():
                yield lead, None, lead
            return
        j = i
        depth = 0
        in_str = None
        while j < n:
            c = css[j]
            if in_str:
                if c == "\\":
                    j += 1
                elif c == in_str:
                    in_str = None
            elif c in "\"'":
                in_str = c
            elif css.startswith("/*", j):
                k = css.find("*/", j)
                j = n if k < 0 else k + 1
            elif c == "{":
                depth += 1
            elif c == "}":
                depth -= 1
                if depth == 0:
                    j += 1
                    break
            elif c == ";" and depth == 0:
                j += 1
                break
            j += 1
        raw = css[i:j]
        yield lead, raw, raw
        i = j


def selectors_split(sel):
    out, depth, cur, in_str = [], 0, "", None
    for c in sel:
        if in_str:
            cur += c
            if c == in_str:
                in_str = None
            continue
        if c in "\"'":
            in_str = c
        elif c in "([":
            depth += 1
        elif c in ")]":
            depth -= 1
        if c == "," and depth == 0:
            out.append(cur)
            cur = ""
        else:
            cur += c
    out.append(cur)
    return out


def prune(css):
    out = []
    for lead, raw, _ in split_top(css):
        if raw is None:
            continue
        if "{" not in raw:
            out.append(lead + raw)
            continue
        brace = raw.index("{")
        prelude, body = raw[:brace], raw[brace + 1:raw.rindex("}")]
        p = prelude.strip()
        if p.startswith("@media") or p.startswith("@supports"):
            inner = prune(body)
            if inner.strip():
                out.append(lead + prelude + "{" + inner + "\n}")
            continue
        if p.startswith("@keyframes") or p.startswith("@font-face") or p.startswith("@"):
            if PRUNE.search(p):
                continue
            out.append(lead + raw)
            continue
        sels = [s for s in selectors_split(prelude) if s.strip()]
        keep = [s for s in sels if not PRUNE.search(s)]
        if not keep:
            continue
        if len(keep) == len(sels):
            out.append(lead + raw)
        else:
            out.append(lead + ",\n".join(s.strip() for s in keep) + " {" + body + "}")
    return "".join(out)


def main():
    os.makedirs(os.path.join(OUT, "assets"), exist_ok=True)
    for f in ROOT_FILES:
        shutil.copy2(os.path.join(ROOT, f), os.path.join(OUT, f))
    for name in ASSETS:
        for ext in (".jpg", ".webp", ".png"):
            src = os.path.join(ROOT, "assets", name + ext)
            if os.path.exists(src):
                shutil.copy2(src, os.path.join(OUT, "assets", name + ext))
    for f in EXTRA_ASSETS:
        shutil.copy2(os.path.join(ROOT, "assets", f), os.path.join(OUT, "assets", f))
    for css in ("style.css", "programs.css"):
        src = open(os.path.join(ROOT, css), encoding="utf-8").read()
        out = prune(src)
        header = ("/* Copied from the main site by scripts/wharton_sync.py and pruned of the promotional\n"
                  "   blocks the Wharton site does not carry. Do not hand-edit: Wharton-only rules\n"
                  "   belong in wharton.css. */\n")
        open(os.path.join(OUT, css), "w", encoding="utf-8").write(header + out)
        print("%s: %d -> %d bytes" % (css, len(src), len(out)))
    print("copied %d asset stems" % len(ASSETS))


if __name__ == "__main__":
    sys.exit(main())
