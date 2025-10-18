import fs from 'node:fs/promises';
import { loadConfig } from './calc-core.mjs';

// Простая линалgebra
function gaussSolve(A, b){
  const n = A.length;
  const M = A.map((row,i)=>[...row, b[i]]);
  for(let col=0, row=0; col<n && row<n; col++){
    let sel=row;
    for(let i=row;i<n;i++) if(Math.abs(M[i][col])>Math.abs(M[sel][col])) sel=i;
    if(Math.abs(M[sel][col])<1e-12) continue;
    [M[row], M[sel]] = [M[sel], M[row]];
    const div = M[row][col];
    for(let j=col;j<=n;j++) M[row][j] /= div;
    for(let i=0;i<n;i++){
      if(i===row) continue;
      const f = M[i][col]; if(Math.abs(f)<1e-12) continue;
      for(let j=col;j<=n;j++) M[i][j] -= f*M[row][j];
    }
    row++;
  }
  return M.map(r=>r[n]||0);
}

function ridge(X, y, lambda=1){
  const n = X.length, p = X[0].length;
  const XT = Array.from({length:p}, (_,i)=> X.map(r=>r[i]));
  const XTX = Array.from({length:p}, ()=>Array(p).fill(0));
  const XTy = Array(p).fill(0);
  for(let i=0;i<p;i++){
    for(let j=0;j<p;j++){
      let s=0; for(let k=0;k<n;k++) s += XT[i][k]*XT[j][k];
      XTX[i][j] = s + (i===j ? lambda : 0);
    }
    let sy=0; for(let k=0;k<n;k++) sy += XT[i][k]*y[k];
    XTy[i] = sy;
  }
  return gaussSolve(XTX, XTy);
}

const clampNonNeg = (w, mask) => w.map((v,i)=> mask[i] ? Math.max(0,v) : v);

(async ()=>{
  const OUT_DIR='./out_etiketki';
  const cfg = await loadConfig(`${OUT_DIR}/config.json`).catch(()=> ({}));
  const raw = await fs.readFile(`${OUT_DIR}/dataset.csv`, 'utf8').catch(()=>null);
  if(!raw){ console.error('Нет датасета out_etiketki/dataset.csv'); process.exit(1); }

  const rows = raw.trim().split('\n').slice(1).map(line=>{
    const [w,h,q,lam1,lam2,rolling,area,perim,total] = line.split(',');
    return {
      area: +area,
      perim: +perim,
      lam1: +(lam1==='1'),
      lam2: +(lam2==='1'),
      rolling: +(rolling==='1'),
      total: +total
    };
  }).filter(r=> Number.isFinite(r.area) && r.area>0 && Number.isFinite(r.perim) && Number.isFinite(r.total));

  if(!rows.length){ console.error('Пустой/битый датасет'); process.exit(1); }

  const lambdas = [0.1,0.3,1,3,10,30,100];
  const thresholds = Array.from({length:10}, (_,i)=> 0.3 + i*0.1); // 0.3..1.2 шаг 0.1
  let globalBest = {mae: Infinity, lambda:null, tH:null, w:null};

  for(const tH of thresholds){
    // признаки: 1, area, perim, lam1*area, lam2*area, roll*area, 1/area, max(0, tH-area)
    const X = rows.map(r=>{
      const invA = 1/Math.max(r.area, 1e-6);
      const h = Math.max(0, tH - r.area);
      return [1, r.area, r.perim, r.lam1*r.area, r.lam2*r.area, r.rolling*r.area, invA, h];
    });
    const y = rows.map(r=>r.total);

    for(const lambda of lambdas){
      let w = ridge(X,y,lambda);
      // всё кроме свободного члена — неотрицательно
      w = clampNonNeg(w, [false,true,true,true,true,true,true,true]);

      // MAE
      let s=0; for(let i=0;i<X.length;i++){
        const pred = X[i].reduce((a,v,j)=>a+v*w[j],0);
        s += Math.abs(pred - y[i]);
      }
      const mae = s/X.length;
      if(mae < globalBest.mae){
        globalBest = {mae, lambda, tH, w};
      }
    }
  }

  const w = globalBest.w;
  const coeffs = {
    intercept: w[0],
    kArea:     w[1],
    kPerim:    w[2],
    kLam1:     w[3],
    kLam2:     w[4],
    kRoll:     w[5],
    kInvA:     w[6],
    kHinge:    w[7],
    tHinge:    globalBest.tH
  };

  const outCfg = { ...cfg, coeffs };
  await fs.writeFile(`${OUT_DIR}/config.json`, JSON.stringify(outCfg, null, 2), 'utf8');

  // отчёт
  const Xbest = rows.map(r=>{
    const invA = 1/Math.max(r.area, 1e-6);
    const h = Math.max(0, globalBest.tH - r.area);
    return [1, r.area, r.perim, r.lam1*r.area, r.lam2*r.area, r.rolling*r.area, invA, h];
  });
  let abs=0, worst={d:-1, i:-1};
  for(let i=0;i<Xbest.length;i++){
    const pred = Xbest[i].reduce((a,v,j)=>a+v*w[j],0);
    const d = Math.abs(pred - rows[i].total);
    abs += d; if(d>worst.d) worst={d,i};
  }
  const mae = Math.round(abs/Xbest.length);

  console.log('✅ coeffs сохранены в config.json:', coeffs);
  console.log('🧪 MAE на обучении:', mae, '₽');
  console.log('😬 Худший пример:', rows[worst.i], 'Δ=', Math.round(worst.d));
})();
