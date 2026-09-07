// 「누가 강사인가」를 Firestore 에 적는다 (2026-09-07)
//
//   node tools/teacher-doc.mjs <uid>            지금 뭐가 있는지 본다 (안 쓴다)
//   node tools/teacher-doc.mjs <uid> --push     적는다
//   node tools/teacher-doc.mjs --list           지금 강사로 적힌 사람들을 본다
//
// 🔵 **왜 문서로 정하나** — 「이 사람이 강사다」를 규칙이 알아야 하는데, 커스텀 클레임은
//   관리자 권한이 있어야 붙인다. 문서가 «있는지»는 규칙이 그 자리에서 볼 수 있다:
//     exists(/databases/$(database)/documents/teachers/$(request.auth.uid))
//
// 🔴 **지금이 아니면 못 만든다.** 새 규칙(firestore.rules)은 이 컬렉션을
//   `allow write: if false` 로 잠근다 — 여기가 열려 있으면 아무나 강사가 되기 때문이다.
//   그래서 **규칙을 게시하기 «전»에** 적어 두어야 한다. 뒤에는 콘솔에서 손으로 넣어야 한다.
//
// ⚠ 이 도구는 uid 가 «정말 그 계정인지»는 못 잰다 — 그건 관리자 권한이 있어야 본다.
//   틀린 uid 를 적으면 조용히 아무 일도 안 일어나고, **로그인은 되는데 강사 화면이 막힌다.**
//   그때는 이 도구로 --list 해서 적힌 uid 와 콘솔의 uid 를 눈으로 견줄 것.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const apiKey = (html.match(/apiKey:\s*"([^"]+)"/) || [])[1];
const pid = (html.match(/projectId:\s*"([^"]+)"/) || [])[1];
const BASE = 'https://firestore.googleapis.com/v1/projects/' + pid + '/databases/(default)/documents';

const 인자 = process.argv.slice(2);
const 적는다 = 인자.includes('--push');
const 목록 = 인자.includes('--list');
const uid = 인자.find((a) => !a.startsWith('--'));
if (!목록 && !uid) {
  console.error('쓰는 법: node tools/teacher-doc.mjs <uid> [--push]  |  --list');
  process.exit(1);
}
/* ⚠ uid 는 28자 영숫자다. 눈으로 옮겨 적다 한 글자를 흘리면 «로그인은 되는데 강사가 아닌»
   상태가 되고, 그건 원인을 찾기 어렵다. 그래서 모양을 먼저 본다. */
if (uid && !/^[A-Za-z0-9]{20,40}$/.test(uid)) {
  console.error('🔴 uid 모양이 아닙니다(영숫자 20~40자): ' + uid);
  process.exit(1);
}

const a = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=' + apiKey,
  { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ returnSecureToken: true }) });
const tok = (await a.json()).idToken;
if (!tok) { console.error('🔴 익명 로그인 실패'); process.exit(1); }
const H = { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' };

/* 🔴 **막힌 컬렉션은 사람이 풀어야 한다** — 09-04에 「variants」로 겪은 그 자리다.
   지금 Firestore 규칙에 「teachers」가 없어서 읽기도 쓰기도 403 이다. 코드로는 못 푼다.
   ⚠ 스택을 토하지 말고 **무엇을 어디서 해야 하는지**를 말한다 — 그게 이 도구의 값이다. */
function 막혔다고말한다() {
  console.error('\n  🔴 「teachers」 컬렉션이 막혀 있습니다 (403).');
  console.error('     지금 Firestore 규칙에 이 컬렉션이 없습니다 — 코드로는 못 풉니다.');
  console.error('     09-04에 「variants」로 겪은 그 자리와 같습니다.\n');
  console.error('  ▶ 콘솔에서 «손으로» 만드세요:');
  console.error('     https://console.firebase.google.com/project/' + pid + '/firestore/data\n');
  console.error('       컬렉션 이름   teachers');
  console.error('       문서 ID       ' + (uid || '<강사 uid>'));
  console.error('       필드 이름     value       (타입: string)');
  console.error('       값            {"role":"teacher","id":"admin"}\n');
  console.error('  🔵 규칙은 이 문서가 «있는지»만 봅니다 — 안의 내용은 안 봅니다.');
  console.error('  🔴 새 규칙을 게시하면 이 컬렉션은 아무도 못 쓰게 잠깁니다.');
  console.error('     그러니 **게시하기 전에** 만들어 두어야 합니다.\n');
  process.exit(2);
}
async function 지금있는것() {
  const r = await fetch(BASE + '/teachers?pageSize=50', { headers: H });
  if (r.status === 404) return [];
  if (r.status === 403) 막혔다고말한다();
  if (!r.ok) throw new Error('teachers http ' + r.status + ' ' + (await r.text()).slice(0, 120));
  const j = await r.json();
  return (j.documents || []).map((d) => {
    let v = {};
    try { v = JSON.parse(d.fields?.value?.stringValue || '{}'); } catch (e) {}
    return { uid: d.name.split('/').pop(), ...v };
  });
}

const 있는것 = await 지금있는것();
console.log('\n  지금 강사로 적힌 사람 ' + 있는것.length + '명');
for (const t of 있는것) console.log('    · ' + t.uid + '   ' + (t.id || '') + ' ' + (t.적은때 || ''));
if (목록) { console.log(''); process.exit(0); }

if (있는것.some((t) => t.uid === uid)) {
  console.log('\n  ✅ 이 uid 는 이미 적혀 있습니다 — 할 일이 없습니다.\n');
  process.exit(0);
}

const 값 = { role: 'teacher', id: 'admin', 적은때: new Date().toISOString(),
  메모: '콘솔에서 만든 강사 계정. 이 문서가 있어야 규칙이 강사로 본다 (firestore.rules).' };

if (!적는다) {
  console.log('\n  ▶ 적을 것 — teachers/' + uid);
  console.log('    ' + JSON.stringify(값));
  console.log('\n  🔵 **한 줄도 안 적었다.** 실제로 적으려면 `--push` 를 붙인다.');
  console.log('  ⚠ 규칙을 게시한 «뒤»에는 이 컬렉션이 잠겨 코드로는 못 적는다.\n');
  process.exit(0);
}

const r = await fetch(BASE + '/teachers/' + encodeURIComponent(uid), {
  method: 'PATCH', headers: H,
  body: JSON.stringify({ fields: { value: { stringValue: JSON.stringify(값) } } }),
});
if (r.status === 403) 막혔다고말한다();
if (!r.ok) { console.error('🔴 못 적었다 — http ' + r.status + ' ' + (await r.text()).slice(0, 200)); process.exit(1); }

/* 🔴 «적었다»는 말은 다시 읽기 전까지 짐작이다. */
const 다시 = await 지금있는것();
const 들어갔나 = 다시.some((t) => t.uid === uid);
console.log('\n  ' + (들어갔나 ? '✅ 적혔다' : '🔴 적었다는데 다시 읽으니 없다') + ' — teachers/' + uid);
console.log('  이제 강사는 ' + 다시.length + '명이다.\n');
process.exit(들어갔나 ? 0 : 1);
