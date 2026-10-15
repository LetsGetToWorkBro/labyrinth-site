"""The rules of the move: every exact old-text-to-new-text change, and what counts as a mistake afterwards.

apply_move.py reads this. Rules are applied in order, so the longer forms of the address come before the shorter ones. A rule that matches nothing is
an error (min=1), because it means the page it was written for has changed and the sentence should be read again.

The policy the wording follows (decided with the numbers in routes.json, and open to the owner's change):
  1. Where the site says WHERE THE ACADEMY IS (the address, the footer, the location card, "at Labyrinth BJJ in X", the schema, a title that names the
     place the classes are), it now says Richmond. That is the postal city of 10330 Hidden Lake Ln (ZIP 77406), and the Google profile will say it too.
  2. Where the site talks to FULSHEAR (the neighborhoods guide, "New to Fulshear?", the areas served, the Fulshear area page) it keeps saying Fulshear,
     and says honestly where we are in relation to it: Hidden Lake Ln is about 5 road miles and 11 minutes from the old academy in Cross Creek Ranch, off
     Fulshear-Gaston Road, which meets FM 723 a little over a mile away. It is NOT near the middle of Richmond (about 14 miles to the old town center),
     and no sentence may suggest it is.
  3. History stays history: "started Labyrinth in Fulshear in 2021" and "built from the ground up in Fulshear" are true and are left alone.
  4. Past events stay where they happened: the October 24 seminar was at the old address (protected below); the event pages keep their own words and get
     only the footer.
  5. The page about "martial arts in Fulshear" (/programs/martial-arts-fulshear) exists to answer that search, so it keeps asking it: it now says "near
     Fulshear" and that the academy is in Richmond. The blog posts whose subject is Fulshear (best gym in Fulshear, what it costs in Fulshear, New to
     Fulshear?) keep their titles for the same reason; only their sentences about where we are change.
"""
import datetime
import re
from pathlib import Path

# ───────────────────────── scopes ─────────────────────────
EVENT_FILES = ["pink-october.html", "self-defense-for-women.html", "donate.html", "hyrox-youngstars.html"]

SITE_PAGES = ["index.html", "schedule.html", "pricing.html", "support.html", "privacy-policy.html", "ennova.html", "drop.html", "404.html",
              "programs/*.html", "coaches/*.html", "legacy/*.html", "review/*.html"]
SCOPES = {
    # every page of the site that is not an event page (wharton-site/ is a separate project and never carries this address)
    "site_pages": SITE_PAGES,
    "blog": ["blog/*.html"],
    "areas": ["areas/*.html"],
    "pages": SITE_PAGES + ["blog/*.html", "areas/*.html"],
    "event_pages": EVENT_FILES,
    "generators": ["scripts/build_pages.py", "scripts/build_programs.py", "scripts/build_areas.py", "scripts/build_blog_index.py",
                   "scripts/new-posts.py", "scripts/posts_content.py", "scripts/schedule_component.py", "scripts/schedule_data.py"],
    "js": ["app.js"],
    "text": ["llms.txt"],
    "tests": ["site-test.mjs", "booking.test.mjs"],
    "ma_files": ["programs/martial-arts-fulshear.html", "scripts/build_programs.py"],        # the martial-arts-in-Fulshear page and what writes it
    "home": ["index.html"],
    "programs_hub": ["programs/index.html", "scripts/build_programs.py"],
    # the Wharton site is built from this site's privacy policy: its builder holds the old address as the text it looks for, and its test as the text it forbids
    "wharton": ["scripts/build_wharton.py", "wharton-site/site-test.mjs"],
    # things that are made again and again from the address: the adult-classes flyer, and the guard that keeps the street out of the photo-post captions
    "artwork": ["scripts/poster-adult-bjj.mjs", "scripts/muse_prompt_photo_posts.py"],
    # the master copy every directory listing is filled in from (assets/ is linked, not copied, in the scratch copy, except for the files named in ASSET_COPIES)
    "listing_copy": ["assets/social/business-listing-details.txt", "assets/social/google-profile-update.txt"],
}

ASSET_COPIES = ["assets/social/business-listing-details.txt"]

# Lines that are about something that really happened at the old address. No rule touches them. (None at the moment: the home page's event cards are
# generated, and take the academy's address from the same constant as the footer, so they move with it; the event PAGES are protected by block below.)
PROTECT = []

# Top-level names in a generator whose text is about a dated event that happened where the academy was: the Rolling for Ribbons pages, Pink October and
# HYROX Youngstars. No rule touches a line inside them, so a past event's page keeps saying where the event was (its footer still follows the academy,
# because the footer is shared). If a name has gone because the event was retired, nothing is protected and nothing breaks.
PROTECT_BLOCKS = {
    "scripts/build_pages.py": ["render_event_rsvp", "render_donate", "render_pink_october", "render_hyrox"],
}

# Old-address words that may stay in a line because it is the sentence that says where the academy WAS (the "Did Labyrinth BJJ move?" answers).
OLD_ADDRESS_OK = [
    re.compile(r"the academy moved from 6615 West Cross Creek Bend Lane"),
    re.compile(r"^Former address \(until"),
    re.compile(r"^EVENT_ADDRESS = "),                                                  # build_pages.py: the old address, kept for the event pages
    re.compile(r"6615(?:\\b)?\|Cross Creek\|77441\|10330"),                      # the Wharton test's pattern for the addresses its pages must not carry
]

# Seed files for blog posts that were written once and edited by hand since (nothing runs them and the site does not serve their words). The rules still
# update what they can, but their leftovers are not counted.
STALE_SEEDS = ["scripts/new-posts.py", "scripts/posts_content.py"]

# Mentions of Fulshear that are right after the move: audience, area served, history, community names, URLs. Matched against the 120 characters round the word.
KEEP = [
    re.compile(r'"name": "Fulshear(, TX)?"'),                                   # areaServed in the structured data
    re.compile(r"wikipedia\.org/wiki/Fulshear"),
    re.compile(r"Fulshear[ -]Gaston"),                                          # the road the new academy is on
    re.compile(r"Fulshear Lakes|Fulshear Creek|Ennova Fulshear|Fulshear ISD|Fulshear High"),
    re.compile(r"(?:in|from|near|around|across|of|and|to|with) (?:the )?(?:greater )?(?:Katy-)?Fulshear(?:-Katy)? (?:and (?:greater )?Katy )?(?:area|communit|neighbo|famil|parent|homeschool|resident|school)"),
    re.compile(r"Katy and Fulshear area|Fulshear and greater Katy area|Fulshear-Katy area|Katy-Fulshear area|Fulshear and Katy"),
    re.compile(r"New to Fulshear|Just moved to Fulshear|moved to Fulshear|Fulshear is (?:the |growing)|Fulshear was the|put Fulshear|around Fulshear|Fulshear has a large|a city the size of Fulshear|What Fulshear parents"),
    re.compile(r"started Labyrinth Brazilian Jiu-Jitsu in Fulshear in 20|founded the academy in Fulshear in 20|started Labyrinth in Fulshear in 20|built from the ground up in Fulshear|Two schools in Fulshear became one"),
    re.compile(r"(?:Cost|Costs|cost|costs|prices|Prices) in Fulshear|BJJ [Gg]ym in Fulshear, TX|Martial Arts in Fulshear\b(?!, (?:TX|Texas))|Kids in Fulshear, TX|Conditioning for Kids in Fulshear|Fulshear\?"),
    re.compile(r"best BJJ gym in Fulshear, TX, you're"),
    re.compile(r"Serving Fulshear|We serve Fulshear|[Nn]ear Fulshear|community in Fulshear|each Fulshear (?:community|neighborhood)|for kids in Fulshear|families in Fulshear"),
    re.compile(r"short drive from Fulshear|and Fulshear to train at|accessible from Fulshear|conditioning in Fulshear, Katy"),
    re.compile(r"Fulshear,_Texas|fulshear-"),
    re.compile(r"keeps the name from the Fulshear days|Areas served\*\*: |lineage__where\">Labyrinth BJJ &middot; Fulshear, Texas"),   # the lineage card says where the black belt was awarded: history
    re.compile(r"href=\"[^\"]*fulshear|new-to-fulshear|-fulshear"),
]

# Files whose every mention of Fulshear was written on purpose, with the numbers measured (the rewritten area pages and neighborhoods guide): not listed in the review.
KEEP_FILES = ["areas/*.html", "blog/jiu-jitsu-near-fulshear-neighborhoods.html"]

# Whole lines that are fine: the keywords tag (the searches we want to be found for), and Python or JavaScript comments.
KEEP_LINE = [
    re.compile(r'<meta name="keywords"'),
    re.compile(r"^\s*(?:#|//|\*|/\*)"),
]

# Sentences that say the academy IS in Fulshear (or inside Cross Creek Ranch). After the move none may remain on a page (outside the event pages).
STALE = [
    re.compile(r"(?:academy|gym|school|headquarters|flagship|location|studio|dojo|facility)\s+(?:is\s+|was\s+)?(?:in|at)\s+(?:the\s+heart\s+of\s+)?Fulshear\b(?!\s+(?:in|since)\s+20\d\d)"),
    re.compile(r"\bour Fulshear (?:academy|gym|school|location|flagship|headquarters)"),
    re.compile(r"\bLabyrinth BJJ (?:in|at) Fulshear"),
    re.compile(r"(?:we are|we're|is|are|located|based|sits|found)\s+(?:right\s+)?(?:inside|in|within)\s+Cross Creek Ranch|(?:inside|within) Cross Creek Ranch|Cross Creek area of Fulshear|Cross Creek Bend"),
    re.compile(r"instructor at Fulshear|Labyrinth, Fulshear|BJJ Fulshear TX\"|Labyrinth BJJ Fulshear\b|Labyrinth BJJ, Fulshear"),
]


# A phrase that looks like a claim but is not (the search somebody types).
STALE_OK = [
    re.compile(r"best BJJ gym in Fulshear"),
    re.compile(r"used to be|until [A-Z][a-z]+ 20\d\d|moved from|where the academy was|where we were"),
]


class Rule:
    def __init__(self, id, scope, old, new, min=1, skip=(), regex=False, note="", hidden=False, work=False, blocks=False):
        # work=True: a rule for the working branch's own files (flyer script, caption guard, listing master copy), which are not on main: apply_move.py --work
        # blocks=True: a rule that applies ONLY inside the protected blocks (PROTECT_BLOCKS), where every other rule is held off
        self.id, self.scope, self.new, self.min, self.skip, self.regex, self.note, self.hidden, self.work, self.blocks = id, list(scope), new, min, list(skip), regex, note, hidden, work, blocks
        self.old = re.compile(old) if regex else old


EVERYWHERE = ["pages", "event_pages", "generators", "js", "text", "tests"]
LIVE = ["pages", "generators", "js", "text", "tests", "wharton"]                 # everything but the event pages
WORK = ["artwork", "listing_copy"]                                              # the working branch's own files (not on main)
SITE = ["site_pages", "generators", "js", "text"]                      # the site's own pages and what writes them (not the blog, not the tests)
BLOG = ["blog", "generators"]                                          # the blog posts and the generators that hold their text


def build_rules(cfg):
    o, n = cfg["old"], cfg["new"]
    st_old, st_new = o["street"], n["street"]                      # 6615 West Cross Creek Bend Lane / 10330 Hidden Lake Ln
    unit_old, unit_new = o["unit"], n["unit"]                      # Suite #400 / Building 1
    city_old, city_new = o["city"], n["city"]
    full_old = "%s, %s, %s, %s %s" % (st_old, unit_old, city_old, o["state"], o["zip"])
    full_new = "%s, %s, %s, %s %s" % (st_new, unit_new, city_new, n["state"], n["zip"])
    moved = datetime.date.fromisoformat(cfg["effective_date"]).strftime("%B %Y")
    rs = []
    add = rs.append

    # ═════════ 1. the address and where it sits on the map ═════════
    add(Rule("footer-event", ["event_pages"], "&copy; 2026 Labyrinth BJJ &middot; " + full_old, "&copy; 2026 Labyrinth BJJ &middot; " + full_new, min=0,
             note="the footer of an event page says where the academy is today; the event's own words (where it was held, its calendar entry) keep the old address"))
    add(Rule("footer-address", LIVE, full_old, full_new, note="the footer, the schema text, the FAQ answers and the sentences that give the address in full"))
    add(Rule("event-address-def", ["generators"], "from build_programs import NAV, FOOTER, HEAD, TAIL, PHONE, SITE, ADDRESS, jsonld  # noqa: E402",
             "from build_programs import NAV, FOOTER, HEAD, TAIL, PHONE, SITE, ADDRESS, jsonld  # noqa: E402\n\n"
             "# Where the academy WAS: the event pages below describe events held there, so their \"where\" and calendar entries keep saying so. (ADDRESS, above, is where it is.)\n"
             "EVENT_ADDRESS = \"%s\"" % full_old, min=0,
             note="a frozen copy of the old address for the event pages' own sentences"))
    add(Rule("event-address-use", ["generators"], r"(?<![@\w])ADDRESS(?![@\w])", "EVENT_ADDRESS", regex=True, blocks=True, min=0,
             note="inside the event pages' renderers only: they print the old address where the event was held (the footer, shared, still follows the academy)"))
    add(Rule("address-nbsp", LIVE, "%s, Suite&nbsp;#400, %s, %s %s" % (st_old, city_old, o["state"], o["zip"]),
             "%s, Building&nbsp;1, %s, %s %s" % (st_new, city_new, n["state"], n["zip"]), min=0, note="the same, with a non-breaking space"))
    add(Rule("address-br3", LIVE, "%s<br>%s<br>%s, %s %s" % (st_old, unit_old, city_old, o["state"], o["zip"]),
             "%s<br>%s<br>%s, %s %s" % (st_new, unit_new, city_new, n["state"], n["zip"]), note="the footer's three-line address on the home page"))
    add(Rule("address-br2", LIVE, "%s, %s<br>%s, %s %s" % (st_old, unit_old, city_old, o["state"], o["zip"]),
             "%s, %s<br>%s, %s %s" % (st_new, unit_new, city_new, n["state"], n["zip"]), note="the location card on the home page"))
    add(Rule("address-short-br", LIVE, "6615 W Cross Creek Bend Ln, Suite 400<br>%s, %s %s" % (city_old, o["state"], o["zip"]),
             "%s, %s<br>%s, %s %s" % (st_new, unit_new, city_new, n["state"], n["zip"]), note="the fact boxes on the program and legacy pages"))
    add(Rule("map-popup", LIVE, "6615 W Cross Creek Bend Ln<br>Suite #400, %s, %s %s" % (city_old, o["state"], o["zip"]),
             "%s<br>%s, %s, %s %s" % (st_new, unit_new, city_new, n["state"], n["zip"]), note="the map pin's popup in app.js"))
    add(Rule("street-ennova", LIVE, "The academy is at 6615 W Cross Creek Bend Ln, Suite 400. If you have driven past it, that is us.",
             "The academy is at %s, %s, off Fulshear-Gaston Road in %s." % (st_new, unit_new, city_new),
             note="the Ennova page: the old sentence said you could drive past the gym; the new one says where it is"))
    add(Rule("schema-street", LIVE, '"streetAddress": "%s, %s"' % (st_old, unit_old), '"streetAddress": "%s, %s"' % (st_new, unit_new), note="structured data"))
    add(Rule("schema-locality", LIVE, '"addressLocality": "%s"' % city_old, '"addressLocality": "%s"' % city_new, note="structured data"))
    add(Rule("schema-zip", LIVE, '"postalCode": "%s"' % o["zip"], '"postalCode": "%s"' % n["zip"], note="structured data"))
    add(Rule("lat", LIVE, "%.6f" % o["lat"], "%.6f" % n["lat"], note="the map pin, the geo tags and the structured data: one point"))
    add(Rule("lng", LIVE, "%.6f" % o["lng"], "%.6f" % n["lng"], note="the map pin, the geo tags and the structured data: one point"))
    add(Rule("test-pin-comment", ["tests"], "// 6615 West Cross Creek Bend Lane; 1806 Avenue D", "// %s; 1806 Avenue D" % st_new, min=0, note="the map-pin test's comment"))
    add(Rule("test-pin-name", ["tests"], "is within 150 m of 6615 West Cross Creek Bend Lane", "is within 150 m of %s" % st_new, min=0, note="the map-pin test's name"))
    add(Rule("test-pin-label", ["tests"], "L1pin the Fulshear pin is within", "L1pin the academy pin is within", note="the map-pin test's name"))
    add(Rule("test-pin-label2", ["tests"], "give the same Fulshear point as the map", "give the same academy point as the map", note="the map-pin test's name"))
    add(Rule("test-page-count", ["tests"], "check('L1 all 51 pages served 200', pages.length === 51,", "check('L1 all 52 pages served 200', pages.length === 52,",
             note="the area pages are now eight (the Fulshear page is new), so the site has 52 pages"))
    add(Rule("test-invented-location", ["tests"], '"addressLocality":\\s*"(?!Fulshear)/.test(f)', '"addressLocality":\\s*"(?!Richmond)/.test(f)',
             note="no area page may claim a location of its own: the one academy is now in Richmond"))
    add(Rule("map-pin-comment", ["js"], "// 6615 West Cross Creek Bend Lane", "// %s (the constant keeps the name from the Fulshear days)" % st_new, note="the comment after the pin's coordinates"))
    add(Rule("geo-placename", LIVE, '<meta name="geo.placename" content="%s">' % city_old, '<meta name="geo.placename" content="%s">' % city_new, note="the home page's geo tag"))

    # ═════════ 2. the martial-arts-in-Fulshear page keeps asking the question it exists to answer ═════════
    ma = lambda id, old, new, **k: add(Rule(id, ["ma_files"], old, new, **k))
    ma("ma-title", "Martial Arts in Fulshear, TX: Kids & Adults | Labyrinth BJJ", "Martial Arts Near Fulshear, TX: Kids & Adults | Labyrinth BJJ")
    ma("ma-og-title", "Martial Arts in Fulshear, TX: Kids and Adults", "Martial Arts Near Fulshear, TX: Kids and Adults")
    ma("ma-description", "Martial arts for kids and adults in Fulshear, TX: Brazilian jiu-jitsu, youth wrestling, MMA conditioning and a competition team. First class free.",
       "Martial arts for kids and adults near Fulshear, TX, at our academy in Richmond: Brazilian jiu-jitsu, youth wrestling, MMA conditioning and a competition team. First class free.")
    ma("ma-service", "Martial arts classes in Fulshear, TX for kids from age 3", "Martial arts classes near Fulshear, TX (at our academy in Richmond) for kids from age 3")
    ma("ma-crumb-name", '"name": "Martial Arts in Fulshear"', '"name": "Martial Arts Near Fulshear"')
    ma("ma-crumb-text", ">Martial Arts in Fulshear<", ">Martial Arts Near Fulshear<", min=0)
    ma("ma-h1", "Martial Arts in Fulshear, Texas", "Martial Arts Near Fulshear, Texas")
    ma("ma-faq-q", "What martial arts classes do you teach in Fulshear?", "What martial arts classes do you teach near Fulshear?")
    ma("ma-body", "Labyrinth BJJ is a martial arts school in Fulshear, Texas.", "Labyrinth BJJ is a martial arts school in Richmond, Texas, a short drive from Fulshear and Cross Creek Ranch.")
    ma("ma-where-fact", '<div class="prog-fact__value">Fulshear, TX</div>', '<div class="prog-fact__value">Richmond, TX (near Fulshear)</div>')
    ma("ma-where-fact-src", '("Where", "Fulshear, TX"),', '("Where", "Richmond, TX (near Fulshear)"),')
    add(Rule("ma-home-link", ["home"], "Martial arts in Fulshear &rarr;", "Martial arts near Fulshear &rarr;"))
    add(Rule("ma-hub-link", ["programs_hub"], "Searching for martial arts in Fulshear in general", "Searching for martial arts near Fulshear in general"))

    # ═════════ 3. the brand line and the places titles name ═════════
    add(Rule("title-suffix", SITE, "| Labyrinth BJJ Fulshear", "| Labyrinth BJJ Richmond", note="every page title that ends with the brand and the town"))
    add(Rule("alt-brand-town", SITE, "Labyrinth BJJ Fulshear TX", "Labyrinth BJJ Richmond TX", note="the coach photos' alt text on the home page"))
    add(Rule("brand-comma-town", SITE, "Labyrinth BJJ, Fulshear TX", "Labyrinth BJJ, Richmond TX", note="og titles: 'Class Schedule: Labyrinth BJJ, Fulshear TX' and the like"))
    add(Rule("page-title-town", SITE, "Class Schedule: Fulshear, TX", "Class Schedule: Richmond, TX"))
    add(Rule("page-title-town2", SITE, "Membership Prices: Fulshear, TX", "Membership Prices: Richmond, TX"))
    add(Rule("programs-og", SITE, "Programs at Labyrinth BJJ: Fulshear, TX", "Programs at Labyrinth BJJ: Richmond, TX"))
    add(Rule("coaches-title", SITE, "Black Belt Instructors in Fulshear |", "Black Belt Instructors in Richmond |"))
    add(Rule("legacy-title", SITE, "Team Legacy has merged with Labyrinth BJJ | Fulshear, TX", "Team Legacy has merged with Labyrinth BJJ | Richmond, TX"))
    add(Rule("legacy-badge", SITE, "It&rsquo;s official &middot; Fulshear, TX", "It&rsquo;s official &middot; Richmond, TX"))
    add(Rule("legacy-desc", SITE, "First class free, seven days a week in Fulshear.", "First class free, seven days a week in Richmond."))
    add(Rule("blog-title-suffix", BLOG, "Confidence &amp; Discipline | Fulshear, TX", "Confidence &amp; Discipline | Richmond, TX"))
    add(Rule("blog-index-title", BLOG, "Blog: Kids &amp; Adult BJJ in Fulshear, TX | Labyrinth BJJ", "Blog: Kids &amp; Adult BJJ in Richmond, TX | Labyrinth BJJ"))
    add(Rule("blog-index-sub", BLOG, "articles from the mats in Fulshear.", "articles from the mats in Richmond."))
    add(Rule("fact-academy", SITE, '<div class="prog-fact__value">Labyrinth, Fulshear</div>', '<div class="prog-fact__value">Labyrinth, Richmond</div>'))
    add(Rule("fact-academy-src", SITE, '"Labyrinth, Fulshear"', '"Labyrinth, Richmond"', min=0))

    # ═════════ 4. "Labyrinth BJJ in Fulshear" and the other ways of saying where the classes are ═════════
    add(Rule("bjj-in-town-tx", LIVE, "Labyrinth BJJ in Fulshear, TX", "Labyrinth BJJ in Richmond, TX", skip=["site-test.mjs", "booking.test.mjs"], note="alt texts, descriptions, schema"))
    add(Rule("bjj-in-town-texas", LIVE, "Labyrinth BJJ in Fulshear, Texas", "Labyrinth BJJ in Richmond, Texas", skip=["site-test.mjs", "booking.test.mjs"]))
    add(Rule("bjj-in-town", LIVE, "Labyrinth BJJ in Fulshear", "Labyrinth BJJ in Richmond", skip=["site-test.mjs", "booking.test.mjs"], note="links and sentences"))
    add(Rule("team-photo-alt", SITE, "The Labyrinth BJJ team in Fulshear, Texas", "The Labyrinth BJJ team in Richmond, Texas"))
    add(Rule("our-academy", LIVE, "at our Fulshear academy", "at our Richmond academy", skip=["site-test.mjs", "booking.test.mjs"]))
    add(Rule("our-hq", BLOG, "our Fulshear headquarters", "our Richmond headquarters"))
    add(Rule("our-flagship", BLOG, "our Fulshear flagship", "our Richmond flagship"))
    add(Rule("katy-second-location", BLOG, 'a second location in <a href="https://labyrinth.vision/#locations">Fulshear</a>', 'a second location in <a href="https://labyrinth.vision/#locations">Richmond</a>'))
    add(Rule("home-comment-flagship", ["site_pages"], "<!-- Fulshear Flagship -->", "<!-- Richmond Flagship -->"))

    # ═════════ 5. "classes in Fulshear, TX": the program pages, the home page's descriptions, the schema ═════════
    add(Rule("in-town-tx", SITE, "in Fulshear, TX", "in Richmond, TX", note="descriptions of the classes: where they are"))
    add(Rule("in-town-texas", SITE, "Brazilian Jiu-Jitsu & Martial Arts in Fulshear, Texas", "Brazilian Jiu-Jitsu & Martial Arts in Richmond, Texas", note="the home page's h1"))
    add(Rule("in-town-texas-2", SITE, "Elite Brazilian Jiu-Jitsu in Fulshear, Texas.", "Elite Brazilian Jiu-Jitsu in Richmond, Texas."))
    add(Rule("in-town-texas-3", SITE, "memberships at Labyrinth BJJ in Fulshear, Texas.", "memberships at Labyrinth BJJ in Richmond, Texas.", min=0))
    add(Rule("home-badge", SITE, "TAC Team Affiliated &middot; Fulshear, Texas", "TAC Team Affiliated &middot; Richmond, Texas", min=0))
    add(Rule("home-badge2", SITE, "TAC Team Affiliated · Fulshear, Texas", "TAC Team Affiliated · Richmond, Texas", min=0))
    add(Rule("home-og", SITE, "youth wrestling in Fulshear & Katy, TX.", "youth wrestling in Richmond & Katy, TX."))
    add(Rule("home-title", SITE, "Martial Arts Academy | Fulshear TX</title>", "Martial Arts Academy | Richmond TX</title>"))
    add(Rule("home-description", SITE, "Martial arts for kids and adults in Richmond, TX: Brazilian jiu-jitsu, youth wrestling and all-ages strength classes.",
             "Martial arts for kids and adults in Richmond, TX, near Fulshear: Brazilian jiu-jitsu, youth wrestling and all-ages strength classes.",
             note="runs after in-town-tx has already said Richmond"))
    add(Rule("sc-faq", SITE, "at 4:15 PM in Fulshear and is open to all ages", "at 4:15 PM in Richmond and is open to all ages", note="the strength class FAQ, in the schema"))
    add(Rule("sc-faq-html", SITE, "</strong> in Fulshear and is open to all ages", "</strong> in Richmond and is open to all ages", note="the same answer, as the page shows it"))
    add(Rule("sc-home", SITE, "strength and conditioning in Fulshear, TX, coached", "strength and conditioning in Richmond, TX, coached", min=0))
    add(Rule("jj-in-town", SITE, "Jiu-Jitsu in Fulshear", "Jiu-Jitsu in Richmond", note="h1s on the program pages"))
    add(Rule("camp-h1", SITE, "Summer Camp in Fulshear", "Summer Camp in Richmond"))
    add(Rule("wrestling-h1", SITE, "Youth Wrestling in Fulshear", "Youth Wrestling in Richmond"))
    add(Rule("under-one-roof", SITE, "Five programs under one roof in Fulshear", "Five programs under one roof in Richmond"))
    add(Rule("teach-it-in", SITE, "We teach it in Fulshear to about", "We teach it in Richmond to about"))
    add(Rule("schedule-lead", SITE, "36 classes a week, seven days, in Fulshear.", "36 classes a week, seven days, in Richmond.", min=0, note="the number of classes is generated; this is the sentence"))
    add(Rule("schedule-lead-src", ["generators"], "seven days, in Fulshear.", "seven days, in Richmond.", min=0))
    add(Rule("support-lead", SITE, "the academy in Fulshear and the Cornerman timer", "the academy in Richmond and the Cornerman timer"))
    add(Rule("privacy-hq", SITE + ["wharton"], "Labyrinth BJJ is headquartered in Fulshear, Texas.", "Labyrinth BJJ is headquartered in Richmond, Texas."))
    add(Rule("footer-brand-desc", SITE, "World-class instruction in Fulshear, Katy, and beyond.", "World-class instruction in Richmond, Katy, and beyond."))
    add(Rule("footer-rights", SITE, "All rights reserved. Fulshear, TX.", "All rights reserved. Richmond, TX."))
    add(Rule("bio-katy-coach", SITE, "Head coach of the Katy location and instructor at Fulshear.", "Head coach of the Katy location and instructor at Richmond."))
    add(Rule("bio-katy-coach2", SITE, "Head coach of the Katy academy and an instructor at Fulshear.", "Head coach of the Katy academy and an instructor at Richmond."))
    add(Rule("llms-lead", ["text"], "Brazilian jiu-jitsu academy in Fulshear, Texas.", "Brazilian jiu-jitsu academy in Richmond, Texas, near Fulshear."))

    # ═════════ 6. sentences in the blog that say where the academy is ═════════
    b = lambda id, old, new, **k: add(Rule(id, BLOG, old, new, **k))
    b("blog-benefits", 'families drive from across Katy, Cinco Ranch, and Richmond to train at <a href="https://labyrinth.vision/#programs">Labyrinth BJJ in Richmond</a>.',
      'families drive from across Katy, Cinco Ranch, and Fulshear to train at <a href="https://labyrinth.vision/#programs">Labyrinth BJJ in Richmond</a>.',
      note="runs after bjj-in-town has changed the link text; the list of places families drive from loses Richmond (we are there) and gains Fulshear")
    b("blog-best-where", "Labyrinth BJJ is located at 6615 West Cross Creek Bend Lane, Suite #400, in the heart of Fulshear.",
      "Labyrinth BJJ is located at %s, %s, in Richmond, off Fulshear-Gaston Road and about five miles from Cross Creek Ranch." % (st_new, unit_new))
    b("blog-best-access", "Located in the Cross Creek area of Fulshear, our academy is easily accessible from Katy, Cinco Ranch, Richmond, Simonton, and Brookshire.",
      "Located off Fulshear-Gaston Road in Richmond, our academy is easily accessible from Fulshear, Katy, Cinco Ranch, Simonton, and Brookshire.")
    b("blog-best-locations", "<li><strong>Two locations</strong>, Fulshear and Katy</li>", "<li><strong>Two locations</strong>, Richmond and Katy</li>")
    b("blog-best-desc", "top-ranked Brazilian Jiu-Jitsu academy in Fulshear, Texas", "top-ranked Brazilian Jiu-Jitsu academy near Fulshear, Texas")
    b("blog-choose-card", "top-ranked academy in Fulshear:", "top-ranked academy near Fulshear:")
    b("blog-karate", "our kids BJJ classes in Fulshear</a>", "our kids BJJ classes in Richmond</a>")
    b("blog-homeschool-where", "We are at 6615 West Cross Creek Bend Lane, Suite #400, Fulshear, or on (281) 393-7983.", "We are at %s, %s, Richmond, or on (281) 393-7983." % (st_new, unit_new))
    b("blog-homeschool-around", "master-planned communities around us: Cross Creek Ranch", "master-planned communities around Fulshear: Cross Creek Ranch")
    b("blog-confidence-desc", "with Labyrinth's Fulshear class times by age", "with Labyrinth's class times by age")
    b("blog-confidence-body", '</a> in Fulshear: how confidence and discipline', '</a> in Richmond: how confidence and discipline')
    b("blog-cost-where", "We are at 6615 West Cross Creek Bend Lane in Fulshear, or on (281) 393-7983", "We are at %s in Richmond, or on (281) 393-7983" % st_new)
    b("blog-newto-where", "we are at 6615 West Cross Creek Bend Lane in Fulshear, and the first class is free.", "we are at %s in Richmond, a short drive from Fulshear, and the first class is free." % st_new)
    b("blog-choose-locations", '<a href="https://labyrinth.vision/#locations">Fulshear or Katy location</a>', '<a href="https://labyrinth.vision/#locations">Richmond or Katy location</a>')

    # ═════════ 7. what is built from the address elsewhere ═════════
    # The Wharton site's privacy policy is made from this site's, and its builder stops unless it finds the sentences it expects (so the Fulshear address
    # can never reach it by accident). Those sentences have just changed, so the builder must look for the new ones. (The footer-address and privacy-hq
    # rules above already reach the builder, because "wharton" is in their scope.)
    add(Rule("wharton-guard", ["wharton"], 'if "Fulshear" in src and "6615" in src:', 'if "Richmond" in src and "10330" in src:', note="the Wharton builder's last check, that the main academy's address did not reach the Wharton policy"))
    add(Rule("wharton-guard-msg", ["wharton"], "the Fulshear address survived in the Wharton privacy policy", "the Richmond address survived in the Wharton privacy policy"))
    add(Rule("wharton-doc", ["wharton"], "a silent miss would leave the Fulshear street address", "a silent miss would leave the main academy's street address"))
    add(Rule("wharton-comment", ["wharton"], "The main site's policy gives the Fulshear number;", "The main site's policy gives the main academy's number;"))
    add(Rule("wharton-test-doc", ["wharton"], "no forbidden strings (the Fulshear street address,", "no forbidden strings (the main academy's street address,"))
    add(Rule("wharton-test-forbidden", ["wharton"], "[/6615\\b|Cross Creek|77441/i, 'the Fulshear street address'],", "[/6615\\b|Cross Creek|77441|10330\\b|Hidden Lake|77406/i, 'the main academy street address'],",
             note="the Wharton pages must carry neither the old street address nor the new one"))
    add(Rule("wharton-test-privacy-doc", ["wharton"], "// The privacy policy: this domain, not Fulshear's address", "// The privacy policy: this domain, not the main academy's address"))
    add(Rule("wharton-test-privacy", ["wharton"], "no Fulshear street address, no leftover main-site nav'", "no main academy street address, no leftover main-site nav'"))
    add(Rule("wharton-test-privacy2", ["wharton"], "!/6615|Cross Creek|77441/.test(priv)", "!/6615|Cross Creek|77441|10330|Hidden Lake|77406/.test(priv)"))
    add(Rule("poster-foot", ["artwork"], "6615 W Cross Creek Bend Ln, Suite #400, Fulshear", "%s, %s, %s" % (st_new, unit_new, city_new), note="the adult-classes flyer's footer", work=True))
    add(Rule("photo-guard", ["artwork"], "('6615', 'Cross Creek', 'Suite', '77441', 'Bend Lane',", "('%s', 'Hidden Lake', '%s', '%s', 'Hidden Lake Ln'," % (st_new.split(" ")[0], unit_new, n["zip"]),
             note="the muse prompts for the photo posts refuse a street address in a caption: it must now refuse the new one", work=True))
    add(Rule("photo-guard-mutation", ["artwork"], "'6615 West Cross Creek Bend Lane\\n#BrazilianJiuJitsu'", "'%s\\n#BrazilianJiuJitsu'" % st_new, note="the check that the guard catches a street address", work=True))

    # ═════════ 8. the master copy the directory listings are filled in from ═════════
    lc = lambda id, old, new, **k: add(Rule(id, ["listing_copy"], old, new, work=True, **k))
    lc("listing-pin", "Map pin guide: %.6f, %.6f" % (o["lat"], o["lng"]), "Map pin guide: %.6f, %.6f" % (n["lat"], n["lng"]), note="street-range point; replace with the entrance pin once it has been checked on the map")
    lc("listing-title", "(Labyrinth BJJ, Fulshear)", "(Labyrinth BJJ, Richmond)")
    lc("listing-street", "Address: 6615 West Cross Creek Bend Lane, Suite 400", "Address: %s, %s" % (st_new, unit_new), note="name, address, phone: the address block of the master copy")
    lc("listing-city", "City: Fulshear", "City: %s" % city_new)
    lc("listing-zip", "ZIP: 77441", "ZIP: %s\nFormer address (until %s; only for finding and merging the old listings, never to be published as the address): %s, Suite 400, %s, TX %s" % (
        n["zip"], moved, st_old, city_old, o["zip"]))
    lc("listing-short", "Brazilian jiu-jitsu for kids and adults in Fulshear, TX. Gi and No-Gi, all levels, beginners welcome. Your first class is free.",
       "Brazilian jiu-jitsu for kids and adults in Richmond, TX, near Fulshear and Katy. Gi and No-Gi, all levels, beginners welcome. First class free.")
    lc("listing-medium", "in Fulshear, Texas: Gi and No-Gi classes for every level", "in Richmond, Texas, near Fulshear and Katy: Gi and No-Gi classes for every level")
    lc("listing-long", "Labyrinth BJJ is a Brazilian jiu-jitsu academy in Fulshear, Texas, teaching adults and kids from age 3.",
       "Labyrinth BJJ is a Brazilian jiu-jitsu academy in Richmond, Texas, off Fulshear-Gaston Road, teaching adults and kids from age 3.")
    lc("listing-serving", "Serving Fulshear, Katy, Cinco Ranch, Richmond and the west Houston area.", "Serving Richmond, Fulshear, Katy, Cinco Ranch and the west Houston area.", min=2,
       note="in the listing master copy and in the Google profile's description")
    # the Google Business Profile's own master copy (google-profile-update.txt)
    lc("gbp-address", "Address: " + full_old, "Address: " + full_new, note="the profile's address, as the muse job for the profile reads it")
    lc("gbp-description", "Labyrinth BJJ is a martial arts school in Fulshear, Texas, teaching", "Labyrinth BJJ is a martial arts school in Richmond, Texas, near Fulshear, teaching")
    lc("gbp-team-legacy", "now train at Labyrinth BJJ, " + st_old + ", Suite 400, " + city_old + ", " + o["state"] + " " + o["zip"] + ".",
       "now train at Labyrinth BJJ, " + full_new + ".", note="the old Team Legacy listing's description says where its students went")
    return rs


# ───────────────────────── the area pages' generator ─────────────────────────
AREAS_FILE = "scripts/build_areas.py"
# The kit replaces the AREAS list wholesale, so it must know it is replacing the list it was written against. This is a hash of that list in scripts/build_areas.py on
# main on 2026-10-15 (before any rule). If it differs on the day, somebody has edited an area page since: carry the edit into areas_data.py, then set the new hash.
AREAS_BASE_SHA = "8038832502166ff0"

# (id, old text, new text). Each old text must occur exactly once in scripts/build_areas.py after the rules; [[tokens]] are filled from move.json.
AREA_PATCHES = [
    ("doc-not", """WHAT THESE PAGES ARE NOT. There is one academy, in Fulshear, plus the separate
Katy school. No page here claims a location in the town it is named after, and
none carries a LocalBusiness block with a fake address. They are Service pages
with `areaServed` set, provided by the Fulshear business.""",
     """WHAT THESE PAGES ARE NOT. There is one academy, in Richmond (the postal city
of [[street]], off Fulshear-Gaston Road), plus the separate Katy school. Only
the Richmond page names the town the academy is in; no other page here claims a
location in the town it is named after, and none carries a LocalBusiness block
with a fake address. They are Service pages with `areaServed` set, provided by
the Richmond business."""),
    ("doc-roads", """Roads: FM 359 runs 7.0 miles from Fulshear northwest to I-10 at Brookshire, and
southeast to Richmond.

Distances are deliberately given as rough bands rather than minute counts. Only
Brookshire's seven miles is a checked figure; the rest are estimates, which is
exactly why none of them is written as a precise drive time. The neighbourhoods
blog post makes the same choice and it was right to.""",
     """Roads: FM 723 is the road south from the academy's turn to Richmond and
Rosenberg; FM 1093 runs east from Simonton through Fulshear toward the Grand
Parkway; FM 359 joins Fulshear to I-10 at Brookshire.

Distances are road miles, rounded, and the minutes are with no traffic. They
were measured with OSRM on OpenStreetMap data, from each place to the street
point for [[street]] (and to the Katy academy, 1806 Avenue D, for comparison), so
they are the best case, and the pages say "with no traffic" wherever a minute
count appears. If the academy's entrance is more than a quarter of a mile from
that point, measure again."""),
    ("nearer-block", r"""    nearer = ("Our <a href=\"https://labyrinthbjjkaty.com\">Katy academy</a> is likely the nearer of the two."
              if a["which"] == "katy" else
              "The Fulshear academy is the nearer of our two for %s." % place)

""", ""),
    ("where-paragraph", """      <p><strong>Where we actually are.</strong> There is one Labyrinth academy in Fulshear (%(address)s, inside Cross Creek Ranch on Cross Creek Bend Lane) and a second in Katy. We do not have a location in %(place)s. %(nearer)s</p>""",
     """      <p><strong>Where we actually are.</strong> %(where)s</p>"""),
    ("where-values", """        "upper": place.upper(), "address": ADDRESS_HTML, "nearer": nearer,""",
     """        "h1": a.get("h1", "Jiu-Jitsu for %s" % place),
        "upper": place.upper(), "where": a["where"].replace("{address}", ADDRESS_HTML),"""),
    ("h1", """    <h1 class="prog-hero__title">Jiu-Jitsu for %(place)s</h1>""", """    <h1 class="prog-hero__title">%(h1)s</h1>"""),
    ("hub-title", """"title": "Areas We Serve: Fulshear, Katy, Richmond &amp; Beyond | Labyrinth BJJ",""",
     """"title": "Areas We Serve: Richmond, Fulshear, Katy &amp; Beyond | Labyrinth BJJ","""),
    ("hub-description", """"description": "Where our students drive in from: Tamarron, Brookshire, Simonton, Richmond, Cinco Ranch, Rosenberg and Sealy. Which classes suit which drive.",""",
     """"description": "Where our students drive in from: Fulshear, Tamarron, Cinco Ranch, Rosenberg, Simonton, Brookshire and Sealy, plus Richmond itself. Which classes suit which drive.","""),
    ("hub-schema", """"description": "The communities around Fulshear, Texas that train at Labyrinth BJJ.",""",
     """"description": "The communities around Richmond and Fulshear, Texas that train at Labyrinth BJJ.","""),
    ("hub-lead", """One academy, in Fulshear, inside Cross Creek Ranch, plus our second school in Katy.""",
     """One academy, in Richmond off Fulshear-Gaston Road, plus our second school in Katy."""),
    ("hub-local", """Live in Cross Creek Ranch, Cross Creek West, Jordan Ranch, Fulbrook, Churchill Farms or Fulshear Lakes? You are local. The <a href="/blog/jiu-jitsu-near-fulshear-neighborhoods">Fulshear neighborhoods guide</a> covers those in detail.""",
     """Live in Cross Creek Ranch, Cross Creek West or Churchill Farms? You are about five miles from the academy. Fulshear Lakes is about nine, and Jordan Ranch is nearer to our Katy academy. The <a href="/blog/jiu-jitsu-near-fulshear-neighborhoods">Fulshear neighborhoods guide</a> has the drive from each."""),
]

# ───────────────────────── blog posts that are rewritten, not edited ─────────────────────────
BLOG_POSTS = [
    dict(
        file="blog/jiu-jitsu-near-fulshear-neighborhoods.html",
        body_file="blog_neighborhoods.html",
        # the same safeguard for the guide's body (the text between <article class="article-body"> and </article>, on main on 2026-10-15)
        base_sha="32e0abf4a4c20338",
        patches=lambda cfg: [
            ('<p class="article-header__subtitle">We are inside Cross Creek Ranch, which makes us the closest academy to a good part of Fulshear. Here is the practical detail.</p>',
             '<p class="article-header__subtitle">We are on Hidden Lake Ln in Richmond, about five miles from Cross Creek Ranch. Here is the drive from each Fulshear neighborhood, measured.</p>'),
            ('"dateModified": "2026-07-28"', '"dateModified": "%s"' % cfg["effective_date"]),
        ],
    ),
]
