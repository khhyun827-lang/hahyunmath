// 교재와 빠른정답표를 «같이» 올릴 때 (2026-09-04)
//
//   node tools/upload-together-test.mjs
//
// 사용자 제안 — 「하나씩 올리는게아니라 문제 파일 올릴때 같이 올리는게 더 안정적이지 않을까?」
//
// 🔵 «안정적»인 까닭이 겉보기보다 크다:
//    ① 어느 교재인지 **물을 필요가 없다** — 교재 파일 안의 코드가 이미 말해 준다.
//    ② 🔴 **한 칸 밀림을 그 자리에서 검사할 수 있다** — 교재 미주에 객관식 정답이 깨끗하게 있다.
//       따로 올리면 견줄 것이 없어 이 검사를 아예 못 한다.
//
// 그리고 사용자가 물은 것 하나 더 — 「이전에 빠른정답표는 10열짜리 번호 정답 구조였는데
// 이 표 구조가 달라도 괜찮은지 궁금해」. 열 수는 상관없다(글을 펴서 읽으므로).
// ⚠ **다만 «세로로 내려가는» 표는 조용히 틀린다** — 그것을 잡는 검사가 여기 있다.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

function lift(name, kind = 'function') {
  const at = html.indexOf(kind + ' ' + name + '(');
  if (at < 0) throw new Error(name + ' 를 못 찾았습니다');
  let depth = 0;
  for (let j = html.indexOf('{', at); j < html.length; j++) {
    if (html[j] === '{') depth++;
    else if (html[j] === '}') { depth--; if (!depth) return html.slice(at, j + 1); }
  }
  throw new Error(name + ' 의 끝을 못 찾았습니다');
}

let pass = 0, fail = 0;
const 봄 = (무엇, 나온것, 나와야할것) => {
  const ok = JSON.stringify(나온것) === JSON.stringify(나와야할것);
  if (ok) { pass++; console.log('  ✓ ' + 무엇); }
  else { fail++; console.log(`  ✗ ${무엇}\n      나온 것: ${JSON.stringify(나온것)}\n      나와야:  ${JSON.stringify(나와야할것)}`); }
};

/* ── 표의 «꼴»을 보는 규칙 ── */
const { icKeyLooksRowMajor } = new Function(lift('icKeyLooksRowMajor') + '\nreturn { icKeyLooksRowMajor };')();
const 가로표 = (n) => Object.fromEntries(Array.from({ length: n }, (_, i) => [i + 1, '②']));
const 세로표 = () => ({ 1:'②', 2:'③', 3:'④', 6:'②', 9:'⑤' });   // 실측한 세로 표의 결과

console.log('\n표의 «꼴» — 열 수는 상관없지만 세로 표는 잡아야 한다\n');
봄('가로 표는 통과 (1~50 이 다 있다)', icKeyLooksRowMajor(가로표(50)).ok, true);
봄('🔴 세로 표는 걸린다 (번호가 뚝뚝 끊긴다)', icKeyLooksRowMajor(세로표()).ok, false);
봄('빠진 수를 센다', icKeyLooksRowMajor(세로표()).빈칸, 4);
봄('아주 작은 표는 안 따진다 (판단할 근거가 없다)', icKeyLooksRowMajor({ 1:'②', 2:'③' }).ok, true);
{
  /* 한두 개 빠진 것은 흔하다 — 그건 막을 일이 아니다 */
  const t = 가로표(100); delete t[7]; delete t[88];
  봄('한두 개 빠진 것은 통과', icKeyLooksRowMajor(t).ok, true);
}

/* ── 함께 올릴 때의 흐름 ── */
console.log('\n같이 올릴 때 — 어느 교재인지 묻지 않고, 밀림을 검사한다\n');
const 소스 = lift('icFillBodies', 'async function');
봄('교재 파일과 정답표를 갈라 본다', /icClassify\(/.test(소스), true);
봄('🔴 어느 교재인지 «묻지» 않는다 — 코드가 말해 준다',
   /state\.icAnsBook/.test(소스), false);
봄('🔴 한 칸 밀림을 미주와 맞대 본다', /어긋남\+\+/.test(소스), true);
봄('🔴 어긋나면 표를 «안 담고» 본문만 담는다', /표가 이 교재의 것이 아니거나/.test(소스), true);
봄('🔴 세로 표면 표를 안 담는다', /번호가 이어지지 않습니다/.test(소스), true);
봄('맞았으면 몇 개를 맞대 봤는지 말한다', /미주와 맞대 봐서 다 맞았습니다/.test(소스), true);
봄('그림 여럿(선지 그림)은 그대로 지킨다', /alreadyMany/.test(소스), true);
봄('있던 정답을 빈 것으로 안 덮는다', /itemAnswerToKeep/.test(소스), true);
봄('여러 파일을 받는다', /Array\.from\(\(input && input\.files\) \|\| \[\]\)/.test(소스), true);
봄('화면도 여러 파일을 고를 수 있다', html.includes('accept=".hwpx" multiple'), true);

console.log(`\n  ${fail ? '🔴' : '✅'} ${pass} 통과 · ${fail} 실패\n`);
process.exit(fail ? 1 : 0);
