#!/usr/bin/env python3
"""The week, as one component, on every page that shows it.

The timetable used to be drawn by hand four times on the front page (a desktop
table hidden with display:none but still parsed by schedule-check.mjs, a set of
day cards, and two drawers of Gi and No-Gi bars) and a fifth time on /schedule.
Moving a class meant finding all five. This file draws it once, from
schedule_data.CLASSES, and build_pages.py puts the result on /schedule and
splices it into index.html between SCHEDULE markers.

What it has to do for a visitor, in order of how often they need it:

  1. Say who a class is for. Almost nobody wants the whole week; they want the
     adult classes or their child's. So the first control is a filter, and a
     day with nothing left in it collapses instead of showing an empty column.
  2. Be readable at a glance. One colored edge per class (Gi, No-Gi, or
     neither), and words for everything else. The old key had eight swatches
     and asked people to decode Competition red from Advanced orange.
  3. Book the class they are looking at. The whole card is the button. A kids
     class a new child cannot trial into says so and opens the classes they
     can, rather than a form that would book them into the wrong room.

Without JavaScript the full week is still here, stacked by day, and every class
is still a real button in the HTML for search engines and screen readers.
schedule.js adds the filter, the phone day-picker and "today".
"""
import html

import schedule_data

SHORT = {"Monday": "Mon", "Tuesday": "Tue", "Wednesday": "Wed", "Thursday": "Thu",
         "Friday": "Fri", "Saturday": "Sat", "Sunday": "Sun"}


def _has_age_range(ages):
    """'7–12' is an age range that belongs in the booking name; 'all ages' and
    'all levels' are descriptions, and "Strength & Conditioning (all ages)"
    matches nothing in booking.js, so it would be filed under the default."""
    return any(ch.isdigit() for ch in ages)


def _booking(name, ages, aud, flags):
    """How a card books, and the name booking.js knows the class by.

    'form'   straight to the booking form for this class.
    'kids'   the kids trial picker: a regular or advanced kids class that a
             brand-new child does not trial into. booking.js only offers kids
             trials in the classes flagged "trial", and a card that opened a
             form for any other would book a child into the wrong room.

    Youth Wrestling books directly even though it is not a kids "trial" class:
    it is its own program with its own CRM pipeline, and the day cards this
    replaced booked it directly too.
    """
    book_name = "%s (%s)" % (name, ages) if ages and _has_age_range(ages) else name
    if aud in ("adult", "all") or "trial" in flags or name == "Youth Wrestling":
        return "form", book_name
    return "kids", book_name


def _card(day, time, name, ages, style, aud, flags):
    mode, book_name = _booking(name, ages, aud, flags)
    tone = {"Gi": "gi", "No-Gi": "nogi"}.get(style, "other")
    tags = []
    if "comp" in flags:
        tags.append('<span class="sc__tag sc__tag--comp">Competition</span>')
    if "adv" in flags:
        tags.append('<span class="sc__tag sc__tag--adv">Advanced</span>')
    if aud == "kids" and "trial" in flags:
        tags.append('<span class="sc__tag sc__tag--trial">Free trial</span>')
    if mode == "kids":
        # Why tapping this one opens something else, before they tap it.
        tags.append('<span class="sc__hint">Trials: Fri &amp; Sat</span>')
    age_html = ('<span class="sc__ages">%s</span>' % html.escape(ages)) if ages else ""
    label = "%s, %s at %s%s" % (
        name, day, time, (", ages " + ages) if ages and _has_age_range(ages) else "")
    return (
        '<li><button type="button" class="sc__class sc__class--%(tone)s"'
        ' data-aud="%(aud)s" data-book="%(mode)s" data-name="%(bname)s" data-type="%(style)s"'
        ' data-day="%(short)s" data-time="%(time)s" aria-label="%(label)s">'
        # Gi / No-Gi in words beside the time, not as a chip on its own row:
        # the colored edge already says it to most people, and the words are
        # for everybody the color does not reach.
        '<span class="sc__time">%(time)s%(style_html)s</span>'
        '<span class="sc__name">%(name)s%(ages)s</span>'
        '<span class="sc__tags">%(tags)s</span>'
        '</button></li>'
    ) % {
        "tone": tone, "aud": aud, "mode": mode, "bname": html.escape(book_name, quote=True),
        "style": html.escape(style, quote=True), "short": SHORT[day], "time": time,
        "style_html": ('<span class="sc__style">%s</span>' % style) if style else "",
        "label": html.escape("Book " + label, quote=True), "name": html.escape(name),
        "ages": age_html, "tags": "".join(tags),
    }


def render(uid="sc"):
    """The component. `uid` keeps ids unique if a page ever carries two."""
    cols = []
    for day in schedule_data.DAYS:
        cards = "\n          ".join(_card(*c) for c in schedule_data.for_day(day))
        cols.append(
            '      <section class="sc__col" data-sc-col="%(s)s" aria-labelledby="%(u)s-%(s)s">\n'
            '        <h3 class="sc__day" id="%(u)s-%(s)s"><span class="sc__day-full">%(d)s</span>'
            '<span class="sc__day-short" aria-hidden="true">%(s)s</span>'
            '<span class="sc__today" hidden>Today</span></h3>\n'
            '        <ul class="sc__list">\n          %(cards)s\n        </ul>\n'
            '      </section>' % {"u": uid, "s": SHORT[day], "d": day, "cards": cards})

    day_buttons = "".join(
        '<button type="button" class="sc__pick" data-sc-pick="%s" aria-pressed="false">%s</button>'
        % (SHORT[d], SHORT[d]) for d in schedule_data.DAYS)

    return """<div class="sc" data-sc>
    <div class="sc__bar">
      <div class="sc__filters" role="group" aria-label="Show classes for">
        <button type="button" class="sc__filter is-active" data-sc-filter="all" aria-pressed="true">All classes</button>
        <button type="button" class="sc__filter" data-sc-filter="adult" aria-pressed="false">Adults</button>
        <button type="button" class="sc__filter" data-sc-filter="kids" aria-pressed="false">Kids &amp; Teens</button>
      </div>
      <ul class="sc__legend" aria-label="Key">
        <li><span class="sc__swatch sc__swatch--gi"></span>Gi</li>
        <li><span class="sc__swatch sc__swatch--nogi"></span>No-Gi</li>
        <li><span class="sc__swatch sc__swatch--other"></span>MMA, wrestling &amp; more</li>
      </ul>
    </div>
    <div class="sc__picker" role="group" aria-label="Choose a day" hidden>%(days)s</div>
    <p class="sc__kids-note" hidden><strong>Kids trials</strong> are on Friday afternoons in the Gi (ages 3 and up) and Saturday mornings: Youth MMA at 9:00 or No-Gi grappling at 10:00 (ages 7 and up).</p>
    <div class="sc__week">
%(cols)s
    </div>
    <p class="sc__foot">Tap any class to book it. The first class is free. <strong>Advanced</strong> classes need a gray-white belt or higher, or two years of wrestling; everything else is open to beginners. Closures and tournament weekends are on the <a href="https://calendar.labyrinth.vision" target="_blank" rel="noopener noreferrer">live calendar</a>.</p>
  </div>""" % {"days": day_buttons, "cols": "\n".join(cols)}



# ── The Gi / No-Gi drawers on the front page's class-type cards ─────────────
#
# Four more hand-kept copies of the week lived here, and they had already
# drifted: the Kids & Teens No-Gi card said "6 Classes/Week" over a drawer of
# seven. These rows keep the exact markup app.js reads (extractFromSchedBar,
# the ADV badge that opens the belt-requirement modal, the trial badge that
# opens the kids trial list), so no behavior changes except that every kids
# class a new child cannot trial into is now marked the same way.

DRAWERS = {
    "ADULT-GI": ("adult", "Gi"), "ADULT-NOGI": ("adult", "No-Gi"),
    "KIDS-GI": ("kids", "Gi"), "KIDS-NOGI": ("kids", "No-Gi"),
}


def drawer_classes(key):
    aud, style = DRAWERS[key]
    return [c for c in schedule_data.CLASSES if c[5] == aud and c[4] == style]


def drawer_rows(key):
    tone = "gi" if DRAWERS[key][1] == "Gi" else "nogi"
    out = []
    for day, time, name, ages, style, aud, flags in drawer_classes(key):
        mode, _ = _booking(name, ages, aud, flags)
        ages_html = ('<span class="type-sched-bar__ages">(%s)</span>' % ages) if ages else ""
        adv = '<span class="type-sched-bar__badge-adv">ADV</span>' if "adv" in flags else ""
        action = ('<a data-book-trial href="/#book" class="type-sched-bar__book">Book Trial</a>'
                  if mode == "form" else
                  '<span class="type-sched-bar__trial-badge">Trials Fri &amp; Sat</span>')
        out.append('<div class="type-sched-bar type-sched-bar--%s"><span class="type-sched-bar__day">%s</span>'
                   '<span class="type-sched-bar__time">%s</span><span class="type-sched-bar__name">%s%s</span>%s%s</div>'
                   % (tone, SHORT[day], time, html.escape(name), ages_html, adv, action))
    return "\n          ".join(out)


if __name__ == "__main__":
    print(render())
