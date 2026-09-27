'worklet';

import type { SkCanvas, SkColor } from '@shopify/react-native-skia';

import { scaleAt, sx, sy, type Camera } from './camera';
import type { RenderResources } from './resources';

// Screen-space rectangle of the last box's front face, for decorations. `valid` is false
// when the front was clipped by the near plane (the box is passing the camera).
export type FaceRect = { l: number; r: number; t: number; b: number; s: number; valid: boolean };

export function createFaceRect(): FaceRect {
  return { l: 0, r: 0, t: 0, b: 0, s: 0, valid: false };
}

// Appends a quad to the shared path builder without drawing it, so many same-coloured
// quads can be batched into one draw call with flushPath.
export function addQuad(
  res: RenderResources,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  dx: number,
  dy: number,
): void {
  const pb = res.pb;
  pb.moveTo(ax, ay);
  pb.lineTo(bx, by);
  pb.lineTo(cx, cy);
  pb.lineTo(dx, dy);
  pb.close();
}

export function flushPath(
  canvas: SkCanvas,
  res: RenderResources,
  color: SkColor,
  alpha: number,
): void {
  res.fill.setColor(color);
  res.fill.setAlphaf(alpha);
  canvas.drawPath(res.pb.detach(), res.fill);
}

export function fillQuad(
  canvas: SkCanvas,
  res: RenderResources,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  dx: number,
  dy: number,
  color: SkColor,
  alpha: number,
): void {
  addQuad(res, ax, ay, bx, by, cx, cy, dx, dy);
  flushPath(canvas, res, color, alpha);
}

export function fillRect(
  canvas: SkCanvas,
  res: RenderResources,
  l: number,
  t: number,
  r: number,
  b: number,
  color: SkColor,
  alpha: number,
): void {
  res.rect.setXYWH(l, t, r - l, b - t);
  res.fill.setColor(color);
  res.fill.setAlphaf(alpha);
  canvas.drawRect(res.rect, res.fill);
}

// Appends a flat strip on the ground (y = 0) between x0..x1 and z0..z1, clipped to the
// near plane. Returns false if nothing is visible.
export function addGroundQuad(
  res: RenderResources,
  cam: Camera,
  x0: number,
  x1: number,
  z0: number,
  z1: number,
): boolean {
  const zn = Math.max(z0, cam.z + cam.near);
  if (z1 <= zn) return false;
  const sn = scaleAt(cam, zn);
  const sf = scaleAt(cam, z1);
  const yn = sy(cam, 0, sn);
  const yf = sy(cam, 0, sf);
  addQuad(res, sx(cam, x0, sn), yn, sx(cam, x1, sn), yn, sx(cam, x1, sf), yf, sx(cam, x0, sf), yf);
  return true;
}

export function groundQuad(
  canvas: SkCanvas,
  res: RenderResources,
  cam: Camera,
  x0: number,
  x1: number,
  z0: number,
  z1: number,
  color: SkColor,
  alpha: number,
): void {
  if (addGroundQuad(res, cam, x0, x1, z0, z1)) flushPath(canvas, res, color, alpha);
}

// Axis-aligned box with shaded front, visible side and (when the camera is above it) top.
export function drawBox(
  canvas: SkCanvas,
  res: RenderResources,
  cam: Camera,
  face: FaceRect,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  z0: number,
  z1: number,
  front: SkColor,
  side: SkColor,
  top: SkColor,
  alpha: number,
): void {
  face.valid = false;
  const zn = Math.max(z0, cam.z + cam.near);
  if (z1 <= zn || alpha <= 0) return;
  const sn = scaleAt(cam, zn);
  const sf = scaleAt(cam, z1);

  const lN = sx(cam, x0, sn);
  const rN = sx(cam, x1, sn);
  const bN = sy(cam, y0, sn);
  const tN = sy(cam, y1, sn);
  const lF = sx(cam, x0, sf);
  const rF = sx(cam, x1, sf);
  const bF = sy(cam, y0, sf);
  const tF = sy(cam, y1, sf);

  if (cam.x < x0) {
    fillQuad(canvas, res, lN, bN, lF, bF, lF, tF, lN, tN, side, alpha);
  } else if (cam.x > x1) {
    fillQuad(canvas, res, rN, bN, rF, bF, rF, tF, rN, tN, side, alpha);
  }
  if (cam.camHeight + cam.lift > y1 * cam.heightBoost) {
    fillQuad(canvas, res, lN, tN, rN, tN, rF, tF, lF, tF, top, alpha);
  }
  fillRect(canvas, res, lN, tN, rN, bN, front, alpha);

  face.l = lN;
  face.r = rN;
  face.t = tN;
  face.b = bN;
  face.s = sn;
  face.valid = zn === z0;
}

// Objects fade in over the last stretch of the draw distance instead of popping.
export function distanceFade(cam: Camera, z: number, drawDistance: number): number {
  const a = (cam.z + drawDistance - z) / 30;
  return a <= 0 ? 0 : a >= 1 ? 1 : a;
}
