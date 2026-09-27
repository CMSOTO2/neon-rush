'worklet';

import type { SkCanvas } from '@shopify/react-native-skia';

import { WORLD } from '../config';
import type { GameState } from '../types';
import type { Camera } from './camera';
import { drawBuildings, drawRoad, drawSkyAndGround } from './drawEnvironment';
import { drawHud, drawParticles } from './drawHud';
import { drawObstacle } from './drawObstacles';
import { drawRunner } from './drawRunner';
import type { FaceRect } from './primitives';
import type { RenderResources } from './resources';

// Mutable per-frame scratch that lives on the UI thread next to the game state.
export type RenderScratch = {
  cam: Camera;
  face: FaceRect;
  // Draw order: obstacle pool indices plus -1 for the player, sorted far to near.
  order: number[];
  keys: number[];
};

const PLAYER_SLOT = -1;

function sortDrawOrder(state: GameState, scratch: RenderScratch, far: number): number {
  const order = scratch.order;
  const keys = scratch.keys;
  let n = 0;
  const pool = state.obstacles;
  for (let i = 0; i < pool.length; i++) {
    const o = pool[i];
    // Skip anything fully behind the near plane: projecting it collapses to the
    // vanishing point.
    if (!o.active || o.z0 > far || o.z1 <= scratch.cam.z + scratch.cam.near) continue;
    order[n] = i;
    keys[n] = o.z0;
    n++;
  }
  order[n] = PLAYER_SLOT;
  keys[n] = state.distance;
  n++;
  // Insertion sort, descending: the list is short and nearly sorted frame to frame.
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
  const shake = state.shake * state.shake;
  cam.shakeX = shake > 0 ? Math.sin(state.time * 83) * shake * 12 : 0;
  cam.shakeY = shake > 0 ? Math.cos(state.time * 71) * shake * 9 : 0;

  drawSkyAndGround(canvas, res, cam);
  drawBuildings(canvas, res, cam, scratch.face, state.time);
  drawRoad(canvas, res, cam);

  const n = sortDrawOrder(state, scratch, cam.z + WORLD.drawDistance);
  for (let i = 0; i < n; i++) {
    const idx = scratch.order[i];
    if (idx === PLAYER_SLOT) drawRunner(canvas, res, cam, state);
    else drawObstacle(canvas, res, cam, scratch.face, state.obstacles[idx], state.time);
  }

  drawParticles(canvas, res, cam, state);
  drawHud(canvas, res, state);
}
