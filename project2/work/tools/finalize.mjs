// ⑥⑦단계 — STEP 배정 · 전체 균형 검수 · 분석 산출물 저장
import fs from 'fs';
import { TYPES } from './canon.mjs';
import { DEC, TYPE_FIX } from './decisions.mjs';
import { DEC2 } from './decisions2.mjs';
import { DEC3, STEP_FIX } from './decisions3.mjs';
import { DEC4, DEC4_DROP } from './decisions4.mjs';
import { STEP3_TO_2 } from './decisions5.mjs';
import { DROP } from './decisions6.mjs';

const ALL = { ...DEC, ...DEC2, ...DEC4 };
const db = JSON.parse(fs.readFileSync('../analysis/problem_database.json', 'utf8'));
const OUT = '../analysis/';

for (const p of db) {
  p.canon = TYPE_FIX[p.id] || p.canon;
  p.canon_name = TYPES[p.canon];
  const d = ALL[p.id] || ['R', null, '판단하지 못했다'];
  [p.status, p.step, p.reason] = d;
  if (STEP_FIX[p.id]) p.step = STEP_FIX[p.id];
  // STEP 재검토 — 쉬운 유형의 최상단은 STEP3 이 아니라 STEP2 다
  if (STEP3_TO_2[p.id]) { p.step = 2; p.step_note = STEP3_TO_2[p.id]; }
  // 교재에서 빼기로 한 것 (모의고사 · 교육과정 밖)
  if (DROP[p.id]) { p.status = 'X'; p.step = null; p.reason1 = p.reason; p.reason = DROP[p.id][0]; p.drop_note = DROP[p.id][1]; }
  if (DEC4_DROP[p.id]) { p.status = 'D2'; p.step = null; p.reason1 = p.reason; p.reason = DEC4_DROP[p.id][0]; }
  // 2차 압축 — «같은 학습 경험»을 주는 문항을 한 번 더 덜어 낸다
  if (DEC3[p.id]) {
    p.status = 'D2'; p.step = null;
    p.reason1 = p.reason;              // 1차에서 «남긴» 이유도 보존한다
    p.reason = DEC3[p.id][0];
  }
}

// ── STEP 3 차례 정하기 ────────────────────────────────────────────────
// 단순 난이도 오름차순으로 놓지 않는다. 난이도는 «큰 흐름»으로만 올리고,
// 바로 앞 문항과 유형이 겹치지 않게 고른다 (실전에서는 유형을 스스로 알아내야 하므로).
function orderStep3(list) {
  const pool = [...list].sort((a, b) => a.difficulty - b.difficulty);
  const out = [];
  while (pool.length) {
    // 남은 것 중 앞쪽 절반(=상대적으로 쉬운 것)에서 고르되,
    // 직전 두 문항과 유형·출처가 겹치지 않는 첫 번째를 집는다.
    const window = Math.max(1, Math.ceil(pool.length * 0.45));
    const recentT = out.slice(-2).map((x) => x.canon);
    const recentB = out.slice(-2).map((x) => x.source_book);
    let idx = pool.slice(0, window).findIndex((c) => !recentT.includes(c.canon) && !recentB.includes(c.source_book));
    if (idx < 0) idx = pool.slice(0, window).findIndex((c) => !recentT.includes(c.canon));
    if (idx < 0) idx = 0;
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
}

const keep = db.filter((p) => p.status === 'K');
const s1 = keep.filter((p) => p.step === 1).sort((a, b) => (a.canon + a.difficulty).localeCompare(b.canon + b.difficulty));
const s2 = keep.filter((p) => p.step === 2).sort((a, b) => (a.canon + a.difficulty).localeCompare(b.canon + b.difficulty));
const s3 = orderStep3(keep.filter((p) => p.step === 3));
s3.forEach((p, i) => { p.step3_order = i + 1; });

// ── 산출물 ────────────────────────────────────────────────────────────
const slim = (p) => ({
  id: p.id, source: `${p.source_book} ${p.original_problem_number}번`,
  canon: p.canon, canon_name: p.canon_name, difficulty: p.difficulty,
  status: p.status, step: p.step, reason: p.reason,
});
fs.writeFileSync(OUT + 'keep_list.json', JSON.stringify(keep.map(slim), null, 1), 'utf8');
fs.writeFileSync(OUT + 'delete_list.json', JSON.stringify(db.filter((p) => p.status === 'D').map(slim), null, 1), 'utf8');
fs.writeFileSync(OUT + 'delete_list_2nd.json', JSON.stringify(db.filter((p) => p.status === 'D2').map((p)=>({...slim(p), 일차_유지사유: p.reason1})), null, 1), 'utf8');
fs.writeFileSync(OUT + 'dropped_list.json', JSON.stringify(db.filter((p) => p.status === 'X')
  .map((p)=>({...slim(p), 사유: p.reason, 대체검토: p.drop_note})), null, 1), 'utf8');
fs.writeFileSync(OUT + 'review_list.json', JSON.stringify(db.filter((p) => p.status === 'R').map(slim), null, 1), 'utf8');
for (const [n, L] of [['step1', s1], ['step2', s2], ['step3', s3]]) {
  fs.writeFileSync(OUT + n + '_list.json', JSON.stringify(L.map((p) => ({
    ...slim(p), step3_order: p.step3_order, body: p.body, answer: p.answer,
  })), null, 1), 'utf8');
}
// 출처 지도 — 최종 문항이 어느 책 몇 번에서 왔고, 어떤 유사문항을 대표하는지
const pairs = JSON.parse(fs.readFileSync(OUT + 'similarity_analysis.json', 'utf8'));
const byId = Object.fromEntries(db.map((p) => [p.id, p]));
const srcmap = keep.map((p) => {
  const sim = pairs.filter((q) => q.a === p.id || q.b === p.id)
    .map((q) => (q.a === p.id ? q.b : q.a))
    .filter((x) => byId[x] && byId[x].status === 'D');
  // 「이 문항으로 대체됨」이라고 적힌 삭제 문항도 함께 모은다
  const absorbed = db.filter((x) => x.status === 'D' && x.reason.includes(p.id)).map((x) => x.id);
  const rel = [...new Set([...sim, ...absorbed])];
  return {
    id: p.id, step: p.step, canon: p.canon, canon_name: p.canon_name,
    대표출처: `${p.source_book} ${p.original_problem_number}번`,
    유사문항: rel.map((x) => `${byId[x].source_book} ${byId[x].original_problem_number}번(${x})`),
    선정이유: p.reason,
  };
});
fs.writeFileSync(OUT + 'source_map.json', JSON.stringify(srcmap, null, 1), 'utf8');

// ── 검수 ──────────────────────────────────────────────────────────────
const BOOKS = ['고쟁이', '올림포스', '유형반복R', '절대등급'];
const cnt = (L, b) => L.filter((p) => p.source_book === b).length;
console.log('═══ 전체 현황 ═══');
console.log(' 4권 총 문항        470');
for (const b of BOOKS) console.log(`   ${b.padEnd(6)} ${String(db.filter((p) => p.source_book === b).length).padStart(4)}`);
console.log(' 표준 유형 수        ', Object.keys(TYPES).length);
console.log(' 유사문항 묶음(2제+) ', JSON.parse(fs.readFileSync(OUT + 'type_clusters.json', 'utf8')).filter((c) => c.size > 1).length);
console.log(' 유지  ', keep.length, ' 1차삭제 ', db.filter((p) => p.status === 'D').length, ' 2차삭제 ', db.filter((p) => p.status === 'D2').length, ' 뺌 ', db.filter((p) => p.status === 'X').length, ' 검토 ', db.filter((p) => p.status === 'R').length);
console.log(' 압축률', ((1 - keep.length / 470) * 100).toFixed(1) + '%  (470 ->', keep.length + ')');
console.log('\n═══ STEP 별 ═══');
for (const [n, L] of [['STEP 1', s1], ['STEP 2', s2], ['STEP 3', s3]]) {
  console.log(` ${n}: ${String(L.length).padStart(3)}제  [${BOOKS.map((b) => cnt(L, b)).join('/')}]`);
}
console.log('\n═══ 교재별 최종 분포 (유지 기준) ═══');
for (const b of BOOKS) {
  const k = cnt(keep, b), t = db.filter((p) => p.source_book === b).length;
  console.log(` ${b.padEnd(6)} ${String(k).padStart(3)}제  (원본 ${String(t).padStart(3)}제 중 ${(k / t * 100).toFixed(0)}% 채택 · 최종의 ${(k / keep.length * 100).toFixed(0)}%)`);
}
console.log('\n═══ 유형 커버리지 (유지 0인 유형이 있으면 안 된다) ═══');
let hole = 0;
for (const [T, name] of Object.entries(TYPES)) {
  const g = keep.filter((p) => p.canon === T);
  const st = [1, 2, 3].map((s) => g.filter((p) => p.step === s).length);
  if (!g.length) hole++;
  console.log(` ${T} ${String(g.length).padStart(2)}제 (S1 ${st[0]}·S2 ${st[1]}·S3 ${st[2]})  ${name}${g.length ? '' : '   ← 비었다!'}`);
}
console.log(' 빈 유형:', hole);
