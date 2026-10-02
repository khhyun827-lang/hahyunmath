// 상담 작업대 (2026-10-02 · 사용자가 기획 A 를 골랐다 · 영상 시청률 · 상담하면서 성적 적기)
//
//   node tools/consult-desk-test.mjs
//
// 붙드는 것 — 반 › 상담 기록·학생 화면 「상담」 둘 다 작업대로 연다 · 왼쪽에 숫자 다섯(영상 시청 포함)·성적·출결·과제·영상 ·
//   기록하면 상대와 «그때 숫자»가 같이 남는다 · 여기서 학교 시험·모의고사를 적으면 반 › 성적과 같은 칸에 들어간다 ·
//   이름 찾기로 넘어가도 작업대가 유지된다. DB 쓰기는 흉내.

import { chromium } from 'playwright';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { 씨앗, 무대들 } from './shots-scenes.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PORT = 8824;
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
    window.saveRecordAsTeacher = async () => true; window.logAudit = async () => {}; });
  await page.evaluate(무대들.상담작업대.세우기);

  봄('반 › 상담 기록 → 작업대가 열린다', await page.$$eval('.cd-desk', e => e.length), 1);
  봄('숫자 다섯에 영상 시청이 있다', await page.$$eval('.cd-k s', e => e.map(x => x.textContent)), ['반 시험', '출석률', '과제', '오답 미제출', '영상 시청']);
  봄('왼쪽 칸 — 성적 추이·학교·모의·출결·과제·영상·메모', await page.$$eval('.cd-left .cd-bh b', e => e.map(x => x.textContent)),
    ['성적 추이', '학교 · 모의고사', '출결 최근 8회', '과제 · 오답', '영상 시청', '고정 메모']);
  봄('지난 상담에 «그때» 숫자', await page.$eval('.cd-then', e => e.textContent.trim()), '그때 반 시험 78 · 출석 96% · 과제 3/4 · 영상 82%');

  /* 기록 */
  await page.selectOption('#cs-who', '학생');
  await page.fill('#cs-text', '시험 대비 계획 이야기');
  /* 주제 칩 — 쓰던 글 뒤에 눌러도 글이 안 날아간다 */
  await page.click('.cd-write .cd-tp:has-text("시험 대비")');
  await page.click('.cd-write .cd-tp:has-text("진로")');
  봄('주제 칩을 눌러도 쓰던 내용이 남는다', await page.inputValue('#cs-text'), '시험 대비 계획 이야기');
  await page.click('.cd-write .btn.p');
  await page.waitForFunction(() => 쓴것['consultlog:s0']);
  const 새것 = await page.evaluate(() => 쓴것['consultlog:s0'].at(-1));
  봄('기록 — 주제가 남는다', 새것.topics, ['시험 대비', '진로']);
  봄('지난 상담에 주제 딱지', await page.$$eval('.cd-right .cs-item .badge.score', e => e.map(x => x.textContent)), ['시험 대비', '진로']);
  봄('기록 — 상대가 남는다', 새것.who, '학생');
  봄('기록 — 그때의 숫자(영상 포함)가 남는다', !!새것.snap && 'vid' in 새것.snap && 'att' in 새것.snap, true);

  /* 성적 적기 — 모의고사 */
  await page.evaluate(() => document.querySelector('.cd-add').open = true);
  await page.fill('#cd-mym', '2026-09'); await page.fill('#cd-mscore', '81'); await page.fill('#cd-mgrade', '3');
  await page.click('.cd-af:nth-of-type(2) .btn');
  await page.waitForFunction(() => (DATA.records.s0.mockExams || []).length);
  봄('모의고사를 여기서 적으면 기록 칸에 든다', await page.evaluate(() => DATA.records.s0.mockExams), [{ ym: '2026-09', score: 81, grade: 3 }]);
  봄('적은 성적이 바로 보인다', await page.$eval('.cd-left', e => /81점 · 3등급/.test(e.textContent)), true);
  await page.evaluate(() => document.querySelector('.cd-add').open = true);
  await page.fill('#cd-sscore', '120'); await page.click('.cd-af:nth-of-type(1) .btn');
  봄('잘못 친 점수는 저장 안 한다', await page.evaluate(() => (DATA.records.s0.schoolExams || []).some(x => x.score === 120)), false);

  /* 이름 찾기로 넘어가도 작업대 */
  const 다른 = await page.evaluate(() => DATA.students.find(x => x.studentId !== 's0').name);
  await page.fill('.sd-find input', 다른); await page.press('.sd-find input', 'Enter');
  봄('이름 찾기로 넘어가도 작업대', await page.evaluate(() => [state.studentDetailId !== 's0', state.studentDetailTab]), [true, 'consult']);

  /* 학생 화면 「상담」 단추 */
  await page.evaluate(무대들.학생상세성적.세우기);
  await page.click('.sd-qa .btn:has-text("상담")');
  봄('학생 화면 「상담」 → 작업대', await page.$$eval('.cd-desk', e => e.length), 1);
  await page.click('.cd-head .btn');
  봄('「학생 화면으로」 → 연대기', await page.evaluate(() => state.studentDetailTab), 'timeline');
} finally {
  await 브라우저.close(); 서버.kill();
}
console.log(`\n${pass} 통과 · ${fail} 실패`);
process.exit(fail ? 1 : 0);
