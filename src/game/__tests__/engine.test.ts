/// <reference types="bun" />
import { describe, expect, test } from 'bun:test';

import { LANE_COUNT, laneX, OBSTACLES, POWER } from '../config';
import { autopilot } from './autopilot';
import { reviveRun, setUpgrades, startRun } from '../engine/controls';
import { createGameState, resetRun } from '../engine/state';
import { stepGame } from '../engine/update';
import { EMPTY, generateRow } from '../levels/patterns';
import { applyAction } from '../systems/playerSystem';
import { activatePowerUp } from '../systems/powerUpSystem';
import { placeCoin } from '../levels/coinPatterns';
import { Action, ObstacleKind, Phase, PowerUpKind, type GameState } from '../types';

const DT = 1 / 60;

function freshRun(seed = 1): GameState {
  const s = createGameState(390, 844, 'nova', seed);
  resetRun(s, Phase.Running, seed);
  // Hand-placed obstacles only: push generated rows far out of reach.
  s.nextRowZ = 1e9;
  return s;
}

function place(s: GameState, kind: ObstacleKind, lane: number, z: number, length = 0.45) {
  const o = s.obstacles.find((x) => !x.active)!;
  o.active = true;
  o.kind = kind;
  o.lane = lane;
  o.z0 = z;
  o.z1 = z + length;
  o.passed = false;
}

function runUntil(s: GameState, distance: number, onFrame?: (s: GameState) => void) {
  let guard = 0;
  while (s.distance < distance && s.phase === Phase.Running && guard++ < 100000) {
    onFrame?.(s);
    stepGame(s, DT);
  }
}

describe('obstacles', () => {
  test('running into a barrier crashes', () => {
    const s = freshRun();
    place(s, ObstacleKind.Barrier, 1, 20);
    runUntil(s, 30);
    expect(s.phase).toBe(Phase.Crashing);
  });

  test('jumping clears a barrier', () => {
    const s = freshRun();
    place(s, ObstacleKind.Barrier, 1, 20);
    let jumped = false;
    runUntil(s, 30, (st) => {
      if (!jumped && st.distance > 16) {
        applyAction(st, Action.Jump);
        jumped = true;
      }
    });
    expect(s.phase).toBe(Phase.Running);
    expect(s.stats.obstaclesPassed).toBe(1);
  });

  test('standing into a gate crashes, sliding under it does not', () => {
    const hit = freshRun();
    place(hit, ObstacleKind.Gate, 1, 20, 0.4);
    runUntil(hit, 30);
    expect(hit.phase).toBe(Phase.Crashing);

    const slid = freshRun();
    place(slid, ObstacleKind.Gate, 1, 20, 0.4);
    let slide = false;
    runUntil(slid, 30, (st) => {
      if (!slide && st.distance > 17) {
        applyAction(st, Action.Slide);
        slide = true;
      }
    });
    expect(slid.phase).toBe(Phase.Running);
  });

  test('jumping into a gate beam crashes', () => {
    const s = freshRun();
    place(s, ObstacleKind.Gate, 1, 20, 0.4);
    let jumped = false;
    runUntil(s, 30, (st) => {
      if (!jumped && st.distance > 16) {
        applyAction(st, Action.Jump);
        jumped = true;
      }
    });
    expect(s.phase).toBe(Phase.Crashing);
  });

  test('changing lanes into the side of a tram bounces back instead of crashing', () => {
    const s = freshRun();
    place(s, ObstacleKind.Tram, 0, 10, 9);
    let moved = false;
    runUntil(s, 25, (st) => {
      if (!moved && st.distance > 13) {
        applyAction(st, Action.Left);
        moved = true;
      }
    });
    expect(s.phase).toBe(Phase.Running);
    expect(s.stats.stumbles).toBe(1);
    expect(s.player.targetLane).toBe(1);
  });

  test('slamming down from a jump turns into a slide', () => {
    const s = freshRun();
    applyAction(s, Action.Jump);
    for (let i = 0; i < 6; i++) stepGame(s, DT);
    applyAction(s, Action.Slide);
    for (let i = 0; i < 20 && !s.player.grounded; i++) stepGame(s, DT);
    stepGame(s, DT);
    expect(s.player.grounded).toBe(true);
    expect(s.player.sliding).toBe(true);
  });

  test('lanes are clamped to the track', () => {
    const s = freshRun();
    for (let i = 0; i < 5; i++) applyAction(s, Action.Left);
    expect(s.player.targetLane).toBe(0);
    for (let i = 0; i < 5; i++) applyAction(s, Action.Right);
    expect(s.player.targetLane).toBe(LANE_COUNT - 1);
  });
});

describe('row generator', () => {
  test('always leaves a reachable lane that is not a tram', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const s = createGameState(390, 844, 'nova', seed);
      const row = [EMPTY, EMPTY, EMPTY];
      let prevSafe = s.safeLane;
      for (let i = 0; i < 400; i++) {
        const distance = i * 25;
        generateRow(s, distance, row);
        s.rowCount++;
        expect(row.some((k) => k !== EMPTY)).toBe(true);
        expect(row.every((k) => k === ObstacleKind.Tram)).toBe(false);
        expect(row[s.safeLane]).not.toBe(ObstacleKind.Tram);
        expect(Math.abs(s.safeLane - prevSafe)).toBeLessThanOrEqual(1);
        prevSafe = s.safeLane;
      }
    }
  });
});

describe('long runs', () => {
  test('a run keeps generating rows without exhausting the pool', () => {
    const s = createGameState(390, 844, 'nova', 7);
    resetRun(s, Phase.Running, 7);
    let maxActive = 0;
    // Invincible walk-through: reset phase after any crash to keep simulating.
    for (let i = 0; i < 60 * 60 * 5; i++) {
      stepGame(s, DT);
      if (s.phase !== Phase.Running) s.phase = Phase.Running;
      const active = s.obstacles.filter((o) => o.active).length;
      maxActive = Math.max(maxActive, active);
    }
    expect(s.distance).toBeGreaterThan(5000);
    expect(maxActive).toBeLessThan(s.obstacles.length);
    expect(s.rowCount).toBeGreaterThan(150);
  });
});

describe('fairness', () => {
  test('a simple bot survives 3000 m on every seed', () => {
    const failures: string[] = [];
    for (let seed = 1; seed <= 30; seed++) {
      const s = createGameState(390, 844, 'nova', seed);
      resetRun(s, Phase.Running, seed);
      let frames = 0;
      while (s.phase === Phase.Running && s.distance < 3000 && frames++ < 60 * 60 * 10) {
        autopilot(s);
        stepGame(s, DT);
      }
      if (s.phase !== Phase.Running)
        failures.push(`seed ${seed} crashed at ${Math.floor(s.distance)} m`);
    }
    expect(failures).toEqual([]);
  });
});

describe('coins and power-ups', () => {
  test('running through a coin collects it and adds score', () => {
    const s = freshRun();
    placeCoin(s, laneX(1), 0.75, 20);
    runUntil(s, 25);
    expect(s.stats.coins).toBe(1);
    expect(s.stats.score).toBeGreaterThanOrEqual(25 + 10);
  });

  test('coins in another lane are ignored without a magnet and pulled in with one', () => {
    const plain = freshRun();
    placeCoin(plain, laneX(0), 0.75, 20);
    runUntil(plain, 25);
    expect(plain.stats.coins).toBe(0);

    const magnet = freshRun();
    activatePowerUp(magnet, PowerUpKind.Magnet);
    placeCoin(magnet, laneX(0), 0.75, 20);
    runUntil(magnet, 25);
    expect(magnet.stats.coins).toBe(1);
  });

  test('a shield absorbs one crash, smashing the obstacle', () => {
    const s = freshRun();
    activatePowerUp(s, PowerUpKind.Shield);
    place(s, ObstacleKind.Barrier, 1, 20);
    place(s, ObstacleKind.Barrier, 1, 40);
    runUntil(s, 30);
    expect(s.phase).toBe(Phase.Running);
    expect(s.power[PowerUpKind.Shield]).toBe(0);
    runUntil(s, 45);
    expect(s.phase).toBe(Phase.Crashing);
  });

  test('the speed boost smashes through obstacles and speeds up', () => {
    const s = freshRun();
    activatePowerUp(s, PowerUpKind.Boost);
    place(s, ObstacleKind.Tram, 1, 30, OBSTACLES.tram.length);
    runUntil(s, 45);
    expect(s.phase).toBe(Phase.Running);
    expect(s.speed).toBeGreaterThan(13 * 1.3);
  });

  test('the jetpack flies over trams and lands safely after it ends', () => {
    const s = freshRun();
    activatePowerUp(s, PowerUpKind.Jetpack);
    for (let z = 20; z < 80; z += 12) place(s, ObstacleKind.Tram, 1, z, OBSTACLES.tram.length);
    runUntil(s, 40);
    expect(s.player.y).toBeGreaterThan(POWER.jetpackAltitude - 1);
    runUntil(s, 150);
    expect(s.phase).toBe(Phase.Running);
  });

  test('the multiplier doubles distance score', () => {
    const s = freshRun();
    activatePowerUp(s, PowerUpKind.Multiplier);
    runUntil(s, 50);
    expect(s.stats.score).toBeGreaterThanOrEqual(98);
  });
});

describe('gaps', () => {
  test('running into a gap falls, jumping it does not', () => {
    const fall = freshRun();
    place(fall, ObstacleKind.Gap, 1, 20, OBSTACLES.gap.length);
    runUntil(fall, 30);
    expect(fall.phase).toBe(Phase.Crashing);
    expect(fall.fell).toBe(true);

    const hop = freshRun();
    place(hop, ObstacleKind.Gap, 1, 20, OBSTACLES.gap.length);
    let jumped = false;
    runUntil(hop, 30, (st) => {
      if (!jumped && st.distance > 17) {
        applyAction(st, Action.Jump);
        jumped = true;
      }
    });
    expect(hop.phase).toBe(Phase.Running);
  });
});

describe('coin placement', () => {
  test('generated coins never sit inside an obstacle', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const s = createGameState(390, 844, 'nova', seed);
      resetRun(s, Phase.Running, seed);
      for (let i = 0; i < 60 * 60 * 3 && s.phase === Phase.Running; i++) {
        autopilot(s);
        stepGame(s, DT);
        if (i % 30 !== 0) continue;
        for (const c of s.coins) {
          if (!c.active || c.collected || c.magnet) continue;
          for (const o of s.obstacles) {
            if (!o.active || o.kind === ObstacleKind.Gap) continue;
            const hw = o.kind === ObstacleKind.Tram ? 1 : o.kind === ObstacleKind.Gate ? 1.1 : 1;
            const inX = Math.abs(c.x - laneX(o.lane)) < hw;
            const inZ = c.z > o.z0 - 0.2 && c.z < o.z1 + 0.2;
            const top = o.kind === ObstacleKind.Tram ? 2.6 : o.kind === ObstacleKind.Gate ? 2.3 : 1;
            const bottom = o.kind === ObstacleKind.Gate ? 1.2 : 0;
            if (inX && inZ && c.y > bottom && c.y < top) {
              throw new Error(
                `seed ${seed}: coin at z=${c.z.toFixed(1)} y=${c.y.toFixed(2)} inside kind ${o.kind}`,
              );
            }
          }
        }
      }
    }
  });
});

describe('revive and starting boost', () => {
  test('reviving clears the way and the run continues', () => {
    const s = freshRun();
    place(s, ObstacleKind.Barrier, 1, 20);
    place(s, ObstacleKind.Tram, 1, 30, OBSTACLES.tram.length);
    runUntil(s, 30);
    expect(s.phase).toBe(Phase.Crashing);
    for (let i = 0; i < 90; i++) stepGame(s, DT);
    expect(s.phase).toBe(Phase.Over);
    reviveRun(s);
    expect(s.phase).toBe(Phase.Running);
    expect(s.revives).toBe(1);
    runUntil(s, 60);
    expect(s.phase).toBe(Phase.Running);
  });

  test('the Starting Boost upgrade launches runs boosted without counting as a pickup', () => {
    const s = createGameState(390, 844, 'nova', 3);
    setUpgrades(s, [0, 0, 0, 0, 2]);
    startRun(s, 3);
    expect(s.power[PowerUpKind.Boost]).toBeGreaterThan(0);
    expect(s.stats.powerUps).toBe(0);
    setUpgrades(s, [0, 0, 0, 0, 0]);
    startRun(s, 3);
    expect(s.power[PowerUpKind.Boost]).toBe(0);
  });
});
