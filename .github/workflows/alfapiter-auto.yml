// scripts/scrape-and-verify.mjs
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

// === Простая локальная формула как заглушка (заменю на вашу calc-core, если есть) ===
function localCalc({w, h, qty, complex=false}) {
  // ПРИМЕЧАНИЕ: это временно. Когда будет ваша calc-core.mjs — подключу её здесь.
  const area = (w*h/1e6) * qty;
  const base = 1200*area + 300;             // грубо, чтоб метрика считалась
  const coef = complex ? 1.15 : 1.0;
  return Math.round(base*coef);
}

// === Съёмка датасета с сайта Альфапитер ===
async function scrape() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.setDefaultTimeout(15000);

  const url = 'https://alfapiter.ru/calculators/etiketki';
  await page.goto(url, { waitUntil: 'networkidle' });

  const combos = [
    {w:40,h:40,qty:500,complex:false},
    {w:55,h:55,qty:600,complex:false},
    {w:70,h:70,qty:220,complex:false},
    {w:30,h:50,qty:1000,complex:false},
    {w:90,h:60,qty:300,complex:true},
  ];

  const res = [];
  for (const c of combos) {
    // заполнение полей (селекторы под верстку Альфапитер)
    await page.fill('input[name="width"]', String(c.w));
    await page.fill('input[name="height"]', String(c.h));
    await page.fill('input[name="tirazh"]', String(c.qty));

    // сложный/простой
    if (c.complex) {
      await page.click('text=Сложный', { trial: false }).catch(()=>{});
    } else {
      await page.click('text=Простой', { trial: false }).catch(()=>{});
    }

    // подождать пересчет
    await page.waitForTimeout(500);

    // итог справа "Итого: ХХХ ₽"
    const totalText = await page.locator('text=/Итого:\\s*[\\d\\s]+₽/').first().textContent();
    const siteTotal = Number(totalText.replace(/\D+/g,''));

    res.push({ ...c, site: siteTotal, local: localCalc(c), delta: 0 });
  }

  await browser.close();

  // посчитать метрику
  let abs=0;
  for (const r of res) { r.delta = Math.abs(r.site - r.local); abs += r.delta; }
  const mae = Math.round(abs / res.length);

  return { mae, rows: res };
}

// === Сборка ZIP плагина (если у вас есть папка wp-plugin/) ===
async function zipPlugin() {
  const distDir = 'dist';
  await fs.mkdir(distDir, { recursive: true });

  // Простой zip через системный zip
  const { execSync } = await import('node:child_process');
  execSync(`zip -r ${path.join(distDir,'alfapiter-calculator.zip')} wp-plugin -x "**/.DS_Store"`, { stdio:'inherit' });
}

(async () => {
  await fs.mkdir('out_etiketki', { recursive: true });

  const log = [];
  function logl(...a){ const s=a.join(' '); console.log(s); log.push(s); }

  logl('▶ Снимаю датасет с сайта…');
  const { mae, rows } = await scrape();
  await fs.writeFile('out_etiketki/dataset.json', JSON.stringify(rows,null,2));

  logl('▶ MAE:', mae, '₽');

  const verification = {
    maeRUB: mae,
    thresholdRUB: 0,                // хотим 1-в-1
    pass: mae <= 0,
    tested: rows.length,
    worst: rows.reduce((a,b)=> (a.delta>b.delta?a:b))
  };
  await fs.writeFile('out_etiketki/verification.json', JSON.stringify(verification,null,2));

  logl('▶ verification:', JSON.stringify(verification));

  // Сборка плагина, если есть папка wp-plugin/
  try {
    await fs.access('wp-plugin');
    logl('▶ Собираю ZIP плагина…');
    await zipPlugin();
  } catch(e) {
    logl('ℹ️ Папка wp-plugin/ не найдена — пропускаю упаковку.');
  }

  await fs.writeFile('out_etiketki/log.txt', log.join('\n'));
})();
