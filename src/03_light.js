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
  if (i < 0 || j < 0) return i >= N || j >= N ? skyAt(z) : 0;   // за задними стенками ничего не видно; срез расширения участка — под небом
  if (i >= N || j >= N) return Math.max(skyAt(z), LG[li(Math.min(i, N - 1), Math.min(j, N - 1), z)], i >= N && j < N ? OUTL[(z + 1) * N + j] : j >= N && i < N ? OUTL[NL * N + (z + 1) * N + i] : 0);   // открытый срез участка
  return LG[li(i, j, z)];
}
const brOf = l => Math.pow(Math.max(0, Math.min(15, l)) / 15, 2);   // уровень -> яркость (в линейном цвете)
function lightSources() {
  const out = [];
  for (const t of trash) { const L = TYPES[t.type].light; if (!L || !t.active || !t.body) continue;
    if (t.held) { out.push([Math.floor(CH.x), Math.floor(CH.z), Math.floor(-(CH.y + .9) / BH), L]); continue }   // в руках — светит там, где стоит Кирью
    const p = t.body.position; out.push([Math.floor(p.x), Math.floor(p.z), Math.floor(-(p.y + .05) / BH), L]) }
  out.push([Math.floor(SHOP.lamp.x), Math.floor(SHOP.lamp.z), Math.floor(-SHOP.lamp.y / BH), 15]);
  if (BAG.lit > 0) out.push([Math.floor(BAG.lp.x), Math.floor(BAG.lp.z), Math.floor(-(BAG.lp.y + .6) / BH), BAG.lit]);   // рабочий свет у расстеленного мешка   // фонарь в лавке (видно через открытый бок)
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
  if (lightDirty || key !== lightKey || chunkDirty.size) { lightDirty = false; lightKey = key; perf.lightN++; computeLight(src); for (const ch of chunks) if (ch) shadeChunk(ch); shadeChunk(EXT); shadeStall(); shadeDeco(); shadeWorms() }
  chunkDirty.clear();
  for (const t of trash) if (t.g.visible) { const p = t.g.position, br = lightAt(p.x, p.y + .15, p.z);
    if (t.br === undefined || Math.abs(t.br - br) > .004) { t.br = br; if (!t.base) t.base = new Map(); dimGroup(t.g, br, t.base) } }
  { const mb = Math.min(1.7, .07 + 2.5 * lightAt(MERCH.x, SHOP.floor + .7, MERCH.z));
    if (shopG.br === undefined || Math.abs(shopG.br - mb) > .004) { shopG.br = mb; dimGroup(shopG.userData.mer.root, mb, merBase) } }
  const cb = Math.max(.05, .5 * BAG.k, lightAt(CH.x, CH.y + .8, CH.z)) * (HOUSE.under ? .62 : 1);   // под полом дома — в тени    // Кирью совсем не пропадает во тьме — виден силуэт и огонёк каски
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

