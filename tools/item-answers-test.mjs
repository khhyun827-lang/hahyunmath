// 문항 «정답 채우기» 검사 (2026-09-06)
//
//   node tools/item-answers-test.mjs
//
// 🔴 **DB 를 안 건드린다** — index.html 에서 함수를 글자로 떼어 와 스텁으로 돌린다.
//
// 여기서 지키는 것은 하나다 — **조용히 지워지지 않는가.**
//   `dbSetDoc` 은 문서를 «통째로» 갈아 끼운다(값이 JSON 글자 하나다). 그래서 문서를 다시 쓸 때
//   빠뜨린 필드는 **사라진다.** 그림이 이미 그 함정에 걸릴 뻔했고, 정답도 같은 자리에 있다.
//   교재를 다시 올리는 일도, 정답표를 다시 올리는 일도 둘 다 «있는 것»이다.

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

// ── ① 교재를 다시 올릴 때 어느 정답이 남는가 ──────────────────────────
const { itemAnswerToKeep } = new Function(lift('itemAnswerToKeep') + '\nreturn { itemAnswerToKeep };')();

console.log('\n교재를 다시 올릴 때 — 어느 정답이 남는가\n');
봄('🔴 이미 담아 둔 것이 언제나 이긴다', itemAnswerToKeep({ answer: '$12$' }, '③'), '$12$');
봄('없으면 미주의 객관식을 받는다',      itemAnswerToKeep({}, '③'), '③');
봄('문서 자체가 없어도 안 터진다',        itemAnswerToKeep(undefined, '③'), '③');
봄('🔴 주관식 미주는 안 받는다 (해설이 붙어 온다)',
   itemAnswerToKeep({}, '$10 \sqrt{2}$ 점 P(a,0) 을 잡으면…'), '');
봄('미주가 비면 빈 것',                   itemAnswerToKeep({}, ''), '');
봄('앞뒤 공백은 털어 낸다',               itemAnswerToKeep({ answer: '  ②  ' }, '⑤'), '②');

// ── ② 정답표로 채울 때 본문·그림이 살아남는가 ─────────────────────────
console.log('\n정답표로 채울 때 — 본문과 그림이 살아남는가\n');

function makeWorld(itemBody) {
  const w = { 쓴것: [], ver: 0, 재운것: null, msg: '' };
  const state = { itemBody, icAns: null };
  const api = new Function(
    'state', 'render', 'loadItemStoreIfNeeded', 'dbSetDoc', 'nowStamp',
    'itemsBumpVersion', 'itemsCacheWrite', 'console',
    lift('icFillAnswers', 'async function') + '\nreturn { icFillAnswers };'
  )(state,
    () => { w.msg = state.icAns ? state.icAns.msg : ''; },
    async () => {},
    async (coll, id, doc) => { w.쓴것.push({ id, doc }); return true; },
    () => '2026-09-06 12:00',
    async () => { w.ver++; return 'v' + w.ver; },
    (ver, rows) => { w.재운것 = { ver, n: rows.length }; },
    { warn(){}, error(){}, log(){} });
  return Object.assign(w, api, { state });
}
const 파일 = (items) => ({ text: async () => JSON.stringify({ items }) });
const 넣기 = (items) => ({ files: [파일(items)], value: 'x' });

{ // 🔴 여기가 이 검사의 요점이다
  const w = makeWorld({ 'K2-01-E-0001': { code: 'K2-01-E-0001', content: '본문', image: { url: 'u', fileId: 'f' } } });
  await w.icFillAnswers(넣기([{ code: 'K2-01-E-0001', answer: '③' }]));
  const doc = w.쓴것[0].doc;
  봄('정답이 담긴다', doc.answer, '③');
  봄('🔴 본문이 안 날아간다', doc.content, '본문');
  봄('🔴 그림이 안 날아간다', doc.image, { url: 'u', fileId: 'f' });
  봄('버전을 올린다', w.ver, 1);
  봄('올린 버전으로 재운다', w.재운것.ver, 'v1');
}
{ // 본문이 없는 코드 — 정답만 있어 봐야 AI 가 변형을 못 만든다
  const w = makeWorld({ 'K2-01-E-0001': { code: 'K2-01-E-0001' } });   // content 없음
  await w.icFillAnswers(넣기([{ code: 'K2-01-E-0001', answer: '③' }, { code: '없는코드', answer: '②' }]));
  봄('본문 없는 것은 안 쓴다', w.쓴것.length, 0);
  봄('버전도 안 올린다 (쓴 게 없으니)', w.ver, 0);
  봄('몇 개를 건너뛰었는지 말한다', /건너뛰었습니다/.test(w.msg), true);
}
{ // 두 번 올려도 다시 안 쓴다 — 쓰기도 돈이고, 버전이 헛되이 올라가면 남들이 다시 읽는다
  const w = makeWorld({ 'K2-01-E-0001': { code: 'K2-01-E-0001', content: '본문', answer: '③' } });
  await w.icFillAnswers(넣기([{ code: 'K2-01-E-0001', answer: '③' }]));
  봄('같은 정답이면 다시 안 쓴다', w.쓴것.length, 0);
  봄('그래서 버전도 그대로', w.ver, 0);
}
{ // 정답표가 이긴다 — 미주에서 받은 객관식보다 정답표가 낫다
  const w = makeWorld({ 'K2-01-E-0001': { code: 'K2-01-E-0001', content: '본문', answer: '③' } });
  await w.icFillAnswers(넣기([{ code: 'K2-01-E-0001', answer: '④' }]));
  봄('정답표가 바뀌면 갈아 끼운다', w.쓴것[0].doc.answer, '④');
}
{ // 빈 파일
  const w = makeWorld({});
  await w.icFillAnswers(넣기([]));
  봄('정답이 없으면 말하고 멈춘다', /정답이 하나도 없습니다/.test(w.msg), true);
}

console.log(`\n  ${fail ? '🔴' : '✅'} ${pass} 통과 · ${fail} 실패\n`);
process.exit(fail ? 1 : 0);
