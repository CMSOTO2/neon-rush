import { Pressable, StyleSheet, View } from 'react-native';

import { UI } from '../constants/palette';

export function PauseButton({ onPress, top }: { onPress: () => void; top: number }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Pause"
      onPress={onPress}
      hitSlop={12}
      style={({ pressed }) => [styles.button, { top }, pressed && styles.pressed]}
    >
      <View style={styles.bar} />
      <View style={styles.bar} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    left: 16,
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: UI.accent,
    backgroundColor: 'rgba(20, 10, 51, 0.6)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  pressed: { transform: [{ scale: 0.92 }] },
  bar: { width: 6, height: 18, borderRadius: 3, backgroundColor: UI.text },
});
