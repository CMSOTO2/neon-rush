import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { playSfx } from '../audio/sfx';
import { FONTS } from '../constants/fonts';
import { ENVIRONMENTS, getEnvironment, UI } from '../constants/palette';
import { levelFromXp } from '../progression/levels';
import { useProfileStore } from '../store/profileStore';

// Selector for the world to run in. The arrows cycle through unlocked worlds (the scene
// behind the menu switches with them); the next locked world is teased underneath.
export function WorldPicker() {
  const world = useProfileStore((s) => s.profile.world);
  const xp = useProfileStore((s) => s.profile.xp);
  const setWorld = useProfileStore((s) => s.setWorld);
  const level = levelFromXp(xp).level;
  const unlocked = ENVIRONMENTS.filter((e) => level >= e.unlockLevel);
  const nextLocked = ENVIRONMENTS.find((e) => level < e.unlockLevel);
  const current = getEnvironment(world);
  const canCycle = unlocked.length > 1;

  const step = (dir: number) => {
    playSfx('click');
    const i = unlocked.findIndex((e) => e.id === current.id);
    setWorld(unlocked[(i + dir + unlocked.length) % unlocked.length].id);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {canCycle && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Previous world"
            hitSlop={10}
            onPress={() => step(-1)}
          >
            <Ionicons name="chevron-back" size={22} color={UI.text} />
          </Pressable>
        )}
        <Text style={styles.name} accessibilityLabel={`World: ${current.name}`}>
          {current.name}
        </Text>
        {canCycle && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Next world"
            hitSlop={10}
            onPress={() => step(1)}
          >
            <Ionicons name="chevron-forward" size={22} color={UI.text} />
          </Pressable>
        )}
      </View>
      {nextLocked && (
        <View style={styles.lock}>
          <Ionicons name="lock-closed" size={11} color={UI.gold} />
          <Text style={styles.lockText}>
            {nextLocked.name} unlocks at level {nextLocked.unlockLevel}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', marginTop: 12, gap: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(20, 10, 51, 0.72)',
    borderWidth: 1.5,
    borderColor: 'rgba(94, 242, 255, 0.35)',
  },
  name: { fontFamily: FONTS.bold, fontSize: 15, color: UI.text },
  lock: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  lockText: { fontFamily: FONTS.semibold, fontSize: 11, color: UI.gold },
});
