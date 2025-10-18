import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';

const OUT = path.resolve(process.cwd(), 'out_etiketki');
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(path.join(OUT, 'scripts'), { recursive: true });
fs.mkdirSync(path.join(OUT, 'responses'), { recursive: true });

const PAGE_URL = 'https://alfapiter.ru/calculators/etiketki';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function save(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, data);
}

function findBrowser() {
  const candidates = [
    process.env.BROWSER,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Yandex.app/Contents/MacOS/Yandex',
    '/Applications/Chromium.app/Contents/MacOS/Chromium'
  ].filter(Boolean);
  for (const p of candidates) {
    if (p && fs.existsSync(p)) return { executablePath: p };
  }
  return {};
}

(async () => {
  const hint = findBrowser();
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox','--disable-dev-shm-usage'],
    ...hint
  });
  const page = await browser.newPage();

  await page.setRequestInterception(true);
  page.on('request', req => {
    const u = req.url();
    if (/\.(png|jpe?g|gif|svg|webp|ico)$/i.test(u) || /metrika|analytics|gtm|mc\.yandex/i.test(u)) return req.abort();
    req.continue();
  });

  page.on('response', async res => {
    try {
      const u = res.url();
      const ct = res.headers()['content-type'] || '';
      if (!/json|text|javascript/i.test(ct) && !/[.?](json|js)(\?|$)/i.test(u)) return;
      const body = await res.text();
      const id = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
      let ext = '.txt';
      if (/\.js(\?|$)/i.test(u) || /javascript/i.test(ct)) ext = '.js';
      else if (/\.json(\?|$)/i.test(u) || /json/i.test(ct)) ext = '.json';
      const file = path.join(OUT, 'responses', `${id}${ext}`);
      save(file, `URL: ${u}\nCT: ${ct}\n\n${body}`);
      console.log('Saved:', file);
    } catch {}
  });

  const client = await page.target().createCDPSession();
  await client.send('Debugger.enable');
  client.on('Debugger.scriptParsed', async ev => {
    try {
      const { scriptSource } = await client.send('Debugger.getScriptSource', { scriptId: ev.scriptId });
      const name = ev.url
        ? (new URL(ev.url).pathname.split('/').pop() || 'external.js').replace(/[^\w.-]+/g,'_')
        : `inline_${ev.scriptId}.js`;
      save(path.join(OUT, 'scripts', name), scriptSource || '');
    } catch {}
  });

  await page.evaluateOnNewDocument(() => {
    const _eval = window.eval;
    window.eval = function(src){ try{ console.log('[EVAL_CAPTURE]', String(src).slice(0,4000)); }catch(e){} return _eval(src); };
    const _Function = window.Function;
    window.Function = function(...args){ try{ console.log('[FUNCTION_CAPTURE]', String(args[args.length-1]||'').slice(0,4000)); }catch(e){} return _Function(...args); };
  });

  await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await sleep(5000);

  save(path.join(OUT, 'page.html'), await page.content());

  const dataAttrs = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('*').forEach(el=>{
      const attrs={};
      for (const a of el.attributes) {
        if (a.name.startsWith('data-') && a.value && a.value.length > 5) attrs[a.name] = a.value;
      }
      if (Object.keys(attrs).length) out.push({tag:el.tagName, attrs});
    });
    return out;
  });
  save(path.join(OUT, 'dom_data_attrs.json'), JSON.stringify(dataAttrs, null, 2));

  await browser.close();
  console.log('✅ Готово! Все данные в:', OUT);
})();
