import fs from 'node:fs/promises';
import { loadConfig, calcTotal } from './calc-core.mjs';

const OUT_DIR = './out_etiketki';
const DATASET = `${OUT_DIR}/dataset.csv`;

function parseRow(line){
  const [w,h,q,lam1,lam2,rolling,area,perim,total] = line.split(',');
  return {
    stickers: [{ width_mm:+w, height_mm:+h, count:+q }],
    opts: { lam1: lam1==='1', lam2: lam2==='1', rolling: rolling==='1' },
    site: +total
  };
}

(async function(){
  const cfg = await loadConfig(`${OUT_DIR}/config.json`);
  const csv = await fs.readFile(DATASET,'utf8').then(s=>s.trim().split('\n')).catch(()=>[]);
  const rows = csv.slice(1).map(parseRow);

  let abs = 0, n = 0, worst = {delta:-1, row:null};
  for(const r of rows){
    const loc = calcTotal(cfg, r.stickers, r.opts).total;
    const d = Math.abs(loc - r.site);
    abs += d; n++;
    if(d > (worst.delta||-1)) worst = {delta: d, row: {...r, local:loc}};
  }
  const mae = Math.round(abs / Math.max(1,n));
  console.log('MAE по датасету:', mae, '₽');
  console.log('Худший пример:', worst);
})();
