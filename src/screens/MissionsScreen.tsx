import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { CoinIcon } from '../components/ui/CoinPill';
import { ProgressBar } from '../components/ui/ProgressBar';
import { ScreenShell } from '../components/ui/ScreenShell';
import { FONTS } from '../constants/fonts';
import { UI } from '../constants/palette';
import { dailyReward } from '../progression/daily';
import { missionText } from '../progression/missions';
import { useProfileStore } from '../store/profileStore';

export function MissionsScreen() {
  const profile = useProfileStore((s) => s.profile);
  const refreshDaily = useProfileStore((s) => s.refreshDaily);
  useEffect(refreshDaily, [refreshDaily]);
  const daily = profile.daily;

  return (
    <ScreenShell title="Missions">
      <Animated.View entering={FadeInDown} style={[styles.card, styles.daily]}>
        <View style={styles.head}>
          <Ionicons name="flame" size={20} color={UI.gold} />
          <Text style={styles.headTitle}>DAILY CHALLENGE</Text>
          {daily.streak > 0 && <Text style={styles.streak}>{daily.streak}-day streak</Text>}
        </View>
        <Text style={styles.text}>{missionText(daily)}</Text>
        <ProgressBar value={daily.progress / daily.target} color={UI.gold} height={10} />
        <View style={styles.foot}>
          <Text style={styles.progress}>
            {daily.done
              ? 'Completed today. Come back tomorrow to keep your streak!'
              : `${daily.progress.toLocaleString()} / ${daily.target.toLocaleString()}`}
          </Text>
          {!daily.done && (
            <View style={styles.reward}>
              <CoinIcon size={16} />
              <Text style={styles.rewardText}>{dailyReward(daily.streak + 1)}</Text>
            </View>
          )}
        </View>
      </Animated.View>

      <Text style={styles.section}>ACTIVE MISSIONS</Text>
      {profile.missions.map((m, i) => (
        <Animated.View key={m.id} entering={FadeInDown.delay(80 + i * 60)} style={styles.card}>
          <View style={styles.head}>
            <Ionicons name="flag" size={18} color={UI.accent} />
            <Text style={styles.headTitle}>TIER {m.tier}</Text>
            <View style={styles.reward}>
              <CoinIcon size={16} />
              <Text style={styles.rewardText}>{m.reward}</Text>
              <Text style={styles.xp}>+{m.xp} XP</Text>
            </View>
          </View>
          <Text style={styles.text}>{missionText(m)}</Text>
          <ProgressBar value={m.progress / m.target} height={10} />
          <Text style={styles.progress}>
            {m.progress.toLocaleString()} / {m.target.toLocaleString()}
          </Text>
        </Animated.View>
      ))}
      <Text style={styles.note}>
        Missions complete at the end of a run. Each one you finish is replaced by a slightly harder
        one. Completed so far: {profile.life.missionsCompleted}
      </Text>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 8,
    padding: 14,
    borderRadius: 20,
    backgroundColor: 'rgba(20, 10, 51, 0.9)',
    borderWidth: 1.5,
    borderColor: 'rgba(94, 242, 255, 0.3)',
  },
  daily: { borderColor: 'rgba(255, 216, 74, 0.55)', backgroundColor: 'rgba(255, 216, 74, 0.07)' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headTitle: {
    flex: 1,
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: UI.textDim,
    letterSpacing: 1.5,
  },
  streak: { fontFamily: FONTS.bold, fontSize: 12, color: UI.gold },
  text: { fontFamily: FONTS.semibold, fontSize: 17, color: UI.text },
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  progress: { flexShrink: 1, fontFamily: FONTS.medium, fontSize: 13, color: UI.textDim },
  reward: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rewardText: { fontFamily: FONTS.bold, fontSize: 15, color: UI.gold },
  xp: { marginLeft: 6, fontFamily: FONTS.semibold, fontSize: 13, color: UI.accentHot },
  section: {
    marginTop: 6,
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: UI.textDim,
    letterSpacing: 2,
  },
  note: { fontFamily: FONTS.medium, fontSize: 13, color: UI.textDim, lineHeight: 19 },
});
