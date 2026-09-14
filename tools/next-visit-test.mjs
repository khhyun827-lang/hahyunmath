// 학생 홈 — D-day 는 «시험기간 시작일», 「다음 수업」자리에 직보 일정표가 선다 (2026-09-14)
//
//   node tools/next-visit-test.mjs
//
// 사용자 — 「학생페이지 처음 나오는 D-day 를 수학시험일 기준이 아니라 학교별 시험 시작일로부터 D-day 로
//   해주고, 수학 직보는 그 시기가 되면 다음 수업으로 뜨던 부분에 직보로 뜨면 되지 않을까?」
//
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
  let d = 0;
  for (let j = html.indexOf('{', at); j < html.length; j++) {
    if (html[j] === '{') d++;
    else if (html[j] === '}') { d--; if (!d) return html.slice(at, j + 1); }
  }
  throw new Error(name + ' 의 끝을 못 찾았습니다');
}
function liftConst(name) {
  const at = html.indexOf('const ' + name + ' = ');
  if (at < 0) throw new Error(name + ' 를 못 찾았습니다');
  return html.slice(at, html.indexOf(';', at) + 1);
}
const 알맹이 = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

let pass = 0, fail = 0;
const 봄 = (무엇, 나온것, 나와야) => {
  const ok = JSON.stringify(나온것) === JSON.stringify(나와야);
  if (ok) pass++; else fail++;
  console.log((ok ? '  ✓ ' : '  🔴 ') + 무엇 +
    (ok ? '' : NL + '      나온 것 ' + JSON.stringify(나온것) + NL + '      나와야 ' + JSON.stringify(나와야)));
};

/* ═══ ① D-day — 시험기간 시작일 ═══ */
console.log(NL + '① D-day 는 시험기간 «시작일»까지다' + NL);
{
  const 판 = (today, dates) => new Function('todayStr', 'examDatesOf',
    lift('examDdayOf') + NL + 'return examDdayOf;')(() => today, () => dates);
  const 시험 = { start: '2026-10-01', end: '2026-10-07', math: '2026-10-05' };
  const a = 판('2026-09-28', 시험)('광남고', '1');
  봄('🔴 D-day 가 시작일(10/1)까지다 — 수학(10/5)이 아니다', [a.state, a.days, a.target, a.basis], ['before', 3, '2026-10-01', 'start']);
  봄('수학 시험일은 따로 들고 간다', a.math, '2026-10-05');
  const b = 판('2026-10-03', 시험)('광남고', '1');
  봄('🔴 시작일이 지나면 «시험 중»이다 (예전엔 수학까지 D-2 였다)', [b.state, b.mathToday], ['during', false]);
  const c = 판('2026-10-05', 시험)('광남고', '1');
  봄('수학 시험 당일은 mathToday', [c.state, c.mathToday], ['during', true]);
  const d = 판('2026-10-08', 시험)('광남고', '1');
  봄('끝나면 after', d.state, 'after');
  const e = 판('2026-09-28', { math: '2026-10-05' })('광남고', '1');
  봄('시작일이 없을 때만 수학 시험일로 물러난다', [e.basis, e.days], ['math', 7]);
  봄('날짜가 없으면 null', 판('2026-09-28', null)('광남고', '1'), null);
}

/* ═══ ② 다음에 가는 날 ═══ */
console.log(NL + '② 「다음 수업」자리 — 시험 창에는 직보 일정표가 선다' + NL);
{
  /* 오늘 = 2026-09-28(월). 반은 화·목. 시험 10/1(목)~10/7(수), 수학 10/5(월).
     달력이 정규 수업을 가리는 창 = 9/30 ~ 10/7. */
  const 판 = (o) => {
    o = o || {};
    const today = o.today || '2026-09-28';
    const plan = o.plan || {};
    const dates = o.dates === undefined ? { start: '2026-10-01', end: '2026-10-07', math: '2026-10-05' } : o.dates;
    const offDays = o.offDays || [];
    const F = new Function('DATA', 'todayStr', 'planCellsOfStudent', 'planLabel', 'parseScheduleDays', 'ymdLocal',
      'movedInto', 'offDayFor', 'examDatesOf', 'dateShift', 'Date',
      liftConst('PLAN_VISIT_KINDS') + NL + lift('stuClassOffSpan') + NL + lift('stuExamSpan') + NL
      + lift('stuNextVisit') + NL + 'return stuNextVisit;')(
      { classes: [{ id: 'c1', name: '고1 0.5B', schedule: '화·목 17:00' }] },
      () => today, () => plan,
      (c) => ({ jikbo: '직보', off: '등원X', extra: '보충', start: '등원시작', exam: '수학시험', maybe: '가능하면 ' }[c.k] || '') + (c.t || ''),
      () => [2, 4],
      (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'),
      (cid, date) => offDays.find(x => x.moveTo === date) || null,
      (cid, date) => offDays.find(x => x.date === date) || null,
      () => dates,
      (d, n) => { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); },
      /* 가짜 Date — new Date() 가 «오늘» 을 주게 한다(다른 호출은 그대로) */
      class extends Date { constructor(...a) { if (a.length) super(...a); else super(today + 'T00:00:00'); } });
    return F({ sid: 's1', classId: 'c1', me: { school: '광남고', grade: '1' } });
  };

  const 없음 = 판({ dates: null });
  봄('시험도 일정표도 없으면 그냥 다음 수업(화 9/29)', [없음.kind, 없음.date, 없음.dow], ['class', '2026-09-29', 2]);

  const 창 = 판({ today: '2026-09-30' });
  봄('🔴 시험 창(9/30~10/7)에는 정규 수업을 말하지 않는다 — 다음은 10/8(목)', [창.kind, 창.date], ['class', '2026-10-08']);

  const 직보 = 판({ today: '2026-09-30', plan: { '2026-10-04': { k: 'jikbo', t: '2시' }, '2026-09-30': { k: 'off' } } });
  봄('🔴 일정표의 「직보2시」가 다음 수업 자리에 선다', [직보.kind, 직보.date, 직보.label, 직보.k], ['plan', '2026-10-04', '직보2시', 'jikbo']);

  const 등원X = 판({ plan: { '2026-09-29': { k: 'off' } } });
  봄('🔴 「등원X」가 찍힌 날의 정규 수업은 건너뛴다 — 다음은 10/8', [등원X.kind, 등원X.date], ['class', '2026-10-08']);
  봄('「등원X」 자체는 «가는 날»이 아니다', 등원X.kind === 'plan', false);

  const 같은날 = 판({ plan: { '2026-09-29': { k: 'extra', t: '10시' } } });
  봄('같은 날이면 일정표가 이긴다 (보충10시)', [같은날.kind, 같은날.label], ['plan', '보충10시']);

  const 수업먼저 = 판({ plan: { '2026-10-04': { k: 'jikbo', t: '2시' } } });
  봄('정규 수업(9/29)이 직보(10/4)보다 이르면 수업이 먼저다', [수업먼저.kind, 수업먼저.date], ['class', '2026-09-29']);

  const 지난것 = 판({ today: '2026-10-09', plan: { '2026-10-04': { k: 'jikbo', t: '2시' } } });
  봄('지난 일정표 칸은 안 본다', [지난것.kind, 지난것.date], ['class', '2026-10-13']);

  const 휴강 = 판({ dates: null, offDays: [{ date: '2026-09-29', moveTo: '2026-09-30', label: '추석' }] });
  봄('휴강은 건너뛰고 옮겨 온 보강이 «원래 요일»의 시간으로 선다', [휴강.kind, 휴강.date, 휴강.보강, 휴강.dow], ['class', '2026-09-30', true, 2]);

  const 등원시작 = 판({ today: '2026-10-08', plan: { '2026-10-08': { k: 'start' } } });
  봄('「등원시작」이 수업 날과 겹치면 수업(시간·강의실)이 이긴다', [등원시작.kind, 등원시작.date], ['class', '2026-10-08']);
  const 등원시작만 = 판({ today: '2026-10-09', plan: { '2026-10-09': { k: 'start' } } });
  봄('수업이 없는 날의 「등원시작」은 그대로 선다', [등원시작만.kind, 등원시작만.label], ['plan', '등원시작']);
  const 시험칸 = 판({ plan: { '2026-09-29': { k: 'exam' } } });
  봄('「수학시험」칸은 오는 날이 아니다 — 그 날 수업이 있으면 수업', [시험칸.kind, 시험칸.date], ['class', '2026-09-29']);
}

/* ═══ ③ 화면의 닻 ═══ */
console.log(NL + '③ 화면이 그것을 쓴다' + NL);
{
  const 홈 = 알맹이(lift('stuHomeHTML'));
  봄('🔴 홈이 stuNextVisit 을 쓴다', 홈.includes('const next = stuNextVisit(c);'), true);
  봄('🔴 직보 칸은 알약(pl-p)으로 그린다', 홈.includes('class="pl-p p-${escHtml(next.k)}"'), true);
  봄('머리가 「다음 등원」으로 바뀐다', 홈.includes("next.kind==='plan' ? '다음 등원' : '다음 수업'"), true);
  봄('🔴 D-day 카드가 수학 시험일을 따로 말한다', 홈.includes("dd.basis==='start' && dd.math ? `<span class=\"sub\">수학 시험 "), true);
  봄('🔴 예전 「오늘 시험」 말은 안 남았다', 홈.includes("'오늘 시험'"), false);
}

console.log(NL + (fail ? `🔴 ${fail}개 실패 · ${pass + fail}개` : `✓ 전부 통과 · ${pass}개`));
process.exit(fail ? 1 : 0);
