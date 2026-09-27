import { create } from 'zustand';

import type { RunRewards } from '../progression/applyRun';
import { starsFor, type LevelDef, type StarResult } from '../progression/campaign';
import type { RunSummary } from '../progression/missions';
import { useProfileStore } from './profileStore';

// UI-level game state. The simulation itself lives on the UI thread (see useGameLoop);
// this store only hears about phase changes and results, so React re-renders a handful
// of times per run rather than every frame.

export type UiPhase = 'ready' | 'running' | 'paused' | 'revive' | 'over' | 'complete';

export type RunResult = RunSummary;

export type LevelResult = StarResult & { levelCoins: number; previousStars: number };

type GameStore = {
  phase: UiPhase;
  // The campaign level being played, or null for endless mode.
  level: LevelDef | null;
  // A level chosen on the level-select screen, started once the game screen is back.
  pendingLevel: LevelDef | null;
  lastRun: RunResult | null;
  rewards: RunRewards | null;
  levelResult: LevelResult | null;
  // The run waiting on a continue decision, and how many continues it has used.
  pendingRun: RunResult | null;
  revivesUsed: number;
  setPhase: (phase: UiPhase) => void;
  setLevel: (level: LevelDef | null) => void;
  requestLevel: (level: LevelDef) => void;
  offerRevive: (run: RunResult, revivesUsed: number) => void;
  finishRun: (run: RunResult) => void;
  completeLevel: (run: RunResult, coinsPlaced: number, revives: number) => void;
};

export const useGameStore = create<GameStore>((set, get) => ({
  phase: 'ready',
  level: null,
  pendingLevel: null,
  lastRun: null,
  rewards: null,
  levelResult: null,
  pendingRun: null,
  revivesUsed: 0,
  setPhase: (phase) => set({ phase }),
  setLevel: (level) => set({ level }),
  requestLevel: (level) => set({ pendingLevel: level }),
  offerRevive: (run, revivesUsed) => set({ phase: 'revive', pendingRun: run, revivesUsed }),
  finishRun: (run) => {
    const level = get().level;
    const profile = useProfileStore.getState();
    // A failed level still earns its coins and XP, with no stars.
    const rewards = level ? profile.recordLevel(level.id, run, 0).rewards : profile.recordRun(run);
    set({ phase: 'over', lastRun: run, rewards, levelResult: null, pendingRun: null });
  },
  completeLevel: (run, coinsPlaced, revives) => {
    const level = get().level;
    if (!level) return;
    const stars = starsFor(true, run.coins, coinsPlaced, run.stumbles, revives);
    const { rewards, levelCoins, previousStars } = useProfileStore
      .getState()
      .recordLevel(level.id, run, stars.stars);
    set({
      phase: 'complete',
      lastRun: run,
      rewards,
      levelResult: { ...stars, levelCoins, previousStars },
      pendingRun: null,
    });
  },
}));
