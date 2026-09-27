import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FONTS } from '../constants/fonts';
import { UI } from '../constants/palette';
import { useProfileStore } from '../store/profileStore';
import { CoinIcon } from './ui/CoinPill';
import { NeonButton } from './NeonButton';
import { Panel } from './Panel';

const SECONDS = 5;

// "Continue?" after a crash, paid with banked coins. Declines itself after a few seconds.
export function ReviveOverlay({
  cost,
  onRevive,
  onDecline,
}: {
  cost: number;
  onRevive: () => void;
  onDecline: () => void;
}) {
  const coins = useProfileStore((s) => s.profile.coins);
  const [left, setLeft] = useState(SECONDS);

  useEffect(() => {
    if (left <= 0) {
      onDecline();
      return;
    }
    const t = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [left, onDecline]);

  return (
    <Panel title="CONTINUE?" titleColor={UI.accent}>
      <Text style={styles.count}>{left}</Text>
      <View style={styles.costRow}>
        <CoinIcon size={22} />
        <Text style={styles.cost}>{cost.toLocaleString()}</Text>
        <Text style={styles.balance}>of {coins.toLocaleString()}</Text>
      </View>
      <NeonButton label="KEEP RUNNING" onPress={onRevive} />
      <NeonButton label="NO THANKS" variant="secondary" onPress={onDecline} />
    </Panel>
  );
}

const styles = StyleSheet.create({
  count: {
    textAlign: 'center',
    fontFamily: FONTS.bold,
    fontSize: 64,
    lineHeight: 70,
    color: UI.text,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  cost: { fontFamily: FONTS.bold, fontSize: 24, color: UI.gold },
  balance: { fontFamily: FONTS.medium, fontSize: 15, color: UI.textDim },
});
