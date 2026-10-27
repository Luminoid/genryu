// The render harness: renders every sketch offline and measures it, driven by
// scripts/render-check.mjs through tests/render.html. Kept out of the page so
// the site's CSP (no inline scripts) also holds here.
import { PIECES, sketchesOf } from '../data/pieces.js';
import { renderPiece } from '../js/audio.js';
import { compilePiece } from '../js/pattern.js';
import { stats, toWav } from './measure.mjs';

const out = document.getElementById('out');
const results = {};
const wavs = {};
const params = new URLSearchParams(location.search);
const only = params.get('only') ? params.get('only').split(',') : null;
const wav = params.get('wav'); // 'mix' keeps the full mix, 'tracks' every solo as well

for (const id of Object.keys(PIECES)) {
  if (only && !only.includes(id)) continue;
  const sketches = sketchesOf(id);
  for (let k = 0; k < sketches.length; k++) {
    const piece = sketches[k];
    const key = sketches.length > 1 ? `${id}/${k + 1}` : id;
    try {
      const compiled = compilePiece(piece);
      // First pass measures the raw loudness the way Player.measure() does; the second
      // renders with that trim applied, which is what a listener hears.
      const raw = stats(await renderPiece(piece, { loops: 1, sampleRate: 22050 }));
      const trim = raw.rms > 0 ? Math.min(3, Math.max(0.2, 0.11 / raw.rms)) : 1;
      const mix = await renderPiece(piece, { loops: 1, trim });
      const full = stats(mix);
      if (wav) wavs[key] = toWav(mix);
      // Each track alone: solo it by muting the others, to catch silent or overloaded parts.
      const tracks = {};
      for (const { track } of compiled.tracks) {
        const others = compiled.tracks.map((t) => t.track.id).filter((x) => x !== track.id);
        const solo = await renderPiece(piece, { loops: 1, muted: others, trim });
        tracks[track.id] = stats(solo).rms;
        if (wav === 'tracks') wavs[`${key}.${track.id}`] = toWav(solo);
      }
      results[key] = { ok: true, ...full, trim: Number(trim.toFixed(2)), tracks, bars: compiled.bars, seconds: Number(compiled.loopSeconds.toFixed(1)) };
    } catch (err) {
      results[key] = { ok: false, error: String(err && err.message ? err.message : err) };
    }
    const li = document.createElement('li');
    li.textContent = `${key}: ${JSON.stringify(results[key])}`;
    out.append(li);
  }
}
window.__results = results;
window.__wavs = wavs;
document.title = 'done';
