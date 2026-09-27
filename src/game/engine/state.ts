'worklet';

import { laneX, POOL_SIZES, START_LANE, WORLD } from '../config';
import { speedAt } from '../levels/difficulty';
import { Phase, type GameState, type Obstacle, type Particle } from '../types';

function makeObstacle(): Obstacle {
  return { active: false, kind: 0, lane: 0, z0: 0, z1: 0, passed: false, seed: 0 };
}

function makeParticle(): Particle {
  return {
    active: false,
    kind: 0,
    x: 0,
    y: 0,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    life: 0,
    maxLife: 1,
    size: 1,
  };
}

// Allocates every pooled object once; runs reuse them through resetRun.
export function createGameState(
  width: number,
  height: number,
  characterId: string,
  seed: number,
): GameState {
  const obstacles: Obstacle[] = [];
  for (let i = 0; i < POOL_SIZES.obstacles; i++) obstacles.push(makeObstacle());
  const particles: Particle[] = [];
  for (let i = 0; i < POOL_SIZES.particles; i++) particles.push(makeParticle());

  const state: GameState = {
    phase: Phase.Ready,
    paused: false,
    time: 0,
    distance: 0,
    speed: 0,
    player: {
      lane: START_LANE,
      targetLane: START_LANE,
      prevLane: START_LANE,
      x: laneX(START_LANE),
      y: 0,
      vy: 0,
      grounded: true,
      sliding: false,
      slideTime: 0,
      jumpBuffer: 0,
      slideAfterLanding: false,
      runPhase: 0,
      airTime: 0,
      landSquash: 0,
      stumbleTime: 0,
      vx: 0,
      idleTime: 0,
    },
    obstacles,
    particles,
    nextRowZ: WORLD.firstRowDistance,
    safeLane: START_LANE,
    rowCount: 0,
    rowBuffer: [-1, -1, -1],
    rng: seed | 0,
    stats: { distance: 0, score: 0, jumps: 0, slides: 0, obstaclesPassed: 0, stumbles: 0 },
    crashTime: 0,
    shake: 0,
    events: 0,
    camX: 0,
    viewport: { width, height },
    characterId,
  };
  return state;
}

// Puts the run back at the start line without allocating.
export function resetRun(state: GameState, phase: Phase, seed: number): void {
  const p = state.player;
  p.lane = START_LANE;
  p.targetLane = START_LANE;
  p.prevLane = START_LANE;
  p.x = laneX(START_LANE);
  p.y = 0;
  p.vy = 0;
  p.vx = 0;
  p.grounded = true;
  p.sliding = false;
  p.slideTime = 0;
  p.jumpBuffer = 0;
  p.slideAfterLanding = false;
  p.airTime = 0;
  p.landSquash = 0;
  p.stumbleTime = 0;
  p.idleTime = 0;

  for (let i = 0; i < state.obstacles.length; i++) state.obstacles[i].active = false;
  for (let i = 0; i < state.particles.length; i++) state.particles[i].active = false;

  state.phase = phase;
  state.paused = false;
  state.distance = 0;
  state.speed = phase === Phase.Running ? speedAt(0) : 0;
  state.nextRowZ = WORLD.firstRowDistance;
  state.safeLane = START_LANE;
  state.rowCount = 0;
  state.rng = seed | 0;
  state.crashTime = 0;
  state.shake = 0;
  state.events = 0;
  state.camX = p.x;

  const s = state.stats;
  s.distance = 0;
  s.score = 0;
  s.jumps = 0;
  s.slides = 0;
  s.obstaclesPassed = 0;
  s.stumbles = 0;
}
