import { Skia, type SkFont, type SkPicture } from '@shopify/react-native-skia';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo } from 'react';
import { AppState, Platform } from 'react-native';
import { useFrameCallback, useSharedValue, type FrameInfo } from 'react-native-reanimated';
import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets';

import { useGameStore } from '../store/gameStore';
import { handleInput, returnToReady, setPaused, startRun } from './engine/controls';
import { createRuntime, type GameRuntime } from './engine/runtime';
import { stepGame } from './engine/update';
import { useKeyboardControls } from './input/useKeyboardControls';
import { useSwipeGesture } from './input/useSwipeGesture';
import { createCamera } from './rendering/camera';
import { renderFrame } from './rendering/renderFrame';
import { createRenderResources } from './rendering/resources';
import { GameEvent, Phase, type Action } from './types';

const emptyPicture = (() => {
  const rec = Skia.PictureRecorder();
  rec.beginRecording(Skia.XYWHRect(0, 0, 1, 1));
  return rec.finishRecordingAsPicture();
})();

const newSeed = (): number => {
  'worklet';
  return (Math.random() * 2147483647) | 0;
};

// Web-only dev aid: ?timescale=0.25 slows the game down to inspect visuals frame by frame.
const DEV_TIME_SCALE = (() => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return 1;
  const v = Number(new URLSearchParams(window.location.search).get('timescale'));
  return v > 0 && v <= 4 ? v : 1;
})();

const haptic = (events: number) => {
  if (Platform.OS === 'web') return;
  if (events & GameEvent.Crash) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
  } else if (events & GameEvent.Stumble) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  } else if (events & GameEvent.Land) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }
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
      runtime.value = createRuntime(width, height, characterId, newSeed());
    });
  }, [runtime, width, height, characterId]);

  const onEvents = useCallback(
    (
      events: number,
      score: number,
      distance: number,
      jumps: number,
      slides: number,
      passed: number,
      stumbles: number,
    ) => {
      haptic(events);
      const store = useGameStore.getState();
      if (events & GameEvent.Start) store.setPhase('running');
      if (events & GameEvent.GameOver) {
        store.finishRun({ score, distance, jumps, slides, obstaclesPassed: passed, stumbles });
      }
    },
    [],
  );

  const onFrame = useCallback(
    (info: FrameInfo) => {
      'worklet';
      const rt = runtime.value;
      if (!rt) return;
      const dt = ((info.timeSincePreviousFrame ?? 16) / 1000) * DEV_TIME_SCALE;
      const state = rt.state;
      stepGame(state, dt);

      if (state.events !== 0) {
        const ev = state.events;
        state.events = 0;
        const st = state.stats;
        scheduleOnRN(
          onEvents,
          ev,
          st.score,
          st.distance,
          st.jumps,
          st.slides,
          st.obstaclesPassed,
          st.stumbles,
        );
      }

      const canvas = resources.recorder.beginRecording(resources.bounds);
      renderFrame(canvas, state, rt.render, resources);
      picture.value = resources.recorder.finishRecordingAsPicture();
    },
    [runtime, picture, resources, onEvents],
  );

  const frame = useFrameCallback(onFrame, true);

  const dispatch = useCallback(
    (action: Action) => {
      'worklet';
      const rt = runtime.value;
      if (rt) handleInput(rt.state, action, newSeed());
    },
    [runtime],
  );

  const tapToStart = useCallback(() => {
    'worklet';
    const rt = runtime.value;
    if (rt && rt.state.phase === Phase.Ready) startRun(rt.state, newSeed());
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
        const rt = runtime.value;
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
