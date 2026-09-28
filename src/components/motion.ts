import { Easing, FadeIn, ZoomIn } from 'react-native-reanimated';

import { useProfileStore } from '../store/profileStore';

// The in-app Reduce motion setting (which new players inherit from the system setting).
export function useReduceMotion(): boolean {
  return useProfileStore((s) => s.profile.settings.reduceMotion);
}

// Entrance for panels and badges: one quick zoom, or a plain fade with reduced motion.
export function popIn(reduce: boolean, delay = 0) {
  return reduce
    ? FadeIn.delay(delay).duration(150)
    : ZoomIn.delay(delay).duration(220).easing(Easing.out(Easing.cubic));
}
