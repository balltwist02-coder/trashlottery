/* ---------- дом на сваях над участком: постоянная часть мира, одинаковая для всех участков ----------
   схема из редактора: первый пролёт с правой стенки на площадку в дальнем углу, второй — вдоль задней правой стенки к дальнему углу,
   площадка вдоль задней левой стенки, крутой пролёт (два блока на клетку) — на балкон у левой лицевой стороны.
   пол дома — на 9 блоков выше стенок; проём только над верхней клеткой крутого пролёта (нижняя — под полом комнаты), вырез в ближнем к нам углу.
   стена с дверью стоит на блок глубже края проёма: крутой пролёт выходит на балкон, снаружи дома */
const LV = n => n * BH, HF = LV(9);
const inR = (r, x, z, m = 0) => x >= r[0] - m && x <= r[1] + m && z >= r[2] - m && z <= r[3] + m;   // r = [x0, x1, z0, z1]
/* где можно стоять: [x0, x1, z0, z1, высота(x, z)] — по точке, куда шагает край Кирью */
const SURF = [
  [-1.75, 2, -1.75, 5.75, () => 0], [2, 3, -1.75, 2, () => 0], [3, 5, 1, 2, () => 0], [3, 5.75, -1.75, -.05, () => 0],   // верх декоративных стенок и расширения за ними (кроме клеток под низкими пролётами)
  [5, 5.75, 1, 2, (x, z) => LV(2 - z)],                       // пролёт 1: клетка (5,1), вверх к дальней стенке
  [5, 5.75, .25, 1, () => LV(1)],                             // площадка (5,0)
  [1, 5, .25, 1, x => LV(6 - x)],                             // пролёт 2: вдоль дальней правой стенки, вверх к углу
  [.25, 1, .25, 3, () => LV(5)],                              // площадка вдоль дальней левой стенки
  [.25, 1, 3, 5, (x, z) => LV(5 + 2 * (z - 3))],              // крутой пролёт: по два блока на клетку, до пола дома
];
const WALL_Z = 4, DOOR_X = [1.6, 2.4];
const ROOM = [[.25, 5.75, .25, 3.75]];                          // комната: клетки z 0..3 целиком
const BALC = [[1, 3.85, 4.1, 5.75], [.25, 3.85, 5, 5.75]], DOOR = [1.65, 2.35, 3.7, 4.15];   // балкон снаружи стены с дверью
const INSIDE = [...ROOM, ...BALC, DOOR];
for (const r of INSIDE) SURF.push([...r, () => HF]);
const STEP_UP = .45;
{ // земля для предметов там, где можно ходить снаружи ямы: верх декоративных стенок и расширение за ними, по краю мира — бортик.
  // раньше этих тел не было: поставленная туда вещь проваливалась сквозь картинку и бесконечно «летела сверху»
  for (const [x0, x1, z0, z1] of [[-1.75, PIT0 - .45, -1.75, 6], [PIT0 - .45, 3, -1.75, PIT0 - 1], [3, 6, -1.75, -.05]]) wall(x0, x1, -.5, 0, z0, z1);
  wall(-1.9, -1.75, 0, .45, -1.9, 6); wall(-1.9, 6, 0, .45, -1.9, -1.75); wall(-1.75, PIT0 - .45, 0, .45, 6, 6.15); wall(6, 6.15, 0, .45, -1.75, -.05);
}                                           // на сколько можно шагнуть вверх-вниз (крутой пролёт круче обычного)
function outerSurfaces(x, z) { const s = []; for (const r of SURF) if (inR(r, x, z)) s.push(r[4](x, z)); return s }
function groundAt(x, z, yRef) {                                // на какой высоте стоять в точке; null — там пусто или не залезть
  const s = outerSurfaces(x, z), a = cellAt(x, z); if (a >= 0) s.push(floorY(a)); if (!s.length) return null;
  let best = -Infinity; for (const h of s) if (h <= yRef + STEP_UP && h > best) best = h;
  if (best > -Infinity) return best;
  const lo = Math.min(...s); return lo - yRef < BH + .1 ? lo : null;
}
const underHouse = () => CH.y > .3 && CH.y < HF - .3 && cellAt(CH.x, CH.z) < 0;   // под полом дома
function outerHoldFree(x, y, z) {                              // держать предмет снаружи ямы: над лестницей, балконом, стенками, в доме
  const s = outerSurfaces(x, z); if (!s.length || kitHit(x, z, y)) return false;
  if (y > HF - .2 && !INSIDE.some(r => inR(r, x, z, .05))) return false;   // сквозь стены дома
  return s.some(h => y > h + .15);
}
/* доски тёмного дуба: широкие, с тёмными стыками и прожилками (своя текстура, не из Майнкрафта) */
function plankTex(seed, base, dark, light) {
  const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d');
  const rnd = (k => () => (k = (k * 16807) % 2147483647) / 2147483647)(seed);
  for (let b = 0; b < 4; b++) { const sh = (rnd() - .5) * 18, col = n => `rgb(${n[0] + sh | 0},${n[1] + sh * .7 | 0},${n[2] + sh * .45 | 0})`;
    x.fillStyle = col(base); x.fillRect(0, b * 8, 32, 8);
    for (let k = 0; k < 5; k++) { x.fillStyle = col(rnd() < .5 ? dark : light); x.fillRect(rnd() * 32 | 0, b * 8 + 1 + (rnd() * 6 | 0), 5 + (rnd() * 12 | 0), 1) }
    x.fillStyle = `rgb(${dark[0] - 14},${dark[1] - 10},${dark[2] - 6})`; x.fillRect(0, b * 8 + 7, 32, 1);
    const j = (b * 13 + 5) % 32; x.fillRect(j, b * 8, 1, 7) }
  const t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
}
const WOOD = new THREE.MeshLambertMaterial({ map: plankTex(7, [74, 50, 28], [52, 34, 18], [92, 64, 38]) });
const WOOD_D = new THREE.MeshLambertMaterial({ map: plankTex(19, [54, 36, 20], [38, 25, 13], [68, 46, 26]) });
const houseG = new THREE.Group(); scene.add(houseG);
const TX = .5;                                                 // текстура: 1 клетка = 2 повтора по 32 пикселя
function hbox(x0, x1, y0, y1, z0, z1, mat = WOOD, rot = null, body = true, parent = houseG) {   // доска/брус; текстура тянется по размеру
  const w = x1 - x0, h = y1 - y0, dd = z1 - z0, g = new THREE.BoxGeometry(w, h, dd), uv = g.attributes.uv;
  const fs = [[dd, h], [dd, h], [w, dd], [w, dd], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * fs[f][0] / TX, uv.getY(i) * fs[f][1] / TX) }
  const m = new THREE.Mesh(g, mat); m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); if (rot) m.rotation.set(...rot); parent.add(m);
  if (body) { const b = new CANNON.Body({ mass: 0, type: CANNON.Body.STATIC, collisionFilterGroup: G_BLOCK, collisionFilterMask: G_TRASH });
    b.addShape(new CANNON.Box(new CANNON.Vec3(w / 2, h / 2, dd / 2))); b.position.set(m.position.x, m.position.y, m.position.z);
    if (rot) b.quaternion.setFromEuler(...rot); world.addBody(b) }
  return m;
}
function wall(x0, x1, y0, y1, z0, z1) { const b = new CANNON.Body({ mass: 0, type: CANNON.Body.STATIC, collisionFilterGroup: G_BLOCK, collisionFilterMask: G_TRASH });   // невидимый бортик для предметов
  b.addShape(new CANNON.Box(new CANNON.Vec3((x1 - x0) / 2, (y1 - y0) / 2, (z1 - z0) / 2))); b.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); world.addBody(b) }
function rail(x0, x1, z0, z1, y, alongX) {                     // перила: брус сверху и балясины
  hbox(x0, x1, y + .86, y + .96, z0, z1, WOOD);
  if (alongX) for (let x = x0 + .12; x < x1 - .05; x += .38) hbox(x - .03, x + .03, y, y + .86, z0 + .01, z1 - .01, WOOD_D, null, false);
  else for (let z = z0 + .12; z < z1 - .05; z += .38) hbox(x0 + .01, x1 - .01, y, y + .86, z - .03, z + .03, WOOD_D, null, false);
  wall(x0, x1, y, y + .96, z0, z1);
}
/* пролёт ступенек-дощечек на двух тетивах вдоль x или z, под ними невидимый скат для предметов.
   a0..a1 — откуда докуда по оси (снизу вверх), w0..w1 — ширина поперёк, y0 — высота внизу, rise — подъём, n — ступенек */
function flight(axis, a0, a1, w0, w1, y0, rise, n) {
  const run = a1 - a0, len = Math.abs(run), Ls = Math.hypot(len, rise), ang = Math.atan2(rise, len), ca = (a0 + a1) / 2, cy = y0 + rise / 2, d = len / n;
  const B = (u0, u1, yy0, yy1, v0, v1, mat, rot, body) => axis === 'x' ? hbox(u0, u1, yy0, yy1, v0, v1, mat, rot, body) : hbox(v0, v1, yy0, yy1, u0, u1, mat, rot, body);
  const rot = axis === 'x' ? [0, 0, run > 0 ? ang : -ang] : [run > 0 ? -ang : ang, 0, 0];
  for (let k = 0; k < n; k++) { const t = (k + .5) / n, a = a0 + run * t; B(a - d / 2 - .015, a + d / 2 + .015, y0 + t * rise - .05, y0 + t * rise, w0, w1, WOOD, null, false) }
  for (const v of [w0 + .02, w1 - .02]) B(ca - Ls / 2, ca + Ls / 2, cy - .14, cy - .02, v - .025, v + .025, WOOD_D, rot, false);
  B(ca - Ls / 2, ca + Ls / 2, cy - .1, cy - .02, w0, w1, WOOD, rot, true).visible = false;
}
{ /* лестница и площадки (сваи и балки пока убраны — расставим потом) */
  flight('z', 2, 1, 5, 6, 0, LV(1), 4);                        // пролёт 1: клетка (5,1), снизу у ямы вверх к дальней стенке
  hbox(5, 6, LV(1) - .08, LV(1), 0, 1);                        // площадка (5,0)
  flight('x', 5, 1, 0, 1, LV(1), LV(4), 16);                   // пролёт 2: вдоль дальней правой стенки, с 1 до 5 блоков
  hbox(0, 1, LV(5) - .08, LV(5), 0, 3);                        // площадка вдоль дальней левой стенки
  flight('z', 3, 5, 0, 1, LV(5), LV(4), 16);                   // крутой пролёт: две клетки, по два блока на клетку — до пола дома
  wall(1, 1.05, LV(5), LV(5) + .5, 1, 3);                      // бортик площадки над пустотой: предметы не падают вниз
}
{ /* дом */
  const top = HF + 2.3, wt = .14;
  // пол: всё, кроме проёма над верхней клеткой крутого пролёта (x 0..1, z 4..5) и выреза в ближнем углу (x 4..6, z 4..6)
  hbox(0, 6, HF - .16, HF, 0, 4); hbox(1, 4, HF - .16, HF, 4, 5); hbox(0, 4, HF - .16, HF, 5, 6);
  // дальняя стена вдоль x (z = 0) с окном и полками
  const wz = (x0, x1, y0, y1) => hbox(x0, x1, y0, y1, 0, wt);
  wz(0, 2.6, HF, top); wz(2.6, 4, HF, HF + .9); wz(2.6, 4, HF + 1.7, top); wz(4, 6, HF, top);
  hbox(2.6, 4, HF + .86, HF + .94, .08, .2, WOOD_D, null, false); hbox(2.6, 4, HF + 1.66, HF + 1.74, .08, .2, WOOD_D, null, false); hbox(3.27, 3.33, HF + .9, HF + 1.7, .08, .2, WOOD_D, null, false);
  for (const y of [HF + .8, HF + 1.5]) hbox(4.3, 5.6, y - .05, y, wt, .5, WOOD_D);   // полки
  hbox(0, wt, HF - .16, top, 0, WALL_Z);                       // дальняя стена вдоль z (x = 0) — до стены с дверью
  // стена с дверью (z = 4) во всю ширину комнаты: за ней комната, перед ней балкон и выход с крутого пролёта
  const [d0, d1] = DOOR_X;
  hbox(wt, d0, HF, top, WALL_Z - wt, WALL_Z); const w0 = 2.85, w1 = 3.65;                                  // окно справа от двери, как в дальней стене
  hbox(d1, w0, HF, top, WALL_Z - wt, WALL_Z); hbox(w0, w1, HF, HF + .9, WALL_Z - wt, WALL_Z); hbox(w0, w1, HF + 1.7, top, WALL_Z - wt, WALL_Z); hbox(w1, 4, HF, top, WALL_Z - wt, WALL_Z);
  hbox(w0, w1, HF + .86, HF + .94, WALL_Z - wt - .06, WALL_Z + .06, WOOD_D, null, false); hbox(w0, w1, HF + 1.66, HF + 1.74, WALL_Z - wt - .06, WALL_Z + .06, WOOD_D, null, false);
  hbox((w0 + w1) / 2 - .03, (w0 + w1) / 2 + .03, HF + .9, HF + 1.7, WALL_Z - wt - .02, WALL_Z + .02, WOOD_D, null, false);
  for (const x of [w0 - .06, w1]) hbox(x, x + .06, HF + .86, HF + 1.74, WALL_Z - wt - .03, WALL_Z + .03, WOOD_D, null, false); hbox(d0, d1, HF + 2, top, WALL_Z - wt, WALL_Z);
  for (const x of [d0 - .06, d1]) hbox(x, x + .06, HF, HF + 2.02, WALL_Z - wt - .03, WALL_Z + .03, WOOD_D, null, false);   // коробка
  hbox(d0 - .06, d1 + .06, HF + 1.96, HF + 2.06, WALL_Z - wt - .03, WALL_Z + .03, WOOD_D, null, false);
  for (const [x, z] of [[0, 0], [6 - wt, 0], [0, WALL_Z - wt], [4 - wt, WALL_Z - wt]]) hbox(x - .02, x + .16, HF - .16, top + .05, z - .02, z + .16, WOOD_D, null, false);   // угловые столбы стен
  // перила — только у балкона; по открытым краям комнаты — невидимые бортики, чтобы предметы не падали вниз
  rail(0, 4, 5.92, 6, HF, true); rail(3.92, 4, WALL_Z, 5.92, HF, false); rail(0, .08, 5, 5.92, HF, false);
  for (const [x0, x1, z0, z1] of [[5.95, 6, wt, 4], [4, 6, 3.95, 4]]) wall(x0, x1, HF, HF + .96, z0, z1);
}
/* ---------- тени на досках ----------
   дом сам теней не отбрасывает и солнечных теней не принимает (иначе он затенял бы весь участок).
   Кирью и предметы, пока они на лестнице, площадке или в доме, отбрасывают тень только на доски: их отдельно рисуем
   глубиной с солнца в карту, и материал досок по ней темнеет. На землю внизу такая тень не попадает.
   Вторая карта — глубина ближайшей доски дома, которая лежит уже ниже предмета (доски выше предмета отбрасываются):
   если между предметом и доской есть другая доска (полка, площадка), тень сквозь неё не проходит.
   Для этой карты все доски дома слиты в один меш — один вызов отрисовки за кадр */
const KL = 5, KH = 6, RTO = { magFilter: THREE.NearestFilter, minFilter: THREE.NearestFilter };
const KS = { rt: new THREE.WebGLRenderTarget(1024, 1024, RTO), hrt: new THREE.WebGLRenderTarget(1024, 1024, RTO),
  cam: new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 2), mat: new THREE.Matrix4(), on: new Set() };
{ // камера с солнца стоит неподвижно и охватывает весь дом с лестницами
  const C = new THREE.Vector3(3, (HF + 2.4) / 2, 3), c = KS.cam; c.position.copy(C).addScaledVector(SUN_DIR, 40); c.lookAt(C); c.updateMatrixWorld();
  const v = new THREE.Vector3(), mn = new THREE.Vector3(1e9, 1e9, 1e9), mx = new THREE.Vector3(-1e9, -1e9, -1e9);
  for (const x of [0, 6]) for (const y of [-.2, HF + 2.6]) for (const z of [0, 6]) { v.set(x, y, z).applyMatrix4(c.matrixWorldInverse); mn.min(v); mx.max(v) }
  c.left = mn.x - .3; c.right = mx.x + .3; c.bottom = mn.y - .3; c.top = mx.y + .3; c.near = -mx.z - .5; c.far = -mn.z + .5; c.updateProjectionMatrix();
  KS.mat.multiplyMatrices(c.projectionMatrix, c.matrixWorldInverse);
}
const KS_DEPTH = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
const KS_U = { kMap: { value: KS.rt.texture }, hMap: { value: KS.hrt.texture }, kMat: { value: KS.mat }, kOn: { value: 0 },
  kDark: { value: (AMB + FILL * FILL_DIR.y) / (AMB + SUN * SUN_DIR.y + FILL * FILL_DIR.y) } };   // насколько темнее в тени, как у солнечной
for (const m of [WOOD, WOOD_D]) m.onBeforeCompile = sh => {
  Object.assign(sh.uniforms, KS_U);
  sh.vertexShader = 'uniform mat4 kMat;\nvarying vec4 vKS;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\nvKS = kMat * modelMatrix * vec4(transformed, 1.0);');
  sh.fragmentShader = 'uniform sampler2D kMap;\nuniform sampler2D hMap;\nuniform float kOn;\nuniform float kDark;\nvarying vec4 vKS;\n' + sh.fragmentShader.replace('#include <opaque_fragment>', `#include <opaque_fragment>
    if (kOn > .5) { vec3 kc = vKS.xyz / vKS.w * .5 + .5;
      if (kc.x > 0. && kc.x < 1. && kc.y > 0. && kc.y < 1. && kc.z < 1.) { float kd = unpackRGBAToDepth(texture2D(kMap, kc.xy));
        if (kc.z - .003 > kd && unpackRGBAToDepth(texture2D(hMap, kc.xy)) > kc.z - .003) gl_FragColor.rgb *= kDark; } }`);
};
{ // доски дома одним мешем: видна только камере с солнца, рисует глубину досок, которые дальше ближайшего предмета
  houseG.updateMatrixWorld(true); const pos = [];
  houseG.traverse(o => { if (!o.isMesh || !o.visible) return; const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(); g.applyMatrix4(o.matrixWorld); pos.push(...g.attributes.position.array) });
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const mat = new THREE.ShaderMaterial({ uniforms: { kMap: KS_U.kMap },
    vertexShader: 'void main() { gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0); }',
    fragmentShader: `#include <packing>
      uniform sampler2D kMap;
      void main() { float kd = unpackRGBAToDepth(texture2D(kMap, gl_FragCoord.xy / 1024.)); if (gl_FragCoord.z <= kd + .002) discard; gl_FragColor = packDepthToRGBA(gl_FragCoord.z); }` });
  const hm = new THREE.Mesh(geo, mat); hm.frustumCulled = false; hm.layers.set(KH); scene.add(hm);
}
function ksMark(g, on) { g.traverse(o => { if (o.isMesh) { o.castShadow = !on; if (on) o.layers.enable(KL); else o.layers.disable(KL) } }) }   // обычная тень или тень на доски
const HOUSE = { under: false, on: false };
const _cc = new THREE.Color();

/* ---------- сохранение вещей в доме ----------
   запоминаем только то, что лежит в доме (комната, дверной проём, балкон); всё остальное при перезапуске обнуляется как обычно.
   в Телеграме — облачное хранилище бота (своё у каждого игрока, видно с любого устройства), в браузере — localStorage.
   формат с номером версии: {v:1, n: число кусков}, куски house_0..: «тип,x,y,z,qx,qy,qz,qw;…» (у значения предел 4096 символов) */
const SAVE_V = 1, SAVE = { loaded: false, sig: '', t: 0, busy: false };
const cloud = tg && tg.CloudStorage && tg.isVersionAtLeast && tg.isVersionAtLeast('6.9') ? tg.CloudStorage : null;
const stGet = (keys, cb) => { if (cloud) { try { cloud.getItems(keys, (e, v) => cb(e ? null : v || {})) } catch (_) { cb(null) } return }
  const v = {}; try { for (const k of keys) v[k] = localStorage.getItem('tl_' + k) || '' } catch (_) { return cb(null) } cb(v) };
const stSet = (key, val, cb) => { if (cloud) { try { cloud.setItem(key, val, e => cb && cb(!e)) } catch (_) { cb && cb(false) } return }
  try { localStorage.setItem('tl_' + key, val); cb && cb(true) } catch (_) { cb && cb(false) } };
const inHouse = p => p.y > HF - .4 && p.y < HF + 2.4 && INSIDE.some(r => inR(r, p.x, p.z, .1));
function houseItems() { return trash.filter(t => t.active && t.body && !t.held && TYPES[t.type] && inHouse(t.body.position)) }
const r3 = v => Math.round(v * 1000) / 1000;
function saveHouse(force) {
  if (!SAVE.loaded || SAVE.busy) return;
  const items = houseItems(); if (!force && items.some(t => t.body.sleepState !== CANNON.Body.SLEEPING)) return;   // ждём, пока всё уляжется
  const recs = items.map(t => { const p = t.g.position, q = t.g.quaternion; return [t.type, r3(p.x), r3(p.y), r3(p.z), r3(q.x), r3(q.y), r3(q.z), r3(q.w)].join(',') });
  const sig = recs.map(r => r.split(',').slice(0, 4).map((v, i) => i ? Math.round(+v * 20) : v).join()).sort().join(';');   // сдвиг меньше 5 см не считаем
  if (sig === SAVE.sig) return;
  const parts = []; let cur = '';
  for (const r of recs) { if (cur.length + r.length + 1 > 4000) { parts.push(cur); cur = '' } cur += (cur ? ';' : '') + r }
  if (cur) parts.push(cur);
  SAVE.busy = true; let left = parts.length + 1, ok = true;
  const done = good => { ok = ok && good; if (--left) return; SAVE.busy = false; if (ok) SAVE.sig = sig };
  parts.forEach((p, i) => stSet('house_' + i, p, done));
  stSet('house', JSON.stringify({ v: SAVE_V, n: parts.length }), done);
}
function loadHouse() {
  stGet(['house'], v => {
    let head = null; try { head = v && v.house ? JSON.parse(v.house) : null } catch (_) { }
    if (!head || head.v !== SAVE_V || !head.n) { SAVE.loaded = true; return }   // сохранения нет (или чужой версии) — начинаем с пустого дома
    stGet([...Array(head.n).keys()].map(i => 'house_' + i), w => {
      if (w) for (let i = 0; i < head.n; i++) for (const r of (w['house_' + i] || '').split(';')) {
        const [type, ...n] = r.split(','), a = n.map(Number); if (!TYPES[type] || a.length !== 7 || a.some(isNaN)) continue;
        const t = makeTrash(type, a[0], a[1], a[2], 0, -1); t.g.quaternion.set(a[3], a[4], a[5], a[6]).normalize(); t.g.updateMatrixWorld(true); activate(t);
      }
      SAVE.loaded = true; SAVE.sig = ''; SAVE.t = performance.now();
    });
  });
}
setTimeout(loadHouse, 0);
document.addEventListener('visibilitychange', () => { if (document.hidden) saveHouse(true) });   // свернули или закрыли — сохраняем сразу
function saveTick() { const now = performance.now(); if (now - SAVE.t < 2000) return; SAVE.t = now; saveHouse(false) }
function stepHouse() {
  HOUSE.under = underHouse(); saveTick();
  const h = groundAt(CH.x, CH.z, CH.y), on = CH.state === 'walk' && h !== null && h > .05;
  if (on !== HOUSE.on) { HOUSE.on = on; ksMark(chG, on) }
  // предметы над досками (лежат в доме, на площадке, в руках у Кирью наверху)
  const now = new Set();
  for (const t of trash) { if (!t.g || !t.body || !t.active && !t.held) continue; const p = t.body.position, gh = groundAt(p.x, p.z, p.y);
    if (t === CH.held ? on : (p.y > .1 && gh !== null && gh > .05)) now.add(t) }
  for (const t of KS.on) if (!now.has(t)) ksMark(t.g, false);
  for (const t of now) if (!KS.on.has(t)) ksMark(t.g, true);
  KS.on = now;
  KS_U.kOn.value = on || now.size ? 1 : 0; if (!KS_U.kOn.value) return;
  const prt = renderer.getRenderTarget(), pa = renderer.getClearAlpha(); renderer.getClearColor(_cc);
  const om = scene.overrideMaterial, sm = renderer.shadowMap.needsUpdate;
  scene.overrideMaterial = KS_DEPTH; renderer.shadowMap.needsUpdate = false;
  renderer.setClearColor(0xffffff, 1);
  KS.cam.layers.set(KL); renderer.setRenderTarget(KS.rt); renderer.clear(); renderer.render(scene, KS.cam);   // Кирью и предметы
  scene.overrideMaterial = null;
  KS.cam.layers.set(KH); renderer.setRenderTarget(KS.hrt); renderer.clear(); renderer.render(scene, KS.cam);   // доски под ними
  renderer.setRenderTarget(prt); renderer.setClearColor(_cc, pa); scene.overrideMaterial = om; renderer.shadowMap.needsUpdate = sm;
}
