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
let tool = null;
function setTool(t) { tool = tool === t ? null : t; pickBtn.setAttribute('aria-pressed', tool === 'pick'); barBtn.setAttribute('aria-pressed', tool === 'bar'); haptic('light') }
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
const maxCam = () => Math.min(cur(), DIG - 1) * 32;
const clampCam = v => Math.max(0, Math.min(maxCam(), v));
function placeCam() {
  const upPx = Math.round(0.2 * H);                        // верх ямы на ~30% высоты экрана
  const t = new THREE.Vector3(3, -(upPx / PX) / C30 - Math.round(camY) / 32 * BH, 3);
  if (shake > 0) { t.addScaledVector(SCR_R, (Math.random() < .5 ? -1 : 1) / PX).addScaledVector(SCR_U, (Math.random() < .5 ? -1 : 0) / PX); shake-- }
  cam.position.copy(t).addScaledVector(VIEW, 60); cam.lookAt(t);
}

/* ---------- блоки: кубы с гранями из ваших тайлов ---------- */
const loader = new THREE.TextureLoader();
const MATS = {}, GLOW = {};
function tex(src) { const t = loader.load(src); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.colorSpace = THREE.SRGBColorSpace; return t }
for (const k in TEX) {
  const [R, L, T] = TEX[k].map(tex);
  const mk = () => [R, R, T, T, L, L].map(m => new THREE.MeshBasicMaterial({ map: m }));
  MATS[k] = mk(); GLOW[k] = mk();
}
const matKey = (i, j, z) => { const c = code(i, j, z); return c === '*' || c === 'З' ? ['З', 'З1', 'З2'][hash(i, j, z)] : c };
const boxGeo = new THREE.BoxGeometry(1, BH, 1);
const blocks = new Map();                                   // "i,j,z" -> {mesh, body}
const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -24, 0) });
world.broadphase = new CANNON.SAPBroadphase(world); world.allowSleep = true;
world.solver.iterations = 15;
world.defaultContactMaterial.friction = .7; world.defaultContactMaterial.restitution = 0;   // без отскоков
const G_BLOCK = 1, G_TRASH = 2;
const blockShape = new CANNON.Box(new CANNON.Vec3(.5, BH / 2, .5));
function addBlock(i, j, z) {
  const k = matKey(i, j, z), mesh = new THREE.Mesh(boxGeo, MATS[k]);
  mesh.position.set(i + .5, -(z + .5) * BH, j + .5); mesh.userData = { kind: 'b', i, j, z, k };
  mesh.matrixAutoUpdate = false; mesh.updateMatrix();       // блоки не двигаются никогда
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
scene.add(new THREE.AmbientLight(0xffffff, .32 * Math.PI));
const sun = new THREE.DirectionalLight(0xffffff, .8 * Math.PI); sun.position.set(.19, .875, .45); scene.add(sun);

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
  g.traverse(o => { if (o.isMesh) o.userData.t = t });
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
  // сильное торможение движения и вращения + быстрое «засыпание»: предметы ведут себя спокойно и тяжело
  const body = new CANNON.Body({ mass: TYPES[t.type].mass, collisionFilterGroup: G_TRASH, collisionFilterMask: G_BLOCK, linearDamping: .35, angularDamping: .75 });
  for (const [s, o, q] of TYPES[t.type].shapes()) body.addShape(s, new CANNON.Vec3(...o), q);
  body.position.set(t.g.position.x, t.g.position.y, t.g.position.z);
  body.quaternion.set(t.g.quaternion.x, t.g.quaternion.y, t.g.quaternion.z, t.g.quaternion.w);
  body.sleepSpeedLimit = .25; body.sleepTimeLimit = .3;
  world.addBody(body); t.body = body;
  // габариты предмета относительно его центра — для проверки по сетке и тени
  const inv = t.g.matrixWorld.clone().invert(), bb = new THREE.Box3();
  t.g.traverse(o => { if (o.isMesh) { o.geometry.computeBoundingBox(); bb.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld).applyMatrix4(inv)) } });
  t.local = bb;
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
function placeShadow(t, pos, floor) {                        // след предмета на полу по его собственным осям
  const q = new THREE.Quaternion(t.body.quaternion.x, t.body.quaternion.y, t.body.quaternion.z, t.body.quaternion.w);
  const ax = new THREE.Vector3(1, 0, 0).applyQuaternion(q); ax.y = 0; if (ax.lengthSq() < 1e-3) ax.set(1, 0, 0); ax.normalize();
  const az = new THREE.Vector3(-ax.z, 0, ax.x), v = new THREE.Vector3();
  let a0 = 1e9, a1 = -1e9, b0 = 1e9, b1 = -1e9;
  for (const x of [t.local.min.x, t.local.max.x]) for (const y of [t.local.min.y, t.local.max.y]) for (const z of [t.local.min.z, t.local.max.z]) {
    v.set(x, y, z).applyQuaternion(q); const a = v.dot(ax), b = v.dot(az); a0 = Math.min(a0, a); a1 = Math.max(a1, a); b0 = Math.min(b0, b); b1 = Math.max(b1, b) }
  shadow.visible = true; shadow.rotation.y = Math.atan2(-ax.z, ax.x); shadow.scale.set(a1 - a0, 1, b1 - b0);
  shadow.position.copy(pos).addScaledVector(ax, (a0 + a1) / 2).addScaledVector(az, (b0 + b1) / 2); shadow.position.y = floor + .004;
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
  const { i, j, z, k } = h.object.userData, a = isAct(i, j); if (a < 0 || !diggable(a, z)) return;
  if (tool !== 'pick') { nudge(pickBtn); return }
  removeBlock(i, j, z); burst(i + .5, -z * BH, j + .5, CRUMB[k] || CRUMB[k[0]] || CRUMB['З'], 16);
  d[a]++; settle(); updateTrash(); shake = 5; haptic('light');
}
function breakTrash(t) {
  const b = t.body, kind = TYPES[t.type].breaks, q = b.quaternion, ry = t.g.rotation.y;
  removeTrash(t);
  for (const s of [-1, 1]) {                                 // две половины на месте целой трубы, с лёгким толчком в стороны
    const p = b.pointToWorldFrame(new CANNON.Vec3(s * .43, 0, 0));
    const h = makeTrash(kind, p.x, p.y, p.z, 0, -1); h.g.quaternion.set(q.x, q.y, q.z, q.w); h.g.updateMatrixWorld(true);
    activate(h); const dir = q.vmult(new CANNON.Vec3(s, 0, 0));
    h.body.velocity.set(dir.x * 1.6, 2.2, dir.z * 1.6);
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
  // плавно идём к пальцу, но не быстрее 0.25 клетки за кадр
  const want = new THREE.Vector3(g.target.x - cur3.x, 0, g.target.z - cur3.z); if (want.length() > .25) want.setLength(.25);
  const nx = cur3.clone().add(want);
  // не даём выйти за края ямы
  let bb = worldBox(t, nx);
  if (bb.min.x < PIT0) nx.x += PIT0 - bb.min.x; if (bb.max.x > PIT1) nx.x -= bb.max.x - PIT1;
  if (bb.min.z < PIT0) nx.z += PIT0 - bb.min.z; if (bb.max.z > PIT1) nx.z -= bb.max.z - PIT1;
  bb = worldBox(t, nx);
  // высота: чуть выше самого высокого блока под предметом — перед выступом предмет приподнимается сам
  const floor = floorUnder(bb.min.x, bb.max.x, bb.min.z, bb.max.z), lift = .08;
  const needY = floor + lift + (nx.y - bb.min.y);
  nx.y = needY > cur3.y ? needY : cur3.y + (needY - cur3.y) * .3;   // вверх сразу, вниз — плавно
  b.position.set(nx.x, nx.y, nx.z); b.velocity.set(0, 0, 0);
  placeShadow(t, nx, floor);
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
  const shV = shadow.visible; shadow.visible = false; for (const p of parts) p.m.visible = false;
  renderer.setRenderTarget(idRT); renderer.clear(); renderer.render(scene, cam); renderer.setRenderTarget(null);
  for (const [o, m] of saved) o.material = m; shadow.visible = shV; for (const p of parts) p.m.visible = true;
  renderer.autoClear = false; renderer.render(olScene, cam); renderer.autoClear = true;
}

/* ---------- цикл ---------- */
let last = performance.now(), acc = 0;
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  for (const g of grabs.values()) stepHeld(g);
  world.step(1 / 120, dt, 8);
  for (const t of trash) if (t.body) {
    if (!t.held) depenetrate(t);
    t.g.position.copy(t.body.position); t.g.quaternion.copy(t.body.quaternion);
    const vy = t.body.velocity.y;                             // удар об пол: тряска и пыль — один раз за падение
    if (!t.held && t.falling && vy > -1) { t.falling = false; if (t.fallV < -5) { shake = Math.max(shake, 3); haptic('medium'); const p = t.g.position; burst(p.x, p.y + .05, p.z, ['#8c7a6a', '#5e4c42', '#b8a48c'], 10, .5) } }
    if (!t.held && vy < -3) { t.falling = true; t.fallV = Math.min(t.fallV || 0, vy) } else if (!t.falling) t.fallV = 0;
  }
  stepParts(dt);
  // подсветка блоков, которые можно копать
  const pulse = 1 + (.12 + .1 * Math.sin(now / 260)) * (tool === 'pick' ? 1 : 0);
  for (const k in GLOW) for (const m of GLOW[k]) m.color.setScalar(pulse);
  for (let a = 0; a < 4; a++) for (const z of [d[a] - 1, d[a]]) { const b = blocks.get(ACT[a][0] + ',' + ACT[a][1] + ',' + z); if (b) { const u = b.mesh.userData; b.mesh.material = tool === 'pick' && diggable(a, u.z) ? GLOW[u.k] : MATS[u.k] } }
  if (follow) camTarget = maxCam();
  if (!drag && Math.abs(vel) > .05) { camTarget = clampCam(camTarget + vel); vel *= .92; if (camTarget >= maxCam()) follow = true }
  if (drag) camY = camTarget; else { camY += (camTarget - camY) * .18; if (Math.abs(camTarget - camY) < .3) camY = camTarget }
  // рисуем только слои рядом с камерой
  const cl = Math.round(camY) / 32, z0 = Math.floor(cl - 8), z1 = Math.ceil(cl + 14);
  for (const b of blocks.values()) b.mesh.visible = b.mesh.userData.z >= z0 && b.mesh.userData.z <= z1;
  placeCam();
  renderer.render(scene, cam);
  if (trash.some(t => t.g.visible)) drawOutlines();
  document.getElementById('depth').textContent = '3D · ' + Math.min(cur(), DIG) + ' / ' + DIG;
  requestAnimationFrame(frame);
}
genTrash(); resize(); addEventListener('resize', resize); if (tg && tg.onEvent) tg.onEvent('viewportChanged', resize);
window.__dbg = { d, trash, blocks, world, settle, updateTrash, cur, removeBlock, activate, breakTrash, setTool, grabs };
requestAnimationFrame(frame);
