// 데일리퀴즈 «얼굴 고르기» 검사 — 사용자가 정한 규칙을 그대로 표로 만들어 돌린다 (2026-09-05)
//
//   node tools/dq-face-test.mjs
//
// 🔴 **DB 를 안 건드린다.** `dqPickFace` 는 순수 함수라 index.html 에서 글자로 떼어 와 부른다.
//    학생 화면을 눌러 보는 것으로는 「3·7 을 맞힌 학생이 14일에 U 를 받나」를 확인할 수 없다 —
//    실제로 14일을 기다려야 하니까. 그래서 여기서 본다.
//
// ⚠ 규칙을 고치면 **여기 표부터 고치고** 돌릴 것. 표가 곧 사용자와 한 약속이다:
//    「틀렸을때 하향으로 내리고, (있다면) 한번이라도 틀리면 상향은 내지말고 N으로 계속 했으면
//     좋겠고 3,7에서 맞은 학생이면 14일에 U가 있다면 U로, 없다면 N으로 출제했으면 좋겠어」

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

/* index.html 에서 함수 하나를 글자로 떼어 온다 — 규칙을 여기 베껴 적지 않기 위해서다.
   (hwpx.js 를 node 가 읽는 것과 같은 수법이다. 베껴 적으면 둘이 갈린다.) */
function lift(name) {
  const at = html.indexOf('function ' + name + '(');
  if (at < 0) throw new Error(name + ' 를 못 찾았습니다');
  let depth = 0, i = html.indexOf('{', at);
  for (let j = i; j < html.length; j++) {
    if (html[j] === '{') depth++;
    else if (html[j] === '}') { depth--; if (!depth) return html.slice(at, j + 1); }
  }
  throw new Error(name + ' 의 끝을 못 찾았습니다');
}
const { dqPickFace } = new Function(
  'const DQ_STEPS = [3, 7, 14];\n' + lift('dqPickFace') + '\nreturn { dqPickFace };')();

// ── 얼굴 꾸러미 두 벌 ──────────────────────────────────────────────────
const F = (face, kind) => ({ face, kind });
const 넉넉 = [F('orig','orig'), F('N01','N'), F('N02','N'), F('U01','U'), F('D01','D')];
const N만  = [F('orig','orig'), F('N01','N'), F('N02','N')];
const 원본만 = [F('orig','orig')];

const S = (o) => ({ streak:0, n:1, okN:0, seen:[], everWrong:false, correct:true, ...o });

const 검사 = [
  // [무엇을 보는가, 카드 상태, 얼굴 꾸러미, 나와야 하는 face]
  ['첫 만남은 원본',                         null,                                       넉넉, 'orig'],
  ['첫 만남은 원본 (변형이 없어도)',          null,                                       원본만, 'orig'],

  ['+3일 (1연속) 은 N',                      S({streak:1, seen:['orig']}),               넉넉, 'N01'],
  ['+7일 (2연속) 은 N — 아직 U 아님',         S({streak:2, seen:['orig','N01']}),         넉넉, 'N02'],
  ['+14일 (3연속·무결점) 은 U',              S({streak:3, seen:['orig','N01','N02']}),   넉넉, 'U01'],
  ['+14일 인데 U 가 없으면 N',               S({streak:3, seen:['orig','N01','N02']}),   N만,  'N01'],

  ['틀리면 하향(D)',                         S({streak:0, correct:false, everWrong:true, seen:['orig','N01']}), 넉넉, 'D01'],
  ['틀렸는데 D 가 없으면 N',                 S({streak:0, correct:false, everWrong:true, seen:['orig','N01']}), N만, 'N02'],

  ['한 번 틀린 뒤 3연속이어도 U 는 안 낸다',   S({streak:3, everWrong:true, seen:['orig','N01','N02']}), 넉넉, 'N01'],
  ['한 번 틀린 뒤에는 계속 N',               S({streak:1, everWrong:true, seen:['orig','N01']}),      넉넉, 'N02'],

  ['안 본 것을 먼저 낸다',                    S({streak:1, seen:['orig','N01']}),         넉넉, 'N02'],
  ['다 봤으면 가장 오래전 것으로 돌아간다',    S({streak:1, seen:['N02','orig','N01']}),   넉넉, 'N02'],
];

let 통과 = 0, 실패 = 0;
console.log('\n  데일리퀴즈 — 어느 얼굴을 낼 것인가\n  ' + '─'.repeat(62));
for (const [무엇, st, faces, 기대] of 검사) {
  const got = dqPickFace(st, faces);
  const 실제 = got ? got.face : '(없음)';
  const ok = 실제 === 기대;
  if (ok) 통과++; else 실패++;
  console.log(`  ${ok ? '✅' : '🔴'} ${무엇.padEnd(30)} → ${실제.padEnd(6)}${ok ? '' : '  기대: ' + 기대}`);
}
console.log('  ' + '─'.repeat(62));
console.log(`  ${통과} 통과 · ${실패} 실패\n`);
process.exit(실패 ? 1 : 0);
