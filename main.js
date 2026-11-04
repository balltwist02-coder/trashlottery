import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { createKiryu } from './kiryu.js?v=4';

/* ===== 3D-версия: яма 4×4 на 20 слоёв, кубы из ваших тайлов, физика мусора ===== */
const PLOT = window.PLOT3D, TEX = window.TEX3D;
const N = 6, DIG = PLOT.length - 10, BOT = DIG + 10;   // ниже дна ямы — ещё 10 слоёв цельного камня, чтобы мир не обрывался            // сетка 6×6: две декоративные стенки сзади и сбоку, яма — передние 4×4; нижние 10 слоёв срезаны
const PIT0 = 2, PIT1 = 6, PC = (PIT0 + PIT1) / 2; // яма занимает x,z от 2 до 6
const ACT = []; for (let j = PIT0; j < PIT1; j++) for (let i = PIT0; i < PIT1; i++) ACT.push([i, j]);
const BH = 0.8165;                               // высота блока: кубы выглядят ровно как изометрические спрайты
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

/* ---------- инструменты в кожаном мешочке: телефон (пока неактивен), кирка, лом, перчатка ---------- */
const TOOLS = ['phone', 'pick', 'bar', 'glove', null, null];
const TOOL_NAME = { phone: 'Телефон', pick: 'Кирка', bar: 'Лом', glove: 'Перчатка' };
const toolBtns = [...document.querySelectorAll('.tool')];
let tool = null;
const iconFx = {};                                         // тряска и подъём 3D-иконок
for (const t of TOOLS) if (t) iconFx[t] = { shake: 0, lift: 0 };
function shakeTool(t) { if (iconFx[t]) iconFx[t].shake = .4; haptic('warn') }
function setTool(t) {
  if (t === 'phone') { shakeTool('phone'); toast('Телефон пока молчит'); return }
  tool = tool === t ? null : t; haptic('light');
  toolBtns.forEach((b, k) => b.setAttribute('aria-pressed', TOOLS[k] && TOOLS[k] === tool ? 'true' : 'false'));
}
toolBtns.forEach((b, k) => { const t = TOOLS[k];
  if (!t) { b.disabled = true; b.setAttribute('aria-label', 'Пустой карман'); return }
  b.setAttribute('aria-label', TOOL_NAME[t]); if (t === 'phone') b.classList.add('off');
  b.addEventListener('click', () => setTool(t)) });
setTool('pick');

/* ---------- состояние раскопа ---------- */
const d = ACT.map(() => 0);
// план из редактора — 3×3: кольцо декора (индекс 0) + яма 2×2 (индексы 1..2).
// яму 4×4 собираем из него зеркально, ближняя к яме декоративная стенка берёт кольцо плана, дальняя — просто земля
const MIR = [1, 2, 2, 1];
const pm = v => v >= PIT0 ? MIR[v - PIT0] : 0;
const code = (i, j, z) => z >= DIG ? 'К' : (i === 0 || j === 0) ? '*' : PLOT[z][pm(j)][pm(i)];
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
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { const b = blocks.get(i + ',' + j + ',' + z); if (!b) continue;
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
  chunkDirty.add(z); if (z + 1 <= BOT) chunkDirty.add(z + 1) }
// невидимые стенки по краю ямы от неба до дна: мусор не вылетит из участка
{ const top = 3, bot = -(DIG + 1) * BH, hh = (top - bot) / 2, cy = (top + bot) / 2;
  const hw = (PIT1 - PIT0) / 2 + 1;
  for (const [x, z, hx, hz] of [[PIT0 - .5, PC, .5, hw], [PIT1 + .5, PC, .5, hw], [PC, PIT0 - .5, hw, .5], [PC, PIT1 + .5, hw, .5]])
    world.addBody(new CANNON.Body({ mass: 0, type: CANNON.Body.STATIC, shape: new CANNON.Box(new CANNON.Vec3(hx, hh, hz)), position: new CANNON.Vec3(x, cy, z), collisionFilterGroup: G_BLOCK, collisionFilterMask: G_TRASH })) }

/* ---------- свет только для мусора (блоки уже нарисованы с тенью) ---------- */
scene.add(new THREE.AmbientLight(0xffffff, AMB * Math.PI));
const fill = new THREE.DirectionalLight(0xffffff, FILL * Math.PI); fill.position.copy(FILL_DIR); scene.add(fill);
const sun = new THREE.DirectionalLight(0xffffff, SUN * Math.PI); sun.castShadow = true;
sun.shadow.mapSize.set(512, 512);                           // крупные «пиксели» тени — в стиле игры и дёшево
Object.assign(sun.shadow.camera, { left: -5.5, right: 5.5, top: 5.5, bottom: -5.5, near: 1, far: 45 }); sun.shadow.camera.updateProjectionMatrix();
sun.shadow.bias = -.002; sun.shadow.normalBias = .02;
scene.add(sun, sun.target);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.BasicShadowMap; renderer.shadowMap.autoUpdate = false;

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
const TYPES = {
  coffee: { name: 'Банка кофе', size: 1, mass: 1,
    build(g) { const red = M(0xa8383a), band = M(0xe8d3a0), lid = M(0xc9d3dc);
      part(g, new THREE.CylinderGeometry(.15, .15, .3, 10), [red, lid, lid], 0, .15, 0);
      part(g, new THREE.CylinderGeometry(.153, .153, .09, 10, 1, true), band, 0, .15, 0) },
    shapes: () => [[new CANNON.Cylinder(.15, .15, .3, 10), [0, .15, 0]]] },
  pipe: { name: 'Ржавая труба', size: 2, mass: 2, breaks: 'pipeHalf',
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
  pipeHalf: { name: 'Половина трубы', size: 1, mass: 1,
    build(g) { pipeMesh(g, .82, 5) },
    shapes: () => rod(.82) },
};
const trash = [];
const rnd = (a, b) => a + Math.random() * (b - a);
/* все обычные детали предмета — в один меш с цветами вершин (светящиеся и двусторонние детали остаются отдельными) */
function mergeParts(g) {
  g.updateMatrixWorld(true); const pos = [], nrm = [], col = [], parts = [];
  g.traverse(o => { if (!o.isMesh) return; const ms = Array.isArray(o.material) ? o.material : [o.material];
    if (ms.some(m => m.userData.glow || m.side !== THREE.FrontSide || !m.isMeshLambertMaterial)) return; parts.push(o) });
  if (parts.length < 2) return;
  for (const o of parts) { const geo = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(); geo.applyMatrix4(o.matrixWorld);
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
  const cellOk = (i, j, z) => code(i, j, z) !== '.';
  for (let z = 1; z < DIG; z++) for (let n = 0; n < 2; n++) {    // на слой — до двух предметов, каждый с шансом 60%
    if (Math.random() >= .6) continue;
    const type = Math.random() < 70 / 110 ? 'coffee' : 'pipe';
    let x, zz, ry;
    if (type === 'coffee') { const [i, j] = ACT[Math.random() * ACT.length | 0]; if (!cellOk(i, j, z)) continue; x = i + .5 + rnd(-.15, .15); zz = j + .5 + rnd(-.15, .15); ry = rnd(0, 6.28) }
    else { const along = Math.random() < .5, a = PIT0 + (Math.random() * (PIT1 - PIT0 - 1) | 0), b = PIT0 + (Math.random() * (PIT1 - PIT0) | 0);
      if (along) { if (!cellOk(a, b, z) || !cellOk(a + 1, b, z)) continue; x = a + 1; zz = b + .5; ry = 0 }
      else { if (!cellOk(b, a, z) || !cellOk(b, a + 1, z)) continue; x = b + .5; zz = a + 1; ry = Math.PI / 2 } }
    const t = makeTrash(type, x, -(z + 1) * BH + .01, zz, ry, z); t.g.visible = false;
    const cells = new Set();                                     // какие клетки ямы задевает предмет
    t.g.traverse(o => { if (!o.isMesh) return; const bb = new THREE.Box3().setFromObject(o);
      for (let a = 0; a < ACT.length; a++) { const [i, j] = ACT[a]; if (bb.max.x > i + .03 && bb.min.x < i + .97 && bb.max.z > j + .03 && bb.min.z < j + .97) cells.add(a) } });
    t.cells = [...cells];
  }
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
  t.g.traverse(o => { if (o.isMesh) { o.geometry.computeBoundingBox(); bb.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld).applyMatrix4(inv)) } });
  const c = bb.getCenter(new THREE.Vector3()); t.com = c; t.local = bb.translate(c.clone().negate());
  // умеренное торможение: предмет не «липнет» к стенкам и не застывает в наклоне
  const body = new CANNON.Body({ mass: TYPES[t.type].mass, collisionFilterGroup: G_TRASH, collisionFilterMask: G_BLOCK | G_CHAR, linearDamping: .3, angularDamping: .45 });
  for (const [s, o, q] of TYPES[t.type].shapes()) body.addShape(s, new CANNON.Vec3(o[0] - c.x, o[1] - c.y, o[2] - c.z), q);
  const wc = c.clone().applyQuaternion(t.g.quaternion).add(t.g.position);
  body.position.set(wc.x, wc.y, wc.z);
  body.quaternion.set(t.g.quaternion.x, t.g.quaternion.y, t.g.quaternion.z, t.g.quaternion.w);
  body.sleepSpeedLimit = .12; body.sleepTimeLimit = .5;
  world.addBody(body); t.body = body;
}
/* ---------- освещение по блокам (как в Minecraft) ----------
   в каждой клетке мира хранится уровень света 0..15. Небо светит сверху и слабеет с глубиной — ниже SKY_D слоёв полный мрак.
   фонарь — источник 15, свет теряет LA за клетку воздуха, а в толщу земли уходит с потерей LS за блок.
   грани блоков красятся по вершинам: каждая вершина берёт среднее из четырёх клеток перед гранью — получаются мягкие переходы */
const SKY_D = 7, LA = 4, LS = 4, NL = BOT + 3;            // слои -1..BOT+1
const LG = new Float32Array(N * N * NL);
const li = (i, j, z) => (z + 1) * N * N + j * N + i;
const solidAt = (i, j, z) => z >= 0 && (z > BOT || hasB(i, j, z));
const skyAt = z => 15 * Math.max(0, Math.min(1, 1 - (z + 1) / SKY_D));
function Lget(i, j, z) {
  if (z < 0) return 15; if (z > BOT + 1) return 0;
  if (i < 0 || j < 0) return 0;                               // за задними стенками ничего не видно
  if (i >= N || j >= N) return Math.max(skyAt(z), LG[li(Math.min(i, N - 1), Math.min(j, N - 1), z)]);   // открытый срез участка
  return LG[li(i, j, z)];
}
const brOf = l => Math.pow(Math.max(0, Math.min(15, l)) / 15, 2);   // уровень -> яркость (в линейном цвете)
function lightSources() {
  const out = [];
  for (const t of trash) { const L = TYPES[t.type].light; if (!L || !t.active || !t.body) continue;
    const p = t.body.position; out.push([Math.floor(p.x), Math.floor(p.z), Math.floor(-(p.y + .05) / BH), L]) }
  return out;
}
function computeLight(src) {
  LG.fill(0); const q = [];
  const push = (i, j, z, v) => { const k = li(i, j, z); if (v > LG[k] + .01) { LG[k] = v; q.push(i, j, z) } };
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) for (let z = -1; z <= BOT + 1 && !solidAt(i, j, z); z++) push(i, j, z, skyAt(z));   // небо в открытых колодцах
  for (const [i, j, z0, L] of src) { let z = Math.max(-1, Math.min(BOT, z0)); if (i < 0 || j < 0 || i >= N || j >= N) continue; while (z > -1 && solidAt(i, j, z)) z--; push(i, j, z, L) }
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
  if (lightDirty || key !== lightKey || chunkDirty.size) { lightDirty = false; lightKey = key; perf.lightN++; computeLight(src); for (const ch of chunks) if (ch) shadeChunk(ch) }
  chunkDirty.clear();
  for (const t of trash) if (t.g.visible) { const p = t.g.position, br = lightAt(p.x, p.y + .15, p.z);
    if (t.br === undefined || Math.abs(t.br - br) > .004) { t.br = br; if (!t.base) t.base = new Map(); dimGroup(t.g, br, t.base) } }
  const cb = Math.max(.05, lightAt(CH.x, CH.y + .8, CH.z));    // Кирью совсем не пропадает во тьме — виден силуэт и огонёк каски
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
  const objs = [...chunks.filter(c => c && c.mesh.visible).map(c => c.mesh), ...trash.filter(t => t.g.visible).map(t => t.g)];
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
  const n = '123456'.indexOf(e.key); if (n >= 0 && TOOLS[n]) setTool(TOOLS[n]) });
addEventListener('keyup', e => keys.delete(e.code));
const faceTo = (x, z) => { const v = new THREE.Vector3(x - CH.x, 0, z - CH.z); if (v.lengthSq() > 1e-4) CH.face.copy(v.normalize()) };
function tap(e) {
  const h = pick(e);
  const t = h && h.object.userData.t;
  if (t && t.active && !t.held) {                              // тап по предмету рядом — применить инструмент именно к нему
    const p = t.body.position;
    if (Math.hypot(p.x - CH.x, p.z - CH.z) < 1.1 && Math.abs(p.y - CH.y) < 1) {
      if (tool === 'glove' && !CH.held) { faceTo(p.x, p.z); grabItem(t); return }
      if (tool === 'bar') { if (CH.held) { busy(); return } if (!TYPES[t.type].breaks) { shakeTool('bar'); return } faceTo(p.x, p.z); CH.swing = .3; breakTrash(t); return }
    }
  }
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
  const b = t.body, kind = TYPES[t.type].breaks, q = b.quaternion, ry = t.g.rotation.y;
  removeTrash(t);
  for (const s of [-1, 1]) {                                 // две половины на месте целой трубы, с лёгким толчком в стороны
    const p = b.pointToWorldFrame(new CANNON.Vec3(s * .43, -.075, 0));   // от центра трубы к «дну» половинки
    const h = makeTrash(kind, p.x, p.y, p.z, 0, -1); h.g.quaternion.set(q.x, q.y, q.z, q.w); h.g.updateMatrixWorld(true);
    activate(h); const dir = q.vmult(new CANNON.Vec3(s, 0, 0));
    h.body.velocity.set(dir.x * 1.1, 1.2, dir.z * 1.1);
  }
  const p = b.position; burst(p.x, p.y + .1, p.z, ['#8a4b2a', '#a35a2c', '#5f7f9e', '#c9d3dc'], 22, .8);
  haptic('heavy'); toast('Сломано: ' + TYPES[t.type].name);
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
  const c = t.local.getCenter(new THREE.Vector3()), w = b.pointToWorldFrame(new CANNON.Vec3(c.x, c.y, c.z));
  const a = ACT.findIndex(([i, j]) => w.x >= i && w.x < i + 1 && w.z >= j && w.z < j + 1); if (a < 0) return;
  const f = floorY(a); if (w.y >= f - .03) return;
  const bb = worldBox(t, new THREE.Vector3(b.position.x, b.position.y, b.position.z));
  b.position.y += f + .01 - bb.min.y; b.velocity.set(0, 0, 0); b.angularVelocity.set(0, 0, 0);
}

/* ---------- контур мусора: 1 пиксель тёмной обводки, чтобы предметы не сливались в куче ----------
   отдельный проход рисует каждый предмет своим «номером» в скрытую картинку, потом граница номеров
   закрашивается тёмным — у ближнего к камере предмета, поэтому в куче видно, кто сверху */
const idRT = new THREE.WebGLRenderTarget(1, 1, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, generateMipmaps: false, depthTexture: new THREE.DepthTexture(1, 1) });
const ID_BLOCK = new THREE.MeshBasicMaterial({ color: 0x000000 });
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
  for (const c of chunks) if (c) { saved.push([c.mesh, c.mesh.material]); c.mesh.material = ID_BLOCK; const z = c.mesh.userData.chunk; if (c.mesh.visible && (z < lo - 1 || z > hi + 1)) { c.mesh.visible = false; vis.push(c.mesh) } }
  const uv = under.visible; under.visible = false;
  trash.forEach((t, k) => { if (!t.idMat) t.idMat = new THREE.MeshBasicMaterial();
    t.idMat.color.setRGB((k % 250 + 1) / 255, 0, 0);
    t.g.traverse(o => { if (o.isMesh) { saved.push([o, o.material]); o.material = t.idMat } }) });
  chG.traverse(o => { if (o.isMesh) { saved.push([o, o.material]); o.material = CH_ID } });
  const shV = shadow.visible; shadow.visible = false; for (const p of parts) p.m.visible = false;
  renderer.setRenderTarget(idRT); renderer.clear(); renderer.render(scene, cam); renderer.setRenderTarget(null);
  for (const [o, m] of saved) o.material = m; for (const m of vis) m.visible = true; under.visible = uv; shadow.visible = shV; for (const p of parts) p.m.visible = true;
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
  return Math.hypot(dx, dz) < R + .3;
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
}
function busy() { shakeTool(tool); toast('Руки заняты — сначала поставь ' + (CH.held.type === 'lantern' ? 'фонарь' : 'предмет')) }
function act() {
  if (!tool) { haptic('warn'); return }
  if (CH.state === 'jump' || CH.state === 'fall') return;
  if (tool === 'glove') {                                      // перчатка: поднять предмет перед собой или поставить тот, что в руках
    if (CH.held) { dropItem(); return }
    const t = nearItem(t => true); if (t) grabItem(t); else shakeTool('glove'); return }
  if (CH.held) { busy(); return }                              // руки заняты: ни копать, ни ломать
  if (tool === 'bar') {                                        // лом: ближайший ломаемый предмет перед персонажем
    const t = nearItem(t => TYPES[t.type].breaks); if (t) { CH.swing = .3; breakTrash(t) } else shakeTool('bar'); return }
  const a = charCell(), nb = cellAt(CH.x + CH.face.x * (R + .25), CH.z + CH.face.z * (R + .25));
  if (nb >= 0 && nb !== a && floorY(nb) > floorY(a) + .01) { if (diggable(nb, d[nb])) digCell(nb); else shakeTool('pick'); return }   // стенка перед нами
  if (a >= 0 && diggable(a, d[a])) { digCell(a); return }      // блок под ногами — после него падаем вниз
  shakeTool('pick');
}
function nearItem(ok) {                                        // ближайший найденный предмет перед персонажем, до которого достаём
  let best = null, bd = 1.05;
  for (const t of trash) { if (!t.active || t.held || !ok(t)) continue; const p = t.body.position, dx = p.x - CH.x, dz = p.z - CH.z, dist = Math.hypot(dx, dz);
    if (Math.abs(p.y - CH.y) < .9 && dist < bd && dx * CH.face.x + dz * CH.face.z > -.1) { bd = dist; best = t } }
  return best;
}
/* перчатка: предмет поднимается к груди и едет вместе с персонажем; повторное действие ставит его перед собой */
function grabItem(t) {
  const b = t.body; t.held = true; CH.held = t;
  b.type = CANNON.Body.KINEMATIC; b.velocity.set(0, 0, 0); b.angularVelocity.set(0, 0, 0); b.updateMassProperties();
  CH.swing = 0; haptic('medium'); toast('В руках: ' + TYPES[t.type].name);
}
function carryPose(t) {
  const b = t.body, up = t.local.max.y - t.local.min.y;
  b.position.set(CH.x + CH.face.x * .42, CH.y + .95 + up * .3, CH.z + CH.face.z * .42);
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, CH.yaw + Math.PI / 2, 0));   // длинные вещи держит поперёк
  b.quaternion.set(q.x, q.y, q.z, q.w); b.velocity.set(0, 0, 0); b.angularVelocity.set(0, 0, 0);
}
/* предмет провалился за карту: возвращаем его — он падает сверху ямы прямо на персонажа */
function lostItem(t) {
  const p = t.body.position, out = p.x < PIT0 - .2 || p.x > PIT1 + .2 || p.z < PIT0 - .2 || p.z > PIT1 + .2;
  return (out && p.y < -.5) || p.y < CH.y - 4;
}
function returnItem(t) {
  const b = t.body; b.position.set(CH.x, Math.min(1.5, CH.y + 9), CH.z);
  b.velocity.set(0, 0, 0); b.angularVelocity.set((Math.random() - .5) * 4, 0, (Math.random() - .5) * 4); b.wakeUp(); t.falling = false; t.fallV = 0;
  toast('Сверху что-то летит!');
}
function dropItem() {
  const t = CH.held; if (!t) return; const b = t.body;
  const cl = v => Math.max(PIT0 + .3, Math.min(PIT1 - .3, v));
  b.position.set(cl(CH.x + CH.face.x * .6), b.position.y, cl(CH.z + CH.face.z * .6));
  b.type = CANNON.Body.DYNAMIC; b.updateMassProperties(); b.velocity.set(CH.face.x * .4, 0, CH.face.z * .4); b.angularVelocity.set(0, 0, 0); b.wakeUp();
  t.held = false; CH.held = null; haptic('light');
}
function stepChar(dt) {
  let ix = joy.x, iy = joy.y;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) ix -= 1; if (keys.has('KeyD') || keys.has('ArrowRight')) ix += 1;
  if (keys.has('KeyW') || keys.has('ArrowUp')) iy -= 1; if (keys.has('KeyS') || keys.has('ArrowDown')) iy += 1;
  const dir = SCR_R.clone().multiplyScalar(ix).addScaledVector(G_UP, -iy); dir.y = 0;
  const m = Math.min(1, dir.length()); if (m > 0) dir.normalize(); CH.spd = m;
  const a = charCell(), fl = a < 0 ? CH.y : floorY(a);
  const p0x = CH.x, p0z = CH.z, p0y = CH.y;
  CH.moving = false;
  if (CH.state === 'jump') {
    const A = CH.anim; A.t += dt / A.dur; const k = Math.min(1, A.t);
    if (A.kind === 'climb') {                                  // сначала подтягиваемся на месте, потом шагаем на край
      const k1 = Math.min(1, k / .65), k2 = Math.max(0, (k - .65) / .35);
      CH.y = A.y0 + (A.y1 + .02 - A.y0) * Math.sin(k1 * Math.PI / 2); CH.x = A.x0 + (A.x1 - A.x0) * k2; CH.z = A.z0 + (A.z1 - A.z0) * k2;
    } else { CH.x = A.x0 + (A.x1 - A.x0) * k; CH.z = A.z0 + (A.z1 - A.z0) * k; CH.y = A.y0 + (A.y1 - A.y0) * k * k + .16 * Math.sin(Math.PI * k) }
    if (k >= 1) { CH.y = A.y1; CH.state = 'walk'; CH.land = .14; haptic(A.kind === 'down' ? 'medium' : 'light') }
  } else if (CH.y > fl + .005) {                               // под ногами выкопали блок — падаем
    CH.state = 'fall'; CH.vy -= 22 * dt; CH.y = Math.max(fl, CH.y + CH.vy * dt);
    if (CH.y <= fl) { if (CH.vy < -4) haptic('medium'); CH.vy = 0; CH.land = .16; CH.state = 'walk' }
  } else {
    CH.y = fl; CH.vy = 0; if (CH.state === 'fall') CH.state = 'walk';
    if (m < .15) { if (CH.state !== 'walk') CH.state = 'walk'; CH.t = 0 }
    else {
      CH.face.copy(dir);
      const step = SPEED * m * dt * (CH.held ? (TYPES[CH.held.type].mass > 1 ? .65 : .85) : 1); let blocked = null;
      for (const ax of ['x', 'z']) {                           // по осям отдельно — вдоль стенки можно скользить
        const dv = dir[ax] * step; if (Math.abs(dv) < 1e-6) continue;
        const nx = ax === 'x' ? CH.x + dv : CH.x, nz = ax === 'z' ? CH.z + dv : CH.z;
        const b = cellAt(ax === 'x' ? nx + Math.sign(dv) * R : nx, ax === 'z' ? nz + Math.sign(dv) * R : nz);
        if (b < 0) continue;                                    // край участка
        const h = floorY(b);
        if (Math.abs(h - fl) < .01) { CH.x = nx; CH.z = nz; CH.moving = true }
        else if (Math.abs(dir[ax]) > .55) blocked = { h, ad: new THREE.Vector3(ax === 'x' ? Math.sign(dv) : 0, 0, ax === 'z' ? Math.sign(dv) : 0) };
      }
      const kind = blocked ? (blocked.h < fl ? 'edge' : blocked.h - fl < BH + .05 ? 'wall' : null) : null;
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
  KIRYU.update(dt, { state: CH.state, moving: CH.moving, speed: CH.spd || 0, anim: CH.anim, swing: CH.swing, land: CH.land, carry: !!CH.held });
}

/* ---------- 3D-иконки инструментов: маленькие лоуполи-модели, рисуются отдельной камерой в пиксельный холст ----------
   трясётся и подпрыгивает сама модель, а не рамка (потом так же будет звонить телефон) */
const ICO = 24;
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

/* ---------- чёрная толща под видимыми слоями: дальше свет всё равно не доходит ---------- */
const under = new THREE.Mesh(new THREE.BoxGeometry(N, 60, N).translate(N / 2, -30, N / 2), new THREE.MeshBasicMaterial({ color: 0x000000 }));
under.matrixAutoUpdate = true; scene.add(under);
/* ---------- цикл ---------- */
/* ---------- замер производительности: тройной тап по счётчику слоя включает/выключает табличку ----------
   время ЦП по частям кадра + FPS + рывки. Если FPS низкий, а ЦП на кадр маленький — упираемся в видеокарту */
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
  perfEl().textContent = 'FPS ' + (n / s).toFixed(0) + ' · худший кадр ' + perf.maxDt.toFixed(0) + ' мс · рывков ' + perf.long + ' (всего ' + perf.total + ')\n' +
    'ЦП на кадр ' + cpu.toFixed(1) + ' мс: ' + Object.keys(perf.acc).map(k => k + ' ' + (perf.acc[k] / n).toFixed(1)).join(' · ') + '\n' +
    'пересчёт света ' + (perf.lightN / s).toFixed(1) + '/с · отрисовок ' + perf.calls + ' · треугольников ' + (perf.tris / 1000).toFixed(1) + 'k\n' +
    'кадр ' + W + '×' + H + ' ×' + SCALE + ' · экран ' + innerWidth + '×' + innerHeight + ' · dpr ' + (devicePixelRatio || 1).toFixed(2) + '\n' + 'GPU: ' + gpuName;
  Object.assign(perf, { acc: {}, n: 0, t0: now, long: 0, maxDt: 0, lightN: 0 });
}
let last = performance.now(), acc = 0;
function frame(now) {
  const raw = now - last, T0 = performance.now();
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  for (const g of grabs.values()) stepHeld(g);
  stepChar(dt); drawChar(dt, now); if (CH.held) carryPose(CH.held);
  const Tp = performance.now(); world.step(1 / 60, dt, 3); const Tq = performance.now();
  for (const t of trash) if (t.body) {
    if (!t.held) { depenetrate(t); if (lostItem(t)) returnItem(t) }
    t.g.quaternion.copy(t.body.quaternion); t.g.position.copy(t.body.position).sub(t.com.clone().applyQuaternion(t.g.quaternion));
    const vy = t.body.velocity.y;                             // удар об пол: тряска и пыль — один раз за падение
    if (!t.held && t.falling && vy > -1) { t.falling = false; if (t.fallV < -5) { haptic('medium'); const p = t.g.position; burst(p.x, p.y + .05, p.z, ['#8c7a6a', '#5e4c42', '#b8a48c'], 10, .5) } }
    if (!t.held && vy < -3) { t.falling = true; t.fallV = Math.min(t.fallV || 0, vy) } else if (!t.falling) t.fallV = 0;
  }
  stepParts(dt);
  // подсветка блоков, которые можно копать
  pulseU.value = tool === 'pick' ? .12 + .1 * Math.sin(now / 260) : 0;
  const hl = new Set(); if (tool === 'pick' && !CH.held) for (let a = 0; a < ACT.length; a++) if (diggable(a, d[a]) && reach(a)) hl.add(ACT[a][0] + ',' + ACT[a][1] + ',' + d[a]);
  setHighlight(hl);
  const T1 = performance.now();
  // рисуем только открытые блоки в слоях рядом с камерой
  updateLight();
  let maxD = 0; for (const v of d) maxD = Math.max(maxD, v);
  const cl = -camF.y / BH, z0 = Math.floor(cl - 10), z1 = Math.min(BOT, Math.ceil(cl + 10), Math.max(SKY_D, maxD + 5));
  under.position.y = -(z1 + 1) * BH;
  for (const c of chunks) if (c) c.mesh.visible = c.faces.length > 0 && c.mesh.userData.chunk >= z0 && c.mesh.userData.chunk <= z1;
  placeCam(dt);
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
window.__dbg = { LG, computeLight, lightAt, updateLight, grabItem, dropItem, tap, sun, renderer, CH, act, joy, d, trash, blocks, world, settle, updateTrash, cur, removeBlock, activate, breakTrash, setTool, grabs };
requestAnimationFrame(frame);
