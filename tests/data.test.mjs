// The genre data and the sketches: every reference resolves, every piece compiles.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GENRES, FAMILIES } from '../data/genres.js';
import { PIECES, sketchesOf } from '../data/pieces.js';
import { compilePiece, isDrumTrack } from '../js/pattern.js';
import { unknownInstruments, KIT_NAMES, INSTRUMENTS, KITS, DRUM_NAMES, DRUM_TYPES } from '../js/audio.js';
import { layoutTree, treeEdges } from '../js/tree.js';

const ids = new Set(GENRES.map((g) => g.id));

test('genre ids are unique and families exist', () => {
  assert.equal(ids.size, GENRES.length);
  const familyIds = new Set(FAMILIES.map((f) => f.id));
  for (const g of GENRES) assert.ok(familyIds.has(g.family), `${g.id}: family ${g.family}`);
  for (const f of FAMILIES) assert.ok(GENRES.some((g) => g.family === f.id), `family ${f.id} is empty`);
});

test('every family has a name and a one-sentence blurb in both languages', () => {
  for (const f of FAMILIES) {
    for (const field of ['name', 'blurb']) assert.ok(f[field] && f[field].en && f[field].zh, `${f.id}: ${field} needs en and zh`);
    assert.ok(!/\w — \w/.test(f.blurb.en) && !/——/.test(f.blurb.zh), `${f.id}: blurb has an em dash`);
  }
});

test('every instrument, drum sound and kit has a display name in both languages', () => {
  for (const [id, preset] of Object.entries(INSTRUMENTS)) assert.ok(preset.name && preset.name.en && preset.name.zh, `instrument ${id} needs a name`);
  for (const type of DRUM_TYPES) assert.ok(DRUM_NAMES[type] && DRUM_NAMES[type].en && DRUM_NAMES[type].zh, `drum ${type} needs a name`);
  for (const [id, kit] of Object.entries(KITS)) assert.ok(kit.name && kit.name.en && kit.name.zh && ['acoustic', 'machine'].includes(kit.model), `kit ${id} needs a name and a model`);
});

test('every genre has both languages for every text field', () => {
  for (const g of GENRES) {
    for (const field of ['name', 'era', 'place', 'description', 'listen']) {
      assert.ok(g[field] && g[field].en && g[field].zh, `${g.id}: ${field} needs en and zh`);
    }
    assert.ok(/^\d{4}$/.test(String(g.year)), `${g.id}: year`);
    assert.ok(Array.isArray(g.artists) && g.artists.length >= 3, `${g.id}: at least three artists`);
    for (const a of g.artists) {
      assert.ok(a.name, `${g.id}: artist name`);
      assert.ok(Array.isArray(a.works) && a.works.length >= 1, `${g.id}: ${a.name} needs a work`);
      for (const w of a.works) {
        assert.ok(w.title, `${g.id}: ${a.name} work title`);
        assert.ok(!w.year || /^\d{4}$/.test(String(w.year)), `${g.id}: ${a.name} ${w.title} year`);
        if (w.kind) assert.ok(['album', 'single', 'song', 'ep', 'compilation', 'soundtrack', 'mixtape', 'live', 'recording'].includes(w.kind), `${g.id}: ${w.title} kind ${w.kind}`);
      }
    }
    assert.ok(g.wiki && g.wiki.en, `${g.id}: wiki title`);
  }
});

test('outward-facing text has no inline em dashes', () => {
  for (const g of GENRES) {
    for (const field of ['description', 'listen', 'era', 'place']) {
      for (const lang of ['en', 'zh']) {
        const text = g[field][lang];
        assert.ok(!/\w — \w|——/.test(text), `${g.id}: ${field}.${lang} has an em dash`);
      }
    }
  }
});

test('lineage references resolve and point backwards in time (or sideways)', () => {
  for (const g of GENRES) {
    for (const kind of ['parents', 'influences', 'against']) {
      for (const p of g[kind] ?? []) {
        assert.ok(ids.has(p), `${g.id}: ${kind} ${p} does not exist`);
        assert.notEqual(p, g.id, `${g.id}: ${kind} itself`);
        const parent = GENRES.find((x) => x.id === p);
        assert.ok(parent.year <= g.year + 2, `${g.id} (${g.year}): ${kind} ${p} is from ${parent.year}`);
      }
    }
    if (!g.parents?.length) assert.ok(g.root, `${g.id}: no parents, so it must be marked root`);
  }
  const edges = treeEdges(GENRES);
  assert.ok(edges.length > GENRES.length, 'more edges than nodes');
});

test('every genre reaches a root through parents (no cycles)', () => {
  const byId = new Map(GENRES.map((g) => [g.id, g]));
  for (const g of GENRES) {
    const seen = new Set();
    const stack = [g.id];
    while (stack.length) {
      const id = stack.pop();
      if (seen.has(id)) continue;
      seen.add(id);
      for (const p of byId.get(id).parents ?? []) {
        assert.notEqual(p, g.id, `${g.id}: cycle through ${id}`);
        stack.push(p);
      }
    }
  }
});

test('every genre has a sketch that compiles with known instruments', () => {
  for (const g of GENRES) {
    const sketches = sketchesOf(g.id);
    assert.ok(sketches.length, `${g.id}: no sketch`);
    if (sketches.length > 1) for (const p of sketches) assert.ok(p.title && p.title.en && p.title.zh, `${g.id}: a set of sketches needs a title on each, in both languages`);
    for (const piece of sketches) checkPiece(g.id, piece);
  }
  for (const id of Object.keys(PIECES)) assert.ok(ids.has(id), `sketch ${id} has no genre`);
});

function checkPiece(id, piece) {
  {
    const g = { id };
    assert.ok(piece.bpm >= 50 && piece.bpm <= 220, `${g.id}: bpm ${piece.bpm}`);
    assert.ok((piece.bars ?? 2) >= 2 && (piece.bars ?? 2) <= 8, `${g.id}: ${piece.bars} bars`);
    if (piece.kit) assert.ok(KIT_NAMES.includes(piece.kit), `${g.id}: kit ${piece.kit}`);
    assert.deepEqual(unknownInstruments(piece), [], `${g.id}: unknown instruments`);
    const compiled = compilePiece(piece);
    assert.ok(compiled.tracks.length >= 3, `${g.id}: at least three tracks`);
    const trackIds = new Set();
    for (const { track, events } of compiled.tracks) {
      assert.ok(!trackIds.has(track.id), `${g.id}: duplicate track ${track.id}`);
      trackIds.add(track.id);
      assert.ok(events.length > 0, `${g.id}: ${track.id} is silent`);
      if (!isDrumTrack(track)) for (const e of events) for (const n of e.notes) assert.ok(n >= 24 && n <= 100, `${g.id}: ${track.id} note ${n} out of range`);
    }
    assert.ok(compiled.tracks.some(({ track }) => isDrumTrack(track)) || piece.noDrums, `${g.id}: no drum track`);
  }
}

test('the tree lays out without overlapping nodes in a lane, with and without the artist line', () => {
  for (const lang of ['en', 'zh']) {
    for (const artists of [false, true]) {
      const layout = layoutTree(GENRES, FAMILIES, lang, { artists });
      for (const lane of layout.lanes) {
        const nodes = layout.nodes.filter((n) => n.genre.family === lane.family.id);
        for (const a of nodes) {
          for (const b of nodes) {
            if (a === b || a.row !== b.row) continue;
            const overlap = a.x < b.x + b.w && b.x < a.x + a.w;
            assert.ok(!overlap, `${lang}: ${a.genre.id} overlaps ${b.genre.id}`);
          }
        }
      }
      for (const n of layout.nodes) assert.equal(Boolean(n.sub), artists, `${lang}: ${n.genre.id} artist line`);
      assert.ok(layout.width > 1000 && layout.height > 400);
    }
  }
});


test('every genre marks three to five key artists for the tree', () => {
  for (const g of GENRES) {
    const keys = g.artists.filter((a) => a.key);
    assert.ok(keys.length >= 3 && keys.length <= 5, `${g.id}: ${keys.length} key artists`);
  }
});
