// 변경 이력 «최근 것만 받기» 검사 (2026-09-06 · 읽기량 줄이기 #2)
//
//   node tools/auditlog-recent-test.mjs
//
// 🔴 **DB 를 안 건드린다** — index.html 에서 함수를 글자로 떼어 와 fetch 를 흉내 낸 것으로 돌린다.
//
// 여기서 지키는 약속 셋:
//   ① 로그인마다 **전부** 읽지 않는다 (limit 이 실제로 붙어 나가나)
//   ② 받은 것이 **새것부터**다 — 예전에는 목록이 이름 오름차순으로 와서
//      「최근 300건」이라 적어 놓고 **가장 오래된 300건**을 보여 주고 있었다
//   ③ 로그 id(`log` + Date.now())는 **글자 순서가 곧 시간 순서**다 — 정렬이 여기 기댄다

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

function lift(name) {
  const at = html.indexOf('async function ' + name + '(');
  if (at < 0) throw new Error(name + ' 를 못 찾았습니다');
  let depth = 0;
  for (let j = html.indexOf('{', at); j < html.length; j++) {
    if (html[j] === '{') depth++;
    else if (html[j] === '}') { depth--; if (!depth) return html.slice(at, j + 1); }
  }
  throw new Error(name + ' 의 끝을 못 찾았습니다');
}

let pass = 0, fail = 0;
function 봄(무엇, 나온것, 나와야할것) {
  const ok = JSON.stringify(나온것) === JSON.stringify(나와야할것);
  if (ok) { pass++; console.log('  ✓ ' + 무엇); }
  else { fail++; console.log('  ✗ ' + 무엇 + '\n      나온 것: ' + JSON.stringify(나온것) + '\n      나와야:  ' + JSON.stringify(나와야할것)); }
}

// ── 흉내 내는 Firestore ───────────────────────────────────────────────
// 실제 응답 모양 그대로다: 배열이고, 문서가 없는 줄(readTime 만)이 섞여 온다.
function makeWorld(전체, { fails = false } = {}) {
  const w = { sent: null, 돌려준수: 0 };
  const docs = 전체.map(e => ({ document: { name: 'x/' + e.id, fields: { value: { stringValue: JSON.stringify(e) } } } }));
  async function fetchStub(url, opt) {
    w.sent = { url, body: JSON.parse(opt.body) };
    if (fails) return { ok: false, status: 429 };
    const q = w.sent.body.structuredQuery;
    const desc = q.orderBy[0].direction === 'DESCENDING';
    let rows = docs.slice().sort((a, b) => (a.document.name < b.document.name ? -1 : 1));
    if (desc) rows.reverse();
    rows = rows.slice(0, q.limit);
    w.돌려준수 = rows.length;
    return { ok: true, json: async () => [{ readTime: '…' }, ...rows] };   // 문서 없는 줄을 일부러 섞는다
  }
  const collectionReadFailed = new Set();
  const api = new Function(
    'fetch', 'withTimeout', 'getAuthToken', 'FIRESTORE_ROOT', 'markCollectionRead', 'console',
    lift('dbGetCollectionRecent') + '\nreturn { dbGetCollectionRecent };'
  )(fetchStub, (p) => p, async () => 'tok', 'https://x/documents',
    (c, ok) => { ok ? collectionReadFailed.delete(c) : collectionReadFailed.add(c); },
    { warn(){}, error(){}, log(){} });
  return Object.assign(w, api, { collectionReadFailed });
}

// 실제 id 모양 그대로 만든다 — 이 검사의 절반은 «id 가 시간순인가»를 보는 것이다
const 로그 = (n) => Array.from({ length: n }, (_, i) => ({
  id: 'log' + (1757000000000 + i * 60000) + '_' + 'abcde',
  at: new Date(1757000000000 + i * 60000).toISOString(),
  action: i % 3 ? '성적 수정' : '학생 삭제', actor: '김하현T', studentName: '학생' + i,
}));

console.log('\n변경 이력 — 최근 것만 받는다\n');

{ // ① 실제로 덜 읽나
  const 전체 = 로그(1000);
  const w = makeWorld(전체);
  const rows = await w.dbGetCollectionRecent('auditlog', 300);
  봄('300건만 받는다 (1000건이 있어도)', rows.length, 300);
  봄('🔵 돌려받은 문서 수 = 과금 단위', w.돌려준수, 300);
  봄('limit 을 실제로 실어 보낸다', w.sent.body.structuredQuery.limit, 300);
  봄('__name__ 내림차순으로 물어본다',
     [w.sent.body.structuredQuery.orderBy[0].field.fieldPath, w.sent.body.structuredQuery.orderBy[0].direction],
     ['__name__', 'DESCENDING']);
  봄('runQuery 로 간다', w.sent.url.endsWith(':runQuery'), true);
}
{ // ② 🔴 09-06에 찾은 흠 — 「최근」이 실은 「가장 오래된」이었다
  const 전체 = 로그(1000);
  const w = makeWorld(전체);
  const rows = await w.dbGetCollectionRecent('auditlog', 300);
  봄('맨 위가 «가장 새것»이다', rows[0].id, 전체[999].id);
  봄('맨 아래가 그 300건의 끝이다', rows[299].id, 전체[700].id);
  봄('옛것은 안 섞여 있다', rows.some(r => r.id === 전체[0].id), false);
}
{ // ③ 문서 없는 줄·빈 컬렉션
  const w = makeWorld([]);
  const rows = await w.dbGetCollectionRecent('auditlog', 300);
  봄('빈 컬렉션은 빈 배열이다 (readTime 줄에 안 걸린다)', rows, []);
  봄('그래도 «읽었다»고 표시한다', w.collectionReadFailed.has('auditlog'), false);
}
{ // ④ 실패는 실패로 — 못 읽었으면 쓰기가 막혀야 한다
  const w = makeWorld(로그(10), { fails: true });
  const rows = await w.dbGetCollectionRecent('auditlog', 300);
  봄('429 면 빈 배열 (앱은 안 선다)', rows, []);
  봄('🔴 못 읽었다고 표시한다 — 이게 쓰기를 막는다', w.collectionReadFailed.has('auditlog'), true);
}
{ // ⑤ 이 정렬이 기대고 있는 가정
  const a = 'log' + 1757000000000 + '_zzzzz';
  const b = 'log' + 1757000060000 + '_aaaaa';
  봄('id 는 글자 순서가 곧 시간 순서다 (13자리 고정)', a < b, true);
  봄('2286년까지는 자릿수가 안 늘어난다', String(new Date('2286-01-01').getTime()).length, 13);
}

console.log(`\n  ${fail ? '🔴' : '✅'} ${pass} 통과 · ${fail} 실패\n`);
process.exit(fail ? 1 : 0);
