// 직보 일정표 — 화면 없이 재 본다 (2026-09-08)
//
//   node tools/exam-plan-test.mjs
//
// 🔴 **이 기능의 값은 «강사가 찍으면 학생 달력에 뜬다»는 한 줄이다.** 그런데 그 한 줄은
//   화면으로 재기가 어렵다 — 학생으로 로그인해서 달을 넘겨 봐야 하고, 시즌을 넘기는
//   경우는 아예 못 본다. 그래서 여기서 «찍기 → 그 학생의 날짜별 목록»까지를 붙든다.
//
// 🔴 **함수를 여기에 옮겨 적지 않는다.** index.html 에서 그대로 떠 온다 —
//   옮겨 적으면 검사는 통과하는데 화면은 틀리는 일이 생긴다.

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
function 떠오기(시작, 끝표){
  const a = html.indexOf(시작);
  if(a < 0) throw new Error('못 찾음: ' + 시작);
  const b = html.indexOf(끝표, a);
  return html.slice(a, b + 끝표.length);
}

let pass = 0, fail = 0;
const 봄 = (무엇, 나온것, 나와야) => {
  const ok = JSON.stringify(나온것) === JSON.stringify(나와야);
  if(ok){ pass++; console.log('  ✓ ' + 무엇); }
  else { fail++; console.log(`  ✗ ${무엇}${NL}      나온 것: ${JSON.stringify(나온것)}${NL}      나와야:  ${JSON.stringify(나와야)}`); }
};

/* ⚠ `planSaveSoon` 은 «저장을 모아서 미루는» 자리라 여기서는 세기만 한다.
   진짜를 부르면 dbSet 과 render 가 딸려 온다 — 그 둘은 이 검사의 관심사가 아니다. */
const 뼈대 = (몸) =>
  '  let 저장부름 = 0;' + NL +
  '  function planSaveSoon(){ 저장부름++; state.planDirty = 1; }' + NL +
  떠오기('const PLAN_KINDS = [', '];') + NL +
  떠오기('const PLAN_KIND_MAP =', ';') + NL +
  lift('planLabel') + NL + lift('examPlanAll') + NL + lift('examPlanCur') + NL +
  lift('planCellsOfStudent') + NL + lift('planCell') + NL +
  lift('planSetRange') + NL + lift('planRange') + NL + lift('planAutoRange') + NL +
  lift('dateShift') + NL + lift('planDaysOf') + NL +
  (몸 || lift('planSetCell')) + NL + lift('planSeed') + NL +
  lift('seasonKeyOf') + NL + lift('curSeasonKey');

const 만들기 = (state, DATA, 몸) => new Function('state', 'DATA', 'currentSeason', 'examDatesOf',
  뼈대(몸) + NL + `return { planLabel, planCell, planSetCell, planSetRange, planRange,
    planAutoRange, planCellsOfStudent, planDaysOf, dateShift, planSeed, curSeasonKey,
    examPlanCur, 저장부름: () => 저장부름, PLAN_KIND_MAP };`)(
  state, DATA,
  () => (state.season && state.season.name) || '2학기 중간',
  (school, grade) => ((state.examRanges || {}).dates || {})[school]
    ? ((state.examRanges || {}).dates || {})[school][grade] || null : null);

const 판 = (더) => Object.assign({
  examPlan: {byKey: {}},
  season: {name: '2학기 중간', startedAt: '2026-08-03'},
  examRanges: {dates: {}},
}, 더 || {});

// ── ① 말 짓기 ────────────────────────────────────────────────────────
console.log(NL + '① 「종류 + 시간」으로 말을 짓는다' + NL);
{
  const F = 만들기(판(), {students: []});
  봄('직보 + 2시 → 붙여 쓴다', F.planLabel({k:'jikbo', t:'2시'}), '직보2시');
  봄('보충 + 10시 → 붙여 쓴다', F.planLabel({k:'extra', t:'10시'}), '보충10시');
  /* 🔴 사용자의 엑셀이 이 하나만 띄어 쓴다. 붙이면 「가능하면5시」가 되어 낯설다. */
  봄('🔴 가능하면 + 5시 → 띄어 쓴다', F.planLabel({k:'maybe', t:'5시'}), '가능하면 5시');
  봄('시간을 안 받는 종류는 시간을 버린다', F.planLabel({k:'off', t:'3시'}), '등원X');
  봄('시간이 비면 종류만', F.planLabel({k:'jikbo', t:''}), '직보');
  봄('없는 종류는 빈 글자', F.planLabel({k:'없음'}), '');
  봄('빈 칸도 빈 글자', F.planLabel(null), '');
}

// ── ② 날짜 셈 ────────────────────────────────────────────────────────
console.log(NL + '② 날짜 — KST 에서 하루가 깎이면 안 된다' + NL);
{
  const F = 만들기(판(), {students: []});
  /* 🔴 로컬 자정으로 만든 뒤 toISOString() 하면 KST 에서 하루가 깎인다.
     이 저장소가 examDdayOf 머리말에 적어 둔 함정이라, 여기서도 붙든다. */
  봄('🔴 하루 뒤', F.dateShift('2026-06-24', 1), '2026-06-25');
  봄('🔴 하루 앞', F.dateShift('2026-06-24', -1), '2026-06-23');
  봄('달을 넘는다', F.dateShift('2026-06-30', 1), '2026-07-01');
  봄('해를 넘는다', F.dateShift('2026-12-31', 1), '2027-01-01');
  봄('날짜가 아니면 빈 글자', F.dateShift('아무말', 1), '');
  봄('날짜 줄을 편다', F.planDaysOf('2026-06-22', '2026-06-25'),
     ['2026-06-22','2026-06-23','2026-06-24','2026-06-25']);
  봄('거꾸로면 빈 줄', F.planDaysOf('2026-06-25', '2026-06-22'), []);
  /* ⚠ 날짜를 잘못 치면 화면이 통째로 멎는다 — 그래서 60일에서 끊는다. */
  봄('⚠ 60일에서 끊는다', F.planDaysOf('2026-01-01', '2027-01-01').length, 60);
}

// ── ③ 찍고 지운다 ────────────────────────────────────────────────────
console.log(NL + '③ 칸을 찍고 지운다' + NL);
{
  const st = 판();
  const F = 만들기(st, {students: []});
  F.planSetCell('t1', '2026-06-24', 'jikbo', '2시');
  봄('찍힌다', F.planCell('t1','2026-06-24'), {k:'jikbo', t:'2시'});
  봄('저장을 미뤄 부른다', F.저장부름(), 1);
  F.planSetCell('t1', '2026-06-25', 'off', '3시');
  봄('시간을 안 받는 종류는 시간을 안 담는다', F.planCell('t1','2026-06-25'), {k:'off'});
  F.planSetCell('t1', '2026-06-24', '');
  봄('지워진다', F.planCell('t1','2026-06-24'), undefined);
  F.planSetCell('t1', '2026-06-25', '');
  /* 🔴 빈 껍데기가 남으면 «아무것도 안 적힌 학생»이 문서에 쌓인다. */
  봄('🔴 마지막 칸을 지우면 학생 줄째로 걷힌다',
     Object.keys(F.examPlanCur().cells || {}), []);
  봄('없는 종류는 안 받는다', F.planSetCell('t1','2026-06-24','없는종류'), false);
}

// ── ④ 학생 달력이 보는 것 ────────────────────────────────────────────
console.log(NL + '④ 🔴 학생 달력 — 시즌을 넘겨도 안 사라진다' + NL);
{
  const st = 판();
  const F = 만들기(st, {students: []});
  F.planSetCell('t1', '2026-06-24', 'jikbo', '2시');
  F.planSetCell('t2', '2026-06-24', 'off');
  봄('내 것만 온다', Object.keys(F.planCellsOfStudent('t1')), ['2026-06-24']);
  봄('남의 것은 안 온다', F.planCellsOfStudent('t1')['2026-06-24'], {k:'jikbo', t:'2시'});
  봄('아무것도 안 적힌 학생은 빈 것', F.planCellsOfStudent('t9'), {});

  /* 🔴 **여기가 이 검사의 핵심이다.** 「등원시작」은 대개 시험이 끝난 뒤에 오는 날인데,
     그때쯤 강사는 시즌을 이미 넘긴다. 시즌을 가려 읽으면 **그 순간 학생 달력에서
     등원시작이 통째로 사라진다** — 화면은 멀쩡해서 아무도 못 알아챈다. */
  st.season = {name: '2학기 기말', startedAt: '2026-10-01'};
  봄('🔴 시즌을 넘겨도 지난 시즌에 찍은 것이 그대로 온다',
     F.planCellsOfStudent('t1')['2026-06-24'], {k:'jikbo', t:'2시'});
  봄('🔵 새 시즌은 아직 비어 있다', Object.keys(F.examPlanCur().cells || {}), []);
  F.planSetCell('t1', '2026-10-08', 'start');
  봄('새 시즌에 찍은 것도 같이 온다',
     Object.keys(F.planCellsOfStudent('t1')).sort(), ['2026-06-24','2026-10-08']);
}

// ── ⑤ 밑그림 ─────────────────────────────────────────────────────────
console.log(NL + '⑤ 밑그림 — «확실한 것»만 깐다' + NL);
{
  const st = 판({examRanges: {dates: {
    '광남고': {'고1': {start:'2026-06-24', end:'2026-06-26', math:'2026-06-25'}},
    '자양고': {'고1': {start:'2026-06-29', end:'2026-07-01', math:'2026-06-29'}},
  }}});
  const DATA = {students: [
    {studentId:'a', name:'김승우', school:'광남고', grade:'고1'},
    {studentId:'b', name:'김주아', school:'자양고', grade:'고1'},
    {studentId:'c', name:'노성민', school:'대원고', grade:'고1'},   // 시험 일정이 없다
  ]};
  const F = 만들기(st, DATA);
  봄('날짜 줄을 시험 일정에서 낸다 — 앞뒤로 이틀',
     F.planAutoRange(), {from:'2026-06-22', to:'2026-07-03'});
  const r = F.planSeed();
  봄('수학시험과 전날 직보, 둘씩 깔았다', r.깐것, 4);
  봄('🔴 시험 일정이 없는 학생은 못 깐다 — 그 수를 말한다', r.없음, 1);
  봄('수학 시험일에 「수학시험」', F.planCell('a','2026-06-25'), {k:'exam'});
  봄('그 전날에 「직보2시」', F.planCell('a','2026-06-24'), {k:'jikbo', t:'2시'});
  봄('학교가 다르면 날도 다르다', F.planCell('b','2026-06-28'), {k:'jikbo', t:'2시'});
  /* 🔴 사용자의 표를 보면 같은 반 같은 날에 한 학생은 「등원X」, 다른 학생은 「가능하면 5시」다.
     제 시험이 가까운가 먼가로 갈리는 «판단»이라 자동으로 찍으면 조용히 틀린다. */
  봄('🔴 등원X·보충·상담진행 같은 것은 짐작하지 않는다',
     F.planCell('a','2026-06-23'), undefined);

  /* 🔴 다시 깔아도 사람이 정한 것이 이겨야 한다. */
  F.planSetCell('a', '2026-06-24', 'off');
  const r2 = F.planSeed();
  봄('🔴 손으로 고친 칸은 안 건드린다', F.planCell('a','2026-06-24'), {k:'off'});
  봄('건너뛴 수를 말한다', r2.건너뜀 >= 1, true);
  봄('새로 깔 것이 없다', r2.깐것, 0);
}

// ── ⑥ 망가뜨려 무는지 ────────────────────────────────────────────────
console.log(NL + '⑥ ⚠ 망가뜨려 무는지 본다' + NL);
{
  /* 「이미 적힌 칸은 그대로 둔다」를 빼면 ⑤의 그 검사가 도로 통과하면 안 된다. */
  const 지키는줄 = 'if(planCell(sid, date)){ 건너뜀++; return; }';
  const 원본 = lift('planSetCell');
  봄('⚠ 지키는 줄이 planSeed 에 실제로 있다', lift('planSeed').includes(지키는줄), true);

  const st = 판({examRanges: {dates: {'광남고': {'고1': {math:'2026-06-25'}}}}});
  const DATA = {students: [{studentId:'a', school:'광남고', grade:'고1'}]};
  const F = 만들기(st, DATA);
  F.planSetRange('2026-06-22', '2026-06-30');
  F.planSetCell('a', '2026-06-24', 'off');
  F.planSeed();
  봄('멀쩡할 때는 손으로 찍은 것이 남는다', F.planCell('a','2026-06-24'), {k:'off'});

  /* 이번엔 그 줄을 빼고 같은 것을 시킨다 — 손으로 찍은 것이 밑그림에 덮여야 «검사가 문다». */
  const 망친 = html.slice(html.indexOf('function planSeed('));
  const 몸끝 = (() => { let d = 0; const s0 = 망친.indexOf('{');
    for(let j = s0; j < 망친.length; j++){ if(망친[j]==='{') d++; else if(망친[j]==='}'){ d--; if(!d) return j+1; } } })();
  const 망친planSeed = 망친.slice(0, 몸끝).split(지키는줄).join('');
  const F2 = new Function('state','DATA','currentSeason','examDatesOf',
    뼈대(원본).replace(lift('planSeed'), 망친planSeed) + NL +
    'return { planCell, planSetCell, planSetRange, planSeed };')(
    판({examRanges: {dates: {'광남고': {'고1': {math:'2026-06-25'}}}}}),
    DATA, () => '2학기 중간',
    (school, grade) => ({'광남고': {'고1': {math:'2026-06-25'}}})[school]
      ? ({'광남고': {'고1': {math:'2026-06-25'}}})[school][grade] : null);
  F2.planSetRange('2026-06-22', '2026-06-30');
  F2.planSetCell('a', '2026-06-24', 'off');
  F2.planSeed();
  봄('⚠ 지키는 줄을 빼면 손으로 찍은 것이 덮인다(=검사가 문다)',
     F2.planCell('a','2026-06-24'), {k:'jikbo', t:'2시'});
}

// ── ⑦ 달력이 같은 말을 두 번 하지 않는가 ────────────────────────────
console.log(NL + '⑦ 🔴 학생 달력 — 「수학 시험」을 두 번 말하지 않는다' + NL);
{
  /* 🔴 만들면서 화면에서 봤다 — 6/25 에 ②의 「수학 시험」과 직보표의 「수학시험」이
     나란히 떴다. 표에는 그 칸이 있어야 하지만(강사가 표를 읽는 기준점이다)
     학생 달력에는 이미 적혀 있다.
   🔴 **갈래로 뭉뚱그려 빼면 안 된다** — 시험 일정을 안 적고 표에만 찍은 학생은
     달력에서 그 날이 통째로 사라진다. «시험 일정이 그 날을 수학 시험일이라 말할 때»만 뺀다.
   ⚠ `stuMonthEvents` 는 통째로 떠 오기에 너무 크고 딸린 것이 많다 —
     그래서 여기서는 **그 줄이 실제로 그 꼴인지**를 소스에서 붙든다. */
  const 몸 = lift('stuMonthEvents');
  봄('🔴 겹침을 막는 줄이 있다',
     몸.includes("if(내직보[date].k === 'exam' && d && d.math === date) continue;"), true);
  봄('🔴 갈래만 보고 빼지 않는다 — 날짜를 함께 본다',
     /내직보\[date\]\.k === 'exam' && d && d\.math === date/.test(몸), true);
  봄('⑦ 덩이가 학생 것만 가져온다', 몸.includes('planCellsOfStudent(c.sid)'), true);
  봄('직보는 제 갈래로 들어간다', 몸.includes("kind: 'plan'"), true);

  /* CAL_KINDS 에 갈래가 실제로 있어야 색이 붙는다 — 없으면 조용히 «색 없음»이 된다
     (이 저장소가 --warn·--info 로 한 번 겪은 함정이다). */
  const kinds = 떠오기('const CAL_KINDS = {', NL + '};');
  봄('⚠ CAL_KINDS 에 plan 갈래가 있다', /plan:\s*\{/.test(kinds), true);
  봄('⚠ ds.css 에 있는 색만 쓴다(gone)', kinds.includes("var(--gone)"), true);
}

console.log(`${NL}  ${fail ? '🔴' : '✅'} ${pass} 통과 · ${fail} 실패${NL}`);
process.exit(fail ? 1 : 0);
