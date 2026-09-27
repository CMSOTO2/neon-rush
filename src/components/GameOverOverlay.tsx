import { StyleSheet, Text, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { FONTS } from '../constants/fonts';
import { UI } from '../constants/palette';
import type { RunResult } from '../store/gameStore';
import { NeonButton } from './NeonButton';
import { Panel } from './Panel';

type Props = {
  result: RunResult;
  isBest: boolean;
  bestScore: number;
  onRestart: () => void;
  onMenu: () => void;
};

export function GameOverOverlay({ result, isBest, bestScore, onRestart, onMenu }: Props) {
  return (
    <Panel title="CRASHED!" titleColor={UI.accentHot}>
      <View style={styles.scoreBlock}>
        <Text style={styles.scoreLabel}>SCORE</Text>
        <Text style={styles.score}>{result.score}</Text>
        {isBest ? (
          <Animated.View entering={ZoomIn.delay(250).springify()}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>NEW BEST!</Text>
            </View>
          </Animated.View>
        ) : (
          <Text style={styles.bestLine}>Best {bestScore}</Text>
        )}
      </View>

      <View style={styles.stats}>
        <Stat label="Distance" value={`${Math.floor(result.distance)} m`} />
        <Stat label="Dodged" value={String(result.obstaclesPassed)} />
        <Stat label="Jumps" value={String(result.jumps)} />
      </View>

      <NeonButton label="RUN AGAIN" onPress={onRestart} />
      <NeonButton label="MENU" variant="secondary" onPress={onMenu} />
    </Panel>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scoreBlock: { alignItems: 'center' },
  scoreLabel: { fontFamily: FONTS.semibold, fontSize: 14, color: UI.textDim, letterSpacing: 3 },
  score: { fontFamily: FONTS.bold, fontSize: 60, color: UI.text, lineHeight: 66 },
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
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginBottom: 6,
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontFamily: FONTS.bold, fontSize: 20, color: UI.accent },
  statLabel: { fontFamily: FONTS.medium, fontSize: 13, color: UI.textDim },
});
