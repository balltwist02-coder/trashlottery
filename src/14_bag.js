/* ---------- мешок: плащ-фуросики с сеткой 2×3, который Кирью расправляет на полу, как скатерть, и связывает узлом за спиной ----------
   выбрал мешок — сначала ищем, где его расстелить: прямоугольник перед Кирью должен лежать на ровном полу той же высоты,
   без стеллажа, стола, шины и без ничего над головой (ступеньки, низкий пролёт). Влезает прямо здесь — Кирью только
   разворачивается. Нет — ищем место в паре шагов на той же ровной площадке и доводим его туда; на ступеньке или
   на одиноком блоке такой площадки нет, и он просто говорит, что расстелить негде.
   дальше: достаёт свёрток из-за спины, разворачивает у груди, взмахивает им вверх — плащ взлетает и опускается на пол;
   камера в это время подлетает к Кирью, а когда плащ лёг — поднимается над передним углом участка и смотрит на слой под
   60°. Вещи с пола пальцем перетаскиваются в клетки (длинные — в две соседние). Свернуть — связывает углы узлом
   и закидывает за спину; пустой мешок убирает в рюкзак */
const BAG = { CS: .5, NE: .45, RR: 2.7, LIFT: .3, CLIP: 2.4, ph: null, t: 0, k: 0, kT: 0, items: [], spot: null, drag: null, y0: 0, a: 0, lit: 0,
  f: new THREE.Vector3(0, 0, 1), c: new THREE.Vector3(), back: false, br: -1, store: new Map(), cam: new THREE.PerspectiveCamera(40, 1, .05, 300) };
BAG.SW = 2.0; BAG.SD = 1.5;                                       // плащ; сетка 3×2 клетки по 0,5 м — посередине, сверху воротник, снизу подол
BAG.lamp = new THREE.PointLight(0xffe2b8, 0, 4.5, 1.2); BAG.lamp.position.set(0, .42, .3); KIRYU.head.add(BAG.lamp);
const bagFill = () => BAG.items.reduce((n, it) => n + it.c.length, 0);
/* плащ: тёмно-бордовая ткань с узором, золотая кайма, воротник с двумя застёжками, по сетке — светлая строчка; 48 пикселей на метр */
const BAG_TEX = (() => {
  const w = 96, h = 72, c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
  const a = document.createElement('canvas'); a.width = w; a.height = h; const ax = a.getContext('2d'); ax.fillStyle = '#000'; ax.fillRect(0, 0, w, h);
  const nz = (px, py) => { let v = Math.imul(px * 374761393 + py * 668265263, 1274126177); v ^= v >>> 15; return (v >>> 0) / 4294967296 };
  const half = py => py < 12 ? 30 + 14 * Math.sin(Math.PI / 2 * py / 12) : 44 + 4 * Math.min(1, (py - 12) / 40);   // плечи у воротника, книзу — шире
  const inside = (px, py) => { const hw = half(py), dx = Math.abs(px + .5 - w / 2); if (dx > hw) return false;
    if (py >= h - 6) { const k = (px % 8) - 3.5, cut = Math.abs(k) > 2.5 ? h - 2 : h; if (py >= cut) return false;   // подол фестонами
      const cx = w / 2 - hw + 6, ex = Math.max(0, dx - (hw - 6)), ey = py - (h - 6); if (ex * ex + ey * ey > 36) return false }   // скруглённые нижние углы
    return true };
  const edge = (px, py) => !inside(px - 1, py) || !inside(px + 1, py) || !inside(px, py - 1) || !inside(px, py + 1);
  const edge2 = (px, py) => !inside(px - 2, py) || !inside(px + 2, py) || !inside(px, py - 2) || !inside(px, py + 2);
  for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) { if (!inside(px, py)) continue; const n = nz(px, py);
    ax.fillStyle = '#fff'; ax.fillRect(px, py, 1, 1);
    let col = n < .06 ? '#56161c' : n < .12 ? '#7e2830' : '#6a1d24';
    if (((px + py) % 12 === 0 || (px - py + 600) % 12 === 0) && py > 10 && py < h - 8) col = '#7a252c';   // ромбы тканого узора
    if (py < 10) col = n < .1 ? '#2a0c10' : '#38121a';                                                // воротник
    if (edge(px, py)) col = '#3a1014'; else if (edge2(px, py)) col = n < .2 ? '#b98234' : '#d8a64a';   // кайма
    x.fillStyle = col; x.fillRect(px, py, 1, 1) }
  x.fillStyle = '#d8a64a'; for (let px = 20; px < 76; px++) if (inside(px, 10)) x.fillRect(px, 10, 1, 1);   // золотой шов под воротником
  for (const cx of [40, 55]) { x.fillStyle = '#f2d27a'; x.fillRect(cx - 1, 3, 3, 3); x.fillStyle = '#8a5a1c'; x.fillRect(cx, 4, 1, 1) }   // застёжки
  x.fillStyle = '#f0dcb0'; const G0 = 12, G1 = 84, V0 = 12, V1 = 60;                                // строчка сетки 3×2: пунктиром
  for (let px = G0; px <= G1; px++) if (px % 3 !== 2) for (const py of [V0, (V0 + V1) / 2, V1]) x.fillRect(px, py, 1, 1);
  for (let py = V0; py <= V1; py++) if (py % 3 !== 2) for (const px of [G0, G0 + 24, G0 + 48, G1]) x.fillRect(px, py, 1, 1);
  const mk = cv => { const t = new THREE.CanvasTexture(cv); t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; return t };
  const t = mk(c); t.colorSpace = THREE.SRGBColorSpace; return { map: t, alpha: mk(a) };
})();
BAG.g = new THREE.Group(); BAG.g.visible = false; scene.add(BAG.g);
{ const geo = new THREE.PlaneGeometry(BAG.SW, BAG.SD, 10, 15).rotateX(-Math.PI / 2);   // ряд 0 — воротник, у Кирью (−z), подол — от него (+z)
  BAG.base = geo.attributes.position.array.slice();
  BAG.flat = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: BAG_TEX.map, alphaMap: BAG_TEX.alpha, alphaTest: .5, side: THREE.DoubleSide, flatShading: true }));
  BAG.flat.position.y = .012; BAG.flat.receiveShadow = true; BAG.flat.castShadow = true;
  BAG.flat.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, alphaMap: BAG_TEX.alpha, alphaTest: .5, side: THREE.DoubleSide }); BAG.g.add(BAG.flat);
  BAG.idMat = new THREE.MeshBasicMaterial({ color: DECO_ID.color.clone(), alphaMap: BAG_TEX.alpha, alphaTest: .5, side: THREE.DoubleSide });   // для обводки — по силуэту плаща
  const LEA = new THREE.MeshLambertMaterial({ color: 0x6a1d24, flatShading: true }), LD = new THREE.MeshLambertMaterial({ color: 0x3a1014, flatShading: true }), LL = new THREE.MeshLambertMaterial({ color: 0x8e3036, flatShading: true });
  // свёрток в руке, пока Кирью несёт его из-за спины к груди
  const hr = new THREE.Group(), hb = (w, h, d, m, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = true; hr.add(o) };
  hb(.3, .13, .15, LEA, 0, 0, 0); hb(.26, .02, .155, new THREE.MeshLambertMaterial({ color: 0xd8a64a, flatShading: true }), 0, .05, 0); hb(.06, .14, .16, LD, .09, 0, 0);
  BAG.hroll = hr; hr.visible = false; scene.add(hr);
  BAG.hl = []; for (let c = 0; c < 6; c++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(BAG.CS - .06, BAG.CS - .06).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x7dff8a, transparent: true, opacity: .32, depthWrite: false }));
    m.position.set(((c % 3) - 1) * BAG.CS, .022, ((c / 3 | 0) - .5) * BAG.CS); m.visible = false; m.renderOrder = 2; BAG.g.add(m); BAG.hl.push(m) }
  // узел, который едет с пола за спину (такой же, как у Кирью на спине)
  const bun = new THREE.Group();
  const bx = (w, h, d, m, x, y, z, rz = 0) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.rotation.z = rz; o.castShadow = true; bun.add(o) };
  bx(.38, .28, .22, LEA, 0, 0, 0); bx(.32, .34, .2, LEA, 0, -.01, .005); bx(.3, .24, .27, LEA, 0, 0, -.01); bx(.2, .16, .02, LL, -.05, .03, -.15);
  for (const s of [-1, 1]) bx(.07, .1, .05, LD, s * .06, .17, .03, s * .5); bx(.09, .07, .07, LD, 0, .15, .02);
  BAG.bun = bun; bun.visible = false; scene.add(bun);
}
const cellXZ = c => [((c % 3) - 1) * BAG.CS, ((c / 3 | 0) - .5) * BAG.CS];     // центр клетки в осях полотна (+z — от Кирью)
/* вещь в клетке: длинной стороной вдоль пары клеток, уменьшена, чтобы влезть, стоит на коже */
function bagSeat(it) {
  const t = it.t, L = t.local, cs = it.c, CS = BAG.CS;
  const cx = cs.reduce((s, c) => s + cellXZ(c)[0], 0) / cs.length, cz = cs.reduce((s, c) => s + cellXZ(c)[1], 0) / cs.length;
  const along = cs.length === 2 ? (Math.abs(cs[1] - cs[0]) === 1 ? 'x' : 'z') : 'x';
  const sx = L.max.x - L.min.x, sy = L.max.y - L.min.y, sz = L.max.z - L.min.z, yaw = (sx >= sz) === (along === 'x') ? 0 : Math.PI / 2;
  const lx = yaw ? sz : sx, lz = yaw ? sx : sz, spX = (cs.length === 2 && along === 'x' ? 2 : 1) * CS - .07, spZ = (cs.length === 2 && along === 'z' ? 2 : 1) * CS - .07;
  const s = Math.min(1, spX / lx, spZ / lz, .45 / sy);
  t.g.scale.setScalar(s); t.g.quaternion.setFromAxisAngle(_UP, yaw);
  const com = t.com.clone().multiplyScalar(s).applyQuaternion(t.g.quaternion);
  t.g.position.set(cx - com.x, .02 - s * (t.com.y + L.min.y), cz - com.z);
  it.s = s; it.yaw = yaw;
}
function bagDetach(t) { t.vp = null; if (t.body) world.removeBody(t.body); const i = trash.indexOf(t); if (i >= 0) trash.splice(i, 1); t.inBag = true }
function bagRelease(t, p, q) { t.vp = null;                                   // обратно на пол: низ предмета — на p.y, физика снова включена
  scene.attach(t.g); t.g.scale.setScalar(1); t.g.quaternion.copy(q);
  let lo = Infinity; const v = new THREE.Vector3(), L = t.local;
  for (const x of [L.min.x, L.max.x]) for (const y of [L.min.y, L.max.y]) for (const z of [L.min.z, L.max.z]) lo = Math.min(lo, v.set(x, y, z).applyQuaternion(q).y);
  const c = new THREE.Vector3(p.x, p.y - lo + .01, p.z); t.g.position.copy(c).sub(t.com.clone().applyQuaternion(q)); t.g.updateMatrixWorld(true);
  const b = t.body; b.position.set(c.x, c.y, c.z); b.quaternion.set(q.x, q.y, q.z, q.w); b.type = CANNON.Body.DYNAMIC; b.updateMassProperties();
  b.velocity.set(0, 0, 0); b.angularVelocity.set(0, 0, 0); b.collisionResponse = true; t.ghost = false; world.addBody(b); b.wakeUp();
  if (trash.indexOf(t) < 0) trash.push(t); t.inBag = false; t.held = false; t.br = undefined;
  t.ghost = charHits(t); sepCheck(t);
}
/* ровный пол на высоте y0: есть поверхность ровно там и ничего не нависает ниже 2,4 м; не стеллаж, не ящик, не стол */
function bagFlat(x, z, y0) {
  if (kitHit(x, z, y0 + .1)) return false;
  const s = outerSurfaces(x, z), a = cellAt(x, z); if (a >= 0) s.push(floorY(a));
  let on = false; for (const h of s) { if (Math.abs(h - y0) < .03) on = true; else if (h > y0 + .03 && h < y0 + BAG.CLIP) return false }
  return on;
}
function bagFits(px, pz, a, y0) {                                // полотно перед Кирью, если он стоит в (px, pz) лицом по углу a
  const fx = Math.sin(a), fz = Math.cos(a), sx = Math.cos(a), sz = -Math.sin(a), hw = BAG.SW / 2 + .05, v0 = BAG.NE - .05, v1 = BAG.NE + BAG.SD + .05;
  for (let i = 0; i <= 5; i++) { const v = v0 + (v1 - v0) * i / 5;
    for (let j = 0; j <= 6; j++) { const u = -hw + 2 * hw * j / 6; if (!bagFlat(px + fx * v + sx * u, pz + fz * v + sz * u, y0)) return false } }
  for (const t of trash) if (t.active && t.body && TYPES[t.type].heavy) { const p = t.body.position; if (Math.abs(p.y - y0) > 1.2) continue;   // шину не сдвинуть — на неё не стелим
    const dx = p.x - px, dz = p.z - pz, v = dx * fx + dz * fz, u = dx * sx + dz * sz; if (v > v0 - .4 && v < v1 + .4 && Math.abs(u) < hw + .4) return false }
  return true;
}
function bagPath(x0, z0, x1, z1, y0) {                           // дойти по ровному, не сходя со своей высоты
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, z1 - z0) / .1));
  for (let i = 1; i <= n; i++) { const x = x0 + (x1 - x0) * i / n, z = z0 + (z1 - z0) * i / n;
    for (const [ox, oz] of [[0, 0], [R, 0], [-R, 0], [0, R], [0, -R]]) if (!bagFlat(x + ox, z + oz, y0)) return false }
  return true;
}
const angDiff = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
function bagSpot() {
  const y0 = CH.y, yaw = Math.atan2(CH.face.x, CH.face.z), A = [];
  for (let k = 0; k < 16; k++) A.push(yaw + (k ? (k % 2 ? 1 : -1) * Math.ceil(k / 2) * Math.PI / 8 : 0));   // сначала — куда он и так смотрит
  const vl = Math.hypot(VIEW.x, VIEW.z), back = a => Math.max(0, -(Math.sin(a) * VIEW.x + Math.cos(a) * VIEW.z) / vl);   // плащ «от камеры» — Кирью заслонит клетки
  const cost = a => angDiff(a, yaw) * .6 + back(a) * 1.4;
  let here = null; for (const a of A) if (bagFits(CH.x, CH.z, a, y0) && (!here || cost(a) < here.cost)) here = { x: CH.x, z: CH.z, a, walk: false, cost: cost(a) };
  if (here) return here;
  for (let r = .25; r < 1.8; r += .25) {                          // пара шагов по той же ровной площадке
    let best = null;
    for (let k = 0; k < 16; k++) { const b = k * Math.PI / 8, x = CH.x + Math.sin(b) * r, z = CH.z + Math.cos(b) * r;
      if (!bagPath(CH.x, CH.z, x, z, y0)) continue;
      for (const a of A) if (bagFits(x, z, a, y0)) { const c = cost(a) + angDiff(b, yaw) * .3; if (!best || c < best.cost) best = { x, z, a, walk: true, cost: c } } }
    if (best) return best;
  }
  return null;
}
function bagToggle() { if (CH.state === 'bag') bagClose(); else bagOpen() }
function bagOpen() {
  if (CH.state === 'ladder') { shakeTool('bag'); toast('На лестнице мешок не развернуть', 1); return }
  if (CH.state !== 'walk' || PH.on) { shakeTool('bag'); toast('Не сейчас', 0); return }
  if (CH.held) { shakeTool('bag'); toast('Руки заняты — сначала положи вещь', 0); return }
  const s = bagSpot(); if (!s) { shakeTool('bag'); toast('Тут мешок не расстелить — нужен ровный пол побольше', 1); return }
  joy.id = null; joy.x = joy.y = 0;
  Object.assign(BAG, { spot: s, y0: CH.y, a: s.a, ph: s.walk ? 'go' : 'turn', t: 0, aside: null, fd: null }); BAG.f.set(Math.sin(s.a), 0, Math.cos(s.a));
  CH.state = 'bag'; bagOn = true; CH.moving = false; haptic('light');
}
function bagClose() {
  if (BAG.ph === 'go' || BAG.ph === 'turn') { bagEnd(); return }
  if (BAG.ph !== 'ui' || BAG.drag) return;
  BAG.ph = 'tie'; BAG.t = 0; BAG.kT = 0; bagUI.classList.remove('on'); for (const m of BAG.hl) m.visible = false; haptic('light');
}
function bagEnd() { CH.state = 'walk'; bagOn = false; BAG.ph = null; CH.moving = false; CH.t = 0 }
/* раскладка плаща на полу: перед Кирью; вещи, на которые он ляжет, отодвигаем на ближайшее свободное место того же пола */
function bagLay() {
  const f = BAG.f; BAG.c.set(CH.x, BAG.y0, CH.z).addScaledVector(f, BAG.NE + BAG.SD / 2);
  BAG.g.position.copy(BAG.c); BAG.g.rotation.set(0, BAG.a, 0); BAG.g.updateMatrixWorld(true);
  const sx = Math.cos(BAG.a), sz = -Math.sin(BAG.a), hw = BAG.SW / 2 + .1, hd = BAG.SD / 2 + .1;
  const under = (x, z) => { const dx = x - BAG.c.x, dz = z - BAG.c.z; return Math.abs(dx * sx + dz * sz) < hw && Math.abs(dx * f.x + dz * f.z) < hd };
  const taken = [];
  for (const t of trash) { if (!t.active || !t.body || t.held || t.mounted || t.kz || TYPES[t.type].heavy) continue;
    const p = t.body.position; if (Math.abs(p.y - BAG.y0) > .8 || !under(p.x, p.z)) continue;
    let best = null;                                              // кольцами вокруг плаща: ровный пол той же высоты, не под плащом, не у ног Кирью
    for (let r = .15; r < 1.6 && !best; r += .15) for (let k = 0; k < 24; k++) { const b = k * Math.PI / 12, u = Math.cos(b) * (hw + r), v = Math.sin(b) * (hd + r);
      const x = BAG.c.x + sx * u + f.x * v, z = BAG.c.z + sz * u + f.z * v;
      if (under(x, z) || Math.hypot(x - CH.x, z - CH.z) < .45 || !bagFlat(x, z, BAG.y0) || taken.some(q => Math.hypot(q[0] - x, q[1] - z) < .22)) continue;
      const dd = Math.hypot(x - p.x, z - p.z); if (!best || dd < best[2]) best = [x, z, dd] }
    if (!best) continue;                                           // некуда — пусть лежит на плаще, его можно взять пальцем
    taken.push(best); p.x = best[0]; p.z = best[1]; p.y = BAG.y0 + .2 + (t.local.max.y - t.local.min.y) / 2; t.body.velocity.set(0, 0, 0); t.body.angularVelocity.set(0, 0, 0); t.body.wakeUp() }
}
function bagShape(fold) {                                        // плоский плащ; fold — насколько связан в узел
  const pos = BAG.flat.geometry.attributes.position, b = BAG.base, hx = BAG.SW / 2, hz = BAG.SD / 2;
  for (let i = 0; i < pos.count; i++) { const x0 = b[i * 3], z0 = b[i * 3 + 2], nx = x0 / hx, nz = z0 / hz, r2 = Math.min(1, (nx * nx + nz * nz) / 2), cr = (nx * nz) ** 2;
    pos.setXYZ(i, x0 * (1 - .82 * fold), fold * (.28 * (1 - r2) + .34 * cr), z0 * (1 - .82 * fold)) }
  pos.needsUpdate = true; BAG.flat.geometry.computeVertexNormals();
}
/* плащ в руках: k — доля взмаха. Ближний край — в кистях Кирью, остальное — кривая в плоскости «вперёд-вверх»,
   её наклон по длине меняется по ключам: висит → взлетает дугой вверх → парит → ложится. Ниже пола не проваливается */
const _hl = new THREE.Vector3(), _hr = new THREE.Vector3();
const lerp1 = (a, b, t) => a + (b - a) * t;
function bagCloth(k, time) {
  const g = BAG.g, H = KIRYU.hands, pos = BAG.flat.geometry.attributes.position, b = BAG.base, hz = BAG.SD / 2, hx = BAG.SW / 2, NR = 16, NC = 11;
  g.updateMatrixWorld(true); H[0].getWorldPosition(_hl); H[1].getWorldPosition(_hr); g.worldToLocal(_hl); g.worldToLocal(_hr);
  const rel = sm01((k - .72) / .16);                               // отпускает край у самого пола
  const mz = lerp1((_hl.z + _hr.z) / 2, -hz, rel), my = lerp1((_hl.y + _hr.y) / 2 - .03, 0, rel), mx = lerp1((_hl.x + _hr.x) / 2, 0, rel);
  const hand = lerp1(Math.max(.12, Math.abs(_hl.x - _hr.x) / 2), hx * .78, rel);   // ширина у ворота: между кистями
  const len = BAG.SD * lerp1(.3, 1, sm01(k / .2));                 // сначала свёрнут — разворачивается у груди
  const w01 = sm01((k - .12) / .26), w12 = sm01((k - .4) / .2), w23 = sm01((k - .58) / .28);
  const th = u => { const T0 = -1.45 + .12 * u, T1 = 1.15 - 2.4 * u, T2 = .35 - .7 * u, T3 = 0;
    let t = lerp1(lerp1(lerp1(T0, T1, w01), T2, w12), T3, w23);
    t += .3 * Math.sin(9 * u - 16 * k) * u * sm01((k - .5) / .1) * (1 - sm01((k - .82) / .16));   // волна бежит к подолу и гаснет
    return t };
  const cz = [mz], cy = [my]; let z = mz, y = my; const ds = len / (NR - 1);
  for (let r = 1; r < NR; r++) { const u = (r - .5) / (NR - 1), t = th(u); z += Math.cos(t) * ds; y += Math.sin(t) * ds; cz.push(z); cy.push(y) }
  const air = (1 - sm01((k - .85) / .15)) * sm01((k - .1) / .1);
  for (let i = 0; i < pos.count; i++) { const r = Math.round((b[i * 3 + 2] + hz) / BAG.SD * (NR - 1)), cn = b[i * 3] / hx, u = r / (NR - 1);
    const wide = lerp1(hand, hx, sm01(u * 1.6 + rel));
    const fl = air * (.05 * Math.sin(5 * cn + 11 * time + 4 * u) + .04 * Math.sin(7 * u - 9 * time)) * u;   // ткань полощется
    pos.setXYZ(i, mx * (1 - u) + cn * wide, Math.max(.003 * u, cy[r] + fl), cz[r] + fl * .5) }
  pos.needsUpdate = true; BAG.flat.geometry.computeVertexNormals();
}
const _bp = new THREE.Vector3(), _bq = new THREE.Quaternion(), _bq2 = new THREE.Quaternion();
const BAG_PULL = .75, BAG_SPREAD = 2.1;
function stepBag(dt, ix, iy) {
  const B = BAG; CH.moving = false;
  if ((B.ph === 'go' || B.ph === 'turn') && (Math.abs(ix) + Math.abs(iy) > .3)) { bagEnd(); return }   // игрок сам повёл Кирью — передумал
  if (B.ph === 'go') {
    const dx = B.spot.x - CH.x, dz = B.spot.z - CH.z, l = Math.hypot(dx, dz), st = SPEED * dt;
    if (l <= st) { CH.x = B.spot.x; CH.z = B.spot.z; B.ph = 'turn' } else { CH.x += dx / l * st; CH.z += dz / l * st; CH.face.set(dx / l, 0, dz / l); CH.moving = true; CH.spd = 1 }
    return;
  }
  if (B.ph === 'turn') { CH.face.copy(B.f); let d = B.a - CH.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); if (Math.abs(d) < .06) { B.ph = 'pull'; B.t = 0; B.kT = 1; bagCamStart() } return }
  CH.face.copy(B.fd || B.f);
  const H = KIRYU.hands, hand = H[0].getWorldPosition(_bp.set(0, 0, 0)).clone();
  if (B.ph === 'pull') {                                         // правая рука — за спину, свёрток — к груди
    B.t += dt / BAG_PULL; const k = Math.min(1, B.t);
    if (k > .35) { B.back = false; B.hroll.visible = true; const mid = H[1].getWorldPosition(new THREE.Vector3()).lerp(hand, .5);
      B.hroll.position.copy(k < .6 ? hand.clone().add(new THREE.Vector3(0, -.06, 0)) : hand.lerp(mid, sm01((k - .6) / .3))); B.hroll.rotation.set(0, B.a, 0) }
    if (k >= 1) { B.ph = 'spread'; B.t = 0; bagLay() }
    return;
  }
  if (B.ph === 'spread') {                                       // разворачивает у груди, взмах вверх — плащ взлетает и ложится на пол
    B.t += dt / BAG_SPREAD; const k = Math.min(1, B.t);
    B.hroll.visible = false; B.g.visible = true; bagCloth(k, performance.now() / 1000);
    for (const it of B.items) it.t.g.visible = k > .9;
    if (k >= 1) { B.ph = 'ui'; B.aside = bagAside(); bagShape(0); bagUI.classList.add('on'); bagCount(); if (!bagOpen.hint) { bagOpen.hint = true; toast('Перетаскивай вещи пальцем на плащ', 0) } }
    return;
  }
  if (B.ph === 'ui') {
    if (B.aside) { const dx = B.aside.x - CH.x, dz = B.aside.z - CH.z, l = Math.hypot(dx, dz), st = SPEED * .8 * dt;   // отходит к боку плаща
      if (l <= st) { CH.x = B.aside.x; CH.z = B.aside.z; B.aside = null; const cx = B.c.x - CH.x, cz = B.c.z - CH.z, cl = Math.hypot(cx, cz) || 1; B.fd = new THREE.Vector3(cx / cl, 0, cz / cl) }
      else { CH.x += dx / l * st; CH.z += dz / l * st; CH.face.set(dx / l, 0, dz / l); CH.moving = true; CH.spd = .8 } }
    bagDragStep(dt); return }
  if (B.ph === 'tie') {                                          // углы — к середине, узел
    B.t += dt / 1.05; const k = Math.min(1, B.t), f = sm01(k / .85);
    bagShape(f); for (const it of B.items) { it.t.g.visible = f < .55; it.t.g.scale.setScalar(it.s * Math.max(.01, 1 - f)) }
    if (k >= 1) { B.ph = 'lift'; B.t = 0; B.g.visible = false; bagShape(0); for (const it of B.items) bagSeat(it);
      B.bun.visible = true; B.bun.scale.setScalar(.72 + .38 * bagFill() / 6); B.bun.position.copy(B.c).setY(B.y0 + .15); B.bun.rotation.set(0, B.a + Math.PI, 0) }
    return;
  }
  if (B.ph === 'lift') {                                         // узел — к груди, через правое плечо — за спину
    B.t += dt / 1.0; const k = Math.min(1, B.t), bun = B.bun, mid = H[1].getWorldPosition(new THREE.Vector3()).lerp(hand, .5);
    if (k < .3) bun.position.copy(B.c).setY(B.y0 + .15).lerp(mid, sm01(k / .3));
    else if (k < .72) bun.position.copy(mid.lerp(hand, sm01((k - .3) / .2)));
    else if (k < .86) { KIRYU.bagBack.getWorldPosition(_bp); KIRYU.bagBack.getWorldQuaternion(_bq); const e = sm01((k - .72) / .14);
      bun.position.copy(hand.lerp(_bp, e)); _bq2.setFromEuler(new THREE.Euler(0, B.a + Math.PI, 0)); bun.quaternion.copy(_bq2.slerp(_bq, e)) }
    if (k >= .86 && bun.visible) { bun.visible = false; B.back = B.items.length > 0; if (!B.back) toast('Пустой мешок — обратно в рюкзак', 0); haptic('light'); saveTick && saveTick() }
    if (k >= 1) bagEnd();
  }
}
/* плащ лёг «от камеры» — Кирью сидел бы между камерой и клетками; отходит к тому боку плаща, что дальше от камеры */
function bagAside() {
  const f = BAG.f, vl = Math.hypot(VIEW.x, VIEW.z); if ((f.x * VIEW.x + f.z * VIEW.z) / vl > -.3) return null;
  const sx = Math.cos(BAG.a), sz = -Math.sin(BAG.a), sv = sx * VIEW.x + sz * VIEW.z;
  for (const u of [1.2, 1.05, .92]) for (const s of sv > 0 ? [-1, 1] : [1, -1]) for (const v of [.55, .3, .8]) {   // сетка — до 0,75 м от оси, дальше подол
    const x = CH.x + sx * s * u + f.x * v, z = CH.z + sz * s * u + f.z * v;
    if (bagPath(CH.x, CH.z, x, z, BAG.y0)) return { x, z } }
  return null;
}
/* поза для Кирью: на что он сейчас похож */
function bagPoseNow() {
  const B = BAG; if (CH.state !== 'bag') return null;
  if (B.ph === 'pull') return { ph: 'pull', k: B.t }; if (B.ph === 'spread') return { ph: 'spread', k: B.t };
  if (B.ph === 'ui') return B.aside ? null : { ph: 'squat', k: 0 }; if (B.ph === 'tie') return { ph: 'tie', k: B.t }; if (B.ph === 'lift') return { ph: 'lift', k: B.t };
  return null;
}
/* ---------- камера мешка ----------
   пока Кирью достаёт и расправляет плащ — камера подлетает к нему (сбоку-спереди, откуда ничто не заслоняет);
   плащ лёг — поднимается над передним углом участка и смотрит на слой под 60°, так, чтобы влезли плащ и весь пол вокруг;
   свернул — возвращается в обычный изометрический вид. Все параметры камеры (куда смотрит, азимут, наклон, охват, перспектива)
   догоняют цель двойной пружиной — разгон и торможение плавные, без рывков. Если между камерой и целью оказалась земля,
   ближняя плоскость отсекает её, как у телефона */
const BCK = ['tx', 'ty', 'tz', 'az', 'el', 'lv', 'pf'];
const BC = { on: false, s: {}, v: {}, w: {}, u: {}, cu: null, ov: null, nf: 0, near: .05 };
const wrapA = a => Math.atan2(Math.sin(a), Math.cos(a));
function bcIso() { const t = cam.position.clone().addScaledVector(VIEW, -60); return { tx: t.x, ty: t.y, tz: t.z, az: Math.atan2(VIEW.x, VIEW.z), el: Math.asin(VIEW.y), lv: Math.log(cam.top - cam.bottom), pf: 0 } }
const bcFov = pf => 2 + 43 * pf;
function bagLit(k) { BAG.lit = BAG.lp ? Math.round(sm01(k * 1.4) * 5) * 3 : 0 }   // рабочий свет у плаща: как фонарь послабее, ступенями — свет пересчитывается редко
const bagClear = () => BC.on ? sm01((BC.s.pf - .15) / .5) : 0;
const bagClearCol = () => BAG.y0 < -.5 ? 0x07050a : 0x5a9cb0;   // вокруг: под землёй — темнота; на поверхности — ровное небо (силуэты города сверху выглядят полосками)
function solidPt(x, y, z) {                                      // есть ли в точке земля (или стеллаж, ящик, стол)
  if (kitHit(x, z, y)) return true; if (y >= 0) return false;
  const i = Math.floor(x), j = Math.floor(z); if (i >= N || j >= N) return false; if (i < 0 || j < 0) return i >= -2 && j >= -2;
  return solidAt(i, j, Math.floor(-y / BH));
}
const _bray = new THREE.Raycaster();
function meshHit(T, P, skip) {                                   // дом, лестницы, стеллаж, стол, лавка — по настоящей геометрии
  const d = P.clone().sub(T), L = d.length(); _bray.set(T, d.divideScalar(L)); _bray.near = skip; _bray.far = L;
  const h = _bray.intersectObjects([houseG, KIT.g, KZ.g, shopG], true).find(h => h.object.visible); return h ? h.distance : Infinity;
}
function bagLos(T, P, skip = .35) {                              // от цели до камеры ничего нет
  const d = P.clone().sub(T), L = d.length(), n = Math.ceil(L / .08);
  for (let i = 0; i <= n; i++) { const s = i / n; if (s * L < skip) continue; if (solidPt(T.x + d.x * s, T.y + d.y * s, T.z + d.z * s)) return false }
  return meshHit(T, P, skip) === Infinity;
}
const bcDir = (az, el) => new THREE.Vector3(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az));
function bagCU() {                                               // крупный план: Кирью сбоку-спереди, плащ полетит поперёк кадра
  const f = BAG.f, azf = Math.atan2(f.x, f.z), az0 = Math.atan2(VIEW.x, VIEW.z), T = new THREE.Vector3(CH.x, BAG.y0 + .95, CH.z).addScaledVector(f, .55), fov = 40;
  const sd = new THREE.Vector3(f.z, 0, -f.x), C0 = new THREE.Vector3(CH.x, BAG.y0, CH.z), pts = [T, C0.clone().setY(BAG.y0 + .25), C0.clone().setY(BAG.y0 + 1.6),
    C0.clone().setY(BAG.y0 + 1).addScaledVector(sd, .45), C0.clone().setY(BAG.y0 + 1).addScaledVector(sd, -.45), C0.clone().setY(BAG.y0 + .3).addScaledVector(f, BAG.NE + BAG.SD * .6)];
  let best = null;
  for (const vh of [3.3, 2.7]) { const r = vh / 2 / Math.tan(fov * Math.PI / 360);
    for (let i = -5; i <= 5; i++) { const az = az0 + i * Math.PI / 24; for (const el of [.45, .62, .8]) {   // только с нашей стороны участка: у блоков нарисованы лишь грани, обращённые к обычной камере, — сзади видно бы было внутренности
      const P = T.clone().addScaledVector(bcDir(az, el), r); if (!pts.every(q => bagLos(q, P, .3))) continue;   // видно и Кирью целиком, и где ляжет плащ
      const rel = wrapA(az - azf), sc = Math.cos(Math.abs(rel) - .8) * 1.5 - Math.abs(wrapA(az - az0)) * .25 - (el - .45) * .5 - (vh < 3 ? .25 : 0);   // спереди-сбоку ~45°: видно лицо и сам плащ, а не ребро ткани
      if (!best || sc > best.sc) best = { sc, az, el, vh } } }
    if (best) break }
  if (!best) best = { az: az0, el: .9, vh: 3.3 };
  return { az: best.az, el: best.el, lv: Math.log(best.vh), pf: (40 - 2) / 43 };
}
function bagOV() {                                               // общий план: азимут как у обычного вида, наклон 60°, влезают плащ, Кирью и пол слоя вокруг
  const az = Math.atan2(VIEW.x, VIEW.z), el = Math.PI / 3, fov = bcFov(1), asp = W / H, tv = Math.tan(fov * Math.PI / 360), th = tv * asp;
  const dir = bcDir(az, el), fw = dir.clone().negate(), rt = new THREE.Vector3().crossVectors(fw, _UP).normalize(), up = new THREE.Vector3().crossVectors(rt, fw);
  const P = [], y0 = BAG.y0, ca = Math.cos(BAG.a), sa = Math.sin(BAG.a);
  for (const [u, v] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const x = u * BAG.SW / 2, z = v * BAG.SD / 2; P.push(new THREE.Vector3(BAG.c.x + x * ca + z * sa, y0 + .1, BAG.c.z - x * sa + z * ca)) }
  P.push(new THREE.Vector3(CH.x, y0 + 1.55, CH.z));
  const rad = asp < .8 ? 1.2 : BAG.RR + .4;                        // на узком экране телефона — поближе: вещи крупнее, их удобно брать пальцем
  ACT.forEach(([i, j], a) => { if (Math.abs(floorY(a) - y0) > .05 || Math.hypot(i + .5 - BAG.c.x, j + .5 - BAG.c.z) > rad) return;
    for (const [x, z] of [[i, j], [i + 1, j], [i, j + 1], [i + 1, j + 1]]) P.push(new THREE.Vector3(x, y0, z)) });
  const T = new THREE.Vector3(); for (const p of P) T.add(p); T.multiplyScalar(1 / P.length);
  const MX = asp < .8 ? .94 : .86, YH = .8, YL = -.62;                             // снизу — место под кнопку и панель
  let r = 3;
  for (let pass = 0; pass < 2; pass++) {
    r = 3; let lo = Infinity, hi = -Infinity;
    for (const p of P) { const d = p.clone().sub(T), x = d.dot(rt), y = d.dot(up), z = d.dot(fw);
      r = Math.max(r, Math.abs(x) / (th * MX) - z, y > 0 ? y / (tv * YH) - z : y / (tv * YL) - z) }
    for (const p of P) { const d = p.clone().sub(T), y = d.dot(up), z = d.dot(fw); const ny = y / ((r + z) * tv); lo = Math.min(lo, ny); hi = Math.max(hi, ny) }
    const hf = new THREE.Vector3(fw.x, 0, fw.z).normalize();       // по вертикали — в середину свободной части экрана: двигаем точку взгляда по полу, а не вниз сквозь него
    T.addScaledVector(hf, ((lo + hi) / 2 - (YH + YL) / 2) * r * tv / hf.dot(up));
  }
  r = Math.min(r, 18);
  return { tx: T.x, ty: T.y, tz: T.z, az, el, lv: Math.log(2 * r * tv), pf: 1 };
}
/* что-то между камерой и Кирью или плащом (доски дома, лестница, стеллаж, стол, лавка) — прячем именно эти детали, пока они мешают.
   Раньше вместо этого ближняя плоскость камеры срезала всё до помехи — вместе с землёй перед Кирью, и в срезе мелькали
   нижние слои и лавка под землёй. Землю теперь не режем: камера смотрит только с открытой стороны участка */
const BHID = new Map();                                          // спрятанная деталь -> сколько ещё секунд прятать
function bagHide(c, dt) {
  const y0 = BAG.y0, pts = [new THREE.Vector3(CH.x, y0 + 1.5, CH.z), new THREE.Vector3(CH.x, y0 + .9, CH.z), new THREE.Vector3(CH.x, y0 + .3, CH.z)];
  if (BAG.g.visible) { const ca = Math.cos(BAG.a), sa = Math.sin(BAG.a);
    for (const [u, v] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 0]]) { const x = u * BAG.SW / 2, z = v * BAG.SD / 2; pts.push(new THREE.Vector3(BAG.c.x + x * ca + z * sa, y0 + .1, BAG.c.z - x * sa + z * ca)) } }
  for (const p of pts) { const d = c.position.clone().sub(p), L = d.length(); _bray.set(p, d.divideScalar(L)); _bray.near = .2; _bray.far = L;
    for (const h of _bray.intersectObjects([houseG, KIT.g, KZ.g, shopG], true)) if (h.object.isMesh) BHID.set(h.object, .4) }
  bagHideStep(dt);
}
function bagHideStep(dt) { for (const [m, t] of BHID) { if (t - dt <= 0) { m.visible = true; BHID.delete(m) } else { BHID.set(m, t - dt); m.visible = false } } }
function bagCamStart() {
  BAG.lp = new THREE.Vector3(CH.x, BAG.y0, CH.z).addScaledVector(BAG.f, BAG.NE + BAG.SD / 2);
  if (!BC.on) { const s = bcIso(); BC.s = { ...s }; BC.w = { ...s }; BC.v = {}; BC.u = {}; for (const k of BCK) BC.v[k] = BC.u[k] = 0; BC.on = true }
  BC.cu = bagCU(); BC.ov = null;
}
function bcGoal() {
  const B = BAG, ph = B.ph;
  if (ph === 'pull' || (ph === 'spread' && B.t < .8)) {
    const k = ph === 'spread' ? B.t : 0, e = sm01((k - .3) / .5), T = new THREE.Vector3(CH.x, B.y0 + .95, CH.z).addScaledVector(B.f, .55);
    T.lerp(B.c.clone().setY(B.y0 + .3), e);
    return { tx: T.x, ty: T.y, tz: T.z, az: BC.cu.az, el: BC.cu.el + .15 * e, lv: BC.cu.lv + Math.log(1 + .35 * e), pf: BC.cu.pf, om: 3.6 } }
  if (ph === 'spread' || ph === 'ui') { if (!BC.ov) BC.ov = bagOV(); return { ...BC.ov, om: 3.1 } }
  return { ...bcIso(), om: 3.8 };
}
function stepBagCam(dt) {
  const B = BAG; B.k = Math.max(0, Math.min(1, B.k + (B.kT > B.k ? dt / 1.1 : B.kT < B.k ? -dt / 1.2 : 0)));
  B.lamp.intensity = 1.6 * Math.PI * sm01(B.k * 1.5);          // фонарь на каске светит на плащ
  bagLit(B.k);
  if (!BC.on) return;
  const G = bcGoal(), om = G.om, S = BC.s, Wv = BC.w;
  G.az = S.az + wrapA(G.az - S.az);
  const n = Math.max(1, Math.ceil(dt / .01)), h = dt / n;           // двойная пружина: цель → w → s
  for (let q = 0; q < n; q++) for (const k of BCK) {
    const g = k === 'az' ? Wv.az + wrapA(G.az - Wv.az) : G[k];
    BC.u[k] += (om * om * (g - Wv[k]) - 2 * om * BC.u[k]) * h; Wv[k] += BC.u[k] * h;
    BC.v[k] += (om * om * (Wv[k] - S[k]) - 2 * om * BC.v[k]) * h; S[k] += BC.v[k] * h }
  if (B.ph === 'ui' && BCK.every(k => Math.abs(BC.v[k]) < .006 && Math.abs(BC.u[k]) < .006)) for (const k of BCK) { S[k] = Wv[k] = G[k]; BC.v[k] = BC.u[k] = 0 }   // долетела — замираем точно в цели, без дрожи на доли пикселя
  if (!B.ph) { const I = bcIso(); let near = true;
    for (const k of BCK) if (Math.abs(k === 'az' ? wrapA(S[k] - I[k]) : S[k] - I[k]) > (k === 'pf' ? .004 : .003) || Math.abs(BC.v[k]) > .02) near = false;
    if (near) { BC.on = false; VCAM = cam; bagHideStep(1); return } }
  if (PH.k > 0) return;
  const fov = bcFov(Math.max(0, S.pf)), vh = Math.exp(S.lv), r = vh / 2 / Math.tan(fov * Math.PI / 360), c = B.cam, T = new THREE.Vector3(S.tx, S.ty, S.tz);
  const dir = bcDir(S.az, S.el);
  c.fov = fov; c.aspect = W / H; c.position.copy(T).addScaledVector(dir, r); c.up.copy(_UP); c.lookAt(T);
  c.updateMatrixWorld();
  if (r < 30) bagHide(c, dt); else bagHideStep(dt);
  c.near = Math.max(.05, r - 30); c.far = r + 120; c.updateProjectionMatrix(); c.updateMatrixWorld();
  VCAM = c;
}
/* ---------- перетаскивание: вещи с пола — в клетки, из клеток — на пол или в другие клетки ---------- */
const bagUI = document.createElement('div'); bagUI.id = 'bagui';
bagUI.innerHTML = '<button type="button">Свернуть мешок <b>0/6</b></button>';
{ const st = document.createElement('style'); st.textContent = `#bagui{position:fixed;right:max(12px,env(safe-area-inset-right,0px));bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:30;display:none}
#bagui.on{display:block}
#bagui button{font:700 14px system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#ffe9c4;background:#2b1a12;border:0;border-radius:6px;padding:11px 15px;box-shadow:0 0 0 2px #e9c88c,0 0 0 4px #2b1a12,0 6px 14px rgba(0,0,0,.45);cursor:pointer}
#bagui button b{font:800 14px ui-monospace,Menlo,Consolas,monospace;color:#ffe08a;margin-left:6px}
#bagui button:active{transform:translateY(1px)}`; document.head.append(st) }
document.body.append(bagUI);
bagUI.querySelector('button').addEventListener('click', e => { e.stopPropagation(); bagClose() });
const bagCount = () => { bagUI.querySelector('b').textContent = bagFill() + '/6' };
const bagReach = t => t.active && t.body && !t.held && !t.mounted && !t.kz && Math.abs(t.body.position.y - BAG.y0) < .75 && Math.hypot(t.body.position.x - BAG.c.x, t.body.position.z - BAG.c.z) < BAG.RR;
function bagRay(e, y) { ray.setFromCamera(ndc(e), VCAM); const r = ray.ray, d = r.direction.y; if (Math.abs(d) < 1e-4) return null; const s = (y - r.origin.y) / d; return s > 0 ? r.origin.clone().addScaledVector(r.direction, s) : null }
function bagPick(e) {
  ray.setFromCamera(ndc(e), VCAM);
  const objs = []; for (const it of BAG.items) objs.push(it.t.g); for (const t of trash) if (bagReach(t)) objs.push(t.g);
  const h = ray.intersectObjects(objs, true)[0]; if (!h) return;
  let o = h.object; while (o && !o.userData.t) o = o.parent; const t = o && o.userData.t; if (!t) return;
  const hv = TYPES[t.type].heavy; if (hv) { haptic('warn'); toast(hv === true ? 'Слишком тяжёлая — даже не сдвинуть' : hv, 0); return }
  if (TYPES[t.type].size > 2) { haptic('warn'); toast('Такое в мешок не влезет', 0); return }
  const it = BAG.items.find(x => x.t === t), D = { t, it, id: e.pointerId, q0: t.g.quaternion.clone(), cand: null, floor: null };
  if (it) { scene.attach(t.g); D.from = 'cell' }
  else { D.from = 'floor'; const b = t.body.position; D.p0 = new THREE.Vector3(b.x, BAG.y0, b.z); D.q0 = new THREE.Quaternion(t.body.quaternion.x, t.body.quaternion.y, t.body.quaternion.z, t.body.quaternion.w); bagDetach(t) }
  t.g.updateMatrixWorld(true); D.pos = t.g.localToWorld(t.com.clone()); D.pt = D.pos.clone(); BAG.drag = D; haptic('light');
  try { cv.setPointerCapture(e.pointerId) } catch (_) { }
  bagMove(e);
}
function bagCells(size, c, u) {                                  // куда ляжет вещь, если отпустить над клеткой c (u — где палец в клетке)
  if (size <= 1) return [[c]];
  const r = c / 3 | 0, q = c % 3, L = q > 0 ? [c - 1, c] : null, Rr = q < 2 ? [c, c + 1] : null;
  return (u < 0 ? [L, Rr] : [Rr, L]).concat([[q, q + 3]]).filter(Boolean);
}
function bagMove(e) {
  const D = BAG.drag; if (!D) return;
  const p = bagRay(e, BAG.y0 + BAG.LIFT), q = bagRay(e, BAG.y0); if (!p || !q) return;
  const dx = p.x - BAG.c.x, dz = p.z - BAG.c.z, l = Math.hypot(dx, dz); if (l > BAG.RR) { p.x = BAG.c.x + dx / l * BAG.RR; p.z = BAG.c.z + dz / l * BAG.RR }
  D.pt.copy(p);
  const loc = BAG.g.worldToLocal(q.clone()), size = Math.min(2, TYPES[D.t.type].size || 1);
  D.cand = null; D.bad = null; D.floor = null;
  if (Math.abs(loc.x) < 1.5 * BAG.CS + .14 && Math.abs(loc.z) < BAG.CS + .14) {
    const col = Math.max(0, Math.min(2, Math.floor((loc.x + 1.5 * BAG.CS) / BAG.CS))), row = Math.max(0, Math.min(1, Math.floor((loc.z + BAG.CS) / BAG.CS))), c = row * 3 + col;
    const busy = new Set(); for (const it of BAG.items) if (it !== D.it) for (const x of it.c) busy.add(x);
    const u = loc.x - cellXZ(c)[0];
    D.cand = bagCells(size, c, u).find(cs => cs.every(x => !busy.has(x))) || null; if (!D.cand) D.bad = c;
  } else {
    const fx = BAG.f.x, fz = BAG.f.z, sx = Math.cos(BAG.a), sz = -Math.sin(BAG.a), qx = q.x - BAG.c.x, qz = q.z - BAG.c.z, u = qx * sx + qz * sz, v = qx * fx + qz * fz;
    const nearSheet = Math.abs(u) < BAG.SW / 2 + .12 && Math.abs(v) < BAG.SD / 2 + .12, nearCH = Math.hypot(q.x - CH.x, q.z - CH.z) < .35;
    if (!nearSheet && !nearCH && Math.hypot(qx, qz) < BAG.RR && bagFlat(q.x, q.z, BAG.y0)) D.floor = q;
  }
  for (let c = 0; c < 6; c++) { const m = BAG.hl[c], on = D.cand ? D.cand.includes(c) : c === D.bad; m.visible = on; m.material.color.setHex(D.cand ? 0x7dff8a : 0xff5a4a) }
}
function bagDragStep(dt) {
  const D = BAG.drag; if (!D) return;
  const t = D.t, k = 1 - Math.exp(-dt * 18);
  let ts = 1, tq = D.q0;
  if (D.cand) { const tmp = { t, c: D.cand }; const sv = [t.g.position.clone(), t.g.quaternion.clone(), t.g.scale.x]; bagSeat(tmp); ts = tmp.s;   // как ляжет — так и держим над клетками
    tq = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, BAG.a + tmp.yaw, 0)); t.g.position.copy(sv[0]); t.g.quaternion.copy(sv[1]); t.g.scale.setScalar(sv[2]) }
  const s = t.g.scale.x + (ts - t.g.scale.x) * k; t.g.scale.setScalar(s); t.g.quaternion.slerp(tq, k);
  const com = t.com.clone().multiplyScalar(s).applyQuaternion(t.g.quaternion);
  D.pos.lerp(D.pt, k); t.g.position.copy(D.pos).sub(com);
}
function bagDrop() {
  const D = BAG.drag; if (!D) return; BAG.drag = null; const t = D.t;
  for (const m of BAG.hl) m.visible = false;
  const upright = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, BAG.a + (D.it ? D.it.yaw || 0 : 0), 0));
  if (D.cand) { let it = D.it; if (!it) { it = { t, c: D.cand }; BAG.items.push(it) } else it.c = D.cand;
    BAG.g.attach(t.g); bagSeat(it); haptic('light') }
  else if (D.floor) { if (D.it) BAG.items.splice(BAG.items.indexOf(D.it), 1); bagRelease(t, D.floor, D.from === 'floor' ? D.q0 : upright); haptic('light') }
  else if (D.it) { BAG.g.attach(t.g); bagSeat(D.it) }
  else bagRelease(t, D.p0, D.q0);
  bagCount(); saveTick && saveTick();
}
cv.addEventListener('pointerdown', e => { if (CH.state !== 'bag') return;
  if (BAG.ph === 'go' || BAG.ph === 'turn') { bagEnd(); return }          // коснулся — передумал, обычное управление
  e.stopImmediatePropagation(); if (BAG.ph === 'ui' && !BAG.drag) bagPick(e) }, true);
cv.addEventListener('pointermove', e => { if (CH.state !== 'bag') return; e.stopImmediatePropagation(); if (BAG.drag && e.pointerId === BAG.drag.id) bagMove(e) }, true);
for (const ev of ['pointerup', 'pointercancel']) cv.addEventListener(ev, e => { if (CH.state !== 'bag' && !BAG.drag) return; e.stopImmediatePropagation(); if (BAG.drag && e.pointerId === BAG.drag.id) bagDrop() }, true);
/* свет на плаще и вещах в нём — как в этой точке пола, но не темнее 0,62: его освещает фонарь на каске */
function bagLight() {
  if (!BAG.g.visible) return; const br = Math.max(.62, lightAt(BAG.c.x, BAG.y0 + .3, BAG.c.z)); if (Math.abs(br - BAG.br) < .004) return; BAG.br = br;   // в темноте плащ не чернеет
  dimGroup(BAG.flat, br, BAG.store);
  for (const it of BAG.items) { if (!it.t.base) it.t.base = new Map(); dimGroup(it.t.g, br, it.t.base); it.t.br = br }
}

