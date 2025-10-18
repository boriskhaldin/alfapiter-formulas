import fs from 'node:fs/promises';
import { loadConfig, calcTotal } from './calc-core.mjs';

// простая монотонная регрессия по бинам (кумулятивный максимум)
function monotonePL(xy){
  // сортировка по x, усреднение по бинам
  xy.sort((a,b)=>a.x-b.x);
  const xs=[], ys=[];
  for(const {x,y} of xy){
    xs.push(x); ys.push(y);
  }
  // сгладим скользящим средним по 3
  const avg = (arr,i) => {
    const j0=Math.max(0,i-1), j1=Math.min(arr.length-1,i+1);
    let s=0,c=0; for(let j=j0;j<=j1;j++){ s+=arr[j]; c++; }
    return s/c;
  };
  const ysm = ys.map((_,i)=>avg(ys,i));
  // монотонность (неубывание)
  let m = -Infinity;
  const ymon = ysm.map(v => (m = Math.max(m, v)));
  return { x: xs, y: ymon };
}

(async ()=>{
  const OUT_DIR = './out_etiketki';
  const DATASET = `${OUT_DIR}/dataset.csv`;
  const cfg = await loadConfig(`${OUT_DIR}/config.json`);
  const csv = await fs.readFile(DATASET,'utf8').then(s=>s.trim().split('\n')).catch(()=>[]);
  if(csv.length<=1){ console.error('Нет датасета:', DATASET); process.exit(1); }

  const rows = csv.slice(1).map(line=>{
    const [w,h,q,lam1,lam2,rolling,area,perim,total] = line.split(',');
    return {
      stickers: [{width_mm:+w, height_mm:+h, count:+q}],
      opts: {lam1: lam1==='1', lam2: lam2==='1', rolling: rolling==='1'},
      site: +total,
      area: +area
    };
  });

  // собираем пары (area, delta)
  const pairs=[];
  for(const r of rows){
    const local = calcTotal(cfg, r.stickers, r.opts).total;
    const delta = r.site - local;
    // отсечём экстремальные выбросы (например, +/- 50k)
    if(Number.isFinite(delta) && Math.abs(delta) < 50000 && Number.isFinite(r.area)){
      pairs.push({x:r.area, y:delta});
    }
  }
  if(!pairs.length){ console.error('Пустые пары для коррекции'); process.exit(1); }

  const corr = monotonePL(pairs);

  // запишем в config.json
  const newCfg = {
    ...cfg,
    correctionArea: corr.x,
    correctionPrice: corr.y
  };
  await fs.writeFile(`${OUT_DIR}/config.json`, JSON.stringify(newCfg, null, 2), 'utf8');
  console.log('✅ correction записана в config.json:', corr.x.length, 'точек');
})();
