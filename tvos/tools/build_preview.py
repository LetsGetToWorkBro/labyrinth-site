#!/usr/bin/env python3
"""Inline the brand marks into the browser preview.

The preview has to run as a single self-contained file — no network, no
sibling assets — so the three marks are baked in as data URIs.

Run from the repo root:  python3 tvos/tools/build_preview.py
"""
import base64
import io
import os

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CATALOG = os.path.join(ROOT, "tvos", "LabyrinthTimer", "LabyrinthTimer", "Assets.xcassets")
PREVIEW = os.path.join(ROOT, "tvos", "preview")


def data_uri(imageset, filename, longest_edge, tint=None):
    img = Image.open(os.path.join(CATALOG, imageset + ".imageset", filename)).convert("RGBA")
    k = longest_edge / max(img.size)
    img = img.resize((max(1, round(img.width * k)), max(1, round(img.height * k))), Image.LANCZOS)
    if tint:
        solid = Image.new("RGBA", img.size, tint + (255,))
        solid.putalpha(img.getchannel("A"))
        img = solid
    buf = io.BytesIO()
    img.save(buf, "PNG", optimize=True)
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()


with open(os.path.join(PREVIEW, "template.html")) as fh:
    html = fh.read()

# The marks ship white and are recoloured by CSS masks in the app; the two in
# the header are small enough to just bake at their final colour.
html = html.replace("__KANJI__", data_uri("KanjiMark", "KanjiMark@2x.png", 220, (240, 240, 240)))
html = html.replace("__WORD__", data_uri("Wordmark", "Wordmark@2x.png", 900, (200, 162, 76)))
html = html.replace("__RINGS__", data_uri("MazeRings", "MazeRings@1x.png", 700))

out = os.path.join(PREVIEW, "index.html")
with open(out, "w") as fh:
    fh.write(html)

print("preview written to %s (%.0f KB)" % (out, os.path.getsize(out) / 1024))
