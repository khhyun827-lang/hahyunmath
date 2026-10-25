// 변형 그림 «옛 SVG | 새 figure.js 로 다시 그린 것» 을 나란히 찍는다 — 다시 그려 바꿔 쓰기 전 눈 확인용 (2026-10-25)
//   node tools/fig-compare-shot.mjs <덤프.json> <코드,…> <out.png>
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';
const HERE = path.dirname(fileURLToPath(import.meta.url));
new Function(fs.readFileSync(path.join(HERE, '..', 'figure.js'), 'utf8'))();
const [덤프, 코드들, 그림] = process.argv.slice(2);
const d = JSON.parse(fs.readFileSync(덤프, 'utf8'));
const 줄 = 코드들.split(',').map(k => { const im = d.variants[k].image; return `<div style="display:flex;gap:10px;align-items:center;border-bottom:1px solid #999;padding:6px">
  <b style="width:150px;font-size:13px">${k}</b><div style="flex:1">옛<br>${im.svg}</div><div style="flex:1">새<br>${globalThis.Figure.renderScene(im.scene)}</div></div>`; }).join('');
const 브 = await chromium.launch();
const page = await 브.newPage({ viewport: { width: 1300, height: 900 } });
await page.setContent(`<div id="x" style="width:1280px;background:#fff;color:#111;font-family:sans-serif">${줄.replace(/<svg /g, '<svg style="max-width:100%;height:auto;max-height:260px" ')}</div>`);
await page.locator('#x').screenshot({ path: 그림 });
await 브.close();
console.log('찍음', 그림);
