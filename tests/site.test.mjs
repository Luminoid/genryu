// The page and its release files: UI strings exist in both languages, the CSP
// allows no inline code, every data-i18n key in the page is defined, and the
// page's meta tags agree with the site address.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { STRINGS } from '../js/i18n.js';

const root = new URL('../', import.meta.url);
const read = (file) => readFile(new URL(file, root), 'utf8');

test('every UI string exists in English and Chinese', () => {
  const en = Object.keys(STRINGS.en);
  const zh = Object.keys(STRINGS.zh);
  assert.deepEqual(zh.filter((k) => !en.includes(k)), [], 'zh-only keys');
  assert.deepEqual(en.filter((k) => !zh.includes(k)), [], 'en-only keys');
  for (const k of en) {
    assert.ok(STRINGS.en[k].length, `${k} en is empty`);
    assert.ok(STRINGS.zh[k].length, `${k} zh is empty`);
    assert.ok(!/\w — \w/.test(STRINGS.en[k]) && !/——/.test(STRINGS.zh[k]), `${k} has an inline em dash`);
    const enParams = (STRINGS.en[k].match(/\{\w+\}/g) ?? []).sort();
    const zhParams = (STRINGS.zh[k].match(/\{\w+\}/g) ?? []).sort();
    assert.deepEqual(zhParams, enParams, `${k} placeholders differ`);
  }
});

test('the page only uses defined data-i18n keys and no inline scripts or styles', async () => {
  const html = await read('index.html');
  for (const m of html.matchAll(/data-i18n(?:-aria|-title)?="([^"]+)"/g)) assert.ok(STRINGS.en[m[1]], `missing string ${m[1]}`);
  assert.ok(!/<script(?![^>]*src=)[^>]*>(?!\{"@context")/.test(html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, '')), 'inline script');
  assert.ok(!html.includes('<style'), 'inline style');
  assert.ok(!/ style="/.test(html), 'style attribute');
  const headers = await read('_headers');
  assert.ok(!headers.includes("'unsafe-inline'"));
  assert.ok(headers.includes("script-src 'self'"));
});

test('the site address is consistent across the release files', async () => {
  const html = await read('index.html');
  const url = /<link rel="canonical" href="([^"]+)">/.exec(html)[1];
  assert.ok(url.endsWith('/'));
  for (const file of ['robots.txt', 'sitemap.xml']) assert.ok((await read(file)).includes(url), `${file} lacks ${url}`);
  assert.ok(html.includes(`<meta property="og:url" content="${url}">`));
  assert.ok(html.includes(`content="${url}icons/og.png"`));
});

test('the 404 page resolves its assets from the root', async () => {
  const html = await read('404.html');
  assert.ok(html.includes('<base href="/">'));
  assert.ok(html.includes('name="robots" content="noindex"'));
});
