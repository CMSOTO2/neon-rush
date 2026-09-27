'worklet';

// The difficulty curve, kept apart from the engine so it can be tuned alone.
// Every value eases toward its cap with distance, so there are no sudden spikes.

export const DIFFICULTY = {
  startSpeed: 13,
  maxSpeed: 28,
  speedRampDistance: 1800,
  // Seconds of run time between obstacle rows.
  startRowGap: 1.6,
  minRowGap: 0.95,
  rowGapRampDistance: 1500,
  // Chance that a lane other than the guaranteed-safe one gets an obstacle.
  startDensity: 0.3,
  maxDensity: 0.72,
  densityRampDistance: 1600,
  // Chance the safe lane asks for a jump or slide instead of being empty.
  startSafeLaneAction: 0.15,
  maxSafeLaneAction: 0.55,
  // Distance at which each obstacle type starts appearing.
  unlock: {
    tram: 60,
    gate: 180,
    gap: 320,
    fullRow: 450,
    oncoming: 700,
  },
  fullRowChance: 0.14,
  // Chance an eligible tram drives toward the runner instead of standing still.
  oncomingChance: 0.35,
  // Never let rows get so close that a tram from one row overlaps the next.
  minRowGapMeters: 16,
};

const ease = (distance: number, rampDistance: number): number =>
  1 - Math.exp(-distance / rampDistance);

// Difficulty is driven by distance; levels shift and stretch it to start harder.
export function effectiveDistance(
  state: { difficultyOffset: number; difficultyScale: number },
  z: number,
): number {
  return state.difficultyOffset + z * state.difficultyScale;
}

export function speedAt(distance: number): number {
  const d = DIFFICULTY;
  return d.startSpeed + (d.maxSpeed - d.startSpeed) * ease(distance, d.speedRampDistance);
}

export function rowGapAt(distance: number, speed: number): number {
  const d = DIFFICULTY;
  const seconds =
    d.startRowGap + (d.minRowGap - d.startRowGap) * ease(distance, d.rowGapRampDistance);
  return Math.max(seconds * speed, d.minRowGapMeters);
}

export function densityAt(distance: number): number {
  const d = DIFFICULTY;
  return d.startDensity + (d.maxDensity - d.startDensity) * ease(distance, d.densityRampDistance);
}

export function safeLaneActionAt(distance: number): number {
  const d = DIFFICULTY;
  return (
    d.startSafeLaneAction +
    (d.maxSafeLaneAction - d.startSafeLaneAction) * ease(distance, d.densityRampDistance)
  );
}
