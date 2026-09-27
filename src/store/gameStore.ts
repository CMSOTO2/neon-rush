import { create } from 'zustand';

import type { RunRewards } from '../progression/applyRun';
import type { RunSummary } from '../progression/missions';
import { useProfileStore } from './profileStore';

// UI-level game state. The simulation itself lives on the UI thread (see useGameLoop);
// this store only hears about phase changes and results, so React re-renders a handful
// of times per run rather than every frame.

export type UiPhase = 'ready' | 'running' | 'paused' | 'revive' | 'over';

export type RunResult = RunSummary;

type GameStore = {
  phase: UiPhase;
  lastRun: RunResult | null;
  rewards: RunRewards | null;
  // The run waiting on a continue decision, and how many continues it has used.
  pendingRun: RunResult | null;
  revivesUsed: number;
  setPhase: (phase: UiPhase) => void;
  offerRevive: (run: RunResult, revivesUsed: number) => void;
  finishRun: (run: RunResult) => void;
};

export const useGameStore = create<GameStore>((set) => ({
  phase: 'ready',
  lastRun: null,
  rewards: null,
  pendingRun: null,
  revivesUsed: 0,
  setPhase: (phase) => set({ phase }),
  offerRevive: (run, revivesUsed) => set({ phase: 'revive', pendingRun: run, revivesUsed }),
  finishRun: (run) => {
    const rewards = useProfileStore.getState().recordRun(run);
    set({ phase: 'over', lastRun: run, rewards, pendingRun: null });
  },
}));
