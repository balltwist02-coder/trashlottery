
/* ---------- магазин за звёзды Telegram: налог на землю, удача на крутки, кирка 2×2 ----------
   налог на землю: раз в 30 дней от первого запуска у каждого игрока (GAME.tx.until — до какого момента оплачено).
   сумма растёт с номером участка, но медленно (корень) и с потолком. через 5 дней после начала периода — письмо налоговой;
   срок прошёл, а не оплачено — крутки участков под арестом (копать и переехать на уже выпавший участок можно).
   вне Телеграма оплатить нечем — там налога нет.
   удача: GAME.lk — сколько круток ещё с удачей; кирка 2×2: GAME.pk (навсегда, см. digHit в src/05_character.js).
   всё купленное и срок налога хранит сервер (server/worker.js): игра лишь спрашивает его (/api/me) и показывает.
   время — по часам сервера (SRV.off — на сколько они расходятся с телефоном). сервер не ответил — налога нет, удача не тратится,
   кирка — как была в прошлый раз */
const DAY = 864e5, TAX_PERIOD = 30 * DAY, TAX_SMS_AFTER = 5 * DAY;
const LUCK_SPINS = 3, LUCK_MUL = 1.5;
const PAY_ON = !!(tg && tg.initData && tg.openInvoice && tg.isVersionAtLeast && tg.isVersionAtLeast('6.1'));
const SHOP_TERMS = `1. Товары магазина — игровые: налог на землю продлевает право крутить участки на 30 дней, удача действует на указанное число круток, кирка 2×2 — навсегда.
2. Оплата — только звёздами Telegram, цена видна в окне оплаты до подтверждения.
3. Платёж прошёл по ошибке или товар не появился — напиши в течение 14 дней через /paysupport в боте, разберёмся или вернём звёзды.
4. Поддержка Telegram с покупками в этом боте не помогает — по оплате пиши через /paysupport.
5. Игра в разработке, возможны ошибки и изменения.`;
const SRV = { ok: false, off: 0, tax: 0 }, srvNow = () => Date.now() + SRV.off;
const taxAmount = () => SRV.tax || Math.min(49, Math.round(15 + 3 * Math.sqrt(GAME.pl.n)));   // считает сервер: 1 участок — 18 ⭐, 10 — 24, 100 — 45, потолок 49
function taxDue() { return PAY_ON && SRV.ok && srvNow() >= GAME.tx.until }
const srvApi = (path, body = {}) => fetch(PAY_API + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ initData: tg.initData, plot: GAME.pl.n, ...body }) }).then(r => r.json());
function srvApply(r) {
  if (!r || typeof r.taxUntil !== 'number') return false;
  SRV.ok = true; SRV.off = r.now - Date.now(); SRV.tax = r.tax; GAME.tx.until = r.taxUntil; GAME.lk = r.luck | 0; GAME.pk = r.pick ? 1 : 0;
  if (!document.getElementById('supwrap').hidden) SHOPUI.render(); if (!mapwrap.hidden && MAPR.render) MAPR.render(); SHOPUI.dot(); return true;
}
async function srvSync() { if (!PAY_ON) return false; try { return srvApply(await srvApi('/api/me')) } catch (e) { return false } }
async function takeLuck() {                                      // крутка с удачей: сервер списывает одну; не ответил — крутим без удачи
  if (!(PAY_ON && SRV.ok && GAME.lk > 0)) return false;
  try { const r = await srvApi('/api/luck'); srvApply(r); return !!r.ok } catch (e) { return false }
}
const taxDate = t => new Date(t).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
function plotOdds(lucky) {                                       // шансы редкостей в % — с удачей или без
  const w = PLOT_ODDS.map(([r, p]) => [r, p * (lucky ? LUCK_MUL ** RAR[r].tier : 1)]), s = w.reduce((a, [, p]) => a + p, 0);
  return w.map(([r, p]) => [r, p / s * 100]);
}
/* покупка: сервер выставляет счёт; после оплаты товар выдаёт сервер — ждём, пока он это подтвердит (got — «товар уже у игрока?») */
async function payStars(product, got, done) {
  if (!PAY_ON) { toast('Покупки — только в Телеграме'); return false }
  try {
    const r = await srvApi('/api/invoice', { product });
    if (!r.link) throw new Error(r.error || 'нет ссылки');
    const st = await new Promise(res => tg.openInvoice(r.link, res));
    if (st !== 'paid') { if (st === 'failed') toast('Оплата не прошла'); return false }
    haptic('medium'); toast('Оплата прошла — получаем покупку…', 2);
    for (let k = 0; k < 8; k++) { await new Promise(w => setTimeout(w, k ? 1500 : 600)); if (await srvSync() && got()) { done(); saveGame(true); return true } }
    toast('Оплата прошла — покупка появится через минуту', 3); setTimeout(srvSync, 30000); return true;
  } catch (e) { toast('Не получилось открыть оплату — попробуй позже'); return false }
}
function taxLetter(text) { const tx = GAME.tx; tx.L.push([Date.now(), text]); if (tx.L.length > 8) tx.L.splice(0, tx.L.length - 8); tx.nw = true;
  SMS.badge(); SMS.buzz(); SMS.refresh(); toast('СМС от Налоговой службы…', 2) }
function payTax() {
  const amt = taxAmount(), u0 = GAME.tx.until;
  return payStars('tax', () => GAME.tx.until > u0, () => {
    taxLetter(`Налог на землю получен: ${amt} ⭐. Спасибо! Следующий платёж — до ${taxDate(GAME.tx.until)}.`); GAME.tx.nw = false; SMS.badge();
    toast('Налог оплачен — крутки снова доступны', 2); MAPR.render && MAPR.render() });
}
function taxTick() {                                             // письма налоговой: напоминание через 5 дней после начала периода и арест в срок
  if (!PAY_ON || !SRV.ok) return; const tx = GAME.tx, now = srvNow();
  if (now >= tx.until - TAX_PERIOD + TAX_SMS_AFTER && tx.w !== tx.until && now < tx.until) { tx.w = tx.until;
    taxLetter(`Уважаемый владелец участка №${GAME.pl.n}! Налог на землю — ${taxAmount()} ⭐, оплатить до ${taxDate(tx.until)}. Оплатить можно в магазине (⭐). Без оплаты участок будет арестован: новые участки крутить будет нельзя.`) }
  if (now >= tx.until && tx.o !== tx.until) { tx.o = tx.until;
    taxLetter(`Срок уплаты налога на землю истёк. Участок №${GAME.pl.n} под арестом: крутки новых участков закрыты до оплаты (${taxAmount()} ⭐, магазин ⭐). Копать можно.`) }
  SHOPUI.dot();
}
const SHOPUI = { render() { }, dot() { } };
{
  const btn = document.getElementById('supbtn'), wrap = document.getElementById('supwrap'), close = document.getElementById('supclose');
  const list = document.getElementById('supopts'), terms = document.getElementById('supterms');
  icon(XI, { k: '#10141f', x: '#e9f0ee' }, close); terms.textContent = SHOP_TERMS;
  const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e };
  const row = (name, sub, price, on, cls) => { const b = h('button', 'opt' + (cls ? ' ' + cls : '')); b.type = 'button'; const s = h('span'); s.append(h('span', '', name), h('small', '', sub)); b.append(s, h('b', '', price));
    if (on) b.addEventListener('click', async () => { list.querySelectorAll('.opt').forEach(o => o.disabled = true); await on(); SHOPUI.render() }); else b.disabled = true; list.append(b) };
  SHOPUI.render = () => {
    list.textContent = ''; const tx = GAME.tx, now = srvNow(), open = now >= tx.until - TAX_PERIOD + TAX_SMS_AFTER;
    if (!PAY_ON) row('Налог на землю', 'Платится раз в месяц — только в Телеграме', '—', null);
    else if (!SRV.ok) row('Налог на землю', 'Нет связи с сервером — попробуй позже', '…', null);
    else if (taxDue()) row('Налог на землю', 'Просрочен — крутки участков под арестом', taxAmount() + ' ⭐', payTax, 'due');
    else row('Налог на землю', open ? `Оплатить до ${taxDate(tx.until)}` : `Оплачен до ${taxDate(tx.until)}`, open ? taxAmount() + ' ⭐' : '✓', open ? payTax : null);
    row(`Удача на ${LUCK_SPINS} крутки`, `Синий и фиолетовый участки выпадают чаще` + (GAME.lk > 0 ? ` · осталось ${GAME.lk}` : ''), '59 ⭐',
      () => { const l0 = GAME.lk | 0; return payStars('luck3', () => GAME.lk > l0, () => { toast('🍀 Удача на ' + LUCK_SPINS + ' крутки', 2); MAPR.render && MAPR.render() }) });
    if (GAME.pk) row('Кирка 2×2', 'Куплена — один удар вскрывает квадрат 2×2', '✓', null);
    else row('Кирка 2×2', 'Навсегда: один удар вскрывает квадрат 2×2', '799 ⭐', () => payStars('pick22', () => GAME.pk, () => toast('Кирка 2×2 — твоя! Копай квадратами', 2)));
    SHOPUI.dot();
  };
  SHOPUI.dot = () => { let d = btn.querySelector('.due'); const due = taxDue(); if (due && !d) { d = h('i', 'due'); btn.append(d) } if (!due && d) d.remove() };
  if (PAY_ON) btn.hidden = false;
  btn.addEventListener('click', () => { SHOPUI.render(); wrap.hidden = false; close.focus(); haptic('light') });
  close.addEventListener('click', () => { wrap.hidden = true; btn.focus(); haptic('light') });
  wrap.addEventListener('click', e => { if (e.target === wrap) wrap.hidden = true });
  document.getElementById('suptermsbtn').addEventListener('click', () => { terms.hidden = !terms.hidden });
  srvSync().then(taxTick); setInterval(taxTick, 5000); setInterval(srvSync, 5 * 60e3);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) srvSync() });   // вернулся в игру — свериться с сервером
}
Object.assign(window.__dbg, { taxDue, taxAmount, plotOdds, taxTick, srvSync, SRV, SHOPUI, digHit, SMS, d });
