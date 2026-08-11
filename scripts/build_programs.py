#!/usr/bin/env python3
"""Build the program pages under /programs/.

    python3 scripts/build_programs.py

Why these exist. The site was one page with anchors, so six services competed
for rankings through a single URL — and an anchor cannot rank on its own, which
means `/#programs` and `/` are the same page to a crawler. `_redirects` said as
much in a comment. These pages give each program a URL that can rank for its
own commercial query, its own title and description, its own Service schema,
and its own booking CTA.

The split that keeps them from cannibalising the blog: **posts answer
questions, program pages sell classes.** A post is "Is BJJ good for kids with
ADHD?"; a program page is "Kids BJJ classes in Fulshear — times, price, book a
trial." If a page here ever starts competing with a post for the same phrase,
one of the two is in the wrong place.

THIS FILE IS THE SOURCE. The HTML under programs/ is generated and committed —
committed so the deploy needs no build step, generated so four pages that share
a nav, a footer and a schema shape cannot drift apart. Edit the content here
and re-run; do not hand-edit programs/*.html, it will be overwritten.

Every fact below was read off index.html — the timetable, the prices, the coach
roster, the advanced-class requirement. Where the site does not say something,
this deliberately does not say it either rather than inventing an answer.
"""
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import schedule_data  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "programs")
SITE = "https://labyrinth.vision"
BOOK = "https://labyrinth.gymdesk.com/signup"
PHONE = "(281) 393-7983"
ADDRESS = "6615 West Cross Creek Bend Lane, Suite #400, Fulshear, TX 77441"

# ── Shared chrome ────────────────────────────────────────────────────────────
# The nav and footer are lifted from index.html with their links absolutised,
# because a page one directory down cannot use "#programs" to mean a section of
# the front page.
#
# Asset paths are root-absolute (/style.css, not ../style.css) for the same
# reason and a stronger one: this chrome is shared by pages at two different
# depths — /programs/x and /schedule — and "../" is correct for exactly one of
# them. Root-absolute is correct for both and for anything added later.

NAV_LINKS = [
    ("/programs/", "Programs"),
    ("/schedule", "Schedule"),
    ("/pricing", "Pricing"),
    ("/coaches/", "Coaches"),
    ("/areas/", "Areas"),
    ("/#competition", "Competition"),
    ("/blog/", "Blog"),
    ("/#contact", "Contact"),
]

NAV = """<nav class="nav" id="nav" role="navigation" aria-label="Main navigation">
  <div class="nav__inner">
    <a href="/" class="nav__logo" aria-label="Labyrinth BJJ home">
      <img src="/assets/logo-maze-transparent.png" alt="Labyrinth BJJ" class="nav__logo-img" width="36" height="36">
      <span class="nav__logo-text">LABYRINTH</span>
    </a>

    <div class="nav__links">
%(links)s
      <span class="nav__divider"></span>
      <a href="tel:2813937983" class="nav__phone" aria-label="Call us"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg> %(phone)s</a>
      <a data-book-trial href="/#book" class="nav__cta">Try a Free Class</a>
    </div>

    <button class="nav__hamburger" id="hamburger" aria-label="Toggle navigation menu" aria-expanded="false">
      <span></span><span></span><span></span>
    </button>
  </div>
</nav>

<div class="nav__mobile" id="mobileNav" role="navigation" aria-label="Mobile navigation">
%(mobile)s
  <a data-book-trial href="/#book" class="nav__cta">Try a Free Class</a>
</div>""" % {
    "links": "\n".join('      <a href="%s" class="nav__link">%s</a>' % (h, t) for h, t in NAV_LINKS),
    "mobile": "\n".join('  <a href="%s">%s</a>' % (h, t) for h, t in NAV_LINKS),
    "phone": PHONE,
}

FOOTER = """<footer class="footer" id="footer">
  <div class="container">
    <div class="footer__bottom">
      <p>&copy; 2026 Labyrinth BJJ &middot; %(address)s &middot; <a href="tel:2813937983">%(phone)s</a> &middot; <a href="/support">Support</a> &middot; <a href="/privacy-policy">Privacy</a> &middot; <a href="https://cornerman.app" target="_blank" rel="noopener noreferrer">Cornerman</a></p>
      <a href="https://www.perplexity.ai/computer" target="_blank" rel="noopener noreferrer">Created with Perplexity Computer</a>
    </div>
  </div>
</footer>""" % {"address": ADDRESS, "phone": PHONE}

HEAD = """<!DOCTYPE html>
<html lang="en">
<head>
<!-- Perplexity Computer Attribution — SEO Meta Tags -->
<meta name="generator" content="Perplexity Computer">
<meta name="author" content="Perplexity Computer">
<meta property="og:see_also" content="https://www.perplexity.ai/computer">
<link rel="author" href="https://www.perplexity.ai/computer">

<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="theme-color" content="#0A0A0A">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="preconnect" href="https://api.fontshare.com" crossorigin>
<link rel="preload" as="style" href="https://api.fontshare.com/v2/css?f[]=clash-display@400,500,600,700&f[]=general-sans@300,400,500,600,700&display=swap" onload="this.onload=null;this.rel='stylesheet'">
<noscript><link href="https://api.fontshare.com/v2/css?f[]=clash-display@400,500,600,700&f[]=general-sans@300,400,500,600,700&display=swap" rel="stylesheet"></noscript>
<link rel="stylesheet" href="/base.css">
<link rel="stylesheet" href="/style.css">
<link rel="stylesheet" href="/programs.css">
<link rel="stylesheet" href="/booking.css">

<title>%(title)s</title>
<meta name="description" content="%(description)s">
<link rel="canonical" href="%(url)s">
<meta property="og:title" content="%(og_title)s">
<meta property="og:description" content="%(description)s">
<meta property="og:type" content="website">
<meta property="og:url" content="%(url)s">
<meta property="og:site_name" content="Labyrinth BJJ">
<meta property="og:image" content="%(image)s">
<meta name="twitter:card" content="summary_large_image">
%(schema)s
</head>
<body>
"""

TAIL = """
%(footer)s

<script src="/app.js"></script>
<script src="/booking.js"></script>
</body>
</html>
"""


def crumbs(name):
    return """<div class="container">
  <nav class="prog-crumbs" aria-label="Breadcrumb">
    <a href="/">Home</a>
    <span class="prog-crumbs__sep">&rsaquo;</span>
    <a href="/programs/">Programs</a>
    <span class="prog-crumbs__sep">&rsaquo;</span>
    <span class="prog-crumbs__current">%s</span>
  </nav>
</div>""" % name


def breadcrumb_schema(name, url):
    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Home", "item": SITE},
            {"@type": "ListItem", "position": 2, "name": "Programs", "item": SITE + "/programs/"},
            {"@type": "ListItem", "position": 3, "name": name, "item": url},
        ],
    }


def jsonld(obj):
    import json
    return '<script type="application/ld+json">\n%s\n</script>' % json.dumps(obj, indent=2)


# ── Content ──────────────────────────────────────────────────────────────────
# Times, ages and prices below are transcribed from the schedule and pricing
# sections of index.html. If the timetable on the front page changes, this table
# is the other place it has to change.

PROGRAMS = [
    {
        "slug": "kids-bjj-fulshear",
        "hub_blurb": "Ages 3–15 in three separated groups, six days a week. Gi and No-Gi, belt progression tracked, free trials Friday and Saturday.",
        "nav_name": "Kids BJJ",
        "name": "Kids Brazilian Jiu-Jitsu",
        "h1": "Kids Brazilian Jiu-Jitsu in Fulshear",
        "title": "Kids BJJ Classes in Fulshear, TX (Ages 3–15) | Labyrinth BJJ",
        "og_title": "Kids BJJ Classes in Fulshear, TX — Ages 3 to 15",
        "description": "Kids Brazilian jiu-jitsu in Fulshear, TX. Separate groups for ages 3–6, 7–12 and 12–15, six days a week. Free trial Friday or Saturday.",
        "eyebrow": "Ages 3–15",
        "image": "youth-card",
        "image_alt": "Kids Brazilian jiu-jitsu class at Labyrinth BJJ in Fulshear, TX",
        "lead": "Three age groups, six days a week, taught by black belts who have coached children to Pan Am titles. Your child's first class is free.",
        "service_desc": "Kids Brazilian jiu-jitsu and martial arts classes in Fulshear, TX for ages 3-6, 7-12 and 12-15. Gi and No-Gi, six days a week, with belt progression tracking and optional competition classes.",
        "facts": [
            ("Ages", "3 to 15"),
            ("Runs", "Six days a week"),
            ("Membership", "<em>From $239</em>/month"),
            ("Free trial", "Friday or Saturday"),
        ],
        "intro": [
            "Most parents come to us for one of three reasons. Their child is being pushed around at school and they want them to be able to handle it. Their child has energy that no amount of playground time absorbs. Or their child has tried a sport, sat on a bench for a season, and quietly decided they are not sporty.",
            "Brazilian jiu-jitsu answers all three, and it does it without a single punch being thrown. It is a grappling art — leverage, position and control — which makes it the martial art paediatricians tend to be least nervous about, and it is one of the few children's activities where a small child who thinks carefully genuinely beats a bigger one who does not.",
            "We teach it in Fulshear to about a hundred and fifty children a week, in age groups that are actually separated rather than nominally separated, and we have coached kids from their first day on the mats to <strong>IBJJF Pan American titles</strong>. Labyrinth is the <strong>#1 ranked academy in Texas and #9 nationally</strong> on jits.gg, which is a competition statistic — but the reason it matters to a parent who never wants their child to compete is that the coaching that produces those results is the same coaching a beginner gets on a Monday afternoon.",
        ],
        "groups_title": "The three age groups",
        "groups_lead": "A six-year-old and a fourteen-year-old need different things from the same art. They are not in the same room.",
        "groups": [
            ("Ages 3–6", "Little Grapplers",
             "Coordination, listening, falling safely, and the basic shapes of the art delivered as games. At this age the goal is not technique — it is a child who can follow three-step instructions from an adult who is not their parent, and who wants to come back on Wednesday."),
            ("Ages 7–12", "Kids BJJ",
             "The full curriculum, taught properly: guard, escapes, takedowns, submissions and the positional logic that ties them together. Belt progression is tracked, so a child can see the distance they have covered rather than being told they are doing well."),
            ("Ages 12–15", "Teens",
             "Their own classes, because a thirteen-year-old training with eight-year-olds gets bored and a thirteen-year-old training with adults gets hurt. Teens train Gi and No-Gi and can move into the competition classes when they want to."),
        ],
        "schedule_title": "Kids class times",
        "schedule_note": "Classes marked <strong>ADV</strong> are the advanced grappling classes: a child needs a grey-white belt or higher, or two or more years of wrestling, to join one. Everything else is open to any child in the age range, including one who has never trained. <strong>Free trials for kids run on Friday afternoons and Saturday mornings.</strong> Friday is Gi and takes every age from three up; Saturday at 10:00 AM is No-Gi and starts at seven, because there is no 3–6 class on a Saturday to put a younger child in.",
        "week": schedule_data.week_for({"Kids BJJ", "Kids Grappling", "Teens Grappling", "Kids BJJ Comp", "Teens BJJ Comp"}),
        "body_title": "What a class actually looks like",
        "body": [
            "Forty-five minutes, and the shape of it barely changes: a warm-up that is mostly movement games, a technique of the day broken into two or three pieces, drilling that technique with a partner, and then positional rounds — live training from a set starting position, which is how a child learns to apply something under mild resistance without it becoming a fight.",
            "Nobody is made to spar on day one. Nobody is paired with a child twice their size. The coaches watch, and a child who is having a bad day gets pulled aside rather than pushed through.",
            "What parents tend to notice first is not the jiu-jitsu. It is that their child starts shaking hands and looking adults in the eye, because that is the first thing we teach and the last thing we let slide.",
        ],
        "coaches": ["tony", "shaun"],
        "coaches_note": "Kids classes are led by our black belts, not handed to whoever is free.",
        "prices": [
            ("8 classes", "$239", "/mo", "Eight classes a month, age-appropriate groups, belt progression tracked.", False),
            ("Unlimited", "$249", "/mo", "Every kids and teens class, including competition and youth wrestling.", True),
            ("Family plan", "$399", "/mo", "Unlimited for two members, kids and adults, +$80/mo per extra member.", False),
        ],
        "prices_note": "Youth wrestling is included in all three at no extra cost, so a kids membership covers both mats. Month to month, no long-term contract, 30 days notice to cancel. Ask about the six and twelve month paid-in-full discounts.",
        "faqs": [
            ("What is the youngest age you take?",
             "Three. Our Little Grapplers class is built for ages 3–6 and runs at 4:45 PM on Mondays, Wednesdays and Fridays. At that age the class is mostly coordination, listening and safe falling, delivered as games — the jiu-jitsu underneath it is real, but a three-year-old experiences it as play."),
            ("Is jiu-jitsu safe for a young child?",
             "It is one of the safest martial arts a child can do, because there is no striking in it at all. BJJ is grappling — leverage, position and control — so children are not being hit, and they are not hitting anyone. Classes are grouped by age, beginners are not put in with advanced kids, and a coach is watching every round. Falling safely is one of the first things we teach, and it is the skill parents tell us shows up outside the gym."),
            ("When can we come and try a class?",
             "Two options. Friday afternoons in the Gi — 4:45 PM for ages 3–6, and 5:15 PM for 7–12 and 12–15. Or Saturday at 10:00 AM in No-Gi, for ages 7 and up. It is free either way, there is no commitment, and nobody will call you afterwards to talk you into anything. Book online or ring the academy on " + PHONE + "."),
            ("Does my child need a gi to start?",
             "No. Come in a t-shirt and shorts or leggings with no zippers, buttons or pockets. We have loaner gis for trial classes. If your child carries on training we will get them fitted properly — but nobody needs to spend money to find out whether their kid likes it."),
            ("Will my child have to compete?",
             "No. Competition is optional and always will be. Plenty of our students train for years and never enter a tournament. The competition classes are there on Fridays and Saturdays for the children who want them, and the rest of the timetable is unaffected either way."),
            ("What is the difference between the regular and the advanced kids classes?",
             "The advanced grappling classes — Tuesday and Thursday at 5:15 PM, and Saturday at 12:00 PM — need a grey-white belt or higher, or two or more years of wrestling. They move faster and drill at a higher intensity. Every other class on the timetable is open to a complete beginner."),
        ],
        "close_title": "Book their first class",
        "close_text": "Free, on a Friday afternoon or a Saturday morning, in whatever they already own. If they like it you will know within about ten minutes, and so will they.",
        "related_posts": [
            ("benefits-of-bjj-for-kids", "10 Benefits of BJJ for Kids"),
            ("what-age-should-kids-start-jiu-jitsu", "What Age Should Kids Start Jiu-Jitsu?"),
            ("is-bjj-good-for-adhd-kids", "Is BJJ Good for Kids with ADHD?"),
        ],
    },
    {
        "slug": "adult-bjj-fulshear",
        "hub_blurb": "Seventeen classes a week, Gi and No-Gi, mornings through evenings. Complete beginners are the normal case here.",
        "nav_name": "Adult BJJ",
        "name": "Adult Brazilian Jiu-Jitsu",
        "h1": "Adult Brazilian Jiu-Jitsu in Fulshear",
        "title": "Adult BJJ Classes in Fulshear, TX — Gi & No-Gi | Labyrinth BJJ",
        "og_title": "Adult BJJ Classes in Fulshear, TX — Gi & No-Gi, 7 Days a Week",
        "description": "Adult Brazilian jiu-jitsu in Fulshear, TX. Gi and No-Gi, mornings through evenings, seven days a week. Beginners welcome, first class free.",
        "eyebrow": "All levels · Gi & No-Gi",
        "image": "adult-gi",
        "image_alt": "Adult Brazilian jiu-jitsu class at Labyrinth BJJ in Fulshear, TX",
        "lead": "Seventeen classes a week across mornings, middays and evenings — Gi and No-Gi, beginner to black belt. Your first class is free, any class on the timetable.",
        "service_desc": "Adult Brazilian jiu-jitsu classes in Fulshear, TX. Gi and No-Gi training seven days a week for all levels, from complete beginner to competitor, with morning, midday and evening class times.",
        "facts": [
            ("Levels", "Complete beginner to black belt"),
            ("Runs", "Seven days a week"),
            ("Membership", "<em>From $179</em>/month"),
            ("Free trial", "Any class time"),
        ],
        "intro": [
            "Almost everybody who walks in here as an adult has never done a combat sport. They are thirty-four, they have a desk job and a bad shoulder, and they have been meaning to do this for two years. That is the normal case, not the exception, and the classes are built around it.",
            "Jiu-jitsu suits adults starting late better than almost any other martial art, for a reason that is not obvious until you have done it: it is the one where being calm, patient and technical beats being young and explosive. A forty-five-year-old who understands position will control a twenty-two-year-old athlete who does not. That happens on our mats most weeks.",
            "We run <strong>Gi and No-Gi</strong> — the traditional uniform, and the shorts-and-rashguard version — and we run more No-Gi than most academies in the Katy and Fulshear area. You can do one, or both, on the same membership.",
        ],
        "groups_title": "How the week is built",
        "groups_lead": "Three slots a day on most days, so training does not have to be negotiated with the rest of your life.",
        "groups": [
            ("6:30 AM", "Mornings",
             "Monday to Thursday, before work. Gi on Monday and Wednesday, No-Gi on Tuesday and Thursday. It is the class people are most sceptical about and the one they end up building the week around."),
            ("11:00 AM", "Middays",
             "Monday, Wednesday, Friday. For shift workers, people who work from home, and anybody whose evenings belong to their kids' schedules."),
            ("6:30 PM", "Evenings",
             "Monday to Friday, the busiest classes of the day and the best ones for finding training partners your size. Friday evening is the competition class, which anybody is welcome to attend."),
        ],
        "schedule_title": "Adult class times",
        "schedule_note": "Trials for adults can be booked into <strong>any class on this timetable</strong> — there is no beginners-only slot you have to wait for, because there is no class here where a first-timer is a problem. Sunday open mat is free rolling: all levels, all affiliations, including visitors from other academies.",
        "week": schedule_data.week_for({"Adult BJJ", "Adult Comp", "Adult & Teens", "Open Mat"}),
        "body_title": "Your first class, honestly",
        "body": [
            "You will be given a loaner gi if it is a Gi day, shown where to change, and introduced to whoever is nearest. The class starts with a warm-up you can scale down, moves to a technique broken into pieces, and then drilling — you and one partner, taking turns, no resistance. That part is not intimidating and it is most of the class.",
            "At the end there is live training. On a first day you will usually be paired with an experienced person who has been asked to look after you, which means you will lose comfortably and safely for five minutes and learn more in those five minutes than in the previous forty. You can also sit it out. Nobody will mention it.",
            "You will be worse at this than you expect for about three months, and then something clicks. Everybody goes through it. The people who quit almost always quit in week three, which is exactly when it is about to start making sense.",
        ],
        "coaches": ["tony", "shaun", "jared", "christian", "jake"],
        "coaches_note": "Three black belts and two brown belts teaching across the week.",
        "prices": [
            ("8 classes", "$179", "/mo", "Eight classes a month. Gi, No-Gi and competition classes, plus open mat.", False),
            ("12 classes", "$189", "/mo", "Twelve a month — the middle option most people settle on.", False),
            ("Unlimited", "$199", "/mo", "Every class on the timetable, competition training and open mat.", True),
        ],
        "prices_note": "Punch cards for adults are $160 for five classes or $100 for three, and they never expire. Private lessons run $60–$120 an hour. Everything is month to month with 30 days notice to cancel.",
        "faqs": [
            ("Do I need to be in shape before I start?",
             "No, and waiting until you are is the single most common reason people never start. Jiu-jitsu will get you in shape — you build the specific conditioning it needs by doing it, and there is no fitness test at the door. Scale the warm-up, sit out a round when you need to, and let the fitness arrive on its own."),
            ("I am in my forties. Am I too old for this?",
             "No. A meaningful share of our adult students started after forty, and jiu-jitsu is the martial art most forgiving of a late start because leverage and patience beat athleticism in it more often than in anything else. Train at your pace, tap early, and you will still be doing this in fifteen years."),
            ("What is the difference between Gi and No-Gi, and which should I do?",
             "Gi is the traditional uniform, and the jacket and trousers become part of the game — grips, collar chokes, sweeps off the sleeve. No-Gi is a rashguard and shorts: faster, more wrestling-like, nothing to hold on to. Most people here do both, and the two make each other better. If you have no instinct either way, come to whichever class fits your schedule first."),
            ("What do I wear and what do I need to bring?",
             "For a first class, athletic clothes with no zippers or pockets, and a water bottle. We will lend you a gi if it is a Gi class. Trim your nails. That is the entire list."),
            ("How many times a week should I train?",
             "Two is enough to improve steadily. Three is where most people find progress becomes obvious. The 8-class membership is built for the first case and unlimited for the second — and you can move between them month to month, because nothing here is on a contract."),
            ("Can I come and watch before I commit to anything?",
             "Yes, any time. Come and sit at the side of a class. But a free trial costs you the same as watching and tells you far more, so most people who mean to watch end up on the mats within about ten minutes."),
        ],
        "close_title": "Take a free class",
        "close_text": "Any class on the timetable, no commitment, borrowed gi if you need one. Book it online or call the academy and we will find you a slot that works.",
        "related_posts": [
            ("starting-bjj-in-your-30s-40s-50s", "Starting BJJ in Your 30s, 40s and 50s"),
            ("what-to-expect-first-bjj-class", "What to Expect at Your First BJJ Class"),
            ("bjj-for-women", "BJJ for Women"),
        ],
    },
    {
        "slug": "bjj-competition-team",
        "hub_blurb": "Kids, teens and adults training for IBJJF, ADCC and JJWL. Included in unlimited memberships, and nobody is made to compete.",
        "nav_name": "Competition Team",
        "name": "BJJ Competition Team",
        "h1": "The Labyrinth Competition Team",
        "title": "BJJ Competition Team in Fulshear, TX — IBJJF, ADCC & JJWL | Labyrinth BJJ",
        "og_title": "BJJ Competition Team — #1 Ranked Academy in Texas",
        "description": "BJJ competition training in Fulshear, TX for kids, teens and adults. IBJJF, ADCC and JJWL. #1 ranked academy in Texas, #9 nationally.",
        "eyebrow": "#1 in Texas · #9 nationally",
        "image": "competition-card",
        "image_alt": "Labyrinth BJJ competitor on the podium after an IBJJF tournament",
        "lead": "Dedicated competition classes for kids, teens and adults — and the ranking to show they work. Included in unlimited memberships, and nobody is ever made to compete.",
        "service_desc": "Brazilian jiu-jitsu competition team training in Fulshear, TX for kids, teens and adults preparing for IBJJF, ADCC and JJWL tournaments. Ranked #1 in Texas and #9 nationally on jits.gg.",
        "facts": [
            ("Texas rank", "<em>#1</em> academy"),
            ("National rank", "<em>#9</em> on jits.gg"),
            ("Who", "Kids, teens and adults"),
            ("Cost", "In unlimited memberships"),
        ],
        "intro": [
            "There are two honest reasons to have a competition team. One is that some people want to test themselves against strangers under rules, and a gym that cannot offer that loses them. The other is that a room with competitors in it trains harder, and everybody in the room benefits from that whether they ever enter a tournament or not.",
            "Ours is ranked <strong>#1 in Texas and #9 nationally</strong> on jits.gg, which is the largest verified grappling database there is — the ranking is computed from actual match results rather than claimed. Our athletes compete at <strong>IBJJF, ADCC and JJWL</strong> events, and the youth side of the team has produced Pan American champions.",
            "None of that obliges anybody. Competition classes are on the timetable for the people who want them, and the rest of the academy runs exactly as it would without them.",
        ],
        "stats": True,
        "groups_title": "Who trains on the team",
        "groups_lead": "Three tracks, all under the same coaching staff.",
        "groups": [
            ("Ages 7–15", "Kids & teens competition",
             "Friday's Gi competition classes and the Saturday No-Gi sessions. This is where the medals in the case came from — the youth side of the team is the strongest part of it, and several of our kids sit in the top tiers of the national junior rankings."),
            ("Adults", "Adult competition",
             "Friday evening in the Gi and Saturday morning No-Gi. Open to any adult member who wants harder rounds, whether or not they intend to enter anything."),
            ("Grey-white belt+", "Advanced grappling",
             "Tuesday, Thursday and Saturday. These sessions need a grey-white belt or higher, or two or more years of wrestling — not as a status symbol, but because the pace assumes you already know how to move."),
        ],
        "schedule_title": "Competition and advanced class times",
        "schedule_note": "Classes marked <strong>ADV</strong> require a grey-white belt or above, or two or more years of wrestling experience. The Friday and Saturday competition classes are open to any member in the right age group. All of these are <strong>included in unlimited memberships</strong> — adult unlimited at $199/month and kids unlimited at $249/month — at no extra charge.",
        "week": schedule_data.week_for({"Adult Comp", "Kids BJJ Comp", "Teens BJJ Comp", "Kids Grappling", "Teens Grappling"},
                                       require={"comp", "adv"}),
        "body_title": "What competition training is, and what it is not",
        "body": [
            "It is not a harder version of the normal class with more sparring bolted on. The technical content is narrower and deeper — a smaller set of positions worked until they are reliable under a stranger's resistance — and a large part of it is the things that only matter with a referee present: rule sets, points, advantages, how to close out a lead, what to do in the last thirty seconds when you are down two.",
            "There is a conditioning element, because matches are decided late far more often than people expect. Our <a href=\"/blog/strength-and-conditioning-for-kids-fulshear\">strength and conditioning class</a> on Tuesdays and Thursdays exists partly for this reason, and it is open to every member at no extra cost.",
            "What competition training is not is a commitment to enter anything. Plenty of people train in these classes for the intensity and never register for a tournament, and that is a completely normal way to use them. Nobody is signed up to an event without asking.",
        ],
        "coaches": ["tony", "shaun", "jared"],
        "coaches_note": "Corner work at tournaments is done by the same coaches who run the classes.",
        "prices": [
            ("Adult unlimited", "$199", "/mo", "Every adult class including competition training and open mat.", True),
            ("Kids unlimited", "$249", "/mo", "Every kids and teens class including the competition classes.", True),
            ("Private lessons", "$60–120", "/hr", "One to one, for a specific problem or in the weeks before an event.", False),
        ],
        "prices_note": "Competition classes are part of the unlimited memberships rather than a separate team fee. Tournament entry fees are paid to the organisers directly and are not charged by the academy.",
        "faqs": [
            ("Do I have to compete to train in these classes?",
             "No. The competition classes are open training slots, and a good number of the people in them have never entered a tournament and do not plan to. They come for harder rounds and sharper coaching. Nobody is registered for an event without being asked first."),
            ("How do I know if my child is ready to compete?",
             "The coaches will tell you, and they will tell you honestly. Broadly: a child who is comfortable in live rounds against their own gym, who is not distressed when they lose one, and who has asked about competing. A child pushed onto a mat before that usually has one bad day and never asks again."),
            ("What tournaments do you compete at?",
             "Mostly IBJJF, ADCC and JJWL events, which are the three circuits that matter most in Texas and nationally. There is a live tournament calendar on the front page and at calendar.labyrinth.vision, and coaches corner at the events the team travels to."),
            ("Is there an extra fee to be on the competition team?",
             "No. Competition classes are included in the unlimited memberships — $199 a month for adults, $249 for kids and teens. You pay tournament organisers their own entry fees when you enter an event, but the academy does not charge a team fee on top of the membership."),
            ("What does the #1 in Texas ranking actually mean?",
             "It comes from jits.gg, which aggregates verified match results across tournaments and ranks academies on the performance of their athletes — wins, medals and submission rates, not self-reporting. We currently sit #1 in Texas and #9 nationally, with 83 individually ranked athletes."),
            ("Can an adult beginner join the competition classes?",
             "The Friday and Saturday adult competition classes, yes — turn up. The advanced grappling classes on Tuesday and Thursday need a grey-white belt or higher, or two or more years of wrestling, because the pace assumes a base you will not have in your first months."),
        ],
        "close_title": "Come and train a round",
        "close_text": "The competition classes are on the normal timetable and a trial is free. Come to one, take the rounds, and decide about tournaments later or never.",
        "related_posts": [
            ("first-bjj-tournament-guide", "Your First BJJ Tournament: A Guide"),
            ("bjj-belt-system-explained", "The BJJ Belt System Explained"),
            ("best-bjj-gym-fulshear-tx", "How to Judge a BJJ Gym"),
        ],
    },
    {
        "slug": "summer-camp-fulshear",
        "hub_blurb": "Half-day camp, ages 5–15. Four hours of jiu-jitsu and wrestling, $60 a day, drop in for the days you need.",
        "nav_name": "Summer Camp",
        "name": "Summer Camp",
        "h1": "Summer Camp in Fulshear",
        "title": "Kids Summer Camp in Fulshear, TX (Ages 5–15) | Labyrinth BJJ",
        "og_title": "Kids Summer Camp in Fulshear, TX — Jiu-Jitsu and Wrestling",
        "description": "Half-day summer camp in Fulshear, TX for ages 5–15. Jiu-jitsu and wrestling, 12–4 PM, $60 a day. Dates for summer 2027 announced in spring.",
        "eyebrow": "Ages 5–15 · Summer 2027",
        "cta_primary": ("Call About 2027 Dates", "tel:2813937983"),
        "cta_secondary": "See the Camp Day",
        "image": "kids-gi",
        "image_alt": "A young student in a white gi at Labyrinth BJJ in Fulshear, TX",
        "lead": "Four hours a day of actual training — jiu-jitsu, wrestling and a proper break in the middle. $60 a day, book only the days you need. Next running in summer 2027.",
        "service_desc": "Kids summer camp in Fulshear, TX for ages 5-15. Half-day sessions from 12:00 to 4:00 PM covering Brazilian jiu-jitsu technique, live rounds and wrestling. $60 per day, booked by the day.",
        "facts": [
            ("Ages", "5 to 15"),
            ("Hours", "12:00–4:00 PM"),
            ("Price", "<em>$60</em> per day"),
            ("Next", "Summer 2027"),
        ],
        "intro": [
            "Most summer camps are childcare with a theme. A child is dropped off, kept busy, and comes home having done a craft. There is nothing wrong with that, and it is not what this is.",
            "Camp at Labyrinth is <strong>four hours of training</strong>. Jiu-jitsu technique and live rounds, wrestling and takedowns, and a break in the middle to eat and sit down. The coaches are the same ones who run the regular classes, and the curriculum is the regular curriculum — just condensed into a block long enough to actually get somewhere.",
            "Children who come to a week of camp typically arrive back in the September classes noticeably ahead of where they left off in May, which is the opposite of what a summer usually does to a young athlete.",
            "<strong>The next camp runs in summer 2027.</strong> Dates move every year around the Lamar CISD calendar, so they are set and announced in the spring — put your name down and we will tell you first.",
        ],
        "groups_title": "How the four hours run",
        "groups_lead": "Noon to four, three blocks and a break.",
        "groups": [
            ("Block one", "Jiu-jitsu",
             "Technique taught the way it is in a normal class — a position broken into pieces, drilled with a partner, then worked in live rounds from a set start. Beginners and experienced kids are separated for this."),
            ("The middle", "Lunch and downtime",
             "Children bring their own lunch. There is a proper sit-down break rather than a rushed twenty minutes, because four hours of grappling without one produces a tired child and a bad afternoon."),
            ("Block two", "Wrestling",
             "Stance, motion, level changes and takedowns. It is the part most kids have never done, it is the fastest way to improve a young grappler, and it is the reason the afternoon does not feel like more of the morning."),
        ],
        "schedule_title": "Dates and booking",
        "schedule_note": "Camp runs <strong>12:00 PM to 4:00 PM</strong> at our Fulshear academy and costs <strong>$60 per day</strong>. Book the days you want — there is no minimum and no full-week requirement, which matters when a family holiday sits in the middle of a week. <strong>Dates change every year</strong> around the school calendar and are announced in the spring; call the academy on " + PHONE + " to be told first.",
        "week": [
            ("Camp day", [("12:00 PM", "Jiu-jitsu technique and rounds", "gi"),
                          ("1:30 PM", "Lunch and downtime", ""),
                          ("2:15 PM", "Wrestling and takedowns", ""),
                          ("4:00 PM", "Pick-up", "")]),
        ],
        "body_title": "What parents ask before booking",
        "body": [
            "<strong>They do not need to train here already.</strong> Camp is open to any child in the age range, including one who has never set foot on a mat. Beginners are grouped together for the technical blocks rather than dropped into rounds with kids who have been training for years.",
            "<strong>Four hours is the right length.</strong> A full-day camp for a nine-year-old doing contact sport is too much, and everybody involved knows it by Wednesday. Noon to four leaves the morning free and gets them home before they are wrecked.",
            "<strong>Bring lunch, shorts, a t-shirt and a water bottle.</strong> No gi needed — we will lend one for the jiu-jitsu block if your child does not own one. Nails trimmed, no jewellery.",
            "<strong>It is not a discount on membership and membership is not required.</strong> Camp is priced by the day on its own. If your child ends up wanting to carry on in September, that is a separate conversation and nobody will start it in the car park.",
        ],
        "coaches": ["tony", "malik"],
        "coaches_note": "The same coaches who teach the regular kids classes.",
        "prices": [
            ("Per day", "$60", "/day", "Four hours, 12:00–4:00 PM. Book the days you want, no minimum.", True),
        ],
        "prices_note": "Camp is billed by the day and is separate from membership — you do not need to be a member to come, and members do not get camp included. Dates for summer 2027 are announced in the spring; ring " + PHONE + " to go on the list.",
        "faqs": [
            ("When is summer camp 2027?",
             "Dates are set in the spring, because they move each year around the Lamar CISD calendar and around the tournament season. Camp runs 12:00 PM to 4:00 PM on the days it runs. Call the academy on " + PHONE + " or ask at the desk to be told as soon as the dates are fixed."),
            ("What ages is the camp for?",
             "Five to fifteen. Younger children are grouped separately from teens for the technical blocks, in the same way the regular kids classes are split. Under five, the Little Grapplers class during the year is a better fit than a four-hour camp day."),
            ("Does my child need to train at Labyrinth already?",
             "No. Camp is open to any child in the age range, including complete beginners, and a good number of the children who come have never trained anywhere. Beginners work together for the technique blocks rather than being put in with kids who have been on the mats for years."),
            ("How much does it cost, and do we have to book the whole week?",
             "$60 per day, and no. Book only the days you want — there is no minimum, no full-week requirement and no package to commit to, which matters when a holiday or another camp sits in the middle of a week."),
            ("What should my child bring?",
             "A packed lunch, a water bottle, shorts with no zippers or pockets, and a t-shirt or rashguard. No gi needed — we will lend one for the jiu-jitsu block. Nails trimmed, no jewellery."),
            ("What actually happens across the four hours?",
             "Jiu-jitsu first — technique broken down, drilled with a partner, then live rounds from a set position. A proper sit-down lunch break in the middle. Then wrestling: stance, motion, level changes and takedowns. It is training, not supervised free play."),
        ],
        "close_title": "Get on the list for 2027",
        "close_text": "Dates are announced in the spring. Ring the academy or ask at the desk and we will tell you before they go public.",
        "related_posts": [
            ("new-to-fulshear-kids-activities", "New to Fulshear? Getting Kids Active"),
            ("what-age-should-kids-start-jiu-jitsu", "What Age Should Kids Start Jiu-Jitsu?"),
            ("bjj-vs-wrestling-for-kids", "BJJ vs Wrestling for Kids"),
        ],
    },
    {
        "slug": "youth-wrestling-fulshear",
        "hub_blurb": "Ages 7–17, three sessions a week with a Texas National Team wrestler. Included in any kids membership, no background needed.",
        "nav_name": "Youth Wrestling",
        "name": "Youth Wrestling",
        "h1": "Youth Wrestling in Fulshear",
        "title": "Youth Wrestling Classes in Fulshear, TX (Ages 7–17) | Labyrinth BJJ",
        "og_title": "Youth Wrestling in Fulshear, TX — Ages 7 to 17",
        "description": "Youth wrestling in Fulshear, TX for ages 7–17, coached by a Texas National Team wrestler. Three sessions a week, no experience needed.",
        "eyebrow": "Ages 7–17",
        "image": "wrestling-card",
        "image_alt": "Youth wrestling athletes training at Labyrinth BJJ in Fulshear, TX",
        "lead": "Three sessions a week with a Texas National Team wrestler, for ages 7 to 17. Included in every kids and teens membership, no wrestling background needed, and the first class is free.",
        "service_desc": "Youth wrestling classes in Fulshear, TX for ages 7-17, coached by Texas National Team wrestler Malik Pickett. Takedowns, top control and conditioning, three sessions a week, included in kids and teens memberships.",
        "facts": [
            ("Ages", "7 to 17"),
            ("Runs", "Wed, Thu &amp; Sun"),
            ("Coach", "Malik Pickett, <em>TX National Team</em>"),
            ("Cost", "In any kids membership"),
        ],
        "intro": [
            "Wrestling is the oldest thing on this list and the plainest. You take somebody down and you hold them there. There are no belts, no submissions and nothing to hide behind — which is exactly why it does something to children that few other sports manage.",
            "We run it three times a week for ages 7 to 17, coached by <strong>Malik Pickett</strong>, a Texas National Team wrestler. It is open to children who have never wrestled and to children who wrestle for their school and want more mat time out of season.",
            "It also happens to be the single best complement to jiu-jitsu. The most common gap in a young grappler's game is that they are excellent once a match hits the ground and have no idea how to get it there. Wrestling closes that gap directly, and our kids who do both are noticeably harder to deal with in the first thirty seconds of a match.",
        ],
        "groups_title": "Who it is for",
        "groups_lead": "Three fairly different children end up in the same room, and it works.",
        "groups": [
            ("No experience", "The beginner",
             "A child who has never wrestled. The first weeks are stance, motion, level changes and how to fall — the same fundamentals a first-year school wrestler gets, taught without the pressure of a season already running."),
            ("School wrestlers", "The off-season athlete",
             "Lamar CISD wrestlers who want mat time between seasons. Practice with a coach who has competed at national level, in a room where nobody is fighting for a varsity spot."),
            ("BJJ students", "The grappler",
             "Jiu-jitsu kids who are strong on the ground and lost standing up. Takedowns, hand fighting and top pressure transfer straight into a BJJ match and are the fastest available upgrade to a young competitor's game."),
        ],
        "schedule_title": "Wrestling class times",
        "schedule_note": "All three sessions are open to ages 7 to 17 with no wrestling background required. The Wednesday and Thursday classes run in the evening after the kids BJJ classes have finished; Sunday afternoon is the longest and least rushed of the three. First session is free.",
        "week": schedule_data.week_for({"Youth Wrestling"}),
        "body_title": "What it gives a child",
        "body": [
            "<strong>A tolerance for being uncomfortable.</strong> Wrestling practice is hard in a way that is difficult to fake your way through, and children who stick with it develop a working relationship with discomfort that shows up in everything else they do. This is the thing parents report back to us about, far more than any technique.",
            "<strong>Genuine conditioning.</strong> Few youth sports build an engine like wrestling. Six minutes of live wrestling is a different order of demand from most things a child of that age does, and it arrives without anybody having to be talked into cardio.",
            "<strong>Takedowns that transfer.</strong> For a child who also trains jiu-jitsu, this is the most direct improvement available. Most youth BJJ matches are decided by who gets on top, and wrestling is the art of getting on top.",
            "<strong>A way into a school sport.</strong> Wrestling has a season, a team and a structure, and a child who has trained here for a year walks into a middle school room already knowing how to move.",
        ],
        "coaches": ["malik"],
        "coaches_note": "",
        "prices": [
            ("8 classes", "$239", "/mo", "Eight classes a month across BJJ and wrestling, in any combination.", False),
            ("Unlimited", "$249", "/mo", "Every kids and teens class on the timetable, wrestling and BJJ alike.", True),
            ("Family plan", "$399", "/mo", "Unlimited for two members, kids or adults, +$80/mo per extra member.", False),
        ],
        "prices_note": "Wrestling is included in any kids or teens membership at no extra charge — there is no separate wrestling fee and no minimum number of sessions. A child on the 8-class plan can spend all eight on wrestling, all eight on jiu-jitsu, or any mix of the two. Month to month, 30 days notice to cancel, and the first class is free. See all <a href=\"/#pricing\">membership options</a>.",
        "faqs": [
            ("Does my child need wrestling experience to start?",
             "None at all. Most children in the room started with none. The first few weeks are stance, motion, level changes and safe falling — the same place every wrestler begins, taught without a season already in progress."),
            ("What should my child wear to wrestling?",
             "Shorts without pockets or zippers and a fitted t-shirt or rashguard. No wrestling shoes or singlet needed to start; if they carry on, wrestling shoes are the one thing worth buying and they are inexpensive."),
            ("Is this school wrestling or club wrestling?",
             "It is club training, which means there is no season and no varsity spot to win. Children train year round, at their own pace. Plenty of our wrestlers also wrestle for their schools and use this as off-season mat time; plenty of others never wrestle competitively at all."),
            ("Does wrestling help with Brazilian jiu-jitsu?",
             "More than almost anything else. The usual weakness in a young jiu-jitsu player is that they are dangerous on the ground and helpless standing up, and most youth matches are decided by who gets on top first. Wrestling addresses exactly that, which is why we run it in a jiu-jitsu academy."),
            ("Does wrestling cost extra on top of a membership?",
             "No. Wrestling is included in any kids or teens membership — $239 a month for eight classes or $249 unlimited — with no separate fee and no minimum. Eight classes a month means eight classes, and your child can spend them on wrestling, on jiu-jitsu, or on any mix of the two. The first session is free, the same as everything else here."),
            ("Who teaches the wrestling classes?",
             "Coach Malik Pickett, a Texas National Team wrestler. He brings elite-level takedowns and grappling fundamentals, and he is known here for his energy with the younger kids in particular."),
            ("Is wrestling safe for a seven-year-old?",
             "Yes, with the coaching and pairing done properly, which is the whole job. Children are matched by size and experience, falling safely is taught before anything is done at speed, and a coach is on the mat for every live round. Wrestling injury rates in supervised youth programs sit in the same range as other youth contact sports."),
        ],
        "close_title": "First wrestling class is free",
        "close_text": "Wednesday and Thursday evening, or Sunday afternoon. Shorts and a t-shirt is all your child needs to find out whether this is their thing.",
        "related_posts": [
            ("bjj-vs-wrestling-for-kids", "BJJ vs Wrestling for Kids"),
            ("strength-and-conditioning-for-kids-fulshear", "Strength & Conditioning for Kids"),
            ("benefits-of-bjj-for-kids", "10 Benefits of BJJ for Kids"),
        ],
    },
]

# name, role, rank label, belt-bar modifier, photo, bio
COACHES = {
    "tony": ("Prof. Anthony Curry", "Head Instructor &amp; Owner", "Black Belt &middot; 14+ Yrs", "black", "coach-tony",
             "Founder of Labyrinth BJJ. Built the academy from the ground up into the #1 ranked team in Texas."),
    "shaun": ("Prof. Shaun Lawler", "Professor", "Black Belt &middot; 15+ Yrs", "black", "coach-shaun",
              "Deep competition experience and technical precision. Develops athletes at every level from beginner to elite competitor."),
    "jared": ("Jared Vevera", "Head Coach &mdash; Katy", "Black Belt &middot; 14+ Yrs", "black", "coach-jared",
              "Over 14 years of training, bringing world-class technique and leadership to both academies."),
    "christian": ("Christian Solano", "Instructor", "Brown Belt &middot; 10+ Yrs", "brown", "coach-christian",
                  "Over a decade of training forged into sharp no-gi technique."),
    "jake": ("Jake Maronge", "Instructor", "Brown Belt &middot; 9 Yrs", "brown", "coach-jake",
             "Nearly a decade on the mat. Leads the Wednesday early morning gi class, bringing technical depth and consistency."),
    "malik": ("Malik Pickett", "Wrestling Coach", "TX National Team", "wrestling", "coach-malik",
              "Texas National Team wrestler bringing elite-level takedowns and grappling fundamentals. Known for his energy and dedication to youth development."),
}

BADGES = {"gi": ("gi", "Gi"), "nogi": ("nogi", "No-Gi"), "adv": ("adv", "Adv")}


# ── Rendering ────────────────────────────────────────────────────────────────

def primary(p):
    """The page's main button. Defaults to the free-trial modal; a program that
    is neither free nor currently running says something true instead."""
    if p.get("cta_primary"):
        label, href = p["cta_primary"]
        return '<a href="%s" class="btn btn--gold">%s</a>' % (href, label)
    return '<a data-book-trial href="/#book" class="btn btn--gold">Book a Free Class</a>'


def section(label, title, subtitle="", narrow=False, inner=""):
    return """
<section class="prog-section">
  <div class="container%s">
    <div class="fade-in">
      <p class="section-label">%s</p>
      <h2 class="section-title section-title--lg">%s</h2>
      %s
    </div>
%s
  </div>
</section>""" % (" container--narrow" if narrow else "", label, title,
                 '<p class="section-subtitle">%s</p>' % subtitle if subtitle else "", inner)


def render_week(week):
    days = []
    for name, slots in week:
        rows = []
        for time, cls, kinds in slots:
            badges = "".join(
                '<span class="prog-slot__badge prog-slot__badge--%s">%s</span>' % BADGES[k]
                for k in kinds.split() if k in BADGES)
            rows.append(
                '      <div class="prog-slot">\n'
                '        <div class="prog-slot__time">%s%s</div>\n'
                '        <div class="prog-slot__name">%s</div>\n'
                '      </div>' % (time, badges, cls))
        days.append('    <div class="prog-day">\n'
                    '      <div class="prog-day__name">%s</div>\n%s\n    </div>'
                    % (name, "\n".join(rows)))
    return '  <div class="prog-week stagger">\n%s\n  </div>' % "\n".join(days)


def render_coaches(keys):
    out = []
    for k in keys:
        name, role, rank, belt, img, bio = COACHES[k]
        plain = re.sub(r"&\w+;", " ", name).strip()
        out.append("""    <div class="coach-card">
      <div class="coach-card__avatar">
        <picture><source srcset="/assets/%s.webp" type="image/webp"><img src="/assets/%s.jpg" alt="%s at Labyrinth BJJ in Fulshear, TX" loading="lazy" width="200" height="200"></picture>
      </div>
      <div class="coach-card__info">
        <h3 class="coach-card__name">%s</h3>
        <p class="coach-card__role">%s</p>
        <div class="coach-card__rank">
          <div class="belt-bar belt-bar--%s"><span class="belt-bar__belt"></span><span class="belt-bar__tab"></span></div>
          <span class="coach-card__rank-label">%s</span>
        </div>
        <p class="coach-card__bio">%s</p>
      </div>
    </div>""" % (img, img, plain, name, role, belt, rank, bio))
    return '  <div class="prog-coaches stagger">\n%s\n  </div>' % "\n".join(out)


def render(p):
    url = "%s/programs/%s" % (SITE, p["slug"])
    image = "%s/assets/%s.jpg" % (SITE, p["image"])

    faq_schema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
            {"@type": "Question", "name": q,
             "acceptedAnswer": {"@type": "Answer", "text": re.sub(r"<[^>]+>", "", a)}}
            for q, a in p["faqs"]
        ],
    }
    service_schema = {
        "@context": "https://schema.org",
        "@type": "Service",
        "name": p["name"],
        "description": p["service_desc"],
        "url": url,
        "serviceType": p["name"],
        "areaServed": [{"@type": "City", "name": c} for c in
                       ["Fulshear, TX", "Katy, TX", "Cinco Ranch, TX", "Richmond, TX", "Rosenberg, TX"]],
        "provider": {
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
        },
    }

    head = HEAD % {
        "title": p["title"], "description": p["description"], "url": url,
        "og_title": p["og_title"], "image": image,
        "schema": "\n".join([jsonld(service_schema),
                             jsonld(breadcrumb_schema(p["name"], url)),
                             jsonld(faq_schema)]),
    }

    facts = "\n".join(
        '      <div class="prog-fact"><div class="prog-fact__label">%s</div>'
        '<div class="prog-fact__value">%s</div></div>' % (l, v) for l, v in p["facts"])

    hero = """%(nav)s

%(crumbs)s

<header class="prog-hero">
  <div class="container">
    <div class="prog-hero__grid">
      <div>
        <p class="section-label">%(eyebrow)s</p>
        <h1 class="prog-hero__title">%(h1)s</h1>
        <p class="prog-hero__lead">%(lead)s</p>
        <div class="prog-hero__cta">
          %(cta1)s
          <a href="#times" class="btn btn--ghost">%(cta2)s</a>
        </div>
      </div>
      <div class="prog-hero__shot">
        <picture>
          <source srcset="/assets/%(img)s.webp" type="image/webp">
          <img src="/assets/%(img)s.jpg" alt="%(alt)s" width="800" height="600">
        </picture>
      </div>
    </div>
    <div class="prog-facts">
%(facts)s
    </div>
  </div>
</header>""" % {"nav": NAV, "crumbs": crumbs(p["nav_name"]), "eyebrow": p["eyebrow"],
                "h1": p["h1"], "lead": p["lead"], "img": p["image"],
                "alt": p["image_alt"], "facts": facts,
                "cta1": primary(p), "cta2": p.get("cta_secondary", "See Class Times")}

    parts = [head, hero]

    # Intro prose
    parts.append(section("The program", "WHAT IT IS",
                         inner='  <div class="prog-prose fade-in">\n%s\n  </div>'
                               % "\n".join("    <p>%s</p>" % x for x in p["intro"])))

    # Live competition numbers, on the one page that is about them. These are the
    # same data-target elements the front page uses, so app.js animates them and
    # refreshes them from the stats sheet rather than them going stale here.
    #
    # id="statsGrid" is load-bearing, not decoration: app.js observes that exact
    # id to fire the count-up, so without it the cards render a permanent 0.
    if p.get("stats"):
        parts.append(section("Competition stats", "THE NUMBERS", "Verified from jits.gg, the largest grappling results database there is.",
                             inner="""  <div class="stats-grid stagger" id="statsGrid">
    <div class="stat-card"><div class="stat-card__value" data-target="9" data-prefix="#">0</div><div class="stat-card__label">National Rank</div></div>
    <div class="stat-card"><div class="stat-card__value" data-target="267" data-suffix="">0</div><div class="stat-card__label">Gold Medals</div></div>
    <div class="stat-card"><div class="stat-card__value" data-target="890" data-suffix="+">0</div><div class="stat-card__label">Total Wins</div></div>
    <div class="stat-card"><div class="stat-card__value" data-target="59" data-suffix="%">0</div><div class="stat-card__label">Submission Rate</div></div>
  </div>"""))

    # Groups
    groups = "\n".join(
        '    <div class="prog-group"><p class="prog-group__tag">%s</p>'
        '<h3 class="prog-group__title">%s</h3><p class="prog-group__desc">%s</p></div>'
        % g for g in p["groups"])
    parts.append(section("Who trains", p["groups_title"].upper(), p["groups_lead"],
                         inner='  <div class="prog-groups stagger">\n%s\n  </div>' % groups))

    # Timetable
    parts.append("""
<section class="prog-section" id="times">
  <div class="container">
    <div class="fade-in">
      <p class="section-label">Timetable</p>
      <h2 class="section-title section-title--lg">%s</h2>
    </div>
%s
    <p class="prog-week__note fade-in">%s</p>
    <div class="prog-hero__cta fade-in">
      %s
      <a href="/#schedule" class="btn btn--ghost">Full Academy Schedule</a>
    </div>
  </div>
</section>""" % (p["schedule_title"].upper(), render_week(p["week"]), p["schedule_note"], primary(p)))

    # Body prose
    parts.append(section("Detail", p["body_title"].upper(),
                         inner='  <div class="prog-prose fade-in">\n%s\n  </div>'
                               % "\n".join("    <p>%s</p>" % x for x in p["body"])))

    # Coaches
    parts.append(section("Coaching", "WHO TEACHES IT", p.get("coaches_note", ""),
                         inner=render_coaches(p["coaches"])))

    # Pricing
    price_inner = ""
    if p["prices"]:
        cards = "\n".join(
            '    <div class="prog-price%s"><div class="prog-price__name">%s</div>'
            '<div class="prog-price__amount">%s<span>%s</span></div>'
            '<p class="prog-price__note">%s</p></div>'
            % (" prog-price--feature" if feat else "", name, amt, per, note)
            for name, amt, per, note, feat in p["prices"])
        price_inner = '  <div class="prog-prices stagger">\n%s\n  </div>\n' % cards
    price_inner += '  <p class="prog-week__note fade-in">%s</p>' % p["prices_note"]
    parts.append(section("Membership", "WHAT IT COSTS", narrow=False, inner=price_inner))

    # FAQ
    faq_items = "\n".join("""      <div class="faq-item">
        <button class="faq-item__question" aria-expanded="false">
          <span>%s</span>
          <svg class="faq-item__icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        <div class="faq-item__answer"><p>%s</p></div>
      </div>""" % (q, a) for q, a in p["faqs"])
    parts.append("""
<section class="faq">
  <div class="container container--narrow">
    <div class="fade-in">
      <p class="section-label">Questions</p>
      <h2 class="section-title section-title--lg">%s FAQ</h2>
    </div>
    <div class="faq__list stagger">
%s
    </div>
  </div>
</section>""" % (p["nav_name"].upper(), faq_items))

    # Related reading + sibling programs
    posts = "\n".join(
        '    <a href="/blog/%s" class="prog-sibling"><div class="prog-sibling__title">%s</div>'
        '<div class="prog-sibling__desc">From the Labyrinth blog</div></a>' % (s, t)
        for s, t in p["related_posts"])
    sibs = "\n".join(
        '    <a href="/programs/%s" class="prog-sibling"><div class="prog-sibling__title">%s</div>'
        '<div class="prog-sibling__desc">%s</div></a>' % (o["slug"], o["name"], o["eyebrow"])
        for o in PROGRAMS if o["slug"] != p["slug"])
    parts.append(section("Keep reading", "MORE FROM LABYRINTH",
                         inner='  <div class="prog-siblings stagger">\n%s\n%s\n  </div>' % (sibs, posts)))

    # Closing CTA
    parts.append("""
<div class="container">
  <div class="prog-close fade-in">
    <h2 class="prog-close__title">%s</h2>
    <p class="prog-close__text">%s</p>
    <div class="prog-hero__cta" style="justify-content:center">
      %s
      <a href="tel:2813937983" class="btn btn--ghost">Call %s</a>
    </div>
  </div>
</div>""" % (p["close_title"].upper(), p["close_text"], primary(p), PHONE))

    parts.append(TAIL % {"footer": FOOTER})
    return "\n".join(parts)


def render_hub():
    url = SITE + "/programs/"
    cards = "\n".join(
        """      <a href="/programs/%s" class="prog-sibling">
        <div class="prog-sibling__title">%s</div>
        <div class="prog-sibling__desc">%s</div>
      </a>""" % (p["slug"], p["name"], p["hub_blurb"])
        for p in PROGRAMS)

    schema = {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": "Programs at Labyrinth BJJ",
        "url": url,
        "description": "Brazilian jiu-jitsu, wrestling and strength programs at Labyrinth BJJ in Fulshear, TX.",
        "hasPart": [{"@type": "Service", "name": p["name"],
                     "url": "%s/programs/%s" % (SITE, p["slug"])} for p in PROGRAMS],
    }
    crumb = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Home", "item": SITE},
            {"@type": "ListItem", "position": 2, "name": "Programs", "item": url},
        ],
    }

    head = HEAD % {
        "title": "Programs at Labyrinth BJJ — Fulshear, TX | Kids & Adult BJJ, Wrestling",
        "description": "Every program at Labyrinth BJJ, Fulshear TX: kids BJJ ages 3–15, adult Gi and No-Gi, competition team, wrestling and strength classes.",
        "url": url,
        "og_title": "Programs at Labyrinth BJJ — Fulshear, TX",
        "image": SITE + "/assets/og-image.jpg",
        "schema": "\n".join([jsonld(schema), jsonld(crumb)]),
    }

    return "\n".join([head, NAV, """
<div class="container">
  <nav class="prog-crumbs" aria-label="Breadcrumb">
    <a href="/">Home</a>
    <span class="prog-crumbs__sep">&rsaquo;</span>
    <span class="prog-crumbs__current">Programs</span>
  </nav>
</div>

<header class="prog-hero">
  <div class="container">
    <p class="section-label">Programs</p>
    <h1 class="prog-hero__title">Find Your Path</h1>
    <p class="prog-hero__lead">Five programs under one roof in Fulshear, from a three-year-old's first class to the mats of the #1 ranked competition team in Texas. Every one of them starts with a free class.</p>
    <div class="prog-prose" style="margin-top:var(--space-6)">
      <p>Most people arrive knowing roughly what they want and not what it is called. If it is for a child, it is almost always <a href="/programs/kids-bjj-fulshear">kids Brazilian jiu-jitsu</a> — that is the program with three age groups and six days a week of classes. If it is for you, it is <a href="/programs/adult-bjj-fulshear">adult BJJ</a>, and it does not matter that you have never done a combat sport, because almost nobody who walks in here has.</p>
      <p>The other three are additions rather than alternatives. <a href="/programs/bjj-competition-team">The competition team</a> is for anyone, child or adult, who wants harder rounds and the option of entering tournaments. <a href="/programs/youth-wrestling-fulshear">Youth wrestling</a> runs three evenings a week and is the fastest upgrade available to a young grappler's takedowns. <a href="/blog/strength-and-conditioning-for-kids-fulshear">Strength and conditioning</a> is all ages in one room, twice a week, at no extra cost on any membership.</p>
    </div>
    <div class="prog-hero__cta">
      <a data-book-trial href="/#book" class="btn btn--gold">Book a Free Class</a>
      <a href="/areas/" class="btn btn--ghost">Areas We Serve</a>
    </div>
  </div>
</header>

<section class="prog-section">
  <div class="container">
    <div class="prog-siblings stagger">
%s
      <a href="/blog/strength-and-conditioning-for-kids-fulshear" class="prog-sibling">
        <div class="prog-sibling__title">Strength &amp; Conditioning</div>
        <div class="prog-sibling__desc">All ages &middot; Tuesday and Thursday, 4:15 PM</div>
      </a>
    </div>
  </div>
</section>

<div class="container">
  <div class="prog-close fade-in">
    <h2 class="prog-close__title">NOT SURE WHICH ONE?</h2>
    <p class="prog-close__text">Call the academy and describe who it is for. We will tell you which class to come to, including if the answer is that we are not the right fit.</p>
    <div class="prog-hero__cta" style="justify-content:center">
      <a data-book-trial href="/#book" class="btn btn--gold">Book a Free Class</a>
      <a href="tel:2813937983" class="btn btn--ghost">Call %s</a>
    </div>
  </div>
</div>""" % (cards, PHONE), TAIL % {"footer": FOOTER}])


def main():
    if not os.path.isdir(OUT):
        os.makedirs(OUT)
    for p in PROGRAMS:
        path = os.path.join(OUT, p["slug"] + ".html")
        html = render(p)
        with open(path, "w", encoding="utf-8") as fh:
            fh.write(html)
        words = len(re.sub(r"<[^>]+>", " ", html).split())
        print("wrote programs/%-30s %6d bytes  ~%d words" % (p["slug"] + ".html", len(html), words))
    path = os.path.join(OUT, "index.html")
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(render_hub())
    print("wrote programs/index.html")


if __name__ == "__main__":
    main()
