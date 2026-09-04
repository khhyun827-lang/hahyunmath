// 앱의 «그 함수»를 진짜 Firestore 에 대고 돌린다 (2026-09-06)
//
//   node tools/firestore-probe.mjs
//
// 🔴 **왜 이것이 따로 필요한가 — 하루에 두 번 당했다.**
//    ① `orderBy __name__ DESC + limit` → Firestore 가 복합 인덱스를 요구(FAILED_PRECONDITION).
//    ② 고친 뒤에도 여전히 400 — `referenceValue` 에 **호스트가 붙은 URL**을 넣고 있었다
//       (`FIRESTORE_ROOT` 는 URL, 질의는 자원 경로 `projects/…` 를 원한다).
//    둘 다 **스텁 검사 15개를 다 통과하고 배포본에서 깨졌다.** 그러면 그 컬렉션이 «못 읽음»으로
//    찍혀 화면에 빨간 띠가 뜨고 **쓰기까지 막힌다.**
//
// 🔴 **②를 이 도구가 못 잡았던 까닭이 중요하다** — 처음엔 여기서 질의를 «내가 새로 만들어»
//    보냈다. 올바른 모양으로 만들었으니 당연히 통과했고, **앱이 보내는 것과는 다른 것**이었다.
//    → 그래서 지금은 **index.html 의 함수를 글자로 떼어 와 그대로 부른다.**
//      베껴 적으면 둘이 갈린다 — hwpx.js·dq-face-test 와 같은 수법이다.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const apiKey = (html.match(/apiKey:\s*"([^"]+)"/) || [])[1];
const projectId = (html.match(/projectId:\s*"([^"]+)"/) || [])[1];
if (!apiKey || !projectId) throw new Error('index.html 에서 firebase 설정을 못 읽었습니다.');

/* 상수도 index.html 에서 읽는다 — 여기 적으면 갈린다. */
/* 상수도 index.html 에서 읽는다 — 여기 적으면 둘이 갈린다. */
const num = (name) => {
  const line = html.split(String.fromCharCode(10))
    .find(l => l.trim().indexOf('const ' + name) === 0);
  const at = line ? line.indexOf('=') : -1;
  const v = at > 0 ? parseInt(line.slice(at + 1).trim(), 10) : NaN;
  if (!Number.isFinite(v)) throw new Error(name + ' 을 못 찾았습니다');
  return v;
};
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

const res0 = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=' + apiKey,
  { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ returnSecureToken: true }) });
if (!res0.ok) throw new Error('익명 로그인 실패 (http ' + res0.status + ')');
const token = (await res0.json()).idToken;

/* 🔴 **앱과 «같은 값»을 쓴다.** URL 과 자원 경로를 여기서 새로 짜면 이 도구의 뜻이 없어진다. */
const FIRESTORE_ROOT = 'https://firestore.googleapis.com/v1/projects/' + projectId + '/databases/(default)/documents';
const FIRESTORE_PATH = 'projects/' + projectId + '/databases/(default)/documents';

let pass = 0, fail = 0;
const 됨 = (무엇, ok, 곁) => {
  if (ok) { pass++; console.log('  ✓ ' + 무엇 + (곁 ? '  — ' + 곁 : '')); }
  else { fail++; console.log('  🔴 ' + 무엇 + (곁 ? '\n      ' + 곁 : '')); }
};

console.log('\n진짜 Firestore 에 물어본다 — 규칙·인덱스·질의 모양\n');

/* ① 앱이 통째로 읽는 컬렉션 — 규칙이 열려 있는가 */
for (const c of ['students', 'notices', 'consults', 'classes', 'clinics', 'clinicslots', 'qnas',
                 'videos', 'assistants', 'exams', 'problembank', 'assignments', 'auditlog',
                 'variants', 'items']) {
  const r = await fetch(FIRESTORE_ROOT + '/' + c + '?pageSize=1', { headers: { Authorization: 'Bearer ' + token } });
  됨('목록 · ' + c, r.ok, r.ok ? null : r.status + ' ' + (await r.text()).replace(/\s+/g, ' ').slice(0, 200));
}

/* ② 🔴 앱의 «그 함수»를 그대로 부른다 — 여기가 이 도구의 요점이다 */
let 실패한것 = '';
const api = new Function(
  'fetch', 'withTimeout', 'getAuthToken', 'FIRESTORE_ROOT', 'FIRESTORE_PATH',
  'markCollectionRead', 'AUDITLOG_DAYS', 'AUDITLOG_CAP', 'console',
  lift('dbGetCollectionSince') + '\n' + lift('loadAuditLogRecent')
    + '\nreturn { dbGetCollectionSince, loadAuditLogRecent };'
)(fetch, (p) => p, async () => token, FIRESTORE_ROOT, FIRESTORE_PATH,
  (c, ok, e) => { if (!ok) 실패한것 = c + ' — ' + (e && e.message); },
  num('AUDITLOG_DAYS'), num('AUDITLOG_CAP'),
  { warn: () => {}, error: () => {}, log: () => {} });

const rows = await api.loadAuditLogRecent();
됨('변경 이력 — 앱의 loadAuditLogRecent() 를 그대로 실행', !실패한것,
   실패한것 || `문서 ${rows.length}건` + (rows[0] ? ` · 맨 위 ${rows[0].at || rows[0].id}` : ''));
if (rows.length > 1) {
  const 내림차순 = rows.every((r, i) => i === 0 || String(rows[i - 1].at || '') >= String(r.at || ''));
  됨('맨 위가 «가장 새것»이다', 내림차순, 내림차순 ? null : '순서가 뒤집혀 있습니다');
}

console.log(`\n  ${fail ? '🔴 ' + fail + ' 곳이 막혀 있습니다' : '✅ ' + pass + ' 통과 · 0 실패'}\n`);
process.exit(fail ? 1 : 0);
