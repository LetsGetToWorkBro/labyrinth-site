"""The area pages after the move: written, not find-and-replaced.

Every page in areas/ is written around one question, "how far is the academy from where I live, and is the drive worth it?", and the answer was true
for 6615 West Cross Creek Bend Lane. At 10330 Hidden Lake Ln it is a different answer for almost every town, so these pages are rewritten from the
measured routes (routes.json: road distance and free-flow minutes from the new address, from OSRM on OpenStreetMap data, to the interpolated
street-range point 29.675445, -95.820810; routes_both.json: the same for the Katy academy, 1806 Avenue D).

apply_move.py copies the AREAS list below (the text between the two markers) into scripts/build_areas.py, fills the [[tokens]] from move.json and
rebuilds areas/. Two things are checked against the site as it is on the day: CLAIMS, every class time these pages quote, against
scripts/schedule_data.py; and NEARER, which academy each page says is nearer, against the measured distances.

THE HONESTY RULES, kept from the pages they replace:
  - say how far it really is. Hidden Lake Ln is about five road miles from the old academy in Cross Creek Ranch and about fourteen from the old
    center of Richmond. No sentence may suggest the academy is near the middle of Richmond, or that Katy is further than it is.
  - where the other academy is nearer, say so and say which one (Cinco Ranch, Brookshire, Sealy; Jordan Ranch on the Fulshear page; Tamarron is level).
  - quote no traffic, parking, entrance or school-district fact about the new site that nobody has checked. Distances are road miles and the minutes
    are with no traffic, and the pages say so.
  - American spelling and no dashes in the prose: the site's tests look for both.

TOKENS filled when the list is installed: [[street]] 10330 Hidden Lake Ln, [[unit]] Building 1, [[zip]] 77406, [[moved]] the month and year of the move.
{address} is filled when a page is built, from ADDRESS_HTML in build_areas.py.
"""

# ---- BEGIN AREAS (copied into scripts/build_areas.py) ----
AREAS = [
    {
        "slug": "bjj-richmond",
        "place": "Richmond",
        "region": "Fort Bend County, TX",
        "title": "Brazilian Jiu-Jitsu in Richmond, TX | Labyrinth BJJ Richmond",
        "description": "Kids and adult Brazilian jiu-jitsu at [[street]], Richmond, off Fulshear-Gaston Road. How far it is from town, which classes fit, first class free.",
        "h1": "Jiu-Jitsu in Richmond",
        "eyebrow": "Our academy · Off Fulshear-Gaston Road",
        "lead": "Our address is Richmond, Texas 77406, and it sits at the western end of Richmond's postal area: off Fulshear-Gaston Road, about fourteen miles from the old town center and about eleven from Harvest Green and Aliana. Here is what that means for your drive.",
        "distance": "About 14 miles from the town center",
        "route": "FM 723, then Fulshear-Gaston Road",
        "district": "Lamar Consolidated ISD",
        "where": "Labyrinth BJJ is at {address}, a short way down Hidden Lake Ln from Fulshear-Gaston Road. We have a second academy, Labyrinth BJJ Katy, at 1806 Avenue D, but for Richmond this one is the nearer of the two by a wide margin: Katy is about eighteen miles from the old town center.",
        "body": [
            "This is the page for anyone searching for jiu-jitsu in Richmond, so it starts with the plain version. Our address is Richmond, but Richmond is a big postal area and we are at the western end of it, a short way down Hidden Lake Ln from Fulshear-Gaston Road. From the old town center it is about fourteen miles, or twenty-three minutes with no traffic.",
            "The road from Rosenberg and the old center is FM 723, which does most of the work: it carries you for nearly nine of the ten miles from Rosenberg, and then it is a turn onto Fulshear-Gaston Road and another onto Hidden Lake Ln. From Harvest Green and Aliana it is about eleven miles by the Grand Parkway and FM 1093. Those are real drives rather than hops, and we would rather you knew that before you came than found out in week three.",
            "What you get for the drive is the full timetable. Kids and adult classes, the competition team, youth wrestling and the all-ages strength and conditioning classes all run here, seven days a week, and the first class is free, so the cheapest way to find out whether the drive is worth it is to make it once.",
        ],
        "timing": "Weekday evenings work, with a margin: it is about twenty-three minutes from the old town center with no traffic, so the 5:15 PM kids classes and the 6:30 PM adult classes are the ones to plan around. For the 4:45 PM Little Grapplers class, drive it once at that hour first. Saturday and Sunday mornings take the rush out of it entirely.",
        "faqs": [
            ("Where exactly is Labyrinth BJJ in Richmond?",
             "[[street]], [[unit]], Richmond, TX [[zip]], off Fulshear-Gaston Road. That is the western end of Richmond: about fourteen miles from the old town center, about eleven from Harvest Green and Aliana and about ten from Rosenberg. Check the map before you assume it is close."),
            ("How long is the drive from the middle of Richmond?",
             "About fourteen miles and twenty-three minutes with no traffic, mostly on FM 723. From Harvest Green or Aliana it is about eleven miles and eighteen minutes, by the Grand Parkway and FM 1093. Allow more at five in the evening; we would rather you tested the drive once than trusted a number."),
            ("Did Labyrinth BJJ move?",
             "Yes. In [[moved]] the academy moved from [[old_street]], [[old_unit]], in Cross Creek Ranch, Fulshear, to [[street]], [[unit]], Richmond, TX [[zip]], about five road miles away. The phone number has not changed: (281) 393-7983."),
        ],
    },
    {
        "slug": "bjj-fulshear",
        "place": "Fulshear",
        "region": "Fort Bend County, TX",
        "title": "Brazilian Jiu-Jitsu for Fulshear, TX | Labyrinth BJJ Richmond",
        "description": "Labyrinth BJJ moved from Cross Creek Ranch to [[street]] in [[moved]]: about five miles from the old academy, off Fulshear-Gaston Road. First class free.",
        "eyebrow": "Five miles from Cross Creek Ranch",
        "lead": "We moved in [[moved]]. The academy is now on Hidden Lake Ln, off Fulshear-Gaston Road: about five miles from where it was in Cross Creek Ranch, and about six and a half from the middle of Fulshear.",
        "distance": "5 to 9 miles",
        "route": "FM 1093, then Fulshear-Gaston Road",
        "district": "Mostly Lamar Consolidated ISD",
        "where": "Labyrinth BJJ is at {address}, about five road miles from where we were in Cross Creek Ranch. We are no longer in Fulshear itself. Our other academy, Labyrinth BJJ Katy, is at 1806 Avenue D, and for most of Fulshear the academy on Hidden Lake Ln is the nearer of our two.",
        "body": [
            "If you trained with us in Cross Creek Ranch, the new academy is about five miles south-east of the old one: out of Cross Creek Ranch on FM 1093, then Canyon Fields Drive and Reese Lake Drive to Fulshear-Gaston Road, and Hidden Lake Ln from there. It is a drive now, about eleven minutes with no traffic, and we would rather say so plainly.",
            "The rest of Fulshear is further out than that, but not by much. Churchill Farms is about five and a half miles (thirteen minutes), the middle of town about six and a half (thirteen), Tamarron about seven (fourteen) and Fulshear Lakes about nine (eighteen). Those are measured road miles, and every one of them is on FM 1093 or FM 1463 for most of the way.",
            "Jordan Ranch is the exception. It is about eleven miles from Hidden Lake Ln and about eight from our Katy academy, so for Jordan Ranch the Katy academy is the nearer of the two. Go and look at both.",
        ],
        "timing": "Everything on the timetable still works from Fulshear. The 5:15 PM kids classes and the 6:30 PM adult classes are the comfortable ones from Cross Creek Ranch; for the 4:45 PM Little Grapplers class, run the drive once at pick-up time before you commit. The 6:30 AM adult classes are an early start, not a long drive.",
        "faqs": [
            ("Did Labyrinth BJJ move out of Fulshear?",
             "Yes. In [[moved]] the academy moved from [[old_street]], [[old_unit]], in Cross Creek Ranch, Fulshear, to [[street]], [[unit]], Richmond, TX [[zip]], off Fulshear-Gaston Road. The new address is about five road miles from the old one, and the phone number is the same: (281) 393-7983."),
            ("How far is the new academy from Cross Creek Ranch and the rest of Fulshear?",
             "From Cross Creek Ranch it is about five miles and eleven minutes with no traffic: FM 1093, then Canyon Fields Drive and Reese Lake Drive to Fulshear-Gaston Road, and Hidden Lake Ln from there. From the middle of Fulshear it is about six and a half miles (thirteen minutes), from Tamarron about seven (fourteen) and from Fulshear Lakes about nine (eighteen)."),
            ("Should Fulshear families train on Hidden Lake Ln or in Katy?",
             "On Hidden Lake Ln, for most of Fulshear: Cross Creek Ranch, Churchill Farms, the middle of town and Fulshear Lakes are all nearer to us than to our Katy academy. Jordan Ranch is the exception, at about eight miles from Katy against eleven from us. Ring us and describe your week; we would rather you trained consistently at the nearer one than heroically at the further one."),
        ],
    },
    {
        "slug": "bjj-tamarron",
        "place": "Tamarron",
        "region": "Fulshear / Katy, TX",
        "title": "Brazilian Jiu-Jitsu for Tamarron, TX | Labyrinth BJJ Richmond",
        "description": "Kids and adult Brazilian jiu-jitsu about seven miles from Tamarron, off FM 1463 and FM 1093. Our Katy academy is about the same distance. First class free.",
        "eyebrow": "Off FM 1463 · Close to both of our academies",
        "lead": "Tamarron is one of the few places where our two academies are almost exactly the same drive: about seven miles to Hidden Lake Ln, about six to Katy. That makes this a choice about the room rather than the road.",
        "distance": "About 7 miles",
        "route": "FM 1463 and FM 1093",
        "district": "Lamar Consolidated ISD",
        "where": "Labyrinth BJJ is at {address}, and we do not have a location in Tamarron. From Tamarron our two academies are about the same distance: about seven miles to Hidden Lake Ln and about six to Labyrinth BJJ Katy, at 1806 Avenue D.",
        "body": [
            "Tamarron sits north-west of us, and the drive is FM 1463 south to FM 1093, then east along it to Fulshear-Gaston Road and Hidden Lake Ln: about seven miles, fourteen minutes with no traffic, and no highway.",
            "It is one of the biggest communities in the area (over four thousand homes planned, still building, with Lamar CISD schools inside it) and a good number of our families come from there.",
            "What Tamarron has is a real choice, and today it is close to an even one. Katy is about six miles by FM 1463; we are about seven by FM 1463 and FM 1093. We would rather you picked on the room and the coaching than on two minutes of driving, so go and look at both.",
        ],
        "timing": "Everything works from here. At about fourteen minutes with no traffic, the 4:45 PM Little Grapplers class and the 5:15 PM kids classes are workable straight after school, and the 6:30 AM adult classes are an early start rather than a long drive.",
        "faqs": [
            ("How far is Labyrinth BJJ from Tamarron?",
             "About seven miles, or fourteen minutes with no traffic. You leave Tamarron on FM 1463, follow it south to FM 1093 and go east along it to Fulshear-Gaston Road, then Hidden Lake Ln. The address is [[street]], [[unit]]."),
            ("Should I train in Richmond or in Katy?",
             "From Tamarron it is a toss-up on distance: about seven miles to us and about six to our Katy academy, which has Coach Jared Vevera as head coach. Ring us and describe your week. We would rather you trained consistently at the nearer one than heroically at the further one for six weeks and then stopped."),
        ],
    },
    {
        "slug": "bjj-cinco-ranch",
        "place": "Cinco Ranch",
        "region": "Katy, TX",
        "title": "Brazilian Jiu-Jitsu for Cinco Ranch, TX | Labyrinth BJJ",
        "description": "Brazilian jiu-jitsu for Cinco Ranch families. Our Katy academy is the nearer of our two. Here is how to tell which one suits your week.",
        "eyebrow": "Katy · read this one first",
        "lead": "Honestly: our Katy academy is probably the one you want. It is about six miles from Cinco Ranch, and the academy on Hidden Lake Ln is about seven and a half, out the Grand Parkway and FM 1093.",
        "distance": "About 7 miles to Richmond",
        "route": "Grand Parkway and FM 1093",
        "district": "Katy ISD",
        "where": 'Labyrinth BJJ is at {address}, and we do not have a location in Cinco Ranch. Labyrinth BJJ Katy, at 1806 Avenue D, is our second academy, and the <a href="https://labyrinthbjjkaty.com">Katy academy</a> is likely the nearer of the two.',
        "body": [
            "We run two academies. This one is in Richmond, off Fulshear-Gaston Road. The other is <strong>Labyrinth BJJ Katy</strong>, at 1806 Avenue D, with Coach Jared Vevera (a black belt of fourteen years) as its head coach. From most of Cinco Ranch, Katy is the shorter drive (about six miles against about seven and a half) and the one we would point you at.",
            "The Richmond academy is still worth knowing about, because it is where the competition team trains and where the full seven-day timetable runs. Some Cinco Ranch families make the trip for a specific class (a Saturday competition session, or the all-ages strength and conditioning on a Tuesday) and train in Katy the rest of the week.",
            "If you are on the western edge of Cinco Ranch, near the Grand Parkway, the two are close enough that it comes down to which room you like. Go to both. They are free to try.",
        ],
        "timing": "If you are coming to Hidden Lake Ln from Cinco Ranch, the 6:30 AM adult classes and the whole of Saturday are the easy times: the roads are at their quietest and the drive is not the deciding factor.",
        "faqs": [
            ("Should Cinco Ranch families train in Katy or Richmond?",
             "Katy, for most of Cinco Ranch. Our Katy academy is at 1806 Avenue D with Coach Jared Vevera as head coach, and it is about six miles away against about seven and a half to Hidden Lake Ln. We would rather tell you that than have you commit to the longer drive and quietly stop in a month."),
            ("Why would I drive to Richmond at all?",
             "The Richmond academy runs the full seven-day timetable and is where the competition team trains, so some Cinco Ranch families make the trip for a specific session (the Saturday competition classes, or the all-ages strength and conditioning on Tuesday and Thursday) and train in Katy the rest of the week."),
            ("Is the first class free at both?",
             "Yes. Try either, or both. Adults can book into any class on the Richmond timetable, and kids can start on any day of the week."),
        ],
    },
    {
        "slug": "bjj-rosenberg",
        "place": "Rosenberg",
        "region": "Fort Bend County, TX",
        "title": "Brazilian Jiu-Jitsu for Rosenberg, TX | Labyrinth BJJ Richmond",
        "description": "Brazilian jiu-jitsu for Rosenberg families, ten miles up FM 723. A short, simple drive and the nearer of our two academies. First class free.",
        "eyebrow": "Up FM 723",
        "lead": "FM 723 runs from Rosenberg almost to our door: about ten miles, seventeen minutes with no traffic, and one road for nearly all of it. It is a drive, but a short and simple one.",
        "distance": "About 10 miles",
        "route": "FM 723 north",
        "district": "Lamar Consolidated ISD",
        "where": "Labyrinth BJJ is at {address}, and we do not have a location in Rosenberg. Labyrinth BJJ Katy, our second academy, is at 1806 Avenue D, about eighteen miles from Rosenberg, so the academy on Hidden Lake Ln is the nearer of our two for Rosenberg.",
        "body": [
            "Rosenberg is about ten miles from us, and most of the way is a single road. FM 723 north out of Rosenberg carries you for nearly nine miles; then it is a turn onto Fulshear-Gaston Road and another onto Hidden Lake Ln.",
            "Ten miles in seventeen minutes is a weeknight habit for a family that plans for it, and a weekend habit without any planning at all. Saturday is the easy one: kids train from 9:00 AM to noon and adults at 11:00, so a parent and a child can both train on one journey. Add Sunday's open mat at 10:30 and you have two sessions for the price of one weekend.",
            "The Katy academy is about eighteen miles from Rosenberg, so for Rosenberg this is the nearer of our two by a distance, and the one to try first.",
        ],
        "timing": "Weekday evenings are realistic: the 5:15 PM kids classes and the 6:30 PM adult classes both fit a seventeen-minute drive with room to spare. If it is going to be one trip a week, make it Saturday.",
        "faqs": [
            ("How far is Labyrinth BJJ from Rosenberg?",
             "About ten miles, or seventeen minutes with no traffic, north up FM 723. It is one road for nearly nine of the ten miles, then a turn onto Fulshear-Gaston Road and another onto Hidden Lake Ln. Our address is [[street]], [[unit]], Richmond."),
            ("What is the best way to train here if I live in Rosenberg?",
             "Build the week around Saturday. Kids from 9:00 AM to noon, adults at 11:00, so a parent and child can both train on one journey. Sunday open mat at 10:30 adds a second session without a second weekday drive. If you can add a weekday evening, the 5:15 PM and 6:30 PM classes are the ones that suit a seventeen-minute drive."),
            ("Is it worth it when there are closer options?",
             "Sometimes not, and we will say so if you ring and describe your situation. Two classes a week for two years beats four for three months, and the gym you can actually reach is the one you will still be at next spring. Come and try a free class before deciding either way."),
        ],
    },
    {
        "slug": "bjj-simonton",
        "place": "Simonton",
        "region": "Fort Bend County, TX",
        "title": "Brazilian Jiu-Jitsu for Simonton, TX | Labyrinth BJJ Richmond",
        "description": "Kids and adult Brazilian jiu-jitsu about eleven miles east of Simonton along FM 1093. Lamar CISD families welcome. First class free.",
        "eyebrow": "East along FM 1093",
        "lead": "FM 1093 runs east from Simonton and, after a few short turns at the end, takes you to our door: about eleven miles, nineteen minutes with no traffic, and most of it on one road.",
        "distance": "About 11 miles",
        "route": "FM 1093 east",
        "district": "Lamar Consolidated ISD",
        "where": "Labyrinth BJJ is at {address}, and we do not have a location in Simonton. Labyrinth BJJ Katy, our second academy, is at 1806 Avenue D, about seventeen miles from Simonton, so the academy on Hidden Lake Ln is the nearer of our two for Simonton.",
        "body": [
            "Simonton is small, and small towns tend to be badly served for children's activities. The options are either nothing or a drive into somewhere much bigger. We are the middle answer: eleven miles along one road, near enough to be a weeknight habit for a family that plans for it.",
            "Simonton is Lamar CISD, and our kids classes are timed around the Lamar CISD day. The 5:15 PM classes are the comfortable fit after pick-up; for the 4:45 PM Little Grapplers class, drive it once first and see how it feels.",
            "The drive is also simple. FM 1093 is nine of the eleven miles, so there is nothing to learn: you stay on it, and then a few short turns (Canyon Fields Drive, Reese Lake Drive, Fulshear-Gaston Road) take you to Hidden Lake Ln.",
        ],
        "timing": "Weekday evenings are straightforward. If FM 1093 is having a bad afternoon, the Saturday morning classes (MMA Conditioning at 9:00 for all ages, kids grappling at 10:00 AM and noon) are the low-stress alternative.",
        "faqs": [
            ("How far is Labyrinth BJJ from Simonton?",
             "About eleven miles, or nineteen minutes with no traffic: east along FM 1093 for most of it, then Canyon Fields Drive, Reese Lake Drive, Fulshear-Gaston Road and Hidden Lake Ln. You will find us at [[street]], [[unit]], Richmond."),
            ("Are your class times built around the Lamar CISD school day?",
             "They are. Simonton children are Lamar Consolidated students, and the kids classes are set to catch them after school rather than in the middle of it. The 5:15 PM classes are the comfortable fit from Simonton and the 4:45 PM class is worth a test drive first. Saturday morning classes exist for the weeks when the drive is not worth it twice."),
            ("There is not much for kids out here. What ages do you take?",
             "From three. Little Grapplers runs at 4:45 PM for ages 3–6, the main kids classes at 5:15 PM for 7–12 and 12–15, and youth wrestling in the evening for 7–17. Adults train from 6:30 in the morning through to the evening, seven days a week, so a Simonton family can often make one trip cover two people."),
        ],
    },
    {
        "slug": "bjj-brookshire",
        "place": "Brookshire",
        "region": "Waller County, TX",
        "title": "Brazilian Jiu-Jitsu for Brookshire, TX | Labyrinth BJJ",
        "description": "Brazilian jiu-jitsu for Brookshire families. Our Katy academy, ten miles down I-10, is the nearer of our two. Here is how to choose.",
        "eyebrow": "Down I-10 to Katy · or down FM 359",
        "lead": "Honestly: for most of Brookshire our Katy academy is the nearer one, about ten miles down I-10. The academy on Hidden Lake Ln is about fourteen, through Fulshear on FM 359 and FM 1093.",
        "distance": "About 14 miles to Richmond",
        "route": "FM 359 and FM 1093",
        "district": "Royal ISD",
        "where": 'Labyrinth BJJ is at {address}, and we do not have a location in Brookshire. Labyrinth BJJ Katy, our second academy, is at 1806 Avenue D, and the <a href="https://labyrinthbjjkaty.com">Katy academy</a> is the nearer of the two: about ten miles down I-10, against about fourteen to Hidden Lake Ln.',
        "body": [
            "From Brookshire the shorter drive goes east, to Katy: straight down I-10 is about ten miles (thirteen minutes with no traffic). To us it is about fourteen: FM 359 south for seven miles to Fulshear, then six more east along FM 1093, then Fulshear-Gaston Road to Hidden Lake Ln.",
            "That is not a reason to rule us out, only a reason to choose deliberately. The Richmond academy runs the full seven-day timetable and is where the competition team trains, so one class a week here and the rest in Katy is a sensible split.",
            "Royal ISD covers Brookshire along with Pattison and Sunnyside, and southern Waller County is growing about as fast as anywhere in Texas, which is a polite way of saying there are a lot more children there than there are things for them to do.",
        ],
        "timing": "If you do come to Hidden Lake Ln from Brookshire, build it around the quieter hours: the 6:30 AM adult classes and the weekend. On a school evening, Katy is the easier trip.",
        "faqs": [
            ("How far is Labyrinth BJJ from Brookshire?",
             "About fourteen miles to the academy on Hidden Lake Ln: FM 359 south to Fulshear, then FM 1093 east and Fulshear-Gaston Road, twenty-four minutes with no traffic. Our Katy academy is nearer, about ten miles down I-10."),
            ("Is Katy or Richmond easier from Brookshire?",
             "Katy, for most of Brookshire: it is one road, I-10, and about ten miles. We would rather tell you that than have you take the longer drive and quietly stop in a month. If you want the competition team or the Sunday open mat, the Richmond academy is where they are."),
            ("Do you take children from Royal ISD schools?",
             "Of course. Royal ISD families are a normal part of the room. The kids classes at the Richmond academy start at 4:45 PM and 5:15 PM, which is a tight run from a Brookshire school pick-up; the Saturday morning classes are the easy option, and the Katy academy's own timetable is on its website."),
        ],
    },
    {
        "slug": "bjj-sealy",
        "place": "Sealy",
        "region": "Austin County, TX",
        "title": "Brazilian Jiu-Jitsu for Sealy, TX | Labyrinth BJJ",
        "description": "Brazilian jiu-jitsu for Sealy families. Our Katy academy is the nearer of our two, about 23 miles east on I-10. A long drive, best done as one Saturday trip.",
        "eyebrow": "East on I-10 · the long one",
        "lead": "The furthest of these by a distance. Our Katy academy is about twenty-three miles east on I-10 and the academy on Hidden Lake Ln is about twenty-eight. We would not build a weeknight habit around either, and we will tell you exactly how we would do it instead.",
        "distance": "About 28 miles to Richmond",
        "route": "I-10 east, then FM 359 and FM 1093",
        "district": "Sealy ISD",
        "where": 'Labyrinth BJJ is at {address}, and we do not have a location in Sealy. Labyrinth BJJ Katy, our second academy, is at 1806 Avenue D, and the <a href="https://labyrinthbjjkaty.com">Katy academy</a> is the nearer of the two: about twenty-three miles east on I-10, against about twenty-eight to Hidden Lake Ln.',
        "body": [
            "Sealy is a proper drive and there is no version of this page that pretends otherwise. Twenty-three miles on I-10 is fine on a Saturday morning and miserable at half past four on a Tuesday, and a family that signs up planning four weeknight sessions will have stopped by October.",
            "What does work is one deliberate trip. Katy is the shorter one, straight down I-10 (twenty-seven minutes with no traffic); the Richmond academy is about twenty-eight miles and forty minutes. On Hidden Lake Ln our Saturday runs kids from 9:00 AM to noon and adults at 11:00, so a whole family can train on a single journey, and Sunday adds open mat at 10:30 and youth wrestling at 1:00 PM if you want a second.",
            "If you want something two miles from your house instead, that is a completely reasonable thing to want and we would not argue with it. But if you have looked locally and not found the room you are after, one Saturday a week with us is a real option and a lot of people make it work.",
        ],
        "timing": "Saturday, and Sunday if you want the second session. Weekday classes are technically available and honestly not advisable from Sealy unless you are already coming this way for work.",
        "faqs": [
            ("How far is Labyrinth BJJ from Sealy?",
             "Our Katy academy is about twenty-three miles, straight down I-10. The academy on Hidden Lake Ln is about twenty-eight miles and forty minutes with no traffic: east on I-10, south on FM 359 to Fulshear, then east along FM 1093. It is the longest drive of any area we serve and we would rather be straight about that than have you find out in week three."),
            ("Is it realistic to train here from Sealy?",
             "As a weekend habit, yes. As a four-evenings-a-week habit, no. Build it around Saturday (at Hidden Lake Ln, kids train from 9:00 AM to noon and adults at 11:00, so nobody makes the drive alone) and add Sunday if you want more."),
            ("Do you have anything closer to Sealy?",
             "Yes: the Katy academy, at 1806 Avenue D, is the nearer of our two, about twenty-three miles. Beyond that, no. If distance rules us both out, look locally first. We would rather you trained somewhere than admired us from twenty-three miles away."),
        ],
    },
]
# ---- END AREAS ----


# Which of the two academies each page says is nearer. Checked against the measured distances (routes.json and routes_both.json).
# "richmond" = the academy on Hidden Lake Ln, "katy" = 1806 Avenue D, "level" = within a mile of each other.
NEARER = {
    "bjj-richmond": "richmond",
    "bjj-fulshear": "richmond",
    "bjj-tamarron": "level",
    "bjj-cinco-ranch": "katy",
    "bjj-rosenberg": "richmond",
    "bjj-simonton": "richmond",
    "bjj-brookshire": "katy",
    "bjj-sealy": "katy",
}
# The place in routes_both.json each page's figures come from.
MEASURED_AS = {
    "bjj-richmond": "Richmond (centre)",
    "bjj-fulshear": "Fulshear (town centre)",
    "bjj-tamarron": "Tamarron",
    "bjj-cinco-ranch": "Cinco Ranch",
    "bjj-rosenberg": "Rosenberg",
    "bjj-simonton": "Simonton",
    "bjj-brookshire": "Brookshire",
    "bjj-sealy": "Sealy",
}

# Every class time the pages above quote, as (days, time, class name, ages, audience); None means "any". Each must be on the timetable
# (scripts/schedule_data.py) on the day. A class for "all" ages or levels counts for every audience.
CLAIMS = [
    (("Monday", "Wednesday", "Friday"), "4:45 PM", "Kids BJJ", "3–6", None),                 # Little Grapplers
    (("Monday", "Wednesday"), "5:15 PM", "Kids BJJ", "7–12", None),
    (("Monday", "Wednesday"), "5:15 PM", "Teens BJJ", "12–15", None),
    (("Monday", "Tuesday", "Wednesday", "Thursday", "Friday"), "5:15 PM", None, None, "kids"),    # a kids class every weekday at 5:15
    (("Monday", "Tuesday", "Wednesday", "Thursday"), "6:30 AM", "Adult BJJ", "", None),
    (("Monday", "Tuesday", "Wednesday", "Thursday", "Friday"), "6:30 PM", None, None, "adult"),   # an adult class every weekday at 6:30 PM
    (("Tuesday", "Thursday"), "4:15 PM", "Strength & Conditioning", "all ages", None),
    (("Wednesday", "Thursday"), "7:30 PM", "Youth Wrestling", "7–17", None),
    (("Saturday",), "9:00 AM", "MMA Conditioning", "all ages", None),
    (("Saturday",), "10:00 AM", "Kids Grappling", "7–12", None),
    (("Saturday",), "11:00 AM", "Adult & Teens", "", None),
    (("Saturday",), "12:00 PM", "Kids Grappling", "7–12", None),
    (("Sunday",), "10:30 AM", "Open Mat", "all levels", None),
    (("Sunday",), "1:00 PM", "Youth Wrestling", "7–17", None),
]
