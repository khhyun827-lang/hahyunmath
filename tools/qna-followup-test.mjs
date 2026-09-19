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
  const state = { currentUser: { studentId: 's1', name: '김승우' }, qnaQuestionImage: o.image || null, qnaAnswerImage: {}, stuQnaFollowFor: 'qn1' };
  const 쓴것 = [], 지운것 = [], 말 = [];
  const 알림 = [];
  const F = new Function('DATA', 'state', 'document', 'authUid', 'todayStr', 'dbSetDoc', 'dbDeleteDoc', 'showToast', 'render', 'deleteFromDrive', 'imgFileIdOf', 'confirm', 'notifyAuto', 'qnaNoticeText',
    /* ⚠ `deleteQna` 가 «답에 붙은 사진»까지 걷느라 `qnaMoreAnswersOf` 를 부른다 —
       목록에 없어 이 검사가 ReferenceError 로 터져 있었다. 옮겨 적지 않고 그대로 뜬다. */
    [lift('splitQnaFollowups'), lift('qnaFollowupsOf'), lift('qnaMoreAnswersOf'), lift('qnaHasOpen'),
     lift('qnaFind'), lift('submitFollowup'), lift('submitAnswer'), lift('deleteQna')].join(NL)
    + NL + 'return { splitQnaFollowups, qnaFollowupsOf, qnaHasOpen, qnaFind, submitFollowup, submitAnswer, deleteQna };')(
    DATA, state, { getElementById: id => ({ value: o.text === undefined ? '이 부분이 이해가 안 돼요' : o.text }) },
    () => 'uid-s1', () => '2026-09-15',
    async (col, id, doc) => { 쓴것.push({ col, id, doc: JSON.parse(JSON.stringify(doc)) }); return o.저장흠 ? null : true; },
    async (col, id) => { 지운것.push(col + '/' + id); },
    m => 말.push(m), () => {}, () => {}, v => (v && v.fileId) || null, () => true,
    (kind, id, targets) => 알림.push({ kind, id, targets }), (name, q) => name + ':' + q.id);
  return { F, DATA, state, 쓴것, 지운것, 말, 알림 };
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
  const { F, DATA, state, 쓴것, 말 } = 판({ qnas: [{ id: 'qn1', studentId: 's1', question: 'Q', answer: 'A' }] });
  F.splitQnaFollowups();
  await F.submitFollowup('qn1');
  const w = 쓴것[0];
  봄('🔴 qnas 통에 «새 문서»로 쓴다 (부모를 안 고친다)', [w.col, w.id !== 'qn1', w.id.startsWith('qf')], ['qnas', true, true]);
  봄('🔴 kind·parentId·uid 가 있다 (규칙: 제 uid 로만 만든다)', [w.doc.kind, w.doc.parentId, w.doc.uid], ['followup', 'qn1', 'uid-s1']);
  봄('꼴은 원래 질문과 같다 (question → answer 자리)', ['question', 'image', 'answer', 'answerImage', 'answeredAt'].every(k => k in w.doc), true);
  봄('보낸 뒤 폼이 닫힌다', [state.stuQnaFollowFor, state.qnaQuestionImage], [null, null]);
  봄('목록에 붙는다', DATA.qnaFollowups.length, 1);

  const 빈 = 판({ qnas: [{ id: 'qn1', answer: 'A' }], text: '   ' });
  await 빈.F.submitFollowup('qn1');
  봄('빈 글은 안 보낸다', [빈.쓴것.length, 빈.말[0]], [0, '추가 질문 내용을 입력해주세요.']);

  const 흠 = 판({ qnas: [{ id: 'qn1', answer: 'A' }], 저장흠: true });
  흠.F.splitQnaFollowups();
  await 흠.F.submitFollowup('qn1');
  봄('🔴 저장이 막히면 목록에서 도로 뺀다', [흠.DATA.qnaFollowups.length, 흠.말[0].includes('보내지 못했습니다')], [0, true]);
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

console.log(NL + (fail ? `🔴 ${fail}개 실패 · ${pass + fail}개` : `✓ 전부 통과 · ${pass}개`));
process.exit(fail ? 1 : 0);
