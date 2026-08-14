#!/usr/bin/env python3
"""Build the area pages under /areas/.

    python3 scripts/build_areas.py

Seven communities are in the LocalBusiness `areaServed` schema and none had a
URL. These give each one a page.

THE RISK THESE PAGES RUN. Near-identical pages differing only by a place name
are doorway pages, and Google penalises them, not the page, the site. Writing
"Brazilian jiu-jitsu near Rosenberg" seven times with the noun swapped is the
fastest way to lose the rankings this is meant to win. So every page here has
to answer the same question differently, and it does, because the honest answer
genuinely differs by where you live:

  - the road you would actually take, and which direction
  - which of the two Labyrinth academies is nearer you, which for Cinco Ranch
    is not this one
  - which classes survive that commute on a Tuesday in November. A Sealy
    family is not making a 4:45 PM weekday class and saying otherwise wastes
    their evening
  - whether we are honestly the right choice at all from that distance

If a page here ever reduces to the same paragraph with a different noun,
delete it rather than ship it.

WHAT THESE PAGES ARE NOT. There is one academy, in Fulshear, plus the separate
Katy school. No page here claims a location in the town it is named after, and
none carries a LocalBusiness block with a fake address. They are Service pages
with `areaServed` set, provided by the Fulshear business.

School districts, all four confirmed: Lamar CISD covers Richmond, Rosenberg,
Simonton and most of Fulshear; Royal ISD covers Brookshire, Pattison and
Sunnyside in southern Waller County; Cinco Ranch is Katy ISD and Sealy is Sealy
ISD: those last two confirmed by the academy after the pages were written,
having been flagged as the two taken on general knowledge rather than checked.

Roads: FM 359 runs 7.0 miles from Fulshear northwest to I-10 at Brookshire, and
southeast to Richmond.

Distances are deliberately given as rough bands rather than minute counts. Only
Brookshire's seven miles is a checked figure; the rest are estimates, which is
exactly why none of them is written as a precise drive time. The neighbourhoods
blog post makes the same choice and it was right to.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_programs import NAV, FOOTER, HEAD, TAIL, PHONE, SITE, jsonld  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "areas")
ADDRESS_HTML = "6615 West Cross Creek Bend Lane, Suite&nbsp;#400, Fulshear, TX 77441"

PROVIDER = {
    "@type": "SportsActivityLocation",
    "name": "Labyrinth BJJ",
    "url": SITE,
    "telephone": "+1-281-393-7983",
    "address": {
        "@type": "PostalAddress",
        "streetAddress": "6615 West Cross Creek Bend Lane, Suite #400",
        "addressLocality": "Fulshear",
        "addressRegion": "TX",
        "postalCode": "77441",
        "addressCountry": "US",
    },
}

# Ordered nearest first, which is also the order they appear on the hub.
AREAS = [
    {
        "slug": "bjj-tamarron",
        "place": "Tamarron",
        "region": "Fulshear / Katy, TX",
        "title": "Brazilian Jiu-Jitsu for Tamarron, TX | Labyrinth BJJ Fulshear",
        "description": "Kids and adult Brazilian jiu-jitsu a short drive from Tamarron, off FM 1463. Every class time works from here. First class free.",
        "eyebrow": "Off FM 1463 · A few minutes away",
        "lead": "You are about as close to us as anybody who does not live in Cross Creek Ranch. Every class on the timetable is realistic from Tamarron, including the 4:45 PM kids classes.",
        "distance": "A few miles, no highway",
        "route": "FM 1463 and FM 1093",
        "district": "Lamar Consolidated ISD",
        "which": "fulshear",
        "body": [
            "Tamarron sits south-west of us off FM 1463, and the drive is short enough that it does not really shape your week. It is one of the biggest communities in the area (over four thousand homes planned, still building, with Lamar CISD schools inside it) and a good number of our families come from there.",
            "What Tamarron does have is a real choice. You are close enough to Katy that gyms on that side are a live option, and far enough into Fulshear that we are the natural one. We would rather you picked on the room and the coaching than on four minutes of driving, so go and look at both.",
        ],
        "timing": "Everything works. The 4:45 PM Little Grapplers class and the 5:15 PM kids classes are reachable straight from school pick-up, and the 6:30 AM adult classes are a fifteen-minute problem rather than a forty-minute one.",
        "faqs": [
            ("How far is Labyrinth BJJ from Tamarron?",
             "A few miles. You come out of Tamarron onto FM 1463 and over to Fulshear without touching a highway, and we are inside Cross Creek Ranch on Cross Creek Bend Lane. For most of Tamarron it is a short enough drive that it does not decide anything."),
            ("Should I train in Fulshear or in Katy?",
             "From Tamarron it is genuinely close. We run a Katy academy too, with Coach Jared Vevera as head coach, so ring us and describe your week. We would rather you trained consistently at the nearer one than heroically at the further one for six weeks and then stopped."),
        ],
    },
    {
        "slug": "bjj-brookshire",
        "place": "Brookshire",
        "region": "Waller County, TX",
        "title": "Brazilian Jiu-Jitsu for Brookshire, TX | Labyrinth BJJ Fulshear",
        "description": "Kids and adult Brazilian jiu-jitsu seven miles from Brookshire straight down FM 359. No highway, no Katy traffic. First class free.",
        "eyebrow": "7 miles down FM 359",
        "lead": "FM 359 runs from I-10 at Brookshire to Fulshear in seven miles. That is the whole journey, one road, no highway, and none of the FM 1093 traffic that Katy gyms come with.",
        "distance": "About 7 miles",
        "route": "FM 359 south",
        "district": "Royal ISD",
        "which": "fulshear",
        "body": [
            "Brookshire is one of the easiest drives to us on this list, and people are often surprised by that. The instinct is to head for Katy because Katy is where things are. But Katy means the Grand Parkway or FM 1093 at exactly the hour you would be driving it, and Brookshire to Fulshear means FM 359 with almost nothing on it.",
            "If you are in Brookshire or anywhere along that stretch of FM 359, the practical distance to us is smaller than the map suggests, and considerably smaller than the drive to most of the gyms you would otherwise be choosing between.",
            "Royal ISD covers Brookshire along with Pattison and Sunnyside, and southern Waller County is growing about as fast as anywhere in Texas, which is a polite way of saying there are a lot more children there than there are things for them to do. Several of our families made the FM 359 drive for exactly that reason, having looked closer to home first.",
            "The same road works in both directions, which is worth knowing if you are coming from Pattison or from the Sunnyside side rather than from Brookshire itself.",
        ],
        "timing": "All of it is workable. Evening classes are the easy ones: FM 359 southbound at six in the evening is not a road that fights you.",
        "faqs": [
            ("How far is Labyrinth BJJ from Brookshire?",
             "About seven miles. FM 359 leaves I-10 at Brookshire and runs straight down to Fulshear; we are inside Cross Creek Ranch on Cross Creek Bend Lane. There is no highway section and no Katy traffic in it."),
            ("Is it easier to come to you than to drive into Katy?",
             "Usually, yes, and that surprises people. Katy gyms mean the Grand Parkway or FM 1093 at the hour you would be driving them. FM 359 south is one quiet road. Drive both once at the time you would actually train and the answer is obvious."),
            ("Do you take children from Royal ISD schools?",
             "Of course. Royal ISD families are a normal part of the room. Our kids classes start at 4:45 PM and 5:15 PM, which is comfortable from Brookshire on FM 359 after the school day, and Saturday morning classes cover the weeks when a weekday trip does not fit."),
        ],
    },
    {
        "slug": "bjj-simonton",
        "place": "Simonton",
        "region": "Fort Bend County, TX",
        "title": "Brazilian Jiu-Jitsu for Simonton, TX | Labyrinth BJJ Fulshear",
        "description": "Kids and adult Brazilian jiu-jitsu a short run east of Simonton along FM 1093. Lamar CISD families welcome. First class free.",
        "eyebrow": "East along FM 1093",
        "lead": "FM 1093 runs east from Simonton straight to us. It is a short, uncomplicated drive, and it is the reason a lot of Simonton families train in Fulshear rather than anywhere further in.",
        "distance": "Under ten miles",
        "route": "FM 1093 east",
        "district": "Lamar Consolidated ISD",
        "which": "fulshear",
        "body": [
            "Simonton is small, and small towns tend to be badly served for children's activities. The options are either nothing or a drive into somewhere much bigger. We are the middle answer: close enough to be a weeknight habit rather than an expedition.",
            "You and we are in the same school district, which matters more than it sounds. Our kids classes are timed around the Lamar CISD day, so pick-up and a 4:45 or 5:15 class fit together without anybody eating in the car. Term dates and school holidays line up too, which is the difference between a camp week you can use and one that falls in the wrong fortnight.",
            "The other thing worth saying to a Simonton family: the drive does not get harder as you approach. FM 1093 eastbound into Fulshear is not the road that fills up. That is FM 1093 further east, towards Katy and the Grand Parkway, which is a journey you are not making.",
        ],
        "timing": "Weekday evenings are straightforward. If FM 1093 is having a bad afternoon, the Saturday morning kids classes at 10:00 AM and noon are the low-stress alternative.",
        "faqs": [
            ("How far is Labyrinth BJJ from Simonton?",
             "Under ten miles, east along FM 1093. We are inside Cross Creek Ranch in Fulshear, on Cross Creek Bend Lane: one road most of the way and no highway."),
            ("Are your class times built around the Lamar CISD school day?",
             "They are. Simonton and Fulshear are both Lamar Consolidated, so the 4:45 PM and 5:15 PM kids classes are set to catch children after school rather than in the middle of it. Saturday morning classes exist for the weeks when the drive is not worth it twice."),
            ("There is not much for kids out here. What ages do you take?",
             "From three. Little Grapplers runs at 4:45 PM for ages 3–6, the main kids classes at 5:15 PM for 7–12 and 12–15, and youth wrestling in the evening for 7–17. Adults train from 6:30 in the morning through to the evening, seven days a week, so a Simonton family can often make one trip cover two people."),
        ],
    },
    {
        "slug": "bjj-richmond",
        "place": "Richmond",
        "region": "Fort Bend County, TX",
        "title": "Brazilian Jiu-Jitsu for Richmond, TX | Labyrinth BJJ Fulshear",
        "description": "Kids and adult Brazilian jiu-jitsu north of Richmond, up FM 359. Lamar CISD families, evening and Saturday classes. First class free.",
        "eyebrow": "North up FM 359",
        "lead": "FM 359 connects Richmond to Fulshear directly. No highway, no Grand Parkway, and the same school district at both ends of the drive.",
        "distance": "Roughly twelve miles",
        "route": "FM 359 north",
        "district": "Lamar Consolidated ISD",
        "which": "fulshear",
        "body": [
            "Richmond sits south-east of us and FM 359 is the road that joins the two. It is a proper drive rather than a hop (call it twelve miles) but it is one road, it avoids the Grand Parkway entirely, and it does not get worse the closer you get.",
            "The useful thing for Richmond families is that we are in the same district you are. Lamar CISD sets the rhythm of your week, and our kids timetable is built against it, so the 5:15 PM classes land where an after-school activity should rather than colliding with dinner.",
        ],
        "timing": "The 5:15 PM kids classes and the 6:30 PM adult classes are the realistic weekday options. If the drive is going to be twice a week, Saturday morning (kids at 10:00 AM, adults at 9:00 and 11:00) makes the second trip do more work.",
        "faqs": [
            ("How far is Labyrinth BJJ from Richmond?",
             "Roughly twelve miles north up FM 359. It is a single road for almost the whole way and it avoids the Grand Parkway, which is the part that usually decides whether a drive is bearable at six in the evening."),
            ("Is it worth driving from Richmond when there are closer gyms?",
             "Only you can answer that, and we would rather you asked it properly. Consistency is the whole game. Two classes a week for two years beats four a week for three months. Come and try one for free, look at two or three other rooms as well, and pick the one you will still be attending next spring."),
            ("Which classes suit a Richmond family best?",
             "Weekday evenings if you are coming once or twice, and Saturday morning if you want a single trip to cover more. Our Saturday runs kids at 10:00 AM and noon and adults at 9:00 and 11:00, so a family can train on one journey."),
        ],
    },
    {
        "slug": "bjj-cinco-ranch",
        "place": "Cinco Ranch",
        "region": "Katy, TX",
        "title": "Brazilian Jiu-Jitsu for Cinco Ranch, TX | Labyrinth BJJ",
        "description": "Brazilian jiu-jitsu for Cinco Ranch families. Our Katy academy is likely closer than Fulshear. Here is how to tell which one suits your week.",
        "eyebrow": "Katy · read this one first",
        "lead": "Honestly: our Katy academy is probably the one you want. Cinco Ranch is east of the Grand Parkway, and driving west to Fulshear on FM 1093 at six in the evening is a worse hour than it needs to be.",
        "distance": "Around ten to twelve miles to Fulshear",
        "route": "FM 1093 / Westheimer Parkway west",
        "district": "Katy ISD",
        "which": "katy",
        "body": [
            "We run two academies. This one is in Fulshear, inside Cross Creek Ranch. The other is <strong>Labyrinth BJJ Katy</strong>, at 1806 Avenue D, with Coach Jared Vevera (a black belt of fourteen years) as its head coach. From most of Cinco Ranch, Katy is the shorter drive and the one we would point you at.",
            "The Fulshear academy is still worth knowing about, because it is where the competition team trains and where the full seven-day timetable runs. Plenty of Cinco Ranch families do the trip west for a specific class (a Saturday competition session, or the all-ages strength and conditioning on a Tuesday) and train in Katy the rest of the week.",
            "If you are on the western edge of Cinco Ranch, near the Grand Parkway, the two are close enough that it comes down to which room you like. Go to both. They are free to try.",
        ],
        "timing": "If you are coming to Fulshear from Cinco Ranch, avoid the westbound evening run. The 6:30 AM adult classes and the whole of Saturday are the times when FM 1093 is not the deciding factor.",
        "faqs": [
            ("Should Cinco Ranch families train in Katy or Fulshear?",
             "Katy, for most of Cinco Ranch. Our Katy academy is at 1806 Avenue D with Coach Jared Vevera as head coach, and it is the shorter drive from east of the Grand Parkway. We would rather tell you that than have you commit to a westbound FM 1093 run at six in the evening and quietly stop in a month."),
            ("Why would I drive to Fulshear at all?",
             "The Fulshear academy runs the full seven-day timetable and is where the competition team trains, so some Cinco Ranch families come west for a specific session (the Saturday competition classes, or the all-ages strength and conditioning on Tuesday and Thursday) and train in Katy the rest of the week."),
            ("Is the first class free at both?",
             "Yes. Try either, or both. Adults can book into any class on the Fulshear timetable; kids trials run on Friday afternoons in the Gi and Saturday at 10:00 AM in No-Gi."),
        ],
    },
    {
        "slug": "bjj-rosenberg",
        "place": "Rosenberg",
        "region": "Fort Bend County, TX",
        "title": "Brazilian Jiu-Jitsu for Rosenberg, TX | Labyrinth BJJ Fulshear",
        "description": "Brazilian jiu-jitsu for Rosenberg families, up FM 359 through Richmond. A real drive. Here is how to make one trip a week count.",
        "eyebrow": "Up FM 359, through Richmond",
        "lead": "This is a genuine drive: fifteen miles or so, north through Richmond. Worth doing, but worth planning, and the answer for most Rosenberg families is one well-chosen trip rather than three rushed ones.",
        "distance": "Around fifteen miles",
        "route": "FM 359 north via Richmond",
        "district": "Lamar Consolidated ISD",
        "which": "fulshear",
        "body": [
            "We are not going to pretend Rosenberg is close. It is up FM 359 through Richmond, and on a weekday that is a commitment rather than an errand. Some families make it four times a week and love it; more of them would be better served by making it once or twice and choosing the right once.",
            "The right once is usually Saturday. Kids grappling runs at 10:00 AM and noon, adults at 9:00 and 11:00, so a parent and a child can both train on one journey, which changes the arithmetic completely. Add Sunday's open mat at 10:30 and you have two sessions for the price of a weekend rather than five weekday round trips.",
            "Same school district, for what it is worth: Rosenberg and Fulshear are both Lamar Consolidated, so term dates and school holidays line up with our timetable.",
        ],
        "timing": "Saturday is the one to build around. Weekday evenings work if you are driving anyway (the 6:30 PM adult classes and the 5:15 PM kids classes) but do not plan a week around a fifteen-mile drive at five in the afternoon unless you have tested it.",
        "faqs": [
            ("How far is Labyrinth BJJ from Rosenberg?",
             "Around fifteen miles, north up FM 359 through Richmond. It is not a short trip and we would rather say so, the families who last are the ones who planned the drive honestly at the start."),
            ("What is the best way to train here if I live in Rosenberg?",
             "Build the week around Saturday. Kids grappling at 10:00 AM and noon, adults at 9:00 and 11:00, so a parent and child can both train on one journey. Sunday open mat at 10:30 adds a second session without a second weekday drive."),
            ("Is it worth it when there are closer options?",
             "Sometimes not, and we will say so if you ring and describe your situation. Two classes a week for two years beats four for three months, and the gym you can actually reach is the one you will still be at next spring. Come and try a free class before deciding either way."),
        ],
    },
    {
        "slug": "bjj-sealy",
        "place": "Sealy",
        "region": "Austin County, TX",
        "title": "Brazilian Jiu-Jitsu for Sealy, TX | Labyrinth BJJ Fulshear",
        "description": "Brazilian jiu-jitsu for Sealy families, about 25 miles east on I-10. A long drive, best done as one Saturday trip. First class free.",
        "eyebrow": "East on I-10 · the long one",
        "lead": "The furthest of these by a distance. Call it twenty-five miles east on I-10. We would not build a weeknight habit around it, and we will tell you exactly how we would do it instead.",
        "distance": "About 25 miles",
        "route": "I-10 east, then FM 359 south",
        "district": "Sealy ISD",
        "which": "fulshear",
        "body": [
            "Sealy is a proper drive and there is no version of this page that pretends otherwise. Twenty-five miles on I-10 is fine on a Saturday morning and miserable at half past four on a Tuesday, and a family that signs up planning four weeknight sessions will have stopped by October.",
            "What does work is one deliberate trip. Our Saturday runs adults at 9:00 and 11:00 and kids grappling at 10:00 AM and noon. A whole family can train on a single journey, and it is the same coaching the weekday classes get. Sunday adds open mat at 10:30 and youth wrestling at 1:00 PM if you want a second.",
            "If you want something two miles from your house instead, that is a completely reasonable thing to want and we would not argue with it. But if you have looked locally and not found the room you are after, one Saturday a week here is a real option and a lot of people make it work.",
        ],
        "timing": "Saturday, and Sunday if you want the second session. Weekday classes are technically available and honestly not advisable from Sealy unless you are already coming this way for work.",
        "faqs": [
            ("How far is Labyrinth BJJ from Sealy?",
             "About twenty-five miles: east on I-10 and then south, and we are inside Cross Creek Ranch in Fulshear on Cross Creek Bend Lane. It is the longest drive of any area we serve and we would rather be straight about that than have you find out in week three."),
            ("Is it realistic to train here from Sealy?",
             "As a weekend habit, yes, and several families do exactly that. As a four-evenings-a-week habit, no. Build it around Saturday (adults at 9:00 and 11:00, kids grappling at 10:00 AM and noon, so nobody makes the drive alone) and add Sunday if you want more."),
            ("Do you have anything closer to Sealy?",
             "No. Our two academies are Fulshear and Katy, and Katy is further from you than Fulshear is. If distance rules us out, look locally first. We would rather you trained somewhere than admired us from twenty-five miles away."),
        ],
    },
]


def render(a):
    url = "%s/areas/%s" % (SITE, a["slug"])
    place = a["place"]

    service = {
        "@context": "https://schema.org",
        "@type": "Service",
        "name": "Brazilian Jiu-Jitsu Classes for %s, TX" % place,
        "description": a["description"],
        "url": url,
        "serviceType": "Brazilian Jiu-Jitsu and martial arts instruction",
        "areaServed": {"@type": "City", "name": "%s, TX" % place},
        "provider": PROVIDER,
    }
    crumbs = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Home", "item": SITE},
            {"@type": "ListItem", "position": 2, "name": "Areas We Serve", "item": SITE + "/areas/"},
            {"@type": "ListItem", "position": 3, "name": place, "item": url},
        ],
    }
    faq = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [{"@type": "Question", "name": q,
                        "acceptedAnswer": {"@type": "Answer", "text": a_}} for q, a_ in a["faqs"]],
    }

    head = HEAD % {
        "title": a["title"], "description": a["description"], "url": url,
        "og_title": "Brazilian Jiu-Jitsu for %s, TX" % place,
        "image": SITE + "/assets/og-image.jpg",
        "schema": "\n".join([jsonld(service), jsonld(crumbs), jsonld(faq)]),
    }

    facts = "\n".join(
        '      <div class="prog-fact"><div class="prog-fact__label">%s</div>'
        '<div class="prog-fact__value">%s</div></div>' % (l, v)
        for l, v in [("From %s" % place, a["distance"]), ("Route", a["route"]),
                     ("Schools", a["district"]), ("First class", "<em>Free</em>")])

    nearer = ("Our <a href=\"https://labyrinthbjjkaty.com\">Katy academy</a> is likely the nearer of the two."
              if a["which"] == "katy" else
              "The Fulshear academy is the nearer of our two for %s." % place)

    parts = [head, NAV, """
<div class="container">
  <nav class="prog-crumbs" aria-label="Breadcrumb">
    <a href="/">Home</a>
    <span class="prog-crumbs__sep">&rsaquo;</span>
    <a href="/areas/">Areas We Serve</a>
    <span class="prog-crumbs__sep">&rsaquo;</span>
    <span class="prog-crumbs__current">%(place)s</span>
  </nav>
</div>

<header class="prog-hero">
  <div class="container">
    <p class="section-label">%(eyebrow)s</p>
    <h1 class="prog-hero__title">Jiu-Jitsu for %(place)s</h1>
    <p class="prog-hero__lead">%(lead)s</p>
    <div class="prog-hero__cta">
      <a data-book-trial href="/#book" class="btn btn--gold">Book a Free Class</a>
      <a href="/#schedule" class="btn btn--ghost">See the Timetable</a>
    </div>
    <div class="prog-facts">
%(facts)s
    </div>
  </div>
</header>

<section class="prog-section">
  <div class="container">
    <div class="fade-in">
      <p class="section-label">The drive</p>
      <h2 class="section-title section-title--lg">GETTING HERE FROM %(upper)s</h2>
    </div>
    <div class="prog-prose fade-in">
%(body)s
      <p><strong>Where we actually are.</strong> There is one Labyrinth academy in Fulshear (%(address)s, inside Cross Creek Ranch on Cross Creek Bend Lane) and a second in Katy. We do not have a location in %(place)s. %(nearer)s</p>
      <h3>Which classes work from here</h3>
      <p>%(timing)s</p>
    </div>
  </div>
</section>

<section class="prog-section">
  <div class="container">
    <div class="fade-in">
      <p class="section-label">Programs</p>
      <h2 class="section-title section-title--lg">WHAT YOU CAN TRAIN</h2>
      <p class="section-subtitle">The same five programs, whichever direction you come from.</p>
    </div>
    <div class="prog-siblings stagger">
      <a href="/programs/kids-bjj-fulshear" class="prog-sibling"><div class="prog-sibling__title">Kids Brazilian Jiu-Jitsu</div><div class="prog-sibling__desc">Ages 3–15 in separated groups, six days a week</div></a>
      <a href="/programs/adult-bjj-fulshear" class="prog-sibling"><div class="prog-sibling__title">Adult Brazilian Jiu-Jitsu</div><div class="prog-sibling__desc">Gi and No-Gi, seven days a week, beginners welcome</div></a>
      <a href="/programs/bjj-competition-team" class="prog-sibling"><div class="prog-sibling__title">Competition Team</div><div class="prog-sibling__desc">#1 in Texas, #9 nationally: IBJJF, ADCC, JJWL</div></a>
      <a href="/programs/youth-wrestling-fulshear" class="prog-sibling"><div class="prog-sibling__title">Youth Wrestling</div><div class="prog-sibling__desc">Ages 7–17, three sessions a week</div></a>
      <a href="/programs/summer-camp-fulshear" class="prog-sibling"><div class="prog-sibling__title">Summer Camp</div><div class="prog-sibling__desc">Ages 5–15, $60 a day, next running summer 2027</div></a>
      <a href="/blog/strength-and-conditioning-for-kids-fulshear" class="prog-sibling"><div class="prog-sibling__title">Strength &amp; Conditioning</div><div class="prog-sibling__desc">All ages, Tuesday and Thursday, in every membership</div></a>
    </div>
  </div>
</section>

<section class="faq">
  <div class="container container--narrow">
    <div class="fade-in">
      <p class="section-label">Questions</p>
      <h2 class="section-title section-title--lg">FROM %(upper)s</h2>
    </div>
    <div class="faq__list stagger">
%(faqs)s
    </div>
  </div>
</section>

<div class="container">
  <div class="prog-close fade-in">
    <h2 class="prog-close__title">DRIVE IT ONCE</h2>
    <p class="prog-close__text">Pick the class you would actually attend, drive the route at that time of day, and see how it feels. It answers the question better than any map, and the class itself is free.</p>
    <div class="prog-hero__cta" style="justify-content:center">
      <a data-book-trial href="/#book" class="btn btn--gold">Book a Free Class</a>
      <a href="tel:2813937983" class="btn btn--ghost">Call %(phone)s</a>
    </div>
  </div>
</div>""" % {
        "place": place, "eyebrow": a["eyebrow"], "lead": a["lead"], "facts": facts,
        "upper": place.upper(), "address": ADDRESS_HTML, "nearer": nearer,
        "timing": a["timing"], "phone": PHONE,
        "body": "\n".join("      <p>%s</p>" % x for x in a["body"]),
        "faqs": "\n".join("""      <div class="faq-item">
        <button class="faq-item__question" aria-expanded="false">
          <span>%s</span>
          <svg class="faq-item__icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        <div class="faq-item__answer"><p>%s</p></div>
      </div>""" % (q, ans) for q, ans in a["faqs"]),
    }, TAIL % {"footer": FOOTER}]
    return "\n".join(parts)


def render_hub():
    url = SITE + "/areas/"
    cards = "\n".join(
        """      <a href="/areas/%s" class="prog-sibling">
        <div class="prog-sibling__title">%s</div>
        <div class="prog-sibling__desc">%s &middot; %s</div>
      </a>""" % (a["slug"], a["place"], a["region"], a["distance"]) for a in AREAS)

    schema = {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": "Areas Labyrinth BJJ serves",
        "url": url,
        "description": "The communities around Fulshear, Texas that train at Labyrinth BJJ.",
        "hasPart": [{"@type": "WebPage", "name": a["place"],
                     "url": "%s/areas/%s" % (SITE, a["slug"])} for a in AREAS],
    }
    crumbs = {
        "@context": "https://schema.org", "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Home", "item": SITE},
            {"@type": "ListItem", "position": 2, "name": "Areas We Serve", "item": url},
        ],
    }
    head = HEAD % {
        "title": "Areas We Serve: Fulshear, Katy, Richmond &amp; Beyond | Labyrinth BJJ",
        "description": "Where our students drive in from: Tamarron, Brookshire, Simonton, Richmond, Cinco Ranch, Rosenberg and Sealy. Which classes suit which drive.",
        "url": url, "og_title": "Areas Labyrinth BJJ Serves",
        "image": SITE + "/assets/og-image.jpg",
        "schema": "\n".join([jsonld(schema), jsonld(crumbs)]),
    }
    return "\n".join([head, NAV, """
<div class="container">
  <nav class="prog-crumbs" aria-label="Breadcrumb">
    <a href="/">Home</a>
    <span class="prog-crumbs__sep">&rsaquo;</span>
    <span class="prog-crumbs__current">Areas We Serve</span>
  </nav>
</div>

<header class="prog-hero">
  <div class="container">
    <p class="section-label">Areas We Serve</p>
    <h1 class="prog-hero__title">Where our students<br>drive in from</h1>
    <p class="prog-hero__lead">One academy, in Fulshear, inside Cross Creek Ranch, plus our second school in Katy. These are the communities our families come from, nearest first, with an honest note on each about whether the drive is worth building a week around.</p>
    <div class="prog-hero__cta">
      <a data-book-trial href="/#book" class="btn btn--gold">Book a Free Class</a>
      <a href="/blog/jiu-jitsu-near-fulshear-neighborhoods" class="btn btn--ghost">Fulshear Neighborhoods Guide</a>
    </div>
  </div>
</header>

<section class="prog-section">
  <div class="container">
    <div class="prog-siblings stagger">
%s
    </div>
    <p class="prog-week__note fade-in">Live in Cross Creek Ranch, Cross Creek West, Jordan Ranch, Fulbrook, Churchill Farms or Fulshear Lakes? You are local. The <a href="/blog/jiu-jitsu-near-fulshear-neighborhoods">Fulshear neighborhoods guide</a> covers those in detail.</p>
  </div>
</section>

<div class="container">
  <div class="prog-close fade-in">
    <h2 class="prog-close__title">NOT SURE IF THE DRIVE WORKS?</h2>
    <p class="prog-close__text">Ring the academy and describe your week: where you are coming from, what time, and who is training. We will tell you which classes fit, including when the answer is that we are too far.</p>
    <div class="prog-hero__cta" style="justify-content:center">
      <a data-book-trial href="/#book" class="btn btn--gold">Book a Free Class</a>
      <a href="tel:2813937983" class="btn btn--ghost">Call %s</a>
    </div>
  </div>
</div>""" % (cards, PHONE), TAIL % {"footer": FOOTER}])


def main():
    if not os.path.isdir(OUT):
        os.makedirs(OUT)
    import re
    for a in AREAS:
        html = render(a)
        with open(os.path.join(OUT, a["slug"] + ".html"), "w", encoding="utf-8") as fh:
            fh.write(html)
        words = len(re.sub(r"<[^>]+>", " ", re.sub(r"<script.*?</script>", "", html, flags=re.S)).split())
        print("wrote areas/%-24s %s  ~%d words" % (a["slug"] + ".html", a["place"].ljust(12), words))
    with open(os.path.join(OUT, "index.html"), "w", encoding="utf-8") as fh:
        fh.write(render_hub())
    print("wrote areas/index.html")


if __name__ == "__main__":
    main()
