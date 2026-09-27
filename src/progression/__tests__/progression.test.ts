/// <reference types="bun" />
import { describe, expect, test } from 'bun:test';

import { applyRun } from '../applyRun';
import { applyRunToDaily, dailyFor } from '../daily';
import { reviveCost, upgradeCost } from '../economy';
import { levelFromXp, xpToNext } from '../levels';
import { applyRunToMissions, initialMissions, type Mission, type RunSummary } from '../missions';
import { defaultProfile, sanitizeProfile } from '../profile';

const run = (over: Partial<RunSummary> = {}): RunSummary => ({
  score: 500,
  distance: 400,
  coins: 30,
  jumps: 5,
  slides: 3,
  obstaclesPassed: 10,
  stumbles: 0,
  powerUps: 0,
  bestCleanDistance: 200,
  ...over,
});

const day = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
};

describe('economy and levels', () => {
  test('upgrade costs rise and stop at the max level', () => {
    expect(upgradeCost(0)).toBeLessThan(upgradeCost(1)!);
    expect(upgradeCost(5)).toBeNull();
    expect(reviveCost(0)).toBeLessThan(reviveCost(1)!);
    expect(reviveCost(2)).toBeNull();
  });

  test('levels follow the XP curve', () => {
    expect(levelFromXp(0).level).toBe(1);
    expect(levelFromXp(xpToNext(1)).level).toBe(2);
    expect(levelFromXp(xpToNext(1) - 1).level).toBe(1);
  });
});

describe('missions', () => {
  test('starts with three different missions', () => {
    const { missions } = initialMissions();
    expect(missions).toHaveLength(3);
    expect(new Set(missions.map((m) => m.kind)).size).toBe(3);
  });

  test('completed missions pay out and are replaced by a new one', () => {
    const missions: Mission[] = [
      { id: 'm0', kind: 'coinsInRun', target: 20, progress: 0, tier: 1, reward: 225, xp: 90 },
      { id: 'm1', kind: 'totalRuns', target: 3, progress: 1, tier: 1, reward: 225, xp: 90 },
      { id: 'm2', kind: 'jumpsInRun', target: 50, progress: 0, tier: 1, reward: 225, xp: 90 },
    ];
    const r = applyRunToMissions(missions, run({ coins: 25 }), 0, 3);
    expect(r.completed.map((m) => m.id)).toEqual(['m0']);
    expect(r.missions).toHaveLength(3);
    expect(r.missions.find((m) => m.id === 'm1')!.progress).toBe(2);
    expect(r.missions.find((m) => m.id === 'm2')!.progress).toBe(5);
    expect(r.serial).toBe(4);
    expect(new Set(r.missions.map((m) => m.kind)).size).toBe(3);
  });
});

describe('daily challenge', () => {
  test('is stable for a date and keeps the streak on consecutive days', () => {
    const a = dailyFor('2026-09-27', null);
    expect(dailyFor('2026-09-27', a)).toBe(a);
    const done = applyRunToDaily(
      a,
      run({
        coins: 9999,
        distance: 99999,
        jumps: 999,
        slides: 999,
        powerUps: 99,
        bestCleanDistance: 99999,
        score: 999999,
      }),
    );
    expect(done.justCompleted).toBe(true);
    expect(done.daily.streak).toBe(1);
    expect(dailyFor('2026-09-28', done.daily).streak).toBe(1);
    expect(dailyFor('2026-09-30', done.daily).streak).toBe(0);
  });
});

describe('save data', () => {
  test('garbage becomes a fresh profile', () => {
    for (const bad of [null, 42, 'x', [], { coins: 'lots' }]) {
      const p = sanitizeProfile(bad);
      expect(p.coins).toBe(0);
      expect(p.missions).toHaveLength(3);
      expect(p.loadout.character).toBe('nova');
    }
  });

  test('keeps valid fields and repairs invalid ones', () => {
    const p = sanitizeProfile({
      coins: 1234,
      upgrades: [9, -3, 2.4, 'x'],
      owned: ['blitz', 'not-a-thing'],
      loadout: { character: 'blitz', outfit: 'nova-midnight', trail: 'trail-fire' },
      settings: { music: false },
    });
    expect(p.coins).toBe(1234);
    expect(p.upgrades).toEqual([5, 0, 2, 0, 0]);
    expect(p.owned).toContain('blitz');
    expect(p.owned).not.toContain('not-a-thing');
    expect(p.loadout.character).toBe('blitz');
    // Outfit must belong to the character; unowned trail falls back.
    expect(p.loadout.outfit).toBe('blitz-default');
    expect(p.loadout.trail).toBe('trail-none');
    expect(p.settings).toEqual({ music: false, sfx: true, haptics: true, reduceMotion: false });
  });

  test('a saved profile survives a JSON round trip unchanged', () => {
    const p = defaultProfile(day('2026-09-27'));
    const back = sanitizeProfile(JSON.parse(JSON.stringify(p)), day('2026-09-27'));
    expect(back).toEqual(p);
  });
});

describe('applying a run', () => {
  test('adds coins, XP, lifetime stats and first achievements', () => {
    const p = defaultProfile(day('2026-09-27'));
    const { profile, rewards } = applyRun(p, run({ coins: 40, distance: 1200 }), day('2026-09-27'));
    expect(profile.life.runs).toBe(1);
    expect(profile.coins).toBeGreaterThanOrEqual(40);
    expect(rewards.achievementsUnlocked.map((a) => a.id)).toContain('first-run');
    expect(rewards.achievementsUnlocked.map((a) => a.id)).toContain('run-1000');
    expect(profile.xp).toBeGreaterThan(0);
    expect(rewards.newBestScore).toBe(true);
  });

  test('reaching a level unlocks level-gated cosmetics', () => {
    const p = { ...defaultProfile(day('2026-09-27')), xp: 1e6 };
    const { profile, rewards } = applyRun(p, run(), day('2026-09-27'));
    expect(rewards.newlyOwned).toContain('juno');
    expect(profile.owned).toContain('juno');
  });
});
