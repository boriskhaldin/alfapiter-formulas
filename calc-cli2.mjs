import { loadConfig, calcTotal } from './calc-core.mjs';

function parseArg(arg){
  // формат: 30x50x1000 → {width_mm:30, height_mm:50, count:1000}
  const m = String(arg).match(/^(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)x(\d+)$/i);
  if(!m) throw new Error('Формат размера: W×H×QTY, например 30x50x1000');
  return { width_mm: Number(m[1]), height_mm: Number(m[2]), count: Number(m[3]) };
}

(async function(){
  const args = process.argv.slice(2);
  const sizeArgs = args.filter(a => /^\d/.test(a));
  const flag = (name) => args.some(a => a.toLowerCase() === name);

  const stickers = sizeArgs.map(parseArg);
  const opts = {
    lam1:   flag('lam1'),
    lam2:   flag('lam2'),
    rolling: flag('roll') || flag('rolling')
  };

  const cfg = await loadConfig('./out_etiketki/config.json');
  const res = calcTotal(cfg, stickers, opts);
  console.log(JSON.stringify({ stickers, opts, ...res }, null, 2));
})();
