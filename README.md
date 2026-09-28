# Neon Rush

A 2.5D endless runner for iOS and Android, built with Expo (SDK 57), React Native Skia, Reanimated and Gesture Handler. The original brief is in [SPEC.md](SPEC.md), what's next is in [ROADMAP.md](ROADMAP.md), and the post-launch money plan is in [MONETIZATION.md](MONETIZATION.md).

## Run it

```bash
npm install
npx expo start
```

Scan the QR code with **Expo Go** on your phone (same Wi-Fi). Every native module the game uses ships with Expo Go, so no custom build is needed yet.

- **iOS simulator:** `npx expo start --ios`
- **Browser (testing only):** `npx expo start --web`. The app renders in a phone-shaped frame. Arrow keys, WASD or Space control the runner. Add `?timescale=0.25` to the URL to slow the game down.

Controls on a phone: swipe left or right to change lanes, up to jump, down to slide. Swiping down in the air slams you to the ground and slides. Tap or swipe on the title screen to start. The first endless run teaches the swipes with a short tutorial.

## Checks

```bash
npm test            # engine tests (bun), including the fairness bot
npm run typecheck
npx expo lint
npm run format      # prettier
```

## What's in the game

- **Two modes.** _Endless_: run as far as you can while the speed and density ramp up. _Levels_: a campaign of ten levels per world, in unlock order, with fixed layouts, a finish arch, and up to 3 stars per level (finish, collect 60% of the coins, no hits or continues).
- **Obstacles.** Barriers (jump), laser gates (slide), mag-trams (change lanes), oncoming trams, and gaps in the road (jump). Hitting the side of something during a lane change bounces you back rather than ending the run, but it calls in a security drone that hovers behind you for 5 seconds with a siren and searchlight. A second side hit while it's there gets you caught, unless a shield takes the hit. A boost or jetpack shakes it off.
- **Power-ups.** Coin Magnet, Shield, Jetpack (fly over everything along a trail of sky coins), 2× Score, and Speed Boost (smash through obstacles on a hoverboard). Each is upgradeable five times; the boost upgrade doubles as a Starting Boost.
- **Progression.** Coins, XP and player levels, three escalating missions at a time (a toast and chime the moment one is done; rewards pay out at the end of the run), a daily challenge with streaks, 13 achievements, and the option to continue after a crash for coins. Everything saves locally.
- **Cosmetics** (no gameplay effect): 4 runners, alternate outfits, head gear, trails, and hoverboards, unlocked with coins, levels or achievements.
- **Worlds.** Each world has its own way to travel, all in the same neon look: dark ground, glowing edges, lit trims. _Neon City_: running down a synthwave road. _Sunset Beach_ (unlocks at level 3): surfing a glowing current at dusk between magenta float ropes, past a sandy shore with palms and huts on one side and rocks, sailboats and a lighthouse on the other. Its obstacles re-skin the same four kinds with the same hitboxes and cues: a buoy boom to jump, a low pier with a warning board to duck under, boats to dodge, and whirlpools to jump. _Neon Jungle_ (level 6), built for jumping: an ancient stone causeway through a bioluminescent jungle, with giant trees, glowing mushrooms, ruins and fireflies. Its obstacle mix favours jumps (mossy logs, and breaks in the path over a glowing river, sometimes the full width), with low stone archways to duck under, fallen giant trunks and oncoming explorer cart trains to dodge. _Snowy Mountain_ (level 10): snowboarding a night piste with glowing cyan edges under a synth moon and an aurora, past pines strung with lights, lit cabins and a ski lift, with snow falling: ice walls to jump, slalom banners to duck under, snowcats to dodge, crevasses to jump. Ten campaign levels per world.
- **Audio.** Original synthesized sound effects and a synthwave loop (`npm run sfx`, `npm run music` regenerate them), played through Web Audio in a hidden WebView on iOS and Android, plus haptics.
- **Tutorial.** The first endless run freezes before a barrier, a laser gate and two trams with a swipe hint, and waits for the move. It can be replayed from Settings.
- **Settings.** Music, sound effects, vibration, reduce motion (defaults to the system setting), replay tutorial, and reset progress.
- **Accessibility.** Text scales with Dynamic Type, capped so dense screens still fit. Controls are labelled and at least 44 pt. Reduce motion removes shake, speed lines, the PLAY pulse and zooms. Each world's slide cue keeps 3:1 contrast for common colour-blindness types: the city laser (`gateBeam` in `constants/palette.ts`), the beach's yellow warning board, the jungle's jade archway and the mountain's pale slalom banner, each with a dark arrow (`sign`/`banner` in each world's `theme`). Check any new world's cues the same way.

No ads, no purchases, fully offline. See [MONETIZATION.md](MONETIZATION.md) for the post-launch plan.

## Dev switches

Dev builds only. Set them when starting Metro, e.g. `EXPO_PUBLIC_AUTOSTART=1 npx expo start --ios`, or on web as URL parameters (`?power=2&timescale=0.25`):

| Variable                     | Effect                                                          |
| ---------------------------- | --------------------------------------------------------------- |
| `EXPO_PUBLIC_AUTOSTART=1`    | Start an endless run on launch                                  |
| `EXPO_PUBLIC_LEVEL=n`        | Start campaign level _n_ on launch                              |
| `EXPO_PUBLIC_DEV_POWER=0..4` | Begin runs with a power-up (magnet, shield, jetpack, 2×, boost) |
| `EXPO_PUBLIC_INVINCIBLE=1`   | Obstacles can't end the run                                     |
| `EXPO_PUBLIC_WORLD=beach`    | Show a world regardless of unlocks                              |
| `EXPO_PUBLIC_TIMESCALE=0.25` | Slow motion                                                     |
| `EXPO_PUBLIC_PERF=1`         | Log frame timings every 2 s, including frames that missed 60 Hz |
| `EXPO_PUBLIC_TUTORIAL=1`     | Play the first-run tutorial on every endless run                |
| `EXPO_PUBLIC_CHASER=1`       | Keep the chaser drone called in, to inspect how it looks        |
| `EXPO_PUBLIC_AUTOPLAY=1`     | The fairness bot plays the run: jumps, slides, dodges, no input |

Screens can be opened directly in Expo Go with deep links, e.g. `xcrun simctl openurl booted exp://127.0.0.1:8081/--/shop`.

## Architecture

```
src/
  app/                 Expo Router routes: game (index), levels, shop, characters,
                       missions, achievements, settings
  screens/             One component per route
  components/          Menu, overlays (pause, continue, game over, level complete),
                       runner preview, world picker, buttons, ui/ primitives
  store/               gameStore (phase, current level, results) and profileStore
                       (the persisted save)
  progression/         Pure rules: economy, XP, missions, daily, achievements,
                       cosmetics, campaign, save format (profile.ts), applyRun
  audio/               Sound effects, music, and the Web Audio host (audioHost.tsx)
  constants/           Environments and palettes, fonts, dev switches
  game/
    config.ts          Tunables: lanes, jump, slide, obstacles, coins, power-ups
    types.ts           GameState, obstacles, coins, pickups, particles, events
    engine/            State creation/reset, frame step, controls, RNG
    systems/           Player, spawner, collisions, coins, power-ups, particles,
                       tutorial, missions (in-run completion toasts), chaser drone
    levels/            Difficulty curve, row generator and coin patterns (fairness rules)
    powerups/          Power-up registry
    rendering/         Camera, city scenery and obstacles, collectibles, runner,
                       chaser drone, HUD; worlds/ holds each other world's look
    input/             Swipe gesture and web keyboard
    characters/        Character looks and outfits
    useGameLoop.ts     Wires engine, input, rendering, audio and progression together
```

**The whole game loop runs on the UI thread.** Engine files start with a `'worklet';` directive. A Reanimated frame callback steps the simulation, records the frame into a Skia picture, and hands it to a `<Canvas>`. Swipes are recognised in Gesture Handler worklets and go straight into the engine, so input never waits on the JS thread. React only hears about phase changes (start, game over, level complete) through `scheduleOnRN`, so it re-renders a few times per run, not every frame. The loop stops while paused or while another screen covers the game.

**Nothing else may block the main thread.** The frame callback, gestures and Skia's raster all run on the iOS main thread, so any native module that does work or waits there shows up as a dropped frame. Two did:

- _expo-audio._ Every play or rewind fires an AVPlayer status observer on the main thread, and that observer waits on AVPlayer's internal lock while CoreMedia processes the seek. Each coin, jump or power-up sound stalled a frame for 30-80 ms, clustering into 3-17 dropped frames per 2 seconds during coin streaks. In Expo Go it was worse still, because `require()`d assets are HTTP URLs on the dev server, so AVPlayer streamed every sound and each rewind was a network request. On iOS and Android all sound now plays through Web Audio in a hidden WebView (`audio/audioHost.tsx`): clips are decoded once, and playing is one short message per frame, handled in WebKit's own process. A silent looping `<audio>` element keeps Web Audio playing with the ring switch on. The web build still uses expo-audio.
- _expo-haptics_ builds a feedback generator on the main thread for each call, so haptics only fire on hits (throttled), never on routine events like landing.

To find this kind of stall, averages are useless (they stayed at ~2.5 ms). Use the `slow frames` count from `EXPO_PUBLIC_PERF=1`, then `sample <pid> 10 1 -mayDie` on the simulator's Expo Go process. Unlike Time Profiler, it records threads that are blocked, not just running.

**The main menu is laid out around the runner** (`components/menuLayout.ts`): the scene is raised just enough for the runner's feet to clear the bottom buttons, and the title, world picker and cards fill the space above its head. The same numbers go to the renderer, so the layout holds from an iPhone SE to a Pro Max.

**Rendering is procedural 2.5D.** A pinhole camera sits behind the runner, sized from the viewport so the framing adapts to any screen. Obstacles and scenery are shaded boxes and paths, and the runner is drawn from joint positions, so there are no image assets to load. Pose changes (run, jump, slide, landing and so on) crossfade from the last drawn pose over 60-120 ms (`blendPose` in `rendering/drawRunner.ts`); only the drawing blends, never the hitbox. Paints, the path builder and rects are reused every frame; obstacles, coins, pickups and particles come from fixed pools. Detached paths and old frame pictures are `dispose()`d straight away rather than left for Hermes' GC, since each one reports native memory pressure. Keep paths to one convex shape per draw: Skia can't fill an anti-aliased many-contour path on the GPU and rasterizes it on the CPU (batching the road seams and lane dashes cost ~1 ms a frame that way). Measured on the iOS simulator with `EXPO_PUBLIC_PERF=1`: about 0.06 ms of simulation, 2.4 ms to record a frame, and ~2 ms of Skia raster, with no dropped frames over a 40-second run.

**Adding content.** A power-up is an entry in `game/powerups/powerups.ts` plus its effect in `systems/powerUpSystem.ts`. A world is a palette in `constants/palette.ts` (colours, a `scenery`, a `ride`, an obstacle `mix` from `OBSTACLE_MIX` in `game/levels/difficulty.ts`, plus `theme` colours for its own drawers) and an entry in `ENVIRONMENTS`; unless it reuses the city look, it also gets a module in `rendering/worlds/` (ground, lane, scenery, the four obstacle kinds re-skinned, and its gaps), a `SCENERY` code in `rendering/resources.ts`, and a branch in `renderFrame.ts`. Keep it neon: a dark ground, glowing edges and emissive trims. The runner's stance and board come from the `ride` (`drawRunner.ts`). A cosmetic is an entry in `progression/cosmetics.ts` (characters also go in `game/characters/characters.ts`). Missions and achievements are data in `progression/`; a new mission kind also needs a `MissionStat` mapping in `inRunGoal` (`progression/missions.ts`) if it can finish mid-run.

**The save** is versioned (`SAVE_VERSION` in `progression/profile.ts`). On load, every field is validated and repaired, so missing or out-of-range data falls back to defaults instead of crashing, and an unreadable save is copied aside rather than overwritten silently.

**Tests.** The engine and progression rules are plain TypeScript, so `bun test` runs them headlessly, including a fairness check where an autopilot bot (`game/dev/autopilot.ts`) survives 3,000 m on 30 seeds. The same bot finishes every campaign level.

Gotchas:

- In a `'worklet'` file, functions become constants, so define helpers before the functions that use them.
- The camera's near plane is 2 m on purpose. Geometry right at the lens projects to huge coordinates, which CanvasKit (web) drops.
- Level generation and cosmetic effects use separate RNG streams, so a seed always produces the same obstacles.
- Chrome throttles animation in hidden tabs, so a web test in a background window shows a blank canvas.

## Status and what's next

Milestones 1 to 4 from the brief are done, plus the level campaign, the Android back button and a first-run tutorial. The first iPhone session's bugs (hitches, no sound) are fixed but need a re-test on the phone. What's next (real-device and Android testing, app icon and identity, the economy check, then content) is in [ROADMAP.md](ROADMAP.md).
