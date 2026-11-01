import * as THREE from 'three';
import * as CANNON from 'cannon-es';

/* ===== 3D-проба: та же яма 2×2 на 30 слоёв, но настоящие кубы и физика мусора ===== */
const PLOT = window.PLOT3D, TEX = window.TEX3D;
const N = 3, DIG = PLOT.length;
const ACT = [[1,1],[2,1],[1,2],[2,2]];
const BH = 0.8165;              // высота блока: так кубы выглядят ровно как изометрические спрайты 64×32+32
const PX = 64 / Math.SQRT2;     // пикселей на единицу мира (ромб верха = 64 px)

/* ---------- Telegram ---------- */
const tg = window.Telegram && window.Telegram.WebApp;
if (tg) { try { tg.ready(); tg.expand(); tg.disableVerticalSwipes && tg.disableVerticalSwipes(); tg.setHeaderColor('#1b2a3a'); tg.setBackgroundColor('#1b2a3a'); tg.setBottomBarColor && tg.setBottomBarColor('#14202c') } catch (e) {} }
const haptic = k => { try { tg && tg.HapticFeedback && (k === 'warn' ? tg.HapticFeedback.notificationOccurred('warning') : tg.HapticFeedback.impactOccurred(k)) } catch (e) {} };

/* ---------- иконки (как в 2D) ---------- */
function icon(rows, pal, host) { const c = document.createElement('canvas'); c.width = c.height = rows.length; const x = c.getContext('2d');
  rows.forEach((r, y) => [...r].forEach((ch, i) => { if (pal[ch]) { x.fillStyle = pal[ch]; x.fillRect(i, y, 1, 1) } })); if (host) host.appendChild(c); return c }
const PICK = ["................", ".....kkkkkk.....", "...kksssssSkk...", "..ksSSkkkkSSsk..", ".ksSk.kwWk.kSsk.", ".kSk..kwWk..kSk.", ".kk...kwWk...kk.", "......kwWk......", "......kwWk......", "......kwWk......", "......kwWk......", "......kwWk......", "......kwWk......", "......kWWk......", ".......kk.......", "................"];
icon(PICK, { k: '#10141f', s: '#c9d3dc', S: '#7d8c9c', w: '#a8683c', W: '#6b3f28' }, document.getElementById('pick'));
const MAPI = ["................", "................", ".kkkkkkkkkkkkkk.", ".kppppPPPPppppk.", ".kpggpPPPPpppbk.", ".kpggpPPPbpprpk.", ".kpppbPPbPprrpk.", ".kpppbPPPPpprpk.", ".kppbpPPPPppppk.", ".kpbppPPPPpgggk.", ".kbpppPPPPpgggk.", ".kppppPPPPppppk.", ".kkkkkkkkkkkkkk.", "................", "................", "................"];
icon(MAPI, { k: '#10141f', p: '#e7d7a4', P: '#c4ad74', g: '#5f9c4f', b: '#7a4836', r: '#c8423a' }, document.getElementById('mapbtn'));
const XI = ["................", ".kk..........kk.", ".kxk........kxk.", "..kxk......kxk..", "...kxk....kxk...", "....kxk..kxk....", ".....kxkkxk.....", "......kxxk......", "......kxxk......", ".....kxkkxk.....", "....kxk..kxk....", "...kxk....kxk...", "..kxk......kxk..", ".kxk........kxk.", ".kk..........kk.", "................"];

/* ---------- состояние раскопа ---------- */
const d = [0, 0, 0, 0];
const code = (i, j, z) => z < DIG ? PLOT[z][j][i] : '*';
function settle() { for (let a = 0; a < 4; a++) while (d[a] < DIG && code(ACT[a][0], ACT[a][1], d[a]) === '.') d[a]++ }
settle();
const cur = () => Math.min(...d);
const isAct = (i, j) => ACT.findIndex(a => a[0] === i && a[1] === j);
const hash = (a, b, c) => { let h = (a * 73856093) ^ (b * 19349663) ^ (c * 83492791); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) % 3 };
const diggable = (a, z) => d[a] === z && z === cur() && z < DIG;
let active = false;

/* ---------- рендер в низком разрешении, растянутый без сглаживания ---------- */
const stage = document.getElementById('stage'), cv = document.getElementById('cv'), bgc = document.getElementById('bg');
const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: false, alpha: true });
renderer.setPixelRatio(1);
const scene = new THREE.Scene();
const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
const VIEW = new THREE.Vector3(Math.cos(Math.PI / 6) * Math.SQRT1_2, 0.5, Math.cos(Math.PI / 6) * Math.SQRT1_2); // 30° сверху, 45° вбок
let W = 200, H = 300, SCALE = 2;
function resize() {
  const r = stage.getBoundingClientRect();
  SCALE = Math.max(1, Math.floor(r.width / 176)); W = Math.ceil(r.width / SCALE); H = Math.ceil(r.height / SCALE);
  renderer.setSize(W, H, false);
  for (const c of [cv, bgc]) { c.style.width = W * SCALE + 'px'; c.style.height = H * SCALE + 'px' }
  cam.left = -W / 2 / PX; cam.right = W / 2 / PX; cam.top = H / 2 / PX; cam.bottom = -H / 2 / PX; cam.updateProjectionMatrix();
  makeBg();
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
/* камера: px — сдвиг вниз в пикселях, как в 2D (32 px = один слой) */
let camY = 0, camTarget = 0, follow = true, shake = 0;
const maxCam = () => Math.min(cur(), DIG - 1) * 32;
const clampCam = v => Math.max(0, Math.min(maxCam(), v));
function placeCam() {
  const up = 0.2 * H / PX / Math.cos(Math.PI / 6);           // верх ямы на ~30% высоты экрана
  const t = new THREE.Vector3(2, -up - camY / 32 * BH, 2);
  if (shake > 0) { t.x += (Math.random() - .5) * .03; t.y += (Math.random() - .5) * .03; shake-- }
  cam.position.copy(t).addScaledVector(VIEW, 60); cam.lookAt(t);
}

/* ---------- блоки: кубы с гранями из ваших тайлов ---------- */
const loader = new THREE.TextureLoader();
const MATS = {}, GLOW = {};
function tex(src) { const t = loader.load(src); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.colorSpace = THREE.SRGBColorSpace; return t }
for (const k in TEX) {
  const [R, L, T] = TEX[k].map(tex);
  const mk = c => [R, R, T, T, L, L].map(m => new THREE.MeshBasicMaterial({ map: m, color: c }));
  MATS[k] = mk(0xffffff); GLOW[k] = mk(0xffffff);
}
const matKey = (i, j, z) => { const c = code(i, j, z); return c === '*' || c === 'З' ? ['З', 'З1', 'З2'][hash(i, j, z)] : c };
const boxGeo = new THREE.BoxGeometry(1, BH, 1);
const blocks = new Map();                 // "i,j,z" -> {mesh, body}
const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -28, 0) });
world.broadphase = new CANNON.SAPBroadphase(world); world.allowSleep = true;
const G_BLOCK = 1, G_TRASH = 2;
const blockShape = new CANNON.Box(new CANNON.Vec3(.5, BH / 2, .5));
function addBlock(i, j, z) {
  const k = matKey(i, j, z), mesh = new THREE.Mesh(boxGeo, MATS[k]);
  mesh.position.set(i + .5, -(z + .5) * BH, j + .5); mesh.userData = { kind: 'b', i, j, z, k };
  scene.add(mesh);
  const body = new CANNON.Body({ mass: 0, shape: blockShape, position: new CANNON.Vec3(i + .5, -(z + .5) * BH, j + .5), collisionFilterGroup: G_BLOCK, collisionFilterMask: G_TRASH });
  world.addBody(body); blocks.set(i + ',' + j + ',' + z, { mesh, body });
}
for (let z = 0; z <= DIG; z++) for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) if (code(i, j, z) !== '.') addBlock(i, j, z);
function removeBlock(i, j, z) { const b = blocks.get(i + ',' + j + ',' + z); if (!b) return; scene.remove(b.mesh); world.removeBody(b.body); blocks.delete(i + ',' + j + ',' + z) }

/* ---------- свет только для мусора (блоки уже нарисованы с тенью) ---------- */
scene.add(new THREE.AmbientLight(0xffffff, .32 * Math.PI));
const sun = new THREE.DirectionalLight(0xffffff, .8 * Math.PI); sun.position.set(.19, .875, .45); scene.add(sun);

/* ---------- мусор: модели из простых фигур, высота не больше половины блока ---------- */
const M = (c) => new THREE.MeshLambertMaterial({ color: c, flatShading: true });
const GREY = new THREE.MeshLambertMaterial({ color: 0x8a8f96, flatShading: true });
function part(g, geo, mat, x, y, z, ry = 0, rx = 0, rz = 0) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); g.add(m); return m }
const TYPES = {
  coffee: { name: 'Банка кофе', size: 1, mass: 1,
    build(g) { const red = M(0xa8383a), band = M(0xe8d3a0), lid = M(0xc9d3dc);
      part(g, new THREE.CylinderGeometry(.15, .15, .3, 10), [red, lid, lid], 0, .15, 0);
      part(g, new THREE.CylinderGeometry(.153, .153, .09, 10, 1, true), band, 0, .15, 0) },
    shapes: () => [[new CANNON.Cylinder(.15, .15, .3, 10), [0, .15, 0]]] },
  beam: { name: 'Металлическая балка', size: 2, mass: 4,
    build(g) { const st = M(0x7f8c96), rust = M(0xa35a2c);
      part(g, new THREE.BoxGeometry(1.7, .05, .3), st, 0, .025, 0);
      part(g, new THREE.BoxGeometry(1.7, .2, .06), st, 0, .15, 0);
      part(g, new THREE.BoxGeometry(1.7, .05, .3), st, 0, .275, 0);
      for (const x of [-.5, .1, .55]) part(g, new THREE.BoxGeometry(.12, .012, .1), rust, x, .305, (x * 7 % 2 - 1) * .06) },
    shapes: () => [[new CANNON.Box(new CANNON.Vec3(.85, .15, .15)), [0, .15, 0]]] },
  scooter: { name: 'Самокат', size: 3, mass: 2,
    // начало координат — в «угловой» клетке; дека идёт по +x, руль лежит по +z
    build(g) { const fr = M(0x2f8f9a), grip = M(0x26272d), tire = M(0x2b2c33), steel = M(0xb9c2ca), red = M(0xc8423a);
      part(g, new THREE.BoxGeometry(1.3, .05, .26), fr, .6, .12, -.05);
      part(g, new THREE.BoxGeometry(1.2, .012, .2), grip, .62, .151, -.05);
      for (const x of [-.05, 1.22]) part(g, new THREE.CylinderGeometry(.11, .11, .07, 10), tire, x, .11, -.05, 0, Math.PI / 2);
      part(g, new THREE.BoxGeometry(.06, .06, 1.2), steel, -.05, .06, .62);
      part(g, new THREE.BoxGeometry(.6, .05, .05), steel, -.05, .05, 1.24);
      for (const x of [-.33, .23]) part(g, new THREE.BoxGeometry(.12, .07, .07), red, x, .05, 1.24) },
    shapes: () => [[new CANNON.Box(new CANNON.Vec3(.7, .11, .14)), [.6, .11, -.05]], [new CANNON.Box(new CANNON.Vec3(.05, .05, .6)), [-.05, .05, .62]], [new CANNON.Box(new CANNON.Vec3(.3, .04, .04)), [-.05, .05, 1.24]]] },
  bones: { name: 'Кости динозавра', size: 4, mass: 3,
    build(g) { const b = M(0xe6d8b4), b2 = M(0xc9b88e), dark = M(0x3e3022);
      for (let k = 0; k < 18; k++) { const x = -.8 + k * .09, s = k < 6 ? .04 + k * .008 : .085; part(g, new THREE.BoxGeometry(s, s, s), b, x, .05 + s / 2, Math.sin(k * .5) * .05) }
      for (let k = 0; k < 6; k++) { const x = -.2 + k * .1;
        for (const sg of [-1, 1]) for (let r = 0; r < 5; r++) { const a = r / 4; part(g, new THREE.BoxGeometry(.035, .035, .08), b, x - a * a * .08, .06 + .2 * Math.sin(a * Math.PI * .9), sg * (.07 + a * .3)) } }
      part(g, new THREE.BoxGeometry(.3, .16, .2), b, .85, .1, .02); part(g, new THREE.BoxGeometry(.18, .06, .16), b2, .95, .03, .02);
      part(g, new THREE.BoxGeometry(.05, .04, .05), dark, .8, .16, .09);
      for (const [x, z, ry] of [[-.15, .35, .6], [.35, -.35, -.5], [.2, .4, .3]]) { part(g, new THREE.BoxGeometry(.4, .05, .05), b, x, .03, z, ry); part(g, new THREE.BoxGeometry(.08, .07, .08), b2, x + Math.cos(ry) * .2, .035, z - Math.sin(ry) * .2) } },
    shapes: () => [[new CANNON.Box(new CANNON.Vec3(.9, .12, .42)), [.05, .12, 0]]] },
};
const BYSIZE = ['', 'coffee', 'beam', 'scooter', 'bones'], SIZE_W = [0, 70, 40, 20, 10];
const trash = [];
const rnd = (a, b) => a + Math.random() * (b - a);
function genTrash() {
  for (let z = 1; z < DIG; z++) {
    if (ACT.some(([i, j]) => code(i, j, z) === '.')) continue;
    if (Math.random() >= .6) continue;
    let r = Math.random() * 140, size = 1; for (let s = 1; s <= 4; s++) { if (r < SIZE_W[s]) { size = s; break } r -= SIZE_W[s] }
    const type = BYSIZE[size]; let x, zz, ry;
    if (size === 1) { const [i, j] = ACT[Math.random() * 4 | 0]; x = i + .5 + rnd(-.15, .15); zz = j + .5 + rnd(-.15, .15); ry = rnd(0, 6.28) }
    else if (size === 2) { const along = Math.random() < .5, row = 1 + (Math.random() * 2 | 0); if (along) { x = 2; zz = row + .5; ry = 0 } else { x = row + .5; zz = 2; ry = Math.PI / 2 } ry += Math.random() < .5 ? Math.PI : 0 }
    else if (size === 3) { const [mi, mj] = ACT[Math.random() * 4 | 0], ci = 3 - mi, cj = 3 - mj, sx = mi - ci, sz = mj - cj;
      x = ci + .5; zz = cj + .5; ry = sx === 1 && sz === 1 ? 0 : sx === 1 ? Math.PI / 2 : sz === -1 ? Math.PI : -Math.PI / 2 }
    else { x = 2; zz = 2; ry = Math.PI / 4 + (Math.random() * 4 | 0) * Math.PI / 2 }
    const g = new THREE.Group(); TYPES[type].build(g);
    g.position.set(x, -(z + 1) * BH + .01, zz); g.rotation.y = ry; g.visible = false; scene.add(g);
    g.updateMatrixWorld(true);
    const cells = new Set();                      // какие клетки задевает предмет — по каждой детали отдельно (Г-образный самокат задевает 3)
    g.traverse(o => { if (!o.isMesh) return; const bb = new THREE.Box3().setFromObject(o);
      for (let a = 0; a < 4; a++) { const [i, j] = ACT[a]; if (bb.max.x > i + .03 && bb.min.x < i + .97 && bb.max.z > j + .03 && bb.min.z < j + .97) cells.add(a) } });
    const colors = new Map(); g.traverse(o => { if (o.isMesh) colors.set(o, o.material) });
    const t = { type, layer: z, g, cells: [...cells], colors, active: false, body: null };
    g.traverse(o => { if (o.isMesh) o.userData.t = t });
    trash.push(t);
  }
}
function setGrey(t, on) { t.g.traverse(o => { if (o.isMesh) o.material = on ? GREY : t.colors.get(o) }) }
function updateTrash() {
  for (const t of trash) {
    if (t.active) continue;
    const dug = t.cells.filter(a => d[a] > t.layer).length;
    t.g.visible = dug > 0;
    if (dug > 0 && dug < t.cells.length) setGrey(t, true);
    if (dug === t.cells.length) activate(t);
  }
  for (const t of trash) if (t.body) t.body.wakeUp();          // убрали блок — пусть всё, что на нём лежало, проверит опору
}
function activate(t) {
  t.active = true; setGrey(t, false);
  const body = new CANNON.Body({ mass: TYPES[t.type].mass, collisionFilterGroup: G_TRASH, collisionFilterMask: G_BLOCK, linearDamping: .05, angularDamping: .2 });
  for (const [s, o] of TYPES[t.type].shapes()) body.addShape(s, new CANNON.Vec3(...o));
  body.position.set(t.g.position.x, t.g.position.y, t.g.position.z);
  body.quaternion.setFromEuler(0, t.g.rotation.y, 0);
  body.sleepSpeedLimit = .15; body.sleepTimeLimit = .4;
  world.addBody(body); t.body = body;
  const c = t.g.position; burst(c.x, c.y + .2, c.z, ['#fff6c8', '#f2c14e', '#ffffff'], 18, .6);
  toast('Найдено: ' + TYPES[t.type].name); haptic('medium');
}

/* ---------- частицы ---------- */
const parts = []; const pGeo = new THREE.BoxGeometry(.045, .045, .045);
function burst(x, y, z, cols, n, up = 1) { for (let k = 0; k < n; k++) { const m = new THREE.Mesh(pGeo, new THREE.MeshBasicMaterial({ color: cols[k % cols.length] }));
  m.position.set(x + rnd(-.3, .3), y + rnd(-.05, .1), z + rnd(-.3, .3)); scene.add(m); parts.push({ m, v: new THREE.Vector3(rnd(-1.5, 1.5), rnd(1, 3.5) * up, rnd(-1.5, 1.5)), l: rnd(.4, .7) }) } }
function stepParts(dt) { for (let k = parts.length - 1; k >= 0; k--) { const p = parts[k]; p.v.y -= 12 * dt; p.m.position.addScaledVector(p.v, dt); p.l -= dt; if (p.l <= 0) { scene.remove(p.m); p.m.material.dispose(); parts.splice(k, 1) } } }
const CRUMB = { 'Т': ['#46823a', '#25562e', '#4d2b32', '#7a4836'], 'З': ['#ad7757', '#7a4841', '#4d2b32', '#341c27'], 'П': ['#8a5a44', '#5e3a33', '#3d2329', '#2a1820'], 'Г': ['#c06a4a', '#9a4a3a', '#6e3030', '#4a2026'], 'Б': ['#9aa3a8', '#6c757c', '#474e55', '#2c3136'], 'К': ['#a7b0b6', '#7d878e', '#565f66', '#363c42'], 'Р': ['#5fa04a', '#ad7757', '#7a4841', '#3d2329'], 'В': ['#6fb552', '#3f7a35', '#9a4a3a', '#4a2026'], 'Я': ['#5fa04a', '#4d2b32', '#7a4836', '#2a1820'] };

/* ---------- ввод ---------- */
const ray = new THREE.Raycaster();
function pick(e) {
  const r = cv.getBoundingClientRect();
  ray.setFromCamera(new THREE.Vector2((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), cam);
  const objs = [...[...blocks.values()].map(b => b.mesh), ...trash.filter(t => t.g.visible).map(t => t.g)];
  const h = ray.intersectObjects(objs, true)[0]; return h || null;
}
const pickBtn = document.getElementById('pick');
pickBtn.addEventListener('click', () => { active = !active; pickBtn.setAttribute('aria-pressed', active); haptic('light') });
const hand = new CANNON.Body({ mass: 0, type: CANNON.Body.KINEMATIC, collisionFilterGroup: 0, collisionFilterMask: 0 }); world.addBody(hand);
const PLANE_N = new THREE.Vector3(1, 0, 1).normalize();
let drag = null, vel = 0; const grabs = new Map();
cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId);
  const h = pick(e);
  if (h && h.object.userData.t) { const t = h.object.userData.t;
    if (!t.active) { haptic('warn'); return }
    if ([...grabs.values()].some(g => g.t === t)) return;
    // зажали: предмет цепляется к «руке» в точке касания и висит там, где лежал
    const b = t.body, p = h.point, local = b.pointToLocalFrame(new CANNON.Vec3(p.x, p.y, p.z));
    hand.position.set(p.x, p.y, p.z);
    const c = new CANNON.PointToPointConstraint(b, local, hand, new CANNON.Vec3(0, 0, 0), 600);
    world.addConstraint(c); b.fixedRotation = true; b.updateMassProperties(); b.linearDamping = .9; b.wakeUp();
    grabs.set(e.pointerId, { t, c, plane: new THREE.Plane().setFromNormalAndCoplanarPoint(PLANE_N, p.clone()), x0: p.x, z0: p.z, y0: p.y });
    haptic('light'); return }
  if (drag) return;
  drag = { id: e.pointerId, h, y: e.clientY, cam: camTarget, moved: false, lastY: e.clientY, lastT: performance.now() }; vel = 0 });
cv.addEventListener('pointermove', e => {
  const g = grabs.get(e.pointerId);
  if (g) { const r = cv.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), cam);
    const p = new THREE.Vector3(); if (!ray.ray.intersectPlane(g.plane, p)) return;
    if (TYPES[g.t.type].size >= 3) { p.x = g.x0; p.z = g.z0 }       // самокат и кости — только вверх-вниз
    else { const s = p.x + p.z; p.x = Math.max(1.12, Math.min(2.88, p.x)); p.z = s - p.x; if (p.z < 1.12 || p.z > 2.88) { p.z = Math.max(1.12, Math.min(2.88, p.z)); p.x = s - p.z } }
    p.y = Math.min(1.6, Math.max(g.y0 - .02, p.y));
    hand.position.set(p.x, p.y, p.z); g.t.body.wakeUp(); return }
  if (!drag || drag.id !== e.pointerId) return;
  if (!drag.moved && Math.abs(e.clientY - drag.y) / SCALE > 4) { drag.moved = true; drag.y = e.clientY; drag.cam = camTarget }
  if (!drag.moved) return;
  camTarget = clampCam(drag.cam - (e.clientY - drag.y) / SCALE); follow = camTarget >= maxCam();
  const now = performance.now(), dt = Math.max(1, now - drag.lastT); vel = -(e.clientY - drag.lastY) / SCALE / dt * 16; drag.lastY = e.clientY; drag.lastT = now });
function release(g) { world.removeConstraint(g.c); const b = g.t.body; b.fixedRotation = false; b.updateMassProperties(); b.linearDamping = .05; b.velocity.set(0, 0, 0); b.wakeUp() }
const endDrag = (e, cancel) => {
  const g = grabs.get(e.pointerId); if (g) { grabs.delete(e.pointerId); release(g); return }
  if (!drag || drag.id !== e.pointerId) return; const dr = drag, still = performance.now() - dr.lastT > 80; drag = null;
  if (cancel) { vel = 0; return }
  if (!dr.moved) { vel = 0; tap(e) } else if (still) vel = 0 };
cv.addEventListener('pointerup', e => endDrag(e, false));
cv.addEventListener('pointercancel', e => endDrag(e, true));
cv.addEventListener('wheel', e => { e.preventDefault(); vel = 0; camTarget = clampCam(camTarget + e.deltaY / SCALE * .6); follow = camTarget >= maxCam() }, { passive: false });
function tap(e) {
  const h = pick(e); if (!h || h.object.userData.t) return;
  const { i, j, z, k } = h.object.userData, a = isAct(i, j); if (a < 0 || !diggable(a, z)) return;
  if (!active) { pickBtn.classList.remove('nudge'); void pickBtn.offsetWidth; pickBtn.classList.add('nudge'); haptic('warn'); return }
  removeBlock(i, j, z); burst(i + .5, -z * BH, j + .5, CRUMB[k] || CRUMB[k[0]] || CRUMB['З'], 16);
  d[a]++; settle(); updateTrash(); shake = 5; haptic('light');
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

/* ---------- цикл ---------- */
let last = performance.now(), landed = new Map();
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  world.step(1 / 60, dt, 4);
  for (const t of trash) if (t.body) {
    t.g.position.copy(t.body.position); t.g.quaternion.copy(t.body.quaternion);
    const vy = t.body.velocity.y, was = landed.get(t) || 0;                 // удар об пол: тряска и пыль
    if (was < -4 && vy > -1) { shake = Math.max(shake, TYPES[t.type].size > 2 ? 6 : 3); haptic('medium'); const p = t.g.position; burst(p.x, p.y + .05, p.z, ['#8c7a6a', '#5e4c42', '#b8a48c'], 12, .5) }
    landed.set(t, vy);
  }
  stepParts(dt);
  // подсветка блоков, которые можно копать
  const pulse = 1 + (.12 + .1 * Math.sin(now / 260)) * (active ? 1 : 0);
  for (const k in GLOW) for (const m of GLOW[k]) m.color.setScalar(pulse);
  for (const b of blocks.values()) { const u = b.mesh.userData, a = isAct(u.i, u.j); b.mesh.material = a >= 0 && active && diggable(a, u.z) ? GLOW[u.k] : MATS[u.k] }
  if (follow) camTarget = maxCam();
  if (!drag && Math.abs(vel) > .05) { camTarget = clampCam(camTarget + vel); vel *= .92; if (camTarget >= maxCam()) follow = true }
  if (drag) camY = camTarget; else { camY += (camTarget - camY) * .18; if (Math.abs(camTarget - camY) < .3) camY = camTarget }
  placeCam();
  renderer.render(scene, cam);
  document.getElementById('depth').textContent = '3D · ' + Math.min(cur(), DIG) + ' / ' + DIG;
  requestAnimationFrame(frame);
}
genTrash(); resize(); addEventListener('resize', resize); if (tg && tg.onEvent) tg.onEvent('viewportChanged', resize);
window.__dbg = { d, trash, blocks, world, settle, updateTrash, cur, removeBlock, activate };
requestAnimationFrame(frame);
