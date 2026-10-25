// 채울 차례 (kv/fill-queue) 검사 (2026-10-23 · 검색 구조 4단계 — 10-22 night-plan-test 를 갈음)
//
//   node tools/fill-queue-test.mjs
//
// 🔴 DB 를 안 건드린다 — index.html 에서 차례 함수들과 autoFillCandidates 를 떼어 와 스텁으로 돌린다.
//    붙드는 것: 다 실린 창고가 차례를 짓는다(그림 표시까지) · 반쪽 창고는 kv 를 다시 읽고 «뺄 것»만 뺀다 ·
//    반쪽 창고의 후보는 차례에서(범위·넘김·이미 찬 것 빼고) · 판 범위는 판 표로 · 틱·새벽이 차례로 돈다.
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
let pass = 0, fail = 0;
const 봄 = (무엇, 나온것, 나와야) => {
  const ok = JSON.stringify(나온것) === JSON.stringify(나와야);
  ok ? pass++ : fail++;
  console.log((ok ? '  ✓ ' : '  ✗ ') + 무엇 + (ok ? '' : `\n      나온 것 ${JSON.stringify(나온것)}\n      나와야 ${JSON.stringify(나와야)}`));
};

const BLOCK = ["const FILL_QUEUE_KEY = 'k';", 'const autoFillSkipped = new Set();',
  ...['fillQueueOf', 'fillQueueEnsure', 'autoFillHasFig', 'fillQueueSave', 'fillQueueDrop', 'autoFillCandidates', 'autoFillScopeOk'].map(liftFn)].join('\n');

function 세상({ 전부 = false, kv = null, 본문 = {}, 변형 = {}, 판표 = [] } = {}) {
  const w = { 쓴것: [], 읽음: 0, kv };
  const state = { currentUser: { type: 'teacher' }, itemByCode: { A: {}, B: {}, C: {}, D: {} }, itemBody: 본문, variants: 변형,
                  bookEditions: 판표, storeSubject: '', storeChapter: '', storeBook: '', storeEdition: '' };
  const ls = new Map();
  const f = new Function('state', 'localStorage', 'console', 'storeAll', 'dbGet', 'dbSet', 'dbReadFailed', 'bookEditionsEnsure',
    'itemFigureOf', 'variantsOfCodeAll', 'splitItemCode', 'autoFillAsideMap', 'autoFillState', 'autoFillScopeNow', 'itemOfCode',
    'storeMatches', 'bookLabel',
    BLOCK + '\nreturn { fillQueueOf, fillQueueEnsure, fillQueueSave, fillQueueDrop, autoFillCandidates, autoFillHasFig };')(
    state, { getItem: k => ls.get(k) ?? null, setItem: (k, v) => ls.set(k, v) }, { warn() {} }, () => 전부,
    async () => { w.읽음++; return w.kv; }, async (k, v) => { w.쓴것.push(v); w.kv = v; return true; }, new Set(), () => {},
    b => (b && b.그림 ? {} : null),
    c => state.variants[c] || [],
    c => ({ isVariant: /-N\d\d$/.test(c) }),
    () => ({ C: { why: '넘김' } }), () => ({ on: false }), () => state.storeEdition ? { ed: state.storeEdition } : null,
    c => ({ code: c }), () => true, b => b.name);
  return Object.assign(w, f, { state });
}

console.log('① 다 실린 창고가 차례를 짓는다');
{
  const W = 세상({ 전부: true, 본문: { A: { content: 'a', answer: '1', 그림: 1 }, B: { content: 'b', answer: '2' }, C: { content: 'c', answer: '3' }, D: { content: 'd' } },
                   변형: { B: [{ variantKind: 'N' }] } });
  봄('정답 없는 D · 이미 찬 B 는 빠진다 · 넘긴 것은 «밤»이라 안 본다', W.fillQueueOf(), { codes: ['A', 'C'], fig: ['A'] });
  await W.fillQueueSave();
  await W.fillQueueSave();
  봄('안 바뀌면 또 안 쓴다', W.쓴것.length, 1);
}

console.log('② 반쪽 창고 — kv 를 다시 읽고 «뺄 것»만');
{
  const W = 세상({ kv: { codes: ['A', 'B', 'C', 'D'], fig: ['A', 'D'] }, 변형: { B: [{ variantKind: 'N' }] } });
  await W.fillQueueEnsure();
  봄('차례를 한 건 읽는다', [W.읽음, W.state.fillQueue.codes], [1, ['A', 'B', 'C', 'D']]);
  봄('후보 — 넘긴 C · 이미 찬 B 빼고', W.autoFillCandidates(), ['A', 'D']);
  봄('그림은 차례의 표시로(본문 없이)', [W.autoFillHasFig('A'), W.autoFillHasFig('B')], [true, false]);
  W.fillQueueDrop('D');
  await new Promise(r => setTimeout(r, 0)); await new Promise(r => setTimeout(r, 0));
  봄('뺄 때 kv 를 다시 읽고 · 찬 것·뺀 것을 함께 뺀다', [W.읽음, W.쓴것.at(-1)], [2, { codes: ['A', 'C'], fig: ['A'] }]);
}

console.log('③ 판 범위 — 본문 없이 판 표로');
{
  const W = 세상({ kv: { codes: ['A', 'B'], fig: [] }, 판표: [{ name: '엔크', nos: { 1: 'B' } }] });
  await W.fillQueueEnsure();
  W.state.storeEdition = '엔크';
  봄('판에 실린 B 만', W.autoFillCandidates(), ['B']);
}

console.log('④ 이어진 자리 (글자로)');
{
  const 틱 = liftFn('autoFillTick'), 밤 = liftFn('nightRun');
  봄('틱은 반쪽이면 차례로 — 없으면 멈추고 말한다 (10-25 · 통째로 안 싣는다)', /await fillQueueEnsure\(\);\s*if\(!state\.fillQueue\)\{[\s\S]{0,120}autoFillStop\(/.test(틱) && !틱.includes('loadItemStoreIfNeeded'), true);
  봄('뽑은 문항만 받아 다시 보고, 낡았으면 뺀다', /partEnsure\('items', \['id:' \+ code\]\)/.test(틱) && /fillQueueDrop\(code\)/.test(틱), true);
  봄('새벽 — 어떤 길로도 통째로 안 싣는다 (10-25)', 밤.includes('loadItemStoreIfNeeded'), false);
  봄('교재 올리기·정답 채우기는 담은 뒤 차례·판 표를 다시 적는다', ['icFillCommit', 'icFillAnswers'].every(f => liftFn(f).includes('storeRewriteLists()')) && /fillQueueSave\(\)/.test(liftFn('storeRewriteLists')), true);
  봄('새벽 검토는 대기만', /partEnsure\('variants', \['pending'\]\)/.test(밤), true);
  봄('다 실으면·변형을 쓰면 차례를 적는다', /fillQueueSave\(\)/.test(liftFn('loadItemStoreIfNeeded')) && /fillQueueSave\(\)/.test(liftFn('collectionTouched')), true);
  봄('옛 night-plan 은 안 쓴다', /nightPlan|nightStoreLoad|'night-plan'/.test(html), false);
}

console.log(`\n${fail ? '🔴' : '🟢'} ${pass} 통과 · ${fail} 실패`);
process.exit(fail ? 1 : 0);
