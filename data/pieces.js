// The sketches: original loops written in the piece format (js/pattern.js) and
// played by the engine (js/audio.js). Grouped by family; every entry is keyed by
// its genre id and is one piece, or a list of pieces each with a `title` { en, zh }
// when a genre has two faces worth hearing (Delta and Chicago blues, death and
// black metal). The sketches are original and quote no real melody.
import { ROOTS_PIECES } from './pieces/roots.js';
import { JAZZ_PIECES } from './pieces/jazz.js';
import { COUNTRY_PIECES } from './pieces/country.js';
import { ROCK_PIECES } from './pieces/rock.js';
import { METAL_PIECES } from './pieces/metal.js';
import { PUNK_PIECES } from './pieces/punk.js';
import { ALTERNATIVE_PIECES } from './pieces/alternative.js';
import { POP_PIECES } from './pieces/pop.js';
import { SOUL_PIECES } from './pieces/soul.js';
import { HIPHOP_PIECES } from './pieces/hiphop.js';
import { ELECTRONIC_PIECES } from './pieces/electronic.js';
import { REGGAE_PIECES } from './pieces/reggae.js';
import { LATIN_PIECES } from './pieces/latin.js';

/** The sketches of a genre as a list, whether the entry is one piece or several. */
export function sketchesOf(id) {
  const entry = PIECES[id];
  return Array.isArray(entry) ? entry : entry ? [entry] : [];
}

export const PIECES = {
  ...ROOTS_PIECES,
  ...JAZZ_PIECES,
  ...COUNTRY_PIECES,
  ...ROCK_PIECES,
  ...METAL_PIECES,
  ...PUNK_PIECES,
  ...ALTERNATIVE_PIECES,
  ...POP_PIECES,
  ...SOUL_PIECES,
  ...HIPHOP_PIECES,
  ...ELECTRONIC_PIECES,
  ...REGGAE_PIECES,
  ...LATIN_PIECES,
};
