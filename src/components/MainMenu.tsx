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
import { CAMPAIGN } from '../progression/campaign';
import { dailyReward } from '../progression/daily';
import { missionText } from '../progression/missions';
import { useProfileStore } from '../store/profileStore';
import { CoinPill } from './ui/CoinPill';
import { IconTile } from './ui/IconTile';
import type { MenuLayout } from './menuLayout';
import { useReduceMotion } from './motion';
import { LevelBadge } from './ui/LevelBadge';
import { ProgressBar } from './ui/ProgressBar';
import { NeonButton } from './NeonButton';
import { WorldPicker } from './WorldPicker';

type Props = { top: number; bottom: number; layout: MenuLayout; onPlay: () => void };

// Room the top block needs at full size; smaller spaces scale the title down.
const TOP_BLOCK_FULL = 430;

// Shown over the live scene while the runner idles on the track. Empty space passes
// touches through, so a swipe or tap on the track also starts a run. The top block
// (title, world, cards) fills the space above the runner's head and the bottom block
// (play, tiles) sits under its feet; see menuLayout.ts.
export function MainMenu({ top, bottom, layout, onPlay }: Props) {
  const profile = useProfileStore((s) => s.profile);
  const refreshDaily = useProfileStore((s) => s.refreshDaily);
  // A new day brings a new daily challenge.
  useEffect(refreshDaily, [refreshDaily]);
  const reduceMotion = useReduceMotion();
  const pulse = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) {
      pulse.value = 0;
      return;
    }
    pulse.value = withRepeat(
      withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [pulse, reduceMotion]);
  const playStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + pulse.value * 0.04 }] }));

  const daily = profile.daily;
  // The first level that isn't finished yet (or the last one).
  const nextLevelNumber = (
    CAMPAIGN.find((l) => !profile.campaign[l.id]) ?? CAMPAIGN[CAMPAIGN.length - 1]
  ).number;
  const missionsReady = profile.missions.filter((m) => m.progress >= m.target).length;
  const nextMission = profile.missions.find((m) => m.progress < m.target) ?? profile.missions[0];
  const { compact } = layout;
  const titleScale = Math.min(1, Math.max(0.7, layout.topBlock / TOP_BLOCK_FULL));
  const titleTop = { fontSize: 56 * titleScale, lineHeight: 58 * titleScale };
  const titleBottom = { fontSize: 64 * titleScale, lineHeight: 66 * titleScale };

  return (
    <Animated.View
      entering={FadeIn.duration(250)}
      exiting={FadeOut.duration(150)}
      style={StyleSheet.absoluteFill}
      pointerEvents="box-none"
    >
      <View
        style={[styles.topBlock, { top: top + 8, height: layout.topBlock }]}
        pointerEvents="box-none"
      >
        <View style={styles.topRow}>
          <LevelBadge xp={profile.xp} />
          <CoinPill amount={profile.coins} />
        </View>

        <View style={styles.middle} pointerEvents="box-none">
          <View style={styles.titleBlock} pointerEvents="none">
            <Text style={[styles.titleTop, titleTop]} maxFontSizeMultiplier={1}>
              NEON
            </Text>
            <Text style={[styles.titleBottom, titleBottom]} maxFontSizeMultiplier={1}>
              RUSH
            </Text>
            {profile.life.bestScore > 0 && (
              <Text style={styles.best} maxFontSizeMultiplier={1.2}>
                BEST {profile.life.bestScore.toLocaleString()}
              </Text>
            )}
          </View>
          <WorldPicker />
        </View>

        <View style={styles.cards} pointerEvents="box-none">
          <View style={[styles.card, compact && styles.cardCompact]}>
            <View style={styles.cardHead}>
              <Ionicons name="flame" size={15} color={UI.gold} />
              <Text
                style={styles.cardTitle}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
                maxFontSizeMultiplier={1.2}
              >
                {daily.streak > 0 ? `DAILY · ${daily.streak}-DAY STREAK` : 'DAILY'}
              </Text>
              <Text style={styles.cardReward} maxFontSizeMultiplier={1.2}>
                {daily.done ? 'Done!' : `+${dailyReward(daily.streak + 1)}`}
              </Text>
            </View>
            <Text
              style={[styles.cardText, compact && styles.cardTextCompact]}
              numberOfLines={2}
              maxFontSizeMultiplier={1.2}
            >
              {missionText(daily)}
            </Text>
            <ProgressBar value={daily.progress / daily.target} color={UI.gold} />
          </View>
          <View style={[styles.card, compact && styles.cardCompact]}>
            <View style={styles.cardHead}>
              <Ionicons name="flag" size={15} color={UI.accent} />
              <Text style={styles.cardTitle} numberOfLines={1} maxFontSizeMultiplier={1.2}>
                MISSION
              </Text>
              <Text style={styles.cardReward} maxFontSizeMultiplier={1.2}>
                +{nextMission.reward}
              </Text>
            </View>
            <Text
              style={[styles.cardText, compact && styles.cardTextCompact]}
              numberOfLines={2}
              maxFontSizeMultiplier={1.2}
            >
              {missionText(nextMission)}
            </Text>
            <ProgressBar value={nextMission.progress / nextMission.target} />
          </View>
        </View>
      </View>

      <View style={[styles.bottomBlock, { bottom: bottom + 14 }]} pointerEvents="box-none">
        <View style={styles.playRow}>
          <Animated.View style={[styles.play, playStyle]}>
            <NeonButton label="PLAY" onPress={onPlay} accessibilityHint="Starts an endless run" />
          </Animated.View>
          <NeonButton
            label="LEVELS"
            sublabel={`NEXT: ${nextLevelNumber}`}
            variant="secondary"
            style={styles.levels}
            accessibilityHint="Choose a campaign level"
            onPress={() => router.push('/levels')}
          />
        </View>
        {compact ? (
          <View style={styles.hintGap} />
        ) : (
          <Text style={styles.hint} pointerEvents="none" maxFontSizeMultiplier={1.2}>
            or swipe on the track to run
          </Text>
        )}

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
  topBlock: { position: 'absolute', left: 0, right: 0, gap: 8 },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  // Takes the space left between the top row and the cards, and centres the title in it.
  middle: { flex: 1, justifyContent: 'space-evenly', alignItems: 'center', minHeight: 0 },
  titleBlock: { alignItems: 'center' },
  titleTop: {
    fontFamily: FONTS.bold,
    color: UI.accent,
    letterSpacing: 6,
    ...glow(UI.accent),
  },
  titleBottom: {
    fontFamily: FONTS.bold,
    color: UI.accentHot,
    letterSpacing: 8,
    ...glow(UI.accentHot),
  },
  best: {
    marginTop: 4,
    fontFamily: FONTS.semibold,
    fontSize: 15,
    color: UI.gold,
    letterSpacing: 2,
  },
  cards: { flexDirection: 'row', gap: 10, paddingHorizontal: 16 },
  card: {
    flex: 1,
    gap: 6,
    padding: 10,
    borderRadius: 16,
    backgroundColor: 'rgba(20, 10, 51, 0.82)',
    borderWidth: 1.5,
    borderColor: 'rgba(123, 92, 255, 0.55)',
  },
  cardCompact: { gap: 4, paddingVertical: 8 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  cardTitle: { flex: 1, fontFamily: FONTS.bold, fontSize: 11, color: UI.textDim, letterSpacing: 1 },
  cardReward: { fontFamily: FONTS.bold, fontSize: 12, color: UI.gold },
  cardText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    lineHeight: 17,
    color: UI.text,
    minHeight: 34,
  },
  cardTextCompact: { fontSize: 12, lineHeight: 15, minHeight: 30 },
  bottomBlock: { position: 'absolute', left: 0, right: 0 },
  playRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16 },
  play: { flex: 1.4 },
  levels: { flex: 1 },
  hint: {
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 10,
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: UI.textDim,
  },
  hintGap: { height: 10 },
  tiles: { flexDirection: 'row', gap: 6, paddingHorizontal: 12 },
});
