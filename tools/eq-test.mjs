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

const { convertHwpEq, hwpxBalanceLeftRight } = loadHwpxRules();

/* 화면 쪽 규칙(problemHTML)도 여기서 같이 본다 — 수식과 «같은 글»을 다루는 짝이라서다. */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const lift = (n) => { const at = html.indexOf('function ' + n + '('); let d = 0;
  for (let j = html.indexOf('{', at); j < html.length; j++) {
    if (html[j] === '{') d++; else if (html[j] === '}') { d--; if (!d) return html.slice(at, j + 1); } } };
const { problemHTML } = new Function('escHtml', 'CHOICE_MARKS',
  lift('spaceChoices') + String.fromCharCode(10) + lift('빈칸세우기') + String.fromCharCode(10) + lift('problemHTML') + String.fromCharCode(10) + 'return { problemHTML };')(
  (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'), '①②③④⑤');
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


// ⑩ 보기 상자의 제목 — 첫 줄이 [보기]면 «내용»이 아니라 «제목»이다
{
  const NL = String.fromCharCode(10);
  const H = (s) => problemHTML(s);
  const 보기 = H('| [보기] |' + NL + '| ㄱ. 가 |' + NL + '| ㄴ. 나 |');
  든가('제목으로 세운다', 보기, 'class="pb-bl">보기<');
  든가('상자에 titled 를 붙인다', 보기, 'pb-tbl box titled');
  없나('제목이 상자 «안»에 또 있지 않다', 보기, '<td>[보기]</td>');
  든가('내용은 그대로 남는다', 보기, 'ㄱ. 가');
  // 🔴 좁게 잡는다 — 이어지는 글이면 본문이다
  없나('「[보기] ㄱ. …」는 제목이 아니다', H('| [보기] ㄱ. 가 |' + NL + '| ㄴ. 나 |'), 'pb-bl');
  없나('한 줄짜리 상자는 제목만 남기지 않는다', H('| 보기 |'), 'pb-bl');
}

// ⑪ SCENE 딱지가 문항 끝에 딸려 오던 것 (K2-01-E-0035 · 실측 10개)
{
  const { stripTrailingTypeTitle: 떼기 } = loadHwpxRules();
  const NL = String.fromCharCode(10);
  봄('SCENE 딱지는 뗀다', 떼기('문제다' + NL + NL + NL + '| SCENE | 2 | |'), '문제다');
  봄('🔴 칸이 셋이어도 진짜 표는 남긴다',
     떼기('문제다' + NL + NL + NL + '| 가 | 나 | 다 |'), '문제다' + NL + NL + NL + '| 가 | 나 | 다 |');
  봄('SCENE 이지만 번호가 없으면 안 뗀다',
     떼기('문제다' + NL + NL + NL + '| SCENE | 가 | |'), '문제다' + NL + NL + NL + '| SCENE | 가 | |');
}


// ⑫ 붙여 쓴 낱말들 — 교재가 띄어쓰기를 거의 안 한다 (실측 60문항 넘게 걸려 있었다)
{
  든가('root 는 sqrt 의 다른 이름 (4root2)', convertHwpEq('4root2'), '4' + B + 'sqrt{2}');
  든가('root{…} 도 된다', convertHwpEq('root{29}'), B + 'sqrt{29}');
  든가('붙여 쓴 over (11over5)', convertHwpEq('11over5'), B + 'frac{11}{5}');
  든가('띄어 쓴 over (25 over8)', convertHwpEq('25 over8'), B + 'frac{25}{8}');
  든가('🔴 2sqrt{…} — 앞에 숫자가 붙어도', convertHwpEq('2sqrt { 2}'), B + 'sqrt{');
  든가('bar + 소문자 (barz)', convertHwpEq('barz'), B + 'overline{z}');
  든가('box{…} 는 네모 친 자리', convertHwpEq('box{~(가)~}'), B + 'boxed{');
  든가('timesy', convertHwpEq('x timesy'), B + 'times ');
  든가('nin', convertHwpEq('2 nin Z'), B + 'notin ');
  든가('cdotscdots', convertHwpEq('a cdotscdots b'), B + 'cdots ' + B + 'cdots ');
  // 🔴 되돌이 방지 — 뿌리(replaceBalancedKeyword)를 건드렸으니 나머지가 그대로인지 본다
  든가('cases 는 그대로', convertHwpEq('cases{a#b}'), B + 'begin{cases}');
  든가('cases 의 줄바꿈도 그대로', convertHwpEq('cases{a#b}'), B + B);
  든가('bar{AB} 는 그대로', convertHwpEq('bar{AB}'), B + 'overline{AB}');
  없나('\overline 을 over 로 다시 안 자른다', convertHwpEq('bar{AB}'), B + 'frac');
}


// ⑬ (가) 빈칸 · 답이 둘인 선지 (2026-09-04 · 사용자가 캡처로 짚었다)
{
  const NL = String.fromCharCode(10);
  const H = (s) => problemHTML(s);
  const 상자 = H('| ${AB}^2 =$(가)$+b^2$ |');
  든가('🔵 상자 안의 (가)를 «빈칸»으로 세운다', 상자, 'class="pb-blank">(가)<');
  없나('🔴 평범한 글에서는 안 건드린다', H('위의 과정에서 (가), (나)에 알맞은 것은?'), 'pb-blank');
  없나('🔴 (단, …) 같은 괄호도 안 건드린다', H('| (단, a>0) |'), 'pb-blank');

  const 표 = H('(가) (나)' + NL + '① $a$ $b$' + NL + '② $c$ $d$');
  든가('답이 둘이면 «표»로 세운다', 표, 'class="pb-cht"');
  든가('머리줄을 표의 머리로 올린다', 표, 'tr class="h"');
  없나('머리줄이 본문에 두 번 안 남는다', 표.replace(/<table[\s\S]*<\/table>/, ''), '(가) (나)');
  const 격자 = H('① $4$ ② $5$');
  든가('답이 하나면 그대로 «격자»다', 격자, 'class="pb-ch"');
  없나('그때는 표가 아니다', 격자, 'pb-cht');
}

/* 🔵 **«수식 남은 넷» — 사용자가 09-06에 짚어 마지막으로 남아 있던 것들** (2026-09-06).
   564제를 다시 훑어 찾은 것은 셋이었다(`abx` 는 흠이 아니라 진짜 변수 곱 a·b·x 였다).
   ⚠ 셋 다 «같은 문항 안에서 띄어 쓴 쪽은 멀쩡히 그려지고 붙여 쓴 쪽만» 깨져 있었다 —
     그래서 눈으로는 하나만 이상해 보이고 원인이 안 보인다. */
{
  /* K2-02-E-0171 — `rm` 앞이 숫자라 낱말 경계가 없어 안 걷혔다. 그러면 bar 규칙도 못 알아본다. */
  봄('🔴 숫자에 붙은 rm 도 걷는다 (2rmbar)', convertHwpEq('2rmbar{AC}'), '$2'+B+'overline{AC}$');
  봄('🔴 rm 뒤에 낱말이 와도 (4rm km)', convertHwpEq('4rm km'), '$4km$');
  /* 🔴 **대문자 `RM` 도 온다** — 창고 660건 중 36건이 `RMO(0,0)` 꼴로 담겨 있었다.
     한글 수식 명령은 대소문자를 안 가린다. 09-06에 창고를 읽어 보다가 눈에 걸렸다. */
  봄('🔴 대문자 RM 도 걷는다 (RMO → O)', convertHwpEq('RMO(0,0)'), '$O(0,0)$');
  봄('점 이름이 줄줄이 붙어도', convertHwpEq('RMA, RMB, RMC'), '$A, B, C$');
  든가('⚠ 대문자 NORM 의 꼬리는 안 건드린다', convertHwpEq('NORM'), 'NORM');
  든가('⚠ TERM 도', convertHwpEq('TERM'), 'TERM');
  든가('⚠ form·term 의 꼬리는 안 건드린다', convertHwpEq('form'), 'form');
  든가('⚠ norm 도', convertHwpEq('norm'), 'norm');

  /* K2-03-E-0278 — `alphabeta+gammadelta`. 같은 문항의 `alpha<m<beta` 는 멀쩡했다. */
  봄('🔴 붙여 쓴 그리스 문자를 편다', convertHwpEq('alphabeta+gammadelta'),
     '$'+B+'alpha'+B+'beta+'+B+'gamma'+B+'delta$');
  봄('셋이 붙어도', convertHwpEq('alphabetagamma'), '$'+B+'alpha'+B+'beta'+B+'gamma$');
  /* ⚠ 짧은 것부터 재면 phi 를 p+hi 로 못 읽는다 — 긴 것부터 재는지 본다. */
  봄('⚠ 긴 것부터 잰다 (pi 가 phi 를 안 물어뜯는다)', convertHwpEq('phipi'), '$'+B+'phi'+B+'pi$');
  /* 🔴 여기가 09-06에 한 번 틀렸던 자리 — 뒤따르는 옛 고리가 방금 만든 것을 또 바꿔
     `\\alpha` 가 됐고, 그러면 그 수식이 통째로 안 그려진다. */
  없나('🔴 역슬래시가 두 번 붙지 않는다', convertHwpEq('alphabeta'), B+B);
  /* 🔵 한 낱말만 붙은 것은 «변수 이름일 수 있어» 안 건드린다 — 그것이 이 규칙의 안전줄이다. */
  봄('🔵 그리스 낱말 하나에 글자가 붙으면 안 건드린다', convertHwpEq('alphax'), '$alphax$');
  든가('🔵 띄어 쓴 것은 예전 그대로', convertHwpEq('alpha < m < beta'), B+'alpha');
}

/* 🔵 **«빨갛게 뜨는 것»을 찾아서 고친 것들** (2026-09-06 · 사용자가 짚었다 —
   「주기나 문항들에도 수식 오류가 많아 쭉 훑어봐도 빨간색으로 뜬것들이 있어」).
   🔴 **이번에는 짐작하지 않고 «KaTeX 로 실제로 그려 봤다»** — 창고 660건 · 수식 7638개 중
     18개가 빨갛게 떴다. 눈으로 훑는 것과 세어 보는 것은 다른 일이다.
   ⚠ 여기 넷은 전부 «수식 하나가 통째로 안 그려지는» 꼴이다. 한 글자가 어긋나면
     KaTeX 는 그 수식을 통째로 버리고 빨간 글씨를 낸다 — 조금 이상한 정도로 안 끝난다. */
{
  /* ① 실측 원문 `A CUPB!=U` — 뒤에 공백이 없어 `\neqU` 라는 «없는 명령»이 됐다. */
  든가('🔴 != 뒤에 공백을 붙인다', convertHwpEq('A CUPB!=U'), B + 'neq U');
  없나('그래야 없는 명령이 안 생긴다', convertHwpEq('x!=y'), B + 'neqy');

  /* ② 실측 원문 `S_2 over S_1` — 「낱글자」만 받으니 «2 over S» 를 집어 아래첨자가 둘이 됐다. */
  봄('🔴 over 가 아래첨자까지 «한 덩이»로 본다', convertHwpEq('S_2 over S_1'),
     '$' + B + 'frac{S_{2}}{S_{1}}$');
  봄('중괄호 아래첨자도', convertHwpEq('a_{n+1} over b_{n}'),
     '$' + B + 'frac{a_{n+1}}{b_{n}}$');
  봄('🔵 예전 꼴은 그대로', convertHwpEq('1 over 2'), '$' + B + 'frac{1}{2}$');

  /* ③ 🔴 **원본 자체가 깨져 있다** — 실측 `{rmA}it{(-1,~2)`. 한글은 너그럽게 그려 주지만
     KaTeX 는 못 읽는다. 원본을 못 고치니 읽는 쪽이 다듬는다. */
  봄('🔴 안 닫힌 중괄호를 닫는다', convertHwpEq('{rmA}it{(-1,~2)'), '${A}{(-1,~2)}$');
  봄('남는 닫는 괄호는 버린다', convertHwpEq('6 sqrt2 }+ 2'), '$6 ' + B + 'sqrt{2} + 2$');
  봄('🔵 닫고 나서야 bar 가 보인다', convertHwpEq('bar{QP'), '$' + B + 'overline{QP}$');

  /* 🔴 **다듬는 자리가 LEFT/RIGHT «뒤»여야 한다.** 한글에서 `LEFT {` 의 중괄호는 묶음이
     아니라 구분자다 — 앞에서 세면 짝이 안 맞는 줄 알고 맨 `}` 를 붙인다.
     2026-09-06에 실제로 그렇게 만들어 집합 50여 문항에 군더더기가 붙었다. */
  봄('🔴 LEFT { 를 «묶음»으로 세지 않는다 (군더더기 } 가 안 붙는다)',
     convertHwpEq('LEFT { x VERT x RIGHT }'), '$' + B + 'left' + B + '{ x ' + B + 'vert x ' + B + 'right' + B + '}$');
  든가('그 집합은 멀쩡히 그려진다', convertHwpEq('LEFT { x VERT x RIGHT }'), B + 'left' + B + '{');

  /* ④ `\left` 와 `\right` 의 짝. 어긋나면 그 수식이 통째로 안 그려진다. */
  /* 🔴 **수는 맞는데 «차례»가 어긋난 것** — 위의 셈만으로는 못 잡는 자리다(실측 1211119OR).
     두 번째 \\right 는 열린 것이 없는 자리에서 나온다. */
  봄('🔴 열린 것 없이 나온 오른쪽을 지운다',
     hwpxBalanceLeftRight(B + 'left. ' + B + 'right) ' + B + 'right' + B + '} : ' + B + 'left('),
     B + 'left. ' + B + 'right) ' + B + '} : ' + B + 'left(' + B + 'right.');
  든가('모자라면 안 보이는 짝을 채운다', convertHwpEq('LEFT ( a'), B + 'right.');
}

console.log('');
console.log('  ' + (fail ? '🔴' : '✅') + ' ' + pass + ' 통과 · ' + fail + ' 실패');
console.log('');
process.exit(fail ? 1 : 0);
