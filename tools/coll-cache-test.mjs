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
  const F = new Function('localStorage', 'dbGet', 'dbGetCollection', 'dbSet', 'dbReadFailed', 'collectionReadFailed', 'markCollectionRead', 'state', 'setTimeout', 'clearTimeout', 'console',
    liftConst('COLL_CACHE') + NL + liftConst('COLL_CACHE_TTL') + NL + lift('collCacheRead') + NL + lift('collCacheWrite') + NL + lift('collCacheClear') + NL
    + lift('loadCollectionCached') + NL + 'const collBumpTimer = {};' + NL + lift('collectionTouched') + NL
    + 'return { loadCollectionCached, collectionTouched, COLL_CACHE };')(
    localStorage,
    async (key, fb) => { 읽음.push('kv/' + key); return key in kv ? kv[key] : fb; },
    async (col, opts) => { 읽음.push(col); if (o.collRows === null) { if (opts && opts.strict) throw new Error('firestore http 429'); return []; } return (o.collRows || [{ code: 'A' }, { code: 'B' }, { code: 'C' }]); },
    async (key, v) => { 쓴것.push({ key, v }); return true; },
    dbReadFailed, collectionReadFailed, () => {}, state,
    (fn, ms) => { timers.push(fn); return timers.length; }, () => {}, { warn() {}, error() {}, log() {} });
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
  봄('내 브라우저의 재운 것은 바로 지운다', 'khm-variants-cache-v1' in t.store, false);
  봄('잇달아 셋 → 타이머는 하나씩 (마지막 것만 산다)', t.timers.length, 3);
  await t.timers[t.timers.length - 1]();
  봄('🔴 kv 의 버전 문서를 올린다', [t.쓴것.length, t.쓴것[0].key], [1, 'variantsVer']);
  const s = 판({ user: { type: 'student' } });
  s.F.collectionTouched('problembank');
  봄('학생은 버전을 안 올린다 (kv 를 못 쓴다)', s.timers.length, 0);
  const x = 판({});
  x.F.collectionTouched('records');
  봄('재우지 않는 컬렉션은 아무 일도 없다', x.timers.length, 0);
}

console.log(NL + '④ 닻 — 문 둘에 걸렸고, 읽는 자리 셋이 바뀌었다' + NL);
{
  봄('dbSetDoc 이 부른다', 알맹이(lift('dbSetDoc')).includes('collectionTouched(collection);'), true);
  봄('dbDeleteDoc 이 부른다', 알맹이(lift('dbDeleteDoc')).includes('collectionTouched(collection);'), true);
  봄('변형 창고가 재운 것을 읽는다', 알맹이(lift('loadVariantsIfNeeded')).includes("loadCollectionCached('variants', {strict:true})"), true);
  봄('학생 로그인이 problembank 를 재운 것으로 읽는다', 알맹이(lift('loadStudentData')).includes("loadCollectionCached('problembank')"), true);
  봄('강사 로그인도', 알맹이(lift('loadAllData')).includes("loadCollectionCached('problembank')"), true);
  봄('🔴 통째로 읽는 옛 줄이 안 남았다', /dbGetCollection\('(variants|problembank)'/.test(알맹이(html)), false);
}

console.log(NL + (fail ? `🔴 ${fail}개 실패 · ${pass + fail}개` : `✓ 전부 통과 · ${pass}개`));
process.exit(fail ? 1 : 0);
