// 그림 보기 표 ↔ 좌석표 — 칸이 기호뿐인 표를 가른다 (2026-10-04)
//
//   node tools/pic-choice-test.mjs
//
// K2-02-E-0083 「직선의 개형은?」 — 보기 ①~⑤ 옆 칸에 그래프 그림이 있다. 그림은 표 밖으로 빼므로
// 칸을 그리면 `| ① | | ② | |` 빈 격자만 남았다. 좌석표(8인승 배치도)는 «기호의 자리»가 곧 문제라 격자를 지켜야 한다.
// 🔵 가르는 것: 빈 칸에 그림이 있나.
import { loadHwpxRules, parseXml } from './hwpx-node.mjs';
const r = loadHwpxRules();
let 통과 = 0, 실패 = 0;
const 잰다 = (이름, 참) => { 참 ? (통과++, console.log('  ✓ ' + 이름)) : (실패++, console.log('  ✗ ' + 이름)); };

const NS = 'xmlns:hp="http://www.hancom.co.kr/hwpml/2011/paragraph" xmlns:hc="http://www.hancom.co.kr/hwpml/2011/core"';
const 칸 = (속) => `<hp:tc><hp:subList><hp:p><hp:run>${속}</hp:run></hp:p></hp:subList></hp:tc>`;
const 글 = (t) => `<hp:t>${t}</hp:t>`;
const 그림 = (id) => `<hp:pic><hc:img binaryItemIDRef="${id}"/></hp:pic>`;
const 표 = (줄들) => `<hs:sec xmlns:hs="x" ${NS}><hp:p><hp:run><hp:tbl>${줄들.map((줄) => '<hp:tr>' + 줄.join('') + '</hp:tr>').join('')}</hp:tbl></hp:run></hp:p></hs:sec>`;
const 걷는다 = (xml) => {
  const doc = parseXml(xml), 토큰 = [];
  r.hwpWalkParagraphs(Array.from(doc.documentElement.childNodes).filter((n) => n.nodeType === 1 && n.localName === 'p'), 토큰);
  return { 글: 토큰.filter((t) => t.type === 'text').map((t) => t.v).join('\n'), 그림: 토큰.filter((t) => t.type === 'pic').length };
};

console.log('\n그림 보기 표 (0083 꼴)');
{
  const x = 걷는다(표([[칸(글('①')), 칸(그림('g1')), 칸(글('②')), 칸(그림('g2'))], [칸(글('③')), 칸(그림('g3')), 칸(''), 칸('')]]));
  잰다('🔴 빈 격자 `| ① | |` 를 안 낸다', !/\|/.test(x.글));
  잰다('그림은 다 살아 나간다', x.그림 === 3);
}
console.log('\n좌석표 (그림 없음)');
{
  const x = 걷는다(표([[칸(글('①')), 칸(''), 칸(글('②'))], [칸(글('③')), 칸(글('④')), 칸('')]]));
  잰다('🔵 격자를 지킨다 — 기호의 자리가 문제다', /\| ① \| {2}\| ② \|/.test(x.글));
}
console.log('\n값이 든 보기 표');
{
  const x = 걷는다(표([[칸(글('①')), 칸(글('3')), 칸(글('②')), 칸(글('5'))]]));
  잰다('글로 편다(옛 그대로)', x.글.includes('① 3 ② 5'));
}
console.log('\n  ' + (실패 ? '🔴' : '✅') + ' ' + 통과 + ' 통과 · ' + 실패 + ' 실패\n');
process.exit(실패 ? 1 : 0);
