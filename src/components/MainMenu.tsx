import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { FONTS } from '../constants/fonts';
import { UI } from '../constants/palette';
import { dailyReward } from '../progression/daily';
import { missionText } from '../progression/missions';
import { useProfileStore } from '../store/profileStore';
import { CoinPill } from './ui/CoinPill';
import { IconTile } from './ui/IconTile';
import { LevelBadge } from './ui/LevelBadge';
import { ProgressBar } from './ui/ProgressBar';
import { NeonButton } from './NeonButton';
import { WorldPicker } from './WorldPicker';

type Props = { top: number; bottom: number; onPlay: () => void };

// Shown over the live scene while the runner idles on the track. Empty space passes
// touches through, so a swipe or tap on the track also starts a run.
export function MainMenu({ top, bottom, onPlay }: Props) {
  const profile = useProfileStore((s) => s.profile);
  const refreshDaily = useProfileStore((s) => s.refreshDaily);
  // A new day brings a new daily challenge.
  useEffect(refreshDaily, [refreshDaily]);
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [pulse]);
  const playStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + pulse.value * 0.04 }] }));

  const daily = profile.daily;
  const missionsReady = profile.missions.filter((m) => m.progress >= m.target).length;
  const nextMission = profile.missions.find((m) => m.progress < m.target) ?? profile.missions[0];

  return (
    <Animated.View
      entering={FadeIn.duration(250)}
      exiting={FadeOut.duration(150)}
      style={[StyleSheet.absoluteFill, { paddingTop: top + 10, paddingBottom: bottom + 16 }]}
      pointerEvents="box-none"
    >
      <View style={styles.topRow}>
        <LevelBadge xp={profile.xp} />
        <CoinPill amount={profile.coins} />
      </View>

      <View style={styles.titleBlock} pointerEvents="none">
        <Text style={styles.titleTop}>NEON</Text>
        <Text style={styles.titleBottom}>RUSH</Text>
        {profile.life.bestScore > 0 && (
          <Text style={styles.best}>BEST {profile.life.bestScore.toLocaleString()}</Text>
        )}
      </View>

      <WorldPicker />

      <View style={styles.cards} pointerEvents="box-none">
        <View style={styles.card}>
          <View style={styles.cardHead}>
            <Ionicons name="flame" size={16} color={UI.gold} />
            <Text style={styles.cardTitle}>
              DAILY{daily.streak > 0 ? ` · ${daily.streak}-day streak` : ''}
            </Text>
            <Text style={styles.cardReward}>
              {daily.done ? 'Done!' : `+${dailyReward(daily.streak + 1)}`}
            </Text>
          </View>
          <Text style={styles.cardText}>{missionText(daily)}</Text>
          <ProgressBar value={daily.progress / daily.target} color={UI.gold} />
        </View>
        <View style={styles.card}>
          <View style={styles.cardHead}>
            <Ionicons name="flag" size={16} color={UI.accent} />
            <Text style={styles.cardTitle}>NEXT MISSION</Text>
            <Text style={styles.cardReward}>+{nextMission.reward}</Text>
          </View>
          <Text style={styles.cardText}>{missionText(nextMission)}</Text>
          <ProgressBar value={nextMission.progress / nextMission.target} />
        </View>
      </View>

      <View style={styles.spacer} pointerEvents="none" />

      <Animated.View style={[styles.play, playStyle]}>
        <NeonButton label="PLAY" onPress={onPlay} accessibilityHint="Starts a run" />
      </Animated.View>
      <Text style={styles.hint} pointerEvents="none">
        or swipe on the track
      </Text>

      <View style={styles.tiles}>
        <IconTile icon="people" label="Runners" onPress={() => router.push('/characters')} />
        <IconTile icon="flash" label="Upgrades" onPress={() => router.push('/shop')} />
        <IconTile
          icon="flag"
          label="Missions"
          badge={missionsReady}
          onPress={() => router.push('/missions')}
        />
        <IconTile icon="trophy" label="Awards" onPress={() => router.push('/achievements')} />
        <IconTile icon="settings" label="Settings" onPress={() => router.push('/settings')} />
      </View>
    </Animated.View>
  );
}

// iOS clips text shadows to the text's own bounds, so pad the box for the glow and pull
// it back with negative margins.
const glow = (color: string) => ({
  textShadowColor: color,
  textShadowOffset: { width: 0, height: 0 },
  textShadowRadius: 18,
  paddingHorizontal: 24,
  paddingVertical: 12,
  marginHorizontal: -24,
  marginVertical: -12,
});

const styles = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  titleBlock: { alignItems: 'center', marginTop: 14 },
  titleTop: {
    fontFamily: FONTS.bold,
    fontSize: 56,
    lineHeight: 58,
    color: UI.accent,
    letterSpacing: 6,
    ...glow(UI.accent),
  },
  titleBottom: {
    fontFamily: FONTS.bold,
    fontSize: 64,
    lineHeight: 66,
    color: UI.accentHot,
    letterSpacing: 8,
    ...glow(UI.accentHot),
  },
  best: {
    marginTop: 6,
    fontFamily: FONTS.semibold,
    fontSize: 16,
    color: UI.gold,
    letterSpacing: 2,
  },
  spacer: { flex: 1 },
  cards: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginTop: 12 },
  card: {
    flex: 1,
    gap: 6,
    padding: 10,
    borderRadius: 16,
    backgroundColor: 'rgba(20, 10, 51, 0.82)',
    borderWidth: 1.5,
    borderColor: 'rgba(123, 92, 255, 0.55)',
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  cardTitle: { flex: 1, fontFamily: FONTS.bold, fontSize: 11, color: UI.textDim, letterSpacing: 1 },
  cardReward: { fontFamily: FONTS.bold, fontSize: 12, color: UI.gold },
  cardText: { fontFamily: FONTS.medium, fontSize: 13, color: UI.text, minHeight: 34 },
  play: { paddingHorizontal: 48 },
  hint: {
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 12,
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: UI.textDim,
  },
  tiles: { flexDirection: 'row', gap: 8, paddingHorizontal: 12 },
});
