import { StyleSheet, View, type ViewStyle } from 'react-native';

import { UI } from '../../constants/palette';

export function ProgressBar({
  value,
  color = UI.accent,
  height = 8,
  style,
}: {
  value: number;
  color?: string;
  height?: number;
  style?: ViewStyle;
}) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <View style={[styles.track, { height, borderRadius: height / 2 }, style]}>
      <View
        style={[
          styles.fill,
          { width: `${pct}%`, backgroundColor: color, borderRadius: height / 2 },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' },
  fill: { height: '100%' },
});
