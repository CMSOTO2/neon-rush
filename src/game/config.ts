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
  // Oncoming trams drive toward the runner at this fraction of run speed.
  oncomingSpeedFactor: 0.35,
  // Hole in the road: jump it. The runner only falls if their feet are well inside it.
  gap: { halfWidth: 1.05, length: 2.6, fallMargin: 0.35 },
};

// Security drone called in by a side hit. A second side hit while it's chasing ends the
// run (a shield takes that hit instead); a boost or jetpack shakes it off.
export const CHASER = {
  // How long it chases after the side hit that called it.
  duration: 5,
  // Fly-in and fly-away animation times.
  enterTime: 0.35,
  leaveTime: 0.6,
  // Hover position relative to the runner: behind, above, and off to one side.
  // On screen this puts it above the runner's head and clear of the track ahead.
  back: 1.8,
  height: 3.3,
  side: 1.1,
  // How fast it follows the runner across lanes (exponential rate).
  followRate: 5,
  // The lunge when it catches the runner.
  catchTime: 0.3,
};

export const COINS = {
  spacing: 2.1,
  radius: 0.32,
  height: 0.75,
  value: 10,
  // How close (meters) the runner must be to grab a coin.
  pickupReachX: 0.85,
  pickupReachZ: 0.9,
  popTime: 0.28,
};

export const POWER = {
  pickupInterval: [260, 420] as const,
  firstPickup: 180,
  pickupReach: 1.1,
  magnetRange: 22,
  magnetPull: 32,
  jetpackAltitude: 5.4,
  jetpackRiseRate: 5,
  boostSpeedFactor: 1.7,
  multiplier: 2,
  // Grace after a shield break or when a jetpack/boost ends.
  graceTime: 1.2,
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
  coins: 220,
  pickups: 6,
  particles: 96,
};

export const laneX = (lane: number): number => {
  'worklet';
  return (lane - (LANE_COUNT - 1) / 2) * LANE_WIDTH;
};
