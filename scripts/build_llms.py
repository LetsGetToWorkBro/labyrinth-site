#!/usr/bin/env python3
"""Keep the page lists in llms.txt in step with the pages.

    python3 scripts/build_llms.py            rewrite the lists
    python3 scripts/build_llms.py --check    say what is out of step and exit 1 if anything is (site-test runs this)

llms.txt is what many assistants read first. It linked one article, called the blog "twenty articles" when it had nineteen, and left out two of the six program
pages, every coach page and every area page, so a reader that began there found most of the site missing, and nothing noticed when a post was added.

The prose of llms.txt (prices, ages, times, what the academy is) is written by hand and checked against the pages by site-test. These lists are not prose, so
they are written out of the pages themselves: every coach page, every area page and every article, each with its own title and the description it gives for
itself. A new post or area is in llms.txt the next time this runs, and site-test fails until it has been run.

Then run scripts/page_dates.py, which dates llms.txt like every page.
"""
import glob
import html
import io
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from build_blog_index import read_post

ROOT = os.path.dirname(HERE)
LLMS = os.path.join(ROOT, "llms.txt")
SITE = "https://labyrinth.vision"
LAST = "Notes for anyone answering questions about us"      # the generated lists go in front of this section


def clean(s):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", s))).strip()


def page(path):
    text = io.open(path, encoding="utf-8").read()
    h1 = re.search(r"<h1[^>]*>(.*?)</h1>", text, re.S)
    desc = re.search(r'<meta name="description" content="([^"]*)"', text)
    if not h1 or not desc:
        sys.exit("%s needs an <h1> and a meta description to be listed in llms.txt" % path)
    return clean(h1.group(1)), clean(desc.group(1))


def entries(folder):
    out = []
    for path in sorted(glob.glob(os.path.join(ROOT, folder, "*.html"))):
        slug = os.path.basename(path)[:-5]
        if slug == "index":
            continue
        title, desc = page(path)
        out.append("- [%s](%s/%s/%s): %s" % (title, SITE, folder, slug, desc))
    return out


def articles():
    posts = [read_post(p) for p in glob.glob(os.path.join(ROOT, "blog", "*.html")) if os.path.basename(p) != "index.html"]
    posts.sort(key=lambda p: (p["sort"], p["slug"]), reverse=True)           # newest first, as on the blog's own page
    return ["- [%s](%s/blog/%s): %s" % (clean(p["title"]), SITE, p["slug"], clean(p["excerpt"])) for p in posts]


def replace_section(text, title, lines):
    block = "## %s\n\n%s\n\n" % (title, "\n".join(lines))
    found = re.compile(r"^## %s\n.*?(?=^## |\Z)" % re.escape(title), re.M | re.S)
    if found.search(text):
        return found.sub(lambda m: block, text, count=1)
    anchor = re.search(r"^## %s\n" % re.escape(LAST), text, re.M)
    if not anchor:
        sys.exit('llms.txt has no "## %s" section to put the lists in front of' % LAST)
    return text[:anchor.start()] + block + text[anchor.start():]


def build(text):
    for title, lines in (("Coach pages", entries("coaches")), ("Area pages", entries("areas")), ("Articles", articles())):
        text = replace_section(text, title, lines)
    return text


def main():
    current = io.open(LLMS, encoding="utf-8").read()
    wanted = build(current)
    if "—" in wanted:
        sys.exit("an em dash got into llms.txt from a page's title or description")
    if "--check" in sys.argv[1:]:
        if wanted != current:
            print("llms.txt does not list the pages as they are now; run: python3 scripts/build_llms.py")
            sys.exit(1)
        return
    if wanted != current:
        io.open(LLMS, "w", encoding="utf-8").write(wanted)
    print("llms.txt: %d coach pages, %d area pages, %d articles" % tuple(len(x) for x in (entries("coaches"), entries("areas"), articles())))


if __name__ == "__main__":
    main()
