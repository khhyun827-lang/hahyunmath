// 명단 한꺼번에 등록 — 되고 안 된 것을 «갈라» 말하는가 (2026-09-07 · 인증 옮기기 ⑤-b)
//
//   node tools/bulk-import-test.mjs
//
// 🔴 이 화면의 최악은 «느린 것»이 아니라 **「N명 등록되었습니다」가 거짓인 것**이다.
//   실패한 학생을 성공으로 세면, 강사는 그 학생에게도 비밀번호를 알려 준다.
//   그 학생은 로그인이 안 되는데 원인은 아무 데도 안 적혀 있다.
//
// 🔵 그리고 «이어 하기»를 붙든다 — 계정은 생겼는데 문서를 못 쓰고 끊기면, 다시 돌릴 때
//   「이미 있는 아이디」로 막혀 영영 못 고치는 학생이 생긴다. 그때는 그 계정으로 로그인해
//   uid 를 되찾아 이어야 한다(강사가 비밀번호를 들고 있으니 할 수 있는 일이다).

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/\r\n/g, '\n');

function 떠내기(이름) {
  const at = html.indexOf('async function ' + 이름 + '(');
  if (at < 0) throw new Error(이름 + ' 를 못 찾았습니다');
  let 깊이 = 0;
  for (let j = html.indexOf('{', at); j < html.length; j++) {
    if (html[j] === '{') 깊이++;
    else if (html[j] === '}') { 깊이--; if (!깊이) return html.slice(at, j + 1); }
  }
  throw new Error(이름 + ' 의 끝을 못 찾았습니다');
}

let 통과 = 0, 틀림 = 0;
const 봄 = (무엇, 잰것, 바란것) => {
  const 같다 = JSON.stringify(잰것) === JSON.stringify(바란것);
  같다 ? 통과++ : 틀림++;
  console.log((같다 ? '  ✓ ' : '  ✗ ') + 무엇
    + (같다 ? '' : '\n      나온 것: ' + JSON.stringify(잰것) + '\n      나와야:  ' + JSON.stringify(바란것)));
};

const 줄 = (id, pw) => ({ studentId: id, name: id + '이', pw: pw || 'abcdef',
  grade: '고1', school: '광남고', phone: '010-1', parentPhone: '010-2' });

function 세상({ rows, 계정결과 = {}, 저장흠 = new Set(), 있던학생 = [] } = {}) {
  const w = { 쓴것: [], 토스트: [], 부른것: [], 앱닫힘: 0 };
  const state = { studentImportPreview: { classId: 'c1', rows }, importBusy: false, importResult: null };
  const DATA = { students: 있던학생.slice() };
  const fn = new Function(
    'state', 'DATA', 'showToast', 'authBatchBegin', 'authBatchEnd', 'authBatchCreate',
    'authWhyFailed', 'dbSetDoc', 'adoptRecord', 'emptyRecord', 'saveRecord', 'logAudit', 'render',
    떠내기('confirmStudentBulkImport') + '; return confirmStudentBulkImport;'
  )(
    state, DATA,
    (t) => w.토스트.push(t),
    () => ({ 곁: true }),
    async () => { w.앱닫힘++; },
    async (곁, role, id, pw) => {
      w.부른것.push(id);
      const r = 계정결과[id];
      if (r && r.흠) throw { code: r.흠, 말: r.말 };
      return { uid: 'U_' + id, 새것: !(r && r.있던것) };
    },
    (e) => (e && e.말) || '실패',
    async (c, id, d) => { w.쓴것.push({ c, id, d }); return 저장흠.has(d.studentId) ? null : true; },
    () => ({}), () => ({}), async () => true, async () => {}, () => {},
  );
  return { w, state, DATA, fn };
}

console.log('\n명단 한꺼번에 등록\n');

/* ── ① 다 잘 되는 길 ─────────────────────────────────────────── */
{
  const { w, state, DATA, fn } = 세상({ rows: [줄('a1'), 줄('a2'), 줄('a3')] });
  await fn();
  봄('셋 다 계정을 만든다', w.부른것, ['a1', 'a2', 'a3']);
  봄('문서 id 가 uid 다', w.쓴것.filter(x => x.c === 'students').map(x => x.id), ['U_a1', 'U_a2', 'U_a3']);
  봄('🔴 학생 문서에 비밀번호가 없다', w.쓴것.filter(x => x.c === 'students').some(x => 'pw' in x.d), false);
  봄('🔴 학생 문서에 전화번호가 없다', w.쓴것.filter(x => x.c === 'students').some(x => 'phone' in x.d), false);
  봄('연락처는 따로 간다', w.쓴것.filter(x => x.c === 'contacts').length, 3);
  봄('명단에 셋이 얹힌다', DATA.students.length, 3);
  봄('다 되면 미리보기를 닫는다', state.studentImportPreview, null);
  봄('앱을 닫는다 — 떠다니게 두지 않는다', w.앱닫힘, 1);
  봄('도는 표시는 내려간다', state.importBusy, false);
}

/* ── ② 하나가 실패하면 — 나머지는 계속하고, «누가» 실패했는지 말한다 ── */
{
  const { w, state, DATA, fn } = 세상({
    rows: [줄('a1'), 줄('bad'), 줄('a3')],
    계정결과: { bad: { 흠: 'auth/email-already-in-use', 말: '이미 있는 아이디입니다.' } },
  });
  await fn();
  봄('🔴 하나가 엎어져도 나머지는 계속한다', DATA.students.map(s => s.studentId), ['a1', 'a3']);
  봄('🔴 실패한 사람을 이름으로 남긴다', state.importResult.안된것.map(x => x.id), ['bad']);
  봄('🔴 왜 안 됐는지도 남긴다', state.importResult.안된것[0].까닭, '이미 있는 아이디입니다.');
  봄('🔴 실패가 있으면 미리보기를 안 닫는다 — 고쳐서 다시 해야 한다', !!state.studentImportPreview, true);
  봄('토스트도 뭉뚱그리지 않는다', /실패/.test(w.토스트.join(' ')), true);
}

/* ── ③ 저장이 실패한 사람도 «성공»으로 세지 않는가 ─────────────── */
//
// ⚠ 계정은 생겼는데 문서를 못 썼다. 이 사람을 성공으로 세면 명단에 없는 채로 비밀번호만 받는다.
{
  const { state, DATA, fn } = 세상({ rows: [줄('a1'), 줄('a2')], 저장흠: new Set(['a2']) });
  await fn();
  봄('🔴 저장 못 한 사람은 성공이 아니다', state.importResult.된것, ['a1']);
  봄('🔴 명단에도 안 얹는다', DATA.students.map(s => s.studentId), ['a1']);
  봄('까닭을 적는다', /저장하지 못했/.test(state.importResult.안된것[0].까닭), true);
}

/* ── ④ 끊겼던 자리를 «이어» 하는가 ───────────────────────────── */
{
  // ⚠ 앞서 여기 있던 검사는 «늘 통과하는 가짜»였다 —
  //   `/이어서 마쳤/.test(state.importResult ? '' : '이어서 마쳤')` 는 어느 쪽이든 참이 된다.
  //   검사는 «틀렸을 때 우는지»로 값을 매긴다. 그래서 토스트 글을 직접 본다.
  const { w, DATA, fn } = 세상({
    rows: [줄('a1'), 줄('a2')],
    계정결과: { a2: { 있던것: true } },     // 계정은 이미 있다 = 앞선 시도가 문서 쓰기 전에 끊겼다
  });
  await fn();
  봄('🔵 이미 있던 계정도 문서를 세워 마친다', DATA.students.map(s => s.studentId), ['a1', 'a2']);
  봄('🔵 «이어서 마쳤다»고 사람에게 말한다', /끊겼던 1명을 이어서 마쳤/.test(w.토스트.join(' ')), true);
}

/* ── ⑤ 이미 명단에 있는 사람은 건너뛴다 ──────────────────────── */
{
  const { w, fn } = 세상({ rows: [줄('a1'), 줄('a2')], 있던학생: [{ studentId: 'a1', uid: 'old' }] });
  await fn();
  봄('이미 있는 학번은 계정도 안 만든다', w.부른것, ['a2']);
}

/* ── ⑥ 두 번 눌러도 두 번 안 돈다 ────────────────────────────── */
{
  const { w, state, fn } = 세상({ rows: [줄('a1')] });
  state.importBusy = true;
  await fn();
  봄('🔴 도는 중이면 아무것도 안 한다', w.부른것.length, 0);
}

/* ── ⑦ 소스가 «한꺼번에 던지지» 않는가 ───────────────────────── */
{
  /* 🔴 **또 주석에 걸렸다** — 소스 «글자»로 찾으면 「Promise.all 로 던지지 않는다」라고
     적어 둔 주석 자체가 걸린다. 오늘 seed-guard-test 에서 겪은 것과 같은 함정이다.
     ⚠ **검사가 무엇을 보고 있는지**를 늘 물을 것. 주석을 걷어낸 코드를 본다. */
  const 조각 = 떠내기('confirmStudentBulkImport')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  봄('🔴 Promise.all 로 수십 개를 동시에 던지지 않는다', /Promise\.all/.test(조각), false);
  봄('한 줄씩 돈다', /for\s*\(const r of toAdd\)/.test(조각), true);
}

console.log(틀림 ? '\n  🔴 ' + 통과 + ' 통과 · ' + 틀림 + ' 실패\n' : '\n  ✅ ' + 통과 + ' 통과 · 0 실패\n');
process.exit(틀림 ? 1 : 0);
