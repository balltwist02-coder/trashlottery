/* ---------- мусор ---------- */
const M = c => new THREE.MeshLambertMaterial({ color: c, flatShading: true });
const GREY = new THREE.MeshLambertMaterial({ color: 0x8a8f96, flatShading: true });
function part(g, geo, mat, x, y, z, ry = 0, rx = 0, rz = 0) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); g.add(m); return m }
const QZ90 = new CANNON.Quaternion().setFromEuler(0, 0, Math.PI / 2);   // цилиндр физики по оси X
const RUST = [0x8a4b2a, 0xa35a2c, 0x6e3a22];
function pipeMesh(g, len, seed) {                            // синеватая труба с пятнами ржавчины, лежит вдоль X
  const steel = M(0x5f7f9e), inner = M(0x24303c), r = .075;
  part(g, new THREE.CylinderGeometry(r, r, len, 10, 1, true), steel, 0, r, 0, 0, 0, Math.PI / 2);
  for (const s of [-1, 1]) part(g, new THREE.RingGeometry(r * .55, r, 10), inner, s * len / 2, r, 0, s * Math.PI / 2);
  part(g, new THREE.CylinderGeometry(r * .56, r * .56, len - .002, 10, 1, true), new THREE.MeshLambertMaterial({ color: 0x1b232d, side: THREE.BackSide }), 0, r, 0, 0, 0, Math.PI / 2);   // тёмная внутренность трубы
  let q = seed;
  for (let k = 0; k < Math.round(len * 5); k++) { q = (q * 9301 + 49297) % 233280; const t = q / 233280;
    const w = .05 + (k % 3) * .03;
    part(g, new THREE.CylinderGeometry(r * 1.02, r * 1.02, w, 10, 1, true, t * 6.28, 1.6 + (k % 2)), M(RUST[k % 3]), -len / 2 + .06 + (len - .12) * ((k * .37 + t) % 1), r, 0, 0, 0, Math.PI / 2) }
}
// труба для физики — цепочка шариков вдоль оси X: шар со всем остальным сталкивается очень дёшево, а катится как цилиндр
const rod = len => { const n = Math.max(3, Math.ceil(len / .2) + 1); return Array.from({ length: n }, (_, k) => [new CANNON.Sphere(.075), [-len / 2 + .075 + k * (len - .15) / (n - 1), .075, 0]]) };
function tinCan(g, full) {                                     // консервная банка: закатки, выцветшая этикетка, крышка отогнута вверх рваным краем
  const r = .105, h = .15, tin = M(0xaab3ba), rib = M(0x7d868e), lid = M(0xc9d1d7);
  part(g, new THREE.CylinderGeometry(r, r, h, 12, 1, true), tin, 0, h / 2, 0);
  const inn = new THREE.CylinderGeometry(r - .006, r - .006, h - .004, 12, 1, true); inn.scale(-1, 1, 1);
  part(g, inn, M(0x3a3632), 0, h / 2 + .002, 0);
  part(g, new THREE.CylinderGeometry(r, r, .008, 12), tin, 0, .004, 0);
  part(g, new THREE.CylinderGeometry(r + .003, r + .003, .074, 12, 1, true), M(0xb1532f), 0, .072, 0);
  part(g, new THREE.CylinderGeometry(r + .004, r + .004, .016, 12, 1, true), M(0xe0cd96), 0, .072, 0);
  for (const y of [.012, h - .006]) part(g, new THREE.TorusGeometry(r + .001, .007, 4, 12), rib, 0, y, 0, 0, Math.PI / 2);
  const hinge = new THREE.Group(); hinge.position.set(0, h, -r + .012); hinge.rotation.x = -1.95; g.add(hinge);   // крышка на «петле» у дальнего края
  part(hinge, new THREE.CylinderGeometry(r - .01, r - .01, .006, 12), lid, 0, 0, r - .012);
  for (let k = 0; k < 6; k++) { const a = Math.PI * (.18 + .64 * k / 5); part(hinge, new THREE.BoxGeometry(.026, .006, .024), lid, Math.cos(a) * (r - .01), 0, (r - .012) + Math.sin(a) * (r - .006), a + (k % 2 ? .4 : -.3)) }
  if (!full) { part(g, new THREE.CylinderGeometry(r - .008, r - .008, .004, 12), M(0x26231f), 0, .012, 0); return }
  part(g, new THREE.CylinderGeometry(r - .007, r - .009, .03, 12), M(0x3a2415), 0, h - .022, 0);   // земля доверху
  for (let k = 0; k < 5; k++) part(g, new THREE.BoxGeometry(.03, .022, .03), M(k % 2 ? 0x4a2e1a : 0x2e1c10), Math.cos(k * 2.4) * .055, h - .004, Math.sin(k * 2.4) * .055, k);
  const b = geoB({ wa: [0, 0, 0, 0], wd: [0, 0, 0], we: [0, 0, 0] });
  for (let k = 0; k < 5; k++) { const a = k * 2.4 + .5, o = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
    addWorm(b, new THREE.Vector3(o.x * .045, h - .008, o.z * .045), new THREE.Vector3(0, 1, 0).addScaledVector(o, .5).normalize(), o, .08 + (k % 3) * .02, k * 1.7, .018, 4 + k * .7, .011) }
  g.add(new THREE.Mesh(bGeo(b), decoMat('item')));             // черви свешиваются через край и шевелятся
}
/* ---------- новый мусор: бутылки, пакет молока, огромная шина, скелет ---------- */
const ZR = Math.PI / 2, TAU = Math.PI * 2;                     // ZR — поворот на бок: ось предмета вдоль X
const lathe = (prof, seg, a = 0, len = TAU) => new THREE.LatheGeometry(prof.map(([x, y]) => new THREE.Vector2(x, y)), seg, a, len);
/* бутылки большие — длиной почти в клетку: стоя достали бы Кирью до предплечья. Внутри группы b бутылка стоит (дно в 0), сама группа лежит вдоль X */
function bottleBase(g, L, R) { const b = new THREE.Group(); b.position.set(-L / 2, R, 0); b.rotation.z = -ZR; g.add(b); return b }
function beerCan(g) {                                         // высокая пивная банка размером с банку кофе: серебристо-белая спереди, красная сзади, красные пояса, без надписей и марки
  const wh = M(0xeceef0), red = M(0xe0262c), redD = M(0xb3161d), alu = M(0xb9c0c8), dk = M(0x5b636c), R = .105, H = .36;
  part(g, new THREE.CylinderGeometry(R, R, H - .04, 14), [wh, alu, alu], 0, .02 + (H - .04) / 2, 0);
  part(g, new THREE.CylinderGeometry(R + .003, R + .003, H - .05, 14, 1, true, Math.PI * .55, Math.PI * .9), red, 0, .025 + (H - .05) / 2, 0);   // красная спинка
  part(g, new THREE.CylinderGeometry(R + .005, R + .005, .045, 14, 1, true), red, 0, .06, 0);            // красный пояс внизу
  part(g, new THREE.CylinderGeometry(R + .006, R + .006, .012, 14, 1, true), redD, 0, .088, 0);
  part(g, new THREE.CylinderGeometry(R + .005, R + .005, .03, 14, 1, true), red, 0, H - .07, 0);         // и под горлышком
  part(g, new THREE.CylinderGeometry(R * .9, R, .02, 14), alu, 0, .01, 0);                               // донышко
  part(g, new THREE.CylinderGeometry(R * .86, R, .03, 14), alu, 0, H - .025, 0);                         // скос к крышке
  part(g, new THREE.CylinderGeometry(R * .88, R * .88, .012, 14), alu, 0, H - .004, 0);                  // крышка с ободком
  part(g, new THREE.BoxGeometry(.05, .006, .03), dk, .02, H + .004, 0);                                  // ключ-открывашка
  part(g, new THREE.BoxGeometry(.03, .006, .02), M(0x2a2e33), -.03, H + .002, 0);                        // дырочка
}
function glassBottle(g) {                                      // светло-зелёная стеклянная бутылка: бумажная этикетка, длинное горлышко, блики
  const gl = M(0x96e2a2), gd = M(0x5fb672), hl = M(0xf0fff2), lab = M(0xf3e5b6), labR = M(0xd2483a), dk = M(0x1c3a25), L = .98, R = .125, b = bottleBase(g, L, R), hy = R + Math.sqrt(R * R - .0025) + .005;
  part(b, lathe([[0, 0], [R * .88, 0], [R, .03], [R, .53], [R * .95, .59], [R * .76, .65], [R * .52, .7], [R * .4, .745], [R * .37, .9], [R * .48, .91], [R * .48, .955], [R * .3, .965], [0, .965]], 12), gl, 0, 0, 0);
  part(b, new THREE.CylinderGeometry(R + .004, R + .004, .2, 12, 1, true), lab, 0, .3, 0);        // этикетка
  part(b, new THREE.CylinderGeometry(R + .007, R + .007, .04, 12, 1, true), labR, 0, .3, 0);      // красная полоса на этикетке
  part(b, new THREE.CylinderGeometry(R * .5, R * .5, .045, 10, 1, true), gd, 0, .932, 0);         // венчик горлышка потемнее
  part(b, new THREE.CylinderGeometry(R * .3, R * .3, .014, 8), dk, 0, .966, 0);                   // тёмная дырочка горлышка
  part(b, new THREE.CylinderGeometry(R * .93, R * .93, .02, 12), gd, 0, .011, 0);                 // толстое донышко
  part(g, new THREE.BoxGeometry(.17, .014, .03), hl, -.385, hy, .05);                             // блики сверху на боку и на горлышке
  part(g, new THREE.BoxGeometry(.1, .014, .026), hl, -.025, hy, .05);
  part(g, new THREE.BoxGeometry(.12, .012, .02), hl, .33, R + R * .37 + .004, .01);
}
function milkCarton(g) {                                       // картонный пакет молока: белый, синяя полоса, двускатный верх с гребнем
  const wh = M(0xe9e5da), bl = M(0x4f86c6), bl2 = M(0x2e5f9e), w = .13, h = .22;
  part(g, new THREE.BoxGeometry(w, h, w), wh, 0, h / 2, 0);
  part(g, new THREE.BoxGeometry(w + .004, .08, w + .004), bl, 0, .07, 0);
  part(g, new THREE.BoxGeometry(w + .006, .014, w + .006), bl2, 0, .115, 0);
  for (const s of [-1, 1]) part(g, new THREE.BoxGeometry(w, .01, .087), wh, 0, h + .0285, s * .0325, 0, s * .72);   // скаты
  part(g, new THREE.BoxGeometry(w, .028, .012), wh, 0, h + .07, 0);                            // гребень
  part(g, new THREE.BoxGeometry(.04, .04, .004), bl, w * .22, .165, w / 2 + .003);              // кружок на боку
}
/* огромная шина с тракторным протектором «ёлочкой»; лежит плашмя на 2×2 клетки. Лом рубит её пополам, половинки — ещё пополам.
   Кусок шины — дуга от угла a0 до a1 (угол a — точка (cos a, sin a) в плоскости XZ), у куска на срезах видна полость и стальной корд */
const TIRE = { R: .93, Rin: .46, H: .52 };
function tireArc(g, a0, a1) {
  const rub = M(0x25262a), lug = M(0x34353a), side = M(0x2e2f34), mud = M(0x4e3b29), cut = M(0x4a4b52), hole = M(0x0b0b0e), steel = M(0xc8ced6);
  const { R, Rin, H } = TIRE, span = a1 - a0, full = span > TAU - 1e-6, inA = a => full || (a > a0 + .07 && a < a1 - .07), seg = k => Math.max(3, Math.round(k * span / TAU));
  const prof = [[Rin, .05], [Rin + .05, 0], [R - .07, 0], [R, .07], [R, H - .07], [R - .07, H], [Rin + .05, H], [Rin, H - .05], [Rin, .05]];
  part(g, lathe(prof, seg(28), Math.PI / 2 - a1, span), rub, 0, 0, 0);
  for (let k = 0; k < 22; k++) for (const s of [-1, 1]) { const a = (k + (s > 0 ? .5 : 0)) / 22 * TAU; if (!inA(a)) continue;   // грунтозацепы
    const l = new THREE.Group(); l.position.set(Math.cos(a) * (R + .02), H / 2 + s * .12, Math.sin(a) * (R + .02)); l.rotation.y = -a; g.add(l);
    part(l, new THREE.BoxGeometry(.06, .25, .09), lug, 0, 0, 0, 0, s * .75, 0) }
  const ring = new THREE.TorusGeometry((R + Rin) / 2, .025, 4, seg(28), span); ring.rotateX(ZR); ring.rotateY(-a0);
  part(g, ring, side, 0, H, 0);                                // выпуклое кольцо на боковине
  for (let k = 0; k < 14; k++) { const a = k / 14 * TAU; if (inA(a)) part(g, new THREE.BoxGeometry(.16, .025, .035), side, Math.cos(a) * .58, H + .005, Math.sin(a) * .58, -a) }
  for (let k = 0; k < 6; k++) { const a = (k * 1.7 + .4) % TAU; if (inA(a)) part(g, new THREE.BoxGeometry(.14, .02, .1), mud, Math.cos(a) * .7, H + .008, Math.sin(a) * .7, -a + .3) }   // налипшая земля
  if (full) return;
  const inner = [[Rin + .07, .1], [R - .1, .08], [R - .06, .12], [R - .06, H - .12], [R - .1, H - .08], [Rin + .07, H - .1]], up = new THREE.Vector3(0, 1, 0);
  for (const [a, e] of [[a0, -1], [a1, 1]]) {                  // срез: резина посветлее, внутри темнота полой шины, торчит стальной корд
    const rad = new THREE.Vector3(Math.cos(a), 0, Math.sin(a)), tan = new THREE.Vector3(-Math.sin(a), 0, Math.cos(a)).multiplyScalar(e);
    const basis = e > 0 ? new THREE.Matrix4().makeBasis(rad, up, tan) : new THREE.Matrix4().makeBasis(up, rad, tan);   // грань среза смотрит наружу, вдоль tan
    for (const [pts, mat, off] of [[prof.slice(0, -1), cut, .002], [inner, hole, .005]]) {
      const geo = new THREE.ShapeGeometry(new THREE.Shape(pts.map(([r, y]) => e > 0 ? new THREE.Vector2(r, y) : new THREE.Vector2(y, r))));
      geo.applyMatrix4(basis); geo.translate(tan.x * off, 0, tan.z * off); part(g, geo, mat, 0, 0, 0) }
    for (const [y, dr] of [[.15, .03], [.26, .045], [.37, .03]]) part(g, new THREE.BoxGeometry(.016, .016, .08), steel, rad.x * (R - dr) + tan.x * .035, y, rad.z * (R - dr) + tan.z * .035, Math.atan2(tan.x, tan.z));
  }
}
const tireShapes = (a0, a1) => { const n = Math.max(2, Math.round(14 * (a1 - a0) / TAU));   // физика шины — шары по кольцу
  return Array.from({ length: n }, (_, k) => { const a = a0 + (k + .5) / n * (a1 - a0); return [new CANNON.Sphere(.25), [Math.cos(a) * .7, .26, Math.sin(a) * .7]] }) };
const TIRE_CHIPS = ['#25262a', '#4a4b52', '#4e3b29', '#c8ced6'];
/* скелет Егора Филатова лежит на спине вдоль X, огромный череп у −x. Кости толстые, с шишками-мыщелками на концах.
   Три части — каждая сама по себе предмет: лом разбирает скелет на них */
const BONE = () => M(0xe9e0c6), BONE_D = () => M(0xc4b692), BHOLE = () => M(0x17110c), TOOTH = () => M(0xf8f3e3), UP = new THREE.Vector3(0, 1, 0);
function bone(g, a, b, r, mat, knob = 1.3) {                   // кость от точки a до b; knob — размер шишек на концах (0 — без них)
  const A = new THREE.Vector3(...a), Bv = new THREE.Vector3(...b), d = Bv.clone().sub(A), len = d.length(); d.normalize();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.08, len, 7), mat); m.position.copy(A).add(Bv).multiplyScalar(.5); m.quaternion.setFromUnitVectors(UP, d); g.add(m);
  if (!knob) return;
  const sd = new THREE.Vector3().crossVectors(d, UP); if (sd.lengthSq() < 1e-4) sd.set(1, 0, 0); sd.normalize();
  for (const [p, k] of [[A, 1], [Bv, -1]]) for (const s of [-1, 1]) { const n = new THREE.Mesh(new THREE.SphereGeometry(r * knob, 7, 5), mat);
    n.position.copy(p).addScaledVector(sd, s * r * .7).addScaledVector(d, k * r * .3); g.add(n) }
}
function skullPart(g) {                                        // аномально большой череп: лежит затылком вниз, лицом вверх, подбородком к телу (+x)
  const B = BONE(), S = BONE_D(), D = BHOLE(), T = TOOTH();
  const cr = new THREE.SphereGeometry(.27, 12, 9); cr.scale(1.05, .78, 1); part(g, cr, B, -.07, .22, 0);   // свод
  part(g, new THREE.BoxGeometry(.28, .3, .46), B, .08, .25, 0);                                  // плоское лицо смотрит вверх
  part(g, new THREE.BoxGeometry(.07, .05, .5), S, -.03, .415, 0);                                // тяжёлая надбровная дуга
  for (const s of [-1, 1]) {
    part(g, new THREE.BoxGeometry(.15, .022, .16), D, .075, .405, s * .125);                       // огромные пустые глазницы
    part(g, new THREE.BoxGeometry(.13, .1, .07), S, .1, .33, s * .245);                         // скулы торчат вбок
    part(g, new THREE.BoxGeometry(.26, .09, .05), S, .2, .2, s * .19);                          // ветви челюсти
  }
  part(g, new THREE.CylinderGeometry(.055, .055, .022, 3), D, .18, .405, 0, -ZR);                 // носовая дыра — треугольник остриём к глазам
  part(g, new THREE.BoxGeometry(.05, .12, .34), D, .235, .33, 0);                                 // темнота рта за зубами
  part(g, new THREE.BoxGeometry(.1, .03, .32), D, .28, .25, 0);
  for (let k = 0; k < 6; k++) part(g, new THREE.BoxGeometry(.055, .085, .045), T, .245, .355, -.1375 + k * .055);   // верхние зубы
  part(g, new THREE.BoxGeometry(.09, .13, .36), S, .335, .2, 0);                                  // нижняя челюсть отвисла — рот открыт
  for (let k = 0; k < 5; k++) part(g, new THREE.BoxGeometry(.05, .06, .045), T, .31, .29, -.11 + k * .055);         // нижние зубы
  part(g, new THREE.BoxGeometry(.1, .016, .018), D, -.2, .405, .12, .6); part(g, new THREE.BoxGeometry(.08, .016, .018), D, -.13, .41, .075, -.5);   // трещина
}
function chestPart(g) {                                        // позвоночник, рёбра бочкой, грудина, ключицы и руки вдоль тела
  const B = BONE(), S = BONE_D();
  for (let k = 0; k < 6; k++) { const x = -.27 + k * .085; part(g, new THREE.BoxGeometry(.06, .07, .1), k % 2 ? S : B, x, .045, 0); part(g, new THREE.BoxGeometry(.03, .035, .2), S, x, .04, 0) }
  for (let k = 0; k < 5; k++) for (const s of [-1, 1]) { const t = new THREE.TorusGeometry(.15, .032, 5, 9, Math.PI); t.rotateZ(-ZR); t.rotateY(-s * ZR); t.scale(1, 1, 1.4); part(g, t, k % 2 ? S : B, -.2 + k * .08, .2, 0) }
  part(g, new THREE.BoxGeometry(.32, .05, .08), B, -.07, .385, 0);                               // грудина
  for (const s of [-1, 1]) {
    bone(g, [-.26, .33, s * .05], [-.29, .16, s * .29], .028, B, 0);                             // ключица
    part(g, new THREE.SphereGeometry(.06, 7, 5), B, -.28, .09, s * .33);                         // плечевой сустав
    bone(g, [-.26, .065, s * .34], [0, .06, s * .35], .042, B);                                   // плечевая кость
    bone(g, [.03, .05, s * .32], [.24, .045, s * .32], .03, S); bone(g, [.03, .045, s * .375], [.24, .04, s * .37], .022, B);   // лучевая и локтевая
    part(g, new THREE.BoxGeometry(.08, .035, .11), B, .29, .03, s * .345);                       // кисть
    for (let f = 0; f < 4; f++) part(g, new THREE.BoxGeometry(.08, .028, .022), S, .365, .025, s * (.305 + f * .027)) }
}
function legsPart(g) {                                         // таз и толстые ноги, стопы торчат пальцами вверх
  const B = BONE(), S = BONE_D(), D = BHOLE();
  part(g, new THREE.BoxGeometry(.1, .07, .11), S, .03, .05, 0);                                   // крестец
  for (const s of [-1, 1]) { const w = new THREE.SphereGeometry(.1, 8, 6); w.scale(.8, .55, 1.2); part(g, w, B, .07, .085, s * .11) }   // крылья таза
  part(g, new THREE.BoxGeometry(.06, .06, .22), S, .17, .065, 0);
  for (const s of [-1, 1]) {
    part(g, new THREE.BoxGeometry(.045, .012, .05), D, .17, .1, s * .06);                        // дыры в тазу
    bone(g, [.13, .06, s * .13], [.42, .06, s * .13], .052, B);                                   // бедренная кость
    part(g, new THREE.SphereGeometry(.045, 6, 5), B, .44, .115, s * .13);                        // коленная чашечка
    bone(g, [.46, .055, s * .12], [.66, .05, s * .12], .042, B); bone(g, [.47, .045, s * .19], [.65, .045, s * .19], .022, S);   // голень
    part(g, new THREE.BoxGeometry(.08, .07, .1), B, .69, .045, s * .13);                         // пятка
    part(g, new THREE.BoxGeometry(.07, .16, .1), S, .7, .15, s * .13);                           // стопа вверх
    for (let f = 0; f < 4; f++) part(g, new THREE.BoxGeometry(.035, .055, .022), B, .7, .255, s * (.093 + f * .025)) }
}
const SKEL = { skull: [-.62, skullPart, [-1, 0, 0]], skelChest: [.06, chestPart, [-.25, 0, 0]], skelLegs: [.25, legsPart, [1, 0, 0]] };   // где часть лежит в целом скелете и куда отлетает
const SKEL_SHAPES = {
  skull: () => [[new CANNON.Box(new CANNON.Vec3(.325, .21, .27)), [-.025, .21, 0]]],
  skelChest: () => [[new CANNON.Box(new CANNON.Vec3(.235, .2, .26)), [-.065, .2, 0]], ...[-1, 1].map(s => [new CANNON.Box(new CANNON.Vec3(.34, .05, .065)), [.04, .05, s * .345]])],
  skelLegs: () => [[new CANNON.Box(new CANNON.Vec3(.37, .07, .2)), [.35, .07, 0]], [new CANNON.Box(new CANNON.Vec3(.05, .14, .18)), [.7, .14, 0]]],
};
const BOTTLE_SH = R => () => [[new CANNON.Cylinder(R, R, .56, 10), [-.21, R, 0], QZ90], [new CANNON.Cylinder(R * .55, R * .55, .42, 8), [.28, R, 0], QZ90]];
/* ---------- категории вещей ----------
   у каждого типа в TYPES есть cat — по ней группируем вещи, когда будем заново считать цены, шансы и глубину появления */
const CATS = {
  bytovoy: 'Бытовой мусор',     // банки, бутылки, пакеты — мелочь, которой больше всего
  metal: 'Металлолом',          // трубы и прочее железо
  rubber: 'Резина',             // шины и куски шин
  bones: 'Кости',               // скелеты и их части
  bait: 'Наживка',              // банки с червями
  gear: 'Снаряжение',           // то, чем пользуется сам Кирью: фонари, лестницы
  story: 'Сюжетное',            // улики и находки для истории (пока пусто)
};
const TYPES = {
  coffee: { name: 'Банка кофе', cat: 'bytovoy', size: 1, mass: 1,
    build(g) { const red = M(0xa8383a), band = M(0xe8d3a0), lid = M(0xc9d3dc);
      part(g, new THREE.CylinderGeometry(.15, .15, .3, 10), [red, lid, lid], 0, .15, 0);
      part(g, new THREE.CylinderGeometry(.153, .153, .09, 10, 1, true), band, 0, .15, 0) },
    shapes: () => [[new CANNON.Cylinder(.15, .15, .3, 10), [0, .15, 0]]] },
  pipe: { name: 'Ржавая труба', cat: 'metal', size: 2, mass: 2, breaks: true, pieces: [['pipeHalf', [-.43, 0, 0]], ['pipeHalf', [.43, 0, 0]]],
    build(g) { pipeMesh(g, 1.7, 17) },
    shapes: () => rod(1.7) },
  lantern: { name: 'Фонарь', cat: 'gear', size: 1, mass: .8, light: 15,
    build(g) { const metal = M(0x2b2f36), glass = new THREE.MeshBasicMaterial({ color: 0xffd27a }); glass.userData.glow = true;
      part(g, new THREE.BoxGeometry(.2, .04, .2), metal, 0, .02, 0);
      part(g, new THREE.BoxGeometry(.14, .17, .14), glass, 0, .125, 0);
      for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) part(g, new THREE.BoxGeometry(.03, .19, .03), metal, x * .075, .125, z * .075);
      part(g, new THREE.BoxGeometry(.2, .04, .2), metal, 0, .23, 0);
      part(g, new THREE.ConeGeometry(.1, .07, 4), metal, 0, .285, 0, Math.PI / 4);
      part(g, new THREE.TorusGeometry(.055, .012, 4, 8, Math.PI), metal, 0, .31, 0) },
    shapes: () => [[new CANNON.Box(new CANNON.Vec3(.1, .16, .1)), [0, .16, 0]]] },
  tin: { name: 'Консервная банка', cat: 'bytovoy', size: 1, mass: .6,
    build(g) { tinCan(g, false) },
    shapes: () => [[new CANNON.Cylinder(.105, .105, .15, 8), [0, .075, 0]]] },
  wormTin: { name: 'Банка с червями', cat: 'bait', size: 1, mass: .7,
    build(g) { tinCan(g, true) },
    shapes: () => [[new CANNON.Cylinder(.105, .105, .15, 8), [0, .075, 0]]] },
  pipeHalf: { name: 'Половина трубы', cat: 'metal', size: 1, mass: 1,
    build(g) { pipeMesh(g, .82, 5) },
    shapes: () => rod(.82) },
  beer: { name: 'Банка пива', cat: 'bytovoy', size: 1, mass: .5,
    build(g) { beerCan(g) },
    shapes: () => [[new CANNON.Cylinder(.105, .105, .36, 10), [0, .18, 0]]] },
  glass: { name: 'Зелёная бутылка', cat: 'bytovoy', size: 1, mass: .8,
    build(g) { const s = new THREE.Group(); s.scale.setScalar(.9); g.add(s); glassBottle(s) },   // на 10% меньше исходной
    shapes: () => [[new CANNON.Cylinder(.1125, .1125, .504, 10), [-.189, .1125, 0], QZ90], [new CANNON.Cylinder(.062, .062, .378, 8), [.252, .1125, 0], QZ90]] },
  milk: { name: 'Пакет молока', cat: 'bytovoy', size: 1, mass: .4,
    build(g) { milkCarton(g) },
    shapes: () => [[new CANNON.Box(new CANNON.Vec3(.065, .14, .065)), [0, .14, 0]]] },
  tire: { name: 'Огромная шина', cat: 'rubber', size: 4, mass: 10, heavy: 'Слишком тяжёлая — даже не сдвинуть. Разруби ломом', breaks: true, brokeMsg: 'Шина разрублена пополам', chips: TIRE_CHIPS,
    pieces: [['tireHalf', [0, 0, 0], 0, [0, 0, 1]], ['tireHalf', [0, 0, 0], Math.PI, [0, 0, -1]]],
    build(g) { tireArc(g, 0, TAU) },
    shapes: () => tireShapes(0, TAU) },
  tireHalf: { name: 'Половина шины', cat: 'rubber', size: 2, mass: 5, heavy: 'Всё ещё тяжело — разруби ещё раз', breaks: true, brokeMsg: 'Половина шины разрублена', chips: TIRE_CHIPS,
    pieces: [['tireQuarter', [0, 0, 0], 0, [.7, 0, .7]], ['tireQuarter', [0, 0, 0], -ZR, [-.7, 0, .7]]],
    build(g) { tireArc(g, 0, Math.PI) },
    shapes: () => tireShapes(0, Math.PI) },
  tireQuarter: { name: 'Кусок шины', cat: 'rubber', size: 1, mass: 2,
    build(g) { tireArc(g, 0, ZR) },
    shapes: () => tireShapes(0, ZR) },
  skeleton: { name: 'Скелет Егора Филатова', cat: 'bones', size: 2, mass: 3, breaks: true, brokeMsg: 'Егор Филатов разобран на части', chips: ['#e9e0c6', '#c4b692', '#8c8170'],
    pieces: Object.entries(SKEL).map(([k, [ox, , push]]) => [k, [ox, 0, 0], 0, push]),
    build(g) { for (const [ox, fn] of Object.values(SKEL)) { const p = new THREE.Group(); p.position.x = ox; g.add(p); fn(p) } },
    shapes: () => Object.entries(SKEL_SHAPES).flatMap(([k, f]) => f().map(([sh, o]) => [sh, [o[0] + SKEL[k][0], o[1], o[2]]])) },
  skull: { name: 'Череп Егора Филатова', cat: 'bones', size: 1, mass: 1, build(g) { skullPart(g) }, shapes: SKEL_SHAPES.skull },
  skelChest: { name: 'Рёбра Егора Филатова', cat: 'bones', size: 1, mass: 1.1, build(g) { chestPart(g) }, shapes: SKEL_SHAPES.skelChest },
  skelLegs: { name: 'Ноги Егора Филатова', cat: 'bones', size: 1, mass: 1, build(g) { legsPart(g) }, shapes: SKEL_SHAPES.skelLegs },
  ladder: { name: 'Лестница', cat: 'gear', size: 2, mass: 1.2,                // высотой ровно в блок, три ступеньки
    build(g) { const rl = M(0xd9a35c), rg = M(0xa8692f);
      for (const z of [-.2, .2]) part(g, new THREE.BoxGeometry(BH, .07, .085), rl, 0, .035, z);           // толстые брусья
      for (const x of [-BH / 3, 0, BH / 3]) part(g, new THREE.BoxGeometry(.065, .05, .33), rg, x, .035, 0) },   // и широкие ступеньки
    shapes: () => [[new CANNON.Box(new CANNON.Vec3(BH / 2, .035, .243)), [0, .035, 0]]] },
};
const trash = [];
const rnd = (a, b) => a + Math.random() * (b - a);
/* все обычные детали предмета — в один меш с цветами вершин (светящиеся и двусторонние детали остаются отдельными) */
function mergeParts(g) {
  g.updateMatrixWorld(true); const pos = [], nrm = [], col = [], parts = [];
  g.traverse(o => { if (!o.isMesh) return; const ms = Array.isArray(o.material) ? o.material : [o.material];
    if (ms.some(m => m.userData.glow || m.side !== THREE.FrontSide || !m.isMeshLambertMaterial)) return; parts.push(o) });
  if (parts.length < 2) return;
  const inv = g.matrixWorld.clone().invert();                 // координаты деталей — относительно самой группы
  for (const o of parts) { const geo = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(); geo.applyMatrix4(inv.clone().multiply(o.matrixWorld));
    const p = geo.attributes.position.array, n = geo.attributes.normal.array, ms = Array.isArray(o.material) ? o.material : [o.material];
    const grp = geo.groups.length ? geo.groups : [{ start: 0, count: p.length / 3, materialIndex: 0 }];
    for (const gr of grp) { const c = (Array.isArray(o.material) ? ms[gr.materialIndex || 0] : ms[0]).color;
      for (let v = gr.start; v < gr.start + gr.count; v++) { pos.push(p[v * 3], p[v * 3 + 1], p[v * 3 + 2]); nrm.push(n[v * 3], n[v * 3 + 1], n[v * 3 + 2]); col.push(c.r, c.g, c.b) } }
    o.parent.remove(o) }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.add(new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true })));
}
function makeTrash(type, x, y, z, ry, layer) {
  const g = new THREE.Group(); TYPES[type].build(g); mergeParts(g);
  g.position.set(x, y, z); g.rotation.y = ry; scene.add(g); g.updateMatrixWorld(true);
  const colors = new Map(); g.traverse(o => { if (o.isMesh) colors.set(o, o.material) });
  const t = { type, layer, g, colors, cells: [], active: false, body: null, held: false };
  g.traverse(o => { if (o.isMesh) { o.userData.t = t; o.castShadow = o.receiveShadow = true } });
  trash.push(t); return t;
}
function genTrash() {
  const cellOk = (i, j, z) => code(i, j, z) !== '.', pick = () => PIT0 + (Math.random() * (PIT1 - PIT0) | 0);
  const place = (type, z) => {
    let x, zz, ry;
    if (type === 'tire') { const a = PIT0 + (Math.random() * (PIT1 - PIT0 - 1) | 0), b = PIT0 + (Math.random() * (PIT1 - PIT0 - 1) | 0);   // 2×2 клетки
      if (![[0, 0], [1, 0], [0, 1], [1, 1]].every(([p, q]) => cellOk(a + p, b + q, z))) return false; x = a + 1; zz = b + 1; ry = rnd(0, 6.28) }
    else if (type === 'pipe' || type === 'skeleton') { const along = Math.random() < .5, a = PIT0 + (Math.random() * (PIT1 - PIT0 - 1) | 0), b = pick(), flip = Math.random() < .5 ? Math.PI : 0;
      if (along) { if (!cellOk(a, b, z) || !cellOk(a + 1, b, z)) return false; x = a + 1; zz = b + .5; ry = flip }
      else { if (!cellOk(b, a, z) || !cellOk(b, a + 1, z)) return false; x = b + .5; zz = a + 1; ry = Math.PI / 2 + flip } }
    else if (type === 'glass') { const [i, j] = ACT[Math.random() * ACT.length | 0]; if (!cellOk(i, j, z)) return false; x = i + .5; zz = j + .5; ry = (Math.random() * 4 | 0) * ZR + rnd(-.1, .1) }   // длинная бутылка — вдоль клетки
    else { const [i, j] = ACT[Math.random() * ACT.length | 0]; if (!cellOk(i, j, z)) return false; x = i + .5 + rnd(-.15, .15); zz = j + .5 + rnd(-.15, .15); ry = rnd(0, 6.28) }
    const t = makeTrash(type, x, -(z + 1) * BH + .01, zz, ry, z); t.g.visible = false;
    const cells = new Set();                                     // какие клетки ямы задевает предмет
    t.g.traverse(o => { if (!o.isMesh) return; const bb = new THREE.Box3().setFromObject(o, true);
      for (let a = 0; a < ACT.length; a++) { const [i, j] = ACT[a]; if (bb.max.x > i + .03 && bb.min.x < i + .97 && bb.max.z > j + .03 && bb.min.z < j + .97) cells.add(a) } });
    t.cells = [...cells]; return true;
  };
  for (let z = 1; z < DIG; z++) for (let n = 0; n < 2; n++) {    // на слой — до двух предметов; шанс каждого зависит от редкости участка (60 / 70 / 80%)
    if (Math.random() >= RAR[GAME.pl.r].trash) continue;
    const r = Math.random(); place(r < .26 ? 'coffee' : r < .46 ? 'tin' : r < .58 ? 'beer' : r < .68 ? 'glass' : r < .78 ? 'milk' : 'pipe', z);
  }
  for (let k = 0, z = 5 + (Math.random() * 9 | 0); k < 6 && !place('tire', z); k++, z++);        // огромная шина — одна на участок
  for (let k = 0, z = 9 + (Math.random() * 9 | 0); k < 6 && !place('skeleton', z); k++, z = Math.min(DIG - 1, z + 1));   // скелет — тоже один, поглубже
}
function setGrey(t, on) { if (!t.grey) t.grey = GREY.clone(); t.g.traverse(o => { if (o.isMesh) o.material = on ? t.grey : t.colors.get(o) }) }
let LOADING = false;                                           // восстановление из сохранения — без «Найдено!» и счётчиков
function updateTrash() {
  for (const t of trash) {
    if (t.active) continue;
    const dug = t.cells.filter(a => d[a] > t.layer).length;
    t.g.visible = dug > 0;
    if (dug > 0 && dug < t.cells.length) setGrey(t, true);
    if (dug === t.cells.length) { activate(t); if (t.pk != null && !GAME.u.includes(t.pk)) GAME.u.push(t.pk); if (LOADING) continue; GAME.st.f++;
      const c = t.g.position; burst(c.x, c.y + .2, c.z, ['#fff6c8', '#f2c14e', '#ffffff'], 18, .6); toast('Нашёл: ' + TYPES[t.type].name.toLowerCase() + '!', 2); haptic('medium') }
  }
  for (const t of trash) if (t.body) t.body.wakeUp();          // убрали блок — пусть всё, что на нём лежало, проверит опору
}
function activate(t) {
  t.active = true; t.g.visible = true; setGrey(t, false);
  // габариты предмета в его собственных осях; центр масс ставим ровно в середину предмета —
  // раньше он был у дна, и упавшая на бок банка сама вставала, как неваляшка
  t.g.updateMatrixWorld(true);
  const inv = t.g.matrixWorld.clone().invert(), bb = new THREE.Box3();
  t.g.traverse(o => { if (o.isMesh) { o.geometry.computeBoundingBox(); bb.union(o.geometry.boundingBox.clone().applyMatrix4(inv.clone().multiply(o.matrixWorld))) } });
  const c = bb.getCenter(new THREE.Vector3()); t.com = c; t.local = bb.translate(c.clone().negate());
  // умеренное торможение: предмет не «липнет» к стенкам и не застывает в наклоне
  const body = new CANNON.Body({ mass: TYPES[t.type].mass, collisionFilterGroup: G_TRASH, collisionFilterMask: G_BLOCK | G_CHAR | G_TRASH, linearDamping: .3, angularDamping: .45 });
  for (const [s, o, q] of TYPES[t.type].shapes()) body.addShape(s, new CANNON.Vec3(o[0] - c.x, o[1] - c.y, o[2] - c.z), q);
  const wc = c.clone().applyQuaternion(t.g.quaternion).add(t.g.position);
  body.position.set(wc.x, wc.y, wc.z);
  body.quaternion.set(t.g.quaternion.x, t.g.quaternion.y, t.g.quaternion.z, t.g.quaternion.w);
  body.sleepSpeedLimit = .12; body.sleepTimeLimit = .5;
  world.addBody(body); t.body = body;
  t.ghost = charHits(t); sepCheck(t);
}
