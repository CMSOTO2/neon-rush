import { useEffect } from 'react';
import { Platform } from 'react-native';

import { Action } from '../types';

const KEYS: Record<string, Action> = {
  ArrowLeft: Action.Left,
  a: Action.Left,
  ArrowRight: Action.Right,
  d: Action.Right,
  ArrowUp: Action.Jump,
  w: Action.Jump,
  ' ': Action.Jump,
  ArrowDown: Action.Slide,
  s: Action.Slide,
};

// Keyboard controls for testing in a desktop browser. No-op on native.
export function useKeyboardControls(dispatch: (action: Action) => void, enabled: boolean) {
  useEffect(() => {
    if (Platform.OS !== 'web' || !enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const action = KEYS[e.key];
      if (action === undefined) return;
      e.preventDefault();
      dispatch(action);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dispatch, enabled]);
}
