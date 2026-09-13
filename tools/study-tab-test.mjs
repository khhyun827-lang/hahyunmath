// 학생 «학습» 탭 — 차례 · 단추 이름 · 안내 줄 (2026-09-13 · K-20)
//
//   node tools/study-tab-test.mjs
//
// 사용자 요청 셋:
//   ① 「학습탭에서 오답숙제랑 데일리퀴즈 순서 바꿔주고」
//   ② 「오답숙제에 틀린문제 등록버튼이름을 시험지오답 으로 바꾸는게 좋을 것 같아」
//   ③ 「모든 오답숙제 문제에 문제가 이상한가요? 가 뜨는데 … 우측상단에 오류 신고가 있으니까
//      안떠도 될 것 같아」
//
// 🔴 **차례를 바꿀 때 자리가 둘이다** — 탭 단추가 «가는 곳»(STUDENT_NAV)과 그 안의 «갈래»
//   (STUDENT_SUBNAV). 한쪽만 고치면 탭을 눌렀는데 둘째 칸이 켜진다. 그것을 여기서 붙든다.
// ⚠ 함수를 여기에 옮겨 적지 않는다 — index.html 에서 그대로 뜬다.

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
function liftConst(n) {
  const at = html.search(new RegExp('^const ' + n + '\\s*=', 'm'));
  if (at < 0) throw new Error(n + ' 를 못 찾았습니다');
  const end = html.indexOf(';\n', at);
  if (end < 0) throw new Error(n + ' 의 끝을 못 찾았습니다');
  return html.slice(at, end + 1);
}
/* 주석은 «덩어리»로 걷는다 — 줄머리만 보면 주석 한가운데 줄이 남아 덫이 남의 글자를 문다. */
const 알맹이 = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

let pass = 0, fail = 0;
const 봄 = (무엇, 나온것, 나와야) => {
  const ok = JSON.stringify(나온것) === JSON.stringify(나와야);
  if (ok) pass++; else fail++;
  console.log((ok ? '  ✓ ' : '  🔴 ') + 무엇 +
    (ok ? '' : NL + '      나온 것 ' + JSON.stringify(나온것) + NL + '      나와야 ' + JSON.stringify(나와야)));
};

const N = new Function([liftConst('STUDENT_NAV'), liftConst('STUDENT_SUBNAV'),
  liftConst('STUDENT_TAB_SECTION')].join(NL) + NL +
  'return { STUDENT_NAV, STUDENT_SUBNAV, STUDENT_TAB_SECTION };')();

/* ═══ ① 학습 탭의 차례 ═══ */
console.log(NL + '① 학습 탭 — 오답숙제가 먼저다' + NL);
{
  봄('🔴 오답숙제가 첫 칸, 데일리퀴즈가 둘째 칸',
    N.STUDENT_SUBNAV['학습'].map(x => x[0]).slice(0, 2), ['오답숙제', '데일리퀴즈']);
  봄('나머지 셋의 차례는 그대로다',
    N.STUDENT_SUBNAV['학습'].map(x => x[0]).slice(2), ['진도·과제', '강의', '자료']);
  봄('화면 id 는 안 바꿨다 (해시·알림이 그대로 돈다)',
    N.STUDENT_SUBNAV['학습'].map(x => x[1]), ['wronghw', 'quiz', 'progress', 'video', 'material']);

  /* 🔴 **여기가 이 파일의 핵심 덫이다** — 탭이 가는 곳과 첫 칸이 갈리면 안 된다.
     학습만 보지 않고 **다섯 탭 전부**를 본다. 한 탭만 보면 다음에 다른 탭에서 같은 일이 난다. */
  const 어긋난것 = N.STUDENT_NAV
    .filter(n => N.STUDENT_SUBNAV[n[0]])
    .filter(n => N.STUDENT_SUBNAV[n[0]][0][1] !== n[1])
    .map(n => n[0] + ': 탭은 ' + n[1] + ', 첫 칸은 ' + N.STUDENT_SUBNAV[n[0]][0][1]);
  봄('🔴 모든 탭에서 «탭이 가는 곳» = «첫 칸»', 어긋난것, []);
  봄('학습 탭을 누르면 오답숙제로 간다',
    (N.STUDENT_NAV.find(n => n[0] === '학습') || [])[1], 'wronghw');
  봄('갈래가 없는 탭(홈)은 그대로 제 화면으로',
    (N.STUDENT_NAV.find(n => n[0] === '홈') || [])[1], 'home');

  /* 갈래의 화면이 전부 «어느 탭 것인지» 되찾아져야 한다 — 안 그러면 홈으로 떨어진다 */
  const 잃은것 = [];
  for (const 탭 in N.STUDENT_SUBNAV)
    for (const [, id] of N.STUDENT_SUBNAV[탭])
      if (N.STUDENT_TAB_SECTION[id] !== 탭) 잃은것.push(탭 + '/' + id);
  봄('🔴 모든 갈래가 제 탭으로 되찾아진다', 잃은것, []);
}

/* ═══ ② 단추 이름 ═══ */
console.log(NL + '② 「시험지 오답」 — 무엇으로 부르는가로 갈린다' + NL);
{
  const 오답 = lift('stuWrongHTML');
  봄('🔴 단추 이름이 「시험지 오답」이다',
    오답.includes(">${iconSvg('plus',16)} 시험지 오답</button>"), true);
  봄('🔴 열리는 판의 머리도 같은 이름이다', 오답.includes('">시험지 오답</div>'), true);
  봄('🔴 옛 이름이 화면 어디에도 안 남았다', 알맹이(html).includes('틀린 문제 등록'), false);
  /* ⚠ 「교재 문제 요청」은 **아래 판의 머리에도** 있는 글자다 — 그것만 보면 단추를 통째로 떼도
     통과한다(덫을 확인하다 드러났다). 그 단추가 «하는 일»을 본다. */
  봄('🔵 곁의 「교재 문제 요청」 단추는 그대로다',
    오답.includes('onclick="state.bookReqMode=true; state.bookReqPicked=[]; render()"'), true);
  봄('무엇을 하는 판인지 그대로 말한다', 오답.includes('시험지를 고르고 틀린 번호를 모두 누르세요'), true);
  /* 데일리퀴즈가 비었을 때 보내 주는 자리도 같은 이름으로 부른다 */
  봄('🔴 데일리퀴즈 빈 화면의 안내도 같은 이름으로 부른다',
    lift('stuQuizHTML').includes('시험지 오답 등록하러 가기'), true);
}

/* ═══ ③ 안내 줄 ═══ */
console.log(NL + '③ 「문제가 이상한가요?」 — 오답숙제에서는 안 뜬다' + NL);
{
  const 오답 = 알맹이(lift('stuWrongHTML'));
  const 퀴즈 = 알맹이(lift('stuQuizHTML'));
  봄('🔴 오답숙제 카드에 안내 줄이 없다', 오답.includes('reportHintHTML('), false);
  봄('🔴 그래도 오류 신고 단추는 그대로 있다 (권할 길이 사라지면 안 된다)',
    오답.includes('reportBtnHTML(bank.id'), true);
  봄('🔴 닫히면 답이 돌아오는 줄도 그대로다', 오답.includes('reportAckHTML(bank.id)'), true);
  봄('신고 폼도 그대로다', 오답.includes('reportFormHTML(bank.id'), true);
  /* 🔴 데일리퀴즈도 같이 걷었다 (2026-09-13 · 사용자 — 「데일리퀴즈도 걷어내주고」).
     ⇒ 부르는 데가 없어졌으므로 **함수까지 뗐다.** 남겨 두면 «어디선가 쓰나» 하고 읽게 된다. */
  봄('🔴 데일리퀴즈 카드에도 안내 줄이 없다', 퀴즈.includes('reportHintHTML('), false);
  봄('🔴 부르는 데가 없으니 함수도 뗐다', html.includes('function reportHintHTML('), false);
  봄('🔴 데일리퀴즈에도 오류 신고 단추는 그대로다', 퀴즈.includes('reportBtnHTML(face.bankId'), true);
  /* 🔴 왜 «모든» 문제에 떴는지 — 신고가 저장이 안 되고 있었다(K-19). 그 까닭을 적어 두었다. */
  봄('🔴 왜 모든 문제에 떴는지 적어 두었다',
    lift('stuWrongHTML').includes('신고가 여태 저장이 안 되고 있었다'), true);
}

/* ═══ ④ 오답숙제 카드의 이름표 ═══ */
console.log(NL + '④ 「엔딩크레딧 431번 변형 문항」 — 지금 보는 것이 무엇인지' + NL);
{
  const 오답 = lift('stuWrongHTML');
  const L = new Function(lift('qLabelOf') + NL + 'return qLabelOf;')();
  봄('교재에서 온 것은 「엔딩크레딧 431번」',
    L({ qlabel: '엔딩크레딧 431', qtype: '0' }), '엔딩크레딧 431번');
  봄('형이 나뉜 시험지는 형까지', L({ qlabel: '15', qtype: 'B' }), 'TYPE B 15번');
  /* 🔴 **「원본 …」이 앞에 붙으면 지금 보는 것이 원본인 줄 읽힌다** — 카드에 뜨는 것은 변형이다. */
  봄('🔴 이름표가 「… 변형 문항」으로 끝난다',
    (오답.match(/\$\{qLabelOf\(hw\)\} 변형 문항/g) || []).length, 2);
  봄('🔴 앞에 「원본」을 안 붙인다', 오답.includes('원본 ${qLabelOf(hw)}'), false);
  봄('검토 중인 카드에도 같은 이름표다',
    오답.includes('<span class="q-kind new">${qLabelOf(hw)} 변형 문항</span>\n          <span class="spacer"></span><span class="badge">검토 중</span>'), true);
  /* 🔴 **갈래를 상태색으로 말하지 않는다** (2026-09-14 점검) — `badge score` 는 «성적»의 파랑이다.
     이름표는 「이것이 어떤 문제인가」지 상태가 아니다. */
  봄('🔴 이름표가 상태 배지를 안 쓴다', 오답.includes('badge score'), false);
  봄('갈래는 갈래의 옷을 입는다', html.includes('.app.sap .q-kind{'), true);
}

console.log(NL + (fail ? '🔴 ' + fail + '개 실패 · ' : '✓ 전부 통과 · ') + pass + '개' + NL);
process.exit(fail ? 1 : 0);
