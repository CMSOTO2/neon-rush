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

// Neon Jungle: running an ancient stone causeway through a bioluminescent jungle at night.
// Built for jumping (the jungle's obstacle mix favours logs and gaps). Giant trees,
// glowing mushrooms, ferns and ruined pillars line the path; fireflies drift over it.
// Obstacles: mossy logs to jump, a low stone archway to duck under, fallen giant trunks
// and oncoming explorer cart trains to dodge, and breaks in the path over a glowing river.

const TREE_SLOT = 10;
const PLANT_SLOT = 5;
const DETAIL_DISTANCE = 100;
const FIREFLIES = 26;

// Jungle floor: nothing but darkness and a few glowing specks streaming past.
export function drawJungleGround(
  canvas: SkCanvas,
  res: RenderResources,
  cam: Camera,
  time: number,
): void {
  const th = res.theme;
  const far = cam.z + DETAIL_DISTANCE;
  const step = 4;
  for (let z = Math.ceil((cam.z + cam.near + 1) / step) * step; z < far; z += step) {
    const s = scaleAt(cam, z);
    const row = Math.floor(z / step);
    for (let side = -1; side <= 1; side += 2) {
      const h = hash01(row * 5 + side);
      const x = side * (ROAD_HALF + 1 + h * 10);
      const glow = 0.4 + 0.3 * Math.sin(time * 2 + row);
      res.fill.setColor(h < 0.5 ? th.neon : th.cyan);
      res.fill.setAlphaf(glow * distanceFade(cam, z + 40, WORLD.drawDistance));
      canvas.drawCircle(sx(cam, x, s), sy(cam, 0, s), Math.max(0.8, 0.06 * s), res.fill);
    }
  }
}

// The causeway: dark stone slabs with glowing moss in the seams, rune stones between the
// lanes, and glowing vines with magenta flowers along both edges.
export function drawJunglePath(canvas: SkCanvas, res: RenderResources, cam: Camera): void {
  const env = res.env;
  const th = res.theme;
  const zNear = cam.z + cam.near;
  const zFar = cam.z + WORLD.drawDistance;

  groundQuad(canvas, res, cam, -ROAD_HALF - 0.6, ROAD_HALF + 0.6, zNear, zFar, env.roadEdge, 0.12);
  groundQuad(canvas, res, cam, -ROAD_HALF, ROAD_HALF, zNear, zFar, env.road, 1);
  groundQuad(canvas, res, cam, -ROAD_HALF, ROAD_HALF, cam.z + 70, zFar, env.roadFar, 0.5);

  const seam = 3.5;
  res.fill.setColor(env.roadSeam);
  res.fill.setAlphaf(0.3);
  for (let z = Math.ceil(zNear / seam) * seam; z < cam.z + DETAIL_DISTANCE; z += seam) {
    const z0 = Math.max(z, zNear);
    const z1 = z + 0.14;
    if (z1 <= z0) continue;
    const sn = scaleAt(cam, z0);
    const sf = scaleAt(cam, z1);
    const sm = (sn + sf) * 0.5;
    const top = sy(cam, 0, sf);
    res.rect.setXYWH(
      sx(cam, -ROAD_HALF, sm),
      top,
      ROAD_HALF * 2 * sm,
      Math.max(1, sy(cam, 0, sn) - top),
    );
    canvas.drawRect(res.rect, res.fill);
  }

  // Rune stones between the lanes.
  const step = 6;
  for (let lane = 1; lane < LANE_COUNT; lane++) {
    const x = (lane - LANE_COUNT / 2) * LANE_WIDTH;
    for (let z = Math.floor(zNear / step) * step; z < zFar - 20; z += step) {
      groundQuad(canvas, res, cam, x - 0.12, x + 0.12, z, z + 1.2, env.laneDash, 0.8);
    }
  }

  for (let side = -1; side <= 1; side += 2) {
    const x = side * ROAD_HALF;
    groundQuad(canvas, res, cam, x - 0.35, x + 0.35, zNear, zFar, env.roadEdge, 0.28);
    groundQuad(canvas, res, cam, x - 0.08, x + 0.08, zNear, zFar, env.roadEdge, 1);
  }
  const fStep = 3;
  res.fill.setColor(th.neonHot);
  for (let z = Math.ceil(zNear / fStep) * fStep; z < cam.z + DETAIL_DISTANCE; z += fStep) {
    const s = scaleAt(cam, z);
    if (s <= 0) continue;
    res.fill.setAlphaf(distanceFade(cam, z + 40, WORLD.drawDistance));
    const k = Math.floor(z / fStep);
    const side = k % 2 === 0 ? -1 : 1;
    canvas.drawCircle(
      sx(cam, side * (ROAD_HALF + 0.05), s),
      sy(cam, 0.05, s),
      Math.max(1, 0.12 * s),
      res.fill,
    );
  }
}

// A giant tree: thick trunk, a dark layered canopy with glowing flowers, and a vine.
function drawTree(
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
  const h = 8 + hash01(id + 3) * 5;
  const bx = sx(cam, x, s);
  const topY = sy(cam, h, s);
  res.stroke.setColor(th.trunk);
  res.stroke.setAlphaf(alpha);
  res.stroke.setStrokeWidth(Math.max(2, 0.9 * s));
  canvas.drawLine(bx, sy(cam, 0, s), bx, topY, res.stroke);
  // A branch reaching over the path.
  const reach = x < 0 ? 1 : -1;
  res.stroke.setStrokeWidth(Math.max(1.5, 0.35 * s));
  canvas.drawLine(bx, sy(cam, h * 0.62, s), bx + reach * 2.4 * s, sy(cam, h * 0.8, s), res.stroke);
  const r = 2.6 * s;
  res.fill.setColor(th.canopy);
  res.fill.setAlphaf(alpha);
  canvas.drawCircle(bx - r * 0.6, topY + r * 0.2, r * 0.9, res.fill);
  canvas.drawCircle(bx + r * 0.7, topY + r * 0.1, r * 0.85, res.fill);
  canvas.drawCircle(bx + reach * r * 1.2, sy(cam, h * 0.82, s), r * 0.7, res.fill);
  res.fill.setColor(th.canopyLight);
  canvas.drawCircle(bx, topY - r * 0.35, r, res.fill);
  // Glowing flowers in the canopy.
  for (let i = 0; i < 3; i++) {
    const fx = bx + (hash01(id * 7 + i) - 0.5) * r * 2.4;
    const fy = topY + (hash01(id * 11 + i) - 0.5) * r * 1.2;
    const on = 0.6 + 0.4 * Math.sin(time * 2 + id + i * 2);
    res.fill.setColor(i === 1 ? th.cyan : th.neonHot);
    res.fill.setAlphaf(on * alpha);
    canvas.drawCircle(fx, fy, Math.max(1.2, 0.18 * s), res.fill);
  }
  // A vine hanging from the branch with a glowing tip.
  const vx = bx + reach * 2.2 * s;
  const vy = sy(cam, h * 0.8, s);
  const tipY = sy(cam, h * 0.8 - 3 - hash01(id + 9) * 2, s);
  res.stroke.setColor(th.fern);
  res.stroke.setStrokeWidth(Math.max(1, 0.06 * s));
  canvas.drawLine(vx, vy, vx + Math.sin(time + id) * 0.2 * s, tipY, res.stroke);
  res.fill.setColor(th.neon);
  res.fill.setAlphaf(alpha);
  canvas.drawCircle(vx + Math.sin(time + id) * 0.2 * s, tipY, Math.max(1, 0.1 * s), res.fill);
}

// Undergrowth by the path: a fern, or a cluster of glowing mushrooms.
function drawPlant(
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
  const bx = sx(cam, x, s);
  const by = sy(cam, 0, s);
  if (hash01(id + 13) < 0.5) {
    res.stroke.setColor(th.fern);
    res.stroke.setAlphaf(alpha);
    res.stroke.setStrokeWidth(Math.max(1, 0.12 * s));
    for (let i = 0; i < 5; i++) {
      const a = Math.PI * (0.15 + i * 0.175);
      canvas.drawLine(
        bx,
        by,
        bx + Math.cos(a) * 1.1 * s,
        by - Math.sin(a) * 0.9 * s * cam.heightBoost,
        res.stroke,
      );
    }
    return;
  }
  for (let i = 0; i < 3; i++) {
    const mx = bx + (i - 1) * 0.35 * s;
    const mh = (0.35 + hash01(id + i) * 0.35) * s * cam.heightBoost;
    const cr = (0.14 + hash01(id * 3 + i) * 0.1) * s;
    const glow = 0.3 + 0.12 * Math.sin(time * 2.5 + id + i);
    res.stroke.setColor(th.mushroomCap);
    res.stroke.setAlphaf(alpha);
    res.stroke.setStrokeWidth(Math.max(1, 0.05 * s));
    canvas.drawLine(mx, by, mx, by - mh, res.stroke);
    res.fill.setColor(th.mushroom);
    res.fill.setAlphaf(glow * alpha);
    canvas.drawCircle(mx, by - mh, cr * 2.2, res.fill);
    res.fill.setAlphaf(alpha);
    canvas.drawCircle(mx, by - mh, cr, res.fill);
  }
}

// A ruined stone pillar with glowing glyphs.
function drawRuin(
  canvas: SkCanvas,
  res: RenderResources,
  cam: Camera,
  face: FaceRect,
  x0: number,
  z: number,
  id: number,
  alpha: number,
): void {
  const th = res.theme;
  const h = 3 + hash01(id + 5) * 4;
  drawBox(
    canvas,
    res,
    cam,
    face,
    x0,
    x0 + 1.6,
    0,
    h,
    z,
    z + 1.6,
    th.stone,
    th.stoneSide,
    th.stoneTop,
    alpha,
  );
  if (!face.valid) return;
  const w = face.r - face.l;
  const fh = face.b - face.t;
  const glyph =
    res.env.windows[Math.floor(hash01(id) * res.env.windows.length) % res.env.windows.length];
  for (let i = 0; i < 3; i++) {
    const gy = face.t + fh * (0.15 + i * 0.25);
    fillRect(
      canvas,
      res,
      face.l + w * 0.3,
      gy,
      face.r - w * 0.3,
      gy + fh * 0.06,
      glyph,
      0.85 * alpha,
    );
  }
}

export function drawJungleScenery(
  canvas: SkCanvas,
  res: RenderResources,
  cam: Camera,
  face: FaceRect,
  time: number,
): void {
  const nearZ = cam.z + cam.near + 0.5;
  const first = Math.floor((cam.z - 4) / TREE_SLOT);
  const last = Math.floor((cam.z + WORLD.drawDistance) / TREE_SLOT);
  for (let i = last; i >= first; i--) {
    for (let side = -1; side <= 1; side += 2) {
      const id = i * 2 + (side > 0 ? 1 : 0);
      const z = i * TREE_SLOT + hash01(id + 7919) * 4;
      if (z <= nearZ) continue;
      const alpha = distanceFade(cam, z, WORLD.drawDistance);
      if (alpha <= 0) continue;
      const x = side * (ROAD_HALF + 3.5 + hash01(id) * 5);
      if (hash01(id + 31) < 0.18)
        drawRuin(canvas, res, cam, face, side < 0 ? x - 1.6 : x, z, id, alpha);
      else drawTree(canvas, res, cam, x, z, id, alpha, time);
    }
  }
  const pFirst = Math.floor((cam.z - 2) / PLANT_SLOT);
  const pLast = Math.floor((cam.z + DETAIL_DISTANCE) / PLANT_SLOT);
  for (let i = pLast; i >= pFirst; i--) {
    for (let side = -1; side <= 1; side += 2) {
      const id = i * 2 + (side > 0 ? 1 : 0) + 5000;
      const z = i * PLANT_SLOT + hash01(id + 7) * 2;
      if (z <= nearZ) continue;
      const alpha = distanceFade(cam, z + 40, WORLD.drawDistance);
      if (alpha <= 0) continue;
      drawPlant(canvas, res, cam, side * (ROAD_HALF + 0.9 + hash01(id) * 1.8), z, id, alpha, time);
    }
  }
}

// Jump: a fallen log with glowing moss along the top and lime up chevrons.
function drawLog(
  canvas: SkCanvas,
  res: RenderResources,
  cam: Camera,
  face: FaceRect,
  o: Obstacle,
  alpha: number,
): void {
  const th = res.theme;
  const x = laneX(o.lane);
  const hw = OBSTACLES.barrier.halfWidth;
  groundQuad(
    canvas,
    res,
    cam,
    x - hw - 0.25,
    x + hw + 0.25,
    o.z0 - 0.3,
    o.z1 + 0.3,
    th.neon,
    0.16 * alpha,
  );
  drawBox(
    canvas,
    res,
    cam,
    face,
    x - hw,
    x + hw,
    0,
    OBSTACLES.barrier.height,
    o.z0,
    o.z1,
    th.log,
    th.logSide,
    th.logTop,
    alpha,
  );
  if (!face.valid) return;
  const w = face.r - face.l;
  const fh = face.b - face.t;
  // Bark grain, then chevrons, then glowing moss on top.
  for (let i = 1; i < 4; i++) {
    const gy = face.t + fh * (i / 4);
    fillRect(canvas, res, face.l, gy - 0.6, face.r, gy + 0.6, th.logSide, 0.8 * alpha);
  }
  for (let i = 0; i < 3; i++) {
    const cx = face.l + w * ((i + 0.5) / 3);
    const cw = w * 0.11;
    const top = face.t + fh * 0.24;
    const bot = face.t + fh * 0.72;
    const t = fh * 0.2;
    fillQuad(canvas, res, cx - cw, bot, cx, top, cx, top + t, cx - cw, bot + t, th.logInk, alpha);
    fillQuad(canvas, res, cx, top, cx + cw, bot, cx + cw, bot + t, cx, top + t, th.logInk, alpha);
  }
  fillRect(canvas, res, face.l, face.t - fh * 0.04, face.r, face.t + fh * 0.1, th.moss, alpha);
  // Cut ends: tree rings on each side.
  const rr = fh * 0.5;
  res.stroke.setColor(th.logTop);
  res.stroke.setAlphaf(alpha);
  res.stroke.setStrokeWidth(Math.max(1, rr * 0.18));
  canvas.drawCircle(face.l + rr * 0.3, face.t + fh * 0.5, rr * 0.55, res.stroke);
  canvas.drawCircle(face.r - rr * 0.3, face.t + fh * 0.5, rr * 0.55, res.stroke);
}

// Slide: a low stone archway. The lintel fills the no-go band, pale jade with a dark
// arrow rune and a glowing edge.
function drawArch(
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
  const g = OBSTACLES.gate;
  const pw = 0.3;
  drawBox(
    canvas,
    res,
    cam,
    face,
    x - g.halfWidth - 0.1,
    x - g.halfWidth + pw,
    0,
    g.beamTop + 0.2,
    o.z0,
    o.z1,
    th.stone,
    th.stoneSide,
    th.stoneTop,
    alpha,
  );
  drawBox(
    canvas,
    res,
    cam,
    face,
    x + g.halfWidth - pw,
    x + g.halfWidth + 0.1,
    0,
    g.beamTop + 0.2,
    o.z0,
    o.z1,
    th.stone,
    th.stoneSide,
    th.stoneTop,
    alpha,
  );
  const zn = Math.max(o.z0, cam.z + cam.near);
  const s = scaleAt(cam, zn);
  if (s <= 0) return;
  const l = sx(cam, x - g.halfWidth - 0.1, s);
  const r = sx(cam, x + g.halfWidth + 0.1, s);
  const t = sy(cam, g.beamTop + 0.2, s);
  const b = sy(cam, g.beamBottom, s);
  const edge = Math.max(2, (b - t) * 0.08);
  const pulse = 0.3 + 0.1 * Math.sin(time * 5 + o.seed * 5);
  fillRect(canvas, res, l - edge, t - edge, r + edge, b + edge, th.neon, pulse * alpha);
  fillRect(canvas, res, l, t, r, b, th.lintel, alpha);
  fillRect(canvas, res, l, b - edge, r, b, th.neon, alpha);
  const cx = (l + r) / 2;
  const hh = b - t;
  const aw = hh * 0.42;
  const ab = b - hh * 0.16;
  fillQuad(
    canvas,
    res,
    cx - aw * 0.35,
    t + hh * 0.18,
    cx + aw * 0.35,
    t + hh * 0.18,
    cx + aw * 0.35,
    ab - aw * 0.55,
    cx - aw * 0.35,
    ab - aw * 0.55,
    th.lintelInk,
    alpha,
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
    th.lintelInk,
    alpha,
  );
}

// Dodge, standing: a giant fallen trunk lying along the lane, rings on its cut end and
// mushrooms growing on top.
function drawTrunk(
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
  groundQuad(
    canvas,
    res,
    cam,
    x - t.halfWidth - 0.15,
    x + t.halfWidth + 0.15,
    o.z0 - 0.3,
    o.z1 + 0.2,
    th.neon,
    0.18 * alpha,
  );
  drawBox(
    canvas,
    res,
    cam,
    face,
    x - t.halfWidth,
    x + t.halfWidth,
    0,
    t.height,
    o.z0,
    o.z1,
    th.log,
    th.logSide,
    th.logTop,
    alpha,
  );
  if (!face.valid) return;
  const w = face.r - face.l;
  const fh = face.b - face.t;
  const cx = (face.l + face.r) / 2;
  const cy = (face.t + face.b) / 2;
  res.stroke.setColor(th.logTop);
  res.stroke.setAlphaf(alpha);
  res.stroke.setStrokeWidth(Math.max(1, w * 0.03));
  for (let i = 1; i <= 3; i++) canvas.drawCircle(cx, cy, Math.min(w, fh) * 0.13 * i, res.stroke);
  fillRect(canvas, res, face.l, face.t - fh * 0.03, face.r, face.t + fh * 0.05, th.moss, alpha);
  // Mushrooms on the near end of the top.
  for (let i = 0; i < 3; i++) {
    const mx = face.l + w * (0.25 + i * 0.25);
    const glow = 0.3 + 0.12 * Math.sin(time * 2.5 + o.seed * 9 + i);
    res.fill.setColor(th.mushroom);
    res.fill.setAlphaf(glow * alpha);
    canvas.drawCircle(mx, face.t - fh * 0.06, w * 0.07, res.fill);
    res.fill.setAlphaf(alpha);
    canvas.drawCircle(mx, face.t - fh * 0.06, w * 0.035, res.fill);
  }
}

// Dodge, moving: a train of three explorer carts on rails, each loaded with a crate, a
// lantern on the front throwing light down the rails ahead of it.
function drawCarts(
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
  const flicker = 0.8 + 0.2 * Math.sin(time * 18 + o.seed * 7);
  // Rails from well ahead of the train to its tail.
  groundQuad(canvas, res, cam, x - 0.62, x - 0.52, o.z0 - 20, o.z1, th.rail, 0.9 * alpha);
  groundQuad(canvas, res, cam, x + 0.52, x + 0.62, o.z0 - 20, o.z1, th.rail, 0.9 * alpha);
  groundQuad(
    canvas,
    res,
    cam,
    x - 0.9,
    x + 0.9,
    o.z0 - 14,
    o.z0,
    th.lantern,
    0.14 * alpha * flicker,
  );
  // Carts, far to near so the nearer ones overlap correctly.
  const len = (o.z1 - o.z0) / 3;
  for (let c = 2; c >= 0; c--) {
    const z0 = o.z0 + c * len + 0.15;
    const z1 = z0 + len - 0.3;
    drawBox(
      canvas,
      res,
      cam,
      face,
      x - t.halfWidth,
      x + t.halfWidth,
      0.25,
      1.7,
      z0,
      z1,
      th.cart,
      th.cartSide,
      th.cartTop,
      alpha,
    );
    if (face.valid) {
      const fh = face.b - face.t;
      fillRect(canvas, res, face.l, face.t + fh * 0.12, face.r, face.t + fh * 0.2, th.neon, alpha);
      fillRect(
        canvas,
        res,
        face.l,
        face.b - fh * 0.2,
        face.r,
        face.b - fh * 0.12,
        th.logSide,
        alpha,
      );
    }
    drawBox(
      canvas,
      res,
      cam,
      face,
      x - 0.7,
      x + 0.7,
      1.7,
      t.height,
      z0 + 0.4,
      z1 - 0.4,
      th.log,
      th.logSide,
      th.logTop,
      alpha,
    );
    if (c === 0 && face.valid) {
      // Lantern on the lead cart's crate.
      const w = face.r - face.l;
      const lx = (face.l + face.r) / 2;
      const ly = face.t + (face.b - face.t) * 0.5;
      res.fill.setColor(th.lantern);
      res.fill.setAlphaf(0.35 * alpha * flicker);
      canvas.drawCircle(lx, ly, w * 0.3, res.fill);
      res.fill.setAlphaf(alpha);
      canvas.drawCircle(lx, ly, w * 0.12, res.fill);
    }
  }
}

export function drawJungleObstacle(
  canvas: SkCanvas,
  res: RenderResources,
  cam: Camera,
  face: FaceRect,
  o: Obstacle,
  time: number,
): void {
  const alpha = distanceFade(cam, o.z0, WORLD.drawDistance);
  if (alpha <= 0) return;
  if (o.kind === ObstacleKind.Barrier) drawLog(canvas, res, cam, face, o, alpha);
  else if (o.kind === ObstacleKind.Gate) drawArch(canvas, res, cam, face, o, alpha, time);
  else if (o.kind === ObstacleKind.Tram) {
    if (o.vz !== 0) drawCarts(canvas, res, cam, face, o, alpha, time);
    else drawTrunk(canvas, res, cam, face, o, alpha, time);
  }
}

// Breaks in the path over a river: dark water with glowing ripples flowing across, and
// broken stone lips.
export function drawRiverGaps(
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
    if (!o.active || o.kind !== ObstacleKind.Gap || o.z1 <= near) continue;
    const alpha = distanceFade(cam, o.z0, WORLD.drawDistance);
    if (alpha <= 0) continue;
    const x = laneX(o.lane);
    groundQuad(canvas, res, cam, x - g.halfWidth, x + g.halfWidth, o.z0, o.z1, th.river, alpha);
    // Ripples drifting sideways across the gap.
    for (let k = 0; k < 3; k++) {
      const zz = o.z0 + 0.4 + k * 0.7;
      const off = ((state.time * 0.8 + k * 0.37 + o.seed) % 1) * 1.6 - 0.8;
      groundQuad(
        canvas,
        res,
        cam,
        x + off - 0.4,
        x + off + 0.4,
        zz,
        zz + 0.12,
        th.riverGlow,
        0.7 * alpha,
      );
    }
    groundQuad(
      canvas,
      res,
      cam,
      x - g.halfWidth,
      x + g.halfWidth,
      o.z0 - 0.14,
      o.z0 + 0.1,
      th.stoneTop,
      alpha,
    );
    groundQuad(
      canvas,
      res,
      cam,
      x - g.halfWidth,
      x + g.halfWidth,
      o.z1 - 0.1,
      o.z1 + 0.14,
      th.stoneTop,
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
      th.neon,
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
      th.neon,
      0.8 * alpha,
    );
  }
}

// Fireflies drifting in screen space, blinking slowly. Reduce motion keeps them still.
export function drawFireflies(
  canvas: SkCanvas,
  res: RenderResources,
  time: number,
  reduceMotion: boolean,
): void {
  res.fill.setColor(res.theme.firefly);
  const t = reduceMotion ? 0 : time;
  for (let i = 0; i < FIREFLIES; i++) {
    const h1 = hash01(i * 7 + 3);
    const h2 = hash01(i * 13 + 9);
    const x = (h1 + Math.sin(t * 0.3 + i) * 0.05) * res.width;
    const y = (0.2 + h2 * 0.6 + Math.cos(t * 0.4 + i * 2) * 0.03) * res.height;
    const blink = reduceMotion ? 0.6 : 0.3 + 0.7 * Math.max(0, Math.sin(time * (0.8 + h2) + i * 3));
    res.fill.setAlphaf(0.25 * blink);
    canvas.drawCircle(x, y, 5, res.fill);
    res.fill.setAlphaf(0.9 * blink);
    canvas.drawCircle(x, y, 1.6, res.fill);
  }
}
