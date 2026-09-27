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

Controls on a phone: swipe left or right to change lanes, up to jump, down to slide. Swiping down in the air slams you to the ground and slides. Tap or swipe on the title screen to start.

## Checks

```bash
npm test            # engine tests (bun), including the fairness bot
npm run typecheck
npx expo lint
npm run format      # prettier
```

## What's in the game

- **Two modes.** _Endless_: run as far as you can while the speed and density ramp up. _Levels_: a 20-level campaign (10 in Neon City, 10 on Sunset Beach) with fixed layouts, a finish arch, and up to 3 stars per level (finish, collect 60% of the coins, no hits or continues).
- **Obstacles.** Barriers (jump), laser gates (slide), mag-trams (change lanes), oncoming trams, and gaps in the road (jump). Hitting the side of something during a lane change bounces you back rather than ending the run.
- **Power-ups.** Coin Magnet, Shield, Jetpack (fly over everything along a trail of sky coins), 2× Score, and Speed Boost (smash through obstacles on a hoverboard). Each is upgradeable five times; the boost upgrade doubles as a Starting Boost.
- **Progression.** Coins, XP and player levels, three escalating missions at a time, a daily challenge with streaks, 13 achievements, and the option to continue after a crash for coins. Everything saves locally.
- **Cosmetics** (no gameplay effect): 4 runners, alternate outfits, head gear, trails, and hoverboards, unlocked with coins, levels or achievements.
- **Worlds.** Neon City, and Sunset Beach (unlocks at level 3).
- **Audio.** Original synthesized sound effects and a synthwave loop (`npm run sfx`, `npm run music` regenerate them), plus haptics.
- **Settings.** Music, sound effects, vibration, reduce motion (defaults to the system setting), and reset progress.

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
| `EXPO_PUBLIC_PERF=1`         | Log simulation and drawing time per frame                       |

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
  audio/               Sound effects and music
  constants/           Environments and palettes, fonts, dev switches
  game/
    config.ts          Tunables: lanes, jump, slide, obstacles, coins, power-ups
    types.ts           GameState, obstacles, coins, pickups, particles, events
    engine/            State creation/reset, frame step, controls, RNG
    systems/           Player, spawner, collisions, coins, power-ups, particles
    levels/            Difficulty curve, row generator and coin patterns (fairness rules)
    powerups/          Power-up registry
    rendering/         Camera, scenery, obstacles, collectibles, runner, HUD
    input/             Swipe gesture and web keyboard
    characters/        Character looks and outfits
    useGameLoop.ts     Wires engine, input, rendering, audio and progression together
```

**The whole game loop runs on the UI thread.** Engine files start with a `'worklet';` directive. A Reanimated frame callback steps the simulation, records the frame into a Skia picture, and hands it to a `<Canvas>`. Swipes are recognised in Gesture Handler worklets and go straight into the engine, so input never waits on the JS thread. React only hears about phase changes (start, game over, level complete) through `scheduleOnRN`, so it re-renders a few times per run, not every frame. The loop stops while paused or while another screen covers the game.

**Rendering is procedural 2.5D.** A pinhole camera sits behind the runner, sized from the viewport so the framing adapts to any screen. Obstacles and scenery are shaded boxes and paths, and the runner is drawn from joint positions, so there are no image assets to load. Paints, the path builder and rects are reused every frame; obstacles, coins, pickups and particles come from fixed pools. Measured on the iOS simulator with `EXPO_PUBLIC_PERF=1`: about 0.05 ms of simulation and 1.8 ms of drawing per frame.

**Adding content.** A power-up is an entry in `game/powerups/powerups.ts` plus its effect in `systems/powerUpSystem.ts`. A world is an entry in `constants/palette.ts` (and a scenery drawer if it needs new props). A cosmetic is an entry in `progression/cosmetics.ts` (characters also go in `game/characters/characters.ts`). Missions and achievements are data in `progression/`.

**The save** is versioned (`SAVE_VERSION` in `progression/profile.ts`). On load, every field is validated and repaired, so missing or out-of-range data falls back to defaults instead of crashing, and an unreadable save is copied aside rather than overwritten silently.

**Tests.** The engine and progression rules are plain TypeScript, so `bun test` runs them headlessly, including a fairness check where an autopilot bot survives 3,000 m on 30 seeds. The same bot finishes all 20 campaign levels.

Gotchas:

- In a `'worklet'` file, functions become constants, so define helpers before the functions that use them.
- The camera's near plane is 2 m on purpose. Geometry right at the lens projects to huge coordinates, which CanvasKit (web) drops.
- Level generation and cosmetic effects use separate RNG streams, so a seed always produces the same obstacles.
- Chrome throttles animation in hidden tabs, so a web test in a background window shows a blank canvas.

## Status and what's next

Milestones 1 to 4 from the brief are done, plus the level campaign. What to do next, in priority order (real-device testing, Android, the back button, app icon, a first-run tutorial, then content), is in [ROADMAP.md](ROADMAP.md).
