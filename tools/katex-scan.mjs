// 창고의 수식을 «실제로 그려 봐서» 빨갛게 뜨는 것을 센다 (2026-09-06)
//
//   node tools/katex-scan.mjs                 ← 창고를 읽어 지금 상태를 센다
//   node tools/katex-scan.mjs --repair        ← 「수식 다시 훑기」를 대면 몇 개가 남는지도 같이 센다
//
// 사용자가 짚었다 — 「쭉 훑어봐도 빨간색으로 뜬것들이 있어」.
// 🔴 **눈으로 훑는 것과 세어 보는 것은 다른 일이다.** 앱은 `throwOnError:false` 로 그리므로
//   못 읽는 수식이 **빨간 글씨**로 그 자리에 남는다 — 화면에서는 하나씩 눈에 띌 뿐이고,
//   몇 개인지·어느 문항인지는 이렇게 세어야만 안다. 09-06에 이 도구로 18개를 찾았다.
//
// ⚠ **KaTeX 를 인터넷에서 받는다** — 앱이 쓰는 것과 «같은 판»이어야 뜻이 있다(0.16.11).
//   받아 둔 것이 있으면 그것을 쓴다. 저장소에는 안 넣는다(.gitignore).
// ⚠ 읽기만 한다 — 한 줄도 쓰지 않는다.

import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { loadHwpxRules } from './hwpx-node.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const 고칠까 = process.argv.includes('--repair');
const KATEX_URL = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js';
const 받은곳 = path.join(os.tmpdir(), 'katex-0.16.11.min.js');

if (!fs.existsSync(받은곳)) {
  console.log('  KaTeX 0.16.11 을 받는 중… (' + KATEX_URL + ')');
  const r = await fetch(KATEX_URL);
  if (!r.ok) { console.error('🔴 KaTeX 를 못 받았습니다 — http ' + r.status); process.exit(1); }
  fs.writeFileSync(받은곳, Buffer.from(await r.arrayBuffer()));
}
const katex = createRequire(import.meta.url)(받은곳);
const { hwpxRepairEqText } = loadHwpxRules();

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const apiKey = (html.match(/apiKey:\s*"([^"]+)"/) || [])[1];
const projectId = (html.match(/projectId:\s*"([^"]+)"/) || [])[1];
const BASE = 'https://firestore.googleapis.com/v1/projects/' + projectId + '/databases/(default)/documents';
const a = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=' + apiKey,
  { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ returnSecureToken: true }) });
if (!a.ok) { console.error('🔴 로그인 실패 — ' + a.status); process.exit(1); }
const H = { Authorization: 'Bearer ' + (await a.json()).idToken };

const items = {};
for (let pt = ''; ;) {
  const r = await fetch(BASE + '/items?pageSize=300' + (pt ? '&pageToken=' + pt : ''), { headers: H });
  if (!r.ok) { console.error('🔴 창고를 못 읽었습니다 — http ' + r.status); process.exit(1); }
  const j = await r.json();
  for (const d of (j.documents || [])) {
    const id = d.name.split('/').pop();
    try { items[id] = JSON.parse(d.fields?.value?.stringValue || '{}'); } catch (e) { }
  }
  if (!j.nextPageToken) break;
  pt = j.nextPageToken;
}

/* 화면과 «같은 방식»으로 자른다 — renderMathInElement 가 $…$ 를 수식으로 본다. */
const 수식들 = (s) => [...String(s || '').matchAll(/\$([^$]*)\$/g)].map((m) => m[1]);
const 재기 = (뽑기) => {
  const 흠 = [];
  let 수식수 = 0;
  for (const code in items) {
    const t = 뽑기(items[code]);
    if (!t) continue;
    for (const eq of 수식들(t)) {
      수식수++;
      try { katex.renderToString(eq, { throwOnError: true }); }
      catch (e) { 흠.push({ code, eq, why: String(e.message).replace(/\s+/g, ' ').slice(0, 120) }); }
    }
  }
  return { 흠, 수식수 };
};

const 지금 = 재기((x) => x.content);
const 문항 = [...new Set(지금.흠.map((x) => x.code))];
console.log('\n창고 ' + Object.keys(items).length + '건 · 수식 ' + 지금.수식수 + '개');
console.log('🔴 빨갛게 뜨는 수식 ' + 지금.흠.length + '개 (문항 ' + 문항.length + '개)\n');
for (const x of 지금.흠) {
  console.log('  ' + x.code + '  ' + x.eq.replace(/\n/g, ' ').slice(0, 70));
  console.log('      ' + x.why);
}
if (고칠까) {
  const 뒤 = 재기((x) => hwpxRepairEqText(x.content));
  const 뒤문항 = [...new Set(뒤.흠.map((x) => x.code))];
  console.log('\n  「수식 다시 훑기」를 대면 → ' + 뒤.흠.length + '개 (문항 ' + 뒤문항.length + '개)');
  if (뒤.흠.length) { console.log('  그래도 남는 것:'); for (const x of 뒤.흠) console.log('    ' + x.code + '  ' + x.eq.slice(0, 70)); }
  if (뒤.흠.length < 지금.흠.length) console.log('\n  ⓘ 고치려면: node tools/items-repair.mjs --push');
}
console.log('');
