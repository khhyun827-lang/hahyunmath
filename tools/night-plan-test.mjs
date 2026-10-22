// 새벽엔 «차례만» 싣기 검사 (2026-10-22)
//
//   node tools/night-plan-test.mjs
//
// 🔴 DB 를 안 건드린다 — index.html 에서 nightPlanOf·nightPlanSave·nightStoreLoad 를 떼어 와 스텁으로 돌린다.
//    붙드는 것: 차례가 «채울 것·검토할 것»을 맞게 고르나 · 안 바뀌면 안 쓰나 · 밤(반쪽 창고)엔 안 쓰나 ·
//    원본의 변형을 묶어 싣고, 못 읽으면 창고를 안 건드리나 · nightRun 이 로그인 «전»에 막고 낡으면 통째로 돌아가나.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

function liftFn(name) {
  const at = html.indexOf('function ' + name + '(');
  if (at < 0) throw new Error(name + ' 을 못 찾았습니다');
  const from = html.lastIndexOf('\n', at) + 1;          // async 까지
  let depth = 0;
  for (let j = html.indexOf('{', at); j < html.length; j++) {
    if (html[j] === '{') depth++;
    else if (html[j] === '}') { depth--; if (!depth) return html.slice(from, j + 1); }
  }
  throw new Error(name + ' 의 끝을 못 찾았습니다');
}
const BLOCK = ['nightPlanOf', 'nightPlanSave', 'nightStoreLoad'].map(liftFn).join('\n');

let pass = 0, fail = 0;
const 봄 = (무엇, 나온것, 나와야할것) => {
  const ok = JSON.stringify(나온것) === JSON.stringify(나와야할것);
  if (ok) { pass++; console.log('  ✓ ' + 무엇); }
  else { fail++; console.log(`  ✗ ${무엇}\n      나온 것: ${JSON.stringify(나온것)}\n      나와야:  ${JSON.stringify(나와야할것)}`); }
};

function makeWorld({ 후보 = [], 그림 = [], 대기 = [], partial = false, 변형읽기 = null, 본문 = {} } = {}) {
  const ls = new Map();
  const w = { 쓴것: [], 물은원본: null, 물은본문: [] };
  const state = { currentUser: { type: 'teacher' }, itemByCode: {}, itemBody: {}, variants: {}, storePartial: partial };
  for (const c of 그림) state.itemBody[c] = { 그림: true };
  const f = new Function(
    'state', 'localStorage', 'console', 'NIGHT_PLAN_KEY', 'REVIEW_DAILY_LIMIT',
    'autoFillCandidates', 'itemFigureOf', 'pendingVariants', 'dqAnswerable', 'reviewNeedsThird',
    'dbSet', 'loadItemLedgerIfNeeded', 'dbGetVariantsOfRoots', 'dbGetDoc',
    BLOCK + '\nreturn { nightPlanOf, nightPlanSave, nightStoreLoad };'
  )(
    state,
    { getItem: k => (ls.has(k) ? ls.get(k) : null), setItem: (k, v) => ls.set(k, v) },
    { warn() {} }, 'khm-night-plan', 2,
    (밤) => (밤 ? 후보 : []),
    b => !!(b && b.그림),
    () => 대기,
    () => true,
    v => !!v.third,
    async (k, v) => { w.쓴것.push([k, v]); return true; },
    async () => {},
    async roots => { w.물은원본 = roots; if (!변형읽기) throw new Error('429'); return 변형읽기; },
    async (col, id) => { w.물은본문.push(col + '/' + id); return 본문[id] || null; },
  );
  return { ...f, state, w };
}

console.log('① 차례 고르기');
{
  const 후보 = Array.from({ length: 70 }, (_, i) => 'A' + String(i).padStart(3, '0'));
  const 그림 = 후보.slice(0, 65);                       // 앞 65개가 그림 — 글 문항은 뒤 다섯뿐
  const 대기 = [
    { code: 'R1-N01', originCode: 'R1' },
    { code: 'R1-N02', originCode: 'R1', aiReview: {} },   // 이미 검토됨 — 빠진다
    { code: 'R2-N01', originCode: 'R2' },
    { code: 'R3-N01', originCode: 'R3', aiReview: {}, third: true },   // 셋째 몫
    { code: 'R4-N01', originCode: 'R4' },                 // 검토 몫 한도(2)를 넘는다
  ];
  const { nightPlanOf } = makeWorld({ 후보, 그림, 대기 });
  const p = nightPlanOf();
  봄('채울 것 — 앞 60 + 글 문항(뒤 다섯)', p.fill.length, 65);
  봄('글 문항이 60 밖이어도 든다', p.fill.includes('A069'), true);
  봄('검토할 원본 — 안 본 것 한도만큼 + 셋째', p.roots, ['R1', 'R2', 'R3']);
}

console.log('② 적기');
{
  const W = makeWorld({ 후보: ['A1'] });
  await W.nightPlanSave();
  봄('처음엔 kv 에 쓴다', W.w.쓴것.map(x => x[0]), ['night-plan']);
  await W.nightPlanSave();
  봄('안 바뀌면 또 안 쓴다', W.w.쓴것.length, 1);
  const P = makeWorld({ 후보: ['A1'], partial: true });
  await P.nightPlanSave();
  봄('밤(반쪽 창고)엔 안 쓴다', P.w.쓴것.length, 0);
  const S = makeWorld({ 후보: ['A1'] });
  S.state.currentUser = { type: 'student' };
  await S.nightPlanSave();
  봄('학생은 안 쓴다', S.w.쓴것.length, 0);
}

console.log('③ 싣기');
{
  const W = makeWorld({
    변형읽기: [{ code: 'A1-N02', originCode: 'A1' }, { code: 'A1-N01', originCode: 'A1' }, { code: 'R1-N01', originCode: 'R1' }],
    본문: { A1: { code: 'A1', content: 'x', answer: '1' } },
  });
  const ok = await W.nightStoreLoad({ fill: ['A1', 'A2'], roots: ['R1', 'A1'] });
  봄('된다', ok, true);
  봄('원본은 겹치지 않게 한 번씩 묻는다', W.w.물은원본, ['A1', 'A2', 'R1']);
  봄('본문은 채울 것만', W.w.물은본문, ['items/A1', 'items/A2']);
  봄('변형은 원본별로 · 번호순', W.state.variants.A1.map(v => v.code), ['A1-N01', 'A1-N02']);
  봄('없는 본문은 안 담는다', Object.keys(W.state.itemBody), ['A1']);
  봄('반쪽 창고 표시', W.state.storePartial, true);

  const F = makeWorld({});
  const 전 = F.state.variants;
  봄('변형을 못 읽으면 false', await F.nightStoreLoad({ fill: ['A1'], roots: [] }), false);
  봄('그때 창고는 그대로', F.state.variants === 전, true);
}

console.log('④ 이어진 자리 (글자로)');
{
  const nr = liftFn('nightRun');
  봄('로그인 «전»에 막는다', nr.indexOf('state.storeNight = true') > 0 && nr.indexOf('state.storeNight = true') < nr.indexOf('doTeacherLogin'), true);
  봄('차례가 낡으면 통째로', /계획\.fill\.length && !autoFillCandidates\(\)\.length/.test(nr) && /storeNight: false, storePartial: false, itemBody: null, variants: null/.test(nr), true);
  봄('창고 싣기가 막힌다', /if\(state\.storeNight \|\| storeAll\(\)\) return/.test(liftFn('loadItemStoreIfNeeded')), true);
  봄('다 실으면 차례를 적는다', /nightPlanSave\(\)/.test(liftFn('loadItemStoreIfNeeded')), true);
  봄('변형을 쓰면 차례를 적는다', /collection === 'variants'\) nightPlanSave/.test(liftFn('collectionTouched')), true);
}

console.log(`\n${fail ? '🔴' : '🟢'} ${pass} 통과 · ${fail} 실패`);
process.exit(fail ? 1 : 0);
