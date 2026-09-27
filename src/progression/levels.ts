// Experience and player level. XP comes from distance, coins, missions and achievements.

export function xpToNext(level: number): number {
  return Math.round(200 * Math.pow(level, 1.35));
}

export type LevelInfo = { level: number; xpIntoLevel: number; xpForLevel: number };

export function levelFromXp(totalXp: number): LevelInfo {
  let level = 1;
  let remaining = Math.max(0, Math.floor(totalXp));
  while (remaining >= xpToNext(level) && level < 99) {
    remaining -= xpToNext(level);
    level++;
  }
  return { level, xpIntoLevel: remaining, xpForLevel: xpToNext(level) };
}

export function runXp(distance: number, coins: number): number {
  return Math.floor(distance / 8) + coins;
}

// Coins awarded for reaching a new level.
export function levelUpReward(level: number): number {
  return 100 + level * 50;
}
