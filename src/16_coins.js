/* ---------- монеты ---------- */
const COINI = ["..kkkkk..", ".kyyyyyk.", "kyllyyydk", "kylyyyydk", "kyyyyyydk", "kyyyyyydk", "kyyyyyddk", ".kdddddk.", "..kkkkk.."];
const COINP = { k: '#5a3a10', y: '#f2c14e', l: '#fff3b0', d: '#c8902a' };
const coinsEl = document.getElementById('coins'), coinN = document.getElementById('coinN');
icon(COINI, COINP, coinsEl.querySelector('.ci'));
let coins = GAME.c | 0;
coinN.textContent = coins;
function showCoins() { coinN.textContent = coins; coinsEl.classList.remove('bump'); void coinsEl.offsetWidth; coinsEl.classList.add('bump') }
function addCoins(n, x, y, z) {
  coins += n; showCoins();
  if (x === undefined) return;
  const v = new THREE.Vector3(x, y, z).project(cam), r = cv.getBoundingClientRect(), sr = stage.getBoundingClientRect();
  const el = document.createElement('div'); el.className = 'plus'; el.textContent = '+' + n;
  el.style.left = (r.left - sr.left + (v.x + 1) / 2 * r.width) + 'px'; el.style.top = (r.top - sr.top + (1 - v.y) / 2 * r.height) + 'px';
  stage.appendChild(el); setTimeout(() => el.remove(), 1000);
}

/* ---------- окно лавки ---------- */
const WARES = [{ type: 'lantern', name: 'Фонарь', desc: 'Светит на четверть ямы', price: 6 }, { type: 'ladder', name: 'Лестница', desc: 'Вешается на стенку ямы', price: 4 }];
const shopwrap = document.getElementById('shopwrap'), shopclose = document.getElementById('shopclose'), shoplist = document.getElementById('shoplist');
icon(XI, { k: '#10141f', x: '#e9f0ee' }, shopclose);
function wareIcon(type, host) {                              // 3D-иконка товара тем же способом, что и инструменты
  const g = new THREE.Group(); TYPES[type].build(g); g.rotation.set(.35, .7, 0); g.updateMatrixWorld(true);   // вписываем в кадр по габаритам
  const bb = new THREE.Box3().setFromObject(g), k = 1.12 / Math.max(...bb.getSize(new THREE.Vector3()).toArray()); g.scale.setScalar(k); g.position.copy(bb.getCenter(new THREE.Vector3())).multiplyScalar(-k);
  icScene.add(g); icR.render(icScene, icCam); icScene.remove(g);
  const c = document.createElement('canvas'); c.width = c.height = ICO; c.getContext('2d').drawImage(icR.domElement, 0, 0); host.appendChild(c) }
function openShop() {
  shoplist.textContent = '';
  for (const w of WARES) {
    const row = document.createElement('div'); row.className = 'ware';
    const ic = document.createElement('div'); ic.className = 'wic'; wareIcon(w.type, ic); row.appendChild(ic);
    const tx = document.createElement('div'); tx.className = 'wtx'; tx.innerHTML = '<b></b><span></span>'; tx.querySelector('b').textContent = w.name; tx.querySelector('span').textContent = w.desc; row.appendChild(tx);
    const btn = document.createElement('button'); btn.className = 'buy'; const cc = document.createElement('i'); icon(COINI, COINP, cc); btn.append(cc, ' ' + w.price);
    btn.setAttribute('aria-label', 'Купить: ' + w.name + ' за ' + w.price); if (coins < w.price) btn.classList.add('poor');
    btn.addEventListener('click', () => buy(w, btn)); row.appendChild(btn); shoplist.appendChild(row) }
  const sl = document.createElement('div'); sl.className = 'sells'; sl.innerHTML = '<h3>Скупаю</h3>';   // что торговец берёт в корзину и почём
  for (const [type, p] of Object.entries(PRICE)) { const r = document.createElement('div'); r.className = 'sell';
    const ic = document.createElement('i'); ic.className = 'sic'; wareIcon(type, ic); const nm = document.createElement('span'); nm.textContent = TYPES[type].name;
    const pr = document.createElement('b'), cc = document.createElement('i'); icon(COINI, COINP, cc); pr.append(cc, String(p)); r.append(ic, nm, pr); sl.appendChild(r) }
  shoplist.appendChild(sl);
  document.getElementById('shopsay').textContent = coins ? '«Мусор — в корзину, монеты — сюда. Что берёшь?»' : '«Пустые карманы? Неси мусор в корзину — заплачу.»';
  shopwrap.hidden = false; shopclose.focus(); haptic('light');
}
function closeShop() { shopwrap.hidden = true; haptic('light') }
function buy(w, btn) {
  if (coins < w.price) { btn.classList.remove('no'); void btn.offsetWidth; btn.classList.add('no'); haptic('warn'); document.getElementById('shopsay').textContent = '«Не хватает. Неси ещё мусора.»'; return }
  coins -= w.price; showCoins(); closeShop();
  const t = makeTrash(w.type, CH.x + rnd(-.08, .08), Math.min(1.5, CH.y + 6), CH.z + rnd(-.08, .08), rnd(0, 6.28), -1); activate(t);
  t.body.angularVelocity.set(rnd(-2, 2), 0, rnd(-2, 2)); toast('Купил: ' + w.name.toLowerCase() + ' — сейчас прилетит сверху!', 2); haptic('medium');
}
shopclose.addEventListener('click', closeShop);
shopwrap.addEventListener('click', e => { if (e.target === shopwrap) closeShop() });
addEventListener('keydown', e => { if (e.code === 'Escape' && !shopwrap.hidden) closeShop() });

/* ---------- чёрная толща под видимыми слоями: дальше свет всё равно не доходит ---------- */
const under = new THREE.Mesh(new THREE.BoxGeometry(N + 2, 60, N + 2).translate(N / 2 - 1, -30, N / 2 - 1), new THREE.MeshBasicMaterial({ color: 0x000000 }));
/* ---------- расширение участка: по два слоя декоративной земли за левой и правой стенками ----------
   оно никогда не меняется, поэтому всё — один меш: верх и срезы с нашей стороны до самого низа мира; ниже видимых слоёв срезается шейдером */
const EXT = (() => {
  const cells = []; for (let i = -2; i < N; i++) for (let j = -2; j < N; j++) if (i < 0 || j < 0) cells.push([i, j]);
  const pos = [], nrm = [], uv = [], idx = [], faces = [];
  for (let z = 0; z <= BOT; z++) for (const [i, j] of cells) { if (blocks.has(i + ',' + j + ',' + z)) continue;   // задняя стенка лавки уже нарисована слоями
    const k = z >= DIG ? 'К' : ['З', 'З1', 'З2'][hash(i, j, z)], open = [i === N - 1, z === 0, j === N - 1];
    FT.forEach((ft, q) => { if (!open[q]) return;
      const v0 = pos.length / 3, t = TILE[k][ft.tx], tu = (t % ATL_C) * ATL_T, tv = (t / ATL_C | 0) * ATL_T;
      for (let v = 0; v < 4; v++) {
        pos.push(ft.pos[v * 3] + i + .5, ft.pos[v * 3 + 1] - (z + .5) * BH, ft.pos[v * 3 + 2] + j + .5); nrm.push(ft.nrm[v * 3], ft.nrm[v * 3 + 1], ft.nrm[v * 3 + 2]);
        uv.push((tu + .01 + ft.uv[v * 2] * (ATL_T - .02)) / atlC.width, 1 - (tv + .01 + (1 - ft.uv[v * 2 + 1]) * (ATL_T - .02)) / atlC.height) }
      for (const x of ft.idx) idx.push(v0 + x);
      faces.push({ i, j, z, f: ft.f, p: ft.pos }) }) }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(pos.length).fill(1), 3)); g.setIndex(idx); g.computeBoundingSphere();
  const mat = new THREE.MeshLambertMaterial({ map: atlas, vertexColors: true });
  mat.onBeforeCompile = sh => { sh.uniforms.uMinY = clipU;
    sh.vertexShader = 'varying float vWY;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\nvWY = (modelMatrix * vec4(transformed, 1.0)).y;');
    sh.fragmentShader = 'uniform float uMinY;\nvarying float vWY;\n' + sh.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\nif (vWY < uMinY) discard;') };
  const mesh = new THREE.Mesh(g, mat); mesh.castShadow = mesh.receiveShadow = true; mesh.matrixAutoUpdate = false; mesh.frustumCulled = false; scene.add(mesh);
  return { mesh, faces };
})();
under.matrixAutoUpdate = true; scene.add(under);
