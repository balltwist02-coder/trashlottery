// Кудзуя-сан — сосед Кирью, сгорбленный старичок-японец. Стоит у своего огромного стола на левой стенке участка.
// Спина колесом, руки сцеплены за спиной (правая держит левое запястье), клетчатая фланелевая рубашка,
// огромные круглые очки — глаза за ними кажутся большими. Седая подкова волос вокруг лысины, тонкие усы,
// мешковатые брюки, белые носки-таби и деревянные гэта.
// Живёт сам по себе: дышит, переминается, поправляет очки, разгибает спину и снова сутулится, смотрит по сторонам.
// Подошёл Кирью — кивает и следит за ним глазами. По просьбе игры: машет рукой, кланяется, качает головой,
// забирает со стола вещь (тянется правой рукой, прячет её за спину и кланяется).
export function createKudzuya(THREE) {
  const M = c => new THREE.MeshLambertMaterial({ color: c, flatShading: true });
  const C = {
    skin: M(0xdcab84), skinD: M(0xb3805d), skinL: M(0xf0c7a2), spot: M(0xb88a66), lip: M(0x9c5c4a),
    hair: M(0xdedbd4), hairD: M(0xaeaaa2), frame: M(0x231a15), lens: M(0xc6dde4), lensD: M(0x9fbcc6), glint: M(0xffffff),
    eyeW: M(0xf6f3ec), eye: M(0x1c120c),
    pants: M(0x4b443a), pantsD: M(0x38322b), belt: M(0x2a1d15), buckle: M(0xcaa34c),
    tabi: M(0xf1eee6), tabiD: M(0xcbc6bb), geta: M(0xa2713f), getaD: M(0x6f4828), hanao: M(0x1d2a4e),
    shirtD: M(0x5c1c19), btn: M(0xe9e0ca),
  };
  // клетчатая фланель: красная с тёмными полосами и тонкой песочной ниткой (8×8 пикселей ≈ 1 пиксель игры)
  const pc = document.createElement('canvas'); pc.width = pc.height = 8; const px = pc.getContext('2d');
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    const a = y < 3, b = x < 3, l = y === 5 || x === 5;
    px.fillStyle = a && b ? '#4c1614' : a || b ? '#7c2420' : l ? (y === 5 && x === 5 ? '#ecd29c' : '#cfa870') : '#ab362d';
    px.fillRect(x, y, 1, 1);
  }
  const tex = new THREE.CanvasTexture(pc); tex.magFilter = tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.colorSpace = THREE.SRGBColorSpace;
  const PLAID = new THREE.MeshLambertMaterial({ map: tex, flatShading: true });
  const TS = .16;                                               // одна клетка узора на столько единиц мира

  const B = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const G = (parent, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g };
  const P = (parent, geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); parent.add(m); return m };
  const PB = (parent, w, h, d, x, y, z, rx = 0, ry = 0, rz = 0) => {     // брусок из фланели: узор не растягивается
    const g = B(w, h, d), uv = g.attributes.uv, fs = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]], o = (x * 7.3 + y * 3.1 + z * 5.7) % 1;
    for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * fs[f][0] / TS + o, uv.getY(i) * fs[f][1] / TS + o * .6) }
    return P(parent, g, PLAID, x, y, z, rx, ry, rz);
  };
  const seg = (parent, x0, y0, x1, y1, th, dp, mat, z = 0) => { const l = Math.hypot(x1 - x0, y1 - y0);
    return P(parent, B(l + th * .6, th, dp), mat, (x0 + x1) / 2, (y0 + y1) / 2, z, 0, 0, Math.atan2(y1 - y0, x1 - x0)) };

  const LT = .235, LS = .225, UA = .2, FA = .19, HIPY = .56, ANK = .1225;   // бедро, голень, плечо, предплечье, высота таза и щиколотки
  const root = new THREE.Group();

  // ---------- таз: мешковатые брюки, ремень ----------
  const hips = G(root, 0, HIPY, 0);
  P(hips, B(.25, .14, .175), C.pants, 0, 0, 0);
  P(hips, B(.262, .036, .186), C.belt, 0, .066, 0);
  P(hips, B(.045, .03, .01), C.buckle, 0, .066, .095);
  P(hips, B(.025, .016, .012), C.belt, 0, .066, .099);
  for (const s of [-1, 1]) P(hips, B(.012, .09, .006), C.pantsD, s * .07, .005, .089);   // стрелки и шлёвки
  P(hips, B(.16, .07, .01), C.pantsD, 0, -.02, -.09);                                      // карман сзади

  // ---------- ноги: колени чуть согнуты, носки-таби и гэта ----------
  const legs = [-1, 1].map(s => {
    const th = G(hips, s * .072, -.04, 0);
    P(th, B(.125, LT + .03, .135), C.pants, 0, -LT / 2, 0);
    P(th, B(.006, LT * .8, .012), C.pantsD, 0, -LT / 2, .069);
    const kn = G(th, 0, -LT, 0);
    P(kn, B(.118, .07, .13), C.pants, 0, 0, .004);                         // колено мешком
    P(kn, B(.112, LS - .03, .122), C.pants, 0, -LS / 2 + .01, 0);
    P(kn, B(.006, LS * .7, .012), C.pantsD, 0, -LS / 2, .063);
    P(kn, B(.122, .03, .132), C.pantsD, 0, -LS + .05, 0);                  // подвёрнутый край штанины
    const an = G(kn, 0, -LS, 0);                                           // щиколотка; стопа смотрит в +z
    P(an, B(.074, .06, .074), C.tabi, 0, .005, 0);
    P(an, B(.082, .05, .15), C.tabi, 0, -.035, .04);                       // носок-таби
    P(an, B(.004, .044, .052), C.tabiD, s * -.012, -.037, .095);            // отдельный большой палец
    P(an, B(.084, .008, .14), C.tabiD, 0, -.059, .04);
    P(an, B(.1, .024, .215), C.geta, 0, -.075, .04);                       // дощечка гэта
    P(an, B(.104, .006, .219), C.getaD, 0, -.086, .04);
    for (const z of [-.025, .105]) P(an, B(.096, .032, .026), C.getaD, 0, -.105, z);   // два зуба
    seg(an, -.042, -.055, 0, -.042, .012, .012, C.hanao, .085); seg(an, 0, -.042, .042, -.055, .012, .012, C.hanao, .085);   // ремешок-ханао
    P(an, B(.012, .014, .05), C.hanao, 0, -.047, .11);
    for (const x of [-.046, .046]) P(an, B(.01, .014, .05), C.hanao, x, -.058, .05);
    return { th, kn, an };
  });

  // ---------- корпус колесом: фланелевая рубашка заправлена, горб на спине ----------
  const spine = G(hips, 0, .07, -.012);
  PB(spine, .236, .175, .162, 0, .085, 0);
  P(spine, B(.24, .025, .166), C.shirtD, 0, .01, 0);                      // складка над ремнём
  const chest = G(spine, 0, .17, 0);
  PB(chest, .272, .19, .172, 0, .095, 0);
  PB(chest, .23, .12, .07, 0, .135, -.083);                               // горб
  for (const s of [-1, 1]) PB(chest, .08, .085, .11, s * .136, .152, -.008);   // покатые плечи
  for (const y of [.035, .085, .135]) P(chest, B(.014, .014, .008), C.btn, 0, y, .088);   // пуговицы
  P(chest, B(.006, .17, .004), C.shirtD, .012, .1, .087);                 // планка
  PB(chest, .07, .06, .01, .068, .12, .089); P(chest, B(.074, .02, .012), C.shirtD, .068, .148, .091);   // нагрудный карман с клапаном
  P(chest, B(.012, .05, .004), C.frame, .052, .148, .094);                // в кармане — карандаш
  for (const s of [-1, 1]) PB(chest, .055, .018, .07, s * .036, .186, .055, .25, 0, s * -.35);   // воротник
  P(chest, B(.07, .05, .06), C.skin, 0, .2, .02);                          // шея снизу

  // ---------- голова: лысина, седая подкова, огромные очки ----------
  const neck = G(chest, 0, .19, .035);
  P(neck, B(.064, .08, .064), C.skin, 0, .035, 0);
  P(neck, B(.006, .06, .004), C.skinD, .016, .03, .033);                  // морщинистая шея
  const head = G(neck, 0, .075, .012);
  P(head, B(.19, .17, .2), C.skin, 0, .095, 0);
  P(head, B(.17, .06, .18), C.skin, 0, .005, .012);                       // челюсть
  P(head, B(.175, .035, .185), C.skin, 0, .195, -.004);                   // купол лысины ступеньками
  P(head, B(.13, .025, .14), C.skin, 0, .222, -.006);
  P(head, B(.06, .006, .05), C.skinL, -.02, .236, .015);                  // блик
  for (const [x, z] of [[.04, -.03], [-.045, .02], [.02, .045]]) P(head, B(.018, .006, .016), C.spot, x, .236, z);   // старческие пятнышки
  for (const y of [.16, .145]) P(head, B(.09, .006, .004), C.skinD, 0, y, .101);   // морщины на лбу
  P(head, B(.195, .06, .03), C.hair, 0, .115, -.098);                     // седая подкова: затылок
  for (const s of [-1, 1]) {
    P(head, B(.024, .07, .14), C.hair, s * .097, .12, -.03);
    P(head, B(.026, .03, .05), C.hairD, s * .1, .16, -.07, 0, 0, s * .35);
    P(head, B(.02, .02, .034), C.hair, s * .102, .168, -.015, 0, 0, s * .6);   // пушок торчит над ушами
    P(head, B(.026, .07, .05), C.skin, s * .104, .09, -.005);              // большие уши
    P(head, B(.026, .032, .04), C.skin, s * .106, .045, -.002);
    P(head, B(.01, .045, .026), C.skinD, s * .117, .088, 0);
    seg(head, s * .018, .148, s * .07, .14, .022, .024, C.hair, .1);       // кустистые брови, кончики вниз
    seg(head, s * .07, .14, s * .094, .122, .018, .022, C.hairD, .097);
    P(head, B(.03, .022, .012), C.skinL, s * .05, .045, .1);                // щёки
    seg(head, s * .008, .012, s * .045, -.006, .01, .01, C.hair, .108);     // тонкие седые усы
  }
  P(head, B(.036, .07, .045), C.skin, 0, .07, .11);                       // нос
  P(head, B(.044, .03, .04), C.skinL, 0, .045, .125);
  P(head, B(.03, .008, .006), C.lip, 0, -.002, .106);                     // рот
  P(head, B(.05, .03, .03), C.skin, 0, -.03, .085);                       // подбородок
  // очки: два огромных круга, за стёклами — увеличенные глаза
  const gl = G(head, 0, .108, .112);
  for (const s of [-1, 1]) {
    const cx = s * .058;
    P(gl, new THREE.TorusGeometry(.05, .008, 4, 14), C.frame, cx, 0, 0);
    P(gl, new THREE.CylinderGeometry(.047, .047, .003, 14), C.lens, cx, 0, -.003, Math.PI / 2);
    P(gl, B(.05, .036, .004), C.eyeW, cx + s * .002, -.004, .0);            // глаз за линзой — крупный
    P(gl, B(.024, .03, .005), C.eye, cx - s * .004, -.004, .002);
    P(gl, B(.007, .007, .006), C.glint, cx - s * .009, .003, .004);
    P(gl, B(.014, .01, .005), C.glint, cx - .022, .026, .002);              // блик на стекле
    P(gl, B(.008, .006, .005), C.glint, cx - .028, .016, .002);
    P(gl, B(.05, .006, .004), C.lensD, cx, -.034, .001);
    P(gl, B(.01, .01, .13), C.frame, s * .107, .006, -.062);                // дужки к ушам
  }
  P(gl, B(.024, .008, .008), C.frame, 0, .012, .002);                     // перемычка

  // ---------- руки в длинных фланелевых рукавах, манжеты подвёрнуты ----------
  const arms = [-1, 1].map(s => {
    const sh = G(chest, s * .145, .15, -.005);
    PB(sh, .07, UA + .02, .076, 0, -UA / 2, 0);
    const el = G(sh, 0, -UA, 0);
    PB(el, .066, FA * .62, .07, 0, -FA * .3, 0);
    P(el, B(.074, .03, .078), C.shirtD, 0, -FA * .62, 0);                  // подвёрнутая манжета
    P(el, B(.05, FA * .38, .052), C.skin, 0, -FA * .8, 0);
    const hd = G(el, 0, -FA, 0);
    P(hd, B(.034, .07, .058), C.skin, 0, -.035, 0);
    P(hd, B(.03, .045, .05), C.skinD, 0, -.085, .002);
    P(hd, B(.022, .04, .02), C.skin, s * .006, -.03, .036, .4);            // большой палец
    return { sh, el, hd };
  });

  // ---------- кости: две кости на конечность ставятся по целевой точке ----------
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const basisQ = (X, Y, Z) => new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z));
  function ik2(upper, lower, L1, L2, target, pole) {           // все векторы — в пространстве родителя upper
    const Hh = upper.position, D = target.clone().sub(Hh); let d = D.length(); const u = D.divideScalar(d || 1);
    d = Math.min(Math.max(d, Math.abs(L1 - L2) + 1e-3), L1 + L2 - 1e-3);
    const a = (L1 * L1 - L2 * L2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
    const n = pole.clone().addScaledVector(u, -pole.dot(u)).normalize();
    const K = Hh.clone().addScaledVector(u, a).addScaledVector(n, h), A = Hh.clone().addScaledVector(u, d);
    const t = K.clone().sub(Hh).normalize(), sv = A.clone().sub(K).normalize();
    let X = V(0, 0, 0).crossVectors(t, sv); if (X.lengthSq() < 1e-8) X.crossVectors(t, n); X.normalize();
    const Y = t.clone().negate(), Z = V(0, 0, 0).crossVectors(X, Y);
    upper.quaternion.copy(basisQ(X, Y, Z));
    const sl = sv.clone().applyQuaternion(upper.quaternion.clone().invert());
    lower.rotation.set(Math.atan2(-sl.z, -sl.y), 0, 0);
  }
  function orientQ(chain, fwd, up) { const Z = fwd.clone().normalize(), X = V(0, 0, 0).crossVectors(up, Z).normalize(), Y = V(0, 0, 0).crossVectors(Z, X);
    return chain.clone().invert().multiply(basisQ(X, Y, Z)) }
  const chainQ = (...ns) => ns.reduce((q, n) => q.multiply(n.quaternion), new THREE.Quaternion());
  const mat = o => { o.updateMatrix(); return o.matrix };
  const toLocal = (m, p) => p.clone().applyMatrix4(m.clone().invert());
  const sm = k => { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k) };
  const ease = (k, a, b) => Math.max(0, Math.min(1, k / a, (1 - k) / b));

  // ---------- поведение ----------
  const DUR = { nod: 1.3, wave: 2.2, glasses: 2, bow: 1.8, no: 1.4, take: 2.6, stretch: 2.8, look: 2.6 };
  const cur = { sp: .42, ch: .1, nk: .3, hd: -.76, hy: 0, hz: 0, hx: 0, wW: 0, wG: 0, wT: 0 };
  let time = 0, act = null, actT = 0, nextAct = 3 + Math.random() * 3, wasNear = false, look = 0, idleLook = 0;
  const take = { p: V(0, .7, .6) };                                  // куда тянуться (в осях Кирью-соседа: от ног, +z — вперёд)
  function play(name, o = {}) { act = name; actT = 0; if (o.target) take.p.copy(o.target); nextAct = 4 + Math.random() * 4 }
  function update(dt, st = {}) {
    time += dt;
    if (st.near && !wasNear && !act) play('nod');
    wasNear = !!st.near;
    if (act) { actT += dt; if (actT >= DUR[act]) { act = null; nextAct = 3.5 + Math.random() * 5 } }
    else if ((nextAct -= dt) <= 0) { const r = Math.random(); play(r < .3 ? 'glasses' : r < .55 ? 'stretch' : 'look'); if (act === 'look') idleLook = (Math.random() < .5 ? -1 : 1) * (.4 + Math.random() * .45) }
    const k = act ? actT / DUR[act] : 0, A = n => act === n;
    const wave = A('wave') ? ease(k, .15, .15) : 0, glas = A('glasses') ? ease(k, .25, .25) : 0, str = A('stretch') ? Math.sin(Math.PI * k) : 0;
    const bow = A('bow') ? Math.sin(Math.PI * k) : A('take') ? Math.max(0, Math.sin(Math.PI * (k - .78) / .22)) * .7 : 0;
    const reach = A('take') ? (k < .3 ? sm(k / .3) : k < .48 ? 1 : 1 - sm((k - .48) / .3)) : 0;
    // взгляд: на Кирью, если рядом (в своих осях), иначе — по сторонам
    const ry = root.rotation.y, wx = st.px || 0, wz = st.pz || 1, lx = wx * Math.cos(ry) - wz * Math.sin(ry), lz = wx * Math.sin(ry) + wz * Math.cos(ry);
    const lookTo = st.near ? Math.max(-1, Math.min(1, Math.atan2(lx, Math.max(.25, lz)))) : A('look') ? idleLook * ease(k, .2, .25) : 0;
    look += (lookTo - look) * (1 - Math.exp(-dt * 3));
    const breath = Math.sin(time * 1.6);
    const p = { sp: .42 + .012 * breath - .26 * str + .42 * bow + .3 * reach, ch: .1 + .018 * breath - .1 * str + .08 * reach, nk: .3 - .08 * str };
    let pitch = .04 + .5 * bow + .35 * reach + .12 * glas;                        // куда смотрит лицо: 0 — прямо
    if (A('nod')) pitch += .32 * Math.max(0, Math.sin(k * Math.PI * 4)) * ease(k, .1, .2);
    p.hd = pitch - (p.sp + p.ch + p.nk);
    p.hy = look + (A('no') ? .38 * Math.sin(k * Math.PI * 5) * ease(k, .1, .2) : 0) + (A('take') ? -.25 * reach : 0);
    p.hz = .05 * Math.sin(time * .5) + (A('wave') ? -.12 * wave : 0) + .1 * str;
    const kk = 1 - Math.exp(-dt * 7);
    for (const n of ['sp', 'ch', 'nk', 'hd', 'hy', 'hz']) cur[n] += (p[n] - cur[n]) * kk;
    cur.wW += (wave - cur.wW) * (1 - Math.exp(-dt * 12)); cur.wG += (glas - cur.wG) * (1 - Math.exp(-dt * 12)); cur.wT = reach;
    hips.position.set(.012 * Math.sin(time * .8), HIPY - .006 * (1 + breath) / 2 - .03 * bow - .03 * reach, -.02 * reach);
    hips.rotation.set(0, .04 * Math.sin(time * .8), .025 * Math.sin(time * .8));
    spine.rotation.set(cur.sp, 0, 0); chest.rotation.set(cur.ch, 0, -.02 * Math.sin(time * .8));
    neck.rotation.set(cur.nk, cur.hy * .4, 0); head.rotation.set(cur.hd, cur.hy * .6, cur.hz);

    // ноги: стопы стоят на месте, колени чуть вперёд и врозь
    const Mh = mat(hips);
    legs.forEach((L, i) => { const s = i ? 1 : -1;
      ik2(L.th, L.kn, LT, LS, toLocal(Mh, V(s * .1, ANK, .015)), V(s * .25, 0, 1));
      L.an.quaternion.copy(orientQ(chainQ(hips, L.th, L.kn), V(s * .12, 0, 1), V(0, 1, 0)));
    });
    // руки: сцеплены за спиной; правая (−x) может махать, поправлять очки или тянуться к столу
    const Mc = Mh.clone().multiply(mat(spine)).multiply(mat(chest)), Md = Mc.clone().multiply(mat(neck)).multiply(mat(head));
    const behind = [V(-.005, .035, -.15), V(.035, .012, -.158)].map(v => toLocal(Mc, v.applyMatrix4(Mh)));
    let tR = behind[0], poleR = V(-1, -.2, -1);
    if (cur.wW > .001) { tR = tR.clone().lerp(toLocal(Mc, V(-.32 + .06 * Math.sin(time * 11), 1.2, .14)), cur.wW); poleR = poleR.lerp(V(-1, -.6, -.3), cur.wW) }
    if (cur.wG > .001) { tR = tR.clone().lerp(toLocal(Mc, V(0, .108, .14).applyMatrix4(Md)), cur.wG); poleR = poleR.lerp(V(-.6, -1, .3), cur.wG) }
    if (cur.wT > .001) { tR = tR.clone().lerp(toLocal(Mc, take.p), cur.wT); poleR = poleR.lerp(V(-.6, -1, -.2), cur.wT) }
    ik2(arms[0].sh, arms[0].el, UA, FA, tR, poleR.normalize());
    ik2(arms[1].sh, arms[1].el, UA, FA, behind[1], V(1, -.2, -1).normalize());
    arms[0].hd.rotation.set(0, 0, cur.wW * .3); arms[1].hd.rotation.set(0, 0, 0);
  }

  // ---------- склейка: один меш на сустав (цвета — в вершинах), фланель — отдельным мешем с текстурой ----------
  const animated = new Set([root, hips, spine, chest, neck, head, ...legs.flatMap(l => [l.th, l.kn, l.an]), ...arms.flatMap(a => [a.sh, a.el, a.hd])]);
  const VC = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  root.updateMatrixWorld(true);
  const buckets = new Map(), meshes = [];
  root.traverse(o => { if (o.isMesh) meshes.push(o) });
  for (const m of meshes) {
    let A = m.parent; while (!animated.has(A)) A = A.parent;
    const tx = m.material === PLAID, key = A.uuid + (tx ? 't' : 'c');
    const rel = A.matrixWorld.clone().invert().multiply(m.matrixWorld);
    const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone(); g.applyMatrix4(rel);
    if (!buckets.has(key)) buckets.set(key, { A, tx, pos: [], nrm: [], col: [], uv: [] });
    const b = buckets.get(key), p = g.attributes.position.array, n = g.attributes.normal.array, uv = g.attributes.uv && g.attributes.uv.array, c = m.material.color;
    for (let i = 0; i < p.length; i += 3) { b.pos.push(p[i], p[i + 1], p[i + 2]); b.nrm.push(n[i], n[i + 1], n[i + 2]); b.col.push(c.r, c.g, c.b) }
    if (tx && uv) b.uv.push(...uv);
    m.parent.remove(m);
  }
  for (const b of buckets.values()) { const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(b.nrm, 3));
    if (b.tx) g.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv, 2)); else g.setAttribute('color', new THREE.Float32BufferAttribute(b.col, 3));
    const m = new THREE.Mesh(g, b.tx ? PLAID : VC); m.castShadow = m.receiveShadow = true; m.userData.kz = true; b.A.add(m) }
  update(0);
  return { root, update, play, head, hand: arms[0].hd, get act() { return act }, get k() { return act ? actT / DUR[act] : 0 }, height: 1.2 };
}
