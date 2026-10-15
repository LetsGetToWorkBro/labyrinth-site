#!/usr/bin/env python3
"""The prompt for the muse on move day: change the address on every local listing we hold, in place, and create nothing new.

    python3 move-richmond/build_listings_prompt.py --preview --out /some/where/muse-prompt-listings-move-PREVIEW.txt     read it any time before the move
    python3 move-richmond/build_listings_prompt.py --out /some/where/muse-prompt-listings-move.txt                       the real one: refuses before effective_date

It reads the same master copies the first listings prompt was built from (assets/social/business-listing-details.txt and google-profile-update.txt on the
working branch) and puts the move's rules through them in memory first, so it can be built before the master copies have been updated (`apply_move.py
--work --apply` does that on the day) and after. Then it lints the result (description lengths, nothing that goes stale, our own links only, the old
address exactly once, in the sentence that says what to replace) and writes the prompt.

THE ONE DECISION IN IT that the owner has to make by hand: Google will almost certainly ask us to verify the new address again, usually with a short video
filmed at the building. The prompt tells the agent to stop at that step. Everything else on the list is a form.
"""
import argparse
import datetime
import json
import re
import sys
from pathlib import Path

KIT = Path(__file__).resolve().parent
sys.path.insert(0, str(KIT))
import apply_move as M  # noqa: E402
import rules as R  # noqa: E402

PROFILE = "https://maps.google.com/?cid=7150744267965161030"
YELP = "https://www.yelp.com/biz/labyrinth-brazilian-jiu-jitsu-fulshear-2"
JITS = "https://jits.gg/academy/labyrinth-bjj-4377"
ALLOWED_LINKS = re.compile(r"https://(labyrinth\.vision|www\.facebook\.com/labyrinthbjj|www\.instagram\.com/labyrinthbjj|www\.youtube\.com/@labyrinthbjj|maps\.google\.com/\?cid=7150744267965161030"
                           r"|www\.yelp\.com/biz/labyrinth-brazilian-jiu-jitsu-fulshear-2|jits\.gg/academy/labyrinth-bjj-4377)(/\S*)?")


def blocks_of(text):
    parts = re.split(r"^==================== (.+?) ====================\n", text, flags=re.M)
    return {parts[i]: parts[i + 1].strip("\n") for i in range(1, len(parts) - 1, 2)}


def after_move(text, files, cfg):
    """The master copy as it reads once the move's work rules have run (a no-op if they already have)."""
    new_street = cfg["new"]["street"]
    if new_street in text:
        return text
    tree = M.Tree(files["root"])
    for rel in files["rels"]:
        tree.read(rel)
    rules = [r for r in R.build_rules(cfg) if r.work and set(r.scope) <= {"listing_copy"}]
    for r in rules:
        M.apply_rule(tree, r)
    return tree.cache[files["want"]]


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--out", required=True)
    ap.add_argument("--preview", action="store_true", help="build it before the move (the output is a preview, not to be sent)")
    ap.add_argument("--repo", default=str(KIT.parent), help="the working-branch checkout that holds assets/social/ (default: this one)")
    a = ap.parse_args()
    cfg = M.load_config()
    eff = datetime.date.fromisoformat(cfg["effective_date"])
    if not a.preview and datetime.date.today() < eff:
        sys.exit("Refusing: the move is on %s, and this prompt changes live listings. Use --preview to read it now." % eff)
    repo = Path(a.repo)
    rels = ["assets/social/business-listing-details.txt", "assets/social/google-profile-update.txt"]
    texts = {}
    for rel in rels:
        files = {"root": repo, "rels": rels, "want": rel}
        texts[rel] = after_move((repo / rel).read_text(encoding="utf-8"), files, cfg)
    master, gbp = blocks_of(texts[rels[0]]), blocks_of(texts[rels[1]])
    for k in ("DETAILS", "CATEGORIES", "SPECIALTIES", "SHORT DESCRIPTION", "MEDIUM DESCRIPTION", "LONG DESCRIPTION", "PHOTOS"):
        assert master.get(k), "missing " + k
    for k in ("DESCRIPTION", "TEAM LEGACY DESCRIPTION"):
        assert gbp.get(k), "missing " + k + " in google-profile-update.txt"
    d = dict(re.findall(r"^([^:\n]+): (.+)$", master["DETAILS"], flags=re.M))
    cats, spec = master["CATEGORIES"].split("\n"), master["SPECIALTIES"].split("\n")
    short, medium, long_ = master["SHORT DESCRIPTION"], master["MEDIUM DESCRIPTION"], master["LONG DESCRIPTION"]
    photos = [tuple(x.strip() for x in ln.split("|")) for ln in master["PHOTOS"].split("\n") if ln.strip()]
    google_desc, legacy_desc = gbp["DESCRIPTION"], gbp["TEAM LEGACY DESCRIPTION"]

    n, o = cfg["new"], cfg["old"]
    new_addr = "%s, %s, %s, %s %s" % (n["street"], n["unit"], n["city"], n["state"], n["zip"])
    old_addr = "%s, %s, %s, %s %s" % (o["street"], o["unit"], o["city"], o["state"], o["zip"])
    day = "%s %d, %d" % (eff.strftime("%B"), eff.day, eff.year)

    # ---- lint --------------------------------------------------------------------------------------------------------------
    problems = []
    if len(short) > 150: problems.append("short description %d > 150" % len(short))
    if len(medium) > 350: problems.append("medium description %d > 350" % len(medium))
    if len(long_) > 800: problems.append("long description %d > 800" % len(long_))
    if len(google_desc) > 750: problems.append("Google description %d > 750 (Google allows 750)" % len(google_desc))
    if not (len(short) < len(medium) < len(long_)): problems.append("descriptions should grow")
    if (d.get("Address"), d.get("City"), d.get("State"), d.get("ZIP")) != ("%s, %s" % (n["street"], n["unit"]), n["city"], n["state"], n["zip"]):
        problems.append("the master copy's address is not the new one: %r" % [d.get(k) for k in ("Address", "City", "State", "ZIP")])
    if not re.fullmatch(r"\(\d{3}\) \d{3}-\d{4}", d["Phone"]) or d["Phone"] != cfg["phone"]:
        problems.append("phone %s is not the phone that stays (%s)" % (d["Phone"], cfg["phone"]))
    if "Map pin guide" not in d or ("%.6f" % n["lat"]) not in d["Map pin guide"]:
        problems.append("the master copy's map pin is not the new point")
    for label, text in (("short", short), ("medium", medium), ("long", long_), ("google", google_desc), ("legacy", legacy_desc)):
        for bad in (r"\$", r"(?i)top 1", r"(?i)ranked", r"(?i)\bbest\b", r"(?i)award", r"(?i)medal", r"(?i)seminar\b.*\bOct", r"(?i)donat", r"(?i)ribbon", r"(?i)pink", r"!", r"https?://", r"6615", r"Cross Creek Bend"):
            if re.search(bad, text):
                problems.append("%s description contains %s" % (label, bad))
        if not re.search(r"Richmond", text):
            problems.append("%s description does not say Richmond" % label)
    if n["street"] not in legacy_desc:
        problems.append("the Team Legacy description does not carry the new address")
    for u in [d["Website"], d["Facebook"], d["Instagram"], d["YouTube"]] + [x[1] for x in photos]:
        if not ALLOWED_LINKS.fullmatch(u):
            problems.append("link %s" % u)
    if photos[0][0] != "Logo" or len(photos) < 4:
        problems.append("photos")

    photo_lines = "\n".join("  %s: %s" % (k, u) for k, u in photos)
    prompt = f"""LISTINGS: WE HAVE MOVED. CHANGE THE ADDRESS ON EACH LISTING, IN PLACE, AND CREATE NOTHING NEW (A ONE-TIME JOB)

I own Labyrinth BJJ, and on {day} we moved to a new building. You are acting for me. Please change the address on each of the listings below from the old one to the new one, replace the description where I say so, and leave everything else as it is. This is a one-time job for the sites on the list only, not for every directory on the internet. Everything you need is in this message. Use only what is written here.

THE MOVE
Old address (what the listings show now): {old_addr}
New address (what every listing must show): {new_addr}
Staying the same: the name ({d['Name']}), the phone number {d['Phone']}, the website, the email and the hours.
Map pin: the new building is on Hidden Lake Ln, off Fulshear-Gaston Road, in Richmond. Where a site asks you to place or check a pin, use the satellite view and put it on Building 1. As a guide, the street-range point is about {d['Map pin guide']}, so the real building may be a few hundred feet from it. If a pin lands in Fulshear, in Cross Creek Ranch, or anywhere that is not on Hidden Lake Ln, stop and tell me.

RULES (they apply to every site)
- CHANGE IT IN PLACE. Every listing below already exists and is ours. Change its address. Never create a second listing for the new address, never delete a listing, and never use a button that closes a listing or marks the business as closed. If a site says the business "moved", choose that only if it keeps the same listing and its reviews; if the only way to change the address is to create a new listing, stop and tell me.
- LOOK FIRST. Open each listing and write down what it shows (address, phone, website, description) before you change anything, so you can tell me what changed.
- THE OLD ADDRESS MUST GO FROM THE WHOLE LISTING: not as the address, not as a second or "also at" address, not in the description or any extra-information field. Do not add the old address anywhere as a "previous address".
- IF A SITE ASKS US TO PROVE THE NEW ADDRESS (a short video of the building, a postcard, a phone call, a code), STOP at that step, tell me which site and exactly what it asks for, and do not start the check yourself. Changing an address nearly always triggers this on Google, and it is usually a video that only I can film on my phone at the new building.
- Use only the details and wording below. Do not invent anything: no prices, rankings, awards, medal counts, events or claims. Say nothing about our fundraiser or the Team Legacy merger except where I give you the words.
- Do not take facts from our website's text. Some of its pages hold wording for situations that are not true right now: visitors never see it, but you can see it when you read a page as text. This message is the only source.
- NO MONEY. Never enter a card, start a trial, buy anything, or accept an upgrade, an ad, a "boost", a badge, an accreditation or a "verified" package. Decline every upsell and every offer of a call from a sales team. If a site cannot be used without paying, skip it and tell me.
- STAY ON THE LIST. Do not submit us to any site that is not listed here, even when a site suggests more directories or a listing service. Do not sign up for a listing-management service.
- LOGINS. Use "Sign in with Google" with the Labyrinth Google account wherever a site offers it. Where a site needs its own account and we already have one, ask me for the login; if we have none, use {d['Email']} as the login, make a long random password, and put it in your report to me once, nowhere else. If a site needs an Apple ID or a personal account of mine (Apple Business Connect, Nextdoor), stop and ask me which one to use.
- CODES. If a site wants to send a code by phone call or text, or a postcard, stop at that step and tell me which site and what it says it will send. If the code goes to {d['Email']} and you can open that inbox, use it. Never enter any phone number other than ours.
- NEVER GET AROUND A CHECK. If you meet a CAPTCHA, a "prove you are human" step, an "unusual activity" warning, or a request for ID, a selfie or a video, stop and tell me. Do not retry in a loop.
- Do not write reviews, ask for reviews, reply to reviews, answer questions on a listing, turn on messaging, bookings, quotes or ads, opt in to marketing email, or post anything.
- If anything on screen differs from what I describe (an account that is not ours, a warning, an error), stop and tell me before you go further.

OUR DETAILS (copy exactly; the address is the only thing that has changed)
Name: {d['Name']}
Also known as, if a site has such a field: {d['Also known as']}
Address: {d['Address']}, {d['City']}, {d['State']} {d['ZIP']}
Phone: {d['Phone']}
Website: {d['Website']}
Email shown on the listing: {d['Email']}
Year established, if a site asks: {d['Year established']}
Hours: unchanged. Copy them from our Google Business Profile ({PROFILE}) wherever a site asks for them. If it shows no hours, leave the hours as the site has them and tell me. Never make hours up.
Facebook: {d['Facebook']}
Instagram: {d['Instagram']}
YouTube: {d['YouTube']}

Categories, in this order of preference (only where a listing has none or a wrong one; never invent one):
{chr(10).join('  ' + c for c in cats)}

DESCRIPTIONS. On every site except Google and Team Legacy, replace the description with the longest of these that the site allows (these name Richmond, near Fulshear and Katy; the old text names Fulshear as our town). If the long one does not fit, use the medium; if that does not fit, use the short.

LONG:
{long_}

MEDIUM:
{medium}

SHORT:
{short}

GOOGLE DESCRIPTION (for the Google Business Profile only):
{google_desc}

TEAM LEGACY DESCRIPTION (for the old Team Legacy listing only, step 10):
{legacy_desc}

PHOTOS (do not change a listing's photos. Only if a listing has no logo, use these: download the files, the logo as the logo and up to four of the others):
{photo_lines}

THE SITES, IN THIS ORDER
1. GOOGLE BUSINESS PROFILE ({PROFILE}): this is the one the others are compared with, so do it first. Open this exact profile with the Labyrinth Google account. Info, then Address: street address "{n['street']}", the second line "{n['unit']}", city {n['city']}, state {n['state']}, ZIP {n['zip']}. Check the pin as described above. Replace the description with the GOOGLE DESCRIPTION. Change nothing else: not the name, categories, services, hours, phone, website, photos or posts. When you save, Google will probably say the change needs verifying: STOP there and tell me what it offers (video, phone, text, email) and what the profile shows right now. If it accepts the change with no verification, say so.
2. APPLE BUSINESS CONNECT (businessconnect.apple.com): this is what Apple Maps and Siri show. It needs an Apple ID: stop and ask me which one to use. Then find our location (search by our phone number and by the old address). If it is in my account, edit it; if it is not claimed yet, claim it first. Change the address and the description. It may verify by a phone call to our number: stop there and tell me.
3. BING PLACES (bingplaces.com): if it offers to import from a Google Business Profile, do not use that until step 1 has gone through. Otherwise find our listing and change the address and the description. Report how it asks to verify.
4. YELP (biz.yelp.com): our page is {YELP}. Business info: change the address and the description. If Yelp asks whether the business moved, say it did and keep the same page. The "-2" at the end suggests there may be a second Yelp page for us: search Yelp for Labyrinth in Fulshear and Richmond and tell me every page you find, with links; do not merge, close or report any of them. Decline Yelp Ads, deals, "request a quote" and every phone offer from their sales team.
5. OUR FACEBOOK PAGE ({d['Facebook']}): Edit the Page info: the address, the description ("About") and, if it shows the town, the city. Do not change the Page name, the username, any post, any photo or any setting. If you do not have the rights to edit it, tell me.
6. NEXTDOOR (business.nextdoor.com): it needs a personal Nextdoor account whose address is verified: stop and ask me for that. Then edit our business page: the address and the description. For the service area, keep what is there and add Richmond if Nextdoor offers it near our address.
7. FOURSQUARE (foursquare.com): find our venue and change the address; claim it for free first if it is not claimed. If only paid plans come up, skip it and tell me.
Only after those seven, and only if a listing already exists and editing it is free (never pay, never apply for anything paid):
8. YELLOW PAGES (yellowpages.com): correct the address and the description on the free listing. Decline every paid package. Make sure the contact email is {d['Email']}.
9. BETTER BUSINESS BUREAU (bbb.org): if a profile for us exists, claim it for free if it is not claimed and correct the address. Do not apply for accreditation: it is paid.
10. THE OLD TEAM LEGACY LISTING (Google): the listing named "Team Legacy" at 7609 Tiki Dr. Open it from the Google account that manages it. Its description says where its students went and carries our old address. Replace the description with the TEAM LEGACY DESCRIPTION and change nothing else about it: not the name, address, phone, website, hours or reviews. If it has been marked permanently closed and the description cannot be edited, tell me.
11. JITS.GG: our academy page is {JITS}. Look only. Tell me what it shows for our name, address, phone, website and logo, and whether it has an edit or claim option. Change nothing.
12. A LAST LOOK: search Google Maps, Apple Maps and Bing Maps for "{d['Name']}", for "{d['Also known as']}" and for {d['Phone']}. List every result with the address it shows, and tell me which still show the old address or the old town. Changes can take days to appear, so this is a report, not something to fix.

WHEN YOU ARE DONE, SEND ME, FOR EACH SITE
- The link to our listing, and what happened: changed, needs proof from me (say exactly what it asked for and how), skipped (say why), or could not be done.
- What it showed before, and what you entered.
- Any duplicate or wrong listing you found, with its link, and what it showed wrong.
- Any sales call, upsell or warning you declined.
Then, once: the list of accounts you created (site, login email), with any password you made, and anything that looked different from what I described.
"""

    for u in re.findall(r"https?://[^\s)]+", prompt):
        u = u.rstrip(".,")
        if not ALLOWED_LINKS.fullmatch(u):
            problems.append("unexpected link in the prompt: " + u)
    if prompt.count(o["street"]) != 1:
        problems.append("the old street appears %d times in the prompt; it must appear once, in the sentence that says what to replace" % prompt.count(o["street"]))
    if problems:
        print("PROBLEMS:")
        for p in problems:
            print("   " + p)
        sys.exit(1)
    Path(a.out).write_text(prompt, encoding="utf-8")
    print("wrote %s: %d characters, %d lines; descriptions %d/%d/%d, Google %d, Team Legacy %d characters%s" % (
        a.out, len(prompt), prompt.count("\n") + 1, len(short), len(medium), len(long_), len(google_desc), len(legacy_desc),
        "  (PREVIEW: do not send before %s)" % day if a.preview else ""))


if __name__ == "__main__":
    main()
