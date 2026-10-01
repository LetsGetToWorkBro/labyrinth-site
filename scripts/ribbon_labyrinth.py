#!/usr/bin/env python3
"""The pink ribbon labyrinth: the awareness ribbon drawn as a maze.

Labyrinth's mark is a circular maze in bold wall lines. This is the same idea
in the shape of the breast cancer awareness ribbon: a real maze, bounded by the
ribbon's outline, with a gap at the foot of one tail and another at the top of
the loop. The route between the two gaps is the way through, drawn in a lighter
pink.

Deterministic. The seed is October 21 (the event), so the same file comes out
every time and a rebuild never changes the artwork. Run it by hand when the
design changes:

    python3 scripts/ribbon_labyrinth.py

It writes assets/ribbon-labyrinth.svg. The pink is baked in (#E58FB5, the site's
awareness pink) so the file works as an ordinary <img>, which cannot inherit a
color from the page; the route is a lighter blush.
"""
import math
import os
import random

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets", "ribbon-labyrinth.svg")

SEED = 1021
S = 30            # px per unit of the ribbon's 24-unit drawing
HALF = 2.35       # half the band width, in units
CELL = 15         # maze cell, px
WALL = 4.0         # wall thickness, px

# The ribbon's centerline, in the same 24-unit space the site's ribbon icon uses.
LOOP = [
    ((12, 14), (8, 11), (7.5, 9), (7.5, 6.8)),
    ((7.5, 6.8), (7.5, 4.6), (9.5, 3), (12, 3)),
    ((12, 3), (14.5, 3), (16.5, 4.6), (16.5, 6.8)),
    ((16.5, 6.8), (16.5, 9), (16, 11), (12, 14)),
]
TAILS = [((12, 14), (8, 21)), ((12, 14), (16, 21))]


def bezier(p0, p1, p2, p3, n=60):
    out = []
    for i in range(n + 1):
        t = i / n
        u = 1 - t
        out.append((u**3 * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t**3 * p3[0],
                    u**3 * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t**3 * p3[1]))
    return out


def centerline():
    pts = []
    for seg in LOOP:
        pts += bezier(*seg)
    for a, b in TAILS:
        pts += [(a[0] + (b[0] - a[0]) * i / 40, a[1] + (b[1] - a[1]) * i / 40) for i in range(41)]
    return pts


def build():
    line = centerline()
    xs = [p[0] for p in line]
    ys = [p[1] for p in line]
    x0, y0 = min(xs) - HALF, min(ys) - HALF
    W = math.ceil((max(xs) + HALF - x0) * S)
    H = math.ceil((max(ys) + HALF - y0) * S)
    pad = WALL
    cols, rows = int((W - 2 * pad) // CELL), int((H - 2 * pad) // CELL)
    ox, oy = (W - cols * CELL) / 2, (H - rows * CELL) / 2

    def inside(c, r):
        # A cell is part of the ribbon if its centre is within the band.
        px = x0 + (ox + c * CELL + CELL / 2) / S
        py = y0 + (oy + r * CELL + CELL / 2) / S
        return min((px - a) ** 2 + (py - b) ** 2 for a, b in line) <= (HALF - 0.12) ** 2

    cells = {(c, r) for r in range(rows) for c in range(cols) if inside(c, r)}

    # Keep the largest connected piece so there is one maze, not several.
    def neighbors(cell):
        c, r = cell
        return [n for n in ((c + 1, r), (c - 1, r), (c, r + 1), (c, r - 1)) if n in cells]
    seen, best = set(), set()
    for start in cells:
        if start in seen:
            continue
        comp, stack = {start}, [start]
        while stack:
            for n in neighbors(stack.pop()):
                if n not in comp:
                    comp.add(n)
                    stack.append(n)
        seen |= comp
        if len(comp) > len(best):
            best = comp
    cells = best

    # The foot of the left tail is the way in; the top of the loop is the way out.
    entry = max((c for c in cells if c[0] < cols / 2), key=lambda c: (c[1], -c[0]))
    exit_ = min(cells, key=lambda c: (c[1], abs(c[0] - cols / 2)))

    # Recursive backtracker: long winding corridors, which is what a labyrinth is.
    rng = random.Random(SEED)
    parent, open_edges = {entry: None}, set()
    stack = [entry]
    while stack:
        cur = stack[-1]
        free = [n for n in neighbors(cur) if n not in parent]
        if not free:
            stack.pop()
            continue
        nxt = rng.choice(free)
        parent[nxt] = cur
        open_edges.add(frozenset((cur, nxt)))
        stack.append(nxt)

    # The way through: from the exit back to the entry.
    route, cur = [], exit_
    while cur is not None:
        route.append(cur)
        cur = parent[cur]
    route.reverse()

    # Walls: every side of a cell that is not an open passage. The outline of
    # the ribbon falls out of this for free (a side with no neighbor is a wall),
    # and the entry and exit are the two sides left open.
    segs = set()
    def side(c, r, d):
        x, y = c, r
        return {"N": ((x, y), (x + 1, y)), "S": ((x, y + 1), (x + 1, y + 1)),
                "W": ((x, y), (x, y + 1)), "E": ((x + 1, y), (x + 1, y + 1))}[d]
    for (c, r) in cells:
        for d, (dc, dr) in {"N": (0, -1), "S": (0, 1), "W": (-1, 0), "E": (1, 0)}.items():
            n = (c + dc, r + dr)
            if n in cells and frozenset(((c, r), n)) in open_edges:
                continue
            if (c, r) == entry and d == "S":
                continue
            if (c, r) == exit_ and d == "N":
                continue
            segs.add(side(c, r, d))

    # Merge collinear unit segments into long lines: a smaller file, and
    # cleaner joins.
    horiz, vert = {}, {}
    for (a, b) in segs:
        if a[1] == b[1]:
            horiz.setdefault(a[1], []).append(a[0])
        else:
            vert.setdefault(a[0], []).append(a[1])
    d = []
    def runs(vals):
        vals = sorted(vals)
        start = prev = vals[0]
        for v in vals[1:]:
            if v != prev + 1:
                yield start, prev + 1
                start = v
            prev = v
        yield start, prev + 1
    px = lambda v, o: round(o + v * CELL, 1)
    for y, xs_ in sorted(horiz.items()):
        for a, b in runs(xs_):
            d.append("M%s %sH%s" % (px(a, ox), px(y, oy), px(b, ox)))
    for x, ys_ in sorted(vert.items()):
        for a, b in runs(ys_):
            d.append("M%s %sV%s" % (px(x, ox), px(a, oy), px(b, oy)))
    walls = "".join(d)

    centre = lambda cell: (round(ox + cell[0] * CELL + CELL / 2, 1), round(oy + cell[1] * CELL + CELL / 2, 1))
    pts = [centre(c) for c in route]
    # The way through leaves the maze through both gaps.
    pts = [(pts[0][0], pts[0][1] + CELL / 2 + WALL)] + pts + [(pts[-1][0], pts[-1][1] - CELL / 2 - WALL)]
    way = "M" + "L".join("%s %s" % p for p in pts)

    return W, H, walls, way, len(cells), len(route)


def main():
    W, H, walls, way, ncells, nroute = build()
    svg = (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" width="%d" height="%d" '
        'role="img" aria-label="A pink ribbon drawn as a labyrinth">\n'
        '  <title>Pink ribbon labyrinth</title>\n'
        '  <path d="%s" fill="none" stroke="#FBD3E3" stroke-width="%s" stroke-linecap="round" '
        'stroke-linejoin="round" stroke-dasharray="1 %s" opacity=".9"/>\n'
        '  <path d="%s" fill="none" stroke="#E58FB5" stroke-width="%s" stroke-linecap="square" '
        'stroke-linejoin="miter"/>\n'
        '</svg>\n'
    ) % (W, H, W, H, way, round(CELL * 0.26, 1), round(CELL * 0.62, 1), walls, WALL)
    with open(OUT, "w", encoding="utf-8") as fh:
        fh.write(svg)
    print("wrote %s: %dx%d, %d cells, route of %d, %.1f KB" % (os.path.relpath(OUT, ROOT), W, H, ncells, nroute, len(svg) / 1024))


if __name__ == "__main__":
    main()
