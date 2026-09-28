'worklet';

import { laneX, OBSTACLES, PLAYER, POWER } from '../config';
import {
  GameEvent,
  ObstacleKind,
  Phase,
  PowerUpKind,
  type GameState,
  type Obstacle,
} from '../types';
import { isChasing, loseChaser, startChase } from './chaserSystem';
import { burstShards, burstStars } from './particleSystem';
import { playerHeight } from './playerSystem';
import { isInvulnerable } from './powerUpSystem';

function halfWidthOf(o: Obstacle): number {
  if (o.kind === ObstacleKind.Tram) return OBSTACLES.tram.halfWidth;
  if (o.kind === ObstacleKind.Gate) return OBSTACLES.gate.halfWidth;
  if (o.kind === ObstacleKind.Gap) return OBSTACLES.gap.halfWidth;
  return OBSTACLES.barrier.halfWidth;
}

function heightOf(o: Obstacle): number {
  if (o.kind === ObstacleKind.Tram) return OBSTACLES.tram.height;
  if (o.kind === ObstacleKind.Gate) return OBSTACLES.gate.beamTop;
  return OBSTACLES.barrier.height;
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

function crash(state: GameState, fell: boolean): void {
  const p = state.player;
  state.phase = Phase.Crashing;
  state.crashTime = 0;
  state.shake = 1;
  state.fell = fell;
  p.sliding = false;
  p.grounded = false;
  p.vy = fell ? -2 : 7;
  p.targetLane = p.lane;
  if (!fell) burstStars(state, p.x, 1.4, state.distance);
  state.events |= GameEvent.Crash;
}

// Side hit: bounce back to the lane the player came from and call the chaser drone. If it
// is already chasing, it catches the runner, unless a shield takes the hit. Returns true
// when the run ended.
function stumble(state: GameState): boolean {
  const p = state.player;
  p.targetLane = p.prevLane;
  p.stumbleTime = PLAYER.stumbleTime;
  state.shake = Math.max(state.shake, 0.45);
  state.stats.stumbles++;
  state.stats.cleanDistance = 0;
  state.events |= GameEvent.Stumble;
  // The tutorial forgives everything.
  if (state.tutorialStep > 0) return false;
  if (!isChasing(state)) {
    startChase(state);
    return false;
  }
  if (state.power[PowerUpKind.Shield] > 0) {
    state.power[PowerUpKind.Shield] = 0;
    state.invuln = POWER.graceTime;
    state.events |= GameEvent.ShieldBreak;
    loseChaser(state, true);
    return false;
  }
  state.chaser.caught = true;
  crash(state, false);
  return true;
}

function smash(state: GameState, o: Obstacle): void {
  o.active = false;
  burstShards(state, laneX(o.lane), heightOf(o) * 0.5, Math.max(o.z0, state.distance + 1));
  state.shake = Math.max(state.shake, 0.5);
  state.events |= GameEvent.Smash;
}

// Would-be crash: a shield absorbs it (smashing the obstacle), otherwise the run ends.
function hit(state: GameState, o: Obstacle, fell: boolean): boolean {
  if (state.power[PowerUpKind.Shield] > 0) {
    state.power[PowerUpKind.Shield] = 0;
    state.invuln = POWER.graceTime;
    state.events |= GameEvent.ShieldBreak;
    state.stats.cleanDistance = 0;
    if (!fell) smash(state, o);
    return false;
  }
  crash(state, fell);
  return true;
}

// prevDistance/prevX are the player's position at the start of this substep and h is its
// length. Sliding into an obstacle's side during a lane change bounces the player back;
// running into its front, landing on it, or dropping into a gap crashes.
export function checkCollisions(
  state: GameState,
  prevDistance: number,
  prevX: number,
  h: number,
): void {
  const p = state.player;
  const d = state.distance;
  const front = d + PLAYER.halfDepth;
  const back = d - PLAYER.halfDepth;
  const bottom = p.y;
  const top = p.y + playerHeight(state);
  const boosting = state.power[PowerUpKind.Boost] > 0;
  const safe = isInvulnerable(state);
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
    const ox = laneX(o.lane);

    if (o.kind === ObstacleKind.Gap) {
      // Only fall when grounded with the feet well inside the hole.
      const m = OBSTACLES.gap.fallMargin;
      const inside =
        Math.abs(p.x - ox) < OBSTACLES.gap.halfWidth - PLAYER.halfWidth &&
        d > o.z0 + m &&
        d < o.z1 - m;
      if (!inside || !p.grounded || safe) continue;
      if (hit(state, o, true)) return;
      continue;
    }

    const reach = PLAYER.halfWidth + halfWidthOf(o);
    if (Math.abs(p.x - ox) >= reach) continue;
    if (!overlapsVertically(o, bottom, top)) continue;

    if (boosting) {
      smash(state, o);
      continue;
    }
    if (safe) {
      // Don't let a grace period expire while still inside something.
      state.invuln = Math.max(state.invuln, 0.1);
      continue;
    }

    // The obstacle's near face at the start of this substep (oncoming trams move).
    const prevZ0 = o.z0 - o.vz * h;
    const enteredFromFront = prevDistance + PLAYER.halfDepth <= prevZ0 + 0.001;
    const enteredFromSide = Math.abs(prevX - ox) >= reach;
    if (enteredFromFront) {
      if (hit(state, o, false)) return;
      continue;
    }
    if (enteredFromSide) {
      if (p.stumbleTime <= 0 && stumble(state)) return;
      continue;
    }
    // Still inside the obstacle's footprint while bouncing out of a side hit.
    if (p.stumbleTime > 0) continue;
    // Otherwise the player came down on it or stood up into it.
    if (hit(state, o, false)) return;
  }
}
