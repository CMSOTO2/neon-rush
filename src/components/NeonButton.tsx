import * as Haptics from 'expo-haptics';
import { Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { playSfx } from '../audio/sfx';
import { FONTS } from '../constants/fonts';
import { UI } from '../constants/palette';

type Variant = 'primary' | 'secondary';

type Props = {
  label: string;
  // Small second line under the label, e.g. the next level number.
  sublabel?: string;
  // 'small' for buttons that sit inside cards.
  size?: 'regular' | 'small';
  onPress: () => void;
  variant?: Variant;
  style?: ViewStyle;
  accessibilityHint?: string;
  // Shown dimmed and ignores presses (e.g. not enough coins).
  disabled?: boolean;
};

const COLORS: Record<Variant, { bg: string; border: string; text: string; glow: string }> = {
  primary: { bg: '#ff4fd8', border: '#ffd1f4', text: '#ffffff', glow: '#ff4fd8' },
  secondary: {
    bg: 'rgba(94, 242, 255, 0.12)',
    border: UI.accent,
    text: UI.accent,
    glow: UI.accent,
  },
};

export function NeonButton({
  label,
  sublabel,
  size = 'regular',
  onPress,
  variant = 'primary',
  style,
  accessibilityHint,
  disabled = false,
}: Props) {
  const pressed = useSharedValue(0);
  const c = COLORS[variant];

  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.value * 0.06 }, { translateY: pressed.value * 2 }],
    shadowOpacity: 0.9 - pressed.value * 0.5,
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={sublabel ? `${label}, ${sublabel}` : label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPressIn={() => {
        pressed.value = withTiming(1, { duration: 70 });
        playSfx('click');
        if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
      }}
      onPressOut={() => {
        pressed.value = withTiming(0, { duration: 120 });
      }}
      onPress={onPress}
      style={[style, disabled && { opacity: 0.4 }]}
    >
      <Animated.View
        style={[
          styles.button,
          size === 'small' && styles.buttonSmall,
          // Android draws an elevation shadow through a translucent background as a dark
          // box, so only the solid button gets one.
          variant === 'primary' && styles.raised,
          { backgroundColor: c.bg, borderColor: c.border, shadowColor: c.glow },
          animated,
        ]}
      >
        {/* One line that shrinks to fit rather than wrapping mid-word on narrow phones. */}
        <Text
          style={[styles.label, size === 'small' && styles.labelSmall, { color: c.text }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
          maxFontSizeMultiplier={1.2}
        >
          {label}
        </Text>
        {sublabel ? (
          <View style={styles.sub}>
            <Text
              style={[styles.sublabel, { color: c.text }]}
              numberOfLines={1}
              maxFontSizeMultiplier={1.2}
            >
              {sublabel}
            </Text>
          </View>
        ) : null}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 56,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 14,
  },
  raised: { elevation: 8 },
  buttonSmall: { minHeight: 44, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 14 },
  label: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    letterSpacing: 1,
  },
  labelSmall: { fontSize: 17 },
  sub: { marginTop: -1 },
  sublabel: { fontFamily: FONTS.semibold, fontSize: 12, letterSpacing: 1, opacity: 0.85 },
});
