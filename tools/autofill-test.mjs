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
/* groqUsed — 둘째 엔진(Groq) 통. 기본은 «다 찼다»(25)로 두어 옛 검사의 뜻(한도 다 쓰면 멈춘다)이 그대로 선다. */
function makeWorld({ itemBody = {}, variants = {}, twin = null, used = 0, groqUsed = 25, saveOk = true, 오류 = 'AI 가 안 됐다' } = {}) {
  const store = new Map();
  const w = { 부른AI: [], 쓴것: [], 예약: [], twin, used, groqUsed, saveOk };
  const itemByCode = {};
  for (const c in itemBody) itemByCode[c] = { code: c };
  const state = {
    currentUser: { type: 'teacher' }, aiProcessing: false, aiQuotaUsed: null,
    itemByCode, itemBody, variants, autoFill: null,
  };
  const api = new Function(
    'state', 'render', 'localStorage', 'setTimeout', 'clearTimeout',
    'splitItemCode', 'loadItemStoreIfNeeded', 'getAIQuotaUsed', 'AI_DAILY_LIMIT', 'GROQ_TWIN_DAILY_LIMIT', 'twinFigureDoc',
    'generateTwinViaAI', 'dqAnswerable', 'nextVariantCode', 'dbSetDoc', 'nowStamp',
    'escHtml', '마지막AI오류', 'console',
    /* 🔵 «변형 세기»가 두 곳(variants 컬렉션 + 교재가 준 items 변형)을 합쳐 본다 (2026-09-06).
       여기서는 그 합침을 스텁으로 흉내 낸다 — 이 검사가 재는 것은 «고리»지 합침 규칙이 아니다. */
    'variantsOfCodeAll',
    BLOCK + '\nreturn { autoFillTick, autoFillCandidates, autoFillState, autoFillToggle, autoFillWhyEmpty, skipped: autoFillSkipped, autoFillAsideNow, autoFillAsideBack };'
  )(
    state,
    () => {},
    { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, v), removeItem: k => store.delete(k) },
    (fn, ms) => { w.예약.push(ms); return 1; },          // 타이머는 «걸었다»만 적고 안 돌린다
    () => {},
    (c) => ({ origin: c.replace(/-[NUD]\d+$/, ''), isVariant: /-[NUD]\d+$/.test(c) }),
    async () => {},
    async (bucket) => bucket === 'twin-groq' ? w.groqUsed : w.used,
    20, 25,
    (twin) => ({ doc: null, why: '' }),
    /* groqTwin — Groq 로 물었을 때의 답(A-4). 안 정하면 twin 과 같다. */
    async (content, answer, image, engine) => { w.부른AI.push({ content, answer, engine: engine || '' });
      return engine === 'groq' && 'groqTwin' in w ? w.groqTwin : w.twin; },
    (content, answer) => (/^[①②③④⑤]$/.test(answer) || /^-?\d+$/.test(answer)) ? answer : null,
    (root, kind) => root + '-' + kind + '01',
    async (coll, id, doc) => { if (!w.saveOk) return null; w.쓴것.push({ coll, id, doc }); return true; },
    () => '2026-09-04 12:00',
    (s) => String(s), 오류,
    { warn(){}, error(){}, log(){} },
    (code) => [ ...(variants[code] || []),
      ...Object.keys(itemBody).filter(c => c.startsWith(code + '-')).map(c => ({ code: c, variantKind: (c.match(/-([NUD])/) || [])[1] })) ],
  );
  api.autoFillState().on = true;
  return Object.assign(w, api, { state, 넘김: () => JSON.parse(store.get('khm-autofill-aside') || '{}') });
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
  봄('🔴 검토 대기로 넣는다 — 바로 학생에게 안 간다', w.쓴것[0].doc.pending, true);
  봄('코드는 N01 이다', w.쓴것[0].id, 'K2-01-E-0001-N01');
  봄('«자동으로 만든 것»이라고 적어 둔다', w.쓴것[0].doc.auto, true);
  봄('만든 수를 센다', w.autoFillState().done, 1);
  봄('«검토에서 봐 달라»고 말한다', /검토/.test(w.autoFillState().msg), true);
  봄('다음 것을 예약한다', w.예약.length >= 1, true);
  봄('메모리 창고에도 얹는다 — 다음 바퀴에 또 안 뽑히게',
     w.state.variants['K2-01-E-0001'].map(v => v.code), ['K2-01-E-0001-N01']);
  봄('🔴 검토를 기다리는 것도 «있는 것»으로 세서 N02 를 또 안 만든다',
     w.autoFillCandidates().includes('K2-01-E-0001'), false);
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
  /* 🔴 **판단을 뒤집었다** (2026-09-07 · 사용자: 「한도가꽉차서 종료되면 자동채우기 버튼이
     풀렸으면 좋겠는데 계속 눌려진 상태가 돼」).
     예전에는 켜 둔 채 10분마다 다시 봤다 — 「날이 바뀌면 저절로 이어진다」는 뜻이었다.
     그런데 화면을 하루 종일 열어 둘 일이 없어서, 실제로 남는 것은
     «눌린 채 아무 일도 안 하는 단추»뿐이었다. 이제 끄고 내일 다시 켜게 한다. */
  봄('🔴 한도를 다 쓰면 스스로 멈춘다', w.autoFillState().on, false);
  봄('다음 바퀴를 예약하지 않는다', w.예약.length, 0);
  봄('왜 멈췄는지 말한다', /다 썼습니다/.test(w.autoFillState().msg), true);
}
// ── ④-b Gemini 가 다 차면 «글만 있는» 문항은 Groq 로 이어 간다 (2026-09-12 · 둘째 엔진) ──
{
  const body = 본문(2); body['K2-01-E-0003'] = { content: '그림 문항', answer: '③', image: { fileId: 'f' } };
  const w = makeWorld({ itemBody: body, used: 20, groqUsed: 0, twin: { content: 'x', answer: '②', engine: 'groq' } });
  await w.autoFillTick();
  봄('Gemini 가 찼어도 글 문항은 Groq 로 한 건 만든다', w.부른AI.length, 1);
  봄('그때 엔진은 groq 다', w.부른AI[0].engine, 'groq');
  봄('그림 문항이 아니라 글 문항을 골랐다', w.부른AI[0].content !== '그림 문항', true);
  봄('만든 변형에 engine 이 남는다', w.쓴것[0].doc.engine, 'groq');
  봄('멈추지 않고 다음 바퀴를 예약한다', w.autoFillState().on && w.예약.length === 1, true);
}
{
  const body = { 'K2-01-E-0003': { content: '그림 문항', answer: '③', image: { fileId: 'f' } } };
  const w = makeWorld({ itemBody: body, used: 20, groqUsed: 0 });
  await w.autoFillTick();
  봄('글 문항이 없으면 Groq 로도 안 간다 — 멈춘다', w.부른AI.length === 0 && w.autoFillState().on === false, true);
}
{
  const w = makeWorld({ itemBody: 본문(2), used: 20, groqUsed: 25 });
  await w.autoFillTick();
  봄('Groq 통도 찼으면 멈춘다', w.부른AI.length === 0 && w.autoFillState().on === false, true);
  봄('둘 다 찼다고 말한다', /Gemini 20건 · Groq 25건/.test(w.autoFillState().msg), true);
}
{
  const w = makeWorld({ itemBody: 본문(3), twin: { content: 'x', answer: '②' }, saveOk: false });
  await w.autoFillTick();
  봄('🔴 저장이 막히면 스스로 멈춘다', w.autoFillState().on, false);
  봄('왜 멈췄는지 말한다', /저장하지 못해 멈췄습니다/.test(w.autoFillState().msg), true);
}
{
  const w = makeWorld({ itemBody: {}, twin: { content: 'x', answer: '②' } });
  await w.autoFillTick();
  봄('채울 것이 없으면 AI 도 안 부르고 타이머도 안 건다', [w.부른AI.length, w.예약.length], [0, 0]);
  봄('장부가 비면 «본문부터»라고 말한다', /본문/.test(w.autoFillState().msg), true);
}

// ── ⑤ 🔴 «없다»의 까닭을 갈라 말하는가 (2026-09-06 · 사용자가 겪었다) ──
//    「N변형이 없는 문제가 없다고 다찼다고 뜨네」 — 실은 정답이 아직 안 담겨서 0이었다.
{
  const w = makeWorld({ itemBody: { 'K2-01-E-0001': { content: '본문' } } });   // 정답이 없다
  await w.autoFillTick();
  봄('🔴 정답이 없으면 «정답 채우기»를 가리킨다', /정답 채우기/.test(w.autoFillState().msg), true);
  봄('그때 «다 찼습니다»라고 하지 않는다', /다 찼습니다/.test(w.autoFillState().msg), false);
  봄('AI 도 안 부른다', w.부른AI.length, 0);
}
{
  const w = makeWorld({ itemBody: { 'K2-01-E-0001': {} } });                    // 본문도 없다
  봄('본문이 없으면 «교재에서 본문 채우기»를 가리킨다', /교재에서 본문 채우기/.test(w.autoFillWhyEmpty()), true);
}
{
  const w = makeWorld({ itemBody: { 'K2-01-E-0001': { content: 'a', answer: '③' } },
                        variants: { 'K2-01-E-0001': [{ code: 'x', variantKind: 'N' }] } });
  봄('진짜로 다 찼을 때만 «다 찼습니다»', /다 찼습니다/.test(w.autoFillWhyEmpty()), true);
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


// ── ⑥ 🔴 같은 흠에 하루치를 통째로 쏟지 않는가 (2026-09-04 · 사용자가 20건을 태웠다) ──
//    🔵 **09-06에 «한 번은 다시 해 본다»로 고쳤다.** 실제로 겪어 보니 까닭이 «길»이 아니라
//      «가끔 엎어지는 것»이었다 — 똑같은 입력이 다음 번에는 그대로 됐다(실측).
//      첫 실패에서 끄면 **하루 한 건도 못 채운다.** 그렇다고 스무 번 두드리면 09-04로 돌아간다.
//      → 버리는 것을 **최대 두 건**으로 묶는다. 이 검사가 그 «두 건»을 붙든다.
{
  const w = makeWorld({ itemBody: 본문(5), twin: null });   // AI 가 언제나 안 되는 상황
  await w.autoFillTick();
  봄('🔵 한 번 엎어져도 아직 안 끈다', w.autoFillState().on, true);
  봄('🔵 같은 문항으로 다시 해 보려고 예약한다', w.예약.length, 1);
  봄('그때도 까닭을 그대로 적는다', /AI 가 안 됐다/.test(w.autoFillState().msg), true);
  봄('«한 번 더 해 본다»고 말한다', /한 번 더/.test(w.autoFillState().msg), true);

  /* 🔵 **2026-09-24(A-4) — 두 번째에는 «끄지 않고 그 문항을 넘긴다».** 사용자 — 「같은 문제에서 계속 막힐 때
       특정 문제를 남긴 채로 넘길 방법」. 한 문항이 막혔다고 그날 치를 통째로 멈추면 나머지를 하나도 못 채운다.
     🔴 그래도 09-04 의 교훈(스무 건 태움)은 지킨다 — **다른 문항에서도 또 엎어지면**(셋째) 멈춘다. 버리는 것 최대 세 건. */
  await w.autoFillTick();                                   // 두 번째도 엎어진다
  봄('🔵 두 번째에는 끄지 않는다', w.autoFillState().on, true);
  봄('🔵 그 문항을 넘겨 둔다 (이 기기에 남는다)', Object.keys(w.넘김()), ['K2-01-E-0001']);
  봄('🔵 그래서 다음 후보는 다음 문항이다', w.autoFillCandidates()[0], 'K2-01-E-0002');
  봄('넘겼다고 말한다', /넘겨 두었습니다/.test(w.autoFillState().msg), true);
  await w.autoFillTick();                                   // 다른 문항에서도 엎어진다
  봄('🔴 셋째(다른 문항)에서도 엎어지면 스스로 끈다', w.autoFillState().on, false);
  봄('🔴 그래서 세 번만 부른다 (스무 번이 아니라)', w.부른AI.length, 3);
  봄('🔴 그다음은 예약하지 않는다', w.예약.length, 2);
  봄('왜 멈췄는지도 말한다', /하루치를 지키려고/.test(w.autoFillState().msg), true);
  봄('셋째 문항은 넘기지 않는다 (길의 흠이지 문항의 흠이 아니다)', Object.keys(w.넘김()), ['K2-01-E-0001']);
}
/* 🔵 **엎어졌다가 다시 하면 되는 경우** — 이것이 09-06에 실제로 겪은 모습이다.
   여기서 한 건도 못 담으면 고친 뜻이 없다. */
{
  const w = makeWorld({ itemBody: 본문(5), twin: null });   // 첫 번은 엎어지고
  await w.autoFillTick();
  봄('🔵 처음엔 엎어진다', w.autoFillState().on, true);
  w.twin = { content: 'x', answer: '②' };                   // 두 번째는 된다
  await w.autoFillTick();
  봄('🔵 다시 해서 담는다', w.쓴것.length, 1);
  봄('🔵 그리고 고리는 계속 돈다', w.autoFillState().on, true);
  봄('🔵 두 번 불렀다 (엎어진 것 + 된 것)', w.부른AI.length, 2);
}

// ⑦ 🔴 «우리 잘못»과 «위쪽(Gemini)이 엎어진 것»은 다르다 (2026-09-06)
//    사용자가 「실패율이 너무높아」라고 해서 까닭을 받아 봤더니 위쪽이었다:
//      · 429 You exceeded your current quota   — 한도
//      · 503 experiencing high demand          — 붐빔
//    둘 다 워커가 502 로 뭉쳐 보내서 앱은 「그냥 실패」로 읽고 **13초 뒤 또 들이받았다.**
//    🔴 그런데 실패해도 우리 하루치가 깎인다(워커가 부르기 «전»에 센다) — 곧 손해다.
{
  const 세상 = (말) => { const w = makeWorld({ itemBody: 본문(5), twin: null }); w.오류 = 말; return w; };
  /* 붐빔(503) — 끄지 않고 «쉬었다» 온다. 13초가 아니라 훨씬 길게. */
  {
    const w = makeWorld({ itemBody: 본문(5), twin: null, 오류: '워커 502 — gemini error — { "code": 503, "message": "This model is currently experiencing high demand" }' });
    await w.autoFillTick();
    봄('🔵 위쪽이 붐비면 «끄지 않는다»', w.autoFillState().on, true);
    봄('🔴 13초 뒤에 또 들이받지 않는다', w.예약[0] > 60000, true);
    봄('붐빈다고 말한다', /붐빕니다/.test(w.autoFillState().msg), true);
  }
  /* 한도(429) — 더 오래 쉰다. 붐빔보다 길어야 한다. */
  {
    const w = makeWorld({ itemBody: 본문(5), twin: null, 오류: '워커 502 — gemini error — { "code": 429, "message": "You exceeded your current quota" }' });
    await w.autoFillTick();
    봄('🔴 한도면 더 오래 쉰다', w.예약[0] >= 1800000, true);
    봄('한도라고 말한다', /한도/.test(w.autoFillState().msg), true);
  }
  /* 🔴 쉬었다 오는 것도 한 건을 쓴다 — 거듭되면 멈춰야 한다. */
  {
    const w = makeWorld({ itemBody: 본문(5), twin: null, 오류: '워커 502 — gemini error — 503 high demand' });
    for (let i = 0; i < 5; i++) await w.autoFillTick();
    봄('🔴 다섯 번 잇따라 엎어지면 멈춘다', w.autoFillState().on, false);
    봄('🔴 그래서 다섯 건만 쓴다 (스무 건이 아니라)', w.부른AI.length, 5);
    봄('우리 흠이 아니라고 말한다', /우리 코드 흠이 아닙니다/.test(w.autoFillState().msg), true);
  }
  /* ⚠ «우리 잘못»일 때 — 한 번 다시 해 보고, 두 번째면 그 문항을 넘기고(A-4), 다른 문항도 안 되면 끈다. */
  {
    const w = makeWorld({ itemBody: 본문(5), twin: null, 오류: 'incomplete AI result' });
    await w.autoFillTick();
    봄('⚠ 우리 흠이면 곧바로 다시 해 본다', w.예약[0] < 60000, true);
    await w.autoFillTick();
    봄('⚠ 두 번째면 그 문항을 넘긴다', Object.keys(w.넘김()).length, 1);
    await w.autoFillTick();
    봄('⚠ 다른 문항도 안 되면 끈다', w.autoFillState().on, false);
  }
}

// ⑧ 🔴 «붐빔»이 아니라 «무거움»이었다 (2026-09-24 · A-4)
//    사용자 — 「붐빕니다 라는 이유로 너무 많이 실패해. 특히 조금 어려워진 문제에 대해서 더 심한 것 같아」.
//    500 INTERNAL · 504 DEADLINE_EXCEEDED 는 모델이 생각하다 엎어진 것이다 — 같은 문항을 5분마다 다시 하면
//    그 한 문항이 줄 전체를 막는다. ⇒ Groq 로 한 번 해 보고, 안 되면 넘기고 다음 문항으로.
{
  const 무거움 = '워커 502 — gemini error — { "error": { "code": 500, "message": "An internal error has occurred.", "status": "INTERNAL" } }';
  const 시간다됨 = '워커 502 — gemini error — { "error": { "code": 504, "status": "DEADLINE_EXCEEDED" } }';
  /* 글 문항 + Groq 통이 남았다 → 그 자리에서 Groq 로 만든다 */
  {
    const w = makeWorld({ itemBody: 본문(3), twin: null, groqUsed: 0, 오류: 무거움 });
    w.groqTwin = { content: 'g', answer: '②', engine: 'groq' };
    await w.autoFillTick();
    봄('🔵 무거우면 같은 문항을 Groq 로 곧바로 한 번 더', w.부른AI.map(x => x.engine), ['', 'groq']);
    봄('🔵 그래서 담긴다', w.쓴것.length === 1 && w.쓴것[0].doc.engine === 'groq', true);
    봄('Groq 가 대신 만들었다고 말한다', /Groq 로 만들었습니다/.test(w.autoFillState().msg), true);
    봄('아무것도 넘기지 않는다', Object.keys(w.넘김()), []);
  }
  /* Groq 통이 찼다 → 넘기고, 오래 쉬지 않고 다음 문항으로 */
  {
    const w = makeWorld({ itemBody: 본문(3), twin: null, 오류: 시간다됨 });   // groqUsed 25 = 찼다
    await w.autoFillTick();
    봄('🔴 무거운 문항은 곧바로 넘긴다 (같은 문항을 5분마다 다시 하지 않는다)', Object.keys(w.넘김()), ['K2-01-E-0001']);
    봄('🔴 오래 쉬지 않는다 (붐빔이 아니다)', w.예약[0] < 60000, true);
    봄('끄지 않는다', w.autoFillState().on, true);
    봄('다음 후보는 다음 문항', w.autoFillCandidates()[0], 'K2-01-E-0002');
    봄('«붐빕니다»라고 하지 않는다', /붐빕니다/.test(w.autoFillState().msg), false);
    봄('«무거워»라고 말한다', /무거워/.test(w.autoFillState().msg), true);
    await w.autoFillTick();
    봄('🔴 다음 바퀴는 정말 다음 문항을 부른다', w.부른AI[1].content, '본문2');
  }
  /* 그림 문항은 Groq 로 못 간다 — 부르지 않고 넘긴다 */
  {
    const w = makeWorld({ itemBody: { 'K2-01-E-0000': { content: '그림 문항', answer: '③', image: { fileId: 'f' } } }, twin: null, groqUsed: 0, 오류: 무거움 });
    await w.autoFillTick();
    봄('🔴 그림 문항은 Groq 로 안 간다', w.부른AI.map(x => x.engine), ['']);
    봄('넘긴 까닭에 «그림»이 적힌다', /그림/.test((w.넘김()['K2-01-E-0000'] || {}).why || ''), true);
  }
  /* 붐빔(503)은 예전처럼 쉬었다 같은 문항 — 두 번째면 «이번 세션»만 넘긴다(기기에 안 남긴다) */
  {
    const w = makeWorld({ itemBody: 본문(3), twin: null, 오류: '워커 502 — gemini error — { "code": 503, "message": "high demand" }' });
    await w.autoFillTick(); await w.autoFillTick();
    봄('붐빔 두 번이면 이번에는 넘긴다', w.skipped.has('K2-01-E-0001'), true);
    봄('🔴 붐빔은 문항 탓이 아니라 기기에 남기지 않는다', Object.keys(w.넘김()), []);
    봄('붐빔은 여전히 쉬었다 간다', w.예약.every(ms => ms >= 300000), true);
  }
  /* 🔵 손으로 넘기기 · 되돌리기 */
  {
    const w = makeWorld({ itemBody: 본문(3), twin: null, 오류: '워커 502 — gemini error — { "code": 503, "message": "high demand" }' });
    await w.autoFillTick();                      // 1번 문항이 붐벼 쉬는 중
    봄('지금 붙든 문항을 기억한다', w.autoFillState().last, 'K2-01-E-0001');
    w.autoFillAsideNow();
    봄('🔵 손으로 넘기면 기기에 남는다', (w.넘김()['K2-01-E-0001'] || {}).why, '손으로 넘김');
    봄('🔵 쉬는 걸 기다리지 않고 곧 다음으로', w.예약[w.예약.length - 1] < 60000, true);
    봄('다음 후보는 2번', w.autoFillCandidates()[0], 'K2-01-E-0002');
    w.autoFillAsideBack('K2-01-E-0001');
    봄('🔵 되돌리면 다시 후보가 된다', w.autoFillCandidates()[0], 'K2-01-E-0001');
    w.autoFillAsideNow(); w.autoFillAsideBack('');
    봄('🔵 «모두 다시 넣기»', Object.keys(w.넘김()), []);
  }
  {
    const w = makeWorld({ itemBody: 본문(1) });
    w.autoFillAsideNow();                         // 붙든 것이 없으면 아무 일도 안 한다
    봄('붙든 문항이 없으면 넘기기는 아무 일도 안 한다', Object.keys(w.넘김()), []);
  }
  {
    const w = makeWorld({ itemBody: 본문(2), twin: null, 오류: 무거움 });
    await w.autoFillTick();
    w.state.variants['K2-01-E-0002'] = [{ code: 'x', variantKind: 'N' }];
    봄('다 찼을 때 «넘겨 둔 것»을 말해 준다', /넘겨 둔 1개/.test(w.autoFillWhyEmpty()), true);
  }
}

console.log(`\n  ${fail ? '🔴' : '✅'} ${pass} 통과 · ${fail} 실패\n`);
process.exit(fail ? 1 : 0);
