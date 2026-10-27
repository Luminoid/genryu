// Note names, chord symbols and voicings: pure functions shared by the pattern
// parser, the audio engine and the tests. No DOM, no AudioContext.

const PITCH_CLASSES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const NOTE_RE = /^([A-G])([#b]?)(-?\d)$/;

/** MIDI number of a note name such as C4, F#2 or Bb3 (C4 = 60). */
export function noteToMidi(name) {
  const m = NOTE_RE.exec(name);
  if (!m) throw new Error(`not a note: ${name}`);
  const accidental = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
  return (Number(m[3]) + 1) * 12 + PITCH_CLASSES[m[1]] + accidental;
}

/** Frequency in Hz of a MIDI number (A4 = 440). */
export function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

const NAMES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/** Note name of a MIDI number, with sharps. */
export function midiToNote(midi) {
  return `${NAMES_SHARP[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;
}

// Chord qualities as semitone offsets from the root. Longer suffixes first so
// `maj7` is matched before `m` and `m7b5` before `m7`.
const QUALITIES = [
  ['maj13', [0, 4, 7, 11, 14, 21]],
  ['maj7#11', [0, 4, 7, 11, 18]],
  ['maj9', [0, 4, 7, 11, 14]],
  ['maj7', [0, 4, 7, 11]],
  ['mmaj7', [0, 3, 7, 11]],
  ['m7b5', [0, 3, 6, 10]],
  ['m11', [0, 3, 7, 10, 14, 17]],
  ['m9', [0, 3, 7, 10, 14]],
  ['m7', [0, 3, 7, 10]],
  ['m6', [0, 3, 7, 9]],
  ['madd9', [0, 3, 7, 14]],
  ['dim7', [0, 3, 6, 9]],
  ['dim', [0, 3, 6]],
  ['aug', [0, 4, 8]],
  ['sus2', [0, 2, 7]],
  ['sus4', [0, 5, 7]],
  ['7sus4', [0, 5, 7, 10]],
  ['7#9', [0, 4, 7, 10, 15]],
  ['7b9', [0, 4, 7, 10, 13]],
  ['7#11', [0, 4, 7, 10, 18]],
  ['13', [0, 4, 7, 10, 14, 21]],
  ['11', [0, 4, 7, 10, 17]],
  ['9', [0, 4, 7, 10, 14]],
  ['7', [0, 4, 7, 10]],
  ['6/9', [0, 4, 7, 9, 14]],
  ['6', [0, 4, 7, 9]],
  ['add9', [0, 4, 7, 14]],
  ['5', [0, 7]],
  ['m', [0, 3, 7]],
  ['maj', [0, 4, 7]],
  ['', [0, 4, 7]],
];

const CHORD_RE = /^([A-G])([#b]?)(.*)$/;

/**
 * Parse a chord symbol (Fm7, Db, Abmaj7, E5, G7#9, C/E) into its root pitch
 * class, its intervals and the optional bass note (pitch class) after a slash.
 */
export function parseChord(symbol) {
  const [body, slash] = symbol.split('/');
  const m = CHORD_RE.exec(body);
  if (!m) throw new Error(`not a chord: ${symbol}`);
  const root = (PITCH_CLASSES[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + 12) % 12;
  const quality = m[3];
  const found = QUALITIES.find(([name]) => name === quality);
  if (!found) throw new Error(`unknown chord quality "${quality}" in ${symbol}`);
  let bass = null;
  if (slash !== undefined) {
    const b = CHORD_RE.exec(slash);
    if (!b || b[3]) throw new Error(`bad bass note in ${symbol}`);
    bass = (PITCH_CLASSES[b[1]] + (b[2] === '#' ? 1 : b[2] === 'b' ? -1 : 0) + 12) % 12;
  }
  return { root, intervals: found[1], quality: found[0], bass };
}

/**
 * MIDI notes of a chord symbol voiced for an instrument.
 *   close   every chord tone stacked from the root in `octave` (C3 = 48 when octave is 3)
 *   spread  root an octave down, the rest close: a pianist's left-hand root plus right-hand colours
 *   shell   root, third and seventh only (jazz comping); triads keep their fifth
 *   power   root and fifth, plus the octave: a distorted guitar's chord
 *   top     the close voicing without its root, for a stab over a separate bass
 * A slash bass adds that note below the voicing.
 */
export function voice(symbol, { octave = 3, voicing = 'close' } = {}) {
  const chord = parseChord(symbol);
  const base = (octave + 1) * 12 + chord.root;
  let intervals = chord.intervals;
  if (voicing === 'power') intervals = [0, 7, 12];
  else if (voicing === 'shell') {
    const has = (i) => intervals.includes(i);
    const third = intervals.find((i) => i === 3 || i === 4 || i === 5 || i === 2);
    const seventh = intervals.find((i) => i === 10 || i === 11 || i === 9);
    intervals = seventh !== undefined ? [0, third ?? 4, seventh] : intervals.filter((i) => i <= 7 || has(i));
  }
  let notes = intervals.map((i) => base + i);
  if (voicing === 'spread') notes = [base - 12, ...notes.slice(1)];
  if (voicing === 'top') notes = notes.slice(1).length ? notes.slice(1) : notes;
  if (chord.bass !== null) {
    let b = (octave + 1) * 12 + chord.bass - 12;
    while (b >= notes[0]) b -= 12;
    notes = [b, ...notes];
  }
  return notes;
}

/** Note names of a chord's close voicing, for labels and tests. */
export function spell(symbol, options) {
  return voice(symbol, options).map(midiToNote);
}

/**
 * A semitone transposition of a note or chord symbol; used by the "play it in
 * another key" control. Chords keep their quality and slash bass.
 */
export function transposeSymbol(symbol, semitones) {
  if (NOTE_RE.test(symbol)) return midiToNote(noteToMidi(symbol) + semitones);
  const chord = parseChord(symbol);
  const root = NAMES_SHARP[(chord.root + semitones + 120) % 12];
  const quality = chord.quality;
  const bass = chord.bass === null ? '' : `/${NAMES_SHARP[(chord.bass + semitones + 120) % 12]}`;
  return `${root}${quality}${bass}`;
}
