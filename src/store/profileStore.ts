import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, type PersistStorage, type StorageValue } from 'zustand/middleware';

import { setSfxEnabled } from '../audio/sfx';
import { applyRun, type RunRewards } from '../progression/applyRun';
import { cosmetic, type CosmeticSlot, type Loadout } from '../progression/cosmetics';
import { dailyFor, todayKey } from '../progression/daily';
import { upgradeCost } from '../progression/economy';
import type { RunSummary } from '../progression/missions';
import {
  defaultProfile,
  migrate,
  SAVE_VERSION,
  sanitizeProfile,
  type Profile,
  type Settings,
} from '../progression/profile';

const SAVE_KEY = 'neon-rush-save';

type Persisted = { profile: Profile };

// JSON storage that never throws: an unreadable save is copied aside (so it can be
// recovered by hand) and the game starts from a fresh profile instead of crashing.
const storage: PersistStorage<Persisted> = {
  getItem: async (name) => {
    const raw = await AsyncStorage.getItem(name).catch(() => null);
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as StorageValue<Persisted>;
    } catch {
      await AsyncStorage.setItem(`${name}-corrupt-${Date.now()}`, raw).catch(() => {});
      return null;
    }
  },
  setItem: async (name, value) => {
    await AsyncStorage.setItem(name, JSON.stringify(value)).catch(() => {});
  },
  removeItem: async (name) => {
    await AsyncStorage.removeItem(name).catch(() => {});
  },
};

type ProfileStore = {
  profile: Profile;
  hydrated: boolean;
  recordRun: (run: RunSummary) => RunRewards;
  spendCoins: (amount: number) => boolean;
  buyUpgrade: (kind: number) => boolean;
  buyCosmetic: (id: string) => boolean;
  equip: (slot: CosmeticSlot, id: string) => void;
  setSetting: (key: keyof Settings, value: boolean) => void;
  refreshDaily: () => void;
  resetProgress: () => void;
};

export const useProfileStore = create<ProfileStore>()(
  persist(
    (set, get) => ({
      profile: defaultProfile(),
      hydrated: false,

      recordRun: (run) => {
        const { profile, rewards } = applyRun(get().profile, run);
        set({ profile });
        return rewards;
      },

      spendCoins: (amount) => {
        const p = get().profile;
        if (p.coins < amount) return false;
        set({ profile: { ...p, coins: p.coins - amount } });
        return true;
      },

      buyUpgrade: (kind) => {
        const p = get().profile;
        const cost = upgradeCost(p.upgrades[kind]);
        if (cost === null || p.coins < cost) return false;
        const upgrades = [...p.upgrades];
        upgrades[kind]++;
        set({ profile: { ...p, coins: p.coins - cost, upgrades } });
        return true;
      },

      buyCosmetic: (id) => {
        const p = get().profile;
        const item = cosmetic(id);
        if (!item || p.owned.includes(id) || item.unlock.type !== 'coins') return false;
        if (p.coins < item.unlock.cost) return false;
        set({ profile: { ...p, coins: p.coins - item.unlock.cost, owned: [...p.owned, id] } });
        return true;
      },

      equip: (slot, id) => {
        const p = get().profile;
        const item = cosmetic(id);
        if (!item || item.slot !== slot || !p.owned.includes(id)) return;
        const loadout: Loadout = { ...p.loadout, [slot]: id };
        // Switching character resets the outfit to that character's default look.
        if (slot === 'character') loadout.outfit = `${id}-default`;
        set({ profile: { ...p, loadout } });
      },

      setSetting: (key, value) => {
        const p = get().profile;
        if (key === 'sfx') setSfxEnabled(value);
        set({ profile: { ...p, settings: { ...p.settings, [key]: value } } });
      },

      refreshDaily: () => {
        const p = get().profile;
        const daily = dailyFor(todayKey(), p.daily);
        if (daily !== p.daily) set({ profile: { ...p, daily } });
      },

      resetProgress: () => set({ profile: defaultProfile() }),
    }),
    {
      name: SAVE_KEY,
      version: SAVE_VERSION,
      storage,
      partialize: (s) => ({ profile: s.profile }),
      migrate: (saved, version) => migrate(saved, version) as Persisted,
      // Whatever was loaded is validated field by field before the game sees it.
      merge: (saved, current) => ({
        ...current,
        profile: sanitizeProfile((saved as Partial<Persisted> | undefined)?.profile),
      }),
      onRehydrateStorage: () => (state) => {
        useProfileStore.setState({ hydrated: true });
        if (state) setSfxEnabled(state.profile.settings.sfx);
      },
    },
  ),
);
