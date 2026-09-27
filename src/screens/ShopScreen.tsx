import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { playSfx } from '../audio/sfx';
import { NeonButton } from '../components/NeonButton';
import { CoinIcon } from '../components/ui/CoinPill';
import { ScreenShell } from '../components/ui/ScreenShell';
import { FONTS } from '../constants/fonts';
import { UI } from '../constants/palette';
import { durationFor, MAX_UPGRADE_LEVEL, POWERUPS } from '../game/powerups/powerups';
import { PowerUpKind } from '../game/types';
import { upgradeCost } from '../progression/economy';
import { useProfileStore } from '../store/profileStore';

const ICONS: Record<number, ComponentProps<typeof Ionicons>['name']> = {
  [PowerUpKind.Magnet]: 'magnet',
  [PowerUpKind.Shield]: 'shield',
  [PowerUpKind.Jetpack]: 'rocket',
  [PowerUpKind.Multiplier]: 'sparkles',
  [PowerUpKind.Boost]: 'flash',
};

// The speed boost upgrade doubles as the Starting Boost: from level 1, every run begins
// with a boost of the upgraded length.
function describe(kind: number, level: number): string {
  const secs = `${durationFor(kind, level).toFixed(1).replace(/\.0$/, '')}s`;
  if (kind === PowerUpKind.Boost)
    return level === 0 ? 'No starting boost' : `${secs} starting boost`;
  return secs;
}

export function ShopScreen() {
  const profile = useProfileStore((s) => s.profile);
  const buy = useProfileStore((s) => s.buyUpgrade);

  return (
    <ScreenShell title="Upgrades">
      <Text style={styles.intro}>Longer power-ups, earned with the coins you collect.</Text>
      {POWERUPS.map((p, i) => {
        const level = profile.upgrades[p.kind];
        const cost = upgradeCost(level);
        const maxed = cost === null;
        const affordable = cost !== null && profile.coins >= cost;
        const name = p.kind === PowerUpKind.Boost ? 'Starting Boost' : p.name;
        const description =
          p.kind === PowerUpKind.Boost
            ? 'Start every run with a speed boost. Also lengthens boost pickups.'
            : p.description;
        return (
          <Animated.View key={p.id} entering={FadeInDown.delay(i * 60)} style={styles.card}>
            <View style={styles.row}>
              <View style={[styles.icon, { backgroundColor: p.color }]}>
                <Ionicons name={ICONS[p.kind]} size={26} color="#ffffff" />
              </View>
              <View style={styles.info}>
                <Text style={styles.name}>{name}</Text>
                <Text style={styles.desc}>{description}</Text>
              </View>
            </View>

            <View style={styles.pips} accessibilityLabel={`Level ${level} of ${MAX_UPGRADE_LEVEL}`}>
              {Array.from({ length: MAX_UPGRADE_LEVEL }, (_, n) => (
                <View
                  key={n}
                  style={[
                    styles.pip,
                    n < level && { backgroundColor: p.color, borderColor: p.color },
                  ]}
                />
              ))}
            </View>

            <View style={styles.row}>
              <View style={styles.info}>
                <Text style={styles.durationLabel}>Now</Text>
                <Text style={styles.duration}>{describe(p.kind, level)}</Text>
                {!maxed && (
                  <>
                    <Text style={styles.durationLabel}>Next level</Text>
                    <Text style={[styles.duration, { color: UI.accent }]}>
                      {describe(p.kind, level + 1)}
                    </Text>
                  </>
                )}
              </View>
              {maxed ? (
                <Text style={styles.maxed}>MAXED</Text>
              ) : (
                <View style={styles.buy}>
                  <View style={styles.cost}>
                    <CoinIcon size={18} />
                    <Text style={[styles.costText, !affordable && { color: UI.textDim }]}>
                      {cost.toLocaleString()}
                    </Text>
                  </View>
                  <NeonButton
                    label="UPGRADE"
                    variant={affordable ? 'primary' : 'secondary'}
                    accessibilityHint={affordable ? undefined : 'Not enough coins yet'}
                    onPress={() => {
                      if (buy(p.kind)) playSfx('powerup');
                    }}
                  />
                </View>
              )}
            </View>
          </Animated.View>
        );
      })}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  intro: { fontFamily: FONTS.medium, fontSize: 14, color: UI.textDim },
  card: {
    gap: 12,
    padding: 14,
    borderRadius: 20,
    backgroundColor: 'rgba(20, 10, 51, 0.9)',
    borderWidth: 1.5,
    borderColor: 'rgba(123, 92, 255, 0.35)',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, gap: 2 },
  name: { fontFamily: FONTS.bold, fontSize: 18, color: UI.text },
  desc: { fontFamily: FONTS.medium, fontSize: 13, color: UI.textDim },
  pips: { flexDirection: 'row', gap: 6 },
  pip: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  durationLabel: { fontFamily: FONTS.semibold, fontSize: 11, color: UI.textDim, letterSpacing: 1 },
  duration: { fontFamily: FONTS.bold, fontSize: 15, color: UI.text },
  buy: { alignItems: 'flex-end', gap: 6 },
  cost: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  costText: { fontFamily: FONTS.bold, fontSize: 17, color: UI.gold },
  maxed: { fontFamily: FONTS.bold, fontSize: 18, color: UI.gold, letterSpacing: 2 },
});
