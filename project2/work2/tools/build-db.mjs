// 4권을 하나의 문제 DB 로 모은다.  ①단계: 모든 문항 추출 (아직 아무것도 지우지 않는다)
//
// 출판사마다 «유형 머리»의 모양이 다르다:
//   고쟁이 / 유형반복R / 올림포스 :  "[그림N] 01"  다음 줄이 유형명
//   절대등급                      :  "[그림N] 집합의 연산"  (번호 없이 이름만)
import fs from 'fs';
import path from 'path';
import { extractHwpx, splitProblems } from './hwpx-extract.mjs';

const BOOKS = [
  { code: 'A', name: '고쟁이', dir: '[공통수학2][고쟁이]04.도형의이동', header: 'num' },
  { code: 'B', name: '올림포스', dir: '[공통수학2][올림포스유형편]04.도형의이동', header: 'num' },
  { code: 'C', name: '유형반복R', dir: '[공통수학2][유형반복R]04.도형의 이동', header: 'num' },
  { code: 'D', name: '절대등급', dir: '[공통수학2][절대등급]04.도형의이동', header: 'name' },
];

const IMG_ONLY = /^\[그림\d+\]$/;
const IMG_NUM = /^\[그림\d+\]\s*(\d+)$/;                 // [그림5] 03
const IMG_NAME = /^\[그림\d+\]\s*([^\d|].*)$/;           // [그림5] 집합의 연산
const isTable = (l) => l.startsWith('|');

function buildBook(b) {
  const { body, notes } = extractHwpx(path.join('extract', b.dir));
  const { probs } = splitProblems(body, notes);

  // 본문을 다시 훑어 «각 미주 표시 앞에 살아 있던 유형»을 알아낸다
  const lines = body.split('\n');
  const typeOf = {};                       // 문항번호 -> {no,name}
  let cur = { no: null, name: null }, pendingNo = null, section = 1, lastNo = 0;
  const types = [];

  for (let i = 0; i < lines.length; i++) {
    const L = lines[i].trim();
    const mk = L.match(/^⟪ANS:(\d+)⟫$/);
    if (mk) { typeOf[+mk[1]] = { ...cur, section }; continue; }
    if (isTable(L) || !L) continue;

    if (b.header === 'num') {
      const m = IMG_NUM.exec(L);
      if (m) { pendingNo = +m[1]; continue; }
      if (pendingNo !== null) {
        if (IMG_ONLY.test(L)) continue;               // 사이에 낀 그림은 건너뛴다
        // 유형번호가 되돌아가면 책의 «다음 부»로 넘어간 것이다
        if (pendingNo <= lastNo) section += 1;
        lastNo = pendingNo;
        cur = { no: pendingNo, name: L.replace(/\s+/g, ' ') };
        types.push({ section, ...cur });
        pendingNo = null;
      }
    } else {
      const m = IMG_NAME.exec(L);
      if (m && !/[?]$/.test(m[1]) && m[1].length < 30) {
        cur = { no: (cur.no || 0) + 1, name: m[1].trim() };
        types.push({ section, ...cur });
      }
    }
  }

  // 쪽 머리말/꼬리말 표가 본문 중간에 섞여 들어온다 (쪽이 넘어가는 문항에서).
  // ⚠ 좁게 쓸 것. 예전 판은 빈 갈래(|\s*)가 섞여 «|로 시작하고 집합이 든 줄»을 전부 지웠고,
  //    그 바람에 조건 상자 「| (가) … (나) … |」가 통째로 사라졌다 (문항 17개).
  const HDR = /^\|[^|]*(고쟁이|올림포스|유형반복|절대등급)[^|]*공통수학/;
  // ⚠ «다음 유형의 머리»는 앞 문항의 본문 끝에 붙는다 — 표시를 기준으로 자르기 때문이다.
  //    유형명이 문제 글로 오해되지 않게 여기서 떼어 낸다.
  const typeNames = new Set(types.map((t) => t.name));
  for (const p of probs) {
    const ls = p.body.split('\n').filter((l) => !(l.startsWith('|') && HDR.test(l) && /집합|공통수학/.test(l)));
    while (ls.length) {
      const last = ls[ls.length - 1].trim();
      if (IMG_NUM.test(last) || /^\d{1,2}$/.test(last) || typeNames.has(last)
        || (b.header === 'name' && IMG_NAME.test(last) && typeNames.has(IMG_NAME.exec(last)[1].trim()))) {
        ls.pop();
      } else break;
    }
    p.body = ls.join('\n').trim();
  }

  return probs.map((p) => ({
    id: `${b.code}-${String(p.n).padStart(3, '0')}`,
    source_book: b.name,
    book_code: b.code,
    original_problem_number: p.n,
    section: typeOf[p.n]?.section ?? 1,
    pub_type_no: typeOf[p.n]?.no ?? null,
    pub_type_name: typeOf[p.n]?.name ?? null,
    has_figure: /\[그림\d+\]/.test(p.body),
    is_choice: /①/.test(p.body),
    body: p.body,
    answer: p.answer,
  }));
}

const all = [];
for (const b of BOOKS) {
  const rows = buildBook(b);
  all.push(...rows);
  const ts = [...new Set(rows.map((r) => r.pub_type_name).filter(Boolean))];
  const secs = [...new Set(rows.map((r) => r.section))];
  console.log(`${b.name.padEnd(7)} 문항 ${String(rows.length).padStart(3)} · 출판사유형 ${String(ts.length).padStart(2)} · 부 ${secs.length} · 유형없음 ${rows.filter((r) => !r.pub_type_name).length}`);
}
fs.mkdirSync('../analysis2', { recursive: true });
fs.writeFileSync('../analysis2/all_problems.json', JSON.stringify(all, null, 1), 'utf8');
console.log('\n총', all.length, '문항 -> analysis/all_problems.json');
