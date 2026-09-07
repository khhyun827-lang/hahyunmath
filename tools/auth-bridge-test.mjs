// 인증 다리 검사 — 아이디↔이메일과 «막는 자리» (2026-09-07)
//
//   node tools/auth-bridge-test.mjs
//
// 🔵 왜 — 로그인을 Firebase Auth 로 옮기면서 학번을 «가짜 이메일»로 바꿔 쓴다.
//   이 바꿈이 어긋나면 **계정을 만들 때가 아니라 로그인할 때** 조용히 실패한다.
//   그때는 「비밀번호가 틀렸나」로 보여서 원인을 못 찾는다. 그래서 여기서 못 박는다.
//
// 🔴 특히 «갈래를 짐작하지 않는가»를 본다 — 모르는 도메인에서 「학생이겠지」로 읽으면
//   조교가 학생으로 로그인되는 자리가 생긴다.
//
// ⚠ 실제 Firebase 는 안 부른다. 부르는 값을 «짓는» 자리만 본다.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/\r\n/g, '\n');

/* 다리에서 «순수한» 부분만 떠낸다 — Firebase 를 안 건드리는 것들 */
const 처음 = html.indexOf('const AUTH_도메인 =');
const 끝 = html.indexOf('function authUid()');
if (처음 < 0 || 끝 < 0) { console.error('🔴 인증 다리를 못 찾았다'); process.exit(1); }
const 조각 = html.slice(처음, 끝);
const { authIdOk, authIdWhyBad, authEmailOf, authWhoOf } =
  new Function(조각 + '; return { authIdOk, authIdWhyBad, authEmailOf, authWhoOf };')();

let 통과 = 0, 틀림 = 0;
const 봄 = (무엇, 잰것, 바란것) => {
  const 같다 = JSON.stringify(잰것) === JSON.stringify(바란것);
  같다 ? 통과++ : 틀림++;
  console.log((같다 ? '  ✓ ' : '  ✗ ') + 무엇
    + (같다 ? '' : '\n      나온 것: ' + JSON.stringify(잰것) + '\n      나와야:  ' + JSON.stringify(바란것)));
};

/* ── 아이디 → 이메일 ─────────────────────────────────────────── */
봄('학생 학번이 학생 도메인으로 간다', authEmailOf('student', '20260101'), '20260101@students.hahyunmath.invalid');
봄('조교는 조교 도메인으로 간다', authEmailOf('assistant', 'ta01'), 'ta01@ta.hahyunmath.invalid');
봄('강사는 강사 도메인으로 간다', authEmailOf('teacher', 'kim'), 'kim@teacher.hahyunmath.invalid');
// 🔴 대문자로 친 아이디가 «다른 계정»이 되면 안 된다 — 이메일은 앞자리도 구분하는 곳이 있다.
봄('대문자로 쳐도 같은 계정이 된다', authEmailOf('student', 'AB12'), authEmailOf('student', 'ab12'));

/* ── 이메일 → 누구 ───────────────────────────────────────────── */
봄('학생 주소를 학생으로 되읽는다', authWhoOf('20260101@students.hahyunmath.invalid'), { role: 'student', id: '20260101' });
봄('조교 주소를 조교로 되읽는다', authWhoOf('ta01@ta.hahyunmath.invalid'), { role: 'assistant', id: 'ta01' });
// 🔴 모르는 도메인을 «학생이겠지»로 읽으면 남의 화면이 열린다.
봄('모르는 도메인은 짐작하지 않는다', authWhoOf('someone@gmail.com'), null);
봄('주소가 아니면 null', authWhoOf('그냥글자'), null);
봄('빈 값도 null', authWhoOf(''), null);

/* ── 아이디에 못 쓰는 글자 ───────────────────────────────────── */
봄('영문+숫자는 된다', authIdOk('ab12'), true);
봄('점·밑줄·붙임표는 된다', authIdOk('a.b_c-1'), true);
봄('한글은 막는다', authIdOk('가나다'), false);
봄('빈칸은 막는다', authIdOk('ab 12'), false);
봄('@ 는 막는다 — 주소가 두 조각 나 버린다', authIdOk('a@b'), false);
봄('기호로 시작하는 것은 막는다', authIdOk('.ab'), false);
봄('빈 값은 막는다', authIdOk(''), false);
봄('너무 긴 것은 막는다', authIdOk('a'.repeat(70)), false);

/* ── 왜 막혔는지 «사람 말»로 알려 주는가 ─────────────────────── */
// ⚠ 「쓸 수 없는 아이디입니다」만 뜨면 무엇을 고쳐야 할지 모른다.
봄('한글이면 한글이라고 말한다', /한글/.test(authIdWhyBad('가나다')), true);
봄('빈칸이면 빈칸이라고 말한다', /빈칸/.test(authIdWhyBad('a b')), true);
봄('비었으면 적어 달라고 말한다', /적어/.test(authIdWhyBad('')), true);
봄('긴 것은 길이를 말한다', /63/.test(authIdWhyBad('a'.repeat(70))), true);

/* ── 다리가 «지켜야 할 모양»을 갖췄나 ────────────────────────── */
// 🔴 계정을 그냥 만들면 강사 세션이 새 계정으로 바뀐다. 두 번째 앱으로 만들어야 한다.
봄('계정 만들기가 «두 번째 앱»을 쓴다',
  /firebase\.initializeApp\(firebaseConfig, 이름\)/.test(html), true);
봄('만들고 나서 그 앱을 닫는다', /곁\.delete\(\)/.test(html), true);
// 🔴 익명을 «로그인한 것»으로 세면 규칙과 앱의 판단이 어긋난다.
봄('익명과 진짜 계정을 가른다', /providerId === 'password'/.test(html), true);
// ⚠ Firebase 의 코드(auth/wrong-password)를 화면에 그대로 내보내면 안 된다.
봄('실패 까닭을 사람 말로 바꾼다', /function authWhyFailed/.test(html), true);
봄('이메일 로그인이 안 켜진 경우를 짚어 준다',
  /operation-not-allowed[\s\S]{0,120}Sign-in method/.test(html), true);

/* ── 로그아웃이 «진짜로» 나가는가 ────────────────────────────── */
//
// 🔴 2026-09-08에 사용자가 찾았다 — 로그아웃하고 새로고침하면 **도로 로그인돼 있었다.**
//   `clearSession()` 은 localStorage 만 지웠고 Firebase 세션은 살아 있었다.
//   ⚠ 예전에는 티가 안 났다. 누구인가를 localStorage 가 정했으니 그것만 지우면 됐다.
//     «누구인가는 토큰이 정한다»로 바꾸면서 이 줄이 뒤처진 것이다.
//     🔵 **판단하는 자리를 옮기면 지우는 자리도 같이 옮겨야 한다.**
//   🔴 학원 공용 컴퓨터에서 위험한 자리라, 사람 기억이 아니라 검사가 지킨다.
{
  const at = html.indexOf('async function logout()');
  if (at < 0) { console.log('  ✗ logout 을 못 찾았다'); 틀림++; }
  else {
    let 깊이 = 0, 끝 = at;
    for (let j = html.indexOf('{', at); j < html.length; j++) {
      if (html[j] === '{') 깊이++;
      else if (html[j] === '}') { 깊이--; if (!깊이) { 끝 = j + 1; break; } }
    }
    const 몸 = html.slice(at, 끝);
    const w = { 나갔나: false, 지웠나: false, 세션지웠나: false };
    const state = { currentUser: { type: 'teacher' } };
    const DATA = { students: [{ name: '앞사람' }], records: { a: 1 }, chats: { a: 1 } };
    const fn = new Function('clearSession', 'state', 'DATA', 'dbReadClear', 'authSignOut', 'goto',
      몸 + '; return logout;')(
      () => { w.세션지웠나 = true; }, state, DATA,
      () => { w.지웠나 = true; },
      async () => { w.나갔나 = true; },
      () => {},
    );
    await fn();
    봄('🔴 Firebase 세션에서 «실제로» 나간다', w.나갔나, true);
    봄('   저장된 세션도 지운다', w.세션지웠나, true);
    봄('   «못 읽었다» 표시도 지운다', w.지웠나, true);
    봄('🔴 앞사람의 명단을 화면에 남기지 않는다', DATA.students.length, 0);
    봄('🔴 앞사람의 기록도 남기지 않는다', Object.keys(DATA.records).length, 0);
    봄('   지금 사람이 없다고 표시한다', state.currentUser, null);
  }
}

console.log(틀림 ? '\n  🔴 ' + 통과 + ' 통과 · ' + 틀림 + ' 실패\n' : '\n  ✅ ' + 통과 + ' 통과 · 0 실패\n');
process.exit(틀림 ? 1 : 0);
