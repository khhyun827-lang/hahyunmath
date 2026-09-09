// 판정을 «일부러 망가뜨려» 검사가 무는지 본다 (2026-09-09)
//
//   node tools/store-diff-bite.mjs
//
// 🔴 **통과하는 검사는 아무것도 증명하지 않는다.** store-diff-test.mjs 46가지가
//    다 초록이어도, 판정을 망가뜨렸을 때 그대로 초록이면 그 검사는 빈 껍데기다.
//    그래서 여기서 hwpx.js 를 다섯 가지로 망가뜨려 보고 «무는지»를 잰다.
//
// ⚠ **원본은 언제나 되돌린다** (finally). 중간에 멈춰도 hwpx.js 는 제 모습이다.
//    ⚠ 이 도구가 도는 동안 hwpx.js 가 잠깐 망가진 채로 있다 — 다른 것을 같이 돌리지 말 것.
import fs from 'fs';
import { execFileSync } from 'child_process';

const P = 'hwpx.js';
const 원본 = fs.readFileSync(P, 'utf8');

const 흠들 = [
  ['코드 지운 복사본 막이를 뺀다',
   'const 후보 = 후보전부.filter(c => !파일이든코드.has(c));', 'const 후보 = 후보전부;'],
  ['정규화를 안 지나고 날글자로 견준다',
   'if(잣대(옛.content) === x.글)', 'if(옛.content === x.content)'],
  ['한 파일 안 코드 중복 세기를 끈다',
   'if(무리.length > 1){', 'if(false){'],
  ['«빠졌다»의 테두리를 없앤다',
   'if(t && 테.has(t) && !파일이든코드.has(code))', 'if(!파일이든코드.has(code))'],
  ['«고쳤다»도 막게 한다 (경보가 아닌데 막으면 안 된다)',
   'if(v.복사됨.length)', 'if(v.복사됨.length || v.고쳤다.length)'],
];

let 문것 = 0;
try {
  for (const [이름, 옛, 새] of 흠들) {
    if (!원본.includes(옛)) { console.log('  ⚠ 자리를 못 찾음 — ' + 이름); continue; }
    fs.writeFileSync(P, 원본.replace(옛, 새));
    let 실패수 = 0;
    try {
      const out = execFileSync('node', ['tools/store-diff-test.mjs'], { encoding: 'utf8' });
      실패수 = +(out.match(/·\s*(\d+)\s*실패/) || [0, 0])[1];
    } catch (e) {
      실패수 = +((e.stdout || '').match(/·\s*(\d+)\s*실패/) || [0, 1])[1] || 1;
    }
    if (실패수 > 0) { 문것++; console.log('  ✓ 문다 (' + 실패수 + '가지 실패) — ' + 이름); }
    else console.log('  🔴 안 문다 — ' + 이름);
  }
} finally {
  fs.writeFileSync(P, 원본);
}
console.log('\n  ' + 문것 + ' / ' + 흠들.length + ' 가지 흠을 물었다. 원본은 되돌렸다.');
process.exit(문것 === 흠들.length ? 0 : 1);
