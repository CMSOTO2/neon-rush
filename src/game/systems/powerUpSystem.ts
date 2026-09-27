'worklet';

import { laneX, PLAYER, POOL_SIZES, POWER } from '../config';
import { placeSkyTrail } from '../levels/coinPatterns';
import { durationFor } from '../powerups/powerups';
import { GameEvent, PowerUpKind, type GameState } from '../types';
import { burstSparkles, emitFlame } from './particleSystem';

export function isActive(state: GameState, kind: number): boolean {
  return state.power[kind] > 0;
}

// Obstacles can't hurt the runner while this is true.
export function isInvulnerable(state: GameState): boolean {
  return (
    state.invuln > 0 || state.power[PowerUpKind.Boost] > 0 || state.power[PowerUpKind.Jetpack] > 0
  );
}

export function scoreMultiplier(state: GameState): number {
  return state.power[PowerUpKind.Multiplier] > 0 ? POWER.multiplier : 1;
}

export function activatePowerUp(state: GameState, kind: number): void {
  const duration = durationFor(kind, state.upgrades[kind]);
  state.power[kind] = duration;
  state.powerFull[kind] = duration;
  state.stats.powerUps++;
  state.events |= GameEvent.PowerUp;
  const p = state.player;

  if (kind === PowerUpKind.Jetpack) {
    p.flying = true;
    p.sliding = false;
    p.slideTime = 0;
    p.grounded = false;
    p.vy = 0;
    // Sky coins start once the runner has climbed.
    placeSkyTrail(state, state.distance + 14, duration * state.speed - 20, POWER.jetpackAltitude);
  } else if (kind === PowerUpKind.Boost) {
    state.events |= GameEvent.Boost;
  }
}

function endPowerUp(state: GameState, kind: number): void {
  const p = state.player;
  if (kind === PowerUpKind.Jetpack) {
    p.flying = false;
    p.vy = 0;
    state.invuln = Math.max(state.invuln, POWER.graceTime);
  } else if (kind === PowerUpKind.Boost) {
    state.invuln = Math.max(state.invuln, POWER.graceTime);
  }
}

export function updatePowerUps(state: GameState, dt: number): void {
  for (let k = 0; k < state.power.length; k++) {
    if (state.power[k] <= 0) continue;
    state.power[k] -= dt;
    if (state.power[k] <= 0) {
      state.power[k] = 0;
      endPowerUp(state, k);
    }
  }
  if (state.invuln > 0) state.invuln = Math.max(0, state.invuln - dt);

  const p = state.player;
  if (p.flying) emitFlame(state, p.x, p.y, state.distance);

  // Pick up power-ups.
  const pickups = state.pickups;
  const top = p.y + PLAYER.standHeight;
  for (let i = 0; i < POOL_SIZES.pickups; i++) {
    const u = pickups[i];
    if (!u.active) continue;
    if (Math.abs(u.z - state.distance) > POWER.pickupReach) continue;
    if (Math.abs(laneX(u.lane) - p.x) > POWER.pickupReach) continue;
    if (u.y < p.y - 0.4 || u.y > top + 0.4) continue;
    u.active = false;
    burstSparkles(state, laneX(u.lane), u.y, u.z, 12);
    activatePowerUp(state, u.kind);
  }
}
