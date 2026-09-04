// 변경 이력 «최근 것만 받기» 검사 (2026-09-06)
//
//   node tools/auditlog-recent-test.mjs
//
// 🔴 **이 검사만으로는 부족하다는 것을 배웠다.** 처음에 `orderBy __name__ DESC + limit` 으로
//    짰고 이 검사는 통과했는데, **배포본에서 깨졌다** — Firestore 가 복합 인덱스를 요구한다
//    (FAILED_PRECONDITION). 스텁은 인덱스를 모른다.
//    → 그래서 **`tools/firestore-probe.mjs`** 를 따로 두었다. 질의 «모양»을 바꾸면 그것도 돌릴 것.
//    여기서는 스텁으로 볼 수 있는 것만 본다: 무엇을 물어보는가 · 어떻게 정렬해 내놓는가.

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
const 봄 = (무엇, 나온것, 나와야할것) => {
  const ok = JSON.stringify(나온것) === JSON.stringify(나와야할것);
  if (ok) { pass++; console.log('  ✓ ' + 무엇); }
  else { fail++; console.log(`  ✗ ${무엇}\n      나온 것: ${JSON.stringify(나온것)}\n      나와야:  ${JSON.stringify(나와야할것)}`); }
};

function makeWorld(전체, { fails = false } = {}) {
  const w = { sent: null, 돌려준수: 0 };
  const collectionReadFailed = new Set();
  async function fetchStub(url, opt) {
    w.sent = { url, body: JSON.parse(opt.body) };
    if (fails) return { ok: false, status: 429 };
    const q = w.sent.body.structuredQuery;
    const min = q.where.fieldFilter.value.referenceValue.split('/').pop();
    let rows = 전체.filter(e => e.id >= min).sort((a, b) => (a.id < b.id ? -1 : 1)).slice(0, q.limit);
    w.돌려준수 = rows.length;
    return { ok: true, json: async () => [{ readTime: '…' },
      ...rows.map(e => ({ document: { name: 'x/' + e.id, fields: { value: { stringValue: JSON.stringify(e) } } } }))] };
  }
  const api = new Function(
    'fetch', 'withTimeout', 'getAuthToken', 'FIRESTORE_ROOT', 'markCollectionRead',
    'AUDITLOG_DAYS', 'AUDITLOG_CAP', 'console',
    lift('dbGetCollectionSince') + '\n' + lift('loadAuditLogRecent')
      + '\nreturn { dbGetCollectionSince, loadAuditLogRecent };'
  )(fetchStub, (p) => p, async () => 'tok', 'https://x/documents',
    (c, ok) => { ok ? collectionReadFailed.delete(c) : collectionReadFailed.add(c); },
    60, 500, { warn(){}, error(){}, log(){} });
  return Object.assign(w, api, { collectionReadFailed });
}

// 실제 id 모양 그대로 — 이 자름은 그 모양에 기대고 있다
const 로그 = (n, 며칠전) => Array.from({ length: n }, (_, i) => {
  const t = Date.now() - 며칠전 * 86400000 + i * 60000;
  return { id: 'log' + t + '_abcde', at: new Date(t).toISOString(), action: '성적 수정', actor: '김하현T' };
});

console.log('\n변경 이력 — 최근 것만 받는다\n');

{ // ① 창 밖은 안 받는다
  const 옛것 = 로그(50, 400), 요즘 = 로그(30, 10);
  const w = makeWorld([...옛것, ...요즘]);
  const rows = await w.loadAuditLogRecent();
  봄('60일 창 안의 것만 받는다', rows.length, 30);
  봄('🔵 돌려받은 문서 수 = 과금 단위', w.돌려준수, 30);
}
{ // ② 🔴 인덱스를 안 쓰는 «모양»인가 — 09-06에 이걸로 깨졌다
  const w = makeWorld(로그(10, 10));
  await w.loadAuditLogRecent();
  const q = w.sent.body.structuredQuery;
  봄('🔴 orderBy 를 쓰지 않는다 (그것이 인덱스를 요구했다)', q.orderBy, undefined);
  봄('__name__ 범위로 자른다', [q.where.fieldFilter.field.fieldPath, q.where.fieldFilter.op],
     ['__name__', 'GREATER_THAN_OR_EQUAL']);
  봄('경계는 문서 «경로»여야 한다', /\/auditlog\/log\d+$/.test(q.where.fieldFilter.value.referenceValue), true);
  봄('한 번에 받는 수에 뚜껑이 있다', q.limit, 500);
  봄('runQuery 로 간다', w.sent.url.endsWith(':runQuery'), true);
}
{ // ③ 🔴 「최근」이 옛것이던 흠 — 범위 질의는 오름차순으로 온다
  const 전체 = 로그(20, 5);
  const w = makeWorld(전체);
  const rows = await w.loadAuditLogRecent();
  봄('맨 위가 «가장 새것»이다', rows[0].id, 전체[19].id);
  봄('맨 아래가 «가장 옛것»이다', rows[19].id, 전체[0].id);
}
{ // ④ 문서 없는 줄·빈 결과
  const w = makeWorld([]);
  봄('빈 것은 빈 배열이다 (readTime 줄에 안 걸린다)', await w.loadAuditLogRecent(), []);
  봄('그래도 «읽었다»고 표시한다', w.collectionReadFailed.has('auditlog'), false);
}
{ // ⑤ 실패는 실패로 — 못 읽었으면 쓰기가 막혀야 한다
  const w = makeWorld(로그(10, 5), { fails: true });
  봄('엎어지면 빈 배열 (앱은 안 선다)', await w.loadAuditLogRecent(), []);
  봄('🔴 못 읽었다고 표시한다 — 이게 쓰기를 막는다', w.collectionReadFailed.has('auditlog'), true);
}
{ // ⑥ 이 자름이 기대고 있는 가정
  봄('id 는 글자 순서가 곧 시간 순서다 (13자리 고정)', 'log' + 1757000000000 < 'log' + 1757000060000, true);
  봄('2286년까지는 자릿수가 안 늘어난다', String(new Date('2286-01-01').getTime()).length, 13);
}

console.log(`\n  ${fail ? '🔴' : '✅'} ${pass} 통과 · ${fail} 실패\n`);
process.exit(fail ? 1 : 0);
