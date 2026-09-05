// 창고 본문의 «수식만» 제자리에서 고친다 — hwpx 를 다시 안 올린다 (2026-09-06)
//
//   node tools/items-repair.mjs           ← 재보기만 한다(아무것도 안 쓴다)
//   node tools/items-repair.mjs --push    ← 실제로 고친다
//
// 사용자가 물었다 — 「매번 수식수정할때마다 다시 재업로드해두면 뭔가 창고에서 수정해둔다고
// 해도 계속 돌아가는데, 재업로드 아닌형태로 수정할 방법은 없을까?」
//
// 🔵 **된다.** 규칙이 못 알아본 것은 사라진 것이 아니라 «날글자 그대로» 담겨 있다.
//   그래서 담긴 글에 그 규칙을 한 번 더 대면 그 자리에서 고쳐진다 (hwpx.js 의 hwpxRepairEqText).
//   ✅ 564제로 재 봤다 — **제자리 고치기와 «hwpx 를 새 파서로 다시 뽑기»가 560/560 글자까지 같다.**
//     (나머지 4건은 고치기가 아예 안 건드리는 것들이고, 상자·표를 다루던 옛 파서 차이라 별건이다.)
//
// 🔴 **덮어쓰지 않고 «합친다»** — items 문서 하나에 본문·정답·그림이 같이 산다.
//   여기서는 `content` 한 칸만 바꾸고 나머지는 읽은 그대로 도로 쓴다.
// 🔴 **바뀌는 것만 쓴다.** 안 바뀐 문서를 다시 쓰면 쓰기 한도를 태우고 이력만 더럽힌다.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadHwpxRules } from './hwpx-node.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const 쓸까 = process.argv.includes('--push');
const { hwpxRepairEqText } = loadHwpxRules();

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const apiKey = (html.match(/apiKey:\s*"([^"]+)"/) || [])[1];
const projectId = (html.match(/projectId:\s*"([^"]+)"/) || [])[1];
const BASE = 'https://firestore.googleapis.com/v1/projects/' + projectId + '/databases/(default)/documents';

const res0 = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=' + apiKey,
  { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ returnSecureToken: true }) });
if (!res0.ok) { console.error('로그인 실패 — ' + res0.status); process.exit(1); }
const H = { Authorization: 'Bearer ' + (await res0.json()).idToken };

/* ── 읽는다 (읽기만 하는 동안은 아무것도 안 바뀐다) ───────────────── */
const 있던것 = {};
for (let pt = ''; ;) {
  const r = await fetch(BASE + '/items?pageSize=300' + (pt ? '&pageToken=' + pt : ''), { headers: H });
  if (!r.ok) { console.error('창고를 못 읽었습니다 — http ' + r.status); process.exit(1); }
  const j = await r.json();
  for (const d of (j.documents || [])) {
    const id = d.name.split('/').pop();
    try { 있던것[id] = JSON.parse(d.fields?.value?.stringValue || '{}'); } catch (e) { }
  }
  if (!j.nextPageToken) break;
  pt = j.nextPageToken;
}

/* ── 잰다 ─────────────────────────────────────────────────────────── */
const 쓸것 = [];
for (const code in 있던것) {
  const 옛 = 있던것[code];
  const 새글 = hwpxRepairEqText(옛.content || '');
  if (!옛.content || 새글 === 옛.content) continue;
  쓸것.push({ code, 옛글: 옛.content, 새글, doc: { ...옛, content: 새글, updatedAt: new Date().toISOString().slice(0, 10) } });
}
console.log('\n창고 ' + Object.keys(있던것).length + '건 · 수식이 고쳐지는 것 ' + 쓸것.length + '건\n');
for (const x of 쓸것.slice(0, 6)) {
  let s = 0; while (s < x.옛글.length && x.옛글[s] === x.새글[s]) s++;
  console.log('  ' + x.code);
  console.log('     옛: …' + x.옛글.slice(Math.max(0, s - 16), s + 46).replace(/\n/g, ' ') + '…');
  console.log('     새: …' + x.새글.slice(Math.max(0, s - 16), s + 46).replace(/\n/g, ' ') + '…');
}
if (쓸것.length > 6) console.log('  … 그리고 ' + (쓸것.length - 6) + '건 더');

/* 🔴 **쓰기 전에 스스로 막는다** — 규칙을 잘못 고쳐 창고를 통째로 갈아엎는 일을 막는다.
   수식 손질은 «몇십 건»짜리 일이다. 절반이 넘게 바뀐다면 그건 손질이 아니라 사고다. */
const 절반 = Math.floor(Object.keys(있던것).length / 2);
if (쓸것.length > 절반) {
  console.log('\n🔴 멈춥니다 — ' + 쓸것.length + '건은 너무 많습니다(창고의 절반이 넘습니다).');
  console.log('   규칙이 멀쩡한 글까지 물어뜯고 있는지 먼저 보세요.\n');
  process.exit(1);
}
if (!쓸것.length) { console.log('  고칠 것이 없습니다.\n'); process.exit(0); }
if (!쓸까) { console.log('\n  ⓘ 재보기만 했습니다. 실제로 고치려면 --push 를 붙이세요.\n'); process.exit(0); }

/* ── 쓴다 ─────────────────────────────────────────────────────────── */
async function putDoc(collection, id, data) {
  const r = await fetch(BASE + '/' + collection + '/' + encodeURIComponent(id), {
    method: 'PATCH', headers: { ...H, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { value: { stringValue: JSON.stringify(data) } } }),
  });
  return r.ok ? null : r.status;
}
let 됨 = 0, 막 = 0;
for (const x of 쓸것) {
  const bad = await putDoc('items', x.code, x.doc);
  if (bad === null) 됨++;
  else { 막++; if (막 <= 3) console.log('  🔴 ' + x.code + ' — http ' + bad); if (bad === 403) break; }
}
/* 🔴 창고를 바꿨으면 «바뀌었다»고 적어 둔다 — 브라우저들이 이 값 하나를 보고 다시 읽는다. */
if (됨) await putDoc('kv', 'itemsVer', String(Date.now()));
console.log('\n  ' + (막 ? '🔴' : '✅') + ' 고친 것 ' + 됨 + '건' + (막 ? ' · 막힌 것 ' + 막 + '건' : '')
  + (됨 ? ' · 버전 표시를 올렸습니다(브라우저가 다음에 열 때 새로 읽습니다)' : '') + '\n');
