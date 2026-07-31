#!/usr/bin/env python3
"""Build the Labyrinth Round Timer asset catalogue from the gym's brand marks.

The marks live in the website's /assets folder as black-on-white artwork. The
timer runs on a near-black background, so every mark is keyed to alpha here and
shipped white — the app tints it (gold, bone, red) at draw time.

Run from the repo root:  python3 tvos/tools/make_assets.py
"""
import json
import math
import os
import shutil

from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(ROOT, "assets")
CATALOG = os.path.join(ROOT, "tvos", "LabyrinthTimer", "LabyrinthTimer", "Assets.xcassets")

INK = (10, 10, 10)
BONE = (240, 240, 240)
GOLD = (200, 162, 76)
GOLD_LIGHT = (232, 201, 107)


# ---------------------------------------------------------------- helpers
def key_to_alpha(img):
    """White background -> transparent, black artwork -> opaque white."""
    grey = img.convert("L")
    alpha = grey.point(lambda v: 255 - v)
    out = Image.new("RGBA", img.size, (255, 255, 255, 0))
    out.putalpha(alpha)
    white = Image.new("RGBA", img.size, (255, 255, 255, 255))
    white.putalpha(alpha)
    return white


def trim(img, pad=0):
    box = img.getbbox()
    if not box:
        return img
    l, t, r, b = box
    l, t = max(0, l - pad), max(0, t - pad)
    r, b = min(img.width, r + pad), min(img.height, b + pad)
    return img.crop((l, t, r, b))


def fit(img, w, h):
    """Scale to fit inside w x h, centred on a transparent canvas."""
    scale = min(w / img.width, h / img.height)
    resized = img.resize((max(1, round(img.width * scale)), max(1, round(img.height * scale))), Image.LANCZOS)
    canvas = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    canvas.paste(resized, ((w - resized.width) // 2, (h - resized.height) // 2), resized)
    return canvas


def tint(img, rgb):
    solid = Image.new("RGBA", img.size, rgb + (255,))
    solid.putalpha(img.getchannel("A"))
    return solid


def write(img, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path, "PNG", optimize=True)


def contents(payload, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as fh:
        json.dump(payload, fh, indent=2)
        fh.write("\n")


INFO = {"author": "xcode", "version": 1}


# ---------------------------------------------------------------- source marks
maze_src = trim(key_to_alpha(Image.open(os.path.join(SRC, "logo-maze.jpg")).convert("RGB")))


def rings_only(mark):
    """The roundel with the LABYRINTH lettering punched out of the middle.

    The full mark already says the name, so behind a wordmark it reads as
    mush. Everything inside 42% of the radius goes — that clears the type and
    leaves the innermost circle of the maze intact.
    """
    w, h = mark.size
    mask = Image.new("L", mark.size, 255)
    r = min(w, h) * 0.21
    ImageDraw.Draw(mask).ellipse([w / 2 - r, h / 2 - r, w / 2 + r, h / 2 + r], fill=0)
    mask = mask.filter(ImageFilter.GaussianBlur(min(w, h) / 220))
    out = mark.copy()
    out.putalpha(Image.composite(mark.getchannel("A"), Image.new("L", mark.size, 0), mask))
    return out


maze_rings = rings_only(maze_src)
kanji_full = Image.open(os.path.join(SRC, "logo-kanji-framed.jpg")).convert("RGB")
kanji_src = trim(key_to_alpha(kanji_full.crop((0, 0, kanji_full.width, 540))))
wordmark_src = trim(key_to_alpha(kanji_full.crop((0, 560, kanji_full.width, kanji_full.height))))


# ---------------------------------------------------------------- in-app imagesets
def imageset(name, img, sizes, template=True):
    """sizes: list of (scale, longest-edge). tvOS ships @1x and @2x."""
    folder = os.path.join(CATALOG, name + ".imageset")
    if os.path.isdir(folder):
        shutil.rmtree(folder)
    images = []
    for scale, edge in sizes:
        k = edge / max(img.width, img.height)
        scaled = img.resize((max(1, round(img.width * k)), max(1, round(img.height * k))), Image.LANCZOS)
        fname = "%s@%dx.png" % (name, scale)
        write(scaled, os.path.join(folder, fname))
        images.append({"filename": fname, "idiom": "universal", "scale": "%dx" % scale})
    payload = {"images": images, "info": INFO}
    if template:
        payload["properties"] = {"template-rendering-intent": "template"}
    contents(payload, os.path.join(folder, "Contents.json"))


imageset("MazeMark", maze_src, [(1, 512), (2, 1024)])
imageset("MazeRings", maze_rings, [(1, 640), (2, 1280)])
imageset("KanjiMark", kanji_src, [(1, 400), (2, 800)])
imageset("Wordmark", wordmark_src, [(1, 900), (2, 1800)])


# ---------------------------------------------------------------- icon furniture
def backdrop(w, h, seed=0.0):
    """The house backdrop: ink base, warm centre bloom, faint maze rings."""
    base = Image.new("RGB", (w, h), INK)
    px = base.load()
    cx, cy = w * 0.5, h * 0.46
    radius = math.hypot(w, h) * 0.62
    for y in range(h):
        for x in range(w):
            d = math.hypot(x - cx, y - cy) / radius
            fall = max(0.0, 1.0 - d) ** 2.2
            px[x, y] = (
                int(10 + 26 * fall),
                int(10 + 20 * fall),
                int(10 + 8 * fall),
            )
    rings = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(rings)
    step = max(w, h) * 0.085
    for i in range(1, 9):
        r = step * i * (1.0 + seed * 0.04)
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], outline=GOLD + (26,), width=max(1, int(w / 320)))
    rings = rings.filter(ImageFilter.GaussianBlur(max(w, h) / 900))
    base = base.convert("RGBA")
    base.alpha_composite(rings)
    return base


def glow(mark, rgb, size, blur, strength=0.55):
    g = tint(mark, rgb).filter(ImageFilter.GaussianBlur(blur))
    g.putalpha(g.getchannel("A").point(lambda v: int(v * strength)))
    canvas = Image.new("RGBA", size, (0, 0, 0, 0))
    canvas.alpha_composite(g)
    return canvas


def icon_layers(w, h):
    """Back / middle / front layers for the parallax app icon."""
    back = backdrop(w, h)

    middle = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    maze = fit(maze_rings, int(h * 1.02), int(h * 1.02))
    maze = tint(maze, GOLD)
    maze.putalpha(maze.getchannel("A").point(lambda v: int(v * 0.42)))
    middle.alpha_composite(maze, ((w - maze.width) // 2, int(h * 0.44) - maze.height // 2))

    front = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    kanji = fit(kanji_src, int(h * 0.46), int(h * 0.46))
    kx, ky = (w - kanji.width) // 2, int(h * 0.11)
    front.alpha_composite(glow(kanji, GOLD_LIGHT, kanji.size, max(2, h / 26)), (kx, ky))
    front.alpha_composite(tint(kanji, BONE), (kx, ky))

    word = fit(wordmark_src, int(w * 0.60), int(h * 0.19))
    front.alpha_composite(tint(word, GOLD_LIGHT), ((w - word.width) // 2, int(h * 0.68)))
    return back, middle, front


def imagestack(name, w, h, scales):
    folder = os.path.join(CATALOG, "App Icon & Top Shelf Image.brandassets", name + ".imagestack")
    if os.path.isdir(folder):
        shutil.rmtree(folder)
    contents({"info": INFO, "layers": [{"filename": n + ".imagestacklayer"} for n in ("Front", "Middle", "Back")]},
             os.path.join(folder, "Contents.json"))
    rendered = {s: icon_layers(w * s, h * s) for s in scales}
    for idx, layer in enumerate(("Back", "Middle", "Front")):
        ldir = os.path.join(folder, layer + ".imagestacklayer")
        contents({"info": INFO}, os.path.join(ldir, "Contents.json"))
        images = []
        for s in scales:
            fname = "%s@%dx.png" % (layer.lower(), s)
            write(rendered[s][idx], os.path.join(ldir, "Content.imageset", fname))
            images.append({"filename": fname, "idiom": "tv", "scale": "%dx" % s})
        contents({"images": images, "info": INFO}, os.path.join(ldir, "Content.imageset", "Contents.json"))


def top_shelf(name, w, h, scales):
    folder = os.path.join(CATALOG, "App Icon & Top Shelf Image.brandassets", name + ".imageset")
    if os.path.isdir(folder):
        shutil.rmtree(folder)
    images = []
    for s in scales:
        W, H = w * s, h * s
        art = backdrop(W, H)

        maze = fit(maze_rings, int(H * 1.5), int(H * 1.5))
        maze = tint(maze, GOLD)
        maze.putalpha(maze.getchannel("A").point(lambda v: int(v * 0.26)))
        art.alpha_composite(maze, (int(W * 0.72), (H - maze.height) // 2))

        kanji = fit(kanji_src, int(H * 0.62), int(H * 0.62))
        art.alpha_composite(tint(kanji, BONE), (int(W * 0.07), int(H * 0.19)))

        word = fit(wordmark_src, int(W * 0.34), int(H * 0.3))
        art.alpha_composite(tint(word, GOLD_LIGHT), (int(W * 0.07) + kanji.width + int(W * 0.02), int(H * 0.35)))

        fname = "%s@%dx.png" % (name.lower().replace(" ", "-"), s)
        write(art.convert("RGB"), os.path.join(folder, fname))
        images.append({"filename": fname, "idiom": "tv", "scale": "%dx" % s})
    contents({"images": images, "info": INFO}, os.path.join(folder, "Contents.json"))


imagestack("App Icon", 400, 240, [1, 2])
imagestack("App Icon - App Store", 1280, 768, [1])
top_shelf("Top Shelf Image", 1920, 720, [1])
top_shelf("Top Shelf Image Wide", 2320, 720, [1])

contents({
    "assets": [
        {"filename": "App Icon.imagestack", "idiom": "tv", "role": "primary-app-icon", "size": "400x240"},
        {"filename": "App Icon - App Store.imagestack", "idiom": "tv", "role": "primary-app-icon", "size": "1280x768"},
        {"filename": "Top Shelf Image Wide.imageset", "idiom": "tv", "role": "top-shelf-image-wide", "size": "2320x720"},
        {"filename": "Top Shelf Image.imageset", "idiom": "tv", "role": "top-shelf-image", "size": "1920x720"},
    ],
    "info": INFO,
}, os.path.join(CATALOG, "App Icon & Top Shelf Image.brandassets", "Contents.json"))

contents({"info": INFO}, os.path.join(CATALOG, "Contents.json"))

print("assets written to", CATALOG)
