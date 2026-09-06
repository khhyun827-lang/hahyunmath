// 주기나(②꼴) 문항을 창고에서 통째로 지운다 — 다시 시작하기 위해 (2026-09-06 · 일회성)
//
//   node tools/jugina-wipe.mjs            ← 무엇을 지울지 세기만 한다
//   node tools/jugina-wipe.mjs --push     ← 실제로 지운다
//
// 🔴 **되돌릴 수 없다.** 돌리기 전에 `node tools/backup.mjs <폴더>` 를 받아 둘 것.
// 🔵 왜 지우나 — 사용자가 정했다. ②꼴(`1050919NC01`)이 «변형인데 원본처럼» 취급돼
//   AI 가 이미 있는 변형을 또 만들고 있었다(실측 3건). 코드를 ①꼴(`1050919-N01`)로
//   통일하기로 했고, 옮기는 것보다 **지우고 다시 담는 쪽**을 사용자가 골랐다.
// ⚠ 드라이브에 올라간 그림은 **안 지운다** — 지우는 것이 더 위험하고, 다시 올리면 새로 붙는다.
//   (옛 그림은 아무도 안 가리키는 채로 남는다. 용량이 문제되면 그때 따로 걷어낼 것.)

import fs from 'fs';
const 쓸까 = process.argv.includes('--push');
const html = fs.readFileSync('index.html', 'utf8');
const apiKey = (html.match(/apiKey:\s*"([^"]+)"/) || [])[1];
const projectId = (html.match(/projectId:\s*"([^"]+)"/) || [])[1];
const BASE = 'https://firestore.googleapis.com/v1/projects/' + projectId + '/databases/(default)/documents';
const a = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=' + apiKey,
  { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ returnSecureToken: true }) });
if (!a.ok) { console.error('🔴 로그인 실패'); process.exit(1); }
const H = { Authorization: 'Bearer ' + (await a.json()).idToken };
const 읽기 = async (col) => { const out = {};
  for (let pt = ''; ;) {
    const r = await fetch(BASE + '/' + col + '?pageSize=300' + (pt ? '&pageToken=' + pt : ''), { headers: H });
    if (!r.ok) { console.error('🔴 ' + col + ' 을 못 읽었습니다 — http ' + r.status); process.exit(1); }
    const j = await r.json();
    for (const d of (j.documents || [])) { const id = d.name.split('/').pop(); try { out[id] = JSON.parse(d.fields?.value?.stringValue || '{}'); } catch (e) { } }
    if (!j.nextPageToken) break; pt = j.nextPageToken; }
  return out; };

const items = await 읽기('items'), variants = await 읽기('variants');
const pb = await 읽기('problembank'), exams = await 읽기('exams');
/* ②꼴 = 학년 한 자리 + 여섯 자리 숫자로 시작하는 코드. ①꼴(K2-…)과 절대 안 겹친다. */
const 주기나 = (c) => /^[12]\d{6}/.test(c);
const 지울문항 = Object.keys(items).filter(주기나);
const 지울변형 = Object.keys(variants).filter((k) => 주기나(k) || 주기나(String(variants[k].originCode || '')));

/* 🔴 **쓰이고 있으면 안 지운다** — 시험지가 가리키는 코드를 지우면 그 시험지가 유령을 가리킨다. */
const 글 = JSON.stringify(pb) + JSON.stringify(exams);
const 쓰인것 = [...지울문항, ...지울변형].filter((c) => 글.includes(c));
console.log('\n  창고 ' + Object.keys(items).length + '건 · 변형 ' + Object.keys(variants).length + '건');
console.log('  지울 문항 ' + 지울문항.length + '개 · 지울 변형 ' + 지울변형.length + '개');
console.log('    변형: ' + (지울변형.join(' ') || '(없음)'));
console.log('  그림이 붙은 것 ' + 지울문항.filter((c) => items[c].image || items[c].images).length + '개 (드라이브 파일은 안 지운다)');
if (쓰인것.length) {
  console.error('\n🔴 멈춥니다 — 시험지·문제은행이 쓰고 있는 코드가 ' + 쓰인것.length + '개입니다:');
  console.error('   ' + 쓰인것.slice(0, 10).join(' '));
  console.error('   지우면 그 시험지가 «없는 문항»을 가리킵니다.\n');
  process.exit(2);
}
console.log('  ✓ 시험지·문제은행이 쓰는 것은 하나도 없습니다 — 지워도 됩니다.');
if (!쓸까) { console.log('\n  ⓘ 세기만 했습니다. 실제로 지우려면 --push 를 붙이세요.\n'); process.exit(0); }

let 됨 = 0, 막 = 0;
for (const [col, ids] of [['items', 지울문항], ['variants', 지울변형]]) {
  for (const id of ids) {
    const r = await fetch(BASE + '/' + col + '/' + encodeURIComponent(id), { method: 'DELETE', headers: H });
    if (r.ok) 됨++; else { 막++; if (막 <= 3) console.log('  🔴 ' + col + '/' + id + ' — http ' + r.status); }
  }
}
if (됨) await fetch(BASE + '/kv/itemsVer', { method: 'PATCH', headers: { ...H, 'Content-Type': 'application/json' },
  body: JSON.stringify({ fields: { value: { stringValue: String(Date.now()) } } }) });
console.log('\n  ' + (막 ? '🔴' : '✅') + ' 지운 것 ' + 됨 + '개' + (막 ? ' · 막힌 것 ' + 막 : '') + '\n');
