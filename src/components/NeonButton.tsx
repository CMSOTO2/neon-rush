import * as Haptics from 'expo-haptics';
import { Platform, Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { playSfx } from '../audio/sfx';
import { FONTS } from '../constants/fonts';
import { UI } from '../constants/palette';

type Variant = 'primary' | 'secondary';

type Props = {
  label: string;
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
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPressIn={() => {
        pressed.value = withTiming(1, { duration: 70 });
        playSfx('click');
        if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
      }}
      onPressOut={() => {
        pressed.value = withSpring(0, { damping: 12, stiffness: 320 });
      }}
      onPress={onPress}
      style={[style, disabled && { opacity: 0.4 }]}
    >
      <Animated.View
        style={[
          styles.button,
          { backgroundColor: c.bg, borderColor: c.border, shadowColor: c.glow },
          animated,
        ]}
      >
        <Text style={[styles.label, { color: c.text }]}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 56,
    paddingHorizontal: 28,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 14,
    elevation: 8,
  },
  label: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    letterSpacing: 1,
  },
});
