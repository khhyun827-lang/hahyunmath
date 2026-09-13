// 학년은 «한 벌»이다 — 「1」과 「고1」이 갈려 있었다 (2026-09-13 · K-22)
//
//   node tools/grade-one-test.mjs
//
// 사용자 — 「**일괄등록한 사람들은 학년에 1이라고 표시되는데 개별적으로 만들거나, 수정하면
//   「고1」이라고 표기되면서 서로 다른학년으로 인식되는 것 같아. 시험일정에도 서로 두번쓰여져있어.**」
//
// 🔴 학년은 **시험 일정의 열쇠**다(`examDatesOf(school, grade)`). 두 벌이면 한 학교가 두 줄로
//   갈리고, 날짜를 한쪽에 적으면 다른 쪽 학생에게는 **안 간다** — 조용히 갈리는 열쇠가 제일 나쁘다.
// ⚠ 함수를 여기에 옮겨 적지 않는다 — index.html 에서 그대로 뜬다.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/\r\n/g, '\n');
const NL = String.fromCharCode(10);

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
const 알맹이 = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

let pass = 0, fail = 0;
const 봄 = (무엇, 나온것, 나와야) => {
  const ok = JSON.stringify(나온것) === JSON.stringify(나와야);
  if (ok) pass++; else fail++;
  console.log((ok ? '  ✓ ' : '  🔴 ') + 무엇 +
    (ok ? '' : NL + '      나온 것 ' + JSON.stringify(나온것) + NL + '      나와야 ' + JSON.stringify(나와야)));
};

const G = new Function(lift('gradeLabel') + NL + 'return gradeLabel;')();

/* ═══ ① 보는 꼴 ═══ */
console.log(NL + '① 「1」도 「고1」도 한 꼴로' + NL);
{
  봄('🔴 엑셀의 「1」은 「고1」이다', ['1', '2', '3'].map(G), ['고1', '고2', '고3']);
  봄('🔴 「1학년」도 같다', G('1학년'), '고1');
  봄('이미 「고1」이면 그대로', ['고1', '고2', '고3'].map(G), ['고1', '고2', '고3']);
  봄('빈칸·사이 빈칸도 본다', [G('고 1'), G(' 2 '), G('고1 ')], ['고1', '고2', '고1']);
  봄('중학교도 같은 꼴로', [G('중3'), G('중 3'), G('중3학년')], ['중3', '중3', '중3']);
  봄('「고등학교 1학년」도 읽는다', [G('고등학교 1학년'), G('중학교 3')], ['고1', '중3']);
  봄('비면 빈 채로 (「고1」로 지어내지 않는다)', [G(''), G(null), G(undefined), G('  ')], ['', '', '', '']);

  /* 🔴 **아는 꼴이 아니면 그대로 둔다** — 짐작해서 바꾸면 사람이 적어 둔 말이 뭉개진다.
     `phoneLabel` 이 「없음」을 안 지우는 것과 같은 판단이다. */
  봄('🔴 모르는 꼴은 그대로 둔다', G('중3(예비고1)'), '중3(예비고1)');
  봄('🔴 범위 밖 숫자도 그대로 (4학년은 없다)', [G('4'), G('고4'), G('0')], ['4', '고4', '0']);
  봄('말이 섞인 것도 그대로', G('고1 상위반'), '고1 상위반');
  봄('숫자로 들어와도 읽는다 (엑셀은 숫자로 준다)', G(1), '고1');
}

/* ═══ ② 들어오는 문에서 한 번 ═══ */
console.log(NL + '② 읽어 올 때 한 번 — 자리마다 고치지 않는다' + NL);
{
  const N = new Function('DATA',
    lift('gradeLabel') + NL + lift('normStudentGrades') + NL + 'return normStudentGrades;')(
    { students: [{ grade: '1' }, { grade: '고2' }, { grade: '' }, { grade: '중3(예비고1)' }, null] });
  봄('터지지 않는다 (빈 자리가 섞여 있어도)', (() => { N(); return true; })(), true);

  const DATA = { students: [{ grade: '1' }, { grade: '고1' }, { grade: '3' }] };
  new Function('DATA', lift('gradeLabel') + NL + lift('normStudentGrades')
    + NL + 'normStudentGrades();')(DATA);
  봄('🔴 「1」과 「고1」이 한 값이 된다', DATA.students.map(s => s.grade), ['고1', '고1', '고3']);
  봄('🔴 그래서 시험 일정의 열쇠가 하나로 모인다',
    new Set(DATA.students.map(s => s.grade)).size, 2);

  /* 🔴 문이 둘이다 — 강사가 읽을 때와 학생이 읽을 때 */
  봄('🔴 강사가 명단을 읽을 때 거친다',
    알맹이(lift('loadAllData')).includes('normStudentGrades()'), true);
  봄('🔴 학생이 제 것을 읽을 때도 거친다',
    알맹이(lift('loadStudentData')).includes('normStudentGrades()'), true);
  /* ⚠ 저장은 여기서 안 한다 — 화면이 맞으면 된 것이고 DB 는 그 학생을 저장할 때 따라온다 */
  봄('⚠ 읽으면서 DB 를 안 쓴다 (46명을 통째로 덮지 않는다)',
    알맹이(lift('normStudentGrades')).includes('dbSetDoc'), false);
}

/* ═══ ③ 쓰는 자리 셋 ═══ */
console.log(NL + '③ 쓰는 자리 — 일괄 등록 · 개별 등록 · 고치기' + NL);
{
  봄('🔴 일괄 등록이 엑셀의 「1」을 그대로 안 담는다',
    html.includes("grade: gradeLabel(r['학년'] ?? '') || '고1',"), true);
  봄('🔴 개별 등록도 거친다',
    알맹이(lift('addStudent')).includes("gradeLabel(document.getElementById('new-sgrade').value)"), true);
  봄('🔴 고치기도 거친다',
    알맹이(lift('updateStudentInfo')).includes("gradeLabel(document.getElementById('info-sgrade').value)"), true);
  /* 🔴 **고르개가 «지금 값»을 못 찾으면 첫 칸이 잡힌 채로 열린다** —
     고치기를 눌렀다가 아무것도 안 건드리고 저장해도 학년이 조용히 바뀐다. */
  봄('🔴 고르개가 지금 값을 같은 잣대로 찾는다',
    html.includes("gradeLabel(s.grade)===g?'selected':''"), true);
  봄('🔴 고르개에 없는 값은 칸을 얹어 안 잃는다',
    html.includes("['고1','고2','고3'].concat(gradeLabel(s.grade) ? [gradeLabel(s.grade)] : [])"), true);
}

/* ═══ ④ 시험 일정 ═══ */
console.log(NL + '④ 시험 일정 — 한 학교가 한 줄이다' + NL);
{
  /* 줄을 세우는 자리가 `s.grade` 를 그대로 쓴다 — 위에서 이미 한 벌이 되어 있어야 한다 */
  const 일정 = 알맹이(lift('teacherExamRangeHTML'));
  봄('줄은 학교 × 학년 × 과목으로 선다', 일정.includes('rangeKey(school, grade, subject'), true);
  봄('열쇠는 학생의 학년 그대로다', 일정.includes("grade = s.grade || ''"), true);
  const E = new Function('state',
    lift('examDatesOf') + NL + 'return examDatesOf;')(
    { examRanges: { dates: { '광남고': { '고1': { math: '2026-10-05' } } } } });
  봄('🔴 「고1」로 적은 날짜를 「고1」이 찾는다', (E('광남고', '고1') || {}).math, '2026-10-05');
  봄('🔴 「1」로는 못 찾는다 — 그래서 한 벌로 만드는 것이다', E('광남고', '1'), null);
}

console.log(NL + (fail ? '🔴 ' + fail + '개 실패 · ' : '✓ 전부 통과 · ') + pass + '개' + NL);
process.exit(fail ? 1 : 0);
