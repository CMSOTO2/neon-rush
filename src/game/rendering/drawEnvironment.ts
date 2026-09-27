'worklet';

import type { SkCanvas } from '@shopify/react-native-skia';

import { LANE_COUNT, LANE_WIDTH, WORLD } from '../config';
import { hash01 } from '../engine/random';
import { scaleAt, sx, sy, type Camera } from './camera';
import {
  addGroundQuad,
  distanceFade,
  drawBox,
  fillQuad,
  fillRect,
  flushPath,
  groundQuad,
  type FaceRect,
} from './primitives';
import type { RenderResources } from './resources';

const ROAD_HALF = (LANE_COUNT * LANE_WIDTH) / 2 + 0.35;
const BUILDING_SLOT = 11;

export function drawSkyAndGround(canvas: SkCanvas, res: RenderResources, cam: Camera): void {
  canvas.save();
  canvas.translate(-cam.x * 5 + cam.shakeX * 0.3, cam.offsetY);
  canvas.drawPicture(res.backdrop);
  canvas.restore();

  res.fill.setShader(res.groundShade);
  const groundTop = cam.horizonY + cam.offsetY;
  res.rect.setXYWH(0, groundTop, cam.width, cam.height - groundTop);
  res.fill.setAlphaf(1);
  canvas.drawRect(res.rect, res.fill);
  res.fill.setShader(null);

  // Receding grid on the ground outside the road.
  const stroke = res.stroke;
  stroke.setColor(res.env.groundGrid);
  stroke.setStrokeWidth(1);
  const far = cam.z + WORLD.drawDistance;
  const spacing = 8;
  for (let z = Math.ceil((cam.z + cam.near + 1) / spacing) * spacing; z < far; z += spacing) {
    const s = scaleAt(cam, z);
    const y = sy(cam, 0, s);
    const gridAlpha = res.env.scenery === 1 ? 0.12 : 0.35;
    stroke.setAlphaf(gridAlpha * distanceFade(cam, z, WORLD.drawDistance));
    canvas.drawLine(0, y, cam.width, y, stroke);
  }
  // The beach keeps only faint ripple lines; the city gets the full neon grid.
  if (res.env.scenery === 1) return;
  const sNear = scaleAt(cam, cam.z + cam.near);
  const sFar = scaleAt(cam, far);
  stroke.setAlphaf(0.28);
  for (let k = 0; k < 7; k++) {
    const off = ROAD_HALF + 2 + k * 5;
    for (let side = -1; side <= 1; side += 2) {
      const x = side * off;
      canvas.drawLine(
        sx(cam, x, sNear),
        sy(cam, 0, sNear),
        sx(cam, x, sFar),
        sy(cam, 0, sFar),
        stroke,
      );
    }
  }
}

const PALM_SLOT = 9;
const TRUNK = [0.55, 0.4, 0.31];
const FRONDS = [0.35, 0.8, 1.3, 1.9, 2.4, 2.8, 3.1];

// Beach scenery: leaning palm trees with drooping fronds, and every few slots a
// brightly painted beach hut with a glowing lamp.
function drawPalms(
  canvas: SkCanvas,
  res: RenderResources,
  cam: Camera,
  face: FaceRect,
  time: number,
): void {
  const first = Math.floor((cam.z - 4) / PALM_SLOT);
  const last = Math.floor((cam.z + WORLD.drawDistance) / PALM_SLOT);
  const env = res.env;
  for (let i = last; i >= first; i--) {
    for (let side = -1; side <= 1; side += 2) {
      const id = i * 2 + (side > 0 ? 1 : 0);
      const h1 = hash01(id);
      const h2 = hash01(id + 7919);
      const z = i * PALM_SLOT + h2 * 3;
      if (z <= cam.z + cam.near + 0.5) continue;
      const alpha = distanceFade(cam, z, WORLD.drawDistance);
      if (alpha <= 0) continue;
      const x = side * (ROAD_HALF + 2.5 + h1 * 5);

      if (hash01(id + 31) < 0.22) {
        // Beach hut.
        const ci = Math.floor(h2 * env.buildings.length) % env.buildings.length;
        const x0 = side < 0 ? x - 3 : x;
        drawBox(
          canvas,
          res,
          cam,
          face,
          x0,
          x0 + 3,
          0,
          2.4,
          z,
          z + 3,
          env.buildings[ci],
          env.buildingSides[ci],
          res.ui.white,
          alpha,
        );
        if (face.valid) {
          const w = face.r - face.l;
          const fh = face.b - face.t;
          // Door and a warm lamp.
          fillRect(
            canvas,
            res,
            face.l + w * 0.38,
            face.t + fh * 0.35,
            face.l + w * 0.62,
            face.b,
            res.ui.shadow,
            0.6 * alpha,
          );
          const glow = 0.7 + 0.3 * Math.sin(time * 3 + id);
          res.fill.setColor(env.windows[0]);
          res.fill.setAlphaf(0.35 * glow * alpha);
          canvas.drawCircle(face.l + w * 0.2, face.t + fh * 0.3, Math.max(3, w * 0.12), res.fill);
          res.fill.setAlphaf(glow * alpha);
          canvas.drawCircle(face.l + w * 0.2, face.t + fh * 0.3, Math.max(1.5, w * 0.05), res.fill);
        }
        continue;
      }

      const s = scaleAt(cam, z);
      const height = 5 + h2 * 3;
      const lean = side * (0.6 + h1 * 0.9);
      // Trunk: a gentle curve, thicker at the base.
      let px = sx(cam, x, s);
      let py = sy(cam, 0, s);
      res.stroke.setColor(env.roadSeam);
      res.stroke.setAlphaf(alpha);
      for (let k = 1; k <= 3; k++) {
        const t = k / 3;
        const nx = sx(cam, x + lean * t * t, s);
        const ny = sy(cam, height * t, s);
        res.stroke.setStrokeWidth(Math.max(1.5, TRUNK[k - 1] * s));
        canvas.drawLine(px, py, nx, ny, res.stroke);
        px = nx;
        py = ny;
      }
      // Fronds fanning out from the top, swaying a little.
      const sway = Math.sin(time * 1.5 + id) * 0.08;
      const leaf = env.leaves[hash01(id + 5) < 0.5 ? 0 : 1];
      for (let f = 0; f < FRONDS.length; f++) {
        const a = FRONDS[f] + sway;
        const dx = Math.cos(a) * 2.1;
        const dy = Math.sin(a) * 0.9 - Math.abs(Math.cos(a)) * 0.9;
        const tipX = px + dx * s;
        const tipY = py - dy * s * cam.heightBoost;
        const midX = px + dx * 0.5 * s;
        const midY = py - (dy * 0.5 + 0.35) * s * cam.heightBoost;
        const mid2Y = py - (dy * 0.5 - 0.15) * s * cam.heightBoost;
        fillQuad(canvas, res, px, py, midX, midY, tipX, tipY, midX, mid2Y, leaf, 0.9 * alpha);
      }
      res.fill.setColor(env.roadFar);
      res.fill.setAlphaf(alpha);
      canvas.drawCircle(px - 0.12 * s, py + 0.1 * s, Math.max(1, 0.14 * s), res.fill);
      canvas.drawCircle(px + 0.12 * s, py + 0.12 * s, Math.max(1, 0.14 * s), res.fill);
    }
  }
}

// Buildings line both sides of the road. Each slot's size and colours come from a hash of
// its index, so the city is stable while it scrolls past.
export function drawBuildings(
  canvas: SkCanvas,
  res: RenderResources,
  cam: Camera,
  face: FaceRect,
  time: number,
): void {
  if (res.env.scenery === 1) {
    drawPalms(canvas, res, cam, face, time);
    return;
  }
  const first = Math.floor((cam.z - 4) / BUILDING_SLOT);
  const last = Math.floor((cam.z + WORLD.drawDistance) / BUILDING_SLOT);
  const env = res.env;

  for (let i = last; i >= first; i--) {
    for (let side = -1; side <= 1; side += 2) {
      const id = i * 2 + (side > 0 ? 1 : 0);
      const h1 = hash01(id);
      const h2 = hash01(id + 7919);
      const h3 = hash01(id + 104729);
      const gap = 4.5 + h1 * 3.5;
      const width = 4 + h2 * 4;
      const height = 7 + h3 * 20;
      const depth = 6 + h1 * 3;
      const z0 = i * BUILDING_SLOT + h2 * 2;
      const z1 = z0 + depth;
      const inner = side * (ROAD_HALF + gap);
      const outer = inner + side * width;
      const x0 = Math.min(inner, outer);
      const x1 = Math.max(inner, outer);
      const alpha = distanceFade(cam, z0, WORLD.drawDistance);
      // Skip buildings entirely behind the near plane; projecting them collapses to the
      // vanishing point.
      if (alpha <= 0 || z1 <= cam.z + cam.near + 0.5) continue;

      const ci = Math.floor(h3 * env.buildings.length) % env.buildings.length;
      drawBox(
        canvas,
        res,
        cam,
        face,
        x0,
        x1,
        0,
        height,
        z0,
        z1,
        env.buildings[ci],
        env.buildingSides[ci],
        env.buildings[ci],
        alpha,
      );

      const win = env.windows[Math.floor(h1 * env.windows.length) % env.windows.length];
      const s = scaleAt(cam, Math.max(z0, cam.z + cam.near));
      if (s <= 0) continue;

      // Neon window bands on the face toward the road.
      const sF = scaleAt(cam, z1);
      const xi = side < 0 ? x1 : x0;
      res.stroke.setColor(win);
      res.stroke.setStrokeWidth(Math.min(3, Math.max(1, 0.18 * sF)));
      res.stroke.setAlphaf(0.85 * alpha);
      const bands = Math.floor(height / 2.6);
      for (let b = 1; b < bands; b++) {
        const y = b * 2.6;
        canvas.drawLine(sx(cam, xi, s), sy(cam, y, s), sx(cam, xi, sF), sy(cam, y, sF), res.stroke);
      }

      if (!face.valid) continue;
      // Window grid on the front face, skipped when it would be too small to see.
      const cols = 3;
      const fw = face.r - face.l;
      const fh = face.b - face.t;
      if (fw < 24) continue;
      const rows = Math.min(8, Math.floor(height / 2.6));
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const lit = hash01(id * 31 + r * 7 + c) > 0.35;
          if (!lit) continue;
          const wl = face.l + fw * (0.12 + c * 0.28);
          const wt = face.t + fh * (0.06 + r * (0.9 / rows));
          fillRect(canvas, res, wl, wt, wl + fw * 0.2, wt + (fh * 0.5) / rows, win, 0.75 * alpha);
        }
      }
      // Rooftop edge light, some of them blinking.
      const blink = h2 > 0.7 ? (Math.sin(time * 4 + id) > 0 ? 1 : 0.25) : 1;
      res.stroke.setColor(win);
      res.stroke.setStrokeWidth(Math.min(4, Math.max(1.5, 0.25 * s)));
      res.stroke.setAlphaf(alpha * blink);
      canvas.drawLine(face.l, face.t, face.r, face.t, res.stroke);
    }
  }
}

export function drawRoad(canvas: SkCanvas, res: RenderResources, cam: Camera): void {
  const env = res.env;
  const zNear = cam.z + cam.near;
  const zFar = cam.z + WORLD.drawDistance;

  // Shoulders glow, then the asphalt, then the far haze.
  groundQuad(canvas, res, cam, -ROAD_HALF - 0.6, ROAD_HALF + 0.6, zNear, zFar, env.roadEdge, 0.18);
  groundQuad(canvas, res, cam, -ROAD_HALF, ROAD_HALF, zNear, zFar, env.road, 1);
  groundQuad(canvas, res, cam, -ROAD_HALF, ROAD_HALF, cam.z + 70, zFar, env.roadFar, 0.5);

  // Panel seams scroll toward the camera; they're the main sense of speed.
  const seam = 4;
  for (let z = Math.ceil(zNear / seam) * seam; z < zFar; z += seam) {
    addGroundQuad(res, cam, -ROAD_HALF, ROAD_HALF, z, z + 0.25);
  }
  flushPath(canvas, res, env.roadSeam, 0.8);

  // Lane dashes, batched into one path (the far ones are hidden by the horizon haze).
  const dash = 6;
  for (let lane = 1; lane < LANE_COUNT; lane++) {
    const x = (lane - LANE_COUNT / 2) * LANE_WIDTH;
    for (let z = Math.floor(zNear / dash) * dash; z < zFar - 20; z += dash) {
      addGroundQuad(res, cam, x - 0.07, x + 0.07, z, z + 2.6);
    }
  }
  flushPath(canvas, res, env.laneDash, 0.85);

  // Neon road edges: a wide faint glow under a thin bright core.
  for (let side = -1; side <= 1; side += 2) {
    const x = side * ROAD_HALF;
    groundQuad(canvas, res, cam, x - 0.35, x + 0.35, zNear, zFar, env.roadEdge, 0.3);
    groundQuad(canvas, res, cam, x - 0.1, x + 0.1, zNear, zFar, env.roadEdge, 1);
  }

  // Fade the far road into the horizon glow.
  const sF = scaleAt(cam, zFar);
  const yF = sy(cam, 0, sF);
  fillQuad(
    canvas,
    res,
    0,
    yF - 1,
    cam.width,
    yF - 1,
    cam.width,
    yF + 6,
    0,
    yF + 6,
    env.roadEdge,
    0.25,
  );
}
