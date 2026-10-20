// 문항 풀이 영상 · 영상 마감 잠금 (2026-10-20)
//
//   node tools/prob-video-test.mjs
//
// 사용자 — 「교재와 번호를 선택했을 때 유튜브에 업로드된 문항이 있으면 자동으로 영상 제공」
//          「다른반 수업 영상도 보여주자 · 질문을 보내고 영상을 보내주자」
//          「뒤로 넘겨서 다른 문제를 학습하는 것도 가능해? 질문하지 않은 다른반 수업영상을 전체 제공해주고 싶진 않아」
//          「마감일을 둔 이유는 영상을 그 이후로 못 보는 거」 — 다 본 학생도 · 복습용도 잠근다.
// 실제 크롬으로 연다. 저장·유튜브는 흉내로 갈아 끼운다 — 실 DB 0줄.
// 🔴 붙드는 것: 목차 읽기 · 같은 교재(띄어쓰기 무시)의 가장 최근 구간 · 질문에 구간이 박힌다 ·
//    재생기는 구간 «밖»으로 못 나간다 · 강사가 «봤나»를 본다 · 마감 지난 영상은 재생기가 안 선다.

import { chromium } from 'playwright';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { 씨앗 } from './shots-scenes.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PORT = 8811;
const 서버 = spawn(process.execPath, [path.join(HERE, 'serve.js'), String(PORT)], { stdio: 'ignore' });
let pass = 0, fail = 0;
const 봄 = (무엇, 나온것, 나와야) => {
  const ok = JSON.stringify(나온것) === JSON.stringify(나와야);
  if(ok){ pass++; console.log('  ✓ ' + 무엇); }
  else { fail++; console.log(`  ✗ ${무엇}\n      나온 것: ${JSON.stringify(나온것)}\n      나와야:  ${JSON.stringify(나와야)}`); }
};
const SHOT = process.argv[2];   // 폴더를 주면 화면을 찍어 둔다

const 브라우저 = await chromium.launch();
try{
  const page = await 브라우저.newPage({ viewport: { width: 430, height: 900 } });
  for(let i = 0; i < 40; i++){ try{ await page.goto(`http://127.0.0.1:${PORT}/index.html`); break; }catch{ await page.waitForTimeout(250); } }
  await page.waitForFunction(() => typeof render === 'function' && typeof pvParseToc === 'function');
  await page.evaluate(씨앗);
  await page.evaluate(() => {
    window.confirm = () => true; window.showToast = m => { window.__말 = m; };
    DATA.classes[0].progress = { subject: '수학(상)', booksBySubject: { '수학(상)': ['주기나 1-1'] } };
    /* 유튜브 대신 — 재생기가 부르는 것만 흉내 낸다. 자리(t)를 손으로 옮겨 본다. */
    window.__p = { t: 0, 멈춤: 0, 간곳: [] };
    const 가짜 = {
      getCurrentTime: () => __p.t, getDuration: () => 3000, getPlayerState: () => 1, isMuted: () => false,
      getPlaybackRate: () => 1, setPlaybackRate(){}, playVideo(){}, destroy(){}, unloadModule(){},
      pauseVideo(){ __p.멈춤++; }, seekTo(x){ __p.간곳.push(x); __p.t = x; },
    };
    window.YT = { Player: function(){ return 가짜; }, PlayerState: { PLAYING: 1 } };
  });

  console.log('\n목차 읽기 · 찾기');
  const 읽기 = await page.evaluate(() => {
    const items = pvParseToc('61번 ~ 97번 풀이\n\n0:00 수업 시작\n6:24 61번\n8:50 65번\n1:13:30 97번\n');
    const pv = { entries: [
      { id: 'e1', url: 'https://youtu.be/AAAAAAAAAAA', book: '주기나 1-1', items: [{ n: 61, from: 384, to: 530 }, { n: 65, from: 530, to: 1181 }] },
      { id: 'e2', url: 'https://youtu.be/BBBBBBBBBBB', book: '주기나1-1', items: [{ n: 65, from: 100, to: 200 }] },
    ] };
    return { items, 최근: pvFind(pv, '주기나 1-1', 65), 앞것: pvFind(pv, '주기나 1-1', 61), 없음: pvFind(pv, '엔크', 61),
      괄호: pvSame('[2026][1-2기말][엔딩크레딧]', '[2026][1-2기말]엔딩크레딧'), 다른책: pvSame('[2026][1-2기말][엔딩크레딧]', '[2026][1-2중간][엔딩크레딧]') };
  });
  봄('목차 → 번호·시작·끝(다음 문항 시작) · 번호 없는 줄은 건너뜀', 읽기.items,
    [{ n: 61, from: 384, to: 530 }, { n: 65, from: 530, to: 4410 }, { n: 97, from: 4410, to: 0 }]);
  봄('🔴 같은 문항이 둘이면 가장 최근 것 · 교재 이름 띄어쓰기 무시', 읽기.최근,
    { url: 'https://youtu.be/BBBBBBBBBBB', from: 100, to: 200, entryId: 'e2', code: '' });
  봄('다른 수업(e1)의 문항도 찾는다', 읽기.앞것 && 읽기.앞것.entryId, 'e1');
  봄('없는 교재는 null', 읽기.없음, null);
  봄('🔴 대괄호가 하나 빠진 이름도 같은 교재 (고1GB2 실제 이름)', 읽기.괄호, true);
  봄('중간·기말은 다른 교재', 읽기.다른책, false);

  console.log('\n질문 → 구간이 박히고 재생기가 선다');
  const 질문 = await page.evaluate(async () => {
    state.probVideos = { entries: [{ id: 'e2', url: 'https://youtu.be/BBBBBBBBBBB', book: '주기나1-1', items: [{ n: 65, from: 100, to: 200 }] }] };
    state.view = 'student'; state.currentUser = { type: 'student', studentId: 's0', name: '김민아' };
    state.studentTab = 'qna'; state.stuQnaWriting = true; render();
    const 고르개 = [...document.querySelectorAll('#qna-book option')].map(o => o.value);
    document.getElementById('qna-question').value = '65번 모르겠어요';
    document.getElementById('qna-book').value = '주기나 1-1';
    document.getElementById('qna-num').value = '65';
    await submitQuestion();
    const q = DATA.qnas[0];
    return { 고르개, book: q.book, num: q.num, pv: q.pv, 말: __말, 틀: !!document.getElementById('yt-frame-pv-' + q.id), id: q.id };
  });
  봄('교재 고르개 = 반 교재', 질문.고르개, ['', '주기나 1-1']);
  봄('🔴 질문 문서에 교재·번호·구간이 박힌다', [질문.book, 질문.num, 질문.pv],
    ['주기나 1-1', 65, { url: 'https://youtu.be/BBBBBBBBBBB', from: 100, to: 200, entryId: 'e2', code: '' }]);
  봄('보낸 뒤 «영상이 있어요»라고 말한다', /수업 풀이 영상이 있어요/.test(질문.말), true);
  봄('보낸 뒤 그 자리에 재생기가 열린다', 질문.틀, true);
  if(SHOT) await page.screenshot({ path: path.join(SHOT, 'qna-student.png'), fullPage: true });

  console.log('\n교재·번호만으로 보내기 · 대기 판정 (10-20 둘째)');
  const 흐름 = await page.evaluate(async () => {
    let 울림 = 0; window.pushPing = () => { 울림++; };
    const 보내기 = async (글, 책, 번) => {
      state.studentTab = 'qna'; state.stuQnaWriting = true; render();
      document.getElementById('qna-question').value = 글;
      document.getElementById('qna-book').value = 책;
      document.getElementById('qna-num').value = 번;
      const 전 = DATA.qnas.length; await submitQuestion(); return DATA.qnas.length > 전 ? DATA.qnas[0] : null;
    };
    const 빈것 = await 보내기('', '', '');
    const 빈말 = __말;
    const 번호만 = await 보내기('', '주기나 1-1', '65');
    const 영상울림 = 울림;
    const 없는번호 = await 보내기('', '주기나 1-1', '3');       // 영상이 없는 번호 — 강사가 답해야 한다
    const 없는울림 = 울림;
    state.stuQnaWriting = false; render();
    const 카드 = [...document.querySelectorAll('#app .mc')].find(x => x.innerHTML.includes('yt-frame-pv-' + 번호만.id) || x.textContent.includes('이해 안 되는 부분 적기'));
    const 열림 = { 대기: qnaHasOpen(번호만) };
    DATA.qnaFollowups.push({ id: 'qf1', kind: 'followup', parentId: 번호만.id, question: '여기 모르겠어요', answer: null });
    const 추가뒤 = qnaHasOpen(번호만);
    DATA.qnaFollowups.find(f => f.id === 'qf1').answer = '이렇게 보면 돼요';
    return { 빈것: 빈것 === null, 빈말, 글: 번호만.question, 영상: !!번호만.pv, 영상울림, 없는울림, 없는대기: qnaHasOpen(없는번호),
      ...열림, 추가뒤, 답한뒤: qnaHasOpen(번호만),
      딱지: 카드 ? (카드.querySelector('.badge') || {}).textContent : null,
      이끔: !!카드 && 카드.textContent.includes('이해되지 않는 부분이 있으면') };
  });
  봄('교재·번호도 내용도 없으면 안 보낸다', [흐름.빈것, /교재·번호/.test(흐름.빈말)], [true, true]);
  봄('🔴 교재·번호만 고르면 내용 없이 보낸다 — 글은 «교재 N번»', [흐름.글, 흐름.영상], ['주기나 1-1 65번', true]);
  봄('풀이 영상이 간 질문은 선생님 폰을 안 울린다 · 영상이 없으면 울린다', [흐름.영상울림, 흐름.없는울림], [0, 1]);
  봄('영상이 없는 번호는 대기', 흐름.없는대기, true);
  봄('🔴 영상이 간 질문은 바로 «완료» (대기 아님)', 흐름.대기, false);
  봄('🔴 학생이 추가 코멘트를 남기면 다시 대기 → 답하면 완료', [흐름.추가뒤, 흐름.답한뒤], [true, false]);
  봄('학생 카드 딱지 «풀이 영상» · 보고 막히면 적으라고 이끈다', [흐름.딱지, 흐름.이끔], ['풀이 영상', true]);

  console.log('\n🔴 재생기는 구간 밖으로 못 나간다');
  const 가둠 = await page.evaluate(async id => {
    const vid = 'pv-' + id;
    state.studentTab = 'qna'; state.stuPvOpen = id; render();   // 바로 위 검사가 다른 질문의 영상을 열어 두었다
    await new Promise(r => setTimeout(r, 300));      // mountVideoTrackers 가 가짜 YT 로 플레이어를 세운다
    const 있나 = !!vcPlayer(vid);
    const 글 = () => [document.getElementById('vc-cur-' + vid).textContent, document.getElementById('vc-dur-' + vid).textContent];
    __p.t = 250; __p.멈춤 = 0; __p.간곳 = []; vcPaint(vid);
    const 끝넘음 = { 멈춤: __p.멈춤, 간곳: __p.간곳.slice(), 글: 글() };
    __p.t = 30; __p.간곳 = []; vcPaint(vid);
    const 앞벗어남 = __p.간곳.slice();
    __p.t = 160; vcPaint(vid);
    const 안쪽글 = 글();
    __p.t = 195; __p.간곳 = []; vcSkip(vid, 10);
    const 건너뜀 = __p.간곳.slice();
    __p.t = 105; __p.간곳 = []; vcSkip(vid, -10);
    return { 있나, 끝넘음, 앞벗어남, 안쪽글, 건너뜀, 뒤로: __p.간곳.slice() };
  }, 질문.id);
  봄('플레이어가 섰다', 가둠.있나, true);
  봄('🔴 끝(200초)을 넘으면 멈추고 처음(100초)으로', [가둠.끝넘음.멈춤 > 0, 가둠.끝넘음.간곳], [true, [100]]);
  봄('🔴 앞으로 벗어나도 처음으로', 가둠.앞벗어남, [100]);
  봄('시계·길이는 구간 기준(0:00 ~ 1:40) — 2시간짜리 수업인 줄 모른다', 가둠.안쪽글, ['1:00', '1:40']);
  봄('+10초는 끝 1초 앞에서 멈춘다', 가둠.건너뜀, [199]);
  봄('−10초는 처음에서 멈춘다', 가둠.뒤로, [100]);

  console.log('\n강사 질문 카드 — 보냈나 · 봤나');
  const 강사 = await page.evaluate(id => {
    const q = DATA.qnas.find(x => x.id === id);
    state.allRecords = { s0: { videoProgress: {} } };
    const 전 = pvTeacherLineHTML(q);
    state.allRecords.s0.videoProgress['pv-' + id] = { watchedSeconds: 64, duration: 3000 };
    const 후 = pvTeacherLineHTML(q);
    const 없음 = pvTeacherLineHTML({ book: '엔크', num: 3, pv: null });
    return { 전: /아직 안 봄/.test(전), 후: (후.match(/시청 [0-9:]+ \/ [0-9:]+/) || [''])[0], 없음: /영상 없음/.test(없음), 링크: /youtu\.be\/BBBBBBBBBBB\?t=100/.test(후) };
  }, 질문.id);
  봄('안 봤으면 «아직 안 봄»', 강사.전, true);
  봄('🔴 본 시간 / 구간 길이', 강사.후, '시청 1:04 / 1:40');
  봄('영상이 없던 질문도 교재·번호는 보인다', 강사.없음, true);
  봄('강사는 구간 시작으로 바로 연다', 강사.링크, true);

  console.log('\n강사 등록 — 늘 새로 읽고 더한다');
  const 등록 = await page.evaluate(async () => {
    const 읽음 = [], 씀 = [];
    window.dbGet = async (k, d) => { 읽음.push(k); return { entries: [{ id: 'old', url: 'u', book: '주기나 1-1', items: [{ n: 1, from: 0, to: 10 }] }] }; };
    window.dbSet = async (k, v) => { 씀.push([k, JSON.parse(JSON.stringify(v))]); return true; };
    window.loadItemStoreIfNeeded = async () => {};
    state.itemBody = { 'K2-06-E-0625': { code: 'K2-06-E-0625', books: [{ name: '주기나', part: '1-1', year: 2026, no: 61 }] },
                       'K2-01-E-0061': { code: 'K2-01-E-0061', books: [{ name: '주기나', part: '1-2', year: 2026, no: 61 }] } };
    const 코드 = [pvCodeOf('[2026][1-1]주기나', 61), pvCodeOf('[2026][1-1][주기나]', 61), pvCodeOf('[2026][1-1]주기나', 65)];
    const box = document.createElement('div'); box.innerHTML = pvPanelHTML('c1'); document.body.appendChild(box);
    document.getElementById('pv-url').value = 'https://youtu.be/CCCCCCCCCCC';
    document.getElementById('pv-toc').value = '0:00 수업 시작\n6:24 61번\n8:50 65번';
    await pvSave();
    box.remove();
    const e = 씀[0] && 씀[0][1].entries;
    return { 읽음, 코드, 열쇠: 씀[0] && 씀[0][0], 개수: e && e.length, 옛것: e && e[0].id, 새것: e && [e[1].book, e[1].items] };
  });
  봄('저장 전에 kv/prob-videos 를 새로 읽는다', 등록.읽음, ['prob-videos']);
  봄('🔴 옛 목차를 지우지 않고 뒤에 더한다', [등록.열쇠, 등록.개수, 등록.옛것], ['prob-videos', 2, 'old']);
  봄('🔴 교재 이름+번호 → 창고에 적힌 원본 코드 (책 번호 ≠ 일련번호 · 판이 다르면 다른 문항 · 없으면 빈칸)', 등록.코드, ['K2-06-E-0625', 'K2-06-E-0625', '']);
  봄('새 목차 = 고른 교재 + 문항 (창고에서 찾은 것만 코드)', 등록.새것, ['주기나 1-1', [{ n: 61, from: 384, to: 530 }, { n: 65, from: 530, to: 0 }]]);

  console.log('\n오답숙제에도 원본 풀이 · 영상 본 뒤 쌍둥이 한 문제 (10-21)');
  const 쌍 = await page.evaluate(async () => {
    window.dbGet = async () => null;
    const CODE = 'K2-06-E-0625';
    state.probVideos = { entries: [{ id: 'e7', url: 'https://youtu.be/FFFFFFFFFFF', book: '[2026][1-2기말][엔딩크레딧]',
      items: [{ n: 61, from: 383, to: 530, code: CODE }] }] };
    state.view = 'student'; state.currentUser = { type: 'student', studentId: 's0', name: '김민아' };
    /* 오답숙제 — 원본 코드가 목차에 있는 것 하나, 없는 것 하나 */
    DATA.problemBank.push({ id: 'pbV1', examId: '', questionNo: 625, qkey: 'bookreq:' + CODE, qlabel: '엔딩크레딧 625', status: 'approved',
      itemCode: CODE, variantContent: '$x$ 의 값은?', variantAnswer: '7', source: 'bookreq' },
      { id: 'pbV2', examId: '', questionNo: 3, qkey: 'bookreq:K2-01-E-0003', qlabel: '엔딩크레딧 3', status: 'approved',
      itemCode: 'K2-01-E-0003', variantContent: '$y$ 의 값은?', variantAnswer: '2', source: 'bookreq' });
    const rec = DATA.records.s0;
    rec.wrongHomework = [{ bankId: 'pbV1', examId: '', qkey: 'bookreq:' + CODE, qlabel: '엔딩크레딧 625', assignedAt: todayStr(), done: false, studentAnswer: '' },
                         { bankId: 'pbV2', examId: '', qkey: 'bookreq:K2-01-E-0003', qlabel: '엔딩크레딧 3', assignedAt: todayStr(), done: false, studentAnswer: '' }];
    state.studentTab = 'wronghw'; state.stuPvOpen = null; render();
    const 단추들 = [...document.querySelectorAll('#app button')].filter(b => b.textContent.includes('원본 문제 수업 풀이 보기')).length;
    state.stuPvOpen = 'pv-hw-pbV1'; render();
    const 숙제틀 = !!document.getElementById('yt-frame-pv-hw-pbV1');
    const 숙제구간 = [state.pvItems['pv-hw-pbV1'].fromSec, state.pvItems['pv-hw-pbV1'].toSec, state.pvItems['pv-hw-pbV1'].strict];

    /* 질문 — 10-20 처럼 pv 에 code 가 없어도 목차에서 찾는다 */
    const q = { id: 'qT', uid: 'u', studentId: 's0', question: '61번', book: '[2026][1-2기말][엔딩크레딧]', num: 61, date: todayStr(),
      pv: { url: 'https://youtu.be/FFFFFFFFFFF', from: 383, to: 530, entryId: 'e7' }, answer: null };
    DATA.qnas.unshift(q);
    state.studentTab = 'qna'; state.stuPvOpen = null; state.stuQnaWriting = false; render();
    const 단추 = () => [...document.querySelectorAll('#app button')].some(b => b.textContent.includes('쌍둥이 한 문제 풀기'));
    const 안봄 = 단추();
    state.stuPvOpen = 'qT'; render();
    const 연뒤 = 단추();
    const 물은것 = [];
    window.dbGetVariantsOfRoots = async roots => { 물은것.push(roots); return [
      { code: CODE + '-U01', originCode: CODE, variantKind: 'U', content: '어려운 것', answer: '9' },
      { code: CODE + '-N01', originCode: CODE, variantKind: 'N', content: '대기 중', answer: '4', pending: true },
      { code: CODE + '-N02', originCode: CODE, variantKind: 'N', content: '$2x=6$ 일 때 $x$ 는?', answer: '$3$' } ]; };
    await pvTwinOpen('qT');
    const 문제 = !!document.getElementById('pvt-qT') && document.getElementById('app').textContent.includes('2x=6');
    let 보냄 = []; window.dbSetDoc = async (col, id, doc) => { 보냄.push([col, doc.kind, doc.parentId, doc.question]); return true; };
    document.getElementById('pvt-qT').value = '5';
    await pvTwinSubmit('qT');
    const 결과 = rec.pvTwin && rec.pvTwin.qT;
    const 결과글 = document.getElementById('app').textContent.includes('선생님께 추가 질문으로 보냈어요');
    const 대기 = qnaHasOpen(q);
    state.allRecords = { s0: rec };
    const 강사 = pvTeacherLineHTML(q);
    /* 맞히면 — 추가 질문 없음 */
    delete rec.pvTwin.qT; DATA.qnaFollowups = []; 보냄 = []; state.pvTwinFor = 'qT'; render();
    document.getElementById('pvt-qT').value = '3';
    await pvTwinSubmit('qT');
    return { 단추들, 숙제틀, 숙제구간, 안봄, 연뒤, 물은것, 문제, 결과, 결과글, 대기,
      보냄첫: 보냄.length, 강사: /쌍둥이 K2-06-E-0625-N02 .*틀림 \(5\)/.test(강사), 맞힘: rec.pvTwin.qT.ok, 코드: pvQnaCode(q) };
  });
  봄('🔴 오답숙제 — 원본 코드가 목차에 있는 숙제에만 «원본 문제 수업 풀이 보기»', 쌍.단추들, 1);
  봄('누르면 그 구간만 도는 재생기', [쌍.숙제틀, 쌍.숙제구간], [true, [383, 530, true]]);
  봄('10-20 질문(pv 에 code 없음)도 목차에서 코드를 찾는다', 쌍.코드, 'K2-06-E-0625');
  봄('🔴 영상을 열기 전엔 쌍둥이 단추가 없다 · 연 뒤엔 있다', [쌍.안봄, 쌍.연뒤], [false, true]);
  봄('누를 때 그 원본 변형만 읽는다', 쌍.물은것, [['K2-06-E-0625']]);
  봄('🔴 검토 대기는 안 낸다 · N 이 먼저 (U 보다)', 쌍.문제, true);
  봄('틀리면 제 기록에 남는다 (정답은 $ 벗겨서)', 쌍.결과 && [쌍.결과.code, 쌍.결과.ans, 쌍.결과.answer, 쌍.결과.ok], ['K2-06-E-0625-N02', '5', '3', false]);
  봄('🔴 틀리면 추가 질문이 저절로 → 선생님 대기로', [쌍.결과글, 쌍.대기], [true, true]);
  봄('강사 질문 카드에 쌍둥이 결과', 쌍.강사, true);
  봄('맞히면 추가 질문 없음', [쌍.맞힘, 쌍.보냄첫], [true, 0]);
  if(SHOT){ await page.evaluate(() => { state.pvTwinFor = null; render(); }); await page.screenshot({ path: path.join(SHOT, 'pv-twin.png'), fullPage: true }); }
  if(SHOT){
    await page.evaluate(() => { delete DATA.records.s0.pvTwin.qT; state.pvTwinFor = 'qT'; state.stuPvOpen = 'qT'; render(); window.scrollTo(0, 0); });
    await page.screenshot({ path: path.join(SHOT, 'pv-twin-open.png'), fullPage: true });
    await page.evaluate(() => { state.studentTab = 'wronghw'; state.stuPvOpen = null; render(); });
    await page.screenshot({ path: path.join(SHOT, 'pv-hw.png'), fullPage: true });
  }

  console.log('\n🔴 마감이 지나면 못 본다 (다 본 학생도 · 복습용도)');
  const 잠금 = await page.evaluate(() => {
    const v2 = DATA.videos.find(v => v.id === 'v2');            // 씨앗: 마감 이틀 전
    DATA.videos.push({ id: 'v9', classId: 'c1', title: '오늘 마감', url: 'https://youtu.be/DDDDDDDDDDD', dueDate: todayStr() });
    DATA.videos.push({ id: 'v8', classId: 'c1', title: '복습용 지난 것', url: 'https://youtu.be/EEEEEEEEEEE', dueDate: shiftYmd(todayStr(), -1), noTrack: true });
    state.studentTab = 'video'; state.stuVideoId = 'v2'; render();
    const 지난것 = { 틀: !!document.getElementById('yt-frame-v2'), 말: /더는 볼 수 없습니다/.test(document.getElementById('app').innerHTML) };
    state.stuVideoId = 'v9'; render();
    const 오늘것 = !!document.getElementById('yt-frame-v9');
    state.stuVideoId = 'v8'; render();
    const 복습용 = !!document.getElementById('yt-frame-v8');
    const 할일 = stuTodo(stuCtx()).map(x => x.title);
    return { 잠김: [videoLocked(v2), videoLocked(DATA.videos.find(v => v.id === 'v9'))], 지난것, 오늘것, 복습용,
      할일에: 할일.includes(v2.title), 재촉: vidNotWatched(v2, DATA.students).length };
  });
  봄('마감 지난 것 잠김 · 오늘 마감은 아직', 잠금.잠김, [true, false]);
  봄('🔴 잠긴 영상은 재생기가 안 서고 까닭을 말한다', 잠금.지난것, { 틀: false, 말: true });
  봄('마감 당일은 본다', 잠금.오늘것, true);
  봄('🔴 복습용도 잠긴다', 잠금.복습용, false);
  봄('잠긴 것은 할 일에 안 선다', 잠금.할일에, false);
  봄('잠긴 것은 미시청 알림 대상이 없다', 잠금.재촉, 0);
  if(SHOT){ await page.evaluate(() => { state.stuVideoId = 'v2'; render(); }); await page.screenshot({ path: path.join(SHOT, 'video-locked.png'), fullPage: true }); }
} finally {
  await 브라우저.close();
  서버.kill();
}
console.log(`\n  ${fail ? '🔴' : '✅'} ${pass} 통과 · ${fail} 실패\n`);
process.exit(fail ? 1 : 0);
