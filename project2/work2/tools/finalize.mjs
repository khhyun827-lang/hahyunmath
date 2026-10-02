// ⑥⑦단계 — STEP 배정 · 균형 검수 · 산출물 (4단원 «도형의 이동»)
import fs from 'fs';
import { TYPES } from './canon.mjs';
import { DEC, TYPE_FIX } from './decisions.mjs';
import { DEC2, TYPE_FIX2 } from './decisions2.mjs';
import { DEC3, TYPE_FIX3 } from './decisions3.mjs';
import { DEC4, TYPE_FIX4 } from './decisions4.mjs';
import { DEC5, TYPE_FIX5 } from './decisions5.mjs';
import { DEC6, TYPE_FIX6 } from './decisions6.mjs';
import { DROP2, STEP3_TO_2 } from './decisions7.mjs';
import { STEP_FIX } from './decisions8.mjs';
import { RESTORE } from './decisions9.mjs';

const ALL = { ...DEC, ...DEC2, ...DEC3, ...DEC4, ...DEC5, ...DEC6 };
const FIX = { ...TYPE_FIX, ...TYPE_FIX2, ...TYPE_FIX3, ...TYPE_FIX4, ...TYPE_FIX5, ...TYPE_FIX6 };
const db = JSON.parse(fs.readFileSync('../analysis2/problem_database.json', 'utf8'));
const OUT = '../analysis2/';

for (const p of db) {
  p.canon = FIX[p.id] || p.canon;
  p.canon_name = TYPES[p.canon];
  const d = ALL[p.id] || ['R', null, '판단하지 못했다'];
  [p.status, p.step, p.reason] = d;
  if (STEP3_TO_2[p.id]) { p.step = 2; p.step_note = STEP3_TO_2[p.id]; }
  // ⚠ decisions8 이 마지막이다 — 사고 단계로 다시 본 결과라 앞의 배정을 덮는다
  if (STEP_FIX[p.id]) { [p.step, p.step_note] = STEP_FIX[p.id]; }
  // ⚠ decisions9 는 «지운 것을 되살린다» — 1차 삭제까지 뒤집으므로 제일 마지막이다
  if (RESTORE[p.id]) {
    const [st, sp, cn, why] = RESTORE[p.id];
    p.status = st; p.step = sp; p.canon = cn; p.canon_name = TYPES[cn];
    p.reason = why; p.restored = true;
  }
  if (DROP2[p.id]) { p.status = 'D2'; p.step = null; p.reason1 = p.reason; p.reason = DROP2[p.id]; }
}

// STEP3 차례 — 난이도는 큰 흐름으로만 올리고, 앞 문항과 유형·출처가 겹치지 않게 고른다
function orderStep3(list) {
  const pool = [...list].sort((a, b) => a.difficulty - b.difficulty);
  const out = [];
  while (pool.length) {
    const w = Math.max(1, Math.ceil(pool.length * 0.45));
    const rt = out.slice(-2).map((x) => x.canon), rb = out.slice(-2).map((x) => x.source_book);
    let i = pool.slice(0, w).findIndex((c) => !rt.includes(c.canon) && !rb.includes(c.source_book));
    if (i < 0) i = pool.slice(0, w).findIndex((c) => !rt.includes(c.canon));
    if (i < 0) i = 0;
    out.push(pool.splice(i, 1)[0]);
  }
  return out;
}

const keep = db.filter((p) => p.status === 'K');
const key = (p) => p.canon + String(p.difficulty).padStart(6, '0');
const s1 = keep.filter((p) => p.step === 1).sort((a, b) => key(a).localeCompare(key(b)));
const s2 = keep.filter((p) => p.step === 2).sort((a, b) => key(a).localeCompare(key(b)));
const s3 = orderStep3(keep.filter((p) => p.step === 3));
s3.forEach((p, i) => { p.step3_order = i + 1; });

const slim = (p) => ({
  id: p.id, source: `${p.source_book} ${p.original_problem_number}번`,
  canon: p.canon, canon_name: p.canon_name, difficulty: p.difficulty,
  status: p.status, step: p.step, reason: p.reason,
});
fs.writeFileSync(OUT + 'keep_list.json', JSON.stringify(keep.map(slim), null, 1), 'utf8');
fs.writeFileSync(OUT + 'delete_list.json', JSON.stringify(db.filter((p) => p.status === 'D').map(slim), null, 1), 'utf8');
fs.writeFileSync(OUT + 'delete_list_2nd.json', JSON.stringify(db.filter((p) => p.status === 'D2')
  .map((p) => ({ ...slim(p), 일차_유지사유: p.reason1 })), null, 1), 'utf8');
for (const [n, L] of [['step1', s1], ['step2', s2], ['step3', s3]]) {
  fs.writeFileSync(OUT + n + '_list.json', JSON.stringify(L.map((p) => ({
    ...slim(p), step3_order: p.step3_order, body: p.body, answer: p.answer,
  })), null, 1), 'utf8');
}

const BOOKS = ['고쟁이', '올림포스', '유형반복R', '절대등급'];
const cnt = (L, b) => L.filter((p) => p.source_book === b).length;
const N = db.length;
console.log(`4권 총 ${N}제 · 1차삭제 ${db.filter((p) => p.status === 'D').length} · 2차삭제 ${db.filter((p) => p.status === 'D2').length} · 검토 ${db.filter((p) => p.status === 'R').length}`);
console.log(`유지 ${keep.length} · 압축률 ${((1 - keep.length / N) * 100).toFixed(1)}%`);
console.log('\nSTEP  ' + [['1', s1], ['2', s2], ['3', s3]].map(([n, L]) => `${n}:${L.length}`).join('  ')
  + `  [${BOOKS.map((b) => cnt(keep, b)).join('/')}]`);
const med = (a) => { const b = a.map((p) => p.difficulty).sort((x, y) => x - y); return b[b.length >> 1]; };
console.log(`난이도 중앙값  S1 ${med(s1)} -> S2 ${med(s2)} -> S3 ${med(s3)}`);
console.log('\n유형 커버리지');
let hole = 0;
for (const [T, name] of Object.entries(TYPES)) {
  const g = keep.filter((p) => p.canon === T);
  if (!g.length) hole++;
  console.log(` ${T} ${String(g.length).padStart(2)}제 (S1 ${g.filter((p) => p.step === 1).length}·S2 ${g.filter((p) => p.step === 2).length}·S3 ${g.filter((p) => p.step === 3).length})  ${name}${g.length ? '' : '  ← 비었다!'}`);
}
console.log(' 빈 유형:', hole);
