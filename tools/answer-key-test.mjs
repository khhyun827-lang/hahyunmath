// 빠른정답표 도구의 «손대는 규칙» 검사 (2026-09-06)
//
//   node tools/answer-key-test.mjs
//
// 여기서 지키는 것은 하나다 — **고치려다 멀쩡한 것을 망가뜨리지 않는가.**
// 표에 `2root2` 처럼 수식이 아니라 글자로 쳐진 것이 여섯 있어서 그것을 편다.
// 🔴 그런데 `\overline` 에도 over 가, `\sqrt` 옆에도 비슷한 글자가 있다.
//    이 검사가 없으면 «여섯을 고치려다 나머지를 망가뜨리는» 일이 조용히 일어난다.

import { 수식낱말펴기, circleOf } from './answer-key.mjs';

let pass = 0, fail = 0;
const 봄 = (무엇, 나온것, 나와야할것) => {
  if (나온것 === 나와야할것) { pass++; console.log('  ✓ ' + 무엇); }
  else { fail++; console.log(`  ✗ ${무엇}\n      나온 것: ${나온것}\n      나와야:  ${나와야할것}`); }
};

console.log('\n빠른정답표 — 손대는 규칙\n');

// ① 실제로 표에 있던 여섯 (이것 때문에 만든 규칙이다)
봄('2root2 → 2√2',        수식낱말펴기('$2root2$'),   String.raw`$2\sqrt{2}$`);
봄('root23 → √23',        수식낱말펴기('$root23$'),   String.raw`$\sqrt{23}$`);
봄('42OVER5 → 42/5',      수식낱말펴기('$42OVER5$'),  String.raw`$\frac{42}{5}$`);
봄('18over5 → 18/5',      수식낱말펴기('$18over5$'),  String.raw`$\frac{18}{5}$`);
봄('4root3 → 4√3',        수식낱말펴기('$4root3$'),   String.raw`$4\sqrt{3}$`);

// ② 🔴 멀쩡한 LaTeX 은 건드리지 않는다 — 여기가 이 검사의 요점이다
봄('overline 은 그대로',      수식낱말펴기(String.raw`$\overline{AB}$`),      String.raw`$\overline{AB}$`);
봄('overrightarrow 는 그대로', 수식낱말펴기(String.raw`$\overrightarrow{AB}$`), String.raw`$\overrightarrow{AB}$`);
봄('overbrace 는 그대로',     수식낱말펴기(String.raw`$\overbrace{x}$`),      String.raw`$\overbrace{x}$`);
봄('sqrt 는 그대로',          수식낱말펴기(String.raw`$\sqrt{2}$`),           String.raw`$\sqrt{2}$`);
봄('frac 는 그대로',          수식낱말펴기(String.raw`$\frac{1}{2}$`),        String.raw`$\frac{1}{2}$`);
봄('숫자가 없으면 안 건드린다',  수식낱말펴기('rootbeer over there'),            'rootbeer over there');

// ③ 동그라미 — 교재 363번에 ➂(U+2782)가 섞여 있었다
봄('③ 그대로',   circleOf('③'), '③');
봄('➂ 도 ③ 로', circleOf('➂'), '③');
봄('풀이 속에서도 찾는다', circleOf('정답은 ④ 이다'), '④');
봄('없으면 빈 글자', circleOf('$12$'), '');

console.log(`\n  ${fail ? '🔴' : '✅'} ${pass} 통과 · ${fail} 실패\n`);
process.exit(fail ? 1 : 0);
