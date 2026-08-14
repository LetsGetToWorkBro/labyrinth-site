#!/usr/bin/env python3
"""
Generate blog posts from the site's own template.

Written as a script rather than twelve hand-copied files so the shell: head,
schema, nav, breadcrumbs, author card, CTA, footer. Is identical everywhere and
cannot drift. Every URL it emits is extensionless, which is the form Cloudflare
Pages actually serves; the .html form 308-redirects and Google files it as
"Page with redirect" and indexes nothing.

Every post loads booking.js, so "Book a Free Trial" opens the booking modal on
the post itself. It used to link to the front page's contact section, which made
a reader who had already decided go and find the button again.

Re-running it overwrites only the posts listed in POSTS. Existing posts are left
alone.
"""
import pathlib, re, json

ROOT = pathlib.Path(__file__).resolve().parent.parent
BLOG = ROOT / 'blog'
DATE = '2026-07-28'

# ── Facts, taken from the academy's own site. Nothing here is invented. ───────
FACTS = dict(
    address='6615 West Cross Creek Bend Lane, Suite #400, Fulshear, TX 77441',
    phone='(281) 393-7983',
    adult_8='$179', adult_12='$189', adult_unlimited='$199',
    family='$399',
)


def page(slug, title, description, og_description, subtitle, read, hero, hero_alt, body, related):
    """One post, in the site's existing shell."""
    url = f'https://labyrinth.vision/blog/{slug}'
    article_ld = {
        "@context": "https://schema.org", "@type": "Article",
        "headline": title, "description": og_description,
        "author": {"@type": "Person", "name": "Anthony Curry", "jobTitle": "Head Instructor & Owner"},
        "publisher": {"@type": "Organization", "name": "Labyrinth BJJ", "url": "https://labyrinth.vision"},
        "datePublished": DATE, "dateModified": DATE,
        "mainEntityOfPage": url,
    }
    crumb_ld = {
        "@context": "https://schema.org", "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Home", "item": "https://labyrinth.vision"},
            {"@type": "ListItem", "position": 2, "name": "Blog", "item": "https://labyrinth.vision/blog/"},
            {"@type": "ListItem", "position": 3, "name": title, "item": url},
        ],
    }
    rel = '\n'.join(
        f'''        <article class="blog-card">
          <div class="blog-card__meta">
            <span>{r["date"]}</span>
            <span>{r["read"]}</span>
          </div>
          <h3 class="blog-card__title">
            <a href="{r["slug"]}">{r["title"]}</a>
          </h3>
          <p class="blog-card__excerpt">{r["excerpt"]}</p>
          <a href="{r["slug"]}" class="blog-card__read">Read →</a>
        </article>''' for r in related)

    return f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="theme-color" content="#0A0A0A">
<link rel="icon" type="image/svg+xml" href="../favicon.svg">
<link rel="preconnect" href="https://api.fontshare.com" crossorigin>
<link rel="preload" as="style" href="https://api.fontshare.com/v2/css?f[]=clash-display@400,500,600,700&f[]=general-sans@300,400,500,600,700&display=swap" onload="this.onload=null;this.rel='stylesheet'">
<noscript><link href="https://api.fontshare.com/v2/css?f[]=clash-display@400,500,600,700&f[]=general-sans@300,400,500,600,700&display=swap" rel="stylesheet"></noscript>
<link rel="stylesheet" href="blog.css">
<link rel="stylesheet" href="../booking.css">

<title>{title} | Labyrinth BJJ</title>
<meta name="description" content="{description}">
<link rel="canonical" href="{url}">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{og_description}">
<meta property="og:type" content="article">
<meta property="og:url" content="{url}">
<meta property="og:site_name" content="Labyrinth BJJ">

<script type="application/ld+json">
{json.dumps(article_ld, indent=2)}
</script>
<script type="application/ld+json">
{json.dumps(crumb_ld, indent=2)}
</script>
</head>
<body>

<div class="scroll-progress" id="scrollProgress"></div>

<!-- Navigation -->
<nav class="blog-nav">
  <div class="blog-nav__inner">
    <a href="https://labyrinth.vision" class="blog-nav__logo">
      <img src="../assets/logo-maze-transparent.png" alt="Labyrinth BJJ" width="32" height="32">
      <span>LABYRINTH</span>
    </a>
    <div class="blog-nav__links">
      <a href="https://labyrinth.vision" class="blog-nav__link">← Main Site</a>
      <a href="/blog/" class="blog-nav__link blog-nav__link--active">Blog</a>
      <a data-book-trial href="https://labyrinth.vision/#book" class="blog-nav__cta">Free Trial</a>
    </div>
  </div>
</nav>

<div class="blog-page">
  <div class="blog-page__content">

    <!-- Breadcrumbs -->
    <nav class="breadcrumbs" aria-label="Breadcrumb">
      <a href="https://labyrinth.vision">Home</a>
      <span class="breadcrumbs__sep">›</span>
      <a href="/blog/">Blog</a>
      <span class="breadcrumbs__sep">›</span>
      <span class="breadcrumbs__current">{title}</span>
    </nav>

    <!-- Article Header -->
    <header class="article-header">
      <div class="article-header__meta">
        <span>July 28, 2026</span>
        <span>{read}</span>
      </div>
      <h1 class="article-header__title">{title}</h1>
      <p class="article-header__subtitle">{subtitle}</p>
    </header>

    <!-- Hero Image -->
    <div class="article-hero">
      <img src="../assets/{hero}" alt="{hero_alt}" loading="lazy" style="width:100%;height:100%;object-fit:cover;border-radius:12px;">
    </div>

    <!-- Article Body -->
    <article class="article-body">
{body}
    </article>

    <!-- CTA -->
    <div class="article-cta">
      <div class="article-cta__box">
        <h3 class="article-cta__title">Come and Try a Class</h3>
        <p class="article-cta__text">Your first class at Labyrinth BJJ is free. No experience needed, nothing to pay, and no commitment. We'll lend you everything you need.</p>
        <a data-book-trial href="https://labyrinth.vision/#book" class="article-cta__btn">Book a Free Trial →</a>
      </div>
    </div>

    <!-- Author Card -->
    <div class="author-card">
      <div class="author-card__inner">
        <div class="author-card__avatar">AC</div>
        <div class="author-card__info">
          <div class="author-card__name">Anthony Curry</div>
          <div class="author-card__title">Head Instructor &amp; Owner · <a href="https://labyrinth.vision">Labyrinth BJJ</a></div>
        </div>
      </div>
    </div>

    <!-- Related Articles -->
    <section class="related">
      <h2 class="related__title">Keep Reading</h2>
      <div class="related__grid">
{rel}
      </div>
    </section>

  </div>

  <!-- Footer -->
  <footer class="blog-footer">
    <div class="blog-footer__inner">
      <div class="blog-footer__links">
        <a href="https://labyrinth.vision">Home</a>
        <a href="https://labyrinth.vision/#programs">Programs</a>
        <a href="https://labyrinth.vision/#schedule">Schedule</a>
        <a data-book-trial href="https://labyrinth.vision/#book">Free Trial</a>
      </div>
      <div class="blog-footer__copy">© 2026 Labyrinth Brazilian Jiu Jitsu · {FACTS["address"]} · {FACTS["phone"]}</div>
    </div>
  </footer>
</div>

<script>
  var p = document.getElementById('scrollProgress');
  if (p) {{
    window.addEventListener('scroll', function () {{
      var h = document.documentElement;
      var pct = h.scrollTop / (h.scrollHeight - h.clientHeight) * 100;
      p.style.width = pct + '%';
    }}, {{ passive: true }});
  }}
</script>

<script src="../booking.js"></script>

</body>
</html>
'''


# ── Build ────────────────────────────────────────────────────────────────────
if __name__ == '__main__':
    import sys
    sys.path.insert(0, str(pathlib.Path(__file__).parent))
    from posts_content import POSTS, CARDS

    def card_for(slug):
        c = CARDS[slug]
        return dict(slug=slug, date='July 28, 2026', read=c['read'],
                    title=c['title'], excerpt=c['excerpt'])

    for post in POSTS:
        html = page(
            slug=post['slug'], title=post['title'], description=post['description'],
            og_description=post['og_description'], subtitle=post['subtitle'],
            read=post['read'], hero=post['hero'], hero_alt=post['hero_alt'],
            body=post['body'], related=[card_for(s) for s in post['related']],
        )
        (BLOG / f"{post['slug']}.html").write_text(html, encoding='utf-8')
        print('wrote blog/%s.html  (%d bytes)' % (post['slug'], len(html)))

    # Structured data in the EXISTING posts still names the .html form, which
    # 308-redirects. The earlier pass only fixed canonical/og:url.
    fixed = 0
    for p in BLOG.glob('*.html'):
        s = p.read_text(encoding='utf-8')
        s2 = re.sub(r'(https://labyrinth\.vision/blog/[a-z0-9-]+)\.html', r'\1', s)
        if s2 != s:
            p.write_text(s2, encoding='utf-8'); fixed += 1
    print('structured-data URLs de-.html-ed in', fixed, 'existing posts')
