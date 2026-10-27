// Country and folk: country, folk, bluegrass, singer-songwriter, outlaw, country pop, alt-country (with Americana), indie folk.
// Four bars each: the figure in bars 1-2, the answer in bars 3-4. Acoustic kits and modelled instruments throughout.
const FIDDLE = { en: 'Fiddle', zh: '小提琴' };
const BRUSHES = { en: 'Brushes', zh: '鼓刷' };
const STEEL = { en: 'Pedal steel', zh: '踏板钢棒吉他' };
const VOICE = { en: 'Voice', zh: '人声' };
const HARMONICA = { en: 'Harmonica', zh: '口琴' };
const PICKING = { en: 'Fingerpicking', zh: '指弹' };

export const COUNTRY_PIECES = {
  country: {
    bpm: 112,
    bars: 4,
    kit: 'brush',
    master: { reverb: 'room', send: 0.15, humanize: 0.01 },
    tracks: [
      { id: 'kick', inst: 'kick', steps: 'x...x...x...x... x...x...x...x... x...x...x...x... x...x...x...x...', level: 0.7 },
      { id: 'snare', inst: 'snare', name: { en: 'Train beat', zh: '火车节奏' }, steps: 'x.-.X.x.x.-.X.x. x.-.X.x.x.-.X.x. x.-.X.x.x.-.X.x. x.-.X.x.x.-.X.xx', level: 0.45 },
      { id: 'bass', inst: 'bassUpright', notes: 'G2 . . . D3 . . . G2 . . . D3 . . . | C3 . . . G2 . . . C3 . . . G2 . . . | G2 . . . D3 . . . G2 . . . D3 . . . | D2 . . . A2 . . . D2 . . . E2 . F#2 .', gate: 0.8 },
      { id: 'boom', inst: 'guitarSteel', role: 'bass', name: { en: 'Boom', zh: '低音拨弦' }, notes: 'G2 . . . . . . . D3 . . . . . . . | C3 . . . . . . . G2 . . . . . . . | G2 . . . . . . . D3 . . . . . . . | D3 . . . . . . . A2 . . . . . . .', gate: 0.9, level: 1.2 },
      { id: 'chick', inst: 'guitarSteel', role: 'guitar', name: { en: 'Chick strum', zh: '扫弦' }, prog: 'G C G D', rhythm: '....x.......x... ....x.......x... ....x.......x... ....x.......x.x.', octave: 3, gate: 0.6, level: 1.2 },
      { id: 'fiddle', inst: 'fiddle', role: 'lead', name: FIDDLE, notes: 'G4 _ A4 _ B4 _ D5 _ B4 _ _ _ A4 _ G4 _ | E5 _ _ _ C5 _ E5 _ D5 _ _ _ _ _ _ _ | . . . . . . . . . . . . . . . . | F#4 _ A4 _ D5 _ C5 _ A4 _ _ _ F#4 _ _ _', gate: 0.95, level: 1.1 },
      { id: 'steel', inst: 'steelGuitar', role: 'lead', name: STEEL, notes: '. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . . | B4 _ _ _ D5 _ _ _ _ _ _ _ G4 _ _ _ | . . . . . . . . A4 _ _ _ _ _ _ _', gate: 1, level: 1.2, fx: { reverb: 0.3 } },
    ],
  },
  folk: {
    bpm: 92,
    bars: 4,
    noDrums: true,
    master: { reverb: 'room', send: 0.2, humanize: 0.012 },
    tracks: [
      { id: 'thumb', inst: 'guitarSteel', role: 'bass', name: { en: 'Thumb bass', zh: '拇指低音' }, notes: 'C3 . . . G2 . . . C3 . . . G2 . . . | A2 . . . E3 . . . A2 . . . E3 . . . | F2 . . . C3 . . . F2 . . . C3 . . . | G2 . . . D3 . . . G2 . . . B2 . D3 .', gate: 1.2, level: 1 },
      { id: 'pick', inst: 'guitarSteel', role: 'guitar', name: PICKING, notes: '. . E4 . . . G3 . . . C4 . . . E4 . | . . C4 . . . E3 . . . A3 . . . C4 . | . . A3 . . . C3 . . . F3 . . . A3 . | . . B3 . . . D3 . . . G3 . . . B3 .', gate: 1.3, level: 1.2 },
      { id: 'second', inst: 'guitarSteel', role: 'guitar', name: { en: 'Second guitar', zh: '第二把吉他' }, prog: 'C Am F G', rhythm: '......x......... ......x......... ....x.....x..... ....x.....x...x.', octave: 3, gate: 1, level: 0.6 },
      { id: 'harmonica', inst: 'harmonica', role: 'lead', name: HARMONICA, notes: 'E4 _ G4 _ _ _ E4 _ D4 _ _ _ C4 _ _ _ | . . E4 _ C4 _ A3 _ B3 _ _ _ _ _ _ _ | A4 _ _ _ F4 _ A4 _ G4 _ _ _ _ _ _ _ | B3 _ D4 _ G4 _ _ _ D4 _ B3 _ C4 _ _ _', gate: 0.95, level: 0.6 },
    ],
  },
  bluegrass: {
    bpm: 160,
    bars: 4,
    noDrums: true,
    master: { reverb: 'room', send: 0.12, humanize: 0.006 },
    tracks: [
      { id: 'bass', inst: 'bassUpright', notes: 'G2 . . . D3 . . . G2 . . . D3 . . . | C3 . . . G2 . . . C3 . . . G2 . . . | G2 . . . D3 . . . G2 . . . D3 . . . | D2 . . . A2 . . . D2 . . . E2 . F#2 .', gate: 0.7, level: 0.9 },
      { id: 'mandolin', inst: 'mandolin', role: 'chords', name: { en: 'Mandolin chop', zh: '曼陀林切音' }, prog: 'G C G D', rhythm: '....x.......x... ....x.......x... ....x.......x... ....x.......x.x.', octave: 4, voicing: 'close', gate: 0.3 },
      { id: 'banjo', inst: 'banjo', role: 'guitar', name: { en: 'Banjo roll', zh: '班卓琴滚奏' }, notes: 'G3 B3 D4 G4 B3 D4 G4 G3 B3 D4 G4 B3 D4 G4 B3 D4 | C4 E4 G4 C4 E4 G4 C4 E4 G4 C4 E4 G4 C4 E4 G4 E4 | G3 B3 D4 G4 B3 D4 G4 G3 B3 D4 G4 B3 D4 G4 B3 D4 | D4 F#4 A4 D4 F#4 A4 D4 F#4 A4 D5 A4 F#4 D4 C4 B3 A3', gate: 1 },
      { id: 'fiddle', inst: 'fiddle', role: 'lead', name: FIDDLE, notes: '. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . . | B4 _ D5 _ G5 _ _ _ F#5 _ D5 _ B4 _ _ _ | A4 _ D5 _ F#5 _ E5 _ D5 _ _ _ A4 _ _ _', gate: 0.95 },
    ],
  },
  'singer-songwriter': {
    bpm: 76,
    bars: 4,
    kit: 'brush',
    master: { reverb: 'room', send: 0.22, humanize: 0.012 },
    tracks: [
      { id: 'kick', inst: 'kick', steps: 'x.......x....... x.......x....... x.......x....... x.......x.......', level: 0.75 },
      { id: 'snare', inst: 'snare', name: BRUSHES, steps: '....x.......x... ....x.......x... ....x.......x... ....x.....-.x..-', level: 0.6 },
      { id: 'bass', inst: 'bassFinger', notes: 'C2 . . . . . . . . . . . . . . . | G2 . . . . . . . . . . . . . . . | A1 . . . . . . . . . . . . . . . | F2 . . . . . . . G2 . . . . . . .', gate: 0.95, level: 1.2 },
      { id: 'piano', inst: 'piano', role: 'keys', notes: 'C3 . E3 . G3 . C4 . E4 . C4 . G3 . E3 . | B2 . D3 . G3 . B3 . D4 . B3 . G3 . D3 . | A2 . C3 . E3 . A3 . C4 . A3 . E3 . C3 . | F2 . A2 . C3 . F3 . G2 . B2 . D3 . G3 .', gate: 1.4, level: 0.85 },
      { id: 'lead', inst: 'voice', name: VOICE, notes: 'E4 _ _ _ G4 _ E4 _ D4 _ _ _ _ _ _ _ | D4 _ _ _ B3 _ D4 _ G4 _ _ _ _ _ _ _ | C4 _ _ _ E4 _ A4 _ G4 _ _ _ E4 _ _ _ | F4 _ _ _ E4 _ D4 _ D4 _ _ _ _ _ _ _', gate: 0.95 },
    ],
  },
  'outlaw-country': {
    bpm: 100,
    bars: 4,
    kit: 'acoustic',
    master: { reverb: 'room', send: 0.12, humanize: 0.01 },
    tracks: [
      { id: 'kick', inst: 'kick', steps: 'x.......x....... x.......x....... x.......x....... x.......x.....x.' },
      { id: 'snare', inst: 'snare', steps: '....x.......x... ....x.......x... ....x.......x... ....x.......x.xx' },
      { id: 'hat', inst: 'hat', steps: 'x.x.x.x.x.x.x.x. x.x.x.x.x.x.x.x. x.x.x.x.x.x.x.x. x.x.x.x.x.x.x.o.', level: 0.6 },
      { id: 'bass', inst: 'bassFinger', notes: 'A2 . . . . . . . E2 . . . . . . . | A2 . . . . . . . E2 . . . . . C#2 . | D2 . . . . . . . A2 . . . . . . . | E2 . . . . . . . B2 . . . E2 . G#2 .', gate: 0.9 },
      { id: 'guitar', inst: 'guitarCrunch', role: 'guitar', name: { en: 'Telecaster', zh: 'Telecaster 吉他' }, notes: 'A3 . C#4 . E4 . A3 . A3 . C#4 . E4 . G4 . | A3 . C#4 . E4 . C#4 . A3 . E4 . C#4 . A3 . | D4 . F#4 . A4 . D4 . D4 . F#4 . A4 . C5 . | E4 . G#4 . B4 . E4 . E4 . D4 . C#4 . B3 .', gate: 0.5, level: 1.15 },
      { id: 'steel', inst: 'steelGuitar', role: 'guitar', name: STEEL, notes: '. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . . | F#4 _ _ _ _ _ _ _ A4 _ _ _ _ _ _ _ | G#4 _ _ _ _ _ _ _ B4 _ _ _ _ _ _ _', gate: 1, level: 1.2, fx: { reverb: 0.35 } },
      { id: 'lead', inst: 'harmonica', name: HARMONICA, notes: '. . . . E4 _ G4 _ A4 _ _ _ G4 _ E4 _ | D4 _ _ _ E4 _ D4 _ C#4 _ _ _ A3 _ _ _ | F#4 _ A4 _ _ _ F#4 _ D4 _ _ _ . . . . | E4 _ G#4 _ B4 _ _ _ G#4 _ E4 _ _ _ _ _', gate: 0.95 },
    ],
  },
  'country-pop': {
    bpm: 120,
    bars: 4,
    kit: 'rock',
    master: { reverb: 'hall', send: 0.2, humanize: 0.005 },
    tracks: [
      { id: 'kick', inst: 'kick', steps: 'x...x...x...x... x...x...x...x... x...x...x..x..x. x...x...x..x..x.', level: 0.75 },
      { id: 'snare', inst: 'snare', steps: '....X.......X... ....X.......X... ....X.......X... ....X.......X.XX' },
      { id: 'hat', inst: 'hat', steps: 'x.x.x.x.x.x.x.x. x.x.x.x.x.x.x.o. x.x.x.x.x.x.x.x. x.x.x.x.x.x.x.x.', level: 0.7 },
      { id: 'crash', inst: 'crash', role: 'perc', name: { en: 'Crash', zh: '吊镲' }, steps: '................ ................ x............... ................', level: 0.6 },
      { id: 'bass', inst: 'bassPick', notes: 'D2 . . . D2 . . . D2 . . . D2 . . . | G2 . . . G2 . . . G2 . . . G2 . . . | B1 . B1 . B1 . B1 . B1 . B1 . B1 . B1 . | A1 . A1 . A1 . A1 . A1 . A1 . A1 . A1 .', gate: 0.9 },
      { id: 'acoustic', inst: 'guitarSteel', role: 'guitar', name: { en: 'Acoustic strum', zh: '木吉他扫弦' }, prog: 'D G Bm A', rhythm: 'x.x.X.x.x.x.X.x. x.x.X.x.x.x.X.x. x.x.X.x.x.x.X.x. x.x.X.x.x.x.X.x.', octave: 3, gate: 0.6, level: 1 },
      { id: 'electric', inst: 'guitarCrunch', role: 'guitar', name: { en: 'Electric', zh: '电吉他' }, prog: 'D5 G5 B5 A5', rhythm: 'x_______x_______ x_______x_______ x.x.x.x.x.x.x.x. x.x.x.x.x.x.x.x.', octave: 3, voicing: 'power', gate: 0.9, level: 0.8 },
      { id: 'steel', inst: 'steelGuitar', role: 'guitar', name: STEEL, notes: 'F#4 _ _ _ _ _ _ _ _ _ _ _ A4 _ _ _ | G4 _ _ _ _ _ _ _ _ _ _ _ B4 _ _ _ | D5 _ _ _ _ _ _ _ _ _ _ _ F#5 _ _ _ | E5 _ _ _ _ _ _ _ C#5 _ _ _ _ _ _ _', gate: 1, level: 1.2, fx: { reverb: 0.4 } },
      { id: 'choir', inst: 'choir', role: 'pad', name: { en: 'Backing vocals', zh: '和声' }, prog: 'D G Bm A', rhythm: '................ ................ x_______________ x_______________', octave: 4, voicing: 'top', gate: 1, level: 0.5, fx: { reverb: 0.4 } },
      { id: 'lead', inst: 'voice', name: VOICE, notes: 'A4 _ _ _ F#4 _ A4 _ B4 _ _ _ A4 _ _ _ | D5 _ _ _ B4 _ A4 _ G4 _ _ _ . . . . | D5 _ _ _ F#5 _ D5 _ E5 _ _ _ _ _ _ _ | C#5 _ _ _ E5 _ C#5 _ A4 _ _ _ _ _ _ _', gate: 0.95 },
    ],
  },
  'alt-country': [
    {
      title: { en: 'Alt-country', zh: '另类乡村' },
      bpm: 92,
      bars: 4,
      kit: 'acoustic',
      master: { reverb: 'room', send: 0.2, humanize: 0.02 },
      tracks: [
        { id: 'kick', inst: 'kick', steps: 'x.......x..x.... x.......x....... x.......x..x.... x.......x.......' },
        { id: 'snare', inst: 'snare', steps: '....x.......x... ....x.......x.-. ....x.......x... ....x.....-.x.-.' },
        { id: 'hat', inst: 'hat', steps: 'x.x.x.x.x.x.x.x. x.x.x.x.x.x.x.o. x.x.x.x.x.x.x.x. x.x.x.x.x.x.x.o.', level: 0.6 },
        { id: 'bass', inst: 'bassFinger', notes: 'G2 . . . . . . . G2 . . . . . . . | E2 . . . . . . . E2 . . . . . . . | C2 . . . . . . . C2 . . . . . . . | D2 . . . . . . . D2 . . . . . F#2 .', gate: 0.95 },
        { id: 'guitar', inst: 'guitarCrunch', role: 'guitar', prog: 'G Em C D', rhythm: 'x.x.x.x.x.x.x.x. x.x.x.x.x.x.x.x. x.x.x.x.x.x.x.x. x.x.x.x.x.x.x.x.', octave: 3, gate: 0.7, level: 0.7, fx: { drive: 0.15 } },
        { id: 'steel', inst: 'steelGuitar', role: 'guitar', name: STEEL, notes: 'B4 _ _ _ _ _ _ _ _ _ _ _ G4 _ _ _ | E4 _ _ _ _ _ _ _ G4 _ _ _ _ _ _ _ | G4 _ _ _ _ _ _ _ E5 _ _ _ _ _ _ _ | F#5 _ _ _ _ _ _ _ A4 _ _ _ _ _ _ _', gate: 1, level: 1.2, fx: { reverb: 0.4 } },
        { id: 'lead', inst: 'voice', name: VOICE, notes: 'D4 _ _ _ B3 _ _ _ _ _ _ _ D4 _ E4 _ | G4 _ _ _ E4 _ D4 _ _ _ _ _ _ _ _ _ | E4 _ _ _ G4 _ E4 _ C4 _ _ _ _ _ _ _ | D4 _ _ _ A3 _ _ _ _ _ _ _ _ _ _ _', gate: 0.95 },
      ],
    },
    {
      title: { en: 'Americana', zh: 'Americana' },
      bpm: 84,
      bars: 4,
      kit: 'brush',
      master: { reverb: 'room', send: 0.22, humanize: 0.015 },
      tracks: [
        { id: 'kick', inst: 'kick', steps: 'x.......x....... x.......x....... x.......x....... x.......x.......', level: 0.6 },
        { id: 'snare', inst: 'snare', name: BRUSHES, steps: '-.-.x.-.-.-.x.-. -.-.x.-.-.-.x.-. -.-.x.-.-.-.x.-. -.-.x.-.-.-.x.-x', level: 0.45 },
        { id: 'bass', inst: 'bassUpright', notes: 'D2 . . . . . . . A2 . . . . . . . | G2 . . . . . . . D3 . . . . . . . | B1 . . . . . . . F#2 . . . . . . . | A1 . . . . . . . E2 . . . . . . .', gate: 0.8 },
        { id: 'pick', inst: 'guitarSteel', role: 'guitar', name: PICKING, notes: 'D3 . A3 . F#4 . A3 . D4 . A3 . F#4 . A3 . | G2 . D3 . B3 . D3 . G3 . D3 . B3 . D3 . | B2 . F#3 . D4 . F#3 . B3 . F#3 . D4 . F#3 . | A2 . E3 . C#4 . E3 . A3 . E3 . C#4 . E3 .', gate: 1.3, level: 1.2 },
        { id: 'mandolin', inst: 'mandolin', role: 'lead', name: { en: 'Mandolin tremolo', zh: '曼陀林轮奏' }, notes: '. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . . | D5 D5 D5 D5 D5 D5 D5 D5 F#5 F#5 F#5 F#5 F#5 F#5 F#5 F#5 | E5 E5 E5 E5 E5 E5 E5 E5 C#5 C#5 C#5 C#5 C#5 C#5 C#5 C#5', gate: 0.5, level: 1 },
        { id: 'lead', inst: 'voice', name: VOICE, notes: 'F#4 _ _ _ A4 _ F#4 _ E4 _ _ _ D4 _ _ _ | D4 _ _ _ B3 _ D4 _ G4 _ _ _ _ _ _ _ | D4 _ _ _ F#4 _ _ _ _ _ _ _ _ _ _ _ | E4 _ _ _ C#4 _ _ _ _ _ _ _ _ _ _ _', gate: 0.95, level: 0.9 },
      ],
    },
  ],
  'indie-folk': {
    bpm: 108,
    bars: 4,
    kit: 'acoustic',
    master: { reverb: 'hall', send: 0.3, humanize: 0.012 },
    tracks: [
      { id: 'kick', inst: 'kick', name: { en: 'Stomp', zh: '跺脚' }, steps: 'x...x...x...x... x...x...x...x... x...x...x...x... x...x...x...x...', level: 0.6 },
      { id: 'clap', inst: 'clap', name: { en: 'Claps', zh: '拍手' }, steps: '................ ................ ....x.......x... ....x.......x...', level: 1 },
      { id: 'tamb', inst: 'tambourine', role: 'perc', steps: '................ ................ x.x.x.x.x.x.x.x. x.x.x.x.x.x.x.x.', level: 0.8 },
      { id: 'bass', inst: 'bassFinger', notes: 'C2 . . . . . . . . . . . . . . . | A1 . . . . . . . . . . . . . . . | F2 . . . . . . . F2 . . . . . . . | G2 . . . . . . . G2 . . . G2 . G2 .', gate: 1 },
      { id: 'pick', inst: 'guitarSteel', role: 'guitar', name: PICKING, notes: 'C3 G3 E4 G3 C4 G3 E4 G3 C3 G3 E4 G3 C4 G3 E4 G3 | A2 E3 C4 E3 A3 E3 C4 E3 A2 E3 C4 E3 A3 E3 C4 E3 | F2 C3 A3 C3 F3 C3 A3 C3 F2 C3 A3 C3 F3 C3 A3 C3 | G2 D3 B3 D3 G3 D3 B3 D3 G2 D3 B3 D3 G3 D3 B3 D3', gate: 1.2, level: 1.2 },
      { id: 'banjo', inst: 'banjo', role: 'guitar', notes: '. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . . | C4 F4 A4 C4 F4 A4 C4 F4 A4 C4 F4 A4 C4 F4 A4 F4 | D4 G4 B4 D4 G4 B4 D4 G4 B4 D4 G4 B4 D4 G4 B4 G4', gate: 1, level: 1 },
      { id: 'choir', inst: 'choir', role: 'pad', name: { en: 'Choir', zh: '合唱' }, prog: 'C Am F G', rhythm: '................ ................ x_______________ x_______________', octave: 4, voicing: 'top', gate: 1, level: 0.6, fx: { reverb: 0.5 } },
      { id: 'lead', inst: 'voice', name: VOICE, notes: 'G4 _ _ _ E4 _ G4 _ C5 _ _ _ _ _ _ _ | A4 _ _ _ C5 _ A4 _ G4 _ _ _ _ _ _ _ | A4 _ _ _ C5 _ _ _ A4 _ G4 _ F4 _ _ _ | G4 _ _ _ _ _ E4 _ D4 _ _ _ _ _ _ _', gate: 0.95 },
    ],
  },
};
