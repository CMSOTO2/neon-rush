// Composes the background music: an 8-bar synthwave loop (A minor, 112 BPM) built from
// oscillators and noise, so it is original and license-free. Writes a WAV, then converts
// it to AAC with macOS's afconvert when available.
// Run with: node scripts/generate-music.mjs

import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RATE = 22050;
const BPM = 112;
const BEAT = 60 / BPM;
const BARS = 8;
const LENGTH = BARS * 4 * BEAT;
const N = Math.round(LENGTH * RATE);
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'music');

const mix = new Float32Array(N);
const midi = (n) => 440 * 2 ** ((n - 69) / 12);

let seed = 99;
const noise = () => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return (seed / 0x7fffffff) * 2 - 1;
};

// Adds a note, wrapping around the loop end so the loop is seamless.
function note(start, duration, fn, gain) {
  const s0 = Math.round(start * RATE);
  const len = Math.round(duration * RATE);
  for (let i = 0; i < len; i++) {
    const t = i / RATE;
    mix[(s0 + i) % N] += fn(t, duration) * gain;
  }
}

const saw = (f, t) => ((f * t) % 1) * 2 - 1;
const square = (f, t) => ((f * t) % 1 < 0.5 ? 1 : -1);
const sine = (f, t) => Math.sin(2 * Math.PI * f * t);

// Chords: Am, F, C, G (two beats... one bar each, repeated).
const CHORDS = [
  [57, 60, 64],
  [53, 57, 60],
  [48, 52, 55],
  [55, 59, 62],
];

for (let bar = 0; bar < BARS; bar++) {
  const chord = CHORDS[bar % 4];
  const t0 = bar * 4 * BEAT;

  // Pad: soft detuned saws, slow attack, released before the next bar.
  for (const n of chord) {
    const f = midi(n);
    note(
      t0,
      4 * BEAT,
      (t, d) => {
        const env = Math.min(1, t / 0.4) * Math.min(1, (d - t) / 0.3);
        return (saw(f, t) + saw(f * 1.006, t) + saw(f * 0.994, t)) * env;
      },
      0.025,
    );
  }

  // Bass: driving eighths on the root.
  const root = midi(chord[0] - 24);
  for (let e = 0; e < 8; e++) {
    note(
      t0 + e * (BEAT / 2),
      BEAT / 2,
      (t, d) => {
        const env = Math.exp(-t * 6) * Math.min(1, (d - t) / 0.02);
        // Cheap low-pass: blend saw with its sine fundamental.
        return (saw(root, t) * 0.5 + sine(root, t)) * env;
      },
      0.16,
    );
  }

  // Arpeggio: sixteenths through the chord an octave up (bars 3+ only, for build-up).
  if (bar >= 2) {
    const tones = [chord[0] + 12, chord[1] + 12, chord[2] + 12, chord[1] + 12];
    for (let s = 0; s < 16; s++) {
      const f = midi(tones[s % 4]);
      note(
        t0 + s * (BEAT / 4),
        BEAT / 4,
        (t, d) => square(f, t) * Math.exp(-t * 14) * Math.min(1, (d - t) / 0.01),
        0.035,
      );
    }
  }

  // Drums.
  for (let b = 0; b < 4; b++) {
    const tb = t0 + b * BEAT;
    // Kick every beat.
    note(tb, 0.25, (t) => sine(55 + 90 * Math.exp(-t * 30), t) * Math.exp(-t * 12), 0.5);
    // Snare on 2 and 4.
    if (b % 2 === 1) note(tb, 0.2, (t) => noise() * Math.exp(-t * 18), 0.18);
    // Hats on the off-beats.
    note(tb + BEAT / 2, 0.05, (t) => noise() * Math.exp(-t * 80), 0.07);
  }
}

// Normalize and write 16-bit mono WAV.
let peak = 0;
for (const s of mix) peak = Math.max(peak, Math.abs(s));
const k = 0.8 / peak;
const buf = Buffer.alloc(44 + N * 2);
buf.write('RIFF', 0);
buf.writeUInt32LE(36 + N * 2, 4);
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
buf.writeUInt32LE(N * 2, 40);
for (let i = 0; i < N; i++)
  buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, mix[i] * k)) * 32767), 44 + i * 2);

mkdirSync(OUT, { recursive: true });
const wav = join(OUT, 'theme.wav');
writeFileSync(wav, buf);
try {
  const m4a = join(OUT, 'theme.m4a');
  execFileSync('afconvert', ['-f', 'm4af', '-d', 'aac', '-b', '64000', wav, m4a]);
  rmSync(wav);
  console.log(`theme.m4a (${LENGTH.toFixed(1)}s loop)`);
} catch {
  console.log(`theme.wav (${LENGTH.toFixed(1)}s loop; afconvert unavailable, kept WAV)`);
}
