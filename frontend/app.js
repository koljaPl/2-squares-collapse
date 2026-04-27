// ================================================================
// CONFIG
// ================================================================
const WORLD = { w: 800, h: 600 };
const DENSITY = 7850.0;
const GITHUB_REPO = 'koljaPl/2-squares-collapse';

// Physics → visual scale.
// Backend sends obj.size in SI meters (e.g. radius ≈ 0.02 m for a 10 kg steel ball).
// We need to scale those tiny numbers to world-coordinate units (world is 800 units wide).
// 3 800 → a 10 kg ball appears as ~5 % of arena width.  Feels right, not a dot.
const SIZE_DISPLAY_SCALE = 3800;

// Minimum and maximum visual half-size in world units.
// Prevents objects from being sub-pixel or filling the entire arena.
const MIN_HALF  = 12;   // world units — no object rendered smaller than this
const MAX_HALF  = 180;  // world units — no object rendered larger than this

// Fixed arena padding from canvas edge, in CANVAS PIXELS.
// The arena rect is always drawn with exactly this margin, so the border never
// reaches the canvas edge and objects are cleanly clipped to it.
const ARENA_PAD = 20;

// Angle interaction ring (world units from the object's edge, in setup mode).
const RING_INNER = 8;
const RING_OUTER = 40;

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
    bg:      '#FAFAF9',
    arena:   '#F0EFEB',
    grid:    'rgba(0,0,0,0.06)',
    axis:    'rgba(0,0,0,0.14)',
    wall:    'rgba(0,0,0,0.40)',
    label:   '#78716C',
    obj1:    '#1D4ED8',
    obj2:    '#B91C1C',
    ring1:   'rgba(29,78,216,0.10)',
    ring2:   'rgba(185,28,28,0.10)',
    text:    '#1C1917',
  },
  dark: {
    bg:      '#111008',
    arena:   '#0C0B07',
    grid:    'rgba(255,255,255,0.05)',
    axis:    'rgba(255,255,255,0.12)',
    wall:    'rgba(255,255,255,0.40)',
    label:   '#78716C',
    obj1:    '#93C5FD',
    obj2:    '#FCA5A5',
    ring1:   'rgba(147,197,253,0.10)',
    ring2:   'rgba(252,165,165,0.10)',
    text:    '#E7E5E4',
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
let prevVel     = [null, null];
let canvasW = 1, canvasH = 1;

let mouseWorld  = { x: 0, y: 0 };
let drag        = null;   // { type: 'move'|'angle', idx: 0|1 } | null
let hoverHit    = null;   // { idx, type: 'body'|'ring' } | null

const setupObjs = [
  { x: -200, y: 0 },
  { x:  140, y: 0 },
];
const objAngles = [0, Math.PI]; // radians; 0 = right, π/2 = up
let masses      = [10, 20];

// ================================================================
// CANVAS SETUP
// ================================================================
const canvas = document.getElementById('canvas');
const ctx    = canvas.getContext('2d');

const C = (k) => PALETTE[theme][k];

// ================================================================
// COORDINATE TRANSFORM
// ================================================================
// The arena occupies the canvas minus ARENA_PAD on every side.
// Physics world: X ∈ [-400, 400], Y ∈ [-300, 300] (Y-up).
// Canvas: Y is down, origin at top-left.
//
// These functions are the single source of truth for world ↔ canvas mapping.
// There is no viewPad, no dynamic scale — the arena borders are always exactly
// at pixel ARENA_PAD from the canvas edges, period.

function arenaLeft()   { return ARENA_PAD; }
function arenaTop()    { return ARENA_PAD; }
function arenaRight()  { return canvasW - ARENA_PAD; }
function arenaBottom() { return canvasH - ARENA_PAD; }
function arenaW_px()   { return canvasW - 2 * ARENA_PAD; }
function arenaH_px()   { return canvasH - 2 * ARENA_PAD; }

// World → canvas pixel
function wx(worldX) {
  return ARENA_PAD + (worldX + WORLD.w / 2) / WORLD.w * arenaW_px();
}
function wy(worldY) {
  return ARENA_PAD + (WORLD.h / 2 - worldY) / WORLD.h * arenaH_px(); // Y flipped
}

// Canvas pixel → world
function cw(px) {
  return (px - ARENA_PAD) / arenaW_px() * WORLD.w - WORLD.w / 2;
}
function ch(py) {
  return WORLD.h / 2 - (py - ARENA_PAD) / arenaH_px() * WORLD.h;
}

// World distance → canvas pixels (uniform scale, using X axis)
function wsc(d) { return d / WORLD.w * arenaW_px(); }

// ================================================================
// SIZE HELPERS
// ================================================================
//
// "half" = the characteristic visual half-size used for rendering and hit-testing.
//   circle → radius    square → half-side
//
// The backend sends obj.size in SI meters, which we scale up:
//   displayHalf (setup, from mass):
//     circle: radius = sqrt(m / (ρ·π))  · SCALE
//     square: half   = sqrt(m / ρ) / 2  · SCALE
//
//   simHalf (running, from backend obj.size):
//     Both circle and square: obj.size is already the "half" value in SI.
//     Multiply by SCALE then clamp.

function clampHalf(h) {
  return Math.max(MIN_HALF, Math.min(MAX_HALF, h));
}

function displayHalf(mass, type) {
  let raw;
  if (type === 'circle') raw = Math.sqrt(mass / (DENSITY * Math.PI)) * SIZE_DISPLAY_SCALE;
  else                   raw = Math.sqrt(mass / DENSITY) / 2 * SIZE_DISPLAY_SCALE;
  return clampHalf(raw);
}

function simHalf(obj) {
  // Теперь мы просто доверяем размеру от бекенда, 
  // так как он уже применяет SIZE_DISPLAY_SCALE и ограничения
  return obj.size;
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
// RENDER  (main entry point)
// ================================================================
function render() {
  ctx.clearRect(0, 0, canvasW, canvasH);

  // 1. Background (outer, behind arena)
  ctx.fillStyle = C('bg');
  ctx.fillRect(0, 0, canvasW, canvasH);

  // 2. Arena fill
  ctx.fillStyle = C('arena');
  ctx.fillRect(arenaLeft(), arenaTop(), arenaW_px(), arenaH_px());

  // 3. Grid lines (inside arena, drawn before clipping)
  drawGrid();

  // 4. Arena border on top of grid
  drawArenaBorder();

  // 5. Clip everything that follows to the arena rectangle.
  //    This prevents objects from visually overflowing the walls,
  //    regardless of what the physics says.
  ctx.save();
  ctx.beginPath();
  ctx.rect(arenaLeft(), arenaTop(), arenaW_px(), arenaH_px());
  ctx.clip();

  // 6. Draw content
  if (phase === 'setup') {
    drawSetup();
  } else {
    // Draw velocity arrows FIRST (behind objects)
    simObjects.forEach((obj, i) => {
      const color = i === 0 ? C('obj1') : C('obj2');
      drawArrow(obj, obj.vx, obj.vy, color, simHalf(obj));
    });
    // Then draw object bodies ON TOP of arrows
    simObjects.forEach((obj, i) => {
      const color = i === 0 ? C('obj1') : C('obj2');
      drawShape(obj, simHalf(obj), obj.type, color);
    });
  }

  // 7. Remove clip
  ctx.restore();

  // 8. Overlay: coordinate labels when dragging (outside clip so they can float)
  if (drag !== null || hoverHit !== null) {
    drawCoordLabel();
  }
}

// ================================================================
// GRID
// ================================================================
function drawGrid() {
  ctx.save();
  ctx.beginPath();
  ctx.rect(arenaLeft(), arenaTop(), arenaW_px(), arenaH_px());
  ctx.clip();

  // Minor grid
  ctx.lineWidth   = 0.5;
  ctx.strokeStyle = C('grid');
  for (let x = -400; x <= 400; x += 100) {
    ctx.beginPath(); ctx.moveTo(wx(x), arenaTop()); ctx.lineTo(wx(x), arenaBottom()); ctx.stroke();
  }
  for (let y = -300; y <= 300; y += 100) {
    ctx.beginPath(); ctx.moveTo(arenaLeft(), wy(y)); ctx.lineTo(arenaRight(), wy(y)); ctx.stroke();
  }

  // Center axes
  ctx.strokeStyle = C('axis');
  ctx.lineWidth   = 1;
  ctx.beginPath(); ctx.moveTo(wx(0), arenaTop());    ctx.lineTo(wx(0), arenaBottom()); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(arenaLeft(), wy(0));   ctx.lineTo(arenaRight(), wy(0));  ctx.stroke();

  ctx.restore();
}

function drawArenaBorder() {
  ctx.strokeStyle = C('wall');
  ctx.lineWidth   = 1.5;
  ctx.strokeRect(arenaLeft(), arenaTop(), arenaW_px(), arenaH_px());
}

function drawCoordLabel() {
  const fs = Math.max(9, canvasW * 0.012);
  ctx.font      = `${fs}px 'JetBrains Mono', monospace`;
  ctx.fillStyle = C('text');
  ctx.textAlign = 'left';
  ctx.fillText(`(${Math.round(mouseWorld.x)}, ${Math.round(mouseWorld.y)})`, arenaLeft() + 6, arenaTop() + fs + 4);
}

// ================================================================
// SETUP DRAWING
// ================================================================
function drawSetup() {
  // Draw arrows first, then bodies — same z-order convention as running mode.
  for (let i = 0; i < 2; i++) {
    const color = i === 0 ? C('obj1') : C('obj2');
    const { vx, vy } = getVelocity(i);
    const half = displayHalf(masses[i], objectType);
    drawArrow(setupObjs[i], vx, vy, color, half);
  }

  for (let i = 0; i < 2; i++) {
    const obj   = setupObjs[i];
    const color = i === 0 ? C('obj1') : C('obj2');
    const ringC = i === 0 ? C('ring1') : C('ring2');
    const half  = displayHalf(masses[i], objectType);

    // Angle ring (shown when hovering or dragging the ring zone)
    const showRing = (hoverHit?.idx === i && hoverHit.type === 'ring')
                  || (drag?.idx    === i && drag.type    === 'angle');
    if (showRing) {
      const rInner = wsc(half + RING_INNER);
      const rOuter = wsc(half + RING_INNER + RING_OUTER);
      const cx_ = wx(obj.x), cy_ = wy(obj.y);

      ctx.beginPath();
      ctx.arc(cx_, cy_, rOuter, 0, Math.PI * 2);
      ctx.arc(cx_, cy_, rInner, Math.PI * 2, 0, true);
      ctx.fillStyle = ringC;
      ctx.fill();

      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = color;
      ctx.lineWidth   = 1;
      ctx.globalAlpha = 0.4;
      ctx.beginPath(); ctx.arc(cx_, cy_, rOuter, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }

    drawShape(obj, half, objectType, color);
  }
}

// ================================================================
// SHAPE PRIMITIVES
// ================================================================
// drawShape dispatches based on type.
// half: the characteristic half-size in world units
//   circle → radius   square → half-side

function drawShape(obj, half, type, color) {
  if (type === 'circle') drawCircle(obj, half, color);
  else                   drawSquare(obj, half, color);
}

function drawCircle(obj, half, color) {
  const r = wsc(half);
  const x = wx(obj.x), y = wy(obj.y);

  // Semi-transparent fill
  ctx.globalAlpha = 0.18;
  ctx.fillStyle   = color;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;

  // Outline
  ctx.strokeStyle = color;
  ctx.lineWidth   = 2;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();

  // Center dot
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(x, y, Math.max(2.5, r * 0.06), 0, Math.PI * 2); ctx.fill();
}

function drawSquare(obj, half, color) {
  const s = wsc(half);      // half → canvas pixels (half-side)
  const x = wx(obj.x), y = wy(obj.y);

  // Semi-transparent fill
  ctx.globalAlpha = 0.18;
  ctx.fillStyle   = color;
  ctx.fillRect(x - s, y - s, s * 2, s * 2);
  ctx.globalAlpha = 1;

  // Outline
  ctx.strokeStyle = color;
  ctx.lineWidth   = 2;
  ctx.strokeRect(x - s, y - s, s * 2, s * 2);

  // Center dot
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(x, y, Math.max(2.5, s * 0.06), 0, Math.PI * 2); ctx.fill();
}

// ================================================================
// VELOCITY ARROW
// ================================================================
function drawArrow(obj, vx, vy, color, objHalf) {
  const speed = Math.sqrt(vx * vx + vy * vy);
  if (speed < 0.1) return;

  // Arrow length: scale with speed but cap it so it doesn't dominate the arena.
  // Start the arrow from the object's edge, not its center, so it's clearly separate.
  const worldLen = Math.min(90, speed * 0.25);
  const scale    = worldLen / speed;

  // Start point: object center
  const sx = wx(obj.x),                        sy = wy(obj.y);
  // End point: center + velocity vector (wy handles Y-flip)
  const ex = wx(obj.x + vx * scale),           ey = wy(obj.y + vy * scale);
  const ang = Math.atan2(ey - sy, ex - sx);
  const hs  = Math.max(6, wsc(10));   // arrowhead size in canvas px

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle   = color;
  ctx.globalAlpha = 0.75;
  ctx.lineWidth   = 1.5;

  ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(ex, ey);
  ctx.lineTo(ex - hs * Math.cos(ang - 0.4), ey - hs * Math.sin(ang - 0.4));
  ctx.lineTo(ex - hs * Math.cos(ang + 0.4), ey - hs * Math.sin(ang + 0.4));
  ctx.closePath();
  ctx.fill();

  ctx.restore();
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
// HIT TEST  (AABB — good enough for UI interaction)
// ================================================================
function hitTest(canvasX, canvasY) {
  const wx_ = cw(canvasX), wy_ = ch(canvasY);
  // Check in reverse order so the topmost-drawn object wins
  for (let i = setupObjs.length - 1; i >= 0; i--) {
    const half     = displayHalf(masses[i], objectType);
    const ringEdge = half + RING_INNER + RING_OUTER;
    const dx = Math.abs(wx_ - setupObjs[i].x);
    const dy = Math.abs(wy_ - setupObjs[i].y);
    if (dx <= half     && dy <= half)     return { idx: i, type: 'body' };
    if (dx <= ringEdge && dy <= ringEdge) return { idx: i, type: 'ring' };
  }
  return null;
}

// ================================================================
// DRAG CONSTRAINTS
// ================================================================
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function safePos(idx, newX, newY) {
  const half      = displayHalf(masses[idx],     objectType);
  const otherHalf = displayHalf(masses[1 - idx], objectType);
  const other     = setupObjs[1 - idx];
  const minSep    = half + otherHalf;

  // Clamp to physics world bounds (object edge must stay inside the walls)
  newX = clamp(newX, -WORLD.w / 2 + half, WORLD.w / 2 - half);
  newY = clamp(newY, -WORLD.h / 2 + half, WORLD.h / 2 - half);

  // AABB overlap push-apart
  const dx = newX - other.x;
  const dy = newY - other.y;
  if (Math.abs(dx) < minSep && Math.abs(dy) < minSep) {
    const penX = minSep - Math.abs(dx);
    const penY = minSep - Math.abs(dy);
    if (penX <= penY) newX = other.x + Math.sign(dx || 1) * minSep;
    else              newY = other.y + Math.sign(dy || 1) * minSep;
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
  const p   = getCanvasXY(e);
  const hit = hitTest(p.x, p.y);
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
let audioCtx      = null;
let lastSoundTime = 0;

function playCollisionSound() {
  const now = Date.now();
  if (now - lastSoundTime < 80) return;
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

function detectCollisions(objects) {
  objects.forEach((obj, i) => {
    const prev = prevVel[i];
    if (prev) {
      const dot       = obj.vx * prev.vx + obj.vy * prev.vy;
      const prevSpeed = Math.sqrt(prev.vx ** 2 + prev.vy ** 2);
      const currSpeed = Math.sqrt(obj.vx  ** 2 + obj.vy  ** 2);
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
resize();
applyTheme(theme);
setLang(lang);
fetchStars();
syncAngleInput(0);
syncAngleInput(1);

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