#!/usr/bin/env python3
"""Apply the move of the academy from Fulshear to Richmond to a checkout of the labyrinth.vision repository.

    python3 move-richmond/apply_move.py --target /path/to/checkout                    dry run: do everything in a scratch copy, report, change nothing
    python3 move-richmond/apply_move.py --target /path/to/checkout --apply            do it: the same, and then copy the changed files into the checkout
    python3 move-richmond/apply_move.py --target /path/to/checkout --deck DECK.md     also write the copy deck (every sentence that changes, old and new)
    python3 move-richmond/apply_move.py --target . --work [--apply]                   the working branch's own files instead (listing master copies, flyer, caption guard)

WHAT THIS IS. The new address, the new coordinates and the wording that goes with them, written down now and applied in one go on the day. Nothing in
this folder is part of the site: it lives on the working branch only, and this script edits a SEPARATE checkout (a fresh worktree of main). Nothing on
the live site changes before then, which is the point: the Google profile and the site must change together, on the day the academy is at the new address.

HOW IT WORKS. It copies the checkout to a scratch folder (the photographs are linked, not copied), applies every rule there (rules.py), swaps in the
rewritten area pages (areas_data.py, through scripts/build_areas.py) and the rewritten neighborhoods guide (blog_neighborhoods.html), runs the site's own
generators so every generated page is rebuilt from the changed generators, restamps the assets, updates the sitemap, and then checks the RESULT, as the
visitor will see it. Only if every check passes does --apply copy the changed files into the checkout.

HOW IT IS SAFE. Every change is an exact old-text-to-new-text rule, applied to the pages AND to the generators that write them, so a later rebuild cannot
bring the old address back. A rule that matches nothing is an error (the page it was written for has changed: read it again). After the rules the script
checks that no trace of the old street, ZIP or coordinates is left (outside the lines that are about the past), that no sentence still says the academy is
in Fulshear, that every JSON-LD block parses, that the map pin, the geo tags and the structured data are one point, that the class times the new pages
quote are still on the timetable, that the pages that say "the Katy academy is nearer" are right about the measured distances, that the area pages are
still distinct from one another (the site test's doorway-page guard), and that regenerating changes nothing the rules wrote.

BEFORE THE DATE. --apply refuses before effective_date (move.json) unless --allow-early. The proof run (README.md) uses --allow-early on a throw-away
worktree. A dry run is always allowed, and is how you find out, weeks ahead, which sentence on the site has changed since these rules were written.
"""
import argparse
import ast
import datetime
import hashlib
import importlib.util
import json
import re
import shutil
import subprocess
import sys
import tempfile
from collections import Counter
from pathlib import Path

KIT = Path(__file__).resolve().parent
sys.path.insert(0, str(KIT))
import rules as R  # noqa: E402
import areas_data as A  # noqa: E402


def load_config():
    return json.loads((KIT / "move.json").read_text(encoding="utf-8"))


# ───────────────────────── tokens ─────────────────────────
def tokens(cfg):
    n, o = cfg["new"], cfg["old"]
    eff = datetime.date.fromisoformat(cfg["effective_date"])
    return {"street": n["street"], "unit": n["unit"], "unit_nbsp": n["unit"].replace(" ", "&nbsp;"), "zip": n["zip"], "city": n["city"],
            "moved": eff.strftime("%B %Y"), "old_street": o["street"], "old_unit": o["unit"], "old_zip": o["zip"]}


def fill(text, cfg):
    tk = tokens(cfg)
    for k, v in tk.items():
        text = text.replace("[[%s]]" % k, v)
    left = re.findall(r"\[\[(\w+)\]\]", text)
    if left:
        raise SystemExit("unknown token(s) in the kit's text: " + ", ".join(sorted(set(left))))
    return text


# ───────────────────────── the files ─────────────────────────
class Tree:
    """The files of a checkout that the move touches, read once and held in memory until write() puts them back."""

    def __init__(self, root):
        self.root = Path(root).resolve()
        self.cache = {}
        self.orig = {}

    def read(self, rel):
        if rel not in self.cache:
            with open(self.root / rel, encoding="utf-8", newline="") as f:
                s = f.read()
            self.cache[rel] = s
            self.orig[rel] = s
        return self.cache[rel]

    def expand(self, scopes, skip=()):
        out = []
        for name in scopes:
            for pat in R.SCOPES[name]:
                for p in sorted(self.root.glob(pat)):
                    rel = p.relative_to(self.root).as_posix()
                    if p.is_file() and rel not in out and not any(Path(rel).match(s) or rel == s for s in skip):
                        out.append(rel)
        return out

    def changed(self):
        return sorted(r for r, s in self.cache.items() if s != self.orig[r])

    def write(self):
        for rel in self.changed():
            with open(self.root / rel, "w", encoding="utf-8", newline="") as f:
                f.write(self.cache[rel])


def scratch_copy(root):
    """A working copy of the checkout. The photographs (assets/) are linked, not copied: nothing here writes to them."""
    tmp = Path(tempfile.mkdtemp(prefix="move-richmond-"))
    for entry in Path(root).iterdir():
        name = entry.name
        if name in (".git", "node_modules", "__pycache__", "move-richmond"):
            continue
        dst = tmp / name
        if name == "assets":
            dst.symlink_to(entry.resolve())
        elif entry.is_dir() and not entry.is_symlink():
            shutil.copytree(entry, dst, symlinks=True, ignore=shutil.ignore_patterns("__pycache__", "node_modules"))
        elif entry.is_symlink():
            continue
        else:
            shutil.copy2(entry, dst)
    return tmp


def changed_files(work, root):
    """Files whose bytes differ between the scratch copy and the checkout (new files included)."""
    out = []
    for p in sorted(Path(work).rglob("*")):
        if p.is_dir() or p.is_symlink() or "__pycache__" in p.parts:
            continue
        rel = p.relative_to(work)
        q = Path(root) / rel
        if not q.exists() or q.read_bytes() != p.read_bytes():
            out.append(rel.as_posix())
    return out


# ───────────────────────── the rules ─────────────────────────
def protected(line):
    return any(p.search(line) for p in R.PROTECT)


def block_lines(rel, text):
    """1-based line numbers inside the protected top-level blocks of a generator (R.PROTECT_BLOCKS): the event pages' renderers."""
    names = R.PROTECT_BLOCKS.get(rel)
    if not names:
        return set()
    try:
        module = ast.parse(text)
    except SyntaxError:
        return set()
    out = set()
    for node in module.body:
        if getattr(node, "name", None) in names:
            out.update(range(node.lineno, node.end_lineno + 1))
    return out


def apply_rule(tree, rule):
    """Apply one rule to every file in its scope. Returns {file: count}."""
    hits = {}
    for rel in tree.expand(rule.scope, rule.skip):
        t = tree.read(rel)
        if rule.regex:
            if not rule.old.search(t):
                continue
        elif rule.old not in t:
            continue
        out, n, held = [], 0, block_lines(rel, t)
        if rule.blocks and not held:
            continue
        for i, ln in enumerate(t.splitlines(keepends=True), 1):
            if (i not in held) if rule.blocks else (protected(ln) or i in held):
                out.append(ln)
                continue
            if rule.regex:
                ln2, k = rule.old.subn(rule.new, ln)
            else:
                k = ln.count(rule.old)
                ln2 = ln.replace(rule.old, rule.new) if k else ln
            out.append(ln2)
            n += k
        if n:
            tree.cache[rel] = "".join(out)
            hits[rel] = n
    return hits


def nearby(tree, rule, limit=3):
    """Where the words a failed rule was looking for are now: the first lines in its scope that start the same way, so the rule can be rewritten quickly."""
    if rule.regex:
        return []
    words = str(rule.old).split()
    for k in (6, 4, 3, 2):
        probe = " ".join(words[:k])
        if len(probe) < 8:
            continue
        found = []
        for rel in tree.expand(rule.scope, rule.skip):
            for i, ln in enumerate(tree.read(rel).splitlines(), 1):
                if probe in ln:
                    j = ln.index(probe)
                    found.append("%s:%d  ...%s..." % (rel, i, ln[max(0, j - 20): j + len(probe) + 90].strip()))
                    if len(found) >= limit:
                        return found
        if found:
            return found
    return []


def apply_rules(tree, cfg, verbose=True, work=False):
    problems, report = [], []
    for rule in R.build_rules(cfg):
        if rule.work != work:
            continue
        hits = apply_rule(tree, rule)
        total = sum(hits.values())
        ok = total >= rule.min
        report.append((rule, hits, total, ok))
        if not ok:
            near = nearby(tree, rule)
            problems.append("rule %s matched %d time(s), expected at least %d: %s%s" % (
                rule.id, total, rule.min, rule.note or str(rule.old)[:80],
                ("\n      the same words now read:\n        " + "\n        ".join(near)) if near else "\n      (nothing starting the same way is left in its scope: the sentence may be gone)"))
        if verbose:
            print("  %-4s %-34s %3d in %2d file(s)%s" % ("ok" if ok else "FAIL", rule.id, total, len(hits), "" if ok else "   <- NOTHING MATCHED"))
    return report, problems


# ───────────────────────── the parts that are written, not replaced ─────────────────────────
def install_areas(tree, cfg):
    """Swap the area pages' data for the post-move set, and patch the template and the hub in scripts/build_areas.py. Done in the generator's source,
    so a rebuild keeps it. Returns (message, problems)."""
    rel, problems = R.AREAS_FILE, []
    src = tree.read(rel)
    data = (KIT / "areas_data.py").read_text(encoding="utf-8")
    a = data.index("\n", data.index("# ---- BEGIN AREAS")) + 1
    b = data.index("# ---- END AREAS")
    block = fill(data[a:b], cfg).rstrip("\n")
    head = "# Ordered nearest first, which is also the order they appear on the hub.\n"
    try:
        i = src.index(head + "AREAS = [")
        j = src.index("\n]\n\n\ndef render(a):", i) + len("\n]")
        oi = tree.orig[rel].index(head + "AREAS = [")
        oj = tree.orig[rel].index("\n]\n\n\ndef render(a):", oi) + len("\n]")
    except ValueError:
        return "", ["scripts/build_areas.py no longer has the AREAS list where install_areas looks for it: read the file and update install_areas"]
    was = tree.orig[rel][oi:oj]
    if sha(was) != R.AREAS_BASE_SHA:
        problems.append("the area pages in scripts/build_areas.py are not the ones the kit was written against (hash %s, expected %s): somebody has edited them since. "
                        "Read `git log -p -- scripts/build_areas.py`, carry any edit worth keeping into areas_data.py, then set AREAS_BASE_SHA in rules.py to %s" % (sha(was), R.AREAS_BASE_SHA, sha(was)))
    unknown = sorted(set(re.findall(r'"slug": "([^"]+)"', was)) - set(re.findall(r'"slug": "([^"]+)"', block)))
    if unknown:
        problems.append("scripts/build_areas.py has area pages the kit does not write (%s): they would be deleted from the generator. Add them to areas_data.py or retire them on purpose" % ", ".join(unknown))
    src = src[:i] + head + block + src[j:]
    for pid, old, new in R.AREA_PATCHES:
        n = src.count(old)
        if n != 1:
            problems.append("build_areas patch %s: the text it replaces occurs %d time(s), expected 1: %s" % (pid, n, old[:70].replace("\n", " ")))
        else:
            src = src.replace(old, fill(new, cfg))
    for dead in ('a["which"]', "%(nearer)s", "%(address)s"):
        if dead in src:
            problems.append("build_areas.py still uses %s after the patches" % dead)
    tree.cache[rel] = src
    slugs = re.findall(r'"slug": "([^"]+)"', block)
    return "area pages: %d pages written into build_areas.py (%s), %d template patches" % (len(slugs), ", ".join(s.replace("bjj-", "") for s in slugs), len(R.AREA_PATCHES)), problems


def sha(text):
    return hashlib.sha256(text.encode("utf-8")).hexdigest()[:16]


def install_blog_posts(tree, cfg):
    problems, notes = [], []
    for post in R.BLOG_POSTS:
        rel = post["file"]
        t = tree.read(rel)
        open_tag, close_tag = '<article class="article-body">\n', "\n    </article>"
        try:
            i = t.index(open_tag) + len(open_tag)
            j = t.index(close_tag, i)
            oi = tree.orig[rel].index(open_tag) + len(open_tag)
            oj = tree.orig[rel].index(close_tag, oi)
        except ValueError:
            problems.append("%s: no <article class=\"article-body\"> to replace" % rel)
            continue
        was = tree.orig[rel][oi:oj]
        if sha(was) != post["base_sha"]:
            problems.append("%s has been edited since the kit was written (body hash %s, expected %s): read `git log -p -- %s`, carry any edit worth keeping into %s, then set base_sha in rules.py to %s" % (
                rel, sha(was), post["base_sha"], rel, post["body_file"], sha(was)))
        body = fill((KIT / post["body_file"]).read_text(encoding="utf-8"), cfg).rstrip("\n")
        t = t[:i] + body + "\n" + t[j:]
        for old, new in post["patches"](cfg):
            if t.count(old) != 1:
                problems.append("%s: patch text occurs %d time(s), expected 1: %s" % (rel, t.count(old), old[:70]))
            else:
                t = t.replace(old, new)
        tree.cache[rel] = t
        notes.append("rewrote the body of " + rel)
    return "; ".join(notes) or "no blog posts to rewrite", problems


# ───────────────────────── regenerate ─────────────────────────
# new-posts.py is NOT run: its posts have been edited by hand since. build_wharton.py is run to prove the Wharton site does not change.
# build_llms.py comes after the generators whose pages it lists (the area pages and the articles change in the move), so llms.txt names them as they will be.
GENERATORS = ["build_pages.py", "build_programs.py", "build_areas.py", "build_blog_index.py", "build_llms.py", "build_wharton.py"]


def regenerate(root):
    out = []
    for g in GENERATORS:
        r = subprocess.run([sys.executable, "scripts/" + g], cwd=root, capture_output=True, text=True)
        out.append((g, r.returncode, (r.stdout + r.stderr).strip().splitlines()[-1:] or [""]))
    r = subprocess.run([sys.executable, "scripts/stamp_assets.py"], cwd=root, capture_output=True, text=True)
    out.append(("stamp_assets.py", r.returncode, (r.stdout + r.stderr).strip().splitlines()[-1:] or [""]))
    return out


def drift_detail(was, now, n=3):
    """The first few lines that differ between what the rules left in a page and what the generator wrote over it."""
    import difflib
    out = []
    for ln in difflib.unified_diff(was.splitlines(), now.splitlines(), lineterm="", n=0):
        if ln.startswith(("---", "+++", "@@")):
            continue
        out.append("      " + ln[:200])
        if len(out) >= 2 * n:
            break
    return "\n".join(out)


def digest(root, rels):
    return {r: hashlib.sha256((Path(root) / r).read_bytes()).hexdigest() for r in rels if (Path(root) / r).exists()}


def tree_digest(root, sub):
    base = Path(root) / sub
    return {p.relative_to(root).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(base.rglob("*")) if p.is_file()} if base.exists() else {}


# ───────────────────────── the sitemap ─────────────────────────
def page_file(loc):
    path = re.sub(r"^https://labyrinth\.vision", "", loc)
    if path in ("", "/"):
        return "index.html"
    if path.endswith("/"):
        return path.lstrip("/") + "index.html"
    return path.lstrip("/") + ".html"


def update_sitemap(work, root, cfg):
    """Add the Fulshear area page, and give every page the move changed the date of the move as its lastmod."""
    p = Path(work) / "sitemap.xml"
    if not p.exists():
        return ["no sitemap.xml"]
    s = p.read_text(encoding="utf-8")
    problems = []
    anchor = "  <url>\n    <loc>https://labyrinth.vision/areas/bjj-tamarron</loc>"
    if "areas/bjj-fulshear" not in s:
        if s.count(anchor) != 1:
            problems.append("sitemap.xml: cannot find the area entry to put the Fulshear page before")
        else:
            s = s.replace(anchor, "  <url>\n    <loc>https://labyrinth.vision/areas/bjj-fulshear</loc>\n    <lastmod>2000-01-01</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>\n" + anchor)
    day = cfg["effective_date"]

    stamp = re.compile(rb"\?v=[0-9a-f]{8}")        # a page whose only change is a new asset version stamp has not changed in any way a crawler cares about

    def touch(m):
        loc = m.group(2)
        f = page_file(loc)
        a, b = Path(work) / f, Path(root) / f
        if a.exists() and (not b.exists() or stamp.sub(b"", a.read_bytes()) != stamp.sub(b"", b.read_bytes())):
            return m.group(1) + loc + m.group(3) + day + m.group(4)
        return m.group(0)

    s = re.sub(r"(<loc>)(https://labyrinth\.vision[^<]*)(</loc>\s*<lastmod>)[^<]*(</lastmod>)", touch, s)
    s = s.replace("<lastmod>2000-01-01</lastmod>", "<lastmod>%s</lastmod>" % day)
    p.write_text(s, encoding="utf-8")
    return problems


# ───────────────────────── the checks (on the result) ─────────────────────────
def live_files(tree):
    return tree.expand(["pages", "event_pages", "generators", "js", "text", "tests", "wharton"])


def rendered_files(tree):
    """What visitors and crawlers read (the generators' strings reach them through the pages, and regenerating proves the two agree)."""
    return tree.expand(["pages", "js", "text"])


def leftovers(tree, cfg, files=None):
    """Everything that still names the old street, ZIP or coordinates, outside protected lines and the event pages' own words."""
    old = cfg["old"]
    first = old["street"].split(" ")
    pats = [re.escape(first[0] + " " + first[1]), r"Cross Creek Bend", str(old["zip"]), re.escape(str(old["lat"])), re.escape(str(old["lng"]))]
    rx = re.compile("|".join(pats))
    out = []
    for rel in (live_files(tree) if files is None else files):
        if rel in R.EVENT_FILES or rel in R.STALE_SEEDS:
            continue
        text = tree.read(rel)
        held = block_lines(rel, text)
        for i, ln in enumerate(text.splitlines(), 1):
            if rx.search(ln) and not protected(ln) and i not in held and not any(k.search(ln) for k in R.OLD_ADDRESS_OK):
                out.append((rel, i, ln.strip()[:170]))
    return out


FUL = re.compile(r"Fulshear")


def fulshear_review(tree):
    """Every remaining mention of Fulshear that is not on the keep list: a person must look at each one before the push."""
    out = []
    for rel in rendered_files(tree):
        if any(Path(rel).match(k) for k in R.KEEP_FILES):
            continue
        for i, ln in enumerate(tree.read(rel).splitlines(), 1):
            if protected(ln) or any(k.search(ln) for k in R.KEEP_LINE):
                continue
            for m in FUL.finditer(ln):
                ctx = ln[max(0, m.start() - 60): m.end() + 60]
                if any(k.search(ctx) for k in R.KEEP):
                    continue
                out.append((rel, i, re.sub(r"\s+", " ", ctx.strip())))
    return out


def stale_claims(tree):
    """A sentence that still says the academy is in Fulshear (the keep list cannot excuse these)."""
    out = []
    for rel in rendered_files(tree):
        for i, ln in enumerate(tree.read(rel).splitlines(), 1):
            if protected(ln):
                continue
            for s in R.STALE:
                m = s.search(ln)
                if m and not any(k.search(ln[max(0, m.start() - 40): m.end() + 40]) for k in R.STALE_OK):
                    out.append((rel, i, re.sub(r"\s+", " ", ln[max(0, m.start() - 40): m.end() + 40].strip())))
    return out


def jsonld_problems(tree, only):
    bad = []
    for rel in only:
        if not rel.endswith(".html") or not (tree.root / rel).exists():
            continue
        for m in re.finditer(r'<script type="application/ld\+json">(.*?)</script>', tree.read(rel), re.S):
            try:
                json.loads(m.group(1))
            except Exception as e:  # noqa: BLE001
                bad.append("%s: a JSON-LD block no longer parses (%s)" % (rel, str(e)[:60]))
    return bad


def new_address_present(tree, cfg):
    n = cfg["new"]
    want = {
        "index.html": ["%s, %s" % (n["street"], n["unit"]), n["zip"], "%.6f" % n["lat"], "%.6f" % n["lng"]],
        "llms.txt": [n["street"], n["zip"]],
        "app.js": ["%.6f" % n["lat"], "%.6f" % n["lng"], n["street"]],
    }
    bad = []
    for rel, needles in want.items():
        if (tree.root / rel).exists():
            t = tree.read(rel)
            for needle in needles:
                if needle not in t:
                    bad.append("%s no longer has %r" % (rel, needle))
    return bad


def one_point(tree, cfg):
    """The map pin (app.js), the geo tags and both structured-data blocks (index.html) are the new point and nothing else."""
    n, bad = cfg["new"], []
    js, home = tree.read("app.js"), tree.read("index.html")
    m = re.search(r"GYM_FULSHEAR = \{ lat: (-?[\d.]+), lng: (-?[\d.]+) \}", js)
    if not m or (float(m.group(1)), float(m.group(2))) != (n["lat"], n["lng"]):
        bad.append("app.js GYM_FULSHEAR is %s, not the new point" % (m.groups() if m else None))
    for name, rx in (("geo.position", r'name="geo\.position" content="(-?[\d.]+);(-?[\d.]+)"'), ("ICBM", r'name="ICBM" content="(-?[\d.]+), (-?[\d.]+)"')):
        m = re.search(rx, home)
        if not m or (float(m.group(1)), float(m.group(2))) != (n["lat"], n["lng"]):
            bad.append("index.html %s tag is %s, not the new point" % (name, m.groups() if m else None))
    pts = [(float(a), float(b)) for a, b in re.findall(r'"latitude": (-?[\d.]+),\s*"longitude": (-?[\d.]+)', home)]
    if not pts or any(p != (n["lat"], n["lng"]) for p in pts if abs(p[0] - cfg["old"]["lat"]) < 0.5 and abs(p[1] - cfg["old"]["lng"]) < 0.5):
        bad.append("index.html structured data has a point that is not the new one: %s" % pts)
    return bad


def schedule_problems(root):
    """Every class time the new area pages quote must still be on the timetable the site publishes."""
    f = Path(root) / "scripts" / "schedule_data.py"
    spec = importlib.util.spec_from_file_location("schedule_data_target", f)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    bad = []
    for days, time, name, ages, aud in A.CLAIMS:
        for d in days:
            ok = any(c[0] == d and c[1] == time and (name is None or c[2] == name) and (ages is None or c[3] == ages) and (aud is None or c[5] in (aud, "all"))
                     for c in mod.CLASSES)
            if not ok:
                bad.append("the area pages quote %s %s %s %s%s but scripts/schedule_data.py has no such class" % (d, time, name or "(any class)", ages or "", " (" + aud + ")" if aud else ""))
    return bad


def nearer_problems():
    """Which academy each area page says is nearer, against the measured distances."""
    both = json.loads((KIT / "routes_both.json").read_text(encoding="utf-8"))
    bad = []
    for slug, says in A.NEARER.items():
        r = both[A.MEASURED_AS[slug]]
        rich, katy = r["richmond"][0], r["katy"][0]
        truth = "level" if abs(rich - katy) < 1.0 else ("richmond" if rich < katy else "katy")
        if truth != says:
            bad.append("%s says the %s academy is nearer, but the measured road miles are %.1f to Hidden Lake Ln and %.1f to Katy" % (slug, says, rich, katy))
    return bad


def doorway_problems(root):
    """The site test's doorway-page guard (L1f) and its no-invented-location guard (L1g), run here so a failure shows before the browser suites."""
    sets, bad = [], []
    for p in sorted((Path(root) / "areas").glob("*.html")):
        if p.name == "index.html":
            continue
        f = p.read_text(encoding="utf-8")
        loc = re.search(r'"@type":\s*"(?:LocalBusiness|SportsActivityLocation)"[\s\S]{0,400}"addressLocality":\s*"(?!Richmond)', f)
        if loc:
            bad.append("%s: a business block gives a town other than Richmond (the site test would call it an invented location)" % p.name)
        f = re.sub(r"<script[\s\S]*?</script>", "", f)
        f = re.sub(r"<(nav|footer|head)\b[\s\S]*?</\1>", "", f)
        text = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", f)).lower()
        sets.append({x.strip() for x in re.split(r"(?<=[.!?]) ", text) if len(x.strip()) > 40})
    counts = Counter(s for ss in sets for s in ss)
    shared = [s for s, n in counts.items() if n > 1]
    if len(shared) > 6 or len(counts) < 100:
        bad.append("the area pages are not distinct enough: %d shared sentences (cap 6) across %d distinct (need 100): %s" % (len(shared), len(counts), "; ".join(s[:60] for s in shared[:4])))
    return bad, (len(sets), len(shared), len(counts))


def spelling_problems(tree, only):
    """The site is American English with no dashes in running copy (the Wharton test checks the same on its pages)."""
    bad = []
    rx = re.compile(r"\b(centre|neighbour\w*|colour\w*|metre|kilometre)\b|—")
    for rel in only:
        if rel.startswith("areas/") or rel == "blog/jiu-jitsu-near-fulshear-neighborhoods.html":
            body = re.sub(r"<script[\s\S]*?</script>", "", tree.read(rel))
            for m in rx.finditer(re.sub(r"<[^>]+>", " ", body)):
                bad.append("%s: %r" % (rel, m.group(0)))
    return bad


# ───────────────────────── the copy deck ─────────────────────────
def write_deck(path, report, cfg):
    n, o = cfg["new"], cfg["old"]
    lines = ["# The move to Richmond: every change in the copy", "",
             "New address: **%s, %s, %s, %s %s**. Phone unchanged: %s. Effective %s (tentative)." % (n["street"], n["unit"], n["city"], n["state"], n["zip"], cfg["phone"], cfg["effective_date"]), "",
             "Each block is one rule: what it replaces, what it puts there, and where it applied in the dry run. Edit `rules.py` to change any of them.",
             "The area pages are written in `areas_data.py` and the neighborhoods guide in `blog_neighborhoods.html`; read those files for their sentences.", ""]
    for rule, hits, total, ok in report:
        if not rule.old or rule.hidden:
            continue
        old = rule.old.pattern if rule.regex else rule.old
        lines += ["### %s  (%d change%s in %d file%s)" % (rule.id, total, "" if total == 1 else "s", len(hits), "" if len(hits) == 1 else "s"),
                  rule.note and "_%s_" % rule.note or "",
                  "- old: `%s`" % old.replace("`", "'")[:300], "- new: `%s`" % (rule.new if isinstance(rule.new, str) else "(computed)").replace("`", "'")[:300],
                  "- files: " + (", ".join(sorted(hits)[:12]) + (" …" if len(hits) > 12 else "") or "none"), ""]
    Path(path).write_text("\n".join(lines) + "\n", encoding="utf-8")


# ───────────────────────── main ─────────────────────────
def show(title, items, limit=30):
    print("%-58s %d" % (title, len(items)))
    for x in items[:limit]:
        print("   " + (("%s:%d  %s" % x) if isinstance(x, tuple) else x))
    if len(items) > limit:
        print("   … and %d more" % (len(items) - limit))


def work_main(a, cfg, root):
    """The working branch's own files. They are not on main (everything on main is public), so they have their own pass, run on the branch checkout."""
    tree = Tree(root)
    print("Rules for the working files (%s):" % ("applying" if a.apply else "dry run"))
    report, problems = apply_rules(tree, cfg, verbose=not a.quiet, work=True)
    files = tree.expand(R.WORK)
    left = leftovers(tree, cfg, files)
    show("Old street, ZIP or coordinates still present in the working files:", left)
    for m in problems:
        print("PROBLEM: " + m)
    failed = bool(problems or left)
    if failed:
        print("\nNothing was changed: fix the problems above first." if a.apply else "\nThe dry run found problems (above). Nothing was changed.")
    elif a.apply:
        tree.write()
        print("\nChanged: " + ", ".join(tree.changed()))
    else:
        print("\nDry run clean. Would change: " + ", ".join(tree.changed()))
    return 1 if failed else 0


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--target", required=True, help="a checkout of the website repository (a fresh worktree of main)")
    ap.add_argument("--apply", action="store_true", help="copy the changed files into the checkout when every check passes (default: dry run)")
    ap.add_argument("--allow-early", action="store_true", help="apply before the effective date (the proof run does)")
    ap.add_argument("--deck", help="write the copy deck (markdown) to this path")
    ap.add_argument("--quiet", action="store_true")
    ap.add_argument("--keep", action="store_true", help="keep the scratch copy and print where it is")
    ap.add_argument("--work", action="store_true", help="instead of the site: the working branch's own files (the adult-classes flyer, the photo-caption guard, the listing master copy)")
    a = ap.parse_args()
    cfg = load_config()
    root = Path(a.target).resolve()
    if not (root / "index.html").exists() or not (root / "scripts" / "build_pages.py").exists():
        sys.exit("%s is not a checkout of the website repository" % root)
    today, eff = datetime.date.today(), datetime.date.fromisoformat(cfg["effective_date"])
    if a.apply and today < eff and not a.allow_early:
        sys.exit("Refusing to apply: today is %s and the move is on %s. The Google profile and the site must change on the same day. Use --allow-early only on a throw-away checkout." % (today, eff))

    if a.work:
        sys.exit(work_main(a, cfg, root))

    work = scratch_copy(root)
    code = 1
    try:
        tree = Tree(work)
        print("Rules (%s, in a scratch copy):" % ("applying" if a.apply else "dry run"))
        report, problems = apply_rules(tree, cfg, verbose=not a.quiet)
        for fn in (install_areas, install_blog_posts):
            msg, probs = fn(tree, cfg)
            print("  " + (msg or "(nothing)"))
            problems += probs
        tree.write()
        # app.js changed, so every page that loads it needs a new ?v= stamp: do that first, so the comparison below is about the words and not the stamps
        subprocess.run([sys.executable, "scripts/stamp_assets.py"], cwd=work, capture_output=True, text=True)
        written = [r for r in tree.changed() if not r.startswith("areas/")]
        before, wharton_before = digest(work, written), tree_digest(work, "wharton-site")
        before_text = {r: (Path(work) / r).read_text(encoding="utf-8") for r in written}

        print("\nRegenerating (in the scratch copy):")
        for g, c, tail in regenerate(work):
            print("  %-18s exit %d  %s" % (g, c, tail[0][:90] if tail else ""))
            if c:
                problems.append("%s failed: the generators and the rules disagree about the text they share (read its error above)" % g)
        for r in [r for r in written if before[r] != digest(work, [r]).get(r)]:
            problems.append("regenerating changed %s, so a generator and the page the rules edited disagree:\n%s" % (r, drift_detail(before_text[r], (Path(work) / r).read_text(encoding="utf-8"))))
        problems += update_sitemap(work, root, cfg)
        # scripts/page_dates.py owns every page's date (site-test fails if a changed page has not been dated): the pages the move changed get the day of the move
        r = subprocess.run([sys.executable, "scripts/page_dates.py", "--date", cfg["effective_date"]], cwd=work, capture_output=True, text=True)
        if r.returncode:
            problems.append("scripts/page_dates.py failed: " + (r.stdout + r.stderr).strip()[-300:])

        final = Tree(work)
        changed = changed_files(work, root)
        wharton_changed = [r for r, h in tree_digest(work, "wharton-site").items() if wharton_before.get(r) != h]
        left, stale, review = leftovers(final, cfg), stale_claims(final), fulshear_review(final)
        bad_json = jsonld_problems(final, changed)
        missing = new_address_present(final, cfg) + one_point(final, cfg)
        sched, nearer = schedule_problems(work), nearer_problems()
        doorway, (npages, nshared, ndistinct) = doorway_problems(work)
        spelling = spelling_problems(final, changed)

        print("\n%d file(s) %s." % (len(changed), "would change" if not a.apply else "changed in the scratch copy"))
        show("Old street, ZIP or coordinates still present:", left)
        show("Sentences that still put the academy in Fulshear:", stale)
        show("Fulshear mentions to read before the push:", review, 80)
        show("Class times the area pages quote that are not on the timetable:", sched)
        show("Area pages that say the wrong academy is nearer:", nearer)
        show("Area pages too alike (%d pages, %d shared sentences, %d distinct):" % (npages, nshared, ndistinct), doorway)
        show("British spelling or dashes in the new copy:", spelling)
        for m in bad_json + missing + problems:
            print("PROBLEM: " + m)
        if wharton_changed:
            print("NOTE: the Wharton site changed in %d file(s) (it should not): %s" % (len(wharton_changed), ", ".join(wharton_changed[:6])))

        if a.deck:
            write_deck(a.deck, report, cfg)
            print("copy deck written to " + a.deck)

        failed = bool(problems or left or stale or bad_json or missing or sched or nearer or doorway or spelling)
        if failed:
            print("\n%s" % ("Not changing the checkout: fix the problems above first." if a.apply else "The dry run found problems (above). Nothing was changed."))
        elif a.apply:
            for rel in changed:
                dst = root / rel
                dst.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(Path(work) / rel, dst)
            print("\nApplied: %d file(s) in %s are now the post-move versions. Review `git diff`, run the suites, then publish." % (len(changed), root))
        else:
            print("\nDry run clean. %d file(s) would change. Run again with --apply to change the checkout." % len(changed))
        code = 1 if failed else 0
    finally:
        if a.keep:
            print("scratch copy kept at " + str(work))
        else:
            shutil.rmtree(work, ignore_errors=True)
    sys.exit(code)


if __name__ == "__main__":
    main()
