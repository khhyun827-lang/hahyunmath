// 질의응답 «추가 질문» — 새 문서로 같은 통에 · 강사는 같은 길로 답한다 (2026-09-15)
//
//   node tools/qna-followup-test.mjs
//
// 사용자 — 「답변을 했는데 보고도 이해 안 되는 학생들이 있어서 그 밑에 다시 또 추가적으로 댓글을 달 수 있도록」
// 🔴 규칙이 학생에게 qnas 는 «만들기»만 준다 — 그래서 댓글은 새 문서(kind:'followup' · parentId)다. 규칙은 안 건드렸다.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/\r\n/g, '\n');
const rules = fs.readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8');
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
  console.log((ok ? '  ✓ ' : '  🔴 ') + 무엇 + (ok ? '' : NL + '      나온 것 ' + JSON.stringify(나온것) + NL + '      나와야 ' + JSON.stringify(나와야)));
};

function 판(o) {
  o = o || {};
  const DATA = { qnas: o.qnas || [], qnaFollowups: [] };
  /* ⚠ 2026-09-23(Q-1)부터 «아직 안 낸 사진»은 state.qnaPhotos 한 곳에 목록으로 산다 —
     열쇠는 'q'(질문·추가 질문) · 'a:<질문id>'(답). 옛 qnaQuestionImage·qnaAnswerImage 는 없어졌다. */
  const state = { currentUser: { studentId: 's1', name: '김승우' },
    qnaPhotos: o.photos || (o.image ? { q: [o.image] } : {}), stuQnaFollowFor: 'qn1' };
  const 쓴것 = [], 지운것 = [], 말 = [], 지운사진 = [];
  const 알림 = [], 폰 = [];
  const F = new Function('DATA', 'state', 'document', 'authUid', 'todayStr', 'dbSetDoc', 'dbDeleteDoc', 'showToast', 'render', 'deleteFromDrive', 'imgFileIdOf', 'confirm', 'notifyAuto', 'qnaNoticeText', 'qnaNoticeVars', 'pushPing',
    /* ⚠ `deleteQna` 가 «답에 붙은 사진»까지 걷느라 `qnaMoreAnswersOf` 를 부른다 —
       목록에 없어 이 검사가 ReferenceError 로 터져 있었다. 옮겨 적지 않고 그대로 뜬다. */
    [lift('splitQnaFollowups'), lift('qnaFollowupsOf'), lift('qnaMoreAnswersOf'), lift('qnaHasOpen'),
     lift('qnaFind'), lift('qnaImgList'), lift('qnaPhotos'), lift('qnaPhotosBusy'), lift('qnaPhotoDocs'),
     lift('clearQnaPhotos'), lift('qnaDraftOf'), lift('qnaDraftSet'), lift('submitFollowup'), lift('submitAnswer'), lift('deleteQna')].join(NL)
    + NL + 'return { splitQnaFollowups, qnaFollowupsOf, qnaHasOpen, qnaFind, submitFollowup, submitAnswer, deleteQna };')(
    DATA, state, { getElementById: id => ({ value: o.text === undefined ? '이 부분이 이해가 안 돼요' : o.text }) },
    () => 'uid-s1', () => '2026-09-15',
    async (col, id, doc) => { 쓴것.push({ col, id, doc: JSON.parse(JSON.stringify(doc)) }); return o.저장흠 ? null : true; },
    async (col, id) => { 지운것.push(col + '/' + id); },
    m => 말.push(m), () => {}, id => { if(id) 지운사진.push(id); }, v => (v && v.fileId) || null, () => true,
    (kind, id, targets) => 알림.push({ kind, id, targets }), (name, q) => name + ':' + q.id, (name, q) => ({ '#{학생명}': name }),
    (kind, text) => 폰.push({ kind, text }));
  return { F, DATA, state, 쓴것, 지운것, 지운사진, 말, 알림, 폰 };
}

console.log(NL + '① 읽은 뒤 가른다' + NL);
{
  const { F, DATA } = 판({ qnas: [
    { id: 'qn1', studentId: 's1', question: 'Q', answer: 'A' },
    { id: 'qf1', kind: 'followup', parentId: 'qn1', studentId: 's1', question: '또?', answer: null },
    { id: 'qn2', studentId: 's1', question: 'Q2', answer: null },
  ] });
  F.splitQnaFollowups();
  봄('🔴 추가 질문은 DATA.qnas 에서 빠진다 (새 질문으로 안 센다)', DATA.qnas.map(q => q.id), ['qn1', 'qn2']);
  봄('따로 담긴다', DATA.qnaFollowups.map(f => f.id), ['qf1']);
  봄('부모로 찾는다', F.qnaFollowupsOf('qn1').map(f => f.id), ['qf1']);
  봄('🔴 답한 질문이라도 추가 질문에 답이 없으면 «대기»다', F.qnaHasOpen(DATA.qnas[0]), true);
  봄('첫 답이 없으면 대기', F.qnaHasOpen(DATA.qnas[1]), true);
  DATA.qnaFollowups[0].answer = '다시 설명';
  봄('추가 질문에 답하면 완료', F.qnaHasOpen(DATA.qnas[0]), false);
  봄('qnaFind 는 둘 다 찾는다', [F.qnaFind('qn1').id, F.qnaFind('qf1').id, F.qnaFind('x')], ['qn1', 'qf1', null]);
}

console.log(NL + '② 학생이 추가 질문을 보낸다 — 새 문서' + NL);
{
  const { F, DATA, state, 쓴것, 말, 폰 } = 판({ qnas: [{ id: 'qn1', studentId: 's1', question: 'Q', answer: 'A' }] });
  F.splitQnaFollowups();
  await F.submitFollowup('qn1');
  봄('🔵 저장된 뒤 선생님 폰 알림을 부른다 (N-4)', 폰, [{ kind: 'qna', text: '(추가 질문) 이 부분이 이해가 안 돼요' }]);
  const w = 쓴것[0];
  봄('🔴 qnas 통에 «새 문서»로 쓴다 (부모를 안 고친다)', [w.col, w.id !== 'qn1', w.id.startsWith('qf')], ['qnas', true, true]);
  봄('🔴 kind·parentId·uid 가 있다 (규칙: 제 uid 로만 만든다)', [w.doc.kind, w.doc.parentId, w.doc.uid], ['followup', 'qn1', 'uid-s1']);
  봄('꼴은 원래 질문과 같다 (question → answer 자리)', ['question', 'image', 'images', 'answer', 'answerImage', 'answeredAt'].every(k => k in w.doc), true);
  봄('보낸 뒤 폼이 닫힌다', [state.stuQnaFollowFor, state.qnaPhotos.q], [null, undefined]);
  봄('목록에 붙는다', DATA.qnaFollowups.length, 1);

  const 빈 = 판({ qnas: [{ id: 'qn1', answer: 'A' }], text: '   ' });
  await 빈.F.submitFollowup('qn1');
  봄('빈 글은 안 보낸다', [빈.쓴것.length, 빈.말[0]], [0, '추가 질문 내용을 입력해주세요.']);

  const 흠 = 판({ qnas: [{ id: 'qn1', answer: 'A' }], 저장흠: true });
  흠.F.splitQnaFollowups();
  await 흠.F.submitFollowup('qn1');
  봄('🔴 저장이 막히면 목록에서 도로 뺀다', [흠.DATA.qnaFollowups.length, 흠.말[0].includes('보내지 못했습니다')], [0, true]);
  봄('   저장이 막히면 폰 알림도 안 간다', 흠.폰.length, 0);
}

console.log(NL + '③ 강사는 같은 길로 답한다 · 지우면 같이 지운다' + NL);
{
  const { F, DATA, 쓴것, 지운것, 알림 } = 판({ qnas: [
    { id: 'qn1', studentId: 's1', question: 'Q', answer: 'A', image: null, answerImage: null },
    { id: 'qf1', kind: 'followup', parentId: 'qn1', studentId: 's1', studentName: '김승우', question: '또?', answer: null },
  ], text: '이렇게 보면 됩니다' });
  F.splitQnaFollowups();
  await F.submitAnswer('qf1');
  봄('🔴 submitAnswer 가 추가 질문 문서에 답을 얹는다 (강사 update 권한)', [쓴것[0].id, 쓴것[0].doc.answer, 쓴것[0].doc.answeredAt], ['qf1', '이렇게 보면 됩니다', '2026-09-15']);
  봄('🔵 답이 저장되면 알림톡이 «실»(원 질문) 단위로 그 학생에게 (09-20)', 알림.map(a => [a.kind, a.id, a.targets.map(t => t.sid + '/' + t.message)]),
    [['qna', 'qn1', ['s1/김승우:qf1']]]);
  봄('그러면 그 질문은 완료다', F.qnaHasOpen(DATA.qnas[0]), false);
  await F.deleteQna('qn1');
  봄('🔴 질문을 지우면 추가 질문 문서도 지운다', 지운것, ['qnas/qf1', 'qnas/qn1']);
  봄('메모리에서도 빠진다', [DATA.qnas.length, DATA.qnaFollowups.length], [0, 0]);
}
{
  /* 저장이 막히면 알림도 안 간다 — «간 줄 알았는데 답이 없다»가 제일 나쁘다 */
  const { F, 알림 } = 판({ qnas: [{ id: 'qn1', studentId: 's1', question: 'Q', answer: null }], text: '답', 저장흠: true });
  F.splitQnaFollowups();
  await F.submitAnswer('qn1');
  봄('🔴 저장이 막히면 알림톡도 안 나간다', 알림.length, 0);
}

console.log(NL + '④ 화면과 규칙의 닻' + NL);
{
  const 강사 = 알맹이(lift('teacherQnaHTML')), 학생 = 알맹이(lift('stuQnaHTML'));
  봄('강사 «대기» 갈래가 qnaHasOpen 을 쓴다', 강사.includes('DATA.qnas.filter(qnaHasOpen)'), true);
  /* ⚠ 2026-09-16 에 답 칸이 «하나뿐인 함수»로 빠졌다 (`qnaAnswerFormHTML` — 「답이 있어도
     사라지지 않는다」). 스레드는 이제 그 함수를 부른다. 붙는 자리와 만드는 자리를 갈라서 잰다. */
  const 답칸 = 알맹이(lift('qnaAnswerFormHTML'));
  봄('강사 스레드에 추가 질문과 답 칸이 붙는다',
    [강사.includes('qnaFollowupsOf(cur.id).map'),
     강사.includes('qnaAnswerFormHTML(f,'),
     답칸.includes("submitAnswer('${q.id}')")], [true, true, true]);
  봄('학생 화면에 「추가 질문」 단추와 폼이 있다', 학생.includes("submitFollowup('${q.id}')") && 학생.includes('추가 질문</button>'), true);
  봄('답이 없는 질문에는 추가 질문 단추가 안 뜬다', 학생.includes("${!q.answer ? '' : state.stuQnaFollowFor === q.id"), true);
  const 규칙블록 = rules.slice(rules.indexOf('match /qnas/'), rules.indexOf('}', rules.indexOf('match /qnas/') + 20));
  봄('🔴 규칙은 안 건드렸다 — 학생은 여전히 만들기만', [규칙블록.includes('allow create: if realAccount() && request.resource.data.uid == request.auth.uid;'), 규칙블록.includes('allow update, delete: if isTeacher();')], [true, true]);
  봄('읽은 뒤 두 곳에서 가른다', (html.match(/splitQnaFollowups\(\);/g) || []).length, 2);
}

/* ═══ 사진 여러 장 (2026-09-23 · Q-1 · 사용자 — 「사진이 하나밖에 안올라가는데 여러개 올리게해줘」) ═══ */
console.log(NL + '⑦ 사진 여러 장 — 질문에도, 답에도' + NL);
{
  const 석장 = [{ url: 'u1', fileId: 'f1' }, { url: 'u2', fileId: 'f2' }, { url: 'u3', fileId: 'f3' }];
  const { F, 쓴것 } = 판({ qnas: [{ id: 'qn1', studentId: 's1', question: 'Q', answer: 'A' }],
    photos: { q: 석장.slice() } });
  F.splitQnaFollowups();
  await F.submitFollowup('qn1');
  봄('🔴 추가 질문에 세 장이 다 실린다', 쓴것[0].doc.images.map(x => x.fileId), ['f1', 'f2', 'f3']);
  봄('🔴 첫 장은 image 에도 둔다 — 못 고친 자리가 있어도 «빈 칸»이 아니라 첫 장이 보이게',
    쓴것[0].doc.image.fileId, 'f1');

  /* 올리는 중인 칸이 섞여 있으면 보내지 않는다 — 주소가 없는 것을 문서에 실으면 안 된다 */
  const 올리는중 = 판({ qnas: [{ id: 'qn1', answer: 'A' }],
    photos: { q: [{ url: 'u1', fileId: 'f1' }, { uploading: true, previewUrl: 'blob:x' }] } });
  올리는중.F.splitQnaFollowups();
  await 올리는중.F.submitFollowup('qn1');
  봄('🔴 올리는 중이면 안 보낸다', [올리는중.쓴것.length, 올리는중.말[0].includes('사진 올리기가 끝난 뒤')], [0, true]);

  /* 답에도 여러 장 */
  const 답 = 판({ qnas: [{ id: 'qn1', studentId: 's1', question: 'Q', answer: null }],
    photos: { 'a:qn1': [{ url: 'a1', fileId: 'af1' }, { url: 'a2', fileId: 'af2' }] } });
  답.F.splitQnaFollowups();
  await 답.F.submitAnswer('qn1');
  봄('🔴 첫 답에 두 장', 답.쓴것[0].doc.answerImages.map(x => x.fileId), ['af1', 'af2']);
  봄('   첫 장은 answerImage 에도', 답.쓴것[0].doc.answerImage.fileId, 'af1');
  봄('   보낸 뒤 칸을 비운다', 답.state.qnaPhotos['a:qn1'], undefined);

  /* 두 번째 답(moreAnswers)에도 */
  const 더 = 판({ qnas: [{ id: 'qn1', studentId: 's1', question: 'Q', answer: '첫 답' }],
    photos: { 'a:qn1': [{ url: 'b1', fileId: 'bf1' }, { url: 'b2', fileId: 'bf2' }] } });
  더.F.splitQnaFollowups();
  await 더.F.submitAnswer('qn1');
  봄('🔴 더 단 답에도 여러 장', 더.쓴것[0].doc.moreAnswers[0].images.map(x => x.fileId), ['bf1', 'bf2']);
}

console.log(NL + '⑧ 옛 문서(한 장짜리)를 그대로 읽는다 · 지울 때 두 번 안 지운다' + NL);
{
  const L = new Function(lift('qnaImgList') + NL + 'return qnaImgList;')();
  봄('🔴 옛 꼴 — image 한 장이 목록 하나가 된다', L({ image: { fileId: 'x' } }).map(i => i.fileId), ['x']);
  봄('🔴 옛 꼴 — answerImage 도', L({ answerImage: { fileId: 'y' } }, true).map(i => i.fileId), ['y']);
  봄('새 꼴 — images 가 있으면 그쪽이 이긴다',
    L({ image: { fileId: 'a' }, images: [{ fileId: 'a' }, { fileId: 'b' }] }).map(i => i.fileId), ['a', 'b']);
  봄('사진이 없으면 빈 목록', [L(null).length, L({}).length, L({ image: null }).length], [0, 0, 0]);

  /* 지우기 — 새 문서는 첫 장이 image 에도 있어, 그대로 돌면 «같은 파일을 두 번» 지우러 간다 */
  const 지우기 = 판({ qnas: [{ id: 'qn1', studentId: 's1', question: 'Q',
    image: { fileId: 'f1' }, images: [{ fileId: 'f1' }, { fileId: 'f2' }],
    answer: 'A', answerImage: { fileId: 'g1' }, answerImages: [{ fileId: 'g1' }],
    moreAnswers: [{ text: '더', image: { fileId: 'h1' }, images: [{ fileId: 'h1' }, { fileId: 'h2' }] }] }] });
  지우기.F.splitQnaFollowups();
  await 지우기.F.deleteQna('qn1');
  봄('🔴 사진을 하나도 안 빠뜨리고 지운다', 지우기.지운사진.slice().sort(), ['f1', 'f2', 'g1', 'h1', 'h2']);
  봄('🔴 같은 파일을 두 번 지우러 가지 않는다 (첫 장이 image 에도 있어 두 번 돌기 쉽다)',
    지우기.지운사진.length, new Set(지우기.지운사진).size);
}

console.log(NL + (fail ? `🔴 ${fail}개 실패 · ${pass + fail}개` : `✓ 전부 통과 · ${pass}개`));
process.exit(fail ? 1 : 0);
