"""The CRM's edits for the move, as exact old-text-to-new-text pairs (apply_crm.py reads this).

The CRM is the other repository (labyrinth-app). It states the address in three kinds of place, and only the first two are in the code:

  1. the address itself, where a message or a screen prints it: the footer on bulk mail (send-message), the fallback every automated mail uses when the
     settings row has no address (automation-core GYM_ADDRESS), the CRM's own location profile (locations.ts), the demo data (seed.ts), and the pricing
     bundle the renewal job runs (billing-renewals/_core.js, generated from locations.ts by scripts/build-renewal-core.mjs: never edited by hand);
  2. the arrival directions, which were written for the old building ("park at the front of building C and come to Suite #400") in the trial emails,
     the member emails, the event reminder and the booking text message. Nobody has said where to park or which door to use at 10330 Hidden Lake Ln, so
     they now say where the gym is and nothing about parking; add one sentence about parking to `arrival()` and `gettingHere` once somebody has looked;
  3. the one stored copy: settings.data.address in the database (the Settings screen's address, which the automated mail prints before it falls back
     to GYM_ADDRESS). That is not code. crm/move-day.sql changes it, on the day, in the same hour as the deploy.

The CRM keeps the primary gym's id as 'fulshear' (it is stored in rows, settings and tests), and so does this patch. What the owner reads in the CRM as the
gym's name is the Locations screen's name field, which she can change to "Richmond" there.

Every pair must match exactly once or the script stops (min=1): if the CRM has changed since this was written, read the file again and update the pair.
[[tokens]] are filled from ../move.json.
"""

# (path, old, new, note)
CODE = [
    # ── the CRM's own location profile ──
    ("src/data/locations.ts",
     "export const FULSHEAR_ADDRESS = '6615 West Cross Creek Bend Lane, Suite #400, Fulshear'\n",
     "/**\n"
     " * The primary gym keeps its id ('fulshear') and the constant names built on it, because both are stored in rows and settings. Since [[moved]] it is at\n"
     " * Hidden Lake Ln, in Richmond.\n"
     " */\n"
     "export const FULSHEAR_ADDRESS = '[[street]], [[unit]], [[city]]'\n"
     "/** Where it was before. A template the owner saved earlier may still say so, and a Wharton lead must never be shown it. */\n"
     "export const FORMER_FULSHEAR_ADDRESS = '[[old_street]], [[old_unit]], Fulshear'\n",
     "the address the CRM prints, and the old one kept so Wharton's templates can still drop it"),
    ("src/data/locations.ts",
     "    .replaceAll(FULSHEAR_ADDRESS, p.address || WHARTON_ADDRESS)\n",
     "    .replaceAll(FULSHEAR_ADDRESS, p.address || WHARTON_ADDRESS)\n"
     "    .replaceAll(FORMER_FULSHEAR_ADDRESS, p.address || WHARTON_ADDRESS)\n",
     "a Wharton lead gets Wharton's address whichever of the two a saved template holds"),
    ("src/data/locations.ts",
     "    .replaceAll('Labyrinth BJJ in Fulshear', `Labyrinth BJJ in ${p.name || 'Wharton'}`)\n",
     "    .replaceAll('Labyrinth BJJ in Richmond', `Labyrinth BJJ in ${p.name || 'Wharton'}`)\n"
     "    .replaceAll('Labyrinth BJJ in Fulshear', `Labyrinth BJJ in ${p.name || 'Wharton'}`)\n",
     "the phrase the built-in templates use for the primary gym is now 'in Richmond'; saved ones may still say 'in Fulshear'"),
    ("src/data/locations.ts",
     "    address: `${FULSHEAR_ADDRESS}, TX 77441`,\n",
     "    address: `${FULSHEAR_ADDRESS}, TX [[zip]]`,\n",
     "the default location profile's address"),
    ("src/data/pipeline.ts",
     "it is Labyrinth BJJ in Fulshear.",
     "it is Labyrinth BJJ in Richmond.",
     "the first text to an enquiry"),
    ("src/screens/Broadcast.tsx",
     "    Labyrinth BJJ Academy<br>[[old_street]], [[old_unit]], Fulshear, TX [[old_zip]]<br><a href=\"{{unsubscribe}}\"",
     "    Labyrinth BJJ Academy<br>[[street]], [[unit]], [[city]], TX [[zip]]<br><a href=\"{{unsubscribe}}\"",
     "the postal address in the footer of the designed email the Broadcast screen starts from"),
    ("supabase/functions/_shared/agreement-link.ts",
     "  fulshear: { address: '[[old_street]], [[old_unit]], Fulshear, TX [[old_zip]]', phone: '(281) 393-7983', email: 'info@labyrinth.vision' },\n",
     "  fulshear: { address: '[[street]], [[unit]], [[city]], TX [[zip]]', phone: '(281) 393-7983', email: 'info@labyrinth.vision' },\n",
     "where a membership cancellation by certified mail is sent, when the settings row names no address (the primary gym keeps the id 'fulshear')"),
    ("src/data/seed.ts",
     "      address: '[[old_street]], [[old_unit]], Fulshear, TX [[old_zip]]',\n",
     "      address: '[[street]], [[unit]], [[city]], TX [[zip]]',\n",
     "the demo academy's address"),
    # ── the address in the mail ──
    ("supabase/functions/send-message/index.ts",
     "const ADDRESS_LINE = '[[old_street]], [[old_unit]], Fulshear, TX [[old_zip]]'\n",
     "const ADDRESS_LINE = '[[street]], [[unit]], [[city]], TX [[zip]]'\n",
     "the postal address every bulk email must carry"),
    ("supabase/functions/_shared/automation-core.ts",
     "export const GYM_ADDRESS = '[[old_street]], [[old_unit]], Fulshear, TX [[old_zip]]'\n",
     "export const GYM_ADDRESS = '[[street]], [[unit]], [[city]], TX [[zip]]'\n",
     "the address every automated mail falls back to when the settings row has none"),
    ("supabase/functions/_shared/automation-core.ts",
     " * The academy is in Fulshear, Texas. Every calendar question below",
     " * The academy is in Richmond, Texas (in Fulshear until [[moved]]). Every calendar question below",
     "the doc comment"),
    # ── the arrival directions ──
    ("supabase/functions/_shared/trial-emails.ts",
     "    // The parking and suite directions are for the Fulshear building, so Wharton gets the address\n"
     "    // (stated again in the message above) and the parts that are true of every class.\n",
     "    // Nobody has said where to park or which door to use at [[street]], so neither gym's message does: each gets the address\n"
     "    // (stated again in the message above) and the parts that are true of every class.\n",
     "the comment above the Wharton branch"),
    ("supabase/functions/_shared/trial-emails.ts",
     "    ? [`Park at the front of building C and come to Suite #400. Wear something comfortable (a t-shirt and shorts is fine). You don't need a gi.`]\n",
     "    ? [`Wear something comfortable (a t-shirt and shorts is fine). You don't need a gi.`]\n",
     "the short arrival line (reminders): no directions for the old building"),
    ("supabase/functions/_shared/trial-emails.ts",
     "      `Getting here: park at the front of building C and come to Suite #400. Come about ten minutes early so we can show you around and get you signed in.`,\n",
     "      `Getting here: we're at ${address}. Come about ten minutes early so we can show you around and get you signed in.`,\n",
     "the long arrival line (confirmation): the address instead of the old building's directions"),
    ("supabase/functions/_shared/trial-emails.ts",
     "\n      + (normalizeLocation(lead.location) === 'wharton' ? '' : `Park at the front of building C. `)",
     "",
     "the booking text message: no parking line"),
    ("supabase/functions/_shared/member-emails.ts",
     "  // The parking and suite directions are for the Fulshear building only.\n"
     "  const gettingHere = wharton\n"
     "    ? `Getting here: we're at ${gym.address}. Arrive about ten minutes early so there's time to check in and warm up.`\n"
     "    : `Getting here: park at the front of building C and come to Suite #400. Arrive about ten minutes early so there's time to check in and warm up.`\n",
     "  // Nobody has said where to park or which door to use at [[street]], so neither gym's message does: each gets its address.\n"
     "  const gettingHere = `Getting here: we're at ${gym.address}. Arrive about ten minutes early so there's time to check in and warm up.`\n",
     "the member emails' 'Getting here' paragraph"),
    ("supabase/functions/_shared/event-emails.ts",
     "Park at the front of building C and come to Suite #400. Wear something comfortable you can move in, and bring a water bottle.",
     "Wear something comfortable you can move in, and bring a water bottle.",
     "the event reminder"),
]

# The tests that pin the old words. A test that asserted "park at the front of building C" now asserts what the message says instead.
TESTS = [
    ("scripts/automations.test.mjs",
     "const ADDRESS = '[[old_street]], [[old_unit]], Fulshear, TX [[old_zip]]'\n",
     "const ADDRESS = '[[street]], [[unit]], [[city]], TX [[zip]]'\n"),
    ("scripts/automations.test.mjs",
     "yes('adult: park at the front of building C, Suite #400, no gi needed', /front of building C/.test(adult) && /Suite #400/.test(adult) && /don't need a gi/.test(adult))\n",
     "yes('adult: the address, no directions for the old building, no gi needed', adult.includes(`Getting here: we're at ${ADDRESS}`) && !/building C|Suite #400/.test(adult) && /don't need a gi/.test(adult))\n"),
    ("scripts/automations.test.mjs",
     "yes('the reminders carry the arrival help too', /building C/.test(trial.renderTrialEmail('reminder_2h', lead(), GYM, UNSUB).text) && /building C/.test(same.text))\n",
     "yes('the reminders carry the arrival help too (the address, and what to wear)', [trial.renderTrialEmail('reminder_2h', lead(), GYM, UNSUB).text, same.text].every(t => t.includes(ADDRESS) && /Wear something comfortable/.test(t) && !/building C|Suite #400/.test(t)))\n"),
    ("scripts/member-emails.test.mjs",
     "const FULSHEAR = '[[old_street]], [[old_unit]], Fulshear, TX [[old_zip]]'\n",
     "const FULSHEAR = '[[street]], [[unit]], [[city]], TX [[zip]]'   // the primary gym's id is still 'fulshear'; it is at Hidden Lake Ln since [[moved]]\n"),
    ("scripts/member-emails.test.mjs",
     "const FULSHEAR_ANY = /Fulshear|West Cross Creek|Suite #400|building C/i\n",
     "const FULSHEAR_ANY = /Fulshear|Richmond|West Cross Creek|Hidden Lake|Suite #400|building C/i\n"),
    ("scripts/member-emails.test.mjs",
     "yes('a Fulshear member is still told to park at the front of building C and come to Suite #400', f3.text.includes('park at the front of building C and come to Suite #400'))\n",
     "yes('a member of the primary gym is told where it is, and nothing about parking at the old building', f3.text.includes(`Getting here: we're at ${FULSHEAR}`) && !/building C|Suite #400/.test(f3.text))\n"),
    ("scripts/trial-location.test.mjs",
     "const FULSHEAR = '[[old_street]], [[old_unit]], Fulshear, TX [[old_zip]]'\n",
     "const FULSHEAR = '[[street]], [[unit]], [[city]], TX [[zip]]'   // the primary gym's id is still 'fulshear'; it is at Hidden Lake Ln since [[moved]]\n"),
    ("scripts/trial-location.test.mjs",
     "const FULSHEAR_ANY = /Fulshear|West Cross Creek|Suite #400|building C/i\n",
     "const FULSHEAR_ANY = /Fulshear|Richmond|West Cross Creek|Hidden Lake|Suite #400|building C/i\n"),
    ("scripts/trial-location.test.mjs",
     "yes('a Fulshear confirmation still has the Fulshear address and the parking line', fc.text.includes(FULSHEAR) && fc.text.includes('building C'))\n",
     "yes('a confirmation for the primary gym has its address and no directions for the old building', fc.text.includes(FULSHEAR) && fc.text.includes(`Getting here: we're at ${FULSHEAR}`) && !/building C|Suite #400/.test(fc.text))\n"),
    ("scripts/booking-existing.test.mjs",
     "/already booked/.test(m.subject) && /Adult Jiu-Jitsu/.test(m.text) && /Fulshear/.test(m.text) && !/Wharton|Kids/.test(m.text + m.subject))\n",
     "/already booked/.test(m.subject) && /Adult Jiu-Jitsu/.test(m.text) && /Hidden Lake/.test(m.text) && !/Wharton|Kids/.test(m.text + m.subject))\n"),
    ("scripts/booking-location-move.test.mjs",
     "yes('…and the confirmation names Fulshear, not Wharton', /West Cross Creek/.test(m.text) &&",
     "yes('…and the confirmation names the primary gym (Hidden Lake Ln), not Wharton', /Hidden Lake/.test(m.text) &&"),
    ("scripts/booking-location-move.test.mjs",
     "yes('…and the confirmation is Fulshear\\'s', /West Cross Creek/.test(b.mails()[0].text) &&",
     "yes('…and the confirmation is the primary gym\\'s', /Hidden Lake/.test(b.mails()[0].text) &&"),
    ("scripts/location-consumers.test.mjs",
     "check('a location the registry does not have reads as Fulshear, as it does for a hand-typed stranger', [unknown.text.includes('Fulshear'), all(unknown).includes('Katy')], [true, false])",
     "check('a location the registry does not have reads as the primary gym, as it does for a hand-typed stranger', [unknown.text.includes('Hidden Lake'), all(unknown).includes('Katy')], [true, false])"),
    ("scripts/trial-location.test.mjs",
     "yes('Fulshear lead: still in Fulshear', pipeline.fillStep(step('inq_reply').sms, crm()).includes('Labyrinth BJJ in Fulshear'))\n",
     "yes('primary-gym lead: in Richmond', pipeline.fillStep(step('inq_reply').sms, crm()).includes('Labyrinth BJJ in Richmond'))\n"),
    ("scripts/member-lifecycle.test.mjs",
     "f.text.includes('Suite #400, Fulshear'))\n",
     "f.text.includes('[[unit]], [[city]]'))\n"),
    ("scripts/member-lifecycle.test.mjs",
     "    && !/Fulshear|West Cross Creek|Suite #400|building C/i.test(w.text + w.html))\n",
     "    && !/Fulshear|Richmond|West Cross Creek|Hidden Lake|Suite #400|building C/i.test(w.text + w.html))\n"),
    ("scripts/member-lifecycle.test.mjs",
     "  const FULSHEAR_ANY = /Fulshear|West Cross Creek|Suite #400|building C/i\n",
     "  const FULSHEAR_ANY = /Fulshear|Richmond|West Cross Creek|Hidden Lake|Suite #400|building C/i\n"),
    ("scripts/member-lifecycle.test.mjs",
     "yes('a Fulshear member\\'s welcome_d3 still says building C and Suite #400', f3.text.includes('park at the front of building C and come to Suite #400'))\n",
     "yes('a member of the primary gym is told where it is, and nothing about parking at the old building', f3.text.includes('Getting here: we\\'re at [[street]], [[unit]], [[city]], TX [[zip]]') && !/building C|Suite #400/.test(f3.text))\n"),
    # ── tests added after this patch was first written (the membership agreement's pages, the trial waiver, the free week): their invented gym is the primary gym ──
    ("scripts/agreement-link-e2e.test.mjs",
     '"address":"[[old_street]], [[old_unit]], Fulshear, TX [[old_zip]]"',
     '"address":"[[street]], [[unit]], [[city]], TX [[zip]]"'),
    ("scripts/agreement-link-stack.test.mjs",
     '"address":"[[old_street]], [[old_unit]], Fulshear, TX [[old_zip]]"',
     '"address":"[[street]], [[unit]], [[city]], TX [[zip]]"'),
    ("scripts/agreement-link-shared.test.mjs",
     "const CTX = (over = {}) => ({ address: '[[old_street]], [[old_unit]], Fulshear, TX [[old_zip]]', contactEmail",
     "const CTX = (over = {}) => ({ address: '[[street]], [[unit]], [[city]], TX [[zip]]', contactEmail"),
    ("scripts/agreement-link-shared.test.mjs",
     "['201 N Houston St, Wharton, TX 77488', '[[old_street]], [[old_unit]], Fulshear, TX [[old_zip]]']",
     "['201 N Houston St, Wharton, TX 77488', '[[street]], [[unit]], [[city]], TX [[zip]]']"),
    ("scripts/agreement-link.test.mjs",
     "const FULSHEAR = '[[old_street]], [[old_unit]], Fulshear, TX [[old_zip]]'\n",
     "const FULSHEAR = '[[street]], [[unit]], [[city]], TX [[zip]]'   // the primary gym's id is still 'fulshear'; it is at Hidden Lake Ln since [[moved]]\n"),
    ("scripts/email-design.test.mjs",
     "const FULSHEAR = '[[old_street]], [[old_unit]], Fulshear, TX [[old_zip]]'\n",
     "const FULSHEAR = '[[street]], [[unit]], [[city]], TX [[zip]]'   // the primary gym's id is still 'fulshear'; it is at Hidden Lake Ln since [[moved]]\n"),
    ("scripts/email-design.test.mjs",
     "!/Fulshear|West Cross Creek|Suite #400|\\(281\\)/.test(e.text + e.html)",
     "!/Fulshear|Richmond|West Cross Creek|Hidden Lake|Suite #400|\\(281\\)/.test(e.text + e.html)"),
    ("scripts/free-week-offer.test.mjs",
     "address: '[[old_street]], [[old_unit]], Fulshear, TX [[old_zip]]', phone: '(281) 555-0000'",
     "address: '[[street]], [[unit]], [[city]], TX [[zip]]', phone: '(281) 555-0000'"),
    ("scripts/trial-waiver-e2e.test.mjs",
     "const ADDRESS = '[[old_street]], [[old_unit]], Fulshear, TX [[old_zip]]'\n",
     "const ADDRESS = '[[street]], [[unit]], [[city]], TX [[zip]]'\n"),
    ("scripts/trial-waiver.test.mjs",
     "const GYM = { name: 'Labyrinth BJJ Academy', address: '[[old_street]], [[old_unit]], Fulshear, TX [[old_zip]]', phone: '(281) 393-7983'",
     "const GYM = { name: 'Labyrinth BJJ Academy', address: '[[street]], [[unit]], [[city]], TX [[zip]]', phone: '(281) 393-7983'"),
    ("scripts/trial-waiver.test.mjs",
     "const ADDRESS = '[[old_street]], [[old_unit]], Fulshear, TX [[old_zip]]'\n",
     "const ADDRESS = '[[street]], [[unit]], [[city]], TX [[zip]]'\n"),
    ("scripts/winback.test.mjs",
     "/6615 West Cross Creek Bend Lane/.test(s.html)",
     "/Hidden Lake Ln/.test(s.html)"),
    ("scripts/agreement-link-shared.test.mjs",
     "standard.includes('Fulshear, TX 77441')",
     "standard.includes('[[city]], TX [[zip]]')"),
    # the two assertions that the other gym's wording does NOT carry the primary gym's address: they would pass for ever once nothing says it, so they name the new one
    ("scripts/agreement-link.test.mjs",
     "r.people[5].text.includes('Fulshear, TX 77441'), r.people[0].text.includes(WHARTON)",
     "r.people[5].text.includes('[[city]], TX [[zip]]'), r.people[0].text.includes(WHARTON)"),
    ("scripts/agreement-link.test.mjs",
     "lastSign().p_text.includes('Fulshear, TX 77441')], [true, false])",
     "lastSign().p_text.includes('[[city]], TX [[zip]]')], [true, false])"),
    # the designed layout's "open the address in Maps" link carries the street in its query
    ("scripts/booking-sanitise.test.mjs",
     "(6615%20West%20Cross%20Creek|201%20N%20Houston)",
     "(10330%20Hidden%20Lake|201%20N%20Houston)"),
    ("scripts/send-message-design.test.mjs",
     "/Fulshear, TX 77441/.test(m.text) && /Fulshear, TX 77441/.test(m.html)",
     "/[[city]], TX [[zip]]/.test(m.text) && /[[city]], TX [[zip]]/.test(m.html)"),
    ("scripts/trial-waiver.test.mjs",
     "${GYM.address}. Park at the front of building C. Come ten minutes early",
     "${GYM.address}. Come ten minutes early"),
]

DOCS = [
    ("docs/AUTOMATIONS.md",
     "the \"Getting here\" paragraph from `members.location`; the building C and Suite #400 directions are\nFulshear only.",
     "the \"Getting here\" paragraph from `members.location`; for both gyms it gives the address and nothing about\nparking (nobody has said where to park at [[street]]; add a sentence to `arrival()` in `trial-emails.ts` and to\n`gettingHere` in `member-emails.ts` once somebody has looked)."),
]
