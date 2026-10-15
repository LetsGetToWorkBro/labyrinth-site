# The move to Richmond: the kit and the runbook

**Status: staged. Nothing here is live.** This folder lives on the working branch only. It is never pushed to `main`, because everything on `main` is served to the world (this README included). On the day it edits a separate, fresh copy of `main`, and only that copy is published.

- **From:** 6615 West Cross Creek Bend Lane, Suite #400, Fulshear, TX 77441 (inside Cross Creek Ranch)
- **To:** 10330 Hidden Lake Ln, Building 1, Richmond, TX 77406 (the lease rider, received 2026-10-15)
- **When:** July 1, 2027, tentative (`move.json`, one place). **Phone stays** (281) 393-7983.

**Who can read this:** the GitHub repository `LetsGetToWorkBro/labyrinth-site` is **public**, and so is every branch of it, this one included: the new address, the date and these drafts are readable there before they are announced. Nothing links to the branch, but if that matters, make the repository private (Settings, Danger Zone) or move this folder out; it needs nothing from the rest of the working branch except the scripts it reads from a checkout of `main`.

## The one thing to know

The new building has a Richmond address and is **not near the middle of Richmond**. It is off Fulshear-Gaston Road, on the Fulshear side of the Richmond postal area. Measured road miles (OSRM on OpenStreetMap data, no traffic; `routes.json`, `routes_both.json`):

| From | To Hidden Lake Ln | To the Katy academy (1806 Avenue D) | Nearer |
|---|---|---|---|
| Old academy, Cross Creek Ranch | 4.9 mi, 11 min | 9.4 mi, 18 min | Richmond |
| Cross Creek West | 5.1 mi | 10.7 mi | Richmond |
| Churchill Farms | 5.5 mi | 6.1 mi | Richmond, barely |
| Middle of Fulshear | 6.5 mi, 13 min | 12.4 mi | Richmond |
| Tamarron | 6.8 mi, 14 min | 6.3 mi | level |
| Cinco Ranch | 7.4 mi, 15 min | 5.8 mi | **Katy** |
| Fulshear Lakes | 9.1 mi | 15.1 mi | Richmond |
| Rosenberg | 10.1 mi, 17 min | 18.1 mi | Richmond |
| Harvest Green / Aliana | 10.7 / 10.9 mi, 18 min | n/a | Richmond |
| Simonton | 10.9 mi, 19 min | 16.9 mi | Richmond |
| Jordan Ranch | 11.1 mi, 21 min | 7.9 mi | **Katy** |
| Old center of Richmond | 13.6 mi, 23 min | 18.3 mi | Richmond |
| Brookshire | 13.9 mi, 24 min | 9.6 mi | **Katy** |
| Sealy | 27.7 mi, 40 min | 23.3 mi | **Katy** |

So the site says "Richmond" where it says where the academy is, keeps saying "Fulshear" where it talks to Fulshear, and never suggests the academy is in the middle of Richmond. The old area pages told Brookshire and Sealy families that Fulshear was their nearer academy; from Hidden Lake Ln it is now Katy, and the rewritten pages say so (as the Cinco Ranch page already did), and say the same of Jordan Ranch on the Fulshear page.

## What is in this folder

| File | What it is |
|---|---|
| `move.json` | The one configuration: effective date, old and new address, coordinates, phone. Change the date or the pin here and everything follows. |
| `apply_move.py` | **The site.** Applies the move to a checkout of `main`: `python3 move-richmond/apply_move.py --target DIR` (dry run) or `--apply`. Also `--work` for the working branch's own files (below). |
| `rules.py` | Every exact old-text-to-new-text rule (about 120), the wording policy, and what counts as a mistake afterwards. |
| `areas_data.py` | The eight area pages, **written** (not find-and-replace) from the measured routes: Richmond (new), Fulshear (new), Tamarron, Cinco Ranch, Rosenberg, Simonton, Brookshire, Sealy. Also the class times they quote and which academy each says is nearer; both are checked on the day. |
| `blog_neighborhoods.html` | The rewritten body of the neighborhoods guide (`/blog/jiu-jitsu-near-fulshear-neighborhoods`). |
| `build_listings_prompt.py` | Builds the muse prompt that changes the address on every listing (in place, nothing new created, stops at Google's verification). |
| `crm/apply_crm.py`, `crm/edits.py` | **The CRM** (the other repository). Exact edits, regenerates the renewal bundle, re-pins the golden hashes, runs the type check and all 80 CRM tests. `crm/preview.patch` is what it produces today. |
| `crm/move-day.sql` | The one row of the CRM's database that holds the address. Generated from `move.json`. |
| `announcements.md` | Drafts: the email and text to members, the Instagram/Facebook post, the Google post. |
| `tools/measure_routes.py` | Re-measures every drive if the entrance pin moves. `routes.json`, `routes_both.json`, `places.json` are its data. |

## What the owner has to supply or decide

1. **Confirm the date.** `move.json` says July 1, 2027. If it slips, change `effective_date`; the scripts refuse to apply before it.
2. **The entrance pin.** The coordinates are the street-range point from the US Census geocoder, probably a few hundred feet from the door. Drop a pin at the entrance in Google Maps, put it in `move.json` (`new.lat`, `new.lng`), and the map pin, the geo tags, the structured data and the listings prompt follow. If it is more than a quarter of a mile from the current point, run `tools/measure_routes.py` and read the sentences it flags.
3. **Parking and which door.** Nobody has said. The site's "Coming to visit" paragraph and every CRM email now say where the gym is and nothing about parking (the old text said "park at the front of building C and come to Suite #400", which is gone). Add one sentence once somebody has looked: `arrival()` in `trial-emails.ts`, `gettingHere` in `member-emails.ts`, and the neighborhoods guide.
4. **Class times and hours.** Assumed unchanged. If they change, change the timetable the normal way (`scripts/schedule_data.py`); the dry run checks the class times the area pages quote against it.
5. **The Ennova offer** (`/ennova`, "Ennova Fulshear residents"). The page now says the academy is off Fulshear-Gaston Road in Richmond. Decide whether the offer still makes sense.
6. **The four event pages** (Rolling for Ribbons ×3, HYROX Youngstars). The kit leaves them saying where those events were held and changes only their footer. By July they will be past events: retire or archive them.
7. **Titles.** Every page title now ends "Labyrinth BJJ Richmond", and the home page says "Richmond TX" (the description adds "near Fulshear"). The Fulshear searches are kept alive by the new Fulshear area page, the "Martial Arts Near Fulshear" page, the Fulshear-titled blog posts, the keywords tag and the neighborhoods guide. This is the main trade-off in the move; say if you want it the other way.
8. **A "We have moved" strip** on the home page. Not built (see `announcements.md`, item 5).

## Before the day (about a week ahead, and again the day before)

`move-richmond/check.sh [PATH_TO_THE_CRM_CHECKOUT]` does steps 1, 2, 4 and 5 in one go against a fresh copy of `origin/main` and changes nothing. Step 3 (the proof) is the one that takes a quarter of an hour, so do it at least once.

1. A fresh copy of `main`: `git fetch origin main && git worktree add --detach ../pubtmp-move origin/main && ln -s "$PWD/node_modules" ../pubtmp-move/node_modules`
2. **Dry run the site:** `python3 move-richmond/apply_move.py --target ../pubtmp-move --deck /tmp/deck.md`. Nine months of changes to the site will have happened since these rules were written. The script says exactly what drifted: `FAIL rule X … NOTHING MATCHED` means the sentence that rule replaced has been reworded (find it, fix the rule in `rules.py`); a `PROBLEM` line says what is wrong. It must end "Dry run clean".
3. **Prove it:** `--apply --allow-early` on a throw-away worktree, then run all four suites one at a time (`node site-test.mjs`, `node booking.test.mjs`, `node nav-fit.test.mjs`, `node season-theme-test.mjs`) and `node wharton-site/site-test.mjs`.
4. **Dry run the CRM** (3 to 4 minutes, runs the CRM's own tests): `python3 move-richmond/crm/apply_crm.py --target /path/to/labyrinth-app`. A pair that no longer matches means the CRM changed: read that file and update `crm/edits.py`.
5. **Read the listings prompt:** `python3 move-richmond/build_listings_prompt.py --preview --out /tmp/listings-PREVIEW.txt`.
6. **Owner, before the day:** make sure the Google account that owns the profile can log in and get a code; have a lease or utility bill in the business's name for the new address (Google may ask for proof); plan to film the short verification video at the new building on the day; take screenshots of the profile, the map pin and today's rankings for "bjj fulshear", "martial arts fulshear", "bjj richmond tx" so the effect can be measured; order the new sign.

## Move day, in this order

The Google profile and the site must change **the same day**: Google compares the profile's address with the site's.

### 1. The website (about 40 minutes)

```bash
git fetch origin main
git worktree add --detach ../pubtmp-move origin/main && ln -s "$PWD/node_modules" ../pubtmp-move/node_modules
python3 move-richmond/apply_move.py --target ../pubtmp-move --apply        # refuses before the date; writes nothing if any check fails
# in ../pubtmp-move: run the four suites one at a time, then node wharton-site/site-test.mjs
git -C ../pubtmp-move add -u && git -C ../pubtmp-move add areas/bjj-fulshear.html     # never add -A: node_modules is a symlink
git -C ../pubtmp-move commit -m "Move to 10330 Hidden Lake Ln, Richmond" && git -C ../pubtmp-move push origin HEAD:main
```

Cloudflare Pages deploys in about a minute. Then check what the visitor gets: the home page, `/schedule`, `/areas/bjj-richmond`, `/areas/bjj-fulshear` and `/sitemap.xml` show the new address; view-source on the home page shows the new address in the structured data; the map pin is on Hidden Lake Ln. Then merge `origin/main` into the working branch.

What the script changes (66 files on today's `main`): the address, ZIP, coordinates, structured data and geo tags; every page title and description that named Fulshear as where the classes are; the footer; the eight area pages and the neighborhoods guide (rewritten); the sitemap (a new entry for `/areas/bjj-fulshear`, and `lastmod` set to the move date on every page that changed); the generators that write all of it (so a rebuild cannot bring the old address back); the tests that pinned the old address; and `build_wharton.py` (the Wharton site is built from this site's privacy policy and must keep refusing to carry the academy's address; it is regenerated and proved unchanged).

### 2. The Google profile and the listings (same day, right after the site is live)

On the working branch, update the master copies, then build the prompt:

```bash
python3 move-richmond/apply_move.py --target . --work --apply      # the listing master copy, the Google profile copy, the flyer, the caption guard
python3 move-richmond/build_listings_prompt.py --out /path/to/muse-prompt-listings-move.txt
```

Send the prompt to the muse. It edits each listing **in place** (Google first), never creates a new one, and **stops at the verification step** and tells the owner what it asked for: for Google that is almost certainly a short video of the new building, which only the owner can film on a phone at the new address. Do that the same hour. Commit the updated master copies on the working branch.

### 3. The CRM (the other repository; this session cannot push to it)

```bash
python3 move-richmond/crm/apply_crm.py --target /path/to/labyrinth-app --apply     # exact edits + bundle + golden hashes + type check + 80 tests, then copies the files in
cd /path/to/labyrinth-app && git add -u && git commit -m "Move to 10330 Hidden Lake Ln, Richmond" && git push     # Cloudflare Pages builds the web app from the repository
supabase/scripts/deploy.sh functions send-message book-trial trial-lifecycle member-lifecycle event-rsvp
```

Then run `crm/move-day.sql` in the Supabase SQL editor (project `Labyrinth-app`): it changes `settings.data.address`, the one stored copy, which every automated email and text prints before the code's fallback. Look-then-change-then-look, with a WHERE clause that makes it a no-op if already done. Do the SQL and the deploy in the same hour.

`billing-renewals` is **not** in that list on purpose. Its bundle changed by three address strings and no pricing logic; ship it only if you want the deployed bundle to match the repository, by name (`deploy.sh functions billing-renewals`) and after reading its diff, as `supabase/README.md` says.

In the CRM, once: Locations, first location, set the name to "Richmond" (the CRM keeps the internal id `fulshear`; the name is what staff see).

### 4. Tell people

`announcements.md`: the email, then the text, to all members through the CRM broadcast; the Instagram and Facebook post; the Google post (only after Google accepts the new address).

### 5. After

- **Week 1:** search "labyrinth bjj" in Google Maps, Apple Maps and Bing Maps; the listings prompt's last step reports who still shows the old address. Fix stragglers. Resubmit `sitemap.xml` in Search Console (not a change-of-address: the domain does not change).
- **Weeks 1 to 4:** watch Search Console for the home page, `/areas/bjj-fulshear` and `/programs/martial-arts-fulshear`; watch the Google profile's calls and direction requests; ask new members how they found the new address.
- Citations beyond the list (Yelp's duplicate "-2" page, chamber of commerce, Facebook groups, the school and PTA pages that link to us) as they turn up.

## How the kit stays honest

- **A rule that matches nothing is an error.** It means the page changed since the rule was written. Nothing is silently skipped.
- **The checks run on the result**, as the visitor will see it, in a scratch copy: the site's own generators are run, the assets restamped, the sitemap updated, and then: no trace of the old street, ZIP or coordinates anywhere except the sentences that say where the academy *was* (the "Did Labyrinth BJJ move?" answers); no sentence that still puts the academy in Fulshear or inside Cross Creek Ranch; every Fulshear mention outside the rewritten pages is on a reviewed keep-list; every JSON-LD block parses; the map pin, the geo tags and the structured data are one point; the class times the new pages quote are on the timetable; each page's "the Katy academy is nearer" is right about the measured miles; the eight area pages are still different from each other (the site test's doorway-page guard, run first); American spelling and no dashes in the new copy; regenerating changes nothing the rules wrote; the Wharton site is unchanged.
- **Event pages and past events** keep saying where they were held. They are protected by name inside `build_pages.py` (`PROTECT_BLOCKS`), and their calendar entries use a frozen copy of the old address (`EVENT_ADDRESS`).
- **`scripts/new-posts.py` is never run.** Its posts have been edited by hand since, and running it would undo six of them. The move does not need it.
- **Only after every check passes** does `--apply` copy a single file into the checkout.

## What was proved (2026-10-15, against `main` at eb4eff5)

- Site: 66 files change (65 on `main`, plus the new `areas/bjj-fulshear.html`); dry run clean; applied to a throw-away worktree of `main`, then every suite run one at a time: `site-test.mjs` 695 passed, 0 failed; `booking.test.mjs` 184 checks, all passed; `nav-fit.test.mjs` passed (tightest point 1261px, 24px to spare); `season-theme-test.mjs` 252 passed, 0 failed; `wharton-site/site-test.mjs` 94 passed, 0 failed. The first run found one real problem (the calendar link of the past October 24 seminar had taken the new address), which is why the event pages are now pinned to the old one.
- CRM (`labyrinth-app` at 090522e): 34 exact edits; type check clean; 80 of 80 tests pass after re-pinning four golden-hash tests (their whole purpose is to fail when a Fulshear lead's mail changes by a byte, and it does change, on purpose, by the address).
- Database: a scan of every text and JSON column found the old street in exactly one place that is not history: `settings.data.address`.
- Listings: the prompt builds, lints and reads cleanly (`build_listings_prompt.py --preview`).
- Not proved, because it cannot be until July: that Google accepts the address change without a fight; the entrance pin; parking.

## Why these choices (the wording policy, in `rules.py`)

1. Where the site says **where the academy is** (address, footer, location card, "at Labyrinth BJJ in X", schema, a title that names the place the classes are), it says Richmond: that is the postal city, and the Google profile will say it too.
2. Where the site talks **to Fulshear** (the neighborhoods guide, "New to Fulshear?", areas served, the Fulshear area page), it keeps saying Fulshear and says honestly where we are in relation to it.
3. **History stays history:** "started Labyrinth in Fulshear in 2021" is true and left alone, and so is the lineage card on Professor Lawler's page (his black belt was awarded in Fulshear).
4. **Past events stay where they happened.**
5. `/programs/martial-arts-fulshear` exists to answer that search, so it keeps asking it: "Martial Arts Near Fulshear", and says the academy is in Richmond. The blog posts about Fulshear keep their titles and change only their sentences about where we are.
6. **No claim that nobody has checked:** no parking, no entrance, no school district for the new site, no traffic.
7. All `-fulshear` URL slugs stay (programs, blog, areas): moving a URL costs ranking, and the slug says what the page is about, not where the gym is.
