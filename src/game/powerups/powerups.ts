import { PowerUpKind } from '../types';

// Power-up registry. Adding a power-up means adding an entry here plus its effect in
// systems/powerUpSystem.ts; the spawner, HUD and upgrade shop read from this list.
export type PowerUpDef = {
  kind: PowerUpKind;
  id: string;
  name: string;
  description: string;
  color: string;
  // Duration in seconds at upgrade level 0, and the gain per level (5 levels).
  baseDuration: number;
  perLevel: number;
  // Relative chance of appearing as a pickup.
  weight: number;
};

export const MAX_UPGRADE_LEVEL = 5;

export const POWERUPS: PowerUpDef[] = [
  {
    kind: PowerUpKind.Magnet,
    id: 'magnet',
    name: 'Coin Magnet',
    description: 'Pulls in every coin nearby.',
    color: '#ff4f6d',
    baseDuration: 9,
    perLevel: 2.5,
    weight: 30,
  },
  {
    kind: PowerUpKind.Shield,
    id: 'shield',
    name: 'Shield',
    description: 'Absorbs one crash.',
    color: '#4fa8ff',
    baseDuration: 12,
    perLevel: 3,
    weight: 20,
  },
  {
    kind: PowerUpKind.Jetpack,
    id: 'jetpack',
    name: 'Jetpack',
    description: 'Fly over everything and grab sky coins.',
    color: '#ff9a3c',
    baseDuration: 6,
    perLevel: 1.5,
    weight: 15,
  },
  {
    kind: PowerUpKind.Multiplier,
    id: 'multiplier',
    name: '2x Score',
    description: 'Doubles every point you earn.',
    color: '#b36bff',
    baseDuration: 10,
    perLevel: 3,
    weight: 20,
  },
  {
    kind: PowerUpKind.Boost,
    id: 'boost',
    name: 'Speed Boost',
    description: 'Blast forward and smash through obstacles.',
    color: '#ffd84a',
    baseDuration: 4,
    perLevel: 1,
    weight: 15,
  },
];

export const POWERUP_WEIGHTS = POWERUPS.map((p) => p.weight);
export const POWERUP_BASE = POWERUPS.map((p) => p.baseDuration);
export const POWERUP_PER_LEVEL = POWERUPS.map((p) => p.perLevel);

export function durationFor(kind: number, level: number): number {
  'worklet';
  return POWERUP_BASE[kind] + POWERUP_PER_LEVEL[kind] * level;
}
