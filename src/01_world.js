/* ---------- состояние раскопа ---------- */
const d = GAME.d && GAME.d.length === ACT.length ? GAME.d.map(v => Math.max(0, Math.min(v | 0, DIG))) : ACT.map(() => 0);   // сколько блоков уже выкопано в каждой клетке ямы
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
  W = Math.ceil(r.width / SCALE / 2) * 2; H = Math.ceil(r.height / SCALE / 2) * 2;   // чётные: центр кадра — между пикселями, края текселей не ложатся на центры пикселей (иначе мерцают)
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
let camO = 0, camSX = null, camSY = null;                    // сдвиг камеры вбок по экрану; на каком целом пикселе стоит камера
function placeCam(dt) {
  const k = 1 - Math.exp(-dt * 4);                           // по горизонтали камера стоит на центре ямы, по глубине плавно идёт за персонажем
  const cs = (CH.x - CH.z) * Math.SQRT1_2, half = Math.max(.5, W / 2 / PX - 2), o = Math.abs(cs) > half ? cs - Math.sign(cs) * half : 0;   // ушёл к краю кадра — камера сдвигается вбок
  camO += (o - camO) * k; camF.x = PC + camO * Math.SQRT1_2; camF.z = PC - camO * Math.SQRT1_2; camF.y += (CH.y + .3 - camF.y) * k;
  const fx = camF.dot(SCR_R) * PX, fy = camF.dot(SCR_U) * PX;   // переходим на соседний пиксель только с запасом — иначе на границе картинка дёргается туда-сюда на пиксель
  if (camSX === null || Math.abs(fx - camSX) > .75) camSX = Math.round(fx); if (camSY === null || Math.abs(fy - camSY) > .75) camSY = Math.round(fy);
  const sx = camSX, sy = camSY;
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
/* с чем сталкивается предмет: всегда с землёй; с Кирью — если не «призрак» (упал прямо на него); с другими вещами — если не застрял в них при появлении.
   Раньше вещи друг с другом не сталкивались вовсе: поставленная на кучу проваливалась сквозь соседей */
const tMask = t => G_BLOCK | (t.ghost ? 0 : G_CHAR) | (t.sep ? 0 : G_TRASH);
function trashOverlap(t) {                                     // с какой вещью пересекается предмет (по коробкам, с небольшим допуском); null — ни с какой
  const a = t.body; a.updateAABB(); const m = .02;
  for (const o of trash) { if (o === t || !o.body || o.held || o.inBag || o.kz || !o.active) continue; const b = o.body; b.updateAABB();
    if (a.aabb.lowerBound.x + m < b.aabb.upperBound.x && a.aabb.upperBound.x - m > b.aabb.lowerBound.x && a.aabb.lowerBound.y + m < b.aabb.upperBound.y && a.aabb.upperBound.y - m > b.aabb.lowerBound.y
      && a.aabb.lowerBound.z + m < b.aabb.upperBound.z && a.aabb.upperBound.z - m > b.aabb.lowerBound.z) return o }
  return null;
}
function wakeNear(t) { const p = t.body.position; for (const o of trash) if (o.body && o !== t && Math.abs(o.body.position.x - p.x) < 1.5 && Math.abs(o.body.position.z - p.z) < 1.5) o.body.wakeUp() }
function sepStep(t, dt) {                                      // застрявшие друг в друге вещи понемногу раздвигаем вбок; через 2 с — включаем столкновения как есть
  const o = trashOverlap(t); t.sepT = (t.sepT || 0) + dt;
  if (!o || t.sepT > 2) { t.sep = false; t.sepT = 0; t.body.collisionFilterMask = tMask(t); t.body.wakeUp(); return }
  const a = t.body.position, b = o.body.position; let dx = a.x - b.x, dz = a.z - b.z, l = Math.hypot(dx, dz); if (l < 1e-3) { dx = Math.random() - .5; dz = Math.random() - .5; l = Math.hypot(dx, dz) }
  a.x += dx / l * .6 * dt; a.z += dz / l * .6 * dt; t.body.wakeUp();
}
function sepCheck(t) { t.sep = !!trashOverlap(t); t.sepT = 0; if (t.body) t.body.collisionFilterMask = tMask(t) }   // появился внутри другой вещи — пока не разойдутся, проходит сквозь
const blockShape = new CANNON.Box(new CANNON.Vec3(.5, BH / 2, .5));
for (let z = 0; z <= BOT; z++) for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) if (code(i, j, z) !== '.') blocks.set(i + ',' + j + ',' + z, { k: matKey(i, j, z), body: null });
for (let z = SHOP.z0; z <= SHOP.z1; z++) for (let i = SHOP.i0; i < SHOP.i1; i++) blocks.set(i + ',-1,' + z, { k: ['З', 'З1', 'З2'][hash(i, -1, z)], body: null });   // задняя стенка выемки
for (let a = 0; a < ACT.length; a++) for (let z = 0; z < d[a]; z++) blocks.delete(ACT[a][0] + ',' + ACT[a][1] + ',' + z);   // уже выкопанное из сохранения
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
  wall(PIT0 - .45, PIT0, bot, top, PC - hw, PC + hw); wall(PIT1, PIT1 + 1, bot, top, PC - hw, PC + hw); wall(PC - hw, PC + hw, bot, top, PIT1, PIT1 + 1);
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

