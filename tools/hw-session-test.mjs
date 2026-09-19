// 수업 탭 — 보충 영상 중복 · 과제 고치기 · 과제 검사는 마감일에 (2026-09-13 · K-5)
//
//   node tools/hw-session-test.mjs
//
// 🔴 **왜 재는가** — 사용자 신고 셋:
//   ① 「수업 탭에서 몇번 왔다갔다 했더니 … 결석한 학생들 링크 보내준게 세개씩으로 여러번 등록되었어」
//      — 단계를 옮길 때마다 출결이 저장되고(sessionAutoSave), 초안의 링크가 남아 있어 저장마다 한 건씩 늘었다.
//   ② 「과제등록했을때 날짜나 기타 오타쳣을때 수정할 수 있게」 — 고치는 길이 없었다(지우고 다시 내야 했다).
//   ③ 「9/19일 마감기한으로 등록 … 과제검사에서 9/12부터 뜨고있어」 — 검사 목록이 반의 과제 «전부»였다.
//   ⚠ 함수를 베끼지 않는다 — index.html 에서 그대로 뜬다.

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
let pass = 0, fail = 0;
const 봄 = (무엇, 나온것, 나와야) => {
  const ok = JSON.stringify(나온것) === JSON.stringify(나와야);
  if (ok) pass++; else fail++;
  console.log((ok ? '  ✓ ' : '  🔴 ') + 무엇 + (ok ? '' : NL + '      나온 것 ' + JSON.stringify(나온것) + NL + '      나와야 ' + JSON.stringify(나와야)));
};

/* ═══ ① 보충 영상 — 저장을 세 번 해도 하나 ═══ */
console.log(NL + '① 결석 보충 영상 — 저장마다 늘지 않는가' + NL);
{
  const CID = 'c1', DATE = '2026-09-12';
  const roster = [{ studentId: 'st01', name: '결석이', classId: CID }];
  const DATA = { students: roster, videos: [] };
  const state = { allRecords: {}, attDraft: { st01: { status: '결석', reason: '', videoUrl: 'https://youtu.be/abcdefgh', note: '' } } };
  const recs = {};
  const 저장 = [];
  const F = new Function('DATA', 'state', 'classRoster', 'studentMainClassId', 'loadRecord', 'saveRecord', 'logAudit', 'showToast', 'render',
    'extractYouTubeId', 'dbSetDoc', 'attClassOf', 'MAKEUP_VIDEO_DAYS',
    lift('ymdPlusDays') + NL + lift('saveClassAttendance') + NL + 'return { saveClassAttendance };')(
    DATA, state, () => roster, s => s.classId,
    async sid => (recs[sid] = recs[sid] || { attendance: [], scores: [], wrongHomework: [] }),
    async () => true, async () => {}, () => {}, () => {},
    () => 'yt', async (col, id, v) => { 저장.push([col, id, v.url]); return true; },
    (a, main) => a.classId || main, 7);
  await F.saveClassAttendance(CID, DATE);
  await F.saveClassAttendance(CID, DATE);
  await F.saveClassAttendance(CID, DATE);
  const 보충 = DATA.videos.filter(v => v.studentId === 'st01');
  봄('세 번 저장해도 보충 영상은 하나', 보충.length, 1);
  봄('마감은 결석일 +7일', 보충[0].dueDate, '2026-09-19');
  봄('videos 에 쓴 것도 한 번', 저장.filter(x => x[0] === 'videos').length, 1);
  state.attDraft.st01.videoUrl = 'https://youtu.be/zzzzzzzz';
  await F.saveClassAttendance(CID, DATE);
  봄('링크를 바꾸면 «그 영상»의 링크만 바뀐다 — 새로 안 만든다', [DATA.videos.length, DATA.videos[0].url], [1, 'https://youtu.be/zzzzzzzz']);
  봄('바뀐 링크는 저장된다', 저장.filter(x => x[0] === 'videos').length, 2);
  /* 다른 날 결석은 다른 영상이다 */
  await F.saveClassAttendance(CID, '2026-09-14');
  봄('다른 날짜의 결석은 따로 하나 더', DATA.videos.length, 2);
  /* 🔵 지각·조퇴도 링크가 간다 (2026-09-20 · 사용자 — 「지각이나 조퇴 학생도 링크 전송할 수 있는 거」) */
  state.attDraft.st01 = { status: '지각', reason: '', videoUrl: 'https://youtu.be/late1234', note: '' };
  await F.saveClassAttendance(CID, '2026-09-16');
  봄('🔴 지각도 보충 영상을 만든다 — 제목에 상태가 적힌다', [DATA.videos.length, DATA.videos[0].title, DATA.videos[0].dueDate], [3, '2026-09-16 지각 보충 영상', '2026-09-23']);
  state.attDraft.st01 = { status: '조퇴', reason: '', videoUrl: 'https://youtu.be/late1234', note: '' };
  await F.saveClassAttendance(CID, '2026-09-16');
  봄('🔴 같은 날 지각→조퇴로 고쳐도 영상은 하나 — 제목만 따라간다', [DATA.videos.length, DATA.videos[0].title], [3, '2026-09-16 조퇴 보충 영상']);
  state.attDraft.st01 = { status: '출석', reason: '', videoUrl: '', note: '' };
  await F.saveClassAttendance(CID, '2026-09-17');
  봄('   출석이면 링크 칸이 비어 아무것도 안 만든다', DATA.videos.length, 3);
  봄('   화면 — 결석·지각·조퇴에 링크 칸, 빨간 표시는 결석만', /const 링크칸 = !!d\.status && d\.status !== '출석';/.test(html) && /const flag = d\.status === '결석';/.test(html), true);
  봄('   상태를 바꿔도 출석이 될 때만 링크를 비운다', (html.match(/videoUrl: status==='출석' \? '' : cur\.videoUrl/g) || []).length, 2);
}

/* ═══ ③ 과제 검사 — 마감일에 선다 ═══ */
console.log(NL + '③ 과제 검사 — 어느 수업에 서는가' + NL);
{
  const DATA = { assignments: [
    { id: 'h1', classId: 'c1', title: '9/19 마감', createdAt: '2026-09-12', dueDate: '2026-09-19' },
    { id: 'h2', classId: 'c1', title: '마감 없음', createdAt: '2026-09-12', dueDate: '' },
    { id: 'h3', classId: 'c1', title: '옛날 것', createdAt: '2026-09-01', dueDate: '2026-09-05' },
    { id: 'h4', classId: 'c2', title: '남의 반', createdAt: '2026-09-01', dueDate: '2026-09-05' },
    { id: 'h5', classId: '', title: '전체', createdAt: '2026-09-10', dueDate: '2026-09-17' },
  ] };
  const F = new Function('DATA', lift('sessionHwDue') + NL + lift('sessionHwList') + NL + 'return { sessionHwDue, sessionHwList };')(DATA);
  const on = d => F.sessionHwList('c1', d).map(a => a.id);
  봄('🔴 낸 날(9/12)에는 9/19 마감 과제가 안 선다', on('2026-09-12').includes('h1'), false);
  봄('9/12 에 서는 것 — 옛날 것만 (마감 없는 것은 낸 그날은 아니다)', on('2026-09-12'), ['h3']);
  봄('9/14 — 마감 없는 것은 낸 날 «다음» 수업부터', on('2026-09-14'), ['h2', 'h3']);
  봄('9/17 — 전체 과제가 마감일에 든다', on('2026-09-17'), ['h2', 'h3', 'h5']);
  봄('9/19 — 마감 당일에 선다', on('2026-09-19').includes('h1'), true);
  봄('9/26 — 마감이 지나도 그대로 선다 (안 낸 학생을 마저 봐야 한다)', on('2026-09-26').includes('h1'), true);
  봄('남의 반 것은 어느 날에도 없다', on('2026-09-26').includes('h4'), false);
  const check = lift('sessionHwCheckHTML');
  봄('검사 화면이 그 목록을 쓴다', check.includes('const all = sessionHwList(classId, date);'), true);
  봄('단계 체크(stepDone.hwcheck)도 같은 목록', /hwcheck: \(\(\) => \{\s*const roster = classRoster\(classId\);\s*const all = sessionHwList\(classId, date\);/.test(html), true);
  봄('칩에는 마감이 적힌다', check.includes("a.dueDate ? '마감 ' + a.dueDate.slice(5)"), true);
}

/* ═══ ② 과제 고치기 ═══ */
console.log(NL + '② 과제 고치기' + NL);
{
  const hw = { id: 'h1', classId: 'c1', title: '오타난 과재', description: '', dueDate: '2026-09-12', createdAt: '2026-09-12' };
  const DATA = { assignments: [hw] };
  const 폼 = { 'cls-hw-title': '고친 과제', 'cls-hw-desc': '설명', 'cls-hw-due': '2026-09-19', 'cls-hw-at': '2026-09-12' };
  const 저장 = [], 말 = [], 장부 = [];
  const state = { sessionHwEditId: 'h1' };
  const F = new Function('DATA', 'state', 'document', 'dbSetDoc', 'logAudit', 'showToast', 'render',
    lift('updateHomework') + NL + 'return { updateHomework };')(
    DATA, state, { getElementById: id => id in 폼 ? { value: 폼[id] } : null },
    async (col, id, v) => { 저장.push([col, id, v]); return state.막힘 ? null : true; },
    async (a, b, c, d) => 장부.push(d), m => 말.push(m), () => {});
  await F.updateHomework('h1', 'cls-');
  봄('저장은 assignments/h1 에 통째로', [저장[0][0], 저장[0][1], 저장[0][2].title, 저장[0][2].dueDate], ['assignments', 'h1', '고친 과제', '2026-09-19']);
  봄('메모리도 바뀐다 · 낸 날은 그대로', [hw.title, hw.dueDate, hw.createdAt, hw.description], ['고친 과제', '2026-09-19', '2026-09-12', '설명']);
  봄('고치기 상태가 닫힌다', state.sessionHwEditId, null);
  봄('장부에 무엇이 바뀌었는지', 장부[0], '고친 과제 · 과제명 · 설명 · 마감 2026-09-19');
  폼['cls-hw-due'] = '2026-09-01';
  await F.updateHomework('h1', 'cls-');
  봄('마감이 낸 날보다 앞서면 막는다', [저장.length, hw.dueDate], [1, '2026-09-19']);
  폼['cls-hw-due'] = '2026-09-19'; 폼['cls-hw-title'] = '';
  await F.updateHomework('h1', 'cls-');
  봄('과제명이 비면 막는다', 저장.length, 1);
  폼['cls-hw-title'] = '고친 과제'; 폼['cls-hw-at'] = '2026-09-14';
  await F.updateHomework('h1', 'cls-');
  봄('낸 날도 고칠 수 있다', hw.createdAt, '2026-09-14');
  state.막힘 = true; 폼['cls-hw-title'] = '또 고침';
  await F.updateHomework('h1', 'cls-');
  봄('저장이 막히면 메모리는 그대로', hw.title, '고친 과제');
  const sess = lift('sessionHwHTML');
  봄('수업 › 과제 목록에 「고치기」 단추', sess.includes("'고치는 중' : '고치기'"), true);
  봄('고치는 중이면 발판이 「고친 것 저장」·「취소」', sess.includes("updateHomework('${editing.id}','cls-')") && sess.includes('취소'), true);
  봄('고치는 중이면 낸 날 칸이 선다', sess.includes('id="cls-hw-at"'), true);
}

/* ═══ ④ 반 관리 › 과제 — 고치기 · 마감 순 · 수업 기록의 진도 (2026-09-13 · K-6) ═══
   사용자의 말 — 「반관리-과제탭에도 고치기 넣어주는거랑, 반-과제 탭의 과제를 마감일 기준으로
   표를 정렬하는것, 수업기록탭에 수업내용(진도)도 표기하는것」. */
console.log(NL + '④ 반 관리 › 과제 — 고치기 · 마감 순 · 진도' + NL);
{
  /* ── 잣대 하나 — 실제로 세워 본다 ── */
  const O = new Function(lift('hwOrderKey') + NL + lift('hwOrderDesc') + NL + lift('hwOrderAsc')
    + NL + 'return { hwOrderKey, hwOrderDesc, hwOrderAsc };')();
  const 것들 = [
    { id: 'a', createdAt: '2026-09-12', dueDate: '2026-09-19' },
    { id: 'b', createdAt: '2026-09-20', dueDate: '' },
    { id: 'c', createdAt: '2026-09-01', dueDate: '2026-09-05' },
    { id: 'd', createdAt: '', dueDate: '' },
    { id: 'e', createdAt: '2026-09-18', dueDate: '2026-09-19' },
  ];
  봄('마감 늦은 것이 앞 · 마감 없으면 낸 날 · 둘 다 없으면 맨 뒤',
    것들.slice().sort(O.hwOrderDesc).map(x => x.id), ['b', 'e', 'a', 'c', 'd']);
  봄('마감이 같으면 낸 날로 가른다 (e 가 a 보다 앞)',
    O.hwOrderDesc({ createdAt: '2026-09-18', dueDate: '2026-09-19' }, { createdAt: '2026-09-12', dueDate: '2026-09-19' }) < 0, true);
  봄('마감이 없으면 낸 날이 잣대다', O.hwOrderKey({ createdAt: '2026-09-20', dueDate: '' }), '2026-09-20');

  /* 🔵 **표는 «빠른 순»이다** (2026-09-16 · `5bba443` · 사용자 —「과제 표 마감일 빠른순으로 정렬」,
       2026-09-17에 다시 확인 —「빠른순이 맞아요」). 이 검사는 그때 안 따라와서 오래 빨갰다.
     ⚠ **«잣대»와 «방향»을 갈라서 잰다** — 화면 둘이 다른 함수를 부르는 것은 «틀린 것이 아니다».
       표는 한 달을 훑으니 왼→오른쪽으로 시간이 흘러야 하고(Asc), 수업의 고르개는 지금 것을
       집는 자리라 최신이 위다(Desc). 지켜야 할 것은 **`hwOrderKey` 가 하나뿐인가**다.
       키를 두 벌로 베끼는 순간 한쪽만 고쳐지고 같은 묶음이 화면마다 딴 차례로 선다. */
  봄('빠른 순 — 마감 이른 것이 앞 · 둘 다 없으면 맨 앞(빈 키가 가장 작다)',
    것들.slice().sort(O.hwOrderAsc).map(x => x.id), ['d', 'c', 'a', 'e', 'b']);
  봄('🔴 빠른 순은 늦은 순을 뒤집은 것이다 (잣대가 하나라는 뜻)',
    것들.slice().sort(O.hwOrderAsc).map(x => x.id),
    것들.slice().sort(O.hwOrderDesc).map(x => x.id).reverse());
  봄('🔴 방향은 둘이어도 «잣대»는 hwOrderKey 하나다',
    [/hwOrderKey\(/.test(String(O.hwOrderAsc)), /hwOrderKey\(/.test(String(O.hwOrderDesc))], [true, true]);

  /* ⚠ **주석을 지우고 본다** (2026-09-17) — 아래 「마감 늦은 순」 줄이 오래 «초록»이었는데,
       정작 그 딱지는 09-16에 화면에서 지워졌고 **«지웠다»고 적어 둔 주석에만** 남아 있었다.
       주석을 읽고 통과하는 검사는 아무것도 안 지킨다. 그런 줄은 빨간 줄보다 나쁘다. */
  const 살 = s => s.replace(/\/\*[\s\S]*?\*\//g, '');
  const grid = lift('hwGridHTML'), check2 = lift('sessionHwCheckHTML');
  봄('🔴 격자가 hwOrderAsc 로 세운다 — 마감 «빠른» 순',
    /const cols = list\.slice\(\)\.sort\(hwOrderAsc\);/.test(살(grid)), true);
  봄('🔴 격자가 제 잣대를 따로 적고 있지 않다', /sort\(\(x,\s*y\)\s*=>\s*String\(y\.createdAt/.test(살(grid)), false);
  봄('과제 검사는 Desc 다 — 지금 것이 맨 위', /\.sort\(\(x,\s*y\)\s*=>\s*hwOrderDesc\(x\.a, y\.a\)\)/.test(살(check2)), true);
  봄('🔴 과제 검사 안에 옛 잣대(기준)가 남아 있지 않다', 살(check2).includes('const 기준 = a =>'), false);
  봄('열 머리에 마감이 «잣대»로 적힌다', /class="due\$\{a\.dueDate\?' k':''\}"/.test(살(grid)), true);
  봄('🔴 「마감 늦은 순」 딱지는 표에서 지워졌다 (09-16)', 살(grid).includes('마감 늦은 순'), false);
  봄('규칙까지 걷은 i.hg-ord 도 안 선다', 살(grid).includes('hg-ord'), false);

  /* ── 고치기 폼 — 실제로 그려 본다 ── */
  const FF = new Function('escHtml', lift('hwNewFormHTML') + NL + 'return hwNewFormHTML;')(
    s => (s === null || s === undefined) ? '' : String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'));
  const 새폼 = FF('c1', '2026-09-13', true);
  const 고침 = FF('c1', '2026-09-13', true, { id: 'h1', title: '오타난 "과재"', description: '설명', dueDate: '2026-09-19', createdAt: '2026-09-12' });
  봄('등록 폼의 낸 날 칸은 dhw-created (addDailyHomework 가 읽는다)',
    [새폼.includes('id="dhw-created"'), 새폼.includes('id="dhw-at"')], [true, false]);
  봄('🔴 고치기 폼의 낸 날 칸은 dhw-at (updateHomework 가 읽는다)',
    [고침.includes('id="dhw-at"'), 고침.includes('id="dhw-created"')], [true, false]);
  봄('고치기 폼에 값이 차 있다 · 따옴표는 이스케이프된다',
    고침.includes('value="오타난 &quot;과재&quot;"') && 고침.includes('value="2026-09-19"') && 고침.includes('>설명</textarea>'), true);
  봄('등록 폼은 비어 있다', 새폼.includes('value=""') && !새폼.includes('>설명<'), true);
  봄('등록 폼의 마감 기본값은 그날', 새폼.includes('id="dhw-due" type="date" value="2026-09-13"'), true);
  봄('고치기 폼은 «제출 표시는 남는다»고 말한다', 고침.includes('제출·완료 표시는 그대로'), true);
  const 낸날없이 = FF('c1', '2026-09-13', false, { id: 'h1', title: 'x', dueDate: '', createdAt: '2026-09-12' });
  봄('🔴 pickCreated 가 없어도 고칠 때는 낸 날 칸이 선다 (오타를 고칠 자리가 여기뿐)',
    낸날없이.includes('id="dhw-at"'), true);

  /* ── 고친 것을 저장한다 — 접두사 d 로 dhw-* 를 읽는가 ── */
  const hw2 = { id: 'h1', classId: 'c1', title: '오타난 과재', description: '', dueDate: '2026-09-12', createdAt: '2026-09-12' };
  const DATA2 = { assignments: [hw2] };
  const 폼2 = { 'dhw-title': '고친 과제', 'dhw-desc': '', 'dhw-due': '2026-09-19', 'dhw-at': '2026-09-12' };
  const 저장2 = [];
  const state2 = { hwEditId: 'h1', hwNewOpen: { classId: 'c1', date: '2026-09-12' }, settingsForm: 'dhw' };
  const U = new Function('DATA', 'state', 'document', 'dbSetDoc', 'logAudit', 'showToast', 'render',
    lift('updateHomework') + NL + 'return { updateHomework };')(
    DATA2, state2, { getElementById: id => id in 폼2 ? { value: 폼2[id] } : null },
    async (col, id, v) => { 저장2.push([col, id, v]); return true; },
    async () => {}, () => {}, () => {});
  await U.updateHomework('h1', 'd');
  봄('접두사 d 로 dhw-* 를 읽어 저장한다', [저장2.length, hw2.title, hw2.dueDate], [1, '고친 과제', '2026-09-19']);
  봄('🔴 저장하면 반 관리 쪽 판도 닫힌다', [state2.hwEditId, state2.hwNewOpen, state2.settingsForm], [null, null, '']);

  /* ── 단추 자리 둘 — 격자에는 과제 줄이 없어 열 머리 판이 그 자리다 ── */
  const notice = lift('hwNoticeDrawerHTML'), drawer = lift('hwNewDrawerHTML'), daily = lift('teacherClassDailyHomeworkHTML');
  봄('열 머리 판(반 관리)의 발판에 「고치기」', /hwOpenEdit\('\$\{a\.id\}', true\)/.test(notice), true);
  봄('과제 줄(수업 기록 › 그날)의 삭제 옆에 「고치기」', /hwOpenEdit\('\$\{a\.id\}'\)/.test(daily), true);
  봄('드로어가 고치기 모드를 진다', /updateHomework\('\$\{editing\.id\}','d'\)/.test(drawer) && drawer.includes('과제 고치기'), true);
  봄('드로어가 같은 폼에 editing 을 넘긴다', drawer.includes('hwNewFormHTML(o.classId, o.date, true, editing)'), true);
  봄('🔴 「수업 기록 › 그날」 폼에 없던 저장 단추가 섰다', /hwSaveInline\('\$\{classId\}','\$\{date\}'\)/.test(daily), true);
  봄('그 폼이 고치기도 진다', /updateHomework\('\$\{editing\.id\}','d'\)/.test(daily), true);
  봄('고치는 중이면 머리 단추가 「고치기 취소」', daily.includes('고치기 취소'), true);
  봄('지워졌거나 남의 반 것이면 스스로 푼다', /if\(state\.hwEditId && !editing\) state\.hwEditId = null;/.test(daily), true);
  봄('🔴 수업 탭의 sessionHwEditId 와 섞이지 않는다', daily.includes('sessionHwEditId'), false);

  /* ── 여닫기 ── */
  const S = { hwEditId: null, hwNewOpen: null, hwNoticeId: 'h1', hwCell: { sid: 's1' }, settingsForm: '' };
  const OE = new Function('DATA', 'state', 'render', 'todayStr',
    lift('hwOpenEdit') + NL + lift('hwCloseEdit') + NL + lift('hwOpenNew') + NL + lift('hwCloseNew') + NL +
    'return { hwOpenEdit, hwCloseEdit, hwOpenNew, hwCloseNew };')(
    { assignments: [{ id: 'h1', classId: 'c1', createdAt: '2026-09-12' }] }, S, () => {}, () => '2026-09-13');
  OE.hwOpenEdit('h1', true);
  봄('반 관리에서 열면 드로어가 서고 겹치는 판은 닫힌다',
    [S.hwEditId, S.hwNewOpen.date, S.hwNoticeId, S.hwCell], ['h1', '2026-09-12', null, null]);
  OE.hwOpenEdit('h1', true);
  봄('같은 것을 다시 누르면 닫힌다', [S.hwEditId, S.hwNewOpen], [null, null]);
  OE.hwOpenEdit('h1');
  봄('수업 기록 › 그날에서는 아래로 편다 (드로어가 아니다)',
    [S.hwEditId, S.hwNewOpen, S.settingsForm], ['h1', null, 'dhw']);
  OE.hwOpenNew('c1', '2026-09-13');
  봄('🔴 새로 내기를 열면 고치던 것이 풀린다 (한 판에 둘이 겹치지 않게)', S.hwEditId, null);
  OE.hwCloseNew();
  봄('닫으면 둘 다 비워진다', [S.hwEditId, S.hwNewOpen], [null, null]);

  /* ── 수업 기록 줄의 진도 ── */
  const log = lift('chubLogHTML');
  봄('줄에 진도를 그린다', /f\.prog && \(f\.prog\.book \|\| f\.prog\.detail\)\) \? .<div class="prog">/.test(log), true);
  봄('교재는 굵게 · 설명은 그대로',
    /<b>\$\{escHtml\(f\.prog\.book\)\}<\/b>/.test(log) && /<span>\$\{escHtml\(f\.prog\.detail\)\}<\/span>/.test(log), true);
  봄('🔴 그리는 잣대가 거르개(「진도 적힘」)와 같다',
    log.includes('!!(x.f.prog && (x.f.prog.book || x.f.prog.detail))') && log.includes('(f.prog && (f.prog.book || f.prog.detail))'), true);
  봄('🔴 진도와 메모는 다른 상자다 (한 줄에 안 몬다)',
    /class="prog"[\s\S]{0,400}?\$\{f\.memo \? .<div class="memo">/.test(log), true);
  봄('진도 상자에 제 결이 있다', html.includes('.app .chub-sess .prog{'), true);
  봄('facts 가 prog 를 들고 온다', lift('chubSessionFacts').includes('prog: classProgSaved(classId, date)'), true);
}

/* ═══ ⑤ 글자가 아니라 «그려진 것»으로 본다 (2026-09-13 · K-6) ═══
   🔵 ④의 덫 몇은 소스에 그 글자가 있는지만 본다 — 09-13 낮에 두 번 밟은 함정이 그 꼴이었다
     (「if(false) await …()」도 그 글자를 갖는다). 그래서 두 화면은 **실제로 그려서** 본다. */
console.log(NL + '⑤ 실제로 그려 본다 — 과제 격자의 차례 · 수업 기록의 진도' + NL);
{
  /* ── 과제 격자를 그린다 — 열이 «마감» 차례로 서는가 ── */
  const HW_NONE = 'none', HW_SUBMITTED = 'wait';
  const G = new Function('state', 'hwState', 'hwIsDone', 'HWG_CELL', 'HW_NONE', 'HW_SUBMITTED',
    'todayStr', 'escHtml', 'chubYm', 'WEEKDAY_LABEL',
    lift('hwOrderKey') + NL + lift('hwOrderDesc') + NL + lift('hwOrderAsc') + NL
      + lift('hwGridHTML') + NL + 'return hwGridHTML;')(
    { allRecordsLoaded: true, hwCell: null, hwNoticeId: null, allRecords: { s1: { attendance: [], homework: {} } } },
    () => ({ status: HW_NONE, photos: [] }), () => false,
    { [HW_NONE]: ['none', '미제출', '·'], [HW_SUBMITTED]: ['wait', '확인 대기', '확인 대기'] },
    HW_NONE, HW_SUBMITTED, () => '2026-09-30',
    s => (s === null || s === undefined) ? '' : String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'),
    () => '2026-09', ['일', '월', '화', '수', '목', '금', '토']);
  const 과제들 = [
    { id: 'h1', classId: 'c1', title: '먼저 냈지만 마감이 이르다', createdAt: '2026-09-02', dueDate: '2026-09-05' },
    { id: 'h2', classId: 'c1', title: '나중에 냈지만 마감이 늦다', createdAt: '2026-09-03', dueDate: '2026-09-26' },
    { id: 'h3', classId: 'c1', title: '가운데', createdAt: '2026-09-01', dueDate: '2026-09-12' },
  ];
  const 그림 = G('c1', 과제들, [{ studentId: 's1', name: '가나다' }]);
  const 열마감 = [...그림.matchAll(/마감 <span class="mono">(\d\d-\d\d)<\/span>/g)].map(m => m[1]);
  /* 🔵 **왼쪽이 이른 마감이다** (2026-09-16 · `5bba443` · 사용자 —「과제 표 마감일 빠른순으로 정렬」).
     표는 한 달을 훑는 것이라 왼→오른쪽으로 시간이 흘러야 출결·성적 격자와 같은 방향으로 읽힌다.
     ⚠ 낸 날 차례가 아니라는 것이 여전히 요점이다 — 그랬다면 h3·h1·h2(09-12·09-05·09-26)였다. */
  봄('🔴 그려진 열이 마감 «빠른» 순이다 (낸 날 차례가 아니다)', 열마감, ['09-05', '09-12', '09-26']);
  봄('🔵 낸 날 차례였다면 09-12 가 맨 앞이었을 것 — 그것과 다르다',
    열마감[0] === '09-05' && 열마감[2] === '09-26', true);
  봄('마감 있는 열은 잣대 표시가 붙는다', (그림.match(/class="due k"/g) || []).length, 3);
  const 마감없음 = G('c1', [{ id: 'x', classId: 'c1', title: 'x', createdAt: '2026-09-04', dueDate: '' }],
    [{ studentId: 's1', name: '가' }]);
  봄('마감 없는 열에는 잣대 표시가 안 붙는다',
    마감없음.includes('마감 없음') && !마감없음.includes('class="due k"'), true);

  /* ── 수업 기록 목록을 그린다 — 진도가 줄에 서는가 ── */
  const 날들 = ['2026-09-07', '2026-09-09'];
  const 사실 = {
    '2026-09-07': { total: 2, filled: 2, cnt: { 출석: 2 }, scored: 0, marks: [], absent: 0,
      memo: '오늘은 조용했다', prog: { book: '쎈 수학(상)', detail: 'p.45~62 · 3단원 예제까지' }, hws: [] },
    '2026-09-09': { total: 2, filled: 2, cnt: { 출석: 2 }, scored: 0, marks: [], absent: 0,
      memo: '', prog: null, hws: [] },
  };
  const L = new Function('state', 'DATA', 'loadAllRecordsIfNeeded', 'loadSessionNoteIfNeeded',
    'loadClassProgLogIfNeeded', 'parseScheduleDays', 'classSessionDatesInMonth', 'chubYm', 'todayStr',
    'chubSessionFacts', 'chubMonthBarHTML', 'iconSvg', 'WEEKDAY_LABEL', 'attStatusClass', 'escHtml', 'chubDayHTML',
    lift('chubLogHTML') + NL + 'return chubLogHTML;')(
    { classHubLogFilter: '', classHubDate: '', allRecordsLoading: false },
    { classes: [{ id: 'c1', name: '고1GA1', schedule: '월,수 7시~9시' }] },
    () => {}, () => {}, () => {}, () => [1, 3], () => 날들, () => '2026-09', () => '2026-09-30',
    (cid, d) => 사실[d], () => '', () => '', ['일', '월', '화', '수', '목', '금', '토'], () => '',
    s => (s === null || s === undefined) ? '' : String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'),
    () => '');
  const 일지 = L('c1');
  봄('🔴 진도가 그려진다 — 교재와 글이 함께', /<div class="prog"><i>진도<\/i><b>쎈 수학\(상\)<\/b><s>·<\/s><span>p\.45~62 · 3단원 예제까지<\/span><\/div>/.test(일지), true);
  봄('진도 상자가 메모 상자보다 «먼저» 선다',
    일지.indexOf('class="prog"') < 일지.indexOf('class="memo"'), true);
  봄('🔴 진도가 메모 상자 «안»에 들어가 있지 않다',
    /class="memo">[^<]*진도/.test(일지), false);
  봄('진도 없는 날에는 빈 딱지를 안 그린다', (일지.match(/class="prog"/g) || []).length, 1);
  봄('거르개의 「진도 적힘」이 1건을 센다', /진도 적힘 <b>1<\/b>/.test(일지), true);
  /* 책만 있고 글이 없는 날 · 글만 있고 책이 없는 날 */
  사실['2026-09-09'] = Object.assign({}, 사실['2026-09-09'], { prog: { book: '쎈', detail: '' } });
  봄('책만 있어도 그린다 (가운뎃점은 안 찍는다)',
    /<div class="prog"><i>진도<\/i><b>쎈<\/b><\/div>/.test(L('c1')), true);
  사실['2026-09-09'] = Object.assign({}, 사실['2026-09-09'], { prog: { book: '', detail: '예제만' } });
  봄('글만 있어도 그린다', /<div class="prog"><i>진도<\/i><span>예제만<\/span><\/div>/.test(L('c1')), true);
  사실['2026-09-09'] = Object.assign({}, 사실['2026-09-09'], { prog: { book: '', detail: '' } });
  봄('🔴 둘 다 비면 아예 안 그린다', (L('c1').match(/class="prog"/g) || []).length, 1);
}

/* ═══ ⑥ 과제·메모 «넘어가면 저절로 저장» (2026-09-19) ═══
   사용자의 말 — 「과제 입력하고 넘어갔는데 등록을 안해서 사라지는 경우도 많고해서. 손이 불편해」.
   🔴 검사에 막히면(마감이 낸 날보다 앞) «옮기지 말라»가 돌아와야 한다 — 옮기면 적은 것이 사라진다. */
console.log(NL + '⑥ 과제·메모 — 넘어가면 저절로 저장' + NL);
{
  const 폼 = { 'cls-hw-title': '새 과제', 'cls-hw-desc': '', 'cls-hw-due': '2026-09-20', 'cls-hw-class': 'c1' };
  const 저장 = [], 말 = [];
  const DATA = { assignments: [] };
  const state = { sessionStep: 'hw', sessionDate: '2026-09-19', sessionHwEditId: null };
  const doc = { getElementById: id => id in 폼 ? { get value(){ return 폼[id]; }, set value(v){ 폼[id] = v; } } : null };
  const F = new Function('DATA', 'state', 'document', 'dbSetDoc', 'showToast', 'render', 'todayStr', 'updateHomework',
    lift('addHomework') + NL + lift('sessionAutoSaveHw') + NL + 'return { sessionAutoSaveHw };')(
    DATA, state, doc, async (col, id, v) => { 저장.push([col, id, v]); return true; }, m => 말.push(m), () => {}, () => '2026-09-19',
    async () => {});
  봄('🔴 과제명을 적어 두고 넘어가면 등록된다', [await F.sessionAutoSaveHw(), 저장.length, DATA.assignments[0].title, DATA.assignments[0].createdAt],
    [true, 1, '새 과제', '2026-09-19']);
  봄('   등록되면 칸이 비어 두 번 안 들어간다', [폼['cls-hw-title'], await F.sessionAutoSaveHw(), 저장.length], ['', true, 1]);
  폼['cls-hw-title'] = '앞선 마감'; 폼['cls-hw-due'] = '2026-09-01';
  봄('🔴 마감이 낸 날보다 앞서면 등록 안 되고 «옮기지 말라»', [await F.sessionAutoSaveHw(), 저장.length, 폼['cls-hw-title']],
    [false, 1, '앞선 마감']);
  봄('   그 까닭은 토스트로 말한다', /마감일.*앞섭니다/.test(말[말.length - 1]), true);
  state.sessionStep = 'memo';
  봄('   과제 단계가 아니면 아무 일도 안 한다', [await F.sessionAutoSaveHw(), 저장.length], [true, 1]);
}
{
  const 저장 = [];
  const state = { sessionStep: 'memo', sessionDate: '2026-09-19', sessionNotes: { c1: { '2026-09-19': '그대로' } }, sessionNoteDraft: null };
  let 글 = '그대로';
  const F = new Function('state', 'document', 'sessionCurrentClassId', 'saveSessionNote', 'todayStr',
    lift('sessionAutoSaveMemo') + NL + 'return sessionAutoSaveMemo;')(
    state, { getElementById: id => id === 'cls-memo' ? { get value(){ return 글; } } : null }, () => 'c1',
    async (c, d) => 저장.push([c, d]), () => '2026-09-19');
  봄('메모가 그대로면 안 쓴다', [await F(), 저장.length], [true, 0]);
  글 = '바뀐 메모';
  봄('🔴 메모를 고치고 넘어가면 저장된다', [await F(), 저장], [true, [['c1', '2026-09-19']]]);
  봄('   발판에 «넘어가면 저절로 저장됩니다»', lift('sessionMemoHTML').includes('넘어가면 저절로 저장됩니다'), true);
  봄('   시험은 뺐다 — 새 시험 만들기는 저절로 안 한다', /sessionAutoSaveExam/.test(html), false);
}

console.log(NL + (fail ? '🔴 ' + fail + '개 실패 · ' : '✓ 전부 통과 · ') + pass + '개' + NL);
process.exit(fail ? 1 : 0);
