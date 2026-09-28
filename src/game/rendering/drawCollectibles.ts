'worklet';

import type { SkCanvas, SkColor } from '@shopify/react-native-skia';

import { COINS, laneX, WORLD } from '../config';
import { PowerUpKind, type Coin, type GameState, type Pickup } from '../types';
import { scaleAt, sx, sy, type Camera } from './camera';
import { distanceFade, drawBuilt } from './primitives';
import type { RenderResources } from './resources';

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

function poly(
  canvas: SkCanvas,
  res: RenderResources,
  cx: number,
  cy: number,
  r: number,
  pts: number[],
  color: SkColor,
  alpha: number,
): void {
  const pb = res.pb;
  pb.moveTo(cx + pts[0] * r, cy + pts[1] * r);
  for (let i = 2; i < pts.length; i += 2) pb.lineTo(cx + pts[i] * r, cy + pts[i + 1] * r);
  pb.close();
  res.fill.setColor(color);
  res.fill.setAlphaf(alpha);
  drawBuilt(canvas, pb, res.fill);
}

function stroke(
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
  res.stroke.setColor(color);
  res.stroke.setAlphaf(alpha);
  res.stroke.setStrokeWidth(width);
  canvas.drawLine(x0, y0, x1, y1, res.stroke);
}

const SHIELD = [-0.62, -0.72, 0.62, -0.72, 0.62, 0.02, 0, 0.8, -0.62, 0.02];
const BOLT = [0.18, -0.85, -0.5, 0.12, -0.06, 0.12, -0.22, 0.85, 0.5, -0.16, 0.06, -0.16];

// Draws a power-up's symbol centred at (cx, cy) with radius r, in screen space. Shared by
// the floating pickups and the HUD timers.
export function drawPowerIcon(
  canvas: SkCanvas,
  res: RenderResources,
  kind: number,
  cx: number,
  cy: number,
  r: number,
  alpha: number,
): void {
  const color = res.power[kind];
  const white = res.ui.white;
  switch (kind) {
    case PowerUpKind.Magnet: {
      const w = r * 0.42;
      const pb = res.pb;
      pb.moveTo(cx - r * 0.55, cy - r * 0.7);
      pb.lineTo(cx - r * 0.55, cy + r * 0.05);
      for (let i = 1; i <= 8; i++) {
        const a = Math.PI - (i / 8) * Math.PI;
        pb.lineTo(cx + Math.cos(a) * r * 0.55, cy + r * 0.05 + Math.sin(a) * r * 0.55);
      }
      pb.lineTo(cx + r * 0.55, cy - r * 0.7);
      res.stroke.setColor(color);
      res.stroke.setAlphaf(alpha);
      res.stroke.setStrokeWidth(w);
      drawBuilt(canvas, pb, res.stroke);
      stroke(
        canvas,
        res,
        cx - r * 0.55,
        cy - r * 0.72,
        cx - r * 0.55,
        cy - r * 0.45,
        w,
        white,
        alpha,
      );
      stroke(
        canvas,
        res,
        cx + r * 0.55,
        cy - r * 0.72,
        cx + r * 0.55,
        cy - r * 0.45,
        w,
        white,
        alpha,
      );
      return;
    }
    case PowerUpKind.Shield:
      poly(canvas, res, cx, cy, r, SHIELD, color, alpha);
      stroke(
        canvas,
        res,
        cx - r * 0.3,
        cy - r * 0.45,
        cx - r * 0.3,
        cy + r * 0.05,
        r * 0.14,
        white,
        alpha * 0.8,
      );
      return;
    case PowerUpKind.Jetpack:
      stroke(
        canvas,
        res,
        cx - r * 0.3,
        cy - r * 0.55,
        cx - r * 0.3,
        cy + r * 0.2,
        r * 0.42,
        color,
        alpha,
      );
      stroke(
        canvas,
        res,
        cx + r * 0.3,
        cy - r * 0.55,
        cx + r * 0.3,
        cy + r * 0.2,
        r * 0.42,
        color,
        alpha,
      );
      poly(
        canvas,
        res,
        cx - r * 0.3,
        cy + r * 0.45,
        r,
        [-0.16, 0, 0.16, 0, 0, 0.42],
        res.ui.gold,
        alpha,
      );
      poly(
        canvas,
        res,
        cx + r * 0.3,
        cy + r * 0.45,
        r,
        [-0.16, 0, 0.16, 0, 0, 0.42],
        res.ui.gold,
        alpha,
      );
      return;
    case PowerUpKind.Multiplier: {
      const font = res.hudSmallFont;
      const k = (r * 1.25) / font.getSize();
      const w = font.getTextWidth('x2') * k;
      canvas.save();
      canvas.translate(cx - w / 2, cy + r * 0.42);
      canvas.scale(k, k);
      res.fill.setColor(color);
      res.fill.setAlphaf(alpha);
      canvas.drawText('x2', 0, 0, res.fill, font);
      canvas.restore();
      return;
    }
    default:
      poly(canvas, res, cx, cy, r, BOLT, color, alpha);
  }
}

export function drawCoin(
  canvas: SkCanvas,
  res: RenderResources,
  cam: Camera,
  state: GameState,
  c: Coin,
): void {
  const s = scaleAt(cam, c.z);
  if (s <= 0) return;
  let y = c.y;
  let grow = 1;
  let alpha = distanceFade(cam, c.z, WORLD.drawDistance);
  if (c.collected) {
    const t = c.collectTime / COINS.popTime;
    y += t * 1.3;
    grow = 1 + t * 0.7;
    alpha *= 1 - t;
  }
  const r = COINS.radius * s * cam.heightBoost * grow;
  if (r < 0.8 || alpha <= 0) return;
  const cx = sx(cam, c.x, s);
  const cy = sy(cam, y, s);
  const spin = Math.cos(state.time * 6 + c.seed * 6.283);
  const w = Math.max(0.2, Math.abs(spin));
  const coin = res.coin;

  if (r > 3) dot(canvas, res, cx, cy, r * 1.6, coin.face, 0.16 * alpha);
  canvas.save();
  canvas.translate(cx, cy);
  canvas.scale(w, 1);
  dot(canvas, res, 0, 0, r, coin.rim, alpha);
  dot(canvas, res, 0, 0, r * 0.8, coin.face, alpha);
  if (r > 4) dot(canvas, res, 0, 0, r * 0.45, coin.inner, alpha);
  canvas.restore();
  if (r > 3 && spin > 0)
    dot(canvas, res, cx - r * 0.32 * w, cy - r * 0.34, r * 0.17, coin.shine, alpha);
}

export function drawPickup(
  canvas: SkCanvas,
  res: RenderResources,
  cam: Camera,
  state: GameState,
  u: Pickup,
): void {
  const s = scaleAt(cam, u.z);
  if (s <= 0) return;
  const alpha = distanceFade(cam, u.z, WORLD.drawDistance);
  if (alpha <= 0) return;
  const bob = Math.sin(state.time * 3 + u.kind) * 0.15;
  const r = 0.5 * s * cam.heightBoost;
  if (r < 1) return;
  const cx = sx(cam, laneX(u.lane), s);
  const cy = sy(cam, u.y + bob, s);
  const color = res.power[u.kind];
  const pulse = 0.5 + 0.5 * Math.sin(state.time * 6);

  // Light column on the road so pickups are easy to spot from far away.
  const gy = sy(cam, 0, s);
  stroke(canvas, res, cx, gy, cx, cy, Math.max(1, r * 0.25), color, 0.25 * alpha);
  dot(canvas, res, cx, cy, r * (1.55 + pulse * 0.2), color, 0.22 * alpha);
  dot(canvas, res, cx, cy, r, color, alpha);
  dot(canvas, res, cx, cy, r * 0.82, res.ui.shadow, 0.9 * alpha);
  res.stroke.setColor(res.ui.white);
  res.stroke.setAlphaf(alpha);
  res.stroke.setStrokeWidth(Math.max(1, r * 0.08));
  canvas.drawCircle(cx, cy, r, res.stroke);
  drawPowerIcon(canvas, res, u.kind, cx, cy, r * 0.62, alpha);
}
