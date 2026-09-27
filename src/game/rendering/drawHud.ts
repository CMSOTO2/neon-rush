'worklet';

import type { SkCanvas } from '@shopify/react-native-skia';

import { hash01 } from '../engine/random';
import { ParticleKind, Phase, PowerUpKind, type GameState } from '../types';
import { scaleAt, sx, sy, type Camera } from './camera';
import { drawPowerIcon } from './drawCollectibles';
import type { RenderResources } from './resources';

export function drawParticles(
  canvas: SkCanvas,
  res: RenderResources,
  cam: Camera,
  state: GameState,
): void {
  const pool = state.particles;
  for (let i = 0; i < pool.length; i++) {
    const pt = pool[i];
    if (!pt.active) continue;
    const s = scaleAt(cam, pt.z);
    if (s <= 0) continue;
    const a = pt.life / pt.maxLife;
    let color = res.ui.accent;
    let alpha = a;
    switch (pt.kind) {
      case ParticleKind.Dust:
        alpha = a * 0.5;
        break;
      case ParticleKind.Spark:
      case ParticleKind.Star:
      case ParticleKind.Sparkle:
        color = res.ui.gold;
        break;
      case ParticleKind.Flame:
        color = a > 0.6 ? res.coin.shine : a > 0.3 ? res.power[PowerUpKind.Jetpack] : res.gap.rim;
        break;
      case ParticleKind.Shard:
        color = res.ui.white;
        break;
    }
    res.fill.setColor(color);
    res.fill.setAlphaf(alpha);
    const size = pt.kind === ParticleKind.Flame ? pt.size * (0.5 + a) : pt.size;
    canvas.drawCircle(sx(cam, pt.x, s), sy(cam, pt.y, s), Math.max(1, size * s), res.fill);
  }
}

// Streaks rushing past the screen edges while boosting or flying.
export function drawSpeedLines(
  canvas: SkCanvas,
  res: RenderResources,
  cam: Camera,
  state: GameState,
): void {
  const boost = state.power[PowerUpKind.Boost] > 0;
  if ((!boost && !state.player.flying) || state.reduceMotion) return;
  const cx = cam.width / 2;
  const cy = cam.horizonY;
  const frame = Math.floor(state.time * 30);
  res.stroke.setColor(boost ? res.ui.gold : res.ui.white);
  for (let i = 0; i < 14; i++) {
    const a = hash01(frame * 31 + i) * Math.PI * 2;
    const r0 = cam.width * (0.45 + hash01(frame * 17 + i) * 0.3);
    const len = cam.width * (0.15 + hash01(frame * 7 + i) * 0.25);
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    res.stroke.setAlphaf(0.35);
    res.stroke.setStrokeWidth(1.5 + hash01(i + frame) * 2);
    canvas.drawLine(
      cx + dx * r0,
      cy + dy * r0,
      cx + dx * (r0 + len),
      cy + dy * (r0 + len),
      res.stroke,
    );
  }
}

function shadowText(
  canvas: SkCanvas,
  res: RenderResources,
  text: string,
  x: number,
  y: number,
  font: RenderResources['hudFont'],
  color: RenderResources['ui']['text'],
): void {
  res.fill.setColor(res.ui.shadow);
  res.fill.setAlphaf(0.7);
  canvas.drawText(text, x + 2, y + 3, res.fill, font);
  res.fill.setColor(color);
  res.fill.setAlphaf(1);
  canvas.drawText(text, x, y, res.fill, font);
}

// Score, distance, coins and power-up timers are drawn in Skia so they update every
// frame without React renders.
export function drawHud(canvas: SkCanvas, res: RenderResources, state: GameState): void {
  if (state.phase === Phase.Ready) return;
  const right = res.width - 18;
  const top = res.hudTop + 8;
  const big = res.hudFont;
  const small = res.hudSmallFont;

  const score = String(state.stats.score);
  const sw = big.getTextWidth(score);
  shadowText(canvas, res, score, right - sw, top + 36, big, res.ui.text);

  // 2x badge beside the score while the multiplier runs.
  if (state.power[PowerUpKind.Multiplier] > 0) {
    const bx = right - sw - 34;
    const pulse = 1 + 0.08 * Math.sin(state.time * 10);
    res.fill.setColor(res.power[PowerUpKind.Multiplier]);
    res.fill.setAlphaf(1);
    canvas.drawCircle(bx, top + 22, 15 * pulse, res.fill);
    const tw = small.getTextWidth('x2');
    res.fill.setColor(res.ui.white);
    canvas.drawText('x2', bx - tw / 2, top + 29, res.fill, small);
  }

  const dist = Math.floor(state.distance) + ' m';
  const dw = small.getTextWidth(dist);
  shadowText(canvas, res, dist, right - dw, top + 62, small, res.ui.accent);

  // Coin counter with a small coin; it flashes on every pickup.
  const coins = String(state.stats.coins);
  const cw = small.getTextWidth(coins);
  const cy = top + 90;
  shadowText(canvas, res, coins, right - cw, cy, small, res.ui.gold);
  const flash = state.player.collectFlash > 0 ? 1.25 : 1;
  const coinX = right - cw - 16;
  res.fill.setColor(res.coin.rim);
  res.fill.setAlphaf(1);
  canvas.drawCircle(coinX, cy - 7, 9 * flash, res.fill);
  res.fill.setColor(res.coin.face);
  canvas.drawCircle(coinX, cy - 7, 7 * flash, res.fill);

  // Active power-ups: icon with a draining ring, stacked down the left edge.
  let slot = 0;
  for (let k = 0; k < state.power.length; k++) {
    const t = state.power[k];
    if (t <= 0) continue;
    const frac = t / state.powerFull[k];
    const x = 42;
    const y = top + 92 + slot * 58;
    const r = 22;
    // Blink during the final second so players know it's about to end.
    const alpha = t < 1.2 && Math.floor(t * 8) % 2 === 0 ? 0.45 : 1;
    res.fill.setColor(res.ui.shadow);
    res.fill.setAlphaf(0.75 * alpha);
    canvas.drawCircle(x, y, r, res.fill);
    res.stroke.setColor(res.power[k]);
    res.stroke.setAlphaf(alpha);
    res.stroke.setStrokeWidth(4);
    res.rect.setXYWH(x - r, y - r, r * 2, r * 2);
    canvas.drawArc(res.rect, -90, 360 * frac, false, res.stroke);
    drawPowerIcon(canvas, res, k, x, y, r * 0.55, alpha);
    slot++;
  }
}
