// 코드를 «세 자리»에 숨겨도 읽히고, 엇갈리면 막히는가 (2026-10-04 · 사용자가 정했다)
//
//   node tools/code-triple-test.mjs
//
// 세 자리 — ① 딱지 그림 설명문 ② 본문 첫 수식 설명문 ③ 미주 숨은 설명 (docs/코드-숨기기.md 0-J)
// 재는 것:
//   · 셋 중 어느 것이 빠져도(딴 교재로 옮기면 그림이 빠진다) 남은 것으로 읽힌다
//   · 🔴 셋이 엇갈리면 코드를 고르지 않고 판정이 «코드 엇갈림»으로 막는다
//   · 미주에 보이게 적은 코드는 여전히 이긴다
//   · 숨은 설명·수식 설명문 글이 본문·정답·해설에 안 새어 든다
//
// 진짜 교재(`교재 코드파일/숨김2/코드/` 01)를 임시 폴더에서 일부러 망가뜨려 잰다. 원본은 안 건드린다.

import fs from 'fs';
import os from 'os';
import path from 'path';
import { loadHwpxRules, problemsFromHwpx } from './hwpx-node.mjs';
import { 교재폴더, 훑는다 } from './item-code-hide.mjs';
import { 교재읽기 } from './store-diff.mjs';
import { 푼다, 섹션들, 묶는다 } from './hwpx-zip.mjs';

let 통과 = 0, 실패 = 0;
const 잰다 = (이름, 참) => { 참 ? (통과++, console.log('  ✓ ' + 이름)) : (실패++, console.log('  ✗ ' + 이름)); };
const rules = loadHwpxRules();

const 폴더 = path.join(교재폴더, '숨김2', '코드');
const 원본 = fs.existsSync(폴더) && fs.readdirSync(폴더).filter((x) => /1\.평면좌표\.hwpx$/.test(x)).map((x) => path.join(폴더, x))[0];
const 맨것 = path.join(교재폴더, '숨김2', 'hwpx', '[2026][엔딩크레딧][1-2중간]1.평면좌표.hwpx');
if (!원본) { console.log('\n  ⓘ 세 자리에 심은 01단원 파일이 없어 건너뜁니다.\n'); process.exit(0); }

const 뜰 = fs.mkdtempSync(path.join(os.tmpdir(), 'triple-test-'));
process.on('exit', () => fs.rmSync(뜰, { recursive: true, force: true }));
let 번 = 0;
/* 섹션 XML 을 고쳐 새 hwpx 로 낸다 */
function 고쳐낸다(고침) {
  const { tmp, cdir } = 푼다(원본);
  for (const s of 섹션들(cdir)) fs.writeFileSync(s, 고침(fs.readFileSync(s, 'utf8')));
  const out = path.join(뜰, (번++) + '.hwpx');
  묶는다(tmp, out);
  return out;
}
const 코드꼴 = /\s?\[K2-01-E-\d{4}\]/;
const 읽는다 = (f) => 교재읽기([f], rules).문항;
const 기대 = Array.from({ length: 76 }, (_, i) => 'K2-01-E-' + String(i + 1).padStart(4, '0')).join();
const 창고 = Object.fromEntries(읽는다(원본).map((p) => [p.code, { content: p.content }]));

console.log('\n세 자리 그대로');
{
  const z = 훑는다(원본);
  잰다('그림 76 · 첫 수식 76 · 숨은 설명 76 · 보이는 미주 0',
    z.자리별.그림.length === 76 && z.자리별.수식.length === 76 && z.자리별.숨은설명.length === 76 && z.미주 === 0);
  잰다('76제 코드가 차례대로 읽힌다', 읽는다(원본).map((p) => p.code).join() === 기대);
}

console.log('\n자리가 빠져도 남은 것으로 읽힌다');
{
  /* 그림 설명문의 코드만 지운다 — 딴 교재로 옮겨 딱지 그림이 빠진 꼴 */
  const 그림없음 = 고쳐낸다((x) => x.replace(/(<hp:shapeComment>[^<]*자산 12@4x\.png[^<]*?)\s?\[K2-01-E-\d{4}\](<\/hp:shapeComment>)/g, '$1$2'));
  잰다('그림 코드 0 이 되었다(덫이 실제로 물렸다)', 훑는다(그림없음).자리별.그림.length === 0);
  잰다('🔵 그림 없이도 76제가 다 읽힌다', 읽는다(그림없음).map((p) => p.code).join() === 기대);

  /* 그림과 수식을 다 지운다 — 숨은 설명 하나만 남는다 */
  const 숨은만 = 고쳐낸다((x) => x.replace(/(<hp:shapeComment>[^<]*?)\s?\[K2-01-E-\d{4}\](<\/hp:shapeComment>)/g, '$1$2'));
  잰다('🔵 숨은 설명 하나만으로도 다 읽힌다', 읽는다(숨은만).map((p) => p.code).join() === 기대);

  /* 숨은 설명만 지운다 — 수식·그림으로 읽힌다 */
  const 숨은없음 = 고쳐낸다((x) => x.replace(/<hp:ctrl><hp:hiddenComment>[\s\S]*?<\/hp:hiddenComment><\/hp:ctrl>/g, ''));
  잰다('숨은 설명 없이도 다 읽힌다', 읽는다(숨은없음).map((p) => p.code).join() === 기대);
}

console.log('\n🔴 엇갈리면 막는다');
{
  /* 다섯째 문항의 첫 수식 설명문만 다른 코드로 — 틀을 복사해 쓴 꼴 */
  let n = 0;
  /* ⚠ 수식 설명문만 집는다 — 「<hp:equation … 0005」로 느슨히 걸면 앞에 있는 딱지 그림 설명문을 먼저 문다 */
  const 엇 = 고쳐낸다((x) => x.replace(/(<hp:shapeComment>수식입니다\.[^<]*?)\[K2-01-E-0005\]/, (m, a) => (n++, a + '[K2-01-E-0050]')));
  잰다('덫이 물렸다(수식 하나를 바꿨다)', n === 1);
  const 문항 = 읽는다(엇);
  const 그것 = 문항[4];
  잰다('🔴 엇갈린 문항은 코드를 고르지 않는다', 그것.code === '');
  잰다('어느 자리에 무엇이 있었는지 남긴다',
    !!그것.codeConflict && 그것.codeConflict.그림 === 'K2-01-E-0005' && 그것.codeConflict.수식 === 'K2-01-E-0050' && 그것.codeConflict.숨은설명 === 'K2-01-E-0005');
  잰다('나머지 75제는 그대로 읽힌다', 문항.filter((p) => p.code).length === 75);
  const v = rules.hwpItemVerdicts(문항, 창고);
  const 막 = rules.hwpVerdictBlockers(v, { 심을수있나: true });
  잰다('🔴 판정이 «코드 엇갈림»으로 막는다', v.엇갈림.length === 1 && 막.some((m) => m.갈래 === '코드 엇갈림'));
  /* 웹은 {code, content, p:문제} 로 싸서 부른다 — 그 꼴에서도 막혀야 한다 */
  const 웹v = rules.hwpItemVerdicts(문항.map((p) => ({ code: p.code, content: p.content, p })), 창고);
  잰다('🔴 웹 꼴로 불러도 막는다', 웹v.엇갈림.length === 1);
  잰다('엇갈림이 없으면 막지 않는다', rules.hwpVerdictBlockers(rules.hwpItemVerdicts(읽는다(원본), 창고)).length === 0);

  /* 같은 파일의 미주에 사람이 보이게 적으면 그것이 이긴다 */
  let k = 0;
  const 사람 = 고쳐낸다((x) => x
    .replace(/(<hp:shapeComment>수식입니다\.[^<]*?)\[K2-01-E-0005\]/, '$1[K2-01-E-0050]')
    .replace(/<hp:t> \[정답\]/g, (m) => (++k === 5 ? '<hp:t>[K2-01-E-0005] [정답]' : m)));
  const 사람문항 = 읽는다(사람);
  잰다('🔵 미주에 적은 코드가 이긴다 — 엇갈림도 안 따진다', 사람문항[4].code === 'K2-01-E-0005' && !사람문항[4].codeConflict);
}

console.log('\n숨긴 글이 새어 들지 않는다');
{
  const 앞 = problemsFromHwpx(맨것, rules).problems, 뒤 = problemsFromHwpx(원본, rules).problems;
  const 같다 = (칸) => 앞.length === 뒤.length && 앞.every((p, i) => (p[칸] || '') === (뒤[i][칸] || ''));
  잰다('본문이 코드 없는 판과 똑같다', 같다('content'));
  잰다('정답이 코드 없는 판과 똑같다(0035 는 사용자가 고쳐서 하나 다르다)',
    앞.filter((p, i) => (p.answer || '') !== (뒤[i].answer || '')).length <= 1);
  잰다('해설이 코드 없는 판과 똑같다', 같다('solution'));
  잰다('어디에도 「[K2-」가 글로 안 섞였다', 뒤.every((p) => !코드꼴.test((p.content || '') + (p.answer || '') + (p.solution || ''))));
}

console.log('\n  ' + (실패 ? '🔴' : '✅') + ' ' + 통과 + ' 통과 · ' + 실패 + ' 실패\n');
process.exit(실패 ? 1 : 0);
