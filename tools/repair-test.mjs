// 창고 수식을 «제자리에서» 고치는 길 — 재업로드와 같은 결과인가 (2026-09-06)
//
//   node tools/repair-test.mjs
//
// 사용자가 물었다 — 「재업로드 아닌형태로 수정할 방법은 없을까?」
// 🔴 **이 검사가 붙드는 것은 «같은 결과가 나오는가» 하나다.** 다른 결과가 나오면
//    새로 올린 교재와 고쳐 둔 창고가 서로 다른 글이 되어, 어느 쪽이 맞는지 아무도 모르게 된다.
// ⚠ 규칙을 여기 베껴 적지 않는다 — hwpx.js 를 그대로 불러 쓴다.

import { loadHwpxRules } from './hwpx-node.mjs';
const { hwpxRepairEqText, convertHwpEq } = loadHwpxRules();

const NL = String.fromCharCode(10), B = String.fromCharCode(92);
let pass = 0, fail = 0;
const 봄 = (무엇, 나온것, 나와야) => {
  if (나온것 === 나와야) { pass++; console.log('  ✓ ' + 무엇); }
  else { fail++; console.log('  ✗ ' + 무엇 + NL + '      나온 것: ' + 나온것 + NL + '      나와야:  ' + 나와야); }
};
const 같나 = (무엇, a, b) => 봄(무엇, a === b ? '같다' : a + ' ≠ ' + b, '같다');

console.log(NL + '① 창고에 «날글자로» 남은 것을 고친다' + NL);
{
  봄('대문자 RM', hwpxRepairEqText('$RMO(0,0)$'), '$O(0,0)$');
  봄('소문자 rm', hwpxRepairEqText('$4rm km$'), '$4km$');
  봄('rm 에 가려 있던 bar', hwpxRepairEqText('$2rmbar{AC}$'), '$2' + B + 'overline{AC}$');
  봄('붙여 쓴 그리스 문자', hwpxRepairEqText('$alphabeta$'), '$' + B + 'alpha' + B + 'beta$');
}

console.log(NL + '② 🔴 멀쩡한 것은 «한 글자도» 안 건드린다' + NL);
{
  const 그대로 = (s) => 봄('그대로 둔다: ' + s.slice(0, 34), hwpxRepairEqText(s), s);
  그대로('$' + B + 'overline{AB}=2$');
  그대로('$' + B + 'alpha < m < ' + B + 'beta$');
  그대로('$A ' + B + 'subset B$');
  그대로('$' + B + 'left( x+1 ' + B + 'right) ^{2}$');
  그대로('$' + B + 'frac{1}{2}$');
  /* 🔴 **두 번 대도 같아야 한다.** 사람이 단추를 두 번 누를 수 있고, node 도구와 화면이
     같은 창고를 만질 수도 있다. 한 번 더 댈 때마다 글이 달라지면 그 자리가 무너진다. */
  const 한번 = hwpxRepairEqText('$RMO(0,0)$ 과 $alphabeta$');
  같나('🔴 두 번 대도 같다(멱등)', hwpxRepairEqText(한번), 한번);
}

console.log(NL + '③ 🔴 수식 «밖»은 건드리지 않는다 — 본문은 한글과 섞인 글이다' + NL);
{
  봄('한글 본문의 낱말', hwpxRepairEqText('그림에서 bar 를 보아라'), '그림에서 bar 를 보아라');
  봄('수식 밖의 RM', hwpxRepairEqText('RM 회사의 매출'), 'RM 회사의 매출');
  봄('수식 안만 고친다', hwpxRepairEqText('점 $RMA$ 는 bar 가 아니다'), '점 $A$ 는 bar 가 아니다');
}

console.log(NL + '④ 🔴 «교재를 다시 올린 것»과 결과가 같은가 (이 검사의 핵심)' + NL);
{
  /* 왼쪽 = 옛 규칙이 남긴 글을 제자리에서 고친 것 · 오른쪽 = 지금 규칙으로 새로 뽑은 것.
     둘이 달라지면 「다시 올리기」와 「다시 훑기」가 서로 다른 창고를 만든다. */
  const 짝 = [
    ['$RMO(0,0)$', 'RMO(0,0)'],
    ['$4rm km$', '4rm km'],
    ['$2rmbar{AC}$', '2rmbar{AC}'],
    ['$alphabeta+gammadelta$', 'alphabeta+gammadelta'],
    ['$RMA, RMB, RMC$', 'RMA, RMB, RMC'],
  ];
  for (const [담긴글, 원문] of 짝)
    같나('다시 훑기 = 다시 올리기 · ' + 원문, hwpxRepairEqText(담긴글), convertHwpEq(원문));
}

console.log(NL + '  ' + (fail ? '🔴' : '✅') + ' ' + pass + ' 통과 · ' + fail + ' 실패' + NL);
process.exit(fail ? 1 : 0);
