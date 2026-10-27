// Metal: heavy metal (doom riff, gallop), thrash, death and black metal, nu metal.
// Four bars each: a riff, its repeat and an answer. Rhythm guitars are the
// double-tracked high-gain presets; the palm-muted preset is the chug.
const LEADG = { en: 'Lead guitar', zh: '主音吉他' };
const CRASH = { en: 'Crash', zh: '吊镲' };

export const METAL_PIECES = {
  'heavy-metal': [
    {
      title: { en: 'Doom riff', zh: '厄运 riff' },
      bpm: 84,
      bars: 4,
      kit: 'rock',
      master: { reverb: 'room', send: 0.14, humanize: 0.006 },
      tracks: [
        { id: 'kick', inst: 'kick', steps: 'x.....x.x....... x.....x.x.....x. x.....x.x....... x.....x.x..x..x.' },
        { id: 'snare', inst: 'snare', steps: '....X.......X... ....X.......X... ....X.......X... ....X.......X.xx' },
        { id: 'hat', inst: 'hat', steps: 'x.x.x.x.x.x.x.x. x.x.x.x.x.x.x.x. x.x.x.x.x.x.x.x. x.x.x.x.x.x.o.o.' },
        { id: 'crash', inst: 'crash', role: 'perc', name: CRASH, steps: 'x............... ................ x............... ................', level: 0.6 },
        { id: 'bass', inst: 'bassPick', notes: 'E2 _ _ _ _ _ G2 _ Bb2 _ _ _ A2 _ G2 _ | E2 _ _ _ _ _ G2 _ Bb2 _ _ _ B2 _ Bb2 _ | E2 _ _ _ _ _ G2 _ Bb2 _ _ _ A2 _ G2 _ | E2 _ _ _ D3 _ C3 _ B2 _ Bb2 _ A2 _ G2 _', gate: 0.9, fx: { drive: 0.15 } },
        { id: 'guitar', inst: 'guitarMetal', role: 'guitar', name: { en: 'Tritone riff', zh: '三全音 riff' }, chords: 'E5 _ _ _ _ _ G5 _ Bb5 _ _ _ A5 _ G5 _ | E5 _ _ _ _ _ G5 _ Bb5 _ _ _ B5 _ Bb5 _ | E5 _ _ _ _ _ G5 _ Bb5 _ _ _ A5 _ G5 _ | E5 _ _ _ D5 _ C5 _ B5 _ Bb5 _ A5 _ G5 _', octave: 2, voicing: 'power', gate: 0.85, fx: { ampTone: 'warm', amp: 0.8 } },
        { id: 'lead', inst: 'guitarLead', name: LEADG, notes: '. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . . | . . . . B4 _ _ _ D5 _ E5 _ _ _ _ _ | G5 _ _ _ E5 _ D5 _ Bb4 _ _ _ _ _ _ _', gate: 0.9, fx: { reverb: 0.25 } },
      ],
    },
    {
      title: { en: 'Gallop', zh: '马蹄节奏' },
      bpm: 170,
      bars: 4,
      kit: 'metal',
      master: { reverb: 'room', send: 0.1, humanize: 0.004 },
      tracks: [
        { id: 'kick', inst: 'kick', steps: 'x...x.x.x...x.x. x...x.x.x...x.x. x...x.x.x...x.x. x...x.x.x.x.x.x.' },
        { id: 'snare', inst: 'snare', steps: '....X.......X... ....X.......X... ....X.......X... ....X.......X.X.' },
        { id: 'hat', inst: 'hat', steps: 'x.x.x.x.x.x.x.x. x.x.x.x.x.x.x.x. x.x.x.x.x.x.x.x. x.x.x.x.x.x.x.x.', level: 0.7 },
        { id: 'bass', inst: 'bassPick', notes: 'E2 . E2 E2 E2 . E2 E2 E2 . E2 E2 E2 . E2 E2 | E2 . E2 E2 E2 . E2 E2 E2 . E2 E2 E2 . E2 E2 | G2 . G2 G2 G2 . G2 G2 A2 . A2 A2 A2 . A2 A2 | C3 . C3 C3 C3 . C3 C3 D3 . D3 D3 B2 . B2 B2', gate: 0.55, fx: { drive: 0.15 } },
        { id: 'guitar', inst: 'guitarChug', role: 'guitar', name: { en: 'Gallop riff', zh: '马蹄 riff' }, chords: 'E5 . E5 E5 E5 . E5 E5 E5 . E5 E5 E5 . E5 E5 | E5 . E5 E5 E5 . E5 E5 E5 . E5 E5 E5 . E5 E5 | G5 . G5 G5 G5 . G5 G5 A5 . A5 A5 A5 . A5 A5 | C5 . C5 C5 C5 . C5 C5 D5 . D5 D5 B5 . B5 B5', octave: 2, voicing: 'power', gate: 0.6, fx: { ampTone: 'warm' } },
        { id: 'lead', inst: 'guitarLead', name: { en: 'Twin lead', zh: '双主音吉他' }, notes: '. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . . | E5 _ _ _ G5 _ A5 _ B5 _ _ _ A5 _ G5 _ | A5 _ _ _ G5 _ E5 _ D5 _ _ _ E5 _ _ _', gate: 0.9, fx: { pan: -0.4, reverb: 0.2 } },
        { id: 'harmony', inst: 'guitarLead', role: 'lead', name: { en: 'Harmony guitar', zh: '和声吉他' }, notes: '. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . . | G5 _ _ _ B5 _ C6 _ D6 _ _ _ C6 _ B5 _ | C6 _ _ _ B5 _ G5 _ F#5 _ _ _ G5 _ _ _', gate: 0.9, level: 0.8, fx: { pan: 0.4, reverb: 0.2 } },
      ],
    },
  ],
  thrash: {
    bpm: 188,
    bars: 4,
    kit: 'metal',
    master: { reverb: 'room', send: 0.08, humanize: 0.004 },
    tracks: [
      { id: 'kick', inst: 'kick', name: { en: 'Double kick', zh: '双底鼓' }, steps: 'x.xxx.xxx.xxx.xx x.xxx.xxx.xxx.xx x.xxx.xxx.xxx.xx xxxxxxxxxxxxxxxx' },
      { id: 'snare', inst: 'snare', steps: '....X.......X... ....X.......X... ....X.......X... ....X.......X.XX' },
      { id: 'hat', inst: 'hat', steps: 'x.x.x.x.x.x.x.x. x.x.x.x.x.x.x.x. x.x.x.x.x.x.x.x. x.x.x.x.x.x.x.x.', level: 0.7 },
      { id: 'crash', inst: 'crash', role: 'perc', name: CRASH, steps: 'x............... ................ x............... ................', level: 0.5 },
      { id: 'bass', inst: 'bassPick', notes: 'E2 E2 E2 E2 E2 E2 G2 F2 E2 E2 E2 E2 Bb2 A2 E2 E2 | E2 E2 E2 E2 E2 E2 G2 F2 E2 E2 E2 E2 F2 E2 Eb2 E2 | E2 E2 E2 E2 E2 E2 G2 F2 E2 E2 E2 E2 Bb2 A2 E2 E2 | E2 E2 G2 G2 A2 A2 Bb2 Bb2 B2 B2 Bb2 Bb2 A2 A2 G2 G2', gate: 0.5, fx: { drive: 0.2 } },
      { id: 'guitar', inst: 'guitarChug', role: 'guitar', name: { en: 'Palm-muted riff', zh: '闷音 riff' }, chords: 'E5 E5 E5 E5 E5 E5 G5 F5 E5 E5 E5 E5 Bb5 A5 E5 E5 | E5 E5 E5 E5 E5 E5 G5 F5 E5 E5 E5 E5 F5 E5 Eb5 E5 | E5 E5 E5 E5 E5 E5 G5 F5 E5 E5 E5 E5 Bb5 A5 E5 E5 | E5 E5 G5 G5 A5 A5 Bb5 Bb5 B5 B5 Bb5 Bb5 A5 A5 G5 G5', octave: 2, voicing: 'power', gate: 0.45 },
      { id: 'open', inst: 'guitarMetal', role: 'guitar', name: { en: 'Open chords', zh: '开放和弦' }, chords: '. . . . . . G5 _ . . . . Bb5 _ . . | . . . . . . G5 _ . . . . F5 _ Eb5 E5 | . . . . . . G5 _ . . . . Bb5 _ . . | E5 _ G5 _ A5 _ Bb5 _ B5 _ Bb5 _ A5 _ G5 _', octave: 2, voicing: 'power', gate: 0.7, level: 0.8 },
      { id: 'lead', inst: 'guitarLead', name: LEADG, notes: '. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . . | . . . . . . . . E6 _ D#6 _ E6 _ B5 _ | C6 _ B5 _ A5 _ G5 _ F5 _ E5 _ _ _ _ _', gate: 0.9, fx: { reverb: 0.2 } },
    ],
  },
  'extreme-metal': [
    {
      title: { en: 'Death metal', zh: '死亡金属' },
      bpm: 196,
      bars: 4,
      kit: 'metal',
      master: { reverb: 'room', send: 0.1, humanize: 0.003 },
      tracks: [
        { id: 'kick', inst: 'kick', name: { en: 'Blast and double kick', zh: 'Blast 与双底鼓' }, steps: 'x.x.x.x.x.x.x.x. x.x.x.x.x.x.x.x. xxxxxxxxxxxxxxxx xxxxxxxxxxxxxxxx' },
        { id: 'snare', inst: 'snare', steps: '.x.x.x.x.x.x.x.x .x.x.x.x.x.x.x.x ........X....... ........X.....xx', level: 0.9 },
        { id: 'ride', inst: 'ride', role: 'hat', name: { en: 'Ride', zh: '叠音镲' }, steps: 'x.x.x.x.x.x.x.x. x.x.x.x.x.x.x.x. ................ ................', level: 0.5 },
        { id: 'crash', inst: 'crash', role: 'perc', name: CRASH, steps: 'x............... ................ x.......x....... x.......x.......', level: 0.5 },
        { id: 'bass', inst: 'bassPick', notes: 'D2 . D2 . D2 . D2 . Eb2 . Eb2 . Eb2 . Eb2 . | D2 . D2 . D2 . D2 . Ab2 . Ab2 . G2 . G2 . | D2 D2 . D2 D2 . D2 . Ab2 . D2 D2 . D2 Eb2 . | D2 D2 . D2 D2 . D2 . G2 _ Gb2 _ F2 _ E2 _', gate: 0.6, fx: { drive: 0.3 } },
        { id: 'tremolo', inst: 'guitarMetal', role: 'guitar', name: { en: 'Tremolo riff', zh: '轮拨 riff' }, notes: 'D4 D4 D4 D4 D4 D4 D4 D4 Eb4 Eb4 Eb4 Eb4 Eb4 Eb4 Eb4 Eb4 | D4 D4 D4 D4 D4 D4 D4 D4 Ab4 Ab4 Ab4 Ab4 G4 G4 G4 G4 | . . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .', gate: 0.7 },
        { id: 'chug', inst: 'guitarChug', role: 'guitar', name: { en: 'Chug', zh: '闷音重击' }, chords: '. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . . | D5 D5 . D5 D5 . D5 . Ab5 . D5 D5 . D5 Eb5 . | D5 D5 . D5 D5 . D5 . G5 _ Gb5 _ F5 _ E5 _', octave: 2, voicing: 'power', gate: 0.5 },
        { id: 'growl', inst: 'voiceShout', role: 'vocal', name: { en: 'Growl', zh: '死腔' }, notes: 'D3 . D3 . D3 _ . . D3 . D3 _ . . . . | D3 . D3 . D3 _ . . C3 . C3 _ . . . . | . . . . . . . . D3 _ . . . . D3 _ | . . . . . . . . G2 _ _ _ F2 _ _ _', gate: 0.6, level: 0.9, fx: { drive: 0.8, lowpass: 1400, highpass: 110 } },
      ],
    },
    {
      title: { en: 'Black metal', zh: '黑金属' },
      bpm: 190,
      bars: 4,
      kit: 'metal',
      master: { reverb: 'cave', send: 0.3, humanize: 0.004 },
      tracks: [
        { id: 'kick', inst: 'kick', name: { en: 'Blast beat', zh: 'Blast beat' }, steps: 'x.x.x.x.x.x.x.x. x.x.x.x.x.x.x.x. x.x.x.x.x.x.x.x. x.x.x.x.x.x.x.x.' },
        { id: 'snare', inst: 'snare', steps: '.x.x.x.x.x.x.x.x .x.x.x.x.x.x.x.x .x.x.x.x.x.x.x.x .x.x.x.x.x.x.x.x', level: 0.85 },
        { id: 'hat', inst: 'hat', steps: 'x.x.x.x.x.x.x.x. x.x.x.x.x.x.x.x. x.x.x.x.x.x.x.x. x.x.x.x.x.x.x.x.', level: 0.45 },
        { id: 'crash', inst: 'crash', role: 'perc', name: CRASH, steps: 'x............... ................ x............... ................', level: 0.5 },
        { id: 'bass', inst: 'bassPick', notes: 'E2 . . . E2 . . . E2 . . . E2 . . . | C2 . . . C2 . . . C2 . . . C2 . . . | E2 . . . E2 . . . E2 . . . E2 . . . | D2 . . . D2 . . . B1 . . . B1 . . .', gate: 0.7, level: 0.7, fx: { drive: 0.2 } },
        { id: 'tremolo', inst: 'guitarMetal', role: 'guitar', name: { en: 'Tremolo chords', zh: '轮拨和弦' }, chords: 'Em Em Em Em Em Em Em Em Em Em Em Em Em Em Em Em | C C C C C C C C C C C C C C C C | Em Em Em Em Em Em Em Em Em Em Em Em Em Em Em Em | D D D D D D D D Bm Bm Bm Bm Bm Bm Bm Bm', octave: 3, voicing: 'close', gate: 0.5, fx: { amp: 0.8, highpass: 350, lowpass: 3600, reverb: 0.3 } },
        { id: 'synth', inst: 'strings', role: 'strings', name: { en: 'Cold strings', zh: '冰冷弦乐' }, prog: 'Em C Em D', rhythm: 'x_______________ x_______________ x_______________ x_______________', octave: 4, voicing: 'close', gate: 1, level: 0.45, fx: { reverb: 0.6 } },
        { id: 'shriek', inst: 'voiceShout', role: 'vocal', name: { en: 'Shriek', zh: '黑嗓' }, notes: '. . . . B4 _ _ _ _ _ _ _ _ _ _ _ | C5 _ _ _ _ _ _ _ B4 _ _ _ _ _ _ _ | . . . . E5 _ _ _ _ _ _ _ D5 _ _ _ | B4 _ _ _ _ _ _ _ _ _ _ _ _ _ _ _', gate: 0.9, level: 0.7, fx: { drive: 0.7, highpass: 500, reverb: 0.5 } },
      ],
    },
  ],
  'nu-metal': {
    bpm: 96,
    bars: 4,
    kit: 'rock',
    master: { reverb: 'room', send: 0.1, humanize: 0.005 },
    tracks: [
      { id: 'kick', inst: 'kick', steps: 'x..x..x...x.x... x..x..x...x..... x..x..x...x.x... x..x..x...x.x.x.' },
      { id: 'snare', inst: 'snare', steps: '....X.......X... ....X.......X... ....X.......X... ....X.......X.x.' },
      { id: 'hat', inst: 'hat', steps: 'x.x.x.x.x.x.x.x. x.x.x.x.x.x.x.x. x.x.x.x.x.x.x.x. x.x.x.x.x.x.o.o.', level: 0.7 },
      { id: 'bass', inst: 'bassSlap', notes: '. . . . . . . A2 . A2 . . . . A2 . | . . . . . . . A2 . C3 . . . . G2 . | . . . . . . . A2 . A2 . . . . A2 . | . . . . . . . A2 . C3 . . G2 . Bb2 .', gate: 0.7, fx: { drive: 0.2 } },
      { id: 'guitar', inst: 'guitarChug', role: 'guitar', name: { en: 'Seven-string', zh: '七弦吉他' }, chords: 'A5 _ _ A5 _ _ A5 . . . A5 _ A5 . . . | A5 _ _ A5 _ _ A5 . . . A5 _ A5 C5 . G5 | A5 _ _ A5 _ _ A5 . . . A5 _ A5 . . . | A5 _ _ A5 _ _ A5 . C5 _ . . G5 _ Bb5 .', octave: 2, voicing: 'power', gate: 0.6, transpose: -5 },
      { id: 'scratch', inst: 'stab', role: 'texture', name: { en: 'Scratch stab', zh: '搓碟 stab' }, notes: '. . . . . . A5 . . . . . . . . . | . . . . . . A5 . A5 . . . . . . . | . . . . . . A5 . . . . . . . . . | . . . . . . A5 . A5 . . . A5 . . .', gate: 0.3, level: 0.6, fx: { crush: 6 } },
      { id: 'lead', inst: 'voiceShout', name: { en: 'Rap to chorus', zh: '说唱到副歌' }, notes: 'A3 . A3 . A3 A3 . A3 . . A3 . A3 . . . | A3 . A3 . A3 A3 . A3 . . C4 . A3 . . . | E4 _ _ _ G4 _ E4 _ C4 _ _ _ . . . . | D4 _ E4 _ G4 _ _ _ E4 _ _ _ _ _ _ _', gate: 0.8, fx: { drive: 0.5 } },
    ],
  },
};
