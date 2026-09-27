import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { playSfx } from '../../audio/sfx';
import { FONTS } from '../../constants/fonts';
import { UI } from '../../constants/palette';

type Props = {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  // Small red counter for things waiting to be claimed.
  badge?: number;
};

export function IconTile({ icon, label, onPress, badge }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={badge ? `${label}, ${badge} new` : label}
      onPressIn={() => playSfx('click')}
      onPress={onPress}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
    >
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={24} color={UI.accent} />
        {!!badge && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
      </View>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: 'rgba(20, 10, 51, 0.72)',
    borderWidth: 1.5,
    borderColor: 'rgba(94, 242, 255, 0.35)',
  },
  pressed: { transform: [{ scale: 0.94 }], borderColor: UI.accent },
  iconWrap: { width: 30, height: 28, alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: FONTS.semibold, fontSize: 12, color: UI.text },
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: UI.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontFamily: FONTS.bold, fontSize: 11, color: UI.text },
});
