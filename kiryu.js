// Кирью Нагасаки — заглушка персонажа до нарисованных спрайтов.
// Модель из коробок (в низком разрешении силуэт остаётся чётким) + «живые» позы, которые плавно перетекают друг в друга:
// стойка на полусогнутых, руки в карманах, вальяжная походка, оглядывание корпусом, осторожный взгляд с края.
export function createKiryu(THREE) {
  const M = c => new THREE.MeshLambertMaterial({ color: c, flatShading: true });
  const C = {
    skin: M(0xf2d7bf), skinD: M(0xd8b096), hair: M(0x4a3226), hairD: M(0x2f1f18),
    shirt: M(0xf1f1ea), shirtD: M(0xc9ccc4), green: M(0x8cc65a), greenD: M(0x5f9a3e), greenK: M(0x3d6a2b),
    boot: M(0x1b2b26), bootL: M(0x31463e), belt: M(0x1f2226), metal: M(0x9aa6a0),
    iris: M(0x2fa58f), eyeW: M(0xf7f4ee), lash: M(0x1a1210), mouth: M(0x7a3b34), lamp: M(0xf4f9e8), lampD: M(0x5f6e68),
  };
  const B = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const G = (parent, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g };
  const P = (parent, geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); parent.add(m); return m };

  const LT = .2, LS = .2, ANK = .11;                 // бедро, голень, от щиколотки до подошвы
  const root = new THREE.Group();
  const hips = G(root, 0, .52, 0);
  // шорты, ремень, карманы
  P(hips, B(.3, .13, .2), C.green, 0, .035, 0);
  P(hips, B(.31, .035, .21), C.belt, 0, .105, 0);
  P(hips, B(.045, .03, .012), C.metal, 0, .105, .108);
  for (const s of [-1, 1]) P(hips, B(.075, .02, .012), C.greenK, s * .085, .06, .102);
  // ноги: индекс 0 — правая (−x), 1 — левая (+x); персонаж смотрит в +z
  const legs = [-1, 1].map(s => {
    const th = G(hips, s * .078, 0, 0);
    P(th, B(.155, .17, .185), C.green, 0, -.065, 0);         // широкая штанина
    P(th, B(.16, .022, .19), C.greenD, 0, -.15, 0);          // подгиб
    P(th, B(.1, .06, .105), C.skin, 0, -.18, 0);
    const kn = G(th, 0, -LT, 0);
    P(kn, B(.1, .07, .105), C.skin, 0, -.03, 0);
    P(kn, B(.13, .14, .14), C.boot, 0, -.13, 0);             // голенище
    P(kn, B(.14, .025, .15), C.bootL, 0, -.065, 0);
    const an = G(kn, 0, -LS, 0);
    P(an, B(.135, .09, .215), C.boot, 0, -.065, .03);        // ступня
    P(an, B(.14, .022, .22), C.bootL, 0, -.1, .03);          // подошва
    return { th, kn, an };
  });
  // корпус
  const spine = G(hips, 0, .12, 0);
  P(spine, B(.27, .19, .17), C.shirt, 0, .095, 0);
  P(spine, B(.31, .065, .18), C.shirt, 0, .175, 0);           // плечи шире
  P(spine, B(.014, .17, .01), C.shirtD, 0, .1, .087);         // планка
  for (const y of [.05, .1, .15]) P(spine, B(.018, .018, .012), C.shirtD, .016, y, .088);
  for (const s of [-1, 1]) {
    P(spine, B(.075, .03, .05), C.shirtD, s * .045, .215, .065, 0, 0, s * .45);   // воротник
    P(spine, B(.036, .22, .012), C.greenK, s * .075, .1, .088);                   // подтяжки спереди
    P(spine, B(.036, .22, .012), C.greenK, s * .062, .1, -.088);                  // и сзади
    P(spine, B(.03, .025, .016), C.metal, s * .075, .02, .092);                   // зажимы
  }
  P(spine, B(.085, .05, .085), C.skin, 0, .225, 0);           // шея
  // руки: плечо → локоть → кисть в перчатке
  const arms = [-1, 1].map(s => {
    const sh = G(spine, s * .17, .17, 0);
    P(sh, B(.1, .09, .11), C.shirt, 0, -.035, 0);
    P(sh, B(.105, .016, .115), C.shirtD, 0, -.08, 0);
    P(sh, B(.068, .07, .072), C.skin, 0, -.11, 0);
    const el = G(sh, 0, -.14, 0);
    P(el, B(.064, .1, .068), C.skin, 0, -.05, 0);
    const hd = G(el, 0, -.105, 0);
    P(hd, B(.1, .1, .1), C.green, 0, -.04, 0);
    P(hd, B(.104, .026, .106), C.greenD, 0, .01, 0);
    return { sh, el, hd };
  });
  // голова: резкие бирюзовые глаза, сведённые брови, ухмылка, растрёпанные тёмно-каштановые волосы до шеи
  const head = G(spine, 0, .235, 0);
  P(head, B(.34, .29, .31), C.skin, 0, .165, .01);
  P(head, B(.27, .05, .26), C.skin, 0, .01, .02);             // подбородок уже лба
  P(head, B(.022, .035, .02), C.skinD, 0, .105, .172);        // нос
  for (const s of [-1, 1]) P(head, B(.03, .07, .05), C.skin, s * .176, .14, 0);    // уши
  const eyes = [-1, 1].map(s => {
    const e = G(head, s * .074, .14, .166);
    P(e, B(.078, .052, .01), C.eyeW, 0, 0, 0);
    P(e, B(.04, .052, .012), C.iris, -s * .012, 0, .002);     // радужка смещена к переносице — взгляд в упор
    P(e, B(.088, .018, .014), C.lash, 0, .03, .002);          // верхнее веко
    P(head, B(.092, .02, .014), C.hairD, s * .08, .2, .168, 0, 0, s * .28);        // брови домиком вниз — решимость
    return e;
  });
  P(head, B(.065, .014, .01), C.mouth, .022, .062, .167, 0, 0, .14);              // кривая ухмылка
  P(head, B(.37, .27, .12), C.hair, 0, .2, -.115);
  P(head, B(.3, .11, .09), C.hair, 0, .035, -.13);            // волосы до шеи
  for (const s of [-1, 1]) {
    P(head, B(.05, .23, .21), C.hair, s * .182, .2, -.03);
    P(head, B(.045, .13, .07), C.hair, s * .182, .05, .055, 0, 0, s * .12);     // пряди у скул
    P(head, B(.05, .04, .1), C.hairD, s * .19, .27, -.1, 0, 0, s * .35);        // торчат из-под каски
  }
  [[-.13, .065, .25], [-.065, .085, -.1], [0, .06, .15], [.065, .09, -.2], [.13, .07, .3]].forEach(([x, h, r]) =>
    P(head, B(.068, h, .03), C.hair, x, .29 - h / 2, .168, 0, 0, r));            // растрёпанная чёлка
  P(head, B(.032, .11, .03), C.hairD, -.035, .225, .175, 0, 0, .22);             // прядь между глаз
  // каска с фонарём, чуть сдвинута на затылок — дерзко
  const hel = G(head, 0, .29, -.01); hel.rotation.x = -.09;
  P(hel, B(.38, .085, .35), C.green, 0, .025, 0);
  P(hel, B(.35, .065, .32), C.green, 0, .09, 0);
  P(hel, B(.29, .045, .26), C.green, 0, .14, 0);
  P(hel, B(.19, .03, .17), C.green, 0, .172, 0);
  P(hel, B(.05, .035, .32), C.greenD, 0, .15, 0);             // гребень
  P(hel, B(.42, .025, .11), C.greenD, 0, -.008, .2, .12);     // козырёк
  P(hel, new THREE.CylinderGeometry(.06, .06, .05, 8), C.lampD, 0, .06, .19, Math.PI / 2);
  P(hel, new THREE.CylinderGeometry(.044, .044, .012, 8), C.lamp, 0, .06, .217, Math.PI / 2);

  // ---------- позы ----------
  const K = ['hipX', 'hipZ', 'hipRx', 'hipRy', 'hipRz', 'spRx', 'spRy', 'spRz', 'hdRx', 'hdRy', 'hdRz',
    'th0', 'th1', 'tz0', 'tz1', 'kn0', 'kn1', 'ux0', 'ux1', 'uz0', 'uz1', 'fx0', 'fx1', 'fz0', 'fz1'];
  const cur = Object.fromEntries(K.map(k => [k, 0]));
  let phase = 0, time = 0, look = 0, lookTo = 0, lookT = 2, tilt = 0, tiltTo = 0, blinkT = 3;
  const pocket = (p, i) => { const s = i ? 1 : -1; p['ux' + i] = .3; p['uz' + i] = .26 * s; p['fx' + i] = -1.05; p['fz' + i] = -.3 * s };
  function target(st, dt) {
    const p = Object.fromEntries(K.map(k => [k, 0]));
    // стойка: колени согнуты, ноги чуть врозь, лёгкая сутулость, подбородок вверх
    p.th0 = p.th1 = -.36; p.kn0 = p.kn1 = .7; p.tz0 = -.07; p.tz1 = .07;
    p.spRx = .1 + .015 * Math.sin(time * 2.2); p.hdRx = -.06;
    pocket(p, 0); pocket(p, 1);
    const S = st.state, A = st.anim;
    if (st.moving && S === 'walk') {
      // вальяжная походка: длинный шаг, бёдра качаются, плечи разворачиваются навстречу, руки в карманах
      const a = Math.min(1, .55 + st.speed * .45), sn = Math.sin(phase), cs = Math.cos(phase);
      p.th0 = -.3 - .48 * a * sn; p.th1 = -.3 + .48 * a * sn;
      p.kn0 = .5 + .75 * a * Math.max(0, cs); p.kn1 = .5 + .75 * a * Math.max(0, -cs);
      p.hipRy = .16 * a * sn; p.hipRz = .06 * a * cs; p.hipX = .018 * a * cs;
      p.spRy = -.26 * a * sn; p.spRz = -.05 * a * cs; p.spRx = -.03;
      p.hdRy = .12 * a * sn; p.hdRx = -.1;
      p.uz0 = -.48; p.uz1 = .48;
    } else if (S === 'edge') {
      // осторожно заглядывает вниз: вес на задней ноге, передняя вытянута к краю, одна рука для равновесия
      p.th1 = -.2; p.kn1 = .9;                    // опорная (левая) сзади, согнута
      p.th0 = -.55; p.kn0 = .22;                  // правая вперёд, носок у края, почти без веса
      p.hipZ = -.03; p.hipRx = .05; p.spRx = .3; p.hdRx = .55; p.hdRz = .1; p.hdRy = .1;   // таз назад — противовес
      p.ux0 = -.55; p.uz0 = -.25; p.fx0 = -.35; p.fz0 = 0;          // правая рука вперёд-вниз
      p.ux1 = .35; p.uz1 = .95; p.fx1 = -.25; p.fz1 = 0;            // левая отведена в сторону
    } else if (S === 'wall') {
      // смотрит вверх на уступ, одна рука уже тянется к краю
      p.hdRx = -.55; p.spRx = -.12;
      p.ux0 = -2.4; p.uz0 = -.2; p.fx0 = -.4; p.fz0 = 0;
    } else if (S === 'jump' && A && A.kind === 'climb') {
      const k = A.t;                                 // подтягивается: обе руки на уступе, колени к груди, потом встаёт
      p.ux0 = p.ux1 = -2.8 + 2.2 * Math.max(0, (k - .65) / .35); p.uz0 = -.15; p.uz1 = .15; p.fx0 = p.fx1 = -.25; p.fz0 = p.fz1 = 0;
      const tuck = k < .65 ? Math.min(1, k / .3) : 1 - (k - .65) / .35;
      p.th0 = p.th1 = -.36 - .9 * tuck; p.kn0 = p.kn1 = .7 + 1.1 * tuck; p.spRx = .1 + .3 * tuck;
    } else if (S === 'jump') {
      p.ux0 = p.ux1 = -.7; p.uz0 = -1.2; p.uz1 = 1.2; p.fx0 = p.fx1 = -.3; p.fz0 = p.fz1 = 0;
      p.th0 = p.th1 = -.75; p.kn0 = p.kn1 = 1.15; p.spRx = .18;
    } else if (S === 'fall') {
      p.ux0 = p.ux1 = -2.3; p.uz0 = -.7; p.uz1 = .7; p.fx0 = p.fx1 = -.3; p.fz0 = p.fz1 = 0;
      p.th0 = p.th1 = -.5; p.kn0 = p.kn1 = .85;
    } else {
      // бездействие: оглядывается, поворачивая голову и корпус, иногда наклоняет голову
      lookT -= dt;
      if (lookT <= 0) { lookTo = Math.random() < .3 ? 0 : (Math.random() * 2 - 1) * 1.1; tiltTo = (Math.random() - .5) * .25; lookT = 1.8 + Math.random() * 3 }
      look += (lookTo - look) * (1 - Math.exp(-dt * 2.2)); tilt += (tiltTo - tilt) * (1 - Math.exp(-dt * 2));
      p.hipRy = .12 * look; p.spRy = .35 * look; p.hdRy = .55 * look; p.hdRz = tilt;
      p.hipX = -.02 * look; p.th0 += .06 * look; p.th1 -= .06 * look;      // вес переносится на ногу со стороны взгляда
    }
    if (st.swing > 0) {                                                    // удар правой рукой сверху вниз
      const k = 1 - st.swing / .3;
      p.ux0 = k < .25 ? -2.9 : -2.9 + 3.3 * Math.min(1, (k - .25) / .4); p.uz0 = -.15; p.fx0 = -.2; p.fz0 = 0; p.spRx += .25 * k; p.hdRx = .25;
    }
    if (st.land > 0) { const l = st.land; p.th0 -= 2.6 * l; p.th1 -= 2.6 * l; p.kn0 += 4.6 * l; p.kn1 += 4.6 * l; p.spRx += 1.5 * l }
    return p;
  }
  function update(dt, st) {
    time += dt;
    if (st.moving) phase += dt * (6 + 7 * st.speed);
    const p = target(st, dt), k = 1 - Math.exp(-dt * (st.moving ? 20 : 11));
    for (const n of K) cur[n] += (p[n] - cur[n]) * k;
    const c = cur;
    // ноги ставим на пол: высота таза = длина более вытянутой ноги
    const h = i => LT * Math.cos(c.hipRx + c['th' + i]) + LS * Math.cos(c.hipRx + c['th' + i] + c['kn' + i]) + ANK;
    hips.position.set(c.hipX, Math.max(h(0), h(1)), c.hipZ); hips.rotation.set(c.hipRx, c.hipRy, c.hipRz);
    spine.rotation.set(c.spRx, c.spRy, c.spRz); head.rotation.set(c.hdRx, c.hdRy, c.hdRz);
    legs.forEach((L, i) => { L.th.rotation.set(c['th' + i], 0, c['tz' + i]); L.kn.rotation.x = c['kn' + i]; L.an.rotation.set(-(c.hipRx + c['th' + i] + c['kn' + i]), 0, -c['tz' + i]) });
    arms.forEach((A, i) => { A.sh.rotation.set(c['ux' + i], 0, c['uz' + i]); A.el.rotation.set(c['fx' + i], 0, c['fz' + i]) });
    blinkT -= dt; const bl = blinkT < .12; if (blinkT < 0) blinkT = 2 + Math.random() * 4;
    for (const e of eyes) e.scale.y = bl ? .15 : 1;
  }
  root.traverse(o => { if (o.isMesh) o.castShadow = o.receiveShadow = true });
  return { root, update, height: 1.36 };
}
