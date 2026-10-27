// The page: renders the tree, the family cards and the genre panel with its
// sketch player, and routes `#<genre-id>` to the panel. Strings come from
// i18n.js, genre data from data/genres.js and the sketches from data/pieces.js.

import { GENRES, FAMILIES } from '../data/genres.js';
import { sketchesOf } from '../data/pieces.js';
import { initLang, getLang, setLang, t, pick, applyStatic } from './i18n.js';
import { renderTree, decadeTicks } from './tree.js';
import { renderSequencer, trackName } from './sequencer-view.js';
import { Player, KITS } from './audio.js';
import { compilePiece } from './pattern.js';

const byId = new Map(GENRES.map((g) => [g.id, g]));
const ordered = [...GENRES].sort((a, b) => a.year - b.year || a.id.localeCompare(b.id));
let tree = null;
let player = null;
let sequencer = null;
let openId = null;
let focusedFamily = null;
let announceTimer = 0;
const ARTISTS_KEY = 'genryu:artists';
let showArtists = (() => {
  try {
    return localStorage.getItem(ARTISTS_KEY) === '1';
  } catch (e) {
    return false;
  }
})();

const $ = (sel, root = document) => root.querySelector(sel);

function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k === 'html') el.innerHTML = v;
    else el.setAttribute(k, v);
  }
  for (const c of children) if (c !== null && c !== undefined && c !== false) el.append(c);
  return el;
}

/** Speak a status line. The genre panel is modal, so while it is open the message goes to the live region inside it. */
function announce(text) {
  const node = $('#detail').open ? $('#sr-detail') : $('#sr');
  clearTimeout(announceTimer);
  node.textContent = '';
  announceTimer = setTimeout(() => {
    node.textContent = text;
  }, 50);
}

const familyOf = (id) => FAMILIES.find((f) => f.id === id);

// --- Rendering ------------------------------------------------------------------

function renderHero() {
  $('#hero-count').textContent = t('hero.count', { genres: GENRES.length, families: FAMILIES.length });
}

function edgeKey(kind, label) {
  const el = h('span', { class: `edge-key ${kind}` });
  el.innerHTML = '<svg viewBox="0 0 34 10" aria-hidden="true"><line x1="2" y1="5" x2="32" y2="5"/></svg>';
  el.append(label);
  return el;
}

function renderTreeSection() {
  const wrap = $('#tree-wrap');
  wrap.textContent = '';
  const axis = h('div', { class: 'tree-axis', 'aria-hidden': 'true' });
  const zoom = h('div', { class: 'tree-zoom' });
  tree = renderTree(GENRES, FAMILIES, { onSelect: () => {}, artists: showArtists });
  $('#tree-artists').setAttribute('aria-pressed', String(showArtists));
  tree.ticks = decadeTicks().map((tick) => {
    const span = h('span', { text: String(tick.year) });
    axis.append(span);
    return { ...tick, span };
  });
  zoom.append(tree.element);
  wrap.append(axis, zoom);
  applyZoom(wrap, zoom, axis, currentZoom);

  const legend = $('#tree-legend');
  legend.textContent = '';
  legend.append(h('span', { class: 'legend-hint', text: t('tree.legendHint') }));
  for (const f of FAMILIES) {
    const btn = h('button', { type: 'button', class: 'swatch', 'data-family': f.id, 'aria-pressed': String(focusedFamily === f.id), title: pick(f.blurb) }, h('i', { 'aria-hidden': 'true' }), pick(f.name));
    btn.addEventListener('click', () => setFamilyFocus(focusedFamily === f.id ? null : f.id));
    legend.append(btn);
  }
  const key = $('#tree-key');
  key.textContent = '';
  key.append(edgeKey('parent', t('tree.key.parent')), edgeKey('influence', t('tree.key.influence')), edgeKey('backlash', t('tree.key.backlash')));
  if (openId) tree.select(openId);
  tree.focusFamily(focusedFamily);
}

function setFamilyFocus(id) {
  focusedFamily = id;
  tree?.focusFamily(id);
  for (const btn of document.querySelectorAll('#tree-legend .swatch')) btn.setAttribute('aria-pressed', String(btn.dataset.family === id));
  announce(id ? t('sr.family', { family: pick(familyOf(id).name) }) : t('sr.familyOff'));
}

/** Show or hide the artist line under every node; the tree is laid out again and keeps its place. */
function setArtists(on) {
  showArtists = on;
  try {
    localStorage.setItem(ARTISTS_KEY, on ? '1' : '0');
  } catch (e) {
    /* storage blocked: the choice lasts for this page only */
  }
  const wrap = $('#tree-wrap');
  const left = wrap.scrollLeft;
  const topRatio = wrap.scrollTop / Math.max(1, wrap.scrollHeight);
  renderTreeSection();
  if (fitted) fitTree();
  wrap.scrollLeft = left;
  wrap.scrollTop = topRatio * wrap.scrollHeight;
  announce(t(on ? 'sr.artistsOn' : 'sr.artistsOff'));
}

// The tree opens at actual size, where its labels are readable; "Fit to screen" is the overview.
let currentZoom = 1;
let fitted = false;
function applyZoom(wrap, zoom, axis, scale) {
  currentZoom = scale;
  zoom.style.transform = `scale(${scale})`;
  zoom.style.width = `${tree.layout.width * scale}px`;
  zoom.style.height = `${tree.layout.height * scale}px`;
  // the axis labels move with the zoom but keep their own size
  axis.style.width = `${tree.layout.width * scale}px`;
  for (const tick of tree.ticks) tick.span.style.left = `${tick.x * scale}px`;
}

function setZoom(scale, { fit = false } = {}) {
  fitted = fit;
  const wrap = $('#tree-wrap');
  applyZoom(wrap, $('.tree-zoom', wrap), $('.tree-axis', wrap), Math.max(0.35, Math.min(1.6, scale)));
}

function fitTree() {
  const wrap = $('#tree-wrap');
  setZoom((wrap.clientWidth - 2) / tree.layout.width, { fit: true });
}

const scrollBehavior = () => (matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth');

function scrollTreeTo(id) {
  const node = tree.byId.get(id);
  if (!node) return;
  const wrap = $('#tree-wrap');
  const x = (node.x + node.w / 2) * currentZoom - wrap.clientWidth / 2;
  const y = (node.y + node.h / 2) * currentZoom - wrap.clientHeight / 2;
  wrap.scrollTo({ left: Math.max(0, x), top: Math.max(0, y), behavior: scrollBehavior() });
}

function chip(genre) {
  return h('a', { class: 'chip', href: `#${genre.id}`, 'data-family': genre.family }, h('i', { 'aria-hidden': 'true' }), pick(genre.name));
}

function decadeLabel(year) {
  return year < 1950 ? t('era.pre') : t('era.decade', { decade: Math.floor(year / 10) * 10 });
}

function renderFamilies() {
  const grid = $('#families-grid');
  grid.textContent = '';
  for (const f of FAMILIES) {
    const members = ordered.filter((g) => g.family === f.id);
    const card = h('article', { class: 'family-card', 'data-family': f.id, 'aria-labelledby': `family-${f.id}` });
    const head = h('div', { class: 'family-head' }, h('h3', { id: `family-${f.id}`, text: pick(f.name) }));
    const show = h('button', { type: 'button', class: 'link-btn', text: t('families.show') });
    show.addEventListener('click', () => {
      setFamilyFocus(f.id);
      $('#tree').scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
    });
    head.append(show);
    card.append(head, h('p', { class: 'family-blurb', text: pick(f.blurb) }));
    const from = decadeLabel(members[0].year);
    const to = decadeLabel(members[members.length - 1].year);
    card.append(h('p', { class: 'family-meta', text: `${t('families.count', { n: members.length })} · ${from === to ? from : t('families.span', { from, to })}` }));
    const chips = h('div', { class: 'chips' });
    for (const g of members) chips.append(chip(g));
    card.append(chips);
    grid.append(card);
  }
}

function workLabel(work) {
  const kind = work.kind && work.kind !== 'album' ? h('span', { class: 'kind', text: ` (${t(`work.${work.kind}`)})` }) : null;
  return h('span', { class: 'work' }, h('em', { text: work.title }), work.year ? h('span', { class: 'work-year', text: ` ${work.year}` }) : '', kind);
}

function renderArtists(genre) {
  const ul = h('ul', { class: 'artists' });
  for (const artist of genre.artists) {
    const name = h('div', { class: 'name', text: artist.name });
    if (artist.zh && getLang() === 'zh') name.append(h('span', { class: 'zh-name', text: artist.zh }));
    const works = h('div', { class: 'works' });
    for (const w of artist.works) works.append(workLabel(w));
    if (artist.note) works.append(h('span', { class: 'work note', text: pick(artist.note) }));
    ul.append(h('li', { class: 'artist' }, name, works));
  }
  return ul;
}

function relatedChips(ids) {
  const box = h('div', { class: 'chips' });
  const list = ids.map((id) => byId.get(id)).filter(Boolean);
  if (!list.length) return h('span', { class: 'none', text: t('detail.none') });
  for (const g of list) box.append(chip(g));
  return box;
}

function childrenOf(id) {
  return GENRES.filter((g) => (g.parents ?? []).includes(id)).map((g) => g.id);
}

function playIcon(playing) {
  return playing
    ? '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';
}

function pace(bpm) {
  if (bpm < 80) return 'slow';
  if (bpm < 105) return 'relaxed';
  if (bpm < 132) return 'medium';
  if (bpm < 168) return 'fast';
  return 'veryfast';
}

/** The player box: a row of tabs when a genre has several sketches, then the chosen sketch's controls and tracks. */
function renderPlayer(genre) {
  const sketches = sketchesOf(genre.id);
  const box = h('div', { class: 'player', 'data-family': genre.family });
  if (!sketches.length) {
    box.append(h('p', { class: 'player-status', text: t('detail.none') }));
    return box;
  }
  let mounted = null;
  const body = h('div', { class: 'player-body' });
  const mount = (i) => {
    mounted?.stop();
    body.textContent = '';
    mounted = mountSketch(genre, sketches[i], body);
    mounted.index = i;
  };
  if (sketches.length > 1) {
    const tabs = h('div', { class: 'sketch-tabs', role: 'group', 'aria-label': t('player.sketches') });
    sketches.forEach((piece, i) => {
      const tab = h('button', { type: 'button', class: 'sketch-tab', 'aria-pressed': String(i === 0), text: pick(piece.title) });
      tab.addEventListener('click', () => {
        if (mounted?.index === i) return;
        for (const b of tabs.children) b.setAttribute('aria-pressed', String(b === tab));
        mount(i);
        announce(t('sr.sketch', { name: pick(piece.title) }));
      });
      tabs.append(tab);
    });
    box.append(tabs);
  }
  box.append(body);
  mount(0);
  box.stopPlayback = () => mounted?.stop();
  return box;
}

/** One sketch's play bar, status line and track view, mounted into `box`; returns { stop }. */
function mountSketch(genre, piece, box) {
  const compiled = compilePiece(piece);
  const supported = Boolean(window.AudioContext || window.webkitAudioContext);
  const bar = h('div', { class: 'player-bar' });
  const playBtn = h('button', { type: 'button', class: 'play-btn' });
  playBtn.innerHTML = `${playIcon(false)}<span>${t('player.play')}</span>`;
  const meta = h('div', { class: 'meta' });
  meta.append(h('span', { class: 'pace', text: t(`player.pace.${pace(piece.bpm)}`) }), h('span', { text: t('player.bpm', { bpm: piece.bpm }) }));
  if (piece.kit && KITS[piece.kit]) meta.append(h('span', { text: t('player.drums', { kit: pick(KITS[piece.kit].name) }) }));
  const tempo = h('input', { type: 'range', min: '0.6', max: '1.3', step: '0.05', value: '1', 'aria-label': t('player.tempo') });
  const volume = h('input', { type: 'range', min: '0', max: '1', step: '0.05', value: String(player.volume), 'aria-label': t('player.volume') });
  const percent = (input) => input.setAttribute('aria-valuetext', `${Math.round(Number(input.value) * 100)}%`);
  percent(tempo);
  percent(volume);
  const controls = h('div', { class: 'player-controls' }, h('label', {}, t('player.tempo'), tempo), h('label', {}, t('player.volume'), volume));
  bar.append(playBtn, meta, controls);
  const status = h('div', { class: 'player-status', 'aria-live': 'off', text: supported ? '' : t('player.unsupported') });
  box.append(bar, status);

  sequencer = renderSequencer(compiled, piece, {
    onMute: (id) => {
      player.toggleMute(id);
      sequencer.setMuted(id, player.muted.has(id));
      sequencer.setAudible((tid) => player.trackAudible(compiled.tracks.findIndex((x) => x.track.id === tid)));
      announce(t(player.muted.has(id) ? 'sr.mute' : 'sr.unmute', { track: trackName(compiled.tracks.find((x) => x.track.id === id).track) }));
    },
    onSolo: (id) => {
      player.toggleSolo(id);
      sequencer.setSolo(id, player.solo.has(id));
      sequencer.setAudible((tid) => player.trackAudible(compiled.tracks.findIndex((x) => x.track.id === tid)));
    },
  });
  box.append(sequencer.element);

  player.load(piece);
  player.onStep = (step, fraction) => sequencer.setStep(step, fraction);
  const setPlaying = (on) => {
    playBtn.innerHTML = `${playIcon(on)}<span>${t(on ? 'player.pause' : 'player.play')}</span>`;
    box.parentElement?.classList.toggle('player-playing', on);
    status.textContent = on ? t('player.playing', { name: pick(genre.name) }) : '';
  };
  playBtn.addEventListener('click', () => {
    if (!supported) return;
    if (player.playing) {
      player.stop();
      setPlaying(false);
      announce(t('sr.stopped'));
    } else {
      try {
        player.play();
        setPlaying(true);
        announce(t('sr.playing', { name: pick(genre.name) }));
      } catch (err) {
        status.textContent = t('player.unsupported');
        console.error(err);
      }
    }
  });
  tempo.addEventListener('input', () => {
    player.setTempoScale(Number(tempo.value));
    percent(tempo);
  });
  volume.addEventListener('input', () => {
    player.setVolume(Number(volume.value));
    percent(volume);
  });
  return {
    stop() {
      if (player.playing) player.stop();
      setPlaying(false);
    },
  };
}

function lineageColumn(key, ids, emptyKey = 'detail.none') {
  const body = ids.length ? relatedChips(ids) : h('span', { class: 'none', text: t(emptyKey) });
  return h('div', { class: 'lineage-col' }, h('h3', { text: t(key) }), body);
}

function renderDetail(genre) {
  const panel = $('#detail-body');
  panel.textContent = '';
  panel.dataset.family = genre.family;
  const family = familyOf(genre.family);
  const index = ordered.indexOf(genre);
  const prev = ordered[(index - 1 + ordered.length) % ordered.length];
  const next = ordered[(index + 1) % ordered.length];
  $('#detail-prev').href = `#${prev.id}`;
  $('#detail-next').href = `#${next.id}`;

  const top = h('div', { class: 'detail-top' });
  top.append(h('div', { class: 'family-pill', 'data-family': genre.family }, h('i', { 'aria-hidden': 'true' }), pick(family.name)));
  top.append(h('h2', { id: 'detail-title', tabindex: '-1', text: pick(genre.name) }));
  top.append(h('p', { class: 'detail-sub' }, h('span', { text: pick(genre.era) }), h('span', { class: 'dot', 'aria-hidden': 'true', text: '·' }), h('span', { text: pick(genre.place) })));
  panel.append(top);

  const lineage = h('div', { class: 'lineage', role: 'group', 'aria-label': t('detail.lineage') });
  lineage.append(lineageColumn('detail.parents', genre.parents ?? [], genre.root ? 'detail.root' : 'detail.none'));
  if (genre.influences?.length) lineage.append(lineageColumn('detail.influences', genre.influences));
  lineage.append(lineageColumn('detail.children', childrenOf(genre.id)));
  panel.append(lineage);

  const desc = h('div', { class: 'detail-desc' });
  for (const para of pick(genre.description).split('\n\n')) desc.append(h('p', { text: para }));
  panel.append(desc);

  const sketch = h('section', { class: 'detail-section', 'aria-labelledby': 'sketch-title' });
  sketch.append(h('h3', { id: 'sketch-title', text: t('detail.sketch') }));
  sketch.append(h('p', { class: 'section-hint', text: t('detail.sketchIntro') }));
  const playerBox = renderPlayer(genre);
  sketch.append(playerBox);
  if (genre.listen) {
    const listen = h('div', { class: 'listen', 'data-family': genre.family });
    listen.append(h('strong', { text: t('detail.listen') }), h('p', { text: pick(genre.listen) }));
    sketch.append(listen);
  }
  panel.append(sketch);

  const records = h('section', { class: 'detail-section', 'aria-labelledby': 'artists-title' });
  records.append(h('h3', { id: 'artists-title', text: t('detail.artists') }));
  records.append(renderArtists(genre));
  panel.append(records);

  const links = h('div', { class: 'detail-links' });
  if (genre.wiki) {
    const url = getLang() === 'zh' && genre.wiki.zh ? `https://zh.wikipedia.org/wiki/${encodeURIComponent(genre.wiki.zh)}` : `https://en.wikipedia.org/wiki/${encodeURIComponent(genre.wiki.en ?? genre.wiki)}`;
    links.append(h('a', { class: 'btn', href: url, target: '_blank', rel: 'noopener', text: t('detail.wiki') }));
  }
  const share = h('button', { type: 'button', class: 'btn', text: t('detail.share') });
  share.addEventListener('click', async () => {
    const url = `${location.origin}${location.pathname}#${genre.id}`;
    try {
      await navigator.clipboard.writeText(url);
      share.textContent = t('detail.copied');
      announce(t('detail.copied'));
      setTimeout(() => (share.textContent = t('detail.share')), 1500);
    } catch (e) {
      // no clipboard access: show the address to copy by hand
      if (!$('.share-field', links)) links.append(h('input', { type: 'text', class: 'share-field', readonly: '', value: url, 'aria-label': t('detail.share') }));
      $('.share-field', links).select();
    }
  });
  links.append(share);
  panel.append(links);
  panel.playerBox = playerBox;
}

// --- Routing ------------------------------------------------------------------------

let lastFocus = null;

function openGenre(id, { focus = true } = {}) {
  const genre = byId.get(id);
  if (!genre) return;
  closePlayer();
  openId = id;
  const dialog = $('#detail');
  renderDetail(genre);
  if (!dialog.open) {
    lastFocus = document.activeElement;
    dialog.showModal ? dialog.showModal() : dialog.setAttribute('open', '');
    document.documentElement.classList.add('modal-open');
  }
  $('.detail-panel').scrollTop = 0;
  if (focus) $('#detail-title').focus();
  tree?.select(id);
  document.title = `${pick(genre.name)} · ${t('site.name')}`;
  announce(t('sr.selected', { name: pick(genre.name) }));
}

function closePlayer() {
  const box = $('#detail-body')?.playerBox;
  if (box?.stopPlayback) box.stopPlayback();
}

function closeGenre() {
  const dialog = $('#detail');
  closePlayer();
  if (dialog.open) dialog.close ? dialog.close() : dialog.removeAttribute('open');
  document.documentElement.classList.remove('modal-open');
  const id = openId;
  openId = null;
  tree?.select(null);
  document.title = t('site.title');
  if (byId.has(hashId())) history.replaceState(null, '', location.pathname + location.search);
  // focus goes back to whatever opened the panel (a chip, a card, a tree node), else to the genre's tree node
  if (lastFocus && lastFocus.isConnected && lastFocus.focus) lastFocus.focus();
  else if (id && tree?.nodeEls.has(id)) tree.nodeEls.get(id).focus();
}

/** The genre id in the address bar's hash, or '' (a malformed escape sequence is not a genre). */
function hashId() {
  try {
    return decodeURIComponent(location.hash.slice(1));
  } catch (e) {
    return '';
  }
}

function route() {
  const id = hashId();
  if (id && byId.has(id)) {
    openGenre(id);
    scrollTreeTo(id);
  } else if ($('#detail').open) closeGenre();
}

// --- Boot --------------------------------------------------------------------------------

function applyLang() {
  applyStatic();
  document.title = openId ? `${pick(byId.get(openId).name)} · ${t('site.name')}` : t('site.title');
  $('meta[name="description"]')?.setAttribute('content', t('site.description'));
  const toggle = $('#lang-toggle');
  toggle.textContent = getLang() === 'zh' ? 'English' : '中文';
  toggle.setAttribute('lang', getLang() === 'zh' ? 'en' : 'zh-Hans');
  toggle.title = t('lang.toggle');
  renderHero();
  renderTreeSection();
  renderFamilies();
  if (openId) renderDetail(byId.get(openId));
}

function init() {
  initLang();
  player = new Player();
  applyLang();
  setZoom(window.innerWidth < 760 ? 0.85 : 1); // phones start a touch smaller to show more decades; labels stay above 13px

  $('#lang-toggle').addEventListener('click', () => {
    setLang(getLang() === 'zh' ? 'en' : 'zh');
    closePlayer();
    applyLang(); // re-renders the open panel too
    if (fitted) fitTree();
  });
  $('#theme-toggle').addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem('genryu:theme', next);
    } catch (e) {
      /* storage blocked */
    }
  });
  $('#zoom-in').addEventListener('click', () => setZoom(currentZoom * 1.25));
  $('#zoom-out').addEventListener('click', () => setZoom(currentZoom / 1.25));
  $('#zoom-fit').addEventListener('click', fitTree);
  $('#tree-artists').addEventListener('click', () => setArtists(!showArtists));
  $('#detail-close').addEventListener('click', closeGenre);
  const dialog = $('#detail');
  dialog.addEventListener('cancel', (e) => {
    e.preventDefault();
    closeGenre();
  });
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) closeGenre();
  });
  window.addEventListener('hashchange', route);
  window.addEventListener('resize', () => {
    if (fitted) fitTree();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === ' ' && openId && !['INPUT', 'BUTTON', 'A', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
      e.preventDefault();
      $('.play-btn')?.click();
    }
  });
  route();
}

init();
