// 템플릿에서 «되풀이해 쓸 조각»을 원본 XML 그대로 떼어 낸다.
// 조각을 손으로 짜지 않고 원본을 쓰는 이유: 속성 하나만 빠져도 한글이 파일을 못 연다.
import fs from 'fs';
const D = process.argv[2] || 'extract/[2026][엔딩크레딧]도형의이동/Contents/';
const s = fs.readFileSync(D + 'section2.xml', 'utf8');
fs.mkdirSync('parts', { recursive: true });

// 균형 잡힌 태그 한 덩어리를 잘라 낸다
function block(src, startIdx, tag) {
  let i = startIdx, d = 0;
  const re = new RegExp(`<(/?)${tag}([^>]*?)(/?)>`, 'g');
  re.lastIndex = startIdx;
  let m;
  while ((m = re.exec(src))) {
    if (m[3]) { if (d === 0) return src.slice(startIdx, m.index + m[0].length); continue; }
    if (m[1]) { d--; if (d === 0) return src.slice(startIdx, m.index + m[0].length); }
    else d++;
  }
  return null;
}
const tblStarts = [...s.matchAll(/<hp:tbl /g)].map((m) => m.index);
const tbls = tblStarts.map((i) => block(s, i, 'hp:tbl'));
tbls.forEach((t, i) => {
  const rc = t.match(/rowCnt="(\d+)" colCnt="(\d+)"/);
  fs.writeFileSync(`parts/tbl${i + 1}_${rc[1]}x${rc[2]}.xml`, t, 'utf8');
});
console.log('표 조각:', tbls.map((t, i) => {
  const rc = t.match(/rowCnt="(\d+)" colCnt="(\d+)"/);
  return `tbl${i + 1}(${rc[1]}x${rc[2]}, ${t.length}자)`;
}).join(' '));

// 수식 한 덩어리
const eqI = s.indexOf('<hp:equation');
const eq = block(s, eqI, 'hp:equation');
fs.writeFileSync('parts/equation.xml', eq, 'utf8');
console.log('\n수식 조각 (' + eq.length + '자):');
console.log(eq.replace(/></g, '>\n<'));

// 미주 한 덩어리
const enI = s.indexOf('<hp:endNote');
fs.writeFileSync('parts/endnote.xml', block(s, enI, 'hp:endNote'), 'utf8');
// 그림(hp:pic) 한 덩어리
const picI = s.indexOf('<hp:pic');
if (picI > -1) fs.writeFileSync('parts/pic.xml', block(s, picI, 'hp:pic'), 'utf8');
console.log('\n미주·그림 조각 저장 완료');
