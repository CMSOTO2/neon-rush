'worklet';

import { LANE_COUNT } from '../config';
import { nextRandom, randomInt } from '../engine/random';
import { ObstacleKind, type GameState } from '../types';
import { densityAt, DIFFICULTY, safeLaneActionAt } from './difficulty';

// Row contents are written into a scratch buffer (-1 = empty lane) to avoid allocating.
export const EMPTY = -1;
// Row code for a tram that drives toward the runner; the spawner turns it into a Tram.
export const ONCOMING = 100;

export const isTramCode = (code: number): boolean => {
  'worklet';
  return code === ObstacleKind.Tram || code === ONCOMING;
};

// Worklet files turn functions into constants, so helpers must be defined before use.
function pickBlocker(state: GameState, distance: number): number {
  const u = DIFFICULTY.unlock;
  const r = nextRandom(state);
  if (distance >= u.tram && r < 0.42) return ObstacleKind.Tram;
  if (distance >= u.gate && r < 0.64) return ObstacleKind.Gate;
  if (distance >= u.gap && r < 0.8) return ObstacleKind.Gap;
  return ObstacleKind.Barrier;
}

// Something the runner can pass with a jump or slide.
function pickAction(state: GameState, distance: number): number {
  const u = DIFFICULTY.unlock;
  const r = nextRandom(state);
  if (distance >= u.gap && r < 0.25) return ObstacleKind.Gap;
  if (distance >= u.gate && r < 0.6) return ObstacleKind.Gate;
  return ObstacleKind.Barrier;
}

// Builds one obstacle row. Fairness rules:
// - One "safe" lane always holds nothing or a jump/slide obstacle: never a tram.
// - The safe lane drifts at most one lane per row, so the escape route is always reachable.
// - Row spacing (see difficulty.ts) is always longer than a tram, so rows never overlap.
// - An oncoming tram drives back through the previous two rows before the runner meets
//   it, so it only goes in a lane that was empty and not safe in both of them.
export function generateRow(state: GameState, distance: number, out: number[]): void {
  const d = DIFFICULTY.unlock;
  for (let i = 0; i < LANE_COUNT; i++) out[i] = EMPTY;

  if (distance >= d.fullRow && nextRandom(state) < DIFFICULTY.fullRowChance) {
    const kind =
      distance >= d.gate && nextRandom(state) < 0.5 ? ObstacleKind.Gate : ObstacleKind.Barrier;
    for (let i = 0; i < LANE_COUNT; i++) out[i] = kind;
    return;
  }

  // Drift the safe lane: stay 50%, otherwise step toward a random neighbour.
  if (state.rowCount > 0 && nextRandom(state) >= 0.5) {
    const step = nextRandom(state) < 0.5 ? -1 : 1;
    const next = state.safeLane + step;
    state.safeLane = next < 0 || next >= LANE_COUNT ? state.safeLane - step : next;
  }

  if (nextRandom(state) < safeLaneActionAt(distance)) {
    out[state.safeLane] = pickAction(state, distance);
  }

  const density = densityAt(distance);
  let placed = out[state.safeLane] === EMPTY ? 0 : 1;
  for (let lane = 0; lane < LANE_COUNT; lane++) {
    if (lane === state.safeLane) continue;
    if (nextRandom(state) >= density) continue;
    out[lane] = pickBlocker(state, distance);
    placed++;
  }

  // Every row asks something of the player.
  if (placed === 0) {
    let lane = randomInt(state, LANE_COUNT - 1);
    if (lane >= state.safeLane) lane++;
    out[lane] = pickBlocker(state, distance);
  }

  if (distance >= d.oncoming) {
    for (let lane = 0; lane < LANE_COUNT; lane++) {
      if (out[lane] !== ObstacleKind.Tram) continue;
      const clearBefore =
        state.prevRow[lane] === EMPTY &&
        state.prevRow2[lane] === EMPTY &&
        state.prevSafe !== lane &&
        state.prevSafe2 !== lane;
      if (clearBefore && nextRandom(state) < DIFFICULTY.oncomingChance) out[lane] = ONCOMING;
    }
  }
}
