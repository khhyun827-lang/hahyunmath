// 「교재 요청은 창고로 간다」 — 검토 대기의 두 갈래를 하나로 (2026-09-21)
//
//   node tools/bookreq-store-test.mjs
//
// 🔴 **왜** — 학생이 교재에서 부른 문항은 AI 가 만든 것을 문항에 직접 채웠다. 그러면 검토 대기에
//    «시험지 문항»과 «창고 변형»이 섞여 아랫줄 단추가 달랐고(E 공개·R·삭제 vs E 통과·X·D·A),
//    AI 검토(A)가 없었고, 통과해도 창고에 안 남아 다음에 같은 문제를 부르면 또 만들어야 했다.
//    ⇒ 교재 요청은 창고의 «검토 대기» 변형으로 세우고, 통과하면 기다리던 문항에 붙어 나간다.
//
// ⚠ 셋을 본다 — ① R 이 창고 길로 간다 ② 통과가 기다리던 문항을 채워 공개한다 ③ 시험지 문항은 예전 그대로다.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const NL = String.fromCharCode(10);

function lift(name, kind = 'function') {
  const at = html.indexOf(kind + ' ' + name + '(');
  if (at < 0) throw new Error(name + ' 를 못 찾았습니다');
  let depth = 0;
  for (let j = html.indexOf('{', at); j < html.length; j++) {
    if (html[j] === '{') depth++;
    else if (html[j] === '}') { depth--; if (!depth) return html.slice(at, j + 1); }
  }
  throw new Error(name + ' 의 끝을 못 찾았습니다');
}
function liftConst(n) {
  const at = html.indexOf('const ' + n + ' = ');
  if (at < 0) throw new Error(n + ' 을 못 찾았습니다');
  const end = html.indexOf(NL + '];', at);
  return html.slice(at, end + 3);
}

let pass = 0, fail = 0;
const 봄 = (무엇, 나온것, 나와야) => {
  const ok = JSON.stringify(나온것) === JSON.stringify(나와야);
  if (ok) { pass++; console.log('  ✓ ' + 무엇); }
  else { fail++; console.log(`  ✗ ${무엇}\n      나온 것: ${JSON.stringify(나온것)}\n      나와야:  ${JSON.stringify(나와야)}`); }
};

/* ── 가짜 세상 — 창고 변형·문항·DB 쓰기 ── */
const stubs = `
  const ITEM_CODE_RE = /^(K\\d)-(\\d\\d)-([A-Z])-(\\d{4})(?:-([A-Z])(\\d\\d))?$/;
  const srcCodeInfo = () => null;
  const state = { variants: __variants, itemBody: {}, itemByCode: {}, reviewQueue: 'pending', aiProcessing: false };
  const DATA = { problemBank: __bank };
  const openReports = () => [];
  const answerFormProblem = () => null;
  const dqAnswerable = () => true;
  const nowStamp = () => '2026-09-21 10:00';
  const showToast = m => __toasts.push(m);
  const render = () => {};
  const notifyWrongReady = ids => __notified.push(...ids);
  const logAudit = async () => {};
  const loadItemStoreIfNeeded = async () => {};
  const reviewPickNext = () => null;
  const reviewSelectWalk = () => {};
  const requestVariantForCode = async (code) => { __asked.push(code); };
  const applyTwinToBank = async (b, twin) => { b.variantContent = twin.content; b.variantAnswer = twin.answer; };
  const generateTwinViaAI = async () => ({ content: '쌍둥이', answer: '3' });
  const getAIQuotaUsed = async () => 0;
  const AI_DAILY_LIMIT = 20;
  const aiSleep = async () => {};
  const dbGet = async () => null;
  const twinFigureDoc = () => ({});
  const bankOriginal = () => ({ content: '원본', answer: '1' });
  async function dbSetDoc(c, id, data){ __db[c + '/' + id] = JSON.parse(JSON.stringify(data)); return true; }
  function variantsOfCodeAll(code){ return (state.variants[code] || []); }
`;
const src = stubs + NL + [
  lift('splitItemCode'), lift('variantsOfCode'), lift('variantsLive'), lift('variantIsPending'),
  lift('pendingVariants'), lift('nextVariantCode'),
  lift('bankIsBookReq'), lift('bankRootOf'), lift('codeVariantFor'),
  liftConst('REVIEW_QUEUES'), lift('reviewQueueList'),
  lift('fillEmptyFromStore', 'async function'), lift('approveAutoVariant', 'async function'),
  lift('storeTwinAsPending', 'async function'),
  lift('regenerateOneWithAI', 'async function'), lift('runTwinBatch', 'async function'),
].join(NL) + NL + 'return { bankIsBookReq, bankRootOf, approveAutoVariant, regenerateOneWithAI, runTwinBatch, fillEmptyFromStore, state, DATA };';

const make = () => {
  const w = { variants: {}, bank: [], db: {}, toasts: [], notified: [], asked: [] };
  w.G = new Function('__variants', '__bank', '__db', '__toasts', '__notified', '__asked', src)(
    w.variants, w.bank, w.db, w.toasts, w.notified, w.asked);
  return w;
};
const 교재요청 = (id, code) => ({ id, examId: '', itemCode: code, source: 'bookreq', status: 'pending', variantContent: '', variantAnswer: '' });
const 시험지문항 = (id) => ({ id, examId: 'ex1', questionNo: 3, status: 'pending', variantContent: '', variantAnswer: '' });

console.log('교재 요청은 창고로 —' + NL);

/* ① R — 교재 요청이면 문항에 안 채우고 창고 길(requestVariantForCode)로 간다 */
{
  const w = make();
  w.bank.push(교재요청('pb1', 'K2-05-E-0471'));
  봄('① 교재 요청을 알아본다 (examId 빈 것 + 코드)', [w.G.bankIsBookReq(w.bank[0]), w.G.bankIsBookReq(시험지문항('x'))], [true, false]);
  봄('① 변형 코드가 붙어 있어도 뿌리로 간다', w.G.bankRootOf({ itemCode: 'K2-05-E-0471-N02', examId: '' }), 'K2-05-E-0471');
  await w.G.regenerateOneWithAI('pb1');
  봄('① 🔴 R 이 창고 길로 간다', w.asked, ['K2-05-E-0471']);
  봄('① 문항에는 안 채운다 (내용 없음에 그대로 선다)', w.bank[0].variantContent, '');
}

/* ② 통과 — 그 코드를 기다리던 빈 교재 요청을 채워 공개한다 */
{
  const w = make();
  w.bank.push(교재요청('pb1', 'K2-05-E-0471'), 교재요청('pb2', 'K2-05-E-0480'));
  w.variants['K2-05-E-0471'] = [{ code: 'K2-05-E-0471-N01', originCode: 'K2-05-E-0471', variantKind: 'N',
    content: '변형', answer: '2', pending: true }];
  await w.G.approveAutoVariant('K2-05-E-0471-N01');
  봄('② 변형은 창고에 «통과»로 남는다', [!!w.db['variants/K2-05-E-0471-N01'], w.db['variants/K2-05-E-0471-N01'].pending], [true, undefined]);
  봄('② 🔴 기다리던 문항이 채워져 공개된다', [w.bank[0].variantContent, w.bank[0].status, w.bank[0].variantCode], ['변형', 'approved', 'K2-05-E-0471-N01']);
  봄('② 그 학생에게 알린다', w.notified, ['pb1']);
  봄('② 다른 코드의 요청은 손대지 않는다', [w.bank[1].variantContent, w.bank[1].status], ['', 'pending']);
  봄('② 통과 말에 채운 것을 붙인다', /교재 요청 1문항도 채워 공개/.test(w.toasts[w.toasts.length - 1]), true);
}

/* ② -b 기다리는 문항이 없으면 예전 말 그대로다 — «채웠다»고 거짓말하지 않는다 */
{
  const w = make();
  w.variants['K2-05-E-0471'] = [{ code: 'K2-05-E-0471-N01', originCode: 'K2-05-E-0471', variantKind: 'N', content: '변형', answer: '2', pending: true }];
  await w.G.approveAutoVariant('K2-05-E-0471-N01');
  봄('② 기다리는 것이 없으면 통과 말은 예전 그대로', w.toasts, ['K2-05-E-0471-N01 를 창고에 넣었습니다 — 이제 학생에게 나갑니다.']);
}

/* ③ 일괄 「AI로 채우기」 — 교재 요청은 창고로, 시험지 문항은 예전대로 문항에 */
{
  const w = make();
  w.bank.push(교재요청('pb1', 'K2-05-E-0471'), 시험지문항('pb2'));
  w.G.state.itemBody['K2-05-E-0471'] = { content: '원본', answer: '1' };
  await w.G.runTwinBatch(w.bank.slice(), '');
  봄('③ 🔴 교재 요청은 창고의 검토 대기 변형이 된다', [w.bank[0].variantContent, !!w.db['variants/K2-05-E-0471-N01'], w.db['variants/K2-05-E-0471-N01'].pending], ['', true, true]);
  봄('③ 시험지 문항은 예전 그대로 문항에 채운다', [w.bank[1].variantContent, Object.keys(w.db).filter(k => k.startsWith('variants/')).length], ['쌍둥이', 1]);
}

console.log(NL + `${pass} 통과 · ${fail} 실패`);
process.exit(fail ? 1 : 0);
