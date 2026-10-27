// The piece format: step strings, note tokens, chord progressions and swing.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compilePiece, swingOffset, cleanSteps, tokens, pitchRange } from '../js/pattern.js';
import { noteToMidi, midiToFreq, parseChord, voice, spell, transposeSymbol, midiToNote } from '../js/theory.js';

test('note names map to MIDI and back', () => {
  assert.equal(noteToMidi('C4'), 60);
  assert.equal(noteToMidi('A4'), 69);
  assert.equal(noteToMidi('F#2'), 42);
  assert.equal(noteToMidi('Bb3'), 58);
  assert.equal(midiToNote(60), 'C4');
  assert.equal(midiToNote(42), 'F#2');
  assert.ok(Math.abs(midiToFreq(69) - 440) < 1e-9);
  assert.throws(() => noteToMidi('H2'));
});

test('chord symbols parse into intervals and voicings', () => {
  assert.deepEqual(parseChord('Fm7').intervals, [0, 3, 7, 10]);
  assert.equal(parseChord('Fm7').root, 5);
  assert.deepEqual(spell('C'), ['C3', 'E3', 'G3']);
  assert.deepEqual(spell('E5', { octave: 2, voicing: 'power' }), ['E2', 'B2', 'E3']);
  assert.deepEqual(spell('Cmaj7', { voicing: 'shell' }), ['C3', 'E3', 'B3']);
  assert.deepEqual(spell('Dm7', { voicing: 'spread' }), ['D2', 'F3', 'A3', 'C4']);
  assert.deepEqual(spell('C/E'), ['E2', 'C3', 'E3', 'G3']);
  assert.deepEqual(spell('G7#9', { voicing: 'top' }), ['B3', 'D4', 'F4', 'A#4']);
  assert.throws(() => parseChord('Cxyz'));
  assert.equal(transposeSymbol('Fm7', 2), 'Gm7');
  assert.equal(transposeSymbol('C/E', -1), 'B/D#');
  assert.equal(transposeSymbol('A2', 3), 'C3');
});

test('step strings ignore separators and reject bad lengths', () => {
  assert.equal(cleanSteps('x... x... | x... x...'), 'x...x...x...x...');
  assert.deepEqual(tokens('C2 . _ | F2'), ['C2', '.', '_', 'F2']);
  assert.throws(() => compilePiece({ bpm: 120, bars: 1, tracks: [{ id: 'k', inst: 'kick', steps: 'x...' }] }), /expected 16/);
});

test('swing delays the offbeat sixteenths, or eighths at unit 8', () => {
  assert.equal(swingOffset(0, 0.5), 0);
  assert.equal(swingOffset(1, 0.5), 0);
  assert.ok(Math.abs(swingOffset(1, 0.6) - 0.2) < 1e-9);
  assert.equal(swingOffset(2, 0.6), 0);
  assert.ok(Math.abs(swingOffset(2, 0.67, 8) - 0.68) < 1e-9);
  assert.equal(swingOffset(0, 0.67, 8), 0);
});

test('a piece compiles drums, notes, holds and progressions into events', () => {
  const piece = {
    bpm: 120,
    bars: 1,
    tracks: [
      { id: 'kick', inst: 'kick', steps: 'X...x...X...x...' },
      { id: 'hat', inst: 'hat', steps: 'x.o.x.x.x.o.x.-.' },
      { id: 'bass', inst: 'bassFinger', notes: 'C2 _ _ . G2 . . . C2 _ . . >E2 . . .', gate: 1 },
      { id: 'keys', inst: 'piano', prog: 'C G', rhythm: 'x_......x_......', octave: 4 },
    ],
  };
  const c = compilePiece(piece);
  assert.equal(c.totalSteps, 16);
  assert.ok(Math.abs(c.stepSeconds - 0.125) < 1e-9);
  assert.ok(Math.abs(c.loopSeconds - 2) < 1e-9);
  const kick = c.tracks[0].events;
  assert.deepEqual(kick.map((e) => e.step), [0, 4, 8, 12]);
  assert.equal(kick[0].velocity, 1);
  assert.equal(kick[1].velocity, 0.85);
  const hat = c.tracks[1].events;
  assert.equal(hat[1].variant, 'open');
  assert.equal(hat[hat.length - 1].velocity, 0.4);
  const bass = c.tracks[2].events;
  assert.deepEqual(bass.map((e) => e.step), [0, 4, 8, 12]);
  assert.equal(bass[0].duration, 3);
  assert.equal(bass[1].duration, 1);
  assert.equal(bass[3].velocity, 1);
  assert.deepEqual(bass[3].notes, [40]);
  const keys = c.tracks[3].events;
  assert.equal(keys.length, 2);
  assert.equal(keys[0].label, 'C');
  assert.equal(keys[1].label, 'G');
  assert.ok(Math.abs(keys[0].duration - 2 * 0.9) < 1e-9);
  assert.deepEqual(pitchRange(bass), { min: 36, max: 43 });
});
