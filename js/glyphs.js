'use strict';
// ---------------------------------------------------------------------------
// The script. Every word is one logogram, drawn on a 100x100 grid.
// None of them is a picture of its meaning.
// ---------------------------------------------------------------------------

const WORDS = {
  hello: ['M24 26 Q50 46 76 26', 'M50 38 L50 80', 'M30 82 Q50 66 70 82'],
  train: ['M26 26 Q52 50 26 74', 'M62 22 L62 78', 'M62 50 L82 36', 'M80 72 L80 73'],
  go: ['M20 52 Q38 20 56 52 Q74 84 80 50', 'M30 78 L30 79'],
  ticket: ['M26 32 Q50 16 74 32 L60 56', 'M36 50 L36 82', 'M52 74 L74 74'],
  not: ['M22 40 Q50 12 78 40', 'M22 64 Q50 92 78 64'],
};

// Interface marks. They belong to the same script but are not words.
const MARKS = {
  log: ['M30 24 Q72 24 50 50 Q28 76 70 76', 'M22 50 L23 50'],
  dict: ['M48 20 L78 50 L48 80', 'M18 50 L48 50', 'M32 34 L32 35'],
  close: ['M28 30 Q50 64 72 30', 'M50 78 L50 79'],
};

const WORD_IDS = Object.keys(WORDS);
const pathCache = {};
function glyphPaths(id) {
  if (!pathCache[id]) pathCache[id] = (WORDS[id] || MARKS[id]).map((d) => new Path2D(d));
  return pathCache[id];
}

// Draw a glyph on a canvas, centred at (x, y), `size` pixels square.
function drawGlyph(ctx, id, x, y, size, color) {
  ctx.save();
  ctx.translate(x - size / 2, y - size / 2);
  ctx.scale(size / 100, size / 100);
  ctx.strokeStyle = color;
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const p of glyphPaths(id)) ctx.stroke(p);
  ctx.restore();
}

// The same glyph as inline SVG, for DOM panels.
function glyphSVG(id, cls = 'glyph') {
  return `<svg class="${cls}" viewBox="0 0 100 100" aria-hidden="true">${(WORDS[id] || MARKS[id]).map((d) => `<path d="${d}"/>`).join('')}</svg>`;
}
