import * as THREE from 'three';
import * as CANNON from 'cannon-es';

/* ===== 3D-версия: яма 2×2 на 30 слоёв, кубы из ваших тайлов, физика мусора ===== */
const PLOT = window.PLOT3D, TEX = window.TEX3D;
const N = 4, DIG = PLOT.length;                 // сетка 4×4: два ряда декораций сзади и сбоку, яма — передний угол 2×2
const ACT = [[2, 2], [3, 2], [2, 3], [3, 3]];
const PIT0 = 2, PIT1 = 4;                        // яма занимает x,z от 2 до 4
const BH = 0.8165;                               // высота блока: кубы выглядят ровно как изометрические спрайты
const PX = 64 / Math.SQRT2;                      // пикселей на единицу мира (ромб верха = 64 px)

/* ---------- Telegram ---------- */
const tg = window.Telegram && window.Telegram.WebApp;
if (tg) { try { tg.ready(); tg.expand(); tg.disableVerticalSwipes && tg.disableVerticalSwipes(); tg.setHeaderColor('#1b2a3a'); tg.setBackgroundColor('#1b2a3a'); tg.setBottomBarColor && tg.setBottomBarColor('#14202c') } catch (e) {} }
const haptic = k => { try { tg && tg.HapticFeedback && (k === 'warn' ? tg.HapticFeedback.notificationOccurred('warning') : tg.HapticFeedback.impactOccurred(k)) } catch (e) {} };

/* ---------- иконки ---------- */
function icon(rows, pal, host) { const c = document.createElement('canvas'); c.width = c.height = rows.length; const x = c.getContext('2d');
  rows.forEach((r, y) => [...r].forEach((ch, i) => { if (pal[ch]) { x.fillStyle = pal[ch]; x.fillRect(i, y, 1, 1) } })); if (host) host.appendChild(c); return c }
const PICK = ["................", ".....kkkkkk.....", "...kksssssSkk...", "..ksSSkkkkSSsk..", ".ksSk.kwWk.kSsk.", ".kSk..kwWk..kSk.", ".kk...kwWk...kk.", "......kwWk......", "......kwWk......", "......kwWk......", "......kwWk......", "......kwWk......", "......kwWk......", "......kWWk......", ".......kk.......", "................"];
const BAR = ["................", "..........kkk...", ".........krrRk..", "........krRkkk..", ".......krRk.....", "......krRk......", ".....krRk.......", "....krRk........", "...krRk.........", "..krRk..........", ".krRk...........", ".kRk............", ".kRk............", ".kkRkk..........", "..kkk...........", "................"];
const pickBtn = document.getElementById('pick');
const barBtn = document.querySelectorAll('.slot')[1];
barBtn.disabled = false; barBtn.id = 'bar'; barBtn.setAttribute('aria-label', 'Лом'); barBtn.setAttribute('aria-pressed', 'false');
icon(PICK, { k: '#10141f', s: '#c9d3dc', S: '#7d8c9c', w: '#a8683c', W: '#6b3f28' }, pickBtn);
icon(BAR, { k: '#10141f', r: '#c8423a', R: '#7a2420' }, barBtn);
const MAPI = ["................", "................", ".kkkkkkkkkkkkkk.", ".kppppPPPPppppk.", ".kpggpPPPPpppbk.", ".kpggpPPPbpprpk.", ".kpppbPPbPprrpk.", ".kpppbPPPPpprpk.", ".kppbpPPPPppppk.", ".kpbppPPPPpgggk.", ".kbpppPPPPpgggk.", ".kppppPPPPppppk.", ".kkkkkkkkkkkkkk.", "................", "................", "................"];
icon(MAPI, { k: '#10141f', p: '#e7d7a4', P: '#c4ad74', g: '#5f9c4f', b: '#7a4836', r: '#c8423a' }, document.getElementById('mapbtn'));
const XI = ["................", ".kk..........kk.", ".kxk........kxk.", "..kxk......kxk..", "...kxk....kxk...", "....kxk..kxk....", ".....kxkkxk.....", "......kxxk......", "......kxxk......", ".....kxkkxk.....", "....kxk..kxk....", "...kxk....kxk...", "..kxk......kxk..", ".kxk........kxk.", ".kk..........kk.", "................"];

/* ---------- инструменты: кирка копает, лом ломает мусор ---------- */
let tool = 'pick';
function setTool(t) { tool = tool === t ? null : t; pickBtn.setAttribute('aria-pressed', tool === 'pick'); barBtn.setAttribute('aria-pressed', tool === 'bar'); haptic('light'); abIcon() }
pickBtn.setAttribute('aria-pressed', 'true');
pickBtn.addEventListener('click', () => setTool('pick'));
barBtn.addEventListener('click', () => setTool('bar'));
const nudge = b => { b.classList.remove('nudge'); void b.offsetWidth; b.classList.add('nudge'); haptic('warn') };

/* ---------- состояние раскопа ---------- */
const d = [0, 0, 0, 0];
// план из редактора — 3×3 (индексы 0..2); новый задний ряд (i=0 или j=0) — просто земля
const code = (i, j, z) => (z >= DIG || i === 0 || j === 0) ? '*' : PLOT[z][j - 1][i - 1];
function settle() { for (let a = 0; a < 4; a++) while (d[a] < DIG && code(ACT[a][0], ACT[a][1], d[a]) === '.') d[a]++ }
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
function resize() {
  const r = stage.getBoundingClientRect();
  SCALE = Math.max(1, Math.floor(r.width / 176)); W = Math.ceil(r.width / SCALE); H = Math.ceil(r.height / SCALE);
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
/* камера двигается только на целые пиксели — иначе пиксельные текстуры «дрожат» при прокрутке */
let camY = 0, camTarget = 0, follow = true, shake = 0;
const maxCam = () => Math.min(cur() + 1, DIG - 1) * 32;
const clampCam = v => Math.max(0, Math.min(maxCam(), v));
function placeCam() {
  const upPx = Math.round(0.2 * H);                        // верх ямы на ~30% высоты экрана
  const t = new THREE.Vector3(3, -(upPx / PX) / C30 - Math.round(camY) / 32 * BH, 3);
  if (shake > 0) { t.addScaledVector(SCR_R, (Math.random() < .5 ? -1 : 1) / PX).addScaledVector(SCR_U, (Math.random() < .5 ? -1 : 0) / PX); shake-- }
  cam.position.copy(t).addScaledVector(VIEW, 60); cam.lookAt(t);
}

/* ---------- блоки: кубы с гранями из ваших тайлов ---------- */
/* свет: солнце почти сверху (чуть со стороны задней стенки) даёт настоящие тени, мягкий свет спереди — объём мусору.
   у блоков яркость каждой грани заранее выровнена, чтобы нарисованные тайлы выглядели как раньше,
   а темнело только то, что попало в тень */
const SUN_DIR = new THREE.Vector3(-.15, 1, -.22).normalize(), FILL_DIR = new THREE.Vector3(.19, .875, .45).normalize();
const AMB = .5, SUN = .55, FILL = .3;
const FACE_K = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].map(a => { const n = new THREE.Vector3(...a);
  return 1 / (AMB + SUN * Math.max(0, n.dot(SUN_DIR)) + FILL * Math.max(0, n.dot(FILL_DIR))) });
const loader = new THREE.TextureLoader();
const MATS = {}, GLOW = {};
function tex(src) { const t = loader.load(src); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.colorSpace = THREE.SRGBColorSpace; return t }
for (const k in TEX) {
  const [R, L, T] = TEX[k].map(tex);
  const mk = () => [R, R, T, T, L, L].map((m, f) => { const mm = new THREE.MeshLambertMaterial({ map: m }); mm.userData.k = FACE_K[f]; mm.color.setScalar(FACE_K[f]); return mm });
  MATS[k] = mk(); GLOW[k] = mk();
}
const matKey = (i, j, z) => { const c = code(i, j, z); return c === '*' || c === 'З' ? ['З', 'З1', 'З2'][hash(i, j, z)] : c };
const boxGeo = new THREE.BoxGeometry(1, BH, 1);
const blocks = new Map();                                   // "i,j,z" -> {mesh, body}
const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -24, 0) });
world.broadphase = new CANNON.SAPBroadphase(world); world.allowSleep = true;
world.solver.iterations = 15;
world.defaultContactMaterial.friction = .4; world.defaultContactMaterial.restitution = 0;   // без отскоков
const G_BLOCK = 1, G_TRASH = 2, G_CHAR = 4;
const blockShape = new CANNON.Box(new CANNON.Vec3(.5, BH / 2, .5));
function addBlock(i, j, z) {
  const k = matKey(i, j, z), mesh = new THREE.Mesh(boxGeo, MATS[k]);
  mesh.position.set(i + .5, -(z + .5) * BH, j + .5); mesh.userData = { kind: 'b', i, j, z, k };
  mesh.matrixAutoUpdate = false; mesh.updateMatrix();       // блоки не двигаются никогда
  mesh.castShadow = mesh.receiveShadow = true;
  scene.add(mesh);
  let body = null;
  if (isAct(i, j) >= 0) {                                    // физика нужна только блокам ямы; декорации отгорожены стенками
    body = new CANNON.Body({ mass: 0, type: CANNON.Body.STATIC, shape: blockShape, position: new CANNON.Vec3(i + .5, -(z + .5) * BH, j + .5), collisionFilterGroup: G_BLOCK, collisionFilterMask: G_TRASH });
    world.addBody(body);
  }
  blocks.set(i + ',' + j + ',' + z, { mesh, body });
}
for (let z = 0; z <= DIG; z++) for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) if (code(i, j, z) !== '.') addBlock(i, j, z);
// невидимые стенки по краю ямы от неба до дна: мусор не вылетит из участка
{ const top = 3, bot = -(DIG + 1) * BH, hh = (top - bot) / 2, cy = (top + bot) / 2;
  for (const [x, z, hx, hz] of [[PIT0 - .5, 3, .5, 1.5], [PIT1 + .5, 3, .5, 1.5], [3, PIT0 - .5, 1.5, .5], [3, PIT1 + .5, 1.5, .5]])
    world.addBody(new CANNON.Body({ mass: 0, type: CANNON.Body.STATIC, shape: new CANNON.Box(new CANNON.Vec3(hx, hh, hz)), position: new CANNON.Vec3(x, cy, z), collisionFilterGroup: G_BLOCK, collisionFilterMask: G_TRASH })) }
function removeBlock(i, j, z) { const b = blocks.get(i + ',' + j + ',' + z); if (!b) return; scene.remove(b.mesh); if (b.body) world.removeBody(b.body); blocks.delete(i + ',' + j + ',' + z) }

/* ---------- свет только для мусора (блоки уже нарисованы с тенью) ---------- */
scene.add(new THREE.AmbientLight(0xffffff, AMB * Math.PI));
const fill = new THREE.DirectionalLight(0xffffff, FILL * Math.PI); fill.position.copy(FILL_DIR); scene.add(fill);
const sun = new THREE.DirectionalLight(0xffffff, SUN * Math.PI); sun.castShadow = true;
sun.shadow.mapSize.set(256, 256);                           // крупные «пиксели» тени — в стиле игры и дёшево
Object.assign(sun.shadow.camera, { left: -3.2, right: 3.2, top: 3.2, bottom: -3.2, near: 1, far: 40 }); sun.shadow.camera.updateProjectionMatrix();
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
const TYPES = {
  coffee: { name: 'Банка кофе', size: 1, mass: 1,
    build(g) { const red = M(0xa8383a), band = M(0xe8d3a0), lid = M(0xc9d3dc);
      part(g, new THREE.CylinderGeometry(.15, .15, .3, 10), [red, lid, lid], 0, .15, 0);
      part(g, new THREE.CylinderGeometry(.153, .153, .09, 10, 1, true), band, 0, .15, 0) },
    shapes: () => [[new CANNON.Cylinder(.15, .15, .3, 10), [0, .15, 0]]] },
  pipe: { name: 'Ржавая труба', size: 2, mass: 2, breaks: 'pipeHalf',
    build(g) { pipeMesh(g, 1.7, 17) },
    shapes: () => [[new CANNON.Cylinder(.075, .075, 1.7, 10), [0, .075, 0], QZ90]] },
  pipeHalf: { name: 'Половина трубы', size: 1, mass: 1,
    build(g) { pipeMesh(g, .82, 5) },
    shapes: () => [[new CANNON.Cylinder(.075, .075, .82, 10), [0, .075, 0], QZ90]] },
};
const trash = [];
const rnd = (a, b) => a + Math.random() * (b - a);
function makeTrash(type, x, y, z, ry, layer) {
  const g = new THREE.Group(); TYPES[type].build(g);
  g.position.set(x, y, z); g.rotation.y = ry; scene.add(g); g.updateMatrixWorld(true);
  const colors = new Map(); g.traverse(o => { if (o.isMesh) colors.set(o, o.material) });
  const t = { type, layer, g, colors, cells: [], active: false, body: null, held: false };
  g.traverse(o => { if (o.isMesh) { o.userData.t = t; o.castShadow = o.receiveShadow = true } });
  trash.push(t); return t;
}
function genTrash() {
  for (let z = 1; z < DIG; z++) {
    if (ACT.some(([i, j]) => code(i, j, z) === '.')) continue;   // только в слоях из 4 заполненных блоков
    if (Math.random() >= .6) continue;                           // мусор в слое с шансом 60%
    const type = Math.random() < 70 / 110 ? 'coffee' : 'pipe';
    let x, zz, ry;
    if (type === 'coffee') { const [i, j] = ACT[Math.random() * 4 | 0]; x = i + .5 + rnd(-.15, .15); zz = j + .5 + rnd(-.15, .15); ry = rnd(0, 6.28) }
    else { const along = Math.random() < .5, row = PIT0 + (Math.random() * 2 | 0); if (along) { x = 3; zz = row + .5; ry = 0 } else { x = row + .5; zz = 3; ry = Math.PI / 2 } }
    const t = makeTrash(type, x, -(z + 1) * BH + .01, zz, ry, z); t.g.visible = false;
    const cells = new Set();                                     // какие клетки ямы задевает предмет
    t.g.traverse(o => { if (!o.isMesh) return; const bb = new THREE.Box3().setFromObject(o);
      for (let a = 0; a < 4; a++) { const [i, j] = ACT[a]; if (bb.max.x > i + .03 && bb.min.x < i + .97 && bb.max.z > j + .03 && bb.min.z < j + .97) cells.add(a) } });
    t.cells = [...cells];
  }
}
function setGrey(t, on) { t.g.traverse(o => { if (o.isMesh) o.material = on ? GREY : t.colors.get(o) }) }
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
  for (let a = 0; a < 4; a++) { const [i, j] = ACT[a]; if (maxX > i + .001 && minX < i + .999 && maxZ > j + .001 && minZ < j + .999) y = Math.max(y, floorY(a)) }
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
  for (let a = 0; a < 4; a++) { const [i, j] = ACT[a], dx = i + .5 - f.c.x, dz = j + .5 - f.c.z;
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
function burst(x, y, z, cols, n, up = 1) { for (let k = 0; k < n; k++) { const m = new THREE.Mesh(pGeo, new THREE.MeshBasicMaterial({ color: cols[k % cols.length] }));
  m.position.set(x + rnd(-.3, .3), y + rnd(-.05, .1), z + rnd(-.3, .3)); scene.add(m); parts.push({ m, v: new THREE.Vector3(rnd(-1.5, 1.5), rnd(1, 3.5) * up, rnd(-1.5, 1.5)), l: rnd(.4, .7) }) } }
function stepParts(dt) { for (let k = parts.length - 1; k >= 0; k--) { const p = parts[k]; p.v.y -= 12 * dt; p.m.position.addScaledVector(p.v, dt); p.l -= dt; if (p.l <= 0) { scene.remove(p.m); p.m.material.dispose(); parts.splice(k, 1) } } }
const CRUMB = { 'Т': ['#46823a', '#25562e', '#4d2b32', '#7a4836'], 'З': ['#ad7757', '#7a4841', '#4d2b32', '#341c27'], 'П': ['#8a5a44', '#5e3a33', '#3d2329', '#2a1820'], 'Г': ['#c06a4a', '#9a4a3a', '#6e3030', '#4a2026'], 'Б': ['#9aa3a8', '#6c757c', '#474e55', '#2c3136'], 'К': ['#a7b0b6', '#7d878e', '#565f66', '#363c42'], 'Р': ['#5fa04a', '#ad7757', '#7a4841', '#3d2329'], 'В': ['#6fb552', '#3f7a35', '#9a4a3a', '#4a2026'], 'Я': ['#5fa04a', '#4d2b32', '#7a4836', '#2a1820'] };

/* ---------- ввод ---------- */
const ray = new THREE.Raycaster();
const ndc = e => { const r = cv.getBoundingClientRect(); return new THREE.Vector2((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1) };
function pick(e) {
  ray.setFromCamera(ndc(e), cam);
  const objs = [...[...blocks.values()].map(b => b.mesh), ...trash.filter(t => t.g.visible).map(t => t.g)];
  return ray.intersectObjects(objs, true)[0] || null;
}
let drag = null, vel = 0, rotP = null; const grabs = new Map();
// вращение предмета в руке: второй палец водит по экрану (или колесо мыши)
function rotateHeld(dx, dy) {
  const len = Math.hypot(dx, dy); if (!len) return;
  const axis = SCR_U.clone().multiplyScalar(dx).addScaledVector(SCR_R, dy).normalize();
  const dq = new THREE.Quaternion().setFromAxisAngle(axis, len / SCALE * .045);
  for (const g of grabs.values()) g.q.premultiply(dq);
}
cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId);
  if (grabs.size && !rotP) { rotP = { id: e.pointerId, x: e.clientX, y: e.clientY }; return }
  const h = pick(e);
  if (h && h.object.userData.t && tool !== 'bar') { const t = h.object.userData.t;
    if (!t.active) { haptic('warn'); return }
    if (t.held) return;
    // зажали: предмет становится «в руке» — двигается только по полу (вбок, от себя, на себя), высоту набирает сам
    const b = t.body; t.held = true;
    b.type = CANNON.Body.KINEMATIC; b.velocity.set(0, 0, 0); b.angularVelocity.set(0, 0, 0); b.updateMassProperties();
    const p0 = new THREE.Vector3(b.position.x, b.position.y, b.position.z);
    grabs.set(e.pointerId, { t, plane: new THREE.Plane(new THREE.Vector3(0, 1, 0), -h.point.y), off: p0.clone().sub(h.point), target: p0.clone(), q: new THREE.Quaternion(b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w) });
    haptic('light'); return }
  if (drag) return;
  drag = { id: e.pointerId, h, y: e.clientY, cam: camTarget, moved: false, lastY: e.clientY, lastT: performance.now() }; vel = 0 });
cv.addEventListener('pointermove', e => {
  if (rotP && rotP.id === e.pointerId) { rotateHeld(e.clientX - rotP.x, e.clientY - rotP.y); rotP.x = e.clientX; rotP.y = e.clientY; return }
  const g = grabs.get(e.pointerId);
  if (g) { ray.setFromCamera(ndc(e), cam); const p = new THREE.Vector3(); if (ray.ray.intersectPlane(g.plane, p)) g.target.set(p.x + g.off.x, 0, p.z + g.off.z); return }
  if (!drag || drag.id !== e.pointerId) return;
  if (!drag.moved && Math.abs(e.clientY - drag.y) / SCALE > 4) { drag.moved = true; drag.y = e.clientY; drag.cam = camTarget }
  if (!drag.moved) return;
  camTarget = clampCam(drag.cam - (e.clientY - drag.y) / SCALE); follow = camTarget >= maxCam();
  const now = performance.now(), dt = Math.max(1, now - drag.lastT); vel = -(e.clientY - drag.lastY) / SCALE / dt * 16; drag.lastY = e.clientY; drag.lastT = now });
function release(g) { const b = g.t.body; g.t.held = false; b.type = CANNON.Body.DYNAMIC; b.updateMassProperties(); b.velocity.set(0, 0, 0); b.angularVelocity.set(0, 0, 0); b.wakeUp(); shadow.visible = false }
const endDrag = (e, cancel) => {
  if (rotP && rotP.id === e.pointerId) { rotP = null; return }
  const g = grabs.get(e.pointerId); if (g) { grabs.delete(e.pointerId); release(g); if (!grabs.size) rotP = null; return }
  if (!drag || drag.id !== e.pointerId) return; const dr = drag, still = performance.now() - dr.lastT > 80; drag = null;
  if (cancel) { vel = 0; return }
  if (!dr.moved) { vel = 0; tap(e) } else if (still) vel = 0 };
cv.addEventListener('pointerup', e => endDrag(e, false));
cv.addEventListener('pointercancel', e => endDrag(e, true));
cv.addEventListener('wheel', e => { e.preventDefault();
  if (grabs.size) { const dq = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.sign(e.deltaY) * Math.PI / 12); for (const g of grabs.values()) g.q.premultiply(dq); return }
  vel = 0; camTarget = clampCam(camTarget + e.deltaY / SCALE * .6); follow = camTarget >= maxCam() }, { passive: false });
function tap(e) {
  const h = pick(e); if (!h) return;
  const t = h.object.userData.t;
  if (t) {                                                   // лом: ломаем предмет в заранее заданной точке
    if (tool !== 'bar') return;
    if (!t.active || !TYPES[t.type].breaks) { nudge(barBtn); return }
    breakTrash(t); return }
  const { i, j, z } = h.object.userData, a = isAct(i, j); if (a < 0 || !diggable(a, z)) return;
  if (tool !== 'pick') { nudge(pickBtn); return }
  if (!reach(a)) { haptic('warn'); return }                    // копает персонаж: только блок под ногами или стенку рядом
  if (a !== charCell()) { const [ci, cj] = ACT[a]; const v = new THREE.Vector3(ci + .5 - CH.x, 0, cj + .5 - CH.z); v.x = Math.abs(v.x) > Math.abs(v.z) ? Math.sign(v.x) : 0; v.z = v.x ? 0 : Math.sign(v.z); CH.face.copy(v) }
  digCell(a);
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
  shake = 6; haptic('heavy'); toast('Сломано: ' + TYPES[t.type].name);
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
  for (const b of blocks.values()) { saved.push([b.mesh, b.mesh.material]); b.mesh.material = ID_BLOCK }
  trash.forEach((t, k) => { if (!t.idMat) t.idMat = new THREE.MeshBasicMaterial();
    t.idMat.color.setRGB((k % 250 + 1) / 255, 0, 0);
    t.g.traverse(o => { if (o.isMesh) { saved.push([o, o.material]); o.material = t.idMat } }) });
  chG.traverse(o => { if (o.isMesh) { saved.push([o, o.material]); o.material = CH_ID } });
  const shV = shadow.visible; shadow.visible = false; for (const p of parts) p.m.visible = false;
  renderer.setRenderTarget(idRT); renderer.clear(); renderer.render(scene, cam); renderer.setRenderTarget(null);
  for (const [o, m] of saved) o.material = m; shadow.visible = shV; for (const p of parts) p.m.visible = true;
  renderer.autoClear = false; renderer.render(olScene, cam); renderer.autoClear = true;
}

/* ---------- персонаж (заглушка: девочка в жёлтом дождевике) ----------
   ходит джойстиком; у обрыва останавливается и смотрит вниз, у стенки — смотрит вверх;
   если продолжать держать джойстик в ту сторону — прыгает вниз или залезает */
const CH = { x: 3.5, z: 3.5, y: 0, face: new THREE.Vector3(0, 0, 1), state: 'walk', t: 0, vy: 0, anim: null, walkT: 0, moving: false, land: 0, swing: 0, yaw: 0 };
CH.y = floorY(3);
const R = .13, SPEED = 1.5;
const G_UP = new THREE.Vector3(-1, 0, -1).normalize();          // «вверх по экрану» на полу
const cellAt = (x, z) => ACT.findIndex(([i, j]) => x >= i && x < i + 1 && z >= j && z < j + 1);
const charCell = () => cellAt(CH.x, CH.z);
function reach(a) {                                            // можно ли копать блок клетки a, стоя там, где стоим
  const c = charCell(); if (c < 0) return false; if (a === c) return true;
  if (floorY(a) <= floorY(c) + .01) return false;              // соседняя клетка должна быть выше — это стенка перед нами
  const [i, j] = ACT[a], dx = Math.max(i - CH.x, 0, CH.x - (i + 1)), dz = Math.max(j - CH.z, 0, CH.z - (j + 1));
  return Math.hypot(dx, dz) < R + .3;
}
const chG = new THREE.Group(), chBody = new THREE.Group(); chG.add(chBody); scene.add(chG);
const CH_ID = new THREE.MeshBasicMaterial({ color: new THREE.Color(252 / 255, 0, 0) });
{ const coat = M(0xe8b830), coatD = M(0xc4921f), skin = M(0xefcfae), dark = M(0x1d1822), boot = M(0x3a2a26);
  const pivot = (parent, x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g };
  CH.legs = [-1, 1].map(s => { const g = pivot(chBody, s * .04, .09, 0); part(g, new THREE.BoxGeometry(.05, .09, .06), boot, 0, -.045, 0); return g });
  part(chBody, new THREE.CylinderGeometry(.07, .125, .25, 8), coat, 0, .205, 0);
  CH.arms = [-1, 1].map(s => { const g = pivot(chBody, s * .1, .3, 0); part(g, new THREE.BoxGeometry(.045, .14, .05), coatD, 0, -.07, 0); return g });
  CH.head = pivot(chBody, 0, .36, 0);
  part(CH.head, new THREE.SphereGeometry(.08, 8, 6), skin, 0, 0, .02);
  part(CH.head, new THREE.SphereGeometry(.1, 8, 6), coat, 0, .015, -.025);
  part(CH.head, new THREE.ConeGeometry(.04, .09, 6), coat, 0, .11, -.04, 0, -.35);     // острый капюшон
  for (const s of [-1, 1]) part(CH.head, new THREE.BoxGeometry(.018, .024, .01), dark, s * .03, 0, .1);
  chG.traverse(o => { if (o.isMesh) o.castShadow = o.receiveShadow = true }) }
const chP = new CANNON.Body({ mass: 0, type: CANNON.Body.KINEMATIC, shape: new CANNON.Cylinder(.12, .12, .45, 8), collisionFilterGroup: G_CHAR, collisionFilterMask: G_TRASH });
world.addBody(chP);

/* джойстик и кнопка действия */
const joy = { x: 0, y: 0, id: null }, keys = new Set();
const jb = document.createElement('div'), jk = document.createElement('div');
jb.style.cssText = 'position:absolute;left:16px;bottom:16px;width:104px;height:104px;border-radius:50%;background:rgba(10,14,22,.35);border:2px solid rgba(233,240,238,.35);touch-action:none;z-index:5';
jk.style.cssText = 'position:absolute;left:30px;top:30px;width:40px;height:40px;border-radius:50%;background:rgba(233,240,238,.8);pointer-events:none';
jb.setAttribute('aria-label', 'Джойстик'); jb.appendChild(jk); stage.appendChild(jb);
function joyMove(e) { const r = jb.getBoundingClientRect(); let x = (e.clientX - r.left - r.width / 2) / (r.width / 2 - 20), y = (e.clientY - r.top - r.height / 2) / (r.height / 2 - 20);
  const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l } joy.x = x; joy.y = y; jk.style.transform = `translate(${x * 32}px,${y * 32}px)`; follow = true }
jb.addEventListener('pointerdown', e => { e.preventDefault(); jb.setPointerCapture(e.pointerId); joy.id = e.pointerId; joyMove(e) });
jb.addEventListener('pointermove', e => { if (joy.id === e.pointerId) joyMove(e) });
const joyEnd = e => { if (joy.id !== e.pointerId) return; joy.id = null; joy.x = joy.y = 0; jk.style.transform = '' };
jb.addEventListener('pointerup', joyEnd); jb.addEventListener('pointercancel', joyEnd);
const ab = document.createElement('button');
ab.style.cssText = 'position:absolute;right:16px;bottom:26px;width:76px;height:76px;border-radius:50%;background:rgba(10,14,22,.45);border:2px solid rgba(233,240,238,.45);z-index:5;display:grid;place-items:center;touch-action:none;padding:0';
ab.setAttribute('aria-label', 'Применить инструмент'); stage.appendChild(ab);
function abIcon() { ab.innerHTML = ''; if (!tool) return;
  const c = tool === 'pick' ? icon(PICK, { k: '#10141f', s: '#c9d3dc', S: '#7d8c9c', w: '#a8683c', W: '#6b3f28' }) : icon(BAR, { k: '#10141f', r: '#c8423a', R: '#7a2420' });
  c.style.cssText = 'width:44px;height:44px;image-rendering:pixelated'; ab.appendChild(c) }
abIcon();
ab.addEventListener('pointerdown', e => { e.preventDefault(); act() });
addEventListener('keydown', e => { keys.add(e.code); if (e.code === 'Space' || e.code === 'KeyE') { e.preventDefault(); if (!e.repeat) act() } if (/Arrow|Key[WASD]/.test(e.code)) { e.preventDefault(); follow = true } });
addEventListener('keyup', e => keys.delete(e.code));

function digCell(a) {
  const [i, j] = ACT[a], z = d[a], b = blocks.get(i + ',' + j + ',' + z), k = b ? b.mesh.userData.k : 'З';
  removeBlock(i, j, z); burst(i + .5, -z * BH, j + .5, CRUMB[k] || CRUMB[k[0]] || CRUMB['З'], 16);
  d[a]++; settle(); updateTrash(); shake = 5; haptic('light'); CH.swing = .3;
}
function act() {
  if (!tool) { haptic('warn'); return }
  if (CH.state === 'jump' || CH.state === 'fall') return;
  if (tool === 'bar') {                                        // лом: ближайший ломаемый предмет перед персонажем
    let best = null, bd = .95;
    for (const t of trash) { if (!t.active || !TYPES[t.type].breaks) continue; const p = t.body.position, dx = p.x - CH.x, dz = p.z - CH.z, dist = Math.hypot(dx, dz);
      if (Math.abs(p.y - CH.y) < .7 && dist < bd && dx * CH.face.x + dz * CH.face.z > -.05) { bd = dist; best = t } }
    if (best) { CH.swing = .3; breakTrash(best) } else haptic('warn'); return }
  const a = charCell(), nb = cellAt(CH.x + CH.face.x * (R + .25), CH.z + CH.face.z * (R + .25));
  if (nb >= 0 && nb !== a && floorY(nb) > floorY(a) + .01) { if (diggable(nb, d[nb])) digCell(nb); else haptic('warn'); return }   // стенка перед нами
  if (a >= 0 && diggable(a, d[a])) { digCell(a); return }      // блок под ногами — после него падаем вниз
  haptic('warn');
}
function stepChar(dt) {
  let ix = joy.x, iy = joy.y;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) ix -= 1; if (keys.has('KeyD') || keys.has('ArrowRight')) ix += 1;
  if (keys.has('KeyW') || keys.has('ArrowUp')) iy -= 1; if (keys.has('KeyS') || keys.has('ArrowDown')) iy += 1;
  const dir = SCR_R.clone().multiplyScalar(ix).addScaledVector(G_UP, -iy); dir.y = 0;
  const m = Math.min(1, dir.length()); if (m > 0) dir.normalize();
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
    if (CH.y <= fl) { if (CH.vy < -4) { shake = Math.max(shake, 3); haptic('medium') } CH.vy = 0; CH.land = .16; CH.state = 'walk' }
  } else {
    CH.y = fl; CH.vy = 0; if (CH.state === 'fall') CH.state = 'walk';
    if (m < .15) { if (CH.state !== 'walk') CH.state = 'walk'; CH.t = 0 }
    else {
      CH.face.copy(dir);
      const step = SPEED * m * dt; let blocked = null;
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
          const ad = blocked.ad, x1 = CH.x + ad.x * (2 * R + .12), z1 = CH.z + ad.z * (2 * R + .12);
          CH.anim = { kind: kind === 'edge' ? 'down' : 'climb', t: 0, dur: kind === 'edge' ? .35 + .07 * Math.min(4, (fl - blocked.h) / BH) : .62, x0: CH.x, z0: CH.z, y0: CH.y, x1, z1, y1: blocked.h };
          CH.state = 'jump';
        }
      } else if (CH.state !== 'walk') { CH.state = 'walk'; CH.t = 0 }
    }
  }
  chP.position.set(CH.x, CH.y + .225, CH.z);                    // толкаем мусор телом
  chP.velocity.set((CH.x - p0x) / Math.max(dt, 1e-3), (CH.y - p0y) / Math.max(dt, 1e-3), (CH.z - p0z) / Math.max(dt, 1e-3));
}
const lerp = (a, b, k) => a + (b - a) * k;
function drawChar(dt, now) {
  chG.position.set(CH.x, CH.y, CH.z);
  let dy = Math.atan2(CH.face.x, CH.face.z) - CH.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); CH.yaw += dy * Math.min(1, dt * 14); chG.rotation.y = CH.yaw;
  if (CH.moving) CH.walkT += dt * 11;
  const sw = CH.moving ? Math.sin(CH.walkT) : 0, st = CH.state, climb = st === 'jump' && CH.anim.kind === 'climb', down = st === 'jump' && CH.anim.kind === 'down';
  const lean = st === 'edge' ? .42 : climb ? .25 : 0;           // у обрыва наклоняется вперёд
  const headX = st === 'edge' ? .55 : st === 'wall' ? -.5 : climb ? -.3 : 0;   // смотрит вниз / вверх
  const armX = st === 'wall' || climb ? -2.7 : down ? -1.2 : st === 'edge' ? .35 : -sw * .6;
  CH.swing = Math.max(0, CH.swing - dt);
  chBody.rotation.x = lerp(chBody.rotation.x, lean, Math.min(1, dt * 10));
  CH.head.rotation.x = lerp(CH.head.rotation.x, headX, Math.min(1, dt * 10));
  CH.arms[0].rotation.x = lerp(CH.arms[0].rotation.x, armX, Math.min(1, dt * 14));
  CH.arms[1].rotation.x = CH.swing > 0 ? -2.6 + (1 - CH.swing / .3) * 3.4 : lerp(CH.arms[1].rotation.x, st === 'wall' || climb ? -2.7 : down ? -1.2 : st === 'edge' ? .35 : sw * .6, Math.min(1, dt * 14));
  CH.legs[0].rotation.x = sw * .7; CH.legs[1].rotation.x = -sw * .7;
  CH.land = Math.max(0, CH.land - dt);
  chBody.position.y = CH.moving ? Math.abs(Math.sin(CH.walkT)) * .02 : 0;
  chBody.scale.set(1 + CH.land * .9, 1 - CH.land * 1.4, 1 + CH.land * .9);   // приземление — сплющивается
}

/* ---------- цикл ---------- */
let last = performance.now(), acc = 0;
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  for (const g of grabs.values()) stepHeld(g);
  stepChar(dt); world.step(1 / 120, dt, 8); drawChar(dt, now);
  for (const t of trash) if (t.body) {
    if (!t.held) depenetrate(t);
    t.g.quaternion.copy(t.body.quaternion); t.g.position.copy(t.body.position).sub(t.com.clone().applyQuaternion(t.g.quaternion));
    const vy = t.body.velocity.y;                             // удар об пол: тряска и пыль — один раз за падение
    if (!t.held && t.falling && vy > -1) { t.falling = false; if (t.fallV < -5) { shake = Math.max(shake, 3); haptic('medium'); const p = t.g.position; burst(p.x, p.y + .05, p.z, ['#8c7a6a', '#5e4c42', '#b8a48c'], 10, .5) } }
    if (!t.held && vy < -3) { t.falling = true; t.fallV = Math.min(t.fallV || 0, vy) } else if (!t.falling) t.fallV = 0;
  }
  stepParts(dt);
  // подсветка блоков, которые можно копать
  const pulse = 1 + (.12 + .1 * Math.sin(now / 260)) * (tool === 'pick' ? 1 : 0);
  for (const k in GLOW) for (const m of GLOW[k]) m.color.setScalar(m.userData.k * pulse);
  for (let a = 0; a < 4; a++) for (const z of [d[a] - 1, d[a]]) { const b = blocks.get(ACT[a][0] + ',' + ACT[a][1] + ',' + z); if (b) { const u = b.mesh.userData; b.mesh.material = tool === 'pick' && diggable(a, u.z) && reach(a) ? GLOW[u.k] : MATS[u.k] } }
  if (follow) camTarget = clampCam(-CH.y / BH * 32);
  if (!drag && Math.abs(vel) > .05) { camTarget = clampCam(camTarget + vel); vel *= .92; if (camTarget >= maxCam()) follow = true }
  if (drag) camY = camTarget; else { camY += (camTarget - camY) * .18; if (Math.abs(camTarget - camY) < .3) camY = camTarget }
  // рисуем только слои рядом с камерой
  const cl = Math.round(camY) / 32, z0 = Math.floor(cl - 8), z1 = Math.ceil(cl + 14);
  for (const b of blocks.values()) b.mesh.visible = b.mesh.userData.z >= z0 && b.mesh.userData.z <= z1;
  placeCam();
  // солнце едет вместе с камерой по слоям (ступенькой, чтобы тень не мерцала)
  const ty = -Math.round(camY / 32) * BH; sun.target.position.set(3, ty, 3); sun.position.copy(sun.target.position).addScaledVector(SUN_DIR, 15); sun.target.updateMatrixWorld();
  renderer.shadowMap.needsUpdate = true;
  renderer.render(scene, cam);
  drawOutlines();
  document.getElementById('depth').textContent = '3D · ' + Math.round(-CH.y / BH) + ' / ' + DIG;
  requestAnimationFrame(frame);
}
genTrash(); resize(); addEventListener('resize', resize); if (tg && tg.onEvent) tg.onEvent('viewportChanged', resize);
window.__dbg = { CH, act, joy, d, trash, blocks, world, settle, updateTrash, cur, removeBlock, activate, breakTrash, setTool, grabs };
requestAnimationFrame(frame);
