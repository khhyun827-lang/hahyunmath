// AI 변형이 원본의 «서식 구조»를 지키는가 (2026-09-07)
//
// 🔴 사용자가 짚었다 — 「Ai가 변형하면서 원본문항의 서식이 달라졌어. 조건박스도 사라지고
//   (가) 이것도 박스가 들어가야 하는건데 없네」. 실제로 K2-01-E-0013-N01 이 그랬다.
//   서식은 «장식»이 아니라 화면이 읽는 «구조»다 —
//     ① `| … |` 줄  → problemHTML 이 조건·증명 상자로 그린다
//     ② 수식 «밖»의 맨 (가) → 빈칸세우기가 네모를 두른다
//   Gemini 는 ①을 통째로 빼먹었고 ②를 \text{(가)} 로 수식 «안»에 넣었다.
//
// 🔵 고치는 자리가 둘이다 —
//   · 워커 프롬프트(layoutRule) — 다음부터 제대로 만들게
//   · 받는 쪽(normalizeTwinBlanks) — 그래도 어겼을 때 마지막 문
//   ⚠ 상자는 «지어내지 않는다». 어느 줄이 상자인지는 문제마다 달라서, 기계가 짐작하면
//     엉뚱한 줄이 상자가 된다. 그건 읽기 나쁜 문제가 아니라 «틀린 문제»다. 그래서 경고만 한다.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const wrk = fs.readFileSync(path.join(ROOT, 'worker', 'gemini-proxy.js'), 'utf8');
const NL = String.fromCharCode(10);
const BS = String.fromCharCode(92);

const 조각 = html.slice(html.indexOf('const 빈칸찾기'), html.indexOf('function normalizeTwinAnswer'));
const { normalizeTwinBlanks, variantLayoutProblem } =
  new Function(조각 + '; return { normalizeTwinBlanks, variantLayoutProblem };')();

let 흠 = 0;
const 봄 = (이름, 났다, 바람) => {
  if (JSON.stringify(났다) === JSON.stringify(바람)) return;
  흠++;
  console.log('🔴 ' + 이름 + NL + '   나온 것: ' + JSON.stringify(났다) + NL + '   바란 것: ' + JSON.stringify(바람));
};

// ① 빈칸을 수식 «밖»으로 꺼낸다
봄('\text{(가)} 를 수식 밖으로',
  normalizeTwinBlanks('$a^2 = ' + BS + 'text{(가)} + b^2$'), '$a^2 = $(가)$ + b^2$');
봄('맨 앞이면 빈 수식이 안 남는다',
  normalizeTwinBlanks('$' + BS + 'text{(가)} + b$'), '(가)$ + b$');
봄('수식 안의 맨 (나)도 꺼낸다',
  normalizeTwinBlanks('$x = (나) + y$'), '$x = $(나)$ + y$');
봄('\mathrm 도 본다',
  normalizeTwinBlanks('$' + BS + 'mathrm{(다)}$'), '(다)');
// ⚠ 반대쪽 — 건드리면 안 되는 것
봄('수식 밖은 그대로 둔다',
  normalizeTwinBlanks('위의 과정에서 (가), (나)에 알맞은 것은?'), '위의 과정에서 (가), (나)에 알맞은 것은?');
봄('\left( … \right) 은 빈칸이 아니다',
  normalizeTwinBlanks('$' + BS + 'left( a-c ' + BS + 'right)^{2}$'), '$' + BS + 'left( a-c ' + BS + 'right)^{2}$');
봄('평범한 함수 괄호도 그대로',
  normalizeTwinBlanks('$f(x) = 2x$'), '$f(x) = 2x$');
봄('한 번만 꺼낸다 (두 번 감싸지 않는다)',
  normalizeTwinBlanks(normalizeTwinBlanks('$a = ' + BS + 'text{(가)}$')), '$a = $(가)');

// ② 구조가 사라진 것을 알아채는가
const 원본상자 = '다음은 …이다.' + NL + '| 첫 줄 |' + NL + '| 둘째 줄 (가) |' + NL + '위에서 (가)는?';
/* ⚠ 상자 잣대만 «따로» 재려면 빈칸은 양쪽에 남겨 두어야 한다 —
   안 그러면 상자 잣대를 죽여도 빈칸 잣대가 대신 잡아 주어 검사에 구멍이 난다. */
const 변형줄글 = '다음은 …이다.' + NL + '첫 줄' + NL + '둘째 줄 (가)' + NL + '위에서 (가)는?';
const 변형상자 = '다음은 …이다.' + NL + '| 첫 줄 |' + NL + '| 둘째 줄 (가) |' + NL + '위에서 (가)는?';
봄('상자가 사라지면 말해 준다',
  !!variantLayoutProblem(원본상자, 변형줄글), true);
봄('상자가 살아 있으면 조용하다',
  variantLayoutProblem(원본상자, 변형상자), null);
봄('빈칸이 사라지면 말해 준다',
  !!variantLayoutProblem('(가)에 알맞은 것은?', '답을 구하시오.'), true);
봄('원본에 상자가 없으면 아무 말 안 한다',
  variantLayoutProblem('그냥 문제', '그냥 변형'), null);

// ③ 워커가 서식 규칙을 실제로 실어 보내는가
봄('워커에 layoutRule 이 있다', /const layoutRule =/.test(wrk), true);
봄('layoutRule 이 프롬프트에 들어간다', wrk.includes('${layoutRule}'), true);
봄('상자 규칙을 적어 두었다', /\| 내용 \|/.test(wrk), true);
봄('빈칸 규칙을 적어 두었다', wrk.includes('text{(가)}'), true);

// ④ 받는 자리에 물려 있는가 — 함수만 있고 안 쓰면 아무 소용이 없다
봄('받는 자리에서 부른다', /content: normalizeTwinBlanks\(/.test(html), true);
// ⑤ 검토 화면이 경고를 띄우는가
봄('검토 판이 경고를 그린다', html.includes('variantLayoutProblem(원본.content, v.content)'), true);

console.log(흠 ? '🔴 ' + 흠 + '개 어긋남' : '통과 18개');
process.exit(흠 ? 1 : 0);
