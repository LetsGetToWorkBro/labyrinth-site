# Labyrinth BJJ Wharton

The website for the Wharton, Texas location, served at **https://wharton.labyrinth.vision** from its own
Cloudflare Pages project. Static HTML, CSS and one small script. No framework, no build step on Cloudflare:
what is in this folder is exactly what is served.

It is **coming soon** until you flip one switch. While it is, every page says so, the site tells search engines
to stay away, and not one unconfirmed fact (address, class times, prices, hours, opening date, map) appears.

```
site.config.json   the ONE place every undecided fact lives, plus the live switch
index.html ...     generated pages (home, programs/, coaches/, areas/, schedule, pricing, contact, privacy, 404)
robots.txt  sitemap.xml  llms.txt  _headers  _redirects     generated
style.css  programs.css  base.css   the main site's design system (copied by scripts/wharton_sync.py)
wharton.css        everything specific to this site (hand-written)
app.js             nav, FAQ accordion, reveal-on-scroll, the enquiry form (hand-written, ~200 lines)
assets/            photos and logos (webp + jpg pairs), og-wharton.jpg
site-test.mjs      the test suite
```

The generator is `scripts/build_wharton.py` in the repository root. **Do not hand-edit the generated files**:
change the generator or the config and re-run it.

## Going live

1. Open `site.config.json` and fill in what you now know. Anything you leave empty keeps its "coming soon" message.

   | field | format |
   |---|---|
   | `address` | `street`, `suite` (optional), `zip`. `city` and `state` are already Wharton, TX |
   | `opening_date` | `"2027-01-10"`. Shown as "Classes start January 10, 2027", or "Now open in Wharton" once that date has passed |
   | `hours` | `[{"days": ["Monday","Wednesday"], "opens": "17:00", "closes": "20:30"}]` |
   | `schedule` | `[{"day":"Monday","start":"18:00","end":"19:00","class":"Adult BJJ","type":"Gi","audience":"adult"}]`. `type` is `Gi`, `No-Gi` or empty; `audience` is `adult`, `kids` or `all`; `end` and `note` are optional |
   | `pricing` | `[{"name":"Adult Unlimited","audience":"adult","price":"149","period":"month","features":["..."],"featured":true}]`. `audience` is `adult`, `kids`, `family` or `other` (other = small add-on rows). `period` is `month`, `class`, `hour`, or empty |
   | `kids_ages` | free text, for example `"ages 6 to 15"`. Empty means "age groups will be confirmed with the schedule" |
   | `joe_photo` | `"assets/joe-herrera.jpg"`. Put the file there (and a `.webp` beside it if you can). Empty keeps the initials card |
   | `map_url` | a Google Maps link. Becomes a "Get directions" button |
   | `social` | Wharton-specific Instagram/Facebook URLs. Empty ones are not shown |
   | `lastmod` | the date written into `sitemap.xml`; change it when you change content |

2. Set `"live": true`.
3. Run `python3 scripts/build_wharton.py --strict` from the repository root. `--strict` exits with an error if live is
   true and a field is still empty; without it you get a warning per empty field and a build that keeps the
   coming-soon message for just those parts.
4. Run `node wharton-site/site-test.mjs` (see Tests), then commit and merge to `main`. Cloudflare deploys.

**Nothing is shown while `live` is `false`, even if the config is filled in.** That is deliberate, and tested: you
can prepare the whole config in advance and nothing leaks until you flip the switch. To preview live mode without
committing it: `python3 scripts/build_wharton.py --live true --out /tmp/preview` after copying this folder there
(`cp -r wharton-site /tmp/preview`).

What `live` changes, everywhere at once:

| | `false` (coming soon) | `true` |
|---|---|---|
| every page | `<meta name="robots" content="noindex, nofollow">`, a "Coming soon" strip, no canonical | indexable, canonical on `wharton.labyrinth.vision` |
| `robots.txt` | `Disallow: /` | allows crawling, names the sitemap |
| `sitemap.xml` | not generated (any old one is deleted) | every indexable page |
| `_headers` | adds `X-Robots-Tag: noindex, nofollow` | does not |
| JSON-LD | no address, hours or prices | address, hours, `Offer` prices where filled in |
| hero, schedule, pricing, location cards, footer, FAQ, `llms.txt` | "coming soon" copy | the real values |

The 404 page and the privacy policy are always `noindex`, as on the main site.

## Cloudflare Pages setup

Create a **new** Pages project (separate from the labyrinth.vision one):

- Connect the same GitHub repository, production branch `main`.
- **Framework preset:** None. **Build command:** leave empty. **Build output directory:** `/` (or empty).
- **Root directory (advanced):** `wharton-site`
- After the first deploy: **Custom domains** > add `wharton.labyrinth.vision`. The `labyrinth.vision` zone is on
  Cloudflare, so the DNS record is created for you.

`_headers` and `_redirects` in this folder are honored by Pages. The CSS and JS are requested as
`/style.css?v=<hash>`; the generator recomputes the hash, so a changed file is a changed URL.

Side effect worth knowing: the *main* Pages project deploys the whole repository root, so this folder is also
reachable at `labyrinth.vision/wharton-site/...` (as are the other folders that are not the website). While the site
is coming soon those pages are `noindex`; once live, their canonical tags point at `wharton.labyrinth.vision`.
If you want that path closed, add `/wharton-site/*  https://wharton.labyrinth.vision/:splat  301` to the main
site's `_redirects`. This site does not touch any main-site file, so that line is yours to add.

## The one backend change

The enquiry form posts to the same CRM endpoint as labyrinth.vision, the `book-trial` function
(`https://jctufxvmuvobaggxcwfn.supabase.co/functions/v1/book-trial`). **Its allowed origins must include
`https://wharton.labyrinth.vision`** (next to `https://labyrinth.vision`). Until they do, the browser blocks the reply,
the form cannot see `ok: true`, and it correctly shows the error and the phone number instead of a false success.
The function lives in the labyrinth-app repository, not here.

Each enquiry arrives with a note beginning `WHARTON: `, which is how the CRM tags a lead from this site, and with
no class date (Wharton has no timetable, so the form is "free first class / get notified", not a class picker).
`program` is set from the "Who would be training?" answer (`Adult BJJ`, `Kids 3-6`, `Kids 7-12`, `Teens`) or left
empty for "more than one of us". A hidden `company` field is a honeypot: if a bot fills it, nothing is sent.

## Tests

```
node wharton-site/site-test.mjs
```

Needs `playwright-core` (already in the repository's `node_modules`), Chromium at `/opt/pw-browsers/chromium`
(or set `CHROMIUM_PATH`) and python3. It builds throwaway copies of the site into a temp directory, including a
fully filled-in live copy, so it never changes this folder. It takes a minute or two; it checks:

- every internal link, asset and `#fragment` resolves, and every `_redirects` target
- noindex everywhere before launch, indexable and in the sitemap after
- no filled-in config value reaches a page, JSON-LD or `llms.txt` while `live` is false; all of them do when true
- no forbidden strings (the Fulshear street address, lorem, `undefined`, Perplexity, seasonal and promotional
  leftovers, em dashes, British spelling, other coaches' photos)
- the form posts the right payload, shows success **only** when the CRM replies `{"ok": true}`, and shows the
  error for `ok:false`, an HTTP error, an empty reply and a network failure
- no horizontal overflow at 390px and 1280px on any page, in either mode
- the committed pages equal what the generator produces

## Maintaining the shared pieces

- `python3 scripts/wharton_sync.py` re-copies `base.css`, `style.css`, `programs.css`, the favicons and the photos
  from the main site (and prunes the Pink October / HYROX / Ennova / Halloween CSS). Use it when the main site's
  design changes. It never touches `wharton.css` or `app.js`.
- `node scripts/og-wharton.mjs` re-renders `assets/og-wharton.jpg` (1200x630) from `scripts/og-wharton.html`.
- The privacy policy is the main site's `privacy-policy.html` with this site's nav, footer, domain and contact
  details swapped in at build time. If the main policy is reworded so that a swap no longer matches, the build
  stops rather than ship the Fulshear street address. It is legal text: have it read before launch.
- The Labyrinth team results on the home page (top 1%, #39 of 7,869, 327 golds, 1,235 wins) come from
  `scripts/jits_data.py`, the same file the main site uses, and are always labeled as the whole Labyrinth team's
  results as of the date in that file, never as Wharton's.

## What this site deliberately does not say

Joe Herrera is described only as: *brown belt under Prof. Anthony Curry, lead instructor at Labyrinth BJJ Wharton.*
No years, titles, results or quotes have been invented for him, and no other coach's photo is used for him. Prof.
Curry's facts come only from his page on labyrinth.vision. The town pages say "near" and "serving families from"
and quote no drive times. Not on this site: the Halloween decoration, the Pink October and HYROX blocks, the live
stream, the member portal, pre-orders, reviews, ratings, testimonials.

The town pages (El Campo, East Bernard, Boling, Hungerford, Louise) are written to be useful rather than clever,
but with no address, schedule or prices yet they are thin. Read them once the real details are in, and add Edna
or Needville only if you have checked they are within your service radius (the generator's `AREAS` list is one
dictionary per town).
