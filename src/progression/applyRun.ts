import { newlyUnlocked, type AchievementDef } from './achievements';
import { autoUnlocks } from './cosmetics';
import { applyRunToDaily, dailyFor, todayKey } from './daily';
import { levelFromXp, levelUpReward, runXp } from './levels';
import { applyRunToMissions, type Mission, type RunSummary } from './missions';
import type { Profile } from './profile';

export type RunRewards = {
  coinsFromRun: number;
  bonusCoins: number;
  xpEarned: number;
  levelBefore: number;
  levelAfter: number;
  missionsCompleted: Mission[];
  achievementsUnlocked: AchievementDef[];
  dailyCompleted: boolean;
  dailyReward: number;
  newlyOwned: string[];
  newBestScore: boolean;
  newBestDistance: boolean;
};

// Folds one finished run into the profile: coins, XP and levels, missions, the daily
// challenge, lifetime stats, achievements, and any cosmetics those unlock. Pure, so the
// whole progression loop is unit-testable.
// Level runs count toward coins, XP, missions and achievements, but best score and
// distance records are for endless mode only.
export function applyRun(
  profile: Profile,
  run: RunSummary,
  now: Date = new Date(),
  endless = true,
): { profile: Profile; rewards: RunRewards } {
  const levelBefore = levelFromXp(profile.xp).level;

  const m = applyRunToMissions(
    profile.missions,
    run,
    profile.life.missionsCompleted,
    profile.missionSerial,
  );
  const missionCoins = m.completed.reduce((s, x) => s + x.reward, 0);
  const missionXp = m.completed.reduce((s, x) => s + x.xp, 0);

  const d = applyRunToDaily(dailyFor(todayKey(now), profile.daily), run);

  const life = {
    runs: profile.life.runs + 1,
    totalDistance: profile.life.totalDistance + Math.floor(run.distance),
    totalCoins: profile.life.totalCoins + run.coins,
    totalPowerUps: profile.life.totalPowerUps + run.powerUps,
    missionsCompleted: m.completedCount,
    dailiesCompleted: profile.life.dailiesCompleted + (d.justCompleted ? 1 : 0),
    bestScore: endless ? Math.max(profile.life.bestScore, run.score) : profile.life.bestScore,
    bestDistance: endless
      ? Math.max(profile.life.bestDistance, Math.floor(run.distance))
      : profile.life.bestDistance,
  };

  let xp = profile.xp + runXp(run.distance, run.coins) + missionXp;
  let levelAfter = levelFromXp(xp).level;

  const achievements = newlyUnlocked(profile.achievements, run, life, levelAfter);
  const achievementCoins = achievements.reduce((s, a) => s + a.reward, 0);
  // Achievements also grant a little XP, which can itself complete "reach level" ones.
  xp += achievements.length * 50;
  levelAfter = levelFromXp(xp).level;
  const lateAchievements = newlyUnlocked(
    [...profile.achievements, ...achievements.map((a) => a.id)],
    run,
    life,
    levelAfter,
  );
  const allAchievements = [...achievements, ...lateAchievements];

  let levelCoins = 0;
  for (let l = levelBefore + 1; l <= levelAfter; l++) levelCoins += levelUpReward(l);

  const achievementIds = [...profile.achievements, ...allAchievements.map((a) => a.id)];
  const newlyOwned = autoUnlocks(levelAfter, achievementIds, profile.owned);

  const bonusCoins =
    missionCoins +
    achievementCoins +
    lateAchievements.reduce((s, a) => s + a.reward, 0) +
    levelCoins +
    d.reward;

  return {
    profile: {
      ...profile,
      coins: profile.coins + run.coins + bonusCoins,
      xp,
      missions: m.missions,
      missionSerial: m.serial,
      daily: d.daily,
      life,
      achievements: achievementIds,
      owned: [...profile.owned, ...newlyOwned],
    },
    rewards: {
      coinsFromRun: run.coins,
      bonusCoins,
      xpEarned: xp - profile.xp,
      levelBefore,
      levelAfter,
      missionsCompleted: m.completed,
      achievementsUnlocked: allAchievements,
      dailyCompleted: d.justCompleted,
      dailyReward: d.reward,
      newlyOwned,
      newBestScore: endless && run.score > profile.life.bestScore,
      newBestDistance: endless && Math.floor(run.distance) > profile.life.bestDistance,
    },
  };
}
