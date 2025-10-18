import fs from 'node:fs/promises';

function interp1(xarr, yarr, x){
  if(!Array.isArray(xarr) || xarr.length===0) return 0;
  if(x<=xarr[0]) return yarr[0] ?? 0;
  if(x>=xarr[xarr.length-1]) return yarr[yarr.length-1] ?? 0;
  let i=1; while(i<xarr.length && x>xarr[i]) i++;
  const x0=xarr[i-1], x1=xarr[i], y0=yarr[i-1], y1=yarr[i];
  const t=(x-x0)/(x1-x0);
  return y0 + t*(y1-y0);
}

export async function loadConfig(path='./out_etiketki/config.json'){
  const raw = await fs.readFile(path,'utf8');
  return JSON.parse(raw);
}

export function calcTotal(cfg, stickers, opts){
  const area = stickers.reduce((s,st)=> s + (st.width_mm/1000)*(st.height_mm/1000)*st.count, 0);
  const perimeter = stickers.reduce((s,st)=> s + 2*((st.width_mm/1000)+(st.height_mm/1000))*st.count, 0);
  const breakdown = { printCost: 0, materialCost:0, cutterCost:0, manualCost:0, selectionCost:0, lam1Cost:0, lam2Cost:0, rollingCost:0 };

  let total = 0;

  if(cfg?.coeffs){
    const c = cfg.coeffs;
    const invA = 1/Math.max(area, 1e-6);
    const hinge = Math.max(0, (c.tHinge ?? 0) - area);

    const xA = area;
    const xP = perimeter;
    const xL1 = (opts.lam1?1:0)*area;
    const xL2 = (opts.lam2?1:0)*area;
    const xR  = (opts.rolling?1:0)*area;

    const pred =
      (c.intercept||0) +
      (c.kArea||0)*xA + (c.kPerim||0)*xP +
      (c.kLam1||0)*xL1 + (c.kLam2||0)*xL2 + (c.kRoll||0)*xR +
      (c.kInvA||0)*invA + (c.kHinge||0)*hinge;

    breakdown.printCost = Math.round(
      (c.intercept||0) + (c.kArea||0)*xA + (c.kPerim||0)*xP + (c.kInvA||0)*invA + (c.kHinge||0)*hinge
    );
    if(opts.lam1) breakdown.lam1Cost = Math.round((c.kLam1||0)*xL1);
    if(opts.lam2) breakdown.lam2Cost = Math.round((c.kLam2||0)*xL2);
    if(opts.rolling) breakdown.rollingCost = Math.round((c.kRoll||0)*xR);

    total = pred;
  } else {
    const base = interp1(cfg.dataPrintArea, cfg.dataPrintPrice, area);
    breakdown.printCost = Math.round(base);
    if(opts.lam1) breakdown.lam1Cost = Math.round(interp1(cfg.dataLam1Area, cfg.dataLam1Price, area));
    if(opts.lam2) breakdown.lam2Cost = Math.round(interp1(cfg.dataLam2Area, cfg.dataLam2Price, area));
    if(opts.rolling) breakdown.rollingCost = Math.round(interp1(cfg.dataRollingArea, cfg.dataRollingPrice, area));
    total = base + breakdown.lam1Cost + breakdown.lam2Cost + breakdown.rollingCost;
  }

  Object.keys(breakdown).forEach(k => { if(breakdown[k]<0) breakdown[k]=0; });
  if(total<0) total = 0;

  return { total: Math.round(total), breakdown, area: Number(area.toFixed(3)), perimeter: Math.round(perimeter) };
}
