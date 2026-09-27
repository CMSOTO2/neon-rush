'worklet';

import { nextRandom } from '../engine/random';
import { ParticleKind, type GameState } from '../types';

export function spawnParticle(
  state: GameState,
  kind: number,
  x: number,
  y: number,
  z: number,
  vx: number,
  vy: number,
  vz: number,
  life: number,
  size: number,
): void {
  const pool = state.particles;
  for (let i = 0; i < pool.length; i++) {
    const p = pool[i];
    if (p.active) continue;
    p.active = true;
    p.kind = kind;
    p.x = x;
    p.y = y;
    p.z = z;
    p.vx = vx;
    p.vy = vy;
    p.vz = vz;
    p.life = life;
    p.maxLife = life;
    p.size = size;
    return;
  }
  // Pool exhausted: dropping a cosmetic particle is better than allocating.
}

export function burstDust(state: GameState, x: number, z: number, count: number): void {
  for (let i = 0; i < count; i++) {
    const a = nextRandom(state) * Math.PI;
    spawnParticle(
      state,
      ParticleKind.Dust,
      x + (nextRandom(state) - 0.5) * 0.6,
      0.05,
      z + (nextRandom(state) - 0.5) * 0.4,
      Math.cos(a) * 2.2,
      1 + nextRandom(state) * 1.5,
      state.speed * 0.35 + (nextRandom(state) - 0.5),
      0.35 + nextRandom(state) * 0.2,
      0.12 + nextRandom(state) * 0.1,
    );
  }
}

export function emitSparks(state: GameState, x: number, z: number): void {
  const side = nextRandom(state) < 0.5 ? -1 : 1;
  spawnParticle(
    state,
    ParticleKind.Spark,
    x + side * 0.25,
    0.05,
    z - 0.2,
    side * (0.8 + nextRandom(state) * 1.5),
    1.5 + nextRandom(state) * 2,
    state.speed * 0.45,
    0.25 + nextRandom(state) * 0.15,
    0.05,
  );
}

export function burstStars(state: GameState, x: number, y: number, z: number): void {
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    spawnParticle(
      state,
      ParticleKind.Star,
      x,
      y,
      z,
      Math.cos(a) * 3.5,
      Math.sin(a) * 3.5 + 1,
      0,
      0.6,
      0.14,
    );
  }
}

export function updateParticles(state: GameState, dt: number): void {
  const pool = state.particles;
  for (let i = 0; i < pool.length; i++) {
    const p = pool[i];
    if (!p.active) continue;
    p.life -= dt;
    if (p.life <= 0) {
      p.active = false;
      continue;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.z += p.vz * dt;
    if (p.kind !== ParticleKind.Star) p.vy -= 9 * dt;
    if (p.y < 0) {
      p.y = 0;
      p.vy *= -0.3;
    }
  }
}
