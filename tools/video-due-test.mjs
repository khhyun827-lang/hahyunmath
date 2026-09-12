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

console.log(NL + (fail ? '🔴 ' + fail + '개 실패 · ' : '✓ 전부 통과 · ') + pass + '개' + NL);
process.exit(fail ? 1 : 0);
