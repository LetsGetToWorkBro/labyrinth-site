#!/usr/bin/env python3
"""Apply the move of the academy from Fulshear to Richmond to a checkout of the CRM repository (labyrinth-app).

    python3 move-richmond/crm/apply_crm.py --target /path/to/labyrinth-app                  dry run: everything in a scratch copy, the CRM's own tests included, nothing changed
    python3 move-richmond/crm/apply_crm.py --target /path/to/labyrinth-app --apply          the same, and then copy the changed files into the checkout
    python3 move-richmond/crm/apply_crm.py --target ... --patch OUT.patch                   also write the change as a patch (git apply -p1)

The edits are exact old-text-to-new-text pairs (edits.py). A pair that matches nothing stops the script: the CRM has changed since the pairs were written,
and the file has to be read again. After the edits it regenerates the pricing bundle the renewal job runs (scripts/build-renewal-core.mjs), re-pins the
golden hashes of the tests that say "a Fulshear lead's mail does not change by a byte" (their output changes on purpose: it carries the new address), then
runs the type check and every test the CRM's `npm test` runs. Only if all of that passes does --apply copy the files back. The CRM repository is not this
session's to push to: the result is a patch and a script, to be applied by whoever has the CRM checkout on the day.

Refuses to apply before effective_date (../move.json) unless --allow-early. crm/move-day.sql is the database half (settings.data.address) and is not run by this.
"""
import argparse
import datetime
import json
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
KIT = HERE.parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(KIT))
import edits as E  # noqa: E402
import apply_move as M  # noqa: E402  (tokens() and fill(): the same words as the site's)

SKIP_COPY = {".git", "dist", "android", "ios", "__pycache__", "node_modules"}
GOLDEN_TESTS = ["trial-location", "member-emails", "trial-lifecycle", "member-lifecycle"]


def scratch_copy(root):
    tmp = Path(tempfile.mkdtemp(prefix="move-richmond-crm-"))
    for entry in Path(root).iterdir():
        if entry.name in SKIP_COPY:
            continue
        dst = tmp / entry.name
        if entry.is_dir():
            shutil.copytree(entry, dst, symlinks=True, ignore=shutil.ignore_patterns("__pycache__"))
        else:
            shutil.copy2(entry, dst)
    # A real copy of node_modules, not a link: esbuild writes the path of each module it bundles into the bundle, so a linked folder would make the
    # regenerated renewal bundle differ from the committed one in every comment.
    subprocess.run(["cp", "-a", "--reflink=auto", str(Path(root) / "node_modules"), str(tmp / "node_modules")], check=True)
    return tmp


def run(cmd, cwd, **kw):
    return subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, **kw)


def apply_edits(work, cfg, problems):
    n = 0
    for group in (E.CODE, E.TESTS, E.DOCS):
        for item in group:
            path, old, new = item[0], item[1], item[2]
            f = Path(work) / path
            if not f.exists():
                problems.append("%s: the file is not there" % path)
                continue
            text = f.read_text(encoding="utf-8")
            old, new = M.fill(old, cfg), M.fill(new, cfg)
            k = text.count(old)
            if k != 1:
                problems.append("%s: the text to replace occurs %d time(s), expected 1: %s" % (path, k, old[:90].replace("\n", " ")))
                continue
            f.write_text(text.replace(old, new), encoding="utf-8")
            n += 1
    return n


# ───────────────────────── the golden hashes ─────────────────────────
def regen_trial_location(work, problems):
    """scripts/trial-location.test.mjs pins a hash of every rendered trial email and text for the primary gym."""
    f = Path(work) / "scripts/trial-location.test.mjs"
    src = f.read_text(encoding="utf-8")
    a = src.index("const GOLDEN = {")
    probe = src[:a] + """
const NEW = {}
for (const program of ['Adult BJJ', 'Kids 3-6']) for (const kind of kinds) NEW[`${program}|${kind}`] = h(JSON.stringify(mail(kind, lead({ program }))))
for (const program of ['Adult BJJ', 'Kids 3-6', '']) NEW[`sms|${program}`] = h(JSON.stringify(trial.renderTrialSms(lead({ program }), GYM)))
console.log('@@GOLDEN ' + JSON.stringify(NEW))
process.exit(0)
"""
    return rewrite_golden(work, f, src, probe, lambda key: re.compile(r'(%s: ")[0-9a-f]{16}(")' % re.escape('"%s"' % key)), problems)


def regen_member_emails(work, problems):
    """scripts/member-emails.test.mjs pins a hash of every welcome, win-back and birthday email for the primary gym."""
    f = Path(work) / "scripts/member-emails.test.mjs"
    src = f.read_text(encoding="utf-8")
    a = src.index("const GOLDEN = {")
    # Every pinned kind in the file: GOLDEN (the welcome, win-back and birthday mail) and CARD_NOTICES (the payment notices, whose pinned hash is the
    # same render with no reason given). A pin this does not know about fails the suite after the move, and the dry run says which.
    keys = re.findall(r"'([a-z_0-9]+\|(?:adult|kid))': '[0-9a-f]{16}'", src)
    probe = src[:a] + """
const NEW = {}
for (const key of %s) {
  const [kind, who] = key.split('|')
  NEW[key] = h(JSON.stringify(member.renderMemberEmail(kind, { first_name: 'Emma', kid: who === 'kid', amountOwed: 399, age: 9 }, GYM, UNSUB)))
}
console.log('@@GOLDEN ' + JSON.stringify(NEW))
process.exit(0)
""" % json.dumps(keys)
    return rewrite_golden(work, f, src, probe, lambda key: re.compile(r"(%s: ')[0-9a-f]{16}(')" % re.escape("'%s'" % key)), problems)


def rewrite_golden(work, f, src, probe, pattern, problems):
    p = Path(work) / "scripts/_golden_probe.mjs"
    p.write_text(probe, encoding="utf-8")
    r = run(["node", str(p.relative_to(work))], work)
    p.unlink()
    m = re.search(r"@@GOLDEN (\{.*\})", r.stdout)
    if not m:
        problems.append("%s: could not compute the new golden hashes: %s" % (f.name, (r.stdout + r.stderr)[-300:]))
        return 0
    new = json.loads(m.group(1))
    for key, h in new.items():
        rx = pattern(key)
        if len(rx.findall(src)) != 1:
            problems.append("%s: golden entry %r not found exactly once" % (f.name, key))
            continue
        src = rx.sub(lambda mm: mm.group(1) + h + mm.group(2), src)
    f.write_text(src, encoding="utf-8")
    return len(new)


def regen_captured(work, name, block, problems):
    """The tests that send eight emails through the real handler pin a hash of each one. They print the hashes with CAPTURE=1; `block` finds the pinned list."""
    f = Path(work) / ("scripts/%s.test.mjs" % name)
    src = f.read_text(encoding="utf-8")
    r = run(["node", "scripts/%s.test.mjs" % name], work, env={**__import__("os").environ, "CAPTURE": "1"})
    m = re.search(r'"mails": \[([^\]]*)\]', r.stdout)
    if not m:
        problems.append("%s.test.mjs: CAPTURE=1 printed no mail hashes" % name)
        return 0
    new = re.findall(r'"([0-9a-f]{16})"', m.group(1))
    blk = re.search(block, src)
    if not blk:
        problems.append("%s.test.mjs: the pinned list of mail hashes was not found" % name)
        return 0
    old = re.findall(r"'([0-9a-f]{16})'", blk.group(1))
    if len(old) != len(new):
        problems.append("%s.test.mjs: %d hashes pinned, %d mails sent" % (name, len(old), len(new)))
        return 0
    text = blk.group(1)
    for o, n in zip(old, new):
        text = text.replace("'%s'" % o, "'%s'" % n, 1)
    f.write_text(src.replace(blk.group(1), text, 1), encoding="utf-8")
    return len(new)


def regen_trial_lifecycle(work, problems):
    """scripts/trial-lifecycle.test.mjs pins a hash of each of the eight emails one tick sends."""
    return regen_captured(work, "trial-lifecycle", r"mails: \[\n((?:\s+'[0-9a-f]{16}',?[ ]*)+\n)\s*\],", problems)


def regen_member_lifecycle(work, problems):
    """scripts/member-lifecycle.test.mjs does the same for the member mail one tick sends."""
    return regen_captured(work, "member-lifecycle", r"summary\.mails, \[\n((?:\s+'[0-9a-f]{16}',?[ ]*)+\n)\s*\]\)", problems)


# ───────────────────────── the checks ─────────────────────────
def run_tests(work, jobs=3, only=None, ignore=()):
    """Every test the CRM's `npm test` runs (it skips redirect-loop), `jobs` at a time: the suite is 270 files and some open a browser, so one after another
    it is hours. `only` runs just the named tests (a name with or without .test.mjs), for re-running what failed; `ignore` names tests that fail for a reason
    that is the machine's, not the move's (ci-workflow, on a machine with no PGlite)."""
    from concurrent.futures import ThreadPoolExecutor
    tests = sorted(Path(work).glob("scripts/*.test.mjs")) + sorted(Path(work).glob("integrations/website-booking/*.test.mjs"))
    tests = [t for t in tests if "redirect-loop" not in t.name]
    if only:
        want = {x.replace(".test.mjs", "") for x in only}
        tests = [t for t in tests if t.name.replace(".test.mjs", "") in want]

    def one(t):
        r = run(["timeout", "900", "node", str(t.relative_to(work))], work)
        if r.returncode and t.name.replace(".test.mjs", "") not in set(ignore):
            return (t.name, [ln for ln in (r.stdout + r.stderr).splitlines() if re.search(r"FAIL|Error|error|expected|got |want ", ln)][:6])
        return None

    with ThreadPoolExecutor(max_workers=max(1, jobs)) as ex:
        failed = [x for x in ex.map(one, tests) if x]
    return len(tests), failed


# Lines that may still name the old address: the constant that keeps it on purpose, the tests that assert it is gone, and the import test's invented sample.
ALLOWED = [re.compile(x) for x in (r"FORMER_FULSHEAR_ADDRESS", r"building C\|Suite #400", r"Suite #400\|building C", r"never the Fulshear address, building C",
                                   r"Suite #400\|\\\(281\\\)")]
ALLOWED_FILES = {"scripts/gymdesk-import.test.mjs"}


def leftovers(work, cfg):
    """Every place in the code that still names the old street, and any 'building C' directions."""
    old = cfg["old"]["street"].split(" ")
    rx = re.compile(re.escape(old[0] + " " + old[1]) + r"|Cross Creek Bend|front of building C|Suite #400")
    out = []
    for p in sorted(list(Path(work).glob("src/**/*")) + list(Path(work).glob("supabase/functions/**/*")) + list(Path(work).glob("scripts/*.mjs")) + list(Path(work).glob("docs/*.md"))):
        if not p.is_file() or p.suffix not in (".ts", ".tsx", ".js", ".mjs", ".md"):
            continue
        rel = p.relative_to(work).as_posix()
        if rel in ALLOWED_FILES:
            continue
        for i, ln in enumerate(p.read_text(encoding="utf-8").splitlines(), 1):
            if rx.search(ln) and not any(a.search(ln) for a in ALLOWED):
                out.append((rel, i, ln.strip()[:150]))
    return out


def changed_files(work, root):
    out = []
    for p in sorted(Path(work).rglob("*")):
        if not p.is_file() or "node_modules" in p.parts or "__pycache__" in p.parts:
            continue
        q = Path(root) / p.relative_to(work)
        if not q.exists() or q.read_bytes() != p.read_bytes():
            out.append(p.relative_to(work).as_posix())
    return out


def write_patch(path, work, root, rels):
    chunks = []
    for rel in rels:
        old, new = Path(root) / rel, Path(work) / rel
        r = subprocess.run(["diff", "-u", "--label", "a/" + rel, "--label", "b/" + rel, str(old) if old.exists() else "/dev/null", str(new)], capture_output=True, text=True)
        chunks.append(r.stdout)
    Path(path).write_text("".join(chunks), encoding="utf-8")


def move_day_sql(cfg):
    """The database half: the one stored copy of the address (checked 2026-10-15: settings.data -> address, and nowhere else outside history)."""
    n, o = cfg["new"], cfg["old"]
    new_addr = "%s, %s, %s, %s %s" % (n["street"], n["unit"], n["city"], n["state"], n["zip"])
    old_addr = "%s, %s, %s, %s %s" % (o["street"], o["unit"], o["city"], o["state"], o["zip"])
    return """-- The academy's address in the CRM's database, for move day (%(day)s).
-- Run it in the Supabase SQL editor of the project "Labyrinth-app" (jctufxvmuvobaggxcwfn), in the same hour as the edge-function deploy.
-- It is generated by crm/apply_crm.py --sql from ../move.json; do not edit the address here.
--
-- Why this one row: every automated email and text prints settings.data.address, and the code's GYM_ADDRESS is only the fallback for when it is blank.
-- On 2026-10-15 a scan of every text and jsonb column in public found the old street in exactly these places:
--   settings.data -> address      the academy's address: THIS is the one to change
--   email_log.html, broadcasts    mail that was already sent: history, leave it
--   members.address               the members' own home addresses (ZIP 77441 is Fulshear): not the academy's, leave them
-- and not in any template, any saved location profile, or anywhere else in settings.

-- 1. Look first. It must show the old address, one row.
select data ->> 'address' as address from settings where singleton;

-- 2. Change it. The WHERE clause makes it a no-op if somebody already changed it.
update settings
   set data = jsonb_set(data, '{address}', to_jsonb('%(new)s'::text)),
       updated_at = now()
 where singleton
   and data ->> 'address' = '%(old)s';

-- 3. Look again. It must show the new address.
select data ->> 'address' as address from settings where singleton;

-- 4. Then, in the CRM: Locations -> the first location -> Name "Richmond" (optional: the name is what staff see on badges), and check that its
--    address reads %(new)s. A saved profile wins over the built-in one, field by field.

-- 5. In Supabase: Authentication -> Emails. Supabase sends the sign-in, invite and password-reset mail itself, from templates saved in the dashboard, and each of the
--    six carries the postal address in its footer. The patch regenerates them (supabase/email-templates/*.html and subjects.json); paste each file into its
--    template, as supabase/email-templates/README.md says (start with recovery.html: every member-app invite is sent as one).
""" % {"day": cfg["effective_date"], "new": new_addr, "old": old_addr}


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--sql", help="write the database half (move-day.sql) to this path and stop")
    ap.add_argument("--target", help="a checkout of the CRM repository (labyrinth-app)")
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--allow-early", action="store_true")
    ap.add_argument("--patch", help="write the change as a patch (git apply -p1) to this path")
    ap.add_argument("--no-tests", action="store_true", help="skip the type check and the CRM's test suite (not for --apply)")
    ap.add_argument("--keep", action="store_true")
    ap.add_argument("--jobs", type=int, default=3, help="how many tests run at once (default 3)")
    ap.add_argument("--only", help="comma-separated test names (trial-waiver,winback): run only these, not the whole suite")
    ap.add_argument("--ignore", default="", help="comma-separated tests whose failure is the machine's (ci-workflow, where PGlite is not installed)")
    a = ap.parse_args()
    cfg = M.load_config()
    if a.sql:
        Path(a.sql).write_text(move_day_sql(cfg), encoding="utf-8")
        print("wrote " + a.sql)
        return
    if not a.target:
        sys.exit("--target is required")
    root = Path(a.target).resolve()
    if not (root / "supabase" / "functions" / "send-message" / "index.ts").exists():
        sys.exit("%s is not a checkout of the CRM repository" % root)
    eff = datetime.date.fromisoformat(cfg["effective_date"])
    if a.apply and datetime.date.today() < eff and not a.allow_early:
        sys.exit("Refusing to apply: the move is on %s. Deploy the CRM change and run crm/move-day.sql on that day, not before. Use --allow-early only on a throw-away checkout." % eff)
    if a.apply and a.no_tests:
        sys.exit("--apply needs the tests: drop --no-tests")

    work = scratch_copy(root)
    problems = []
    try:
        print("Edits (in a scratch copy of %s):" % root.name)
        # The golden-hash tests are re-pinned below. That is only honest if they pass BEFORE the edits: otherwise the re-pin would absorb a change that is not the move's.
        before = [name for name in GOLDEN_TESTS if run(["node", "scripts/%s.test.mjs" % name], work).returncode]
        if before:
            problems.append("these tests already fail before the move's edits, so re-pinning them would hide something else: %s. Fix the CRM first" % ", ".join(before))
        n = apply_edits(work, cfg, problems)
        print("  %d exact edits applied (%d code, %d tests, %d docs)" % (n, len(E.CODE), len(E.TESTS), len(E.DOCS)))
        if not problems:
            r = run(["node", "scripts/build-renewal-core.mjs"], work)
            print("  renewal bundle regenerated: " + (r.stdout.strip().splitlines() or [r.stderr.strip()[:120]])[-1])
            if r.returncode:
                problems.append("build-renewal-core.mjs failed: " + r.stderr[-300:])
            r = run(["node", "scripts/auth-email-templates.mjs"], work)
            print("  Supabase Auth email templates regenerated: " + ((r.stdout.strip().splitlines() or [r.stderr.strip()[:120]])[-1] if r.returncode == 0 else "FAILED"))
            if r.returncode:
                problems.append("auth-email-templates.mjs failed: " + r.stderr[-300:])
            for name, fn in (("trial-location", regen_trial_location), ("member-emails", regen_member_emails), ("trial-lifecycle", regen_trial_lifecycle),
                             ("member-lifecycle", regen_member_lifecycle)):
                k = fn(work, problems)
                print("  golden hashes re-pinned in %s.test.mjs: %d" % (name, k))
        left = leftovers(work, cfg)
        changed = changed_files(work, root)
        print("\n%d file(s) change: %s" % (len(changed), ", ".join(changed)))
        print("Old street, suite or building-C directions still in the code: %d" % len(left))
        for x in left[:20]:
            print("   %s:%d  %s" % x)
        failed, ntests = [], 0
        if not a.no_tests and not problems:
            r = run(["npx", "tsc", "-b", "--noEmit"], work)
            print("Type check: " + ("clean" if r.returncode == 0 else "FAILED\n" + (r.stdout + r.stderr)[-800:]))
            if r.returncode:
                problems.append("tsc failed")
            ntests, failed = run_tests(work, a.jobs, [x for x in (a.only or '').split(',') if x], [x for x in a.ignore.split(',') if x])
            print("CRM tests: %d run, %d failed" % (ntests, len(failed)))
            for name, lines in failed:
                print("   FAILED %s" % name)
                for ln in lines:
                    print("      " + ln[:200])
        for m in problems:
            print("PROBLEM: " + m)
        if a.patch and not problems:
            write_patch(a.patch, work, root, changed)
            print("patch written to " + a.patch)
        ok = not (problems or left or failed)
        if a.apply and ok:
            for rel in changed:
                dst = root / rel
                dst.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(Path(work) / rel, dst)
            print("\nApplied: %d file(s) are now the post-move versions. Deploy the edge functions that import them, run crm/move-day.sql, build the app, and paste the regenerated supabase/email-templates into Supabase (Authentication, Emails: supabase/email-templates/README.md), because Supabase sends those six itself and each carries the address." % len(changed))
        elif a.apply:
            print("\nNot changing the checkout: fix the problems above first.")
        else:
            print("\n%s" % ("Dry run clean. Run again with --apply to change the checkout." if ok else "The dry run found problems (above). Nothing was changed."))
        code = 0 if ok else 1
    finally:
        if a.keep:
            print("scratch copy kept at " + str(work))
        else:
            shutil.rmtree(work, ignore_errors=True)
    sys.exit(code)


if __name__ == "__main__":
    main()
