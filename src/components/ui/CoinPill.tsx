import { StyleSheet, Text, View } from 'react-native';

import { FONTS } from '../../constants/fonts';
import { UI } from '../../constants/palette';

export function CoinIcon({ size = 18 }: { size?: number }) {
  return (
    <View style={[styles.coin, { width: size, height: size, borderRadius: size / 2 }]}>
      <View
        style={[
          styles.coinInner,
          { width: size * 0.5, height: size * 0.5, borderRadius: size / 4 },
        ]}
      />
    </View>
  );
}

export function CoinPill({ amount }: { amount: number }) {
  return (
    <View style={styles.pill} accessibilityLabel={`${amount} coins`}>
      <CoinIcon />
      <Text style={styles.text}>{amount.toLocaleString()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(20, 10, 51, 0.75)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 216, 74, 0.6)',
  },
  text: { fontFamily: FONTS.bold, fontSize: 17, color: UI.gold },
  coin: {
    backgroundColor: '#ffc928',
    borderWidth: 2,
    borderColor: '#d98a0b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinInner: { backgroundColor: '#ffe680' },
});
