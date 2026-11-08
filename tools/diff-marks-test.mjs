// 검토 형광펜 — 원본·변형의 달라진 조각만 칠하는가 (2026-11-08 · 사용자 요청)
//
//   node tools/diff-marks-test.mjs
//
// 🔴 수식 안을 잘못 감싸면 KaTeX 가 빨간 날 글자를 내놓는다(\frac12 → 뜻이 바뀜).
// 🔴 표 칸 | · 선지 기호를 건드리면 problemHTML 이 표·보기를 못 읽는다.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
function lift(name) {
  const at = html.indexOf('function ' + name + '(');
  if (at < 0) throw new Error(name + ' 를 못 찾았습니다');
  let depth = 0;
  for (let j = html.indexOf('{', at); j < html.length; j++) {
    if (html[j] === '{') depth++;
    else if (html[j] === '}') { depth--; if (!depth) return html.slice(at, j + 1); }
  }
  throw new Error(name + ' 의 끝을 못 찾았습니다');
}
const 상수 = html.match(/const HL_ON = [^\n]*/)[0];
const { diffMarks, hlHTML } = new Function([상수, lift('diffMarks'), lift('hlHTML')].join('\n') + '\nreturn { diffMarks, hlHTML };')();

let pass = 0, fail = 0;
const 봄 = (무엇, 나온것, 나와야) => {
  const ok = JSON.stringify(나온것) === JSON.stringify(나와야);
  if (ok) { pass++; console.log('  ✓ ' + 무엇); }
  else { fail++; console.log(`  ✗ ${무엇}\n      나온 것: ${JSON.stringify(나온것)}\n      나와야:  ${JSON.stringify(나와야)}`); }
};
const 칠한것 = s => (hlHTML(s).match(/<mark class="rv-hl">[^<]*<\/mark>|\{\\htmlClass\{rv-hl\}\{[^}]*\}\}/g) || []);

const 원 = '이차방정식 $x^2-4x+k=0$ 의 두 근의 제곱의 합이 $10$ 일 때, 상수 $k$ 의 값은?\n① 1  ② 2  ③ 3  ④ 4  ⑤ 5';
const 변 = '이차방정식 $x^2-6x+k=0$ 의 두 근의 제곱의 합이 $20$ 일 때, 상수 $k$ 의 값은?\n① 6  ② 7  ③ 8  ④ 9  ⑤ 10';
const [a, b] = diffMarks(원, 변);
봄('수식 안의 바뀐 수만 — 변형 쪽', 칠한것(b), ['{\\htmlClass{rv-hl}{6}}', '{\\htmlClass{rv-hl}{20}}']);
봄('… 원본 쪽도', 칠한것(a), ['{\\htmlClass{rv-hl}{4}}', '{\\htmlClass{rv-hl}{10}}']);
봄('🔴 보기는 그대로', b.slice(b.indexOf('①')), 변.slice(변.indexOf('①')));
봄('지수 위 수는 중괄호로 감싼다(x^2 → x^{…})', diffMarks('$x^2$', '$x^3$')[1], '$x^{\\htmlClass{rv-hl}{3}}$');
봄('🔴 명령 바로 뒤 맨 수(\\frac12)는 안 감싼다', diffMarks('$\\frac12$', '$\\frac13$')[1], '$\\frac13$');
봄('수식 안 연산자는 안 칠한다', 칠한것(diffMarks('$a+b$', '$a-b$')[1]), []);
봄('붙은 두 낱말은 한 번에 칠한다', 칠한것(diffMarks('두 점 A 에서', '세 개 A 에서')[1]), ['<mark class="rv-hl">세 개</mark>']);
봄('글 낱말 · 글자 하나씩', 칠한것(diffMarks('삼각형 OAB 의 넓이는?', '삼각형 ABH 의 둘레는?')[1]),
  ['<mark class="rv-hl">H</mark>', '<mark class="rv-hl">둘레는</mark>']);
봄('🔴 표 칸 | 는 그대로 · 칸 안만', diffMarks('| a | 3 |', '| a | 5 |')[1], '| a | 5 |');
봄('글 속 유니코드 식(그림 문항)', 칠한것(diffMarks('y = -(x-1)(x-4) 의 그래프', 'y = -(x-1)(x-5) 의 그래프')[1]), ['<mark class="rv-hl">5</mark>']);
봄('같으면 그대로', diffMarks('같은 글', '같은 글'), ['같은 글', '같은 글']);
봄('원본이 비면 그대로', diffMarks('', '변형'), ['', '변형']);
봄('표지는 다 짝이 맞는다', [hlHTML(a).split('<mark').length, hlHTML(a).split('</mark>').length], [1, 1]);

console.log(`\n${fail ? '✗' : '✓'} ${pass}/${pass + fail}`);
process.exit(fail ? 1 : 0);
