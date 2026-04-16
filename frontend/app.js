// ================================================================
// CONFIG
// ================================================================
const WORLD = { w: 800, h: 600 };
const DENSITY = 7850.0;
const GITHUB_REPO = 'koljaPl/2-squares-collapse';

// Visual size multiplier: physics size is tiny (sqrt(mass/density)),
// so we scale it up for visibility. Adjust this value freely.
const SIZE_DISPLAY_SCALE = 1100;

// ================================================================
// TRANSLATIONS — add/edit keys here
// ================================================================
const T = {
  en: {
    hint:         'Drag the squares to set starting positions, then configure parameters.',
    obj1:         '■ Object 1',
    obj2:         '■ Object 2',
    mass:         'Mass',
    start:        'Start Simulation',
    reset:        '↺ Reset',
    physics_link: 'Read the Physics Derivations →',
    connecting:   'Connecting…',
    running:      'Simulation running',
    disconnected: 'Disconnected',
    conn_error:   'Connection error — is the backend running?',
  },
  de: {
    hint:         'Quadrate ziehen um Startpositionen festzulegen, dann Parameter einstellen.',
    obj1:         '■ Objekt 1',
    obj2:         '■ Objekt 2',
    mass:         'Masse',
    start:        'Simulation starten',
    reset:        '↺ Zurücksetzen',
    physics_link: 'Physikalische Herleitungen →',
    connecting:   'Verbinde…',
    running:      'Simulation läuft',
    disconnected: 'Getrennt',
    conn_error:   'Verbindungsfehler — läuft das Backend?',
  },
  ru: {
    hint:         'Перетащите квадраты для задания позиций, затем настройте параметры.',
    obj1:         '■ Объект 1',
    obj2:         '■ Объект 2',
    mass:         'Масса',
    start:        'Запустить симуляцию',
    reset:        '↺ Сброс',
    physics_link: 'Читать физику →',
    connecting:   'Соединение…',
    running:      'Симуляция запущена',
    disconnected: 'Отключено',
    conn_error:   'Ошибка соединения — запущен ли бэкенд?',
  },
};

// ================================================================
// CANVAS COLORS — synced with CSS theme
// ================================================================
const PALETTE = {
  light: {
    bg:    '#FAFAF9',
    grid:  'rgba(0,0,0,0.06)',
    axis:  'rgba(0,0,0,0.18)',
    label: '#78716C',
    obj1:  '#1D4ED8',
    obj2:  '#B91C1C',
    text:  '#1C1917',
  },
  dark: {
    bg:    '#111008',
    grid:  'rgba(255,255,255,0.05)',
    axis:  'rgba(255,255,255,0.18)',
    label: '#78716C',
    obj1:  '#93C5FD',
    obj2:  '#FCA5A5',
    text:  '#E7E5E4',
  },
};

// ================================================================
// STATE
// ================================================================
let lang = detectLang();
let theme = localStorage.getItem('theme') || 'light';
let phase = 'setup'; // 'setup' | 'running'
let ws = null;
let simObjects = [];          // last WebSocket snapshot
let prevVx = [null, null];    // for collision sound detection
let dragging = null;          // index of dragged object (or null)
let showGrid = false;         // show during drag + always in sim
let mouseWorld = { x: 0, y: 0 };
let canvasW = 1, canvasH = 1;

// Default starting positions and masses
const setupObjs = [
  { x: -300, y: 0 },
  { x:    0, y: 0 },
];
let masses = [10, 20];        // kept in sync with inputs

// ================================================================
// CANVAS ELEMENTS
// ================================================================
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// World ↔ Canvas transforms
const wx = (worldX) => (worldX + WORLD.w / 2) / WORLD.w * canvasW;
const wy = (worldY) => (WORLD.h / 2 - worldY) / WORLD.h * canvasH;
const cw = (cx)     => (cx / canvasW) * WORLD.w - WORLD.w / 2;
const ch = (cy)     => WORLD.h / 2 - (cy / canvasH) * WORLD.h;
const scaleS = (s)  => s / WORLD.w * canvasW;
const C = (k)       => PALETTE[theme][k];

function displaySize(mass) {
  return Math.sqrt(mass / DENSITY) * SIZE_DISPLAY_SCALE;
}

// ================================================================
// RESIZE
// ================================================================
function resize() {
  const container = canvas.parentElement;
  canvasW = canvas.width  = container.clientWidth;
  canvasH = canvas.height = Math.round(canvasW * WORLD.h / WORLD.w);
  render();
}

if (window.ResizeObserver) {
  new ResizeObserver(resize).observe(document.querySelector('.canvas-container'));
}
window.addEventListener('resize', resize);

// ================================================================
// RENDER
// ================================================================
function render() {
  ctx.clearRect(0, 0, canvasW, canvasH);
  ctx.fillStyle = C('bg');
  ctx.fillRect(0, 0, canvasW, canvasH);

  drawGrid();

  if (phase === 'setup') {
    const vx1 = numVal('vx1'), vy1 = numVal('vy1');
    const vx2 = numVal('vx2'), vy2 = numVal('vy2');
    drawArrow(setupObjs[0], vx1, vy1, C('obj1'));
    drawArrow(setupObjs[1], vx2, vy2, C('obj2'));
    drawSquare(setupObjs[0], displaySize(masses[0]), C('obj1'));
    drawSquare(setupObjs[1], displaySize(masses[1]), C('obj2'));
  } else {
    simObjects.forEach((obj, i) => {
      const color = i === 0 ? C('obj1') : C('obj2');
      drawArrow(obj, obj.vx, obj.vy, color);
      drawSquare(obj, obj.size * SIZE_DISPLAY_SCALE, color);
    });
  }
}

function drawGrid() {
  if (!showGrid && phase !== 'running') return;

  ctx.lineWidth = 0.5;
  ctx.strokeStyle = C('grid');
  for (let x = -400; x <= 400; x += 100) {
    ctx.beginPath(); ctx.moveTo(wx(x), 0); ctx.lineTo(wx(x), canvasH); ctx.stroke();
  }
  for (let y = -300; y <= 300; y += 100) {
    ctx.beginPath(); ctx.moveTo(0, wy(y)); ctx.lineTo(canvasW, wy(y)); ctx.stroke();
  }

  // Axes
  ctx.strokeStyle = C('axis');
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(wx(0), 0); ctx.lineTo(wx(0), canvasH); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, wy(0)); ctx.lineTo(canvasW, wy(0)); ctx.stroke();

  if (!showGrid) return; // labels only while dragging

  const fs = Math.max(9, canvasW * 0.012);
  ctx.font = `${fs}px 'JetBrains Mono', monospace`;
  ctx.fillStyle = C('label');

  ctx.textAlign = 'center';
  for (let x = -300; x <= 300; x += 100) {
    if (x === 0) continue;
    ctx.fillText(x, wx(x), wy(0) + fs + 2);
  }
  ctx.textAlign = 'right';
  for (let y = -200; y <= 200; y += 100) {
    if (y === 0) continue;
    ctx.fillText(y, wx(0) - 4, wy(y) + 4);
  }

  // Live cursor coords
  ctx.font = `bold ${fs}px 'JetBrains Mono', monospace`;
  ctx.fillStyle = C('text');
  ctx.textAlign = 'left';
  ctx.fillText(`(${mouseWorld.x}, ${mouseWorld.y})`, 8, fs + 4);
}

function drawSquare(obj, sizeWorld, color) {
  const s = scaleS(sizeWorld);
  const x = wx(obj.x), y = wy(obj.y);
  // Fill
  ctx.globalAlpha = 0.15;
  ctx.fillStyle = color;
  ctx.fillRect(x - s / 2, y - s / 2, s, s);
  ctx.globalAlpha = 1;
  // Stroke
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x - s / 2, y - s / 2, s, s);
  // Center dot
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, 2.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawArrow(obj, vx, vy, color) {
  const speed = Math.sqrt(vx * vx + vy * vy);
  if (speed < 0.5) return;
  const worldLen = Math.min(70, speed * 0.25);
  const scale = worldLen / speed;
  const sx = wx(obj.x), sy = wy(obj.y);
  const ex = wx(obj.x + vx * scale), ey = wy(obj.y + vy * scale);
  const angle = Math.atan2(ey - sy, ex - sx);
  const hs = Math.max(6, scaleS(8));

  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(ex, ey);
  ctx.lineTo(ex - hs * Math.cos(angle - 0.4), ey - hs * Math.sin(angle - 0.4));
  ctx.lineTo(ex - hs * Math.cos(angle + 0.4), ey - hs * Math.sin(angle + 0.4));
  ctx.closePath();
  ctx.fill();
}

// ================================================================
// DRAG & DROP
// ================================================================
function getCanvasXY(e) {
  const rect = canvas.getBoundingClientRect();
  const src  = e.touches ? e.touches[0] : e;
  return {
    x: (src.clientX - rect.left) * (canvasW / rect.width),
    y: (src.clientY - rect.top)  * (canvasH / rect.height),
  };
}

function hitObject(cx, cy) {
  const wx_ = cw(cx), wy_ = ch(cy);
  for (let i = setupObjs.length - 1; i >= 0; i--) {
    const half = displaySize(masses[i]) / 2;
    if (Math.abs(wx_ - setupObjs[i].x) < half && Math.abs(wy_ - setupObjs[i].y) < half) return i;
  }
  return -1;
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

canvas.addEventListener('mousedown', e => {
  if (phase !== 'setup') return;
  const p = getCanvasXY(e);
  const i = hitObject(p.x, p.y);
  if (i >= 0) { dragging = i; showGrid = true; canvas.style.cursor = 'grabbing'; }
});

canvas.addEventListener('mousemove', e => {
  const p = getCanvasXY(e);
  mouseWorld = { x: Math.round(cw(p.x)), y: Math.round(ch(p.y)) };
  if (phase === 'setup' && dragging !== null) {
    setupObjs[dragging].x = clamp(cw(p.x), -400, 400);
    setupObjs[dragging].y = clamp(ch(p.y), -300, 300);
  }
  render();
});

canvas.addEventListener('mouseup', () => {
  if (dragging !== null) { dragging = null; showGrid = false; canvas.style.cursor = 'default'; render(); }
});

canvas.addEventListener('mouseleave', () => {
  if (dragging !== null) { dragging = null; showGrid = false; render(); }
});

canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  if (phase !== 'setup') return;
  const p = getCanvasXY(e);
  const i = hitObject(p.x, p.y);
  if (i >= 0) { dragging = i; showGrid = true; }
}, { passive: false });

canvas.addEventListener('touchmove', e => {
  e.preventDefault();
  const p = getCanvasXY(e);
  mouseWorld = { x: Math.round(cw(p.x)), y: Math.round(ch(p.y)) };
  if (phase === 'setup' && dragging !== null) {
    setupObjs[dragging].x = clamp(cw(p.x), -400, 400);
    setupObjs[dragging].y = clamp(ch(p.y), -300, 300);
    render();
  }
}, { passive: false });

canvas.addEventListener('touchend', () => {
  dragging = null; showGrid = false; render();
});

// ================================================================
// SIMULATION / WEBSOCKET
// ================================================================
const WS_URL = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`;

function startSimulation() {
  const payload = {
    x1: setupObjs[0].x, y1: setupObjs[0].y,
    x2: setupObjs[1].x, y2: setupObjs[1].y,
    vx1: numVal('vx1'), vy1: numVal('vy1'),
    vx2: numVal('vx2'), vy2: numVal('vy2'),
    mass1: masses[0],   mass2: masses[1],
  };

  phase = 'running';
  document.getElementById('setup-panel').classList.add('hidden');
  document.getElementById('sim-panel').classList.remove('hidden');
  setStatus(T[lang].connecting);

  ws = new WebSocket(WS_URL);

  ws.onopen = () => {
    ws.send(JSON.stringify(payload));
    setStatus(T[lang].running);
  };

  ws.onmessage = e => {
    const objects = JSON.parse(e.data);
    detectCollisions(objects);
    simObjects = objects;
    render();
  };

  ws.onerror = () => setStatus(T[lang].conn_error);

  ws.onclose = () => {
    if (phase === 'running') setStatus(T[lang].disconnected);
  };
}

function resetSimulation() {
  if (ws) { ws.close(); ws = null; }
  phase = 'setup';
  simObjects = [];
  prevVx = [null, null];
  showGrid = false;
  document.getElementById('setup-panel').classList.remove('hidden');
  document.getElementById('sim-panel').classList.add('hidden');
  render();
}

function setStatus(msg) {
  document.getElementById('status-line').textContent = msg;
}

// ================================================================
// COLLISION SOUND  (Web Audio API, no external files)
// ================================================================
let audioCtx = null;

function playCollisionSound() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const ac = audioCtx;
    const osc  = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(700, ac.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, ac.currentTime + 0.14);
    gain.gain.setValueAtTime(0.22, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.16);
    osc.start(ac.currentTime);
    osc.stop(ac.currentTime + 0.16);
  } catch (_) {}
}

function detectCollisions(objects) {
  objects.forEach((obj, i) => {
    if (prevVx[i] !== null && prevVx[i] !== 0 && Math.sign(obj.vx) !== Math.sign(prevVx[i])) {
      playCollisionSound();
    }
    prevVx[i] = obj.vx;
  });
}

// ================================================================
// LANGUAGE
// ================================================================
function detectLang() {
  const bl = (navigator.language || 'en').slice(0, 2).toLowerCase();
  return ['de', 'ru'].includes(bl) ? bl : 'en';
}

function setLang(l) {
  lang = l;
  document.documentElement.lang = l;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    if (T[l][el.dataset.i18n]) el.textContent = T[l][el.dataset.i18n];
  });
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === l);
  });
}

// ================================================================
// THEME
// ================================================================
function applyTheme(t) {
  theme = t;
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem('theme', t);
  render();
}

// ================================================================
// GITHUB STARS
// ================================================================
async function fetchStars() {
  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}`);
    if (res.ok) {
      const { stargazers_count } = await res.json();
      document.getElementById('gh-stars').textContent = `★ ${stargazers_count}`;
    }
  } catch (_) {}
}

// ================================================================
// HELPERS
// ================================================================
function numVal(id) { return parseFloat(document.getElementById(id).value) || 0; }

// ================================================================
// INIT
// ================================================================
applyTheme(theme);
setLang(lang);
fetchStars();
resize();

document.getElementById('start-btn').addEventListener('click', startSimulation);
document.getElementById('reset-btn').addEventListener('click', resetSimulation);

document.getElementById('theme-btn').addEventListener('click', () => {
  applyTheme(theme === 'light' ? 'dark' : 'light');
});

document.querySelectorAll('.lang-btn').forEach(btn => {
  btn.addEventListener('click', () => setLang(btn.dataset.lang));
});

// Re-render when mass inputs change (square sizes update)
['mass1', 'mass2'].forEach((id, i) => {
  document.getElementById(id).addEventListener('input', () => {
    masses[i] = parseFloat(document.getElementById(id).value) || 1;
    render();
  });
});

// Re-render when velocity changes (arrows update)
['vx1', 'vy1', 'vx2', 'vy2'].forEach(id => {
  document.getElementById(id).addEventListener('input', render);
});
