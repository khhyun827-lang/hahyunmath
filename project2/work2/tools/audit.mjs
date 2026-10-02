// 「열리는가」가 아니라 「내용이 다 들어갔는가」를 본다.
// ⚠ 앞선 검사기는 파일이 열리는 모양만 봐서, 선지가 빈칸인 것(009·031·032)을 못 잡았다.
//    여기서는 원본과 결과물을 «문항별로» 견준다.
import fs from 'fs';
import { richBook } from './rich.mjs';
import { findDecorations, realImages } from './decor.mjs';

const x = fs.readFileSync('build/hwpx/Contents/section2.xml', 'utf8');
const keep = JSON.parse(fs.readFileSync('../analysis2/keep_list.json', 'utf8'));
const s1 = JSON.parse(fs.readFileSync('../analysis2/step1_list.json', 'utf8'));
const s2 = JSON.parse(fs.readFileSync('../analysis2/step2_list.json', 'utf8'));
const s3 = JSON.parse(fs.readFileSync('../analysis2/step3_list.json', 'utf8'));
const order = [...s1, ...s2, ...s3];
const R = {}; for (const c of 'ABCD') R[c] = richBook(c);
const DECOR = findDecorations(R);   // 쪽 장식은 옮기지 않으므로 기대치에서 뺀다

// 결과물을 문항 단위로 자른다 — 출처(붉은 형광)가 문항마다 딱 하나씩 있다
const marks = [...x.matchAll(/<hp:markpenBegin color="#FF0000"\/>/g)].map((m) => m.index);
const blocks = marks.map((s, i) => x.slice(s, i + 1 < marks.length ? marks[i + 1] : x.length));

const cnt = (s, re) => (s.match(re) || []).length;
const bad = [];
console.log(`문항 ${blocks.length} / 기대 ${order.length}`);

order.forEach((p, i) => {
  const b = blocks[i]; if (!b) return;
  const rc = R[p.id[0]][+p.id.slice(2) - 1];
  const want = [...rc.paras, ...rc.answer].flat();
  const wantEq = want.filter((r) => r.t === 'eq').length;
  const wantImg = realImages(rc, p.id[0], DECOR);
  const gotEq = cnt(b, /<hp:script/g);
  const gotImg = cnt(b, /<hc:img /g);
  // 선지 검사 — 딱지 ①~⑤ 가 있는데 내용 칸이 비었는가
  const cells = [...b.matchAll(/<hp:p [^>]*styleIDRef="7"[^>]*>([\s\S]*?)<\/hp:p>/g)]
    .map((m) => m[1]);
  const emptyChoice = cells.filter((c) => !/<hp:t>[^<]/.test(c) && !/<hp:script/.test(c) && !/<hc:img /.test(c)).length;
  const no = String(i + 1).padStart(3, '0');
  const issue = [];
  if (gotEq < wantEq) issue.push(`수식 ${gotEq}/${wantEq}`);
  if (gotImg < wantImg) issue.push(`그림 ${gotImg}/${wantImg}`);
  if (emptyChoice) issue.push(`빈 선지칸 ${emptyChoice}`);
  // 조건 (가)(나) 뒤가 비었는가
  // ⚠ 글자만 이어 붙이면 «(나) 뒤가 수식» 인 경우를 빈 것으로 오해한다.
  //    문서 차례대로 글자와 수식을 «섞어» 이어야 한다.
  const seq = [...b.matchAll(/<hp:t(?:\s[^>]*)?>([\s\S]*?)<\/hp:t>|<hp:script(?:\s[^>]*)?>([\s\S]*?)<\/hp:script>/g)]
    .map((m) => (m[1] !== undefined ? m[1].replace(/<[^>]*>/g, '') : '{식}')).join(' ');
  if (/\([가나다라]\)\s*$/.test(seq.trim())) issue.push('조건 뒤가 빔');
  if (issue.length) bad.push(`${no} ${p.id} ${p.source} — ${issue.join(' · ')}`);
});

console.log(bad.length ? `\n✗ 문제 ${bad.length}건` : '\n내용 누락 없음');
bad.slice(0, 40).forEach((s) => console.log('  ' + s));
