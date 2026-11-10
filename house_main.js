import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { createKiryu } from './kiryu_house.js?v=1';
import { createMerchant } from './merchant.js?v=1';

/* ===== 3D-версия: яма 4×4 на 20 слоёв, кубы из ваших тайлов, физика мусора ===== */
const PLOT = window.PLOT3D, TEX = window.TEX3D;
const N = 6, DIG = PLOT.length - 10, BOT = DIG + 10;   // ниже дна ямы — ещё 10 слоёв цельного камня, чтобы мир не обрывался            // сетка 6×6: две декоративные стенки сзади и сбоку, яма — передние 4×4; нижние 10 слоёв срезаны
const PIT0 = 2, PIT1 = 6, PC = (PIT0 + PIT1) / 2; // яма занимает x,z от 2 до 6
const ACT = []; for (let j = PIT0; j < PIT1; j++) for (let i = PIT0; i < PIT1; i++) ACT.push([i, j]);
const BH = 0.8165;                               // высота блока: кубы выглядят ровно как изометрические спрайты
/* лавка подземного торговца — ниша в правой декоративной стенке (ряд j=1): клетки i0..i1-1, слои z0..z1 (2 блока высотой) */
const SHOP = { i0: 2, i1: 6, j0: 0, j1: 1, z0: 3, z1: 4, revealed: false };   // во всю видимую стенку, 2 блока в глубину; сбоку открыто
SHOP.floor = -(SHOP.z1 + 1) * BH; SHOP.ceil = -SHOP.z0 * BH;
const BASKET = { x: 5.02, z: 1.42, r: .5, h: .62 };          // огромная корзина справа от торговца
const WIN = { x0: BASKET.x - .55, x1: BASKET.x + .55 };      // «окно» в невидимой стенке — только над корзиной
const MERCH = { x: 3.75, z: 1.4, ry: .15 };                 // где сидит торговец: у самого края, чуть развёрнут к игроку
const inShop = (i, j, z) => j >= SHOP.j0 && j <= SHOP.j1 && i >= SHOP.i0 && i < SHOP.i1 && z >= SHOP.z0 && z <= SHOP.z1;
const PX = 64 / Math.SQRT2;                      // пикселей на единицу мира (ромб верха = 64 px)

/* ---------- Telegram ---------- */
const tg = window.Telegram && window.Telegram.WebApp;
if (tg) { try { tg.ready(); tg.expand(); tg.disableVerticalSwipes && tg.disableVerticalSwipes(); tg.setHeaderColor('#1b2a3a'); tg.setBackgroundColor('#1b2a3a'); tg.setBottomBarColor && tg.setBottomBarColor('#14202c') } catch (e) {} }
const haptic = k => { try { tg && tg.HapticFeedback && (k === 'warn' ? tg.HapticFeedback.notificationOccurred('warning') : tg.HapticFeedback.impactOccurred(k)) } catch (e) {} };

/* ---------- иконки ---------- */
function icon(rows, pal, host) { const c = document.createElement('canvas'); c.width = c.height = rows.length; const x = c.getContext('2d');
  rows.forEach((r, y) => [...r].forEach((ch, i) => { if (pal[ch]) { x.fillStyle = pal[ch]; x.fillRect(i, y, 1, 1) } })); if (host) host.appendChild(c); return c }
const MAPI = ["................", "................", ".kkkkkkkkkkkkkk.", ".kppppPPPPppppk.", ".kpggpPPPPpppbk.", ".kpggpPPPbpprpk.", ".kpppbPPbPprrpk.", ".kpppbPPPPpprpk.", ".kppbpPPPPppppk.", ".kpbppPPPPpgggk.", ".kbpppPPPPpgggk.", ".kppppPPPPppppk.", ".kkkkkkkkkkkkkk.", "................", "................", "................"];
icon(MAPI, { k: '#10141f', p: '#e7d7a4', P: '#c4ad74', g: '#5f9c4f', b: '#7a4836', r: '#c8423a' }, document.getElementById('mapbtn'));
const XI = ["................", ".kk..........kk.", ".kxk........kxk.", "..kxk......kxk..", "...kxk....kxk...", "....kxk..kxk....", ".....kxkkxk.....", "......kxxk......", "......kxxk......", ".....kxkkxk.....", "....kxk..kxk....", "...kxk....kxk...", "..kxk......kxk..", ".kxk........kxk.", ".kk..........kk.", "................"];

/* ---------- инструменты в кожаной сумке: телефон (пока неактивен), кирка, лом, перчатка, садовая лопатка ---------- */
const TOOLS = ['phone', 'pick', 'bar', 'glove', 'trowel', null, null, null, null];
const TOOL_NAME = { phone: 'Телефон', pick: 'Кирка', bar: 'Лом', glove: 'Перчатка', trowel: 'Садовая лопатка' };
const toolBtns = [...document.querySelectorAll('.tool')];
let tool = null;
const iconFx = {};                                         // тряска и подъём 3D-иконок
for (const t of TOOLS) if (t) iconFx[t] = { shake: 0, lift: 0 };
function shakeTool(t) { if (iconFx[t]) iconFx[t].shake = .4; haptic('warn') }
function setTool(t) {
  if (t === 'phone') { shakeTool('phone'); toast('Телефон пока молчит'); return }
  tool = tool === t ? null : t; haptic('light');
  if (tool === 'trowel' && !setTool.tw) { setTool.tw = true; toast('Лопатка рыхлит землю там, где на стенке черви') }
  toolBtns.forEach((b, k) => b.setAttribute('aria-pressed', TOOLS[k] && TOOLS[k] === tool ? 'true' : 'false'));
}
toolBtns.forEach((b, k) => { const t = TOOLS[k];
  if (!t) { b.disabled = true; b.setAttribute('aria-label', 'Пустой карман'); return }
  b.setAttribute('aria-label', TOOL_NAME[t]); if (t === 'phone') b.classList.add('off');
  b.addEventListener('click', () => setTool(t)) });
setTool('pick');
/* кожаная сумка рисуется по пикселям один раз (80×90, на экране вдвое крупнее): откинутый клапан, скатанная горловина
   с ремешком и пряжкой, строчка по краю, полукольцо сбоку и 3×3 кармашка — тёмная глубина и передняя стенка со строчкой */
function drawBag(cnv) {
  const x = cnv.getContext('2d'), W = cnv.width, H = cnv.height; x.clearRect(0, 0, W, H);
  const put = (px, py, c) => { x.fillStyle = c; x.fillRect(px, py, 1, 1) };
  const nz = (px, py) => { let h = Math.imul(px * 374761393 + py * 668265263, 1274126177); h ^= h >>> 15; return (h >>> 0) / 4294967296 };   // крапинки кожи
  const ins = (px, py, s) => { if (px < s.x || py < s.y || px >= s.x + s.w || py >= s.y + s.h) return false;
    const top = py < s.y + s.h / 2, r = top ? s.rt : s.rb; if (!r) return true;
    const cx = px < s.x + r ? s.x + r : px >= s.x + s.w - r ? s.x + s.w - r : null, cy = top ? (py < s.y + r ? s.y + r : null) : (py >= s.y + s.h - r ? s.y + s.h - r : null);
    return cx === null || cy === null || (px + .5 - cx) ** 2 + (py + .5 - cy) ** 2 <= r * r };
  const paint = (s, col, edge) => { for (let py = s.y; py < s.y + s.h; py++) for (let px = s.x; px < s.x + s.w; px++) if (ins(px, py, s)) {
    const e = !ins(px - 1, py, s) || !ins(px + 1, py, s) || !ins(px, py - 1, s) || !ins(px, py + 1, s); put(px, py, e && edge ? edge : col(px, py)) } };
  const OUT = '#2a1408', ST = '#e9c88c', BR = '#e3b24b', BRL = '#fff3bf', BRD = '#8a5f1a', STRAP = '#6e3d1d';
  const body = { x: 2, y: 12, w: 72, h: 75, rt: 3, rb: 7 }, flap = { x: 7, y: 2, w: 62, h: 14, rt: 6, rb: 0 };
  x.fillStyle = 'rgba(0,0,0,.34)';                               // тень сумки
  for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) if (!ins(px, py, body) && ins(px - 2, py - 3, body)) x.fillRect(px, py, 1, 1);
  paint(flap, (px, py) => py < 4 ? '#5d331b' : nz(px, py) < .07 ? '#3a1f0e' : '#4a2814', OUT);   // откинутый клапан позади
  for (let px = flap.x + 5; px < flap.x + flap.w - 5; px++) if ((px >> 1) % 2 === 0) put(px, 5, '#9c7748');
  paint(body, (px, py) => { const dy = py - body.y, l = px - body.x, r = body.x + body.w - 1 - px;   // корпус: свет слева сверху, тень справа и снизу
    if (dy <= 1) return '#cd9056'; if (dy === 2) return '#b4743f'; if (dy === 3) return '#9a5f33'; if (dy === 4) return '#5e3318';   // скатанный край горловины
    if (l === 1) return '#b4743f'; if (r <= 2) return '#7a4625';
    if (dy > body.h - 6) return '#6a3b1d'; if (dy > body.h - 11) return '#7d4826';
    if (px > 4 && px < 73 && py > 16 && py < 85) return '#9a5f33';   // вокруг ячеек кожа ровная, без крапинок
    const n = nz(px, py); return n < .05 ? '#87502a' : n < .085 ? '#ab6d3b' : '#9a5f33' }, OUT);
  for (let py = body.y + 8; py < body.y + body.h - 4; py++) if ((py >> 1) % 2 === 0) { put(body.x + 2, py, ST); put(body.x + body.w - 3, py, ST) }   // строчка по краю
  for (let px = body.x + 6; px < body.x + body.w - 6; px++) if ((px >> 1) % 2 === 0) put(px, body.y + body.h - 3, ST);
  for (let r = 0; r < 3; r++) for (let q = 0; q < 3; q++) {      // простые ячейки: тёмное углубление без узоров — инструменты читаются сразу
    const x0 = 7 + 22 * q, y0 = 19 + 22 * r;
    paint({ x: x0, y: y0, w: 20, h: 20, rt: 2, rb: 2 }, (px, py) => py - y0 <= 1 ? '#22130a' : py - y0 >= 18 ? '#55361f' : '#3a2416', '#1c0f07');
  }
  paint({ x: 34, y: 4, w: 8, h: 13, rt: 0, rb: 0 }, (px, py) => px === 35 ? '#8e5530' : STRAP, OUT);   // ремешок от клапана
  for (let py = 6; py < 10; py += 2) put(38, py, '#c9a26a');
  paint({ x: 32, y: 9, w: 12, h: 8, rt: 1, rb: 1 }, (px, py) => py === 10 || px === 33 ? BRL : BR, BRD);   // пряжка
  for (let px = 34; px < 42; px++) for (let py = 11; py < 15; py++) put(px, py, py === 11 ? '#8e5530' : STRAP);
  put(37, 11, BRL); put(37, 12, BR); put(37, 13, BR); put(37, 14, BRD);   // язычок пряжки
  paint({ x: 72, y: 22, w: 4, h: 11, rt: 0, rb: 0 }, (px, py) => px === 72 ? '#8e5530' : STRAP, OUT);   // петля и полукольцо сбоку
  for (const [px, py, c] of [[76, 22, BR], [77, 23, BRL], [78, 24, BRL], [78, 25, BR], [78, 26, BR], [78, 27, BR], [78, 28, BR], [78, 29, BRD], [77, 30, BRD], [76, 31, BRD], [76, 23, BRD], [76, 30, BR]]) put(px, py, c);
  for (const [px, py] of [[73, 24], [73, 30]]) put(px, py, BR);
}

{ const c = document.querySelector('.pouch .bagbg'); if (c) drawBag(c) }

/* ---------- состояние раскопа ---------- */
const d = ACT.map(() => 0);
// план из редактора — 3×3: кольцо декора (индекс 0) + яма 2×2 (индексы 1..2).
// яму 4×4 собираем из него зеркально, ближняя к яме декоративная стенка берёт кольцо плана, дальняя — просто земля
const MIR = [1, 2, 2, 1];
const pm = v => v >= PIT0 ? MIR[v - PIT0] : 0;
const code = (i, j, z) => z >= DIG ? 'К' : inShop(i, j, z) ? '.' : (i === 0 || j === 0) ? '*' : PLOT[z][pm(j)][pm(i)];
function settle() { for (let a = 0; a < ACT.length; a++) while (d[a] < DIG && code(ACT[a][0], ACT[a][1], d[a]) === '.') d[a]++ }
settle();
const cur = () => Math.min(...d);
const isAct = (i, j) => ACT.findIndex(a => a[0] === i && a[1] === j);
const hash = (a, b, c) => { let h = (a * 73856093) ^ (b * 19349663) ^ (c * 83492791); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) % 3 };
const diggable = (a, z) => d[a] === z && z === cur() && z < DIG;
const floorY = a => -d[a] * BH;                  // верх самого верхнего блока в клетке ямы

/* ---------- рендер в низком разрешении, растянутый без сглаживания ---------- */
const stage = document.getElementById('stage'), cv = document.getElementById('cv'), bgc = document.getElementById('bg');
const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: false, alpha: true });
renderer.setPixelRatio(1);
const scene = new THREE.Scene();
const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
const C30 = Math.cos(Math.PI / 6);
const VIEW = new THREE.Vector3(C30 * Math.SQRT1_2, 0.5, C30 * Math.SQRT1_2);   // 30° сверху, 45° вбок
const SCR_R = new THREE.Vector3(Math.SQRT1_2, 0, -Math.SQRT1_2);               // единичные векторы экрана в мире
const SCR_U = new THREE.Vector3(-0.5 * Math.SQRT1_2, C30, -0.5 * Math.SQRT1_2);
let W = 200, H = 300, SCALE = 2;
const VIEW_W = 300;
function resize() {
  const r = stage.getBoundingClientRect();
  const sc = r.width / VIEW_W; SCALE = sc >= 2 ? Math.floor(sc) : Math.max(1, sc);   // ширина кадра ≈ VIEW_W «пикселей игры»: яма 4×4 целиком и немного запаса
  W = Math.ceil(r.width / SCALE); H = Math.ceil(r.height / SCALE);
  renderer.setSize(W, H, false);
  for (const c of [cv, bgc]) { c.style.width = W * SCALE + 'px'; c.style.height = H * SCALE + 'px' }
  cam.left = -W / 2 / PX; cam.right = W / 2 / PX; cam.top = H / 2 / PX; cam.bottom = -H / 2 / PX; cam.updateProjectionMatrix();
  makeBg(); idRT.setSize(W, H); olMat.uniforms.px.value.set(1 / W, 1 / H);
}
function makeBg() {
  bgc.width = W; bgc.height = H; const x = bgc.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#2b4a78'); g.addColorStop(.6, '#4f8ea0'); g.addColorStop(1, '#7cc0b6');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  const rows = [['#3d7891', '#9fe0d6', .10, .30], ['#2f6278', '#c8f0e0', .07, .42], ['#24506a', '#f7e7a6', .05, .56]];
  rows.forEach(([col, win, p, base], L) => { let xx = -6; const seed = L * 997;
    while (xx < W) { const r1 = ((Math.sin(xx * 12.9898 + seed) * 43758.5453) % 1 + 1) % 1, r2 = ((Math.sin(xx * 78.233 + seed) * 12345.678) % 1 + 1) % 1;
      const w = 10 + Math.floor(r1 * 20), h = Math.floor(H * (base + r2 * .25)); const y = H - h;
      x.fillStyle = col; x.fillRect(xx, y, w, h); x.fillStyle = win;
      for (let wy = y + 3; wy < H - 2; wy += 4) for (let wx = xx + 2; wx < xx + w - 2; wx += 3) { const q = ((Math.sin(wx * 3.1 + wy * 7.7 + seed) * 9999) % 1 + 1) % 1; if (q < p) x.fillRect(wx, wy, 1, 2) }
      xx += w + 1 } });
}
/* камера следует за персонажем и двигается только на целые пиксели — иначе пиксельные текстуры «дрожат» */
const camF = new THREE.Vector3(PC, 0, PC);                   // точка, за которой следит камера (сглаженная)
function placeCam(dt) {
  const k = 1 - Math.exp(-dt * 4);                           // по горизонтали камера стоит на центре ямы, по глубине плавно идёт за персонажем
  camF.x = PC; camF.z = PC; camF.y += (CH.y + .3 - camF.y) * k;
  let sx = Math.round(camF.dot(SCR_R) * PX), sy = Math.round(camF.dot(SCR_U) * PX);
  const t = SCR_R.clone().multiplyScalar(sx / PX).addScaledVector(SCR_U, sy / PX);
  cam.position.copy(t).addScaledVector(VIEW, 60); cam.lookAt(t);
}

/* ---------- блоки: кубы с гранями из ваших тайлов ---------- */
/* свет: солнце почти сверху (чуть со стороны задней стенки) даёт настоящие тени, мягкий свет спереди — объём мусору.
   у блоков яркость каждой грани заранее выровнена, чтобы нарисованные тайлы выглядели как раньше,
   а темнело только то, что попало в тень */
const SUN_DIR = new THREE.Vector3(-.3, 1, -.42).normalize(), FILL_DIR = new THREE.Vector3(.19, .875, .45).normalize();
const AMB = .4, SUN = .72, FILL = .26;
const FACE_K = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].map(a => { const n = new THREE.Vector3(...a);
  return 1 / (AMB + SUN * Math.max(0, n.dot(SUN_DIR)) + FILL * Math.max(0, n.dot(FILL_DIR))) });
/* все тайлы блоков — в одном атласе: тогда весь слой земли рисуется одной командой видеокарте */
const ATL_T = 32, ATL_C = 8, TKEYS = Object.keys(TEX), ATL_R = Math.ceil(TKEYS.length * 3 / ATL_C);
const atlC = document.createElement('canvas'); atlC.width = ATL_C * ATL_T; atlC.height = ATL_R * ATL_T;
const atlas = new THREE.CanvasTexture(atlC); atlas.magFilter = atlas.minFilter = THREE.NearestFilter; atlas.generateMipmaps = false; atlas.colorSpace = THREE.SRGBColorSpace;
const TILE = {};                                             // ключ блока -> номера тайлов [бок R, бок L, верх T]
TKEYS.forEach((k, n) => { TILE[k] = [n * 3, n * 3 + 1, n * 3 + 2];
  TEX[k].forEach((src, q) => { const im = new Image(), t = n * 3 + q;
    im.onload = () => { atlC.getContext('2d').drawImage(im, (t % ATL_C) * ATL_T, (t / ATL_C | 0) * ATL_T, ATL_T, ATL_T); atlas.needsUpdate = true }; im.src = src }) });
// подсветка блоков, которые можно копать: атрибут hl у вершин + общий пульс
const pulseU = { value: 0 };
const chunkMat = new THREE.MeshLambertMaterial({ map: atlas, vertexColors: true });
chunkMat.onBeforeCompile = sh => { sh.uniforms.uPulse = pulseU;
  sh.vertexShader = 'attribute float hl;\nvarying float vHl;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvHl = hl;');
  sh.fragmentShader = 'uniform float uPulse;\nvarying float vHl;\n' + sh.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb *= 1.0 + vHl * uPulse;') };
const matKey = (i, j, z) => { const c = code(i, j, z); return c === '*' || c === 'З' ? ['З', 'З1', 'З2'][hash(i, j, z)] : c };
const boxGeo = new THREE.BoxGeometry(1, BH, 1);
// камера смотрит с +x +y +z, поэтому у блока бывают видны только три грани: +x (бок R), +y (верх T), +z (бок L)
const FT = [[0, 0], [2, 2], [4, 1]].map(([f, tx]) => { const g = boxGeo.groups[f], ix = Array.from(boxGeo.index.array.slice(g.start, g.start + g.count)), v0 = Math.min(...ix);
  return { f, tx, pos: Array.from(boxGeo.attributes.position.array.slice(v0 * 3, v0 * 3 + 12)), uv: Array.from(boxGeo.attributes.uv.array.slice(v0 * 2, v0 * 2 + 8)), nrm: Array.from(boxGeo.attributes.normal.array.slice(v0 * 3, v0 * 3 + 12)), idx: ix.map(x => x - v0) } });
const blocks = new Map();                                   // "i,j,z" -> {k, body}
const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -24, 0) });
world.broadphase = new CANNON.SAPBroadphase(world); world.allowSleep = true;
world.solver.iterations = 15;
world.defaultContactMaterial.friction = .4; world.defaultContactMaterial.restitution = 0;   // без отскоков
const G_BLOCK = 1, G_TRASH = 2, G_CHAR = 4;
const blockShape = new CANNON.Box(new CANNON.Vec3(.5, BH / 2, .5));
for (let z = 0; z <= BOT; z++) for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) if (code(i, j, z) !== '.') blocks.set(i + ',' + j + ',' + z, { k: matKey(i, j, z), body: null });
for (let z = SHOP.z0; z <= SHOP.z1; z++) for (let i = SHOP.i0; i < SHOP.i1; i++) blocks.set(i + ',-1,' + z, { k: ['З', 'З1', 'З2'][hash(i, -1, z)], body: null });   // задняя стенка выемки
const hasB = (i, j, z) => blocks.has(i + ',' + j + ',' + z);
// физика нужна только верхним блокам ямы (на них лежит мусор); глубже тела добавляются по мере раскопок
function ensureBodies() {
  let lo = Infinity, hi = -1; for (let a = 0; a < ACT.length; a++) { lo = Math.min(lo, d[a]); hi = Math.max(hi, d[a]) }
  for (let a = 0; a < ACT.length; a++) { const [i, j] = ACT[a];
    for (let z = lo; z <= Math.min(DIG, hi + 2); z++) { const b = blocks.get(i + ',' + j + ',' + z); if (!b || b.body) continue;
      b.body = new CANNON.Body({ mass: 0, type: CANNON.Body.STATIC, shape: blockShape, position: new CANNON.Vec3(i + .5, -(z + .5) * BH, j + .5), collisionFilterGroup: G_BLOCK, collisionFilterMask: G_TRASH });
      world.addBody(b.body) } }
}
/* слой земли = один меш из видимых граней. Перестраивается, только когда в нём или над ним выкопали блок */
const chunks = [];                                          // z -> {mesh, faces, hlKey}
function buildChunk(z) {
  let ch = chunks[z]; if (ch) { scene.remove(ch.mesh); ch.mesh.geometry.dispose() }
  const pos = [], nrm = [], uv = [], idx = [], faces = [];
  for (let i = 0; i < N; i++) for (let j = -1; j < N; j++) { const b = blocks.get(i + ',' + j + ',' + z); if (!b) continue;
    const open = [!hasB(i + 1, j, z) || i === N - 1, z === 0 || !hasB(i, j, z - 1), !hasB(i, j + 1, z) || j === N - 1];
    FT.forEach((ft, q) => { if (!open[q]) return;
      const v0 = pos.length / 3, t = TILE[b.k][ft.tx], tu = (t % ATL_C) * ATL_T, tv = (t / ATL_C | 0) * ATL_T;
      for (let v = 0; v < 4; v++) {
        pos.push(ft.pos[v * 3] + i + .5, ft.pos[v * 3 + 1] - (z + .5) * BH, ft.pos[v * 3 + 2] + j + .5); nrm.push(ft.nrm[v * 3], ft.nrm[v * 3 + 1], ft.nrm[v * 3 + 2]);
        uv.push((tu + .01 + ft.uv[v * 2] * (ATL_T - .02)) / atlC.width, 1 - (tv + .01 + (1 - ft.uv[v * 2 + 1]) * (ATL_T - .02)) / atlC.height) }
      for (const x of ft.idx) idx.push(v0 + x);
      faces.push({ i, j, z, f: ft.f, key: i + ',' + j + ',' + z, p: ft.pos }) }) }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(pos.length).fill(1), 3));
  g.setAttribute('hl', new THREE.Float32BufferAttribute(new Float32Array(pos.length / 3), 1)); g.setIndex(idx); g.computeBoundingSphere();
  const mesh = new THREE.Mesh(g, chunkMat); mesh.userData.chunk = z; mesh.castShadow = mesh.receiveShadow = true; mesh.matrixAutoUpdate = false; mesh.visible = faces.length > 0;
  scene.add(mesh); chunks[z] = { mesh, faces, hlKey: '' }; return chunks[z];
}
let lightDirty = true;
const chunkDirty = new Set();
function removeBlock(i, j, z) { const b = blocks.get(i + ',' + j + ',' + z); if (!b) return; lightDirty = true; if (b.body) world.removeBody(b.body); blocks.delete(i + ',' + j + ',' + z);
  chunkDirty.add(z); if (z + 1 <= BOT) chunkDirty.add(z + 1); decoGone(i, j, z) }
// невидимые стенки по краю ямы от неба до дна: мусор не вылетит из участка
{ const top = 3, bot = -(DIG + 1) * BH, hw = (PIT1 - PIT0) / 2 + 1;
  const wall = (x0, x1, y0, y1, z0, z1) => world.addBody(new CANNON.Body({ mass: 0, type: CANNON.Body.STATIC, shape: new CANNON.Box(new CANNON.Vec3((x1 - x0) / 2, (y1 - y0) / 2, (z1 - z0) / 2)),
    position: new CANNON.Vec3((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), collisionFilterGroup: G_BLOCK, collisionFilterMask: G_TRASH }));
  wall(PIT0 - 1, PIT0, bot, top, PC - hw, PC + hw); wall(PIT1, PIT1 + 1, bot, top, PC - hw, PC + hw); wall(PC - hw, PC + hw, bot, top, PIT1, PIT1 + 1);
  // сторона лавки: на высоте ниши над корзиной стенки нет — туда можно опустить мусор
  wall(PC - hw, WIN.x0, bot, top, PIT0 - 1, PIT0); wall(WIN.x1, PC + hw, bot, top, PIT0 - 1, PIT0);
  wall(WIN.x0, WIN.x1, SHOP.ceil, top, PIT0 - 1, PIT0); wall(WIN.x0, WIN.x1, bot, SHOP.floor, PIT0 - 1, PIT0) }

/* ---------- свет только для мусора (блоки уже нарисованы с тенью) ---------- */
scene.add(new THREE.AmbientLight(0xffffff, AMB * Math.PI));
const fill = new THREE.DirectionalLight(0xffffff, FILL * Math.PI); fill.position.copy(FILL_DIR); scene.add(fill);
const sun = new THREE.DirectionalLight(0xffffff, SUN * Math.PI); sun.castShadow = true;
sun.shadow.mapSize.set(512, 512);                           // крупные «пиксели» тени — в стиле игры и дёшево
Object.assign(sun.shadow.camera, { left: -5.5, right: 5.5, top: 5.5, bottom: -5.5, near: 1, far: 45 }); sun.shadow.camera.updateProjectionMatrix();
sun.shadow.bias = -.002; sun.shadow.normalBias = .02;
scene.add(sun, sun.target);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.BasicShadowMap; renderer.shadowMap.autoUpdate = false;

/* ---------- общие кирпичики для украшений: хеш, склейка квадратов, шейдер шевеления ---------- */
const hr = (a, b, c, d = 0) => { let h = Math.imul(a + 1013, 73856093) ^ Math.imul(b + 2027, 19349663) ^ Math.imul(c + 3037, 83492791) ^ Math.imul(d + 4099, 668265263);
  h = Math.imul(h ^ (h >>> 15), 2246822519); h = Math.imul(h ^ (h >>> 13), 3266489917); return ((h ^ (h >>> 16)) >>> 0) / 4294967296 };
const timeU = { value: 0 }, clipU = { value: -1e9 };            // время для шевеления; ниже clipU — чёрная толща под миром, там украшения прячем
function geoB(ex) { const b = { pos: [], col: [], idx: [], ex: {} }; for (const k in ex) b.ex[k] = { n: ex[k].length, d: ex[k], a: [] }; return b }
function bV(b, p, c, ex) { b.pos.push(p.x, p.y, p.z); b.col.push(c.r, c.g, c.b); for (const k in b.ex) b.ex[k].a.push(...((ex && ex[k]) || b.ex[k].d)); return b.pos.length / 3 - 1 }
function bQuad(b, p, c, ex) { const v = p.map(q => bV(b, q, c, ex)); b.idx.push(v[0], v[1], v[2], v[0], v[2], v[3]) }
const quadPts = (C, U, hU, V, hV) => [C.clone().addScaledVector(U, -hU).addScaledVector(V, -hV), C.clone().addScaledVector(U, hU).addScaledVector(V, -hV), C.clone().addScaledVector(U, hU).addScaledVector(V, hV), C.clone().addScaledVector(U, -hU).addScaledVector(V, hV)];
function bBox(b, F, P, hu, hv, hn, c, ex) {                     // брусок на грани блока: только стороны, которые видит камера
  const { n, u, v } = F;
  bQuad(b, quadPts(P.clone().addScaledVector(n, hn), u, hu, v, hv), c, ex);
  bQuad(b, quadPts(P.clone().addScaledVector(v, hv), n, hn, u, hu), c.clone().multiplyScalar(1.18), ex);
  if (u.dot(VIEW) >= 0) bQuad(b, quadPts(P.clone().addScaledVector(u, hu), v, hv, n, hn), c.clone().multiplyScalar(.74), ex);
  else bQuad(b, quadPts(P.clone().addScaledVector(u, -hu), n, hn, v, hv), c.clone().multiplyScalar(.74), ex);
}
function bGeo(b) { const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(b.col, 3));
  for (const k in b.ex) g.setAttribute(k, new THREE.Float32BufferAttribute(b.ex[k].a, b.ex[k].n));
  g.setIndex(b.idx); g.computeBoundingSphere(); return g }
/* материал украшений: цвет уже в вершинах (свет учтён), лишайник мерцает, черви шевелятся, под мир ничего не вылезает */
function decoMat(kind) {                                        // 'moss' | 'lich' | 'glow' (ореол лишайника) | 'worm' | 'item' (черви в банке)
  const worm = kind === 'worm' || kind === 'item', m = new THREE.MeshBasicMaterial({ vertexColors: true, side: worm ? THREE.DoubleSide : THREE.FrontSide });
  if (kind === 'glow') Object.assign(m, { transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  m.onBeforeCompile = sh => {
    sh.uniforms.uT = timeU; sh.uniforms.uMinY = clipU;
    let head = 'uniform float uT;\nvarying float vWY;\nvarying float vK;\n', bv = 'vK = 1.0;\n', pv = 'vWY = (modelMatrix * vec4(transformed, 1.0)).y;\n';
    if (!worm) { head += 'attribute float al;\n'; pv += 'if (al < 0.5) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);\n' }
    if (kind === 'lich' || kind === 'glow') { head += 'attribute float gw;\nattribute float ph;\n'; bv += 'vK = 1.0 + gw * 0.12 * sin(uT * 1.2 + ph * 6.2832);\n' }
    if (worm) { head += 'attribute vec4 wa;\nattribute vec3 wd;\nattribute vec3 we;\n';
      bv += 'float wp = uT * wa.w + wa.y;\ntransformed += (wd * sin(wp - wa.x * 4.0) + we * 0.6 * cos(wp * 0.73 + 1.3 - wa.x * 3.0)) * wa.z * wa.x;\n' }
    sh.vertexShader = head + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n' + bv).replace('#include <project_vertex>', '#include <project_vertex>\n' + pv);
    sh.fragmentShader = 'uniform float uMinY;\nvarying float vWY;\nvarying float vK;\n' + sh.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n' + (kind !== 'item' ? 'if (vWY < uMinY) discard;\n' : '') + 'diffuseColor.rgb *= vK;');
  };
  m.customProgramCacheKey = () => 'deco-' + kind;
  return m;
}
/* червяк: изогнутая трубка из колец — растёт из основания и свисает; шевелится в шейдере (атрибуты wa/wd/we) */
const PINK = new THREE.Color(0xe58ca0), PINK_D = new THREE.Color(0xb65a72), PINK_L = new THREE.Color(0xf6bac6);
function addWorm(b, P0, out, down, len, ph, amp, spd, w0 = .012) {
  const S = 5, pts = [], A = new THREE.Vector3().crossVectors(out, down).normalize();
  for (let s = 0; s <= S; s++) { const u = s / S; pts.push(P0.clone().addScaledVector(out, len * u * (1 - .3 * u)).addScaledVector(down, len * .6 * u * u)) }
  const ring = pts.map((P, s) => { const u = s / S, T = pts[Math.min(S, s + 1)].clone().sub(pts[Math.max(0, s - 1)]).normalize(), B = new THREE.Vector3().crossVectors(T, A).normalize(), r = w0 * (1 - .45 * u);
    return { c: [[1, 1], [-1, 1], [-1, -1], [1, -1]].map(([x, y]) => P.clone().addScaledVector(A, x * r).addScaledVector(B, y * r)), col: u > .22 && u < .42 ? PINK_D : u > .85 ? PINK_L : PINK,
      ex: { wa: [u, ph, amp, spd], wd: [A.x, A.y, A.z], we: [B.x, B.y, B.z] } } });
  for (let s = 0; s < S; s++) for (let k = 0; k < 4; k++) { const k2 = (k + 1) % 4, sh = k === 2 ? .68 : k === 0 ? 1.08 : .86, r0 = ring[s], r1 = ring[s + 1];
    const v = [bV(b, r0.c[k], r0.col.clone().multiplyScalar(sh), r0.ex), bV(b, r0.c[k2], r0.col.clone().multiplyScalar(sh), r0.ex), bV(b, r1.c[k2], r1.col.clone().multiplyScalar(sh), r1.ex), bV(b, r1.c[k], r1.col.clone().multiplyScalar(sh), r1.ex)];
    b.idx.push(v[0], v[1], v[2], v[0], v[2], v[3]) }
  const t = ring[S], v = t.c.map(p => bV(b, p, PINK_L, t.ex)); b.idx.push(v[0], v[1], v[2], v[0], v[2], v[3]);
}

/* ---------- мусор ---------- */
const M = c => new THREE.MeshLambertMaterial({ color: c, flatShading: true });
const GREY = new THREE.MeshLambertMaterial({ color: 0x8a8f96, flatShading: true });
function part(g, geo, mat, x, y, z, ry = 0, rx = 0, rz = 0) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); g.add(m); return m }
const QZ90 = new CANNON.Quaternion().setFromEuler(0, 0, Math.PI / 2);   // цилиндр физики по оси X
const RUST = [0x8a4b2a, 0xa35a2c, 0x6e3a22];
function pipeMesh(g, len, seed) {                            // синеватая труба с пятнами ржавчины, лежит вдоль X
  const steel = M(0x5f7f9e), inner = M(0x24303c), r = .075;
  part(g, new THREE.CylinderGeometry(r, r, len, 10, 1, true), steel, 0, r, 0, 0, 0, Math.PI / 2);
  for (const s of [-1, 1]) part(g, new THREE.RingGeometry(r * .55, r, 10), inner, s * len / 2, r, 0, s * Math.PI / 2);
  part(g, new THREE.CylinderGeometry(r * .56, r * .56, len - .002, 10, 1, true), new THREE.MeshLambertMaterial({ color: 0x1b232d, side: THREE.BackSide }), 0, r, 0, 0, 0, Math.PI / 2);   // тёмная внутренность трубы
  let q = seed;
  for (let k = 0; k < Math.round(len * 5); k++) { q = (q * 9301 + 49297) % 233280; const t = q / 233280;
    const w = .05 + (k % 3) * .03;
    part(g, new THREE.CylinderGeometry(r * 1.02, r * 1.02, w, 10, 1, true, t * 6.28, 1.6 + (k % 2)), M(RUST[k % 3]), -len / 2 + .06 + (len - .12) * ((k * .37 + t) % 1), r, 0, 0, 0, Math.PI / 2) }
}
// труба для физики — цепочка шариков вдоль оси X: шар со всем остальным сталкивается очень дёшево, а катится как цилиндр
const rod = len => { const n = Math.max(3, Math.ceil(len / .2) + 1); return Array.from({ length: n }, (_, k) => [new CANNON.Sphere(.075), [-len / 2 + .075 + k * (len - .15) / (n - 1), .075, 0]]) };
function tinCan(g, full) {                                     // консервная банка: закатки, выцветшая этикетка, крышка отогнута вверх рваным краем
  const r = .105, h = .15, tin = M(0xaab3ba), rib = M(0x7d868e), lid = M(0xc9d1d7);
  part(g, new THREE.CylinderGeometry(r, r, h, 12, 1, true), tin, 0, h / 2, 0);
  const inn = new THREE.CylinderGeometry(r - .006, r - .006, h - .004, 12, 1, true); inn.scale(-1, 1, 1);
  part(g, inn, M(0x3a3632), 0, h / 2 + .002, 0);
  part(g, new THREE.CylinderGeometry(r, r, .008, 12), tin, 0, .004, 0);
  part(g, new THREE.CylinderGeometry(r + .003, r + .003, .074, 12, 1, true), M(0xb1532f), 0, .072, 0);
  part(g, new THREE.CylinderGeometry(r + .004, r + .004, .016, 12, 1, true), M(0xe0cd96), 0, .072, 0);
  for (const y of [.012, h - .006]) part(g, new THREE.TorusGeometry(r + .001, .007, 4, 12), rib, 0, y, 0, 0, Math.PI / 2);
  const hinge = new THREE.Group(); hinge.position.set(0, h, -r + .012); hinge.rotation.x = -1.95; g.add(hinge);   // крышка на «петле» у дальнего края
  part(hinge, new THREE.CylinderGeometry(r - .01, r - .01, .006, 12), lid, 0, 0, r - .012);
  for (let k = 0; k < 6; k++) { const a = Math.PI * (.18 + .64 * k / 5); part(hinge, new THREE.BoxGeometry(.026, .006, .024), lid, Math.cos(a) * (r - .01), 0, (r - .012) + Math.sin(a) * (r - .006), a + (k % 2 ? .4 : -.3)) }
  if (!full) { part(g, new THREE.CylinderGeometry(r - .008, r - .008, .004, 12), M(0x26231f), 0, .012, 0); return }
  part(g, new THREE.CylinderGeometry(r - .007, r - .009, .03, 12), M(0x3a2415), 0, h - .022, 0);   // земля доверху
  for (let k = 0; k < 5; k++) part(g, new THREE.BoxGeometry(.03, .022, .03), M(k % 2 ? 0x4a2e1a : 0x2e1c10), Math.cos(k * 2.4) * .055, h - .004, Math.sin(k * 2.4) * .055, k);
  const b = geoB({ wa: [0, 0, 0, 0], wd: [0, 0, 0], we: [0, 0, 0] });
  for (let k = 0; k < 5; k++) { const a = k * 2.4 + .5, o = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
    addWorm(b, new THREE.Vector3(o.x * .045, h - .008, o.z * .045), new THREE.Vector3(0, 1, 0).addScaledVector(o, .5).normalize(), o, .08 + (k % 3) * .02, k * 1.7, .018, 4 + k * .7, .011) }
  g.add(new THREE.Mesh(bGeo(b), decoMat('item')));             // черви свешиваются через край и шевелятся
}
/* ---------- новый мусор: бутылки, пакет молока, огромная шина, скелет ---------- */
const ZR = Math.PI / 2, TAU = Math.PI * 2;                     // ZR — поворот на бок: ось предмета вдоль X
const lathe = (prof, seg, a = 0, len = TAU) => new THREE.LatheGeometry(prof.map(([x, y]) => new THREE.Vector2(x, y)), seg, a, len);
/* бутылки большие — длиной почти в клетку: стоя достали бы Кирью до предплечья. Внутри группы b бутылка стоит (дно в 0), сама группа лежит вдоль X */
function bottleBase(g, L, R) { const b = new THREE.Group(); b.position.set(-L / 2, R, 0); b.rotation.z = -ZR; g.add(b); return b }
function beerCan(g) {                                         // высокая пивная банка размером с банку кофе: серебристо-белая спереди, красная сзади, красные пояса, без надписей и марки
  const wh = M(0xeceef0), red = M(0xe0262c), redD = M(0xb3161d), alu = M(0xb9c0c8), dk = M(0x5b636c), R = .105, H = .36;
  part(g, new THREE.CylinderGeometry(R, R, H - .04, 14), [wh, alu, alu], 0, .02 + (H - .04) / 2, 0);
  part(g, new THREE.CylinderGeometry(R + .003, R + .003, H - .05, 14, 1, true, Math.PI * .55, Math.PI * .9), red, 0, .025 + (H - .05) / 2, 0);   // красная спинка
  part(g, new THREE.CylinderGeometry(R + .005, R + .005, .045, 14, 1, true), red, 0, .06, 0);            // красный пояс внизу
  part(g, new THREE.CylinderGeometry(R + .006, R + .006, .012, 14, 1, true), redD, 0, .088, 0);
  part(g, new THREE.CylinderGeometry(R + .005, R + .005, .03, 14, 1, true), red, 0, H - .07, 0);         // и под горлышком
  part(g, new THREE.CylinderGeometry(R * .9, R, .02, 14), alu, 0, .01, 0);                               // донышко
  part(g, new THREE.CylinderGeometry(R * .86, R, .03, 14), alu, 0, H - .025, 0);                         // скос к крышке
  part(g, new THREE.CylinderGeometry(R * .88, R * .88, .012, 14), alu, 0, H - .004, 0);                  // крышка с ободком
  part(g, new THREE.BoxGeometry(.05, .006, .03), dk, .02, H + .004, 0);                                  // ключ-открывашка
  part(g, new THREE.BoxGeometry(.03, .006, .02), M(0x2a2e33), -.03, H + .002, 0);                        // дырочка
}
function glassBottle(g) {                                      // светло-зелёная стеклянная бутылка: бумажная этикетка, длинное горлышко, блики
  const gl = M(0x96e2a2), gd = M(0x5fb672), hl = M(0xf0fff2), lab = M(0xf3e5b6), labR = M(0xd2483a), dk = M(0x1c3a25), L = .98, R = .125, b = bottleBase(g, L, R), hy = R + Math.sqrt(R * R - .0025) + .005;
  part(b, lathe([[0, 0], [R * .88, 0], [R, .03], [R, .53], [R * .95, .59], [R * .76, .65], [R * .52, .7], [R * .4, .745], [R * .37, .9], [R * .48, .91], [R * .48, .955], [R * .3, .965], [0, .965]], 12), gl, 0, 0, 0);
  part(b, new THREE.CylinderGeometry(R + .004, R + .004, .2, 12, 1, true), lab, 0, .3, 0);        // этикетка
  part(b, new THREE.CylinderGeometry(R + .007, R + .007, .04, 12, 1, true), labR, 0, .3, 0);      // красная полоса на этикетке
  part(b, new THREE.CylinderGeometry(R * .5, R * .5, .045, 10, 1, true), gd, 0, .932, 0);         // венчик горлышка потемнее
  part(b, new THREE.CylinderGeometry(R * .3, R * .3, .014, 8), dk, 0, .966, 0);                   // тёмная дырочка горлышка
  part(b, new THREE.CylinderGeometry(R * .93, R * .93, .02, 12), gd, 0, .011, 0);                 // толстое донышко
  part(g, new THREE.BoxGeometry(.17, .014, .03), hl, -.385, hy, .05);                             // блики сверху на боку и на горлышке
  part(g, new THREE.BoxGeometry(.1, .014, .026), hl, -.025, hy, .05);
  part(g, new THREE.BoxGeometry(.12, .012, .02), hl, .33, R + R * .37 + .004, .01);
}
function milkCarton(g) {                                       // картонный пакет молока: белый, синяя полоса, двускатный верх с гребнем
  const wh = M(0xe9e5da), bl = M(0x4f86c6), bl2 = M(0x2e5f9e), w = .13, h = .22;
  part(g, new THREE.BoxGeometry(w, h, w), wh, 0, h / 2, 0);
  part(g, new THREE.BoxGeometry(w + .004, .08, w + .004), bl, 0, .07, 0);
  part(g, new THREE.BoxGeometry(w + .006, .014, w + .006), bl2, 0, .115, 0);
  for (const s of [-1, 1]) part(g, new THREE.BoxGeometry(w, .01, .087), wh, 0, h + .0285, s * .0325, 0, s * .72);   // скаты
  part(g, new THREE.BoxGeometry(w, .028, .012), wh, 0, h + .07, 0);                            // гребень
  part(g, new THREE.BoxGeometry(.04, .04, .004), bl, w * .22, .165, w / 2 + .003);              // кружок на боку
}
/* огромная шина с тракторным протектором «ёлочкой»; лежит плашмя на 2×2 клетки. Лом рубит её пополам, половинки — ещё пополам.
   Кусок шины — дуга от угла a0 до a1 (угол a — точка (cos a, sin a) в плоскости XZ), у куска на срезах видна полость и стальной корд */
const TIRE = { R: .93, Rin: .46, H: .52 };
function tireArc(g, a0, a1) {
  const rub = M(0x25262a), lug = M(0x34353a), side = M(0x2e2f34), mud = M(0x4e3b29), cut = M(0x4a4b52), hole = M(0x0b0b0e), steel = M(0xc8ced6);
  const { R, Rin, H } = TIRE, span = a1 - a0, full = span > TAU - 1e-6, inA = a => full || (a > a0 + .07 && a < a1 - .07), seg = k => Math.max(3, Math.round(k * span / TAU));
  const prof = [[Rin, .05], [Rin + .05, 0], [R - .07, 0], [R, .07], [R, H - .07], [R - .07, H], [Rin + .05, H], [Rin, H - .05], [Rin, .05]];
  part(g, lathe(prof, seg(28), Math.PI / 2 - a1, span), rub, 0, 0, 0);
  for (let k = 0; k < 22; k++) for (const s of [-1, 1]) { const a = (k + (s > 0 ? .5 : 0)) / 22 * TAU; if (!inA(a)) continue;   // грунтозацепы
    const l = new THREE.Group(); l.position.set(Math.cos(a) * (R + .02), H / 2 + s * .12, Math.sin(a) * (R + .02)); l.rotation.y = -a; g.add(l);
    part(l, new THREE.BoxGeometry(.06, .25, .09), lug, 0, 0, 0, 0, s * .75, 0) }
  const ring = new THREE.TorusGeometry((R + Rin) / 2, .025, 4, seg(28), span); ring.rotateX(ZR); ring.rotateY(-a0);
  part(g, ring, side, 0, H, 0);                                // выпуклое кольцо на боковине
  for (let k = 0; k < 14; k++) { const a = k / 14 * TAU; if (inA(a)) part(g, new THREE.BoxGeometry(.16, .025, .035), side, Math.cos(a) * .58, H + .005, Math.sin(a) * .58, -a) }
  for (let k = 0; k < 6; k++) { const a = (k * 1.7 + .4) % TAU; if (inA(a)) part(g, new THREE.BoxGeometry(.14, .02, .1), mud, Math.cos(a) * .7, H + .008, Math.sin(a) * .7, -a + .3) }   // налипшая земля
  if (full) return;
  const inner = [[Rin + .07, .1], [R - .1, .08], [R - .06, .12], [R - .06, H - .12], [R - .1, H - .08], [Rin + .07, H - .1]], up = new THREE.Vector3(0, 1, 0);
  for (const [a, e] of [[a0, -1], [a1, 1]]) {                  // срез: резина посветлее, внутри темнота полой шины, торчит стальной корд
    const rad = new THREE.Vector3(Math.cos(a), 0, Math.sin(a)), tan = new THREE.Vector3(-Math.sin(a), 0, Math.cos(a)).multiplyScalar(e);
    const basis = e > 0 ? new THREE.Matrix4().makeBasis(rad, up, tan) : new THREE.Matrix4().makeBasis(up, rad, tan);   // грань среза смотрит наружу, вдоль tan
    for (const [pts, mat, off] of [[prof.slice(0, -1), cut, .002], [inner, hole, .005]]) {
      const geo = new THREE.ShapeGeometry(new THREE.Shape(pts.map(([r, y]) => e > 0 ? new THREE.Vector2(r, y) : new THREE.Vector2(y, r))));
      geo.applyMatrix4(basis); geo.translate(tan.x * off, 0, tan.z * off); part(g, geo, mat, 0, 0, 0) }
    for (const [y, dr] of [[.15, .03], [.26, .045], [.37, .03]]) part(g, new THREE.BoxGeometry(.016, .016, .08), steel, rad.x * (R - dr) + tan.x * .035, y, rad.z * (R - dr) + tan.z * .035, Math.atan2(tan.x, tan.z));
  }
}
const tireShapes = (a0, a1) => { const n = Math.max(2, Math.round(14 * (a1 - a0) / TAU));   // физика шины — шары по кольцу
  return Array.from({ length: n }, (_, k) => { const a = a0 + (k + .5) / n * (a1 - a0); return [new CANNON.Sphere(.25), [Math.cos(a) * .7, .26, Math.sin(a) * .7]] }) };
const TIRE_CHIPS = ['#25262a', '#4a4b52', '#4e3b29', '#c8ced6'];
/* скелет Егора Филатова лежит на спине вдоль X, огромный череп у −x. Кости толстые, с шишками-мыщелками на концах.
   Три части — каждая сама по себе предмет: лом разбирает скелет на них */
const BONE = () => M(0xe9e0c6), BONE_D = () => M(0xc4b692), BHOLE = () => M(0x17110c), TOOTH = () => M(0xf8f3e3), UP = new THREE.Vector3(0, 1, 0);
function bone(g, a, b, r, mat, knob = 1.3) {                   // кость от точки a до b; knob — размер шишек на концах (0 — без них)
  const A = new THREE.Vector3(...a), Bv = new THREE.Vector3(...b), d = Bv.clone().sub(A), len = d.length(); d.normalize();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.08, len, 7), mat); m.position.copy(A).add(Bv).multiplyScalar(.5); m.quaternion.setFromUnitVectors(UP, d); g.add(m);
  if (!knob) return;
  const sd = new THREE.Vector3().crossVectors(d, UP); if (sd.lengthSq() < 1e-4) sd.set(1, 0, 0); sd.normalize();
  for (const [p, k] of [[A, 1], [Bv, -1]]) for (const s of [-1, 1]) { const n = new THREE.Mesh(new THREE.SphereGeometry(r * knob, 7, 5), mat);
    n.position.copy(p).addScaledVector(sd, s * r * .7).addScaledVector(d, k * r * .3); g.add(n) }
}
function skullPart(g) {                                        // аномально большой череп: лежит затылком вниз, лицом вверх, подбородком к телу (+x)
  const B = BONE(), S = BONE_D(), D = BHOLE(), T = TOOTH();
  const cr = new THREE.SphereGeometry(.27, 12, 9); cr.scale(1.05, .78, 1); part(g, cr, B, -.07, .22, 0);   // свод
  part(g, new THREE.BoxGeometry(.28, .3, .46), B, .08, .25, 0);                                  // плоское лицо смотрит вверх
  part(g, new THREE.BoxGeometry(.07, .05, .5), S, -.03, .415, 0);                                // тяжёлая надбровная дуга
  for (const s of [-1, 1]) {
    part(g, new THREE.BoxGeometry(.15, .022, .16), D, .075, .405, s * .125);                       // огромные пустые глазницы
    part(g, new THREE.BoxGeometry(.13, .1, .07), S, .1, .33, s * .245);                         // скулы торчат вбок
    part(g, new THREE.BoxGeometry(.26, .09, .05), S, .2, .2, s * .19);                          // ветви челюсти
  }
  part(g, new THREE.CylinderGeometry(.055, .055, .022, 3), D, .18, .405, 0, -ZR);                 // носовая дыра — треугольник остриём к глазам
  part(g, new THREE.BoxGeometry(.05, .12, .34), D, .235, .33, 0);                                 // темнота рта за зубами
  part(g, new THREE.BoxGeometry(.1, .03, .32), D, .28, .25, 0);
  for (let k = 0; k < 6; k++) part(g, new THREE.BoxGeometry(.055, .085, .045), T, .245, .355, -.1375 + k * .055);   // верхние зубы
  part(g, new THREE.BoxGeometry(.09, .13, .36), S, .335, .2, 0);                                  // нижняя челюсть отвисла — рот открыт
  for (let k = 0; k < 5; k++) part(g, new THREE.BoxGeometry(.05, .06, .045), T, .31, .29, -.11 + k * .055);         // нижние зубы
  part(g, new THREE.BoxGeometry(.1, .016, .018), D, -.2, .405, .12, .6); part(g, new THREE.BoxGeometry(.08, .016, .018), D, -.13, .41, .075, -.5);   // трещина
}
function chestPart(g) {                                        // позвоночник, рёбра бочкой, грудина, ключицы и руки вдоль тела
  const B = BONE(), S = BONE_D();
  for (let k = 0; k < 6; k++) { const x = -.27 + k * .085; part(g, new THREE.BoxGeometry(.06, .07, .1), k % 2 ? S : B, x, .045, 0); part(g, new THREE.BoxGeometry(.03, .035, .2), S, x, .04, 0) }
  for (let k = 0; k < 5; k++) for (const s of [-1, 1]) { const t = new THREE.TorusGeometry(.15, .032, 5, 9, Math.PI); t.rotateZ(-ZR); t.rotateY(-s * ZR); t.scale(1, 1, 1.4); part(g, t, k % 2 ? S : B, -.2 + k * .08, .2, 0) }
  part(g, new THREE.BoxGeometry(.32, .05, .08), B, -.07, .385, 0);                               // грудина
  for (const s of [-1, 1]) {
    bone(g, [-.26, .33, s * .05], [-.29, .16, s * .29], .028, B, 0);                             // ключица
    part(g, new THREE.SphereGeometry(.06, 7, 5), B, -.28, .09, s * .33);                         // плечевой сустав
    bone(g, [-.26, .065, s * .34], [0, .06, s * .35], .042, B);                                   // плечевая кость
    bone(g, [.03, .05, s * .32], [.24, .045, s * .32], .03, S); bone(g, [.03, .045, s * .375], [.24, .04, s * .37], .022, B);   // лучевая и локтевая
    part(g, new THREE.BoxGeometry(.08, .035, .11), B, .29, .03, s * .345);                       // кисть
    for (let f = 0; f < 4; f++) part(g, new THREE.BoxGeometry(.08, .028, .022), S, .365, .025, s * (.305 + f * .027)) }
}
function legsPart(g) {                                         // таз и толстые ноги, стопы торчат пальцами вверх
  const B = BONE(), S = BONE_D(), D = BHOLE();
  part(g, new THREE.BoxGeometry(.1, .07, .11), S, .03, .05, 0);                                   // крестец
  for (const s of [-1, 1]) { const w = new THREE.SphereGeometry(.1, 8, 6); w.scale(.8, .55, 1.2); part(g, w, B, .07, .085, s * .11) }   // крылья таза
  part(g, new THREE.BoxGeometry(.06, .06, .22), S, .17, .065, 0);
  for (const s of [-1, 1]) {
    part(g, new THREE.BoxGeometry(.045, .012, .05), D, .17, .1, s * .06);                        // дыры в тазу
    bone(g, [.13, .06, s * .13], [.42, .06, s * .13], .052, B);                                   // бедренная кость
    part(g, new THREE.SphereGeometry(.045, 6, 5), B, .44, .115, s * .13);                        // коленная чашечка
    bone(g, [.46, .055, s * .12], [.66, .05, s * .12], .042, B); bone(g, [.47, .045, s * .19], [.65, .045, s * .19], .022, S);   // голень
    part(g, new THREE.BoxGeometry(.08, .07, .1), B, .69, .045, s * .13);                         // пятка
    part(g, new THREE.BoxGeometry(.07, .16, .1), S, .7, .15, s * .13);                           // стопа вверх
    for (let f = 0; f < 4; f++) part(g, new THREE.BoxGeometry(.035, .055, .022), B, .7, .255, s * (.093 + f * .025)) }
}
const SKEL = { skull: [-.62, skullPart, [-1, 0, 0]], skelChest: [.06, chestPart, [-.25, 0, 0]], skelLegs: [.25, legsPart, [1, 0, 0]] };   // где часть лежит в целом скелете и куда отлетает
const SKEL_SHAPES = {
  skull: () => [[new CANNON.Box(new CANNON.Vec3(.325, .21, .27)), [-.025, .21, 0]]],
  skelChest: () => [[new CANNON.Box(new CANNON.Vec3(.235, .2, .26)), [-.065, .2, 0]], ...[-1, 1].map(s => [new CANNON.Box(new CANNON.Vec3(.34, .05, .065)), [.04, .05, s * .345]])],
  skelLegs: () => [[new CANNON.Box(new CANNON.Vec3(.37, .07, .2)), [.35, .07, 0]], [new CANNON.Box(new CANNON.Vec3(.05, .14, .18)), [.7, .14, 0]]],
};
const BOTTLE_SH = R => () => [[new CANNON.Cylinder(R, R, .56, 10), [-.21, R, 0], QZ90], [new CANNON.Cylinder(R * .55, R * .55, .42, 8), [.28, R, 0], QZ90]];
const TYPES = {
  coffee: { name: 'Банка кофе', size: 1, mass: 1,
    build(g) { const red = M(0xa8383a), band = M(0xe8d3a0), lid = M(0xc9d3dc);
      part(g, new THREE.CylinderGeometry(.15, .15, .3, 10), [red, lid, lid], 0, .15, 0);
      part(g, new THREE.CylinderGeometry(.153, .153, .09, 10, 1, true), band, 0, .15, 0) },
    shapes: () => [[new CANNON.Cylinder(.15, .15, .3, 10), [0, .15, 0]]] },
  pipe: { name: 'Ржавая труба', size: 2, mass: 2, breaks: true, pieces: [['pipeHalf', [-.43, 0, 0]], ['pipeHalf', [.43, 0, 0]]],
    build(g) { pipeMesh(g, 1.7, 17) },
    shapes: () => rod(1.7) },
  lantern: { name: 'Фонарь', size: 1, mass: .8, light: 15,
    build(g) { const metal = M(0x2b2f36), glass = new THREE.MeshBasicMaterial({ color: 0xffd27a }); glass.userData.glow = true;
      part(g, new THREE.BoxGeometry(.2, .04, .2), metal, 0, .02, 0);
      part(g, new THREE.BoxGeometry(.14, .17, .14), glass, 0, .125, 0);
      for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) part(g, new THREE.BoxGeometry(.03, .19, .03), metal, x * .075, .125, z * .075);
      part(g, new THREE.BoxGeometry(.2, .04, .2), metal, 0, .23, 0);
      part(g, new THREE.ConeGeometry(.1, .07, 4), metal, 0, .285, 0, Math.PI / 4);
      part(g, new THREE.TorusGeometry(.055, .012, 4, 8, Math.PI), metal, 0, .31, 0) },
    shapes: () => [[new CANNON.Box(new CANNON.Vec3(.1, .16, .1)), [0, .16, 0]]] },
  tin: { name: 'Консервная банка', size: 1, mass: .6,
    build(g) { tinCan(g, false) },
    shapes: () => [[new CANNON.Cylinder(.105, .105, .15, 8), [0, .075, 0]]] },
  wormTin: { name: 'Банка с червями', size: 1, mass: .7,
    build(g) { tinCan(g, true) },
    shapes: () => [[new CANNON.Cylinder(.105, .105, .15, 8), [0, .075, 0]]] },
  pipeHalf: { name: 'Половина трубы', size: 1, mass: 1,
    build(g) { pipeMesh(g, .82, 5) },
    shapes: () => rod(.82) },
  beer: { name: 'Банка пива', size: 1, mass: .5,
    build(g) { beerCan(g) },
    shapes: () => [[new CANNON.Cylinder(.105, .105, .36, 10), [0, .18, 0]]] },
  glass: { name: 'Зелёная бутылка', size: 1, mass: .8,
    build(g) { const s = new THREE.Group(); s.scale.setScalar(.9); g.add(s); glassBottle(s) },   // на 10% меньше исходной
    shapes: () => [[new CANNON.Cylinder(.1125, .1125, .504, 10), [-.189, .1125, 0], QZ90], [new CANNON.Cylinder(.062, .062, .378, 8), [.252, .1125, 0], QZ90]] },
  milk: { name: 'Пакет молока', size: 1, mass: .4,
    build(g) { milkCarton(g) },
    shapes: () => [[new CANNON.Box(new CANNON.Vec3(.065, .14, .065)), [0, .14, 0]]] },
  tire: { name: 'Огромная шина', size: 4, mass: 10, heavy: 'Слишком тяжёлая — даже не сдвинуть. Разруби ломом', breaks: true, brokeMsg: 'Шина разрублена пополам', chips: TIRE_CHIPS,
    pieces: [['tireHalf', [0, 0, 0], 0, [0, 0, 1]], ['tireHalf', [0, 0, 0], Math.PI, [0, 0, -1]]],
    build(g) { tireArc(g, 0, TAU) },
    shapes: () => tireShapes(0, TAU) },
  tireHalf: { name: 'Половина шины', size: 2, mass: 5, heavy: 'Всё ещё тяжело — разруби ещё раз', breaks: true, brokeMsg: 'Половина шины разрублена', chips: TIRE_CHIPS,
    pieces: [['tireQuarter', [0, 0, 0], 0, [.7, 0, .7]], ['tireQuarter', [0, 0, 0], -ZR, [-.7, 0, .7]]],
    build(g) { tireArc(g, 0, Math.PI) },
    shapes: () => tireShapes(0, Math.PI) },
  tireQuarter: { name: 'Кусок шины', size: 1, mass: 2,
    build(g) { tireArc(g, 0, ZR) },
    shapes: () => tireShapes(0, ZR) },
  skeleton: { name: 'Скелет Егора Филатова', size: 2, mass: 3, breaks: true, brokeMsg: 'Егор Филатов разобран на части', chips: ['#e9e0c6', '#c4b692', '#8c8170'],
    pieces: Object.entries(SKEL).map(([k, [ox, , push]]) => [k, [ox, 0, 0], 0, push]),
    build(g) { for (const [ox, fn] of Object.values(SKEL)) { const p = new THREE.Group(); p.position.x = ox; g.add(p); fn(p) } },
    shapes: () => Object.entries(SKEL_SHAPES).flatMap(([k, f]) => f().map(([sh, o]) => [sh, [o[0] + SKEL[k][0], o[1], o[2]]])) },
  skull: { name: 'Череп Егора Филатова', size: 1, mass: 1, build(g) { skullPart(g) }, shapes: SKEL_SHAPES.skull },
  skelChest: { name: 'Рёбра Егора Филатова', size: 1, mass: 1.1, build(g) { chestPart(g) }, shapes: SKEL_SHAPES.skelChest },
  skelLegs: { name: 'Ноги Егора Филатова', size: 1, mass: 1, build(g) { legsPart(g) }, shapes: SKEL_SHAPES.skelLegs },
};
const trash = [];
const rnd = (a, b) => a + Math.random() * (b - a);
/* все обычные детали предмета — в один меш с цветами вершин (светящиеся и двусторонние детали остаются отдельными) */
function mergeParts(g) {
  g.updateMatrixWorld(true); const pos = [], nrm = [], col = [], parts = [];
  g.traverse(o => { if (!o.isMesh) return; const ms = Array.isArray(o.material) ? o.material : [o.material];
    if (ms.some(m => m.userData.glow || m.side !== THREE.FrontSide || !m.isMeshLambertMaterial)) return; parts.push(o) });
  if (parts.length < 2) return;
  const inv = g.matrixWorld.clone().invert();                 // координаты деталей — относительно самой группы
  for (const o of parts) { const geo = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(); geo.applyMatrix4(inv.clone().multiply(o.matrixWorld));
    const p = geo.attributes.position.array, n = geo.attributes.normal.array, ms = Array.isArray(o.material) ? o.material : [o.material];
    const grp = geo.groups.length ? geo.groups : [{ start: 0, count: p.length / 3, materialIndex: 0 }];
    for (const gr of grp) { const c = (Array.isArray(o.material) ? ms[gr.materialIndex || 0] : ms[0]).color;
      for (let v = gr.start; v < gr.start + gr.count; v++) { pos.push(p[v * 3], p[v * 3 + 1], p[v * 3 + 2]); nrm.push(n[v * 3], n[v * 3 + 1], n[v * 3 + 2]); col.push(c.r, c.g, c.b) } }
    o.parent.remove(o) }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.add(new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true })));
}
function makeTrash(type, x, y, z, ry, layer) {
  const g = new THREE.Group(); TYPES[type].build(g); mergeParts(g);
  g.position.set(x, y, z); g.rotation.y = ry; scene.add(g); g.updateMatrixWorld(true);
  const colors = new Map(); g.traverse(o => { if (o.isMesh) colors.set(o, o.material) });
  const t = { type, layer, g, colors, cells: [], active: false, body: null, held: false };
  g.traverse(o => { if (o.isMesh) { o.userData.t = t; o.castShadow = o.receiveShadow = true } });
  trash.push(t); return t;
}
function genTrash() {
  const cellOk = (i, j, z) => code(i, j, z) !== '.', pick = () => PIT0 + (Math.random() * (PIT1 - PIT0) | 0);
  const place = (type, z) => {
    let x, zz, ry;
    if (type === 'tire') { const a = PIT0 + (Math.random() * (PIT1 - PIT0 - 1) | 0), b = PIT0 + (Math.random() * (PIT1 - PIT0 - 1) | 0);   // 2×2 клетки
      if (![[0, 0], [1, 0], [0, 1], [1, 1]].every(([p, q]) => cellOk(a + p, b + q, z))) return false; x = a + 1; zz = b + 1; ry = rnd(0, 6.28) }
    else if (type === 'pipe' || type === 'skeleton') { const along = Math.random() < .5, a = PIT0 + (Math.random() * (PIT1 - PIT0 - 1) | 0), b = pick(), flip = Math.random() < .5 ? Math.PI : 0;
      if (along) { if (!cellOk(a, b, z) || !cellOk(a + 1, b, z)) return false; x = a + 1; zz = b + .5; ry = flip }
      else { if (!cellOk(b, a, z) || !cellOk(b, a + 1, z)) return false; x = b + .5; zz = a + 1; ry = Math.PI / 2 + flip } }
    else if (type === 'glass') { const [i, j] = ACT[Math.random() * ACT.length | 0]; if (!cellOk(i, j, z)) return false; x = i + .5; zz = j + .5; ry = (Math.random() * 4 | 0) * ZR + rnd(-.1, .1) }   // длинная бутылка — вдоль клетки
    else { const [i, j] = ACT[Math.random() * ACT.length | 0]; if (!cellOk(i, j, z)) return false; x = i + .5 + rnd(-.15, .15); zz = j + .5 + rnd(-.15, .15); ry = rnd(0, 6.28) }
    const t = makeTrash(type, x, -(z + 1) * BH + .01, zz, ry, z); t.g.visible = false;
    const cells = new Set();                                     // какие клетки ямы задевает предмет
    t.g.traverse(o => { if (!o.isMesh) return; const bb = new THREE.Box3().setFromObject(o, true);
      for (let a = 0; a < ACT.length; a++) { const [i, j] = ACT[a]; if (bb.max.x > i + .03 && bb.min.x < i + .97 && bb.max.z > j + .03 && bb.min.z < j + .97) cells.add(a) } });
    t.cells = [...cells]; return true;
  };
  for (let z = 1; z < DIG; z++) for (let n = 0; n < 2; n++) {    // на слой — до двух предметов, каждый с шансом 60%
    if (Math.random() >= .6) continue;
    const r = Math.random(); place(r < .26 ? 'coffee' : r < .46 ? 'tin' : r < .58 ? 'beer' : r < .68 ? 'glass' : r < .78 ? 'milk' : 'pipe', z);
  }
  for (let k = 0, z = 5 + (Math.random() * 9 | 0); k < 6 && !place('tire', z); k++, z++);        // огромная шина — одна на участок
  for (let k = 0, z = 9 + (Math.random() * 9 | 0); k < 6 && !place('skeleton', z); k++, z = Math.min(DIG - 1, z + 1));   // скелет — тоже один, поглубже
}
function setGrey(t, on) { if (!t.grey) t.grey = GREY.clone(); t.g.traverse(o => { if (o.isMesh) o.material = on ? t.grey : t.colors.get(o) }) }
function updateTrash() {
  for (const t of trash) {
    if (t.active) continue;
    const dug = t.cells.filter(a => d[a] > t.layer).length;
    t.g.visible = dug > 0;
    if (dug > 0 && dug < t.cells.length) setGrey(t, true);
    if (dug === t.cells.length) { activate(t); const c = t.g.position; burst(c.x, c.y + .2, c.z, ['#fff6c8', '#f2c14e', '#ffffff'], 18, .6); toast('Найдено: ' + TYPES[t.type].name); haptic('medium') }
  }
  for (const t of trash) if (t.body) t.body.wakeUp();          // убрали блок — пусть всё, что на нём лежало, проверит опору
}
function activate(t) {
  t.active = true; t.g.visible = true; setGrey(t, false);
  // габариты предмета в его собственных осях; центр масс ставим ровно в середину предмета —
  // раньше он был у дна, и упавшая на бок банка сама вставала, как неваляшка
  t.g.updateMatrixWorld(true);
  const inv = t.g.matrixWorld.clone().invert(), bb = new THREE.Box3();
  t.g.traverse(o => { if (o.isMesh) { o.geometry.computeBoundingBox(); bb.union(o.geometry.boundingBox.clone().applyMatrix4(inv.clone().multiply(o.matrixWorld))) } });
  const c = bb.getCenter(new THREE.Vector3()); t.com = c; t.local = bb.translate(c.clone().negate());
  // умеренное торможение: предмет не «липнет» к стенкам и не застывает в наклоне
  const body = new CANNON.Body({ mass: TYPES[t.type].mass, collisionFilterGroup: G_TRASH, collisionFilterMask: G_BLOCK | G_CHAR, linearDamping: .3, angularDamping: .45 });
  for (const [s, o, q] of TYPES[t.type].shapes()) body.addShape(s, new CANNON.Vec3(o[0] - c.x, o[1] - c.y, o[2] - c.z), q);
  const wc = c.clone().applyQuaternion(t.g.quaternion).add(t.g.position);
  body.position.set(wc.x, wc.y, wc.z);
  body.quaternion.set(t.g.quaternion.x, t.g.quaternion.y, t.g.quaternion.z, t.g.quaternion.w);
  body.sleepSpeedLimit = .12; body.sleepTimeLimit = .5;
  world.addBody(body); t.body = body;
  if (charHits(t)) { body.collisionFilterMask = G_BLOCK; t.ghost = true }
}
/* ---------- освещение по блокам (как в Minecraft) ----------
   в каждой клетке мира хранится уровень света 0..15. Небо светит сверху и слабеет с глубиной — ниже SKY_D слоёв полный мрак.
   фонарь — источник 15, свет теряет LA за клетку воздуха, а в толщу земли уходит с потерей LS за блок.
   грани блоков красятся по вершинам: каждая вершина берёт среднее из четырёх клеток перед гранью — получаются мягкие переходы */
const SKY_D = 7, LA = 4, LS = 4, NL = BOT + 3;            // слои -1..BOT+1
const LG = new Float32Array(N * N * NL);
const OUTL = new Float32Array(2 * NL * N);                   // свет лишайника на внешнем срезе (там клетки вне сетки)
const li = (i, j, z) => (z + 1) * N * N + j * N + i;
const solidAt = (i, j, z) => z >= 0 && (z > BOT || hasB(i, j, z));
const skyAt = z => 15 * Math.max(0, Math.min(1, 1 - (z + 1) / SKY_D));
function Lget(i, j, z) {
  if (z < 0) return 15; if (z > BOT + 1) return 0;
  if (i < 0 || j < 0) return 0;                               // за задними стенками ничего не видно
  if (i >= N || j >= N) return Math.max(skyAt(z), LG[li(Math.min(i, N - 1), Math.min(j, N - 1), z)], i >= N && j < N ? OUTL[(z + 1) * N + j] : j >= N && i < N ? OUTL[NL * N + (z + 1) * N + i] : 0);   // открытый срез участка
  return LG[li(i, j, z)];
}
const brOf = l => Math.pow(Math.max(0, Math.min(15, l)) / 15, 2);   // уровень -> яркость (в линейном цвете)
function lightSources() {
  const out = [];
  for (const t of trash) { const L = TYPES[t.type].light; if (!L || !t.active || !t.body) continue;
    if (t.held) { out.push([Math.floor(CH.x), Math.floor(CH.z), Math.floor(-(CH.y + .9) / BH), L]); continue }   // в руках — светит там, где стоит Кирью
    const p = t.body.position; out.push([Math.floor(p.x), Math.floor(p.z), Math.floor(-(p.y + .05) / BH), L]) }
  out.push([Math.floor(SHOP.lamp.x), Math.floor(SHOP.lamp.z), Math.floor(-SHOP.lamp.y / BH), 15]);   // фонарь в лавке (видно через открытый бок)
  return out;
}
function computeLight(src) {
  LG.fill(0); const q = [];
  const push = (i, j, z, v) => { const k = li(i, j, z); if (v > LG[k] + .01) { LG[k] = v; q.push(i, j, z) } };
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) for (let z = -1; z <= BOT + 1 && !solidAt(i, j, z); z++) push(i, j, z, skyAt(z));   // небо в открытых колодцах
  decoLight(push, OUTL);                                      // светящийся лишайник
  for (const [i0, j0, z0, L] of src) {                      // источник не должен «гаснуть» в стене или за краем: ищем ближайший воздух
    let i = Math.max(0, Math.min(N - 1, i0)), j = Math.max(0, Math.min(N - 1, j0)), z = Math.max(-1, Math.min(BOT, z0));
    if (solidAt(i, j, z)) { const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([a, b]) => [i + a, j + b]).find(([a, b]) => a >= 0 && b >= 0 && a < N && b < N && !solidAt(a, b, z));
      if (nb) [i, j] = nb; else while (z > -1 && solidAt(i, j, z)) z-- }
    push(i, j, z, L) }
  for (let h = 0; h < q.length; h += 3) {
    const i = q[h], j = q[h + 1], z = q[h + 2], v = LG[li(i, j, z)], sol = solidAt(i, j, z);
    for (const [a, b, c] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
      const ni = i + a, nj = j + b, nz = z + c; if (ni < 0 || nj < 0 || ni >= N || nj >= N || nz < -1 || nz > BOT + 1) continue;
      const ns = solidAt(ni, nj, nz);
      if (sol && !ns) continue;                               // свет не выходит из земли обратно в воздух
      push(ni, nj, nz, v - (sol ? LS : ns ? 0 : LA)) }        // грань блока освещена воздухом перед ней
  }
}
// грани BoxGeometry: +x, -x, +y, -y, +z, -z; ось y мира — это слои наоборот
const FACE_AX = [[0, 1], [0, -1], [1, 1], [1, -1], [2, 1], [2, -1]];
function shadeChunk(ch) {                                   // цвет вершины = свет перед гранью (среднее 4 клеток) × поправка грани
  const col = ch.mesh.geometry.attributes.color, arr = col.array; let changed = false;
  ch.faces.forEach((fc, n) => { const [ax, sg] = FACE_AX[fc.f];
    const dl = [0, 0, 0]; dl[ax === 0 ? 0 : ax === 2 ? 1 : 2] = ax === 1 ? -sg : sg;
    const fi = fc.i + dl[0], fj = fc.j + dl[1], fz = fc.z + dl[2];
    for (let q = 0; q < 4; q++) { const v = n * 4 + q, px = fc.p[q * 3], py = fc.p[q * 3 + 1], pz = fc.p[q * 3 + 2];
      const su = [px > 0 ? 1 : -1, pz > 0 ? 1 : -1, py > 0 ? -1 : 1];
      const s0 = ax === 0 ? [0, su[1], su[2]] : ax === 1 ? [su[0], su[1], 0] : [su[0], 0, su[2]];
      const A = [s0[0], 0, 0], B = [0, s0[1], 0], C = [0, 0, s0[2]];
      const t1 = ax === 0 ? B : A, t2 = ax === 1 ? B : C;
      const l = (Lget(fi, fj, fz) + Lget(fi + t1[0], fj + t1[1], fz + t1[2]) + Lget(fi + t2[0], fj + t2[1], fz + t2[2]) + Lget(fi + t1[0] + t2[0], fj + t1[1] + t2[1], fz + t1[2] + t2[2])) / 4;
      const br = brOf(l) * FACE_K[fc.f];
      if (Math.abs(arr[v * 3] - br) > .002) { arr[v * 3] = arr[v * 3 + 1] = arr[v * 3 + 2] = br; changed = true } } });
  if (changed) col.needsUpdate = true;
}
function setHighlight(set) {                                 // подсветить блоки из набора "i,j,z"
  const key = [...set].sort().join(';');
  for (const ch of chunks) { if (!ch) continue; const mine = ch.faces.some(f => set.has(f.key));
    if (!mine && !ch.hlKey) continue; const k = mine ? key : ''; if (k === ch.hlKey) continue; ch.hlKey = k;
    const at = ch.mesh.geometry.attributes.hl; ch.faces.forEach((f, n) => at.array.fill(set.has(f.key) ? 1 : 0, n * 4, n * 4 + 4)); at.needsUpdate = true }
}
function lightAt(x, y, z) {                                  // плавная яркость в точке мира (для мусора, персонажа, частиц)
  const gi = x - .5, gj = z - .5, gz = -y / BH - .5, i0 = Math.floor(gi), j0 = Math.floor(gj), z0 = Math.floor(gz), fx = gi - i0, fy = gj - j0, fz = gz - z0;
  let l = 0;
  for (const [a, wa] of [[0, 1 - fx], [1, fx]]) for (const [b, wb] of [[0, 1 - fy], [1, fy]]) for (const [c, wc] of [[0, 1 - fz], [1, fz]]) {
    const ii = i0 + a, jj = j0 + b, zz = z0 + c;
    l += wa * wb * wc * (solidAt(ii, jj, zz) && ii >= 0 && jj >= 0 && ii < N && jj < N ? Lget(ii, jj, zz) * .7 : Lget(ii, jj, zz)) }
  return brOf(l);
}
function dimGroup(o, br, store) {                            // умножаем цвета материалов на яркость (светящиеся части не трогаем)
  o.traverse(m => { if (!m.isMesh) return; for (const mat of Array.isArray(m.material) ? m.material : [m.material]) {
    if (!mat || !mat.color || mat.userData.glow) continue;
    if (!store.has(mat)) store.set(mat, mat.color.clone());
    mat.color.copy(store.get(mat)).multiplyScalar(br) } });
}
let lightKey = '';
const chBase = new Map();
function updateLight() {
  const src = lightSources(), key = JSON.stringify(src);
  for (const z of chunkDirty) buildChunk(z);
  if (lightDirty || key !== lightKey || chunkDirty.size) { lightDirty = false; lightKey = key; perf.lightN++; computeLight(src); for (const ch of chunks) if (ch) shadeChunk(ch); shadeStall(); shadeDeco(); shadeWorms() }
  chunkDirty.clear();
  for (const t of trash) if (t.g.visible) { const p = t.g.position, br = lightAt(p.x, p.y + .15, p.z);
    if (t.br === undefined || Math.abs(t.br - br) > .004) { t.br = br; if (!t.base) t.base = new Map(); dimGroup(t.g, br, t.base) } }
  { const mb = Math.min(1.7, .07 + 2.5 * lightAt(MERCH.x, SHOP.floor + .7, MERCH.z));
    if (shopG.br === undefined || Math.abs(shopG.br - mb) > .004) { shopG.br = mb; dimGroup(shopG.userData.mer.root, mb, merBase) } }
  const cb = Math.max(.05, lightAt(CH.x, CH.y + .8, CH.z)) * (HOUSE.under ? .62 : 1);   // под полом дома — в тени    // Кирью совсем не пропадает во тьме — виден силуэт и огонёк каски
  if (CH.br === undefined || Math.abs(CH.br - cb) > .004) { CH.br = cb; dimGroup(chG, cb, chBase) }
}
function removeTrash(t) { scene.remove(t.g); if (t.body) world.removeBody(t.body); trash.splice(trash.indexOf(t), 1) }

/* ---------- сетка: габариты предмета в мире и высота пола под ним ---------- */
function worldBox(t, pos) {                                  // AABB предмета, если его центр стоит в pos (поворот — текущий)
  const q = new THREE.Quaternion(t.body.quaternion.x, t.body.quaternion.y, t.body.quaternion.z, t.body.quaternion.w);
  const b = new THREE.Box3(), v = new THREE.Vector3();
  for (const x of [t.local.min.x, t.local.max.x]) for (const y of [t.local.min.y, t.local.max.y]) for (const z of [t.local.min.z, t.local.max.z])
    b.expandByPoint(v.set(x, y, z).applyQuaternion(q).add(pos));
  return b;
}
function floorUnder(minX, maxX, minZ, maxZ) {               // самый высокий верх блока под прямоугольником
  let y = -Infinity;
  for (let a = 0; a < ACT.length; a++) { const [i, j] = ACT[a]; if (maxX > i + .001 && minX < i + .999 && maxZ > j + .001 && minZ < j + .999) y = Math.max(y, floorY(a)) }
  return y === -Infinity ? floorY(0) : y;
}

/* ---------- тень под предметом, пока его держат: показывает, куда он упадёт ---------- */
// пиксельный овал, повёрнутый вместе с предметом: у банки — кружок, у трубы — длинный овал
const shC = document.createElement('canvas'); shC.width = shC.height = 16;
{ const x = shC.getContext('2d'); x.fillStyle = '#000'; for (let yy = 0; yy < 16; yy++) for (let xx = 0; xx < 16; xx++) { const u = (xx + .5 - 8) / 8, v = (yy + .5 - 8) / 8; if (u * u + v * v <= 1) x.fillRect(xx, yy, 1, 1) } }
const shTex = new THREE.CanvasTexture(shC); shTex.magFilter = shTex.minFilter = THREE.NearestFilter; shTex.generateMipmaps = false;
const shGeo = new THREE.PlaneGeometry(1, 1); shGeo.rotateX(-Math.PI / 2);
const shadow = new THREE.Mesh(shGeo, new THREE.MeshBasicMaterial({ map: shTex, color: 0x000000, transparent: true, opacity: .38, depthWrite: false })); shadow.visible = false; scene.add(shadow);
// «след» предмета на полу: повёрнутый прямоугольник по его собственным осям (а не рамка вокруг него)
function footprint(t, pos) {
  const q = new THREE.Quaternion(t.body.quaternion.x, t.body.quaternion.y, t.body.quaternion.z, t.body.quaternion.w);
  const ax = new THREE.Vector3(1, 0, 0).applyQuaternion(q); ax.y = 0; if (ax.lengthSq() < 1e-3) ax.set(1, 0, 0); ax.normalize();
  const az = new THREE.Vector3(-ax.z, 0, ax.x), v = new THREE.Vector3();
  let a0 = 1e9, a1 = -1e9, b0 = 1e9, b1 = -1e9;
  for (const x of [t.local.min.x, t.local.max.x]) for (const y of [t.local.min.y, t.local.max.y]) for (const z of [t.local.min.z, t.local.max.z]) {
    v.set(x, y, z).applyQuaternion(q); const a = v.dot(ax), b = v.dot(az); a0 = Math.min(a0, a); a1 = Math.max(a1, a); b0 = Math.min(b0, b); b1 = Math.max(b1, b) }
  const c = pos.clone().addScaledVector(ax, (a0 + a1) / 2).addScaledVector(az, (b0 + b1) / 2);
  return { c, ax, az, ha: (a1 - a0) / 2, hb: (b1 - b0) / 2 };
}
const extX = f => Math.abs(f.ax.x) * f.ha + Math.abs(f.az.x) * f.hb, extZ = f => Math.abs(f.ax.z) * f.ha + Math.abs(f.az.z) * f.hb;
function obbFloor(f, m = .03) {                            // самый высокий пол среди клеток, которые след реально задевает
  let y = -Infinity;
  for (let a = 0; a < ACT.length; a++) { const [i, j] = ACT[a], dx = i + .5 - f.c.x, dz = j + .5 - f.c.z;
    if (Math.abs(dx) >= .5 + extX(f) - m || Math.abs(dz) >= .5 + extZ(f) - m) continue;
    if (Math.abs(dx * f.ax.x + dz * f.ax.z) >= f.ha + .5 * (Math.abs(f.ax.x) + Math.abs(f.ax.z)) - m) continue;
    if (Math.abs(dx * f.az.x + dz * f.az.z) >= f.hb + .5 * (Math.abs(f.az.x) + Math.abs(f.az.z)) - m) continue;
    y = Math.max(y, floorY(a)) }
  if (y === -Infinity) { const a = ACT.findIndex(([i, j]) => f.c.x >= i && f.c.x < i + 1 && f.c.z >= j && f.c.z < j + 1); y = floorY(a < 0 ? 0 : a) }
  return y;
}
function placeShadow(f, floor) { return;   // настоящая тень от солнца заменила наклейку
  shadow.visible = true; shadow.rotation.y = Math.atan2(-f.ax.z, f.ax.x); shadow.scale.set(f.ha * 2, 1, f.hb * 2);
  shadow.position.set(f.c.x, floor + .004, f.c.z);
}

/* ---------- частицы ---------- */
const parts = []; const pGeo = new THREE.BoxGeometry(.045, .045, .045);
function burst(x, y, z, cols, n, up = 1) { const lb = Math.max(.02, lightAt(x, y + .1, z)); for (let k = 0; k < n; k++) { const m = new THREE.Mesh(pGeo, new THREE.MeshBasicMaterial({ color: cols[k % cols.length] })); m.material.color.multiplyScalar(lb);
  m.position.set(x + rnd(-.3, .3), y + rnd(-.05, .1), z + rnd(-.3, .3)); scene.add(m); parts.push({ m, v: new THREE.Vector3(rnd(-1.5, 1.5), rnd(1, 3.5) * up, rnd(-1.5, 1.5)), l: rnd(.4, .7) }) } }
function stepParts(dt) { for (let k = parts.length - 1; k >= 0; k--) { const p = parts[k]; p.v.y -= 12 * dt; p.m.position.addScaledVector(p.v, dt); p.l -= dt; if (p.l <= 0) { scene.remove(p.m); p.m.material.dispose(); parts.splice(k, 1) } } }
const CRUMB = { 'Т': ['#46823a', '#25562e', '#4d2b32', '#7a4836'], 'З': ['#ad7757', '#7a4841', '#4d2b32', '#341c27'], 'П': ['#8a5a44', '#5e3a33', '#3d2329', '#2a1820'], 'Г': ['#c06a4a', '#9a4a3a', '#6e3030', '#4a2026'], 'Б': ['#9aa3a8', '#6c757c', '#474e55', '#2c3136'], 'К': ['#a7b0b6', '#7d878e', '#565f66', '#363c42'], 'Р': ['#5fa04a', '#ad7757', '#7a4841', '#3d2329'], 'В': ['#6fb552', '#3f7a35', '#9a4a3a', '#4a2026'], 'Я': ['#5fa04a', '#4d2b32', '#7a4836', '#2a1820'] };

/* ---------- ввод ---------- */
const ray = new THREE.Raycaster();
const ndc = e => { const r = cv.getBoundingClientRect(); return new THREE.Vector2((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1) };
function pick(e) {
  ray.setFromCamera(ndc(e), cam);
  const objs = [...chunks.filter(c => c && c.mesh.visible).map(c => c.mesh), ...trash.filter(t => t.g.visible).map(t => t.g), ...(shopG.visible ? [shopG] : [])];
  const h = ray.intersectObjects(objs, true)[0]; if (!h) return null;
  if (h.object.userData.chunk === undefined) return h;
  const p = h.point.clone().addScaledVector(h.face.normal, -.02), i = Math.floor(p.x), j = Math.floor(p.z), z = Math.floor(-p.y / BH), b = blocks.get(i + ',' + j + ',' + z);
  return b ? { point: h.point, object: { userData: { kind: 'b', i, j, z, k: b.k } } } : null;
}
const grabs = new Map();   // перетаскивание пальцем «за шкирку» пока выключено — вернём как особую механику
/* невидимый джойстик: коснулся где угодно и повёл палец — персонаж идёт в ту сторону; короткий тап — применить инструмент */
const joy = { x: 0, y: 0, id: null, ox: 0, oy: 0, t0: 0, moved: false }, keys = new Set();
const JOY_R = 42;                                              // на сколько пикселей отвести палец для полной скорости
cv.addEventListener('pointerdown', e => { if (joy.id !== null) return; try { cv.setPointerCapture(e.pointerId) } catch (_) { }
  Object.assign(joy, { id: e.pointerId, ox: e.clientX, oy: e.clientY, t0: performance.now(), moved: false, x: 0, y: 0 }) });
cv.addEventListener('pointermove', e => { if (joy.id !== e.pointerId) return;
  let x = e.clientX - joy.ox, y = e.clientY - joy.oy; const l = Math.hypot(x, y);
  if (!joy.moved && l < 10) return; joy.moved = true;
  if (l > JOY_R) { joy.ox = e.clientX - x / l * JOY_R; joy.oy = e.clientY - y / l * JOY_R; x = x / l * JOY_R; y = y / l * JOY_R }   // центр «едет» за пальцем
  joy.x = x / JOY_R; joy.y = y / JOY_R });
const joyEnd = (e, cancel) => { if (joy.id !== e.pointerId) return;
  const tapLike = !joy.moved && performance.now() - joy.t0 < 400; joy.id = null; joy.x = joy.y = 0;
  if (tapLike && !cancel) tap(e) };
cv.addEventListener('pointerup', e => joyEnd(e, false));
cv.addEventListener('pointercancel', e => joyEnd(e, true));
addEventListener('keydown', e => { keys.add(e.code); if (e.code === 'Space' || e.code === 'KeyE') { e.preventDefault(); if (!e.repeat) act() } if (/Arrow|Key[WASD]/.test(e.code)) e.preventDefault();
  const n = '123456789'.indexOf(e.key); if (n >= 0 && TOOLS[n]) setTool(TOOLS[n]) });
addEventListener('keyup', e => keys.delete(e.code));
const faceTo = (x, z) => { const v = new THREE.Vector3(x - CH.x, 0, z - CH.z); if (v.lengthSq() > 1e-4) CH.face.copy(v.normalize()) };
function tap(e) {
  const h = pick(e);
  if (h && h.object.userData.merchant) { if (nearShop()) openShop(); else toast('Надо подойти к лавке поближе'); return }
  if (h && h.object.userData.deco && Math.hypot(h.point.x - BASKET.x, h.point.z - BASKET.z) < BASKET.r + .12) { if (CH.held && tool === 'glove') act(); else toast(CH.held ? 'Возьми перчатку и отпусти предмет над корзиной' : 'Корзина торговца: неси мусор в перчатке'); return }
  const t = h && h.object.userData.t;
  if (t && t.active && !t.held) {                              // тап по предмету рядом — применить инструмент именно к нему
    const p = itemPt(t);
    if (Math.hypot(p.x - CH.x, p.z - CH.z) < 1 && Math.abs(p.y - CH.y) < 1) {
      if (tool === 'glove' && !CH.held) { faceTo(p.x, p.z); grabItem(t); return }
      if (tool === 'bar') { if (CH.held) { busy(); return } if (!TYPES[t.type].breaks) { shakeTool('bar'); return } faceTo(p.x, p.z); CH.swing = .3; breakTrash(t); return }
    }
  }
  const sp = !t && spotHit(h); if (sp && spotOpen(sp)) { useSpot(sp); return }   // тап по гнезду червей
  if (h && !t && tool === 'pick') {                            // тап по блоку, до которого достаём, — копаем его
    if (CH.held) { busy(); return }
    const { i, j, z } = h.object.userData, a = isAct(i, j);
    if (a >= 0 && diggable(a, z) && reach(a)) {
      if (a !== charCell()) { const [ci, cj] = ACT[a]; const v = new THREE.Vector3(ci + .5 - CH.x, 0, cj + .5 - CH.z); v.x = Math.abs(v.x) > Math.abs(v.z) ? Math.sign(v.x) : 0; v.z = v.x ? 0 : Math.sign(v.z); CH.face.copy(v) }
      digCell(a); return }
  }
  act();                                                       // иначе — инструмент в ту сторону, куда смотрит персонаж
}
function breakTrash(t) {
  const b = t.body, T0 = TYPES[t.type], q = b.quaternion, c = t.com;
  removeTrash(t);
  for (const [kind, o, ry = 0, push = [Math.sign(o[0]), 0, 0]] of T0.pieces) {   // части встают туда, где лежали в целом предмете, и разлетаются с лёгким толчком
    const p = b.pointToWorldFrame(new CANNON.Vec3(o[0] - c.x, o[1] - c.y, o[2] - c.z)), pq = q.mult(new CANNON.Quaternion().setFromEuler(0, ry, 0));
    const h = makeTrash(kind, p.x, p.y, p.z, 0, -1); h.g.quaternion.set(pq.x, pq.y, pq.z, pq.w); h.g.updateMatrixWorld(true);
    activate(h); const dir = q.vmult(new CANNON.Vec3(...push)), hv = TYPES[kind].heavy ? .5 : 1;
    h.body.velocity.set(dir.x * 1.1 * hv, 1.2 * hv + .2, dir.z * 1.1 * hv);
  }
  const p = b.position; burst(p.x, p.y + .1, p.z, T0.chips || ['#8a4b2a', '#a35a2c', '#5f7f9e', '#c9d3dc'], 22, .8);
  haptic('heavy'); toast(T0.brokeMsg || 'Сломано: ' + T0.name);
}

/* ---------- тост и карта ---------- */
let toastT = 0; function toast(s) { const el = document.getElementById('toast'); el.textContent = s; el.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => el.hidden = true, 1800) }
const mapwrap = document.getElementById('mapwrap'), mapbtn = document.getElementById('mapbtn'), mapclose = document.getElementById('mapclose');
icon(XI, { k: '#10141f', x: '#e9f0ee' }, mapclose);
(function buildMap() { const g = document.getElementById('mapgrid');
  for (let k = 0; k < 25; k++) { const c = document.createElement('div'); c.className = 'cell' + (k === 12 ? ' on' : '');
    if (k === 12) { const im = new Image(); im.src = window.GRASS64; im.style.cssText = 'width:84%;height:84%;image-rendering:pixelated'; c.appendChild(im) }
    else icon(XI, { k: '#0c0a08', x: '#6e3030' }, c);
    g.appendChild(c) } })();
mapbtn.addEventListener('click', () => { mapwrap.hidden = false; mapclose.focus(); haptic('light') });
mapclose.addEventListener('click', () => { mapwrap.hidden = true; mapbtn.focus(); haptic('light') });

/* ---------- предмет в руке: движение по сетке, без прохода сквозь блоки ---------- */
function stepHeld(g) {
  const t = g.t, b = t.body, cur3 = new THREE.Vector3(b.position.x, b.position.y, b.position.z);
  const bq = new THREE.Quaternion(b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w).slerp(g.q, .25);   // плавно доворачиваем
  b.quaternion.set(bq.x, bq.y, bq.z, bq.w); b.angularVelocity.set(0, 0, 0);
  // плавно идём к пальцу, но не быстрее 0.2 клетки за кадр
  const want = new THREE.Vector3(g.target.x - cur3.x, 0, g.target.z - cur3.z); if (want.length() > .2) want.setLength(.2);
  const nx = cur3.clone().add(want);
  // не даём выйти за края ямы — по реальному следу предмета
  let f = footprint(t, nx);
  if (f.c.x - extX(f) < PIT0) nx.x += PIT0 - (f.c.x - extX(f)); if (f.c.x + extX(f) > PIT1) nx.x -= f.c.x + extX(f) - PIT1;
  if (f.c.z - extZ(f) < PIT0) nx.z += PIT0 - (f.c.z - extZ(f)); if (f.c.z + extZ(f) > PIT1) nx.z -= f.c.z + extZ(f) - PIT1;
  f = footprint(t, nx);
  const lift = .03, need = obbFloor(f) + lift + (nx.y - worldBox(t, nx).min.y);
  if (need > cur3.y + .005) {
    // впереди выступ: сначала плавно поднимаемся на месте, и только потом едем дальше
    nx.x = cur3.x; nx.z = cur3.z; nx.y = cur3.y + Math.min(.04, need - cur3.y);
  } else nx.y = cur3.y + (need - cur3.y) * .25;                  // вниз — тоже плавно
  b.position.set(nx.x, nx.y, nx.z); b.velocity.set(0, 0, 0);
  const ff = footprint(t, nx); placeShadow(ff, obbFloor(ff));
}
/* страховка: если предмет всё же оказался внутри блока — аккуратно ставим его на пол без вращения */
function depenetrate(t) {
  // срабатывает, только если СЕРЕДИНА предмета оказалась внутри блока; край, свисающий со ступеньки, — это нормально
  const b = t.body; if (b.sleepState === CANNON.Body.SLEEPING) return;
  const c = new CANNON.Vec3(); for (const o of b.shapeOffsets) c.vadd(o, c); c.scale(1 / b.shapeOffsets.length, c);
  const w = b.pointToWorldFrame(c);
  const a = ACT.findIndex(([i, j]) => w.x >= i && w.x < i + 1 && w.z >= j && w.z < j + 1); if (a < 0) return;
  const f = floorY(a); if (w.y >= f - .03) return;
  b.updateAABB(); b.position.y += f + .01 - b.aabb.lowerBound.y; b.velocity.set(0, 0, 0); b.angularVelocity.set(0, 0, 0);
}

/* ---------- контур мусора: 1 пиксель тёмной обводки, чтобы предметы не сливались в куче ----------
   отдельный проход рисует каждый предмет своим «номером» в скрытую картинку, потом граница номеров
   закрашивается тёмным — у ближнего к камере предмета, поэтому в куче видно, кто сверху */
const idRT = new THREE.WebGLRenderTarget(1, 1, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, generateMipmaps: false, depthTexture: new THREE.DepthTexture(1, 1) });
const ID_BLOCK = new THREE.MeshBasicMaterial({ color: 0x000000 });
const DECO_ID = new THREE.MeshBasicMaterial({ color: new THREE.Color(253 / 255, 0, 0) }), MERCH_ID = new THREE.MeshBasicMaterial({ color: new THREE.Color(254 / 255, 0, 0) });
const olMat = new THREE.ShaderMaterial({
  uniforms: { tId: { value: idRT.texture }, tD: { value: idRT.depthTexture }, px: { value: new THREE.Vector2(1, 1) } },
  transparent: true, depthTest: false, depthWrite: false,
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
  fragmentShader: `uniform sampler2D tId, tD; uniform vec2 px; varying vec2 vUv;
    float idAt(vec2 u){ return floor(texture2D(tId, u).r * 255. + .5); }
    void main(){
      float me = idAt(vUv); if (me < .5) discard;
      float dm = texture2D(tD, vUv).r; bool e = false;
      for (int k = 0; k < 4; k++) {
        vec2 o = k == 0 ? vec2(px.x, 0.) : k == 1 ? vec2(-px.x, 0.) : k == 2 ? vec2(0., px.y) : vec2(0., -px.y);
        float n = idAt(vUv + o);
        if (n != me && (n < .5 || texture2D(tD, vUv + o).r > dm + 1e-5)) e = true;
      }
      if (!e) discard;
      gl_FragColor = vec4(.07, .05, .09, 1.);
    }` });
const olScene = new THREE.Scene(); { const q = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), olMat); q.frustumCulled = false; olScene.add(q) }
function drawOutlines() {
  const saved = [];
  let lo = 1e9, hi = 0; for (const v of d) { lo = Math.min(lo, v); hi = Math.max(hi, v) }
  const vis = [];
  for (const c of chunks) if (c) { saved.push([c.mesh, c.mesh.material]); c.mesh.material = ID_BLOCK; const z = c.mesh.userData.chunk; if (c.mesh.visible && (z < lo - 1 || z > hi + 1) && z > SHOP.z1 + 1) { c.mesh.visible = false; vis.push(c.mesh) } }
  shopG.traverse(o => { if (o.isMesh) { saved.push([o, o.material]); o.material = o.userData.merchant ? MERCH_ID : DECO_ID } });
  houseG.traverse(o => { if (o.isMesh) { saved.push([o, o.material]); o.material = DECO_ID } });
  const uv = under.visible; under.visible = false;
  trash.forEach((t, k) => { if (!t.idMat) t.idMat = new THREE.MeshBasicMaterial();
    t.idMat.color.setRGB((k % 250 + 1) / 255, 0, 0);
    t.g.traverse(o => { if (o.isMesh) { saved.push([o, o.material]); o.material = t.idMat } }) });
  chG.traverse(o => { if (o.isMesh) { saved.push([o, o.material]); o.material = CH_ID } });
  const shV = shadow.visible; shadow.visible = false; for (const p of parts) p.m.visible = false;
  const dm = [DECO.moss, DECO.lich, WORM.mesh]; for (const m of dm) m.visible = false;   // мох, лишайник и черви обводки не получают
  renderer.setRenderTarget(idRT); renderer.clear(); renderer.render(scene, cam); renderer.setRenderTarget(null);
  for (const [o, m] of saved) o.material = m; for (const m of vis) m.visible = true; under.visible = uv; shadow.visible = shV; for (const p of parts) p.m.visible = true; for (const m of dm) m.visible = true;
  renderer.autoClear = false; renderer.render(olScene, cam); renderer.autoClear = true;
}

/* ---------- персонаж (заглушка: Кирью Нагасаки в рабочей форме и каске) ----------
   ходит джойстиком; у обрыва останавливается и смотрит вниз, у стенки — смотрит вверх;
   если продолжать держать джойстик в ту сторону — прыгает вниз или залезает */
const CH = { held: null, x: PC + .5, z: PC + .5, y: 0, face: new THREE.Vector3(0, 0, 1), state: 'walk', t: 0, vy: 0, anim: null, walkT: 0, moving: false, land: 0, swing: 0, yaw: 0 };
const R = .22, SPEED = 1.5;
const G_UP = new THREE.Vector3(-1, 0, -1).normalize();          // «вверх по экрану» на полу
const cellAt = (x, z) => ACT.findIndex(([i, j]) => x >= i && x < i + 1 && z >= j && z < j + 1);
const charCell = () => cellAt(CH.x, CH.z);
CH.y = floorY(cellAt(CH.x, CH.z));
function reach(a) {                                            // можно ли копать блок клетки a, стоя там, где стоим
  const c = charCell(); if (c < 0) return false; if (a === c) return true;
  if (floorY(a) <= floorY(c) + .01) return false;              // соседняя клетка должна быть выше — это стенка перед нами
  const [i, j] = ACT[a], dx = Math.max(i - CH.x, 0, CH.x - (i + 1)), dz = Math.max(j - CH.z, 0, CH.z - (j + 1));
  return Math.hypot(dx, dz) < R + .5;                          // до стенки — до половины блока
}
const chG = new THREE.Group(), chBody = new THREE.Group(); chG.add(chBody); scene.add(chG);
const CH_ID = new THREE.MeshBasicMaterial({ color: new THREE.Color(252 / 255, 0, 0) });
const KIRYU = createKiryu(THREE);   // модель и позы — в kiryu.js
{ chBody.add(KIRYU.root); KIRYU.root.traverse(o => { if (o.isMesh && o.material.color && o.material.color.getHex() === 0xf4f9e8) o.material.userData.glow = true });
  chG.traverse(o => { if (o.isMesh) o.castShadow = o.receiveShadow = true }) }
const chP = new CANNON.Body({ mass: 0, type: CANNON.Body.KINEMATIC, shape: new CANNON.Cylinder(.22, .22, 1.45, 8), collisionFilterGroup: G_CHAR, collisionFilterMask: G_TRASH });
world.addBody(chP);


function digCell(a) {
  const [i, j] = ACT[a], z = d[a], b = blocks.get(i + ',' + j + ',' + z), k = b ? b.k : 'З';
  removeBlock(i, j, z); burst(i + .5, -z * BH, j + .5, CRUMB[k] || CRUMB[k[0]] || CRUMB['З'], 16);
  d[a]++; ensureBodies(); settle(); updateTrash(); haptic('light'); CH.swing = .3;
  if (!SHOP.revealed && ACT.some(([ci, cj], q) => cj === PIT0 && ci >= SHOP.i0 && ci < SHOP.i1 && d[q] > SHOP.z0)) revealShop();
}
function busy() { shakeTool(tool); toast('Руки заняты — сначала поставь ' + (CH.held.type === 'lantern' ? 'фонарь' : 'предмет')) }
function act() {
  if (!tool) { haptic('warn'); return }
  if (CH.state === 'jump' || CH.state === 'fall') return;
  if (CH.held && CH.held.type === 'tin') { const s = spotAhead(); if (s && s.state) { useSpot(s); return } }   // пустую банку — к разрыхлённым червям
  if (tool === 'glove') {                                      // перчатка: поднять предмет перед собой или поставить тот, что в руках
    if (CH.held) { dropItem(); return }
    const t = nearItem(t => !TYPES[t.type].heavy) || nearItem(t => true); if (t) grabItem(t); else shakeTool('glove'); return }
  if (CH.held) { busy(); return }                              // руки заняты: ни копать, ни ломать
  if (tool === 'bar') {                                        // лом: ближайший ломаемый предмет перед персонажем
    const t = nearItem(t => TYPES[t.type].breaks); if (t) { CH.swing = .3; breakTrash(t) } else shakeTool('bar'); return }
  if (tool === 'trowel') { const s = spotAhead(); if (s && !s.state) loosen(s); else { shakeTool('trowel'); toast(s ? 'Уже разрыхлено — подставь консервную банку' : 'Лопатка рыхлит землю там, где на стенке черви') } return }
  const a = charCell(), nb = cellAt(CH.x + CH.face.x * (R + .48), CH.z + CH.face.z * (R + .48));
  if (nb >= 0 && nb !== a && floorY(nb) > floorY(a) + .01) { if (diggable(nb, d[nb])) digCell(nb); else shakeTool('pick'); return }   // стенка перед нами
  if (a >= 0 && diggable(a, d[a])) { digCell(a); return }      // блок под ногами — после него падаем вниз
  shakeTool('pick');
}
function itemPt(t) {                                           // ближняя к персонажу точка предмета: у шины и скелета край намного ближе середины
  const b = t.body, L = t.local, v = b.pointToLocalFrame(new CANNON.Vec3(CH.x, CH.y + .4, CH.z));
  v.set(Math.min(L.max.x, Math.max(L.min.x, v.x)), Math.min(L.max.y, Math.max(L.min.y, v.y)), Math.min(L.max.z, Math.max(L.min.z, v.z)));
  return b.pointToWorldFrame(v);
}
function charHits(t) {                                         // предмет задевает Кирью?
  const p = itemPt(t); return Math.hypot(p.x - CH.x, p.z - CH.z) < .25 && p.y > CH.y - .05 && p.y < CH.y + 1.45;
}
function nearItem(ok) {                                        // ближайший найденный предмет перед персонажем, до которого достаём
  let best = null, bd = .95;
  for (const t of trash) { if (!t.active || t.held || !ok(t)) continue; const p = itemPt(t), dx = p.x - CH.x, dz = p.z - CH.z, dist = Math.hypot(dx, dz);
    if (Math.abs(p.y - CH.y) < .9 && dist < bd && dx * CH.face.x + dz * CH.face.z > -.1) { bd = dist; best = t } }
  return best;
}
/* перчатка: предмет поднимается к груди и едет вместе с персонажем; повторное действие ставит его перед собой */
function grabItem(t) {
  const hv = TYPES[t.type].heavy; if (hv) { shakeTool('glove'); haptic('warn'); toast(hv === true ? 'Слишком тяжёлая — даже не сдвинуть' : hv); return }
  const b = t.body; t.held = true; CH.held = t; t.hinted = false;
  b.type = CANNON.Body.KINEMATIC; b.velocity.set(0, 0, 0); b.angularVelocity.set(0, 0, 0); b.updateMassProperties();
  CH.swing = 0; haptic('medium'); toast('В руках: ' + TYPES[t.type].name);
}
const PRICE = { tin: 1, coffee: 2, beer: 1, glass: 1, milk: 1, pipeHalf: 4, wormTin: 5, tireQuarter: 1, skeleton: 1, skull: 1, skelChest: 1, skelLegs: 1 };   // сколько монет даёт торговец за кусочек мусора
function heldFree(x, y, z, sell) {                             // можно ли держать предмет в этой точке
  const inPit = x > PIT0 + .12 && x < PIT1 - .12 && z > PIT0 + .12 && z < PIT1 - .12;
  const inWin = sell && SHOP.revealed && x > WIN.x0 + .08 && x < WIN.x1 - .08 && z > BASKET.z - BASKET.r + .1 && z <= PIT0 + .06 && y > SHOP.floor + .12 && y < SHOP.ceil - .12;
  return ((inPit || inWin) && !solidAt(Math.floor(x), Math.floor(z), Math.floor(-y / BH))) || outerHoldFree(x, y, z);
}
function poseFree(t, x, y, z, yaw, sell) {                    // весь предмет (его углы и середины сторон) не в стене и не за краем
  const c = Math.cos(yaw), s = Math.sin(yaw), L = t.local, m = .06;
  for (const lx of [L.min.x + m, 0, L.max.x - m]) for (const lz of [L.min.z + m, 0, L.max.z - m])
    if (!heldFree(x + lx * c + lz * s, y, z - lx * s + lz * c, sell)) return false;
  return true;
}
function carryPose(t) {
  const b = t.body, up = t.local.max.y - t.local.min.y, y = CH.y + .95 + up * .3, sell = !!PRICE[t.type];
  let k = 1, rot = t.carryRot || 0, found = false;               // упёрлись — подтягиваем к себе; поперёк не влезает — разворачиваем вдоль
  for (const r of [rot, rot ? 0 : ZR]) { for (k = 1; k >= 0; k -= .125) if (poseFree(t, CH.x + CH.face.x * .42 * k, y, CH.z + CH.face.z * .42 * k, CH.yaw + r, sell)) { found = true; break }
    if (found) { rot = r; break } }
  let sx = 0, sz = 0;                                            // в углу не влезает никак — сдвигаем вдоль длинной стороны к середине ямы
  if (!found) for (const r of [rot, rot ? 0 : ZR]) { const ax = Math.cos(CH.yaw + r), az = -Math.sin(CH.yaw + r);
    for (const sh of [.25, -.25, .5, -.5, .75, -.75, 1, -1]) if (poseFree(t, CH.x + ax * sh, y, CH.z + az * sh, CH.yaw + r, sell)) { found = true; rot = r; sx = ax * sh; sz = az * sh; break }
    if (found) break }
  if (!found) rot = t.carryRot || 0; if (sx || sz || !found) k = 0; t.carryRot = rot;
  if (k < 1 && !sell && !t.hinted && heldFree(CH.x + CH.face.x * .42, y, CH.z + CH.face.z * .42, true)) {   // несёт к корзине то, что не продаётся
    t.hinted = true; toast(t.type === 'pipe' ? 'Целиком не влезет — сначала разломай ломом' : TYPES[t.type].light ? 'Фонарь лучше оставить себе' : 'Это торговцу не нужно') }
  b.position.set(CH.x + sx + CH.face.x * .42 * Math.max(0, k), y, CH.z + sz + CH.face.z * .42 * Math.max(0, k));
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, CH.yaw + rot, 0));   // длинные вещи держит поперёк себя
  b.quaternion.set(q.x, q.y, q.z, q.w); b.velocity.set(0, 0, 0); b.angularVelocity.set(0, 0, 0);
}
/* предмет провалился за карту: возвращаем его — он падает сверху ямы прямо на персонажа */
function lostItem(t) {
  const p = t.body.position, out = p.x < PIT0 - .2 || p.x > PIT1 + .2 || p.z < PIT0 - .2 || p.z > PIT1 + .2;
  return (out && p.y < -.5) || p.y < Math.min(CH.y, 0) - 4;   // персонаж наверху в доме — вещи внизу не «потерялись»
}
function returnItem(t) {
  const b = t.body; b.position.set(CH.x, Math.min(1.5, CH.y + 9), CH.z);
  b.velocity.set(0, 0, 0); b.angularVelocity.set((Math.random() - .5) * 4, 0, (Math.random() - .5) * 4); b.wakeUp(); t.falling = false; t.fallV = 0;
  toast('Сверху что-то летит!');
}
const winZone = p => p.x > WIN.x0 && p.x < WIN.x1 && p.z < PIT0 - .02 && p.z > BASKET.z - BASKET.r - .3 && p.y > SHOP.floor - 1.2 && p.y < SHOP.ceil + .3;   // за окном над корзиной
function basketTake(t) {                                       // корзина торговца: мусор — в монеты, остальное выкидывает обратно
  const price = PRICE[t.type], p = t.body.position;
  if (!price) { t.body.position.set(BASKET.x, SHOP.floor + 1, PIT0 + .35); t.body.velocity.set(0, 1.5, 1.4); t.body.wakeUp();
    toast(t.type === 'pipe' ? 'Торговец: «Целиком не возьму — разломай»' : 'Торговец: «Это оставь себе»'); return }
  removeTrash(t); addCoins(price, BASKET.x, SHOP.floor + BASKET.h, BASKET.z);
  burst(BASKET.x, SHOP.floor + BASKET.h, BASKET.z, ['#f2c14e', '#fff6c8', '#d99a2b'], 14, .7); haptic('medium');
}
function dropItem() {
  const t = CH.held; if (!t) return; const b = t.body;        // ставим там, где держали (место уже проверено: не в стене и не за краем)
  b.type = CANNON.Body.DYNAMIC; b.updateMassProperties(); b.velocity.set(CH.face.x * .4, 0, CH.face.z * .4); b.angularVelocity.set(0, 0, 0); b.wakeUp();
  t.held = false; CH.held = null; haptic('light');
  if (charHits(t)) { t.ghost = true; b.collisionFilterMask = G_BLOCK }
}
/* ---------- дом на сваях над участком: постоянная часть мира, одинаковая для всех участков ----------
   схема из редактора: первый пролёт с правой стенки на площадку в дальнем углу, второй — вдоль задней правой стенки к дальнему углу,
   площадка вдоль задней левой стенки, две вертикальные лестницы по два блока — на балкон у левой лицевой стороны.
   пол дома — на 9 блоков выше стенок; в нём проём над вертикальными лестницами и вырез в ближнем к нам углу */
const LV = n => n * BH, HF = LV(9);
const inR = (r, x, z, m = 0) => x >= r[0] - m && x <= r[1] + m && z >= r[2] - m && z <= r[3] + m;   // r = [x0, x1, z0, z1]
/* где можно стоять: [x0, x1, z0, z1, высота(x, z)] — по точке, куда шагает край Кирью */
const SURF = [
  [.25, 2, .25, 5.75, () => 0], [2, 3, .25, 2, () => 0], [3, 5, 1, 2, () => 0],   // верх декоративных стенок (кроме клеток под низкими пролётами)
  [5, 5.75, 1, 2, (x, z) => LV(2 - z)],                       // пролёт 1: клетка (5,1), вверх к дальней стенке
  [5, 5.75, .25, 1, () => LV(1)],                             // площадка (5,0)
  [1, 5, .25, 1, x => LV(6 - x)],                             // пролёт 2: вдоль дальней правой стенки, вверх к углу
  [.25, 1, .25, 4, () => LV(5)],                              // площадка вдоль дальней левой стенки + низ первой вертикальной
  [.25, 1, 4, 5, () => LV(7)],                                // низ второй вертикальной
];
const ROOM = [[.25, 5.75, .25, 2.95], [1.15, 5.75, 2.9, 3.85], [1.15, 3.85, 3.8, 4.75]];   // комната (без проёма и выреза)
const BALC = [.25, 3.85, 5.1, 5.75], DOOR = [1.65, 2.35, 4.7, 5.15], DOOR_X = [1.6, 2.4], WALL_Z = 5;
for (const r of [...ROOM, BALC, DOOR]) SURF.push([...r, () => HF]);
/* вертикальные лестницы: в клетке x 0..1, лицом к +z; край клетки — где стоит сама лестница */
const LADS = [{ x0: 0, x1: 1, edge: 4, base: LV(5), top: LV(7) }, { x0: 0, x1: 1, edge: 5, base: LV(7), top: HF }];
const LAD_IN = .3, LAD_OUT = .35;                              // где Кирью висит на лестнице и куда сходит наверху
function outerSurfaces(x, z) { const s = []; for (const r of SURF) if (inR(r, x, z)) s.push(r[4](x, z)); return s }
function groundAt(x, z, yRef) {                                // на какой высоте стоять в точке; null — там пусто или не залезть
  const s = outerSurfaces(x, z), a = cellAt(x, z); if (a >= 0) s.push(floorY(a)); if (!s.length) return null;
  let best = -Infinity; for (const h of s) if (h <= yRef + .35 && h > best) best = h;
  if (best > -Infinity) return best;
  const lo = Math.min(...s); return lo - yRef < BH + .1 ? lo : null;
}
const underHouse = () => CH.y > .3 && CH.y < HF - .3 && cellAt(CH.x, CH.z) < 0;   // под полом дома
function outerHoldFree(x, y, z) {                              // держать предмет снаружи ямы: над лестницей, балконом, стенками, в доме
  const s = outerSurfaces(x, z); if (!s.length) return false;
  if (y > HF - .2 && ![...ROOM, BALC, DOOR].some(r => inR(r, x, z, .05))) return false;   // сквозь стены дома
  return s.some(h => y > h + .15);
}
/* ---------- лазанье по вертикальной лестнице: s — путь от низа (0) по вертикали до верха и дальше шаг на площадку ---------- */
const LAD_FWD = new THREE.Vector3(0, 0, 1), LAD_X = l => (l.x0 + l.x1) / 2 + .05;
function ladderStart(dir) {                                    // идём в лестницу снизу или к проёму сверху — начинаем лезть
  if (CH.state !== 'walk') return false;
  const f = dir.dot(LAD_FWD);
  for (const l of LADS) {
    if (Math.abs(CH.x - LAD_X(l)) > .42) continue;
    const h = l.top - l.base;
    if (f > .65 && Math.abs(CH.y - l.base) < .05 && CH.z > l.edge - .58 && CH.z < l.edge) return mountLadder(l, 0);
    if (f < -.7 && Math.abs(CH.y - l.top) < .05 && CH.z > l.edge && CH.z < l.edge + .62) return mountLadder(l, h + Math.min(LAD_IN + LAD_OUT, CH.z - l.edge + LAD_IN));
  }
  return false;
}
function mountLadder(l, s) { CH.lad = { l, s, ph: 0 }; CH.state = 'ladder'; CH.face.copy(LAD_FWD); placeLadder(); return true }
function placeLadder() {
  const { l, s } = CH.lad, h = l.top - l.base;
  CH.x = LAD_X(l);
  if (s <= h) { CH.y = l.base + s; CH.z = l.edge - LAD_IN }
  else { CH.y = l.top; CH.z = l.edge - LAD_IN + (s - h) }
}
function stepLadder(dt, dir) {
  const L = CH.lad, h = L.l.top - L.l.base, v = dir.dot(LAD_FWD) * 1.3 * (CH.held ? .7 : 1);   // в лестницу — вверх, от неё — вниз
  L.s += v * dt; L.ph = (L.ph || 0) + v * dt * 7.5;
  CH.face.copy(LAD_FWD);
  if (L.s <= 0) { L.s = 0; placeLadder(); CH.state = 'walk'; CH.lad = null; CH.land = .08; return }
  if (L.s >= h + LAD_IN + LAD_OUT) { L.s = h + LAD_IN + LAD_OUT; placeLadder(); CH.state = 'walk'; CH.lad = null; haptic('light'); return }
  placeLadder();
}
/* доски тёмного дуба: широкие, с тёмными стыками и прожилками (своя текстура, не из Майнкрафта) */
function plankTex(seed, base, dark, light) {
  const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d');
  const rnd = (k => () => (k = (k * 16807) % 2147483647) / 2147483647)(seed);
  for (let b = 0; b < 4; b++) { const sh = (rnd() - .5) * 18, col = n => `rgb(${n[0] + sh | 0},${n[1] + sh * .7 | 0},${n[2] + sh * .45 | 0})`;
    x.fillStyle = col(base); x.fillRect(0, b * 8, 32, 8);
    for (let k = 0; k < 5; k++) { x.fillStyle = col(rnd() < .5 ? dark : light); x.fillRect(rnd() * 32 | 0, b * 8 + 1 + (rnd() * 6 | 0), 5 + (rnd() * 12 | 0), 1) }
    x.fillStyle = `rgb(${dark[0] - 14},${dark[1] - 10},${dark[2] - 6})`; x.fillRect(0, b * 8 + 7, 32, 1);
    const j = (b * 13 + 5) % 32; x.fillRect(j, b * 8, 1, 7) }
  const t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
}
const WOOD = new THREE.MeshLambertMaterial({ map: plankTex(7, [74, 50, 28], [52, 34, 18], [92, 64, 38]) });
const WOOD_D = new THREE.MeshLambertMaterial({ map: plankTex(19, [54, 36, 20], [38, 25, 13], [68, 46, 26]) });
const houseG = new THREE.Group(); scene.add(houseG);
const TX = .5;                                                 // текстура: 1 клетка = 2 повтора по 32 пикселя
function hbox(x0, x1, y0, y1, z0, z1, mat = WOOD, rot = null, body = true, parent = houseG) {   // доска/брус; текстура тянется по размеру
  const w = x1 - x0, h = y1 - y0, dd = z1 - z0, g = new THREE.BoxGeometry(w, h, dd), uv = g.attributes.uv;
  const fs = [[dd, h], [dd, h], [w, dd], [w, dd], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * fs[f][0] / TX, uv.getY(i) * fs[f][1] / TX) }
  const m = new THREE.Mesh(g, mat); m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); if (rot) m.rotation.set(...rot); parent.add(m);
  if (body) { const b = new CANNON.Body({ mass: 0, type: CANNON.Body.STATIC, collisionFilterGroup: G_BLOCK, collisionFilterMask: G_TRASH });
    b.addShape(new CANNON.Box(new CANNON.Vec3(w / 2, h / 2, dd / 2))); b.position.set(m.position.x, m.position.y, m.position.z);
    if (rot) b.quaternion.setFromEuler(...rot); world.addBody(b) }
  return m;
}
function wall(x0, x1, y0, y1, z0, z1) { const b = new CANNON.Body({ mass: 0, type: CANNON.Body.STATIC, collisionFilterGroup: G_BLOCK, collisionFilterMask: G_TRASH });   // невидимый бортик для предметов
  b.addShape(new CANNON.Box(new CANNON.Vec3((x1 - x0) / 2, (y1 - y0) / 2, (z1 - z0) / 2))); b.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); world.addBody(b) }
const post = (x, z, y0, y1, s = .05) => hbox(x - s, x + s, y0, y1, z - s, z + s, WOOD_D, null, false);
function rail(x0, x1, z0, z1, y, alongX) {                     // перила: брус сверху и балясины
  hbox(x0, x1, y + .86, y + .96, z0, z1, WOOD);
  if (alongX) for (let x = x0 + .12; x < x1 - .05; x += .38) hbox(x - .03, x + .03, y, y + .86, z0 + .01, z1 - .01, WOOD_D, null, false);
  else for (let z = z0 + .12; z < z1 - .05; z += .38) hbox(x0 + .01, x1 - .01, y, y + .86, z - .03, z + .03, WOOD_D, null, false);
  wall(x0, x1, y, y + .96, z0, z1);
}
{ /* пролёты: ступеньки-дощечки на двух тетивах, под ними невидимый скат для предметов */
  // пролёт 1: клетка (5,1), снизу у ямы (z = 2) вверх к z = 1
  { const n = 4, run = 1, rise = LV(1), ang = Math.atan2(rise, run), Ls = Math.hypot(run, rise);
    for (let k = 0; k < n; k++) { const t = (k + .5) / n; hbox(5, 6, t * rise - .05, t * rise, 2 - t * run - .13, 2 - t * run + .13, WOOD, null, false) }
    for (const x of [5.02, 5.98]) hbox(x - .025, x + .025, rise / 2 - .14, rise / 2 - .02, 1.5 - Ls / 2, 1.5 + Ls / 2, WOOD_D, [ang, 0, 0], false);
    hbox(5, 6, rise / 2 - .1, rise / 2 - .02, 1.5 - Ls / 2, 1.5 + Ls / 2, WOOD, [ang, 0, 0], true).visible = false;
    hbox(5, 6, rise - .08, rise, 0, 1);                        // площадка (5,0)
    for (const [x, z] of [[5.08, .08], [5.92, .08], [5.08, .92], [5.92, .92]]) post(x, z, 0, rise - .08) }
  // пролёт 2: вдоль дальней правой стенки от x = 5 к x = 1, с 1 до 5 блоков
  { const x0 = 1, x1 = 5, run = x1 - x0, y0 = LV(1), rise = LV(4), n = 16, ang = Math.atan2(rise, run), Ls = Math.hypot(run, rise), cx = (x0 + x1) / 2, cy = y0 + rise / 2;
    for (let k = 0; k < n; k++) { const t = (k + .5) / n; hbox(x1 - t * run - .13, x1 - t * run + .13, y0 + t * rise - .05, y0 + t * rise, 0, 1, WOOD, null, false) }
    for (const z of [.02, .98]) hbox(cx - Ls / 2, cx + Ls / 2, cy - .14, cy - .02, z - .025, z + .025, WOOD_D, [0, 0, -ang], false);
    hbox(cx - Ls / 2, cx + Ls / 2, cy - .1, cy - .02, 0, 1, WOOD, [0, 0, -ang], true).visible = false;
    for (const x of [4, 3, 2]) for (const z of [.08, .92]) post(x, z, 0, y0 + rise * (x1 - x) / run - .1) }
  // площадка вдоль дальней левой стенки (5 блоков) и площадка второй вертикальной (7 блоков)
  hbox(0, 1, LV(5) - .08, LV(5), 0, 4); for (const z of [.08, 1.5, 2.9, 3.92]) for (const x of [.08, .92]) post(x, z, 0, LV(5) - .08);
  hbox(0, 1, LV(7) - .08, LV(7), 4, 5); for (const x of [.08, .92]) post(x, 4.92, 0, LV(7) - .08);
  // вертикальные лестницы: два бруса и перекладины у края клетки, сверху брусья торчат, чтобы было за что держаться
  for (const l of LADS) { const z = l.edge - .06;
    for (const x of [l.x0 + .22, l.x1 - .22]) hbox(x - .04, x + .04, l.base, l.top + .7, z - .04, z + .04, WOOD_D, null, false);
    for (let y = l.base + .2; y < l.top + .6; y += .2) hbox(l.x0 + .2, l.x1 - .2, y - .03, y + .02, z - .03, z + .03, WOOD, null, false) }
  // бортики площадок над пустотой: предметы не падают вниз
  wall(1, 1.05, LV(5), LV(5) + .5, 1, 4); wall(1, 1.05, LV(7), LV(7) + .5, 4, 5);
}
{ /* дом */
  const top = HF + 2.3, wt = .14;
  // пол: всё, кроме проёма над вертикальными лестницами (x 0..1, z 3..5) и выреза в ближнем углу (x 4..6, z 4..6)
  hbox(0, 6, HF - .16, HF, 0, 3); hbox(1, 6, HF - .16, HF, 3, 4); hbox(1, 4, HF - .16, HF, 4, 5); hbox(0, 4, HF - .16, HF, 5, 6);
  // дальняя стена вдоль x (z = 0) с окном и полками
  const wz = (x0, x1, y0, y1) => hbox(x0, x1, y0, y1, 0, wt);
  wz(0, 2.6, HF, top); wz(2.6, 4, HF, HF + .9); wz(2.6, 4, HF + 1.7, top); wz(4, 6, HF, top);
  hbox(2.6, 4, HF + .86, HF + .94, .08, .2, WOOD_D, null, false); hbox(2.6, 4, HF + 1.66, HF + 1.74, .08, .2, WOOD_D, null, false); hbox(3.27, 3.33, HF + .9, HF + 1.7, .08, .2, WOOD_D, null, false);
  for (const y of [HF + .8, HF + 1.5]) hbox(4.3, 5.6, y - .05, y, wt, .5, WOOD_D);   // полки
  hbox(0, wt, HF - .16, top, 0, WALL_Z);                       // дальняя стена вдоль z (x = 0), в том числе над проёмом лестниц
  // стена с дверью (z = 5) между комнатой и балконом — всегда на месте
  const [d0, d1] = DOOR_X;
  hbox(1, d0, HF, top, WALL_Z - wt, WALL_Z); hbox(d1, 4, HF, top, WALL_Z - wt, WALL_Z); hbox(d0, d1, HF + 2, top, WALL_Z - wt, WALL_Z);
  for (const x of [d0 - .06, d1]) hbox(x, x + .06, HF, HF + 2.02, WALL_Z - wt - .03, WALL_Z + .03, WOOD_D, null, false);   // коробка
  hbox(d0 - .06, d1 + .06, HF + 1.96, HF + 2.06, WALL_Z - wt - .03, WALL_Z + .03, WOOD_D, null, false);
  for (const [x, z] of [[0, 0], [6 - wt, 0], [1, WALL_Z - wt], [4 - wt, WALL_Z - wt]]) hbox(x - .02, x + .16, HF - .16, top + .05, z - .02, z + .16, WOOD_D, null, false);   // угловые столбы
  // перила: вокруг проёма лестниц, по открытым краям комнаты и балкона
  rail(1, 1.08, 3, WALL_Z - wt, HF, false); rail(wt, 1, 3, 3.08, HF, true);
  rail(5.92, 6, wt, 4, HF, false); rail(4, 6, 3.92, 4, HF, true); rail(3.92, 4, 4, WALL_Z - wt, HF, false);
  rail(0, 4, 5.92, 6, HF, true); rail(3.92, 4, WALL_Z, 5.92, HF, false); rail(0, .08, WALL_Z, 5.92, HF, false);
  // сваи по внешним краям стенок, балки под полом, раскосы к ближним углам
  for (const [x, z] of [[.1, .1], [.1, 2], [.1, 5.9], [5.9, .1], [1.9, 1.9], [3.5, 1.9], [1.9, 3.8]]) post(x, z, 0, HF - .16, .09);
  hbox(0, 6, HF - .36, HF - .16, 0, .14, WOOD_D, null, false); hbox(0, .14, HF - .36, HF - .16, 0, 6, WOOD_D, null, false);
  hbox(0, 4, HF - .36, HF - .16, 5.86, 6, WOOD_D, null, false); hbox(5.86, 6, HF - .36, HF - .16, 0, 4, WOOD_D, null, false);
  hbox(1.83, 1.97, HF - .36, HF - .16, 0, 6, WOOD_D, null, false); hbox(0, 6, HF - .36, HF - .16, 1.83, 1.97, WOOD_D, null, false);
  hbox(3.9, 6.3, HF - 1.3, HF - 1.18, .05, .15, WOOD_D, [0, 0, -.9], false); hbox(.05, .15, HF - 1.3, HF - 1.18, 3.9, 6.3, WOOD_D, [.9, 0, 0], false);
}
const HOUSE = { under: false };
function stepHouse() { HOUSE.under = underHouse() }
function stepChar(dt) {
  let ix = joy.x, iy = joy.y;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) ix -= 1; if (keys.has('KeyD') || keys.has('ArrowRight')) ix += 1;
  if (keys.has('KeyW') || keys.has('ArrowUp')) iy -= 1; if (keys.has('KeyS') || keys.has('ArrowDown')) iy += 1;
  const dir = SCR_R.clone().multiplyScalar(ix).addScaledVector(G_UP, -iy); dir.y = 0;
  const m = Math.min(1, dir.length()); if (m > 0) dir.normalize(); CH.spd = m;
  const fl0 = groundAt(CH.x, CH.z, CH.y), fl = fl0 === null ? CH.y : fl0;   // яма, верх стенок, лестница, дом
  const p0x = CH.x, p0z = CH.z, p0y = CH.y;
  CH.moving = false;
  if (CH.state === 'ladder') stepLadder(dt, dir);              // на вертикальной лестнице
  else if (CH.state === 'jump') {
    const A = CH.anim; A.t += dt / A.dur; const k = Math.min(1, A.t);
    if (A.kind === 'climb') {                                  // сначала подтягиваемся на месте, потом шагаем на край
      const k1 = Math.min(1, k / .65), k2 = Math.max(0, (k - .65) / .35);
      CH.y = A.y0 + (A.y1 + .02 - A.y0) * Math.sin(k1 * Math.PI / 2); CH.x = A.x0 + (A.x1 - A.x0) * k2; CH.z = A.z0 + (A.z1 - A.z0) * k2;
    } else { CH.x = A.x0 + (A.x1 - A.x0) * k; CH.z = A.z0 + (A.z1 - A.z0) * k; CH.y = A.y0 + (A.y1 - A.y0) * k * k + .16 * Math.sin(Math.PI * k) }
    if (k >= 1) { CH.y = A.y1; CH.state = 'walk'; CH.land = .14; haptic(A.kind === 'down' ? 'medium' : 'light') }
  } else if (CH.y > fl + .005 && !(CH.state !== 'fall' && CH.y - fl < .3)) {   // по лестнице вниз идём, а не падаем                               // под ногами выкопали блок — падаем
    CH.state = 'fall'; CH.vy -= 22 * dt; CH.y = Math.max(fl, CH.y + CH.vy * dt);
    if (CH.y <= fl) { if (CH.vy < -4) haptic('medium'); CH.vy = 0; CH.land = .16; CH.state = 'walk' }
  } else {
    CH.y = fl; CH.vy = 0; if (CH.state === 'fall') CH.state = 'walk';
    if (m < .15) { if (CH.state !== 'walk') CH.state = 'walk'; CH.t = 0 }
    else if (ladderStart(dir)) { }
    else {
      CH.face.copy(dir);
      const step = SPEED * m * dt * (CH.held ? (TYPES[CH.held.type].mass > 1 ? .65 : .85) : 1); let blocked = null;
      for (const ax of ['x', 'z']) {                           // по осям отдельно — вдоль стенки можно скользить
        const dv = dir[ax] * step; if (Math.abs(dv) < 1e-6) continue;
        const nx = ax === 'x' ? CH.x + dv : CH.x, nz = ax === 'z' ? CH.z + dv : CH.z;
        const h = groundAt(ax === 'x' ? nx + Math.sign(dv) * R : nx, ax === 'z' ? nz + Math.sign(dv) * R : nz, fl);
        if (h === null) continue;                               // край мира
        if (Math.abs(h - fl) < .3) { CH.x = nx; CH.z = nz; CH.moving = true }
        else if (Math.abs(dir[ax]) > .55) blocked = { h, ad: new THREE.Vector3(ax === 'x' ? Math.sign(dv) : 0, 0, ax === 'z' ? Math.sign(dv) : 0) };
      }
      const kind = blocked && fl < .05 && blocked.h < .05 ? (blocked.h < fl ? 'edge' : blocked.h - fl < BH + .05 ? 'wall' : null) : null;   // прыгать и залезать — только в яме и на верх стенок
      if (kind) {
        if (CH.state !== kind) { CH.state = kind; CH.t = 0 }
        CH.t += dt; CH.face.copy(blocked.ad);
        if (CH.t > (kind === 'edge' ? .55 : .6)) {              // всё ещё держим джойстик к краю — прыгаем
          const ad = blocked.ad, x1 = CH.x + ad.x * (2 * R + .2), z1 = CH.z + ad.z * (2 * R + .2);
          CH.anim = { kind: kind === 'edge' ? 'down' : 'climb', t: 0, dur: kind === 'edge' ? .35 + .07 * Math.min(4, (fl - blocked.h) / BH) : .62, x0: CH.x, z0: CH.z, y0: CH.y, x1, z1, y1: blocked.h };
          CH.state = 'jump';
        }
      } else if (CH.state !== 'walk') { CH.state = 'walk'; CH.t = 0 }
    }
  }
  chP.position.set(CH.x, CH.y + .72, CH.z);                    // толкаем мусор телом
  chP.velocity.set((CH.x - p0x) / Math.max(dt, 1e-3), (CH.y - p0y) / Math.max(dt, 1e-3), (CH.z - p0z) / Math.max(dt, 1e-3));
}
const lerp = (a, b, k) => a + (b - a) * k;
function drawChar(dt, now) {
  chG.position.set(CH.x, CH.y, CH.z);
  let dy = Math.atan2(CH.face.x, CH.face.z) - CH.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); CH.yaw += dy * Math.min(1, dt * 10); chG.rotation.y = CH.yaw;
  CH.swing = Math.max(0, CH.swing - dt); CH.land = Math.max(0, CH.land - dt);
  KIRYU.update(dt, { state: CH.state, moving: CH.moving, speed: CH.spd || 0, anim: CH.state === 'ladder' ? CH.lad : CH.anim, swing: CH.swing, land: CH.land, carry: !!CH.held });
}

/* ---------- 3D-иконки инструментов: маленькие лоуполи-модели, рисуются отдельной камерой в пиксельный холст ----------
   трясётся и подпрыгивает сама модель, а не рамка (потом так же будет звонить телефон) */
const ICO = 20;
const icR = new THREE.WebGLRenderer({ antialias: false, alpha: true }); icR.setPixelRatio(1); icR.setSize(ICO, ICO, false);
const icScene = new THREE.Scene();
icScene.add(new THREE.AmbientLight(0xffffff, .55 * Math.PI));
{ const l = new THREE.DirectionalLight(0xffffff, .8 * Math.PI); l.position.set(.6, 1, .9); icScene.add(l) }
const icCam = new THREE.OrthographicCamera(-.62, .62, .62, -.62, .1, 10); icCam.position.set(0, 0, 5); icCam.lookAt(0, 0, 0);
const IB = (w, h, d) => new THREE.BoxGeometry(w, h, d);
function icPart(g, geo, c, x, y, z, rz = 0, rx = 0, ry = 0) { const m = new THREE.Mesh(geo, M(c)); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); g.add(m); return m }
const ICON3D = {
  phone() { const g = new THREE.Group();
    icPart(g, IB(.52, .92, .09), 0x1d2128, 0, 0, 0);
    icPart(g, IB(.44, .74, .02), 0x2c5a6a, 0, .02, .05);                 // экран
    icPart(g, IB(.3, .12, .021), 0x5fb3c4, -.03, .22, .052);              // блик на экране
    icPart(g, IB(.12, .03, .02), 0x0d0f12, 0, .4, .05);                   // динамик
    g.rotation.set(-.2, .45, .1); return g },
  pick() { const g = new THREE.Group();
    icPart(g, IB(.09, 1.05, .09), 0xa8683c, 0, -.08, 0);                  // рукоять
    icPart(g, IB(.11, .1, .11), 0x6b3f28, 0, -.56, 0);
    const h = new THREE.Group(); h.position.set(0, .38, 0); g.add(h);
    icPart(h, IB(.5, .12, .12), 0xc9d3dc, -.22, -.02, 0, .25);            // клюв влево
    icPart(h, IB(.4, .12, .12), 0xc9d3dc, .19, -.02, 0, -.3);            // и вправо
    icPart(h, IB(.16, .16, .15), 0x7d8c9c, 0, 0, 0);
    g.rotation.set(.15, .5, -.55); return g },
  bar() { const g = new THREE.Group();
    icPart(g, IB(.09, 1.0, .09), 0xc8423a, 0, -.05, 0);
    icPart(g, IB(.09, .26, .09), 0xc8423a, .1, .5, 0, -.9);               // загиб
    icPart(g, IB(.09, .14, .09), 0x7a2420, .23, .48, 0, -2.2);            // раздвоенный носик
    icPart(g, IB(.12, .1, .1), 0x7a2420, -.02, -.55, 0, .4);
    g.rotation.set(.2, .5, -.6); return g },
  glove() { const g = new THREE.Group();
    icPart(g, IB(.46, .42, .2), 0xf0c232, 0, -.02, 0);                    // ладонь
    for (let k = 0; k < 4; k++) icPart(g, IB(.1, .3, .17), 0xf0c232, -.17 + k * .113, .32 - (k === 0 || k === 3 ? .04 : 0), 0);
    icPart(g, IB(.12, .26, .16), 0xe0b02a, .3, .02, 0, -.7);             // большой палец
    icPart(g, IB(.5, .16, .23), 0xc89a1c, 0, -.3, 0);                     // раструб
    g.rotation.set(-.25, .4, .15); return g },
  trowel() { const g = new THREE.Group();
    icPart(g, IB(.14, .42, .14), 0x9a6234, 0, -.32, 0);                   // деревянная ручка
    icPart(g, IB(.16, .07, .16), 0x6b3f22, 0, -.55, 0);
    icPart(g, IB(.1, .12, .1), 0x8e989f, 0, -.07, 0);                     // втулка
    icPart(g, IB(.05, .13, .05), 0x8e989f, 0, .04, .03, 0, -.4);          // изогнутая шейка
    const s = new THREE.Group(); s.position.set(0, .3, .06); s.rotation.x = .25; g.add(s);   // совок сужается к острию
    icPart(s, IB(.36, .22, .035), 0xc9d3dc, 0, -.05, 0);
    icPart(s, IB(.26, .14, .035), 0xc9d3dc, 0, .12, 0);
    icPart(s, IB(.13, .1, .035), 0xc9d3dc, 0, .24, 0);
    icPart(s, IB(.04, .32, .05), 0x8e989f, 0, .02, .015);               // ребро жёсткости
    for (const x of [-.18, .18]) icPart(s, IB(.035, .22, .07), 0xa9b4bd, x, -.05, .025, x > 0 ? .12 : -.12);   // загнутые бортики
    g.rotation.set(.35, .55, -.6); return g },
};
const icObj = {};
for (const t of TOOLS) if (t) { icObj[t] = ICON3D[t](); icObj[t].userData.base = icObj[t].rotation.clone(); }
const icCtx = toolBtns.map((b, k) => { if (!TOOLS[k]) return null; const c = document.createElement('canvas'); c.width = c.height = ICO; b.appendChild(c); return c.getContext('2d') });
let icTime = 0;
function drawIcons(dt) {
  icTime += dt;
  TOOLS.forEach((t, k) => { if (!t) return;
    const o = icObj[t], fx = iconFx[t], sel = t === tool, base = o.userData.base;
    const still = !sel && fx.shake <= 0 && fx.lift < .001 && fx.drawn;   // неподвижную иконку не перерисовываем
    fx.shake = Math.max(0, fx.shake - dt); fx.lift += ((sel ? 1 : 0) - fx.lift) * Math.min(1, dt * 10); if (still) return; fx.drawn = true;
    o.position.set(0, fx.lift * .08 + (sel ? Math.sin(icTime * 3) * .03 : 0), 0);
    o.rotation.set(base.x, base.y + (sel ? Math.sin(icTime * 1.6) * .35 : 0), base.z + (fx.shake > 0 ? Math.sin(icTime * 70) * .35 * fx.shake / .4 : 0));
    icScene.add(o); icR.render(icScene, icCam); icScene.remove(o);
    const x = icCtx[k]; x.clearRect(0, 0, ICO, ICO); x.drawImage(icR.domElement, 0, 0) });
}

/* ---------- лавка подземного торговца: выемка во всю правую стенку, 2 блока в глубину ----------
   базарная лавка: настил из досок, крестовины из жердей, драпировка с кистями, ковёр, корзина, бочки, мешки со специями,
   кувшины, свёрнутые ковры, медный чайник и фонарь на цепи. Всё неподвижное — один меш (одна команда видеокарте);
   свет считается по деталям, торговец — отдельная живая моделька (merchant.js) */
const shopG = new THREE.Group(); scene.add(shopG);
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
function rodBetween(g, a, b, r, mat, seg = 6) {                // жердь между двумя точками
  const v = new THREE.Vector3().subVectors(b, a), m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, v.length(), seg), mat);
  m.position.copy(a).addScaledVector(v, .5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.normalize()); g.add(m); return m }
const WARM = new THREE.Color(1, .9, .76);                       // тёплый свет фонаря
/* все детали группы → один меш; у каждой детали свой номер — по нему считается свет */
function mergeStatic(g) {
  g.updateMatrixWorld(true); const inv = g.matrixWorld.clone().invert();
  const pos = [], nrm = [], col = [], pid = [], centers = [], list = [];
  g.traverse(o => { if (o.isMesh && !o.material.userData.glow) list.push(o) });
  for (const o of list) {
    const geo = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(inv.clone().multiply(o.matrixWorld));
    const p = geo.attributes.position.array, n = geo.attributes.normal.array, vc = geo.attributes.color && geo.attributes.color.array;
    const ms = Array.isArray(o.material) ? o.material : [o.material], grp = geo.groups.length ? geo.groups : [{ start: 0, count: p.length / 3, materialIndex: 0 }];
    geo.computeBoundingBox(); const id = centers.length; centers.push(geo.boundingBox.getCenter(new THREE.Vector3()));
    for (const gr of grp) { const c = (Array.isArray(o.material) ? ms[gr.materialIndex || 0] : ms[0]).color;
      for (let v = gr.start; v < gr.start + gr.count; v++) { pos.push(p[v * 3], p[v * 3 + 1], p[v * 3 + 2]); nrm.push(n[v * 3], n[v * 3 + 1], n[v * 3 + 2]);
        const k = vc ? [vc[v * 3], vc[v * 3 + 1], vc[v * 3 + 2]] : [1, 1, 1]; col.push(c.r * k[0] * WARM.r, c.g * k[1] * WARM.g, c.b * k[2] * WARM.b); pid.push(id) } }
    o.parent.remove(o) }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  mesh.userData = { deco: true, base: Float32Array.from(col), pid: Uint16Array.from(pid), centers }; g.add(mesh); return mesh;
}
let STALL = null;
function shadeStall() {                                        // свет по деталям лавки: ближе к фонарю — ярче
  const u = STALL.userData, col = STALL.geometry.attributes.color, a = col.array;
  const br = u.centers.map(c => Math.min(1.7, .07 + 2.5 * lightAt(c.x, c.y, c.z)));
  for (let v = 0; v < u.pid.length; v++) { const b = br[u.pid[v]]; a[v * 3] = u.base[v * 3] * b; a[v * 3 + 1] = u.base[v * 3 + 1] * b; a[v * 3 + 2] = u.base[v * 3 + 2] * b }
  col.needsUpdate = true;
}
function buildStall() {
  const F0 = SHOP.floor, F = F0 + .06, C = SHOP.ceil, X0 = SHOP.i0, X1 = SHOP.i1, ZB = 0, ZF = PIT0;
  const g = new THREE.Group(); shopG.add(g);
  const pp = (geo, c, x, y, z, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, typeof c === 'number' ? M(c) : c); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); g.add(m); return m };
  const Bx = (w, h, d) => new THREE.BoxGeometry(w, h, d), Cy = (r0, r1, h, s = 8, open = false) => new THREE.CylinderGeometry(r0, r1, h, s, 1, open);
  const LA = (pts, s = 10) => new THREE.LatheGeometry(pts.map(([r, h]) => new THREE.Vector2(r, h)), s);
  const pole = (a, b, r, c) => rodBetween(g, a, b, r, M(c), 6);
  // настил из досок
  const wood = [0x8a5a34, 0x7a4e2c, 0x95653b, 0x6e4426];
  for (let k = 0; k < 13; k++) pp(Bx(X1 - X0 - .03, .06, .142), wood[k % 4], (X0 + X1) / 2, F0 + .03 + ((k * 7) % 3 - 1) * .004, ZB + .08 + k * .146);
  pp(Bx(X1 - X0, .085, .035), 0x5a3a20, (X0 + X1) / 2, F0 + .02, ZF - .02);
  // крестовины по краям, балки, верёвочные узлы
  for (const x of [X0 + .1, X1 - .1]) {
    pole(V3(x, F, ZB + .25), V3(x, C - .05, ZF - .12), .036, 0x6a4628); pole(V3(x, F, ZF - .12), V3(x, C - .05, ZB + .25), .036, 0x5e3e22);
    pp(new THREE.TorusGeometry(.05, .02, 4, 8), 0xc9a86a, x, (F + C - .05) / 2, (ZB + ZF + .13) / 2, 0, Math.PI / 2, 0) }
  pole(V3(X0, C - .05, ZF - .12), V3(X1, C - .05, ZF - .12), .044, 0x5e3e22);
  pole(V3(X0, C - .08, ZB + .25), V3(X1, C - .08, ZB + .25), .036, 0x5e3e22);
  // драпировка спереди: фестоны трёх цветов, золотая кайма, кисти. Над торговцем проём, края подвязаны —
  // камера смотрит сверху наискосок, и сплошной подзор закрыл бы ему голову
  const cloth = [0x8e2430, 0x4e2a5e, 0xb07a1e], gold = 0xd2a03a, GAP0 = MERCH.x + .1, GAP1 = MERCH.x + 1;
  pp(Bx(X1 - X0, .05, .035), gold, (X0 + X1) / 2, C - .05, ZF - .085);
  let ci = 0;
  for (const [a, b, n] of [[X0, GAP0, 4], [GAP1, X1, 3]]) { const pw = (b - a) / n;
    for (let k = 0; k < n; k++, ci++) { const x0 = a + k * pw, cc = cloth[ci % 3];
      for (let q = 0; q < 3; q++) { const w = pw / 3, hh = q === 1 ? .25 : .18; pp(Bx(w + .003, hh, .022), cc, x0 + w * (q + .5), C - .07 - hh / 2, ZF - .075 + (q === 1 ? .006 : 0)) }
      pp(Bx(pw / 3, .028, .026), gold, x0 + pw / 2, C - .306, ZF - .066);
      if (k) { pp(Cy(.024, 0, .075, 5), gold, x0, C - .3, ZF - .068); pp(Bx(.022, .022, .022), 0xf0c860, x0, C - .255, ZF - .068) } }
    const tx = a === X0 ? b : a, sx = a === X0 ? -1 : 1, tc = cloth[(ci + 1) % 3];      // подвязанный хвост у проёма
    pp(Bx(.11, .2, .03), tc, tx + sx * .055, C - .17, ZF - .07); pp(Bx(.07, .2, .03), tc, tx + sx * .05, C - .37, ZF - .07, 0, 0, sx * .12);
    pp(Bx(.09, .025, .04), gold, tx + sx * .05, C - .27, ZF - .068); pp(Cy(.026, 0, .08, 5), gold, tx + sx * .07, C - .32, ZF - .062) }
  // ковёр на задней стене — рельефное полотно со складками и узором
  { const cols = 14, rows = 18, x0 = 3.95, x1 = X1 - .12, y0 = F + .12, y1 = C - .16, w = (x1 - x0) / cols, h = (y1 - y0) / rows;
    const pal = { k: 0x3a1418, r: 0x8e2a26, R: 0xa83a2c, o: 0xd98a3a, b: 0x33507a, y: 0xe2c26a };
    const pat = (c, r) => { if (c === 0 || c === cols - 1 || r === 0 || r === rows - 1) return 'k'; if (c === 1 || c === cols - 2 || r === 1 || r === rows - 2) return 'y';
      const cy = (r - 2) % 7, dd = Math.abs(cy - 3) + Math.abs(c - (cols - 1) / 2) * .9; return dd < 1.4 ? 'y' : dd < 2.6 ? 'b' : dd < 3.4 ? 'o' : cy === 6 ? 'R' : 'r' };
    const pos = [], colA = [], zf = x => ZB + .035 + .018 * Math.sin((x - x0) * 15);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const xa = x0 + c * w, xb = xa + w, ya = y1 - r * h, yb = ya - h, cc = new THREE.Color(pal[pat(c, r)]);
      const q = [[xa, ya, zf(xa)], [xa, yb, zf(xa)], [xb, yb, zf(xb)], [xa, ya, zf(xa)], [xb, yb, zf(xb)], [xb, ya, zf(xb)]];
      for (const v of q) { pos.push(...v); colA.push(cc.r, cc.g, cc.b) } }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(colA, 3)); geo.computeVertexNormals();
    g.add(new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: 0xffffff, vertexColors: true })));
    pole(V3(x0 - .06, y1 + .03, ZB + .06), V3(x1 + .06, y1 + .03, ZB + .06), .022, 0x4a3018);
    for (let c = 0; c <= cols; c += 2) pp(Bx(.012, .05, .012), 0xe2c26a, x0 + c * w, y0 - .025, zf(x0 + c * w));   // бахрома
  }
  // огромная плетёная корзина: стойки, плетёные ряды, толстый обод, внутри — уже наброшенный мусор
  { const bx = BASKET.x, bz = BASKET.z, R0 = BASKET.r * .84, R1 = BASKET.r, H = BASKET.h;
    for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2; pole(V3(bx + Math.cos(a) * R0, F + .02, bz + Math.sin(a) * R0), V3(bx + Math.cos(a) * R1, F + H, bz + Math.sin(a) * R1), .014, 0x7a5528) }
    for (let r = 0; r < 7; r++) { const y = F + .05 + r * (H - .09) / 6, rr = R0 + (R1 - R0) * (y - F) / H, n = 22, sl = 2 * Math.PI * rr / n;
      for (let k = 0; k < n; k++) { const a = (k + (r % 2) * .5) / n * Math.PI * 2, out = (k + r) % 2 ? .012 : -.004;
        pp(Bx(sl * 1.06, .074, .028), (k + r) % 2 ? 0xc49558 : 0xa27438, bx + Math.cos(a) * (rr + out), y, bz + Math.sin(a) * (rr + out), 0, -(a + Math.PI / 2), 0) } }
    pp(new THREE.TorusGeometry(R1 + .005, .046, 5, 22), 0x8a5e2c, bx, F + H, bz, Math.PI / 2, 0, 0);
    const inner = new THREE.CylinderGeometry(R1 - .035, R0 - .03, H - .03, 14, 1, true); inner.scale(-1, 1, 1);   // внутренняя стенка (вывернута)
    pp(inner, 0x2e1c0e, bx, F + H / 2 + .01, bz); pp(new THREE.CircleGeometry(R0 - .03, 14), 0x24160a, bx, F + .03, bz, -Math.PI / 2);
    pp(Cy(.15, .15, .3, 10), 0xa8383a, bx - .14, F + H - .06, bz + .04, .35, 0, .25); pp(Cy(.153, .153, .09, 10, true), 0xe8d3a0, bx - .14, F + H - .06, bz + .04, .35, 0, .25);
    pp(Cy(.075, .075, .82, 9), 0x5f7f9e, bx + .1, F + H - .02, bz - .1, .9, .6, 0);
  }
  // слева: бочка, кувшины, мешки со специями
  { const barrel = (x, z, s) => { pp(LA([[0, 0], [.17 * s, 0], [.19 * s, .06 * s], [.205 * s, .2 * s], [.19 * s, .34 * s], [.17 * s, .4 * s], [0, .4 * s]], 12), 0x7a4a26, x, F, z);
      for (const y of [.09, .31]) pp(new THREE.TorusGeometry(.197 * s, .013, 4, 14), 0x3a3634, x, F + y * s, z, Math.PI / 2, 0, 0);
      pp(Cy(.16 * s, .16 * s, .02, 12), 0x5a3418, x, F + .405 * s, z) };
    barrel(2.42, .45, 1); barrel(2.85, .3, .85);
    const amph = (x, z, c, s) => { pp(LA([[0, 0], [.06 * s, 0], [.11 * s, .05 * s], [.14 * s, .16 * s], [.14 * s, .28 * s], [.1 * s, .4 * s], [.05 * s, .46 * s], [.05 * s, .52 * s], [.068 * s, .545 * s], [0, .545 * s]], 10), c, x, F, z);
      for (const sx of [-1, 1]) pp(new THREE.TorusGeometry(.05 * s, .012, 4, 8, Math.PI), c, x + sx * .075 * s, F + .44 * s, z, 0, 0, sx * Math.PI / 2) };
    amph(2.32, .95, 0xa65a36, 1); amph(2.62, 1.0, 0xcfae80, .7); amph(3.12, .45, 0x8a4a2e, .8);
    const sack = (x, z, spice) => { pp(LA([[0, 0], [.13, 0], [.16, .08], [.165, .18], [.14, .26], [.11, .29], [0, .29]], 10), 0xa88a5a, x, F, z);
      pp(new THREE.TorusGeometry(.115, .024, 4, 12), 0x8a6e44, x, F + .29, z, Math.PI / 2, 0, 0); pp(new THREE.ConeGeometry(.105, .08, 10), spice, x, F + .33, z) };
    sack(2.28, 1.62, 0xc2452d); sack(2.62, 1.72, 0xe0a526); sack(2.84, 1.44, 0x6f8a3a);
  }
  // справа у стены: свёрнутые ковры и ящики
  { const roll = (x, z, c, tilt) => { pp(Cy(.085, .085, 1.05, 10), c, x, F + .5, z, 0, 0, tilt);
      for (const t of [-.38, 0, .38]) pp(Cy(.088, .088, .05, 10), 0xd2a03a, x - Math.sin(tilt) * t * -1, F + .5 + t * Math.cos(tilt), z, 0, 0, tilt) };
    roll(5.6, .16, 0x7a2a3a, -.12); roll(5.42, .13, 0x2e4a6e, -.05); roll(5.68, .44, 0x8a6a2a, -.2);
    const crate = (x, y, z, s) => { pp(Bx(.36 * s, .32 * s, .36 * s), 0x8a7458, x, y + .16 * s, z);
      for (const yy of [.05, .27]) pp(Bx(.37 * s, .045 * s, .37 * s), 0x5e4c36, x, y + yy * s, z);
      pp(Bx(.4 * s, .045 * s, .02), 0x6e5a40, x, y + .16 * s, z + .185 * s, 0, 0, .7) };
    crate(4.35, F, .32, 1); crate(4.38, F + .32, .3, .8); crate(3.75, F, .2, .9);
  }
  // медный поднос с чайником и пиалами под фонарём, по правую руку торговца
  { const tx = MERCH.x - .67, tz = ZF - .25;
    pp(Cy(.15, .15, .018, 14), 0xb8862e, tx, F + .009, tz);
    pp(LA([[0, 0], [.06, 0], [.075, .04], [.07, .08], [.045, .1], [.025, .11], [.03, .125], [0, .135]], 10), 0xd9a441, tx, F + .018, tz);
    pole(V3(tx + .06, F + .07, tz), V3(tx + .13, F + .12, tz + .02), .009, 0xd9a441);
    pp(new THREE.TorusGeometry(.04, .009, 4, 8, Math.PI), 0xd9a441, tx - .07, F + .08, tz, 0, 0, Math.PI / 2);
    for (const [dx, dz] of [[.08, .07], [-.03, .1]]) pp(Cy(.025, .02, .035, 8), 0x2f8a8a, tx + dx, F + .036, tz + dz);
  }
  // гирлянда сушёного перца
  { const x = 2.75; pole(V3(x, C - .1, ZF - .14), V3(x, C - .62, ZF - .14), .006, 0x3a2618);
    for (let k = 0; k < 7; k++) pp(new THREE.ConeGeometry(.024, .085, 5), k % 3 === 2 ? 0x8a3a18 : 0xb8261c, x + (k % 2 ? .022 : -.022), C - .17 - k * .065, ZF - .14, Math.PI, 0, (k % 2 ? -1 : 1) * .5) }
  // фонарь на цепи — главный свет лавки
  SHOP.lamp = V3(MERCH.x - .3, C - .48, ZF - .16);            // левее торговца, чтобы не закрывать его
  { const L = SHOP.lamp, brass = 0xb8862e, nk = Math.round((C - .07 - (L.y + .19)) / .05);
    for (let k = 0; k <= nk; k++) pp(new THREE.TorusGeometry(.02, .006, 4, 6), 0x3a3634, L.x, C - .07 - k * .05, L.z, 0, k % 2 ? Math.PI / 2 : 0, 0);
    pp(Cy(.07, .09, .025, 8), brass, L.x, L.y - .11, L.z); pp(new THREE.ConeGeometry(.095, .08, 8), brass, L.x, L.y + .12, L.z);
    pp(new THREE.TorusGeometry(.03, .008, 4, 8), brass, L.x, L.y + .17, L.z);
    for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; pp(Bx(.012, .2, .012), brass, L.x + Math.cos(a) * .072, L.y, L.z + Math.sin(a) * .072) }
    const glass = new THREE.MeshBasicMaterial({ color: 0xffd27a }); glass.userData.glow = true;
    pp(Cy(.06, .06, .19, 8), glass, L.x, L.y, L.z) }
  STALL = mergeStatic(g);
  // торговец
  const MER = createMerchant(THREE); MER.root.position.set(MERCH.x, F, MERCH.z); MER.root.rotation.y = MERCH.ry; shopG.add(MER.root);
  MER.root.traverse(o => { if (o.isMesh) { o.userData.merchant = true; o.castShadow = o.receiveShadow = false; if (!o.material.userData.warm) { o.material.color.multiply(WARM); o.material.userData.warm = true } } });
  shopG.userData.mer = MER;
}
buildStall();
const merBase = new Map();
function revealShop() { SHOP.revealed = true; lightDirty = true; setTimeout(() => toast('Кирью: …лавка? Под землёй?!'), 500) }
function nearShop() { return SHOP.revealed && CH.x > SHOP.i0 - .2 && CH.x < SHOP.i1 + .2 && CH.z < PIT0 + 1.3 && Math.abs(CH.y - SHOP.floor) < 1 }

/* ---------- лишайник, мох и гнёзда червей на стенках ----------
   украшения сидят на гранях блоков: на стенках, смотрящих в яму, и на внешнем срезе участка.
   Склеены в три меша: светящийся лишайник (тускло светится сам и чуть-чуть подсвечивает стенку вокруг), мох (его красит свет
   клетки перед гранью) и черви (шевелятся в шейдере). Выкопали блок — его украшения гаснут флажком в вершинах, без пересборки */
const LICH_L = 7;                                               // свет лишайника — приглушённый (фонарь — 15)
const MOSS = [0x1e3218, 0x29421f, 0x355427, 0x446834].map(c => new THREE.Color(c));
const LICH = [0x2a3f49, 0x36505c, 0x46636f].map(c => new THREE.Color(c)), LDOT = new THREE.Color(0x76a0b2);   // приглушённый серо-голубой
// всего два вида пятен светящегося лишайника — одни и те же везде, меняется только место на грани
const LICH_KINDS = [0, 1].map(v => { const R = k => hr(v + 11, 3, 5, 4000 + k), boxes = [], dots = [];
  if (!v) for (let k = 0; k < 14; k++) { const ang = R(k) * 6.2832, rr = Math.sqrt(R(20 + k));          // «розетка» — округлое пятно, как мох
    boxes.push([Math.cos(ang) * .15 * rr, Math.sin(ang) * .11 * rr, .04 + R(40 + k) * .045, .035 + R(60 + k) * .035, .008 + .016 * (1.1 - rr), Math.min(2, (R(80 + k) * 1.4 + (1 - rr) * 1.8) | 0)]) }
  else for (let k = 0; k < 14; k++) { const t = k / 13;                                                    // «корка» — расползается по грани вширь
    boxes.push([(t - .5) * .36 + (R(20 + k) - .5) * .03, (R(30 + k) - .5) * .07 + Math.sin(t * Math.PI) * .03, .04 + R(40 + k) * .035, .03 + R(60 + k) * .03, .008 + .014 * Math.sin(t * Math.PI), Math.min(2, (R(80 + k) * 1.3 + Math.sin(t * Math.PI) * 1.5) | 0)]) }
  for (let k = 0; k < 5; k++) dots.push(v ? [(k - 2) * .07 + (R(200 + k) - .5) * .03, (R(220 + k) - .5) * .05] : [Math.cos(k * 1.26 + .3) * .09 * (k % 2 ? 1 : .55), Math.sin(k * 1.26 + .3) * .07 * (k % 2 ? 1 : .55)]);   // светлые точки
  return { boxes, dots, hu: v ? .22 : .2, hv: v ? .08 : .15 } });
const SOIL = [0x24150c, 0x332012, 0x45291a, 0x5a3a24].map(c => new THREE.Color(c)), HOLE = new THREE.Color(0x0b0604);
function faceFrame(i, j, z, f) {                                // грань +x (f=0) или +z (f=4): центр, нормаль, оси в плоскости (u × v = n) и клетка перед ней
  const y = -(z + .5) * BH, V = (a, b, c) => new THREE.Vector3(a, b, c);
  return f === 0 ? { i, j, z, f, c: V(i + 1, y, j + .5), n: V(1, 0, 0), u: V(0, 0, -1), v: V(0, 1, 0), fi: i + 1, fj: j, fz: z }
                 : { i, j, z, f, c: V(i + .5, y, j + 1), n: V(0, 0, 1), u: V(1, 0, 0), v: V(0, 1, 0), fi: i, fj: j + 1, fz: z };
}
const onFace = (F, a, b, t) => F.c.clone().addScaledVector(F.u, a).addScaledVector(F.v, b).addScaledVector(F.n, t);
// гнёзда червей — на ближних к яме гранях декоративных стенок, каждые 2 слоя, по очереди слева и справа
const SPOTS = [['L', 3, 1], ['R', 4, 2], ['L', 2, 4], ['R', 3, 6], ['L', 4, 8], ['R', 5, 10], ['L', 3, 12], ['R', 2, 14], ['L', 5, 16], ['R', 4, 18]]
  .map(([s, k, z]) => { const i = s === 'L' ? 1 : k, j = s === 'L' ? k : 1; return { i, j, z, F: faceFrame(i, j, z, s === 'L' ? 0 : 4), state: 0, v0: 0, vn: 0, br: -1 } });
const DECO = { items: [], byKey: new Map(), moss: null, lich: null, mossBase: null };
{ const bm = geoB({ al: [1] }), bl = geoB({ al: [1], gw: [0], ph: [0] }), HV = BH / 2, cl = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
  const moss = F => {                                           // пятно мха: комочки, погуще к середине, и пара свисающих нитей
    const R = k => hr(F.i * 7 + F.f, F.j, F.z, 100 + k), v0 = bm.pos.length / 3;
    const ca = (R(1) - .5) * .5, cb = (R(2) - .5) * (BH - .36), ra = .14 + R(3) * .14, rb = .1 + R(4) * .1;
    for (let k = 0, n = 10 + (R(5) * 8 | 0); k < n; k++) {
      const ang = R(10 + k) * 6.2832, rr = Math.sqrt(R(40 + k)), w = .045 + R(70 + k) * .05, h = .035 + R(100 + k) * .04, t = .01 + R(130 + k) * .028 * (1.2 - rr);
      const a = cl(ca + Math.cos(ang) * ra * rr, -.5 + w / 2, .5 - w / 2), b = cl(cb + Math.sin(ang) * rb * rr, -HV + h / 2, HV - h / 2);
      bBox(bm, F, onFace(F, a, b, t / 2 + .002), w / 2, h / 2, t / 2, MOSS[Math.min(3, (R(160 + k) * 2.2 + (1 - rr) * 1.8) | 0)]) }
    for (let k = 0, m = 1 + (R(200) * 3 | 0); k < m; k++) {
      const len = .05 + R(220 + k) * .13, b = Math.max(-HV + len / 2 + .01, cb - rb * .5 - len / 2);
      bBox(bm, F, onFace(F, cl(ca + (R(210 + k) - .5) * ra * 1.6, -.48, .48), b, .008), .009, len / 2, .006, MOSS[k % 2]) }
    return [v0, bm.pos.length / 3 - v0];
  };
  const lichen = (F, upper) => {                                // пятно светящегося лишайника одного из двух видов; над червями — сверху справа
    const R = k => hr(F.i * 7 + F.f, F.j, F.z, 900 + k), v0 = bl.pos.length / 3, K = LICH_KINDS[upper || R(1) < .5 ? 0 : 1];
    const ca = upper ? .26 : (R(2) - .5) * 2 * (.48 - K.hu), cb = upper ? .22 : (R(3) - .5) * 2 * (HV - .02 - K.hv);
    for (const [a, b, w, h, t, c] of K.boxes) bBox(bl, F, onFace(F, ca + a, cb + b, t / 2 + .002), w / 2, h / 2, t / 2, LICH[c]);
    K.dots.forEach(([a, b], k) => bBox(bl, F, onFace(F, ca + a, cb + b, .026), .011, .011, .006, LDOT, { gw: [1], ph: [R(10 + k)] }));
    return [v0, bl.pos.length / 3 - v0];
  };
  const add = (F, kind, [v0, vn]) => { if (!vn) return; const it = { kind, F, i: F.i, j: F.j, z: F.z, f: F.f, v0, vn, alive: true, br: -1, inner: F.f === 0 ? F.i === 1 : F.j === 1 };
    DECO.items.push(it); const key = F.i + ',' + F.j + ',' + F.z; if (!DECO.byKey.has(key)) DECO.byKey.set(key, []); DECO.byKey.get(key).push(it) };
  const spotK = new Set(SPOTS.map(s => s.i + ',' + s.j + ',' + s.z + ',' + s.F.f)), faces = [];
  for (let z = 0; z < DIG; z++) { for (let j = PIT0; j < PIT1; j++) faces.push([1, j, z, 0]); for (let i = PIT0; i < PIT1; i++) faces.push([i, 1, z, 4]) }    // стенки ямы
  for (let z = 0; z <= BOT; z++) { for (let j = 0; j < N; j++) faces.push([N - 1, j, z, 0]); for (let i = 0; i < N; i++) faces.push([i, N - 1, z, 4]) }   // внешний срез
  for (const [i, j, z, f] of faces) { if (!hasB(i, j, z)) continue; const F = faceFrame(i, j, z, f);
    if (spotK.has(i + ',' + j + ',' + z + ',' + f)) { add(F, 'lich', lichen(F, true)); continue }      // над червями — лишайник, чтобы их было видно в темноте
    if (hr(i * 7 + f, j, z, 1) < (z < 3 ? .34 : .24)) add(F, 'moss', moss(F));
    else if (z >= 2 && hr(i * 7 + f, j, z, 2) < (z < 5 ? .07 : .11)) add(F, 'lich', lichen(F, false)) }
  DECO.moss = new THREE.Mesh(bGeo(bm), decoMat('moss')); DECO.lich = new THREE.Mesh(bGeo(bl), decoMat('lich')); DECO.mossBase = Float32Array.from(bm.col);
  for (const m of [DECO.moss, DECO.lich]) { m.frustumCulled = false; m.matrixAutoUpdate = false; scene.add(m) } }
function decoGone(i, j, z) {                                    // блок выкопан — его мох и лишайник гаснут
  const L = DECO.byKey.get(i + ',' + j + ',' + z); if (!L) return;
  for (const it of L) { if (!it.alive) continue; it.alive = false; const a = (it.kind === 'moss' ? DECO.moss : DECO.lich).geometry.attributes.al; a.array.fill(0, it.v0, it.v0 + it.vn); a.needsUpdate = true }
}
function decoLight(push, OUT) {                                 // свет лишайника: на стенке ямы — в клетку перед гранью, на внешнем срезе — пятном по срезу
  OUT.fill(0);
  for (const it of DECO.items) { if (it.kind !== 'lich' || !it.alive) continue; const F = it.F;
    if (it.inner) { if (!solidAt(F.fi, F.fj, F.fz)) push(F.fi, F.fj, F.fz, LICH_L); continue }
    const pl = it.f === 0 ? 0 : NL * N, k0 = it.f === 0 ? it.j : it.i;
    for (let dk = -2; dk <= 2; dk++) for (let dz = -2; dz <= 2; dz++) { const k = k0 + dk, zz = it.z + dz; if (k < 0 || k >= N || zz < 0 || zz > BOT + 1) continue;
      const v = LICH_L - 3 * (Math.abs(dk) + Math.abs(dz)), o = pl + (zz + 1) * N + k; if (v > OUT[o]) OUT[o] = v } }
}
function shadeDeco() {                                          // мох красится светом перед гранью
  const col = DECO.moss.geometry.attributes.color, a = col.array, base = DECO.mossBase; let ch = false;
  for (const it of DECO.items) { if (it.kind !== 'moss' || !it.alive) continue; const F = it.F;
    const br = brOf((2 * Lget(F.fi, F.fj, F.fz) + Lget(F.fi, F.fj, F.fz - 1) + Lget(F.fi, F.fj, F.fz + 1)) / 4);
    if (Math.abs(br - it.br) < .003) continue; it.br = br; ch = true;
    for (let v = it.v0 * 3, e = (it.v0 + it.vn) * 3; v < e; v++) a[v] = base[v] * br }
  if (ch) col.needsUpdate = true;
}
/* гнездо червей: тёмное влажное пятно с норками. Разрыхлили лопаткой — комья земли, и черви лезут наружу сильнее.
   Собрали в банку — гнездо пропадает со стенки насовсем (state 2): иначе это бесконечная ферма */
const WORM = { mesh: null, base: null, mat: null };
function spotGeo(b, s) {
  const F = s.F, R = k => hr(s.i, s.j, s.z, 300 + k), at = (a, bb, t) => onFace(F, a, bb, t), cb = -.06, loose = s.state === 1, v0 = b.pos.length / 3;
  if (s.state === 2) { s.v0 = v0; s.vn = 0; return }
  for (let k = 0; k < 9; k++) { const ang = R(k) * 6.2832, rr = Math.sqrt(R(20 + k)), w = .08 + R(40 + k) * .07, h = .06 + R(60 + k) * .05;
    bBox(b, F, at(Math.cos(ang) * .17 * rr, cb + Math.sin(ang) * .11 * rr, .004), w / 2, h / 2, .004, SOIL[R(80 + k) * 2 | 0]) }
  for (let k = 0, n = loose ? 7 : 3; k < n; k++) {
    const a = (R(100 + k) - .5) * .32, bb = cb + (R(120 + k) - .5) * .18;
    bBox(b, F, at(a, bb, .009), .02, .016, .002, HOLE);
    const out = F.n.clone().addScaledVector(F.u, (R(140 + k) - .5) * .9).addScaledVector(F.v, (R(160 + k) - .3) * .8).normalize();
    const down = F.v.clone().negate().addScaledVector(F.u, (R(180 + k) - .5) * .8).normalize();
    addWorm(b, at(a, bb, .012), out, down, loose ? .12 + R(200 + k) * .08 : .05 + R(200 + k) * .03, R(220 + k) * 6.28, loose ? .028 : .01, loose ? 5 + R(240 + k) * 3 : 2 + R(240 + k) * 1.5, .017) }
  if (loose) for (let k = 0; k < 10; k++) { const w = .025 + R(340 + k) * .035;
    bBox(b, F, at((R(300 + k) - .5) * .44, cb + (R(320 + k) - .5) * .26, w * .4 + .006), w / 2, w * .4, w * .4, SOIL[1 + (R(360 + k) * 3 | 0)]) }
  s.v0 = v0; s.vn = b.pos.length / 3 - v0;
}
function buildWorms() {
  const b = geoB({ wa: [0, 0, 0, 0], wd: [0, 0, 0], we: [0, 0, 0] }); for (const s of SPOTS) spotGeo(b, s);
  if (WORM.mesh) { scene.remove(WORM.mesh); WORM.mesh.geometry.dispose() }
  WORM.mesh = new THREE.Mesh(bGeo(b), WORM.mat || (WORM.mat = decoMat('worm'))); WORM.mesh.frustumCulled = false; WORM.mesh.matrixAutoUpdate = false; scene.add(WORM.mesh);
  WORM.base = Float32Array.from(b.col); for (const s of SPOTS) s.br = -1; shadeWorms();
}
function shadeWorms() {
  const col = WORM.mesh.geometry.attributes.color, a = col.array; let ch = false;
  for (const s of SPOTS) { const p = onFace(s.F, 0, -.06, .3), br = Math.max(.04, lightAt(p.x, p.y, p.z));
    if (Math.abs(br - s.br) < .003) continue; s.br = br; ch = true;
    for (let v = s.v0 * 3, e = (s.v0 + s.vn) * 3; v < e; v++) a[v] = WORM.base[v] * br }
  if (ch) col.needsUpdate = true;
}
buildWorms();
/* лопатка рыхлит гнездо, пустая консервная банка в руках собирает вылезших червей */
const spotOpen = s => !solidAt(s.F.fi, s.F.fj, s.F.fz);          // перед стенкой уже выкопано — гнездо видно
function spotReach(s) { const p = onFace(s.F, 0, -.06, 0), dy = p.y - CH.y; return dy > -.2 && dy < 1.45 && Math.hypot(p.x - CH.x, p.z - CH.z) < .95 }
function spotAhead() {                                          // гнездо перед персонажем, до которого он дотягивается
  let best = null, bd = 9;
  for (const s of SPOTS) { if (s.state === 2 || !spotOpen(s) || !spotReach(s)) continue; const dx = s.F.c.x - CH.x, dz = s.F.c.z - CH.z, dd = Math.hypot(dx, dz);
    if (dx * CH.face.x + dz * CH.face.z > -.1 && dd < bd) { bd = dd; best = s } }
  return best;
}
function spotHit(h) {                                           // тап по грани стенки, на которой гнездо
  const u = h && h.object.userData; if (!u || u.kind !== 'b') return null;
  return SPOTS.find(s => s.state !== 2 && s.i === u.i && s.j === u.j && s.z === u.z && (s.F.f === 0 ? h.point.x > s.i + .97 : h.point.z > s.j + .97)) || null;
}
function useSpot(s) {
  if (!spotReach(s)) { toast('Черви далеко — подойди к стенке'); return }
  faceTo(s.F.c.x, s.F.c.z);
  const held = CH.held;
  if (held && held.type === 'tin') { if (s.state) fillTin(s); else { shakeTool('glove'); toast('Черви сидят глубоко — сначала разрыхли лопаткой') } return }
  if (held) { shakeTool(tool); toast(held.type === 'wormTin' ? 'Банка уже полная — неси торговцу' : 'Руки заняты — нужна пустая консервная банка'); return }
  if (tool === 'trowel') { if (s.state) { shakeTool('trowel'); toast('Уже разрыхлено — подставь консервную банку') } else loosen(s); return }
  toast(s.state ? 'Черви вылезли — собери их в консервную банку' : 'Тут черви. Разрыхлить бы садовой лопаткой');
}
function loosen(s) {
  s.state = 1; buildWorms(); CH.swing = .3; haptic('medium');
  const p = onFace(s.F, 0, -.06, .08); burst(p.x, p.y, p.z, ['#5a3a24', '#3a2415', '#e58ca0', '#2a190f'], 16, .5);
  toast('Разрыхлил — черви полезли наружу');
}
function fillTin(s) {                                           // пустая банка превращается в банку с червями прямо в руках
  const old = CH.held, gp = old.g.position.clone(); old.held = false; CH.held = null; removeTrash(old);
  const t = makeTrash('wormTin', gp.x, gp.y, gp.z, CH.yaw, -1); activate(t); grabItem(t);
  s.state = 2; buildWorms(); CH.swing = .3;
  const p = onFace(s.F, 0, -.06, .1); burst(p.x, p.y, p.z, ['#e58ca0', '#f6bac6', '#3a2415'], 14, .4);
  toast('Банка с червями! Гнездо опустело'); haptic('medium');
}

/* ---------- монеты ---------- */
const COINI = ["..kkkkk..", ".kyyyyyk.", "kyllyyydk", "kylyyyydk", "kyyyyyydk", "kyyyyyydk", "kyyyyyddk", ".kdddddk.", "..kkkkk.."];
const COINP = { k: '#5a3a10', y: '#f2c14e', l: '#fff3b0', d: '#c8902a' };
const coinsEl = document.getElementById('coins'), coinN = document.getElementById('coinN');
icon(COINI, COINP, coinsEl.querySelector('.ci'));
let coins = 0;
function showCoins() { coinN.textContent = coins; coinsEl.classList.remove('bump'); void coinsEl.offsetWidth; coinsEl.classList.add('bump') }
function addCoins(n, x, y, z) {
  coins += n; showCoins();
  if (x === undefined) return;
  const v = new THREE.Vector3(x, y, z).project(cam), r = cv.getBoundingClientRect(), sr = stage.getBoundingClientRect();
  const el = document.createElement('div'); el.className = 'plus'; el.textContent = '+' + n;
  el.style.left = (r.left - sr.left + (v.x + 1) / 2 * r.width) + 'px'; el.style.top = (r.top - sr.top + (1 - v.y) / 2 * r.height) + 'px';
  stage.appendChild(el); setTimeout(() => el.remove(), 1000);
}

/* ---------- окно лавки ---------- */
const WARES = [{ type: 'lantern', name: 'Фонарь', desc: 'Светит на четверть ямы', price: 6 }];
const shopwrap = document.getElementById('shopwrap'), shopclose = document.getElementById('shopclose'), shoplist = document.getElementById('shoplist');
icon(XI, { k: '#10141f', x: '#e9f0ee' }, shopclose);
function wareIcon(type, host) {                              // 3D-иконка товара тем же способом, что и инструменты
  const g = new THREE.Group(); TYPES[type].build(g); g.rotation.set(.35, .7, 0); g.updateMatrixWorld(true);   // вписываем в кадр по габаритам
  const bb = new THREE.Box3().setFromObject(g), k = 1.12 / Math.max(...bb.getSize(new THREE.Vector3()).toArray()); g.scale.setScalar(k); g.position.copy(bb.getCenter(new THREE.Vector3())).multiplyScalar(-k);
  icScene.add(g); icR.render(icScene, icCam); icScene.remove(g);
  const c = document.createElement('canvas'); c.width = c.height = ICO; c.getContext('2d').drawImage(icR.domElement, 0, 0); host.appendChild(c) }
function openShop() {
  shoplist.textContent = '';
  for (const w of WARES) {
    const row = document.createElement('div'); row.className = 'ware';
    const ic = document.createElement('div'); ic.className = 'wic'; wareIcon(w.type, ic); row.appendChild(ic);
    const tx = document.createElement('div'); tx.className = 'wtx'; tx.innerHTML = '<b></b><span></span>'; tx.querySelector('b').textContent = w.name; tx.querySelector('span').textContent = w.desc; row.appendChild(tx);
    const btn = document.createElement('button'); btn.className = 'buy'; const cc = document.createElement('i'); icon(COINI, COINP, cc); btn.append(cc, ' ' + w.price);
    btn.setAttribute('aria-label', 'Купить: ' + w.name + ' за ' + w.price); if (coins < w.price) btn.classList.add('poor');
    btn.addEventListener('click', () => buy(w, btn)); row.appendChild(btn); shoplist.appendChild(row) }
  const sl = document.createElement('div'); sl.className = 'sells'; sl.innerHTML = '<h3>Скупаю</h3>';   // что торговец берёт в корзину и почём
  for (const [type, p] of Object.entries(PRICE)) { const r = document.createElement('div'); r.className = 'sell';
    const ic = document.createElement('i'); ic.className = 'sic'; wareIcon(type, ic); const nm = document.createElement('span'); nm.textContent = TYPES[type].name;
    const pr = document.createElement('b'), cc = document.createElement('i'); icon(COINI, COINP, cc); pr.append(cc, String(p)); r.append(ic, nm, pr); sl.appendChild(r) }
  shoplist.appendChild(sl);
  document.getElementById('shopsay').textContent = coins ? '«Мусор — в корзину, монеты — сюда. Что берёшь?»' : '«Пустые карманы? Неси мусор в корзину — заплачу.»';
  shopwrap.hidden = false; shopclose.focus(); haptic('light');
}
function closeShop() { shopwrap.hidden = true; haptic('light') }
function buy(w, btn) {
  if (coins < w.price) { btn.classList.remove('no'); void btn.offsetWidth; btn.classList.add('no'); haptic('warn'); document.getElementById('shopsay').textContent = '«Не хватает. Неси ещё мусора.»'; return }
  coins -= w.price; showCoins(); closeShop();
  const t = makeTrash(w.type, CH.x + rnd(-.08, .08), Math.min(1.5, CH.y + 6), CH.z + rnd(-.08, .08), rnd(0, 6.28), -1); activate(t);
  t.body.angularVelocity.set(rnd(-2, 2), 0, rnd(-2, 2)); toast('Куплено: ' + w.name.toLowerCase() + ' — лови сверху!'); haptic('medium');
}
shopclose.addEventListener('click', closeShop);
shopwrap.addEventListener('click', e => { if (e.target === shopwrap) closeShop() });
addEventListener('keydown', e => { if (e.code === 'Escape' && !shopwrap.hidden) closeShop() });

/* ---------- чёрная толща под видимыми слоями: дальше свет всё равно не доходит ---------- */
const under = new THREE.Mesh(new THREE.BoxGeometry(N, 60, N).translate(N / 2, -30, N / 2), new THREE.MeshBasicMaterial({ color: 0x000000 }));
under.matrixAutoUpdate = true; scene.add(under);
/* ---------- цикл ---------- */
/* ---------- замер производительности: тройной тап по счётчику слоя включает/выключает табличку ----------
   время ЦП по частям кадра + FPS + рывки. Если FPS низкий, а ЦП на кадр маленький — упираемся в видеокарту */
const SESSION0 = Date.now(), SESSION0_TXT = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
const perf = { on: false, el: null, acc: {}, n: 0, t0: performance.now(), long: 0, total: 0, maxDt: 0, lightN: 0, calls: 0, tris: 0 };
try { perf.on = localStorage.getItem('perf') === '1' } catch (_) { }
function perfEl() { if (perf.el) return perf.el; const e = document.createElement('div');
  e.style.cssText = 'position:absolute;left:10px;top:60px;z-index:6;max-width:calc(100% - 20px);font:600 11px ui-monospace,Menlo,Consolas,monospace;color:#e9f0ee;background:rgba(10,16,24,.75);padding:6px 8px;border-radius:4px;white-space:pre-wrap;pointer-events:none;line-height:1.4';
  e.textContent = 'замер…'; stage.appendChild(e); perf.el = e; return e }
let gpuName = '?'; try { const gl = renderer.getContext(), ext = gl.getExtension('WEBGL_debug_renderer_info'); gpuName = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER) } catch (_) { }
{ const dep = document.getElementById('depth'); dep.style.pointerEvents = 'auto'; dep.style.cursor = 'pointer'; let taps = [];
  dep.addEventListener('pointerdown', e => { e.stopPropagation(); const t = performance.now(); taps = taps.filter(x => t - x < 700); taps.push(t);
    if (taps.length < 3) return; taps = []; perf.on = !perf.on; try { localStorage.setItem('perf', perf.on ? '1' : '0') } catch (_) { }
    perfEl().hidden = !perf.on; Object.assign(perf, { acc: {}, n: 0, t0: performance.now(), long: 0, total: 0, maxDt: 0, lightN: 0 }) }) }
if (perf.on) perfEl();
function perfFrame(raw, parts) {
  perf.n++; perf.maxDt = Math.max(perf.maxDt, raw); if (raw > 50) { perf.long++; perf.total++ }
  for (const k in parts) perf.acc[k] = (perf.acc[k] || 0) + parts[k];
  const now = performance.now(); if (now - perf.t0 < 1000) return;
  const s = (now - perf.t0) / 1000, n = perf.n, cpu = Object.values(perf.acc).reduce((x, y) => x + y, 0) / n;
  const ss = Math.floor((Date.now() - SESSION0) / 1000), two = v => String(v).padStart(2, '0');
  perfEl().textContent = 'сессия ' + (ss >= 3600 ? Math.floor(ss / 3600) + ':' : '') + two(Math.floor(ss / 60) % 60) + ':' + two(ss % 60) + ' (с ' + SESSION0_TXT + ')\n' + 'FPS ' + (n / s).toFixed(0) + ' · худший кадр ' + perf.maxDt.toFixed(0) + ' мс · рывков ' + perf.long + ' (всего ' + perf.total + ')\n' +
    'ЦП на кадр ' + cpu.toFixed(1) + ' мс: ' + Object.keys(perf.acc).map(k => k + ' ' + (perf.acc[k] / n).toFixed(1)).join(' · ') + '\n' +
    'пересчёт света ' + (perf.lightN / s).toFixed(1) + '/с · отрисовок ' + perf.calls + ' · треугольников ' + (perf.tris / 1000).toFixed(1) + 'k\n' +
    'кадр ' + W + '×' + H + ' ×' + SCALE + ' · экран ' + innerWidth + '×' + innerHeight + ' · dpr ' + (devicePixelRatio || 1).toFixed(2) + '\n' + 'GPU: ' + gpuName;
  Object.assign(perf, { acc: {}, n: 0, t0: now, long: 0, maxDt: 0, lightN: 0 });
}
let last = performance.now(), acc = 0;
function frame(now) {
  const raw = now - last, T0 = performance.now();
  const dt = Math.min(.05, (now - last) / 1000); last = now; timeU.value = now / 1000;
  for (const g of grabs.values()) stepHeld(g);
  stepChar(dt); drawChar(dt, now); if (CH.held) carryPose(CH.held);
  shopG.userData.mer.update(dt, { near: nearShop(), px: CH.x - MERCH.x, pz: CH.z - MERCH.z });
  const Tp = performance.now(); world.step(1 / 60, dt, 3); const Tq = performance.now();
  const sold = [];
  for (const t of trash) if (t.body) {
    if (!t.held) {
      if (winZone(t.body.position)) {                          // летит в корзину: продаём, когда опустится ниже края (или застрянет над ней)
        t.zoneT = (t.zoneT || 0) + dt; if (t.body.position.y < SHOP.floor + BASKET.h + .12 || t.zoneT > .8) { sold.push(t); continue } }
      else { t.zoneT = 0; depenetrate(t); if (lostItem(t)) returnItem(t);
        if (t.ghost ? !charHits(t) : CH.state !== 'walk' && charHits(t)) { t.ghost = !t.ghost; t.body.collisionFilterMask = t.ghost ? G_BLOCK : G_BLOCK | G_CHAR } } }   // упал или запрыгнул прямо на предмет — не расталкиваем
    t.g.quaternion.copy(t.body.quaternion); t.g.position.copy(t.body.position).sub(t.com.clone().applyQuaternion(t.g.quaternion));
    const vy = t.body.velocity.y;                             // удар об пол: тряска и пыль — один раз за падение
    if (!t.held && t.falling && vy > -1) { t.falling = false; if (t.fallV < -5) { haptic('medium'); const p = t.g.position; burst(p.x, p.y + .05, p.z, ['#8c7a6a', '#5e4c42', '#b8a48c'], 10, .5) } }
    if (!t.held && vy < -3) { t.falling = true; t.fallV = Math.min(t.fallV || 0, vy) } else if (!t.falling) t.fallV = 0;
  }
  for (const t of sold) basketTake(t);
  stepParts(dt);
  // подсветка того, к чему можно приложить инструмент: блоки под кирку, гнёзда червей под лопатку или пустую банку
  const hl = new Set(); if (tool === 'pick' && !CH.held) for (let a = 0; a < ACT.length; a++) if (diggable(a, d[a]) && reach(a)) hl.add(ACT[a][0] + ',' + ACT[a][1] + ',' + d[a]);
  const tinH = !!CH.held && CH.held.type === 'tin';
  if ((tool === 'trowel' && !CH.held) || tinH) for (const s of SPOTS) if ((tinH ? s.state === 1 : s.state === 0) && spotOpen(s) && spotReach(s)) hl.add(s.i + ',' + s.j + ',' + s.z);
  pulseU.value = hl.size || tool === 'pick' ? .12 + .1 * Math.sin(now / 260) : 0;
  setHighlight(hl);
  const T1 = performance.now();
  // рисуем только открытые блоки в слоях рядом с камерой
  updateLight();
  let maxD = 0; for (const v of d) maxD = Math.max(maxD, v);
  const cl = -camF.y / BH, z0 = Math.floor(cl - 10), z1 = Math.min(BOT, Math.ceil(cl + 10), Math.max(SKY_D, maxD + 5));
  under.position.y = -(z1 + 1) * BH; clipU.value = under.position.y;
  for (const c of chunks) if (c) c.mesh.visible = c.faces.length > 0 && c.mesh.userData.chunk >= z0 && c.mesh.userData.chunk <= z1;
  placeCam(dt); stepHouse();
  // солнце едет вместе с камерой по слоям (ступенькой, чтобы тень не мерцала)
  const ty = Math.round(camF.y / BH) * BH; sun.target.position.set(Math.round(camF.x), ty, Math.round(camF.z)); sun.position.copy(sun.target.position).addScaledVector(SUN_DIR, 15); sun.target.updateMatrixWorld();
  renderer.shadowMap.needsUpdate = true;
  const T2 = performance.now();
  renderer.render(scene, cam); perf.calls = renderer.info.render.calls; perf.tris = renderer.info.render.triangles;
  const T3 = performance.now();
  drawOutlines();
  const T4 = performance.now();
  drawIcons(dt);
  if (perf.on) { const T5 = performance.now(); perfFrame(raw, { логика: T1 - T0 - (Tq - Tp), физика: Tq - Tp, свет: T2 - T1, рендер: T3 - T2, обводка: T4 - T3, иконки: T5 - T4 }) }
  document.getElementById('depth').textContent = 'слой ' + Math.max(0, Math.round(-CH.y / BH)) + ' / ' + DIG;
  requestAnimationFrame(frame);
}
for (let z = 0; z <= BOT; z++) buildChunk(z);
ensureBodies();
genTrash();
{ const t = makeTrash('lantern', PIT0 + .55, .01, PIT0 + .6, .3, -1); activate(t) }   // фонарь ждёт на лужайке
resize(); addEventListener('resize', resize); if (tg && tg.onEvent) tg.onEvent('viewportChanged', resize);
window.__dbg = { THREE, scene, cam, shopG, SHOP, openShop, addCoins, revealShop, basketTake, nearShop, get coins() { return coins }, digCell, LG, computeLight, lightAt, updateLight, grabItem, dropItem, tap, sun, renderer, CH, act, joy, d, trash, blocks, world, settle, updateTrash, cur, removeBlock, activate, breakTrash, setTool, grabs };
requestAnimationFrame(frame);
