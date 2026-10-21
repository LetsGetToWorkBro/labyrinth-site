#!/usr/bin/env python3
"""The picture side of the JJWL Houston results post (scripts/instagram-jjwl-results.mjs runs this; see the header there).

    python3 scripts/jjwl-results-grade.py photo <album photo.jpg> <out.png> cover|team|trophy|arena|hall ['{"cy": 0.5, ...}']
        one photograph, graded to a warm silver print (1080x1350, 4:5); the optional JSON replaces any of the preset's settings
    python3 scripts/jjwl-results-grade.py masks <out folder>
        the brand marks as masks the slides cut gold foil with: the vertical kanji nameplate and the maze mark without its lettering
    python3 scripts/jjwl-results-grade.py finish <slide.png> <slide.jpg>
        a little grain over everything (it keeps the dark gradients from banding when Instagram recompresses), then a 4:4:4 JPEG

Needs: pip install numpy opencv-python-headless scipy pillow

The grade. The tournament hall is blue, purple and red, lit from everywhere; the post wants a few things lit and the rest in the dark. So: the event's
colours are put to sleep, everything is pulled to a warm silver print, and only gold (the medals, a blonde ponytail) and skin keep their colour. A pool of
light is laid on the subject and the room falls away round it, but the lamps and the medals are their own light and are never dimmed by it. Highlights get a
little halation; the blacks are real blacks. Nobody is altered: this is light and colour only, and no picture of a person is sent to any image generator.
Everything is float32, so nothing bands; the grain goes on after the resize, so it is the size of real grain.
"""
import json
import os
import sys

import cv2
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter

W, H = 1080, 1350


# ---------------------------------------------------------------------------------------------- colour
def srgb_to_lin(x):
    return np.where(x <= 0.04045, x / 12.92, ((x + 0.055) / 1.055) ** 2.4).astype(np.float32)


def lin_to_srgb(x):
    x = np.clip(x, 0, None)
    return np.where(x <= 0.0031308, x * 12.92, 1.055 * np.power(x, 1 / 2.4) - 0.055).astype(np.float32)


def luma(lin):
    return (0.2126 * lin[..., 0] + 0.7152 * lin[..., 1] + 0.0722 * lin[..., 2]).astype(np.float32)


def smooth(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def hsv(rgb):          # rgb float 0..1 -> hue in degrees, saturation, value
    out = cv2.cvtColor(rgb.astype(np.float32), cv2.COLOR_RGB2HSV)
    return out[..., 0], out[..., 1], out[..., 2]


def from_hsv(h, s, v):
    return cv2.cvtColor(np.dstack([h, np.clip(s, 0, 1), np.clip(v, 0, 1)]).astype(np.float32), cv2.COLOR_HSV2RGB)


def hue_weight(h, lo, hi, feather=18):
    """1 inside [lo, hi] degrees (the range may wrap past 360), fading out over `feather` degrees on each side."""
    h = h % 360
    lo %= 360
    hi %= 360
    inside = (h >= lo) & (h <= hi) if lo <= hi else (h >= lo) | (h <= hi)
    away = np.minimum(np.abs(((h - lo + 180) % 360) - 180), np.abs(((h - hi + 180) % 360) - 180))
    return np.where(inside, 1.0, np.clip(1 - away / feather, 0, 1)).astype(np.float32)


def tone(x, contrast=1.0, pivot=0.45, toe=0.0, shoulder=0.99):
    """A filmic S on gamma-encoded values."""
    k = 3.6 * contrast
    y = 1 / (1 + np.exp(-k * (x - pivot)))
    y0 = 1 / (1 + np.exp(-k * (0 - pivot)))
    y1 = 1 / (1 + np.exp(-k * (1 - pivot)))
    y = (y - y0) / (y1 - y0)
    return (toe + (shoulder - toe) * y).astype(np.float32)


def event_colours_asleep(rgb, blues, reds, purples, greens, gold_lift=1.06):
    """Quiet the JJWL blue, purple and red and the green mats. Skin (hue 8-40) is never touched; hair and gold are lifted a touch.
    Every pull is weighted by how coloured the pixel really is: a near-white or near-grey pixel has no meaningful hue, and letting its
    noisy hue steer the grade is what once turned the ceiling lamps into blocks."""
    h, s, v = hsv(rgb)
    s0 = s.copy()
    coloured = smooth(0.10, 0.32, s0)
    wb = hue_weight(h, 185, 255, 22) * coloured
    wp = hue_weight(h, 262, 340, 20) * coloured
    wr = hue_weight(h, 346, 7, 8) * smooth(0.50, 0.80, s0)           # only a properly saturated true red: seats, red mats
    wg = hue_weight(h, 80, 165, 20) * coloured
    wy = hue_weight(h, 36, 60, 10) * coloured
    s = s * (1 - wb * (1 - blues)) * (1 - wp * (1 - purples)) * (1 - wr * (1 - reds)) * (1 - wg * (1 - greens))
    v = v * (1 - 0.14 * wb) * (1 - 0.20 * wp) * (1 - 0.22 * wr) * (1 - 0.12 * wg)
    s = s * (1 + (gold_lift - 1) * wy)
    return from_hsv(h, s, v)


def keep_mask(rgb, skin, gold, resid, blur=2.2):
    """How much of its own colour a pixel keeps: gold fully, skin mostly, everything else a whisper. Worked out from the picture
    before it is graded and softened, so JPEG noise cannot make the mask shimmer."""
    h, s, v = hsv(rgb)
    ws = hue_weight(h, 6, 42, 8) * smooth(0.08, 0.20, s) * (1 - smooth(0.80, 0.95, s)) * smooth(0.10, 0.25, v)
    wg = hue_weight(h, 34, 58, 8) * smooth(0.30, 0.55, s) * smooth(0.25, 0.50, v)
    m = gaussian_filter(np.maximum(ws * skin, wg * gold), blur)
    return np.clip(resid + (1 - resid) * m, 0, 1).astype(np.float32)


def toned_mono(lin, shadow=(1.0, 0.925, 0.82), high=(1.0, 0.972, 0.915)):
    """The picture as a warm silver print: the same light, with every grey leaning towards the brand's black in the shadows and towards bone in the lights."""
    y = luma(lin)
    t = smooth(0.02, 0.60, y)[..., None]
    tint = np.array(shadow, np.float32) * (1 - t) + np.array(high, np.float32) * t
    tint = tint / luma(tint)[..., None]
    return y[..., None] * tint


def split_tone(lin, shadow=(1.0, 0.93, 0.84), shadow_amt=0.006, hi_gain=(1.035, 1.0, 0.90)):
    y = luma(lin)[..., None]
    sh = (1 - smooth(0.0, 0.35, y)) ** 2
    lin = lin + np.array(shadow, np.float32) * shadow_amt * sh
    gain = 1 + (np.array(hi_gain, np.float32) - 1) * smooth(0.25, 0.95, y)
    return lin * gain


def black_point(lin, bp):
    return np.clip((lin - bp) / (1 - bp), 0, None)


# ---------------------------------------------------------------------------------------------- light
def spotlight(cx, cy, rx, ry, power=1.6):
    """1 at the centre, falling to 0: an elliptical pool of light, smooth, never a visible edge."""
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    d = np.sqrt(((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2)
    return np.exp(-np.power(d, power) * 1.1)


def bloom(lin, thresh, amount, streak, tint=(1.0, 0.74, 0.42), sigmas=(5, 16, 44), streak_sigma=150):
    """Halation round the really hot pixels (lamps, medals): a warm glow and a thin amber streak, never a veil over the whole frame."""
    y = luma(lin)
    hot = np.clip(y - thresh, 0, None)[..., None] * lin / np.maximum(y[..., None], 1e-4)
    glow = np.zeros_like(lin)
    for i, sg in enumerate(sigmas):
        glow += np.dstack([gaussian_filter(hot[..., c], sg) for c in range(3)]) * (0.55 ** i) * 1.3
    glow = glow * np.array(tint, np.float32)[None, None] * amount
    st = np.dstack([gaussian_filter(hot[..., c], (1.8, streak_sigma)) for c in range(3)])
    st = st * np.array((1.0, 0.62, 0.28), np.float32)[None, None] * streak
    return lin + glow + st


def clarity(rgb, amount, radius=38):
    """A broad, gentle local contrast on the luminance only: depth without anything looking sharpened."""
    y = rgb.mean(axis=2)
    return rgb + ((y - gaussian_filter(y, radius)) * amount)[..., None]


def unsharp(rgb, radius=1.0, amount=0.14):
    blur = np.dstack([gaussian_filter(rgb[..., c], radius) for c in range(3)])
    return rgb + (rgb - blur) * amount


def film_grain(rgb, amount=0.014, size=0.7, chroma=0.12, seed=7):
    rng = np.random.default_rng(seed)
    n = gaussian_filter(rng.normal(0, 1, (H, W)).astype(np.float32), size)
    n /= n.std() + 1e-6
    nc = rng.normal(0, 1, (H, W, 3)).astype(np.float32)
    nc = np.dstack([gaussian_filter(nc[..., c], size * 1.4) for c in range(3)])
    nc /= nc.std() + 1e-6
    weight = (0.35 + 0.65 * (1 - np.abs(rgb.mean(axis=2) - 0.45) * 1.6)).clip(0.15, 1)[..., None]   # grain lives in the mid-tones, as on film
    return rgb + weight * amount * ((1 - chroma) * n[..., None] + chroma * nc)


# ---------------------------------------------------------------------------------------------- the three photographs
# cy: where the 4:5 window sits in the (2:3) album photograph, 0 = top, 1 = bottom. spot: (centre x, centre y, radius x, radius y, floor) of the
# pool of light as fractions of the frame; dodge: extra light on the subject; protect: the brightness range that is its own light (lamps, medals).
PRESETS = {
    # the cover: a night scene already; the lamps stay the brightest thing in it, her back and the gold of her hair are the light
    "cover": dict(cy=0.175, contrast=1.10, pivot=0.46, blues=0.38, reds=0.45, purples=0.35, greens=0.5, exposure=0.95,
                  spot=(0.50, 0.60, 0.62, 0.62, 0.05), dodge=0.28, protect=(0.50, 0.92), skin=0.78, gold=1.0, resid=0.14,
                  bloom=dict(thresh=0.74, amount=0.30, streak=0.20), bp=0.0040, clarity=0.16, denoise=0),
    # the team: a bright hall made to feel like a stage; the children and their medals are the light
    "team": dict(cy=0.877, contrast=1.16, pivot=0.47, blues=0.30, reds=0.40, purples=0.30, greens=0.45, exposure=0.84,
                 spot=(0.43, 0.62, 0.50, 0.46, 0.035), dodge=0.80, protect=(0.55, 0.95), skin=0.80, gold=1.0, resid=0.12,
                 bloom=dict(thresh=0.82, amount=0.26, streak=0.10), bp=0.0050, clarity=0.18, denoise=2),
    "trophy": dict(cy=0.380, contrast=1.14, pivot=0.46, blues=0.30, reds=0.40, purples=0.30, greens=0.40, exposure=0.86,
                   spot=(0.52, 0.56, 0.46, 0.46, 0.03), dodge=0.75, protect=(0.55, 0.95), skin=0.80, gold=1.0, resid=0.15,
                   bloom=dict(thresh=0.82, amount=0.26, streak=0.08), bp=0.0050, clarity=0.18, denoise=2),
}


# the rest of the swipe: "arena" is a dark hall under its lamps (like the cover), "hall" a bright one (like the team). Each picture says where its
# own subject is (spot) and which part of the photograph the 4:5 window shows (cy); anything else it names replaces these.
PRESETS["arena"] = dict(PRESETS["cover"], cy=0.2, spot=(0.50, 0.55, 0.60, 0.58, 0.05), dodge=0.45, denoise=2)
PRESETS["hall"] = dict(PRESETS["team"], cy=0.5, spot=(0.50, 0.52, 0.52, 0.50, 0.05), dodge=0.60)


def grade_photo(src, out, preset, overrides=None):
    p = dict(PRESETS[preset])
    for k, v in (overrides or {}).items():
        p[k] = dict(p[k], **v) if isinstance(v, dict) and isinstance(p.get(k), dict) else v
    raw = cv2.imread(src)
    if raw is None:
        sys.exit("cannot read " + src)
    ih, iw = raw.shape[:2]
    ch = min(ih, round(iw * H / W))                  # the largest 4:5 window the photograph holds
    cw = round(ch * W / H)
    x0 = (iw - cw) // 2
    y0 = round(p["cy"] * (ih - ch))
    raw = raw[y0:y0 + ch, x0:x0 + cw]
    if p["denoise"]:
        raw = cv2.fastNlMeansDenoisingColored(raw, None, p["denoise"], p["denoise"], 5, 15)      # the album's JPEGs have 8x8 block noise that contrast would otherwise dig out
    im = cv2.cvtColor(raw, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
    im = cv2.resize(im, (W, H), interpolation=cv2.INTER_AREA)
    keep = keep_mask(im, p["skin"], p["gold"], p["resid"])[..., None]
    im = event_colours_asleep(im, p["blues"], p["reds"], p["purples"], p["greens"])
    lin = srgb_to_lin(np.clip(im, 0, 1)) * p["exposure"]
    cx, cy, rx, ry, floor = p["spot"]
    pool = spotlight(cx * W, cy * H, rx * W, ry * H)[..., None]
    light = floor + (1 - floor) * pool                                  # how much of the room's light reaches this pixel
    lamp = smooth(p["protect"][0], p["protect"][1], luma(lin)[..., None])
    light = light + (1 - light) * lamp                                  # the lamps and the medals are their own light: the falloff does not dim them
    lin = lin * light * (1 + p["dodge"] * pool * (1 - lamp))            # and a little extra on the subject
    lin = black_point(lin, p["bp"])
    lin = toned_mono(lin) * (1 - keep) + lin * keep                     # a warm silver print, with gold and skin still in colour
    lin = split_tone(lin)
    lin = bloom(lin, **p["bloom"])
    g = np.clip(lin_to_srgb(np.clip(lin, 0, 6)), 0, 1)
    g = tone(g, p["contrast"], p["pivot"])
    g = clarity(g, p["clarity"])
    g = unsharp(g)
    g = np.clip(film_grain(g), 0, 1)
    cv2.imwrite(out, cv2.cvtColor((g * 255 + 0.5).astype(np.uint8), cv2.COLOR_RGB2BGR))


# ---------------------------------------------------------------------------------------------- the brand marks, as masks
def write_mask(alpha, path):
    h, w = alpha.shape
    rgba = np.dstack([np.full((h, w), 255, np.uint8)] * 3 + [np.clip(alpha * 255 + 0.5, 0, 255).astype(np.uint8)])
    cv2.imwrite(path, rgba)


def brand_masks(out):
    """The slides fill these shapes with gold foil. The vertical kanji nameplate (assets/logo-kanji-framed.jpg): its black plate is the shape, the
    kanji and the fine gap are cut out of it. The maze mark (assets/logo-maze-480.png) without its LAB/YRI/NTH lettering, so that it can sit
    behind real words as a ghost of the labyrinth without competing with them."""
    assets = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets")
    os.makedirs(out, exist_ok=True)
    im = cv2.imread(os.path.join(assets, "logo-kanji-framed.jpg"), cv2.IMREAD_GRAYSCALE)
    plate = im[0:534, 169:490]                                      # above the word LABYRINTH
    big = cv2.GaussianBlur(cv2.resize(plate, None, fx=3, fy=3, interpolation=cv2.INTER_CUBIC).astype(np.float32), (0, 0), 1.6)
    write_mask(1 - smooth(70, 190, big), os.path.join(out, "seal-kanji.png"))
    m = cv2.imread(os.path.join(assets, "logo-maze-480.png"), cv2.IMREAD_UNCHANGED)
    a = cv2.GaussianBlur(cv2.resize(m[..., 3].astype(np.float32) / 255, None, fx=3, fy=3, interpolation=cv2.INTER_CUBIC), (0, 0), 1.8)
    a = smooth(0.30, 0.70, a)
    hh, ww = a.shape
    yy, xx = np.mgrid[0:hh, 0:ww].astype(np.float32)
    r = np.sqrt((xx - ww / 2) ** 2 + (yy - hh / 2) ** 2) / (ww / 2)
    write_mask(a * np.clip((r - 0.44) / 0.02, 0, 1), os.path.join(out, "seal-maze-ring.png"))       # the lettering lives inside r < 0.4


# ---------------------------------------------------------------------------------------------- the last step
def finish(src, out):
    im = np.asarray(Image.open(src).convert("RGB")).astype(np.float32)
    h, w = im.shape[:2]
    n = gaussian_filter(np.random.default_rng(11).normal(0, 1, (h, w)).astype(np.float32), 0.55)
    n /= n.std()
    Image.fromarray(np.clip(im + 1.5 * n[..., None] + 0.5, 0, 255).astype(np.uint8)).save(out, quality=93, subsampling=0, optimize=True)


if __name__ == "__main__":
    cmd, args = (sys.argv[1] if len(sys.argv) > 1 else ""), sys.argv[2:]
    if cmd == "photo" and len(args) in (3, 4) and args[2] in PRESETS:
        grade_photo(args[0], args[1], args[2], json.loads(args[3]) if len(args) == 4 else None)
    elif cmd == "masks" and len(args) == 1:
        brand_masks(args[0])
    elif cmd == "finish" and len(args) == 2:
        finish(*args)
    else:
        sys.exit(__doc__)
