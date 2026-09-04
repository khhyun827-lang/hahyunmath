// 형(TYPE)이 나뉜 시험지 — 번호가 겹치는 시험을 다루는 규칙 (2026-09-04)
//
//   node tools/exam-type-test.mjs
//
// 사용자가 준 실제 파일([동그랑땡][1-2][중간]1회(하).hwpx)의 구조다. 실측:
//   TYPE 0  1~14 · 단답형1 · 서술형1 · 서술형2      17문항
//   TYPE A  15 16 17 · 단답형2 · 서술형3            5문항
//   TYPE B  15 16 17 · 단답형2 · 서술형3            5문항        합계 27 = 미주 27
//
// 🔴 **번호가 겹친다.** A형 15번과 B형 15번은 다른 문제다. 번호만 열쇠로 쓰면
//    둘이 조용히 한 칸을 다투고, 학생이 15번을 짚었을 때 **남의 문제가 나간다.**
// 🔴 **본문에는 형 구분이 없다**(실측). 형을 아는 유일한 길은 파일 끝의 빠른정답표다.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadHwpxRules } from './hwpx-node.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const { hwpxExamKeyFromText, hwpxLooksExamKey } = loadHwpxRules();

function lift(name) {
  const at = html.indexOf('function ' + name + '(');
  if (at < 0) throw new Error(name + ' 를 못 찾았습니다');
  let depth = 0;
  for (let j = html.indexOf('{', at); j < html.length; j++) {
    if (html[j] === '{') depth++;
    else if (html[j] === '}') { depth--; if (!depth) return html.slice(at, j + 1); }
  }
  throw new Error(name + ' 의 끝을 못 찾았습니다');
}

const NLL = String.fromCharCode(10);
let pass = 0, fail = 0;
const 봄 = (무엇, 나온것, 나와야할것) => {
  const ok = JSON.stringify(나온것) === JSON.stringify(나와야할것);
  if (ok) { pass++; console.log('  ✓ ' + 무엇); }
  else { fail++; console.log(`  ✗ ${무엇}\n      나온 것: ${JSON.stringify(나온것)}\n      나와야:  ${JSON.stringify(나와야할것)}`); }
};

const NL = String.fromCharCode(10);
/* ⚠ 답은 일부러 «수식 없이» 적는다 — 이 검사가 보는 것은 «형과 번호»이지 수식이 아니다.
   역슬래시를 넣었더니 시험 자료 안에서 제어문자로 둔갑해 검사 자체가 망가졌다(2026-09-04). */
const 표글 = [
  '[동그랑땡1회(하) 빠른정답]', 'TYPE 0',
  '1 ② 2 ② 3 ② 4 ⑤ 5 ②', '6 ③ 7 ⑤ 8 ① 9 ③ 10 ④', '11 ⑤ 12 ② 13 ③ 14 ②',
  '단답형1 $4x+3y+4=0$ 또는 $4x+3y-16=0$', '서술형1 $12pi$',
  '서술형2 (1) $y=-x/3+5$ (2) $sqrt10/10$',
  'TYPE A', '15 ④ 16 ② 17 ③', '단답형2 $(5/2, 9/2)$', '서술형3 $-1<a<0$',
  'TYPE B', '15 ⑤ 16 ⑤ 17 ①', '단답형2 $34$', '서술형3 $N=(6,7,11,12,14)$',
].join(NL);

console.log('\n형이 나뉜 시험지 — 빠른정답표가 «번호와 형»을 준다\n');

봄('시험지꼴로 알아본다', hwpxLooksExamKey(표글), true);
봄('교재꼴 표는 시험지꼴이 아니다', hwpxLooksExamKey('001 ② 002 ③'), false);
const key = hwpxExamKeyFromText(표글);
봄('문항 수', key.length, 27);
봄('TYPE 0 은 17개', key.filter(x => x.type === '0').length, 17);
봄('TYPE A 는 5개', key.filter(x => x.type === 'A').length, 5);
봄('TYPE B 는 5개', key.filter(x => x.type === 'B').length, 5);
봄('차례가 종이와 같다 (앞 셋)', key.slice(0, 3).map(x => x.type + '-' + x.label), ['0-1', '0-2', '0-3']);
봄('단답형·서술형도 문항이다', key.filter(x => /형/.test(x.label)).map(x => x.type + '-' + x.label),
   ['0-단답형1', '0-서술형1', '0-서술형2', 'A-단답형2', 'A-서술형3', 'B-단답형2', 'B-서술형3']);
봄('🔴 A형 15번과 B형 15번은 «다른 열쇠»다',
   [key.find(x => x.type==='A' && x.label==='15').answer, key.find(x => x.type==='B' && x.label==='15').answer],
   ['④', '⑤']);
봄('서술형의 여러 답도 통째로 가져온다',
   /\(1\)[\s\S]*\(2\)/.test(key.find(x => x.label === '서술형2').answer), true);

// ── 화면이 «형까지» 말하는가 ──────────────────────────────────────────
console.log('\n화면이 어떻게 부르는가\n');
const { qLabelOf } = new Function(lift('qLabelOf') + '\nreturn { qLabelOf };')();
봄('형이 나뉘면 형까지 말한다', qLabelOf({ qtype: 'B', qlabel: '15' }), 'TYPE B 15번');
봄('공통은 번호만', qLabelOf({ qtype: '0', qlabel: '3' }), '3번');
봄('🔵 옛 기록(형이 없다)도 그대로 읽힌다', qLabelOf({ questionNo: 7 }), '7번');
봄('단답형도 그대로', qLabelOf({ qtype: 'A', qlabel: '단답형2' }), 'TYPE A 단답형2번');

// ── 열쇠로 찾는가 (옛것 호환) ────────────────────────────────────────
console.log('\n문항 찾기 — 새 열쇠와 옛 번호가 같이 산다\n');
const { findBankEntry } = new Function('DATA', 'examRootId',
  lift('findBankEntry') + '\nreturn { findBankEntry };')(
  { problemBank: [
    { examId: 'e1', qkey: 'A-15', qlabel: '15', qtype: 'A', id: 'A15' },
    { examId: 'e1', qkey: 'B-15', qlabel: '15', qtype: 'B', id: 'B15' },
    { examId: 'e1', questionNo: 3, id: '옛3' },          // 옛 항목 — qkey 가 없다
  ] }, (x) => x);
봄('🔴 A-15 와 B-15 를 갈라 찾는다',
   [findBankEntry('e1', 'A-15').id, findBankEntry('e1', 'B-15').id], ['A15', 'B15']);
봄('🔵 옛 항목은 번호로도 찾힌다', findBankEntry('e1', '3').id, '옛3');
봄('🔵 옛 항목은 0-번호 로도 찾힌다', findBankEntry('e1', '0-3').id, '옛3');


// ⑭ 시험지 문항에 코드를 붙인다 (2026-09-05 · 사용자가 (다)안을 골랐다)
{
  const { codeOfSubjectName, nextBookSerial, makeItemCodeFor } = new Function(
    'CODE_SUBJECTS', 'chapterNoOfName', 'state',
    lift('codeOfSubjectName') + NLL + lift('nextBookSerial') + NLL + lift('makeItemCodeFor')
      + NLL + 'return { codeOfSubjectName, nextBookSerial, makeItemCodeFor };'
  )({ K2: '공통수학2', K1: '공통수학1' },
    (subject, name) => ({ '평면좌표': '01', '직선의 방정식': '02', '집합': '05' }[name] || ''),
    { itemByCode: { 'K2-01-E-0564': {}, 'K2-01-D-0007': {} }, itemBody: { 'K2-05-D-0012': {} } });

  봄('과목 이름 → 코드', codeOfSubjectName('공통수학2'), 'K2');
  봄('모르는 과목은 K2 로 (지금 다루는 것이 그것뿐)', codeOfSubjectName('없는과목'), 'K2');
  // 🔵 일련번호는 «교재» 안에서 쭉 간다 — 단원이 바뀌어도 이어진다
  봄('🔵 장부와 창고를 «둘 다» 보고 다음 번호를 낸다', nextBookSerial('D'), 13);
  봄('다른 교재의 번호에 안 휩쓸린다', nextBookSerial('E'), 565);
  봄('처음이면 1 번부터', nextBookSerial('R'), 1);

  봄('코드를 만든다', makeItemCodeFor({ unit: '공통수학2', chapter: '집합' }, 'D', 13), 'K2-05-D-0013');
  봄('단원이 바뀌어도 번호는 그대로', makeItemCodeFor({ unit: '공통수학2', chapter: '평면좌표' }, 'D', 14), 'K2-01-D-0014');
  // 🔴 여기가 요점 — 짐작한 코드는 나중에 남의 단원 자리에 끼어 앉는다
  봄('🔴 단원을 못 고르면 코드를 «안» 만든다', makeItemCodeFor({ unit: '공통수학2', chapter: '' }, 'D', 15), '');
  봄('🔴 모르는 단원도 마찬가지', makeItemCodeFor({ unit: '공통수학2', chapter: '없는단원' }, 'D', 15), '');
}

// ⑮ 코드가 사는 곳이 둘이다 — 장부(codes/*.json)와 창고(items) (2026-09-05)
{
  const { itemOfCode } = new Function('state', 'chapterInfoFromItemCode', 'ITEM_CODE_RE', 'BOOK_OF_CODE',
    lift('itemOfCode') + NLL + 'return { itemOfCode };')(
    { itemByCode: { 'K2-01-E-0005': { code: 'K2-01-E-0005', chapter: '평면좌표', source: { book: '엔딩크레딧' } } },
      itemBody:   { 'K2-05-D-0013': { code: 'K2-05-D-0013', content: '본문', answer: '③' } } },
    (c) => (String(c).indexOf('-05-') > 0 ? { subject: '공통수학2', chapter: '집합' } : null),
    /^([A-Z]{1,2}\d?)-(\d{2})-([A-Z])-(\d{4})/, { E: '엔딩크레딧', D: '동그랑땡 모의고사' });

  봄('장부에 있는 것은 그대로', itemOfCode('K2-01-E-0005').chapter, '평면좌표');
  // 🔴 여기가 사용자가 짚은 자리 — 시험지에서 태어난 코드를 «없는 코드»라 하고 있었다
  봄('🔴 창고에만 있는 것도 찾는다', !!itemOfCode('K2-05-D-0013'), true);
  봄('코드가 단원을 말해 준다', itemOfCode('K2-05-D-0013').chapter, '집합');
  봄('교재 이름도 코드에서 온다', itemOfCode('K2-05-D-0013').source.book, '동그랑땡 모의고사');
  봄('정답은 창고 것을 쓴다', itemOfCode('K2-05-D-0013').answer, '③');
  봄('🔵 «시험지에서 태어난 것»이라고 표시해 둔다', itemOfCode('K2-05-D-0013').fromExam, true);
  봄('둘 다 없으면 없는 것', itemOfCode('K2-09-Z-0001'), null);
}


console.log(`\n  ${fail ? '🔴' : '✅'} ${pass} 통과 · ${fail} 실패\n`);
process.exit(fail ? 1 : 0);
