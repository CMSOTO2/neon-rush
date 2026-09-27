// Engine state lives on the UI thread as one mutable object. Enums are plain
// numeric constants so they copy cheaply into worklets; each is paired with a type of the
// same name, which is intentional.
/* eslint-disable @typescript-eslint/no-redeclare */

export const Phase = {
  Ready: 0,
  Running: 1,
  Crashing: 2,
  Over: 3,
} as const;
export type Phase = (typeof Phase)[keyof typeof Phase];

export const Action = {
  Left: 0,
  Right: 1,
  Jump: 2,
  Slide: 3,
} as const;
export type Action = (typeof Action)[keyof typeof Action];

export const ObstacleKind = {
  Barrier: 0,
  Gate: 1,
  Tram: 2,
} as const;
export type ObstacleKind = (typeof ObstacleKind)[keyof typeof ObstacleKind];

export const ParticleKind = {
  Dust: 0,
  Spark: 1,
  Star: 2,
} as const;

// Bit flags raised during a frame and forwarded to the JS thread once per frame.
export const GameEvent = {
  Jump: 1,
  Slide: 2,
  Lane: 4,
  Stumble: 8,
  Crash: 16,
  GameOver: 32,
  Land: 64,
  Start: 128,
} as const;

export type PlayerState = {
  lane: number;
  targetLane: number;
  prevLane: number;
  x: number;
  y: number;
  vy: number;
  grounded: boolean;
  sliding: boolean;
  slideTime: number;
  jumpBuffer: number;
  slideAfterLanding: boolean;
  // Animation clocks.
  runPhase: number;
  airTime: number;
  landSquash: number;
  stumbleTime: number;
  // Lateral velocity, used to lean into lane changes.
  vx: number;
  idleTime: number;
};

export type Obstacle = {
  active: boolean;
  kind: ObstacleKind;
  lane: number;
  // Near edge (toward the player) and far edge along the track.
  z0: number;
  z1: number;
  passed: boolean;
  // Stable per-obstacle random value for visual variety.
  seed: number;
};

export type Particle = {
  active: boolean;
  kind: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  size: number;
};

export type RunStats = {
  distance: number;
  score: number;
  jumps: number;
  slides: number;
  obstaclesPassed: number;
  stumbles: number;
};

export type GameState = {
  phase: Phase;
  paused: boolean;
  time: number;
  // Distance along the track; the player stands at z = distance.
  distance: number;
  speed: number;
  player: PlayerState;
  obstacles: Obstacle[];
  particles: Particle[];
  nextRowZ: number;
  safeLane: number;
  rowCount: number;
  // Scratch buffer for row generation (one entry per lane) so spawning never allocates.
  rowBuffer: number[];
  // Gameplay RNG (level generation) and a separate one for cosmetic effects, so particles
  // never change the obstacle layout of a seeded run.
  rng: number;
  fxRng: number;
  stats: RunStats;
  crashTime: number;
  shake: number;
  events: number;
  // Camera lateral position eases after the player.
  camX: number;
  viewport: { width: number; height: number };
  characterId: string;
};
