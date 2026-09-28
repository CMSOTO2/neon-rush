import { PLAYER } from '../game/config';
import { createCamera } from '../game/rendering/camera';

// Height of the menu's bottom block (play row, hint, tiles) and the gap under it.
const BOTTOM_BLOCK = { compact: 128, regular: 172 };
const BOTTOM_MARGIN = 14;
// Room under the runner's feet for the shadow and a hoverboard.
const FOOT_ROOM = 20;
// Hair, hats and the idle bob stick out above the body.
const HEAD_ROOM = 1.22;
const MAX_SHIFT = 0.16;

export type MenuLayout = {
  compact: boolean;
  // Scene offset (px) behind the menu, handed to the renderer.
  shift: number;
  // Free space above the runner's head, from the top inset down.
  topBlock: number;
  bottomBlock: number;
};

// The runner idles on the track behind the main menu, so the menu is laid out around it:
// the scene is raised just enough that the runner's feet clear the buttons at the bottom,
// and the title, world picker and cards share whatever is left above its head. Screen
// size drives everything, so an iPhone SE and a Pro Max both get a clear runner.
export function menuLayout(
  width: number,
  height: number,
  insets: { top: number; bottom: number },
): MenuLayout {
  const compact = height < 740 || width < 360;
  const cam = createCamera(width, height);
  const pxPerMeter = cam.focal / cam.back;
  const runner = PLAYER.standHeight * cam.heightBoost * pxPerMeter * HEAD_ROOM;
  const bottomBlock = compact ? BOTTOM_BLOCK.compact : BOTTOM_BLOCK.regular;

  // Where the feet would be with no offset, and where they need to be.
  const feet = cam.horizonY + cam.camHeight * pxPerMeter;
  const feetGoal = height - insets.bottom - BOTTOM_MARGIN - bottomBlock - FOOT_ROOM;
  const shift = Math.min(height * MAX_SHIFT, Math.max(0, feet - feetGoal));
  const head = feet - shift - runner;
  return { compact, shift, topBlock: Math.max(0, head - insets.top - 12), bottomBlock };
}
