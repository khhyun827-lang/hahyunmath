// 검토 «바뀐 수» 띠 — 원본과 변형의 수를 차례로 짝짓는가 (2026-11-08)
//
//   node tools/num-diff-test.mjs
//
// 🔴 짝이 틀리면 «4 → 6» 대신 엉뚱한 짝을 보여 준다 — 검토자는 그것을 믿는다.
//    그래서 수 개수가 다르면 짝짓지 말고 «모양이 바뀌었다»고만 해야 한다.

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
const escHtml = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const { numDiff, numDiffHTML } = new Function('escHtml',
  [lift('numsOf'), lift('numDiff'), lift('numDiffHTML')].join('\n') + '\nreturn { numDiff, numDiffHTML };')(escHtml);

let pass = 0, fail = 0;
const 봄 = (무엇, 나온것, 나와야) => {
  const ok = JSON.stringify(나온것) === JSON.stringify(나와야);
  if (ok) { pass++; console.log('  ✓ ' + 무엇); }
  else { fail++; console.log(`  ✗ ${무엇}\n      나온 것: ${JSON.stringify(나온것)}\n      나와야:  ${JSON.stringify(나와야)}`); }
};

const 원 = '이차방정식 $x^2-4x+k=0$ 의 두 근을 $\\alpha, \\beta$ 라 할 때, $\\alpha^2+\\beta^2=10$ 을 만족시키는 상수 $k$ 의 값은?\n① 1  ② 2  ③ 3  ④ 4  ⑤ 5';
const 변 = '이차방정식 $x^2-6x+k=0$ 의 두 근을 $\\alpha, \\beta$ 라 할 때, $\\alpha^2+\\beta^2=20$ 을 만족시키는 상수 $k$ 의 값은?\n① 6  ② 7  ③ 8  ④ 9  ⑤ 10';
const d = numDiff(원, 변);
봄('본문 — 바뀐 수만 짝', d.stem, [['−4', '−6'], ['10', '20']]);
봄('본문 — 그대로인 수는 세기만(지수 셋 · 0)', d.same, 4);
봄('보기는 따로', d.choices, [['1', '2', '3', '4', '5'], ['6', '7', '8', '9', '10']]);
봄('🔴 본문 수 개수가 다르면 짝짓지 않는다', numDiff('$x^2+3x+1$ 의 값은?', '$x^2+5x$ 의 값은?').stem, []);
봄('🔴 … 대신 개수를 말한다', numDiff('$x^2+3x+1$ 의 값은?', '$x^2+5x$ 의 값은?').stemOff, [3, 2]);
봄('본문 개수가 달라도 보기 짝은 산다', numDiff('$a+1$ 은? ① 1 ② 2', '$a+1+2$ 은? ① 3 ② 4').choices, [['1', '2'], ['3', '4']]);
봄('붙은 빼기는 수에 붙는다 — 부호가 바뀐 것을 잡는다', numDiff('x−1 로 나눈', 'x+1 로 나눈').stem, [['−1', '1']]);
봄('유니코드 지수(³)는 수가 아니다', numDiff('x³ − 2x + 1', 'x³ − 3x + 2').stem, [['2', '3'], ['1', '2']]);

const h = numDiffHTML(원, 변, '③', '③');
봄('띠 — 정답 그대로', h.includes('정답 <b>③</b> 그대로'), true);
봄('띠 — 정답이 바뀌면 화살표', numDiffHTML(원, 변, '③', '②').includes('정답 <s>③</s> → <b>②</b>'), true);
봄('🔴 수가 하나도 안 바뀌면 경고', numDiffHTML('$x+3$ 은?', '$x+3$ 은?', '', '').includes('바뀐 수가 없습니다'), true);
봄('수가 없는 글(그림 문항 «…»)에는 띠가 없다', numDiffHTML('그림과 같이 … 넓이를 구하시오.', '그림과 같이 … 넓이를 구하시오.', '', ''), '');
봄('원본이 비면 띠가 없다', numDiffHTML('', 변, '', '③'), '');

console.log(`\n${fail ? '✗' : '✓'} ${pass}/${pass + fail}`);
process.exit(fail ? 1 : 0);
