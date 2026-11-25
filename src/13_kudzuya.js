/* ---------- стол и сам Кудзуя-сан на левой стенке, у дальнего края прохода ----------
   стол массивный, квадратный, из тех же тёмных досок, что и дом; на столешнице — физика: вещь, положенная на стол, лежит.
   Кудзуя-сан стоит за дальним углом стола и смотрит на проход, где ходит Кирью */
const KZ = { g: new THREE.Group(), mod: null, busy: null, near: false, hint: 0 }; scene.add(KZ.g);
{ const TW = new THREE.MeshLambertMaterial({ map: plankTex(23, [132, 92, 56], [100, 68, 40], [156, 112, 70]) }), TD = new THREE.MeshLambertMaterial({ map: plankTex(31, [98, 66, 38], [74, 48, 28], [118, 82, 48]) }), T = TBL;
  const tb = (x0, x1, y0, y1, z0, z1, m, body) => { const o = hbox(x0, x1, y0, y1, z0, z1, m, null, body, KZ.g); o.castShadow = o.receiveShadow = true; o.userData.table = true; return o };
  tb(T.x0 - .03, T.x1 + .03, T.top - .1, T.top, T.z0 - .03, T.z1 + .03, TW, false);         // толстая столешница с напуском
  wall(T.x0 - .03, T.x1 + .03, T.top - .5, T.top, T.z0 - .03, T.z1 + .03);                  // для предметов стол — толстый брусок: тонкую доску они пролетают насквозь
  tb(T.x0 + .03, T.x1 - .03, T.top - .19, T.top - .1, T.z0 + .03, T.z1 - .03, TD, false);   // царги
  for (const [x, z] of [[T.x0 + .02, T.z0 + .02], [T.x1 - .15, T.z0 + .02], [T.x0 + .02, T.z1 - .15], [T.x1 - .15, T.z1 - .15]]) tb(x, x + .13, 0, T.top - .1, z, z + .13, TD, false);   // ноги-бруски
  tb(T.x0 + .1, T.x1 - .1, .1, .16, (T.z0 + T.z1) / 2 - .035, (T.z0 + T.z1) / 2 + .035, TD, false);   // перекладина
  for (const z of [T.z0 + .08, T.z1 - .08]) tb((T.x0 + T.x1) / 2 - .035, (T.x0 + T.x1) / 2 + .035, .1, .16, z - .06, z + .06, TD, false);
  const cup = new THREE.Group(), cm = c => new THREE.MeshLambertMaterial({ color: c, flatShading: true });   // чашка чая у угла Кудзуя-сан
  const c1 = new THREE.Mesh(new THREE.CylinderGeometry(.034, .028, .07, 8), cm(0x5f7f86)); c1.position.y = .035; cup.add(c1);
  const c2 = new THREE.Mesh(new THREE.CylinderGeometry(.028, .028, .006, 8), cm(0x8a6a2a)); c2.position.y = .068; cup.add(c2);
  const c3 = new THREE.Mesh(new THREE.CylinderGeometry(.036, .036, .012, 8), cm(0x3e5458)); c3.position.y = .006; cup.add(c3);
  cup.position.set(T.x0 + .11, T.top, T.z0 + .11); cup.traverse(o => { if (o.isMesh) { o.castShadow = true; o.userData.table = true } }); KZ.g.add(cup);
  KZ.mod = createKudzuya(THREE); KZ.mod.root.position.set(KZP.x, 0, KZP.z); KZ.mod.root.rotation.y = KZP.ry; KZ.g.add(KZ.mod.root);
}
const nearTable = (m = .75) => Math.hypot(Math.max(TBL.x0 - CH.x, 0, CH.x - TBL.x1), Math.max(TBL.z0 - CH.z, 0, CH.z - TBL.z1)) < m && Math.abs(CH.y) < .3;
function putOnTable() {                                          // вещь из рук — на стол, в ближнюю к Кирью точку столешницы
  const t = CH.held, b = t.body, up = t.local.max.y - t.local.min.y, m = .2;
  const x = Math.max(TBL.x0 + m, Math.min(TBL.x1 - m, CH.x)), z = Math.max(TBL.z0 + m, Math.min(TBL.z1 - m, CH.z));
  faceTo(x, z); b.position.set(x, TBL.top + up * .55 + .04, z); dropItem(true); b.velocity.set(0, 0, 0);
}
function tableTap() {
  if (!CH.held) { kzTalk(); return }
  if (CH.held.type === 'ladder') { toast('Лестницу на стол? Кудзуя-сан не оценит', 0); return }
  if (!nearTable()) { toast('Подойду к столу поближе', 0); return }
  putOnTable();
}
function kzTalk() {                                              // тап по Кудзуя-сан или пустому столу — напомнит, что ему нужно
  if (KZ.busy) return; const q = QUESTS[Q.i]; KZ.mod.play('nod');
  kzSay(!Q.s ? 'Кирью-кун! Загляни потом в телефон.' : q.type ? `${cap(q.what)}, Кирью-кун. Положи на мой стол.` : q.idle);
}
function qSend() {                                               // Кудзуя-сан присылает следующую просьбу
  if (Q.s || Q.i >= QUESTS.length) return;
  Q.s = 1; Q.nw = true; SMS.badge(); SMS.buzz(); SMS.refresh();
  if (!KZ.busy) KZ.mod.play('wave'); toast('СМС от Кудзуя-сан', 2);
}
function kzJudge(t) {                                            // на стол положили вещь
  const q = QUESTS[Q.i];
  if (Q.s && q && q.type === t.type) { kzTake(t); return }
  KZ.mod.play('no'); kzSay(Q.s && q && q.type ? `Не то, Кирью-кун. Я жду ${q.acc}.` : 'Мне пока ничего не нужно, Кирью-кун.');
}
function kzTake(t) {                                             // забирает вещь: награда сразу (чтобы сохранение посреди анимации ничего не потеряло)
  const q = QUESTS[Q.i], b = t.body, p = new THREE.Vector3(b.position.x, b.position.y, b.position.z);
  Q.i++; Q.s = 0; addCoins(q.pay, p.x, p.y + .25, p.z); burst(p.x, p.y + .1, p.z, ['#f2c14e', '#fff6c8', '#d99a2b'], 12, .6); haptic('medium'); kzSay(q.got);
  t.kz = true; b.type = CANNON.Body.KINEMATIC; b.collisionResponse = false; b.velocity.set(0, 0, 0); b.angularVelocity.set(0, 0, 0);
  KZ.busy = { t, p0: p }; KZ.g.updateMatrixWorld(true); KZ.mod.play('take', { target: KZ.mod.root.worldToLocal(p.clone()) });
  setTimeout(qSend, 5500);
}
function stepTable(dt) {                                         // вещь улеглась на столе — Кудзуя-сан смотрит, что это
  for (const t of trash) { if (!t.body || !t.active || t.held || t.mounted || t.kz) continue;
    const p = t.body.position, on = p.x > TBL.x0 - .05 && p.x < TBL.x1 + .05 && p.z > TBL.z0 - .05 && p.z < TBL.z1 + .05 && p.y > TBL.top - .05 && p.y < TBL.top + .9;
    if (!on) { t.onT = 0; t.tblSeen = false; continue }
    if (t.tblSeen || KZ.busy) continue;
    if (t.body.velocity.length() > .25) { t.onT = 0; continue }
    t.onT = (t.onT || 0) + dt; if (t.onT < .35) continue;
    t.tblSeen = true; kzJudge(t);
  }
}
const _kh = new THREE.Vector3();
function stepKZ(dt) {
  const near = CH.state === 'walk' && Math.hypot(CH.x - KZP.x, CH.z - KZP.z) < 1.7 && Math.abs(CH.y) < .5, now = performance.now();
  KZ.mod.update(dt, { near, px: CH.x - KZP.x, pz: CH.z - KZP.z });
  if (near && !KZ.near && !KZ.busy && Q.s && QUESTS[Q.i].type && now - KZ.hint > 25000) { KZ.hint = now; kzSay(`Ну что, Кирью-кун? Нашёл ${QUESTS[Q.i].acc}?`) }
  KZ.near = near;
  const B = KZ.busy;
  if (B) { const t = B.t, k = KZ.mod.k;
    if (KZ.mod.act !== 'take' || k > .74) { removeTrash(t); KZ.busy = null }
    else if (k > .18) { KZ.g.updateMatrixWorld(true); KZ.mod.hand.localToWorld(_kh.set(0, -.07, .02)); const e = Math.min(1, (k - .18) / .14), p = B.p0.clone().lerp(_kh, e * e * (3 - 2 * e)); t.body.position.set(p.x, p.y, p.z) } }
  stepKzSay();
}
/* реплика Кудзуя-сан: такое же окошко, как у Кирью, только тёплого цвета, над его головой */
{ const st = document.createElement('style'); st.textContent = `.say.kz{background:#2b1a12;color:#ffe9c4;box-shadow:0 0 0 2px #e9c88c,0 0 0 4px #2b1a12,0 6px 14px rgba(0,0,0,.45)}.say.kz::after{border-top-color:#e9c88c}.say.kz::before{background:#2b1a12}`; document.head.append(st) }
const KZS = { el: null, s: '', t0: 0, end: 0, pos: new THREE.Vector3() };
function kzSay(s) {
  if (KZS.el) KZS.el.remove();
  const el = document.createElement('div'); el.className = 'say kz in'; el.style.visibility = 'hidden'; el.append(document.createElement('span'), document.createElement('span')); el.children[1].className = 'r';
  document.body.append(el); const t0 = performance.now(); Object.assign(KZS, { el, s, t0, end: t0 + Math.min(5000, 1500 + s.length * 60) });
}
function stepKzSay() {
  const el = KZS.el; if (!el) return; const now = performance.now(), s = KZS.s, n = Math.min(s.length, Math.floor((now - KZS.t0) / 24));
  if (el.firstChild.textContent.length !== n) { el.firstChild.textContent = s.slice(0, n); el.children[1].textContent = s.slice(n) }
  if (now > KZS.end) { el.classList.remove('in'); el.classList.add('out'); setTimeout(() => el.remove(), 160); KZS.el = null; return }
  if (PH.on || !SAY.ready) { el.style.visibility = 'hidden'; return }
  KZ.mod.head.getWorldPosition(KZS.pos); KZS.pos.y += .42; KZS.pos.project(VCAM);
  const W = innerWidth, H = innerHeight, bw = el.offsetWidth, bh = el.offsetHeight, x = (KZS.pos.x * .5 + .5) * W, y = (-KZS.pos.y * .5 + .5) * H;
  if (KZS.pos.z > 1 || x < -bw || x > W + bw) { el.style.visibility = 'hidden'; return }
  const cx = Math.max(bw / 2 + 8, Math.min(W - bw / 2 - 8, x)), cy = Math.max(bh + 70, Math.min(H - 20, y));
  el.style.setProperty('--tx', Math.max(-bw / 2 + 12, Math.min(bw / 2 - 12, x - cx)) + 'px');
  el.style.left = Math.round(cx - bw / 2) + 'px'; el.style.top = Math.round(cy - bh - 12) + 'px'; el.style.visibility = '';
}

