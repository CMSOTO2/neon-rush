'worklet';

import { applyAction } from '../systems/playerSystem';
import { GameEvent, Phase, type Action, type GameState } from '../types';
import { resetRun } from './state';

export function startRun(state: GameState, seed: number): void {
  resetRun(state, Phase.Running, seed);
  state.events |= GameEvent.Start;
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
  applyAction(state, action);
}

// Returns this frame's event flags and clears them.
export function takeEvents(state: GameState): number {
  const ev = state.events;
  state.events = 0;
  return ev;
}
