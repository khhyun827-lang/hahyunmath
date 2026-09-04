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


// ⑧ 집합 기호 — 05 집합 단원 78문항(14%)이 날글자로 뜨고 있었다
{
  든가('A capB 를 갈라 바꾼다', convertHwpEq('A capB'), 'A ' + B + 'cap B');
  든가('대문자 CUP 도 된다', convertHwpEq('A CUP B'), B + 'cup ');
  든가('emptyset', convertHwpEq('emptyset'), B + 'emptyset');
  든가('subsetleft{ 도 갈라진다', convertHwpEq('emptyset subsetleft{0right}'), B + 'subset ');
  든가('0inemptyset 처럼 양쪽이 붙어도', convertHwpEq('0inemptyset'), B + 'in ');
  든가('notsubset 은 긴 것부터', convertHwpEq('A notsubset B'), B + 'not' + B + 'subset ');
  // 🔴 여기가 요점 — 고치려다 멀쩡한 낱말을 망가뜨리면 안 된다
  봄('sin·min 은 안 건드린다', convertHwpEq('sin x + min y'), '$sin x + min y$');
  없나('escape 의 cap 은 안 걸린다', convertHwpEq('escape'), B + 'cap');
}

// ⑨ 문항 끝에 딸려 오는 «다음 유형의 제목»
{
  const { stripTrailingTypeTitle: 떼기 } = loadHwpxRules();
  const NL = String.fromCharCode(10);
  봄('선지 뒤의 제목은 뗀다',
     떼기('문제다' + NL + NL + '① 가 ② 나' + NL + NL + NL + '| 두 점 사이의 거리 |'),
     '문제다' + NL + NL + '① 가 ② 나');
  봄('빈 줄 둘을 사이에 둔 제목도 뗀다',
     떼기('문제다' + NL + NL + NL + '| 좌표화 |'), '문제다');
  봄('🔴 조건 상자는 남긴다',
     떼기('문제다' + NL + NL + '| (가) 어떤 조건 |'), '문제다' + NL + NL + '| (가) 어떤 조건 |');
  봄('🔴 칸이 둘 이상인 진짜 표는 남긴다',
     떼기('문제다' + NL + NL + '| 가 | 나 |'), '문제다' + NL + NL + '| 가 | 나 |');
  봄('붙어 있으면(빈 줄 하나) 안 건드린다',
     떼기('문제다' + NL + '| 무언가 |'), '문제다' + NL + '| 무언가 |');
  봄('ㄱ. 으로 시작해도 남긴다',
     떼기('문제다' + NL + NL + NL + '| ㄱ. 조건 |'), '문제다' + NL + NL + NL + '| ㄱ. 조건 |');
}

console.log('');
console.log('  ' + (fail ? '🔴' : '✅') + ' ' + pass + ' 통과 · ' + fail + ' 실패');
console.log('');
process.exit(fail ? 1 : 0);
