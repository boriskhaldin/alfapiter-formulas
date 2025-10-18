// Универсальный сканер page.html: вытаскивает массивы из <script> и цифры из таблиц.
// Зависимости: jsdom, chalk
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

const TARGET_KEYS = [
  'dataPrintArea','dataPrintPrice',
  'dataCutterArea','dataCutterPrice',
  'dataManualArea','dataManualPrice',
  'dataSelectionArea','dataSelectionPrice',
  'dataRollingArea','dataRollingPrice',
  'dataLaserQty',
  'dataLaserCO2EngraveArea','dataLaserCO2EngravePrice',
  'dataLaserPrice'
];

const RU_HINTS = {
  dataPrintArea:  ['печать','print','печати','цветопечать'],
  dataPrintPrice: ['печать','print','цена','тариф','стоимость'],
  dataCutterArea: ['резка','реж','плоттер','cut','knife','высечка','вырубка'],
  dataCutterPrice:['резка','реж','плоттер','cut','knife','высечка','вырубка','цена','тариф'],
  dataManualArea: ['ручн','manual'],
  dataManualPrice:['ручн','manual','цена','тариф'],
  dataSelectionArea:['выборка','выемка','select'],
  dataSelectionPrice:['выборка','выемка','select','цена','тариф'],
  dataRollingArea: ['склейка','намотка','roll','сматыв','перемот'],
  dataRollingPrice:['склейка','намотка','roll','цена','тариф'],
  dataLaserQty:   ['laser','лазер','штук','qty','колич'],
  dataLaserCO2EngraveArea:  ['laser','лазер','CO2','гравиров','engrave','площад'],
  dataLaserCO2EngravePrice: ['laser','лазер','CO2','гравиров','engrave','цена','тариф'],
  dataLaserPrice: ['laser','лазер','цена','тариф']
};

function norm(s){ return String(s||'').toLowerCase(); }
function pickNumber(v){
  const t = String(v??'').replace(/\s+/g,'').replace(',', '.');
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

// --- извлечение массивов из скриптов с балансировкой скобок ---
function extractArraysFromScript(scriptText){
  const res = {};
  const text = scriptText;

  // Находим идентификатор + = [ или : [
  const idRe = /([A-Za-z_$][\w$]*)\s*(?:=|:)\s*\[/g;
  let m;
  while ((m = idRe.exec(text)) !== null){
    const name = m[1];
    let i = idRe.lastIndex - 1; // позиция на '['
    // балансируем скобки
    let depth = 0, start = i, end = i;
    for (; end < text.length; end++){
      const ch = text[end];
      if (ch === '[') depth++;
      else if (ch === ']'){
        depth--;
        if (depth === 0){ end++; break; }
      }
    }
    const arrText = text.slice(start, end);
    // достаём числа (вложенные массивы разворачиваем)
    const nums = arrText
      .split(/[^0-9.,-]+/).map(pickNumber)
      .filter(n => n !== null);
    if (!res[name]) res[name]=[];
    res[name].push(...nums);
    idRe.lastIndex = end;
  }
  return res;
}

// --- извлечение чисел из таблиц + определение типа по заголовкам ---
function extractFromTables(doc){
  const blocks = [];
  const tables = [...doc.querySelectorAll('table')];

  for (const tbl of tables){
    // Берём подписи рядом: caption, предыдущий заголовок h1..h6, родительские заголовки
    const caption = tbl.querySelector('caption')?.textContent || '';
    const prevHeader = (function(){
      let el = tbl;
      for (let i=0;i<5;i++){
        el = el.previousElementSibling || el.parentElement;
        if (!el) break;
        if (/^H[1-6]$/.test(el.tagName)) return el.textContent || '';
      }
      return '';
    })();
    const title = norm(caption || prevHeader || tbl.getAttribute('data-title') || '');

    // Все числа из таблицы
    const nums = [...tbl.querySelectorAll('td,th')]
      .map(n=>pickNumber(n.textContent))
      .filter(n=>n!==null);

    if (nums.length){
      blocks.push({title, nums});
    }
  }

  // Маппинг в целевые ключи по хинтам
  const out = {};
  for (const key of Object.keys(RU_HINTS)){
    const hints = RU_HINTS[key];
    const cand = blocks.find(b => hints.some(h => b.title.includes(h)));
    out[key] = cand ? cand.nums : [];
  }
  return out;
}

(async () => {
  const html = await fs.readFile(PAGE, 'utf8').catch(()=>null);
  if (!html){
    console.error('❌ Не найден файл', PAGE);
    process.exit(1);
  }
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  // Валюты
  let usd = pickNumber(doc.querySelector('.calculator-usd')?.getAttribute('value'));
  let eur = pickNumber(doc.querySelector('.calculator-eur')?.getAttribute('value'));
  // fallback: ищем в тексте
  if (usd==null){
    const m = html.match(/usd[^0-9]{0,10}([0-9]+[.,][0-9]+)/i);
    usd = m ? pickNumber(m[1]) : 0;
  }
  if (eur==null){
    const m = html.match(/eur[^0-9]{0,10}([0-9]+[.,][0-9]+)/i);
    eur = m ? pickNumber(m[1]) : 0;
  }

  // Скрипты
  const scriptsText = [...doc.querySelectorAll('script')]
    .map(s => s.textContent || '')
    .join('\n');
  const scriptMaps = extractArraysFromScript(scriptsText);

  // Таблицы
  const tableMap = extractFromTables(doc);

  // Смешиваем: если из скриптов есть точное имя ключа — берём его; иначе из таблиц
  const cfg = { usd: usd||0, eur: eur||0 };
  for (const k of TARGET_KEYS){
    if (scriptMaps[k]?.length) cfg[k] = scriptMaps[k];
    else if (tableMap[k]?.length) cfg[k] = tableMap[k];
    else cfg[k] = [];
  }

  await fs.mkdir(OUT_DIR, {recursive:true});
  await fs.writeFile(OUT_FILE, JSON.stringify(cfg, null, 2), 'utf8');

  const filled = Object.entries(cfg)
    .filter(([k,v]) => Array.isArray(v) ? v.length : (k==='usd'||k==='eur'))
    .map(([k,v]) => Array.isArray(v) ? `${k}[${v.length}]` : `${k}=${v}`);
  console.log(chalk.green('✅ Сохранено:'), OUT_FILE);
  console.log(chalk.gray('ℹ️ Найдено:'), filled.join(', ') || '(ничего)');

})();
