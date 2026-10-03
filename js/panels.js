'use strict';
// ---------------------------------------------------------------------------
// The log (every phrase you have seen, in context) and the dictionary
// (every word, and the phrases it appeared in). Tapping a phrase redraws the
// moment you saw it.
// ---------------------------------------------------------------------------

const $ = (q) => document.querySelector(q);
function el(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
const phraseHTML = (g) => `<span class="phrase">${g.map((w) => glyphSVG(w)).join('')}</span>`;

function renderMoment(cv, entry, tilesWide) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = cv.clientWidth || cv.width, h = cv.clientHeight || cv.height;
  cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  const g = cv.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const snap = entry.snap;
  const sp = snap.actors.find((a) => a.id === entry.who) || { x: snap.cx, y: snap.cy };
  const v = { w, h, scale: w / (tilesWide * T), cx: sp.x, cy: sp.y - (h * 0.12) / (w / (tilesWide * T)) };
  renderWorld(g, v, {
    t: 0, trains: snap.trains, gatesOpen: snap.gatesOpen,
    actors: snap.actors.map((a) => Object.assign({ moving: false, phase: 0 }, a)),
    bubbles: [{ actorId: entry.who, g: entry.g }],
  });
}

function entryRow(entry) {
  const row = el(`<button class="row"><canvas class="thumb"></canvas>${phraseHTML(entry.g)}</button>`);
  row.onclick = () => openMoment(entry);
  return row;
}
function fillThumbs(root) {
  requestAnimationFrame(() => root.querySelectorAll('.row').forEach((r, i) => renderMoment(r.querySelector('canvas'), r._entry, 7)));
}

let panelStack = [];
function showPanel(build) {
  const p = $('#panel');
  p.hidden = false;
  p.innerHTML = `<div class="sheet"><div class="bar"><button class="mark close">${glyphSVG('close', 'mark')}</button></div><div class="body"></div></div>`;
  p.querySelector('.close').onclick = back;
  build(p.querySelector('.body'));
}
function back() {
  panelStack.pop();
  if (panelStack.length) showPanel(panelStack[panelStack.length - 1]);
  else { $('#panel').hidden = true; $('#panel').innerHTML = ''; }
}
function push(build) { panelStack.push(build); showPanel(build); }

function rows(body, entries) {
  const list = el('<div class="list"></div>');
  entries.forEach((e) => { const r = entryRow(e); r._entry = e; list.appendChild(r); });
  body.appendChild(list);
  fillThumbs(list);
}

function openLog() {
  push((body) => rows(body, S.log.slice().reverse().slice(0, 200)));
}

function openDict() {
  push((body) => {
    const grid = el('<div class="words"></div>');
    S.seen.forEach((w) => {
      const n = S.log.filter((l) => l.g.includes(w)).length;
      const b = el(`<button class="word">${glyphSVG(w)}<span class="count">${'<i></i>'.repeat(Math.min(n, 12))}</span></button>`);
      b.onclick = () => openWord(w);
      grid.appendChild(b);
    });
    body.appendChild(grid);
  });
}

function openWord(w) {
  push((body) => {
    body.appendChild(el(`<div class="wordhead">${glyphSVG(w)}</div>`));
    rows(body, S.log.filter((l) => l.g.includes(w)).reverse());
  });
}

function openMoment(entry) {
  push((body) => {
    const cv = el('<canvas class="moment"></canvas>');
    body.appendChild(cv);
    body.appendChild(el(`<div class="momentline">${phraseHTML(entry.g)}</div>`));
    requestAnimationFrame(() => renderMoment(cv, entry, 9));
  });
}

let pulseT = null;
function pulseButtons() {
  const b = $('#btnLog');
  b.classList.remove('pulse'); void b.offsetWidth; b.classList.add('pulse');
}

function initPanels() {
  $('#btnLog').innerHTML = glyphSVG('log', 'mark');
  $('#btnDict').innerHTML = glyphSVG('dict', 'mark');
  $('#btnLog').onclick = openLog;
  $('#btnDict').onclick = openDict;
}
