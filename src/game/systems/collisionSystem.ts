'worklet';

import { laneX, OBSTACLES, PLAYER } from '../config';
import { GameEvent, ObstacleKind, Phase, type GameState, type Obstacle } from '../types';
import { burstStars } from './particleSystem';
import { playerHeight } from './playerSystem';

function halfWidthOf(o: Obstacle): number {
  if (o.kind === ObstacleKind.Tram) return OBSTACLES.tram.halfWidth;
  if (o.kind === ObstacleKind.Gate) return OBSTACLES.gate.halfWidth;
  return OBSTACLES.barrier.halfWidth;
}

// Vertical overlap depends on what the obstacle asks for: jump, slide, or dodge.
function overlapsVertically(o: Obstacle, bottom: number, top: number): boolean {
  switch (o.kind) {
    case ObstacleKind.Barrier:
      return bottom < OBSTACLES.barrier.height;
    case ObstacleKind.Gate:
      return top > OBSTACLES.gate.beamBottom && bottom < OBSTACLES.gate.beamTop;
    default:
      return bottom < OBSTACLES.tram.height;
  }
}

function crash(state: GameState): void {
  const p = state.player;
  state.phase = Phase.Crashing;
  state.crashTime = 0;
  state.shake = 1;
  p.sliding = false;
  p.grounded = false;
  p.vy = 7;
  p.targetLane = p.lane;
  burstStars(state, p.x, 1.4, state.distance);
  state.events |= GameEvent.Crash;
}

function stumble(state: GameState): void {
  const p = state.player;
  // Bounce back to the lane the player came from.
  p.targetLane = p.prevLane;
  p.stumbleTime = PLAYER.stumbleTime;
  state.shake = Math.max(state.shake, 0.45);
  state.stats.stumbles++;
  state.events |= GameEvent.Stumble;
}

// prevDistance/prevX are the player's position at the start of this substep. Sliding
// into an obstacle's side during a lane change bounces the player back; running into
// its front, or landing on it, crashes.
export function checkCollisions(state: GameState, prevDistance: number, prevX: number): void {
  const p = state.player;
  const front = state.distance + PLAYER.halfDepth;
  const back = state.distance - PLAYER.halfDepth;
  const bottom = p.y;
  const top = p.y + playerHeight(state);
  const pool = state.obstacles;

  for (let i = 0; i < pool.length; i++) {
    const o = pool[i];
    if (!o.active) continue;

    if (!o.passed && o.z1 < back) {
      o.passed = true;
      state.stats.obstaclesPassed++;
      continue;
    }
    if (front <= o.z0 || back >= o.z1) continue;
    const reach = PLAYER.halfWidth + halfWidthOf(o);
    const ox = laneX(o.lane);
    if (Math.abs(p.x - ox) >= reach) continue;
    if (!overlapsVertically(o, bottom, top)) continue;

    const enteredFromFront = prevDistance + PLAYER.halfDepth <= o.z0 + 0.001;
    const enteredFromSide = Math.abs(prevX - ox) >= reach;
    if (enteredFromFront) {
      crash(state);
      return;
    }
    if (enteredFromSide) {
      if (p.stumbleTime <= 0) stumble(state);
      continue;
    }
    // Still inside the obstacle's footprint while bouncing out of a side hit.
    if (p.stumbleTime > 0) continue;
    // Otherwise the player came down on it or stood up into it.
    crash(state);
    return;
  }
}
