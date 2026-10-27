// Render icons/favicon.svg and icons/og.svg to the PNG sizes the page links to.
// macOS only: QuickLook (qlmanage) rasterizes the SVG and sips resizes and crops;
// no other tools are needed. `make icons`.
//
// QuickLook paints SVGs onto white, so the PNG icons are rendered from a
// full-bleed copy of the favicon (no rounded corners: every platform applies its
// own mask) and the maskable icon from a copy whose artwork sits inside the
// safe zone. The SVG favicon itself keeps its rounded corners.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, copyFileSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../icons/', import.meta.url));
const tmp = mkdtempSync(join(tmpdir(), 'genryu-icons-'));
const ql = (svgPath, size) => {
  execFileSync('qlmanage', ['-t', '-s', String(size), '-o', tmp, svgPath], { stdio: 'ignore' });
  return join(tmp, `${svgPath.split('/').pop()}.png`);
};
const sips = (args) => execFileSync('sips', args, { stdio: 'ignore' });

const favicon = readFileSync(join(root, 'favicon.svg'), 'utf8');
const fullBleed = favicon.replace('rx="14"', 'rx="0"');
const maskable = fullBleed.replace('<path', '<g transform="translate(32 32) scale(0.72) translate(-32 -32)"><path').replace('</svg>', '</g></svg>');
writeFileSync(join(tmp, 'icon.svg'), fullBleed);
writeFileSync(join(tmp, 'maskable.svg'), maskable);

const big = ql(join(tmp, 'icon.svg'), 1024);
for (const [name, size] of [['icon-512.png', 512], ['icon-192.png', 192], ['icon-180.png', 180], ['icon-32.png', 32], ['icon-16.png', 16]]) {
  const out = join(root, name);
  copyFileSync(big, out);
  sips(['-z', String(size), String(size), out]);
}
const mask = ql(join(tmp, 'maskable.svg'), 1024);
copyFileSync(mask, join(root, 'icon-512-maskable.png'));
sips(['-z', '512', '512', join(root, 'icon-512-maskable.png')]);
// The OG card: a square document with the 1200x630 card centred, cropped after rendering.
const card = ql(join(root, 'og.svg'), 1200);
const og = join(root, 'og.png');
copyFileSync(card, og);
sips(['-c', '630', '1200', og]);
// The GitHub social preview: the same card at 1280x640.
const social = ql(join(root, 'og.svg'), 1280);
const preview = fileURLToPath(new URL('../.github/social-preview.png', import.meta.url));
copyFileSync(social, preview);
sips(['-c', '640', '1280', preview]);
rmSync(tmp, { recursive: true, force: true });
console.log('icons written');
