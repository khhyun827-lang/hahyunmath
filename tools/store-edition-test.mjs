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
  /* 단원 앞 번호 (2026-10-05) */
  봄('단원 이름 앞에 번호', await page.evaluate(() => storeChapterLabel('공통수학1', '03')), '3. 인수분해');
  /* 자동 채우기 범위 (2026-10-05) — 창고에서 고른 판이 곧 범위 · 단추에 적힌다 · 그 판에 없는 문항은 빠진다 */
  await page.locator('.ist-books .pill', { hasText: '2026' }).click();
  봄('자동 채우기 단추에 범위가 적힌다', await page.locator('.ist-bar button', { hasText: '자동 채우기' }).innerText().then(t => t.includes('주기나 1-1중간 2026')), true);
  봄('범위 — 그 판에 실린 문항만', await page.evaluate(() => {
    const sc = autoFillScopeNow(), 실림 = Object.keys(state.itemBody)[0];
    const 안실림 = Object.keys(state.itemByCode).find(c => !state.itemBody[c] && /^1\d{6}$/.test(c));
    return [!!sc && sc.ed, autoFillScopeOk(실림, sc), autoFillScopeOk(안실림, sc), autoFillScopeOk(안실림, null)];
  }), ['주기나 1-1중간 2026', true, false, true]);
} finally {
  await 브라우저.close(); 서버.kill();
}
console.log(`\n${pass} 통과 · ${fail} 실패`);
process.exit(fail ? 1 : 0);
