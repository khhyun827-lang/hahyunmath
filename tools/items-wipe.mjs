// 창고(items)에서 «한 교재»를 통째로 걷어낸다 (2026-09-06)
//
//   node tools/items-wipe.mjs 기출            ← ②꼴(모의고사 기출). 세기만 한다
//   node tools/items-wipe.mjs D --push        ← 책 자리가 D 인 것(동그랑땡)을 실제로 지운다
//
// 🔴 **되돌릴 수 없다.** 돌리기 전에 `node tools/backup.mjs <폴더>` 를 받아 둘 것.
// 🔵 처음에는 `jugina-wipe.mjs` 라는 주기나 전용 도구였다 — 두 번째 교재를 걷어내려니
//   똑같은 것을 또 쓸 뻔했다. **같은 일을 두 벌로 두지 않는다**(이 저장소가 여러 번 겪은 것).
//
// ⚠ **시험지 본문은 안 지워진다** — 그건 `problembank` 에 따로 산다.
//   지워지는 것은 «창고 사본»(본문·정답·그림 연결)뿐이고, 그러면 문항 코드 화면에서
//   그 코드가 「아직 창고에 없는 코드」로 뜬다. 그것이 이 도구가 하는 일의 전부다.
// ⚠ 드라이브 그림 파일은 안 지운다 — 지우는 것이 더 위험하고, 다시 올리면 새로 붙는다.

import fs from 'fs';
const 인자 = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const 쓸까 = process.argv.includes('--push');
const 무엇 = 인자[0];
if (!무엇) {
  console.error('쓰는 법: node tools/items-wipe.mjs <기출 | 책글자(D·E·S·A·R…)> [--push]');
  process.exit(1);
}
/* 어떤 코드를 걷어낼 것인가 — 두 꼴을 다 받는다. */
const 고르기 = 무엇 === '기출'
  ? { 이름: '모의고사 기출(②꼴)', 맞나: (c) => /^[12]\d{6}/.test(c) }
  : { 이름: '책 «' + 무엇 + '»', 맞나: (c) => new RegExp('^[A-Z]{1,2}\\d?-\\d{2}-' + 무엇 + '-\\d{4}').test(c) };

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

const items = await 읽기('items'), variants = await 읽기('variants'), pb = await 읽기('problembank');
const 지울문항 = Object.keys(items).filter(고르기.맞나);
const 지울변형 = Object.keys(variants).filter((k) => 고르기.맞나(k) || 고르기.맞나(String(variants[k].originCode || '')));
console.log('\n  ' + 고르기.이름 + ' — 창고 ' + Object.keys(items).length + '건 중 ' + 지울문항.length + '건');
if (!지울문항.length && !지울변형.length) { console.log('  걷어낼 것이 없습니다.\n'); process.exit(0); }
console.log('  변형(variants) ' + 지울변형.length + '개' + (지울변형.length ? ' — ' + 지울변형.join(' ') : ''));
console.log('  그림이 붙은 것 ' + 지울문항.filter((c) => items[c].image || items[c].images).length
  + ' · 정답이 든 것 ' + 지울문항.filter((c) => items[c].answer).length);

/* 🔵 시험지가 가리키는 것은 «막을 일»이 아니라 «알려 줄 일»이다 — 시험지 본문은 안 지워진다. */
const 가리킴 = Object.keys(pb).filter((id) => {
  const c = String(pb[id].itemCode || ''); if (!c) return false;
  const 뿌리 = c.replace(/-[NUD]\d{2}$/, '');
  return 고르기.맞나(c) || 고르기.맞나(뿌리);
});
if (가리킴.length) {
  console.log('\n  ⚠ 시험지 문항 ' + 가리킴.length + '개가 이 코드를 가리키고 있습니다.');
  console.log('    **시험지 본문은 안 지워집니다** — 창고 사본만 없어지고, 그 코드는');
  console.log('    문항 코드 화면에서 「아직 창고에 없는 코드」로 뜹니다.');
}
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
