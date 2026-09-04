// 빠른정답표를 «어느 교재»에 붙이는가 (2026-09-04)
//
//   node tools/answer-match-test.mjs
//
// 🔴 **사용자가 물어서 알았다 — 지금 구조는 위험했다.**
//    「hwpx로 올리기 해서 문제를 심고 빠른정답표를 다른거 올리면 어떡해? 어떻게 매칭을시켜?
//     앞으로 문항이 누적될것이고 … 어떤 문제들의 빠른정답표를 올린건지 어떻게 인식해?」
//
//    여태 된 것은 창고에 **교재가 하나뿐**이었기 때문이다. 둘이 되는 순간
//    `K2-01-E-0005` 와 `K2-01-R-0005` 가 «같은 번호 5» 를 두고 부딪히고,
//    엉뚱한 교재의 정답이 **조용히** 덮인다 — 가장 나쁜 종류의 흠이다.
//
// 🔵 답은 «인식»이 아니다 — **사람이 고르고, 고른 것이 맞는지 기계가 검사한다.**

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

function lift(name, kind = 'function') {
  const at = html.indexOf(kind + ' ' + name + '(');
  if (at < 0) throw new Error(name + ' 를 못 찾았습니다');
  let depth = 0;
  for (let j = html.indexOf('{', at); j < html.length; j++) {
    if (html[j] === '{') depth++;
    else if (html[j] === '}') { depth--; if (!depth) return html.slice(at, j + 1); }
  }
  throw new Error(name + ' 의 끝을 못 찾았습니다');
}

let pass = 0, fail = 0;
const 봄 = (무엇, 나온것, 나와야할것) => {
  const ok = JSON.stringify(나온것) === JSON.stringify(나와야할것);
  if (ok) { pass++; console.log('  ✓ ' + 무엇); }
  else { fail++; console.log(`  ✗ ${무엇}\n      나온 것: ${JSON.stringify(나온것)}\n      나와야:  ${JSON.stringify(나와야할것)}`); }
};

/* 창고에 교재가 둘 — 엔딩크레딧(E) 과 유형반복R(R). 번호가 겹친다. */
const itemByCode = {};
for (let n = 1; n <= 10; n++) {
  itemByCode['K2-01-E-' + String(n).padStart(4, '0')] = {};
  itemByCode['K2-01-R-' + String(n).padStart(4, '0')] = {};
}

function makeWorld({ 책 = 'E', byNo = {} } = {}) {
  const w = { 쓴것: [], msg: '', 멈춤: false };
  const state = {
    itemByCode,
    itemBody: Object.fromEntries(Object.keys(itemByCode).map(c => [c, { code: c, content: '본문' }])),
    icAnsBook: 책, icAnsNote: '', icAns: null,
  };
  const api = new Function(
    'state', 'render', 'loadItemStoreIfNeeded', 'parseHwpxAnswerKey', 'dbSetDoc',
    'nowStamp', 'itemsBumpVersion', 'itemsCacheWrite', 'BOOK_OF_CODE', 'console',
    lift('icFillAnswers', 'async function') + '\nreturn { icFillAnswers };'
  )(state,
    () => { w.msg = state.icAns ? state.icAns.msg : ''; },
    async () => {},
    async () => byNo,
    async (coll, id, doc) => { w.쓴것.push(id); return true; },
    () => '2026-09-04 12:00', async () => 'v1', () => {},
    { E: '엔딩크레딧', R: '유형반복R' }, { warn(){}, error(){}, log(){} });
  return Object.assign(w, api, { state });
}
const 파일 = (items) => ({ files: [{ name: '빠른정답표.hwpx', text: async () => JSON.stringify({ items }) }], value: '' });

console.log('\n빠른정답표 — 어느 교재에 붙는가\n');

{ // 🔴 여기가 요점 — 고른 교재 안에서만 짝짓는다
  const w = makeWorld({ 책: 'E', byNo: { 1: '②', 2: '③', 3: '④' } });
  await w.icFillAnswers(파일([]));
  봄('🔴 고른 교재(E)에만 붙는다', w.쓴것, ['K2-01-E-0001', 'K2-01-E-0002', 'K2-01-E-0003']);
  봄('🔴 다른 교재(R)는 한 개도 안 건드린다', w.쓴것.some(c => c.includes('-R-')), false);
  봄('무엇에 붙였는지 말한다', /엔딩크레딧/.test(w.msg), true);
}
{ // 교재를 바꾸면 그쪽에 붙는다
  const w = makeWorld({ 책: 'R', byNo: { 1: '②' } });
  await w.icFillAnswers(파일([]));
  봄('R 을 고르면 R 에 붙는다', w.쓴것, ['K2-01-R-0001']);
}
{ // 🔴 교재를 잘못 골랐을 때 — 담기 «전»에 멈춘다
  const w = makeWorld({ 책: 'E', byNo: Object.fromEntries(Array.from({ length: 20 }, (_, i) => [i + 101, '②'])) });
  await w.icFillAnswers(파일([]));
  /* 표는 101~120 인데 창고의 E 는 1~10 뿐이다 → 하나도 안 맞는다 = 통째로 다른 표 */
  봄('🔴 못 찾은 것이 많으면 한 개도 안 담는다', w.쓴것.length, 0);
  봄('🔴 까닭을 말한다', /창고에 없습니다/.test(w.msg), true);
  봄('무엇을 해야 하는지도 말한다', /교재를 잘못 고르셨거나/.test(w.msg), true);
}
{ // 조금 안 맞는 것은 건너뛰고 담는다 (표가 창고보다 살짝 넓은 것은 흔하다)
  const w = makeWorld({ 책: 'E', byNo: { 1: '②', 2: '③', 11: '④' } });
  await w.icFillAnswers(파일([]));
  봄('조금 모자란 것은 건너뛰고 담는다', w.쓴것, ['K2-01-E-0001', 'K2-01-E-0002']);
  봄('몇 개를 건너뛰었는지 말한다', /1개는 창고에 없어/.test(w.msg), true);
}

console.log(`\n  ${fail ? '🔴' : '✅'} ${pass} 통과 · ${fail} 실패\n`);
process.exit(fail ? 1 : 0);
