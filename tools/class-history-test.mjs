/* 그 날 그 반에 있었나 · 반 이력 (2026-10-18) — 사용자 「반을 종료하거나 학생이 졸업해도 이전 기록을 다 볼 수 있게」(A·B).

     node tools/class-history-test.mjs

   🔴 무는 자리 — ① 졸업·퇴원한 학생이 «지난 날짜» 명단에는 남고 «떠난 날부터»는 빠진다
   ② 반을 옮기면 옛 반 기간이 이력으로 닫히고, 새 반은 «든 날»부터다 ③ 지난 과제의 «받은 학생»은 낸 날 그 반에 있던 학생
   ④ 반을 옮겨도 옛 정규 반 출결이 출석률(주 반 기록)에 남는다. ⚠ 함수는 베끼지 않는다 — index.html 에서 그대로 뜬다. */
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
let pass = 0, fail = 0;
const 봄 = (무엇, 나온것, 나와야) => {
  const ok = JSON.stringify(나온것) === JSON.stringify(나와야);
  if (ok) pass++; else fail++;
  console.log((ok ? '  ✓ ' : '  🔴 ') + 무엇 + (ok ? '' : NL + '      나온 것 ' + JSON.stringify(나온것) + NL + '      나와야 ' + JSON.stringify(나와야)));
};

const 이름들 = ['studentClassIds', 'studentMainClassId', 'studentExtraClassIds', 'isWithdrawnRecord', 'isWithdrawn', 'isEnded',
  'goneDateOf', 'inClassOn', 'classChangeFields', 'classRosterOn', 'classRosterDuring', 'classRoster', 'byKoName', 'classRosterAll',
  'attClassOf', 'attOn', 'attOfClass', 'attCountedOf', 'mainClassesOf', 'itemDay', 'beforeJoin', 'joinedRoster', 'itemTakers', 'classRosterEver'];
function 판(학생, 기록) {
  const 곁 = {
    DATA: { students: 학생, records: {} },
    state: { allRecords: 기록 || {} },
    todayStr: () => '2026-10-18',
    ymdLocal: d => d.toISOString().slice(0, 10),
    isJikboSession: () => false, jikboRoster: () => [],
    isSpecialClass: id => id === 'SP',
  };
  return new Function(...Object.keys(곁), 이름들.map(lift).join(NL) + NL + 'return { ' + 이름들.join(', ') + ' };')(...Object.values(곁));
}
const 이름 = list => list.map(s => s.name);

console.log(NL + '① 졸업·퇴원 — 지난 날짜엔 남고, 떠난 날부터 빠진다' + NL);
{
  const 가 = { studentId: 'a', name: '가', classId: 'A' };
  const 나 = { studentId: 'b', name: '나', classId: 'A', endedAt: '2026-10-10', endType: '졸업' };
  const 다 = { studentId: 'c', name: '다', classId: 'A', withdrawnAt: '2026-09-15' };
  const 라 = { studentId: 'd', name: '라', classId: 'A', joinedAt: '2026-10-01' };
  const F = 판([가, 나, 다, 라]);
  봄('🔴 9/1 명단 — 졸업생·퇴원생도 그 날은 있었다 (등록 전인 «라»는 없다)', 이름(F.classRosterOn('A', '2026-09-01')), ['가', '나', '다']);
  봄('🔴 9/20 — 9/15 퇴원한 «다»는 빠진다', 이름(F.classRosterOn('A', '2026-09-20')), ['가', '나']);
  봄('🔴 10/10 — 졸업한 날부터 «나»는 빠진다', 이름(F.classRosterOn('A', '2026-10-10')), ['가', '라']);
  봄('지금 명단(classRoster)은 그대로 — 지금 다니는 학생만', 이름(F.classRoster('A')), ['가', '라']);
  봄('🔴 9월 한 달 격자의 줄 — 그 달에 한 번이라도 있던 학생', 이름(F.classRosterDuring('A', ['2026-09-08', '2026-09-22'])), ['가', '나', '다']);
}
{
  /* 옛 퇴원(학생 문서엔 표시가 없고 출결 «퇴원» 줄만 있는 것) — 그 날부터 빠진다 */
  const 마 = { studentId: 'e', name: '마', classId: 'A' };
  const F = 판([마], { e: { attendance: [{ date: '2026-09-01', status: '출석', classId: 'A' }, { date: '2026-09-10', status: '퇴원', classId: 'A' }] } });
  봄('옛 퇴원 — 9/5 엔 있다', 이름(F.classRosterOn('A', '2026-09-05')), ['마']);
  봄('   9/10 퇴원 줄이 있는 날은 (그 날 기록이 있어) 남는다', 이름(F.classRosterOn('A', '2026-09-10')), ['마']);
  봄('   9/12 부터는 빠진다', 이름(F.classRosterOn('A', '2026-09-12')), []);
}

console.log(NL + '② 반 이동 — 옛 반은 이력으로 닫고 새 반은 든 날부터' + NL);
{
  const 바 = { studentId: 'f', name: '바', classId: 'A', joinedAt: '2026-03-02' };
  const F = 판([바]);
  const 칸 = F.classChangeFields(바, 'B', [], '2026-10-05');
  봄('🔴 빠진 반 A 는 등록일~옮긴 날로 이력에 남는다', 칸.classHist, [{ classId: 'A', from: '2026-03-02', to: '2026-10-05' }]);
  봄('   새 반 B 는 든 날을 적는다', 칸.classSince, { B: '2026-10-05' });
  Object.assign(바, 칸);
  봄('🔴 10/1 엔 A 반에 있었다', [F.inClassOn(바, 'A', '2026-10-01'), F.inClassOn(바, 'B', '2026-10-01')], [true, false]);
  봄('🔴 10/5(옮긴 날)부터는 B 반', [F.inClassOn(바, 'A', '2026-10-05'), F.inClassOn(바, 'B', '2026-10-05')], [false, true]);
  봄('   A 반을 거쳐 간 학생에 남는다 (성적·시험 화면)', 이름(F.classRosterAll('A')), ['바']);
  봄('   A 반 지금 명단에는 없다', 이름(F.classRoster('A')), []);
  /* 다시 옮긴다 — B 도 이력으로 닫힌다 */
  Object.assign(바, F.classChangeFields(바, 'C', [], '2026-11-01'));
  봄('두 번 옮기면 이력 둘', 바.classHist.map(h => h.classId + ':' + h.from + '~' + h.to), ['A:2026-03-02~2026-10-05', 'B:2026-10-05~2026-11-01']);
}
{
  /* 특강을 더하고 빼기 — 주 반은 그대로 */
  const 사 = { studentId: 'g', name: '사', classId: 'A' };
  const F = 판([사]);
  Object.assign(사, F.classChangeFields(사, 'A', ['SP'], '2026-09-01'));
  봄('특강을 더하면 든 날만 적는다 (이력 없음)', [사.classSince, 사.classHist], [{ SP: '2026-09-01' }, []]);
  Object.assign(사, F.classChangeFields(사, 'A', [], '2026-10-01'));
  봄('특강을 빼면 그 기간이 이력으로', 사.classHist, [{ classId: 'SP', from: '2026-09-01', to: '2026-10-01' }]);
  봄('   든 날 바로 뺀 반은 이력을 안 남긴다', F.classChangeFields({ classId: 'A', classSince: { X: '2026-10-18' }, classIds: ['X'] }, 'A', [], '2026-10-18').classHist, []);
}

console.log(NL + '③ 지난 과제의 «받은 학생» — 낸 날 그 반에 있던 학생' + NL);
{
  const 아 = { studentId: 'h', name: '아', classId: 'B', classSince: { B: '2026-10-05' }, classHist: [{ classId: 'A', from: '', to: '2026-10-05' }] };
  const 자 = { studentId: 'i', name: '자', classId: 'A', endedAt: '2026-10-10' };
  const 차 = { studentId: 'j', name: '차', classId: 'A' };
  const F = 판([아, 자, 차]);
  const 명단 = F.classRosterEver('A');
  봄('🔴 9월에 낸 A 반 과제 — 옮겨 간 «아»·졸업한 «자»도 받았다', 이름(F.itemTakers('A', 명단, { createdAt: '2026-09-20' })), ['아', '자', '차']);
  봄('🔴 10/12 에 낸 A 반 과제 — 둘 다 이미 떠났다', 이름(F.itemTakers('A', 명단, { createdAt: '2026-10-12' })), ['차']);
  봄('🔴 B 반에 옮겨 온 «아»는 든 날 전 B 반 과제를 안 받았다', 이름(F.itemTakers('B', F.classRosterEver('B'), { createdAt: '2026-10-01' })), []);
  봄('   낸 날 모르는 옛 과제는 지금 그 반 학생만', 이름(F.itemTakers('A', 명단, { id: 'hw' })), ['자', '차']);
}

console.log(NL + '④ 반을 옮겨도 옛 정규 반 출결이 출석률에 남는다' + NL);
{
  const 카 = { studentId: 'k', name: '카', classId: 'B', classIds: ['SP'], classHist: [{ classId: 'A', from: '', to: '2026-10-05' }, { classId: 'SP2', from: '', to: '2026-09-01' }] };
  const F = 판([카]);
  const rec = { attendance: [{ date: '2026-09-01', status: '출석', classId: 'A' }, { date: '2026-10-06', status: '결석', classId: 'B' },
    { date: '2026-10-07', status: '출석', classId: 'SP' }] };
  봄('🔴 옛 반 A + 지금 반 B 출결을 센다 (지금 특강 SP 는 뺀다)', F.attCountedOf(rec, 카).map(a => a.classId), ['A', 'B']);
  봄('   주 반으로 치는 반', F.mainClassesOf(카), ['B', 'A', 'SP2']);
}

console.log(NL + (fail ? '🔴 ' : '✓ ') + pass + ' 통과 · ' + fail + ' 실패');
process.exit(fail ? 1 : 0);
