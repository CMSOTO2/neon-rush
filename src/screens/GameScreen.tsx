import { Canvas, Picture, useFont, type SkFont } from '@shopify/react-native-skia';
import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GameOverOverlay } from '../components/GameOverOverlay';
import { PauseButton } from '../components/PauseButton';
import { PauseOverlay } from '../components/PauseOverlay';
import { TitleOverlay } from '../components/TitleOverlay';
import { HUD_FONT_FILE } from '../constants/fonts';
import { NEON_CITY } from '../constants/palette';
import { DEFAULT_CHARACTER_ID } from '../game/characters/characters';
import { useGameLoop } from '../game/useGameLoop';
import { useGameStore } from '../store/gameStore';

export function GameScreen() {
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const hudFont = useFont(HUD_FONT_FILE, 40);
  const hudSmallFont = useFont(HUD_FONT_FILE, 20);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (!size || size.width !== width || size.height !== height) setSize({ width, height });
  };

  const ready = size && hudFont && hudSmallFont;
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
  const phase = useGameStore((s) => s.phase);
  const lastRun = useGameStore((s) => s.lastRun);
  const lastRunWasBest = useGameStore((s) => s.lastRunWasBest);
  const bestScore = useGameStore((s) => s.bestScore);

  const { picture, gesture, controls } = useGameLoop({
    width,
    height,
    hudTop: insets.top,
    characterId: DEFAULT_CHARACTER_ID,
    hudFont,
    hudSmallFont,
  });

  return (
    <View style={StyleSheet.absoluteFill}>
      <GestureDetector gesture={gesture}>
        <View style={StyleSheet.absoluteFill}>
          <Canvas style={StyleSheet.absoluteFill}>
            <Picture picture={picture} />
          </Canvas>
        </View>
      </GestureDetector>

      {phase === 'ready' && <TitleOverlay top={insets.top} best={bestScore} />}
      {phase === 'running' && <PauseButton top={insets.top + 12} onPress={controls.pause} />}
      {phase === 'paused' && (
        <PauseOverlay
          onResume={controls.resume}
          onRestart={controls.start}
          onMenu={controls.toMenu}
        />
      )}
      {phase === 'over' && lastRun && (
        <GameOverOverlay
          result={lastRun}
          isBest={lastRunWasBest}
          bestScore={bestScore}
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
