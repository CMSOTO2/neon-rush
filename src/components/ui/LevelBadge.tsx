import { StyleSheet, Text, View } from 'react-native';

import { FONTS } from '../../constants/fonts';
import { UI } from '../../constants/palette';
import { levelFromXp } from '../../progression/levels';
import { ProgressBar } from './ProgressBar';

export function LevelBadge({ xp }: { xp: number }) {
  const info = levelFromXp(xp);
  return (
    <View
      style={styles.row}
      accessibilityLabel={`Level ${info.level}, ${info.xpIntoLevel} of ${info.xpForLevel} XP`}
    >
      <View style={styles.badge}>
        <Text style={styles.level}>{info.level}</Text>
      </View>
      <View style={styles.bar}>
        <Text style={styles.label}>LEVEL</Text>
        <ProgressBar value={info.xpIntoLevel / info.xpForLevel} color={UI.accentHot} height={7} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: UI.accentHot,
    borderWidth: 2,
    borderColor: '#ffd1f4',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '45deg' }],
  },
  level: {
    fontFamily: FONTS.bold,
    fontSize: 17,
    color: UI.text,
    transform: [{ rotate: '-45deg' }],
  },
  bar: { width: 86, gap: 3 },
  label: { fontFamily: FONTS.semibold, fontSize: 11, color: UI.textDim, letterSpacing: 2 },
});
