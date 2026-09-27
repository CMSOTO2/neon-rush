'worklet';

import type { SkCanvas } from '@shopify/react-native-skia';

import { ParticleKind, Phase, type GameState } from '../types';
import { scaleAt, sx, sy, type Camera } from './camera';
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
    const color =
      pt.kind === ParticleKind.Spark
        ? res.ui.gold
        : pt.kind === ParticleKind.Star
          ? res.ui.gold
          : res.ui.accent;
    res.fill.setColor(color);
    res.fill.setAlphaf(pt.kind === ParticleKind.Dust ? a * 0.5 : a);
    canvas.drawCircle(sx(cam, pt.x, s), sy(cam, pt.y, s), Math.max(1, pt.size * s), res.fill);
  }
}

// Score and distance are drawn in Skia so they update every frame without React renders.
export function drawHud(canvas: SkCanvas, res: RenderResources, state: GameState): void {
  if (state.phase === Phase.Ready) return;
  const right = res.width - 18;
  const top = res.hudTop + 8;

  const score = String(state.stats.score);
  const big = res.hudFont;
  const sw = big.getTextWidth(score);
  res.fill.setColor(res.ui.shadow);
  res.fill.setAlphaf(0.7);
  canvas.drawText(score, right - sw + 2, top + 36 + 3, res.fill, big);
  res.fill.setColor(res.ui.text);
  res.fill.setAlphaf(1);
  canvas.drawText(score, right - sw, top + 36, res.fill, big);

  const dist = Math.floor(state.distance) + ' m';
  const small = res.hudSmallFont;
  const dw = small.getTextWidth(dist);
  res.fill.setColor(res.ui.shadow);
  res.fill.setAlphaf(0.7);
  canvas.drawText(dist, right - dw + 1, top + 62 + 2, res.fill, small);
  res.fill.setColor(res.ui.accent);
  res.fill.setAlphaf(1);
  canvas.drawText(dist, right - dw, top + 62, res.fill, small);
}
