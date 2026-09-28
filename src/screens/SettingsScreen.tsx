import Constants from 'expo-constants';
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { playSfx } from '../audio/sfx';
import { NeonButton } from '../components/NeonButton';
import { ScreenShell } from '../components/ui/ScreenShell';
import { FONTS } from '../constants/fonts';
import { UI } from '../constants/palette';
import type { Settings } from '../progression/profile';
import { useGameStore } from '../store/gameStore';
import { useProfileStore } from '../store/profileStore';

const TOGGLES: { key: keyof Settings; label: string; detail: string }[] = [
  { key: 'music', label: 'Music', detail: 'Synthwave soundtrack' },
  { key: 'sfx', label: 'Sound effects', detail: 'Coins, jumps, power-ups and crashes' },
  { key: 'haptics', label: 'Vibration', detail: 'A buzz when you hit something' },
  {
    key: 'reduceMotion',
    label: 'Reduce motion',
    detail: 'No screen shake, speed lines or flashing',
  },
];

export function SettingsScreen() {
  const settings = useProfileStore((s) => s.profile.settings);
  const setSetting = useProfileStore((s) => s.setSetting);
  const resetProgress = useProfileStore((s) => s.resetProgress);
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <ScreenShell title="Settings">
      <View style={styles.card}>
        {TOGGLES.map((t, i) => (
          <Pressable
            key={t.key}
            accessibilityRole="switch"
            accessibilityState={{ checked: settings[t.key] }}
            accessibilityLabel={t.label}
            onPress={() => setSetting(t.key, !settings[t.key])}
            style={[styles.row, i > 0 && styles.divider]}
          >
            <View style={styles.info}>
              <Text style={styles.label}>{t.label}</Text>
              <Text style={styles.detail}>{t.detail}</Text>
            </View>
            <Switch
              value={settings[t.key]}
              onValueChange={(v) => {
                setSetting(t.key, v);
                if (t.key === 'sfx' && v) playSfx('click');
              }}
              trackColor={{ true: UI.accentHot, false: 'rgba(255,255,255,0.2)' }}
              thumbColor="#ffffff"
            />
          </Pressable>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Reset progress</Text>
        <Text style={styles.detail}>
          Deletes coins, upgrades, unlocks, missions and records on this device. This can’t be
          undone.
        </Text>
        {confirmReset ? (
          <View style={styles.confirm}>
            <NeonButton
              label="YES, RESET"
              onPress={() => {
                resetProgress();
                useGameStore.setState({ lastRun: null, rewards: null });
                setConfirmReset(false);
              }}
            />
            <NeonButton label="CANCEL" variant="secondary" onPress={() => setConfirmReset(false)} />
          </View>
        ) : (
          <NeonButton
            label="RESET PROGRESS"
            variant="secondary"
            onPress={() => setConfirmReset(true)}
          />
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>About</Text>
        <Text style={styles.detail}>
          Neon Rush {Constants.expoConfig?.version ?? ''}. Plays fully offline; progress is saved on
          this device. Font: Fredoka (SIL Open Font License). Sounds and artwork are original to
          this game.
        </Text>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 10,
    padding: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(20, 10, 51, 0.9)',
    borderWidth: 1.5,
    borderColor: 'rgba(123, 92, 255, 0.3)',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.15)',
    paddingTop: 12,
  },
  info: { flex: 1, gap: 2 },
  label: { fontFamily: FONTS.bold, fontSize: 17, color: UI.text },
  detail: { fontFamily: FONTS.medium, fontSize: 13, color: UI.textDim, lineHeight: 19 },
  confirm: { gap: 10 },
});
