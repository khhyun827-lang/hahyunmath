// 시즌 «되돌리기» 검사 (2026-09-08 · 사용자가 겪은 것)
//
//   node tools/season-back-test.mjs
//
// 🔴 사용자가 실제로 막혔다 — 「2026 2학기 중간인데 시즌을 넘겨버려서 되돌아갈 수가 없어」.
//   넘기는 문만 있고 **되돌아가는 문이 없었다.**
//
// 🔴 되돌리기에서 가장 위험한 것은 **되돌리다 지우는 것**이다.
//   \`saveSeason()\` 은 범위와 날짜를 «비운다» — 되돌리기가 그걸 부르면
//   「잘못 넘긴 것」을 고치려다 **지금 적어 둔 것까지 날린다.** 그게 두 번째 사고다.
//   그래서 여기서 못 박는다: **되돌리기는 아무것도 안 지운다.**

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { stripComments } from './strip-comments.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/\r\n/g, '\n');

function 떠내기(이름) {
  const at = html.indexOf('async function ' + 이름 + '(');
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

const SEASONS = ['겨울방학', '1학기 중간', '1학기 기말', '여름방학', '2학기 중간', '2학기 기말'];

function 세상({ 지금, 보관 = [], 지금범위 = {}, 지금날짜 = {}, 눌렀나 = true } = {}) {
  const w = { 쓴것: {}, 토스트: [], 기록: [] };
  const state = {
    season: { name: 지금, startedAt: '2026-08-01' },
    examHistory: { items: 보관.slice() },
    examRanges: { season: 지금, bySchool: 지금범위, dates: 지금날짜 },
    examSeasonView: 3,
  };
  const fn = new Function('SEASONS', 'state', 'currentSeason', 'loadExamHistoryIfNeeded',
    'confirm', 'dbSet', 'examHistLabel', 'todayStr', 'logAudit', 'showToast', 'render', 'saveSeason',
    떠내기('backSeason') + '; return backSeason;')(
    SEASONS, state,
    () => state.season.name,
    async () => {},
    () => 눌렀나,
    async (k, v) => { w.쓴것[k] = v; return true; },
    (h) => (h.startedAt || '').slice(0, 4) + ' · ' + h.season,
    () => '2026-09-08',
    (...a) => { w.기록.push(a[0]); },
    (t) => { w.토스트.push(t); },
    () => {},
    () => { throw new Error('🔴 saveSeason 을 부르면 안 된다 — 그건 범위와 날짜를 비운다'); },
  );
  return { w, state, fn };
}

console.log('\n시즌 되돌리기\n');

/* ── ① 보관본이 있으면 «되살린다» ────────────────────────────── */
{
  const 보관 = [{ season: '2학기 중간', startedAt: '2026-08-20',
    bySchool: { 광남고: { 고1: { 공통수학2: ['평면좌표'] } } }, dates: { 광남고: { 고1: { math: '2026-10-10' } } } }];
  const { w, state, fn } = 세상({ 지금: '2학기 기말', 보관 });
  await fn();
  봄('🔴 시즌이 앞으로 되돌아간다', state.season.name, '2학기 중간');
  봄('   보관본의 «그때 시작일»을 되찾는다', state.season.startedAt, '2026-08-20');
  봄('🔵 보관해 둔 범위를 되살린다', Object.keys(state.examRanges.bySchool), ['광남고']);
  봄('🔵 보관해 둔 날짜도 되살린다', state.examRanges.dates.광남고.고1.math, '2026-10-10');
  봄('🔴 되살린 뒤 «지난 기록» 목록에서 뺀다 — 안 빼면 둘로 보인다', state.examHistory.items.length, 0);
  봄('   Firestore 에도 셋을 적는다',
    Object.keys(w.쓴것).sort(), ['exam-history', 'exam-ranges', 'season']);
  봄('   보고 있던 지난 기록에서 «지금»으로 돌아온다', state.examSeasonView, '');
}

/* ── ② 보관본이 없으면 «이름만» 되돌린다 — 아무것도 안 지운다 ── */
//
// 🔴 사용자가 겪은 것이 바로 이 경우다. 적어 둔 것이 없어 보관본이 안 생겼다.
{
  const { w, state, fn } = 세상({ 지금: '2학기 기말', 보관: [],
    지금범위: { 광남고: { 고1: { 공통수학2: ['원의방정식'] } } } });
  await fn();
  봄('🔴 보관본이 없어도 되돌아간다', state.season.name, '2학기 중간');
  봄('🔴 지금 적어 둔 범위를 «안 지운다»', Object.keys(state.examRanges.bySchool), ['광남고']);
  봄('   범위의 시즌 이름만 따라 바뀐다', state.examRanges.season, '2학기 중간');
  봄('   지난 기록은 건드리지 않는다', Object.keys(w.쓴것).includes('exam-history'), false);
}

/* ── ③ «엉뚱한 해»의 보관본을 끌어오지 않는가 ────────────────── */
//
// ⚠ 맨 앞 보관본이 다른 시즌이면 되살리면 안 된다 — 작년 것이 올라온다.
{
  const 보관 = [{ season: '1학기 기말', startedAt: '2026-05-01', bySchool: { 딴학교: {} }, dates: {} }];
  const { state, fn } = 세상({ 지금: '2학기 기말', 보관 });
  await fn();
  봄('🔴 앞 시즌이 아닌 보관본은 안 되살린다', Object.keys(state.examRanges.bySchool), []);
  봄('   그 보관본은 목록에 그대로 남는다', state.examHistory.items.length, 1);
  봄('   그래도 시즌은 되돌아간다', state.season.name, '2학기 중간');
}

/* ── ④ 맨 앞에서 되돌리면 «한 바퀴» 돈다 ─────────────────────── */
{
  const { state, fn } = 세상({ 지금: '겨울방학' });
  await fn();
  봄('맨 앞에서는 맨 뒤로 돈다', state.season.name, '2학기 기말');
}

/* ── ⑤ 아니라고 하면 아무 일도 없다 ──────────────────────────── */
{
  const { w, state, fn } = 세상({ 지금: '2학기 기말', 눌렀나: false });
  await fn();
  봄('물어봤을 때 «아니오»면 그대로다', state.season.name, '2학기 기말');
  봄('아무것도 안 쓴다', Object.keys(w.쓴것).length, 0);
}

/* ── ⑥ 🔴 되돌리기가 «비우는 문»을 부르지 않는가 ─────────────── */
//
// saveSeason 은 범위·날짜를 비운다. 되돌리기가 그걸 부르면 두 번째 사고가 된다.
// (위 스텁이 부르면 던지므로 ①~⑤가 이미 지키지만, 소스로도 못 박는다.)
{
  const 코드 = stripComments(떠내기('backSeason'));
  봄('🔴 saveSeason() 을 안 부른다 — 그건 범위와 날짜를 비운다', /saveSeason\(/.test(코드), false);
  봄('   season 문서를 직접 적는다', /dbSet\('season'/.test(코드), true);
}

console.log(틀림 ? '\n  🔴 ' + 통과 + ' 통과 · ' + 틀림 + ' 실패\n' : '\n  ✅ ' + 통과 + ' 통과 · 0 실패\n');
process.exit(틀림 ? 1 : 0);
