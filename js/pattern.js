// The piece format and its compiler: a piece is a few bars of tracks written as
// step strings, and compilePiece turns it into timed events the audio engine
// schedules and the sequencer view draws. Pure functions, usable in node tests.
//
// A piece:
//   {
//     bpm: 124, bars: 2, swing: 0.5, swingUnit: 16,
//     tracks: [
//       { id: 'kick', inst: 'kick', steps: 'x...x...x...x...|x...x...x...x...' },
//       { id: 'bass', inst: 'bassSynth', notes: 'F2 . _ F2 . . Ab2 . | ...', gate: 0.8 },
//       { id: 'keys', inst: 'epiano', prog: 'Fm7 Db', rhythm: 'x..x..x...x.....', octave: 3 },
//       { id: 'lead', inst: 'leadSaw', notes: '...' },
//     ],
//   }
//
// Step strings: one character per sixteenth note; `|` and spaces are ignored so
// bars can be separated for reading. Drum characters: `x` hit, `X` accent,
// `-` ghost, `o` open (hi-hats) or alternate sound, `.` rest.
// Note strings: whitespace-separated tokens, one per sixteenth: a note name
// (C2, F#3, Bb4), a chord symbol on chord tracks (Fm7, E5), `.` for a rest,
// `_` to hold the previous token one more step. A `>` prefix accents a token.
// A chord track can instead give `prog` (chords, one per bar unless `change`
// says otherwise) and `rhythm` (a drum-style step string that strikes whichever
// chord is current; `_` in the rhythm holds the chord).

import { noteToMidi, voice } from './theory.js';

export const STEPS_PER_BAR = 16;

const DRUM_VELOCITY = { x: 0.85, X: 1, '-': 0.4, o: 0.85, O: 1 };

/** Strip separators from a drum-style step string. */
export function cleanSteps(text) {
  return text.replace(/[\s|]/g, '');
}

/** Tokens of a note-style string, separators removed. */
export function tokens(text) {
  return text.split(/\s+/).map((t) => t.replace(/\|/g, '')).filter(Boolean);
}

/**
 * Swing offset of a step, in steps. `swing` is the share of each pair the first
 * half gets: 0.5 is straight, 0.67 is triplet feel. With swingUnit 16 the pairs
 * are sixteenths within an eighth; with swingUnit 8 they are eighths within a beat.
 */
export function swingOffset(step, swing = 0.5, swingUnit = 16) {
  if (!swing || Math.abs(swing - 0.5) < 1e-6) return 0;
  if (swingUnit === 8) {
    const inBeat = step % 4;
    const delay = 2 * (2 * swing - 1);
    if (inBeat === 2) return delay;
    if (inBeat === 3) return delay / 2;
    return 0;
  }
  return step % 2 === 1 ? 2 * swing - 1 : 0;
}

function drumEvents(track, totalSteps, piece) {
  const steps = cleanSteps(track.steps);
  if (steps.length !== totalSteps) throw new Error(`${track.id}: ${steps.length} steps, expected ${totalSteps}`);
  const events = [];
  for (let i = 0; i < steps.length; i++) {
    const c = steps[i];
    if (c === '.') continue;
    const velocity = DRUM_VELOCITY[c];
    if (velocity === undefined) throw new Error(`${track.id}: unknown drum character "${c}"`);
    events.push({
      step: i,
      time: i + swingOffset(i, piece.swing, piece.swingUnit),
      duration: 1,
      velocity: velocity * (track.level ?? 1),
      variant: c === 'o' || c === 'O' ? 'open' : null,
      notes: null,
    });
  }
  return events;
}

function parseToken(raw, track) {
  let text = raw;
  let accent = false;
  if (text.startsWith('>')) {
    accent = true;
    text = text.slice(1);
  }
  if (track.prog || track.chords) {
    return { notes: voice(text, { octave: track.octave ?? 3, voicing: track.voicing ?? 'close' }), label: text, accent };
  }
  return { notes: [noteToMidi(text)], label: text, accent };
}

function noteEvents(track, totalSteps, piece) {
  const list = tokens(track.notes ?? track.chords);
  if (list.length !== totalSteps) throw new Error(`${track.id}: ${list.length} tokens, expected ${totalSteps}`);
  const events = [];
  let current = null;
  for (let i = 0; i < list.length; i++) {
    const tok = list[i];
    if (tok === '_') {
      if (current) current.duration += 1;
      continue;
    }
    if (tok === '.') {
      current = null;
      continue;
    }
    const parsed = parseToken(tok, track);
    current = {
      step: i,
      time: i + swingOffset(i, piece.swing, piece.swingUnit),
      duration: 1,
      velocity: (parsed.accent ? 1 : 0.8) * (track.level ?? 1),
      variant: null,
      notes: parsed.notes,
      label: parsed.label,
    };
    events.push(current);
  }
  const gate = track.gate ?? 0.9;
  for (const e of events) e.duration = Math.max(0.1, e.duration * gate);
  return events;
}

/** The chord symbol current at a step for a `prog` track. */
function chordAt(track, step, piece) {
  const prog = Array.isArray(track.prog) ? track.prog : tokens(track.prog);
  const change = track.change ?? ((piece.bars ?? 2) * (piece.stepsPerBar ?? STEPS_PER_BAR)) / prog.length; // steps per chord
  const index = Math.floor(step / change) % prog.length;
  return prog[index];
}

function progEvents(track, totalSteps, piece) {
  const rhythm = cleanSteps(track.rhythm ?? 'x'.padEnd(piece.stepsPerBar ?? STEPS_PER_BAR, '.').repeat(piece.bars ?? 2));
  if (rhythm.length !== totalSteps) throw new Error(`${track.id}: rhythm has ${rhythm.length} steps, expected ${totalSteps}`);
  const events = [];
  let current = null;
  for (let i = 0; i < rhythm.length; i++) {
    const c = rhythm[i];
    if (c === '_') {
      if (current) current.duration += 1;
      continue;
    }
    if (c === '.') {
      current = null;
      continue;
    }
    const velocity = DRUM_VELOCITY[c];
    if (velocity === undefined) throw new Error(`${track.id}: unknown rhythm character "${c}"`);
    const symbol = chordAt(track, i, piece);
    current = {
      step: i,
      time: i + swingOffset(i, piece.swing, piece.swingUnit),
      duration: 1,
      velocity: velocity * (track.level ?? 1),
      variant: null,
      notes: voice(symbol, { octave: track.octave ?? 3, voicing: track.voicing ?? 'close' }),
      label: symbol,
    };
    events.push(current);
  }
  const gate = track.gate ?? 0.9;
  for (const e of events) e.duration = Math.max(0.1, e.duration * gate);
  return events;
}

/** Whether a track is a drum (unpitched) track. */
export function isDrumTrack(track) {
  return typeof track.steps === 'string';
}

/**
 * Compile a piece into { bpm, bars, totalSteps, stepSeconds, loopSeconds, tracks: [{ track, events }] }.
 * Every event has `time` (in steps, swing applied), `duration` (steps), `velocity`,
 * and either `notes` (MIDI numbers) or null for drums.
 */
export function compilePiece(piece) {
  const bars = piece.bars ?? 2;
  const stepsPerBar = piece.stepsPerBar ?? STEPS_PER_BAR; // 16 sixteenths in 4/4; 14 eighths in 7/8; 12 eighths in 12/8
  const beatSteps = piece.beatSteps ?? 4; // steps per beat, so bpm stays the beat's tempo
  const totalSteps = bars * stepsPerBar;
  const stepSeconds = 60 / piece.bpm / beatSteps;
  const tracks = piece.tracks.map((track) => {
    let events;
    if (isDrumTrack(track)) events = drumEvents(track, totalSteps, piece);
    else if (track.prog) events = progEvents(track, totalSteps, piece);
    else if (track.notes || track.chords) events = noteEvents(track, totalSteps, piece);
    else throw new Error(`${track.id}: a track needs steps, notes, chords or prog`);
    return { track, events };
  });
  return { bpm: piece.bpm, bars, stepsPerBar, beatSteps, totalSteps, stepSeconds, loopSeconds: totalSteps * stepSeconds, tracks };
}

/** Pitch range (min, max MIDI) over a compiled track's events, for drawing. */
export function pitchRange(events) {
  let min = Infinity;
  let max = -Infinity;
  for (const e of events) {
    if (!e.notes) continue;
    for (const n of e.notes) {
      if (n < min) min = n;
      if (n > max) max = n;
    }
  }
  return min === Infinity ? null : { min, max };
}
