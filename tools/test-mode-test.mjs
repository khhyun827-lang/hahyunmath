// 테스트 모드 — 숨긴 계정을 이 기기의 강사 화면에만 다시 세운다 (2026-10-20)
//
//   node tools/test-mode-test.mjs
//
// 사용자 — 「테스트학생 지난번에 숨긴계정으로 바꾼 뒤로 테스트할 수 없는 기능이 많아졌어」.
// 🔴 붙드는 것: 꺼져 있으면 예전처럼 명단에서 빠진다 · 켜면 명단에 선다 · 어느 쪽이든 «숨긴 계정» 목록은 그대로 ·
//    다시 보이기를 눌러도 명단에 두 번 들어가지 않는다. 함수는 index.html 에서 그대로 뜬다.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/\r\n/g, '\n');
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
let pass = 0, fail = 0;
const 봄 = (무엇, 나온것, 나와야) => {
  const ok = JSON.stringify(나온것) === JSON.stringify(나와야);
  if (ok) pass++; else fail++;
  console.log((ok ? '  ✓ ' : '  🔴 ') + 무엇 + (ok ? '' : '\n      나온 것 ' + JSON.stringify(나온것) + '\n      나와야 ' + JSON.stringify(나와야)));
};
/* loadAllData 안의 «가르는 문» 두 줄을 그대로 떠 온다 */
const a = html.indexOf('  DATA.hiddenStudents = (DATA.students || []).filter(s => s && s.hidden);');
const b = html.indexOf('  DATA.videos = videosNewestFirst(DATA.videos);', a);
if (a < 0 || b < 0) throw new Error('가르는 문을 못 찾았습니다');
const 문 = html.slice(a, b);

function 돌려(켬) {
  const 저장 = 켬 ? { 'hm-test-mode': '1' } : {};
  const localStorage = { getItem: k => 저장[k] ?? null };
  const DATA = { students: [{ studentId: 's1', name: '학생' }, { studentId: 'test', name: '테스트학생', hidden: true }] };
  new Function('DATA', 'localStorage', lift('testModeOn') + '\n' + 문)(DATA, localStorage);
  return { 명단: DATA.students.map(s => s.studentId), 숨김: DATA.hiddenStudents.map(s => s.studentId) };
}
console.log('\n테스트 모드 — 숨긴 계정을 이 기기에서만 다시 세운다\n');
봄('꺼져 있으면 예전처럼 명단에서 빠진다', 돌려(false), { 명단: ['s1'], 숨김: ['test'] });
봄('🔴 켜면 명단에 선다 (숨긴 계정 목록은 그대로)', 돌려(true), { 명단: ['s1', 'test'], 숨김: ['test'] });
const 풀기 = lift('setStudentHidden');
봄('🔴 다시 보이기 — 테스트 모드여서 이미 명단에 있으면 두 번 넣지 않는다', /if\(!DATA\.students\.includes\(s\)\) DATA\.students\.push\(s\)/.test(풀기), true);
console.log(`\n  ${fail ? '🔴' : '✅'} ${pass} 통과 · ${fail} 실패\n`);
process.exit(fail ? 1 : 0);
