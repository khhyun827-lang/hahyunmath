// 「과제 누락」 신호 — 마감이 지나야 선다 (2026-09-13 · K-16)
//
//   node tools/hw-signal-test.mjs
//
// 🔴 **왜 재는가** — 사용자 신고: 「과제누락이라고 신호판에 학생들이 잡히는데 지금 현재 올라간
//   과제는 19일마감이어서 아직 19일 마감전까지는 등록된 과제에 대해서 과제누락으로 안잡혔으면 좋겠어」.
//   신호가 `hwDone < hwTotal` 하나만 보고 있어서 **과제를 내는 순간 반 전체가 켜졌다.**
//
// ⚠ 함수를 여기에 옮겨 적지 않는다 — index.html 에서 그대로 뜬다.
// ⚠ 닻은 «함수 몸통»에 건다.

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

const 오늘 = '2026-09-13';

/* ═══ ① 세는 자리 — rosterStats 를 실제로 돌린다 ═══ */
console.log(NL + '① 마감이 지난 과제만 «누락»으로 센다' + NL);
{
  /* 넷을 섞어 둔다 — 아직 멀었다 · 오늘 마감 · 어제 마감 · 마감 없음. */
  const DATA = { assignments: [
    { id: 'h1', classId: 'c1', title: '19일 마감', createdAt: '2026-09-12', dueDate: '2026-09-19' },
    { id: 'h2', classId: 'c1', title: '오늘 마감', createdAt: '2026-09-06', dueDate: '2026-09-13' },
    { id: 'h3', classId: 'c1', title: '어제 마감', createdAt: '2026-09-05', dueDate: '2026-09-12' },
    { id: 'h4', classId: 'c1', title: '마감 없음', createdAt: '2026-09-01', dueDate: '' },
  ], videos: [], students: [] };
  const 만들기 = 한것 => {
    const rec = { attendance: [], scores: [], wrongHomework: [], videoProgress: {} };
    const F = new Function('DATA', 'state', 'studentClassIds', 'hwIsDone', 'liveWrongHomework', 'videoScore',
      'attCountedOf', 'attRateOf', 'scoresCountedOf', 'isWithdrawn', 'todayStr',
      'studentPrimaryClassId', 'getClassProgress',
      lift('rosterStats') + NL + 'return rosterStats;')(
      DATA, { allRecords: { s1: rec } }, () => ['c1'], (r, id) => 한것.includes(id), () => [], () => 0,
      () => [], () => null, () => [], () => false, () => 오늘,
      s => s.classId || '', () => ({ subject: '', percent: 0 }));
    return F({ studentId: 's1', name: '가나', classId: 'c1' });
  };
  const 아무것도 = 만들기([]);
  봄('과제는 넷이고, 한 것은 없다', [아무것도.hwTotal, 아무것도.hwDone], [4, 0]);
  봄('🔴 마감 지난 것은 하나뿐이다 — 어제 마감(h3)', 아무것도.hwLate, 1);
  봄('🔴 19일 마감은 안 센다 (오늘은 13일)', 만들기(['h3']).hwLate, 0);
  봄('🔴 «오늘 마감»도 아직 안 센다 — 오늘이 지나야 지난 것이다', 만들기(['h3']).hwLate, 0);
  봄('🔴 마감이 없는 과제는 영영 안 센다 (격자의 붉은 «미제출»과 같은 잣대)',
    [만들기(['h3']).hwLate, 만들기(['h3', 'h4']).hwLate], [0, 0]);
  봄('어제 것을 하면 0이 된다', 만들기(['h3']).hwLate, 0);
  봄('⚠ hwDone·hwTotal 은 그대로다 — 명단의 「과제 n/m」은 전부 이야기다',
    [만들기(['h3']).hwDone, 만들기(['h3']).hwTotal], [1, 4]);
  /* 어제·그제 둘이 밀리면 둘로 센다 */
  DATA.assignments.push({ id: 'h5', classId: 'c1', title: '그제 마감', createdAt: '2026-09-04', dueDate: '2026-09-11' });
  봄('밀린 것이 둘이면 둘', 만들기([]).hwLate, 2);
  DATA.assignments.pop();
}

/* ═══ ② 신호 — 그 수로만 켜진다 ═══ */
console.log(NL + '② 신호가 그 수로만 켜지는가' + NL);
{
  const S = new Function('signalRules', 'SIGNAL_DEFAULTS',
    lift('signalOf') + NL + 'return signalOf;')(
    () => ({ absent: 2, attPct: 80, drop: 15, wrong: 3, vidHeavy: 50, vidWarn: 70, vidLight: 80 }), {});
  const 기본 = { att8: [], attPct: null, scores: [], drop: 0, hwDone: 0, hwTotal: 0, hwLate: 0,
    wrongLeft: 0, vidPct: null, withdrawn: false };
  const 신호 = x => { const r = S(Object.assign({}, 기본, x)); return r ? r.rules.map(y => y.name) : []; };
  봄('🔴 마감 전 과제만 있으면 아무 신호도 없다', 신호({ hwTotal: 3, hwDone: 0, hwLate: 0 }), []);
  봄('🔴 마감이 지난 것이 하나라도 있으면 켜진다', 신호({ hwTotal: 3, hwDone: 0, hwLate: 1 }), ['과제 누락']);
  /* ⚠ 덫을 확인하려고 망가뜨리면 신호가 아예 안 서는 판이 나온다 — 그때 터지면
     어느 덫이 문 것인지 안 보인다. «없다»를 값으로 받아 틀렸다고 말한다. */
  const 첫줄 = x => { const r = S(Object.assign({}, 기본, x)); return (r && r.rules[0]) || { why: '(신호 없음)', heavy: null }; };
  봄('근거를 «지난 것»으로 적는다', 첫줄({ hwTotal: 5, hwDone: 2, hwLate: 2 }).why, '마감 지난 과제 <b>2건</b> 미제출');
  봄('🔴 근거에 «3/5» 같은 전체 수를 안 적는다 (마감 전 것까지 탓하는 것으로 읽힌다)',
    /2\/5|3\/5/.test(첫줄({ hwTotal: 5, hwDone: 2, hwLate: 2 }).why), false);
  봄('과제 누락은 «경미»다 (등급을 혼자 올리지 않는다)', (() => {
    const r = S(Object.assign({}, 기본, { hwLate: 9 }));
    return [첫줄({ hwLate: 9 }).heavy, r && r.grade];
  })(), [false, 'g']);
  /* 줄 세우기 점수 */
  봄('🔴 마감 전 과제는 줄 세우기 점수에도 안 들어간다', [
    S(Object.assign({}, 기본, { hwTotal: 9, hwDone: 0, hwLate: 0 })),
    S(Object.assign({}, 기본, { hwTotal: 9, hwDone: 0, hwLate: 1 })).score,
  ], [null, 3]);
  봄('밀린 수만큼 점수가 는다', S(Object.assign({}, 기본, { hwLate: 4 })).score, 12);
}

/* ═══ ③ 화면에서 그 수를 쓰는가 ═══ */
console.log(NL + '③ 세는 자리가 전부 그 수를 보는가' + NL);
{
  봄('🔴 명단의 붉은 칸', lift('teacherRosterHTML').includes("st.hwLate ? 'cau' : ''"), true);
  봄('명단의 거르개', lift('rosterModel').includes('stats[s.studentId].hwLate > 0'), true);
  봄('조교 화면의 칩', lift('assistantRosterHTML').includes('r.st.hwLate > 0'), true);
  봄('조교 화면의 거르개', lift('assistantRosterHTML').includes("flag==='hw'    ? r.st.hwLate > 0"), true);
  /* 🔴 옛 잣대로 «문제인가»를 묻는 자리가 한 곳도 안 남았는가.
     ⚠ **닻을 html 전체에 걸면 까닭을 적어 둔 주석이 물린다** — 오늘 여섯 번째로 밟은 함정이다.
       «묻는 자리»는 세 함수뿐이므로 그 몸통만 본다. */
  /* ⚠ 주석을 «줄 머리»로 거르면 안 된다 — 여러 줄 주석의 **가운데 줄은 그냥 글**이라 안 걸린다
     (처음에 그렇게 해서 또 통과했다). 덩이째 벗긴다. */
  const 주석벗기기 = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  const 묻는자리 = 주석벗기기([lift('rosterStats'), lift('signalOf'), lift('rosterModel'),
    lift('teacherRosterHTML'), lift('assistantRosterHTML')].join(NL));
  봄('🔴 옛 잣대가 «코드»에 안 남았다',
    /hwDone\s*<\s*(st\.|r\.st\.)?hwTotal|hwDone\s*<\s*stats\[/.test(묻는자리), false);
  /* 숫자 자체(n/m)는 그대로 보여야 한다 — 그것까지 지우면 «몇 개 냈나»를 못 본다 */
  봄('⚠ 「n/m」 숫자는 그대로 보인다', lift('teacherRosterHTML').includes("st.hwDone + '/' + st.hwTotal"), true);
  봄('설정의 설명도 같은 말을 한다', html.includes('<b>마감이 지났는데</b> 아직 안 낸 과제가'), true);
  봄('그 줄의 고정 값 딱지도', html.includes('마감 지난 미제출 1건부터'), true);
}

console.log(NL + (fail ? '🔴 ' + fail + '개 실패 · ' : '✓ 전부 통과 · ') + pass + '개' + NL);
process.exit(fail ? 1 : 0);
