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

console.log(NL + (fail ? '🔴 ' + fail + '개 실패 · ' : '✓ 전부 통과 · ') + pass + '개' + NL);
process.exit(fail ? 1 : 0);
