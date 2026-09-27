import { MAX_UPGRADE_LEVEL } from '../game/powerups/powerups';

// Coin cost to buy each upgrade level (index 0 buys level 1). Early levels are cheap
// enough to buy after a few runs; the last one is a long-term goal.
export const UPGRADE_COSTS = [300, 900, 2200, 4800, 9500];

export function upgradeCost(currentLevel: number): number | null {
  return currentLevel >= MAX_UPGRADE_LEVEL ? null : UPGRADE_COSTS[currentLevel];
}

// Continuing after a crash costs more each time within the same run.
export const REVIVE_BASE_COST = 150;
export const MAX_REVIVES_PER_RUN = 2;

export function reviveCost(revivesUsed: number): number | null {
  return revivesUsed >= MAX_REVIVES_PER_RUN ? null : REVIVE_BASE_COST * 2 ** revivesUsed;
}
