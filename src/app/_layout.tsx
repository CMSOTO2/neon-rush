import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useMusic } from '../audio/music';
import { WebPhoneFrame } from '../components/WebPhoneFrame';
import { FONT_SOURCES } from '../constants/fonts';
import { NEON_CITY } from '../constants/palette';

SplashScreen.preventAutoHideAsync().catch(() => {});

const MENU_SCREENS = ['levels', 'shop', 'characters', 'missions', 'achievements', 'settings'];

export default function RootLayout() {
  useMusic();
  const [fontsLoaded, fontError] = useFonts(FONT_SOURCES);
  const done = fontsLoaded || !!fontError;

  useEffect(() => {
    if (done) SplashScreen.hideAsync().catch(() => {});
  }, [done]);

  if (!done) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar hidden style="light" />
        <WebPhoneFrame>
          <Stack
            screenOptions={{
              headerShown: false,
              animation: 'fade',
              contentStyle: { backgroundColor: NEON_CITY.ground },
            }}
          >
            <Stack.Screen name="index" />
            {MENU_SCREENS.map((name) => (
              <Stack.Screen key={name} name={name} options={{ animation: 'slide_from_bottom' }} />
            ))}
          </Stack>
        </WebPhoneFrame>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NEON_CITY.ground },
});
