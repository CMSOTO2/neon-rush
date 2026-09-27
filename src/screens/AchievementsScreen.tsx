import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { CoinIcon } from '../components/ui/CoinPill';
import { ProgressBar } from '../components/ui/ProgressBar';
import { ScreenShell } from '../components/ui/ScreenShell';
import { FONTS } from '../constants/fonts';
import { UI } from '../constants/palette';
import { ACHIEVEMENTS } from '../progression/achievements';
import { useProfileStore } from '../store/profileStore';

export function AchievementsScreen() {
  const profile = useProfileStore((s) => s.profile);
  const done = profile.achievements;
  const life = profile.life;

  return (
    <ScreenShell title="Awards">
      <View style={styles.summary}>
        <Text style={styles.count}>
          {done.length} / {ACHIEVEMENTS.length}
        </Text>
        <ProgressBar value={done.length / ACHIEVEMENTS.length} color={UI.gold} height={10} />
        <View style={styles.statsRow}>
          <Stat label="Runs" value={life.runs} />
          <Stat label="Best" value={life.bestScore} />
          <Stat label="Meters" value={life.totalDistance} />
          <Stat label="Coins" value={life.totalCoins} />
        </View>
      </View>

      {ACHIEVEMENTS.map((a, i) => {
        const unlocked = done.includes(a.id);
        return (
          <Animated.View
            key={a.id}
            entering={FadeInDown.delay(i * 40)}
            style={[styles.card, unlocked && styles.cardDone]}
            accessibilityLabel={`${a.name}. ${a.description}. ${unlocked ? 'Unlocked' : 'Locked'}`}
          >
            <View style={[styles.icon, unlocked && styles.iconDone]}>
              <Ionicons
                name={unlocked ? 'trophy' : 'lock-closed'}
                size={22}
                color={unlocked ? '#2a1640' : UI.textDim}
              />
            </View>
            <View style={styles.info}>
              <Text style={[styles.name, !unlocked && { color: UI.textDim }]}>{a.name}</Text>
              <Text style={styles.desc}>{a.description}</Text>
            </View>
            <View style={styles.reward}>
              <CoinIcon size={14} />
              <Text style={styles.rewardText}>{a.reward}</Text>
            </View>
          </Animated.View>
        );
      })}
    </ScreenShell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value.toLocaleString()}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  summary: {
    gap: 10,
    padding: 14,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 216, 74, 0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 216, 74, 0.45)',
  },
  count: { fontFamily: FONTS.bold, fontSize: 28, color: UI.gold },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  stat: { alignItems: 'center', flex: 1 },
  statValue: { fontFamily: FONTS.bold, fontSize: 16, color: UI.text },
  statLabel: { fontFamily: FONTS.medium, fontSize: 12, color: UI.textDim },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 18,
    backgroundColor: 'rgba(20, 10, 51, 0.9)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  cardDone: { borderColor: 'rgba(255, 216, 74, 0.5)' },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconDone: { backgroundColor: UI.gold },
  info: { flex: 1, gap: 2 },
  name: { fontFamily: FONTS.bold, fontSize: 16, color: UI.text },
  desc: { fontFamily: FONTS.medium, fontSize: 13, color: UI.textDim },
  reward: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rewardText: { fontFamily: FONTS.bold, fontSize: 14, color: UI.gold },
});
