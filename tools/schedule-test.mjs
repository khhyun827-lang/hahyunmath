// 반 일정 — 요일마다 시간이 다른 반을 담는가 (2026-09-08)
//
//   node tools/schedule-test.mjs
//
// 🔴 **왜 재는가** — 사용자가 실제 반을 등록하다 물었다. 「한 반이 화목은 5시-7시반이고
//   토요일은 오전10-오후2시야 이건 뭐라고 등록해야해?」. 그때까지는 담을 자리가 없었고,
//   더 나쁜 것은 **화면이 조용히 거짓말을 했다**는 것이다 — 요일 셋은 제대로 잡히니
//   등록은 된 것처럼 보이는데, 시간은 맨 뒤 하나만 남아 화·목 수업도 「10시~14시」로 떴다.
//   🔵 «되긴 되는데 틀린 값»은 «안 되는 것»보다 찾기 어렵다. 그래서 검사로 못을 박는다.
//
// 🔴 **함수를 여기에 옮겨 적지 않는다.** index.html 에서 그대로 떠 온다.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const NL = String.fromCharCode(10);

function lift(name){
  const at = html.indexOf('function ' + name + '(');
  if(at < 0) throw new Error(name + ' 를 못 찾았습니다');
  let depth = 0;
  for(let j = html.indexOf('{', at); j < html.length; j++){
    if(html[j] === '{') depth++;
    else if(html[j] === '}'){ depth--; if(!depth) return html.slice(at, j + 1); }
  }
  throw new Error(name + ' 의 끝을 못 찾았습니다');
}

let pass = 0, fail = 0;
const 봄 = (무엇, 나온것, 나와야) => {
  const ok = JSON.stringify(나온것) === JSON.stringify(나와야);
  if(ok){ pass++; console.log('  ✓ ' + 무엇); }
  else { fail++; console.log(`  ✗ ${무엇}${NL}      나온 것: ${JSON.stringify(나온것)}${NL}      나와야:  ${JSON.stringify(나와야)}`); }
};

const 짐 = html.slice(html.indexOf('const WEEKDAY_MAP'),
                      html.indexOf(String.fromCharCode(10), html.indexOf('const WEEKDAY_MAP')))
  + NL + lift('parseScheduleDays') + NL + lift('parseSchedule')
  + NL + lift('normOneTime') + NL + lift('normTimeText') + NL + lift('classScheduleLabel')
  + NL + lift('sessionTimeText') + NL + lift('sessionStartHour');
const F = new Function('WEEKDAY_LABEL',
  짐 + NL + `return {parseScheduleDays, parseSchedule, normTimeText, classScheduleLabel,
    sessionTimeText, sessionStartHour};`)(
  ['일','월','화','수','목','금','토']);

const 화 = 2, 목 = 4, 토 = 6, 월 = 1, 수 = 3;
const 사용자반 = '화,목 17:00~19:30 / 토 10:00~14:00';
/* 🔴 **사용자가 배포본에 실제로 적은 글자다** — `/` 가 아니라 쉼표로 나눴다.
   그게 사람이 쓰는 자연스러운 글자이고, 처음 판은 이것을 못 읽어 토요일 시간을 모두에게 물렸다. */
const 진짜입력 = '화,목 19시반~22시, 토 14시~16시';

// ── ① 사용자가 실제로 물은 그 반 ────────────────────────────────────
console.log(NL + '① 사용자가 물은 그 반 — 화·목 저녁, 토 오전' + NL);
{
  봄('요일 셋이 다 잡힌다', F.parseScheduleDays(사용자반), [화, 목, 토]);
  /* 🔴 여기가 예전에 거짓말하던 자리다 — 맨 뒤 「10:00~14:00」이 모든 요일의 시간이 됐다. */
  봄('🔴 화요일은 저녁 시간이다', F.sessionTimeText(사용자반, 화), '17:00~19:30');
  봄('🔴 목요일도 저녁 시간이다', F.sessionTimeText(사용자반, 목), '17:00~19:30');
  봄('🔴 토요일만 오전 시간이다', F.sessionTimeText(사용자반, 토), '10:00~14:00');
  봄('수업이 없는 요일은 빈 글자', F.sessionTimeText(사용자반, 월), '');
  /* 정렬 — 예전에는 화요일 목록에서도 10시로 서서 저녁 반이 오전 반처럼 앞에 왔다. */
  봄('🔴 화요일 정렬은 17시 기준', F.sessionStartHour(사용자반, 화), 17);
  봄('🔴 토요일 정렬은 10시 기준', F.sessionStartHour(사용자반, 토), 10);
  봄('요일을 안 주면 «가장 이른» 것', F.sessionStartHour(사용자반), 10);
}

// ── ② 옛 형식이 한 글자도 안 바뀌고 그대로 도는가 ────────────────────
console.log(NL + '② 🔴 옛 형식이 그대로 돈다 — 이미 등록된 반을 깨면 안 된다' + NL);
{
  const 옛 = '월,수,금 7시~9시';
  봄('요일이 그대로', F.parseScheduleDays(옛), [월, 수, 5]);
  봄('🔵 시간이 «한 꼴»로 다듬어진다 — 요일·정렬은 예전 그대로', F.sessionTimeText(옛), '7:00~9:00');
  봄('   덩이가 하나면 모든 요일이 같은 시간', F.sessionTimeText(옛, 수), '7:00~9:00');
  봄('   정렬도 예전과 똑같다', F.sessionStartHour(옛), 7);
  봄('시간이 없으면 빈 글자', F.sessionTimeText('월,수'), '');
  봄('시간이 없으면 정렬은 맨 뒤(99)', F.sessionStartHour('월,수'), 99);
  봄('빈 일정은 빈 글자', F.sessionTimeText(''), '');
  봄('빈 일정은 요일도 없다', F.parseScheduleDays(''), []);
}

// ── ③ 요일을 안 줬을 때 — 통째로 말한다 ─────────────────────────────
console.log(NL + '③ 요일을 안 주면 «전부»를 말한다 (반 목록·반 상세)' + NL);
{
  /* 🔴 예전처럼 마지막 것 하나만 돌려주면 반 목록이 「10:00~14:00」이라 적는다 —
     그 반은 대부분 저녁 반인데. 그것이 곧 거짓말이다. */
  봄('🔴 시간이 갈리면 요일을 붙여 통째로',
     F.sessionTimeText(사용자반), '화·목 17:00~19:30 · 토 10:00~14:00');
  봄('🔵 시간이 하나뿐이면 시간만', F.sessionTimeText('월,수,금 7시~9시'), '7:00~9:00');
  /* 덩이는 둘인데 시간이 같은 경우 — 굳이 요일을 붙여 시끄럽게 하지 않는다. */
  봄('   덩이가 둘이어도 시간이 같으면 시간만',
     F.sessionTimeText('화,목 7시~9시 / 토 7시~9시'), '7:00~9:00');
}

// ── ④ 사람이 실제로 칠 법한 글자들 ──────────────────────────────────
console.log(NL + '④ 사람이 실제로 칠 법한 글자들' + NL);
{
  봄('한글 시간도 그대로 담는다',
     F.sessionTimeText('화,목 5시~7시30분 / 토 오전10시~오후2시', 토), '10:00~14:00');
  봄('쉼표 없이 붙여 써도 된다', F.parseScheduleDays('화목 5시~7시반 / 토 10시~2시'), [화, 목, 토]);
  봄('   그때도 요일별로 갈린다',
     F.sessionTimeText('화목 5시~7시반 / 토 10시~2시', 목), '5:00~7:30');
  봄('줄바꿈으로 나눠도 된다',
     F.sessionTimeText('화,목 17:00~19:30' + NL + '토 10:00~14:00', 토), '10:00~14:00');
  봄('덩이 셋도 된다',
     F.sessionTimeText('월 5시~7시 / 수 6시~8시 / 토 10시~2시', 수), '6:00~8:00');
  봄('   그 셋을 통째로도 말한다',
     F.sessionTimeText('월 5시~7시 / 수 6시~8시 / 토 10시~2시'),
     '월 5:00~7:00 · 수 6:00~8:00 · 토 10:00~2:00');
}

// ── ⑤ 구분자에 기대지 않는가 (2026-09-08 저녁 · 사용자가 짚었다) ────
console.log(NL + '⑤ 🔴 구분자가 무엇이든(없어도) 요일마다 갈린다' + NL);
{
  /* 🔴 사용자가 배포본에 이렇게 적었고, `/` 만 끊던 첫 판은 **덩이를 하나로 보고
     토요일 시간을 화·목에까지 물렸다.** 「오늘은 화요일인데 시간이 토요일시간으로 뜨고」. */
  봄('🔴 쉼표로 나눠도 갈린다 — 화', F.sessionTimeText(진짜입력, 화), '19:30~22:00');
  봄('🔴 쉼표로 나눠도 갈린다 — 토', F.sessionTimeText(진짜입력, 토), '14:00~16:00');
  봄('   요일 셋이 다 잡힌다', F.parseScheduleDays(진짜입력), [화, 목, 토]);
  /* 🔴 쉼표로 «끊어» 버리면 옛 형식 「월,수,금」이 셋으로 쪼개진다 — 그래서 못 끊는다. */
  봄('🔴 그런데 「월,수,금」은 한 덩이여야 한다',
     F.parseSchedule('월,수,금 7시~9시').length, 1);
  봄('구분자가 아예 없어도 갈린다',
     F.sessionTimeText('화목 5시~7시반 토 오전10시~오후2시', 토), '10:00~14:00');
  봄('   그 앞 덩이도 제 시간을 지킨다',
     F.sessionTimeText('화목 5시~7시반 토 오전10시~오후2시', 화), '5:00~7:30');
  봄('/ 로 나눠도 그대로 된다', F.sessionTimeText(사용자반, 토), '10:00~14:00');
}

// ── ⑥ 적는 것은 자유롭게, 보이는 것은 한 꼴로 ───────────────────────
console.log(NL + '⑥ 🔵 「19시반」으로 적어도 한 꼴로 보인다 (사용자 요청)' + NL);
{
  봄('19시반 → 19:30', F.normTimeText('19시반~22시'), '19:30~22:00');
  /* 🔴 앞자리 0을 안 붙인다 — 「5시」를 05:00 으로 찍으면 «새벽 5시»라고 단정하는 셈이다. */
  봄('7시 → 7:00 (앞자리 0을 안 붙인다)', F.normTimeText('7시~9시'), '7:00~9:00');
  봄('오전·오후를 24시로', F.normTimeText('오전10시~오후2시'), '10:00~14:00');
  봄('오후 12시는 12시다', F.normTimeText('오후12시~오후1시'), '12:00~13:00');
  봄('오전 12시는 0시다', F.normTimeText('오전12시~오전1시'), '0:00~1:00');
  봄('분도 읽는다', F.normTimeText('5시30분~7시10분'), '5:30~7:10');
  봄('이미 한 꼴이면 그대로', F.normTimeText('17:00~19:30'), '17:00~19:30');
  봄('붙임표로 적어도 된다', F.normTimeText('14시-16시'), '14:00~16:00');
  /* 🔴 **못 알아보면 손대지 않는다** — 반쯤 알아듣고 고치면 반 토막이 남는다. */
  봄('🔴 못 알아보는 것은 원문 그대로', F.normTimeText('아침 일찍'), '아침 일찍');
  봄('🔴 한쪽만 읽혀도 원문 그대로', F.normTimeText('7시~아무때나'), '7시~아무때나');
  봄('빈 것은 빈 것', F.normTimeText(''), '');
  /* 반 목록 한 줄 — 요일까지 붙여 한 꼴로 */
  봄('🔵 반 목록 줄도 한 꼴이다',
     F.classScheduleLabel({schedule: 진짜입력}), '화·목 19:30~22:00 · 토 14:00~16:00');
  봄('   시간이 하나면 요일 + 시간',
     F.classScheduleLabel({schedule: '월,수,금 7시~9시'}), '월·수·금 7:00~9:00');
  봄('   일정이 없으면 빈 글자', F.classScheduleLabel({schedule: ''}), '');
}

// ── ⑦ 망가뜨려 무는지 ───────────────────────────────────────────────
console.log(NL + '⑦ ⚠ 망가뜨려 무는지 본다' + NL);
{
  /* 새 덩이를 여는 줄을 빼면 «옛날 그대로»가 되어, 화요일이 토요일 시간을 물려받아야 한다. */
  const 여는줄 = '      if(시간중) 닫기(i);';
  봄('⚠ 새 덩이를 여는 줄이 실제로 그 글자다', lift('parseSchedule').includes(여는줄), true);
  const 망친 = lift('parseSchedule').split(여는줄).join('');
  const G = new Function('WEEKDAY_LABEL',
    짐.replace(lift('parseSchedule'), 망친) + NL
    + 'return {sessionTimeText, parseSchedule};')(['일','월','화','수','목','금','토']);
  /* 🔵 안 끊으면 덩이가 하나가 되어 요일 셋이 «한 시간»을 나눠 갖는다 —
     그래서 화요일이 **토요일 시간을 물려받는다.** 이것이 정확히 09-08에 고친 그 흠이다. */
  봄('⚠ 안 끊으면 덩이가 하나가 된다(=검사가 문다)',
     G.parseSchedule(진짜입력).length, 1);
  봄('⚠ 그래서 화요일이 토요일 시간을 물려받는다',
     G.sessionTimeText(진짜입력, 화), '14:00~16:00');

  /* 시간을 다듬는 자리도 망가뜨려 본다 — 못 알아본 것을 돌려주지 «않으면» 값이 사라진다. */
  const 지키는줄 = 'return (a && b) ? a + \'~\' + b : t;';
  봄('⚠ 원문을 돌려주는 줄이 있다', lift('normTimeText').includes(지키는줄), true);
  const H = new Function(짐.replace(lift('normTimeText'),
    lift('normTimeText').split(지키는줄).join("return (a && b) ? a + '~' + b : '';"))
    + NL + 'return {normTimeText};')();
  봄('⚠ 그 줄을 빼면 못 알아본 시간이 통째로 사라진다(=검사가 문다)',
     H.normTimeText('7시~아무때나'), '');
}

console.log(`${NL}  ${fail ? '🔴' : '✅'} ${pass} 통과 · ${fail} 실패${NL}`);
process.exit(fail ? 1 : 0);
