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
if (GAME.w) SPOTS.forEach((s, k) => s.state = GAME.w[k] | 0);   // черви из сохранения
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
  if (!spotReach(s)) { toast('Черви далеко — надо подойти к стенке', 0); return }
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
  toast('Банка с червями! Гнездо опустело', 2); haptic('medium');
}

