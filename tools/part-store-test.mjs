// 창고 «부분» 재우기 검사 (2026-10-22 · 검색 구조 2단계 — 검토 탭은 대기만)
//
//   node tools/part-store-test.mjs
//
// 🔴 DB 를 안 건드린다 — index.html 에서 partSync·partEnsure·loadReviewStoreIfNeeded 등을 떼어 와 스텁으로 돌린다.
//    붙드는 것: 처음엔 대기·그 원본·본문만 받는다 · 다음 탭은 버전 1건뿐 · 버전이 바뀌면 바뀐 것만 받고 범위가 «완전»하게 남는다
//    · 지운 것은 빠진다 · 글자 버전이면 새로 · 못 받은 범위는 안 적고 1분 쉰다(10-25) · 단추 하나는 그 원본만(storeEnsure) · 이 탭에서 쓴 것이 이긴다.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
function liftFn(name) {
  const at = html.indexOf('function ' + name + '(');
  if (at < 0) throw new Error(name + ' 을 못 찾았습니다');
  const from = html.lastIndexOf('\n', at) + 1;
  for (let j = html.indexOf('{', at), d = 0; j < html.length; j++) {
    if (html[j] === '{') d++;
    else if (html[j] === '}' && !--d) return html.slice(from, j + 1);
  }
}
const liftConst = name => { const at = html.indexOf('const ' + name + ' = '); return html.slice(at, html.indexOf(';\n', at) + 1); };
const BLOCK = [liftConst('PART_STORE'), 'const partMem = {}, partQ = {}, partWrites = { items: {}, variants: {} };', 'let reviewStoreLoading = null, reviewScoped = false, reviewFailAt = 0, storeShownLoading = null, storeShownFailAt = 0;',
  ...['partRead', 'partSave', 'partSync', 'partEnsure', 'partPut', 'partOverlay', 'storeAll', 'variantsByRoot', 'loadReviewStoreIfNeeded',
      'partToState', 'storeLedgerKids', 'storeGot', 'storeShownEnsure', 'storeEnsure'].map(liftFn)].join('\n');

let pass = 0, fail = 0;
const 봄 = (무엇, 나온것, 나와야) => {
  const ok = JSON.stringify(나온것) === JSON.stringify(나와야);
  ok ? pass++ : fail++;
  console.log((ok ? '  ✓ ' : '  ✗ ') + 무엇 + (ok ? '' : `\n      나온 것 ${JSON.stringify(나온것)}\n      나와야 ${JSON.stringify(나와야)}`));
};

/* 서버 — 변형·본문 문서와 버전. 읽은 것을 센다. */
function makeServer() {
  return {
    variants: {
      'A-N01': { code: 'A-N01', originCode: 'A', pending: true },
      'A-N02': { code: 'A-N02', originCode: 'A' },                  // 통과한 형제 — 번호 매기기에 필요
      'B-N01': { code: 'B-N01', originCode: 'B', pending: true },
      'C-N01': { code: 'C-N01', originCode: 'C' },                  // 대기 아님 — 안 받는다
    },
    items: { A: { code: 'A', content: 'a' }, B: { code: 'B', content: 'b' }, C: { code: 'C' }, P: { code: 'P', content: 'p' } },
    ver: { itemsVer: { t: 1, full: 1 }, variantsVer: { t: 1, full: 1 } },
    바뀜: { variants: [], items: [] },
  };
}
function makeTab(S, ls, { 실패 = '' } = {}) {
  const 읽음 = [];
  const dbReadFailed = new Set();
  const state = { currentUser: { type: 'teacher' } };
  const 통째 = { n: 0 }, 알림 = [];
  const f = new Function(
    'localStorage', 'console', 'state', 'DATA', 'ITEMS_VER_KEY', 'COLL_CACHE_TTL', 'DELTA_SKEW', 'verSame', 'dbReadFailed',
    'dbGet', 'dbGetChangedSince', 'dbGetVariantsOfRoots', 'dbGetDoc', 'dbQueryWhere', 'loadItemLedgerIfNeeded', 'variantIsPending',
    'itemStoreLoading', 'loadItemStoreIfNeeded', 'Date', 'idbGet', 'idbSet', 'render', 'showToast',
    BLOCK + '\nreturn { partEnsure, partPut, partOverlay, storeAll, loadReviewStoreIfNeeded, partMem, storeShownEnsure, storeGot, storeEnsure, 받는중: () => storeShownLoading };'
  )(
    { removeItem() {} },{ warn() {} }, state, { problemBank: [{ itemCode: 'P' }, { itemCode: 'A', originalContent: '있음' }] },
    'itemsVer', 3 * 864e5, 600000, (a, b) => JSON.stringify(a) === JSON.stringify(b), dbReadFailed,
    async key => { 읽음.push('ver:' + key); return S.ver[key]; },
    async col => { 읽음.push('바뀐것:' + col); return S.바뀜[col]; },
    async roots => { 읽음.push('원본:' + roots.join(',')); if (실패 === 'root') throw new Error('429');
      return Object.values(S.variants).filter(v => roots.includes(v.originCode)); },
    async (col, id) => { 읽음.push(col + '/' + id); return S[col][id] || null; },
    async (col, field) => { 읽음.push('대기:' + col); return Object.values(S[col]).filter(v => v.pending).map(v => ({ id: v.code, row: v })); },
    async () => { state.itemByCode = state.itemByCode || {}; },   // 진짜처럼 — 이미 실렸으면 그대로
    v => !!(v && v.pending && !v.deleted),
    null,
    async () => { 통째.n++; },
    { now: () => S.지금 || 1e7 },
    async k => (ls.has(k) ? structuredClone(ls.get(k)) : null), async (k, v) => { ls.set(k, structuredClone(v)); },
    () => {}, m => 알림.push(m),
  );
  return { ...f, state, 읽음, 통째, 알림 };
}
const 묶음 = st => Object.fromEntries(Object.entries(st.variants || {}).map(([k, v]) => [k, v.map(x => x.code)]));

console.log('① 처음 — 대기와 그 원본만');
const S = makeServer();
const LS = new Map();
{
  const T = makeTab(S, LS);
  await T.loadReviewStoreIfNeeded();
  봄('대기 → 그 원본들의 변형 → 본문 순', T.읽음, ['ver:variantsVer', '대기:variants', '원본:A,B', 'ver:itemsVer', 'items/A', 'items/B', 'items/P']);
  봄('대기 아닌 원본(C)은 안 받는다', 묶음(T.state), { A: ['A-N01', 'A-N02'], B: ['B-N01'] });
  봄('본문 — 원본 + 원본 없는 시험지 문항', Object.keys(T.state.itemBody).sort(), ['A', 'B', 'P']);
  봄('«전부»가 아니다', [T.state.storePartial, T.storeAll()], [true, false]);
}

console.log('② 다음 탭 — 안 바뀌었으면 버전만');
{
  const T = makeTab(S, LS);
  await T.loadReviewStoreIfNeeded();
  봄('읽기는 버전 둘', T.읽음, ['ver:variantsVer', 'ver:itemsVer']);
  봄('같은 것이 실린다', 묶음(T.state), { A: ['A-N01', 'A-N02'], B: ['B-N01'] });
}

console.log('③ 버전이 바뀌면 — 바뀐 것만 받고 범위는 완전하게');
{
  S.variants['C-N02'] = { code: 'C-N02', originCode: 'C', pending: true };   // 새로 대기가 생겼다(새 원본 C)
  S.variants['B-N01'] = { code: 'B-N01', originCode: 'B' };                 // B 는 통과했다
  S.바뀜.variants = [{ id: 'C-N02', t: 1.5e7, row: S.variants['C-N02'] }, { id: 'B-N01', t: 1.5e7, row: S.variants['B-N01'] }];
  S.ver.variantsVer = { t: 1.5e7, full: 1, del: [['A-N02', 1.4e7]] };            // A-N02 는 지웠다
  delete S.variants['A-N02'];
  S.지금 = 2e7;
  const T = makeTab(S, LS);
  await T.loadReviewStoreIfNeeded();
  봄('바뀐 것 → 새 원본(C)의 변형만 더 받는다', T.읽음, ['ver:variantsVer', '바뀐것:variants', '원본:C', 'ver:itemsVer', 'items/C']);
  봄('대기에서 빠진 것·지운 것이 맞게', 묶음(T.state), { A: ['A-N01'], B: ['B-N01'], C: ['C-N01', 'C-N02'] });
  봄('대기 = A·C', Object.values(T.state.variants).flat().filter(v => v.pending).map(v => v.code), ['A-N01', 'C-N02']);
}

console.log('④ 글자 버전(도구) — 새로 받는다');
{
  S.ver.variantsVer = '17000';
  const T = makeTab(S, LS);
  await T.loadReviewStoreIfNeeded();
  봄('대기부터 다시', T.읽음.slice(0, 3), ['ver:variantsVer', '대기:variants', '원본:A,C']);
}

console.log('⑤ 못 받으면 — 범위를 안 적고 1분 쉰다 (10-25 · 통째로 안 물러난다)');
{
  const S2 = makeServer(), LS2 = new Map();
  const T = makeTab(S2, LS2, { 실패: 'root' });
  await T.loadReviewStoreIfNeeded();
  봄('🔴 통째 싣기로 안 물러난다', T.통째.n, 0);
  봄('반쪽을 안 싣는다', T.state.storePartial, undefined);
  봄('못 받은 범위는 안 적혔다', LS2.get('khm-part-variants-v1').scopes, ['pending']);
  const n = T.읽음.length;
  await T.loadReviewStoreIfNeeded();
  봄('그 1분 안에 다시 그려도 안 두드린다', T.읽음.length, n);
}

console.log('⑥ 이 탭에서 쓴 것');
{
  const T = makeTab(S, LS);
  await T.loadReviewStoreIfNeeded();
  T.partPut('variants', 'A-N01', { code: 'A-N01', originCode: 'A', pending: false, 고침: 1 });
  T.partPut('variants', 'C-N01', null);
  봄('받아 둔 것에 바로 든다', [T.partMem.variants.docs['A-N01'].고침, 'C-N01' in T.partMem.variants.docs], [1, false]);
  봄('통째 싣기에도 덮인다', T.partOverlay('variants', [{ code: 'A-N01' }, { code: 'C-N01' }, { code: 'Z' }]).map(r => r.code + (r.고침 || '')), ['A-N011', 'Z']);
}

console.log('⑦ 문항관리 — 보이는 카드만 (3단계)');
{
  const S3 = makeServer(), LS3 = new Map();
  S3.items['A-N01'] = { code: 'A-N01', content: '장부 변형' };
  const T = makeTab(S3, LS3);
  T.state.itemByCode = { A: {}, 'A-N01': {}, B: {}, C: {} };
  T.storeShownEnsure(['A', 'B']);
  await T.받는중();
  봄('카드 원본 본문 · 그 원본들의 변형만 (둘은 나란히)', T.읽음.slice().sort(), ['items/A', 'items/B', 'ver:itemsVer', 'ver:variantsVer', '원본:A,B']);
  const m = T.읽음.length;
  T.storeShownEnsure(['A'], true);
  await T.받는중();
  봄('코드 화면을 열면 장부 변형 본문만 더', T.읽음.slice(m), ['items/A-N01']);
  봄('카드는 «받았다» · 안 보인 C 는 아니다', [T.storeGot('A'), T.storeGot('C')], [true, false]);
  봄('변형이 원본별로 실린다', 묶음(T.state), { A: ['A-N01', 'A-N02'], B: ['B-N01'] });
  const n = T.읽음.length;
  T.storeShownEnsure(['A', 'B']);
  봄('같은 카드를 다시 그리면 읽기 0', [T.받는중(), T.읽음.length], [null, n]);
  await T.loadReviewStoreIfNeeded();
  봄('카드가 먼저 실렸어도 검토 대기는 따로 받는다 (원본 A·B 는 이미 있다)', T.읽음.slice(n), ['대기:variants', 'items/P']);
}

console.log('⑨ 단추 하나는 그 원본만 (5단계 · storeEnsure)');
{
  const S4 = makeServer(), LS4 = new Map();
  S4.items['A-N01'] = { code: 'A-N01', content: '장부 변형' };
  const T = makeTab(S4, LS4);
  T.state.itemByCode = { A: {}, 'A-N01': {}, B: {} };
  봄('받으면 true', await T.storeEnsure(['A', 'A', ''], ['P']), true);
  봄('원본 본문·장부 변형 본문·더 받을 본문 + 그 원본의 변형만', T.읽음.slice().sort(), ['items/A', 'items/A-N01', 'items/P', 'ver:itemsVer', 'ver:variantsVer', '원본:A']);
  봄('화면 자리에 «반쪽»으로 실린다 (번호 매기기가 A 의 형제를 다 본다)', [T.state.storePartial, 묶음(T.state).A], [true, ['A-N01', 'A-N02']]);
  const n = T.읽음.length;
  await T.storeEnsure(['A']);
  봄('같은 원본을 또 누르면 읽기 0', T.읽음.length, n);
  const T2 = makeTab(makeServer(), new Map(), { 실패: 'root' });
  T2.state.itemByCode = {};
  봄('🔴 못 받으면 false — 부르는 쪽이 멈춘다', [await T2.storeEnsure(['B']), T2.알림.length, T2.통째.n], [false, 1, 0]);
}

console.log('⑧ 이어진 자리 (글자로)');
{
  /* 5단계 (10-25) — 통째 싣기는 «관리 단추»만. 화면·단추 하나·자동 길에 다시 들어오면 문다. */
  const 단추하나 = ['setBankItemCode', 'saveVariantToStore', 'registerVariantFromBank', 'regenerateOneWithAI', 'saveExam', 'deleteExam',
    'pvSave', 'bookReqAccept', 'bankAskAccept', 'fillEmptyFromStore', 'addVariantByHand', 'itemCodeStripHTML', 'teacherCleanupHTML',
    'autoFillTick', 'nightRun', 'loadReviewStoreIfNeeded'];
  봄('🔴 화면·단추 하나·자동 길은 통째로 안 싣는다', 단추하나.filter(f => liftFn(f).includes('loadItemStoreIfNeeded')), []);
  봄('그 길들은 고른 것만 받는다(storeEnsure·storeHas)', 단추하나.filter(f => !/teacherCleanupHTML|autoFillTick|nightRun|loadReviewStoreIfNeeded|pvSave/.test(f))
    .filter(f => !/storeEnsure\(|storeHas\(/.test(liftFn(f))), []);
  const 관리 = ['ixBackfill', 'storeLoadAll', 'icFillBodies', 'icRepairEq', 'icFillAnswers', 'cleanupScan'];
  const 부름 = (html.match(/^[^/\n]*await loadItemStoreIfNeeded\(\)/gm) || []).length;
  봄('통째 싣기를 부르는 곳 = 관리 단추 여섯', [부름, 관리.every(f => liftFn(f).includes('loadItemStoreIfNeeded()'))], [관리.length, true]);
  봄('쓰는 문이 알린다', /partPut\(collection, id, data\)/.test(liftFn('dbSetDoc')) && /partPut\(collection, id, null\)/.test(liftFn('dbDeleteDoc')), true);
  봄('검토 탭은 대기만 싣는다', /loadReviewStoreIfNeeded\(\)/.test(liftFn('teacherReviewHTML')), true);
  const 창 = liftFn('teacherItemStoreHTML');
  봄('문항관리는 통째로 안 싣고 보이는 카드만', !/loadItemStoreIfNeeded/.test(창) && /storeShownEnsure\(shown\.map/.test(창), true);
  const 통 = liftFn('loadItemStoreIfNeeded');
  봄('통째 싣기는 반쪽을 갈아 끼운다', /if\(state\.storePartial\) Object\.assign\(state, \{ itemBody: null, variants: null, storePartial: false \}\)/.test(통) && /storeAll\(\)\) return/.test(통), true);
  봄('통째 싣기에 이 탭에서 쓴 것을 덮는다', /partOverlay\('items'/.test(통) && /partOverlay\('variants'/.test(liftFn('loadVariantsIfNeeded')), true);
  봄('반쪽으로 통째 재운 것을 안 덮는다', /if\(state\.storePartial\) return false/.test(liftFn('itemsCacheWrite')), true);
  봄('자동 채우기·차례는 «전부»일 때만', ['autoFillCandidates', 'autoFillWhyEmpty', 'autoFillTick'].every(n => /storeAll\(\)/.test(liftFn(n))), true);
}

console.log(`\n${fail ? '🔴' : '🟢'} ${pass} 통과 · ${fail} 실패`);
process.exit(fail ? 1 : 0);
