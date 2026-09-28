import { ENVIRONMENTS } from '../constants/palette';

// Level mode: a campaign of fixed-length runs that end at a finish arch. Each level has a
// fixed seed, so its layout is the same every attempt and can be learned, and a
// difficulty offset so later levels start faster and busier. Endless mode is unchanged.

export type LevelDef = {
  id: string;
  number: number;
  world: string;
  length: number;
  seed: number;
  // The level plays like endless mode starting at this distance, ramping `scale` times
  // faster, so difficulty is set per level without separate tuning tables.
  difficultyOffset: number;
  difficultyScale: number;
  // Coins for finishing the first time.
  reward: number;
};

export const LEVELS_PER_WORLD = 10;

// Ten levels per world, in the order worlds unlock.
function makeLevel(n: number): LevelDef {
  const world = ENVIRONMENTS[Math.floor((n - 1) / LEVELS_PER_WORLD)].id;
  return {
    id: `L${n}`,
    number: n,
    world,
    length: Math.round((450 + n * 110) / 50) * 50,
    seed: 1000 + n * 7919,
    difficultyOffset: (n - 1) * 140,
    difficultyScale: 1 + (n - 1) * 0.04,
    reward: 100 + n * 40,
  };
}

export const CAMPAIGN: LevelDef[] = Array.from(
  { length: ENVIRONMENTS.length * LEVELS_PER_WORLD },
  (_, i) => makeLevel(i + 1),
);

export function levelById(id: string): LevelDef | undefined {
  return CAMPAIGN.find((l) => l.id === id);
}

export function nextLevel(def: LevelDef): LevelDef | undefined {
  return CAMPAIGN[def.number];
}

// Level 1 is always open; each later level opens once the one before is finished.
export function isLevelUnlocked(def: LevelDef, stars: Record<string, number>): boolean {
  if (def.number === 1) return true;
  return (stars[`L${def.number - 1}`] ?? 0) > 0;
}

// Share of the level's coins needed for the second star.
export const COIN_STAR_SHARE = 0.6;

export type StarResult = {
  stars: number;
  finished: boolean;
  coinsNeeded: number;
  coinStar: boolean;
  cleanStar: boolean;
};

// ★ reach the finish, ★★ collect most of the coins, ★★★ no hits and no continues.
export function starsFor(
  finished: boolean,
  coins: number,
  coinsPlaced: number,
  stumbles: number,
  revives: number,
): StarResult {
  const coinsNeeded = Math.max(1, Math.floor(coinsPlaced * COIN_STAR_SHARE));
  const coinStar = finished && coins >= coinsNeeded;
  const cleanStar = finished && stumbles === 0 && revives === 0;
  return {
    stars: finished ? 1 + (coinStar ? 1 : 0) + (cleanStar ? 1 : 0) : 0,
    finished,
    coinsNeeded,
    coinStar,
    cleanStar,
  };
}

// First clear pays the level reward; improving the best result pays 50 per new star.
export function levelReward(def: LevelDef, previousStars: number, stars: number): number {
  if (stars <= previousStars) return 0;
  return (previousStars === 0 ? def.reward : 0) + (stars - Math.max(previousStars, 1)) * 50;
}
