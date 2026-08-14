#!/usr/bin/env python3
"""The timetable and the price list, in one place.

Before this file the week was written out in three places, the schedule markup
in index.html, the class arrays in booking.js, and the per-program week tables
in build_programs.py, and a schedule page would have made a fourth. Three
copies of one fact is three chances to be wrong, and it had already gone wrong
once: the copy that said kids trials were Friday-only disagreed with the button
sitting next to it.

Everything generated now reads from here. index.html and booking.js are still
their own copies (one is hand-written markup, the other is the browser's), so
tools/… no, so site-test compares this file against booking.js on every run
and fails if they drift. That is the guard; this file is the source.

CLASSES is the week as the academy runs it. Each entry:

    (day, time, name, ages, style, audience, flags)

    style     "Gi" | "No-Gi" | ""        as shown on the timetable
    audience  "adult" | "kids" | "all"   who the class is for
    flags     set of markers: "adv"   needs a grey-white belt or 2 yrs wrestling
                              "comp"  competition class
                              "trial" a class a brand-new child may book into
"""

DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

# Sorted within each day by the order they run.
CLASSES = [
    # ── Monday ──
    ("Monday", "6:30 AM", "Adult BJJ", "", "Gi", "adult", set()),
    ("Monday", "11:00 AM", "Adult BJJ", "", "Gi", "adult", set()),
    ("Monday", "4:45 PM", "Kids BJJ", "3–6", "Gi", "kids", set()),
    ("Monday", "5:15 PM", "Kids BJJ", "7–12", "Gi", "kids", set()),
    ("Monday", "6:30 PM", "Adult BJJ", "", "Gi", "adult", set()),
    # ── Tuesday ──
    ("Tuesday", "6:30 AM", "Adult BJJ", "", "No-Gi", "adult", set()),
    ("Tuesday", "4:15 PM", "Strength & Conditioning", "all ages", "", "all", set()),
    ("Tuesday", "5:15 PM", "Kids Grappling", "7–12", "No-Gi", "kids", {"adv"}),
    ("Tuesday", "5:15 PM", "Teens Grappling", "12–15", "No-Gi", "kids", {"adv"}),
    ("Tuesday", "6:30 PM", "Adult BJJ", "", "No-Gi", "adult", set()),
    # ── Wednesday ──
    ("Wednesday", "6:30 AM", "Adult BJJ", "", "Gi", "adult", set()),
    ("Wednesday", "11:00 AM", "Adult BJJ", "", "No-Gi", "adult", set()),
    ("Wednesday", "4:45 PM", "Kids BJJ", "3–6", "Gi", "kids", set()),
    ("Wednesday", "5:15 PM", "Kids BJJ", "7–12", "Gi", "kids", set()),
    ("Wednesday", "6:30 PM", "Adult BJJ", "", "Gi", "adult", set()),
    ("Wednesday", "7:30 PM", "Youth Wrestling", "7–17", "", "kids", set()),
    # ── Thursday ──
    ("Thursday", "6:30 AM", "Adult BJJ", "", "No-Gi", "adult", set()),
    ("Thursday", "4:15 PM", "Strength & Conditioning", "all ages", "", "all", set()),
    ("Thursday", "5:15 PM", "Kids Grappling", "7–12", "No-Gi", "kids", {"adv"}),
    ("Thursday", "5:15 PM", "Teens Grappling", "12–15", "No-Gi", "kids", {"adv"}),
    ("Thursday", "6:30 PM", "Adult BJJ", "", "No-Gi", "adult", set()),
    ("Thursday", "7:30 PM", "Youth Wrestling", "7–17", "", "kids", set()),
    # ── Friday ──
    ("Friday", "11:00 AM", "Adult BJJ", "", "Gi", "adult", set()),
    ("Friday", "4:45 PM", "Kids BJJ", "3–6", "Gi", "kids", {"trial"}),
    ("Friday", "5:15 PM", "Kids BJJ Comp", "7–12", "Gi", "kids", {"comp", "trial"}),
    ("Friday", "5:15 PM", "Teens BJJ Comp", "12–15", "Gi", "kids", {"comp", "trial"}),
    ("Friday", "6:30 PM", "Adult Comp", "", "Gi", "adult", {"comp"}),
    # ── Saturday ──
    ("Saturday", "9:00 AM", "Adult Comp", "", "No-Gi", "adult", {"comp"}),
    ("Saturday", "10:00 AM", "Kids Grappling", "7–12", "No-Gi", "kids", {"trial"}),
    ("Saturday", "11:00 AM", "Adult & Teens", "", "No-Gi", "adult", set()),
    ("Saturday", "12:00 PM", "Kids Grappling", "7–12", "No-Gi", "kids", {"adv"}),
    ("Saturday", "12:00 PM", "Teens Grappling", "12–15", "No-Gi", "kids", {"adv"}),
    # ── Sunday ──
    ("Sunday", "10:30 AM", "Open Mat", "all levels", "", "all", set()),
    ("Sunday", "1:00 PM", "Youth Wrestling", "7–17", "", "kids", set()),
]

# What the front desk quotes. Every figure is on the front page's pricing grid.
PRICING = {
    "adult": [
        ("8 Classes", "$179", "/mo", ["8 classes per month", "Gi, No-Gi and competition classes",
                                      "Open mat access", "Month-to-month"], False),
        ("12 Classes", "$189", "/mo", ["12 classes per month", "Gi, No-Gi and competition classes",
                                       "Open mat access", "Month-to-month"], False),
        ("Unlimited", "$199", "/mo", ["Unlimited classes", "All BJJ classes, Gi and No-Gi",
                                      "Competition training", "Open mat access", "Month-to-month"], True),
    ],
    "kids": [
        ("8 Classes", "$239", "/mo", ["8 classes per month", "Age-appropriate training groups",
                                      "Youth wrestling included", "Belt progression tracking",
                                      "Month-to-month"], False),
        ("Unlimited", "$249", "/mo", ["Unlimited classes", "All kids and teens BJJ classes",
                                      "Youth wrestling included", "Competition classes",
                                      "Belt progression tracking", "Month-to-month"], True),
    ],
    "family": [
        ("Family Plan", "$399", "/mo", ["Unlimited classes for 2 members",
                                        "+$80/mo per additional member",
                                        "Kids and adult classes", "Month-to-month"], True),
    ],
    "extras": [
        ("5-Class Punch Card", "$160", "", "Adults only. Never expires."),
        ("3-Class Punch Card", "$100", "", "Adults only. Never expires."),
        ("Sauna, Cold Plunge & Gym", "$60", "/mo", "Nearly 24/7 access with smart scheduling."),
        ("Private Lessons", "$60–$120", "/hr", "One-to-one with an instructor."),
        ("Summer Camp", "$60", "/day", "Ages 5–15, 12:00–4:00 PM. Next running summer 2027."),
    ],
    "note": ("All memberships are month-to-month with no long-term contract. "
             "30 days notice to cancel. Ask about 6 and 12-month paid-in-full discounts. "
             "Your first class is free."),
}


def for_day(day):
    return [c for c in CLASSES if c[0] == day]


def for_audience(aud):
    """Classes a given audience can attend. 'all' classes count for everybody."""
    return [c for c in CLASSES if c[5] == aud or c[5] == "all"]


def week_for(names, require=None):
    """The ((day, [(time, label, style-flags)]), …) shape the program pages want.

    Filters by class name so a program page shows only its own classes rather
    than the whole timetable with its own lines highlighted.

    `require` narrows further to classes carrying at least one of the given
    flags. The competition page needs it: "Kids Grappling" runs on Saturday at
    10:00 as an ordinary open class and at noon as an advanced one, and only the
    second belongs on a page about the competition team.
    """
    out = []
    for day in DAYS:
        rows = []
        for _, time, name, ages, style, _aud, flags in for_day(day):
            if name not in names:
                continue
            if require and not (flags & set(require)):
                continue
            kinds = []
            if style == "Gi":
                kinds.append("gi")
            elif style == "No-Gi":
                kinds.append("nogi")
            if "adv" in flags:
                kinds.append("adv")
            label = "%s (%s)" % (name, ages) if ages else name
            rows.append((time, label, " ".join(kinds)))
        if rows:
            out.append((day, rows))
    return out


def counts():
    """Totals used in copy, so a sentence saying 'seventeen a week' cannot go
    stale when the timetable changes."""
    return {
        "total": len(CLASSES),
        "adult": len([c for c in CLASSES if c[5] in ("adult", "all")]),
        "kids": len([c for c in CLASSES if c[5] in ("kids", "all")]),
        "days": len({c[0] for c in CLASSES}),
    }


if __name__ == "__main__":
    c = counts()
    print("%d classes across %d days. %d open to adults, %d to kids"
          % (c["total"], c["days"], c["adult"], c["kids"]))
    for day in DAYS:
        print("\n%s" % day)
        for _, time, name, ages, style, aud, flags in for_day(day):
            print("  %-9s %-26s %-10s %-6s %s"
                  % (time, name + ((" (%s)" % ages) if ages else ""), style or "-", aud,
                     " ".join(sorted(flags))))
