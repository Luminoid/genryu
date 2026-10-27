// The track view of a sketch: one row per part, drum hits as blocks and
// pitched notes as a small piano roll, a playhead the player moves, and a
// mute (speaker) and solo (headphones) button per row. Renders into a
// container; no audio here.

import { isDrumTrack, pitchRange, STEPS_PER_BAR } from './pattern.js';
import { midiToNote } from './theory.js';
import { instrumentName } from './audio.js';
import { t, pick } from './i18n.js';

const NS = 'http://www.w3.org/2000/svg';
const ROW_DRUM = 28;
const ROW_PITCH_MIN = 42;
const ROW_PITCH_MAX = 74;
const STEP_W = 22;
const STEP_W_LONG = 18;
const RULER_H = 20;

const ICON_SPEAKER = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" stroke="none"/><path class="wave" d="M16 9a4 4 0 0 1 0 6"/><path class="wave" d="M18.5 6.5a7.5 7.5 0 0 1 0 11"/><path class="cross" d="M16 9l5 6M21 9l-5 6"/></svg>';
const ICON_HEADPHONES = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 14v-2a8 8 0 0 1 16 0v2"/><path d="M4 14h3v6H5a1 1 0 0 1-1-1v-5zM20 14h-3v6h2a1 1 0 0 0 1-1v-5z" fill="currentColor"/></svg>';

function svg(tag, attrs = {}, parent = null) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  if (parent) parent.appendChild(el);
  return el;
}

function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') el.className = v;
    else if (k.startsWith('data-')) el.setAttribute(k, v);
    else if (k === 'text') el.textContent = v;
    else if (k === 'html') el.innerHTML = v;
    else el.setAttribute(k, v);
  }
  for (const c of children) if (c) el.append(c);
  return el;
}

const ROLE_BY_INST = [
  [/^bass/, 'bass'],
  [/^guitar|^banjo|^mandolin|^sitar|^koto|^steelGuitar/, 'guitar'],
  [/^piano|^epiano|^organ|^clavinet|^vibes|^marimba|^bell|^kalimba|^steelDrum|^accordion/, 'keys'],
  [/^strings/, 'strings'],
  [/^pad/, 'pad'],
  [/^brass|^trumpet|^trombone/, 'horns'],
  [/^choir|^voice/, 'vocal'],
];

/** The part a track plays, from its role, else guessed from its instrument. */
export function trackRole(track) {
  if (track.role) return track.role;
  if (isDrumTrack(track)) return { kick: 'kick', snare: 'snare', clap: 'snare', rim: 'snare', hat: 'hat', ride: 'hat' }[track.inst] ?? 'perc';
  if (track.prog || track.chords) return 'chords';
  for (const [re, role] of ROLE_BY_INST) if (re.test(track.inst)) return role;
  return 'lead';
}

/** The display name of a track: its own name, else the drum's name, else a word for its role. */
export function trackName(track) {
  if (track.name) return pick(track.name);
  if (isDrumTrack(track)) return pick(instrumentName(track.inst));
  return t(`track.${trackRole(track)}`);
}

/** What plays the track, in words: the piece's own instrument name, else the preset's; empty when it would repeat the name. */
export function trackInstrument(track) {
  const inst = pick(track.instName) || pick(instrumentName(track.inst));
  return inst.toLowerCase() === trackName(track).toLowerCase() ? '' : inst;
}

/**
 * Build the sequencer for a compiled piece. Returns { element, setStep(step), setMuted(id, flag), setSolo(id, flag), setAudible(fn) }.
 * `onMute(id)` and `onSolo(id)` are called when the buttons are pressed.
 */
export function renderSequencer(compiled, piece, { onMute, onSolo }) {
  const wrap = h('div', { class: 'seq' });
  const labels = h('div', { class: 'seq-labels' });
  const scroll = h('div', { class: 'seq-scroll' });
  const rowsMeta = compiled.tracks.map(({ track, events }) => {
    const drum = isDrumTrack(track);
    const range = drum ? null : pitchRange(events);
    const span = range ? range.max - range.min + 1 : 1;
    const height = drum ? ROW_DRUM : Math.max(ROW_PITCH_MIN, Math.min(ROW_PITCH_MAX, span * 5 + 10));
    return { track, events, drum, range, height };
  });
  const totalSteps = compiled.totalSteps;
  const stepW = totalSteps > 32 ? STEP_W_LONG : STEP_W; // four bars fit a narrower step
  const stepsPerBar = compiled.stepsPerBar ?? STEPS_PER_BAR;
  const beatSteps = compiled.beatSteps ?? 4;
  const width = totalSteps * stepW;
  const height = rowsMeta.reduce((a, r) => a + r.height + 4, RULER_H);
  const root = svg('svg', { viewBox: `0 0 ${width} ${height}`, width, height, class: 'seq-svg', 'aria-hidden': 'true' }, null);

  // ruler: bar names and beat ticks
  const ruler = svg('g', { class: 'seq-ruler' }, root);
  for (let s = 0; s <= totalSteps; s++) {
    const x = s * stepW;
    const bar = s % stepsPerBar === 0;
    const beat = s % beatSteps === 0;
    if (bar || beat) svg('line', { x1: x, x2: x, y1: beat && !bar ? 13 : 9, y2: RULER_H, class: bar ? 'seq-bar' : 'seq-beat' }, ruler);
    if (bar && s < totalSteps) svg('text', { x: x + 5, y: 12, class: 'seq-ruler-text' }, ruler).textContent = t('player.bar', { n: s / stepsPerBar + 1 });
  }
  // beat lines through the rows
  const grid = svg('g', { class: 'seq-grid' }, root);
  for (let s = 0; s <= totalSteps; s += beatSteps) {
    const x = s * stepW;
    svg('line', { x1: x, x2: x, y1: RULER_H, y2: height, class: s % stepsPerBar === 0 ? 'seq-bar' : 'seq-beat' }, grid);
  }

  let y = RULER_H;
  const rowGroups = [];
  for (const row of rowsMeta) {
    const g = svg('g', { class: `seq-row ${row.drum ? 'seq-row-drum' : 'seq-row-pitch'}`, transform: `translate(0 ${y + 2})` }, root);
    svg('rect', { x: 0, y: 0, width, height: row.height, class: 'seq-row-bg', rx: 5 }, g);
    for (const e of row.events) {
      const x = e.step * stepW + 1.5;
      if (row.drum) {
        const size = 7 + Math.min(1, e.velocity) * 10;
        svg('rect', {
          x: x + (stepW - 3 - size) / 2,
          y: (row.height - size) / 2,
          width: size,
          height: size,
          rx: size / 2 - 2,
          class: `seq-hit${e.variant === 'open' ? ' seq-hit-open' : ''}${e.velocity < 0.5 ? ' seq-hit-ghost' : ''}`,
        }, g);
      } else {
        const w = Math.max(stepW * 0.6, e.duration * stepW - 3);
        const noteH = Math.max(4, (row.height - 8) / (row.range.max - row.range.min + 1));
        for (const n of e.notes) {
          const ny = 4 + (row.range.max - n) * noteH;
          const r = svg('rect', { x, y: ny, width: w, height: Math.max(3, noteH - 1), rx: 2, class: `seq-note${e.velocity >= 1 ? ' seq-note-accent' : ''}` }, g);
          r.appendChild(svg('title')).textContent = e.label ?? midiToNote(n);
        }
        if (e.label && (row.track.prog || row.track.chords)) {
          const tx = svg('text', { x: x + 3, y: row.height - 5, class: 'seq-chord' }, g);
          tx.textContent = e.label;
        }
      }
    }
    rowGroups.push({ g, row });
    y += row.height + 4;
  }
  const playhead = svg('line', { x1: 0, x2: 0, y1: 0, y2: height, class: 'seq-playhead' }, root);
  playhead.style.opacity = '0';

  // HTML labels with mute and solo per row, aligned to the rows
  const head = h('div', { class: 'seq-label seq-label-ruler', text: t('player.parts') });
  head.style.height = `${RULER_H}px`;
  labels.append(head);
  const labelEls = new Map();
  for (const row of rowsMeta) {
    const id = row.track.id;
    const name = trackName(row.track);
    const label = h('div', { class: `seq-label${row.drum ? ' seq-label-drum' : ''}`, 'data-track': id });
    label.style.height = `${row.height + 4}px`;
    const inst = trackInstrument(row.track);
    const text = h('div', { class: 'seq-label-text', title: inst ? `${name} · ${inst}` : name }, h('span', { class: 'seq-label-name', text: name }), inst ? h('span', { class: 'seq-label-inst', text: inst }) : null);
    const mute = h('button', { type: 'button', class: 'seq-btn seq-mute', 'aria-pressed': 'false', 'aria-label': t('player.mute', { track: name }), title: t('player.mute', { track: name }), html: ICON_SPEAKER });
    const solo = h('button', { type: 'button', class: 'seq-btn seq-solo', 'aria-pressed': 'false', 'aria-label': t('player.solo', { track: name }), title: t('player.solo', { track: name }), html: ICON_HEADPHONES });
    mute.addEventListener('click', () => onMute(id));
    solo.addEventListener('click', () => onSolo(id));
    label.append(text, h('div', { class: 'seq-btns' }, mute, solo));
    labels.append(label);
    labelEls.set(id, { label, mute, solo, name });
  }
  scroll.append(root);
  wrap.append(labels, scroll);

  // A text alternative of the grid for screen readers.
  const sr = h('ul', { class: 'sr-only' });
  for (const row of rowsMeta) sr.append(h('li', { text: `${trackName(row.track)}${trackInstrument(row.track) ? ` (${trackInstrument(row.track)})` : ''}: ${row.events.length} ${t('player.steps')}` }));
  wrap.append(sr);

  let lastStep = -1;
  return {
    element: wrap,
    setStep(step, fraction) {
      if (step < 0) {
        playhead.style.opacity = '0';
        for (const { g } of rowGroups) g.classList.remove('seq-row-active');
        lastStep = -1;
        return;
      }
      playhead.style.opacity = '1';
      const x = fraction * totalSteps * stepW;
      playhead.setAttribute('x1', x);
      playhead.setAttribute('x2', x);
      if (step !== lastStep) {
        lastStep = step;
        // keep the playhead in view when the grid is wider than the panel
        const left = scroll.scrollLeft;
        const visible = scroll.clientWidth;
        if (x < left + 10 || x > left + visible - 10) scroll.scrollTo({ left: Math.max(0, x - visible * 0.3), behavior: 'auto' });
      }
    },
    setMuted(id, flag) {
      const el = labelEls.get(id);
      if (!el) return;
      el.mute.setAttribute('aria-pressed', String(flag)); // the label stays "Mute X"; pressed means muted
      el.label.classList.toggle('seq-label-muted', flag);
      const g = rowGroups.find((r) => r.row.track.id === id)?.g;
      if (g) g.classList.toggle('seq-row-muted', flag);
    },
    setSolo(id, flag) {
      const el = labelEls.get(id);
      if (!el) return;
      el.solo.setAttribute('aria-pressed', String(flag));
      el.label.classList.toggle('seq-label-solo', flag);
    },
    /** Dim rows that are silent because another row is soloed. */
    setAudible(audible) {
      for (const { g, row } of rowGroups) g.classList.toggle('seq-row-muted', !audible(row.track.id));
      for (const [id, el] of labelEls) el.label.classList.toggle('seq-label-muted', !audible(id));
    },
  };
}
