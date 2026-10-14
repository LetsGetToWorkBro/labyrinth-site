# labyrinth.vision

The Labyrinth BJJ Academy website. Static HTML, CSS and JavaScript. No build
step, no framework, no dependencies. What is in this repository is exactly what
is served.

Deployed on **Cloudflare Pages**. Bookings land in the CRM at
**crm.labyrinth.vision** ([labyrinth-app](https://github.com/LetsGetToWorkBro/labyrinth-app)).

```
index.html            the whole main site, one page, anchor-linked sections
app.js                all behaviour: nav, schedule, booking popup, forms
style.css  base.css   main site styles
blog/                 13 pages: an index and 12 posts, with blog.css
review/               review landing page
assets/               images (each has a .webp alongside its .jpg)
_headers              security headers for Cloudflare Pages
_redirects            301s for the old site's URLs
sitemap.xml           submitted to Google Search Console
season*.css, season*.js   the seasonal homepage themes (see "Seasonal themes")
site-test.mjs         link, SEO and booking tests (see below)
```

## Running it locally

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000. One caveat: Cloudflare Pages serves
`/blog/foo` for `blog/foo.html`, and `http.server` does not, so extensionless
links 404 locally while working in production. `site-test.mjs` emulates the
Pages behaviour, so trust it over a local browse.

## Tests

```bash
npm i --no-save playwright-core
node site-test.mjs
```

Checks every internal link on all 14 pages resolves, that no `.html` blog links
have crept back in, that canonicals point at URLs which actually serve a 200,
that each post carries a booking CTA, and (most importantly) that the contact
form posts to the CRM and shows success **only** when the CRM confirms it saved.

## Seasonal themes

The homepage dresses for the holiday, by itself, on the academy's clock (Central). `index.html`'s `<head>` holds a table of windows and sets
`<html data-season="…">`; on a day with no season nothing is fetched and the page is exactly what it always was.

| Season | Window | Preview |
|---|---|---|
| `halloween` | Oct 1 to 31 | `/?season=halloween` |
| `columbus` | Oct 12, 2026 only (pinned to the year) | `/?season=columbus` |
| `thanksgiving` | Nov 1 to 30 | `/?season=thanksgiving` |
| `christmas` | Dec 1 to 31 | `/?season=christmas` |
| `newyear` | Jan 1 to 31 | `/?season=newyear` |
| `valentines` | Feb 1 to 28 (29) | `/?season=valentines` |
| `easter` | Mar 1 to 31, and on to Easter Sunday in the years Easter falls in April | `/?season=easter` |
| `stpatricks` | Mar 17, every year (it wins over Easter's month that one day, the way Columbus Day wins over Halloween) | `/?season=stpatricks` |
| `cinco` | May 1 to 15 | `/?season=cinco` |
| `memorial` | May 16 to 31 | `/?season=memorial` |
| `independence` | Jul 1 to 31 | `/?season=independence` |

`/?season=off` shows the page with no theme. The New Year theme shows the year it welcomes: that January's own year all through January, and the coming year when previewed at any other time (looked at in October 2026 it says 2027). A window opens at Central midnight on its first day and ends at the Central midnight after its last. A later
window wins over an earlier one; a window with a `year` is for that year only. April (after Easter), June, August and September have no season.

Each season but Halloween is two files, `season-<name>.css` and `season-<name>.js`, loaded (after `season-kit.css` and `season-kit.js`) only while it is on.
`season-kit.js` explains what a pack is and what its helpers do (`k.particles`, `k.twinkles`, `k.flyers`, `k.pendant`, `k.tap`, `k.burst`); `season-thanksgiving.*`
is the model to copy. To change a date, edit the window in the head. To add a holiday: a window and a pack entry in the head, its two files, its name in
`season-theme-checks.mjs`. To retire one: delete its two files, its window and pack lines, and its entry there. `scripts/stamp_assets.py` puts a content hash
on every `season-*` file's address (it finds them by name), so a changed theme is never served from an old cache.

`node season-theme-test.mjs <name>` checks one season on its own (palette and contrast, twelve different section layers, the foot scene, every tap, nothing
over any words, phones, reduced motion, previews); `site-test.mjs` runs the same checks for all of them and tests every window edge, Easter for any year, and
the quiet months. `SITE_TEST_NOW=2026-12-10T15:00:00Z node site-test.mjs` (also `nav-fit.test.mjs` and `booking.test.mjs`) runs a whole suite as if it were that day;
add `SKIP_SEASON_PACKS=1` to `site-test.mjs` to leave out the per-pack checks.

When a season switches on, `node scripts/check-season.mjs <name>` (from a checkout of `main`, with `playwright-core` installed) checks the live site: the live `index.html`
and the season's four files (kit and pack) must be byte for byte the repo's, and the page, built on the real clock, must be that season. `PIN_ISO=2027-05-05T15:00:00Z`
rehearses it for another day.

## How booking works

Two paths, both in `app.js`, both posting to the CRM's public `book-trial`
endpoint and both reading the reply:

- **The contact form** (`#contact`): a general enquiry. Creates a lead at
  *New Inquiry*.
- **The class popup**, the visitor picks a real class off the schedule.
  Creates a lead already at *Trial Booked* with the correct time, so the
  confirmation email names the class.

Class times are converted to Central with the offset for that specific date,
because the academy runs through both CST and CDT and a visitor may be browsing
from anywhere.

### Who can start where

A child who has never trained can start in any kids class that is not an advanced one, on any day of the week. The picker's list
(`KIDS_TRIAL_CLASSES` in `booking.js`) is the classes flagged `trial` in `scripts/schedule_data.py`: Kids BJJ and Teens BJJ, the Saturday
No-Gi class, Youth Wrestling, and the all-ages Strength & Conditioning and MMA Conditioning. The advanced grappling classes need a belt or two
years of wrestling and are not on it, and neither is Open Mat. A tap on an advanced class in the timetable opens the list instead of a form.
To change who may start where, flag or unflag the class in `schedule_data.py`, make the same change in `booking.js`, and run
`python3 scripts/build_pages.py` (then `build_programs.py`, `build_areas.py` and `stamp_assets.py` if the copy changed). `site-test.mjs`
fails (L1i) if the two lists disagree, and (L1t) if a kids class is neither a trial class nor an advanced one.

The endpoint only ever writes. There is nothing secret in this repository, and
nothing here can read a member's details back out.

### Counting bookings for Google Ads

`booking.js` counts a booking as the **Booking** conversion in Google Ads (account `AW-18504205012`, label in `BOOKING_CONVERSION`) at
the one place a booking is known to have been saved: after the CRM replies `ok`. A booking the CRM refused is not counted, and a retry
that succeeds is counted once. The value is the fixed $1 the conversion action is set to in Google Ads; if it is changed there, change
`countBooking()` with it.

`index.html` carries Google's own snippet. `booking.js` is on every page that can book, including the page the Google ad lands on, so it
sets the tag up on pages that do not have it: the tag has to run on the page an ad click arrives at, or a booking made later cannot be
credited to the ad. `booking.test.mjs` and `L1ads` in `site-test.mjs` keep the two in step.

### Knowing where bookings come from

Instagram counts the people who tapped through and the CRM counts the people who booked, and nothing joined the two. So `booking.js` now
writes where each booking's person came from into the lead's note, which the Leads board shows on the lead:

    Adult BJJ, Gi, Monday 6:30 PM, booked from the website. Came from: instagram / adult-ad. Heard about us: Friend or family.

- **Came from** is worked out, not asked. A link with tags names itself (`utm_source`, `utm_medium`, `utm_campaign`, each cut to 40
  characters of letters, digits, spaces, dots, dashes and underscores). A click on a Google ad is recognised from Google's own click id
  (`gclid`, `gbraid`, `wbraid`) with no tags needed. Otherwise it is the site that sent the visitor (`google.com`, `yelp.com`), and a click
  out of Facebook or Instagram (`fbclid`) reads "Instagram link" or "Facebook link". A direct visit adds nothing.
- **Heard about us** is the optional menu on the form (the `HEARD_OPTIONS` list, in the CRM's words). It is the person's own answer and is
  kept apart from the above, since the two often disagree and both are worth seeing.
- What the landing page saw is kept in this browser (`localStorage`, key `labyrinth.source`) for 30 days, because people land on one page and
  book from another, or come back days later. A tagged link or a Google ad click outranks a referrer and is replaced only by another one;
  a later referrer replaces an earlier referrer; direct visits and clicks inside the site change nothing. If storage is blocked the page's
  own memory is used.
- The booking endpoint keeps the first 400 characters of the note and cuts the rest silently. The class always comes first and the extras are
  trimmed to fit (`NOTE_LIMIT`). The endpoint itself is unchanged: this is all in the note it already took.

**Links for ads** go in the ad's destination: add `?utm_source=<where>&utm_campaign=<name>` to the end of the address, for example
`https://labyrinth.vision/programs/adult-bjj-fulshear?utm_source=instagram&utm_campaign=adult-ad`. Use the same spelling every time, because
the CRM shows exactly what the link said. The tags work on any page that loads `booking.js` (the page the ad lands on must; `L1src` in
`site-test.mjs` checks the usual landing pages do).

**Reading it:** the lead's timeline entry on the Leads board says it. To count bookings by source, count the leads whose timeline holds the
wording (`booking.test.mjs` has it under test), for example, in the CRM's database:

    select count(*) from leads
    where source = 'web' and created_at >= '2026-10-12' and timeline::text ilike '%Came from: instagram%';

(`Heard about us: Instagram` is the person's own answer; the two counts are not expected to match.) Bookings made before this went live carry
neither line, so count from the day it went live.

### What this replaced

Worth recording, because both failures were silent:

- The contact form **discarded every submission**. Its handler hid the form and
  showed "thanks"; there was no endpoint at all.
- The class popup fired at a Google Apps Script via `new Image().src` and showed
  success 800ms later without reading the reply. The old comment read
  `// Silent fail, user still sees success`. A broken script was invisible.

Both now tell the person to call if the booking did not save.

## SEO notes

Cloudflare Pages 308-redirects `/blog/foo.html` to `/blog/foo`. The sitemap and
every canonical tag used to name the `.html` form, so Google crawled a URL that
redirected, filed all 14 pages as *"Page with redirect"*, and indexed none of
them. Everything now names the extensionless URL that actually serves a 200.

**If you add a blog post**, link to it without `.html`, set its canonical to the
extensionless URL, and add that URL to `sitemap.xml`. `site-test.mjs` will catch
you if you forget.

`_redirects` maps the previous website's URLs: `/plans-and-pricing`,
`/schedule`, `/contact-us` and the rest: onto the sections that replaced them,
so the eight 404s in Search Console become 301s and keep whatever standing those
URLs had.
