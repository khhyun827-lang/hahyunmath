// 앱이 실제로 쓰는 «질의 모양»을 진짜 Firestore 에 물어본다 (2026-09-06)
//
//   node tools/firestore-probe.mjs
//
// 🔴 **왜 이것이 따로 필요한가 — 2026-09-06에 이것 때문에 배포본이 깨졌다.**
//    변경 이력을 `orderBy __name__ DESC + limit` 으로 받게 바꿨고, 스텁 검사는 통과했다.
//    그런데 Firestore 는 그 모양에 **복합 인덱스를 요구한다**(FAILED_PRECONDITION).
//    그러자 auditlog 이 «못 읽음»으로 찍혀 화면에 빨간 띠가 뜨고 **쓰기까지 막혔다.**
//    🔵 **스텁은 인덱스를 모른다.** 규칙·인덱스·권한은 진짜에 물어봐야만 안다.
//    ⚠ 질의 «모양»을 바꾸면(where/orderBy/limit) **배포 전에 이것부터 돌릴 것.**
//
// 읽기는 몇 건만 쓴다(limit 을 작게 둔다). 쓰기는 하지 않는다.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const apiKey = (html.match(/apiKey:\s*"([^"]+)"/) || [])[1];
const projectId = (html.match(/projectId:\s*"([^"]+)"/) || [])[1];
if (!apiKey || !projectId) throw new Error('index.html 에서 firebase 설정을 못 읽었습니다.');

const res0 = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=' + apiKey,
  { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ returnSecureToken: true }) });
if (!res0.ok) throw new Error('익명 로그인 실패 (http ' + res0.status + ')');
const token = (await res0.json()).idToken;
const BASE = 'https://firestore.googleapis.com/v1/projects/' + projectId + '/databases/(default)/documents';

let pass = 0, fail = 0;
function 됨(무엇, ok, 곁) {
  if (ok) { pass++; console.log('  ✓ ' + 무엇 + (곁 ? '  — ' + 곁 : '')); }
  else { fail++; console.log('  ✗ ' + 무엇 + (곁 ? '\n      ' + 곁 : '')); }
}

async function 목록(collection) {
  const r = await fetch(BASE + '/' + collection + '?pageSize=1', { headers: { Authorization: 'Bearer ' + token } });
  됨(`목록 읽기 · ${collection}`, r.ok, r.ok ? null : r.status + ' ' + (await r.text()).replace(/\s+/g, ' ').slice(0, 200));
}
async function 질의(무엇, structuredQuery) {
  const r = await fetch(BASE + ':runQuery', {
    method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ structuredQuery }),
  });
  const t = await r.text();
  if (!r.ok) { 됨(무엇, false, r.status + ' ' + t.replace(/\s+/g, ' ').slice(0, 240)); return; }
  const n = JSON.parse(t).filter(x => x.document).length;
  /* 🔴 인덱스 오류는 200 이 아니라 400 으로 온다 — 위에서 걸린다. 여기 왔으면 도는 것이다. */
  됨(무엇, true, `문서 ${n}건`);
}

console.log('\n진짜 Firestore 에 물어본다 — 규칙·인덱스·권한\n');

/* ① 앱이 통째로 읽는 컬렉션들 — 규칙이 열려 있는가 */
for (const c of ['students', 'classes', 'exams', 'problembank', 'variants', 'items', 'auditlog']) await 목록(c);

/* ② 🔴 변경 이력을 자르는 그 모양 — 09-06에 깨진 자리다 */
const ref = (id) => 'projects/' + projectId + '/databases/(default)/documents/auditlog/' + id;
await 질의('변경 이력 — __name__ 범위 (지금 쓰는 모양)', {
  from: [{ collectionId: 'auditlog' }],
  where: { fieldFilter: { field: { fieldPath: '__name__' }, op: 'GREATER_THAN_OR_EQUAL',
                          value: { referenceValue: ref('log' + (Date.now() - 60 * 86400000)) } } },
  limit: 5,
});

/* ③ 안 쓰기로 한 모양 — «왜 안 쓰는지»를 남겨 둔다. 실패하는 것이 정상이다. */
const r = await fetch(BASE + ':runQuery', {
  method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
  body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'auditlog' }],
    orderBy: [{ field: { fieldPath: '__name__' }, direction: 'DESCENDING' }], limit: 3 } }),
});
if (r.ok) console.log('\n  ⓘ 참고 — orderBy __name__ DESC 가 «이제는» 됩니다 (인덱스가 생긴 듯).\n'
                    + '     그래도 지금 모양을 바꿀 까닭은 없습니다. 인덱스가 없어도 도는 쪽이 안전합니다.');
else console.log('\n  ⓘ 참고 — orderBy __name__ DESC 는 여전히 인덱스를 요구합니다(http ' + r.status + ').\n'
               + '     그래서 범위로 자릅니다. 이 줄이 그 까닭의 증거입니다.');

console.log(`\n  ${fail ? '🔴' : '✅'} ${pass} 통과 · ${fail} 실패\n`);
process.exit(fail ? 1 : 0);
