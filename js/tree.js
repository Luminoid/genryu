// The family tree: a layout that places every genre by its year on a horizontal
// time axis and in its family's lane, stacking genres that would overlap into
// sub-rows, and an SVG renderer that draws lanes, typed edges (parent,
// influence, backlash) and nodes that are real links. With `artists` on, each
// node carries a second line naming the genre's key artists, the way the Rock
// Music Tree chart did. layoutTree is pure, for the tests; renderTree needs a document.

import { t, pick, getLang } from './i18n.js';

const NS = 'http://www.w3.org/2000/svg';

// Years before 1940 hold few genres, so they get less room per year.
const SEGMENTS = [
  { from: 1895, to: 1940, px: 9 },
  { from: 1940, to: 2027, px: 19 },
];
const LEFT = 36;
const RIGHT = 60;
const FONT = 16; // node label size in px; css/styles.css sets the same on .tree-node-text
const SUB_FONT = 12; // the artist line; css sets the same on .tree-node-sub
const SUB_MAX = 330; // the artist line is cut to this width
const NODE_H = 34;
const NODE_H_SUB = 50;
const ROW_H = 44;
const ROW_H_SUB = 60;
const NODE_H_SUB2 = 64; // a node with two artist lines
const ROW_H_SUB2 = 74;
const SUB_LINES = 2; // at most this many artist lines under a node
const LANE_PAD = 16;
const NODE_GAP = 14;
const TOP = 10;

/** x position of a year. */
export function yearX(year) {
  let x = LEFT;
  for (const seg of SEGMENTS) {
    if (year <= seg.from) return x;
    const end = Math.min(year, seg.to);
    x += (end - seg.from) * seg.px;
    if (year <= seg.to) return x;
  }
  return x;
}

/** Estimated text width in px: Latin characters are narrow, CJK characters wide. */
export function textWidth(text, font = FONT) {
  let w = 0;
  for (const ch of text) w += /[　-鿿＀-￯]/.test(ch) ? font : /[A-Z]/.test(ch) ? font * 0.66 : /[ -]/.test(ch) ? font * 0.3 : font * 0.57;
  return Math.ceil(w);
}

/** Width of a node whose label is `text`. */
export function labelWidth(text) {
  return textWidth(text) + 26;
}

/** The names the tree shows under a genre: the artists marked `key`, else the first three. */
export function keyArtists(genre) {
  const all = genre.artists ?? [];
  const marked = all.filter((a) => a.key);
  return marked.length ? marked : all.slice(0, 3);
}

/** The artist block under a node: the key names on up to SUB_LINES lines of SUB_MAX each, joined by newlines; a name that fits nowhere is skipped. */
export function artistLine(genre, lang = 'en') {
  const sep = lang === 'zh' ? '、' : ', ';
  const lines = [];
  let line = '';
  for (const artist of keyArtists(genre)) {
    const name = lang === 'zh' && artist.zh ? artist.zh : artist.name;
    const next = line ? line + sep + name : name;
    if (!line || textWidth(next, SUB_FONT) <= SUB_MAX) {
      line = next;
    } else if (lines.length + 1 < SUB_LINES) {
      lines.push(line);
      line = name;
    }
  }
  if (line) lines.push(line);
  return lines.map((l) => {
    if (textWidth(l, SUB_FONT) <= SUB_MAX) return l;
    while (l.length > 1 && textWidth(`${l}…`, SUB_FONT) > SUB_MAX) l = l.slice(0, -1);
    return `${l}…`;
  }).join('\n');
}

/**
 * Lay out genres. Returns { width, height, nodes: [{ genre, x, y, w, h, row, sub }], lanes: [{ family, y, height }] }.
 * A node sits at its year; within a lane nodes that would overlap fall to the next sub-row.
 * With `artists`, nodes are taller and carry `sub`, the artist line.
 */
export function layoutTree(genres, families, lang = 'en', { artists = false } = {}) {
  const nodes = [];
  const lanes = [];
  let y = TOP;
  for (const family of families) {
    const members = genres.filter((g) => g.family === family.id).sort((a, b) => a.year - b.year || a.id.localeCompare(b.id));
    const rowEnds = []; // right edge of the last node in each sub-row
    const laneNodes = [];
    for (const genre of members) {
      const name = genre.name[lang] ?? genre.name.en;
      const sub = artists ? artistLine(genre, lang) : '';
      const subLines = sub ? sub.split('\n') : [];
      const w = Math.max(labelWidth(name), ...subLines.map((l) => textWidth(l, SUB_FONT) + 26));
      const h = !artists ? NODE_H : subLines.length > 1 ? NODE_H_SUB2 : NODE_H_SUB;
      const x = yearX(genre.year);
      let row = rowEnds.findIndex((end) => end + NODE_GAP <= x);
      if (row === -1) {
        row = rowEnds.length;
        rowEnds.push(0);
      }
      rowEnds[row] = x + w;
      laneNodes.push({ genre, x, w, h, row, sub });
    }
    const rows = Math.max(1, rowEnds.length);
    const rowH = !artists ? ROW_H : laneNodes.some((n) => n.h === NODE_H_SUB2) ? ROW_H_SUB2 : ROW_H_SUB;
    const height = rows * rowH + LANE_PAD;
    for (const n of laneNodes) {
      n.y = y + LANE_PAD / 2 + n.row * rowH + (rowH - n.h) / 2;
      nodes.push(n);
    }
    lanes.push({ family, y, height, rows });
    y += height;
  }
  // Wide artist lines on the newest genres may reach past the last year; the chart grows to hold them.
  const width = Math.max(yearX(2027) + RIGHT, ...nodes.map((n) => n.x + n.w + LANE_PAD));
  return { width, height: y + 6, nodes, lanes };
}

/** Edges of the tree: { from, to, kind } for parents, influences and backlashes present in the data. */
export function treeEdges(genres) {
  const ids = new Set(genres.map((g) => g.id));
  const edges = [];
  for (const g of genres) {
    for (const p of g.parents ?? []) if (ids.has(p)) edges.push({ from: p, to: g.id, kind: 'parent' });
    for (const p of g.influences ?? []) if (ids.has(p)) edges.push({ from: p, to: g.id, kind: 'influence' });
    for (const p of g.against ?? []) if (ids.has(p)) edges.push({ from: p, to: g.id, kind: 'backlash' });
  }
  return edges;
}

function svg(tag, attrs = {}, parent = null) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  if (parent) parent.appendChild(el);
  return el;
}

function edgePath(a, b) {
  const x1 = a.x + a.w;
  const y1 = a.y + a.h / 2;
  const x2 = b.x;
  const y2 = b.y + b.h / 2;
  if (x2 <= x1 + 4) {
    // The child starts before the parent ends (a near-simultaneous offshoot):
    // leave from the parent's bottom or top edge and arrive at the child's top or bottom.
    const down = b.y > a.y;
    const sx = a.x + a.w * 0.7;
    const sy = down ? a.y + a.h : a.y;
    const ex = b.x + Math.min(b.w * 0.3, 24);
    const ey = down ? b.y : b.y + b.h;
    const dy = Math.max(18, Math.abs(ey - sy) * 0.5);
    return `M${sx} ${sy} C${sx} ${sy + (down ? dy : -dy)} ${ex} ${ey - (down ? dy : -dy)} ${ex} ${ey}`;
  }
  const dx = Math.max(40, (x2 - x1) * 0.5);
  return `M${x1} ${y1} C${x1 + dx} ${y1} ${x2 - dx} ${y2} ${x2} ${y2}`;
}

/**
 * Render the tree into a container. Returns { element, layout, select(id), setHover(id), focusFamily(id) }.
 * Nodes are <a href="#id"> elements; `onSelect(id)` runs on click (the hash change does the navigation).
 * `artists` adds the artist line to every node.
 */
export function renderTree(genres, families, { onSelect, artists = false } = {}) {
  const lang = getLang();
  const layout = layoutTree(genres, families, lang, { artists });
  const byId = new Map(layout.nodes.map((n) => [n.genre.id, n]));
  const edges = treeEdges(genres);
  const years = genres.map((g) => g.year);
  const root = svg('svg', {
    viewBox: `0 0 ${layout.width} ${layout.height}`,
    width: layout.width,
    height: layout.height,
    class: 'tree-svg',
    role: 'group',
    'aria-label': t('tree.aria', { n: genres.length, from: Math.min(...years), to: Math.max(...years) }),
  });

  // lanes
  const laneGroup = svg('g', { class: 'tree-lanes' }, root);
  for (const lane of layout.lanes) {
    const g = svg('g', { class: 'tree-lane', 'data-family': lane.family.id }, laneGroup);
    svg('rect', { x: 0, y: lane.y, width: layout.width, height: lane.height, class: 'tree-lane-bg' }, g);
    svg('line', { x1: 0, x2: layout.width, y1: lane.y, y2: lane.y, class: 'tree-lane-line' }, g);
    svg('rect', { x: 0, y: lane.y + 1, width: 5, height: lane.height - 1, class: 'tree-lane-bar' }, g);
    const label = svg('text', { x: 14, y: lane.y + 21, class: 'tree-lane-label' }, g);
    label.textContent = pick(lane.family.name);
  }
  // decade grid
  const gridGroup = svg('g', { class: 'tree-grid' }, root);
  for (let year = 1900; year <= 2020; year += 10) {
    const x = yearX(year);
    svg('line', { x1: x, x2: x, y1: 0, y2: layout.height, class: 'tree-grid-line' }, gridGroup);
  }
  // edges
  const edgeGroup = svg('g', { class: 'tree-edges' }, root);
  const edgeEls = [];
  for (const e of edges) {
    const a = byId.get(e.from);
    const b = byId.get(e.to);
    if (!a || !b) continue;
    const path = svg('path', { d: edgePath(a, b), class: `tree-edge tree-edge-${e.kind}`, 'data-from': e.from, 'data-to': e.to, 'data-family': a.genre.family }, edgeGroup);
    edgeEls.push({ el: path, edge: e });
  }
  // nodes
  const nodeGroup = svg('g', { class: 'tree-nodes' }, root);
  const nodeEls = new Map();
  for (const n of layout.nodes) {
    const name = n.genre.name[lang] ?? n.genre.name.en;
    const family = families.find((f) => f.id === n.genre.family);
    const a = svg('a', { href: `#${n.genre.id}`, class: 'tree-node', 'data-id': n.genre.id, 'data-family': n.genre.family }, nodeGroup);
    a.setAttribute('aria-label', t('tree.node', { name, era: pick(n.genre.era), family: pick(family.name) }) + (n.sub ? `. ${n.sub.replace('\n', '; ')}` : ''));
    svg('rect', { x: n.x, y: n.y, width: n.w, height: n.h, rx: 7, class: 'tree-node-bg' }, a);
    svg('rect', { x: n.x, y: n.y + 7, width: 4, height: n.h - 14, rx: 2, class: 'tree-node-bar' }, a);
    const text = svg('text', { x: n.x + 14, y: n.sub ? n.y + 21 : n.y + n.h / 2 + 5.5, class: 'tree-node-text' }, a);
    text.textContent = name;
    if (n.sub) n.sub.split('\n').forEach((line, i) => { svg('text', { x: n.x + 14, y: n.y + 39 + i * 14, class: 'tree-node-sub' }, a).textContent = line; });
    a.addEventListener('click', () => onSelect && onSelect(n.genre.id));
    a.addEventListener('mouseenter', () => setHover(n.genre.id));
    a.addEventListener('mouseleave', () => setHover(null));
    a.addEventListener('focus', () => setHover(n.genre.id));
    a.addEventListener('blur', () => setHover(null));
    nodeEls.set(n.genre.id, a);
  }

  let selected = null;
  function setHover(id) {
    const active = id ?? selected;
    root.classList.toggle('tree-focus', Boolean(active));
    if (!active) {
      for (const { el } of edgeEls) el.classList.remove('tree-edge-lit', 'tree-edge-dim');
      for (const el of nodeEls.values()) el.classList.remove('tree-node-related', 'tree-node-dim');
      return;
    }
    const related = new Set([active]);
    for (const { el, edge } of edgeEls) {
      const lit = edge.from === active || edge.to === active;
      el.classList.toggle('tree-edge-lit', lit);
      el.classList.toggle('tree-edge-dim', !lit);
      if (lit) {
        related.add(edge.from);
        related.add(edge.to);
      }
    }
    for (const [nid, el] of nodeEls) {
      el.classList.toggle('tree-node-related', related.has(nid) && nid !== active);
      el.classList.toggle('tree-node-dim', !related.has(nid));
    }
  }
  function select(id) {
    if (selected && nodeEls.has(selected)) nodeEls.get(selected).classList.remove('tree-node-selected');
    selected = id;
    if (id && nodeEls.has(id)) nodeEls.get(id).classList.add('tree-node-selected');
    setHover(null);
  }
  /** Pick one family out: everything outside it fades. null clears. */
  function focusFamily(familyId) {
    root.classList.toggle('tree-family-focus', Boolean(familyId));
    for (const [nid, el] of nodeEls) el.classList.toggle('tree-node-off', Boolean(familyId) && byId.get(nid).genre.family !== familyId);
    for (const { el, edge } of edgeEls) {
      const a = byId.get(edge.from).genre.family;
      const b = byId.get(edge.to).genre.family;
      el.classList.toggle('tree-edge-off', Boolean(familyId) && a !== familyId && b !== familyId);
    }
    for (const lane of root.querySelectorAll('.tree-lane')) lane.classList.toggle('tree-lane-off', Boolean(familyId) && lane.dataset.family !== familyId);
  }
  return { element: root, layout, select, setHover, focusFamily, nodeEls, byId };
}

/** The decade labels for the sticky axis: [{ year, x }]. */
export function decadeTicks() {
  const ticks = [];
  for (let year = 1900; year <= 2020; year += 10) ticks.push({ year, x: yearX(year) });
  return ticks;
}
