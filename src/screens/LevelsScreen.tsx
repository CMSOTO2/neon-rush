import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { playSfx } from '../audio/sfx';
import { ScreenShell } from '../components/ui/ScreenShell';
import { FONTS } from '../constants/fonts';
import { ENVIRONMENTS, getEnvironment, UI } from '../constants/palette';
import {
  CAMPAIGN,
  COIN_STAR_SHARE,
  isLevelUnlocked,
  LEVELS_PER_WORLD,
  type LevelDef,
} from '../progression/campaign';
import { useGameStore } from '../store/gameStore';
import { useProfileStore } from '../store/profileStore';

const WORLD_ORDER = ENVIRONMENTS.map((e) => e.id);
const STAR_RULES = [
  'Reach the finish',
  `Grab ${Math.round(COIN_STAR_SHARE * 100)}% of the coins`,
  'No hits, no continues',
];

export function LevelsScreen() {
  const campaign = useProfileStore((s) => s.profile.campaign);
  const requestLevel = useGameStore((s) => s.requestLevel);
  const totalStars = Object.values(campaign).reduce((a, b) => a + b, 0);

  const play = (def: LevelDef) => {
    requestLevel(def);
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return (
    <ScreenShell title="Levels">
      <View style={styles.summary}>
        <Ionicons name="star" size={20} color={UI.gold} />
        <Text maxFontSizeMultiplier={1.3} style={styles.summaryText}>
          {totalStars} / {CAMPAIGN.length * 3} stars
        </Text>
      </View>
      <View style={styles.rules}>
        {STAR_RULES.map((rule) => (
          <View key={rule} style={styles.rule}>
            <Ionicons name="star" size={12} color={UI.gold} />
            <Text maxFontSizeMultiplier={1.3} style={styles.help}>
              {rule}
            </Text>
          </View>
        ))}
      </View>

      {WORLD_ORDER.map((worldId, w) => {
        const levels = CAMPAIGN.slice(w * LEVELS_PER_WORLD, (w + 1) * LEVELS_PER_WORLD);
        return (
          <View key={worldId} style={styles.section}>
            <Text maxFontSizeMultiplier={1.3} style={styles.world}>
              {getEnvironment(worldId).name.toUpperCase()}
            </Text>
            <View style={styles.grid}>
              {levels.map((def) => {
                const unlocked = isLevelUnlocked(def, campaign);
                const stars = campaign[def.id] ?? 0;
                return (
                  <Animated.View key={def.id} entering={FadeIn} style={styles.cell}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={
                        unlocked
                          ? `Level ${def.number}, ${stars} stars`
                          : `Level ${def.number}, locked`
                      }
                      disabled={!unlocked}
                      onPressIn={() => playSfx('click')}
                      onPress={() => play(def)}
                      style={({ pressed }) => [
                        styles.tile,
                        !unlocked && styles.locked,
                        stars === 3 && styles.perfect,
                        pressed && { transform: [{ scale: 0.93 }] },
                      ]}
                    >
                      {unlocked ? (
                        <Text maxFontSizeMultiplier={1.3} style={styles.number}>
                          {def.number}
                        </Text>
                      ) : (
                        <Ionicons name="lock-closed" size={20} color={UI.textDim} />
                      )}
                      <View style={styles.stars}>
                        {[1, 2, 3].map((n) => (
                          <Ionicons
                            key={n}
                            name={n <= stars ? 'star' : 'star-outline'}
                            size={11}
                            color={n <= stars ? UI.gold : 'rgba(255,255,255,0.3)'}
                          />
                        ))}
                      </View>
                    </Pressable>
                  </Animated.View>
                );
              })}
            </View>
          </View>
        );
      })}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  summary: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  summaryText: { fontFamily: FONTS.bold, fontSize: 20, color: UI.gold },
  rules: { gap: 3 },
  rule: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  help: { fontFamily: FONTS.medium, fontSize: 13, color: UI.textDim },
  section: { gap: 8, marginTop: 6 },
  world: { fontFamily: FONTS.bold, fontSize: 14, color: UI.textDim, letterSpacing: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  cell: { width: '20%', padding: 4 },
  tile: {
    aspectRatio: 1,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: 'rgba(123, 92, 255, 0.25)',
    borderWidth: 2,
    borderColor: 'rgba(123, 92, 255, 0.6)',
  },
  locked: { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' },
  perfect: { borderColor: UI.gold },
  number: { fontFamily: FONTS.bold, fontSize: 22, color: UI.text },
  stars: { flexDirection: 'row', gap: 1 },
});
