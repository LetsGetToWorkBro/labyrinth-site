#!/usr/bin/env python3
"""Build /schedule, /pricing and the coach pages under /coaches/.

    python3 scripts/build_pages.py

Why. Three competitors' schedule pages outrank our home page for "jiu jitsu
class schedule Fulshear" — gbfulshear.com/class-schedule, liberatusjiujitsu.com
/class-schedule and teamlegacydojo.com/schedule. Liberatus has a page for their
6 AM class alone. Ours was a redirect to a fragment, and a fragment cannot rank.
Same for pricing. Same for the coaches: Gracie Barra Fulshear leads with
"Professor Daniel Vitti, the only Brazilian 3rd-degree black belt in the area"
and it works, while our three black belts had no URL between them.

The timetable and the prices come from schedule_data, not from here. This file
decides how they are shown; that one is what they are.

LINEAGE. Who promoted whom is the first thing anybody in the sport looks for,
and the line here is unusually clean: Matt Leighton of Citadel BJJ in Iowa City
promoted Anthony Curry, and Anthony promoted Shaun Lawler — the only black belt
he has awarded in five years of running the academy. Both facts came from the
academy. It is the strongest thing on these pages and the one a competitor
cannot copy, so it gets a section of its own rather than a clause in a bio.

WHAT IS STILL NOT HERE. Competition records, promotion dates, and the detail
behind "extensive coaching and training credentials" — the academy has said the
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
     "For a first class, book it — it takes a minute and it means a coach is expecting you and has a loaner gi ready. Adults can book into any class on this timetable. Kids trials run Friday afternoons in the Gi for ages 3 and up, or Saturday at 10:00 AM in No-Gi for ages 7 and up."),
    ("What does ADV mean on the timetable?",
     "Advanced. Those classes need a grey-white belt or higher, or two or more years of wrestling. They move faster and drill at a higher intensity. Every class without that marker is open to a complete beginner, including somebody who has never trained anywhere."),
    ("What is the difference between the Gi and No-Gi classes?",
     "Gi is the traditional uniform, and the jacket and trousers become part of the game — grips, collar chokes, sweeps off the sleeve. No-Gi is a rashguard and shorts: faster, more wrestling-like, nothing to hold on to. Most people here train both, and the same membership covers both."),
    ("Do you run early morning classes?",
     "Yes — 6:30 AM, Monday through Thursday. Gi on Monday and Wednesday, No-Gi on Tuesday and Thursday. It is the class people are most sceptical about and the one they end up building the week around."),
    ("Does the timetable change in school holidays?",
     "Occasionally, and the live calendar is the place to check — calendar.labyrinth.vision carries any changes, closures and tournament weekends. This page is the standing weekly timetable."),
    ("Is open mat only for members?",
     "No. Sunday open mat at 10:30 AM is free rolling for all levels and all affiliations — visitors from other academies are welcome, and so is anybody who wants to see the room before committing to anything."),
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
        "title": "Class Schedule — Fulshear, TX | Labyrinth BJJ",
        "description": "The full weekly BJJ class schedule in Fulshear, TX. %d classes, seven days a week — kids from 4:45 PM, adults from 6:30 AM. Gi, No-Gi, wrestling." % c["total"],
        "url": url,
        "og_title": "Class Schedule — Labyrinth BJJ, Fulshear TX",
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
    <p class="prog-week__note fade-in"><strong>Adv</strong> classes need a grey-white belt or higher, or two or more years of wrestling — everything else is open to a complete beginner. <strong>Comp</strong> classes are the competition sessions, included in unlimited memberships and open to any member in the age group; nobody is required to enter a tournament. Term-time changes, closures and tournament weekends go on the <a href="https://calendar.labyrinth.vision" target="_blank" rel="noopener noreferrer">live calendar</a>.</p>
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
                "name": "%s — %s" % ({"adult": "Adult", "kids": "Kids & Teens",
                                      "family": "Family"}[group], name),
                "price": amount.lstrip("$"),
                "priceCurrency": "USD",
                "url": url,
                "availability": "https://schema.org/InStock",
                "description": "; ".join(feats),
            })

    head = HEAD % {
        "title": "Membership Prices — Fulshear, TX | Labyrinth BJJ",
        "description": "What jiu-jitsu costs in Fulshear, TX. Adults from $179/mo, kids from $239/mo, family plan $399/mo. Month to month, no contract, first class free.",
        "url": url,
        "og_title": "Membership Prices — Labyrinth BJJ, Fulshear TX",
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
    <p class="prog-hero__lead">Every price we charge is on this page. Adults from $179 a month, kids from $239, a family plan at $399 — month to month, no contract, no joining fee, and the first class is free whatever you decide afterwards.</p>
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
      <p>Unlimited is worth it at three sessions a week and not before. If you are training twice, the 8-class plan is the honest recommendation and we will say so at the desk — you can move up any month you like, and people regularly do once the habit sticks.</p>
      <p>What is not on this page: a hard sell. The first class is free, nobody will ring you afterwards, and if you decide a gym closer to home suits your week better we would rather you trained there than paid us and stopped in March. <a href="/blog/how-much-does-bjj-cost-fulshear">The full breakdown of what jiu-jitsu costs in Fulshear</a> — including the questions worth asking any gym before you sign — is on the blog.</p>
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
    <p class="prog-close__text">The first class is free for everybody — adults into any class on the timetable, kids on a Friday afternoon or Saturday morning. Decide about money afterwards.</p>
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
        "title": "Prof. Anthony Curry — Head Instructor &amp; Owner | Labyrinth BJJ",
        "description": "Anthony Curry, founder and head instructor of Labyrinth BJJ in Fulshear, TX. Black belt, 14+ years, and the coach who built the #1 ranked academy in Texas.",
        "lead": "Founder and head instructor. He opened Labyrinth in 2021 and built it into the top-ranked academy in Texas — a ranking computed from match results rather than claimed.",
        "body": [
            "Anthony Curry started Labyrinth Brazilian Jiu-Jitsu in Fulshear in 2021. Five years later the academy sits <strong>#1 in Texas and #9 nationally</strong> on jits.gg, which aggregates verified tournament results and ranks academies on what their athletes actually do rather than on what the academy says about itself. Eighty-three Labyrinth athletes are individually ranked on it.",
            "That is the short version and it undersells the part that matters to somebody walking in for the first time. An academy does not get to #1 in a state this size on one or two exceptional athletes; it gets there on a room where a lot of ordinary students improve steadily, and building that room is a coaching problem rather than a talent-spotting one.",
            "He is a <strong>black belt with more than fourteen years on the mats</strong>. In Brazilian jiu-jitsu that is a long apprenticeship by design — the black belt takes most people around a decade of consistent training, which is why the rank means something the equivalent belt in other martial arts often does not.",
        ],
        "teaches_note": "As head instructor he oversees the whole curriculum, and the academy's competition results are cornered by him and the other black belts at events.",
        "lineage": {
            "from": "Matt Leighton",
            "at": "Citadel BJJ",
            "where": "Iowa City, Iowa",
            "body": [
                "Anthony Curry received his black belt from <strong>Matt Leighton of Citadel BJJ in Iowa City</strong>. Leighton co-founded that academy and is a decorated no-gi competitor in his own right.",
                "Lineage is the first question anybody in jiu-jitsu asks about an instructor, and it is a fair one. There is no central licensing body in this sport — a black belt is awarded by a person, not issued by an institution, which means the rank is only ever as good as the standards of whoever tied it on. Asking who promoted a coach is asking whose judgement is behind the rank.",
                "It also matters in the other direction, and Labyrinth has an unusually short answer there. <a href=\"/coaches/shaun-lawler\">Shaun Lawler</a> is the only black belt Anthony has promoted in five years of running this academy — one, in five years, out of a room that has produced Pan American champions.",
            ],
        },
        "faqs": [
            ("Who is the head instructor at Labyrinth BJJ?",
             "Professor Anthony Curry, who founded the academy in Fulshear in 2021 and still runs it. He is a black belt with over fourteen years of training, and under his instruction Labyrinth has become the #1 ranked academy in Texas and #9 nationally on jits.gg."),
            ("What does “Professor” mean in Brazilian jiu-jitsu?",
             "It is the customary title for a black belt instructor. Coloured-belt instructors are usually addressed as “coach”. It is not an academic title — it is the traditional form of address in a BJJ academy, and the black belt behind it typically represents about a decade of training."),
            ("Who is Anthony Curry's black belt under?",
             "Matt Leighton of Citadel BJJ in Iowa City, who co-founded that academy and competes at a high level in no-gi. Lineage matters in Brazilian jiu-jitsu because there is no central licensing body — a black belt is awarded by a person rather than issued by an institution, so asking who promoted a coach is asking whose judgement stands behind the rank."),
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
        "title": "Prof. Shaun Lawler — Black Belt Professor | Labyrinth BJJ Fulshear",
        "description": "Shaun Lawler, black belt professor at Labyrinth BJJ in Fulshear, TX. 15+ years on the mats, and the coach who leads the all-ages strength and conditioning class.",
        "lead": "Black belt, fifteen years and counting, and the coach most likely to be the reason a beginner is still training a year later. He also leads the all-ages strength and conditioning class.",
        "body": [
            "Shaun Lawler brings deep competition experience and a technical precision that shows up in how he breaks a position down — the kind of teaching where a movement you have failed at for a month suddenly has three pieces instead of one.",
            "What the academy says about him is that he <strong>develops athletes at every level from beginner to elite competitor</strong>, and that range is rarer than it sounds. Plenty of high-level black belts are excellent with people who are already good. Being genuinely useful to somebody in their first month, and to somebody preparing for the IBJJF Pan Ams, is a different skill.",
            "He is also the coach behind the <a href=\"/blog/strength-and-conditioning-for-kids-fulshear\">all-ages strength and conditioning class</a> that runs on Tuesdays and Thursdays at 4:15 PM — the session where a seven-year-old, a fifteen-year-old and a forty-two-year-old work through the same programme at their own load. It is included in every membership, and it exists because technique stops being the limiting factor in a match sooner than most people expect.",
        ],
        "teaches_note": "He coaches across the timetable and runs the strength and conditioning session twice a week.",
        "lineage": {
            "from": "Prof. Anthony Curry",
            "from_url": "/coaches/anthony-curry",
            "at": "Labyrinth BJJ",
            "where": "Fulshear, Texas",
            "body": [
                "Shaun Lawler received his black belt from <a href=\"/coaches/anthony-curry\">Professor Anthony Curry</a> — and he is the <strong>only black belt Anthony has ever promoted</strong>, in five years of running the academy.",
                "That is worth pausing on, because it is the kind of fact that is easy to read past. Awarding a black belt is the most consequential thing an instructor does; it is a permanent statement, made in public, that this person is now qualified to promote others. Plenty of academies hand out several a year. This one has produced Pan American champions, eighty-three nationally ranked athletes and 267 gold medals, and exactly one black belt.",
                "It also completes a line that runs entirely through people who are still on these mats: <strong>Matt Leighton</strong> of Citadel BJJ in Iowa City promoted Anthony, and Anthony promoted Shaun. Whatever standard Leighton set has been passed down twice without leaving the building.",
            ],
        },
        "faqs": [
            ("Who runs the strength and conditioning class?",
             "Professor Shaun Lawler. It runs Tuesday and Thursday at 4:15 PM, it is open to all ages in one session — kids and adults together at their own load — and it is included in every membership at no extra charge."),
            ("How long has Shaun Lawler been training?",
             "More than fifteen years, and he is a black belt. In Brazilian jiu-jitsu the black belt typically takes around a decade of consistent training to reach, so fifteen-plus years puts him well past that point."),
            ("Who is Shaun Lawler's black belt under?",
             "Professor Anthony Curry, the founder of Labyrinth — and Shaun is the only black belt Anthony has promoted in five years of running the academy. The line runs Matt Leighton of Citadel BJJ in Iowa City, to Anthony, to Shaun."),
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
        "title": "Coach Malik Pickett — Youth Wrestling | Labyrinth BJJ Fulshear",
        "description": "Malik Pickett, youth wrestling coach at Labyrinth BJJ in Fulshear, TX. Texas National Team wrestler teaching takedowns to ages 7–17, three sessions a week.",
        "lead": "A Texas National Team wrestler coaching the youth wrestling programme — the fastest available upgrade to a young grappler's game, and the part of the room where the noise comes from.",
        "body": [
            "Malik Pickett wrestles for the Texas National Team, and he coaches our <a href=\"/programs/youth-wrestling-fulshear\">youth wrestling</a> classes for ages 7 to 17. He is known here for his energy and for how much attention he gives the younger end of the room, which is not where most elite wrestlers want to spend their evenings.",
            "The reason a jiu-jitsu academy employs a wrestling coach at all is straightforward. The usual weakness in a young grappler is that they are dangerous on the ground and lost standing up, and most youth matches are decided by who gets on top first. Wrestling addresses exactly that gap, and it is the single fastest improvement available to a child who already trains BJJ.",
            "It works the other way too. Children who come to Labyrinth for wrestling — including school wrestlers looking for off-season mat time, and children who have never wrestled at all — are not required to do jiu-jitsu, and plenty do not. Wrestling is included in any kids or teens membership rather than charged as an extra.",
        ],
        "teaches_note": "Wrestling runs three times a week and is included in every kids and teens membership.",
        "faqs": [
            ("Who coaches wrestling at Labyrinth BJJ?",
             "Coach Malik Pickett, a Texas National Team wrestler. He runs the youth wrestling programme for ages 7 to 17 on Wednesday and Thursday evenings at 7:30 PM and Sunday afternoons at 1:00 PM."),
            ("Does my child need wrestling experience to train with him?",
             "None. Most of the children in the room started with none. The first weeks are stance, motion, level changes and safe falling — the same place every wrestler begins, taught without a season already in progress."),
            ("Does my child have to do jiu-jitsu as well?",
             "No. Wrestling is included in any kids or teens membership and children are welcome to do only that. Plenty of our wrestlers also wrestle for their schools and use these sessions as off-season mat time."),
        ],
    },
]

# The other three, listed on the hub without pages of their own.
OTHER_COACHES = [
    ("Jared Vevera", "Head Coach &mdash; Katy", "Black Belt &middot; 14+ Yrs", "black", "coach-jared",
     "Head coach of the Katy academy and an instructor at Fulshear."),
    ("Christian Solano", "Instructor", "Brown Belt &middot; 10+ Yrs", "brown", "coach-christian",
     "Over a decade of training forged into sharp no-gi technique."),
    ("Jake Maronge", "Instructor", "Brown Belt &middot; 9 Yrs", "brown", "coach-jake",
     "Leads the Wednesday early morning gi class."),
    ("Emma &ldquo;Armbar&rdquo;", "Assistant Coach", "Yellow/White Belt &middot; 4+ Yrs",
     "yellowwhite", "coach-emma",
     "Pan American gold medalist with over 100 competition wins by armbar. Four years training, three of them helping coach."),
]


# Degrees on the tab, by coach. Only the ones who have them.
STRIPES = {"coach-emma": 1}


def plain(name):
    """A display name reduced to something alt text can say out loud.

    Entities go to spaces, then the runs collapse — a nickname in curly
    quotes leaves two of them behind on each side, and a name that ends
    in one would otherwise trail a space."""
    return re.sub(r"\s+", " ", re.sub(r"&\w+;", " ", name)).strip()


def coach_card(name, role, rank, belt, photo, bio, href=None):
    stripes = STRIPES.get(photo, 0)
    stripe_html = ('<span class="belt-bar__stripes">%s</span>' % ("<span></span>" * stripes)) if stripes else ""
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
    Returns empty for a coach with no lineage recorded — the page then simply
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
        "og_title": "%s — %s | Labyrinth BJJ" % (c["short"], re.sub(r"&\w+;", "&", c["role"])),
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
      <a href="/coaches/" class="prog-sibling"><div class="prog-sibling__title">All six coaches</div><div class="prog-sibling__desc">Three black belts, two brown belts and a national-team wrestler</div></a>
    </div>
  </div>
</section>

<div class="container">
  <div class="prog-close fade-in">
    <h2 class="prog-close__title">COME AND TRAIN</h2>
    <p class="prog-close__text">The first class is free — adults into any class on the timetable, kids on a Friday afternoon or a Saturday morning. Turn up in a t-shirt and shorts; we will lend you the rest.</p>
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
        "title": "Our Coaches — Black Belt Instructors in Fulshear, TX | Labyrinth BJJ",
        "description": "The instructors at Labyrinth BJJ in Fulshear, TX: three black belts, two brown belts and a Texas National Team wrestler. Meet the people who teach the classes.",
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
    <p class="prog-hero__lead">Three black belts, two brown belts, a Texas National Team wrestler and a Pan American gold medalist assisting. The line runs <a href="/coaches/anthony-curry">Anthony Curry</a>, black belt under Matt Leighton of Citadel BJJ in Iowa City, to <a href="/coaches/shaun-lawler">Shaun Lawler</a> &mdash; the only black belt Anthony has promoted in five years of running the academy.</p>
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
    <p class="prog-close__text">A coaching staff reads the same on every gym website. The only way to know whether a room suits you is to stand in it — so the first class is free and there is no pressure afterwards.</p>
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
        fh.write(render_schedule())
    print("wrote schedule.html")
    with open(os.path.join(ROOT, "pricing.html"), "w", encoding="utf-8") as fh:
        fh.write(render_pricing())
    print("wrote pricing.html")

    out = os.path.join(ROOT, "coaches")
    if not os.path.isdir(out):
        os.makedirs(out)
    for c in COACHES:
        c["classes_html"] = coach_classes_html(c)
        with open(os.path.join(out, c["slug"] + ".html"), "w", encoding="utf-8") as fh:
            fh.write(render_coach(c))
        print("wrote coaches/%s.html" % c["slug"])
    with open(os.path.join(out, "index.html"), "w", encoding="utf-8") as fh:
        fh.write(render_coach_hub())
    print("wrote coaches/index.html")


if __name__ == "__main__":
    main()
