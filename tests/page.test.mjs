// The page's wiring: every translation key the scripts use exists in both
// languages and none is dead, the module graph is preloaded, no inline event
// handlers slip past the CSP, and the sitemap is one Search Console accepts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { STRINGS } from '../js/i18n.js';
import { PIECES, sketchesOf } from '../data/pieces.js';

const root = new URL('../', import.meta.url);
const read = (file) => readFile(new URL(file, root), 'utf8');

async function scripts() {
  const files = (await readdir(new URL('js/', root))).filter((f) => f.endsWith('.js'));
  return Promise.all(files.map(async (f) => [f, await read(`js/${f}`)]));
}

test('every translation key the scripts use exists, and every key is used somewhere', async () => {
  const sources = await scripts();
  const html = await read('index.html');
  const used = new Set();
  const prefixes = [];
  for (const [, src] of sources) {
    for (const m of src.matchAll(/'([a-z]+(?:\.[a-zA-Z]+)+)'/g)) used.add(m[1]); // keys are passed as plain strings, to t() or to helpers
    for (const m of src.matchAll(/\bt\(`([\w.]+)\$\{/g)) prefixes.push(m[1]); // a prefix: t(`track.${role}`)
  }
  for (const m of html.matchAll(/data-i18n(?:-aria|-title)?="([^"]+)"/g)) used.add(m[1]);
  for (const [, src] of sources) for (const m of src.matchAll(/\bt\('([\w.]+)'/g)) assert.ok(STRINGS.en[m[1]], `${m[1]} is used but not defined`);
  for (const key of Object.keys(STRINGS.en)) assert.ok(used.has(key) || prefixes.some((p) => key.startsWith(p)), `${key} is defined but never used`);
  // the prefixed keys: every part role in the sketches and every work kind has its string
  const roles = new Set(['kick', 'snare', 'hat', 'perc', 'chords', 'lead']);
  for (const id of Object.keys(PIECES)) for (const piece of sketchesOf(id)) for (const track of piece.tracks) if (track.role) roles.add(track.role);
  for (const role of roles) assert.ok(STRINGS.en[`track.${role}`] && STRINGS.zh[`track.${role}`], `track.${role}`);
  for (const kind of ['single', 'song', 'ep', 'compilation', 'soundtrack', 'mixtape', 'live', 'recording']) assert.ok(STRINGS.en[`work.${kind}`], `work.${kind}`);
  for (const pace of ['slow', 'relaxed', 'medium', 'fast', 'veryfast']) assert.ok(STRINGS.en[`player.pace.${pace}`], `player.pace.${pace}`);
});

test('the module graph behind main.js is preloaded in the page, in dependency order', async () => {
  const html = await read('index.html');
  const seen = new Set();
  const order = [];
  async function walk(file) {
    if (seen.has(file)) return;
    seen.add(file);
    const src = await read(file);
    for (const m of src.matchAll(/^import .* from '([^']+)';/gm)) await walk(new URL(m[1], new URL(file, root)).pathname.replace(new URL(root).pathname, ''));
    order.push(file);
  }
  await walk('js/main.js');
  const preloaded = [...html.matchAll(/<link rel="modulepreload" href="([^"]+)">/g)].map((m) => m[1]);
  assert.deepEqual(preloaded, order.filter((f) => f !== 'js/main.js'));
});

test('no inline event handlers or style attributes anywhere the CSP applies', async () => {
  for (const file of ['index.html', '404.html']) {
    const html = await read(file);
    assert.ok(!/\son\w+="/i.test(html), `${file}: inline event handler`);
    assert.ok(!/\sstyle="/.test(html), `${file}: style attribute`);
  }
  for (const [name, src] of await scripts()) {
    assert.ok(!src.includes("setAttribute('style'"), `${name}: style attribute`);
    assert.ok(!/\.on\w+\s*=\s*['"]/.test(src), `${name}: handler from a string`);
  }
});

test('the sitemap uses the sitemaps.org namespace and carries a lastmod', async () => {
  const xml = await read('sitemap.xml');
  assert.ok(xml.includes('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'));
  assert.ok(/<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/.test(xml));
});
