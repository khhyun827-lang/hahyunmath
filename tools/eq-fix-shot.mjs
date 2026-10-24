// eq-fix 전후를 실제 화면(problemHTML + KaTeX)으로 찍는다 — 눈 확인용 (2026-10-24)
//   node tools/eq-fix-shot.mjs <덤프.json> <코드,코드,…> <out.png> [--before]
// ⚠ 덤프에는 본문이 있다 — 찍은 그림도 저장소에 두지 말 것.
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';
import { fixDoc } from './eq-fix.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const [덤프, 코드들, 그림] = process.argv.slice(2);
const 전 = process.argv.includes('--before');
const d = JSON.parse(fs.readFileSync(덤프, 'utf8'));
const 글 = 코드들.split(',').map(k => {
  const col = d.items[k] ? 'items' : 'variants', v = d[col][k];
  return { k, t: (전 ? v : (fixDoc(col, v) || v)).content };
});
const PORT = 8807;
const 서버 = spawn(process.execPath, [path.join(HERE, 'serve.js'), String(PORT)], { stdio: 'ignore' });
const 브 = await chromium.launch();
try {
  const page = await 브.newPage({ viewport: { width: 900, height: 900 } });
  for (let i = 0; i < 40; i++) { try { await page.goto(`http://127.0.0.1:${PORT}/index.html`); break; } catch { await page.waitForTimeout(250); } }
  await page.waitForFunction(() => typeof problemHTML === 'function' && window.renderMathInElement);
  await page.evaluate(글 => {
    document.body.innerHTML = '<div id="x" style="width:860px;padding:12px;background:#fff;font-size:15px;line-height:1.7"></div>';
    document.getElementById('x').innerHTML = 글.map(g => `<div style="border-bottom:2px solid #c33;padding:10px 0"><b style="color:#c33">${g.k}</b><div class="pb">${problemHTML(g.t.replace(/^\s+/, ''))}</div></div>`).join('');
    renderMathInElement(document.getElementById('x'), { delimiters: [{ left: '$', right: '$', display: false }], throwOnError: false });
  }, 글);
  await page.waitForTimeout(500);
  await page.locator('#x').screenshot({ path: 그림 });
} finally { await 브.close(); 서버.kill(); }
console.log('찍음', 그림);
