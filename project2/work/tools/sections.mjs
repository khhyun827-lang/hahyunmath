// 책마다 «자기 구획»이 있다 (유형편 / 실전편 / 심화). 그 경계를 찾는다.
// 경계 표시는 글이 아니라 «그림»이라, 문항 표시 바로 앞에 홀로 선 그림을 본다.
import fs from 'fs';
import path from 'path';
import { extractHwpx } from './hwpx-extract.mjs';

const BOOKS = [
  ['고쟁이', '[공통수학2][고쟁이]05.집합'],
  ['올림포스', '[공통수학2][올림포스유형편]5.집합_110제'],
  ['유형반복R', '[공통수학2][유형반복R] 5. 집합의 뜻과 표현'],
  ['절대등급', '[공통수학2][절대등급]05.집합'],
];

for (const [name, dir] of BOOKS) {
  const { body } = extractHwpx(path.join('extract', dir));
  const lines = body.split('\n').map((l) => l.trim());
  console.log('═══════════', name, '═══════════');
  let lastAns = 0;
  const events = [];
  for (let i = 0; i < lines.length; i++) {
    const L = lines[i];
    const mk = L.match(/^⟪ANS:(\d+)⟫$/);
    if (mk) { lastAns = +mk[1]; continue; }
    if (/^\[그림\d+\]\s*\d+$/.test(L)) {
      // 유형 머리 — 다음 줄이 이름
      let j = i + 1; while (j < lines.length && (!lines[j] || /^\[그림\d+\]$/.test(lines[j]))) j++;
      events.push([lastAns, '유형', L.replace(/^\[그림\d+\]\s*/, '') + ' ' + (lines[j] || '').slice(0, 34)]);
    } else if (/^\[그림\d+\]$/.test(L)) {
      // 홀로 선 그림. 바로 다음이 문항 표시나 유형 머리면 «구획 표시»로 본다
      let j = i + 1; while (j < lines.length && !lines[j]) j++;
      if (/^⟪ANS:/.test(lines[j] || '') || /^\[그림\d+\]\s*\d+$/.test(lines[j] || '')) {
        events.push([lastAns, '구획?', L]);
      }
    }
  }
  // 유형 머리 사이 간격이 유난히 큰 곳 = 구획이 바뀐 곳
  for (const [after, kind, txt] of events) {
    if (kind === '구획?') console.log(`   ...문항 ${after} 뒤   ▣ 구획 표시 ${txt}`);
  }
  const heads = events.filter((e) => e[1] === '유형');
  console.log(`   유형 머리 ${heads.length}개 · 마지막 유형은 문항 ${heads.at(-1)?.[0] ?? '-'} 뒤에 시작`);
}
