# Telling people we have moved: drafts

Drafts for the owner to change. Nothing here is sent by the kit. Send them on move day, after the website is live, so that anyone who taps through finds the new address.

Two things are deliberately left in square brackets because nobody has said yet: whether the class times change, and anything about parking or which door to use. Delete the bracket, or fill it in.

The social post breaks one house rule on purpose: our posts keep the street address and the town out of the caption (the hashtags carry the area), because they are about the training. This one is about the address, so the street is in the caption. Everything else follows the rules: one emoji, nothing that says "link in bio", the same words for Instagram and Facebook.

---

## 1. The email to all members (CRM broadcast, email first)

**Subject:** We have moved: 10330 Hidden Lake Ln

Hi {First Name},

On July 1 Labyrinth BJJ moved to a new building:

10330 Hidden Lake Ln, Building 1
Richmond, TX 77406

It is off Fulshear-Gaston Road, about five miles from where we were in Cross Creek Ranch (around eleven minutes by car with no traffic). Please put the new address into your map app before your next class: if you type only "Richmond" it will take you to the other side of town.

Our phone number has not changed: (281) 393-7983.

[Class times have not changed. / The new class times are on the schedule page.] The timetable is always at https://labyrinth.vision/schedule.

[One sentence about parking and which door to use, once somebody has looked.]

See you on the mats,
The Labyrinth team

*Check before sending:* the broadcast footer adds the postal address, and the CRM must already be on the new address (crm/move-day.sql run, send-message redeployed), or the footer of this very email will print the old one.

## 2. The text to all members (CRM broadcast, after the email)

Labyrinth BJJ has moved. New address: 10330 Hidden Lake Ln, Building 1, Richmond TX 77406 (off Fulshear-Gaston Rd). Same phone. Please check the address in your map app. Schedule: labyrinth.vision/schedule

*(205 characters, so two text-message segments, before the CRM adds anything of its own.)*

## 3. Instagram and Facebook (one post, the same words on both)

> We have moved. 🥋 Labyrinth BJJ is now at 10330 Hidden Lake Ln, Building 1, Richmond, TX 77406, off Fulshear-Gaston Road and about five miles from our old home in Cross Creek Ranch. Same phone number, (281) 393-7983. Your first class is still free.
>
> #RichmondTX #FulshearTX #KatyTX #BJJ #BrazilianJiuJitsu #KidsBJJ #JiuJitsu

Picture: none needed. If one is wanted, a photo of the building's front, taken on the day. A photo of people goes through the usual credit rule (@rayharkness, @002.Deleon).

*(Not yet built: art for this post. Ask for it the way the other posts were made.)*

## 4. Google Business Profile post (type "Update", no offer, no button needed)

We have moved to 10330 Hidden Lake Ln, Building 1, Richmond, TX 77406, off Fulshear-Gaston Road. Our phone number is the same: (281) 393-7983. Come and see the new building: the first class is free.

*(The profile's address itself is changed by the listings prompt, step 1. Post this after the address change has been accepted, not before.)*

## 5. A notice on the website

Not built. If the owner wants one for the first weeks, the home page already has a "This month at Labyrinth" strip that is generated from `scripts/build_pages.py` (the cards are defined next to `TODAY_CARD` and `JJWL_CARD`); a "We have moved" card is a few lines there, with `closes_utc` set to the end of July. Ask for it separately, because it changes the home page's layout and the tests that count the cards.
