// 관리자 새단장 — 메뉴 지도 · 대시보드 · 자두판 경계 (2026-09-24 · A-1)
//
//   node tools/admin-shell-test.mjs
//
// 🔴 재는 것은 «메뉴 지도 셋이 한 지도인가»다 — TEACHER_NAV · TEACHER_SUBNAV · TEACHER_TAB_SECTION.
//   09-03 에 itemcode 를 서브탭에만 넣고 SECTION 을 빠뜨려 상단 메뉴가 엉뚱한 칸에 불이 들어왔다.
//   셋 중 하나만 고치면 여기서 빨개진다.
// ⚠ 함수·상수를 여기에 옮겨 적지 않는다 — index.html 에서 그대로 뜬다.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/\r\n/g, '\n');

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
  let 깊이 = 0;
  for (let j = at; j < html.length; j++) {
    const ch = html[j];
    if (ch === '{' || ch === '(' || ch === '[') 깊이++;
    else if (ch === '}' || ch === ')' || ch === ']') 깊이--;
    else if (ch === ';' && 깊이 === 0) return html.slice(at, j + 1);
  }
  throw new Error(n + ' 의 끝을 못 찾았습니다');
}
const 알맹이 = s => s.replace(/\/\*[\s\S]*?\*\//g, '');

let pass = 0, fail = 0;
const 봄 = (무엇, 나온것, 나와야) => {
  const ok = JSON.stringify(나온것) === JSON.stringify(나와야);
  if (ok) pass++; else fail++;
  console.log((ok ? '  ✓ ' : '  🔴 ') + 무엇 +
    (ok ? '' : '\n      나온 것 ' + JSON.stringify(나온것) + '\n      나와야 ' + JSON.stringify(나와야)));
};

/* ═══ ① 메뉴 지도 셋이 한 지도다 ═══ */
console.log('\n① 메뉴 지도\n');
const M = new Function([liftConst('TEACHER_NAV'), liftConst('TEACHER_SUBNAV'), liftConst('TEACHER_TAB_SECTION')].join('\n') +
  '\nreturn { TEACHER_NAV, TEACHER_SUBNAV, TEACHER_TAB_SECTION };')();
{
  봄('상단 차례는 홈 · 수업 · 반 · 오답 · 소통 · 설정', M.TEACHER_NAV.map(n => n[0]), ['홈', '수업', '반', '오답', '소통', '설정']);
  봄('상단 칸마다 아이콘이 있다 (폰 하단 탭바)', M.TEACHER_NAV.every(n => typeof n[2] === 'string' && n[2]), true);
  봄('🔴 상단 칸이 가는 탭은 제 칸에 속한다',
    M.TEACHER_NAV.filter(n => M.TEACHER_TAB_SECTION[n[1]] !== n[0]).map(n => n[0]), []);
  const 서브 = Object.entries(M.TEACHER_SUBNAV).flatMap(([k, v]) => v.filter(Boolean).map(s => [k, s]));
  봄('🔴 서브탭의 탭은 전부 제 상위 칸에 속한다 (SUBNAV ↔ SECTION)',
    서브.filter(([k, s]) => M.TEACHER_TAB_SECTION[s[1]] !== k).map(([k, s]) => k + '›' + s[0]), []);
  봄('🔴 서브탭이 있는 칸은 첫 서브탭이 상단 칸의 행선지다',
    M.TEACHER_NAV.filter(n => M.TEACHER_SUBNAV[n[0]] && M.TEACHER_SUBNAV[n[0]].find(Boolean)[1] !== n[1]).map(n => n[0]), []);
  const 본문 = 알맹이(lift('teacherTabBodyHTML'));
  봄('🔴 SECTION 의 탭마다 본문이 있다 (빈 화면 없음)',
    Object.keys(M.TEACHER_TAB_SECTION).filter(t => !본문.includes(`t==='${t}'`)), []);
  봄('신호는 홈 아래로 왔다', M.TEACHER_TAB_SECTION.signals, '홈');
  봄('상담 신청은 소통 아래로 왔다', M.TEACHER_TAB_SECTION.consults, '소통');
  봄('반의 열 갈래는 하나도 안 빠졌다',
    M.TEACHER_SUBNAV['반'].filter(Boolean).map(s => s[2]).sort(),
    ['consult', 'homework', 'log', 'material', 'progress', 'quiz', 'scores', 'sessions', 'students', 'video']);
}

/* ═══ ② 옮긴 문이 옛 자리에서도 열린다 ═══ */
console.log('\n② 옛 자리 · 첫 화면\n');
{
  봄('첫 화면은 대시보드다', /teacherTab:\s*'dash'/.test(html), true);
  const 셸 = 알맹이(lift('teacherHTML'));
  봄('옛 home 은 대시보드로 간다', 셸.includes("state.teacherTab==='home') state.teacherTab = 'dash'"), true);
  봄('옛 roster 는 반 › 학생으로 간다', 셸.includes("state.teacherTab==='roster'"), true);
  const 설정 = 알맹이(lift('teacherSettingsHTML'));
  봄('🔴 옛 설정 › 상담으로 들어와도 상담 신청이 열린다', 설정.includes("state.settingsSubTab === 'consults'") && 설정.includes('teacherConsultsHTML()'), true);
  봄('설정 목록에 상담이 더는 없다', /\['consults',/.test(설정), false);
  봄('벨의 상담 신청도 새 자리로 간다', /key:'consult'[^\n]*goTeacherTab\('consults'\)/.test(html), true);
}

/* ═══ ③ 수업을 상단 메뉴로 떠나도 저장된다 ═══ */
console.log('\n③ 수업을 떠날 때 저장\n');
{
  /* 🔴 진짜로 돌려 본다 — 저장이 막히면(false) 탭이 안 바뀌어야 하고, 풀리면 바뀌어야 한다. */
  const 만들기 = 저장결과 => {
    const S = { teacherTab: 'session', studentDetailId: 'x', classHubTab: 'students' };
    let 저장 = 0, 그림 = 0;
    const f = new Function('state', 'sessionAutoSave', 'render', 알맹이(lift('goTeacherTab')) + '\nreturn goTeacherTab;')(
      S, async () => { 저장++; return 저장결과; }, () => { 그림++; });
    return { S, f, 센것: () => ({ 저장, 그림 }) };
  };
  const 막힘 = 만들기(false);
  await 막힘.f('review');
  봄('🔴 수업 → 오답: 저장이 막히면 떠나지 않는다', [막힘.S.teacherTab, 막힘.센것().저장], ['session', 1]);
  const 풀림 = 만들기(true);
  await 풀림.f('review');
  봄('수업 → 오답: 저장되면 떠난다', [풀림.S.teacherTab, 풀림.센것().저장], ['review', 1]);
  const 다른탭 = 만들기(true);
  다른탭.S.teacherTab = 'clinic';
  다른탭.f('review');   /* ⚠ await 없이 — 수업이 아니면 «곧장» 바뀌어야 한다 */
  봄('다른 탭끼리는 저장을 안 부르고 곧장 넘어간다', [다른탭.S.teacherTab, 다른탭.센것().저장], ['review', 0]);
}

/* ═══ ④ 대시보드는 «모으기»만 한다 ═══ */
console.log('\n④ 대시보드\n');
{
  const d = 알맹이(lift('teacherDashHTML'));
  봄('🔴 신호는 signalsModel 하나에서 온다', d.includes('signalsModel()') && !d.includes('signalOf('), true);
  봄('🔴 처리할 일은 벨과 같은 목록이다', d.includes('teacherNotifItems()'), true);
  봄('오늘 수업의 딱지는 수업 화면과 같은 함수다', d.includes('sessionStatusOf('), true);
  봄('수업 화면 왼쪽 목록도 그 함수를 쓴다', 알맹이(lift('teacherSessionHTML')).includes('sessionStatusOf(c, date)'), true);
  봄('시험은 examDdayOf 에서 온다', d.includes('examDdayOf('), true);
}

/* ═══ ⑤ 자두판 경계 ═══ */
console.log('\n⑤ 자두판\n');
{
  const at = html.indexOf('\n.app:not(.sap){\n  --accent:var(--point)');
  const 블록 = at < 0 ? '' : html.slice(at, html.indexOf('}', at));
  봄('관리자 셸이 --accent 를 자두로 덮는다', 블록.includes('--accent:var(--point)') && 블록.includes('--accent-bg:var(--point-bg)'), true);
  봄('🔴 상태색은 안 덮는다', ['--ok:', '--late:', '--leave:', '--no:', '--gone:'].some(t => 블록.includes(t)), false);
  봄('폰 하단 탭바는 고정 단추 줄(.actbar) 위에 선다', /:has\(\.tnav\) \.actbar\{bottom:calc\(58px/.test(html), true);
}

console.log('\n' + (fail ? '🔴 ' : '✓ ') + pass + ' 통과 · ' + fail + ' 실패\n');
process.exit(fail ? 1 : 0);
