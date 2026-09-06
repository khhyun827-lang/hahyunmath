// 코드가 심긴 hwpx 하나를 창고(items)로 «합쳐» 올린다 (2026-09-06)
//
//   node tools/hwpx-push.mjs "<코드심긴.hwpx>"           ← 재보기만 한다(아무것도 안 쓴다)
//   node tools/hwpx-push.mjs "<코드심긴.hwpx>" --push    ← 실제로 올린다
//
// 🔵 **왜 따로 뒀나** — `items-push.mjs` 는 «엔딩크레딧 다섯 파일 + 빠른정답표»에 맞춰져 있고
//   500건 미만이면 스스로 멈춘다. 교재 «한 파일»을 들일 때 쓸 것이 없었다.
//
// 🔴 **덮어쓰지 않고 «합친다».** `dbSetDoc` 은 문서를 통째로 갈아 끼우므로 여기서 빠뜨린
//   것은 **지워진다**. 그림 54개와 정답 564개를 날릴 뻔한 자리가 이미 한 번 있었다.
// 🔴 **정답은 «이미 담긴 것»이 언제나 이긴다** — 웹의 `itemAnswerToKeep` 과 같은 규칙이다.
//   미주가 딱 ①~⑤ 하나일 때만 새로 받는다(주관식 미주는 뒤에 해설이 통째로 붙어 온다).
// ⚠ **그림은 여기서 못 올린다** — 드라이브 업로드는 브라우저의 일이다.
//   그림이 필요한 문항이 몇 개인지 «말해 주고», 그건 웹의 「교재 올리기」로 하라고 알린다.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import { execFileSync } from 'child_process';
import { sectionDocs, loadHwpxRules } from './hwpx-node.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = process.argv.slice(2).find((a) => !a.startsWith('--'));
const 쓸까 = process.argv.includes('--push');
if (!SRC) { console.error('쓰는 법: node tools/hwpx-push.mjs "<코드심긴.hwpx>" [--push]'); process.exit(1); }

const R = loadHwpxRules();
const { problems, watermarkedCount, watermarked } = R.hwpxProblemsFromDocs(sectionDocs(SRC));
/* 🔴 **딱지(OR·NC·UP·DW)도 «그림»으로 세면 안 된다** (2026-09-06에 바로잡았다).
   처음에는 `p.pics` 를 그대로 세어 「그림이 필요한 문항 71개」라고 말했는데, 실제로 그림이
   있는 것은 **42개**다(브라우저에서 실측). 71은 «딱지가 문항마다 하나씩 붙어서» 나온 수다.
   → 브라우저와 **같은 방법**으로 장식을 걸러 낸다 — 바이트의 «길이 + 앞부분 해시»를 열쇠로
     삼아, 문서 안에서 여러 벌로 나오는 것을 장식으로 본다(`hwpxMarkDecorPics`).
   ⚠ 이름(`image8`)으로 세면 안 된다 — 한글은 같은 딱지를 여러 벌로 따로 저장한다. */
{
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hwpxpush-'));
  execFileSync('unzip', ['-qo', SRC, '-d', tmp]);
  const hpf = fs.existsSync(path.join(tmp, 'Contents', 'content.hpf'))
    ? fs.readFileSync(path.join(tmp, 'Contents', 'content.hpf'), 'utf8') : '';
  const 열쇠 = {};
  for (const m of hpf.matchAll(/id="([^"]+)"[^>]*href="([^"]+)"/g)) {
    if (/^Contents\//.test(m[2])) continue;
    const f = path.join(tmp, decodeURIComponent(m[2]));
    if (!fs.existsSync(f) || !fs.statSync(f).isFile()) continue;
    const u8 = fs.readFileSync(f);
    let h = 0x811c9dc5;
    const n = Math.min(u8.length, 4096);
    for (let i = 0; i < n; i++) { h ^= u8[i]; h = Math.imul(h, 0x01000193) >>> 0; }
    열쇠[m[1]] = u8.length + ':' + h.toString(16);
  }
  R.hwpxMarkDecorPics(problems, (ref) => 열쇠[ref] || ref);
}

const 있는것 = problems.filter((p) => p.itemCode && (p.content || '').trim());
console.log('\n  ' + path.basename(SRC));
console.log('  덩이 ' + problems.length + ' · 코드가 붙은 문항 ' + 있는것.length
  + (watermarkedCount ? ' · ⚠ 저작권 표시로 걸러진 것 ' + watermarkedCount + ' ' + JSON.stringify(watermarked) : ''));
if (!있는것.length) { console.error('\n🔴 코드가 심긴 문항이 없습니다 — 코드를 심은 파일이 맞습니까?\n'); process.exit(2); }

/* ②꼴은 코드가 과목·단원을 말해 주지 않는다 — 웹과 «같은 규칙»으로 파일 이름에서 읽는다. */
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const 함수 = (n) => { const at = html.indexOf('function ' + n + '('); let d = 0;
  for (let j = html.indexOf('{', at); j < html.length; j++) { if (html[j] === '{') d++; else if (html[j] === '}') { d--; if (!d) return html.slice(at, j + 1); } } };
const 떠오기 = (a, b) => { const i = html.indexOf(a); return html.slice(i, html.indexOf(b, i) + b.length); };
const NL = String.fromCharCode(10);
const W = new Function('UNIT_CHAPTER_DEFS', 'CODE_SUBJECTS', 'BOOK_OF_CODE',
  떠오기('const SRC_CODE_RE', "DW:'하향' };") + NL + 함수('srcCodeInfo') + NL +
  함수('codeOfSubjectName') + NL + 함수('srcChapterFromFileName') + NL + 함수('itemAnswerToKeep') + NL +
  'return { srcCodeInfo, srcChapterFromFileName, itemAnswerToKeep };')(
  new Function(떠오기('const UNIT_CHAPTER_DEFS = {', NL + '};') + ' return UNIT_CHAPTER_DEFS;')(),
  new Function(떠오기('const CODE_SUBJECTS = {', '};') + ' return CODE_SUBJECTS;')(),
  new Function(떠오기('const BOOK_OF_CODE', '};') + ' return BOOK_OF_CODE;')());

const 기출 = 있는것.filter((p) => W.srcCodeInfo(p.itemCode));
let 자리 = null;
if (기출.length) {
  자리 = W.srcChapterFromFileName(path.basename(SRC));
  if (!자리.ok) { console.error('\n🔴 멈춥니다 — ' + 자리.흠 + '\n'); process.exit(2); }
  console.log('  단원 ' + 자리.chapter + ' 「' + 자리.chapterName + '」 · 과목 ' + 자리.subject + ' (파일 이름에서)');
}

/* ── 창고를 읽는다 ─────────────────────────────────────────────────── */
const apiKey = (html.match(/apiKey:\s*"([^"]+)"/) || [])[1];
const projectId = (html.match(/projectId:\s*"([^"]+)"/) || [])[1];
const BASE = 'https://firestore.googleapis.com/v1/projects/' + projectId + '/databases/(default)/documents';
const a0 = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=' + apiKey,
  { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ returnSecureToken: true }) });
if (!a0.ok) { console.error('🔴 로그인 실패 — ' + a0.status); process.exit(1); }
const H = { Authorization: 'Bearer ' + (await a0.json()).idToken };
const 창고 = {};
for (let pt = ''; ;) {
  const r = await fetch(BASE + '/items?pageSize=300' + (pt ? '&pageToken=' + pt : ''), { headers: H });
  if (!r.ok) { console.error('🔴 창고를 못 읽었습니다 — http ' + r.status); process.exit(1); }
  const j = await r.json();
  for (const d of (j.documents || [])) {
    const id = d.name.split('/').pop();
    try { 창고[id] = JSON.parse(d.fields?.value?.stringValue || '{}'); } catch (e) { }
  }
  if (!j.nextPageToken) break;
  pt = j.nextPageToken;
}

/* ── 합친다 ───────────────────────────────────────────────────────── */
const 오늘 = new Date().toISOString().slice(0, 10);
const 쓸것 = [];
let 새것 = 0, 본문바뀜 = 0, 정답채움 = 0, 그림지킴 = 0, 그림필요 = 0;
for (const p of 있는것) {
  const 옛 = 창고[p.itemCode] || null;
  const doc = Object.assign({}, 옛 || {}, { code: p.itemCode, content: p.content, updatedAt: 오늘 });
  const 정답 = W.itemAnswerToKeep(옛, p.answer);
  if (정답) doc.answer = 정답; else delete doc.answer;
  if (!옛) 새것++;
  else if ((옛.content || '') !== p.content) 본문바뀜++;
  if (정답 && !(옛 && 옛.answer)) 정답채움++;
  if (옛 && (옛.image || 옛.images)) 그림지킴++;
  else if ((p.pics || []).length) 그림필요++;
  const s = W.srcCodeInfo(p.itemCode);
  if (s && 자리) {
    doc.subject = 자리.subject; doc.chapter = 자리.chapter; doc.chapterName = 자리.chapterName;
    doc.badge = s.badge;
    doc.source = { book: '모의고사 기출', label: s.label };
  }
  쓸것.push(doc);
}
console.log('\n  창고에 지금 있는 것   ' + Object.keys(창고).length + '개');
console.log('  올릴 것              ' + 쓸것.length + '개');
console.log('    창고에 없던 것      ' + 새것);
console.log('    본문이 바뀌는 것    ' + 본문바뀜);
console.log('    정답이 새로 채워짐  ' + 정답채움);
console.log('    🔵 그림을 지켜 옮김 ' + 그림지킴);
if (그림필요) console.log('    ⚠ 그림이 있어야 하는데 창고에 없는 것 ' + 그림필요
  + '개 — **드라이브 업로드는 브라우저의 일이라 여기선 못 한다.**\n      웹의 문항 창고 › 「＋ 교재 올리기」로 같은 파일을 올리면 그림까지 담긴다.');

if (쓸것.some((x) => !x.content || !x.content.trim())) { console.error('\n🔴 멈춥니다 — 본문이 빈 문서가 있습니다.\n'); process.exit(1); }
if (!쓸까) { console.log('\n  ⓘ 재보기만 했습니다. 실제로 올리려면 --push 를 붙이세요.\n'); process.exit(0); }

async function putDoc(collection, id, data) {
  const r = await fetch(BASE + '/' + collection + '/' + encodeURIComponent(id), {
    method: 'PATCH', headers: { ...H, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { value: { stringValue: JSON.stringify(data) } } }),
  });
  return r.ok ? null : r.status;
}
let 됨 = 0, 막 = 0;
for (const x of 쓸것) {
  const bad = await putDoc('items', x.code, x);
  if (bad === null) 됨++;
  else { 막++; if (막 <= 3) console.log('  🔴 ' + x.code + ' — http ' + bad); if (bad === 403) break; }
}
/* 🔴 창고를 바꿨으면 «바뀌었다»고 적어 둔다 — 브라우저들이 이 값 하나를 보고 다시 읽는다. */
if (됨) await putDoc('kv', 'itemsVer', String(Date.now()));
console.log('\n  ' + (막 ? '🔴' : '✅') + ' 올린 것 ' + 됨 + '개' + (막 ? ' · 막힌 것 ' + 막 : '')
  + (됨 ? ' · 버전 표시를 올렸습니다' : '') + '\n');
