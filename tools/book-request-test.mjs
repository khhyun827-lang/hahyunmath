// 교재 문제 요청 — 학생이 번호를 쳐서 변형을 부른다 (2026-09-13 · K-17)
//
//   node tools/book-request-test.mjs
//
// 🔴 **무엇을 재는가** — 사용자 요청: 「학생페이지에서 주교재들에 대해서 변형문제 요청하면
//   변형문제 나가는 시스템 … 엔딩크레딧 번호를 쓰면 변형문제를 요청넣을 수 있게
//   (시험지 틀린번호 선택하면 변형문제 요청가는 구조랑 비슷하게)」
//   그리고 나가는 방식: 「내가 변형하고 검토하고 나갔으면 좋겠어」.
//
// 🔵 **책에 인쇄된 번호 = 코드의 일련번호**(사용자 확인). 그래서 번호 하나로 코드를 찾는다.
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
  let depth = 0;
  for (let j = html.indexOf('{', at); j < html.length; j++) {
    if (html[j] === '{') depth++;
    else if (html[j] === '}') { depth--; if (!depth) return html.slice(at, j + 1); }
  }
  throw new Error(name + ' 의 끝을 못 찾았습니다');
}
/* ⚠ 칸 맞추려고 등호 앞에 빈칸을 여럿 둔 줄이 있고(`const BOOK_OF_CODE    = {`),
   두 줄에 걸친 것도 있다(`SUBJECT_OF_CODE`). 그래서 «세미콜론까지» 떠 온다. */
function liftConst(n) {
  const at = html.search(new RegExp('^const ' + n + '\\s*=', 'm'));
  if (at < 0) throw new Error(n + ' 를 못 찾았습니다');
  const end = html.indexOf(';\n', at);
  if (end < 0) throw new Error(n + ' 의 끝을 못 찾았습니다');
  return html.slice(at, end + 1);
}
let pass = 0, fail = 0;
const 봄 = (무엇, 나온것, 나와야) => {
  const ok = JSON.stringify(나온것) === JSON.stringify(나와야);
  if (ok) pass++; else fail++;
  console.log((ok ? '  ✓ ' : '  🔴 ') + 무엇 + (ok ? '' : NL + '      나온 것 ' + JSON.stringify(나온것) + NL + '      나와야 ' + JSON.stringify(나와야)));
};
const esc = s => (s === null || s === undefined) ? '' : String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* 장부 본보기 — 엔딩크레딧(E) 셋과 학교기출(S) 하나, 그리고 «변형» 코드 하나. */
const 장부 = {
  'K2-03-E-0431-N01': { code: 'K2-03-E-0431-N01', chapter: '03', seq: 431 },
  'K2-04-D-0002-N01': { code: 'K2-04-D-0002-N01', chapter: '04', seq: 2 },
  'K2-01-E-0001': { code: 'K2-01-E-0001', chapter: '01', seq: 1, scene: 'SCENE 1' },
  'K2-03-E-0431': { code: 'K2-03-E-0431', chapter: '03', seq: 431, scene: 'SCENE 2' },
  'K2-05-E-0564': { code: 'K2-05-E-0564', chapter: '05', seq: 564, scene: 'SCENE 3' },
  'K2-02-S-0007': { code: 'K2-02-S-0007', chapter: '02', seq: 7, scene: 'SCENE 1' },
  /* 🔴 변형 둘을 «원본보다 앞»에 둔다 — 뒤에 두면 훑다가 원본을 먼저 만나서,
     변형을 안 거르는 판이어도 통과한다(덫을 확인하다 드러났다).
     그리고 D 는 원본이 하나도 없는 책이다 — 변형을 세면 고르개에 D 가 끼어든다. */
};
const 잣대 = [liftConst('ITEM_CODE_RE'), liftConst('BOOK_OF_CODE'), liftConst('SUBJECT_OF_CODE')].join(NL) + NL +
  [lift('bookReqKey'), lift('bookReqBooks'), lift('bookReqFind')].join(NL);
/* ═══ ① 번호 → 코드 ═══ */
console.log(NL + '① 책에 적힌 번호로 문항을 찾는다' + NL);
{
  const F = new Function('state', 잣대 + NL + 'return { bookReqBooks, bookReqFind, bookReqKey };')(
    { itemByCode: 장부 });
  봄('🔴 고를 수 있는 책은 장부에 «원본»이 있는 것뿐이다',
    F.bookReqBooks(), [{ code: 'E', name: '엔딩크레딧' }, { code: 'S', name: '학교 기출' }]);
  봄('431 을 치면 3단원의 그 문항', (F.bookReqFind('E', '431') || {}).code, 'K2-03-E-0431');
  봄('🔵 앞의 0 을 쳐도 · 「431번」이라고 써도 같다',
    ['0431', '431번', ' 431 '].map(x => (F.bookReqFind('E', x) || {}).code),
    ['K2-03-E-0431', 'K2-03-E-0431', 'K2-03-E-0431']);
  봄('1 번도 찾는다 (네 자리로 채운다)', (F.bookReqFind('E', '1') || {}).code, 'K2-01-E-0001');
  봄('🔴 없는 번호는 «없다»고 한다 (짐작해서 가까운 것을 주지 않는다)', F.bookReqFind('E', '999'), null);
  봄('🔴 책이 다르면 같은 번호라도 다른 문항', (F.bookReqFind('S', '7') || {}).code, 'K2-02-S-0007');
  봄('책에 없는 번호는 null', F.bookReqFind('S', '431'), null);
  봄('번호가 비면 null', [F.bookReqFind('E', ''), F.bookReqFind('', '431')], [null, null]);
  봄('🔴 변형 코드(-N01)는 «책 번호»로 안 잡힌다', (F.bookReqFind('E', '431') || {}).code, 'K2-03-E-0431');
  봄('열쇠는 코드로 짓는다', F.bookReqKey('K2-03-E-0431'), 'bookreq:K2-03-E-0431');
}

/* ═══ ② 학생은 «제 기록»에만 쓴다 — 문항 창고에 못 쓴다 ═══ */
console.log(NL + '② 요청은 학생 제 기록에 남는다' + NL);
{
  /* 🔴 **이것이 「요청을 보내지 못했습니다」의 뿌리였다.**
     처음엔 오답숙제처럼 학생이 `problembank` 에 한 줄을 쓰게 지었는데,
     규칙이 `allow write: if isTeacher()` 라 통째로 막혔다 — **그리고 그 규칙이 옳다.**
     내용이 `value` 한 칸의 JSON 글자라 규칙이 안을 못 보므로, 열어 주면 학생이
     `status:'approved'` 를 제 손으로 적어 **검토를 건너뛸 수 있다.** */
  const rules = fs.readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8').replace(/\r\n/g, '\n');
  봄('🔴 문항 창고는 강사만 쓴다 (그대로 둔다)',
    /match \/problembank\/\{doc\} \{ allow read: if realAccount\(\); allow write: if isTeacher\(\); \}/.test(rules), true);
  봄('🔵 학생이 제 기록에는 쓸 수 있다',
    /match \/records\/\{uid\} \{\s*allow read, write: if isTeacher\(\) \|\| isMine\(uid\);/.test(rules), true);
  봄('🔴 그래서 요청은 problembank 를 안 건드린다',
    lift('submitBookRequests').includes('problembank'), false);
  봄('제 기록에만 쓴다', lift('submitBookRequests').includes('await saveRecord(sid)'), true);
  봄('빈 기록 모양에도 자리가 있다', html.includes('bookRequests:[],'), true);

  const 만들기 = (이미) => {
    const rec = { wrongHomework: [], bookRequests: (이미 || []).slice() };
    const DATA = { records: { s1: rec } };
    const state = { itemByCode: 장부, bookReqPicked: [], bookReqMode: true,
      currentUser: { studentId: 's1' } };
    const 말 = []; let 저장 = 0, 막을까 = false;
    const F = new Function('DATA', 'state', 'loadRecord', 'saveRecord', 'showToast', 'render', 'todayStr',
      잣대 + NL + lift('bookReqsOf') + NL + lift('submitBookRequests') + NL + lift('cancelBookRequest') + NL +
      'return { submitBookRequests, cancelBookRequest };')(
      DATA, state, async () => rec, async () => { 저장++; return 막을까 ? null : true; },
      m => 말.push(m), () => {}, () => '2026-09-13');
    return { rec, state, 말, F, 막는다: () => { 막을까 = true; }, 센다: () => 저장 };
  };

  const a = 만들기();
  a.state.bookReqPicked = ['K2-03-E-0431', 'K2-01-E-0001'];
  await a.F.submitBookRequests();
  봄('🔴 요청 둘이 제 기록에 남는다',
    a.rec.bookRequests.map(r => [r.code, r.at]),
    [['K2-03-E-0431', '2026-09-13'], ['K2-01-E-0001', '2026-09-13']]);
  봄('🔴 아직 숙제는 아니다 — 선생님을 거친다', a.rec.wrongHomework.length, 0);
  봄('담은 것은 비워지고 판이 닫힌다', [a.state.bookReqPicked, a.state.bookReqMode], [[], false]);
  봄('«선생님이 만든 뒤 나간다»고 말한다', /선생님이 쌍둥이 문제를 만들어 검토한 뒤/.test(a.말[0]), true);

  const b = 만들기([{ code: 'K2-03-E-0431', at: '2026-09-10' }]);
  b.state.bookReqPicked = ['K2-03-E-0431'];
  await b.F.submitBookRequests();
  봄('🔴 이미 부른 번호는 또 안 담긴다', b.rec.bookRequests.length, 1);
  봄('그렇다고 말한다', /이미 요청해 둔 번호입니다/.test(b.말[0]), true);

  const c = 만들기();
  c.state.bookReqPicked = ['K2-01-E-0001'];
  c.막는다();
  await c.F.submitBookRequests();
  봄('🔴 저장이 막히면 그렇다고 말한다', /요청을 보내지 못했습니다/.test(c.말[0]), true);
  봄('그때는 판을 안 닫는다 (다시 누를 수 있게)', c.state.bookReqMode, true);

  const d = 만들기([{ code: 'K2-03-E-0431', at: '2026-09-10' }]);
  await d.F.cancelBookRequest('K2-03-E-0431');
  봄('학생이 제 요청을 물린다', d.rec.bookRequests.length, 0);

  const e = 만들기();
  await e.F.submitBookRequests();
  봄('아무것도 안 담고 누르면 그렇다고 말한다', [e.센다(), /담아 주세요/.test(e.말[0])], [0, true]);
}

/* ═══ ②-b 강사가 «받으면» 그때 문항이 선다 ═══ */
console.log(NL + '②-b 강사가 받아 문항을 세운다' + NL);
{
  const 만들기 = (변형있나, 이미있는것) => {
    const recs = {
      s1: { wrongHomework: [], bookRequests: [{ code: 'K2-03-E-0431', at: '2026-09-11' }] },
      s2: { wrongHomework: [], bookRequests: [{ code: 'K2-03-E-0431', at: '2026-09-12' },
                                              { code: 'K2-01-E-0001', at: '2026-09-09' }] },
    };
    const DATA = { problemBank: (이미있는것 || []).slice() };
    const state = { allRecords: recs, itemByCode: 장부 };
    const 쓴것 = [], 말 = [], 장부적음 = [];
    const 곁 = ['DATA', 'state', 'loadItemStoreIfNeeded', 'codeVariantFor', 'loadRecord', 'saveRecord',
      'dbSetDoc', 'logAudit', 'showToast', 'render', 'todayStr', 'studentNameOf'];
    const 값 = [DATA, state, async () => {},
      code => 변형있나 ? { code: code + '-N01', content: '쌍둥이 본문', answer: '3' } : null,
      async sid => recs[sid], async () => true,
      async (col, id, v) => { 쓴것.push(v); return true; },
      async (a, b, c, d) => 장부적음.push(d), m => 말.push(m), () => {}, () => '2026-09-13',
      sid => ({ s1: '가나', s2: '다라' })[sid] || sid];
    const F = new Function(...곁,
      잣대 + NL + lift('bookReqsOf') + NL + lift('bookReqPending') + NL + lift('bookReqLabelOf') + NL +
      lift('bookReqAccept') + NL + 'return { bookReqPending, bookReqAccept, bookReqLabelOf };')(...값);
    return { recs, DATA, 쓴것, 말, 장부적음, F };
  };

  const a = 만들기(false);
  봄('🔴 요청을 코드별로 모은다 · 오래 기다린 것이 위',
    a.F.bookReqPending().map(x => [x.code, x.who, x.at]),
    [['K2-01-E-0001', ['s2'], '2026-09-09'], ['K2-03-E-0431', ['s1', 's2'], '2026-09-11']]);
  봄('이름표는 「엔딩크레딧 431」', a.F.bookReqLabelOf('K2-03-E-0431'), '엔딩크레딧 431');

  await a.F.bookReqAccept('K2-03-E-0431');
  봄('🔴 받으면 문항 창고에 한 줄이 선다', a.쓴것.length, 1);
  봄('🔴 변형이 없으면 «검토 대기»로 — 「내용 없음」 줄에 선다',
    [a.쓴것[0].status, a.쓴것[0].variantContent, a.쓴것[0].variantAnswer], ['pending', '', '']);
  봄('어디서 온 것인지·코드가 붙는다',
    [a.쓴것[0].source, a.쓴것[0].bookCode, a.쓴것[0].bookNo, a.쓴것[0].itemCode, a.쓴것[0].chapter],
    ['bookreq', 'E', 431, 'K2-03-E-0431', '03']);
  봄('🔴 원본 본문은 복사하지 않는다 (창고가 진실)',
    [a.쓴것[0].originalContent, a.쓴것[0].originalAnswer], ['', '']);
  봄('🔴 부른 학생 «전원»에게 숙제가 붙는다',
    [a.recs.s1.wrongHomework.length, a.recs.s2.wrongHomework.length], [1, 1]);
  봄('🔴 그 학생들의 요청은 지워진다', [a.recs.s1.bookRequests.length, a.recs.s2.bookRequests.map(r=>r.code)],
    [0, ['K2-01-E-0001']]);
  봄('다른 번호의 요청은 그대로 남는다', a.F.bookReqPending().map(x => x.code), ['K2-01-E-0001']);
  봄('장부에 남는다', a.장부적음[0], '엔딩크레딧 431 · 2명');
  봄('제일 먼저 부른 날을 문항에 적는다', a.쓴것[0].requestedAt, '2026-09-11');

  const b = 만들기(true);
  await b.F.bookReqAccept('K2-03-E-0431');
  봄('🔵 창고에 검토된 변형이 있으면 채워서 바로 낸다',
    [b.쓴것[0].status, b.쓴것[0].variantContent, b.쓴것[0].variantCode],
    ['approved', '쌍둥이 본문', 'K2-03-E-0431-N01']);
  봄('그때는 «바로 나갔다»고 말한다', /바로 나갔습니다/.test(b.말[0]), true);

  /* 문항을 못 세우면 요청을 안 지운다 */
  const c = 만들기(false);
  const 곁2 = ['DATA', 'state', 'loadItemStoreIfNeeded', 'codeVariantFor', 'loadRecord', 'saveRecord',
    'dbSetDoc', 'logAudit', 'showToast', 'render', 'todayStr', 'studentNameOf'];
  const G = new Function(...곁2,
    잣대 + NL + lift('bookReqsOf') + NL + lift('bookReqPending') + NL + lift('bookReqLabelOf') + NL +
    lift('bookReqAccept') + NL + 'return bookReqAccept;')(
    c.DATA, { allRecords: c.recs, itemByCode: 장부 }, async () => {}, () => null,
    async sid => c.recs[sid], async () => true, async () => null,
    async () => {}, m => c.말.push(m), () => {}, () => '2026-09-13', sid => sid);
  await G('K2-03-E-0431');
  봄('🔴 문항을 못 세우면 요청을 그대로 둔다 (지워 놓고 못 세우면 어디에도 안 남는다)',
    [c.recs.s1.bookRequests.length, c.DATA.problemBank.length,
     /요청은 그대로 두었습니다/.test(c.말[c.말.length-1])], [1, 0, true]);

  /* 이미 세워 둔 문항이 있으면 줄을 또 안 만든다 */
  const 이미 = [{ id: 'pb1', source: 'bookreq', itemCode: 'K2-03-E-0431', status: 'pending',
    questionNo: 431, qkey: 'bookreq:K2-03-E-0431', qlabel: '엔딩크레딧 431' }];
  const d = 만들기(false, 이미);
  await d.F.bookReqAccept('K2-03-E-0431');
  봄('🔴 이미 있는 문항이면 줄을 또 안 만든다', [d.쓴것.length, d.DATA.problemBank.length], [0, 1]);
  봄('그래도 학생들에게는 붙는다', d.recs.s1.wrongHomework.map(h => h.bankId), ['pb1']);

  const e = 만들기(false);
  await e.F.bookReqAccept('K2-99-E-9999');
  봄('없는 요청을 받으면 아무 일도 안 한다', [e.쓴것.length, /이제 없습니다/.test(e.말[0])], [0, true]);
}

/* ═══ ③ 원본은 창고에서 떠 온다 ═══ */
console.log(NL + '③ 원본 본문 — 두 벌로 두지 않는다' + NL);
{
  const B = new Function('state', lift('bankOriginal') + NL + 'return bankOriginal;')(
    { itemBody: { 'K2-03-E-0431': { code: 'K2-03-E-0431', content: '창고 본문', answer: '5' } } });
  봄('🔴 교재 요청은 창고에서 떠 온다',
    B({ source: 'bookreq', itemCode: 'K2-03-E-0431', originalContent: '', originalAnswer: '' }),
    { content: '창고 본문', answer: '5' });
  봄('시험지에서 온 것은 실려 온 본문을 그대로 쓴다',
    B({ itemCode: 'K2-03-E-0431', originalContent: '시험지 본문', originalAnswer: '2' }),
    { content: '시험지 본문', answer: '2' });
  봄('창고에도 없으면 빈 값 (지어내지 않는다)',
    B({ source: 'bookreq', itemCode: 'K2-99-E-9999' }), { content: '', answer: '' });
  봄('없는 것을 줘도 안 터진다', B(null), { content: '', answer: '' });
  /* 🔴 원본을 «보여 주는» 자리와 «AI 에게 넘기는» 자리가 다 이것을 거치는가 */
  봄('🔴 검토 화면의 원본 칸', html.includes('problemHTML(bankOriginal(b).content'), true);
  봄('🔴 검토 화면의 정답 칸', html.includes('splitAnswerSolution(bankOriginal(b).answer)'), true);
  봄('🔴 AI 쌍둥이 만들기 두 자리',
    (html.match(/generateTwinViaAI\(원본\.content, 원본\.answer, image\)/g) || []).length, 2);
  봄('🔴 옛 자리가 안 남았다', /generateTwinViaAI\(b\.originalContent/.test(html), false);
}

/* ═══ ④ 화면 ═══ */
console.log(NL + '④ 화면 — 학생과 강사가 각각 무엇을 보는가' + NL);
{
  const 학생 = lift('stuWrongHTML');
  /* ⚠ 「교재 문제 요청」은 판 제목에도 있다 — 단추가 사라져도 그 글자는 남는다.
     **누르는 자리**를 본다(덫을 확인하다 드러났다). */
  봄('학생 화면에 「교재 문제 요청」 단추',
    학생.includes('onclick="state.bookReqMode=true; state.bookReqPicked=[]; render()"'), true);
  봄('🔴 장부를 가볍게 싣는다 (창고 564건을 안 읽는다)',
    학생.includes('loadItemLedgerIfNeeded()') && !학생.includes('loadItemStoreIfNeeded'), true);
  봄('🔴 시험지가 아닌 묶음을 「교재에서 요청한 문제」로 부른다',
    학생.includes("eid ? (exam ? exam.title : '삭제된 시험지') : '교재에서 요청한 문제'"), true);
  봄('번호 칸에서 엔터로도 담긴다', 학생.includes("if(event.key==='Enter')"), true);
  봄('담은 것을 눌러 뺄 수 있다', 학생.includes('bookReqDrop('), true);
  /* 🔴 아직 안 나온 것은 학생에게 «검토 중»으로 보인다 — 이 길이 이미 있다(오답숙제와 공유) */
  봄('🔴 검토 전에는 «검토 중»으로 보인다', 학생.includes("bank.status!=='approved'"), true);
  /* 🔴 **아직 강사가 «받기» 전에도 학생 화면에 보여야 한다** (2026-09-13 · K-18) —
     요청은 아직 숙제가 아니라 위 목록에 안 뜬다. 안 보여 주면 «눌렀는데 아무 일도 안 났다»로 읽힌다. */
  /* ⚠ 「요청한 문제」는 묶음 이름(「교재에서 요청한 문제」)에도 든 글자다 —
     그것만 보면 이 구획을 통째로 지워도 통과한다(덫을 확인하다 드러났다). 구획 머리를 본다. */
  봄('🔴 요청해 둔 것이 «기다리는 중»으로 선다',
    학생.includes('<div class="msec">요청한 문제') && 학생.includes('기다리는 중'), true);
  봄('학생이 제 요청을 물릴 수 있다', 학생.includes('cancelBookRequest('), true);
  봄('이미 부른 번호는 담을 때 막는다', lift('bookReqAdd').includes('이미 요청해 둔 번호입니다'), true);
  /* 강사 */
  봄('🔴 강사 검토 화면이 «학생이 요청한 것»이라고 말한다', html.includes('학생이 교재에서 요청한 문제'), true);
  봄('그 줄은 교재 요청에만 선다', html.includes("b.source !== 'bookreq' ? '' :"), true);
  /* ⚠ `bankRequesterCount` 는 다른 화면도 쓴다 — 그 «줄 안»에서 부르는지를 본다.
     닻을 html 전체에 걸면 남의 자리 덕에 통과한다(덫을 확인하다 드러났다). */
  const 요청줄 = (html.match(/b\.source !== 'bookreq'[\s\S]{0,600}?rv-req[\s\S]{0,400}?\}\)\(\)/) || [''])[0];
  봄('요청 줄을 떠 왔다', 요청줄.includes('rv-req'), true);
  봄('몇 명이 기다리는지도 적는다', 요청줄.includes('bankRequesterCount(b.id)'), true);
  봄('그 줄 안에 책 이름과 번호가 적힌다',
    요청줄.includes('BOOK_OF_CODE[b.bookCode]') && 요청줄.includes('b.bookNo'), true);
  봄('장부만 싣는 문이 따로 있다', html.includes('async function loadItemLedgerIfNeeded()'), true);
  봄('⚠ 무거운 문은 그대로 둔다 (강사 화면이 쓴다)', html.includes('async function loadItemStoreIfNeeded()'), true);
  /* 🔴 **받는 자리가 화면에 있어야 한다** — 함수만 있고 누를 데가 없으면 요청은 영영 안 받아진다.
     ⚠ 큐가 아니라 «띠»다: 요청은 아직 problembank 가 아니라 큐 조건으로 못 거른다. */
  const 검토 = lift('teacherReviewHTML');
  봄('🔴 검토 화면 맨 위에 요청 띠가 선다', 검토.includes('const reqBar = !요청들.length'), true);
  봄('그 띠를 실제로 그린다', 검토.includes('${reqBar}${aiBar}'), true);
  봄('누르면 받는다', 검토.includes('bookReqAccept('), true);
  봄('누가 불렀는지 이름으로 적는다', 검토.includes('r.who.map(studentNameOf)'), true);
  봄('요청이 없으면 띠를 아예 안 그린다', 검토.includes("!요청들.length ? '' :"), true);
  봄('요청을 보려면 기록을 읽어야 한다', 검토.includes('loadAllRecordsIfNeeded()'), true);
}

console.log(NL + (fail ? '🔴 ' + fail + '개 실패 · ' : '✓ 전부 통과 · ') + pass + '개' + NL);
process.exit(fail ? 1 : 0);
