#!/usr/bin/env python3
"""Cut the photographs behind the home page's "This month at Labyrinth" cards (assets/strip-<card>.jpg and .webp).

    python3 scripts/strip_photos.py                       cut every picture whose source is in the repo
    python3 scripts/strip_photos.py --event PATH.jpg      also cut the seminar card's picture from the photographer's original

Needs Pillow (pip install pillow). The pictures are checked in; this file is how they were made and how to make them again with a
different crop. After cutting, set STRIP_PHOTOS in scripts/build_pages.py to the sizes printed here (site-test checks that they match
the files), then run scripts/build_pages.py and scripts/stamp_assets.py.

Each card is a real photograph of the people who train here, cut for the shape the card shows it in (see .event-strip__photo in
style.css): one wide picture for the two full-width cards, and a roomier one for the three small cards, where it is the top of the card
on a desktop and the right side of it on a phone. Which part stays in view when the card is a different shape from the picture is the
card's --focus in style.css (object-position), not a second crop.

    donate  strength-conditioning.jpg  the adults at the back of the all-ages class, flexing, and the children's heads below them
    jjwl    kids-nogi.jpg              two of our girls at a tournament, as it was shot (720 px wide, never enlarged)
    pink    gallery-4.jpg              a girl in her black gi, flexing, as it was shot
    event   the photographer's original of two of our women training (RFH 19 in Ray Harkness's album), mirrored so that the laughing
            face is on the right, where the card shows the picture
    hyrox   home-youth-bjj.jpg         a girl carrying a boy across the mat, which is what the kids' fitness race is made of
    today   community-real.jpg         the team and families after a tournament (the one-day holiday card; it is hidden the rest of the year)
"""
import argparse
import os
import sys

try:
    from PIL import Image, ImageFilter, ImageOps
except ImportError:
    sys.exit("This needs Pillow: pip install pillow")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, "assets")

# card: (source file, crop box (left, top, right, bottom) in the source's own pixels, width to save at, mirror it?, jpg quality, webp quality)
CARDS = {
    "donate": ("strength-conditioning.jpg", (0, 20, 1200, 460), 1200, False, 74, 72),
    "jjwl": ("kids-nogi.jpg", (0, 0, 720, 480), 720, False, 74, 72),
    "pink": ("gallery-4.jpg", (0, 0, 800, 533), 800, False, 74, 72),
    "event": (None, (250, 120, 2048, 1170), 1000, True, 74, 72),
    "hyrox": ("home-youth-bjj.jpg", (100, 40, 1100, 700), 900, False, 74, 72),
    "today": ("community-real.jpg", (0, 0, 800, 600), 640, False, 64, 60),
}


def cut(key, source):
    _, box, width, mirror, jq, wq = CARDS[key]
    im = Image.open(source).convert("RGB").crop(box)
    if mirror:
        im = ImageOps.mirror(im)
    if width < im.width:
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
        im = im.filter(ImageFilter.UnsharpMask(radius=0.8, percent=40, threshold=2))
    jpg, webp = os.path.join(ASSETS, "strip-%s.jpg" % key), os.path.join(ASSETS, "strip-%s.webp" % key)
    im.save(jpg, quality=jq, optimize=True, progressive=True)
    im.save(webp, quality=wq, method=6)
    print("strip-%s: %dx%d   jpg %d KB   webp %d KB" % (key, im.width, im.height, os.path.getsize(jpg) // 1024, os.path.getsize(webp) // 1024))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--event", help="the photographer's original for the seminar card (RFH 19, 2048 x 1365)")
    a = ap.parse_args()
    for key, (name, *_rest) in CARDS.items():
        if key == "event":
            if a.event:
                cut(key, a.event)
            else:
                print("strip-event: left as it is (pass --event PATH to cut it again)")
        else:
            cut(key, os.path.join(ASSETS, name))


if __name__ == "__main__":
    main()
