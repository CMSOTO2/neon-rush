'worklet';

import type { SkCanvas, SkColor } from '@shopify/react-native-skia';

import { PLAYER } from '../config';
import { HeadStyle } from '../characters/characters';
import { Phase, PowerUpKind, type GameState } from '../types';
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

const crashedPhase = (state: GameState) =>
  state.phase === Phase.Crashing || state.phase === Phase.Over;

// Hood silhouette (per character), visor strap and head accessory, seen from behind.
function drawHead(
  canvas: SkCanvas,
  res: RenderResources,
  hx: number,
  hy: number,
  alpha: number,
  t: number,
): void {
  const c = res.character;
  const hr = 0.28;
  switch (c.head) {
    case HeadStyle.FoxEars:
      tri(
        canvas,
        res,
        hx - 0.26,
        hy + 0.08,
        hx - 0.22,
        hy + 0.44,
        hx - 0.02,
        hy + 0.22,
        c.jacket,
        alpha,
      );
      tri(
        canvas,
        res,
        hx + 0.26,
        hy + 0.08,
        hx + 0.22,
        hy + 0.44,
        hx + 0.02,
        hy + 0.22,
        c.jacket,
        alpha,
      );
      tri(
        canvas,
        res,
        hx - 0.2,
        hy + 0.16,
        hx - 0.19,
        hy + 0.36,
        hx - 0.08,
        hy + 0.24,
        c.trim,
        alpha,
      );
      tri(
        canvas,
        res,
        hx + 0.2,
        hy + 0.16,
        hx + 0.19,
        hy + 0.36,
        hx + 0.08,
        hy + 0.24,
        c.trim,
        alpha,
      );
      break;
    case HeadStyle.Antenna: {
      const sway = Math.sin(t * 7) * 0.04;
      limb(canvas, res, hx + 0.1, hy + 0.2, hx + 0.16 + sway, hy + 0.52, 0.035, c.trim, alpha);
      dot(canvas, res, hx + 0.16 + sway, hy + 0.54, 0.06, c.visor, alpha);
      break;
    }
    case HeadStyle.PomBeanie:
      dot(canvas, res, hx, hy + 0.34, 0.1, c.trim, alpha);
      break;
    case HeadStyle.DinoSpikes:
      for (let i = 0; i < 3; i++) {
        const y = hy + 0.26 - i * 0.16;
        tri(canvas, res, hx - 0.07, y - 0.05, hx + 0.07, y - 0.05, hx, y + 0.12, c.trim, alpha);
      }
      break;
  }
  dot(canvas, res, hx, hy, hr, c.jacket, alpha);
  dot(canvas, res, hx, hy - 0.05, hr * 0.8, c.jacketShade, alpha * 0.35);
  if (c.head === HeadStyle.PomBeanie) {
    // Ribbed beanie band.
    limb(canvas, res, hx - hr * 0.92, hy + 0.08, hx + hr * 0.92, hy + 0.08, 0.08, c.trim, alpha);
  }
  limb(canvas, res, hx - hr * 0.95, hy - 0.02, hx + hr * 0.95, hy - 0.02, 0.07, c.visor, alpha);
  dot(canvas, res, hx - hr * 0.98, hy - 0.02, 0.07, c.visor, alpha);
  dot(canvas, res, hx + hr * 0.98, hy - 0.02, 0.07, c.visor, alpha);

  switch (res.accessory) {
    case 1: {
      // Headphones: band over the top, cups on the sides.
      const hp = res.ui.accent;
      const pb = res.pb;
      pb.moveTo(hx - hr * 1.02, hy);
      for (let i = 1; i <= 8; i++) {
        const a = Math.PI - (i / 8) * Math.PI;
        pb.lineTo(hx + Math.cos(a) * hr * 1.02, hy + Math.sin(a) * hr * 1.05);
      }
      res.stroke.setColor(hp);
      res.stroke.setAlphaf(alpha);
      res.stroke.setStrokeWidth(0.05);
      canvas.drawPath(pb.detach(), res.stroke);
      limb(canvas, res, hx - hr * 1.04, hy - 0.06, hx - hr * 1.04, hy + 0.05, 0.13, hp, alpha);
      limb(canvas, res, hx + hr * 1.04, hy - 0.06, hx + hr * 1.04, hy + 0.05, 0.13, hp, alpha);
      break;
    }
    case 2:
      // Backwards snapback: crown of the cap plus the brim pointing at the camera.
      dot(canvas, res, hx, hy + 0.1, hr * 0.92, res.gap.rim, alpha);
      limb(canvas, res, hx - 0.14, hy - 0.02, hx + 0.14, hy - 0.02, 0.09, res.gap.rim, alpha);
      dot(canvas, res, hx, hy + 0.1, 0.05, res.ui.white, alpha);
      break;
    case 3:
      // Crown.
      tri(
        canvas,
        res,
        hx - 0.2,
        hy + 0.2,
        hx - 0.12,
        hy + 0.2,
        hx - 0.19,
        hy + 0.42,
        res.ui.gold,
        alpha,
      );
      tri(canvas, res, hx - 0.06, hy + 0.2, hx + 0.06, hy + 0.2, hx, hy + 0.47, res.ui.gold, alpha);
      tri(
        canvas,
        res,
        hx + 0.12,
        hy + 0.2,
        hx + 0.2,
        hy + 0.2,
        hx + 0.19,
        hy + 0.42,
        res.ui.gold,
        alpha,
      );
      limb(canvas, res, hx - 0.2, hy + 0.21, hx + 0.2, hy + 0.21, 0.07, res.ui.gold, alpha);
      dot(canvas, res, hx, hy + 0.24, 0.035, res.gap.rim, alpha);
      break;
  }
}

// Ribbon of glowing dots trailing from the runner's feet, following recent positions.
function drawTrail(canvas: SkCanvas, res: RenderResources, cam: Camera, state: GameState): void {
  const colors = res.trail;
  if (colors.length === 0 || state.phase !== Phase.Running) return;
  const tx = state.trailX;
  const ty = state.trailY;
  for (let i = tx.length - 1; i >= 1; i--) {
    const z = state.distance - i * 0.5;
    const s = scaleAt(cam, z);
    if (s <= 0) continue;
    const k = 1 - i / tx.length;
    const color = colors[(i + Math.floor(state.time * 12)) % colors.length];
    dot(
      canvas,
      res,
      sx(cam, tx[i], s),
      sy(cam, ty[i] + 0.12, s),
      0.16 * s * k + 1,
      color,
      0.75 * k,
    );
  }
}

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
  const fell = state.fell && crashedPhase(state);
  canvas.save();
  canvas.translate(shX, shY);
  canvas.scale(1, 0.3);
  if (!fell) dot(canvas, res, 0, 0, 0.62 * s * lift, res.ui.shadow, 0.45 * lift);
  // Magnet field: a pulsing ring around the runner's feet.
  if (state.power[PowerUpKind.Magnet] > 0) {
    const pulse = (state.time * 1.6) % 1;
    res.stroke.setColor(res.power[PowerUpKind.Magnet]);
    res.stroke.setStrokeWidth(Math.max(2, 0.08 * s));
    res.stroke.setAlphaf(0.8 * (1 - pulse));
    canvas.drawCircle(0, 0, (0.7 + pulse * 1.6) * s, res.stroke);
  }
  canvas.restore();

  drawTrail(canvas, res, cam, state);

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
  } else if (state.phase === Phase.Complete) {
    // Finish-line celebration: little hops with both arms up.
    const hop = Math.abs(Math.sin(t * 7)) * 0.12;
    hipY += hop;
    chestY += hop;
    headY += hop;
    lFy = hop;
    rFy = hop;
    lKy += hop;
    rKy += hop;
    lHx = -0.42;
    rHx = 0.42;
    lHy = 1.95 + hop;
    rHy = 1.95 + hop;
    lEx = -0.4;
    rEx = 0.4;
    lEy = 1.55 + hop;
    rEy = 1.55 + hop;
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
  } else if (p.flying) {
    // Jetpack: legs trailing together, arms out like wings, gentle bob.
    const bob = Math.sin(t * 5) * 0.04;
    hipY += bob;
    chestY += bob;
    headY += bob;
    lFx = -0.1;
    rFx = 0.1;
    lFy = 0.12;
    rFy = 0.16;
    lKx = -0.13;
    rKx = 0.13;
    lKy = 0.45;
    rKy = 0.47;
    lHx = -0.62;
    rHx = 0.62;
    lHy = 1.12 + bob;
    rHy = 1.12 + bob;
    lEx = -0.45;
    rEx = 0.45;
    lEy = 1.22 + bob;
    rEy = 1.22 + bob;
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
  } else if (state.power[PowerUpKind.Boost] > 0) {
    // Riding the hoverboard: knees bent, feet planted wide, arms out for balance.
    const sway = Math.sin(t * 6) * 0.03;
    hipY = 0.68 + sway;
    chestY = 1.14 + sway;
    headY = 1.44 + sway;
    lFx = -0.3;
    rFx = 0.3;
    lFy = 0.22;
    rFy = 0.22;
    lKx = -0.3;
    rKx = 0.3;
    lKy = 0.44;
    rKy = 0.44;
    lHx = -0.62;
    rHx = 0.6;
    lHy = 0.95;
    rHy = 1.05;
    lEx = -0.42;
    rEx = 0.42;
    lEy = 1.05;
    rEy = 1.1;
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
      alpha = state.reduceMotion ? 0.6 : Math.floor(t * 18) % 2 === 0 ? 0.45 : 1;
    } else if (state.invuln > 0) {
      // Grace period after a shield break or power-up: blink so it's clearly temporary.
      alpha = state.reduceMotion ? 0.7 : Math.floor(t * 14) % 2 === 0 ? 0.5 : 1;
    }
  }
  // Sink out of sight when falling into a gap.
  if (fell) alpha *= clamp(1 + p.y / 1.5, 0, 1);
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

  if (state.power[PowerUpKind.Boost] > 0) {
    const flick = 0.85 + 0.15 * Math.sin(t * 40);
    dot(canvas, res, 0, 0.95, 0.95 * flick, res.power[PowerUpKind.Boost], 0.22);
    dot(canvas, res, 0, 0.95, 0.7 * flick, res.power[PowerUpKind.Boost], 0.25);
  }

  // Hoverboard under the feet while boosting.
  if (state.power[PowerUpKind.Boost] > 0 && !p.flying && !crashed) {
    const hover = 0.1 + Math.sin(t * 9) * 0.02;
    dot(canvas, res, 0, hover, 0.75, res.board.glow, 0.18);
    limb(canvas, res, -0.62, hover + 0.12, 0.62, hover + 0.12, 0.2, res.board.deck, alpha);
    limb(canvas, res, -0.5, hover + 0.05, 0.5, hover + 0.05, 0.05, res.ui.white, alpha * 0.8);
  }

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

  drawHead(canvas, res, headX, headY, alpha, t);

  if (p.collectFlash > 0) {
    dot(canvas, res, 0, chestY - 0.2, 0.55 * (p.collectFlash / 0.15), res.ui.gold, 0.35);
  }

  // Backpack with a status light.
  limb(canvas, res, 0, hipY + 0.24, 0, chestY - 0.2, 0.36, c.backpack, alpha);
  limb(canvas, res, 0, hipY + 0.2, 0, chestY - 0.16, 0.05, c.backpackLight, alpha * 0.9);
  const blink = Math.sin(t * 6) > 0 ? 1 : 0.3;
  dot(canvas, res, 0.1, chestY - 0.12, 0.04, c.backpackLight, alpha * blink);

  if (p.flying) {
    const jet = res.power[PowerUpKind.Jetpack];
    limb(canvas, res, -0.14, hipY + 0.1, -0.14, chestY - 0.05, 0.2, jet, alpha);
    limb(canvas, res, 0.14, hipY + 0.1, 0.14, chestY - 0.05, 0.2, jet, alpha);
    limb(canvas, res, -0.14, chestY - 0.08, -0.14, chestY - 0.02, 0.2, res.ui.white, alpha);
    limb(canvas, res, 0.14, chestY - 0.08, 0.14, chestY - 0.02, 0.2, res.ui.white, alpha);
    // Flames.
    const f = 0.25 + Math.sin(t * 35) * 0.06;
    tri(canvas, res, -0.22, hipY + 0.02, -0.06, hipY + 0.02, -0.14, hipY - f, res.ui.gold, alpha);
    tri(canvas, res, 0.06, hipY + 0.02, 0.22, hipY + 0.02, 0.14, hipY - f, res.ui.gold, alpha);
  }

  // Shield bubble.
  if (state.power[PowerUpKind.Shield] > 0) {
    const sc = res.power[PowerUpKind.Shield];
    const pulse = 1 + 0.03 * Math.sin(t * 6);
    const top = p.sliding ? 0.6 : 0.95;
    dot(canvas, res, 0, top, 1.05 * pulse, sc, 0.16);
    res.stroke.setColor(sc);
    res.stroke.setAlphaf(0.75);
    res.stroke.setStrokeWidth(0.06);
    canvas.drawCircle(0, top, 1.05 * pulse, res.stroke);
    limb(canvas, res, -0.55, top + 0.55, -0.3, top + 0.8, 0.06, res.ui.white, 0.6);
  }

  // Dizzy stars after a crash.
  if (crashed && !fell) {
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
