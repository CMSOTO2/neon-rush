import { useMemo } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import { useSharedValue } from 'react-native-reanimated';

import { Action } from '../types';

// Swipes are recognised on the UI thread and dispatched straight into the engine.
// One action per touch: it fires as soon as the finger passes the threshold (no waiting
// for release), and further movement in the same touch is ignored. Quick consecutive
// swipes each get their own touch, so they all register.
export function useSwipeGesture(
  screenWidth: number,
  dispatch: (action: Action) => void,
  onTap: () => void,
) {
  const fired = useSharedValue(false);
  // Scales with screen size so phones and tablets need a similar physical flick.
  const threshold = Math.max(16, screenWidth * 0.045);

  return useMemo(() => {
    const classify = (dx: number, dy: number): Action => {
      'worklet';
      if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? Action.Left : Action.Right;
      return dy < 0 ? Action.Jump : Action.Slide;
    };

    const pan = Gesture.Pan()
      .minDistance(4)
      .onBegin(() => {
        fired.set(false);
      })
      .onUpdate((e) => {
        if (fired.get()) return;
        if (Math.max(Math.abs(e.translationX), Math.abs(e.translationY)) < threshold) return;
        fired.set(true);
        dispatch(classify(e.translationX, e.translationY));
      })
      .onEnd((e) => {
        // A very short but fast flick that never crossed the threshold still counts.
        if (fired.get()) return;
        const speed = Math.hypot(e.velocityX, e.velocityY);
        const dist = Math.hypot(e.translationX, e.translationY);
        if (speed > 450 && dist > 8) {
          fired.set(true);
          dispatch(classify(e.translationX, e.translationY));
        }
      });

    const tap = Gesture.Tap()
      .maxDuration(250)
      .onEnd((_e, success) => {
        if (success) onTap();
      });

    return Gesture.Race(pan, tap);
  }, [dispatch, onTap, fired, threshold]);
}
