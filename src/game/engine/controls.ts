'worklet';

import { applyAction } from '../systems/playerSystem';
import { speedAt } from '../levels/difficulty';
import { clearChaser } from '../systems/chaserSystem';
import { activatePowerUp } from '../systems/powerUpSystem';
import { tutorialInput } from '../systems/tutorialSystem';
import { GameEvent, GameMode, Phase, PowerUpKind, type Action, type GameState } from '../types';
import { resetRun } from './state';

export function startRun(state: GameState, seed: number): void {
  resetRun(state, Phase.Running, seed);
  state.events |= GameEvent.Start;
  // The Starting Boost upgrade launches every run with a speed boost.
  if (state.upgrades[PowerUpKind.Boost] > 0) activatePowerUp(state, PowerUpKind.Boost, false);
}

// Starts a campaign level: fixed seed, finish line, and its own difficulty curve.
export function startLevel(
  state: GameState,
  seed: number,
  length: number,
  difficultyOffset: number,
  difficultyScale: number,
): void {
  resetRun(state, Phase.Running, seed);
  state.mode = GameMode.Level;
  state.levelLength = length;
  state.difficultyOffset = difficultyOffset;
  state.difficultyScale = difficultyScale;
  state.speed = speedAt(difficultyOffset);
  state.events |= GameEvent.Start;
  if (state.upgrades[PowerUpKind.Boost] > 0) activatePowerUp(state, PowerUpKind.Boost, false);
}

// Upgrade levels come from the saved profile; they apply from the next run.
export function setUpgrades(state: GameState, levels: number[]): void {
  for (let i = 0; i < state.upgrades.length; i++) state.upgrades[i] = levels[i] ?? 0;
}

// Continue after a crash: clear the way ahead, give a moment of grace, keep going.
export function reviveRun(state: GameState): void {
  if (state.phase !== Phase.Over && state.phase !== Phase.Crashing) return;
  const d = state.distance;
  for (let i = 0; i < state.obstacles.length; i++) {
    const o = state.obstacles[i];
    if (o.active && o.z1 > d - 3 && o.z0 < d + 35) o.active = false;
  }
  const p = state.player;
  p.y = 0;
  p.vy = 0;
  p.grounded = true;
  p.sliding = false;
  p.flying = false;
  p.stumbleTime = 0;
  p.targetLane = p.lane;
  for (let i = 0; i < state.power.length; i++) state.power[i] = 0;
  state.phase = Phase.Running;
  state.crashTime = 0;
  state.fell = false;
  state.revives++;
  state.invuln = 2.5;
  state.speed = speedAt(state.difficultyOffset + d * state.difficultyScale) * 0.8;
  state.stats.cleanDistance = 0;
  clearChaser(state);
  state.events |= GameEvent.Revive;
}

export function returnToReady(state: GameState, seed: number): void {
  resetRun(state, Phase.Ready, seed);
}

export function setPaused(state: GameState, paused: boolean): void {
  if (state.phase === Phase.Running || state.phase === Phase.Crashing) state.paused = paused;
}

// Single entry point for player input. From the title screen any swipe starts a run.
export function handleInput(state: GameState, action: Action, seed: number): void {
  if (state.phase === Phase.Ready) {
    startRun(state, seed);
    return;
  }
  if (state.tutorialHold >= 0) {
    tutorialInput(state, action);
    return;
  }
  applyAction(state, action);
}

// Returns this frame's event flags and clears them.
export function takeEvents(state: GameState): number {
  const ev = state.events;
  state.events = 0;
  return ev;
}
