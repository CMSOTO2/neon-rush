import { Platform } from 'react-native';

// Developer-only switches, ignored in release builds. Set them as environment variables
// when starting Metro (e.g. EXPO_PUBLIC_AUTOSTART=1 npx expo start), or on web as URL
// parameters (?autostart=1&power=2&timescale=0.25).
//   autostart  start a run automatically after launch (handy on simulators)
//   power      0-4: begin every run with that power-up active
//   timescale  slow the game down (0.1-1) to inspect visuals
//   invincible 1: obstacles can't end the run (for reaching later content quickly)
//   world      environment id to show regardless of unlocks (e.g. beach)
function read(name: string, envValue: string | undefined): string | null {
  if (!__DEV__) return null;
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const v = new URLSearchParams(window.location.search).get(name);
    if (v !== null) return v;
  }
  return envValue ?? null;
}

const timeScale = Number(read('timescale', process.env.EXPO_PUBLIC_TIMESCALE));
const power = read('power', process.env.EXPO_PUBLIC_DEV_POWER);

export const DEV = {
  autostart: read('autostart', process.env.EXPO_PUBLIC_AUTOSTART) === '1',
  power: power === null ? -1 : Number(power),
  timeScale: timeScale > 0 && timeScale <= 4 ? timeScale : 1,
  invincible: read('invincible', process.env.EXPO_PUBLIC_INVINCIBLE) === '1',
  world: read('world', process.env.EXPO_PUBLIC_WORLD),
};
