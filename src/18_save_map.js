/* ---------- сохранение прогресса ----------
   раз в 3 секунды сверяем «снимок» (монеты, раскопки, вещи вне дома с точностью 5 см); изменилось — пишем. Свернули игру — пишем сразу. */
const GSAVE = { sig: '', busy: false, warned: false };
function gameItems() {
  return trash.filter(t => t.active && t.body && !t.kz && !t.inBag && TYPES[t.type] && !inHouse(t.body.position))
    .map(t => { const p = t.g.position, q = t.g.quaternion; return [t.type, r3(p.x), r3(p.y), r3(p.z), r3(q.x), r3(q.y), r3(q.z), r3(q.w)].join(',') })
    .concat(BAG.drag && BAG.drag.from === 'floor' ? [[BAG.drag.t.type, r3(BAG.drag.p0.x), r3(BAG.drag.p0.y + .3), r3(BAG.drag.p0.z), 0, 0, 0, 1].join(',')] : [])   // вещь в пальцах над мешком
    .concat(CH.state === 'ladder' && (CH.lad.carry || CH.lad.ph === 'sling' || (CH.lad.ph === 'place' && !LADS.has(ladKey(CH.lad.C.s, CH.lad.C.k, CH.lad.ext.z)))) ? ['ladder,' + r3(CH.x) + ',' + r3(Math.max(.3, CH.y + .5)) + ',' + r3(CH.z) + ',0,0,0,1'] : []);   // лестница на боку
}
async function saveGame(force, items) {
  if (!GAME.ok) { if (!GSAVE.warned) { GSAVE.warned = true; toast('Сохранение не загрузилось — прогресс этой сессии не запишется') } return false }
  if (GSAVE.busy || GAME.moving && !items) return false;          // переезд: пишем только запись нового участка, остальное ждёт перезагрузки
  const recs = items || gameItems();
  const head = { v: GAME_V, c: coins, p: GAME.p, pl: GAME.pl, d: GAME.moving ? ACT.map(() => 0) : d.slice(), u: GAME.u, st: GAME.st, w: SPOTS.map(s => s.state | 0), nx: GAME.nx, lad: GAME.moving ? [] : [...LADS.keys()], rk: GAME.moving ? null : KIT.rk, q: Q, bag: BAG.items.map(it => [it.t.type, it.c[0], it.c.length > 1 ? it.c[1] : -1]) };
  const sig = JSON.stringify(head) + '|' + recs.map(r => r.split(',').slice(0, 4).map((v, i) => i ? Math.round(+v * 20) : v).join()).sort().join(';');
  if (!force && sig === GSAVE.sig) return true;
  const parts = []; let cur = '';
  for (const r of recs) { if (cur.length + r.length + 1 > 4000) { parts.push(cur); cur = '' } cur += (cur ? ';' : '') + r }
  if (cur) parts.push(cur);
  head.n = parts.length; GSAVE.busy = true;
  const ok = (await Promise.all(parts.map((p, i) => gSet('game_' + i, p)))).every(Boolean) && await gSet('game', JSON.stringify(head));
  GSAVE.busy = false; if (ok) GSAVE.sig = sig; return ok;
}
setInterval(() => saveGame(false), 3000);
document.addEventListener('visibilitychange', () => { if (document.hidden) saveGame(true) });
if (GAME.ok && GAME.fresh) saveGame(true);

/* ---------- карта: рулетка участков ----------
   прокрутка бесплатна, когда участок докопан до дна; раньше — только за звёзды. Шансы на экране, гарант фиолетового.
   результат запоминается сразу (закрыть окно и перекрутить нельзя); «Перейти к участку» — новый участок, старый пропадает навсегда */
const PLOT_ODDS = [['g', 70], ['b', 25], ['p', 5]], GUAR = 10, SPIN_STARS = 20;
{ const st = document.createElement('style'); st.textContent = `
#mapwrap .map{width:min(100%,420px);max-height:calc(100vh - 32px);overflow:auto}
.rl{position:relative;height:118px;overflow:hidden;background:#100d0a;border-radius:2px;box-shadow:inset 0 0 0 2px #2a221b,inset 0 0 24px rgba(0,0,0,.8)}
.rl-strip{position:absolute;left:0;top:10px;display:flex;gap:6px;will-change:transform}
.rl-card{flex:none;width:76px;height:98px;border-radius:3px;background:#1e1813;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;
  box-shadow:inset 0 0 0 2px var(--rc),inset 0 -14px 18px -10px var(--rc);font:600 10px system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#e9f0ee;text-align:center}
.rl-card canvas{width:44px;height:44px;image-rendering:pixelated}
.rl-card.win{animation:rlwin 1s ease-in-out infinite alternate}
@keyframes rlwin{to{box-shadow:inset 0 0 0 3px var(--rc),0 0 18px var(--rc),inset 0 -20px 24px -10px var(--rc)}}
.rl-mark{position:absolute;left:50%;top:0;bottom:0;width:2px;margin-left:-1px;background:#f2c14e;box-shadow:0 0 8px #f2c14e;z-index:2}
.rl-mark::before,.rl-mark::after{content:'';position:absolute;left:-6px;border:7px solid transparent}
.rl-mark::before{top:0;border-top-color:#f2c14e}.rl-mark::after{bottom:0;border-bottom-color:#f2c14e}
.rl-odds{display:flex;flex-wrap:wrap;gap:4px 10px;margin:8px 0 2px;font:500 11.5px system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--muted)}
.rl-odds b{display:inline-block;width:9px;height:9px;border-radius:2px;margin-right:4px;vertical-align:-1px}
.rl-res{min-height:20px;margin:8px 0 6px;font:700 14px system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--fg);text-align:center}
.rl-go{display:block;width:100%;padding:11px 12px;border:0;border-radius:2px;background:var(--active);color:#1a140c;font:800 14px system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;cursor:pointer;box-shadow:inset 0 -3px 0 rgba(0,0,0,.25)}
.rl-go:disabled{opacity:.45;cursor:default}
.rl-go.star{background:#f7c948}
.rl-note{margin:6px 0 0;font:500 11.5px system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--muted);text-align:center}
.pl-card{margin-top:12px;padding:10px 12px;border-radius:2px;background:#1a1612;box-shadow:inset 0 0 0 2px #2a221b;display:grid;grid-template-columns:auto 1fr;gap:10px;align-items:center}
.pl-card canvas{width:54px;height:54px;image-rendering:pixelated;border-radius:2px}
.pl-card h3{margin:0 0 4px;font:700 14px system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--fg)}
.pl-chip{display:inline-block;padding:1px 7px;border-radius:9px;font:700 11px system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#101010;margin-left:6px;vertical-align:1px}
.pl-stats{display:grid;grid-template-columns:auto auto;gap:2px 12px;font:500 12.5px system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--muted)}
.pl-stats b{color:var(--fg);font-variant-numeric:tabular-nums;text-align:right}
.mv-veil{position:fixed;inset:0;z-index:50;display:grid;place-items:center;background:#0b0f16;color:#e9f0ee;font:700 16px system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
`; document.head.appendChild(st) }

/* значок участка: срез земли — трава, слои по редкости, рамка цветом редкости */
function plotIcon(r) {
  const c = document.createElement('canvas'); c.width = c.height = 16; const x = c.getContext('2d');
  const L = { g: ['#ad7757', '#8a5a44', '#7a4836', '#6d6a70'], b: ['#ad7757', '#c06a4a', '#9a4a3a', '#5d5a66'], p: ['#8a5a44', '#5d5a66', '#7d4fb0', '#4a3a6a'] }[r];
  x.fillStyle = '#0c0a08'; x.fillRect(0, 0, 16, 16);
  for (let y = 2; y < 14; y++) { x.fillStyle = y < 4 ? (y < 3 ? '#5fae45' : '#3f7a34') : L[Math.min(3, (y - 4) / 2.6 | 0)]; x.fillRect(2, y, 12, 1) }
  const rnd = mulberry(r.charCodeAt(0) * 97); for (let k = 0; k < 14; k++) { x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(2 + (rnd() * 12 | 0), 4 + (rnd() * 10 | 0), 1, 1) }
  if (r === 'p') { x.fillStyle = '#e3b6ff'; x.fillRect(6, 9, 1, 1); x.fillRect(10, 11, 1, 1); x.fillRect(8, 6, 1, 1) }
  if (r === 'b') { x.fillStyle = '#9cc6ff'; x.fillRect(5, 10, 2, 1) }
  x.strokeStyle = RAR[r].col; x.lineWidth = 1; x.strokeRect(1.5, 1.5, 13, 13);
  return c;
}
{
  const box = mapwrap.querySelector('.map'); box.querySelector('h2').textContent = 'Участки';
  const oldGrid = document.getElementById('mapgrid'); if (oldGrid) oldGrid.remove();
  const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e };
  const rl = h('div', 'rl'), strip = h('div', 'rl-strip'); rl.append(strip, h('i', 'rl-mark'));
  const odds = h('div', 'rl-odds'), res = h('div', 'rl-res'), go = h('button', 'rl-go'), note = h('div', 'rl-note'), card = h('div', 'pl-card');
  go.type = 'button'; box.append(rl, odds, res, go, note, card);
  const canPay = !!(tg && tg.initData && tg.openInvoice && tg.isVersionAtLeast && tg.isVersionAtLeast('6.1'));
  const done = () => cur() >= DIG;
  const CW = 76, STEP = 82;
  let spinning = false;
  const cardEl = r => { const c = h('div', 'rl-card'); c.style.setProperty('--rc', RAR[r].col); c.append(plotIcon(r), h('div', '', RAR[r].name), h('div', '', RAR[r].layers + ' слоёв')); return c };
  const roll = () => { if (GAME.p >= GUAR - 1) return 'p'; let x = Math.random() * 100; for (const [r, w] of PLOT_ODDS) if ((x -= w) < 0) return r; return 'g' };
  const filler = () => { let x = Math.random() * 100; for (const [r, w] of [['g', 60], ['b', 28], ['p', 12]]) if ((x -= w) < 0) return r; return 'g' };
  function fillStrip(win, at, total) { strip.textContent = ''; for (let k = 0; k < total; k++) strip.append(cardEl(k === at ? win : filler())) }
  const offsetFor = (at, jit) => at * STEP + CW / 2 - rl.clientWidth / 2 + jit;
  function renderOdds() {
    odds.textContent = '';
    for (const [r, w] of PLOT_ODDS) { const s = h('span'); const b = h('b'); b.style.background = RAR[r].col; s.append(b, `${RAR[r].name} ${w}%`); odds.append(s) }
    odds.append(h('span', '', `Гарант фиолетового: через ${Math.max(1, GUAR - GAME.p)}`));
  }
  function renderCard() {
    card.textContent = ''; const r = GAME.pl.r, ic = plotIcon(r);
    const info = h('div'), t = h('h3', '', `Участок №${GAME.pl.n}`), chip = h('span', 'pl-chip', RAR[r].name); chip.style.background = RAR[r].col; t.append(chip);
    const s = h('div', 'pl-stats');
    for (const [k, v] of [['Прокопано слоёв', `${Math.min(cur(), DIG)} / ${DIG}`], ['Найдено мусора', GAME.st.f], ['Заработано здесь', GAME.st.e + ' 🪙']]) s.append(h('span', '', k), h('b', '', String(v)));
    info.append(t, s); card.append(ic, info);
  }
  function renderButton() {
    note.textContent = ''; go.classList.remove('star'); go.disabled = spinning;
    if (GAME.nx) { go.textContent = 'Перейти к участку'; note.textContent = 'Текущий участок пропадёт навсегда — вернуться на него нельзя'; return }
    if (done()) { go.textContent = 'Крутить бесплатно'; note.textContent = 'Участок докопан до дна — прокрутка бесплатная'; return }
    go.classList.add('star'); go.textContent = `Крутить за ${SPIN_STARS} ⭐`;
    note.textContent = canPay ? 'Бесплатно — когда докопаешь участок до дна. Уйдёшь — вернуться нельзя' : 'Сейчас — только в Телеграме. Бесплатно — когда докопаешь участок до дна';
    if (!canPay) go.disabled = true;
  }
  function render() {
    renderOdds(); renderCard(); renderButton();
    if (spinning) return;
    if (GAME.nx) { fillStrip(GAME.nx.r, 3, 7); requestAnimationFrame(() => { strip.style.transform = `translateX(${-offsetFor(3, 0)}px)`; strip.children[3].classList.add('win') }); res.textContent = `Выпал: ${RAR[GAME.nx.r].name} участок · ${RAR[GAME.nx.r].layers} слоёв` }
    else { fillStrip(GAME.pl.r, 3, 7); requestAnimationFrame(() => strip.style.transform = `translateX(${-offsetFor(3, 0)}px)`); res.textContent = '' }
  }
  async function spin() {
    if (spinning || GAME.nx) return; spinning = true; renderButton();
    const r = roll(); GAME.p = r === 'p' ? 0 : GAME.p + 1;
    GAME.nx = { r, s: newSeed(), n: GAME.pl.n + 1 }; saveGame(true);          // результат записан до анимации
    const AT = 42, TOTAL = 48, jit = (Math.random() - .5) * CW * .7; fillStrip(r, AT, TOTAL);
    const x1 = offsetFor(AT, jit), T = 5200, t0 = performance.now(); let lastK = -1; res.textContent = '';
    strip.style.transform = 'translateX(0px)';
    await new Promise(fin => {
      const step = now => {
        const k = Math.min(1, (now - t0) / T), e = 1 - Math.pow(1 - k, 4), x = x1 * e;
        strip.style.transform = `translateX(${-x}px)`;
        const under = Math.floor((x + rl.clientWidth / 2) / STEP); if (under !== lastK) { lastK = under; try { tg && tg.HapticFeedback && tg.HapticFeedback.selectionChanged() } catch (_) { } }
        if (k < 1) requestAnimationFrame(step); else fin();
      };
      requestAnimationFrame(step);
    });
    strip.children[AT].classList.add('win'); haptic(r === 'p' ? 'heavy' : 'medium');
    res.textContent = `Выпал: ${RAR[r].name} участок · ${RAR[r].layers} слоёв`;
    spinning = false; renderOdds(); renderButton();
  }
  async function move() {
    if (!GAME.nx) return; go.disabled = true;
    const veil = h('div', 'mv-veil', 'Переезжаем на новый участок…'); document.body.append(veil);
    GAME.pl = GAME.nx; GAME.nx = null; GAME.moving = true; GAME.u = []; GAME.st = { f: 0, e: 0 }; SPOTS.forEach(s => s.state = 0);
    await saveGame(true, []);                                     // вещи, брошенные на старом участке, остаются там; дом переезжает с Кирью
    location.reload();
  }
  go.addEventListener('click', async () => {
    haptic('light');
    if (GAME.nx) return move();
    if (done()) return spin();
    if (!canPay) return;
    go.disabled = true;
    try {
      const r = await fetch(PAY_API + '/api/invoice', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ initData: tg.initData, product: 'spin' }) }).then(r => r.json());
      if (!r.link) throw new Error(r.error || 'нет ссылки');
      tg.openInvoice(r.link, status => { if (status === 'paid') spin(); else { if (status === 'failed') toast('Оплата не прошла'); renderButton() } });
    } catch (e) { toast('Не получилось открыть оплату — попробуй позже'); renderButton() }
  });
  mapbtn.addEventListener('click', () => { mapwrap.hidden = false; render(); mapclose.focus(); haptic('light') });
  mapclose.addEventListener('click', () => { if (spinning) return; mapwrap.hidden = true; mapbtn.focus(); haptic('light') });
}
Object.assign(window.__dbg, { GAME, saveGame, digAll: () => { for (let k = 0; k < 600 && cur() < DIG; k++) digCell(d.indexOf(cur())) } });
// для автопроверок (tests/): создать вещь, мешок, телефон, проверки переноски — игре это ничем не мешает
Object.assign(window.__dbg, { makeTrash, TYPES, CATS, PRICE, BAG, BC, bagOpen, bagClose, floorY, ACT, holdFreeAt, upFreeAt, trashOverlap, openPhone, closePhone, PH, SMS });
Object.defineProperty(window.__dbg, 'VCAM', { get: () => VCAM });   // живая ссылка: Object.assign скопировал бы только текущее значение
