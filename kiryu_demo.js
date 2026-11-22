// Кирью Нагасаки — заглушка персонажа до нарисованных спрайтов.
// Пластика: высокий, сутулый, колени сильно согнуты и разведены наружу, длинные руки в карманах с торчащими локтями,
// широкий корпус, голова вынесена вперёд. Внешность: зелёная каска с фонарём, чёрные объёмные волосы во все стороны,
// белая рубашка с подтяжками, чёрные штаны, жёлтые перчатки, тяжёлые сапоги.
export function createKiryu(THREE) {
  const M = c => new THREE.MeshLambertMaterial({ color: c, flatShading: true });
  const C = {
    skin: M(0xf0d2b8), skinD: M(0xd4a88c), hair: M(0x1c1a20), hairL: M(0x2c2a33),
    shirt: M(0xf1f1ea), shirtD: M(0xc9ccc4), green: M(0x8cc65a), greenD: M(0x5f9a3e), greenK: M(0x3d6a2b),
    pants: M(0x1d1d24), pantsL: M(0x2c2c36), boot: M(0x1b2b26), bootL: M(0x31463e), belt: M(0x3a2c24), metal: M(0x9aa6a0),
    glove: M(0xf0c232), gloveD: M(0xc89a1c), iris: M(0x2fa58f), eyeW: M(0xf7f4ee), lash: M(0x15100e), mouth: M(0x7a3b34),
    lamp: M(0xf4f9e8), lampD: M(0x5f6e68),
  };
  const B = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const G = (parent, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g };
  const P = (parent, geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); parent.add(m); return m };

  const LT = .36, LS = .36, ANK = .12, UA = .27, FA = .25;   // бедро, голень, щиколотка, плечо, предплечье
  const root = new THREE.Group();
  const hips = G(root, 0, .8, 0);
  P(hips, B(.34, .15, .22), C.pants, 0, .03, 0);
  P(hips, B(.35, .035, .23), C.belt, 0, .1, 0);
  P(hips, B(.05, .035, .012), C.metal, 0, .1, .118);
  for (const s of [-1, 1]) P(hips, B(.012, .07, .1), C.pantsL, s * .171, .02, .02);   // карманы по бокам
  // ноги: 0 — правая (−x), 1 — левая (+x); бедро сначала разворачивается наружу (Y), потом сгибается (X)
  const legs = [-1, 1].map(s => {
    const th = G(hips, s * .1, 0, 0); th.rotation.order = 'YXZ';
    P(th, B(.135, LT + .02, .145), C.pants, 0, -LT / 2, 0);
    P(th, B(.14, .03, .15), C.pantsL, 0, -LT + .02, 0);          // колено
    const kn = G(th, 0, -LT, 0);
    P(kn, B(.12, .18, .13), C.pants, 0, -.09, 0);
    P(kn, B(.14, .2, .15), C.boot, 0, -.25, 0);                  // голенище
    P(kn, B(.15, .028, .16), C.bootL, 0, -.155, 0);
    const an = G(kn, 0, -LS, 0);
    P(an, B(.14, .095, .25), C.boot, 0, -.07, .045);             // ступня
    P(an, B(.145, .024, .255), C.bootL, 0, -.108, .045);         // подошва
    return { th, kn, an };
  });
  // корпус из двух частей — живот и грудь, чтобы спина гнулась дугой
  const spine = G(hips, 0, .11, 0);
  P(spine, B(.34, .23, .21), C.shirt, 0, .11, 0);
  const chest = G(spine, 0, .22, 0);
  P(chest, B(.42, .19, .24), C.shirt, 0, .09, 0);
  P(chest, B(.47, .07, .24), C.shirt, 0, .17, 0);                // широкие плечи
  for (const [g, h] of [[spine, .23], [chest, .2]]) {
    P(g, B(.016, h, .01), C.shirtD, 0, h / 2, g === spine ? .106 : .121);   // планка
    for (const s of [-1, 1]) {
      P(g, B(.04, h + .01, .012), C.greenK, s * .095, h / 2, g === spine ? .108 : .123);   // подтяжки спереди
      P(g, B(.04, h + .01, .012), C.greenK, s * .08, h / 2, g === spine ? -.108 : -.123);  // и сзади
    }
  }
  for (const y of [.04, .12, .2]) P(spine, B(.02, .02, .012), C.shirtD, .018, y, .108);
  for (const s of [-1, 1]) {
    P(chest, B(.09, .035, .06), C.shirtD, s * .055, .205, .09, 0, 0, s * .45);   // воротник
    P(spine, B(.035, .03, .016), C.metal, s * .095, .015, .112);                   // зажимы подтяжек
  }
  P(chest, B(.1, .06, .1), C.skin, 0, .225, .03);                 // шея
  // руки: длинные, локти наружу
  const arms = [-1, 1].map(s => {
    const sh = G(chest, s * .245, .16, 0);
    P(sh, B(.125, .11, .13), C.shirt, 0, -.04, 0);
    P(sh, B(.13, .018, .135), C.shirtD, 0, -.095, 0);
    P(sh, B(.075, UA - .09, .08), C.skin, 0, -.095 - (UA - .09) / 2, 0);
    const el = G(sh, 0, -UA, 0);
    P(el, B(.07, FA, .075), C.skin, 0, -FA / 2, 0);
    const hd = G(el, 0, -FA, 0);
    P(hd, B(.115, .115, .115), C.glove, 0, -.045, 0);
    P(hd, B(.125, .035, .125), C.gloveD, 0, .015, 0);              // раструб перчатки
    return { sh, el, hd };
  });
  // голова: вынесена вперёд над сутулыми плечами
  const head = G(chest, 0, .245, .05);
  P(head, B(.3, .27, .27), C.skin, 0, .15, .02);
  P(head, B(.24, .05, .22), C.skin, 0, .01, .035);                // подбородок
  P(head, B(.024, .04, .022), C.skinD, 0, .1, .165);              // нос
  for (const s of [-1, 1]) P(head, B(.03, .07, .05), C.skin, s * .155, .13, .01);
  const eyes = [-1, 1].map(s => {
    const e = G(head, s * .066, .13, .156);
    P(e, B(.072, .046, .01), C.eyeW, 0, 0, 0);
    P(e, B(.036, .046, .012), C.iris, -s * .012, 0, .002);
    P(e, B(.082, .018, .014), C.lash, 0, .027, .002);
    P(head, B(.085, .02, .014), C.hair, s * .072, .185, .158, 0, 0, s * .3);     // брови вниз к переносице
    return e;
  });
  P(head, B(.06, .014, .01), C.mouth, .02, .055, .157, 0, 0, .15);              // ухмылка
  // волосы: густая чёрная шапка, пряди торчат из-под каски во все стороны
  P(head, B(.34, .22, .14), C.hair, 0, .18, -.08);
  for (const s of [-1, 1]) P(head, B(.06, .22, .24), C.hair, s * .16, .18, .0);
  const spikes = [];
  for (let k = 0; k < 14; k++) {
    const a = (k / 14) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);            // по кругу под каской
    const front = ca > .55;                                                          // спереди — короче, это чёлка
    const len = front ? .08 : .13 + .04 * ((k * 7) % 3) / 2, w = front ? .06 : .075;
    spikes.push([sa * .17, front ? .25 : .21 + .03 * (k % 2), ca * .16 + .02, a, len, w, front]);
  }
  for (const [x, y, z, a, len, w, front] of spikes) {
    const g = G(head, x, y, z); g.rotation.set(front ? .2 : 0, a, 0);
    P(g, B(w, w * .8, len), C.hair, 0, front ? -.03 : -.01, len / 2 - .02, front ? .5 : -.3 - .08 * ((x * 97 + z * 53) % 3 + 3) % 3, 0, 0);
  }
  P(head, B(.03, .1, .03), C.hairL, -.045, .21, .165, 0, 0, .25);                // прядь на лоб
  // каска с фонарём, чуть на затылок
  const hel = G(head, 0, .275, 0); hel.rotation.x = -.1;
  P(hel, B(.36, .08, .34), C.green, 0, .025, 0);
  P(hel, B(.33, .06, .31), C.green, 0, .085, 0);
  P(hel, B(.27, .045, .25), C.green, 0, .135, 0);
  P(hel, B(.17, .028, .16), C.green, 0, .165, 0);
  P(hel, B(.05, .035, .3), C.greenD, 0, .145, 0);                // гребень
  P(hel, B(.38, .024, .1), C.greenD, 0, -.008, .19, .12);        // козырёк
  P(hel, new THREE.CylinderGeometry(.055, .055, .05, 8), C.lampD, 0, .055, .18, Math.PI / 2);
  P(hel, new THREE.CylinderGeometry(.04, .04, .012, 8), C.lamp, 0, .055, .206, Math.PI / 2);

  // ---------- позы ----------
  const K = ['hipX', 'hipZ', 'hipRx', 'hipRy', 'hipRz', 'spRx', 'spRy', 'spRz', 'chRx', 'chRy', 'chRz', 'hdRx', 'hdRy', 'hdRz',
    'th0', 'th1', 'ty0', 'ty1', 'kn0', 'kn1', 'ux0', 'ux1', 'uy0', 'uy1', 'uz0', 'uz1', 'fx0', 'fx1', 'fz0', 'fz1', 'hipY', 'hipW'];
  const cur = Object.fromEntries(K.map(k => [k, 0]));
  let phase = 0, time = 0, look = 0, lookTo = 0, lookT = 2, tilt = 0, tiltTo = 0, blinkT = 3, first = true;
  // руки в карманах: плечо назад и в сторону, локоть торчит наружу, кисть уходит в боковой карман
  // (сутулость наклоняет плечи вперёд — руку сначала возвращаем к вертикали, потом отводим)
  const pocket = (p, i) => { const s = i ? 1 : -1, c = -(p.spRx + p.chRx); p['ux' + i] = c + .18; p['uy' + i] = 0; p['uz' + i] = .7 * s; p['fx' + i] = .05; p['fz' + i] = -1.62 * s };
  const hang = (p, i, fwd = 0) => { const s = i ? 1 : -1, c = -(p.spRx + p.chRx); p['ux' + i] = c - fwd; p['uy' + i] = 0; p['uz' + i] = .12 * s; p['fx' + i] = -.2; p['fz' + i] = 0 };
  // ---------- лестница: хват, лазание как в Metal Gear, вылезание наверх ----------
  // руки и ноги ставятся точно на ступеньки (двухзвенная IK), корпус и голова — позой. По очереди: рука и противоположная нога
  // переставляются на две ступеньки вверх, тело рывком поднимается на одну. Ступенька U — на высоте (U − ½)·S от верха стенки (y = 0).
  // от игры: ph — фаза, k — её доля, u — ступенька под ногами (целое — стоит), u0 — опорная ступенька фазы, y — высота корня, h — от корня до стенки
  const sm = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x), lr = (a, b, k) => a + (b - a) * k;
  const ARMK = ['ux0', 'ux1', 'uy0', 'uy1', 'uz0', 'uz1', 'fx0', 'fx1', 'fz0', 'fz1'], BODYK = K.filter(k => !ARMK.includes(k));
  const mix = (p, q, w, keys = K) => { w = Math.min(1, Math.max(0, w)); if (w > 0) for (const n of keys) p[n] += (q[n] - p[n]) * w };
  const LP = { hipY: .76, rung: .1, hx: .15, fx: .1 };
  const zero = () => Object.fromEntries(K.map(k => [k, 0]));
  function climbPose(u) {                                                      // корпус прямой, прижат к лестнице, голова задрана вверх
    const p = zero(), n = Math.floor(u), f = u - n, lead = n & 1, arc = Math.sin(Math.PI * Math.min(1, f / .7)), sd = lead ? 1 : -1;
    p.hipW = 1; p.hipY = LP.hipY; p.spRx = .02; p.chRx = .06; p.hdRx = -.55 + .1 * arc; p.hdRy = .1 * sd * arc;
    p.chRy = .1 * sd * arc; p.chRz = -.05 * sd * arc; p.hipRz = .04 * sd * arc; p.hipX = .02 * sd * arc;
    for (const i of [0, 1]) { const s = i ? 1 : -1; p['ux' + i] = -2.2; p['uz' + i] = .3 * s; p['fx' + i] = -.9; p['th' + i] = -.9; p['kn' + i] = 1.2; p['ty' + i] = .15 * s }
    return p;
  }
  function overKeys(lead) {                                                    // руки на краю — колено на край — встал
    const k1 = zero(), k2 = zero(), kl = 1 - lead, sl = lead;                  // колено на край ставит та нога, что выше
    Object.assign(k1, { hipW: 1, hipY: .72, hipZ: .04, spRx: .3, chRx: .45, hdRx: -.1 });
    Object.assign(k2, { hipW: 1, hipY: .5, hipZ: .12, spRx: .42, chRx: .6, hdRx: .12 });
    for (const q of [k1, k2]) for (const i of [0, 1]) { const s = i ? 1 : -1; q['ux' + i] = -1.1; q['uz' + i] = .3 * s; q['fx' + i] = -.1; q['th' + i] = -.9; q['kn' + i] = 1.3; q['ty' + i] = .18 * s }
    k2['th' + kl] = -1.85; k2['kn' + kl] = 2.4; k2['ty' + kl] = (kl ? 1 : -1) * .25; k2['th' + sl] = .05; k2['kn' + sl] = .5;
    return [k1, k2];
  }
  function ladderPose(p, L) {
    if (L.ph === 'climb') { Object.assign(p, climbPose(L.u)); return }
    if (L.ph === 'grab') { const q = climbPose(L.u0), k = L.k; p.hdRx = lr(p.hdRx, -.75, sm(k / .25)); mix(p, q, sm(k / .45), ARMK); mix(p, q, sm((k - .25) / .75), BODYK); return }
    if (L.ph === 'off') { const q = climbPose(L.u); mix(q, p, sm(L.k)); Object.assign(p, q); return }
    if (L.ph === 'over') {
      const [k1, k2] = overKeys(L.u0 & 1), k = L.k, q = climbPose(L.u0);
      if (k < .3) mix(q, k1, sm(k / .3)); else if (k < .62) { Object.assign(q, k1); mix(q, k2, sm((k - .3) / .32)) } else { Object.assign(q, k2); mix(q, p, sm((k - .62) / .38)) }
      Object.assign(p, q);
    }
  }
  // куда тянутся руки (запястье) и ноги (щиколотка) — в координатах корня; w — насколько IK перебивает позу
  function ladderIK(L) {
    const S = L.S, rz = L.h - LP.rung, ry = U => (U - .5) * S - L.y;
    const top = (i, q) => [(i ? 1 : -1) * .2, .035 - L.y, L.h + q];                // ладонь на верху стенки, q — от края вглубь
    const hand = (i, U) => U > 0 ? top(i, .14) : [(i ? 1 : -1) * LP.hx, ry(U) + .02, rz - .04];   // выше лестницы — ладонь на землю у края
    const foot = (i, U) => [(i ? 1 : -1) * LP.fx, ry(U) + .135, rz - .1];
    const way = (A, B, k, back) => { const e = sm(k), a = Math.sin(Math.PI * k); return [lr(A[0], B[0], e), lr(A[1], B[1], e) + .04 * a, lr(A[2], B[2], e) - back * a] };
    const rest = (n, f) => {                                                    // полушаг n: рука lead и противоположная нога переезжают на две ступеньки
      const lead = n & 1, mv = Math.min(1, f / .7), H = [], F = [];
      H[1 - lead] = hand(1 - lead, n + 6); H[lead] = way(hand(lead, n + 5), hand(lead, n + 7), mv, .12);
      F[lead] = foot(lead, n + 1); F[1 - lead] = way(foot(1 - lead, n), foot(1 - lead, n + 2), mv, .14);
      return { H, F, lead };
    };
    if (L.ph === 'climb') { const n = Math.floor(L.u); const r = rest(n, L.u - n); return { H: r.H, F: r.F, wa: [1, 1], wl: [1, 1] } }
    if (L.ph === 'grab' || L.ph === 'off') {
      const n = Math.round(L.ph === 'grab' ? L.u0 : L.u), r = rest(n, 0), k = L.k, ld = r.lead;
      if (L.ph === 'off') { const w = 1 - sm(k / .8); return { H: r.H, F: r.F, wa: [w, w], wl: [w, w] } }
      const wa = [], wl = []; wa[1 - ld] = sm(k / .4); wa[ld] = sm((k - .12) / .4); wl[ld] = sm((k - .3) / .35); wl[1 - ld] = sm((k - .5) / .35);
      return { H: r.H, F: r.F, wa, wl };
    }
    if (L.ph === 'over') {
      const n = Math.round(L.u0), r = rest(n, 0), k = L.k, ld = r.lead, H = [], F = [];
      for (const i of [0, 1]) H[i] = k < .3 ? way(r.H[i], top(i, .14), sm((k - (i === ld ? 0 : .08)) / .22), -.05) : top(i, .14);
      F[ld] = r.F[ld]; F[1 - ld] = way(r.F[1 - ld], foot(1 - ld, n + 2), Math.min(1, k / .3), .12);
      const wa = 1 - sm((k - .68) / .25);
      const wl = []; wl[ld] = 1 - sm((k - .6) / .25); wl[1 - ld] = 1 - sm((k - .3) / .22);
      return { H, F, wa: [wa, wa], wl };
    }
    return null;
  }
  // двухзвенная IK: плечо/бедро из точки S к цели T, локоть/колено — в сторону pole. Всё в системе родителя сустава
  const _v = () => new THREE.Vector3(), _m = new THREE.Matrix4(), _q = new THREE.Quaternion();
  function solve2(S, T, a, b, pole) {
    const D = T.clone().sub(S), d = Math.min(a + b - 1e-3, Math.max(.05, D.length())); D.normalize();
    const ca = Math.min(1, Math.max(-1, (a * a + d * d - b * b) / (2 * a * d))), sa = Math.sqrt(1 - ca * ca);
    const P = pole.clone().addScaledVector(D, -pole.dot(D)).normalize();
    const E = S.clone().addScaledVector(D, a * ca).addScaledVector(P, a * sa), Tc = S.clone().addScaledVector(D, d);
    const U = E.clone().sub(S).normalize(), F = Tc.sub(E).normalize();
    let A = _v().crossVectors(U, F); if (A.lengthSq() < 1e-6) A.crossVectors(P, U); A.normalize();
    const Y = U.clone().negate(), Z = _v().crossVectors(A, Y);
    const q = new THREE.Quaternion().setFromRotationMatrix(_m.makeBasis(A, Y, Z));
    const bend = Math.atan2(-F.dot(Z), F.dot(U));                                // поворот второго звена вокруг его оси x
    return { q, bend };
  }
  const POLE_A = [new THREE.Vector3(-1, -.45, -.35), new THREE.Vector3(1, -.45, -.35)], POLE_L = [new THREE.Vector3(-.3, 0, 1), new THREE.Vector3(.3, 0, 1)];
  function applyIK(ik) {
    hips.updateMatrix(); spine.updateMatrix(); chest.updateMatrix();
    const Mh = hips.matrix.clone(), Mc = Mh.clone().multiply(spine.matrix).multiply(chest.matrix);
    const iMh = Mh.clone().invert(), iMc = Mc.clone().invert();
    arms.forEach((A, i) => { const w = ik.wa[i] || 0; if (w <= 0 || !ik.H[i]) return;
      const T = new THREE.Vector3(...ik.H[i]).applyMatrix4(iMc), r = solve2(A.sh.position, T, UA, FA + .04, POLE_A[i]);
      A.sh.quaternion.slerp(r.q, w); A.el.rotation.x = lr(A.el.rotation.x, r.bend, w); A.el.rotation.z *= 1 - w });
    legs.forEach((L, i) => { const w = ik.wl[i] || 0; if (w <= 0 || !ik.F[i]) return;
      const T = new THREE.Vector3(...ik.F[i]).applyMatrix4(iMh), r = solve2(L.th.position, T, LT, LS, POLE_L[i]);
      L.th.quaternion.slerp(r.q, w); L.kn.rotation.x = lr(L.kn.rotation.x, r.bend, w);
      _q.copy(hips.quaternion).multiply(L.th.quaternion).multiply(L.kn.quaternion).invert(); L.an.quaternion.slerp(_q, w) });   // ступня — ровно
  }
  function target(st, dt) {
    const p = Object.fromEntries(K.map(k => [k, 0]));
    // стойка: колени глубоко согнуты и смотрят наружу, спина дугой, голова вперёд, взгляд исподлобья
    p.th0 = p.th1 = -.75; p.kn0 = p.kn1 = 1.45; p.ty0 = -.45; p.ty1 = .45;
    p.hipRx = .08; p.spRx = .25 + .012 * Math.sin(time * 2); p.chRx = .4 + .015 * Math.sin(time * 2); p.hdRx = -.55;
    p.chRz = .03 * Math.sin(time * .7);
    pocket(p, 0); pocket(p, 1);
    const S = st.state, A = st.anim;
    if (st.lad) { ladderPose(p, st.lad); return p }
    if (st.moving && S === 'walk') {
      // вальяжная пружинистая походка: колени наружу, таз гуляет из стороны в сторону, плечи перекатываются
      const a = Math.min(1, .55 + st.speed * .45), sn = Math.sin(phase), cs = Math.cos(phase);
      p.th0 = -.65 - .5 * a * sn; p.th1 = -.65 + .5 * a * sn;
      p.kn0 = 1.2 + .7 * a * Math.max(0, cs); p.kn1 = 1.2 + .7 * a * Math.max(0, -cs);
      p.ty0 = -.35; p.ty1 = .35;
      p.hipX = .045 * a * cs; p.hipRz = .09 * a * cs; p.hipRy = .2 * a * sn;
      p.spRy = -.12 * a * sn; p.chRy = -.2 * a * sn; p.chRz = -.07 * a * cs; p.spRx = .2; p.chRx = .34;
      p.hdRy = .2 * a * sn; p.hdRz = .04 * a * cs; p.hdRx = -.48;
    } else if (S === 'edge') {
      // осторожно заглядывает: вес на согнутой задней ноге, передняя тянется к краю, рука свисает
      p.th1 = -.4; p.kn1 = 1.55; p.ty1 = .5;
      p.th0 = -1.05; p.kn0 = .55; p.ty0 = -.15;
      p.hipZ = -.06; p.hipRx = .14; p.spRx = .3; p.chRx = .45; p.hdRx = .25; p.hdRz = .12; p.hdRy = .12;
      hang(p, 0, .25); pocket(p, 1);
    } else if (S === 'wall') {
      // задрал голову на уступ, одна рука тянется вверх
      p.hdRx = -1.05; p.chRx = .05; p.spRx = .05;
      p.ux0 = -2.6; p.uy0 = 0; p.uz0 = -.15; p.fx0 = -.4; p.fz0 = 0;
    } else if (S === 'jump' && A && A.kind === 'climb') {
      const k = A.t, tuck = k < .65 ? Math.min(1, k / .3) : 1 - (k - .65) / .35;
      for (const i of [0, 1]) { const s = i ? 1 : -1; p['ux' + i] = -2.9 + 2.4 * Math.max(0, (k - .65) / .35); p['uz' + i] = .15 * s; p['fx' + i] = -.3; p['fz' + i] = 0 }
      p.th0 = p.th1 = -.62 - .8 * tuck; p.kn0 = p.kn1 = 1.2 + .9 * tuck; p.chRx = .3 + .3 * tuck; p.hdRx = -.6;
    } else if (S === 'jump') {
      for (const i of [0, 1]) { const s = i ? 1 : -1; p['ux' + i] = -.6; p['uz' + i] = 1.3 * s; p['fx' + i] = -.4; p['fz' + i] = 0 }
      p.th0 = p.th1 = -.95; p.kn0 = p.kn1 = 1.6; p.chRx = .35; p.hdRx = -.2;
    } else if (S === 'fall') {
      for (const i of [0, 1]) { const s = i ? 1 : -1; p['ux' + i] = -2.4; p['uz' + i] = .75 * s; p['fx' + i] = -.4; p['fz' + i] = 0 }
      p.th0 = p.th1 = -.7; p.kn0 = p.kn1 = 1.1; p.hdRx = -.2;
    } else {
      // бездействие: оглядывается всем корпусом, иногда склоняет голову
      lookT -= dt;
      if (lookT <= 0) { lookTo = Math.random() < .3 ? 0 : (Math.random() * 2 - 1) * 1.1; tiltTo = (Math.random() - .5) * .3; lookT = 1.8 + Math.random() * 3 }
      look += (lookTo - look) * (1 - Math.exp(-dt * 2.2)); tilt += (tiltTo - tilt) * (1 - Math.exp(-dt * 2));
      p.hipRy = .1 * look; p.spRy = .18 * look; p.chRy = .3 * look; p.hdRy = .5 * look; p.hdRz = tilt;
      p.hipX = -.03 * look; p.th0 += .08 * look; p.th1 -= .08 * look;
    }
    if (st.carry && S !== 'jump' && S !== 'fall') {                 // несёт предмет перед грудью обеими руками
      const c = -(p.spRx + p.chRx);
      for (const i of [0, 1]) { const s = i ? 1 : -1; p['ux' + i] = c - 1.05; p['uy' + i] = 0; p['uz' + i] = .28 * s; p['fx' + i] = -.75; p['fz' + i] = -.35 * s }
    }
    if (st.swing > 0) {                                              // удар правой рукой сверху вниз
      const k = 1 - st.swing / .3;
      p.ux0 = k < .25 ? -3 : -3 + 3.4 * Math.min(1, (k - .25) / .4); p.uy0 = 0; p.uz0 = -.15; p.fx0 = -.2; p.fz0 = 0; p.chRx += .3 * k; p.hdRx = -.1;
    }
    if (st.phone > 0) {                                             // смотрит в телефон: правая рука подносит его к лицу, голова опущена к экрану
      const q = Object.assign({}, p);
      q.spRx = .12; q.chRx = .2; q.chRy = 0; q.spRy = 0; q.hipRy = 0; q.hdRx = .38; q.hdRy = -.2; q.hdRz = .05;
      q.ux0 = -(q.spRx + q.chRx) - .55; q.uy0 = 0; q.uz0 = .5; q.fx0 = -1.35; q.fz0 = .45; pocket(q, 1);
      for (const n of K) p[n] += (q[n] - p[n]) * st.phone;
    }
    if (st.land > 0) { const l = st.land; p.th0 -= 2.4 * l; p.th1 -= 2.4 * l; p.kn0 += 4 * l; p.kn1 += 4 * l; p.chRx += 1.5 * l }
    return p;
  }
  function update(dt, st) {
    time += dt;
    if (st.moving) phase += dt * (5 + 6 * st.speed);
    const p = target(st, dt), k = first ? 1 : 1 - Math.exp(-dt * (st.moving ? 18 : 10)); first = false;
    for (const n of K) cur[n] += (p[n] - cur[n]) * k;
    const c = cur;
    // таз на такой высоте, чтобы более вытянутая нога стояла на полу
    const h = i => LT * Math.cos(c.hipRx + c['th' + i]) + LS * Math.cos(c.hipRx + c['th' + i] + c['kn' + i]) + ANK;
    const fit = Math.max(h(0), h(1)); hips.position.set(c.hipX, fit + (c.hipY - fit) * c.hipW, c.hipZ); hips.rotation.set(c.hipRx, c.hipRy, c.hipRz);
    spine.rotation.set(c.spRx, c.spRy, c.spRz); chest.rotation.set(c.chRx, c.chRy, c.chRz); head.rotation.set(c.hdRx, c.hdRy, c.hdRz);
    legs.forEach((L, i) => { L.th.rotation.set(c['th' + i], c['ty' + i], 0); L.kn.rotation.x = c['kn' + i]; L.an.rotation.set(-(c.hipRx + c['th' + i] + c['kn' + i]), 0, 0) });
    arms.forEach((A, i) => { A.sh.rotation.set(c['ux' + i], c['uy' + i], c['uz' + i]); A.el.rotation.set(c['fx' + i], 0, c['fz' + i]) });
    blinkT -= dt; const bl = blinkT < .12; if (blinkT < 0) blinkT = 2 + Math.random() * 4;
    for (const e of eyes) e.scale.y = bl ? .15 : 1;
    const ik = st.lad && ladderIK(st.lad); if (ik) applyIK(ik);
  }
  root.traverse(o => { if (o.isMesh) o.castShadow = o.receiveShadow = true });
  // ---------- склейка: все детали, которые не двигаются друг относительно друга, — один меш на сустав ----------
  // так Кирью рисуется ~18 командами видеокарте вместо ~120; цвета деталей переезжают в цвета вершин
  const animated = new Set([root, hips, spine, chest, head, ...eyes, ...legs.flatMap(l => [l.th, l.kn, l.an]), ...arms.flatMap(a => [a.sh, a.el, a.hd])]);
  const VC = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  root.updateMatrixWorld(true);
  const buckets = new Map(), meshes = [];
  root.traverse(o => { if (o.isMesh && o.material !== C.lamp) meshes.push(o) });
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
    A.add(new THREE.Mesh(g, VC)) }
  // телефон в правой руке и голубой свет экрана (добавлены после склейки: двигаются вместе с кистью)
  const ph = G(arms[0].hd, 0, -.16, .03); ph.rotation.set(-.3, 0, 0);
  ph.add(new THREE.Mesh(B(.1, .19, .02), new THREE.MeshLambertMaterial({ color: 0x15181f, flatShading: true })));
  const scr = new THREE.MeshBasicMaterial({ color: 0x9fe8ff }); scr.userData.glow = true;
  const scrM = new THREE.Mesh(B(.084, .165, .004), scr); scrM.position.z = .011; ph.add(scrM);
  const phL = new THREE.PointLight(0x8fdcff, 0, .7, 1.5); phL.position.set(0, 0, .12); ph.add(phL);
  ph.visible = false;
  const upd0 = update;
  function update2(dt, st) { upd0(dt, st); const v = st.phone || 0; ph.visible = v > .02; phL.intensity = 2.5 * v * Math.PI }
  return { root, update: update2, height: 1.5, head, LP };
}
