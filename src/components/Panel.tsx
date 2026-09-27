import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';

import { FONTS } from '../constants/fonts';
import { UI } from '../constants/palette';

// Modal card over a dimmed game view, used by pause and game-over screens.
export function Panel({
  title,
  titleColor = UI.text,
  children,
}: {
  title: string;
  titleColor?: string;
  children: ReactNode;
}) {
  return (
    <Animated.View
      entering={FadeIn.duration(180)}
      exiting={FadeOut.duration(120)}
      style={[StyleSheet.absoluteFill, styles.scrim]}
    >
      <Animated.View entering={ZoomIn.springify().damping(14)} style={styles.card}>
        <Text style={[styles.title, { color: titleColor, textShadowColor: titleColor }]}>
          {title}
        </Text>
        <View style={styles.body}>{children}</View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    backgroundColor: 'rgba(8, 3, 24, 0.62)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: UI.panel,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: UI.panelBorder,
    paddingVertical: 28,
    paddingHorizontal: 24,
    shadowColor: UI.panelBorder,
    shadowOpacity: 0.8,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 38,
    textAlign: 'center',
    letterSpacing: 3,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
    // Room for the glow, which iOS clips to the text bounds.
    paddingVertical: 10,
    marginVertical: -10,
  },
  body: { marginTop: 18, gap: 12 },
});
