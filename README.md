# Genryu

[![License](https://img.shields.io/badge/license-CC%20BY--NC--SA%204.0-lightgrey.svg)](LICENSE)
[![Dependencies](https://img.shields.io/badge/dependencies-none-brightgreen.svg)](#run-it)

Genryu (源流, the source and course of a tradition) is a family tree of popular music, live at `https://genre.luminoid.dev`. Ninety-one genres from the blues of the 1900s to the internet genres of the 2020s, placed by year and family, each with its origin, the genres it grew out of and led to, its key artists and records, and a short original sketch of its sound that the browser synthesizes and plays part by part. English and Simplified Chinese. Vanilla JavaScript, SVG and Web Audio, no build step, no dependencies: a folder of static files on any host.

<p align="center">
  <a href="https://genre.luminoid.dev"><img src=".github/social-preview.png" alt="Genryu: a family tree of popular music genres" width="720"></a>
</p>

## What is on the page

- **The tree**: every genre placed by the year its scene emerged and in its family's lane, with solid lines to its main parents, dotted lines for other influences and dashed lines where a genre defined itself against another (punk against prog, Britpop against grunge). Hover or focus a genre to light up its relatives; click to open it; click a family in the legend to pick it out. "Show artists" puts each genre's key names under its box, three to five of them. Zoom and scroll sideways through the decades.
- **A genre page** (a side panel, routed as `#<genre-id>` so it can be linked): when and where, its family, the genres it grew out of, was shaped by and led to, a two-paragraph history, the sketch with a note on what to listen for, the artists and records that defined it, and a link to Wikipedia.
- **The sketch**: a four-bar loop written for this site (a figure, its repeat and an answer), shown as a grid of parts (drums as dots, pitched parts as a small piano roll, chord names on the chord tracks) with a playhead, a mute and a solo button per part, and speed and volume controls. Genres whose name joins two styles carry two sketches, one per style, picked with a row of tabs: Delta and Chicago blues, death and black metal, jungle and drum and bass, Mandopop and Cantopop. Every part is named in plain words (upright bass, brushes, string section). Everything is synthesized in the browser: the drums are modelled (a kick with a shell tone and a beater knock, a snare with a shell tone and wire noise, cymbals from an inharmonic metal cluster), pianos and mallets are rendered from decaying partials, guitars and basses are plucked strings (a string drawn aside at the pluck point plus the pick's noise, losing its highs first as it rings), the electric ones through an amplifier model (tightening, tube-like stages, a speaker cabinet) with the rhythm guitars of the loud genres recorded twice and panned apart, brass is FM with a modulation index that rises through the attack over a plain fundamental, strings, fiddle, sax and harmonica are tones through body resonances with breath and vibrato, every player in a section vibrating at their own rate, the clarinet, flute and accordion have the harmonic spectra of their reeds and pipes, and the voices are a glottal pulse through five moving formants: each syllable opens from a consonant (a hum, a stop's click or a hiss) into its vowel and closes again, the pitch scoops in, wanders and jitters, vibrato arrives late, the breath goes through the same formants, higher parts get a smaller singer, and the shouted and spoken voices add a rough half-rate beat or a falling contour on every syllable; the 808, 909 and trap kits keep their electronic recipes on purpose. Nothing is downloaded and no recording is used.
- **The families**: one card per family with a one-sentence description and its genres in order, and a button that picks the family out on the tree.

## Run it

Any static file server works; the tests need Node 18 or newer, nothing else. From the project root:

```sh
make serve     # http://127.0.0.1:8124
make test      # node --test: data integrity, the piece format, the UI strings, the page's wiring and release files
make lint      # syntax check of every script and data file
make icons     # re-render the favicon and the Open Graph image (macOS: QuickLook + sips)
node scripts/render-check.mjs --shots --tracks   # renders every sketch in headless Chrome: levels per part, screenshots
node scripts/render-check.mjs --instruments      # every instrument and every drum of every kit alone, as WAV files
```

The render check also takes `--only a,b` to limit the sketches and `--wav` / `--wav-tracks` to keep the renders as WAV files under `tests/out/wav/`, for listening outside the browser.

`?lang=zh` or `?lang=en` on the URL picks the language (also remembered; the default follows the browser). `#<genre-id>` opens a genre.

## Layout

```
index.html               the page
css/styles.css           design tokens (dark and light), layout, the tree, the sequencer
js/main.js               renders the sections and the genre panel, routes the hash
js/tree.js               layout of the tree (pure) and its SVG renderer
js/sequencer-view.js     the track grid, playhead, mute and solo
js/audio.js              the engine: scheduler, modelled drums and kits, instrument presets with display names, effects, the Player
js/pattern.js            the piece format and its compiler (pure)
js/theory.js             note names, chord symbols, voicings (pure)
js/i18n.js               UI strings, English and Chinese
js/theme.js              applies the remembered theme before first paint
data/genres.js           the 13 families (name and blurb) and the genre list, assembled from data/genres/<family>.js
data/pieces.js           the sketches, assembled from data/pieces/<family>.js
icons/                   favicon.svg, og.svg and the PNGs made from them
tests/                   node --test suites, and the render.html and instruments.html pages the render check drives
scripts/                 serve.py (dev server), icons.mjs (icon renderer), render-check.mjs (renders every sketch offline and screenshots the page)
_headers, _redirects     Cloudflare Pages: security headers (a strict CSP with no inline code), favicon alias
404.html, robots.txt, sitemap.xml, manifest.webmanifest
```

## The data

A genre (`data/genres/<family>.js`) has an `id`, a `family`, a `year` (where it sits on the axis: the year its scene emerged, not its first record), `name`, `era`, `place`, `description` and `listen` in both languages, `parents` (main lineage), `influences` (secondary), `against` (reactions), `root: true` on the genres with no parents, `artists` with their `works` (`title`, `year`, and a `kind` when it is not an album: single, song, ep, compilation, soundtrack, mixtape, live, recording), a `zh` name for Chinese, Japanese and Korean acts, a `note` where the fit needs a word, `key: true` on the three to five names the tree shows, and `wiki` article titles in both languages. Every work's title and year, every native name and every dated claim in the histories was checked against Wikipedia. The lineage follows Wikipedia's genre histories, Musicmap's genealogy and Ishkur's Guide to Electronic Music; where they disagree the main line follows the majority and the other reading is drawn as an influence. The rock section's set of genres started from Alexander Okunev's Rock Music Tree.

A sketch (`data/pieces/<family>.js`) is a piece in the format `js/pattern.js` documents, or a list of pieces each with a `title` in both languages when a genre has two: tempo, bars, swing, a drum kit, a master section (reverb, reverb send, sidechain amount, humanize), and tracks. Drum tracks are step strings (`x` hit, `X` accent, `-` ghost, `o` open hi-hat, `.` rest, one character per sixteenth). Pitched tracks are note tokens (`C2`, `F#3`, `.` rest, `_` hold, `>` accent) or chord symbols, or a `prog` of chords struck by a `rhythm` string. Pieces in 7/8 or 12/8 set `stepsPerBar` and `beatSteps`. Instruments are named presets in `js/audio.js`, each with a display name in both languages; `make test` fails on an unknown one, a track that is silent, a note out of range, or a step string of the wrong length. `node scripts/render-check.mjs --tracks` renders every sketch in headless Chrome and prints its peak, loudness and every part's level, so a mix can be balanced without listening; `--wav` or `--wav-tracks` also writes the renders to `tests/out/wav/` for listening or spectral analysis, and `--shots` screenshots the page at desktop and phone widths.

## Deployment

Cloudflare Pages with Git integration: framework preset None, no build command, output directory `/`. `_headers` ships a content security policy that allows no inline scripts or styles, so the page keeps its one inline JSON-LD block and nothing else; the zone's Browser Cache TTL should be "Respect Existing Headers" so `js/`, `css/` and `data/` revalidate.

## Credits

Alexander Okunev's Rock Music Tree (rocktree.tumblr.com, 2012), the chart shared on r/coolguides, prompted this site and suggested the rock section's genres. Genre histories draw on Wikipedia, [Musicmap](https://musicmap.info/) by Kwinten Crauwels and [Ishkur's Guide to Electronic Music](https://music.ishkur.com/). The sketches are original and quote no real melody.

## License

[CC BY-NC-SA 4.0](LICENSE) for the code, the design, the genre data, the text and the sketches. Artist, record and genre names belong to their owners; [LICENSE](LICENSE) lists what it does not cover.
