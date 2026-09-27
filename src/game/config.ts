// Gameplay tunables. World units are meters; time is seconds.
// Anything that shapes difficulty over distance lives in levels/difficulty.ts.

export const LANE_COUNT = 3;
export const LANE_WIDTH = 2.4;
export const START_LANE = 1;

export const PLAYER = {
  halfWidth: 0.35,
  halfDepth: 0.3,
  standHeight: 1.7,
  slideHeight: 0.8,
  // Exponential approach rate toward the target lane (higher = snappier).
  laneChangeRate: 22,
  // Jump: apex ~1.9m, ~0.62s airtime regardless of run speed.
  jumpVelocity: 12.3,
  gravity: 39.5,
  // Swiping down in the air slams the runner to the ground, then slides.
  fastFallVelocity: -22,
  slideDuration: 0.62,
  // A jump swiped just before landing fires on touchdown.
  jumpBufferTime: 0.18,
  landSquashTime: 0.12,
  stumbleTime: 0.45,
};

export const OBSTACLES = {
  // Low energy barrier: jump over it.
  barrier: { halfWidth: 1.0, height: 1.0, depth: 0.45 },
  // Laser gate: slide under the beam.
  gate: { halfWidth: 1.1, beamBottom: 1.2, beamTop: 2.3, depth: 0.4 },
  // Mag-tram: blocks the whole lane, change lanes.
  tram: { halfWidth: 1.0, height: 2.6, length: 9 },
};

export const WORLD = {
  // How far ahead rows are generated and drawn.
  spawnAhead: 130,
  drawDistance: 150,
  // Distance before the first obstacle row on a fresh run.
  firstRowDistance: 55,
  // Collision checks move at most this far per substep so fast runs can't tunnel.
  maxSubstepDistance: 0.25,
  // Frames slower than this are simulated in slow motion instead of skipping ahead.
  maxFrameDt: 1 / 20,
  // How long the crash animation plays before the game-over screen appears.
  crashDuration: 1.0,
};

export const POOL_SIZES = {
  obstacles: 48,
  particles: 64,
};

export const laneX = (lane: number): number => {
  'worklet';
  return (lane - (LANE_COUNT - 1) / 2) * LANE_WIDTH;
};
