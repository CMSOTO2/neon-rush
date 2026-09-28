'worklet';

import type { SkCanvas } from '@shopify/react-native-skia';

import { hash01 } from '../engine/random';
import { TutorialMsg } from '../systems/tutorialSystem';
import { Action, GameMode, ParticleKind, Phase, PowerUpKind, type GameState } from '../types';
import { scaleAt, sx, sy, type Camera } from './camera';
import { drawPowerIcon } from './drawCollectibles';
import type { RenderResources } from './resources';
import { drawBuilt } from './primitives';

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

function centeredText(
  canvas: SkCanvas,
  res: RenderResources,
  text: string,
  y: number,
  font: RenderResources['hudFont'],
  color: RenderResources['ui']['text'],
): void {
  shadowText(canvas, res, text, (res.width - font.getTextWidth(text)) / 2, y, font, color);
}

// A thick chevron pointing along (dx, dy), centred on (cx, cy).
function chevron(
  canvas: SkCanvas,
  res: RenderResources,
  cx: number,
  cy: number,
  dx: number,
  dy: number,
  size: number,
): void {
  const pb = res.pb;
  // Tip, then the two arms swept back from it.
  const tx = cx + dx * size * 0.5;
  const ty = cy + dy * size * 0.5;
  pb.moveTo(tx - dx * size + dy * size, ty - dy * size - dx * size);
  pb.lineTo(tx, ty);
  pb.lineTo(tx - dx * size - dy * size, ty - dy * size + dx * size);
  drawBuilt(canvas, pb, res.stroke);
}

const HINTS: Record<number, { title: string; detail: string; dx: number; dy: number }> = {
  [Action.Jump]: { title: 'SWIPE UP', detail: 'to jump the barrier', dx: 0, dy: -1 },
  [Action.Slide]: { title: 'SWIPE DOWN', detail: 'to slide under the laser', dx: 0, dy: 1 },
  [Action.Right]: { title: 'SWIPE RIGHT', detail: 'to dodge the trams', dx: 1, dy: 0 },
  [Action.Left]: { title: 'SWIPE LEFT', detail: 'to dodge the trams', dx: -1, dy: 0 },
};

// First-run tutorial: while the game is frozen, a banner with a bouncing arrow says which
// way to swipe; after each move a short "NICE!" and finally "YOU'RE READY!".
function drawTutorial(canvas: SkCanvas, res: RenderResources, state: GameState): void {
  const big = res.hudFont;
  const small = res.hudSmallFont;
  const hint = state.tutorialHold >= 0 ? HINTS[state.tutorialHold] : undefined;
  // Below the score and coin counter, above the runner.
  const cy = Math.max(res.height * 0.3, res.hudTop + 215);
  if (hint) {
    res.fill.setColor(res.ui.shadow);
    res.fill.setAlphaf(0.62);
    res.rect.setXYWH(0, cy - 110, res.width, 190);
    canvas.drawRect(res.rect, res.fill);

    const bob = Math.sin(state.tutorialClock * 7) * 10;
    res.stroke.setColor(res.ui.accent);
    res.stroke.setAlphaf(1);
    res.stroke.setStrokeWidth(9);
    for (let i = 0; i < 2; i++) {
      const offset = bob + (i - 0.5) * 22;
      chevron(
        canvas,
        res,
        res.width / 2 + hint.dx * offset,
        cy - 44 + hint.dy * offset,
        hint.dx,
        hint.dy,
        20,
      );
    }
    centeredText(canvas, res, hint.title, cy + 34, big, res.ui.text);
    centeredText(canvas, res, hint.detail, cy + 62, small, res.ui.accent);
    return;
  }
  if (state.tutorialMsgTime > 0 && state.tutorialMsg !== TutorialMsg.None) {
    const ready = state.tutorialMsg === TutorialMsg.Ready;
    const y = cy;
    centeredText(
      canvas,
      res,
      ready ? "YOU'RE READY!" : 'NICE!',
      y,
      big,
      ready ? res.ui.gold : res.ui.accent,
    );
    if (ready) centeredText(canvas, res, 'Go as far as you can', y + 30, small, res.ui.text);
  }
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

  // Level progress: a bar across the top with a flag at the finish.
  if (state.mode === GameMode.Level && state.levelLength > 0) {
    const x0 = 78;
    const x1 = right - 96;
    const y = top + 22;
    const frac = Math.min(1, state.distance / state.levelLength);
    res.stroke.setStrokeWidth(8);
    res.stroke.setColor(res.ui.shadow);
    res.stroke.setAlphaf(0.7);
    canvas.drawLine(x0, y, x1, y, res.stroke);
    res.stroke.setColor(res.ui.accent);
    res.stroke.setAlphaf(1);
    if (frac > 0) canvas.drawLine(x0, y, x0 + (x1 - x0) * frac, y, res.stroke);
    res.fill.setColor(res.ui.white);
    res.fill.setAlphaf(1);
    canvas.drawCircle(x0 + (x1 - x0) * frac, y, 7, res.fill);
    res.fill.setColor(res.ui.gold);
    res.rect.setXYWH(x1 + 4, y - 11, 12, 8);
    canvas.drawRect(res.rect, res.fill);
    res.stroke.setStrokeWidth(2);
    res.stroke.setColor(res.ui.white);
    canvas.drawLine(x1 + 4, y - 11, x1 + 4, y + 6, res.stroke);
  }

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

  drawTutorial(canvas, res, state);
}
