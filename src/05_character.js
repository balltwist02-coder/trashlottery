/* ---------- контур мусора: 1 пиксель тёмной обводки, чтобы предметы не сливались в куче ----------
   отдельный проход рисует каждый предмет своим «номером» в скрытую картинку, потом граница номеров
   закрашивается тёмным — у ближнего к камере предмета, поэтому в куче видно, кто сверху */
const idRT = new THREE.WebGLRenderTarget(1, 1, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, generateMipmaps: false, depthTexture: new THREE.DepthTexture(1, 1) });
const ID_BLOCK = new THREE.MeshBasicMaterial({ color: 0x000000 });
const DECO_ID = new THREE.MeshBasicMaterial({ color: new THREE.Color(253 / 255, 0, 0) }), MERCH_ID = new THREE.MeshBasicMaterial({ color: new THREE.Color(254 / 255, 0, 0) }), KZ_ID = new THREE.MeshBasicMaterial({ color: new THREE.Color(251 / 255, 0, 0) });
const olMat = new THREE.ShaderMaterial({
  uniforms: { tId: { value: idRT.texture }, tD: { value: idRT.depthTexture }, px: { value: new THREE.Vector2(1, 1) } },
  transparent: true, depthTest: false, depthWrite: false,
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
  fragmentShader: `uniform sampler2D tId, tD; uniform vec2 px; varying vec2 vUv;
    float idAt(vec2 u){ return floor(texture2D(tId, u).r * 255. + .5); }
    void main(){
      float me = idAt(vUv); if (me < .5) discard;
      float dm = texture2D(tD, vUv).r; bool e = false;
      for (int k = 0; k < 4; k++) {
        vec2 o = k == 0 ? vec2(px.x, 0.) : k == 1 ? vec2(-px.x, 0.) : k == 2 ? vec2(0., px.y) : vec2(0., -px.y);
        float n = idAt(vUv + o);
        if (n != me && (n < .5 || texture2D(tD, vUv + o).r > dm + 1e-5)) e = true;
      }
      if (!e) discard;
      gl_FragColor = vec4(.07, .05, .09, 1.);
    }` });
const olScene = new THREE.Scene(); { const q = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), olMat); q.frustumCulled = false; olScene.add(q) }
function drawOutlines() {
  const saved = [];
  let lo = 1e9, hi = 0; for (const v of d) { lo = Math.min(lo, v); hi = Math.max(hi, v) }
  const vis = [];
  for (const c of chunks) if (c) { saved.push([c.mesh, c.mesh.material]); c.mesh.material = ID_BLOCK; const z = c.mesh.userData.chunk; if (c.mesh.visible && (z < lo - 1 || z > hi + 1) && z > SHOP.z1 + 1) { c.mesh.visible = false; vis.push(c.mesh) } }
  shopG.traverse(o => { if (o.isMesh) { saved.push([o, o.material]); o.material = o.userData.merchant ? MERCH_ID : DECO_ID } });
  houseG.traverse(o => { if (o.isMesh) { saved.push([o, o.material]); o.material = DECO_ID } });
  KIT.g.traverse(o => { if (o.isMesh) { saved.push([o, o.material]); o.material = DECO_ID } });
  KZ.g.traverse(o => { if (o.isMesh) { saved.push([o, o.material]); o.material = o.userData.kz ? KZ_ID : DECO_ID } });   // Кудзуя-сан обведён, как Кирью
  saved.push([EXT.mesh, EXT.mesh.material]); EXT.mesh.material = ID_BLOCK;
  saved.push([BAG.flat, BAG.flat.material]); BAG.flat.material = BAG.idMat;
  for (const o of BAG.hl) { saved.push([o, o.material]); o.material = DECO_ID }
  BAG.hroll.traverse(o => { if (o.isMesh) { saved.push([o, o.material]); o.material = DECO_ID } });
  BAG.bun.traverse(o => { if (o.isMesh) { saved.push([o, o.material]); o.material = DECO_ID } });
  [...new Set([...BAG.items.map(it => it.t), ...(BAG.drag ? [BAG.drag.t] : [])])].forEach((t, k) => { if (!t.idMat) t.idMat = new THREE.MeshBasicMaterial(); t.idMat.color.setRGB((235 + k) / 255, 0, 0);   // вещи в мешке и в пальцах — свои номера
    t.g.traverse(o => { if (o.isMesh) { saved.push([o, o.material]); o.material = t.idMat } }) });
  const uv = under.visible; under.visible = false;
  trash.forEach((t, k) => { if (!t.idMat) t.idMat = new THREE.MeshBasicMaterial();
    t.idMat.color.setRGB((k % 250 + 1) / 255, 0, 0);
    t.g.traverse(o => { if (o.isMesh) { saved.push([o, o.material]); o.material = t.idMat } }) });
  chG.traverse(o => { if (o.isMesh) { saved.push([o, o.material]); o.material = CH_ID } });
  const shV = shadow.visible; shadow.visible = false; for (const p of parts) p.m.visible = false;
  const dm = [DECO.moss, DECO.lich, WORM.mesh]; for (const m of dm) m.visible = false;   // мох, лишайник и черви обводки не получают
  renderer.setRenderTarget(idRT); renderer.clear(); renderer.render(scene, VCAM); renderer.setRenderTarget(null);
  for (let i = saved.length - 1; i >= 0; i--) saved[i][0].material = saved[i][1]; for (const m of vis) m.visible = true; under.visible = uv; shadow.visible = shV; for (const p of parts) p.m.visible = true; for (const m of dm) m.visible = true;
  renderer.autoClear = false; renderer.render(olScene, cam); renderer.autoClear = true;
}

/* ---------- персонаж (заглушка: Кирью Нагасаки в рабочей форме и каске) ----------
   ходит джойстиком; у обрыва останавливается и смотрит вниз, у стенки — смотрит вверх;
   если продолжать держать джойстик в ту сторону — прыгает вниз или залезает */
const CH = { held: null, x: PC + .5, z: PC + .5, y: 0, face: new THREE.Vector3(0, 0, 1), state: 'walk', t: 0, vy: 0, anim: null, walkT: 0, moving: false, land: 0, swing: 0, yaw: 0 };
const R = .22, SPEED = 1.5;
const G_UP = new THREE.Vector3(-1, 0, -1).normalize();          // «вверх по экрану» на полу
const cellAt = (x, z) => ACT.findIndex(([i, j]) => x >= i && x < i + 1 && z >= j && z < j + 1);
const charCell = () => cellAt(CH.x, CH.z);
const standCell = () => { const a = cellAt(CH.x, CH.z); return a >= 0 && Math.abs(CH.y - floorY(a)) < .3 ? a : -1 };   // клетка ямы, на полу которой стоим (а не высоко над ней — на лестнице дома, в доме)
CH.y = floorY(cellAt(CH.x, CH.z));
function reach(a) {                                            // можно ли копать блок клетки a, стоя там, где стоим
  const c = standCell(); if (c < 0) return false; if (a === c) return true;
  if (floorY(a) <= floorY(c) + .01) return false;              // соседняя клетка должна быть выше — это стенка перед нами
  const [i, j] = ACT[a], dx = Math.max(i - CH.x, 0, CH.x - (i + 1)), dz = Math.max(j - CH.z, 0, CH.z - (j + 1));
  return Math.hypot(dx, dz) < R + .5;                          // до стенки — до половины блока
}
const chG = new THREE.Group(), chBody = new THREE.Group(); chG.add(chBody); scene.add(chG);
const CH_ID = new THREE.MeshBasicMaterial({ color: new THREE.Color(252 / 255, 0, 0) });
const KIRYU = createKiryu(THREE);   // модель и позы — в kiryu.js
{ chBody.add(KIRYU.root); KIRYU.root.traverse(o => { if (o.isMesh && o.material.color && o.material.color.getHex() === 0xf4f9e8) o.material.userData.glow = true });
  chG.traverse(o => { if (o.isMesh) o.castShadow = o.receiveShadow = true }) }
const chP = new CANNON.Body({ mass: 0, type: CANNON.Body.KINEMATIC, shape: new CANNON.Cylinder(.22, .22, 1.45, 8), collisionFilterGroup: G_CHAR, collisionFilterMask: G_TRASH });
world.addBody(chP);


function digCell(a) {
  const [i, j] = ACT[a], z = d[a], b = blocks.get(i + ',' + j + ',' + z), k = b ? b.k : 'З';
  removeBlock(i, j, z); burst(i + .5, -z * BH, j + .5, CRUMB[k] || CRUMB[k[0]] || CRUMB['З'], 16);
  d[a]++; ensureBodies(); settle(); updateTrash(); haptic('light'); CH.swing = .3;
  if (z >= 1) SMS.unlock('stranger');                         // начали второй слой — СМС с неизвестного номера
  if (!SHOP.revealed && ACT.some(([ci, cj], q) => cj === PIT0 && ci >= SHOP.i0 && ci < SHOP.i1 && d[q] > SHOP.z0)) revealShop();
}
function busy() { shakeTool(tool); toast('Руки заняты — сначала поставь ' + (CH.held.type === 'lantern' ? 'фонарь' : 'предмет')) }
function act() {
  if (!tool) { haptic('warn'); return }
  if (CH.state === 'bag') return;
  if (CH.state === 'ladder') { ladPlaceTap(null); return }
  if (CH.state === 'jump' || CH.state === 'fall') return;
  if (CH.held && CH.held.type === 'ladder') { const L = ladderAhead(); if (L) { placeLadder(L.s, L.k, L.z); return } if (tool === 'glove' && rackNear()) { useRack(); return } }
  if (CH.held && CH.held.type === 'tin') { const s = spotAhead(); if (s && s.state) { useSpot(s); return } }   // пустую банку — к разрыхлённым червям
  if (tool === 'glove') {                                      // перчатка: поднять предмет перед собой или поставить тот, что в руках
    if (CH.held) { if (CH.held.type !== 'ladder' && nearTable(.6)) putOnTable(); else dropItem(); return }
    const t = nearItem(t => !TYPES[t.type].heavy) || nearItem(t => true), lt = !t && ladderInReach();
    if (t) grabItem(t); else if (rackNear()) useRack(); else if (lt) takeLadder(lt); else shakeTool('glove'); return }
  if (CH.held) { busy(); return }                              // руки заняты: ни копать, ни ломать
  if (tool === 'bar') {                                        // лом: ближайший ломаемый предмет перед персонажем
    const t = nearItem(t => TYPES[t.type].breaks); if (t) { CH.swing = .3; breakTrash(t) } else shakeTool('bar'); return }
  if (tool === 'trowel') { const s = spotAhead(); if (s && !s.state) loosen(s); else { shakeTool('trowel'); toast(s ? 'Уже разрыхлено — подставь консервную банку' : 'Лопатка рыхлит землю там, где на стенке черви') } return }
  const a = standCell(), nb = a < 0 ? -1 : cellAt(CH.x + CH.face.x * (R + .48), CH.z + CH.face.z * (R + .48));
  if (nb >= 0 && nb !== a && floorY(nb) > floorY(a) + .01) { if (diggable(nb, d[nb])) digCell(nb); else shakeTool('pick'); return }   // стенка перед нами
  if (a >= 0 && diggable(a, d[a])) { digCell(a); return }      // блок под ногами — после него падаем вниз
  shakeTool('pick');
}
function itemPt(t) {                                           // ближняя к персонажу точка предмета: у шины и скелета край намного ближе середины
  const b = t.body, L = t.local, v = b.pointToLocalFrame(new CANNON.Vec3(CH.x, CH.y + .4, CH.z));
  v.set(Math.min(L.max.x, Math.max(L.min.x, v.x)), Math.min(L.max.y, Math.max(L.min.y, v.y)), Math.min(L.max.z, Math.max(L.min.z, v.z)));
  return b.pointToWorldFrame(v);
}
function charHits(t) {                                         // предмет задевает Кирью?
  const p = itemPt(t); return Math.hypot(p.x - CH.x, p.z - CH.z) < .25 && p.y > CH.y - .05 && p.y < CH.y + 1.45;
}
function nearItem(ok) {                                        // ближайший найденный предмет перед персонажем, до которого достаём
  let best = null, bd = .95;
  for (const t of trash) { if (!t.active || !t.body || t.held || !ok(t)) continue; const p = itemPt(t), dx = p.x - CH.x, dz = p.z - CH.z, dist = Math.hypot(dx, dz);
    if (Math.abs(p.y - CH.y) < .9 && dist < bd && dx * CH.face.x + dz * CH.face.z > -.1) { bd = dist; best = t } }
  return best;
}
/* перчатка: предмет поднимается к груди и едет вместе с персонажем; повторное действие ставит его перед собой */
function grabItem(t) {
  const hv = TYPES[t.type].heavy; if (hv) { shakeTool('glove'); haptic('warn'); toast(hv === true ? 'Слишком тяжёлая — даже не сдвинуть' : hv); return }
  const b = t.body; t.held = true; CH.held = t; t.hinted = false; CH.grip = null; CH.up = 0; CH.upW = 0; CH.upAsk = 0;
  { const L = t.local, a = (L.max.z - L.min.z) > (L.max.x - L.min.x) * 1.15 ? ZR : 0, b = a ? 0 : ZR, f = r => holdFreeAt(t, CH.x, CH.y, CH.z, CH.yaw, r) || upFreeAt(t, CH.x, CH.y, CH.z, CH.yaw, r);
    t.carryRot = f(a) || !f(b) ? a : b }   // длинную сторону — поперёк себя; поперёк здесь не помещается — вдоль. Дальше так и держит
  b.type = CANNON.Body.KINEMATIC; b.collisionResponse = false; b.velocity.set(0, 0, 0); b.angularVelocity.set(0, 0, 0); b.updateMassProperties();   // в руках никого не расталкивает
  CH.swing = 0; haptic('medium'); toast('Взял: ' + TYPES[t.type].name.toLowerCase(), 0);
}
for (const k in TYPES) if (!CATS[TYPES[k].cat]) console.warn('У вещи без категории:', k);   // новая вещь — не забудь cat
const PRICE = { tin: 1, coffee: 2, beer: 1, glass: 1, milk: 1, pipeHalf: 4, wormTin: 5, tireQuarter: 1, skeleton: 1, skull: 1, skelChest: 1, skelLegs: 1 };   // сколько монет даёт торговец за кусочек мусора
function heldFree(x, y, z, sell) {                             // можно ли держать предмет в этой точке
  const inPit = x > PIT0 + .12 && x < PIT1 - .12 && z > PIT0 + .12 && z < PIT1 - .12;
  const inWin = sell && SHOP.revealed && x > WIN.x0 + .08 && x < WIN.x1 - .08 && z > BASKET.z - BASKET.r + .1 && z <= PIT0 + .06 && y > SHOP.floor + .12 && y < SHOP.ceil - .12;
  return ((inPit || inWin) && !solidAt(Math.floor(x), Math.floor(z), Math.floor(-y / BH))) || outerHoldFree(x, y, z);
}
function poseFree(t, x, y, z, yaw, sell) {                    // весь предмет (его углы и середины сторон) не в стене и не за краем
  const c = Math.cos(yaw), s = Math.sin(yaw), L = t.local, m = .06;
  for (const lx of [L.min.x + m, 0, L.max.x - m]) for (const lz of [L.min.z + m, 0, L.max.z - m])
    if (!heldFree(x + lx * c + lz * s, y, z - lx * s + lz * c, sell)) return false;
  return true;
}
