// 한글 수식 → LaTeX 변환 검사 (2026-09-04)
//
//   node tools/eq-test.mjs
//
// 🔴 **여기 있는 것은 전부 «사용자가 화면에서 겪은» 것이다.** 「수식이 제대로 뜨지 않는 것들이
//    많아」라고 짚어 준 뒤 교재 564제를 훑어서 원인을 갈라낸 결과다.
//    수식 하나가 깨지면 KaTeX 는 **그 수식을 통째로 안 그린다** — 화면에 날 LaTeX 가 뜬다.
//
// ⚠ 규칙을 여기 베껴 적지 않는다. hwpx.js 를 그대로 불러 쓴다 (베껴 적으면 둘이 갈린다).

import { loadHwpxRules } from './hwpx-node.mjs';

const { convertHwpEq } = loadHwpxRules();
const B = String.fromCharCode(92);
let pass = 0, fail = 0;
const 봄 = (무엇, 나온것, 나와야할것) => {
  if (나온것 === 나와야할것) { pass++; console.log('  ✓ ' + 무엇); }
  else { fail++; console.log('  ✗ ' + 무엇); console.log('      나온 것: ' + 나온것); console.log('      나와야:  ' + 나와야할것); }
};
const 든가 = (무엇, s, 조각) => {
  if (String(s).includes(조각)) { pass++; console.log('  ✓ ' + 무엇); }
  else { fail++; console.log('  ✗ ' + 무엇); console.log('      나온 것: ' + s); console.log('      들어야:  ' + 조각); }
};
const 없나 = (무엇, s, 조각) => {
  if (!String(s).includes(조각)) { pass++; console.log('  ✓ ' + 무엇); }
  else { fail++; console.log('  ✗ ' + 무엇); console.log('      나온 것: ' + s); console.log('      없어야: ' + 조각); }
};
const 세기 = (s, 낱말) => (s.split(B + 낱말).length - 1);

console.log('');
console.log('한글 수식 → LaTeX');
console.log('');

// ① 백틱은 «지우는 것»이 아니라 «공백»이다 (K2-01-E-0009 가 여기서 깨졌다)
{
  const r = convertHwpEq('left|` a`right| = 4');
  든가('백틱이 공백이 되어 right 를 알아본다', r, B + 'right|');
  없나('날글자 right 가 안 남는다', r, 'aright');
}

// ② 앞 글자·숫자에 «붙여 쓴» LEFT/RIGHT — 교재에 실제로 있다
{
  든가('4RIGHT ) 를 알아본다', convertHwpEq('A LEFT ( -1, ~4RIGHT )'), B + 'right)');
  든가('1right} 를 알아본다', convertHwpEq('A= LEFT { 0,~1right}'), B + 'right' + B + '}');
  든가('subsetleft{ 를 알아본다', convertHwpEq('emptyset subsetleft{0right}'), B + 'left' + B + '{');
}

// ③ 🔴 짝이 안 맞으면 KaTeX 는 «수식을 통째로» 안 그린다 — 보이지 않는 짝으로 맞춘다
{
  const r = convertHwpEq('A= LEFT { 0,~9');
  든가('닫는 짝이 없으면 보이지 않는 짝을 붙인다', r, B + 'right.');
  봄('여는 수와 닫는 수가 같다', 세기(r, 'left') + ':' + 세기(r, 'right'), '1:1');
}

// ④ 수식 안의 # 는 줄바꿈, ~~~~ 는 맞춤용 채움 (K2-01-E-0011)
{
  const r = convertHwpEq('sqrt {x}#~~~~~~~~~~+ sqrt {y}');
  없나('# 가 날글자로 안 남는다', r, '#');
  없나('~ 가 줄줄이 안 남는다', r, '~~~');
  든가('식은 그대로다', r, B + 'sqrt{x}');
}

// ⑤ 🔴 회귀 방지 — 행렬·cases 의 줄바꿈은 «역슬래시 두 개»여야 한다
{
  const r = convertHwpEq('cases{a#b}');
  든가('cases 환경으로 싼다', r, B + 'begin{cases}');
  든가('줄바꿈은 역슬래시 둘이다', r, B + B);
}

// ⑥ prime — 백틱을 공백으로 바꾸면서 `O primeA primeB` 꼴이 생겼다
{
  const r = convertHwpEq('O`prime A`prime B`prime');
  없나('날글자 prime 이 안 남는다', r, ' prime');
  봄('세 개가 다 바뀐다', 세기(r, 'prime'), 3);
}

// ⑦ 여태 되던 것이 그대로 되는가
{
  든가('LEFT ( 는 그대로 된다', convertHwpEq('LEFT ( a+b RIGHT )'), B + 'left(');
  든가('bar 는 윗줄이 된다', convertHwpEq('bar{AB}'), B + 'overline{AB}');
  든가('sqrt 는 근호가 된다', convertHwpEq('sqrt {29}'), B + 'sqrt{29}');
  봄('빈 수식은 빈 글자', convertHwpEq('   '), '');
}

console.log('');
console.log('  ' + (fail ? '🔴' : '✅') + ' ' + pass + ' 통과 · ' + fail + ' 실패');
console.log('');
process.exit(fail ? 1 : 0);
