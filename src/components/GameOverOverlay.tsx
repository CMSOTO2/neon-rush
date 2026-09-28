import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, FadeInDown, ZoomIn } from 'react-native-reanimated';

import { FONTS } from '../constants/fonts';
import { UI } from '../constants/palette';
import type { RunRewards } from '../progression/applyRun';
import type { LevelDef } from '../progression/campaign';
import { cosmetic } from '../progression/cosmetics';
import { missionText } from '../progression/missions';
import type { RunResult } from '../store/gameStore';
import { useProfileStore } from '../store/profileStore';
import { CoinIcon } from './ui/CoinPill';
import { LevelBadge } from './ui/LevelBadge';
import { NeonButton } from './NeonButton';
import { Panel, usePanelCompact } from './Panel';

type Props = {
  result: RunResult;
  rewards: RunRewards | null;
  // Set when a campaign level was failed.
  level?: LevelDef | null;
  onRestart: () => void;
  onMenu: () => void;
};

type Line = { icon: ComponentProps<typeof Ionicons>['name']; text: string; color: string };

function rewardLines(r: RunRewards): Line[] {
  const lines: Line[] = [];
  if (r.levelAfter > r.levelBefore) {
    lines.push({
      icon: 'arrow-up-circle',
      text: `Level up! Now level ${r.levelAfter}`,
      color: UI.accentHot,
    });
  }
  if (r.dailyCompleted) {
    lines.push({ icon: 'flame', text: `Daily challenge done  +${r.dailyReward}`, color: UI.gold });
  }
  for (const m of r.missionsCompleted) {
    lines.push({ icon: 'flag', text: `${missionText(m)}  +${m.reward}`, color: UI.accent });
  }
  for (const a of r.achievementsUnlocked) {
    lines.push({ icon: 'trophy', text: `${a.name}  +${a.reward}`, color: UI.gold });
  }
  for (const id of r.newlyOwned) {
    const item = cosmetic(id);
    if (item) lines.push({ icon: 'gift', text: `Unlocked ${item.name}`, color: UI.accentHot });
  }
  return lines;
}

export function GameOverOverlay({ result, rewards, level, onRestart, onMenu }: Props) {
  const xp = useProfileStore((s) => s.profile.xp);
  const best = useProfileStore((s) => s.profile.life.bestScore);
  const compact = usePanelCompact();
  const lines = rewards ? rewardLines(rewards) : [];
  const shown = lines.slice(0, compact ? 3 : 4);

  return (
    <Panel title={level ? `LEVEL ${level.number}` : 'CRASHED!'} titleColor={UI.accentHot}>
      {level && (
        <View style={styles.scoreBlock}>
          <Text style={styles.scoreLabel}>SO CLOSE! YOU MADE IT</Text>
          <Text style={[styles.score, compact && styles.scoreCompact]} maxFontSizeMultiplier={1}>
            {Math.min(99, Math.floor((result.distance / level.length) * 100))}%
          </Text>
        </View>
      )}
      <View style={[styles.scoreBlock, level ? styles.hidden : null]}>
        <Text style={styles.scoreLabel}>SCORE</Text>
        <Text style={[styles.score, compact && styles.scoreCompact]} maxFontSizeMultiplier={1}>
          {result.score.toLocaleString()}
        </Text>
        {rewards?.newBestScore ? (
          <Animated.View
            entering={ZoomIn.delay(250).duration(220).easing(Easing.out(Easing.cubic))}
          >
            <View style={styles.badge}>
              <Text style={styles.badgeText}>NEW BEST!</Text>
            </View>
          </Animated.View>
        ) : (
          <Text style={styles.bestLine}>Best {best.toLocaleString()}</Text>
        )}
      </View>

      <View style={styles.stats}>
        <Stat label="Distance" value={`${Math.floor(result.distance)} m`} />
        <Stat label="Coins" value={String(result.coins)} color={UI.gold} />
        <Stat label="Dodged" value={String(result.obstaclesPassed)} />
      </View>

      {rewards && (
        <View style={styles.earned}>
          <CoinIcon size={20} />
          <Text style={styles.earnedText}>
            +{(rewards.coinsFromRun + rewards.bonusCoins).toLocaleString()}
          </Text>
          <Text style={styles.xpText}>+{rewards.xpEarned} XP</Text>
          <View style={styles.flex} />
          <LevelBadge xp={xp} />
        </View>
      )}

      {shown.map((line, i) => (
        <Animated.View
          key={`${line.text}-${i}`}
          entering={FadeInDown.delay(200 + i * 120)}
          style={styles.line}
        >
          <Ionicons name={line.icon} size={18} color={line.color} />
          <Text style={styles.lineText} numberOfLines={1}>
            {line.text}
          </Text>
        </Animated.View>
      ))}
      {lines.length > shown.length && (
        <Text style={styles.more}>+{lines.length - shown.length} more</Text>
      )}

      <NeonButton label={level ? 'RETRY' : 'RUN AGAIN'} onPress={onRestart} />
      <NeonButton label="MENU" variant="secondary" onPress={onMenu} />
    </Panel>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, color ? { color } : null]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scoreBlock: { alignItems: 'center' },
  hidden: { display: 'none' },
  scoreLabel: { fontFamily: FONTS.semibold, fontSize: 14, color: UI.textDim, letterSpacing: 3 },
  score: { fontFamily: FONTS.bold, fontSize: 54, color: UI.text, lineHeight: 60 },
  scoreCompact: { fontSize: 44, lineHeight: 50 },
  bestLine: { fontFamily: FONTS.medium, fontSize: 16, color: UI.textDim },
  badge: {
    backgroundColor: UI.gold,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 12,
    transform: [{ rotate: '-3deg' }],
  },
  badgeText: { fontFamily: FONTS.bold, fontSize: 16, color: '#2a1640', letterSpacing: 2 },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(123, 92, 255, 0.14)',
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontFamily: FONTS.bold, fontSize: 20, color: UI.accent },
  statLabel: { fontFamily: FONTS.medium, fontSize: 13, color: UI.textDim },
  earned: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  earnedText: { fontFamily: FONTS.bold, fontSize: 20, color: UI.gold },
  xpText: { fontFamily: FONTS.semibold, fontSize: 15, color: UI.accentHot },
  flex: { flex: 1 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  lineText: { flex: 1, fontFamily: FONTS.medium, fontSize: 14, color: UI.text },
  more: { fontFamily: FONTS.medium, fontSize: 13, color: UI.textDim, textAlign: 'center' },
});
