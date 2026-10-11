// 수강 종료 — 이관 · 졸업 · 시즌 마감 (2026-10-11) — 실제 크롬으로 누른다
//
//   node tools/season-end-test.mjs
//
// 붙드는 것: 종료일 «그 날부터» 지난 학생(전에는 재원) · 배지 말 · 로그인 막힘 · 시즌 마감 한꺼번에(계속=학년 올림·새 반 / 이관 / 졸업 / 퇴원) ·
//   재원으로 되돌리기가 셋 다 지움 · 재원생 변화가 종료를 퇴원과 따로 셈 · 이관 엑셀 세 장.
// 실 DB 는 안 건드린다 — dbSetDoc 을 흉내 내고 쓴 것을 본다.

import { chromium } from 'playwright';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { 씨앗 } from './shots-scenes.mjs';
import fs from 'fs';
const html = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'index.html'), 'utf8');

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PORT = 8819;
const 서버 = spawn(process.execPath, [path.join(HERE, 'serve.js'), String(PORT)], { stdio: 'ignore' });
let pass = 0, fail = 0;
const 봄 = (무엇, 나온것, 나와야) => {
  const ok = JSON.stringify(나온것) === JSON.stringify(나와야);
  if(ok){ pass++; console.log('  ✓ ' + 무엇); }
  else { fail++; console.log(`  ✗ ${무엇}\n      나온 것: ${JSON.stringify(나온것)}\n      나와야:  ${JSON.stringify(나와야)}`); }
};

const 브라우저 = await chromium.launch();
try{
  const page = await 브라우저.newPage({ viewport: { width: 1280, height: 900 } });
  await page.clock.setFixedTime(new Date('2026-12-20T15:00:00'));
  for(let i = 0; i < 40; i++){ try{ await page.goto(`http://127.0.0.1:${PORT}/index.html`); break; }catch{ await page.waitForTimeout(250); } }
  await page.waitForFunction(() => typeof render === 'function' && typeof DATA !== 'undefined');
  await page.evaluate(씨앗);
  await page.evaluate(() => {
    window.쓴것 = {}; window.장부 = [];
    window.dbSetDoc = async (c, k, v) => { 쓴것[k] = JSON.parse(JSON.stringify(v)); return true; };
    window.logAudit = async (a, sid, n, d) => { 장부.push(a + '|' + d); };
    window.confirm = () => true;
    state.currentUser = { type: 'teacher', name: 'T' }; state.view = 'teacher';
    DATA.students.forEach(s => { delete s.withdrawnAt; delete s.endedAt; s.grade = '고1'; });
    render();
  });

  /* ① 판정 — 그 날부터 */
  const 판정 = await page.evaluate(() => {
    const s = DATA.students[0], r = [];
    s.endedAt = '2026-12-31'; s.endType = '이관';
    r.push(isWithdrawn(s), classRoster(s.classId).includes(s));
    s.endedAt = '2026-12-20';
    r.push(isWithdrawn(s), classRoster(s.classId).includes(s), goneLabel(s));
    s.endType = '졸업'; r.push(goneLabel(s));
    s.withdrawnAt = '2026-12-01'; r.push(goneLabel(s));
    delete s.withdrawnAt; delete s.endedAt; delete s.endType;
    return r;
  });
  봄('종료일 전엔 재원 · 그 날부터 지난 학생 · 배지 말(이관/졸업/퇴원이 이긴다)', 판정, [false, true, true, false, '이관', '졸업', '퇴원']);

  봄('gradeUp — 고1→고2 · 고3 그대로 · 중3→고1 · 모르는 꼴 그대로',
     await page.evaluate(() => ['고1', '1', '고3', '중3', '중3(예비고1)'].map(gradeUp)), ['고2', '고2', '고3', '고1', '중3(예비고1)']);

  /* ② 시즌 마감 화면 */
  await page.evaluate(() => { state.teacherTab = 'settings'; state.settingsSubTab = 'students'; state.settingsForm = 'season'; render(); });
  await page.waitForSelector('.ssn-row');
  const 학생 = await page.evaluate(() => seasonStudents().map(s => s.studentId));
  봄('재원생이 모두 줄에 선다 · 기본은 이관', await page.evaluate(() => [document.querySelectorAll('.ssn-row').length, seasonStudents().every(s => seasonPickOf(s.studentId) === '이관')]), [학생.length, true]);
  const [a, b, c] = 학생;
  const 새반 = await page.evaluate(() => DATA.classes[DATA.classes.length - 1].id);
  await page.evaluate(([a, b, c, 새반]) => { seasonSet(a, '계속'); seasonState().cls[a] = 새반; seasonSet(b, '졸업'); seasonSet(c, '퇴원'); }, [a, b, c, 새반]);
  const 이관한명 = 학생[3];
  await page.locator(`.ssn-row:has(.ssn-note)`).first().locator('.ssn-note').fill('박 선생님 반');
  const 메모자리 = await page.evaluate(() => Object.keys(seasonState().note)[0]);
  await page.fill('.ssn-cls input[type=date], .st-form input[type=date]', '2026-12-31').catch(() => {});
  await page.evaluate(() => { seasonState().date = '2026-12-31'; });
  봄('발에 고른 수가 선다', await page.textContent('.ssn-foot span'), `계속 1 · 이관 ${학생.length - 3} · 졸업 1 · 퇴원 1`);
  await page.click('.ssn-foot .btn.p');
  await page.waitForFunction(() => !state.season);
  const 결과 = await page.evaluate(([a, b, c, 이관한명, 메모자리]) => {
    const 키 = sid => studentKeyOfSid(sid), w = sid => 쓴것[키(sid)] || {};
    return {
      계속: [w(a).grade, w(a).classId, !!w(a).endedAt],
      졸업: [w(b).endedAt, w(b).endType],
      퇴원: [w(c).withdrawnAt, w(c).withdrawnReason],
      이관: [w(이관한명).endedAt, w(이관한명).endType],
      메모: w(메모자리).endNote,
      번호없음: Object.values(쓴것).every(v => !('phone' in v) && !('parentPhone' in v)),
      장부: 장부.some(x => x.startsWith('시즌 마감|2026-12-31')),
    };
  }, [a, b, c, 이관한명, 메모자리]);
  봄('적용 — 계속은 학년 올림·새 반 · 졸업/이관은 종료일 · 퇴원은 퇴원일 · 메모 · 번호 안 씀 · 장부',
     결과, { 계속: ['고2', 새반, false], 졸업: ['2026-12-31', '졸업'], 퇴원: ['2026-12-31', '시즌 마감'], 이관: ['2026-12-31', '이관'], 메모: '박 선생님 반', 번호없음: true, 장부: true });

  /* ③ 12-31 이 되면 — 로그인이 막히고 명단에서 빠진다 · 재원생 변화는 종료를 따로 */
  await page.clock.setFixedTime(new Date('2026-12-31T10:00:00'));
  const 그날 = await page.evaluate(([a, b]) => {
    const B = DATA.students.find(s => s.studentId === b), A = DATA.students.find(s => s.studentId === a);
    const ms = enrollMonths(DATA.students, todayStr(), 2);
    return [isWithdrawn(A), isWithdrawn(B), goneLabel(B), ms[1].종료, ms[1].퇴원, ms[1].재원];
  }, [a, b]);
  봄('그 날 — 계속은 재원 · 졸업은 지난 학생 · 재원생 변화: 종료와 퇴원을 갈라 센다', 그날, [false, true, '졸업', 학생.length - 2, 1, 1]);

  /* 로그인 문 둘(새 로그인 · 남아 있던 세션)이 isWithdrawn 을 본다 — 그 안에 isEnded 가 있으니 종료도 막힌다 */
  봄('🔴 로그인 문이 isWithdrawn 으로 막고 «수강이 끝난 계정»이라 말한다',
     [html.includes("if(isWithdrawn(found, rec)){ state.loginError = (goneLabel(found) === '퇴원' ? '퇴원 처리된 계정입니다.' : `수강이 끝난 계정입니다 (${found.endedAt}).`)"),
      html.includes('if(isWithdrawn(found, rec)){ clearSession(); return; }'),
      /function isWithdrawn\(s, rec\)\{[^}]*if\(isEnded\(s\)\) return true;/.test(html)], [true, true, true]);

  /* ④ 학생 계정 목록 · 학적 상자 · 되돌리기 */
  await page.evaluate(() => { state.settingsForm = ''; render(); });
  봄('목록 구분선이 «지난 학생»', (await page.textContent('.stu-sep')).includes('지난 학생'), true);
  await page.evaluate(b => stuEdit(b), b);
  봄('학적 상자 — 졸업 · 날짜 · 엑셀 · 되돌리기', await page.evaluate(() => {
    const t = document.querySelector('.stu-life').textContent;
    return [/졸업/.test(t), /2026-12-31/.test(t), /성적·출결 엑셀/.test(t), /재원으로 되돌리기/.test(t)];
  }), [true, true, true, true]);
  await page.evaluate(b => restoreStudent(b), b);
  봄('되돌리기 — 종료 세 칸을 지운다', await page.evaluate(b => { const v = 쓴것[studentKeyOfSid(b)]; return ['endedAt', 'endType', 'endNote'].some(k => k in v); }, b), false);

  /* ⑤ 이관 엑셀 — 요약 · 성적 · 출결 */
  const 엑셀 = await page.evaluate(async (ids) => {
    let 책 = null;
    window.ensureXLSXLoaded = async () => {};
    window.XLSX = { utils: { book_new: () => ({ 장: [] }), aoa_to_sheet: a => a, book_append_sheet: (wb, ws, n) => wb.장.push([n, ws.length]) },
      writeFile: (wb, name) => { 책 = { 이름: name, 장: wb.장.map(x => x[0]), 요약줄: wb.장[0][1] }; } };
    await exportEndedExcel(ids);
    return 책;
  }, 학생.slice(3, 5));
  봄('이관 엑셀 — 세 장 · 학생 수만큼 요약 줄', [엑셀.장, 엑셀.요약줄, /^이관자료_2명_/.test(엑셀.이름)], [['요약', '성적', '출결'], 3, true]);

  /* ⑥ 한 명씩 — 학적 상자의 «수강 종료» */
  const 한명 = 학생[5] || 학생[4];
  await page.evaluate(sid => { const s = DATA.students.find(x => x.studentId === sid); delete s.endedAt; delete s.endType; delete s.endNote; state.stuEditId = null; stuEdit(sid); }, 한명);
  await page.fill('#end-date', '2027-01-05'); await page.selectOption('#end-type', '이관'); await page.fill('#end-note', '최 선생님');
  await page.click('.stu-life button:has-text("수강 종료")');
  봄('한 명씩 수강 종료 — 날짜·종류·메모', await page.evaluate(sid => { const v = 쓴것[studentKeyOfSid(sid)]; return [v.endedAt, v.endType, v.endNote]; }, 한명), ['2027-01-05', '이관', '최 선생님']);
  봄('미래 날짜면 아직 재원 · 목록에 «예정» 배지', await page.evaluate(sid => [isWithdrawn(DATA.students.find(x => x.studentId === sid)), !!document.querySelector('.stu-row .badge') && [...document.querySelectorAll('.stu-row .badge')].some(e => /예정/.test(e.textContent))], 한명), [false, true]);
  /* ⑦ 숨긴 학생(테스트 계정 · 2026-10-11) — 강사 화면 어디에도 없고 로그인은 그대로 · 되돌릴 수 있다 */
  봄('🔴 불러올 때 한 문에서 가른다(강사·조교 쪽) · 학생 로그인은 제 문서만 읽어 영향 없음',
     [/DATA\.hiddenStudents = \(DATA\.students \|\| \[\]\)\.filter\(s => s && s\.hidden\);\s*DATA\.students = \(DATA\.students \|\| \[\]\)\.filter\(s => !\(s && s\.hidden\)\);/.test(html),
      /DATA\.students = me \? \[me\] : \[\];/.test(html)], [true, true]);
  const 숨김 = 학생[6] || 학생[2];
  await page.evaluate(sid => { state.teacherTab = 'settings'; state.settingsSubTab = 'students'; state.settingsForm = ''; state.stuEditId = null; stuEdit(sid); }, 숨김);
  await page.click('.stu-life button:has-text("테스트 계정으로 숨기기")');
  봄('숨기면 — 문서에 hidden · 명단에서 빠짐 · 맨 아래 «숨긴 계정»에 선다', await page.evaluate(sid => [
      쓴것[DATA.hiddenStudents.find(s => s.studentId === sid).uid || sid].hidden, DATA.students.some(s => s.studentId === sid),
      [...document.querySelectorAll('.st-sec')].some(e => /숨긴 계정/.test(e.textContent) && e.textContent.includes(sid))], 숨김), [true, false, true]);
  봄('숨긴 아이디로 새 학생을 못 만든다(중복)', await page.evaluate(sid => DATA.students.concat(DATA.hiddenStudents || []).some(s => s.studentId === sid), 숨김), true);
  봄('숨긴 학생은 출석 도장 순위에 줄을 안 쓴다', await page.evaluate(async sid => {
    const s = DATA.hiddenStudents.find(x => x.studentId === sid); DATA.students.push(s);   /* 학생 로그인 때는 제 문서가 DATA.students 에 있다 */
    window.loadRank = async () => []; let 썼다 = false; const 옛 = window.dbSetDoc; window.dbSetDoc = async (c) => { if(c === 'ranks') 썼다 = true; return true; };
    await rankSubmit(sid, s.name, '', 100); window.dbSetDoc = 옛; DATA.students = DATA.students.filter(x => x !== s);
    return 썼다;
  }, 숨김), false);
  await page.click('.st-sec button:has-text("다시 보이기")');
  봄('다시 보이기 — hidden 지움 · 명단에 돌아옴', await page.evaluate(sid => [DATA.students.some(s => s.studentId === sid), 'hidden' in 쓴것[DATA.students.find(s => s.studentId === sid).uid || sid], (DATA.hiddenStudents || []).length], 숨김), [true, false, 0]);
} finally {
  await 브라우저.close(); 서버.kill();
}
console.log(`\n${pass} 통과 · ${fail} 실패`);
process.exit(fail ? 1 : 0);
