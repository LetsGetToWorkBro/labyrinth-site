#!/usr/bin/env python3
"""The four homepage program photographs, in one natural grade.

    python3 scripts/grade-homepage-photos.py --ray <album folder> --israel <album folder> [--out assets] [--only home-competition,...]
    python3 scripts/grade-homepage-photos.py --photo <any photo> --name <file name, no extension> [--aspect 0.635] [--cx 0.5] [--cy 0.5] [--zoom 1] [--width 900]

The second form puts any single photograph through the same grade, so a picture chosen later matches the rest. It writes <name>.jpg and <name>.webp.

    needs: pip install pillow numpy av          (av only for the one picture that is a frame of assets/hero-video.mp4)
    albums: python3 scripts/lightroom-album.py <share link> <folder>

What the grade is for: the site's own photographs are arena shots, low-key and soft, with a little teal in the shadows. The academy's gym
pictures are bright (white walls, grey mats) and sit badly beside them. Every picture here goes through the same four steps, so the cards
read as one set:

  1. Exposure, down by about a stop, in linear light as a camera would do it, then a gentle S-curve for contrast, the blacks lifted a hair and
     the very top rolled off so a white wall is a pale grey and not a hole.
  2. Colour: saturation set per picture (the gym pictures are nearly colourless and need a little; the arena picture does not), teal into
     the shadows and a trace of warmth into the highlights.
  3. Light: a soft vignette round the subject, and a little darker toward the top of the frame, where the walls are.
  4. A trace of grain, so dark gradients do not band and an enlarged photograph does not look smoothed.

There is no mask in it. Every pixel goes through the same curves whatever is next to it; the one thing that depends on where a pixel is, is
the vignette, which has no edges to follow. That is deliberate. The first version of this script told white walls from skin from clothes by
colour and treated them differently, and a mask has an edge: it left pale halos round the kids, turned the logos on the rash guards into
flat grey blocks and made skin look like plastic. It could not be tuned out, only replaced.

The crops are for the cards as they are drawn: the photo box is about 580px tall and its width runs from 260px (a small phone) to nearly 950px
(a tablet), so a picture is cropped to a tall window on a phone and to a wide one on a tablet. Youth Wrestling is a tall crop. Youth BJJ is a square
that serves the tall phone window, the near-square desktop window and the wide tablet one. The Adult Gi card is wide on a phone and nearly square on
a desktop, so its two men are kept in the middle of a 4:3 picture. Competition is the whole of the photograph (it was supplied at 800x533 pixels, so it is enlarged
and sharpened a little, and the page positions it with object-position so both men and the medals stay in the window at every width).
Nothing is written over the originals: the program pages keep their old photographs, and these files are named home-*.
"""
import argparse, glob, os, sys
import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)

# ── The grade: the same for every picture, with a few per-picture dials in PHOTOS ──
GRADE = dict(ev=-0.9, contrast=1.22, pivot=0.40, black=0.012, rolloff=0.80, sat=1.10, shadow_tint=(-0.020, 0.006, 0.026), high_tint=(0.012, 0.005, -0.012),
             vig=0.50, vig_r=0.62, vig_pow=1.8, top=0.32, top_h=0.5, grain=0.006)

# name: the file the page uses (assets/<name>.jpg and .webp)
# album/file: which photograph (RFH-<n> in the first album, DSC0<n> in the second), path: a photograph in this repository, or video/t: a frame of assets/hero-video.mp4
# aspect, cx, cy: the crop window (width / height, and where it is centred in the frame, 0 to 1); aspect 'frame' keeps the whole picture; zoom: closer than the largest window
# width: the finished width in px; sharpen: (radius, percent) of an unsharp mask after an enlargement; focus: where the light is, (x, y) in the finished picture
# alt: what the page says the picture is
PHOTOS = [
    dict(name='home-youth-bjj', album='ray', file='RFH-36', aspect=1.0, cx=0.60, cy=0.5, width=1200, focus=(0.50, 0.45),
         alt='A smiling kid carries another kid across the shoulders in a kids class at Labyrinth BJJ in Fulshear, TX'),
    dict(name='home-youth-wrestling', album='israel', file='DSC09142', aspect=0.635, zoom=1.25, cx=0.46, cy=0.56, width=900, focus=(0.50, 0.50),
         alt='Two young athletes lock up in a wrestling clinch at Labyrinth BJJ in Fulshear, TX'),
    dict(name='home-competition', path=os.path.join(HERE, 'source-photos', 'jjwl-austin.jpg'), aspect='frame', width=1600, sharpen=(1.3, 70), focus=(0.54, 0.45), sat=1.0, top=0.12,
         alt='Two Labyrinth BJJ team members hold gold medals in front of the Jiu Jitsu World League Austin banner'),
    dict(name='home-adult-gi', video='assets/hero-video.mp4', t=20.75, aspect=4 / 3, cx=0.40, cy=0.5, width=960, focus=(0.50, 0.50),
         alt='Two adults in gis laugh as they grip up at Labyrinth BJJ in Fulshear, TX'),
]


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def to_linear(x):
    return np.where(x <= 0.04045, x / 12.92, ((x + 0.055) / 1.055) ** 2.4)


def to_srgb(x):
    x = np.clip(x, 0, 1)
    return np.where(x <= 0.0031308, x * 12.92, 1.055 * x ** (1 / 2.4) - 0.055)


def luma(x):
    return 0.2126 * x[..., 0] + 0.7152 * x[..., 1] + 0.0722 * x[..., 2]


def crop_to(img, aspect, cx, cy, out_w, zoom=1.0):
    w, h = img.size
    if aspect == 'frame':
        aspect = w / h
    cw, ch = (h * aspect, h) if w / h > aspect else (w, w / aspect)
    cw, ch = cw / zoom, ch / zoom
    x0 = min(max(cx * w - cw / 2, 0), w - cw)
    y0 = min(max(cy * h - ch / 2, 0), h - ch)
    out = img.crop((round(x0), round(y0), round(x0 + cw), round(y0 + ch)))
    return out.resize((out_w, round(out_w / aspect)), Image.LANCZOS), (round(cw), round(ch))


def grade(img, focus, p, seed=7):
    x = np.asarray(img.convert('RGB')).astype(np.float32) / 255
    h, w = x.shape[:2]
    # 1. exposure in linear light: every pixel is scaled by the same amount
    x = to_srgb(to_linear(x) * (2.0 ** p['ev']))
    # a gentle S-curve round the pivot, the blacks lifted a hair, the very top rolled off; applied to the brightness and carried to the colour by the ratio,
    # so hue and saturation are kept and no channel is pushed alone
    Y = luma(x)
    Yc = np.clip(Y, 0, 1)
    s = Yc * Yc * (3 - 2 * Yc)
    Y2 = Yc + (s - Yc) * (p['contrast'] - 1) * 2.0
    Y2 = p['black'] + Y2 * (1 - p['black'])
    ro = p['rolloff']
    hi = np.clip((Y2 - ro) / (1 - ro + 1e-6), 0, 1)
    Y2 = np.where(Y2 > ro, ro + (1 - ro) * (1 - (1 - hi) ** 1.7) * 0.8, Y2)
    ratio = (Y2 / np.maximum(Y, 1e-3))[..., None]
    ratio = np.where(Y[..., None] < 0.02, 1.0 + (ratio - 1.0) * (Y[..., None] / 0.02), ratio)       # do not amplify noise in the near-black
    x = np.clip(x * ratio, 0, 1)
    # 2. colour
    Y = luma(x)[..., None]
    x = Y + (x - Y) * p['sat']
    x = x + (1 - smoothstep(0.0, 0.42, Y)) * np.array(p['shadow_tint'], np.float32) + smoothstep(0.55, 0.95, Y) * np.array(p['high_tint'], np.float32)
    # 3. light: a vignette round the subject, a little darker toward the top
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    fx, fy = focus
    r = np.sqrt(((xx / w - fx) * (w / max(w, h))) ** 2 + ((yy / h - fy) * (h / max(w, h))) ** 2) / p['vig_r']
    shade = 1 - p['vig'] * smoothstep(0.25, 1.35, r) ** p['vig_pow']
    if p['top']:
        shade = shade * (1 - p['top'] * (1 - smoothstep(0.0, p['top_h'], yy / h)) ** 1.5)
    x = x * shade[..., None]
    # 4. grain
    x = np.clip(x + np.random.default_rng(seed).normal(0, p['grain'], (h, w))[..., None], 0, 1)
    return Image.fromarray((x * 255 + 0.5).astype(np.uint8))


def stats(img):
    a = np.asarray(img.convert('RGB').resize((200, 200))).astype(np.float32)
    y = 0.2126 * a[..., 0] + 0.7152 * a[..., 1] + 0.0722 * a[..., 2]
    mx, mn = a.max(-1), a.min(-1)
    sh = a[y < 50]
    return 'mean %3.0f  p5 %3.0f  p50 %3.0f  p95 %3.0f  saturation %.2f  shadows %s' % (
        y.mean(), np.percentile(y, 5), np.percentile(y, 50), np.percentile(y, 95),
        np.where(mx > 0, (mx - mn) / np.maximum(mx, 1), 0).mean(), tuple(int(v) for v in sh.mean(0)) if len(sh) > 50 else None)


def source(spec, folders):
    if 'path' in spec:
        return Image.open(spec['path'])
    if 'video' in spec:
        import av                                   # only for the frame of the hero video
        c = av.open(os.path.join(REPO, spec['video']))
        v = c.streams.video[0]
        c.seek(int(spec['t'] * 1e6))
        for f in c.decode(v):
            if float(f.pts * v.time_base) >= spec['t'] - 1e-3:
                return f.to_image()
        raise SystemExit('no frame at %.2fs of %s' % (spec['t'], spec['video']))
    folder = folders[spec['album']]
    if not folder or not os.path.isdir(folder):
        raise SystemExit('give the folder of the %s album: --%s <folder> (python3 scripts/lightroom-album.py <share link> <folder> downloads it)' % (spec['album'], spec['album']))
    hit = glob.glob(os.path.join(folder, '*%s.jpg' % spec['file']))
    if not hit:
        raise SystemExit('%s is not in %s' % (spec['file'], folder))
    return Image.open(hit[0])


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--ray'), ap.add_argument('--israel')
    ap.add_argument('--out', default=os.path.join(REPO, 'assets'))
    ap.add_argument('--only', default='')
    ap.add_argument('--photo', help='grade this one photograph instead of the four homepage pictures')
    ap.add_argument('--name', help='with --photo: the output name, without extension')
    ap.add_argument('--aspect', type=float, default=0.635, help='with --photo: width / height of the finished picture')
    ap.add_argument('--cx', type=float, default=0.5), ap.add_argument('--cy', type=float, default=0.5)
    ap.add_argument('--zoom', type=float, default=1.0), ap.add_argument('--width', type=int, default=900)
    a = ap.parse_args()
    only = [n for n in a.only.split(',') if n]
    os.makedirs(a.out, exist_ok=True)
    specs = PHOTOS
    if a.photo:
        if not a.name:
            raise SystemExit('--photo needs --name')
        specs = [dict(name=a.name, path=a.photo, aspect=a.aspect, cx=a.cx, cy=a.cy, zoom=a.zoom, width=a.width, focus=(0.5, 0.5), alt='')]
    for spec in specs:
        if only and spec['name'] not in only:
            continue
        crop, native = crop_to(source(spec, {'ray': a.ray, 'israel': a.israel}), spec['aspect'], spec.get('cx', 0.5), spec.get('cy', 0.5), spec['width'], spec.get('zoom', 1.0))
        if spec.get('sharpen'):
            crop = crop.filter(ImageFilter.UnsharpMask(radius=spec['sharpen'][0], percent=spec['sharpen'][1], threshold=2))
        p = dict(GRADE, **{k: spec[k] for k in GRADE if k in spec})
        out = grade(crop, spec['focus'], p)
        jpg, webp = os.path.join(a.out, spec['name'] + '.jpg'), os.path.join(a.out, spec['name'] + '.webp')
        out.save(jpg, quality=84, optimize=True, progressive=True, subsampling=2)
        out.save(webp, quality=84, method=6)
        print('%-22s %dx%d from a %dx%d window   jpg %3d KB   webp %3d KB' % (spec['name'], out.width, out.height, native[0], native[1],
              os.path.getsize(jpg) // 1024, os.path.getsize(webp) // 1024))
        print('   ' + stats(out))
        if spec['alt']:
            print('   alt: ' + spec['alt'])


if __name__ == '__main__':
    main()
