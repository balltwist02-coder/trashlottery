/* ---------- по лестнице: хват снизу, лазание, вылезание наверх; сверху — разворот и спуск ----------
   фазы: grab (снизу берётся за ступеньки), climb (вверх-вниз джойстиком; отпустил — встаёт на ближайшую ступеньку),
   over (руки на край, колено на край, встал), mount (сверху: развернулся, спустил ноги — over задом наперёд), off (сошёл на дно) */
const ladChain = (s, k) => { let z = 0; while (LADS.has(ladKey(s, k, z))) z++; return z };   // сколько блоков подряд от верха с лестницей
function ladFrom(ad) {                                           // упёрлись джойстиком (ad — куда): в лестницу снизу или в край над лестницей сверху
  const a = charCell();
  if (a >= 0) { const [ci, cj] = ACT[a]; let s = null, k = 0;
    if (ci === PIT0 && ad.x < -.5) { s = 'L'; k = cj } else if (cj === PIT0 && ad.z < -.5) { s = 'R'; k = ci }
    for (let z = 0; s && z < d[a]; z++) if (LADS.has(ladKey(s, k, z))) return { s, k, from: 'bottom' };
    return null }
  if (Math.abs(CH.y) > .05) return null;
  let s = null, k = 0;
  if (ad.x > .5 && CH.x > 1.2 && CH.x < PIT0) { s = 'L'; k = Math.floor(CH.z) } else if (ad.z > .5 && CH.z > 1.2 && CH.z < PIT0) { s = 'R'; k = Math.floor(CH.x) }
  return s && k >= PIT0 && k < PIT1 && LADS.has(ladKey(s, k, 0)) && d[ladCol(s, k).a] > 0 ? { s, k, from: 'top' } : null;
}
function tryLadder(s, k, from) {   // снизу — только по полной цепочке; сверху — по цепочке от верха
  const lad = CH.held && CH.held.type === 'ladder';
  if (CH.held && !(lad && from === 'bottom')) { toast(lad ? 'С лестницей в руках — только снизу' : 'С вещью в руках по лестнице не залезть', 1); return false }
  const C = ladCol(s, k), dd = d[C.a]; if (C.a < 0 || dd < 1) return false;
  if (from === 'bottom') {
    if (ladBottomTop(s, k) === null) { toast('Нижней лестницы не хватает — до неё не дотянуться', 1); return false }
    const u0 = -3 * dd + 1;
    if (lad) { const t = CH.held; t.held = false; CH.held = null;
      ladStart(C, 'sling', { u0, y1: (u0 - .5) * LAD.S, side: 'bottom', carry: false, sl: { p0: t.g.position.clone(), q0: t.g.quaternion.clone() } }); removeTrash(t) }
    else ladStart(C, 'grab', { u0, y1: (u0 - .5) * LAD.S, side: 'bottom' });
    haptic('light'); return true;
  }
  const u0 = Math.max(-3, -3 * dd + 1, -(3 * (Math.min(ladChain(s, k), dd) - 1) + 2)); ladStart(C, 'mount', { u0, yTop: CH.y, y0: (u0 - .5) * LAD.S, h3: -.25, side: 'top' }); haptic('light'); return true;
}
function ladStart(C, ph, o) {
  CH.state = 'ladder'; CH.anim = null; CH.lt = 0; CH.yd = CH.y; CH.swing = 0;
  CH.lad = Object.assign({ C, ph, t: 0, x0: CH.x, z0: CH.z, y0: CH.y, u: o.u0, dir: 1 }, o); CH.face.copy(C.n).negate();
}
function ladTap(t) {                                             // тап по повешенной лестнице
  if (CH.state !== 'walk') return;
  if (tool === 'glove' && !CH.held) { if (ladReach(ladFace(t.ls, t.lk, t.lz))) takeLadder(t); else toast('Не дотянуться до лестницы', 0); return }
  const C = ladCol(t.ls, t.lk), a = charCell();
  if (CH.held && !(CH.held.type === 'ladder' && a >= 0 && a === C.a)) { if (CH.held.type === 'ladder') toast(LAD_WHY.busy, 0); else busy(); return }
  if (a >= 0 && a === C.a) { tryLadder(t.ls, t.lk, 'bottom'); return }
  if (a < 0 && Math.abs(CH.y) < .05) { const [x, z] = C.at(-.3); if (Math.hypot(CH.x - x, CH.z - z) < .7) { tryLadder(t.ls, t.lk, 'top'); return } }
  toast('Подойди к лестнице', 0);
}
function ladOverRoot(L, k) {                                     // путь корня при вылезании: [от стенки, высота]
  const y1 = Math.min(L.y0 + .3, L.yTop - .5);
  if (k < .3) { const e = sm01(k / .3); return [LAD.OFF, lerp(L.y0, y1, e)] }
  if (k < .62) { const e = sm01((k - .3) / .32); return [lerp(LAD.OFF, .1, e), lerp(y1, L.yTop - .45, e)] }
  const e = sm01((k - .62) / .38); return [lerp(.1, L.h3, e), lerp(L.yTop - .45, L.yTop, e)];
}
function ladPut(L, h, y, yd = y) { const [x, z] = L.C.at(h); CH.x = x; CH.z = z; CH.y = y; CH.yd = yd }
function ladPose(L, ph, k) { L.pose = { ph, k, u: L.u, u0: L.u0, y: CH.yd, h: (L.C.s === 'L' ? CH.x : CH.z) - PIT0, S: LAD.S, topU: L.topU || 0, hold: L.hold || null } }
const toRoot = p => { const dx = p.x - CH.x, dy = p.y - CH.yd, dz = p.z - CH.z, c = Math.cos(CH.yaw), sn = Math.sin(CH.yaw); return [dx * c - dz * sn, dy, dx * sn + dz * c] };   // мир → координаты Кирью
function ladEnd() { const L = CH.lad; CH.state = 'walk'; CH.lad = null; CH.t = 0; CH.lt = 0;
  if (L && L.carry) { const t = makeTrash('ladder', CH.x + CH.face.x * .35, CH.y + 1, CH.z + CH.face.z * .35, CH.yaw, -1); activate(t); grabItem(t) } }
function ladOver(L, u0) {
  const [ex, ez] = L.C.at(-.42), g = groundAt(ex, ez, .3);
  Object.assign(L, { ph: 'over', t: 0, u0, u: u0, y0: CH.y, yTop: g === null ? 0 : g, h3: -.42 });
}
function stepLadder(dt, iy) {
  const L = CH.lad, C = L.C, S = LAD.S; CH.face.copy(C.n).negate(); CH.moving = false;
  if (L.ph === 'sling') {                                       // закидывает лестницу на левый бок на ремень
    L.t += dt / .55; const k = Math.min(1, L.t), SL = KIRYU.sideLad.userData.inner;
    if (!LAD.tmp) { const g = new THREE.Group(); TYPES.ladder.build(g); mergeParts(g); g.traverse(o => { if (o.isMesh) o.castShadow = true }); dimGroup(g, Math.max(.15, CH.br || 1), new Map()); scene.add(g); LAD.tmp = { g } }
    SL.updateWorldMatrix(true, false); const p1 = new THREE.Vector3(), q1 = new THREE.Quaternion(); SL.getWorldPosition(p1); SL.getWorldQuaternion(q1);
    const e = sm01(k); LAD.tmp.g.position.lerpVectors(L.sl.p0, p1, e).y += .2 * Math.sin(Math.PI * e); LAD.tmp.g.quaternion.slerpQuaternions(L.sl.q0, q1, e);
    ladPose(L, 'grab', 0);
    if (k < 1) return;
    scene.remove(LAD.tmp.g); LAD.tmp = null; L.carry = true; L.ph = 'grab'; L.t = 0; haptic('light'); return;
  }
  if (L.ph === 'grab') {
    L.t += dt / .65; const k = Math.min(1, L.t), e = sm01(k / .4), [tx, tz] = C.at(LAD.OFF);
    CH.x = lerp(L.x0, tx, e); CH.z = lerp(L.z0, tz, e); CH.y = CH.yd = lerp(L.y0, L.y1, sm01((k - .35) / .65));
    if (k < 1) { ladPose(L, 'grab', k); return }
    if (L.u0 >= -3) ladOver(L, L.u0); else { L.ph = 'climb'; L.u = L.u0 }
  }
  if (L.ph === 'climb') {
    let c = -iy; c = Math.abs(c) > .35 ? Math.sign(c) : 0;
    if (c) L.dir = c;
    const dd = d[C.a], uLow = -3 * dd + 1, ch = ladChain(C.s, C.k), full = ch >= dd, zt = ladBottomTop(C.s, C.k);
    const uBot = L.side === 'bottom' || full ? uLow : -(3 * (Math.min(ch, dd) - 1) + 2);
    const uMax = !full && L.side === 'bottom' && zt !== null ? Math.max(uLow, -3 * zt - 4) : null;   // по неполной цепочке снизу — до её верха
    L.topU = uMax === null ? 0 : -3 * zt;
    let v = c > 0 ? LAD.UP : c < 0 ? -LAD.DN : 0, nu = L.u;
    if (!c && nu !== Math.round(nu)) v = L.dir > 0 ? LAD.UP : -LAD.DN;   // отпустили — дотягивается до ступеньки и замирает
    nu += v * dt;
    if (!c && v > 0 && Math.floor(nu) > Math.floor(L.u)) nu = Math.floor(nu);
    if (!c && v < 0 && Math.ceil(nu) < Math.ceil(L.u)) nu = Math.ceil(nu);
    if (uMax !== null && nu >= uMax) {
      nu = uMax; L.u = uMax; ladPut(L, LAD.OFF, (uMax - .5) * S);
      if (c > 0 && !L.topHint) { L.topHint = true; toast(L.carry ? 'Выше лестницы нет — тапни по блоку над ней, повешу' : 'Выше лестницы нет', 0) }
      ladPose(L, 'climb', 0); return;
    }
    else if (c > 0 && nu >= -3) { L.u = Math.max(-3, Math.round(L.u)); ladPut(L, LAD.OFF, (L.u - .5) * S); ladOver(L, L.u) }
    else if (c < 0 && nu <= uBot) {
      L.u = uBot; ladPut(L, LAD.OFF, (uBot - .5) * S);
      if (full || L.side === 'bottom') Object.assign(L, { ph: 'off', t: 0, y0: CH.y });
      else { ladEnd(); CH.state = 'fall'; CH.vy = 0; toast('Лестница кончилась!', 0); return }   // ниже лестниц нет — отпустил руки
    } else {
      L.u = Math.max(uBot, nu); const n = Math.floor(L.u); ladPut(L, LAD.OFF, (L.u - .5) * S, (n + sm01(L.u - n) - .5) * S); ladPose(L, 'climb', 0); return;
    }
  }
  if (L.ph === 'place') {                                       // снимает лестницу с бока и вешает на блок над цепочкой
    L.t += dt / 1.4; const k = Math.min(1, L.t), F = ladFace(C.s, C.k, L.ext.z);
    if (k < .3) { const p = new THREE.Vector3(); KIRYU.sideLad.userData.inner.getWorldPosition(p); L.hold = { i: 1, p: toRoot(p), w: sm01(k / .3) } }
    else if (k < .78) {
      if (!LAD.tmp) { const g = new THREE.Group(); TYPES.ladder.build(g); mergeParts(g); const SL = KIRYU.sideLad.userData.inner; SL.updateWorldMatrix(true, false); SL.getWorldPosition(g.position); SL.getWorldQuaternion(g.quaternion);
        LAD.tmp = { g, p0: g.position.clone(), q0: g.quaternion.clone(), p1: F.c.clone().addScaledVector(F.n, LAD.STAND), q1: new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(V3(0, 1, 0), F.n, F.u)) };
        g.traverse(o => { if (o.isMesh) o.castShadow = true }); dimGroup(g, Math.max(.15, CH.br || 1), new Map()); scene.add(g); L.carry = false }
      const T = LAD.tmp, e = sm01((k - .3) / .45);
      T.g.position.lerpVectors(T.p0, T.p1, e).addScaledVector(F.n, .25 * Math.sin(Math.PI * e)); T.g.quaternion.slerpQuaternions(T.q0, T.q1, e);
      const gp = T.g.position.clone().addScaledVector(F.u, .12).addScaledVector(F.n, .06); L.hold = { i: 1, p: toRoot(gp), w: 1 };
    } else {
      if (LAD.tmp) { scene.remove(LAD.tmp.g); LAD.tmp = null; mountLadder(C.s, C.k, L.ext.z, false); haptic('medium');
        const p = onFace(F, 0, 0, .1); burst(p.x, p.y, p.z, ['#d9a35c', '#8c7a6a', '#5e4c42'], 8, .3) }
      if (L.hold) L.hold.w = 1 - sm01((k - .78) / .22);
    }
    if (k >= 1) { L.hold = null; L.ext = null; L.ph = 'climb'; L.topHint = false; if (ladBottomTop(C.s, C.k) === 0) toast('Лестница до самого верха!', 1) }
    ladPose(L, 'climb', 0); return;
  }
  if (L.ph === 'over') {
    L.t += dt / 1.15; const k = Math.min(1, L.t), [h, y] = ladOverRoot(L, k); ladPut(L, h, y);
    if (k >= 1) { ladEnd(); CH.land = .06; haptic('light'); return }
    ladPose(L, 'over', k); return;
  }
  if (L.ph === 'mount') {
    L.t += dt / 1.35; const m = Math.min(1, L.t);
    if (m < .2) { const e = sm01(m / .2), [tx, tz] = C.at(L.h3); CH.x = lerp(L.x0, tx, e); CH.z = lerp(L.z0, tz, e); CH.y = CH.yd = L.yTop; ladPose(L, 'over', 1); return }
    const kov = 1 - (m - .2) / .8, [h, y] = ladOverRoot(L, kov); ladPut(L, h, y);
    if (m < 1) { ladPose(L, 'over', kov); return }
    L.ph = 'climb'; L.u = L.u0; ladPut(L, LAD.OFF, (L.u0 - .5) * S); ladPose(L, 'climb', 0); return;
  }
  if (L.ph === 'off') {
    L.t += dt / .35; const k = Math.min(1, L.t); ladPut(L, LAD.OFF + .12 * sm01(k), lerp(L.y0, floorY(C.a), sm01(k)));
    if (k >= 1) { ladEnd(); CH.land = .05; return }
    ladPose(L, 'off', k);
  }
}
/* камера на лестнице: с ортокамеры перетекает в перспективу снизу сбоку — как в Metal Gear; на краю поднимается вместе с Кирью */
const LCT = window.__LCT = { ang: .62, el: -.2, bot: .14, top: .35, vh: 3.3, fov: 38, dy: .2, clip: .9 };   // у дна смотрит чуть сверху — иначе под полом видно небо
const LC = { k: 0, cam: new THREE.PerspectiveCamera(30, 1, .03, 300), t: new THREE.Vector3(), C: null, el: 0, init: false };
function stepLadCam(dt) {
  const on = CH.state === 'ladder'; if (on) LC.C = CH.lad.C;
  LC.k = Math.max(0, Math.min(1, LC.k + (on ? dt / .8 : -dt / .9)));
  if (LC.k <= 0 || PH.k > 0 || !LC.C) { LC.init = false; return }
  const C = LC.C, ph = on ? CH.lad.ph : 'out', hF = on && C.a >= 0 ? CH.yd - floorY(C.a) : 9;
  const elT = ph === 'over' || ph === 'mount' ? LCT.top : lerp(LCT.bot, LCT.el, sm01((hF - .2) / 1.4));
  const tg = new THREE.Vector3(CH.x, (on ? CH.yd : CH.y) + 1 + LCT.dy, CH.z);
  if (!LC.init) { LC.init = true; LC.el = elT; LC.t.copy(tg) }
  LC.el += (elT - LC.el) * (1 - Math.exp(-dt * 2.5)); LC.t.lerp(tg, 1 - Math.exp(-dt * 6));
  const d1 = C.n.clone().multiplyScalar(Math.cos(LCT.ang)).addScaledVector(C.t, Math.sin(LCT.ang)).multiplyScalar(Math.cos(LC.el)); d1.y = Math.sin(LC.el); d1.normalize();
  const e = ease3(LC.k), dir = VIEW.clone().lerp(d1, e).normalize();
  const t0 = cam.position.clone().addScaledVector(VIEW, -60), tgt = t0.lerp(LC.t, e);
  const h0 = cam.top - cam.bottom, vh = h0 * Math.pow(LCT.vh / h0, e), fov = 2 + (LCT.fov - 2) * e;
  const dist = vh / 2 / Math.tan(fov * Math.PI / 360), c = LC.cam;
  c.fov = fov; c.aspect = W / H; c.near = Math.max(.03, dist - (40 + (LCT.clip - 40) * e)); c.far = dist + 120; c.updateProjectionMatrix();
  c.position.copy(tgt).addScaledVector(dir, dist); c.lookAt(tgt); c.updateMatrixWorld();
  VCAM = c;
}
