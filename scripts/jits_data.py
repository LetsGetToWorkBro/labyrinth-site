#!/usr/bin/env python3
"""The academy's competition numbers, as jits.gg reports them. One place.

jits.gg is the source for every ranking and medal count on the site, and it
sits behind a bot check, so nothing here can fetch it. Somebody opens
https://jits.gg/academy/labyrinth-bjj-4377 in a browser, copies the page, and
the numbers go in below. Then run the build (build_programs.py, build_pages.py,
build_areas.py, build_blog_index.py, stamp_assets.py), which puts them on the
front page, the competition team page and everywhere else that is generated.

Where the page gives two figures for the same thing, the higher one is used,
and only if it is on the page. Gold medals are 327 in the tracked-medal count
and 324 in the header; wins are 1,235 tracked wins and 1,125 "roster career
wins". Nothing is rounded up past what the page says, except that #39 of 7,869
is called the top 1% (it is the top 0.5%). The Texas rank (#13 of 935) is
kept here for reference but is not shown anywhere: the site says "top 1% in
the nation" and leaves it there.

The site used to read these from the "Config" and "Athletes" tabs of a Google
Sheet at page load. That sheet stopped updating in March 2026, still said #9
nationally and #1 in Texas, and its Athletes tab had a column out of place, so
it was writing a tier of "yellow · 80" onto the cards. It is no longer read
for stats; the Events tab still drives the upcoming tournaments list.

The prose on hand-written pages (the blog, the privacy footer, llms.txt) says
"top 1% nationally" rather than quoting these figures, so it only needs
touching if that stops being true.
"""
import html

AS_OF = "September 24, 2026"
ACADEMY_URL = "https://jits.gg/academy/labyrinth-bjj-4377"

NATIONAL_RANK = 39
NATIONAL_OF = 7869
STATE_RANK = 13
STATE_OF = 935
NATIONAL_TOP_PCT = 1   # 39 / 7,869 = 0.5%

ROSTER = 117           # current tracked youth roster
RANKED = 108           # "ranked fighters"
GOLDS = 327
MEDALS = 739
WINS = 1235
SUBMISSIONS = 714
SUB_RATE = 58          # % of wins by submission
TX_SUB_RATE = 54
SUB_VS_EXPECTED = 7    # points above expected after adjusting for belt mix
GOLD_SHARE = 44        # % of medals that are gold
TX_GOLD_SHARE = 40
GLOBAL_GOLD_SHARE = 40
MULTI_EVENT = 78       # % of roster with two or more tournaments
TX_MULTI_EVENT = 53
MATCHES = 2053
TOURNAMENTS = 91

# Head-to-head against the two academies above everyone else in Texas.
RIVALS = [
    ("Pablo Silva BJJ", 1, 25, 17),
    ("BJJ Revolution Team", 2, 11, 5),
]

# jits.gg's own "Top Fighters" list for the academy, in its order. Rating and
# record are the two columns whose meaning is certain; the win rate is worked
# out from the record. The other columns on that table have no headings in the
# copied text, so they are not used. `url` is set only where the fighter's
# jits.gg address was already known; the rest link to the academy page, which
# lists them.
ATHLETES = [
    # name, rating, wins, losses, jits.gg url or None, instagram or None
    ("Lincoln Davaul", 4186, 49, 19, "https://jits.gg/fighter/lincoln-edward-davaul-45805", "https://www.instagram.com/headlock_link/"),
    ("Payton Kubeczka", 4020, 34, 20, None, None),
    ("Aliya Sultantono", 3688, 23, 10, None, None),
    ("Case Mozisek", 3685, 43, 17, None, None),
    ("Ellie Root", 3575, 38, 20, None, None),
    ("Aston Hu", 3426, 29, 7, None, None),
]


def win_rate(w, l):
    return round(100 * w / (w + l))


def n(v):
    return "{:,}".format(v)


# ── Rendered blocks, spliced into index.html and used by build_programs ──

def hero_stats():
    """The four figures under the front page headline."""
    return (
        '<div class="hero__stat">\n'
        '        <div class="hero__stat-value" data-target="%d" data-suffix="">0</div>\n'
        '        <div class="hero__stat-label">Gold Medals</div>\n'
        '      </div>\n'
        '      <div class="hero__stat">\n'
        '        <div class="hero__stat-value" data-target="%d" data-suffix="">0</div>\n'
        '        <div class="hero__stat-label">Wins</div>\n'
        '      </div>\n'
        '      <div class="hero__stat">\n'
        '        <div class="hero__stat-value" data-target="%d" data-prefix="Top " data-suffix="%%">0</div>\n'
        '        <div class="hero__stat-label">Nationally</div>\n'
        '      </div>\n'
        '      <div class="hero__stat">\n'
        '        <div class="hero__stat-value" data-target="%d" data-suffix="">0</div>\n'
        '        <div class="hero__stat-label">Ranked Athletes</div>\n'
        '      </div>'
    ) % (GOLDS, WINS, NATIONAL_TOP_PCT, RANKED)


def stats_grid():
    cards = [
        (NATIONAL_TOP_PCT, "Top ", "%", "Nationally &middot; #%d of %s" % (NATIONAL_RANK, n(NATIONAL_OF))),
        (GOLDS, "", "", "Gold Medals"),
        (WINS, "", "", "Wins"),
        (SUB_RATE, "", "%", "Wins by Submission &middot; +%d vs Texas" % (SUB_RATE - TX_SUB_RATE)),
    ]
    return "\n".join(
        '<div class="stat-card"><div class="stat-card__value" data-target="%d" data-prefix="%s" data-suffix="%s">0</div>'
        '<div class="stat-card__label">%s</div></div>' % c for c in cards)


def meters():
    # The submission rate is already a card above, so the second bar is the
    # share of the roster that comes back for another tournament.
    rows = [
        ("Compete at Two or More Tournaments", MULTI_EVENT,
         "%d points above the Texas average of %d%%" % (MULTI_EVENT - TX_MULTI_EVENT, TX_MULTI_EVENT)),
        ("Gold Medal Share", GOLD_SHARE,
         "%d points above the Texas and global averages &middot; %s golds from %s medals"
         % (GOLD_SHARE - TX_GOLD_SHARE, n(GOLDS), n(MEDALS))),
    ]
    return "\n".join(
        '<div class="meter">\n'
        '        <div class="meter__header">\n'
        '          <span class="meter__title">%s</span>\n'
        '          <span class="meter__value">%d%%</span>\n'
        '        </div>\n'
        '        <div class="meter__track">\n'
        '          <div class="meter__fill" data-width="%d"></div>\n'
        '        </div>\n'
        '        <p class="meter__note">%s</p>\n'
        '      </div>' % (t, v, v, note) for t, v, note in rows)


def athletes():
    out = []
    for i, (name, rating, w, l, url, ig) in enumerate(ATHLETES, 1):
        slug = name.lower().replace(" ", "-")
        blurb = ("Number %d on jits.gg&rsquo;s list of Labyrinth&rsquo;s top fighters, with a %s rating "
                 "and a %d&ndash;%d record: %d%% of matches won." % (i, n(rating), w, l, win_rate(w, l)))
        link = url or ACADEMY_URL
        ig_html = ""
        if ig:
            ig_html = ('<a href="%s" target="_blank" rel="noopener noreferrer" class="athlete-card__ig" '
                       'aria-label="%s on Instagram"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" '
                       'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
                       '<rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>'
                       '<line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg></a>' % (ig, html.escape(name)))
        out.append(
            '<div class="athlete-card" role="button" tabindex="0" data-athlete="%(slug)s">\n'
            '              <p class="athlete-card__tier">#%(i)d on the team &middot; %(rating)s rating</p>\n'
            '              <h4 class="athlete-card__name">%(name)s</h4>\n'
            '              <div class="athlete-card__stats">\n'
            '                <span class="athlete-card__stat"><strong>%(w)d-%(l)d</strong> record</span>\n'
            '                <span class="athlete-card__stat"><strong>%(wr)d%%</strong> win rate</span>\n'
            '              </div>\n'
            '              <span class="athlete-card__chevron">&#9662;</span>\n'
            '              <div class="athlete-card__expand">\n'
            '                <p>%(blurb)s</p>\n'
            '                <div class="athlete-card__links">\n'
            '                  <a href="%(link)s" target="_blank" rel="noopener noreferrer" class="athlete-card__link">See Full Stats &rarr;</a>\n'
            '                  %(ig)s\n'
            '                </div>\n'
            '              </div>\n'
            '            </div>' % {
                "slug": slug, "i": i, "rating": n(rating), "name": html.escape(name), "w": w, "l": l,
                "wr": win_rate(w, l), "blurb": blurb, "link": link, "ig": ig_html})
    return "\n            ".join(out)


def rivals_line():
    """'a 25–17 record against Pablo Silva BJJ, #1 in Texas, and 11–5 against ...'"""
    (a, ar, aw, al), (b, br, bw, bl) = RIVALS
    return ("a %d&ndash;%d record against %s, #%d in Texas, and %d&ndash;%d against %s, #%d"
            % (aw, al, a, ar, bw, bl, b, br))


if __name__ == "__main__":
    print(stats_grid())
    print(athletes())
