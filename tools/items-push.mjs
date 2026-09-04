// 교재 hwpx + 빠른정답표 → Firestore `items` 로 «합쳐» 올린다 (2026-09-04)
//
//   node tools/items-push.mjs              ← 재보기만 한다(아무것도 안 쓴다)
//   node tools/items-push.mjs --push       ← 실제로 올린다
//
// 🔴 **덮어쓰지 않고 «합친다».** `items` 문서 하나에 본문·정답·그림이 같이 산다.
//    기존 `tools/item-bodies.mjs --push` 는 `{code, content, updatedAt}` 만 써서
//    **그림 54개와 정답 564개를 통째로 날린다.** 그래서 이 도구를 따로 뒀다.
//    (dbSetDoc 은 문서를 통째로 갈아 끼운다 — 빠뜨린 필드는 지워진다.)
//
// 🔵 웹의 「교재에서 본문 채우기」와 **같은 파서**를 쓴다(hwpx.js 하나). 어느 길로 담아도 같다.
// ⚠ **그림은 여기서 못 만든다** — 드라이브 업로드가 필요하고 그건 브라우저의 일이다.
//    이미 올라가 있는 그림은 **그대로 지킨다.**

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { problemsFromHwpx } from './hwpx-node.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const 교재폴더 = path.join(ROOT, '교재 코드파일');
const 정답파일 = path.join(교재폴더, 'answer-key.json');
const 쓸까 = process.argv.includes('--push');

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const apiKey = (html.match(/apiKey:\s*"([^"]+)"/) || [])[1];
const projectId = (html.match(/projectId:\s*"([^"]+)"/) || [])[1];
const BASE = 'https://firestore.googleapis.com/v1/projects/' + projectId + '/databases/(default)/documents';

const res0 = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=' + apiKey,
  { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ returnSecureToken: true }) });
if (!res0.ok) throw new Error('익명 로그인 실패 (http ' + res0.status + ')');
const token = (await res0.json()).idToken;
const H = { Authorization: 'Bearer ' + token };

/* ── ① 지금 창고에 있는 것을 «먼저» 읽는다 ────────────────────────────
   🔴 읽지 않고 쓰면 그림이 날아간다. 564건을 읽는 값을 치르더라도 이건 읽어야 한다. */
const 있던것 = {};
{
  let pt = '';
  do {
    const r = await fetch(BASE + '/items?pageSize=300' + (pt ? '&pageToken=' + pt : ''), { headers: H });
    if (r.status === 404) break;
    if (!r.ok) throw new Error('items 읽기 실패 http ' + r.status);
    const j = await r.json();
    for (const d of (j.documents || [])) {
      const v = JSON.parse(d.fields.value.stringValue);
      if (v && v.code) 있던것[v.code] = v;
    }
    pt = j.nextPageToken || '';
  } while (pt);
}

/* ── ② 교재에서 본문을 뽑는다 (웹과 같은 파서) ───────────────────────── */
const 본문 = {};
const 파일별 = [];
for (const f of fs.readdirSync(교재폴더).filter(x => x.endsWith('.hwpx')).sort()) {
  const { problems } = problemsFromHwpx(path.join(교재폴더, f));
  let n = 0;
  for (const p of problems) {
    if (!p.itemCode || !p.content || !p.content.trim()) continue;
    본문[p.itemCode] = p.content;
    n++;
  }
  파일별.push([f.replace(/^.*\]/, '').replace('.hwpx', ''), n]);
}

/* ── ③ 정답표 ────────────────────────────────────────────────────── */
const 정답 = {};
if (fs.existsSync(정답파일)) {
  for (const r of JSON.parse(fs.readFileSync(정답파일, 'utf8')).items || []) {
    if (r.code && r.answer) 정답[r.code] = r.answer;
  }
} else console.log('  ⚠ answer-key.json 이 없습니다 — 정답은 건드리지 않습니다.');

/* ── ④ 합친다 ────────────────────────────────────────────────────── */
const p2 = (n) => String(n).padStart(2, '0');
const d = new Date();
const stamp = `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}`;
const 쓸것 = [];
let 본문바뀜 = 0, 정답채움 = 0, 그림지킴 = 0, 그대로 = 0;
for (const code of Object.keys(본문).sort()) {
  const 옛 = 있던것[code] || {};
  const doc = { code, content: 본문[code], updatedAt: stamp };
  /* 🔴 **그림은 그대로 옮겨 싣는다** — 여기서 빠뜨리면 지워진다. */
  if (옛.image) { doc.image = 옛.image; 그림지킴++; }
  /* 정답은 표가 있으면 표를, 없으면 있던 것을 지킨다. */
  const a = 정답[code] || 옛.answer || '';
  if (a) doc.answer = a;
  if (a && !옛.answer) 정답채움++;
  if (옛.content !== 본문[code]) 본문바뀜++; else 그대로++;
  쓸것.push(doc);
}
const 사라질뻔 = Object.keys(있던것).filter(c => !본문[c]);

console.log('\n교재에서 뽑은 본문');
for (const [f, n] of 파일별) console.log('  ' + f.padEnd(14) + String(n).padStart(4) + '문항');
console.log('\n창고에 지금 있는 것   ' + Object.keys(있던것).length + '개');
console.log('올릴 것              ' + 쓸것.length + '개');
console.log('  본문이 바뀌는 것    ' + 본문바뀜);
console.log('  본문이 그대로인 것  ' + 그대로);
console.log('  정답이 새로 채워짐  ' + 정답채움);
console.log('  🔵 그림을 지켜 옮김 ' + 그림지킴);
if (사라질뻔.length) console.log('  ⚠ 교재에 없는 코드   ' + 사라질뻔.length + '개 — 손대지 않습니다 (' + 사라질뻔.slice(0, 5).join(', ') + ')');

/* ── ⑤ 🔴 올리기 전에 스스로 막는다 ──────────────────────────────── */
const 막힘 = [];
if (쓸것.length < 500) 막힘.push('올릴 것이 ' + 쓸것.length + '개뿐입니다 (564 언저리여야 합니다)');
if (Object.keys(있던것).length && 그림지킴 < Object.values(있던것).filter(v => v.image).length)
  막힘.push('그림을 다 못 옮겼습니다');
if (쓸것.some(x => !x.content || !x.content.trim())) 막힘.push('본문이 빈 문서가 있습니다');
if (막힘.length) { console.log('\n🔴 멈춥니다 —\n  ' + 막힘.join('\n  ') + '\n'); process.exit(1); }

if (!쓸까) { console.log('\n  ⓘ 재보기만 했습니다. 실제로 올리려면 --push 를 붙이세요.\n'); process.exit(0); }

/* ── ⑥ 올린다 ────────────────────────────────────────────────────── */
async function putDoc(collection, id, data) {
  const r = await fetch(BASE + '/' + collection + '/' + encodeURIComponent(id), {
    method: 'PATCH', headers: { ...H, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { value: { stringValue: JSON.stringify(data) } } }),
  });
  return r.ok ? null : r.status;
}
let 됨 = 0, 막 = 0;
for (let i = 0; i < 쓸것.length; i++) {
  const bad = await putDoc('items', 쓸것[i].code, 쓸것[i]);
  if (bad === null) 됨++;
  else { 막++; if (막 <= 3) console.log('  🔴 ' + 쓸것[i].code + ' — http ' + bad); if (bad === 403) break; }
  if (i % 25 === 0) process.stdout.write('\r  올리는 중… ' + (i + 1) + ' / ' + 쓸것.length);
}
process.stdout.write('\r' + ' '.repeat(40) + '\r');
/* 🔴 창고를 바꿨으면 «바뀌었다»고 적어 둔다 — 브라우저들이 이 값 하나를 보고 다시 읽는다. */
if (됨) {
  const bad = await putDoc('kv', 'itemsVer', String(Date.now()));
  console.log(bad === null ? '  버전 표시를 올렸습니다 — 브라우저가 다음에 열 때 새로 읽습니다.'
                           : '  ⚠ 버전 표시를 못 올렸습니다 (http ' + bad + ') — 최대 12시간 뒤에 맞습니다.');
}
console.log('\n  올렸습니다   ' + 됨 + '개' + (막 ? ' · 막힌 것 ' + 막 : '') + '\n');
process.exit(막 ? 1 : 0);
