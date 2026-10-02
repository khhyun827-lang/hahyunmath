// 홈 빠른 작업 — 홈을 안 떠나고 팝업에서 (2026-10-03 · 사용자 — 「페이지 이동하지 않고 빠르게」 · 「과제 확인은 한 번 누르고 다른 걸 눌러야 작동」)
//
//   node tools/quick-action-test.mjs
//
// 붙드는 것 — 사이드 빠른 작업이 팝업을 연다(탭은 홈 그대로) · 출결은 수업 화면의 타일 · 닫으면 저절로 저장 ·
//   과제는 확인 대기만 과제별로 · 공지 등록하면 닫히고 홈 그대로 · ESC 로 닫힌다 · gotoHwWaiting 은 «바로» 그린다.
// DB 는 안 건드린다 — 저장 함수를 흉내 낸다.

import { chromium } from 'playwright';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { 씨앗, 무대들 } from './shots-scenes.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PORT = 8832;
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
  const 오류 = []; page.on('pageerror', e => 오류.push(e.message));
  for(let i = 0; i < 40; i++){ try{ await page.goto(`http://127.0.0.1:${PORT}/index.html`); break; }catch{ await page.waitForTimeout(250); } }
  await page.waitForFunction(() => typeof render === 'function' && typeof DATA !== 'undefined');
  await page.evaluate(씨앗); await page.evaluate(무대들.홈메모.세우기);
  await page.evaluate(() => {
    window.저장 = [];
    window.saveClassAttendance = async (c, d) => { 저장.push(['att', c, d]); };
    window.dbSetDoc = async (col, id) => { 저장.push([col, id]); return true; };
    const 오늘반 = sessionsOn(todayStr())[0]; DATA.students.slice(0, 4).forEach(s => s.classId = 오늘반.id);
    const c = DATA.classes[0];
    DATA.assignments.push({ id:'aQ1', classId:c.id, title:'개념원리 p.30~41', dueDate: todayStr() });
    classRoster(c.id).slice(0, 2).forEach(s => { const r = state.allRecords[s.studentId]; r.assignmentsDone = r.assignmentsDone || {};
      r.assignmentsDone.aQ1 = { status: HW_SUBMITTED, submittedAt: todayStr(), photos: [] }; });
    render();
  });
  const 탭 = () => page.evaluate(() => state.teacherTab);

  /* ① 출결 */
  await page.click('.sb-quick a:has-text("출결 넣기")');
  봄('① 출결 팝업 — 수업 화면의 타일 넷 · 탭은 홈', [await page.$$eval('.qk-att .tile', e => e.length), await 탭()], [4, 'dash']);
  await page.locator('.qk-att .tile .seg button').first().click();
  봄('① 출을 누르면 그 칸이 켜지고 팝업은 그대로', [await page.$$eval('.qk-att .tile .seg button.on', e => e.length), await page.evaluate(() => state.quick)], [1, 'att']);
  봄('① 발에 셈', await page.textContent('.qk-sum').then(t => /출석 1/.test(t) && /미입력 3/.test(t)), true);
  await page.click('.qk-back .pwm-h .x');
  await page.waitForFunction(() => !state.quick);
  봄('① 닫으면 저절로 저장', await page.evaluate(() => 저장.filter(x => x[0] === 'att').length), 1);

  /* ② 과제 — 확인 대기만 · 과제별 */
  await page.click('.sb-quick a:has-text("과제 확인")');
  봄('② 과제 팝업 — 머리 하나 · 줄 둘', [await page.$$eval('.qk-hw .qk-grp', e => e.length), await page.$$eval('.qk-hw .hw-row', e => e.length)], [1, 2]);
  봄('② 사이드 단추에 대기 수', await page.textContent('.sb-quick a:has-text("과제 확인") .sb-qn'), '2');
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !state.quick);
  봄('② ESC 로 닫힌다', await page.$$eval('.qk-back', e => e.length), 0);

  /* ③ 공지 — 등록하면 닫히고 홈 그대로 */
  await page.click('.sb-quick a:has-text("공지 쓰기")');
  await page.fill('#notice-title', '휴강 안내'); await page.fill('#notice-content', '다음 주 화요일 휴강입니다.');
  봄('③ 내용을 써도 제목이 남는다', await page.inputValue('#notice-title'), '휴강 안내');
  await page.click('.qk-f .btn.p');
  await page.waitForFunction(() => !state.quick);
  봄('③ 공지가 들고 팝업이 닫히고 홈 그대로', [await page.evaluate(() => DATA.notices[0].title), await 탭()], ['휴강 안내', 'dash']);

  /* ④ 클리닉 · 학생 — 원래 칸이 그대로 */
  await page.click('.sb-quick a:has-text("클리닉 열기")');
  봄('④ 클리닉 칸', await page.$$eval('.qk-clinic #slot-date, .qk-clinic #slot-from', e => e.length), 2);
  await page.keyboard.press('Escape'); await page.waitForFunction(() => !state.quick);
  await page.click('.sb-quick a:has-text("학생 추가")');
  봄('④ 학생 칸', await page.$$eval('.qk-student #new-sid, .qk-student #new-sclass', e => e.length), 2);
  await page.keyboard.press('Escape'); await page.waitForFunction(() => !state.quick);

  /* ⑤ gotoHwWaiting 은 바로 그린다(벨) */
  await page.evaluate(() => gotoHwWaiting());
  봄('⑤ 반 › 과제가 바로 그려진다', await page.evaluate(() => [state.teacherTab, state.classHubTab, document.querySelector('.tnav a.on').textContent.trim()]), ['classhub', 'homework', '반']);
  봄('페이지 오류 없음', 오류, []);
} finally {
  await 브라우저.close(); 서버.kill();
}
console.log(`\n${pass} 통과 · ${fail} 실패`);
process.exit(fail ? 1 : 0);
