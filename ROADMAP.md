# Roadmap

Where Neon Rush stands and what to do next, in priority order. The original brief is [SPEC.md](SPEC.md); the post-launch money plan is [MONETIZATION.md](MONETIZATION.md).

## Where things stand (2026-09-27)

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
| Worlds: Neon City, Sunset Beach                                                                                       | Done                    |
| Audio: generated SFX and music; haptics                                                                               | Done                    |
| Save: versioned, validated, local only                                                                                | Done                    |
| Accessibility: reduce motion, screen-reader labels on menus                                                           | Partly                  |
| Tested on a real phone                                                                                                | **Not yet**             |
| Tested on Android                                                                                                     | **Not yet**             |
| App icon, splash, store assets                                                                                        | **Still Expo defaults** |

Measured on the iOS simulator: about 0.05 ms of simulation and 1.8 ms of drawing per frame (the 60 FPS budget is 16.7 ms).

---

## P0: before anyone else plays it

These block a TestFlight or internal-testing build.

1. **Play it on real phones.** Open it in Expo Go on an iPhone and an Android phone. Check:
   - Swipe feel: the threshold is 4.5% of screen width (`input/useSwipeGesture.ts`). Too twitchy or too sluggish?
   - Lane change speed, jump height and airtime, slide length (`game/config.ts`).
   - That the first 30 seconds are fun: first obstacle at 55 m, trams from 60 m, gates from 180 m (`levels/difficulty.ts`).
2. **Android pass.** Nothing Android-specific has run yet. Watch for font loading, audio mode, haptics strength, the Skia canvas at high DPI, and the status and navigation bars.
3. **Handle the Android back button.** Nothing handles `BackHandler` yet. During a run, back should pause; on pause, it should resume or go to the menu; on menu screens it should go back. It must never exit the app mid-run.
4. **Measure performance on a mid-range Android phone** with `EXPO_PUBLIC_PERF=1`. If drawing is over ~8 ms a frame, the cheapest wins are: fewer window rectangles on buildings, batching same-coloured quads into one path (as the lane dashes already are), and dropping scenery detail beyond ~80 m.
5. **App identity.** Replace the Expo template icon, adaptive icon, splash and favicon in `assets/`. Set the real `ios.bundleIdentifier` and `android.package` in `app.json` (currently placeholders `com.cmsoto.neonrush`).
6. **First-run tutorial.** Young players need to be shown the swipes. On the very first run: pause at the first barrier with a "swipe up" hint, then "swipe down" at the first gate, "swipe sideways" at the first tram. Store `tutorialDone` in the profile.
7. **Economy check.** Play 10–15 runs and note coins per run. Upgrade costs (300 → 9,500), cosmetic prices (600–2,500) and the continue cost (150, then 300) should feel reachable. Early levels should unlock something every few runs.

## P1: soon after first testers

8. **In-run feedback for missions.** Missions only resolve at the end of a run. A small "Mission complete!" toast the moment one finishes would feel much better. The engine would need the active mission targets passed in, and to raise an event.
9. **Chaser mechanic.** After a side hit, a security drone appears behind the runner, and a second hit within a few seconds ends the run. That adds tension and makes stumbles matter (Subway Surfers does the equivalent with its guard).
10. **More music.** One 17-second loop gets repetitive. Add a second, calmer menu track and a longer run track with variations (`scripts/generate-music.mjs`), or commission original music.
11. **Tune the campaign.** All 20 levels are finishable by the bot, but later levels reach top speed quickly and then flatten out. Consider hand-picked rows at the start of each level, per-level obstacle themes (a "gates" level, a "gaps" level), and a boss-style final level per world.
12. **Accessibility pass.** Cap font scaling on dense UI (`maxFontSizeMultiplier`), check obstacle colours for colour-blind players (each already has a distinct shape cue), and make sure every control has a label and a large enough hit area.
13. **Local anonymous metrics** (MONETIZATION.md phase 0): runs per day, session length, revives used, where runs end. Keep them on the device and show them in a hidden dev screen. They're needed before any monetization decision.

## P2: content and polish

14. **More worlds.** Each needs an entry in `constants/palette.ts` and a scenery drawer in `rendering/drawEnvironment.ts`:
    - Amusement Park: ferris wheels, coaster tracks, balloon stalls.
    - Snowy Mountain: pines, cabins, falling snow particles.
    - Space Station: modules, windows onto stars, low-gravity jumps.
      Add ten campaign levels per world (`progression/campaign.ts`).
15. **More runners and cosmetics:** two per new world, plus seasonal items. Everything is data in `progression/cosmetics.ts` and `game/characters/characters.ts`.
16. **New power-up ideas:** super sneakers (higher jumps), a coin rush (all obstacles become coins for a few seconds), and a score-bank (keep 50% on crash). Each is an entry in `powerups/powerups.ts` plus an effect.
17. **Moving obstacles that shift lanes,** introduced late in the difficulty curve, with the same "one safe lane" rule.
18. **Visual polish:** a glow shader (SkSL) on neon edges instead of stacked translucent strips; a real sun bloom; screen-space rain or confetti moments; a character hit reaction at the moment of impact.
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
