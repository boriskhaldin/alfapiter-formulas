import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(process.env.HOME || "~", "alfapiter-formulas");
const SCRIPTS_DIR = path.join(ROOT, "out_etiketki", "scripts");

// ---------- helpers ----------
function read(file) { return fs.readFileSync(file, "utf-8"); }

function grabArray(source, name) {
  const re = new RegExp(String.raw`${name}\s*=\s*$begin:math:display$\\s*([\\s\\S]*?)\\s*$end:math:display$`, "i");
  const m = source.match(re);
  if (!m) return null;
  const jsonish = `[${m[1]
    .replace(/\/\/.*$/gm, "")
    .replace(/'/g, '"')
    .replace(/,\s*]/g, "]")
  }]`;
  try { return JSON.parse(jsonish).map(v => Number(v)); }
  catch { return null; }
}
function grabConst(source, constName) {
  const re = new RegExp(String.raw`${constName}\s*=\s*([0-9.]+)`, "i");
  const m = source.match(re);
  return m ? Number(m[1]) : null;
}
function findFirstArray(files, name) {
  for (const f of files) {
    if (!fs.existsSync(f)) continue;
    const t = read(f);
    const v = grabArray(t, name);
    if (v) return v;
  }
  return null;
}
function findFirstConst(files, name) {
  for (const f of files) {
    if (!fs.existsSync(f)) continue;
    const t = read(f);
    const v = grabConst(t, name);
    if (typeof v === "number" && !Number.isNaN(v)) return v;
  }
  return null;
}

// где искать таблицы
const CANDIDATES = [
  path.join(SCRIPTS_DIR, "js_calculator.functions.plugin.js"),
  path.join(SCRIPTS_DIR, "js_calculator.default.plugin.js"),
];

function loadTables() {
  const tables = {
    dataPrintArea  : findFirstArray(CANDIDATES, "dataPrintArea"),
    dataPrintPrice : findFirstArray(CANDIDATES, "dataPrintPrice"),

    dataCutterArea : findFirstArray(CANDIDATES, "dataCutterArea"),
    dataCutterPrice: findFirstArray(CANDIDATES, "dataCutterPrice"),

    dataManualArea : findFirstArray(CANDIDATES, "dataManualArea"),
    dataManualPrice: findFirstArray(CANDIDATES, "dataManualPrice"),

    dataSelectionArea : findFirstArray(CANDIDATES, "dataSelectionArea"),
    dataSelectionPrice: findFirstArray(CANDIDATES, "dataSelectionPrice"),

    dataRollingArea : findFirstArray(CANDIDATES, "dataRollingArea"),
    dataRollingPrice: findFirstArray(CANDIDATES, "dataRollingPrice"),

    dataLaserQty   : findFirstArray(CANDIDATES, "dataLaserQty"),
    dataLaserPrice : findFirstArray(CANDIDATES, "dataLaserPrice"),
    dataLaserCO2EngraveArea : findFirstArray(CANDIDATES, "dataLaserCO2EngraveArea"),
    dataLaserCO2EngravePrice: findFirstArray(CANDIDATES, "dataLaserCO2EngravePrice"),
    dataThermalQty : findFirstArray(CANDIDATES, "dataThermalQty"),
    dataThermalPrice: findFirstArray(CANDIDATES, "dataThermalPrice"),
  };
  const consts = {
    PRINT_AREA_MIN : findFirstConst(CANDIDATES, "PRINT_AREA_MIN"),
  };
  return { tables, consts };
}

// -------- математика (как на сайте) ----------
function binarySearchAsc(arr, x) {
  let lo = 0, hi = arr.length - 1, ans = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (Number(arr[mid]) <= x) { ans = mid; lo = mid + 1; }
    else { hi = mid - 1; }
  }
  return ans;
}
function linear(metric, dataArea, dataPrice) {
  if (!Array.isArray(dataArea) || !Array.isArray(dataPrice) || !dataArea.length) return 0;
  const x = Math.max(0, Number(metric) || 0);
  const i = binarySearchAsc(dataArea, x);
  const iClamped = Math.min(i, dataArea.length - 2);
  const x0 = Number(dataArea[iClamped]);
  const x1 = Number(dataArea[iClamped + 1] ?? x0);
  const y0 = Number(dataPrice[iClamped]);
  const y1 = Number(dataPrice[iClamped + 1] ?? y0);
  const dx = (x1 - x0) || 1;
  const k  = (y1 - y0) / dx;
  const pricePerUnit = y0 + (x - x0) * k;
  return pricePerUnit * x;
}
const fmt = n => new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(n);

// -------- API расчёта ----------
export function calcEtiketki(input = {}) {
  const { tables, consts } = loadTables();

  const stickers = Array.isArray(input.stickers) && input.stickers.length ? input.stickers : [];
  if (!stickers.length) throw new Error("Нужно передать stickers: [{ width_mm, height_mm, count }]");

  let totalArea = 0;
  let totalPerim = 0;
  for (const s of stickers) {
    const w = Number(s.width_mm)  || 0;
    const h = Number(s.height_mm) || 0;
    const cnt = Number(s.count)   || 0;
    totalArea  += (w/1000) * (h/1000) * cnt;
    totalPerim += ((w + h) * 2 / 1000) * cnt;
  }

  const refW = Number(input.widthForSelection_mm ?? stickers[0]?.width_mm ?? 0);
  const refH = Number(input.heightForSelection_mm ?? stickers[0]?.height_mm ?? 0);

  let printCost = 0;
  if (tables.dataPrintArea && tables.dataPrintPrice) {
    const effArea = (consts.PRINT_AREA_MIN && totalArea <= consts.PRINT_AREA_MIN)
      ? consts.PRINT_AREA_MIN
      : totalArea;
    printCost = linear(effArea, tables.dataPrintArea, tables.dataPrintPrice);
  }

  let materialCost = 0;

  let lam1Cost = 0;
  let lam2Cost = 0;
  if (input.options?.lam1) lam1Cost = lam1Cost * 1.2;
  if (input.options?.lam2) lam2Cost = lam2Cost * 1.2;

  const cutterCost = (tables.dataCutterArea && tables.dataCutterPrice)
    ? linear(totalArea, tables.dataCutterArea, tables.dataCutterPrice)
    : 0;

  const manualCost = (tables.dataManualArea && tables.dataManualPrice)
    ? linear(totalPerim, tables.dataManualArea, tables.dataManualPrice)
    : 0;

  let selectionBase = (tables.dataSelectionArea && tables.dataSelectionPrice)
    ? linear(totalArea, tables.dataSelectionArea, tables.dataSelectionPrice)
    : 0;
  let selectionCoeff = 1;
  if (refW <= 20 || refH <= 20) selectionCoeff = 2;
  const selectionCost = selectionBase * selectionCoeff;

  const rollingCost = (input.options?.rolling && tables.dataRollingArea && tables.dataRollingPrice)
    ? linear(totalArea, tables.dataRollingArea, tables.dataRollingPrice)
    : 0;

  const cuttingK  = Number(input.material?.cuttingCoeff   ?? 1);
  const engraveK  = Number(input.material?.engravingCoeff ?? 1); // зарезервировано
  const cutterCostAdj    = cutterCost * cuttingK;
  const selectionCostAdj = selectionCost * cuttingK;

  const breakdown = {
    printCost,
    materialCost,
    lam1Cost,
    lam2Cost,
    cutterCost: cutterCostAdj,
    manualCost,
    selectionCost: selectionCostAdj,
    rollingCost,
  };
  const total = Object.values(breakdown).reduce((s,v)=>s+v,0);

  if (input.debug) {
    console.log("AREA (m²):", fmt(totalArea), " PERIM (м.п.):", fmt(totalPerim));
    console.table(Object.fromEntries(Object.entries(breakdown).map(([k,v])=>[k, fmt(v)])));
    console.log("TOTAL:", fmt(total));
  }

  return { total, breakdown, area: totalArea, perimeter: totalPerim };
}

// -------- CLI ----------
if (import.meta.url === `file://${process.argv[1]}`) {
  const [ , , wStr, hStr, cntStr, ...rest ] = process.argv;
  const w = Number(wStr), h = Number(hStr), cnt = Number(cntStr);
  if (!(w>0 && h>0 && cnt>0)) {
    console.error("Usage: node etiketki-formula.mjs <width_mm> <height_mm> <count> [--lam1] [--lam2] [--rolling]");
    process.exit(1);
  }
  const flags = new Set(rest);
  const opt = {
    stickers: [{ width_mm: w, height_mm: h, count: cnt }],
    options: { lam1: flags.has("--lam1"), lam2: flags.has("--lam2"), rolling: flags.has("--rolling") },
    material: { cuttingCoeff: 1, engravingCoeff: 1 },
    widthForSelection_mm: w, heightForSelection_mm: h,
    debug: true
  };
  const res = calcEtiketki(opt);
  console.log("\nИТОГО:", fmt(res.total), "₽");
}
