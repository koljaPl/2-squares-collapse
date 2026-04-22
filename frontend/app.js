// ================================================================
// CONFIG
// ================================================================
const WORLD = { w: 800, h: 600 };
const DENSITY = 7850.0;
const GITHUB_REPO = 'koljaPl/2-squares-collapse';

// Visual scale: physics sizes are very small (fractions of a meter for steel).
// This multiplier makes them visible on screen.
const SIZE_DISPLAY_SCALE = 1100;

// Angle interaction ring (world units from the object's edge)
const RING_INNER = 8;
const RING_OUTER = 48;

// ================================================================
// TRANSLATIONS
// ================================================================
const T = {
  en: {
    hint_circle:  'Drag circles to position · hover outside to set angle.',
    hint_square:  'Drag squares to position · hover outside to set angle.',
    obj1:         '● Object 1',
    obj2:         '● Object 2',
    obj1_sq:      '■ Object 1',
    obj2_sq:      '■ Object 2',
    mass:         'Mass',
    start:        'Start Simulation',
    reset:        '↺ Reset',
    adv_mode:     '⊞ Advanced',
    physics_link: 'Read the Physics Derivations →',
    connecting:   'Connecting…',
    running:      'Simulation running',
    disconnected: 'Disconnected',
    conn_error:   'Connection error — is the backend running?',
  },
  de: {
    hint_circle:  'Kreise ziehen · außen hovern für Winkel.',
    hint_square:  'Quadrate ziehen · außen hovern für Winkel.',
    obj1:         '● Objekt 1',
    obj2:         '● Objekt 2',
    obj1_sq:      '■ Objekt 1',
    obj2_sq:      '■ Objekt 2',
    mass:         'Masse',
    start:        'Simulation starten',
    reset:        '↺ Zurücksetzen',
    adv_mode:     '⊞ Erweitert',
    physics_link: 'Physikalische Herleitungen →',
    connecting:   'Verbinde…',
    running:      'Simulation läuft',
    disconnected: 'Getrennt',
    conn_error:   'Verbindungsfehler — läuft das Backend?',
  },
  ru: {
    hint_circle:  'Тащи круги · наведи снаружи для угла.',
    hint_square:  'Тащи квадраты · наведи снаружи для угла.',
    obj1:         '● Объект 1',
    obj2:         '● Объект 2',
    obj1_sq:      '■ Объект 1',
    obj2_sq:      '■ Объект 2',
    mass:         'Масса',
    start:        'Запустить симуляцию',
    reset:        '↺ Сброс',
    adv_mode:     '⊞ Расширенный',
    physics_link: 'Читать физику →',
    connecting:   'Соединение…',
    running:      'Симуляция запущена',
    disconnected: 'Отключено',
    conn_error:   'Ошибка соединения — запущен ли бэкенд?',
  },
};

// ================================================================
// CANVAS COLORS
// ================================================================
const PALETTE = {
  light: {
    bg:    '#FAFAF9',
    grid:  'rgba(0,0,0,0.06)',
    axis:  'rgba(0,0,0,0.18)',
    label: '#78716C',
    obj1:  '#1D4ED8',
    obj2:  '#B91C1C',
    ring1: 'rgba(29,78,216,0.12)',
    ring2: 'rgba(185,28,28,0.12)',
    text:  '#1C1917',
  },
  dark: {
    bg:    '#111008',
    grid:  'rgba(255,255,255,0.05)',
    axis:  'rgba(255,255,255,0.18)',
    label: '#78716C',
    obj1:  '#93C5FD',
    obj2:  '#FCA5A5',
    ring1: 'rgba(147,197,253,0.12)',
    ring2: 'rgba(252,165,165,0.12)',
    text:  '#E7E5E4',
  },
};

// ================================================================
// STATE
// ================================================================
let lang        = detectLang();
let theme       = localStorage.getItem('theme') || 'light';
let phase       = 'setup';    // 'setup' | 'running'
let advMode     = false;
let objectType  = 'circle';   // 'circle' | 'square'

let ws          = null;
let simObjects  = [];
let prevVel     = [null, null];  // {vx, vy} for collision sound
let canvasW = 1, canvasH = 1;

let mouseWorld  = { x: 0, y: 0 };
let drag        = null;  // { type: 'move'|'angle', idx: 0|1 } | null
let hoverHit    = null;  // { idx, type: 'body'|'ring' } | null

const setupObjs = [
  { x: -260, y: 0 },
  { x:  120, y: 0 },
];
// angles in radians — standard math convention: 0 = right (+X), PI/2 = up (+Y)
const objAngles = [0, Math.PI];
let masses      = [10, 20];

// ================================================================
// CANVAS SETUP
// ================================================================
const canvas = document.getElementById('canvas');
const ctx    = canvas.getContext('2d');

// World (−400…+400 x, −300…+300 y) ↔ Canvas pixels
const wx  = (worldX) => (worldX + WORLD.w / 2) / WORLD.w * canvasW;
const wy  = (worldY) => (WORLD.h / 2 - worldY) / WORLD.h * canvasH;  // Y flipped
const cw  = (cx)     => (cx / canvasW) * WORLD.w - WORLD.w / 2;
const ch  = (cy)     => WORLD.h / 2 - (cy / canvasH) * WORLD.h;
const wsc = (d)      => d / WORLD.w * canvasW;   // world distance → canvas px

const C = (k) => PALETTE[theme][k];

// ── Size helpers ──────────────────────────────────────────────────
// Returns the "characteristic radius" used for hit-testing and ring placement.
// Circle:  radius = sqrt(mass / (density * π))
// Square:  half-side = sqrt(mass / density) / 2
function displayHalf(mass, type) {
  if (type === 'circle') return Math.sqrt(mass / (DENSITY * Math.PI)) * SIZE_DISPLAY_SCALE;
  return Math.sqrt(mass / DENSITY) * SIZE_DISPLAY_SCALE / 2;
}

// Full side (square) or full diameter (circle) — for drawing
function displayFull(mass, type) {
  return displayHalf(mass, type) * (type === 'circle' ? 1 : 2);
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
    drawSetup();
  } else {
    simObjects.forEach((obj, i) => {
      const color = i === 0 ? C('obj1') : C('obj2');
      drawArrow(obj, obj.vx, obj.vy, color);
      drawShape(obj, obj.size * SIZE_DISPLAY_SCALE, obj.type, color);
    });
  }
}

// ================================================================
// GRID
// ================================================================
function drawGrid() {
  const showLabels = drag !== null || hoverHit !== null;

  ctx.lineWidth   = 0.5;
  ctx.strokeStyle = C('grid');
  for (let x = -400; x <= 400; x += 100) {
    ctx.beginPath(); ctx.moveTo(wx(x), 0); ctx.lineTo(wx(x), canvasH); ctx.stroke();
  }
  for (let y = -300; y <= 300; y += 100) {
    ctx.beginPath(); ctx.moveTo(0, wy(y)); ctx.lineTo(canvasW, wy(y)); ctx.stroke();
  }

  // Axes
  ctx.strokeStyle = C('axis');
  ctx.lineWidth   = 1;
  ctx.beginPath(); ctx.moveTo(wx(0), 0);     ctx.lineTo(wx(0), canvasH); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, wy(0));     ctx.lineTo(canvasW, wy(0)); ctx.stroke();

  if (!showLabels) return;

  const fs = Math.max(9, canvasW * 0.012);
  ctx.font      = `${fs}px 'JetBrains Mono', monospace`;
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

  // Live cursor world coords
  ctx.font      = `bold ${fs}px 'JetBrains Mono', monospace`;
  ctx.fillStyle = C('text');
  ctx.textAlign = 'left';
  ctx.fillText(`(${Math.round(mouseWorld.x)}, ${Math.round(mouseWorld.y)})`, 8, fs + 4);
}

// ================================================================
// SETUP DRAWING
// ================================================================
function drawSetup() {
  for (let i = 0; i < 2; i++) {
    const obj   = setupObjs[i];
    const color = i === 0 ? C('obj1') : C('obj2');
    const ringC = i === 0 ? C('ring1') : C('ring2');
    const half  = displayHalf(masses[i], objectType);

    // ── Angle ring ──
    const showRing = (hoverHit?.idx === i && hoverHit.type === 'ring')
                  || (drag?.idx === i && drag.type === 'angle');
    if (showRing) {
      const rInner = wsc(half + RING_INNER);
      const rOuter = wsc(half + RING_INNER + RING_OUTER);
      const cx_ = wx(obj.x), cy_ = wy(obj.y);

      ctx.beginPath();
      ctx.arc(cx_, cy_, rOuter, 0, Math.PI * 2);
      ctx.arc(cx_, cy_, rInner, Math.PI * 2, 0, true);
      ctx.fillStyle = ringC;
      ctx.fill();

      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = color;
      ctx.lineWidth   = 1;
      ctx.globalAlpha = 0.45;
      ctx.beginPath(); ctx.arc(cx_, cy_, rOuter, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.setLineDash([]);
    }

    // ── Velocity arrow ──
    const { vx, vy } = getVelocity(i);
    drawArrow(obj, vx, vy, color);

    // ── Object body ──
    drawShape(obj, displayFull(masses[i], objectType), objectType, color);
  }
}

// ================================================================
// SHAPE PRIMITIVES
// ================================================================
// `obj`      — {x, y} in world coords
// `sizeWorld`— radius (circle) or full side (square), in world units
// `type`     — 'circle' | 'square'
function drawShape(obj, sizeWorld, type, color) {
  if (type === 'circle') {
    drawCircle(obj, sizeWorld, color);
  } else {
    drawSquare(obj, sizeWorld, color);
  }
}

function drawCircle(obj, radiusWorld, color) {
  const r = wsc(radiusWorld);
  const x = wx(obj.x), y = wy(obj.y);
  ctx.globalAlpha = 0.15;
  ctx.fillStyle   = color;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = color;
  ctx.lineWidth   = 1.5;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2); ctx.fill();
}

function drawSquare(obj, sideWorld, color) {
  const s = wsc(sideWorld);
  const x = wx(obj.x), y = wy(obj.y);
  ctx.globalAlpha = 0.15;
  ctx.fillStyle   = color;
  ctx.fillRect(x - s / 2, y - s / 2, s, s);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = color;
  ctx.lineWidth   = 1.5;
  ctx.strokeRect(x - s / 2, y - s / 2, s, s);
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2); ctx.fill();
}

// ================================================================
// VELOCITY ARROW
// ================================================================
function drawArrow(obj, vx, vy, color) {
  const speed = Math.sqrt(vx * vx + vy * vy);
  if (speed < 0.5) return;
  const worldLen = Math.min(80, speed * 0.3);
  const scale    = worldLen / speed;
  const sx = wx(obj.x),             sy = wy(obj.y);
  const ex = wx(obj.x + vx * scale), ey = wy(obj.y + vy * scale); // wy handles Y-flip
  const ang = Math.atan2(ey - sy, ex - sx);
  const hs  = Math.max(6, wsc(8));

  ctx.strokeStyle = color;
  ctx.lineWidth   = 1.5;
  ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(ex, ey);
  ctx.lineTo(ex - hs * Math.cos(ang - 0.4), ey - hs * Math.sin(ang - 0.4));
  ctx.lineTo(ex - hs * Math.cos(ang + 0.4), ey - hs * Math.sin(ang + 0.4));
  ctx.closePath();
  ctx.fill();
}

// ================================================================
// VELOCITY HELPERS
// ================================================================
function getVelocity(i) {
  if (advMode) {
    return {
      vx: numVal(i === 0 ? 'vx1' : 'vx2'),
      vy: numVal(i === 0 ? 'vy1' : 'vy2'),
    };
  }
  const speed = numVal(i === 0 ? 'speed1' : 'speed2');
  return { vx: speed * Math.cos(objAngles[i]), vy: speed * Math.sin(objAngles[i]) };
}

function getSpeedAngle(i) {
  if (advMode) {
    const vx = numVal(i === 0 ? 'vx1' : 'vx2');
    const vy = numVal(i === 0 ? 'vy1' : 'vy2');
    return { speed: Math.sqrt(vx * vx + vy * vy), angle: Math.atan2(vy, vx) };
  }
  return { speed: numVal(i === 0 ? 'speed1' : 'speed2'), angle: objAngles[i] };
}

function syncAngleInput(i) {
  const el = document.getElementById(i === 0 ? 'angledeg1' : 'angledeg2');
  if (el) el.value = Math.round(objAngles[i] * 180 / Math.PI);
}

// ================================================================
// HIT TEST (AABB — good enough for UI interaction)
// ================================================================
function hitTest(canvasX, canvasY) {
  const wx_ = cw(canvasX), wy_ = ch(canvasY);
  for (let i = setupObjs.length - 1; i >= 0; i--) {
    const half     = displayHalf(masses[i], objectType);
    const ringEdge = half + RING_INNER + RING_OUTER;
    const dx = Math.abs(wx_ - setupObjs[i].x);
    const dy = Math.abs(wy_ - setupObjs[i].y);
    if (dx <= half && dy <= half)         return { idx: i, type: 'body' };
    if (dx <= ringEdge && dy <= ringEdge) return { idx: i, type: 'ring' };
  }
  return null;
}

// ================================================================
// DRAG CONSTRAINTS
// ================================================================
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function safePos(idx, newX, newY) {
  const half      = displayHalf(masses[idx], objectType);
  const otherHalf = displayHalf(masses[1 - idx], objectType);
  const other     = setupObjs[1 - idx];
  const minSep    = half + otherHalf;  // min center-to-center distance

  // Clamp to world bounds
  newX = clamp(newX, -WORLD.w / 2 + half, WORLD.w / 2 - half);
  newY = clamp(newY, -WORLD.h / 2 + half, WORLD.h / 2 - half);

  // AABB overlap push
  const dx = newX - other.x;
  const dy = newY - other.y;
  if (Math.abs(dx) < minSep && Math.abs(dy) < minSep) {
    const penX = minSep - Math.abs(dx);
    const penY = minSep - Math.abs(dy);
    if (penX <= penY) {
      newX = other.x + Math.sign(dx || 1) * minSep;
    } else {
      newY = other.y + Math.sign(dy || 1) * minSep;
    }
    newX = clamp(newX, -WORLD.w / 2 + half, WORLD.w / 2 - half);
    newY = clamp(newY, -WORLD.h / 2 + half, WORLD.h / 2 - half);
  }
  return { x: newX, y: newY };
}

// ================================================================
// POINTER EVENTS
// ================================================================
function getCanvasXY(e) {
  const rect = canvas.getBoundingClientRect();
  const src  = e.touches ? e.touches[0] : e;
  return {
    x: (src.clientX - rect.left) * (canvasW / rect.width),
    y: (src.clientY - rect.top)  * (canvasH / rect.height),
  };
}

function onPointerDown(e) {
  if (phase !== 'setup') return;
  const hit = hitTest(...Object.values(getCanvasXY(e)));
  if (!hit) return;
  drag = { type: hit.type, idx: hit.idx };
  canvas.style.cursor = hit.type === 'body' ? 'grabbing' : 'crosshair';
}

function onPointerMove(e) {
  const p = getCanvasXY(e);
  mouseWorld = { x: cw(p.x), y: ch(p.y) };

  if (phase === 'setup') {
    if (drag) {
      const { idx, type } = drag;
      if (type === 'body') {
        const pos = safePos(idx, cw(p.x), ch(p.y));
        setupObjs[idx].x = pos.x;
        setupObjs[idx].y = pos.y;
      } else {
        // Angle: atan2 in world space (Y is up)
        const obj = setupObjs[idx];
        objAngles[idx] = Math.atan2(ch(p.y) - obj.y, cw(p.x) - obj.x);
        syncAngleInput(idx);
      }
    } else {
      hoverHit = hitTest(p.x, p.y);
      canvas.style.cursor = !hoverHit ? 'default'
        : hoverHit.type === 'body' ? 'grab' : 'crosshair';
    }
  }
  render();
}

function onPointerUp() {
  drag = null;
  canvas.style.cursor = hoverHit
    ? (hoverHit.type === 'body' ? 'grab' : 'crosshair')
    : 'default';
}

function onPointerLeave() {
  drag = null; hoverHit = null;
  canvas.style.cursor = 'default';
  render();
}

canvas.addEventListener('mousedown',  onPointerDown);
canvas.addEventListener('mousemove',  onPointerMove);
canvas.addEventListener('mouseup',    onPointerUp);
canvas.addEventListener('mouseleave', onPointerLeave);
canvas.addEventListener('touchstart', e => { e.preventDefault(); onPointerDown(e); }, { passive: false });
canvas.addEventListener('touchmove',  e => { e.preventDefault(); onPointerMove(e); }, { passive: false });
canvas.addEventListener('touchend',   e => { e.preventDefault(); onPointerUp();    }, { passive: false });

// ================================================================
// SHAPE SELECTOR
// ================================================================
document.querySelectorAll('.shape-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    objectType = btn.dataset.shape;
    document.querySelectorAll('.shape-btn').forEach(b => b.classList.toggle('active', b === btn));
    // Update legend icons and hint
    const isCircle = objectType === 'circle';
    document.querySelector('[data-i18n="obj1"]').textContent = T[lang][isCircle ? 'obj1' : 'obj1_sq'];
    document.querySelector('[data-i18n="obj2"]').textContent = T[lang][isCircle ? 'obj2' : 'obj2_sq'];
    document.querySelector('[data-i18n="hint"]').textContent = T[lang][isCircle ? 'hint_circle' : 'hint_square'];
    render();
  });
});

// ================================================================
// ADVANCED MODE TOGGLE
// ================================================================
document.getElementById('adv-btn').addEventListener('click', () => {
  advMode = !advMode;
  document.getElementById('adv-btn').classList.toggle('active', advMode);
  document.querySelectorAll('.std-only').forEach(el => el.classList.toggle('hidden', advMode));
  document.querySelectorAll('.adv-only').forEach(el => el.classList.toggle('hidden', !advMode));
  if (!advMode) {
    // Sync angle/speed from vx/vy when returning to standard mode
    for (let i = 0; i < 2; i++) {
      const { angle } = getSpeedAngle(i);
      objAngles[i] = angle;
      syncAngleInput(i);
    }
  }
  render();
});

['angledeg1', 'angledeg2'].forEach((id, i) => {
  document.getElementById(id)?.addEventListener('input', () => {
    objAngles[i] = parseFloat(document.getElementById(id).value || 0) * Math.PI / 180;
    render();
  });
});

// ================================================================
// SIMULATION / WEBSOCKET
// ================================================================
const WS_URL = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`;

function startSimulation() {
  const sa1 = getSpeedAngle(0);
  const sa2 = getSpeedAngle(1);

  const payload = {
    x1: setupObjs[0].x,   y1: setupObjs[0].y,
    x2: setupObjs[1].x,   y2: setupObjs[1].y,
    angle1:          sa1.angle,
    angle2:          sa2.angle,
    relative_speed1: sa1.speed,
    relative_speed2: sa2.speed,
    mass1:           masses[0],
    mass2:           masses[1],
    object_type:     objectType,
  };

  phase = 'running';
  document.getElementById('setup-panel').classList.add('hidden');
  document.getElementById('sim-panel').classList.remove('hidden');
  setStatus(T[lang].connecting);

  ws = new WebSocket(WS_URL);
  ws.onopen    = () => { ws.send(JSON.stringify(payload)); setStatus(T[lang].running); };
  ws.onmessage = e  => {
    const objects = JSON.parse(e.data);
    detectCollisions(objects);
    simObjects = objects;
    render();
  };
  ws.onerror = () => setStatus(T[lang].conn_error);
  ws.onclose = () => { if (phase === 'running') setStatus(T[lang].disconnected); };
}

function resetSimulation() {
  if (ws) { ws.close(); ws = null; }
  simObjects = []; prevVel = [null, null]; drag = null; hoverHit = null;
  phase = 'setup';
  document.getElementById('setup-panel').classList.remove('hidden');
  document.getElementById('sim-panel').classList.add('hidden');
  canvas.style.cursor = 'default';
  render();
}

function setStatus(msg) { document.getElementById('status-line').textContent = msg; }

// ================================================================
// COLLISION SOUND
// ================================================================
let audioCtx       = null;
let lastSoundTime  = 0;

function playCollisionSound() {
  const now = Date.now();
  if (now - lastSoundTime < 80) return;  // debounce: max one sound per 80ms
  lastSoundTime = now;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const ac = audioCtx, osc = ac.createOscillator(), gain = ac.createGain();
    osc.connect(gain); gain.connect(ac.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(680, ac.currentTime);
    osc.frequency.exponentialRampToValueAtTime(180, ac.currentTime + 0.14);
    gain.gain.setValueAtTime(0.2, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.18);
    osc.start(ac.currentTime); osc.stop(ac.currentTime + 0.18);
  } catch (_) {}
}

// Detect collision by checking if the velocity vector changed direction significantly.
// Works for both 1D (Vx sign flip) and 2D (dot product of old/new velocity < 0).
function detectCollisions(objects) {
  objects.forEach((obj, i) => {
    const prev = prevVel[i];
    if (prev) {
      const dot = obj.vx * prev.vx + obj.vy * prev.vy;
      const prevSpeed = Math.sqrt(prev.vx ** 2 + prev.vy ** 2);
      const currSpeed = Math.sqrt(obj.vx ** 2 + obj.vy ** 2);
      // Fire sound if velocity direction changed (dot product < 0) or speed changed > 5%
      if (prevSpeed > 0.5 && currSpeed > 0.5 && dot < prevSpeed * currSpeed * 0.8) {
        playCollisionSound();
      }
    }
    prevVel[i] = { vx: obj.vx, vy: obj.vy };
  });
}

// ================================================================
// LANGUAGE / THEME / STARS
// ================================================================
function detectLang() {
  const bl = (navigator.language || 'en').slice(0, 2).toLowerCase();
  return ['de', 'ru'].includes(bl) ? bl : 'en';
}

function setLang(l) {
  lang = l;
  document.documentElement.lang = l;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    // hint is shape-sensitive
    if (key === 'hint') {
      el.textContent = T[l][objectType === 'circle' ? 'hint_circle' : 'hint_square'];
    } else if (T[l][key]) {
      el.textContent = T[l][key];
    }
  });
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === l);
  });
}

function applyTheme(t) {
  theme = t;
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem('theme', t);
  render();
}

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
function numVal(id) { return parseFloat(document.getElementById(id)?.value) || 0; }

// ================================================================
// INIT
// ================================================================
applyTheme(theme);
setLang(lang);
fetchStars();
syncAngleInput(0);
syncAngleInput(1);
resize();

document.getElementById('start-btn').addEventListener('click', startSimulation);
document.getElementById('reset-btn').addEventListener('click', resetSimulation);
document.getElementById('theme-btn').addEventListener('click', () => applyTheme(theme === 'light' ? 'dark' : 'light'));
document.querySelectorAll('.lang-btn').forEach(btn => btn.addEventListener('click', () => setLang(btn.dataset.lang)));

['mass1', 'mass2'].forEach((id, i) => {
  document.getElementById(id).addEventListener('input', () => {
    masses[i] = parseFloat(document.getElementById(id).value) || 1;
    render();
  });
});
['speed1', 'speed2', 'vx1', 'vy1', 'vx2', 'vy2'].forEach(id => {
  document.getElementById(id)?.addEventListener('input', render);
});