// 지금 규칙이 «무엇을 열어 두고 있나»를 잰다 (2026-09-07)
//
//   node tools/rules-check.mjs
//
// 🔵 왜 — 규칙은 콘솔에만 있고, 막힌 컬렉션은 화면에서 «빨간 딱지» 하나로만 보인다.
//   어느 컬렉션이 막혔는지는 안 알려 준다. 그러면 짐작으로 고치게 된다.
//   이 도구는 **컬렉션마다 실제로 물어봐서** 읽기/쓰기가 되는지 말한다.
//
// 🔴 **쓰기는 «진짜로 쓰지 않는다»** — 있지도 않은 문서를 지워 본다(DELETE).
//   없는 문서를 지우는 것은 아무것도 안 바꾸지만, 규칙은 «쓰기»로 판정한다.
//   그래서 데이터를 하나도 안 건드리고 쓰기 권한만 잰다.
//
// ⚠ 익명으로 묻는다 — 지금 앱이 그렇게 돌기 때문이다. 새 규칙을 게시한 뒤에는
//   익명이 막히는 것이 «정상»이다. 그때는 이 도구도 전부 🔴 로 뜬다(그게 맞다).

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const apiKey = (html.match(/apiKey:\s*"([^"]+)"/) || [])[1];
const pid = (html.match(/projectId:\s*"([^"]+)"/) || [])[1];
const BASE = 'https://firestore.googleapis.com/v1/projects/' + pid + '/databases/(default)/documents';

/* 앱이 실제로 만지는 컬렉션 전부. 새 컬렉션을 만들면 여기에 한 줄 더한다. */
const 볼것 = [
  ['students', '학생'], ['contacts', '연락처(새것)'], ['records', '기록(새것)'], ['chats', '채팅(새것)'],
  ['teachers', '강사(새것)'], ['classes', '반'], ['notices', '공지'], ['consults', '상담'],
  ['clinics', '클리닉'], ['clinicslots', '클리닉시간'], ['qnas', '질문'], ['videos', '영상'],
  ['assistants', '조교'], ['exams', '시험지'], ['problembank', '문제은행'], ['assignments', '과제'],
  ['auditlog', '변경이력'], ['items', '문항창고'], ['variants', '변형'], ['kv', '낱건'],
];

const a = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=' + apiKey,
  { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ returnSecureToken: true }) });
const tok = (await a.json()).idToken;
if (!tok) { console.error('🔴 익명 로그인 실패 — Authentication 에서 익명이 꺼졌나?'); process.exit(1); }
const H = { Authorization: 'Bearer ' + tok };

async function 읽기되나(c) {
  const r = await fetch(BASE + '/' + c + '?pageSize=1&mask.fieldPaths=__name__', { headers: H });
  if (r.status === 403) return '막힘';
  if (r.ok || r.status === 404) return '됨';
  return 'http ' + r.status;
}
async function 쓰기되나(c) {
  /* ⚠ 있지도 않은 문서를 지운다 — 아무것도 안 바꾸면서 규칙만 물어보는 길이다. */
  const 없는것 = '__rules_check_' + Date.now();
  const r = await fetch(BASE + '/' + c + '/' + 없는것, { method: 'DELETE', headers: H });
  if (r.status === 403) return '막힘';
  if (r.ok || r.status === 404) return '됨';
  return 'http ' + r.status;
}

console.log('\n  ══ 지금 규칙이 익명에게 열어 둔 것 ══\n');
console.log('  ' + '컬렉션'.padEnd(16) + '읽기    쓰기');
console.log('  ' + '─'.repeat(36));
const 막힌것 = [];
for (const [c, 이름] of 볼것) {
  const [r, w] = [await 읽기되나(c), await 쓰기되나(c)];
  const 표 = (v) => (v === '됨' ? '✅ 됨 ' : v === '막힘' ? '🔴 막힘' : '⚠ ' + v);
  console.log('  ' + (c + ' ' + 이름).padEnd(24) + 표(r) + '  ' + 표(w));
  if (r === '막힘' || w === '막힘') 막힌것.push({ c, 이름, r, w });
}

console.log('');
if (!막힌것.length) {
  console.log('  ⚠ **전부 열려 있다.** 익명이 다 읽고 쓸 수 있다는 뜻이다 —');
  console.log('    사이트를 열기만 한 사람도 그렇다. 새 규칙을 아직 안 올린 상태다.\n');
} else {
  console.log('  🔴 막힌 것 ' + 막힌것.length + '개 — 앱이 이걸 만지면 «빨간 딱지»가 뜬다:');
  for (const x of 막힌것) console.log('     · ' + x.c + ' (' + x.이름 + ') — 읽기 ' + x.r + ' · 쓰기 ' + x.w);
  console.log('\n  ▶ 규칙에 없는 컬렉션은 기본이 «막힘»이다. 콘솔에서 열어야 한다.\n');
}
