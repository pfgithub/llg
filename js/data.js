// ---------------------------------------------------------------------------
// The language.
//
// Every word is one glyph (logographic, like the scripts in Chants of Sennaar).
// Grammar is tiny:
//   - Word order is Subject Verb Object:          me want fish
//   - Adjectives / numbers follow the noun:       flower red, food two, fire big
//   - "not" goes before the word it negates:      you not go, not fire big
//   - "what" at the end turns it into a question: you want fish what
// Glyph classes share a radical: verbs a base stroke, colours a hook, numbers a tick.
// ---------------------------------------------------------------------------

const VERB_BASE = 'M15 93 L85 93';       // every verb sits on a base stroke
const COLOR_HOOK = 'M22 14 Q50 30 78 14';  // every colour hangs from a hook
const NUMBER_TICK = 'M14 50 L24 50';       // numbers carry a tick on the left

// Glyphs are arbitrary: none of them is a picture of what it means.
const GLYPHS = {
  hello: ['M22 34 Q36 18 50 34 Q64 50 78 34', 'M50 52 L50 82', 'M34 82 L66 82'],
  me: ['M50 14 L50 44', 'M30 80 L50 48 L70 80 Z'],
  you: ['M50 86 L50 56', 'M30 20 L50 52 L70 20 Z'],
  want: ['M24 22 L42 52 L42 22', 'M58 20 Q82 40 58 64', 'M66 78 L66 79', VERB_BASE],
  give: ['M28 20 Q28 62 50 62 Q72 62 72 20', 'M50 30 L50 50', VERB_BASE],
  go: ['M22 26 L78 26', 'M36 26 Q36 72 70 72', 'M64 44 L64 45', VERB_BASE],
  fish: ['M18 58 L50 26 L82 58', 'M34 72 L66 72', 'M50 86 L50 87'],
  food: ['M22 22 L42 44 L22 66', 'M56 30 L80 30 L80 80 L56 80', 'M66 55 L67 55'],
  water: ['M20 42 Q35 20 50 42 L50 82', 'M66 24 L82 40', 'M66 62 L82 78'],
  fire: ['M24 24 a10 10 0 1 0 20 0 a10 10 0 1 0 -20 0', 'M44 30 L78 64', 'M60 82 L84 58'],
  tree: ['M20 72 Q50 12 80 72', 'M50 44 L50 88', 'M28 88 L38 78'],
  flower: ['M18 50 a12 12 0 1 0 24 0 a12 12 0 1 0 -24 0', 'M42 50 L82 50', 'M82 30 L82 70', 'M62 30 L62 38'],
  house: ['M30 18 L30 50 L70 50 L70 82', 'M50 28 L56 34', 'M44 70 L50 76'],
  key: ['M24 54 Q50 16 76 54', 'M24 54 L24 84', 'M76 54 L62 84', 'M50 70 L50 71'],
  door: ['M28 20 Q50 40 72 20', 'M28 80 Q50 60 72 80', 'M50 34 L50 66'],
  yes: ['M24 34 Q50 82 76 34', 'M50 88 L50 89', 'M30 16 L42 26'],
  not: ['M30 12 L66 38 L34 62 L70 88'],
  good: ['M22 70 Q38 30 50 50 Q62 70 78 30', 'M30 22 L30 23', 'M70 82 L70 83'],
  what: ['M34 22 a16 16 0 1 0 32 0 a16 16 0 1 0 -32 0', 'M50 38 L50 66', 'M36 80 L64 80'],
  big: ['M20 26 L80 26', 'M20 50 L80 50', 'M50 26 L50 50', 'M36 74 L64 74 L50 88 Z'],
  red: [COLOR_HOOK, 'M50 34 L50 88', 'M32 60 L68 60'],
  blue: [COLOR_HOOK, 'M28 40 Q50 94 72 40'],
  yellow: [COLOR_HOOK, 'M30 42 L70 82', 'M70 42 L60 52', 'M30 82 L40 72'],
  one: [NUMBER_TICK, 'M40 20 Q78 50 40 80', 'M50 50 L51 50'],
  two: [NUMBER_TICK, 'M40 20 Q78 50 40 80', 'M62 22 Q90 50 62 78', 'M50 50 L51 50'],
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
  one: { dots: 1 }, two: { dots: 2 }, door: { e: '🚪' }, key: { e: '🔑' },
};

// Journal pages. A page appears once all its glyphs have been seen
// (and, optionally, once a story flag is set so there is enough context).
const PAGES = [
  { id: 'p1', words: ['hello', 'fish', 'yes', 'not'] },
  { id: 'p2', words: ['me', 'want', 'good', 'food'], flag: 'bakerTraded' },
  { id: 'p3', words: ['house', 'water', 'tree'] },
  { id: 'p4', words: ['you', 'go', 'one', 'two', 'what'], flag: 'gateOpen' },
  { id: 'p5', words: ['fire', 'big', 'door', 'red', 'yellow'], flag: 'metKeeper' },
  { id: 'p6', words: ['give', 'key', 'flower', 'blue'], flag: 'watered' },
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
