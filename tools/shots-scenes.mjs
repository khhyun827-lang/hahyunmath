/* `tools/shots.mjs` 가 세우는 «무대» 목록 (2026-09-23).
 *
 * 무대를 더하는 것은 **여기 한 덩이**를 적는 일이다 — 프로브 파일을 새로 짓지 않는다.
 *   말   : 목록에 뜨는 한 줄
 *   폭   : 기본 폭들 (안 적으면 1280,864,390)
 *   세우기: 페이지 «안»에서 도는 함수. 씨앗은 이미 심겨 있다. state 를 놓고 render() 만 하면 된다.
 *
 * ⚠ `state`·`DATA`·`render` 는 let/function 전역이라 `window.state` 로는 안 잡힌다 —
 *   이 함수들은 페이지 안에서 «그냥» 그 이름을 부른다(page.evaluate 가 그렇게 돈다).
 */

/* 실 DB 를 끊고 흉내 자료를 심는다. 모든 무대가 이것부터 지난다. */
export function 씨앗(){
  /* ── 실 DB 0줄 ─────────────────────────────────────────── */
  window.dbSet = async () => true;
  window.dbGet = async (k, d) => d;
  window.dbSetDoc = async () => true;
  window.dbGetDoc = async (c, i, d) => d;
  window.dbDelete = async () => true;
  window.dbDeleteDoc = async () => true;
  window.logAudit = async () => {};
  window.saveRecord = async () => true;
  window.loadAllRecordsIfNeeded = () => {};
  window.uploadImageToDrive = async () => ({ url: 'https://placehold.co/600x400/png', fileId: 'fake' });
  window.deleteFromDrive = () => {};

  const 오늘 = todayStr();
  const 날 = k => shiftYmd(오늘, k);
  const 이름 = ['김민아','박서준','이도윤','최지우','정하은','강현우','윤서아','임준서','한지민','오예준'];
  const PIC = 'https://placehold.co/600x400/png';

  DATA.classes = [{ id:'c1', name:'고1 프로브반', schedule:'월,수,금 19시~21시',
                    period:'26.03~26.12', status:'진행중', kind:'정규' },
                  { id:'c2', name:'고2 특강', schedule:'토 14시~17시',
                    period:'26.09~26.12', status:'진행중', kind:'특강' }];
  DATA.students = 이름.map((nm, i) => ({ studentId:'s'+i, name:nm, classId:'c1',
    school: i % 2 ? '광남고' : '대원고', grade:'1', phone: i % 3 ? '010-1234-00'+i : '' }));

  DATA.videos = [
    { id:'v1', classId:'c1', title:'수학(상) 4강 — 인수분해 공식 세 개', unit:'다항식',
      url:'https://youtu.be/dQw4w9WgXcQ', dueDate:날(2) },
    { id:'v2', classId:'c1', title:'수학(상) 3강 — 나머지정리', unit:'다항식',
      url:'https://youtu.be/9bZkp7q19f0', dueDate:날(-2), fromSec:750, toSec:1080 },
    { id:'v3', classId:'', title:'복소수 개념 정리 (복습)', unit:'복소수',
      url:'https://youtu.be/kJQP7kiw5Fk', noTrack:true },
    { id:'v4', classId:'c1', title:'수학(상) 2강 — 곱셈공식과 인수분해', unit:'다항식',
      url:'https://youtu.be/3JZ_D3ELwOQ', dueDate:날(12) },
    { id:'p1', studentId:'s1', title:'9/15 결석 보충 — 4강', url:'https://youtu.be/dQw4w9WgXcQ', dueDate:날(1) },
    { id:'p2', studentId:'s4', title:'9/15 결석 보충 — 4강', url:'https://youtu.be/dQw4w9WgXcQ', dueDate:날(1) },
  ];
  DATA.assignments = [
    { id:'h1', classId:'c1', title:'쎈 p.30~44 유형 3~5', dueDate:날(1), date:날(-2) },
    { id:'h2', classId:'c1', title:'개념원리 p.51~60', dueDate:날(-1), date:날(-4) },
  ];
  DATA.qnas = [
    { id:'qn1', uid:'u1', studentId:'s0', studentName:'김민아', date:날(-1),
      question:'3번 문제 풀이가 이해가 안 돼요. 왜 여기서 부호가 바뀌나요?',
      image:{url:PIC,fileId:'f1'}, images:[{url:PIC,fileId:'f1'},{url:PIC,fileId:'f2'},{url:PIC,fileId:'f3'}],
      answer:'이 줄에서 양변에 −1을 곱했기 때문입니다.',
      answerImage:{url:PIC,fileId:'g1'}, answerImages:[{url:PIC,fileId:'g1'},{url:PIC,fileId:'g2'}], answeredAt:오늘 },
    { id:'qn2', uid:'u1', studentId:'s3', studentName:'최지우', date:날(-3),
      question:'옛 질문 — 사진 한 장짜리(옛 꼴이 그대로 읽히는지 본다)',
      image:{url:PIC,fileId:'z1'}, answer:null, answerImage:null, answeredAt:null },
  ];
  DATA.notices = []; DATA.exams = []; DATA.clinics = []; DATA.materials = {};
  if(window.splitQnaFollowups) splitQnaFollowups();

  /* 시청 기록 — 학생마다 다르게(이탈 분포가 한 칸에 몰리지 않게) */
  const 비율 = { v1:[1,.95,.62,.3,0,.88,.15,1,.45,0], v2:[1,1,.8,1,.5,1,0,1,1,.2],
                 v3:[.3,0,0,1,0,0,0,.5,0,0], v4:[1,1,1,1,1,1,.9,1,1,.7],
                 p1:[0,.4], p2:[0,0,0,0,1] };
  state.allRecords = {};
  DATA.students.forEach((s, i) => {
    const vp = {};
    Object.keys(비율).forEach(vid => { const r = 비율[vid][i]; if(r === undefined) return;
      vp[vid] = { videoId:vid, duration:1200, watchedSeconds: Math.round(1200 * r) }; });
    const rec = { videoProgress: vp, attendance: [], homework: {} };
    state.allRecords[s.studentId] = rec;
    DATA.records[s.studentId] = rec;
    if(window.recordLoaded) recordLoaded.set(s.studentId, rec);
  });
  state.allRecordsLoaded = true; state.allRecordsLoading = false;
  /* 「지금 자료를 불러오지 못하고 있습니다」 붉은 띠를 재운다 — 그림에서 자리만 먹는다 */
  if(window.dbReadTrouble) window.dbReadTrouble = () => false;
}

const 강사 = () => { state.currentUser = { type:'teacher', name:'김하현T' }; state.view = 'teacher'; };
const 학생 = (sid) => { state.currentUser = { type:'student', studentId: sid || 's0', name:'김민아' }; state.view = 'student'; };

export const 무대들 = {
  영상탭: { 말: '반 관리 › 영상 (목록)',
    세우기: () => { state.currentUser = { type:'teacher', name:'김하현T' }; state.view = 'teacher';
      state.teacherTab = 'classhub'; state.classHubTab = 'video'; state.classHubId = 'c1';
      state.videoOpenId = null; render(); } },
  영상상세: { 말: '반 관리 › 영상 (드로어를 연 채)',
    세우기: () => { state.currentUser = { type:'teacher', name:'김하현T' }; state.view = 'teacher';
      state.teacherTab = 'classhub'; state.classHubTab = 'video'; state.classHubId = 'c1';
      state.videoSelectedId = 'v1'; state.videoOpenId = 'v1'; render(); } },
  질의응답: { 말: '소통 › 질의응답 (강사 · 사진 여러 장)',
    세우기: () => { state.currentUser = { type:'teacher', name:'김하현T' }; state.view = 'teacher';
      state.teacherTab = 'qna'; state.qnaSelectedId = 'qn1'; state.qnaFilter = 'all'; render(); } },
  학생질문: { 말: '학생 › 소통 › 질의응답',
    폭: '430,390,360',
    세우기: () => { state.currentUser = { type:'student', studentId:'s0', name:'김민아' };
      state.view = 'student'; state.studentTab = 'qna'; state.stuQnaWriting = false; render(); } },
  학생강의: { 말: '학생 › 학습 › 강의 (목록만 — 영상은 안 튼다)',
    폭: '430,390,360',
    세우기: () => { state.currentUser = { type:'student', studentId:'s0', name:'김민아' };
      state.view = 'student'; state.studentTab = 'video'; state.stuVideoId = null; render(); } },
  과제표: { 말: '반 관리 › 과제 (격자)',
    세우기: () => { state.currentUser = { type:'teacher', name:'김하현T' }; state.view = 'teacher';
      state.teacherTab = 'classhub'; state.classHubTab = 'homework'; state.classHubId = 'c1'; render(); } },
};
void 강사; void 학생;
