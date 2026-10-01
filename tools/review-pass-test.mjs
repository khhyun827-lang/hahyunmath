// 검토 — 「AI 일치 모두 통과」 (2026-10-02 · P-3) — 실제 크롬으로 누른다
//
//   node tools/review-pass-test.mjs
//
// 붙드는 것: AI «같은 답»인 변형만 통과 · 🔴 그림이 있는 문항은 같은 답이어도 남는다(사용자 — 「그림은 꼭 확인」) ·
//   답이 다른 것·검토 안 한 것은 남는다 · 원본 본문을 못 읽은 것도 남는다(모르면 사람이 본다) · 단추 수 · 「그림 있는 n개는 직접」.
// 실 DB 는 안 건드린다 — dbSetDoc 을 흉내 내고 무엇이 저장됐는지 본다. 무대는 shots-scenes 의 「검토」.

import { chromium } from 'playwright';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { 씨앗, 무대들 } from './shots-scenes.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PORT = 8795;
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
  page.on('dialog', d => d.accept());
  for(let i = 0; i < 40; i++){ try{ await page.goto(`http://127.0.0.1:${PORT}/index.html`); break; }catch{ await page.waitForTimeout(250); } }
  await page.waitForFunction(() => typeof render === 'function' && typeof DATA !== 'undefined');
  await page.evaluate(씨앗);
  await page.evaluate(무대들['검토'].세우기);
  /* 원본 본문을 못 읽은 같은 답 하나를 더한다 — «모르면 뺀다» */
  await page.evaluate(() => {
    state.variants.K2.push({ code: 'K2-09-E-0900', originCode: 'K2-09-E-0899', content: '1 + 1 의 값은?\n① 1  ② 2  ③ 3  ④ 4  ⑤ 5', answer: '②',
      pending: true, aiReview: { verdict: 'agree', answer: '②' } });
    window.저장 = [];
    window.dbSetDoc = async (c, id) => { 저장.push(c + '/' + id); return true; };
    window.fillEmptyFromStore = async () => ({ 채움: 0 });
    render();
  });
  const 단추 = page.locator('.rv-aibar button', { hasText: 'AI 일치' });
  봄('단추는 그림 없는 같은 답만 센다 (0211 · 0150)', (await 단추.textContent()).replace(/\s+/g, ' ').trim(), 'AI 일치 2개 모두 통과');
  봄('그림 있거나 원본을 못 읽은 같은 답은 «직접»으로 센다', (await page.textContent('.rv-figskip')).trim(), '그림 있는 2개는 직접');
  await 단추.click();
  await page.waitForFunction(() => !state.bulkPassing);
  봄('🔴 저장된 것은 정확히 그 둘', await page.evaluate(() => 저장.slice().sort()), ['variants/K2-02-H-0150', 'variants/K2-03-M-0211']);
  봄('🔴 남은 검토 대기 — 답 다름 · 그림 · 원본 모름', await page.evaluate(() => pendingVariants().map(v => v.code)),
    ['K2-04-M-0318', 'K2-05-E-0560', 'K2-09-E-0900']);
  봄('다 통과시키면 단추가 꺼진다', await 단추.isDisabled(), true);
  봄('넓은 화면에서는 코드 띠가 보이고 목록 칸은 접힌다',
    await page.evaluate(() => [getComputedStyle(document.querySelector('.rv-strip')).display, getComputedStyle(document.querySelector('.rv-list')).display]),
    ['flex', 'none']);
} finally {
  await 브라우저.close(); 서버.kill();
}
console.log(`\n${pass} 통과 · ${fail} 실패`);
process.exit(fail ? 1 : 0);
