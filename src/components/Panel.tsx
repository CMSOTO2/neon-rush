import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FONTS } from '../constants/fonts';
import { UI } from '../constants/palette';

// Short screens (iPhone SE and friends) get a tighter card.
export function usePanelCompact(): boolean {
  return useWindowDimensions().height < 740;
}

// Modal card over a dimmed game view, used by pause and game-over screens. It scrolls if
// a long list of rewards would otherwise run off a small screen.
export function Panel({
  title,
  titleColor = UI.text,
  children,
}: {
  title: string;
  titleColor?: string;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const compact = usePanelCompact();
  return (
    <Animated.View
      entering={FadeIn.duration(180)}
      exiting={FadeOut.duration(120)}
      style={[StyleSheet.absoluteFill, styles.scrim]}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 },
        ]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <Animated.View
          entering={ZoomIn.duration(220).easing(Easing.out(Easing.cubic))}
          style={[styles.card, compact && styles.cardCompact]}
        >
          <Text
            style={[
              styles.title,
              compact && styles.titleCompact,
              { color: titleColor, textShadowColor: titleColor },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
            maxFontSizeMultiplier={1}
          >
            {title}
          </Text>
          <View style={[styles.body, compact && styles.bodyCompact]}>{children}</View>
        </Animated.View>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  scrim: { backgroundColor: 'rgba(8, 3, 24, 0.62)' },
  scroll: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
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
  cardCompact: { paddingVertical: 20, paddingHorizontal: 18, borderRadius: 24 },
  titleCompact: { fontSize: 32 },
  body: { marginTop: 18, gap: 12 },
  bodyCompact: { marginTop: 12, gap: 10 },
});
