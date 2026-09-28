This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

## This project: Neon Rush

A 2.5D endless runner. Start with README.md (what exists, architecture), ROADMAP.md (what to do next) and MONETIZATION.md (post-launch only; v1 has no ads or purchases).

### Conventions

- Commit as you go, and run `npm run format` (Prettier) before every commit.
- Don't add new unit tests (the owner's preference). Existing bun tests can be run: `npm test`.
- Before calling work done: `npm run typecheck`, `npx expo lint`, `npm test`.
- Update README.md, ROADMAP.md and this file as part of every set of changes that affects them (the owner's standing instruction).
- After committing, push to `origin` once all three pass (the owner's standing instruction). Never push with a failing check.
- Game rules and data live in plain TypeScript (`src/progression/`, `src/game/levels/`, `src/game/powerups/`); keep React out of them.
- **Performance is a priority** (the owner's call). The game must hold 60 FPS, and 120 on ProMotion iPhones, with no hitches. For any change that touches the frame loop, rendering, audio, haptics or anything else on the main thread, run a run with `EXPO_PUBLIC_PERF=1` before and after and check that `slow frames` stays at 0. Say what you measured. Prefer the cheaper design even if it's more code, and don't add a native module that does work on the main thread per game event.

### Engine gotchas

- Everything under `src/game/engine`, `systems`, `levels`, and `rendering` runs on the UI thread as worklets (`'worklet';` at the top of the file). In those files functions become constants, so define helpers **before** the functions that call them, and don't allocate per frame (reuse pools, the path builder and rects).
- The camera near plane is 2 m on purpose (CanvasKit drops geometry projected to huge coordinates).
- The game loop shares the iOS main thread with Skia's raster and every native module that works there. Don't play sounds with expo-audio on native (its AVPlayer observer blocks the main thread on every play; use `playSfx`/`playSfxMany`, which go through the Web Audio host in `audio/audioHost.tsx`), and keep haptics to rare events.
- Draw one convex shape per path (`drawBuilt`), not many quads batched into one path: Skia rasterizes anti-aliased many-contour paths on the CPU. `drawBuilt` also disposes the path right away.
- Level generation uses `state.rng`; cosmetic effects use `state.fxRng`. Don't mix them, or seeded runs and levels stop being reproducible.
- Adding content: power-ups in `game/powerups/powerups.ts`, worlds in `constants/palette.ts` (+ a scenery drawer), cosmetics in `progression/cosmetics.ts`, levels in `progression/campaign.ts`. A new mission kind needs its run stat in `inRunGoal` (`progression/missions.ts`) so the in-run toast agrees with the end-of-run payout.

### Testing without touch input

- iOS simulator: `EXPO_PUBLIC_AUTOSTART=1 npx expo start --ios` (see the dev switch table in README.md), screenshots with `xcrun simctl io booted screenshot`, screens via deep links like `xcrun simctl openurl booted exp://127.0.0.1:<port>/--/shop`.
- Web: `npx expo start --web`; the app renders in a phone-shaped frame with arrow-key controls. A hidden or background tab gets no animation frames.
- Small-screen check: boot the iPhone SE (3rd gen) simulator and install Expo Go from `~/.expo/ios-simulator-app-cache/`. Expo Go's one-time dev-menu sheet covers the app; skip it with `xcrun simctl spawn <udid> defaults write host.exp.Exponent EXDevMenuIsOnboardingFinished -bool YES`.
- A second Metro with dev switches (e.g. `EXPO_PUBLIC_AUTOSTART=1 EXPO_PUBLIC_TUTORIAL=1 npx expo start --port 8082`) leaves the main one untouched.
- Android emulator: `adb shell input tap x y` and `adb shell input keyevent 4` (back) give real touch and back input; `adb exec-out screencap -p` takes screenshots.
- The simulator has no Taptic Engine or ring switch, so haptic stalls and silent-mode audio only show up on a real phone.
- Profiling: `EXPO_PUBLIC_PERF=1` logs frame timings with a `slow frames` count. For stalls, run `sample <pid> 10 1 -mayDie -file out.txt` on the simulator's Expo Go process (`pgrep -f "Expo Go"`) and look at the main thread for lock waits (`psynch_mutexwait`). Time Profiler only samples running threads, so it misses blocked time.
- Regenerate audio with `npm run sfx` and `npm run music`.
