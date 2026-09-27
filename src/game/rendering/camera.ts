'worklet';

import { LANE_COUNT, LANE_WIDTH, PLAYER } from '../config';

// A pinhole camera behind and above the runner. Heights get an extra "boost" so the
// character and obstacles read large on tall phone screens (a stylised 2.5D look).
// All values derive from the viewport, so the framing adapts to any screen size.
export type Camera = {
  width: number;
  height: number;
  focal: number;
  horizonY: number;
  camHeight: number;
  heightBoost: number;
  back: number;
  near: number;
  // Per-frame values.
  x: number;
  z: number;
  // Extra camera height (in boosted units) while the runner is flying.
  lift: number;
  shakeX: number;
  shakeY: number;
  // Whole-scene vertical offset, used to frame the runner higher behind the main menu.
  offsetY: number;
};

const CAMERA_BACK = 6;
const ROAD_WIDTH_ON_SCREEN = 0.92;
const HORIZON = 0.34;
const FEET = 0.8;
const PLAYER_HEIGHT_ON_SCREEN = 0.15;

export function createCamera(width: number, height: number): Camera {
  const roadWidth = LANE_COUNT * LANE_WIDTH;
  // Keep the road from getting too wide on tablets, where width is the larger constraint.
  const roadPixels = Math.min(ROAD_WIDTH_ON_SCREEN * width, height * 0.62);
  const scaleAtPlayer = roadPixels / roadWidth;
  const focal = scaleAtPlayer * CAMERA_BACK;
  const horizonY = HORIZON * height;
  const camHeight = ((FEET - HORIZON) * height) / scaleAtPlayer;
  const boost = (PLAYER_HEIGHT_ON_SCREEN * height) / (PLAYER.standHeight * scaleAtPlayer);
  return {
    width,
    height,
    focal,
    horizonY,
    camHeight,
    heightBoost: Math.min(1.9, Math.max(1.1, boost)),
    back: CAMERA_BACK,
    // Far enough out that geometry passing the camera never projects to huge coordinates,
    // which some rasterizers (CanvasKit on web) drop entirely.
    near: 2,
    x: 0,
    z: 0,
    lift: 0,
    shakeX: 0,
    shakeY: 0,
    offsetY: 0,
  };
}

// Screen scale (pixels per meter) at world depth z, or 0 if behind the near plane.
export function scaleAt(cam: Camera, z: number): number {
  const dz = z - cam.z;
  return dz < cam.near ? 0 : cam.focal / dz;
}

export function sx(cam: Camera, x: number, s: number): number {
  return cam.width * 0.5 + (x - cam.x) * s + cam.shakeX;
}

export function sy(cam: Camera, y: number, s: number): number {
  return (
    cam.horizonY + (cam.camHeight + cam.lift - y * cam.heightBoost) * s + cam.shakeY + cam.offsetY
  );
}
