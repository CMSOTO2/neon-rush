'worklet';

import { GameEvent, MISSION_SLOTS, MissionStat, Phase, type GameState } from '../types';

// Missions are paid out when the run ends (progression/applyRun.ts), but the player hears
// about each one the moment it's done: the engine knows the active goals, checks them
// every frame and queues a toast for the HUD.

export const MISSION_TOAST = {
  // Seconds on screen, and the fade at each end.
  duration: 2.4,
  fadeIn: 0.2,
  fadeOut: 0.35,
};

function statValue(state: GameState, stat: number): number {
  const s = state.stats;
  switch (stat) {
    case MissionStat.Coins:
      return s.coins;
    case MissionStat.Distance:
      return s.distance;
    case MissionStat.Jumps:
      return s.jumps;
    case MissionStat.Slides:
      return s.slides;
    case MissionStat.PowerUps:
      return s.powerUps;
    case MissionStat.CleanDistance:
      return s.bestCleanDistance;
    case MissionStat.Score:
      return s.score;
  }
  return 0;
}

function nextToast(state: GameState): void {
  state.missionToast = -1;
  for (let i = 0; i < MISSION_SLOTS; i++) {
    if (state.missionQueue & (1 << i)) {
      state.missionQueue &= ~(1 << i);
      state.missionToast = i;
      state.missionToastTime = MISSION_TOAST.duration;
      return;
    }
  }
}

// Set before each run from the saved missions. stat is a MissionStat or -1 for goals that
// only resolve at the end (like "play 3 runs"); need is what this run must reach.
export function setMissionGoals(
  state: GameState,
  stats: number[],
  needs: number[],
  texts: string[],
): void {
  for (let i = 0; i < MISSION_SLOTS; i++) {
    state.missionStat[i] = stats[i] ?? -1;
    state.missionNeed[i] = needs[i] ?? 0;
    state.missionText[i] = texts[i] ?? '';
  }
}

export function updateMissions(state: GameState, dt: number): void {
  if (state.phase === Phase.Running) {
    for (let i = 0; i < MISSION_SLOTS; i++) {
      const stat = state.missionStat[i];
      if (stat < 0 || state.missionDone[i] === 1) continue;
      if (statValue(state, stat) < state.missionNeed[i]) continue;
      state.missionDone[i] = 1;
      state.missionQueue |= 1 << i;
      state.events |= GameEvent.MissionDone;
    }
  }
  if (state.missionToast >= 0) {
    state.missionToastTime -= dt;
    if (state.missionToastTime <= 0) nextToast(state);
  } else if (state.missionQueue !== 0) {
    nextToast(state);
  }
}
