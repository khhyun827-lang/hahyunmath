// 상담 약속 · 어디서든 메모장 · 로고 → 홈 · 문항 창고 맨 앞 (2026-10-02 · 사용자 넷)
//
//   node tools/promise-notepad-test.mjs
//
// 붙드는 것 — 상담을 기록하며 적은 약속(줄마다 하나)이 kv `consultpromises` 에 들고, 작업대 «지난 약속» · 홈 「할 일」 ·
//   학생 화면 오른쪽 · 벨 「상담 약속」에 뜬다 · 체크하면 빠진다 · 메모장은 어느 화면에서든 펴지고 넓은 화면에서는 본문을 안 덮는다 ·
//   로고를 누르면 홈 · 문항관리는 문항 창고가 첫 갈래. DB 쓰기는 흉내.

import { chromium } from 'playwright';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { 씨앗, 무대들 } from './shots-scenes.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PORT = 8826;
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
  await page.evaluate(() => { window.쓴것 = {}; window.dbSet = async (k, v) => { 쓴것[k] = JSON.parse(JSON.stringify(v)); return true; };
    window.dbGet = async (k, d) => d; window.authUid = () => 'u1'; window.saveRecordAsTeacher = async () => true; window.logAudit = async () => {};
    try{ localStorage.removeItem('hh.notepad'); }catch(e){} });
  await page.evaluate(무대들.상담작업대.세우기);
  await page.evaluate(() => { state.promises = []; render(); });

  /* ① 기록하면서 약속 둘 */
  await page.fill('#cs-text', '시험 대비 이야기');
  await page.fill('#cs-promises', '어머님께 클리닉 시간 문자\n\n  다음 주 오답 정리 확인  ');
  await page.click('.cd-write .btn.p');
  await page.waitForFunction(() => 쓴것['consultpromises']);
  const 약속 = await page.evaluate(() => 쓴것['consultpromises'].map(p => [p.sid, p.t, p.done, !!p.logId]));
  봄('① 줄마다 약속 하나(빈 줄·앞뒤 빈칸은 뺀다)', 약속, [['s0', '어머님께 클리닉 시간 문자', false, true], ['s0', '다음 주 오답 정리 확인', false, true]]);
  봄('① 작업대 «지난 약속»에 뜬다', await page.$$eval('.pr-box .pr-row span', e => e.map(x => x.textContent)), ['어머님께 클리닉 시간 문자', '다음 주 오답 정리 확인']);
  봄('① 벨에 「상담 약속」 2', await page.evaluate(() => (teacherNotifItems().find(x => x.key === 'promise') || {}).unseen), 2);

  /* ② 홈 「할 일」 — 이름과 함께 · 체크하면 빠진다 */
  await page.evaluate(() => { state.studentDetailId = null; goTeacherTab('dash'); });
  봄('② 홈 「할 일」에 이름과 약속', await page.$$eval('.dsh-memo .pr-row', e => e.map(x => x.querySelector('.pr-who').textContent + '|' + x.querySelector('span').textContent)).then(x => x.length), 2);
  await page.locator('.dsh-memo .pr-row input').first().click();
  봄('② 체크하면 홈에서 빠진다', await page.$$eval('.dsh-memo .pr-row', e => e.length), 1);
  봄('② 체크한 것이 저장된다', await page.evaluate(() => 쓴것['consultpromises'].filter(p => p.done).length), 1);

  /* ③ 학생 화면 오른쪽 */
  await page.evaluate(() => { state.teacherTab = 'classhub'; state.classHubTab = 'students'; state.studentDetailTab = 'timeline'; sdOpen('s0'); });
  봄('③ 학생 화면 오른쪽에 남은 약속', await page.$$eval('.sd-ctx .pr-row', e => e.length), 1);

  /* ④ 메모장 — 어디서든 · 넓은 화면은 본문을 좁혀 안 덮는다 */
  await page.click('.tb-np');
  const 판 = await page.evaluate(() => { const np = document.querySelector('.np'), b = document.querySelector('.app > .body');
    return np && b ? b.getBoundingClientRect().right <= np.getBoundingClientRect().left + 1 : null; });
  봄('④ 메모장이 펴지고 본문을 덮지 않는다(1440)', 판, true);
  await page.evaluate(() => goTeacherTab('settings'));
  봄('④ 다른 화면으로 가도 펴진 채', await page.$$eval('.np #memo-note', e => e.length), 1);
  await page.click('.np-x');
  봄('④ 접힌다', await page.$$eval('.np', e => e.length), 0);

  /* ⑤ 로고 → 홈 · ⑥ 문항 창고 맨 앞 */
  await page.click('.topbar a.bm-home');
  봄('⑤ 로고를 누르면 홈', await page.evaluate(() => state.teacherTab), 'dash');
  await page.click('.topbar .tnav a:has-text("문항관리")');
  봄('⑥ 문항관리를 누르면 문항 창고', await page.evaluate(() => state.teacherTab), 'unitbank');
  봄('⑥ 서브탭 맨 앞이 문항 창고', await page.$$eval('.subnav > a', e => e.map(x => x.textContent.trim()).slice(0, 3)), ['문항 창고', '검토', '시험지']);

  /* ⑦ 과목 · 단원은 사이드에서 펼친다(2026-10-03) — 본문 안 칸은 접힌다 */
  await page.evaluate(무대들.창고그림.세우기);
  await page.evaluate(() => { state.icOpen = null; state.storeSubject = ''; state.storeChapter = ''; render(); });
  봄('⑦ 본문 안 «과목 · 단원» 칸은 안 보인다', await page.$eval('.ist-nav', e => e.offsetWidth), 0);
  await page.locator('.subnav a.sn-subj').first().click();
  const 단원 = await page.$$eval('.subnav a.sn-ch', e => e.length);
  봄('⑦ 과목을 누르면 단원이 사이드에 펼쳐진다', 단원 > 0, true);
  await page.locator('.subnav a.sn-ch').nth(1).click();
  봄('⑦ 단원을 누르면 그 단원만', await page.evaluate(() => [state.storeSubject, !!state.storeChapter, document.querySelector('.subnav a.sn-ch.on') ? 1 : 0]), ['K2', true, 1]);
} finally {
  await 브라우저.close(); 서버.kill();
}
console.log(`\n${pass} 통과 · ${fail} 실패`);
process.exit(fail ? 1 : 0);
