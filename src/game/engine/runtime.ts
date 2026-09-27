'worklet';

import { POOL_SIZES } from '../config';
import { createCamera } from '../rendering/camera';
import { createFaceRect } from '../rendering/primitives';
import type { RenderScratch } from '../rendering/renderFrame';
import type { GameState } from '../types';
import { createGameState } from './state';

// Everything mutable that the UI thread owns: simulation state plus render scratch.
// It must be created on the UI thread (see useGameLoop) so it stays a plain mutable object.
export type GameRuntime = {
  state: GameState;
  render: RenderScratch;
};

export function createRuntime(
  width: number,
  height: number,
  characterId: string,
  seed: number,
): GameRuntime {
  const order: number[] = [];
  const keys: number[] = [];
  for (let i = 0; i <= POOL_SIZES.obstacles; i++) {
    order.push(0);
    keys.push(0);
  }
  return {
    state: createGameState(width, height, characterId, seed),
    render: { cam: createCamera(width, height), face: createFaceRect(), order, keys },
  };
}
