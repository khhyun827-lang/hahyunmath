// 「남는 한도로 창고 채우기」 검사 (2026-09-06)
//
//   node tools/autofill-test.mjs
//
// 🔴 **DB 도 워커도 안 건드린다** — index.html 에서 고리를 글자로 떼어 와 스텁으로 돌린다.
//    이 고리는 **사람이 안 보는 동안 한도를 쓰는** 코드다. 이 프로젝트에서 가장 조심해야 할
//    종류라, 화면으로 눌러 보는 것으로는 못 보는 것들을 여기서 붙든다:
//      · 담을 수 없는 문항에 **같은 한도를 되풀이해 쏟지 않는가** (제일 중요하다)
//      · 한도가 다 됐는데 계속 두드리지 않는가
//      · 저장이 막혔을 때 스스로 멈추는가

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

function liftBlock() {
  const from = html.indexOf('const AUTOFILL_KEY');
  const at = html.indexOf('async function autoFillTick(', from);
  if (from < 0 || at < 0) throw new Error('고리를 못 찾았습니다');
  let depth = 0;
  for (let j = html.indexOf('{', at); j < html.length; j++) {
    if (html[j] === '{') depth++;
    else if (html[j] === '}') { depth--; if (!depth) return html.slice(from, j + 1); }
  }
  throw new Error('autoFillTick 의 끝을 못 찾았습니다');
}
const BLOCK = liftBlock();

let pass = 0, fail = 0;
const 봄 = (무엇, 나온것, 나와야할것) => {
  const ok = JSON.stringify(나온것) === JSON.stringify(나와야할것);
  if (ok) { pass++; console.log('  ✓ ' + 무엇); }
  else { fail++; console.log(`  ✗ ${무엇}\n      나온 것: ${JSON.stringify(나온것)}\n      나와야:  ${JSON.stringify(나와야할것)}`); }
};

/* 스텁 세상. twin 은 «다음에 무엇을 돌려줄지»를 시험이 정한다. */
function makeWorld({ itemBody = {}, variants = {}, twin = null, used = 0, saveOk = true } = {}) {
  const store = new Map();
  const w = { 부른AI: [], 쓴것: [], 예약: [], twin, used, saveOk };
  const itemByCode = {};
  for (const c in itemBody) itemByCode[c] = { code: c };
  const state = {
    currentUser: { type: 'teacher' }, aiProcessing: false, aiQuotaUsed: null,
    itemByCode, itemBody, variants, autoFill: null,
  };
  const api = new Function(
    'state', 'render', 'localStorage', 'setTimeout', 'clearTimeout',
    'splitItemCode', 'loadItemStoreIfNeeded', 'getAIQuotaUsed', 'AI_DAILY_LIMIT',
    'generateTwinViaAI', 'dqAnswerable', 'nextVariantCode', 'dbSetDoc', 'nowStamp', 'console',
    BLOCK + '\nreturn { autoFillTick, autoFillCandidates, autoFillState, autoFillToggle, skipped: autoFillSkipped };'
  )(
    state,
    () => {},
    { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, v), removeItem: k => store.delete(k) },
    (fn, ms) => { w.예약.push(ms); return 1; },          // 타이머는 «걸었다»만 적고 안 돌린다
    () => {},
    (c) => ({ origin: c.replace(/-[NUD]\d+$/, ''), isVariant: /-[NUD]\d+$/.test(c) }),
    async () => {},
    async () => w.used,
    20,
    async (content, answer) => { w.부른AI.push({ content, answer }); return w.twin; },
    (content, answer) => (/^[①②③④⑤]$/.test(answer) || /^-?\d+$/.test(answer)) ? answer : null,
    (root, kind) => root + '-' + kind + '01',
    async (coll, id, doc) => { if (!w.saveOk) return null; w.쓴것.push({ coll, id, doc }); return true; },
    () => '2026-09-06 12:00',
    { warn(){}, error(){}, log(){} },
  );
  api.autoFillState().on = true;
  return Object.assign(w, api, { state });
}
const 본문 = (n) => { const o = {}; for (let i = 1; i <= n; i++) o['K2-01-E-' + String(i).padStart(4,'0')] = { content: '본문' + i, answer: '③' }; return o; };

console.log('\n남는 한도로 창고 채우기\n');

// ── ① 누구를 고르는가 ────────────────────────────────────────────────
{
  const w = makeWorld({
    itemBody: {
      'K2-01-E-0001': { content: '본문', answer: '③' },      // ✔
      'K2-01-E-0002': { content: '본문' },                    // 정답 없음 → 워커가 거절한다
      'K2-01-E-0003': { answer: '③' },                        // 본문 없음
      'K2-01-E-0004': { content: '본문', answer: '$12$' },    // ✔
      'K2-01-E-0004-N01': { content: '본문', answer: '③' },   // 변형의 변형은 안 만든다
    },
    variants: { 'K2-01-E-0004': [{ code: 'K2-01-E-0004-N01', variantKind: 'N' }] },  // 이미 N 있음
  });
  봄('본문과 정답이 다 있고 N 이 없는 것만 고른다', w.autoFillCandidates(), ['K2-01-E-0001']);
}
{
  const w = makeWorld({
    itemBody: { 'K2-01-E-0001': { content: 'a', answer: '③' } },
    variants: { 'K2-01-E-0001': [{ code: 'K2-01-E-0001-U01', variantKind: 'U' }] },
  });
  봄('U 만 있으면 아직 채울 것이다', w.autoFillCandidates(), ['K2-01-E-0001']);
}

// ── ② 잘 만들어졌을 때 ───────────────────────────────────────────────
{
  const w = makeWorld({ itemBody: 본문(3), twin: { content: '새 문제', answer: '②', solution: '풀이' } });
  await w.autoFillTick();
  봄('한 번에 한 건만 만든다', w.부른AI.length, 1);
  봄('창고에 넣는다', w.쓴것[0].coll, 'variants');
  봄('코드는 N01 이다', w.쓴것[0].id, 'K2-01-E-0001-N01');
  봄('«자동으로 만든 것»이라고 적어 둔다', w.쓴것[0].doc.auto, true);
  봄('담은 수를 센다', w.autoFillState().done, 1);
  봄('다음 것을 예약한다', w.예약.length >= 1, true);
  봄('메모리 창고에도 얹는다 — 다음 바퀴에 또 안 뽑히게',
     w.state.variants['K2-01-E-0001'].map(v => v.code), ['K2-01-E-0001-N01']);
}

// ── ③ 🔴 여기가 이 검사의 요점 — 못 담는 문항에 한도를 되풀이 쏟지 않는가 ──
{
  const w = makeWorld({ itemBody: 본문(3), twin: { content: '새 문제', answer: '②', needsFigure: true } });
  await w.autoFillTick();
  봄('그림이 필요한 변형은 안 담는다', w.쓴것.length, 0);
  봄('🔴 건너뛴 것으로 적어 둔다', w.skipped.has('K2-01-E-0001'), true);
  봄('🔴 그래서 다음 바퀴에는 그 문항이 안 뽑힌다', w.autoFillCandidates()[0], 'K2-01-E-0002');
}
{
  const w = makeWorld({ itemBody: 본문(3), twin: { content: '새 문제', answer: '$\frac{1}{2}$' } });
  await w.autoFillTick();
  봄('학생이 칠 수 없는 답은 안 담는다', w.쓴것.length, 0);
  봄('🔴 이것도 건너뛴 것으로 적는다', w.skipped.has('K2-01-E-0001'), true);
  봄('건너뛴 수를 센다', w.autoFillState().skipped, 1);
}

// ── ④ 한도·저장이 막혔을 때 ──────────────────────────────────────────
{
  const w = makeWorld({ itemBody: 본문(3), used: 20 });
  await w.autoFillTick();
  봄('한도를 다 썼으면 AI 를 안 부른다', w.부른AI.length, 0);
  봄('그래도 다시 볼 약속은 남긴다 (날이 바뀐다)', w.예약[0] >= 600000, true);
}
{
  const w = makeWorld({ itemBody: 본문(3), twin: { content: 'x', answer: '②' }, saveOk: false });
  await w.autoFillTick();
  봄('🔴 저장이 막히면 스스로 멈춘다', w.autoFillState().on, false);
  봄('왜 멈췄는지 말한다', /넣지 못해 멈췄습니다/.test(w.autoFillState().msg), true);
}
{
  const w = makeWorld({ itemBody: {}, twin: { content: 'x', answer: '②' } });
  await w.autoFillTick();
  봄('채울 것이 없으면 AI 도 안 부르고 타이머도 안 건다', [w.부른AI.length, w.예약.length], [0, 0]);
  봄('다 찼다고 말한다', /다 찼습니다/.test(w.autoFillState().msg), true);
}
{
  const w = makeWorld({ itemBody: 본문(3), twin: { content: 'x', answer: '②' } });
  w.state.aiProcessing = true;                     // 강사가 「하나 다시 생성」을 누른 중
  await w.autoFillTick();
  봄('다른 AI 작업 중이면 비켜선다', w.부른AI.length, 0);
  봄('비켜서고 다시 온다', w.예약.length, 1);
}
{
  const w = makeWorld({ itemBody: 본문(3), twin: { content: 'x', answer: '②' } });
  w.state.currentUser = { type: 'student' };
  await w.autoFillTick();
  봄('학생 화면에서는 안 돈다', w.부른AI.length, 0);
}

console.log(`\n  ${fail ? '🔴' : '✅'} ${pass} 통과 · ${fail} 실패\n`);
process.exit(fail ? 1 : 0);
