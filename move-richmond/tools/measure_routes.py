#!/usr/bin/env python3
"""Measure the drives the area pages quote, and write routes.json and routes_both.json.

    python3 move-richmond/tools/measure_routes.py              measure with the coordinates in move.json and compare with the committed files (changes nothing)
    python3 move-richmond/tools/measure_routes.py --write      measure and replace routes.json and routes_both.json

When to run it: if the entrance of 10330 Hidden Lake Ln turns out to be more than about a quarter of a mile from the street-range point in move.json
(replace new.lat and new.lng with the door's own coordinates first), or if a road has been built or closed. The area pages round to whole miles, so a small
shift changes nothing; a big one is a sentence to check (areas_data.py, blog_neighborhoods.html).

How it measures: driving routes from the public OSRM server on OpenStreetMap data (router.project-osrm.org), free-flow, so the minutes are with no traffic.
Origins are the coordinates in places.json (geocoded once with Nominatim: a town, a community or a landmark in it). Be polite: one request at a time.
"""
import argparse
import json
import sys
import time
import urllib.request
from pathlib import Path

KIT = Path(__file__).resolve().parent.parent
UA = {"User-Agent": "labyrinth-move-planning/1.0 (info@labyrinth.vision)"}

# routes.json name -> places.json key (None: the old academy, from move.json)
ORIGINS = {
    "Cross Creek Ranch (the current academy)": None,
    "Fulshear (town centre)": "Fulshear, Texas",
    "Cross Creek West": "Cross Creek West, Fulshear, Texas",
    "Tamarron": "Tamarron, Texas",
    "Churchill Farms": "Churchill Farms, Fulshear, Texas",
    "Fulshear Lakes": "Fulshear Lakes, Texas",
    "Jordan Ranch": "Jordan Ranch, Texas",
    "Brookshire": "Brookshire, Texas",
    "Simonton": "Simonton, Texas",
    "Richmond (centre)": "Richmond, Texas",
    "Rosenberg": "Rosenberg, Texas",
    "Sealy": "Sealy, Texas",
    "Katy (centre)": "Katy, Texas",
    "Cinco Ranch": "Cinco Ranch, Katy, Texas",
    "Sugar Land": "Sugar Land, Texas",
    "Harvest Green": "Harvest Green, Richmond, Texas",
    "Aliana": "Aliana, Richmond, Texas",
}
BOTH_NAME = {"Cross Creek Ranch (the current academy)": "Cross Creek Ranch (old academy)"}
BOTH_KEEP = ["Cross Creek Ranch (the current academy)", "Fulshear (town centre)", "Tamarron", "Churchill Farms", "Jordan Ranch", "Cinco Ranch", "Katy (centre)", "Brookshire",
             "Simonton", "Rosenberg", "Richmond (centre)", "Sealy", "Fulshear Lakes", "Cross Creek West"]


def route(frm, to, steps=False):
    u = "https://router.project-osrm.org/route/v1/driving/%f,%f;%f,%f?overview=false&steps=%s" % (frm[1], frm[0], to[1], to[0], "true" if steps else "false")
    last = None
    for _ in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=40) as r:
                d = json.load(r)
            if d.get("code") == "Ok":
                return d["routes"][0]
            last = d.get("code")
        except Exception as e:  # noqa: BLE001
            last = str(e)
        time.sleep(4)
    sys.exit("OSRM would not route %s -> %s: %s" % (frm, to, last))


def roads_of(r):
    out = []
    for s in r["legs"][0]["steps"]:
        label = (s.get("name") or "") or (s.get("ref") or "")
        if s["distance"] < 250 or not label:
            continue
        if out and out[-1][0] == label:
            out[-1][1] += s["distance"]
        else:
            out.append([label, s["distance"]])
    return [(a, round(b / 1609.344, 1)) for a, b in out]


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--write", action="store_true")
    a = ap.parse_args()
    cfg = json.loads((KIT / "move.json").read_text(encoding="utf-8"))
    places = json.loads((KIT / "places.json").read_text(encoding="utf-8"))
    new, katy, old = (cfg["new"]["lat"], cfg["new"]["lng"]), (cfg["katy"]["lat"], cfg["katy"]["lng"]), (cfg["old"]["lat"], cfg["old"]["lng"])
    routes, both = {}, {"_note": "Road miles and minutes with no traffic (OSRM on OpenStreetMap data, measured %s) from each place to the new academy (richmond: %s, %.6f,%.6f) and to the Katy academy (katy: %s, %.6f,%.6f). [miles, minutes]. If the entrance pin moves by more than a quarter mile, measure again (tools/measure_routes.py)." % (
        time.strftime("%Y-%m-%d"), cfg["new"]["street"], new[0], new[1], cfg["katy"]["street"], katy[0], katy[1])}
    for name, key in ORIGINS.items():
        here = old if key is None else tuple(places[key][:2])
        r = route(here, new, steps=True)
        routes[name] = dict(miles=round(r["distance"] / 1609.344, 1), minutes=round(r["duration"] / 60), roads=roads_of(r))
        time.sleep(0.8)
        if name in BOTH_KEEP:
            k = route(here, katy)
            both[BOTH_NAME.get(name, name)] = {"richmond": [routes[name]["miles"], routes[name]["minutes"]], "katy": [round(k["distance"] / 1609.344, 1), round(k["duration"] / 60)]}
            time.sleep(0.8)
        print("%-42s %5.1f mi %3d min" % (name, routes[name]["miles"], routes[name]["minutes"]))
    committed = json.loads((KIT / "routes_both.json").read_text(encoding="utf-8"))
    moved = []
    for k, v in both.items():
        if k.startswith("_") or k not in committed:
            continue
        for side in ("richmond", "katy"):
            if abs(v[side][0] - committed[k][side][0]) >= 0.5:
                moved.append("%s to %s: %.1f mi measured now, %.1f in the committed file" % (k, side, v[side][0], committed[k][side][0]))
    print("\n%s" % ("Every distance is within half a mile of the committed one." if not moved else "These moved by half a mile or more (read the sentences that quote them):\n  " + "\n  ".join(moved)))
    if a.write:
        (KIT / "routes.json").write_text(json.dumps(routes, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
        (KIT / "routes_both.json").write_text(json.dumps(both, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
        print("routes.json and routes_both.json written")


if __name__ == "__main__":
    main()
