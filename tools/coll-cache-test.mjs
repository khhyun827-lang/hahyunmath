// variants · problembank 를 브라우저에 재운다 — 읽기 한도 소진 #2 의 대책 (2026-09-15)
//
//   node tools/coll-cache-test.mjs
//
// 🔴 09-15 에 하루 읽기 5만 건을 또 다 썼다. 학생이 앱을 열 때마다 두 컬렉션을 통째로 읽고 있었고,
//    출석 도장 순위가 살아나자 여는 횟수가 늘었다. items 가 09-06에 한 것(버전 1건 + 재우기)을 둘에도 한다.

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
  let d = 0;
  for (let j = html.indexOf('{', at); j < html.length; j++) {
    if (html[j] === '{') d++;
    else if (html[j] === '}') { d--; if (!d) return html.slice(at, j + 1); }
  }
  throw new Error(name + ' 의 끝을 못 찾았습니다');
}
function liftConst(name) { const at = html.indexOf('const ' + name + ' = '); if (at < 0) throw new Error(name); return html.slice(at, html.indexOf(';' + NL, at) + 1); }
const 알맹이 = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
let pass = 0, fail = 0;
const 봄 = (무엇, 나온것, 나와야) => {
  const ok = JSON.stringify(나온것) === JSON.stringify(나와야);
  if (ok) pass++; else fail++;
  console.log((ok ? '  ✓ ' : '  🔴 ') + 무엇 + (ok ? '' : NL + '      나온 것 ' + JSON.stringify(나온것) + NL + '      나와야 ' + JSON.stringify(나와야)));
};

function 판(o) {
  o = o || {};
  const store = {};
  const localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
  const 읽음 = [], 쓴것 = [];
  const kv = Object.assign({}, o.kv || {});
  const dbReadFailed = new Set(o.failedKeys || []);
  const collectionReadFailed = new Set(o.failedColls || []);
  const state = { currentUser: o.user === undefined ? { type: 'teacher' } : o.user };
  const timers = [];
  const F = new Function('localStorage', 'dbGet', 'dbGetCollection', 'dbSet', 'dbReadFailed', 'collectionReadFailed', 'markCollectionRead', 'state', 'setTimeout', 'clearTimeout', 'console', 'dbGetChangedSince',
    liftConst('COLL_CACHE') + NL + liftConst('COLL_CACHE_TTL') + NL + liftConst('DELTA_SKEW') + NL + lift('collCacheRead') + NL + lift('collCacheWrite') + NL + lift('collCacheClear') + NL
    + lift('verSame') + NL + lift('verBump') + NL + lift('deltaMerge') + NL
    + lift('loadCollectionCached') + NL + 'const collBumpTimer = {}; const collDelPending = {};' + NL + lift('collectionTouched') + NL
    + 'return { loadCollectionCached, collectionTouched, COLL_CACHE, collDelPending };')(
    localStorage,
    async (key, fb) => { 읽음.push('kv/' + key); return key in kv ? kv[key] : fb; },
    async (col, opts) => { 읽음.push(col); if (o.collRows === null) { if (opts && opts.strict) throw new Error('firestore http 429'); return []; } const rows = (o.collRows || [{ code: 'A' }, { code: 'B' }, { code: 'C' }]); if (opts && opts.names) opts.names.push(...rows.map(r => r.code)); return rows; },
    async (key, v) => { 쓴것.push({ key, v }); return true; },
    dbReadFailed, collectionReadFailed, () => {}, state,
    (fn, ms) => { timers.push(fn); return timers.length; }, () => {}, { warn() {}, error() {}, log() {} },
    async (col, since) => { 읽음.push('바뀐것:' + col); return o.changed === null ? null : (o.changed || []); });
  return { F, store, 읽음, 쓴것, timers, kv, state };
}

console.log(NL + '① 처음엔 통째로 · 두 번째엔 버전 1건만' + NL);
{
  const t = 판({ kv: { variantsVer: '100' } });
  const r1 = await t.F.loadCollectionCached('variants', { strict: true });
  봄('처음 — 버전 1건 + 컬렉션 전부', t.읽음, ['kv/variantsVer', 'variants']);
  봄('세 건이 왔다', r1.length, 3);
  봄('재워 뒀다 (버전과 함께)', JSON.parse(t.store['khm-variants-cache-v1']).ver, '100');
  t.읽음.length = 0;
  const r2 = await t.F.loadCollectionCached('variants', { strict: true });
  봄('🔴 두 번째 — 버전 1건뿐, 컬렉션은 안 읽는다', t.읽음, ['kv/variantsVer']);
  봄('재워 둔 것이 그대로 온다', r2.map(v => v.code), ['A', 'B', 'C']);
  t.읽음.length = 0; t.kv.variantsVer = '200';
  await t.F.loadCollectionCached('variants', { strict: true });
  봄('버전이 바뀌면 다시 통째로', t.읽음, ['kv/variantsVer', 'variants']);
}

console.log(NL + '② 못 읽는 날 — 빈 것은 안 재우고, 재워 둔 것은 낡은 채로 쓴다' + NL);
{
  const t = 판({ kv: {}, collRows: null, failedColls: ['problembank'] });
  const r = await t.F.loadCollectionCached('problembank');
  봄('실패한 []는 안 재운다', ['khm-problembank-cache-v1' in t.store, r.length], [false, 0]);
  const u = 판({ kv: { variantsVer: '1' } });
  await u.F.loadCollectionCached('variants', { strict: true });
  u.읽음.length = 0;
  /* 이제 429 — 버전도 못 읽고 컬렉션도 못 읽는다 */
  u.kv.variantsVer = undefined; delete u.kv.variantsVer;
  const v = 판({ kv: {}, collRows: null, failedKeys: ['variantsVer'] });
  v.store['khm-variants-cache-v1'] = u.store['khm-variants-cache-v1'];
  const rows = await v.F.loadCollectionCached('variants', { strict: true });
  봄('🔴 버전을 못 읽으면 재워 둔 것을 «낡은 채로» 쓴다 (통째로 두드리지 않는다)', [rows.length, v.읽음], [3, ['kv/variantsVer']]);
  봄('아무것도 없으면 그때만 (strict) 실패가 던져진다', await v.F.loadCollectionCached('problembank', { strict: true }).then(() => 'ok', e => 'threw'), 'threw');
}

console.log(NL + '③ 쓰면 버전이 오른다 — 문 안에서, 모아서, 강사만' + NL);
{
  const t = 판({ kv: { variantsVer: '1' } });
  await t.F.loadCollectionCached('variants', { strict: true });
  t.F.collectionTouched('variants'); t.F.collectionTouched('variants'); t.F.collectionTouched('variants');
  봄('🔵 내 브라우저의 재운 것은 안 지운다 (10-22 — 다음에 바뀐 것만 받는다)', 'khm-variants-cache-v1' in t.store, true);
  봄('잇달아 셋 → 타이머는 하나씩 (마지막 것만 산다)', t.timers.length, 3);
  await t.timers[t.timers.length - 1]();
  봄('🔴 kv 의 버전 문서를 올린다', [t.쓴것.length, t.쓴것[0].key], [1, 'variantsVer']);
  봄('글자 버전 위에 올리면 full 이 붙는다 (도구가 바꾼 것을 «바뀐 것만»으로 못 건진다)', typeof t.쓴것[0].v.full, 'number');
  const s = 판({ user: { type: 'student' } });
  s.F.collectionTouched('problembank');
  봄('학생은 버전을 안 올린다 (kv 를 못 쓴다)', s.timers.length, 0);
  const x = 판({});
  x.F.collectionTouched('records');
  봄('재우지 않는 컬렉션은 아무 일도 없다', x.timers.length, 0);
}

console.log(NL + '③-2 바뀐 것만 받기 (10-22 · 한도 #4)' + NL);
{
  const 지금 = Date.now();
  const t = 판({ kv: { variantsVer: { t: 1, del: [] } }, changed: [{ id: 'A', t: 지금, row: { code: 'A', 고침: 1 } }, { id: 'D', t: 지금, row: { code: 'D' } }] });
  await t.F.loadCollectionCached('variants', { strict: true });
  봄('처음엔 통째 + 문서 이름도 재운다', JSON.parse(t.store['khm-variants-cache-v1']).ids, ['A', 'B', 'C']);
  t.읽음.length = 0;
  t.kv.variantsVer = { t: 2, del: [['B', 지금]] };
  const r = await t.F.loadCollectionCached('variants', { strict: true });
  봄('🔴 버전이 바뀌면 «바뀐 것만» — 통째로 안 읽는다', t.읽음, ['kv/variantsVer', '바뀐것:variants']);
  봄('고친 것은 갈아 끼우고 · 새것은 붙이고 · 지운 것은 뺀다', r.map(v => v.code + (v.고침 ? '*' : '')), ['A*', 'C', 'D']);
  봄('합친 것을 새 버전으로 재운다', [JSON.parse(t.store['khm-variants-cache-v1']).ids, JSON.parse(t.store['khm-variants-cache-v1']).ver.t], [['A', 'C', 'D'], 2]);
  t.읽음.length = 0;
  t.kv.variantsVer = { t: 3, del: [], full: 지금 + 3600000 };
  await t.F.loadCollectionCached('variants', { strict: true });
  봄('full 보다 먼저 재운 것은 통째로', t.읽음, ['kv/variantsVer', 'variants']);
  t.읽음.length = 0;
  t.kv.variantsVer = '999';
  await t.F.loadCollectionCached('variants', { strict: true });
  봄('글자 버전(도구)이면 통째로', t.읽음, ['kv/variantsVer', 'variants']);
  const u = 판({ kv: { variantsVer: { t: 1 } }, changed: null });
  await u.F.loadCollectionCached('variants', { strict: true });
  u.읽음.length = 0; u.kv.variantsVer = { t: 2 };
  await u.F.loadCollectionCached('variants', { strict: true });
  봄('바뀐 것을 못 받으면 예전처럼 통째로', u.읽음, ['kv/variantsVer', '바뀐것:variants', 'variants']);
  const w = 판({ kv: { variantsVer: { t: 1 } }, changed: [{ id: 'B', t: 지금 + 5, row: { code: 'B' } }] });
  await w.F.loadCollectionCached('variants', { strict: true });
  w.kv.variantsVer = { t: 2, del: [['B', 지금]] };
  봄('지운 뒤 다시 쓴 것은 산다', (await w.F.loadCollectionCached('variants', { strict: true })).map(v => v.code), ['A', 'B', 'C']);
  const x = 판({ kv: { variantsVer: { t: 1, del: [['옛것', 1]] } } });
  await x.F.loadCollectionCached('variants', { strict: true });
  x.F.collDelPending.variants = [['Z', 지금]];
  x.F.collectionTouched('variants');
  await x.timers[0]();
  봄('지운 것을 버전에 싣고 · 오래된 것은 털고 · full 은 안 붙인다', [x.쓴것[0].v.del, x.쓴것[0].v.full], [[['Z', 지금]], undefined]);
}

console.log(NL + '④ 닻 — 문 둘에 걸렸고, 읽는 자리 셋이 바뀌었다' + NL);
{
  봄('dbSetDoc 이 부른다', 알맹이(lift('dbSetDoc')).includes('collectionTouched(collection);'), true);
  봄('dbDeleteDoc 이 부른다', 알맹이(lift('dbDeleteDoc')).includes('collectionTouched(collection);'), true);
  봄('dbSetDoc 이 _t 를 적는다', 알맹이(lift('dbSetDoc')).includes('deltaStamp(collection, docFields(data))'), true);
  봄('dbDeleteDoc 이 지운 것을 싣는다', 알맹이(lift('dbDeleteDoc')).includes('collDelPending[collection]'), true);
  봄('창고 본문(items)도 바뀐 것만', 알맹이(lift('loadItemsRows')).includes("deltaMerge('items', cached, ver)"), true);
  봄('학생 «내 변형» 버전은 글자로 묶는다 (객체 + 글자 = 늘 같음 함정)', 알맹이(lift('loadVariantsOfRoots')).includes("JSON.stringify(await dbGet('variantsVer'"), true);
  봄('변형 창고가 재운 것을 읽는다', 알맹이(lift('loadVariantsIfNeeded')).includes("loadCollectionCached('variants', {strict:true})"), true);
  봄('학생 로그인이 problembank 를 재운 것으로 읽는다', 알맹이(lift('loadStudentData')).includes("loadCollectionCached('problembank')"), true);
  봄('강사 로그인도', 알맹이(lift('loadAllData')).includes("loadCollectionCached('problembank')"), true);
  봄('🔴 통째로 읽는 옛 줄이 안 남았다', /dbGetCollection\('(variants|problembank)'/.test(알맹이(html)), false);
}

console.log(NL + '⑤ 학생은 제 오답 문항의 변형만 (2026-10-16 · 한도 #3 — 576개 통째가 하루 읽기의 62%)' + NL);
{
  const 질의 = [];
  const 가짜fetch = async (url, o) => { const q = JSON.parse(o.body).structuredQuery; 질의.push(q);
    return { ok: true, json: async () => [{ document: { fields: { value: { stringValue: '{"code":"X-N01"}' } } } }, { readTime: 1 }] }; };
  const G = new Function('fetch', 'withTimeout', 'getAuthToken', 'FIRESTORE_ROOT', 'FIRESTORE_PATH',
    lift('dbGetVariantsOfRoots') + NL + 'return dbGetVariantsOfRoots;')(가짜fetch, p => p, async () => 't', 'https://x', 'projects/p/databases/(default)/documents');
  const roots = Array.from({ length: 16 }, (_, i) => 'K2-05-E-' + String(i).padStart(4, '0'));
  const rows = await G(roots);
  봄('16개 → 질의 둘(15 + 1)', 질의.length, 2);
  봄('문서 하나씩 받는다', rows.length, 2);
  const 하나 = 질의[1].where.compositeFilter;
  봄('하나뿐이면 OR 없이 범위 AND', 하나.op, 'AND');
  const [아래, 위] = 하나.filters.map(f => f.fieldFilter.value.referenceValue.split('/variants/')[1]);
  const 든다 = c => c >= 아래 && c < 위;
  봄('범위가 그 원본의 변형을 집는다', ['K2-05-E-0015-N01', 'K2-05-E-0015-D02', 'K2-05-E-0015-U01'].map(든다), [true, true, true]);
  봄('원본 자신·이웃 원본은 안 집는다', ['K2-05-E-0015', 'K2-05-E-0016-N01', 'K2-05-E-00150-N01'].map(든다), [false, false, false]);
  봄('첫 질의는 OR 열다섯', [질의[0].where.compositeFilter.op, 질의[0].where.compositeFilter.filters.length], ['OR', 15]);

  봄('반쪽 창고는 학생에게만', 알맹이(lift('loadVariantsIfNeeded')).includes("state.currentUser.type === 'student')) roots = null"), true);
  봄('학생 화면이 오답 원본을 넘긴다', 알맹이(lift('stuCtx')).includes('loadVariantsIfNeeded([...new Set((rec.wrongHomework'), true);
}

console.log(NL + (fail ? `🔴 ${fail}개 실패 · ${pass + fail}개` : `✓ 전부 통과 · ${pass}개`));
process.exit(fail ? 1 : 0);
