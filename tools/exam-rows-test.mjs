// 시험 일정 표의 «줄»이 언제 서는가 (2026-09-08 · 사용자가 짚었다)
//
//   node tools/exam-rows-test.mjs
//
// 🔴 **사용자가 겪은 것** — 「학생과 학교를 등록했는데 시험일정 적을 수 있는 표가 뜨지 않아」.
//   그 학생이 듣는 반에 «진도 과목»이 없어서 \`if(!subject) return;\` 으로 통째로 빠지고 있었다.
//   그래서 **날짜조차 못 적었다.**
//
// 🔵 그런데 이 화면이 스스로 말하듯 **«날짜와 교재는 학교·학년 단위»**다 — 과목과 상관없다.
//   그러니 과목이 없어도 «학교 × 학년» 줄은 서야 한다. 범위 칸만 비면 된다.
//
// ⚠ 화면 전체를 그리지 않는다 — «줄을 세우는 그 토막»만 떠내서 잰다.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/\r\n/g, '\n');

let 통과 = 0, 틀림 = 0;
const 봄 = (무엇, 잰것, 바란것) => {
  const 같다 = JSON.stringify(잰것) === JSON.stringify(바란것);
  같다 ? 통과++ : 틀림++;
  console.log((같다 ? '  ✓ ' : '  ✗ ') + 무엇
    + (같다 ? '' : '\n      나온 것: ' + JSON.stringify(잰것) + '\n      나와야:  ' + JSON.stringify(바란것)));
};

/* 줄을 세우는 토막만 떠낸다 */
const 처음 = html.indexOf('    const combos = {};');
const 끝 = html.indexOf('list = Object.values(combos);', 처음);
if (처음 < 0 || 끝 < 0) { console.error('🔴 줄 세우는 토막을 못 찾았다'); process.exit(1); }
const 토막 = html.slice(처음, 끝) + 'list = Object.values(combos); return list;';

function 세운다(students, 과목표) {
  const DATA = { students };
  return new Function('DATA', 'subjectOfStudent', 'rangeKey',
    'let list = [];\n' + 토막)(
    DATA,
    (sid) => 과목표[sid] || '',
    (sc, gr, sj) => sc + '|' + gr + '|' + sj,
  );
}

console.log('\n시험 일정 — 줄이 언제 서는가\n');

/* ── ① 사용자가 겪은 그 자리 ─────────────────────────────────── */
{
  const list = 세운다([{ studentId: 'a', school: '광남고', grade: '고1' }], {});
  봄('🔴 반에 과목이 없어도 줄이 «선다»', list.length, 1);
  봄('   학교·학년은 그대로 들어간다', [list[0].school, list[0].grade], ['광남고', '고1']);
  봄('   과목만 비어 있다 — 화면은 «—»로 그린다', list[0].subject, '');
  봄('   학생 수도 센다', list[0].n, 1);
}

/* ── ② 과목이 있으면 예전 그대로 ─────────────────────────────── */
{
  const list = 세운다([{ studentId: 'a', school: '광남고', grade: '고1' }], { a: '공통수학2' });
  봄('과목이 있으면 과목 줄이 선다', [list.length, list[0].subject], [1, '공통수학2']);
}

/* ── ③ 🔴 한 학교·학년에 «두 줄»이 겹치지 않는가 ─────────────── */
//
// ⚠ 같은 학교·학년에 과목 있는 학생과 없는 학생이 섞이면, 빈 줄과 과목 줄이 둘 다 설 수 있다.
//   날짜 칸이 두 줄에 겹쳐 보이면 어느 것을 적어야 할지 헷갈린다 — 날짜는 학교·학년 하나다.
{
  const list = 세운다([
    { studentId: 'a', school: '광남고', grade: '고1' },
    { studentId: 'b', school: '광남고', grade: '고1' },
  ], { b: '공통수학2' });
  봄('🔴 같은 학교·학년이면 «과목 있는 줄»만 남는다', list.map(x => x.subject), ['공통수학2']);
}
{
  /* 학년이 다르면 겹치는 것이 아니다 — 둘 다 서야 한다. */
  const list = 세운다([
    { studentId: 'a', school: '광남고', grade: '고1' },
    { studentId: 'b', school: '광남고', grade: '고2' },
  ], { b: '공통수학2' });
  봄('학년이 다르면 둘 다 선다', list.length, 2);
}

/* ── ④ 걸 자리가 아예 없는 학생 ──────────────────────────────── */
{
  const list = 세운다([{ studentId: 'a', school: '', grade: '' }], {});
  봄('학교도 학년도 없으면 줄을 안 세운다 — 시험 일정을 걸 자리가 없다', list.length, 0);
}
{
  const list = 세운다([{ studentId: 'a', school: '', grade: '고1' }], {});
  봄('학년만 있어도 줄은 선다', list.length, 1);
}

/* ── ⑤ 옛 «통째로 빼던» 줄이 사라졌는가 ──────────────────────── */
봄('🔴 과목이 없다고 학생을 통째로 빼지 않는다', /const subject = subjectOfStudent\(s\.studentId\);\s*\n\s*if\(!subject\) return;/.test(html), false);

console.log(틀림 ? '\n  🔴 ' + 통과 + ' 통과 · ' + 틀림 + ' 실패\n' : '\n  ✅ ' + 통과 + ' 통과 · 0 실패\n');
process.exit(틀림 ? 1 : 0);
