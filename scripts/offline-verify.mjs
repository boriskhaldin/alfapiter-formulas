// scripts/offline-verify.mjs
import { execSync } from 'node:child_process';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'out_etiketki');
if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

function run(cmd) {
  console.log(`\n▶ ${cmd}`);
  execSync(cmd, { stdio: 'inherit', env: process.env });
}

// 1) Переобучение коэффициентов
run('node agent-regress.mjs');

// 2) Валидация по датасету (без сайта / без Puppeteer)
run('node validate.mjs');

// 3) Читаем результат
const vfile = path.join(OUT, 'verification.json');
if (!existsSync(vfile)) {
  console.error('❌ verification.json не создан. Проверь validate.mjs');
  process.exit(2);
}
const v = JSON.parse(readFileSync(vfile, 'utf8'));

// Порог — можно подправить, если нужно
const MAE_LIMIT = 1200; // руб
const worstLimit = 21000; // максимальный дельта по худшему примеру

const mae = v?.metrics?.mae ?? v?.mae ?? null;
const worst = v?.metrics?.worstDelta ?? v?.worstDelta ?? null;

console.log('\n=== SUMMARY ===');
console.log('MAE:', mae, '₽');
if (worst != null) console.log('Worst Δ:', worst, '₽');

const pass =
  (typeof mae === 'number' && mae <= MAE_LIMIT) &&
  (typeof worst !== 'number' || worst <= worstLimit);

if (pass) {
  console.log('✅ PASS: качество в пределах порогов.');
  process.exit(0);
} else {
  console.log('❌ FAIL: качество вне порогов.');
  process.exit(1);
}
