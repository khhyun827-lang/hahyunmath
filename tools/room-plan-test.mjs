// 강의실 · 직보 일정표 알약 · 이번 주 게임 (2026-09-14 · S-8)
//
//   node tools/room-plan-test.mjs
//
// 사용자 요청 다섯 중 셋을 여기서 잰다:
//   ② 「이번주 게임 똥피하기로 바꿔주고」
//   ③ 「직보일정표 말이 반복되어서 그거 정리해주고」
//   ④ 「배경색 넣는건 시험기간으로 제한하고 … 직보시간에 배경색이 시험기간과 동일한 배경색이
//      들어가면서 첫시험날 전날에 직보를 넣으면 시험기간이 연장된 것 처럼보여」
//   ⑤ 「강의실 정할 수 있게 … 월금 강의실과 토요일 강의실이 달라서 그거 고려해줘」
//
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
  let d = 0;
  for (let j = html.indexOf('{', at); j < html.length; j++) {
    if (html[j] === '{') d++;
    else if (html[j] === '}') { d--; if (!d) return html.slice(at, j + 1); }
  }
  throw new Error(name + ' 의 끝을 못 찾았습니다');
}
function liftConst(n) {
  const at = html.search(new RegExp('^const ' + n + '\\s*=', 'm'));
  if (at < 0) throw new Error(n + ' 를 못 찾았습니다');
  let d = 0;
  for (let j = at; j < html.length; j++) {
    const c = html[j];
    if (c === '{' || c === '(' || c === '[') d++;
    else if (c === '}' || c === ')' || c === ']') d--;
    else if (c === ';' && d === 0) return html.slice(at, j + 1);
  }
  throw new Error(n + ' 의 끝을 못 찾았습니다');
}
const 알맹이 = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
/* ⚠ 선택자와 `{` 사이에 빈칸을 둔 줄이 있다(`.p-jikbo  {…}` — 값을 세로로 맞추려고).
   `sel + '{'` 로 찾으면 그런 줄을 통째로 놓친다(덫을 확인하다 드러났다). */
function rule(sel) {
  const m = html.match(new RegExp(sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\{[^}]*\\}'));
  return m ? m[0] : '';
}

let pass = 0, fail = 0;
const 봄 = (무엇, 나온것, 나와야) => {
  const ok = JSON.stringify(나온것) === JSON.stringify(나와야);
  if (ok) pass++; else fail++;
  console.log((ok ? '  ✓ ' : '  🔴 ') + 무엇 +
    (ok ? '' : NL + '      나온 것 ' + JSON.stringify(나온것) + NL + '      나와야 ' + JSON.stringify(나와야)));
};

const 요일 = { 일:0, 월:1, 화:2, 수:3, 목:4, 금:5, 토:6 };
const 요일글 = ['일','월','화','수','목','금','토'];

/* ═══ ① 강의실 — 요일마다 다를 수 있다 ═══ */
console.log(NL + '① 강의실 — 월·금과 토요일이 다르다' + NL);
{
  const R = new Function('WEEKDAY_MAP', 'WEEKDAY_LABEL',
    [lift('parseSchedule'), lift('parseScheduleDays'), lift('classRoomOf'),
     lift('classRoomLabel'), lift('classRoomChunks')].join(NL) + NL +
    'return { classRoomOf, classRoomLabel, classRoomChunks, parseSchedule };')(요일, 요일글);

  /* 사용자가 말한 그 반 — 월·금은 한 강의실, 토요일은 다른 강의실 */
  const 월금토 = { schedule: '월,금 19시~22시, 토 14시~16시',
    rooms: { '1': '2관 대강의실', '5': '2관 대강의실', '6': '별관 소강의실' } };

  봄('🔴 월요일과 토요일의 강의실이 다르다',
    [R.classRoomOf(월금토, 1), R.classRoomOf(월금토, 6)], ['2관 대강의실', '별관 소강의실']);
  봄('금요일은 월요일과 같다', R.classRoomOf(월금토, 5), '2관 대강의실');
  봄('🔴 한 줄로 말할 때 요일을 묶는다',
    R.classRoomLabel(월금토), '월·금 2관 대강의실 · 토 별관 소강의실');

  const 다같음 = { schedule: '화,목 19시~22시', rooms: { '2': '1관', '4': '1관' } };
  봄('다 같으면 강의실만 말한다', R.classRoomLabel(다같음), '1관');

  /* 🔴 옛 반에는 `rooms` 가 없다 — 짐작해서 채우지 않는다 */
  봄('🔴 안 적힌 반은 빈 글자다', R.classRoomLabel({ schedule: '월 19시~22시' }), '');
  봄('요일을 안 주면 빈 글자다', R.classRoomOf(월금토), '');
  봄('수업이 없는 요일의 옛 값은 안 나온다',
    R.classRoomLabel({ schedule: '월 19시~22시', rooms: { '1': '1관', '6': '없어진 반의 흔적' } }), '1관');

  /* 🔴 적는 칸은 «시간 덩이»마다 하나다 — 요일 일곱 개를 늘어놓지 않는다 */
  봄('🔴 적는 칸은 시간 덩이마다 하나다',
    R.classRoomChunks(월금토).map(x => x.days.map(d => 요일글[d]).join('·')), ['월·금', '토']);
  /* 🔴 **요일 없는 덩이는 아예 안 나온다** — `parseSchedule` 이 요일 글자를 만나야 덩이를 연다.
     처음엔 `classRoomChunks` 에 `.filter(x => x.days.length)` 를 달았는데 **한 번도 거르지
     못하는 가지**였다(덫이 안 물어서 드러났다). 그 사실 자체를 여기서 붙든다. */
  봄('🔴 요일이 안 적힌 반은 덩이가 없다 (어느 요일인지 알 수 없다)',
    R.parseSchedule('19시~22시'), []);
  봄('🔴 그래서 칸도 없다', R.classRoomChunks({ schedule: '19시~22시' }).length, 0);
  봄('🔴 모든 덩이에 요일이 들어 있다 (거를 것이 없다)',
    R.parseSchedule('월,금 19시~22시, 토 14시~16시').filter(x => !x.days.length), []);
  봄('일정이 없으면 칸도 없다', R.classRoomChunks({}).length, 0);
}

/* ═══ ② 강의실이 화면에 뜬다 ═══ */
console.log(NL + '② 강의실이 강사·학생 화면에 뜬다' + NL);
{
  /* 🔴 «그 날»의 강의실이라야 한다 — 반 하나에 강의실 하나로 적으면 거짓말이 된다 */
  const 홈 = 알맹이(lift('stuHomeHTML'));
  봄('🔴 학생 홈의 «다음 수업»이 그 요일의 강의실을 쓴다',
    홈.includes("classRoomOf(next.cls, new Date(next.date + 'T00:00:00').getDay())"), true);
  const 달력 = 알맹이(lift('stuMonthEvents'));
  봄('🔴 달력의 수업 줄도 그 요일의 것을 쓴다', 달력.includes('classRoomOf(cls, dow)'), true);
  봄('🔴 보강도 «원래 날»의 요일로 찾는다',
    달력.includes("classRoomOf(cls, new Date(옮겨옴.date + 'T00:00:00').getDay())"), true);
  봄('⚠ 안 적었으면 줄에 안 붙는다 (빈 칸이 안 생긴다)',
    달력.includes('.filter(Boolean).join(\' · \')'), true);

  봄('강사 반 목록에도 뜬다', html.includes('classRoomLabel(c) ? `<s>·</s>${escHtml(classRoomLabel(c))}`'), true);

  /* 적는 자리 둘 — 만들 때 한 칸, 고칠 때 덩이마다 */
  봄('🔴 만들 때 한 칸으로 받는다', html.includes('id="new-croom"'), true);
  const 만들기 = 알맹이(lift('addClass'));
  봄('🔴 적은 요일에만 넣는다 (안 쓰는 요일에 안 심는다)',
    만들기.includes('parseScheduleDays(schedule).forEach(d => { rooms[String(d)] = room; })'), true);
  const 고치기 = 알맹이(lift('classEditHTML'));
  봄('🔴 고칠 때는 덩이마다 한 칸이다', 고치기.includes('classRoomChunks(c).map((덩이, i)'), true);
  봄('칸에 어느 요일인지 적힌다', 고치기.includes("덩이.days.map(d => WEEKDAY_LABEL[d]).join('·')"), true);
  const 저장 = 알맹이(lift('saveClassEdit'));
  봄('🔴 저장도 덩이마다 읽어 요일에 얹는다',
    저장.includes('덩이.days.forEach(d => { rooms[String(d)] = v; })'), true);
  봄('🔴 바뀌면 변경 이력에 남는다', 저장.includes("rooms:'강의실'"), true);
  봄('🔴 딸린 것을 덮지 않는다 (얹기다)', 저장.includes('Object.assign(c, 후, {rooms})'), true);
}

/* ═══ ②-b 실제로 굴려 본다 — 요일 묶음마다 다른 강의실이 저장되는가 ═══ */
console.log(NL + '②-b 고치기를 굴려 본다' + NL);
{
  const 반 = { id:'c1', name:'고10.5B', schedule:'월,금 19시~22시, 토 14시~16시',
    period:'26.03~26.12', status:'진행중', kind:'정규',
    progress:{subject:'공통수학2'}, rooms:{} };
  const 칸 = { 'ce-namec1':'고10.5B', 'ce-schedc1':'월,금 19시~22시, 토 14시~16시',
    'ce-periodc1':'26.03~26.12', 'ce-kindc1':'정규',
    'ce-room0-c1':'2관 대강의실', 'ce-room1-c1':'별관 소강의실' };
  const 기록 = [], 쓴것 = [];
  const F = new Function('DATA','state','document','dbSetDoc','logAudit','showToast','render','escHtml',
    'WEEKDAY_MAP','WEEKDAY_LABEL',
    [lift('parseSchedule'), lift('parseScheduleDays'), lift('classRoomOf'),
     lift('classRoomChunks'), lift('saveClassEdit')].join(NL) + NL + 'return saveClassEdit;')(
    { classes:[반] }, { classEditId:'c1' },
    { getElementById: id => (id in 칸) ? { value: 칸[id] } : null },
    async (col, id, doc) => { 쓴것.push(doc); return true; },
    async (a, b, c, d) => 기록.push(d), () => {}, () => {},
    s => String(s == null ? '' : s), 요일, 요일글);
  await F('c1');

  봄('🔴 월·금 칸 하나가 두 요일에 같이 들어간다',
    [반.rooms['1'], 반.rooms['5']], ['2관 대강의실', '2관 대강의실']);
  봄('🔴 토요일은 다른 강의실이다', 반.rooms['6'], '별관 소강의실');
  봄('🔴 수업 없는 요일에는 안 심는다',
    Object.keys(반.rooms).sort(), ['1', '5', '6']);
  봄('한 번 저장한다', 쓴것.length, 1);
  봄('🔴 딸린 것(진도)이 안 날아간다', 반.progress, { subject:'공통수학2' });
  봄('🔴 변경 이력에 요일별로 남는다',
    기록[0], '고10.5B — 강의실 (빈칸)→월 2관 대강의실 · 금 2관 대강의실 · 토 별관 소강의실');

  /* 비우면 지워져야 한다 — 「안 적은 것」과 「빈 글자」가 같은 뜻이라야 한다 */
  const 지우기 = Object.assign({}, 칸, { 'ce-room1-c1':'' });
  const 기록2 = [];
  const G = new Function('DATA','state','document','dbSetDoc','logAudit','showToast','render','escHtml',
    'WEEKDAY_MAP','WEEKDAY_LABEL',
    [lift('parseSchedule'), lift('parseScheduleDays'), lift('classRoomOf'),
     lift('classRoomChunks'), lift('saveClassEdit')].join(NL) + NL + 'return saveClassEdit;')(
    { classes:[반] }, { classEditId:'c1' },
    { getElementById: id => (id in 지우기) ? { value: 지우기[id] } : null },
    async () => true, async (a, b, c, d) => 기록2.push(d), () => {}, () => {},
    s => String(s == null ? '' : s), 요일, 요일글);
  await G('c1');
  봄('🔴 비우면 그 요일의 강의실이 지워진다', 반.rooms['6'], undefined);
  봄('   남은 요일은 그대로', [반.rooms['1'], 반.rooms['5']], ['2관 대강의실', '2관 대강의실']);
}

/* ═══ ③ 직보 일정표 — 바탕은 시험기간 하나뿐 ═══ */
console.log(NL + '③ 직보 일정표 — 면은 시험기간, 찍은 것은 알약' + NL);
{
  const 표 = 알맹이(lift('teacherExamPlanHTML'));
  /* 🔴 **사용자가 짚은 그 흠** — 찍은 칸과 시험기간이 둘 다 `--nobg` 였다 */
  봄('🔴 찍은 칸이 바탕을 안 칠한다', /\.pl-c\.k-(no|blue|gone)\{/.test(html), false);
  봄('🔴 바탕을 칠하는 것은 시험기간 하나뿐이다',
    rule('.app .pl-c.sp'), '.app .pl-c.sp{background:var(--nobg);}');
  봄('수학 시험일은 밑줄로 남는다', rule('.app .pl-c.mth').includes('inset 0 -2px 0 var(--no)'), true);
  봄('🔴 찍은 것은 칸 안의 알약이다', 표.includes('<b class="pl-p p-${escHtml(c.k)}">'), true);
  봄('🔴 칸 class 에서 색을 뗐다', 표.includes("'k-' + k.색"), false);

  /* 🔴 일곱 종류가 색 셋을 나눠 쓰던 것을 갈랐다 — 종류마다 알약이 다르다 */
  const 종류 = new Function(liftConst('PLAN_KINDS') + NL + 'return PLAN_KINDS.map(k => k[0]);')();
  봄('종류는 일곱이다', 종류.length, 7);
  const 없는알약 = 종류.filter(k => !html.includes('.app .pl-p.p-' + k));
  봄('🔴 종류마다 알약이 있다 (하나라도 빠지면 그 종류는 맨몸으로 나온다)', 없는알약, []);
  봄('🔵 직보만 «채운» 알약이다 (이 표의 주인공)',
    rule('.app .pl-p.p-jikbo').includes('background:var(--accent);color:#fff'), true);
  /* 🔴 시험기간 바탕(`--nobg`)과 같은 면을 쓰는 알약이 있으면 다시 섞인다 */
  const 겹치는것 = 종류.filter(k => /background:var\(--nobg\)/.test(rule('.app .pl-p.p-' + k)));
  봄('🔴 시험기간과 같은 바탕을 쓰는 알약이 없다', 겹치는것, []);
  봄('🔵 「가능하면」은 점선이다 (확실하지 않다는 뜻)',
    rule('.app .pl-p.p-maybe').includes('dashed'), true);

  /* 붓 줄이 실제로 찍히는 것과 같아 보여야 한다 */
  봄('붓 줄도 같은 알약을 보여 준다', 표.includes('<b class="pl-p p-${escHtml(붓.k)}">'), true);

  /* ③ 제목이 두 번 — 껍데기가 이미 그린다 */
  봄('🔴 화면이 제 제목을 다시 안 그린다', 표.includes('<h1 class="t-title">직보 일정표'), false);
  봄('🔵 대신 셈은 남는다 (시즌 · 인원 · 찍은 칸)',
    표.includes('찍은 칸 <b>${찍힌수}</b>개'), true);
  /* ⚠ 「셈을 짓기만 하고 안 그리는」 것을 붙든다 — 지어 놓고 안 쓰면 화면에서 통째로 사라진다
     (덫을 확인하다 드러났다: 정의만 보면 지워도 통과했다). */
  봄('🔴 그 셈을 실제로 그린다', 표.includes('${셈}'), true);
  봄('저장 중 표시도 남는다', 표.includes('state.planDirty'), true);
  봄('껍데기가 제목을 그린다',
    lift('teacherSettingsHTML').includes('<h1 class="t-title">${(subtabs.find(t=>t[0]===tab)||subtabs[0])[1]}'), true);
  /* ⚠ 설정 갈래 중에 제 `t-title` 을 또 그리는 화면이 없어야 한다 */
  const 또그림 = ['teacherAssistantsHTML', 'teacherSettingsStudentsHTML', 'teacherSettingsClassesHTML',
    'teacherSettingsConsultsHTML', 'teacherExamRangeHTML', 'teacherExamPlanHTML',
    'teacherSignalRulesHTML', 'teacherAuditLogHTML', 'teacherSettingsAdminHTML']
    .filter(n => { try { return lift(n).includes('<h1 class="t-title">'); } catch (_) { return false; } });
  봄('🔴 설정 갈래 어느 것도 제목을 두 번 안 그린다', 또그림, []);
}

/* ═══ ④ 이번 주 게임 ═══ */
console.log(NL + '④ 이번 주 게임 — 한 주를 콕 집는다' + NL);
{
  const G = new Function([liftConst('GAMES'), liftConst('GAME_EPOCH'), liftConst('GAME_PICKS')].join(NL) + NL +
    lift('gameByKey') + NL + lift('gameOfWeek') + NL + 'return { gameOfWeek, GAMES, GAME_PICKS };')();

  봄('🔴 이번 주(9/14)는 똥피하기다', G.gameOfWeek('2026-09-14').name, '똥피하기');
  봄('🔴 콕 집은 주만 바뀐다 — 다음 주는 예전 차례대로',
    G.gameOfWeek('2026-09-21').name, G.GAMES[(3 % G.GAMES.length)].name);
  /* 🔴 `GAME_EPOCH` 를 옮겼다면 지난 주들까지 뒤집힌다 — 그 주 순위가 다른 게임 것이 된다 */
  봄('🔴 기준 날짜는 그대로다 (옮기면 지난 주들이 다 뒤집힌다)', G.gameOfWeek('2026-08-31').name, '달리기');
  봄('지난 주(9/7)도 그대로', G.gameOfWeek('2026-09-07').name, '똥피하기');
  봄('🔴 콕 집는 열쇠는 월요일이다',
    Object.keys(G.GAME_PICKS).filter(d => new Date(d + 'T00:00:00').getDay() !== 1), []);
  봄('🔴 없는 게임을 적어 두면 무시한다 (조용히 빈 화면이 되면 안 된다)',
    lift('gameOfWeek').includes("GAMES.some(g => g.key === 콕)"), true);
  봄('똥피하기가 실제로 있는 게임이다', G.GAMES.some(g => g.key === 'dodge'), true);
}

console.log(NL + (fail ? '🔴 ' + fail + '개 실패 · ' : '✓ 전부 통과 · ') + pass + '개' + NL);
process.exit(fail ? 1 : 0);
