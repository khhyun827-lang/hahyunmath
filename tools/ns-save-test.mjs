// 반 › 내신·모의 — 넣고 «전체 저장»을 누르면 기록에 그대로 앉는가 (2026-09-28)
//   node tools/ns-save-test.mjs      (실 DB 0줄 — shots 의 씨앗을 쓴다)
import { chromium } from 'playwright';
import { 무대들, 씨앗 } from './shots-scenes.mjs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const PORT = 8778;
const 서버 = spawn(process.execPath, [path.join(HERE, 'serve.js'), String(PORT)], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 1200));
const b = await chromium.launch();
let fail = 0;
const 봄 = (무엇, a, e) => { const ok = JSON.stringify(a) === JSON.stringify(e); if(!ok) fail++;
  console.log((ok ? '  ✓ ' : '  🔴 ') + 무엇 + (ok ? '' : '\n      나온 것 ' + JSON.stringify(a) + '\n      나와야 ' + JSON.stringify(e))); };
try{
  const page = await b.newPage();
  const 탈 = []; page.on('pageerror', e => 탈.push(e.message));
  await page.goto('http://127.0.0.1:' + PORT + '/index.html');
  await page.waitForFunction(() => typeof render === 'function' && typeof DATA !== 'undefined');
  await page.evaluate(씨앗);
  await page.evaluate(무대들.내신모의.세우기);
  await page.evaluate(() => DATA.students.forEach(s => recordLoaded.set(s.studentId, state.allRecords[s.studentId])));
  // 학교 시험: s2 점수 고치고 등급 적기 · s3 새로 · s0 비워서 지우기 · s4 잘못 친 값
  await page.fill('#ns-s-s2', '71'); await page.fill('#ns-g-s2', '3');
  await page.fill('#ns-s-s3', '66');
  await page.fill('#ns-s-s0', '');
  await page.fill('#ns-s-s4', '140');
  await page.evaluate(() => saveSchoolScores('c1'));
  const r = await page.evaluate(() => ({
    s0: DATA.records.s0.schoolExams, s2: DATA.records.s2.schoolExams,
    s3: DATA.records.s3.schoolExams, s4: DATA.records.s4.schoolExams || [],
    s3g: nsSchoolGrade(DATA.students[3], DATA.records.s3.schoolExams[0]),
  }));
  봄('비우면 그 학기만 지운다(지난 학기는 남는다)', r.s0, [{ term:'2026 · 1학기 기말', subject:'공통수학1', score:88, grade:2 }]);
  봄('고친 점수 + 적은 등급', r.s2, [{ term:'2026 · 2학기 중간', subject:'공통수학1', score:71, grade:3 }]);
  봄('새로 넣은 줄 — 등급은 안 적는다', r.s3, [{ term:'2026 · 2학기 중간', subject:'공통수학1', score:66 }]);
  봄('광남고는 컷이 없으니 등급도 없다', r.s3g, { g:'', cut:false });
  봄('100 넘는 값은 저장 안 한다', r.s4, []);
  // 모의고사
  await page.evaluate(() => { state.nsMode = 'mock'; state.nsYm = '2026-09'; render(); });
  await page.fill('#ns-s-s0', '81'); await page.fill('#ns-g-s0', '2');
  await page.fill('#ns-g-s1', '0'); await page.fill('#ns-s-s1', '50');
  await page.evaluate(() => saveSchoolScores('c1'));
  const m = await page.evaluate(() => ({ s0: DATA.records.s0.mockExams, s1: DATA.records.s1.mockExams || [],
    shown: document.querySelector('#ns-s-s0').value }));
  봄('모의고사 — 달마다 한 줄, 지난 달은 남는다', m.s0, [{ ym:'2026-06', score:76, grade:3 }, { ym:'2026-09', score:81, grade:2 }]);
  봄('등급 0 은 저장 안 한다', m.s1, []);
  봄('저장 뒤 다시 그려도 값이 보인다', m.shown, '81');
  // 성적 탭 안의 갈래 — 학원 시험으로 돌아오면 원래 성적 화면(시험 추가)이다
  await page.evaluate(() => { state.nsMode = ''; render(); });
  봄('학원 시험 갈래는 원래 성적 화면', await page.evaluate(() => [
    [...document.querySelectorAll('button')].some(b => b.textContent.includes('시험 추가')),
    !!document.querySelector('#ns-s-s0')]), [true, false]);
  await page.evaluate(() => { state.classHubTab = 'school'; state.nsMode = ''; render(); });
  봄('옛 「school」 탭 id 는 성적 › 학교 시험으로', await page.evaluate(() => [state.classHubTab, state.nsMode]), ['scores', 'school']);
  // 학생 상세 › 성적 갈래 — 학교·모의 판 (09-29)
  const 판 = await page.evaluate(() => {
    const d = document.createElement('div');
    d.innerHTML = sdSchoolScoresHTML(DATA.students[0], {
      schoolExams: [{ term:'2026 · 1학기 기말', subject:'공통수학1', score:88, grade:2 },
                    { term:'2026 · 2학기 중간', subject:'공통수학1', score:84 }],
      mockExams: [{ ym:'2026-06', score:76, grade:3 }, { ym:'2026-09', score:81 }] });
    return [...d.querySelectorAll('.sd-crow')].map(r => [...r.children].map(c => c.textContent).join(' ').replace(/\s+/g, ' ').trim());
  });
  봄('학생 상세 — 최근 학기가 위 · 비운 등급은 컷으로 · 모의는 달 역순', 판, [
    '2026 · 2학기 중간 공통수학1 84점 · 2등급 (컷 기준)', '2026 · 1학기 기말 공통수학1 88점 · 2등급',
    '2026-09 81점', '2026-06 76점 · 3등급']);
  봄('가장 낮은 컷보다 아래면 «n등급 이하»', await page.evaluate(() =>
    sdSchoolScoresHTML(DATA.students[0], { schoolExams: [{ term:'2026 · 2학기 중간', subject:'공통수학1', score:50 }] }).includes('5등급 이하')), true);
  봄('성적 갈래에 판이 붙는다', await page.evaluate(() => { state.sdFilter = 'score';
    return sdTimelineHTML(DATA.students[0], 's0', DATA.records.s0, false).includes('모의고사'); }), true);
  // 조교 — 갈래 단추가 선다 (09-29 · 사용자)
  봄('조교에게도 학교·모의 갈래', await page.evaluate(() => { const 원래 = state.currentUser;
    state.currentUser = { type:'assistant', name:'조교' }; const h = scoreKindSegHTML(); state.currentUser = 원래;
    return h.includes('학교 시험') && h.includes('모의고사'); }), true);
  봄('페이지 오류 없음', 탈, []);
  // 폰 폭 — 가로로 밀리는지
  await page.setViewportSize({ width: 390, height: 800 });
  await page.evaluate(() => { state.nsMode = 'school'; render(); });
  봄('390px 에서 페이지가 옆으로 안 밀린다', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
}finally{ await b.close(); 서버.kill(); }
console.log(fail ? '\n🔴 ' + fail + ' 실패' : '\n✓ 전부 통과');
process.exitCode = fail ? 1 : 0;
