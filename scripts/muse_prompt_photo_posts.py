#!/usr/bin/env python3
"""Builds the muse (posting agent) prompt for one of the photo posts, Instagram and Facebook together, and checks it.

    python3 scripts/muse_prompt_photo_posts.py teens                 writes muse-prompt-teens.txt (into --out, default ./muse-prompts)
    python3 scripts/muse_prompt_photo_posts.py all                   every post that is ready (its pictures and captions exist)
    python3 scripts/muse_prompt_photo_posts.py teens --mutate        breaks the finished prompt a few dozen ways and shows the checks catch each
    python3 scripts/muse_prompt_photo_posts.py teens --live          the pictures at labyrinth.vision are the repo's, byte for byte

Nothing the owner approved is retyped here: the captions, the Facebook text, the alt text and the heads-up paragraph are read from
scripts/photo-posts-captions.txt, and the pictures' names and count from scripts/photo-posts.json and assets/social/shoot/.
What is written here is only the instructions to the agent and the few facts each post stands on.
"""
import hashlib, json, os, re, struct, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
PLAN = json.load(open(os.path.join(HERE, 'photo-posts.json'), encoding='utf-8'))
CAPS = open(os.path.join(HERE, 'photo-posts-captions.txt'), encoding='utf-8').read()
SHOOT = os.path.join(REPO, 'assets', 'social', 'shoot')
SITE = 'https://labyrinth.vision'
BOOK = SITE + '/#book'
PHONE = '(281) 393-7983'
CREDIT_IG = PLAN['credit_instagram']        # the last line before the hashtags, on Instagram: @mentions, no full stop after the handle
CREDIT_FB = PLAN['credit_facebook']         # and on Facebook, where the handles are plain text
HANDLES = PLAN['photographers']
SIZE = (1080, 1350)
BELT = '\U0001F94B'

# What each post stands on besides the pictures: when it goes out, and the offer in the words the caption uses.
# `picker` says which booking list the agent checks before it posts: 'youth' (Kids & Teens), 'adult' (Adult Classes) or 'both'.
POSTS = {
    'teens': dict(day=(10, 15), when='Thursday, October 15, 2026', earliest='9:00 AM', picker='youth', about="our teen classes",
                  offer="- The offer: a teen's first class is free, on any day of the week, Monday to Sunday. No experience needed. We lend the gi: a t-shirt and shorts is all a teen needs to wear. No commitment. Teens train in groups of their own."),
    'women': dict(day=(10, 15), when='Thursday, October 15, 2026', earliest='5:30 PM', picker='adult', about="the women and girls who train with us",
                  offer="- The offer: a first class is free, with no commitment. No experience needed. Our adult classes run in the gi and out of it (Gi and No-Gi classes), in the mornings, at midday and in the evenings, and girls train in our kids and teen classes."),
    'kids': dict(day=(10, 16), when='Friday, October 16, 2026', earliest='12:00 PM', picker='youth', about="our kids' classes",
                 offer="- The offer: a child's first class is free, on any day of the week, Monday to Sunday. No experience needed. We lend the gi: a t-shirt and shorts is all a child needs to wear. No commitment. Kids 3 to 12 train in age-matched groups."),
    'adults': dict(day=(10, 16), when='Friday, October 16, 2026', earliest='6:00 PM', picker='adult', about="our adult classes",
                   offer="- The offer: a first class is free, with no commitment. No experience needed. We run Gi and No-Gi classes in the mornings, at midday and in the evenings, and an open mat on Sundays."),
    'young': dict(day=(10, 17), when='Saturday, October 17, 2026', earliest='12:00 PM', picker='youth', about="our kids and teens",
                  offer="- The offer: a child's first class is free, on any day of the week, Monday to Sunday. No experience needed. We lend the gi: a t-shirt and shorts is all a child needs to wear. No commitment. Kids and teens train in age-matched groups, ages 3 to 15 (youth wrestling goes up to 17)."),
    'rolling': dict(day=(10, 17), when='Saturday, October 17, 2026', earliest='6:00 PM', picker='adult', about="people training together at our academy",
                    offer="- The offer: a first class is free, with no commitment. No experience needed. We have loaner gis for trial classes, so nobody needs to buy anything first."),
    'between': dict(day=(10, 18), when='Sunday, October 18, 2026', earliest='12:00 PM', picker='both', about="the quiet moments between rounds in our classes",
                    offer="- The offer: a first class is free, with no commitment. No experience needed. Kids, teens and adults all train here."),
    'start': dict(day=(10, 18), when='Sunday, October 18, 2026', earliest='6:00 PM', picker='both', about="our classes getting started (line-ups and warm-ups)",
                  offer="- The offer: a first class is free, with no commitment. No experience needed. Kids, teens and adults are all welcome."),
}
# Posts that go out before Saturday, October 17 carry the heads-up about that Saturday (the booking form still offers it); later ones do not.
BEFORE_SATURDAY = (10, 17)


def section(name):
    m = re.search(r'^={20} %s ={20}\n(.*?)(?=^={20} |\Z)' % re.escape(name), CAPS, re.M | re.S)
    if not m:
        raise SystemExit('photo-posts-captions.txt has no section "%s"' % name)
    return m.group(1).strip('\n')


HEADS_UP = section('HEADS-UP, FOR POSTS THAT GO OUT BEFORE SATURDAY, OCTOBER 17').split('\n\n')[-1]
assert HEADS_UP.startswith('Heads up: no classes this Saturday, October 17.'), 'the heads-up paragraph is not where it should be'
IG_BOOKING = 'Book at labyrinth.vision, or call or text %s.' % PHONE
FB_BOOKING = 'Book a free class: %s\nQuestions? Call or text %s.' % (BOOK, PHONE)


def emoji(text):
    return re.findall('[\U0001F000-\U0001FFFF☀-➿⬀-⯿]', text)


def jpeg_size(path):
    with open(path, 'rb') as f:
        d = f.read()
    i = 2
    while i < len(d):
        if d[i] != 0xFF:
            i += 1
            continue
        marker = d[i + 1]
        if marker in (0xC0, 0xC1, 0xC2):
            h, w = struct.unpack('>HH', d[i + 5:i + 9])
            return (w, h)
        i += 2 + struct.unpack('>H', d[i + 2:i + 4])[0]
    raise ValueError('no size in ' + path)


def block(text, n):
    m = re.search(r'^===== BLOCK %s: [^\n]*=====\n(.*?)\n===== END OF BLOCK %s =====$' % (n, n), text, re.M | re.S)
    return m.group(1) if m else None


class Post:
    """Everything one prompt is made from, read from the repo."""
    def __init__(self, pid):
        self.id = pid
        self.meta = POSTS[pid]
        plan = [p for p in PLAN['posts'] if p['id'] == pid]
        if not plan:
            raise SystemExit('photo-posts.json has no post "%s"' % pid)
        self.plan = plan[0]
        self.n = len(self.plan['slides'])
        self.title = ' '.join(self.plan['title']).upper()
        self.files = ['%s-%02d.jpg' % (pid, i + 1) for i in range(self.n)]
        self.urls = ['%s/assets/social/shoot/%s' % (SITE, f) for f in self.files]
        self.variant_a = self.meta['day'] < BEFORE_SATURDAY
        # the owner's wording
        self.ig_b = section('%s: INSTAGRAM CAPTION' % pid)
        self.fb_b = section('%s: FACEBOOK POST TEXT' % pid)
        assert self.ig_b.count(IG_BOOKING) == 1, '%s: the Instagram booking line moved' % pid
        assert self.fb_b.count(FB_BOOKING) == 1, '%s: the Facebook booking lines moved' % pid
        self.ig_a = self.ig_b.replace(IG_BOOKING, HEADS_UP + '\n\n' + IG_BOOKING)
        self.fb_a = self.fb_b.replace(FB_BOOKING, HEADS_UP + '\n\n' + FB_BOOKING)
        alt = section('%s: ALT TEXT' % pid)
        self.alt_lines = re.findall(r'^Picture (\d+): (.*)$', alt, re.M)
        assert [int(a) for a, _ in self.alt_lines] == list(range(1, self.n + 1)), '%s: alt text lines do not run 1..%d' % (pid, self.n)
        self.alt = '\n'.join('%s: %s' % (a, t) for a, t in self.alt_lines)      # "1: …", one line per picture
        for f in self.files:
            p = os.path.join(SHOOT, f)
            assert os.path.exists(p), '%s is not in assets/social/shoot' % f
            assert jpeg_size(p) == SIZE, '%s is %s, not %s' % (f, jpeg_size(p), SIZE)


PROMPT = """@@TITLE@@

I run Labyrinth BJJ in Fulshear, TX. I want @@N@@ photographs of @@ABOUT@@ shared on our social media: one Instagram post (a carousel you swipe through) and one post on our Facebook Page, each with the same @@N@@ pictures in the same order. Please publish them as described below. Everything you need, including all the wording, is in this message. Use only what is written here.

RULES (they apply to everything)
- Use only the facts and wording below. Do not invent or add prices, times, dates, offers, names or claims. Do not mention prices, the Rolling for Ribbons fundraiser, donations, the matching gift or any totals anywhere in this job.
- Do not take facts from our website's text. Everything you may rely on is in this message.
- Do not edit the captions, the post text, the alt text or the pictures. Use them exactly as given. If Instagram or Facebook warns about the wording, do not rewrite it to get past the warning: tell me.
- Do not add anything of your own to the posts: no extra hashtags, mentions, links, emoji or comments. Do not add music, text, stickers, filters, effects, templates, frames, polls, events or offers to the posts or the pictures, and do not crop the pictures. Do not use Remix, Add Yours, collaborator invites or partnership labels. Do not add a location or a check-in, and do not add a feeling or an activity.
- Do not tag anyone in the pictures and do not invite anyone as a collaborator. The only mentions in this job are the two photographers' Instagram handles, @@H1@@ and @@H2@@, in the last line of each text before the hashtags: leave them exactly as written and add no other mention.
- Do not boost or promote anything, do not create or edit any ad, and do not spend any money.
- Do not touch the Instagram bio link: leave it exactly as it is. Do not pin, unpin or edit any existing post, and do not change the Page's cover, profile picture, buttons or About section.
- Do not reply to comments or messages. Tell me if anything needs an answer (for example somebody asking which class to start in, whether they are old enough, or what it costs).
- Use the Labyrinth BJJ Instagram account and the Labyrinth BJJ Facebook Page for the Fulshear gym, not the Wharton or Katy ones. Post only where this message says: no personal profiles, no groups, no other accounts or Pages, no Threads, no stories and no reels.
- Post during the day, Central Time, between 9 AM and 8 PM, and not before @@EARLIEST@@ on @@WHEN@@. If it is outside those hours, or it is earlier than that, or you cannot tell the date or the time, do not post: tell me.
- Post each one ONCE. If a post seems to have failed, look at the profile or the Page before you try again, so that nothing goes up twice.
- If Instagram or Facebook will not take all @@N@@ pictures in one post, do not post anything: tell me how many it will take.
- If anything on screen differs from what I describe (a missing button, an account that is not ours, a warning, an error, a sign-in or verification screen), stop and tell me BEFORE you click Share or Post.

FACTS
- Labyrinth BJJ, Fulshear, TX. Phone @@PHONE@@, which takes calls and texts.
@@OFFER@@
- The photographs were taken at the academy by two photographers, Instagram @@H1@@ and @@H2@@, who are credited by those handles in the last line of each text, before the hashtags.
- The link in the Facebook text: @@BOOK@@ (it opens a class picker straight away). The Instagram caption has no link: it says labyrinth.vision.
- Pictures (download these exact files; they are already on the site). Picture 1 is a cover with words on it and picture @@N@@ has words on it; the ones between are photographs alone:
@@PICTURES@@
  Open each one and check that it is that size and shows what its alt text (BLOCK @@ALTN@@) says. If one does not, stop and tell me.

BEFORE YOU START
1. Check today's date and the time in Central Time (see the rule about the date above).@@STEP1@@
2. Open @@BOOK@@. It must open a class picker with two buttons, Adult Classes and Kids & Teens. @@PICKER@@ If it opens nothing, stop and tell me. Do not copy any words from the page.
3. Download the @@N@@ pictures and check them as described under FACTS.

THE POSTS (publish these, in this order, one after the other)
A1. INSTAGRAM POST, @@N@@ PICTURES: make a new post and select all @@N@@ pictures, picture 1 first and picture @@N@@ last, so that it is one post you can swipe through. Keep them at their own portrait shape (4:5): do not crop them to a square. Add no filters, no music and no location, and tag nobody. Paste the caption exactly (@@IGREF@@). Give each picture its alt text from BLOCK @@ALTN@@: line 1 is the alt text of picture 1, line 2 of picture 2, and so on; paste the text after the number (Advanced settings, then Write alt text; it shows each picture in turn). If you cannot give each picture its own alt text, add what you can and tell me. Make sure sharing to Facebook is OFF and that it is not shared anywhere else. Then share it.
A2. FACEBOOK POST, @@N@@ PICTURES: on the Labyrinth BJJ Page, make a photo post. Upload all @@N@@ pictures, in the same order. Paste the text exactly (@@FBREF@@): the two handles are plain text on Facebook, so if the composer offers to tag a profile or Page while you paste, do not choose any suggestion. Add the same alt text to each picture (BLOCK @@ALTN@@) if the option is there (it is under Edit on each photo); if you cannot add alt text, post without it and tell me. Make sure the post goes to the Facebook Page only: if the composer offers to post to Instagram as well, turn that OFF. Do not pin it. Then post it.
After each one is up, open it and check that all @@N@@ pictures are there in the right order, that nothing is cropped, and that the caption or text is complete. On Instagram, check that @@H1@@ and @@H2@@ in the caption are links that open those two accounts: if either is not a link, or opens a different account, tell me and do not change the caption. On Facebook, check that the booking link is clickable and opens the booking picker. Facebook shows a grid of the first few pictures and may trim their edges in the feed: that is normal, but click a picture and check that it opens whole.

WHEN YOU ARE DONE, SEND ME
- The link to the Instagram post and the link to the Facebook post, the time each went up (Central Time), which blocks you used, and whether both handles in the Instagram caption turned into links.
- Anything that looked different from what I described, any warning you saw, and anything you were not sure about.
- Any comment or message that needs an answer from me, copied exactly.

@@BLOCKS@@
"""

YOUTH_PICKER = 'Tap Kids & Teens: it must show a list headed Kids Trials, with classes under day names. If the Kids Trials list shows only Friday and Saturday, stop and tell me.'
ADULT_PICKER = 'Tap Adult Classes: it must show a list headed Adult Classes, with classes under day names.'
BOTH_PICKER = YOUTH_PICKER + ' Then go back and ' + ADULT_PICKER[0].lower() + ADULT_PICKER[1:]
PICKER = {'youth': YOUTH_PICKER, 'adult': ADULT_PICKER, 'both': BOTH_PICKER}
BLOCK_HEAD = '===== BLOCK %s: %s (paste everything between this line and the END line, not these lines) ====='


def build(pid):
    p = Post(pid)
    m = p.meta
    if p.variant_a:
        step1 = (' Then decide which texts you will use: on Thursday, October 15 or Friday, October 16, 2026, use BLOCK 1 on Instagram and BLOCK 3 on Facebook '
                 '(they tell people there are no classes this Saturday). From Saturday, October 17, 2026 on, use BLOCK 2 and BLOCK 4 (the same texts without that paragraph).')
        igref, fbref, altn = 'BLOCK 1 or BLOCK 2, as decided above', 'BLOCK 3 or BLOCK 4, as decided above', '5'
        blocks = [('1', 'INSTAGRAM CAPTION, FOR OCTOBER 15 OR 16', p.ig_a), ('2', 'INSTAGRAM CAPTION, FROM OCTOBER 17 ON', p.ig_b),
                  ('3', 'FACEBOOK POST TEXT, FOR OCTOBER 15 OR 16', p.fb_a), ('4', 'FACEBOOK POST TEXT, FROM OCTOBER 17 ON', p.fb_b)]
    else:
        step1 = ''
        igref, fbref, altn = 'BLOCK 1', 'BLOCK 2', '3'
        blocks = [('1', 'INSTAGRAM CAPTION', p.ig_b), ('2', 'FACEBOOK POST TEXT', p.fb_b)]
    blocks.append((altn, 'ALT TEXT, ONE LINE PER PICTURE, IN ORDER', p.alt))
    pictures = '\n'.join('    PICTURE %d, %dx%d: %s' % (i + 1, SIZE[0], SIZE[1], u) for i, u in enumerate(p.urls))
    text = PROMPT
    for key, val in (('TITLE', '%s: AN INSTAGRAM POST AND A FACEBOOK POST (%d PICTURES EACH)' % (p.title, p.n)),
                     ('ABOUT', m['about']), ('EARLIEST', m['earliest']), ('WHEN', m['when']), ('H1', HANDLES[0]), ('H2', HANDLES[1]), ('PHONE', PHONE), ('BOOK', BOOK),
                     ('OFFER', m['offer']), ('PICTURES', pictures), ('STEP1', step1), ('PICKER', PICKER[m['picker']]),
                     ('IGREF', igref), ('FBREF', fbref), ('ALTN', altn), ('N', str(p.n))):
        text = text.replace('@@%s@@' % key, val)
    # the owner's blocks go in last, so that a { or an @ inside them can never be mistaken for a placeholder
    body = '\n\n'.join('%s\n%s\n===== END OF BLOCK %s =====' % (BLOCK_HEAD % (n, title), val, n) for n, title, val in blocks)
    assert text.count('@@BLOCKS@@') == 1
    text = text.replace('@@BLOCKS@@', body)
    assert '@@' not in text, 'a placeholder was left in'
    return p, text


# ───────────── the checks ─────────────
def check(p, t):
    probs = []

    def need(c, msg):
        if not c:
            probs.append(msg)

    m = p.meta
    for h in ('RULES (they apply to everything)', '\nFACTS\n', '\nBEFORE YOU START\n', '\nTHE POSTS (publish these', '\nWHEN YOU ARE DONE, SEND ME\n'):
        need(h in t, 'missing section ' + h.strip())
    nblocks = 5 if p.variant_a else 3
    b = {str(n): block(t, str(n)) for n in range(1, nblocks + 1)}
    need(all(v is not None for v in b.values()), 'a block is missing: ' + ','.join(n for n, v in b.items() if v is None))
    need(block(t, str(nblocks + 1)) is None, 'there is one block too many')
    if p.variant_a:
        need(b['1'] == p.ig_a and b['2'] == p.ig_b, 'the Instagram caption blocks are not the approved caption (with and without the Saturday paragraph)')
        need(b['3'] == p.fb_a and b['4'] == p.fb_b, 'the Facebook text blocks are not the approved text (with and without the Saturday paragraph)')
        need(HEADS_UP in (b['1'] or '') and HEADS_UP in (b['3'] or ''), 'the Saturday paragraph must be in BLOCK 1 and BLOCK 3')
        need(HEADS_UP not in (b['2'] or '') and HEADS_UP not in (b['4'] or ''), 'the Saturday paragraph must not be in BLOCK 2 or BLOCK 4')
        need('on Thursday, October 15 or Friday, October 16, 2026, use BLOCK 1 on Instagram and BLOCK 3 on Facebook' in t, 'the date rule for BLOCK 1 and BLOCK 3 is wrong or missing')
        need('From Saturday, October 17, 2026 on, use BLOCK 2 and BLOCK 4' in t, 'the date rule for BLOCK 2 and BLOCK 4 is wrong or missing')
        posts = (b['1'], b['2'], b['3'], b['4'])
        altblock = b['5']
    else:
        need(b['1'] == p.ig_b and b['2'] == p.fb_b, 'the caption or the Facebook text is not the approved one')
        need(HEADS_UP not in t, 'the Saturday paragraph is in a post that goes out after that Saturday')
        posts = (b['1'], b['2'])
        altblock = b['3']
    need(altblock == p.alt, 'the alt text block is not the approved alt text, line for line')
    need(len((altblock or '').split('\n')) == p.n, 'the alt text block does not have one line for each of the %d pictures' % p.n)
    for i, line in enumerate((altblock or '').split('\n')):
        need(re.match(r'^%d: \S' % (i + 1), line), 'alt text line %d does not start with its number' % (i + 1))
    ig_posts = posts[:2] if p.variant_a else posts[:1]
    fb_posts = posts[2:] if p.variant_a else posts[1:]
    for x in ig_posts:
        need(IG_BOOKING in (x or ''), 'an Instagram caption lost its booking line')
    for x in fb_posts:
        need(FB_BOOKING in (x or ''), 'a Facebook text lost its booking link and phone lines')
    for x in ig_posts:
        need((x or '').count(CREDIT_IG) == 1 and (x or '').count('Photos by') == 1, 'an Instagram caption does not carry the photographers\' credit exactly once: ' + CREDIT_IG)
        need((x or '').split('\n\n')[-2].strip() == CREDIT_IG, 'the credit is not the last line before the hashtags')
    for x in fb_posts:
        need((x or '').count(CREDIT_FB) == 1 and (x or '').count('Photos by') == 1, 'a Facebook text does not carry the photographers\' credit exactly once: ' + CREDIT_FB)
        need((x or '').split('\n\n')[-2].strip() == CREDIT_FB, 'the credit is not the last line before the hashtags')
    for x in posts:
        need(emoji(x or '') == [BELT], 'a post text must have exactly one emoji, the belt')
        need(not re.search(r'Fulshear|Katy|Richmond', re.sub(r'#\w+', '', x or '')), 'a post text names a town outside the hashtags')
        need('bio' not in (x or '').lower(), 'a post text says bio')
    # the only @mentions anywhere are the two photographers' handles, and only in the post texts
    mentions = {m.rstrip('.') for m in re.findall(r'@[A-Za-z0-9._]+', t)}
    need(mentions == set(HANDLES), 'the @mentions are not exactly the two photographers\' handles: %s' % sorted(mentions ^ set(HANDLES)))
    need('@' not in (altblock or ''), 'an @ in the alt text')
    for h in HANDLES:
        need(all(x.count(h) == 1 for x in posts if x), '%s is not in every post text exactly once' % h)
    need(t.count('Do not tag anyone in the pictures and do not invite anyone as a collaborator') == 1, 'the tagging rule is missing')
    need(t.count('add no other mention') == 1, 'the rule against other mentions is missing')
    need('are links that open those two accounts' in t, 'the check that the handles are links is missing')
    need('do not choose any suggestion' in t, 'the Facebook tag-suggestion rule is missing')
    need('whether both handles in the Instagram caption turned into links' in t, 'the report of the handle links is missing')
    # the words the owner took out stay out, everywhere
    for bad in ('6615', 'Cross Creek', 'Suite', '77441', 'Bend Lane', 'link in bio', 'Link in bio', 'LINK IN BIO', '\U0001F4CD'):
        need(bad not in t, 'contains %r' % bad)
    # no emoji anywhere but inside the post texts
    outside = t
    for x in posts:
        outside = outside.replace(x or '\0', '')
    need(emoji(outside) == [], 'an emoji outside the post texts')
    # the phone number: written one way, everywhere, and it is the right one
    nums = re.findall(r'\(?\d{3}\)?[ .-]\d{3}[ .-]\d{4}', t)
    need(nums and all(x == PHONE for x in nums), 'a phone number is not %s: %s' % (PHONE, set(nums)))
    # links: only this post's pictures and the booking picker
    urls = {u.rstrip('.') for u in re.findall(r'https?://[^\s,;)]+', t)}
    need(urls == set(p.urls) | {BOOK}, 'links are not exactly this post\'s pictures and the booking picker: %s' % sorted(urls ^ (set(p.urls) | {BOOK}))[:4])
    listed = re.findall(r'^    PICTURE (\d+), (\d+)x(\d+): (\S+)$', t, re.M)
    need([(int(n), u) for n, _, _, u in listed] == list(enumerate(p.urls, 1)), 'the pictures are not listed 1..%d in order with their links' % p.n)
    need(all((int(w), int(h)) == SIZE for _, w, h, _ in listed), 'a picture is listed with the wrong size')
    # dates: only this post's day (and, for the first four posts, the days the Saturday paragraph is about)
    day_ok = {'October %d' % p.meta['day'][1], 'October 3'}      # October 3 is the day of the shoot
    if p.variant_a:
        day_ok |= {'October 15', 'October 16', 'October 17'}
    dates = re.findall(r'(?:(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday), )?October \d+(?:, \d{4})?', t)
    need(all(re.sub(r'^\w+day, ', '', re.sub(r', \d{4}$', '', d)) in day_ok for d in dates), 'an unexpected date: %s' % sorted(set(dates) - day_ok)[:3])
    need(set(re.findall(r'\b20\d\d\b', t)) == {'2026'}, 'a year other than 2026')
    need('not before %s on %s' % (m['earliest'], m['when']) in t, 'the earliest time is missing or wrong')
    need('between 9 AM and 8 PM' in t, 'the hours are missing')
    # nothing about money, the drive, or other places to post
    need('$' not in t, 'a dollar sign')
    need('donation page' not in t, 'it claims something about the bio link')
    need(len(re.findall(r'\bstor(?:y|ies)\b', t)) == 1, 'stories are mentioned more or less than the once, in the rule against them')
    need('no stories and no reels' in t, 'the rule against stories and reels is missing')
    need('not the Wharton or Katy ones' in t, 'the Wharton and Katy rule is missing')
    # the rules that keep the muse in its lane
    for rule in ('Do not edit the captions, the post text, the alt text or the pictures', 'Do not boost or promote anything', 'Do not pin, unpin or edit any existing post',
                 'Do not reply to comments or messages', 'Post each one ONCE', 'BEFORE you click Share or Post', 'Do not add a location or a check-in',
                 'If it is outside those hours, or it is earlier than that', 'turn that OFF', 'Make sure sharing to Facebook is OFF', 'Do not tag anyone',
                 'leave it exactly as it is', 'Do not add anything of your own to the posts', 'will not take all %d pictures in one post' % p.n,
                 'Do not use Remix, Add Yours, collaborator invites or partnership labels', 'do not crop the pictures', 'Keep them at their own portrait shape (4:5)'):
        need(rule in t, 'the rule is missing: ' + rule)
    need(t.count('Do not mention prices, the Rolling for Ribbons fundraiser, donations') == 1, 'the money rule is missing')
    need(m['offer'] in t, 'the offer line is missing or changed')
    need(('Kids Trials' in t) == (m['picker'] in ('youth', 'both')), 'the picker check is for the wrong audience')
    need(('headed Adult Classes' in t) == (m['picker'] in ('adult', 'both')), 'the picker check is for the wrong audience')
    need('Adult Classes and Kids & Teens' in t, 'the picker check is missing')
    # the count is said the same way everywhere
    need(t.count(' %d PICTURES:' % p.n) == 2 and '(%d PICTURES EACH)' % p.n in t, 'the picture count is not stated consistently')
    return probs


def run_mutants(p, text):
    def sub(old, new, n=1):
        assert text.count(old) >= 1, 'mutant pattern not found: %r' % old[:70]
        return text.replace(old, new, n)
    M = [
        ('phone digit wrong in a post text', sub(PHONE, '(281) 393-7984', 1)),
        ('street address added to a caption', sub('#BrazilianJiuJitsu', '6615 West Cross Creek Bend Lane\n#BrazilianJiuJitsu', 1)),
        ('"link in bio" in a caption', sub('Book at labyrinth.vision', 'Book (link in bio) at labyrinth.vision', 1)),
        ('a second emoji in a caption', sub(' ' + BELT, ' ' + BELT + '\U0001F4AA', 1)),
        ('an emoji in the instructions', sub('Use only what is written here.', 'Use only what is written here. \U0001F44D', 1)),
        ('the link in the Facebook text goes to the donation page', sub('Book a free class: %s' % BOOK, 'Book a free class: %s/donate' % SITE, 1)),
        ('a wrong picture link', sub(p.urls[1], p.urls[1].replace('-02.jpg', '-99.jpg'), 1)),
        ('two pictures swapped in the list', sub('PICTURE 2, 1080x1350: %s\n    PICTURE 3, 1080x1350: %s' % (p.urls[1], p.urls[2]), 'PICTURE 2, 1080x1350: %s\n    PICTURE 3, 1080x1350: %s' % (p.urls[2], p.urls[1]), 1)),
        ('a picture given the wrong size', sub('PICTURE 2, 1080x1350', 'PICTURE 2, 1080x1080', 1)),
        ('the last picture dropped from the list', sub('\n    PICTURE %d, 1080x1350: %s' % (p.n, p.urls[-1]), '', 1)),
        ('a link to another picture added', sub('Do not take facts from our website\'s text.', 'Do not take facts from our website\'s text (%s/assets/social/kids-any-day-feed-1.png).' % SITE, 1)),
        ('a day moved', sub(p.meta['when'], p.meta['when'].replace(str(p.meta['day'][1]), str(p.meta['day'][1] + 3)), 1)),
        ('the year changed', sub('2026', '2027', 1)),
        ('the earliest time removed', sub(', and not before %s on %s' % (p.meta['earliest'], p.meta['when']), '', 1)),
        ('the earliest time changed', sub('not before %s' % p.meta['earliest'], 'not before 6:00 AM', 1)),
        ('the hours removed', sub('between 9 AM and 8 PM, and not before', 'at any time, and not before', 1)),
        ('an alt text line removed', sub('\n2: ', '\n', 1)),
        ('an alt text line changed', sub(p.alt_lines[2][1][:25], p.alt_lines[2][1][:25] + ' wearing a green belt', 1)),
        ('the alt text block emptied', text.replace(p.alt, '', 1)),
        ('the credit removed from an Instagram caption', sub(CREDIT_IG + '\n\n', '', 1)),
        ('the credit removed from a Facebook text', sub(CREDIT_FB + '\n\n', '', 1)),
        ('the credit changed in an Instagram caption', sub(CREDIT_IG, 'Photos by @rayharkness', 1)),
        ('the credit changed in a Facebook text', sub(CREDIT_FB, 'Photos by Ray and Israel De Leon.', 1)),
        ('a handle misspelt', sub(HANDLES[0], '@rayharknes', 1)),
        ('the second handle misspelt in the rules', sub('and @002.Deleon, in the last line of each text before the hashtags', 'and @002.DeLeon, in the last line of each text before the hashtags', 1)),
        ('a full stop after the Instagram handle', sub(CREDIT_IG, CREDIT_IG + '.', 1)),
        ('a third mention added', sub('Photos by @rayharkness', '@labyrinthbjj Photos by @rayharkness', 1)),
        ('a mention in an alt text', sub(p.alt_lines[1][1][:20], '@rayharkness ' + p.alt_lines[1][1][:20], 1)),
        ('the handle-link check removed', sub(' On Instagram, check that ' + HANDLES[0] + ' and ' + HANDLES[1] + ' in the caption are links that open those two accounts: if either is not a link, or opens a different account, tell me and do not change the caption.', '', 1)),
        ('the Facebook tag-suggestion rule removed', sub(', so if the composer offers to tag a profile or Page while you paste, do not choose any suggestion', '', 1)),
        ('the report of the handle links removed', sub(', and whether both handles in the Instagram caption turned into links', '', 1)),
        ('the collaborator ban removed', sub(' and do not invite anyone as a collaborator', '', 1)),
        ('the other-mentions ban removed', sub(' and add no other mention', '', 1)),
        ('a price added', sub('No commitment.', 'No commitment. Membership from $239 a month.', 1) if 'No commitment.' in text else sub('with no commitment.', 'with no commitment. Membership from $239 a month.', 1)),
        ('an Instagram story asked for', sub('Then share it.\n', 'Then share it. Then make an Instagram story of the first picture.\n', 1)),
        ('the stories rule weakened', sub('no stories and no reels', 'no reels', 1)),
        ('the Wharton and Katy rule shortened', sub('not the Wharton or Katy ones', 'not the Wharton one', 1)),
        ('the post-once rule removed', sub('- Post each one ONCE. If a post seems to have failed, look at the profile or the Page before you try again, so that nothing goes up twice.\n', '', 1)),
        ('the pin rule removed', sub('Do not pin, unpin or edit any existing post, and do not change the Page\'s cover, profile picture, buttons or About section.', 'Do not change the Page\'s cover.', 1)),
        ('the edit rule removed', sub('- Do not edit the captions, the post text, the alt text or the pictures. Use them exactly as given. If Instagram or Facebook warns about the wording, do not rewrite it to get past the warning: tell me.\n', '', 1)),
        ('the boost rule removed', sub('- Do not boost or promote anything, do not create or edit any ad, and do not spend any money.\n', '', 1)),
        ('the comments rule removed', sub('- Do not reply to comments or messages. Tell me if anything needs an answer (for example somebody asking which class to start in, whether they are old enough, or what it costs).\n', '', 1)),
        ('the tagging rule removed', sub([l for l in text.split('\n') if l.startswith('- Do not tag anyone in the pictures')][0] + '\n', '', 1)),
        ('the "add nothing of your own" rule removed', sub('Do not add anything of your own to the posts: no extra hashtags, mentions, links, emoji or comments. ', '', 1)),
        ('the Instagram-to-Facebook toggle instruction removed', sub('Make sure sharing to Facebook is OFF and that it is not shared anywhere else. ', '', 1)),
        ('the Facebook-to-Instagram toggle instruction removed', sub('if the composer offers to post to Instagram as well, turn that OFF. ', '', 1)),
        ('the bio-link rule removed', sub('Do not touch the Instagram bio link: leave it exactly as it is. ', '', 1)),
        ('the crop rule removed', sub('Keep them at their own portrait shape (4:5): do not crop them to a square. ', '', 1)),
        ('the all-or-nothing rule removed', sub('- If Instagram or Facebook will not take all %d pictures in one post, do not post anything: tell me how many it will take.\n' % p.n, '', 1)),
        ('a hashtag dropped from a post text', sub(' #KatyTX', '', 1)),
        ('the town named in an alt text', sub(p.alt_lines[0][1][:20], 'In Fulshear, ' + p.alt_lines[0][1][:20], 1)),
        ('a street suite added to the facts', sub('Labyrinth BJJ, Fulshear, TX. Phone', 'Labyrinth BJJ, Suite #400, Fulshear, TX. Phone', 1)),
        ('the offer line changed', sub('first class is free', 'first class is $20', 1)),
        ('the check of the picker removed', sub('It must open a class picker with two buttons, Adult Classes and Kids & Teens. ', '', 1)),
        ('the picker check for the wrong audience', sub(PICKER[p.meta['picker']], PICKER['adult'] if p.meta['picker'] != 'adult' else PICKER['youth'], 1)),
        ('a claim about the bio link added', sub('leave it exactly as it is.', 'leave it exactly as it is (it points at our donation page).', 1)),
        ('the picture count wrong in one place', sub('A1. INSTAGRAM POST, %d PICTURES' % p.n, 'A1. INSTAGRAM POST, %d PICTURES' % (p.n + 1), 1)),
        ('a caption word changed', sub('Swipe through for more.' if 'Swipe through for more.' in text else 'No experience', 'Swipe through for less.' if 'Swipe through for more.' in text else 'No experience at all', 1)),
    ]
    if p.variant_a:
        M += [
            ('the Saturday paragraph missing from the Instagram caption', text.replace(HEADS_UP + '\n\n' + IG_BOOKING, IG_BOOKING, 1)),
            ('the Saturday paragraph missing from the Facebook text', text.replace(HEADS_UP + '\n\n' + 'Book a free class:', 'Book a free class:', 1)),
            ('the Saturday paragraph also in the later Instagram caption', sub('===== BLOCK 2: INSTAGRAM CAPTION, FROM OCTOBER 17 ON (paste everything between this line and the END line, not these lines) =====\n',
                                                                         '===== BLOCK 2: INSTAGRAM CAPTION, FROM OCTOBER 17 ON (paste everything between this line and the END line, not these lines) =====\n' + HEADS_UP + '\n\n', 1)),
            ('the date rule changed', sub('From Saturday, October 17, 2026 on', 'From Sunday, October 18, 2026 on', 1)),
            ('the date rule for the first texts changed', sub('on Thursday, October 15 or Friday, October 16, 2026, use', 'on Thursday, October 15, 2026, use', 1)),
        ]
    survived = []
    for name, mutated in M:
        found = check(p, mutated)
        print('%-8s %s%s' % ('caught' if found else 'SURVIVED', name, ('   <- ' + found[0][:90]) if found else ''))
        if not found:
            survived.append(name)
    print('\n%s: %d of %d broken versions were caught' % (p.id, len(M) - len(survived), len(M)))
    return not survived


def live(p):
    bad = 0
    for f, u in zip(p.files, p.urls):
        body = subprocess.check_output(['curl', '-sS', '-L', '--max-time', '60', '%s?cb=%d' % (u, int.from_bytes(os.urandom(3), 'big'))])
        repo = open(os.path.join(SHOOT, f), 'rb').read()
        ok = hashlib.sha256(body).hexdigest() == hashlib.sha256(repo).hexdigest()
        bad += not ok
        if not ok:
            print('%-16s live %9d bytes, repo %9d bytes: DIFFERENT' % (f, len(body), len(repo)))
    print('%s: %d of %d pictures at labyrinth.vision are the repo\'s, byte for byte' % (p.id, p.n - bad, p.n))
    return not bad


def main():
    args = sys.argv[1:]
    out = args[args.index('--out') + 1] if '--out' in args else os.path.join(os.getcwd(), 'muse-prompts')
    names = [a for a in args if not a.startswith('--') and a != out]
    if not names:
        raise SystemExit(__doc__)
    ids = [x for x in POSTS if any(p['id'] == x for p in PLAN['posts'])] if names == ['all'] else names
    ok = True
    for pid in ids:
        p, text = build(pid)
        probs = check(p, text)
        if probs:
            print('%s PROBLEMS:\n  ' % pid + '\n  '.join(probs))
            ok = False
            continue
        if '--live' in args:
            ok &= live(p)
        elif '--mutate' in args:
            ok &= run_mutants(p, text)
        else:
            os.makedirs(out, exist_ok=True)
            path = os.path.join(out, 'muse-prompt-%s.txt' % pid)
            open(path, 'w', encoding='utf-8').write(text)
            print('wrote %s (%d characters, %d lines, %d pictures); every check passed' % (path, len(text), text.count('\n') + 1, p.n))
    sys.exit(0 if ok else 1)


if __name__ == '__main__':
    main()
