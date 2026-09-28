import { Canvas, Picture, useFont, type SkFont } from '@shopify/react-native-skia';
import { router, useIsFocused } from 'expo-router';
import { useEffect, useState } from 'react';
import { BackHandler, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GameOverOverlay } from '../components/GameOverOverlay';
import { PauseButton } from '../components/PauseButton';
import { PauseOverlay } from '../components/PauseOverlay';
import { LevelCompleteOverlay } from '../components/LevelCompleteOverlay';
import { MainMenu } from '../components/MainMenu';
import { menuLayout } from '../components/menuLayout';
import { ReviveOverlay } from '../components/ReviveOverlay';
import { DEV } from '../constants/dev';
import { HUD_FONT_FILE } from '../constants/fonts';
import { NEON_CITY } from '../constants/palette';
import { useGameLoop } from '../game/useGameLoop';
import { CAMPAIGN, nextLevel } from '../progression/campaign';
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
  const savedWorld = useProfileStore((s) => s.profile.world);
  const level = useGameStore((s) => s.level);
  const pendingLevel = useGameStore((s) => s.pendingLevel);
  const levelResult = useGameStore((s) => s.levelResult);
  // Levels play in their own world; endless uses the one picked on the menu.
  const world = DEV.world ?? level?.world ?? savedWorld;
  const layout = menuLayout(width, height, insets);

  const { picture, gesture, controls } = useGameLoop({
    width,
    height,
    hudTop: insets.top,
    menuShift: layout.shift,
    loadout,
    upgrades,
    world,
    hudFont,
    hudSmallFont,
    focused,
  });

  const cost = reviveCost(revivesUsed);

  // Dev builds can jump straight into a level (EXPO_PUBLIC_LEVEL=n).
  useEffect(() => {
    const def = CAMPAIGN[DEV.level - 1];
    if (def) useGameStore.getState().requestLevel(def);
  }, []);

  // A level picked on the level-select screen starts once the game is on screen again.
  useEffect(() => {
    if (!focused || !pendingLevel) return;
    useGameStore.setState({ pendingLevel: null });
    controls.startLevel(pendingLevel);
  }, [focused, pendingLevel, controls]);

  // Android back button: pause mid-run, resume from pause, and leave result screens for
  // the menu. It never exits mid-run; on the menu it does what Android normally does.
  // Other screens (shop, levels...) are left to the router.
  useEffect(() => {
    if (!focused) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      switch (useGameStore.getState().phase) {
        case 'running':
          controls.pause();
          return true;
        case 'paused':
          controls.resume();
          return true;
        case 'revive':
          controls.declineRevive();
          return true;
        case 'over':
        case 'complete':
          controls.toMenu();
          return true;
        default:
          return false;
      }
    });
    return () => sub.remove();
  }, [focused, controls]);

  const next = level ? nextLevel(level) : undefined;

  return (
    <View style={StyleSheet.absoluteFill}>
      <GestureDetector gesture={gesture}>
        <View
          style={StyleSheet.absoluteFill}
          accessible={phase === 'running'}
          accessibilityLabel="Game track"
          accessibilityHint="Swipe up to jump, down to slide, left or right to change lanes"
        >
          <Canvas style={StyleSheet.absoluteFill}>
            <Picture picture={picture} />
          </Canvas>
        </View>
      </GestureDetector>

      {phase === 'ready' && (
        <MainMenu top={insets.top} bottom={insets.bottom} layout={layout} onPlay={controls.start} />
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
      {phase === 'complete' && level && levelResult && lastRun && (
        <LevelCompleteOverlay
          level={level}
          result={levelResult}
          run={lastRun}
          rewards={rewards}
          hasNext={!!next}
          onNext={() => next && controls.startLevel(next)}
          onReplay={controls.start}
          onLevels={() => {
            controls.toMenu();
            router.push('/levels');
          }}
        />
      )}
      {phase === 'over' && lastRun && (
        <GameOverOverlay
          result={lastRun}
          rewards={rewards}
          level={level}
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
