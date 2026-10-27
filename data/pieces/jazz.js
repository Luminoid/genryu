// Jazz: swing, bebop, cool, hard bop, modal, free, fusion.
// Four bars each: the idea in bars 1-2, the answer in bars 3-4.
const RIDE = { en: 'Ride', zh: '叠音镲' };
const BRUSHES = { en: 'Brushes', zh: '鼓刷' };
const TRUMPET = { en: 'Trumpet', zh: '小号' };
const WALKING = { en: 'Walking bass', zh: '行走贝斯' };
const FEATHERED = { en: 'Feathered kick', zh: '轻踩底鼓' };
const COMPING = { en: 'Snare comping', zh: '军鼓伴奏' };
const HARD_BOP_LINE = 'C5 _ Eb5 _ C5 _ _ _ Ab4 _ _ _ F4 _ _ _ | Bb4 _ Db5 _ Bb4 _ _ _ Ab4 _ F4 _ _ _ _ _ | . . . . C5 _ Eb5 _ C5 _ A4 _ F#4 _ _ _ | G4 _ Bb4 _ G4 _ . . E4 _ _ _ . . . .';

export const JAZZ_PIECES = {
  swing: {
    bpm: 176,
    bars: 4,
    swing: 0.66,
    swingUnit: 8,
    kit: 'brush',
    master: { reverb: 'room', send: 0.15, humanize: 0.008 },
    tracks: [
      { id: 'kick', inst: 'kick', name: FEATHERED, steps: '-...-...-...-... -...-...-...-... -...-...-...-... -...-...-...-...', level: 0.6 },
      { id: 'snare', inst: 'snare', name: BRUSHES, steps: '................ ..........x..... ................ ......x...x...x.', level: 0.7 },
      { id: 'hat', inst: 'hat', steps: '....x.......x... ....x.......x... ....x.......x... ....x.......x...' },
      { id: 'ride', inst: 'ride', name: RIDE, steps: 'x...x.x.x...x.x. x...x.x.x...x.x. x...x.x.x...x.x. x...x.x.x...x.x.' },
      { id: 'bass', inst: 'bassUpright', name: WALKING, notes: 'Bb1 . . . D2 . . . F2 . . . G2 . . . | Eb2 . . . G2 . . . Bb2 . . . A2 . . . | Bb2 . . . F2 . . . G2 . . . B2 . . . | C2 . . . Eb2 . . . F2 . . . A1 . . .', gate: 0.8 },
      { id: 'piano', inst: 'piano', role: 'keys', prog: 'Bb6 Bb6 Eb9 Eb9 Bb6 G7 Cm7 F7', change: 8, rhythm: '..x...x.....x... x.....x...x..... ..x.......x..... x...x.....x...x.', octave: 4, voicing: 'top', gate: 0.5, level: 0.6 },
      { id: 'brass', inst: 'brass', role: 'horns', name: { en: 'Brass section', zh: '铜管组' }, notes: '. . . . Bb4 _ . . . . . . Bb4 _ D5 _ | . . . . . . . . . . . . . . . . | . . . . D5 _ . . . . . . D5 _ F5 _ | . . . . . . . . . . . . . . >D5 _', gate: 0.6, level: 1.2 },
      { id: 'saxes', inst: 'sax', role: 'horns', name: { en: 'Sax section', zh: '萨克斯组' }, notes: '. . . . . . . . . . . . . . . . | >F4 _ G4 _ >Bb4 _ _ _ G4 _ F4 _ D4 _ _ _ | . . . . . . . . . . . . . . . . | >G4 _ A4 _ >C5 _ _ _ A4 _ G4 _ Eb4 _ >D4 _', gate: 0.9, level: 1.2 },
    ],
  },
  bebop: {
    bpm: 212,
    bars: 4,
    swing: 0.6,
    swingUnit: 8,
    kit: 'acoustic',
    master: { reverb: 'room', send: 0.12, humanize: 0.006 },
    tracks: [
      { id: 'kick', inst: 'kick', name: { en: 'Bombs', zh: '底鼓炸弹' }, steps: '..........x..... ......x.......x. ..........x..... ......x...x...x.', level: 0.8 },
      { id: 'snare', inst: 'snare', name: COMPING, steps: '..x.......x..-.. ....-.x......... ..x.....-...x... ....x.-...x...x.', level: 0.6 },
      { id: 'hat', inst: 'hat', steps: '....x.......x... ....x.......x... ....x.......x... ....x.......x...' },
      { id: 'ride', inst: 'ride', name: RIDE, steps: 'x...x.x.x...x.x. x...x.x.x...x.x. x...x.x.x...x.x. x...x.x.x...x.x.' },
      { id: 'bass', inst: 'bassUpright', name: WALKING, notes: 'G2 . . . Bb2 . . . C3 . . . Bb2 . . . | A2 . . . F2 . . . D2 . . . F#2 . . . | G2 . . . F2 . . . E2 . . . G2 . . . | F2 . . . E2 . . . D2 . . . F#2 . . .', gate: 0.8 },
      { id: 'piano', inst: 'piano', role: 'keys', prog: 'Gm7 C7 Fmaj7 D7b9 Gm7 C7 Fmaj7 D7b9', change: 8, rhythm: '......x...x..... ..x.......x.x... ......x...x..... ..x...x.....x...', octave: 4, voicing: 'top', gate: 0.4, level: 0.6 },
      { id: 'lead', inst: 'sax', name: { en: 'Alto sax', zh: '中音萨克斯' }, notes: 'A4 . C5 . Eb5 . D5 . C5 . A4 . F4 . Ab4 . | G4 . A4 . C5 . E5 . F5 . A4 . F#4 . Eb4 . | . . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .', gate: 0.9, level: 1.2 },
      { id: 'trumpet', inst: 'trumpet', role: 'lead', name: TRUMPET, notes: '. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . . | D5 . Eb5 . D5 . Bb4 . G4 . E4 . G4 . Bb4 . | A4 . C5 . A4 . F4 . Eb4 . C4 . F#4 _ _ _', gate: 0.9, level: 0.8 },
    ],
  },
  'cool-jazz': {
    bpm: 120,
    bars: 4,
    swing: 0.62,
    swingUnit: 8,
    kit: 'brush',
    master: { reverb: 'room', send: 0.2, humanize: 0.01 },
    tracks: [
      { id: 'kick', inst: 'kick', name: FEATHERED, steps: '-...-...-...-... -...-...-...-... -...-...-...-... -...-...-...-...', level: 0.7 },
      { id: 'snare', inst: 'snare', name: BRUSHES, steps: '-.-.-.-.-.-.-.-. -.-.-.-.-.-.-.-. -.-.-.-.-.-.-.-. -.-.-.-.-.-.-.-.', level: 0.6 },
      { id: 'hat', inst: 'hat', steps: '....x.......x... ....x.......x... ....x.......x... ....x.......x...', level: 1 },
      { id: 'ride', inst: 'ride', name: RIDE, steps: 'x...x.x.x...x.x. x...x.x.x...x.x. x...x.x.x...x.x. x...x.x.x...x.x.', level: 1 },
      { id: 'bass', inst: 'bassUpright', name: WALKING, notes: 'Eb2 . . . G2 . . . C2 . . . Eb2 . . . | F2 . . . Ab2 . . . Bb1 . . . D2 . . . | G2 . . . Bb2 . . . C2 . . . E2 . . . | F2 . . . Eb2 . . . D2 . . . Bb1 . . .', gate: 0.85 },
      { id: 'piano', inst: 'piano', role: 'keys', prog: 'Ebmaj9 Cm9 Fm9 Bb9 Gm7 C7b9 Fm9 Bb13', change: 8, rhythm: 'x_______x_______ x_______x_______ x_______x_______ x_______x_______', octave: 3, voicing: 'spread', gate: 1, level: 0.45 },
      { id: 'trumpet', inst: 'trumpet', role: 'lead', name: TRUMPET, notes: 'G4 _ _ _ Bb4 _ _ _ Ab4 _ _ _ _ _ _ _ | Eb4 _ _ _ _ _ _ _ F4 _ G4 _ Bb4 _ _ _ | . . . . Bb4 _ _ _ D5 _ _ _ Db5 _ _ _ | C5 _ _ _ Ab4 _ _ _ G4 _ _ _ F4 _ _ _', gate: 0.95, level: 0.6 },
      { id: 'bari', inst: 'bariSax', role: 'lead', notes: '>Eb3 _ _ _ _ _ _ _ >C3 _ _ _ >Eb3 _ _ _ | >Ab3 _ _ _ >G3 _ _ _ >F3 _ _ _ >D3 _ _ _ | . . . . >G3 _ _ _ >F3 _ _ _ >E3 _ _ _ | >F3 _ _ _ >Eb3 _ _ _ >D3 _ _ _ >Ab3 _ _ _', gate: 0.95, level: 0.9 },
    ],
  },
  'hard-bop': {
    bpm: 140,
    bars: 4,
    swing: 0.65,
    swingUnit: 8,
    kit: 'acoustic',
    master: { reverb: 'room', send: 0.15, humanize: 0.008 },
    tracks: [
      { id: 'kick', inst: 'kick', steps: 'x.........x..... x.......x.....x. x.........x..... x.......x...x.x.', level: 0.7 },
      { id: 'snare', inst: 'snare', name: COMPING, steps: '..x.....-...x... ......x.......x. ..x.....-...x... ....x.x...x.X.x.', level: 0.6 },
      { id: 'hat', inst: 'hat', steps: '....X.......X... ....X.......X... ....X.......X... ....X.......X...' },
      { id: 'ride', inst: 'ride', name: RIDE, steps: 'x...x.x.x...x.x. x...x.x.x...x.x. x...x.x.x...x.x. x...x.x.x...x.x.' },
      { id: 'bass', inst: 'bassUpright', name: WALKING, notes: 'F2 . . . Ab2 . . . A2 . . . C3 . . . | Bb2 . . . Db3 . . . C3 . . . Ab2 . . . | F2 . . . A2 . . . D2 . . . F#2 . . . | G2 . . . Bb2 . . . C3 . . . E2 . . .', gate: 0.85 },
      { id: 'piano', inst: 'piano', role: 'keys', name: { en: 'Gospel chords', zh: '福音和弦' }, prog: 'F7 F7 Bb7 Bb7 F7 D7b9 Gm7 C7', change: 8, rhythm: 'x.....x...x..... ..x...x.....x... x.....x...x..... x.x...x...x.x...', octave: 3, voicing: 'close', gate: 0.5, level: 0.65 },
      { id: 'trumpet', inst: 'trumpet', role: 'horns', name: TRUMPET, notes: HARD_BOP_LINE, gate: 0.8, level: 0.9 },
      { id: 'sax', inst: 'sax', role: 'horns', name: { en: 'Tenor sax', zh: '次中音萨克斯' }, notes: HARD_BOP_LINE, gate: 0.8, level: 1.2, transpose: -12 },
    ],
  },
  'modal-jazz': {
    bpm: 136,
    bars: 4,
    swing: 0.64,
    swingUnit: 8,
    kit: 'brush',
    master: { reverb: 'room', send: 0.2, humanize: 0.01 },
    tracks: [
      { id: 'kick', inst: 'kick', steps: 'x............... x.............-. x............... x.........x...-.', level: 0.7 },
      { id: 'hat', inst: 'hat', steps: '....x.......x... ....x.......x... ....x.......x... ....x.......x...', level: 0.8 },
      { id: 'ride', inst: 'ride', name: RIDE, steps: 'x...x.x.x...x.x. x...x.x.x...x.x. x...x.x.x...x.x. x...x.x.x...x.x.', level: 0.8 },
      { id: 'bass', inst: 'bassUpright', name: { en: 'Dorian bass', zh: '多利亚贝斯' }, notes: 'D2 . . . A2 . . . B2 . . . C3 . . . | D3 . . . C3 . . . A2 . . . F2 . . . | D2 . . . F2 . . . A2 . . . C3 . . . | E2 . . . F2 . . . A2 . . . C2 . . .', gate: 0.85 },
      { id: 'piano', inst: 'piano', role: 'keys', name: { en: 'Quartal stabs', zh: '四度叠置短奏' }, chords: '. . A7sus4 _ . . . . . . . . G7sus4 _ . . | . . A7sus4 _ . . . . G7sus4 _ . . . . . . | . . A7sus4 _ . . . . . . . . G7sus4 _ . . | . . A7sus4 _ . . G7sus4 _ . . A7sus4 _ _ _ . .', octave: 3, voicing: 'close', gate: 0.9, level: 0.55 },
      { id: 'lead', inst: 'trumpet', name: TRUMPET, notes: '. . . . A4 _ _ _ _ _ _ _ C5 _ D5 _ | E5 _ _ _ _ _ _ _ D5 _ _ _ A4 _ _ _ | . . . . . . F5 _ E5 _ D5 _ _ _ _ _ | C5 _ _ _ . . A4 _ G4 _ _ _ _ _ _ _', gate: 0.95, level: 0.9, fx: { reverb: 0.3 } },
    ],
  },
  'free-jazz': {
    bpm: 150,
    bars: 4,
    swing: 0.6,
    swingUnit: 8,
    kit: 'acoustic',
    master: { reverb: 'room', send: 0.15, humanize: 0.03 },
    tracks: [
      { id: 'kick', inst: 'kick', steps: 'x....x.....x.... ..x......x...x.. .x...x..x....x.. x..x...x.x..x...', level: 0.7 },
      { id: 'snare', inst: 'snare', steps: '..x...-.x.....x. x...x..-...x.... .x..x.x...-..x.. xx.x..x.x.x.xx.x', level: 0.5 },
      { id: 'ride', inst: 'ride', name: RIDE, steps: 'x.x..x.x.x..x.x. .x.x.x..x.x.x..x x..x.x.x..x.x.x. .x.x..x.x.x..x.x', level: 0.8 },
      { id: 'tom', inst: 'tom', role: 'perc', steps: '.......x.......x ....x.......x... ..x....x..x....x x...x.x...x.xx..', level: 0.5 },
      { id: 'crash', inst: 'crash', role: 'perc', steps: '................ ................ x............... ........x.......', level: 0.5 },
      { id: 'bass', inst: 'bassUpright', notes: 'Db2 . Gb2 . . B2 . . C3 . . . F2 . Bb2 . | . E3 . . A2 . Eb3 . . . D2 . Ab2 . . . | G2 . . Db3 . . C2 . . F#2 . . B2 . . . | . Bb2 . E2 . . A2 . Eb2 . . . D3 _ _ _', gate: 0.7 },
      { id: 'piano', inst: 'piano', role: 'keys', name: { en: 'Piano clusters', zh: '钢琴音簇' }, chords: 'Dbmaj7#11 . . . . . Ebm7b5 . . . . B7#9 . . . . | . . Cdim7 . . . . . F7b9 . . . . . . . | . . . . Ebm7b5 . . Dbmaj7#11 . . . . . . B7#9 . | Cdim7 . . F7b9 . . . . . Ebm7b5 _ _ . . . .', octave: 4, voicing: 'close', gate: 0.4, level: 0.7 },
      { id: 'lead', inst: 'sax', name: { en: 'Alto sax', zh: '中音萨克斯' }, notes: 'E5 . F5 _ Bb4 . . . >Ab5 _ G5 . . Db5 _ _ | . . . >B5 _ _ C5 _ _ _ F#4 . G4 _ _ _ | . >Eb5 _ _ _ . . A5 _ Bb5 _ . . . E5 _ | >F5 _ _ _ _ . . . >Ab5 _ _ B5 _ _ _ _', gate: 0.9, fx: { drive: 0.2 } },
      { id: 'trumpet', inst: 'trumpet', role: 'lead', name: TRUMPET, notes: '. . . . . . . . . . Gb5 _ _ . . . | . . . Ab4 _ _ _ . . . . . D5 _ . . | Bb4 _ . . . . B4 _ _ . . . . E5 _ _ | . . . . >Db5 _ _ _ . . . . A4 _ Eb5 _', gate: 0.9, level: 0.8 },
    ],
  },
  fusion: {
    bpm: 104,
    bars: 4,
    kit: 'acoustic',
    master: { reverb: 'room', send: 0.15, humanize: 0.006 },
    tracks: [
      { id: 'kick', inst: 'kick', steps: 'x..x..x...x..x.. x..x..x...x.x... x..x..x...x..x.. x..x..x...x.x.x.', level: 0.65 },
      { id: 'snare', inst: 'snare', steps: '....x..-....x..- ....x..-..-.x... ....x..-....x..- ....x..-..-.x.x-' },
      { id: 'hat', inst: 'hat', steps: 'x-x-x-x-x-x-x-o- x-x-x-x-x-x-x-x- x-x-x-x-x-x-x-o- x-x-x-x-x-x-o-o-' },
      { id: 'bass', inst: 'bassSlap', notes: 'E2 . . E2 . . G2 . A2 . . . B2 . D3 . | E2 . . E2 . . G2 . A2 . G2 . E2 . . . | E2 . . E2 . . G2 . A2 . . . B2 . D3 . | G2 . . G2 . . B2 . A2 . . . G2 . A2 .', gate: 0.8, level: 1.1 },
      { id: 'epiano', inst: 'epiano', role: 'keys', name: { en: 'Rhodes', zh: 'Rhodes 电钢琴' }, prog: 'Esus4 F#m7 Esus4 Gmaj7 Esus4 F#m7 Gmaj7 A7sus4', change: 8, rhythm: 'x.._..x_......x. x.._..x_....x_.. x.._..x_......x. x.._..x_..x_..x.', octave: 4, voicing: 'top', gate: 0.8, level: 0.6, fx: { chorus: 0.4 } },
      { id: 'guitar', inst: 'guitarMuted', role: 'guitar', name: { en: 'Funk guitar', zh: '放克吉他' }, prog: 'Esus4 F#m7 Esus4 Gmaj7 Esus4 F#m7 Gmaj7 A7sus4', change: 8, rhythm: '.x.x..x..x.x..x. .x.x..x..x.x.... .x.x..x..x.x..x. .x.x..x..x.x.x.x', octave: 4, voicing: 'top', gate: 0.45, level: 1.2 },
      { id: 'lead', inst: 'leadSaw', name: { en: 'Synth lead', zh: '合成器主音' }, notes: '. . . . >B4 _ D5 _ >E5 _ _ _ D5 _ B4 _ | A4 _ _ _ G4 _ A4 _ B4 _ _ _ _ _ _ _ | . . . . >B4 _ D5 _ >F#5 _ _ _ E5 _ D5 _ | B4 _ A4 _ G4 _ _ _ A4 _ B4 _ D5 _ _ _', gate: 0.9, level: 1.2, fx: { delay: { time: '8d', feedback: 0.25, mix: 0.2 } } },
    ],
  },
};
