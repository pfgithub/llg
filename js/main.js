'use strict';

// ===========================================================================
// Save data
// ===========================================================================
const SAVE_KEY = 'llg-city-v1';
function loadSave() { try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || null; } catch (e) { return null; } }
function writeSave() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* storage unavailable */ } }
const S = Object.assign({ seen: [], log: [], introDone: false, px: 0, py: 0 }, loadSave() || {});

// ===========================================================================
// Sound: each word has its own pitch, so speech has a voice.
// ===========================================================================
let AC = null;
function audio() {
  if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
  if (AC.state === 'suspended') AC.resume();
  return AC;
}
function tone(f, dur, vol, when = 0, type = 'triangle') {
  const a = AC; if (!a || a.state !== 'running') return;
  const t = a.currentTime + when;
  const o = a.createOscillator(), gn = a.createGain();
  o.type = type; o.frequency.value = f;
  gn.gain.setValueAtTime(0.0001, t);
  gn.gain.linearRampToValueAtTime(vol, t + 0.015);
  gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(gn); gn.connect(a.destination);
  o.start(t); o.stop(t + dur + 0.05);
}
const STEPS = [1, 9 / 8, 5 / 4, 4 / 3, 3 / 2, 5 / 3, 15 / 8];
function voice(actor, glyphs, vol) {
  const base = actor.pitch || 200;
  glyphs.forEach((w, i) => {
    const k = WORD_IDS.indexOf(w);
    tone(base * STEPS[k % STEPS.length], 0.16, vol, i * 0.2);
  });
}

// ===========================================================================
// Canvas and view
// ===========================================================================
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let W = 0, H = 0, DPR = 1;
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 3);
  W = canvas.clientWidth; H = canvas.clientHeight;
  canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
}
window.addEventListener('resize', resize);

const view = { cx: 8 * T, cy: 20 * T, scale: 1, w: 0, h: 0 };
function viewScale(w) { return w / (9 * T); }

// ===========================================================================
// Actors
// ===========================================================================
const HAIR = ['#2b211c', '#5a3b22', '#b08a4a', '#1c1c1c', '#8c8c8c', '#a0482a'];
const COATS = ['#6d7fa6', '#8f6b8a', '#5f8b6e', '#a8774f', '#4f5d73', '#9a5050', '#7b7f45', '#3f6f80'];
const rnd = (a) => a[Math.floor(Math.random() * a.length)];
let nextId = 1;

function makeActor(x, y, look, extra = {}) {
  return Object.assign({
    id: 'a' + nextId++, x, y, dir: Math.PI / 2, look, moving: false,
    phase: Math.random() * 6, tasks: [], speed: 1.7 * T, pitch: 140 + Math.random() * 160,
    bubble: null, alpha: 1,
  }, extra);
}
function randomLook() {
  return { body: rnd(COATS), skin: rnd(SKIN), hair: rnd(HAIR), bag: Math.random() < 0.4 ? '#3a3330' : null };
}

const player = makeActor(3.6 * T, 20 * T, { body: '#2f8f83', skin: SKIN[0], hair: '#3a2a1e', bag: '#c58a3a', size: 9.5 }, { id: 'player', pitch: 260 });
const actors = [];

// ---------------------------------------------------------------------------
// Speech. A line is remembered (with a picture of the moment) only when you
// could see it on screen.
// ---------------------------------------------------------------------------
function onScreen(a) {
  const hw = view.w / 2 / view.scale, hh = view.h / 2 / view.scale;
  return Math.abs(a.x - view.cx) < hw + 4 && Math.abs(a.y - view.cy) < hh + 4;
}
function say(a, glyphs, dur = 2.8) {
  if (!actors.includes(a) && a !== player) return;
  a.bubble = { g: glyphs, until: clock + dur };
  if (onScreen(a)) {
    const d = Math.hypot(a.x - player.x, a.y - player.y) / T;
    voice(a, glyphs, Math.max(0.015, 0.08 - d * 0.008));
    remember(a, glyphs);
  }
}

function snapshot(speaker) {
  const hw = view.w / 2 / view.scale + 2 * T, hh = view.h / 2 / view.scale + 2 * T;
  const near = (o) => Math.abs(o.x - speaker.x) < hw && Math.abs(o.y - speaker.y) < hh;
  return {
    cx: Math.round(view.cx), cy: Math.round(view.cy),
    actors: [player, ...actors].filter(near).map((o) => ({
      id: o.id, x: Math.round(o.x), y: Math.round(o.y), dir: +o.dir.toFixed(2), look: o.look, alpha: o.alpha,
    })),
    trains: trains.filter((t) => t.visible).map((t) => ({ x: t.x, y: Math.round(t.y), w: t.w, len: t.len, car: t.car, color: t.color, roof: t.roof, doors: t.doors, side: t.side, open: t.open, visible: true })),
    gatesOpen: false,
  };
}
function remember(a, glyphs) {
  const phrase = glyphs.join(' ');
  for (const w of glyphs) if (!S.seen.includes(w)) S.seen.push(w);
  // Keep a handful of moments for each phrase from each kind of speaker.
  const same = S.log.filter((l) => l.p === phrase && l.role === a.role);
  if (same.length >= 4) return;
  S.log.push({ p: phrase, g: glyphs.slice(), role: a.role, who: a.id, at: Date.now(), snap: snapshot(a) });
  if (S.log.length > 400) S.log.shift();
  writeSave();
  pulseButtons();
}

// ---------------------------------------------------------------------------
// Tasks: a tiny queue of things for a person to do.
// ---------------------------------------------------------------------------
function runTasks(a, dt) {
  const t = a.tasks[0];
  a.moving = false;
  if (!t) return;
  if (t.walk) {
    const [tx, ty] = t.walk;
    const dx = tx - a.x, dy = ty - a.y, d = Math.hypot(dx, dy);
    const step = a.speed * dt;
    if (d <= step) { a.x = tx; a.y = ty; a.tasks.shift(); }
    else { a.x += dx / d * step; a.y += dy / d * step; a.dir = Math.atan2(dy, dx); a.moving = true; }
  } else if (t.wait != null) {
    t.wait -= dt;
    if (t.wait <= 0) a.tasks.shift();
  } else if (t.say) {
    say(a, t.say); a.tasks.shift();
  } else if (t.face != null) {
    a.dir = t.face; a.tasks.shift();
  } else if (t.fade) {
    a.alpha -= dt * 2;
    if (a.alpha <= 0) { a.gone = true; a.tasks.shift(); }
  } else if (t.fn) {
    t.fn(a); a.tasks.shift();
  }
}
function faceTo(a, b) { a.dir = Math.atan2(b.y - a.y, b.x - a.x); }

// ===========================================================================
// Trains
// ===========================================================================
const STOP_Y = 11.5 * T;
function makeTrain(o) {
  return Object.assign({
    w: 2.3 * T, len: 22 * T, car: 5.5 * T, doors: [2.5 * T, 8 * T, 13.5 * T, 19 * T],
    y: MAP_H * T + 40, open: 0, visible: false, state: 'away', timer: 0,
  }, o);
}
const trains = [
  makeTrain({ id: 'A', x: 1.5 * T, side: 1, color: '#2f5d8a', roof: '#3d6f9e', aisle: 5.5 * T, doorX: 3.4 * T, gateX: 5.5 * T, away: 16, dwell: 32 }),
  makeTrain({ id: 'B', x: 14.5 * T, side: -1, color: '#7a3b3b', roof: '#8c4949', aisle: 10.5 * T, doorX: 12.6 * T, gateX: 10.5 * T, away: 14, dwell: 28 }),
];

function updateTrain(tr, dt) {
  tr.timer -= dt;
  if (tr.state === 'away' && tr.timer <= 0) {
    tr.state = 'arriving'; tr.y = MAP_H * T + 30; tr.visible = true; tr.v = 5 * T;
  } else if (tr.state === 'arriving') {
    const d = tr.y - STOP_Y;
    tr.v = Math.max(0.35 * T, Math.min(5 * T, d * 0.9));
    tr.y -= tr.v * dt;
    if (tr.y <= STOP_Y) { tr.y = STOP_Y; tr.state = 'stopped'; tr.timer = tr.dwell; onTrainStopped(tr); }
  } else if (tr.state === 'stopped') {
    tr.open = Math.min(1, tr.open + dt * 2);
    stoppedTick(tr);
    if (tr.timer <= 0) { tr.open = 0; tr.state = 'leaving'; tr.v = 0; }
  } else if (tr.state === 'leaving') {
    tr.v = Math.min(6 * T, tr.v + 1.2 * T * dt);
    tr.y += tr.v * dt;
    if (tr.y > MAP_H * T + 40) { tr.state = 'away'; tr.visible = false; tr.timer = tr.away; tr.events = {}; }
  }
}
const doorPoint = (tr, i) => ({ x: tr.doorX, y: tr.y + tr.doors[i] });

function onTrainStopped(tr) {
  tr.events = {};
  const n = 2 + Math.floor(Math.random() * 3);
  for (let i = 0; i < n; i++) later(0.9 + i * 1.4, () => spawnAlighting(tr, (i + 1) % tr.doors.length));
  // the conductor steps out at the front door
  const d = doorPoint(tr, 0);
  const c = makeActor(d.x, d.y, { body: '#22324a', skin: rnd(SKIN), hair: '#1c1c1c', hat: '#22324a' }, { role: 'conductor', pitch: 120 });
  c.tasks.push({ walk: [d.x + tr.side * 0.9 * T, d.y + 0.5 * T] }, { face: tr.side > 0 ? Math.PI : 0 });
  tr.conductor = c;
  actors.push(c);
  if (child && !child.busy) later(1.2, () => say(child, ['train']));
  if (parent) later(3.4, () => say(parent, ['train']));
}

function stoppedTick(tr) {
  const ev = tr.events;
  const c = tr.conductor;
  if (!ev.board && tr.timer < tr.dwell - 10) { ev.board = true; spawnBoarders(tr); }
  if (!ev.call1 && tr.timer < 7) { ev.call1 = true; say(c, ['train', 'go']); later(1.4, () => say(child, ['train', 'go'])); }
  if (!ev.call2 && tr.timer < 4) { ev.call2 = true; say(c, ['train', 'go']); }
  if (!ev.in && tr.timer < 2) {
    ev.in = true;
    const d = doorPoint(tr, 0);
    c.tasks = [{ walk: [d.x, d.y] }, { fade: true }];
  }
}

function spawnAlighting(tr, door) {
  const d = doorPoint(tr, door);
  const p = makeActor(d.x, d.y, randomLook(), { role: 'traveller' });
  p.alpha = 0;
  const ax = tr.aisle;
  p.tasks.push(
    { fn: (a) => { a.alpha = 1; } },
    { walk: [d.x + tr.side * 1.1 * T, d.y] },
    { walk: [ax, d.y] },
    { walk: [ax, 11 * T] },
    { walk: [tr.gateX, 7.5 * T] },
    { walk: [tr.gateX + (Math.random() - 0.5) * 2 * T, 3 * T] },
    { fade: true },
  );
  actors.push(p);
}

function spawnBoarders(tr) {
  const n = 1 + Math.floor(Math.random() * 3);
  for (let i = 0; i < n; i++) {
    later(i * 2.2, () => {
      if (tr.state !== 'stopped') return;
      const door = 1 + Math.floor(Math.random() * 3);
      const d = doorPoint(tr, door);
      const p = makeActor(tr.gateX, 3 * T, randomLook(), { role: 'traveller' });
      p.speed = 2.1 * T;
      p.tasks.push(
        { walk: [tr.gateX, 11 * T] },
        { walk: [tr.aisle, d.y] },
        { walk: [d.x + tr.side * 1.1 * T, d.y] },
        { walk: [d.x, d.y] },
        { fade: true },
      );
      actors.push(p);
    });
  }
}

// ===========================================================================
// People who stay on the platform
// ===========================================================================
const worker = makeActor(8 * T, 24 * T, { body: '#4a4f5c', vest: '#f08a24', skin: SKIN[2], hair: '#1c1c1c', size: 9.5 }, { role: 'worker', pitch: 170 });
worker.dir = Math.PI;
const parent = makeActor(3.85 * T, 18.6 * T, { body: '#6b5a8f', skin: SKIN[1], hair: '#2b211c' }, { role: 'parent', pitch: 190, dir: 0 });
const child = makeActor(3.85 * T, 17.5 * T, { body: '#e0b040', skin: SKIN[1], hair: '#2b211c', size: 6.5 }, { role: 'child', pitch: 340, dir: 0 });
actors.push(worker, parent, child);
const RESIDENTS = [worker, parent, child];

const greeted = new WeakSet();
let lastAtPlayer = { worker: -99, parent: -99, child: -99 };

function residentsTick() {
  // The worker greets every traveller who passes close by, and they answer.
  if (!worker.bubble) {
    for (const a of actors) {
      if (a.role !== 'traveller' || greeted.has(a) || a.alpha < 1) continue;
      if (Math.hypot(a.x - worker.x, a.y - worker.y) < 3 * T) {
        greeted.add(a);
        faceTo(worker, a);
        say(worker, ['hello']);
        later(1.1, () => { if (a.gone) return; faceTo(a, worker); say(a, ['hello']); });
        break;
      }
    }
  }
  // They greet you too, when you come close.
  const near = (a, r) => Math.hypot(a.x - player.x, a.y - player.y) < r * T;
  if (S.introDone) {
    if (near(worker, 2.4) && clock - lastAtPlayer.worker > 9 && !worker.bubble) {
      lastAtPlayer.worker = clock; faceTo(worker, player); say(worker, ['hello']);
    }
    if (near(parent, 2.2) && clock - lastAtPlayer.parent > 11 && !parent.bubble) {
      lastAtPlayer.parent = clock; say(parent, ['hello']);
      later(1.2, () => say(child, ['hello']));
    }
  }
}

// ===========================================================================
// Timers
// ===========================================================================
let clock = 0;
const timers = [];
function later(s, fn) { timers.push({ at: clock + s, fn }); }

// ===========================================================================
// Input: touch anywhere and drag. The stick appears where you touch.
// ===========================================================================
const stick = { on: false, id: null, ox: 0, oy: 0, dx: 0, dy: 0 };
const STICK_R = 46;
canvas.addEventListener('pointerdown', (e) => {
  audio();
  if (stick.on) return;
  stick.on = true; stick.id = e.pointerId; stick.ox = e.clientX; stick.oy = e.clientY; stick.dx = 0; stick.dy = 0;
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (!stick.on || e.pointerId !== stick.id) return;
  let dx = e.clientX - stick.ox, dy = e.clientY - stick.oy;
  const d = Math.hypot(dx, dy);
  if (d > STICK_R) { dx = dx / d * STICK_R; dy = dy / d * STICK_R; }
  stick.dx = dx; stick.dy = dy;
});
const endStick = (e) => { if (e.pointerId === stick.id) { stick.on = false; stick.dx = stick.dy = 0; } };
canvas.addEventListener('pointerup', endStick);
canvas.addEventListener('pointercancel', endStick);
// keyboard, for desktop
const keys = {};
window.addEventListener('keydown', (e) => { keys[e.key] = true; audio(); });
window.addEventListener('keyup', (e) => { keys[e.key] = false; });

// ===========================================================================
// Movement and collision
// ===========================================================================
const PR = 8;
function blocked(x, y) {
  if (x < 3 * T + PR || x > 13 * T - PR || y < T + PR || y > 35 * T - PR) return true;
  for (const s of SOLIDS.concat(GATES)) {
    const cx = Math.max(s.x * T, Math.min(x, (s.x + s.w) * T));
    const cy = Math.max(s.y * T, Math.min(y, (s.y + s.h) * T));
    if ((x - cx) ** 2 + (y - cy) ** 2 < PR * PR) return true;
  }
  return false;
}
function movePlayer(dt) {
  let ix = stick.dx / STICK_R, iy = stick.dy / STICK_R;
  if (keys.ArrowLeft || keys.a) ix -= 1;
  if (keys.ArrowRight || keys.d) ix += 1;
  if (keys.ArrowUp || keys.w) iy -= 1;
  if (keys.ArrowDown || keys.s) iy += 1;
  const m = Math.hypot(ix, iy);
  if (m > 1) { ix /= m; iy /= m; }
  player.moving = m > 0.15;
  if (!player.moving) return;
  const sp = 3 * T * dt;
  const nx = player.x + ix * sp, ny = player.y + iy * sp;
  if (!blocked(nx, player.y)) player.x = nx;
  if (!blocked(player.x, ny)) player.y = ny;
  player.dir = Math.atan2(iy, ix);
}

// ===========================================================================
// Opening: you arrive on train A.
// ===========================================================================
let intro = !S.introDone;
function startIntro() {
  const A = trains[0];
  A.state = 'arriving'; A.visible = true; A.y = MAP_H * T + 30; A.v = 5 * T;
  trains[1].timer = 22;
}
function introTick() {
  const A = trains[0];
  if (A.state === 'stopped' && A.open >= 1 && !player.out) {
    player.out = true;
    const d = doorPoint(A, 2);
    player.x = d.x + 0.4 * T; player.y = d.y;
    player.dir = 0;
    S.introDone = true; intro = false;
    writeSave();
  }
}

// ===========================================================================
// Main loop
// ===========================================================================
let last = performance.now(), saveTimer = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  clock += dt;
  for (let i = timers.length - 1; i >= 0; i--) if (timers[i].at <= clock) { const t = timers.splice(i, 1)[0]; t.fn(); }

  for (const tr of trains) updateTrain(tr, dt);
  if (intro) introTick(); else movePlayer(dt);
  for (const a of actors) {
    runTasks(a, dt);
    if (a.bubble && a.bubble.until < clock) a.bubble = null;
  }
  for (let i = actors.length - 1; i >= 0; i--) if (actors[i].gone) actors.splice(i, 1);
  if (player.bubble && player.bubble.until < clock) player.bubble = null;
  residentsTick();

  // camera
  view.w = W; view.h = H; view.scale = viewScale(W);
  const target = intro ? { x: 8 * T, y: trains[0].y + 10 * T } : player;
  const halfW = W / 2 / view.scale, halfH = H / 2 / view.scale;
  let tx = MAP_W * T > halfW * 2 ? Math.max(halfW, Math.min(MAP_W * T - halfW, target.x)) : MAP_W * T / 2;
  let ty = Math.max(halfH - T, Math.min(MAP_H * T - halfH + T, target.y));
  view.cx += (tx - view.cx) * Math.min(1, dt * 4);
  view.cy += (ty - view.cy) * Math.min(1, dt * 4);

  saveTimer += dt;
  if (saveTimer > 3 && !intro) { saveTimer = 0; S.px = player.x; S.py = player.y; writeSave(); }

  draw();
  requestAnimationFrame(frame);
}

function liveState() {
  const people = intro ? actors : [player, ...actors];
  return {
    t: clock, trains, actors: people, gatesOpen: false,
    bubbles: people.filter((a) => a.bubble).map((a) => ({ actorId: a.id, g: a.bubble.g })),
  };
}

function draw() {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  renderWorld(ctx, view, liveState());
  if (stick.on) {
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(stick.ox, stick.oy, STICK_R, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.5)';
    ctx.beginPath(); ctx.arc(stick.ox + stick.dx, stick.oy + stick.dy, 20, 0, Math.PI * 2); ctx.fill();
  }
  if (clock < 1.5) { ctx.fillStyle = `rgba(0,0,0,${1 - clock / 1.5})`; ctx.fillRect(0, 0, W, H); }
}

// ===========================================================================
// Boot
// ===========================================================================
resize();
if (S.introDone) {
  player.out = true;
  player.x = S.px || 6 * T; player.y = S.py || 22 * T;
  view.cx = player.x; view.cy = player.y;
  trains[0].timer = 3; trains[1].timer = 10;
} else {
  startIntro();
  view.cy = MAP_H * T - 6 * T;
}
initPanels();
requestAnimationFrame(frame);
