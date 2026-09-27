import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { playSfx } from '../../audio/sfx';
import { FONTS } from '../../constants/fonts';
import { UI } from '../../constants/palette';
import { useProfileStore } from '../../store/profileStore';
import { CoinPill } from './CoinPill';

// Common frame for the menu screens: back button, title, coin balance, scrolling body.
export function ScreenShell({
  title,
  children,
  scroll = true,
}: {
  title: string;
  children: ReactNode;
  scroll?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const coins = useProfileStore((s) => s.profile.coins);
  const Body = scroll ? ScrollView : View;
  return (
    <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={12}
          onPressIn={() => playSfx('click')}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          style={({ pressed }) => [styles.back, pressed && { transform: [{ scale: 0.9 }] }]}
        >
          <Ionicons name="chevron-back" size={26} color={UI.text} />
        </Pressable>
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        <CoinPill amount={coins} />
      </View>
      <Body
        style={styles.body}
        contentContainerStyle={
          scroll ? [styles.content, { paddingBottom: insets.bottom + 32 }] : undefined
        }
      >
        {children}
      </Body>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#140a33' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  back: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { flex: 1, fontFamily: FONTS.bold, fontSize: 26, color: UI.text, letterSpacing: 1 },
  body: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 12 },
});
