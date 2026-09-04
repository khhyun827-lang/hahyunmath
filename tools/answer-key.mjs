// 빠른정답표(hwpx)를 읽어 «코드 → 정답» 장부를 만든다 (2026-09-06)
//
//   node tools/answer-key.mjs <빠른정답표.hwpx> [--out 정답.json]
//
// 🔴 **왜 필요한가** — 교재 미주에는 정답이 100% 들어 있지만 **주관식은 정답 뒤에 해설이
//    통째로 붙어 온다.** 어디까지가 답인지 기계가 모르므로 `hwpEndnoteParts` 는 일부러
//    «가르지 않고 그대로» 둔다(2026-09-04에 정한 것이고 그 판단은 지금도 맞다).
//    빠른정답표는 그 답만 따로 적어 둔 것이라, 짐작 없이 주관식 정답을 얻는 유일한 길이다.
//
// 🔴 **가장 위험한 것은 «한 칸 밀림»이다.** 표는 «교재 통번호»(001~564)고 코드는 «미주 순서»다.
//    한 칸만 어긋나도 564개 전부에 남의 정답이 붙는데, 그건 조용히 틀린다.
//    → 그래서 **객관식은 미주에도 깨끗한 정답이 있다**는 점을 이용해 **맞대 본다.**
//      맞대 볼 수 있는 것이 다 맞아야 주관식도 믿는다. 안 맞으면 **아무것도 내놓지 않는다.**

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { sectionDocs, loadHwpxRules, problemsFromHwpx } from './hwpx-node.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const 교재폴더 = path.join(ROOT, '교재 코드파일');
const 총수 = 564;

/* 빠른정답표를 «한 줄 글자»로 편다. ¶ 는 줄바꿈 자리다(아래참고 표를 줄 단위로 읽으려고 남긴다). */
export function flattenKey(hwpxPath, rules = loadHwpxRules()) {
  const paras = [];
  for (const doc of sectionDocs(hwpxPath))
    for (const n of Array.from(doc.documentElement.childNodes))
      if (n.nodeType === 1 && n.localName === 'p') paras.push(n);
  const toks = [];
  rules.hwpWalkParagraphs(paras, toks);
  let flat = '';
  for (const t of toks) flat += (t.type === 'text' || t.type === 'eq') ? t.v : ' ¶ ';
  return flat;
}

/* 「아래 참고」로 미룬 것들 — 문서 끝의 표에 `| 090 | 정답 | 121 | 정답 |` 꼴로 적혀 있다.
   ⚠ 사용자가 「셀을 넘어설 것 같은 건 아래에 따로 적었다」고 한 그 자리다. */
function 아래참고표(flat) {
  const out = {};
  for (const row of flat.split('¶')) {
    if (!row.includes('|')) continue;
    const cells = row.split('|').map(s => s.trim()).filter(Boolean);
    for (let i = 0; i + 1 < cells.length; i += 2)
      if (/^\d{3}$/.test(cells[i])) out[+cells[i]] = cells[i + 1];
  }
  return out;
}

export function parseAnswerKey(hwpxPath) {
  const flat = flattenKey(hwpxPath);
  const 아래 = 아래참고표(flat);
  const 본표 = {}, 못찾음 = [];
  let pos = 0;
  for (let n = 1; n <= 총수; n++) {
    const at = flat.indexOf(String(n).padStart(3, '0'), pos);
    if (at < 0) { 못찾음.push(n); continue; }
    const from = at + 3;
    /* ⚠ **다음 번호가 표에 «없을» 수 있다** — 실제로 322 가 빠져 있었다.
       하나만 보고 못 찾으면 그 줄이 문서 끝까지를 삼켜 **뒤가 통째로 날아간다**
       (처음에 그렇게 만들어서 320개만 읽혔다). 그래서 앞의 몇 개를 같이 보고
       «가장 먼저 나오는 것»을 경계로 삼는다. */
    let to = -1;
    for (let k = 1; k <= 6 && n + k <= 총수 + 1; k++) {
      const c = flat.indexOf(String(n + k).padStart(3, '0'), from);
      if (c >= 0 && (to < 0 || c < to)) to = c;
    }
    if (to < 0) to = flat.length;
    본표[n] = flat.slice(from, to).replace(/¶/g, ' ').replace(/\[\d+\.[^\]]*\]/g, '').trim();
    pos = to;
  }
  const byNo = {};
  for (let n = 1; n <= 총수; n++) {
    let a = (본표[n] || '').trim();
    if (/아래\s*참고/.test(a)) a = (아래[n] || '').trim();
    if (a) byNo[n] = a;
  }
  return { byNo, 못찾음, 아래참고: Object.keys(아래).map(Number) };
}

/* 교재 다섯 권을 차례로 읽어 «코드 순서»를 낸다. 이 차례가 곧 통번호 1~564 다. */
export function codesInOrder() {
  const out = [];
  for (const f of fs.readdirSync(교재폴더).filter(x => x.endsWith('.hwpx')).sort()) {
    const { problems } = problemsFromHwpx(path.join(교재폴더, f));
    for (const p of problems) if (p.itemCode) out.push({ code: p.itemCode, 미주: (p.answer || '').trim(), unit: f });
  }
  return out;
}

/* 객관식 기호를 하나로 맞춘다 — 교재에 ➂(U+2782)처럼 다른 동그라미가 섞여 있었다(363번). */
const CIRCLES = '①②③④⑤➀➁➂➃➄';
export function circleOf(s) {
  const m = String(s || '').match(/[①②③④⑤➀➁➂➃➄]/);
  return m ? '①②③④⑤'[CIRCLES.indexOf(m[0]) % 5] : '';
}

/* 🔵 **표에 «수식이 아니라 글자로» 쳐진 것이 여섯 있었다** — `2root2` · `18over5` 같은 것들이다.
   한글 수식 개체였으면 변환기가 풀었을 텐데 그냥 글자라 손댈 데가 없었다.
   ⚠ **overline 같은 진짜 LaTeX 을 건드리면 안 된다** — 그래서 «앞뒤가 숫자일 때»만 편다.
     over 는 앞에 숫자가 와야 하고 root 는 뒤에 숫자가 와야 걸린다. */
export function 수식낱말펴기(s){
  return String(s)
    .replace(/([0-9]+)\s*over\s*([0-9]+)/gi, (m,a,b)=> '\\frac{'+a+'}{'+b+'}')
    .replace(/root\s*([0-9]+)/gi, (m,a)=> '\\sqrt{'+a+'}');
}

/* 표에 없거나 잘못 실린 것을 손으로 채우는 자리. 🔴 정답이라서 저장소에 안 올린다. */
const 보충파일 = path.join(교재폴더, 'answer-key-patch.json');
function 보충정답(){
  if(!fs.existsSync(보충파일)) return {};
  const raw = JSON.parse(fs.readFileSync(보충파일, 'utf8'));
  const out = {};
  for(const k in raw) if(!k.startsWith('_')) out[k] = raw[k];
  return out;
}

export function buildAnswerKey(hwpxPath) {
  const { byNo, 못찾음, 아래참고 } = parseAnswerKey(hwpxPath);
  const 보충 = 보충정답();
  const codes = codesInOrder();
  /* 🔵 **번호로 잇는다 — 차례로 잇지 않는다** (2026-09-06에 재 보고 바꿨다).
     코드의 끝 네 자리가 곧 교재 통번호였다(564/564 가 그랬다). 차례로 이으면
     파일 하나가 빠지거나 순서가 바뀌는 순간 **전부 한 칸씩 밀리는데**, 번호로 이으면
     그런 일이 아예 없다. ⚠ 그래도 아래 «한 칸 밀림 검사»는 그대로 둔다 —
     이건 데이터의 성질이지 규칙이 아니라서, 다음 교재가 다르게 붙을 수 있다. */
  const rows = [], 불일치 = [];
  let 맞음 = 0, 견줌 = 0;
  codes.forEach((it) => {
    const m = it.code.match(/([0-9]+)$/);
    const n = m ? +m[1] : -1;
    const 표 = byNo[n];
    /* 🔴 **맞대 볼 수 있는 것은 다 맞대 본다** — 미주가 딱 ①~⑤ 하나인 것이 그렇다. */
    const 미주깨끗 = /^[①②③④⑤➀➁➂➃➄]$/.test(it.미주);
    if (미주깨끗 && 표) {
      견줌++;
      if (circleOf(표) === circleOf(it.미주)) 맞음++;
      else 불일치.push({ no: n, code: it.code, 미주: circleOf(it.미주), 표: String(표).slice(0, 30) });
    }
    /* 보충이 있으면 그것이 이긴다 — 표가 틀렸을 때 고치는 유일한 문이다. */
    const 최종 = 보충[it.code] || (표 ? 수식낱말펴기(표) : '');
    if (최종) rows.push({ no: n, code: it.code, answer: 최종,
                          kind: circleOf(최종) ? '객관식' : '주관식',
                          from: 보충[it.code] ? '보충' : '표' });
  });
  return { rows, 견줌, 맞음, 불일치, 못찾음, 아래참고, 코드수: codes.length,
           표수: Object.keys(byNo).length, 보충수: rows.filter(r=>r.from==='보충').length };
}

// ── 실행 ──────────────────────────────────────────────────────────────
if (process.argv[1] && process.argv[1].endsWith('answer-key.mjs')) {
  const src = process.argv[2];
  if (!src) { console.error('쓰는 법: node tools/answer-key.mjs <빠른정답표.hwpx> [--out 정답.json]'); process.exit(1); }
  const r = buildAnswerKey(src);
  console.log(`\n  표에서 읽은 것   ${r.표수} / ${총수}  (교재 코드 ${r.코드수}개)`);
  if (r.못찾음.length) console.log(`  ⚠ 표에 없는 번호  ${r.못찾음.join(', ')}`);
  console.log(`  「아래 참고」     ${r.아래참고.length}건 — ${r.아래참고.join(', ')}`);
  console.log(`\n  🔴 한 칸 밀림 검사 — 미주가 깨끗한 객관식 ${r.견줌}개를 맞대 봤다`);
  console.log(`     일치 ${r.맞음} · 불일치 ${r.불일치.length}`);
  if (r.불일치.length) {
    console.log('\n  🔴 어긋났다 — 아무것도 내놓지 않는다. 번호와 코드의 차례를 먼저 맞춰야 한다.');
    r.불일치.slice(0, 20).forEach(t => console.log(`     ${t.no} ${t.code} — 미주 ${t.미주} vs 표 「${t.표}」`));
    process.exit(1);
  }
  const 객 = r.rows.filter(x => x.kind === '객관식').length;
  console.log(`     ✅ 다 맞았다 — 차례가 맞다. 주관식 정답도 믿을 수 있다.`);
  console.log(`\n  낼 것            ${r.rows.length}개 (객관식 ${객} · 주관식 ${r.rows.length - 객})`);
  if (r.보충수) console.log(`  손으로 채운 것    ${r.보충수}개 (answer-key-patch.json)`);
  const outAt = process.argv.indexOf('--out');
  if (outAt > 0 && process.argv[outAt + 1]) {
    fs.writeFileSync(process.argv[outAt + 1],
      JSON.stringify({ updatedAt: new Date().toISOString().slice(0, 16).replace('T', ' '), count: r.rows.length, items: r.rows }, null, 1), 'utf8');
    console.log(`  적었다            ${process.argv[outAt + 1]}\n`);
  } else console.log('  ⓘ --out 정답.json 을 붙이면 파일로 냅니다.\n');
}
