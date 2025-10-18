/**
 * Агент-автомат: снимает «Итого» с живого калькулятора и строит piecewise-таблицы,
 * затем сохраняет config.json для локального расчёта без нулей.
 *
 * Как работает:
 *  - перебирает решётку размеров/тиражей, с/без опций
 *  - считывает итог с сайта (#alcalc-result или .calculator-result_total_digit output#alcalc-result_total)
 *  - по разностям оценивает вклад опций
 *  - подгоняет кусочно-линейные сегменты (узлы берём по сетке площадей)
 *  - валидирует на случайных точках
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import chalk from 'chalk';
import puppeteer from 'puppeteer';

const OUT_DIR  = path.resolve('./out_etiketki');
const DATASET  = path.join(OUT_DIR, 'dataset.csv');
const CFG_FILE = path.join(OUT_DIR, 'config.json');
const FIT_FILE = path.join(OUT_DIR, 'fit-report.json');

const URL = 'https://alfapiter.ru/calculators/etiketki';

// --- Селекторы (если на странице что-то поменяется — поправь здесь) ---
const SEL = {
  width:   '#alcalc-width, input[name="width"]',
  height:  '#alcalc-length, input[name="length"], input[name="height"]',
  qty:     '#alcalc-circulation, input[name="quantity"]',
  result:  '#alcalc-result, .calculator-result_total_digit #alcalc-result_total',
  // чекбоксы/свитчи опций (поддержим несколько вариантов)
  lam1:    'input[name="lam1"], #lamination1, .lam1 input[type="checkbox"]',
  lam2:    'input[name="lam2"], #lamination2, .lam2 input[type="checkbox"]',
  rolling: 'input[name="rolling"], #rolling, .rolling input[type="checkbox"]',
};

// --- Сетка измерений (можно расширить при желании) ---
const WIDTHS  = [20, 30, 40, 50, 60, 80];
const HEIGHTS = [20, 30, 40, 50, 60, 80];
const QTY     = [100, 300, 500, 1000, 2000, 5000];

const HEADLESS = 'new'; // Puppeteer v22 формат

function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

function parseMoney(text){
  // "2 011 ₽" → 2011
  if(!text) return NaN;
  const num = text.replace(/[^\d.,-]/g,'').replace(/\s+/g,'').replace(',', '.');
  return Number(num);
}

// безопасный клик по чекбоксу-опции: приводим к заданному boolean
async function setCheckbox(page, selector, desired){
  const el = await page.$(selector);
  if(!el) return; // нет — просто игнорируем опцию
  const isChecked = await page.evaluate(e => e.checked ?? e.getAttribute('aria-checked') === 'true', el);
  if(!!isChecked !== !!desired){
    await el.click({delay:30});
    await page.waitForNetworkIdle({idleTime: 400, timeout: 5000}).catch(()=>{});
    await sleep(150);
  }
}

// ввод значения в input c аккуратной очисткой
async function setInput(page, selector, value){
  const el = await page.$(selector);
  if(!el) throw new Error(`Не найден input: ${selector}`);
  // очистка
  await el.click({clickCount:3}).catch(()=>{});
  await page.keyboard.press('Backspace').catch(()=>{});
  await el.type(String(value), {delay: 20});
}

// чтение «Итого»
async function readTotal(page){
  const handle = await page.$(SEL.result);
  if(!handle){
    // иногда цифра рендерится позже — попробуем немного подождать
    await page.waitForSelector(SEL.result, {timeout: 5000}).catch(()=>{});
  }
  const text = await page.$eval(SEL.result, el => el.textContent).catch(()=> '');
  return parseMoney(text);
}

// одна прогонка
async function measure(page, {w,h,q,lam1=false,lam2=false,rolling=false}){
  await setInput(page, SEL.width,  w);
  await setInput(page, SEL.height, h);
  await setInput(page, SEL.qty,    q);

  await setCheckbox(page, SEL.lam1,    lam1);
  await setCheckbox(page, SEL.lam2,    lam2);
  await setCheckbox(page, SEL.rolling, rolling);

  await page.waitForNetworkIdle({idleTime: 400, timeout: 5000}).catch(()=>{});
  await sleep(120);

  const total = await readTotal(page);
  const areaM2 = (w/1000)*(h/1000)*q;            // суммарная площадь тиража
  const perim  = (w*2/1000 + h*2/1000) * q;      // суммарный периметр (м.п.)

  return {w,h,q,lam1,lam2,rolling, total, area: areaM2, perimeter: perim};
}

// подгонка кусочно-линейной функции: в узлах = среднее на окне
function fitPiecewise(xs, ys, knots=8){
  if(xs.length !== ys.length || xs.length===0) return {x:[], y:[]};
  // Сортировка по X
  const pairs = xs.map((x,i)=>({x, y:ys[i]})).sort((a,b)=>a.x-b.x);
  const X = pairs.map(p=>p.x);
  const Y = pairs.map(p=>p.y);

  const min = X[0], max = X[X.length-1];
  const grid = [];
  for(let i=0;i<knots;i++){
    grid.push(min + (i*(max-min))/(knots-1));
  }
  const outX = [], outY = [];
  const win = Math.max(1, Math.floor(X.length/knots/2)); // окно усреднения
  for(const gx of grid){
    // ближайший индекс
    let idx = X.findIndex(v=>v>=gx);
    if(idx<0) idx = X.length-1;
    const i0 = Math.max(0, idx - win);
    const i1 = Math.min(X.length-1, idx + win);
    const slice = Y.slice(i0, i1+1);
    const avg = slice.reduce((s,v)=>s+v,0)/slice.length;
    outX.push(gx);
    outY.push(avg);
  }
  return {x: outX, y: outY};
}

// линейная интерполяция (для валидации)
function interp1(xarr, yarr, x){
  if(!xarr.length) return 0;
  if(x<=xarr[0]) return yarr[0];
  if(x>=xarr[xarr.length-1]) return yarr[yarr.length-1];
  let i=1;
  while(i<xarr.length && x>xarr[i]) i++;
  const x0=xarr[i-1], x1=xarr[i], y0=yarr[i-1], y1=yarr[i];
  const t = (x-x0)/(x1-x0);
  return y0 + t*(y1-y0);
}

// собрать датасет, подогнать функции, сохранить
(async function main() {
  await fs.mkdir(OUT_DIR, {recursive:true});

  const browser = await puppeteer.launch({headless: HEADLESS, args:['--no-sandbox']});
  const page = await browser.newPage();
  page.setDefaultTimeout(15000);
  await page.goto(URL, {waitUntil:'networkidle2'});

  // sanity check: есть инпуты и «Итого»?
  for(const key of ['width','height','qty','result']){
    const ok = await page.$(SEL[key]);
    if(!ok) throw new Error(`На странице не найден селектор SEL.${key}: ${SEL[key]}`);
  }

  // заголовок CSV
  const rows = ['width,height,qty,lam1,lam2,rolling,area_m2,perimeter,total_rub'];

  // 1) Базовая сетка измерений без опций
  for(const w of WIDTHS){
    for(const h of HEIGHTS){
      for(const q of QTY){
        const m = await measure(page, {w,h,q});
        rows.push([w,h,q,0,0,0,m.area.toFixed(6),m.perimeter.toFixed(6),m.total].join(','));
      }
    }
  }

  // 2) Для вкладов опций измерим разности (вкл/выкл)
  const optSamples = [
    {lam1:true},
    {lam2:true},
    {rolling:true},
  ];
  const optDiffs = {lam1:[], lam2:[], rolling:[]};
  // возьмём подмножество комбинаций, чтобы не грузить сайт
  const SUB_W = [30, 50, 80];
  const SUB_H = [30, 50, 80];
  const SUB_Q = [300, 1000, 5000];

  for(const w of SUB_W){
    for(const h of SUB_H){
      for(const q of SUB_Q){
        const base = await measure(page, {w,h,q});
        for(const opt of optSamples){
          const meas = await measure(page, {w,h,q, ...opt});
          const diff = (meas.total - base.total);
          const area = base.area;
          const per  = base.perimeter;
          const key  = Object.keys(opt)[0];
          optDiffs[key].push({area, perimeter: per, diff});
          rows.push([w,h,q,+(opt.lam1||0),+(opt.lam2||0),+(opt.rolling||0), area.toFixed(6), per.toFixed(6), meas.total].join(','));
        }
      }
    }
  }

  await fs.writeFile(DATASET, rows.join('\n'), 'utf8');

  // 3) Фит базовой цены (без опций) как функции от площади (м²)
  const baseData = rows.slice(1) // skip header
    .map(line => {
      const [w,h,q,lam1,lam2,roll,area,per,total] = line.split(',');
      if(lam1==='0' && lam2==='0' && roll==='0'){
        return {area: Number(area), total: Number(total)};
      }
      return null;
    })
    .filter(Boolean)
    .sort((a,b)=>a.area-b.area);

  const baseXs = baseData.map(d=>d.area);
  const baseYs = baseData.map(d=>d.total);
  const baseFit = fitPiecewise(baseXs, baseYs, /*knots*/10);

  // 4) Фиты вкладов опций — тоже от площади (по сайту, как правило, масштабир-тся по м²)
  const lam1Fit = (()=> {
    const xs = optDiffs.lam1.map(d=>d.area).sort((a,b)=>a-b);
    const ys = optDiffs.lam1.sort((a,b)=>a.area-b.area).map(d=>d.diff);
    return fitPiecewise(xs, ys, 8);
  })();

  const lam2Fit = (()=> {
    const xs = optDiffs.lam2.map(d=>d.area).sort((a,b)=>a-b);
    const ys = optDiffs.lam2.sort((a,b)=>a.area-b.area).map(d=>d.diff);
    return fitPiecewise(xs, ys, 8);
  })();

  const rollingFit = (()=> {
    const xs = optDiffs.rolling.map(d=>d.area).sort((a,b)=>a-b);
    const ys = optDiffs.rolling.sort((a,b)=>a.area-b.area).map(d=>d.diff);
    return fitPiecewise(xs, ys, 8);
  })();

  // 5) Сохраним config.json в формате совместимом с нашим калькулятором (area→price)
  const cfg = {
    usd: 0, eur: 0, // на цену не влияют в локалке
    dataPrintArea:  baseFit.x,
    dataPrintPrice: baseFit.y,
    // остальные — разложим суммой (как будто это отдельные «линейки»)
    dataLam1Area:   lam1Fit.x,
    dataLam1Price:  lam1Fit.y,
    dataLam2Area:   lam2Fit.x,
    dataLam2Price:  lam2Fit.y,
    dataRollingArea: rollingFit.x,
    dataRollingPrice: rollingFit.y,

    // пустые (если надо — в будущем извлечём отдельно)
    dataCutterArea:[],  dataCutterPrice:[],
    dataManualArea:[],  dataManualPrice:[],
    dataSelectionArea:[], dataSelectionPrice:[],
    dataLaserQty:[], dataLaserCO2EngraveArea:[], dataLaserCO2EngravePrice:[], dataLaserPrice:[]
  };

  await fs.writeFile(CFG_FILE, JSON.stringify(cfg, null, 2), 'utf8');

  // 6) Быстрая валидация: 20 случайных проверок
  function localEval(area, opts){
    // базовая
    let total = interp1(cfg.dataPrintArea, cfg.dataPrintPrice, area);
    if(opts.lam1) total += interp1(cfg.dataLam1Area, cfg.dataLam1Price, area);
    if(opts.lam2) total += interp1(cfg.dataLam2Area, cfg.dataLam2Price, area);
    if(opts.rolling) total += interp1(cfg.dataRollingArea, cfg.dataRollingPrice, area);
    return total;
  }

  const tests = [];
  function rnd(a,b){ return Math.floor(a + Math.random()*(b-a+1)); }
  for(let i=0;i<20;i++){
    const w = [25,35,45,55,75,90][rnd(0,5)];
    const h = [25,35,45,55,75,90][rnd(0,5)];
    const q = [150,350,800,1200,2500,6000][rnd(0,5)];
    const lam1 = rnd(0,1)===1, lam2=rnd(0,1)===1, rolling=rnd(0,1)===1;
    const m = await measure(page, {w,h,q,lam1,lam2,rolling});
    const pred = localEval(m.area, {lam1,lam2,rolling});
    const diff = Math.abs(m.total - pred);
    tests.push({w,h,q,lam1,lam2,rolling, site:m.total, local:Math.round(pred), absError:Math.round(diff)});
  }

  const mae = Math.round(tests.reduce((s,t)=>s+t.absError,0)/tests.length);
  const report = { maeRUB: mae, tests };
  await fs.writeFile(FIT_FILE, JSON.stringify(report, null, 2), 'utf8');

  await browser.close();

  const filledKeys = Object.entries(cfg)
    .filter(([k,v]) => Array.isArray(v) ? v.length>0 : (k==='usd'||k==='eur'))
    .map(([k,v]) => Array.isArray(v) ? `${k}[${v.length}]` : `${k}=${v}`);
  console.log(chalk.green('✅ Записал:'), CFG_FILE);
  console.log(chalk.gray('ℹ️ Таблицы:'), filledKeys.join(', ') || '(пусто)');
  console.log(chalk.cyan('🧪 MAE на 20 тестах:'), `${mae} ₽`);
  console.log(chalk.gray('Датасет:'), DATASET);
  console.log(chalk.gray('Отчёт фитинга:'), FIT_FILE);
})().catch(async (e)=>{
  console.error('Agent error:', e?.message || e);
  process.exit(1);
});
