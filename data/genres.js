// The genre dataset: 13 families (id, name, a one-sentence blurb), each in its own file. A genre:
//   id, family, year (placement on the time axis), era/place/name/description/listen ({ en, zh }),
//   parents (main lineage, solid lines), influences (dotted), against (reactions, dashed),
//   root (true when it has no parents), artists [{ name, zh?, works: [{ title, year?, kind? }] }],
//   wiki ({ en, zh? } article titles).
import { ROOTS } from './genres/roots.js';
import { JAZZ } from './genres/jazz.js';
import { COUNTRY } from './genres/country.js';
import { ROCK } from './genres/rock.js';
import { METAL } from './genres/metal.js';
import { PUNK } from './genres/punk.js';
import { ALTERNATIVE } from './genres/alternative.js';
import { POP } from './genres/pop.js';
import { SOUL } from './genres/soul.js';
import { HIPHOP } from './genres/hiphop.js';
import { ELECTRONIC } from './genres/electronic.js';
import { REGGAE } from './genres/reggae.js';
import { LATIN } from './genres/latin.js';

export const FAMILIES = [
  { id: 'roots', name: { en: 'Roots', zh: '源头' }, blurb: { en: 'Where it all starts: the blues, early jazz, gospel, Tin Pan Alley song and rhythm and blues, the music everything else grew from.', zh: '一切的起点：布鲁斯、早期爵士、福音、叮砰巷歌曲与节奏布鲁斯，其他曲风都从这里长出。' } },
  { id: 'jazz', name: { en: 'Jazz', zh: '爵士' }, blurb: { en: 'Improvised music from New Orleans onward: swing, bebop, cool, hard bop, modal, free and fusion.', zh: '从新奥尔良出发的即兴音乐：摇摆、比波普、冷爵士、硬波普、调式、自由与融合。' } },
  { id: 'country', name: { en: 'Country & Folk', zh: '乡村与民谣' }, blurb: { en: 'Songs of the rural South and the folk revival: country, folk, bluegrass and their later heirs.', zh: '美国南方乡间与民谣复兴的歌：乡村、民谣、蓝草及其后继者。' } },
  { id: 'rock', name: { en: 'Rock', zh: '摇滚' }, blurb: { en: 'Rock and roll and the guitar bands that followed it through the 1950s, 60s and 70s.', zh: '摇滚乐，以及随之而来、贯穿五六七十年代的吉他乐队。' } },
  { id: 'metal', name: { en: 'Metal', zh: '金属' }, blurb: { en: 'Rock made heavier, faster and darker, from heavy metal to its extreme forms.', zh: '更重、更快、更暗的摇滚：从重金属到它的极端形态。' } },
  { id: 'punk', name: { en: 'Punk', zh: '朋克' }, blurb: { en: 'Three chords and a reaction against excess, and everything that came out of it: new wave, post-punk, hardcore, goth, emo.', zh: '三个和弦、对浮夸的反叛，以及由此生出的一切：新浪潮、后朋克、硬核、哥特、emo。' } },
  { id: 'alternative', name: { en: 'Alternative & Indie', zh: '另类与独立' }, blurb: { en: 'Guitar music from outside the mainstream since the 1980s: indie, shoegaze, grunge, Britpop, post-rock.', zh: '1980 年代以来主流之外的吉他音乐：独立、自赏、垃圾摇滚、英伦与后摇。' } },
  { id: 'pop', name: { en: 'Pop', zh: '流行' }, blurb: { en: 'Music made for the charts, from the producers\' studios of the 1980s to today\'s global scenes.', zh: '为排行榜而生的音乐：从 1980 年代制作人的录音室到今天的全球场景。' } },
  { id: 'soul', name: { en: 'Soul, Funk & R&B', zh: '灵魂、放克与 R&B' }, blurb: { en: 'Gospel feeling in secular songs: soul, funk, disco and the R&B that followed.', zh: '带着福音情感的世俗歌曲：灵魂乐、放克、迪斯科与之后的 R&B。' } },
  { id: 'hiphop', name: { en: 'Hip-Hop', zh: '嘻哈' }, blurb: { en: 'Rhymes over beats, from the Bronx block party to the most popular music in the world.', zh: '节拍之上的押韵：从布朗克斯的街区派对到全世界最流行的音乐。' } },
  { id: 'electronic', name: { en: 'Electronic', zh: '电子' }, blurb: { en: 'Music built from machines: synthesizers, drum machines, samplers, and the dance floors that shaped them.', zh: '用机器造出的音乐：合成器、鼓机、采样器，以及塑造它们的舞池。' } },
  { id: 'reggae', name: { en: 'Jamaica', zh: '牙买加' }, blurb: { en: 'The island\'s own line: ska, reggae, dub and dancehall, and the sound-system culture around them.', zh: '这座岛自己的一脉：斯卡、雷鬼、Dub 与舞厅雷鬼，以及围绕它们的音响系统文化。' } },
  { id: 'latin', name: { en: 'Latin & Africa', zh: '拉丁与非洲' }, blurb: { en: 'Latin America and Africa in conversation with the rest of the world: bossa nova, salsa, reggaeton, Afrobeat and Afrobeats.', zh: '拉丁美洲与非洲同世界的对话：波萨诺瓦、萨尔萨、雷鬼顿、Afrobeat 与 Afrobeats。' } },
];

export const GENRES = [...ROOTS, ...JAZZ, ...COUNTRY, ...ROCK, ...METAL, ...PUNK, ...ALTERNATIVE, ...POP, ...SOUL, ...HIPHOP, ...ELECTRONIC, ...REGGAE, ...LATIN];
