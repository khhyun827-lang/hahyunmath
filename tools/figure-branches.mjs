// 그림 문항의 «갈래 분포»를 센다 — (A) 글로 · (B) 새로 그림 · (C) 그대로 (2026-09-11 · 09-12 고침)
//
//   node tools/figure-branches.mjs             ← 전체
//   node tools/figure-branches.mjs 2026-09-11  ← 그 날부터 만든 것만 (프롬프트를 바꾼 뒤를 따로 본다)
//
// 🔵 **왜 있나** — 2026-09-11에 갈래 규칙을 바꿨다: «함수 그래프면 (B) 먼저». 노트에는
//    「갈래 분포를 다시 재 볼 것」이 08-12부터 걸려 있었는데 세는 도구가 없어 아무도 못 쟀다.
//    바꾼 뒤 (B)가 정말 늘었는지, (B) 중 그림이 실제로 붙은 것이 몇인지 여기서 본다.
//
// 🔴 **2026-09-12 — 이 도구는 «빈 통»을 재고 있었다.** 처음 지을 때는 `problembank`(문제은행) 하나만
//    읽었는데, 그 통은 원래 시험용이라 38건 → 3건 → **0건**으로 줄어 있었다. 그래서 도구가
//    「(A) 0 · (B) 0 · (C) 0」을 멀쩡한 얼굴로 말했다 — 읽기는 성공했으니 «못 읽었다»도 아니었다.
//    ⚠ **정작 오늘 짓는 변형은 `variants`(창고 변형)로 간다.** 원본은 `items`(창고) 564제다.
//    그래서 이제 **두 통을 다 읽고 따로 말한다.** 통이 비면 «비었다»고 **소리 내어** 말한다 —
//    0을 조용히 흘리면 09-04에 «비었다»와 «못 읽었다»를 못 가른 그 사고와 같은 꼴이 된다.
//
// ⚠ 읽기만 한다. `items`(564) · `variants` · `problembank` 세 통을 통째로 읽으니
//    **읽기 N건**이 든다(하루 5만 한도). 그림 문서(`pbvimg`)는 안 읽는다 — SVG 가 통째로 들어 무겁다.

import { 강사로로그인 } from './fb-login.mjs';

const since = process.argv[2] || '';
const { BASE, H } = await 강사로로그인();

/* 한 컬렉션을 통째로 읽는다. 🔴 404·403 을 «빈 것»으로 읽지 않는다 — 못 읽은 것은 멈춘다. */
async function 읽기(이름) {
  const 전부 = [];
  let pt = '';
  do {
    const r = await fetch(BASE + '/' + 이름 + '?pageSize=300' + (pt ? '&pageToken=' + pt : ''), { headers: H });
    if (!r.ok) throw new Error(이름 + ' 읽기 실패 http ' + r.status + ' — 빈 것이 아니라 못 읽은 것이다');
    const j = await r.json();
    for (const d of (j.documents || [])) {
      try { 전부.push(JSON.parse(d.fields.value.stringValue)); } catch (_) {}
    }
    pt = j.nextPageToken || '';
  } while (pt);
  return 전부;
}

const 날짜맞나 = x => !since || String(x || '') >= since;

/* 갈래를 한 줄로 말한다 — (A)(B)(C) 어느 쪽도 아니면 옛 형식이다. */
function 표(라벨, 줄들, 꼬리) {
  const 수 = { A: 0, B: 0, C: 0, 옛: 0 };
  for (const x of 줄들) 수[x.갈래]++;
  const B = 줄들.filter(x => x.갈래 === 'B');
  const 붙음 = B.filter(x => x.그림붙음).length;
  console.log('');
  console.log(`■ ${라벨} — ${줄들.length}건${since ? ' (' + since + ' 이후)' : ''}`);
  console.log('    (A) 글로 새로 씀       ' + 수.A);
  console.log('    (B) 그림을 새로 그림   ' + 수.B + (B.length ? `   — 그림 붙음 ${붙음} · 아직 「그림 필요」 ${수.B - 붙음}` : ''));
  console.log('    (C) 원본 그림 그대로   ' + 수.C);
  if (수.옛) console.log('    옛 형식(갈래 없음)     ' + 수.옛);
  if (꼬리) console.log('    ' + 꼬리);
}

/* ── ① 창고 변형 (`variants`) — 오늘 짓는 것이 여기로 온다 ───────────────────────────── */
const items = await 읽기('items');
const 그림원본 = new Set(items.filter(b => b.image || (b.images && b.images.length)).map(b => b.code));
const 변형전부 = (await 읽기('variants')).filter(v => !v.deleted);

/* ⚠ «원본이 그림 문항»인 것만 센다. 안 가르면 글 문항의 변형 수십 건이 (A)로 쏟아져
   「(A)가 압도적」이라는 거짓 그림이 나온다 — 갈래는 그림 문항에서만 갈리는 말이다. */
const 변형줄 = 변형전부
  .filter(v => 그림원본.has(v.originCode) && 날짜맞나(v.createdAt))
  .map(v => ({
    갈래: v.needsFigure ? 'B' : v.reuseFigure ? 'C' : 'A',
    그림붙음: !!v.image,
    code: v.code,
  }));

console.log(`창고 ${items.length}제 · 그림 문항 ${그림원본.size}제 · 살아있는 변형 ${변형전부.length}건`);
표('창고 변형 (variants)', 변형줄,
   변형줄.length ? '' : '⚠ 그림 문항의 변형이 아직 없다 — 창고 › 「✦ AI 변형 만들기」를 그림 문항에 걸어야 숫자가 선다.');

/* ── ② 문제은행 (`problembank`) — 옛 길. 비어 있으면 비었다고 말한다 ──────────────────── */
const pb = await 읽기('problembank');
const pb줄 = pb
  .filter(b => b.hasImage && 날짜맞나(b.createdAt))
  .map(b => ({
    갈래: b.variantNeedsFigure ? 'B' : b.variantReuseFigure ? 'C' : b.variantFigureFree ? 'A' : '옛',
    그림붙음: !!b.hasVariantImage,
    code: b.id,
  }));
if (!pb.length) {
  console.log('');
  console.log('■ 문제은행 (problembank) — **통이 비었다**(0건). 못 읽은 것이 아니라 정말 없다.');
  console.log('    ⓘ 원래 시험용으로 쓰던 통이다(09-05에 38건 → 09-07에 3건 → 지금 0). 지금 길은 위의 창고 변형이다.');
} else {
  표('문제은행 (problembank)', pb줄);
}

console.log('');
console.log('⚠ 「그림 필요」에 남은 (B)가 늘기만 하면 기계가 못 그리는 그림이 (B)로 몰리고 있는 것이다 —');
console.log('  그때는 worker/gemini-proxy.js taskRule ①의 «함수 그래프» 정의를 좁히거나, 장면 v2 를 지을 차례다.');
