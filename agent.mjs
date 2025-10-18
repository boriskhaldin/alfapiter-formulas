#!/usr/bin/env node
/**
 * Агент вытягивает тарифные таблицы с https://alfapiter.ru/calculators/etiketki
 * и сохраняет их в ./out_etiketki/config.json
 */
import fs from 'fs/promises';
import path from 'path';
import puppeteer from 'puppeteer';
import chalk from 'chalk';

const OUT_DIR = path.resolve('./out_etiketki');
const OUT_FILE = path.join(OUT_DIR, 'config.json');
const URL = 'https://alfapiter.ru/calculators/etiketki';

function parseNumericArray(v) {
  if (!v) return [];
  // допускаем разделители: запятая, ;, пробелы, |, табы
  const parts = String(v).split(/[,;|\s]+/).filter(Boolean);
  const nums = parts.map(x => Number(String(x).replace(',', '.'))).filter(n => !Number.isNaN(n));
  // убираем дубликаты и сортируем по возрастанию
  return [...new Set(nums)].sort((a,b)=>a-b);
}

function looksLikeArrayText(s) {
  return /[,;|\s]\s*\d/.test(s); // очень грубо, но работает на data-*
}

async function run() {
  console.log(chalk.cyan(`Открываю ${URL} ...`));
  const browser = await puppeteer.launch({headless: 'new', defaultViewport: {width:1280,height:900}});
  const page = await browser.newPage();
  page.setDefaultTimeout(60000);

  await page.goto(URL, {waitUntil:'networkidle2'});

  // подождём, пока калькулятор прогрузится и появятся скрытые поля валюты
  await page.waitForSelector('.calculator-usd', {timeout: 30000}).catch(()=>{});

  // Соберём всё полезное с DOM: валюты + любые data-* с ключевыми словами
  const raw = await page.evaluate(() => {
    const pick = (sel) => {
      const el = document.querySelector(sel);
      return el ? el.value : '';
    };

    const usd = Number((document.querySelector('.calculator-usd')?.value || '').replace(',','.')) || 0;
    const eur = Number((document.querySelector('.calculator-eur')?.value || '').replace(',','.')) || 0;

    // собрать ВСЕ data-* в документе
    const allData = {};
    const KEY_RE = /(area|price|qty|engrave|laser|cutter|manual|selection|rolling|lam|print)/i;

    document.querySelectorAll('*').forEach(el => {
      // датасет
      const ds = el.dataset || {};
      for (const [k,v] of Object.entries(ds)) {
        if (!v) continue;
        if (KEY_RE.test(k) || KEY_RE.test(v)) {
          (allData[k] ||= []).push(String(v));
        }
      }

      // для input/select option часто кладут на option-элементы
      if (el.tagName === 'OPTION') {
        const ds2 = el.dataset || {};
        for (const [k,v] of Object.entries(ds2)) {
          if (!v) continue;
          if (KEY_RE.test(k) || KEY_RE.test(v)) {
            (allData[k] ||= []).push(String(v));
          }
        }
      }
    });

    return { usd, eur, allData };
  });

  const { usd, eur, allData } = raw;

  // Нормализуем: пытаемся склеить и распарсить массивы чисел
  const useful = {};
  for (const [key, list] of Object.entries(allData)) {
    // слепим уникальные строки
    const uniq = [...new Set(list)];
    // попытка сделать массив чисел
    const joined = uniq.join(' ');
    if (joined && /[0-9]/.test(joined)) {
      const arr = joined.split(/[,;|\s]+/).filter(Boolean)
        .map(x => Number(String(x).replace(',', '.')))
        .filter(n => !Number.isNaN(n));
      if (arr.length >= 2) {
        useful[key] = [...new Set(arr)].sort((a,b)=>a-b);
      }
    }
  }

  // Приведём к ожидаемым ключам, если повезло найти совпадения по именам
  // (мэппинг по подстрокам — универсально)
  function pickBySubstr(substrs) {
    const result = {};
    for (const [k,v] of Object.entries(useful)) {
      if (substrs.some(s => k.toLowerCase().includes(s))) {
        result[k] = v;
      }
    }
    return result;
  }

  const buckets = {
    printArea:     pickBySubstr(['printarea','dataPrintArea','print_area']),
    printPrice:    pickBySubstr(['printprice','dataPrintPrice','print_price']),
    cutterArea:    pickBySubstr(['cutterarea','datacutterarea','knifearea']),
    cutterPrice:   pickBySubstr(['cutterprice','datacutterprice','knifeprice']),
    manualArea:    pickBySubstr(['manualarea','datamanualarea']),
    manualPrice:   pickBySubstr(['manualprice','datamanualprice']),
    selectionArea: pickBySubstr(['selectionarea','dataselectionarea']),
    selectionPrice:pickBySubstr(['selectionprice','dataselectionprice']),
    rollingArea:   pickBySubstr(['rollingarea','datarollingarea']),
    rollingPrice:  pickBySubstr(['rollingprice','datarollingprice']),
    laserQty:      pickBySubstr(['laserqty','datalaserqty']),
    laserCO2EngraveArea:  pickBySubstr(['engravearea','laserco2engravearea']),
    laserCO2EngravePrice: pickBySubstr(['engraveprice','laserco2engraveprice']),
    laserPrice:    pickBySubstr(['laserprice','datalaserprice']),
    lam1Price:     pickBySubstr(['lam1price','lamination1']),
    lam2Price:     pickBySubstr(['lam2price','lamination2']),
    materialPrice: pickBySubstr(['materialprice','vinyl','paper'])
  };

  const summary = {};
  for (const [name, obj] of Object.entries(buckets)) {
    // берём первый ключ (если их несколько), чтобы положить в плоский вид,
    // но также сохраним и «сырой» раздел для отладки
    const keys = Object.keys(obj);
    if (keys.length) {
      summary[name] = obj[keys[0]];
    }
  }

  const config = {
    usd, eur,
    // плоские поля (как ожидает твоё ядро)
    dataPrintArea: summary.printArea || [],
    dataPrintPrice: summary.printPrice || [],
    dataCutterArea: summary.cutterArea || [],
    dataCutterPrice: summary.cutterPrice || [],
    dataManualArea: summary.manualArea || [],
    dataManualPrice: summary.manualPrice || [],
    dataSelectionArea: summary.selectionArea || [],
    dataSelectionPrice: summary.selectionPrice || [],
    dataRollingArea: summary.rollingArea || [],
    dataRollingPrice: summary.rollingPrice || [],
    dataLaserQty: summary.laserQty || [],
    dataLaserCO2EngraveArea: summary.laserCO2EngraveArea || [],
    dataLaserCO2EngravePrice: summary.laserCO2EngravePrice || [],
    dataLaserPrice: summary.laserPrice || []
  };

  await fs.mkdir(OUT_DIR, {recursive:true});
  await fs.writeFile(OUT_FILE, JSON.stringify(config, null, 2), 'utf8');

  console.log(chalk.green('✅ Сохранено:'), OUT_FILE);
  console.log(chalk.gray('Найденные ключи:'), Object.keys(config).filter(k=>k!=='usd'&&k!=='eur').filter(k=>config[k]?.length).join(', ') || '(ничего не нашлось, возможно страница изменилась)');

  await browser.close();
}

run().catch(err => {
  console.error('Agent error:', err);
  process.exit(1);
});
