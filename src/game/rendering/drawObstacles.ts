'worklet';

import type { SkCanvas } from '@shopify/react-native-skia';

import { laneX, OBSTACLES, WORLD } from '../config';
import { ObstacleKind, type GameState, type Obstacle } from '../types';
import { scaleAt, sx, sy, type Camera } from './camera';
import { distanceFade, drawBox, fillQuad, fillRect, groundQuad, type FaceRect } from './primitives';
import type { RenderResources } from './resources';

// Each obstacle carries a visual cue for the move it asks for: chevrons pointing up on
// barriers (jump), a down arrow on gates (slide), and a solid vehicle for trams (dodge).

function drawBarrier(
  canvas: SkCanvas,
  res: RenderResources,
  cam: Camera,
  face: FaceRect,
  o: Obstacle,
  alpha: number,
  time: number,
): void {
  const c = res.obstacle.barrier;
  const x = laneX(o.lane);
  const hw = OBSTACLES.barrier.halfWidth;
  const h = OBSTACLES.barrier.height;
  groundQuad(
    canvas,
    res,
    cam,
    x - hw - 0.2,
    x + hw + 0.2,
    o.z0 - 0.3,
    o.z1 + 0.3,
    c.front,
    0.18 * alpha,
  );
  drawBox(canvas, res, cam, face, x - hw, x + hw, 0, h, o.z0, o.z1, c.front, c.side, c.top, alpha);
  if (!face.valid) return;

  const w = face.r - face.l;
  const fh = face.b - face.t;
  // Up chevrons.
  const n = 3;
  for (let i = 0; i < n; i++) {
    const cx = face.l + w * ((i + 0.5) / n);
    const cw = w * 0.13;
    const top = face.t + fh * 0.28;
    const bot = face.t + fh * 0.72;
    const th = fh * 0.2;
    fillQuad(canvas, res, cx - cw, bot, cx, top, cx, top + th, cx - cw, bot + th, c.stripe, alpha);
    fillQuad(canvas, res, cx, top, cx + cw, bot, cx + cw, bot + th, cx, top + th, c.stripe, alpha);
  }
  // Glowing top rail with blinking corner lights.
  fillRect(canvas, res, face.l, face.t, face.r, face.t + fh * 0.12, c.glow, alpha);
  const blink = Math.sin(time * 8 + o.seed * 10) > 0 ? 1 : 0.35;
  res.fill.setColor(res.ui.white);
  res.fill.setAlphaf(alpha * blink);
  const r = Math.max(2, fh * 0.1);
  canvas.drawCircle(face.l + r, face.t - r * 0.6, r, res.fill);
  canvas.drawCircle(face.r - r, face.t - r * 0.6, r, res.fill);
}

function drawGate(
  canvas: SkCanvas,
  res: RenderResources,
  cam: Camera,
  face: FaceRect,
  o: Obstacle,
  alpha: number,
  time: number,
): void {
  const post = res.obstacle.gatePost;
  const beam = res.obstacle.gateBeam;
  const x = laneX(o.lane);
  const g = OBSTACLES.gate;
  const postW = 0.16;
  const postTop = g.beamTop + 0.2;

  // Posts, drawn outer-first so the nearer one overlaps correctly.
  drawBox(
    canvas,
    res,
    cam,
    face,
    x - g.halfWidth,
    x - g.halfWidth + postW,
    0,
    postTop,
    o.z0,
    o.z1,
    post.front,
    post.side,
    post.top,
    alpha,
  );
  drawBox(
    canvas,
    res,
    cam,
    face,
    x + g.halfWidth - postW,
    x + g.halfWidth,
    0,
    postTop,
    o.z0,
    o.z1,
    post.front,
    post.side,
    post.top,
    alpha,
  );

  const zn = Math.max(o.z0, cam.z + cam.near);
  const s = scaleAt(cam, zn);
  if (s <= 0) return;
  const l = sx(cam, x - g.halfWidth + postW, s);
  const r = sx(cam, x + g.halfWidth - postW, s);
  const t = sy(cam, g.beamTop, s);
  const b = sy(cam, g.beamBottom, s);
  const pulse = 0.5 + 0.15 * Math.sin(time * 10 + o.seed * 6);

  // Laser curtain: translucent panel, scanlines and bright edges.
  fillRect(canvas, res, l, t, r, b, beam.fill, pulse * alpha);
  const lines = 5;
  const off = (time * 3) % 1;
  for (let i = 0; i < lines; i++) {
    const yy = t + (b - t) * ((i + off) / lines);
    fillRect(canvas, res, l, yy, r, yy + Math.max(1, (b - t) * 0.04), beam.edge, 0.35 * alpha);
  }
  const edge = Math.max(2, (b - t) * 0.09);
  fillRect(canvas, res, l, t - edge * 0.5, r, t + edge * 0.5, beam.edge, alpha);
  fillRect(canvas, res, l, b - edge * 0.5, r, b + edge * 0.5, beam.edge, alpha);

  // Down arrow: slide under.
  const cx = (l + r) / 2;
  const aw = (b - t) * 0.42;
  const at = t + (b - t) * 0.2;
  const ab = b - (b - t) * 0.18;
  fillQuad(
    canvas,
    res,
    cx - aw * 0.35,
    at,
    cx + aw * 0.35,
    at,
    cx + aw * 0.35,
    ab - aw * 0.55,
    cx - aw * 0.35,
    ab - aw * 0.55,
    res.ui.white,
    0.95 * alpha,
  );
  fillQuad(
    canvas,
    res,
    cx - aw,
    ab - aw * 0.6,
    cx + aw,
    ab - aw * 0.6,
    cx,
    ab,
    cx,
    ab,
    res.ui.white,
    0.95 * alpha,
  );
}

function drawTram(
  canvas: SkCanvas,
  res: RenderResources,
  cam: Camera,
  face: FaceRect,
  o: Obstacle,
  alpha: number,
  time: number,
): void {
  const c = res.obstacle.tram;
  const x = laneX(o.lane);
  const t = OBSTACLES.tram;
  const hover = 0.35 + Math.sin(time * 4 + o.seed * 9) * 0.05;

  // Oncoming trams throw headlight beams down the road ahead of them.
  if (o.vz !== 0) {
    const flicker = 0.75 + 0.25 * Math.sin(time * 20 + o.seed * 7);
    groundQuad(
      canvas,
      res,
      cam,
      x - 0.9,
      x + 0.9,
      o.z0 - 16,
      o.z0,
      c.light,
      0.16 * alpha * flicker,
    );
    groundQuad(canvas, res, cam, x - 0.5, x + 0.5, o.z0 - 9, o.z0, c.light, 0.22 * alpha * flicker);
  }
  // Hover glow on the road beneath.
  groundQuad(
    canvas,
    res,
    cam,
    x - t.halfWidth - 0.15,
    x + t.halfWidth + 0.15,
    o.z0 - 0.4,
    o.z1 + 0.2,
    c.hover,
    0.35 * alpha,
  );
  drawBox(
    canvas,
    res,
    cam,
    face,
    x - t.halfWidth,
    x + t.halfWidth,
    hover,
    t.height,
    o.z0,
    o.z1,
    c.front,
    c.side,
    c.top,
    alpha,
  );

  // Side stripe along the visible flank.
  const zn = Math.max(o.z0, cam.z + cam.near);
  const sN = scaleAt(cam, zn);
  const sF = scaleAt(cam, o.z1);
  if (sN > 0) {
    const flank =
      cam.x < x - t.halfWidth ? x - t.halfWidth : cam.x > x + t.halfWidth ? x + t.halfWidth : NaN;
    if (flank === flank) {
      const y0 = 1.2;
      const y1 = 1.45;
      fillQuad(
        canvas,
        res,
        sx(cam, flank, sN),
        sy(cam, y0, sN),
        sx(cam, flank, sF),
        sy(cam, y0, sF),
        sx(cam, flank, sF),
        sy(cam, y1, sF),
        sx(cam, flank, sN),
        sy(cam, y1, sN),
        c.stripe,
        alpha,
      );
    }
  }
  if (!face.valid) return;

  const w = face.r - face.l;
  const fh = face.b - face.t;
  // Windshield with a shine.
  fillRect(
    canvas,
    res,
    face.l + w * 0.1,
    face.t + fh * 0.1,
    face.r - w * 0.1,
    face.t + fh * 0.48,
    c.glass,
    alpha,
  );
  fillQuad(
    canvas,
    res,
    face.l + w * 0.2,
    face.t + fh * 0.44,
    face.l + w * 0.36,
    face.t + fh * 0.14,
    face.l + w * 0.44,
    face.t + fh * 0.14,
    face.l + w * 0.28,
    face.t + fh * 0.44,
    c.glassShine,
    0.8 * alpha,
  );
  // Magenta band and headlights.
  fillRect(canvas, res, face.l, face.t + fh * 0.58, face.r, face.t + fh * 0.66, c.stripe, alpha);
  const lr = Math.max(2, w * 0.07);
  const ly = face.t + fh * 0.8;
  res.fill.setColor(c.light);
  res.fill.setAlphaf(0.35 * alpha);
  canvas.drawCircle(face.l + w * 0.18, ly, lr * 2, res.fill);
  canvas.drawCircle(face.r - w * 0.18, ly, lr * 2, res.fill);
  res.fill.setAlphaf(alpha);
  canvas.drawCircle(face.l + w * 0.18, ly, lr, res.fill);
  canvas.drawCircle(face.r - w * 0.18, ly, lr, res.fill);
  // Roof light bar.
  fillRect(
    canvas,
    res,
    face.l + w * 0.3,
    face.t - fh * 0.04,
    face.r - w * 0.3,
    face.t + fh * 0.02,
    c.hover,
    alpha,
  );
}

export function drawObstacle(
  canvas: SkCanvas,
  res: RenderResources,
  cam: Camera,
  face: FaceRect,
  o: Obstacle,
  time: number,
): void {
  const alpha = distanceFade(cam, o.z0, WORLD.drawDistance);
  if (alpha <= 0) return;
  if (o.kind === ObstacleKind.Barrier) drawBarrier(canvas, res, cam, face, o, alpha, time);
  else if (o.kind === ObstacleKind.Gate) drawGate(canvas, res, cam, face, o, alpha, time);
  else if (o.kind === ObstacleKind.Tram) drawTram(canvas, res, cam, face, o, alpha, time);
}

// Gaps are holes in the road, drawn with the road surface before anything stands on it:
// a dark pit, a glimpse of the glowing grid far below, and hazard-red rims.
export function drawGaps(
  canvas: SkCanvas,
  res: RenderResources,
  cam: Camera,
  state: GameState,
): void {
  const g = OBSTACLES.gap;
  const pool = state.obstacles;
  const near = cam.z + cam.near;
  for (let i = 0; i < pool.length; i++) {
    const o = pool[i];
    if (!o.active || o.kind !== ObstacleKind.Gap || o.z1 <= near) continue;
    const alpha = distanceFade(cam, o.z0, WORLD.drawDistance);
    if (alpha <= 0) continue;
    const x = laneX(o.lane);
    groundQuad(canvas, res, cam, x - g.halfWidth, x + g.halfWidth, o.z0, o.z1, res.gap.pit, alpha);
    // Deep glow inside the pit, pulsing slowly.
    const pulse = 0.35 + 0.15 * Math.sin(state.time * 3 + o.seed * 5);
    groundQuad(
      canvas,
      res,
      cam,
      x - g.halfWidth * 0.7,
      x + g.halfWidth * 0.7,
      o.z0 + 0.5,
      o.z1 - 0.3,
      res.gap.glow,
      pulse * alpha,
    );
    // Near and far rims, plus side rails.
    groundQuad(
      canvas,
      res,
      cam,
      x - g.halfWidth,
      x + g.halfWidth,
      o.z0 - 0.12,
      o.z0 + 0.12,
      res.gap.rim,
      alpha,
    );
    groundQuad(
      canvas,
      res,
      cam,
      x - g.halfWidth,
      x + g.halfWidth,
      o.z1 - 0.12,
      o.z1 + 0.12,
      res.gap.rim,
      alpha,
    );
    groundQuad(
      canvas,
      res,
      cam,
      x - g.halfWidth - 0.1,
      x - g.halfWidth + 0.06,
      o.z0,
      o.z1,
      res.gap.rim,
      0.8 * alpha,
    );
    groundQuad(
      canvas,
      res,
      cam,
      x + g.halfWidth - 0.06,
      x + g.halfWidth + 0.1,
      o.z0,
      o.z1,
      res.gap.rim,
      0.8 * alpha,
    );
  }
}
