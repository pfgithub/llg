'use strict';

// ===========================================================================
// State
// ===========================================================================
const SAVE_KEY = 'llg-save-v2';
const SETTINGS_KEY = 'llg-settings-v1';

function freshState() {
  return { scene: 'shore', inv: [], flags: {}, seen: [], confirmed: {}, slots: {}, solved: {}, notified: {}, newItems: [] };
}

let S = freshState();
let settings = { sound: true };
let selected = null;   // currently selected inventory item id
let busy = false;      // a script is running
let journalDot = false;

function store(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* storage unavailable */ } }
function load(key) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
function save() { store(SAVE_KEY, S); }
function hasSave() { const s = load(SAVE_KEY); return !!(s && s.seen && s.seen.length); }

const flag = (f) => !!S.flags[f];
const set = (f) => { S.flags[f] = true; save(); checkPages(); };

// ===========================================================================
// Audio — every glyph has its own little pitch, so the language has a sound.
// ===========================================================================
let AC = null;
function ac() {
  if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
  if (AC.state === 'suspended') AC.resume();
  return AC;
}
function tone(freq, dur = 0.12, type = 'triangle', vol = 0.07, when = 0) {
  if (!settings.sound) return;
  const a = ac(); if (!a) return;
  const t = a.currentTime + when;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(a.destination);
  o.start(t); o.stop(t + dur + 0.05);
}
const SCALE = [1, 9 / 8, 5 / 4, 3 / 2, 5 / 3, 2, 9 / 4];
function voice(who, g) {
  const i = GLYPH_IDS.indexOf(g);
  const base = (who && who.pitch) || 220;
  const f = base * SCALE[i % SCALE.length] * (Math.floor(i / SCALE.length) % 2 ? 1.12 : 1);
  tone(f, 0.16, 'triangle', 0.07);
  tone(f * 2, 0.08, 'sine', 0.02, 0.02);
}
const sfx = {
  tap: () => tone(660, 0.05, 'sine', 0.04),
  pickup: () => { tone(523, 0.1); tone(784, 0.14, 'triangle', 0.07, 0.08); },
  chime: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.35, 'sine', 0.06, i * 0.1)),
  big: () => [392, 523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.6, 'triangle', 0.06, i * 0.12)),
  nope: () => { tone(180, 0.15, 'square', 0.03); tone(150, 0.2, 'square', 0.03, 0.1); },
  door: () => { tone(110, 0.25, 'sawtooth', 0.03); tone(82, 0.35, 'sawtooth', 0.03, 0.12); },
  splash: () => [900, 700, 1100, 600].forEach((f, i) => tone(f, 0.08, 'sine', 0.04, i * 0.05)),
  page: () => { tone(300, 0.06, 'sine', 0.03); tone(450, 0.06, 'sine', 0.03, 0.05); },
};

// ===========================================================================
// DOM helpers
// ===========================================================================
const $ = (q) => document.querySelector(q);
function h(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// ===========================================================================
// Glyphs, hints and the journal's knowledge
// ===========================================================================
function glyphSVG(id) {
  return `<svg class="glyph" viewBox="0 0 100 100" aria-hidden="true">${GLYPHS[id].map((d) => `<path d="${d}"/>`).join('')}</svg>`;
}
function pictoHTML(id) {
  const p = PICTO[id];
  if (p.e) return `<span class="pe">${p.e}</span>`;
  if (p.c) return `<span class="swatch" style="background:${p.c}"></span>`;
  if (p.dots) return `<span class="dots">${'<i></i>'.repeat(p.dots)}</span>`;
  return p.svg;
}
// What the player currently believes a glyph means: confirmed, or a tentative journal placement.
function hintFor(id) {
  if (S.confirmed[id]) return { html: pictoHTML(id), sure: true };
  for (const pg of PAGES) {
    const sl = S.slots[pg.id];
    if (!sl) continue;
    const i = sl.indexOf(id);
    if (i >= 0) return { html: pictoHTML(pg.words[i]), sure: false };
  }
  return null;
}
function markSeen(id) {
  if (!S.seen.includes(id)) { S.seen.push(id); save(); checkPages(); }
}
function glyphCell(id, withHint = true) {
  markSeen(id);
  const hint = withHint ? hintFor(id) : null;
  return `<span class="gcell" data-g="${id}">${glyphSVG(id)}${withHint ? `<span class="hint ${hint && !hint.sure ? 'tent' : ''}">${hint ? hint.html : ''}</span>` : ''}</span>`;
}

function pageUnlocked(pg) {
  return pg.words.every((w) => S.seen.includes(w)) && (!pg.flag || S.flags[pg.flag]);
}
function checkPages() {
  let any = false;
  for (const pg of PAGES) {
    if (!S.notified[pg.id] && pageUnlocked(pg)) { S.notified[pg.id] = true; any = true; }
  }
  if (any) {
    save();
    journalDot = true;
    renderTopbar();
    setTimeout(sfx.page, 300);
    setTimeout(renderPointer, 50);
  }
}

// ===========================================================================
// Inventory
// ===========================================================================
const has = (it, n = 1) => S.inv.filter((x) => x === it).length >= n;
const count = (it) => S.inv.filter((x) => x === it).length;
function give(it) {
  S.inv.push(it);
  if (!S.newItems.includes(it)) S.newItems.push(it);
  save(); sfx.pickup(); renderInv();
}
function take(it, n = 1) {
  for (let k = 0; k < n; k++) { const i = S.inv.indexOf(it); if (i >= 0) S.inv.splice(i, 1); }
  if (selected === it && !has(it)) selected = null;
  save(); renderInv();
}
function renderInv() {
  const bar = $('#inv');
  bar.innerHTML = '';
  S.inv.forEach((it) => {
    const b = h(`<button class="item ${selected === it ? 'sel' : ''} ${S.newItems.includes(it) ? 'new' : ''}">${itemIcon(it)}</button>`);
    b.onclick = () => {
      if (busy) return;
      sfx.tap();
      selected = selected === it ? null : it;
      S.newItems = S.newItems.filter((x) => x !== it);
      if (!flag('everSelected')) set('everSelected');
      save(); renderInv(); renderPointer();
    };
    bar.appendChild(b);
  });
}

// ===========================================================================
// Dialogue
// ===========================================================================
const PLAYER = { e: '🧑', pitch: 300 };
const N = {
  fisher: { e: '🧔', pitch: 150 },
  baker: { e: '🧑‍🍳', pitch: 260 },
  elder: { e: '👵', pitch: 210 },
  gardener: { e: '🧑‍🌾', pitch: 240 },
  guard: { e: '💂', pitch: 120 },
  keeper: { e: '🧙', pitch: 170 },
  well: { art: wellSVG(), pitch: 330 },
  sign: { icon: ICONS.sign, pitch: 280 },
};
function portraitHTML(who) {
  if (who.e) return `<span class="emoji">${who.e}</span>`;
  if (who.art) return who.art;
  return `<span class="picon">${who.icon}</span>`;
}

// Shows one line of glyphs. With options, waits for a choice and returns its index.
function showLine(who, glyphs, options) {
  return new Promise((resolve) => {
    const layer = $('#dlayer');
    layer.hidden = false;
    layer.innerHTML = `<div class="dialog ${who === PLAYER ? 'mine' : ''}">
      <div class="portrait">${portraitHTML(who)}</div>
      <div class="dbody"><div class="line"></div><div class="choices"></div></div>
      <div class="more"></div></div>`;
    const dlg = layer.querySelector('.dialog');
    const line = layer.querySelector('.line');
    const cells = [];
    glyphs.forEach((g) => {
      if (g === '/') { line.appendChild(h('<span class="br"></span>')); return; }
      const c = h(glyphCell(g));
      c.classList.add('hide');
      line.appendChild(c);
      cells.push([c, g]);
    });
    let i = 0, done = false, timer = null;
    const finish = () => {
      clearTimeout(timer);
      cells.forEach(([c]) => c.classList.remove('hide'));
      done = true;
      if (options) {
        const box = layer.querySelector('.choices');
        options.forEach((opt, idx) => {
          const b = h(`<button class="choice">${opt.map((g) => glyphCell(g)).join('')}</button>`);
          b.onclick = (e) => { e.stopPropagation(); sfx.tap(); hideDialog(); resolve(idx); };
          box.appendChild(b);
        });
      } else dlg.classList.add('ready');
    };
    const step = () => {
      if (i < cells.length) {
        cells[i][0].classList.remove('hide');
        voice(who, cells[i][1]);
        i++;
        timer = setTimeout(step, 210);
      } else finish();
    };
    layer.onclick = () => {
      if (!done) { finish(); return; }
      if (!options) { layer.onclick = null; resolve(); }
    };
    step();
  });
}
const say = (who, glyphs) => showLine(who, glyphs, null);
const ask = (who, glyphs, options) => showLine(who, glyphs, options);
function hideDialog() { const l = $('#dlayer'); l.hidden = true; l.innerHTML = ''; l.onclick = null; }

// The player builds a sentence from glyphs they have seen. Returns the glyph list or null.
function compose(who, prompt) {
  hideDialog();
  return new Promise((resolve) => {
    const ov = h(`<div class="overlay compose">
      <div class="cpanel">
        <div class="cprompt"><div class="portrait">${portraitHTML(who)}</div><div class="line">${prompt.map((g) => glyphCell(g)).join('')}</div></div>
        <div class="cstrip"><div class="portrait">${portraitHTML(PLAYER)}</div><div class="strip"></div></div>
        <div class="keys"></div>
        <div class="cctrl">
          <button class="iconbtn cancel">${ICONS.close}</button>
          <button class="iconbtn del">${ICONS.back}</button>
          <button class="iconbtn send">${ICONS.speak}</button>
        </div>
      </div></div>`);
    document.body.appendChild(ov);
    const words = [];
    const strip = ov.querySelector('.strip');
    const keys = ov.querySelector('.keys');
    const send = ov.querySelector('.send');
    const draw = () => {
      strip.innerHTML = '';
      words.forEach((g, idx) => {
        const c = h(`<button class="skey">${glyphCell(g, false)}</button>`);
        c.onclick = () => { words.splice(idx, 1); sfx.tap(); draw(); };
        strip.appendChild(c);
      });
      for (let k = words.length; k < 4; k++) strip.appendChild(h('<span class="sempty"></span>'));
      send.classList.toggle('dim', !words.length);
    };
    S.seen.forEach((g) => {
      const b = h(`<button class="key">${glyphCell(g)}</button>`);
      b.onclick = () => { if (words.length < 7) { words.push(g); voice(PLAYER, g); draw(); } };
      keys.appendChild(b);
    });
    const close = (v) => { ov.remove(); resolve(v); };
    ov.querySelector('.cancel').onclick = () => { sfx.tap(); close(null); };
    ov.querySelector('.del').onclick = () => { words.pop(); sfx.tap(); draw(); };
    send.onclick = () => { if (words.length) close(words.slice()); };
    draw();
  });
}

// ===========================================================================
// Scripts for each character / object.
// The story is a chain: each step brings in only a few new glyphs.
//   shore:   hello fish yes not
//   baker:   me want good food            (signs: house water tree fire big)
//   guard:   you go one two what
//   hall:    door red yellow
//   keeper:  give key
//   forest:  flower blue  ...then back to the old woman for fire.
// ===========================================================================
const fisher = {
  ...N.fisher,
  async talk() {
    if (!flag('metFisher')) {
      await say(N.fisher, ['hello']);
      // The only possible answer: you learn that the buttons are your own voice.
      await ask(PLAYER, [], [['hello']]);
      set('metFisher');
      renderScene();
    }
    if (has('fish')) return say(N.fisher, ['fish']);
    if (!flag('fishShown')) {
      set('fishShown');
      renderScene();
      sfx.splash();
      await wait(500);
    }
    const c = await ask(N.fisher, ['fish'], [['yes'], ['not']]);
    if (c === 0) {
      await say(PLAYER, ['yes']);
      give('fish');
      set('gotFish');
      renderScene();
      await say(N.fisher, ['fish']);
    } else {
      await say(PLAYER, ['not']);
      await say(N.fisher, ['not', 'fish']);
    }
  },
};

const baker = {
  ...N.baker,
  async talk() {
    if (!flag('metBaker')) { set('metBaker'); await say(N.baker, ['hello']); }
    await say(N.baker, ['me', 'want', 'fish']);
  },
  async receive(it) {
    if (it !== 'fish') return false;
    if (!flag('metBaker')) await this.talk();
    take('fish');
    await say(N.baker, ['good']);
    give('food');
    set('bakerTraded');
    await say(N.baker, ['food']);
  },
};

const elder = {
  ...N.elder,
  async talk() {
    if (!flag('metKeeper')) {
      // Asleep until there is a reason to wake her.
      wiggle('elder');
      tone(90, 0.5, 'sine', 0.05); tone(70, 0.6, 'sine', 0.05, 0.5);
      return;
    }
    if (flag('gotTorch')) return say(N.elder, ['fire', 'good']);
    if (flag('elderAsked')) return say(N.elder, ['me', 'want', 'flower', 'yellow']);
    if (!flag('metElder')) { set('metElder'); await say(N.elder, ['hello']); }
    const r = await compose(N.elder, ['you', 'want', 'what']);
    if (!r) return;
    await say(PLAYER, r);
    if (r.includes('fire') && !r.includes('not')) {
      await say(N.elder, ['good']);
      set('elderAsked');
      await say(N.elder, ['me', 'want', 'flower', 'yellow']);
    } else {
      await say(N.elder, ['what']);
    }
  },
  async receive(it) {
    if (!flag('metKeeper') || !it.startsWith('flower') || flag('gotTorch')) return false;
    if (it !== 'flower_yellow') {
      sfx.nope();
      await say(N.elder, ['not']);
      await say(N.elder, ['flower', 'yellow']);
      return;
    }
    take(it);
    set('elderAsked');
    await say(N.elder, ['good']);
    give('torch');
    set('gotTorch');
    await say(N.elder, ['me', 'give', 'fire']);
  },
};

const gardener = {
  ...N.gardener,
  async talk() {
    if (flag('watered')) return say(N.gardener, ['flower', 'good']);
    if (!flag('metGardener')) { set('metGardener'); await say(N.gardener, ['hello']); }
    await say(N.gardener, ['me', 'want', 'water']);
  },
  async receive(it) {
    if (it !== 'water' || flag('watered')) return false;
    take('water');
    sfx.splash();
    set('watered');
    renderScene();
    await say(N.gardener, ['good']);
    await say(N.gardener, ['flower', 'good']);
  },
};

async function guardAsk() {
  const r = await compose(N.guard, ['you', 'want', 'what']);
  if (!r) return;
  await say(PLAYER, r);
  if (r.includes('go') && !r.includes('not')) {
    await say(N.guard, ['good']);
    set('gateOpen');
    sfx.door();
    renderScene();
    await say(N.guard, ['you', 'go']);
  } else {
    await say(N.guard, ['what']);
  }
}
const guard = {
  ...N.guard,
  async talk() {
    if (flag('gateOpen')) return say(N.guard, ['you', 'go']);
    if (flag('guardFed')) return guardAsk();
    if (!flag('metGuard')) { set('metGuard'); await say(N.guard, ['hello']); }
    await say(N.guard, ['you', 'not', 'go']);
    await say(N.guard, ['me', 'want', 'food', 'two']);
  },
  async receive(it) {
    if (it !== 'food' || flag('guardFed')) return false;
    if (count('food') < 2) {
      sfx.nope();
      await say(N.guard, ['food', 'one', 'not', 'good']);
      await say(N.guard, ['me', 'want', 'food', 'two']);
      return;
    }
    take('food', 2);
    set('guardFed');
    await say(N.guard, ['food', 'one']);
    await say(N.guard, ['food', 'two']);
    await say(N.guard, ['good']);
    await guardAsk();
  },
};

async function lightFire() {
  take('torch');
  set('lit');
  sfx.big();
  renderScene();
  await wait(700);
  await say(N.keeper, ['good']);
  await say(N.keeper, ['fire', 'big', 'good']);
  await say(N.keeper, ['you', 'good']);
  hideDialog();
  showEnding();
}
const keeper = {
  ...N.keeper,
  async talk() {
    if (flag('lit')) return say(N.keeper, ['fire', 'big', 'good']);
    if (!flag('metKeeper')) { await say(N.keeper, ['hello']); }
    await say(N.keeper, ['not', 'fire', 'big']);
    await say(N.keeper, ['me', 'want', 'fire']);
    if (!flag('metKeeper')) {
      set('metKeeper');
      give('key');
      await say(N.keeper, ['me', 'give', 'key']);
    }
  },
  async receive(it) {
    if (it !== 'torch') return false;
    await lightFire();
  },
};

async function forestGate() {
  if (flag('forestOpen')) return goto('forest');
  if (has('key')) {
    take('key');
    set('forestOpen');
    sfx.door();
    renderScene();
    await wait(500);
    return goto('forest');
  }
  wiggle('fgate');
  sfx.nope();
}

function bush(color, x, y) {
  return {
    id: 'bush_' + color, x, y, w: 15,
    art: () => flowerSVG(color, !flag('watered')),
    async tap() {
      if (!flag('watered')) {
        wiggle(this.id);
        await say(N.gardener, ['me', 'want', 'water']);
        return;
      }
      for (const c of Object.keys(COLORS)) if (has('flower_' + c)) take('flower_' + c);
      give('flower_' + color);
    },
  };
}

// Exits are signposts naming the destination, plus an arrow.
function exit(to, sign, x, y, dir) {
  return { id: 'exit_' + to, x, y, sign: [sign], arrow: dir, cls: 'exit', tap: () => goto(to) };
}
function plaque(id, rows, x, y, gs) {
  return { id, x, y, sign: rows, gs, tap: () => say(N.sign, rows.flatMap((r, i) => (i ? ['/', ...r] : r))) };
}

// ===========================================================================
// Scenes. Positions are % of the scene; sizes are % of scene width.
// ===========================================================================
const SCENES = {
  shore: {
    bg: 'linear-gradient(#ffd9a8 0%, #ffeccc 28%, #7fc1dc 28.3%, #3f8fb8 58%, #f1dcab 58.3%, #dcc08a 100%)',
    objs: () => [
      { id: 'sun', x: 80, y: 9, s: 12, e: '☀️', deco: true },
      { id: 'boat', x: 24, y: 42, s: 16, e: '⛵', deco: true, cls: 'bob' },
      { id: 'palm', x: 9, y: 62, s: 22, e: '🌴', deco: true },
      { id: 'shell', x: 70, y: 92, s: 6, e: '🐚', deco: true },
      { id: 'crab', x: 22, y: 90, s: 7, e: '🦀', deco: true, cls: 'scuttle' },
      { id: 'rod', x: 56, y: 70, s: 10, e: '🎣', deco: true },
      { id: 'caught', x: 52, y: 60, s: 9, e: '🐟', deco: true, cls: 'bob', show: () => flag('fishShown') && !has('fish') },
      { id: 'fisher', x: 42, y: 73, s: 19, npc: fisher },
      { ...exit('village', ['house'], 84, 74, 'upright'), show: () => flag('gotFish') },
    ],
  },
  village: {
    bg: 'linear-gradient(#bfe3f2 0%, #e2f3f8 24%, #a6d36e 24.3%, #7cb342 100%)',
    objs: () => [
      { id: 'tree1', x: 8, y: 24, s: 15, e: '🌳', deco: true },
      { id: 'house2', x: 88, y: 32, s: 17, e: '🏡', deco: true },
      { id: 'bakery', x: 24, y: 33, w: 32, art: bakerySVG, deco: true },
      plaque('foodsign', [['food']], 24, 47, 6),
      { id: 'baker', x: 25, y: 57, s: 14, npc: baker },
      { id: 'well', x: 62, y: 45, w: 20, art: wellSVG, tap: wellTap },
      plaque('wellsign', [['water']], 62, 32, 6),
      { id: 'elder', x: 40, y: 80, s: 14, npc: elder },
      { id: 'zzz', x: 48, y: 72, s: 6, e: '💤', deco: true, cls: 'bob', show: () => !flag('metKeeper') },
      { id: 'campfire', x: 54, y: 85, s: 9, e: '🔥', deco: true, cls: 'flicker' },
      { id: 'fgate', x: 86, y: 66, w: 20, art: () => fenceGateSVG(flag('forestOpen')), tap: forestGate, receive: (it) => (it === 'key' ? forestGate() : false) },
      { id: 'fsign', x: 86, y: 53, sign: [['tree']], arrow: 'right', cls: 'exit', tap: forestGate },
      exit('shore', ['water'], 13, 93, 'downleft'),
      exit('gate', ['fire', 'big'], 52, 10, 'up'),
    ],
  },
  forest: {
    bg: 'linear-gradient(#24472d 0%, #356b3d 40%, #4f8f4f 100%)',
    objs: () => [
      { id: 't1', x: 10, y: 18, s: 22, e: '🌲', deco: true },
      { id: 't2', x: 36, y: 10, s: 18, e: '🌲', deco: true },
      { id: 't3', x: 68, y: 14, s: 22, e: '🌳', deco: true },
      { id: 't4', x: 92, y: 26, s: 18, e: '🌲', deco: true },
      { id: 't5', x: 6, y: 58, s: 18, e: '🌳', deco: true },
      { id: 'bird', x: 56, y: 26, s: 7, e: '🐦', deco: true, cls: 'bob' },
      { id: 'mush', x: 46, y: 92, s: 6, e: '🍄', deco: true },
      { id: 'gardener', x: 26, y: 62, s: 15, npc: gardener },
      bush('red', 52, 46),
      plaque('s_red', [['flower', 'red']], 52, 58, 5.5),
      bush('blue', 70, 66),
      plaque('s_blue', [['flower', 'blue']], 70, 78, 5.5),
      bush('yellow', 87, 46),
      plaque('s_yellow', [['flower', 'yellow']], 87, 58, 5.5),
      exit('village', ['house'], 16, 91, 'downleft'),
    ],
  },
  gate: {
    bg: () => flag('lit')
      ? 'linear-gradient(#2a1f4a 0%, #a8553a 55%, #6b6157 55.3%, #4f463e 100%)'
      : 'linear-gradient(#3d3a6b 0%, #c77d6a 55%, #6b6157 55.3%, #4f463e 100%)',
    objs: () => [
      { id: 'tower', x: 50, y: 38, w: 58, art: () => towerSVG(flag('lit'), flag('gateOpen')), tap: gateTap },
      plaque('gatesign', [['fire', 'big']], 50, 52, 6),
      { id: 'guard', x: 75, y: 73, s: 16, npc: guard },
      exit('village', ['house'], 16, 91, 'downleft'),
    ],
  },
  hall: {
    bg: 'linear-gradient(#3b3542 0%, #2f2a36 62%, #4a4250 62.3%, #3a3340 100%)',
    objs: () => [
      plaque('hallsign', [['door', 'red', 'not', 'good'], ['door', 'yellow', 'not', 'good']], 50, 16, 6),
      { id: 'c1', x: 8, y: 34, s: 8, e: '🕯️', deco: true, cls: 'flicker' },
      { id: 'c2', x: 92, y: 34, s: 8, e: '🕯️', deco: true, cls: 'flicker' },
      { id: 'dred', x: 20, y: 52, w: 22, art: () => doorSVG(COLORS.red), tap: () => wrongDoor('red') },
      { id: 'dblue', x: 50, y: 52, w: 22, art: () => doorSVG(COLORS.blue), tap: () => goto('top') },
      { id: 'dyellow', x: 80, y: 52, w: 22, art: () => doorSVG(COLORS.yellow), tap: () => wrongDoor('yellow') },
      { id: 'hexit', x: 50, y: 90, sign: [[]], arrow: 'down', cls: 'exit', tap: () => goto('gate') },
    ],
  },
  top: {
    bg: () => flag('lit')
      ? 'radial-gradient(circle at 62% 45%, #ffcf7a 0%, #c9643a 30%, #3a1f3a 70%, #1d1530 100%)'
      : 'linear-gradient(#070b24 0%, #1d2a5a 62%, #5a5260 62.3%, #3f3846 100%)',
    objs: () => [
      { id: 'moon', x: 84, y: 9, s: 10, e: '🌙', deco: true },
      { id: 's1', x: 18, y: 12, s: 4, e: '✨', deco: true, cls: 'twinkle' },
      { id: 's2', x: 50, y: 6, s: 3, e: '✨', deco: true, cls: 'twinkle' },
      { id: 's3', x: 66, y: 22, s: 3.5, e: '✨', deco: true, cls: 'twinkle' },
      { id: 'brazier', x: 62, y: 50, w: 44, art: () => brazierSVG(flag('lit')), tap: () => (flag('lit') ? say(N.keeper, ['fire', 'big', 'good']) : say(N.keeper, ['not', 'fire', 'big'])), receive: (it) => (it === 'torch' ? lightFire() : false) },
      { id: 'keeper', x: 24, y: 68, s: 16, npc: keeper },
      { id: 'texit', x: 50, y: 92, sign: [[]], arrow: 'down', cls: 'exit', tap: () => goto('hall') },
    ],
  },
};

async function wellTap() {
  if (!has('water')) give('water');
  sfx.splash();
  await say(N.well, ['water']);
}
async function gateTap() {
  if (flag('gateOpen')) return goto('hall');
  await say(N.guard, ['you', 'not', 'go']);
}
async function wrongDoor(color) {
  sfx.door();
  await goto('gate', true);
  await say(N.guard, ['door', color, 'not', 'good']);
}

// ===========================================================================
// Scene rendering and input
// ===========================================================================
function wiggle(id) {
  const el = document.querySelector(`[data-id="${id}"]`);
  if (!el) return;
  el.classList.remove('wiggle'); void el.offsetWidth; el.classList.add('wiggle');
}

function renderScene() {
  const def = SCENES[S.scene];
  const scene = $('#scene');
  scene.style.background = typeof def.bg === 'function' ? def.bg() : def.bg;
  const layer = $('#objs');
  layer.innerHTML = '';
  for (const o of def.objs()) {
    if (o.show && !o.show()) continue;
    let el;
    if (o.sign) {
      el = h(`<div class="obj sign ${o.cls || ''}" style="--gs:${o.gs || 7}cqw">${o.sign.map((row) => `<div class="srow">${row.map((g) => glyphCell(g, false)).join('')}</div>`).join('')}${o.arrow ? arrowSVG(o.arrow) : ''}</div>`);
    } else if (o.npc) {
      el = h(`<div class="obj npc emoji" style="font-size:${o.s}cqw">${o.npc.e}</div>`);
    } else if (o.e) {
      el = h(`<div class="obj emoji ${o.cls || ''}" style="font-size:${o.s}cqw">${o.e}</div>`);
    } else {
      el = h(`<div class="obj art ${o.cls || ''}" style="width:${o.w}cqw">${o.art()}</div>`);
    }
    el.dataset.id = o.id;
    el.style.left = o.x + '%';
    el.style.top = o.y + '%';
    el.style.zIndex = Math.round(o.y) + (o.sign ? 50 : 0);
    if (o.deco) el.classList.add('deco');
    else el.onclick = (e) => { e.stopPropagation(); onTap(o); };
    layer.appendChild(el);
  }
  renderPointer();
}

async function onTap(o) {
  if (busy) return;
  busy = true;
  renderPointer();
  try {
    const target = o.npc || o;
    if (selected) {
      const it = selected;
      selected = null;
      renderInv();
      const r = target.receive ? await target.receive(it) : false;
      if (r === false) {
        if (o.npc) await say(o.npc, ['me', 'not', 'want', ...ITEMS[it].g]);
        else { wiggle(o.id); sfx.nope(); }
      }
    } else {
      sfx.tap();
      if (o.npc) await o.npc.talk();
      else if (o.tap) await o.tap.call(o);
    }
  } finally {
    hideDialog();
    busy = false;
    renderPointer();
  }
}

async function goto(scene, quick) {
  const fade = $('#fade');
  fade.classList.add('on');
  await wait(quick ? 350 : 260);
  S.scene = scene;
  save();
  hideDialog();
  renderScene();
  fade.classList.remove('on');
  await wait(200);
}

// A pointing hand teaches the controls without words.
function renderPointer() {
  const p = $('#pointer');
  let target = null;
  const p1 = PAGES[0];
  if (!$('#journal').hidden) {
    // Inside the journal: show where the first glyph goes, once.
    if (jIndex === 1 && !S.solved[p1.id] && !(S.slots[p1.id] || []).some(Boolean) && !document.querySelector('.pickwrap')) target = document.querySelector('#journal .slot');
  } else if (!busy && $('#title').hidden && !document.querySelector('.overlay.compose, .overlay.menu, .overlay.ending')) {
    if (pageUnlocked(p1) && !S.solved[p1.id] && !flag('journalOpened')) target = $('#btnJournal');
    else if (S.scene === 'shore' && !flag('gotFish')) target = document.querySelector('[data-id="fisher"]');
    else if (has('fish') && !flag('everSelected') && S.scene === 'village') target = document.querySelector('#inv .item');
    else if (selected === 'fish' && !flag('bakerTraded') && S.scene === 'village') target = document.querySelector('[data-id="baker"]');
  }
  if (!target) { p.hidden = true; return; }
  const r = target.getBoundingClientRect();
  p.hidden = false;
  p.style.left = r.left + r.width / 2 + 'px';
  p.style.top = r.top + r.height * 0.6 + 'px';
}

// ===========================================================================
// Journal
// ===========================================================================
let jIndex = 0; // 0 = lexicon, n = PAGES[n-1]

function openJournal() {
  if (busy) return;
  sfx.page();
  journalDot = false;
  if (!flag('journalOpened')) set('journalOpened');
  renderTopbar();
  // Jump to the newest unsolved page if there is one.
  const firstOpen = PAGES.findIndex((p) => pageUnlocked(p) && !S.solved[p.id]);
  jIndex = firstOpen >= 0 ? firstOpen + 1 : 0;
  $('#journal').hidden = false;
  renderJournal();
}
function closeJournal() { $('#journal').hidden = true; sfx.page(); renderScene(); }

function renderJournal() {
  const j = $('#journal');
  const avail = [0, ...PAGES.map((p, i) => (pageUnlocked(p) ? i + 1 : -1)).filter((i) => i > 0)];
  const pos = avail.indexOf(jIndex);
  const dots = [`<button class="jdot lex ${jIndex === 0 ? 'cur' : ''}" data-i="0">${ICONS.book}</button>`]
    .concat(PAGES.map((p, i) => {
      const st = S.solved[p.id] ? 'solved' : pageUnlocked(p) ? 'open' : 'locked';
      return `<button class="jdot ${st} ${jIndex === i + 1 ? 'cur' : ''}" data-i="${i + 1}"></button>`;
    })).join('');
  j.innerHTML = `<div class="jbook">
    <div class="jhead">
      <button class="iconbtn jprev ${pos <= 0 ? 'dim' : ''}">${ICONS.left}</button>
      <div class="jdots">${dots}</div>
      <button class="iconbtn jnext ${pos >= avail.length - 1 ? 'dim' : ''}">${ICONS.right}</button>
      <button class="iconbtn jclose">${ICONS.close}</button>
    </div>
    <div class="jbody"></div></div>`;
  j.querySelector('.jclose').onclick = closeJournal;
  j.querySelector('.jprev').onclick = () => { if (pos > 0) { jIndex = avail[pos - 1]; sfx.page(); renderJournal(); } };
  j.querySelector('.jnext').onclick = () => { if (pos < avail.length - 1) { jIndex = avail[pos + 1]; sfx.page(); renderJournal(); } };
  j.querySelectorAll('.jdot').forEach((d) => {
    d.onclick = () => { const i = +d.dataset.i; if (avail.includes(i)) { jIndex = i; sfx.page(); renderJournal(); } };
  });
  const body = j.querySelector('.jbody');
  if (jIndex === 0) renderLexicon(body);
  else renderPage(body, PAGES[jIndex - 1]);
  renderPointer();
}

function renderLexicon(body) {
  const known = GLYPH_IDS.filter((g) => S.confirmed[g]).length;
  body.innerHTML = `<div class="progress"><div style="width:${(known / GLYPH_IDS.length) * 100}%"></div></div>
    <div class="lex">${S.seen.map((g) => `<div class="lexcell ${S.confirmed[g] ? 'known' : ''}">${glyphCell(g)}</div>`).join('')}
    ${GLYPH_IDS.filter((g) => !S.seen.includes(g)).map(() => '<div class="lexcell unseen"></div>').join('')}</div>`;
}

function renderPage(body, pg) {
  const slots = S.slots[pg.id] || (S.slots[pg.id] = pg.words.map(() => null));
  const solved = !!S.solved[pg.id];
  body.innerHTML = `<div class="page ${solved ? 'solved' : ''}">${pg.words.map((w, i) => `
    <div class="pcell"><div class="picto">${pictoHTML(w)}</div>
    <button class="slot ${slots[i] ? 'filled' : ''}" data-i="${i}">${slots[i] ? glyphSVG(slots[i]) : ''}</button></div>`).join('')}
    ${solved ? '<div class="stamp">' + glyphSVG('good') + '</div>' : ''}</div>`;
  if (solved) return;
  body.querySelectorAll('.slot').forEach((b) => { b.onclick = () => openPicker(pg, +b.dataset.i); });
}

function openPicker(pg, idx) {
  sfx.tap();
  const cands = S.seen.filter((g) => !S.confirmed[g]);
  const ov = h(`<div class="overlay pickwrap"><div class="picker">
      <div class="pgrid">${cands.map((g) => `<button class="pkey ${hintFor(g) ? 'used' : ''}" data-g="${g}">${glyphSVG(g)}</button>`).join('')}</div>
      <div class="pctrl"><button class="iconbtn pclear">${ICONS.back}</button><button class="iconbtn pclose">${ICONS.close}</button></div>
    </div></div>`);
  document.body.appendChild(ov);
  renderPointer();
  const close = () => { ov.remove(); renderPointer(); };
  ov.onclick = (e) => { if (e.target === ov) close(); };
  ov.querySelector('.pclose').onclick = close;
  ov.querySelector('.pclear').onclick = () => { S.slots[pg.id][idx] = null; save(); close(); renderJournal(); };
  ov.querySelectorAll('.pkey').forEach((b) => {
    b.onclick = () => {
      const g = b.dataset.g;
      // A glyph can only sit in one slot at a time.
      for (const p of PAGES) {
        const sl = S.slots[p.id];
        if (sl && !S.solved[p.id]) sl.forEach((x, k) => { if (x === g) sl[k] = null; });
      }
      S.slots[pg.id][idx] = g;
      voice(PLAYER, g);
      save();
      close();
      checkPage(pg);
    };
  });
}

function checkPage(pg) {
  const sl = S.slots[pg.id];
  renderJournal();
  if (sl.some((x) => !x)) return;
  const page = $('#journal .page');
  if (sl.every((g, i) => g === pg.words[i])) {
    S.solved[pg.id] = true;
    pg.words.forEach((w) => { S.confirmed[w] = true; });
    for (const p of PAGES) {
      const o = S.slots[p.id];
      if (o && p !== pg && !S.solved[p.id]) o.forEach((x, k) => { if (S.confirmed[x]) o[k] = null; });
    }
    save();
    sfx.chime();
    renderJournal();
    $('#journal .page').classList.add('justsolved');
  } else {
    setTimeout(() => { sfx.nope(); page.classList.add('shake'); }, 150);
  }
}

// ===========================================================================
// Title, menu, ending
// ===========================================================================
function renderTopbar() {
  $('#btnJournal').classList.toggle('dot', journalDot);
}

function showTitle() {
  const t = $('#title');
  t.hidden = false;
  const saved = hasSave();
  t.innerHTML = `<div class="tart">${towerSVG(true, false)}</div>
    <div class="tname">${glyphSVG('fire')}${glyphSVG('big')}</div>
    <div class="tbtns">
      <button class="bigbtn start">${ICONS.play}<span class="g">${glyphSVG('go')}</span></button>
      ${saved ? `<button class="bigbtn small reset">${ICONS.restart}</button>` : ''}
      <button class="bigbtn small sound">${settings.sound ? ICONS.soundOn : ICONS.soundOff}</button>
    </div>`;
  t.querySelector('.start').onclick = () => {
    ac(); sfx.chime();
    const s = load(SAVE_KEY);
    if (saved && s) { S = Object.assign(freshState(), s); startGame(false); } else { S = freshState(); startGame(true); }
  };
  const r = t.querySelector('.reset');
  if (r) r.onclick = () => confirmBox(() => { store(SAVE_KEY, null); try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ } showTitle(); });
  t.querySelector('.sound').onclick = () => { settings.sound = !settings.sound; store(SETTINGS_KEY, settings); ac(); sfx.tap(); showTitle(); };
  $('#pointer').hidden = true;
}

// Glyph without marking it as seen (used outside of play, e.g. on the title screen).
const plain = (g) => `<span class="gcell">${glyphSVG(g)}</span>`;

function confirmBox(onYes) {
  sfx.tap();
  const ov = h(`<div class="overlay confirm"><div class="cbox">
    <div class="line">${plain('go')}${plain('what')}</div>
    <div class="choices"><button class="choice yes">${plain('yes')}</button><button class="choice no">${plain('not')}</button></div>
  </div></div>`);
  document.body.appendChild(ov);
  ov.querySelector('.yes').onclick = () => { ov.remove(); onYes(); };
  ov.querySelector('.no').onclick = () => { ov.remove(); };
}

async function startGame(isNew) {
  $('#title').hidden = true;
  selected = null;
  renderInv();
  renderTopbar();
  if (isNew) {
    const intro = $('#intro');
    intro.hidden = false;
    intro.innerHTML = '<div class="sea"></div><div class="sailing emoji">⛵</div>';
    await wait(2600);
    intro.hidden = true;
  }
  renderScene();
  setTimeout(renderPointer, 300);
}

function openMenu() {
  if (busy) return;
  sfx.tap();
  const ov = h(`<div class="overlay menu"><div class="mbox">
    <button class="bigbtn resume">${ICONS.play}</button>
    <button class="bigbtn small sound">${settings.sound ? ICONS.soundOn : ICONS.soundOff}</button>
    <button class="bigbtn small home">${ICONS.home}</button>
  </div></div>`);
  document.body.appendChild(ov);
  ov.onclick = (e) => { if (e.target === ov) ov.remove(); };
  ov.querySelector('.resume').onclick = () => { sfx.tap(); ov.remove(); };
  ov.querySelector('.sound').onclick = () => {
    settings.sound = !settings.sound; store(SETTINGS_KEY, settings); sfx.tap();
    ov.querySelector('.sound').innerHTML = settings.sound ? ICONS.soundOn : ICONS.soundOff;
  };
  ov.querySelector('.home').onclick = () => { ov.remove(); save(); showTitle(); };
}

function showEnding() {
  const solved = PAGES.filter((p) => S.solved[p.id]).length;
  const ov = h(`<div class="overlay ending">
    <div class="sparks">${'<i></i>'.repeat(24)}</div>
    <div class="eart">${brazierSVG(true)}</div>
    <div class="eline">${['fire', 'big', 'good'].map((g) => glyphCell(g)).join('')}</div>
    <div class="folk emoji">${['🧔', '🧑‍🍳', '🧒', '👵', '🧑‍🌾', '💂', '🧙'].map((e) => `<span>${e}</span>`).join('')}</div>
    <div class="eline">${['you', 'good'].map((g) => glyphCell(g)).join('')}</div>
    <div class="edots">${PAGES.map((p) => `<span class="${S.solved[p.id] ? 'on' : ''}"></span>`).join('')}</div>
    <div class="tbtns"><button class="bigbtn resume">${ICONS.play}</button><button class="bigbtn small home">${ICONS.home}</button></div>
  </div>`);
  ov.querySelectorAll('.sparks i').forEach((s) => {
    s.style.left = Math.random() * 100 + '%';
    s.style.animationDelay = Math.random() * 3 + 's';
    s.style.animationDuration = 2 + Math.random() * 2 + 's';
  });
  document.body.appendChild(ov);
  ov.querySelector('.resume').onclick = () => ov.remove();
  ov.querySelector('.home').onclick = () => { ov.remove(); showTitle(); };
  if (solved === PAGES.length) setTimeout(sfx.chime, 800);
}

// ===========================================================================
// Boot
// ===========================================================================
function boot() {
  const st = load(SETTINGS_KEY);
  if (st) settings = Object.assign(settings, st);
  $('#btnJournal').innerHTML = ICONS.book;
  $('#btnMenu').innerHTML = ICONS.menu;
  $('#btnJournal').onclick = openJournal;
  $('#btnMenu').onclick = openMenu;
  window.addEventListener('resize', () => renderPointer());
  showTitle();
}
document.addEventListener('DOMContentLoaded', boot);
