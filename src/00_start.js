import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { createKiryu } from './kiryu.js?v=10';
import { createMerchant } from './merchant.js?v=1';
import { createKudzuya } from './kudzuya.js?v=1';

/* ===== 3D-версия: яма 4×4 на 20 слоёв, кубы из ваших тайлов, физика мусора ===== */
/* ---------- сохранение игры и участки ----------
   участок: редкость (зелёный / синий / фиолетовый), номер и зерно генерации; первый зелёный — ручной план из редактора.
   из зерна заново получаются и слои, и закопанный мусор, поэтому сохраняем только то, что изменил игрок:
   сколько выкопано в каждой клетке, какие предметы уже откопаны, где лежат откопанные вещи вне дома, монеты и счётчики.
   ключи облака Телеграма (у каждого игрока своё; в браузере — localStorage): game = {v, …, n}, game_0.. = вещи «тип,x,y,z,qx,qy,qz,qw;…» */
const RAR = {
  g: { name: 'Зелёный', col: '#5fc24a', layers: 20, trash: .6 },
  b: { name: 'Синий', col: '#4a90ff', layers: 27, trash: .7 },
  p: { name: 'Фиолетовый', col: '#b65cff', layers: 35, trash: .8 },
};
const GAME_V = 1;
const mulberry = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 };
const GCLOUD = (() => { const w = window.Telegram && window.Telegram.WebApp; return w && w.initData && w.CloudStorage && w.isVersionAtLeast && w.isVersionAtLeast('6.9') ? w.CloudStorage : null })();
const gGet = keys => new Promise(res => {
  const t = setTimeout(() => res(null), 5000), done = v => { clearTimeout(t); res(v) };
  if (GCLOUD) { try { GCLOUD.getItems(keys, (e, v) => done(e ? null : v || {})) } catch (_) { done(null) } return }
  const v = {}; try { for (const k of keys) v[k] = localStorage.getItem('tl_' + k) || '' } catch (_) { return done(null) } done(v);
});
const gSet = (key, val) => new Promise(res => {
  if (GCLOUD) { try { GCLOUD.setItem(key, val, e => res(!e)) } catch (_) { res(false) } return }
  try { localStorage.setItem('tl_' + key, val); res(true) } catch (_) { res(false) }
});
const newSeed = () => 1 + (Math.random() * 2147483000 | 0);
async function loadGame() {
  const fresh = ok => ({ v: GAME_V, c: 0, p: 0, pl: { r: 'g', s: newSeed(), n: 1, h: 1 }, d: null, u: [], st: { f: 0, e: 0 }, w: null, nx: null, items: [], fresh: true, ok });
  const v = await gGet(['game']); if (!v) return fresh(false);           // хранилище не ответило — играем, но не пишем, чтобы не затереть прогресс
  let h = null; try { h = v.game ? JSON.parse(v.game) : null } catch (_) { }
  if (!h || h.v !== GAME_V || !h.pl || !RAR[h.pl.r]) return fresh(true);
  const items = [];
  if (h.n) {
    const w = await gGet([...Array(h.n).keys()].map(i => 'game_' + i)); if (!w) return { ...fresh(false) };
    for (let i = 0; i < h.n; i++) for (const r of (w['game_' + i] || '').split(';')) { const [type, ...n] = r.split(','), a = n.map(Number); if (type && a.length === 7 && !a.some(isNaN)) items.push([type, ...a]) }
  }
  return { ...h, u: h.u || [], st: h.st || { f: 0, e: 0 }, items, fresh: false, ok: true };
}
/* слои нового участка: полосы материалов по глубине, свои у каждой редкости, плюс пещеры; ниже дна — 10 слоёв камня */
function genPlot(r, seed) {
  const R = mulberry(seed ^ 0x5bd1e995), L = RAR[r].layers, out = [];
  const PAL = {
    g: [[.06, 'Т'], [.22, 'ЗЗЗП'], [.5, 'ППЯГЗ'], [.75, 'ККПБ'], [1, 'ГБКК']],
    b: [[.04, 'Т'], [.14, 'ЗЗГ'], [.5, 'ГГГББП'], [.78, 'БККГ'], [1, 'ККГБ']],
    p: [[.03, 'Т'], [.1, 'ЗП'], [.32, 'ККБР'], [.6, 'ВРЯК'], [.85, 'ККВВР'], [1, 'ЯРВК']],
  }[r], CAVE = { g: .05, b: .08, p: .13 }[r];
  const pick = s => s[R() * s.length | 0];
  for (let z = 0; z < L; z++) {
    const band = (PAL.find(([f]) => z / L < f) || PAL[PAL.length - 1])[1], base = pick(band);
    const row = [0, 1, 2].map(() => [0, 1, 2].map(() => R() < .7 ? base : pick(band)));
    if (z === 0) row.forEach(rr => rr.fill('Т'));
    if (z > 3 && z < L - 2 && R() < CAVE) { const n = 1 + (R() < .4 ? 1 : 0); for (let k = 0; k < n; k++) row[1 + (R() * 2 | 0)][1 + (R() * 2 | 0)] = '.' }
    out.push(row);
  }
  for (let z = 0; z < 10; z++) out.push([0, 1, 2].map(() => ['К', 'К', 'К']));
  return out;
}
const GAME = await loadGame();
const PLOT = GAME.pl.h ? window.PLOT3D : genPlot(GAME.pl.r, GAME.pl.s), TEX = window.TEX3D;
const N = 6, DIG = PLOT.length - 10, BOT = DIG + 10;   // ниже дна ямы — ещё 10 слоёв цельного камня, чтобы мир не обрывался            // сетка 6×6: две декоративные стенки сзади и сбоку, яма — передние 4×4; нижние 10 слоёв срезаны
const PIT0 = 2, PIT1 = 6, PC = (PIT0 + PIT1) / 2; // яма занимает x,z от 2 до 6
const ACT = []; for (let j = PIT0; j < PIT1; j++) for (let i = PIT0; i < PIT1; i++) ACT.push([i, j]);
const BH = 0.8165;                               // высота блока: кубы выглядят ровно как изометрические спрайты
/* лавка подземного торговца — ниша в правой декоративной стенке (ряд j=1): клетки i0..i1-1, слои z0..z1 (2 блока высотой) */
const SHOP = { i0: 2, i1: 6, j0: 0, j1: 1, z0: 3, z1: 4, revealed: false };   // во всю видимую стенку, 2 блока в глубину; сбоку открыто
SHOP.floor = -(SHOP.z1 + 1) * BH; SHOP.ceil = -SHOP.z0 * BH;
const BASKET = { x: 5.02, z: 1.42, r: .5, h: .62 };          // огромная корзина справа от торговца
const WIN = { x0: BASKET.x - .55, x1: BASKET.x + .55 };      // «окно» в невидимой стенке — только над корзиной
const MERCH = { x: 3.75, z: 1.4, ry: .15 };                 // где сидит торговец: у самого края, чуть развёрнут к игроку
const inShop = (i, j, z) => j >= SHOP.j0 && j <= SHOP.j1 && i >= SHOP.i0 && i < SHOP.i1 && z >= SHOP.z0 && z <= SHOP.z1;
const PX = 64 / Math.SQRT2;                      // пикселей на единицу мира (ромб верха = 64 px)

/* ---------- Telegram ---------- */
const tg = window.Telegram && window.Telegram.WebApp;
if (tg) { try { tg.ready(); tg.expand(); tg.disableVerticalSwipes && tg.disableVerticalSwipes(); tg.setHeaderColor('#1b2a3a'); tg.setBackgroundColor('#1b2a3a'); tg.setBottomBarColor && tg.setBottomBarColor('#14202c') } catch (e) {} }
const haptic = k => { try { tg && tg.HapticFeedback && (k === 'warn' ? tg.HapticFeedback.notificationOccurred('warning') : tg.HapticFeedback.impactOccurred(k)) } catch (e) {} };

/* ---------- иконки ---------- */
function icon(rows, pal, host) { const c = document.createElement('canvas'); c.width = c.height = rows.length; const x = c.getContext('2d');
  rows.forEach((r, y) => [...r].forEach((ch, i) => { if (pal[ch]) { x.fillStyle = pal[ch]; x.fillRect(i, y, 1, 1) } })); if (host) host.appendChild(c); return c }
const MAPI = ["................", "................", ".kkkkkkkkkkkkkk.", ".kppppPPPPppppk.", ".kpggpPPPPpppbk.", ".kpggpPPPbpprpk.", ".kpppbPPbPprrpk.", ".kpppbPPPPpprpk.", ".kppbpPPPPppppk.", ".kpbppPPPPpgggk.", ".kbpppPPPPpgggk.", ".kppppPPPPppppk.", ".kkkkkkkkkkkkkk.", "................", "................", "................"];
icon(MAPI, { k: '#10141f', p: '#e7d7a4', P: '#c4ad74', g: '#5f9c4f', b: '#7a4836', r: '#c8423a' }, document.getElementById('mapbtn'));
const XI = ["................", ".kk..........kk.", ".kxk........kxk.", "..kxk......kxk..", "...kxk....kxk...", "....kxk..kxk....", ".....kxkkxk.....", "......kxxk......", "......kxxk......", ".....kxkkxk.....", "....kxk..kxk....", "...kxk....kxk...", "..kxk......kxk..", ".kxk........kxk.", ".kk..........kk.", "................"];

/* ---------- инструменты в кожаной сумке: телефон (пока неактивен), кирка, лом, перчатка, садовая лопатка ---------- */
const TOOLS = ['phone', 'pick', 'bar', 'glove', 'trowel', 'bag', null, null, null];
const TOOL_NAME = { phone: 'Телефон', pick: 'Кирка', bar: 'Лом', glove: 'Перчатка', trowel: 'Садовая лопатка', bag: 'Мешок' };
const toolBtns = [...document.querySelectorAll('.tool')];
let tool = null, bagOn = false;                            // bagOn — Кирью занят мешком
const iconFx = {};                                         // тряска и подъём 3D-иконок
for (const t of TOOLS) if (t) iconFx[t] = { shake: 0, lift: 0 };
function shakeTool(t) { if (iconFx[t]) iconFx[t].shake = .4; haptic('warn') }
function setTool(t) {
  if (t === 'bag') { bagToggle(); return }
  if (bagOn) { shakeTool(t); toast('Сначала сверну мешок', 0); return }
  if (t === 'phone') { openPhone(); return }
  tool = tool === t ? null : t; haptic('light');
  if (tool === 'trowel' && !setTool.tw) { setTool.tw = true; toast('Лопатка… ей рыхлят землю, где на стенке черви', 0) }
  toolBtns.forEach((b, k) => b.setAttribute('aria-pressed', TOOLS[k] && TOOLS[k] === tool ? 'true' : 'false'));
}
toolBtns.forEach((b, k) => { const t = TOOLS[k];
  if (!t) { b.disabled = true; b.setAttribute('aria-label', 'Пустой карман'); return }
  b.setAttribute('aria-label', TOOL_NAME[t]);
  b.addEventListener('click', () => setTool(t)) });
setTool('pick');
/* кожаная сумка рисуется по пикселям один раз (80×90, на экране вдвое крупнее): откинутый клапан, скатанная горловина
   с ремешком и пряжкой, строчка по краю, полукольцо сбоку и 3×3 кармашка — тёмная глубина и передняя стенка со строчкой */
function drawBag(cnv) {
  const x = cnv.getContext('2d'), W = cnv.width, H = cnv.height; x.clearRect(0, 0, W, H);
  const put = (px, py, c) => { x.fillStyle = c; x.fillRect(px, py, 1, 1) };
  const nz = (px, py) => { let h = Math.imul(px * 374761393 + py * 668265263, 1274126177); h ^= h >>> 15; return (h >>> 0) / 4294967296 };   // крапинки кожи
  const ins = (px, py, s) => { if (px < s.x || py < s.y || px >= s.x + s.w || py >= s.y + s.h) return false;
    const top = py < s.y + s.h / 2, r = top ? s.rt : s.rb; if (!r) return true;
    const cx = px < s.x + r ? s.x + r : px >= s.x + s.w - r ? s.x + s.w - r : null, cy = top ? (py < s.y + r ? s.y + r : null) : (py >= s.y + s.h - r ? s.y + s.h - r : null);
    return cx === null || cy === null || (px + .5 - cx) ** 2 + (py + .5 - cy) ** 2 <= r * r };
  const paint = (s, col, edge) => { for (let py = s.y; py < s.y + s.h; py++) for (let px = s.x; px < s.x + s.w; px++) if (ins(px, py, s)) {
    const e = !ins(px - 1, py, s) || !ins(px + 1, py, s) || !ins(px, py - 1, s) || !ins(px, py + 1, s); put(px, py, e && edge ? edge : col(px, py)) } };
  const OUT = '#2a1408', ST = '#e9c88c', BR = '#e3b24b', BRL = '#fff3bf', BRD = '#8a5f1a', STRAP = '#6e3d1d';
  const body = { x: 2, y: 12, w: 72, h: 75, rt: 3, rb: 7 }, flap = { x: 7, y: 2, w: 62, h: 14, rt: 6, rb: 0 };
  x.fillStyle = 'rgba(0,0,0,.34)';                               // тень сумки
  for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) if (!ins(px, py, body) && ins(px - 2, py - 3, body)) x.fillRect(px, py, 1, 1);
  paint(flap, (px, py) => py < 4 ? '#5d331b' : nz(px, py) < .07 ? '#3a1f0e' : '#4a2814', OUT);   // откинутый клапан позади
  for (let px = flap.x + 5; px < flap.x + flap.w - 5; px++) if ((px >> 1) % 2 === 0) put(px, 5, '#9c7748');
  paint(body, (px, py) => { const dy = py - body.y, l = px - body.x, r = body.x + body.w - 1 - px;   // корпус: свет слева сверху, тень справа и снизу
    if (dy <= 1) return '#cd9056'; if (dy === 2) return '#b4743f'; if (dy === 3) return '#9a5f33'; if (dy === 4) return '#5e3318';   // скатанный край горловины
    if (l === 1) return '#b4743f'; if (r <= 2) return '#7a4625';
    if (dy > body.h - 6) return '#6a3b1d'; if (dy > body.h - 11) return '#7d4826';
    if (px > 4 && px < 73 && py > 16 && py < 85) return '#9a5f33';   // вокруг ячеек кожа ровная, без крапинок
    const n = nz(px, py); return n < .05 ? '#87502a' : n < .085 ? '#ab6d3b' : '#9a5f33' }, OUT);
  for (let py = body.y + 8; py < body.y + body.h - 4; py++) if ((py >> 1) % 2 === 0) { put(body.x + 2, py, ST); put(body.x + body.w - 3, py, ST) }   // строчка по краю
  for (let px = body.x + 6; px < body.x + body.w - 6; px++) if ((px >> 1) % 2 === 0) put(px, body.y + body.h - 3, ST);
  for (let r = 0; r < 3; r++) for (let q = 0; q < 3; q++) {      // простые ячейки: тёмное углубление без узоров — инструменты читаются сразу
    const x0 = 7 + 22 * q, y0 = 19 + 22 * r;
    paint({ x: x0, y: y0, w: 20, h: 20, rt: 2, rb: 2 }, (px, py) => py - y0 <= 1 ? '#22130a' : py - y0 >= 18 ? '#55361f' : '#3a2416', '#1c0f07');
  }
  paint({ x: 34, y: 4, w: 8, h: 13, rt: 0, rb: 0 }, (px, py) => px === 35 ? '#8e5530' : STRAP, OUT);   // ремешок от клапана
  for (let py = 6; py < 10; py += 2) put(38, py, '#c9a26a');
  paint({ x: 32, y: 9, w: 12, h: 8, rt: 1, rb: 1 }, (px, py) => py === 10 || px === 33 ? BRL : BR, BRD);   // пряжка
  for (let px = 34; px < 42; px++) for (let py = 11; py < 15; py++) put(px, py, py === 11 ? '#8e5530' : STRAP);
  put(37, 11, BRL); put(37, 12, BR); put(37, 13, BR); put(37, 14, BRD);   // язычок пряжки
  paint({ x: 72, y: 22, w: 4, h: 11, rt: 0, rb: 0 }, (px, py) => px === 72 ? '#8e5530' : STRAP, OUT);   // петля и полукольцо сбоку
  for (const [px, py, c] of [[76, 22, BR], [77, 23, BRL], [78, 24, BRL], [78, 25, BR], [78, 26, BR], [78, 27, BR], [78, 28, BR], [78, 29, BRD], [77, 30, BRD], [76, 31, BRD], [76, 23, BRD], [76, 30, BR]]) put(px, py, c);
  for (const [px, py] of [[73, 24], [73, 30]]) put(px, py, BR);
}

{ const c = document.querySelector('.pouch .bagbg'); if (c) drawBag(c) }

