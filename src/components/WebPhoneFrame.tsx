import type { ReactNode } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';

// Web is only a testing target. On a desktop browser, render the app in a phone-shaped
// frame (about 9:19.5) so layout and framing match a real device. Native is untouched.
export function WebPhoneFrame({ children }: { children: ReactNode }) {
  const { width, height } = useWindowDimensions();
  if (Platform.OS !== 'web') return <>{children}</>;

  const phoneWidth = Math.min(width, Math.round(height * 0.462), 430);
  if (phoneWidth >= width) return <>{children}</>;

  return (
    <View style={styles.backdrop}>
      <View
        style={[styles.phone, { width: phoneWidth, height: Math.min(height, phoneWidth / 0.462) }]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#05020d', alignItems: 'center', justifyContent: 'center' },
  phone: { overflow: 'hidden', borderRadius: 24 },
});
