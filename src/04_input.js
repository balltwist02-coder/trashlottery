/* ---------- ввод ---------- */
const ray = new THREE.Raycaster();
const ndc = e => { const r = cv.getBoundingClientRect(); return new THREE.Vector2((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1) };
function pick(e) {
  ray.setFromCamera(ndc(e), LC.k > .5 && LC.init ? LC.cam : cam);   // на лестнице смотрим через киношную камеру — и тапаем через неё
  const objs = [...chunks.filter(c => c && c.mesh.visible).map(c => c.mesh), ...trash.filter(t => t.g.visible).map(t => t.g), ...(shopG.visible ? [shopG] : []), KIT.g, KZ.g];
  const h = ray.intersectObjects(objs, true)[0]; if (!h) return null;
  if (h.object.userData.chunk === undefined) return h;
  const p = h.point.clone().addScaledVector(h.face.normal, -.02), i = Math.floor(p.x), j = Math.floor(p.z), z = Math.floor(-p.y / BH), b = blocks.get(i + ',' + j + ',' + z);
  return b ? { point: h.point, object: { userData: { kind: 'b', i, j, z, k: b.k } } } : null;
}
const grabs = new Map();   // перетаскивание пальцем «за шкирку» пока выключено — вернём как особую механику
/* невидимый джойстик: коснулся где угодно и повёл палец — персонаж идёт в ту сторону; короткий тап — применить инструмент */
const joy = { x: 0, y: 0, id: null, ox: 0, oy: 0, t0: 0, moved: false }, keys = new Set();
const JOY_R = 42;                                              // на сколько пикселей отвести палец для полной скорости
cv.addEventListener('pointerdown', e => { if (joy.id !== null) return; try { cv.setPointerCapture(e.pointerId) } catch (_) { }
  Object.assign(joy, { id: e.pointerId, ox: e.clientX, oy: e.clientY, t0: performance.now(), moved: false, x: 0, y: 0 }) });
cv.addEventListener('pointermove', e => { if (joy.id !== e.pointerId) return;
  let x = e.clientX - joy.ox, y = e.clientY - joy.oy; const l = Math.hypot(x, y);
  if (!joy.moved && l < 10) return; joy.moved = true;
  if (l > JOY_R) { joy.ox = e.clientX - x / l * JOY_R; joy.oy = e.clientY - y / l * JOY_R; x = x / l * JOY_R; y = y / l * JOY_R }   // центр «едет» за пальцем
  joy.x = x / JOY_R; joy.y = y / JOY_R });
const joyEnd = (e, cancel) => { if (joy.id !== e.pointerId) return;
  const tapLike = !joy.moved && performance.now() - joy.t0 < 400; joy.id = null; joy.x = joy.y = 0;
  if (tapLike && !cancel) tap(e) };
cv.addEventListener('pointerup', e => joyEnd(e, false));
cv.addEventListener('pointercancel', e => joyEnd(e, true));
addEventListener('keydown', e => { keys.add(e.code); if (e.code === 'Space' || e.code === 'KeyE') { e.preventDefault(); if (!e.repeat) act() } if (/Arrow|Key[WASD]/.test(e.code)) e.preventDefault();
  const n = '123456789'.indexOf(e.key); if (n >= 0 && TOOLS[n]) setTool(TOOLS[n]) });
addEventListener('keyup', e => keys.delete(e.code));
const faceTo = (x, z) => { const v = new THREE.Vector3(x - CH.x, 0, z - CH.z); if (v.lengthSq() > 1e-4) CH.face.copy(v.normalize()) };
function tap(e) {
  if (CH.state === 'ladder') { ladPlaceTap(pick(e)); return }
  const h = pick(e);
  if (h && h.object.userData.rack) { useRack(); return }
  if (h && h.object.userData.kz) { kzTalk(); return }
  if (h && h.object.userData.table) { tableTap(); return }
  if (h && h.object.userData.t && h.object.userData.t.mounted) { ladTap(h.object.userData.t); return }
  if (h && h.object.userData.merchant) { if (nearShop()) openShop(); else toast('Надо подойти к лавке поближе', 0); return }
  if (h && h.object.userData.deco && Math.hypot(h.point.x - BASKET.x, h.point.z - BASKET.z) < BASKET.r + .12) { if (CH.held && tool === 'glove') act(); else toast(CH.held ? 'Возьми перчатку и отпусти предмет над корзиной' : 'Корзина торговца: неси мусор в перчатке'); return }
  if (CH.held && CH.held.type === 'ladder' && h) {               // с лестницей в руках — тап по грани стенки вешает её туда
    if (h.object.userData.deco) { toast(LAD_WHY.shop, 0); return }
    const L = ladFromHit(h); if (L) { const why = ladOk(L.s, L.k, L.z);
      if (!why) placeLadder(L.s, L.k, L.z); else toast(why === 'far' ? 'Не дотянуться — залезь по лестнице с этой лестницей в руках' : LAD_WHY[why], 0); return }
  }
  const t = h && h.object.userData.t;
  if (t && t.active && !t.held) {                              // тап по предмету рядом — применить инструмент именно к нему
    const p = itemPt(t);
    if (Math.hypot(p.x - CH.x, p.z - CH.z) < 1 && Math.abs(p.y - CH.y) < 1) {
      if (tool === 'glove' && !CH.held) { faceTo(p.x, p.z); grabItem(t); return }
      if (tool === 'bar') { if (CH.held) { busy(); return } if (!TYPES[t.type].breaks) { shakeTool('bar'); return } faceTo(p.x, p.z); CH.swing = .3; breakTrash(t); return }
    }
  }
  const sp = !t && spotHit(h); if (sp && spotOpen(sp)) { useSpot(sp); return }   // тап по гнезду червей
  if (h && !t && tool === 'pick') {                            // тап по блоку, до которого достаём, — копаем его
    if (CH.held) { busy(); return }
    const { i, j, z } = h.object.userData, a = isAct(i, j);
    if (a >= 0 && diggable(a, z) && reach(a)) {
      if (a !== standCell()) { const [ci, cj] = ACT[a]; const v = new THREE.Vector3(ci + .5 - CH.x, 0, cj + .5 - CH.z); v.x = Math.abs(v.x) > Math.abs(v.z) ? Math.sign(v.x) : 0; v.z = v.x ? 0 : Math.sign(v.z); CH.face.copy(v) }
      digHit(a); return }
  }
  act();                                                       // иначе — инструмент в ту сторону, куда смотрит персонаж
}
function breakTrash(t) {
  const b = t.body, T0 = TYPES[t.type], q = b.quaternion, c = t.com;
  removeTrash(t);
  for (const [kind, o, ry = 0, push = [Math.sign(o[0]), 0, 0]] of T0.pieces) {   // части встают туда, где лежали в целом предмете, и разлетаются с лёгким толчком
    const p = b.pointToWorldFrame(new CANNON.Vec3(o[0] - c.x, o[1] - c.y, o[2] - c.z)), pq = q.mult(new CANNON.Quaternion().setFromEuler(0, ry, 0));
    const h = makeTrash(kind, p.x, p.y, p.z, 0, -1); h.g.quaternion.set(pq.x, pq.y, pq.z, pq.w); h.g.updateMatrixWorld(true);
    activate(h); const dir = q.vmult(new CANNON.Vec3(...push)), hv = TYPES[kind].heavy ? .5 : 1;
    h.body.velocity.set(dir.x * 1.1 * hv, 1.2 * hv + .2, dir.z * 1.1 * hv);
  }
  const p = b.position; burst(p.x, p.y + .1, p.z, T0.chips || ['#8a4b2a', '#a35a2c', '#5f7f9e', '#c9d3dc'], 22, .8);
  haptic('heavy'); toast(T0.brokeMsg || 'Сломал: ' + T0.name.toLowerCase(), 2);
}

/* ---------- тост и карта ---------- */
/* ---------- реплики Кирью: всё, что раньше было всплывашкой, теперь говорит он сам ----------
   чёрное квадратное окошко с пиксельным текстом над головой, текст печатается по буквам.
   очередь: реплика держится, пока не дочитана (минимум ~1 с, если ждут следующие); одинаковые склеиваются в «×2»;
   важные (p = 2: находки, покупки, сообщения) встают вперёд подсказок (p = 0); в очереди не больше 4 — лишние подсказки выкидываются */
{ const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?family=Pixelify+Sans:wght@500&display=swap'; document.head.append(l)
  const st = document.createElement('style'); st.textContent = `
.say{position:absolute;left:0;top:0;z-index:4;max-width:min(240px,70vw);padding:7px 10px 8px;background:#0b0b0d;color:#f4f1e8;
  font:500 14px/1.25 "Pixelify Sans","Press Start 2P",ui-monospace,Menlo,Consolas,monospace;letter-spacing:.02em;
  box-shadow:0 0 0 2px #f4f1e8,0 0 0 4px #0b0b0d,0 6px 14px rgba(0,0,0,.45);pointer-events:none;transform-origin:50% 100%;white-space:pre-wrap;word-break:break-word}
.say::after{content:'';position:absolute;left:calc(50% + var(--tx,0px) - 6px);bottom:-10px;width:0;height:0;border:6px solid transparent;border-top:6px solid #f4f1e8;border-bottom:0}
.say::before{content:'';position:absolute;left:calc(50% + var(--tx,0px) - 3px);bottom:-5px;width:6px;height:5px;background:#0b0b0d;z-index:1}
.say .n{color:#f2c14e;margin-left:6px}.say .r{color:transparent}
.say.in{animation:sayin .16s steps(3) both}.say.out{animation:sayout .14s steps(2) both}
@keyframes sayin{from{transform:translateY(6px) scale(.6);opacity:0}}@keyframes sayout{to{transform:translateY(-4px) scale(.8);opacity:0}}
`; document.head.append(st) }
const SAY = { q: [], cur: null, el: null, pos: new THREE.Vector3() };
function toast(s, p = 1) {
  s = String(s);
  if (SAY.cur && SAY.cur.s === s) { SAY.cur.n++; SAY.cur.end = Math.max(SAY.cur.end, performance.now() + 900); sayText(); return }
  const same = SAY.q.find(m => m.s === s); if (same) { same.n++; same.p = Math.max(same.p, p); return }
  const m = { s, p, n: 1 }; let k = SAY.q.findIndex(o => o.p < p); if (k < 0) k = SAY.q.length; SAY.q.splice(k, 0, m);
  while (SAY.q.length > 4) { let w = 0; SAY.q.forEach((o, i) => { if (o.p <= SAY.q[w].p) w = i }); SAY.q.splice(w, 1) }   // лишняя — самая неважная из поздних
  if (!SAY.cur) sayNext();
}
function sayText() { const c = SAY.cur; if (!c) return; const [a, r, n] = SAY.el.children; a.textContent = c.s.slice(0, c.shown); r.textContent = c.s.slice(c.shown); n.textContent = c.n > 1 ? '×' + c.n : '' }   // ненапечатанный хвост прозрачный — окошко сразу своего размера и не растёт
function sayNext() {
  if (SAY.el) { const old = SAY.el; old.classList.remove('in'); old.classList.add('out'); setTimeout(() => old.remove(), 160); SAY.el = null }
  const m = SAY.q.shift(); SAY.cur = m || null; if (!m) return;
  const el = document.createElement('div'); el.className = 'say in'; el.style.visibility = 'hidden'; /* покажем, когда встанет над головой */ el.append(document.createElement('span'), document.createElement('span'), document.createElement('span')); el.children[1].className = 'r'; el.lastChild.className = 'n';
  document.body.append(el); SAY.el = el;
  m.t0 = performance.now(); m.shown = 0; m.read = 1100 + m.s.length * 55; m.end = m.t0 + Math.min(4200, m.read);
  sayText(); stepSay();
}
function stepSay() {
  const c = SAY.cur; if (!c) return; const now = performance.now();
  const n = Math.min(c.s.length, Math.floor((now - c.t0) / 22)); if (n !== c.shown) { c.shown = n; sayText() }   // печатаем по буквам
  const typed = c.t0 + c.s.length * 22, end = SAY.q.length ? Math.max(c.t0 + 1000, Math.min(c.end, typed + 700)) : c.end;
  if (now > end) return sayNext();
  const el = SAY.el; if (!el || !SAY.ready) return;            // до первого кадра модели и камеры ещё нет
  KIRYU.head.getWorldPosition(SAY.pos); SAY.pos.y += .55; SAY.pos.project(VCAM);
  const W = innerWidth, H = innerHeight, bw = el.offsetWidth, bh = el.offsetHeight;
  let x = (SAY.pos.x * .5 + .5) * W, y = (-SAY.pos.y * .5 + .5) * H;
  const cx = Math.max(bw / 2 + 8, Math.min(W - bw / 2 - 8, x)), cy = Math.max(bh + 70, Math.min(H - 20, y));
  el.style.setProperty('--tx', Math.max(-bw / 2 + 12, Math.min(bw / 2 - 12, x - cx)) + 'px');
  el.style.left = Math.round(cx - bw / 2) + 'px'; el.style.top = Math.round(cy - bh - 12) + 'px'; el.style.visibility = '';   // позиция — через left/top, чтобы анимация появления (transform) её не сбивала
}
const mapwrap = document.getElementById('mapwrap'), mapbtn = document.getElementById('mapbtn'), mapclose = document.getElementById('mapclose');
icon(XI, { k: '#10141f', x: '#e9f0ee' }, mapclose);
// окно карты — рулетка участков, собирается в конце файла (ей нужны оплата и сохранение)

/* ---------- предмет в руке: движение по сетке, без прохода сквозь блоки ---------- */
function stepHeld(g) {
  const t = g.t, b = t.body, cur3 = new THREE.Vector3(b.position.x, b.position.y, b.position.z);
  const bq = new THREE.Quaternion(b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w).slerp(g.q, .25);   // плавно доворачиваем
  b.quaternion.set(bq.x, bq.y, bq.z, bq.w); b.angularVelocity.set(0, 0, 0);
  // плавно идём к пальцу, но не быстрее 0.2 клетки за кадр
  const want = new THREE.Vector3(g.target.x - cur3.x, 0, g.target.z - cur3.z); if (want.length() > .2) want.setLength(.2);
  const nx = cur3.clone().add(want);
  // не даём выйти за края ямы — по реальному следу предмета
  let f = footprint(t, nx);
  if (f.c.x - extX(f) < PIT0) nx.x += PIT0 - (f.c.x - extX(f)); if (f.c.x + extX(f) > PIT1) nx.x -= f.c.x + extX(f) - PIT1;
  if (f.c.z - extZ(f) < PIT0) nx.z += PIT0 - (f.c.z - extZ(f)); if (f.c.z + extZ(f) > PIT1) nx.z -= f.c.z + extZ(f) - PIT1;
  f = footprint(t, nx);
  const lift = .03, need = obbFloor(f) + lift + (nx.y - worldBox(t, nx).min.y);
  if (need > cur3.y + .005) {
    // впереди выступ: сначала плавно поднимаемся на месте, и только потом едем дальше
    nx.x = cur3.x; nx.z = cur3.z; nx.y = cur3.y + Math.min(.04, need - cur3.y);
  } else nx.y = cur3.y + (need - cur3.y) * .25;                  // вниз — тоже плавно
  b.position.set(nx.x, nx.y, nx.z); b.velocity.set(0, 0, 0);
  const ff = footprint(t, nx); placeShadow(ff, obbFloor(ff));
}
/* страховка: если предмет всё же оказался внутри блока — аккуратно ставим его на пол без вращения */
function depenetrate(t) {
  // срабатывает, только если СЕРЕДИНА предмета оказалась внутри блока; край, свисающий со ступеньки, — это нормально
  const b = t.body; if (b.sleepState === CANNON.Body.SLEEPING) return;
  const c = new CANNON.Vec3(); for (const o of b.shapeOffsets) c.vadd(o, c); c.scale(1 / b.shapeOffsets.length, c);
  const w = b.pointToWorldFrame(c);
  const a = ACT.findIndex(([i, j]) => w.x >= i && w.x < i + 1 && w.z >= j && w.z < j + 1); if (a < 0) return;
  const f = floorY(a); if (w.y >= f - .03) return;
  b.updateAABB(); b.position.y += f + .01 - b.aabb.lowerBound.y; b.velocity.set(0, 0, 0); b.angularVelocity.set(0, 0, 0);
}

