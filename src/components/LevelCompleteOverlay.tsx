import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';

import { FONTS } from '../constants/fonts';
import { UI } from '../constants/palette';
import type { RunRewards } from '../progression/applyRun';
import type { LevelDef } from '../progression/campaign';
import type { LevelResult, RunResult } from '../store/gameStore';
import { CoinIcon } from './ui/CoinPill';
import { NeonButton } from './NeonButton';
import { Panel } from './Panel';

type Props = {
  level: LevelDef;
  result: LevelResult;
  run: RunResult;
  rewards: RunRewards | null;
  hasNext: boolean;
  onNext: () => void;
  onReplay: () => void;
  onLevels: () => void;
};

export function LevelCompleteOverlay({
  level,
  result,
  run,
  rewards,
  hasNext,
  onNext,
  onReplay,
  onLevels,
}: Props) {
  const earned = (rewards ? rewards.coinsFromRun + rewards.bonusCoins : 0) + result.levelCoins;
  const checks = [
    { done: result.finished, text: 'Reach the finish' },
    {
      done: result.coinStar,
      text: `Collect ${result.coinsNeeded} coins (${run.coins})`,
    },
    { done: result.cleanStar, text: 'No hits, no continues' },
  ];

  return (
    <Panel title={`LEVEL ${level.number}`} titleColor={UI.accent}>
      <Text style={styles.cleared}>CLEARED!</Text>
      <View style={styles.stars} accessibilityLabel={`${result.stars} of 3 stars`}>
        {[1, 2, 3].map((n) => (
          <Animated.View key={n} entering={ZoomIn.delay(200 + n * 220).springify()}>
            <Ionicons
              name={n <= result.stars ? 'star' : 'star-outline'}
              size={n === 2 ? 56 : 46}
              color={n <= result.stars ? UI.gold : 'rgba(255,255,255,0.25)'}
            />
          </Animated.View>
        ))}
      </View>

      {checks.map((c, i) => (
        <Animated.View key={c.text} entering={FadeInDown.delay(300 + i * 120)} style={styles.check}>
          <Ionicons
            name={c.done ? 'checkmark-circle' : 'ellipse-outline'}
            size={20}
            color={c.done ? UI.accent : UI.textDim}
          />
          <Text style={[styles.checkText, !c.done && { color: UI.textDim }]}>{c.text}</Text>
        </Animated.View>
      ))}

      <View style={styles.earned}>
        <CoinIcon size={20} />
        <Text style={styles.earnedText}>+{earned.toLocaleString()}</Text>
        {rewards && <Text style={styles.xp}>+{rewards.xpEarned} XP</Text>}
        {result.stars > result.previousStars && result.previousStars > 0 && (
          <Text style={styles.improved}>New best!</Text>
        )}
      </View>

      {hasNext && <NeonButton label="NEXT LEVEL" onPress={onNext} />}
      <NeonButton label="REPLAY" variant={hasNext ? 'secondary' : 'primary'} onPress={onReplay} />
      <NeonButton label="LEVELS" variant="secondary" onPress={onLevels} />
    </Panel>
  );
}

const styles = StyleSheet.create({
  cleared: {
    textAlign: 'center',
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: UI.text,
    letterSpacing: 4,
    marginTop: -8,
  },
  stars: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', gap: 6 },
  check: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkText: { flex: 1, fontFamily: FONTS.medium, fontSize: 15, color: UI.text },
  earned: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' },
  earnedText: { fontFamily: FONTS.bold, fontSize: 22, color: UI.gold },
  xp: { fontFamily: FONTS.semibold, fontSize: 15, color: UI.accentHot },
  improved: { fontFamily: FONTS.bold, fontSize: 14, color: UI.accent },
});
