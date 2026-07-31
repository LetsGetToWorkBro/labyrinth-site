# Labyrinth Round Timer — Apple TV

A branded round timer for the mats. One screen, no settings page: round length,
warning and rest sit on the right rail and change with a left/right press on the
remote. Pause and restart-round live along the bottom, exactly like the timer
we've been using — just in the gym's own colours.

<p align="center">
  <em>Ink, gold, the roundel turning behind the clock. Same palette as
  labyrinth.vision.</em>
</p>

## What's here

```
tvos/
├── LabyrinthTimer/            the Xcode project — this is the app
│   ├── LabyrinthTimer.xcodeproj
│   └── LabyrinthTimer/
│       ├── LabyrinthTimerApp.swift   entry point, keeps the TV awake
│       ├── TimerScreen.swift         the one screen, and the remote handling
│       ├── RoundTimer.swift          rounds, warning, rest — the state machine
│       ├── Cues.swift                horns and beeps, synthesised at launch
│       ├── Backdrop.swift            the room behind the clock
│       ├── Components.swift          badge, rail cards, transport, wall clock
│       ├── Theme.swift               the palette, lifted from the website
│       └── Assets.xcassets           app icon, top shelf art, brand marks
├── preview/                   a browser mirror of the same screen
└── tools/                     scripts that build the art from the brand marks
```

## Running it on the Apple TV

1. Open `tvos/LabyrinthTimer/LabyrinthTimer.xcodeproj` in Xcode (16 or newer).
2. Select the **LabyrinthTimer** target → **Signing & Capabilities**, tick
   *Automatically manage signing* and pick the Labyrinth team. The bundle ID is
   `vision.labyrinth.roundtimer` — change it if that identifier is already taken
   on the account.
3. Pair the Apple TV: **Xcode → Window → Devices and Simulators**, then on the TV
   **Settings → Remotes and Devices → Remote App and Devices**. Both machines
   need to be on the same network.
4. Pick the Apple TV as the run destination and hit ▶.

To leave it installed for good, archive it (**Product → Archive**) and push a
build to TestFlight — an internal tester build stays on the TV for 90 days and
renews on the next upload. A plain development install expires when the
provisioning profile does.

Deployment target is tvOS 17. It runs on Apple TV HD and every Apple TV 4K.

## Using it

| Remote | What it does |
| --- | --- |
| ▲ ▼ | Move between the rail cards and the transport row |
| ◀ ▶ | Change the focused card's value |
| Click | Fires the focused transport button |
| Play/Pause | Starts and pauses from anywhere on the screen |

- **Round** — 0:30 to 30:00. Fifteen-second steps up to five minutes, then
  minute steps, so a long round doesn't cost forty presses.
- **Warning** — how much time is left in the round when the clock turns gold and
  the double beep fires. Wind it down to `OFF` to skip it.
- **Rest** — 0 to 10:00. At `OFF` the rounds run back to back.
- **Rounds** — `∞`, or a fixed session of up to 30. A fixed session ends on a
  flourish instead of rolling into another round.

Every setting is remembered between launches. Changing the round length while
the clock is running takes effect on the next round; when it's parked at the
top, it updates the face straight away.

The screen never sleeps while the app is open, and the cues mix with whatever
music is already playing on the TV rather than cutting it off.

### The sounds

Nothing is shipped as an audio file — every cue is a stack of sine partials
rendered at launch in `Cues.swift`, so they can be retuned in code:

| Cue | When |
| --- | --- |
| Long horn | A round starts |
| Three short blasts | A round ends |
| Double beep | The warning window opens |
| Blip | Each of the last three seconds |
| Rising flourish | A fixed-length session finishes |

## The browser preview

`tvos/preview/index.html` is a self-contained mirror of the same screen — same
1920×1080 canvas, same palette, same logic — so the timer can be checked, shown
around or thrown on a laptop without a Mac in the room. Open the file; arrow
keys move and adjust, space starts and pauses.

## Regenerating the artwork

The app icon, top shelf art and in-app marks are all built from the gym's
existing brand files in `/assets`. Nothing is hand-drawn, so re-running the
scripts after a brand tweak keeps everything in step:

```bash
pip install pillow
python3 tvos/tools/make_assets.py     # → Assets.xcassets
python3 tvos/tools/build_preview.py   # → preview/index.html
```

`make_assets.py` keys the black-on-white artwork to alpha, punches the wordmark
out of the middle of the roundel so it doesn't fight the type, and lays out the
three parallax layers Apple TV needs for its icon.
