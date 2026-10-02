// 넓은 화면 강사 셸 = «파스텔 바탕 위 둥근 흰 판 하나» (2026-10-02 · 시안 «D 차분»)
//
//   node tools/panel-frame-test.mjs
//
// 붙드는 것: 머리·사이드·본문이 판(inset 22) 안에 있다 · 문서는 안 굴러가고 본문만 판 안에서 굴러간다 ·
//   render() 가 돌아도 본문 스크롤이 제자리 · 다른 화면으로 가면 맨 위 · 864 는 예전 줄 모드 그대로.

import { chromium } from 'playwright';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { 씨앗, 무대들 } from './shots-scenes.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PORT = 8796;
const 서버 = spawn(process.execPath, [path.join(HERE, 'serve.js'), String(PORT)], { stdio: 'ignore' });
let pass = 0, fail = 0;
const 봄 = (무엇, 나온것, 나와야) => {
  const ok = JSON.stringify(나온것) === JSON.stringify(나와야);
  if(ok){ pass++; console.log('  ✓ ' + 무엇); }
  else { fail++; console.log(`  ✗ ${무엇}\n      나온 것: ${JSON.stringify(나온것)}\n      나와야:  ${JSON.stringify(나와야)}`); }
};
const 열기 = async (브라우저, w, h) => {
  const page = await 브라우저.newPage({ viewport: { width: w, height: h } });
  for(let i = 0; i < 40; i++){ try{ await page.goto(`http://127.0.0.1:${PORT}/index.html`); break; }catch{ await page.waitForTimeout(250); } }
  await page.waitForFunction(() => typeof render === 'function' && typeof DATA !== 'undefined');
  await page.evaluate(씨앗);
  return page;
};

const 브라우저 = await chromium.launch();
try{
  const page = await 열기(브라우저, 1440, 640);   // 낮은 창 — 본문이 넘쳐야 굴러간다
  await page.evaluate(무대들.시험일정.세우기);
  const 자리 = await page.evaluate(() => {
    const r = q => { const b = document.querySelector(q).getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top)]; };
    return { 머리: r('.app > .topbar'), 사이드: r('.st-nav'), 본문: r('.app > .body') };
  });
  봄('판 안 — 머리 (44,38) · 사이드 (44,110) · 본문 (312,110)', 자리, { 머리: [44, 38], 사이드: [44, 110], 본문: [312, 110] });
  봄('문서는 안 굴러간다', await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight), true);
  /* 설정은 제 안쪽 상자(.ex-body)가 굴러간다 — 본문째 굴러가는 홈으로 본다 */
  await page.evaluate(무대들.홈메모.세우기);
  봄('본문이 판 안에서 넘친다', await page.evaluate(() => { const b = document.querySelector('.app > .body'); return b.scrollHeight > b.clientHeight; }), true);

  await page.evaluate(() => { document.querySelector('.app > .body').scrollTop = 120; render(); });
  봄('🔴 다시 그려도 본문 스크롤이 제자리', await page.evaluate(() => document.querySelector('.app > .body').scrollTop), 120);
  await page.evaluate(() => { state.teacherTab = 'signals'; render(); });
  봄('다른 화면은 맨 위에서', await page.evaluate(() => document.querySelector('.app > .body').scrollTop), 0);

  /* 864 — 줄 모드(예전 그대로): 본문은 문서처럼 흐른다 */
  const 좁은 = await 열기(브라우저, 864, 700);
  await 좁은.evaluate(무대들.시험일정.세우기);
  봄('864 는 판이 없다(본문 static)', await 좁은.evaluate(() => getComputedStyle(document.querySelector('.app > .body')).position), 'static');
} finally {
  await 브라우저.close(); 서버.kill();
}
console.log(`\n${pass} 통과 · ${fail} 실패`);
process.exit(fail ? 1 : 0);
