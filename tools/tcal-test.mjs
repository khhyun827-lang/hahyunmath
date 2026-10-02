// 강사 홈 달력 (2026-09-30) — 화면 없이 잰다
//
//   node tools/tcal-test.mjs
//
// 붙드는 것: 휴강은 «흐리게» 남는다 · 시험은 학교들의 기간을 «합친» 면 · 취소 클리닉은 빠진다 ·
//   상담진행은 날마다 한 줄 · 같은 날은 시각 순(「2시」=14시 · 「오후 7시」=19시).
// teacherMonthEvents 는 index.html 에서 그대로 떠 오고, 둘레 함수만 흉내 낸다.

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
}
let pass = 0, fail = 0;
const 봄 = (무엇, 나온것, 나와야) => {
  const ok = JSON.stringify(나온것) === JSON.stringify(나와야);
  if(ok){ pass++; console.log('  ✓ ' + 무엇); }
  else { fail++; console.log(`  ✗ ${무엇}${NL}      나온 것: ${JSON.stringify(나온것)}${NL}      나와야:  ${JSON.stringify(나와야)}`); }
};

const DATA = {
  students: [{ studentId: 's1', name: '가', school: 'A고', grade: '1' }, { studentId: 's2', name: '나', school: 'B고', grade: '1' },
             { studentId: 's3', name: '다', school: 'A고', grade: '1' }],
  clinics: [{ day: '2026-10-05', studentId: 's1', status: '승인', t: '오후 6시' },
            { day: '2026-10-05', studentId: 's2', status: '취소', t: '오후 3시' },
            { day: '2026-10-06', studentId: 's2', status: '대기', t: '오후 3시' }],
};
const 시험 = { 'A고|1': { start: '2026-10-10', end: '2026-10-12', math: '2026-10-11' },
               'B고|1': { start: '2026-10-12', end: '2026-10-14', math: '' } };
const 칸 = { s1: { '2026-10-03': { k: 'consult' } }, s3: { '2026-10-03': { k: 'consult' } } };
const 수업 = { '2026-10-05': [{ id: 'c1', name: '0.5B', schedule: '' }, { id: 'jikbo:x', jikbo: true, name: 'A고 직전보충', timeText: '2시' }],
               '2026-10-07': [{ id: 'c1', name: '0.5B', schedule: '' }] };

const f = new Function('DATA', 'sessionsOn', 'offDayFor', 'movedInto', 'sessionTimeText', 'stuDayLabel', 'ymd',
  'examDatesOf', 'gradeLabel', 'dateShift', 'isWithdrawn', 'clinicWhenLabel', 'planCellsOfStudent',
  lift('schoolShort') + NL + lift('teacherMonthEvents') + NL + 'return teacherMonthEvents;')(
  DATA, d => 수업[d] || [], (id, d) => d === '2026-10-07' ? { label: '행사' } : null, () => null,
  () => '19:00~21:00', d => d, (y, m, d) => y + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0'),
  (s, g) => 시험[s + '|' + g] || null, g => g + '학년',
  (d, n) => new Date(Date.parse(d + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10),
  () => false, cl => cl.t, sid => 칸[sid] || {});

const { out, 시험날, 수학날 } = f('2026-10');
console.log('홈 달력');
봄('같은 날은 시각 순 — 직보 2시 · 클리닉 오후 6시 · 수업 19시', out['2026-10-05'].map(e => e.kind), ['plan', 'clinic', 'class']);
봄('취소한 클리닉은 없다 · 대기는 딱지', out['2026-10-06'].map(e => e.sub), ['대기']);
봄('휴강은 지우지 않고 흐리게', out['2026-10-07'].map(e => [e.title, e.흐림]), [['0.5B — 휴강', true]]);
봄('시험기간 = 학교들을 합친 면', Object.keys(시험날).sort(), ['2026-10-10', '2026-10-11', '2026-10-12', '2026-10-13', '2026-10-14']);
봄('수학 시험일', Object.keys(수학날), ['2026-10-11']);
봄('상담진행은 날마다 한 줄', out['2026-10-03'].map(e => [e.title, e.sub]), [['상담진행 · 2명', '가 · 다']]);
봄('학교·학년마다 한 번만', out['2026-10-10'].map(e => e.title), ['A고 1학년 시험기간 시작']);
봄('칸 안 짧은 이름 — 정규 수업은 없다(점만)', out['2026-10-05'].map(e => e.short), ['A고 직전보충', '가', '']);
봄('칸 안 짧은 이름 — 시험', [out['2026-10-10'][0].short, out['2026-10-11'][0].short], ['A1 시작', 'A1 수학']);
{ const m = f('2026-10', [{ id: 'e1', date: '2026-10-05', t: '치과', time: '08:00' }]).out['2026-10-05'];
  봄('내 일정 — 아침 08:00 은 맨 앞(저녁으로 밀리지 않는다)', m.map(e => e.kind), ['mine', 'plan', 'clinic', 'class']); }
봄('다른 달은 안 넣는다', Object.keys(f('2026-11').out).length, 0);

console.log(NL + `${pass} 통과 · ${fail} 실패`);
process.exit(fail ? 1 : 0);
