/* Автопроверки игры: запускают её в браузере без экрана и проходят основные сценарии.
   Запуск:  sh tests/setup.sh  (один раз)  затем  node tests/smoke.cjs  [имена сценариев через пробел]
   Каждый сценарий — в чистом браузере (без сохранений). Упал — код выхода 1, скриншоты всех сценариев в tests/out/.
   Сценарии опираются на window.__dbg из 3d_main.js — при разделении кода на модули его нужно сохранить. */
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const ROOT = path.resolve(__dirname, '..'), CACHE = path.join(__dirname, '.cache'), OUT = path.join(__dirname, 'out');
const PAGE = process.env.PAGE || 'index.html';

async function openGame(browser) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 760 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage(), errors = [];
  p.on('pageerror', e => errors.push('JS: ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|vibrate/.test(m.text())) errors.push('console: ' + m.text()); if (m.type() === 'warning' && /без категории/.test(m.text())) errors.push(m.text()) });
  await p.route('**/*', r => {
    const u = r.request().url();
    if (u.includes('three.module.js')) return r.fulfill({ path: path.join(CACHE, 'three/build/three.module.js'), contentType: 'text/javascript' });
    if (u.includes('cannon-es.js')) return r.fulfill({ path: path.join(CACHE, 'cannon-es/dist/cannon-es.js'), contentType: 'text/javascript' });
    if (u.startsWith('http://game/')) { const f = path.join(ROOT, decodeURIComponent(new URL(u).pathname)); if (!fs.existsSync(f)) return r.fulfill({ status: 404 });
      return r.fulfill({ path: f, contentType: f.endsWith('.js') ? 'text/javascript' : f.endsWith('.html') ? 'text/html' : undefined }) }
    return r.abort();                                            // Telegram, оплата и прочий интернет — не нужны
  });
  await p.goto('http://game/' + PAGE);
  await p.waitForFunction(() => window.__dbg && window.__dbg.CH && window.__dbg.makeTrash, null, { timeout: 30000 });
  await p.waitForTimeout(2500);
  // помощники внутри страницы
  await p.evaluate(() => {
    const D = window.__dbg;
    window.T = {
      dig(n) { for (let L = 0; L < n; L++) for (let a = 0; a < D.ACT.length; a++) if (D.d[a] === D.cur()) D.digCell(a) },
      spawn(type, x, y, z, ry = 0) { const t = D.makeTrash(type, x, y, z, ry, 0); D.activate(t); return t },
      put(x, z) { const CH = D.CH; CH.x = x; CH.z = z; CH.y = D.floorY(D.ACT.findIndex(([i, j]) => x >= i && x < i + 1 && z >= j && z < j + 1)) },
      hold(type) { const CH = D.CH, t = this.spawn(type, CH.x - .5, CH.y + .3, CH.z); window.__held = t;
        D.setTool('glove'); CH.face.set(-1, 0, 0); CH.yaw = -Math.PI / 2; D.grabItem(t); return t },
      joy(x, y) { D.joy.x = x; D.joy.y = y },
      st() { const CH = D.CH; return { x: CH.x, y: CH.y, z: CH.z, yaw: CH.yaw, up: CH.up || 0, state: CH.state } },
    };
  });
  return { p, ctx, errors };
}
const J = { px: [.7, .7], mx: [-.7, -.7], pz: [-.7, .7], mz: [.7, -.7] };   // джойстик: куда идёт Кирью по осям мира (+x, −x, +z, −z)
async function walk(p, dir, ms) { await p.evaluate(([x, y]) => T.joy(x, y), J[dir]); await p.waitForTimeout(ms); await p.evaluate(() => T.joy(0, 0)); await p.waitForTimeout(150); return p.evaluate(() => T.st()) }
const until = (p, fn, ms, arg) => p.waitForFunction(fn, arg, { timeout: ms, polling: 100 }).then(() => true, () => false);

const SCEN = {
  async load({ p }, ok) {
    const info = await p.evaluate(() => { const D = window.__dbg; return { cats: Object.keys(D.TYPES).filter(k => !D.CATS[D.TYPES[k].cat]), st: T.st() } });
    ok(info.cats.length === 0, 'у всех вещей есть категория', info.cats.join(','));
    ok(info.st.state === 'walk', 'Кирью стоит и ходит', info.st.state);
  },
  async dig({ p }, ok) {
    await p.evaluate(() => { T.put(4.5, 4.5); T.dig(3) });
    await p.waitForTimeout(2500);
    const r = await p.evaluate(() => ({ cur: window.__dbg.cur(), st: T.st(), fl: window.__dbg.floorY(0) }));
    ok(r.cur === 3, 'выкопано 3 слоя', r.cur);
    ok(Math.abs(r.st.y - r.fl) < .05 && r.st.state === 'walk', 'Кирью упал на дно и стоит', JSON.stringify(r.st));
  },
  async carryEdge({ p }, ok) {
    await p.evaluate(() => { T.put(3.5, 4.5); T.hold('pipeHalf') });
    const s = await walk(p, 'px', 3500);
    ok(s.x > 5.7, 'с вещью доходит до края участка вплотную', s.x.toFixed(2));
    ok(s.up > .99, 'у края вещь над головой', s.up.toFixed(2));
    await p.evaluate(() => window.__dbg.act()); await p.waitForTimeout(2000);
    const b = await p.evaluate(() => { const b = window.__held.body.position; return { x: b.x, y: b.y, held: window.__held.held } });
    ok(!b.held && b.y > -.1 && b.y < .5 && b.x > 2 && b.x < 6, 'положил у края — вещь лежит на полу участка', JSON.stringify(b));
  },
  async carryDepth({ p }, ok) {
    await p.evaluate(() => { T.dig(3); T.put(3.5, 3.5); T.hold('pipeHalf') });
    await p.waitForTimeout(500);
    let path = 0, prev = await p.evaluate(() => T.st());
    for (const d of ['mx', 'mz', 'px', 'pz', 'mx', 'pz', 'px', 'mz']) { const s = await walk(p, d, 1400); path += Math.hypot(s.x - prev.x, s.z - prev.z); prev = s }
    ok(path > 5, 'с вещью ходит по яме у стенок и не застревает', 'путь ' + path.toFixed(2));
    const s = await walk(p, 'mx', 2500); ok(s.x < 2.6, 'подходит к задней стенке', s.x.toFixed(2));
  },
  async noAutoRotate({ p }, ok) {
    await p.evaluate(() => { T.dig(3); T.put(3.5, 3.5); T.hold('skeleton') });
    const r0 = await p.evaluate(() => window.__held.carryRot || 0); let changed = false;
    for (const d of ['mx', 'mz', 'px', 'pz', 'px', 'mz']) { await walk(p, d, 1200); if (await p.evaluate(r => (window.__held.carryRot || 0) !== r, r0)) changed = true }
    // у задней стенки разворачивается вдоль неё: поперёк скелет не помещается — раньше он тут сам перехватывался «за голову»
    await p.evaluate(() => { T.put(2.5, 5.4); const CH = window.__dbg.CH; CH.face.set(0, 0, -1); CH.yaw = Math.PI }); await p.waitForTimeout(600);
    if (await p.evaluate(r => (window.__held.carryRot || 0) !== r, r0)) changed = true;
    ok(!changed, 'скелет в руках сам не перехватывается');
  },
  async pile({ p }, ok) {
    await p.evaluate(() => { T.put(4.4, 4.4); ['coffee', 'beer', 'glass', 'milk', 'tin', 'pipeHalf'].forEach((ty, k) => T.spawn(ty, 5.1 + (k % 3) * .15, .4 + (k / 3 | 0) * .2, 4.3 + (k % 2) * .15, k)) });
    await p.waitForTimeout(4000);
    const ov = await p.evaluate(() => window.__dbg.trash.filter(t => t.active && t.body && !t.held && window.__dbg.trashOverlap(t)).map(t => t.type));
    ok(ov.length === 0, 'вещи, появившиеся друг в друге, разошлись', ov.join(','));
    await p.evaluate(() => { T.put(4.75, 4.45); T.hold('coffee'); window.__dbg.CH.face.set(1, 0, 0); window.__dbg.CH.yaw = Math.PI / 2 });
    await p.waitForTimeout(600); await p.evaluate(() => window.__dbg.act()); await p.waitForTimeout(2500);
    const y = await p.evaluate(() => window.__held.body.position.y);
    ok(y > .2, 'поставленная на кучу вещь лежит сверху, а не внутри', y.toFixed(2));
  },
  async bagSurface(g, ok) { await bag(g, ok, 0) },
  async bagDepth(g, ok) { await bag(g, ok, 5) },
  async ladder({ p }, ok) {
    await p.evaluate(() => { T.dig(4); T.put(4.2, 3.5); T.hold('ladder') });
    await walk(p, 'mx', 3000);
    await p.evaluate(() => window.__dbg.act()); await p.waitForTimeout(3000);
    const r = await p.evaluate(() => ({ lads: [...window.__dbg.LADS.keys()], held: !!window.__dbg.CH.held }));
    ok(r.lads.length > 0 && !r.held, 'принёс лестницу к стенке и повесил', JSON.stringify(r));
  },
  async phone({ p }, ok) {
    await p.evaluate(() => window.__dbg.openPhone()); const on = await until(p, () => window.__dbg.PH.on && window.__dbg.PH.k > .9, 6000);
    ok(on, 'телефон открылся');
    await p.evaluate(() => window.__dbg.closePhone()); const off = await until(p, () => !window.__dbg.PH.on && window.__dbg.PH.k < .05, 6000);
    ok(off, 'телефон закрылся');
  },
};
async function bag({ p }, ok, depth) {
  await p.evaluate(dp => { if (dp) T.dig(dp); T.put(dp ? 3.4 : 4.5, dp ? 4.6 : 4.5) }, depth); await p.waitForTimeout(1500);   // на поверхности — там, где лестница дома заслоняла камеру
  await p.evaluate(() => { window.__nearBad = []; const D = window.__dbg;
    const f = () => { const c = D.VCAM; if (c && c.isPerspectiveCamera && D.BC.on) { const r = c.position.distanceTo(new D.THREE.Vector3(D.CH.x, D.CH.y + 1, D.CH.z)); if (r < 25 && c.near > .06) window.__nearBad.push(+c.near.toFixed(2)) } if (!window.__stopNear) requestAnimationFrame(f) }; f() });
  await p.locator('.tool').nth(5).click();
  const ui = await until(p, () => window.__dbg.BAG.ph === 'ui', 20000); ok(ui, 'мешок расстелился');
  await p.waitForTimeout(800); await p.screenshot({ path: path.join(OUT, (depth ? 'bagDepth' : 'bagSurface') + '_open.png') });
  if (ui) await p.locator('#bagui button').click();
  const done = await until(p, () => window.__dbg.CH.state === 'walk' && !window.__dbg.BC.on, 20000); ok(done, 'мешок свернулся, камера вернулась');
  const bad = await p.evaluate(() => { window.__stopNear = true; return window.__nearBad });
  ok(bad.length === 0, 'камера мешка не срезает землю (нет мерцания)', bad.slice(0, 5).join(','));
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const only = process.argv.slice(2), names = Object.keys(SCEN).filter(n => !only.length || only.includes(n));
  const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  let fails = 0; const t0 = Date.now();
  for (const n of names) {
    const g = await openGame(browser), res = [];
    const ok = (cond, what, info = '') => res.push([!!cond, what, info]);
    try { await SCEN[n](g, ok) } catch (e) { res.push([false, 'сценарий упал', e.message.split('\n')[0]]) }
    await g.p.waitForTimeout(300); await g.p.screenshot({ path: path.join(OUT, n + '.png') });
    for (const e of g.errors) res.push([false, 'ошибка в игре', e.slice(0, 200)]);
    const bad = res.filter(r => !r[0]); fails += bad.length;
    console.log((bad.length ? '✗ ' : '✓ ') + n);
    for (const [c, w, i] of res) if (!c || process.env.V) console.log('    ' + (c ? 'ok  ' : 'FAIL') + ' ' + w + (i !== '' ? ' — ' + i : ''));
    await g.ctx.close();
  }
  await browser.close();
  console.log(`\n${names.length} сценариев, ${fails ? fails + ' ошибок' : 'всё прошло'} · ${((Date.now() - t0) / 1000).toFixed(0)} с`);
  process.exit(fails ? 1 : 0);
})();
