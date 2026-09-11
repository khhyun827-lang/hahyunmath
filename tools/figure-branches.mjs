// 그림 문항의 «갈래 분포»를 센다 — (A) 글로 · (B) 새로 그림 · (C) 그대로 (2026-09-11)
//
//   node tools/figure-branches.mjs             ← 전체
//   node tools/figure-branches.mjs 2026-09-11  ← 그 날부터 만든 것만 (프롬프트를 바꾼 뒤를 따로 본다)
//
// 🔵 **왜 있나** — 2026-09-11에 갈래 규칙을 바꿨다: «함수 그래프면 (B) 먼저». 노트에는
//    「갈래 분포를 다시 재 볼 것」이 08-12부터 걸려 있었는데 세는 도구가 없어 아무도 못 쟀다.
//    바꾼 뒤 (B)가 정말 늘었는지, (B) 중 기계가 그린 것(SVG)이 몇인지 여기서 본다.
// ⚠ 읽기만 한다. problembank 한 컬렉션을 통째로 읽으니 **읽기 N건**이 든다(하루 5만 한도).
//    `pbvimg` 는 안 읽는다 — 문서 하나에 SVG 가 통째로 들어 있어 무겁다. «기계가 그렸나»는
//    problembank 의 `variantFigureScene` 이 아니라 그림 문서에만 있으므로, 여기서는
//    hasVariantImage(그림이 붙었나)까지만 센다.

import { 강사로로그인 } from './fb-login.mjs';

const since = process.argv[2] || '';
const { BASE, H } = await 강사로로그인();

const 전부 = [];
let pt = '';
do {
  const r = await fetch(BASE + '/problembank?pageSize=300' + (pt ? '&pageToken=' + pt : ''), { headers: H });
  /* 🔴 «비었다»와 «못 읽었다»를 가른다 — 404·403 을 빈 것으로 읽으면 0건이 거짓말이 된다. */
  if (!r.ok) throw new Error('problembank 읽기 실패 http ' + r.status + ' — 빈 것이 아니라 못 읽은 것이다');
  const j = await r.json();
  for (const d of (j.documents || [])) {
    try { 전부.push(JSON.parse(d.fields.value.stringValue)); } catch (_) {}
  }
  pt = j.nextPageToken || '';
} while (pt);

const 그림 = 전부.filter(b => b.hasImage && (!since || String(b.createdAt || '') >= since));
const 갈래 = b => b.variantNeedsFigure ? 'B' : b.variantReuseFigure ? 'C' : b.variantFigureFree ? 'A' : '옛(갈래 없음)';
const 수 = {};
for (const b of 그림) 수[갈래(b)] = (수[갈래(b)] || 0) + 1;
const B = 그림.filter(b => 갈래(b) === 'B');

console.log(`문제은행 ${전부.length}건 · 그림 있는 문항 ${그림.length}건${since ? ' (' + since + ' 이후)' : ''}`);
console.log('');
console.log('  (A) 글로 새로 씀       ' + (수.A || 0));
console.log('  (B) 그림을 새로 그림   ' + (수.B || 0) + (B.length ? `   — 그림 붙음 ${B.filter(b => b.hasVariantImage).length} · 아직 「그림 필요」 ${B.filter(b => !b.hasVariantImage).length}` : ''));
console.log('  (C) 원본 그림 그대로   ' + (수.C || 0));
if (수['옛(갈래 없음)']) console.log('  옛 형식(갈래 없음)     ' + 수['옛(갈래 없음)']);
console.log('');
console.log('⚠ 「그림 필요」에 남은 (B)가 늘기만 하면 기계가 못 그리는 그림이 (B)로 몰리고 있는 것이다 —');
console.log('  그때는 worker/gemini-proxy.js taskRule ①의 «함수 그래프» 정의를 좁히거나, 장면 v2 를 지을 차례다.');
