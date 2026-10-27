// UI strings in English and Simplified Chinese. The genre data carries its own
// translations; this file holds everything else the page says. t(key, params)
// reads the current language and falls back to English.

const STORAGE_KEY = 'genryu:lang';

export const STRINGS = {
  en: {
    'site.name': 'Genryu',
    'site.brand': 'Genryu',
    'site.title': 'Genryu · A family tree of popular music',
    'site.description': 'A family tree of popular music: 91 genres placed by year and family, each with its origin, the genres it grew out of and led to, its key artists and records, and a short sketch of its sound you can play part by part.',
    'skip.link': 'Skip to content',
    'nav.site': 'Site',
    'nav.tree': 'Tree',
    'nav.families': 'Families',
    'nav.about': 'About',
    'nav.source': 'Source code on GitHub',
    'theme.toggle': 'Switch between light and dark',
    'lang.toggle': 'Switch language',
    'hero.title': 'A family tree of popular music',
    'hero.intro': 'Genres from the blues to today, placed by the year each one appeared and grouped by family. Open a genre for when and where it began, what it grew out of and led to, its key artists and records, and a short sketch of how it sounds.',
    'hero.count': '{genres} genres in {families} families, 1900s to 2020s',
    'tree.title': 'The tree',
    'tree.hint': 'Time runs left to right and each coloured row is a family. A solid line means the later genre grew out of the earlier one, a dotted line a lighter influence, a dashed line a reaction against it. Click a genre to open it.',
    'tree.legend': 'Families',
    'tree.legendHint': 'Click a family to pick it out',
    'tree.artists': 'Show artists',
    'tree.key.parent': 'grew out of',
    'tree.key.influence': 'also influenced by',
    'tree.key.backlash': 'reacted against',
    'tree.zoomIn': 'Zoom in',
    'tree.zoomOut': 'Zoom out',
    'tree.fit': 'Fit to screen',
    'tree.region': 'Genre family tree',
    'tree.aria': 'Genre family tree, {n} genres from {from} to {to}',
    'tree.node': '{name}, {era}, {family}',
    'families.title': 'Families',
    'families.intro': 'One card per row of the tree, with its genres in the order they appeared.',
    'families.count': '{n} genres',
    'families.span': '{from} to {to}',
    'families.show': 'Show on the tree',
    'era.pre': 'Before 1950',
    'era.decade': '{decade}s',
    'detail.close': 'Close',
    'detail.lineage': 'Lineage',
    'detail.parents': 'Grew out of',
    'detail.children': 'Led to',
    'detail.influences': 'Also shaped by',
    'detail.none': 'none on this tree',
    'detail.root': 'none: a root of the tree',
    'detail.artists': 'Key artists and records',
    'detail.sketch': 'A sketch of the sound',
    'detail.sketchIntro': 'A few bars written for this site and synthesized by your browser, not a recording. Mute or solo the parts to hear each one on its own.',
    'detail.listen': 'What to listen for',
    'detail.wiki': 'Read more on Wikipedia',
    'detail.prev': 'Previous genre',
    'detail.next': 'Next genre',
    'detail.share': 'Copy link',
    'detail.copied': 'Link copied',
    'player.play': 'Play',
    'player.pause': 'Stop',
    'player.playing': 'Playing the {name} sketch',
    'player.bpm': '{bpm} beats per minute',
    'player.pace.slow': 'Slow',
    'player.pace.relaxed': 'Relaxed',
    'player.pace.medium': 'Mid-tempo',
    'player.pace.fast': 'Fast',
    'player.pace.veryfast': 'Very fast',
    'player.drums': 'Drums: {kit}',
    'player.tempo': 'Speed',
    'player.volume': 'Volume',
    'player.mute': 'Mute {track}',
    'player.solo': 'Hear only {track}',
    'player.unsupported': 'This browser cannot play audio here, so the sketch is shown but silent.',
    'player.bar': 'Bar {n}',
    'player.steps': 'notes',
    'player.parts': 'Parts',
    'player.sketches': 'Sketches',
    'track.kick': 'Kick',
    'track.snare': 'Snare',
    'track.hat': 'Hi-hat',
    'track.perc': 'Percussion',
    'track.bass': 'Bass',
    'track.chords': 'Chords',
    'track.lead': 'Melody',
    'track.pad': 'Pad',
    'track.texture': 'Texture',
    'track.keys': 'Keys',
    'track.guitar': 'Guitar',
    'track.horns': 'Horns',
    'track.strings': 'Strings',
    'track.drums': 'Drums',
    'track.vocal': 'Voice',
    'work.single': 'single',
    'work.song': 'song',
    'work.ep': 'EP',
    'work.compilation': 'compilation',
    'work.soundtrack': 'soundtrack',
    'work.mixtape': 'mixtape',
    'work.live': 'live album',
    'work.recording': 'recording',
    'about.title': 'About',
    'about.body1': 'Genryu, 源流, is a Japanese and Chinese word for the source and course of a tradition: where it began and how it flowed. The site places 91 popular-music genres on one tree, in 13 families, from the blues of the 1900s to the internet genres of the 2020s. Each genre has a date and place of origin, the genres it grew out of and led to, its key artists and records, and a short original sketch of its sound.',
    'about.body2': 'The sketches are not recordings. Each is a few bars written for this site and synthesized live by the browser, which models the drums, strings, keys, horns and voices itself, so nothing is downloaded and no recording is used. They are simplified on purpose: the drum pattern, the bass, the harmony and the lead of a style, not a song. The records listed on each page are the real thing.',
    'about.body3': 'The rock section began from Alexander Okunev\'s Rock Music Tree (2012), the chart shared on r/coolguides. The lineage comes from Wikipedia\'s genre histories, Musicmap and Ishkur\'s Guide to Electronic Music, and the artists on each page are the ones those histories agree mattered most. Where sources disagree about a parent, the main line follows the majority and the other view is drawn as an influence.',
    'about.sources': 'Sources',
    'about.license': 'Code, data, text and sketches are licensed CC BY-NC-SA 4.0. Artist, record and genre names belong to their owners.',
    'about.privacy': 'No cookies, no analytics. Your language, theme and artists choice stay in your browser, and nothing is sent anywhere.',
    'footer.made': 'Made by Luminoid',
    'sr.selected': '{name} opened',
    'sr.playing': 'Playing the {name} sketch',
    'sr.stopped': 'Playback stopped',
    'sr.sketch': '{name} sketch selected',
    'sr.mute': '{track} muted',
    'sr.unmute': '{track} unmuted',
    'sr.family': 'Highlighting {family}',
    'sr.familyOff': 'Highlight cleared',
    'sr.artistsOn': 'Artists shown on the tree',
    'sr.artistsOff': 'Artists hidden',
  },
  zh: {
    'site.name': 'Genryu',
    'site.brand': '源流',
    'site.title': '源流 · 流行音乐族谱树',
    'site.description': '一棵流行音乐的族谱树：91 种曲风按年份与家族排开，各有起源、源自与衍生出的曲风、代表艺人与唱片，以及一段可以逐声部播放的声音速写。',
    'skip.link': '跳到内容',
    'nav.site': '站点',
    'nav.tree': '族谱树',
    'nav.families': '家族',
    'nav.about': '关于',
    'nav.source': '在 GitHub 查看源码',
    'theme.toggle': '切换明暗主题',
    'lang.toggle': '切换语言',
    'hero.title': '流行音乐的族谱树',
    'hero.intro': '从布鲁斯到今天的各种曲风，按出现的年份排列、按家族分行。点开一种曲风，看它何时何地出现、源自什么、衍生出什么、代表艺人与唱片，再听一段它的声音速写。',
    'hero.count': '{families} 个家族、{genres} 种曲风，从 1900 年代到 2020 年代',
    'tree.title': '族谱树',
    'tree.hint': '时间从左向右，每条色带是一个家族。实线表示后者源自前者，点线是较轻的影响，虚线是对前者的反叛。点击曲风可打开详情。',
    'tree.legend': '家族',
    'tree.legendHint': '点击家族名把它单独突出',
    'tree.artists': '显示艺人',
    'tree.key.parent': '源自',
    'tree.key.influence': '也受其影响',
    'tree.key.backlash': '反叛',
    'tree.zoomIn': '放大',
    'tree.zoomOut': '缩小',
    'tree.fit': '适应屏幕',
    'tree.region': '曲风族谱树',
    'tree.aria': '曲风族谱树，{n} 种曲风，从 {from} 到 {to}',
    'tree.node': '{name}，{era}，{family}',
    'families.title': '家族',
    'families.intro': '树上每条色带一张卡片，曲风按出现先后排列。',
    'families.count': '{n} 种曲风',
    'families.span': '{from}至{to}',
    'families.show': '在树上查看',
    'era.pre': '1950 年以前',
    'era.decade': '{decade} 年代',
    'detail.close': '关闭',
    'detail.lineage': '谱系',
    'detail.parents': '源自',
    'detail.children': '衍生出',
    'detail.influences': '其他影响',
    'detail.none': '树上没有',
    'detail.root': '无：这是树根之一',
    'detail.artists': '代表艺人与唱片',
    'detail.sketch': '声音速写',
    'detail.sketchIntro': '为本站写的几个小节，由浏览器合成，不是录音。把声部静音或独奏，可以单独听每一层。',
    'detail.listen': '听什么',
    'detail.wiki': '在维基百科阅读更多',
    'detail.prev': '上一种曲风',
    'detail.next': '下一种曲风',
    'detail.share': '复制链接',
    'detail.copied': '链接已复制',
    'player.play': '播放',
    'player.pause': '停止',
    'player.playing': '正在播放 {name} 的速写',
    'player.bpm': '每分钟 {bpm} 拍',
    'player.pace.slow': '慢',
    'player.pace.relaxed': '舒缓',
    'player.pace.medium': '中速',
    'player.pace.fast': '快',
    'player.pace.veryfast': '极快',
    'player.drums': '鼓：{kit}',
    'player.tempo': '速度',
    'player.volume': '音量',
    'player.mute': '静音 {track}',
    'player.solo': '只听 {track}',
    'player.unsupported': '此浏览器无法在这里播放声音，速写只能看、不能听。',
    'player.bar': '第 {n} 小节',
    'player.steps': '个音',
    'player.parts': '声部',
    'player.sketches': '速写',
    'track.kick': '底鼓',
    'track.snare': '军鼓',
    'track.hat': '踩镲',
    'track.perc': '打击乐',
    'track.bass': '贝斯',
    'track.chords': '和弦',
    'track.lead': '旋律',
    'track.pad': '铺底',
    'track.texture': '质感',
    'track.keys': '键盘',
    'track.guitar': '吉他',
    'track.horns': '铜管',
    'track.strings': '弦乐',
    'track.drums': '鼓',
    'track.vocal': '人声',
    'work.single': '单曲',
    'work.song': '歌曲',
    'work.ep': 'EP',
    'work.compilation': '合辑',
    'work.soundtrack': '原声带',
    'work.mixtape': '混音带',
    'work.live': '现场专辑',
    'work.recording': '录音',
    'about.title': '关于',
    'about.body1': '源流，就是一样东西从哪里来、怎样流变。本站把 91 种流行音乐曲风放在一棵树上，分成 13 个家族，从 1900 年代的布鲁斯到 2020 年代的网络曲风。每种曲风都有起源的年代与地点、它源自与衍生出的曲风、代表艺人与唱片，以及一段原创的声音速写。',
    'about.body2': '速写不是录音。每一段都是为本站写的几个小节，由浏览器实时合成，鼓、弦乐、键盘、管乐和人声都由它自己模拟，无需下载，也不使用任何录音。它们有意简化：只有一种风格的鼓点、贝斯、和声与主奏，不是一首歌。每页列出的唱片才是真正的音乐。',
    'about.body3': '摇滚部分始于 Alexander Okunev 2012 年的 Rock Music Tree（r/coolguides 上流传的那张图）。谱系来自维基百科的曲风历史、Musicmap 和 Ishkur 的电子音乐指南，每页列出的艺人是这些资料公认最重要的那些。来源对某个曲风的父系有分歧时，主线取多数意见，另一种看法画成影响线。',
    'about.sources': '参考来源',
    'about.license': '代码、数据、文字与速写乐段以 CC BY-NC-SA 4.0 许可发布；艺人、唱片与曲风名称归其所有者。',
    'about.privacy': '没有 Cookie，也没有统计脚本。语言、主题和艺人显示的选择只保存在你的浏览器里，不会发送到任何地方。',
    'footer.made': '由 Luminoid 制作',
    'sr.selected': '已打开 {name}',
    'sr.playing': '正在播放 {name} 的速写',
    'sr.stopped': '播放已停止',
    'sr.sketch': '已选择速写：{name}',
    'sr.mute': '{track} 已静音',
    'sr.unmute': '{track} 已取消静音',
    'sr.family': '正在突出显示{family}',
    'sr.familyOff': '已取消突出显示',
    'sr.artistsOn': '已在树上显示艺人',
    'sr.artistsOff': '已隐藏艺人',
  },
};

let current = 'en';

function storage(action, value) {
  try {
    if (action === 'get') return localStorage.getItem(STORAGE_KEY);
    localStorage.setItem(STORAGE_KEY, value);
  } catch (e) {
    /* storage blocked: the choice lasts for this page only */
  }
  return null;
}

/** Pick the language: ?lang=, then the remembered one, then the browser's. */
export function initLang() {
  const url = new URL(location.href);
  const param = url.searchParams.get('lang');
  const saved = storage('get');
  const browser = (navigator.language || '').toLowerCase().startsWith('zh') ? 'zh' : 'en';
  current = param === 'zh' || param === 'en' ? param : saved === 'zh' || saved === 'en' ? saved : browser;
  if (param) storage('set', current);
  document.documentElement.lang = current === 'zh' ? 'zh-Hans' : 'en';
  return current;
}

export function getLang() {
  return current;
}

export function setLang(lang) {
  current = lang === 'zh' ? 'zh' : 'en';
  storage('set', current);
  document.documentElement.lang = current === 'zh' ? 'zh-Hans' : 'en';
}

/** Translate a UI key; {name} placeholders come from params. */
export function t(key, params = {}) {
  const text = STRINGS[current][key] ?? STRINGS.en[key] ?? key;
  return text.replace(/\{(\w+)\}/g, (m, k) => (params[k] !== undefined ? String(params[k]) : m));
}

/** Pick the current language from a { en, zh } object (strings pass through). */
export function pick(value) {
  if (value && typeof value === 'object') return value[current] ?? value.en ?? '';
  return value ?? '';
}

/** Apply data-i18n attributes in a subtree. */
export function applyStatic(root = document) {
  for (const el of root.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
  for (const el of root.querySelectorAll('[data-i18n-aria]')) el.setAttribute('aria-label', t(el.dataset.i18nAria));
  for (const el of root.querySelectorAll('[data-i18n-title]')) el.title = t(el.dataset.i18nTitle);
}
