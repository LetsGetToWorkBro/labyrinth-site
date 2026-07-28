# labyrinth.vision

The Labyrinth BJJ Academy website. Static HTML, CSS and JavaScript — no build
step, no framework, no dependencies. What is in this repository is exactly what
is served.

Deployed on **Cloudflare Pages**. Bookings land in the CRM at
**crm.labyrinth.vision** ([labyrinth-app](https://github.com/LetsGetToWorkBro/labyrinth-app)).

```
index.html            the whole main site — one page, anchor-linked sections
app.js                all behaviour: nav, schedule, booking popup, forms
style.css  base.css   main site styles
blog/                 13 pages: an index and 12 posts, with blog.css
review/               review landing page
assets/               images (each has a .webp alongside its .jpg)
_headers              security headers for Cloudflare Pages
_redirects            301s for the old site's URLs
sitemap.xml           submitted to Google Search Console
site-test.mjs         link, SEO and booking tests (see below)
```

## Running it locally

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000. One caveat: Cloudflare Pages serves
`/blog/foo` for `blog/foo.html`, and `http.server` does not — so extensionless
links 404 locally while working in production. `site-test.mjs` emulates the
Pages behaviour, so trust it over a local browse.

## Tests

```bash
npm i --no-save playwright-core
node site-test.mjs
```

Checks every internal link on all 14 pages resolves, that no `.html` blog links
have crept back in, that canonicals point at URLs which actually serve a 200,
that each post carries a booking CTA, and — most importantly — that the contact
form posts to the CRM and shows success **only** when the CRM confirms it saved.

## How booking works

Two paths, both in `app.js`, both posting to the CRM's public `book-trial`
endpoint and both reading the reply:

- **The contact form** (`#contact`) — a general enquiry. Creates a lead at
  *New Inquiry*.
- **The class popup** — the visitor picks a real class off the schedule.
  Creates a lead already at *Trial Booked* with the correct time, so the
  confirmation email names the class.

Class times are converted to Central with the offset for that specific date,
because the academy runs through both CST and CDT and a visitor may be browsing
from anywhere.

The endpoint only ever writes. There is nothing secret in this repository, and
nothing here can read a member's details back out.

### What this replaced

Worth recording, because both failures were silent:

- The contact form **discarded every submission**. Its handler hid the form and
  showed "thanks"; there was no endpoint at all.
- The class popup fired at a Google Apps Script via `new Image().src` and showed
  success 800ms later without reading the reply — the old comment read
  `// Silent fail — user still sees success`. A broken script was invisible.

Both now tell the person to call if the booking did not save.

## SEO notes

Cloudflare Pages 308-redirects `/blog/foo.html` to `/blog/foo`. The sitemap and
every canonical tag used to name the `.html` form, so Google crawled a URL that
redirected, filed all 14 pages as *"Page with redirect"*, and indexed none of
them. Everything now names the extensionless URL that actually serves a 200.

**If you add a blog post**, link to it without `.html`, set its canonical to the
extensionless URL, and add that URL to `sitemap.xml`. `site-test.mjs` will catch
you if you forget.

`_redirects` maps the previous website's URLs — `/plans-and-pricing`,
`/schedule`, `/contact-us` and the rest — onto the sections that replaced them,
so the eight 404s in Search Console become 301s and keep whatever standing those
URLs had.
