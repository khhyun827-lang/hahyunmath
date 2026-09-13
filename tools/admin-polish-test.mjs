// 관리자 다듬기 — 명단의 계층 · 빈 화면의 말 (2026-09-14 · S-10)
//
//   node tools/admin-polish-test.mjs
//
// 사용자가 「관리자도 자두로 갈까」를 물었고, 색이 아니라 **밀도와 계층**이 문제일 것이라
// 답했다. 그 셋 중 둘을 명단 한 화면에 먼저 넣었다:
//   ① 표의 계층 — 이름은 닻으로, 보조 정보는 물러나게, 숫자는 훑게 (**색은 안 건드린다**)
//   ② 빈 화면의 말 — 「없습니다」로 끝내지 않고 다음 할 일까지
// (③ 브랜드 순간은 S-7 의 상단바 로고가 이미 한다.)
//
// ⚠ 함수·CSS 를 여기에 옮겨 적지 않는다 — index.html 에서 그대로 뜬다.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/\r\n/g, '\n');
const ds = fs.readFileSync(path.join(ROOT, 'ds.css'), 'utf8').replace(/\r\n/g, '\n');
const NL = String.fromCharCode(10);

function lift(name) {
  let at = html.indexOf('function ' + name + '(');
  if (at < 0) throw new Error(name + ' 를 못 찾았습니다');
  if (html.slice(at - 6, at) === 'async ') at -= 6;
  let d = 0;
  for (let j = html.indexOf('{', at); j < html.length; j++) {
    if (html[j] === '{') d++;
    else if (html[j] === '}') { d--; if (!d) return html.slice(at, j + 1); }
  }
  throw new Error(name + ' 의 끝을 못 찾았습니다');
}
/* 선택자와 `{` 사이의 빈칸을 견딘다 */
function rule(sel) {
  const m = html.match(new RegExp(sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\{[^}]*\\}'));
  return m ? m[0] : '';
}
const 알맹이 = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

let pass = 0, fail = 0;
const 봄 = (무엇, 나온것, 나와야) => {
  const ok = JSON.stringify(나온것) === JSON.stringify(나와야);
  if (ok) pass++; else fail++;
  console.log((ok ? '  ✓ ' : '  🔴 ') + 무엇 +
    (ok ? '' : NL + '      나온 것 ' + JSON.stringify(나온것) + NL + '      나와야 ' + JSON.stringify(나와야)));
};

/* ═══ ① 색은 한 톨도 안 바꾼다 ═══ */
console.log(NL + '① 🔴 색은 한 톨도 안 바꿨다 (표의 색은 «뜻»을 나른다)' + NL);
{
  /* 🔴 **이 판의 전부다.** 명단의 색은 출석 초록·결석 빨강·신호 배지 — 전부 뜻이 있다.
     꾸밈색을 더하면 그 뜻이 흐려진다. 바꾼 것은 **크기와 무게**뿐이라야 한다. */
  const 판 = [rule('.app .rst-wrap table.grid .nm'),
    rule('.app .rst-wrap table.grid tbody td.sub'),
    rule('.app .rst-wrap table.grid tbody td.r.mono')].join(' ');
  봄('🔴 새로 만든 규칙에 color 가 없다', /color\s*:/.test(판), false);
  봄('🔴 background 도 없다', /background/.test(판), false);
  봄('🔴 자두(--point)를 관리자에 안 들인다',
    /\.app \.rst-[a-z-]*[^{]*\{[^}]*--point/.test(html), false);
  봄('🔴 ds.css 의 --accent 는 여전히 차콜이다', /--accent:\s*#3F3537/.test(ds), true);
  봄('🔴 상태색도 그대로다', [/--ok:\s*#3F7A4D/, /--no:\s*#B03A2E/].every(r => r.test(ds)), true);
}

/* ═══ ② 계층 — 세 덩이로 읽힌다 ═══ */
console.log(NL + '② 계층 — 누구인가 | 어떤 상태인가 | 숫자' + NL);
{
  봄('🔴 이름이 표의 닻이다 (한 단계 크고 굵다)',
    rule('.app .rst-wrap table.grid .nm').includes('font-size:13.5px;font-weight:700'), true);
  /* ⚠ `rule('table.grid .nm')` 로는 못 본다 — 명단용 `.app .rst-wrap table.grid .nm{` 이
     그 글자를 **품고 있어** 그것이 먼저 잡힌다(덫을 확인하다 드러났다). ds.css 를 직접 본다. */
  봄('🔴 ds.css 의 원본은 안 건드렸다 (다른 표가 쓴다)',
    /table\.grid \.nm\{font-weight:600;\}/.test(ds), true);
  봄('🔴 명단 밖의 표는 크기가 그대로다', /table\.grid \.nm\{[^}]*font-size/.test(ds), false);
  봄('보조 정보는 한 단계 물러난다',
    rule('.app .rst-wrap table.grid tbody td.sub').includes('font-size:11.5px'), true);
  봄('숫자는 훑는 것이라 무게를 준다',
    rule('.app .rst-wrap table.grid tbody td.r.mono').includes('font-weight:600'), true);

  /* 🔴 덩이의 «시작»에만 선을 세운다 — 칸마다 그으면 그물이 되어 아무것도 안 나눈다 */
  const 줄 = lift('teacherRosterHTML');
  봄('🔴 숫자 덩이의 첫 칸(출석률)에만 표시가 붙는다',
    (줄.match(/class="r mono grp/g) || []).length, 1);
  봄('머리줄에도 같은 자리에 붙는다', (줄.match(/<th class="r grp"/g) || []).length, 1);
  봄('🔴 선은 줄 구분선보다 진하다 (같으면 가로선에 묻힌다)',
    rule('.app .rst-wrap table.grid tbody td.grp').includes('var(--line)')
    && !rule('.app .rst-wrap table.grid tbody td.grp').includes('var(--line2)'), true);

  /* ⚠ 크기는 한 곳에서 정한다 — 칸에 박아 두면 두 곳이 갈린다 */
  봄('⚠ 전화번호 칸에 박힌 크기가 안 남았다',
    줄.includes('class="sub mono" style="font-size:11.5px;"'), false);
  /* ⚠ 명단 밖으로 새지 않는다 — 여기서 보고 좋으면 넓힌다 */
  봄('🔴 명단(.rst-wrap) 안에만 건다',
    (html.match(/\n\.app table\.grid \.nm\{/g) || []).length, 0);
}

/* ═══ ③ 빈 화면 — 「없습니다」로 끝내지 않는다 ═══ */
console.log(NL + '③ 빈 화면은 막다른 골목이 아니다' + NL);
{
  const 줄 = lift('teacherRosterHTML');
  /* 🔴 까닭이 둘이면 말도 둘이어야 한다 — 할 일이 완전히 다르다 */
  봄('🔴 «아직 아무도 없다»와 «거르개에 안 걸린다»를 가른다',
    줄.includes('아직 등록된 학생이 없습니다') && 줄.includes('지금 조건에 맞는 학생이 없습니다'), true);
  봄('🔴 학생이 없으면 만들러 가는 문을 낸다', 줄.includes('학생 만들러 가기'), true);
  봄('🔴 거르개 때문이면 지우는 문을 낸다', 줄.includes('rosterClearFilters()'), true);
  봄('몇 명 중 몇 명인지 말한다', 줄.includes("m.pool.length + '명 중 0명'"), true);
  봄('🔴 옛 한 줄짜리 막다른 말이 안 남았다',
    /'조건에 맞는 학생이 없습니다\.'/.test(줄), false);

  const 지우기 = 알맹이(lift('rosterClearFilters'));
  봄('검색어와 거르개를 지운다',
    지우기.includes("state.rosterQuery = ''") && 지우기.includes('state.rosterFlags = {}'), true);
  /* 🔴 «지금 보려고 고른 것»까지 되돌리면 화면이 말없이 딴 데로 간다 */
  봄('🔴 모집단(퇴원·미배정 등)은 안 건드린다', 지우기.includes('rosterView'), false);
}

/* ═══ ④ 같은 막다른 말을 한 벌로 ═══ */
console.log(NL + '④ 「이 반에 배정된 학생이 없습니다」 — 일곱 군데를 한 벌로' + NL);
{
  /* 🔴 반의 아홉 탭이 저마다 같은 말을 하고 끝냈는데, 거기서 무엇을 해야 하는지는 없었다 */
  봄('🔴 옛 막다른 말이 화면에 안 남았다',
    알맹이(html).includes('이 반에 배정된 학생이 없습니다'), false);
  봄('🔴 말도 문도 한 벌이다', (html.match(/function emptyNoRoster\(/g) || []).length, 1);
  /* ⚠ 정의 줄(`function emptyNoRoster(classId){`)도 같은 글자다 — 세는 데서 뺀다. */
  const 자리 = (html.match(/(?<!function )emptyNoRoster\(classId\)/g) || []).length;
  봄('🔴 일곱 자리가 그 한 벌을 쓴다', 자리, 7);

  const 빈것 = 알맹이(lift('emptyNoRoster'));
  봄('어느 반인지 이름으로 말한다', 빈것.includes('classNameOf(classId)'), true);
  봄('🔴 무엇을 하면 되는지 말한다', 빈것.includes('명단에서 학생의 반을 이 반으로 정하면'), true);
  봄('🔴 그리로 가는 문이 있다', 빈것.includes("state.classHubTab='students'"), true);
  봄('왜 중요한지 한 줄 붙인다 (출결·성적이 이 명단을 따라간다)',
    빈것.includes('출결·성적·과제·영상이 전부 그 명단을 따라갑니다'), true);

  /* ⚠ 부르는 자리마다 `classId` 가 손에 있어야 한다 — 없으면 조용히 «이 반»이 된다 */
  const 부르는함수 = ['sessionAttHTML', 'chubConsultHTML', 'chubScoresHTML', 'chubAttendanceHTML',
    'attDateDrawerHTML', 'chubQuizHTML', 'chubVideoHTML'];
  const 못찾는것 = 부르는함수.filter(n => {
    const f = lift(n);
    return f.includes('emptyNoRoster(classId)') && !/\bclassId\b/.test(f.split('emptyNoRoster')[0]);
  });
  봄('🔴 부르는 자리마다 classId 가 손에 있다', 못찾는것, []);
}

console.log(NL + (fail ? '🔴 ' + fail + '개 실패 · ' : '✓ 전부 통과 · ') + pass + '개' + NL);
process.exit(fail ? 1 : 0);
