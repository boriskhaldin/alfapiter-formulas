import fs from 'fs';
import path from 'path';
const ROOT = path.resolve(process.cwd(), 'out_etiketki');

const files = [];
(function walk(dir){
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p);
    else if (/\.(js|json|txt|html)$/i.test(p)) files.push(p);
  }
})(ROOT);

const re = /(formula|new Function|eval|with\(scope\)|price|total|sum|cost|unit|min_?total|width|height|qty|quantity|area|perimeter|etiket|площад|перим|коэф|тариф|ставк)/i;

let out = '';
for (const f of files) {
  const text = fs.readFileSync(f,'utf8');
  const hits = text.split(/\r?\n/).filter(l=>re.test(l));
  if (hits.length) {
    out += `\n=== ${f} ===\n` + hits.slice(0,40).join('\n') + '\n';
  }
}

const rpt = path.join(ROOT, 'formulas_report.txt');
fs.writeFileSync(rpt, out || 'no hits');
console.log('Report saved to:', rpt);
