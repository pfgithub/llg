'use strict';
// ---------------------------------------------------------------------------
// The map and everything drawn on it. Units are world pixels; T is one tile.
// The same draw function renders the live game and remembered moments.
// ---------------------------------------------------------------------------

const T = 32;
const MAP_W = 16, MAP_H = 36;

const PAL = {
  gravel: '#4b4741', sleeper: '#5e554a', rail: '#9aa0a6',
  platform: '#d9d2c3', platformDark: '#cbc2b0', tactile: '#e8b931',
  wall: '#3d3f4a', wallTop: '#575a68', hall: '#b9b2a3', hallTile: '#aea697',
  pillar: '#7c7f8c', bench: '#8a5a35', gate: '#5b6070', barrier: '#c4443a',
  ink: '#1f1d24', paper: '#f4efe4', bubbleEdge: '#1f1d24',
};

// Solid areas the player cannot walk through (tile units).
const SOLIDS = [
  { x: 0, y: 0, w: 3, h: MAP_H },          // track A
  { x: 13, y: 0, w: 3, h: MAP_H },         // track B
  { x: 3, y: 0, w: 10, h: 1 },             // back wall of the hall
  { x: 3, y: 35, w: 10, h: 1 },            // end of the platform
  // gate line, with two gaps at x 5-6 and 10-11
  { x: 3, y: 9.6, w: 2, h: 0.8 },
  { x: 6, y: 9.6, w: 4, h: 0.8 },
  { x: 11, y: 9.6, w: 2, h: 0.8 },
  // pillars down the middle of the platform
  { x: 7.7, y: 14.7, w: 0.6, h: 0.6 },
  { x: 7.7, y: 20.7, w: 0.6, h: 0.6 },
  { x: 7.7, y: 26.7, w: 0.6, h: 0.6 },
  { x: 7.7, y: 32.7, w: 0.6, h: 0.6 },
  // benches
  { x: 3.4, y: 17, w: 0.8, h: 2.2 },
  { x: 11.8, y: 28, w: 0.8, h: 2.2 },
  // ticket machine by the gates
  { x: 12.0, y: 11.2, w: 0.8, h: 1.3 },
];
const MACHINE = SOLIDS[SOLIDS.length - 1];
const MACHINE_FRONT = { x: 11.45 * T, y: 11.85 * T };
// Gate gaps. Closed to the player for now; other people pass.
const GATES = [{ x: 5, y: 9.6, w: 1, h: 0.8 }, { x: 10, y: 9.6, w: 1, h: 0.8 }];

// Fixed signs: glyphs painted on the world.
const SIGNS = [
  { x: 4.2, y: 13.5, g: ['train'] },
  { x: 11.8, y: 14.2, g: ['train'] },
  { x: 8, y: 10, g: ['ticket'] },
  { x: 12.4, y: 10.75, g: ['ticket'], small: true },
];

// ---------------------------------------------------------------------------
// Static layer, drawn once.
// ---------------------------------------------------------------------------
let staticLayer = null;
const STATIC_RES = 2;

function buildStatic() {
  const c = document.createElement('canvas');
  c.width = MAP_W * T * STATIC_RES;
  c.height = MAP_H * T * STATIC_RES;
  const g = c.getContext('2d');
  g.scale(STATIC_RES, STATIC_RES);

  // tracks
  for (const tx of [0, 13]) {
    g.fillStyle = PAL.gravel;
    g.fillRect(tx * T, 0, 3 * T, MAP_H * T);
    g.fillStyle = PAL.sleeper;
    for (let y = 0; y < MAP_H * T; y += 14) g.fillRect(tx * T + 10, y, 3 * T - 20, 6);
    g.fillStyle = PAL.rail;
    g.fillRect(tx * T + 22, 0, 4, MAP_H * T);
    g.fillRect(tx * T + 3 * T - 26, 0, 4, MAP_H * T);
  }
  // hall floor
  g.fillStyle = PAL.hall;
  g.fillRect(3 * T, 0, 10 * T, 10 * T);
  g.fillStyle = PAL.hallTile;
  for (let y = 0; y < 10; y++) for (let x = 3; x < 13; x++) if ((x + y) % 2) g.fillRect(x * T, y * T, T, T);
  // platform
  g.fillStyle = PAL.platform;
  g.fillRect(3 * T, 10 * T, 10 * T, 26 * T);
  g.fillStyle = PAL.platformDark;
  for (let y = 10; y < 36; y++) g.fillRect(3 * T, y * T, 10 * T, 1);
  g.fillStyle = PAL.tactile;
  g.fillRect(3 * T + 4, 10 * T, 6, 26 * T);
  g.fillRect(13 * T - 10, 10 * T, 6, 26 * T);
  // walls
  g.fillStyle = PAL.wall;
  g.fillRect(3 * T, 0, 10 * T, T);
  g.fillRect(3 * T, 35 * T, 10 * T, T);
  // gate line
  for (const s of SOLIDS.slice(4, 7)) {
    g.fillStyle = PAL.gate;
    g.fillRect(s.x * T, s.y * T, s.w * T, s.h * T);
    g.fillStyle = PAL.wallTop;
    g.fillRect(s.x * T, s.y * T, s.w * T, 4);
  }
  // pillars and benches
  for (const s of SOLIDS.slice(7, 11)) {
    g.fillStyle = PAL.pillar;
    g.fillRect(s.x * T, s.y * T, s.w * T, s.h * T);
    g.fillStyle = 'rgba(0,0,0,.18)';
    g.fillRect(s.x * T + 3, (s.y + s.h) * T, s.w * T, 4);
  }
  // ticket machine
  g.fillStyle = '#4f6b8a';
  roundRect(g, MACHINE.x * T, MACHINE.y * T, MACHINE.w * T, MACHINE.h * T, 4); g.fill();
  g.fillStyle = '#9fd0c8';
  g.fillRect(MACHINE.x * T + 3, MACHINE.y * T + 8, 6, MACHINE.h * T - 16);
  g.fillStyle = '#1f1d24';
  g.fillRect(MACHINE.x * T + 2, (MACHINE.y + MACHINE.h * 0.7) * T, 3, 8);
  for (const s of SOLIDS.slice(11, 13)) {
    g.fillStyle = PAL.bench;
    g.fillRect(s.x * T, s.y * T, s.w * T, s.h * T);
    g.fillStyle = 'rgba(255,255,255,.15)';
    for (let i = 1; i < 4; i++) g.fillRect(s.x * T, s.y * T + i * s.h * T / 4, s.w * T, 2);
  }
  // signs
  for (const s of SIGNS) drawSign(g, s);
  staticLayer = c;
}

function drawSign(g, s) {
  const n = s.g.length, size = s.small ? 13 : 18, pad = s.small ? 3 : 4;
  const w = n * size + (n - 1) * 3 + pad * 2, h = size + pad * 2;
  const x = s.x * T - w / 2, y = s.y * T - h / 2;
  g.fillStyle = '#2b4f7a';
  roundRect(g, x, y, w, h, 3); g.fill();
  s.g.forEach((id, i) => drawGlyph(g, id, x + pad + size / 2 + i * (size + 3), y + h / 2, size, '#f4efe4'));
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

// ---------------------------------------------------------------------------
// Moving things
// ---------------------------------------------------------------------------
function drawTrain(g, tr) {
  const x = tr.x - tr.w / 2, y = tr.y;
  g.fillStyle = 'rgba(0,0,0,.25)';
  roundRect(g, x + 3, y + 4, tr.w, tr.len, 10); g.fill();
  g.fillStyle = tr.color;
  roundRect(g, x, y, tr.w, tr.len, 10); g.fill();
  g.fillStyle = tr.roof;
  roundRect(g, x + 8, y + 10, tr.w - 16, tr.len - 20, 6); g.fill();
  // car joints
  g.fillStyle = 'rgba(0,0,0,.3)';
  for (let cy = y + tr.car; cy < y + tr.len - 4; cy += tr.car) g.fillRect(x, cy - 2, tr.w, 4);
  // doors on the platform side
  const side = tr.side; // +1: platform is to the right
  for (const d of tr.doors) {
    const dy = y + d;
    const open = tr.open;
    g.fillStyle = open > 0 ? '#14131a' : '#2a2a33';
    const dx = side > 0 ? x + tr.w - 5 : x;
    g.fillRect(dx, dy - 12 - open * 4, 5, 24 + open * 8);
  }
}

const SKIN = ['#f2c9a0', '#d9a074', '#a86f47', '#7a4a2c', '#e8b48f'];

function drawPerson(g, a, t) {
  const lk = a.look;
  const r = lk.size || 9;
  const moving = a.moving ? Math.sin(t * 12 + a.phase) : 0;
  g.save();
  g.translate(a.x, a.y);
  g.globalAlpha = a.alpha == null ? 1 : a.alpha;
  g.fillStyle = 'rgba(0,0,0,.22)';
  g.beginPath(); g.ellipse(2, 4, r * 1.15, r * 0.8, 0, 0, Math.PI * 2); g.fill();
  g.rotate(a.dir || 0);
  // feet
  if (a.moving) {
    g.fillStyle = '#2b2a30';
    g.beginPath(); g.arc(moving * 5, -r * 0.45, 3, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(-moving * 5, r * 0.45, 3, 0, Math.PI * 2); g.fill();
  }
  // shoulders
  g.fillStyle = lk.body;
  g.beginPath(); g.ellipse(0, 0, r * 0.8, r * 1.2, 0, 0, Math.PI * 2); g.fill();
  if (lk.vest) {
    g.fillStyle = lk.vest;
    g.fillRect(-r * 0.3, -r * 1.1, r * 0.25, r * 2.2);
  }
  if (lk.bag) {
    g.fillStyle = lk.bag;
    g.fillRect(-r * 0.95, -r * 0.6, r * 0.45, r * 1.2);
  }
  if (a.holding === 'ticket') {
    g.fillStyle = '#ffffff';
    g.strokeStyle = '#1f1d24'; g.lineWidth = 1;
    g.fillRect(r * 0.9, -4, 9, 7); g.strokeRect(r * 0.9, -4, 9, 7);
    g.fillStyle = '#c4443a'; g.fillRect(r * 0.9 + 2, -2, 5, 1.5);
  }
  // head
  g.fillStyle = lk.skin;
  g.beginPath(); g.arc(r * 0.15, 0, r * 0.62, 0, Math.PI * 2); g.fill();
  g.fillStyle = lk.hair;
  g.beginPath(); g.arc(r * 0.05, 0, r * 0.6, Math.PI * 0.5, Math.PI * 1.5); g.fill();
  if (lk.hat) {
    g.fillStyle = lk.hat;
    g.beginPath(); g.arc(r * 0.1, 0, r * 0.66, 0, Math.PI * 2); g.fill();
    g.fillRect(r * 0.3, -r * 0.5, r * 0.55, r);
  }
  g.restore();
}

// Speech bubble in screen space.
function drawBubble(g, sx, sy, glyphs, vw) {
  const size = 26, gap = 4, pad = 8;
  const w = glyphs.length * size + (glyphs.length - 1) * gap + pad * 2;
  const h = size + pad * 2;
  let x = sx - w / 2;
  x = Math.max(6, Math.min(vw - w - 6, x));
  const y = sy - h - 12;
  g.fillStyle = PAL.paper;
  g.strokeStyle = PAL.bubbleEdge;
  g.lineWidth = 2;
  roundRect(g, x, y, w, h, 10);
  g.fill(); g.stroke();
  g.beginPath();
  g.moveTo(sx - 6, y + h - 1); g.lineTo(sx, y + h + 9); g.lineTo(sx + 6, y + h - 1);
  g.fill();
  g.beginPath();
  g.moveTo(sx - 6, y + h); g.lineTo(sx, y + h + 9); g.lineTo(sx + 6, y + h);
  g.stroke();
  glyphs.forEach((id, i) => drawGlyph(g, id, x + pad + size / 2 + i * (size + gap), y + h / 2, size, PAL.ink));
}

// ---------------------------------------------------------------------------
// Render a full frame.
// view:  { cx, cy, scale, w, h }  (centre in world px, scale = screen px per world px)
// state: { trains, actors, bubbles: [{ actorId, g }], gatesOpen, t }
// ---------------------------------------------------------------------------
function renderWorld(g, view, state) {
  if (!staticLayer) buildStatic();
  g.save();
  g.fillStyle = '#26252c';
  g.fillRect(0, 0, view.w, view.h);
  g.translate(view.w / 2, view.h / 2);
  g.scale(view.scale, view.scale);
  g.translate(-view.cx, -view.cy);
  g.drawImage(staticLayer, 0, 0, MAP_W * T, MAP_H * T);

  // gate barriers
  GATES.forEach((gt, i) => {
    g.fillStyle = PAL.barrier;
    const open = state.gatesOpen && state.gatesOpen[i];
    const w = open ? 5 : gt.w * T / 2 - 2;
    g.fillRect(gt.x * T + 2, gt.y * T + gt.h * T / 2 - 3, w, 6);
    g.fillRect((gt.x + gt.w) * T - 2 - w, gt.y * T + gt.h * T / 2 - 3, w, 6);
  });
  for (const tr of state.trains) if (tr.visible) drawTrain(g, tr);
  const actors = state.actors.slice().sort((a, b) => a.y - b.y);
  for (const a of actors) drawPerson(g, a, state.t || 0);
  g.restore();

  // bubbles on top, in screen space
  for (const b of state.bubbles) {
    const a = state.actors.find((x) => x.id === b.actorId);
    if (!a) continue;
    const sx = (a.x - view.cx) * view.scale + view.w / 2;
    const sy = (a.y - 14 - view.cy) * view.scale + view.h / 2;
    if (sx < -20 || sx > view.w + 20 || sy < 0 || sy > view.h + 20) continue;
    drawBubble(g, sx, sy, b.g, view.w);
  }
}
