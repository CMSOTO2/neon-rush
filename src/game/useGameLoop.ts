import { Skia, type SkFont, type SkPicture } from '@shopify/react-native-skia';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo } from 'react';
import { AppState, Platform } from 'react-native';
import { useFrameCallback, useSharedValue, type FrameInfo } from 'react-native-reanimated';
import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets';

import { initSfx, playSfxMany, type SfxName } from '../audio/sfx';
import { DEV } from '../constants/dev';
import type { LevelDef } from '../progression/campaign';
import type { Loadout } from '../progression/cosmetics';
import { reviveCost } from '../progression/economy';
import { inRunGoal, missionText } from '../progression/missions';
import { useGameStore } from '../store/gameStore';
import { useProfileStore } from '../store/profileStore';
import {
  handleInput,
  returnToReady,
  reviveRun,
  setPaused,
  setUpgrades,
  startLevel,
  startRun,
  takeEvents,
} from './engine/controls';
import { createRuntime, type GameRuntime } from './engine/runtime';
import { stepGame } from './engine/update';
import { useKeyboardControls } from './input/useKeyboardControls';
import { useSwipeGesture } from './input/useSwipeGesture';
import { createCamera } from './rendering/camera';
import { renderFrame } from './rendering/renderFrame';
import { createRenderResources } from './rendering/resources';
import { autopilot } from './dev/autopilot';
import { chaserVisible, startChase } from './systems/chaserSystem';
import { setMissionGoals } from './systems/missionSystem';
import { activatePowerUp } from './systems/powerUpSystem';
import { startTutorial } from './systems/tutorialSystem';
import { GameEvent, Phase, type Action, type GameState, type RunStats } from './types';

const emptyPicture = (() => {
  const rec = Skia.PictureRecorder();
  rec.beginRecording(Skia.XYWHRect(0, 0, 1, 1));
  return rec.finishRecordingAsPicture();
})();

const newSeed = (): number => {
  'worklet';
  return (Math.random() * 2147483647) | 0;
};

const DEV_POWER = DEV.power;
const DEV_PERF = DEV.perf;
const DEV_INVINCIBLE = DEV.invincible;
const DEV_CHASER = DEV.chaser;
const DEV_AUTOPLAY = DEV.autoplay;
const startWithDevPower = (state: GameState): void => {
  'worklet';
  if (DEV_POWER >= 0 && DEV_POWER < 5 && state.phase === Phase.Running) {
    activatePowerUp(state, DEV_POWER);
  }
};

// Haptics only for hits. expo-haptics builds and warms up a feedback generator on the main
// thread for every call, and the game loop runs on that same thread, so each buzz costs
// frames on a real iPhone (the simulator has no Taptic Engine and never shows it). Buzzing
// on every landing and power-up made the run stutter; hits are rare and already a jolt.
const HAPTIC_GAP_MS = 400;
let lastHaptic = 0;
const haptic = (events: number) => {
  if (Platform.OS === 'web' || !useProfileStore.getState().profile.settings.haptics) return;
  if (!(events & (GameEvent.Crash | GameEvent.ShieldBreak | GameEvent.Stumble))) return;
  const now = Date.now();
  if (now - lastHaptic < HAPTIC_GAP_MS) return;
  lastHaptic = now;
  if (events & GameEvent.Crash) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
  } else if (events & GameEvent.ShieldBreak) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
  } else {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  }
};

// Event flag -> sound. Order matters only in that each flag plays its own sound once.
const SOUNDS: [number, SfxName][] = [
  [GameEvent.Coin, 'coin'],
  [GameEvent.Jump, 'jump'],
  [GameEvent.Slide, 'slide'],
  [GameEvent.Lane, 'lane'],
  [GameEvent.Land, 'land'],
  [GameEvent.Stumble, 'land'],
  [GameEvent.PowerUp, 'powerup'],
  [GameEvent.MissionDone, 'mission'],
  [GameEvent.ChaserStart, 'siren'],
  [GameEvent.Revive, 'powerup'],
  [GameEvent.Boost, 'boost'],
  [GameEvent.ShieldBreak, 'shield'],
  [GameEvent.Smash, 'shield'],
  [GameEvent.Crash, 'crash'],
  [GameEvent.GameOver, 'gameover'],
];

// Everything one frame produced goes out as a single message to the audio host.
const frameSounds: SfxName[] = [];
const playEventSounds = (events: number) => {
  frameSounds.length = 0;
  for (const [flag, name] of SOUNDS) {
    if (events & flag && !frameSounds.includes(name)) frameSounds.push(name);
  }
  playSfxMany(frameSounds);
};

type Options = {
  width: number;
  height: number;
  hudTop: number;
  // Scene offset (px) behind the main menu; see components/menuLayout.ts.
  menuShift: number;
  loadout: Loadout;
  upgrades: number[];
  world: string;
  hudFont: SkFont;
  hudSmallFont: SkFont;
  // False while another screen (shop, settings...) is on top of the game.
  focused: boolean;
};

// Owns the game loop: the simulation, input and Skia recording all run on the UI thread
// inside one frame callback. React only hears about phase changes via scheduleOnRN.
export function useGameLoop({
  width,
  height,
  hudTop,
  menuShift,
  loadout,
  upgrades,
  world,
  hudFont,
  hudSmallFont,
  focused,
}: Options) {
  const runtime = useSharedValue<GameRuntime | null>(null);
  const picture = useSharedValue<SkPicture>(emptyPicture);
  const previousPicture = useSharedValue<SkPicture | null>(null);
  // Upgrade levels from the save, applied to the engine at the start of each run.
  const upgradeLevels = useSharedValue<number[]>(upgrades);
  // The next endless run teaches the controls until the tutorial has been finished once.
  const tutorialDone = useProfileStore((s) => s.profile.tutorialDone);
  const tutorialPending = useSharedValue(!tutorialDone || DEV.tutorial);
  useEffect(() => {
    tutorialPending.set(!tutorialDone || DEV.tutorial);
  }, [tutorialPending, tutorialDone]);
  const reduceMotion = useProfileStore((s) => s.profile.settings.reduceMotion);
  const reduceMotionSV = useSharedValue(reduceMotion);
  useEffect(() => {
    reduceMotionSV.set(reduceMotion);
  }, [reduceMotionSV, reduceMotion]);
  useEffect(() => {
    upgradeLevels.set(upgrades);
  }, [upgradeLevels, upgrades]);
  // The active missions' in-run goals, handed to the engine at the start of each run so
  // it can announce a mission the moment it's done.
  const missions = useProfileStore((s) => s.profile.missions);
  const missionGoals = useSharedValue({
    stats: [] as number[],
    needs: [] as number[],
    texts: [] as string[],
  });
  useEffect(() => {
    const goals = missions.map(inRunGoal);
    missionGoals.set({
      stats: goals.map((g) => g?.stat ?? -1),
      needs: goals.map((g) => g?.need ?? 0),
      texts: missions.map(missionText),
    });
  }, [missionGoals, missions]);
  const applyRunSetup = useCallback(
    (state: GameState) => {
      'worklet';
      setUpgrades(state, upgradeLevels.get());
      const goals = missionGoals.get();
      setMissionGoals(state, goals.stats, goals.needs, goals.texts);
    },
    [upgradeLevels, missionGoals],
  );

  const { character, outfit, accessory, trail, board } = loadout;
  const resources = useMemo(() => {
    const horizonY = createCamera(width, height).horizonY;
    return createRenderResources(
      width,
      height,
      hudTop,
      horizonY,
      hudFont,
      hudSmallFont,
      {
        character,
        outfit,
        accessory,
        trail,
        board,
      },
      world,
      menuShift,
    );
  }, [
    width,
    height,
    hudTop,
    menuShift,
    hudFont,
    hudSmallFont,
    character,
    outfit,
    accessory,
    trail,
    board,
    world,
  ]);

  // The runtime is built on the UI thread so the worklets own a plain mutable object.
  useEffect(() => {
    scheduleOnUI(() => {
      'worklet';
      runtime.set(createRuntime(width, height, '', newSeed()));
    });
  }, [runtime, width, height]);

  useEffect(() => {
    initSfx();
  }, []);

  const beginRun = useCallback(
    (rt: GameRuntime) => {
      'worklet';
      applyRunSetup(rt.state);
      startRun(rt.state, newSeed());
      if (tutorialPending.get()) startTutorial(rt.state);
      else startWithDevPower(rt.state);
    },
    [applyRunSetup, tutorialPending],
  );

  // Dev builds can start a run automatically (EXPO_PUBLIC_AUTOSTART=1) for testing
  // without touch input, e.g. on a simulator.
  useEffect(() => {
    if (!DEV.autostart) return;
    const t = setTimeout(() => {
      scheduleOnUI(() => {
        'worklet';
        const rt = runtime.get();
        if (rt) beginRun(rt);
      });
    }, 1500);
    return () => clearTimeout(t);
  }, [runtime, beginRun]);

  const onEvents = useCallback(
    (events: number, stats: RunStats | null, revives: number, coinsPlaced: number) => {
      haptic(events);
      playEventSounds(events);
      const store = useGameStore.getState();
      if (events & GameEvent.Start) store.setPhase('running');
      if (events & GameEvent.TutorialDone) useProfileStore.getState().setTutorialDone(true);
      if (events & GameEvent.Revive) store.setPhase('running');
      if (events & (GameEvent.GameOver | GameEvent.LevelComplete) && stats) {
        const run = {
          score: stats.score,
          distance: stats.distance,
          coins: stats.coins,
          jumps: stats.jumps,
          slides: stats.slides,
          obstaclesPassed: stats.obstaclesPassed,
          stumbles: stats.stumbles,
          powerUps: stats.powerUps,
          bestCleanDistance: stats.bestCleanDistance,
        };
        if (events & GameEvent.LevelComplete) {
          store.completeLevel(run, coinsPlaced, revives);
          return;
        }
        // Offer a continue if the player can afford it; otherwise the run is over.
        const cost = reviveCost(revives);
        const coins = useProfileStore.getState().profile.coins;
        if (cost !== null && coins >= cost) store.offerRevive(run, revives);
        else store.finishRun(run);
      }
    },
    [],
  );

  const onFrame = useCallback(
    (info: FrameInfo) => {
      'worklet';
      const rt = runtime.get();
      if (!rt) return;
      const dt = ((info.timeSincePreviousFrame ?? 16) / 1000) * DEV.timeScale;
      const state = rt.state;
      state.reduceMotion = reduceMotionSV.get();
      if (DEV_INVINCIBLE && state.phase === Phase.Running) {
        state.invuln = Math.max(state.invuln, 0.2);
      }
      if (DEV_AUTOPLAY && state.phase === Phase.Running && state.tutorialHold < 0) {
        autopilot(state);
      }
      if (DEV_CHASER && state.phase === Phase.Running && !chaserVisible(state)) {
        startChase(state);
      }
      const t0 = DEV_PERF ? performance.now() : 0;
      stepGame(state, dt);
      const t1 = DEV_PERF ? performance.now() : 0;

      const ev = takeEvents(state);
      // Stats are only copied across threads when the run ends.
      if (ev !== 0) {
        const ending = ev & (GameEvent.GameOver | GameEvent.LevelComplete);
        scheduleOnRN(onEvents, ev, ending ? state.stats : null, state.revives, state.coinsPlaced);
      }

      const canvas = resources.recorder.beginRecording(resources.bounds);
      renderFrame(canvas, state, rt.render, resources);
      const next = resources.recorder.finishRecordingAsPicture();
      // Free the picture from two frames ago: the canvas has drawn it and moved on, and
      // leaving ~60 a second for the GC to find adds memory pressure on this thread.
      const old = previousPicture.get();
      previousPicture.set(picture.get());
      picture.set(next);
      if (old && old !== emptyPicture) old.dispose();

      if (DEV_PERF) {
        // Frame budget report: simulation vs. recording the Skia picture, in ms.
        const p = rt.perf;
        p.step += t1 - t0;
        p.draw += performance.now() - t1;
        p.frames++;
        const gap = info.timeSincePreviousFrame ?? 0;
        p.worst = Math.max(p.worst, gap);
        // Averages hide hitches, so also count frames that missed a 60 Hz deadline.
        if (gap > 20) p.slow++;
        if (p.frames >= 120) {
          console.log(
            `[perf] step ${(p.step / p.frames).toFixed(2)}ms  draw ${(p.draw / p.frames).toFixed(2)}ms  worst frame ${p.worst.toFixed(1)}ms  slow frames ${p.slow}  distance ${Math.floor(state.distance)}m`,
          );
          p.step = 0;
          p.draw = 0;
          p.frames = 0;
          p.worst = 0;
          p.slow = 0;
        }
      }
    },
    [runtime, picture, previousPicture, resources, onEvents, reduceMotionSV],
  );

  const frame = useFrameCallback(onFrame, true);

  const dispatch = useCallback(
    (action: Action) => {
      'worklet';
      const rt = runtime.get();
      if (!rt) return;
      if (rt.state.phase === Phase.Ready) beginRun(rt);
      else handleInput(rt.state, action, newSeed());
    },
    [runtime, beginRun],
  );

  const tapToStart = useCallback(() => {
    'worklet';
    const rt = runtime.get();
    if (rt && rt.state.phase === Phase.Ready) beginRun(rt);
  }, [runtime, beginRun]);

  const gesture = useSwipeGesture(width, dispatch, tapToStart);

  const phase = useGameStore((s) => s.phase);
  const keyboardDispatch = useCallback(
    (action: Action) => scheduleOnUI(dispatch, action),
    [dispatch],
  );
  useKeyboardControls(keyboardDispatch, focused && (phase === 'ready' || phase === 'running'));

  const controls = useMemo(() => {
    const onUI = (fn: (rt: GameRuntime) => void) =>
      scheduleOnUI(() => {
        'worklet';
        const rt = runtime.get();
        if (rt) fn(rt);
      });
    const startLevelOnUI = (def: LevelDef) => {
      const { seed, length, difficultyOffset, difficultyScale } = def;
      onUI((rt) => {
        'worklet';
        applyRunSetup(rt.state);
        startLevel(rt.state, seed, length, difficultyOffset, difficultyScale);
      });
    };
    return {
      // Starts (or restarts) whatever is being played: the current level, or endless.
      start: () => {
        const level = useGameStore.getState().level;
        if (level) startLevelOnUI(level);
        else onUI(beginRun);
        // Set here too: when restarting from pause the loop is stopped until this changes.
        useGameStore.getState().setPhase('running');
      },
      startLevel: (def: LevelDef) => {
        useGameStore.getState().setLevel(def);
        startLevelOnUI(def);
        useGameStore.getState().setPhase('running');
      },
      pause: () => {
        onUI((rt) => {
          'worklet';
          setPaused(rt.state, true);
        });
        useGameStore.getState().setPhase('paused');
      },
      resume: () => {
        onUI((rt) => {
          'worklet';
          setPaused(rt.state, false);
        });
        useGameStore.getState().setPhase('running');
      },
      revive: () => {
        const { revivesUsed, setPhase } = useGameStore.getState();
        const cost = reviveCost(revivesUsed);
        if (cost === null || !useProfileStore.getState().spendCoins(cost)) return;
        onUI((rt) => {
          'worklet';
          reviveRun(rt.state);
        });
        setPhase('running');
      },
      declineRevive: () => {
        const { pendingRun, finishRun } = useGameStore.getState();
        if (pendingRun) finishRun(pendingRun);
      },
      toMenu: () => {
        onUI((rt) => {
          'worklet';
          returnToReady(rt.state, newSeed());
        });
        useGameStore.getState().setLevel(null);
        useGameStore.getState().setPhase('ready');
      },
    };
  }, [runtime, beginRun, applyRunSetup]);

  // Pause automatically when the app goes to the background mid-run.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next !== 'active' && useGameStore.getState().phase === 'running') controls.pause();
    });
    return () => sub.remove();
  }, [controls]);

  // Stop the loop while paused or while another screen covers the game, to save battery.
  useEffect(() => {
    frame.setActive(focused && phase !== 'paused');
  }, [frame, phase, focused]);

  return { picture, gesture, controls };
}
