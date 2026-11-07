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
    'th0', 'th1', 'ty0', 'ty1', 'kn0', 'kn1', 'ux0', 'ux1', 'uy0', 'uy1', 'uz0', 'uz1', 'fx0', 'fx1', 'fz0', 'fz1'];
  const cur = Object.fromEntries(K.map(k => [k, 0]));
  let phase = 0, time = 0, look = 0, lookTo = 0, lookT = 2, tilt = 0, tiltTo = 0, blinkT = 3, first = true;
  // руки в карманах: плечо назад и в сторону, локоть торчит наружу, кисть уходит в боковой карман
  // (сутулость наклоняет плечи вперёд — руку сначала возвращаем к вертикали, потом отводим)
  const pocket = (p, i) => { const s = i ? 1 : -1, c = -(p.spRx + p.chRx); p['ux' + i] = c + .18; p['uy' + i] = 0; p['uz' + i] = .7 * s; p['fx' + i] = .05; p['fz' + i] = -1.62 * s };
  const hang = (p, i, fwd = 0) => { const s = i ? 1 : -1, c = -(p.spRx + p.chRx); p['ux' + i] = c - fwd; p['uy' + i] = 0; p['uz' + i] = .12 * s; p['fx' + i] = -.2; p['fz' + i] = 0 };
  function target(st, dt) {
    const p = Object.fromEntries(K.map(k => [k, 0]));
    // стойка: колени глубоко согнуты и смотрят наружу, спина дугой, голова вперёд, взгляд исподлобья
    p.th0 = p.th1 = -.75; p.kn0 = p.kn1 = 1.45; p.ty0 = -.45; p.ty1 = .45;
    p.hipRx = .08; p.spRx = .25 + .012 * Math.sin(time * 2); p.chRx = .4 + .015 * Math.sin(time * 2); p.hdRx = -.55;
    p.chRz = .03 * Math.sin(time * .7);
    pocket(p, 0); pocket(p, 1);
    const S = st.state, A = st.anim;
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
    hips.position.set(c.hipX, Math.max(h(0), h(1)), c.hipZ); hips.rotation.set(c.hipRx, c.hipRy, c.hipRz);
    spine.rotation.set(c.spRx, c.spRy, c.spRz); chest.rotation.set(c.chRx, c.chRy, c.chRz); head.rotation.set(c.hdRx, c.hdRy, c.hdRz);
    legs.forEach((L, i) => { L.th.rotation.set(c['th' + i], c['ty' + i], 0); L.kn.rotation.x = c['kn' + i]; L.an.rotation.set(-(c.hipRx + c['th' + i] + c['kn' + i]), 0, 0) });
    arms.forEach((A, i) => { A.sh.rotation.set(c['ux' + i], c['uy' + i], c['uz' + i]); A.el.rotation.set(c['fx' + i], 0, c['fz' + i]) });
    blinkT -= dt; const bl = blinkT < .12; if (blinkT < 0) blinkT = 2 + Math.random() * 4;
    for (const e of eyes) e.scale.y = bl ? .15 : 1;
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
  const sm = new THREE.Mesh(B(.084, .165, .004), scr); sm.position.z = .011; ph.add(sm);
  const phL = new THREE.PointLight(0x8fdcff, 0, .7, 1.5); phL.position.set(0, 0, .12); ph.add(phL);
  ph.visible = false;
  const upd0 = update;
  function update2(dt, st) { upd0(dt, st); const v = st.phone || 0; ph.visible = v > .02; phL.intensity = 2.5 * v * Math.PI }
  return { root, update: update2, height: 1.5, head };
}
