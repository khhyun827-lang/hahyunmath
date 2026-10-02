// ★ 전면 재판정 v2 — ③ 산출물 만들기
//
// ⚠ 옛 decisions*.mjs 는 «유형 태그가 같으면 같은 문제»로 판정한 것이라 쓰지 않는다.
//    여기서 읽는 것은 v2-* 다섯 개(판정)와 v2-scene(배치)뿐이다.
//    난이도 점수는 참고용으로만 싣고 «정렬·배치 어디에도 쓰지 않는다».
import fs from 'fs';
import { TYPES } from './canon.mjs';
// 유형 재배정만 옛 파일에서 가져온다 (판정이 아니라 «어느 유형인가»라 그대로 유효하다)
import { TYPE_FIX } from './decisions.mjs';
import { TYPE_FIX2 } from './decisions2.mjs';
import { TYPE_FIX3 } from './decisions3.mjs';
import { TYPE_FIX4 } from './decisions4.mjs';
import { TYPE_FIX5 } from './decisions5.mjs';
import { TYPE_FIX6 } from './decisions6.mjs';
import * as M1 from './v2-t01-t04.mjs';
import * as M2 from './v2-t05-t08.mjs';
import * as M3 from './v2-t09-t12.mjs';
import * as M4 from './v2-t13.mjs';
import * as M5 from './v2-t10-t15.mjs';
import { V2_STEP } from './v2-scene.mjs';

const FIX = { ...TYPE_FIX, ...TYPE_FIX2, ...TYPE_FIX3, ...TYPE_FIX4, ...TYPE_FIX5, ...TYPE_FIX6 };
const JUDGE = {};
for (const m of [M1, M2, M3, M4, M5]) for (const k of Object.keys(m)) Object.assign(JUDGE, m[k]);

const db = JSON.parse(fs.readFileSync('../analysis2/problem_database.json', 'utf8'));
const OUT = '../analysis2/';

for (const p of db) {
  p.canon = FIX[p.id] || p.canon;
  p.canon_name = TYPES[p.canon];
  const d = JUDGE[p.id];
  if (!d) throw new Error('판정 없음: ' + p.id);
  [p.status, , p.reason] = d;
  p.step = p.status === 'K' ? V2_STEP[p.id] : null;
  if (p.status === 'K' && !p.step) throw new Error('SCENE 배치 없음: ' + p.id);
}

const keep = db.filter((p) => p.status === 'K');
const TORDER = Object.keys(TYPES);          // T01 -> T15 (교육과정 차례에 가깝다)
const tIdx = (p) => TORDER.indexOf(p.canon);

// SCENE1·2 — 유형별로 «묶어서» 낸다 (같은 유형의 기본 -> 발전을 붙여 읽게 한다)
const byType = (a, b) => tIdx(a) - tIdx(b) || a.id.localeCompare(b.id);

// SCENE3 — 유형으로 묶지 «않는다». 섞어서 낸다.
// ⚠ 난이도 점수로 줄을 세우지 않는다. 유형 차례(교육과정)를 바탕으로 하되
//    같은 유형·같은 교재가 잇달아 오지 않게 흩는다 — 「무엇을 쓰는 문제인지」가
//    앞 문항에서 새어 나오지 않아야 실전이 된다.
// ⚠ 「앞쪽 몇 %에서 고른다」로는 못 흩는다 — T13 이 SCENE3 의 30%라 창 안이 그 유형으로 찬다.
//    그래서 «남은 것이 가장 많은 유형»을 먼저 낸다. 큰 덩어리를 뒤로 미루면 끝에 몰린다.
function spread(list) {
  const pool = [...list].sort(byType);
  const out = [];
  const left = (c) => pool.filter((x) => x.canon === c).length;
  while (pool.length) {
    const lastT = out.length ? out[out.length - 1].canon : null;
    const lastB = out.length ? out[out.length - 1].source_book : null;
    const rank = (p) => left(p.canon) * 100                       // ① 남은 것이 많은 유형부터
      - (p.canon === lastT ? 100000 : 0)                          // ② 같은 유형이 잇달으면 안 된다
      - (p.source_book === lastB ? 10 : 0)                        // ③ 같은 교재도 피한다
      - tIdx(p);                                                  // ④ 그 안에서는 교육과정 차례
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
// ⚠ 지운 것의 사유에는 «대표로 삼은 문항»이 반드시 적혀 있다 (전수 확인 완료).
//    「A-046과 동일」 같은 검증 불가능한 문장은 v2 에 없다.
fs.writeFileSync(OUT + 'delete_list.json', JSON.stringify(
  db.filter((p) => p.status === 'D').map((p) => ({
    ...slim(p), 대표: [...new Set((p.reason.match(/[ABCD]-\d{3}/g) || []))],
  })), null, 1), 'utf8');
for (const [n, L] of [['step1', s1], ['step2', s2], ['step3', s3]]) {
  fs.writeFileSync(OUT + n + '_list.json', JSON.stringify(L.map((p) => ({
    ...slim(p), step3_order: p.step3_order, body: p.body, answer: p.answer,
  })), null, 1), 'utf8');
}

const BOOKS = ['고쟁이', '올림포스', '유형반복R', '절대등급'];
const cnt = (L, b) => L.filter((p) => p.source_book === b).length;
console.log(`4권 총 ${db.length}제 · 삭제 ${db.length - keep.length} · 유지 ${keep.length} · 압축률 ${((1 - keep.length / db.length) * 100).toFixed(1)}%`);
console.log(`SCENE  1:${s1.length}  2:${s2.length}  3:${s3.length}   [${BOOKS.map((b) => cnt(keep, b)).join('/')}]`);
let hole = 0;
for (const [T, name] of Object.entries(TYPES)) {
  const g = keep.filter((p) => p.canon === T);
  if (!g.filter((p) => p.step === 1).length) hole++;
  console.log(` ${T} ${String(g.length).padStart(2)}제 (${[1, 2, 3].map((s) => g.filter((p) => p.step === s).length).join('·')})  ${name}`);
}
console.log(' SCENE1 이 빈 유형:', hole);
// 잇달아 같은 유형이 오는지 (SCENE3 는 섞여야 한다)
const dup = s3.filter((p, i) => i && s3[i - 1].canon === p.canon).length;
console.log(' SCENE3 에서 같은 유형이 잇달아 오는 곳:', dup);
