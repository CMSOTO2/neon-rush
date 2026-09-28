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
  drawBuilt,
  fillQuad,
  fillRect,
  groundQuad,
  type FaceRect,
} from '../primitives';
import type { RenderResources } from '../resources';

// Snowy Mountain: snowboarding a night slope. The lane is a groomed piste with glowing
// cyan edges; pines strung with lights, lit cabins and a ski lift line the banks, and
// snow falls across the screen. Obstacles: an ice wall to jump, a slalom timing banner
// to duck under, snowcats to dodge, and crevasses to jump.

const TREE_SLOT = 8;
const LIFT_SLOT = 36;
const DETAIL_DISTANCE = 100;
const FLAKES = 36;

function tri(
  canvas: SkCanvas,
  res: RenderResources,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
): void {
  res.pb.moveTo(ax, ay);
  res.pb.lineTo(bx, by);
  res.pb.lineTo(cx, cy);
  res.pb.close();
  drawBuilt(canvas, res.pb, res.fill);
}

// Snowfield outside the piste: faint drift lines streaming past.
export function drawMountainGround(canvas: SkCanvas, res: RenderResources, cam: Camera): void {
  const stroke = res.stroke;
  stroke.setColor(res.env.groundGrid);
  stroke.setStrokeWidth(1);
  const far = cam.z + DETAIL_DISTANCE;
  const spacing = 9;
  for (let z = Math.ceil((cam.z + cam.near + 1) / spacing) * spacing; z < far; z += spacing) {
    const s = scaleAt(cam, z);
    const y = sy(cam, 0, s);
    const row = Math.floor(z / spacing);
    stroke.setAlphaf(0.3 * distanceFade(cam, z + 40, WORLD.drawDistance));
    for (let side = -1; side <= 1; side += 2) {
      const x0 = side * (ROAD_HALF + 1 + hash01(row * 3 + side) * 6);
      const len = 2 + hash01(row * 5 + side) * 5;
      canvas.drawLine(sx(cam, x0, s), y, sx(cam, x0 + side * len, s), y, stroke);
    }
  }
}

// The piste: groomed snow with corduroy lines, glowing lane dashes and neon edges.
export function drawMountainLane(canvas: SkCanvas, res: RenderResources, cam: Camera): void {
  const env = res.env;
  const zNear = cam.z + cam.near;
  const zFar = cam.z + WORLD.drawDistance;

  groundQuad(canvas, res, cam, -ROAD_HALF - 0.6, ROAD_HALF + 0.6, zNear, zFar, env.roadEdge, 0.14);
  groundQuad(canvas, res, cam, -ROAD_HALF, ROAD_HALF, zNear, zFar, env.road, 1);
  groundQuad(canvas, res, cam, -ROAD_HALF, ROAD_HALF, cam.z + 70, zFar, env.roadFar, 0.5);

  // Corduroy from the groomer: thin lines across the piste, one rect each.
  const seam = 2.5;
  res.fill.setColor(env.roadSeam);
  res.fill.setAlphaf(0.45);
  for (let z = Math.ceil(zNear / seam) * seam; z < cam.z + DETAIL_DISTANCE; z += seam) {
    const z0 = Math.max(z, zNear);
    const z1 = z + 0.18;
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

  // Lane dashes glow like piste markers.
  const dash = 6;
  res.fill.setColor(env.laneDash);
  res.fill.setAlphaf(0.85);
  for (let lane = 1; lane < LANE_COUNT; lane++) {
    const x = (lane - LANE_COUNT / 2) * LANE_WIDTH;
    for (let z = Math.floor(zNear / dash) * dash; z < zFar - 20; z += dash) {
      groundQuad(canvas, res, cam, x - 0.07, x + 0.07, z, z + 2.4, env.laneDash, 0.85);
    }
  }

  // Neon piste edges, plus marker poles with glowing tips every 6 m.
  for (let side = -1; side <= 1; side += 2) {
    const x = side * ROAD_HALF;
    groundQuad(canvas, res, cam, x - 0.35, x + 0.35, zNear, zFar, env.roadEdge, 0.3);
    groundQuad(canvas, res, cam, x - 0.1, x + 0.1, zNear, zFar, env.roadEdge, 1);
  }
  const step = 6;
  for (let z = Math.ceil(zNear / step) * step; z < cam.z + DETAIL_DISTANCE; z += step) {
    const s = scaleAt(cam, z);
    if (s <= 0) continue;
    const a = distanceFade(cam, z + 40, WORLD.drawDistance);
    const hot = Math.floor(z / step) % 2 === 0;
    for (let side = -1; side <= 1; side += 2) {
      const px = sx(cam, side * (ROAD_HALF + 0.35), s);
      res.stroke.setColor(res.theme.pole);
      res.stroke.setAlphaf(a);
      res.stroke.setStrokeWidth(Math.max(1, 0.07 * s));
      canvas.drawLine(px, sy(cam, 0, s), px, sy(cam, 1.3, s), res.stroke);
      res.fill.setColor(hot ? res.theme.neonHot : res.theme.neon);
      res.fill.setAlphaf(a);
      canvas.drawCircle(px, sy(cam, 1.35, s), Math.max(1.2, 0.1 * s), res.fill);
    }
  }
}

// A pine: trunk, two snowy tiers, and on some a string of neon lights.
function drawPine(
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
  const h = 4.5 + hash01(id + 3) * 3.5;
  const w = h * 0.34;
  const bx = sx(cam, x, s);
  const by = sy(cam, 0, s);
  const ws = s;
  const pine = res.props.pine;
  if (pine && alpha >= 1) {
    // Replay the recorded pine: no paths built.
    canvas.save();
    canvas.translate(bx, by);
    canvas.scale(h * s, h * s * cam.heightBoost);
    canvas.drawPicture(pine);
    canvas.restore();
  } else {
    // Fading in at the far end of the draw distance: draw it with alpha.
    res.stroke.setColor(th.trunk);
    res.stroke.setAlphaf(alpha);
    res.stroke.setStrokeWidth(Math.max(1, 0.25 * s));
    canvas.drawLine(bx, by, bx, sy(cam, h * 0.3, ws), res.stroke);
    res.fill.setColor(th.pineDark);
    res.fill.setAlphaf(alpha);
    tri(
      canvas,
      res,
      bx - w * ws,
      sy(cam, h * 0.18, ws),
      bx + w * ws,
      sy(cam, h * 0.18, ws),
      bx,
      sy(cam, h * 0.72, ws),
    );
    res.fill.setColor(th.pine);
    tri(
      canvas,
      res,
      bx - w * 0.72 * ws,
      sy(cam, h * 0.48, ws),
      bx + w * 0.72 * ws,
      sy(cam, h * 0.48, ws),
      bx,
      sy(cam, h, ws),
    );
  }
  // Lights only up close; farther out they'd be under a pixel.
  if (z < cam.z + 70 && hash01(id + 17) < 0.45) {
    // Lights along the lower tier, twinkling.
    for (let i = 0; i < 5; i++) {
      const t = (i + 0.5) / 5;
      const lx = bx + (-w * 0.8 + w * 1.6 * t) * ws;
      const ly = sy(cam, h * (0.24 + 0.12 * Math.sin(t * Math.PI)), ws);
      const on = 0.55 + 0.45 * Math.sin(time * 3 + i * 1.7 + id);
      res.fill.setColor(i % 2 === 0 ? th.neonHot : th.neon);
      res.fill.setAlphaf(on * alpha);
      canvas.drawCircle(lx, ly, Math.max(1, 0.1 * s), res.fill);
    }
  }
}

// A timber cabin with a snowy roof and glowing windows.
function drawCabin(
  canvas: SkCanvas,
  res: RenderResources,
  cam: Camera,
  face: FaceRect,
  x0: number,
  z: number,
  id: number,
  alpha: number,
): void {
  const env = res.env;
  const th = res.theme;
  const ci = Math.floor(hash01(id + 3) * env.buildings.length) % env.buildings.length;
  drawBox(
    canvas,
    res,
    cam,
    face,
    x0,
    x0 + 4,
    0,
    2.8,
    z,
    z + 4,
    env.buildings[ci],
    env.buildingSides[ci],
    th.roof,
    alpha,
  );
  if (!face.valid) return;
  const w = face.r - face.l;
  const fh = face.b - face.t;
  // Roof: a snowy triangle over the front.
  res.fill.setColor(th.roof);
  res.fill.setAlphaf(alpha);
  tri(
    canvas,
    res,
    face.l - w * 0.08,
    face.t,
    face.r + w * 0.08,
    face.t,
    (face.l + face.r) / 2,
    face.t - fh * 0.55,
  );
  const win = env.windows[Math.floor(hash01(id) * env.windows.length) % env.windows.length];
  fillRect(
    canvas,
    res,
    face.l + w * 0.14,
    face.t + fh * 0.3,
    face.l + w * 0.4,
    face.t + fh * 0.6,
    win,
    0.9 * alpha,
  );
  fillRect(
    canvas,
    res,
    face.r - w * 0.4,
    face.t + fh * 0.3,
    face.r - w * 0.14,
    face.t + fh * 0.6,
    win,
    0.9 * alpha,
  );
  // Neon trim along the eaves.
  fillRect(
    canvas,
    res,
    face.l,
    face.t - 1,
    face.r,
    face.t + Math.max(1.5, fh * 0.04),
    th.neonHot,
    alpha,
  );
}

// A ski-lift pylon with a lit crossbar; the cable runs between them.
function drawPylon(
  canvas: SkCanvas,
  res: RenderResources,
  cam: Camera,
  x: number,
  z: number,
  alpha: number,
): void {
  const th = res.theme;
  const s = scaleAt(cam, z);
  if (s <= 0) return;
  const px = sx(cam, x, s);
  const top = sy(cam, 9, s);
  res.stroke.setColor(th.lift);
  res.stroke.setAlphaf(alpha);
  res.stroke.setStrokeWidth(Math.max(1.5, 0.3 * s));
  canvas.drawLine(px, sy(cam, 0, s), px, top, res.stroke);
  res.stroke.setStrokeWidth(Math.max(1.5, 0.18 * s));
  canvas.drawLine(px - 1.6 * s, top, px + 1.6 * s, top, res.stroke);
  res.fill.setColor(th.neon);
  res.fill.setAlphaf(alpha);
  canvas.drawCircle(px - 1.6 * s, top, Math.max(1.2, 0.14 * s), res.fill);
  canvas.drawCircle(px + 1.6 * s, top, Math.max(1.2, 0.14 * s), res.fill);
}

export function drawMountainScenery(
  canvas: SkCanvas,
  res: RenderResources,
  cam: Camera,
  face: FaceRect,
  time: number,
): void {
  const th = res.theme;
  const nearZ = cam.z + cam.near + 0.5;
  // Ski lift out on the right: pylons with a cable running between them, and chairs.
  const liftX = ROAD_HALF + 11;
  const firstLift = Math.floor((cam.z - 4) / LIFT_SLOT);
  const lastLift = Math.floor((cam.z + WORLD.drawDistance) / LIFT_SLOT);
  const sCableN = scaleAt(cam, Math.max(nearZ, firstLift * LIFT_SLOT));
  const sCableF = scaleAt(cam, (lastLift + 1) * LIFT_SLOT);
  if (sCableN > 0 && sCableF > 0) {
    res.stroke.setColor(th.lift);
    res.stroke.setAlphaf(0.6);
    res.stroke.setStrokeWidth(1);
    for (let k = -1; k <= 1; k += 2) {
      const cx = liftX + k * 1.6;
      canvas.drawLine(
        sx(cam, cx, sCableN),
        sy(cam, 9, sCableN),
        sx(cam, cx, sCableF),
        sy(cam, 9, sCableF),
        res.stroke,
      );
    }
  }
  for (let i = lastLift; i >= firstLift; i--) {
    const z = i * LIFT_SLOT;
    if (z <= nearZ) continue;
    const alpha = distanceFade(cam, z, WORLD.drawDistance);
    if (alpha > 0) drawPylon(canvas, res, cam, liftX, z, alpha);
    // A chair halfway along each span, moving up the line.
    const cz = z + ((time * 3) % LIFT_SLOT);
    const s = scaleAt(cam, cz);
    const ca = distanceFade(cam, cz, WORLD.drawDistance);
    if (s > 0 && ca > 0 && cz > nearZ) {
      const px = sx(cam, liftX - 1.6, s);
      res.stroke.setColor(th.lift);
      res.stroke.setAlphaf(ca);
      res.stroke.setStrokeWidth(Math.max(1, 0.08 * s));
      canvas.drawLine(px, sy(cam, 9, s), px, sy(cam, 7.2, s), res.stroke);
      fillRect(
        canvas,
        res,
        px - 0.5 * s,
        sy(cam, 7.4, s),
        px + 0.5 * s,
        sy(cam, 7, s),
        th.neonHot,
        ca,
      );
    }
  }

  const first = Math.floor((cam.z - 4) / TREE_SLOT);
  const last = Math.floor((cam.z + WORLD.drawDistance) / TREE_SLOT);
  for (let i = last; i >= first; i--) {
    for (let side = -1; side <= 1; side += 2) {
      const id = i * 2 + (side > 0 ? 1 : 0);
      const z = i * TREE_SLOT + hash01(id + 7919) * 3;
      if (z <= nearZ) continue;
      const alpha = distanceFade(cam, z, WORLD.drawDistance);
      if (alpha <= 0) continue;
      const x = side * (ROAD_HALF + 2 + hash01(id) * 6);
      if (hash01(id + 31) < 0.14) {
        drawCabin(canvas, res, cam, face, side < 0 ? x - 6 : x + 2, z, id, alpha);
      } else {
        drawPine(canvas, res, cam, x, z, id, alpha, time);
        // A second pine further back fills the treeline.
        if (hash01(id + 41) < 0.45)
          drawPine(canvas, res, cam, x + side * 4, z + 3, id + 99, alpha, time);
      }
    }
  }
}

// Jump: a wall of glowing ice blocks, with magenta up chevrons.
function drawIceWall(
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
    0.2 * alpha,
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
    th.ice,
    th.iceSide,
    th.iceTop,
    alpha,
  );
  if (!face.valid) return;
  const w = face.r - face.l;
  const fh = face.b - face.t;
  // Block seams.
  fillRect(
    canvas,
    res,
    face.l,
    face.t + fh * 0.5 - 0.6,
    face.r,
    face.t + fh * 0.5 + 0.6,
    th.iceSide,
    alpha,
  );
  for (let i = 0; i < 3; i++) {
    const cx = face.l + w * ((i + 0.5) / 3);
    const cw = w * 0.12;
    const top = face.t + fh * 0.22;
    const bot = face.t + fh * 0.72;
    const t = fh * 0.2;
    fillQuad(canvas, res, cx - cw, bot, cx, top, cx, top + t, cx - cw, bot + t, th.neonHot, alpha);
    fillQuad(canvas, res, cx, top, cx + cw, bot, cx + cw, bot + t, cx, top + t, th.neonHot, alpha);
  }
  fillRect(canvas, res, face.l, face.t, face.r, face.t + fh * 0.1, th.neon, alpha);
}

// Slide: a slalom timing banner on two poles, filling the no-go band, with a down arrow.
function drawBanner(
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
  const pw = 0.14;
  drawBox(
    canvas,
    res,
    cam,
    face,
    x - g.halfWidth,
    x - g.halfWidth + pw,
    0,
    g.beamTop + 0.3,
    o.z0,
    o.z1,
    th.pole,
    th.pole,
    th.poleTop,
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
    g.beamTop + 0.3,
    o.z0,
    o.z1,
    th.pole,
    th.pole,
    th.poleTop,
    alpha,
  );
  const zn = Math.max(o.z0, cam.z + cam.near);
  const s = scaleAt(cam, zn);
  if (s <= 0) return;
  const l = sx(cam, x - g.halfWidth + pw, s);
  const r = sx(cam, x + g.halfWidth - pw, s);
  const t = sy(cam, g.beamTop, s);
  const b = sy(cam, g.beamBottom, s);
  const edge = Math.max(2, (b - t) * 0.09);
  const pulse = 0.3 + 0.1 * Math.sin(time * 6 + o.seed * 5);
  fillRect(canvas, res, l - edge, t - edge, r + edge, b + edge, th.neonHot, pulse * alpha);
  fillRect(canvas, res, l, t, r, b, th.banner, alpha);
  fillRect(canvas, res, l, t, r, t + edge, th.neonHot, alpha);
  fillRect(canvas, res, l, b - edge, r, b, th.neonHot, alpha);
  // Down arrow.
  const cx = (l + r) / 2;
  const hh = b - t;
  const aw = hh * 0.42;
  fillQuad(
    canvas,
    res,
    cx - aw * 0.35,
    t + hh * 0.2,
    cx + aw * 0.35,
    t + hh * 0.2,
    cx + aw * 0.35,
    b - hh * 0.18 - aw * 0.55,
    cx - aw * 0.35,
    b - hh * 0.18 - aw * 0.55,
    th.bannerInk,
    alpha,
  );
  fillQuad(
    canvas,
    res,
    cx - aw,
    b - hh * 0.18 - aw * 0.6,
    cx + aw,
    b - hh * 0.18 - aw * 0.6,
    cx,
    b - hh * 0.18,
    cx,
    b - hh * 0.18,
    th.bannerInk,
    alpha,
  );
}

// Dodge: a snowcat groomer on tracks with a plough blade; oncoming ones light the snow.
function drawSnowcat(
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
  if (o.vz !== 0) {
    const flicker = 0.8 + 0.2 * Math.sin(time * 20 + o.seed * 7);
    groundQuad(
      canvas,
      res,
      cam,
      x - 0.9,
      x + 0.9,
      o.z0 - 16,
      o.z0,
      th.light,
      0.16 * alpha * flicker,
    );
    groundQuad(canvas, res, cam, x - 0.5, x + 0.5, o.z0 - 9, o.z0, th.light, 0.2 * alpha * flicker);
  }
  groundQuad(
    canvas,
    res,
    cam,
    x - t.halfWidth - 0.15,
    x + t.halfWidth + 0.15,
    o.z0 - 0.3,
    o.z1 + 0.2,
    th.neon,
    0.25 * alpha,
  );
  // Tracks down each side, then the body, the cab, and the blade in front.
  drawBox(
    canvas,
    res,
    cam,
    face,
    x - t.halfWidth,
    x - t.halfWidth + 0.45,
    0,
    0.7,
    o.z0 + 0.6,
    o.z1,
    th.track,
    th.track,
    th.pole,
    alpha,
  );
  drawBox(
    canvas,
    res,
    cam,
    face,
    x + t.halfWidth - 0.45,
    x + t.halfWidth,
    0,
    0.7,
    o.z0 + 0.6,
    o.z1,
    th.track,
    th.track,
    th.pole,
    alpha,
  );
  drawBox(
    canvas,
    res,
    cam,
    face,
    x - t.halfWidth + 0.1,
    x + t.halfWidth - 0.1,
    0.5,
    1.7,
    o.z0 + 0.8,
    o.z1,
    th.cat,
    th.catSide,
    th.catTop,
    alpha,
  );
  if (face.valid) {
    const w = face.r - face.l;
    const fh = face.b - face.t;
    fillRect(canvas, res, face.l, face.t + fh * 0.5, face.r, face.t + fh * 0.62, th.neonHot, alpha);
    if (o.vz !== 0) {
      const lr = Math.max(2, w * 0.06);
      res.fill.setColor(th.light);
      res.fill.setAlphaf(0.35 * alpha);
      canvas.drawCircle(face.l + w * 0.18, face.t + fh * 0.25, lr * 2, res.fill);
      canvas.drawCircle(face.r - w * 0.18, face.t + fh * 0.25, lr * 2, res.fill);
      res.fill.setAlphaf(alpha);
      canvas.drawCircle(face.l + w * 0.18, face.t + fh * 0.25, lr, res.fill);
      canvas.drawCircle(face.r - w * 0.18, face.t + fh * 0.25, lr, res.fill);
    }
  }
  drawBox(
    canvas,
    res,
    cam,
    face,
    x - 0.75,
    x + 0.75,
    1.7,
    t.height,
    o.z0 + 1.6,
    o.z1 - 3,
    th.cat,
    th.catSide,
    th.catTop,
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
      face.t + fh * 0.75,
      th.glass,
      alpha,
    );
    fillRect(
      canvas,
      res,
      face.l + w * 0.3,
      face.t - fh * 0.08,
      face.r - w * 0.3,
      face.t,
      th.neon,
      alpha,
    );
  }
  drawBox(
    canvas,
    res,
    cam,
    face,
    x - t.halfWidth - 0.1,
    x + t.halfWidth + 0.1,
    0,
    0.9,
    o.z0,
    o.z0 + 0.3,
    th.catSide,
    th.catSide,
    th.catTop,
    alpha,
  );
}

export function drawMountainObstacle(
  canvas: SkCanvas,
  res: RenderResources,
  cam: Camera,
  face: FaceRect,
  o: Obstacle,
  time: number,
): void {
  const alpha = distanceFade(cam, o.z0, WORLD.drawDistance);
  if (alpha <= 0) return;
  if (o.kind === ObstacleKind.Barrier) drawIceWall(canvas, res, cam, face, o, alpha);
  else if (o.kind === ObstacleKind.Gate) drawBanner(canvas, res, cam, face, o, alpha, time);
  else if (o.kind === ObstacleKind.Tram) drawSnowcat(canvas, res, cam, face, o, alpha, time);
}

// Crevasses: a dark crack in the snow with a cyan glow deep inside and icy lips.
export function drawCrevasses(
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
    groundQuad(canvas, res, cam, x - g.halfWidth, x + g.halfWidth, o.z0, o.z1, th.crevasse, alpha);
    const pulse = 0.3 + 0.15 * Math.sin(state.time * 3 + o.seed * 5);
    groundQuad(
      canvas,
      res,
      cam,
      x - g.halfWidth * 0.6,
      x + g.halfWidth * 0.6,
      o.z0 + 0.6,
      o.z1 - 0.4,
      th.crevasseGlow,
      pulse * alpha,
    );
    groundQuad(
      canvas,
      res,
      cam,
      x - g.halfWidth,
      x + g.halfWidth,
      o.z0 - 0.15,
      o.z0 + 0.1,
      th.iceTop,
      alpha,
    );
    groundQuad(
      canvas,
      res,
      cam,
      x - g.halfWidth,
      x + g.halfWidth,
      o.z1 - 0.1,
      o.z1 + 0.15,
      th.iceTop,
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

// Falling snow in screen space: a fixed set of flakes drifting down and sideways.
export function drawSnowfall(
  canvas: SkCanvas,
  res: RenderResources,
  time: number,
  reduceMotion: boolean,
): void {
  if (reduceMotion) return;
  res.fill.setColor(res.theme.snow);
  for (let i = 0; i < FLAKES; i++) {
    const h1 = hash01(i * 7 + 1);
    const h2 = hash01(i * 13 + 5);
    const speed = 0.08 + h2 * 0.12;
    const y = ((h1 + time * speed) % 1) * res.height;
    const x = ((h2 * 1.3 + Math.sin(time * 0.8 + i) * 0.03) % 1) * res.width;
    res.fill.setAlphaf(0.35 + h1 * 0.45);
    canvas.drawCircle(x, y, 1 + h2 * 2.2, res.fill);
  }
}
