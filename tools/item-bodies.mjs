// 원본 «본문» 을 코드 심는 김에 같이 낸다 (2026-09-05)
//
//   node tools/item-bodies.mjs <코드심긴.hwpx> --out 본문.json [--push]
//
// 보통은 따로 부를 일이 없다 — `item-code-stamp.mjs` 가 코드를 심은 «그 자리에서» 부른다.
// 사용자가 말한 「추후에 업로드하는 게 아니라 코드 삽입할 때 같이 저장」이 이것이다.
//
// 🔴 **문항을 가르고 글을 뽑는 규칙은 여기 없다.** 루트 `hwpx.js` 하나뿐이고,
//    웹 화면(「교재에서 본문 채우기」)이 부르는 것과 **같은 함수**다.
//    그래서 웹에서 올렸을 때와 도구로 냈을 때의 본문이 한 글자도 안 갈린다.
//
// 🔴 **정답과 해설은 안 담는다.** 담는 것은 `code` 와 `content` 뿐이다.
//    (장부에서 정답을 뺀 것과 같은 까닭 — 다만 여기는 이유가 하나 더 있다:
//     `items` 는 «원본 본문»을 두는 자리고, 정답은 시험지로 올릴 때 problemBank 로 들어온다.)
//
// ⚠ `--out` 으로 낸 파일에는 **문항 본문이 그대로 들어 있다.** 저장소에 올리지 말 것.
//    (`.gitignore` 에 `*-bodies.json` 을 넣어 두었다.)

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadHwpxRules, problemsFromHwpx } from './hwpx-node.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

/* 열쇠는 index.html 에서 읽는다 — 두 곳에 적어 두면 한쪽만 바뀐다. */
function firebaseConfig() {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const apiKey = (html.match(/apiKey:\s*"([^"]+)"/) || [])[1];
  const projectId = (html.match(/projectId:\s*"([^"]+)"/) || [])[1];
  if (!apiKey || !projectId) throw new Error('index.html 에서 firebase 설정을 못 읽었습니다.');
  return { apiKey, projectId };
}

/* 웹과 같은 길로 들어간다 — 익명 로그인. 규칙이 `request.auth != null` 이라 토큰이 있어야 한다. */
async function signInAnonymously(apiKey) {
  const res = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=' + apiKey, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ returnSecureToken: true }),
  });
  if (!res.ok) throw new Error('익명 로그인 실패 (http ' + res.status + ') — ' + (await res.text()).slice(0, 200));
  return (await res.json()).idToken;
}

/* ⚠ **웹의 dbSetDoc 과 «같은 모양»으로 써야 한다** — 문서 하나에 `value` 필드 하나뿐이고
   그 안에 JSON 을 글자로 넣는다. 모양이 다르면 웹이 읽을 때 조용히 빈 것으로 본다. */
async function putDoc(projectId, token, collection, id, data) {
  const url = 'https://firestore.googleapis.com/v1/projects/' + projectId
    + '/databases/(default)/documents/' + collection + '/' + encodeURIComponent(id);
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { value: { stringValue: JSON.stringify(data) } } }),
  });
  return res.ok ? null : res.status;
}

function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/* hwpx 하나에서 «코드가 심긴 문항»의 본문을 뽑는다.
   ⚠ 코드가 없는 것은 조용히 버리지 않고 «몇 개인지» 돌려준다 — 심기가 빗나갔을 때
     그 수가 유일한 신호다. */
export function bodiesFromHwpx(hwpxPath) {
  const rules = loadHwpxRules();
  const { problems, endnoteCount, watermarkedCount } = problemsFromHwpx(hwpxPath, rules);
  const items = [];
  let noCode = 0, noBody = 0;
  for (const p of problems) {
    if (!p.itemCode) { noCode++; continue; }
    if (!p.content || !p.content.trim()) { noBody++; continue; }
    items.push({ code: p.itemCode, content: p.content });
  }
  return { items, total: problems.length, endnoteCount, watermarkedCount, noCode, noBody };
}

export async function pushBodies(items, { quiet = false } = {}) {
  const { apiKey, projectId } = firebaseConfig();
  const token = await signInAnonymously(apiKey);
  const updatedAt = stamp();
  let saved = 0, blocked = 0, failed = 0;
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const bad = await putDoc(projectId, token, 'items', it.code, { code: it.code, content: it.content, updatedAt });
    if (bad === null) saved++;
    else if (bad === 403) { blocked++; break; }   // 규칙이 막혀 있으면 564번 두드릴 까닭이 없다
    else failed++;
    if (!quiet && i % 20 === 0) process.stdout.write(`\r  올리는 중… ${i + 1} / ${items.length}`);
  }
  if (!quiet) process.stdout.write('\r' + ' '.repeat(40) + '\r');
  return { saved, blocked, failed };
}

/* 코드 심기가 끝난 자리에서 부른다. 화면에 그대로 찍히는 말까지 여기서 낸다 —
   부르는 쪽(stamp 도구)이 결과를 해석하지 않게 하려는 것이다. */
export async function emitBodies(hwpxPath, outJson, push) {
  const r = bodiesFromHwpx(hwpxPath);
  if (outJson) {
    fs.writeFileSync(outJson, JSON.stringify(
      { updatedAt: stamp(), source: path.basename(hwpxPath), count: r.items.length, items: r.items },
      null, 2), 'utf8');
  }
  console.log(`\n  본문        문항 ${r.total} 개 중 코드가 붙은 ${r.items.length} 개를 담았다`);
  /* 🔴 **«코드 없는 덩이»를 그대로 경고로 내면 안 된다** (2026-09-05에 실제로 겪었다).
     교재의 맨 앞 목차·표지는 첫 미주 «앞»에 있어서 언제나 한 덩이가 코드 없이 잡힌다.
     그것까지 「심기가 빗나갔다」고 부르면 **다섯 파일이 전부 경고를 달고 나오는데 실은 멀쩡했다.**
     🔵 진짜 잣대는 **미주 수와 코드 붙은 수가 같은가**다 — 문항 하나에 미주 하나이므로.
     ⚠ 경고는 «걱정할 것»만 가리켜야 한다. 늘 뜨는 경고는 아무도 안 본다. */
  if (r.endnoteCount === r.items.length) {
    console.log(`  ✅ 미주 ${r.endnoteCount}개와 딱 맞는다 — 빠진 문항이 없다`
      + (r.noCode ? `  (앞의 ${r.noCode}덩이는 목차·표지다)` : ''));
  } else {
    console.log(`  🔴 미주는 ${r.endnoteCount}개인데 코드가 붙은 것은 ${r.items.length}개다 — ${r.endnoteCount - r.items.length}개가 빈다.`);
    console.log('     심기가 빗나갔는지 봐야 한다 (다시 심기 전에 매핑표부터 볼 것).');
  }
  if (r.noBody) console.log(`  ⚠ 본문이 빈 문항 ${r.noBody}건`);
  if (outJson) console.log(`  냈다 → ${outJson}  (${(fs.statSync(outJson).size / 1024).toFixed(0)}KB)`);

  if (!push) {
    console.log('  ⓘ 올리려면 --push 를 붙이거나, 웹의 「교재에서 본문 채우기」로 이 hwpx 를 올린다.');
    return r;
  }
  const p = await pushBodies(r.items);
  if (p.blocked) {
    console.log(`\n  🔴 Firestore 가 막고 있다 (403) — ${p.saved}개까지만 올라갔다.`);
    console.log('     콘솔 › Firestore › 규칙에 아래를 더하고 «게시» 해야 한다:');
    console.log('       match /items/{doc}    { allow read, write: if request.auth != null; }');
    console.log('       match /variants/{doc} { allow read, write: if request.auth != null; }');
  } else if (p.failed) {
    console.log(`\n  ⚠ ${p.saved}개를 올렸고 ${p.failed}개는 실패했다.`);
  } else {
    console.log(`\n  올렸다      items ${p.saved}개`);
  }
  return r;
}

// ── 혼자 부를 때 ──────────────────────────────────────────────────────
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  const src = argv.find((a) => !a.startsWith('--'));
  const oi = argv.indexOf('--out');
  const out = oi >= 0 ? argv[oi + 1] : '';
  if (!src) {
    console.error('쓰는 법: node tools/item-bodies.mjs <코드심긴.hwpx> --out 본문.json [--push]');
    process.exit(1);
  }
  await emitBodies(src, out, argv.includes('--push'));
}
