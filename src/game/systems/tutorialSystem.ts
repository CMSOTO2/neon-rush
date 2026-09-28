'worklet';

import { OBSTACLES, PLAYER } from '../config';
import { EMPTY } from '../levels/patterns';
import { Action, GameEvent, ObstacleKind, PowerUpKind, type GameState } from '../types';
import { applyAction } from './playerSystem';

// The first endless run teaches the three moves with scripted rows: a barrier to jump, a
// laser gate to slide under, then two trams to swerve around. Just before each row the
// game freezes on a hint until the player makes that move, so nobody loses a first run
// to not knowing the controls. After the last lesson, normal rows carry on.
const B = ObstacleKind.Barrier;
const G = ObstacleKind.Gate;
const T = ObstacleKind.Tram;
const LANE_LESSON = -1;

export const TUTORIAL = {
  rows: [
    // lead: how far ahead (in seconds of running) the game freezes for the move.
    { z: 45, lanes: [B, B, B], action: Action.Jump, lead: 0.2 },
    { z: 95, lanes: [G, G, G], action: Action.Slide, lead: 0.26 },
    { z: 145, lanes: [T, T, EMPTY], action: LANE_LESSON, lead: 0.75 },
  ],
  // The open lane in the tram row.
  freeLane: 2,
  // Normal rows start this far past the last lesson.
  resumeGap: 45,
  // How long the "NICE!" and "YOU'RE READY!" messages stay up.
  niceTime: 0.9,
  readyTime: 2,
};

export const TutorialMsg = { None: 0, Nice: 1, Ready: 2 } as const;

export function startTutorial(state: GameState): void {
  state.tutorialStep = 1;
  state.tutorialHold = -1;
  state.tutorialClock = 0;
  state.tutorialMsg = TutorialMsg.None;
  state.tutorialMsgTime = 0;
  // No Starting Boost: it would smash the lesson obstacles.
  state.power[PowerUpKind.Boost] = 0;
  state.nextRowZ = TUTORIAL.rows[0].z;
}

// Spawner hook: while lessons remain, writes the next scripted row into `out`, sets where
// the row after it goes, and returns true. Returns false once normal rows take over.
export function nextTutorialRow(state: GameState, out: number[]): boolean {
  const rows = TUTORIAL.rows;
  const i = state.rowCount;
  if (state.tutorialStep === 0 || i >= rows.length) return false;
  for (let lane = 0; lane < out.length; lane++) out[lane] = rows[i].lanes[lane];
  if (rows[i].action === LANE_LESSON) state.safeLane = TUTORIAL.freeLane;
  return true;
}

// Distance of the row after scripted row `index`.
export function afterTutorialRow(index: number): number {
  const rows = TUTORIAL.rows;
  return index + 1 < rows.length ? rows[index + 1].z : rows[index].z + TUTORIAL.resumeGap;
}

function praise(state: GameState): void {
  state.tutorialStep++;
  state.tutorialMsg = TutorialMsg.Nice;
  state.tutorialMsgTime = TUTORIAL.niceTime;
}

// Called every running frame. Freezes the game (tutorialHold) at each lesson unless the
// player is already doing the move, and wraps up once the last row is behind them.
export function updateTutorial(state: GameState, dt: number): void {
  state.tutorialClock += dt;
  if (state.tutorialMsgTime > 0) state.tutorialMsgTime = Math.max(0, state.tutorialMsgTime - dt);
  if (state.tutorialStep === 0 || state.tutorialHold >= 0) return;

  const rows = TUTORIAL.rows;
  if (state.tutorialStep > rows.length) {
    const last = rows[rows.length - 1];
    if (state.distance > last.z + OBSTACLES.tram.length + 2) {
      state.tutorialStep = 0;
      state.tutorialMsg = TutorialMsg.Ready;
      state.tutorialMsgTime = TUTORIAL.readyTime;
      state.events |= GameEvent.TutorialDone;
    }
    return;
  }

  const row = rows[state.tutorialStep - 1];
  const ahead = row.z - (state.distance + PLAYER.halfDepth);
  if (ahead > state.speed * row.lead) return;
  const p = state.player;
  let need = -1;
  if (row.action === Action.Jump) {
    if (p.grounded) need = Action.Jump;
  } else if (row.action === Action.Slide) {
    if (!p.sliding) need = Action.Slide;
  } else if (p.targetLane !== TUTORIAL.freeLane) {
    need = p.targetLane < TUTORIAL.freeLane ? Action.Right : Action.Left;
  }
  if (need < 0) praise(state);
  else state.tutorialHold = need;
}

// Input while frozen: only the move being taught unfreezes the game. The tram lesson can
// need two swipes if the runner starts two lanes away.
export function tutorialInput(state: GameState, action: Action): void {
  if (action !== state.tutorialHold) return;
  state.tutorialHold = -1;
  applyAction(state, action);
  const row = TUTORIAL.rows[state.tutorialStep - 1];
  if (row.action === LANE_LESSON && state.player.targetLane !== TUTORIAL.freeLane) {
    state.tutorialHold = action;
    return;
  }
  praise(state);
}
