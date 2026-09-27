import { create } from 'zustand';

// UI-level game state. The simulation itself lives on the UI thread (see useGameLoop);
// this store only hears about phase changes and results, so React re-renders a handful
// of times per run rather than every frame.

export type UiPhase = 'ready' | 'running' | 'paused' | 'over';

export type RunResult = {
  score: number;
  distance: number;
  coins: number;
  jumps: number;
  slides: number;
  obstaclesPassed: number;
  stumbles: number;
  powerUps: number;
};

type GameStore = {
  phase: UiPhase;
  lastRun: RunResult | null;
  lastRunWasBest: boolean;
  bestScore: number;
  bestDistance: number;
  setPhase: (phase: UiPhase) => void;
  finishRun: (result: RunResult) => void;
};

export const useGameStore = create<GameStore>((set) => ({
  phase: 'ready',
  lastRun: null,
  lastRunWasBest: false,
  bestScore: 0,
  bestDistance: 0,
  setPhase: (phase) => set({ phase }),
  finishRun: (result) =>
    set((s) => {
      const isBest = result.score > s.bestScore;
      return {
        phase: 'over',
        lastRun: result,
        lastRunWasBest: isBest,
        bestScore: Math.max(s.bestScore, result.score),
        bestDistance: Math.max(s.bestDistance, Math.floor(result.distance)),
      };
    }),
}));
