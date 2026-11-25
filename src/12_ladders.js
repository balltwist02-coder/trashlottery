/* ---------- лестницы ----------
   лестница — предмет высотой в блок. С ней в руках тап по грани декоративной стенки (левая — грани +x блоков i=1, правая — грани +z блоков j=1)
   вешает её на этот блок; перчаткой снимается обратно в руки. Вылезти из ямы можно, только если лестница висит на каждом блоке от дна клетки до верха.
   ступенька U — на высоте (U − ½)·S, S = BH/3: три ступеньки на блок. На лестнице Кирью стоит в LAD.OFF от стенки, лицом к ней.
   на верху левой стенки — стартовый набор: стеллаж с 4 лестницами и ящик с фонарём; на каждом новом участке — заново */
const LAD = { S: BH / 3, OFF: .45, STAND: .065, UP: 2.8, DN: 3.6, hint: false };
const LADS = new Map();                                          // 'L3,2' -> повешенная лестница (запись в trash с t.mounted, без физики)
const ladKey = (s, k, z) => s + k + ',' + z;
const ladFace = (s, k, z) => s === 'L' ? faceFrame(1, k, z, 0) : faceFrame(k, 1, z, 4);
const sm01 = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
function ladCol(s, k) {                                         // колонна стенки: нормаль в яму, направление вбок, клетка ямы перед ней, точка в h от стенки
  const L = s === 'L';
  return { s, k, n: L ? V3(1, 0, 0) : V3(0, 0, 1), t: L ? V3(0, 0, 1) : V3(1, 0, 0), a: isAct(L ? PIT0 : k, L ? k : PIT0), at: h => L ? [PIT0 + h, k + .5] : [k + .5, PIT0 + h] };
}
function ladReach(F) { const dy = F.c.y - CH.y; return dy > -1 && dy < 1.45 && Math.hypot(F.c.x - CH.x, F.c.z - CH.z) < .95 }
const LAD_WHY = { no: 'Лестницу — только на стенку ямы', shop: 'На лавку торговца лестницу не повесить', busy: 'Тут уже висит лестница', far: 'Не дотянуться — подойди ближе' };
function ladOk(s, k, z) {                                        // '' — можно повесить; иначе причина
  if (k < PIT0 || k >= PIT1 || z < 0) return 'no';
  const i = s === 'L' ? 1 : k, j = s === 'L' ? k : 1, a = ladCol(s, k).a;
  if (inShop(i, j, z)) return 'shop';
  if (!hasB(i, j, z) || a < 0 || d[a] <= z) return 'no';
  if (LADS.has(ladKey(s, k, z))) return 'busy';
  return ladReach(ladFace(s, k, z)) ? '' : 'far';
}
function mountLadder(s, k, z, quiet) {
  const key = ladKey(s, k, z); if (LADS.has(key)) return null;
  const F = ladFace(s, k, z), t = makeTrash('ladder', 0, 0, 0, 0, -1), br = M(0x3a3f45);
  for (const x of [-1, 1]) for (const zz of [-1, 1]) {            // железные скобы до стенки
    const m = new THREE.Mesh(new THREE.BoxGeometry(.05, LAD.STAND, .045), br); m.position.set(x * (BH / 2 - .1), -LAD.STAND / 2, zz * .2);
    m.castShadow = m.receiveShadow = true; m.userData.t = t; t.g.add(m) }
  t.g.position.copy(F.c).addScaledVector(F.n, LAD.STAND);
  t.g.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(V3(0, 1, 0), F.n, F.u)); t.g.updateMatrixWorld(true);
  Object.assign(t, { active: true, mounted: key, ls: s, lk: k, lz: z }); LADS.set(key, t);
  if (!quiet) { const sp = SPOTS.find(q => q.i === F.i && q.j === F.j && q.z === z && q.F.f === F.f);   // повесили поверх червей — гнездо пропадает
    if (sp && sp.state !== 2) { sp.state = 2; buildWorms(); toast('Черви расползлись из-под лестницы', 0) } }
  return t;
}
function placeLadder(s, k, z) {
  const t = CH.held; t.held = false; CH.held = null; removeTrash(t);
  const F = ladFace(s, k, z); faceTo(F.c.x, F.c.z); mountLadder(s, k, z, false);
  CH.swing = .3; haptic('medium'); const p = onFace(F, 0, 0, .1); burst(p.x, p.y, p.z, ['#d9a35c', '#8c7a6a', '#5e4c42'], 8, .3);
  if (!LAD.hint) { LAD.hint = true; toast('Держится. Вылезти — только если лестница на каждом блоке до верха', 1) }
}
function takeLadder(t) {                                         // перчаткой: лестница со стенки — в руки
  const p = t.g.position.clone(); LADS.delete(t.mounted); removeTrash(t); faceTo(p.x, p.z);
  const it = makeTrash('ladder', CH.x + CH.face.x * .35, CH.y + 1, CH.z + CH.face.z * .35, CH.yaw, -1); activate(it); grabItem(it);
  burst(p.x, p.y, p.z, ['#8c7a6a', '#5e4c42'], 6, .3);
}
function ladFromHit(h) {                                         // тап пришёлся в грань декоративной стенки, обращённую к яме
  const u = h && h.object.userData; if (!u || u.kind !== 'b') return null;
  if (u.i === 1 && u.j >= PIT0 && u.j < PIT1 && h.point.x > 1.97) return { s: 'L', k: u.j, z: u.z };
  if (u.j === 1 && u.i >= PIT0 && u.i < PIT1 && h.point.z > 1.97) return { s: 'R', k: u.i, z: u.z };
  return null;
}
function ladderAhead() {                                         // куда повесить лестницу клавишей действия: стенка перед Кирью
  const a = charCell(); let s = null, k = 0, zs = [];
  if (a >= 0) { const [ci, cj] = ACT[a]; if (ci === PIT0 && CH.face.x < -.7) { s = 'L'; k = cj } else if (cj === PIT0 && CH.face.z < -.7) { s = 'R'; k = ci } zs = [d[a] - 1, d[a] - 2] }
  else if (Math.abs(CH.y) < .05) { if (CH.x > 1.2 && CH.x < PIT0 && CH.face.x > .7) { s = 'L'; k = Math.floor(CH.z) } else if (CH.z > 1.2 && CH.z < PIT0 && CH.face.z > .7) { s = 'R'; k = Math.floor(CH.x) } zs = [0] }
  if (!s) return null;
  for (const z of zs) if (ladOk(s, k, z) === '') return { s, k, z };
  return null;
}
/* наращивание снизу: лестница в руках, Кирью стоит под цепочкой, которая стоит на дне. Тап по блоку сразу над её верхом —
   Кирью вешает лестницу на левый бок (спина — под мешок), лезет, у верха снимает её с бока и вешает, потом спускается */
function ladBottomTop(s, k) {                                     // верхний блок цепочки, которая стоит на дне клетки (или null)
  const a = ladCol(s, k).a; if (a < 0) return null; const dd = d[a];
  if (dd < 1 || !LADS.has(ladKey(s, k, dd - 1))) return null;
  let zt = dd - 1; while (zt > 0 && LADS.has(ladKey(s, k, zt - 1))) zt--; return zt;
}
/* лестница в руках + уже висящая цепочка снизу: Кирью закидывает лестницу на левый бок (спина — под мешок) и лезет сам.
   Долез до верха цепочки — тап по блоку над ней (или клавиша действия): снимает лестницу с бока и вешает, остаётся на месте */
function ladNextZ() {                                             // блок, куда сейчас можно повесить лестницу с лестницы (или null)
  const L = CH.lad; if (!L || !L.carry || L.ph !== 'climb' || L.side !== 'bottom') return null;
  const zt = ladBottomTop(L.C.s, L.C.k); if (!zt) return null;
  const dd = d[L.C.a], uMax = Math.max(-3 * dd + 1, -3 * zt - 4); if (Math.abs(L.u - uMax) > .01) return null;
  const s = L.C.s, k = L.C.k, i = s === 'L' ? 1 : k, j = s === 'L' ? k : 1, z = zt - 1;
  return inShop(i, j, z) || !hasB(i, j, z) ? null : z;
}
function ladPlaceTap(h) {                                         // тап (или действие), пока Кирью на лестнице
  const L = CH.lad; if (!L || !L.carry || L.ph !== 'climb') return;
  const m = h && h.object.userData.t, t = m && m.mounted ? { s: m.ls, k: m.lk, z: m.lz } : h && ladFromHit(h), z = ladNextZ();
  if (h && (!t || t.s !== L.C.s || t.k !== L.C.k)) { toast('Тапни по блоку прямо над лестницей', 0); return }
  if (z === null) { const zt = ladBottomTop(L.C.s, L.C.k); toast(zt === 0 ? 'Тут уже до самого верха' : 'Долезь до верха лестницы', 0); return }
  if (t && (t.z < z - 1 || t.z > z + 1)) { toast('Тапни по блоку прямо над лестницей', 0); return }
  Object.assign(L, { ph: 'place', t: 0, ext: { z } });
}
function ladderInReach() {                                       // повешенная лестница перед Кирью, до которой он дотягивается
  let best = null, bd = 9;
  for (const t of LADS.values()) { const F = ladFace(t.ls, t.lk, t.lz); if (!ladReach(F)) continue;
    const dx = F.c.x - CH.x, dz = F.c.z - CH.z; if (dx * CH.face.x + dz * CH.face.z <= 0) continue;
    const dd = Math.abs(F.c.y - CH.y - .5); if (dd < bd) { bd = dd; best = t } }
  return best;
}
function ladTargets() {                                          // грани, куда сейчас можно повесить лестницу (для подсветки)
  const out = [], z0 = Math.max(0, Math.floor(-CH.y / BH) - 2), key = (s, k, z) => s === 'L' ? '1,' + k + ',' + z : k + ',1,' + z;
  if (CH.state === 'ladder') { const z = ladNextZ(); if (z !== null) out.push(key(CH.lad.C.s, CH.lad.C.k, z)); return out }
  for (const s of ['L', 'R']) for (let k = PIT0; k < PIT1; k++)
    for (let z = z0; z < z0 + 4; z++) if (ladOk(s, k, z) === '') out.push(key(s, k, z));
  return out;
}
/* ---------- стартовый набор: стеллаж с лестницами и ящик с фонарём на верху левой стенки ---------- */
const RACK = { x0: .27, x1: .82, z0: .86, z1: 2.84, top: 1.02 }, CRATE = { x0: .3, x1: .86, z0: 3.02, z1: 3.56, top: .46 };
const KIT = { g: new THREE.Group(), rk: 4, lads: [] }; scene.add(KIT.g);
const TBL = { x0: .76, x1: 1.44, z0: 3.8, z1: 4.6, top: .68 }, KZP = { x: .42, z: 4.24, ry: 1.25, r: .24 };   // стол Кудзуя-сан и где стоит он сам
const kitHit = (x, z, y) => (x > RACK.x0 && x < RACK.x1 && z > RACK.z0 && z < RACK.z1 && y < RACK.top - .05) || (x > CRATE.x0 && x < CRATE.x1 && z > CRATE.z0 && z < CRATE.z1 && y < CRATE.top - .05)
  || (x > TBL.x0 - .03 && x < TBL.x1 + .03 && z > TBL.z0 - .03 && z < TBL.z1 + .03 && y < TBL.top - .05) || (Math.hypot(x - KZP.x, z - KZP.z) < KZP.r && y < 1.1);
{ const kb = (g, x0, x1, y0, y1, z0, z1, c) => { const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), M(c)); m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); g.add(m) };
  const r = new THREE.Group(), D = 0x6b4424, Dd = 0x4e301a, Lc = 0x8a5a30;
  for (const z of [RACK.z0, RACK.z1 - .07]) { kb(r, .3, .37, 0, 1, z, z + .07, D); kb(r, .7, .77, 0, .24, z, z + .07, D); kb(r, .3, .77, .02, .09, z, z + .07, Dd); kb(r, .3, .37, .45, .5, z - .005, z + .075, Dd) }
  kb(r, .3, .4, .7, .78, RACK.z0, RACK.z1, Lc);                   // жердь: на неё опираются лестницы
  kb(r, .3, .37, .93, 1, RACK.z0, RACK.z1, Dd);                   // верхняя связь
  kb(r, .66, .74, .13, .21, RACK.z0, RACK.z1, Lc);                // упор для низа лестниц
  mergeParts(r); r.traverse(o => { if (o.isMesh) { o.userData.rack = true; o.castShadow = o.receiveShadow = true } }); KIT.g.add(r);
  const c = new THREE.Group(), W0 = 0x9a6436, W1 = 0x7a4c28, W2 = 0x553319, { x0, x1, z0, z1, top } = CRATE;
  kb(c, x0 + .02, x1 - .02, 0, top - .02, z0 + .02, z1 - .02, W0);
  for (const y of [.03, .2, .37]) kb(c, x0, x1, y, y + .06, z0, z1, W1);                 // планки по кругу
  for (const [x, z] of [[x0, z0], [x1 - .05, z0], [x0, z1 - .05], [x1 - .05, z1 - .05]]) kb(c, x, x + .05, 0, top, z, z + .05, W2);   // рёбра по углам
  kb(c, x0 + .01, x1 - .01, top - .03, top, z0 + .01, z1 - .01, W1);                       // крышка
  mergeParts(c); c.traverse(o => { if (o.isMesh) { o.userData.crate = true; o.castShadow = o.receiveShadow = true } }); KIT.g.add(c);
  for (const b of [RACK, CRATE]) { const body = new CANNON.Body({ mass: 0, type: CANNON.Body.STATIC, collisionFilterGroup: G_BLOCK, collisionFilterMask: G_TRASH });
    body.addShape(new CANNON.Box(new CANNON.Vec3((b.x1 - b.x0) / 2, b.top / 2, (b.z1 - b.z0) / 2))); body.position.set((b.x0 + b.x1) / 2, b.top / 2, (b.z0 + b.z1) / 2); world.addBody(body) } }
function rackShow() {                                            // лестницы на стеллаже — сколько осталось
  for (const m of KIT.lads) KIT.g.remove(m); KIT.lads = [];
  for (let n = 0; n < KIT.rk; n++) { const g = new THREE.Group(), a = .22; TYPES.ladder.build(g); mergeParts(g);
    g.rotation.z = Math.PI / 2 + a; g.position.set(.62 - Math.sin(a) * BH / 2, Math.cos(a) * BH / 2 + .01, RACK.z0 + .3 + n * .46);
    g.traverse(o => { if (o.isMesh) { o.userData.rack = true; o.castShadow = o.receiveShadow = true } }); KIT.g.add(g); KIT.lads.push(g) }
}
const rackNear = () => Math.abs(CH.y) < .3 && CH.x > RACK.x1 - .1 && CH.x < RACK.x1 + .9 && CH.z > RACK.z0 - .3 && CH.z < RACK.z1 + .3;
function useRack() {
  if (!rackNear()) { toast('Надо подойти к стеллажу', 0); return }
  faceTo(RACK.x0, Math.max(RACK.z0, Math.min(RACK.z1, CH.z)));
  const held = CH.held;
  if (held) {
    if (held.type !== 'ladder') { shakeTool(tool); toast('На стеллаж — только лестницы'); return }
    if (KIT.rk >= 4) { toast('Стеллаж полный'); return }
    held.held = false; CH.held = null; removeTrash(held); KIT.rk++; rackShow(); haptic('light'); return }
  if (tool !== 'glove') { shakeTool(tool); toast(KIT.rk ? 'Лестницы со стеллажа берут перчаткой' : 'Стеллаж пустой', 0); return }
  if (!KIT.rk) { shakeTool('glove'); toast('Стеллаж пустой'); return }
  KIT.rk--; rackShow();
  const t = makeTrash('ladder', CH.x + CH.face.x * .35, CH.y + 1, CH.z + CH.face.z * .35, CH.yaw, -1); activate(t); grabItem(t);
}
