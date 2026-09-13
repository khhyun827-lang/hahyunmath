// 학생 달력의 «점» — 갈래 일곱이 아니라 묶음 셋 (2026-09-13 · K-21)
//
//   node tools/cal-dots-test.mjs
//
// 사용자 — 「**학생 일정달력에 달력 점 표시하는거 점이 너무 많기도 하고 색깔구분도 잘안가.
//   밑에 색 표시해주는 라벨도 너무많기도하고**」
//
// 🔴 갈래가 일곱이라 한 칸에 점이 넷까지 찍혔고, 라벨도 일곱 줄이었다.
//   ⇒ **점은 셋으로 묶는다** — 가는 날 · 낼 것 · 내 일정. 시험은 점이 아니라 «면»이다.
// 🔵 **자세한 것은 안 잃는다** — 날짜를 누르면 아래 목록이 갈래 이름과 제 색으로 그대로 말한다.
// ⚠ 함수를 여기에 옮겨 적지 않는다 — index.html 에서 그대로 뜬다.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/\r\n/g, '\n');
/* ⚠ ds.css 도 읽는다 — 묶음 열쇠가 거기 «부품 이름»과 겹치는지 봐야 한다(아래 ③). */
const ds = fs.readFileSync(path.join(ROOT, 'ds.css'), 'utf8').replace(/\r\n/g, '\n');
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
/* ⚠ 「첫 `;` 까지」로 떠 오면 안 된다 — `CAL_GROUP_OF` 는 **몸통 안에 `;` 가 든 IIFE**라
   거기서 잘린다(실제로 잘려서 터졌다). **깊이가 0 인 `;`** 까지 떠 온다. */
function liftConst(n) {
  const at = html.search(new RegExp('^const ' + n + '\\s*=', 'm'));
  if (at < 0) throw new Error(n + ' 를 못 찾았습니다');
  let 깊이 = 0;
  for (let j = at; j < html.length; j++) {
    const ch = html[j];
    if (ch === '{' || ch === '(' || ch === '[') 깊이++;
    else if (ch === '}' || ch === ')' || ch === ']') 깊이--;
    else if (ch === ';' && 깊이 === 0) return html.slice(at, j + 1);
  }
  throw new Error(n + ' 의 끝을 못 찾았습니다');
}
const 알맹이 = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

let pass = 0, fail = 0;
const 봄 = (무엇, 나온것, 나와야) => {
  const ok = JSON.stringify(나온것) === JSON.stringify(나와야);
  if (ok) pass++; else fail++;
  console.log((ok ? '  ✓ ' : '  🔴 ') + 무엇 +
    (ok ? '' : NL + '      나온 것 ' + JSON.stringify(나온것) + NL + '      나와야 ' + JSON.stringify(나와야)));
};

const F = new Function([liftConst('CAL_KINDS'), liftConst('CAL_GROUPS'),
  liftConst('CAL_GROUP_OF')].join(NL) + NL + lift('calDotGroups') + NL +
  'return { CAL_KINDS, CAL_GROUPS, CAL_GROUP_OF, calDotGroups };')();

/* ═══ ① 묶음 ═══ */
console.log(NL + '① 점은 셋 — 가는 날 · 낼 것 · 내 일정' + NL);
{
  봄('🔴 묶음은 셋뿐이다', Object.keys(F.CAL_GROUPS), ['come', 'todo', 'mine']);
  봄('이름은 「가는 날 · 낼 것 · 내 일정」',
    Object.values(F.CAL_GROUPS).map(g => g.이름), ['가는 날', '낼 것', '내 일정']);
  봄('🔴 세 색이 서로 다르다',
    new Set(Object.values(F.CAL_GROUPS).map(g => g.색)).size, 3);
  봄('수업·클리닉·직보는 «가는 날»',
    ['class', 'clinic', 'plan'].map(k => F.CAL_GROUP_OF[k]), ['come', 'come', 'come']);
  봄('과제·영상은 «낼 것»', ['hw', 'video'].map(k => F.CAL_GROUP_OF[k]), ['todo', 'todo']);
  봄('내 일정은 따로', F.CAL_GROUP_OF['mine'], 'mine');
  /* 🔴 시험은 일부러 묶음이 없다 — 칸 배경(면)과 아래 「시험기간」 줄이 말한다 */
  봄('🔴 시험은 점을 안 찍는다 (면으로 말한다)', F.CAL_GROUP_OF['exam'], undefined);

  /* 🔴 **갈래를 더해 놓고 여기 안 적으면 그 갈래는 달력에서 통째로 사라진다** */
  const 빠진것 = Object.keys(F.CAL_KINDS).filter(k => k !== 'exam' && !F.CAL_GROUP_OF[k]);
  봄('🔴 시험 말고는 모든 갈래가 묶음을 가진다', 빠진것, []);
  /* 거꾸로도 본다 — 없는 갈래를 묶음에 적어 두면 라벨이 터진다 */
  const 없는갈래 = Object.values(F.CAL_GROUPS)
    .flatMap(g => g.갈래).filter(k => !F.CAL_KINDS[k]);
  봄('🔴 묶음에 «없는 갈래»를 적어 두지 않았다', 없는갈래, []);
}

/* ═══ ② 한 칸에 찍히는 점 ═══ */
console.log(NL + '② 한 칸 — 같은 묶음이 여럿이어도 점 하나' + NL);
{
  const ev = k => ({ kind: k });
  봄('수업 하나면 점 하나', F.calDotGroups([ev('class')]), ['come']);
  봄('🔴 수업·클리닉·직보가 다 있어도 점 하나 (전에는 셋이었다)',
    F.calDotGroups([ev('class'), ev('clinic'), ev('plan')]), ['come']);
  봄('🔴 과제 셋도 점 하나', F.calDotGroups([ev('hw'), ev('hw'), ev('hw')]), ['todo']);
  봄('🔴 일곱 갈래가 다 있어도 점은 셋을 안 넘는다',
    F.calDotGroups(Object.keys(F.CAL_KINDS).map(ev)), ['come', 'todo', 'mine']);
  봄('🔴 시험만 있는 날은 점이 없다', F.calDotGroups([ev('exam')]), []);
  봄('차례는 늘 같다 (가는 날 → 낼 것 → 내 일정)',
    F.calDotGroups([ev('mine'), ev('hw'), ev('class')]), ['come', 'todo', 'mine']);
  봄('일정이 없으면 점도 없다', [F.calDotGroups([]), F.calDotGroups(null)], [[], []]);
  봄('모르는 갈래는 조용히 무시한다 (터지지 않는다)', F.calDotGroups([ev('무엇')]), []);
}

/* ═══ ③ 화면 ═══ */
console.log(NL + '③ 화면 — 달력 칸과 라벨' + NL);
{
  const 달력 = lift('stuCalendarHTML');
  봄('🔴 칸이 묶음으로 점을 찍는다', 달력.includes('점들 = calDotGroups(evs)'), true);
  봄('🔴 갈래로 찍던 옛 길이 안 남았다', 알맹이(달력).includes('CAL_KINDS[k].색'), false);
  봄('🔴 라벨도 묶음 셋이다', 달력.includes('Object.keys(CAL_GROUPS).map'), true);
  봄('🔴 라벨에 무엇이 묶였는지 옅게 덧붙인다',
    달력.includes("CAL_GROUPS[g].갈래.map(k => CAL_KINDS[k].이름).join('·')"), true);
  봄('🔴 시험은 «면»이라고 라벨에서 말해 준다', 달력.includes('시험기간<s>칸 바탕이 붉어집니다'), true);
  /* 🔵 자세한 것은 아래 목록이 그대로 말한다 — 이것까지 묶으면 정보를 잃는다 */
  봄('🔵 날짜를 누르면 나오는 목록은 «갈래»로 그대로 말한다',
    달력.includes('CAL_KINDS[e.kind].이름'), true);
  봄('🔵 목록의 줄 색도 갈래 색 그대로다', 달력.includes("border-left-color:' + CAL_KINDS[e.kind].색"), true);
  /* 점을 키웠다 — 셋뿐이라 자리가 난다 */
  봄('🔴 점을 키웠다 (4.5px 는 폰에서 안 보였다)',
    html.includes('.app.sap .scal-c .dots i{width:6.5px;height:6.5px;'), true);
  봄('🔴 회색인 「내 일정」은 속을 비워 «꼴»로도 가른다',
    html.includes('.app.sap .scal-c .dots i.dot-mine{background:transparent'), true);
  /* 🔴 **이름을 `dot-` 로 싼다** (2026-09-14 · 사용자 신고). 묶음 열쇠를 그대로 class 로 쓰니
     `todo` 가 **ds.css 의 `.todo`(할 일 «카드»)** 와 부딪혀, 6.5px 짜리 점이 그 카드의
     padding 과 테두리를 받아 **34px 짜리 덩어리**가 됐다 — 날짜를 통째로 덮었다.
     ⚠ 이 저장소에서 여덟 번째 이름 충돌이다. */
  봄('🔴 점 class 는 `dot-` 로 싸서 ds.css 의 이름과 안 부딪힌다',
    달력.includes("'<i class=\"dot-' + g + '\""), true);
  봄('🔴 묶음 열쇠가 ds.css 의 부품 이름과 겹친다는 것을 붙든다',
    Object.keys(F.CAL_GROUPS).filter(g => new RegExp('^\\.' + g + '[{ ,:]', 'm').test(ds)),
    ['todo']);
  봄('🔴 그래서 «맨» class 로는 절대 안 쓴다',
    /'<i class="' \+ g \+ '"/.test(달력), false);
}

console.log(NL + (fail ? '🔴 ' + fail + '개 실패 · ' : '✓ 전부 통과 · ') + pass + '개' + NL);
process.exit(fail ? 1 : 0);
