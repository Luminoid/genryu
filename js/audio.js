// The audio engine: a scheduler that loops a compiled piece, synthesized drum
// and pitched voices, and per-track effect chains over a shared room.
// Everything is synthesized when needed; there are no samples to download.
//
// Drums are physical caricatures rather than drum-machine clichés: a kick has a
// shell tone, a second mode and a beater knock; a snare has a head tone and a
// band of wire noise; cymbals and hats are a cluster of inharmonic square
// waves (the way a hi-hat circuit, or a real cymbal, actually behaves) under
// their own envelopes. Machine kits (808, 909, trap) keep the electronic
// recipes on purpose. Pitched voices come in seven kinds: oscillators,
// additive tones rendered to buffers (pianos, mallets, bells), plucked
// strings (Karplus-Strong), FM, FM brass with a rising modulation index,
// formant instruments (a sawtooth through body resonances: reeds, bowed
// strings), and the sung voice (a glottal pulse through five moving
// formants, with the breath, wander and vibrato of a singer). Guitars go
// through a modelled amplifier (tightening, tube-like stages, a speaker
// cabinet) and can be double-tracked left and right.

import { midiToFreq } from './theory.js';
import { compilePiece, isDrumTrack } from './pattern.js';

const LOOKAHEAD = 0.12; // seconds scheduled ahead of the clock
const TICK = 25; // ms between scheduler passes
const BUFFER_CACHE_MAX = 160;
const BUFFER_CACHE_SAMPLES = 12e6; // about 48 MB of rendered tones

// --- Deterministic noise ------------------------------------------------------

function mulberry(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return (((t ^ (t >>> 14)) >>> 0) / 4294967296) * 2 - 1;
  };
}

/** A buffer of white noise (one channel), cached per context. */
function noiseBuffer(ctx, seconds = 2) {
  if (ctx.__noise) return ctx.__noise;
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  const rnd = mulberry(1234);
  for (let i = 0; i < length; i++) data[i] = rnd();
  ctx.__noise = buffer;
  return buffer;
}

/**
 * A metallic cluster: inharmonic square waves summed, the raw material of hats
 * and cymbals. The '808' set is the six oscillators of that machine's hi-hat;
 * the 'cymbal' set is denser and higher, closer to bronze.
 */
function metalBuffer(ctx, kind = 'cymbal') {
  const key = `__metal_${kind}`;
  if (ctx[key]) return ctx[key];
  const length = Math.floor(ctx.sampleRate * 1.5);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  const freqs = kind === '808' ? [205.3, 304.4, 369.6, 522.7, 540, 800] : [263, 397, 534, 719, 931, 1174, 1543, 2011];
  const rnd = mulberry(kind === '808' ? 7 : 11);
  const phases = freqs.map(() => rnd() * Math.PI);
  for (let i = 0; i < length; i++) {
    const t = i / ctx.sampleRate;
    let v = 0;
    for (let k = 0; k < freqs.length; k++) v += Math.sin(2 * Math.PI * freqs[k] * t + phases[k]) >= 0 ? 1 : -1;
    data[i] = v / freqs.length;
  }
  // Keep only the upper partials (two passes of a one-pole highpass at 2.5 kHz) and
  // normalize, so the hat and cymbal voices get a usable level after their own filters.
  const k = Math.exp((-2 * Math.PI * 2500) / ctx.sampleRate);
  for (let pass = 0; pass < 2; pass++) {
    let lp = 0;
    for (let i = 0; i < length; i++) {
      lp = data[i] * (1 - k) + lp * k;
      data[i] -= lp;
    }
  }
  let peak = 0;
  for (let i = 0; i < length; i++) peak = Math.max(peak, Math.abs(data[i]));
  if (peak > 0) for (let i = 0; i < length; i++) data[i] /= peak;
  ctx[key] = buffer;
  return buffer;
}

/** A synthesized room: exponentially decaying noise with a darkening tail. */
function impulse(ctx, { seconds = 1.8, decay = 3, dark = 0.4 } = {}) {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);
    const rnd = mulberry(99 + channel);
    let lp = 0;
    for (let i = 0; i < length; i++) {
      const t = i / length;
      const env = Math.pow(1 - t, decay);
      const n = rnd();
      lp += (n - lp) * (1 - dark * t); // the tail loses highs as it fades
      data[i] = lp * env * (i < 400 ? i / 400 : 1);
    }
  }
  return buffer;
}

// --- Rendered tones: plucked strings and additive instruments ---------------------

const bufferCache = new Map(); // insertion order is recency: a hit moves its entry to the end
let bufferCacheSamples = 0;

function cached(ctx, key, make) {
  let buffer = bufferCache.get(key);
  if (buffer) {
    bufferCache.delete(key);
    bufferCache.set(key, buffer);
    return buffer;
  }
  const samples = make();
  buffer = ctx.createBuffer(1, samples.length, ctx.sampleRate);
  buffer.copyToChannel(samples, 0);
  bufferCacheSamples += samples.length;
  while (bufferCache.size && (bufferCache.size >= BUFFER_CACHE_MAX || bufferCacheSamples > BUFFER_CACHE_SAMPLES)) {
    const [oldKey, old] = bufferCache.entries().next().value;
    bufferCache.delete(oldKey);
    bufferCacheSamples -= old.length;
  }
  bufferCache.set(key, buffer);
  return buffer;
}

/**
 * A plucked string as samples: a Karplus-Strong loop, its length set by the pitch.
 * The string starts drawn aside at `pluck` of its length: what the bridge feels is
 * the string's slope, a step there (harmonics falling at 1/k, with nulls where the
 * pluck point divides the string), plus `noise`: the pick's grit, lowpassed by
 * `bright`. In the loop a two-point
 * average and a one-pole lowpass at `loopTone` take the highs out first, the
 * way a real string loses them, reaching silence after `t60` seconds.
 */
function pluckSamples(freq, sampleRate, { seconds = 2.5, bright = 0.6, t60 = 2.5, body = 0, seed = 1, pluck = 0.25, noise = 0.5, loopTone = 20000 } = {}) {
  const length = Math.floor(sampleRate * Math.min(seconds, t60 * 1.1 + 0.3));
  const out = new Float32Array(length);
  const k = 1 - Math.exp((-2 * Math.PI * Math.min(loopTone, sampleRate * 0.45)) / sampleRate);
  // the average and the one-pole each delay the loop; the line is shorter to keep the pitch
  const period = sampleRate / freq - 0.5 - (1 - k) / k;
  const n = Math.max(2, Math.floor(period));
  const frac = period - n;
  const line = new Float32Array(n + 1);
  const rnd = mulberry(seed + Math.round(freq));
  const at = Math.max(0.03, Math.min(0.5, pluck));
  let lp = 0;
  let mean = 0;
  for (let i = 0; i <= n; i++) {
    const w = rnd();
    lp += (w - lp) * bright;
    const shape = i < at * (n + 1) ? 1 - at : -at; // zero mean over the period
    line[i] = shape * (1 - noise) + lp * noise;
    mean += line[i];
  }
  mean /= n + 1;
  for (let i = 0; i <= n; i++) line[i] -= mean; // no standing offset circulating
  // Per-sample loss so the loop reaches -60 dB after t60 seconds, applied once per period.
  const loss = Math.pow(10, -3 / (t60 * freq));
  let idx = 0;
  let prev = 0;
  let tone = 0;
  for (let i = 0; i < length; i++) {
    const a = line[idx];
    const b = line[(idx + 1) % (n + 1)];
    const sample = a + (b - a) * frac;
    out[i] = sample;
    tone += ((sample + prev) * 0.5 - tone) * k; // the average, then the one-pole: highs decay first
    prev = sample;
    line[idx] = tone * loss;
    idx = (idx + 1) % (n + 1);
  }
  if (body > 0) {
    // A one-pole resonance around 180 Hz: a hint of a guitar body.
    const kb = Math.exp((-2 * Math.PI * 180) / sampleRate);
    let y = 0;
    for (let i = 0; i < length; i++) {
      y = out[i] * (1 - kb) + y * kb;
      out[i] = out[i] * (1 - body) + y * body * 3;
    }
  }
  let peak = 0;
  for (let i = 0; i < length; i++) peak = Math.max(peak, Math.abs(out[i]));
  if (peak > 0) for (let i = 0; i < length; i++) out[i] *= 0.9 / peak;
  return out;
}

/** A wavetable from harmonic amplitudes, cached per context and name. */
function customWave(ctx, name, harmonics) {
  const key = `__wave_${name}`;
  if (ctx[key]) return ctx[key];
  const real = new Float32Array(harmonics.length + 1);
  const imag = new Float32Array(harmonics.length + 1);
  harmonics.forEach((a, i) => {
    imag[i + 1] = a;
  });
  ctx[key] = ctx.createPeriodicWave(real, imag);
  return ctx[key];
}

/** Give an oscillator its wave: a named type, or the preset's `harmonics` (`harmonicsHigh` from midi `harmonicsSplit` up). */
function setWave(ctx, osc, wave, preset, name, midi) {
  if (wave !== 'custom') {
    osc.type = wave;
    return;
  }
  const high = preset.harmonicsHigh && preset.harmonicsSplit !== undefined && midi >= preset.harmonicsSplit;
  osc.setPeriodicWave(customWave(ctx, `${name}:${high ? 'high' : 'low'}`, high ? preset.harmonicsHigh : preset.harmonics));
}

function pluckBuffer(ctx, freq, preset, take = 0) {
  const key = `pluck:${ctx.sampleRate}:${freq.toFixed(2)}:${preset.bright}:${preset.t60}:${preset.body ?? 0}:${preset.pluck}:${preset.noise}:${preset.loopTone}:${take}`;
  return cached(ctx, key, () => pluckSamples(freq, ctx.sampleRate, { ...preset, seed: (preset.seed ?? 1) + take * 101 }));
}

/**
 * An additive tone: partials [ratio, amplitude, decay share] each decaying on
 * its own, stretched by `inharmonic` the way stiff strings and bars are, with
 * a short noise burst for the hammer or mallet. Low notes ring longer than
 * high ones (`decayPitch`). Rendered once per pitch and cached.
 */
function toneSamples(freq, sampleRate, preset) {
  const { partials, inharmonic = 0, decay = 2, decayPitch = 0.5, noise = 0, noiseDecay = 0.008, noiseTone = 2000 } = preset;
  const t60 = decay * Math.pow(220 / freq, decayPitch);
  const length = Math.floor(sampleRate * Math.min(3.5, t60 * 1.15 + 0.2));
  const out = new Float32Array(length);
  for (const [ratio, amp, share] of partials) {
    const f = freq * ratio * Math.sqrt(1 + inharmonic * ratio * ratio);
    if (f >= sampleRate * 0.45) continue;
    const tau = (t60 * share) / 6.9;
    const w = (2 * Math.PI * f) / sampleRate;
    const k = Math.exp(-1 / (sampleRate * tau));
    let env = amp;
    let phase = 0;
    for (let i = 0; i < length; i++) {
      out[i] += env * Math.sin(phase);
      phase += w;
      env *= k;
      if (env < 1e-5) break;
    }
  }
  if (noise > 0) {
    const rnd = mulberry(Math.round(freq));
    const k = Math.exp((-2 * Math.PI * noiseTone) / sampleRate);
    const nk = Math.exp(-1 / (sampleRate * noiseDecay));
    let lp = 0;
    let env = noise;
    for (let i = 0; i < length && env > 1e-4; i++) {
      lp = rnd() * (1 - k) + lp * k;
      out[i] += lp * env * 4;
      env *= nk;
    }
  }
  const attack = Math.floor(sampleRate * 0.002);
  for (let i = 0; i < attack; i++) out[i] *= i / attack;
  let peak = 0;
  for (let i = 0; i < length; i++) peak = Math.max(peak, Math.abs(out[i]));
  if (peak > 0) for (let i = 0; i < length; i++) out[i] /= peak;
  return out;
}

function toneBuffer(ctx, freq, preset, name) {
  const key = `tone:${name}:${ctx.sampleRate}:${freq.toFixed(2)}`;
  return cached(ctx, key, () => toneSamples(freq, ctx.sampleRate, preset));
}

// --- Effects --------------------------------------------------------------------

function driveCurve(amount, size = 1024) {
  const curve = new Float32Array(size);
  const k = amount * 60 + 1;
  for (let i = 0; i < size; i++) {
    const x = (i * 2) / size - 1;
    curve[i] = ((1 + k) * x) / (1 + k * Math.abs(x));
  }
  return curve;
}

/**
 * A tube-like stage: tanh with a bias, so the two half-waves clip differently
 * and even harmonics appear as well as odd ones. Normalized to +-1; the bias
 * leaves a DC offset the caller blocks with a highpass.
 */
function tubeCurve(gain, bias = 0.25, size = 2048) {
  const curve = new Float32Array(size);
  const off = Math.tanh(bias);
  const norm = 1 / Math.max(Math.tanh(gain + bias) - off, off - Math.tanh(bias - gain));
  for (let i = 0; i < size; i++) {
    const x = (i * 2) / size - 1;
    curve[i] = (Math.tanh(gain * x + bias) - off) * norm;
  }
  return curve;
}

function crushCurve(bits, size = 4096) {
  const steps = Math.pow(2, bits);
  const curve = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    const x = (i * 2) / size - 1;
    curve[i] = Math.round(x * steps) / steps;
  }
  return curve;
}

function biquad(ctx, type, frequency, q, gain) {
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = frequency;
  if (q !== undefined) f.Q.value = q;
  if (gain !== undefined) f.gain.value = gain;
  return f;
}

/**
 * Build a track's chain and return { input, output }. Order: amp (guitar
 * amplifier and cabinet) -> drive -> tone filters -> crush -> chorus -> delay
 * -> tremolo -> pan. The instrument preset's own `fx` are the defaults; the
 * track's `fx` override them. `wide` (0 to 1) double-tracks the part: two
 * chains panned left and right, each fed its own take (see scheduleLoop), the
 * way rhythm guitars are recorded twice and panned apart.
 */
function buildChain(ctx, fx = {}, stepSeconds) {
  if (!fx.wide) return buildMonoChain(ctx, fx, stepSeconds);
  const { wide, ...rest } = fx;
  const left = buildMonoChain(ctx, { ...rest, pan: -wide }, stepSeconds);
  const right = buildMonoChain(ctx, { ...rest, pan: wide }, stepSeconds);
  const output = ctx.createGain();
  output.gain.value = 0.75; // two takes sum louder than one
  left.output.connect(output);
  right.output.connect(output);
  return { input: left.input, inputB: right.input, output };
}

function buildMonoChain(ctx, fx = {}, stepSeconds) {
  const input = ctx.createGain();
  let node = input;
  if (fx.amp) {
    // A guitar amplifier in three parts. Input: a tightening highpass and a mid hump
    // (what an overdrive pedal in front of the amp does), so the lows do not turn to
    // mud in the clipping. Preamp: one or two tube-like stages, each DC-blocked and
    // oversampled against aliasing fizz; the gain grows with the square of `amp`, so
    // the low settings stay a crunch that cleans up as the note decays. Cabinet: a
    // closed 4x12: nothing under 80 Hz, a thump near 110 Hz, a low-mid scoop for the
    // 'scoop' tone, a presence lift and a steep roll-off above 4.5 kHz. `ampTone` is
    // 'warm' (classic rock, the default), 'scoop' (metal) or 'fuzz' (a sixties fuzz
    // box: hard, woolly, no tightening).
    const amount = Math.min(1, fx.amp);
    const tone = fx.ampTone ?? 'warm';
    const fuzz = tone === 'fuzz';
    const tight = biquad(ctx, 'highpass', fuzz ? 60 : 90 + amount * 30, 0.5);
    const hump = biquad(ctx, 'peaking', fuzz ? 500 : 750, 0.8, fuzz ? 2 : 2 + amount * 4);
    node.connect(tight).connect(hump);
    node = hump;
    const stages = amount > 0.55 || fuzz ? 2 : 1;
    for (let stage = 0; stage < stages; stage++) {
      const pre = ctx.createGain();
      pre.gain.value = stage === 0 ? 0.8 + amount * amount * (fuzz ? 24 : 11) : 1 + (amount - 0.55) * 8;
      const shaper = ctx.createWaveShaper();
      shaper.curve = fuzz ? driveCurve(0.5 + amount * 0.5) : tubeCurve(stage === 0 ? 1.4 : 1.1, 0.3);
      shaper.oversample = '4x';
      const dc = biquad(ctx, 'highpass', 25);
      node.connect(pre).connect(shaper).connect(dc);
      node = dc;
    }
    const post = ctx.createGain();
    post.gain.value = 0.55 / (1 + amount * 1.2);
    const cabHp = biquad(ctx, 'highpass', 80, 1.1);
    const thump = biquad(ctx, 'peaking', 115, 1.2, 2.5);
    const scoop = biquad(ctx, 'peaking', 480, 0.9, tone === 'scoop' ? -5 - amount * 3 : fuzz ? 1 : -1);
    const presence = biquad(ctx, 'peaking', 2500, 1.1, fuzz ? 1 : 2 + amount * 2);
    const cabLp1 = biquad(ctx, 'lowpass', fuzz ? 3600 : 4400, 1);
    const cabLp2 = biquad(ctx, 'lowpass', fuzz ? 4200 : 5200, 0.6);
    node.connect(post).connect(cabHp).connect(thump).connect(scoop).connect(presence).connect(cabLp1).connect(cabLp2);
    node = cabLp2;
  }
  if (fx.drive) {
    // Saturation for anything that is not a guitar: a bass amp, a shouted voice, a synth.
    const pre = ctx.createGain();
    pre.gain.value = 1 + fx.drive * 2.5;
    const shaper = ctx.createWaveShaper();
    shaper.curve = tubeCurve(1 + fx.drive * 2.5, 0.2);
    shaper.oversample = '4x';
    const dc = biquad(ctx, 'highpass', 25);
    const post = ctx.createGain();
    post.gain.value = 0.9 / (1 + fx.drive);
    node.connect(pre).connect(shaper).connect(dc).connect(post);
    node = post;
  }
  if (fx.lowpass) {
    const f = biquad(ctx, 'lowpass', fx.lowpass, fx.q ?? 0.7);
    node.connect(f);
    node = f;
  }
  if (fx.highpass) {
    const f = biquad(ctx, 'highpass', fx.highpass);
    node.connect(f);
    node = f;
  }
  if (fx.bandpass) {
    const f = biquad(ctx, 'bandpass', fx.bandpass, fx.q ?? 1.2);
    node.connect(f);
    node = f;
  }
  if (fx.crush) {
    const pre = ctx.createGain();
    pre.gain.value = 6;
    const shaper = ctx.createWaveShaper();
    shaper.curve = crushCurve(fx.crush);
    const post = ctx.createGain();
    post.gain.value = 1 / 6;
    const f = biquad(ctx, 'lowpass', 3800);
    node.connect(pre).connect(shaper).connect(post).connect(f);
    node = f;
  }
  if (fx.chorus) {
    const split = ctx.createGain();
    const wet = ctx.createGain();
    wet.gain.value = fx.chorus * 0.6;
    const delay = ctx.createDelay(0.05);
    delay.delayTime.value = 0.018;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = fx.chorusRate ?? 0.6;
    const depth = ctx.createGain();
    depth.gain.value = 0.004;
    lfo.connect(depth).connect(delay.delayTime);
    lfo.start();
    node.connect(split);
    split.connect(delay).connect(wet).connect(split);
    node = split;
    // the dry path is inherent: `split` already carries the input
  }
  if (fx.delay) {
    const d = fx.delay;
    const beats = { '4': 4, '8': 2, '8d': 3, '16': 1, '8t': 4 / 3, '3/16': 3 }[d.time ?? '8d'] ?? 2;
    const delay = ctx.createDelay(4);
    delay.delayTime.value = beats * stepSeconds;
    const feedback = ctx.createGain();
    feedback.gain.value = d.feedback ?? 0.35;
    const tone = biquad(ctx, 'lowpass', d.tone ?? 2500);
    const wet = ctx.createGain();
    wet.gain.value = d.mix ?? 0.3;
    const merge = ctx.createGain();
    node.connect(merge);
    node.connect(delay);
    delay.connect(tone).connect(feedback).connect(delay);
    tone.connect(wet).connect(merge);
    node = merge;
  }
  if (fx.tremolo) {
    const g = ctx.createGain();
    g.gain.value = 1 - fx.tremolo * 0.5;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = fx.tremoloRate ?? 5;
    const depth = ctx.createGain();
    depth.gain.value = fx.tremolo * 0.5;
    lfo.connect(depth).connect(g.gain);
    lfo.start();
    node.connect(g);
    node = g;
  }
  const pan = ctx.createStereoPanner();
  pan.pan.value = fx.pan ?? 0;
  node.connect(pan);
  const output = ctx.createGain();
  pan.connect(output);
  return { input, output };
}

// --- Drum voices ------------------------------------------------------------------

/**
 * Kits. `model` picks the synthesis: 'acoustic' kits are modelled drums and
 * cymbals, 'machine' kits keep the classic electronic recipes. The other
 * fields tune the three main drums; the rest of the kit is shared.
 */
export const KITS = {
  acoustic: { model: 'acoustic', name: { en: 'Acoustic kit', zh: '原声鼓组' }, kickPitch: 56, kickDecay: 0.42, kickClick: 0.7, snareTone: 185, snareNoise: 1, snareDecay: 0.26, snareBright: 3200, hatDecay: 0.1, hatOpen: 0.5, hatTone: 8000, hatMetal: 0.6 },
  rock: { model: 'acoustic', name: { en: 'Rock kit', zh: '摇滚鼓组' }, kickPitch: 60, kickDecay: 0.38, kickClick: 1, snareTone: 195, snareNoise: 1.2, snareDecay: 0.28, snareBright: 3600, hatDecay: 0.1, hatOpen: 0.55, hatTone: 7500, hatMetal: 0.65 },
  brush: { model: 'acoustic', name: { en: 'Brushes', zh: '鼓刷' }, brushes: true, kickPitch: 52, kickDecay: 0.45, kickClick: 0.3, snareTone: 170, snareNoise: 0.7, snareDecay: 0.34, snareBright: 2400, hatDecay: 0.12, hatOpen: 0.6, hatTone: 9500, hatMetal: 0.5 },
  linn: { model: 'acoustic', name: { en: 'LinnDrum', zh: 'LinnDrum 鼓机' }, kickPitch: 58, kickDecay: 0.3, kickClick: 0.8, snareTone: 210, snareNoise: 1, snareDecay: 0.25, snareBright: 3000, hatDecay: 0.07, hatOpen: 0.3, hatTone: 8000, hatMetal: 0.5, tight: true },
  lofi: { model: 'acoustic', name: { en: 'Dusty sampled kit', zh: '老采样鼓组' }, kickPitch: 52, kickDecay: 0.36, kickClick: 0.4, snareTone: 175, snareNoise: 0.8, snareDecay: 0.2, snareBright: 2200, hatDecay: 0.07, hatOpen: 0.25, hatTone: 6500, hatMetal: 0.4, dark: 4500 },
  breaks: { model: 'acoustic', name: { en: 'Sampled break', zh: '采样碎拍' }, kickPitch: 62, kickDecay: 0.3, kickClick: 0.9, snareTone: 230, snareNoise: 1.1, snareDecay: 0.21, snareBright: 3400, hatDecay: 0.07, hatOpen: 0.3, hatTone: 8000, hatMetal: 0.55, tight: true },
  metal: { model: 'acoustic', name: { en: 'Tight metal kit', zh: '紧实的金属鼓组' }, kickPitch: 64, kickDecay: 0.22, kickClick: 1.3, snareTone: 205, snareNoise: 1.3, snareDecay: 0.21, snareBright: 4000, hatDecay: 0.08, hatOpen: 0.35, hatTone: 8500, hatMetal: 0.7, tight: true },
  '808': { model: 'machine', name: { en: '808 drum machine', zh: '808 鼓机' }, kickPitch: 48, kickDecay: 0.7, kickClick: 0.3, snareTone: 180, snareNoise: 0.9, snareDecay: 0.16, hatDecay: 0.05, hatOpen: 0.28, hatTone: 9500 },
  '909': { model: 'machine', name: { en: '909 drum machine', zh: '909 鼓机' }, kickPitch: 54, kickDecay: 0.4, kickClick: 1, snareTone: 200, snareNoise: 1.1, snareDecay: 0.17, hatDecay: 0.05, hatOpen: 0.3, hatTone: 8800, sampledHats: true },
  trap: { model: 'machine', name: { en: 'Trap 808s', zh: 'Trap 808 鼓组' }, kickPitch: 45, kickDecay: 0.9, kickClick: 0.5, snareTone: 220, snareNoise: 1.2, snareDecay: 0.15, hatDecay: 0.04, hatOpen: 0.22, hatTone: 10000 },
};

function env(param, time, peak, attack, decay, sustainLevel = 0.0001) {
  param.cancelScheduledValues(time);
  param.setValueAtTime(0.0001, time);
  param.linearRampToValueAtTime(peak, time + attack);
  param.exponentialRampToValueAtTime(Math.max(sustainLevel, 0.0001), time + attack + decay);
}

/** A looping buffer (noise or metal) through optional filters, started and stopped around `time`. */
function bufferSource(ctx, buffer, time, seconds, { highpass, lowpass, bandpass, q } = {}) {
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  let node = src;
  if (bandpass) {
    const f = biquad(ctx, 'bandpass', bandpass, q ?? 1);
    node.connect(f);
    node = f;
  }
  if (highpass) {
    const f = biquad(ctx, 'highpass', highpass);
    node.connect(f);
    node = f;
  }
  if (lowpass) {
    const f = biquad(ctx, 'lowpass', lowpass);
    node.connect(f);
    node = f;
  }
  src.start(time);
  src.stop(time + seconds + 0.05);
  return node;
}

function noiseSource(ctx, time, seconds, filters) {
  return bufferSource(ctx, noiseBuffer(ctx), time, seconds, filters);
}

/** A sine (or other) partial with a pitch drop and its own envelope, into `out`. */
function partial(ctx, out, { type = 'sine', from, to, drop = 0.03, settle, time, peak, attack = 0.002, decay }) {
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(from ?? to, time);
  if (from && from !== to) osc.frequency.exponentialRampToValueAtTime(to, time + drop);
  if (settle) osc.frequency.exponentialRampToValueAtTime(settle, time + decay);
  const g = ctx.createGain();
  env(g.gain, time, peak, attack, decay);
  osc.connect(g).connect(out);
  osc.start(time);
  osc.stop(time + attack + decay + 0.1);
  return osc;
}

/** A filtered burst of a buffer under an envelope, into `out`. */
function burst(ctx, out, buffer, { time, peak, attack = 0.001, decay, ...filters }) {
  const src = bufferSource(ctx, buffer, time, attack + decay, filters);
  const g = ctx.createGain();
  env(g.gain, time, peak, attack, decay);
  src.connect(g).connect(out);
  return g;
}

function playDrum(ctx, dest, type, kitName, time, velocity, variant) {
  const kit = KITS[kitName] ?? KITS.acoustic;
  const acoustic = kit.model !== 'machine';
  const out = ctx.createGain();
  if (kit.dark) {
    // a dusty kit loses its highs; cymbals and crackle live up there, so they only lose some
    const bright = ['hat', 'ride', 'crash', 'tambourine', 'shaker', 'vinyl'].includes(type);
    const f = biquad(ctx, 'lowpass', bright ? kit.dark * 2.4 : kit.dark, 0.6);
    out.connect(f).connect(dest);
  } else out.connect(dest);
  const v = velocity;
  const noise = noiseBuffer(ctx);
  switch (type) {
    case 'kick': {
      if (acoustic) {
        const f0 = kit.kickPitch;
        const decay = kit.kickDecay * (0.8 + v * 0.3);
        // shell: the fundamental with a quick pitch drop, and a second mode that dies faster
        const body = ctx.createGain();
        const shaper = ctx.createWaveShaper();
        shaper.curve = driveCurve(0.01); // a touch of warmth, not a limiter
        body.connect(shaper).connect(out);
        partial(ctx, body, { from: f0 * 2.4, to: f0, drop: 0.025, settle: f0 * 0.92, time, peak: v * 0.6, decay });
        partial(ctx, body, { from: f0 * 3.2, to: f0 * 1.62, drop: 0.02, time, peak: v * 0.2, decay: decay * 0.35 });
        // beater: a low knock and a soft, dull thump of filtered noise
        partial(ctx, out, { from: 900, to: 380, drop: 0.012, time, peak: v * 0.3 * kit.kickClick, attack: 0.001, decay: 0.02 });
        burst(ctx, out, noise, { time, peak: v * 0.35 * kit.kickClick, decay: 0.022, lowpass: 2800, highpass: 250 });
        if (kit.tight) burst(ctx, out, noise, { time, peak: v * 0.3 * kit.kickClick, decay: 0.01, bandpass: 3400, q: 1 }); // the plastic beater's click
      } else {
        partial(ctx, out, { from: kit.kickPitch * 3.2, to: kit.kickPitch, drop: 0.04, settle: kit.kickPitch * 0.7, time, peak: v, decay: kit.kickDecay });
        if (kit.kickClick) burst(ctx, out, noise, { time, peak: v * 0.5 * kit.kickClick, decay: 0.015, highpass: 1500 });
      }
      break;
    }
    case 'snare': {
      if (acoustic) {
        const brush = kit.brushes;
        const tone = kit.snareTone;
        const toneGain = brush ? 0.45 : 0.95;
        // the shell: a fundamental that drops into place and a second mode, both short
        partial(ctx, out, { type: 'triangle', from: tone * 1.3, to: tone, drop: 0.008, time, peak: v * toneGain, decay: 0.13 });
        partial(ctx, out, { from: tone * 2.2, to: tone * 1.7, drop: 0.006, time, peak: v * toneGain * 0.5, decay: 0.07 });
        // the wires: a band of noise whose centre rises with how hard the drum is hit,
        // and a wider band under it for the body of the rattle
        const centre = kit.snareBright * (0.55 + v * 0.35);
        if (brush) {
          burst(ctx, out, noise, { time, peak: v * 1.6 * kit.snareNoise, attack: 0.018, decay: kit.snareDecay, bandpass: centre, q: 0.5 });
          burst(ctx, out, noise, { time, peak: v * 0.5, attack: 0.03, decay: kit.snareDecay * 1.2, lowpass: 6500, highpass: 800 });
        } else {
          burst(ctx, out, noise, { time, peak: v * 1.8 * kit.snareNoise, decay: kit.snareDecay, bandpass: centre, q: 0.5 });
          burst(ctx, out, noise, { time, peak: v * 1.1 * kit.snareNoise, decay: kit.snareDecay * 0.7, bandpass: 1400, q: 0.6 });
          if (v > 0.6) burst(ctx, out, noise, { time, peak: (v - 0.6) * 1, decay: 0.012, bandpass: 4000, q: 0.8 }); // the crack of a rimshot-hard hit
        }
      } else {
        partial(ctx, out, { type: 'triangle', from: kit.snareTone, to: kit.snareTone * 0.6, drop: 0.08, time, peak: v * 0.6, decay: kit.snareDecay * 0.7 });
        burst(ctx, out, noise, { time, peak: v * 0.8 * kit.snareNoise, decay: kit.snareDecay, highpass: 1200 });
      }
      break;
    }
    case 'rim': {
      partial(ctx, out, { from: 1100, to: 820, drop: 0.005, time, peak: v * 0.7, decay: 0.035 });
      burst(ctx, out, noise, { time, peak: v * 0.8, decay: 0.03, bandpass: 2600, q: 1.4 });
      burst(ctx, out, noise, { time, peak: v * 0.4, decay: 0.012, highpass: 4500 });
      break;
    }
    case 'clap': {
      const rnd = mulberry(Math.floor(time * 997));
      let t = time;
      for (let i = 0; i < 4; i++) {
        burst(ctx, out, noise, { time: t, peak: v * (i === 3 ? 1.3 : 1), decay: i === 3 ? 0.17 : 0.018, bandpass: 1400 + rnd() * 200, q: 0.9 });
        t += 0.009 + rnd() * 0.003;
      }
      burst(ctx, out, noise, { time, peak: v * 0.2, attack: 0.01, decay: 0.25, lowpass: 3500, highpass: 400 }); // the room
      break;
    }
    case 'hat': {
      const open = variant === 'open';
      const decay = open ? kit.hatOpen : kit.hatDecay;
      if (acoustic || kit.sampledHats) {
        const metal = metalBuffer(ctx, 'cymbal');
        const bright = kit.hatTone * (0.8 + v * 0.3);
        burst(ctx, out, metal, { time, peak: v * 1.1 * (kit.hatMetal ?? 0.6), decay, bandpass: bright, q: 0.5, highpass: 6000, lowpass: 13000 });
        burst(ctx, out, noise, { time, peak: v * 0.6, decay: decay * 0.9, highpass: 6500, lowpass: 14000 });
        if (open) burst(ctx, out, metal, { time, peak: v * 0.4, attack: 0.01, decay: decay * 1.6, bandpass: bright * 0.6, q: 0.4, highpass: 3500 }); // the sizzle after the hit
      } else {
        burst(ctx, out, metalBuffer(ctx, '808'), { time, peak: v * 2.6, decay, bandpass: kit.hatTone * 0.85, q: 0.5, highpass: 6500 });
        burst(ctx, out, noise, { time, peak: v * 0.7, decay: decay * 0.8, highpass: 8000 });
      }
      break;
    }
    case 'ride': {
      const metal = metalBuffer(ctx, 'cymbal');
      burst(ctx, out, metal, { time, peak: v * 0.4, decay: 1.4, bandpass: 5600, q: 0.4, highpass: 3200 });
      // the stick's ping: two high, slightly inharmonic partials
      partial(ctx, out, { to: 1860, time, peak: v * 0.12, decay: 0.5 });
      partial(ctx, out, { to: 2810, time, peak: v * 0.07, decay: 0.35 });
      burst(ctx, out, noise, { time, peak: v * 0.12, attack: 0.02, decay: 1.8, lowpass: 9000, highpass: 2500 }); // the wash
      break;
    }
    case 'crash': {
      const metal = metalBuffer(ctx, 'cymbal');
      const g = ctx.createGain();
      const tone = biquad(ctx, 'lowpass', 14000, 0.5);
      tone.frequency.setValueAtTime(14000, time);
      tone.frequency.exponentialRampToValueAtTime(4500, time + 2.2); // bronze darkens as it fades
      g.connect(tone).connect(out);
      burst(ctx, g, metal, { time, peak: v * 0.5, decay: 2.4, highpass: 2500 });
      burst(ctx, g, noise, { time, peak: v * 0.4, decay: 2, highpass: 2800 });
      break;
    }
    case 'tom':
    case 'tomHigh': {
      const pitch = type === 'tom' ? 112 : 168;
      const decay = type === 'tom' ? 0.55 : 0.4;
      partial(ctx, out, { from: pitch * 1.5, to: pitch, drop: 0.045, settle: pitch * 0.94, time, peak: v * 0.7, decay });
      partial(ctx, out, { from: pitch * 2.3, to: pitch * 1.52, drop: 0.03, time, peak: v * 0.25, decay: decay * 0.4 });
      burst(ctx, out, noise, { time, peak: v * 0.25, decay: 0.03, lowpass: 1500, highpass: 150 });
      break;
    }
    case 'conga': {
      partial(ctx, out, { from: 260, to: 192, drop: 0.015, time, peak: v * 0.7, decay: 0.24 });
      partial(ctx, out, { from: 560, to: 420, drop: 0.01, time, peak: v * 0.2, decay: 0.08 });
      burst(ctx, out, noise, { time, peak: v * 0.3, decay: 0.025, bandpass: 1900, q: 1 });
      break;
    }
    case 'timbale': {
      partial(ctx, out, { type: 'triangle', from: 420, to: 330, drop: 0.01, time, peak: v * 0.35, decay: 0.2 });
      burst(ctx, out, metalBuffer(ctx, 'cymbal'), { time, peak: v * 0.12, decay: 0.12, bandpass: 2600, q: 0.7 });
      burst(ctx, out, noise, { time, peak: v * 0.25, decay: 0.03, highpass: 2000 });
      break;
    }
    case 'shaker': {
      burst(ctx, out, noise, { time, peak: v * 0.4, attack: 0.012, decay: 0.07, bandpass: 6500, q: 0.7 });
      break;
    }
    case 'tambourine': {
      burst(ctx, out, metalBuffer(ctx, 'cymbal'), { time, peak: v * 0.3, decay: 0.16, highpass: 7000 });
      burst(ctx, out, noise, { time, peak: v * 0.35, decay: 0.1, highpass: 6000 });
      partial(ctx, out, { from: 240, to: 180, drop: 0.01, time, peak: v * 0.12, decay: 0.03 }); // the frame
      break;
    }
    case 'clave':
    case 'cowbell':
    case 'block': {
      const freqs = { clave: [2500], cowbell: [560, 845], block: [1200] }[type];
      const decay = { clave: 0.04, cowbell: 0.12, block: 0.06 }[type];
      if (type === 'cowbell' && acoustic) {
        // a steel bell: two inharmonic modes and a clank of metal, not the 808's square waves
        partial(ctx, out, { type: 'triangle', from: 620, to: 587, drop: 0.004, time, peak: v * 0.3, decay: 0.18 });
        partial(ctx, out, { to: 845, time, peak: v * 0.18, decay: 0.1 });
        partial(ctx, out, { to: 1420, time, peak: v * 0.08, decay: 0.05 });
        burst(ctx, out, metalBuffer(ctx, 'cymbal'), { time, peak: v * 0.25, decay: 0.03, bandpass: 2200, q: 0.8 });
        break;
      }
      for (const f of freqs) partial(ctx, out, { type: type === 'cowbell' ? 'square' : 'sine', to: f, time, peak: v * (type === 'cowbell' ? 0.15 : 0.35), attack: 0.001, decay });
      if (type !== 'cowbell') burst(ctx, out, noise, { time, peak: v * 0.15, decay: 0.008, highpass: 3000 });
      break;
    }
    case 'vinyl': {
      burst(ctx, out, noise, { time, peak: v * 0.4, decay: 0.015, highpass: 3000 });
      break;
    }
    default:
      throw new Error(`unknown drum ${type}`);
  }
}

// --- Pitched voices -----------------------------------------------------------------

/**
 * Instrument presets. `kind`:
 *   osc      oscillators (waves, detune in cents between layers, filter envelope, amplitude envelope)
 *   additive partials rendered to a buffer, for pianos, mallets and bells
 *   pluck    a precomputed Karplus-Strong string
 *   fm       a sine carrier modulated by a sine, the index decaying (bells, glass)
 *   brass    FM at ratio 1 with the index rising through the attack and settling (`index`,
 *            `indexSustain`): the way a brass tone brightens as the lips buzz harder
 *   formant  a saw (or `wave`) through bandpass peaks of width `formantQ`: reeds and
 *            bowed strings, whose body resonances colour a sawtooth the same way
 *   vocal    a glottal pulse through five moving formants: the sung, shouted and spoken
 *            voices (see "The sung voice" below for its own options)
 * Oscillator and formant kinds take a wave 'custom' with `harmonics` (amplitudes per
 * harmonic, `harmonicsHigh` from midi `harmonicsSplit` up); plucks take `pluck` (where
 * along the string), `noise` (the pick's share) and `loopTone` (how fast the highs die);
 * brass takes `fundamental` (a sine under the FM).
 * Amplitude envelope: a (attack s), d (decay s), s (sustain level), r (release s).
 * Expression: vibrato/vibratoDepth/vibratoDelay, glide (portamento s), scoop (a
 * pitch rise into the note, s), drift (random detune per note, cents), ensemble
 * (number of detuned copies, as in a section, each with its own vibrato), breath
 * (steady noise at `breathTone` times the pitch, `breathQ` narrow), air (hiss above
 * 2.5 kHz), attackNoise
 * ({ amount, decay, lowpass|highpass|bandpass }) for chiffs, bows, thumps and key
 * clicks, double (cents, a second string, for mandolins), tremolo (Hz).
 * `fx` are chain defaults the track's own fx override; `amp` with `ampTone` is the guitar
 * amplifier, `wide` double-tracks a part left and right. `name` is what the page shows.
 */
const dbs = (...levels) => levels.map((db) => Math.pow(10, db / 20)); // harmonic amplitudes from dB

export const INSTRUMENTS = {
  // basses
  bassFinger: { name: { en: 'Electric bass', zh: '电贝斯' }, kind: 'pluck', pluck: 0.3, noise: 0.25, loopTone: 2400, bright: 0.35, t60: 1.6, body: 0.3, gain: 0.45, attackNoise: { amount: 0.2, decay: 0.012, lowpass: 900 }, fx: { lowpass: 1800 } },
  bassPick: { name: { en: 'Picked bass', zh: '拨片电贝斯' }, kind: 'pluck', pluck: 0.15, noise: 0.5, loopTone: 2600, bright: 0.6, t60: 1.2, body: 0.2, gain: 0.816, attackNoise: { amount: 0.25, decay: 0.01, bandpass: 2500, q: 1 }, fx: { lowpass: 2400 } },
  bassUpright: { name: { en: 'Upright bass', zh: '低音提琴' }, kind: 'pluck', pluck: 0.35, noise: 0.3, loopTone: 1600, bright: 0.25, t60: 0.9, body: 0.5, gain: 0.43, attackNoise: { amount: 0.4, decay: 0.02, lowpass: 500 }, fx: { lowpass: 2600 } },
  bassSynth: { name: { en: 'Synth bass', zh: '合成贝斯' }, kind: 'osc', waves: ['sawtooth', 'square'], detune: 4, filter: 900, filterEnv: 1800, q: 2, a: 0.005, d: 0.18, s: 0.5, r: 0.08, gain: 0.34 },
  bassSub: { name: { en: 'Sub bass', zh: '超低音贝斯' }, kind: 'osc', waves: ['sine'], a: 0.005, d: 0.3, s: 0.8, r: 0.15, gain: 0.6, glide: 0.06 },
  bassAcid: { name: { en: 'Acid bass', zh: '酸性贝斯' }, kind: 'osc', waves: ['sawtooth'], filter: 400, filterEnv: 2600, q: 9, a: 0.003, d: 0.2, s: 0.35, r: 0.05, gain: 0.3, glide: 0.04 },
  bassReese: { name: { en: 'Reese bass', zh: 'Reese 贝斯' }, kind: 'osc', waves: ['sawtooth', 'sawtooth'], detune: 18, filter: 700, q: 1, a: 0.01, d: 0.3, s: 0.8, r: 0.1, gain: 0.26 },
  bassMoog: { name: { en: 'Moog bass', zh: 'Moog 贝斯' }, kind: 'osc', waves: ['square', 'sawtooth'], detune: 6, filter: 650, filterEnv: 900, q: 3, a: 0.004, d: 0.25, s: 0.6, r: 0.08, gain: 0.32 },
  bassSlap: { name: { en: 'Slap bass', zh: 'Slap 贝斯' }, kind: 'pluck', pluck: 0.1, noise: 0.7, loopTone: 5000, bright: 0.85, t60: 0.5, body: 0.2, gain: 1.2, attackNoise: { amount: 0.3, decay: 0.008, highpass: 2000 }, fx: { lowpass: 4500 } },
  // keys and mallets
  piano: {
    name: { en: 'Piano', zh: '钢琴' },
    kind: 'additive',
    partials: [[1, 1, 1], [2, 0.7, 0.8], [3, 0.5, 0.65], [4, 0.32, 0.55], [5, 0.2, 0.45], [6, 0.13, 0.4], [7, 0.08, 0.35], [8, 0.03, 0.3], [9, 0.06, 0.28], [10, 0.07, 0.25], [11, 0.06, 0.22], [12, 0.05, 0.2]],
    inharmonic: 0.0003,
    decay: 3.2,
    decayPitch: 0.6,
    noise: 0.25,
    noiseDecay: 0.008,
    noiseTone: 2500,
    filter: 7000,
    r: 0.22,
    gain: 0.6,
  },
  epiano: {
    name: { en: 'Electric piano', zh: '电钢琴' },
    kind: 'additive',
    partials: [[1, 1, 1], [2, 0.18, 0.6], [3, 0.08, 0.4], [4.02, 0.05, 0.3], [7.1, 0.06, 0.12], [14.1, 0.12, 0.06]],
    decay: 3,
    decayPitch: 0.5,
    noise: 0.08,
    noiseDecay: 0.004,
    noiseTone: 4000,
    filter: 5200,
    r: 0.3,
    gain: 0.55,
  },
  organ: { name: { en: 'Organ', zh: '风琴' }, kind: 'osc', waves: ['sine', 'sine', 'sine', 'sine', 'sine', 'sine'], ratios: [0.5, 1, 1.5, 2, 3, 4], mix: [0.5, 1, 0.45, 0.7, 0.3, 0.2], a: 0.012, d: 0.05, s: 1, r: 0.06, gain: 0.2, vibrato: 6.4, vibratoDepth: 3, attackNoise: { amount: 0.12, decay: 0.005, highpass: 2500 }, fx: { chorus: 0.3, chorusRate: 0.8 } },
  vibes: { name: { en: 'Vibraphone', zh: '颤音琴' }, kind: 'additive', partials: [[1, 1, 1], [4, 0.3, 0.5], [10, 0.08, 0.2]], decay: 2.6, decayPitch: 0.3, noise: 0.06, noiseDecay: 0.003, noiseTone: 5000, filter: 9000, r: 0.35, gain: 0.5, tremolo: 4 },
  marimba: { name: { en: 'Marimba', zh: '马林巴' }, kind: 'additive', partials: [[1, 1, 1], [4, 0.35, 0.5], [9.2, 0.12, 0.25]], decay: 0.55, decayPitch: 0.7, noise: 0.3, noiseDecay: 0.003, noiseTone: 3000, r: 0.15, gain: 0.6 },
  bell: { name: { en: 'Bells', zh: '钟琴' }, kind: 'additive', partials: [[1, 0.8, 1], [2, 0.5, 0.8], [2.76, 0.6, 0.7], [4.07, 0.4, 0.5], [5.4, 0.25, 0.4], [6.8, 0.15, 0.3]], decay: 2.5, decayPitch: 0.4, noise: 0.05, noiseDecay: 0.002, noiseTone: 6000, r: 0.4, gain: 0.4 },
  kalimba: { name: { en: 'Kalimba', zh: '卡林巴' }, kind: 'additive', partials: [[1, 1, 1], [6.3, 0.15, 0.2], [12.1, 0.05, 0.1]], decay: 0.9, decayPitch: 0.4, noise: 0.2, noiseDecay: 0.002, noiseTone: 3000, r: 0.2, gain: 0.55 },
  steelDrum: { name: { en: 'Steel drum', zh: '钢鼓' }, kind: 'additive', partials: [[1, 1, 1], [2, 0.6, 0.7], [3.05, 0.3, 0.5], [4.1, 0.2, 0.4], [5.3, 0.12, 0.3]], decay: 1.4, decayPitch: 0.4, noise: 0.15, noiseDecay: 0.003, noiseTone: 3000, r: 0.3, gain: 0.45, fx: { chorus: 0.4, chorusRate: 1.2 } },
  padGlass: { name: { en: 'Glass pad', zh: '玻璃质感铺底' }, kind: 'fm', ratio: 2, index: 0.6, indexDecay: 2, a: 0.6, d: 1, s: 0.8, r: 1.5, gain: 0.2 },
  clavinet: { name: { en: 'Clavinet', zh: '克拉维琴' }, kind: 'pluck', pluck: 0.08, noise: 0.9, loopTone: 9000, bright: 0.95, t60: 0.6, body: 0.05, gain: 0.6, attackNoise: { amount: 0.2, decay: 0.004, highpass: 3000 }, fx: { highpass: 180, drive: 0.15 } },
  // guitars and strings
  guitarClean: { name: { en: 'Clean electric guitar', zh: '清音电吉他' }, kind: 'pluck', pluck: 0.22, noise: 0.5, loopTone: 7000, bright: 0.6, t60: 2.4, body: 0.35, gain: 0.22, strum: 0.012, attackNoise: { amount: 0.1, decay: 0.006, highpass: 3000 } },
  guitarCrunch: { name: { en: 'Crunch guitar', zh: '轻失真吉他' }, kind: 'pluck', pluck: 0.2, noise: 0.6, loopTone: 8000, bright: 0.7, t60: 2.2, body: 0.25, gain: 0.303, strum: 0.01, attackNoise: { amount: 0.08, decay: 0.005, highpass: 3000 }, fx: { amp: 0.38 } },
  guitarMuted: { name: { en: 'Muted guitar', zh: '闷音吉他' }, kind: 'pluck', pluck: 0.15, noise: 0.6, loopTone: 3000, bright: 0.5, t60: 0.3, body: 0.2, gain: 0.455, strum: 0.006, attackNoise: { amount: 0.25, decay: 0.006, bandpass: 2500, q: 1 }, fx: { amp: 0.3 } },
  guitarDist: { name: { en: 'Distorted guitar', zh: '失真吉他' }, kind: 'pluck', pluck: 0.18, noise: 0.65, loopTone: 9000, bright: 0.75, t60: 3.2, body: 0.25, gain: 0.4, strum: 0.008, fx: { amp: 0.7 } },
  guitarMetal: { name: { en: 'High-gain guitar', zh: '高增益失真吉他' }, kind: 'pluck', pluck: 0.15, noise: 0.7, loopTone: 12000, bright: 0.7, t60: 2.8, body: 0.25, gain: 0.5, strum: 0.006, r: 0.05, fx: { amp: 0.92, ampTone: 'scoop', wide: 0.7 } },
  guitarChug: { name: { en: 'Palm-muted guitar', zh: '闷音失真吉他' }, kind: 'pluck', pluck: 0.12, noise: 0.7, loopTone: 4000, bright: 0.45, t60: 0.2, body: 0.35, gain: 0.65, strum: 0.003, r: 0.03, attackNoise: { amount: 0.35, decay: 0.012, lowpass: 1200 }, fx: { amp: 0.92, ampTone: 'scoop', wide: 0.7 } },
  guitarFuzz: { name: { en: 'Fuzz guitar', zh: 'Fuzz 吉他' }, kind: 'pluck', pluck: 0.2, noise: 0.65, loopTone: 10000, bright: 0.7, t60: 2.6, body: 0.3, gain: 0.5, strum: 0.01, fx: { amp: 0.9, ampTone: 'fuzz' } },
  guitarNylon: { name: { en: 'Nylon-string guitar', zh: '尼龙弦吉他' }, kind: 'pluck', pluck: 0.3, noise: 0.5, loopTone: 6000, bright: 0.6, t60: 1.8, body: 0.5, gain: 0.171, strum: 0.015, attackNoise: { amount: 0.15, decay: 0.008, bandpass: 3500, q: 0.8 } },
  guitarSteel: { name: { en: 'Acoustic guitar', zh: '木吉他' }, kind: 'pluck', pluck: 0.18, noise: 0.6, loopTone: 9000, bright: 0.8, t60: 2.2, body: 0.45, gain: 0.24, strum: 0.014, attackNoise: { amount: 0.2, decay: 0.008, bandpass: 4500, q: 0.8 } },
  guitarLead: { name: { en: 'Lead guitar', zh: '主音吉他' }, kind: 'pluck', pluck: 0.18, noise: 0.65, loopTone: 10000, bright: 0.75, t60: 4, body: 0.15, gain: 0.5, vibrato: 5.5, vibratoDepth: 10, vibratoDelay: 0.2, fx: { amp: 0.8, delay: { time: '8', feedback: 0.22, mix: 0.14 } } },
  guitarLeadClean: { name: { en: 'Clean lead guitar', zh: '清音主音吉他' }, kind: 'pluck', pluck: 0.2, noise: 0.5, loopTone: 7000, bright: 0.7, t60: 2.6, body: 0.3, gain: 0.376, vibrato: 5, vibratoDepth: 6, vibratoDelay: 0.25 },
  guitarSlide: { name: { en: 'Slide guitar', zh: '滑棒吉他' }, kind: 'pluck', pluck: 0.25, noise: 0.4, loopTone: 4000, bright: 0.55, t60: 2.4, body: 0.45, gain: 0.249, glide: 0.07, vibrato: 5.5, vibratoDepth: 16, vibratoDelay: 0.15, attackNoise: { amount: 0.2, decay: 0.01, bandpass: 2800, q: 1 }, fx: { drive: 0.08 } },
  steelGuitar: { name: { en: 'Pedal steel', zh: '踏板钢棒吉他' }, kind: 'pluck', pluck: 0.2, noise: 0.4, loopTone: 8000, bright: 0.7, t60: 5, body: 0.2, gain: 0.434, a: 0.06, glide: 0.1, vibrato: 5, vibratoDepth: 10, vibratoDelay: 0.25, fx: { chorus: 0.2, amp: 0.12 } },
  banjo: { name: { en: 'Banjo', zh: '班卓琴' }, kind: 'pluck', pluck: 0.12, noise: 0.8, loopTone: 9000, bright: 0.9, t60: 0.7, body: 0.1, gain: 0.5, strum: 0.004 },
  mandolin: { name: { en: 'Mandolin', zh: '曼陀林' }, kind: 'pluck', pluck: 0.12, noise: 0.7, loopTone: 12000, bright: 0.85, t60: 1.1, body: 0.25, gain: 0.713, strum: 0.004, double: 5 },
  sitar: { name: { en: 'Sitar', zh: '西塔琴' }, kind: 'pluck', pluck: 0.1, noise: 0.7, loopTone: 9000, bright: 0.95, t60: 3.5, body: 0.1, gain: 0.465, strum: 0.004, double: 3, fx: { drive: 0.12 } },
  koto: { name: { en: 'Koto', zh: '筝' }, kind: 'pluck', pluck: 0.2, noise: 0.5, loopTone: 8000, bright: 0.85, t60: 1.6, body: 0.15, gain: 0.354 },
  strings: { name: { en: 'String section', zh: '弦乐组' }, kind: 'formant', formants: [250, 500, 1100, 2600], formantGains: [1, 0.7, 0.5, 0.3], formantQ: 1.8, ensemble: 4, ensembleDetune: 10, a: 0.3, d: 0.4, s: 0.9, r: 0.5, gain: 0.17, vibrato: 5.2, vibratoDepth: 7, vibratoDelay: 0.3, drift: 5, attackNoise: { amount: 0.15, decay: 0.12, bandpass: 3000, q: 1 }, fx: { chorus: 0.4, chorusRate: 0.35, lowpass: 5000 } },
  fiddle: { name: { en: 'Fiddle', zh: '小提琴' }, kind: 'formant', formants: [280, 460, 980, 2400, 3600], formantGains: [1, 0.8, 0.75, 0.5, 0.2], formantQ: 2.2, a: 0.08, d: 0.2, s: 0.85, r: 0.15, gain: 0.28, vibrato: 5.8, vibratoDepth: 13, vibratoDelay: 0.2, drift: 6, attackNoise: { amount: 0.35, decay: 0.08, bandpass: 3200, q: 1 } },
  // pads and synths
  pad: { name: { en: 'Synth pad', zh: '合成器铺底' }, kind: 'osc', waves: ['sawtooth', 'sawtooth', 'triangle'], detune: 12, filter: 1400, q: 0.4, a: 0.8, d: 0.5, s: 0.9, r: 1.2, gain: 0.14 },
  stab: { name: { en: 'Synth stab', zh: '合成器 stab' }, kind: 'osc', waves: ['sawtooth', 'square'], detune: 8, filter: 1600, filterEnv: 2600, q: 1.5, a: 0.003, d: 0.22, s: 0.0, r: 0.08, gain: 0.26 },
  synthPluck: { name: { en: 'Synth pluck', zh: '合成器拨弦' }, kind: 'osc', waves: ['sawtooth', 'triangle'], detune: 5, filter: 1200, filterEnv: 4000, q: 1, a: 0.002, d: 0.3, s: 0, r: 0.1, gain: 0.3 },
  supersaw: { name: { en: 'Supersaw', zh: 'Supersaw' }, kind: 'osc', waves: ['sawtooth', 'sawtooth', 'sawtooth', 'sawtooth'], detune: 16, filter: 3500, q: 0.5, a: 0.02, d: 0.2, s: 0.8, r: 0.25, gain: 0.15 },
  leadSaw: { name: { en: 'Saw lead', zh: '锯齿波主音' }, kind: 'osc', waves: ['sawtooth', 'sawtooth'], detune: 9, filter: 2800, filterEnv: 1200, q: 1, a: 0.01, d: 0.2, s: 0.7, r: 0.12, gain: 0.22, vibrato: 5.5, vibratoDepth: 8, glide: 0.03 },
  leadSquare: { name: { en: 'Square lead', zh: '方波主音' }, kind: 'osc', waves: ['square'], filter: 3000, a: 0.01, d: 0.15, s: 0.7, r: 0.1, gain: 0.18, vibrato: 6, vibratoDepth: 6 },
  leadSine: { name: { en: 'Sine lead', zh: '正弦波主音' }, kind: 'osc', waves: ['sine', 'triangle'], mix: [1, 0.3], a: 0.02, d: 0.2, s: 0.8, r: 0.15, gain: 0.35, vibrato: 5.5, vibratoDepth: 10, glide: 0.04 },
  theremin: { name: { en: 'Theremin', zh: '特雷门琴' }, kind: 'osc', waves: ['sine', 'triangle'], mix: [1, 0.2], a: 0.1, d: 0.2, s: 0.9, r: 0.3, gain: 0.3, vibrato: 6.5, vibratoDepth: 25, glide: 0.12 },
  chiptune: { name: { en: 'Chiptune', zh: '芯片音乐' }, kind: 'osc', waves: ['square'], a: 0.002, d: 0.08, s: 0.6, r: 0.03, gain: 0.14 },
  // winds, brass, voices
  brass: { name: { en: 'Brass section', zh: '铜管组' }, kind: 'brass', fundamental: 1.2, index: 2.6, indexSustain: 0.55, filter: 3800, ensemble: 3, ensembleDetune: 8, a: 0.06, d: 0.25, s: 0.8, r: 0.12, gain: 0.183, scoop: 0.05, scoopDepth: 35, vibrato: 5, vibratoDepth: 5, vibratoDelay: 0.3, drift: 5, attackNoise: { amount: 0.2, decay: 0.05, bandpass: 1800, q: 0.8 }, fx: { chorus: 0.15, chorusRate: 0.5 } },
  trumpet: { name: { en: 'Trumpet', zh: '小号' }, kind: 'brass', fundamental: 0.5, index: 4, indexSustain: 0.6, filter: 4500, a: 0.035, d: 0.15, s: 0.85, r: 0.1, gain: 0.26, scoop: 0.04, scoopDepth: 50, vibrato: 5.5, vibratoDepth: 7, vibratoDelay: 0.35, drift: 4, attackNoise: { amount: 0.25, decay: 0.04, bandpass: 2400, q: 1 } },
  trombone: { name: { en: 'Trombone', zh: '长号' }, kind: 'brass', fundamental: 0.8, index: 2.8, indexSustain: 0.55, filter: 2600, a: 0.07, d: 0.2, s: 0.85, r: 0.14, gain: 0.25, scoop: 0.07, scoopDepth: 70, vibrato: 4.5, vibratoDepth: 5, vibratoDelay: 0.4, drift: 4, attackNoise: { amount: 0.2, decay: 0.05, bandpass: 1200, q: 0.8 } },
  sax: { name: { en: 'Saxophone', zh: '萨克斯' }, kind: 'formant', formants: [560, 1250, 2600, 4200], formantGains: [1, 0.9, 0.5, 0.2], formantQ: 3, a: 0.04, d: 0.2, s: 0.8, r: 0.15, gain: 0.31, scoop: 0.05, scoopDepth: 45, vibrato: 5.5, vibratoDepth: 10, vibratoDelay: 0.3, glide: 0.03, drift: 5, breath: 0.1, breathTone: 1.5, breathQ: 3, attackNoise: { amount: 0.3, decay: 0.04, bandpass: 2800, q: 1 } },
  bariSax: { name: { en: 'Baritone sax', zh: '上低音萨克斯' }, kind: 'formant', formants: [280, 650, 1500, 2800], formantGains: [1, 0.8, 0.4, 0.15], formantQ: 3, a: 0.05, d: 0.2, s: 0.8, r: 0.15, gain: 0.55, scoop: 0.06, scoopDepth: 40, vibrato: 5, vibratoDepth: 8, vibratoDelay: 0.35, glide: 0.03, drift: 5, breath: 0.1, attackNoise: { amount: 0.3, decay: 0.05, bandpass: 1600, q: 1 } },
  clarinet: { name: { en: 'Clarinet', zh: '单簧管' }, kind: 'osc', waves: ['custom'], harmonics: dbs(0, -24, -3, -20, -7, -18, -11, -20, -15, -22, -19, -24, -23, -26), harmonicsHigh: dbs(0, -10, -4, -12, -9, -14, -13, -18, -17, -20, -21, -24), harmonicsSplit: 67, filter: 2800, q: 0.6, a: 0.06, d: 0.1, s: 0.9, r: 0.1, gain: 0.29, vibrato: 4.5, vibratoDepth: 4, vibratoDelay: 0.3, drift: 3, breath: 0.05, breathTone: 1, breathQ: 8, attackNoise: { amount: 0.12, decay: 0.04, bandpass: 3000, q: 1 } },
  flute: { name: { en: 'Flute', zh: '长笛' }, kind: 'osc', waves: ['custom'], harmonics: dbs(0, -12, -22, -32, -38, -44), a: 0.06, d: 0.1, s: 0.9, r: 0.12, gain: 0.28, vibrato: 5, vibratoDepth: 9, vibratoDelay: 0.3, drift: 4, breath: 0.16, breathTone: 1, breathQ: 6, air: 0.025, attackNoise: { amount: 0.35, decay: 0.05, bandpass: 4000, q: 0.8 } },
  suona: { name: { en: 'Suona', zh: '唢呐' }, kind: 'formant', formants: [1000, 1750, 3000], formantGains: [1, 0.9, 0.5], formantQ: 3, a: 0.03, d: 0.1, s: 0.9, r: 0.1, gain: 0.3, scoop: 0.05, scoopDepth: 80, vibrato: 6, vibratoDepth: 18, vibratoDelay: 0.15, drift: 6, breath: 0.05, attackNoise: { amount: 0.25, decay: 0.03, bandpass: 3000, q: 1 } },
  harmonica: { name: { en: 'Harmonica', zh: '口琴' }, kind: 'formant', wave: 'custom', harmonics: dbs(0, -2, -5, -8, -11, -14, -16, -18, -20, -22, -24, -26, -28, -30), formants: [1100, 2200, 3300], formantGains: [1, 0.7, 0.3], formantQ: 2, a: 0.04, d: 0.1, s: 0.9, r: 0.1, gain: 0.3, scoop: 0.05, scoopDepth: 60, vibrato: 5.5, vibratoDepth: 14, vibratoDelay: 0.2, drift: 4, breath: 0.06, breathTone: 1, breathQ: 4 },
  accordion: { name: { en: 'Accordion', zh: '手风琴' }, kind: 'osc', waves: ['custom'], harmonics: dbs(0, -1, -3, -5, -7, -9, -11, -13, -15, -17, -19, -21, -24, -27, -30, -33), ensemble: 2, ensembleDetune: 14, filter: 3400, q: 0.5, a: 0.06, d: 0.1, s: 0.9, r: 0.1, gain: 0.2, vibrato: 6, vibratoDepth: 4, drift: 3, air: 0.01 },
  voice: { name: { en: 'Voice', zh: '人声' }, kind: 'vocal', vowels: ['a', 'o', 'e', 'a', 'i', 'o', 'a', 'e', 'u', 'a'], tilt: 1.5, bright: 0.8, a: 0.05, d: 0.25, s: 0.88, r: 0.14, gain: 0.5, onset: 0.08, vibrato: 5.6, vibratoDepth: 45, vibratoDelay: 0.25, jitter: 5, shimmer: 0.08, glide: 0.05, scoop: 0.07, scoopDepth: 70, drift: 6, breath: 0.035, air: 0.012 },
  voiceShout: { name: { en: 'Shouted voice', zh: '喊唱人声' }, kind: 'vocal', vowels: ['a', 'e', 'a', 'o', 'e', 'a'], tilt: 1.25, bright: 1, a: 0.02, d: 0.15, s: 0.85, r: 0.08, gain: 0.5, onset: 0.045, vibrato: 6.2, vibratoDepth: 25, vibratoDelay: 0.2, jitter: 7, shimmer: 0.12, rough: 0.35, scoop: 0.04, scoopDepth: 90, drift: 8, breath: 0.07, air: 0.02 },
  voiceSpoken: { name: { en: 'Spoken voice', zh: '念白人声' }, kind: 'vocal', speech: true, vowels: ['a', 'e', 'i', 'o', 'a', 'u', 'e', 'a', 'o', 'i'], tilt: 1.4, bright: 0.8, a: 0.015, d: 0.1, s: 0.7, r: 0.06, gain: 0.5, onset: 0.03, jitter: 8, shimmer: 0.12, drift: 10, breath: 0.07, air: 0.02 },
  choir: { name: { en: 'Choir', zh: '合唱' }, kind: 'vocal', vowels: ['a', 'o', 'u', 'o'], tilt: 1.8, bright: 0.65, ensemble: 5, ensembleDetune: 8, spread: 0.05, a: 0.3, d: 0.5, s: 0.9, r: 0.6, gain: 0.32, onset: 0.16, vibrato: 5.2, vibratoDepth: 30, vibratoDelay: 0.5, jitter: 4, shimmer: 0.06, drift: 8, breath: 0.05, air: 0.008 },
  whistle: { name: { en: 'Whistle', zh: '口哨' }, kind: 'osc', waves: ['sine'], a: 0.04, d: 0.1, s: 0.9, r: 0.1, gain: 0.3, vibrato: 6, vibratoDepth: 12, vibratoDelay: 0.2, glide: 0.05, drift: 5, breath: 0.05 },
};

const KINDS_WITH_NATURAL_DECAY = new Set(['pluck', 'additive']);

// --- The sung voice -------------------------------------------------------------------
//
// A voice is a glottal pulse through the resonances of the vocal tract. The
// pulse is a wavetable whose harmonics fall at `tilt` (1 is a sawtooth, 2 a
// soft, breathy pulse); the tract is five formants, the parallel bank of a
// Klatt synthesizer: bandpass peaks at the frequencies, bandwidths and levels
// of a sung vowel, adjacent branches in opposite sign so no notch opens
// between them, the upper branches lifted against the source's tilt by
// `bright`. What makes it a voice rather than a vowel synth is the movement:
// every syllable opens from a closed consonant shape into its vowel and the
// mouth closes again at the release, consecutive notes take different vowels
// and consonants, the pitch scoops into a note, wanders slowly and jitters
// finely with a matching tremor, vibrato arrives late and breathes in rate, a
// high note pulls the first formant up with it as singers do, and the breath
// noise goes through the same formants, louder as the mouth opens and closes.
// `rough` adds the half-rate beating of a shouted or growled voice; `speech`
// drops the vibrato for a falling contour on every syllable.

/** Formant frequencies (Hz), levels (dB) and bandwidths (Hz) of sung vowels, male voice. */
const VOWELS = {
  a: { f: [650, 1080, 2650, 2900, 3250], db: [0, -6, -7, -8, -22], bw: [80, 90, 120, 130, 140] },
  e: { f: [400, 1700, 2600, 3200, 3580], db: [0, -14, -12, -14, -20], bw: [70, 80, 100, 120, 120] },
  i: { f: [290, 1870, 2800, 3250, 3540], db: [0, -15, -18, -20, -30], bw: [40, 90, 100, 120, 120] },
  o: { f: [400, 800, 2600, 2800, 3000], db: [0, -10, -12, -12, -26], bw: [40, 80, 100, 120, 120] },
  u: { f: [350, 600, 2700, 2900, 3300], db: [0, -16, -17, -14, -26], bw: [40, 80, 100, 120, 120] },
  // the closed shapes a syllable opens from and closes into: a nasal, a lateral, a rounded glide, a stop
  m: { f: [250, 1000, 2200, 2700, 3100], db: [-6, -22, -24, -26, -32], bw: [60, 120, 150, 160, 180] },
  l: { f: [350, 1300, 2800, 3200, 3600], db: [-4, -16, -18, -22, -30], bw: [60, 110, 150, 160, 180] },
  w: { f: [300, 650, 2300, 2800, 3200], db: [-4, -18, -22, -24, -32], bw: [60, 100, 150, 160, 180] },
  n: { f: [250, 1700, 2500, 3000, 3400], db: [-8, -24, -22, -26, -32], bw: [60, 150, 150, 160, 180] },
  d: { f: [250, 1700, 2600, 3000, 3400], db: [-14, -30, -28, -30, -34], bw: [60, 150, 150, 160, 180] },
};
/**
 * The consonants a syllable opens with, cycled: the closed shape the formants start
 * from, a `burst` (a stop's release) or a `hiss` (a fricative) of noise, and for the
 * hiss the `delay` before the voice comes in.
 */
const CONSONANTS = [
  { shape: VOWELS.m },
  { shape: VOWELS.l },
  { shape: VOWELS.d, burst: { peak: 0.35, attack: 0.001, decay: 0.012, bandpass: 2600, q: 1 } },
  { shape: VOWELS.n },
  { shape: VOWELS.d, hiss: { peak: 0.22, attack: 0.02, decay: 0.07, bandpass: 6500, q: 0.8 }, delay: 0.055 },
  { shape: VOWELS.w },
  { shape: VOWELS.m },
  { shape: VOWELS.d, burst: { peak: 0.25, attack: 0.001, decay: 0.01, bandpass: 3800, q: 1 } },
];

/**
 * The glottal pulse as a wavetable, cached per context and tilt, with the
 * amplitudes of its harmonics as the oscillator will play them (`amps`, the
 * wave is normalized to a peak of one).
 */
function glottalPulse(ctx, tilt) {
  const key = `__glottal_${tilt}`;
  if (ctx[key]) return ctx[key];
  const n = 64;
  const real = new Float32Array(n + 1);
  const imag = new Float32Array(n + 1);
  // the harmonics fall at `tilt`, with a lift around the second and third: the
  // glottal formant of a voice in its ordinary register
  for (let k = 1; k <= n; k++) imag[k] = (1 + 0.4 * Math.exp(-Math.pow((k - 2.5) / 1.4, 2))) / Math.pow(k, tilt);
  let peak = 0;
  for (let i = 0; i < 2048; i++) {
    const theta = (2 * Math.PI * i) / 2048;
    let v = 0;
    for (let k = 1; k <= n; k++) v += imag[k] * Math.sin(k * theta);
    peak = Math.max(peak, Math.abs(v));
  }
  const amps = Array.from(imag, (a) => a / peak);
  ctx[key] = { wave: ctx.createPeriodicWave(real, imag), amps };
  return ctx[key];
}

/**
 * Slow random wander for pitch, tremor and vibrato rate: two layers of smoothly
 * interpolated noise (about 4 and 18 Hz) in a looping six-second buffer, within
 * +-1, cached per seed.
 */
function wanderBuffer(ctx, seed) {
  const key = `__wander_${seed}`;
  if (ctx[key]) return ctx[key];
  const seconds = 6;
  const rate = ctx.sampleRate;
  const length = Math.floor(rate * seconds);
  const buffer = ctx.createBuffer(1, length, rate);
  const data = buffer.getChannelData(0);
  const rnd = mulberry(seed);
  const layer = (hz, amount) => {
    const steps = Math.ceil(seconds * hz);
    const points = new Float32Array(steps + 2);
    for (let i = 0; i < points.length; i++) points[i] = rnd();
    points[steps] = points[0]; // the loop joins smoothly
    points[steps + 1] = points[1];
    for (let i = 0; i < length; i++) {
      const x = (i / rate) * hz;
      const k = Math.floor(x);
      const t = x - k;
      const s = t * t * (3 - 2 * t);
      data[i] += amount * (points[k] * (1 - s) + points[k + 1] * s);
    }
  };
  layer(4, 0.7);
  layer(18, 0.3);
  ctx[key] = buffer;
  return buffer;
}

function wander(ctx, seed, time, stopAt, offset = 0) {
  const src = ctx.createBufferSource();
  src.buffer = wanderBuffer(ctx, seed);
  src.loop = true;
  src.start(time, offset % 6);
  src.stop(stopAt);
  return src;
}

function playVoice(ctx, dest, preset, name, midi, time, duration, velocity, state, take = 0) {
  const freq = midiToFreq(midi);
  const out = ctx.createGain();
  out.connect(dest);
  const rnd = state.rnd ?? (state.rnd = mulberry(Math.round(time * 1000) + midi));
  const gain = (preset.gain ?? 0.3) * velocity;
  const a = preset.a ?? 0.01;
  const d = preset.d ?? 0.2;
  const s = preset.s ?? (KINDS_WITH_NATURAL_DECAY.has(preset.kind) ? 1 : 0.7);
  const r = preset.r ?? 0.1;
  const end = time + Math.max(duration, a + 0.01);
  const amp = ctx.createGain();
  amp.gain.setValueAtTime(0.0001, time);
  amp.gain.linearRampToValueAtTime(gain, time + a);
  if (s < 1) amp.gain.setTargetAtTime(Math.max(gain * s, 0.0001), time + a, d / 3);
  amp.gain.setTargetAtTime(0.0001, end, r / 3);
  const stopAt = end + r * 2 + 0.05;

  // expression shared by every kind: vibrato that fades in, a scoop into the note, random
  // drift. Each copy of a section gets its own vibrato, a little apart in rate and phase,
  // the way players in a section never vibrate together.
  const rnd01 = () => (rnd() + 1) / 2;
  const vibratos = new Map();
  const vibratoFor = (copy) => {
    if (!preset.vibrato || preset.kind === 'vocal') return null;
    if (vibratos.has(copy)) return vibratos.get(copy);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = preset.vibrato * (1 + rnd() * (copy ? 0.12 : 0.06));
    const g = ctx.createGain();
    const delay = preset.vibratoDelay ?? 0.1;
    g.gain.setValueAtTime(0, time);
    g.gain.setValueAtTime(0, time + delay);
    g.gain.linearRampToValueAtTime(preset.vibratoDepth ?? 6, time + delay + 0.25);
    lfo.connect(g);
    lfo.start(copy ? Math.max(0, time - rnd01() / preset.vibrato) : time);
    lfo.stop(stopAt);
    vibratos.set(copy, g);
    return g;
  };
  const drift = preset.drift ? rnd() * preset.drift : 0;
  const expression = (param, extra = 0, copy = 0) => {
    param.setValueAtTime(drift + extra - (preset.scoop ? preset.scoopDepth ?? 40 : 0), time);
    if (preset.scoop) param.linearRampToValueAtTime(drift + extra, time + preset.scoop);
    const vibrato = vibratoFor(copy);
    if (vibrato) vibrato.connect(param);
  };
  const from = preset.glide && state.lastFreq ? state.lastFreq : null;
  state.lastFreq = freq;

  let voiceIn = amp;
  if (preset.tremolo) {
    const g = ctx.createGain();
    g.gain.value = 0.75;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = preset.tremolo;
    const lg = ctx.createGain();
    lg.gain.value = 0.25;
    lfo.connect(lg).connect(g.gain);
    lfo.start(time);
    lfo.stop(stopAt);
    g.connect(amp);
    voiceIn = g;
  }
  amp.connect(out);
  const ensemble = preset.ensemble ?? 1;
  const spreadCents = (i) => (ensemble > 1 ? (i - (ensemble - 1) / 2) * (preset.ensembleDetune ?? 8) : 0);

  switch (preset.kind) {
    case 'osc': {
      const waves = preset.waves ?? ['sawtooth'];
      let filter = null;
      if (preset.filter) {
        filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.Q.value = preset.q ?? 0.7;
        const base = Math.min(preset.filter * (0.6 + velocity * 0.6), 18000);
        if (preset.filterEnv) {
          filter.frequency.setValueAtTime(Math.min(base + preset.filterEnv * velocity, 18000), time);
          filter.frequency.setTargetAtTime(base, time + 0.01, d / 2);
        } else filter.frequency.value = base;
        filter.connect(voiceIn);
      }
      const copies = ensemble * waves.length;
      for (let e = 0; e < ensemble; e++) {
        waves.forEach((wave, i) => {
          const osc = ctx.createOscillator();
          setWave(ctx, osc, wave, preset, name, midi);
          const ratio = preset.ratios ? preset.ratios[i] : 1;
          const spread = (preset.detune ? (i - (waves.length - 1) / 2) * preset.detune : 0) + spreadCents(e);
          if (from) {
            osc.frequency.setValueAtTime(from * ratio, time);
            osc.frequency.exponentialRampToValueAtTime(freq * ratio, time + preset.glide);
          } else osc.frequency.value = freq * ratio;
          expression(osc.detune, spread, e);
          const g = ctx.createGain();
          g.gain.value = (preset.mix ? preset.mix[i] : 1) / Math.sqrt(copies);
          osc.connect(g).connect(filter ?? voiceIn);
          osc.start(time);
          osc.stop(stopAt);
        });
      }
      break;
    }
    case 'additive': {
      const src = ctx.createBufferSource();
      src.buffer = toneBuffer(ctx, freq, preset, name);
      expression(src.detune);
      let node = src;
      if (preset.filter) {
        // softer when played softly: the hammer's brightness follows the velocity
        const f = biquad(ctx, 'lowpass', Math.min(18000, preset.filter * (0.35 + velocity * 0.9)), 0.5);
        src.connect(f);
        node = f;
      }
      node.connect(voiceIn);
      src.start(time);
      src.stop(stopAt);
      break;
    }
    case 'fm': {
      const carrier = ctx.createOscillator();
      carrier.type = 'sine';
      carrier.frequency.value = freq;
      const mod = ctx.createOscillator();
      mod.type = 'sine';
      mod.frequency.value = freq * preset.ratio;
      const index = ctx.createGain();
      const depth = freq * preset.index * (0.5 + velocity);
      index.gain.setValueAtTime(depth, time);
      index.gain.setTargetAtTime(depth * 0.1, time, preset.indexDecay);
      mod.connect(index).connect(carrier.frequency);
      expression(carrier.detune);
      carrier.connect(voiceIn);
      carrier.start(time);
      mod.start(time);
      carrier.stop(stopAt);
      mod.stop(stopAt);
      break;
    }
    case 'brass': {
      // Chowning's brass: a sine modulated by a sine at the same pitch, the modulation
      // index rising through the attack and settling, so the tone brightens the way a
      // lip buzz does and dulls again as the note ends.
      const ratio = preset.ratio ?? 1;
      for (let e = 0; e < ensemble; e++) {
        const carrier = ctx.createOscillator();
        const mod = ctx.createOscillator();
        carrier.type = 'sine';
        mod.type = 'sine';
        if (from) {
          carrier.frequency.setValueAtTime(from, time);
          carrier.frequency.exponentialRampToValueAtTime(freq, time + preset.glide);
          mod.frequency.setValueAtTime(from * ratio, time);
          mod.frequency.exponentialRampToValueAtTime(freq * ratio, time + preset.glide);
        } else {
          carrier.frequency.value = freq;
          mod.frequency.value = freq * ratio;
        }
        expression(carrier.detune, spreadCents(e), e);
        expression(mod.detune, spreadCents(e), e);
        const index = ctx.createGain();
        const peak = freq * (preset.index ?? 3) * (0.55 + velocity * 0.6);
        index.gain.setValueAtTime(peak * 0.15, time);
        index.gain.linearRampToValueAtTime(peak, time + a * 1.5);
        index.gain.setTargetAtTime(peak * (preset.indexSustain ?? 0.6), time + a * 1.5, d / 2);
        index.gain.setTargetAtTime(peak * 0.1, end, r / 2);
        mod.connect(index).connect(carrier.frequency);
        if (preset.fundamental) {
          // a sine under the FM anchors the fundamental, which the modulation thins out
          const sine = ctx.createOscillator();
          sine.type = 'sine';
          if (from) {
            sine.frequency.setValueAtTime(from, time);
            sine.frequency.exponentialRampToValueAtTime(freq, time + preset.glide);
          } else sine.frequency.value = freq;
          expression(sine.detune, spreadCents(e), e);
          const sg = ctx.createGain();
          sg.gain.value = preset.fundamental / Math.sqrt(ensemble);
          sine.connect(sg).connect(voiceIn);
          sine.start(time);
          sine.stop(stopAt);
        }
        const g = ctx.createGain();
        g.gain.value = 1 / Math.sqrt(ensemble);
        let node = carrier;
        if (preset.filter) {
          const f = biquad(ctx, 'lowpass', Math.min(18000, preset.filter * (0.7 + velocity * 0.5)), 0.7);
          carrier.connect(f);
          node = f;
        }
        node.connect(g).connect(voiceIn);
        carrier.start(time);
        mod.start(time);
        carrier.stop(stopAt);
        mod.stop(stopAt);
      }
      break;
    }
    case 'formant': {
      const q = preset.formantQ ?? 4;
      for (let e = 0; e < ensemble; e++) {
        const osc = ctx.createOscillator();
        setWave(ctx, osc, preset.wave ?? 'sawtooth', preset, name, midi);
        if (from) {
          osc.frequency.setValueAtTime(from, time);
          osc.frequency.exponentialRampToValueAtTime(freq, time + preset.glide);
        } else osc.frequency.value = freq;
        expression(osc.detune, spreadCents(e), e);
        const mix = ctx.createGain();
        mix.gain.value = 1 / Math.sqrt(ensemble);
        mix.connect(voiceIn);
        preset.formants.forEach((f, i) => {
          const bp = biquad(ctx, 'bandpass', f, q);
          const g = ctx.createGain();
          g.gain.value = 0.9 * (preset.formantGains ? preset.formantGains[i] : 1);
          osc.connect(bp).connect(g).connect(mix);
        });
        const direct = ctx.createGain();
        direct.gain.value = 0.12;
        osc.connect(direct).connect(mix);
        osc.start(time);
        osc.stop(stopAt);
      }
      break;
    }
    case 'vocal': {
      // see "The sung voice" above
      const section = ensemble > 1;
      const speech = !!preset.speech;
      const vowels = preset.vowels ?? ['a'];
      const syllable = (state.syllable = (state.syllable ?? 0) + 1);
      const vowel = VOWELS[vowels[syllable % vowels.length]] ?? VOWELS.a;
      const consonant = section ? { shape: VOWELS.m } : CONSONANTS[syllable % CONSONANTS.length];
      const legato = !speech && state.lastEnd !== undefined && time - state.lastEnd < 0.03;
      const phraseStart = state.lastEnd === undefined || time - state.lastEnd > 0.25;
      // the consonant's noise: a stop's click, or a fricative's hiss before the voice
      const noise = consonant.burst ?? consonant.hiss;
      if (noise) burst(ctx, out, noiseBuffer(ctx), { time, ...noise, peak: gain * noise.peak });
      // a singer's build: the tract grows with the register of the part, a male voice
      // around middle C, a female one from the octave above
      const register = preset.tract ?? 1 + 0.16 * Math.min(1, Math.max(0, (midi - 60) / 14));
      const onset = (preset.onset ?? 0.08) * (legato ? 0.7 : 1);
      const bright = preset.bright ?? 0.6;
      const tilt = preset.tilt ?? 1.6;
      // after the formants: no rumble, and the roll-off of the lips and the air above 5 kHz
      const tract = biquad(ctx, 'lowpass', preset.cutoff ?? 7000, 0.5);
      const rumble = biquad(ctx, 'highpass', 70, 0.7);
      tract.connect(rumble).connect(voiceIn);
      const shape = (v, i, scale) => {
        const f1 = Math.max(v.f[0] * scale, freq * 1.1); // a singer lifts the first formant to follow a high note
        const f = i === 0 ? f1 : i === 1 ? Math.max(v.f[1] * scale, f1 + 300) : v.f[i] * scale;
        // the branch gains describe the peaks of the output, so the upper ones are lifted
        // against the source's tilt, partly: `bright` 1 is the full lift, an operatic ring
        const g = Math.pow(10, v.db[i] / 20) * Math.pow(f / f1, tilt * bright);
        return { f, q: f / v.bw[i], g };
      };
      for (let e = 0; e < ensemble; e++) {
        // a section is singers of different build, a hair apart in time and tuning
        const scale = register * (section ? 0.94 + rnd01() * 0.14 : 1);
        const t0 = time + (consonant.delay ?? 0) + (section ? rnd01() * (preset.spread ?? 0.04) : 0);
        const osc = ctx.createOscillator();
        const pulse = glottalPulse(ctx, tilt);
        osc.setPeriodicWave(pulse.wave);
        if (legato && from) {
          osc.frequency.setValueAtTime(from, t0);
          osc.frequency.exponentialRampToValueAtTime(freq, t0 + preset.glide);
        } else osc.frequency.value = freq;
        // pitch: a scoop from below (a falling contour per syllable when spoken), a slow
        // wander and a fine jitter, and vibrato that arrives late and breathes in rate
        const cents = drift + spreadCents(e) + (section ? rnd() * 6 : 0);
        if (speech) {
          osc.detune.setValueAtTime(cents + 60, t0);
          osc.detune.linearRampToValueAtTime(cents - 130, t0 + Math.min(Math.max(duration, 0.08), 0.3));
        } else if (preset.scoop && !legato) {
          osc.detune.setValueAtTime(cents - (preset.scoopDepth ?? 60) * (phraseStart ? 1.4 : 1), t0);
          osc.detune.linearRampToValueAtTime(cents, t0 + preset.scoop);
        } else osc.detune.setValueAtTime(cents, t0);
        if (!speech) {
          // the pitch relaxes as the note lets go
          osc.detune.setValueAtTime(cents, end);
          osc.detune.linearRampToValueAtTime(cents - (preset.fall ?? 35), end + r);
        }
        const wobble = wander(ctx, 17 + e, t0, stopAt, rnd01() * 5);
        const jitter = ctx.createGain();
        jitter.gain.value = preset.jitter ?? 5;
        wobble.connect(jitter).connect(osc.detune);
        // white noise under a 400 Hz lowpass comes out near 0.08 RMS: `jitterFine` is cents RMS
        const fine = noiseSource(ctx, t0, stopAt - t0, { lowpass: 400 });
        const fineGain = ctx.createGain();
        fineGain.gain.value = (preset.jitterFine ?? 2.5) * 12;
        fine.connect(fineGain).connect(osc.detune);
        if (preset.vibrato && !speech) {
          const lfo = ctx.createOscillator();
          lfo.frequency.value = preset.vibrato * (1 + rnd() * 0.08);
          const depth = ctx.createGain();
          const delay = preset.vibratoDelay ?? 0.3;
          depth.gain.setValueAtTime(0, t0);
          depth.gain.setValueAtTime(0, t0 + delay);
          depth.gain.linearRampToValueAtTime((preset.vibratoDepth ?? 40) * (0.85 + rnd01() * 0.3), t0 + delay + 0.3);
          lfo.connect(depth).connect(osc.detune);
          const rate = ctx.createGain();
          rate.gain.value = preset.vibrato * 0.07;
          wobble.connect(rate).connect(lfo.frequency);
          lfo.start(Math.max(0, t0 - rnd01() / preset.vibrato)); // its own phase
          lfo.stop(stopAt);
        }
        // the source the formants read: the pulse, plus breath that is louder as the
        // mouth opens and closes
        const src = ctx.createGain();
        osc.connect(src);
        osc.start(t0);
        osc.stop(stopAt);
        if (preset.breath) {
          const n = noiseSource(ctx, t0, stopAt - t0, { highpass: 700 });
          const ng = ctx.createGain();
          const b = preset.breath * (section ? 0.8 + rnd01() * 0.4 : 1);
          ng.gain.setValueAtTime(b * 2.5, t0);
          ng.gain.linearRampToValueAtTime(b, t0 + onset + 0.06);
          ng.gain.setValueAtTime(b, end);
          ng.gain.linearRampToValueAtTime(b * 2, end + r);
          n.connect(ng).connect(src);
        }
        // the tremor of a voice (shimmer), and the half-rate beating of a rough one
        const tremor = ctx.createGain();
        tremor.gain.value = 1 - (preset.rough ?? 0) * 0.3;
        const shimmer = ctx.createGain();
        shimmer.gain.value = preset.shimmer ?? 0.08;
        wobble.connect(shimmer).connect(tremor.gain);
        if (preset.rough) {
          const sub = ctx.createOscillator();
          sub.frequency.value = freq / 2;
          const sg = ctx.createGain();
          sg.gain.value = preset.rough * 0.5;
          sub.connect(sg).connect(tremor.gain);
          sub.start(t0);
          sub.stop(stopAt);
        }
        // Predict how loud this vowel comes out at this pitch (the harmonics that land
        // in the formants) and even it out most of the way: a singer keeps the vowels
        // and registers at one level, where a filter bank alone swings by 10 dB.
        const targets = [0, 1, 2, 3, 4].map((i) => shape(vowel, i, scale));
        let energy = 0;
        for (let k = 1; k < pulse.amps.length && freq * k < 6000; k++) {
          const fk = freq * k;
          let power = 0;
          for (const { f, q, g } of targets) {
            const x = q * (fk / f - f / fk);
            power += (g * g) / (1 + x * x);
          }
          energy += pulse.amps[k] * pulse.amps[k] * power;
        }
        const even = Math.pow(0.22 / Math.max(Math.sqrt(energy / 2), 0.02), 0.75);
        const mix = ctx.createGain();
        mix.gain.value = (even * (section ? 0.85 + rnd01() * 0.3 : 1)) / Math.sqrt(ensemble);
        tremor.connect(mix).connect(tract);
        // the formant bank: the syllable opens from its consonant into the vowel, and the
        // mouth closes again as the note ends
        for (let i = 0; i < 5; i++) {
          const start = shape(consonant.shape, i, scale);
          const target = shape(vowel, i, scale);
          const close = shape(VOWELS.m, i, scale);
          const sign = i % 2 ? -1 : 1;
          const bp = biquad(ctx, 'bandpass', start.f, start.q);
          bp.frequency.setValueAtTime(start.f, t0);
          bp.frequency.linearRampToValueAtTime(target.f, t0 + onset);
          bp.frequency.setValueAtTime(target.f, end);
          bp.frequency.linearRampToValueAtTime(close.f, end + r);
          bp.Q.setValueAtTime(start.q, t0);
          bp.Q.linearRampToValueAtTime(target.q, t0 + onset);
          const g = ctx.createGain();
          g.gain.setValueAtTime(start.g * sign, t0);
          g.gain.linearRampToValueAtTime(target.g * sign, t0 + onset);
          g.gain.setValueAtTime(target.g * sign, end);
          g.gain.linearRampToValueAtTime(close.g * sign, end + r);
          src.connect(bp).connect(g).connect(tremor);
        }
      }
      state.lastEnd = end;
      break;
    }
    case 'pluck': {
      const strings = preset.double ? [-preset.double / 2, preset.double / 2] : [0];
      for (const cents of strings) {
        const src = ctx.createBufferSource();
        src.buffer = pluckBuffer(ctx, freq, preset, take);
        const glideFrom = from ? 1200 * Math.log2(from / freq) : 0;
        expression(src.detune, cents + glideFrom);
        if (from) src.detune.linearRampToValueAtTime(drift + cents, time + preset.glide);
        const g = ctx.createGain();
        g.gain.value = 1 / Math.sqrt(strings.length);
        src.connect(g).connect(voiceIn);
        src.start(time);
        src.stop(stopAt);
      }
      break;
    }
    default:
      throw new Error(`unknown instrument kind ${preset.kind}`);
  }
  // the air in the sound: steady breath noise, and a chiff, bow, thump or click at the attack
  if (preset.breath) {
    // `breathTone` is where the breath sits as a multiple of the pitch (a flute's at the
    // note itself), `breathQ` how narrowly the tube colours it
    const n = noiseSource(ctx, time, stopAt - time, { bandpass: Math.min(freq * (preset.breathTone ?? 2), 8000), q: preset.breathQ ?? 2.5 });
    const ng = ctx.createGain();
    ng.gain.value = preset.breath;
    n.connect(ng).connect(voiceIn);
  }
  if (preset.air) {
    // broadband hiss above 2.5 kHz: the air around a flute or a voice
    const n = noiseSource(ctx, time, stopAt - time, { highpass: 2500 });
    const ng = ctx.createGain();
    ng.gain.value = preset.air;
    n.connect(ng).connect(voiceIn);
  }
  if (preset.attackNoise) {
    const { amount, decay = 0.02, ...filters } = preset.attackNoise;
    burst(ctx, voiceIn, noiseBuffer(ctx), { time, peak: amount * (0.5 + velocity * 0.6), attack: 0.002, decay, ...filters });
  }
}

// --- The player -----------------------------------------------------------------------

/**
 * Plays one compiled piece in a loop. `onStep(step)` fires from an animation
 * frame with the step under the playhead. Tracks can be muted or soloed.
 */
export class Player {
  constructor({ createContext = () => new (window.AudioContext || window.webkitAudioContext)(), normalize = true } = {}) {
    this.createContext = createContext;
    this.normalize = normalize;
    this.ctx = null;
    this.piece = null;
    this.compiled = null;
    this.playing = false;
    this.startTime = 0;
    this.nextLoop = 0;
    this.timer = null;
    this.muted = new Set();
    this.solo = new Set();
    this.onStep = null;
    this.raf = 0;
    this.chains = [];
    this.master = null;
    this.volume = 0.8;
    this.trim = 1; // per-piece loudness trim, measured offline when a piece loads
    this.bpmScale = 1;
  }

  ensureContext() {
    if (!this.ctx) {
      this.ctx = this.createContext();
      const ctx = this.ctx;
      this.master = ctx.createGain();
      this.master.gain.value = this.volume * this.trim;
      // A safety limiter: stacked distorted guitars peak above full scale otherwise. Gentle
      // enough to leave the drums' transients alone.
      this.limiter = ctx.createDynamicsCompressor();
      this.limiter.threshold.value = -7;
      this.limiter.knee.value = 5;
      this.limiter.ratio.value = 16;
      this.limiter.attack.value = 0.001;
      this.limiter.release.value = 0.16;
      this.trimOut = ctx.createGain();
      this.trimOut.gain.value = 0.85;
      this.master.connect(this.limiter).connect(this.trimOut).connect(ctx.destination);
      this.rooms = {};
    }
    if (this.ctx.state === 'suspended' && typeof this.ctx.startRendering !== 'function') this.ctx.resume().catch(() => {});
    return this.ctx;
  }

  room(name) {
    if (!this.rooms[name]) {
      const ctx = this.ctx;
      const conv = ctx.createConvolver();
      const specs = {
        room: { seconds: 0.9, decay: 3.5, dark: 0.5 },
        hall: { seconds: 2.6, decay: 2.6, dark: 0.3 },
        plate: { seconds: 1.6, decay: 2.2, dark: 0.15 },
        spring: { seconds: 1.1, decay: 4, dark: 0.05 },
        cave: { seconds: 4, decay: 2, dark: 0.5 },
      };
      conv.buffer = impulse(ctx, specs[name] ?? specs.room);
      conv.connect(this.master);
      this.rooms[name] = conv;
    }
    return this.rooms[name];
  }

  /** Load a piece (replaces the current one; stops playback). */
  load(piece) {
    this.stop();
    this.piece = piece;
    this.compiled = compilePiece(piece);
    this.muted = new Set();
    this.solo = new Set();
    this.chains = [];
    this.trim = 1;
    this.bpmScale = 1;
    if (this.normalize) this.measure(piece);
  }

  /**
   * Render one loop offline at a low sample rate and set the trim so every
   * sketch plays at about the same loudness (target RMS 0.11, trim within 0.2x to 3x).
   */
  async measure(piece) {
    const Offline = typeof window !== 'undefined' && (window.OfflineAudioContext || window.webkitOfflineAudioContext);
    if (!Offline) return;
    try {
      const buffer = await renderPiece(piece, { loops: 1, sampleRate: 22050 });
      if (this.piece !== piece) return; // another piece loaded meanwhile
      const data = buffer.getChannelData(0);
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
      const rms = Math.sqrt(sum / data.length);
      this.trim = rms > 0 ? Math.min(3, Math.max(0.2, 0.11 / rms)) : 1;
      if (this.master) this.master.gain.setTargetAtTime(this.volume * this.trim, this.ctx.currentTime, 0.1);
    } catch (e) {
      this.trim = 1;
    }
  }

  buildChains() {
    const ctx = this.ctx;
    for (const c of this.chains) c.output.disconnect();
    const master = this.piece.master ?? {};
    const roomName = master.reverb ?? 'room';
    const reverb = roomName === 'none' ? null : this.room(roomName);
    this.duck = ctx.createGain();
    this.duck.gain.value = 1;
    this.duck.connect(this.master);
    this.chains = this.compiled.tracks.map(({ track }) => {
      const preset = isDrumTrack(track) ? null : INSTRUMENTS[track.inst];
      const fx = { ...(preset?.fx ?? {}), ...(track.fx ?? {}) };
      if (fx.amp && track.fx?.drive && !track.fx.amp) {
        // a track asking for more drive on an amp instrument turns the amp up instead of adding a stage
        fx.amp = Math.min(1, fx.amp + track.fx.drive * 0.3);
        delete fx.drive;
      }
      const chain = buildChain(ctx, fx, this.compiled.stepSeconds / this.bpmScale);
      const sidechained = master.sidechain && !(isDrumTrack(track) && track.inst === 'kick');
      // The mute/solo gain sits after the chain, before the mix and the reverb send.
      chain.gain = ctx.createGain();
      chain.gain.gain.value = 1;
      chain.output.connect(chain.gain);
      chain.gain.connect(sidechained ? this.duck : this.master);
      const send = track.fx?.reverb ?? master.send ?? 0.15;
      if (reverb && send > 0) {
        const sendGain = ctx.createGain();
        sendGain.gain.value = send;
        chain.gain.connect(sendGain).connect(reverb);
      }
      chain.state = {};
      chain.stateB = {};
      return chain;
    });
    this.applyMutes();
  }

  trackAudible(index) {
    const id = this.compiled.tracks[index].track.id;
    if (this.solo.size) return this.solo.has(id);
    return !this.muted.has(id);
  }

  applyMutes() {
    if (!this.ctx) return;
    this.chains.forEach((chain, i) => {
      const target = this.trackAudible(i) ? 1 : 0;
      chain.gain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.01);
    });
  }

  toggleMute(id) {
    if (this.muted.has(id)) this.muted.delete(id);
    else this.muted.add(id);
    this.applyMutes();
  }

  toggleSolo(id) {
    if (this.solo.has(id)) this.solo.delete(id);
    else this.solo.add(id);
    this.applyMutes();
  }

  setVolume(v) {
    this.volume = v;
    if (this.master) this.master.gain.setTargetAtTime(v * this.trim, this.ctx.currentTime, 0.02);
  }

  /**
   * Tempo multiplier (1 = written tempo). While playing, the clock is re-based so the
   * playhead keeps its place and the next loop follows at the new speed; the loop
   * already scheduled finishes at the old one.
   */
  setTempoScale(scale) {
    if (!this.playing || !this.ctx) {
      this.bpmScale = scale;
      return;
    }
    const now = this.ctx.currentTime;
    const elapsed = now - this.startTime;
    const position = elapsed / this.loopSeconds; // loops since the start, fractional
    this.bpmScale = scale;
    this.startTime = now - position * this.loopSeconds;
    this.nextLoop = Math.floor(position) + 1;
  }

  get loopSeconds() {
    return this.compiled.loopSeconds / this.bpmScale;
  }

  play() {
    if (!this.compiled || this.playing) return;
    const ctx = this.ensureContext();
    this.buildChains();
    this.playing = true;
    this.startTime = ctx.currentTime + 0.08;
    this.nextLoop = 0;
    this.schedule();
    this.timer = setInterval(() => this.schedule(), TICK);
    const tick = () => {
      if (!this.playing) return;
      const elapsed = ctx.currentTime - this.startTime;
      const loop = this.loopSeconds;
      const inLoop = ((elapsed % loop) + loop) % loop;
      const step = Math.floor((inLoop / loop) * this.compiled.totalSteps);
      if (this.onStep && elapsed >= 0) this.onStep(step, inLoop / loop);
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  schedule() {
    const ctx = this.ctx;
    const loop = this.loopSeconds;
    while (this.startTime + this.nextLoop * loop < ctx.currentTime + LOOKAHEAD + loop * 0.1) {
      const base = this.startTime + this.nextLoop * loop;
      // One loop at a time is scheduled, slightly ahead; a loop is short, so this is cheap.
      if (base + loop > ctx.currentTime - 0.05) this.scheduleLoop(base);
      this.nextLoop += 1;
      if (this.nextLoop > 100000) break;
    }
  }

  scheduleLoop(base) {
    const ctx = this.ctx;
    const stepSeconds = this.compiled.stepSeconds / this.bpmScale;
    const master = this.piece.master ?? {};
    const kit = this.piece.kit ?? 'acoustic';
    const machine = KITS[kit]?.model === 'machine';
    // Played, not programmed: hands land a few milliseconds off and never hit twice the same.
    const humanize = machine ? master.humanize ?? 0.002 : Math.max(master.humanize ?? 0, 0.008);
    const looseness = master.velocityJitter ?? (machine ? 0.03 : 0.1);
    const rnd = mulberry(Math.floor(base * 1000));
    this.compiled.tracks.forEach(({ track, events }, i) => {
      const chain = this.chains[i];
      const preset = isDrumTrack(track) ? null : INSTRUMENTS[track.inst];
      if (!isDrumTrack(track) && !preset) throw new Error(`unknown instrument ${track.inst}`);
      for (const e of events) {
        const jitter = humanize ? rnd() * humanize : 0;
        const t = base + e.time * stepSeconds + jitter;
        if (t < ctx.currentTime) continue;
        const velocity = Math.min(1.2, Math.max(0.05, e.velocity * (1 + rnd() * looseness)));
        if (isDrumTrack(track)) {
          playDrum(ctx, chain.input, track.inst, track.kit ?? kit, t, velocity, e.variant);
          if (master.sidechain && track.inst === 'kick') {
            const g = this.duck.gain;
            g.cancelScheduledValues(t);
            g.setValueAtTime(1 - master.sidechain, t);
            g.linearRampToValueAtTime(1, t + stepSeconds * 3);
          }
        } else {
          const dur = e.duration * stepSeconds;
          e.notes.forEach((midi, n) => {
            const strum = preset.strum ? n * preset.strum * (track.strum ?? 1) : 0;
            const note = midi + (track.transpose ?? 0);
            playVoice(ctx, chain.input, preset, track.inst, note, t + strum, dur, velocity, chain.state);
            // the second take of a double-tracked part: its own string noise, a hair late
            if (chain.inputB) playVoice(ctx, chain.inputB, preset, track.inst, note, t + strum + 0.009 + rnd() * 0.004, dur, velocity * (0.96 + rnd() * 0.04), chain.stateB, 1);
          });
        }
      }
    });
  }

  stop() {
    if (!this.playing) return;
    this.playing = false;
    clearInterval(this.timer);
    cancelAnimationFrame(this.raf);
    // Fade the chains out and drop them; voices already scheduled end on their own.
    const ctx = this.ctx;
    for (const chain of this.chains) {
      chain.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.02);
      const out = chain.output;
      setTimeout(() => out.disconnect(), 300);
    }
    this.chains = [];
    if (this.onStep) this.onStep(-1, 0);
  }

  /** Play a single note or chord once, for previews outside the sequencer. */
  preview(inst, notes, seconds = 0.8) {
    const ctx = this.ensureContext();
    const preset = INSTRUMENTS[inst];
    const chain = buildChain(ctx, preset.fx ?? {}, 0.1);
    chain.output.connect(this.master);
    const state = {};
    notes.forEach((midi, n) => playVoice(ctx, chain.input, preset, inst, midi, ctx.currentTime + 0.02 + n * (preset.strum ?? 0), seconds, 0.8, state));
  }
}

/**
 * Render a piece offline into an AudioBuffer: `loops` passes of the loop at the
 * written tempo, through the same chains the live player builds. Used by the
 * render check (tests/render.html) to measure every sketch without listening.
 */
export async function renderPiece(piece, { loops = 2, sampleRate = 44100, muted = [], trim = 1 } = {}) {
  const compiled = compilePiece(piece);
  const seconds = compiled.loopSeconds * loops + 1.5;
  const Offline = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const player = new Player({ createContext: () => new Offline(2, Math.ceil(seconds * sampleRate), sampleRate), normalize: false });
  player.load(piece);
  player.trim = trim; // after load(), which resets the trim
  const ctx = player.ensureContext();
  player.buildChains();
  for (const id of muted) player.muted.add(id);
  player.applyMutes();
  for (let k = 0; k < loops; k++) player.scheduleLoop(0.05 + k * compiled.loopSeconds);
  return ctx.startRendering();
}

export const DRUM_TYPES = ['kick', 'snare', 'rim', 'clap', 'hat', 'ride', 'crash', 'tom', 'tomHigh', 'conga', 'timbale', 'shaker', 'tambourine', 'clave', 'cowbell', 'block', 'vinyl'];

/** What the page calls each drum sound. */
export const DRUM_NAMES = {
  kick: { en: 'Kick drum', zh: '底鼓' },
  snare: { en: 'Snare drum', zh: '军鼓' },
  rim: { en: 'Rim click', zh: '边击' },
  clap: { en: 'Handclap', zh: '拍手' },
  hat: { en: 'Hi-hat', zh: '踩镲' },
  ride: { en: 'Ride cymbal', zh: '叠音镲' },
  crash: { en: 'Crash cymbal', zh: '吊镲' },
  tom: { en: 'Tom', zh: '通鼓' },
  tomHigh: { en: 'High tom', zh: '高音通鼓' },
  conga: { en: 'Conga', zh: '康加鼓' },
  timbale: { en: 'Timbale', zh: '天巴鼓' },
  shaker: { en: 'Shaker', zh: '沙锤' },
  tambourine: { en: 'Tambourine', zh: '铃鼓' },
  clave: { en: 'Claves', zh: '响棒' },
  cowbell: { en: 'Cowbell', zh: '牛铃' },
  block: { en: 'Woodblock', zh: '木块' },
  vinyl: { en: 'Vinyl crackle', zh: '黑胶炒豆声' },
};

/** The display name of an instrument or drum sound, as { en, zh }. */
export function instrumentName(inst) {
  return INSTRUMENTS[inst]?.name ?? DRUM_NAMES[inst] ?? { en: inst, zh: inst };
}

/** Instruments a piece uses that are missing from the presets, for the data tests. */
export function unknownInstruments(piece) {
  const drums = new Set(DRUM_TYPES);
  const missing = [];
  for (const track of piece.tracks) {
    if (isDrumTrack(track)) {
      if (!drums.has(track.inst)) missing.push(track.inst);
    } else if (!INSTRUMENTS[track.inst]) missing.push(track.inst);
  }
  return missing;
}

export const KIT_NAMES = Object.keys(KITS);
