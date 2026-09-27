import type { RunSummary } from './missions';

// Lifetime totals the achievements (and the stats screen) read from.
export type LifetimeStats = {
  runs: number;
  totalDistance: number;
  totalCoins: number;
  totalPowerUps: number;
  missionsCompleted: number;
  dailiesCompleted: number;
  bestScore: number;
  bestDistance: number;
};

export type AchievementDef = {
  id: string;
  name: string;
  description: string;
  reward: number;
  // Checked after every run with the run and the updated lifetime totals.
  test: (run: RunSummary, life: LifetimeStats, level: number) => boolean;
};

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first-run',
    name: 'First Steps',
    description: 'Finish your first run.',
    reward: 100,
    test: (_r, life) => life.runs >= 1,
  },
  {
    id: 'first-power',
    name: 'Powered Up',
    description: 'Grab your first power-up.',
    reward: 150,
    test: (_r, life) => life.totalPowerUps >= 1,
  },
  {
    id: 'coins-100',
    name: 'Pocket Change',
    description: 'Collect 100 coins in one run.',
    reward: 250,
    test: (r) => r.coins >= 100,
  },
  {
    id: 'run-1000',
    name: 'One K',
    description: 'Run 1,000 m in one run.',
    reward: 300,
    test: (r) => r.distance >= 1000,
  },
  {
    id: 'run-2500',
    name: 'Marathoner',
    description: 'Run 2,500 m in one run.',
    reward: 600,
    test: (r) => r.distance >= 2500,
  },
  {
    id: 'run-5000',
    name: 'Neon Legend',
    description: 'Run 5,000 m in one run.',
    reward: 1500,
    test: (r) => r.distance >= 5000,
  },
  {
    id: 'clean-1000',
    name: 'Untouchable',
    description: 'Run 1,000 m without hitting anything.',
    reward: 500,
    test: (r) => r.bestCleanDistance >= 1000,
  },
  {
    id: 'coins-5000',
    name: 'Coin Collector',
    description: 'Collect 5,000 coins in total.',
    reward: 750,
    test: (_r, life) => life.totalCoins >= 5000,
  },
  {
    id: 'distance-25000',
    name: 'Around the Block',
    description: 'Run 25,000 m in total.',
    reward: 750,
    test: (_r, life) => life.totalDistance >= 25000,
  },
  {
    id: 'missions-10',
    name: 'Task Master',
    description: 'Complete 10 missions.',
    reward: 600,
    test: (_r, life) => life.missionsCompleted >= 10,
  },
  {
    id: 'daily-5',
    name: 'Regular',
    description: 'Complete 5 daily challenges.',
    reward: 800,
    test: (_r, life) => life.dailiesCompleted >= 5,
  },
  {
    id: 'level-10',
    name: 'Rising Star',
    description: 'Reach player level 10.',
    reward: 1000,
    test: (_r, _life, level) => level >= 10,
  },
  {
    id: 'runs-100',
    name: 'Can’t Stop',
    description: 'Play 100 runs.',
    reward: 1000,
    test: (_r, life) => life.runs >= 100,
  },
];

export function newlyUnlocked(
  unlocked: string[],
  run: RunSummary,
  life: LifetimeStats,
  level: number,
): AchievementDef[] {
  return ACHIEVEMENTS.filter((a) => !unlocked.includes(a.id) && a.test(run, life, level));
}
