/* ---------- цикл ---------- */
/* ---------- замер производительности: тройной тап по счётчику слоя включает/выключает табличку ----------
   время ЦП по частям кадра + FPS + рывки. Если FPS низкий, а ЦП на кадр маленький — упираемся в видеокарту */
const SESSION0 = Date.now(), SESSION0_TXT = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
const perf = { on: false, el: null, acc: {}, n: 0, t0: performance.now(), long: 0, total: 0, maxDt: 0, lightN: 0, calls: 0, tris: 0 };
try { perf.on = localStorage.getItem('perf') === '1' } catch (_) { }
function perfEl() { if (perf.el) return perf.el; const e = document.createElement('div');
  e.style.cssText = 'position:absolute;left:10px;top:60px;z-index:6;max-width:calc(100% - 20px);font:600 11px ui-monospace,Menlo,Consolas,monospace;color:#e9f0ee;background:rgba(10,16,24,.75);padding:6px 8px;border-radius:4px;white-space:pre-wrap;pointer-events:none;line-height:1.4';
  e.textContent = 'замер…'; stage.appendChild(e); perf.el = e; return e }
let gpuName = '?'; try { const gl = renderer.getContext(), ext = gl.getExtension('WEBGL_debug_renderer_info'); gpuName = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER) } catch (_) { }
{ const dep = document.getElementById('depth'); dep.style.pointerEvents = 'auto'; dep.style.cursor = 'pointer'; let taps = [];
  dep.addEventListener('pointerdown', e => { e.stopPropagation(); const t = performance.now(); taps = taps.filter(x => t - x < 700); taps.push(t);
    if (taps.length < 3) return; taps = []; perf.on = !perf.on; try { localStorage.setItem('perf', perf.on ? '1' : '0') } catch (_) { }
    perfEl().hidden = !perf.on; Object.assign(perf, { acc: {}, n: 0, t0: performance.now(), long: 0, total: 0, maxDt: 0, lightN: 0 }) }) }
if (perf.on) perfEl();
function perfFrame(raw, parts) {
  perf.n++; perf.maxDt = Math.max(perf.maxDt, raw); if (raw > 50) { perf.long++; perf.total++ }
  for (const k in parts) perf.acc[k] = (perf.acc[k] || 0) + parts[k];
  const now = performance.now(); if (now - perf.t0 < 1000) return;
  const s = (now - perf.t0) / 1000, n = perf.n, cpu = Object.values(perf.acc).reduce((x, y) => x + y, 0) / n;
  const ss = Math.floor((Date.now() - SESSION0) / 1000), two = v => String(v).padStart(2, '0');
  perfEl().textContent = 'сессия ' + (ss >= 3600 ? Math.floor(ss / 3600) + ':' : '') + two(Math.floor(ss / 60) % 60) + ':' + two(ss % 60) + ' (с ' + SESSION0_TXT + ')\n' + 'FPS ' + (n / s).toFixed(0) + ' · худший кадр ' + perf.maxDt.toFixed(0) + ' мс · рывков ' + perf.long + ' (всего ' + perf.total + ')\n' +
    'ЦП на кадр ' + cpu.toFixed(1) + ' мс: ' + Object.keys(perf.acc).map(k => k + ' ' + (perf.acc[k] / n).toFixed(1)).join(' · ') + '\n' +
    'пересчёт света ' + (perf.lightN / s).toFixed(1) + '/с · отрисовок ' + perf.calls + ' · треугольников ' + (perf.tris / 1000).toFixed(1) + 'k\n' +
    'кадр ' + W + '×' + H + ' ×' + SCALE + ' · экран ' + innerWidth + '×' + innerHeight + ' · dpr ' + (devicePixelRatio || 1).toFixed(2) + '\n' + 'GPU: ' + gpuName;
  Object.assign(perf, { acc: {}, n: 0, t0: now, long: 0, maxDt: 0, lightN: 0 });
}
let last = performance.now(), acc = 0;
function frame(now) {
  const raw = now - last, T0 = performance.now();
  const dt = Math.min(.05, (now - last) / 1000); last = now; timeU.value = now / 1000;
  for (const g of grabs.values()) stepHeld(g);
  stepChar(dt); drawChar(dt, now);
  shopG.userData.mer.update(dt, { near: nearShop(), px: CH.x - MERCH.x, pz: CH.z - MERCH.z }); stepKZ(dt);
  const Tp = performance.now(); world.step(1 / 60, dt, 3); const Tq = performance.now();
  const sold = [];
  for (const t of trash) if (t.body && !t.inBag) {                // вещь в мешке физикой не двигаем (на всякий случай: в списке её быть не должно)
    if (!t.held) {
      if (winZone(t.body.position)) {                          // летит в корзину: продаём, когда опустится ниже края (или застрянет над ней)
        t.zoneT = (t.zoneT || 0) + dt; if (t.body.position.y < SHOP.floor + BASKET.h + .12 || t.zoneT > .8) { sold.push(t); continue } }
      else { t.zoneT = 0; depenetrate(t); if (lostItem(t)) returnItem(t);
        if (t.ghost ? !charHits(t) : CH.state !== 'walk' && charHits(t)) { t.ghost = !t.ghost; t.body.collisionFilterMask = tMask(t) }
        if (t.sep) sepStep(t, dt) } }   // упал или запрыгнул прямо на предмет — не расталкиваем; застрял в другой вещи — раздвигаем
    { const bp = t.body.position, bq = t.body.quaternion, lp = t.vp || (t.vp = new THREE.Vector3(1e9, 0, 0)), lq = t.vq || (t.vq = new THREE.Quaternion());   // картинку двигаем, только если тело сдвинулось заметно:
      const dq = Math.abs(lq.x * bq.x + lq.y * bq.y + lq.z * bq.z + lq.w * bq.w);                                                                // дрожь лежащих друг на друге вещей не видна
      if (t.held || lp.distanceToSquared(bp) > 1e-5 || dq < .99998) { lp.set(bp.x, bp.y, bp.z); lq.set(bq.x, bq.y, bq.z, bq.w);
        t.g.quaternion.copy(lq); t.g.position.copy(lp).sub(t.com.clone().applyQuaternion(lq)) } }
    const vy = t.body.velocity.y;                             // удар об пол: тряска и пыль — один раз за падение
    if (!t.held && t.falling && vy > -1) { t.falling = false; if (t.fallV < -5) { haptic('medium'); const p = t.g.position; burst(p.x, p.y + .05, p.z, ['#8c7a6a', '#5e4c42', '#b8a48c'], 10, .5) } }
    if (!t.held && vy < -3) { t.falling = true; t.fallV = Math.min(t.fallV || 0, vy) } else if (!t.falling) t.fallV = 0;
  }
  for (const t of sold) basketTake(t);
  stepTable(dt);
  stepParts(dt);
  // подсветка того, к чему можно приложить инструмент: блоки под кирку, гнёзда червей под лопатку или пустую банку
  const hl = new Set(); if (tool === 'pick' && !CH.held) for (let a = 0; a < ACT.length; a++) if (diggable(a, d[a]) && reach(a)) hl.add(ACT[a][0] + ',' + ACT[a][1] + ',' + d[a]);
  const tinH = !!CH.held && CH.held.type === 'tin';
  if ((tool === 'trowel' && !CH.held) || tinH) for (const s of SPOTS) if ((tinH ? s.state === 1 : s.state === 0) && spotOpen(s) && spotReach(s)) hl.add(s.i + ',' + s.j + ',' + s.z);
  if ((CH.held && CH.held.type === 'ladder' && CH.state === 'walk') || (CH.state === 'ladder' && CH.lad.carry)) for (const k of ladTargets()) hl.add(k);   // куда можно повесить лестницу
  pulseU.value = hl.size || tool === 'pick' ? .12 + .1 * Math.sin(now / 260) : 0;
  setHighlight(hl);
  const T1 = performance.now();
  // рисуем только открытые блоки в слоях рядом с камерой
  updateLight(); bagLight();
  let maxD = 0; for (const v of d) maxD = Math.max(maxD, v);
  const cl = -camF.y / BH, z0 = Math.floor(cl - 10), z1 = Math.min(BOT, Math.ceil(cl + 10), Math.max(SKY_D, maxD + 5));
  under.position.y = -(z1 + 1) * BH; clipU.value = under.position.y;
  for (const c of chunks) if (c) c.mesh.visible = c.faces.length > 0 && c.mesh.userData.chunk >= z0 && c.mesh.userData.chunk <= z1;
  placeCam(dt); stepHouse(); stepPhone(dt); stepLadCam(dt); stepBagCam(dt);
  // солнце едет вместе с камерой по слоям (ступенькой, чтобы тень не мерцала)
  const ty = Math.round(camF.y / BH) * BH; sun.target.position.set(Math.round(camF.x), ty, Math.round(camF.z)); sun.position.copy(sun.target.position).addScaledVector(SUN_DIR, 15); sun.target.updateMatrixWorld();
  renderer.shadowMap.needsUpdate = true;
  const T2 = performance.now();
  SAY.ready = true; stepSay();
  renderer.setClearColor(bagClearCol(), bagClear());   // над мешком срезанные стенки — тёмный фон, а не небо
  renderer.render(scene, VCAM); perf.calls = renderer.info.render.calls; perf.tris = renderer.info.render.triangles;
  const T3 = performance.now();
  drawOutlines();
  const T4 = performance.now();
  drawIcons(dt);
  if (perf.on) { const T5 = performance.now(); perfFrame(raw, { логика: T1 - T0 - (Tq - Tp), физика: Tq - Tp, свет: T2 - T1, рендер: T3 - T2, обводка: T4 - T3, иконки: T5 - T4 }) }
  document.getElementById('depth').textContent = 'слой ' + Math.max(0, Math.round(-CH.y / BH)) + ' / ' + DIG;
  requestAnimationFrame(frame);
}
for (let z = 0; z <= BOT; z++) buildChunk(z);
ensureBodies();
/* мусор участка — из зерна участка, поэтому при каждом запуске тот же; уже откопанные предметы убираем, а вещи, лежавшие вне дома, ставим на место */
{ const mr = Math.random; Math.random = mulberry(GAME.pl.s); try { genTrash() } finally { Math.random = mr } }
const PLOT_TRASH = trash.slice(); PLOT_TRASH.forEach((t, k) => t.pk = k);
for (const k of GAME.u) if (PLOT_TRASH[k]) removeTrash(PLOT_TRASH[k]);
LOADING = true; updateTrash(); LOADING = false;
for (const [type, x, y, z, qx, qy, qz, qw] of GAME.items) { if (!TYPES[type]) continue;
  const t = makeTrash(type, x, y, z, 0, -1); t.g.quaternion.set(qx, qy, qz, qw).normalize(); t.g.updateMatrixWorld(true); activate(t) }
KIT.rk = GAME.rk == null ? 4 : Math.max(0, Math.min(4, GAME.rk | 0)); rackShow();   // новый участок — полный стеллаж и фонарь на ящике
if (GAME.rk == null) { const t = makeTrash('lantern', (CRATE.x0 + CRATE.x1) / 2, CRATE.top + .005, (CRATE.z0 + CRATE.z1) / 2, .4, -1); activate(t) }
for (const key of GAME.lad || []) { const m = /^([LR])(\d),(\d+)$/.exec(key); if (m) mountLadder(m[1], +m[2], +m[3], true) }
{ const busy = new Set();                                         // мешок: что в каких клетках — узел за спиной
  for (const [type, c0, c1] of Array.isArray(GAME.bag) ? GAME.bag : []) { const cs = c1 >= 0 ? [c0, c1] : [c0];
    if (!TYPES[type] || cs.some(c => !(c >= 0 && c < 6) || busy.has(c))) continue; cs.forEach(c => busy.add(c));
    const t = makeTrash(type, 0, -60, 0, 0, -1); activate(t); bagDetach(t); BAG.g.add(t.g); const it = { t, c: cs }; BAG.items.push(it); bagSeat(it) }
  BAG.back = BAG.items.length > 0 }
if (ACT.some(([ci, cj], q) => cj === PIT0 && ci >= SHOP.i0 && ci < SHOP.i1 && d[q] > SHOP.z0)) { SHOP.revealed = true; lightDirty = true }
if (GAME.w) buildWorms();
if (!Q.s) setTimeout(qSend, 4500);                              // Кудзуя-сан пишет первым (или следующую просьбу после перезапуска)
resize(); addEventListener('resize', resize); if (tg && tg.onEvent) tg.onEvent('viewportChanged', resize);
window.__dbg = { THREE, scene, cam, shopG, SHOP, openShop, addCoins, revealShop, basketTake, nearShop, get coins() { return coins }, digCell, LG, computeLight, lightAt, updateLight, grabItem, dropItem, tap, sun, renderer, CH, act, joy, d, trash, blocks, world, settle, updateTrash, cur, removeBlock, activate, breakTrash, setTool, grabs, LADS, KIT, mountLadder, KIRYU, LC, LAD };
requestAnimationFrame(frame);

/* ---------- поддержать автора: оплата звёздами Telegram через наш сервер ----------
   сервер создаёт ссылку на оплату и сам записывает прошедшие платежи; игра только открывает окно оплаты
   и спрашивает у сервера, сколько звёзд игрок уже подарил (значок сторонника) */
const PAY_API = 'https://trashlottery-pay.balltwist02.workers.dev';
const SUP_TERMS = `1. «Поддержать автора» — добровольное пожертвование разработчику. За него — благодарность и значок сторонника в игре, других товаров и преимуществ нет.
2. Оплата — только звёздами Telegram, цена видна в окне оплаты до подтверждения.
3. Платёж прошёл по ошибке — напиши в течение 14 дней через /paysupport в боте, вернём звёзды.
4. Поддержка Telegram с покупками в этом боте не помогает — по оплате пиши через /paysupport.
5. Игра в разработке, возможны ошибки и изменения.`;
{
  const canPay = !!(tg && tg.initData && tg.openInvoice && tg.isVersionAtLeast && tg.isVersionAtLeast('6.1'));
  const btn = document.getElementById('supbtn'), wrap = document.getElementById('supwrap'), close = document.getElementById('supclose');
  const fan = document.getElementById('supfan'), terms = document.getElementById('supterms'), opts = [...wrap.querySelectorAll('.opt')];
  icon(XI, { k: '#10141f', x: '#e9f0ee' }, close); terms.textContent = SUP_TERMS;
  const api = (path, body) => fetch(PAY_API + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ initData: tg.initData, ...body }) }).then(r => r.json());
  const showFan = n => { btn.classList.toggle('fan', n > 0); fan.hidden = !(n > 0); fan.textContent = `⭐ Ты сторонник игры — подарено ${n} ⭐. Спасибо!` };
  const refresh = () => api('/api/me').then(r => { if (typeof r.stars === 'number') showFan(r.stars) }).catch(() => { });
  if (canPay) { btn.hidden = false; refresh() }
  btn.addEventListener('click', () => { wrap.hidden = false; close.focus(); haptic('light') });
  close.addEventListener('click', () => { wrap.hidden = true; btn.focus(); haptic('light') });
  wrap.addEventListener('click', e => { if (e.target === wrap) wrap.hidden = true });
  document.getElementById('suptermsbtn').addEventListener('click', () => { terms.hidden = !terms.hidden });
  for (const o of opts) o.addEventListener('click', async () => {
    opts.forEach(b => b.disabled = true);
    try {
      const r = await api('/api/invoice', { product: o.dataset.p });
      if (!r.link) throw new Error(r.error || 'нет ссылки');
      tg.openInvoice(r.link, status => {
        if (status === 'paid') { haptic('medium'); toast('Спасибо за поддержку! ⭐', 2); setTimeout(refresh, 1500); setTimeout(refresh, 5000) }
        else if (status === 'failed') toast('Оплата не прошла');
      });
    } catch (e) { toast('Не получилось открыть оплату — попробуй позже') }
    opts.forEach(b => b.disabled = false);
  });
}

