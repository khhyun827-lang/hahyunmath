// 직보 → 수업 탭 (2026-09-30) — 화면 없이 잰다
//
//   node tools/jikbo-session-test.mjs
//
// 붙드는 것: 직보 칸 → 그 날 «학교 하나 = 수업 하나» → 명단 → 출결 저장이 직보 id 로 → 출석률(주 반)에 안 섞임.
// 함수는 index.html 에서 그대로 떠 온다(exam-plan-test 와 같은 방식).

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const NL = String.fromCharCode(10);

function lift(name){
  const at = html.indexOf('function ' + name + '(');
  if(at < 0) throw new Error(name + ' 를 못 찾았습니다');
  let depth = 0;
  for(let j = html.indexOf('{', at); j < html.length; j++){
    if(html[j] === '{') depth++;
    else if(html[j] === '}'){ depth--; if(!depth) return html.slice(at, j + 1); }
  }
  throw new Error(name + ' 의 끝을 못 찾았습니다');
}
const 한줄 = (시작) => { const a = html.indexOf(시작); return html.slice(a, html.indexOf(NL, a)); };

let pass = 0, fail = 0;
const 봄 = (무엇, 나온것, 나와야) => {
  const ok = JSON.stringify(나온것) === JSON.stringify(나와야);
  if(ok){ pass++; console.log('  ✓ ' + 무엇); }
  else { fail++; console.log(`  ✗ ${무엇}${NL}      나온 것: ${JSON.stringify(나온것)}${NL}      나와야:  ${JSON.stringify(나와야)}`); }
};

const 이름들 = ['examPlanAll', 'planCellsOfStudent', 'isJikboSession', 'jikboParse', 'jikboCellOn',
  'jikboRoster', 'jikboSessionsOn', 'classRoster', 'classRosterAll', 'byKoName', 'classNameOf', 'attClassOf', 'attOn', 'attCountedOf',
  'studentMainClassId', 'saveClassAttendance'];
const 몸 = 한줄('const JIKBO_NO_SCHOOL') + NL + 이름들.map(n => (n === 'saveClassAttendance' ? 'async ' : '') + lift(n)).join(NL) + NL +
  'return {' + 이름들.join(',') + '};';

const D = '2026-10-01';
const state = { attDraft: {}, allRecords: {}, examPlan: { byKey: {
  '2026-09-01_2학기중간': { cells: {
    s1: { [D]: { k: 'jikbo', t: '2시' } },
    s2: { [D]: { k: 'jikbo', t: '2시' } },
    s3: { [D]: { k: 'off' } },                     // 등원X — 직보가 아니다
    s4: { [D]: { k: 'jikbo', t: '5시' } },
    s5: { [D]: { k: 'jikbo', t: '2시' } },         // 퇴원생
  } } } } };
const DATA = { videos: [], classes: [{ id: 'c1', name: '0.5B' }], students: [
  { studentId: 's1', name: '가', school: '광남고', classId: 'c1' },
  { studentId: 's2', name: '나', school: '광남고', classId: 'c2' },
  { studentId: 's3', name: '다', school: '광남고', classId: 'c1' },
  { studentId: 's4', name: '라', school: '대원고', classId: 'c1' },
  { studentId: 's5', name: '마', school: '광남고', classId: 'c1', out: true },
] };
const recs = { s1: { attendance: [{ date: D, status: '출석', classId: 'c1' }] }, s2: { attendance: [] } };
const f = new Function('state', 'DATA', 'isWithdrawn', 'studentClassIds', 'loadRecord', 'saveRecord',
  'logAudit', 'showToast', 'render', 'extractYouTubeId', 'ymdPlusDays', 'MAKEUP_VIDEO_DAYS', 'dbSetDoc', 몸)(
  state, DATA, s => !!s.out, s => [s.classId], async sid => recs[sid] || (recs[sid] = { attendance: [] }),
  async () => true, async () => {}, () => {}, () => {}, () => '', () => '', 7, async () => true);

console.log('직보 → 수업');
const ss = f.jikboSessionsOn(D);
봄('학교마다 수업 하나 · 이름 · 시간', ss.map(c => [c.name, c.timeText, c.hour]),
  [['광남고 직전보충', '2시', 14], ['대원고 직전보충', '5시', 17]]);
봄('다른 날엔 없다', f.jikboSessionsOn('2026-10-02').length, 0);
const gid = ss[0].id;
봄('명단 = 그 학교 직보(반 섞임 · 등원X·퇴원 뺌)', f.classRoster(gid).map(s => s.studentId), ['s1', 's2']);
봄('반 이름 대신 «학교 직전보충»', f.classNameOf(gid), '광남고 직전보충');
봄('평범한 반은 그대로', f.classRoster('c1').map(s => s.studentId), ['s1', 's3', 's4']);

state.attDraft = { s1: { status: '결석', reason: '' }, s2: { status: '출석', reason: '' } };
await f.saveClassAttendance(gid, D);
봄('같은 날 정규 출결을 안 덮는다', recs.s1.attendance.map(a => [a.classId, a.status]), [['c1', '출석'], [gid, '결석']]);
봄('직보 줄로 다시 읽힌다', f.attOn(recs.s1, D, gid, 'c1').status, '결석');
봄('출석률(주 반)에 안 섞인다', f.attCountedOf(recs.s1, DATA.students[0]).map(a => a.status), ['출석']);

console.log(NL + `${pass} 통과 · ${fail} 실패`);
process.exit(fail ? 1 : 0);
