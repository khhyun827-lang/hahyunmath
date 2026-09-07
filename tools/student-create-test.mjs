// 학생을 추가할 때 «무엇이 어디로 가는가» (2026-09-07 · 인증 옮기기 ⑤)
//
//   node tools/student-create-test.mjs
//
// 🔵 왜 — 이번 일의 요지는 **비밀번호와 연락처가 학생 문서에 안 들어가는 것**이다.
//   한 줄만 되돌아가도 조용히 다시 새기 시작하는데, 화면으로는 전혀 안 보인다.
//   («추가되었습니다» 토스트는 두 경우에 똑같이 뜬다.)
//
// 🔴 차례도 못 박는다 — **계정을 먼저 만들고 문서를 나중에** 세워야 한다.
//   문서가 먼저면, 계정 만들기가 실패했을 때 «로그인할 수 없는 학생»이 명단에 남는다.
//   명단에는 멀쩡히 보이는데 못 들어오는, 원인 찾기 어려운 상태다.
//
// ⚠ 실제 Firebase 는 안 부른다 — 스텁으로 «무엇을 부르는가»만 본다.

import fs from 'fs';
import { stripComments } from './strip-comments.mjs';
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

/* ── 세상을 짓는다 ────────────────────────────────────────────── */
function 세상({ 칸 = {}, 계정흠 = null, 저장흠 = false, 이미있나 = false } = {}) {
  const w = { 부른차례: [], 쓴것: [], 토스트: [], 기록: [] };
  const 값 = Object.assign({
    'new-sid': 'ab12', 'new-sname': '홍길동', 'new-spw': 'abcdef',
    'new-sgrade': '고1', 'new-sschool': '광남고', 'new-sparentphone': '010-1111-2222',
    'new-sphone': '010-3333-4444', 'new-sclass': 'c1',
  }, 칸);
  const DATA = { students: 이미있나 ? [{ studentId: 'ab12', uid: 'old' }] : [] };
  const 조각 = 떠내기('addStudent');
  const fn = new Function(
    'document', 'DATA', 'showToast', 'authIdOk', 'authIdWhyBad', 'authCreateAccount',
    'authWhyFailed', 'dbSetDoc', 'adoptRecord', 'emptyRecord', 'saveRecord', 'logAudit', 'render',
    조각 + '; return addStudent;'
  )(
    { getElementById: (id) => ({ value: 값[id] != null ? 값[id] : '' }) },
    DATA,
    (t) => w.토스트.push(t),
    (id) => /^[A-Za-z0-9][A-Za-z0-9._-]{0,62}$/.test(id),
    () => '아이디에 쓸 수 없는 글자가 있습니다.',
    async () => { w.부른차례.push('계정만들기'); if (계정흠) throw 계정흠; return 'UID9'; },
    (e) => (e && e.말) || '실패',
    async (c, id, d) => { w.부른차례.push('쓰기:' + c); w.쓴것.push({ c, id, d }); return 저장흠 ? null : true; },
    (sid, rec) => { w.기록.push(sid); return rec; },
    () => ({}),
    async () => { w.부른차례.push('기록쓰기'); return true; },
    async (...a) => { w.기록.push(a[0]); },
    () => {},
  );
  return { w, fn, DATA };
}

console.log('\n학생 추가 — 무엇이 어디로 가는가\n');

/* ── ① 잘 되는 길 ─────────────────────────────────────────────── */
{
  const { w, fn } = 세상();
  await fn();
  const 학생 = w.쓴것.find((x) => x.c === 'students');
  const 연락처 = w.쓴것.find((x) => x.c === 'contacts');

  봄('🔴 계정을 «먼저» 만든다', w.부른차례[0], '계정만들기');
  봄('🔴 문서 id 가 uid 다 (학번이 아니다)', 학생.id, 'UID9');
  봄('학번은 문서 «안»에 남는다', 학생.d.studentId, 'ab12');
  봄('uid 도 문서에 적어 둔다 — 저장 자리를 찾는 열쇠다', 학생.d.uid, 'UID9');

  // 🔴 이 셋이 이번 일의 요지다.
  봄('🔴 비밀번호가 학생 문서에 «없다»', 'pw' in 학생.d, false);
  봄('🔴 학생 전화번호가 학생 문서에 «없다»', 'phone' in 학생.d, false);
  봄('🔴 학부모 전화번호도 «없다»', 'parentPhone' in 학생.d, false);

  봄('연락처는 따로 간다', 연락처.id, 'UID9');
  봄('연락처에는 전화번호가 들어간다', 연락처.d.phone, '010-3333-4444');
  봄('연락처에도 비밀번호는 없다', 'pw' in 연락처.d, false);
  봄('추가했다고 말한다', /추가/.test(w.토스트.join(' ')), true);
}

/* ── ② 계정 만들기가 실패하면 — 문서를 안 쓴다 ────────────────── */
{
  const { w, fn, DATA } = 세상({ 계정흠: { 말: '이미 있는 아이디입니다.' } });
  await fn();
  봄('🔴 계정이 안 생기면 문서를 «하나도» 안 쓴다', w.쓴것.length, 0);
  봄('명단에도 안 얹는다', DATA.students.length, 0);
  봄('왜 안 됐는지 말한다', w.토스트[0], '이미 있는 아이디입니다.');
}

/* ── ③ 문서 쓰기가 실패하면 — «추가했다»고 말하지 않는다 ───────── */
//
// ⚠ 여기서 「추가되었습니다」라고 하면 강사는 학생에게 비밀번호를 알려 준다.
//   그런데 그 학생은 어느 명단에도 없다. 09-04에 「담았습니다」가 거짓이었던 것과 같은 갈래다.
{
  const { w, fn, DATA } = 세상({ 저장흠: true });
  await fn();
  봄('🔴 «추가했다»고 말하지 않는다', /추가되었습니다/.test(w.토스트.join(' ')), false);
  봄('무엇이 안 됐는지 말한다', /저장하지 못했/.test(w.토스트.join(' ')), true);
  봄('명단에서도 도로 뺀다 — 화면이 거짓을 보이면 안 된다', DATA.students.length, 0);
}

/* ── ④ 아이디·비밀번호를 «만들기 전»에 거른다 ─────────────────── */
{
  const { w, fn } = 세상({ 칸: { 'new-sid': '가나다' } });
  await fn();
  봄('🔴 한글 아이디는 계정을 만들기도 전에 막는다', w.부른차례.length, 0);
}
{
  const { w, fn } = 세상({ 칸: { 'new-spw': '1234' } });
  await fn();
  봄('🔴 짧은 비밀번호도 먼저 막는다', w.부른차례.length, 0);
  봄('6자라고 말해 준다', /6자/.test(w.토스트.join(' ')), true);
}
{
  const { w, fn } = 세상({ 이미있나: true });
  await fn();
  봄('이미 있는 학번이면 계정을 안 만든다', w.부른차례.length, 0);
}

/* ── ⑤ 소스에 «되돌아간 자리»가 없는가 ───────────────────────── */
{
  const 조각 = stripComments(떠내기('addStudent'));
  봄('🔴 학생 문서를 짓는 자리에 pw 가 없다', /pw\s*[,:}]/.test(조각.split('newStudent =')[1] || ''), false);
  봄('🔴 학번으로 문서를 쓰지 않는다', /dbSetDoc\('students',\s*sid/.test(조각), false);
}

console.log(틀림 ? '\n  🔴 ' + 통과 + ' 통과 · ' + 틀림 + ' 실패\n' : '\n  ✅ ' + 통과 + ' 통과 · 0 실패\n');
process.exit(틀림 ? 1 : 0);
