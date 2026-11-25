/* ---------- 3D-иконки инструментов: маленькие лоуполи-модели, рисуются отдельной камерой в пиксельный холст ----------
   трясётся и подпрыгивает сама модель, а не рамка (потом так же будет звонить телефон) */
const ICO = 20;
const icR = new THREE.WebGLRenderer({ antialias: false, alpha: true }); icR.setPixelRatio(1); icR.setSize(ICO, ICO, false);
const icScene = new THREE.Scene();
icScene.add(new THREE.AmbientLight(0xffffff, .55 * Math.PI));
{ const l = new THREE.DirectionalLight(0xffffff, .8 * Math.PI); l.position.set(.6, 1, .9); icScene.add(l) }
const icCam = new THREE.OrthographicCamera(-.62, .62, .62, -.62, .1, 10); icCam.position.set(0, 0, 5); icCam.lookAt(0, 0, 0);
const IB = (w, h, d) => new THREE.BoxGeometry(w, h, d);
function icPart(g, geo, c, x, y, z, rz = 0, rx = 0, ry = 0) { const m = new THREE.Mesh(geo, M(c)); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); g.add(m); return m }
const ICON3D = {
  phone() { const g = new THREE.Group();
    icPart(g, IB(.52, .92, .09), 0x1d2128, 0, 0, 0);
    icPart(g, IB(.44, .74, .02), 0x2c5a6a, 0, .02, .05);                 // экран
    icPart(g, IB(.3, .12, .021), 0x5fb3c4, -.03, .22, .052);              // блик на экране
    icPart(g, IB(.12, .03, .02), 0x0d0f12, 0, .4, .05);                   // динамик
    g.rotation.set(-.2, .45, .1); return g },
  pick() { const g = new THREE.Group();
    icPart(g, IB(.09, 1.05, .09), 0xa8683c, 0, -.08, 0);                  // рукоять
    icPart(g, IB(.11, .1, .11), 0x6b3f28, 0, -.56, 0);
    const h = new THREE.Group(); h.position.set(0, .38, 0); g.add(h);
    icPart(h, IB(.5, .12, .12), 0xc9d3dc, -.22, -.02, 0, .25);            // клюв влево
    icPart(h, IB(.4, .12, .12), 0xc9d3dc, .19, -.02, 0, -.3);            // и вправо
    icPart(h, IB(.16, .16, .15), 0x7d8c9c, 0, 0, 0);
    g.rotation.set(.15, .5, -.55); return g },
  bar() { const g = new THREE.Group();
    icPart(g, IB(.09, 1.0, .09), 0xc8423a, 0, -.05, 0);
    icPart(g, IB(.09, .26, .09), 0xc8423a, .1, .5, 0, -.9);               // загиб
    icPart(g, IB(.09, .14, .09), 0x7a2420, .23, .48, 0, -2.2);            // раздвоенный носик
    icPart(g, IB(.12, .1, .1), 0x7a2420, -.02, -.55, 0, .4);
    g.rotation.set(.2, .5, -.6); return g },
  glove() { const g = new THREE.Group();
    icPart(g, IB(.46, .42, .2), 0xf0c232, 0, -.02, 0);                    // ладонь
    for (let k = 0; k < 4; k++) icPart(g, IB(.1, .3, .17), 0xf0c232, -.17 + k * .113, .32 - (k === 0 || k === 3 ? .04 : 0), 0);
    icPart(g, IB(.12, .26, .16), 0xe0b02a, .3, .02, 0, -.7);             // большой палец
    icPart(g, IB(.5, .16, .23), 0xc89a1c, 0, -.3, 0);                     // раструб
    g.rotation.set(-.25, .4, .15); return g },
  trowel() { const g = new THREE.Group();
    icPart(g, IB(.14, .42, .14), 0x9a6234, 0, -.32, 0);                   // деревянная ручка
    icPart(g, IB(.16, .07, .16), 0x6b3f22, 0, -.55, 0);
    icPart(g, IB(.1, .12, .1), 0x8e989f, 0, -.07, 0);                     // втулка
    icPart(g, IB(.05, .13, .05), 0x8e989f, 0, .04, .03, 0, -.4);          // изогнутая шейка
    const s = new THREE.Group(); s.position.set(0, .3, .06); s.rotation.x = .25; g.add(s);   // совок сужается к острию
    icPart(s, IB(.36, .22, .035), 0xc9d3dc, 0, -.05, 0);
    icPart(s, IB(.26, .14, .035), 0xc9d3dc, 0, .12, 0);
    icPart(s, IB(.13, .1, .035), 0xc9d3dc, 0, .24, 0);
    icPart(s, IB(.04, .32, .05), 0x8e989f, 0, .02, .015);               // ребро жёсткости
    for (const x of [-.18, .18]) icPart(s, IB(.035, .22, .07), 0xa9b4bd, x, -.05, .025, x > 0 ? .12 : -.12);   // загнутые бортики
    g.rotation.set(.35, .55, -.6); return g },
  bag() { const g = new THREE.Group();                                   // кожаный узел-фуросики, уголки торчат сверху
    icPart(g, IB(.7, .5, .42), 0x8c5a30, 0, -.12, 0); icPart(g, IB(.58, .62, .38), 0x8c5a30, 0, -.14, .01); icPart(g, IB(.5, .42, .5), 0x8c5a30, 0, -.1, -.01);
    icPart(g, IB(.32, .22, .02), 0xa9733e, -.1, -.02, .26); icPart(g, IB(.04, .4, .36), 0x6b4122, .34, -.14, 0);
    for (const s of [-1, 1]) icPart(g, IB(.14, .26, .1), 0x6b4122, s * .11, .26, .02, s * .5); icPart(g, IB(.18, .13, .13), 0x5a361c, 0, .2, .02);
    for (let k = 0; k < 5; k++) icPart(g, IB(.05, .02, .02), 0xe9c88c, -.24 + k * .12, -.33, .23);
    g.rotation.set(.25, .5, 0); return g },
};
const icObj = {};
for (const t of TOOLS) if (t) { icObj[t] = ICON3D[t](); icObj[t].userData.base = icObj[t].rotation.clone(); }
const icCtx = toolBtns.map((b, k) => { if (!TOOLS[k]) return null; const c = document.createElement('canvas'); c.width = c.height = ICO; b.appendChild(c); return c.getContext('2d') });
let icTime = 0;
function drawIcons(dt) {
  icTime += dt;
  TOOLS.forEach((t, k) => { if (!t) return;
    const o = icObj[t], fx = iconFx[t], sel = t === tool, base = o.userData.base;
    const still = !sel && fx.shake <= 0 && fx.lift < .001 && fx.drawn;   // неподвижную иконку не перерисовываем
    fx.shake = Math.max(0, fx.shake - dt); fx.lift += ((sel ? 1 : 0) - fx.lift) * Math.min(1, dt * 10); if (still) return; fx.drawn = true;
    o.position.set(0, fx.lift * .08 + (sel ? Math.sin(icTime * 3) * .03 : 0), 0);
    o.rotation.set(base.x, base.y + (sel ? Math.sin(icTime * 1.6) * .35 : 0), base.z + (fx.shake > 0 ? Math.sin(icTime * 70) * .35 * fx.shake / .4 : 0));
    icScene.add(o); icR.render(icScene, icCam); icScene.remove(o);
    const x = icCtx[k]; x.clearRect(0, 0, ICO, ICO); x.drawImage(icR.domElement, 0, 0) });
}

