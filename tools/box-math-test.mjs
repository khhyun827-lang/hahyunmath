// 상자·표 줄 안의 수식이 안 깨지는가 · 상자 글씨가 본문을 따르는가 (2026-10-17)
//
//   node tools/box-math-test.mjs
//
// 사용자 — 「수식이 이렇게 깨지는 것들이 많이 생긴 것 같아」 · 「본문이랑 표 안에 글씨 크기가 달라져」
// 🔴 problemHTML 은 `| … |` 줄을 `|` 로 칸을 가른다. 수식 안의 `|`(절댓값 `\left| x \right|`)에서도 갈라
//    수식이 반으로 잘렸다(K2-06-E-0622·0637-N01). 칸나누기는 `$…$` 안의 `|` 를 건너뛴다.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
let pass = 0, fail = 0;
const 봄 = (무엇, 나온것, 나와야) => {
  const ok = JSON.stringify(나온것) === JSON.stringify(나와야);
  if (ok) { pass++; console.log('  ✓ ' + 무엇); }
  else { fail++; console.log(`  ✗ ${무엇}\n      나온 것: ${JSON.stringify(나온것)}\n      나와야:  ${JSON.stringify(나와야)}`); }
};

const src = html.match(/function 칸나누기\(s\)\{[\s\S]*?\n\}/);
봄('칸나누기가 있다', !!src, true);
const 칸나누기 = new Function(src[0] + '; return 칸나누기;')();
봄('수식 밖의 | 로만 가른다', 칸나누기(' ㄱ. $\\left| x \\right|+1$ | ㄴ. $|y|$ '), [' ㄱ. $\\left| x \\right|+1$ ', ' ㄴ. $|y|$ ']);
봄('수식이 없으면 예전과 같다', 칸나누기(' 가 | 나 | 다 '), ' 가 | 나 | 다 '.split('|'));
봄('한 칸짜리 상자 속 절댓값은 한 칸으로', 칸나누기(' $=2\\left| a \\right|+\\left| b \\right|$ ').length, 1);
봄('problemHTML 이 칸나누기를 쓴다', html.includes('row.push(칸나누기(t.slice(1, -1))'), true);
봄('🔴 상자 글씨를 px 로 못박지 않는다', /\.pb-tbl\{[^}]*font-size:\s*\d/.test(html), false);

console.log(`\n  ${fail ? '🔴' : '✅'} ${pass} 통과 · ${fail} 실패\n`);
process.exit(fail ? 1 : 0);
