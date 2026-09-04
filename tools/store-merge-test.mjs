// 문항 창고 = 문항 코드 (화면 둘을 하나로 합친 뒤) (2026-09-04)
//
//   node tools/store-merge-test.mjs
//
// 사용자 제안 — 「문항 창고와 문항코드가 분리되어있어야 할 이유가 없어진 것 같다 …
// 코드화면 버튼을 누르면 … 드로우처럼 떠서 확인 … 다음코드도 뭘사용해야하는지 뜨게」.
//
// 🔴 **합치면서 잃기 쉬운 것이 둘이다.** 이 검사가 그 둘을 붙든다:
//    ① «창고 전체»에 대한 문 셋(교재 본문 채우기 · 정답 채우기 · 남는 한도로 채우기).
//       그건 문항 하나의 일이 아니라서 드로어에 넣으면 안 되고, 묻히면 교재를 올릴 길이 사라진다.
//    ② «다음 번호» — 코드를 새로 붙일 때 쓰는 값이라, 이것이 없으면 합친 뜻이 없다.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const lines = html.split(/\r?\n/);

let pass = 0, fail = 0;
const 봄 = (무엇, ok, 곁) => {
  if (ok) { pass++; console.log('  ✓ ' + 무엇); }
  else { fail++; console.log('  ✗ ' + 무엇 + (곁 ? '\n      ' + 곁 : '')); }
};
const 있나 = (s) => html.includes(s);

console.log('\n문항 창고 = 문항 코드\n');

// ① 옛 화면은 사라졌는가
봄('«문항 코드» 탭이 없다', !있나("['문항 코드', 'itemcode']"));
봄('옛 화면 함수가 안 남아 있다', !있나('function teacherItemCodeHTML('));
봄('라우터에 itemcode 가 없다', !있나("if(t==='itemcode')"));
봄('다른 화면의 안내 링크도 창고를 가리킨다', !있나('href="#teacher/itemcode"'));

// ② 드로어가 제 자리에 붙었는가
봄('드로어 함수가 있다', 있나('function icDrawerHTML()'));
봄('오른쪽 드로어 껍데기를 쓴다 (다른 드로어와 같은 규칙)',
   있나('<aside class="hwd ic-hwd">') && 있나('class="hwd-back" onclick="icCloseDrawer()"'));
봄('🔴 화면을 함께 본다 — 탭을 옮기면 안 따라다닌다',
   있나("state.icOpen && state.view==='teacher' && state.teacherTab==='unitbank'"));
봄('창고 카드의 「코드 화면」이 드로어를 연다', 있나('onclick="icOpenDrawer('));

// ③ 🔴 잃으면 안 되는 것 ① — 창고 전체에 대한 문 셋
봄('🔴 「교재에서 본문 채우기」가 살아 있다', 있나('교재에서 본문 채우기'));
봄('🔴 「정답 채우기」가 살아 있다', 있나('answer-key.json 올리기'));
봄('🔴 「남는 한도로 채우기」가 살아 있다', 있나('남는 한도로 채우기'));
{
  /* 그 셋은 드로어가 아니라 «창고 화면»에 있어야 한다 */
  const i = lines.findIndex(l => l.includes('function teacherItemStoreHTML()'));
  const j = lines.findIndex((l, k) => k > i && l.includes('function icDetailHTML('));
  const 창고 = lines.slice(i, j > i ? j : lines.length).join('\n');
  봄('🔴 셋은 «창고 화면»에서 불린다 (드로어가 아니다)', 창고.includes('icToolsHTML()'));
  봄('코드 검색줄도 창고에 있다', 창고.includes('id="ist-q"'));
}

// ④ 🔴 잃으면 안 되는 것 ② — 다음 번호
{
  const i = html.indexOf('function icDetailHTML(');
  const 속 = html.slice(i, i + 4000);
  봄('🔴 드로어가 «다음 번호»를 보여 준다', 속.includes('nextVariantCode(root, k)'));
  봄('갈래마다 하나씩 (N·U·D)', 속.includes('VARIANT_KINDS.map'));
  봄('복사 단추가 있다', 속.includes('icCopy('));
  봄('변형 목록도 그대로', 속.includes('deleteVariantFromStore('));
  봄('검토 대기는 «있는 것»과 갈라 센다', 속.includes('variantIsPending'));
}

console.log('\n  ' + (fail ? '🔴' : '✅') + ' ' + pass + ' 통과 · ' + fail + ' 실패\n');
process.exit(fail ? 1 : 0);
