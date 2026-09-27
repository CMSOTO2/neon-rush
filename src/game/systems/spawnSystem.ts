'worklet';

import { LANE_COUNT, OBSTACLES, POOL_SIZES, POWER, WORLD } from '../config';
import { nextRandom } from '../engine/random';
import { placeRowCoins } from '../levels/coinPatterns';
import { effectiveDistance, rowGapAt, speedAt } from '../levels/difficulty';
import { EMPTY, generateRow, ONCOMING } from '../levels/patterns';
import { POWERUP_WEIGHTS } from '../powerups/powerups';
import { GameMode, ObstacleKind, type GameState } from '../types';

function depthOf(kind: number): number {
  if (kind === ObstacleKind.Tram) return OBSTACLES.tram.length;
  if (kind === ObstacleKind.Gate) return OBSTACLES.gate.depth;
  if (kind === ObstacleKind.Gap) return OBSTACLES.gap.length;
  return OBSTACLES.barrier.depth;
}

function acquire(state: GameState, code: number, lane: number, z: number): void {
  const kind = code === ONCOMING ? ObstacleKind.Tram : code;
  const pool = state.obstacles;
  for (let i = 0; i < POOL_SIZES.obstacles; i++) {
    const o = pool[i];
    if (o.active) continue;
    o.active = true;
    o.kind = kind as ObstacleKind;
    o.lane = lane;
    o.z0 = z;
    o.z1 = z + depthOf(kind);
    o.vz = code === ONCOMING ? -state.speed * OBSTACLES.oncomingSpeedFactor : 0;
    o.passed = false;
    o.seed = nextRandom(state);
    return;
  }
}

function pickPowerUp(state: GameState): number {
  let total = 0;
  for (let i = 0; i < POWERUP_WEIGHTS.length; i++) total += POWERUP_WEIGHTS[i];
  let r = nextRandom(state) * total;
  for (let i = 0; i < POWERUP_WEIGHTS.length; i++) {
    r -= POWERUP_WEIGHTS[i];
    if (r <= 0) return i;
  }
  return 0;
}

function placePickup(state: GameState, lane: number, z: number): void {
  const pool = state.pickups;
  for (let i = 0; i < POOL_SIZES.pickups; i++) {
    const p = pool[i];
    if (p.active) continue;
    p.active = true;
    p.kind = pickPowerUp(state) as typeof p.kind;
    p.lane = lane;
    p.y = 1.1;
    p.z = z;
    return;
  }
}

export function updateSpawner(state: GameState): void {
  // Recycle anything behind the camera.
  const behind = state.distance - 8;
  const obstacles = state.obstacles;
  for (let i = 0; i < POOL_SIZES.obstacles; i++) {
    const o = obstacles[i];
    if (o.active && o.z1 < behind) o.active = false;
  }
  const coins = state.coins;
  for (let i = 0; i < POOL_SIZES.coins; i++) {
    const c = coins[i];
    if (c.active && !c.collected && c.z < behind) c.active = false;
  }
  const pickups = state.pickups;
  for (let i = 0; i < POOL_SIZES.pickups; i++) {
    const p = pickups[i];
    if (p.active && p.z < behind) p.active = false;
  }

  const buf = state.rowBuffer;
  // Levels stop generating shortly before the finish line.
  const lastRowZ = state.mode === GameMode.Level ? state.levelLength - 20 : Infinity;
  while (state.nextRowZ < state.distance + WORLD.spawnAhead && state.nextRowZ < lastRowZ) {
    const z = state.nextRowZ;
    const dz = effectiveDistance(state, z);
    generateRow(state, dz, buf);
    for (let lane = 0; lane < LANE_COUNT; lane++) {
      if (buf[lane] !== EMPTY) acquire(state, buf[lane], lane, z);
    }

    // A power-up sits in the safe lane between rows instead of that stretch's coins.
    if (z >= state.nextPickupZ && state.rowCount > 0) {
      const gapStart = state.prevRowZ + OBSTACLES.tram.length + 2;
      placePickup(state, state.safeLane, Math.max(gapStart, (state.prevRowZ + z) / 2));
      const [lo, hi] = POWER.pickupInterval;
      state.nextPickupZ = z + lo + nextRandom(state) * (hi - lo);
    } else {
      placeRowCoins(state, z, buf);
    }

    for (let i = 0; i < LANE_COUNT; i++) {
      state.prevRow2[i] = state.prevRow[i];
      state.prevRow[i] = buf[i];
    }
    state.prevSafe2 = state.prevSafe;
    state.prevSafe = state.safeLane;
    state.prevRowZ = z;
    state.rowCount++;
    state.nextRowZ += rowGapAt(dz, speedAt(dz));
  }
}
