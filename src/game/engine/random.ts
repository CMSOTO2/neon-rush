'worklet';

import type { GameState } from '../types';

// mulberry32, with its state kept on GameState so runs can be seeded and replayed.
export function nextRandom(state: GameState): number {
  state.rng = (state.rng + 0x6d2b79f5) | 0;
  let t = state.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function randomInt(state: GameState, maxExclusive: number): number {
  return Math.floor(nextRandom(state) * maxExclusive);
}

// Deterministic hash for scenery that must look the same every time it scrolls into view.
export function hash01(n: number): number {
  let t = (n * 0x9e3779b1) | 0;
  t = Math.imul(t ^ (t >>> 16), 0x85ebca6b);
  t = Math.imul(t ^ (t >>> 13), 0xc2b2ae35);
  return ((t ^ (t >>> 16)) >>> 0) / 4294967296;
}
