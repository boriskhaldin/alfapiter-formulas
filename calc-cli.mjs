#!/usr/bin/env node
import { calcEtiketki } from './etiketki-formula.mjs';

function parseSticker(token) {
  // формат: 30x50x1000 (ширина x высота x тираж)
  const m = String(token).match(/^(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)[x×](\d+)$/i);
  if (!m) return null;
  const [, w, h, c] = m;
  return { width_mm: +w, height_mm: +h, count: +c };
}

const args = process.argv.slice(2);
const stickers = [];
const options = { lam1:false, lam2:false, rolling:false };
let dbg = false;

for (const t of args) {
  const low = t.toLowerCase();
  if (low === 'lam1') options.lam1 = true;
  else if (low === 'lam2') options.lam2 = true;
  else if (['roll','rolling','rolls'].includes(low)) options.rolling = true;
  else if (low === 'debug') dbg = true;
  else {
    const st = parseSticker(t);
    if (st) stickers.push(st);
  }
}

if (!stickers.length) {
  console.error('Usage: node calc-cli.mjs 30x50x1000 [40x40x500] [lam1] [lam2] [roll] [debug]');
  process.exit(1);
}

// по умолчанию берём первую наклейку для размера селекции
const widthForSelection_mm  = stickers[0]?.width_mm  ?? 0;
const heightForSelection_mm = stickers[0]?.height_mm ?? 0;

const res = calcEtiketki({
  configPath: './out_etiketki/config.json',
  stickers,
  options,
  material: { cuttingCoeff: 1, engravingCoeff: 1 },
  widthForSelection_mm,
  heightForSelection_mm,
  debug: dbg,
});

console.log('\n=== RESULT ===');
console.log(JSON.stringify(res, null, 2));
