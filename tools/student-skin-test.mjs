// 학생 앱 자두판 — 포인트색 · 가운데 홈 · 부품 · 홈 차례 (2026-09-14 · S-1~S-4)
//
//   node tools/student-skin-test.mjs
//
// 사용자 — 「**학생들 페이지는 조금더 보기도 좋고 이목이 집중되는 디자인과 색상포인트가 있으면
//   좋을 것 같아. 학생홈도 가운데 왔으면 포인트색상으로 왔으면 좋겠고**」
//
// 🔴 **이 판의 전부는 «관리자를 안 건드린다»이다.** 포인트색도 부품도 전부 `.app.sap` 아래에만
//   산다. 그 경계가 무너지면 관리자 표가 통째로 자두가 된다 — 맨 앞 덫이 그것이다.
// ⚠ 함수·CSS 를 여기에 옮겨 적지 않는다 — index.html · ds.css 에서 그대로 뜬다.

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
  let depth = 0;
  for (let j = html.indexOf('{', at); j < html.length; j++) {
    if (html[j] === '{') depth++;
    else if (html[j] === '}') { depth--; if (!depth) return html.slice(at, j + 1); }
  }
  throw new Error(name + ' 의 끝을 못 찾았습니다');
}
/* 깊이가 0 인 `;` 까지 — 몸통 안에 `;` 가 든 것도 통째로 뜬다 */
function liftConst(n) {
  const at = html.search(new RegExp('^const ' + n + '\\s*=', 'm'));
  if (at < 0) throw new Error(n + ' 를 못 찾았습니다');
  let 깊이 = 0;
  for (let j = at; j < html.length; j++) {
    const ch = html[j];
    if (ch === '{' || ch === '(' || ch === '[') 깊이++;
    else if (ch === '}' || ch === ')' || ch === ']') 깊이--;
    else if (ch === ';' && 깊이 === 0) return html.slice(at, j + 1);
  }
  throw new Error(n + ' 의 끝을 못 찾았습니다');
}
/* CSS 규칙 하나를 통째로 뜬다 — 선택자부터 닫는 `}` 까지 */
function rule(css, selector) {
  const at = css.indexOf(selector + '{');
  if (at < 0) return '';
  const end = css.indexOf('}', at);
  return end < 0 ? '' : css.slice(at, end + 1);
}
const 알맹이 = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

let pass = 0, fail = 0;
const 봄 = (무엇, 나온것, 나와야) => {
  const ok = JSON.stringify(나온것) === JSON.stringify(나와야);
  if (ok) pass++; else fail++;
  console.log((ok ? '  ✓ ' : '  🔴 ') + 무엇 +
    (ok ? '' : NL + '      나온 것 ' + JSON.stringify(나온것) + NL + '      나와야 ' + JSON.stringify(나와야)));
};

/* ═══ ① 포인트색 — 학생 앱 «안»에서만 ═══ */
console.log(NL + '① 자두는 학생 앱 안에서만 산다' + NL);
{
  const 셸 = rule(html, '.app.sap');
  봄('토큰이 ds.css 에 있다',
    ['--point:', '--point-lt:', '--point-d:', '--point-bg:', '--point-line:', '--point-ring:']
      .every(t => ds.includes(t)), true);
  봄('자두는 #A83E5E 다', /--point:\s*#A83E5E/.test(ds), true);

  /* 🔴 **맨 앞 덫** — 덮는 자리가 `.app.sap{}` 블록 «안»이라야 한다.
     :root 에서 덮으면 관리자 표가 통째로 자두가 된다. */
  봄('🔴 --accent 를 덮는 자리는 `.app.sap{}` 안이다',
    ['--accent:var(--point)', '--accent-d:var(--point-d)',
     '--accent-bg:var(--point-bg)', '--accent-line:var(--point-line)']
      .every(t => 셸.includes(t)), true);
  봄('🔴 :root 에서는 --accent 를 안 덮는다',
    /:root\{[\s\S]*?--accent:\s*var\(--point\)/.test(ds), false);
  봄('🔴 ds.css 의 --accent 는 차콜 그대로다', /--accent:\s*#3F3537/.test(ds), true);

  /* 🔴 상태색은 뜻이 있는 색이다 — 포인트색이 먹으면 뜻이 흐려진다 */
  봄('🔴 상태색은 안 덮는다',
    ['--ok:', '--late:', '--leave:', '--no:'].some(t => 셸.includes(t)), false);
  봄('🔴 조퇴가 보라라서 포인트로 못 쓴다 (그 색은 임자가 있다)',
    /--leave:\s*#6B46A8/.test(ds), true);
  /* ⚠ 박힌 차콜 그림자는 관리자 입력칸에도 여럿 있다 — 여기서 보는 것은 **학생 입력칸 하나**다.
     html 전체에서 찾으면 관리자 것 때문에 늘 실패한다(실제로 그랬다). */
  봄('학생 입력칸의 포커스 고리가 박힌 색이 아니라 토큰이다',
    rule(html, '.sap-in:focus').includes('var(--point-ring)'), true);
  봄('🔴 관리자 입력칸은 차콜 그대로다',
    rule(html, '.lo-in:focus').includes('rgba(60,48,52,.12)'), true);
}

/* ═══ ② 가운데 홈 ═══ */
console.log(NL + '② 홈이 가운데 · 떠 있는 원' + NL);
{
  const N = new Function([liftConst('STUDENT_NAV'), liftConst('STUDENT_NAV_FAB'),
    liftConst('STUDENT_SUBNAV')].join(NL) + NL +
    'return { STUDENT_NAV, STUDENT_NAV_FAB, STUDENT_SUBNAV };')();

  봄('탭 차례는 일정 · 학습 · 홈 · 기록 · 소통',
    N.STUDENT_NAV.map(n => n[0]), ['일정', '학습', '홈', '기록', '소통']);
  봄('🔴 홈이 «가운데» 칸이다', N.STUDENT_NAV.findIndex(n => n[1] === N.STUDENT_NAV_FAB), 2);
  봄('🔴 가운데 칸은 다섯 중 한가운데라야 한다 (탭이 다섯이다)', N.STUDENT_NAV.length, 5);
  봄('화면 id 는 그대로다 (해시·알림 링크가 산다)',
    N.STUDENT_NAV.map(n => n[1]), ['calendar', 'wronghw', 'home', 'grades', 'notice']);

  /* 🔴 어느 칸이 FAB 인지를 «한 곳»에서 정한다 — 그리는 쪽과 CSS 가 갈리면 엉뚱한 칸에 얹힌다 */
  const 셸그리기 = lift('studentHTML');
  봄('🔴 그리는 쪽이 그 상수를 본다', 셸그리기.includes("n[1] === STUDENT_NAV_FAB"), true);
  봄('가운데 칸만 아이콘을 한 겹 싼다', 셸그리기.includes("가운데 ? `<i>${iconSvg(n[2],23)}</i>`"), true);

  /* 여전히 지켜져야 하는 옛 규칙 */
  const 어긋난것 = N.STUDENT_NAV.filter(n => N.STUDENT_SUBNAV[n[0]])
    .filter(n => N.STUDENT_SUBNAV[n[0]][0][1] !== n[1]).map(n => n[0]);
  봄('🔴 「탭이 가는 곳 = 첫 칸」은 그대로 지킨다', 어긋난것, []);

  const 탭바 = rule(html, '.sap-tabs');
  봄('탭바가 높아졌다 (58 → 66)', /height:66px/.test(탭바), true);
  /* 🔴 **넘쳐 나오는 것이 이 부품의 전부다** — overflow 를 걸면 원이 잘린다 */
  봄('🔴 탭바에 overflow 를 안 건다', /overflow/.test(탭바), false);
  봄('🔴 본문 아래 여백이 바보다 넓다 (마지막 줄이 가리면 안 된다)',
    html.includes('.app.sap .body{padding:16px 16px 88px;}'), true);
  const fab = rule(html, '.sap-tabs a.fab i');
  /* ⚠ 높이는 ⑥에서 따로 붙든다 — 여기에 숫자를 박아 두면 한 번 다듬을 때마다 두 곳이 어긋난다. */
  봄('원이 바 위로 떠 있다', /top:-\d+px/.test(fab) && /width:56px/.test(fab), true);
  봄('종이색 테를 둘러 «떠 있는» 것으로 보인다', /0 0 0 5px var\(--paper\)/.test(fab), true);
  봄('원도 자두 그라데이션이다', /var\(--point-lt\),\s*var\(--point-d\)/.test(fab), true);
}

/* ═══ ③ 부품 ═══ */
console.log(NL + '③ 부품 — ds.css 원본은 안 고친다' + NL);
{
  /* 🔴 학생 앱 부품 덮기는 전부 `.app.sap` 아래라야 한다 */
  /* ⚠ `{` 를 붙여 찾으면 안 된다 — 묶어 쓴 선택자(`.app.sap .mc,` 다음 줄에 `.app.sap .todo{`)는
     그 꼴이 아니다. 선택자 «자체»가 있는지만 본다. */
  const 덮은것 = ['.app.sap .mc', '.app.sap .msec', '.app.sap .mbtn.p', '.app.sap .bar',
                  '.app.sap .todo .ic', '.app.sap .subnav a.on', '.app.sap .kpi'];
  for (const s of 덮은것) 봄('🔴 ' + s + ' — 학생 앱 아래에 있다', html.includes(s), true);
  봄('🔴 학생 앱 카드만 반경 16 · 그림자',
    /\.app\.sap \.mc,\s*\n\.app\.sap \.todo\{border-radius:16px/.test(html), true);

  봄('🔴 ds.css 의 카드 반경은 그대로다 (관리자가 쓴다)',
    rule(ds, '.mc').includes('border-radius:var(--r-lg)'), true);
  봄('🔴 ds.css 의 구획머리도 그대로다',
    rule(ds, '.msec').includes('font-size:11.5px'), true);

  /* 🔴 상태 배지는 뜻이 있는 색이다 — 손대지 않는다 */
  봄('🔴 배지는 학생 앱에서도 안 덮는다', html.includes('.app.sap .badge{'), false);

  /* 🔴 화면에서 잡은 흠 — 「.todo .t span」이 안쪽 배지까지 잡았다 */
  봄('🔴 할 일 줄의 밑줄은 «바로 아래» span 만이다',
    ds.includes('.todo .t > span{display:block'), true);
  봄('🔴 옛 선택자가 안 남았다', /\.todo \.t span\{display:block/.test(ds), false);

  봄('개수는 붉은 글자가 아니라 알약이다',
    html.includes('.app.sap .msec .n{') && !html.includes(`<span style="color:var(--no);">\${todo.length}</span>`), true);
  봄('진행바가 8px 다', rule(html, '.app.sap .bar').includes('height:8px'), true);
  봄('갈래 줄이 알약이 됐다', rule(html, '.app.sap .subnav a.on').includes('background:var(--point-bg)'), true);
}

/* ═══ ④ 홈 차례 ═══ */
console.log(NL + '④ 홈 — 시험이 맨 위' + NL);
{
  const 홈원본 = lift('stuHomeHTML');
  /* 🔴 **덫이 또 «내 주석»을 물었다**(이 저장소에서 일곱 번째다) — 차례를 설명하려고 적은
     「여태 오늘 할 일 아래 셋째에 묻혀 있었다」가 잡혀서, **주석이 먼저 나온다**는 이유로
     실패했다. ⇒ 위치를 재기 전에 **주석을 걷고**, 글자가 아니라 **그리는 markup**을 닻으로 쓴다. */
  const 홈 = 알맹이(홈원본);
  const 자리 = s => 홈.indexOf(s);
  봄('🔴 시험 히어로가 «오늘 할 일»보다 위다',
    자리('class="sap-hero"') > 0 && 자리('class="sap-hero"') < 자리('<div class="msec">오늘 할 일'), true);
  봄('🔴 차례가 인사 → 히어로 → 출석 → 두 칸 → 빠른 이동 → 할 일',
    [자리('class="sap-hi"'), 자리('class="sap-hero"'), 자리('ckCardHTML(c)'),
     자리('class="sap-duo"'), 자리('class="sap-quick"'), 자리('<div class="msec">오늘 할 일')]
      .every((v, i, a) => v > 0 && (i === 0 || v > a[i - 1])), true);

  /* 🔴 **계산은 하나도 새로 안 만들었다** — 있는 값을 자리만 옮겨 그린다 */
  봄('🔴 이미 있는 계산을 쓴다',
    ['stuTodo(c)', 'studentExamDday(c.sid)', 'dqTodayCards(c.rec)', 'wrongHomeworkLeft(c.rec)']
      .every(f => 홈.includes(f)), true);
  봄('🔴 끝난 시험은 안 그린다 (지난 시험이 남으면 «아직 안 끝났나»가 된다)',
    홈.includes("if(!dd || dd.state==='after') return ''"), true);

  /* 🔴 채운 색은 한 화면에 하나뿐이라야 «누를 것»으로 읽힌다 */
  const 두칸 = 홈.slice(자리('class="sap-duo"'), 자리('class="sap-quick"'));
  봄('🔴 두 칸 중 채운 것은 하나뿐이다',
    [(두칸.match(/class="fill"/g) || []).length, (두칸.match(/class="plain"/g) || []).length], [1, 1]);
  봄('남은 쪽으로 보낸다', 홈.includes("const 풀러갈곳 = dqLeft ? 'quiz' : 'wronghw'"), true);
  봄('다 했으면 그렇게 말한다', 홈.includes('오늘 것 다 했어요'), true);

  /* 🔵 그라데이션은 «히어로»와 «FAB» 둘뿐이다 — 우리 화면은 문제 본문이 주인공이다 */
  const 학생CSS = html.slice(html.indexOf('.app.sap{--sap-w'), html.indexOf('/* 알림 벨'));
  봄('🔵 그라데이션은 히어로와 FAB 둘뿐이다',
    (학생CSS.match(/linear-gradient/g) || []).length, 2);

  /* 빠른 이동 넷이 «진짜 있는» 화면으로 가야 한다 */
  const 섹션 = new Function(liftConst('STUDENT_TAB_SECTION') + NL + 'return STUDENT_TAB_SECTION;')();
  const 가는곳 = [...홈.matchAll(/\['(?:video|file|clinic|calendar)','[^']+','([a-z]+)'\]/g)].map(m => m[1]);
  봄('빠른 이동은 넷이다', 가는곳.length, 4);
  봄('🔴 넷 다 실제로 있는 화면이다', 가는곳.filter(t => !섹션[t]), []);
  봄('탭에 없는 것만 여기 둔다 (탭은 다섯이 천장이다)',
    가는곳, ['video', 'material', 'clinic', 'myplan']);
}

/* ═══ ⑤ 점검에서 나온 것 (2026-09-14 · 사용자 요청 — 「꼼꼼히 점검해줘요」) ═══ */
console.log(NL + '⑤ 점검 — 잔재 · 뜻이 어긋난 색 · 손 말고 키' + NL);
{
  /* 🔴 **없는 토큰은 조용히 «0»·«투명»이 된다** — 값이 틀린 것이 아니라 이름이 없는 것이라
     아무 데서도 안 튄다. 데일리퀴즈 머리띠가 각졌던 것이 그 때문이었다(`var(--r)`).
     ⇒ 두 파일을 통째로 훑어 **정의 안 된 토큰이 하나도 없는지** 본다. */
  const 정의 = new Set([...(ds + html).matchAll(/(--[a-z0-9-]+)\s*:/g)].map(m => m[1]));
  const 쓴것 = [...new Set([...(ds + html).matchAll(/var\((--[a-z0-9-]+)/g)].map(m => m[1]))];
  봄('🔴 정의 안 된 토큰이 하나도 없다', 쓴것.filter(t => !정의.has(t)), []);

  /* 🔴 상태색은 상태에만 쓴다 — 갈래에 쓰면 같은 색이 두 뜻으로 읽힌다 */
  const 퀴즈 = 알맹이(lift('stuQuizHTML'));
  봄('🔴 갈래 이름표가 상태 배지를 안 쓴다',
    퀴즈.includes('badge no') || 퀴즈.includes('badge score'), false);
  봄('갈래는 제 옷을 입는다 (q-kind)', 퀴즈.includes('class="q-kind'), true);
  봄('🔵 「한 단계 위」만 노란빛을 남긴다 (올라갔다는 뜻이 실제로 있다)',
    퀴즈.includes('class="q-kind up"'), true);
  /* ⚠ 오답숙제 이름표는 **두 자리**(푸는 카드 · 검토 중 카드)에 같은 꼴로 있어야 한다 —
     한쪽만 되돌려도 잡히게 «둘 다» 센다(덫을 확인하다 한쪽이 새는 것을 봤다). */
  봄('🔴 오답숙제 이름표 두 자리가 같은 옷이다',
    (알맹이(lift('stuWrongHTML')).match(/class="q-kind new"/g) || []).length >= 2, true);
  /* 🔵 이름은 「테스트 학생」 — 「님」이 아니다 (2026-09-14 · 사용자 요청) */
  봄('🔴 인사가 「… 학생」이다',
    알맹이(lift('stuHomeHTML')).includes('<em>학생</em>'), true);
  봄('🔴 「님」으로 안 부른다',
    /state\.currentUser\.name\)\}님/.test(lift('stuHomeHTML')), false);
  /* ⚠ 출석 화면은 배지가 아니라 달력 칸 색으로 말한다(`.cal .d.ok` …) — 그것은 **진짜 상태**라
     자두가 먹으면 안 된다. 잣대를 부르는지와, 학생 앱이 그 칸을 안 덮는지 둘 다 본다. */
  봄('⚠ 출석 화면은 여전히 상태 잣대로 칠한다',
    알맹이(lift('stuAttendanceHTML')).includes('attStatusClass('), true);
  봄('🔴 학생 앱이 출석 칸 색을 안 덮는다',
    html.includes('.app.sap .cal .d.ok') || html.includes('.app.sap .cal .d.no'), false);
  봄('출석 칸은 상태색 그대로다', rule(ds, '.cal .d.ok').includes('var(--okbg)'), true);

  /* 🔴 학생 앱 «안»에 박힌 색이 남아 있으면 포인트색이 거기서 끊긴다 */
  봄('🔴 출석 도장 카드의 hover 가 박힌 회색이 아니다',
    html.includes('.gm-run:hover{background:var(--point-line);}'), true);
  /* ⚠ `rule()` 은 «첫 번째» 같은 이름을 집는다 — `.app.sap .sap-hi b{` 가 먼저 나와서
     밑에 있는 원본 규칙의 세리프를 놓쳤다(덫을 확인하다 드러났다). 모든 `.sap-hi b{` 를 본다. */
  봄('🔴 학생 앱 머리글에 관리자 표제 서체가 안 남았다',
    /.sap-hi b{[^}]*Noto Serif/.test(html), false);
  봄('🔴 데일리퀴즈 머리띠가 메모지 노랑이 아니다',
    rule(html, '.sap-range').includes('var(--note)'), false);
  봄('그 자리는 자두 알약이다',
    rule(html, '.sap-range').includes('var(--point-bg)'), true);

  /* 🔴 손가락 말고 키로도 다닌다 · 움직임을 끄고 싶다는 말도 듣는다 */
  봄('🔴 학생 앱에 초점 테가 있다', html.includes('.app.sap .mbtn:focus-visible'), true);
  봄('🔴 움직임 줄이기를 지킨다',
    /@media \(prefers-reduced-motion: reduce\)\{\s*\n\s*\.app\.sap \*/.test(html), true);
  봄('하단 탭도 초점이 보인다', html.includes('.sap-tabs a:focus-visible'), true);

  /* 🔵 가운데 칸은 글자가 없다 — 그래도 «이름»은 남는다 */
  const 셸 = lift('studentHTML');
  봄('🔴 가운데 칸에 글자를 안 그린다', 셸.includes('iconSvg(n[2],20) + `<span>${n[0]}</span>`'), true);
  봄('🔴 그래도 소리로 읽는 사람에게 이름을 남긴다', 셸.includes('aria-label="${n[0]}"'), true);
}

/* ═══ ⑥ 누르는 자리는 «키»로도 간다 (2026-09-14 · S-6) ═══ */
console.log(NL + '⑥ 손가락 말고 키로도 — 누르는 자리마다' + NL);
{
  봄('🔴 표시는 한 곳에서 짓는다', /const TAP = 'data-tap tabindex="0" role="button"';/.test(html), true);
  const 손잡이 = (html.match(/document\.addEventListener\('keydown', e => \{[\s\S]*?\n\}\);/) || [''])[0];
  봄('🔴 손잡이가 Enter·Space 를 받는다',
    /e\.key !== 'Enter' && e\.key !== ' '/.test(손잡이), true);
  봄('🔴 표시가 붙은 것만 받는다', 손잡이.includes("closest('[data-tap]')"), true);
  봄('🔴 안쪽의 «진짜» 단추·입력칸은 그쪽이 임자다',
    손잡이.includes("closest('button, a[href], input, textarea, select')"), true);
  봄('🔴 눌린 자리에서만 기본 동작을 막는다 (아무 데서나 막으면 화면이 안 내려간다)',
    손잡이.indexOf('e.preventDefault()') > 손잡이.indexOf('if(!el) return'), true);

  /* 🔴 **이 덫이 핵심이다** — 학생 화면에 누르는 자리를 새로 만들 때마다 여기서 걸린다. */
  const 학생화면 = ['stuHomeHTML', 'stuQuizHTML', 'stuWrongHTML', 'stuVideoHTML', 'stuCalendarHTML',
    'stuMyPlanHTML', 'stuClinicHTML', 'ckCardHTML', 'studentHTML', 'stuProgressHTML',
    'stuNoticeHTML', 'stuQnaHTML', 'stuMaterialHTML', 'stuChatHTML', 'stuAttendanceHTML'];
  const 안붙은것 = [];
  for (const n of 학생화면) {
    let f = '';
    try { f = lift(n); } catch (_) { continue; }
    for (const m of f.matchAll(/<(div|span|a)\b(?:(?!>)[\s\S])*?onclick=(?:(?!>)[\s\S])*?>/g))
      if (!/data-tap|TAP/.test(m[0])) 안붙은것.push(n + ':' + (m[0].match(/class="([^"$]*)/) || [, m[1]])[1]);
  }
  /* ⚠ 영상 위의 «가림막» 하나만 일부러 뺐다 — 초점이 투명한 판에 내려앉을 뿐이고,
     재생·멈춤은 아래 조작 바에 진짜 단추로 이미 있다. */
  봄('🔴 학생 화면의 누르는 자리에 표시가 다 붙었다 (가림막 하나만 뺀다)',
    안붙은것, ['stuVideoHTML:vc-veil']);
  봄('⚠ 왜 가림막만 뺐는지 적어 두었다', html.includes('가림막»(`.vc-veil`)에는 안 붙인다'), true);

  봄('🔴 초점 테가 표시를 따라간다', html.includes('.app.sap [data-tap]:focus-visible'), true);
  봄('⚠ 달력 칸은 테를 «안쪽»에 그린다 (2px 간격이라 옆 칸을 덮는다)',
    rule(html, '.app.sap .scal-c[data-tap]:focus-visible').includes('outline-offset:-2px'), true);
  봄('🔵 가운데 칸은 «원»이 초점을 받는다',
    html.includes('.app.sap .sap-tabs a.fab[data-tap]:focus-visible i{outline:2px solid var(--point)'), true);
  봄('달력 칸이 몇 월 며칠인지 소리로도 말한다',
    lift('stuCalendarHTML').includes("' aria-label=\"' + stuDayLabel(date) + '\"'"), true);

  /* 🔵 글자를 뺀 뒤 원이 혼자 너무 높이 떠 보였다 — 8px 내렸다(사용자 요청) */
  봄('🔴 가운데 원을 조금 내렸다 (-26 → -18)',
    rule(html, '.sap-tabs a.fab i').includes('top:-18px'), true);
  봄('⚠ 그래도 나란히는 아니다 (내려앉으면 «떠 있는 단추»가 아니다)',
    /top:-1[0-9]px/.test(rule(html, '.sap-tabs a.fab i')), true);
}

/* ═══ ⑦ 상단바의 심볼 (2026-09-14 · S-7) ═══ */
console.log(NL + '⑦ 좌상단 심볼 — 이름을 두 번 말하지 않는다' + NL);
{
  봄('로고는 한 벌이다 (data URI 하나)',
    (html.match(/const LOGO_H1 = "data:image\/png;base64,/g) || []).length, 1);
  봄('🔴 CSS 에서도 쓸 수 있게 토큰으로 얹는다',
    html.includes(`document.documentElement.style.setProperty('--logo-h1', 'url("' + LOGO_H1 + '")')`), true);
  /* 🔴 **JS 로만 얹는 토큰은 CSS 에서 «없는 이름»으로 보인다** — ④의 훑기가 실제로 잡았다.
     ⇒ `:root` 에 «자리»를 선언해 둔다. 얹히기 전에는 `none` 이라 아무것도 안 그린다. */
  봄('🔴 토큰 자리가 ds.css 에 선언돼 있다', /--logo-h1:\s*none;/.test(ds), true);
  봄('⚠ 28KB 글자를 ds.css 에 또 넣지 않았다', ds.includes('data:image/png;base64'), false);
  /* 🔴 학생 앱은 누를 때마다 다시 그린다 — 상단바에 28KB 글자를 실으면 그만큼 매번 실린다 */
  봄('🔴 상단바가 innerHTML 로 28KB 를 안 싣는다', lift('studentHTML').includes('LOGO_H1'), false);
  봄('⚠ 랜딩·로그인은 예전 그대로 <img> 로 둔다 (한 번 그리고 마는 화면이다)',
    (html.match(/src="\$\{LOGO_H1\}"/g) || []).length >= 3, true);

  /* 🔴 **로고를 통째로 넣으면 「김하현수학연구소」를 두 번 말한다** — 심볼만 잘라 쓴다.
     자르는 잣대는 «폭 ≥ 높이 × (523/223)» 하나다. 높이를 바꾸면 폭도 따라와야 한다. */
  const 잣대 = 523 / 223;
  const 상자 = [...html.matchAll(/\.topbar \.bm::before\{[^}]*?width:(\d+)px;height:(\d+)px/g)]
    .map(m => [+m[1], +m[2]]);
  봄('심볼 상자가 둘이다 (기본 · 좁은 폰)', 상자.length, 2);
  봄('🔴 폭이 «높이 × 2.35» 이상이라 심볼이 안 잘린다',
    상자.filter(([w, h]) => w < h * 잣대).map(([w, h]) => w + '×' + h), []);
  봄('🔴 그렇다고 워드마크까지 보이면 안 된다 (x 556 부터가 글자다)',
    상자.filter(([w, h]) => w * (223 / h) >= 556).map(([w, h]) => w + '×' + h), []);

  /* ⚠ 좁은 폰에서 이름을 지우면 대부분의 폰(360~412)에서 학원 이름이 영영 안 보인다 */
  const 좁은판 = (html.match(/@media \(max-width:400px\)\{[\s\S]*?\n\}/) || [''])[0];
  봄('🔴 좁은 폰에서도 이름을 지우지 않는다', /\.bm\{[^}]*font-size:0/.test(좁은판), false);
  봄('대신 심볼을 줄인다', /\.bm::before\{width:45px;height:19px/.test(좁은판), true);

  /* 🔵 2026-09-14 에 사용자가 「관리자페이지도 로고 넣어주고」라 해서 선택자를 넓혔다. */
  봄('🔴 심볼이 관리자·학생 상단바에 같이 붙는다',
    /\n\.app \.topbar \.bm::before\{/.test(html), true);
  /* ⚠ 좁은 화면에서 관리자는 브랜드를 통째로 접는다 — 메뉴 일곱 개가 자리를 못 잡기 때문이고,
     이미 그렇게 정해 둔 자리다. 심볼도 같이 접힌다. */
  봄('⚠ 좁은 화면에서 관리자는 브랜드를 접는다 (심볼도 같이)',
    html.includes('.app:not(.sap) .topbar .bm{display:none;}'), true);
  봄('관리자 상단바 글자는 그대로다',
    (html.match(/<div class="bm">김하현수학연구소<\/div>/g) || []).length, 3);
}

console.log(NL + (fail ? '🔴 ' + fail + '개 실패 · ' : '✓ 전부 통과 · ') + pass + '개' + NL);
process.exit(fail ? 1 : 0);
