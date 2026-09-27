'worklet';

import { LANE_COUNT } from '../config';
import { nextRandom, randomInt } from '../engine/random';
import { ObstacleKind, type GameState } from '../types';
import { densityAt, DIFFICULTY, safeLaneActionAt } from './difficulty';

// Row contents are written into this scratch buffer (-1 = empty lane) to avoid allocating.
export const EMPTY = -1;

// Worklet files turn functions into constants, so helpers must be defined before use.
function pickBlocker(state: GameState, tramUnlocked: boolean, gateUnlocked: boolean): number {
  const r = nextRandom(state);
  if (tramUnlocked && r < 0.45) return ObstacleKind.Tram;
  if (gateUnlocked && r < 0.72) return ObstacleKind.Gate;
  return ObstacleKind.Barrier;
}

// Builds one obstacle row. Fairness rules:
// - One "safe" lane always holds nothing, a barrier, or a gate: never a tram.
// - The safe lane drifts at most one lane per row, so the escape route is always reachable.
// - Row spacing (see difficulty.ts) is always longer than a tram, so rows never overlap.
export function generateRow(state: GameState, distance: number, out: number[]): void {
  const d = DIFFICULTY.unlock;
  const tramUnlocked = distance >= d.tram;
  const gateUnlocked = distance >= d.gate;

  for (let i = 0; i < LANE_COUNT; i++) out[i] = EMPTY;

  if (distance >= d.fullRow && nextRandom(state) < DIFFICULTY.fullRowChance) {
    const kind = gateUnlocked && nextRandom(state) < 0.5 ? ObstacleKind.Gate : ObstacleKind.Barrier;
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
    out[state.safeLane] =
      gateUnlocked && nextRandom(state) < 0.45 ? ObstacleKind.Gate : ObstacleKind.Barrier;
  }

  const density = densityAt(distance);
  let placed = out[state.safeLane] === EMPTY ? 0 : 1;
  for (let lane = 0; lane < LANE_COUNT; lane++) {
    if (lane === state.safeLane) continue;
    if (nextRandom(state) >= density) continue;
    out[lane] = pickBlocker(state, tramUnlocked, gateUnlocked);
    placed++;
  }

  // Every row asks something of the player.
  if (placed === 0) {
    let lane = randomInt(state, LANE_COUNT - 1);
    if (lane >= state.safeLane) lane++;
    out[lane] = pickBlocker(state, tramUnlocked, gateUnlocked);
  }
}
