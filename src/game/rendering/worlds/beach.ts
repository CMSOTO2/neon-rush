'worklet';

import type { SkCanvas } from '@shopify/react-native-skia';

import { LANE_COUNT, LANE_WIDTH, laneX, OBSTACLES, WORLD } from '../../config';
import { hash01 } from '../../engine/random';
import { ObstacleKind, type GameState, type Obstacle } from '../../types';
import { scaleAt, sx, sy, type Camera } from '../camera';
import { ROAD_HALF } from '../drawEnvironment';
import {
  distanceFade,
  drawBox,
  fillQuad,
  fillRect,
  groundQuad,
  type FaceRect,
} from '../primitives';
import type { RenderResources } from '../resources';

// Sunset Beach: surfing on the open sea. The lane is a calm current between two rope lines
// of orange floats, with sand, palms and huts along the shore on the left and rocks,
// sailboats and a lighthouse out to sea on the right. Obstacles keep their hitboxes and
// cues: a floating boom to jump, a low pier with a warning board to duck under, boats to
// dodge, and whirlpools where the city has holes in the road.

// Where the shore starts (world x, left of the lane).
const SHORE = -(ROAD_HALF + 6);
const PALM_SLOT = 9;
const SEA_SLOT = 13;
const TRUNK = [0.55, 0.4, 0.31];
const FRONDS = [0.35, 0.8, 1.3, 1.9, 2.4, 2.8, 3.1];
// Floats and crests beyond this are too small to see; the haze covers them.
const DETAIL_DISTANCE = 95;

function dotAt(
  canvas: SkCanvas,
  res: RenderResources,
  cam: Camera,
  x: number,
  y: number,
  z: number,
  r: number,
): void {
  const s = scaleAt(cam, z);
  if (s <= 0) return;
  canvas.drawCircle(sx(cam, x, s), sy(cam, y, s), Math.max(0.8, r * s), res.fill);
}

// Sea, shore and wave crests, drawn right after the sky.
export function drawBeachGround(
  canvas: SkCanvas,
  res: RenderResources,
  cam: Camera,
  time: number,
): void {
  const th = res.theme;
  const near = cam.z + cam.near;
  const far = cam.z + WORLD.drawDistance;

  // Sand, the wet strip where waves run up, and a line of foam that laps back and forth.
  groundQuad(canvas, res, cam, SHORE - 90, SHORE - 1.6, near, far, th.sand, 1);
  groundQuad(canvas, res, cam, SHORE - 1.6, SHORE, near, far, th.wetSand, 1);
  const lap = Math.sin(time * 1.3) * 0.35;
  groundQuad(canvas, res, cam, SHORE - 0.25 + lap, SHORE + 0.35 + lap, near, far, th.foam, 0.85);

  // Wave crests: broken foam lines at fixed spots on the sea, so they stream past.
  const stroke = res.stroke;
  stroke.setColor(th.foam);
  const spacing = 7;
  const detailFar = cam.z + DETAIL_DISTANCE;
  for (let z = Math.ceil((near + 1) / spacing) * spacing; z < detailFar; z += spacing) {
    const s = scaleAt(cam, z);
    const y = sy(cam, 0, s);
    const row = Math.floor(z / spacing);
    stroke.setStrokeWidth(Math.max(1, 0.1 * s));
    stroke.setAlphaf(0.45 * distanceFade(cam, z + 40, WORLD.drawDistance));
    for (let k = -4; k <= 5; k++) {
      const h = hash01(row * 13 + k);
      const x0 = k * 6 + h * 4;
      // Only on open water, not over the sand or the lane (which has its own foam).
      if (x0 < SHORE + 1 || Math.abs(x0 + 1) < ROAD_HALF + 1) continue;
      const len = 1.2 + hash01(row * 7 + k * 3) * 2.2;
      canvas.drawLine(sx(cam, x0, s), y, sx(cam, x0 + len, s), y, stroke);
    }
  }
}

// The surf lane: a lighter current, foam streaks for speed, lane buoys and float ropes.
export function drawBeachLane(
  canvas: SkCanvas,
  res: RenderResources,
  cam: Camera,
  time: number,
): void {
  const env = res.env;
  const th = res.theme;
  const zNear = cam.z + cam.near;
  const zFar = cam.z + WORLD.drawDistance;
  const detailFar = cam.z + DETAIL_DISTANCE;

  groundQuad(canvas, res, cam, -ROAD_HALF, ROAD_HALF, zNear, zFar, env.road, 0.55);
  groundQuad(canvas, res, cam, -ROAD_HALF, ROAD_HALF, cam.z + 70, zFar, env.roadFar, 0.45);

  // Foam streaks rushing past: two short ones per row, one small rect each.
  const seam = 4;
  res.fill.setColor(env.roadSeam);
  for (let z = Math.ceil(zNear / seam) * seam; z < detailFar; z += seam) {
    const sn = scaleAt(cam, Math.max(z, zNear));
    const sf = scaleAt(cam, z + 0.3);
    if (sn <= 0 || sf <= 0) continue;
    const row = Math.floor(z / seam);
    res.fill.setAlphaf(0.5 * distanceFade(cam, z + 40, WORLD.drawDistance));
    for (let k = 0; k < 2; k++) {
      const x0 = -ROAD_HALF + 0.4 + hash01(row * 5 + k) * (ROAD_HALF * 2 - 2);
      const len = 0.5 + hash01(row * 3 + k * 11) * 0.9;
      const top = sy(cam, 0, sf);
      res.rect.setXYWH(sx(cam, x0, sn), top, len * sn, Math.max(1, sy(cam, 0, sn) - top));
      canvas.drawRect(res.rect, res.fill);
    }
  }

  // Lane dividers: a thin rope with a small float every few meters, white and red.
  res.stroke.setColor(env.laneDash);
  res.stroke.setAlphaf(0.35);
  const sN = scaleAt(cam, zNear);
  const sF = scaleAt(cam, detailFar);
  res.stroke.setStrokeWidth(1.2);
  const bob = Math.sin(time * 2.2) * 0.03;
  for (let lane = 1; lane < LANE_COUNT; lane++) {
    const x = (lane - LANE_COUNT / 2) * LANE_WIDTH;
    canvas.drawLine(sx(cam, x, sN), sy(cam, 0, sN), sx(cam, x, sF), sy(cam, 0, sF), res.stroke);
    const step = 5;
    for (let z = Math.ceil(zNear / step) * step; z < detailFar; z += step) {
      res.fill.setColor(Math.floor(z / step) % 2 === 0 ? env.laneDash : th.buoy);
      res.fill.setAlphaf(0.95 * distanceFade(cam, z + 40, WORLD.drawDistance));
      dotAt(canvas, res, cam, x, 0.06 + bob, z, 0.11);
    }
  }

  // Edges: an orange float rope on each side, floats every 2.5 m.
  for (let side = -1; side <= 1; side += 2) {
    const x = side * ROAD_HALF;
    groundQuad(canvas, res, cam, x - 0.35, x + 0.35, zNear, zFar, env.roadEdge, 0.25);
    groundQuad(canvas, res, cam, x - 0.07, x + 0.07, zNear, zFar, env.roadEdge, 1);
    const step = 2.5;
    res.fill.setColor(env.roadEdge);
    for (let z = Math.ceil(zNear / step) * step; z < detailFar; z += step) {
      res.fill.setAlphaf(distanceFade(cam, z + 40, WORLD.drawDistance));
      dotAt(canvas, res, cam, x, 0.1 + bob, z, 0.16);
    }
  }
}

// A palm tree on the sand, leaning out over the water.
function drawPalm(
  canvas: SkCanvas,
  res: RenderResources,
  cam: Camera,
  x: number,
  z: number,
  id: number,
  alpha: number,
  time: number,
): void {
  const env = res.env;
  const s = scaleAt(cam, z);
  if (s <= 0) return;
  const h1 = hash01(id);
  const h2 = hash01(id + 7919);
  const height = 5 + h2 * 3;
  const lean = 0.6 + h1 * 0.9;
  let px = sx(cam, x, s);
  let py = sy(cam, 0, s);
  res.stroke.setColor(res.theme.woodDark);
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
  // Fronds as tapered strokes: two lines each (no path to build), drooping at the tip.
  const sway = Math.sin(time * 1.5 + id) * 0.08;
  const leaf = env.leaves[hash01(id + 5) < 0.5 ? 0 : 1];
  res.stroke.setColor(leaf);
  res.stroke.setAlphaf(0.9 * alpha);
  for (let f = 0; f < FRONDS.length; f++) {
    const a = FRONDS[f] + sway;
    const dx = Math.cos(a) * 2.1;
    const dy = Math.sin(a) * 0.9 - Math.abs(Math.cos(a)) * 0.9;
    const midX = px + dx * 0.5 * s;
    const midY = py - (dy * 0.5 + 0.25) * s * cam.heightBoost;
    res.stroke.setStrokeWidth(Math.max(1.5, 0.34 * s));
    canvas.drawLine(px, py, midX, midY, res.stroke);
    res.stroke.setStrokeWidth(Math.max(1, 0.2 * s));
    canvas.drawLine(midX, midY, px + dx * s, py - dy * s * cam.heightBoost, res.stroke);
  }
  res.fill.setColor(res.theme.wood);
  res.fill.setAlphaf(alpha);
  canvas.drawCircle(px - 0.12 * s, py + 0.1 * s, Math.max(1, 0.14 * s), res.fill);
  canvas.drawCircle(px + 0.12 * s, py + 0.12 * s, Math.max(1, 0.14 * s), res.fill);
}

// A beach hut on stilts, with a door and a warm lamp.
function drawHut(
  canvas: SkCanvas,
  res: RenderResources,
  cam: Camera,
  face: FaceRect,
  x: number,
  z: number,
  id: number,
  alpha: number,
  time: number,
): void {
  const env = res.env;
  const ci = Math.floor(hash01(id + 3) * env.buildings.length) % env.buildings.length;
  drawBox(
    canvas,
    res,
    cam,
    face,
    x - 3,
    x,
    0,
    2.6,
    z,
    z + 3,
    env.buildings[ci],
    env.buildingSides[ci],
    res.ui.white,
    alpha,
  );
  if (!face.valid) return;
  const w = face.r - face.l;
  const fh = face.b - face.t;
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

// A cluster of dark rocks with foam where the water breaks on them.
function drawRocks(
  canvas: SkCanvas,
  res: RenderResources,
  cam: Camera,
  face: FaceRect,
  x: number,
  z: number,
  id: number,
  alpha: number,
): void {
  const th = res.theme;
  groundQuad(canvas, res, cam, x - 0.6, x + 3.6, z - 0.6, z + 3.4, th.foam, 0.35 * alpha);
  const h = 0.8 + hash01(id + 11) * 1.4;
  drawBox(
    canvas,
    res,
    cam,
    face,
    x,
    x + 2,
    0,
    h,
    z,
    z + 2.2,
    th.rock,
    th.rockSide,
    th.rockTop,
    alpha,
  );
  drawBox(
    canvas,
    res,
    cam,
    face,
    x + 1.4,
    x + 3,
    0,
    h * 0.6,
    z + 0.6,
    z + 2.8,
    th.rock,
    th.rockSide,
    th.rockTop,
    alpha,
  );
}

// A small sailboat far out: hull and a triangular sail.
function drawSailboat(
  canvas: SkCanvas,
  res: RenderResources,
  cam: Camera,
  x: number,
  z: number,
  id: number,
  alpha: number,
  time: number,
): void {
  const th = res.theme;
  const s = scaleAt(cam, z);
  if (s <= 0) return;
  const rock = Math.sin(time * 1.2 + id) * 0.08;
  const bx = sx(cam, x, s);
  const by = sy(cam, 0.1, s);
  const hw = 1.3 * s;
  const hh = 0.5 * s * cam.heightBoost;
  fillQuad(
    canvas,
    res,
    bx - hw,
    by - hh,
    bx + hw,
    by - hh,
    bx + hw * 0.7,
    by,
    bx - hw * 0.7,
    by,
    th.hull,
    alpha,
  );
  const mastTop = sy(cam, 4.2, s);
  const tipX = bx + rock * 4 * s;
  res.pb.moveTo(tipX, mastTop);
  res.pb.lineTo(bx + hw * 0.9, by - hh * 1.2);
  res.pb.lineTo(bx - hw * 0.1, by - hh * 1.2);
  res.pb.close();
  res.fill.setColor(th.sail);
  res.fill.setAlphaf(0.95 * alpha);
  const path = res.pb.detach();
  canvas.drawPath(path, res.fill);
  path.dispose();
}

// A lighthouse on a rock with a slowly sweeping lamp.
function drawLighthouse(
  canvas: SkCanvas,
  res: RenderResources,
  cam: Camera,
  face: FaceRect,
  x: number,
  z: number,
  alpha: number,
  time: number,
): void {
  const th = res.theme;
  drawBox(
    canvas,
    res,
    cam,
    face,
    x - 2,
    x + 2,
    0,
    1.2,
    z - 1,
    z + 3,
    th.rock,
    th.rockSide,
    th.rockTop,
    alpha,
  );
  drawBox(
    canvas,
    res,
    cam,
    face,
    x - 0.9,
    x + 0.9,
    1.2,
    11,
    z,
    z + 1.8,
    th.lighthouse,
    th.hullSide,
    th.lighthouse,
    alpha,
  );
  if (face.valid) {
    const w = face.r - face.l;
    const fh = face.b - face.t;
    for (let i = 0; i < 3; i++) {
      const t = face.t + fh * (0.18 + i * 0.3);
      fillRect(canvas, res, face.l, t, face.r, t + fh * 0.12, th.lighthouseBand, alpha);
    }
    // Lamp room and its beam.
    const cx = (face.l + face.r) / 2;
    const ly = face.t - w * 0.35;
    const beam = Math.sin(time * 0.9);
    res.fill.setColor(th.light);
    res.fill.setAlphaf(0.18 * alpha * (0.5 + 0.5 * Math.abs(beam)));
    res.pb.moveTo(cx, ly);
    res.pb.lineTo(cx + beam * w * 9, ly - w * 0.9);
    res.pb.lineTo(cx + beam * w * 9, ly + w * 0.9);
    res.pb.close();
    const path = res.pb.detach();
    canvas.drawPath(path, res.fill);
    path.dispose();
    fillRect(
      canvas,
      res,
      face.l + w * 0.15,
      ly - w * 0.3,
      face.r - w * 0.15,
      face.t,
      th.glass,
      alpha,
    );
    res.fill.setColor(th.light);
    res.fill.setAlphaf(alpha);
    canvas.drawCircle(cx, ly, Math.max(1.5, w * 0.2), res.fill);
  }
}

// Shore on the left, open sea on the right. Slots are hashed, so the coast is the same
// every time it scrolls past.
export function drawBeachScenery(
  canvas: SkCanvas,
  res: RenderResources,
  cam: Camera,
  face: FaceRect,
  time: number,
): void {
  const nearZ = cam.z + cam.near + 0.5;
  // Right side first: it's all farther out, so the shore never overlaps it wrongly.
  const firstSea = Math.floor((cam.z - 4) / SEA_SLOT);
  const lastSea = Math.floor((cam.z + WORLD.drawDistance) / SEA_SLOT);
  for (let i = lastSea; i >= firstSea; i--) {
    const id = i * 2 + 1;
    const z = i * SEA_SLOT + hash01(id + 7919) * 4;
    if (z <= nearZ) continue;
    const alpha = distanceFade(cam, z, WORLD.drawDistance);
    if (alpha <= 0) continue;
    const r = hash01(id + 31);
    if (r < 0.07) drawLighthouse(canvas, res, cam, face, ROAD_HALF + 16, z, alpha, time);
    else if (r < 0.45)
      drawSailboat(canvas, res, cam, ROAD_HALF + 14 + hash01(id) * 18, z, id, alpha, time);
    else drawRocks(canvas, res, cam, face, ROAD_HALF + 3 + hash01(id) * 6, z, id, alpha);
  }

  const first = Math.floor((cam.z - 4) / PALM_SLOT);
  const last = Math.floor((cam.z + WORLD.drawDistance) / PALM_SLOT);
  for (let i = last; i >= first; i--) {
    const id = i * 2;
    const z = i * PALM_SLOT + hash01(id + 7919) * 3;
    if (z <= nearZ) continue;
    const alpha = distanceFade(cam, z, WORLD.drawDistance);
    if (alpha <= 0) continue;
    const x = SHORE - 3 - hash01(id) * 6;
    if (hash01(id + 31) < 0.25) drawHut(canvas, res, cam, face, x - 2, z, id, alpha, time);
    else drawPalm(canvas, res, cam, x, z, id, alpha, time);
  }
}

// Jump: a floating boom of orange buoys, with the same up chevrons as the city barrier.
function drawBoom(
  canvas: SkCanvas,
  res: RenderResources,
  cam: Camera,
  face: FaceRect,
  o: Obstacle,
  alpha: number,
  time: number,
): void {
  const th = res.theme;
  const x = laneX(o.lane);
  const hw = OBSTACLES.barrier.halfWidth;
  const bob = Math.sin(time * 2.4 + o.seed * 9) * 0.04;
  groundQuad(
    canvas,
    res,
    cam,
    x - hw - 0.3,
    x + hw + 0.3,
    o.z0 - 0.4,
    o.z1 + 0.4,
    th.foam,
    0.4 * alpha,
  );
  drawBox(
    canvas,
    res,
    cam,
    face,
    x - hw,
    x + hw,
    0.05 + bob,
    0.66 + bob,
    o.z0,
    o.z1,
    th.buoy,
    th.buoyDark,
    th.stripe,
    alpha,
  );
  if (!face.valid) return;
  const w = face.r - face.l;
  const fh = face.b - face.t;
  // Up chevrons: jump this.
  for (let i = 0; i < 3; i++) {
    const cx = face.l + w * ((i + 0.5) / 3);
    const cw = w * 0.11;
    const top = face.t + fh * 0.2;
    const bot = face.t + fh * 0.72;
    const t = fh * 0.22;
    fillQuad(canvas, res, cx - cw, bot, cx, top, cx, top + t, cx - cw, bot + t, th.stripe, alpha);
    fillQuad(canvas, res, cx, top, cx + cw, bot, cx + cw, bot + t, cx, top + t, th.stripe, alpha);
  }
  // Neon rail along the top, like the city barrier's.
  fillRect(canvas, res, face.l, face.t, face.r, face.t + fh * 0.1, th.neon, alpha);
  // Round floats riding on top, striped white.
  const r = w * 0.09;
  for (let i = 0; i < 4; i++) {
    const cx = face.l + w * (0.125 + i * 0.25);
    const cy = face.t - r * 0.7;
    res.fill.setColor(th.buoy);
    res.fill.setAlphaf(alpha);
    canvas.drawCircle(cx, cy, r, res.fill);
    fillRect(
      canvas,
      res,
      cx - r * 0.95,
      cy - r * 0.2,
      cx + r * 0.95,
      cy + r * 0.2,
      th.stripe,
      alpha,
    );
  }
}

// Slide: a low wooden pier with a striped warning board hanging to the top of the gap.
function drawPier(
  canvas: SkCanvas,
  res: RenderResources,
  cam: Camera,
  face: FaceRect,
  o: Obstacle,
  alpha: number,
): void {
  const th = res.theme;
  const x = laneX(o.lane);
  const g = OBSTACLES.gate;
  const pw = 0.24;
  groundQuad(
    canvas,
    res,
    cam,
    x - g.halfWidth - 0.4,
    x + g.halfWidth + 0.4,
    o.z0 - 0.3,
    o.z1 + 0.3,
    th.whirl,
    0.25 * alpha,
  );
  // Pilings, then the deck across the top.
  drawBox(
    canvas,
    res,
    cam,
    face,
    x - g.halfWidth,
    x - g.halfWidth + pw,
    0,
    g.beamTop + 0.1,
    o.z0,
    o.z1,
    th.woodDark,
    th.woodDark,
    th.wood,
    alpha,
  );
  drawBox(
    canvas,
    res,
    cam,
    face,
    x + g.halfWidth - pw,
    x + g.halfWidth,
    0,
    g.beamTop + 0.1,
    o.z0,
    o.z1,
    th.woodDark,
    th.woodDark,
    th.wood,
    alpha,
  );
  drawBox(
    canvas,
    res,
    cam,
    face,
    x - g.halfWidth - 0.15,
    x + g.halfWidth + 0.15,
    1.95,
    g.beamTop + 0.1,
    o.z0,
    o.z1 + 0.6,
    th.wood,
    th.woodDark,
    th.woodLight,
    alpha,
  );
  if (face.valid) {
    // Plank lines on the deck's edge and a neon strip along its underside.
    const w = face.r - face.l;
    const fh = face.b - face.t;
    for (let i = 1; i < 6; i++) {
      const lx = face.l + (w * i) / 6;
      fillRect(canvas, res, lx - 0.6, face.t, lx + 0.6, face.b, th.woodDark, 0.6 * alpha);
    }
    fillRect(
      canvas,
      res,
      face.l,
      face.b - fh * 0.2,
      face.r,
      face.b + fh * 0.2,
      th.neon,
      0.35 * alpha,
    );
    fillRect(canvas, res, face.l, face.b - fh * 0.08, face.r, face.b + fh * 0.04, th.neon, alpha);
  }
  // Warning board, from the bottom of the no-go band up to the deck, hung on two ropes.
  const zn = Math.max(o.z0, cam.z + cam.near);
  const s = scaleAt(cam, zn);
  if (s <= 0) return;
  const l = sx(cam, x - g.halfWidth + pw + 0.05, s);
  const r = sx(cam, x + g.halfWidth - pw - 0.05, s);
  const top = sy(cam, 1.78, s);
  const bot = sy(cam, g.beamBottom, s);
  const deck = sy(cam, 1.95, s);
  res.stroke.setColor(th.woodDark);
  res.stroke.setAlphaf(alpha);
  res.stroke.setStrokeWidth(Math.max(1, 0.05 * s));
  canvas.drawLine(l + (r - l) * 0.2, deck, l + (r - l) * 0.2, top, res.stroke);
  canvas.drawLine(l + (r - l) * 0.8, deck, l + (r - l) * 0.8, top, res.stroke);
  const edge = Math.max(2, (bot - top) * 0.1);
  fillRect(canvas, res, l - edge, top - edge, r + edge, bot + edge, th.neonHot, 0.35 * alpha);
  fillRect(canvas, res, l, top, r, bot, th.sign, alpha);
  // Diagonal hazard stripes, then the down arrow: slide under.
  const n = 6;
  const bw = (r - l) / n;
  for (let i = 0; i < n; i += 2) {
    const x0 = l + i * bw;
    fillQuad(
      canvas,
      res,
      x0,
      bot,
      x0 + bw * 0.5,
      top,
      x0 + bw,
      top,
      x0 + bw * 0.5,
      bot,
      th.signInk,
      0.35 * alpha,
    );
  }
  const cx = (l + r) / 2;
  const hh = bot - top;
  const aw = hh * 0.55;
  fillQuad(
    canvas,
    res,
    cx - aw * 0.3,
    top + hh * 0.12,
    cx + aw * 0.3,
    top + hh * 0.12,
    cx + aw * 0.3,
    top + hh * 0.5,
    cx - aw * 0.3,
    top + hh * 0.5,
    th.signInk,
    alpha,
  );
  fillQuad(
    canvas,
    res,
    cx - aw,
    top + hh * 0.46,
    cx + aw,
    top + hh * 0.46,
    cx,
    bot - hh * 0.08,
    cx,
    bot - hh * 0.08,
    th.signInk,
    alpha,
  );
}

// Dodge: a boat. Moored ones sit in a ring of foam; oncoming ones throw bow spray and
// shine their headlights down the lane.
function drawBoat(
  canvas: SkCanvas,
  res: RenderResources,
  cam: Camera,
  face: FaceRect,
  o: Obstacle,
  alpha: number,
  time: number,
): void {
  const th = res.theme;
  const x = laneX(o.lane);
  const t = OBSTACLES.tram;
  const bob = Math.sin(time * 1.8 + o.seed * 9) * 0.05;
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
      th.light,
      0.14 * alpha * flicker,
    );
    groundQuad(
      canvas,
      res,
      cam,
      x - t.halfWidth - 0.3,
      x + t.halfWidth + 0.3,
      o.z0 - 2.5,
      o.z0,
      th.foam,
      0.75 * alpha,
    );
    groundQuad(
      canvas,
      res,
      cam,
      x - t.halfWidth - 0.6,
      x + t.halfWidth + 0.6,
      o.z1,
      o.z1 + 5,
      th.foam,
      0.4 * alpha,
    );
  } else {
    groundQuad(
      canvas,
      res,
      cam,
      x - t.halfWidth - 0.3,
      x + t.halfWidth + 0.3,
      o.z0 - 0.4,
      o.z1 + 0.4,
      th.foam,
      0.35 * alpha,
    );
  }

  // Neon underglow on the water, like the city trams' hover glow.
  groundQuad(
    canvas,
    res,
    cam,
    x - t.halfWidth - 0.15,
    x + t.halfWidth + 0.15,
    o.z0 - 0.3,
    o.z1 + 0.2,
    th.neon,
    0.3 * alpha,
  );
  // Hull.
  drawBox(
    canvas,
    res,
    cam,
    face,
    x - t.halfWidth,
    x + t.halfWidth,
    bob,
    1.3 + bob,
    o.z0,
    o.z1,
    th.hull,
    th.hullSide,
    th.hullTop,
    alpha,
  );
  if (face.valid) {
    const w = face.r - face.l;
    const fh = face.b - face.t;
    fillRect(
      canvas,
      res,
      face.l,
      face.t + fh * 0.3,
      face.r,
      face.t + fh * 0.45,
      th.hullStripe,
      alpha,
    );
    fillRect(canvas, res, face.l, face.b - fh * 0.16, face.r, face.b, th.glass, 0.7 * alpha);
    if (o.vz !== 0) {
      const lr = Math.max(2, w * 0.06);
      const ly = face.t + fh * 0.62;
      res.fill.setColor(th.light);
      res.fill.setAlphaf(0.35 * alpha);
      canvas.drawCircle(face.l + w * 0.2, ly, lr * 2, res.fill);
      canvas.drawCircle(face.r - w * 0.2, ly, lr * 2, res.fill);
      res.fill.setAlphaf(alpha);
      canvas.drawCircle(face.l + w * 0.2, ly, lr, res.fill);
      canvas.drawCircle(face.r - w * 0.2, ly, lr, res.fill);
    }
  }
  // Cabin set back from the bow, with a wide windshield.
  drawBox(
    canvas,
    res,
    cam,
    face,
    x - 0.72,
    x + 0.72,
    1.3 + bob,
    t.height + bob,
    o.z0 + 1.6,
    o.z1 - 2,
    th.hull,
    th.hullSide,
    th.hullTop,
    alpha,
  );
  if (face.valid) {
    const w = face.r - face.l;
    const fh = face.b - face.t;
    fillRect(
      canvas,
      res,
      face.l + w * 0.1,
      face.t + fh * 0.15,
      face.r - w * 0.1,
      face.t + fh * 0.6,
      th.glass,
      alpha,
    );
    fillRect(
      canvas,
      res,
      face.l,
      face.t - fh * 0.06,
      face.r,
      face.t + fh * 0.04,
      th.hullStripe,
      alpha,
    );
  }
}

export function drawBeachObstacle(
  canvas: SkCanvas,
  res: RenderResources,
  cam: Camera,
  face: FaceRect,
  o: Obstacle,
  time: number,
): void {
  const alpha = distanceFade(cam, o.z0, WORLD.drawDistance);
  if (alpha <= 0) return;
  if (o.kind === ObstacleKind.Barrier) drawBoom(canvas, res, cam, face, o, alpha, time);
  else if (o.kind === ObstacleKind.Gate) drawPier(canvas, res, cam, face, o, alpha);
  else if (o.kind === ObstacleKind.Tram) drawBoat(canvas, res, cam, face, o, alpha, time);
}

// Whirlpools: a dark swirl on the water with foam arms turning around the middle. Drawn
// with the water, before anything floats on it.
export function drawWhirlpools(
  canvas: SkCanvas,
  res: RenderResources,
  cam: Camera,
  state: GameState,
): void {
  const th = res.theme;
  const g = OBSTACLES.gap;
  const pool = state.obstacles;
  const near = cam.z + cam.near;
  for (let i = 0; i < pool.length; i++) {
    const o = pool[i];
    if (!o.active || o.kind !== ObstacleKind.Gap || o.z0 <= near) continue;
    const alpha = distanceFade(cam, o.z0, WORLD.drawDistance);
    if (alpha <= 0) continue;
    const x = laneX(o.lane);
    const sN = scaleAt(cam, o.z0);
    const sF = scaleAt(cam, o.z1);
    const yN = sy(cam, 0, sN);
    const yF = sy(cam, 0, sF);
    const cx = sx(cam, x, (sN + sF) * 0.5);
    const cy = (yN + yF) * 0.5;
    const rx = g.halfWidth * (sN + sF) * 0.5;
    const ry = (yN - yF) * 0.5;
    if (ry < 0.5) continue;

    res.fill.setColor(th.whirlMid);
    res.fill.setAlphaf(alpha);
    res.rect.setXYWH(cx - rx * 1.1, cy - ry * 1.1, rx * 2.2, ry * 2.2);
    canvas.drawOval(res.rect, res.fill);
    res.fill.setColor(th.whirl);
    res.rect.setXYWH(cx - rx * 0.62, cy - ry * 0.62, rx * 1.24, ry * 1.24);
    canvas.drawOval(res.rect, res.fill);

    // Foam arms spiralling in (a unit circle scaled to the oval, then rotated).
    canvas.save();
    canvas.translate(cx, cy);
    canvas.scale(rx, ry);
    canvas.rotate((state.time * 140 + o.seed * 360) % 360, 0, 0);
    res.stroke.setColor(th.neonHot);
    res.stroke.setStrokeWidth(0.09);
    res.stroke.setAlphaf(0.9 * alpha);
    res.rect.setXYWH(-1, -1, 2, 2);
    canvas.drawArc(res.rect, 0, 110, false, res.stroke);
    canvas.drawArc(res.rect, 180, 110, false, res.stroke);
    res.stroke.setColor(th.foam);
    res.stroke.setAlphaf(0.7 * alpha);
    res.rect.setXYWH(-0.62, -0.62, 1.24, 1.24);
    canvas.drawArc(res.rect, 90, 120, false, res.stroke);
    canvas.drawArc(res.rect, 270, 120, false, res.stroke);
    canvas.restore();
  }
}
