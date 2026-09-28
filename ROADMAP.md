# Roadmap

Where Neon Rush stands and what to do next, in priority order. The original brief is [SPEC.md](SPEC.md); the post-launch money plan is [MONETIZATION.md](MONETIZATION.md).

## Where things stand (2026-09-27, evening)

All four build milestones from the brief are in place, plus a level campaign:

| Area                                                                                                                  | Status                  |
| --------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| Core run: 3 lanes, swipes, jump/slide/fast-fall, collisions, restart                                                  | Done                    |
| Obstacles: barrier, laser gate, mag-tram, oncoming tram, gap                                                          | Done                    |
| Coins, 5 power-ups (magnet, shield, jetpack, 2×, boost/Starting Boost)                                                | Done                    |
| Difficulty curve and fair row generator (bot-verified)                                                                | Done                    |
| Modes: endless and a 20-level campaign with stars                                                                     | Done                    |
| Progression: coins, XP levels, upgrades ×5, missions, daily + streak, 13 achievements, continue-for-coins             | Done                    |
| Cosmetics: 4 runners, outfits, head gear, trails, hoverboards                                                         | Done                    |
| Screens: menu, HUD, pause, continue, game over, level complete, levels, runners, upgrades, missions, awards, settings | Done                    |
| Worlds: Neon City (running), Sunset Beach (surfing), Snowy Mountain (snowboarding)                                    | Done                    |
| Audio: generated SFX and music; haptics                                                                               | Done                    |
| Save: versioned, validated, local only                                                                                | Done                    |
| First-run tutorial (swipe lessons, replayable from Settings)                                                          | Done                    |
| Menus laid out for iPhone SE through Pro Max                                                                          | Done                    |
| Accessibility: reduce motion, screen-reader labels, text scaling, 44 pt targets, colour-blind-safe lasers             | Done                    |
| Tested on a real phone                                                                                                | iPhone 16 Pro Max, once |
| Tested on Android                                                                                                     | Emulator, briefly       |
| App icon, splash, store assets                                                                                        | **Still Expo defaults** |

Measured on the iOS simulator: about 0.06 ms of simulation, 2.4 ms to record a frame and ~2 ms of Skia raster (the budget is 16.7 ms at 60 Hz, 8.3 ms at 120 Hz), and no dropped frames over a 40-second run with sound on.

---

## P0: before anyone else plays it

These block a TestFlight or internal-testing build.

1. **Play it on real phones.** First iPhone session (16 Pro Max) found two bugs, both fixed:
   - _Frame hitches on every jump, coin and power-up._ Mostly the sound effects: expo-audio's AVPlayer status observer blocks the main thread (where the game loop runs) on every play. Sound now goes through Web Audio in a hidden WebView, and the simulator went from 3-17 dropped frames per 2 s to none. Haptics also stall the main thread, so they only fire on hits, throttled. **Re-test on the phone:** runs should hold 60/120 FPS with sound on, and sounds should play with the ring switch on silent (the WebView path is new; if it's silent, that's the first thing to check).
   - _No sound._ The audio session respected the silent switch (the simulator has none). It now plays through it and mixes with other audio.
     Still to check on a phone: swipe feel (threshold is 4.5% of screen width, `input/useSwipeGesture.ts`), lane change speed, jump height and slide length (`game/config.ts`), whether the first 30 seconds are fun, and the tutorial with a real first-time player.
2. **Android pass.** The game runs in Expo Go on the Android emulator (API 36): fonts, Skia canvas and HUD render correctly, and back pauses a run. Fixed: translucent buttons showed a dark box (elevation shadow). The emulator was too starved to judge frame rate or audio, so this still needs a real Android phone: audio mode, haptics strength, the status and navigation bars.
3. ~~**Handle the Android back button.**~~ Done: back pauses a run, resumes from pause, declines a continue, and leaves result panels for the menu (`screens/GameScreen.tsx`).
4. **Measure performance on a mid-range Android phone** with `EXPO_PUBLIC_PERF=1`, watching `slow frames` more than the averages. Expo Go runs a development bundle, so also try `npx expo start --no-dev --minify` for release-like numbers. If recording is over ~6 ms a frame, the next wins are: fewer window rectangles on buildings, simpler runner geometry at a distance, and dropping scenery detail beyond ~80 m. Don't batch quads into one many-contour path; Skia fills those on the CPU.
5. **App identity.** Replace the Expo template icon, adaptive icon, splash and favicon in `assets/`. Set the real `ios.bundleIdentifier` and `android.package` in `app.json` (currently placeholders `com.cmsoto.neonrush`).
6. ~~**First-run tutorial.**~~ Done: the first endless run uses three scripted rows (barrier, laser gate, two trams) and freezes before each with a swipe hint until the player makes the move (`systems/tutorialSystem.ts`). `tutorialDone` is saved; Settings can replay it. Levels don't run it, so a player who opens Levels first skips the lessons until their first endless run.
7. **Economy check.** Play 10–15 runs and note coins per run. Upgrade costs (300 → 9,500), cosmetic prices (600–2,500) and the continue cost (150, then 300) should feel reachable. Early levels should unlock something every few runs.

## P1: soon after first testers

8. ~~**In-run feedback for missions.**~~ Done: the engine gets the active missions' goals at the start of each run (`inRunGoal` in `progression/missions.ts`), checks them every frame (`systems/missionSystem.ts`), and shows a "MISSION COMPLETE" pill under the score with a bell chime. Several at once queue up. Rewards still pay out at the end of the run. "Play N runs" missions can't finish mid-run, so they get no toast. Measured on the simulator: no slow frames while a toast is up.
9. ~~**Chaser mechanic.**~~ Done: a side hit calls in a security drone (`systems/chaserSystem.ts`, drawn in `rendering/drawChaser.ts`) that hovers over the runner's shoulder for 5 seconds with a siren, a red/blue light and a searchlight on the runner. A second side hit while it's there ends the run with the drone swooping in. A shield takes that hit instead and sends the drone away, a boost or jetpack shakes it off, a revive clears it, and the tutorial never calls it. Tunables are `CHASER` in `game/config.ts`; `EXPO_PUBLIC_CHASER=1` keeps it on screen for inspection. It adds ~0.1 ms of drawing per frame. Still to judge on a phone: whether 5 seconds is the right length.
10. **More music.** One 17-second loop gets repetitive. Add a second, calmer menu track and a longer run track with variations (`scripts/generate-music.mjs`), or commission original music.
11. **Tune the campaign.** All 20 levels are finishable by the bot, but later levels reach top speed quickly and then flatten out. Consider hand-picked rows at the start of each level, per-level obstacle themes (a "gates" level, a "gaps" level), and a boss-style final level per world.
12. ~~**Accessibility pass.**~~ Done:
    - **Text size:** every text element has a Dynamic Type cap (1.2-1.3x on fixed layouts like the menu, panels and pills; 1.4-1.5x on scrolling screens). Checked at Accessibility XXXL on an iPhone SE.
    - **Controls:** all have a role and label and are at least 44 pt (the Runners tabs and world arrows were smaller). Mission and award cards read as one item each. Result panels are modal for VoiceOver, with a header title. The game area has a label and a swipe hint.
    - **Reduce motion:** the in-app setting now also stops the PLAY pulse and turns panel and badge zooms into fades.
    - **Colour blindness:** gameplay was simulated for protan, deutan and tritan vision. Obstacles stay distinct by shape and brightness. The laser beam dropped to 2.4:1 against the city sky for protans, and to 1.4:1 on the beach road for everyone. Each world now has its own laser colour (brighter pink in the city, ice cyan on the beach) with at least 3:1 contrast for all four vision types. The beach gets a dark slide arrow.
    - **Still open:** the Skia HUD (score, coins, power-up timers) isn't readable by screen readers, and the swipe game itself isn't playable with VoiceOver on. That's normal for action games, but worth an announcement on game over.
13. **Local anonymous metrics** (MONETIZATION.md phase 0): runs per day, session length, revives used, where runs end. Keep them on the device and show them in a hidden dev screen. They're needed before any monetization decision.

## P2: content and polish

14. **More worlds, each with its own way to travel.** Neon City stays exactly as it is: running down a road. Every other world swaps the road for something that fits the place, while keeping the three lanes, the swipes and the "one safe lane" generator underneath, so the fairness bot, missions and power-ups keep working:
    - ~~**Sunset Beach → surfing.**~~ Done (`rendering/worlds/beach.ts`): neon surf at dusk on a glowing current between magenta float ropes, sand, palms and huts on the left, rocks, sailboats and a lighthouse on the right. Buoy boom (jump), low pier with a warning board (duck), moored and oncoming boats (dodge), whirlpools (jump). The runner rides a surfboard with a surf stance, a crouch for slides and spray off the tail. Draws in ~2.2-2.7 ms a frame on the simulator (the old beach road was ~3.3 ms) with no extra slow frames. Still possible: a splash sound for landings, a jet ski in place of the drone.
    - **Jungle → jumping.** A path that is mostly gaps: logs, stepping stones and swinging vines, so jumps and gaps become the main move and there's less lane dodging. Watch the fairness rules, since a jump-heavy generator needs its own reach checks.
    - ~~**Snowy Mountain → snowboarding.**~~ Done (`rendering/worlds/mountain.ts`, unlocks at level 10, campaign levels 21-30): a night piste with glowing cyan edges and marker poles under a synth moon and an aurora; pines with neon string lights (recorded once as a picture and replayed, so they cost no path building), lit cabins, a ski lift, falling snow (off with reduce motion). Ice walls (jump), slalom banners (duck), snowcats (dodge), crevasses (jump). Draws in ~2.8 ms a frame on the simulator with no slow frames after the run starts. Still possible: ramps that give a trick jump, a carving animation.
    - Still possible later: Amusement Park (coaster track), Space Station (low-gravity jumps).

    How it's built: each palette has a `ride` (`run`, `surf`...) and a `scenery`; each non-city world has a module in `rendering/worlds/` that re-skins the four obstacle kinds with the same hitboxes and cues. Every world keeps the Neon Rush look: dark ground, glowing edges, emissive trims. Each world also gets ten campaign levels (`progression/campaign.ts`) and its own music track (see item 10).
    Keep new worlds within the frame budget: Sunset Beach already records at ~3.3 ms a frame against ~2.3 ms for the city (the palms are the cost). Animated water or falling snow must stay cheap, so measure with `EXPO_PUBLIC_PERF=1` and watch `slow frames`.

15. **More runners and cosmetics:** two per new world, plus seasonal items. Everything is data in `progression/cosmetics.ts` and `game/characters/characters.ts`.
16. **New power-up ideas:** super sneakers (higher jumps), a coin rush (all obstacles become coins for a few seconds), and a score-bank (keep 50% on crash). Each is an entry in `powerups/powerups.ts` plus an effect.
17. **Moving obstacles that shift lanes,** introduced late in the difficulty curve, with the same "one safe lane" rule.
18. **Visual polish:** (started: the runner now crossfades between run, jump, slide, landing, board, jetpack and crash poses in 60-120 ms with an ease-out, and the lane-change lean eases in and out; hitboxes still switch instantly, so controls feel no slower.) Still to do: a glow shader (SkSL) on neon edges instead of stacked translucent strips; a real sun bloom; screen-space rain or confetti moments; a character hit reaction at the moment of impact.
19. **Localization.** The UI strings are all in components; move them into a strings table before adding languages.

## P3: release and after

20. **Release setup.** Add `eas.json` with development, preview and production profiles; a development build (needed later for ads and purchases); TestFlight and a Play internal testing track.
21. **Store listing:** screenshots, a trailer (the `remotion-motion-graphics` skill can help), age rating questionnaire, privacy label ("data not collected" while it stays offline), and a privacy policy page.
22. **Crash reporting** that suits a young audience: collect no identifiers and no personal data, or skip it until the audience decision in MONETIZATION.md is made.
23. **Monetization,** following MONETIZATION.md phases 1–3, only after retention numbers justify it.
24. **Online features,** only if wanted: leaderboards and cloud save need accounts and a backend, which changes the privacy position for a kids' audience. Decide deliberately.

---

## Known limitations to keep in mind

- Web is a testing target only (phone-shaped frame, keyboard controls). Chrome pauses animation in background tabs.
- Portrait only. Upside-down portrait is enabled for iOS builds; Expo Go ignores it.
- The continue offer is paid from banked coins, not the coins of the current run.
- The revive countdown runs on a JS timer and keeps counting if the app is backgrounded during it.
- Level mode reuses the endless generator with a per-level seed and difficulty offset. It has no hand-designed rows yet.
