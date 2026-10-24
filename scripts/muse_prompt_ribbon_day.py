#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
The Muse (posting agent) prompt for the Saturday morning reminder post, October 24, 2026: one Instagram carousel and one Facebook post (two pictures each) and one Instagram
story, about Rolling for Ribbons at 11:00 AM and the regular Saturday classes being off. Run with python3 -I.

Nothing the owner approved is retyped here: the Instagram caption, the Facebook text and the alt text are read from scripts/ribbon-day-captions.txt, the pictures' sizes from
assets/social/ribbon-day/. What is written here is only the instructions to the agent, in the wording of the Saturday post's prompt of October 20 (the same rules, a story added,
the time window of the morning), and the few facts the post stands on.

  python3 -I scripts/muse_prompt_ribbon_day.py [OUT_FILE]    writes the prompt (default: Muse-prompt-Saturday-morning-Instagram-and-Facebook-post.txt in the current folder), then checks it
"""
import os
import re
import struct
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
CAPS = open(os.path.join(HERE, 'ribbon-day-captions.txt'), encoding='utf-8').read()
SLIDES = os.path.join(REPO, 'assets', 'social', 'ribbon-day')
SITE = 'https://labyrinth.vision'
PAGE = SITE + '/self-defense-for-women'
PHONE = '(281) 393-7983'
HANDLE = '@rayharkness'
FEED_SIZE, STORY_SIZE = (1080, 1350), (1080, 1920)
FILES = [('ribbon-day-01.jpg', FEED_SIZE), ('ribbon-day-02.jpg', FEED_SIZE), ('ribbon-day-story.jpg', STORY_SIZE)]
URLS = ['%s/assets/social/ribbon-day/%s' % (SITE, f) for f, _ in FILES]
FIRST_LINE = 'Today at 11.'


def section(name):
    m = re.search(r'^={20} %s ={20}\n(.*?)(?=^={20} |\Z)' % re.escape(name), CAPS, re.M | re.S)
    if not m:
        raise SystemExit('ribbon-day-captions.txt has no section "%s"' % name)
    return m.group(1).strip('\n')


def jpeg_size(path):
    with open(path, 'rb') as f:
        d = f.read()
    i = 2
    while i < len(d):
        if d[i] != 0xFF:
            i += 1
            continue
        mk = d[i + 1]
        if 0xC0 <= mk <= 0xCF and mk not in (0xC4, 0xC8, 0xCC):
            h, w = struct.unpack('>HH', d[i + 5:i + 9])
            return (w, h)
        i += 2 + struct.unpack('>H', d[i + 2:i + 4])[0]
    raise SystemExit('no size in ' + path)


IG = section('ribbon-day: INSTAGRAM CAPTION')
FB = section('ribbon-day: FACEBOOK POST TEXT')
ALT_LINES = re.findall(r'^(Picture \d+|Story): (.*)$', section('ribbon-day: ALT TEXT'), re.M)
assert [a for a, _ in ALT_LINES] == ['Picture 1', 'Picture 2', 'Story'], 'the alt text lines are not Picture 1, Picture 2, Story'
ALT = '\n'.join('%s: %s' % (a, t) for a, t in ALT_LINES)
for f, size in FILES:
    assert jpeg_size(os.path.join(SLIDES, f)) == size, '%s is not %s' % (f, size)

PROMPT = """TODAY, SATURDAY, OCTOBER 24: A REMINDER FOR INSTAGRAM AND FACEBOOK (A 2-PICTURE POST ON EACH, AND AN INSTAGRAM STORY)

I run Labyrinth BJJ in Fulshear, TX. Today, Saturday, October 24, 2026, our free women's self defense seminar, Rolling for Ribbons, is at 11:00 AM, and the academy runs a changed schedule around it: a workout from 9:00 to 10:00 AM, an open mat from 10:00 to about 10:45 AM, then the seminar from 11:00 AM to 12:30 PM. Our regular Saturday classes are off today. I want a reminder shared this morning, while there is still time to come: one Instagram post (a carousel you swipe through) and one post on our Facebook Page, each with the same 2 pictures in the same order, and one Instagram story. Please publish them as described below. Everything you need, including all the wording, is in this message.

RULES (they apply to everything)
- Use only the facts and wording below. Do not invent or add prices, dollar amounts, totals, times, dates, names, offers or claims. Do not mention the matching gift, the donation page or any amount of money, and do not mention the JJWL tournament or its results in this job.
- Do not take facts from our website's text. Everything you may rely on is in this message.
- Do not edit the captions, the post text, the alt text or the pictures. Use them exactly as given. If Instagram or Facebook warns about the wording, do not rewrite it to get past the warning: tell me.
- Do not add anything of your own to the posts: no extra hashtags, mentions, links, emoji or comments. Do not add music, text, stickers, filters, effects, templates, frames, polls, events or offers to the posts, the story or the pictures, and do not crop, zoom, rotate or resize the pictures (the two feed pictures must stay whole and portrait: see A1). Do not use Remix, Add Yours, collaborator invites or partnership labels. Do not create a Facebook event. Do not add a location or a check-in, and do not add a feeling or an activity.
- Do not tag anyone in the pictures and do not invite anyone as a collaborator. The only mention in this job is the photographer's Instagram handle, @@HANDLE@@, in the last line of each text before the hashtags: leave it exactly as written and add no other mention.
- Do not boost or promote anything, do not create or edit any ad, and do not spend any money.
- Do not touch the Instagram bio link: leave it exactly as it is. Do not pin, unpin or edit any existing post, and do not change the Page's cover, profile picture, buttons or About section.
- The only post you may delete is one you have just made in this job that came out square or cut off (see the check after A2). Do not delete, hide, archive or edit anything else.
- Do not reply to comments or messages. Tell me if anything needs an answer (for example somebody asking whether they can still come, whether they can bring a child, whether men can come, or what it costs).
- Use the Labyrinth BJJ Instagram account and the Labyrinth BJJ Facebook Page for the Fulshear gym, not the Wharton or Katy ones. Post only where this message says: no personal profiles, no groups, no other accounts or Pages, no Threads, no reels and no Facebook story.
- This is for this morning only. Post between 6:00 AM and 10:30 AM Central Time on Saturday, October 24, 2026, once you have checked the date and the time. If it is any other day, or outside those hours, or you cannot tell the date and the time, do not post: tell me.
- Post each one ONCE. If a post seems to have failed, look at the profile or the Page before you try again, so that nothing goes up twice.
- If either account already has a post that begins "@@FIRST@@", do not post anything: tell me.
- If Instagram or Facebook will not take both pictures in one post, do not post anything: tell me how many it will take.
- If anything on screen differs from what I describe (a missing button, an account that is not ours, a warning, an error, a sign-in or verification screen), stop and tell me BEFORE you click Share or Post.

FACTS
- Labyrinth BJJ, Fulshear, TX. Phone @@PHONE@@, which takes calls and texts.
- Today, Saturday, October 24, 2026: 9:00 to 10:00 AM a workout; 10:00 to about 10:45 AM an open mat; 11:00 AM to 12:30 PM Rolling for Ribbons, a free self defense seminar for women, led by Coach Scott and Professor Tony, no experience needed, built on the jiu-jitsu we teach every day. The regular Saturday classes are off today. Nothing else is being announced.
- Donations and merch sales at the event go directly to a family affected by breast cancer. That is all that is said about donations.
- The seminar's page, with its RSVP form: @@PAGE@@ . The Facebook text has this link. The Instagram caption has no link: it says labyrinth.vision/self-defense-for-women as plain text.
- The photograph on picture 1 and on the story was taken by Ray Harkness, whose Instagram handle is @@HANDLE@@, credited in the last line of each text, before the hashtags. Picture 2 has no photograph.
- Pictures (download these exact files; they are already on the site). Picture 1 is the cover, picture 2 is the day's schedule, and the story has both in one picture:
@@PICTURES@@
  Open each one and check that it is that size and shows what its alt text (BLOCK 3) says. If one does not, stop and tell me.
  All three are dark plum with pink and white words, a pink satin ribbon curling through them and big pink numerals: picture 1 has a big pink "11" with "AM" beside it and a photograph of two women on a mat; picture 2 has three rows of numerals, 9, 10 and 11, with their times; the story has the "11 AM", the photograph and the three rows. That is how they are meant to look. Pictures 1 and 2 are portrait, 1080 wide and 1350 tall (4:5), and the story is 1080 wide and 1920 tall (9:16). Do not crop, zoom or "fix" any of them.

BEFORE YOU START
1. Check today's date and the time in Central Time (see the rule about the date above).
2. Open @@PAGE@@ . It must open a page headed "Rolling for Ribbons" that gives Saturday, October 24, 11:00 AM to 12:30 PM and has a form to RSVP. If it says the event has passed, or does not match, stop and tell me. Do not copy any words from the page.
3. Download the 3 pictures and check them as described under FACTS.

THE POSTS (publish these, in this order, one after the other)
A1. INSTAGRAM POST, 2 PICTURES: make a new post and select the first two pictures, picture 1 first and picture 2 last, so that it is one post you can swipe through. KEEP THEM PORTRAIT: Instagram's composer makes a carousel square unless you tell it not to, and a square post cuts the top and bottom off every picture. In the crop step, before you go on, make the preview taller than it is wide, showing the whole picture: on instagram.com click the crop button (two small arrows) at the bottom left of the picture and choose Original, or 4:5 if there is no Original; in the Instagram app tap the small expand button (two arrows) at the bottom left of the first picture until the picture is tall, not square; in any other tool you use to post, choose the original or 4:5 shape. Do not zoom, drag or resize the pictures inside the frame. Check that the preview is portrait before you go on, and again just before you share. If you cannot get a portrait preview, STOP and tell me before you share anything: do not post a square. Add no filters, no music and no location, and tag nobody. Paste the caption exactly (BLOCK 1). Give each picture its alt text from BLOCK 3: the line that begins "Picture 1:" is the alt text of picture 1 and the line that begins "Picture 2:" of picture 2; paste the text after the colon (Advanced settings, then Write alt text; it shows each picture in turn). If you cannot give each picture its own alt text, add what you can and tell me. Make sure sharing to Facebook is OFF and that it is not shared anywhere else. Then share it.
A2. FACEBOOK POST, 2 PICTURES: on the Labyrinth BJJ Page, make a photo post. Upload the first two pictures, in the same order. Paste the text exactly (BLOCK 2): the photographer's handle is plain text, so if the composer offers to tag a profile or Page while you paste, do not choose any suggestion. Add the same alt text to each picture (BLOCK 3) if the option is there (it is under Edit on each photo); if you cannot add alt text, post without it and tell me. Make sure the post goes to the Facebook Page only: if the composer offers to post to Instagram as well, turn that OFF. Do not pin it. Then post it.
A3. INSTAGRAM STORY: upload the story picture (the third one) and post it as it is (see BLOCK 4). Add nothing to it: no sticker, no link sticker, no text, no music, no tag, no location. If the story composer offers to share it to Facebook as well, turn that OFF: it goes to Instagram only. Add the alt text from BLOCK 3, the line that begins "Story:", if the option is there; if it is not, post without it. Then share it.

After each one is up, open it and check that it is complete. On the two posts, check that both pictures are there in the right order, that nothing is cropped, and that the caption or text is complete. On Instagram the pictures must be portrait (taller than they are wide): picture 1 must show its words ("Today", "Sat, Oct 24", "Rolling for Ribbons", "Free women's self defense", "No regular classes today") and the big pink "11" in full, and picture 2 all three rows (9, 10 and 11) with their times, the line "No regular classes today" and the RSVP line at the foot in full. If the Instagram post is square, or anything is cut off, delete that post (the one you just made, and nothing else), make it again with the portrait crop, and tell me you did: do not leave a square post up. On Facebook, check that the link is clickable and opens the Rolling for Ribbons page. Facebook shows a grid of the pictures and may trim their edges in the feed: that is normal, but click a picture and check that it opens whole. On the story, check that it opens whole, with the big "11 AM" at the top and the web address (labyrinth.vision/self-defense-for-women) at the foot: Instagram lays its own buttons over the very top and the very bottom of a story, which is normal.

WHEN YOU ARE DONE, SEND ME
- The link to the Instagram post and the link to the Facebook post, whether the story is up, and the time each went up (Central Time).
- Whether the Instagram post came out portrait the first time, or you had to delete it and make it again; and, if you could not get a portrait preview, which tool you were using and what crop choices it offered.
- Anything that looked different from what I described, any warning you saw, and anything you were not sure about.
- Any comment or message that needs an answer from me, copied exactly.

@@BLOCKS@@
"""

BLOCK_HEAD = '===== BLOCK %s: %s (paste everything between this line and the END line, not these lines) ====='
STORY_BLOCK = ('Use the third picture, ribbon-day-story.jpg, as it is: no sticker, no link sticker, no text, no music, no tag, no location. It already carries the day, the three times '
               'and the web address of the seminar page, so that nothing needs adding to it.')


def build():
    text = PROMPT
    names = ['PICTURE 1, 1080x1350', 'PICTURE 2, 1080x1350', 'STORY, 1080x1920']
    pictures = '\n'.join('    %s: %s' % (n, u) for n, u in zip(names, URLS))
    for key, val in (('FIRST', FIRST_LINE), ('PHONE', PHONE), ('PAGE', PAGE), ('PICTURES', pictures), ('HANDLE', HANDLE)):
        text = text.replace('@@%s@@' % key, val)
    blocks = [('1', 'INSTAGRAM CAPTION', IG), ('2', 'FACEBOOK POST TEXT', FB), ('3', 'ALT TEXT, ONE LINE PER PICTURE, IN ORDER, THEN THE STORY', ALT), ('4', 'THE STORY', STORY_BLOCK)]
    # the owner's blocks go in last, so that a { or an @ inside them can never be mistaken for a placeholder
    head = lambda n, title: (BLOCK_HEAD % (n, title)) if n != '4' else '===== BLOCK 4: %s (an instruction: there is nothing to paste) =====' % title
    body = '\n\n'.join('%s\n%s\n===== END OF BLOCK %s =====' % (head(n, title), val, n) for n, title, val in blocks)
    assert text.count('@@BLOCKS@@') == 1
    text = text.replace('@@BLOCKS@@', body)
    assert '@@' not in text.replace('@rayharkness', ''), 'a placeholder was left in'
    return text


def emoji(s):
    return re.findall('[\U0001F000-\U0001FFFF☀-➿⬀-⯿]', s)


def check(t):
    problems = []
    instructions = t.split('===== BLOCK 1:')[0]
    if any(ord(c) > 127 for c in instructions):
        problems.append('the instructions have a non-ASCII character')
    if '—' in t or '–' in t:
        problems.append('an em or en dash')
    if len(emoji(IG)) != 1 or len(emoji(FB)) != 1:
        problems.append('each text must have exactly one emoji: %s / %s' % (emoji(IG), emoji(FB)))
    for label, s in (('instagram', IG), ('facebook', FB)):
        if not s.startswith(FIRST_LINE):
            problems.append(label + ' text does not begin with the first line')
        if sorted(set(re.findall(r'@[A-Za-z0-9._]+', s))) != [HANDLE]:
            problems.append('%s text has mentions other than %s: %s' % (label, HANDLE, sorted(set(re.findall(r'@[A-Za-z0-9._]+', s)))))
        for bad in ('link in bio', 'Link in bio', 'West Cross', 'Fulshear,', 'Fulshear TX', '$', 'JJWL', 'matching', 'matched'):
            if bad in s:
                problems.append('%s text contains %r' % (label, bad))
        for must in ('9:00 to 10:00 AM: Workout', '10:00 to about 10:45 AM: Open mat', '11:00 AM to 12:30 PM: Rolling for Ribbons', 'Coach Scott and Professor Tony',
                     'No regular Saturday classes today', 'family affected by breast cancer', 'self-defense-for-women', 'No experience needed'):
            if must not in s:
                problems.append('%s text does not say %r' % (label, must))
    for label, s, want in (('Instagram', IG, 'Photo by @rayharkness'), ('Facebook', FB, 'Photo by @rayharkness on Instagram.')):
        lines = [l for l in s.rstrip().split('\n') if l.strip()]
        if not lines[-1].startswith('#') or lines[-2] != want:
            problems.append('the %s credit line is not %r as the last line before the hashtags (the Instagram one has no full stop after the handle)' % (label, want))
    if 'http' in IG:
        problems.append('the Instagram caption has a link')
    if PAGE not in FB:
        problems.append('the Facebook text lacks the seminar link')
    if re.search(r'\b(he|she|they|them|her|his|their|him|hers)\b', ALT, re.I):
        problems.append('the alt text uses a pronoun')
    for u in URLS:
        if u not in t:
            problems.append('prompt lacks ' + u)
    for must in ('between 6:00 AM and 10:30 AM', 'Saturday, October 24, 2026', 'STOP and tell me', 'KEEP THEM PORTRAIT', 'BLOCK 3', 'BLOCK 4', 'Rolling for Ribbons', 'INSTAGRAM STORY', 'no Facebook story'):
        if must not in t:
            problems.append('prompt lacks %r' % must)
    others = {m.rstrip('.') for m in re.findall(r'@[A-Za-z0-9._]+', t)} - {HANDLE}
    if others:
        problems.append('mentions other than the photographer\'s: %s' % sorted(others))
    return problems


def main():
    t = build()
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.getcwd(), 'Muse-prompt-Saturday-morning-Instagram-and-Facebook-post.txt')
    open(out, 'w', encoding='utf-8').write(t)
    problems = check(t)
    print('wrote', out)
    print('prompt bytes:', len(t.encode()), '| instagram chars:', len(IG), '| facebook chars:', len(FB))
    print('PROBLEMS:' if problems else 'all checks passed', *problems, sep='\n  ')
    sys.exit(1 if problems else 0)


if __name__ == '__main__':
    main()
