'worklet';

import { laneX, POOL_SIZES, POWER, START_LANE, WORLD } from '../config';
import { speedAt } from '../levels/difficulty';
import {
  MISSION_SLOTS,
  Phase,
  POWERUP_COUNT,
  type Coin,
  type GameState,
  type Obstacle,
  type Particle,
  type Pickup,
} from '../types';

function makeObstacle(): Obstacle {
  return { active: false, kind: 0, lane: 0, z0: 0, z1: 0, vz: 0, passed: false, seed: 0 };
}

function makeCoin(): Coin {
  return {
    active: false,
    x: 0,
    y: 0,
    z: 0,
    collected: false,
    collectTime: 0,
    magnet: false,
    seed: 0,
  };
}

function makePickup(): Pickup {
  return { active: false, kind: 0, lane: 0, y: 0, z: 0 };
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

// Joint values in a runner pose (see drawRunner.ts).
export const POSE_SIZE = 21;

function filled(n: number, v: number): number[] {
  const a: number[] = [];
  for (let i = 0; i < n; i++) a.push(v);
  return a;
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
  const coins: Coin[] = [];
  for (let i = 0; i < POOL_SIZES.coins; i++) coins.push(makeCoin());
  const pickups: Pickup[] = [];
  for (let i = 0; i < POOL_SIZES.pickups; i++) pickups.push(makePickup());
  const particles: Particle[] = [];
  for (let i = 0; i < POOL_SIZES.particles; i++) particles.push(makeParticle());

  const state: GameState = {
    phase: Phase.Ready,
    mode: 0,
    levelLength: 0,
    difficultyOffset: 0,
    difficultyScale: 1,
    coinsPlaced: 0,
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
      flying: false,
      runPhase: 0,
      airTime: 0,
      landSquash: 0,
      stumbleTime: 0,
      collectFlash: 0,
      vx: 0,
      lean: 0,
      idleTime: 0,
    },
    obstacles,
    coins,
    pickups,
    particles,
    nextRowZ: WORLD.firstRowDistance,
    safeLane: START_LANE,
    rowCount: 0,
    rowBuffer: filled(3, -1),
    prevRow: filled(3, -1),
    prevRow2: filled(3, -1),
    prevRowZ: 0,
    prevSafe: START_LANE,
    prevSafe2: START_LANE,
    nextPickupZ: POWER.firstPickup,
    power: filled(POWERUP_COUNT, 0),
    powerFull: filled(POWERUP_COUNT, 1),
    upgrades: filled(POWERUP_COUNT, 0),
    invuln: 0,
    scoreAcc: 0,
    rng: seed | 0,
    fxRng: (seed ^ 0x5bd1e995) | 0,
    stats: {
      distance: 0,
      score: 0,
      coins: 0,
      jumps: 0,
      slides: 0,
      obstaclesPassed: 0,
      stumbles: 0,
      powerUps: 0,
      cleanDistance: 0,
      bestCleanDistance: 0,
    },
    crashTime: 0,
    revives: 0,
    fell: false,
    shake: 0,
    events: 0,
    camX: 0,
    camLift: 0,
    menuLift: 1,
    tutorialStep: 0,
    tutorialHold: -1,
    tutorialClock: 0,
    tutorialMsg: 0,
    tutorialMsgTime: 0,
    reduceMotion: false,
    poseKind: -1,
    poseStart: 0,
    poseBlend: 0,
    pose: filled(POSE_SIZE, 0),
    poseFrom: filled(POSE_SIZE, 0),
    poseTarget: filled(POSE_SIZE, 0),
    chaser: { time: 0, age: 0, leaving: 0, x: 0, side: 1, caught: false },
    missionStat: filled(MISSION_SLOTS, -1),
    missionNeed: filled(MISSION_SLOTS, 0),
    missionText: ['', '', ''],
    missionDone: filled(MISSION_SLOTS, 0),
    missionToast: -1,
    missionToastTime: 0,
    missionQueue: 0,
    trailX: filled(14, 0),
    trailY: filled(14, 0),
    trailAt: 0,
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
  p.lean = 0;
  p.grounded = true;
  p.sliding = false;
  p.slideTime = 0;
  p.jumpBuffer = 0;
  p.slideAfterLanding = false;
  p.flying = false;
  p.airTime = 0;
  p.landSquash = 0;
  p.stumbleTime = 0;
  p.collectFlash = 0;
  p.idleTime = 0;

  for (let i = 0; i < state.obstacles.length; i++) state.obstacles[i].active = false;
  for (let i = 0; i < state.coins.length; i++) state.coins[i].active = false;
  for (let i = 0; i < state.pickups.length; i++) state.pickups[i].active = false;
  for (let i = 0; i < state.particles.length; i++) state.particles[i].active = false;
  for (let i = 0; i < state.power.length; i++) {
    state.power[i] = 0;
    state.powerFull[i] = 1;
  }
  for (let i = 0; i < 3; i++) {
    state.prevRow[i] = -1;
    state.prevRow2[i] = -1;
  }

  state.phase = phase;
  state.paused = false;
  // Back to endless defaults; startLevel overrides these.
  state.mode = 0;
  state.levelLength = 0;
  state.difficultyOffset = 0;
  state.difficultyScale = 1;
  state.coinsPlaced = 0;
  state.distance = 0;
  state.speed = phase === Phase.Running ? speedAt(0) : 0;
  state.nextRowZ = WORLD.firstRowDistance;
  state.safeLane = START_LANE;
  state.prevSafe = START_LANE;
  state.prevSafe2 = START_LANE;
  state.prevRowZ = 0;
  state.rowCount = 0;
  state.nextPickupZ = POWER.firstPickup;
  state.invuln = 0;
  state.scoreAcc = 0;
  state.rng = seed | 0;
  state.fxRng = (seed ^ 0x5bd1e995) | 0;
  state.crashTime = 0;
  state.revives = 0;
  state.fell = false;
  state.tutorialStep = 0;
  state.tutorialHold = -1;
  state.tutorialMsg = 0;
  state.tutorialMsgTime = 0;
  const ch = state.chaser;
  ch.time = 0;
  ch.age = 0;
  ch.leaving = 0;
  ch.caught = false;
  // Mission goals themselves come from setMissionGoals and outlive the reset.
  for (let i = 0; i < MISSION_SLOTS; i++) state.missionDone[i] = 0;
  state.missionToast = -1;
  state.missionToastTime = 0;
  state.missionQueue = 0;
  state.shake = 0;
  state.events = 0;
  state.camX = p.x;
  state.camLift = 0;
  state.trailAt = 0;
  for (let i = 0; i < state.trailX.length; i++) {
    state.trailX[i] = p.x;
    state.trailY[i] = 0;
  }

  const s = state.stats;
  s.distance = 0;
  s.score = 0;
  s.coins = 0;
  s.jumps = 0;
  s.slides = 0;
  s.obstaclesPassed = 0;
  s.stumbles = 0;
  s.powerUps = 0;
  s.cleanDistance = 0;
  s.bestCleanDistance = 0;
}
