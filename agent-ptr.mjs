// Агент: берёт usd/eur и пытается вытащить числовые ряды из локального out_etiketki/page.html
// Зависимости: jsdom, chalk (у тебя установлены)
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { JSDOM } from 'jsdom';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const OUT_DIR  = path.join(__dirname, 'out_etiketki');
const PAGE     = path.join(OUT_DIR, 'page.html');
const OUT_FILE = path.join(OUT_DIR, 'config.json');

function pickNumber(val) {
  const n = Number(String(val || '').replace(',', '.').trim());
  return Number.isFinite(n) ? n : null;
}

// Пытаемся выковырять массивы вида [..] из текста
function findArraysByHints(text, hints) {
  // Ищем конструкции наподобие: dataPrintArea = [ ... ]  или "dataPrintArea":[...]
  const map = {};
  for (const hint of hints) {
    const re =
      new RegExp(
        `(?:(?:var|let|const)\\s+${hint}\\s*=\\s*\$begin:math:display$|["']${hint}["']\\\\s*:\\\\s*\\\\[)([^\\$end:math:display$]*)\\]`,
        'i'
      );
    const m = text.match(re);
    if (m && m[1]) {
      // дробим по запятым и/или по нецифровым символам
      const nums = m[1]
        .split(/[^0-9.,-]+/)
        .map(s => pickNumber(s))
        .filter(n => n !== null);
      map[hint] = nums;
    } else {
      map[hint] = [];
    }
  }
  return map;
}

(async () => {
  // 1) читаем локальную страницу
  const html = await fs.readFile(PAGE, 'utf8').catch(() => null);
  if (!html) {
    console.error(chalk.red('❌ Не найден файл:'), PAGE);
    process.exit(1);
  }

  const dom = new JSDOM(html);
  const doc = dom.window.document;

  // 2) USD/EUR
  const usd = pickNumber(doc.querySelector('.calculator-usd')?.getAttribute('value'));
  const eur = pickNumber(doc.querySelector('.calculator-eur')?.getAttribute('value'));

  // 3) Собираем весь текст (HTML+inline скрипты), пробуем достать массивы
  //    Хинты — ключи, которые обычно бывают в калькуляторах
  const fullText = html;
  const hints = [
    'dataPrintArea','dataPrintPrice',
    'dataCutterArea','dataCutterPrice',
    'dataManualArea','dataManualPrice',
    'dataSelectionArea','dataSelectionPrice',
    'dataRollingArea','dataRollingPrice',
    'dataLaserQty',
    'dataLaserCO2EngraveArea','dataLaserCO2EngravePrice',
    'dataLaserPrice'
  ];

  const found = findArraysByHints(fullText, hints);

  const cfg = {
    usd: usd ?? 0,
    eur: eur ?? 0,
    ...found
  };

  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(OUT_FILE, JSON.stringify(cfg, null, 2), 'utf8');

  const filled = Object.entries(cfg)
    .filter(([k,v]) => (Array.isArray(v) ? v.length : (k==='usd'||k==='eur')))
    .map(([k,v]) => Array.isArray(v) ? `${k}[${v.length}]` : `${k}=${v}`);
  console.log(chalk.green('✅ Сохранено:'), OUT_FILE);
  console.log(chalk.gray('ℹ️ Найдено:'), filled.join(', ') || '(ничего)');

})();
