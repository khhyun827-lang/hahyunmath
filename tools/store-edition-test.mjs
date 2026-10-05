// 문항 창고 — 실린 교재·판 (2026-10-05): 판을 고르면 교재 번호 차례 · 숫자 = 교재 번호 · 판 전체로 돌아간다
//   node tools/store-edition-test.mjs   (실제 크롬 · 무대 «창고교재판»)
import { chromium } from 'playwright';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { 씨앗, 무대들 } from './shots-scenes.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PORT = 8813;
const 서버 = spawn(process.execPath, [path.join(HERE, 'serve.js'), String(PORT)], { stdio: 'ignore' });
let pass = 0, fail = 0;
const 봄 = (무엇, 나온것, 나와야) => {
  const ok = JSON.stringify(나온것) === JSON.stringify(나와야);
  if(ok){ pass++; console.log('  ✓ ' + 무엇); }
  else { fail++; console.log(`  ✗ ${무엇}\n      나온 것: ${JSON.stringify(나온것)}\n      나와야:  ${JSON.stringify(나와야)}`); }
};
const 브라우저 = await chromium.launch();
try{
  const page = await 브라우저.newPage({ viewport: { width: 1440, height: 900 } });
  for(let i = 0; i < 40; i++){ try{ await page.goto(`http://127.0.0.1:${PORT}/index.html`); break; }catch{ await page.waitForTimeout(250); } }
  await page.waitForFunction(() => typeof render === 'function' && typeof DATA !== 'undefined');
  await page.evaluate(씨앗);
  await page.evaluate(무대들.창고교재판.세우기);
  const 번호들 = () => page.$$eval('.ist-item', els => els.map(e => (e.textContent.match(/2026 · (\d+)번/) || [])[1]).map(Number));
  봄('2026판을 고르면 교재 번호 차례', await 번호들(), [2, 5, 34, 81]);
  await page.locator('#ist-q').pressSequentially('34');
  봄('숫자 34 = 교재 번호 34 하나', await 번호들(), [34]);
  await page.locator('#ist-q').fill('');
  await page.locator('#ist-q').dispatchEvent('input');
  await page.locator('.ist-books .pill', { hasText: '2027' }).click();
  봄('2027판을 고르면 그 판에 실린 것만', await page.$$eval('.ist-item', e => e.length), 1);
  await page.locator('.ist-books .pill', { hasText: '판 전체' }).click();
  봄('판 전체로 돌아간다', await page.evaluate(() => state.storeEdition), '');
} finally {
  await 브라우저.close(); 서버.kill();
}
console.log(`\n${pass} 통과 · ${fail} 실패`);
process.exit(fail ? 1 : 0);
