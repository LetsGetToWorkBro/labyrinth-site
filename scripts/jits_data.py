#!/usr/bin/env python3
"""The academy's competition numbers. GENERATED FILE: do not hand-edit.

Written by ~/workspace/labyrinth-stats-publish/publish_stats.py, which
runs right after the weekly jits.gg sync refreshes the athlete rows in
the Supabase table public.athlete_comp_stats. Tony's rule decides every
figure in this file (October 28, 2026): always go with the most
favorable numbers for the gym, never a smaller one. Each figure below
is the largest value any source states for it, and the site can always
show its basis:

  * WINS, LOSSES and MATCHES start from the tracked career record of
    every athlete on the jits.gg roster (ATHLETES_TRACKED of them),
    summed from the athlete rows.
  * GOLDS_2026 sums the roster's 2026 gold medals, the one medal figure
    with full roster coverage.
  * CAREER_* medal totals are the best reported figure per medal color
    tracked across jits.gg and Smoothcomp: the career Trophy Case sums
    of the PROFILED athletes whose jits.gg profiles are tracked, the
    medal totals the jits.gg academy page states for the academy, and
    the Smoothcomp club page totals, whichever is largest per color.
    CAREER_MEDALS is the sum of the three published per-color figures,
    not any one source's own total.
  * No figure ever goes down: when the sources report less than the
    site already shows, the site keeps the higher figure.
  * POWER_RANK is the Overall Power standing jits.gg itself shows for
    the academy (the better of the fresh reading and the standing the
    site already publishes), and RIVALS is the head-to-head record
    jits.gg shows against the two academies above us in Texas, read
    off the academy page on AS_OF.
"""
import html

AS_OF = "October 28, 2026"
ACADEMY_URL = "https://jits.gg/academy/labyrinth-bjj-4377"

ATHLETES_TRACKED = 116
WITH_RECORD = 112
WINS = 1171
LOSSES = 974
MATCHES = 2145
WIN_RATE = 55          # percent of tracked matches won
GOLDS_2026 = 123
WITH_GOLD_2026 = 43
PROFILED = 25
CAREER_GOLDS = 318
CAREER_SILVERS = 242
CAREER_BRONZES = 140
CAREER_MEDALS = 700
GOLD_SHARE = 45      # percent of published career medals that are gold
POWER_RANK = 37            # jits.gg Overall Power standing

# Retired names, kept as aliases so older templates still run. The site
# no longer prints an "of N academies" claim: jits.gg stopped showing
# the academy count, so NATIONAL_OF is only the last figure it displayed
# (September 2026) and nothing should publish it. There is deliberately
# no GOLDS alias: the old GOLDS mixed bases, and the publish rewrites
# every template that used it to say which golds it means (GOLDS_2026).
NATIONAL_RANK = POWER_RANK
NATIONAL_OF = 7869
NATIONAL_TOP_PCT = 1
RANKED = ATHLETES_TRACKED

# Head-to-head against the two academies above everyone else in Texas,
# as jits.gg's Top Rivalries section showed it on AS_OF.
RIVALS = [
    ("Pablo Silva BJJ", 1, 25, 17),
    ("BJJ Revolution Team", 2, 11, 5),
]

# The team's top fighters by tracked career wins. Career medals are None
# where the athlete's full profile is not tracked. `specials` counts
# career golds at Worlds, Pan Ams and ADCC from the tracked profiles.
ATHLETES = [
    {"name": 'Hadley Annoot', "wins": 68, "losses": 22, "golds": 22, "silvers": 12, "bronzes": 7, "specials": {"worlds": 0, "pans": 0, "adcc": 2}, "url": 'https://jits.gg/fighter/hadley-annoot-39494', "ig": None},
    {"name": 'Andre Zamora', "wins": 66, "losses": 75, "golds": None, "silvers": None, "bronzes": None, "specials": {"worlds": 0, "pans": 0, "adcc": 0}, "url": None, "ig": None},
    {"name": 'Lincoln Davaul', "wins": 49, "losses": 19, "golds": 15, "silvers": 4, "bronzes": 4, "specials": {"worlds": 0, "pans": 0, "adcc": 0}, "url": 'https://jits.gg/fighter/lincoln-davaul-304390', "ig": 'https://www.instagram.com/headlock_link/'},
    {"name": 'Emma Yu', "wins": 48, "losses": 31, "golds": 14, "silvers": 10, "bronzes": 2, "specials": {"worlds": 0, "pans": 0, "adcc": 0}, "url": 'https://jits.gg/fighter/emma-yu-4553', "ig": None},
    {"name": 'Case Mozisek', "wins": 43, "losses": 17, "golds": 12, "silvers": 7, "bronzes": 2, "specials": {"worlds": 0, "pans": 0, "adcc": 1}, "url": 'https://jits.gg/fighter/case-mozisek-4100', "ig": None},
    {"name": 'Autumn Huls', "wins": 41, "losses": 17, "golds": 13, "silvers": 10, "bronzes": 1, "specials": {"worlds": 0, "pans": 0, "adcc": 0}, "url": 'https://jits.gg/fighter/autumn-huls-5451', "ig": None},
]


def win_rate(w, l):
    return round(100 * w / (w + l))


def n(v):
    return "{:,}".format(v)


def _plural(count, one, many):
    return one if count == 1 else many


# -- Rendered blocks, spliced into index.html and used by build_programs --

def hero_stats():
    """The four figures under the front page headline."""
    return (
        '<div class="hero__stat">\n'
        '        <div class="hero__stat-value" data-target="%d" data-suffix="">0</div>\n'
        '        <div class="hero__stat-label">Gold Medals in 2026</div>\n'
        '      </div>\n'
        '      <div class="hero__stat">\n'
        '        <div class="hero__stat-value" data-target="%d" data-suffix="">0</div>\n'
        '        <div class="hero__stat-label">Wins</div>\n'
        '      </div>\n'
        '      <div class="hero__stat">\n'
        '        <div class="hero__stat-value" data-target="%d" data-prefix="" data-suffix="%%">0</div>\n'
        '        <div class="hero__stat-label">Win Rate</div>\n'
        '      </div>\n'
        '      <div class="hero__stat">\n'
        '        <div class="hero__stat-value" data-target="%d" data-suffix="">0</div>\n'
        '        <div class="hero__stat-label">Tracked Athletes</div>\n'
        '      </div>'
    ) % (GOLDS_2026, WINS, WIN_RATE, ATHLETES_TRACKED)


def stats_grid():
    cards = [
        (GOLDS_2026, "", "", "Gold Medals in 2026"),
        (WINS, "", "", "Wins"),
        (WIN_RATE, "", "%", "Win Rate"),
        (ATHLETES_TRACKED, "", "", "Tracked Athletes"),
    ]
    return "\n".join(
        '<div class="stat-card"><div class="stat-card__value" data-target="%d" data-prefix="%s" data-suffix="%s">0</div>'
        '<div class="stat-card__label">%s</div></div>' % c for c in cards)


def meters():
    rows = [
        ("Win Rate", WIN_RATE,
         "%s wins and %s losses across %s tracked matches"
         % (n(WINS), n(LOSSES), n(MATCHES))),
        ("Career Gold Share", GOLD_SHARE,
         "%s golds from %s career medals tracked across jits.gg and Smoothcomp, "
         "best reported figure per medal color"
         % (n(CAREER_GOLDS), n(CAREER_MEDALS))),
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
    for i, a in enumerate(ATHLETES, 1):
        name, w, l = a["name"], a["wins"], a["losses"]
        slug = name.lower().replace(" ", "-")
        blurb = ("Number %d on the team by tracked career wins, with a %d&ndash;%d record: "
                 "%d%% of matches won." % (i, w, l, win_rate(w, l)))
        if a["golds"] is not None:
            blurb += (" %s career %s, %s silver and %s bronze on jits.gg."
                      % (n(a["golds"]), _plural(a["golds"], "gold medal", "gold medals"),
                         n(a["silvers"]), n(a["bronzes"])))
            sp = a["specials"] or {}
            extra = []
            if sp.get("adcc"):
                extra.append("%d ADCC %s" % (sp["adcc"], _plural(sp["adcc"], "gold", "golds")))
            if sp.get("pans"):
                extra.append("%d Pan American %s" % (sp["pans"], _plural(sp["pans"], "gold", "golds")))
            if sp.get("worlds"):
                extra.append("%d World %s" % (sp["worlds"], _plural(sp["worlds"], "title", "titles")))
            if extra:
                blurb += " That includes " + ", ".join(extra) + "."
        stats = ('<span class="athlete-card__stat"><strong>%d-%d</strong> record</span>\n'
                 '                <span class="athlete-card__stat"><strong>%d%%</strong> win rate</span>'
                 % (w, l, win_rate(w, l)))
        if a["golds"] is not None:
            stats += ('\n                <span class="athlete-card__stat"><strong>%s</strong> career golds</span>'
                      % n(a["golds"]))
        link = a["url"] or ACADEMY_URL
        ig_html = ""
        if a["ig"]:
            ig_html = ('<a href="%s" target="_blank" rel="noopener noreferrer" class="athlete-card__ig" '
                       'aria-label="%s on Instagram"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" '
                       'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
                       '<rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>'
                       '<line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg></a>' % (a["ig"], html.escape(name)))
        out.append(
            '<div class="athlete-card" data-athlete="%(slug)s">\n'
            '              <p class="athlete-card__tier">#%(i)d on the team &middot; %(wins)s career wins</p>\n'
            '              <h4 class="athlete-card__name">%(name)s</h4>\n'
            '              <div class="athlete-card__stats">\n'
            '                %(stats)s\n'
            '              </div>\n'
            '              <button type="button" class="athlete-card__chevron" aria-expanded="false" aria-controls="athlete-%(slug)s" '
            'aria-label="More about %(name)s">&#9662;</button>\n'
            '              <div class="athlete-card__expand" id="athlete-%(slug)s" inert>\n'
            '                <p>%(blurb)s</p>\n'
            '                <div class="athlete-card__links">\n'
            '                  <a href="%(link)s" target="_blank" rel="noopener noreferrer" class="athlete-card__link">See Full Stats &rarr;</a>\n'
            '                  %(ig)s\n'
            '                </div>\n'
            '              </div>\n'
            '            </div>' % {
                "slug": slug, "i": i, "wins": n(w), "name": html.escape(name),
                "stats": stats, "blurb": blurb, "link": link, "ig": ig_html})
    return "\n            ".join(out)


def rivals_line():
    """'a 25-17 record against Pablo Silva BJJ, #1 in Texas, and 11-5 against ...'"""
    (a, ar, aw, al), (b, br, bw, bl) = RIVALS
    return ("a %d&ndash;%d record against %s, #%d in Texas, and %d&ndash;%d against %s, #%d"
            % (aw, al, a, ar, bw, bl, b, br))
