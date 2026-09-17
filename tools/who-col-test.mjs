// 반 격자 — 이름 칸의 «폭·정렬»과 과제 칸의 「미제출」 (2026-09-17)
//
//   node tools/who-col-test.mjs
//
// 🔴 **왜 재는가** — 사용자 셋 —
//   ① 「과제탭 출결 탭에 있는 학생표가 이름칸이 좌우로 좀 길어 알맞게 줄여주고」
//      재 보니 가장 긴 이름이 43px 인데 칸이 158px 이라 115px 가 빈 벌판이었다 → 108.
//   ② 「학생이름들 가운데 정렬해주고」 — 열 머리(「이름」)는 처음부터 가운데였고 몸통만 왼쪽이었다.
//   ③ 「과제탭에 숙제 "미제출"도 표기되었으면 좋겠어」 — 마감 전에는 «·» 한 점이었다.
//
// 🔵 **갈림의 자리가 바뀌었다** — 예전에는 마감 전/후가 «글자와 색» 둘 다로 갈렸다.
//   이제 말은 둘 다 「미제출」이고 **색만** 갈린다. C-15 가 걱정한 것은 「표가 매일 붉어진다」 —
//   색이었지 글자가 아니었다. 그 걱정은 그대로 지킨다.
// ⚠ 함수를 베끼지 않는다 — index.html 에서 그대로 뜬다.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/\r\n/g, '\n');
const NL = String.fromCharCode(10);

function lift(name) {
  let at = html.indexOf('function ' + name + '(');
  if (at < 0) throw new Error(name + ' 를 못 찾았습니다');
  if (html.slice(at - 6, at) === 'async ') at -= 6;
  let depth = 0;
  for (let j = html.indexOf('{', at); j < html.length; j++) {
    if (html[j] === '{') depth++;
    else if (html[j] === '}') { depth--; if (!depth) return html.slice(at, j + 1); }
  }
  throw new Error(name + ' 의 끝을 못 찾았습니다');
}
/* 블록 주석을 지우고 본다 — 주석을 읽고 통과하는 검사는 빨간 줄보다 나쁘다 (09-17 · hw-session). */
const 살 = s => s.replace(/\/\*[\s\S]*?\*\//g, '');

let pass = 0, fail = 0;
const 봄 = (무엇, 나온것, 나와야) => {
  const ok = JSON.stringify(나온것) === JSON.stringify(나와야);
  if (ok) pass++; else fail++;
  console.log((ok ? '  ✓ ' : '  🔴 ') + 무엇 + (ok ? '' : NL + '      나온 것 ' + JSON.stringify(나온것) + NL + '      나와야 ' + JSON.stringify(나와야)));
};

/* ── 그 고르개에 «닿는» 규칙을 전부 모아 온다 ─────────────────────
   🔴 처음에는 `indexOf(고르개 + '{')` 하나였는데, `.hwg td.who` 를 찾으면
     **합쳐진 규칙**(`.hwg th.who, .hwg td.who{…}`)이 «먼저» 잡혀 엉뚱한 몸을 읽었다.
     CSS 는 여러 규칙이 겹쳐 쌓이므로 검사도 그렇게 봐야 한다 — 닿는 것을 다 모아 잇는다.
   ⚠ 고르개는 «토막»이 아니라 쉼표로 가른 한 조각과 정확히 같아야 한다
     (`.hwg td.who` 가 `.hwg td.who-x` 에 걸리면 안 된다). */
/* 🔴 **CSS 만 떼어 놓고 본다** — 처음에는 `index.html` 을 통째로 훑었는데, 이 파일은 거의 전부가
   **JS** 라 중괄호가 사방에 있다. 「`}` 다음이 고르개」라는 짐작이 그 안에서 통째로 어긋나서
   멀쩡한 규칙을 «없다»고 읽었다. `<style>` 안만 보고, 주석도 먼저 걷는다. */
const CSS = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)]
  .map(m => m[1]).join('\n').replace(/\/\*[\s\S]*?\*\//g, '');

/* ⚠ **`@media` 안에 또 규칙이 있다** — 「`}` 다음이 고르개」로 짚으면 중첩에서 한 칸씩 어긋나
   멀쩡한 규칙을 «없다»고 읽는다(여기서 두 번째로 헛디뎠다). 그래서 «여는 `{` 마다»
   그 앞을 바로 앞 괄호까지 되짚어 고르개로 삼는다 — 중첩이든 아니든 같은 셈이 선다. */
function 규칙(고르개) {
  let 몸 = null;
  for (let i = 0; i < CSS.length; i++) {
    if (CSS[i] !== '{') continue;
    let j = i - 1;
    while (j >= 0 && CSS[j] !== '{' && CSS[j] !== '}') j--;
    const 앞 = CSS.slice(j + 1, i);
    const 조각들 = 앞.split(',').map(s => s.trim().replace(/\s+/g, ' '));
    if (!조각들.includes(고르개)) continue;
    let k = i + 1, 깊이 = 1;
    while (k < CSS.length && 깊이) { if (CSS[k] === '{') 깊이++; else if (CSS[k] === '}') 깊이--; k++; }
    몸 = (몸 === null ? '' : 몸 + ';') + CSS.slice(i + 1, k - 1);
  }
  return 몸;
}

console.log(NL + '① 이름 칸 — 폭과 정렬' + NL);
{
  const 머리 = 규칙('.hwg th.who'), 몸통 = 규칙('.hwg td.who');
  봄('머리와 몸통 둘 다 규칙이 있다', [머리 !== null, 몸통 !== null], [true, true]);
  const 폭 = s => +((s.match(/width:(\d+)px/) || [])[1]);
  /* ⚠ 숫자를 못 박는다 — 「알맞게」는 «눈»이 정한 값이라 코드가 혼자 바꾸면 안 된다.
     ⚠ 108 의 안쪽은 96px(좌우 6px 씩) — 「남궁하루 + 퇴원」이 81px 이라 든다(브라우저 실측). */
  봄('🔴 폭은 108px 다 (158 에서 줄였다)', 폭(몸통), 108);
  봄('🔴 머리와 몸통이 «같은 폭»이다 — 어긋나면 표가 기운다', 폭(머리), 폭(몸통));
  봄('왼쪽에 못 박혀 있다 — 열을 밀어도 누구 줄인지 안 잃는다',
    [/position:sticky/.test(머리), /position:sticky/.test(몸통)], [true, true]);

  봄('🔴 이름은 가운데다', /text-align:center/.test(몸통), true);
  봄('   왼쪽 정렬이 남아 있지 않다', /text-align:left/.test(몸통), false);
  봄('한 줄로 못 박는다 (두 자리 번호에서 줄바꿈되던 것)', /white-space:nowrap/.test(몸통), true);
  /* 열 머리는 처음부터 가운데였다 — 몸통이 거기에 맞춰 온 것이지 그 반대가 아니다.
     ⚠ `.hwg thead th` 에 따로 `text-align` 을 적어 두면 안 된다(표 기본이 가운데다). */
  봄('열 머리는 안 건드렸다', /text-align/.test(머리), false);
}

console.log(NL + '② 세 격자가 정말 그 줄을 쓰는가' + NL);
{
  /* 🔴 폭을 줄인 줄이 «과제·출결·성적» 셋에 닿는지 — 하나라도 딴 class 로 갈아타면
     사용자가 말한 두 탭 가운데 하나가 안 줄어든다. */
  const 표 = (fn) => (살(lift(fn)).match(/<table class="([^"]+)"/) || [])[1];
  봄('과제 격자는 .hwg hg', 표('hwGridHTML'), 'hwg hg');
  봄('출결 격자는 .hwg ag', 표('chubAttendanceHTML'), 'hwg ag');
  봄('성적 격자는 .hwg sg', 표('chubScoresHTML'), 'hwg sg');
  for (const fn of ['hwGridHTML', 'chubAttendanceHTML', 'chubScoresHTML'])
    봄('   ' + fn + ' 의 이름 칸은 td.who 다', /<td class="who"/.test(살(lift(fn))), true);
}

console.log(NL + '③ 과제 칸 — 「미제출」이 글자로 선다' + NL);
{
  const HW = { HW_NONE: 'none', HW_SUBMITTED: 'submitted', HW_APPROVED: 'approved',
               HW_PARTIAL: 'partial', HW_REJECTED: 'rejected' };
  const CELL = new Function(...Object.keys(HW),
    html.slice(html.indexOf('const HWG_CELL = {'), html.indexOf('};', html.indexOf('const HWG_CELL = {')) + 2)
    + NL + 'return HWG_CELL;')(...Object.values(HW));
  봄('🔴 미제출 칸에 적히는 말이 «미제출» 이다 (예전에는 «·»)', CELL[HW.HW_NONE][2], '미제출');
  봄('   마우스에 뜨는 말도 그대로', CELL[HW.HW_NONE][1], '미제출');
  봄('   나머지 넷은 안 건드렸다',
    [CELL[HW.HW_APPROVED][2], CELL[HW.HW_PARTIAL][2], CELL[HW.HW_SUBMITTED][2], CELL[HW.HW_REJECTED][2]],
    ['완료', '보완 필요', '확인 대기', '반려']);

  /* 🔴 **색은 여전히 갈린다** — 마감 전 `none`(흐림) · 마감 지남 `over`(붉음).
     소스를 읽는 것이 아니라 «그려서» 본다 — 09-13 에 밟은 함정이다(글자만 보면 if(false) 도 통과한다). */
  const G = new Function('state', 'hwState', 'hwIsDone', 'HWG_CELL', 'HW_NONE', 'HW_SUBMITTED',
    'todayStr', 'escHtml', 'chubYm', 'WEEKDAY_LABEL',
    lift('hwOrderKey') + NL + lift('hwOrderDesc') + NL + lift('hwOrderAsc') + NL
      + lift('hwGridHTML') + NL + 'return hwGridHTML;')(
    { allRecordsLoaded: true, hwCell: null, hwNoticeId: null, allRecords: { s1: { assignmentsDone: {} } } },
    () => ({ status: HW.HW_NONE, photos: [] }), () => false, CELL, HW.HW_NONE, HW.HW_SUBMITTED,
    () => '2026-09-17',
    s => (s === null || s === undefined) ? '' : String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'),
    () => '2026-09', ['일', '월', '화', '수', '목', '금', '토']);

  const 그리기 = (dueDate) => G('c1',
    [{ id: 'h1', classId: 'c1', title: '과제', createdAt: '2026-09-10', dueDate }],
    [{ studentId: 's1', name: '남궁하루' }]);

  const 아직 = 그리기('2026-09-19');   // 마감 전
  const 지남 = 그리기('2026-09-14');   // 마감 지남
  const 없음 = 그리기('');             // 마감이 아예 없다

  봄('🔴 마감 전에도 「미제출」이라고 적힌다', />미제출</.test(아직), true);
  봄('🔴 그래도 «조용하다» — hg-m none (흐린 회색)', /class="hg-m none[ "]/.test(아직), true);
  봄('🔴 마감이 지나면 붉어진다 — hg-m over', /class="hg-m over[ "]/.test(지남), true);
  봄('   지난 것의 마우스 말은 «미제출 · 마감 지남»', /미제출 · 마감 지남/.test(지남), true);
  봄('   마감이 없으면 «지났다»가 성립 안 한다 — 영영 조용하다',
    [/class="hg-m none[ "]/.test(없음), /hg-m over/.test(없음)], [true, false]);
  봄('🔴 이름 칸은 여전히 하나 (td.who)', (그리기('').match(/<td class="who"/g) || []).length, 1);
}

console.log(NL + '🪤 덫 — 옛 판으로 돌려 본다' + NL);
let 덫물림 = 0;
{
  /* ① 「·」로 되돌린 판 — ③의 첫 줄이 물어야 한다 */
  const 옛칸 = { none: ['none', '미제출', '·'] };
  if (옛칸.none[2] !== '미제출') { 덫물림++; console.log('  ✓ «·» 로 되돌리면 ③이 물린다'); }
  else console.log('  🔴 안 물었다');

  /* ② 폭을 158 로 되돌린 판 · 왼쪽 정렬로 되돌린 판 */
  const 뼈대옛 = 'position:sticky;left:0;z-index:1;width:158px;';
  const 몸통옛 = 'text-align:left;white-space:nowrap;';
  const w = (뼈대옛.match(/width:(\d+)px/) || [])[1];
  if (+w !== 108) { 덫물림++; console.log('  ✓ 158 로 되돌리면 ①이 물린다'); }
  else console.log('  🔴 안 물었다');
  if (!/text-align:center/.test(몸통옛)) { 덫물림++; console.log('  ✓ 왼쪽 정렬로 되돌리면 ①이 물린다'); }
  else console.log('  🔴 안 물었다');
}

console.log(NL + (fail === 0 ? '✓ 전부 통과' : '🔴 걸린 것 ' + fail + '개') + ' · ' + (pass + fail) + '개');
console.log('🪤 덫 ' + 덫물림 + '/3 물었다');
process.exit(fail === 0 && 덫물림 === 3 ? 0 : 1);
