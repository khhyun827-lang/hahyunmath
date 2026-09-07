// 테스트 데이터를 걷어내고 «문항만» 남긴다 (2026-09-07 · 사용자 요청)
//
//   node tools/reset-test-data.mjs            센다 (한 줄도 안 지운다)
//   node tools/reset-test-data.mjs --push     실제로 지운다
//
// 🔵 **왜** — 지금 사이트는 열기만 하면 학생 이름·전화번호·비밀번호가 통째로 내려간다
//   (익명 인증 + `allow read: if request.auth != null`). 학생 계정이 전부 테스트용이라
//   사용자가 「지우고 진행하자」고 정했다. 지우면 **오늘 새는 것이 0이 되고**,
//   그 뒤에 인증을 제대로 세우는 일이 훨씬 싸진다.
// 🔴 **지운다고 구멍이 닫히는 것은 아니다.** 실제 학생이 들어오면 똑같이 샌다.
//   이건 «걸려 있는 것을 치우는 일»이지 «고치는 일»이 아니다.
//
// 살릴 것 — **`items`(원본 564제) · `variants`(변형)** · kv `itemsVer`(창고 버전).
//   나머지는 전부 지운다(시험지·본문 포함 — 2026-09-07에 사용자가 그렇게 정했다).
//   ⚠ 구글 드라이브의 그림은 **안 건드린다**(사용자가 그대로 두기로 했다).
//
// 🔴 **컬렉션 목록은 `backup.mjs` 것을 그대로 읽어 쓴다 — 두 벌로 두지 않는다.**
//   원래는 `listCollectionIds` 로 «실제로 있는 것»을 받으려 했으나 **403(관리자 전용)** 이다.
//   그래서 손으로 적은 목록에 기대는데, 그건 **나중에 생긴 컬렉션이 조용히 살아남는다**는 뜻이다.
//   ⚠ 그래서 «백업이 받는 것»과 «지우는 것»을 같은 목록에서 뽑는다 — 백업에 없는 컬렉션은
//     애초에 백업도 안 되므로, 목록을 고칠 때 두 도구가 같이 고쳐진다.
// 🔴 **옛 kv 블롭을 빼먹지 않는다** — `migrateBlobToCollection` 이 「예전 블롭은 그대로
//   남겨둔다」고 했다. `students` 컬렉션만 지우고 `kv/students` 를 두면 **학생 명단이
//   통째로 그대로 남는다.** 그게 이 도구를 만든 진짜 까닭이다.
// ⚠ 백업이 «오늘 것»이 아니면 지우지 않는다. 되돌릴 수 없는 일이다.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const 지운다 = process.argv.includes('--push');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const apiKey = (html.match(/apiKey:\s*"([^"]+)"/) || [])[1];
const pid = (html.match(/projectId:\s*"([^"]+)"/) || [])[1];
const BASE = 'https://firestore.googleapis.com/v1/projects/' + pid + '/databases/(default)/documents';

const 살릴컬렉션 = new Set(['items', 'variants']);
const 살릴kv = new Set(['itemsVer']);

const a = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=' + apiKey,
  { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ returnSecureToken: true }) });
const tok = (await a.json()).idToken;
if (!tok) { console.error('🔴 익명 로그인 실패'); process.exit(1); }
const H = { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' };

/* ── 볼 컬렉션 목록 — `backup.mjs` 의 것을 «글자로 읽어» 쓴다 ── */
const 백업소스 = fs.readFileSync(path.join(ROOT, 'tools', 'backup.mjs'), 'utf8');
const m = 백업소스.match(/const 컬렉션 = \[([\s\S]*?)\];/);
if (!m) { console.error('🔴 backup.mjs 에서 컬렉션 목록을 못 읽었다 — 목록 모양이 바뀌었나?'); process.exit(1); }
const 있는컬렉션 = [...m[1].matchAll(/'([a-z-]+)'/g)].map((x) => x[1]).concat(['kv']).sort();
console.log('  (컬렉션 목록은 backup.mjs 에서 읽었다 — ' + 있는컬렉션.length + '개)');

/* ── 문서 «이름»만 훑는다 (값은 안 받는다) ───────────────────── */
/* 🔴 **2026-09-08에 규칙을 제대로 잠갔다** — 그래서 이 도구는 이제 익명으로 아무것도 못 센다.
   ⚠ 그건 «흠»이 아니라 **옳은 상태**다. 스택을 토하지 말고 그렇게 말한다.
     이 도구가 다시 필요해지면(테스트 데이터를 또 걷어낼 일), 강사로 로그인한 토큰이 있어야 한다. */
function 잠겼다고말한다() {
  console.error('\n  🔵 **규칙이 잠겨 있습니다 — 익명으로는 셀 수 없습니다.**');
  console.error('     2026-09-08에 인증을 제대로 세우면서 그렇게 됐습니다. 흠이 아닙니다.\n');
  console.error('  ▶ 이 도구를 다시 쓰려면 «강사 자격»으로 물어야 합니다.');
  console.error('     지금은 그 길이 없습니다 — 필요해지면 그때 붙입니다.\n');
  process.exit(2);
}
async function 이름들(c) {
  const out = []; let pt = '';
  do {
    const u = BASE + '/' + c + '?pageSize=300&mask.fieldPaths=__name__' + (pt ? '&pageToken=' + pt : '');
    const r = await fetch(u, { headers: H });
    if (r.status === 404) break;
    if (r.status === 403) 잠겼다고말한다();
    if (!r.ok) throw new Error(c + ' http ' + r.status);
    const j = await r.json();
    for (const d of (j.documents || [])) out.push(d.name.split('/').pop());
    pt = j.nextPageToken || '';
  } while (pt);
  return out;
}

console.log('\n  ══ Firestore 에 지금 있는 것 ══\n');
const 일감 = [];
for (const c of 있는컬렉션) {
  const 이름 = await 이름들(c);
  const 살린다 = 살릴컬렉션.has(c);
  if (c === 'kv') {
    /* kv 는 낱건이 섞여 산다 — 하나씩 가른다. 학번이 드러나지 않게 묶어서 적는다. */
    const 남길 = 이름.filter((k) => 살릴kv.has(k));
    const 지울 = 이름.filter((k) => !살릴kv.has(k));
    const 기록수 = 지울.filter((k) => k.startsWith('record:')).length;
    const 그밖 = 지울.filter((k) => !k.startsWith('record:'));
    console.log('  kv'.padEnd(16) + String(이름.length).padStart(5) + '건'
      + '   → 살림 ' + (남길.join(', ') || '없음'));
    console.log('  '.padEnd(16) + ' '.padStart(5) + '    → 지움 개인기록 ' + 기록수 + '건 · 그 밖 '
      + 그밖.length + '건: ' + 그밖.join(', '));
    for (const k of 지울) 일감.push({ c: 'kv', id: k });
  } else {
    console.log('  ' + c.padEnd(16) + String(이름.length).padStart(5) + '건   '
      + (살린다 ? '🔵 살린다' : '🔴 지운다'));
    if (!살린다) for (const id of 이름) 일감.push({ c, id });
  }
}

console.log('\n  ── 지울 문서 ' + 일감.length + '건 · 살릴 컬렉션 ' + [...살릴컬렉션].join(' · '));

if (!지운다) {
  console.log('\n  🔵 **한 줄도 안 지웠다.** 실제로 지우려면 `--push` 를 붙인다.');
  console.log('  ⚠ 그전에 `node tools/backup.mjs` 를 오늘 한 번 돌릴 것 — 되돌릴 수 없는 일이다.\n');
  process.exit(0);
}

/* ── 지우기 전에 «오늘 백업»을 확인한다 ─────────────────────── */
{
  const 오늘 = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const 백업방 = path.join(ROOT, '백업');
  const 있나 = fs.existsSync(백업방)
    && fs.readdirSync(백업방).some((d) => d.startsWith(오늘));
  if (!있나) {
    console.error('\n  🔴 **오늘 받은 백업이 없다** (`백업/' + 오늘 + '…`). 지우지 않는다.');
    console.error('     먼저: node tools/backup.mjs\n');
    process.exit(1);
  }
  console.log('  ✅ 오늘 백업이 있다 — 이어서 지운다.');
}

let 지움 = 0, 흠 = 0;
for (const w of 일감) {
  const r = await fetch(BASE + '/' + w.c + '/' + encodeURIComponent(w.id), { method: 'DELETE', headers: H });
  if (r.ok) 지움++;
  else { 흠++; if (흠 <= 3) console.error('   🔴 ' + w.c + '/' + w.id + ' — http ' + r.status); }
  if ((지움 + 흠) % 25 === 0) process.stdout.write('\r   ' + (지움 + 흠) + '/' + 일감.length + '   ');
}
console.log('\r   지웠다 ' + 지움 + '건 · 못 지운 것 ' + 흠 + '건        ');

/* ── 다시 세어 본다 — «지웠다»는 말은 다시 세기 전까지 짐작이다 ── */
console.log('\n  ── 다시 센다');
for (const c of 있는컬렉션) {
  const n = (await 이름들(c)).length;
  console.log('  ' + c.padEnd(16) + String(n).padStart(5) + '건 '
    + (살릴컬렉션.has(c) || c === 'kv' ? '' : (n ? '  🔴 남아 있다' : '  ✅ 비었다')));
}
console.log('\n  🔴 **구멍은 그대로다.** 실제 학생이 들어오면 똑같이 샌다 — 인증을 세우는 일이 남았다.\n');
