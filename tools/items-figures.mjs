// 선지가 통째로 그림인 문항의 «그림 전부»를 올린다 (2026-09-04)
//
//   node tools/items-figures.mjs              ← 재보기만
//   node tools/items-figures.mjs --push       ← 실제로 올린다
//
// 🔴 **왜 따로인가** — `items` 는 그림 칸이 하나(`image`)뿐이라, 선지가 다섯 장인 문항은
//    **첫 장만 담고 나머지를 버렸다.** 게다가 그 한 장은 «문항 그림»이 아니라 ①번 선지라
//    보여 주면 오히려 틀린 그림이 된다(사용자가 K2-02-E-0083 에서 짚었다).
//    → `images: [{url, fileId}, …]` 로 여러 장을 담는다. 화면은 번호를 달아 늘어놓는다.
//
// ⚠ 실측 3문항뿐이다(5·6·6장). 그래서 «본문 올리기»(items-push)와 섞지 않고 따로 뒀다 —
//   드라이브에 실제로 올리는 일이라 조건이 다르고, 잘못 돌리면 같은 그림이 쌓인다.
// ⚠ 이미 `images` 가 있는 문항은 건너뛴다. 두 번 돌려도 안 쌓인다.

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { problemsFromHwpx, contentsDir } from './hwpx-node.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const 교재폴더 = path.join(ROOT, '교재 코드파일');
const 쓸까 = process.argv.includes('--push');

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const apiKey = (html.match(/apiKey:\s*"([^"]+)"/) || [])[1];
const projectId = (html.match(/projectId:\s*"([^"]+)"/) || [])[1];
const WORKER = (html.match(/AI_WORKER_URL = '([^']+)'/) || [])[1];
if (!apiKey || !projectId || !WORKER) throw new Error('index.html 에서 설정을 못 읽었습니다.');

const r0 = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=' + apiKey,
  { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ returnSecureToken: true }) });
const token = (await r0.json()).idToken;
const BASE = 'https://firestore.googleapis.com/v1/projects/' + projectId + '/databases/(default)/documents';
const H = { Authorization: 'Bearer ' + token };

/* 그림 참조(binaryItemIDRef) → 파일 경로. picKeyMap 과 같은 자리를 읽는다. */
function 그림경로(cdir) {
  const 표 = {};
  const hpf = path.join(cdir, 'content.hpf');
  if (!fs.existsSync(hpf)) return 표;
  const src = fs.readFileSync(hpf, 'utf8');
  const root = path.dirname(cdir);
  for (const m of src.matchAll(/<opf:item[^>]*id="([^"]+)"[^>]*href="([^"]+)"/g)) {
    const a = path.join(cdir, m[2]), b = path.join(root, m[2]);
    if (fs.existsSync(a)) 표[m[1]] = a; else if (fs.existsSync(b)) 표[m[1]] = b;
  }
  return 표;
}

/* 지금 창고 */
const 있던것 = {};
{
  let pt = '';
  do {
    const r = await fetch(BASE + '/items?pageSize=300' + (pt ? '&pageToken=' + pt : ''), { headers: H });
    const j = await r.json();
    for (const d of (j.documents || [])) { const v = JSON.parse(d.fields.value.stringValue); if (v && v.code) 있던것[v.code] = v; }
    pt = j.nextPageToken || '';
  } while (pt);
}

/* 그림이 둘 이상인 문항 찾기 */
const 할것 = [];
for (const f of fs.readdirSync(교재폴더).filter(x => x.endsWith('.hwpx')).sort()) {
  const full = path.join(교재폴더, f);
  const { problems } = problemsFromHwpx(full);
  const 여럿 = problems.filter(p => p.itemCode && (p.pics || []).filter(x => !x.decor).length > 1);
  if (!여럿.length) continue;
  const 경로 = 그림경로(contentsDir(full));
  for (const p of 여럿) {
    const refs = (p.pics || []).filter(x => !x.decor).map(x => x.ref || x.v || x).filter(Boolean);
    const 파일 = refs.map(r => 경로[r]).filter(Boolean);
    할것.push({ code: p.itemCode, refs, 파일 });
  }
}

console.log('\n선지가 그림인 문항 ' + 할것.length + '개');
for (const x of 할것) {
  const 이미 = (있던것[x.code] || {}).images;
  console.log('  ' + x.code + '  그림 ' + x.refs.length + '개 · 파일을 찾은 것 ' + x.파일.length
    + (이미 ? '  (이미 올려 둠 — 건너뜁니다)' : ''));
}
const 남은 = 할것.filter(x => !(있던것[x.code] || {}).images && x.파일.length === x.refs.length);
const 못찾음 = 할것.filter(x => x.파일.length !== x.refs.length);
if (못찾음.length) console.log('\n  ⚠ 파일을 다 못 찾은 것 ' + 못찾음.length + '개 — 건너뜁니다.');
console.log('\n올릴 것 ' + 남은.length + '문항 · 그림 ' + 남은.reduce((n, x) => n + x.파일.length, 0) + '장');
if (!쓸까) { console.log('\n  ⓘ 재보기만 했습니다. 올리려면 --push 를 붙이세요.\n'); process.exit(0); }

async function 올리기(파일) {
  const fd = new FormData();
  fd.append('file', new Blob([fs.readFileSync(파일)]), 'img_' + crypto.randomBytes(4).toString('hex') + path.extname(파일));
  const res = await fetch(WORKER + '/upload', { method: 'POST', headers: H, body: fd });
  if (!res.ok) throw new Error('upload http ' + res.status + ' ' + (await res.text()).slice(0, 120));
  return res.json();   // {url, fileId}
}
async function putDoc(id, data) {
  const r = await fetch(BASE + '/items/' + encodeURIComponent(id), {
    method: 'PATCH', headers: { ...H, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { value: { stringValue: JSON.stringify(data) } } }),
  });
  return r.ok ? null : r.status;
}

let 됨 = 0;
for (const x of 남은) {
  const imgs = [];
  for (const f of x.파일) { imgs.push(await 올리기(f)); process.stdout.write('.'); }
  /* 🔴 있던 것 위에 얹는다 — 본문·정답이 살아남는다. */
  const doc = Object.assign({}, 있던것[x.code], { images: imgs });
  delete doc.image;                       // 첫 장만 담던 옛 칸은 지운다 — 틀린 그림이었다
  const bad = await putDoc(x.code, doc);
  console.log(bad === null ? '  ✓ ' + x.code + ' — ' + imgs.length + '장' : '  🔴 ' + x.code + ' — http ' + bad);
  if (bad === null) 됨++;
}
if (됨) {
  await fetch(BASE + '/kv/itemsVer', { method: 'PATCH', headers: { ...H, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { value: { stringValue: JSON.stringify(String(Date.now())) } } }) });
}
console.log('\n  올렸습니다 ' + 됨 + '문항\n');
