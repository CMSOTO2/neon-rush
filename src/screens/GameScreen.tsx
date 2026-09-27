import { Canvas, Picture, useFont, type SkFont } from '@shopify/react-native-skia';
import { useIsFocused } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GameOverOverlay } from '../components/GameOverOverlay';
import { PauseButton } from '../components/PauseButton';
import { PauseOverlay } from '../components/PauseOverlay';
import { MainMenu } from '../components/MainMenu';
import { ReviveOverlay } from '../components/ReviveOverlay';
import { HUD_FONT_FILE } from '../constants/fonts';
import { NEON_CITY } from '../constants/palette';
import { useGameLoop } from '../game/useGameLoop';
import { reviveCost } from '../progression/economy';
import { useGameStore } from '../store/gameStore';
import { useProfileStore } from '../store/profileStore';

export function GameScreen() {
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const hudFont = useFont(HUD_FONT_FILE, 40);
  const hudSmallFont = useFont(HUD_FONT_FILE, 20);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (!size || size.width !== width || size.height !== height) setSize({ width, height });
  };

  // Wait for the saved profile so the menu never flashes empty values.
  const hydrated = useProfileStore((s) => s.hydrated);
  const ready = size && hudFont && hudSmallFont && hydrated;
  return (
    <View style={styles.root} onLayout={onLayout}>
      {ready && (
        // Remount on resize so the camera and cached backdrop match the new viewport.
        <Game
          key={`${size.width}x${size.height}`}
          width={size.width}
          height={size.height}
          hudFont={hudFont}
          hudSmallFont={hudSmallFont}
        />
      )}
    </View>
  );
}

type GameProps = { width: number; height: number; hudFont: SkFont; hudSmallFont: SkFont };

function Game({ width, height, hudFont, hudSmallFont }: GameProps) {
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const phase = useGameStore((s) => s.phase);
  const lastRun = useGameStore((s) => s.lastRun);
  const rewards = useGameStore((s) => s.rewards);
  const revivesUsed = useGameStore((s) => s.revivesUsed);
  const loadout = useProfileStore((s) => s.profile.loadout);
  const upgrades = useProfileStore((s) => s.profile.upgrades);

  const { picture, gesture, controls } = useGameLoop({
    width,
    height,
    hudTop: insets.top,
    loadout,
    upgrades,
    hudFont,
    hudSmallFont,
    focused,
  });

  const cost = reviveCost(revivesUsed);

  return (
    <View style={StyleSheet.absoluteFill}>
      <GestureDetector gesture={gesture}>
        <View style={StyleSheet.absoluteFill}>
          <Canvas style={StyleSheet.absoluteFill}>
            <Picture picture={picture} />
          </Canvas>
        </View>
      </GestureDetector>

      {phase === 'ready' && (
        <MainMenu top={insets.top} bottom={insets.bottom} onPlay={controls.start} />
      )}
      {phase === 'running' && <PauseButton top={insets.top + 12} onPress={controls.pause} />}
      {phase === 'paused' && (
        <PauseOverlay
          onResume={controls.resume}
          onRestart={controls.start}
          onMenu={controls.toMenu}
        />
      )}
      {phase === 'revive' && cost !== null && (
        <ReviveOverlay cost={cost} onRevive={controls.revive} onDecline={controls.declineRevive} />
      )}
      {phase === 'over' && lastRun && (
        <GameOverOverlay
          result={lastRun}
          rewards={rewards}
          onRestart={controls.start}
          onMenu={controls.toMenu}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NEON_CITY.ground },
});
