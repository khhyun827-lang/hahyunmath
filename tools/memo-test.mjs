// 강사 홈 메모 (2026-10-02) — 실제 크롬으로 누르고 적어 본다
//
//   node tools/memo-test.mjs
//
// 붙드는 것: 불러오기 · 할 일 더하기(Enter) · 체크 · 지우기 · 글 칸 1초 뒤 저장 ·
//   글 칸에서 쓰는 중 render() 가 돌아도 커서가 그대로 · 조교 화면엔 없다 · 864 에서 «오른쪽 칸 맨 위».
// 실 DB 는 안 건드린다 — dbGet/dbSet 을 흉내 내고 저장된 값을 본다.

import { chromium } from 'playwright';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { 씨앗 } from './shots-scenes.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PORT = 8791;
const 서버 = spawn(process.execPath, [path.join(HERE, 'serve.js'), String(PORT)], { stdio: 'ignore' });
let pass = 0, fail = 0;
const 봄 = (무엇, 나온것, 나와야) => {
  const ok = JSON.stringify(나온것) === JSON.stringify(나와야);
  if(ok){ pass++; console.log('  ✓ ' + 무엇); }
  else { fail++; console.log(`  ✗ ${무엇}\n      나온 것: ${JSON.stringify(나온것)}\n      나와야:  ${JSON.stringify(나와야)}`); }
};

const 브라우저 = await chromium.launch();
try{
  const page = await 브라우저.newPage({ viewport: { width: 864, height: 900 } });
  for(let i = 0; i < 40; i++){ try{ await page.goto(`http://127.0.0.1:${PORT}/index.html`); break; }catch{ await page.waitForTimeout(250); } }
  await page.waitForFunction(() => typeof render === 'function' && typeof DATA !== 'undefined');
  await page.evaluate(씨앗);
  await page.evaluate(() => {
    window.저장 = [];
    window.authUid = () => 'u1';
    const 옛것 = window.dbGet;
    window.dbGet = async (k, d) => k === 'memo:u1' ? { todos: [{ t: '첫 일', done: false }], note: '처음 글' } : 옛것(k, d);
    window.dbSet = async (k, v) => { 저장.push([k, JSON.parse(JSON.stringify(v))]); return true; };
    state.currentUser = { type: 'teacher', name: 'T' }; state.view = 'teacher'; state.teacherTab = 'dash';
    state.allRecordsLoaded = true; state.memo = null; render();
  });
  await page.waitForSelector('.memo-todo');
  const 마지막 = () => page.evaluate(() => 저장.length ? 저장[저장.length - 1] : null);

  봄('불러온다', await page.$$eval('.memo-todo span', e => e.map(x => x.textContent)), ['첫 일']);
  봄('글 칸에 불러온 글', await page.inputValue('#memo-note'), '처음 글');

  await page.fill('#memo-add', '둘째 일'); await page.press('#memo-add', 'Enter');
  봄('Enter 로 더한다 · 저장', await 마지막(), ['memo:u1', { todos: [{ t: '첫 일', done: false }, { t: '둘째 일', done: false }], note: '처음 글' }]);
  봄('더한 뒤 입력칸은 비고 커서가 남는다', await page.evaluate(() => [document.activeElement.id, document.activeElement.value]), ['memo-add', '']);
  봄('남은 일 수', await page.textContent('.dsh-memo .dsh-n'), '2');

  await page.locator('.memo-todo input').first().click();
  봄('체크 → done', (await 마지막())[1].todos[0].done, true);
  봄('남은 일 수 1', await page.textContent('.dsh-memo .dsh-n'), '1');
  await page.locator('.memo-todo .memo-x').first().click();
  봄('지우기', (await 마지막())[1].todos.map(x => x.t), ['둘째 일']);

  const 저장수 = await page.evaluate(() => 저장.length);
  await page.click('#memo-note'); await page.keyboard.press('End'); await page.keyboard.type(' 더');
  봄('글은 바로 저장하지 않는다', await page.evaluate(() => 저장.length), 저장수);
  await page.waitForTimeout(1300);
  봄('1초 쉬면 저장', (await 마지막())[1].note, '처음 글 더');

  await page.evaluate(() => { const n = document.getElementById('memo-note'); n.setSelectionRange(2, 2); render(); });
  봄('render 가 돌아도 커서 그대로', await page.evaluate(() => [document.activeElement.id, document.activeElement.selectionStart]), ['memo-note', 2]);

  // 864 — 시안 «D 차분» 홈(2026-10-02 · P-4): 메모는 «오른쪽 칸»(달력 밑) · 왼쪽은 오늘 수업 위 · 먼저 볼 학생 아래
  const 자리 = await page.evaluate(() => {
    const r = q => document.querySelector(q).getBoundingClientRect();
    return { 메모오른쪽: r('.dsh-memo').left > r('.dsh-a').right, 달력밑: r('.dsh-memo').top > r('.dsh-c .tcal').bottom - 1,
             오른칸맨위는달력: Math.abs(r('.dsh-c').top - r('.dsh-a').top) < 2, 학생은수업밑: r('.dsh-b').top >= r('.dsh-a').bottom };
  });
  봄('864 자리', 자리, { 메모오른쪽: true, 달력밑: true, 오른칸맨위는달력: true, 학생은수업밑: true });

  await page.evaluate(() => { state.currentUser = { type: 'assistant', name: 'A' }; render(); });
  봄('조교 홈엔 메모가 없다', await page.$$eval('.dsh-memo', e => e.length), 0);
} finally {
  await 브라우저.close(); 서버.kill();
}
console.log(`\n${pass} 통과 · ${fail} 실패`);
process.exit(fail ? 1 : 0);
