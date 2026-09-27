# Neon Rush

A 2.5D endless runner for iOS and Android, built with Expo (SDK 57), React Native Skia, Reanimated and Gesture Handler. The full brief is in [SPEC.md](SPEC.md); the post-launch money plan is in [MONETIZATION.md](MONETIZATION.md).

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

## Architecture

```
src/
  app/                 Expo Router routes (_layout, index)
  screens/GameScreen   Canvas, gesture detector, overlays
  components/          Title, pause and game-over overlays, buttons
  store/gameStore      Zustand: UI phase, last run, best score
  constants/           Palette (per environment), fonts
  game/
    config.ts          Tunables: lanes, jump, slide, obstacle sizes
    types.ts           GameState, obstacles, particles, events
    engine/            State creation/reset, frame step, controls, RNG
    systems/           Player, spawner, collisions, particles
    levels/            Difficulty curve and row generator (fairness rules)
    rendering/         Camera, scenery, obstacles, runner, HUD
    input/             Swipe gesture and web keyboard
    characters/        Character definitions (cosmetic only)
    useGameLoop.ts     Wires engine, input and rendering together
```

**The whole game loop runs on the UI thread.** The engine files start with a `'worklet';` directive. A Reanimated frame callback steps the simulation, records the frame into a Skia picture, and hands it to a `<Canvas>`. Swipes are recognised in Gesture Handler worklets and go straight into the engine, so input never waits on the JS thread. React only hears about phase changes (start, game over) through `scheduleOnRN`, so it re-renders a few times per run, not every frame.

**Rendering is procedural 2.5D.** A pinhole camera sits behind the runner, sized from the viewport so the framing adapts to any screen. Obstacles and buildings are shaded boxes, and the runner is drawn from joint positions, so there are no image assets to load. Paints, the path builder and rects are reused every frame. Obstacles and particles come from fixed pools.

**The engine is plain TypeScript,** so `bun test` runs it headlessly. The fairness test drives an autopilot bot through 30 seeds to 3,000 m, and it has also passed at 8,000 m. That's the check that the row generator never builds an impossible pattern.

Gotchas:

- In a `'worklet'` file, functions become constants, so define helpers before the functions that use them.
- The camera's near plane is 2 m on purpose. Geometry right at the lens projects to huge coordinates, which CanvasKit (web) drops.
- Level generation and cosmetic effects use separate RNG streams, so a seed always produces the same obstacles.

## Status

**Milestone 1 (playable prototype): done.** Three lanes, swipe controls, jump, slide and fast-fall, three obstacle types (barrier: jump; laser gate: slide; mag-tram: change lanes), side hits bounce you back instead of ending the run, crash animation, score and distance, pause, game over, restart, and a gradual difficulty curve.

**Next, milestone 2:** coins and coin patterns, moving obstacles and gaps, the five power-ups, sound effects with expo-audio, and more animation polish.

Known limitations:

- Best score is kept in memory only; saving arrives with the save system in milestone 3.
- No audio yet.
- Only portrait is supported. Upside-down portrait is enabled in `app.json` for iOS builds (Expo Go ignores it).
