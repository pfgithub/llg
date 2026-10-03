// ---------------------------------------------------------------------------
// The language.
//
// Every word is one glyph (logographic, like the scripts in Chants of Sennaar).
// Grammar is tiny:
//   - Word order is Subject Verb Object:          me want fish
//   - Adjectives / numbers follow the noun:       flower red, food two, fire big
//   - "not" goes before the word it negates:      you not go, not fire big
//   - "what" at the end turns it into a question: you want fish what
// Verbs share a base stroke along the bottom so they can be recognised as a class.
// ---------------------------------------------------------------------------

const VERB_BASE = 'M15 93 L85 93';
const COLOR_HOOK = 'M18 24 Q50 8 82 24';
const NUMBER_BAR = 'M18 16 L82 16';

const GLYPHS = {
  hello: ['M18 62 Q34 30 50 62 Q66 94 82 62', 'M50 24 L50 25'],
  me: ['M28 46 a22 22 0 1 0 44 0 a22 22 0 1 0 -44 0', 'M50 46 L50 47'],
  you: ['M14 46 a16 16 0 1 0 32 0 a16 16 0 1 0 -32 0', 'M54 46 L86 46', 'M86 30 L86 62'],
  want: ['M24 30 Q50 86 76 30', 'M50 12 L50 36', VERB_BASE],
  give: ['M16 26 Q32 64 48 26', 'M50 54 L84 54', 'M72 42 L84 54 L72 66', VERB_BASE],
  go: ['M22 22 L46 50 L22 78', 'M50 22 L74 50 L50 78', VERB_BASE],
  open: ['M30 12 L30 82', 'M30 12 L66 24 L66 70 L30 82', VERB_BASE],
  fish: ['M14 50 Q42 18 70 50 Q42 82 14 50', 'M70 50 L88 34 L88 66 Z', 'M32 46 L32 47'],
  food: ['M14 64 Q14 32 50 32 Q86 32 86 64 L86 72 L14 72 Z', 'M34 42 L40 54', 'M50 42 L56 54', 'M66 42 L72 54'],
  water: ['M12 36 Q24 24 36 36 Q48 48 60 36 Q72 24 84 36', 'M12 62 Q24 50 36 62 Q48 74 60 62 Q72 50 84 62'],
  fire: ['M50 12 Q78 44 68 70 Q62 86 50 86 Q38 86 32 70 Q22 44 50 12', 'M50 56 Q59 68 50 78 Q41 68 50 56'],
  tree: ['M50 90 L50 14', 'M50 36 L26 20', 'M50 36 L74 20', 'M50 60 L30 46', 'M50 60 L70 46'],
  flower: ['M41 38 a9 9 0 1 0 18 0 a9 9 0 1 0 -18 0', 'M50 47 L50 90', 'M50 29 L50 12', 'M41 38 L22 30', 'M59 38 L78 30', 'M50 70 L32 58'],
  house: ['M12 50 L50 16 L88 50', 'M24 40 L24 86 L76 86 L76 40', 'M44 86 L44 64 L56 64 L56 86'],
  key: ['M12 50 a13 13 0 1 0 26 0 a13 13 0 1 0 -26 0', 'M38 50 L88 50', 'M72 50 L72 66', 'M84 50 L84 62'],
  door: ['M28 12 L72 12 L72 88 L28 88 Z', 'M60 50 L60 51'],
  yes: ['M20 50 a30 30 0 1 0 60 0 a30 30 0 1 0 -60 0', 'M50 20 L50 80'],
  not: ['M30 12 L66 38 L34 62 L70 88'],
  good: ['M20 58 Q50 92 80 58', 'M34 26 L34 40', 'M66 26 L66 40'],
  what: ['M54 50 Q54 42 46 44 Q38 48 42 58 Q48 68 60 62 Q72 54 66 40 Q58 26 42 30 Q24 36 26 56 Q30 80 56 80 Q78 78 84 58'],
  big: ['M50 8 L92 50 L50 92 L8 50 Z'],
  red: [COLOR_HOOK, 'M50 34 L50 88', 'M32 60 L68 60'],
  blue: [COLOR_HOOK, 'M28 40 Q50 94 72 40'],
  yellow: [COLOR_HOOK, 'M50 36 L50 86', 'M28 44 L38 80', 'M72 44 L62 80'],
  one: [NUMBER_BAR, 'M50 32 L50 86'],
  two: [NUMBER_BAR, 'M36 32 L36 86', 'M64 32 L64 86'],
};
const GLYPH_IDS = Object.keys(GLYPHS);

// Pictures used on journal pages. Glyphs are matched against these.
const BIG_SVG = '<svg class="psvg" viewBox="0 0 100 100"><rect x="26" y="26" width="48" height="48" rx="6" fill="#3b2a1a"/><path d="M8 8 L20 20 M92 8 L80 20 M8 92 L20 80 M92 92 L80 80 M8 8 L8 20 M8 8 L20 8 M92 8 L92 20 M92 8 L80 8 M8 92 L8 80 M8 92 L20 92 M92 92 L92 80 M92 92 L80 92" stroke="#3b2a1a" stroke-width="6" stroke-linecap="round" fill="none"/></svg>';

const PICTO = {
  hello: { e: '👋' }, fish: { e: '🐟' }, yes: { e: '✅' }, good: { e: '👍' },
  go: { e: '🚶' }, house: { e: '🏠' }, water: { e: '💧' }, tree: { e: '🌳' },
  me: { e: '🙋' }, you: { e: '👉' }, want: { e: '🤲' }, give: { e: '🎁' }, food: { e: '🍞' },
  flower: { e: '🌸' }, red: { c: '#d9412b' }, blue: { c: '#2f6fd1' }, yellow: { c: '#f2c230' },
  fire: { e: '🔥' }, big: { svg: BIG_SVG }, what: { e: '🤔' }, not: { e: '🚫' },
  one: { dots: 1 }, two: { dots: 2 }, door: { e: '🚪' }, open: { e: '🔓' }, key: { e: '🔑' },
};

// Journal pages. A page appears once all its glyphs have been seen
// (and, optionally, once a story flag is set so there is enough context).
const PAGES = [
  { id: 'p1', words: ['hello', 'fish', 'yes', 'good'] },
  { id: 'p2', words: ['go', 'house', 'water', 'tree'] },
  { id: 'p3', words: ['me', 'you', 'want', 'give', 'food'], flag: 'bakerTraded' },
  { id: 'p4', words: ['flower', 'red', 'blue', 'yellow'], flag: 'watered' },
  { id: 'p5', words: ['fire', 'big', 'what', 'not'], flag: 'metKeeper' },
  { id: 'p6', words: ['one', 'two', 'door', 'open', 'key'], flag: 'triedStairs' },
];

const COLORS = { red: '#d9412b', blue: '#2f6fd1', yellow: '#f2c230' };

const ITEMS = {
  fish: { e: '🐟', g: ['fish'] },
  food: { e: '🍞', g: ['food'] },
  water: { e: '💧', g: ['water'] },
  flower_red: { flower: 'red', g: ['flower', 'red'] },
  flower_blue: { flower: 'blue', g: ['flower', 'blue'] },
  flower_yellow: { flower: 'yellow', g: ['flower', 'yellow'] },
  key: { e: '🔑', g: ['key'] },
  torch: { e: '🔥', g: ['fire'] },
};
