// 문항 본문 캐시 검사 — 「564건 → 1건」이 정말 되는지, 그리고 «빈 것이 굳지» 않는지 본다 (2026-09-06)
//
//   node tools/items-cache-test.mjs
//
// 🔴 **DB 를 안 건드린다.** 이 검사가 지키려는 것이 바로 «읽기 한 건이라도 아끼는 것»인데,
//    검사하느라 564건을 읽으면 앞뒤가 안 맞는다. index.html 에서 함수를 글자로 떼어 와
//    localStorage·dbGet·dbGetCollection 을 흉내 낸 것으로 갈아 끼우고 돌린다.
//    (hwpx.js 를 node 가 읽는 것, dq-face-test.mjs 와 같은 수법이다. 베껴 적으면 둘이 갈린다.)
//
// ⚠ 여기서 세는 «읽기»는 Firestore 과금 단위와 같다 — **돌려받은 문서 수**다.
//    버전 문서 1건 + (읽었다면) 문항 수. 그래서 표의 기대값이 곧 그날의 요금이다.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

/* `const ITEMS_VER_KEY` 부터 `loadItemsRows` 의 닫는 괄호까지를 통째로 떼어 온다. */
function liftCacheBlock() {
  const from = html.indexOf('const ITEMS_VER_KEY');
  if (from < 0) throw new Error('ITEMS_VER_KEY 를 못 찾았습니다');
  const at = html.indexOf('async function loadItemsRows(', from);
  if (at < 0) throw new Error('loadItemsRows 를 못 찾았습니다');
  let depth = 0;
  for (let j = html.indexOf('{', at); j < html.length; j++) {
    if (html[j] === '{') depth++;
    else if (html[j] === '}') { depth--; if (!depth) return html.slice(from, j + 1); }
  }
  throw new Error('loadItemsRows 의 끝을 못 찾았습니다');
}
const BLOCK = liftCacheBlock();

// ── 흉내 내는 세상 ────────────────────────────────────────────────────
function makeWorld({ ver = 'v1', rows = null, verFails = false, collFails = false } = {}) {
  const store = new Map();
  const localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
  const dbReadFailed = new Set();
  const collectionReadFailed = new Set();
  const w = { reads: 0, collectionCalls: 0, store };

  async function dbGet(key, fallback) {
    w.reads++;                                   // 문서 1건
    if (verFails) { dbReadFailed.add(key); return fallback; }
    dbReadFailed.delete(key);
    return ver;
  }
  async function dbGetCollection(collection) {
    w.collectionCalls++;
    if (collFails) { collectionReadFailed.add(collection); w.reads++; return []; }
    collectionReadFailed.delete(collection);
    const out = rows || [];
    w.reads += out.length || 1;                  // 빈 결과도 최소 1건은 센다
    return out;
  }
  const api = new Function(
    'localStorage', 'dbGet', 'dbGetCollection', 'dbReadFailed', 'collectionReadFailed', 'console',
    BLOCK + '\nreturn { loadItemsRows, itemsCacheWrite, itemsCacheRead, itemsCacheClear,'
          + ' hit: () => itemsCacheHit, KEY: ITEMS_CACHE_KEY, TTL: ITEMS_CACHE_TTL };'
  )(localStorage, dbGet, dbGetCollection, dbReadFailed, collectionReadFailed,
    { warn(){}, error(){}, log(){} });
  return Object.assign(w, api, { localStorage });
}

const 문항 = (n) => Array.from({ length: n }, (_, i) => ({ code: 'K2-01-E-' + String(i + 1).padStart(4, '0'), content: '본문 ' + i }));
const 본문564 = 문항(564);

// ── 검사 ──────────────────────────────────────────────────────────────
let pass = 0, fail = 0;
function 봄(무엇, 나온것, 나와야할것) {
  const ok = JSON.stringify(나온것) === JSON.stringify(나와야할것);
  if (ok) { pass++; console.log('  ✓ ' + 무엇); }
  else { fail++; console.log('  ✗ ' + 무엇 + '\n      나온 것: ' + JSON.stringify(나온것) + '\n      나와야:  ' + JSON.stringify(나와야할것)); }
}

console.log('\n문항 본문 캐시 — 564제로 돌린다\n');

{ // ① 처음 여는 브라우저
  const w = makeWorld({ rows: 본문564 });
  const rows = await w.loadItemsRows();
  봄('첫 열기 — 564개를 받는다', rows.length, 564);
  봄('첫 열기 — 읽기는 1(버전) + 564', w.reads, 565);
  봄('첫 열기 — 재워 뒀다', (JSON.parse(w.store.get(w.KEY)).rows || []).length, 564);
}
{ // ② 두 번째부터가 이 일의 전부다
  const w = makeWorld({ rows: 본문564 });
  await w.loadItemsRows();
  const before = w.reads;
  const rows = await w.loadItemsRows();
  봄('두 번째 열기 — 그래도 564개다', rows.length, 564);
  봄('🔵 두 번째 열기 — 읽기가 «1건»이다', w.reads - before, 1);
  봄('두 번째 열기 — 컬렉션은 안 두드린다', w.collectionCalls, 1);
  봄('재워 둔 것을 썼다고 말한다', w.hit(), 'cache');
}
{ // ③ 교재를 새로 올리면(버전이 바뀌면) 다시 읽어야 한다
  const w = makeWorld({ rows: 본문564, ver: 'v1' });
  await w.loadItemsRows();
  const w2 = makeWorld({ rows: 문항(600), ver: 'v2' });
  w2.store.set(w2.KEY, w.store.get(w.KEY));            // 같은 브라우저인 척
  const rows = await w2.loadItemsRows();
  봄('버전이 바뀌면 다시 읽는다', rows.length, 600);
  봄('바뀐 것으로 다시 재운다', JSON.parse(w2.store.get(w2.KEY)).ver, 'v2');
}
{ // ④ 🔴 여기가 이 캐시의 목숨줄이다
  const w = makeWorld({ collFails: true });
  const rows = await w.loadItemsRows();
  봄('읽기가 엎어지면 빈 것을 받는다(앱은 안 선다)', rows.length, 0);
  봄('🔴 실패한 «빈 것»은 절대 안 재운다', w.store.has(w.KEY), false);
}
{ // ⑤ 429 로 버전조차 못 물어보는 때 — 창고가 통째로 비는 것보다 낡은 것이 낫다
  const good = makeWorld({ rows: 본문564 });
  await good.loadItemsRows();
  const w = makeWorld({ verFails: true, collFails: true });
  w.store.set(w.KEY, good.store.get(good.KEY));
  const rows = await w.loadItemsRows();
  봄('버전을 못 읽어도 재워 둔 것으로 버틴다', rows.length, 564);
  봄('그때 564건을 또 두드리지 않는다', w.collectionCalls, 0);
  봄('낡았다고 말한다', w.hit(), 'stale');
}
{ // ⑥ 버전도 못 읽고 재워 둔 것도 없으면 — 평소대로 두드려 본다
  const w = makeWorld({ verFails: true, collFails: true });
  const rows = await w.loadItemsRows();
  봄('재워 둔 것이 없으면 컬렉션을 읽어 본다', w.collectionCalls, 1);
  봄('그래도 안 되면 빈 것이다(그리고 안 재운다)', [rows.length, w.store.has(w.KEY)], [0, false]);
}
{ // ⑦ 목숨(TTL) — 도구(--push)가 버전을 안 올린 채 들어와도 하루 반나절이면 맞는다
  const w = makeWorld({ rows: 본문564 });
  await w.loadItemsRows();
  const c = JSON.parse(w.store.get(w.KEY));
  c.at = Date.now() - (w.TTL + 60000);
  w.store.set(w.KEY, JSON.stringify(c));
  const before = w.collectionCalls;
  await w.loadItemsRows();
  봄('12시간이 지나면 다시 읽는다', w.collectionCalls - before, 1);
}
{ // ⑧ 진짜로 빈 컬렉션 — 재우면 «없다»가 굳는다
  const w = makeWorld({ rows: [] });
  await w.loadItemsRows();
  봄('진짜 빈 창고도 안 재운다', w.store.has(w.KEY), false);
}

console.log(`\n  ${fail ? '🔴' : '✅'} ${pass} 통과 · ${fail} 실패\n`);
process.exit(fail ? 1 : 0);
