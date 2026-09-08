// 받은 교재를 «심기 전에» 훑는다 — 복사본이 있나 (2026-09-09)
//
//   node tools/code-audit.mjs <파일.hwpx>
//   node tools/code-audit.mjs <파일.hwpx> --json      ← 다른 도구가 읽을 꼴로
//
// 공동작업하는 선생님들이 문제 틀을 복사하면 코드가 딸려간다. 그것을 여기서 잡는다.
//
// ── 판정 (docs/코드-숨기기.md 2절) ────────────────────────────────────
//   그 코드가 파일에   지문      판정          하는 일
//   0번               —        새 문항        코드를 새로 준다
//   1번               맞음      그대로다       잇는다
//   1번               틀림      고쳤다         조용히 갱신한다 — 경보가 아니다
//   1번               없음      못 가림        옛 파일이다. 지문을 박으면 된다
//   2번+              —        복사됐다       🔴 사람이 고른다
//
// 🔴 **2번+ 일 때 기계가 정하지 않는다.** 「지문 맞는 쪽이 원본」으로 자동 판정하면
//    **원본을 고치고 복사본을 안 고친 경우 거꾸로 짚는다.** 순서만 매겨 보여 준다.
//
// 🔵 **«고쳤다»는 경보가 아니다.** 교재를 고치는 것은 원래 하는 일이다 —
//    그것까지 빨갛게 띄우면 진짜 경보(복사)가 그 속에 묻힌다.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { bodiesFromHwpx } from './item-bodies.mjs';
import { loadHwpxRules, problemsFromHwpx } from './hwpx-node.mjs';
import { 지문, 지문맞나 } from './fingerprint.mjs';

/* 파일 하나를 판정한다. 화면에 아무것도 안 찍는다. */
export function auditFile(src) {
  const rules = loadHwpxRules();
  const { problems } = problemsFromHwpx(src, rules);

  /* 코드가 붙은 문항만 본다 — 목차·표지는 코드가 없다(그게 정상이다). */
  const 문항 = problems
    .filter((p) => p.itemCode && p.content && p.content.trim())
    .map((p) => ({ code: p.itemCode, 심긴지문: p.itemFp || '', content: p.content, 지금지문: 지문(p.content) }));

  const 코드별 = new Map();
  for (const it of 문항) {
    if (!코드별.has(it.code)) 코드별.set(it.code, []);
    코드별.get(it.code).push(it);
  }

  const 그대로 = [], 고쳤다 = [], 못가림 = [], 복사됨 = [];
  for (const [code, 무리] of 코드별) {
    if (무리.length > 1) {
      /* 🔴 순서만 매긴다. 「지문이 맞는 것」을 위로 올려 사람이 보기 쉽게 할 뿐,
         그것이 원본이라고 «말하지» 않는다. */
      복사됨.push({
        code,
        몇개: 무리.length,
        갈래: 무리.map((it) => ({
          판정: 지문맞나(it.심긴지문, it.content),
          심긴지문: it.심긴지문 || '(없음)',
          지금지문: it.지금지문,
          맛보기: it.content.replace(/\s+/g, ' ').trim().slice(0, 60),
        })).sort((a, b) => (a.판정 === '맞음' ? -1 : b.판정 === '맞음' ? 1 : 0)),
        /* 🔵 본문까지 똑같으면 «진짜 같은 문항 둘»이다 — 복사인지 원래 그런지 갈린다. */
        본문도같나: new Set(무리.map((it) => it.지금지문)).size === 1,
      });
      continue;
    }
    const it = 무리[0];
    const 판정 = 지문맞나(it.심긴지문, it.content);
    if (판정 === '맞음') 그대로.push(code);
    else if (판정 === '못가림') 못가림.push(code);
    else 고쳤다.push({ code, 심긴지문: it.심긴지문, 지금지문: it.지금지문 });
  }

  /* 🔵 **거꾸로도 본다 — 코드는 다른데 본문이 같은 자리** (2026-09-09).
     위의 판정표는 «한 코드가 여러 문항»을 잡는다. 그 반대도 있다 —
     선생님이 복사한 뒤 **코드를 새로 주면서** 원본을 안 지운 경우, 그리고 그냥 같은 문제가 둘 실린 경우.
     🔴 이걸로 실제로 K2-03-E-0311 = K2-03-E-0314 를 찾았다. 아무도 모르고 지나가던 자리다.
     ⚠ 경보가 아니라 «알림»이다 — 같은 문제를 일부러 두 번 실었을 수도 있다. */
  const 본문별 = new Map();
  for (const it of 문항) {
    if (!it.지금지문) continue;
    if (!본문별.has(it.지금지문)) 본문별.set(it.지금지문, []);
    본문별.get(it.지금지문).push(it.code);
  }
  const 같은본문 = [];
  for (const [fp, codes] of 본문별) {
    const 다른코드 = [...new Set(codes)];
    if (다른코드.length > 1) 같은본문.push({ 지문: fp, codes: 다른코드 });
  }

  return { src, 문항수: 문항.length, 그대로, 고쳤다, 못가림, 복사됨, 같은본문 };
}

function 찍는다(r) {
  console.log(`\n  ${path.basename(r.src)} — 코드가 붙은 문항 ${r.문항수}개`);
  console.log(`    그대로     ${r.그대로.length}개`);
  console.log(`    고쳤다     ${r.고쳤다.length}개   ${r.고쳤다.length ? '(경보가 아니다 — 본문을 갱신하면 된다)' : ''}`);
  console.log(`    못 가림    ${r.못가림.length}개   ${r.못가림.length ? '(지문이 아직 없다 — item-fp-stamp.mjs 로 박으면 된다)' : ''}`);
  console.log(`    🔴 복사됨  ${r.복사됨.length}개`);

  if (r.고쳤다.length) {
    console.log('\n  ── 고쳐진 문항 (그냥 갱신하면 된다) ──');
    r.고쳤다.slice(0, 10).forEach((x) => console.log(`     ${x.code}  ${x.심긴지문} → ${x.지금지문}`));
    if (r.고쳤다.length > 10) console.log(`     … 그리고 ${r.고쳤다.length - 10}개 더`);
  }

  if (r.같은본문.length) {
    console.log('\n  ── ⚠ 코드는 다른데 본문이 같다 (경보가 아니라 알림) ──');
    r.같은본문.forEach((x) => console.log(`     ${x.codes.join('  =  ')}`));
    console.log('     같은 문제를 일부러 두 번 실었으면 그대로 두면 된다.');
  }

  if (!r.복사됨.length) {
    console.log('\n  ✅ 한 코드가 두 문항을 가리키는 자리는 없다.\n');
    return;
  }
  console.log('\n  ── 🔴 한 코드가 여러 문항에 붙어 있다 — 사람이 골라야 한다 ──');
  for (const c of r.복사됨) {
    console.log(`\n  ${c.code}  ×${c.몇개}` + (c.본문도같나 ? '   ⚠ 본문까지 똑같다 (진짜 같은 문항 둘)' : ''));
    c.갈래.forEach((v, i) => {
      console.log(`     ${i + 1}) 지문 ${v.판정}  (심긴 ${v.심긴지문} · 지금 ${v.지금지문})`);
      console.log(`        ${v.맛보기}…`);
    });
    if (!c.본문도같나) {
      console.log('     ▶ 🔴 «지문 맞는 쪽»이 반드시 원본은 아니다 — 원본을 고치고 복사본을 안 고쳤으면 거꾸로다.');
      console.log('        본문을 보고 사람이 정할 것. 복사본에는 새 코드를 준다.');
    }
  }
  console.log('');
}

// ── 혼자 부를 때 ──────────────────────────────────────────────────────
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  const src = argv.find((a) => !a.startsWith('--'));
  if (!src) {
    console.error('쓰는 법: node tools/code-audit.mjs <파일.hwpx> [--json]');
    console.error('  받은 교재에 복사된 코드가 있는지 훑는다. 아무것도 안 고친다.');
    process.exit(1);
  }
  const r = auditFile(src);
  if (argv.includes('--json')) console.log(JSON.stringify(r, null, 2));
  else 찍는다(r);
  /* 복사가 있으면 0 이 아닌 값으로 나간다 — 다른 도구가 이어서 판단할 수 있게. */
  process.exit(r.복사됨.length ? 3 : 0);
}
