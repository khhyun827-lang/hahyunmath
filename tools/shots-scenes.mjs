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
  /* 🔴 **바깥 망에 기대지 않는다** — placehold.co 가 느리면 사진이 2×2 로 찌그러져
     «내가 고쳐서 깨진 것»처럼 보인다(2026-09-23에 실제로 헷갈렸다). 그림을 글자로 들고 있는다. */
  const PIC = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='400'><rect width='600' height='400' fill='%23e3e0d9'/><text x='300' y='215' font-family='sans-serif' font-size='44' fill='%238d8a82' text-anchor='middle'>600 x 400</text></svg>";

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
  DATA.notices = [
    { id:101, date:날(-1), title:'추석 연휴 휴강 안내', classIds:[],
      content:'# 휴강 일정\n\n**9월 28일(월)부터 10월 1일(목)**까지 휴강합니다.\n- 보강은 10월 첫 주 토요일\n- 과제는 그대로 제출' },
    { id:102, date:날(-6), title:'2학기 중간고사 대비 특강', classIds:['c1'],
      content:'고1 프로브반 대상 — 토요일 오후 2시부터 세 시간씩 진행합니다.' },
  ];
  DATA.exams = []; DATA.materials = {};
  /* 클리닉 — 이번 주 판에 시간대가 서고, 승인 대기(직접 제안)가 하나 있게 */
  const 주 = clinicWeekStart(오늘), 주날 = k => shiftYmd(주, k);
  DATA.clinicSlots = [
    { id:'sl1', date:주날(1), time:'18:00', capacity:3 }, { id:'sl2', date:주날(1), time:'19:00', capacity:3 },
    { id:'sl3', date:주날(3), time:'19:00', capacity:2 }, { id:'sl4', date:주날(5), time:'14:00', capacity:4 },
  ];
  DATA.clinics = [
    { id:'cl1', studentId:'s0', name:'김민아', day:주날(1), slotId:'sl1', status:'승인', topic:'이차방정식' },
    { id:'cl2', studentId:'s2', name:'이도윤', day:주날(3), slotId:'sl3', status:'승인', topic:'' },
    { id:'cl3', studentId:'s5', name:'강현우', day:주날(3), slotId:'sl3', status:'승인', topic:'' },
    { id:'cl4', studentId:'s7', name:'임준서', day:주날(4), time:'20:30', status:'대기',
      topic:'나머지정리 질문', requestedAt:오늘 },
  ];
  DATA.chats = { s0: [
    { from:'student', text:'선생님 오늘 클리닉 몇 시까지 하나요?', at:오늘 + ' 17:02' },
    { from:'teacher', text:'9시까지 있어요. 편할 때 오세요.', at:오늘 + ' 17:10' } ] };
  window.loadAllChatsIfNeeded = () => {};
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
  공지: { 말: '소통 › 공지 (강사)',
    세우기: () => { state.currentUser = { type:'teacher', name:'김하현T' }; state.view = 'teacher'; state.teacherTab = 'notices'; state.noticeSelectedId = '101';
      state.noticeWriting = false; render(); } },
  클리닉: { 말: '소통 › 클리닉 (주간 판 · 승인 대기 1)',
    세우기: () => { state.currentUser = { type:'teacher', name:'김하현T' }; state.view = 'teacher'; state.teacherTab = 'clinic'; state.clinicWeek = ''; state.clinicPanel = ''; render(); } },
  설정알림: { 말: '설정 › 알림 (폰 알림 켜기)',
    세우기: () => { state.currentUser = { type:'teacher', name:'김하현T' }; state.view = 'teacher'; state.teacherTab = 'settings'; state.settingsSubTab = 'push'; state.studentDetailId = null; render(); } },
  시험일정: { 말: '설정 › 시험 일정 (표 · 학교 프린트)',
    세우기: () => { state.currentUser = { type:'teacher', name:'김하현T' }; state.view = 'teacher';
      state.teacherTab = 'examrange'; state.studentDetailId = null;
      DATA.classes[0].progress = { subject: '공통수학1' }; DATA.classes[1].progress = { subject: '확률과통계' };
      DATA.students.forEach((s, i) => { s.school = ['대원고등학교', '광남고', '경기여자고등학교'][i % 3]; s.grade = i < 7 ? '1' : '2';
        if(i >= 7) s.classId = 'c2'; });
      const 날 = k => shiftYmd(todayStr(), k);
      state.examHistory = { items: [] };
      state.examRanges = { dates: { '대원고등학교': { '1': { start: 날(8), end: 날(12), math: 날(9) } },
                                    '광남고': { '1': { start: 날(15), end: 날(19), math: 날(17) }, '2': { start: 날(15), end: 날(19), math: 날(18) } } } };
      state.schoolBooks = { '대원고등학교': { '1': '미래엔 / 학교프린트' } };
      state.schoolFiles = { '대원고등학교': { '1': [
          { name: '2학기 중간 대비 프린트 1회.pdf', fileId: 'f1', mime: 'application/pdf', size: 820000, at: 날(-3), season: '2026 · 2학기 중간' },
          { name: '서술형 모음.pdf', fileId: 'f2', mime: 'application/pdf', size: 310000, at: 날(-1), season: '2026 · 2학기 중간' } ] },
        '광남고': { '2': [ { name: '광남 2학년 기출.pdf', fileId: 'f3', mime: 'application/pdf', size: 1500000, at: 날(-2), season: '2026 · 2학기 중간' } ] } };
      render(); } },
  /* 등급컷 갈래 (2026-10-02) — 시험 일정 표에서 떼어 냈다. 한 줄은 거꾸로 적어 경고 배지를 본다. */
  등급컷: { 말: '설정 › 시험 일정 › 등급컷',
    세우기: () => { state.currentUser = { type:'teacher', name:'김하현T' }; state.view = 'teacher';
      state.teacherTab = 'gradecut'; state.studentDetailId = null;
      DATA.classes[0].progress = { subject: '공통수학1' }; DATA.classes[1].progress = { subject: '확률과통계' };
      DATA.students.forEach((s, i) => { s.school = ['대원고등학교', '광남고', '경기여자고등학교'][i % 3]; s.grade = i < 7 ? '1' : '2';
        if(i >= 7) s.classId = 'c2'; });
      const 날 = k => shiftYmd(todayStr(), k);
      state.examHistory = { items: [] };
      state.examRanges = { dates: { '대원고등학교': { '1': { start: 날(8), end: 날(12), math: 날(9) } } } };
      state.gradeCuts = { byKey: { [curSeasonKey()]: {
        '대원고등학교': { '1': { '공통수학1': { c1:90, c2:81, c3:72, c4:63 } } },
        '광남고': { '1': { '공통수학1': { c1:85, c2:88 } } } } } };
      render(); } },
  /* 직보 일정표 «전체» 그림을 실제로 구워 화면에 붙인다 — html2canvas 결과를 눈으로 본다 (2026-09-27). */
  직보일정표: { 말: '설정 › 직보 일정표 (화면)', 폭: '864',
    세우기: () => { state.currentUser = { type:'teacher', name:'김하현T' }; state.view = 'teacher';
      DATA.students.forEach((s, i) => { if(i >= 6) s.classId = 'c2'; });
      const 날 = k => shiftYmd(todayStr(), k);
      planSetRange(날(-4), 날(9));
      /* 2026-10-03 — 수학이 이미 끝난 학교(대원)와 아직인 학교(광남) — 둘 다 그 시험 색이 칠해져야 한다 */
      const 해 = schoolYearOf(todayStr()), 학년 = DATA.students[0].grade || '';
      DATA.students.forEach(s => { s.grade = 학년; });
      state.examRanges = { migrated: true, years: { [해]: {
        '대원고': { [학년]: { '2-mid': { start: 날(-3), end: 날(2), math: 날(-1) } } },
        '광남고': { [학년]: { '2-mid': { start: 날(3), end: 날(7), math: 날(5) } } } } } };
      state.teacherTab = 'examplan'; render();
    } },
  직보일정표수정: { 말: '설정 › 직보 일정표 («수정»을 누른 뒤)', 폭: '864',
    세우기: () => { state.currentUser = { type:'teacher', name:'김하현T' }; state.view = 'teacher';
      DATA.students.forEach((s, i) => { if(i >= 6) s.classId = 'c2'; });
      const 날 = k => shiftYmd(todayStr(), k);
      planSetRange(날(1), 날(14));
      state.teacherTab = 'examplan';
      state.planEdit = true; render();
    } },
  홈달력: { 말: '강사 홈 — 달력 (수업·휴강·직보·시험·클리닉·상담)', 폭: '1280,864,390',
    세우기: () => { state.currentUser = { type:'teacher', name:'김하현T' }; state.view = 'teacher';
      const 날 = k => shiftYmd(todayStr(), k);
      DATA.students.forEach((s, i) => { if(i >= 6) s.classId = 'c2'; });
      state.examRanges = { dates: { '광남고': { '1': { start: 날(6), end: 날(10), math: 날(8) } },
                                    '대원고': { '1': { start: 날(9), end: 날(13), math: 날(12) } } } };
      DATA.students.forEach((s, i) => { if(i % 2) planSetCell(s.studentId, 날(7), 'jikbo', '2시'); });
      ['s0', 's4'].forEach(id => planSetCell(id, 날(3), 'consult'));
      state.offDays = { days: [{ date: 날(2), classIds: ['c1'], label: '학원 행사' }] };
      state.allRecordsLoaded = true; state.teacherTab = 'dash'; state.tCalDay = 날(7); state.tCalMonth = 날(7).slice(0, 7); render();
    } },
  /* 문항 창고 — 그림 한 장 문항(목록 카드) + 코드 화면(오른쪽 판: 원본·변형 그림) (2026-10-02) — 장부는 배포의 codes/*.json 을 그대로 읽는다 */
  창고그림: { 말: '문항관리 › 문항 창고 (그림 있는 문항 · 코드 화면 열림)', 폭: '1440',
    세우기: async () => { state.currentUser = { type:'teacher', name:'김하현T' }; state.view = 'teacher';
      const 장면 = (k) => ({ kind:'graph', curves:[{ expr:'-(x-1)*(x-' + k + ')', label:'y=f(x)', labelAt:k + 0.4 }, { expr:'x-1', label:'y=g(x)', labelAt:k + 0.6 }],
        points:[{ x:1, curve:0, dot:true, label:'A', labelPos:'below' }, { x:k - 1, curve:1, dot:true, dropTo:'axis', label:'B', labelPos:'above' }],
        xTicks:[1, k - 1, k], axis:{ xLabel:'x', yLabel:'y', origin:'O' } });
      const 사진 = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(Figure.renderScene(장면(4)).replace('<svg ', '<svg style="background:#fff" '));
      state.teacherTab = 'unitbank'; render();
      await loadItemLedgerIfNeeded();
      const code = Object.keys(state.itemByCode).find(c => /^K2-02-/.test(c) && !/-N\d+$/.test(c)) || Object.keys(state.itemByCode)[0];
      state.itemBody = { [code]: { code, answer:'③', image:{ url: 사진 },
        content:'그림과 같이 이차함수 y = −(x−1)(x−4) 의 그래프와 직선 y = x − 1 이 두 점 A, B 에서 만난다. 삼각형 OAB 의 넓이는?\n① 1  ② 3/2  ③ 2  ④ 5/2  ⑤ 3' } };
      state.variants = { [code]: [{ code: code + '-N01', originCode: code, pending:false, needsFigure:true, answer:'④',
        image:{ kind:'svg', svg: Figure.renderScene(장면(5)), scene: 장면(5) },
        content:'그림과 같이 이차함수 y = −(x−1)(x−5) 의 그래프와 직선 y = x − 1 이 두 점 A, B 에서 만난다. 점 B 에서 x축에 내린 수선의 발을 H 라 할 때, 삼각형 ABH 의 넓이는?\n① 3  ② 7/2  ③ 4  ④ 9/2  ⑤ 5' }] };
      state.storeSubject = 'K2'; state.storeChapter = '02'; state.storeFind = code; state.icOpen = code; render();
    } },
  /* 시험지 한 장 — 원본·변형 그림이 문항 본문 안에 (2026-10-02) */
  시험지그림: { 말: '문항관리 › 시험지 (그림 있는 문항)', 폭: '1440,864',
    세우기: () => { state.currentUser = { type:'teacher', name:'김하현T' }; state.view = 'teacher';
      const 장면 = (k) => ({ kind:'graph', curves:[{ expr:'-(x-1)*(x-' + k + ')', label:'y=f(x)', labelAt:k + 0.4 }, { expr:'x-1', label:'y=g(x)', labelAt:k + 0.6 }],
        points:[{ x:1, curve:0, dot:true, label:'A', labelPos:'below' }, { x:k - 1, curve:1, dot:true, dropTo:'axis', label:'B', labelPos:'above' }],
        xTicks:[1, k - 1, k], axis:{ xLabel:'x', yLabel:'y', origin:'O' } });
      const 사진 = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(Figure.renderScene(장면(4)).replace('<svg ', '<svg style="background:#fff" '));
      DATA.problemBank = [{ id:'pbF1', examId:'ex1', questionNo:7, status:'pending', itemCode:'K2-02-E-0139', hasImage:true,
        content:'그림과 같이 이차함수 y = −(x−1)(x−4) 의 그래프와 직선 y = x − 1 이 두 점 A, B 에서 만난다. 삼각형 OAB 의 넓이는?\n① 1  ② 3/2  ③ 2  ④ 5/2  ⑤ 3', answer:'③',
        variantContent:'그림과 같이 이차함수 y = −(x−1)(x−5) 의 그래프와 직선 y = x − 1 이 두 점 A, B 에서 만난다. 점 B 에서 x축에 내린 수선의 발을 H 라 할 때, 삼각형 ABH 의 넓이는?\n① 3  ② 7/2  ③ 4  ④ 9/2  ⑤ 5',
        variantAnswer:'④', variantNeedsFigure:true, hasVariantImage:true, variantFigureSpec:'이차함수와 직선, 교점 A·B, B 에서 x축으로 점선' }];
      state.pbImageCache = { pbF1: { url: 사진 }, 'v:pbF1': { kind:'svg', svg: Figure.renderScene(장면(5)), scene: 장면(5) } };
      state.variants = { K2: [] }; state.reviewQuotaUsed = 23; state.aiQuotaUsed = 7;
      state.teacherTab = 'review'; state.reviewQueue = 'pending'; state.reviewSelectedId = 'pbF1'; state.reviewVariantCode = ''; 
      DATA.exams = [{ id:'ex1', title:'2학기 중간 대비', classId:'c1', date: todayStr(), hasFiles:false,
        questions:[{ no:7, content: DATA.problemBank[0].content, answer:'③', chapter:'이차함수' }] }];
      state.teacherTab = 'exams'; state.examGroupId = 'ex1'; state.examSelectedId = ''; render();
    } },
  /* 교재(시험지) 문항의 검토 — 원본 사진 + 변형 SVG 가 본문 안에 (2026-10-02 · 자동 변형 검토와 같은 꼴) */
  검토교재그림: { 말: '문항관리 › 검토 대기 (시험지 문항 · 원본 사진 · 변형 그림)', 폭: '1440,864',
    세우기: () => { state.currentUser = { type:'teacher', name:'김하현T' }; state.view = 'teacher';
      const 장면 = (k) => ({ kind:'graph', curves:[{ expr:'-(x-1)*(x-' + k + ')', label:'y=f(x)', labelAt:k + 0.4 }, { expr:'x-1', label:'y=g(x)', labelAt:k + 0.6 }],
        points:[{ x:1, curve:0, dot:true, label:'A', labelPos:'below' }, { x:k - 1, curve:1, dot:true, dropTo:'axis', label:'B', labelPos:'above' }],
        xTicks:[1, k - 1, k], axis:{ xLabel:'x', yLabel:'y', origin:'O' } });
      const 사진 = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(Figure.renderScene(장면(4)).replace('<svg ', '<svg style="background:#fff" '));
      DATA.problemBank = [{ id:'pbF1', examId:'ex1', questionNo:7, status:'pending', itemCode:'K2-02-E-0139', hasImage:true,
        content:'그림과 같이 이차함수 y = −(x−1)(x−4) 의 그래프와 직선 y = x − 1 이 두 점 A, B 에서 만난다. 삼각형 OAB 의 넓이는?\n① 1  ② 3/2  ③ 2  ④ 5/2  ⑤ 3', answer:'③',
        variantContent:'그림과 같이 이차함수 y = −(x−1)(x−5) 의 그래프와 직선 y = x − 1 이 두 점 A, B 에서 만난다. 점 B 에서 x축에 내린 수선의 발을 H 라 할 때, 삼각형 ABH 의 넓이는?\n① 3  ② 7/2  ③ 4  ④ 9/2  ⑤ 5',
        variantAnswer:'④', variantNeedsFigure:true, hasVariantImage:true, variantFigureSpec:'이차함수와 직선, 교점 A·B, B 에서 x축으로 점선' }];
      state.pbImageCache = { pbF1: { url: 사진 }, 'v:pbF1': { kind:'svg', svg: Figure.renderScene(장면(5)), scene: 장면(5) } };
      state.variants = { K2: [] }; state.reviewQuotaUsed = 23; state.aiQuotaUsed = 7;
      state.teacherTab = 'review'; state.reviewQueue = 'pending'; state.reviewSelectedId = 'pbF1'; state.reviewVariantCode = ''; render();
    } },
  /* 그림 있는 변형 (2026-10-02 · 사용자 — 「그림이 엄청 크게 그려져 문제와 같이 읽기 어렵다」) — 원본 사진 · 변형 SVG(figure.js 가 실제로 그린다) */
  검토그림: { 말: '문항관리 › 검토 (그림을 새로 그린 변형 — 그림이 본문 안 · 교재 크기)', 폭: '1440,864,390',
    세우기: () => { state.currentUser = { type:'teacher', name:'김하현T' }; state.view = 'teacher';
      const 장면 = { kind:'graph', curves:[{ expr:'-(x-1)*(x-5)', label:'y=f(x)', labelAt:5.4 }, { expr:'x-1', label:'y=g(x)', labelAt:5.6 }],
        points:[{ x:1, curve:0, dot:true, label:'A', labelPos:'below' }, { x:4, curve:1, dot:true, dropTo:'axis', label:'B', labelPos:'above' }],
        xTicks:[1, 4, 5], axis:{ xLabel:'x', yLabel:'y', origin:'O' } };
      /* 원본 그림은 사진(드라이브 주소)으로 온다 — 무대에서는 같은 크기의 그림을 data 주소로 흉내 낸다(밖으로 안 나간다) */
      const 원본장면 = { kind:'graph', curves:[{ expr:'-(x-1)*(x-4)', label:'y=f(x)', labelAt:4.4 }, { expr:'x-1', label:'y=g(x)', labelAt:4.6 }],
        points:[{ x:1, curve:0, dot:true, label:'A', labelPos:'below' }, { x:3, curve:1, dot:true, label:'B', labelPos:'above' }],
        xTicks:[1, 3, 4], axis:{ xLabel:'x', yLabel:'y', origin:'O' } };
      const 원본사진 = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(Figure.renderScene(원본장면).replace('<svg ', '<svg style="background:#fff" '));
      state.itemBody = { 'K2-02-E-0139': { code:'K2-02-E-0139', answer:'③', image:{ url: 원본사진 },
        content:'그림과 같이 이차함수 y = −(x−1)(x−4) 의 그래프와 직선 y = x − 1 이 두 점 A, B 에서 만난다. 삼각형 OAB 의 넓이는? (단, O 는 원점이다.)\n① 1  ② 3/2  ③ 2  ④ 5/2  ⑤ 3' } };
      state.variants = { K2: [{ code:'K2-02-E-0139-N01', originCode:'K2-02-E-0139', pending:true, engine:'gemini', createdAt:'2026-10-02',
        needsFigure:true, figureSpec:'이차함수 y=−(x−1)(x−5) 와 직선 y=x−1, 두 교점 A(1,0)·B(4,3) 표시, B 에서 x축으로 점선',
        image:{ kind:'svg', svg: Figure.renderScene(장면), scene: 장면 },
        content:'그림과 같이 이차함수 y = −(x−1)(x−5) 의 그래프와 직선 y = x − 1 이 두 점 A, B 에서 만난다. 점 B 에서 x축에 내린 수선의 발을 H 라 할 때, 삼각형 ABH 의 넓이는?\n① 3  ② 7/2  ③ 4  ④ 9/2  ⑤ 5',
        answer:'④', aiReview:{ verdict:'agree', answer:'④' } }] };
      state.reviewQuotaUsed = 23; state.aiQuotaUsed = 7;
      state.teacherTab = 'review'; state.reviewQueue = 'pending'; state.reviewVariantCode = 'K2-02-E-0139-N01'; render();
    } },
  검토: { 말: '문항관리 › 검토 (AI 변형 넷 — 같은 답 둘 · 그림 있는 같은 답 하나 · 답 다름 하나)', 폭: '1440,864',
    세우기: () => { state.currentUser = { type:'teacher', name:'김하현T' }; state.view = 'teacher';
      const 원본 = (code, content, answer, image) => ({ code, content, answer, image });
      state.itemBody = {
        'K2-05-E-0559': 원본('K2-05-E-0559', '전체집합 U = {1, 2, 3, 4, 5}의 두 부분집합 A, B에 대하여 A ∩ B = {3}, A ∪ B = {1, 3, 4, 5}일 때, 집합 A의 개수는?\n① 4  ② 6  ③ 8  ④ 10  ⑤ 12', '③'),
        'K2-03-M-0210': 원본('K2-03-M-0210', '다항식 x³ − 2x + 1을 x − 1로 나눈 나머지는?\n① −1  ② 0  ③ 1  ④ 2  ⑤ 3', '②'),
        'K2-04-M-0317': 원본('K2-04-M-0317', '그림과 같이 … 넓이를 구하시오.', '12', { url: 'https://placehold.co/300x200/png' }),
        'K2-02-H-0149': 원본('K2-02-H-0149', 'x에 대한 항등식 a(x−1) + b(x+1) = 2x + 4 에서 a + b 의 값은?\n① 1  ② 2  ③ 3  ④ 4  ⑤ 5', '②')
      };
      const v = (code, originCode, content, answer, verdict, aiAns) => ({ code, originCode, content, answer, pending: true, engine: 'gemini',
        createdAt: '2026-10-01', aiReview: verdict ? { verdict, answer: aiAns } : null });
      state.variants = { K2: [
        v('K2-05-E-0560', 'K2-05-E-0559', '전체집합 U = {1, 2, 3, 4, 5, 6}의 두 부분집합 A, B에 대하여 A ∩ B = {3}, A ∪ B = {1, 3, 4, 5, 6}일 때, 집합 A의 개수는?\n① 8  ② 12  ③ 16  ④ 20  ⑤ 24', '②', 'suspect', '③'),
        v('K2-03-M-0211', 'K2-03-M-0210', '다항식 x³ − 3x + 2를 x − 1로 나눈 나머지는?\n① −1  ② 0  ③ 1  ④ 2  ⑤ 3', '②', 'agree', '②'),
        v('K2-04-M-0318', 'K2-04-M-0317', '그림과 같이 … 넓이를 구하시오.', '18', 'agree', '18'),
        v('K2-02-H-0150', 'K2-02-H-0149', 'x에 대한 항등식 a(x−1) + b(x+1) = 4x + 2 에서 a + b 의 값은?\n① 1  ② 2  ③ 3  ④ 4  ⑤ 5', '④', 'agree', '④')
      ] };
      state.reviewQuotaUsed = 23; state.aiQuotaUsed = 7;
      state.teacherTab = 'review'; state.reviewQueue = 'pending'; state.reviewVariantCode = 'K2-05-E-0560'; render();
    } },
  홈메모: { 말: '강사 홈 — 메모 (할 일 셋 · 하나 끝 · 글 메모)', 폭: '1280,864,390',
    세우기: () => { state.currentUser = { type:'teacher', name:'김하현T' }; state.view = 'teacher';
      state.memo = { todos: [{ t: '광남고 프린트 출력', done: false }, { t: '3반 단원평가 채점', done: true },
        { t: '민수 어머님께 다음 주 결석 확인 전화 — 금요일 전에', done: false }],
        note: '2반 진도 한 차시 밀림 — 다음 시간 30분 당겨서.\n대원고 범위 공지 아직.' };
      state.allRecordsLoaded = true; state.teacherTab = 'dash'; render();
    } },
  수업직보: { 말: '수업 (오늘 직보 — 광남고 2시 · 대원고 5시)',
    세우기: () => { state.currentUser = { type:'teacher', name:'김하현T' }; state.view = 'teacher';
      DATA.students.forEach((s, i) => { if(i >= 6) s.classId = 'c2'; });
      const 오늘 = todayStr();
      DATA.students.forEach((s, i) => { if(i % 2) planSetCell(s.studentId, 오늘, 'jikbo', '2시'); });
      ['s0', 's2'].forEach(id => planSetCell(id, 오늘, 'jikbo', '5시'));
      state.allRecordsLoaded = true;
      state.teacherTab = 'session'; state.sessionDate = null;
      state.sessionClassId = 'jikbo:' + 오늘 + ':' + encodeURIComponent('광남고'); render();
    } },
  직보전체그림: { 말: '설정 › 직보 일정표 › 전체 그림 (구운 PNG)', 폭: '864',
    세우기: async () => { state.currentUser = { type:'teacher', name:'김하현T' }; state.view = 'teacher';
      DATA.students.forEach((s, i) => { if(i >= 6) s.classId = 'c2'; });
      const 날 = k => shiftYmd(todayStr(), k);
      planSetRange(날(1), 날(14));
      state.teacherTab = 'examplan'; render();
      const cv = await planClassCanvas('');
      const img = document.createElement('img'); const 뜸 = new Promise(r => img.onload = r); img.src = cv.toDataURL('image/png');
      img.style.cssText = 'width:100%;border:2px solid red;display:block;';
      const box = document.createElement('div');   // 앱은 그대로 두고 위에 덮는다(지우면 render 가 넘어진다)
      box.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#fff;overflow:auto;';
      box.appendChild(img); document.body.appendChild(box);
      await 뜸; } },
  채팅: { 말: '소통 › 채팅 (강사)',
    세우기: () => { state.currentUser = { type:'teacher', name:'김하현T' }; state.view = 'teacher'; state.teacherTab = 'chat'; state.teacherSelectedStudent = 's0'; render(); } },
  학생질문: { 말: '학생 › 소통 › 질의응답',
    폭: '430,390,360',
    세우기: () => { state.currentUser = { type:'student', studentId:'s0', name:'김민아' };
      state.view = 'student'; state.studentTab = 'qna'; state.stuQnaWriting = false; render(); } },
  학생강의: { 말: '학생 › 학습 › 강의 (목록만 — 영상은 안 튼다)',
    폭: '430,390,360',
    세우기: () => { state.currentUser = { type:'student', studentId:'s0', name:'김민아' };
      state.view = 'student'; state.studentTab = 'video'; state.stuVideoId = null; render(); } },
  학생홈: { 말: '학생 › 홈 (대시보드)', 폭: '430,390,360',
    세우기: () => { state.currentUser = { type:'student', studentId:'s0', name:'김민아' };
      state.view = 'student'; state.studentTab = 'home'; render(); } },
  학생과제: { 말: '학생 › 학습 › 진도·과제', 폭: '430,390,360',
    세우기: () => { state.currentUser = { type:'student', studentId:'s0', name:'김민아' };
      state.view = 'student'; state.studentTab = 'progress'; render(); } },
  /* 반이 여럿일 때 «반 고르기»가 어떻게 서나 — 수업·반 두 탭을 나란히 본다 (2026-09-27). */
  수업반여럿: { 말: '수업 (반 여섯 · 오늘 요일에 전부 수업)',
    세우기: () => { const 요일 = '일월화수목금토'[new Date().getDay()];
      DATA.classes = ['고1 프로브반','고2 특강','명덕여고 2차시','광남고 1-1','대원고 내신','중3 선행']
        .map((name, i) => ({ id:'c'+(i+1), name, schedule: 요일 + ' ' + (14+i) + '시~' + (16+i) + '시',
          period:'26.03~26.12', status:'진행중', kind:'정규' }));
      state.currentUser = { type:'teacher', name:'김하현T' }; state.view = 'teacher';
      state.teacherTab = 'session'; state.sessionDate = null; render(); } },
  반여럿: { 말: '반 관리 › 출결 (반 여섯)',
    세우기: () => { const 요일 = '일월화수목금토'[new Date().getDay()];
      DATA.classes = ['고1 프로브반','고2 특강','명덕여고 2차시','광남고 1-1','대원고 내신','중3 선행']
        .map((name, i) => ({ id:'c'+(i+1), name, schedule: 요일 + ' ' + (14+i) + '시~' + (16+i) + '시',
          period:'26.03~26.12', status:'진행중', kind:'정규' }));
      state.currentUser = { type:'teacher', name:'김하현T' }; state.view = 'teacher';
      state.teacherTab = 'classhub'; state.classHubTab = 'sessions'; state.classHubId = 'c1'; render(); } },
  /* 수업 › 과제 검사 (2026-10-02 · 사용자 — 「과제 검사 탭도 버튼들 이상해졌어」 — 제출·보완 필요·미제출 글자가 세로로 꺾였다) */
  수업과제검사: { 말: '수업 › 과제 검사 (오늘 마감 과제 · 학생 열)',
    세우기: () => { const 요일 = '일월화수목금토'[new Date().getDay()];
      DATA.classes = ['고1 프로브반','고2 특강'].map((name, i) => ({ id:'c'+(i+1), name, schedule: 요일 + ' ' + (14+i) + '시~' + (16+i) + '시',
        period:'26.03~26.12', status:'진행중', kind:'정규' }));
      DATA.assignments.push({ id:'aHW1', classId:'c1', title:'개념원리 p.30~41', dueDate: todayStr(), createdAt: shiftYmd(todayStr(), -3) });
      state.currentUser = { type:'teacher', name:'김하현T' }; state.view = 'teacher';
      state.allRecordsLoaded = true; state.teacherTab = 'session'; state.sessionClassId = 'c1'; state.sessionStep = 'hwcheck'; render(); } },
  반여럿펼침: { 말: '반 관리 › 출결 (반 여섯 · 반 고르기를 펼친 채)',
    세우기: () => { const 요일 = '일월화수목금토'[new Date().getDay()];
      DATA.classes = ['고1 프로브반','고2 특강','명덕여고 2차시','광남고 1-1','대원고 내신','중3 선행']
        .map((name, i) => ({ id:'c'+(i+1), name, schedule: 요일 + ' ' + (14+i) + '시~' + (16+i) + '시',
          period:'26.03~26.12', status:'진행중', kind:'정규' }));
      state.currentUser = { type:'teacher', name:'김하현T' }; state.view = 'teacher';
      state.teacherTab = 'classhub'; state.classHubTab = 'sessions'; state.classHubId = 'c1'; state.clsPickOpen = true; render(); } },
  과제표: { 말: '반 관리 › 과제 (격자)',
    세우기: () => { state.currentUser = { type:'teacher', name:'김하현T' }; state.view = 'teacher';
      state.teacherTab = 'classhub'; state.classHubTab = 'homework'; state.classHubId = 'c1'; render(); } },
  학생명단: { 말: '반 관리 › 학생 (명단 표)', 폭: '1536,1280',
    세우기: () => { state.currentUser = { type:'teacher', name:'김하현T' }; state.view = 'teacher';
      DATA.students.forEach((s, i) => { s.parentPhone = '010-9876-54' + String(10 + i); });
      state.teacherTab = 'classhub'; state.classHubTab = 'students'; state.classHubId = 'c1'; render(); } },
  /* 대원고 고1 공통수학1 에 등급컷을 적어 두어 «컷 기준» 등급이 서는지 본다 */
  내신모의: { 말: '반 관리 › 성적 › 학교 시험 (학교 시험 · 등급컷으로 센 등급)',
    세우기: () => { state.currentUser = { type:'teacher', name:'김하현T' }; state.view = 'teacher';
      DATA.classes[0].progress = { subject:'공통수학1' };
      state.season = { name:'2학기 중간', startedAt:'2026-09-01' };
      state.examHistory = { items: [] };
      state.gradeCuts = { byKey: { [curSeasonKey()]: { '대원고': { '1': { '공통수학1': { c1:90, c2:80, c3:70, c4:60 } } } } } };
      const r = state.allRecords;
      r.s0.schoolExams = [{ term:'2026 · 1학기 기말', subject:'공통수학1', score:88, grade:2 },
                          { term:'2026 · 2학기 중간', subject:'공통수학1', score:84 }];
      r.s1.schoolExams = [{ term:'2026 · 2학기 중간', subject:'공통수학1', score:92, grade:1 }];
      r.s2.schoolExams = [{ term:'2026 · 2학기 중간', subject:'공통수학1', score:55 }];
      r.s0.mockExams = [{ ym:'2026-06', score:76, grade:3 }];
      state.nsTerm = '2026 · 2학기 중간'; state.nsMode = 'school';
      state.teacherTab = 'classhub'; state.classHubTab = 'scores'; state.classHubId = 'c1'; render(); } },
  진도범위: { 말: '반 관리 › 진도 (분모 = 이번 시즌 범위 · 반 목록 막대)', 폭: '864,1536,390',
    세우기: () => { state.currentUser = { type:'teacher', name:'김하현T' }; state.view = 'teacher';
      state.season = { name:'2학기 중간', startedAt:'2026-09-01' };
      DATA.classes[0].progress = { subject:'공통수학1', unitsBySubject: { '공통수학1': { '다항식의 연산':1, '항등식과 나머지정리':1, '인수분해':1, '복소수':1 } }, booksBySubject: {} };
      DATA.classes[1].progress = { subject:'확률과통계', unitsBySubject: { '확률과통계': { '경우의 수(순열과 조합)':1, '확률의 뜻과 활용':1, '조건부확률':1, '이산확률변수와 확률분포':1 } }, booksBySubject: {} };
      state.classProgLogs = { c1: {} };
      /* 교재 셋 — 첫 교재는 옛 반 체크를 물려받고, 셋째는 1~6단원만 다룬다 (09-30 · 2단계 C) */
      Object.assign(DATA.classes[0].progress, {
        booksBySubject: { '공통수학1': ['[2026] 개념원리 공통수학1', '쎈 공통수학1', '블랙라벨 상'] },
        unitsByBook: { '공통수학1': { '쎈 공통수학1': { '다항식의 연산':1, '항등식과 나머지정리':1 } } },
        bookScope: { '공통수학1': { '블랙라벨 상': ['다항식의 연산', '이차함수'] } } });
      state.teacherTab = 'classhub'; state.classHubTab = 'progress'; state.classHubId = 'c1'; state.studentDetailId = null; render(); } },
  수업진도: { 말: '수업 › 2. 진도 (오늘 고른 교재의 단원 체크)', 폭: '864,390',
    세우기: () => { const 요일 = '일월화수목금토'[new Date().getDay()];
      Object.assign(DATA.classes[0], { schedule: 요일 + ' 19시~21시', status:'진행중' });
      DATA.classes[0].progress = { subject:'공통수학1', unitsBySubject: { '공통수학1': { '다항식의 연산':1 } },
        booksBySubject: { '공통수학1': ['[2026] 개념원리 공통수학1', '쎈 공통수학1'] },
        unitsByBook: { '공통수학1': { '쎈 공통수학1': { '다항식의 연산':1, '항등식과 나머지정리':1 } } } };
      state.season = { name:'2학기 중간', startedAt:'2026-09-01' };
      state.classProgLogs = { c1: { [todayStr()]: { book:'쎈 공통수학1', detail:'p.45~62' } } };
      state.currentUser = { type:'teacher', name:'김하현T' }; state.view = 'teacher';
      state.teacherTab = 'session'; state.sessionDate = todayStr(); state.sessionClassId = 'c1'; state.sessionStep = 'prog'; render(); } },
  리포트교재: { 말: '학생 상세 › 이번 달 리포트 (교재별 진도 %)', 폭: '864',
    세우기: () => { state.currentUser = { type:'teacher', name:'김하현T' }; state.view = 'teacher';
      state.season = { name:'2학기 중간', startedAt:'2026-09-01' };
      DATA.classes[0].progress = { subject:'공통수학1', unitsBySubject: { '공통수학1': { '다항식의 연산':1, '항등식과 나머지정리':1, '인수분해':1, '복소수':1 } },
        booksBySubject: { '공통수학1': ['[2026] 개념원리 공통수학1', '쎈 공통수학1'] },
        unitsByBook: { '공통수학1': { '쎈 공통수학1': { '다항식의 연산':1, '항등식과 나머지정리':1 } } } };
      state.teacherTab = 'classhub'; state.classHubId = 'c1'; state.studentDetailId = null;
      sdOpen('s0'); state.studentDetailTab = 'report'; render(); } },
  학생상세성적: { 말: '학생 상세 › 연대기 › 성적 (학교 시험 · 모의고사 판)', 폭: '864,1536',
    세우기: () => { state.currentUser = { type:'teacher', name:'김하현T' }; state.view = 'teacher';
      state.season = { name:'2학기 중간', startedAt:'2026-09-01' }; state.examHistory = { items: [] };
      state.gradeCuts = { byKey: { [curSeasonKey()]: { '대원고': { '1': { '공통수학1': { c1:90, c2:80, c3:70, c4:60 } } } } } };
      for(const r of [state.allRecords.s0, DATA.records.s0].filter(Boolean)){
        r.schoolExams = [{ term:'2026 · 1학기 기말', subject:'공통수학1', score:88, grade:2 },
                         { term:'2026 · 2학기 중간', subject:'공통수학1', score:84 }];
        r.mockExams = [{ ym:'2026-06', score:76, grade:3 }, { ym:'2026-09', score:81 }]; }
      state.teacherTab = 'classhub'; state.classHubId = 'c1'; sdOpen('s0', 'score'); } },
  /* 상담 작업대 (2026-10-02 · 기획 A) — 반 › 상담 기록에서 학생을 누른 자리. 지난 상담 하나(그때 숫자 있음) */
  상담작업대: { 말: '반 › 상담 기록 › 상담 작업대 (학생 지금 · 쓰기)', 폭: '1440,864',
    세우기: () => { state.currentUser = { type:'teacher', name:'김하현T' }; state.view = 'teacher';
      for(const r of [state.allRecords.s0, DATA.records.s0].filter(Boolean)){
        r.schoolExams = [{ term:'2026 · 1학기 기말', subject:'공통수학1', score:88, grade:2 }];
        r.mockExams = []; }
      state.consultLogs.s0 = [{ id:'cl1', date:'2026-09-20', kind:'전화', who:'학부모', text:'어머니 통화 — 9월부터 클리닉 주 2회 희망. 금요일 학교 보충으로 지각 잦다고 하심.',
        snap:{ score:78, att:96, hw:'3/4', vid:82 } }];
      state.studentNotes.s0 = { text:'형이 같은 반 · 금요일 학교 보충으로 지각 잦음' };
      state.teacherTab = 'classhub'; state.classHubId = 'c1'; state.classHubTab = 'consult'; chubOpenConsult('s0'); } },
  /* 2026-10-03 메뉴 옮김 — 상담 기록(소통) · 휴강·보강(반) · 출석 도장(홈) */
  상담기록: { 말: '소통 › 상담 기록 (반 고르기가 사이드에)', 폭: '1440,864,390',
    세우기: () => { state.currentUser = { type:'teacher', name:'김하현T' }; state.view = 'teacher';
      state.consultLogs.s0 = [{ id:'cl1', date:'2026-09-20', kind:'전화', who:'학부모', text:'클리닉 주 2회 희망' }];
      state.teacherTab = 'classhub'; state.classHubId = 'c1'; state.classHubTab = 'consult'; state.studentDetailId = null; render(); } },
  휴강보강: { 말: '반 › 휴강·보강 (이 반 + 전체)', 폭: '1440,864,390',
    세우기: () => { state.currentUser = { type:'teacher', name:'김하현T' }; state.view = 'teacher';
      const 날 = k => shiftYmd(todayStr(), k);
      state.offDays = { days: [{ id:'od1', date: 날(2), classIds: ['c1'], label: '학원 행사' },
        { id:'od2', date: 날(5), moveTo: 날(6), moveTime: '14:00~16:30', classIds: ['c1'], label: '' },
        { id:'od3', date: 날(9), classIds: [], label: '추석 연휴' }] };
      state.teacherTab = 'classhub'; state.classHubId = 'c1'; state.classHubTab = 'offdays'; state.settingsForm = 'off'; state.studentDetailId = null; render(); } },
  /* 2026-10-03 학교 2단계 — 학생마다 시험 과목 · 준비(정시는 표시만) */
  학생과목: { 말: '설정 › 학생 › 편집 (시험 과목 · 준비)', 폭: '1440,864,390',
    세우기: () => { state.currentUser = { type:'teacher', name:'김하현T' }; state.view = 'teacher';
      const s = DATA.students[7]; s.school = '광남고'; s.grade = '고2'; s.examSubjects = ['대수', '기하']; s.track = '정시';
      state.teacherTab = 'settings'; state.settingsSubTab = 'students'; state.stuEditId = s.studentId; state.studentDetailId = null; render(); } },
  시험일정과목: { 말: '학교 › 시험 일정 — 같은 학교·학년에서 과목이 갈린다', 폭: '1440,390',
    세우기: () => { state.currentUser = { type:'teacher', name:'김하현T' }; state.view = 'teacher';
      DATA.classes[0].progress = { subject: '공통수학1' }; DATA.classes[1].progress = { subject: '대수' };
      DATA.students.forEach((s, i) => { s.school = i % 2 ? '광남고' : '대원고'; s.grade = i < 6 ? '고1' : '고2'; if(i >= 6) s.classId = 'c2'; });
      DATA.students[6].examSubjects = ['대수', '기하']; DATA.students[7].examSubjects = ['대수', '확률과통계'];
      DATA.students[8].examSubjects = ['대수', '기하']; DATA.students[8].track = '정시';
      DATA.students[9].examSubjects = ['대수', '확률과통계'];
      state.examHistory = { items: [] }; state.examRanges = { migrated: true, years: {} };
      state.teacherTab = 'examrange'; state.studentDetailId = null; render(); } },
  출석도장: { 말: '홈 › 출석 도장', 폭: '1440,864,390',
    세우기: () => { state.currentUser = { type:'teacher', name:'김하현T' }; state.view = 'teacher';
      state.teacherTab = 'checkin'; state.studentDetailId = null; render(); } },
};
void 강사; void 학생;
