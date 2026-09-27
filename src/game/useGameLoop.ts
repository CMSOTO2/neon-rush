import { Skia, type SkFont, type SkPicture } from '@shopify/react-native-skia';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo } from 'react';
import { AppState, Platform } from 'react-native';
import { useFrameCallback, useSharedValue, type FrameInfo } from 'react-native-reanimated';
import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets';

import { initSfx, playSfx, type SfxName } from '../audio/sfx';
import { DEV } from '../constants/dev';
import { useGameStore } from '../store/gameStore';
import { handleInput, returnToReady, setPaused, startRun, takeEvents } from './engine/controls';
import { createRuntime, type GameRuntime } from './engine/runtime';
import { stepGame } from './engine/update';
import { useKeyboardControls } from './input/useKeyboardControls';
import { useSwipeGesture } from './input/useSwipeGesture';
import { createCamera } from './rendering/camera';
import { renderFrame } from './rendering/renderFrame';
import { createRenderResources } from './rendering/resources';
import { activatePowerUp } from './systems/powerUpSystem';
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
const DEV_INVINCIBLE = DEV.invincible;
const startWithDevPower = (state: GameState): void => {
  'worklet';
  if (DEV_POWER >= 0 && DEV_POWER < 5 && state.phase === Phase.Running) {
    activatePowerUp(state, DEV_POWER);
  }
};

// Haptics for the moments that matter; everything else stays silent on the hand.
const haptic = (events: number) => {
  if (Platform.OS === 'web') return;
  if (events & GameEvent.Crash) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
  } else if (events & GameEvent.ShieldBreak) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
  } else if (events & (GameEvent.Stumble | GameEvent.Smash)) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  } else if (events & GameEvent.PowerUp) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  } else if (events & GameEvent.Land) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
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
  [GameEvent.Boost, 'boost'],
  [GameEvent.ShieldBreak, 'shield'],
  [GameEvent.Smash, 'shield'],
  [GameEvent.Crash, 'crash'],
  [GameEvent.GameOver, 'gameover'],
];

const playEventSounds = (events: number) => {
  for (const [flag, name] of SOUNDS) if (events & flag) playSfx(name);
};

type Options = {
  width: number;
  height: number;
  hudTop: number;
  characterId: string;
  hudFont: SkFont;
  hudSmallFont: SkFont;
};

// Owns the game loop: the simulation, input and Skia recording all run on the UI thread
// inside one frame callback. React only hears about phase changes via scheduleOnRN.
export function useGameLoop({
  width,
  height,
  hudTop,
  characterId,
  hudFont,
  hudSmallFont,
}: Options) {
  const runtime = useSharedValue<GameRuntime | null>(null);
  const picture = useSharedValue<SkPicture>(emptyPicture);

  const resources = useMemo(() => {
    const horizonY = createCamera(width, height).horizonY;
    return createRenderResources(
      width,
      height,
      hudTop,
      horizonY,
      hudFont,
      hudSmallFont,
      characterId,
    );
  }, [width, height, hudTop, hudFont, hudSmallFont, characterId]);

  // The runtime is built on the UI thread so the worklets own a plain mutable object.
  useEffect(() => {
    scheduleOnUI(() => {
      'worklet';
      runtime.set(createRuntime(width, height, characterId, newSeed()));
    });
  }, [runtime, width, height, characterId]);

  useEffect(() => {
    initSfx();
  }, []);

  // Dev builds can start a run automatically (EXPO_PUBLIC_AUTOSTART=1) for testing
  // without touch input, e.g. on a simulator.
  useEffect(() => {
    if (!DEV.autostart) return;
    const t = setTimeout(() => {
      scheduleOnUI(() => {
        'worklet';
        const rt = runtime.get();
        if (!rt) return;
        startRun(rt.state, newSeed());
        startWithDevPower(rt.state);
      });
    }, 1500);
    return () => clearTimeout(t);
  }, [runtime]);

  const onEvents = useCallback((events: number, stats: RunStats | null) => {
    haptic(events);
    playEventSounds(events);
    const store = useGameStore.getState();
    if (events & GameEvent.Start) store.setPhase('running');
    if (events & GameEvent.GameOver && stats) {
      store.finishRun({
        score: stats.score,
        distance: stats.distance,
        coins: stats.coins,
        jumps: stats.jumps,
        slides: stats.slides,
        obstaclesPassed: stats.obstaclesPassed,
        stumbles: stats.stumbles,
        powerUps: stats.powerUps,
      });
    }
  }, []);

  const onFrame = useCallback(
    (info: FrameInfo) => {
      'worklet';
      const rt = runtime.get();
      if (!rt) return;
      const dt = ((info.timeSincePreviousFrame ?? 16) / 1000) * DEV.timeScale;
      const state = rt.state;
      if (DEV_INVINCIBLE && state.phase === Phase.Running)
        state.invuln = Math.max(state.invuln, 0.2);
      stepGame(state, dt);

      const ev = takeEvents(state);
      // Stats are only copied across threads when the run ends.
      if (ev !== 0) scheduleOnRN(onEvents, ev, ev & GameEvent.GameOver ? state.stats : null);

      const canvas = resources.recorder.beginRecording(resources.bounds);
      renderFrame(canvas, state, rt.render, resources);
      picture.set(resources.recorder.finishRecordingAsPicture());
    },
    [runtime, picture, resources, onEvents],
  );

  const frame = useFrameCallback(onFrame, true);

  const dispatch = useCallback(
    (action: Action) => {
      'worklet';
      const rt = runtime.get();
      if (!rt) return;
      const wasReady = rt.state.phase === Phase.Ready;
      handleInput(rt.state, action, newSeed());
      if (wasReady) startWithDevPower(rt.state);
    },
    [runtime],
  );

  const tapToStart = useCallback(() => {
    'worklet';
    const rt = runtime.get();
    if (rt && rt.state.phase === Phase.Ready) {
      startRun(rt.state, newSeed());
      startWithDevPower(rt.state);
    }
  }, [runtime]);

  const gesture = useSwipeGesture(width, dispatch, tapToStart);

  const phase = useGameStore((s) => s.phase);
  const keyboardDispatch = useCallback(
    (action: Action) => scheduleOnUI(dispatch, action),
    [dispatch],
  );
  useKeyboardControls(keyboardDispatch, phase === 'ready' || phase === 'running');

  const controls = useMemo(() => {
    const onUI = (fn: (rt: GameRuntime) => void) =>
      scheduleOnUI(() => {
        'worklet';
        const rt = runtime.get();
        if (rt) fn(rt);
      });
    return {
      start: () => {
        onUI((rt) => {
          'worklet';
          startRun(rt.state, newSeed());
        });
        // Set here too: when restarting from pause the loop is stopped until this changes.
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
      toMenu: () => {
        onUI((rt) => {
          'worklet';
          returnToReady(rt.state, newSeed());
        });
        useGameStore.getState().setPhase('ready');
      },
    };
  }, [runtime]);

  // Pause automatically when the app goes to the background mid-run.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next !== 'active' && useGameStore.getState().phase === 'running') controls.pause();
    });
    return () => sub.remove();
  }, [controls]);

  // Stop the loop entirely while paused to save battery; the last frame stays on screen.
  useEffect(() => {
    frame.setActive(phase !== 'paused');
  }, [frame, phase]);

  return { picture, gesture, controls };
}
