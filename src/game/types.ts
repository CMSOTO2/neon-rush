// Engine state lives on the UI thread as one mutable object. Enums are plain
// numeric constants so they copy cheaply into worklets; each is paired with a type of the
// same name, which is intentional.
/* eslint-disable @typescript-eslint/no-redeclare */

export const Phase = {
  Ready: 0,
  Running: 1,
  Crashing: 2,
  Over: 3,
  // Crossed the finish line in level mode.
  Complete: 4,
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
  // A hole in the road: jump it or change lanes.
  Gap: 3,
} as const;
export type ObstacleKind = (typeof ObstacleKind)[keyof typeof ObstacleKind];

export const ParticleKind = {
  Dust: 0,
  Spark: 1,
  Star: 2,
  Sparkle: 3,
  Flame: 4,
  Shard: 5,
} as const;

export const PowerUpKind = {
  Magnet: 0,
  Shield: 1,
  Jetpack: 2,
  Multiplier: 3,
  Boost: 4,
} as const;
export type PowerUpKind = (typeof PowerUpKind)[keyof typeof PowerUpKind];
export const POWERUP_COUNT = 5;

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
  Coin: 256,
  PowerUp: 512,
  ShieldBreak: 1024,
  Smash: 2048,
  Boost: 4096,
  Revive: 8192,
  LevelComplete: 16384,
  TutorialDone: 32768,
  MissionDone: 65536,
  // The chaser drone arrives (siren) or is shaken off.
  ChaserStart: 131072,
  ChaserLost: 262144,
} as const;

// Which run stat an active mission is measured by (see systems/missionSystem.ts).
export const MissionStat = {
  Coins: 0,
  Distance: 1,
  Jumps: 2,
  Slides: 3,
  PowerUps: 4,
  CleanDistance: 5,
  Score: 6,
} as const;
export type MissionStat = (typeof MissionStat)[keyof typeof MissionStat];
export const MISSION_SLOTS = 3;

export const GameMode = {
  Endless: 0,
  Level: 1,
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
  // Jetpack flight: the runner holds altitude instead of falling.
  flying: boolean;
  // Animation clocks.
  runPhase: number;
  airTime: number;
  landSquash: number;
  stumbleTime: number;
  collectFlash: number;
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
  // Oncoming trams drive toward the player (negative); everything else is 0.
  vz: number;
  passed: boolean;
  // Stable per-obstacle random value for visual variety.
  seed: number;
};

export type Coin = {
  active: boolean;
  x: number;
  y: number;
  z: number;
  // Time since collection; the coin pops for a moment before it is recycled.
  collected: boolean;
  collectTime: number;
  // Pulled toward the runner by the magnet.
  magnet: boolean;
  seed: number;
};

export type Pickup = {
  active: boolean;
  kind: PowerUpKind;
  lane: number;
  y: number;
  z: number;
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

// The security drone (systems/chaserSystem.ts). Everything is in seconds except x.
export type Chaser = {
  // Chase time left; 0 when it isn't chasing.
  time: number;
  // Time since it arrived, for the fly-in.
  age: number;
  // Fly-away time left after the chase ends or it's shaken off.
  leaving: number;
  // Lateral position; it trails the runner across lanes.
  x: number;
  // Which side of the runner it hovers on (-1 or 1).
  side: number;
  // True once it has caught the runner (the crash that ended the run).
  caught: boolean;
};

export type RunStats = {
  distance: number;
  score: number;
  coins: number;
  jumps: number;
  slides: number;
  obstaclesPassed: number;
  stumbles: number;
  powerUps: number;
  // Distance since the last collision, and the longest such stretch this run.
  cleanDistance: number;
  bestCleanDistance: number;
};

export type GameState = {
  phase: Phase;
  // Endless or a campaign level; levels have a finish line and their own difficulty.
  mode: number;
  levelLength: number;
  difficultyOffset: number;
  difficultyScale: number;
  // Coins laid out on the track this run (the level coin star is a share of these).
  coinsPlaced: number;
  paused: boolean;
  time: number;
  // Distance along the track; the player stands at z = distance.
  distance: number;
  speed: number;
  player: PlayerState;
  obstacles: Obstacle[];
  coins: Coin[];
  pickups: Pickup[];
  particles: Particle[];
  nextRowZ: number;
  safeLane: number;
  rowCount: number;
  // Scratch buffer for row generation (one entry per lane) so spawning never allocates.
  rowBuffer: number[];
  // The previous two rows (lane contents and safe lane) so later rows can stay fair.
  prevRow: number[];
  prevRow2: number[];
  prevRowZ: number;
  prevSafe: number;
  prevSafe2: number;
  nextPickupZ: number;
  // Power-up timers (seconds left) and the full duration for the HUD, by PowerUpKind.
  power: number[];
  powerFull: number[];
  // Upgrade level per PowerUpKind (0-5), supplied by the progression system.
  upgrades: number[];
  // Grace period after a shield break, boost or jetpack ends.
  invuln: number;
  // Score accumulates fractionally so the multiplier applies smoothly.
  scoreAcc: number;
  // Gameplay RNG (level generation) and a separate one for cosmetic effects, so particles
  // never change the obstacle layout of a seeded run.
  rng: number;
  fxRng: number;
  stats: RunStats;
  crashTime: number;
  // Continues used this run (each one costs more).
  revives: number;
  // True when the run ended by dropping into a gap rather than hitting something.
  fell: boolean;
  shake: number;
  events: number;
  // Camera lateral position eases after the player.
  camX: number;
  camLift: number;
  // Accessibility: suppress shake, speed lines and flashing effects.
  reduceMotion: boolean;
  // 1 while the main menu is up (scene framed higher), easing to 0 once a run starts.
  menuLift: number;
  // First-run tutorial (systems/tutorialSystem.ts). tutorialStep is the 1-based lesson
  // being taught (0 when off); tutorialHold is the Action the game is frozen waiting for,
  // or -1. The clock keeps running while frozen so the hint can animate.
  tutorialStep: number;
  tutorialHold: number;
  tutorialClock: number;
  // Short message after a lesson (TutorialMsg) and how long it stays up.
  tutorialMsg: number;
  tutorialMsgTime: number;
  chaser: Chaser;
  // The active missions, so the HUD can say the moment one is done. Per slot: the stat it
  // is measured by (-1 when it can't finish mid-run), the value this run needs, its text,
  // and 1 once it has finished this run.
  missionStat: number[];
  missionNeed: number[];
  missionText: string[];
  missionDone: number[];
  // The slot whose "Mission complete" toast is showing (-1 for none), how long it has
  // left, and a bitmask of slots waiting their turn.
  missionToast: number;
  missionToastTime: number;
  missionQueue: number;
  // Recent runner positions (newest first) for cosmetic trails.
  trailX: number[];
  trailY: number[];
  // Distance at which the trail was last sampled (every half meter).
  trailAt: number;
  viewport: { width: number; height: number };
  characterId: string;
};
