'worklet';

import { COINS, laneX, OBSTACLES, PLAYER, POOL_SIZES } from '../config';
import { nextRandom } from '../engine/random';
import { ObstacleKind, type GameState } from '../types';
import { effectiveDistance, speedAt } from './difficulty';
import { EMPTY, isTramCode } from './patterns';

// `counted` coins make up the level's coin star; bonus sky coins don't.
export function placeCoin(state: GameState, x: number, y: number, z: number, counted = true): void {
  const pool = state.coins;
  for (let i = 0; i < POOL_SIZES.coins; i++) {
    const c = pool[i];
    if (c.active) continue;
    c.active = true;
    c.x = x;
    c.y = y;
    c.z = z;
    c.collected = false;
    c.collectTime = 0;
    c.magnet = false;
    c.seed = (i * 0.618) % 1;
    if (counted) state.coinsPlaced++;
    return;
  }
}

function line(state: GameState, lane: number, z0: number, z1: number, y: number): void {
  const x = laneX(lane);
  for (let z = z0; z <= z1; z += COINS.spacing) placeCoin(state, x, y, z);
}

// Coins that follow the runner's own jump arc, centred on an obstacle at `centerZ`.
function arc(state: GameState, lane: number, centerZ: number): void {
  const speed = speedAt(effectiveDistance(state, centerZ));
  const halfAir = PLAYER.jumpVelocity / PLAYER.gravity;
  const apex = (PLAYER.jumpVelocity * halfAir) / 2;
  const x = laneX(lane);
  const reach = speed * halfAir;
  for (let dz = -reach; dz <= reach + 0.01; dz += COINS.spacing) {
    const t = dz / reach;
    placeCoin(state, x, COINS.height + apex * (1 - t * t), centerZ + dz);
  }
}

// Lays a coin trail leading into the row at `rowZ`. Coins only ever follow the lane the
// runner can pass (the safe lane) so collecting them never leads into a crash:
// straight lines, a hop across from the previous safe lane, an arc over barriers and
// gaps, and a low run under laser gates.
export function placeRowCoins(state: GameState, rowZ: number, row: number[]): void {
  if (nextRandom(state) > 0.6) return;
  const lane = state.safeLane;
  const prevLane = state.prevSafe;
  const clearance = isTramCode(state.prevRow[lane]) ? OBSTACLES.tram.length + 2 : 3;
  const start = state.rowCount === 0 ? rowZ - 24 : state.prevRowZ + clearance;
  const content = row[lane];
  // Leave room for the arc or low run that crosses the row itself.
  const arcReach = speedAt(effectiveDistance(state, rowZ)) * (PLAYER.jumpVelocity / PLAYER.gravity);
  const approachEnd =
    content === EMPTY ? rowZ + 4 : content === ObstacleKind.Gate ? rowZ - 6 : rowZ - arcReach - 2;
  if (approachEnd - start < COINS.spacing * 2) return;

  const crossLanes =
    prevLane !== lane && !isTramCode(state.prevRow[prevLane]) && nextRandom(state) < 0.6;
  if (crossLanes) {
    // Start in the previous safe lane, then drift across to this row's safe lane.
    const mid = (start + approachEnd) / 2;
    line(state, prevLane, start, mid - 3, COINS.height);
    const x0 = laneX(prevLane);
    const x1 = laneX(lane);
    for (let i = 1; i <= 3; i++) {
      const t = i / 4;
      placeCoin(state, x0 + (x1 - x0) * t, COINS.height, mid - 3 + t * 6);
    }
    line(state, lane, mid + 3, approachEnd, COINS.height);
  } else {
    line(state, lane, Math.max(start, approachEnd - 22), approachEnd, COINS.height);
  }

  if (content === ObstacleKind.Barrier) {
    arc(state, lane, rowZ + OBSTACLES.barrier.depth / 2);
  } else if (content === ObstacleKind.Gap) {
    arc(state, lane, rowZ + OBSTACLES.gap.length / 2);
  } else if (content === ObstacleKind.Gate) {
    line(state, lane, rowZ - 4, rowZ + 4, 0.45);
  }
}

// A sky trail at jetpack altitude for the length of the flight. It starts in the runner's
// lane, holds each lane for a stretch, then glides to a neighbouring lane, so following
// it is a steady rhythm of lane changes.
export function placeSkyTrail(
  state: GameState,
  fromZ: number,
  length: number,
  altitude: number,
  startLane: number,
): void {
  const spacing = COINS.spacing * 1.2;
  const y = altitude + 0.5;
  let lane = startLane;
  let z = fromZ;
  const end = fromZ + length;
  while (z < end) {
    const x = laneX(lane);
    for (let i = 0; i < 6 && z < end; i++, z += spacing) placeCoin(state, x, y, z, false);
    let next = lane + (nextRandom(state) < 0.5 ? -1 : 1);
    if (next < 0 || next > 2) next = lane + (lane === 0 ? 1 : -1);
    const nx = laneX(next);
    for (let i = 1; i <= 3 && z < end; i++, z += spacing)
      placeCoin(state, x + ((nx - x) * i) / 4, y, z, false);
    lane = next;
  }
}
