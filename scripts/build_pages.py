#!/usr/bin/env python3
"""Build /schedule, /pricing and the coach pages under /coaches/.

    python3 scripts/build_pages.py

Why. Three competitors' schedule pages outrank our home page for "jiu jitsu
class schedule Fulshear": gbfulshear.com/class-schedule, liberatusjiujitsu.com
/class-schedule and teamlegacydojo.com/schedule. Liberatus has a page for their
6 AM class alone. Ours was a redirect to a fragment, and a fragment cannot rank.
Same for pricing. Same for the coaches: Gracie Barra Fulshear leads with
"Professor Daniel Vitti, the only Brazilian 3rd-degree black belt in the area"
and it works, while our three black belts had no URL between them.

The timetable and the prices come from schedule_data, not from here. This file
decides how they are shown; that one is what they are.

LINEAGE. Who promoted whom is the first thing anybody in the sport looks for,
and the line here is unusually clean: Matt Leighton of Citadel BJJ in Iowa City
promoted Anthony Curry, and Anthony promoted Shaun Lawler: the only black belt
he has awarded in five years of running the academy. Both facts came from the
academy. It is the strongest thing on these pages and the one a competitor
cannot copy, so it gets a section of its own rather than a clause in a bio.

WHAT IS STILL NOT HERE. Competition records, promotion dates, and the detail
behind "extensive coaching and training credentials". The academy has said the
credentials are extensive but not what they are, and a page that says
"extensive" without naming anything reads as padding. Add specifics to
`credentials` on a coach and they render; leave it out and the page does not
gesture at them.
"""
import html
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import schedule_data  # noqa: E402
import schedule_component  # noqa: E402
import jits_data  # noqa: E402
from build_programs import NAV, FOOTER, HEAD, TAIL, PHONE, SITE, ADDRESS, jsonld  # noqa: E402

# Every page this file writes goes through stamp() so the shared CSS and JS are
# requested with a content hash. Without it a returning visitor gets new markup
# and a four-hour-old stylesheet; scripts/stamp_assets.py explains why.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from stamp_assets import stamp

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

PROVIDER = {
    "@type": "SportsActivityLocation",
    "name": "Labyrinth BJJ",
    "url": SITE,
    "telephone": "+1-281-393-7983",
    "address": {
        "@type": "PostalAddress",
        "streetAddress": "6615 West Cross Creek Bend Lane, Suite #400",
        "addressLocality": "Fulshear", "addressRegion": "TX",
        "postalCode": "77441", "addressCountry": "US",
    },
}


def crumbs(trail):
    """trail is [(name, href), …] after Home; the last is the current page."""
    parts = ['<a href="/">Home</a>']
    for i, (name, href) in enumerate(trail):
        parts.append('<span class="prog-crumbs__sep">&rsaquo;</span>')
        parts.append('<span class="prog-crumbs__current">%s</span>' % name
                     if i == len(trail) - 1 else '<a href="%s">%s</a>' % (href, name))
    return ('<div class="container">\n  <nav class="prog-crumbs" aria-label="Breadcrumb">\n    '
            + "\n    ".join(parts) + "\n  </nav>\n</div>")


def crumb_schema(trail):
    items = [{"@type": "ListItem", "position": 1, "name": "Home", "item": SITE}]
    for i, (name, href) in enumerate(trail, start=2):
        items.append({"@type": "ListItem", "position": i, "name": name, "item": SITE + href})
    return {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": items}


def faq_block(faqs):
    return "\n".join("""      <div class="faq-item">
        <button class="faq-item__question" aria-expanded="false">
          <span>%s</span>
          <svg class="faq-item__icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        <div class="faq-item__answer"><p>%s</p></div>
      </div>""" % (q, a) for q, a in faqs)


def faq_schema(faqs):
    return {"@context": "https://schema.org", "@type": "FAQPage",
            "mainEntity": [{"@type": "Question", "name": q,
                            "acceptedAnswer": {"@type": "Answer", "text": re.sub(r"<[^>]+>", "", a)}}
                           for q, a in faqs]}


# ── /schedule ────────────────────────────────────────────────────────────────

SCHEDULE_FAQS = [
    ("Can I just turn up to a class?",
     "For a first class, book it. It takes a minute and it means a coach is expecting you and has a loaner gi ready. Adults can book into any class on this timetable. Kids trials run Friday afternoons in the Gi for ages 3 and up, or Saturday morning: MMA Conditioning at 9:00 (all ages) or No-Gi grappling at 10:00 (ages 7 and up)."),
    ("What does ADV mean on the timetable?",
     "Advanced. Those classes need a gray-white belt or higher, or two or more years of wrestling. They move faster and drill at a higher intensity. Every class without that marker is open to a complete beginner, including somebody who has never trained anywhere."),
    ("What is the difference between the Gi and No-Gi classes?",
     "Gi is the traditional uniform, and the jacket and trousers become part of the game: grips, collar chokes, sweeps off the sleeve. No-Gi is a rashguard and shorts: faster, more wrestling-like, nothing to hold on to. Most people here train both, and the same membership covers both."),
    ("Do you run early morning classes?",
     "Yes: 6:30 AM, Monday through Thursday. Gi on Monday and Wednesday, No-Gi on Tuesday and Thursday. It is the class people are most skeptical about and the one they end up building the week around."),
    ("Does the timetable change in school holidays?",
     "Occasionally, and the live calendar is the place to check. Calendar.labyrinth.vision carries any changes, closures and tournament weekends. This page is the standing weekly timetable."),
    ("Is open mat only for members?",
     "No. Sunday open mat at 10:30 AM is free rolling for all levels and all affiliations. Visitors from other academies are welcome, and so is anybody who wants to see the room before committing to anything."),
]


def render_schedule():
    url = SITE + "/schedule"
    c = schedule_data.counts()

    week = schedule_component.render("sched")

    head = HEAD % {
        "title": "Class Schedule: Fulshear, TX | Labyrinth BJJ",
        "description": "The full weekly BJJ class schedule in Fulshear, TX. %d classes, seven days a week: kids from 4:45 PM, adults from 6:30 AM. Gi, No-Gi, wrestling." % c["total"],
        "url": url,
        "og_title": "Class Schedule: Labyrinth BJJ, Fulshear TX",
        "image": SITE + "/assets/og-image.jpg",
        "schema": "\n".join([jsonld(crumb_schema([("Schedule", "/schedule")])),
                             jsonld(faq_schema(SCHEDULE_FAQS)),
                             jsonld({"@context": "https://schema.org", "@type": "WebPage",
                                     "name": "Class Schedule", "url": url,
                                     "about": PROVIDER})]),
    }

    facts = "".join(
        '      <div class="prog-fact"><div class="prog-fact__label">%s</div>'
        '<div class="prog-fact__value">%s</div></div>\n' % (l, v)
        for l, v in [("Classes a week", "<em>%d</em>" % c["total"]),
                     ("Days", "Seven"),
                     ("Earliest", "6:30 AM"),
                     ("First class", "<em>Free</em>")])

    return "\n".join([head, NAV, crumbs([("Schedule", "/schedule")]), """
<header class="prog-hero">
  <div class="container">
    <p class="section-label">Timetable</p>
    <h1 class="prog-hero__title">Class Schedule</h1>
    <p class="prog-hero__lead">%(total)d classes a week, seven days, in Fulshear. Adults train from 6:30 in the morning to half past seven at night; kids run from 4:45 PM on weekdays and through Saturday morning. Every class here is bookable, and the first one is free.</p>
    <div class="prog-hero__cta">
      <a data-book-trial href="/#book" class="btn btn--gold">Book a Free Class</a>
      <a href="https://calendar.labyrinth.vision" target="_blank" rel="noopener noreferrer" class="btn btn--ghost">Live Calendar</a>
    </div>
    <div class="prog-facts">
%(facts)s    </div>
  </div>
</header>

<section class="prog-section" id="times">
  <div class="container">
    <div class="fade-in">
      <p class="section-label">The week</p>
      <h2 class="section-title section-title--lg">EVERY CLASS WE RUN</h2>
    </div>
  %(week)s
  </div>
</section>

<section class="prog-section">
  <div class="container">
    <div class="fade-in">
      <p class="section-label">Reading the timetable</p>
      <h2 class="section-title section-title--lg">WHICH CLASS IS YOURS</h2>
    </div>
    <div class="prog-siblings stagger">
      <a href="/programs/kids-bjj-fulshear" class="prog-sibling"><div class="prog-sibling__title">Kids, ages 3–15</div><div class="prog-sibling__desc">4:45 PM and 5:15 PM on weekdays, plus Saturday morning. Three separated age groups.</div></a>
      <a href="/programs/adult-bjj-fulshear" class="prog-sibling"><div class="prog-sibling__title">Adults, any level</div><div class="prog-sibling__desc">6:30 AM, 11:00 AM and 6:30 PM. Gi and No-Gi, complete beginners included.</div></a>
      <a href="/programs/bjj-competition-team" class="prog-sibling"><div class="prog-sibling__title">Competition team</div><div class="prog-sibling__desc">Friday evening, plus the advanced grappling sessions midweek and Saturday at noon.</div></a>
      <a href="/programs/youth-wrestling-fulshear" class="prog-sibling"><div class="prog-sibling__title">Youth wrestling</div><div class="prog-sibling__desc">Wednesday and Thursday at 7:30 PM, Sunday at 1:00 PM. Ages 7–17.</div></a>
      <a href="/coaches/scott-jones" class="prog-sibling"><div class="prog-sibling__title">MMA Conditioning</div><div class="prog-sibling__desc">Saturday at 9:00 AM, all ages, with Scott Jones. A first class is free.</div></a>
      <a href="/blog/strength-and-conditioning-for-kids-fulshear" class="prog-sibling"><div class="prog-sibling__title">Strength &amp; conditioning</div><div class="prog-sibling__desc">Tuesday and Thursday at 4:15 PM. All ages in one session, in every membership.</div></a>
      <a href="/pricing" class="prog-sibling"><div class="prog-sibling__title">What it costs</div><div class="prog-sibling__desc">Every membership, punch card and add-on, with nothing held back for a phone call.</div></a>
    </div>
  </div>
</section>

<section class="faq">
  <div class="container container--narrow">
    <div class="fade-in">
      <p class="section-label">Questions</p>
      <h2 class="section-title section-title--lg">ABOUT THE TIMETABLE</h2>
    </div>
    <div class="faq__list stagger">
%(faqs)s
    </div>
  </div>
</section>

<div class="container">
  <div class="prog-close fade-in">
    <h2 class="prog-close__title">PICK ONE AND COME</h2>
    <p class="prog-close__text">Adults can book into any class above. Kids trials are Friday afternoon in the Gi, or Saturday morning: MMA Conditioning at 9:00 (all ages) or No-Gi grappling at 10:00. It is free either way and nobody will call you afterwards to talk you into anything.</p>
    <div class="prog-hero__cta" style="justify-content:center">
      <a data-book-trial href="/#book" class="btn btn--gold">Book a Free Class</a>
      <a href="tel:2813937983" class="btn btn--ghost">Call %(phone)s</a>
    </div>
  </div>
</div>""" % {"total": c["total"], "facts": facts, "week": week,
             "faqs": faq_block(SCHEDULE_FAQS), "phone": PHONE},
        """
<script src="/schedule.js"></script>""", TAIL % {"footer": FOOTER}])


# ── /pricing ─────────────────────────────────────────────────────────────────

PRICING_FAQS = [
    ("Is there a joining fee or a contract?",
     "No joining fee, and no long-term contract. Everything is month-to-month with 30 days notice to cancel. Ask about the six and twelve month paid-in-full discounts if you would rather pay up front for a lower rate."),
    ("Why do kids memberships cost more than adult ones?",
     "Because the kids classes are smaller and more heavily staffed. A room of eight-year-olds needs a coach watching every pair, and the age groups are separated rather than combined, which means more classes on the timetable serving fewer children each."),
    ("What is actually included?",
     "Everything on the timetable your membership covers, with nothing charged on top: Gi and No-Gi, competition classes, youth wrestling, the all-ages strength and conditioning session, and Sunday open mat. The sauna and cold plunge is the one genuine add-on at $60 a month."),
    ("Do I need to buy a gi before I start?",
     "No. Come in a t-shirt and shorts with no zips or pockets and we will lend you a gi for any class that needs one. If you carry on training we will help you get fitted properly, but nobody needs to spend money to find out whether they like it."),
    ("What if I can only train twice a week?",
     "Then the 8-class membership is built for you, and two classes a week is genuinely enough to improve steadily. You can move between plans month to month, so start there and change if you find yourself wanting more."),
    ("Can a family train on one membership?",
     "The family plan covers two members on unlimited classes at $399 a month, with additional members at $80 each. It works across kids and adults, so a parent training alongside a child is the normal case rather than an exception."),
]


def price_card(name, amount, per, features, feature_flag):
    return """      <div class="price-card%s">
        <h3 class="price-card__name">%s</h3>
        <div class="price-card__amount">%s<span>%s</span></div>
        <ul class="price-card__list">
%s
        </ul>
        <a data-book-trial href="/#book" class="price-card__btn">Start Free</a>
      </div>""" % (" price-card--feature" if feature_flag else "", name, amount, per,
                   "\n".join("          <li>%s</li>" % f for f in features))


def render_pricing():
    url = SITE + "/pricing"
    P = schedule_data.PRICING

    offers = []
    for group in ("adult", "kids", "family"):
        for name, amount, per, feats, _ in P[group]:
            offers.append({
                "@type": "Offer",
                "name": "%s: %s" % ({"adult": "Adult", "kids": "Kids & Teens",
                                      "family": "Family"}[group], name),
                "price": amount.lstrip("$"),
                "priceCurrency": "USD",
                "url": url,
                "availability": "https://schema.org/InStock",
                "description": "; ".join(feats),
            })

    head = HEAD % {
        "title": "Membership Prices: Fulshear, TX | Labyrinth BJJ",
        "description": "What jiu-jitsu costs in Fulshear, TX. Adults from $179/mo, kids from $239/mo, family plan $399/mo. Month to month, no contract, first class free.",
        "url": url,
        "og_title": "Membership Prices: Labyrinth BJJ, Fulshear TX",
        "image": SITE + "/assets/og-image.jpg",
        "schema": "\n".join([
            jsonld(crumb_schema([("Pricing", "/pricing")])),
            jsonld(faq_schema(PRICING_FAQS)),
            jsonld({"@context": "https://schema.org", "@type": "Product",
                    "name": "Labyrinth BJJ Membership",
                    "description": "Brazilian jiu-jitsu, wrestling and strength training memberships at Labyrinth BJJ in Fulshear, Texas.",
                    "brand": {"@type": "Brand", "name": "Labyrinth BJJ"},
                    "offers": offers}),
        ]),
    }

    def group(title, sub, rows):
        return """
<section class="prog-section">
  <div class="container">
    <div class="fade-in">
      <p class="section-label">%s</p>
      <h2 class="section-title section-title--lg">%s</h2>
    </div>
    <div class="price-grid stagger">
%s
    </div>
  </div>
</section>""" % (sub, title, "\n".join(price_card(*r) for r in rows))

    extras = "\n".join(
        """      <div class="price-extra">
        <div class="price-extra__name">%s</div>
        <div class="price-extra__amount">%s<span>%s</span></div>
        <p class="price-extra__note">%s</p>
      </div>""" % (n, a, p, note) for n, a, p, note in P["extras"])

    return "\n".join([head, NAV, crumbs([("Pricing", "/pricing")]), """
<header class="prog-hero">
  <div class="container">
    <p class="section-label">Membership</p>
    <h1 class="prog-hero__title">What It Costs</h1>
    <p class="prog-hero__lead">Every price we charge is on this page. Adults from $179 a month, kids from $239, a family plan at $399: month to month, no contract, no joining fee, and the first class is free whatever you decide afterwards.</p>
    <div class="prog-hero__cta">
      <a data-book-trial href="/#book" class="btn btn--gold">Book a Free Class</a>
      <a href="/schedule" class="btn btn--ghost">See the Timetable</a>
    </div>
    <div class="prog-facts">
      <div class="prog-fact"><div class="prog-fact__label">Adults from</div><div class="prog-fact__value"><em>$179</em>/month</div></div>
      <div class="prog-fact"><div class="prog-fact__label">Kids from</div><div class="prog-fact__value"><em>$239</em>/month</div></div>
      <div class="prog-fact"><div class="prog-fact__label">Family plan</div><div class="prog-fact__value"><em>$399</em>/month</div></div>
      <div class="prog-fact"><div class="prog-fact__label">Contract</div><div class="prog-fact__value">None</div></div>
    </div>
  </div>
</header>""",
        group("ADULT MEMBERSHIPS", "Ages 16 and up", P["adult"]),
        group("KIDS &amp; TEENS", "Ages 3–15", P["kids"]),
        group("FAMILY", "Two or more in the household", P["family"]), """
<section class="prog-section">
  <div class="container">
    <div class="fade-in">
      <p class="section-label">Everything else</p>
      <h2 class="section-title section-title--lg">PUNCH CARDS &amp; ADD-ONS</h2>
    </div>
    <div class="price-extras stagger">
%(extras)s
    </div>
    <p class="prog-week__note fade-in">%(note)s</p>
  </div>
</section>

<section class="prog-section">
  <div class="container">
    <div class="fade-in">
      <p class="section-label">Straight answers</p>
      <h2 class="section-title section-title--lg">WHAT YOU ARE ACTUALLY PAYING FOR</h2>
    </div>
    <div class="prog-prose fade-in">
      <p>A membership here covers the whole timetable your plan applies to. There is no separate competition team fee, no charge for youth wrestling on top of a kids membership, and no add-on for the all-ages strength and conditioning class. The one genuine extra is the sauna and cold plunge at $60 a month, and you can have a membership without it.</p>
      <p>Unlimited is worth it at three sessions a week and not before. If you are training twice, the 8-class plan is the honest recommendation and we will say so at the desk. You can move up any month you like, and people regularly do once the habit sticks.</p>
      <p>What is not on this page: a hard sell. The first class is free, nobody will ring you afterwards, and if you decide a gym closer to home suits your week better we would rather you trained there than paid us and stopped in March. <a href="/blog/how-much-does-bjj-cost-fulshear">The full breakdown of what jiu-jitsu costs in Fulshear</a> (including the questions worth asking any gym before you sign) is on the blog.</p>
    </div>
  </div>
</section>

<section class="faq">
  <div class="container container--narrow">
    <div class="fade-in">
      <p class="section-label">Questions</p>
      <h2 class="section-title section-title--lg">ABOUT MEMBERSHIP</h2>
    </div>
    <div class="faq__list stagger">
%(faqs)s
    </div>
  </div>
</section>

<div class="container">
  <div class="prog-close fade-in">
    <h2 class="prog-close__title">TRY IT BEFORE YOU PAY</h2>
    <p class="prog-close__text">The first class is free for everybody: adults into any class on the timetable, kids on a Friday afternoon or Saturday morning. Decide about money afterwards.</p>
    <div class="prog-hero__cta" style="justify-content:center">
      <a data-book-trial href="/#book" class="btn btn--gold">Book a Free Class</a>
      <a href="tel:2813937983" class="btn btn--ghost">Call %(phone)s</a>
    </div>
  </div>
</div>""" % {"extras": extras, "note": P["note"], "faqs": faq_block(PRICING_FAQS), "phone": PHONE},
        TAIL % {"footer": FOOTER}])


# ── /coaches/ ────────────────────────────────────────────────────────────────
#
# Three pages, for the three the academy asked for. Everything below is on the
# front page already or derivable from the timetable. The gap, flagged in the
# module docstring and worth repeating: no lineage. Add `lineage` to a coach
# and it renders; leave it out and the page does not pretend.

COACHES = [
    {
        "slug": "anthony-curry",
        "name": "Prof. Anthony Curry",
        "short": "Anthony Curry",
        "role": "Head Instructor &amp; Owner",
        "rank": "Black Belt",
        "years": "14+ years",
        "belt": "black",
        "photo": "coach-tony",
        "title": "Prof. Anthony Curry, Head Instructor &amp; Owner | Labyrinth BJJ",
        "description": "Anthony Curry, founder and head instructor of Labyrinth BJJ in Fulshear, TX. Black belt, 14+ years, and the coach who built one of the top 1% of academies in the country.",
        "lead": "Founder and head instructor. He opened Labyrinth in 2021 and built it into one of the top 1% of academies in the country, a ranking computed from match results rather than claimed.",
        "body": [
            "Anthony Curry started Labyrinth Brazilian Jiu-Jitsu in Fulshear in 2021. Five years later the academy sits <strong>#39 of 7,869 academies nationally</strong>, the top 1%, on jits.gg, which aggregates verified tournament results and ranks academies on what their athletes actually do rather than on what the academy says about itself. It ranks 108 Labyrinth athletes individually.",
            "That is the short version and it undersells the part that matters to somebody walking in for the first time. An academy does not get into the top 1% of a country this size on one or two exceptional athletes; it gets there on a room where a lot of ordinary students improve steadily, and building that room is a coaching problem rather than a talent-spotting one.",
            "He is a <strong>black belt with more than fourteen years on the mats</strong>. In Brazilian jiu-jitsu that is a long apprenticeship by design. The black belt takes most people around a decade of consistent training, which is why the rank means something the equivalent belt in other martial arts often does not.",
        ],
        "teaches_note": "As head instructor he oversees the whole curriculum, and the academy's competition results are cornered by him and the other black belts at events.",
        "lineage": {
            "from": "Matt Leighton",
            "at": "Citadel BJJ",
            "where": "Iowa City, Iowa",
            "body": [
                "Anthony Curry received his black belt from <strong>Matt Leighton of Citadel BJJ in Iowa City</strong>. Leighton co-founded that academy and is a decorated no-gi competitor in his own right.",
                "Lineage is the first question anybody in jiu-jitsu asks about an instructor, and it is a fair one. There is no central licensing body in this sport. A black belt is awarded by a person, not issued by an institution, which means the rank is only ever as good as the standards of whoever tied it on. Asking who promoted a coach is asking whose judgment is behind the rank.",
                "It also matters in the other direction, and Labyrinth has an unusually short answer there. <a href=\"/coaches/shaun-lawler\">Shaun Lawler</a> is the only black belt Anthony has promoted in five years of running this academy, one, in five years, out of a room that has produced Pan American champions.",
            ],
        },
        "faqs": [
            ("Who is the head instructor at Labyrinth BJJ?",
             "Professor Anthony Curry, who founded the academy in Fulshear in 2021 and still runs it. He is a black belt with over fourteen years of training, and under his instruction Labyrinth has become one of the top 1% of academies in the country on jits.gg, #39 of 7,869."),
            ("What does “Professor” mean in Brazilian jiu-jitsu?",
             "It is the customary title for a black belt instructor. Colored-belt instructors are usually addressed as “coach”. It is not an academic title. It is the traditional form of address in a BJJ academy, and the black belt behind it typically represents about a decade of training."),
            ("Who is Anthony Curry's black belt under?",
             "Matt Leighton of Citadel BJJ in Iowa City, who co-founded that academy and competes at a high level in no-gi. Lineage matters in Brazilian jiu-jitsu because there is no central licensing body. A black belt is awarded by a person rather than issued by an institution, so asking who promoted a coach is asking whose judgment stands behind the rank."),
            ("How many black belts has he promoted?",
             "One, in five years of running the academy: Professor Shaun Lawler. Awarding a black belt is the most consequential thing an instructor does, and Labyrinth has produced Pan American champions, 108 nationally ranked athletes and 327 gold medals against exactly one black belt promotion."),
            ("Does he still teach, or only run the academy?",
             "He teaches. Labyrinth is an owner-operated academy rather than a franchise with a manager, and the head instructor being on the mats is most of the point of training at one."),
        ],
    },
    # Every fact here is one the academy has already published about him, on
    # /legacy/ and on foundations.labyrinth.vision. Nothing is taken from the
    # card beside his on Foundations (the medal count there is the head
    # instructor's). His BJJ lineage is not published anywhere, so there is no
    # "lineage" key and the page draws no lineage section rather than guess.
    {
        "slug": "scott-jones",
        "name": "Scott Jones",
        "short": "Scott Jones",
        "role": "MMA Conditioning Coach",
        # The Taekwondo rank, named as such. See .belt-bar--tkd in style.css:
        # a bare black belt on this site would be read as a BJJ black belt.
        "rank": "7th Dan Taekwondo &middot; BJJ Brown Belt",
        # A second belt bar on his card: the BJJ rank, beside the Taekwondo one.
        "belt2": "brown",
        # Must be set. The profile template falls back to "Texas National
        # Team" when this is empty, which is Malik's credential, not Scott's.
        "years": "30+ years",
        "belt": "tkd",
        "photo": "coach-scott",
        "title": "Scott Jones: MMA Conditioning &amp; Taekwondo | Labyrinth BJJ Fulshear",
        "description": "Scott Jones, 7th dan Taekwondo black belt and BJJ brown belt, coaches MMA Conditioning, an all-ages class, at Labyrinth BJJ in Fulshear, TX. 30+ years teaching.",
        "lead": "A 7th dan Taekwondo black belt with more than 27 years in MMA, who built Team Legacy from nothing and then merged it into Labyrinth, bringing his whole room with him.",
        "body": [
            "Scott Jones founded Team Legacy Martial Arts and built it from nothing. When Team Legacy <a href=\"/legacy/\">merged with Labyrinth</a>, he did not change jobs; he brought his school with him, students and all, and now coaches here full time. If your child learned from Coach Scott at Team Legacy, they still do.",
            "He is a 7th dan black belt in Taekwondo and a brown belt in Brazilian jiu-jitsu, with more than 27 years of MMA behind him and over thirty years of teaching children and adults: more time on the mat as a teacher than anyone else on our staff. He has trained at Labyrinth since the day it opened, and he was the first student ever to tap our head coach in a live roll.",
            "That combination is why he runs <strong>MMA Conditioning</strong>. A striking black belt who is also a jiu-jitsu player can teach anybody, child or adult, to stand, move and defend themselves without losing sight of what happens when the fight reaches the ground, which is where most of the rest of this timetable lives.",
        ],
        "teaches_note": "He runs MMA Conditioning on Saturday mornings, open to all ages, and the families who trained with him at Team Legacy train with him here.",
        "faqs": [
            ("Who teaches MMA Conditioning at Labyrinth BJJ?",
             "Scott Jones, a 7th dan Taekwondo black belt and BJJ brown belt with more than 27 years in MMA. MMA Conditioning runs on Saturdays at 9:00 AM, is open to all ages, and a first class is free."),
            ("Is this the same Coach Scott from Team Legacy?",
             "Yes. Team Legacy Martial Arts merged with Labyrinth BJJ and Scott came with it; he coaches here full time. Children who trained with him at Team Legacy still train with him."),
            ("Do I need striking or martial arts experience for MMA Conditioning?",
             "No. The class is open to beginners of any age, and a first class is free. Come in comfortable workout clothes; we will talk you through what to wear for MMA once you decide to carry on."),
        ],
    },
    {
        "slug": "shaun-lawler",
        "name": "Prof. Shaun Lawler",
        "short": "Shaun Lawler",
        "role": "Professor",
        "rank": "Black Belt",
        "years": "15+ years",
        "belt": "black",
        "photo": "coach-shaun",
        "title": "Prof. Shaun Lawler, Black Belt Professor | Labyrinth BJJ Fulshear",
        "description": "Shaun Lawler, black belt professor at Labyrinth BJJ in Fulshear, TX. 15+ years on the mats, and the coach who leads the all-ages strength and conditioning class.",
        "lead": "Black belt, fifteen years and counting, and the coach most likely to be the reason a beginner is still training a year later. He also leads the all-ages strength and conditioning class.",
        "body": [
            "Shaun Lawler brings deep competition experience and a technical precision that shows up in how he breaks a position down: the kind of teaching where a movement you have failed at for a month suddenly has three pieces instead of one.",
            "What the academy says about him is that he <strong>develops athletes at every level from beginner to elite competitor</strong>, and that range is rarer than it sounds. Plenty of high-level black belts are excellent with people who are already good. Being genuinely useful to somebody in their first month, and to somebody preparing for the IBJJF Pan Ams, is a different skill.",
            "He is also the coach behind the <a href=\"/blog/strength-and-conditioning-for-kids-fulshear\">all-ages strength and conditioning class</a> that runs on Tuesdays and Thursdays at 4:15 PM: the session where a seven-year-old, a fifteen-year-old and a forty-two-year-old work through the same program at their own load. It is included in every membership, and it exists because technique stops being the limiting factor in a match sooner than most people expect.",
        ],
        "teaches_note": "He coaches across the timetable and runs the strength and conditioning session twice a week.",
        "lineage": {
            "from": "Prof. Anthony Curry",
            "from_url": "/coaches/anthony-curry",
            "at": "Labyrinth BJJ",
            "where": "Fulshear, Texas",
            "body": [
                "Shaun Lawler received his black belt from <a href=\"/coaches/anthony-curry\">Professor Anthony Curry</a>, and he is the <strong>only black belt Anthony has ever promoted</strong>, in five years of running the academy.",
                "That is worth pausing on, because it is the kind of fact that is easy to read past. Awarding a black belt is the most consequential thing an instructor does; it is a permanent statement, made in public, that this person is now qualified to promote others. Plenty of academies hand out several a year. This one has produced Pan American champions, 108 nationally ranked athletes and 327 gold medals, and exactly one black belt.",
                "It also completes a line that runs entirely through people who are still on these mats: <strong>Matt Leighton</strong> of Citadel BJJ in Iowa City promoted Anthony, and Anthony promoted Shaun. Whatever standard Leighton set has been passed down twice without leaving the building.",
            ],
        },
        "faqs": [
            ("Who runs the strength and conditioning class?",
             "Professor Shaun Lawler. It runs Tuesday and Thursday at 4:15 PM, it is open to all ages in one session (kids and adults together at their own load) and it is included in every membership at no extra charge."),
            ("How long has Shaun Lawler been training?",
             "More than fifteen years, and he is a black belt. In Brazilian jiu-jitsu the black belt typically takes around a decade of consistent training to reach, so fifteen-plus years puts him well past that point."),
            ("Who is Shaun Lawler's black belt under?",
             "Professor Anthony Curry, the founder of Labyrinth, and Shaun is the only black belt Anthony has promoted in five years of running the academy. The line runs Matt Leighton of Citadel BJJ in Iowa City, to Anthony, to Shaun."),
            ("Is he the right coach for a complete beginner?",
             "Yes, and that is worth saying because it is not automatic at his level. The academy's own description of him is that he develops athletes from beginner through to elite competitor, and the beginner half of that is the harder half to do well."),
        ],
    },
    {
        "slug": "malik-pickett",
        "name": "Malik Pickett",
        "short": "Malik Pickett",
        "role": "Wrestling Coach",
        "rank": "Texas National Team",
        "years": "",
        "belt": "wrestling",
        "photo": "coach-malik",
        "title": "Coach Malik Pickett: Youth Wrestling | Labyrinth BJJ Fulshear",
        "description": "Malik Pickett, youth wrestling coach at Labyrinth BJJ in Fulshear, TX. Texas National Team wrestler teaching takedowns to ages 7–17, three sessions a week.",
        "lead": "A Texas National Team wrestler coaching the youth wrestling program: the fastest available upgrade to a young grappler's game, and the part of the room where the noise comes from.",
        "body": [
            "Malik Pickett wrestles for the Texas National Team, and he coaches our <a href=\"/programs/youth-wrestling-fulshear\">youth wrestling</a> classes for ages 7 to 17. He is known here for his energy and for how much attention he gives the younger end of the room, which is not where most elite wrestlers want to spend their evenings.",
            "The reason a jiu-jitsu academy employs a wrestling coach at all is straightforward. The usual weakness in a young grappler is that they are dangerous on the ground and lost standing up, and most youth matches are decided by who gets on top first. Wrestling addresses exactly that gap, and it is the single fastest improvement available to a child who already trains BJJ.",
            "It works the other way too. Children who come to Labyrinth for wrestling (including school wrestlers looking for off-season mat time, and children who have never wrestled at all) are not required to do jiu-jitsu, and plenty do not. Wrestling is included in any kids or teens membership rather than charged as an extra.",
        ],
        "teaches_note": "Wrestling runs three times a week and is included in every kids and teens membership.",
        "faqs": [
            ("Who coaches wrestling at Labyrinth BJJ?",
             "Coach Malik Pickett, a Texas National Team wrestler. He runs the youth wrestling program for ages 7 to 17 on Wednesday and Thursday evenings at 7:30 PM and Sunday afternoons at 1:00 PM."),
            ("Does my child need wrestling experience to train with him?",
             "None. Most of the children in the room started with none. The first weeks are stance, motion, level changes and safe falling. The same place every wrestler begins, taught without a season already in progress."),
            ("Does my child have to do jiu-jitsu as well?",
             "No. Wrestling is included in any kids or teens membership and children are welcome to do only that. Plenty of our wrestlers also wrestle for their schools and use these sessions as off-season mat time."),
        ],
    },
]

# The other three, listed on the hub without pages of their own.
OTHER_COACHES = [
    ("Jared Vevera", "Head Coach: Katy", "Black Belt &middot; 14+ Yrs", "black", "coach-jared",
     "Head coach of the Katy academy and an instructor at Fulshear."),
    ("Christian Solano", "Instructor", "Brown Belt &middot; 10+ Yrs", "brown", "coach-christian",
     "Over a decade of training forged into sharp no-gi technique."),
    ("Jake Maronge", "Instructor", "Brown Belt &middot; 9 Yrs", "brown", "coach-jake",
     "Leads the Wednesday early morning gi class."),
    ("Emma &ldquo;Armbar&rdquo;", "Assistant Coach", "Yellow/White Belt &middot; 4+ Yrs",
     "yellowwhite", "coach-emma",
     "Pan American gold medalist with over 100 competition wins by armbar. Four years training, three of them helping coach."),
    ("&ldquo;Hurricane&rdquo; Hadley", "Assistant Coach", "Gray/Black Belt &middot; 2+ Yrs",
     "greyblack", "coach-hadley",
     "ADCC Dallas gold medalist and a repeat JJWL and IBJJF champion in gi and no-gi. Over 100 matches at a 77% win rate."),
]


# Degrees on the tab, by coach. Only the ones who have them.
STRIPES = {"coach-emma": 1, "coach-hadley": 4}


def plain(name):
    """A display name reduced to something alt text can say out loud.

    Entities go to spaces, then the runs collapse. A nickname in curly
    quotes leaves two of them behind on each side, and a name that ends
    in one would otherwise trail a space."""
    return re.sub(r"\s+", " ", re.sub(r"&\w+;", " ", name)).strip()


def coach_card(name, role, rank, belt, photo, bio, href=None, belt2=None):
    stripes = STRIPES.get(photo, 0)
    stripe_html = ('<span class="belt-bar__stripes">%s</span>' % ("<span></span>" * stripes)) if stripes else ""
    # Three degrees are the most that fit the default tab; past that the
    # stripes run off its right edge, so the wider tab comes along with them.
    belt += " belt-bar--4stripe" if stripes >= 4 else ""
    inner = """    <div class="coach-card__avatar">
      <picture><source srcset="/assets/%s.webp" type="image/webp"><img src="/assets/%s.jpg" alt="%s at Labyrinth BJJ in Fulshear, TX" loading="lazy" width="200" height="200"></picture>
    </div>
    <div class="coach-card__info">
      <h3 class="coach-card__name">%s</h3>
      <p class="coach-card__role">%s</p>
      <div class="coach-card__rank">
        <div class="belt-bar belt-bar--%s"><span class="belt-bar__belt"></span><span class="belt-bar__tab"></span>%s</div>%s
        <span class="coach-card__rank-label">%s</span>
      </div>
      <p class="coach-card__bio">%s</p>
%s    </div>""" % (photo, photo, plain(name), name, role, belt, stripe_html,
                  ('\n        <div class="belt-bar belt-bar--%s"><span class="belt-bar__belt"></span><span class="belt-bar__tab"></span></div>' % belt2) if belt2 else "",
                  rank, bio,
                  '      <a href="%s" class="coach-card__link">Full profile &rarr;</a>\n' % href if href else "")
    return '  <div class="coach-card">\n%s\n  </div>' % inner


def lineage_html(c):
    """Who promoted him, given its own section rather than a line in a bio.

    It is the one claim on these pages a competitor cannot write for
    themselves, and in this sport it is the first thing a reader looks for.
    Returns empty for a coach with no lineage recorded. The page then simply
    does not have the section, rather than having an empty one."""
    ln = c.get("lineage")
    if not ln:
        return ""
    who = ('<a href="%s">%s</a>' % (ln["from_url"], ln["from"])) if ln.get("from_url") else ln["from"]
    return """
<section class="prog-section prog-section--surface">
  <div class="container">
    <div class="fade-in">
      <p class="section-label">Lineage</p>
      <h2 class="section-title section-title--lg">WHO PROMOTED HIM</h2>
    </div>
    <div class="lineage">
      <div class="lineage__card">
        <div class="lineage__label">Black belt awarded by</div>
        <div class="lineage__name">%s</div>
        <div class="lineage__where">%s &middot; %s</div>
      </div>
      <div class="prog-prose">
%s
      </div>
    </div>
  </div>
</section>
""" % (who, ln["at"], ln["where"],
       "\n".join("        <p>%s</p>" % b for b in ln["body"]))


# ── /support ─────────────────────────────────────────────────────────────────

SUPPORT_FAQS = [
    ("How do I pause, change or cancel my membership?",
     "Email <a href=\"mailto:support@labyrinth.vision\">support@labyrinth.vision</a> or call (281) 393-7983 and tell us what you need. Holds for travel, injury and deployment are routine and we would rather you paused than quit. We will confirm anything that changes what you pay in writing before it takes effect."),
    ("Something looks wrong on my bill.",
     "Send us the date and the amount and we will look it up the same day. Billing runs through our membership system rather than the front desk, so an email with the detail in it gets sorted faster than a conversation on the mat."),
    ("My child left something at the academy.",
     "Ask at the desk first. Most things are behind it within the hour. If you have already gone home, email us a description and which class they were in and we will check the lost property box before it is cleared."),
    ("How do I update my email, phone number or card?",
     "You can change all three yourself in your membership account. If you cannot get in, email <a href=\"mailto:support@labyrinth.vision\">support@labyrinth.vision</a> from the address we have on file and we will fix it from our side."),
    ("I need help with the Cornerman timer.",
     "Cornerman has its own support page at <a href=\"https://cornerman.app/support\" target=\"_blank\" rel=\"noopener noreferrer\">cornerman.app/support</a>, which is the fastest route. Anything it does not answer can come to <a href=\"mailto:support@labyrinth.vision\">support@labyrinth.vision</a> and reaches the same people."),
    ("I run a gym and want Cornerman showing our name.",
     "That is what the paid tier does: your logo and colors on unlimited screens for one price. Everything about it is at <a href=\"https://cornerman.app\" target=\"_blank\" rel=\"noopener noreferrer\">cornerman.app</a>. You do not need to be a Labyrinth member and you do not need to be in Texas."),
    ("Who do I talk to about a concern involving a coach or another member?",
     "Anthony Curry, directly. Email <a href=\"mailto:support@labyrinth.vision\">support@labyrinth.vision</a> with the word PRIVATE in the subject line and it goes to him rather than the general queue. Anything involving a child is handled the same day."),
]


def render_support():
    url = SITE + "/support"

    routes = [
        ("Membership, billing and bookings",
         "Holds, cancellations, a charge that looks wrong, a class you cannot book. Email is faster than the desk for anything with a date or an amount in it.",
         "mailto:support@labyrinth.vision"),
        ("At the academy",
         "Timetable, what to bring, lost property, coming back after an injury, or a question about which class your child belongs in.",
         "/schedule"),
        ("Cornerman, the round timer",
         "The free Apple TV app and the browser timer. Its own support page answers most of it; anything left comes to the same inbox.",
         "https://cornerman.app/support"),
    ]
    cards = "\n".join(
        '      <a href="%s"%s class="prog-sibling"><div class="prog-sibling__title">%s</div>'
        '<div class="prog-sibling__desc">%s</div></a>'
        % (href, ' target="_blank" rel="noopener noreferrer"' if href.startswith("http") else "", title, desc)
        for title, desc, href in routes)

    head = HEAD % {
        "title": "Support | Labyrinth BJJ &amp; Cornerman",
        "description": "Help with a Labyrinth BJJ membership, billing or bookings, and support for the Cornerman round timer. Email support@labyrinth.vision or call (281) 393-7983.",
        "url": url,
        "og_title": "Support: Labyrinth BJJ",
        "image": SITE + "/assets/og-image.jpg",
        "schema": "\n".join([
            jsonld(crumb_schema([("Support", "/support")])),
            jsonld(faq_schema(SUPPORT_FAQS)),
            jsonld({"@context": "https://schema.org", "@type": "ContactPage",
                    "name": "Support: Labyrinth BJJ", "url": url,
                    "mainEntity": {
                        "@type": "Organization", "name": "Labyrinth BJJ", "url": SITE,
                        "email": "support@labyrinth.vision",
                        "contactPoint": [{
                            "@type": "ContactPoint", "contactType": "customer support",
                            "email": "support@labyrinth.vision", "telephone": "+1-281-393-7983",
                            "areaServed": "US", "availableLanguage": "English",
                        }],
                    }}),
        ]),
    }

    return "\n".join([head, NAV, crumbs([("Support", "/support")]), """
<header class="prog-hero">
  <div class="container">
    <p class="section-label">Help</p>
    <h1 class="prog-hero__title">Support</h1>
    <p class="prog-hero__lead">Everything Labyrinth, on one page: the academy in Fulshear and the Cornerman timer that came out of it. One address reaches both: <a href="mailto:support@labyrinth.vision">support@labyrinth.vision</a>.</p>
    <div class="prog-hero__cta">
      <a href="mailto:support@labyrinth.vision" class="btn btn--gold">Email Support</a>
      <a href="tel:2813937983" class="btn btn--ghost">Call (281) 393-7983</a>
    </div>
    <div class="prog-facts">
      <div class="prog-fact"><div class="prog-fact__label">Email</div><div class="prog-fact__value">support@<wbr>labyrinth.vision</div></div>
      <div class="prog-fact"><div class="prog-fact__label">Phone</div><div class="prog-fact__value">(281) 393-7983</div></div>
      <div class="prog-fact"><div class="prog-fact__label">We answer within</div><div class="prog-fact__value"><em>1</em> business day</div></div>
      <div class="prog-fact"><div class="prog-fact__label">Urgent</div><div class="prog-fact__value">Call, don&rsquo;t email</div></div>
    </div>
  </div>
</header>

<section class="prog-section">
  <div class="container">
    <div class="fade-in">
      <p class="section-label">Where to start</p>
      <h2 class="section-title section-title--lg">WHAT DO YOU NEED?</h2>
    </div>
    <div class="prog-siblings stagger">
%(cards)s
    </div>
  </div>
</section>

<section class="prog-section prog-section--surface">
  <div class="container">
    <div class="fade-in">
      <p class="section-label">In person</p>
      <h2 class="section-title section-title--lg">COME AND ASK</h2>
    </div>
    <div class="prog-prose fade-in">
      <p>The desk is staffed through every class. If you are already coming in, asking there is almost always quicker than writing to us. Most things people email about get settled in a minute at the front of the mat.</p>
      <p><strong>6615 West Cross Creek Bend Lane, Suite #400, Fulshear, TX 77441.</strong> Monday to Friday 6:30 AM to 9:00 PM, Saturday 9:00 AM to 2:00 PM, Sunday 10:30 AM to 2:00 PM. The <a href="/schedule">full timetable</a> shows which classes are running when you plan to arrive.</p>
      <p>Anything time-critical (you are outside with a locked door, a child has not been collected, somebody is hurt) call. Email is checked through the day but it is not a pager.</p>
    </div>
  </div>
</section>

<section class="prog-section">
  <div class="container">
    <div class="fade-in">
      <p class="section-label">The app</p>
      <h2 class="section-title section-title--lg">CORNERMAN</h2>
    </div>
    <div class="prog-prose fade-in">
      <p>Cornerman is the round timer we built for our own wall and then put on the App Store. It runs free in a browser on any screen you already own (a smart TV, a Fire Stick, an old laptop) and there is a free dedicated app for Apple TV. It works offline once loaded, needs no account, and collects nothing.</p>
      <p>Support, setup and the paid branding tier all live on its own site: <a href="https://cornerman.app" target="_blank" rel="noopener noreferrer">cornerman.app</a>. Its <a href="https://cornerman.app/support" target="_blank" rel="noopener noreferrer">support page</a> is the fastest route for anything app-specific, and its <a href="https://cornerman.app/privacy" target="_blank" rel="noopener noreferrer">privacy policy</a> covers what it does and does not store.</p>
    </div>
    <div class="prog-siblings stagger">
      <a href="https://cornerman.app" target="_blank" rel="noopener noreferrer" class="prog-sibling"><div class="prog-sibling__title">cornerman.app</div><div class="prog-sibling__desc">The timer, the Apple TV app, and gym branding</div></a>
      <a href="/privacy-policy" class="prog-sibling"><div class="prog-sibling__title">Privacy policy</div><div class="prog-sibling__desc">What this site and our membership records hold</div></a>
    </div>
  </div>
</section>

<section class="faq">
  <div class="container container--narrow">
    <div class="fade-in">
      <p class="section-label">Common ones</p>
      <h2 class="section-title section-title--lg">QUESTIONS WE GET</h2>
    </div>
    <div class="faq__list stagger">
%(faqs)s
    </div>
  </div>
</section>""" % {"cards": cards, "faqs": faq_block(SUPPORT_FAQS)},
        TAIL % {"footer": FOOTER}])


# ── /self-defense-for-women ──────────────────────────────────────────────────
#
# An RSVP page for a one-off community event. Everything about the event is in
# EVENT below, so the page, the homepage strip, the structured data and the
# tests cannot disagree about when it is. The same facts exist once more, on the
# server, in supabase/functions/_shared/event-emails.ts (in the labyrinth-app
# repo): that is what validates an RSVP and words the two emails, so the slug,
# the time and the donation link have to be changed in both places.
#
# The form posts to the `event-rsvp` edge function, which saves the RSVP to
# Supabase and emails the academy and the guest. rsvp.js does the rest in the
# browser. The page needs no framework and ships no image: it is built to load
# on a phone before somebody has finished reading the sentence that sent them.

EVENT = {
    # The slug is the key the RSVP rows are saved under, so it keeps the date the
    # event was first planned for (Oct 21) even though it now runs on Oct 24.
    "slug": "self-defense-women-2026-10-21",
    # "Rolling for Ribbons" is the event; the descriptive line stays under it on
    # the page and in search results, so a stranger still knows what it is.
    "title": "Rolling for Ribbons",
    "subtitle": "BJJ for Self Defense for Women",
    "name": "Rolling for Ribbons: BJJ for Self Defense for Women",
    "path": "/self-defense-for-women",
    # 11:00 AM on Oct 24 is CDT (UTC-5): Texas moves its clocks on Nov 1.
    "start": "2026-10-24T11:00:00-05:00",
    # 11:00 AM to 12:30 PM.
    "minutes": 90,
    # After this the form says the event has passed (and the server refuses).
    # Matches closesAt in event-emails.ts: 5:00 AM Central the next morning.
    "closes_utc": "2026-10-25T10:00:00Z",
    # "Other amount": a Payment Link where the donor types any amount ($1 minimum).
    "donate_url": "https://donate.stripe.com/14AdRa0tL1Ea1Br3bJgjC0a",
    # One fixed-amount Payment Link per button, so a tap goes straight to a
    # checkout for exactly that amount. Each sends the donor back to
    # /self-defense-for-women?donated=1 for the thank-you.
    "donate_amounts": [
        (1, "https://donate.stripe.com/7sY14ob8pgz44NDdQngjC0b"),
        (3, "https://donate.stripe.com/4gMaEY1xPfv05RH7rZgjC0c"),
        (5, "https://donate.stripe.com/4gM14o0tL82yeod3bJgjC0d"),
        (10, "https://donate.stripe.com/28E6oIb8p4Qm0xn5jRgjC0e"),
        (25, "https://donate.stripe.com/7sYfZi5O55Uq4ND3bJgjC0f"),
        (50, "https://donate.stripe.com/28E8wQ90hciO0xnh2zgjC0g"),
        (100, "https://donate.stripe.com/3cI7sMfoFgz43Jz5jRgjC0h"),
    ],
    "endpoint": "https://jctufxvmuvobaggxcwfn.supabase.co/functions/v1/event-rsvp",
    # The fundraiser total, read from Stripe by an edge function (event-donations).
    # The goal is set there; this is the dollar figure the page shows until it loads.
    "donations_endpoint": "https://jctufxvmuvobaggxcwfn.supabase.co/functions/v1/event-donations",
    "goal": 500,
    "maps_url": "https://maps.google.com/?cid=7150744267965161030",
}


def _event_when():
    """('Saturday, October 24', 'Sat, Oct 24', '11:00 AM'), worked out from the
    start time rather than typed, so a weekday cannot be wrong."""
    import datetime
    d = datetime.datetime.fromisoformat(EVENT["start"])
    hour12 = d.hour % 12 or 12
    time = "%d:%02d %s" % (hour12, d.minute, "AM" if d.hour < 12 else "PM")
    return (d.strftime("%A, %B ") + str(d.day), d.strftime("%a, %b ") + str(d.day), time)


def _event_range():
    """'11:00 AM to 12:30 PM', and the end as an ISO instant for the structured data."""
    import datetime
    d = datetime.datetime.fromisoformat(EVENT["start"])
    e = d + datetime.timedelta(minutes=EVENT["minutes"])
    fmt = lambda t: "%d:%02d %s" % (t.hour % 12 or 12, t.minute, "AM" if t.hour < 12 else "PM")
    return "%s to %s" % (fmt(d), fmt(e)), e.isoformat()


# ── /pink-october ────────────────────────────────────────────────────────────
#
# The October offers, in observance of Breast Cancer Awareness Month. Everything
# time-bound is here so the page, the homepage strip and the tests agree.
#
#   • Moms of current and new students train free for the whole month.
#   • Every woman gets 50% off her first month, with or without a child enrolled.
#
# The page makes no promise the academy has not made: the terms it states are
# the two offers, the dates, and "tell us you are here for Pink October". How an
# offer is verified and applied is the desk's call, and the page says to ask.

PINK = {
    "path": "/pink-october",
    "starts": "2026-10-01",
    # Midnight at the end of Oct 31, Central (CDT, UTC-5).
    "closes_utc": "2026-11-01T05:00:00Z",
}


def ribbon(size=18):
    """The awareness ribbon, drawn once. It takes its color from CSS (`color` on
    the element around it), so the same markup is pink on the event page and on
    the homepage strip and would follow any other palette."""
    return ('<svg class="ribbon" width="%d" height="%d" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
            'stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'
            '<path d="M12 14C8 11 7.5 9 7.5 6.8 7.5 4.6 9.5 3 12 3s4.5 1.6 4.5 3.8C16.5 9 16 11 12 14zM12 14 8 21M12 14l4 7" '
            'fill="currentColor" fill-opacity=".18"/></svg>') % (size, size)


def event_strip():
    """The homepage's pointer at October: the offers and the event. Each link
    hides itself after its own last day, and the strip after both, so nobody is
    invited to something that has gone."""
    _, short, time = _event_when()
    return """<aside class="event-strip" id="eventStrip" aria-label="October at Labyrinth BJJ">
  <div class="container">
    <a class="event-strip__link" href="@@PINK@@" data-closes="@@PINKCLOSES@@">
      <span class="event-strip__icon">@@RIBBON@@</span>
      <span class="event-strip__text"><strong>Pink October: moms train free, women get 50% off</strong><span>All of October &middot; Open to every woman</span></span>
      <span class="event-strip__cta">See offers</span>
    </a>
    <a class="event-strip__link" href="@@PATH@@" data-closes="@@CLOSES@@">
      <span class="event-strip__icon">@@RIBBON@@</span>
      <span class="event-strip__text"><strong>Free event: @@NAME@@</strong><span>@@SHORT@@ &middot; @@TIME@@ &middot; Breast cancer awareness</span></span>
      <span class="event-strip__cta">RSVP</span>
    </a>
  </div>
</aside>
<script>(function(){var s=document.getElementById('eventStrip'),n=0;s.querySelectorAll('a[data-closes]').forEach(function(a){if(Date.now()>Date.parse(a.getAttribute('data-closes')))a.hidden=true;else n++});if(!n)s.hidden=true})()</script>""" \
        .replace("@@RIBBON@@", ribbon(26)).replace("@@PINK@@", PINK["path"]).replace("@@PINKCLOSES@@", PINK["closes_utc"]) \
        .replace("@@PATH@@", EVENT["path"]).replace("@@NAME@@", EVENT["title"]).replace("@@CLOSES@@", EVENT["closes_utc"]) \
        .replace("@@SHORT@@", short).replace("@@TIME@@", time)


def render_event_rsvp():
    url = SITE + EVENT["path"]
    long_date, short_date, time = _event_when()
    desc = ("Free BJJ self defense seminar for women on %s at %s at Labyrinth BJJ in Fulshear, TX. "
            "No experience needed. RSVP now. Donations go to a family affected by breast cancer."
            % (long_date, time))

    head = HEAD % {
        "title": "%s | Free Seminar, %s | Labyrinth BJJ Fulshear" % (EVENT["name"], short_date.split(", ")[1]),
        "description": desc,
        "url": url,
        "og_title": "%s: Free Self Defense Seminar for Women, %s" % (EVENT["title"], long_date),
        "image": SITE + "/assets/og-self-defense.jpg",
        "schema": "\n".join([
            jsonld(crumb_schema([(EVENT["title"], EVENT["path"])])),
            jsonld({
                "@context": "https://schema.org", "@type": "Event",
                "name": EVENT["name"], "description": desc, "url": url,
                "startDate": EVENT["start"],
                "endDate": _event_range()[1],
                "eventStatus": "https://schema.org/EventScheduled",
                "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
                "isAccessibleForFree": True,
                "image": [SITE + "/assets/og-self-defense.jpg"],
                "location": {
                    "@type": "Place", "name": "Labyrinth BJJ",
                    "address": {
                        "@type": "PostalAddress",
                        "streetAddress": "6615 West Cross Creek Bend Lane, Suite #400",
                        "addressLocality": "Fulshear", "addressRegion": "TX",
                        "postalCode": "77441", "addressCountry": "US"},
                },
                "organizer": {"@type": "Organization", "name": "Labyrinth BJJ", "url": SITE},
                "performer": [{"@type": "Person", "name": "Scott Jones", "url": SITE + "/coaches/scott-jones"},
                              {"@type": "Person", "name": "Anthony Curry", "url": SITE + "/coaches/anthony-curry"}],
                "offers": {"@type": "Offer", "url": url, "price": "0", "priceCurrency": "USD",
                           "availability": "https://schema.org/InStock"},
            }),
        ]),
    }

    body = """
<header class="prog-hero rsvp-hero pink-hero">
  <span class="rsvp-hero__mark pink-hero__mark" aria-hidden="true">@@MARK@@</span>
  <div class="container">
    <p class="section-label rsvp-label">@@RIBBON16@@Community event &middot; Breast cancer awareness</p>
    <h1 class="prog-hero__title">@@TITLE@@</h1>
    <p class="rsvp-hero__sub">@@SUBTITLE@@</p>
    <p class="prog-hero__lead">A free, beginner-friendly self defense seminar for women, built on the jiu-jitsu we teach every day at Labyrinth. We are hosting it for breast cancer awareness: donations and merch sales at the event go directly to a family affected by breast cancer. Come on your own or bring a friend.</p>
    <div class="cd" id="cd" role="timer" aria-label="Time until the seminar" hidden>
      <p class="cd__label" id="cd-label">Starts in</p>
      <div class="cd__tiles" id="cd-tiles">
        <div class="cd__tile"><b id="cd-d">0</b><span>Days</span></div>
        <div class="cd__tile"><b id="cd-h">00</b><span>Hours</span></div>
        <div class="cd__tile"><b id="cd-m">00</b><span>Minutes</span></div>
        <div class="cd__tile"><b id="cd-s">00</b><span>Seconds</span></div>
      </div>
      <p class="cd__when">@@LONG@@ &middot; @@RANGE@@ Central</p>
    </div>
    <div class="prog-hero__cta">
      <a href="#rsvp" class="btn btn--gold">RSVP Now</a>
      <a href="#donate" class="btn btn--pink">Donate</a>
    </div>
    <div class="prog-facts">
      <div class="prog-fact"><div class="prog-fact__label">Date</div><div class="prog-fact__value">@@SHORT@@</div></div>
      <div class="prog-fact"><div class="prog-fact__label">Time (Central)</div><div class="prog-fact__value">@@RANGE@@</div></div>
      <div class="prog-fact"><div class="prog-fact__label">Where</div><div class="prog-fact__value">Labyrinth BJJ, Fulshear, TX</div></div>
      <div class="prog-fact"><div class="prog-fact__label">Cost</div><div class="prog-fact__value"><em>Free</em></div></div>
    </div>
  </div>
</header>

<section class="prog-section rsvp" id="rsvp">
  <div class="container">
    <div class="rsvp__intro">
      <p class="section-label rsvp-label">RSVP</p>
      <h2 class="section-title section-title--lg">SAVE YOUR SPOT</h2>
      <p class="rsvp__note"><strong>The seminar is free, and no experience is needed.</strong> If you have never set foot on a mat, this is for you.</p>
      <ul class="rsvp-perks" aria-label="What to expect">
        <li>@@RIBBON16@@<span><strong>Free</strong>Nothing to pay, ever</span></li>
        <li>@@RIBBON16@@<span><strong>Come as you are</strong>No experience, no gear needed</span></li>
        <li>@@RIBBON16@@<span><strong>Led by Coach Scott and Professor Tony</strong>Real instructors, beginner pace</span></li>
        <li>@@RIBBON16@@<span><strong>Bring a friend</strong>Up to 5 people on one RSVP</span></li>
      </ul>
    </div>

    <p class="rsvp__thanks" id="rsvp-donated" hidden>Thank you for your donation. It goes directly to a family affected by breast cancer.</p>

    <form class="booking-form rsvp__form" id="rsvp-form" novalidate
          data-event="@@SLUG@@" data-endpoint="@@ENDPOINT@@" data-closes="@@CLOSES@@"
          data-start="@@STARTISO@@" data-minutes="@@MINUTES@@" data-title="@@NAME@@" data-where="@@WHERE@@" data-url="@@PAGEURL@@">
      <p class="rsvp__form-title">@@RIBBON18@@Save your spot <span>Takes 30 seconds</span></p>
      <div class="booking-form__group">
        <label class="booking-form__label" for="rsvp-name">Full name</label>
        <input class="booking-form__input" id="rsvp-name" name="name" type="text" autocomplete="name" required minlength="2" maxlength="100" aria-describedby="rsvp-name-err">
        <p class="booking-form__error" id="rsvp-name-err"></p>
      </div>

      <div class="booking-form__group">
        <label class="booking-form__label" for="rsvp-email">Email</label>
        <input class="booking-form__input" id="rsvp-email" name="email" type="email" inputmode="email" autocomplete="email" required maxlength="160" aria-describedby="rsvp-email-err">
        <p class="booking-form__error" id="rsvp-email-err"></p>
      </div>

      <div class="booking-form__group">
        <label class="booking-form__label" for="rsvp-phone">Phone <span class="rsvp__opt">(optional)</span></label>
        <input class="booking-form__input" id="rsvp-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" maxlength="40" aria-describedby="rsvp-phone-err">
        <p class="booking-form__error" id="rsvp-phone-err"></p>
      </div>

      <div class="booking-form__group">
        <label class="booking-form__label" for="rsvp-party">Who is coming? <span class="rsvp__opt">(bring a friend, sister or mom)</span></label>
        <select class="booking-form__input booking-form__select" id="rsvp-party" name="party" required aria-describedby="rsvp-party-err">
          <option value="1" selected>Just me</option>
          <option value="2">Me and a friend (2)</option>
          <option value="3">3 people</option>
          <option value="4">4 people</option>
          <option value="5">5 people</option>
        </select>
        <p class="booking-form__error" id="rsvp-party-err"></p>
      </div>

      <div class="booking-form__group">
        <label class="booking-form__label" for="rsvp-notes">Any questions, or your experience level? <span class="rsvp__opt">(optional)</span></label>
        <textarea class="booking-form__input booking-form__area" id="rsvp-notes" name="notes" rows="3" maxlength="600" aria-describedby="rsvp-notes-err"></textarea>
        <p class="booking-form__error" id="rsvp-notes-err"></p>
      </div>

      <!-- Honeypot. People never see or tab to this; a bot filling every input
           does, and the server then saves nothing. -->
      <div class="rsvp__hp" aria-hidden="true">
        <label>Leave this field empty<input type="text" name="hp_leave_empty" id="rsvp-hp" tabindex="-1" autocomplete="off"></label>
      </div>

      <p class="rsvp__status" id="rsvp-status" role="alert" hidden></p>

      <button class="booking-submit-btn" id="rsvp-submit" type="submit">Save My Spot</button>
      <p class="booking-form__consent">Free. We will email you a confirmation. Your details are used only to run this event.</p>
      <noscript><p class="rsvp__status">RSVPing needs JavaScript. Please call us on @@PHONE@@ instead, or email <a href="mailto:info@labyrinth.vision">info@labyrinth.vision</a>.</p></noscript>
    </form>

    <div class="rsvp__success" id="rsvp-success" tabindex="-1" hidden>
      @@RIBBON40@@
      <p class="section-label rsvp-label">You are on the list</p>
      <h2 class="section-title section-title--lg" id="rsvp-success-title">SEE YOU THERE</h2>
      <p><span id="rsvp-success-name"></span>, we have you down for <span id="rsvp-success-party"></span> on <strong>@@LONG@@, @@RANGE@@</strong> at Labyrinth BJJ in Fulshear.</p>
      <p>A confirmation is on its way to <strong id="rsvp-success-email"></strong>. If you do not see it in a few minutes, check your spam folder. To change your RSVP, just submit this form again.</p>
      <div class="prog-hero__cta rsvp__next">
        <a href="#" class="btn btn--gold" id="rsvp-cal-google" target="_blank" rel="noopener noreferrer">Add to Google Calendar</a>
        <a href="#" class="btn btn--ghost" id="rsvp-cal-ics" download="rolling-for-ribbons.ics">Apple / Outlook calendar</a>
        <button type="button" class="btn btn--pink" id="rsvp-share">Bring a friend</button>
      </div>
      <p class="rsvp__shared" id="rsvp-shared" role="status" hidden></p>
      <div class="prog-hero__cta">
        <a href="#donate" class="btn btn--pink">Donate</a>
        <a href="/" class="btn btn--ghost">Back to the site</a>
      </div>
    </div>

    <p class="rsvp__over" id="rsvp-over" hidden>This event has passed. Thank you to everyone who came. See what is coming up on the <a href="/schedule">schedule</a>.</p>
  </div>
</section>

<section class="prog-section rsvp-led" id="instructors">
  <div class="container">
    <div>
      <p class="section-label rsvp-label">@@RIBBON16@@Your instructors</p>
      <h2 class="section-title section-title--lg">LED BY COACH SCOTT AND PROFESSOR TONY</h2>
    </div>
    <div class="rsvp-led__grid">
      <a class="rsvp-led__card" href="/coaches/scott-jones">
        <picture><source srcset="/assets/coach-scott.webp" type="image/webp"><img src="/assets/coach-scott.jpg" alt="Coach Scott Jones" width="96" height="96" loading="lazy"></picture>
        <span class="rsvp-led__body">
          <strong>Coach Scott Jones</strong>
          <em>7th dan Taekwondo black belt, BJJ brown belt</em>
          <span>Scott has a lot of experience with self defense and more than 27 years in MMA. He founded Team Legacy Martial Arts and now coaches full time at Labyrinth.</span>
        </span>
      </a>
      <a class="rsvp-led__card" href="/coaches/anthony-curry">
        <picture><source srcset="/assets/coach-tony.webp" type="image/webp"><img src="/assets/coach-tony.jpg" alt="Professor Anthony Curry" width="96" height="96" loading="lazy"></picture>
        <span class="rsvp-led__body">
          <strong>Professor Anthony Curry</strong>
          <em>Founder and head instructor, BJJ black belt</em>
          <span>Tony has trained for more than 14 years and started Labyrinth in Fulshear in 2021. He teaches the jiu-jitsu this seminar is built on.</span>
        </span>
      </a>
    </div>
    <figure class="rsvp-photo">
      <picture><source srcset="/assets/strength-conditioning.webp" type="image/webp"><img src="/assets/strength-conditioning.jpg" alt="Labyrinth BJJ coaches, women, men and kids flexing together on the mat after class" width="1200" height="800" loading="lazy"></picture>
      <figcaption>Part of the Labyrinth family. Beginners welcome.</figcaption>
    </figure>
  </div>
</section>

<section class="prog-section prog-section--surface rsvp-give" id="donate">
  <div class="container">
    <div>
      <p class="section-label rsvp-label">@@RIBBON16@@Donate</p>
      <h2 class="section-title section-title--lg">HELP A FAMILY</h2>
    </div>
    <div class="prog-prose">
      <p>Donations are welcome and never expected. They go directly to a family affected by breast cancer. You choose the amount, and payment is handled securely by Stripe.</p>
      <p>We will also be selling merch at the event, and those sales go to the same family.</p>
    </div>
    <div class="fund" id="fund" data-endpoint="@@DONATIONS@@" data-goal="@@GOAL@@">
      <div class="fund__head">
        <p class="fund__raised"><strong id="fund-raised">$0</strong> <span>raised online of <span id="fund-goal">$@@GOAL@@</span> goal</span></p>
        <p class="fund__count" id="fund-count" hidden></p>
      </div>
      <div class="fund__bar" role="progressbar" aria-label="Fundraiser progress" aria-valuemin="0" aria-valuemax="@@GOAL@@" aria-valuenow="0" id="fund-bar"><span id="fund-fill" style="width:0"></span></div>
      <p class="fund__first" id="fund-first">Be the first to give. Every gift, big or small, moves the bar.</p>
      <div class="fund__lists" id="fund-lists" hidden>
        <div><p class="fund__title">Top supporters</p><ol class="fund__list" id="fund-top"></ol></div>
        <div><p class="fund__title">Latest gifts</p><ol class="fund__list" id="fund-recent"></ol></div>
      </div>
      <p class="fund__note">Online gifts only. Cash and merch sales at the event go to the same family and are counted at the event. When you give, you choose whether your name is shown.</p>
    </div>
    <p class="rsvp-give__pick" id="donate-pick">Choose an amount</p>
    <div class="rsvp-give__amounts" role="group" aria-labelledby="donate-pick">
@@AMOUNTS@@
      <a href="@@DONATE@@" class="rsvp-give__amt rsvp-give__amt--other" target="_blank" rel="noopener noreferrer">Other amount</a>
    </div>
    <p class="rsvp-give__fine">Each button opens Stripe's secure checkout in a new tab for that amount. Other lets you type your own.</p>
    <p class="rsvp-give__thanks">@@RIBBON20@@<span>Thank you for standing with a family affected by breast cancer.</span></p>
  </div>
</section>

<section class="prog-section pink-more" id="october">
  <div class="container">
    <div>
      <p class="section-label rsvp-label">@@RIBBON16@@All October</p>
      <h2 class="section-title section-title--lg">MORE FOR WOMEN THIS MONTH</h2>
    </div>
    <a href="@@PINKPATH@@" class="pink-link-card">
      <span class="pink-link-card__ribbon">@@RIBBON40@@</span>
      <span class="pink-link-card__body">
        <strong>Pink October at Labyrinth</strong>
        <span>Moms of current and new students train free all month, and every woman gets 50% off her first month. Beginners welcome.</span>
      </span>
      <span class="pink-link-card__cta">See the offers &rarr;</span>
    </a>
  </div>
</section>

<section class="prog-section">
  <div class="container">
    <div>
      <p class="section-label rsvp-label">Where</p>
      <h2 class="section-title section-title--lg">FINDING US</h2>
    </div>
    <div class="prog-prose">
      <p><strong>Labyrinth BJJ</strong><br>@@ADDRESS@@</p>
      <p><a href="@@MAPS@@" target="_blank" rel="noopener noreferrer">Get directions</a> &middot; Questions? Call <a href="tel:2813937983">@@PHONE@@</a>.</p>
    </div>
  </div>
</section>

<a href="#rsvp" class="rsvp-sticky" id="rsvp-sticky" hidden>@@RIBBON16@@<span><strong>RSVP free</strong> &middot; @@SHORT@@ &middot; @@TIME@@</span><b>Save My Spot</b></a>
<script src="/rsvp.js" defer></script>
"""
    for token, value in {
        "@@RIBBON16@@": ribbon(16), "@@RIBBON18@@": ribbon(18), "@@RIBBON20@@": ribbon(20), "@@RIBBON40@@": ribbon(40), "@@MARK@@": ribbon(320),
        "@@PINKPATH@@": PINK["path"], "@@TITLE@@": EVENT["title"], "@@SUBTITLE@@": EVENT["subtitle"], "@@NAME@@": EVENT["name"], "@@STARTISO@@": EVENT["start"], "@@MINUTES@@": str(EVENT["minutes"]), "@@RANGE@@": _event_range()[0], "@@WHERE@@": "Labyrinth BJJ, " + ADDRESS, "@@PAGEURL@@": url, "@@DONATE@@": EVENT["donate_url"], "@@DONATIONS@@": EVENT["donations_endpoint"], "@@GOAL@@": str(EVENT["goal"]), "@@AMOUNTS@@": "\n".join(
            '      <a href="%s" class="rsvp-give__amt" target="_blank" rel="noopener noreferrer">$%d</a>' % (u, d)
            for d, u in EVENT["donate_amounts"]), "@@SHORT@@": short_date,
        "@@TIME@@": time, "@@LONG@@": long_date, "@@SLUG@@": EVENT["slug"],
        "@@ENDPOINT@@": EVENT["endpoint"], "@@CLOSES@@": EVENT["closes_utc"], "@@PHONE@@": PHONE,
        "@@ADDRESS@@": ADDRESS, "@@MAPS@@": EVENT["maps_url"],
    }.items():
        body = body.replace(token, value)
    assert "@@" not in body, "an unreplaced token in the event page"

    head = head.replace("<body>", '<body class="theme-pink">', 1)
    return "\n".join([head, NAV, crumbs([(EVENT["title"], EVENT["path"])]), body, TAIL % {"footer": FOOTER}])


def _pink_picker():
    """The adult classes a woman can book as a first class, on a calendar of the month.

    Straight from the timetable the whole site is built from, so it cannot
    drift: adult and all-ages classes, minus the advanced classes (they need a
    belt or wrestling experience) and open mat. The Friday competition class is
    listed and labelled. Each weekday's classes are written out once; the page
    script lays them over the real days of October, so tapping the 14th shows
    what runs on a Wednesday. Each button opens the booking form already filled
    in for that class and that date."""
    import datetime
    short = schedule_component.SHORT
    days = []
    for day in schedule_data.DAYS:
        rows = []
        for (d, time, name, ages, style, aud, flags) in schedule_data.for_day(day):
            if aud not in ("adult", "all") or "adv" in flags or name == "Open Mat":
                continue
            mode, book_name = schedule_component._booking(name, ages, aud, flags)
            if mode != "form":
                continue
            h, rest = time.split(":")
            mins = (int(h) % 12 + (12 if rest.endswith("PM") else 0)) * 60 + int(rest[:2])
            label = html.escape(name + (" \u00b7 " + style if style else "")).replace(" \u00b7 ", " &middot; ")
            if "comp" in flags:
                label += " &middot; Competition team"
            rows.append(
                '<button type="button" class="pick__time" data-name="%s" data-type="%s" data-day="%s" '
                'data-time="%s" data-mins="%d"><strong>%s</strong><span>%s</span></button>'
                % (html.escape(book_name, quote=True), html.escape(style, quote=True), short[day], time, mins,
                   time, label))
        if rows:
            days.append((short[day], day, rows))
    panels = "\n".join(
        '      <div class="pick__week" data-pick-day="%s" hidden>%s</div>' % (s_, "".join(rows))
        for s_, _, rows in days)
    start = datetime.datetime.fromisoformat(EVENT["start"])
    first = datetime.date.fromisoformat(PINK["starts"])
    last = datetime.date(first.year, first.month + 1, 1) - datetime.timedelta(days=1)
    rng, _ = _event_range()
    return (
        '<div class="pick" id="pick" data-pick data-year="%d" data-month="%d" data-last="%s" data-event="%s">\n'
        '      <div class="pick__cal" id="pick-cal"></div>\n'
        '      <div class="pick__panel" id="pick-panel" aria-live="polite"></div>\n'
        '      <noscript><p class="pick__nojs">Turn on JavaScript to pick a date, or <a href="tel:2813937983">call %s</a>.</p></noscript>\n'
        '%s\n'
        '      <a class="pick__event" id="pick-event" href="%s" hidden><span>Special event</span>'
        '<strong>%s</strong><em>%s &middot; Free &middot; Tap to RSVP</em></a>\n'
        '    </div>'
        % (first.year, first.month, last.isoformat(), start.date().isoformat(), PHONE, panels,
           EVENT["path"], html.escape(EVENT["title"]), rng))


def render_pink_october():
    url = SITE + PINK["path"]
    event_long, event_short, event_time = _event_when()
    desc = ("Pink October at Labyrinth BJJ in Fulshear, TX: moms of current and new students train free all "
            "October, and every woman gets 50% off her first month. In observance of Breast Cancer Awareness Month.")

    head = HEAD % {
        "title": "Pink October: Moms Train Free, 50% Off for Women | Labyrinth BJJ Fulshear",
        "description": desc,
        "url": url,
        "og_title": "Pink October at Labyrinth BJJ: Moms Train Free, Women Get 50% Off",
        "image": SITE + "/assets/og-image.jpg",
        "schema": "\n".join([
            jsonld(crumb_schema([("Pink October", PINK["path"])])),
            jsonld({"@context": "https://schema.org", "@type": "WebPage", "name": "Pink October at Labyrinth BJJ",
                    "url": url, "description": desc,
                    "about": {"@type": "Thing", "name": "Breast Cancer Awareness Month"},
                    "publisher": {"@type": "Organization", "name": "Labyrinth BJJ", "url": SITE}}),
        ]),
    }
    head = head.replace("<body>", '<body class="theme-pink">', 1)

    body = """
<header class="prog-hero pink-hero">
  <span class="pink-hero__mark" aria-hidden="true">@@MARK@@</span>
  <div class="container">
    <p class="pink-badge">@@RIBBON18@@Breast Cancer Awareness Month</p>
    <h1 class="prog-hero__title">PINK <span>OCTOBER</span></h1>
    <p class="prog-hero__lead">All month long, Labyrinth is training in pink. <strong>Moms train free</strong>, and <strong>every woman gets 50% off her first month</strong>. No experience needed, and no child required.</p>
    <div class="prog-hero__cta">
      <a href="#pick-class" class="btn btn--gold">Pick a Class Time</a>
      <a href="#offers" class="btn btn--ghost">See the Offers</a>
    </div>
    <div class="prog-facts">
      <div class="prog-fact"><div class="prog-fact__label">Runs</div><div class="prog-fact__value">Oct 1 to 31</div></div>
      <div class="prog-fact"><div class="prog-fact__label">Moms</div><div class="prog-fact__value"><em>Train free</em></div></div>
      <div class="prog-fact"><div class="prog-fact__label">Every woman</div><div class="prog-fact__value"><em>50% off</em> month one</div></div>
      <div class="prog-fact"><div class="prog-fact__label">Where</div><div class="prog-fact__value">Fulshear, TX</div></div>
    </div>
  </div>
</header>

<p class="pink-ended" id="pink-ended" hidden>These offers ended on October 31. Thank you to everyone who joined in. See what is on this week on the <a href="/schedule">schedule</a>.</p>

<section class="prog-section" id="offers" data-live>
  <div class="container">
    <div>
      <p class="section-label rsvp-label">@@RIBBON16@@Two ways to join in</p>
      <h2 class="section-title section-title--lg">THIS MONTH ONLY</h2>
    </div>
    <div class="offer-grid">
      <article class="offer-card">
        <p class="offer-card__big">FREE</p>
        <h3 class="offer-card__title">Moms train free all October</h3>
        <p>If your child trains with us, or is about to start, you train free for the whole month. Already a student? New to jiu-jitsu? Either way, this is for you.</p>
        <ul class="offer-card__list">
          <li>Moms of current and new students</li>
          <li>The whole month of October</li>
          <li>No experience needed</li>
        </ul>
      </article>
      <article class="offer-card">
        <p class="offer-card__big">50% OFF</p>
        <h3 class="offer-card__title">Half off her first month</h3>
        <p>Every woman who joins in October gets 50% off her first month, whether or not she has a child enrolled. Bring a friend, a sister, a neighbor.</p>
        <ul class="offer-card__list">
          <li>Open to all women</li>
          <li>No child enrolled? No problem</li>
          <li>Your first class is free either way</li>
        </ul>
      </article>
    </div>
  </div>
</section>

<section class="prog-section pink-pick" id="pick-class" data-live>
  <div class="container">
    <div>
      <p class="section-label rsvp-label">@@RIBBON16@@Book in one tap</p>
      <h2 class="section-title section-title--lg">PICK YOUR FIRST CLASS</h2>
      <p class="pink-pick__lead">Tap a day on the calendar to see what is on, then tap a class and we will hold your spot. Beginners are welcome in every class except the competition team, and your first class is free. Mention Pink October when you book, or at the front desk.</p>
    </div>
    @@PICKER@@
    <p class="pink-pick__more">Need a kids class too? <a data-book-trial href="/#book">See kids times</a> &middot; Prefer to talk first? <a href="tel:2813937983">Call @@PHONE@@</a></p>
  </div>
</section>

<section class="prog-section prog-section--surface" id="claim" data-live>
  <div class="container">
    <div>
      <p class="section-label rsvp-label">@@RIBBON16@@How it works</p>
      <h2 class="section-title section-title--lg">THREE EASY STEPS</h2>
    </div>
    <ol class="pink-steps">
      <li><strong>Book a free class.</strong> <a href="#pick-class">Pick a day and time</a> that suits you. It takes a minute, and a coach will be expecting you.</li>
      <li><strong>Tell us you are here for Pink October.</strong> Say so when you book, or at the front desk when you arrive.</li>
      <li><strong>We take it from there.</strong> We will set up your offer with you in person. Questions first? Call <a href="tel:2813937983">@@PHONE@@</a>.</li>
    </ol>
    <div class="prog-hero__cta">
      <a href="#pick-class" class="btn btn--gold">Pick a Class Time</a>
      <a href="tel:2813937983" class="btn btn--ghost">Call @@PHONE@@</a>
    </div>
  </div>
</section>

<section class="prog-section" id="why">
  <div class="container">
    <div>
      <p class="section-label rsvp-label">@@RIBBON16@@Why pink</p>
      <h2 class="section-title section-title--lg">BREAST CANCER AWARENESS MONTH</h2>
    </div>
    <div class="prog-prose">
      <p>October is Breast Cancer Awareness Month, and we want the women in our community to have a reason to show up for themselves this month: to move, to get stronger, and to meet people who will cheer for them.</p>
      <p>We are also hosting a free self defense seminar on <strong>@@EVENT_LONG@@ at @@EVENT_TIME@@</strong>. Donations and merch sales at the event go directly to a family affected by breast cancer.</p>
    </div>
    <a href="@@EVENTPATH@@" class="pink-link-card">
      <span class="pink-link-card__ribbon">@@RIBBON40@@</span>
      <span class="pink-link-card__body">
        <strong>@@EVENT_NAME@@</strong>
        <span>@@EVENT_SHORT@@ at @@EVENT_TIME@@ &middot; Free, no experience needed &middot; RSVP and donate</span>
      </span>
      <span class="pink-link-card__cta">RSVP &rarr;</span>
    </a>
  </div>
</section>

<section class="pink-band" id="start" data-live>
  <div class="container">
    <p class="pink-band__ribbon" aria-hidden="true">@@RIBBON40@@</p>
    <h2 class="pink-band__title">READY TO START?</h2>
    <p>Your first class is free. October is the month to try it.</p>
    <a href="#pick-class" class="btn btn--dark">Pick a Class Time</a>
  </div>
</section>

<script>(function(){
  var root = document.getElementById('pick'); if (!root) return;
  var calEl = document.getElementById('pick-cal'), panel = document.getElementById('pick-panel');
  var eventCard = document.getElementById('pick-event');
  var weeks = {};
  [].slice.call(root.querySelectorAll('[data-pick-day]')).forEach(function(w){ weeks[w.getAttribute('data-pick-day')] = w; });
  var Y = +root.getAttribute('data-year'), M = +root.getAttribute('data-month') - 1, LAST = root.getAttribute('data-last'), EVENT = root.getAttribute('data-event');
  var DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  var FULL = {Sun:'Sunday',Mon:'Monday',Tue:'Tuesday',Wed:'Wednesday',Thu:'Thursday',Fri:'Friday',Sat:'Saturday'};
  var pad = function(n){ return (n < 10 ? '0' : '') + n; };
  var key = function(y, m, d){ return y + '-' + pad(m + 1) + '-' + pad(d); };
  root.classList.add('is-js');
  // "Now" on the academy's clock, wherever the visitor is.
  var p = {};
  new Intl.DateTimeFormat('en-US', {timeZone:'America/Chicago', year:'numeric', month:'numeric', day:'numeric', hour:'numeric', minute:'numeric', hour12:false})
    .formatToParts(new Date()).forEach(function(x){ p[x.type] = x.value; });
  var todayKey = key(+p.year, +p.month - 1, +p.day), nowMins = (parseInt(p.hour, 10) % 24) * 60 + parseInt(p.minute, 10);
  var selected = null;

  function classesOn(k, wd) {
    var w = weeks[DOW[wd]]; if (!w) return [];
    return [].slice.call(w.querySelectorAll('.pick__time')).filter(function(b){
      return k !== todayKey || parseInt(b.getAttribute('data-mins'), 10) > nowMins;
    });
  }
  function shutOn(d) { var B = window.LabyrinthBooking; return B && B.shutReason ? B.shutReason(d) : null; }
  function bookable(d) {
    var k = key(Y, M, d), wd = new Date(Y, M, d).getDay();
    return k >= todayKey && k <= LAST && !shutOn(new Date(Y, M, d)) && classesOn(k, wd).length > 0;
  }

  function draw() {
    var days = new Date(Y, M + 1, 0).getDate(), lead = new Date(Y, M, 1).getDay();
    var h = '<div class="pick__head">' + MONTHS[M] + ' ' + Y + '</div><div class="pick__grid" role="group" aria-label="Pick a day in ' + MONTHS[M] + '">';
    DOW.forEach(function(n){ h += '<span class="pick__dow" aria-hidden="true">' + n.charAt(0) + '</span>'; });
    for (var i = 0; i < lead; i++) h += '<span class="pick__pad"></span>';
    var shut = [];
    for (var d = 1; d <= days; d++) {
      var k = key(Y, M, d), dt = new Date(Y, M, d), cls = 'pick__d', tag = '';
      if (k === todayKey) cls += ' is-today';
      if (k === EVENT) { cls += ' is-event'; tag = '<i class="pick__dot" aria-hidden="true"></i>'; }
      var why = shutOn(dt);
      if (why && k >= todayKey && weeks[DOW[dt.getDay()]]) { shut.push(MONTHS[M].slice(0, 3) + ' ' + d + ': ' + why); h += '<span class="pick__d is-shut" title="Closed: ' + why + '">' + d + '</span>'; continue; }
      if (bookable(d)) {
        h += '<button type="button" class="' + cls + ' is-open' + (k === selected ? ' is-on' : '') + '" data-pick-date="' + k + '" aria-pressed="' + (k === selected) + '" aria-label="' + FULL[DOW[dt.getDay()]] + ', ' + MONTHS[M] + ' ' + d + (k === EVENT ? ', special event' : '') + '">' + d + tag + '</button>';
      } else {
        h += '<span class="' + cls + ' is-off">' + d + '</span>';
      }
    }
    h += '</div>';
    if (shut.length) h += '<p class="pick__note">Closed ' + shut.join('; ') + '</p>';
    calEl.innerHTML = h;
  }

  function show(k) {
    selected = k;
    var pr = k.split('-'), d = +pr[2], wd = new Date(+pr[0], +pr[1] - 1, d).getDay();
    var h = '<h3 class="pick__day-title">' + FULL[DOW[wd]] + ', ' + MONTHS[M] + ' ' + d + '</h3>';
    if (k === EVENT && eventCard) h += eventCard.outerHTML.replace(' hidden', '').replace('id="pick-event"', '');
    h += '<div class="pick__times">';
    classesOn(k, wd).forEach(function(b){
      var c = b.cloneNode(true); c.setAttribute('data-date', k); h += c.outerHTML;
    });
    panel.innerHTML = h + '</div>';
    draw();
  }

  function render() {
    draw();
    var first = null;
    for (var d = 1; d <= new Date(Y, M + 1, 0).getDate() && !first; d++) if (bookable(d)) first = key(Y, M, d);
    if (first) show(selected && selected >= todayKey ? selected : first);
    else panel.innerHTML = '<p class="pick__nojs">No more classes this month. See the <a href="/schedule">schedule</a>.</p>';
  }
  render();
  // booking.js is deferred: once it is there, closed days (Columbus Day) can be marked.
  window.addEventListener('load', render);

  calEl.addEventListener('click', function(e){
    var b = e.target.closest('[data-pick-date]'); if (!b) return;
    show(b.getAttribute('data-pick-date'));
    var f = calEl.querySelector('[data-pick-date="' + selected + '"]'); if (f) f.focus();
  });
  panel.addEventListener('click', function(e){
    var t = e.target.closest('.pick__time'); if (!t) return;
    var B = window.LabyrinthBooking;
    if (!B) { window.location.href = '/#book'; return; }
    B.openForm(t.getAttribute('data-name'), t.getAttribute('data-type'), t.getAttribute('data-day'), t.getAttribute('data-time'), t.getAttribute('data-date'));
  });
})();</script>
<script>(function(){if(Date.now()>Date.parse('@@CLOSES@@')){document.getElementById('pink-ended').hidden=false;document.querySelectorAll('[data-live]').forEach(function(e){e.hidden=true})}})()</script>
"""
    for token, value in {
        "@@PICKER@@": _pink_picker(),
        "@@RIBBON16@@": ribbon(16), "@@RIBBON18@@": ribbon(18), "@@RIBBON40@@": ribbon(40), "@@MARK@@": ribbon(320),
        "@@PHONE@@": PHONE, "@@CLOSES@@": PINK["closes_utc"], "@@EVENTPATH@@": EVENT["path"],
        "@@EVENT_NAME@@": EVENT["name"], "@@EVENT_LONG@@": event_long, "@@EVENT_SHORT@@": event_short,
        "@@EVENT_TIME@@": event_time,
    }.items():
        body = body.replace(token, value)
    assert "@@" not in body, "an unreplaced token on the October page"

    return "\n".join([head, NAV, crumbs([("Pink October", PINK["path"])]), body, TAIL % {"footer": FOOTER}])

# ── /hyrox-youngstars ────────────────────────────────────────────────────────
#
# A parents' interest list for the kids' HYROX Youngstars Houston race (April
# 3 and 4, 2027), in its own black-and-volt-yellow theme. It collects who and
# how old, not a payment: tickets are bought from HYROX, and the academy only
# needs a head count to plan the training group. Every number below is from the
# announcement the academy sent; nothing is added to it.
#
# The sign-up posts to the same event-rsvp function as the seminar (event
# 'hyrox-youngstars-houston-2027'); its notes carry each child's name and age.

HYROX = {
    "path": "/hyrox-youngstars",
    "slug": "hyrox-youngstars-houston-2027",
    "endpoint": "https://jctufxvmuvobaggxcwfn.supabase.co/functions/v1/event-rsvp",
    # The list closes the day before the race weekend (Central, CDT).
    "closes_utc": "2027-04-02T05:00:00Z",
    "official": "https://hyrox.com/hyrox-youngstars/",
    "houston": "https://hyrox.com/event/hyrox-youngstars-houston/",
}

# Station by station, as published for the two younger divisions.
HYROX_STATIONS = [
    ("SkiErg", "300 m", "400 m"),
    ("Sled Push", "15 m &middot; 35 kg", "15 m &middot; 50 kg"),
    ("Sled Pull", "15 m &middot; 25 kg", "15 m &middot; 40 kg"),
    ("Jumps", "Frogger jumps &middot; 20 m", "Burpee broad jumps &middot; 20 m"),
    ("Row", "200 m", "300 m"),
    ("Farmers Carry", "50 m &middot; 4 kg", "50 m &middot; 6 kg"),
    ("Lunges", "20 m", "20 m"),
    ("Weighted Squats", "50 &middot; 1 kg", "50 &middot; 2 kg"),
]
HYROX_RUNNING = [("8&ndash;9", "400&ndash;550 m total"), ("10&ndash;11", "400&ndash;550 m total"),
                 ("12&ndash;13", "800&ndash;1,100 m total"), ("14&ndash;15", "1.6&ndash;2.2 km total, running between stations")]


def _hyrox_bolt(size=20):
    """A lightning bolt, drawn once; colored by CSS like the ribbon."""
    return ('<svg class="bolt" width="%d" height="%d" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">'
            '<path d="M13.2 2 4.5 13.4h6L9.3 22l9.2-12.2h-6.1z"/></svg>') % (size, size)


def render_hyrox():
    url = SITE + HYROX["path"]
    desc = ("Kids 8 to 15: train with Labyrinth BJJ in Fulshear, TX for HYROX Youngstars Houston, April 3 to 4, 2027. "
            "Join the interest list and we will build the training group around you.")
    faqs = [
        ("Does my child need to do BJJ to join?", "Our training group is built around our own students, so kids keep up their regular BJJ classes alongside the HYROX work. If your child is not a student yet, call us and we will talk it through."),
        ("What does it cost to join the list?", "Nothing. This is only an interest list so we can plan the training schedule. Race tickets are bought from HYROX when they are released in November."),
        ("How old does my child have to be?", "8 to 15 on race day, April 3 or 4, 2027. The age groups are 8&ndash;9, 10&ndash;11, 12&ndash;13 and 14&ndash;15."),
        ("When do we find out the schedule?", "Exact wave and start times are not out yet. We will send the training schedule to everyone on the list as soon as it is set, and structured training starts after tickets drop in November."),
    ]
    head = HEAD % {
        "title": "HYROX Youngstars Houston Training for Kids | Labyrinth BJJ Fulshear",
        "description": desc,
        "url": url,
        "og_title": "HYROX Youngstars Houston, April 3 to 4, 2027: Kids Training Group at Labyrinth BJJ",
        "image": SITE + "/assets/og-image.jpg",
        "schema": "\n".join([
            jsonld(crumb_schema([("HYROX Youngstars", HYROX["path"])])),
            jsonld({"@context": "https://schema.org", "@type": "WebPage", "name": "HYROX Youngstars Houston training group",
                    "url": url, "description": desc,
                    "publisher": {"@type": "Organization", "name": "Labyrinth BJJ", "url": SITE}}),
            jsonld(faq_schema(faqs)),
        ]),
    }
    head = head.replace("<body>", '<body class="theme-hyrox">', 1)

    stations = "\n".join(
        "          <tr><th scope=\"row\">%s</th><td>%s</td><td>%s</td></tr>" % r for r in HYROX_STATIONS)
    running = "\n".join("        <li><strong>Ages %s</strong><span>%s</span></li>" % r for r in HYROX_RUNNING)
    chips = "".join("<li>%s</li>" % n for n in
                    ["SkiErg", "Sled push", "Sled pull", "Jumps", "Rowing", "Farmers carry", "Lunges", "Weighted squats"])

    body = """
<header class="hx-hero">
  <div class="container">
    <p class="hx-tag">@@BOLT@@Kids fitness race &middot; Houston</p>
    <h1 class="hx-title">HYROX<br><span>YOUNGSTARS</span></h1>
    <p class="hx-sub">Houston &middot; April 3&ndash;4, 2027</p>
    <p class="hx-lead">We are putting together a group of Labyrinth kids to train for the race together. Running, sleds, rowing, carries and lunges, scaled for ages 8 to 15. Tell us who is interested and we will build the training around you.</p>
    <div class="hx-cta">
      <a href="#join" class="hx-btn hx-btn--volt">Join the Interest List</a>
      <a href="#race" class="hx-btn hx-btn--line">See the Race</a>
    </div>
    <div class="hx-facts">
      <div class="hx-fact"><span>Race weekend</span><strong>Apr 3&ndash;4, 2027</strong></div>
      <div class="hx-fact"><span>Ages</span><strong>8&ndash;15</strong></div>
      <div class="hx-fact"><span>Where</span><strong>Houston, TX</strong></div>
      <div class="hx-fact"><span>To join the list</span><strong>Free</strong></div>
    </div>
  </div>
</header>

<section class="prog-section" id="what" data-live>
  <div class="container">
    <p class="hx-label">@@BOLT16@@What it is</p>
    <h2 class="hx-h2">A RACE BUILT FOR KIDS</h2>
    <div class="hx-prose">
      <p>HYROX is a worldwide fitness race that combines running with functional fitness stations. <strong>HYROX Youngstars is the kids&rsquo; version</strong>, with running distances, movements and weights that fit each age group.</p>
    </div>
    <ul class="hx-chips" aria-label="Race stations">@@CHIPS@@</ul>
  </div>
</section>

<section class="prog-section hx-alt" id="who" data-live>
  <div class="container">
    <p class="hx-label">@@BOLT16@@Who can race</p>
    <h2 class="hx-h2">AGES 8 TO 15</h2>
    <p class="hx-note">Kids must be 8 to 15 years old on race day.</p>
    <div class="hx-ages" role="list">
      <div class="hx-age" role="listitem"><strong>8&ndash;9</strong><span>Saturday</span></div>
      <div class="hx-age" role="listitem"><strong>10&ndash;11</strong><span>Saturday</span></div>
      <div class="hx-age" role="listitem"><strong>12&ndash;13</strong><span>Sunday</span></div>
      <div class="hx-age" role="listitem"><strong>14&ndash;15</strong><span>Sunday</span></div>
    </div>
    <div class="hx-days">
      <div><strong>Saturday, April 3</strong><span>Ages 8&ndash;11</span></div>
      <div><strong>Sunday, April 4</strong><span>Ages 12&ndash;15</span></div>
    </div>
    <p class="hx-note">Exact wave and start times are still to be announced.</p>
  </div>
</section>

<section class="prog-section" id="training" data-live>
  <div class="container">
    <p class="hx-label">@@BOLT16@@How we train</p>
    <h2 class="hx-h2">THE PLAN</h2>
    <ol class="hx-steps">
      <li>
        <span class="hx-steps__when">Now</span>
        <div><h3>Keep training BJJ</h3><p>Kids carry on with their regular classes. We will also start working HYROX movements into our Strength &amp; Conditioning classes.</p></div>
      </li>
      <li>
        <span class="hx-steps__when">November</span>
        <div><h3>Tickets drop, training gets structured</h3><p>Kids planning to race are encouraged to join <strong>at least one Strength &amp; Conditioning class a week</strong> and <strong>one HYROX workout a week</strong> that combines running with the race movements and stations.</p></div>
      </li>
      <li>
        <span class="hx-steps__when">Where</span>
        <div><h3>A gym with the equipment</h3><p>The HYROX workouts need SkiErgs, rowing machines and more. We are hoping to hold them at a gym with that equipment very close to ours, and will confirm as soon as it is set.</p></div>
      </li>
      <li>
        <span class="hx-steps__when">Apr 3&ndash;4</span>
        <div><h3>Race weekend</h3><p>Several months to build strength, endurance and familiarity with the format, then we race together in Houston.</p></div>
      </li>
    </ol>
  </div>
</section>

<section class="prog-section hx-alt" id="race" data-live>
  <div class="container">
    <p class="hx-label">@@BOLT16@@What the race looks like</p>
    <h2 class="hx-h2">STATION BY STATION</h2>
    <p class="hx-note">Distances and weights change with age and, for the older divisions, gender. Here are the two younger divisions.</p>
    <div class="hx-tablewrap">
      <table class="hx-table">
        <thead><tr><th scope="col">Station</th><th scope="col">Ages 8&ndash;9</th><th scope="col">Ages 10&ndash;11</th></tr></thead>
        <tbody>
@@STATIONS@@
        </tbody>
      </table>
    </div>
    <h3 class="hx-h3">Running</h3>
    <p class="hx-note">Running grows with age. Each lap is about 200&ndash;275 m, depending on the venue.</p>
    <ul class="hx-run">
@@RUNNING@@
    </ul>
    <p class="hx-note">The Youngstars website has a kid-friendly manual for every age group with the exact movements, distances, weights and standards. Have a look at your child&rsquo;s before you sign up.</p>
    <div class="hx-cta">
      <a href="@@OFFICIAL@@" class="hx-btn hx-btn--line" target="_blank" rel="noopener noreferrer">HYROX Youngstars site</a>
      <a href="@@HOUSTON@@" class="hx-btn hx-btn--line" target="_blank" rel="noopener noreferrer">Houston event page</a>
    </div>
  </div>
</section>

<section class="prog-section hx-join" id="join" data-live>
  <div class="container">
    <p class="hx-label">@@BOLT16@@Interest list</p>
    <h2 class="hx-h2">COUNT YOUR KID IN</h2>
    <p class="hx-note hx-note--lead">This is just a list for now: nothing to pay and nothing to decide. Knowing how many kids are interested, and how old they are, helps us plan the training schedule. Professor Shaun keeps the list.</p>

    <form class="hx-form" id="hx-form" novalidate
          data-event="@@SLUG@@" data-endpoint="@@ENDPOINT@@" data-closes="@@CLOSES@@">
      <p class="hx-form__title">@@BOLT@@Join the list <span>Takes a minute</span></p>

      <div class="booking-form__group">
        <label class="booking-form__label" for="hx-name">Your name (parent or guardian)</label>
        <input class="booking-form__input" id="hx-name" name="name" type="text" autocomplete="name" required minlength="2" maxlength="100" aria-describedby="hx-name-err">
        <p class="booking-form__error" id="hx-name-err"></p>
      </div>
      <div class="booking-form__group">
        <label class="booking-form__label" for="hx-email">Email</label>
        <input class="booking-form__input" id="hx-email" name="email" type="email" inputmode="email" autocomplete="email" required maxlength="160" aria-describedby="hx-email-err">
        <p class="booking-form__error" id="hx-email-err"></p>
      </div>
      <div class="booking-form__group">
        <label class="booking-form__label" for="hx-phone">Phone <span class="hx-opt">(optional)</span></label>
        <input class="booking-form__input" id="hx-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" maxlength="40" aria-describedby="hx-phone-err">
        <p class="booking-form__error" id="hx-phone-err"></p>
      </div>
      <div class="booking-form__group">
        <label class="booking-form__label" for="hx-count">How many kids?</label>
        <select class="booking-form__input booking-form__select" id="hx-count" name="party" aria-describedby="hx-party-err">
          <option value="1" selected>1 child</option>
          <option value="2">2 kids</option>
          <option value="3">3 kids</option>
          <option value="4">4 kids</option>
          <option value="5">5 kids</option>
        </select>
        <p class="booking-form__error" id="hx-party-err"></p>
      </div>

      <fieldset class="hx-kids" id="hx-kids">
        <legend class="booking-form__label">Each child&rsquo;s name and age <span class="hx-opt">(age on April 3, 2027)</span></legend>
        <div class="hx-kid" data-kid="1">
          <input class="booking-form__input" type="text" id="hx-kid-name-1" aria-label="Child 1 name" placeholder="Child&rsquo;s first name" maxlength="40" autocomplete="off">
          <select class="booking-form__input booking-form__select" id="hx-kid-age-1" aria-label="Child 1 age on race day">
            <option value="">Age</option>@@AGES@@
          </select>
        </div>
        <p class="booking-form__error" id="hx-notes-err"></p>
      </fieldset>

      <div class="booking-form__group">
        <label class="booking-form__label" for="hx-note">Anything we should know? <span class="hx-opt">(optional)</span></label>
        <textarea class="booking-form__input booking-form__area" id="hx-note" name="note" rows="3" maxlength="250"></textarea>
      </div>

      <div class="rsvp__hp" aria-hidden="true">
        <label>Leave this field empty<input type="text" name="hp_leave_empty" id="hx-hp" tabindex="-1" autocomplete="off"></label>
      </div>

      <p class="hx-status" id="hx-status" role="alert" hidden></p>
      <button class="hx-submit" id="hx-submit" type="submit">Add Us to the List</button>
      <p class="booking-form__consent">Free, and no commitment. We will email you a confirmation. Your details are used only to plan this training group.</p>
      <noscript><p class="hx-status">The form needs JavaScript. Please call us on @@PHONE@@ or email <a href="mailto:info@labyrinth.vision">info@labyrinth.vision</a>.</p></noscript>
    </form>

    <div class="hx-success" id="hx-success" tabindex="-1" hidden>
      @@BOLT40@@
      <p class="hx-label">You are on the list</p>
      <h2 class="hx-h2">GOT IT</h2>
      <p><span id="hx-success-name"></span>, we have <strong id="hx-success-kids"></strong> down for HYROX Youngstars Houston.</p>
      <p>A confirmation is on its way to <strong id="hx-success-email"></strong>. If you do not see it in a few minutes, check your spam folder. To change anything, just submit this form again with the same email.</p>
      <p>We will email the training schedule as soon as it is set. Structured training starts after tickets drop in November.</p>
      <div class="hx-cta">
        <a href="@@OFFICIAL@@" class="hx-btn hx-btn--volt" target="_blank" rel="noopener noreferrer">Read the age-group manuals</a>
        <a href="/" class="hx-btn hx-btn--line">Back to the site</a>
      </div>
    </div>
    <p class="hx-note" id="hx-over" hidden>The interest list has closed. Thank you to everyone who joined. See what is on this week on the <a href="/schedule">schedule</a>.</p>
  </div>
</section>

<section class="prog-section" id="faq" data-live>
  <div class="container">
    <p class="hx-label">@@BOLT16@@Good to know</p>
    <h2 class="hx-h2">QUESTIONS</h2>
    <div class="faq-list">
@@FAQ@@
    </div>
  </div>
</section>

<section class="prog-section hx-alt">
  <div class="container">
    <p class="hx-label">@@BOLT16@@Where</p>
    <h2 class="hx-h2">LABYRINTH BJJ</h2>
    <div class="hx-prose">
      <p>@@ADDRESS@@<br>Questions? Call <a href="tel:2813937983">@@PHONE@@</a> or ask Professor Shaun at the front desk.</p>
      <p class="hx-fine">Labyrinth BJJ is an independent academy training its own students for this race. We are not affiliated with or endorsed by HYROX. HYROX and HYROX Youngstars are trademarks of their owners.</p>
    </div>
  </div>
</section>
<script src="/hyrox.js" defer></script>
"""
    ages = "".join('<option value="%d">%d</option>' % (n, n) for n in range(8, 16))
    for token, value in {
        "@@BOLT@@": _hyrox_bolt(20), "@@BOLT16@@": _hyrox_bolt(16), "@@BOLT40@@": _hyrox_bolt(44),
        "@@CHIPS@@": chips, "@@STATIONS@@": stations, "@@RUNNING@@": running, "@@AGES@@": ages,
        "@@FAQ@@": faq_block(faqs), "@@SLUG@@": HYROX["slug"], "@@ENDPOINT@@": HYROX["endpoint"],
        "@@CLOSES@@": HYROX["closes_utc"], "@@OFFICIAL@@": HYROX["official"], "@@HOUSTON@@": HYROX["houston"],
        "@@PHONE@@": PHONE, "@@ADDRESS@@": ADDRESS,
    }.items():
        body = body.replace(token, value)
    assert "@@" not in body, "an unreplaced token in the HYROX page"
    return "\n".join([head, NAV, crumbs([("HYROX Youngstars", HYROX["path"])]), body, TAIL % {"footer": FOOTER}])



# ── /ennova ──────────────────────────────────────────────────────────────────
#
# A resident offer for one apartment complex, not a public promotion. Two things
# follow from that and both are deliberate:
#
#   • noindex, and absent from the sitemap. "Exclusively for Ennova residents"
#     stops meaning anything the moment the page ranks for "labyrinth bjj
#     discount" and turns up on a coupon aggregator. The people it is for
#     arrive by text, by QR code off the card, or by being handed the link.
#   • nothing on the public site links here, for the same reason.
#
# Everything on the page comes off the printed card. No distance or drive time
# is claimed, because nobody has measured one.

ENNOVA_FAQS = [
    ("Who can claim this?",
     "Anybody who currently lives at Ennova Fulshear. It is a neighbor rate rather than a public promotion, so it is one offer per household and it applies to new students only. If you have trained with us before, call us anyway and we will sort something out."),
    ("What counts as proof of residency?",
     "A lease, a utility bill, a package label, a resident portal screenshot, or the card itself if one was mailed to you. A photo on your phone at the front desk is fine. We are checking that you live there, not building a file: we look, we check you off the list, and we do not keep a copy."),
    ("What exactly do I save?",
     "The enrollment fee comes off entirely and your first month is half price. After that you are on the ordinary month-to-month rate with no contract, and you can stop whenever you like."),
    ("Do I have to decide on the day?",
     "No. Your first class is free whether or not you take the offer, and it is free for anybody, neighbor or not. Come and train first. The rate is there when you are ready."),
    ("Can my child use it and can I use it too?",
     "It is one offer per household, so it applies once. In practice that usually means putting it against whichever membership is the larger one. Ask at the desk and we will apply it wherever it saves you the most."),
    ("How long is it open?",
     "There is no end date advertised on the card and we are not going to invent one here. If that changes, this page changes with it."),
]



def render_ennova():
    url = SITE + "/ennova"
    head = HEAD % {
        "title": "Ennova Resident Offer | Labyrinth BJJ Fulshear",
        "description": "A neighbor rate for Ennova Fulshear residents: no enrollment fee and half off your first month at Labyrinth BJJ.",
        "url": url,
        "og_title": "Ennova Resident Offer | Labyrinth BJJ",
        "image": SITE + "/assets/og-image.jpg",
        "schema": "",
    }
    # HEAD has no robots slot and adding one would mean touching every caller,
    # so it goes in here. This is the only page that wants it.
    head = head.replace('<link rel="canonical"',
                        '<meta name="robots" content="noindex, follow">\n<link rel="canonical"', 1)

    return "\n".join([head, NAV, """
<section class="hero ennova-hero">
  <div class="hero__bg">
    <!-- The same photograph the front page puts behind its headline. The class
         group shot that was here fills its frame edge to edge, so at every crop
         the heading and the buttons sat on somebody's face. This one has the
         team low in a wide frame with trees above them, which is why text over
         it works. -->
    <picture class="hero__still"><source srcset="/assets/hero-team.webp" type="image/webp"><img src="/assets/hero-team.jpg" alt="The Labyrinth BJJ team in Fulshear, Texas, with their medals and trophy" loading="eager" fetchpriority="high" width="1600" height="900"></picture>
  </div>

  <div class="hero__content">
    <div class="hero__badge">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><path d="M7 0l1.76 4.58L14 5.24l-3.82 3.18L11.36 14 7 11.08 2.64 14l1.18-5.58L0 5.24l5.24-.66z"/></svg>
      Neighborly Rate &middot; Ennova Fulshear
    </div>

    <h1 class="hero__title"><span class="hero__h1-seo">Ennova Fulshear resident offer at Labyrinth BJJ</span> <span class="hero__h1-visual">$0 ENROLLMENT. <span>50%% OFF MONTH ONE.</span></span></h1>

    <p class="hero__subtitle">For people who live at Ennova Fulshear. Our head instructor lives there too, which is the whole reason this exists.</p>

    <div class="hero__ctas">
      <a data-book-trial href="/#book" class="btn btn--gold">Book a Free Class</a>
      <a href="#claim" class="btn btn--ghost">Claim the offer &rarr;</a>
      <a href="sms:+12813937983?&amp;body=ENNOVA" class="btn btn--ghost">Text ENNOVA to 281-393-7983</a>
    </div>

    <div class="hero__stats stagger">
      <div class="hero__stat">
        <div class="hero__stat-value">$0</div>
        <div class="hero__stat-label">Enrollment</div>
      </div>
      <div class="hero__stat">
        <div class="hero__stat-value">50%%</div>
        <div class="hero__stat-label">Off month one</div>
      </div>
      <div class="hero__stat">
        <div class="hero__stat-value">None</div>
        <div class="hero__stat-label">Contract</div>
      </div>
      <div class="hero__stat">
        <div class="hero__stat-value">Free</div>
        <div class="hero__stat-label">First class, always</div>
      </div>
    </div>
  </div>
</section>

<section class="programs">
  <div class="container">
    <div class="fade-in">
      <p class="section-label">Who it is for</p>
      <h2 class="section-title section-title--lg">YOU HAVE TO LIVE AT ENNOVA</h2>
      <p class="section-subtitle">A neighbor rate, not a public promotion. Current residents only, one offer per household, new students.</p>
    </div>

    <div class="ennova-proof stagger">
      <div class="ennova-proof__item"><span>1</span><p>A lease, a utility bill, a package label or the resident portal on your phone. The card counts too, if one was mailed to you.</p></div>
      <div class="ennova-proof__item"><span>2</span><p>Show it at the desk on your first visit. A photo on your phone is enough, and it takes about ten seconds.</p></div>
      <div class="ennova-proof__item"><span>3</span><p>We are checking that you live there, not building a file. We look, we check you off the list, and we do not keep a copy.</p></div>
    </div>
  </div>
</section>

<section class="coaches">
  <div class="container">
    <div class="ennova-quote fade-in">
      <div class="ennova-quote__shot">
        <picture><source srcset="/assets/coach-tony.webp" type="image/webp"><img src="/assets/coach-tony.jpg" alt="Prof. Anthony Curry, Head Instructor and Owner at Labyrinth BJJ" width="200" height="200" loading="lazy"></picture>
      </div>
      <div class="ennova-quote__body">
        <div class="hero__badge">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><path d="M7 0l1.76 4.58L14 5.24l-3.82 3.18L11.36 14 7 11.08 2.64 14l1.18-5.58L0 5.24l5.24-.66z"/></svg>
          Top 1%% nationally on jits.gg
        </div>
        <blockquote class="ennova-quote__text">&ldquo;I live at Ennova too. Come train with your neighbors.&rdquo;</blockquote>
        <p class="ennova-quote__who"><strong>Prof. Anthony Curry</strong><span>Head Instructor &amp; Owner &middot; Black belt, 14+ years</span></p>
        <p class="ennova-quote__where">The academy is at 6615 W Cross Creek Bend Ln, Suite 400. If you have driven past it, that is us.</p>
      </div>
    </div>
  </div>
</section>

<section class="programs ennova-programs">
  <div class="container">
    <div class="fade-in">
      <p class="section-label">What the membership covers</p>
      <h2 class="section-title section-title--lg">EVERYTHING, NOT A TIER</h2>
      <p class="section-subtitle">One membership, the whole schedule. The offer comes off whichever one suits you. <a href="/pricing" class="section-subtitle__link">See every price &rarr;</a></p>
    </div>

    <div class="programs__grid stagger">
      <div class="program-card program-card--half">
        <picture><source srcset="/assets/youth-card.webp" type="image/webp"><img src="/assets/youth-card.jpg" alt="Kids Brazilian jiu-jitsu class at Labyrinth BJJ in Fulshear, TX" class="program-card__image" loading="lazy" width="800" height="533"></picture>
        <div class="program-card__body">
          <p class="program-card__tag">Ages 3&ndash;15</p>
          <h3 class="program-card__title">Kids &amp; Teens</h3>
          <p class="program-card__desc">Three age groups, six days a week, taught by black belts who have coached children to Pan American titles.</p>
        </div>
      </div>

      <div class="program-card program-card--half">
        <picture><source srcset="/assets/adult-gi.webp" type="image/webp"><img src="/assets/adult-gi.jpg" alt="Adult Brazilian jiu-jitsu class at Labyrinth BJJ in Fulshear, TX" class="program-card__image" loading="lazy" width="720" height="720"></picture>
        <div class="program-card__body">
          <p class="program-card__tag">Gi &amp; No-Gi</p>
          <h3 class="program-card__title">Adults</h3>
          <p class="program-card__desc">From 6:30 AM to the evening, seven days a week. Beginner classes daily, whatever you have or have not done before.</p>
        </div>
      </div>

      <div class="program-card program-card--third">
        <!-- A 16:10 recut of the portrait, framed on his face. The card CSS
             crops every image to 16:10, and the centre of a 528x820 portrait
             is the torso: the original decapitated him at card size. -->
        <picture><source srcset="/assets/wrestling-card-face.webp" type="image/webp"><img src="/assets/wrestling-card-face.jpg" alt="A youth wrestler at Labyrinth BJJ in Fulshear, TX" class="program-card__image" loading="lazy" width="800" height="500"></picture>
        <div class="program-card__body">
          <p class="program-card__tag">Ages 7&ndash;17</p>
          <h3 class="program-card__title">Youth Wrestling</h3>
          <p class="program-card__desc">Included in any kids or teens membership, never charged as an extra.</p>
        </div>
      </div>

      <div class="program-card program-card--third">
        <picture><source srcset="/assets/competition-card.webp" type="image/webp"><img src="/assets/competition-card.jpg" alt="Labyrinth BJJ competitor on the podium after an IBJJF tournament" class="program-card__image" loading="lazy" width="800" height="600"></picture>
        <div class="program-card__body">
          <p class="program-card__tag">If you want it</p>
          <h3 class="program-card__title">Competition Team</h3>
          <p class="program-card__desc">No separate team fee. Plenty of members never compete, and that is fine too.</p>
        </div>
      </div>

      <div class="program-card program-card--third">
        <picture><source srcset="/assets/strength-conditioning.webp" type="image/webp"><img src="/assets/strength-conditioning.jpg" alt="The all-ages strength and conditioning class at Labyrinth BJJ in Fulshear, TX: adults at the back, kids at the front, all flexing" class="program-card__image" loading="lazy" width="1200" height="800"></picture>
        <div class="program-card__body">
          <p class="program-card__tag">All ages</p>
          <h3 class="program-card__title">Strength &amp; Conditioning</h3>
          <p class="program-card__desc">Adults and children in the same room, twice a week. Sauna and cold plunge as well.</p>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="trial" id="claim">
  <div class="container">
    <div class="fade-in">
      <p class="section-label">Two minutes</p>
      <h2 class="section-title section-title--lg">CLAIM THE NEIGHBOR RATE</h2>
    </div>

    <div class="trial__layout">
      <div class="trial__content fade-in">
        <p>Ready to train? <a data-book-trial href="/#book">Book your free class</a> straight off the timetable, and bring proof you live at Ennova to the desk. Prefer to talk first? Fill this in and we will reply with times that suit you, or text <strong>ENNOVA</strong> to <a href="tel:2813937983">281-393-7983</a>.</p>

        <h3>What happens next</h3>
        <ul>
          <li>Book a class here, or we text you back with times that fit your week</li>
          <li>Your first class is free, whether or not you take the offer</li>
          <li>Show proof of Ennova residency at the desk and the rate is applied</li>
        </ul>

        <h3>What you save</h3>
        <ul>
          <li>The enrollment fee, in full</li>
          <li>Half of your first month</li>
          <li>Nothing after that: ordinary month-to-month rate, no contract</li>
        </ul>

        <div class="trial-form">
          <h3 class="trial-form__title">Claim Your Neighbor Rate</h3>
          <form id="ennovaForm" novalidate>
            <div class="form-row">
              <div class="form-group">
                <label for="ennovaName">Name</label>
                <input type="text" id="ennovaName" name="name" placeholder="Your name" autocomplete="name" required>
              </div>
              <div class="form-group">
                <label for="ennovaPhone">Phone</label>
                <input type="tel" id="ennovaPhone" name="phone" placeholder="(281) 555-0100" autocomplete="tel" required>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="ennovaEmail">Email</label>
                <input type="email" id="ennovaEmail" name="email" placeholder="you@email.com" autocomplete="email" required>
              </div>
              <div class="form-group">
                <label for="ennovaUnit">Ennova building or unit</label>
                <input type="text" id="ennovaUnit" name="unit" placeholder="e.g. Building 3, Apt 214" autocomplete="off" required>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group form-group--full">
                <label for="ennovaProgram">Who is it for?</label>
                <select id="ennovaProgram" name="program">
                  <option value="kids-3-6">Child, ages 3 to 6</option>
                  <option value="kids-7-12">Child, ages 7 to 12</option>
                  <option value="teens">Teenager, 13 to 15</option>
                  <option value="adult" selected>Myself, adult classes</option>
                  <option value="wrestling">Youth wrestling</option>
                </select>
              </div>
            </div>
            <label class="ennova-check">
              <input type="checkbox" id="ennovaResident" name="resident" required>
              <span>I currently live at Ennova Fulshear and can show proof at the desk.</span>
            </label>
            <button type="submit" class="btn btn--gold trial-form__submit" id="ennovaSubmit">Claim the offer</button>
            <p class="ennova-form__error" id="ennovaError" role="alert" hidden></p>
            <p class="ennova-form__ok" id="ennovaOk" role="status" hidden>Got it. We will be in touch shortly on the number you gave. Bring proof of residency to your first visit and we will apply the rate there.</p>
          </form>
          <p class="ennova-fine">New students only. Month to month, no contracts. One offer per household.</p>
        </div>
      </div>

      <div class="trial__image fade-in">
        <picture><source srcset="/assets/community-real.webp" type="image/webp"><img src="/assets/community-real.jpg" alt="Families and children of the Labyrinth BJJ community in Fulshear" width="800" height="600" loading="lazy"></picture>
      </div>
    </div>
  </div>
</section>

<section class="faq">
  <div class="container container--narrow">
    <div class="fade-in">
      <p class="section-label">Before you ask</p>
      <h2 class="section-title section-title--lg">THE SMALL PRINT, IN PLAIN WORDS</h2>
    </div>
    <div class="faq__list stagger">
%(faqs)s
    </div>
  </div>
</section>

<script>
(function () {
  var form = document.getElementById('ennovaForm');
  if (!form) return;
  /* booking.js defines LabyrinthCrm and is loaded after this block, so it does
     not exist yet. Look it up when the form is submitted, not when the handler
     is attached, or the button silently does nothing. */
  var CRM = { 'kids-3-6': 'Kids 3-6', 'kids-7-12': 'Kids 7-12', 'teens': 'Teens',
              'adult': 'Adult BJJ', 'wrestling': 'Wrestling' };
  var ASKED = { 'kids-3-6': 'child 3-6', 'kids-7-12': 'child 7-12', 'teens': 'teenager',
                'adult': 'adult classes', 'wrestling': 'youth wrestling' };
  var btn = document.getElementById('ennovaSubmit');
  var err = document.getElementById('ennovaError');
  var ok = document.getElementById('ennovaOk');
  var v = function (id) { return (document.getElementById(id).value || '').trim(); };

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    err.hidden = true;
    var resident = document.getElementById('ennovaResident').checked;
    if (!v('ennovaName') || !v('ennovaPhone') || v('ennovaEmail').indexOf('@') === -1
        || !v('ennovaUnit') || !resident) {
      err.textContent = 'Please fill in every box, including your Ennova unit, and confirm you live there.';
      err.hidden = false;
      return;
    }
    var crm = window.LabyrinthCrm;
    if (!crm || !crm.send) {
      err.textContent = 'Something did not load properly. Please call us on 281-393-7983 and we will apply it over the phone.';
      err.hidden = false;
      return;
    }
    var slug = document.getElementById('ennovaProgram').value;
    btn.disabled = true;
    var original = btn.textContent;
    btn.textContent = 'Sending...';
    /* The note is what the front desk reads. It has to say which offer this is
       and which unit to check, because the program field can only hold one of
       the CRM's own six values and none of them mean "Ennova". */
    crm.send({
      name: v('ennovaName'), email: v('ennovaEmail'), phone: v('ennovaPhone'),
      program: CRM[slug] || 'Adult BJJ',
      note: 'ENNOVA RESIDENT OFFER ($0 enrollment + 50%% first month). Unit: '
        + v('ennovaUnit') + '. Interested in ' + (ASKED[slug] || slug)
        + '. Confirmed current resident on the form; check proof at the desk.'
    }).then(function (sent) {
      btn.disabled = false;
      btn.textContent = original;
      if (sent) { form.querySelectorAll('.form-row, .form-group, .ennova-check, .trial-form__submit')
        .forEach(function (el) { el.style.display = 'none'; }); ok.hidden = false; }
      else {
        err.textContent = 'That did not send. Please call us on 281-393-7983 and we will apply it over the phone.';
        err.hidden = false;
      }
    });
  });
})();
</script>""" % {"faqs": faq_block(ENNOVA_FAQS)},
        TAIL % {"footer": FOOTER}])


def render_legacy():
    """The Team Legacy merger announcement, at /legacy/.

    Supplied as a standalone page in its own fonts and its own stylesheet. It
    is rebuilt here on the front page's components for two reasons: it now sits
    inside the site rather than beside it, so it gets the real nav, the real
    footer and the booking modal; and a second stylesheet defining a second set
    of buttons is the thing that makes a site look like two sites.

    The timetable that was on the supplied page is deliberately not reproduced.
    It was there because the page had no navigation, and a hand-copied copy of
    the week is a second source of truth that drifts the first time a class
    moves. The page links to /schedule, which is generated from schedule_data
    and checked against the CRM by schedule-check.mjs.
    """
    url = SITE + "/legacy/"
    head = HEAD % {
        "title": "Team Legacy has merged with Labyrinth BJJ | Fulshear, TX",
        "description": "Team Legacy Martial Arts and Labyrinth BJJ are now one team. "
                       "Scott Jones coaches full time at Labyrinth. "
                       "First class free, seven days a week in Fulshear.",
        "url": url,
        "og_title": "Two Schools. One Team.",
        "image": SITE + "/assets/legacy-announcement.jpg",
        "schema": "\n".join([
            jsonld(crumb_schema([("Team Legacy", "/legacy/")])),
            jsonld({"@context": "https://schema.org", "@type": "WebPage",
                    "name": "Team Legacy has merged with Labyrinth BJJ",
                    "url": url, "about": PROVIDER}),
        ]),
    }

    return "\n".join([head, NAV, """
<section class="hero legacy-hero">
  <div class="hero__bg">
    <picture class="hero__still"><source srcset="/assets/hero-team.webp" type="image/webp"><img src="/assets/hero-team.jpg" alt="The Labyrinth BJJ team in Fulshear, Texas, with their medals and trophy" loading="eager" fetchpriority="high" width="1600" height="900"></picture>
  </div>

  <div class="hero__content">
    <div class="legacy-hero__copy">
      <div class="hero__badge">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><path d="M7 0l1.76 4.58L14 5.24l-3.82 3.18L11.36 14 7 11.08 2.64 14l1.18-5.58L0 5.24l5.24-.66z"/></svg>
        It&rsquo;s official &middot; Fulshear, TX
      </div>

      <h1 class="hero__title"><span class="hero__h1-seo">Team Legacy Martial Arts has merged with Labyrinth BJJ</span> <span class="hero__h1-visual">TWO SCHOOLS. <span>ONE TEAM.</span></span></h1>

      <p class="hero__subtitle">Team Legacy Martial Arts has merged with Labyrinth BJJ, and Scott Jones is bringing his team with him. Two head coaches on one mat. Come and see what that looks like.</p>

      <div class="hero__ctas">
        <a href="/legacy/transfer" class="btn btn--gold">Transfer my membership</a>
        <a data-book-trial href="/#book" class="btn btn--ghost">Try a free class</a>
        <a href="tel:2813937983" class="btn btn--ghost">Call the school &middot; 281-393-7983</a>
      </div>
    </div>

    <!-- The announcement art, minus its lower half: the graphic bakes in the
         same TWO SCHOOLS. ONE TEAM. headline the H1 already sets, so the page
         shows the part it cannot say in type — the two head coaches and the
         crossed crests. The full square is the og:image, so shares get the
         whole poster. -->
    <picture class="legacy-hero__duo fade-in">
      <source srcset="/assets/legacy-hero-duo.webp" type="image/webp">
      <img src="/assets/legacy-hero-duo.jpg" alt="Head coach Anthony Curry of Labyrinth BJJ and Scott Jones of Team Legacy Martial Arts, with both school crests" width="1280" height="800" loading="eager" fetchpriority="high">
    </picture>

    <!-- Outside the copy column so it spans the full row on a desktop and
         lands after the art on a phone, where copy, art and stats stack. -->
    <div class="hero__stats stagger">
      <div class="hero__stat">
        <div class="hero__stat-value">Top 1%</div>
        <div class="hero__stat-label">In the nation</div>
      </div>
      <div class="hero__stat">
        <div class="hero__stat-value">""" + jits_data.n(jits_data.GOLDS) + """</div>
        <div class="hero__stat-label">Gold medals</div>
      </div>
      <div class="hero__stat">
        <div class="hero__stat-value">7th</div>
        <div class="hero__stat-label">Dan Taekwondo</div>
      </div>
    </div>
  </div>
</section>

<section class="programs">
  <div class="container">
    <div class="fade-in">
      <p class="section-label">What happened</p>
      <h2 class="section-title section-title--lg">ONE ROOM FROM NOW ON</h2>
      <p class="section-subtitle">Two schools in Fulshear became one. The Team Legacy name is retiring; the students, the coach and the standards are not.</p>
    </div>

    <div class="legacy-marks fade-in">
      <div class="legacy-mark">
        <img src="/assets/team-legacy-crest.png" alt="The Team Legacy Martial Arts crest: Taekwondo and Jiu-Jitsu" width="480" height="480" loading="lazy">
        <p class="legacy-mark__label">Team Legacy Martial Arts</p>
      </div>
      <div class="legacy-marks__join" aria-hidden="true">+</div>
      <div class="legacy-mark legacy-mark--ours">
        <picture><source srcset="/assets/logo-maze-480.webp" type="image/webp"><img src="/assets/logo-maze-480.png" alt="The Labyrinth Brazilian Jiu-Jitsu maze mark" width="480" height="480" loading="lazy"></picture>
        <p class="legacy-mark__label">Labyrinth Brazilian Jiu-Jitsu</p>
      </div>
    </div>
  </div>
</section>

<section class="coaches">
  <div class="container">
    <div class="legacy-coach fade-in">
      <div class="legacy-coach__shot">
        <picture><source srcset="/assets/coach-scott-portrait.webp" type="image/webp"><img src="/assets/coach-scott-portrait.jpg" alt="Scott Jones of Team Legacy Martial Arts, now coaching full time at Labyrinth BJJ" width="560" height="560" loading="lazy"></picture>
        <picture class="legacy-coach__mark"><source srcset="/assets/team-legacy-wordmark.webp" type="image/webp"><img src="/assets/team-legacy-wordmark.png" alt="The Team Legacy BJJ and Taekwondo wordmark" width="900" height="727" loading="lazy"></picture>
      </div>
      <div class="legacy-coach__body">
        <p class="section-label">Your coach is still your coach</p>
        <h2 class="section-title">Scott <span>Jones</span></h2>
        <div class="legacy-coach__pills">
          <span class="hero__badge">7th Dan Black Belt</span>
          <span class="hero__badge">30+ Years Coaching</span>
          <span class="hero__badge">Full Time at Labyrinth</span>
        </div>
        <p class="legacy-coach__text"><strong>This is not a coach changing jobs.</strong> A head coach merged his entire school into ours and brought his whole room with him. That does not happen in this sport.</p>
        <p class="legacy-coach__text">Scott built Team Legacy from nothing. He has trained at Labyrinth since the day we opened, and he was the first student ever to tap our head coach in a live roll. Thirty years of teaching children and adults: more mat-teaching experience than anyone else on our staff.</p>
        <p class="legacy-coach__text"><strong>If your child has been learning from Coach Scott, they still will be.</strong></p>
      </div>
    </div>
  </div>
</section>

<section class="programs ennova-programs">
  <div class="container">
    <div class="fade-in">
      <p class="section-label">What comes with him</p>
      <h2 class="section-title section-title--lg">THE WHOLE ROOM</h2>
      <p class="section-subtitle">Not a sign on a door. The students, the competition record and the way the classes are run all came across together.</p>
    </div>

    <div class="programs__grid stagger">
      <div class="program-card program-card--half">
        <picture><source srcset="/assets/legacy-medals.webp" type="image/webp"><img src="/assets/legacy-medals.jpg" alt="Team Legacy Martial Arts students with their competition medals" class="program-card__image" loading="lazy" width="1200" height="900"></picture>
        <div class="program-card__body">
          <p class="program-card__tag">He brought his team</p>
          <h3 class="program-card__title">His Room, Not Just His Name</h3>
          <p class="program-card__desc">The families who trained at Team Legacy are training here now, in the same age groups, with the same coach at the front.</p>
        </div>
      </div>

      <div class="program-card program-card--half">
        <picture><source srcset="/assets/legacy-class.webp" type="image/webp"><img src="/assets/legacy-class.jpg" alt="A Team Legacy Martial Arts class in session" class="program-card__image" loading="lazy" width="1200" height="670"></picture>
        <div class="program-card__body">
          <p class="program-card__tag">Thirty years of it</p>
          <h3 class="program-card__title">How The Class Is Run</h3>
          <p class="program-card__desc">Small groups, separated by age, with a coach watching every pair. That is how Scott has always taught, and nothing about it changes here.</p>
        </div>
      </div>

      <div class="program-card program-card--third">
        <picture><source srcset="/assets/legacy-kick.webp" type="image/webp"><img src="/assets/legacy-kick.jpg" alt="A Team Legacy Taekwondo student mid-kick" class="program-card__image" loading="lazy" width="900" height="1350"></picture>
        <div class="program-card__body">
          <p class="program-card__tag">Taekwondo</p>
          <h3 class="program-card__title">The Striking Side</h3>
          <p class="program-card__desc">Scott&rsquo;s Taekwondo rank is a 7th Dan. Ask him at the desk what that means for your child&rsquo;s belt.</p>
        </div>
      </div>

      <div class="program-card program-card--third">
        <picture><source srcset="/assets/youth-card.webp" type="image/webp"><img src="/assets/youth-card.jpg" alt="Kids Brazilian jiu-jitsu class at Labyrinth BJJ in Fulshear, TX" class="program-card__image" loading="lazy" width="800" height="533"></picture>
        <div class="program-card__body">
          <p class="program-card__tag">Ages 3&ndash;15</p>
          <h3 class="program-card__title">Kids &amp; Teens</h3>
          <p class="program-card__desc">Three age groups, six days a week, taught by black belts who have coached children to Pan American titles.</p>
        </div>
      </div>

      <div class="program-card program-card--third">
        <picture><source srcset="/assets/adult-gi.webp" type="image/webp"><img src="/assets/adult-gi.jpg" alt="Adult Brazilian jiu-jitsu class at Labyrinth BJJ in Fulshear, TX" class="program-card__image" loading="lazy" width="720" height="720"></picture>
        <div class="program-card__body">
          <p class="program-card__tag">Gi &amp; No-Gi</p>
          <h3 class="program-card__title">Adults</h3>
          <p class="program-card__desc">From 6:30 AM to the evening, seven days a week, with beginner classes daily. <a href="/schedule" class="program-card__page-link">See the full timetable</a></p>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="trial" id="transfer">
  <div class="container">
    <div class="fade-in">
      <p class="section-label">Currently enrolled at Team Legacy?</p>
      <h2 class="section-title section-title--lg">MOVE YOUR MEMBERSHIP OVER</h2>
    </div>

    <div class="trial__layout">
      <div class="trial__content fade-in">
        <p>Your spot does not transfer automatically. We need you signed up at Labyrinth so we can put your child in the right class. It takes two minutes. Your September payment to Team Legacy is your last one — <strong>Labyrinth billing starts in October,</strong> so you are never charged twice.</p>

        <h3>What happens next</h3>
        <ul>
          <li>Fill in the transfer form and we move your billing across</li>
          <li>Team Legacy takes its final payment in September; Labyrinth takes over from October</li>
          <li>We place your child in the age group they should be in</li>
        </ul>

        <h3>Still being finalised</h3>
        <ul>
          <li>What happens with your child&rsquo;s rank</li>
          <li>Exactly which classes they train, and when</li>
          <li>Call us and we will walk your family through it</li>
        </ul>

        <div class="legacy-transfer-cta">
          <a href="/legacy/transfer" class="btn btn--gold">Transfer my membership</a>
          <a href="tel:2813937983" class="btn btn--ghost">Or call 281-393-7983</a>
        </div>
      </div>

      <div class="trial__image fade-in">
        <picture><source srcset="/assets/legacy-medals.webp" type="image/webp"><img src="/assets/legacy-medals.jpg" alt="Team Legacy Martial Arts students with their competition medals" width="1200" height="900" loading="lazy"></picture>
      </div>
    </div>
  </div>
</section>

<section class="programs">
  <div class="container">
    <div class="fade-in">
      <p class="section-label">Where to find us</p>
      <h2 class="section-title section-title--lg">STILL IN FULSHEAR</h2>
    </div>

    <!-- These are facts, not steps. They were in .ennova-proof, which numbers
         its items 1-2-3 because proving you live somewhere happens in an
         order; an address and a phone number do not, and the numerals read as
         instructions nobody can follow. .prog-facts is the label-and-value
         strip the program pages already use for exactly this. -->
    <div class="prog-facts legacy-facts stagger">
      <div class="prog-fact">
        <div class="prog-fact__label">Address</div>
        <div class="prog-fact__value">6615 W Cross Creek Bend Ln, Suite 400<br>Fulshear, TX 77441</div>
      </div>
      <div class="prog-fact">
        <div class="prog-fact__label">Phone and text</div>
        <div class="prog-fact__value"><a href="tel:2813937983">281-393-7983</a></div>
      </div>
      <div class="prog-fact">
        <div class="prog-fact__label">Ages</div>
        <div class="prog-fact__value">3 and up<br>Kids, teens and adults</div>
      </div>
      <div class="prog-fact">
        <div class="prog-fact__label">Memberships</div>
        <div class="prog-fact__value">Month to month<br><em>First class free</em></div>
      </div>
    </div>
  </div>
</section>""",
        TAIL % {"footer": FOOTER}])


def render_legacy_transfer():
    """The membership transfer form, at /legacy/transfer.

    Writes MEMBERS, not leads: a Team Legacy family that signs here already
    trains, so they belong on the roster from the moment they sign. The
    member-transfer edge function does that, then hands off to Stripe Checkout
    in `setup` mode, which stores the card and charges nothing. Every rate here
    is negotiated, so the price is set afterwards by a person, against a member
    who already exists and a card already on file.

    noindex: it is a billing page for people who are already enrolled
    somewhere else, not something anybody should reach from a search.
    """
    url = SITE + "/legacy/transfer"
    head = HEAD % {
        "title": "Transfer Your Membership | Labyrinth BJJ",
        "description": "Team Legacy members: move your membership to Labyrinth BJJ. Takes two minutes.",
        "url": url,
        "og_title": "Transfer Your Membership | Labyrinth BJJ",
        "image": SITE + "/assets/og-image.jpg",
        "schema": "",
    }
    head = head.replace('<link rel="canonical"',
                        '<meta name="robots" content="noindex, follow">\n<link rel="canonical"', 1)

    return "\n".join([head, NAV, """
<section class="trial legacy-transfer">
  <div class="container container--narrow">
    <div class="fade-in">
      <p class="section-label">Team Legacy members</p>
      <h1 class="section-title section-title--lg">TRANSFER YOUR MEMBERSHIP</h1>
      <p class="section-subtitle">Two minutes. Coach Scott is now full time at Labyrinth: fill this in and we will move you across. Your September Team Legacy payment is your last one, and Labyrinth billing starts in October — you are never charged twice.</p>
    </div>

    <div class="trial-form fade-in" id="tfPanel">
      <form id="transferForm" novalidate>
        <div class="form-row">
          <div class="form-group form-group--full">
            <label for="tfStudent">Student name <span class="form-group__hint">add all students on one line, separated by commas</span></label>
            <input type="text" id="tfStudent" name="students" placeholder="Jordan Smith, Riley Smith" autocomplete="off" required>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="tfPhone">Phone</label>
            <input type="tel" id="tfPhone" name="phone" placeholder="(281) 555-0134" autocomplete="tel" required>
          </div>
          <div class="form-group">
            <label for="tfEmail">Email</label>
            <input type="email" id="tfEmail" name="email" placeholder="you@email.com" autocomplete="email" required>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group form-group--full">
            <label for="tfProgram">Who is transferring?</label>
            <select id="tfProgram" name="program">
              <option value="kids-3-6">Child, ages 3 to 6</option>
              <option value="kids-7-12" selected>Child, ages 7 to 12</option>
              <option value="teens">Teenager, 13 to 15</option>
              <option value="adult">An adult</option>
              <option value="family">More than one, mixed ages</option>
            </select>
          </div>
        </div>

        <label class="ennova-check">
          <input type="checkbox" id="tfWaiver" required>
          <span>I have read and agree to the <a href="https://crm.labyrinth.vision/waiver" target="_blank" rel="noopener">Labyrinth BJJ liability waiver and membership terms</a>.</span>
        </label>

        <!-- Storing a card to charge later is only lawful on terms that say
             what will be charged, when, how the amount is arrived at, and how
             to stop it. Every rate here is negotiated, so "how the amount is
             determined" is the sentence doing the real work. -->
        <label class="ennova-check">
          <input type="checkbox" id="tfAuth" required>
          <span>I authorize Labyrinth BJJ to store this card and charge it for my monthly membership, replacing my Team Legacy billing. <strong>Nothing is charged today.</strong> Team Legacy takes its final payment in September, and my Labyrinth billing starts in October. The rate is the one we agree for the plan we choose together, and Labyrinth will confirm it with me before the first charge. It then repeats monthly on the same date. Membership is month to month and I can cancel at any time by telling the academy.</span>
        </label>

        <div class="form-row">
          <div class="form-group form-group--full">
            <label for="tfSig">Signature <span class="form-group__hint">type your full name</span></label>
            <input type="text" id="tfSig" name="signature" placeholder="Your full name" autocomplete="off" required>
            <p class="legacy-transfer__hint">Typing your name here counts as your electronic signature, and we keep a copy of what you agreed to.</p>
          </div>
        </div>

        <!-- Hidden from people, filled in by robots. -->
        <div class="legacy-transfer__trap" aria-hidden="true">
          <label for="tfCompany">Company</label>
          <input type="text" id="tfCompany" name="company" tabindex="-1" autocomplete="off">
        </div>

        <button type="submit" class="btn btn--gold trial-form__submit" id="tfSubmit">Continue to card details</button>
        <p class="ennova-form__error" id="tfError" role="alert" hidden></p>
      </form>
      <p class="ennova-fine">The next screen is Stripe, where you enter your card. <strong>No payment is taken there.</strong> The card is stored so your Labyrinth membership can start in October, once we have agreed your rate. Questions? Text or call <a href="tel:2813937983">281-393-7983</a>.</p>
    </div>

    <div class="trial-form fade-in" id="tfDone" hidden>
      <h2 class="trial-form__title">You are on the roster.</h2>
      <p class="legacy-transfer__done">Your card is saved and nothing has been charged. September&rsquo;s Team Legacy payment is your last one; your Labyrinth billing starts in October, and we will confirm your rate with you before then. If anything looks wrong, text or call <a href="tel:2813937983">281-393-7983</a>.</p>
      <a data-book-trial href="/#book" class="btn btn--gold trial-form__submit">See the class times</a>
    </div>
  </div>
</section>

<script>
(function () {
  var form = document.getElementById('transferForm');
  var panel = document.getElementById('tfPanel');
  var done = document.getElementById('tfDone');
  if (!form) return;

  /* Stripe sends them back here with ?done=1 after the card is stored. Nothing
     is charged at that point, so the wording has to say so rather than
     congratulate somebody on a payment they have not made. */
  var q = new URLSearchParams(location.search);
  if (q.get('done')) { panel.hidden = true; done.hidden = false; }

  var ENDPOINT = 'https://jctufxvmuvobaggxcwfn.supabase.co/functions/v1/member-transfer';
  var btn = document.getElementById('tfSubmit');
  var err = document.getElementById('tfError');
  var v = function (id) { return (document.getElementById(id).value || '').trim(); };

  var show = function (message) {
    err.textContent = message;
    err.hidden = false;
    btn.disabled = false;
    btn.textContent = 'Continue to card details';
  };

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    err.hidden = true;

    var students = v('tfStudent'), phone = v('tfPhone'), email = v('tfEmail'), sig = v('tfSig');
    if (!students || !phone || !sig || email.indexOf('@') === -1
        || !document.getElementById('tfWaiver').checked
        || !document.getElementById('tfAuth').checked) {
      show('Please complete every field above, including both agreements.');
      return;
    }

    btn.disabled = true;
    btn.textContent = 'One moment...';

    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        students: students, phone: phone, email: email, signature: sig,
        program: document.getElementById('tfProgram').value,
        waiver_accepted: true, billing_authorized: true,
        company: v('tfCompany')
      })
    }).then(function (r) { return r.json().catch(function () { return {}; }); })
      .then(function (data) {
        /* Recorded but no card page: they ARE on the roster, so the message
           must not read as a failure that lost their details. */
        if (data && data.url) { window.location.href = data.url; return; }
        show((data && data.error)
          || 'That did not go through. Please text or call 281-393-7983 and we will move you across.');
      })
      .catch(function () {
        show('That did not go through. Please text or call 281-393-7983 and we will move you across.');
      });
  });
})();
</script>""",
        TAIL % {"footer": FOOTER}])


def render_drop():
    """The Enigma gi pre-order, at /drop.

    The page itself is not written here. It arrives from the CRM as a
    self-contained fragment and lives verbatim in scripts/drop-fragment.html,
    because four things in it have to agree with the endpoint that takes the
    money — the endpoint URL, the size list, the two colorway names and the
    $109 — and a test in the CRM repo reads them straight out of that file. So
    it is pasted in, not rewritten: when a new version is handed over, replace
    that one file and rebuild. Nothing in this function edits its content.

    What this adds is the building around it. Served as a raw standalone file
    the page had no nav and no footer, so a buyer who wanted to see the
    timetable or ring the academy had to type the address again. Wrapping it in
    HEAD + NAV + TAIL is the case the fragment was written for — it carries no
    doctype and no charset precisely so a host page can supply them — and it
    also fixes the mobile trap the fragment warns about, since a fragment
    served alone renders in quirks mode at 980px.

    Three adjustments the site's own chrome makes necessary, in a style block
    after the fragment so they win on document order rather than by editing it:
    the nav is fixed, so the content needs to start below it; .nav sits at
    z-index 100 and the basket sheet at 70, which would draw the site header on
    top of an open modal; and the fixed Reserve bar would otherwise cover the
    footer's one line of text. The typography is pointed at the site's faces so
    the header and the page below it do not read as two different websites.

    noindex, and out of the sitemap: it is a drop for people who are given the
    link, not a shop front competing with the program pages.
    """
    url = SITE + "/drop"
    head = HEAD % {
        "title": "Enigma Gi Pre-order | Labyrinth BJJ",
        "description": "Pre-order the Enigma gi. Two colorways, every size, $109 "
                       "— paid now, which is what reserves it.",
        "url": url,
        "og_title": "Enigma Gi Pre-order",
        "image": SITE + "/assets/og-image.jpg",
        "schema": "",
    }
    head = head.replace('<link rel="canonical"',
                        '<meta name="robots" content="noindex, follow">\n<link rel="canonical"', 1)

    with open(os.path.join(ROOT, "scripts", "drop-fragment.html"), encoding="utf-8") as fh:
        fragment = fh.read()

    fit = """
<style>
  /* The nav is fixed, so the fragment's own top padding starts underneath it. */
  .drop { padding-top: calc(var(--nav-height) + var(--space-8)); }

  /* .nav is z-index 100 and the basket sheet is 70, which drew the site header
     over an open modal. Above the nav, below booking.css's overlay at 10000. */
  .drop__sheet { z-index: 300; }

  /* The Reserve bar is fixed to the bottom, and the footer is a single line:
     without this it sits underneath the bar the moment anything is in the
     basket. Unconditional, because the bar comes and goes. */
  .footer { padding-bottom: calc(96px + env(safe-area-inset-bottom, 0px)); }

  /* The fragment sets system-ui, including inside `font:` shorthands that carry
     a family with them — hence the button selectors as well as the containers.
     Left alone, the site's header and the page under it are visibly two
     different websites. */
  .drop, .drop__sheet-inner, .drop__size, .drop__submit, .drop__ghost,
  .drop__qty button { font-family: var(--font-body); }
  .drop__title { font-family: var(--font-display); }
</style>
"""

    return "\n".join([head, NAV, fragment, fit, TAIL % {"footer": FOOTER}])


def render_coach(c):
    url = "%s/coaches/%s" % (SITE, c["slug"])
    plain = re.sub(r"&\w+;", " ", c["name"]).strip()

    person = {
        "@context": "https://schema.org",
        "@type": "Person",
        "name": plain,
        "jobTitle": re.sub(r"&\w+;", "&", c["role"]),
        "url": url,
        "image": "%s/assets/%s.jpg" % (SITE, c["photo"]),
        "worksFor": PROVIDER,
        "knowsAbout": ["Brazilian Jiu-Jitsu", "Grappling", "Wrestling"]
        if c["slug"] == "malik-pickett" else
        ["Brazilian Jiu-Jitsu", "Gi and No-Gi grappling", "Competition coaching"],
    }
    if c["rank"] == "Black Belt":
        cred = {
            "@type": "EducationalOccupationalCredential",
            "credentialCategory": "Brazilian Jiu-Jitsu Black Belt",
        }
        ln = c.get("lineage")
        if ln:
            # recognizedBy is the honest field for this: a BJJ black belt is
            # awarded by a person at an academy, not issued by an institution.
            awarder = {"@type": "Person", "name": re.sub(r"^Prof\. ", "", ln["from"]),
                       "affiliation": {"@type": "Organization", "name": ln["at"]}}
            if ln.get("from_url"):
                awarder["url"] = SITE + ln["from_url"]
            cred["recognizedBy"] = awarder
        person["hasCredential"] = cred

    head = HEAD % {
        "title": c["title"], "description": c["description"], "url": url,
        "og_title": "%s: %s | Labyrinth BJJ" % (c["short"], re.sub(r"&\w+;", "&", c["role"])),
        "image": "%s/assets/%s.jpg" % (SITE, c["photo"]),
        "schema": "\n".join([jsonld(person),
                             jsonld(crumb_schema([("Coaches", "/coaches/"), (c["short"], "/coaches/" + c["slug"])])),
                             jsonld(faq_schema(c["faqs"]))]),
    }

    others = "\n".join(
        '      <a href="/coaches/%s" class="prog-sibling"><div class="prog-sibling__title">%s</div>'
        '<div class="prog-sibling__desc">%s</div></a>' % (o["slug"], o["short"], re.sub(r"&\w+;", "&", o["role"]))
        for o in COACHES if o["slug"] != c["slug"])

    return "\n".join([head, NAV,
        crumbs([("Coaches", "/coaches/"), (c["short"], "/coaches/" + c["slug"])]), """
<header class="prog-hero">
  <div class="container">
    <div class="prog-hero__grid">
      <div>
        <p class="section-label">%(role)s</p>
        <h1 class="prog-hero__title">%(name)s</h1>
        <p class="prog-hero__lead">%(lead)s</p>
        <div class="prog-hero__cta">
          <a data-book-trial href="/#book" class="btn btn--gold">Train With Us</a>
          <a href="/schedule" class="btn btn--ghost">See the Timetable</a>
        </div>
      </div>
      <div class="prog-hero__shot coach-hero__shot">
        <picture>
          <source srcset="/assets/%(photo)s.webp" type="image/webp">
          <img src="/assets/%(photo)s.jpg" alt="%(plain)s, %(roleplain)s at Labyrinth BJJ in Fulshear, TX" width="200" height="200">
        </picture>
      </div>
    </div>
    <div class="prog-facts">
      <div class="prog-fact"><div class="prog-fact__label">Rank</div><div class="prog-fact__value"><em>%(rank)s</em></div></div>
      <div class="prog-fact"><div class="prog-fact__label">Experience</div><div class="prog-fact__value">%(years)s</div></div>
      <div class="prog-fact"><div class="prog-fact__label">Academy</div><div class="prog-fact__value">Labyrinth, Fulshear</div></div>
      <div class="prog-fact"><div class="prog-fact__label">First class</div><div class="prog-fact__value"><em>Free</em></div></div>
    </div>
  </div>
</header>

<section class="prog-section">
  <div class="container">
    <div class="fade-in">
      <p class="section-label">Background</p>
      <h2 class="section-title section-title--lg">ABOUT %(upper)s</h2>
    </div>
    <div class="prog-prose fade-in">
%(body)s
      <p>%(teaches)s</p>
    </div>
  </div>
</section>

%(lineage)s
<section class="prog-section">
  <div class="container">
    <div class="fade-in">
      <p class="section-label">Where to find him</p>
      <h2 class="section-title section-title--lg">CLASSES</h2>
      <p class="section-subtitle">The full week is on the <a href="/schedule" class="section-subtitle__link">class schedule</a>.</p>
    </div>
    <div class="prog-siblings stagger">
%(classes)s
    </div>
  </div>
</section>

<section class="faq">
  <div class="container container--narrow">
    <div class="fade-in">
      <p class="section-label">Questions</p>
      <h2 class="section-title section-title--lg">ABOUT %(upper)s</h2>
    </div>
    <div class="faq__list stagger">
%(faqs)s
    </div>
  </div>
</section>

<section class="prog-section">
  <div class="container">
    <div class="fade-in">
      <p class="section-label">The rest of the staff</p>
      <h2 class="section-title section-title--lg">OTHER COACHES</h2>
    </div>
    <div class="prog-siblings stagger">
%(others)s
      <a href="/coaches/" class="prog-sibling"><div class="prog-sibling__title">All nine coaches</div><div class="prog-sibling__desc">Three black belts, three brown belts (one of them a 7th dan in Taekwondo), a national-team wrestler and two coaches of the kids classes</div></a>
    </div>
  </div>
</section>

<div class="container">
  <div class="prog-close fade-in">
    <h2 class="prog-close__title">COME AND TRAIN</h2>
    <p class="prog-close__text">The first class is free: adults into any class on the timetable, kids on a Friday afternoon or a Saturday morning. Turn up in a t-shirt and shorts; we will lend you the rest.</p>
    <div class="prog-hero__cta" style="justify-content:center">
      <a data-book-trial href="/#book" class="btn btn--gold">Book a Free Class</a>
      <a href="tel:2813937983" class="btn btn--ghost">Call %(phone)s</a>
    </div>
  </div>
</div>""" % {
        "role": re.sub(r"&\w+;", "&", c["role"]), "name": c["name"], "lead": c["lead"],
        "photo": c["photo"], "plain": plain, "roleplain": re.sub(r"&\w+;", "and", c["role"]),
        "rank": c["rank"], "years": c["years"] or "Texas National Team",
        "upper": c["short"].upper(),
        "body": "\n".join("      <p>%s</p>" % b for b in c["body"]),
        "teaches": c["teaches_note"],
        "classes": c["classes_html"], "faqs": faq_block(c["faqs"]),
        "others": others, "phone": PHONE, "lineage": lineage_html(c),
    }, TAIL % {"footer": FOOTER}])


def render_coach_hub():
    url = SITE + "/coaches/"
    cards = [coach_card(c["name"], re.sub(r"&\w+;", "&", c["role"]),
                        "%s &middot; %s" % (c["rank"], c["years"]) if c["years"] else c["rank"],
                        c["belt"], c["photo"], c["lead"], "/coaches/" + c["slug"], c.get("belt2"))
             for c in COACHES]
    cards += [coach_card(n, r, rk, b, p, bio) for n, r, rk, b, p, bio in OTHER_COACHES]
    # The same order as the front page: Anthony and Shaun, then Jared and
    # Scott side by side, then everyone else as listed.
    first = ["Anthony Curry", "Shaun Lawler", "Jared Vevera", "Scott Jones"]
    def rank_of(card):
        name = re.search(r'coach-card__name">([^<]+)<', card).group(1)
        hits = [i for i, f in enumerate(first) if f in name]
        return hits[0] if hits else len(first)
    cards.sort(key=rank_of)

    head = HEAD % {
        "title": "Our Coaches: Black Belt Instructors in Fulshear | Labyrinth BJJ",
        "description": "The instructors at Labyrinth BJJ in Fulshear, TX: three black belts, three brown belts (one of them a 7th dan in Taekwondo), a Texas National Team wrestler and two coaches of the kids classes.",
        "url": url, "og_title": "The Coaches at Labyrinth BJJ, Fulshear TX",
        "image": SITE + "/assets/og-image.jpg",
        "schema": "\n".join([
            jsonld(crumb_schema([("Coaches", "/coaches/")])),
            jsonld({"@context": "https://schema.org", "@type": "CollectionPage",
                    "name": "Coaches at Labyrinth BJJ", "url": url,
                    "about": PROVIDER,
                    "hasPart": [{"@type": "Person", "name": re.sub(r"&\w+;", " ", c["name"]).strip(),
                                 "jobTitle": re.sub(r"&\w+;", "&", c["role"]),
                                 "url": "%s/coaches/%s" % (SITE, c["slug"])} for c in COACHES]}),
        ]),
    }

    return "\n".join([head, NAV, crumbs([("Coaches", "/coaches/")]), """
<header class="prog-hero">
  <div class="container">
    <p class="section-label">The staff</p>
    <h1 class="prog-hero__title">Who teaches you</h1>
    <p class="prog-hero__lead">Three black belts, two brown belts, a Texas National Team wrestler, and three coaches on the kids classes who all still compete themselves. The line runs <a href="/coaches/anthony-curry">Anthony Curry</a>, black belt under Matt Leighton of Citadel BJJ in Iowa City, to <a href="/coaches/shaun-lawler">Shaun Lawler</a>. The only black belt Anthony has promoted in five years of running the academy.</p>
    <div class="prog-hero__cta">
      <a data-book-trial href="/#book" class="btn btn--gold">Book a Free Class</a>
      <a href="/schedule" class="btn btn--ghost">See Who Teaches When</a>
    </div>
  </div>
</header>

<section class="prog-section">
  <div class="container">
    <div class="prog-coaches stagger">
%s
    </div>
  </div>
</section>

<div class="container">
  <div class="prog-close fade-in">
    <h2 class="prog-close__title">MEET THEM ON THE MAT</h2>
    <p class="prog-close__text">A coaching staff reads the same on every gym website. The only way to know whether a room suits you is to stand in it, so the first class is free and there is no pressure afterwards.</p>
    <div class="prog-hero__cta" style="justify-content:center">
      <a data-book-trial href="/#book" class="btn btn--gold">Book a Free Class</a>
      <a href="tel:2813937983" class="btn btn--ghost">Call %s</a>
    </div>
  </div>
</div>""" % ("\n".join(cards), PHONE), TAIL % {"footer": FOOTER}])


def coach_classes_html(c):
    """The classes each coach is publicly tied to, drawn from the timetable."""
    if c["slug"] == "malik-pickett":
        rows = schedule_data.week_for({"Youth Wrestling"})
    elif c["slug"] == "scott-jones":
        rows = schedule_data.week_for({"MMA Conditioning"})
    elif c["slug"] == "shaun-lawler":
        rows = schedule_data.week_for({"Strength & Conditioning"})
    else:
        rows = []
    out = []
    for day, slots in rows:
        for time, label, _ in slots:
            out.append('      <a href="/schedule" class="prog-sibling"><div class="prog-sibling__title">%s</div>'
                       '<div class="prog-sibling__desc">%s &middot; %s</div></a>' % (label, day, time))
    if not out:
        out.append('      <a href="/schedule" class="prog-sibling"><div class="prog-sibling__title">Across the timetable</div>'
                   '<div class="prog-sibling__desc">Kids, adults, Gi, No-Gi and the competition classes</div></a>')
    return "\n".join(out)


def splice(path, name, content, inline=False):
    """Replace what sits between <!-- NAME:START ... --> and <!-- NAME:END -->.

    index.html is hand-written, but the parts of it that restate the timetable
    are not: they are generated here, from the same data as /schedule, so a
    class moved in schedule_data.py moves everywhere on the next build. The
    START comment is kept (it carries the do-not-edit note); only what follows
    it is replaced. Fails loudly if a marker is missing, because a silent no-op
    here is exactly how the front page drifted from the CRM before.
    """
    with open(path, encoding="utf-8") as fh:
        page = fh.read()
    start = page.index("<!-- %s:START" % name)
    start = page.index("-->", start) + 3
    end = page.index("<!-- %s:END -->" % name, start)
    if inline:
        # Inside a sentence ("7 Classes/Week"): no line breaks around it.
        page = page[:start] + content.strip() + page[end:]
    else:
        indent = " " * (start - page.rfind("\n", 0, start) - 1 - len(page[page.rfind("\n", 0, start) + 1:start].lstrip()))
        page = page[:start] + "\n" + indent + content.strip() + "\n" + indent + page[end:]
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(page)


def main():
    with open(os.path.join(ROOT, "schedule.html"), "w", encoding="utf-8") as fh:
        fh.write(stamp(render_schedule()))
    print("wrote schedule.html")
    index = os.path.join(ROOT, "index.html")
    splice(index, "SCHEDULE", schedule_component.render("home"))
    for key in schedule_component.DRAWERS:
        splice(index, "DRAWER-" + key, schedule_component.drawer_rows(key))
        splice(index, "COUNT-" + key, str(len(schedule_component.drawer_classes(key))), inline=True)
    print("wrote the schedule, four drawers and their counts into index.html")
    splice(index, "HERO-STATS", jits_data.hero_stats())
    splice(index, "JITS-STATS", jits_data.stats_grid())
    splice(index, "JITS-METERS", jits_data.meters())
    splice(index, "JITS-ATHLETES", jits_data.athletes())
    print("wrote the jits.gg numbers and top athletes into index.html")
    splice(index, "EVENT-STRIP", event_strip())
    print("wrote the event strip into index.html")
    with open(os.path.join(ROOT, "self-defense-for-women.html"), "w", encoding="utf-8") as fh:
        fh.write(stamp(render_event_rsvp()))
    print("wrote self-defense-for-women.html")
    with open(os.path.join(ROOT, "pink-october.html"), "w", encoding="utf-8") as fh:
        fh.write(stamp(render_pink_october()))
    print("wrote pink-october.html")
    with open(os.path.join(ROOT, "hyrox-youngstars.html"), "w", encoding="utf-8") as fh:
        fh.write(stamp(render_hyrox()))
    print("wrote hyrox-youngstars.html")
    with open(os.path.join(ROOT, "pricing.html"), "w", encoding="utf-8") as fh:
        fh.write(stamp(render_pricing()))
    print("wrote pricing.html")
    with open(os.path.join(ROOT, "support.html"), "w", encoding="utf-8") as fh:
        fh.write(stamp(render_support()))
    print("wrote support.html")
    with open(os.path.join(ROOT, "ennova.html"), "w", encoding="utf-8") as fh:
        fh.write(stamp(render_ennova()))
    print("wrote ennova.html")
    with open(os.path.join(ROOT, "drop.html"), "w", encoding="utf-8") as fh:
        fh.write(stamp(render_drop()))
    print("wrote drop.html")

    legacy = os.path.join(ROOT, "legacy")
    if not os.path.isdir(legacy):
        os.makedirs(legacy)
    with open(os.path.join(legacy, "index.html"), "w", encoding="utf-8") as fh:
        fh.write(stamp(render_legacy()))
    print("wrote legacy/index.html")
    with open(os.path.join(legacy, "transfer.html"), "w", encoding="utf-8") as fh:
        fh.write(stamp(render_legacy_transfer()))
    print("wrote legacy/transfer.html")

    out = os.path.join(ROOT, "coaches")
    if not os.path.isdir(out):
        os.makedirs(out)
    for c in COACHES:
        c["classes_html"] = coach_classes_html(c)
        with open(os.path.join(out, c["slug"] + ".html"), "w", encoding="utf-8") as fh:
            fh.write(stamp(render_coach(c)))
        print("wrote coaches/%s.html" % c["slug"])
    with open(os.path.join(out, "index.html"), "w", encoding="utf-8") as fh:
        fh.write(stamp(render_coach_hub()))
    print("wrote coaches/index.html")


if __name__ == "__main__":
    main()
