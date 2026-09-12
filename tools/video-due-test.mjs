// 영상 마감 (2026-09-13 · K-3)
//
//   node tools/video-due-test.mjs
//
// 🔴 **왜 재는가** — 사용자가 시켰다: 「영상 제공해주는거에 대해서도 마감기한이 있었으면 좋겠어」.
//   마감 칸은 09-08부터 있었는데 **달력에만 서고 아무 데도 안 보였다.** 이제 과제와 같은 자리에 선다:
//     ① 학생 홈 할 일 — 영상에 due·D-day 가 붙고, 마감 순으로 과제와 «같은 줄»에 선다.
//     ② 다 본 영상은 할 일에 안 선다(그건 전부터). 마감이 없는 영상은 맨 아래로.
//     ③ 강사가 마감을 바꾸면 «저장이 된 뒤에» 메모리가 바뀌고, 실패하면 화면도 안 바뀐다.
//     ④ 학생 강의 탭·강사 목록·학생별 진행에 마감/지남이 글자로 선다.
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
console.log(NL + '영상 마감 — 과제와 같은 자리에 서는가' + NL);

const TODAY = '2026-09-13';
const 저장 = [];
const 곁 = {
  DATA: { exams: [], videos: [
    { id: 'v1', title: '4강', unit: '', url: 'https://youtu.be/x', classId: 'c1', dueDate: '2026-09-20' },
    { id: 'v2', title: '5강', unit: '', url: 'https://youtu.be/y', classId: 'c1', dueDate: '2026-09-10' },
    { id: 'v3', title: '6강', unit: '', url: 'https://youtu.be/z', classId: 'c1' },
    { id: 'v4', title: '다 본 것', unit: '', url: 'https://youtu.be/w', classId: 'c1', dueDate: '2026-09-01' },
  ] },
  todayStr: () => TODAY,
  dqTodayCards: () => [], dqDoneToday: () => false, wrongHomeworkLeft: () => [],
  hwNeedsAction: () => true, hwState: () => ({ status: 'none' }), HW_REJECTED: 'rejected',
  dbSetDoc: async (col, id, data) => { 저장.push([col, id, data.dueDate]); return 곁.저장실패 ? null : true; },
  logAudit: async () => {}, showToast: () => {}, render: () => {},
  저장실패: false,
};
const api = new Function(...Object.keys(곁),
  lift('stuDday') + NL + lift('stuTodo') + NL + lift('setVideoDue') + NL + 'return { stuDday, stuTodo, setVideoDue };'
)(...Object.values(곁));

/* ① 학생 홈 할 일 */
const c = {
  rec: { videoProgress: { v2: { percent: 40, completed: false }, v4: { percent: 100, completed: true } } },
  homework: [{ id: 'h1', title: '과제 A', dueDate: '2026-09-15' }],
  videos: 곁.DATA.videos,
};
const todo = api.stuTodo(c);
봄('차례 — 마감 순으로 과제와 같은 줄 (지난 5강 → 과제 15일 → 4강 20일 → 마감 없는 6강)',
   todo.map(t => t.title), ['5강', '과제 A', '4강', '6강']);
봄('영상에 due 가 붙는다', todo.map(t => t.due), ['2026-09-10', '2026-09-15', '2026-09-20', '']);
봄('D-day — 지난 것은 「지남」, 20일은 D-7', [todo[0].dday, todo[2].dday],
   [{ label: '지남', tone: 'no' }, { label: 'D-7', tone: 'late' }]);
봄('마감 없는 영상에는 dday 가 없다', todo[3].dday, null);
봄('곁말에 「…까지」가 붙는다', todo[2].sub, '강의 · 아직 안 봄 · 2026-09-20까지');
봄('40% 본 것은 그 사실도 곁말에', todo[0].sub, '강의 · 40%까지 봄 · 2026-09-10까지');
봄('② 다 본 영상은 할 일에 없다', todo.some(t => t.title === '다 본 것'), false);

/* ③ 마감 바꾸기 */
await api.setVideoDue('v3', '2026-09-30');
봄('③ 저장은 videos/v3 에 새 마감으로', 저장, [['videos', 'v3', '2026-09-30']]);
봄('저장 뒤 메모리도 바뀐다', 곁.DATA.videos[2].dueDate, '2026-09-30');
저장.length = 0;
await api.setVideoDue('v3', '2026-09-30');
봄('같은 값이면 안 쓴다', 저장.length, 0);
await api.setVideoDue('v3', '');
봄('비우면 마감이 없어진다', [저장[0][2], 곁.DATA.videos[2].dueDate], ['', '']);
저장.length = 0;
곁.저장실패 = true;
await api.setVideoDue('v1', '2026-10-01');
봄('저장이 막히면 메모리는 그대로다', 곁.DATA.videos[0].dueDate, '2026-09-20');
곁.저장실패 = false;

/* ④ 글자로 — 화면 셋에 마감이 선다 */
const stuVideo = lift('stuVideoHTML'), chubVideo = lift('chubVideoHTML');
봄('④ 학생 강의 탭 카드에 마감·D-day', stuVideo.includes('마감 <span class="mono">${escHtml(v.dueDate)}') && stuVideo.includes('stuDday(v.dueDate)'), true);
봄('강사 목록에 마감·지남', chubVideo.includes("' · 마감 <span class=\"mono\">'") && chubVideo.includes('지남'), true);
봄('강사 상세에 「마감 바꾸기」', chubVideo.includes('setVideoDue(') && chubVideo.includes('video-due-edit'), true);
봄('학생별 진행 — 지났는데 안 봤으면 «마감 지남»', chubVideo.includes('· 마감 지남</span>'), true);
봄('등록 폼에도 마감 칸이 있다', chubVideo.includes('id="video-due"'), true);


/* ═══ K-4 (2026-09-13) — 결석 보충 +7일 · 한 명에게 보내기 · 개인 배정 시청 확인 ═══ */
console.log(NL + '개인 배정 — 결석 보충 +7일 · 한 명에게 · 봤는지' + NL);
const MAKEUP = Number((html.match(/const MAKEUP_VIDEO_DAYS = (\d+);/) || [])[1]);
봄('결석 보충 마감은 +7일로 못 박혀 있다', MAKEUP, 7);
const dates = new Function(lift('ymdPlusDays') + NL + 'return { ymdPlusDays };')();
봄('날짜 더하기 — 달을 넘긴다', dates.ymdPlusDays('2026-09-28', 7), '2026-10-05');
봄('날짜 더하기 — 해를 넘긴다', dates.ymdPlusDays('2026-12-30', 7), '2027-01-06');
봄('이상한 날짜면 빈 값', dates.ymdPlusDays('', 7), '');
const saveAtt = lift('saveClassAttendance');
봄('출결 저장이 보충 영상에 마감 +7일을 단다', saveAtt.includes('dueDate: ymdPlusDays(date, MAKEUP_VIDEO_DAYS)'), true);
봄('보충 영상에 반도 적는다 (탭이 모아 보이도록)', /studentId:s\.studentId, dueDate/.test(saveAtt) && /url, classId,\s*$/m.test(saveAtt), true);

/* addVideo — 대상을 고르면 그 학생에게만 */
const 폼 = { 'video-unit': '', 'video-title': '보충 4강', 'video-url': 'https://youtu.be/abcdefgh', 'video-class': 'c1', 'video-due': '2026-09-25', 'video-target': '' };
const 저장2 = [];
const 곁2 = {
  document: { getElementById: id => id in 폼 ? { get value(){ return 폼[id]; }, set value(v){ 폼[id] = v; } } : null },
  DATA: { videos: [], students: [{ studentId: 'st01', name: '가나' }] },
  extractYouTubeId: u => /youtu\.be\//.test(u) ? 'x' : null,
  dbSetDoc: async (col, id, data) => { 저장2.push(data); return true; },
  showToast: () => {}, render: () => {},
};
const api2 = new Function(...Object.keys(곁2), lift('addVideo') + NL + 'return { addVideo };')(...Object.values(곁2));
await api2.addVideo();
봄('대상이 «반 전체»면 studentId 가 없다', 'studentId' in 저장2[0], false);
봄('반·마감은 그대로 붙는다', [저장2[0].classId, 저장2[0].dueDate], ['c1', '2026-09-25']);
폼['video-title'] = '보충 5강'; 폼['video-url'] = 'https://youtu.be/abcdefgh'; 폼['video-due'] = ''; 폼['video-target'] = 'st01';
await api2.addVideo();
봄('한 명을 고르면 그 학생에게만 (studentId)', 저장2[1].studentId, 'st01');
봄('개인 배정도 반을 적는다', 저장2[1].classId, 'c1');
봄('보낸 뒤 대상 고르개는 «반 전체»로 돌아간다', 폼['video-target'], '');
봄('메모리에도 둘 다 (새것이 앞)', 곁2.DATA.videos.map(v=>v.title), ['보충 5강', '보충 4강']);

/* 강사 영상 탭 — 글자로 */
봄('등록 폼에 «대상» 고르개', chubVideo.includes('id="video-target"') && chubVideo.includes('반 전체'), true);
봄('개인 배정은 명단(학생)으로 모은다 — classId 가 빈 옛 결석 영상도 든다', chubVideo.includes('rosterIds.has(v.studentId)'), true);
봄('목록에 «개인 배정» 구역', chubVideo.includes('개인 배정 <span class="mono">'), true);
봄('개인 배정 줄에 완주/％/미시청과 마감 지남', chubVideo.includes("p.done ? '완주' : p.seen ? p.pct+'%' : '미시청'") && chubVideo.includes('personalItem'), true);
봄('개인 배정 상세는 히스토그램 대신 그 한 명', chubVideo.includes("sel.studentId ? one : drop + students"), true);
봄('둘 다 비어야 «없습니다»', chubVideo.includes('vids.length===0 && personal.length===0'), true);


/* 강사 영상 탭 — «돌려서» (템플릿이 실제로 그려지는가) */
const 곁3 = {
  loadAllRecordsIfNeeded: () => {}, classRoster: () => [{ studentId: 'st01', name: '가나' }, { studentId: 'st02', name: '다라' }],
  state: { allRecords: { st01: { videoProgress: { p1: { percent: 100, completed: true } } }, st02: { videoProgress: { p2: { percent: 30, completed: false } } } },
           allRecordsLoaded: true, allRecordsLoading: false, videoAdding: true, videoSelectedId: 'p2' },
  DATA: { students: [{ studentId: 'st01', name: '가나' }, { studentId: 'st02', name: '다라' }], classes: [{ id: 'c1', name: '1반' }],
          videos: [
            { id: 'a1', title: '반 영상', unit: '', url: 'u', classId: 'c1', dueDate: '2026-09-20' },
            { id: 'p1', title: '09-01 결석 보충 영상', url: 'u', classId: '', studentId: 'st01', dueDate: '2026-09-08' },
            { id: 'p2', title: '보충 5강', url: 'u', classId: 'c1', studentId: 'st02', dueDate: '2026-09-10' },
            { id: 'p9', title: '남의 반', url: 'u', classId: '', studentId: 'st99' },
          ] },
  escHtml: x => String(x == null ? '' : x), iconSvg: () => '', todayStr: () => TODAY,
};
const api3 = new Function(...Object.keys(곁3), lift('chubVideoHTML') + NL + 'return { chubVideoHTML };')(...Object.values(곁3));
const out = api3.chubVideoHTML('c1');
봄('그려진다 — 반 전체 구역과 개인 배정 2 (남의 반 것은 안 든다)', [out.includes('>반 전체</div>'), out.includes('개인 배정 <span class="mono">2</span>'), out.includes('남의 반')], [true, true, false]);
봄('결석 보충(classId 빈 것)이 «완주»로', out.includes('가나 <span style="font-weight:400;color:var(--sub);">· 09-01 결석 보충 영상') && out.includes('>완주</b>'), true);
봄('보충 5강은 30% 에 마감 지남', out.includes('30%</b>') && out.includes('다라') && out.includes('<span class="badge no">지남</span>'), true);
봄('고른 것이 개인 배정이면 상세는 «받은 학생» 한 줄', out.includes('받은 학생') && out.includes('개인 배정 · 다라') && !out.includes('이탈 지점'), true);
봄('대상 고르개에 명단 둘', (out.match(/<option value="st0[12]">/g) || []).length, 2);
곁3.state.videoSelectedId = 'a1';
const out2 = api3.chubVideoHTML('c1');
봄('반 영상을 고르면 이탈 지점이 돌아온다', out2.includes('이탈 지점') && !out2.includes('받은 학생'), true);

console.log(NL + (fail ? '🔴 ' + fail + '개 실패 · ' : '✓ 전부 통과 · ') + pass + '개' + NL);
process.exit(fail ? 1 : 0);
