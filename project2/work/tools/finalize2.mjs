// ★ 집합 전면 재판정 v2 — ③ 산출물
// ⚠ 옛 decisions*.mjs 는 판정에 쓰지 않는다. 유형 재배정(TYPE_FIX)만 가져온다.
import fs from 'fs';
import { TYPES } from './canon.mjs';
// ⚠ 집합 쪽은 유형 재배정이 decisions.mjs 한 곳뿐이다 (도형의이동은 여섯 곳에 흩어져 있었다)
import { TYPE_FIX } from './decisions.mjs';
import * as M1 from './v2-t10.mjs';
import * as M2 from './v2-t22.mjs';
import * as M3 from './v2-t15.mjs';
import * as M4 from './v2-t19.mjs';
import * as M5 from './v2-t12-t17.mjs';
import * as M6 from './v2-t21-t16-t09.mjs';
import * as M7 from './v2-t23-t14-t20-t13.mjs';
import * as M8 from './v2-t18-t08-t04-t07.mjs';
import * as M9 from './v2-t11-basics.mjs';
import { OVERRIDE } from './v2-scene.mjs';

const FIX = { ...TYPE_FIX };
const JUDGE = {};
for (const m of [M1, M2, M3, M4, M5, M6, M7, M8, M9]) {
  for (const k of Object.keys(m)) if (k.startsWith('V2_')) Object.assign(JUDGE, m[k]);
}

const db = JSON.parse(fs.readFileSync('../analysis/problem_database.json', 'utf8'));
const OUT = '../analysis/';

// SCENE 은 판정문의 표시에서 나온다 ([기본]->1 · ⚠->3 · 그 밖->2), OVERRIDE 가 이긴다
const sceneOf = (id, why) => OVERRIDE[id] || (why.startsWith('[기본]') ? 1 : (why.startsWith('⚠') ? 3 : 2));

for (const p of db) {
  p.canon = FIX[p.id] || p.canon;
  p.canon_name = TYPES[p.canon];
  const d = JUDGE[p.id];
  if (!d) throw new Error('판정 없음: ' + p.id);
  [p.status, , p.reason] = d;
  p.step = p.status === 'K' ? sceneOf(p.id, p.reason) : null;
}

const keep = db.filter((p) => p.status === 'K');
const TORDER = Object.keys(TYPES);
const tIdx = (p) => TORDER.indexOf(p.canon);
const byType = (a, b) => tIdx(a) - tIdx(b) || a.id.localeCompare(b.id);

// SCENE3 — 유형으로 묶지 않는다. ⚠ 난이도 점수로 줄 세우지 않는다.
//   «남은 것이 가장 많은 유형»부터 내어 큰 덩어리가 끝에 몰리지 않게 한다.
function spread(list) {
  const pool = [...list].sort(byType);
  const out = [];
  const left = (c) => pool.filter((x) => x.canon === c).length;
  while (pool.length) {
    const lt = out.length ? out[out.length - 1].canon : null;
    const lb = out.length ? out[out.length - 1].source_book : null;
    const rank = (p) => left(p.canon) * 100
      - (p.canon === lt ? 100000 : 0) - (p.source_book === lb ? 10 : 0) - tIdx(p);
    let best = 0;
    pool.forEach((p, i) => { if (rank(p) > rank(pool[best])) best = i; });
    out.push(pool.splice(best, 1)[0]);
  }
  return out;
}

const s1 = keep.filter((p) => p.step === 1).sort(byType);
const s2 = keep.filter((p) => p.step === 2).sort(byType);
const s3 = spread(keep.filter((p) => p.step === 3));
s3.forEach((p, i) => { p.step3_order = i + 1; });

const slim = (p) => ({
  id: p.id, source: `${p.source_book} ${p.original_problem_number}번`,
  canon: p.canon, canon_name: p.canon_name, difficulty: p.difficulty,
  status: p.status, step: p.step, reason: p.reason,
});
fs.writeFileSync(OUT + 'keep_list.json', JSON.stringify(keep.map(slim), null, 1), 'utf8');
// ⚠ 지운 것의 사유에는 «대표 문항 ID»가 반드시 들어 있다 (전수 확인 완료).
fs.writeFileSync(OUT + 'delete_list.json', JSON.stringify(
  db.filter((p) => p.status === 'D').map((p) => ({
    ...slim(p), 대표: [...new Set((p.reason.match(/[ABCD]-\d{3}/g) || []))],
  })), null, 1), 'utf8');
fs.writeFileSync(OUT + 'excluded_list.json', JSON.stringify(
  db.filter((p) => p.status === 'X').map(slim), null, 1), 'utf8');
for (const [n, L] of [['step1', s1], ['step2', s2], ['step3', s3]]) {
  fs.writeFileSync(OUT + n + '_list.json', JSON.stringify(L.map((p) => ({
    ...slim(p), step3_order: p.step3_order, body: p.body, answer: p.answer,
  })), null, 1), 'utf8');
}

const BOOKS = ['고쟁이', '올림포스', '유형반복R', '절대등급'];
const cnt = (L, b) => L.filter((p) => p.source_book === b).length;
console.log(`4권 총 ${db.length}제 · 삭제 ${db.filter((p) => p.status === 'D').length} · 교재에서 뺌 ${db.filter((p) => p.status === 'X').length}`);
console.log(`유지 ${keep.length} · 압축률 ${((1 - keep.length / db.length) * 100).toFixed(1)}%`);
console.log(`SCENE  1:${s1.length}  2:${s2.length}  3:${s3.length}   [${BOOKS.map((b) => cnt(keep, b)).join('/')}]`);
let hole = 0;
for (const [T] of Object.entries(TYPES)) {
  const g = keep.filter((p) => p.canon === T);
  if (!g.filter((p) => p.step === 1).length) hole++;
}
console.log(' SCENE1 이 빈 유형:', hole);
console.log(' SCENE3 에서 같은 유형이 잇달아 오는 곳:',
  s3.filter((p, i) => i && s3[i - 1].canon === p.canon).length);
