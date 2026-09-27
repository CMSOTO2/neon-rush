'worklet';

import type { SkCanvas } from '@shopify/react-native-skia';

import { POOL_SIZES, WORLD } from '../config';
import { ObstacleKind, type GameState } from '../types';
import type { Camera } from './camera';
import { drawBuildings, drawRoad, drawSkyAndGround } from './drawEnvironment';
import { drawCoin, drawPickup } from './drawCollectibles';
import { drawHud, drawParticles, drawSpeedLines } from './drawHud';
import { drawGaps, drawObstacle } from './drawObstacles';
import { drawRunner } from './drawRunner';
import type { FaceRect } from './primitives';
import type { RenderResources } from './resources';

// Mutable per-frame scratch that lives on the UI thread next to the game state.
export type RenderScratch = {
  cam: Camera;
  face: FaceRect;
  // Draw order codes sorted far to near: obstacle pool index, COIN_BASE + coin index,
  // PICKUP_BASE + pickup index, or PLAYER_SLOT.
  order: number[];
  keys: number[];
};

const PLAYER_SLOT = -1;
const COIN_BASE = 1000;
const PICKUP_BASE = 2000;

function sortDrawOrder(state: GameState, scratch: RenderScratch, far: number): number {
  const order = scratch.order;
  const keys = scratch.keys;
  // Skip anything fully behind the near plane: projecting it collapses to the vanishing point.
  const near = scratch.cam.z + scratch.cam.near;
  let n = 0;
  const obstacles = state.obstacles;
  for (let i = 0; i < POOL_SIZES.obstacles; i++) {
    const o = obstacles[i];
    // Gaps are flat on the road and drawn with it.
    if (!o.active || o.kind === ObstacleKind.Gap || o.z0 > far || o.z1 <= near) continue;
    order[n] = i;
    keys[n] = o.z0;
    n++;
  }
  const coins = state.coins;
  for (let i = 0; i < POOL_SIZES.coins; i++) {
    const c = coins[i];
    if (!c.active || c.z > far || c.z <= near) continue;
    order[n] = COIN_BASE + i;
    keys[n] = c.z;
    n++;
  }
  const pickups = state.pickups;
  for (let i = 0; i < POOL_SIZES.pickups; i++) {
    const u = pickups[i];
    if (!u.active || u.z > far || u.z <= near) continue;
    order[n] = PICKUP_BASE + i;
    keys[n] = u.z;
    n++;
  }
  order[n] = PLAYER_SLOT;
  keys[n] = state.distance;
  n++;
  // Insertion sort, descending: the list is nearly sorted frame to frame.
  for (let i = 1; i < n; i++) {
    const k = keys[i];
    const v = order[i];
    let j = i - 1;
    while (j >= 0 && keys[j] < k) {
      keys[j + 1] = keys[j];
      order[j + 1] = order[j];
      j--;
    }
    keys[j + 1] = k;
    order[j + 1] = v;
  }
  return n;
}

export function renderFrame(
  canvas: SkCanvas,
  state: GameState,
  scratch: RenderScratch,
  res: RenderResources,
): void {
  const cam = scratch.cam;
  cam.x = state.camX;
  cam.z = state.distance - cam.back;
  cam.lift = state.camLift * cam.heightBoost;
  const shake = state.reduceMotion ? 0 : state.shake * state.shake;
  cam.shakeX = shake > 0 ? Math.sin(state.time * 83) * shake * 12 : 0;
  cam.shakeY = shake > 0 ? Math.cos(state.time * 71) * shake * 9 : 0;
  cam.offsetY = -state.menuLift * cam.height * 0.14;

  drawSkyAndGround(canvas, res, cam);
  drawBuildings(canvas, res, cam, scratch.face, state.time);
  drawRoad(canvas, res, cam);
  drawGaps(canvas, res, cam, state);

  const n = sortDrawOrder(state, scratch, cam.z + WORLD.drawDistance);
  for (let i = 0; i < n; i++) {
    const code = scratch.order[i];
    if (code === PLAYER_SLOT) drawRunner(canvas, res, cam, state);
    else if (code >= PICKUP_BASE)
      drawPickup(canvas, res, cam, state, state.pickups[code - PICKUP_BASE]);
    else if (code >= COIN_BASE) drawCoin(canvas, res, cam, state, state.coins[code - COIN_BASE]);
    else drawObstacle(canvas, res, cam, scratch.face, state.obstacles[code], state.time);
  }

  drawParticles(canvas, res, cam, state);
  drawSpeedLines(canvas, res, cam, state);
  drawHud(canvas, res, state);
}
