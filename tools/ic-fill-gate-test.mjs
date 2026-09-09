// 웹의 «교재에서 본문 채우기» 문을 잰다 (2026-09-09)
//
//   node tools/ic-fill-gate-test.mjs
//
// 🔴 **왜 재는가** — 이 자리가 창고에 쓰는 세 문 중 가장 약했다 (docs/코드-숨기기.md 0-E):
//    ① 코드 붙은 문항을 **조건 없이 전부** 덮어썼다 (안 바뀐 561제도 매번 다시 썼다)
//    ② **코드 없는 문항을 말없이 버렸다** — 내년에 새로 넣은 문항이 그것이다.
//       화면은 「n개 담았습니다」라고만 하고 몇 개가 빠졌는지 말하지 않았다.
//    사용자가 말한 세 가지(중복 안 올리기 · 수정 비교 · 추가된 것만 받기)가 전부 여기였다.
//
// 🔴 **함수를 여기에 옮겨 적지 않는다.** index.html 에서 그대로 떠 온다.
//    (class-edit-test.mjs 와 같은 길 — 베껴 적으면 «검사는 통과하는데 실물은 다른» 자리가 생긴다.)

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadHwpxRules } from './hwpx-node.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const rules = loadHwpxRules();

/* index.html 에서 함수 하나를 글자로 떠 온다. */
function 떠온다(name) {
  let at = html.indexOf('function ' + name + '(');
  if (at < 0) throw new Error(name + ' 를 index.html 에서 못 찾았습니다');
  if (html.slice(at - 6, at) === 'async ') at -= 6;
  let depth = 0;
  for (let j = html.indexOf('{', at); j < html.length; j++) {
    if (html[j] === '{') depth++;
    else if (html[j] === '}') { depth--; if (!depth) return html.slice(at, j + 1); }
  }
  throw new Error(name + ' 의 닫는 괄호를 못 찾았습니다');
}

/* 떠 온 함수들이 기대는 것만 갖춘 판을 짓는다 — hwpx.js 의 규칙과 state 하나. */
const state = { itemBody: {} };
const 판 = new Function('state', 'rules',
  Object.keys(rules).map(k => 'const ' + k + ' = rules.' + k + ';').join('\n')
  + '\n' + ['icClassify', 'icVerdict', 'icNeedsWrite', 'icDiffBit'].map(떠온다).join('\n')
  + '\nreturn { icClassify, icVerdict, icNeedsWrite, icDiffBit };')(state, rules);

let 통과 = 0, 실패 = 0;
const 잰다 = (이름, 참) => { 참 ? (통과++, console.log('  ✓ ' + 이름)) : (실패++, console.log('  ✗ ' + 이름)); };
const 절 = (s) => console.log('\n' + s);

const A = '두 점 A(1,2), B(4,6) 사이의 거리를 구하시오.';
const B = '직선 y=2x+1 에 평행한 직선의 방정식은?';

// ── icClassify — 무엇이 문항인가 ──────────────────────────────────────
절('icClassify — 미주로 가른다 (코드로 가르지 않는다)');
{
  const r = 판.icClassify([
    { content: A, answer: '①', itemCode: 'K2-01-E-0001' },   // 코드도 미주도 있다
    { content: B, answer: '②', itemCode: '' },               // 🔴 코드 없는 «진짜 문항»
    { content: '| 평면좌표 | 03 | 직선의 방정식 | 23 |', answer: '', solution: '' },  // 목차
    { content: '   ', answer: '③', itemCode: 'K2-01-E-0009' },  // 본문이 빈 것
  ]);
  잰다('문항 둘', r.문항.length === 2);
  잰다('🔴 코드 없는 문항을 안 버린다 — 여태 여기서 사라졌다', r.코드없음.length === 1);
  잰다('🔴 미주 없는 목차는 문항이 아니다', r.앞장 === 1);
  잰다('본문이 빈 것은 세지 않는다', !r.문항.some(p => !p.content.trim()));
  잰다('withCode 는 코드 있는 것만', r.withCode.length === 1);
  잰다('교재로 본다', r.교재 === true);

  const 해설만 = 판.icClassify([{ content: A, answer: '', solution: '풀이는 이렇다' }]);
  잰다('⚠ 미주에 해설만 있고 정답 글자가 없어도 문항이다', 해설만.문항.length === 1);

  const 목차만 = 판.icClassify([{ content: '| 평면좌표 | 03 |', answer: '' }]);
  잰다('목차만 있는 파일은 교재가 아니다', 목차만.교재 === false);
}

// ── icVerdict — 웹은 코드를 못 심는다 ─────────────────────────────────
절('icVerdict — 🔴 브라우저는 파일을 못 고치므로 코드 없는 것을 안 받는다');
{
  state.itemBody = { 'K2-01-E-0001': { code: 'K2-01-E-0001', content: A } };

  const 그대로 = 판.icVerdict([{ itemCode: 'K2-01-E-0001', content: A }]);
  잰다('② 그대로 — 막지 않는다', 그대로.v.그대로.length === 1 && 그대로.막힘.length === 0);

  const 고쳤다 = 판.icVerdict([{ itemCode: 'K2-01-E-0001', content: A + ' 고침' }]);
  잰다('③ 고쳤다 — 막지 않는다(경보가 아니다)', 고쳤다.v.고쳤다.length === 1 && 고쳤다.막힘.length === 0);
  잰다('옛글을 들고 온다 — 나란히 보여 주려면 있어야 한다', 고쳤다.v.고쳤다[0].옛글 === A);

  const 새문항 = 판.icVerdict([{ itemCode: '', content: B }]);
  잰다('🔴 ⑥ 코드 없는 새 문항 — 막는다', 새문항.막힘.some(m => m.갈래 === '코드 없는 새 문항'));
  잰다('   까닭이 «창고에만 넣으면 내년에 또 새 코드»임을 말로 남긴다',
    /코드를 먼저 심어야/.test(새문항.막힘.find(m => m.갈래 === '코드 없는 새 문항').말));

  const 코드잃음 = 판.icVerdict([{ itemCode: '', content: A }]);
  잰다('🔴 ⑤ 코드를 잃은 것도 막는다 — 파일에 도로 심을 손이 없다',
    코드잃음.막힘.some(m => m.갈래 === '코드 없음'));

  const 복사 = 판.icVerdict([{ itemCode: 'K2-01-E-0001', content: A },
                             { itemCode: 'K2-01-E-0001', content: B }]);
  잰다('🔴 ① 복사됨 — 막는다', 복사.막힘.some(m => m.갈래 === '복사됨'));

  const 모름 = 판.icVerdict([{ itemCode: 'K2-01-E-7777', content: B }]);
  잰다('🔴 ④ 모르는 코드 — 막는다', 모름.막힘.some(m => m.갈래 === '모르는코드'));
}

// ── icNeedsWrite — 중복 업로드를 막는 한 줄 ───────────────────────────
절('icNeedsWrite — 「기존 문제랑 중복해서 올려지지 않고」가 이 함수다');
{
  const 옛 = { content: A, answer: '①' };
  잰다('🔵 그대로면 안 쓴다', 판.icNeedsWrite(옛, { content: A }, '') === false);
  잰다('🔵 줄바꿈·두 칸 차이로는 안 쓴다 — 정규화를 지난다',
    판.icNeedsWrite(옛, { content: '  ' + A.replace(' ', '\n ') + ' ' }, '') === false);
  잰다('본문이 달라지면 쓴다', 판.icNeedsWrite(옛, { content: A + '!' }, '') === true);
  잰다('⚠ 정답이 새로 오면 «본문이 같아도» 쓴다', 판.icNeedsWrite(옛, { content: A }, '②') === true);
  잰다('같은 정답이 또 오면 안 쓴다', 판.icNeedsWrite(옛, { content: A }, '①') === false);
  잰다('⚠ 그림이 이번에 붙으면 «본문이 같아도» 쓴다',
    판.icNeedsWrite(옛, { content: A, image: 'data:…' }, '') === true);
  잰다('이미 그림이 있으면 다시 안 쓴다',
    판.icNeedsWrite({ content: A, image: 'x' }, { content: A, image: 'data:…' }, '') === false);
  잰다('선지 그림 여럿이 이미 있어도 다시 안 쓴다',
    판.icNeedsWrite({ content: A, images: ['x'] }, { content: A, image: 'data:…' }, '') === false);
  잰다('🔴 창고에 없으면 쓴다', 판.icNeedsWrite(null, { content: A }, '') === true);
  잰다('🔴 창고 문서에 본문이 없으면 쓴다', 판.icNeedsWrite({ answer: '①' }, { content: A }, '') === true);
}

// ── icDiffBit — 달라진 자리만 ─────────────────────────────────────────
절('icDiffBit — 「수정된 문제 비교 가능」이 이것이다');
{
  const d = 판.icDiffBit('값은?', '값을 구하시오.');
  잰다('달라진 속만 잘라 낸다', d.옛 === '은?' && d.새 === '을 구하시오.');
  const 긴것 = 판.icDiffBit('가'.repeat(300) + '옛', '가'.repeat(300) + '새');
  잰다('🔵 961자짜리도 한 줄로 — 앞을 잘라 준다', 긴것.앞.length <= 15 && 긴것.옛 === '옛');
  const 같음 = 판.icDiffBit(A, A);
  잰다('같으면 달라진 속이 비어 있다', 같음.옛 === '' && 같음.새 === '');
}

console.log('\n  ' + (실패 ? '🔴' : '✅') + ' ' + 통과 + ' 통과 · ' + 실패 + ' 실패\n');
process.exit(실패 ? 1 : 0);
