// 학교별 시즌 (2026-10-03 · 2단계 — 사용자 「학교별로 자동으로 넘기자」)
//
//   node tools/school-season-test.mjs
//
// 재는 것 — ① 학년도는 3월에 시작한다 ② 학교·학년마다 «수학 시험일이 지나면» 다음 시험 ③ 날짜가 없으면 기본 날
//   ④ 옛 문서(season · dates · bySchool · 지난 기록)를 새 칸으로 옮겨 본다 ⑤ 옛 열쇠 «시작일|시즌» → «학년도|시즌»
//   ⑥ 지금 범위는 그 학교의 지금 시험 칸 · 방학은 과목 전체
// ⚠ 함수를 옮겨 적지 않는다 — index.html 의 «학교별 시즌» 층을 통째로 떠 온다.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/\r\n/g, '\n');
const NL = '\n';
function lift(name) {
  let at = html.indexOf('function ' + name + '(');
  if (at < 0) throw new Error(name + ' 를 못 찾았습니다');
  let depth = 0;
  for (let j = html.indexOf('{', at); j < html.length; j++) {
    if (html[j] === '{') depth++;
    else if (html[j] === '}') { depth--; if (!depth) return html.slice(at, j + 1); }
  }
}
const 층 = html.slice(html.indexOf('const EXAM_SLOTS ='), html.indexOf('/* 이 학생이 지금 배우는 과목'));
const 이름들 = ['schoolYearOf', 'examSeasonOf', 'examYearsOf', 'examDatesOf', 'examDatesAllOf', 'planExamDatesOf', 'examWindowOf', 'rangeChapters', 'examKeysNormalize',
  'currentSeason', 'examDefaultNext'];
const 상자 = (state, 오늘, 학생들) => new Function('state', 'DATA', 'todayStr', 'isWithdrawn', 'dbGet',
  'UNIT_CHAPTERS', 'SEASON_SPLIT', 'isVacationSeason',
  층 + NL + lift('examDatesOf') + NL + lift('examDatesAllOf') + NL + lift('planExamDatesOf') + NL + lift('examWindowOf') + NL
  + lift('seasonKeyOf') + NL + lift('examKeysNormalize') + NL
  + 'return { ' + 이름들.join(', ') + ' };')(
  state, { students: 학생들 || [] }, () => 오늘, () => false, async () => null,
  { 대수: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'] }, { 대수: 6 }, n => /방학/.test(n));

let pass = 0, fail = 0;
const 봄 = (무엇, 나온것, 나와야) => {
  const ok = JSON.stringify(나온것) === JSON.stringify(나와야);
  if (ok) pass++; else fail++;
  console.log((ok ? '  ✓ ' : '  🔴 ') + 무엇 + (ok ? '' : NL + '      나온 것 ' + JSON.stringify(나온것) + NL + '      나와야 ' + JSON.stringify(나와야)));
};

/* ① 학년도 */
{
  const F = 상자({ examRanges: { migrated: true, years: {} } }, '2026-10-03');
  봄('학년도 — 3월부터 그 해 · 1·2월은 앞 해', ['2026-03-01', '2026-12-31', '2027-01-10', '2027-02-28'].map(F.schoolYearOf), ['2026', '2026', '2026', '2026']);
}

/* ② 학교마다 따로 넘어간다 */
console.log(NL + '② 학교마다 «수학 시험일이 지나면» 다음 시험' + NL);
{
  const years = { '2026': {
    광남고: { '2': { '2-mid': { start: '2026-10-05', end: '2026-10-09', math: '2026-10-07' } } },
    대원고: { '2': { '2-mid': { start: '2026-09-28', end: '2026-10-02', math: '2026-09-30' },
                    '2-fin': { start: '2026-12-01', math: '2026-12-03' } } } } };
  const F = 상자({ examRanges: { migrated: true, years } }, '2026-10-03');
  봄('🔴 광남(수학 10/7) 은 아직 2학기 중간', F.examSeasonOf('광남고', '2').name, '2학기 중간');
  봄('🔴 대원(수학 9/30) 은 벌써 2학기 기말', F.examSeasonOf('대원고', '2').name, '2학기 기말');
  봄('수학 시험 «당일»은 아직 그 시험', 상자({ examRanges: { migrated: true, years } }, '2026-10-07').examSeasonOf('광남고', '2').name, '2학기 중간');
  봄('대원 D-day 날짜는 기말 것', (F.examDatesOf('대원고', '2') || {}).math, '2026-12-03');
  const 겨울 = 상자({ examRanges: { migrated: true, years } }, '2026-12-04');
  봄('기말 수학까지 지나면 겨울방학 · 다음은 다음 해 1학기 중간', [겨울.examSeasonOf('대원고', '2').name, 겨울.examSeasonOf('대원고', '2').next], ['겨울방학', { year: '2027', slot: '1-mid' }]);
  봄('1·2월은 겨울방학', 상자({ examRanges: { migrated: true, years } }, '2027-02-10').examSeasonOf('광남고', '2').name, '겨울방학');
}

/* ③ 날짜가 없으면 기본 날 */
console.log(NL + '③ 날짜가 없으면 기본 날' + NL);
{
  const G = d => 상자({ examRanges: { migrated: true, years: {} } }, d).examSeasonOf('어디고', '1').name;
  봄('3/2 → 1학기 중간 · 6/1 → 1학기 기말 · 8/10 → 여름방학', [G('2026-03-02'), G('2026-06-01'), G('2026-08-10')], ['1학기 중간', '1학기 기말', '여름방학']);
  봄('9/1 → 2학기 중간 · 11/5 → 2학기 기말', [G('2026-09-01'), G('2026-11-05')], ['2학기 중간', '2학기 기말']);
  봄('기본 «다음 시험»도 같은 셈', 상자({ examRanges: {} }, '2026-08-10').examDefaultNext('2026-08-10'), { year: '2026', slot: '2-mid' });
}

/* ④ 옛 문서 옮겨 보기 */
console.log(NL + '④ 옛 문서를 새 칸으로' + NL);
{
  const state = {
    season: { name: '2학기 중간', startedAt: '2026-09-01' },
    examRanges: { season: '2학기 중간', dates: { 광남고: { '2': { start: '2026-10-05', math: '2026-10-07' } } },
                  bySchool: { 광남고: { '2': { 대수: ['a', 'b'] } } } },
    examHistory: { items: [
      { season: '1학기 기말', startedAt: '2026-05-20', dates: { 광남고: { '2': { math: '2026-07-01' } } }, bySchool: {} },
      { season: '여름방학', startedAt: '2026-07-20', dates: {}, bySchool: { 광남고: { '2': { 대수: ['g'] } } } },
      { season: '겨울방학', startedAt: '2026-12-26', dates: { 광남고: { '2': { math: '2027-04-27' } } }, bySchool: {} },
    ] },
  };
  const F = 상자(state, '2026-10-03');
  const y = F.examYearsOf(state.examRanges);
  봄('🔴 지금 시즌(2학기 중간) → 2026 › 2-mid', y['2026'].광남고['2']['2-mid'].math, '2026-10-07');
  봄('🔴 지금 범위도 같이', y['2026'].광남고['2']['2-mid'].ranges.대수, ['a', 'b']);
  봄('지난 기록 1학기 기말 → 2026 › 1-fin', y['2026'].광남고['2']['1-fin'].math, '2026-07-01');
  봄('🔴 지금 것이 지난 기록(여름방학 → 2-mid 몫)을 이긴다', y['2026'].광남고['2']['2-mid'].ranges.대수, ['a', 'b']);
  봄('겨울방학 기록 → 다음 해 1학기 중간', y['2027'].광남고['2']['1-mid'].math, '2027-04-27');
  봄('🔴 옛 문서를 고치지 않는다(읽기만)', [state.examRanges.migrated, state.examRanges.years], [undefined, undefined]);
  const 빈시즌 = 상자({ examRanges: { dates: { 대원고: { '1': { math: '2026-10-12' } } } } }, '2026-10-03');
  봄('시즌 이름이 없는 옛 문서 → 오늘로 본 다음 시험(2-mid)', 빈시즌.examDatesOf('대원고', '1').math, '2026-10-12');
}

/* ⑤ 열쇠 */
console.log(NL + '⑤ 옛 열쇠 «시작일|시즌» → «학년도|시즌»' + NL);
{
  const F = 상자({ examRanges: {} }, '2026-10-03');
  const by = F.examKeysNormalize({
    '2026-09-01|2학기 중간': { 광남고: { '2': { 대수: { c1: 90 } } } },
    '2026|2학기 중간': { 광남고: { '2': { 확통: { c1: 80 } } } },
    '2027-01-05|겨울방학': { x: 1 },
  });
  봄('🔴 옛 열쇠가 새 열쇠로 · 같은 곳은 합친다', Object.keys(by).sort(), ['2026|2학기 중간', '2026|겨울방학']);
  봄('   합쳐도 둘 다 남는다', Object.keys(by['2026|2학기 중간'].광남고['2']).sort(), ['대수', '확통']);
}

/* ⑥ 지금 범위 */
console.log(NL + '⑥ 지금 범위' + NL);
{
  const years = { '2026': { 광남고: { '2': { '2-mid': { math: '2026-10-07', ranges: { 대수: ['b', 'c'] } } } } } };
  봄('🔴 그 학교의 지금 시험 칸', 상자({ examRanges: { migrated: true, years } }, '2026-10-03').rangeChapters('광남고', '2', '대수'), ['b', 'c']);
  봄('수학이 지나면 기말 기본(뒤 단원)', 상자({ examRanges: { migrated: true, years } }, '2026-10-08').rangeChapters('광남고', '2', '대수'), ['g', 'h', 'i']);
  봄('방학이면 과목 전체', 상자({ examRanges: { migrated: true, years } }, '2026-08-10').rangeChapters('광남고', '2', '대수').length, 9);
}

/* ⑦ 학원 전체 시즌 — 가장 앞선 시험 */
{
  const years = { '2026': { 대원고: { '2': { '2-mid': { math: '2026-09-30' } } } } };
  const 학생 = [{ school: '광남고', grade: '2' }, { school: '대원고', grade: '2' }];
  봄('한 곳이라도 중간이면 학원 전체는 2학기 중간', 상자({ examRanges: { migrated: true, years } }, '2026-10-03', 학생).currentSeason(), '2학기 중간');
}

/* ⑦-b 수학이 먼저 끝난 학교 (2026-10-03 · 사용자가 짚었다 — 「수학시험이 끝난 애들 직보일정표도 시험기간 색상이 사라진 거겠지?」) */
console.log(NL + '⑦-b 수학이 먼저 끝난 학교 — 직보·달력·등원 창은 그 시험을 계속 본다' + NL);
{
  const years = { '2026': {
    광남고: { '2': { '2-mid': { start: '2026-10-05', end: '2026-10-09', math: '2026-10-07' } } },
    대원고: { '2': { '2-mid': { start: '2026-10-01', end: '2026-10-06', math: '2026-10-02' },
                    '2-fin': { start: '2026-12-01', math: '2026-12-03' } } } } };
  const 학생 = [{ school: '광남고', grade: '2' }, { school: '대원고', grade: '2' }];
  const F = 상자({ examRanges: { migrated: true, years } }, '2026-10-03', 학생);
  봄('D-day 는 규칙대로 다음 시험(대원 → 기말)', (F.examDatesOf('대원고', '2') || {}).math, '2026-12-03');
  봄('🔴 직보 일정표는 학원 전체 지금 시험(중간) 날짜로 칠한다', (F.planExamDatesOf('대원고', '2') || {}).math, '2026-10-02');
  봄('🔴 등원 창 — 수학이 끝나도 시험기간(10/6까지)은 남는다', (F.examWindowOf('대원고', '2') || {}).end, '2026-10-06');
  봄('🔴 달력 — 적어 둔 시험 전부(중간·기말)', F.examDatesAllOf('대원고', '2').map(d => d.slot).sort(), ['2-fin', '2-mid']);
}

/* ⑧ 학생마다 시험 과목 (2026-10-03) */
console.log(NL + '⑧ 학생마다 시험 과목 · 정시는 표시만' + NL);
{
  const F = new Function('subjectOfStudent', 'escHtml', lift('studentExamSubjects') + NL + lift('trackBadgeHTML') + NL
    + 'return { studentExamSubjects, trackBadgeHTML };')(sid => sid === 'c' ? '대수' : '', x => x);
  봄('🔴 고른 과목이 있으면 그것', F.studentExamSubjects({ studentId: 'c', examSubjects: ['대수', '기하'] }), ['대수', '기하']);
  봄('없으면 반 과목 하나', F.studentExamSubjects({ studentId: 'c' }), ['대수']);
  봄('둘 다 없으면 빈 것', F.studentExamSubjects({ studentId: 'x', examSubjects: [] }), []);
  봄('정시 딱지 — 정시 · 내신+정시에만', [F.trackBadgeHTML({ track: '정시' }) !== '', F.trackBadgeHTML({ track: '내신+정시' }) !== '', F.trackBadgeHTML({})], [true, true, '']);
  const 저장 = lift('updateStudentInfo');
  봄('🔴 학생 정보 저장이 시험 과목 · 준비를 담는다', [/s\.examSubjects = /.test(저장), /s\.track = /.test(저장)], [true, true]);
  봄('🔴 시험 일정 줄이 학생 과목으로 선다', /studentExamSubjects\(s\)/.test(lift('teacherExamRangeHTML')), true);
  봄('데일리퀴즈는 여전히 반 과목', /subjectOfStudent\(sid\)/.test(lift('studentRange')), true);
}

console.log(NL + (fail ? '🔴 ' + fail + '개 실패 · ' : '✓ 전부 통과 · ') + pass + '개' + NL);
process.exit(fail ? 1 : 0);
