#!/usr/bin/env python3
"""Stamp the shared CSS and JS references with a content hash.

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
ASSETS = ["base.css", "style.css", "programs.css", "booking.css", "blog/blog.css",
          "app.js", "booking.js"]

# href="/style.css"  href="./style.css"  href="../booking.css"  href="blog.css"
# with or without a version already on it.
_REF = re.compile(
    r'(?P<attr>\b(?:href|src)=")'
    r'(?P<path>(?:\.{1,2}/)*/?[A-Za-z0-9_\-./]*?(?P<name>[A-Za-z0-9_\-]+\.(?:css|js)))'
    r'(?:\?v=[0-9a-f]+)?'
    r'(?P<close>")'
)


def versions():
    """basename -> short content hash, for the files we stamp."""
    out = {}
    for rel in ASSETS:
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

    return _REF.sub(sub, html)


def main():
    vers = versions()
    changed = []
    for p in sorted(ROOT.rglob("*.html")):
        if "node_modules" in p.parts:
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
