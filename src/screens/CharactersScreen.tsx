import Ionicons from '@expo/vector-icons/Ionicons';
import { useFont } from '@shopify/react-native-skia';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { playSfx } from '../audio/sfx';
import { NeonButton } from '../components/NeonButton';
import { RunnerPreview } from '../components/RunnerPreview';
import { CoinIcon } from '../components/ui/CoinPill';
import { ScreenShell } from '../components/ui/ScreenShell';
import { FONTS, HUD_FONT_FILE } from '../constants/fonts';
import { UI } from '../constants/palette';
import { getCharacter } from '../game/characters/characters';
import { ACHIEVEMENTS } from '../progression/achievements';
import {
  itemsFor,
  unlockLabel,
  type CosmeticItem,
  type CosmeticSlot,
  type Loadout,
} from '../progression/cosmetics';
import { useProfileStore } from '../store/profileStore';

const TABS: { slot: CosmeticSlot; label: string }[] = [
  { slot: 'character', label: 'Runners' },
  { slot: 'outfit', label: 'Outfits' },
  { slot: 'accessory', label: 'Gear' },
  { slot: 'trail', label: 'Trails' },
  { slot: 'board', label: 'Boards' },
];

export function CharactersScreen() {
  const { width } = useWindowDimensions();
  const profile = useProfileStore((s) => s.profile);
  const equip = useProfileStore((s) => s.equip);
  const buy = useProfileStore((s) => s.buyCosmetic);
  const font = useFont(HUD_FONT_FILE, 20);
  const [tab, setTab] = useState<CosmeticSlot>('character');
  // Tapping a locked item previews it without equipping.
  const [preview, setPreview] = useState<CosmeticItem | null>(null);

  const items = itemsFor(tab, profile.loadout.character);
  const shown: Loadout = { ...profile.loadout };
  if (preview) {
    shown[preview.slot] = preview.id;
    if (preview.slot === 'character') shown.outfit = `${preview.id}-default`;
  }
  const previewW = Math.min(width - 32, 360);
  const character = getCharacter(shown.character);

  const select = (item: CosmeticItem) => {
    if (profile.owned.includes(item.id)) {
      equip(item.slot, item.id);
      setPreview(null);
    } else {
      setPreview(item);
    }
  };

  return (
    <ScreenShell title="Runners">
      <View style={styles.previewCard}>
        {font && (
          <RunnerPreview
            width={previewW}
            height={240}
            loadout={shown}
            font={font}
            showBoard={tab === 'board'}
          />
        )}
        <Text style={styles.name}>{character.name}</Text>
        <Text style={styles.tagline}>{character.tagline}</Text>
      </View>

      <View style={styles.tabs} accessibilityRole="tablist">
        {TABS.map((t) => (
          <Pressable
            key={t.slot}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === t.slot }}
            onPressIn={() => playSfx('click')}
            onPress={() => {
              setTab(t.slot);
              setPreview(null);
            }}
            style={[styles.tab, tab === t.slot && styles.tabActive]}
          >
            <Text style={[styles.tabText, tab === t.slot && styles.tabTextActive]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.grid}>
        {items.map((item) => {
          const owned = profile.owned.includes(item.id);
          const equipped = profile.loadout[item.slot] === item.id;
          const previewing = preview?.id === item.id;
          const achievement =
            item.unlock.type === 'achievement'
              ? ACHIEVEMENTS.find((a) => a.id === (item.unlock as { id: string }).id)?.name
              : undefined;
          return (
            <Animated.View key={item.id} entering={FadeIn} style={styles.cell}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${item.name}, ${equipped ? 'equipped' : owned ? 'owned' : unlockLabel(item.unlock, achievement)}`}
                onPressIn={() => playSfx('click')}
                onPress={() => select(item)}
                style={[
                  styles.item,
                  equipped && styles.itemEquipped,
                  previewing && styles.itemPreview,
                ]}
              >
                <View style={[styles.swatch, { backgroundColor: item.color }]}>
                  {!owned && <Ionicons name="lock-closed" size={18} color="#ffffff" />}
                  {equipped && <Ionicons name="checkmark" size={20} color="#ffffff" />}
                </View>
                <Text style={styles.itemName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={[styles.itemState, owned && { color: UI.accent }]} numberOfLines={2}>
                  {equipped
                    ? 'Equipped'
                    : owned
                      ? 'Tap to equip'
                      : unlockLabel(item.unlock, achievement)}
                </Text>
              </Pressable>
            </Animated.View>
          );
        })}
      </View>

      {preview && preview.unlock.type === 'coins' && (
        <View style={styles.buyRow}>
          <CoinIcon size={20} />
          <Text style={styles.buyCost}>{preview.unlock.cost.toLocaleString()}</Text>
          <View style={styles.flex} />
          <NeonButton
            label={profile.coins >= preview.unlock.cost ? 'UNLOCK' : 'NEED MORE COINS'}
            variant={profile.coins >= preview.unlock.cost ? 'primary' : 'secondary'}
            onPress={() => {
              if (buy(preview.id)) {
                playSfx('powerup');
                equip(preview.slot, preview.id);
                setPreview(null);
              }
            }}
          />
        </View>
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  previewCard: {
    alignItems: 'center',
    paddingBottom: 12,
    borderRadius: 24,
    backgroundColor: 'rgba(123, 92, 255, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(123, 92, 255, 0.4)',
    overflow: 'hidden',
  },
  name: { fontFamily: FONTS.bold, fontSize: 26, color: UI.text },
  tagline: { fontFamily: FONTS.medium, fontSize: 14, color: UI.textDim },
  tabs: { flexDirection: 'row', gap: 6 },
  tab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  tabActive: { backgroundColor: UI.accentHot },
  tabText: { fontFamily: FONTS.semibold, fontSize: 13, color: UI.textDim },
  tabTextActive: { color: UI.text },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5 },
  cell: { width: '50%', padding: 5 },
  item: {
    padding: 12,
    gap: 6,
    borderRadius: 18,
    backgroundColor: 'rgba(20, 10, 51, 0.9)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  itemEquipped: { borderColor: UI.accent },
  itemPreview: { borderColor: UI.gold },
  swatch: {
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemName: { fontFamily: FONTS.bold, fontSize: 16, color: UI.text },
  itemState: { fontFamily: FONTS.medium, fontSize: 12, color: UI.textDim, minHeight: 30 },
  buyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 216, 74, 0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 216, 74, 0.5)',
  },
  buyCost: { fontFamily: FONTS.bold, fontSize: 20, color: UI.gold },
  flex: { flex: 1 },
});
