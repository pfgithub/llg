// Hand-drawn SVG art and interface icons. No text anywhere.

const ICONS = {
  book: '<svg viewBox="0 0 24 24"><path d="M3 5.5c3-1.2 6-1.2 9 .8 3-2 6-2 9-.8v13c-3-1.2-6-1.2-9 .8-3-2-6-2-9-.8z M12 6.3v13.5"/></svg>',
  menu: '<svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  soundOn: '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z M16 9c1.5 1.5 1.5 4.5 0 6 M18.5 6.5c3 3 3 8 0 11"/></svg>',
  soundOff: '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z M16 9l5 6 M21 9l-5 6"/></svg>',
  play: '<svg viewBox="0 0 24 24"><path d="M7 4l13 8-13 8z" fill="currentColor"/></svg>',
  home: '<svg viewBox="0 0 24 24"><path d="M3 11l9-8 9 8 M5 9.5V21h5v-6h4v6h5V9.5"/></svg>',
  close: '<svg viewBox="0 0 24 24"><path d="M5 5l14 14M19 5L5 19"/></svg>',
  back: '<svg viewBox="0 0 24 24"><path d="M9 5h11v14H9l-6-7z M12 9l5 6 M17 9l-5 6"/></svg>',
  speak: '<svg viewBox="0 0 24 24"><path d="M4 5h16v11H10l-5 4v-4H4z"/><circle cx="8.5" cy="10.5" r="1.3" fill="currentColor"/><circle cx="12" cy="10.5" r="1.3" fill="currentColor"/><circle cx="15.5" cy="10.5" r="1.3" fill="currentColor"/></svg>',
  restart: '<svg viewBox="0 0 24 24"><path d="M5 12a7 7 0 1 0 2.2-5.1 M4 4v5h5"/></svg>',
  left: '<svg viewBox="0 0 24 24"><path d="M15 4l-8 8 8 8"/></svg>',
  right: '<svg viewBox="0 0 24 24"><path d="M9 4l8 8-8 8"/></svg>',
  lock: '<svg viewBox="0 0 24 24"><path d="M6 11h12v10H6z M8.5 11V8a3.5 3.5 0 0 1 7 0v3"/></svg>',
  sign: '<svg viewBox="0 0 24 24"><path d="M11 22V12 M3 4h18v8H3z" fill="none"/><path d="M3 4h18v8H3z" fill="#8a5a2b"/></svg>',
};

function arrowSVG(dir) {
  const rot = { right: 0, down: 90, left: 180, up: 270, upright: -45, downleft: 135, downright: 45, upleft: -135 }[dir] || 0;
  return `<svg class="arrow" viewBox="0 0 24 24" style="transform:rotate(${rot}deg)"><path d="M3 12h15 M12 5l7 7-7 7"/></svg>`;
}

function flowerSVG(color, wilted) {
  if (wilted) {
    return `<svg viewBox="0 0 100 100" class="art"><path d="M50 96 Q46 70 56 56 Q64 46 72 52" stroke="#6b5a3a" stroke-width="5" fill="none" stroke-linecap="round"/>
      <path d="M48 80 Q34 78 30 88" stroke="#6b5a3a" stroke-width="4" fill="none"/>
      <circle cx="72" cy="60" r="7" fill="#7a6a5a"/><path d="M66 64 L60 76 M74 67 L76 80 M79 62 L88 70" stroke="#7a6a5a" stroke-width="5" stroke-linecap="round"/></svg>`;
  }
  const c = COLORS[color];
  let petals = '';
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    petals += `<circle cx="${50 + Math.cos(a) * 15}" cy="${38 + Math.sin(a) * 15}" r="12" fill="${c}" stroke="rgba(0,0,0,.25)" stroke-width="1.5"/>`;
  }
  return `<svg viewBox="0 0 100 100" class="art"><path d="M50 96 L50 50" stroke="#3f7a2e" stroke-width="5"/>
    <path d="M50 78 Q30 70 26 80 Q38 88 50 80 M50 70 Q70 60 76 70 Q64 80 50 72" fill="#4f9a3a"/>
    ${petals}<circle cx="50" cy="38" r="8" fill="#fff2b0" stroke="#a07a20" stroke-width="2"/></svg>`;
}

function itemIcon(id) {
  const it = ITEMS[id];
  if (it.flower) return `<span class="iicon">${flowerSVG(it.flower, false)}</span>`;
  return `<span class="iicon emoji">${it.e}</span>`;
}

function flamesSVG(cx, cy, scale) {
  return `<g transform="translate(${cx} ${cy}) scale(${scale})" class="flames">
    <path class="f1" d="M0 0 Q-26 -22 -10 -52 Q-6 -30 6 -40 Q4 -60 16 -78 Q32 -40 22 -14 Q16 2 0 0Z" fill="#ff8a1e"/>
    <path class="f2" d="M0 -2 Q-14 -16 -4 -36 Q0 -22 8 -30 Q14 -16 10 -6 Q6 0 0 -2Z" fill="#ffd23a"/>
  </g>`;
}

function towerSVG(lit, open) {
  let stones = '';
  for (let y = 30; y < 140; y += 12) {
    const off = ((y / 12) % 2) * 6;
    stones += `<path d="M33 ${y} L67 ${y}" stroke="rgba(0,0,0,.18)" stroke-width="1"/>`;
    for (let x = 36 + off; x < 66; x += 12) stones += `<path d="M${x} ${y} L${x} ${y + 12}" stroke="rgba(0,0,0,.14)" stroke-width="1"/>`;
  }
  const gate = open
    ? '<path d="M40 140 L40 116 Q50 100 60 116 L60 140 Z" fill="#120d0a"/>'
    : `<path d="M40 140 L40 116 Q50 100 60 116 L60 140 Z" fill="#2b1d12"/>
       <path d="M43 140 V112 M47 140 V107 M51 140 V105 M55 140 V107 M59 140 V113 M40 120 H60 M40 130 H60" stroke="#8a7a5a" stroke-width="1.6"/>`;
  return `<svg viewBox="0 0 100 140" class="art">
    ${lit ? '<circle cx="50" cy="8" r="30" fill="url(#glow)"/>' : ''}
    <defs><radialGradient id="glow"><stop offset="0" stop-color="#ffb347" stop-opacity=".8"/><stop offset="1" stop-color="#ffb347" stop-opacity="0"/></radialGradient></defs>
    <path d="M30 140 L34 26 L66 26 L70 140 Z" fill="#9a9184" stroke="#3b3530" stroke-width="1.5"/>
    ${stones}
    <path d="M28 18 H72 V28 H28 Z M28 18 V12 H34 V18 M40 18 V12 H46 V18 M54 18 V12 H60 V18 M66 18 V12 H72 V18" fill="#7d756a" stroke="#3b3530" stroke-width="1.2"/>
    <path d="M42 12 Q50 6 58 12 Z" fill="#3b3028"/>
    ${lit ? flamesSVG(50, 11, 0.22) : ''}
    <path d="M47 50 Q50 46 53 50 V60 H47 Z" fill="${lit ? '#ffcf6a' : '#2a221c'}"/>
    <path d="M47 80 Q50 76 53 80 V90 H47 Z" fill="${lit ? '#ffcf6a' : '#2a221c'}"/>
    ${gate}
  </svg>`;
}

function doorSVG(color, opts = {}) {
  const inner = opts.open
    ? '<path d="M5 100 L5 30 Q30 0 55 30 L55 100 Z" fill="#0e0a08"/>'
    : `<path d="M5 100 L5 30 Q30 0 55 30 L55 100 Z" fill="${color}" stroke="#2a1c10" stroke-width="4"/>
       <path d="M22 18 L22 100 M38 18 L38 100" stroke="rgba(0,0,0,.25)" stroke-width="2"/>
       <circle cx="46" cy="62" r="3.5" fill="#2a1c10"/>
       ${opts.lock ? '<rect x="40" y="66" width="12" height="11" rx="2" fill="#c9a23a" stroke="#2a1c10" stroke-width="1.5"/><path d="M43 66 V62 a3 3 0 0 1 6 0 V66" stroke="#2a1c10" stroke-width="1.8" fill="none"/>' : ''}`;
  return `<svg viewBox="0 0 60 104" class="art"><path d="M2 102 L2 30 Q30 -4 58 30 L58 102 Z" fill="#4a4250" />${inner}</svg>`;
}

function brazierSVG(lit) {
  return `<svg viewBox="0 0 100 110" class="art">
    ${lit ? '<circle cx="50" cy="40" r="48" fill="url(#bglow)"/><defs><radialGradient id="bglow"><stop offset="0" stop-color="#ffb347" stop-opacity=".9"/><stop offset="1" stop-color="#ffb347" stop-opacity="0"/></radialGradient></defs>' : ''}
    <path d="M44 72 L36 104 L64 104 L56 72 Z" fill="#4a3a2a" stroke="#1f160e" stroke-width="2"/>
    <path d="M10 50 L90 50 L76 74 L24 74 Z" fill="#6a5440" stroke="#1f160e" stroke-width="3"/>
    <path d="M14 56 H86" stroke="#8a7050" stroke-width="2"/>
    ${lit ? flamesSVG(50, 52, 0.75) : '<path d="M30 50 L62 40 M38 40 L72 50 M45 50 L50 38" stroke="#3a2a1a" stroke-width="5" stroke-linecap="round"/>'}
  </svg>`;
}

function stairsSVG() {
  let s = '';
  for (let i = 0; i < 7; i++) {
    const y = 100 - i * 11, x = 10 + i * 6, w = 80 - i * 12;
    s += `<path d="M${x} ${y} h${w} v-11 h-${w} z" fill="${i % 2 ? '#5d5466' : '#6a6074'}" stroke="#2a2530" stroke-width="1"/>`;
  }
  return `<svg viewBox="0 0 100 100" class="art">${s}</svg>`;
}

function wellSVG() {
  return `<svg viewBox="0 0 100 100" class="art">
    <path d="M22 30 L22 64 M78 30 L78 64" stroke="#6b4a2a" stroke-width="5"/>
    <path d="M14 30 L50 12 L86 30 Z" fill="#a0522d" stroke="#5a2e14" stroke-width="2"/>
    <path d="M50 30 L50 46" stroke="#555" stroke-width="2"/><path d="M44 46 h12 v8 h-12z" fill="#7a5a3a"/>
    <ellipse cx="50" cy="64" rx="34" ry="9" fill="#2a3f55"/>
    <path d="M16 64 V86 Q50 98 84 86 V64 Q50 76 16 64 Z" fill="#a39a8c" stroke="#5e574d" stroke-width="2"/>
    <path d="M16 74 Q50 86 84 74 M30 68 V91 M50 72 V94 M70 68 V91" stroke="#7a7266" stroke-width="1.4" fill="none"/>
  </svg>`;
}

function bakerySVG() {
  return `<svg viewBox="0 0 100 90" class="art">
    <path d="M14 40 V88 H86 V40" fill="#e8c9a0" stroke="#6b4a2a" stroke-width="2"/>
    <path d="M6 42 L50 8 L94 42 Z" fill="#b5523a" stroke="#6b2a1a" stroke-width="2"/>
    <path d="M70 22 V10 H78 V28" fill="#7a6a5a" stroke="#4a3a2a" stroke-width="1.5"/>
    <path d="M42 88 V62 Q50 54 58 62 V88 Z" fill="#7a4a2a"/>
    <rect x="20" y="52" width="14" height="12" fill="#fff0b0" stroke="#6b4a2a" stroke-width="2"/>
    <rect x="66" y="52" width="14" height="12" fill="#fff0b0" stroke="#6b4a2a" stroke-width="2"/>
  </svg>`;
}
