import { MissionStat } from '../game/types';

// Missions: three are active at a time. Each completion pays coins and XP and is replaced
// by a new, slightly harder one, so there is always a next goal.

export type RunSummary = {
  score: number;
  distance: number;
  coins: number;
  jumps: number;
  slides: number;
  obstaclesPassed: number;
  stumbles: number;
  powerUps: number;
  // Longest stretch in the run without hitting anything.
  bestCleanDistance: number;
};

export type MissionKind =
  | 'coinsInRun'
  | 'distanceInRun'
  | 'jumpsInRun'
  | 'slidesInRun'
  | 'powerUpsInRun'
  | 'cleanDistance'
  | 'scoreInRun'
  | 'totalCoins'
  | 'totalRuns';

export type Mission = {
  id: string;
  kind: MissionKind;
  target: number;
  progress: number;
  tier: number;
  reward: number;
  xp: number;
};

type Template = {
  kind: MissionKind;
  // Target at tier 1 and the growth per tier.
  base: number;
  step: number;
  // "In one run" missions keep the best run; cumulative ones add up across runs.
  cumulative: boolean;
};

const TEMPLATES: Template[] = [
  { kind: 'coinsInRun', base: 40, step: 25, cumulative: false },
  { kind: 'distanceInRun', base: 400, step: 250, cumulative: false },
  { kind: 'jumpsInRun', base: 8, step: 4, cumulative: false },
  { kind: 'slidesInRun', base: 6, step: 3, cumulative: false },
  { kind: 'powerUpsInRun', base: 1, step: 1, cumulative: false },
  { kind: 'cleanDistance', base: 250, step: 150, cumulative: false },
  { kind: 'scoreInRun', base: 800, step: 600, cumulative: false },
  { kind: 'totalCoins', base: 150, step: 150, cumulative: true },
  { kind: 'totalRuns', base: 3, step: 2, cumulative: true },
];

const templateFor = (kind: MissionKind) => TEMPLATES.find((t) => t.kind === kind)!;

export function missionText(m: Pick<Mission, 'kind' | 'target'>): string {
  const t = m.target.toLocaleString();
  switch (m.kind) {
    case 'coinsInRun':
      return `Collect ${t} coins in one run`;
    case 'distanceInRun':
      return `Run ${t} m in one run`;
    case 'jumpsInRun':
      return `Jump ${t} times in one run`;
    case 'slidesInRun':
      return `Slide ${t} times in one run`;
    case 'powerUpsInRun':
      return m.target === 1 ? 'Grab a power-up' : `Grab ${t} power-ups in one run`;
    case 'cleanDistance':
      return `Run ${t} m without hitting anything`;
    case 'scoreInRun':
      return `Score ${t} points in one run`;
    case 'totalCoins':
      return `Collect ${t} coins in total`;
    case 'totalRuns':
      return `Play ${t} runs`;
  }
}

export function runValue(kind: MissionKind, run: RunSummary): number {
  switch (kind) {
    case 'coinsInRun':
    case 'totalCoins':
      return run.coins;
    case 'distanceInRun':
      return Math.floor(run.distance);
    case 'jumpsInRun':
      return run.jumps;
    case 'slidesInRun':
      return run.slides;
    case 'powerUpsInRun':
      return run.powerUps;
    case 'cleanDistance':
      return Math.floor(run.bestCleanDistance);
    case 'scoreInRun':
      return run.score;
    case 'totalRuns':
      return 1;
  }
}

const STAT_FOR: Record<MissionKind, MissionStat | null> = {
  coinsInRun: MissionStat.Coins,
  totalCoins: MissionStat.Coins,
  distanceInRun: MissionStat.Distance,
  jumpsInRun: MissionStat.Jumps,
  slidesInRun: MissionStat.Slides,
  powerUpsInRun: MissionStat.PowerUps,
  cleanDistance: MissionStat.CleanDistance,
  scoreInRun: MissionStat.Score,
  totalRuns: null,
};

// The run stat and value at which this mission finishes partway through the next run, so
// the game can announce it then (game/systems/missionSystem.ts). Null for missions that
// only resolve when a run ends. Must agree with runValue and applyRunToMissions.
export function inRunGoal(m: Mission): { stat: MissionStat; need: number } | null {
  const stat = STAT_FOR[m.kind];
  if (stat === null) return null;
  const need = templateFor(m.kind).cumulative ? m.target - m.progress : m.target;
  return { stat, need };
}

// Small deterministic generator so mission rolls don't need stored randomness.
function pick(seed: number, n: number): number {
  let t = (seed * 2654435761) >>> 0;
  t ^= t >>> 15;
  t = Math.imul(t, 2246822507) >>> 0;
  t ^= t >>> 13;
  return (t >>> 0) % n;
}

export function makeMission(serial: number, tier: number, avoid: MissionKind[]): Mission {
  const options = TEMPLATES.filter((t) => !avoid.includes(t.kind));
  const tpl = options[pick(serial + 17, options.length)];
  const target = tpl.base + tpl.step * (tier - 1);
  return {
    id: `m${serial}`,
    kind: tpl.kind,
    target,
    progress: 0,
    tier,
    reward: 150 + tier * 75,
    xp: 60 + tier * 30,
  };
}

export function missionTier(completedCount: number): number {
  return 1 + Math.floor(completedCount / 3);
}

// Applies a finished run to the active missions. Completed missions are returned and
// replaced; the serial counter keeps new mission ids unique.
export function applyRunToMissions(
  missions: Mission[],
  run: RunSummary,
  completedCount: number,
  serial: number,
): { missions: Mission[]; completed: Mission[]; completedCount: number; serial: number } {
  const completed: Mission[] = [];
  let count = completedCount;
  let nextSerial = serial;
  const updated = missions.map((m) => {
    const tpl = templateFor(m.kind);
    const value = runValue(m.kind, run);
    const progress = tpl.cumulative ? m.progress + value : Math.max(m.progress, value);
    return { ...m, progress: Math.min(progress, m.target) };
  });

  const result: Mission[] = [];
  for (const m of updated) {
    if (m.progress < m.target) {
      result.push(m);
      continue;
    }
    completed.push(m);
    count++;
    const avoid = [...updated.map((x) => x.kind), ...result.map((x) => x.kind)];
    result.push(makeMission(nextSerial++, missionTier(count), avoid));
  }
  return { missions: result, completed, completedCount: count, serial: nextSerial };
}

export function initialMissions(): { missions: Mission[]; serial: number } {
  const missions: Mission[] = [];
  let serial = 0;
  for (let i = 0; i < 3; i++) {
    missions.push(
      makeMission(
        serial++,
        1,
        missions.map((m) => m.kind),
      ),
    );
  }
  return { missions, serial };
}
