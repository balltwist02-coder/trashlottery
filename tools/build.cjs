/* Сборка игры из частей.
   Код игры живёт в src/ — по файлу на тему (см. src/README.md). Браузер грузит один файл 3d_main.js,
   его собирает этот скрипт: склеивает src/*.js по порядку номеров, ничего не меняя внутри.
   Демо (demo_main.js) — та же игра, только с kiryu_demo.js.

     node tools/build.cjs           собрать 3d_main.js и demo_main.js
     node tools/build.cjs --check   проверить, что собранные файлы совпадают с src/ (никто не правил их руками)
     node tools/build.cjs --where 1234   какая часть и какая строка в ней — строка 1234 собранного файла
                                         (номера строк из ошибок в консоли браузера) */
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..'), SRC = path.join(ROOT, 'src');
const parts = fs.readdirSync(SRC).filter(f => /^\d\d_.*\.js$/.test(f)).sort();
const texts = parts.map(f => fs.readFileSync(path.join(SRC, f), 'utf8'));
const game = texts.join('');
const KIRYU = /from '\.\/kiryu\.js\?v=\d+';/;
if (!KIRYU.test(game)) { console.error('не нашёл строку импорта kiryu.js — демо не собрать'); process.exit(1) }
const demo = game.replace(KIRYU, "from './kiryu_demo.js?v=7';");
const OUT = { '3d_main.js': game, 'demo_main.js': demo };

const arg = process.argv[2];
if (arg === '--where') {
  let n = +process.argv[3], at = 1;
  for (let k = 0; k < parts.length; k++) { const c = texts[k].split('\n').length - 1;
    if (n < at + c) { console.log(`src/${parts[k]}, строка ${n - at + 1}`); process.exit(0) } at += c }
  console.log('за концом файла'); process.exit(1);
}
let bad = 0;
for (const [f, t] of Object.entries(OUT)) {
  const p = path.join(ROOT, f), cur = fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
  if (arg === '--check') { if (cur !== t) { console.error(`✗ ${f} не совпадает с src/ — пересобери (node tools/build.cjs) или перенеси правку в src/`); bad++ } else console.log(`✓ ${f}`) }
  else if (cur !== t) { fs.writeFileSync(p, t); console.log(`собран ${f}`) } else console.log(`${f} без изменений`);
}
if (!arg) console.log(`${parts.length} частей, ${game.split('\n').length - 1} строк`);
process.exit(bad ? 1 : 0);
