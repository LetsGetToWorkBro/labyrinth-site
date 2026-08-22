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
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import schedule_data  # noqa: E402
from build_programs import NAV, FOOTER, HEAD, TAIL, PHONE, SITE, jsonld  # noqa: E402

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
     "For a first class, book it. It takes a minute and it means a coach is expecting you and has a loaner gi ready. Adults can book into any class on this timetable. Kids trials run Friday afternoons in the Gi for ages 3 and up, or Saturday at 10:00 AM in No-Gi for ages 7 and up."),
    ("What does ADV mean on the timetable?",
     "Advanced. Those classes need a grey-white belt or higher, or two or more years of wrestling. They move faster and drill at a higher intensity. Every class without that marker is open to a complete beginner, including somebody who has never trained anywhere."),
    ("What is the difference between the Gi and No-Gi classes?",
     "Gi is the traditional uniform, and the jacket and trousers become part of the game: grips, collar chokes, sweeps off the sleeve. No-Gi is a rashguard and shorts: faster, more wrestling-like, nothing to hold on to. Most people here train both, and the same membership covers both."),
    ("Do you run early morning classes?",
     "Yes: 6:30 AM, Monday through Thursday. Gi on Monday and Wednesday, No-Gi on Tuesday and Thursday. It is the class people are most sceptical about and the one they end up building the week around."),
    ("Does the timetable change in school holidays?",
     "Occasionally, and the live calendar is the place to check. Calendar.labyrinth.vision carries any changes, closures and tournament weekends. This page is the standing weekly timetable."),
    ("Is open mat only for members?",
     "No. Sunday open mat at 10:30 AM is free rolling for all levels and all affiliations. Visitors from other academies are welcome, and so is anybody who wants to see the room before committing to anything."),
]


def render_schedule():
    url = SITE + "/schedule"
    c = schedule_data.counts()

    days = []
    for day in schedule_data.DAYS:
        rows = []
        for _, time, name, ages, style, aud, flags in schedule_data.for_day(day):
            badges = ""
            if style == "Gi":
                badges += '<span class="prog-slot__badge prog-slot__badge--gi">Gi</span>'
            elif style == "No-Gi":
                badges += '<span class="prog-slot__badge prog-slot__badge--nogi">No-Gi</span>'
            if "adv" in flags:
                badges += '<span class="prog-slot__badge prog-slot__badge--adv">Adv</span>'
            if "comp" in flags:
                badges += '<span class="prog-slot__badge prog-slot__badge--adv">Comp</span>'
            label = "%s <span class=\"sched-pg__ages\">(%s)</span>" % (name, ages) if ages else name
            rows.append('      <div class="prog-slot" data-audience="%s">\n'
                        '        <div class="prog-slot__time">%s%s</div>\n'
                        '        <div class="prog-slot__name">%s</div>\n'
                        '      </div>' % (aud, time, badges, label))
        days.append('    <div class="prog-day">\n      <div class="prog-day__name">%s</div>\n%s\n    </div>'
                    % (day, "\n".join(rows)))

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
    <div class="fade-in sched-pg__head">
      <div>
        <p class="section-label">The week</p>
        <h2 class="section-title section-title--lg">EVERY CLASS WE RUN</h2>
      </div>
      <div class="sched-pg__filters" role="group" aria-label="Filter the timetable">
        <button class="sched-pg__filter is-active" data-filter="all">All</button>
        <button class="sched-pg__filter" data-filter="adult">Adults</button>
        <button class="sched-pg__filter" data-filter="kids">Kids &amp; Teens</button>
      </div>
    </div>
  <div class="prog-week stagger" id="schedGrid">
%(days)s
  </div>
    <p class="prog-week__note fade-in"><strong>Adv</strong> classes need a grey-white belt or higher, or two or more years of wrestling. Everything else is open to a complete beginner. <strong>Comp</strong> classes are the competition sessions, included in unlimited memberships and open to any member in the age group; nobody is required to enter a tournament. Term-time changes, closures and tournament weekends go on the <a href="https://calendar.labyrinth.vision" target="_blank" rel="noopener noreferrer">live calendar</a>.</p>
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
      <a href="/programs/bjj-competition-team" class="prog-sibling"><div class="prog-sibling__title">Competition team</div><div class="prog-sibling__desc">Friday and Saturday, plus the advanced grappling sessions midweek.</div></a>
      <a href="/programs/youth-wrestling-fulshear" class="prog-sibling"><div class="prog-sibling__title">Youth wrestling</div><div class="prog-sibling__desc">Wednesday and Thursday at 7:30 PM, Sunday at 1:00 PM. Ages 7–17.</div></a>
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
    <p class="prog-close__text">Adults can book into any class above. Kids trials are Friday afternoon in the Gi or Saturday at 10:00 AM in No-Gi. It is free either way and nobody will call you afterwards to talk you into anything.</p>
    <div class="prog-hero__cta" style="justify-content:center">
      <a data-book-trial href="/#book" class="btn btn--gold">Book a Free Class</a>
      <a href="tel:2813937983" class="btn btn--ghost">Call %(phone)s</a>
    </div>
  </div>
</div>""" % {"total": c["total"], "facts": facts, "days": "\n".join(days),
             "faqs": faq_block(SCHEDULE_FAQS), "phone": PHONE},
        """
<script>
/* Filtering the timetable. Plain classList work rather than re-rendering, so a
   day with nothing left in it collapses instead of leaving an empty card. */
(function () {
  var grid = document.getElementById('schedGrid');
  if (!grid) return;
  var buttons = document.querySelectorAll('.sched-pg__filter');
  buttons.forEach(function (b) {
    b.addEventListener('click', function () {
      var want = b.getAttribute('data-filter');
      buttons.forEach(function (o) { o.classList.toggle('is-active', o === b); });
      grid.querySelectorAll('.prog-day').forEach(function (day) {
        var shown = 0;
        day.querySelectorAll('.prog-slot').forEach(function (slot) {
          var aud = slot.getAttribute('data-audience');
          var on = want === 'all' || aud === want || aud === 'all';
          slot.hidden = !on;
          if (on) shown++;
        });
        day.hidden = shown === 0;
      });
    });
  });
})();
</script>""", TAIL % {"footer": FOOTER}])


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
        "description": "Anthony Curry, founder and head instructor of Labyrinth BJJ in Fulshear, TX. Black belt, 14+ years, and the coach who built the #1 ranked academy in Texas.",
        "lead": "Founder and head instructor. He opened Labyrinth in 2021 and built it into the top-ranked academy in Texas, a ranking computed from match results rather than claimed.",
        "body": [
            "Anthony Curry started Labyrinth Brazilian Jiu-Jitsu in Fulshear in 2021. Five years later the academy sits <strong>#1 in Texas and #9 nationally</strong> on jits.gg, which aggregates verified tournament results and ranks academies on what their athletes actually do rather than on what the academy says about itself. Eighty-three Labyrinth athletes are individually ranked on it.",
            "That is the short version and it undersells the part that matters to somebody walking in for the first time. An academy does not get to #1 in a state this size on one or two exceptional athletes; it gets there on a room where a lot of ordinary students improve steadily, and building that room is a coaching problem rather than a talent-spotting one.",
            "He is a <strong>black belt with more than fourteen years on the mats</strong>. In Brazilian jiu-jitsu that is a long apprenticeship by design. The black belt takes most people around a decade of consistent training, which is why the rank means something the equivalent belt in other martial arts often does not.",
        ],
        "teaches_note": "As head instructor he oversees the whole curriculum, and the academy's competition results are cornered by him and the other black belts at events.",
        "lineage": {
            "from": "Matt Leighton",
            "at": "Citadel BJJ",
            "where": "Iowa City, Iowa",
            "body": [
                "Anthony Curry received his black belt from <strong>Matt Leighton of Citadel BJJ in Iowa City</strong>. Leighton co-founded that academy and is a decorated no-gi competitor in his own right.",
                "Lineage is the first question anybody in jiu-jitsu asks about an instructor, and it is a fair one. There is no central licensing body in this sport. A black belt is awarded by a person, not issued by an institution, which means the rank is only ever as good as the standards of whoever tied it on. Asking who promoted a coach is asking whose judgement is behind the rank.",
                "It also matters in the other direction, and Labyrinth has an unusually short answer there. <a href=\"/coaches/shaun-lawler\">Shaun Lawler</a> is the only black belt Anthony has promoted in five years of running this academy, one, in five years, out of a room that has produced Pan American champions.",
            ],
        },
        "faqs": [
            ("Who is the head instructor at Labyrinth BJJ?",
             "Professor Anthony Curry, who founded the academy in Fulshear in 2021 and still runs it. He is a black belt with over fourteen years of training, and under his instruction Labyrinth has become the #1 ranked academy in Texas and #9 nationally on jits.gg."),
            ("What does “Professor” mean in Brazilian jiu-jitsu?",
             "It is the customary title for a black belt instructor. Coloured-belt instructors are usually addressed as “coach”. It is not an academic title. It is the traditional form of address in a BJJ academy, and the black belt behind it typically represents about a decade of training."),
            ("Who is Anthony Curry's black belt under?",
             "Matt Leighton of Citadel BJJ in Iowa City, who co-founded that academy and competes at a high level in no-gi. Lineage matters in Brazilian jiu-jitsu because there is no central licensing body. A black belt is awarded by a person rather than issued by an institution, so asking who promoted a coach is asking whose judgement stands behind the rank."),
            ("How many black belts has he promoted?",
             "One, in five years of running the academy: Professor Shaun Lawler. Awarding a black belt is the most consequential thing an instructor does, and Labyrinth has produced Pan American champions, 83 nationally ranked athletes and 267 gold medals against exactly one black belt promotion."),
            ("Does he still teach, or only run the academy?",
             "He teaches. Labyrinth is an owner-operated academy rather than a franchise with a manager, and the head instructor being on the mats is most of the point of training at one."),
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
            "He is also the coach behind the <a href=\"/blog/strength-and-conditioning-for-kids-fulshear\">all-ages strength and conditioning class</a> that runs on Tuesdays and Thursdays at 4:15 PM: the session where a seven-year-old, a fifteen-year-old and a forty-two-year-old work through the same programme at their own load. It is included in every membership, and it exists because technique stops being the limiting factor in a match sooner than most people expect.",
        ],
        "teaches_note": "He coaches across the timetable and runs the strength and conditioning session twice a week.",
        "lineage": {
            "from": "Prof. Anthony Curry",
            "from_url": "/coaches/anthony-curry",
            "at": "Labyrinth BJJ",
            "where": "Fulshear, Texas",
            "body": [
                "Shaun Lawler received his black belt from <a href=\"/coaches/anthony-curry\">Professor Anthony Curry</a>, and he is the <strong>only black belt Anthony has ever promoted</strong>, in five years of running the academy.",
                "That is worth pausing on, because it is the kind of fact that is easy to read past. Awarding a black belt is the most consequential thing an instructor does; it is a permanent statement, made in public, that this person is now qualified to promote others. Plenty of academies hand out several a year. This one has produced Pan American champions, eighty-three nationally ranked athletes and 267 gold medals, and exactly one black belt.",
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
        "lead": "A Texas National Team wrestler coaching the youth wrestling programme: the fastest available upgrade to a young grappler's game, and the part of the room where the noise comes from.",
        "body": [
            "Malik Pickett wrestles for the Texas National Team, and he coaches our <a href=\"/programs/youth-wrestling-fulshear\">youth wrestling</a> classes for ages 7 to 17. He is known here for his energy and for how much attention he gives the younger end of the room, which is not where most elite wrestlers want to spend their evenings.",
            "The reason a jiu-jitsu academy employs a wrestling coach at all is straightforward. The usual weakness in a young grappler is that they are dangerous on the ground and lost standing up, and most youth matches are decided by who gets on top first. Wrestling addresses exactly that gap, and it is the single fastest improvement available to a child who already trains BJJ.",
            "It works the other way too. Children who come to Labyrinth for wrestling (including school wrestlers looking for off-season mat time, and children who have never wrestled at all) are not required to do jiu-jitsu, and plenty do not. Wrestling is included in any kids or teens membership rather than charged as an extra.",
        ],
        "teaches_note": "Wrestling runs three times a week and is included in every kids and teens membership.",
        "faqs": [
            ("Who coaches wrestling at Labyrinth BJJ?",
             "Coach Malik Pickett, a Texas National Team wrestler. He runs the youth wrestling programme for ages 7 to 17 on Wednesday and Thursday evenings at 7:30 PM and Sunday afternoons at 1:00 PM."),
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
    ("Jess Mozisek", "Kids Coach", "Blue Belt &middot; 3+ Yrs", "blue", "coach-jess",
     "A seasoned competitor in JJWL and IBJJF tournaments. She helps coach both kids classes, ages 3 to 6 and 7 to 12, and brings 20 years of experience teaching children."),
    ("Emma &ldquo;Armbar&rdquo;", "Assistant Coach", "Yellow/White Belt &middot; 4+ Yrs",
     "yellowwhite", "coach-emma",
     "Pan American gold medalist with over 100 competition wins by armbar. Four years training, three of them helping coach."),
    ("&ldquo;Hurricane&rdquo; Hadley", "Assistant Coach", "Grey/Black Belt &middot; 2+ Yrs",
     "greyblack", "coach-hadley",
     "ADCC Dallas gold medalist and a repeat JJWL and IBJJF champion in gi and no-gi. Over 100 matches at a 77% win rate."),
]


# Degrees on the tab, by coach. Only the ones who have them.
STRIPES = {"coach-jess": 2, "coach-emma": 1, "coach-hadley": 4}


def plain(name):
    """A display name reduced to something alt text can say out loud.

    Entities go to spaces, then the runs collapse. A nickname in curly
    quotes leaves two of them behind on each side, and a name that ends
    in one would otherwise trail a space."""
    return re.sub(r"\s+", " ", re.sub(r"&\w+;", " ", name)).strip()


def coach_card(name, role, rank, belt, photo, bio, href=None):
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
        <div class="belt-bar belt-bar--%s"><span class="belt-bar__belt"></span><span class="belt-bar__tab"></span>%s</div>
        <span class="coach-card__rank-label">%s</span>
      </div>
      <p class="coach-card__bio">%s</p>
%s    </div>""" % (photo, photo, plain(name), name, role, belt, stripe_html, rank, bio,
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
     "That is what the paid tier does: your logo and colours on unlimited screens for one price. Everything about it is at <a href=\"https://cornerman.app\" target=\"_blank\" rel=\"noopener noreferrer\">cornerman.app</a>. You do not need to be a Labyrinth member and you do not need to be in Texas."),
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
          #9 in the nation &middot; #1 in Texas
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
       and which unit to check, because the programme field can only hold one of
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
                       "Grandmaster Scott Jones coaches full time at Labyrinth. "
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

      <p class="hero__subtitle">Team Legacy Martial Arts has merged with Labyrinth BJJ, and Grandmaster Scott Jones is bringing his team with him. Two head coaches on one mat. Come and see what that looks like.</p>

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
      <img src="/assets/legacy-hero-duo.jpg" alt="Head coach Anthony Curry of Labyrinth BJJ and Grandmaster Scott Jones of Team Legacy Martial Arts, with both school crests" width="1280" height="800" loading="eager" fetchpriority="high">
    </picture>

    <!-- Outside the copy column so it spans the full row on a desktop and
         lands after the art on a phone, where copy, art and stats stack. -->
    <div class="hero__stats stagger">
      <div class="hero__stat">
        <div class="hero__stat-value">#9</div>
        <div class="hero__stat-label">In the nation</div>
      </div>
      <div class="hero__stat">
        <div class="hero__stat-value">#1</div>
        <div class="hero__stat-label">In Texas</div>
      </div>
      <div class="hero__stat">
        <div class="hero__stat-value">7th</div>
        <div class="hero__stat-label">Dan Grandmaster</div>
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
        <picture><source srcset="/assets/coach-scott-portrait.webp" type="image/webp"><img src="/assets/coach-scott-portrait.jpg" alt="Grandmaster Scott Jones of Team Legacy Martial Arts, now coaching full time at Labyrinth BJJ" width="560" height="560" loading="lazy"></picture>
        <picture class="legacy-coach__mark"><source srcset="/assets/team-legacy-wordmark.webp" type="image/webp"><img src="/assets/team-legacy-wordmark.png" alt="The Team Legacy BJJ and Taekwondo wordmark" width="900" height="727" loading="lazy"></picture>
      </div>
      <div class="legacy-coach__body">
        <p class="section-label">Your coach is still your coach</p>
        <h2 class="section-title">Grandmaster <span>Scott Jones</span></h2>
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
         strip the programme pages already use for exactly this. -->
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
      <a href="/coaches/" class="prog-sibling"><div class="prog-sibling__title">All nine coaches</div><div class="prog-sibling__desc">Three black belts, two brown belts, a national-team wrestler and three coaches of the kids classes</div></a>
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
                        c["belt"], c["photo"], c["lead"], "/coaches/" + c["slug"]) for c in COACHES]
    cards += [coach_card(n, r, rk, b, p, bio) for n, r, rk, b, p, bio in OTHER_COACHES]

    head = HEAD % {
        "title": "Our Coaches: Black Belt Instructors in Fulshear | Labyrinth BJJ",
        "description": "The instructors at Labyrinth BJJ in Fulshear, TX: three black belts, two brown belts, a Texas National Team wrestler and three coaches of the kids classes.",
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


def main():
    with open(os.path.join(ROOT, "schedule.html"), "w", encoding="utf-8") as fh:
        fh.write(stamp(render_schedule()))
    print("wrote schedule.html")
    with open(os.path.join(ROOT, "pricing.html"), "w", encoding="utf-8") as fh:
        fh.write(stamp(render_pricing()))
    print("wrote pricing.html")
    with open(os.path.join(ROOT, "support.html"), "w", encoding="utf-8") as fh:
        fh.write(stamp(render_support()))
    print("wrote support.html")
    with open(os.path.join(ROOT, "ennova.html"), "w", encoding="utf-8") as fh:
        fh.write(stamp(render_ennova()))
    print("wrote ennova.html")

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
