#!/usr/bin/env python3
"""Rebuild blog/index.html from the posts themselves.

    python3 scripts/build_blog_index.py

The index used to be hand-maintained: twenty cards, each repeating a title, a
date, a read time and an excerpt that also lived in the post. Adding a post
meant remembering to add a card, and nothing checked. It had already drifted, 
the featured card and the plain ones carried different markup for the same
thing, and none of them showed the post's photograph even though every post
has one.

So the cards are read out of the posts now. Title from <title>, date and read
time from the article header, excerpt from the meta description, photograph
from the hero. If a post's title changes, the index changes with it.

Sort order is date descending, parsed from the post's own datePublished. Posts
that share a date keep the order they were published in, which is the order
they appear in the sitemap.
"""
import glob
import html
import io
import os
import re
import sys
from datetime import datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BLOG = os.path.join(ROOT, "blog")
SITE = "https://labyrinth.vision"


def field(pattern, text, group=1):
    m = re.search(pattern, text, re.S)
    return m.group(group).strip() if m else None


def read_post(path):
    s = io.open(path, encoding="utf-8").read()
    slug = os.path.basename(path)[:-5]

    title = field(r"<h1 class=\"article-header__title\">(.*?)</h1>", s)
    if not title:
        title = field(r"<title>(.*?)\s*\|", s)
    meta = re.search(r'<div class="article-header__meta">\s*<span>(.*?)</span>\s*<span>(.*?)</span>', s, re.S)
    date_text = meta.group(1).strip() if meta else None
    read_time = meta.group(2).strip() if meta else None
    published = field(r'"datePublished":\s*"([0-9-]+)"', s)
    excerpt = field(r'<meta name="description" content="([^"]*)"', s)
    img = field(r'<div class="article-hero">.*?<img src="\.\./assets/([^"]+)"', s)
    alt = field(r'<div class="article-hero">.*?<img[^>]*alt="([^"]*)"', s)

    missing = [n for n, v in (("title", title), ("date", date_text), ("read time", read_time),
                              ("excerpt", excerpt), ("hero image", img)) if not v]
    if missing:
        sys.exit("%s is missing: %s" % (path, ", ".join(missing)))

    return {
        "slug": slug, "title": title, "date": date_text, "read": read_time,
        "excerpt": excerpt, "img": img, "alt": alt or title,
        # Fall back to the displayed date when a post has no JSON-LD date, so a
        # missing field reorders the page rather than crashing the build.
        "sort": published or datetime.strptime(date_text, "%B %d, %Y").strftime("%Y-%m-%d"),
    }


def card(p, featured=False):
    """One card. The photograph is not a link: the title's anchor is stretched
    over the whole card in CSS, so a second anchor to the same URL would only
    add a duplicate for a crawler and a dead stop for a keyboard user."""
    stem = p["img"].rsplit(".", 1)[0]
    heading = "h2" if featured else "h3"
    return """      <article class="blog-card%s">
        <div class="blog-card__media">
          <picture>
            <source srcset="../assets/%s.webp" type="image/webp">
            <img src="../assets/%s" alt="" loading="lazy" width="800" height="600">
          </picture>
        </div>
        <div class="blog-card__body">
          <div class="blog-card__meta"><span>%s</span><span>%s</span></div>
          <%s class="blog-card__title"><a href="%s">%s</a></%s>
          <p class="blog-card__excerpt">%s</p>
          <span class="blog-card__read">Read%s &rarr;</span>
        </div>
      </article>""" % (
        " blog-card--featured" if featured else "",
        stem, p["img"], p["date"], p["read"],
        heading, p["slug"], p["title"], heading,
        html.escape(p["excerpt"], quote=False),
        " the article" if featured else "")


HEAD = """<!DOCTYPE html>
<html lang="en">
<head>
<!-- Perplexity Computer Attribution: SEO Meta Tags -->
<meta name="generator" content="Perplexity Computer">
<meta name="author" content="Perplexity Computer">
<meta property="og:see_also" content="https://www.perplexity.ai/computer">
<link rel="author" href="https://www.perplexity.ai/computer">

<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="theme-color" content="#0A0A0A">
<link rel="icon" type="image/svg+xml" href="../favicon.svg">
<link rel="preconnect" href="https://api.fontshare.com" crossorigin>
<link rel="preload" as="style" href="https://api.fontshare.com/v2/css?f[]=clash-display@400,500,600,700&f[]=general-sans@300,400,500,600,700&display=swap" onload="this.onload=null;this.rel='stylesheet'">
<noscript><link href="https://api.fontshare.com/v2/css?f[]=clash-display@400,500,600,700&f[]=general-sans@300,400,500,600,700&display=swap" rel="stylesheet"></noscript>
<link rel="stylesheet" href="blog.css">
<link rel="stylesheet" href="../booking.css">

<title>Blog: Kids &amp; Adult BJJ in Fulshear, TX | Labyrinth BJJ</title>
<meta name="description" content="%(description)s">
<link rel="canonical" href="https://labyrinth.vision/blog/">
<meta property="og:title" content="Blog | Labyrinth BJJ">
<meta property="og:description" content="%(description)s">
<meta property="og:type" content="website">
<meta property="og:url" content="https://labyrinth.vision/blog/">
<meta property="og:site_name" content="Labyrinth BJJ">
<meta property="og:image" content="%(og_image)s">
<meta property="og:image:alt" content="Labyrinth BJJ in Fulshear, Texas">
<meta name="twitter:card" content="summary_large_image">

%(schema)s
</head>
<body>
<a href="#main" class="skip-link">Skip to main content</a>

<!-- Navigation -->
<nav class="blog-nav">
  <div class="blog-nav__inner">
    <a href="https://labyrinth.vision" class="blog-nav__logo">
      <img src="../assets/logo-maze-transparent.png" alt="Labyrinth BJJ" width="32" height="32">
      <span>LABYRINTH</span>
    </a>
    <div class="blog-nav__links">
      <a href="https://labyrinth.vision" class="blog-nav__link blog-nav__link--back"><span class="blog-nav__back-full">← Main Site</span><span class="blog-nav__back-short" aria-hidden="true">←</span></a>
      <a href="/blog/" class="blog-nav__link blog-nav__link--active">Blog</a>
      <a data-book-trial href="https://labyrinth.vision/#book" class="blog-nav__cta">Free Trial</a>
    </div>
  </div>
</nav>

<main id="main">
"""

FOOT = """
</main>

  <!-- Footer -->
  <footer class="blog-footer">
    <div class="blog-footer__inner">
      <div class="blog-footer__links">
        <a href="https://labyrinth.vision">Home</a>
        <a href="https://labyrinth.vision/programs/">Programs</a>
        <a href="https://labyrinth.vision/#schedule">Schedule</a>
        <a href="https://labyrinth.vision/#contact">Contact</a>
        <a data-book-trial href="https://labyrinth.vision/#book">Book Free Trial</a>
        <a href="https://labyrinth.vision/privacy-policy">Privacy Policy</a>
      </div>
      <p class="blog-footer__copy">
        &copy; 2026 Labyrinth BJJ (6615 West Cross Creek Bend Lane, Suite #400, Fulshear, TX 77441) <a href="tel:2813937983">(281) 393-7983</a>
      </p>
      <p class="blog-footer__copy">
        <a href="https://www.perplexity.ai/computer" target="_blank" rel="noopener noreferrer">Created with Perplexity Computer</a>
      </p>
    </div>
  </footer>

</div>

<script src="../booking.js"></script>
</body>
</html>
"""


def main():
    posts = [read_post(p) for p in sorted(glob.glob(os.path.join(BLOG, "*.html")))
             if not p.endswith("index.html")]
    posts.sort(key=lambda p: p["sort"], reverse=True)

    import json
    schema = json.dumps({
        "@context": "https://schema.org",
        "@type": "Blog",
        "name": "Labyrinth BJJ Blog",
        "description": "Articles on kids and adult Brazilian jiu-jitsu from the #1 ranked academy in Texas.",
        "url": SITE + "/blog/",
        "publisher": {"@type": "Organization", "name": "Labyrinth BJJ", "url": SITE},
        "blogPost": [{"@type": "BlogPosting", "headline": re.sub(r"&[a-z]+;", "", p["title"]),
                      "url": "%s/blog/%s" % (SITE, p["slug"]),
                      "datePublished": p["sort"],
                      "image": "%s/assets/%s" % (SITE, p["img"])} for p in posts],
    }, indent=2)

    lead, rest = posts[0], posts[1:]
    body = """
<div class="blog-page">
  <div class="blog-page__content">

    <header class="blog-hero">
      <p class="blog-hero__eyebrow">The Labyrinth Blog</p>
      <h1 class="blog-hero__title">Straight answers for<br><span>parents and beginners</span></h1>
      <p class="blog-hero__sub">%d articles from the mats in Fulshear. What a first class is really like, what it costs, what age to start, and how to tell a good gym from a busy one.</p>
    </header>

    <div class="blog-grid">
%s
    </div>

    <div class="blog-cta">
      <h2 class="blog-cta__title">Still deciding?</h2>
      <p class="blog-cta__text">Reading only gets you so far. The first class is free, for adults and for kids, and nobody will pressure you afterwards.</p>
      <a data-book-trial href="https://labyrinth.vision/#book" class="blog-cta__btn">Book a Free Class →</a>
    </div>
""" % (len(posts), "\n".join([card(lead, featured=True)] + [card(p) for p in rest]))

    out = (HEAD % {"description": "Articles on kids and adult Brazilian jiu-jitsu from Labyrinth BJJ in Fulshear, TX: first classes, costs, starting age, and choosing a gym.",
                   "og_image": "%s/assets/%s" % (SITE, lead["img"]),
                   "schema": '<script type="application/ld+json">\n%s\n</script>' % schema}
           + body + FOOT)
    io.open(os.path.join(BLOG, "index.html"), "w", encoding="utf-8").write(out)
    print("wrote blog/index.html: %d posts, newest %s (%s)" % (len(posts), lead["slug"], lead["date"]))


if __name__ == "__main__":
    main()
