'worklet';

import { LANE_COUNT, OBSTACLES, WORLD } from '../config';
import { nextRandom } from '../engine/random';
import { rowGapAt, speedAt } from '../levels/difficulty';
import { EMPTY, generateRow } from '../levels/patterns';
import { ObstacleKind, type GameState } from '../types';

function depthOf(kind: number): number {
  if (kind === ObstacleKind.Tram) return OBSTACLES.tram.length;
  if (kind === ObstacleKind.Gate) return OBSTACLES.gate.depth;
  return OBSTACLES.barrier.depth;
}

function acquire(state: GameState, kind: number, lane: number, z: number): void {
  const pool = state.obstacles;
  for (let i = 0; i < pool.length; i++) {
    const o = pool[i];
    if (o.active) continue;
    o.active = true;
    o.kind = kind as ObstacleKind;
    o.lane = lane;
    o.z0 = z;
    o.z1 = z + depthOf(kind);
    o.passed = false;
    o.seed = nextRandom(state);
    return;
  }
}

export function updateSpawner(state: GameState): void {
  // Recycle obstacles once they're behind the camera.
  const pool = state.obstacles;
  const behind = state.distance - 8;
  for (let i = 0; i < pool.length; i++) {
    const o = pool[i];
    if (o.active && o.z1 < behind) o.active = false;
  }

  const buf = state.rowBuffer;
  while (state.nextRowZ < state.distance + WORLD.spawnAhead) {
    const z = state.nextRowZ;
    generateRow(state, z, buf);
    for (let lane = 0; lane < LANE_COUNT; lane++) {
      if (buf[lane] !== EMPTY) acquire(state, buf[lane], lane, z);
    }
    state.rowCount++;
    state.nextRowZ += rowGapAt(z, speedAt(z));
  }
}
