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

/* ═══ ② 요청하면 무엇이 생기는가 ═══ */
console.log(NL + '② 요청 — 검토를 거쳐 나간다' + NL);
{
  const 만들기 = (변형있나, 이미있는것) => {
    const DATA = { problemBank: (이미있는것 || []).slice() };
    const rec = { wrongHomework: [] };
    const state = { itemByCode: 장부, bookReqPicked: [], bookReqMode: true,
      currentUser: { studentId: 's1' } };
    const 쓴것 = [], 말 = [];
    const F = new Function('DATA', 'state', 'loadVariantsIfNeeded', 'loadRecord', 'saveRecord',
      'dbSetDoc', 'codeVariantFor', 'showToast', 'render', 'todayStr',
      잣대 + NL + lift('submitBookRequests') + NL + 'return submitBookRequests;')(
      DATA, state, async () => {}, async () => rec, async () => {},
      async (c, id, v) => { 쓴것.push(v); return true; },
      code => 변형있나 ? { code: code + '-N01', content: '쌍둥이 본문', answer: '3' } : null,
      m => 말.push(m), () => {}, () => '2026-09-13');
    return { DATA, rec, state, 쓴것, 말, F };
  };

  /* 창고에 변형이 없을 때 — 선생님이 만들고 검토한 뒤 나간다 */
  const a = 만들기(false);
  a.state.bookReqPicked = ['K2-03-E-0431'];
  await a.F();
  봄('🔴 문항 창고에 한 줄이 생긴다', a.쓴것.length, 1);
  봄('🔴 «검토 대기»로 태어난다 — 학생이 요청해도 그냥 안 나간다',
    [a.쓴것[0].status, a.쓴것[0].variantContent], ['pending', '']);
  봄('🔴 내용이 비어 있으므로 강사의 「내용 없음」 줄에 선다',
    !a.쓴것[0].variantContent && !a.쓴것[0].variantAnswer, true);
  봄('어디서 온 것인지 적힌다', [a.쓴것[0].source, a.쓴것[0].bookCode, a.쓴것[0].bookNo], ['bookreq', 'E', 431]);
  봄('🔴 코드·과목·단원이 붙는다 (창고와 이어지는 줄)',
    [a.쓴것[0].itemCode, a.쓴것[0].subject, a.쓴것[0].chapter], ['K2-03-E-0431', '공통수학2', '03']);
  봄('🔴 원본 본문은 «복사하지 않는다» — 창고가 진실이다',
    [a.쓴것[0].originalContent, a.쓴것[0].originalAnswer], ['', '']);
  봄('시험지에서 온 것이 아니다', a.쓴것[0].examId, '');
  봄('학생 이름표는 「엔딩크레딧 431」', a.쓴것[0].qlabel, '엔딩크레딧 431');
  봄('학생 숙제에도 한 줄', [a.rec.wrongHomework.length, a.rec.wrongHomework[0].examId,
    a.rec.wrongHomework[0].done], [1, '', false]);
  봄('담은 것은 비워지고 판이 닫힌다', [a.state.bookReqPicked, a.state.bookReqMode], [[], false]);
  봄('학생에게 «선생님이 만든 뒤 나간다»고 말한다', /선생님이 변형을 만들어 검토한 뒤/.test(a.말[0]), true);

  /* 창고에 이미 검토를 마친 변형이 있을 때 — 그것은 이미 통과시킨 것이라 바로 나간다 */
  const b = 만들기(true);
  b.state.bookReqPicked = ['K2-03-E-0431'];
  await b.F();
  봄('🔵 이미 검토된 변형이 있으면 바로 나간다',
    [b.쓴것[0].status, b.쓴것[0].variantContent, b.쓴것[0].variantCode],
    ['approved', '쌍둥이 본문', 'K2-03-E-0431-N01']);
  봄('그때는 «바로 나갔다»고 말한다', /바로 숙제로 나갔습니다/.test(b.말[0]), true);

  /* 같은 번호를 남이 이미 요청해 뒀으면 줄을 같이 쓴다 */
  const 이미 = [{ id: 'pb1', source: 'bookreq', itemCode: 'K2-03-E-0431', status: 'pending',
    questionNo: 431, qkey: 'bookreq:K2-03-E-0431', qlabel: '엔딩크레딧 431' }];
  const c = 만들기(false, 이미);
  c.state.bookReqPicked = ['K2-03-E-0431'];
  await c.F();
  봄('🔴 남이 이미 요청한 번호는 줄을 새로 안 만든다',
    [c.쓴것.length, c.DATA.problemBank.length], [0, 1]);
  봄('그래도 이 학생에게는 숙제가 붙는다', c.rec.wrongHomework.map(h => h.bankId), ['pb1']);

  /* 여러 개를 한 번에 */
  const d = 만들기(false);
  d.state.bookReqPicked = ['K2-01-E-0001', 'K2-05-E-0564'];
  await d.F();
  봄('여러 번호를 한 번에 담아 보낸다',
    [d.쓴것.length, d.쓴것.map(x => x.bookNo)], [2, [1, 564]]);

  /* 저장이 막히면 화면에도 안 남는다 */
  const e = 만들기(false);
  const G = new Function('DATA', 'state', 'loadVariantsIfNeeded', 'loadRecord', 'saveRecord',
    'dbSetDoc', 'codeVariantFor', 'showToast', 'render', 'todayStr',
    잣대 + NL + lift('submitBookRequests') + NL + 'return submitBookRequests;')(
    e.DATA, e.state, async () => {}, async () => e.rec, async () => {},
    async () => null, () => null, m => e.말.push(m), () => {}, () => '2026-09-13');
  e.state.bookReqPicked = ['K2-01-E-0001'];
  await G();
  봄('🔴 저장이 막히면 화면에도 안 담기고 그렇다고 말한다',
    [e.DATA.problemBank.length, e.rec.wrongHomework.length, /보내지 못했습니다/.test(e.말[e.말.length-1])],
    [0, 0, true]);
  봄('아무것도 안 담고 누르면 그렇다고 말한다', await (async () => {
    const f = 만들기(false); f.state.bookReqPicked = [];
    await f.F(); return [f.쓴것.length, /담아 주세요/.test(f.말[0])];
  })(), [0, true]);
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
}

console.log(NL + (fail ? '🔴 ' + fail + '개 실패 · ' : '✓ 전부 통과 · ') + pass + '개' + NL);
process.exit(fail ? 1 : 0);
