// 학생 달력 — 일정을 «제대로 모으는가» (2026-09-08 · 사용자 요청)
//
//   node tools/student-calendar-test.mjs
//
// 🔵 이 기능의 심장은 «모으기»다. 수업·시험·과제·영상·클리닉·내 일정이 제각기 다른 데 살고
//   모양도 제각각이라, 하나만 어긋나도 **학생이 그날 일정을 못 본다.**
//   ⚠ 그런데 화면은 멀쩡히 돈다 — 안 뜨는 것은 «없는 것»처럼 보인다. 그래서 검사가 필요하다.
//
// 🔴 특히 «남의 것이 섞이지 않는가»를 본다. 달력은 학생이 보는 화면이라,
//   남의 반 과제나 남의 클리닉이 새면 그것도 정보가 새는 것이다.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/\r\n/g, '\n');

function 떠내기(이름, 꼴) {
  const at = html.indexOf((꼴 || 'function ') + 이름 + '(');
  if (at < 0) throw new Error(이름 + ' 를 못 찾았습니다');
  let 깊이 = 0;
  for (let j = html.indexOf('{', at); j < html.length; j++) {
    if (html[j] === '{') 깊이++;
    else if (html[j] === '}') { 깊이--; if (!깊이) return html.slice(at, j + 1); }
  }
  throw new Error(이름 + ' 의 끝을 못 찾았습니다');
}

let 통과 = 0, 틀림 = 0;
const 봄 = (무엇, 잰것, 바란것) => {
  const 같다 = JSON.stringify(잰것) === JSON.stringify(바란것);
  같다 ? 통과++ : 틀림++;
  console.log((같다 ? '  ✓ ' : '  ✗ ') + 무엇
    + (같다 ? '' : '\n      나온 것: ' + JSON.stringify(잰것) + '\n      나와야:  ' + JSON.stringify(바란것)));
};

/* 갈래 표와 모으는 함수, 날짜 짓는 함수를 함께 떠낸다 */
const 갈래표 = html.slice(html.indexOf('const CAL_KINDS = {'),
                          html.indexOf('};', html.indexOf('const CAL_KINDS = {')) + 2);
const 조각 = [갈래표, 떠내기('stuMonthEvents'), 떠내기('ymd'), 떠내기('myEventsOf')].join('\n');

function 모은다(DATA, c, ym) {
  return new Function('DATA', 'c', 'ym',
    'parseScheduleDays', 'sessionTimeText', 'examDatesOf', 'classNameOf', 'slotTimeLabel',
    조각 + '; return stuMonthEvents(c, ym);')(
    DATA, c, ym,
    (sch) => (sch || '').includes('월') ? [1] : [],        // 「월」이 있으면 월요일
    () => '19:00~21:00',
    (school) => (school === '광남고' ? { start: '2026-09-14', end: '2026-09-18', math: '2026-09-16' } : null),
    (cid) => '고1A',
    (t) => t || '',
  );
}

const 기본DATA = () => ({
  classes: [{ id: 'c1', name: '고1A', schedule: '월 19:00~21:00' }, { id: 'c2', name: '남의반', schedule: '월' }],
  assignments: [
    { id: 'h1', classId: 'c1', title: '오답 10문제', dueDate: '2026-09-10' },
    { id: 'h2', classId: 'c2', title: '남의 반 과제', dueDate: '2026-09-11' },
    { id: 'h3', classId: '',   title: '전체 공지 과제', dueDate: '2026-09-12' },
  ],
  videos: [
    { id: 'v1', classId: 'c1', title: '4강', unit: '대수', dueDate: '2026-09-15' },
    { id: 'v2', classId: 'c1', title: '마감 없는 영상' },
    { id: 'v3', classId: 'c2', title: '남의 반 영상', dueDate: '2026-09-15' },
  ],
  clinics: [
    { id: 'cl1', studentId: 's1', day: '2026-09-09', topic: '삼각함수', time: '18:00', status: '승인' },
    { id: 'cl2', studentId: 's1', day: '2026-09-20', topic: '취소한 것', time: '18:00', status: '취소' },
    { id: 'cl3', studentId: 's2', day: '2026-09-09', topic: '남의 클리닉', time: '18:00', status: '승인' },
  ],
});
const 기본c = (rec) => ({ sid: 's1', classIds: ['c1'],
  me: { school: '광남고', grade: '고1' }, rec: rec || {} });

console.log('\n학생 달력 — 일정 모으기\n');

const 결과 = 모은다(기본DATA(), 기본c({ myEvents: [
  { id: 'me1', date: '2026-09-09', time: '20:00', title: '영어학원', memo: '단어시험' },
  { id: 'me2', date: '2026-10-01', title: '다음 달 것' },
] }), '2026-09');
const 갈래 = (date) => (결과[date] || []).map(e => e.kind);
const 제목 = (date) => (결과[date] || []).map(e => e.title);

/* ── ① 여섯 갈래가 다 모이는가 ──────────────────────────────── */
봄('수업이 «요일»에서 날짜로 펼쳐진다', 갈래('2026-09-07'), ['class']);
봄('과제 마감이 뜬다', 제목('2026-09-10'), ['오답 10문제']);
봄('반이 안 정해진 과제는 «모두의 것»이라 뜬다', 제목('2026-09-12'), ['전체 공지 과제']);
/* ⚠ 9/14 는 월요일이라 «수업»도 같이 있다 — 처음에 시험만 있을 줄 알고 검사를 틀리게 썼다.
   검사가 틀리면 멀쩡한 코드를 고치게 된다. 그래서 «들어 있나»로 묻는다. */
봄('시험기간 시작이 뜬다', 제목('2026-09-14').includes('시험기간 시작'), true);
봄('   같은 날 수업도 함께 뜬다 — 그날은 월요일이다', 갈래('2026-09-14').includes('class'), true);
봄('🔵 수학 시험일은 따로 선다', 제목('2026-09-16'), ['수학 시험']);
봄('시험기간 끝도 뜬다', 제목('2026-09-18'), ['시험기간 끝']);

/* ── ② 🔴 남의 것이 섞이지 않는가 ───────────────────────────── */
봄('🔴 남의 반 과제는 «안» 뜬다', 제목('2026-09-11'), []);
봄('🔴 남의 클리닉은 «안» 뜬다', 제목('2026-09-09').includes('남의 클리닉'), false);
봄('🔴 남의 반 영상도 «안» 뜬다', 제목('2026-09-15'), ['4강']);
봄('마감 없는 영상은 안 뜬다 — 달력에 걸 날이 없다',
  Object.values(결과).flat().some(e => e.title === '마감 없는 영상'), false);
봄('취소한 클리닉은 «안» 뜬다',
  Object.values(결과).flat().some(e => e.title === '클리닉' && e.sub === '취소한 것'), false);

/* ── ③ 내 일정 ──────────────────────────────────────────────── */
봄('내 일정이 뜬다', 제목('2026-09-09').includes('영어학원'), true);
봄('🔴 다른 달 것은 «안» 섞인다 — 달마다 모은다', 제목('2026-10-01'), []);
봄('지울 수 있게 id 를 들고 온다',
  (결과['2026-09-09'] || []).find(e => e.kind === 'mine').id, 'me1');

/* ── ④ 같은 날 차례 ─────────────────────────────────────────── */
//
// ⚠ 시간이 적힌 것이 먼저 와야 한다 — 학생이 보는 것은 «몇 시에 뭐가 있나»다.
{
  const 그날 = (결과['2026-09-09'] || []).map(e => e.kind);
  봄('같은 날은 «시간 있는 것»이 먼저', 그날[0], 'clinic');
  봄('   그 뒤에 내 일정(20:00)', 그날[1], 'mine');
}

/* ── ⑤ 기록이 아직 없어도 터지지 않는가 ─────────────────────── */
//
// ⚠ 학생이 처음 들어오면 rec 이 비어 있다. 거기서 터지면 달력이 통째로 안 뜬다.
{
  const 빈것 = 모은다(기본DATA(), 기본c(null), '2026-09');
  봄('기록이 비어도 돈다', typeof 빈것, 'object');
  봄('   그래도 수업은 뜬다', (빈것['2026-09-07'] || []).length, 1);
}

/* ── ⑥ 갈래마다 색이 «있는 토큰»인가 ───────────────────────── */
//
// 🔴 없는 토큰을 쓰면 조용히 «색 없음»이 된다 — 화면은 도는데 점이 안 보인다(처음에 그랬다).
{
  const ds = fs.readFileSync(path.join(ROOT, 'ds.css'), 'utf8');
  const 쓴색 = [...갈래표.matchAll(/var\(--([a-z-]+)\)/g)].map(m => m[1]);
  const 없는것 = [...new Set(쓴색)].filter(t => !new RegExp('--' + t + '\\s*:').test(ds));
  봄('🔴 갈래 색이 전부 ds.css 에 있는 토큰이다', 없는것, []);
}

/* ── ⑦ 매주 되풀이하는 내 일정 (2026-09-08) ─────────────────── */
//
// 🔵 「영어학원 월·수 6시」처럼 되풀이하는 것이 대부분이다 — 날마다 따로 적게 하면 아무도 안 쓴다.
// 🔴 그런데 되풀이는 «너무 많이 뜨는» 쪽으로 틀리기 쉽다. 시작 전·끝난 뒤에도 뜨면
//   학원을 그만둔 학생 달력에 영영 남는다. 그것부터 못 박는다.
{
  const 반복 = 모은다(기본DATA(), 기본c({ myEvents: [
    { id: 'w1', weekly: 1, dows: [1, 3], time: '18:00', title: '영어학원', from: '2026-09-01' },
    { id: 'w2', weekly: 1, dows: [5], title: '끝난 학원', from: '2026-08-01', to: '2026-09-04' },
    { id: 'w3', weekly: 1, dows: [2], title: '아직 시작 전', from: '2026-09-20' },
    { id: 'w4', weekly: 1, dows: [], title: '요일을 안 골랐다' },
  ] }), '2026-09');
  const 있나 = (date, 이름) => (반복[date] || []).some(e => e.title === 이름);
  봄('🔵 매주 월요일에 뜬다', 있나('2026-09-07', '영어학원'), true);
  봄('   같은 주 수요일에도 뜬다', 있나('2026-09-09', '영어학원'), true);
  봄('   화요일에는 안 뜬다', 있나('2026-09-08', '영어학원'), false);
  봄('🔴 끝난 뒤로는 «안» 뜬다 — 그만둔 학원이 영영 남으면 안 된다', 있나('2026-09-11', '끝난 학원'), false);
  봄('   끝나기 전에는 뜬다', 있나('2026-09-04', '끝난 학원'), true);
  봄('🔴 시작 전에는 «안» 뜬다', 있나('2026-09-01', '아직 시작 전'), false);
  봄('   시작한 뒤에는 뜬다', 있나('2026-09-22', '아직 시작 전'), true);
  봄('🔴 요일을 안 고른 것은 아예 안 뜬다 — 날마다 뜨면 재앙이다',
    Object.values(반복).flat().some(e => e.title === '요일을 안 골랐다'), false);

  /* ⚠ 옛 일정(date 하나뿐)이 모양이 바뀌어도 안 잃혀야 한다. */
  const 옛것 = 모은다(기본DATA(), 기본c({ myEvents: [{ id: 'o1', date: '2026-09-10', title: '옛 꼴' }] }), '2026-09');
  봄('⚠ 옛 «한 번짜리» 일정도 그대로 뜬다', (옛것['2026-09-10'] || []).some(e => e.title === '옛 꼴'), true);
}

/* ── ⑧ 시험기간을 «면»으로 내주는가 ─────────────────────────── */
{
  const stuExamSpan = new Function('examDatesOf',
    떠내기('stuExamSpan') + '; return stuExamSpan;')(
    (school) => (school === '광남고' ? { start: '2026-09-14', end: '2026-09-18', math: '2026-09-16' } : null));
  const sp = stuExamSpan(기본c());
  봄('🔵 시험기간의 처음과 끝을 준다', [sp.from, sp.to], ['2026-09-14', '2026-09-18']);
  봄('   수학 시험일도 따로 준다', sp.math, '2026-09-16');
  봄('시험 날짜가 없으면 null — 칸을 안 칠한다', stuExamSpan({ me: { school: '딴학교' } }), null);
}

console.log(틀림 ? '\n  🔴 ' + 통과 + ' 통과 · ' + 틀림 + ' 실패\n' : '\n  ✅ ' + 통과 + ' 통과 · 0 실패\n');
process.exit(틀림 ? 1 : 0);
