import { describe, expect, test } from 'bun:test';

import { LANE_COUNT } from '../config';
import { createGameState, resetRun } from '../engine/state';
import { stepGame } from '../engine/update';
import { EMPTY, generateRow } from '../levels/patterns';
import { applyAction } from '../systems/playerSystem';
import { Action, ObstacleKind, Phase, type GameState } from '../types';

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
