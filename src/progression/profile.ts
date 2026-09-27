import { MAX_UPGRADE_LEVEL } from '../game/powerups/powerups';
import { POWERUP_COUNT } from '../game/types';
import type { LifetimeStats } from './achievements';
import { COSMETICS, DEFAULT_LOADOUT, DEFAULT_UNLOCKED, type Loadout } from './cosmetics';
import { dailyFor, todayKey, type DailyState } from './daily';
import { initialMissions, type Mission, type MissionKind } from './missions';

// Everything saved on the device. Bump SAVE_VERSION when the shape changes and add a step
// to migrate(); sanitizeProfile() then repairs anything missing or out of range, so a
// damaged or partial save never crashes the game or wipes progress that is still valid.
export const SAVE_VERSION = 1;

export type Settings = {
  music: boolean;
  sfx: boolean;
  haptics: boolean;
};

export type Profile = {
  coins: number;
  xp: number;
  upgrades: number[];
  owned: string[];
  loadout: Loadout;
  achievements: string[];
  missions: Mission[];
  missionSerial: number;
  daily: DailyState;
  life: LifetimeStats;
  settings: Settings;
};

export function defaultProfile(now: Date = new Date()): Profile {
  const { missions, serial } = initialMissions();
  return {
    coins: 0,
    xp: 0,
    upgrades: new Array(POWERUP_COUNT).fill(0),
    owned: [...DEFAULT_UNLOCKED],
    loadout: { ...DEFAULT_LOADOUT },
    achievements: [],
    missions,
    missionSerial: serial,
    daily: dailyFor(todayKey(now), null),
    life: {
      runs: 0,
      totalDistance: 0,
      totalCoins: 0,
      totalPowerUps: 0,
      missionsCompleted: 0,
      dailiesCompleted: 0,
      bestScore: 0,
      bestDistance: 0,
    },
    settings: { music: true, sfx: true, haptics: true },
  };
}

// Older save formats are upgraded one version at a time.
export function migrate(saved: unknown, fromVersion: number): unknown {
  const data = saved as Record<string, unknown>;
  // Version 0 was never shipped; nothing to convert yet. Example for the future:
  // if (fromVersion < 2) { data.newField = defaultValue; }
  void fromVersion;
  return data;
}

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown, fallback: number, min = 0, max = Number.MAX_SAFE_INTEGER): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
const bool = (v: unknown, fallback: boolean): boolean => (typeof v === 'boolean' ? v : fallback);
const strings = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];

const COSMETIC_IDS = new Set(COSMETICS.map((c) => c.id));
const MISSION_KINDS: MissionKind[] = [
  'coinsInRun',
  'distanceInRun',
  'jumpsInRun',
  'slidesInRun',
  'powerUpsInRun',
  'cleanDistance',
  'scoreInRun',
  'totalCoins',
  'totalRuns',
];

function sanitizeMission(v: unknown): Mission | null {
  if (!isObj(v) || typeof v.id !== 'string') return null;
  if (!MISSION_KINDS.includes(v.kind as MissionKind)) return null;
  const target = num(v.target, 0, 1);
  if (target <= 0) return null;
  return {
    id: v.id,
    kind: v.kind as MissionKind,
    target,
    progress: num(v.progress, 0, 0, target),
    tier: num(v.tier, 1, 1, 999),
    reward: num(v.reward, 150, 0, 100000),
    xp: num(v.xp, 60, 0, 100000),
  };
}

export function sanitizeProfile(raw: unknown, now: Date = new Date()): Profile {
  const base = defaultProfile(now);
  if (!isObj(raw)) return base;

  const upgrades = base.upgrades.map((d, i) =>
    Array.isArray(raw.upgrades) ? Math.round(num(raw.upgrades[i], d, 0, MAX_UPGRADE_LEVEL)) : d,
  );

  const owned = Array.from(
    new Set([...DEFAULT_UNLOCKED, ...strings(raw.owned).filter((id) => COSMETIC_IDS.has(id))]),
  );

  // Equipped items must exist, be owned and fit their slot; otherwise fall back.
  const loadout = { ...base.loadout };
  if (isObj(raw.loadout)) {
    for (const slot of Object.keys(loadout) as (keyof Loadout)[]) {
      const id = raw.loadout[slot];
      const item = typeof id === 'string' ? COSMETICS.find((c) => c.id === id) : undefined;
      if (item && item.slot === slot && owned.includes(item.id)) loadout[slot] = item.id;
    }
    const outfit = COSMETICS.find((c) => c.id === loadout.outfit);
    if (outfit?.characterId !== loadout.character) loadout.outfit = `${loadout.character}-default`;
  }

  const missions = Array.isArray(raw.missions)
    ? raw.missions.map(sanitizeMission).filter((m): m is Mission => m !== null)
    : [];

  const life = { ...base.life };
  if (isObj(raw.life)) {
    for (const key of Object.keys(life) as (keyof LifetimeStats)[]) {
      life[key] = num(raw.life[key], life[key]);
    }
  }

  let daily = base.daily;
  if (
    isObj(raw.daily) &&
    typeof raw.daily.date === 'string' &&
    MISSION_KINDS.includes(raw.daily.kind as MissionKind)
  ) {
    const d = raw.daily;
    const saved: DailyState = {
      date: d.date as string,
      kind: d.kind as MissionKind,
      target: num(d.target, 1, 1),
      progress: num(d.progress, 0),
      done: bool(d.done, false),
      streak: num(d.streak, 0, 0, 10000),
      lastCompletedDate: typeof d.lastCompletedDate === 'string' ? d.lastCompletedDate : null,
    };
    daily = dailyFor(todayKey(now), saved);
  }

  const settings = { ...base.settings };
  if (isObj(raw.settings)) {
    settings.music = bool(raw.settings.music, settings.music);
    settings.sfx = bool(raw.settings.sfx, settings.sfx);
    settings.haptics = bool(raw.settings.haptics, settings.haptics);
  }

  return {
    coins: Math.floor(num(raw.coins, 0)),
    xp: Math.floor(num(raw.xp, 0)),
    upgrades,
    owned,
    loadout,
    achievements: strings(raw.achievements),
    missions: missions.length === 3 ? missions : base.missions,
    // Never reuse a mission id: stay above every id still in use.
    missionSerial:
      missions.length === 3
        ? Math.max(
            Math.floor(num(raw.missionSerial, 0)),
            ...missions.map((m) => Number(m.id.slice(1)) + 1).filter(Number.isFinite),
          )
        : base.missionSerial,
    daily,
    life,
    settings,
  };
}
