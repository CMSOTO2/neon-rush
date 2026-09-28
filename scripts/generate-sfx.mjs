// Synthesizes the game's sound effects as 16-bit mono WAV files in assets/sfx.
// Every sound is generated from oscillators and noise, so there are no licensing concerns.
// Run with: node scripts/generate-sfx.mjs

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RATE = 22050;
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'sfx');

let noiseSeed = 1234567;
const noise = () => {
  noiseSeed = (noiseSeed * 1103515245 + 12345) & 0x7fffffff;
  return (noiseSeed / 0x7fffffff) * 2 - 1;
};

const sine = (phase) => Math.sin(phase * Math.PI * 2);
const square = (phase) => (phase % 1 < 0.5 ? 1 : -1);
const saw = (phase) => (phase % 1) * 2 - 1;
const tri = (phase) => 1 - 4 * Math.abs((phase % 1) - 0.5);

// Renders `seconds` of audio from a per-sample function (t in seconds -> sample in -1..1).
function render(seconds, fn) {
  const n = Math.floor(seconds * RATE);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = fn(i / RATE, i);
  return out;
}

// Oscillator with a frequency that can change over time (phase is integrated).
function osc(wave, freqAt) {
  let phase = 0;
  return (t) => {
    phase += freqAt(t) / RATE;
    return wave(phase);
  };
}

const env = (t, attack, decay) => (t < attack ? t / attack : Math.exp(-(t - attack) / decay));

function lowpass(samples, cutoff) {
  const rc = 1 / (2 * Math.PI * cutoff);
  const a = 1 / RATE / (rc + 1 / RATE);
  let y = 0;
  return samples.map((x) => (y += a * (x - y)));
}

function mix(...tracks) {
  const n = Math.max(...tracks.map((t) => t.length));
  const out = new Float32Array(n);
  for (const t of tracks) for (let i = 0; i < t.length; i++) out[i] += t[i];
  return out;
}

function concat(...tracks) {
  const n = tracks.reduce((s, t) => s + t.length, 0);
  const out = new Float32Array(n);
  let o = 0;
  for (const t of tracks) {
    out.set(t, o);
    o += t.length;
  }
  return out;
}

function normalize(samples, peak = 0.85) {
  let max = 0;
  for (const s of samples) max = Math.max(max, Math.abs(s));
  const k = max > 0 ? peak / max : 1;
  // Short fade-out avoids clicks at the end.
  const fade = Math.min(samples.length, Math.floor(RATE * 0.01));
  return samples.map((s, i) => {
    const tail = samples.length - i;
    return s * k * (tail < fade ? tail / fade : 1);
  });
}

function writeWav(name, samples, peak) {
  const data = normalize(samples, peak);
  const buf = Buffer.alloc(44 + data.length * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + data.length * 2, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(RATE, 24);
  buf.writeUInt32LE(RATE * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(data.length * 2, 40);
  data.forEach((s, i) =>
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, s)) * 32767), 44 + i * 2),
  );
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, `${name}.wav`), buf);
  console.log(`${name}.wav  ${(buf.length / 1024).toFixed(1)} KB`);
}

const blip = (freq, seconds, wave = sine, decay = 0.05) => {
  const o = osc(wave, () => freq);
  return render(seconds, (t) => o(t) * env(t, 0.003, decay));
};

// Coin: two bright rising blips.
writeWav(
  'coin',
  concat(
    mix(
      blip(1318, 0.07, sine, 0.04),
      blip(2636, 0.07, tri, 0.02).map((s) => s * 0.25),
    ),
    mix(
      blip(1976, 0.16, sine, 0.07),
      blip(3952, 0.16, tri, 0.03).map((s) => s * 0.2),
    ),
  ),
  0.6,
);

// Jump: quick upward sweep.
{
  const o = osc(square, (t) => 260 + 900 * t * 4);
  const s = render(0.2, (t) => o(t) * env(t, 0.005, 0.07));
  writeWav('jump', lowpass(s, 2600), 0.45);
}

// Slide: filtered noise whoosh.
writeWav(
  'slide',
  lowpass(
    render(0.32, (t) => noise() * Math.sin((t / 0.32) * Math.PI)),
    1400,
  ),
  0.5,
);

// Lane change: very short soft swish.
writeWav(
  'lane',
  lowpass(
    render(0.09, (t) => noise() * env(t, 0.01, 0.03)),
    2500,
  ),
  0.3,
);

// Landing: low thump.
{
  const o = osc(sine, (t) => 110 - 60 * Math.min(1, t * 10));
  writeWav(
    'land',
    render(0.12, (t) => o(t) * env(t, 0.002, 0.04)),
    0.5,
  );
}

// Power-up pickup: rising major arpeggio.
writeWav(
  'powerup',
  concat(
    ...[1047, 1319, 1568, 2093].map((f, i) =>
      mix(
        blip(f, i === 3 ? 0.28 : 0.07, square, i === 3 ? 0.12 : 0.05).map((s) => s * 0.5),
        blip(f * 2, 0.07, sine, 0.03).map((s) => s * 0.3),
      ),
    ),
  ),
  0.5,
);

// Mission complete: two bell notes a fourth apart, softer and longer than the power-up.
{
  const bell = (f, seconds) => {
    const a = osc(sine, () => f);
    const b = osc(sine, () => f * 2.76);
    const c = osc(sine, () => f * 5.4);
    return render(
      seconds,
      (t) =>
        a(t) * env(t, 0.004, 0.32) +
        0.35 * b(t) * env(t, 0.002, 0.12) +
        0.12 * c(t) * env(t, 0.001, 0.05),
    );
  };
  writeWav('mission', concat(bell(1568, 0.11), bell(2093, 0.75)), 0.5);
}

// Chaser drone arriving: a short two-tone siren over a rotor buzz.
{
  const tone = osc(
    tri,
    (t) => (Math.floor(t / 0.13) % 2 === 0 ? 988 : 740) * (1 + 0.01 * Math.sin(t * 60)),
  );
  const buzz = osc(saw, () => 92);
  const s = render(0.56, (t) => {
    const fade = Math.min(1, t / 0.02) * Math.min(1, (0.56 - t) / 0.12);
    return (tone(t) * 0.8 + buzz(t) * 0.25 * (0.6 + 0.4 * Math.sin(t * 190))) * fade;
  });
  writeWav('siren', lowpass(s, 3200), 0.42);
}

// Shield break: glassy shimmer over a falling tone.
{
  const o = osc(tri, (t) => 1800 - 1200 * t * 2.5);
  const tone = render(0.4, (t) => o(t) * env(t, 0.002, 0.12));
  const shatter = render(0.4, (t) => noise() * env(t, 0.001, 0.06));
  writeWav(
    'shield',
    mix(
      tone,
      lowpass(shatter, 5000).map((s) => s * 0.8),
    ),
    0.55,
  );
}

// Speed boost: rising sawtooth rush.
{
  const o = osc(saw, (t) => 180 + 700 * t * t * 3);
  const s = render(0.55, (t) => o(t) * Math.min(1, t * 8) * Math.exp(-Math.max(0, t - 0.35) * 12));
  writeWav('boost', lowpass(s, 3000), 0.45);
}

// Crash: noise burst plus a dropping low thud.
{
  const o = osc(sine, (t) => 140 - 100 * Math.min(1, t * 3));
  const thud = render(0.55, (t) => o(t) * env(t, 0.002, 0.18));
  const burst = lowpass(
    render(0.55, (t) => noise() * env(t, 0.001, 0.09)),
    1800,
  );
  writeWav(
    'crash',
    mix(
      thud,
      burst.map((s) => s * 0.9),
    ),
    0.8,
  );
}

// UI click.
writeWav('click', blip(880, 0.05, tri, 0.012), 0.35);

// Game over: falling minor phrase.
writeWav(
  'gameover',
  concat(
    ...[659, 587, 523, 392].map((f, i) => {
      const o = osc(square, (t) => f * (i === 3 ? 1 - t * 0.15 : 1));
      const len = i === 3 ? 0.5 : 0.14;
      return lowpass(
        render(len, (t) => o(t) * env(t, 0.004, i === 3 ? 0.25 : 0.08)),
        2200,
      );
    }),
  ),
  0.45,
);
