// 쓰던 칸을 다시 그려도 잃지 않는가 · 키보드로 닿는가 (11-07 · 코덱스 지적)
//
//   node tools/form-keep-test.mjs
//
// 붙드는 것 — 저장 안 한 점수는 화면을 옮겨도 남고 알린다 · 🔴 학교 성적 값이 다른 학기로 번지지 않는다
//   저장되면 남은 칸이 지워진다 · 손칸은 저장값이 바뀌면 새 값을 둔다 · onclick 칸이 Tab·Enter 로 눌린다.

import { chromium } from 'playwright';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { 씨앗, 무대들 } from './shots-scenes.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PORT = 8853;
const 서버 = spawn(process.execPath, [path.join(HERE, 'serve.js'), String(PORT)], { stdio: 'ignore' });
let pass = 0, fail = 0;
const 봄 = (무엇, 나온것, 나와야) => {
  const ok = JSON.stringify(나온것) === JSON.stringify(나와야);
  if(ok){ pass++; console.log('  ✓ ' + 무엇); }
  else { fail++; console.log(`  ✗ ${무엇}  나온 것: ${JSON.stringify(나온것)}  나와야: ${JSON.stringify(나와야)}`); }
};

const 브라우저 = await chromium.launch();
try{
  const page = await 브라우저.newPage({ viewport: { width: 1440, height: 900 } });
  const 오류 = []; page.on('pageerror', e => 오류.push(e.message));
  await page.clock.setFixedTime(new Date('2026-10-03T15:00:00'));
  for(let i = 0; i < 40; i++){ try{ await page.goto(`http://127.0.0.1:${PORT}/index.html`); break; }catch{ await page.waitForTimeout(150); } }
  await page.waitForFunction(() => typeof render === 'function' && typeof DATA !== 'undefined');
  await page.evaluate(씨앗); await page.evaluate(무대들.홈메모.세우기);

  /* 학교 성적 — 학기를 바꾸면 값이 따라가지 않고, 돌아오면 남아 있다 */
  const sid = await page.evaluate(() => {
    const c = DATA.classes[0]; DATA.students.slice(0, 3).forEach(s => s.classId = c.id);
    state.teacherTab = 'classhub'; state.classHubId = c.id; state.classHubTab = 'scores';
    state.nsMode = 'school'; state.nsTerm = '2026 · 2학기 중간'; state.allRecordsLoaded = true;
    render();
    return classRoster(c.id)[0].studentId;
  });
  const 칸 = '#ns-s-2-' + sid;   // 학교 시험은 학년도 네 시험 한 표 — 2 = 2학기 중간 (11-13)
  await page.fill(칸, '91');
  await page.evaluate(() => render());
  봄('같은 화면을 다시 그려도 남는다', await page.inputValue(칸), '91');
  await page.evaluate(() => { state.nsTerm = '2025 · 1학기 중간'; render(); });
  봄('🔴 다른 학기 칸으로 번지지 않는다', await page.inputValue(칸), '');
  봄('떠나면 알린다', await page.evaluate(() => /저장 안 한 점수 1칸/.test(state.toast || '')), true);
  await page.evaluate(() => { state.nsTerm = '2026 · 2학기 중간'; render(); });
  봄('돌아오면 그대로다', await page.inputValue(칸), '91');
  await page.evaluate(() => { state.teacherTab = 'dash'; render(); state.teacherTab = 'classhub'; render(); });
  봄('탭을 다녀와도 그대로다', await page.inputValue(칸), '91');

  /* 저장되면 — 새 기본값과 같아지면 남은 칸을 지운다 */
  봄('남은 칸이 잡혀 있다', await page.evaluate(() => Object.keys(state.scoreDraft).length), 1);
  await page.evaluate(([id]) => {
    const e = document.getElementById(id); e.defaultValue = '91';   // 저장 뒤 다시 그린 칸과 같은 상태
    render();
  }, ['ns-s-2-' + sid]);
  봄('값이 같아진 칸은 지운다', await page.evaluate(() => Object.keys(state.scoreDraft).length), 0);

  /* 손칸 — 값은 지키되, 저장값이 바뀌면 새 값 */
  await page.evaluate(() => {
    const app = document.getElementById('app');
    const d = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
    window.덧칸 = '옛글';
    Object.defineProperty(app, 'innerHTML', { configurable: true, get(){ return d.get.call(this); },
      set(v){ d.set.call(this, v + `<textarea id="bank-content-x">${window.덧칸}</textarea><input type="checkbox" id="tae-a-c">`); } });
    render();
  });
  await page.fill('#bank-content-x', '고친 글');
  await page.check('#tae-a-c');
  await page.evaluate(() => render());
  봄('고치던 글이 남는다', await page.inputValue('#bank-content-x'), '고친 글');
  봄('고른 체크도 남는다', await page.isChecked('#tae-a-c'), true);
  await page.evaluate(() => { window.덧칸 = 'AI 새 글'; render(); });
  봄('저장값이 바뀌면 새 값', await page.inputValue('#bank-content-x'), 'AI 새 글');
  await page.evaluate(() => { delete document.getElementById('app').innerHTML; render(); });

  /* 키보드 — onclick 칸에 닿고, Enter 로 눌리고, 다시 그려도 초점이 남는다 */
  await page.evaluate(() => {
    window.눌림 = 0;
    window.덧눌림 = () => { 눌림++; render(); };
    const app = document.getElementById('app');
    const d = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
    Object.defineProperty(app, 'innerHTML', { configurable: true, get(){ return d.get.call(this); },
      set(v){ d.set.call(this, v + `<div class="app"><div id="k1x" onclick="덧눌림()">칸</div></div>`.replace(' id="k1x"', '')); } });
    render();
  });
  const 칸글 = page.locator('div[onclick="덧눌림()"]');
  봄('Tab 으로 닿는다', [await 칸글.getAttribute('tabindex'), await 칸글.getAttribute('role')], ['0', 'button']);
  await 칸글.focus();
  await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab');   // 키보드 초점으로 만든다
  await page.keyboard.press('Enter');
  봄('Enter 로 눌린다', await page.evaluate(() => 눌림), 1);
  봄('다시 그려도 초점이 남는다', await page.evaluate(() => document.activeElement.getAttribute('onclick')), '덧눌림()');
  await page.evaluate(() => { delete document.getElementById('app').innerHTML; });

  봄('페이지 오류 없음', 오류, []);

  /* 좁은 화면 — 표를 옆으로 밀어도 이름이 남고, 바탕이 비치지 않는다 */
  const 폰 = await 브라우저.newPage({ viewport: { width: 864, height: 800 } });
  await 폰.goto(`http://127.0.0.1:${PORT}/index.html`);
  await 폰.waitForFunction(() => typeof render === 'function' && typeof DATA !== 'undefined');
  await 폰.evaluate(씨앗); await 폰.evaluate(무대들.학생명단.세우기);
  const 이름칸 = await 폰.evaluate(async () => {
    const 표 = document.querySelector('.rst-wrap'), 칸 = 표.querySelector('tbody tr td:nth-child(2)');
    const 앞 = 칸.getBoundingClientRect().left;
    표.scrollLeft = 400;
    await new Promise(r => requestAnimationFrame(r));
    return { 밀림: 표.scrollLeft > 0, 그대로: Math.abs(칸.getBoundingClientRect().left - 앞) < 12,
      바탕: getComputedStyle(칸).backgroundColor !== 'rgba(0, 0, 0, 0)' };
  });
  봄('명단을 밀어도 이름이 남는다', 이름칸, { 밀림: true, 그대로: true, 바탕: true });
  await 폰.close();
} finally { await 브라우저.close(); 서버.kill(); }

console.log(`\n${pass} 통과 · ${fail} 실패`);
process.exit(fail ? 1 : 0);
