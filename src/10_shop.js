/* ---------- лавка подземного торговца: выемка во всю правую стенку, 2 блока в глубину ----------
   базарная лавка: настил из досок, крестовины из жердей, драпировка с кистями, ковёр, корзина, бочки, мешки со специями,
   кувшины, свёрнутые ковры, медный чайник и фонарь на цепи. Всё неподвижное — один меш (одна команда видеокарте);
   свет считается по деталям, торговец — отдельная живая моделька (merchant.js) */
const shopG = new THREE.Group(); scene.add(shopG);
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
function rodBetween(g, a, b, r, mat, seg = 6) {                // жердь между двумя точками
  const v = new THREE.Vector3().subVectors(b, a), m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, v.length(), seg), mat);
  m.position.copy(a).addScaledVector(v, .5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.normalize()); g.add(m); return m }
const WARM = new THREE.Color(1, .9, .76);                       // тёплый свет фонаря
/* все детали группы → один меш; у каждой детали свой номер — по нему считается свет */
function mergeStatic(g) {
  g.updateMatrixWorld(true); const inv = g.matrixWorld.clone().invert();
  const pos = [], nrm = [], col = [], pid = [], centers = [], list = [];
  g.traverse(o => { if (o.isMesh && !o.material.userData.glow) list.push(o) });
  for (const o of list) {
    const geo = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(inv.clone().multiply(o.matrixWorld));
    const p = geo.attributes.position.array, n = geo.attributes.normal.array, vc = geo.attributes.color && geo.attributes.color.array;
    const ms = Array.isArray(o.material) ? o.material : [o.material], grp = geo.groups.length ? geo.groups : [{ start: 0, count: p.length / 3, materialIndex: 0 }];
    geo.computeBoundingBox(); const id = centers.length; centers.push(geo.boundingBox.getCenter(new THREE.Vector3()));
    for (const gr of grp) { const c = (Array.isArray(o.material) ? ms[gr.materialIndex || 0] : ms[0]).color;
      for (let v = gr.start; v < gr.start + gr.count; v++) { pos.push(p[v * 3], p[v * 3 + 1], p[v * 3 + 2]); nrm.push(n[v * 3], n[v * 3 + 1], n[v * 3 + 2]);
        const k = vc ? [vc[v * 3], vc[v * 3 + 1], vc[v * 3 + 2]] : [1, 1, 1]; col.push(c.r * k[0] * WARM.r, c.g * k[1] * WARM.g, c.b * k[2] * WARM.b); pid.push(id) } }
    o.parent.remove(o) }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  mesh.userData = { deco: true, base: Float32Array.from(col), pid: Uint16Array.from(pid), centers }; g.add(mesh); return mesh;
}
let STALL = null;
function shadeStall() {                                        // свет по деталям лавки: ближе к фонарю — ярче
  const u = STALL.userData, col = STALL.geometry.attributes.color, a = col.array;
  const br = u.centers.map(c => Math.min(1.7, .07 + 2.5 * lightAt(c.x, c.y, c.z)));
  for (let v = 0; v < u.pid.length; v++) { const b = br[u.pid[v]]; a[v * 3] = u.base[v * 3] * b; a[v * 3 + 1] = u.base[v * 3 + 1] * b; a[v * 3 + 2] = u.base[v * 3 + 2] * b }
  col.needsUpdate = true;
}
function buildStall() {
  const F0 = SHOP.floor, F = F0 + .06, C = SHOP.ceil, X0 = SHOP.i0, X1 = SHOP.i1, ZB = 0, ZF = PIT0;
  const g = new THREE.Group(); shopG.add(g);
  const pp = (geo, c, x, y, z, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, typeof c === 'number' ? M(c) : c); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); g.add(m); return m };
  const Bx = (w, h, d) => new THREE.BoxGeometry(w, h, d), Cy = (r0, r1, h, s = 8, open = false) => new THREE.CylinderGeometry(r0, r1, h, s, 1, open);
  const LA = (pts, s = 10) => new THREE.LatheGeometry(pts.map(([r, h]) => new THREE.Vector2(r, h)), s);
  const pole = (a, b, r, c) => rodBetween(g, a, b, r, M(c), 6);
  // настил из досок
  const wood = [0x8a5a34, 0x7a4e2c, 0x95653b, 0x6e4426];
  for (let k = 0; k < 13; k++) pp(Bx(X1 - X0 - .03, .06, .142), wood[k % 4], (X0 + X1) / 2, F0 + .03 + ((k * 7) % 3 - 1) * .004, ZB + .08 + k * .146);
  pp(Bx(X1 - X0, .085, .035), 0x5a3a20, (X0 + X1) / 2, F0 + .02, ZF - .02);
  // крестовины по краям, балки, верёвочные узлы
  for (const x of [X0 + .1, X1 - .1]) {
    pole(V3(x, F, ZB + .25), V3(x, C - .05, ZF - .12), .036, 0x6a4628); pole(V3(x, F, ZF - .12), V3(x, C - .05, ZB + .25), .036, 0x5e3e22);
    pp(new THREE.TorusGeometry(.05, .02, 4, 8), 0xc9a86a, x, (F + C - .05) / 2, (ZB + ZF + .13) / 2, 0, Math.PI / 2, 0) }
  pole(V3(X0, C - .05, ZF - .12), V3(X1, C - .05, ZF - .12), .044, 0x5e3e22);
  pole(V3(X0, C - .08, ZB + .25), V3(X1, C - .08, ZB + .25), .036, 0x5e3e22);
  // драпировка спереди: фестоны трёх цветов, золотая кайма, кисти. Над торговцем проём, края подвязаны —
  // камера смотрит сверху наискосок, и сплошной подзор закрыл бы ему голову
  const cloth = [0x8e2430, 0x4e2a5e, 0xb07a1e], gold = 0xd2a03a, GAP0 = MERCH.x + .1, GAP1 = MERCH.x + 1;
  pp(Bx(X1 - X0, .05, .035), gold, (X0 + X1) / 2, C - .05, ZF - .085);
  let ci = 0;
  for (const [a, b, n] of [[X0, GAP0, 4], [GAP1, X1, 3]]) { const pw = (b - a) / n;
    for (let k = 0; k < n; k++, ci++) { const x0 = a + k * pw, cc = cloth[ci % 3];
      for (let q = 0; q < 3; q++) { const w = pw / 3, hh = q === 1 ? .25 : .18; pp(Bx(w + .003, hh, .022), cc, x0 + w * (q + .5), C - .07 - hh / 2, ZF - .075 + (q === 1 ? .006 : 0)) }
      pp(Bx(pw / 3, .028, .026), gold, x0 + pw / 2, C - .306, ZF - .066);
      if (k) { pp(Cy(.024, 0, .075, 5), gold, x0, C - .3, ZF - .068); pp(Bx(.022, .022, .022), 0xf0c860, x0, C - .255, ZF - .068) } }
    const tx = a === X0 ? b : a, sx = a === X0 ? -1 : 1, tc = cloth[(ci + 1) % 3];      // подвязанный хвост у проёма
    pp(Bx(.11, .2, .03), tc, tx + sx * .055, C - .17, ZF - .07); pp(Bx(.07, .2, .03), tc, tx + sx * .05, C - .37, ZF - .07, 0, 0, sx * .12);
    pp(Bx(.09, .025, .04), gold, tx + sx * .05, C - .27, ZF - .068); pp(Cy(.026, 0, .08, 5), gold, tx + sx * .07, C - .32, ZF - .062) }
  // ковёр на задней стене — рельефное полотно со складками и узором
  { const cols = 14, rows = 18, x0 = 3.95, x1 = X1 - .12, y0 = F + .12, y1 = C - .16, w = (x1 - x0) / cols, h = (y1 - y0) / rows;
    const pal = { k: 0x3a1418, r: 0x8e2a26, R: 0xa83a2c, o: 0xd98a3a, b: 0x33507a, y: 0xe2c26a };
    const pat = (c, r) => { if (c === 0 || c === cols - 1 || r === 0 || r === rows - 1) return 'k'; if (c === 1 || c === cols - 2 || r === 1 || r === rows - 2) return 'y';
      const cy = (r - 2) % 7, dd = Math.abs(cy - 3) + Math.abs(c - (cols - 1) / 2) * .9; return dd < 1.4 ? 'y' : dd < 2.6 ? 'b' : dd < 3.4 ? 'o' : cy === 6 ? 'R' : 'r' };
    const pos = [], colA = [], zf = x => ZB + .035 + .018 * Math.sin((x - x0) * 15);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const xa = x0 + c * w, xb = xa + w, ya = y1 - r * h, yb = ya - h, cc = new THREE.Color(pal[pat(c, r)]);
      const q = [[xa, ya, zf(xa)], [xa, yb, zf(xa)], [xb, yb, zf(xb)], [xa, ya, zf(xa)], [xb, yb, zf(xb)], [xb, ya, zf(xb)]];
      for (const v of q) { pos.push(...v); colA.push(cc.r, cc.g, cc.b) } }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(colA, 3)); geo.computeVertexNormals();
    g.add(new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: 0xffffff, vertexColors: true })));
    pole(V3(x0 - .06, y1 + .03, ZB + .06), V3(x1 + .06, y1 + .03, ZB + .06), .022, 0x4a3018);
    for (let c = 0; c <= cols; c += 2) pp(Bx(.012, .05, .012), 0xe2c26a, x0 + c * w, y0 - .025, zf(x0 + c * w));   // бахрома
  }
  // огромная плетёная корзина: стойки, плетёные ряды, толстый обод, внутри — уже наброшенный мусор
  { const bx = BASKET.x, bz = BASKET.z, R0 = BASKET.r * .84, R1 = BASKET.r, H = BASKET.h;
    for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2; pole(V3(bx + Math.cos(a) * R0, F + .02, bz + Math.sin(a) * R0), V3(bx + Math.cos(a) * R1, F + H, bz + Math.sin(a) * R1), .014, 0x7a5528) }
    for (let r = 0; r < 7; r++) { const y = F + .05 + r * (H - .09) / 6, rr = R0 + (R1 - R0) * (y - F) / H, n = 22, sl = 2 * Math.PI * rr / n;
      for (let k = 0; k < n; k++) { const a = (k + (r % 2) * .5) / n * Math.PI * 2, out = (k + r) % 2 ? .012 : -.004;
        pp(Bx(sl * 1.06, .074, .028), (k + r) % 2 ? 0xc49558 : 0xa27438, bx + Math.cos(a) * (rr + out), y, bz + Math.sin(a) * (rr + out), 0, -(a + Math.PI / 2), 0) } }
    pp(new THREE.TorusGeometry(R1 + .005, .046, 5, 22), 0x8a5e2c, bx, F + H, bz, Math.PI / 2, 0, 0);
    const inner = new THREE.CylinderGeometry(R1 - .035, R0 - .03, H - .03, 14, 1, true); inner.scale(-1, 1, 1);   // внутренняя стенка (вывернута)
    pp(inner, 0x2e1c0e, bx, F + H / 2 + .01, bz); pp(new THREE.CircleGeometry(R0 - .03, 14), 0x24160a, bx, F + .03, bz, -Math.PI / 2);
    pp(Cy(.15, .15, .3, 10), 0xa8383a, bx - .14, F + H - .06, bz + .04, .35, 0, .25); pp(Cy(.153, .153, .09, 10, true), 0xe8d3a0, bx - .14, F + H - .06, bz + .04, .35, 0, .25);
    pp(Cy(.075, .075, .82, 9), 0x5f7f9e, bx + .1, F + H - .02, bz - .1, .9, .6, 0);
  }
  // слева: бочка, кувшины, мешки со специями
  { const barrel = (x, z, s) => { pp(LA([[0, 0], [.17 * s, 0], [.19 * s, .06 * s], [.205 * s, .2 * s], [.19 * s, .34 * s], [.17 * s, .4 * s], [0, .4 * s]], 12), 0x7a4a26, x, F, z);
      for (const y of [.09, .31]) pp(new THREE.TorusGeometry(.197 * s, .013, 4, 14), 0x3a3634, x, F + y * s, z, Math.PI / 2, 0, 0);
      pp(Cy(.16 * s, .16 * s, .02, 12), 0x5a3418, x, F + .405 * s, z) };
    barrel(2.42, .45, 1); barrel(2.85, .3, .85);
    const amph = (x, z, c, s) => { pp(LA([[0, 0], [.06 * s, 0], [.11 * s, .05 * s], [.14 * s, .16 * s], [.14 * s, .28 * s], [.1 * s, .4 * s], [.05 * s, .46 * s], [.05 * s, .52 * s], [.068 * s, .545 * s], [0, .545 * s]], 10), c, x, F, z);
      for (const sx of [-1, 1]) pp(new THREE.TorusGeometry(.05 * s, .012, 4, 8, Math.PI), c, x + sx * .075 * s, F + .44 * s, z, 0, 0, sx * Math.PI / 2) };
    amph(2.32, .95, 0xa65a36, 1); amph(2.62, 1.0, 0xcfae80, .7); amph(3.12, .45, 0x8a4a2e, .8);
    const sack = (x, z, spice) => { pp(LA([[0, 0], [.13, 0], [.16, .08], [.165, .18], [.14, .26], [.11, .29], [0, .29]], 10), 0xa88a5a, x, F, z);
      pp(new THREE.TorusGeometry(.115, .024, 4, 12), 0x8a6e44, x, F + .29, z, Math.PI / 2, 0, 0); pp(new THREE.ConeGeometry(.105, .08, 10), spice, x, F + .33, z) };
    sack(2.28, 1.62, 0xc2452d); sack(2.62, 1.72, 0xe0a526); sack(2.84, 1.44, 0x6f8a3a);
  }
  // справа у стены: свёрнутые ковры и ящики
  { const roll = (x, z, c, tilt) => { pp(Cy(.085, .085, 1.05, 10), c, x, F + .5, z, 0, 0, tilt);
      for (const t of [-.38, 0, .38]) pp(Cy(.088, .088, .05, 10), 0xd2a03a, x - Math.sin(tilt) * t * -1, F + .5 + t * Math.cos(tilt), z, 0, 0, tilt) };
    roll(5.6, .16, 0x7a2a3a, -.12); roll(5.42, .13, 0x2e4a6e, -.05); roll(5.68, .44, 0x8a6a2a, -.2);
    const crate = (x, y, z, s) => { pp(Bx(.36 * s, .32 * s, .36 * s), 0x8a7458, x, y + .16 * s, z);
      for (const yy of [.05, .27]) pp(Bx(.37 * s, .045 * s, .37 * s), 0x5e4c36, x, y + yy * s, z);
      pp(Bx(.4 * s, .045 * s, .02), 0x6e5a40, x, y + .16 * s, z + .185 * s, 0, 0, .7) };
    crate(4.35, F, .32, 1); crate(4.38, F + .32, .3, .8); crate(3.75, F, .2, .9);
  }
  // медный поднос с чайником и пиалами под фонарём, по правую руку торговца
  { const tx = MERCH.x - .67, tz = ZF - .25;
    pp(Cy(.15, .15, .018, 14), 0xb8862e, tx, F + .009, tz);
    pp(LA([[0, 0], [.06, 0], [.075, .04], [.07, .08], [.045, .1], [.025, .11], [.03, .125], [0, .135]], 10), 0xd9a441, tx, F + .018, tz);
    pole(V3(tx + .06, F + .07, tz), V3(tx + .13, F + .12, tz + .02), .009, 0xd9a441);
    pp(new THREE.TorusGeometry(.04, .009, 4, 8, Math.PI), 0xd9a441, tx - .07, F + .08, tz, 0, 0, Math.PI / 2);
    for (const [dx, dz] of [[.08, .07], [-.03, .1]]) pp(Cy(.025, .02, .035, 8), 0x2f8a8a, tx + dx, F + .036, tz + dz);
  }
  // гирлянда сушёного перца
  { const x = 2.75; pole(V3(x, C - .1, ZF - .14), V3(x, C - .62, ZF - .14), .006, 0x3a2618);
    for (let k = 0; k < 7; k++) pp(new THREE.ConeGeometry(.024, .085, 5), k % 3 === 2 ? 0x8a3a18 : 0xb8261c, x + (k % 2 ? .022 : -.022), C - .17 - k * .065, ZF - .14, Math.PI, 0, (k % 2 ? -1 : 1) * .5) }
  // фонарь на цепи — главный свет лавки
  SHOP.lamp = V3(MERCH.x - .3, C - .48, ZF - .16);            // левее торговца, чтобы не закрывать его
  { const L = SHOP.lamp, brass = 0xb8862e, nk = Math.round((C - .07 - (L.y + .19)) / .05);
    for (let k = 0; k <= nk; k++) pp(new THREE.TorusGeometry(.02, .006, 4, 6), 0x3a3634, L.x, C - .07 - k * .05, L.z, 0, k % 2 ? Math.PI / 2 : 0, 0);
    pp(Cy(.07, .09, .025, 8), brass, L.x, L.y - .11, L.z); pp(new THREE.ConeGeometry(.095, .08, 8), brass, L.x, L.y + .12, L.z);
    pp(new THREE.TorusGeometry(.03, .008, 4, 8), brass, L.x, L.y + .17, L.z);
    for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; pp(Bx(.012, .2, .012), brass, L.x + Math.cos(a) * .072, L.y, L.z + Math.sin(a) * .072) }
    const glass = new THREE.MeshBasicMaterial({ color: 0xffd27a }); glass.userData.glow = true;
    pp(Cy(.06, .06, .19, 8), glass, L.x, L.y, L.z) }
  STALL = mergeStatic(g);
  // торговец
  const MER = createMerchant(THREE); MER.root.position.set(MERCH.x, F, MERCH.z); MER.root.rotation.y = MERCH.ry; shopG.add(MER.root);
  MER.root.traverse(o => { if (o.isMesh) { o.userData.merchant = true; o.castShadow = o.receiveShadow = false; if (!o.material.userData.warm) { o.material.color.multiply(WARM); o.material.userData.warm = true } } });
  shopG.userData.mer = MER;
}
buildStall();
const merBase = new Map();
function revealShop() { SHOP.revealed = true; lightDirty = true; setTimeout(() => toast('…лавка? Под землёй?!', 2), 500) }
function nearShop() { return SHOP.revealed && CH.x > SHOP.i0 - .2 && CH.x < SHOP.i1 + .2 && CH.z < PIT0 + 1.3 && Math.abs(CH.y - SHOP.floor) < 1 }

