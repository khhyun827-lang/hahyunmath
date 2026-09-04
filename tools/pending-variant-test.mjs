// 「검토 대기 변형」이 정말 학생에게 안 나가는가 (2026-09-06)
//
//   node tools/pending-variant-test.mjs
//
// 사용자가 정했다 — 「바로창고로가? 내가 검토로 들어가도록 해주면 안돼?」.
// 🔴 **이 검사가 지키는 것은 «막는 문이 다 잠겼는가»다.** 학생에게 나가는 길이 둘인데
//    (데일리퀴즈 · 오답숙제) **한 곳만 막으면 다른 곳으로 그대로 나간다.**
//    화면으로는 못 본다 — 데일리퀴즈는 그날 얼굴이 박혀 있고, 오답숙제는 학생이 틀려야 뜬다.

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

const 창고 = {
  'K2-01-E-0001': [
    { code: 'K2-01-E-0001-N01', variantKind: 'N', content: '통과한 것', answer: '②' },
    { code: 'K2-01-E-0001-N02', variantKind: 'N', content: '검토 대기', answer: '③', pending: true, auto: true },
    { code: 'K2-01-E-0001-N03', variantKind: 'N', content: '버린 것',   answer: '④', deleted: true },
  ],
};
const state = { variants: 창고 };
const api = new Function('state',
  lift('variantsOfCodeAll') + '\n' + lift('variantsOfCode') + '\n'
  + lift('variantsLive') + '\n' + lift('variantIsPending') + '\n' + lift('pendingVariants')
  + '\nreturn { variantsOfCodeAll, variantsOfCode, variantsLive, pendingVariants };')(state);

console.log('\n검토 대기 변형 — 어디까지 보이나\n');
봄('강사 목록에는 검토 대기도 보인다 (버린 것만 빠진다)',
   api.variantsOfCode('K2-01-E-0001').map(v => v.code), ['K2-01-E-0001-N01', 'K2-01-E-0001-N02']);
봄('🔴 학생에게 나가는 것은 통과한 것뿐이다',
   api.variantsLive('K2-01-E-0001').map(v => v.code), ['K2-01-E-0001-N01']);
봄('번호는 «뺀 것까지» 센다 — 같은 번호가 두 번 나오면 안 된다',
   api.variantsOfCodeAll('K2-01-E-0001').length, 3);
봄('검토 목록은 대기 중인 것만',
   api.pendingVariants().map(v => v.code), ['K2-01-E-0001-N02']);
봄('버린 것은 검토 목록에도 없다',
   api.pendingVariants().some(v => v.deleted), false);

// ── 🔴 학생에게 나가는 «두 길»이 다 이 문을 쓰는가 ────────────────────
console.log('\n학생에게 나가는 길이 둘이다 — 둘 다 막혔나\n');
const dq = lift('dqFaces');
const hw = lift('codeVariantFor');
봄('① 데일리퀴즈(dqFaces)가 variantsLive 를 쓴다', /variantsLive\(/.test(dq), true);
봄('② 오답숙제(codeVariantFor)가 variantsLive 를 쓴다', /variantsLive\(/.test(hw), true);
봄('🔴 데일리퀴즈에 variantsOfCode 가 남아 있지 않다', /variantsOfCode\(/.test(dq), false);
봄('🔴 오답숙제에 variantsOfCode 가 남아 있지 않다', /variantsOfCode\(/.test(hw), false);

console.log(`\n  ${fail ? '🔴' : '✅'} ${pass} 통과 · ${fail} 실패\n`);
process.exit(fail ? 1 : 0);
