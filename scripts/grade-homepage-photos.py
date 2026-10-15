#!/usr/bin/env python3
"""The four homepage program photographs, in the house grade.

    python3 scripts/grade-homepage-photos.py --ray <album folder> --israel <album folder> [--out assets] [--only home-competition,...]
    python3 scripts/grade-homepage-photos.py --photo <any photo> --name <file name, no extension> [--aspect 0.635] [--cx 0.5] [--cy 0.5] [--zoom 1] [--width 900]

The second form puts any single photograph through the same grade (a centred oval of light; --light x,y,rx,ry to move it), so a picture chosen
later matches the rest. It writes <name>.jpg and <name>.webp.

    needs: pip install pillow numpy av          (av only for the one picture that is a frame of assets/hero-video.mp4)
    albums: python3 scripts/lightroom-album.py <share link> <folder>

Why a grade: the site's own photographs (the arena shots) are low-key: black-teal shadows, warm skin, most of the frame dark. The academy's new
pictures are bright gym pictures (white walls, grey mats), which sit badly next to them. Every picture here is pulled into the same look by
the same steps, so the four cards read as one set:

  1. Tone. Colourless things (white walls, windows, mats) go through a curve that flattens high up, so a white wall lands at a dark slate grey.
     Warm and colourful things (skin, red shorts, a blue shirt) go through a gentle gamma, so people stay lit. Both curves rise with brightness
     and each pixel blends them by its own colour (smoothed inside regions, never across an outline), so no halo or bright rim can appear.
  2. Colour. Shadows go teal, greys go cool, skin gets a little richer, highlights a touch warm.
  3. Light. A soft oval of light on the subject, falling off to the edges, and a little darker at top and bottom.
  4. A trace of grain, so the dark gradients do not band when they are compressed.

The crops are for the cards as they are drawn: Youth Wrestling and Competition are tall (about 0.63 wide to high on every screen); Youth BJJ is
a square that serves the tall phone crop, the near-square desktop crop and the wide tablet crop; the Adult Gi card is wide on a phone and nearly square
on a desktop, so its two men are kept in the middle of a 4:3 picture.
Nothing is written over the originals: the program pages keep their old photographs, and these files are named home-*.
"""
import argparse, glob, os, sys
import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)

# ── The house grade: the same for every picture, with a few per-picture dials in PHOTOS ──
GRADE = dict(gamma=1.30, contrast=1.12, sat=0.95, warm_sat=0.25, neutral_max=0.30, neutral_pow=3.0, keep_blur=0.0015, keep_close=0.0025,
             shadow_tint=(-0.030, 0.016, 0.026), mid_tint=(-0.040, 0.010, 0.036), highlight_warm=(0.020, 0.008, -0.012),
             vig=0.78, vig_lo=0.40, vig_hi=1.30, vig_pow=1.3, top=0.10, bottom=0.12, grain=0.005)

# name: the file the page uses (assets/<name>.jpg and .webp)
# album/file: which photograph (RFH-<n> in the first album, DSC0<n> in the second), or video/t: a frame of assets/hero-video.mp4
# aspect, cx, cy: the crop window (width / height, and where it is centred in the frame, 0 to 1); zoom: closer than the largest window; width: the finished width in px
# light: the oval of light, as (centre x, centre y, half width, half height) in the finished picture
# alt: what the page says the picture is
PHOTOS = [
    dict(name='home-youth-bjj', album='ray', file='RFH-36', aspect=1.0, cx=0.60, cy=0.5, width=1200, light=(0.50, 0.48, 0.74, 0.64),
         alt='A smiling kid carries another kid across the shoulders in a kids class at Labyrinth BJJ in Fulshear, TX'),
    dict(name='home-youth-wrestling', album='israel', file='DSC09142', aspect=0.635, zoom=1.25, cx=0.46, cy=0.56, width=900, light=(0.50, 0.52, 0.80, 0.62),
         gamma=1.0, contrast=1.22, neutral_max=0.26, vig=0.70, sat=0.88, warm_sat=0.05,
         alt='Two young athletes lock up in a wrestling clinch at Labyrinth BJJ in Fulshear, TX'),
    dict(name='home-competition', album='israel', file='DSC09333', aspect=0.635, cx=0.38, cy=0.5, width=900, light=(0.50, 0.45, 0.80, 0.62),
         alt='Two training partners in black and gold Labyrinth rash guards grapple at Labyrinth BJJ in Fulshear, TX'),
    dict(name='home-adult-gi', video='assets/hero-video.mp4', t=20.75, aspect=4 / 3, cx=0.40, cy=0.5, width=960, light=(0.50, 0.50, 0.75, 0.70), neutral_max=0.40, contrast=1.16, vig=0.85,
         alt='Two adults in gis laugh as they grip up at Labyrinth BJJ in Fulshear, TX'),
]


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def luma(x):
    return 0.2126 * x[..., 0] + 0.7152 * x[..., 1] + 0.0722 * x[..., 2]


def box(a, r):
    """Mean over a (2r+1) square window, edges replicated."""
    k = 2 * r + 1
    ap = np.pad(a.astype(np.float64), ((r + 1, r), (r + 1, r)), mode='edge')
    c = ap.cumsum(0).cumsum(1)
    return ((c[k:, k:] - c[:-k, k:] - c[k:, :-k] + c[:-k, :-k]) / (k * k)).astype(np.float32)


def guided(guide, p, r, eps):
    """Smooths p inside regions but not across the outlines of `guide` (He, Sun, Tang, guided filter)."""
    mI, mp = box(guide, r), box(p, r)
    var = box(guide * guide, r) - mI * mI
    cov = box(guide * p, r) - mI * mp
    a = cov / (var + eps)
    return box(a, r) * guide + box(mp - a * mI, r)


def crop_to(img, aspect, cx, cy, out_w, zoom=1.0):
    w, h = img.size
    cw, ch = (h * aspect, h) if w / h > aspect else (w, w / aspect)
    cw, ch = cw / zoom, ch / zoom
    x0 = min(max(cx * w - cw / 2, 0), w - cw)
    y0 = min(max(cy * h - ch / 2, 0), h - ch)
    out = img.crop((round(x0), round(y0), round(x0 + cw), round(y0 + ch)))
    return out.resize((out_w, round(out_w / aspect)), Image.LANCZOS), (round(cw), round(ch))


def grade(img, light, p, seed=7):
    x0 = np.asarray(img.convert('RGB')).astype(np.float32) / 255
    h, w = x0.shape[:2]
    Y0 = luma(x0)
    # 1. tone
    # Colour is measured on a copy blurred by a pixel or two, so noise cannot flip a pixel of skin to "wall" and back; then a small
    # closing fills any pinholes left in skin. Both reach only a few pixels, so nothing leaks over an outline (a wider smoothing did: a pale halo).
    xb = np.asarray(Image.fromarray((x0 * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(p['keep_blur'] * max(w, h)))).astype(np.float32) / 255
    Yb = luma(xb)
    chroma = xb.max(-1) - xb.min(-1)
    warm_rel = (xb[..., 0] - xb[..., 2]) / np.maximum(Yb, 0.06)         # skin stays warm even where it shines; a white wall does not
    keep = np.maximum(smoothstep(0.04, 0.20, warm_rel), smoothstep(0.10, 0.36, chroma))
    k = 2 * max(1, round(p['keep_close'] * max(w, h))) + 1
    km = Image.fromarray((keep * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(k)).filter(ImageFilter.MinFilter(k))
    keep = np.asarray(km.filter(ImageFilter.GaussianBlur(0.4 * p['keep_blur'] * max(w, h)))).astype(np.float32) / 255
    f_keep = Y0 ** p['gamma']
    f_neutral = f_keep / (1 + (f_keep / p['neutral_max']) ** p['neutral_pow']) ** (1 / p['neutral_pow'])
    x = x0 * (((f_neutral * (1 - keep) + f_keep * keep) / np.maximum(Y0, 1e-3))[..., None])
    x = np.clip((x - 0.015) / 0.985, 0, 1)
    s = x * x * (3 - 2 * x)
    x = np.clip(x + (s - x) * (p['contrast'] - 1) * 2.0, 0, 1)
    # 2. colour
    Y = luma(x)
    warm = np.maximum(np.clip((x[..., 0] - x[..., 2]) * 3.5, 0, 1) * 0.5, keep)
    x = Y[..., None] + (x - Y[..., None]) * (p['sat'] + p['warm_sat'] * warm)[..., None]
    sh = (1 - smoothstep(0.0, 0.38, Y))[..., None]
    mid = (smoothstep(0.02, 0.25, Y) * (1 - smoothstep(0.55, 0.95, Y)))[..., None]
    x = x + sh * np.array(p['shadow_tint'], np.float32) + mid * (1 - warm)[..., None] * np.array(p['mid_tint'], np.float32) * 0.6
    x = x + smoothstep(0.55, 0.98, Y)[..., None] * np.array(p['highlight_warm'], np.float32)
    # 3. light: an oval on the subject, darker toward the edges, a little darker top and bottom
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    fx, fy, rx, ry = light
    r = np.sqrt(((xx / w - fx) / rx) ** 2 + ((yy / h - fy) / ry) ** 2)
    shade = 1 - p['vig'] * smoothstep(p['vig_lo'], p['vig_hi'], r) ** p['vig_pow']
    shade = shade * (1 - p['top'] * (1 - smoothstep(0.0, 0.5, yy / h))) * (1 - p['bottom'] * smoothstep(0.7, 1.0, yy / h))
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
    ap.add_argument('--light', default='0.5,0.5,0.8,0.65', help='with --photo: the oval of light as x,y,half-width,half-height')
    a = ap.parse_args()
    only = [n for n in a.only.split(',') if n]
    os.makedirs(a.out, exist_ok=True)
    specs = PHOTOS
    if a.photo:
        if not a.name:
            raise SystemExit('--photo needs --name')
        specs = [dict(name=a.name, path=a.photo, aspect=a.aspect, cx=a.cx, cy=a.cy, zoom=a.zoom, width=a.width,
                      light=tuple(float(v) for v in a.light.split(',')), alt='')]
    for spec in specs:
        if only and spec['name'] not in only:
            continue
        crop, native = crop_to(source(spec, {'ray': a.ray, 'israel': a.israel}), spec['aspect'], spec['cx'], spec['cy'], spec['width'], spec.get('zoom', 1.0))
        p = dict(GRADE, **{k: spec[k] for k in GRADE if k in spec})
        out = grade(crop, spec['light'], p)
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
