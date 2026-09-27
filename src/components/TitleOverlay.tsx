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

// Touches pass through to the game canvas: any tap or swipe starts the run.
export function TitleOverlay({ top, best }: { top: number; best: number }) {
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [pulse]);

  const hintStyle = useAnimatedStyle(() => ({
    opacity: 0.55 + pulse.value * 0.45,
    transform: [{ scale: 1 + pulse.value * 0.05 }],
  }));

  return (
    <Animated.View
      entering={FadeIn.duration(250)}
      exiting={FadeOut.duration(150)}
      style={[StyleSheet.absoluteFill, styles.root, { paddingTop: top + 40 }]}
      pointerEvents="none"
    >
      <Text style={styles.titleTop}>NEON</Text>
      <Text style={styles.titleBottom}>RUSH</Text>
      {best > 0 && <Text style={styles.best}>BEST {best}</Text>}

      <View style={styles.spacer} />

      <Animated.Text style={[styles.hint, hintStyle]}>SWIPE TO RUN</Animated.Text>
      <View style={styles.legend}>
        <Text style={styles.legendItem}>← → lanes</Text>
        <Text style={styles.legendItem}>↑ jump</Text>
        <Text style={styles.legendItem}>↓ slide</Text>
      </View>
    </Animated.View>
  );
}

const glow = (color: string) => ({
  textShadowColor: color,
  textShadowOffset: { width: 0, height: 0 },
  textShadowRadius: 18,
});

const styles = StyleSheet.create({
  root: { alignItems: 'center', paddingBottom: 60 },
  titleTop: {
    fontFamily: FONTS.bold,
    fontSize: 64,
    lineHeight: 66,
    color: UI.accent,
    letterSpacing: 6,
    ...glow(UI.accent),
  },
  titleBottom: {
    fontFamily: FONTS.bold,
    fontSize: 72,
    lineHeight: 74,
    color: UI.accentHot,
    letterSpacing: 8,
    ...glow(UI.accentHot),
  },
  best: {
    marginTop: 10,
    fontFamily: FONTS.semibold,
    fontSize: 18,
    color: UI.gold,
    letterSpacing: 2,
  },
  spacer: { flex: 1 },
  hint: {
    fontFamily: FONTS.bold,
    fontSize: 26,
    color: UI.text,
    letterSpacing: 3,
    ...glow(UI.accentHot),
  },
  legend: { flexDirection: 'row', gap: 18, marginTop: 14 },
  legendItem: { fontFamily: FONTS.medium, fontSize: 15, color: UI.textDim },
});
