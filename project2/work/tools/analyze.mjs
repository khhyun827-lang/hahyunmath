// ②③④단계 — 유형 분류 · 구조 서명 · 유사도
import fs from 'fs';
import { features } from './tag.mjs';
import { TYPES, PUB2CANON, canonFromContent, OVERRIDE } from './canon.mjs';

const all = JSON.parse(fs.readFileSync('../analysis/all_problems.json', 'utf8'));

// ── 1. «표를 못 믿는 문항»(구획 끝의 종합·실전 묶음) 가려내기 ──────────────
// 유형 머리가 없는 종합 묶음은 직전 유형을 통째로 물려받아 버킷이 비정상으로 커진다.
for (const bk of [...new Set(all.map((p) => p.source_book))]) {
  const rows = all.filter((p) => p.source_book === bk);
  const buckets = {};
  for (const p of rows) (buckets[p.section + '|' + p.pub_type_no] ||= []).push(p);
  const sizes = Object.values(buckets).map((b) => b.length).sort((a, b) => a - b);
  const med = sizes[Math.floor(sizes.length / 2)];
  for (const b of Object.values(buckets)) {
    // 중앙값의 2.5배를 넘으면 «종합 묶음이 뒤에 붙은 것»으로 본다.
    // 앞쪽 med개까지는 진짜 그 유형, 나머지는 표를 버린다.
    if (b.length > med * 2.5) b.forEach((p, i) => { p.pub_reliable = i < med; });
    else b.forEach((p) => { p.pub_reliable = true; });
  }
}

// ── 2. 표준 유형 + 특징 ────────────────────────────────────────────────
// ⚠ 출판사 유형표의 «결»이 책마다 다르다.
//    올림포스 22유형/110제 · 유형반복R 33/171 은 잘게 나뉘어 그대로 쓸 만하지만,
//    고쟁이 5/106 · 절대등급 9/83 은 «집합, 원소, 부분집합» 처럼 한 칸이 너무 넓어
//    그대로 쓰면 서로 같은 집합·새로운 집합·부분집합 개수가 한 유형으로 뭉친다.
//    -> 결이 굵은 책은 내용으로 다시 매긴다.
const typeCountOf = {};
for (const p of all) (typeCountOf[p.source_book] ||= new Set()).add(p.pub_type_name);
const FINE = new Set(Object.entries(typeCountOf).filter(([, s]) => s.size >= 15).map(([b]) => b));

for (const p of all) {
  p.f = features(p);
  const useP = p.pub_reliable && FINE.has(p.source_book);
  const mapped = useP ? PUB2CANON[p.pub_type_name] : null;
  p.canon = OVERRIDE[p.id] || mapped || canonFromContent(p.f, p.body + p.answer);
  p.canon_src = OVERRIDE[p.id] ? '수동' : (mapped ? '출판사' : '내용');
}

// ── 3. 난이도 점수 ─────────────────────────────────────────────────────
// 「사고 단계가 몇 개인가」의 대리 지표를 모은다. 절대값이 아니라 «줄 세우기»용이다.
const bookLen = {};
for (const p of all) bookLen[p.source_book] = Math.max(bookLen[p.source_book] || 0, p.original_problem_number);
for (const p of all) {
  const f = p.f;
  const pos = p.original_problem_number / bookLen[p.source_book];   // 책 안에서의 위치
  let d = 0;
  d += Math.min(f.sol_len / 260, 4);          // 해설 길이 = 풀이 단계
  d += Math.min(f.cases, 4) * 0.7;            // 경우 나누기
  d += f.boki ? 1.0 : 0;                      // 보기 판정 (여러 명제)
  d += f.maxmin ? 1.2 : 0;                    // 최대·최소
  d += f.unknown ? 0.8 : 0;                   // 미지수 역추적
  d += Math.max(0, f.n_tags - 2) * 0.45;      // 개념 결합
  d += pos * 1.6;                             // 책 안 위치
  d += p.pub_reliable ? 0 : 1.1;              // 종합·실전 묶음
  d += f.figure ? 0.2 : 0;
  p.difficulty = +d.toFixed(2);
}

// ── 4. 구조 서명 ───────────────────────────────────────────────────────
// 겉모양(숫자·문자·집합이름)을 지우고 «구조»만 남긴다.
function skeleton(s) {
  return s
    .replace(/\[그림\d+\]/g, ' FIG ')
    .replace(/[①②③④⑤]/g, ' CH ')
    .replace(/\\left|\\right|\\begin\{matrix\}|\\end\{matrix\}/g, ' ')
    .replace(/\d+/g, '#')
    .replace(/\b[A-Za-z]\b/g, 'V')
    .replace(/[ \t]+/g, ' ')
    .trim();
}
const shingles = (s, k = 5) => {
  const set = new Set();
  for (let i = 0; i + k <= s.length; i++) set.add(s.slice(i, i + k));
  return set;
};
const jac = (a, b) => {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
};

for (const p of all) {
  p.skel = skeleton(p.body);
  p._sh = shingles(p.skel);
  p._tags = new Set(p.f.tags);
}

// ── 5. 같은 표준 유형 안에서 유사쌍 찾기 ────────────────────────────────
const pairs = [];
for (const T of Object.keys(TYPES)) {
  const g = all.filter((p) => p.canon === T);
  for (let i = 0; i < g.length; i++) {
    for (let j = i + 1; j < g.length; j++) {
      const a = g[i], b = g[j];
      const st = jac(a._sh, b._sh);
      const tg = jac(a._tags, b._tags);
      const score = st * 0.68 + tg * 0.32;
      if (score >= 0.42) {
        pairs.push({
          type: T, a: a.id, b: b.id, score: +score.toFixed(3),
          skel_sim: +st.toFixed(3), tag_sim: +tg.toFixed(3),
          cross_book: a.source_book !== b.source_book,
          d_a: a.difficulty, d_b: b.difficulty,
        });
      }
    }
  }
}
pairs.sort((x, y) => y.score - x.score);

// ── 저장 ───────────────────────────────────────────────────────────────
const slim = all.map((p) => ({
  id: p.id, source_book: p.source_book, original_problem_number: p.original_problem_number,
  canon: p.canon, canon_name: TYPES[p.canon], canon_src: p.canon_src,
  pub_type_name: p.pub_reliable ? p.pub_type_name : null,
  difficulty: p.difficulty, tags: p.f.tags,
  choice: p.f.choice, descriptive: p.f.descriptive, boki: p.f.boki,
  maxmin: p.f.maxmin, figure: p.f.figure, cases: p.f.cases, sol_len: p.f.sol_len,
  body: p.body, answer: p.answer, skel: p.skel,
}));
fs.writeFileSync('../analysis/problem_database.json', JSON.stringify(slim, null, 1), 'utf8');
fs.writeFileSync('../analysis/similarity_analysis.json', JSON.stringify(pairs, null, 1), 'utf8');

// ── 화면 보고 ──────────────────────────────────────────────────────────
console.log('표준 유형 분포 ─────────────────────────────');
for (const [T, name] of Object.entries(TYPES)) {
  const g = all.filter((p) => p.canon === T);
  if (!g.length) { console.log(`  ${T} ${name}  ← 0`); continue; }
  const byBook = ['고쟁이', '올림포스', '유형반복R', '절대등급']
    .map((b) => String(g.filter((p) => p.source_book === b).length).padStart(2)).join('/');
  const d = g.map((p) => p.difficulty).sort((a, b) => a - b);
  console.log(`  ${T} ${String(g.length).padStart(3)}제  [${byBook}]  난이도 ${d[0].toFixed(1)}~${d.at(-1).toFixed(1)}  ${name}`);
}
console.log('\n표 신뢰 못 하는 문항:', all.filter((p) => !p.pub_reliable).length, '/ 470');
console.log('유사쌍(0.42+):', pairs.length, '· 그중 교차출처', pairs.filter((p) => p.cross_book).length);
