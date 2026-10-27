// Render every sketch in headless Chrome through tests/render.html and report
// peak, RMS and per-track level, so a silent track, a clipping mix or a piece
// that throws is caught without anyone listening. Also screenshots the page
// (and a genre panel) for a visual check.
//
//   node scripts/render-check.mjs [--shots] [--tracks] [--only <genre-id>[,<genre-id>...]] [--wav | --wav-tracks]
//   node scripts/render-check.mjs --instruments [--only <preset|kit|drum>[,...]]
//
// --tracks also prints every track's solo level, to compare parts within a sketch.
// --wav writes each rendered mix to tests/out/wav/<id>.wav (--wav-tracks every solo
// track as well), for listening outside the browser or for spectral analysis.
// --instruments renders every instrument preset alone (a short phrase in its usual
// register) and every drum sound of every kit through tests/instruments.html, and
// writes them all to tests/out/wav/instruments/.
//
// Needs Google Chrome at the usual macOS path (CHROME=... overrides) and a free port.
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);
const shots = args.includes('--shots');
const showTracks = args.includes('--tracks');
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
const instruments = args.includes('--instruments');
const wav = instruments ? 'all' : args.includes('--wav-tracks') ? 'tracks' : args.includes('--wav') ? 'mix' : null;
const chrome = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const outDir = process.env.OUT || join(root, 'tests', 'out');

const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const server = createServer(async (req, res) => {
  let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (path.endsWith('/')) path += 'index.html';
  try {
    const body = await readFile(join(root, path));
    res.writeHead(200, { 'content-type': types[extname(path)] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end('not found');
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const base = `http://127.0.0.1:${port}`;

const debugPort = 9300 + Math.floor(Math.random() * 400);
const profile = join(process.env.TMPDIR || '/tmp', `genryu-chrome-${process.pid}`);
const proc = spawn(chrome, ['--headless=new', `--remote-debugging-port=${debugPort}`, `--user-data-dir=${profile}`, '--autoplay-policy=no-user-gesture-required', '--no-first-run', '--window-size=1400,1000', 'about:blank'], { stdio: 'ignore' });

async function target() {
  for (let i = 0; i < 50; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json();
      const page = list.find((t) => t.type === 'page');
      if (page) return page;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('Chrome did not start');
}

const page = await target();
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let seq = 0;
const pending = new Map();
const exceptions = [];
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
  }
  if (msg.method === 'Runtime.exceptionThrown') exceptions.push(msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text);
};
const send = (method, params = {}) => new Promise((resolve) => {
  const id = ++seq;
  pending.set(id, resolve);
  ws.send(JSON.stringify({ id, method, params }));
});
const evaluate = async (expression, awaitPromise = false) => {
  const r = await send('Runtime.evaluate', { expression, awaitPromise, returnByValue: true });
  if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.text);
  return r.result?.result?.value;
};
await send('Page.enable');
await send('Runtime.enable');

async function navigate(url) {
  await send('Page.navigate', { url });
  await new Promise((r) => setTimeout(r, 400));
}

async function shot(name) {
  await mkdir(outDir, { recursive: true });
  const r = await send('Page.captureScreenshot', { format: 'png' });
  await writeFile(join(outDir, name), Buffer.from(r.result.data, 'base64'));
  console.log(`shot ${join(outDir, name)}`);
}

let failed = 0;
try {
  const query = new URLSearchParams();
  if (only) query.set('only', only);
  if (wav && !instruments) query.set('wav', wav);
  await navigate(`${base}/tests/${instruments ? 'instruments' : 'render'}.html${query.size ? `?${query}` : ''}`);
  const start = Date.now();
  while ((await evaluate('document.title')) !== 'done') {
    if (Date.now() - start > 3600000) throw new Error('render timed out');
    await new Promise((r) => setTimeout(r, 500));
  }
  const results = await evaluate('window.__results');
  const rows = Object.entries(results);
  for (const [id, r] of rows) {
    if (!r.ok) {
      failed++;
      console.log(`FAIL ${id}: ${r.error}`);
      continue;
    }
    if (instruments) {
      const flags = [];
      if (r.peak > 0.99) flags.push('CLIPS');
      if (r.peak < 0.02) flags.push('QUIET'); // a single hit in a bar of silence has a small RMS by nature
      if (flags.length) failed++;
      console.log(`${flags.length ? 'WARN' : 'ok  '} ${id.padEnd(28)} peak ${r.peak.toFixed(2)} rms ${r.rms.toFixed(3)} ${flags.join(' ')}`);
      continue;
    }
    const quiet = Object.entries(r.tracks).filter(([, rms]) => rms < 0.001).map(([t]) => t);
    const loud = Object.entries(r.tracks).filter(([, rms]) => rms > 0.25).map(([t]) => t);
    const flags = [];
    if (r.peak > 0.99) flags.push('CLIPS');
    if (r.rms < 0.02) flags.push('QUIET');
    if (quiet.length) flags.push(`silent:${quiet.join(',')}`);
    if (loud.length) flags.push(`hot:${loud.join(',')}`);
    if (flags.length) failed++;
    console.log(`${flags.length ? 'WARN' : 'ok  '} ${id.padEnd(24)} ${String(r.bars).padStart(2)} bars ${String(r.seconds).padStart(5)}s peak ${r.peak.toFixed(2)} rms ${r.rms.toFixed(3)} trim ${r.trim.toFixed(2)} ${flags.join(' ')}`);
    if (showTracks) console.log(`     ${Object.entries(r.tracks).map(([t, rms]) => `${t} ${rms.toFixed(3)}`).join('  ')}`);
  }
  console.log(`${rows.length} ${instruments ? 'renders' : 'sketches rendered'}, ${failed} flagged`);
  if (wav) {
    const wavDir = join(outDir, 'wav', ...(instruments ? ['instruments'] : []));
    await mkdir(wavDir, { recursive: true });
    const keys = await evaluate('Object.keys(window.__wavs)');
    for (const key of keys) {
      const data = await evaluate(`window.__wavs[${JSON.stringify(key)}]`);
      await writeFile(join(wavDir, `${key.replace('/', '-')}.wav`), Buffer.from(data, 'base64'));
    }
    console.log(`${keys.length} wav files in ${wavDir}`);
  }
  if (shots) {
    await send('Emulation.setDeviceMetricsOverride', { width: 1400, height: 1000, deviceScaleFactor: 1, mobile: false });
    await navigate(`${base}/`);
    await new Promise((r) => setTimeout(r, 800));
    await shot('home.png');
    await navigate(`${base}/#heavy-metal`);
    await new Promise((r) => setTimeout(r, 800));
    await shot('genre-heavy-metal.png');
    await navigate(`${base}/?lang=zh#post-rock`);
    await new Promise((r) => setTimeout(r, 800));
    await shot('genre-post-rock-zh.png');
    await evaluate("document.documentElement.dataset.theme = 'dark'");
    await new Promise((r) => setTimeout(r, 300));
    await shot('genre-post-rock-zh-dark.png');
    await evaluate("document.querySelector('#detail-close').click()");
    await new Promise((r) => setTimeout(r, 400));
    await shot('home-dark.png');
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await navigate(`${base}/#blues`);
    await new Promise((r) => setTimeout(r, 800));
    await shot('phone-blues.png');
    const overflow = await evaluate('document.documentElement.scrollWidth');
    console.log(`phone scrollWidth ${overflow}${overflow > 390 ? ' (OVERFLOW)' : ''}`);
    await navigate(`${base}/`);
    await new Promise((r) => setTimeout(r, 800));
    await shot('phone-home.png');
  }
  if (exceptions.length) {
    failed++;
    console.log('page exceptions:');
    for (const e of exceptions) console.log(`  ${e.split('\n')[0]}`);
  }
} finally {
  ws.close();
  proc.kill();
  server.close();
  // Chrome keeps writing to its profile for a moment after the kill; wait for it before removing the directory.
  await new Promise((resolve) => {
    proc.once('exit', resolve);
    setTimeout(resolve, 3000);
  });
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 });
}
process.exit(failed ? 1 : 0);
