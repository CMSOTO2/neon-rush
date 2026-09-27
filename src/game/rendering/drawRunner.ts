'worklet';

import type { SkCanvas, SkColor } from '@shopify/react-native-skia';

import { PLAYER } from '../config';
import { Phase, type GameState } from '../types';
import { scaleAt, sx, sy, type Camera } from './camera';
import type { RenderResources } from './resources';

// The runner is drawn procedurally from behind in local meters (y up, origin at the feet),
// so every pose is a handful of joint positions. Big, exaggerated poses keep each state
// readable at a glance: tucked jump, low slide, lean into lane changes, tumble on crash.

function limb(
  canvas: SkCanvas,
  res: RenderResources,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  width: number,
  color: SkColor,
  alpha: number,
): void {
  const st = res.stroke;
  st.setColor(color);
  st.setAlphaf(alpha);
  st.setStrokeWidth(width);
  canvas.drawLine(x0, y0, x1, y1, st);
}

function dot(
  canvas: SkCanvas,
  res: RenderResources,
  x: number,
  y: number,
  r: number,
  color: SkColor,
  alpha: number,
): void {
  res.fill.setColor(color);
  res.fill.setAlphaf(alpha);
  canvas.drawCircle(x, y, r, res.fill);
}

function tri(
  canvas: SkCanvas,
  res: RenderResources,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  color: SkColor,
  alpha: number,
): void {
  const pb = res.pb;
  pb.moveTo(ax, ay);
  pb.lineTo(bx, by);
  pb.lineTo(cx, cy);
  pb.close();
  res.fill.setColor(color);
  res.fill.setAlphaf(alpha);
  canvas.drawPath(pb.detach(), res.fill);
}

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

export function drawRunner(
  canvas: SkCanvas,
  res: RenderResources,
  cam: Camera,
  state: GameState,
): void {
  const p = state.player;
  const c = res.character;
  const t = state.time;
  const s = scaleAt(cam, state.distance);
  if (s <= 0) return;

  // Ground shadow shrinks as the runner rises.
  const shX = sx(cam, p.x, s);
  const shY = sy(cam, 0, s);
  const lift = clamp(1 - p.y * 0.22, 0.45, 1);
  canvas.save();
  canvas.translate(shX, shY);
  canvas.scale(1, 0.3);
  dot(canvas, res, 0, 0, 0.62 * s * lift, res.ui.shadow, 0.45 * lift);
  canvas.restore();

  // Pose defaults: standing.
  let hipY = 0.8;
  let chestY = 1.28;
  let headX = 0;
  let headY = 1.58;
  let lean = 0;
  let sqX = 1;
  let sqY = 1;
  let lFx = -0.15;
  let lFy = 0;
  let lKx = -0.17;
  let lKy = 0.42;
  let rFx = 0.15;
  let rFy = 0;
  let rKx = 0.17;
  let rKy = 0.42;
  let lHx = -0.34;
  let lHy = 0.8;
  let lEx = -0.38;
  let lEy = 1.02;
  let rHx = 0.34;
  let rHy = 0.8;
  let rEx = 0.38;
  let rEy = 1.02;
  let alpha = 1;

  const crashed = state.phase === Phase.Crashing || state.phase === Phase.Over;

  if (state.phase === Phase.Ready) {
    const b = Math.sin(t * 2.4) * 0.018;
    hipY += b;
    chestY += b;
    headY += b * 1.2;
    headX = Math.sin(t * 0.9) * 0.035;
    lHy += b;
    rHy += b;
  } else if (crashed) {
    const k = clamp(state.crashTime * 2.6, 0, 1);
    lean = -78 * k;
    const flail = Math.sin(t * 28) * 0.12 * (1 - k * 0.6);
    lHx = -0.5;
    lHy = 1.5 + flail;
    lEx = -0.42;
    lEy = 1.3;
    rHx = 0.52;
    rHy = 1.45 - flail;
    rEx = 0.44;
    rEy = 1.28;
    lFy = 0.1;
    rFy = 0.22;
    rKy = 0.5;
  } else if (p.sliding) {
    hipY = 0.3;
    chestY = 0.66;
    headY = 0.88;
    headX = -0.04;
    lFx = -0.2;
    lFy = 0.06;
    lKx = -0.22;
    lKy = 0.26;
    rFx = 0.2;
    rFy = 0.06;
    rKx = 0.22;
    rKy = 0.26;
    lHx = -0.62;
    lHy = 0.07;
    lEx = -0.5;
    lEy = 0.34;
    rHx = 0.6;
    rHy = 0.72;
    rEx = 0.46;
    rEy = 0.6;
    sqX = 1.06;
    lean = -6;
  } else if (!p.grounded) {
    const r = clamp(p.vy / PLAYER.jumpVelocity, -1, 1);
    const tuck = clamp(0.45 + r * 0.7, 0, 1);
    lFx = -0.2;
    rFx = 0.2;
    lFy = 0.06 + tuck * 0.34;
    rFy = 0.1 + tuck * 0.3;
    lKx = -0.24;
    rKx = 0.24;
    lKy = 0.44 + tuck * 0.2;
    rKy = 0.46 + tuck * 0.18;
    const armUp = 0.35 + tuck * 0.5;
    lHx = -0.46 - tuck * 0.1;
    rHx = 0.46 + tuck * 0.1;
    lHy = 1.0 + armUp * 0.7;
    rHy = 1.0 + armUp * 0.7;
    lEx = -0.46;
    rEx = 0.46;
    lEy = 1.12 + armUp * 0.2;
    rEy = 1.12 + armUp * 0.2;
    if (p.airTime < 0.1) {
      sqY = 1.12;
      sqX = 0.92;
    }
  } else {
    const ph = p.runPhase;
    const sn = Math.sin(ph);
    const liftL = Math.max(0, sn);
    const liftR = Math.max(0, -sn);
    const bob = Math.abs(sn) * 0.06;
    hipY += bob;
    chestY += bob;
    headY += bob;
    lFy = liftL * 0.4;
    rFy = liftR * 0.4;
    lKy = 0.42 + liftL * 0.24 + bob;
    rKy = 0.42 + liftR * 0.24 + bob;
    lHy = 0.86 + bob - sn * 0.2;
    rHy = 0.86 + bob + sn * 0.2;
    lEy = 1.06 + bob - sn * 0.06;
    rEy = 1.06 + bob + sn * 0.06;
    lHx = -0.36 - liftR * 0.06;
    rHx = 0.36 + liftL * 0.06;
    headX = sn * 0.02;
  }

  // Lean into lane changes; wobble while stumbling.
  if (!crashed) {
    lean += clamp(p.vx * 2.4, -18, 18);
    if (p.stumbleTime > 0) {
      lean += Math.sin(t * 45) * 10;
      alpha = Math.floor(t * 18) % 2 === 0 ? 0.45 : 1;
    }
  }
  if (p.landSquash > 0) {
    const f = p.landSquash / PLAYER.landSquashTime;
    sqY *= 1 - 0.16 * f;
    sqX *= 1 + 0.12 * f;
  }

  const k = s * cam.heightBoost * 0.92;
  canvas.save();
  canvas.translate(sx(cam, p.x, s), sy(cam, p.y, s));
  canvas.scale(k * sqX, -k * sqY);
  // Pivot around the hips (or feet when falling over).
  const pivot = crashed ? 0 : hipY;
  canvas.rotate(-lean, 0, pivot);

  // Legs and shoes.
  limb(canvas, res, -0.12, hipY, lKx, lKy, 0.21, c.pants, alpha);
  limb(canvas, res, lKx, lKy, lFx, lFy + 0.08, 0.19, c.pants, alpha);
  limb(canvas, res, 0.12, hipY, rKx, rKy, 0.21, c.pants, alpha);
  limb(canvas, res, rKx, rKy, rFx, rFy + 0.08, 0.19, c.pants, alpha);
  dot(canvas, res, lFx, lFy + 0.06, 0.13, c.shoes, alpha);
  dot(canvas, res, rFx, rFy + 0.06, 0.13, c.shoes, alpha);
  limb(canvas, res, lFx - 0.1, lFy - 0.03, lFx + 0.1, lFy - 0.03, 0.06, c.soleGlow, alpha);
  limb(canvas, res, rFx - 0.1, rFy - 0.03, rFx + 0.1, rFy - 0.03, 0.06, c.soleGlow, alpha);

  // Arms, behind the torso.
  const shoulderY = chestY - 0.06;
  limb(canvas, res, -0.24, shoulderY, lEx, lEy, 0.16, c.jacketShade, alpha);
  limb(canvas, res, lEx, lEy, lHx, lHy, 0.15, c.jacketShade, alpha);
  limb(canvas, res, 0.24, shoulderY, rEx, rEy, 0.16, c.jacketShade, alpha);
  limb(canvas, res, rEx, rEy, rHx, rHy, 0.15, c.jacketShade, alpha);
  dot(canvas, res, lHx, lHy, 0.085, c.skin, alpha);
  dot(canvas, res, rHx, rHy, 0.085, c.skin, alpha);

  // Torso: a jacket capsule with a trim hem.
  limb(canvas, res, 0, hipY + 0.12, 0, chestY - 0.08, 0.54, c.jacket, alpha);
  limb(canvas, res, -0.2, hipY + 0.04, 0.2, hipY + 0.04, 0.09, c.trim, alpha);

  // Hood with fox ears and a glowing visor strap.
  const hr = 0.28;
  if (c.ears === 1) {
    tri(
      canvas,
      res,
      headX - 0.26,
      headY + 0.08,
      headX - 0.22,
      headY + 0.44,
      headX - 0.02,
      headY + 0.22,
      c.jacket,
      alpha,
    );
    tri(
      canvas,
      res,
      headX + 0.26,
      headY + 0.08,
      headX + 0.22,
      headY + 0.44,
      headX + 0.02,
      headY + 0.22,
      c.jacket,
      alpha,
    );
    tri(
      canvas,
      res,
      headX - 0.2,
      headY + 0.16,
      headX - 0.19,
      headY + 0.36,
      headX - 0.08,
      headY + 0.24,
      c.trim,
      alpha,
    );
    tri(
      canvas,
      res,
      headX + 0.2,
      headY + 0.16,
      headX + 0.19,
      headY + 0.36,
      headX + 0.08,
      headY + 0.24,
      c.trim,
      alpha,
    );
  }
  dot(canvas, res, headX, headY, hr, c.jacket, alpha);
  dot(canvas, res, headX, headY - 0.05, hr * 0.8, c.jacketShade, alpha * 0.35);
  limb(
    canvas,
    res,
    headX - hr * 0.95,
    headY - 0.02,
    headX + hr * 0.95,
    headY - 0.02,
    0.07,
    c.visor,
    alpha,
  );
  dot(canvas, res, headX - hr * 0.98, headY - 0.02, 0.07, c.visor, alpha);
  dot(canvas, res, headX + hr * 0.98, headY - 0.02, 0.07, c.visor, alpha);

  // Backpack with a status light.
  limb(canvas, res, 0, hipY + 0.24, 0, chestY - 0.2, 0.36, c.backpack, alpha);
  limb(canvas, res, 0, hipY + 0.2, 0, chestY - 0.16, 0.05, c.backpackLight, alpha * 0.9);
  const blink = Math.sin(t * 6) > 0 ? 1 : 0.3;
  dot(canvas, res, 0.1, chestY - 0.12, 0.04, c.backpackLight, alpha * blink);

  // Dizzy stars after a crash.
  if (crashed) {
    for (let i = 0; i < 3; i++) {
      const a = t * 5 + (i * Math.PI * 2) / 3;
      dot(
        canvas,
        res,
        headX + Math.cos(a) * 0.4,
        headY + 0.35 + Math.sin(a) * 0.12,
        0.07,
        res.ui.gold,
        1,
      );
    }
  }
  canvas.restore();
}
