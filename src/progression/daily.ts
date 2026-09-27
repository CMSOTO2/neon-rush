import { runValue, type MissionKind, type RunSummary } from './missions';

// One daily challenge per calendar day, derived from the date so everyone gets the same
// one and nothing needs to be downloaded. Completing it on consecutive days builds a
// streak that raises the reward.

export type DailyState = {
  date: string;
  kind: MissionKind;
  target: number;
  progress: number;
  done: boolean;
  // Consecutive days completed, ending with the last completed day.
  streak: number;
  lastCompletedDate: string | null;
};

const DAILY_OPTIONS: { kind: MissionKind; target: number }[] = [
  { kind: 'coinsInRun', target: 120 },
  { kind: 'distanceInRun', target: 1500 },
  { kind: 'jumpsInRun', target: 25 },
  { kind: 'slidesInRun', target: 18 },
  { kind: 'powerUpsInRun', target: 3 },
  { kind: 'cleanDistance', target: 800 },
  { kind: 'scoreInRun', target: 4000 },
];

export function todayKey(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function dayBefore(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return todayKey(new Date(y, m - 1, d - 1));
}

export function dailyReward(streak: number): number {
  return 500 + Math.min(streak, 7) * 100;
}

// Returns today's challenge, carrying over the streak (or resetting it if a day was missed).
export function dailyFor(date: string, previous: DailyState | null): DailyState {
  if (previous && previous.date === date) return previous;
  const option = DAILY_OPTIONS[hashString(date) % DAILY_OPTIONS.length];
  const keptStreak =
    previous?.lastCompletedDate && previous.lastCompletedDate === dayBefore(date)
      ? previous.streak
      : 0;
  return {
    date,
    kind: option.kind,
    target: option.target,
    progress: 0,
    done: false,
    streak: keptStreak,
    lastCompletedDate: previous?.lastCompletedDate ?? null,
  };
}

// Daily challenges are all "in one run", so progress keeps the best run of the day.
export function applyRunToDaily(
  daily: DailyState,
  run: RunSummary,
): { daily: DailyState; justCompleted: boolean; reward: number } {
  if (daily.done) return { daily, justCompleted: false, reward: 0 };
  const progress = Math.min(daily.target, Math.max(daily.progress, runValue(daily.kind, run)));
  if (progress < daily.target)
    return { daily: { ...daily, progress }, justCompleted: false, reward: 0 };
  const streak = daily.streak + 1;
  return {
    daily: { ...daily, progress, done: true, streak, lastCompletedDate: daily.date },
    justCompleted: true,
    reward: dailyReward(streak),
  };
}
