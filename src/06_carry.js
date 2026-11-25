/* ---------- как Кирью держит вещь ----------
   вещь — жёстко перед ним: ближней гранью вплотную к животу (не сквозь него), повёрнута вместе с телом, не крутится.
   Длинное держит поперёк себя; если поперёк не влезает — вдоль. Руки берутся за бока вещи (широкую — обнимает за ближний край).
   Вещь упёрлась в стенку — дальше не идёт и Кирью: он останавливается, а не протаскивает её сквозь землю (лестницу в руках
   это не касается — с ней по-прежнему подходят к стенке вплотную и лезут) */
function holdBox(t, rot) {                                     // габариты вещи в системе Кирью (x — вбок, z — вперёд) при повороте rot
  const L = t.local, c = Math.cos(rot), s = Math.sin(rot); let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const lx of [L.min.x, L.max.x]) for (const lz of [L.min.z, L.max.z]) { const x = lx * c + lz * s, z = -lx * s + lz * c;
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z) }
  return { x0, x1, z0, z1 };
}
const HOLD_GAP = .05;                                          // зазор между животом и вещью
function holdAt(t, x, y, z, yaw, rot) {                         // где окажется центр вещи, если Кирью стоит в (x, y, z) и смотрит по yaw
  const hb = holdBox(t, rot), f = R + HOLD_GAP - hb.z0, up = t.local.max.y - t.local.min.y;
  return { x: x + Math.sin(yaw) * f, y: y + .95 + up * .3, z: z + Math.cos(yaw) * f, yaw: yaw + rot, hb, f };
}
function holdFreeAt(t, x, y, z, yaw, rot = t.carryRot || 0) { const p = holdAt(t, x, y, z, yaw, rot); return poseFree(t, p.x, p.y, p.z, p.yaw, !!PRICE[t.type]) }
const holdBlocks = t => !!t;                                   // упирается ли Кирью вещью в стенки (лестницей тоже — с ней, как со всем, поднимает над головой)
/* ---------- вещь над головой ----------
   упёрся вещью в стенку или в край участка — Кирью поднимает её над головой и идёт дальше вплотную (как без вещи);
   впереди снова свободно — опускает к животу. Над головой вещь может чуть свисать за край участка — там пусто */
const UP_LIFT = 1.75;                                          // низ вещи над головой — над каской с фонарём (её верх — около 1,72 от ног); выше руки не дотянутся
function upAt(t, x, y, z, yaw, rot) { const hh = (t.local.max.y - t.local.min.y) / 2, hb = holdBox(t, rot), f = .2 - (hb.z0 + hb.z1) / 2;   // над головой, а голова у Кирью вынесена вперёд
  return { x: x + Math.sin(yaw) * f, y: y + UP_LIFT + hh, z: z + Math.cos(yaw) * f, yaw: yaw + rot, hb, f, hh } }
function upPtFree(x, y0, y1, z) {                               // точка вещи над головой: не в земле, не в стеллаже, не сквозь пол и потолок дома
  const inD = INSIDE.some(r => inR(r, x, z, .05));
  if (inD && y1 > HF - .25 && y0 < HF + .05) return false;      // пол дома снизу
  if (y0 > HF - .2 && y1 > HF + 2.3) return false;              // потолок
  if (x > PIT0 - .45 && x < PIT1 + .45 && z > PIT0 - .45 && z < PIT1 + .45 && y1 < HF - .25)
    return !solidAt(Math.floor(x), Math.floor(z), Math.floor(-y0 / BH)) && !solidAt(Math.floor(x), Math.floor(z), Math.floor(-y1 / BH)) && !kitHit(x, z, y0);
  return outerHoldFree(x, y0, z) && outerHoldFree(x, y1, z);
}
function upFreeAt(t, x, y, z, yaw, rot = t.carryRot || 0) {
  const p = upAt(t, x, y, z, yaw, rot), c = Math.cos(p.yaw), s = Math.sin(p.yaw), L = t.local, m = .06;
  for (const lx of [L.min.x + m, 0, L.max.x - m]) for (const lz of [L.min.z + m, 0, L.max.z - m])
    if (!upPtFree(p.x + lx * c + lz * s, p.y - p.hh, p.y + p.hh, p.z - lx * s + lz * c)) return false;
  return true;
}
const carryFreeAt = (t, x, y, z, yaw) => holdFreeAt(t, x, y, z, yaw) || upFreeAt(t, x, y, z, yaw);
/* можно ли шагнуть/повернуться в позу (x, z, yaw): перед собой свободно; или вещь уже целиком над головой и там свободно.
   Пока поднимает — стоит на месте (иначе вещь по пути вверх влезла бы в стенку). Застрял совсем — отпускаем, чтобы выбрался */
function carryMoveOk(t, x0, y0, z0, yaw0, x, y, z, yaw) {
  if (holdFreeAt(t, x, y, z, yaw)) return true;
  if ((CH.up || 0) >= .999 && upFreeAt(t, x, y, z, yaw)) return true;
  return !holdFreeAt(t, x0, y0, z0, yaw0) && !upFreeAt(t, x0, y0, z0, yaw0);
}
function carryPose(t, dt = 0) {
  const b = t.body, sell = !!PRICE[t.type], yaw = CH.yaw;
  let rot = t.carryRot || 0, P = null;
  { const p = holdAt(t, CH.x, CH.y, CH.z, yaw, rot); if (poseFree(t, p.x, p.y, p.z, p.yaw, sell)) P = p }   // как взял — так и несёт: сам по себе не перехватывает (скелет не встаёт «за голову»)
  // перед собой не помещается — над голову (если там есть место); опускает, когда впереди свободно уже четверть секунды
  const upOk = holdBlocks(t) && CH.state === 'walk' && upFreeAt(t, CH.x, CH.y, CH.z, yaw, rot);
  CH.upAsk = Math.max(0, (CH.upAsk || 0) - dt);
  if ((!P || CH.upAsk > 0) && upOk) { CH.upW = 1; CH.upF = 0 } else if (P) { CH.upF = (CH.upF || 0) + dt; if (CH.upF > .25 || !upOk) CH.upW = 0 } else CH.upW = 0;
  if (CH.state !== 'walk') CH.upW = 0;
  CH.up = Math.max(0, Math.min(1, (CH.up || 0) + (CH.upW ? 1 : -1) * dt / .3));
  if (!P) {                                                    // застрял (взял вещь вплотную к стенке, спрыгнул): подтягиваем к себе / сдвигаем вдоль, как раньше
    const p = holdAt(t, CH.x, CH.y, CH.z, yaw, rot), fx = Math.sin(yaw), fz = Math.cos(yaw);
    for (let k = 1; k >= 0 && !P; k -= .125) { const x = CH.x + fx * p.f * k, z = CH.z + fz * p.f * k; if (poseFree(t, x, p.y, z, p.yaw, sell)) P = { ...p, x, z } }
    if (!P) { const ax = Math.cos(p.yaw), az = -Math.sin(p.yaw);
      for (const sh of [.25, -.25, .5, -.5, .75, -.75]) if (poseFree(t, CH.x + ax * sh, p.y, CH.z + az * sh, p.yaw, sell)) { P = { ...p, x: CH.x + ax * sh, z: CH.z + az * sh }; break } }
    if (!P) P = { ...p, x: CH.x, z: CH.z };
  }
  t.carryRot = rot; CH.dropP = P;                            // куда ставить, если сейчас опустить
  if (CH.up > 0) {                                             // голова — препятствие: сначала поднимает перед лицом выше каски, потом переносит назад над головой
    const U = upAt(t, CH.x, CH.y, CH.z, yaw, rot), F = holdAt(t, CH.x, CH.y, CH.z, yaw, rot), u = CH.up, sm = k => k * k * (3 - 2 * k);
    const e0 = sm(Math.min(1, u / .3)), e1 = sm(Math.max(0, Math.min(1, (u - .25) / .4))), e2 = sm(Math.max(0, (u - .6) / .4));
    const out = .22 * e0 * (1 - e2);                               // три шага: отводит от лица (волосы торчат вперёд), поднимает выше каски, переносит над головой
    const fx = Math.sin(yaw), fz = Math.cos(yaw);
    P = { ...F, x: F.x + (U.x - F.x) * e2 + fx * out, y: F.y + (U.y - F.y) * e1, z: F.z + (U.z - F.z) * e2 + fz * out } }
  if (!sell && !t.hinted) { const p = holdAt(t, CH.x, CH.y, CH.z, yaw, rot);   // упёрся в окно лавки с тем, что не продаётся
    if (!poseFree(t, p.x, p.y, p.z, p.yaw, false) && poseFree(t, p.x, p.y, p.z, p.yaw, true)) { t.hinted = true; toast(t.type === 'pipe' ? 'Целиком не влезет — сначала разломай ломом' : TYPES[t.type].light ? 'Фонарь лучше оставить себе' : 'Это торговцу не нужно') } }
  b.position.set(P.x, P.y, P.z);
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, P.yaw, 0));
  b.quaternion.set(q.x, q.y, q.z, q.w); b.velocity.set(0, 0, 0); b.angularVelocity.set(0, 0, 0);
  // за что берутся руки — в системе Кирью: бока вещи, а широкую — ближний край снизу; над головой — бока снизу
  const c = Math.cos(yaw), s = Math.sin(yaw), dx = P.x - CH.x, dz = P.z - CH.z, lx = dx * c - dz * s, lz = dx * s + dz * c, hb = P.hb;
  const ly = P.y - CH.y, hy = (t.local.max.y - t.local.min.y) / 2;
  if (hb.x1 - hb.x0 < .86) { const zg = Math.min(lz, .4); CH.grip = [[lx + hb.x0 - .015, ly - hy * (.15 + .85 * CH.up), zg], [lx + hb.x1 + .015, ly - hy * (.15 + .85 * CH.up), zg]] }
  else { const zg = lz + hb.z0 * (1 - CH.up) - .01; CH.grip = [[lx - .2, ly - hy * (.6 + .4 * CH.up), zg], [lx + .2, ly - hy * (.6 + .4 * CH.up), zg]] }
}
/* предмет провалился за карту: возвращаем его — он падает сверху ямы прямо на персонажа */
function lostItem(t) {
  const p = t.body.position, out = p.x < PIT0 - .2 || p.x > PIT1 + .2 || p.z < PIT0 - .2 || p.z > PIT1 + .2;
  if (out) return p.y < -.5;                                    // за краем ямы — только если упала ниже верха стенок
  const a = cellAt(p.x, p.z); return a >= 0 ? p.y < floorY(a) - 1.2 : p.y < -(BOT + 1) * BH;   // в яме — только если провалилась сквозь пол своей клетки
}
function returnItem(t) {
  const b = t.body, now = performance.now(); t.retN = now - (t.retT || 0) < 8000 ? (t.retN || 0) + 1 : 1; t.retT = now;
  if (t.retN > 2) {                                              // опять провалилась — значит, под Кирью нечему её держать: роняем на середину ямы
    let a = 0; for (let k = 0; k < ACT.length; k++) if (Math.hypot(ACT[k][0] + .5 - PC, ACT[k][1] + .5 - PC) < Math.hypot(ACT[a][0] + .5 - PC, ACT[a][1] + .5 - PC)) a = k;
    b.position.set(ACT[a][0] + .5, floorY(a) + 1.2, ACT[a][1] + .5); b.velocity.set(0, 0, 0); b.angularVelocity.set(0, 0, 0); b.wakeUp(); t.falling = false; t.fallV = 0; return }
  b.position.set(CH.x, Math.min(1.5, CH.y + 9), CH.z);
  b.velocity.set(0, 0, 0); b.angularVelocity.set((Math.random() - .5) * 4, 0, (Math.random() - .5) * 4); b.wakeUp(); t.falling = false; t.fallV = 0;
  toast('Сверху что-то летит!');
}
const winZone = p => p.x > WIN.x0 && p.x < WIN.x1 && p.z < PIT0 - .02 && p.z > BASKET.z - BASKET.r - .3 && p.y > SHOP.floor - 1.2 && p.y < SHOP.ceil + .3;   // за окном над корзиной
function basketTake(t) {                                       // корзина торговца: мусор — в монеты, остальное выкидывает обратно
  const price = PRICE[t.type], p = t.body.position;
  if (!price) { t.body.position.set(BASKET.x, SHOP.floor + 1, PIT0 + .35); t.body.velocity.set(0, 1.5, 1.4); t.body.wakeUp();
    toast(t.type === 'pipe' ? 'Торговец: «Целиком не возьму — разломай»' : 'Торговец: «Это оставь себе»'); return }
  removeTrash(t); addCoins(price, BASKET.x, SHOP.floor + BASKET.h, BASKET.z); GAME.st.e += price;
  burst(BASKET.x, SHOP.floor + BASKET.h, BASKET.z, ['#f2c14e', '#fff6c8', '#d99a2b'], 14, .7); haptic('medium');
}
function dropItem(here) {
  const t = CH.held; if (!t) return; const b = t.body;        // ставим там, где держали (место уже проверено: не в стене и не за краем)
  if (!here && CH.up > 0 && CH.dropP) { b.position.set(CH.dropP.x, CH.dropP.y, CH.dropP.z); CH.up = 0; CH.upW = 0 }   // над головой — сначала опускает перед собой (или к ногам, если впереди стенка)
  b.type = CANNON.Body.DYNAMIC; b.collisionResponse = true; b.updateMassProperties(); b.velocity.set(CH.face.x * .4, 0, CH.face.z * .4); b.angularVelocity.set(0, 0, 0); b.wakeUp();
  t.held = false; CH.held = null; haptic('light');
  t.ghost = charHits(t); sepCheck(t); wakeNear(t);
}
