#!/usr/bin/env python3
"""Stamp the shared CSS and JS references, and the few pictures that are replaced in place, with a content hash.

The stylesheets are not fingerprinted: every page asks for /style.css, and that
URL is identical before and after a deploy. Cloudflare Pages serves them with
`cache-control: public, max-age=14400` and serves HTML with `max-age=0,
must-revalidate`, so for four hours after any CSS change a returning visitor
gets the new markup styled by the old stylesheet. That is not a hypothetical:
it is how /ennova reached a phone with its proof steps and pull quote unstyled
while the same URL was correct everywhere else.

Setting Cache-Control in _headers does not fix it. Pages applies the other
headers in that file to /style.css and overrides this one, which was confirmed
against production rather than assumed.

So the URL has to change when the file does. Appending ?v=<hash> makes a new
URL for a new file, and the HTML that names it is revalidated on every visit,
so the pair can never be out of step. Cloudflare caches per full URL including
the query string, so the long max-age keeps working and is now correct.

The same four hours apply to pictures. A photograph replaced under the same file
name is the OLD photograph on a returning visitor's screen until their copy
expires: that is how the new homepage program photos did not show up on the
owner's phone although the live files were correct byte for byte. So the pictures
that get replaced in place are stamped too: the four homepage program photographs
(assets/home-*.jpg and .webp, in <img src> and <source srcset>), the photographs behind
the "this month" cards (assets/strip-*, cut again whenever the crop changes) and the two
icons the head names (favicon.svg and favicon.png), which browsers hold on to even
longer. Every other picture has a name that belongs to it alone, so it is left
alone; add a picture here only if it is ever swapped under the same name.

Idempotent: run it as often as you like. It rewrites whatever version is there,
including none, to the current one. Generators call stamp() on their output so
their committed pages match a fresh build; running this file stamps every
committed page, including the hand-maintained ones.
"""

import hashlib
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent

# The files whose URLs get a version. Anything not listed here is left alone:
# third-party URLs, the font CDN, and per-page assets that are already unique.
ASSETS = ["base.css", "style.css", "season.css", "programs.css", "booking.css", "chat.css", "blog/blog.css",
          "app.js", "booking.js", "chat.js", "schedule.js", "rsvp.js", "fund.js", "goal.js", "hyrox.js",
          "favicon.svg", "favicon.png"]
# Every seasonal theme's two files (season-kit.*, season-columbus.*, season-christmas.* ...) are stamped too, without being listed one by one:
# index.html's <head> names them in quotes inside a script, which the next pattern finds.
SEASON_GLOBS = ("season-*.css", "season-*.js")
# The homepage program photographs and the pictures behind the "this month" cards, which are replaced in place when the photos change (see the paragraph about pictures above).
IMAGE_GLOBS = ("assets/home-*.jpg", "assets/home-*.webp", "assets/strip-*.jpg", "assets/strip-*.webp")

# href="/style.css"  href="./style.css"  href="../booking.css"  href="blog.css"  href="/favicon.svg"  src="./assets/home-adult-gi.jpg"  srcset="./assets/home-adult-gi.webp"
# with or without a version already on it. Pictures that are not listed above match too and are put back exactly as they were (see sub() below).
_REF = re.compile(
    r'(?P<attr>\b(?:href|srcset|src)=")'
    r'(?P<path>(?:\.{1,2}/)*/?[A-Za-z0-9_\-./]*?(?P<name>[A-Za-z0-9_\-]+\.(?:css|js|jpg|webp|svg|png)))'
    r'(?:\?v=[0-9a-f]+)?'
    r'(?P<close>")'
)


# "./season-christmas.css"  './season-kit.js?v=0a1b2c3d'  : a quoted path to a seasonal file, as index.html's loader holds them (not an href= or src= attribute).
_LOADER = re.compile(
    r'(?P<q>["\'])(?P<path>\./(?P<name>season-[A-Za-z0-9_\-]+\.(?:css|js)))'
    r'(?:\?v=[0-9a-f]+)?(?P=q)'
)


def versions():
    """basename -> short content hash, for the files we stamp."""
    out = {}
    names = list(ASSETS)
    for pat in SEASON_GLOBS:
        names.extend(sorted(p.name for p in ROOT.glob(pat)))
    for pat in IMAGE_GLOBS:
        names.extend(sorted(str(p.relative_to(ROOT)) for p in ROOT.glob(pat)))
    for rel in names:
        p = ROOT / rel
        if not p.exists():
            continue
        out[p.name] = hashlib.sha256(p.read_bytes()).hexdigest()[:8]
    return out


def stamp(html, vers=None):
    """Rewrite the shared asset references in one page's markup."""
    vers = versions() if vers is None else vers

    def sub(m):
        v = vers.get(m.group("name"))
        if not v:
            # Not one of ours. Put it back exactly as it was, version and all,
            # so a third-party URL that happens to carry ?v= is not rewritten.
            return m.group(0)
        return "%s%s?v=%s%s" % (m.group("attr"), m.group("path"), v, m.group("close"))

    def sub_loader(m):
        v = vers.get(m.group("name"))
        if not v:
            return m.group(0)
        return "%s%s?v=%s%s" % (m.group("q"), m.group("path"), v, m.group("q"))

    return _LOADER.sub(sub_loader, _REF.sub(sub, html))


def main():
    vers = versions()
    changed = []
    for p in sorted(ROOT.rglob("*.html")):
        # wharton-site/ is a separate Cloudflare Pages project with its own copies
        # of app.js and style.css; scripts/build_wharton.py versions those itself.
        # Stamping them with this site's hashes would point them at the wrong files.
        if "node_modules" in p.parts or "wharton-site" in p.parts:
            continue
        before = p.read_text(encoding="utf-8")
        after = stamp(before, vers)
        if after != before:
            p.write_text(after, encoding="utf-8")
            changed.append(str(p.relative_to(ROOT)))

    print("versions: " + ", ".join("%s=%s" % kv for kv in sorted(vers.items())))
    print("stamped %d file(s)" % len(changed))
    for c in changed:
        print("  " + c)
    return 0


if __name__ == "__main__":
    sys.exit(main())
