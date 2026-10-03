'use strict';
// ---------------------------------------------------------------------------
// The map and everything drawn on it. Units are world pixels; T is one tile.
// The same draw function renders the live game and remembered moments.
// ---------------------------------------------------------------------------

const T = 32;
const MAP_W = 16, MAP_H = 36;
const TOP = -22; // the city lies north of the station, at negative y

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
  { x: 3, y: 0, w: 4, h: 1 },              // front wall of the hall,
  { x: 9, y: 0, w: 4, h: 1 },              //   with the way out between
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
// The city: tram line, buildings beyond it, and things in the plaza.
const TRAM_Y = -12.75 * T;                 // centre line of the tram track
const CITY_SOLIDS = [
  { x: 0, y: TOP, w: MAP_W, h: 8 },        // buildings across the tracks
  { x: 0, y: -14, w: MAP_W, h: 2.5 },      // tram track
  { x: 0, y: -10, w: 0.6, h: 4 },          // hedges at the sides of the plaza,
  { x: 0, y: -4, w: 0.6, h: 3 },           //   with side streets between
  { x: 15.4, y: -10, w: 0.6, h: 4 },
  { x: 15.4, y: -4, w: 0.6, h: 3 },
  { x: 2.2, y: -6.2, w: 1.2, h: 1.2, tree: true },
  { x: 12.6, y: -6.2, w: 1.2, h: 1.2, tree: true },
  { x: 7, y: -6.4, w: 2, h: 2, fountain: true },
  { x: 3.5, y: -2.4, w: 2.2, h: 0.7, bench: true },
  { x: 10.3, y: -2.4, w: 2.2, h: 0.7, bench: true },
];
SOLIDS.push(...CITY_SOLIDS);

// Gate gaps. Closed to the player for now; other people pass.
const GATES = [{ x: 5, y: 9.6, w: 1, h: 0.8 }, { x: 10, y: 9.6, w: 1, h: 0.8 }];

// Fixed signs: glyphs painted on the world.
const SIGNS = [
  { x: 4.2, y: 13.5, g: ['train'] },
  { x: 11.8, y: 14.2, g: ['train'] },
  { x: 8, y: 10, g: ['ticket'] },
  { x: 12.4, y: 10.75, g: ['ticket'], small: true },
  { x: 8, y: 8.9, g: ['train', 'big'] },
  { x: 8, y: 1.6, g: ['train', 'small'] },
  { x: 8, y: -10.7, g: ['train', 'small'] },
];

// ---------------------------------------------------------------------------
// Static layer, drawn once.
// ---------------------------------------------------------------------------
let staticLayer = null;
const STATIC_RES = 2;

function buildStatic() {
  const c = document.createElement('canvas');
  c.width = MAP_W * T * STATIC_RES;
  c.height = (MAP_H - TOP) * T * STATIC_RES;
  const g = c.getContext('2d');
  g.scale(STATIC_RES, STATIC_RES);
  g.translate(0, -TOP * T);
  drawCity(g);

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
  g.fillRect(3 * T, 0, 4 * T, T);
  g.fillRect(9 * T, 0, 4 * T, T);
  g.fillStyle = '#8a8478';
  g.fillRect(7 * T, 0, 2 * T, T);
  g.fillRect(3 * T, 35 * T, 10 * T, T);
  // gate line
  for (const s of SOLIDS.slice(5, 8)) {
    g.fillStyle = PAL.gate;
    g.fillRect(s.x * T, s.y * T, s.w * T, s.h * T);
    g.fillStyle = PAL.wallTop;
    g.fillRect(s.x * T, s.y * T, s.w * T, 4);
  }
  // pillars and benches
  for (const s of SOLIDS.slice(8, 12)) {
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
  for (const s of SOLIDS.slice(12, 14)) {
    g.fillStyle = PAL.bench;
    g.fillRect(s.x * T, s.y * T, s.w * T, s.h * T);
    g.fillStyle = 'rgba(255,255,255,.15)';
    for (let i = 1; i < 4; i++) g.fillRect(s.x * T, s.y * T + i * s.h * T / 4, s.w * T, 2);
  }
  // signs
  for (const s of SIGNS) drawSign(g, s);
  staticLayer = c;
}

function drawCity(g) {
  // plaza paving
  g.fillStyle = '#c9c2b4';
  g.fillRect(0, -11.5 * T, MAP_W * T, 11.5 * T);
  g.strokeStyle = 'rgba(0,0,0,.07)'; g.lineWidth = 1;
  for (let y = -11; y < 0; y++) for (let x = 0; x < MAP_W; x++) g.strokeRect(x * T + ((y & 1) ? T / 2 : 0), y * T, T, T);
  // tram stop edge
  g.fillStyle = '#e8b931';
  g.fillRect(4 * T, -11.5 * T, 8 * T, 4);
  g.fillStyle = '#9a9488';
  g.fillRect(4 * T, -11.5 * T + 4, 8 * T, 0.8 * T);
  // tram track
  g.fillStyle = '#6b665d';
  g.fillRect(0, -14 * T, MAP_W * T, 2.5 * T);
  g.fillStyle = PAL.rail;
  g.fillRect(0, TRAM_Y - 12, MAP_W * T, 3);
  g.fillRect(0, TRAM_Y + 9, MAP_W * T, 3);
  // buildings beyond
  const roofs = ['#8a5a4a', '#5f6f7f', '#9a8a5a', '#6f5a7a', '#5a7a6a'];
  for (let i = 0, x = 0; x < MAP_W; i++) {
    const w = 2.5 + (i * 7 % 3);
    g.fillStyle = roofs[i % roofs.length];
    g.fillRect(x * T, TOP * T, w * T - 3, 8 * T - 6);
    g.fillStyle = 'rgba(0,0,0,.15)';
    g.fillRect(x * T, (TOP + 7.5) * T, w * T - 3, 0.3 * T);
    x += w;
  }
  // station front
  g.fillStyle = PAL.wall;
  g.fillRect(0, -0.2 * T, MAP_W * T, 0.2 * T);
  // hedges
  g.fillStyle = '#4f7a45';
  for (const o of CITY_SOLIDS.slice(2, 6)) g.fillRect(o.x * T, o.y * T, o.w * T, o.h * T);
  for (const o of CITY_SOLIDS) {
    if (o.tree) {
      g.fillStyle = 'rgba(0,0,0,.2)';
      g.beginPath(); g.arc((o.x + o.w / 2) * T + 4, (o.y + o.h / 2) * T + 5, o.w * T * 0.75, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#5c8a4a';
      g.beginPath(); g.arc((o.x + o.w / 2) * T, (o.y + o.h / 2) * T, o.w * T * 0.75, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#6f9e5a';
      g.beginPath(); g.arc((o.x + o.w / 2) * T - 5, (o.y + o.h / 2) * T - 5, o.w * T * 0.4, 0, Math.PI * 2); g.fill();
    } else if (o.fountain) {
      const cx = (o.x + 1) * T, cy = (o.y + 1) * T;
      g.fillStyle = '#9a9488'; g.beginPath(); g.arc(cx, cy, T, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#6fa8c8'; g.beginPath(); g.arc(cx, cy, T - 6, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#9a9488'; g.beginPath(); g.arc(cx, cy, 6, 0, Math.PI * 2); g.fill();
    } else if (o.bench) {
      g.fillStyle = PAL.bench;
      g.fillRect(o.x * T, o.y * T, o.w * T, o.h * T);
    }
  }
}

function drawTram(g, tr) {
  const x = tr.x, y = TRAM_Y - tr.h / 2;
  g.fillStyle = 'rgba(0,0,0,.25)';
  roundRect(g, x + 3, y + 4, tr.len, tr.h, 12); g.fill();
  g.fillStyle = '#3f8a5a';
  roundRect(g, x, y, tr.len, tr.h, 12); g.fill();
  g.fillStyle = '#56a06f';
  roundRect(g, x + 8, y + 7, tr.len - 16, tr.h - 14, 6); g.fill();
  g.fillStyle = 'rgba(0,0,0,.3)';
  g.fillRect(x + tr.len / 2 - 2, y, 4, tr.h);
  for (const d of tr.doors) {
    g.fillStyle = tr.open > 0 ? '#14131a' : '#2a2a33';
    g.fillRect(x + d - 12 - tr.open * 4, y + tr.h - 5, 24 + tr.open * 8, 5);
  }
}

function drawDog(g, a, t) {
  const r = a.look.size;
  g.save();
  g.translate(a.x, a.y);
  g.fillStyle = 'rgba(0,0,0,.2)';
  g.beginPath(); g.ellipse(2, 3, r * 1.4, r * 0.8, 0, 0, Math.PI * 2); g.fill();
  g.rotate(a.dir || 0);
  const wag = Math.sin(t * 14 + a.phase) * 0.5;
  g.strokeStyle = a.look.body; g.lineWidth = r * 0.35; g.lineCap = 'round';
  g.beginPath(); g.moveTo(-r * 1.1, 0); g.lineTo(-r * 1.6, wag * r); g.stroke();
  g.fillStyle = a.look.body;
  g.beginPath(); g.ellipse(0, 0, r * 1.2, r * 0.65, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.arc(r * 1.15, 0, r * 0.5, 0, Math.PI * 2); g.fill();
  g.fillStyle = a.look.ear;
  g.beginPath(); g.ellipse(r * 1.05, -r * 0.42, r * 0.28, r * 0.16, 0.4, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(r * 1.05, r * 0.42, r * 0.28, r * 0.16, -0.4, 0, Math.PI * 2); g.fill();
  if (a.lead) {
    g.restore(); g.save();
    g.strokeStyle = 'rgba(40,30,30,.6)'; g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(a.lead.x, a.lead.y); g.stroke();
  }
  g.restore();
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
function drawBubble(g, sx, sy, glyphs, vw, placed = []) {
  const size = 26, gap = 4, pad = 8;
  const w = glyphs.length * size + (glyphs.length - 1) * gap + pad * 2;
  const h = size + pad * 2;
  let x = sx - w / 2;
  x = Math.max(6, Math.min(vw - w - 6, x));
  let y = sy - h - 12;
  // Stack above any bubble already drawn in the way.
  for (let k = 0; k < 6; k++) {
    const hit = placed.find((r) => x < r.x + r.w + 4 && r.x < x + w + 4 && y < r.y + r.h + 4 && r.y < y + h + 4);
    if (!hit) break;
    y = hit.y - h - 6;
  }
  placed.push({ x, y, w, h });
  const tailTop = Math.min(sy - 12, y + h + 9);
  g.fillStyle = PAL.paper;
  g.strokeStyle = PAL.bubbleEdge;
  g.lineWidth = 2;
  roundRect(g, x, y, w, h, 10);
  g.fill(); g.stroke();
  g.beginPath();
  g.moveTo(sx - 6, y + h - 1); g.lineTo(sx, Math.max(tailTop, y + h + 9)); g.lineTo(sx + 6, y + h - 1);
  g.fill();
  g.beginPath();
  g.moveTo(sx - 6, y + h); g.lineTo(sx, Math.max(tailTop, y + h + 9)); g.lineTo(sx + 6, y + h);
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
  g.drawImage(staticLayer, 0, TOP * T, MAP_W * T, (MAP_H - TOP) * T);

  // gate barriers
  GATES.forEach((gt, i) => {
    g.fillStyle = PAL.barrier;
    const open = state.gatesOpen && state.gatesOpen[i];
    const w = open ? 5 : gt.w * T / 2 - 2;
    g.fillRect(gt.x * T + 2, gt.y * T + gt.h * T / 2 - 3, w, 6);
    g.fillRect((gt.x + gt.w) * T - 2 - w, gt.y * T + gt.h * T / 2 - 3, w, 6);
  });
  for (const tr of state.trains) if (tr.visible) (tr.tram ? drawTram : drawTrain)(g, tr);
  const actors = state.actors.slice().sort((a, b) => a.y - b.y);
  for (const a of actors) {
    if (a.hidden) continue;
    if (a.look.dog) {
      const lead = a.leadId && state.actors.find((o) => o.id === a.leadId);
      drawDog(g, lead ? Object.assign({}, a, { lead }) : a, state.t || 0);
    } else drawPerson(g, a, state.t || 0);
  }
  g.restore();

  // bubbles on top, in screen space; nearer the bottom first so stacks grow upward
  const placed = [];
  const order = state.bubbles.slice().sort((p, q) => {
    const a = state.actors.find((x) => x.id === p.actorId), b = state.actors.find((x) => x.id === q.actorId);
    return (b ? b.y : 0) - (a ? a.y : 0);
  });
  for (const b of order) {
    const a = state.actors.find((x) => x.id === b.actorId);
    if (!a) continue;
    const sx = (a.x - view.cx) * view.scale + view.w / 2;
    const sy = (a.y - 14 - view.cy) * view.scale + view.h / 2;
    if (sx < -20 || sx > view.w + 20 || sy < 0 || sy > view.h + 20) continue;
    drawBubble(g, sx, sy, b.g, view.w, placed);
  }
}
