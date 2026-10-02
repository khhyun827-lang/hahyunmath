// 정답·해설이 원본과 같은지 문항별로 견준다.
// ⚠ 글자만 견주면 «수식으로 적힌 정답»(예: [정답] $-3$)을 놓친다.
//    그래서 글자와 수식을 «문서 차례대로 섞어» 이은 뒤 비교한다.
import fs from 'fs';
import { richBook } from './rich.mjs';

const x = fs.readFileSync('build/hwpx/Contents/section2.xml', 'utf8');
const order = ['step1', 'step2', 'step3']
  .flatMap((n) => JSON.parse(fs.readFileSync(`../analysis/${n}_list.json`, 'utf8')));
const R = {}; for (const c of 'ABCD') R[c] = richBook(c);

// 결과물을 문항 단위로 자른다 (출처 형광이 문항마다 하나)
const marks = [...x.matchAll(/<hp:markpenBegin color="#FF0000"\/>/g)].map((m) => m.index);
const blocks = marks.map((s, i) => x.slice(s, i + 1 < marks.length ? marks[i + 1] : x.length));

// 블록마다 미주는 «정확히 하나»다 (여는 1 · 닫는 1 을 확인했다).
// 짝을 세는 방식은 여는 태그를 잘못 잡아 뒤쪽 본문까지 삼켰다 — 그냥 잘라 온다.
function endNoteOf(b) {
  const s = b.indexOf('<hp:endNote');
  const e = b.indexOf('</hp:endNote>');
  return (s < 0 || e < 0) ? '' : b.slice(s, e);
}
// 글자 + 수식을 차례대로 이어 하나의 문자열로
const seqOf = (xml) => [...xml.matchAll(
  /<hp:t(?:\s[^>]*)?>([\s\S]*?)<\/hp:t>|<hp:script(?:\s[^>]*)?>([\s\S]*?)<\/hp:script>/g)]
  .map((m) => (m[1] !== undefined ? m[1].replace(/<[^>]*>/g, '') : '⟨' + m[2] + '⟩')).join('');
// ⚠ 해설에 «표»가 들어 있는 경우가 있다 (벤다이어그램 5개 · 연산표).
//    표 안을 안 세면 원본이 짧게 나와 «정답이 다르다»고 잘못 말한다.
const fromRuns = (rs) => rs.map((r) => (
  r.t === 'text' ? r.v
    : r.t === 'eq' ? '⟨' + r.script + '⟩'
      : r.t === 'tbl' ? r.rows.map((row) => row.map(fromRuns).join('')).join('')
        : '')).join('');
const fromParas = (paras) => paras.map(fromRuns).join('');
// 견줄 때 무시할 것: 공백·엔티티 표기 차이
const norm = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
  .replace(/\s+/g, '').trim();
const answerOf = (s) => {
  const i = s.indexOf('[정답]');
  return i < 0 ? '' : s.slice(i);
};

let same = 0; const diff = [];
order.forEach((p, i) => {
  const b = blocks[i]; if (!b) { diff.push(`${i + 1} ${p.id} — 블록 없음`); return; }
  
  const got = seqOf(endNoteOf(b));
  const rc = R[p.id[0]][+p.id.slice(2) - 1];
  const want = fromParas(rc.answer);
  if (norm(got) === norm(want)) { same++; return; }
  // 정답 부분만이라도 같은지 따로 본다
  const gA = norm(answerOf(got)), wA = norm(answerOf(want));
  diff.push({ no: i + 1, id: p.id, src: p.source, 정답일치: gA === wA && gA !== '',
    want: want.slice(0, 90), got: got.slice(0, 90) });
});

console.log(`문항 ${order.length} · 미주 전체가 원본과 같음 ${same} · 다른 것 ${diff.length}`);
if (diff.length) {
  const onlyBody = diff.filter((d) => d.정답일치).length;
  console.log(`  그중 «정답 줄은 같고 해설만 다른 것» ${onlyBody}`);
  diff.slice(0, 12).forEach((d) => {
    if (typeof d === 'string') return console.log('  ' + d);
    console.log(`\n  ${String(d.no).padStart(3, '0')} ${d.id} ${d.src} ${d.정답일치 ? '(정답 같음)' : '⚠ 정답 다름'}`);
    console.log(`    원본: ${d.want}`);
    console.log(`    결과: ${d.got}`);
  });
}
