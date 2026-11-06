// Подземный торговец — щуплый загорелый старик: лысый, гусарские седые усы, закрытые улыбающиеся глаза,
// голая грудь, полосатые шаровары с кушаком, огромные сапоги с загнутыми носами.
// Сидит на тёмно-красной подушке в «позе царской непринуждённости» (лалитасана / махараджалиласана):
// правая нога сложена по-турецки, левое колено поднято, левая рука лежит на колене и свешивает кисть,
// правая прямой рукой упирается в подушку позади — корпус чуть откинут на неё.
// Живёт сам по себе: покачивает головой в такт, дышит, чешет плечо, трёт лысину, подкручивает ус,
// задрёмывает и вздрагивает; кивает Кирью, когда тот подходит, и следит за ним глазами.
export function createMerchant(THREE) {
  const M = c => new THREE.MeshLambertMaterial({ color: c, flatShading: true });
  const C = {
    skin: M(0xb8784c), skinD: M(0x8e5434), skinL: M(0xd0925f), lip: M(0x6e3426),
    stache: M(0xebe8e1), stacheD: M(0xb5b1a8), brow: M(0xdedad2), eye: M(0x2a1810),
    pants: M(0x2c3c68), pantsD: M(0x1e2a4a), stripe: M(0xe8d8ac), sash: M(0xa02c28), sashD: M(0x6e1c1a),
    boot: M(0x40281a), bootL: M(0x7c4a28), bootD: M(0x24160c), sole: M(0x150e08),
    gold: M(0xd9a441), goldD: M(0xa8782a), cord: M(0x3a2618),
    cush: M(0x6a1d24), cushL: M(0x86282f), cushD: M(0x4a1218), tassel: M(0xc8952e),
  };
  const B = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const G = (parent, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g };
  const P = (parent, geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); parent.add(m); return m };
  // брусок между двумя точками в плоскости XY (для усов, бровей, глаз-дужек)
  const seg = (parent, x0, y0, x1, y1, th, dp, mat, z = 0) => { const l = Math.hypot(x1 - x0, y1 - y0);
    return P(parent, B(l + th * .6, th, dp), mat, (x0 + x1) / 2, (y0 + y1) / 2, z, 0, 0, Math.atan2(y1 - y0, x1 - x0)) };

  const LT = .34, LS = .32, UA = .26, FA = .24;                 // бедро, голень, плечо, предплечье
  const CT = .1, CZ = .04;                                     // верх подушки, её центр по глубине
  const root = new THREE.Group();

  // ---------- подушка: толстая, со стёжкой и кистями по углам ----------
  P(root, B(.84, .085, .74), C.cush, 0, .0425, CZ);
  P(root, B(.82, .02, .72), C.cushL, 0, .09, CZ);
  for (const [x, z] of [[-.2, -.17], [.2, -.17], [-.2, .2], [.2, .2], [0, .02]]) P(root, B(.035, .01, .035), C.cushD, x, CT, CZ + z);   // стёжка
  for (const [x, z] of [[-.41, -.36], [.41, -.36], [-.41, .36], [.41, .36]]) {
    P(root, B(.04, .04, .04), C.cushD, x, .085, CZ + z);
    P(root, B(.032, .06, .032), C.tassel, x * 1.05, .05, CZ + z * 1.05);          // кисти
    P(root, B(.05, .016, .05), C.tassel, x * 1.05, .012, CZ + z * 1.05);
  }
  for (const s of [-1, 1]) P(root, B(.84, .014, .014), C.cushD, 0, .085, CZ + s * .372);   // кант
  for (const s of [-1, 1]) P(root, B(.014, .014, .74), C.cushD, s * .422, .085, CZ);

  // ---------- таз и шаровары ----------
  const hips = G(root, 0, .18, -.03);
  P(hips, B(.3, .15, .24), C.pants, 0, 0, 0);
  for (const x of [-.1, -.03, .04, .11]) P(hips, B(.022, .15, .005), C.stripe, x, 0, .121);
  P(hips, B(.33, .065, .27), C.sash, 0, .07, 0);                          // кушак
  P(hips, B(.07, .07, .06), C.sashD, -.15, .06, .09);                     // узел справа
  P(hips, B(.05, .16, .03), C.sash, -.165, -.04, .12, .2, 0, .15);        // концы кушака
  P(hips, B(.045, .13, .03), C.sashD, -.13, -.03, .13, .25, 0, -.1);

  // ноги: 0 — правая (−x), 1 — левая (+x). Шаровары пузырём заправлены в огромные сапоги
  const legs = [-1, 1].map(s => {
    const th = G(hips, s * .085, -.02, .03);
    P(th, B(.17, LT + .02, .17), C.pants, 0, -LT / 2, 0);
    for (const [x, z] of [[-.035, .086], [.035, .086], [s * .086, -.03], [s * .086, .04]])
      P(th, B(Math.abs(x) > .08 ? .005 : .02, LT, Math.abs(x) > .08 ? .02 : .005), C.stripe, x, -LT / 2, z);
    const kn = G(th, 0, -LT, 0);
    P(kn, B(.16, .09, .165), C.pants, 0, 0, 0);                            // колено
    P(kn, B(.172, .1, .172), C.pants, 0, -.07, 0);                         // штанина пузырём над голенищем
    for (const x of [-.035, .035]) P(kn, B(.02, .1, .005), C.stripe, x, -.07, .087);
    P(kn, B(.164, .02, .164), C.pantsD, 0, -.118, 0);                      // сборка над сапогом
    // сапог: голенище с широким отворотом, ремешок с пряжкой
    P(kn, B(.15, .19, .15), C.boot, 0, -.225, 0);
    P(kn, B(.178, .05, .178), C.bootL, 0, -.14, 0);
    P(kn, B(.156, .022, .156), C.bootD, 0, -.255, 0);
    P(kn, B(.034, .03, .012), C.gold, 0, -.255, .08);
    const an = G(kn, 0, -LS, 0);                                           // щиколотка; стопа смотрит в +z
    P(an, B(.15, .1, .21), C.boot, 0, -.045, .03);
    P(an, B(.156, .022, .3), C.sole, 0, -.105, .045);                      // подошва
    P(an, B(.15, .05, .06), C.sole, 0, -.085, -.045);                      // каблук
    P(an, B(.12, .08, .1), C.boot, 0, -.05, .17, -.25);                    // носок сужается…
    P(an, B(.08, .06, .08), C.boot, 0, -.018, .235, -.75);                 // …и загибается вверх
    P(an, B(.046, .046, .05), C.bootL, 0, .028, .262, -1.3);               // завиток
    return { th, kn, an };
  });

  // ---------- корпус: худой, рёбра видно ----------
  const spine = G(hips, 0, .075, 0);
  P(spine, B(.23, .2, .155), C.skin, 0, .095, 0);
  P(spine, B(.02, .02, .01), C.skinD, 0, .07, .079);                      // пупок
  const chest = G(spine, 0, .19, 0);
  P(chest, B(.29, .2, .17), C.skin, 0, .1, 0);
  for (const s of [-1, 1]) {
    P(chest, B(.11, .055, .02), C.skinL, s * .068, .13, .084);              // грудь
    P(chest, B(.016, .016, .01), C.skinD, s * .07, .12, .096);              // соски
    for (let k = 0; k < 3; k++) P(chest, B(.075, .011, .01), C.skinD, s * (.09 - k * .004), .025 + k * .032, .086, 0, 0, s * .28);   // рёбра
    P(chest, B(.11, .016, .02), C.skinD, s * .07, .192, .072, 0, 0, s * .16);   // ключицы
    P(chest, B(.1, .09, .11), C.skin, s * .155, .155, 0);                   // плечи-шарики
  }
  P(chest, B(.012, .09, .008), C.skinD, 0, .09, .086);                      // грудина
  P(chest, B(.075, .07, .075), C.skin, 0, .215, .005);                      // шея
  for (const s of [-1, 1]) P(chest, B(.012, .15, .01), C.cord, s * .042, .14, .09, 0, 0, s * .32);   // шнурок
  P(chest, new THREE.CylinderGeometry(.032, .032, .012, 10), C.gold, 0, .066, .093, Math.PI / 2);     // монетка-амулет
  P(chest, new THREE.CylinderGeometry(.02, .02, .014, 8), C.goldD, 0, .066, .096, Math.PI / 2);

  // ---------- голова: лысая, седая подкова волос, усы, улыбка ----------
  const head = G(chest, 0, .235, .012);
  P(head, B(.23, .19, .235), C.skin, 0, .115, 0);
  P(head, B(.2, .07, .2), C.skin, 0, .02, .018);                            // челюсть
  P(head, B(.215, .04, .225), C.skin, 0, .225, -.004);                      // купол лысины ступеньками
  P(head, B(.18, .032, .19), C.skin, 0, .256, -.006);
  P(head, B(.12, .022, .13), C.skin, 0, .281, -.008);
  P(head, B(.07, .01, .06), C.skinL, .03, .293, .012);                      // блик на лысине
  P(head, B(.05, .01, .035), C.skinL, -.05, .265, .06);
  for (const y of [.19, .17]) P(head, B(.1, .008, .006), C.skinD, 0, y, .118);   // морщины на лбу
  // седая подкова волос вокруг затылка, клочки над ушами торчат
  P(head, B(.215, .055, .03), C.brow, 0, .14, -.118);
  for (const s of [-1, 1]) {
    P(head, B(.026, .055, .15), C.brow, s * .117, .145, -.04);
    P(head, B(.03, .03, .045), C.brow, s * .128, .175, -.01, 0, 0, s * .5);
    P(head, B(.026, .026, .04), C.brow, s * .124, .118, -.09, 0, 0, -s * .4);
  }
  for (const s of [-1, 1]) {
    // седые кустистые брови, кончики опущены
    seg(head, s * .02, .152, s * .06, .156, .028, .03, C.brow, .12);
    seg(head, s * .06, .156, s * .102, .138, .024, .028, C.brow, .114);
    // закрытые улыбающиеся глаза — дужки «^»
    const cx = s * .055;
    seg(head, cx - .03, .108, cx, .124, .012, .01, C.eye, .121);
    seg(head, cx, .124, cx + .03, .108, .012, .01, C.eye, .121);
    seg(head, s * .09, .118, s * .108, .128, .007, .008, C.skinD, .112);    // гусиные лапки
    seg(head, s * .09, .105, s * .108, .1, .007, .008, C.skinD, .112);
    P(head, B(.055, .04, .02), C.skinL, s * .068, .074, .114);              // щёки приподняты улыбкой
    // большие уши с мочками
    P(head, B(.03, .085, .06), C.skin, s * .127, .105, -.005);
    P(head, B(.03, .035, .045), C.skin, s * .129, .05, 0);
    P(head, B(.012, .05, .03), C.skinD, s * .143, .105, .0);
  }
  P(head, new THREE.TorusGeometry(.018, .005, 4, 10), C.gold, .145, .03, .005, 0, Math.PI / 2, 0);   // серьга
  // нос с горбинкой
  P(head, B(.045, .085, .05), C.skin, 0, .09, .135);
  P(head, B(.055, .045, .055), C.skinL, 0, .058, .158);
  for (const s of [-1, 1]) P(head, B(.014, .012, .01), C.skinD, s * .016, .038, .18);
  // гусарские усы: густые, концы вверх с завитком
  const stache = G(head, 0, .03, .158);
  P(stache, B(.085, .035, .04), C.stache, 0, 0, 0);
  for (const s of [-1, 1]) {
    const pts = [[.035, -.004], [.075, -.016], [.11, -.012], [.138, .008], [.152, .036], [.146, .062], [.128, .07]];
    for (let k = 0; k < pts.length - 1; k++) {
      const th = .036 - k * .0045, dp = .04 - k * .003;
      seg(stache, s * pts[k][0], pts[k][1], s * pts[k + 1][0], pts[k + 1][1], th, dp, k % 2 ? C.stacheD : C.stache, -.008 - k * .006);
    }
  }
  // улыбка под усами
  seg(head, -.03, .002, 0, -.006, .01, .01, C.lip, .148); seg(head, 0, -.006, .03, .002, .01, .01, C.lip, .148);
  P(head, B(.075, .04, .045), C.skin, 0, -.022, .1);                        // подбородок

  // ---------- руки: худые, костлявые локти, браслеты ----------
  const arms = [-1, 1].map(s => {
    const sh = G(chest, s * .165, .165, 0);
    P(sh, B(.068, UA - .03, .07), C.skin, 0, -UA / 2, 0);
    const el = G(sh, 0, -UA, 0);
    P(el, B(.07, .05, .07), C.skinD, 0, 0, -.004);
    P(el, B(.06, FA, .062), C.skin, 0, -FA / 2, 0);
    P(el, B(.076, .026, .076), C.gold, 0, -FA + .035, 0);                   // браслет
    const hd = G(el, 0, -FA, 0);                                            // кисть: пальцы вдоль −y, большой палец в +z
    P(hd, B(.032, .085, .072), C.skin, 0, -.045, 0);
    for (let k = 0; k < 4; k++) P(hd, B(.022, .07, .015), C.skin, 0, -.115, -.027 + k * .018);
    P(hd, B(.024, .055, .022), C.skin, -s * .012, -.04, .045, .5, 0, 0);
    return { sh, el, hd };
  });

  root.traverse(o => { if (o.isMesh) o.castShadow = o.receiveShadow = true });

  // ---------- поза: две кости — бедро/голень и плечо/предплечье — ставятся по целевой точке ----------
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const basisQ = (X, Y, Z) => new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z));
  function ik2(upper, lower, L1, L2, target, pole) {          // все векторы — в пространстве родителя upper
    const H = upper.position, D = target.clone().sub(H); let d = D.length(); const u = D.divideScalar(d || 1);
    d = Math.min(Math.max(d, Math.abs(L1 - L2) + 1e-3), L1 + L2 - 1e-3);
    const a = (L1 * L1 - L2 * L2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
    const n = pole.clone().addScaledVector(u, -pole.dot(u)).normalize();
    const K = H.clone().addScaledVector(u, a).addScaledVector(n, h), A = H.clone().addScaledVector(u, d);
    const t = K.clone().sub(H).normalize(), s = A.clone().sub(K).normalize();
    let X = V(0, 0, 0).crossVectors(t, s); if (X.lengthSq() < 1e-8) X.crossVectors(t, n); X.normalize();
    const Y = t.clone().negate(), Z = V(0, 0, 0).crossVectors(X, Y);
    upper.quaternion.copy(basisQ(X, Y, Z));
    const sl = s.clone().applyQuaternion(upper.quaternion.clone().invert());
    lower.rotation.set(Math.atan2(-sl.z, -sl.y), 0, 0);
    return K;
  }
  // повернуть node так, чтобы его +z смотрел в fwd, +y — в up (векторы в пространстве подушки)
  function orientQ(chainQ, fwd, up) { const Z = fwd.clone().normalize(), X = V(0, 0, 0).crossVectors(up, Z).normalize(), Y = V(0, 0, 0).crossVectors(Z, X);
    return chainQ.clone().invert().multiply(basisQ(X, Y, Z)) }
  const chainQ = (...ns) => ns.reduce((q, n) => q.multiply(n.quaternion), new THREE.Quaternion());
  const mat = o => { o.updateMatrix(); return o.matrix };
  const toLocal = (m, p) => p.clone().applyMatrix4(m.clone().invert());
  const qA = new THREE.Quaternion(), eA = new THREE.Euler();

  // плавные параметры
  const cur = { spRx: -.06, spRz: .1, chRx: .02, chRz: -.02, hdRx: -.04, hdRy: 0, hdRz: -.1, wS: 0, wR: 0, wM: 0, wN: 0 };
  let time = 0, act = null, actT = 0, actDur = 0, nextAct = 3 + Math.random() * 3, wasNear = false, look = 0;
  const ease = (k, a, b) => Math.max(0, Math.min(1, k / a, (1 - k) / b));   // нарастание и спад веса действия
  function update(dt, st = {}) {
    time += dt;
    // выбор действия: чешет плечо, трёт лысину, подкручивает ус, задрёмывает; подошёл Кирью — кивает ему
    if (st.near && !wasNear) { act = 'nod'; actT = 0; actDur = 1.4 }
    wasNear = !!st.near;
    if (act) { actT += dt; if (actT >= actDur) { act = null; nextAct = 2.5 + Math.random() * 4 } }
    else if ((nextAct -= dt) <= 0) { const r = Math.random(); act = r < .3 ? 'scratch' : r < .5 ? 'rub' : r < .78 ? 'stache' : 'doze'; actT = 0; actDur = act === 'doze' ? 3.6 : 2.8 }
    const k = act ? actT / actDur : 0;
    const tw = { wS: act === 'scratch' ? ease(k, .15, .18) : 0, wR: act === 'rub' ? ease(k, .17, .18) : 0, wM: act === 'stache' ? ease(k, .15, .18) : 0, wN: act === 'nod' ? ease(k, .1, .2) : 0 };
    // взгляд на Кирью, если рядом (в своих осях — подушка может быть повёрнута)
    const ry = root.rotation.y, px = st.px || 0, pz = st.pz || 1, lx = px * Math.cos(ry) - pz * Math.sin(ry), lz = px * Math.sin(ry) + pz * Math.cos(ry);
    const lookTo = st.near ? Math.max(-.7, Math.min(.7, Math.atan2(lx, Math.max(.3, lz)))) : 0;
    look += (lookTo - look) * (1 - Math.exp(-dt * 3));
    // целевые углы корпуса и головы: откинулся на правую руку, голова покачивается в такт
    const breath = Math.sin(time * 1.7), hum = Math.sin(time * 2.2), free = Math.max(tw.wS, tw.wR);
    const p = {
      spRx: -.06 + .01 * breath, spRz: .1 * (1 - .85 * free), chRx: .02 + .025 * breath, chRz: -.02 * (1 - free),
      hdRx: -.04 + .04 * Math.abs(Math.sin(time * 2.2)), hdRy: look + .06 * Math.sin(time * .6), hdRz: -.06 + .13 * hum,
    };
    if (tw.wS) { p.hdRz = -.32; p.hdRx = .05 }                     // чешет — голову к другому плечу, довольный
    if (tw.wR) { p.hdRx = .22; p.hdRz = .12 }                      // трёт лысину — голова наклонена
    if (tw.wM) { p.hdRx = -.18; p.hdRz = .08 }                     // подкручивает ус — гордо задрал подбородок
    if (act === 'doze') {                                          // клюёт носом и резко просыпается
      const dz = k < .78 ? Math.min(1, k / .6) : Math.max(0, 1 - (k - .78) / .05);
      p.hdRx = -.04 + .55 * dz; p.hdRz = -.05; p.chRx = .02 + .12 * dz;
      if (k > .83 && k < .95) p.hdRy = .12 * Math.sin((k - .83) * 90);
    }
    if (tw.wN) p.hdRx = -.04 + .28 * Math.max(0, Math.sin(k * Math.PI * 4));   // кивок-приветствие
    const kk = 1 - Math.exp(-dt * 6);
    for (const n of ['spRx', 'spRz', 'chRx', 'chRz', 'hdRx', 'hdRy', 'hdRz']) cur[n] += (p[n] - cur[n]) * (act === 'doze' && n === 'hdRx' && k > .78 ? 1 - Math.exp(-dt * 30) : kk);
    for (const n of ['wS', 'wR', 'wM', 'wN']) cur[n] += (tw[n] - cur[n]) * (1 - Math.exp(-dt * 10));
    spine.rotation.set(cur.spRx, 0, cur.spRz); chest.rotation.set(cur.chRx, 0, cur.chRz); head.rotation.set(cur.hdRx, cur.hdRy, cur.hdRz);
    stache.rotation.z = .04 * Math.sin(time * 3.1) * (1 - cur.wM);

    // ноги: левое колено поднято (стопа стоит на подушке), правая сложена и подоткнута под него
    const Mh = mat(hips), sway = .012 * Math.sin(time * .9);
    const kneeL = ik2(legs[1].th, legs[1].kn, LT, LS, toLocal(Mh, V(.2 + sway, CT + .116, .27)), V(.1, 1, .2));
    legs[1].an.quaternion.copy(orientQ(chainQ(hips, legs[1].th, legs[1].kn), V(.2, 0, 1), V(0, 1, 0)));
    ik2(legs[0].th, legs[0].kn, LT, LS, toLocal(Mh, V(.04, CT + .078, .14)), V(-1, .05, .35));
    legs[0].an.quaternion.copy(orientQ(chainQ(hips, legs[0].th, legs[0].kn), V(1, -.05, .12), V(0, .35, 1)));

    // руки
    const Mc = Mh.clone().multiply(mat(spine)).multiply(mat(chest)), Md = Mc.clone().multiply(mat(head));
    const kneeR = kneeL.clone().applyMatrix4(Mh);                                // колено в осях подушки
    // левая: локтем на колене, предплечье и кисть свешиваются перед голенью (или крутит ус)
    let tL = toLocal(Mc, kneeR.clone().add(V(0, -.2, .1)));
    if (cur.wM > .001) { const tip = V(.135 + .012 * Math.cos(time * 9), .09 + .012 * Math.sin(time * 9), .17).applyMatrix4(Md); tL.lerp(toLocal(Mc, tip), cur.wM) }
    ik2(arms[1].sh, arms[1].el, UA, FA, tL, V(0, .6, .8).lerp(V(1, -.8, .1), cur.wM).normalize());
    const qL = chainQ(hips, spine, chest, arms[1].sh, arms[1].el), hang = .06 * Math.sin(time * 1.3);
    arms[1].hd.quaternion.copy(orientQ(qL, V(-1, 0, hang), V(0, 1, -.15 + hang)));
    if (cur.wM > .001) arms[1].hd.quaternion.slerp(qA.setFromEuler(eA.set(-.4, 0, -.2)), cur.wM);
    // правая: прямая, ладонью в подушку позади (или чешет левое плечо / трёт лысину)
    let tR = toLocal(Mc, V(-.29, CT + .018, -.12));
    if (cur.wS > .001) tR.lerp(V(.12, .19 + .018 * Math.sin(time * 26), .055 + .012 * Math.cos(time * 26)), cur.wS);
    if (cur.wR > .001) { const top = V(-.035 + .03 * Math.sin(time * 14), .27, .02 + .025 * Math.cos(time * 14)).applyMatrix4(Md); tR.lerp(toLocal(Mc, top), cur.wR) }
    ik2(arms[0].sh, arms[0].el, UA, FA, tR, V(-.3, -.1, -1).lerp(V(-.2, -1, .7), cur.wS).lerp(V(-1, .2, .2), cur.wR).normalize());
    const qR = chainQ(hips, spine, chest, arms[0].sh, arms[0].el);
    arms[0].hd.quaternion.copy(orientQ(qR, V(-1, 0, .35), V(.35, 0, 1)));
    if (cur.wS > .001) arms[0].hd.quaternion.slerp(qA.setFromEuler(eA.set(.5, 0, 0)), cur.wS);
    if (cur.wR > .001) arms[0].hd.quaternion.slerp(qA.setFromEuler(eA.set(-.3, 0, .9)), cur.wR);
  }

  // ---------- склейка: один меш на сустав, цвета деталей — в цвета вершин ----------
  const animated = new Set([root, hips, spine, chest, head, stache, ...legs.flatMap(l => [l.th, l.kn, l.an]), ...arms.flatMap(a => [a.sh, a.el, a.hd])]);
  const VC = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  root.updateMatrixWorld(true);
  const buckets = new Map(), meshes = [];
  root.traverse(o => { if (o.isMesh) meshes.push(o) });
  for (const m of meshes) {
    let A = m.parent; while (!animated.has(A)) A = A.parent;
    const rel = A.matrixWorld.clone().invert().multiply(m.matrixWorld);
    const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone(); g.applyMatrix4(rel);
    if (!buckets.has(A)) buckets.set(A, { pos: [], nrm: [], col: [] });
    const b = buckets.get(A), p = g.attributes.position.array, n = g.attributes.normal.array, c = m.material.color;
    for (let i = 0; i < p.length; i += 3) { b.pos.push(p[i], p[i + 1], p[i + 2]); b.nrm.push(n[i], n[i + 1], n[i + 2]); b.col.push(c.r, c.g, c.b) }
    m.parent.remove(m);
  }
  for (const [A, b] of buckets) { const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(b.nrm, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(b.col, 3));
    const m = new THREE.Mesh(g, VC); m.castShadow = m.receiveShadow = true; A.add(m) }
  update(0);
  const force = a => { act = a; actT = 0; nextAct = 99; actDur = a === 'doze' ? 3.6 : a === 'nod' ? 1.4 : 2.8 };   // для отладки: запустить действие
  return { root, update, force };
}
