#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';

const OUT_DIR = path.resolve('./out_etiketki');
const HTML = path.join(OUT_DIR, 'page.html');
const SCRIPTS_DIR = path.join(OUT_DIR, 'scripts');
const OUT_FILE = path.join(OUT_DIR, 'config.json');

function grabArrays(text) {
  // ищем массивы чисел вида [1,2,3], а также «ряд» чисел "10, 20, 30"
  const arrays = [];

  // JSON-подобные массивы
  for (const m of text.matchAll(/\[\s*(?:-?\d+(?:\.\d+)?\s*,\s*)*-?\d+(?:\.\d+)?\s*\]/g)) {
    try {
      const arr = JSON.parse(m[0].replace(/(\d)\s+(\d)/g,'$1,$2')); // подстрахуемся
      if (Array.isArray(arr) && arr.length >= 2) arrays.push(arr.map(Number));
    } catch {}
  }

  // CSV/пробельные списки
  for (const m of text.matchAll(/(?:^|\D)(\d+(?:[.,]\d+)?(?:\s*[;,|\s]\s*\d+(?:[.,]\d+)?){2,})(?:\D|$)/g)) {
    const seq = m[1].split(/[,;|\s]+/).map(x=>Number(String(x).replace(',','.'))).filter(n=>!Number.isNaN(n));
    if (seq.length>=3) arrays.push(seq);
  }

  return arrays;
}

async function run() {
  const out = { usd: 0, eur: 0 };

  try {
    const html = await fs.readFile(HTML, 'utf8');
    const usd = html.match(/class="calculator-usd"\s+value="([^"]+)"/);
    const eur = html.match(/class="calculator-eur"\s+value="([^"]+)"/);
    out.usd = Number(usd?.[1].replace(',','.')) || 0;
    out.eur = Number(eur?.[1].replace(',','.')) || 0;

    let bigText = html;
    try {
      const files = await fs.readdir(SCRIPTS_DIR);
      for (const f of files) {
        if (!/\.(js|txt)$/.test(f)) continue;
        const t = await fs.readFile(path.join(SCRIPTS_DIR, f), 'utf8').catch(()=> '');
        bigText += '\n' + t;
      }
    } catch {}

    const arrays = grabArrays(bigText);
    // В качестве эвристики распределим первые найденные массивы
    // (лучше будет, если agent.mjs заполнит реальные поля)
    const [a1=[], p1=[], a2=[], p2=[]] = arrays;

    out.dataPrintArea  = a1;
    out.dataPrintPrice = p1;
    out.dataCutterArea = a2;
    out.dataCutterPrice= p2;

    await fs.mkdir(OUT_DIR, {recursive:true});
    await fs.writeFile(OUT_FILE, JSON.stringify(out, null, 2), 'utf8');

    console.log(chalk.yellow('⚠️ Резервная сборка могла распознать не всё.'));
    console.log(chalk.green('✅ Сохранено:'), OUT_FILE);
  } catch (e) {
    console.error('build-config error:', e);
    process.exit(1);
  }
}

run();
