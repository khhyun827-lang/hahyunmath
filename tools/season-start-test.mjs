// 시즌 시작일을 고칠 때 «등급컷이 안 사라지는가» (2026-09-08)
//
//   node tools/season-start-test.mjs
//
// 🔴 시작일은 **등급컷 열쇠의 한 조각**이다(seasonKeyOf(name, startedAt)).
//   그래서 날짜만 바꾸면 적어 둔 등급컷이 **다른 열쇠 밑에 남아 화면에서 조용히 사라진다.**
//   ⚠ 「고쳤더니 딴 게 사라졌다」는 이 앱에서 가장 나쁜 갈래다 — 사라진 줄도 모른다.
//
// 🔵 왜 고칠 수 있어야 하나 — 여태 이 값은 «내가 시즌을 넘긴 날»이 그대로 박혔다.
//   여름방학을 늦게 종료하면 2학기 중간이 9/8부터인 것처럼 보인다. 사실이 아닌 값이다.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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

const 열쇠 = (name, at) => String(at || '') + '|' + String(name || '');

function 세상({ 시작일 = '2026-09-08', 컷 = {} } = {}) {
  const w = { 쓴것: {}, 토스트: [], 기록: [] };
  const state = { season: { name: '2학기 중간', startedAt: 시작일 }, gradeCuts: { byKey: 컷 } };
  const fn = new Function('state', 'currentSeason', 'curSeasonKey', 'seasonKeyOf',
    'dbSet', 'showToast', 'logAudit', 'render',
    떠내기('setSeasonStart') + '; return setSeasonStart;')(
    state,
    () => state.season.name,
    () => 열쇠(state.season.name, state.season.startedAt),
    열쇠,
    async (k, v) => { w.쓴것[k] = v; return true; },
    (t) => { w.토스트.push(t); },
    async (...a) => { w.기록.push(a[3]); },
    () => {},
  );
  return { w, state, fn };
}

console.log('\n시즌 시작일 고치기\n');

/* ── ① 등급컷이 «같이 옮겨지는가» — 이게 핵심이다 ───────────── */
{
  const 옛열쇠 = 열쇠('2학기 중간', '2026-09-08');
  const { w, state, fn } = 세상({ 컷: { [옛열쇠]: { 광남고: { 고1: { 공통수학2: [90, 80, 70, 60] } } } } });
  await fn('2026-08-20');

  봄('🔴 시작일이 바뀐다', state.season.startedAt, '2026-08-20');
  const 새열쇠 = 열쇠('2학기 중간', '2026-08-20');
  봄('🔴 등급컷이 «새 열쇠»로 옮겨진다', !!state.gradeCuts.byKey[새열쇠], true);
  봄('🔴 옛 열쇠 밑에는 안 남는다 — 남으면 두 벌이 된다', !!state.gradeCuts.byKey[옛열쇠], false);
  봄('   값이 그대로다', state.gradeCuts.byKey[새열쇠].광남고.고1.공통수학2, [90, 80, 70, 60]);
  봄('   등급컷 문서도 저장한다', !!w.쓴것['grade-cuts'], true);
  봄('   시즌 문서도 저장한다', w.쓴것.season.startedAt, '2026-08-20');
  봄('   무엇을 옮겼는지 기록에 남긴다', /등급컷/.test(w.기록.join(' ')), true);
}

/* ── ② 비우기 — 사용자가 «지우는 것»도 골랐다 ───────────────── */
{
  const 옛열쇠 = 열쇠('2학기 중간', '2026-09-08');
  const { state, fn } = 세상({ 컷: { [옛열쇠]: { 광남고: {} } } });
  await fn('');
  봄('비우면 시작일이 사라진다', state.season.startedAt, '');
  봄('🔴 비울 때도 등급컷을 «같이» 옮긴다', !!state.gradeCuts.byKey[열쇠('2학기 중간', '')], true);
  봄('   옛 열쇠에는 안 남는다', !!state.gradeCuts.byKey[옛열쇠], false);
}

/* ── ③ 🔴 새 열쇠에 이미 있으면 덮지 않는다 ─────────────────── */
//
// ⚠ 덮는 쪽은 되돌릴 수 없다. 「바꿨더니 옛날에 적어 둔 등급컷이 사라졌다」가 된다.
{
  const 옛열쇠 = 열쇠('2학기 중간', '2026-09-08');
  const 새열쇠 = 열쇠('2학기 중간', '2026-08-20');
  const { w, state, fn } = 세상({ 컷: { [옛열쇠]: { A: 1 }, [새열쇠]: { B: 2 } } });
  await fn('2026-08-20');
  봄('🔴 덮지 않는다', state.gradeCuts.byKey[새열쇠], { B: 2 });
  봄('🔴 시작일도 안 바꾼다 — 반만 하면 더 나쁘다', state.season.startedAt, '2026-09-08');
  봄('   왜 안 됐는지 말한다', /이미 적어 둔 등급컷/.test(w.토스트.join(' ')), true);
  봄('   아무것도 저장하지 않는다', Object.keys(w.쓴것).length, 0);
}

/* ── ④ 날짜 꼴이 아니면 막는다 ──────────────────────────────── */
{
  const { w, state, fn } = 세상();
  await fn('2026/08/20');
  봄('날짜 꼴이 아니면 안 바꾼다', state.season.startedAt, '2026-09-08');
  봄('   그렇다고 말한다', /날짜 꼴/.test(w.토스트.join(' ')), true);
}

/* ── ⑤ 같은 값이면 아무 일도 안 한다 ────────────────────────── */
{
  const { w, fn } = 세상();
  await fn('2026-09-08');
  봄('같은 날짜면 아무것도 안 쓴다', Object.keys(w.쓴것).length, 0);
}

/* ── ⑥ 등급컷이 없을 때도 도는가 ────────────────────────────── */
{
  const { w, state, fn } = 세상({ 컷: {} });
  await fn('2026-08-20');
  봄('등급컷이 없어도 시작일은 바뀐다', state.season.startedAt, '2026-08-20');
  봄('   그때는 등급컷 문서를 안 건드린다', !!w.쓴것['grade-cuts'], false);
}

console.log(틀림 ? '\n  🔴 ' + 통과 + ' 통과 · ' + 틀림 + ' 실패\n' : '\n  ✅ ' + 통과 + ' 통과 · 0 실패\n');
process.exit(틀림 ? 1 : 0);
