'worklet';

import { CHASER, laneX } from '../config';
import { GameEvent, PowerUpKind, type GameState } from '../types';

// A side hit calls in a security drone that hovers behind the runner for a few seconds.
// Clipping another obstacle while it's there gets the runner caught (collisionSystem.ts).
// It turns stumbles into a real cost without ending the run on the first mistake.

export function isChasing(state: GameState): boolean {
  return state.chaser.time > 0;
}

// Anything the drone is doing that should be drawn.
export function chaserVisible(state: GameState): boolean {
  const ch = state.chaser;
  return ch.time > 0 || ch.leaving > 0 || ch.caught;
}

export function startChase(state: GameState): void {
  const ch = state.chaser;
  const p = state.player;
  if (ch.leaving <= 0) {
    // Arrive over the shoulder facing the middle of the road.
    ch.side = p.targetLane === 2 ? -1 : p.targetLane === 0 ? 1 : p.prevLane > p.lane ? 1 : -1;
    ch.x = laneX(p.targetLane) + ch.side * CHASER.side;
    ch.age = 0;
  }
  // Called back while flying away: it turns around mid-air rather than starting over.
  ch.leaving = 0;
  ch.time = CHASER.duration;
  state.events |= GameEvent.ChaserStart;
}

// Shaken off (boost, jetpack, shield) or out of time: it flies away.
export function loseChaser(state: GameState, shaken: boolean): void {
  const ch = state.chaser;
  if (ch.time <= 0) return;
  ch.time = 0;
  ch.leaving = CHASER.leaveTime;
  if (shaken) state.events |= GameEvent.ChaserLost;
}

export function clearChaser(state: GameState): void {
  const ch = state.chaser;
  ch.time = 0;
  ch.age = 0;
  ch.leaving = 0;
  ch.caught = false;
}

export function updateChaser(state: GameState, dt: number): void {
  const ch = state.chaser;
  if (ch.leaving > 0) ch.leaving = Math.max(0, ch.leaving - dt);
  if (ch.time <= 0 && ch.leaving <= 0) return;
  ch.age += dt;
  const p = state.player;
  const targetX = p.x + ch.side * CHASER.side;
  ch.x += (targetX - ch.x) * (1 - Math.exp(-CHASER.followRate * dt));
  if (ch.time <= 0) return;
  if (state.power[PowerUpKind.Boost] > 0 || state.power[PowerUpKind.Jetpack] > 0) {
    loseChaser(state, true);
    return;
  }
  ch.time -= dt;
  if (ch.time <= 0) loseChaser(state, false);
}
