'worklet';

import type { SkCanvas, SkColor } from '@shopify/react-native-skia';

import { CHASER } from '../config';
import { Phase, type GameState } from '../types';
import { scaleAt, sx, sy, type Camera } from './camera';
import { drawBuilt } from './primitives';
import type { RenderResources } from './resources';

// The security drone, drawn procedurally in local meters (y up) like the runner. It sits
// over the runner's shoulder, low enough on screen to leave the track ahead clear.

function bar(
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

function disc(
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

const easeOut = (t: number) => 1 - (1 - t) * (1 - t);

// World position of the drone this frame; writes into out = [x, y, z, alpha].
export function chaserPose(state: GameState, out: number[]): void {
  const ch = state.chaser;
  const p = state.player;
  let x = ch.x;
  let y = CHASER.height + Math.sin(state.time * 3.1) * 0.07;
  let z = state.distance - CHASER.back;
  let alpha = 1;
  // Fly in from above.
  const k = easeOut(Math.min(1, ch.age / CHASER.enterTime));
  y += (1 - k) * 2.6;
  alpha = k;
  if (ch.caught) {
    // Swoop onto the runner.
    const c = easeOut(Math.min(1, state.crashTime / CHASER.catchTime));
    x += (p.x - x) * c;
    y += (2.2 - y) * c;
    z += (state.distance - 0.6 - z) * c;
  } else if (ch.time <= 0) {
    // Fly up and away.
    const u = 1 - ch.leaving / CHASER.leaveTime;
    const e = u * u;
    y += e * 3.2;
    x += ch.side * e * 1.4;
    alpha *= 1 - u;
  }
  out[0] = x;
  out[1] = y;
  out[2] = z;
  out[3] = alpha;
}

export function drawChaser(
  canvas: SkCanvas,
  res: RenderResources,
  cam: Camera,
  state: GameState,
  pose: number[],
): void {
  const x = pose[0];
  const y = pose[1];
  const z = pose[2];
  const alpha = pose[3];
  if (alpha <= 0.01) return;
  const s = scaleAt(cam, z);
  if (s <= 0) return;
  const c = res.chaser;
  const t = state.time;
  const px = sx(cam, x, s);
  const py = sy(cam, y, s);

  // Searchlight on the runner's feet while it's hunting.
  const p = state.player;
  const sr = scaleAt(cam, state.distance);
  if (sr > 0 && !state.chaser.caught && state.phase === Phase.Running) {
    const gy = sy(cam, 0, sr);
    const pulse = state.reduceMotion ? 1 : 0.85 + 0.15 * Math.sin(t * 9);
    res.pb.moveTo(px, py + 0.2 * s * cam.heightBoost);
    res.pb.lineTo(sx(cam, p.x + 0.75, sr), gy);
    res.pb.lineTo(sx(cam, p.x - 0.75, sr), gy);
    res.pb.close();
    res.fill.setColor(c.eye);
    res.fill.setAlphaf(0.16 * pulse * alpha);
    drawBuilt(canvas, res.pb, res.fill);
    canvas.save();
    canvas.translate(sx(cam, p.x, sr), gy);
    canvas.scale(1, 0.3);
    disc(canvas, res, 0, 0, 0.8 * sr, c.eye, 0.22 * pulse * alpha);
    canvas.restore();
  }

  const k = s * cam.heightBoost * 0.8;
  canvas.save();
  canvas.translate(px, py);
  canvas.scale(k, -k);
  // Bank toward the way it's moving.
  canvas.rotate(
    Math.max(-14, Math.min(14, (p.x + state.chaser.side * CHASER.side - x) * -9)),
    0,
    0,
  );

  // Rotor arms and spinning blades (a blurred disc plus a blade that flickers in length).
  bar(canvas, res, -0.64, 0.14, 0.64, 0.14, 0.07, c.trim, alpha);
  for (let i = -1; i <= 1; i += 2) {
    const rx = i * 0.66;
    canvas.save();
    canvas.translate(rx, 0.2);
    canvas.scale(1, 0.22);
    disc(canvas, res, 0, 0, 0.36, c.rotor, 0.28 * alpha);
    canvas.restore();
    const blade = 0.08 + 0.3 * Math.abs(Math.cos(t * 47 + i));
    bar(canvas, res, rx - blade, 0.2, rx + blade, 0.2, 0.04, c.rotor, 0.9 * alpha);
    bar(canvas, res, rx, 0.12, rx, 0.2, 0.05, c.trim, alpha);
  }

  // Seen from behind: a body capsule with a lighter top, a red rear light bar (its eye
  // looks at the runner, away from us) and a siren that flashes red and blue.
  bar(canvas, res, -0.3, 0, 0.3, 0, 0.46, c.body, alpha);
  bar(canvas, res, -0.24, 0.1, 0.24, 0.1, 0.16, c.trim, alpha * 0.55);
  const glow = state.reduceMotion ? 0.3 : 0.24 + 0.14 * Math.sin(t * 9);
  bar(canvas, res, -0.26, -0.06, 0.26, -0.06, 0.26, c.eye, glow * alpha);
  bar(canvas, res, -0.22, -0.06, 0.22, -0.06, 0.08, c.eye, alpha);
  const blue = !state.reduceMotion && Math.floor(t * 6) % 2 === 1;
  disc(canvas, res, 0, 0.3, 0.075, blue ? c.siren : c.eye, alpha);
  disc(canvas, res, 0, 0.3, 0.16, blue ? c.siren : c.eye, 0.25 * alpha);
  canvas.restore();
}
