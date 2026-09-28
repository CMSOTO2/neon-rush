'worklet';

import { fxRandom } from '../engine/random';
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
    const a = fxRandom(state) * Math.PI;
    spawnParticle(
      state,
      ParticleKind.Dust,
      x + (fxRandom(state) - 0.5) * 0.6,
      0.05,
      z + (fxRandom(state) - 0.5) * 0.4,
      Math.cos(a) * 2.2,
      1 + fxRandom(state) * 1.5,
      state.speed * 0.35 + (fxRandom(state) - 0.5),
      0.35 + fxRandom(state) * 0.2,
      0.12 + fxRandom(state) * 0.1,
    );
  }
}

export function emitSparks(state: GameState, x: number, z: number): void {
  const side = fxRandom(state) < 0.5 ? -1 : 1;
  spawnParticle(
    state,
    ParticleKind.Spark,
    x + side * 0.25,
    0.05,
    z - 0.2,
    side * (0.8 + fxRandom(state) * 1.5),
    1.5 + fxRandom(state) * 2,
    state.speed * 0.45,
    0.25 + fxRandom(state) * 0.15,
    0.05,
  );
}

// Water thrown up behind a surfboard.
export function emitSpray(state: GameState, x: number, z: number): void {
  const side = fxRandom(state) < 0.5 ? -1 : 1;
  spawnParticle(
    state,
    ParticleKind.Dust,
    x + side * (0.1 + fxRandom(state) * 0.2),
    0.05,
    z - 0.7,
    side * (0.6 + fxRandom(state) * 1.4),
    1.2 + fxRandom(state) * 1.8,
    state.speed * 0.6,
    0.3 + fxRandom(state) * 0.2,
    0.09 + fxRandom(state) * 0.08,
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
    // Stars, sparkles and flames float; debris falls.
    if (
      p.kind === ParticleKind.Dust ||
      p.kind === ParticleKind.Spark ||
      p.kind === ParticleKind.Shard
    ) {
      p.vy -= 9 * dt;
    }
    if (p.y < 0) {
      p.y = 0;
      p.vy *= -0.3;
    }
  }
}

export function burstSparkles(
  state: GameState,
  x: number,
  y: number,
  z: number,
  count: number,
): void {
  for (let i = 0; i < count; i++) {
    const a = fxRandom(state) * Math.PI * 2;
    const v = 1.5 + fxRandom(state) * 2;
    spawnParticle(
      state,
      ParticleKind.Sparkle,
      x,
      y,
      z,
      Math.cos(a) * v,
      Math.sin(a) * v + 1,
      state.speed * 0.9,
      0.3 + fxRandom(state) * 0.2,
      0.09,
    );
  }
}

// Jetpack exhaust, streaming down and back from the runner's back.
export function emitFlame(state: GameState, x: number, y: number, z: number): void {
  if (fxRandom(state) > 0.7) return;
  spawnParticle(
    state,
    ParticleKind.Flame,
    x + (fxRandom(state) - 0.5) * 0.3,
    y + 0.7,
    z - 0.35,
    (fxRandom(state) - 0.5) * 0.8,
    -4 - fxRandom(state) * 2,
    state.speed * 0.7,
    0.22 + fxRandom(state) * 0.1,
    0.16,
  );
}

// Pieces flying off an obstacle smashed by a shield or speed boost.
export function burstShards(state: GameState, x: number, y: number, z: number): void {
  for (let i = 0; i < 14; i++) {
    const a = fxRandom(state) * Math.PI * 2;
    spawnParticle(
      state,
      ParticleKind.Shard,
      x + (fxRandom(state) - 0.5) * 1.5,
      y + fxRandom(state),
      z,
      Math.cos(a) * 5,
      3 + fxRandom(state) * 5,
      state.speed * 0.3 + 4 + fxRandom(state) * 6,
      0.6 + fxRandom(state) * 0.3,
      0.14,
    );
  }
}
