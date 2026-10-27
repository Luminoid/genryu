// The instrument harness: one short phrase per instrument preset and one hit
// per drum sound per kit, rendered alone through renderPiece, so each model
// can be checked on its own. Driven by scripts/render-check.mjs --instruments.
import { INSTRUMENTS, KITS, DRUM_TYPES, renderPiece } from '../js/audio.js';
import { stats, toWav } from './measure.mjs';

const out = document.getElementById('out');
const results = {};
const wavs = {};
const params = new URLSearchParams(location.search);
const only = params.get('only') ? params.get('only').split(',') : null;

// Where each instrument usually plays: the phrase is the same shape an octave apart.
const REGISTER = {
  bassFinger: 2, bassPick: 2, bassUpright: 2, bassSynth: 2, bassSub: 1, bassAcid: 2, bassReese: 2, bassMoog: 2, bassSlap: 2,
  guitarMetal: 2, guitarChug: 2, guitarDist: 3, guitarCrunch: 3, guitarClean: 3, guitarMuted: 3, guitarFuzz: 3, guitarNylon: 3, guitarLead: 4, guitarLeadClean: 4, guitarSlide: 3, steelGuitar: 4,
  banjo: 4, mandolin: 5, sitar: 4, koto: 4, clavinet: 3, trombone: 3, bariSax: 3, sax: 4, trumpet: 4, brass: 4, clarinet: 4, flute: 5, suona: 5, whistle: 5,
  harmonica: 4, accordion: 4, strings: 4, fiddle: 5, voice: 4, voiceShout: 4, voiceSpoken: 4, choir: 4, bell: 5, kalimba: 5, vibes: 4, marimba: 4, steelDrum: 4, chiptune: 5,
};
const phrase = (octave) => `C${octave} _ _ _ E${octave} _ _ _ G${octave} _ _ _ _ _ _ _`;

for (const [inst, preset] of Object.entries(INSTRUMENTS)) {
  const key = `inst.${inst}`;
  if (only && !only.includes(inst)) continue;
  const octave = REGISTER[inst] ?? 4;
  const piece = { bpm: 96, bars: 1, kit: 'acoustic', tracks: [{ id: 'x', inst, notes: phrase(octave), gate: 0.9 }] };
  try {
    const mix = await renderPiece(piece, { loops: 1 });
    results[key] = { ok: true, ...stats(mix), seconds: Number(mix.duration.toFixed(1)) };
    wavs[key] = toWav(mix);
  } catch (err) {
    results[key] = { ok: false, error: String(err && err.message ? err.message : err) };
  }
  const li = document.createElement('li');
  li.textContent = `${key}: ${JSON.stringify(results[key])}`;
  out.append(li);
}

for (const kit of Object.keys(KITS)) {
  for (const type of DRUM_TYPES) {
    for (const open of type === 'hat' ? [false, true] : [false]) {
      const key = `kit.${kit}.${type}${open ? 'Open' : ''}`;
      if (only && !only.includes(kit) && !only.includes(type)) continue;
      const piece = { bpm: 120, bars: 1, kit, tracks: [{ id: 'x', inst: type, steps: open ? 'o...............' : 'x...............' }] };
      try {
        const mix = await renderPiece(piece, { loops: 1 });
        results[key] = { ok: true, ...stats(mix), seconds: Number(mix.duration.toFixed(1)) };
        wavs[key] = toWav(mix);
      } catch (err) {
        results[key] = { ok: false, error: String(err && err.message ? err.message : err) };
      }
      const li = document.createElement('li');
      li.textContent = `${key}: ${JSON.stringify(results[key])}`;
      out.append(li);
    }
  }
}
window.__results = results;
window.__wavs = wavs;
document.title = 'done';
