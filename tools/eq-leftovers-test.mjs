// 남은 한글 수식 낱말 · 흩어진 구간별 함수 (2026-10-24) — hwpx.js hwpEqLeftovers · tools/eq-fix.mjs fixText
//   node tools/eq-leftovers-test.mjs
// ⚠ 실제 문항 글은 안 쓴다(공개 저장소) — 같은 꼴의 지어낸 식만.
import { loadHwpxRules } from './hwpx-node.mjs';
import { fixText } from './eq-fix.mjs';

const { hwpEqLeftovers: f } = loadHwpxRules();
let pass = 0, fail = 0;
const 봄 = (무엇, 나온것, 나와야) => {
  if (나온것 === 나와야) { pass++; return; }
  fail++; console.log(`  ✗ ${무엇}\n      나온 것: ${JSON.stringify(나온것)}\n      나와야:  ${JSON.stringify(나와야)}`);
};
for (const [a, b] of [
  ['simp -> q', '\\sim p \\to  q'], ['SIM r', '\\sim  r'], ['f CIRC g', 'f \\circ  g'], ['(f circ f)', '(f \\circ  f)'],
  ['0le k \\leq9', '0\\le  k \\leq9'], ['-p \\leqx \\leqp', '-p \\leq x \\leq p'], ['i=sqrt -1', 'i=\\sqrt{-1}'], ['2pi', '2\\pi '],
  ['a sup 2', 'a ^{2}'], ['z sub 1', 'z _{1}'], ['1over \\alpha', '\\frac{1}{\\alpha}'], ['{y^{2}} over 9', '\\frac{{y^{2}}}{9}'],
  ['bar AL_{1}', '\\overline{AL}_{1}'], ['baralpha', '\\bar{\\alpha}'], ['x+1=9To03033', 'x+1=9 '],
  ['\\left\\{ \\begin{matrix}{}_{} \\\\_{}\\end{matrix} \\right.', '\\left\\{  \\right.'],
]) 봄('낱말 ' + a, f(a), b);
/* 🔴 제대로 된 LaTeX 는 그대로 — AI 변형 글을 망가뜨리면 안 된다 */
const 멀쩡 = '\\sim p \\rightarrow \\circ \\left( \\sqrt{x} \\right) \\overline{AB} \\subset A \\times \\alpha \\sin x \\leq \\le \\bar{x} \\frac{a}{b} \\text{similar pile over} \\supseteq \\subseteq \\pi';
봄('멀쩡한 LaTeX 는 그대로', f(멀쩡), 멀쩡);

/* 흩어진 구간별 함수 → cases (빈 중괄호 칸 + 식·조건 칸) */
봄('표 꼴 → cases',
  fixText('함수\n| $f \\left( x \\right) =$$\\left\\{ \\begin{matrix}\\\\\\end{matrix} . \\right.$ | $3x$ | ($x$는 짝수) |\n| $x+1$ | ($x$는 홀수) |\n의 값'),
  '함수\n$f \\left( x \\right) = \\begin{cases} 3x & \\text{(}x\\text{는 짝수)} \\\\ x+1 & \\text{(}x\\text{는 홀수)} \\end{cases}$\n의 값');
봄('좌변이 앞 칸에 · «식 (조건)» 한 칸',
  fixText('| $h(x)$ | $= {\\begin{cases}&\\\\&\\end{cases}}$ | $2x$ $(x<1)$ |\n| $5$ $(x \\geq 1)$ |'),
  '$h(x) = \\begin{cases} 2x & (x<1) \\\\ 5 & (x \\geq 1) \\end{cases}$');
봄('조건 상자 안이면 상자 줄로 남긴다',
  fixText('| (가) $g(0)=1$ |\n| (나) $g(n) = {\\begin{cases}\\begin{matrix}\\\\\\end{matrix}\\\\pile{\\\\}\\end{cases}}$ $n$ ($n$이 홀수) |\n| $2n$ ($n$이 짝수) |'),
  '| (가) $g(0)=1$ |\n| (나) $g(n) = \\begin{cases} n & \\text{(}n\\text{이 홀수)} \\\\ 2n & \\text{(}n\\text{이 짝수)} \\end{cases}$ |');
봄('세 선분 $\\OA$, $\\OB$ → 둘 다 윗줄', fixText('세 선분 $\\OA$, $\\OB$는'), '세 선분 $\\overline{OA}$, $\\overline{OB}$는');
봄('그냥 점 $\\A$ → A', fixText('점 $\\A$를'), '점 $A$를');
/* 배치 (2026-10-25) — p·q 붙음 · 두 칸 보기 표 · 그림 자리 */
const 넓 = String.fromCharCode(0x2003).repeat(2), L = String.fromCharCode(10);
봄('상자 줄의 붙은 p·q → 넓은 빈칸', fixText('| ㄱ. $p : a>0$$q : b>0$ |'), '| ㄱ. $p : a>0$' + 넓 + '$q : b>0$ |');
봄('문장 속 붙은 p·q → 쉼표', fixText('두 조건 $p : a>0$$q : b>0$에'), '두 조건 $p : a>0$, $q : b>0$에');
봄('두 칸 보기 표 → ㄱ·ㄴ 줄마다 p·q', fixText('| | [보기] | |' + L + '| ㄱ. $p : a$ ㄴ. $p : b$ | $q : c$ $q : d$ |'),
  '| [보기] |' + L + '| ㄱ. $p : a$' + 넓 + '$q : c$ |' + L + '| ㄴ. $p : b$' + 넓 + '$q : d$ |');
봄('끝 그림 표 → [그림 n] 줄 위로', fixText('[그림 $1$]과 같이' + L + '[그림 $1$]' + L + '글' + L + '[그림 $2$]' + L + '| ⟦그림:https://x/a⟧ | ⟦그림:https://x/b⟧ |'),
  '[그림 $1$]과 같이' + L + '⟦그림:https://x/a⟧' + L + '[그림 $1$]' + L + '글' + L + '⟦그림:https://x/b⟧' + L + '[그림 $2$]');
봄('두 번 고쳐도 같다', fixText(fixText('$simp -> q$')), fixText('$simp -> q$'));
console.log(`\n  ${fail ? '🔴' : '✅'} ${pass} 통과 · ${fail} 실패\n`);
process.exit(fail ? 1 : 0);
