// 학생 문서의 «이름»은 하나뿐이어야 한다 — Auth uid (2026-09-13)
//
//   node tools/student-key-test.mjs
//
// 🔴 **왜 재는가** — 09-07에 저장 열쇠를 학번 → uid 로 옮기면서(`studentKeyOfSid`) 세 자리를
//   빠뜨렸다: `rosterBulkMoveClass` · `withdrawStudent` · `restoreStudent`. 그 뒤 사용자가 엑셀로
//   14명을 넣고 명단에서 「반 이동」을 누르자 **한 사람이 «미배정»·«고1GA1» 두 줄로 복제**됐다
//   (`students/<uid>` 옆에 `students/<학번>` 이 하나 더 생겼다). 화면은 둘 다 읽어 두 줄로
//   그렸고, 고르기는 학번으로 하니 하나를 고르면 둘이 같이 켜져 지울 수도 없었다.
//   🔴 **«되긴 되는데 틀린 값»의 꼴이다** — 반 이동은 성공한 것처럼 보였다.
//
//   그래서 글자로 붙든다: `students` 컬렉션에 쓰거나 지우는 자리마다 둘째 인자가
//   `uid` · `key` · `studentKeyOfSid(…)` 중 하나여야 한다. 학번(`sid`·`s.studentId`)이 오면 떨어진다.
//   ⚠ 정규식은 «자리를 찾는 데»만 쓴다 — 판정은 인자를 눈으로 읽듯 글자로 견준다.
//
//   둘째로, 고친 세 함수가 정말 `studentKeyOfSid` 를 지나는지 **함수를 떠 와서 돌려 본다** —
//   메모리에 uid 가 있는 학생을 옮기면 저장 열쇠가 uid 여야 한다.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const NL = String.fromCharCode(10);
const lines = html.split(/\r?\n/);

let pass = 0, fail = 0;
const 됨 = (무엇, ok, 곁) => {
  if (ok) { pass++; console.log('  ✓ ' + 무엇 + (곁 ? '  — ' + 곁 : '')); }
  else { fail++; console.log('  🔴 ' + 무엇 + (곁 ? NL + '      ' + 곁 : '')); }
};

console.log(NL + '학생 문서 열쇠 — uid 하나뿐인가' + NL);

/* ① 글자로: students 에 쓰는 자리 전부 */
const 허용 = /^(uid|key|studentKeyOfSid\(.+\))$/;
let 자리 = 0;
lines.forEach((l, i) => {
  const m = l.match(/db(?:Set|Delete)Doc\('students',\s*(studentKeyOfSid\([^)]*\)|[A-Za-z_.]+)/);
  if (!m) return;
  자리++;
  const arg = m[1].trim();
  됨('index.html:' + (i + 1) + '  ' + arg, 허용.test(arg), 허용.test(arg) ? null : '학번으로 쓰면 uid 문서 옆에 하나 더 생긴다');
});
됨('쓰는 자리를 찾았다', 자리 >= 6, 자리 + '곳');

/* ② 돌려서: 세 함수가 uid 로 저장하는가 */
function lift(name) {
  let at = html.indexOf('function ' + name + '(');
  if (at < 0) throw new Error(name + ' 를 못 찾았습니다');
  if (html.slice(at - 6, at) === 'async ') at -= 6;
  let depth = 0;
  for (let j = html.indexOf('{', at); j < html.length; j++) {
    if (html[j] === '{') depth++;
    else if (html[j] === '}') { depth--; if (!depth) return html.slice(at, j + 1); }
  }
  throw new Error(name + ' 의 끝을 못 찾았습니다');
}
const 저장된 = [];
const 곁 = {
  DATA: { students: [{ studentId: 'st01', uid: 'UID-01', name: '가', classId: '' }], classes: [{ id: 'c1', name: '1반' }] },
  state: { rosterSelected: ['st01'], rosterLastIndex: null },
  document: { getElementById: (id) => id === 'rst-move' ? { value: 'c1' } : id === 'wd-date' ? { value: '2026-09-13' } : { value: '' } },
  confirm: () => true,
  dbSetDoc: async (col, id, data) => { 저장된.push([col, id]); return true; },
  logAudit: async () => { }, showToast: () => { }, render: () => { },
  classNameOf: (id) => '1반', todayStr: () => '2026-09-13',
};
const src = lift('studentKeyOfSid') + NL + lift('rosterBulkMoveClass') + NL + lift('withdrawStudent') + NL + lift('restoreStudent')
  + NL + 'return { rosterBulkMoveClass, withdrawStudent, restoreStudent };';
const api = new Function(...Object.keys(곁), src)(...Object.values(곁));

await api.rosterBulkMoveClass();
됨('반 이동 → students/UID-01', JSON.stringify(저장된) === JSON.stringify([['students', 'UID-01']]), JSON.stringify(저장된));
됨('반 이동 뒤 메모리 classId', 곁.DATA.students[0].classId === 'c1');
저장된.length = 0;
await api.withdrawStudent('st01');
됨('퇴원 → students/UID-01', JSON.stringify(저장된) === JSON.stringify([['students', 'UID-01']]), JSON.stringify(저장된));
저장된.length = 0;
await api.restoreStudent('st01');
됨('재원 복귀 → students/UID-01', JSON.stringify(저장된) === JSON.stringify([['students', 'UID-01']]), JSON.stringify(저장된));

console.log(NL + (fail ? '🔴 ' + fail + '개 실패 · ' : '✓ 전부 통과 · ') + pass + '개' + NL);
process.exit(fail ? 1 : 0);
