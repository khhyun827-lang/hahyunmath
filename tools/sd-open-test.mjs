// 학생 상세 — 옆 목록에서 다른 학생을 누르면 «보던 갈래»를 이어 보는가 (2026-09-20)
//
//   node tools/sd-open-test.mjs
//
// 사용자의 말 — 「학생 이번달 리포트 보고있다가 옆에 다른학생 누르면 바로 이번달 리포트 이어서 볼 수 있으면 좋겠음.
//   *현재는 선택한 학생의 학생연대기?로 감」
// ⚠ 명단·신호에서 «들어올» 때는 연대기여야 한다 — 그때는 아직 아무 학생도 안 보고 있었다.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/\r\n/g, '\n');
const NL = '\n';
function lift(name) {
  const at = html.search(new RegExp('^(async )?function ' + name + '\\(', 'm'));
  if (at < 0) throw new Error(name + ' 를 못 찾았습니다');
  let d = 0;
  for (let j = html.indexOf('{', at); j < html.length; j++) {
    if (html[j] === '{') d++;
    else if (html[j] === '}') { d--; if (!d) return html.slice(at, j + 1); }
  }
}
let pass = 0, fail = 0;
const 봄 = (무엇, 나온것, 나와야) => {
  const ok = JSON.stringify(나온것) === JSON.stringify(나와야);
  ok ? pass++ : fail++;
  console.log((ok ? '  ✓ ' : '  ✗ ') + 무엇 + (ok ? '' : NL + '      나온 것: ' + JSON.stringify(나온것) + NL + '      나와야:  ' + JSON.stringify(나와야)));
};

const 만들기 = (state) => new Function('state', 'render', lift('sdOpen') + NL + 'return sdOpen;')(state, () => {});

{
  const state = { studentDetailId: 's1', studentDetailTab: 'report', reportYm: '2026-08' };
  만들기(state)('s2');
  봄('🔴 리포트를 보다가 옆 학생을 누르면 리포트 그대로', [state.studentDetailId, state.studentDetailTab], ['s2', 'report']);
  봄('   달도 그대로다 — 학생과 무관한 값이라 건드리지 않는다', state.reportYm, '2026-08');
}
{
  const state = { studentDetailId: 's1', studentDetailTab: 'chat' };
  만들기(state)('s2');
  봄('   채팅도 같은 규칙 — 갈래마다 다르게 굴지 않는다', state.studentDetailTab, 'chat');
}
{
  const state = { studentDetailId: null, studentDetailTab: 'report' };
  만들기(state)('s2');
  봄('🔴 명단에서 «들어올» 때는 연대기 — 지난번에 리포트를 봤어도', state.studentDetailTab, 'timeline');
}
{
  const state = { studentDetailId: 's1', studentDetailTab: 'report' };
  만들기(state)('s2', 'consult');
  봄('   갈래(filter)를 들고 부르면 연대기의 그 갈래로', [state.studentDetailTab, state.sdFilter], ['timeline', 'consult']);
}
{
  봄('   옆 목록의 항목이 sdOpen 을 부른다', /class="li \$\{p\.studentId===sid\?'on':''\}" onclick="sdOpen\('\$\{p\.studentId\}'\)"/.test(html), true);
}

console.log(NL + (fail ? '🔴 ' + fail + '개 실패 · ' : '✓ 전부 통과 · ') + pass + '개' + NL);
process.exit(fail ? 1 : 0);
