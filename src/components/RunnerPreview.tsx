import { Canvas, Picture, Skia, type SkFont, type SkPicture } from '@shopify/react-native-skia';
import { useCallback, useEffect, useMemo } from 'react';
import { useFrameCallback, useSharedValue, type FrameInfo } from 'react-native-reanimated';
import { scheduleOnUI } from 'react-native-worklets';

import { createGameState } from '../game/engine/state';
import { createCamera, type Camera } from '../game/rendering/camera';
import { drawRunner } from '../game/rendering/drawRunner';
import { createRenderResources } from '../game/rendering/resources';
import { PowerUpKind, type GameState } from '../game/types';
import type { Loadout } from '../progression/cosmetics';

type PreviewRuntime = { state: GameState; cam: Camera };

const empty = (() => {
  const rec = Skia.PictureRecorder();
  rec.beginRecording(Skia.XYWHRect(0, 0, 1, 1));
  return rec.finishRecordingAsPicture();
})();

// The runner idling on a little neon platform, drawn with the same code as the game so
// the preview always matches what you'll see in a run. `showBoard` puts them on their
// hoverboard (as during a speed boost).
export function RunnerPreview({
  width,
  height,
  loadout,
  font,
  showBoard,
}: {
  width: number;
  height: number;
  loadout: Loadout;
  font: SkFont;
  showBoard: boolean;
}) {
  const runtime = useSharedValue<PreviewRuntime | null>(null);
  const picture = useSharedValue<SkPicture>(empty);
  const { character, outfit, accessory, trail, board } = loadout;

  const res = useMemo(
    () =>
      createRenderResources(
        width,
        height,
        0,
        height * 0.3,
        font,
        font,
        {
          character,
          outfit,
          accessory,
          trail,
          board,
        },
        'city',
        0,
      ),
    [width, height, font, character, outfit, accessory, trail, board],
  );

  useEffect(() => {
    scheduleOnUI(() => {
      'worklet';
      const state = createGameState(width, height, character, 1);
      const cam = createCamera(width, height);
      // Frame the runner much larger than in-game: about 60% of the preview's height,
      // feet near the bottom.
      const s = cam.focal / cam.back;
      cam.z = -cam.back;
      cam.heightBoost = (0.6 * height) / 1.8 / (s * 0.92);
      cam.horizonY = height * 0.86 - cam.camHeight * s;
      runtime.set({ state, cam });
    });
  }, [runtime, width, height, character]);

  const onFrame = useCallback(
    (info: FrameInfo) => {
      'worklet';
      const rt = runtime.get();
      if (!rt) return;
      const dt = (info.timeSincePreviousFrame ?? 16) / 1000;
      rt.state.time += dt;
      rt.state.power[PowerUpKind.Boost] = showBoard ? 1 : 0;
      const canvas = res.recorder.beginRecording(res.bounds);
      // Glowing platform under the runner.
      const cx = width / 2;
      const cy = height * 0.86;
      res.fill.setColor(res.env.roadEdge);
      res.fill.setAlphaf(0.25);
      canvas.save();
      canvas.translate(cx, cy);
      canvas.scale(1, 0.28);
      canvas.drawCircle(0, 0, width * 0.36, res.fill);
      res.fill.setColor(res.ui.accent);
      res.fill.setAlphaf(0.35);
      canvas.drawCircle(0, 0, width * 0.26, res.fill);
      canvas.restore();
      drawRunner(canvas, res, rt.cam, rt.state);
      picture.set(res.recorder.finishRecordingAsPicture());
    },
    [runtime, picture, res, showBoard, width, height],
  );
  useFrameCallback(onFrame, true);

  return (
    <Canvas style={{ width, height }}>
      <Picture picture={picture} />
    </Canvas>
  );
}
