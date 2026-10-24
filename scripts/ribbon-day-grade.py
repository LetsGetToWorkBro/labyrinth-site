#!/usr/bin/env python3
"""The picture side of the Saturday morning reminder post (scripts/instagram-ribbon-day.mjs runs this; see the header there).

    python3 scripts/ribbon-day-grade.py photo <album photo.jpg> <out.png> [crop-json]
        one photograph, graded to a plum-and-bone print (the whole frame, at 1620 px wide): skin and the rose of a shirt keep their colour, the room goes quiet
    python3 scripts/ribbon-day-grade.py foil <foil plate.png> <out.jpg>
        the Higgsfield foil plate turned into rose foil by a gradient map (the crinkles are the plate's, the colours are the brand's)
    python3 scripts/ribbon-day-grade.py ribbon <ribbon plate.png> <out.jpg> [gain]
        a Higgsfield ribbon plate pulled to the brand's rose (it is laid on with screen blending, so its black does nothing)
    python3 scripts/ribbon-day-grade.py finish <slide.png> <slide.jpg>
        a little grain over everything (it keeps the dark gradients from banding when Instagram recompresses), then a 4:4:4 JPEG

Needs: pip install numpy opencv-python-headless scipy pillow

It stands on scripts/jjwl-results-grade.py (the same light, the same filmic S, the same grain); only the palette is new. Nobody in a photograph is altered: this is
light and colour only, and no picture of a person is ever sent to an image generator (the foil and the ribbons are Higgsfield plates made from text prompts alone,
scripts/ribbon-day-plates/PROMPTS.txt).
"""
import importlib.util
import json
import os
import sys

import cv2
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter

HERE = os.path.dirname(os.path.abspath(__file__))
_spec = importlib.util.spec_from_file_location("jjwl_grade", os.path.join(HERE, "jjwl-results-grade.py"))
jg = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(jg)

PLATE_W = 1620          # the photograph is laid across the slide's 1080 px at 1.5x, so it can be scaled down and never up

# rose, bone and plum: the brand's pink is #E58FB5, the black behind it is #12060d
PLUM_SHADOW = (1.0, 0.80, 0.90)        # greys lean towards plum in the shadows ...
BONE_HIGH = (1.0, 0.955, 0.945)        # ... and towards a pink-white bone in the lights

DEFAULTS = dict(
    crop=(0.035, 0.02, 0.995, 0.93),   # left, top, right, bottom as fractions of the album photograph
    contrast=1.12, pivot=0.45, exposure=0.92,
    blues=0.30, reds=0.85, purples=0.35, greens=0.45,
    spot=(0.56, 0.50, 0.60, 0.62, 0.035),   # centre x, centre y, radius x, radius y, floor: the pool of light on the pair
    dodge=0.45, protect=(0.60, 0.95), skin=0.88, rose=0.70, resid=0.10,
    bloom=dict(thresh=0.80, amount=0.22, streak=0.05), bp=0.0050, clarity=0.16, denoise=2,
)


def rose_keep(rgb, skin, rose, resid, blur=2.2):
    """How much of its own colour a pixel keeps: skin mostly, a rose or red shirt partly, everything else a whisper."""
    h, s, v = jg.hsv(rgb)
    ws = jg.hue_weight(h, 6, 42, 8) * jg.smooth(0.08, 0.20, s) * (1 - jg.smooth(0.80, 0.95, s)) * jg.smooth(0.10, 0.25, v)
    wr = jg.hue_weight(h, 340, 8, 10) * jg.smooth(0.30, 0.60, s) * jg.smooth(0.12, 0.30, v)
    m = gaussian_filter(np.maximum(ws * skin, wr * rose), blur)
    return np.clip(resid + (1 - resid) * m, 0, 1).astype(np.float32)


def grade_photo(src, out, overrides=None):
    p = dict(DEFAULTS)
    for k, v in (overrides or {}).items():
        p[k] = dict(p[k], **v) if isinstance(v, dict) and isinstance(p.get(k), dict) else v
    raw = cv2.imread(src)
    if raw is None:
        sys.exit("cannot read " + src)
    ih, iw = raw.shape[:2]
    l, t, r, b = p["crop"]
    raw = raw[round(t * ih):round(b * ih), round(l * iw):round(r * iw)]
    if p["denoise"]:
        raw = cv2.fastNlMeansDenoisingColored(raw, None, p["denoise"], p["denoise"], 5, 15)
    ch, cw = raw.shape[:2]
    W = PLATE_W
    H = round(W * ch / cw)
    jg.W, jg.H = W, H                                   # the helpers read these when they build a spotlight or grain
    im = cv2.cvtColor(raw, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
    im = cv2.resize(im, (W, H), interpolation=cv2.INTER_AREA)
    keep = rose_keep(im, p["skin"], p["rose"], p["resid"])[..., None]
    im = jg.event_colours_asleep(im, p["blues"], p["reds"], p["purples"], p["greens"])
    lin = jg.srgb_to_lin(np.clip(im, 0, 1)) * p["exposure"]
    cx, cy, rx, ry, floor = p["spot"]
    pool = jg.spotlight(cx * W, cy * H, rx * W, ry * H)[..., None]
    light = floor + (1 - floor) * pool
    lamp = jg.smooth(p["protect"][0], p["protect"][1], jg.luma(lin)[..., None])
    light = light + (1 - light) * lamp
    lin = lin * light * (1 + p["dodge"] * pool * (1 - lamp))
    lin = jg.black_point(lin, p["bp"])
    lin = jg.toned_mono(lin, shadow=PLUM_SHADOW, high=BONE_HIGH) * (1 - keep) + lin * keep
    lin = jg.split_tone(lin, shadow=(1.0, 0.80, 0.92), shadow_amt=0.008, hi_gain=(1.02, 1.0, 1.0))
    lin = jg.bloom(lin, tint=(1.0, 0.55, 0.72), **p["bloom"])
    g = np.clip(jg.lin_to_srgb(np.clip(lin, 0, 6)), 0, 1)
    g = jg.tone(g, p["contrast"], p["pivot"])
    g = jg.clarity(g, p["clarity"])
    g = jg.unsharp(g)
    g = np.clip(jg.film_grain(g), 0, 1)
    cv2.imwrite(out, cv2.cvtColor((g * 255 + 0.5).astype(np.uint8), cv2.COLOR_RGB2BGR))
    print("%s: %dx%d" % (out, W, H))


# the foil: a gradient map from the plate's light to rose gold, plum in the creases, blush and champagne on the crests
RAMP = [(0.00, (74, 24, 48)), (0.28, (168, 74, 114)), (0.52, (232, 150, 186)), (0.76, (248, 212, 224)), (1.00, (255, 244, 240))]


def foil(src, out):
    im = np.asarray(Image.open(src).convert("RGB")).astype(np.float32) / 255.0
    y = im @ np.array([0.2126, 0.7152, 0.0722], np.float32)
    lo, hi = np.percentile(y, [1.5, 99.3])
    y = np.clip((y - lo) / (hi - lo), 0, 1) ** 0.55
    xs = [r[0] for r in RAMP]
    cols = np.array([r[1] for r in RAMP], np.float32) / 255.0
    mapped = np.dstack([np.interp(y, xs, cols[:, c]) for c in range(3)])
    Image.fromarray((np.clip(mapped, 0, 1) * 255 + 0.5).astype(np.uint8)).resize((1400, 1400), Image.LANCZOS).save(out, quality=92, subsampling=0)
    print("%s: 1400x1400" % out)


def ribbon(src, out, gain=1.0):
    """Pull the plate's pink to the brand's rose: the hue to about 337 degrees, a little less red in the saturation, the highlights a touch lighter."""
    rgb = np.asarray(Image.open(src).convert("RGB")).astype(np.float32) / 255.0
    h, s, v = jg.hsv(rgb)
    lit = jg.smooth(0.04, 0.20, v)
    h = h * (1 - lit) + (337.0 + 0 * h) * lit
    s = s * (0.80 + 0.0 * s)
    v = np.clip(v * gain, 0, 1)
    res = jg.from_hsv(h.astype(np.float32), s, v)
    Image.fromarray((np.clip(res, 0, 1) * 255 + 0.5).astype(np.uint8)).save(out, quality=94, subsampling=0)
    print(out)


def finish(src, out):
    im = np.asarray(Image.open(src).convert("RGB")).astype(np.float32)
    h, w = im.shape[:2]
    n = gaussian_filter(np.random.default_rng(11).normal(0, 1, (h, w)).astype(np.float32), 0.55)
    n /= n.std()
    Image.fromarray(np.clip(im + 1.5 * n[..., None] + 0.5, 0, 255).astype(np.uint8)).save(out, quality=93, subsampling=0, optimize=True)


if __name__ == "__main__":
    cmd, args = (sys.argv[1] if len(sys.argv) > 1 else ""), sys.argv[2:]
    if cmd == "photo" and len(args) in (2, 3):
        grade_photo(args[0], args[1], json.loads(args[2]) if len(args) == 3 else None)
    elif cmd == "foil" and len(args) == 2:
        foil(*args)
    elif cmd == "ribbon" and len(args) in (2, 3):
        ribbon(args[0], args[1], float(args[2]) if len(args) == 3 else 1.0)
    elif cmd == "finish" and len(args) == 2:
        finish(*args)
    else:
        sys.exit(__doc__)
