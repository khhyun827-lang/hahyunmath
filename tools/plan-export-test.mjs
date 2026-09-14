// 직보 일정표 반별 내보내기 · 반 목록의 이름 없는 퍼센트 (2026-09-14 · S-9)
//
//   node tools/plan-export-test.mjs
//
// 사용자 요청 둘:
//   ① 「반-영상 탭에서 33%가 반마다 붙어있는데 반에 해당하는 시청률도 아니어서 … 수정해야할 것 같아」
//      🔴 재 보니 그 수는 **진도**였다. 이름표가 없어서 «지금 보는 탭»의 수로 읽힌 것이다.
//   ② 「반마다 위에 요일이랑 붙여서 공지사항에 게시 … 반별로 파일로 저장 혹은 바로 게시」
//   ③ (같은 날 저녁) 「엑셀파일이 아니라 그냥 이미지 캡쳐로 … 공지 눌렀을 때도 그 이미지 파일을 넣고 싶다」
//      ⇒ 파일은 PNG · 공지에는 글 + 그림. 그림은 워커 /upload 로 드라이브에 올라간다(질의응답 사진과 같은 길).
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
const 알맹이 = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

let pass = 0, fail = 0;
const 봄 = (무엇, 나온것, 나와야) => {
  const ok = JSON.stringify(나온것) === JSON.stringify(나와야);
  if (ok) pass++; else fail++;
  console.log((ok ? '  ✓ ' : '  🔴 ') + 무엇 +
    (ok ? '' : NL + '      나온 것 ' + JSON.stringify(나온것) + NL + '      나와야 ' + JSON.stringify(나와야)));
};

/* 판 하나 — 두 학생, 이레짜리 기간, 찍힌 칸 몇 개 */
function 판(옵션) {
  const o = 옵션 || {};
  const 학생들 = o.students || [
    { studentId:'s1', name:'김승우', school:'광남고', classId:'c1' },
    { studentId:'s2', name:'윤건희', school:'광남고', classId:'c1' },
    { studentId:'s3', name:'이승준', school:'대원고', classId:'c1' },   // 찍은 칸이 없다
  ];
  const 칸 = o.cells || {
    s1: { '2026-09-29':{k:'off'}, '2026-10-01':{k:'jikbo', t:'2시'} },
    s2: { '2026-10-01':{k:'jikbo', t:'2시'} },
  };
  const 쓴것 = [], 말 = [], 기록 = [], 올린것 = [], 지운것 = [];
  /* 그림은 가짜 캔버스다 — 여기서 html2canvas 를 돌릴 수는 없다. 올리는 길(uploadDataUrlToDrive)만 본다. */
  const F = new Function('DATA', 'state', 'document', 'classRoster', 'classNameOf', 'isWithdrawn',
    'currentSeason', 'todayStr', 'dateShift', 'planRange', 'planCell', 'planLabel',
    'dbSetDoc', 'logAudit', 'showToast', 'render', 'escHtml',
    'planClassCanvas', 'uploadDataUrlToDrive', 'deleteFromDrive', 'imgFileIdOf', 'console',
    [lift('planDaysOf'), lift('planDateLabel'), lift('planClassRows'), lift('planClassText'),
     lift('planFileName'), lift('planPostOpen'), lift('planPostClose'), lift('planPostRun')].join(NL) + NL +
    'return { planDateLabel, planClassRows, planClassText, planFileName, planPostOpen, planPostClose, planPostRun };')(
    { notices: [] }, o.state || {}, { getElementById: () => (o.el === undefined ? null : { value: o.el }) },
    () => 학생들, () => '고10.5B', () => false,
    () => '2학기 중간', () => '2026-09-14',
    (d, n) => { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); },
    () => ({ from: '2026-09-28', to: '2026-10-04' }),
    (sid, d) => (칸[sid] || {})[d] || null,
    (c) => ({ off:'등원X', jikbo:'직보', start:'등원시작' }[c && c.k] || '') + ((c && c.t) || ''),
    async (col, id, doc) => { 쓴것.push({ col, id, doc }); return o.저장흠 ? null : true; },
    async (a, b, c, d) => 기록.push(d),
    (m) => 말.push(m), () => {}, (s) => String(s == null ? '' : s),
    async () => (o.그림없음 ? null : { toDataURL: () => 'data:image/png;base64,AAAA' }),
    async (dataUrl, name) => { 올린것.push({ dataUrl, name }); if (o.올리기흠) throw new Error('upload http 502'); return { url: 'https://drive/x', fileId: 'f1' }; },
    (id) => 지운것.push(id), (v) => (v && v.fileId) || null,
    { error(){}, warn(){}, log: console.log });   // 일부러 엎는 판의 console.error 를 삼킨다
  return { F, 쓴것, 말, 기록, 올린것, 지운것 };
}

/* ═══ ① 날짜에 요일이 붙는다 ═══ */
console.log(NL + '① 날짜에 요일을 붙인다' + NL);
{
  const { F } = 판();
  /* 🔴 「10/1」만으로는 무슨 요일인지 세어 봐야 한다 — 사용자가 「위에 요일이랑 붙여서」라고 했다. */
  봄('🔴 10/1 은 목요일이다', F.planDateLabel('2026-10-01'), '10/1(목)');
  봄('9/28 은 월요일', F.planDateLabel('2026-09-28'), '9/28(월)');
  봄('앞자리 0 을 안 붙인다 (읽는 글이다)', F.planDateLabel('2026-10-04'), '10/4(일)');
}

/* ═══ ② 공지 글 — 학생별 한 줄 ═══ */
console.log(NL + '② 공지는 «학생별 한 줄»이다 (표가 아니다)' + NL);
{
  const { F } = 판();
  const 글 = F.planClassText('c1');
  봄('머리에 반·시즌·기간이 있다',
    글.split('\n').slice(0, 2), ['고10.5B · 2학기 중간 직보 일정', '9/28(월) ~ 10/4(일)']);
  봄('🔴 학생마다 한 덩이다', 글.includes('김승우 (광남고)\n  9/29(화) 등원X · 10/1(목) 직보2시'), true);
  봄('찍은 칸이 하나뿐인 학생도 나온다', 글.includes('윤건희 (광남고)\n  10/1(목) 직보2시'), true);
  /* 🔴 빈 줄만 스무 개인 글은 아무 말도 안 한다 */
  봄('🔴 찍은 것이 없는 학생은 줄을 안 만든다', 글.includes('이승준'), false);
  봄('대신 «없는 사람이 있다»고 한 줄로 말한다', 글.includes('※ 이름이 없는 학생은'), true);

  const 빈판 = 판({ cells: {} });
  봄('🔴 아무것도 안 찍혔으면 그렇게 말한다',
    빈판.F.planClassText('c1').includes('아직 찍어 둔 일정이 없습니다'), true);

  /* ⚠ 표를 글자로 옮기지 않는다 — 폰에서 줄이 접힌다 */
  봄('⚠ 표를 글자로 옮기지 않는다 (칸 구분 글자가 없다)', /[|]/.test(글), false);
}

/* ═══ ③ 게시 — 보고 나서 올린다 ═══ */
console.log(NL + '③ 게시 — 바로 안 올리고 먼저 보여 준다' + NL);
{
  const state = {};
  const { F, 쓴것, 말, 기록, 올린것 } = 판({ state });
  await F.planPostOpen('c1');
  봄('🔴 누르면 먼저 판이 열린다 (아직 안 올라간다 — 그림도)', [!!state.planPost, 쓴것.length, 올린것.length], [true, 0, 0]);
  봄('판에 글이 담겨 있다', state.planPost.text.startsWith('고10.5B · 2학기 중간 직보 일정'), true);
  봄('판에 그림이 담겨 있다 (미리 보기용)', state.planPost.img, 'data:image/png;base64,AAAA');

  const 고친판 = 판({ state: { planPost: { classId:'c1', text:'원래 글', img: 'data:image/png;base64,AAAA' } }, el: '내가 고친 글' });
  await 고친판.F.planPostRun();
  /* 🔵 고칠 수 있어야 한다 — 한 줄 덧붙이는 일이 잦다 */
  봄('🔴 판에서 고친 글이 그대로 올라간다', 고친판.쓴것[0].doc.content, '내가 고친 글');
  봄('그 반에게만 간다', 고친판.쓴것[0].doc.classIds, ['c1']);
  /* 🔵 그림 — 드라이브에 올리고 그 주소를 공지에 붙인다 */
  봄('🔴 그림을 드라이브에 올린다 (PNG 이름으로)', 고친판.올린것.map(x => x.name), ['직보일정_고10.5B_2026-09-28.png']);
  봄('🔴 공지에 그림 주소가 붙는다', 고친판.쓴것[0].doc.image, { url: 'https://drive/x', fileId: 'f1' });

  const 그림없는판 = 판({ state: { planPost: { classId:'c1', text:'글' } }, el: '글' });
  await 그림없는판.F.planPostRun();
  봄('그림이 없으면 글만 올린다 (image 칸을 안 만든다)',
    [그림없는판.올린것.length, 'image' in 그림없는판.쓴것[0].doc], [0, false]);

  /* 🔴 그림을 못 올리면 공지도 안 낸다 — 글만 나가면 강사는 붙은 줄 안다 */
  const 못올린판 = 판({ state: { planPost: { classId:'c1', text:'글', img: 'data:image/png;base64,AAAA' } }, el: '글', 올리기흠: true });
  await 못올린판.F.planPostRun();
  봄('🔴 그림을 못 올리면 공지도 안 낸다', [못올린판.쓴것.length, 못올린판.말.some(m => m.includes('그림을 올리지 못했습니다'))], [0, true]);
  봄('제목에 반과 기간이 있다',
    고친판.쓴것[0].doc.title, '고10.5B 직보 일정 (9/28(월) ~ 10/4(일))');
  봄('공지 통에 쓴다', 고친판.쓴것[0].col, 'notices');
  봄('변경 이력에 남는다', 고친판.기록.length, 1);

  /* 🔴 저장이 됐는지 보고 말한다 — 안 보고 알리면 새로고침하면 사라진다 */
  const 흠판 = 판({ state: { planPost: { classId:'c1', text:'글', img: 'data:image/png;base64,AAAA' } }, el: '글', 저장흠: true });
  await 흠판.F.planPostRun();
  봄('🔴 저장이 막히면 «올렸다»고 안 한다', 흠판.말.some(m => m.includes('게시하지 못했습니다')), true);
  봄('🔴 그때는 올려 둔 그림도 도로 지운다 (고아 파일을 안 남긴다)', 흠판.지운것, ['f1']);
  봄('🔴 그리고 목록에서 도로 뺀다 (화면에만 남으면 안 된다)',
    알맹이(lift('planPostRun')).includes('DATA.notices.filter(n => n.id !== notice.id)'), true);

  const 빈글 = 판({ state: { planPost: { classId:'c1', text:'' } }, el: '   ' });
  await 빈글.F.planPostRun();
  봄('빈 글은 안 올린다', [빈글.쓴것.length, 빈글.말[0]], [0, '내용이 비어 있습니다.']);
}

/* ═══ ④ 파일 · 화면의 닻 ═══ */
console.log(NL + '④ 파일은 «그림» · 두 단추가 화면에 있다' + NL);
{
  const { F } = 판();
  const 파일 = 알맹이(lift('planExportClass'));
  const 그림 = 알맹이(lift('planClassCanvas'));
  const 표그림 = 알맹이(lift('planClassTableHTML'));
  /* 🔴 엑셀이 아니라 PNG 다 (2026-09-14 · 사용자가 바꿨다) */
  봄('🔴 PNG 로 내려받는다', 파일.includes("'image/png'") && 파일.includes(".png'"), true);
  봄('🔴 엑셀 길은 남지 않았다', /XLSX|xlsx/.test(파일 + 그림 + 표그림), false);
  봄('파일 이름에 반과 날짜가 들어간다', F.planFileName('c1'), '직보일정_고10.5B_2026-09-28');
  봄('🔴 날짜 줄이 없으면 그렇게 말한다', 그림.includes('날짜 줄이 없습니다'), true);
  봄('🔴 엎어지면 조용히 끝내지 않는다', 파일.includes('그림을 만들지 못했습니다'), true);
  /* 🔴 화면의 표와 같은 CSS 로 굽는다 — 두 벌이 되면 알약 색 하나만 바뀌어도 어긋난다 */
  봄('🔴 화면의 표와 같은 CSS(pl-t2)로 그린다', 표그림.includes('class="pl-t2"'), true);
  봄('🔴 날짜 줄·칸을 화면과 «같은 함수»로 그린다',
    표그림.includes('planDayHeadHTML(days)') && 표그림.includes('planRowCellsHTML(s, days, false)'), true);
  봄('머리에 반·시즌·기간이 있다', 표그림.includes('직보 일정</b>') && 표그림.includes('planDateLabel(범위.from)'), true);
  봄('🔴 그 반 학생만 (다른 반은 안 보인다)', 표그림.includes('classRoster(classId)'), true);
  봄('그리는 무대는 화면 밖에 «보이게» 둔다', 그림.includes("'pl-stage'") && 그림.includes('stage.remove()'), true);
  const 화면 = lift('teacherExamPlanHTML');
  봄('🔴 화면의 표도 같은 두 함수를 쓴다',
    화면.includes('planDayHeadHTML(days)') && 화면.includes('planRowCellsHTML(s, days, true)'), true);
  봄('🔴 날짜 줄이 위아래 스크롤에 붙도록 표 상자를 굴린다 (pl-body)', 화면.includes('class="ex-body pl-body"'), true);
  /* 공지 화면 둘에 그림이 붙는다 */
  봄('🔴 학생 공지에 그림이 붙는다', lift('stuNoticeHTML').includes('noticeImageHTML(n)'), true);
  봄('🔴 강사 공지 상세에 그림이 붙는다', lift('teacherNoticesHTML').includes('noticeImageHTML(cur)'), true);
  봄('공지를 지우면 그림도 지운다', 알맹이(lift('deleteNotice')).includes('deleteFromDrive(imgFileIdOf(gone.image))'), true);

  const 표 = lift('teacherExamPlanHTML');
  봄('🔴 반마다 두 단추가 선다',
    표.includes('planExportClass(') && 표.includes('planPostOpen('), true);
  /* 🔴 **지어 놓고 안 그리면 화면에서 통째로 사라진다** — 정의만 보는 덫은 그것을 못 잡는다
     (덫을 확인하다 드러났다: `${반내보내기}${게시판}` 을 지워도 위 줄들은 그대로 통과했다). */
  봄('🔴 그 줄과 판을 실제로 그린다', 표.includes('${반내보내기}${게시판}'), true);
  봄('«반 없음»에는 단추를 안 낸다', 표.includes("반이름들.filter(n => n !== '반 없음')"), true);
  봄('미리 보기 판을 그린다', 표.includes('id="plan-post-text"'), true);
  봄('올리기·닫기가 둘 다 있다',
    표.includes('planPostRun()') && 표.includes('planPostClose()'), true);
  봄('두 길이 왜 다른지 화면이 말한다', 표.includes('공지는 <b>학생별 한 줄</b>'), true);
  봄('미리 보기 판에 그림이 보인다', 표.includes('state.planPost.img'), true);
}

/* ═══ ⑤ 이름표 없는 퍼센트 ═══ */
console.log(NL + '⑤ 반 목록의 퍼센트 — 무엇의 수인지 말한다' + NL);
{
  const 레일 = lift('chubClassListHTML');
  /* 🔴 그 수는 시청률이 아니라 «진도»였다 — 레일은 모든 탭에서 떠 있어서
     영상 탭에서 보면 시청률로 읽혔다. */
  봄('🔴 퍼센트에 이름표가 붙었다', 레일.includes('진도 ${pr.subject ? pr.percent'), true);
  봄('🔴 맨 퍼센트가 안 남았다', /<span>\$\{pr\.subject \? pr\.percent\+'%' : '—'\}<\/span>/.test(레일), false);
  봄('무엇의 수인지 tooltip 이 자세히 말한다',
    레일.includes("pr.chapters.length + '단원 중 ' + pr.doneCount + '단원을 마쳤습니다'"), true);
  봄('과목이 없으면 어디서 정하는지 말한다', 레일.includes('반 › 진도에서 과목을 고르면'), true);
  /* ⚠ 시간도 원문이 아니라 다듬은 말이라야 «같은 반»으로 읽힌다 */
  봄('⚠ 시간도 다듬은 말을 쓴다 (반 머리와 같은 꼴)',
    레일.includes('classScheduleLabel(c)||'), true);
  봄('🔴 원문을 그대로 뿌리지 않는다', 레일.includes("escHtml(c.schedule||'일정 미정')"), false);

  /* 🔴 영상 탭의 목록은 K-7 에서 이미 «완주 n/m» 으로 바뀌었다 — 되돌아가지 않았는지 본다 */
  const 영상 = lift('chubVideoHTML');
  봄('🔴 영상 목록은 평균이 아니라 «완주 n/m» 이다', 영상.includes('<b>완주 ${d}/${roster.length}</b>'), true);
  봄('평균은 tooltip 과 이탈 머리에 남는다',
    영상.includes('반 평균 시청률 ${a}%') && 영상.includes('평균 ${avgSel}%'), true);
}

console.log(NL + (fail ? '🔴 ' + fail + '개 실패 · ' : '✓ 전부 통과 · ') + pass + '개' + NL);
process.exit(fail ? 1 : 0);
