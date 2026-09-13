// 신고·오답이 «어디 사는가» — 학생은 제 기록에만 쓴다 (2026-09-13 · K-19)
//
//   node tools/report-move-test.mjs
//
// 🔴 **무엇을 재는가** — 사용자 신고에서 시작했다: 「눌러봤는데 요청을 내보내지 못했다 라고뜨는데?」
//   그것(K-18)을 고치다 **같은 흠이 세 군데 더** 있는 것이 드러났다:
//     ① 오류 신고(`sendReport`)        — `b.reports` 를 problembank 에 썼다 → 403
//     ② 신고 확인(`ackReports`)        — 같은 자리, 조용히
//     ③ 오답 제출(`submitWrongAnswers`) — 문항을 세우거나 창고 변형으로 채우려 했다 → 403, 반환값도 안 봤다
//   규칙이 `match /problembank/{doc} … allow write: if isTeacher()` 라서 전부 학생에게 막힌다.
//   **그리고 그 규칙이 옳다** — 내용을 `value` 한 칸의 JSON 으로 넣으므로 규칙이 그 «안»을 못 본다.
//   ⇒ 학생은 **제 기록**(`records/{uid}` · `isMine`)에만 쓴다. 세우고 채우는 일은 강사가 한다.
//
// ⚠ 함수를 여기에 옮겨 적지 않는다 — index.html 에서 그대로 뜬다.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/\r\n/g, '\n');
const rules = fs.readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8').replace(/\r\n/g, '\n');
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
/* ⚠ 주석은 «덩어리»로 걷는다 — 줄머리만 보면 `/* … *​/` 한가운데 줄이 남는다
   (이 판에서 실제로 여섯 번 물렸다: 덫이 내 «주석»을 붙잡고 통과했다). */
const 알맹이 = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

let pass = 0, fail = 0;
const 봄 = (무엇, 나온것, 나와야) => {
  const ok = JSON.stringify(나온것) === JSON.stringify(나와야);
  if (ok) pass++; else fail++;
  console.log((ok ? '  ✓ ' : '  🔴 ') + 무엇 +
    (ok ? '' : NL + '      나온 것 ' + JSON.stringify(나온것) + NL + '      나와야 ' + JSON.stringify(나와야)));
};

const 잣대 = [lift('reportsOfRecords'), lift('allReports'), lift('openReports')].join(NL);

/* ═══ ① 신고가 사는 자리가 «둘»이다 ═══ */
console.log(NL + '① 신고는 두 군데에 산다 — 옛것은 문항에, 새것은 학생 기록에' + NL);
{
  const 옛신고 = { id: 'old1', sid: 's9', face: 'orig', done: false };
  const b = { id: 'b1', reports: [옛신고] };
  const 빈문항 = { id: 'b2', reports: [] };

  /* 강사 판 — 기록을 다 읽어 온 상태 */
  const 강사 = {
    allRecords: {
      s1: { reports: [{ id: 'r1', bankId: 'b1', sid: 's1', face: 'K2-01-E-0001-N01', done: false }] },
      s2: { reports: [{ id: 'r2', bankId: 'b2', sid: 's2', face: 'orig', done: false },
                      { id: 'r3', bankId: 'b1', sid: 's2', face: 'orig', done: true }] }
    }
  };
  const T = new Function('state', 'DATA', 잣대 + NL +
    'return { allReports, openReports };')(강사, { records: {} });

  봄('🔴 옛 신고가 안 사라진다 — 둘을 합쳐 본다',
    T.allReports(b).map(r => r.id).sort(), ['old1', 'r1', 'r3']);
  봄('🔴 다른 문항의 신고는 안 섞인다 (bankId 로 가른다)',
    T.allReports(빈문항).map(r => r.id), ['r2']);
  봄('처리된 것은 «열린 것»에서 빠진다',
    T.openReports(b).map(r => r.id).sort(), ['old1', 'r1']);
  봄('신고가 없는 문항은 빈 배열', T.openReports({ id: 'b3' }), []);
  봄('문항이 없으면 빈 배열', T.allReports(null), []);

  /* 학생 판 — `state.allRecords` 는 비어 있다(남의 기록은 못 읽는다) */
  const 학생 = { allRecords: {}, currentUser: { studentId: 's1' } };
  const S = new Function('state', 'DATA', 잣대 + NL + 'return { allReports, openReports };')(
    학생, { records: { s1: { reports: [{ id: 'r1', bankId: 'b1', sid: 's1', done: false }] } } });
  봄('🔴 학생 화면은 «제 기록»만 얹는다 (남의 기록은 못 읽는다)',
    S.allReports(b).map(r => r.id).sort(), ['old1', 'r1']);
  봄('🔴 다른 학생의 신고는 학생 화면에 안 뜬다',
    S.allReports(빈문항).map(r => r.id), []);
  /* 🔴 이 덫이 없으면 `state.allRecords` 를 «있는 셈» 치고 짠 판이 통과한다 */
  const S0 = new Function('state', 'DATA', 잣대 + NL + 'return { allReports };')(
    { allRecords: {}, currentUser: null }, { records: {} });
  봄('로그인 전에도 안 엎어진다', S0.allReports(b).map(r => r.id), ['old1']);
}

/* ═══ ② 닫을 때도 «그 자리»에 적는다 ═══ */
console.log(NL + '② 닫기 — 신고가 사는 자리에 적는다' + NL);
function 닫기판(옵션) {
  const o =옵션 || {};
  const 쓴것 = { bank: 0, rec: [] };
  const state = { allRecords: o.allRecords || {} };
  const DATA = { records: o.records || {} };
  const dbSetDoc = async () => { 쓴것.bank++; return o.bankFail ? null : true; };
  const loadRecord = async sid => DATA.records[sid] || null;
  const saveRecordAsTeacher = async sid => { 쓴것.rec.push(sid); return o.recFail ? null : true; };
  const nowStamp = () => '2026-09-13 10:00';
  const f = new Function('state', 'DATA', 'dbSetDoc', 'loadRecord', 'saveRecordAsTeacher', 'nowStamp',
    잣대 + NL + lift('closeReports') + NL + 'return closeReports;')(
    state, DATA, dbSetDoc, loadRecord, saveRecordAsTeacher, nowStamp);
  return { f, 쓴것, state, DATA };
}
{
  /* 새 신고 하나 — 학생 기록에만 쓴다 */
  {
    const rec = { reports: [{ id: 'r1', bankId: 'b1', sid: 's1', face: 'orig', done: false }] };
    const { f, 쓴것 } = 닫기판({ allRecords: { s1: rec }, records: { s1: rec } });
    const ok = await f({ id: 'b1' }, 'fixed');
    봄('🔴 새 신고를 닫으면 «그 학생 기록»에 쓴다', [ok, 쓴것.rec], [true, ['s1']]);
    봄('🔴 그때 문항 창고는 안 쓴다 (강사여도 쓸 까닭이 없다)', 쓴것.bank, 0);
    봄('닫힌 자국이 남는다', [rec.reports[0].done, rec.reports[0].how, rec.reports[0].doneAt],
      [true, 'fixed', '2026-09-13 10:00']);
  }
  /* 옛 신고 하나 — 문항에 쓴다 */
  {
    const b = { id: 'b1', reports: [{ id: 'old1', sid: 's9', face: 'orig', done: false }] };
    const { f, 쓴것 } = 닫기판({});
    const ok = await f(b, 'ok');
    봄('🔴 옛 신고를 닫으면 «문항»에 쓴다', [ok, 쓴것.bank, 쓴것.rec], [true, 1, []]);
    봄('옛 신고에도 자국이 남는다', b.reports[0].how, 'ok');
  }
  /* 둘이 섞여 있으면 둘 다 */
  {
    const b = { id: 'b1', reports: [{ id: 'old1', sid: 's9', done: false }] };
    const rec = { reports: [{ id: 'r1', bankId: 'b1', sid: 's1', done: false }] };
    const { f, 쓴것 } = 닫기판({ allRecords: { s1: rec }, records: { s1: rec } });
    봄('🔴 섞여 있으면 두 자리에 다 쓴다',
      [await f(b, 'fixed'), 쓴것.bank, 쓴것.rec], [true, 1, ['s1']]);
  }
  /* 한 학생이 둘을 신고했어도 그 학생 기록은 «한 번만» 쓴다 */
  {
    const rec = { reports: [
      { id: 'r1', bankId: 'b1', sid: 's1', face: 'orig', done: false },
      { id: 'r2', bankId: 'b1', sid: 's1', face: 'x-N01', done: false }] };
    const { f, 쓴것 } = 닫기판({ allRecords: { s1: rec }, records: { s1: rec } });
    await f({ id: 'b1' }, 'fixed');
    봄('🔴 한 사람 기록은 한 번만 쓴다 (사람별로 모은다)', 쓴것.rec, ['s1']);
    봄('그래도 둘 다 닫힌다', rec.reports.map(r => !!r.done), [true, true]);
  }
  /* 두 학생이면 두 번 */
  {
    const r1 = { reports: [{ id: 'r1', bankId: 'b1', sid: 's1', done: false }] };
    const r2 = { reports: [{ id: 'r2', bankId: 'b1', sid: 's2', done: false }] };
    const { f, 쓴것 } = 닫기판({ allRecords: { s1: r1, s2: r2 }, records: { s1: r1, s2: r2 } });
    await f({ id: 'b1' }, 'fixed');
    봄('사람이 둘이면 두 기록에 쓴다', 쓴것.rec.sort(), ['s1', 's2']);
  }
  /* 🔴 저장이 엎어지면 되돌려 «열어» 둔다 */
  {
    const rec = { reports: [{ id: 'r1', bankId: 'b1', sid: 's1', done: false }] };
    const { f } = 닫기판({ allRecords: { s1: rec }, records: { s1: rec }, recFail: true });
    const ok = await f({ id: 'b1' }, 'fixed');
    봄('🔴 저장이 막히면 «닫혔다»고 안 한다', ok, false);
    봄('🔴 그리고 되돌려 열어 둔다 — 다시 처리할 수 있어야 한다',
      [rec.reports[0].done, rec.reports[0].how], [undefined, undefined]);
  }
  {
    const b = { id: 'b1', reports: [{ id: 'old1', sid: 's9', done: false }] };
    const { f } = 닫기판({ bankFail: true });
    봄('🔴 문항 저장이 막혀도 마찬가지다', [await f(b, 'ok'), b.reports[0].done], [false, undefined]);
  }
  /* 얼굴 하나만 닫기 (「이 문제 빼기」) */
  {
    const rec = { reports: [
      { id: 'r1', bankId: 'b1', sid: 's1', face: 'orig', done: false },
      { id: 'r2', bankId: 'b1', sid: 's1', face: 'x-N01', done: false }] };
    const { f } = 닫기판({ allRecords: { s1: rec }, records: { s1: rec } });
    await f({ id: 'b1' }, 'removed', r => r.face === 'orig');
    봄('🔴 고른 얼굴만 닫는다', rec.reports.map(r => !!r.done), [true, false]);
  }
  /* bankSave:false — 문항 저장은 부르는 쪽에 맡긴다 */
  {
    const b = { id: 'b1', reports: [{ id: 'old1', sid: 's9', face: 'orig', done: false }] };
    const { f, 쓴것 } = 닫기판({});
    const ok = await f(b, 'removed', null, false);
    봄('🔴 bankSave 를 끄면 문항을 «여기서» 안 쓴다 (같은 문서를 두 번 쓰지 않는다)',
      [ok, 쓴것.bank], [true, 0]);
    봄('그래도 자국은 찍어 둔다 — 부르는 쪽이 그 문서를 저장한다', b.reports[0].done, true);
  }
  /* 닫을 것이 없으면 아무것도 안 쓴다 */
  {
    const { f, 쓴것 } = 닫기판({});
    봄('닫을 것이 없으면 아무 데도 안 쓴다',
      [await f({ id: 'b1', reports: [] }, 'ok'), 쓴것.bank, 쓴것.rec], [true, 0, []]);
  }
}

/* ═══ ③ 「세워 주세요」 — 문항 줄이 없을 때 ═══ */
console.log(NL + '③ 문항 줄이 없는 오답 — 학생은 «부르고», 강사가 «세운다»' + NL);
{
  const A = new Function('todayStr',
    lift('bankAsksOf') + NL + lift('bankAskAdd') + NL + 'return { bankAsksOf, bankAskAdd };')(
    () => '2026-09-13');
  const rec = {};
  봄('처음 부르면 담긴다', [A.bankAskAdd(rec, 'e1', '0-3'), A.bankAsksOf(rec).length], [true, 1]);
  봄('🔴 같은 것을 또 부르면 안 담긴다', [A.bankAskAdd(rec, 'e1', '0-3'), A.bankAsksOf(rec).length], [false, 1]);
  봄('🔴 형이 다르면 다른 문제다 (번호만으로 가르지 않는다)',
    [A.bankAskAdd(rec, 'e1', 'B-3'), A.bankAsksOf(rec).length], [true, 2]);
  봄('시험지가 다르면 다른 문제다', [A.bankAskAdd(rec, 'e2', '0-3'), A.bankAsksOf(rec).length], [true, 3]);
  봄('빈 값은 안 담는다', [A.bankAskAdd(rec, '', '0-3'), A.bankAskAdd(rec, 'e1', ''), A.bankAskAdd(null, 'e1', '3')],
    [false, false, false]);

  /* 강사 쪽 — 모으기 */
  const DATA = { exams: [{ id: 'e1', title: '9월 모의고사' }],
                 problemBank: [{ examId: 'e1', qkey: 'B-3' }] };
  /* 🔴 **두 잣대가 «갈리는» 본보기라야 한다** (이 판에서 여러 번 물렸다).
     오래 기다린 줄(0-7)은 **사람이 하나**, 늦게 부른 줄(0-3)은 **둘**이다 —
     사람 수로 세우면 순서가 뒤집힌다. 그리고 0-3 은 **나중 날을 나중에** 만난다(s1=11일, s2=12일)
     — 「제일 먼저 부른 날」을 안 고르고 그냥 덮으면 12일이 남는다.
     ⚠ 반대로 두면(s1=12일, s2=11일) 덮어쓰는 판도 11일이 나와 **덫이 안 문다**(실제로 안 물었다). */
  const state = { allRecords: {
    s1: { bankAsks: [{ examId: 'e1', qkey: '0-3', at: '2026-09-11' },
                     { examId: 'e1', qkey: 'B-3', at: '2026-09-12' }] },
    s2: { bankAsks: [{ examId: 'e1', qkey: '0-3', at: '2026-09-12' }] },
    s3: { bankAsks: [{ examId: 'e1', qkey: '0-7', at: '2026-09-10' }] } } };
  const P = new Function('state', 'DATA',
    [lift('bankAsksOf'), lift('examRootId'), lift('findBankEntry'),
     lift('bankAskPending'), lift('bankAskLabelOf')].join(NL) + NL +
    'return { bankAskPending, bankAskLabelOf };')(state, DATA);
  const 부름 = P.bankAskPending();
  봄('🔴 같은 번호를 부른 사람을 한 줄로 모은다',
    부름.map(g => [g.qkey, g.who.length]), [['0-7', 1], ['0-3', 2]]);
  봄('🔴 오래 기다린 것이 위로 (사람 수가 아니라 «언제»다)', 부름.map(g => g.qkey), ['0-7', '0-3']);
  봄('🔴 이미 줄이 선 것은 저절로 빠진다 (B-3)', 부름.some(g => g.qkey === 'B-3'), false);
  봄('🔴 제일 먼저 부른 날을 남긴다 (나중 날을 먼저 만나도)', 부름.map(g => g.at), ['2026-09-10', '2026-09-11']);
  봄('🔴 형이 있으면 이름에 형을 적는다', P.bankAskLabelOf({ examId: 'e1', qkey: 'B-15' }), '9월 모의고사 · TYPE B 15번');
  봄('형이 하나뿐이면 번호만', P.bankAskLabelOf({ examId: 'e1', qkey: '0-15' }), '9월 모의고사 · 15번');
  봄('시험지가 지워졌으면 그렇게 말한다', P.bankAskLabelOf({ examId: 'zz', qkey: '0-1' }), '(삭제된 시험지) · 1번');
}

/* ═══ ④ 학생이 문항 창고를 안 쓴다 ═══ */
console.log(NL + '④ 학생이 닿는 자리에서 문항 창고(problembank)를 안 쓴다' + NL);
{
  /* 🔴 **이 덫이 맨 앞이다** — 이 흠이 «규칙을 잘못 읽어서» 생겼으니, 규칙을 붙든다. */
  봄('🔴 문항 창고는 강사만 쓴다 (firestore.rules)',
    /match \/problembank\/\{doc\} \{ allow read: if realAccount\(\); allow write: if isTeacher\(\); \}/.test(rules), true);
  봄('🔴 학생 제 기록은 제가 쓴다 (records)', /match \/records\/\{uid\}/.test(rules), true);

  const 학생함수 = ['sendReport', 'ackReports', 'submitWrongAnswers', 'submitHomeworkAnswer',
                    'submitBookRequests', 'cancelBookRequest', 'bankAskAdd'];
  for (const n of 학생함수)
    봄('🔴 ' + n + ' 은 문항 창고를 안 쓴다', 알맹이(lift(n)).includes("dbSetDoc('problembank'"), false);

  const 신고 = 알맹이(lift('sendReport'));
  봄('🔴 신고는 제 기록에 쓴다', 신고.includes('rec.reports') && 신고.includes('saveRecord(sid)'), true);
  봄('🔴 어느 문항인지 bankId 로 남긴다', 신고.includes('r.bankId = b.id'), true);
  봄('🔴 저장이 된 뒤에 «보냈다»고 한다', 신고.includes('if(!ok){') && 신고.includes('보내지 못했습니다'), true);
  봄('🔴 못 보냈으면 담은 것을 되돌린다', 신고.includes('rec.reports.filter(x=>x.id!==r.id)'), true);
  봄('🔴 확인(ack)도 제 기록에 찍는다', 알맹이(lift('ackReports')).includes('rec.reports'), true);

  const 오답 = 알맹이(lift('submitWrongAnswers'));
  봄('🔴 줄이 없으면 «세워 주세요»를 제 기록에 적는다', 오답.includes('bankAskAdd(rec, examId, String(no))'), true);
  봄('🔴 학생이 문항을 새로 세우지 않는다', 오답.includes('DATA.problemBank.push'), false);
  봄('🔴 학생이 변형을 채우지 않는다', 오답.includes('codeVariantFor'), false);
  봄('🔵 그래서 창고·보충문제를 여기서 안 읽는다 (읽기 한도)',
    오답.includes('loadUnitBankIfNeeded') || 오답.includes('loadVariantsIfNeeded'), false);
  봄('🔴 저장이 된 뒤에 «제출되었습니다»라고 한다',
    오답.includes('제출하지 못했습니다') && 오답.includes('const ok = await saveRecord(sid)'), true);
  봄('숙제는 그대로 붙는다', 오답.includes('rec.wrongHomework.push'), true);
  봄('빈 문항은 «기다림»으로 센다', 오답.includes('else 기다림++'), true);

  /* ⚠ 무거운 문은 강사 화면이 그대로 쓴다 — 통째로 지워지지 않았는지 본다 */
  봄('⚠ 보충문제 창고 자체는 그대로 있다', html.includes('async function loadUnitBankIfNeeded()'), true);
}

/* ═══ ⑤ 강사 화면에 «누를 데»가 있다 ═══ */
console.log(NL + '⑤ 강사 화면 — 세우는 자리와 채우는 자리' + NL);
{
  const 검토 = lift('teacherReviewHTML');
  봄('🔴 「세워 주세요」 띠가 검토 화면에 선다', 검토.includes('const askBar = !부름들.length'), true);
  봄('🔴 그 띠를 실제로 그린다', 검토.includes('${reqBar}${askBar}${aiBar}'), true);
  봄('누르면 세운다', 검토.includes('bankAskAccept('), true);
  봄('누가 냈는지 이름으로 적는다', 검토.includes('g.who.map(studentNameOf)'), true);
  봄('부름이 없으면 띠를 아예 안 그린다', 검토.includes("!부름들.length ? '' :"), true);
  봄('🔴 「창고에서 채우기」가 «내용 없음» 줄에 선다', 검토.includes('fillEmptyFromStore()'), true);
  봄('🔵 창고가 AI 보다 앞이다 (한도를 안 쓴다)',
    검토.indexOf('fillEmptyFromStore()') < 검토.indexOf('processAIQueue()'), true);
  봄('기록을 읽어야 부름이 보인다', 검토.includes('loadAllRecordsIfNeeded()'), true);

  const 세우기 = 알맹이(lift('bankAskAccept'));
  봄('🔴 못 세우면 부름을 «안» 지운다', 세우기.includes('요청은 그대로 두었습니다'), true);
  봄('세운 뒤에 부른 학생 전원에게 숙제를 붙인다', 세우기.includes('rec.wrongHomework.push'), true);
  봄('붙인 사람의 부름만 지운다', 세우기.includes('rec.bankAsks = bankAsksOf(rec).filter'), true);
  봄('🔴 창고에 검토된 변형이 있으면 채워서 바로 낸다', 세우기.includes('codeVariantFor(q.itemCode)'), true);
  봄('🔴 없으면 pending — 강사가 만들어 검토한다', 세우기.includes("status: v ? 'approved' : 'pending'"), true);
  봄('🔴 저장된 기록만 붙였다고 센다', 세우기.includes('saveRecordAsTeacher(sid) !== true'), true);

  const 채우기 = 알맹이(lift('fillEmptyFromStore'));
  봄('🔴 «무엇이 비었나»는 큐와 같은 잣대를 쓴다', 채우기.includes("reviewQueueList('empty')"), true);
  봄('🔴 저장이 막히면 되돌린다 (화면만 채워 놓지 않는다)', 채우기.includes('Object.assign(b, 되돌림)'), true);
  봄('🔴 채울 것이 없으면 그렇게 말한다', 채우기.includes('창고에 쓸 변형이 있는 문항이 없습니다'), true);

  /* 🔴 강사가 학생 기록을 쓰고 나면 «강사가 보는 그 기록»도 갈아 끼운다 */
  const 대신저장 = 알맹이(lift('saveRecordAsTeacher'));
  봄('🔴 저장이 된 뒤에만 갈아 끼운다', 대신저장.includes('ok === true && state.allRecords'), true);
  봄('🔴 교재 요청 받기도 그 문을 쓴다 (두 벌로 안 둔다)',
    알맹이(lift('bookReqAccept')).includes('saveRecordAsTeacher(sid)'), true);
  봄('🔴 신고 닫기도 그 문을 쓴다', 알맹이(lift('closeReports')).includes('saveRecordAsTeacher(sid)'), true);
}

/* ═══ ⑥ 학생에게 답이 돌아간다 ═══ */
console.log(NL + '⑥ 신고한 학생에게 답이 돌아간다' + NL);
{
  봄('🔴 닫히면 학생 카드에 한 줄이 뜬다', 알맹이(lift('reportAckHTML')).includes('allReports(b)'), true);
  봄('한 번 보면 사라진다 (ack)', 알맹이(lift('ackReports')).includes('r.ack = true'), true);
  봄('🔴 신고한 얼굴은 그 학생에게 다시 안 나간다', 알맹이(lift('dqFaces')).includes('openReports(b)'), true);
  봄('⚠ 남이 신고한 것까지는 못 막는다고 적어 두었다',
    lift('dqFaces').includes('«남이 신고한 것»까지는 못 막는다'), true);
  봄('🔴 강사가 빼면 모두에게 안 나간다', 알맹이(lift('dqFaces')).includes('blockedFaces'), true);
  봄('🔴 신고됨 줄이 여전히 맨 앞이다',
    html.indexOf("['reported', '신고됨'") < html.indexOf("['empty',    '내용 없음'"), true);
}

console.log(NL + (fail ? '🔴 ' + fail + '개 실패 · ' : '✓ 전부 통과 · ') + pass + '개' + NL);
process.exit(fail ? 1 : 0);
