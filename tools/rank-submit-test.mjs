// 「한 판 끝나면 순위 문서가 «내 것 하나» 쓰인다」 — 순위 저장 길의 검사 (2026-09-14)
//
//   node tools/rank-submit-test.mjs
//
// 🔴 **2026-09-08에 순위를 `ranks/{주}__{uid}` 로 옮기면서 `rankRowsOf` 를 부르기만 하고
//    짓지 않았다.** 그래서 엿새 동안 한 판 끝날 때마다 `rankSubmit` 이 ReferenceError 로
//    넘어졌고(부르는 쪽이 삼켰다), `ranks` 에 문서가 한 장도 안 쌓여 순위가 빈 채로 떴다.
//    학생 화면에는 아무 표시도 없었다 — 콘솔에만 「순위 저장 실패」가 찍혔다.
//
// ⚠ 이 검사는 순위 함수 넷을 들어 올려 **가짜 DB 위에서 한 판을 돌려 본다.**
//    없는 함수를 부르면 여기서 바로 넘어진다 — 배포본에서 엿새 뒤에 아는 대신.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

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

let pass = 0, fail = 0;
const 봄 = (무엇, 나온것, 나와야할것) => {
  const ok = JSON.stringify(나온것) === JSON.stringify(나와야할것);
  if (ok) { pass++; console.log('  ✓ ' + 무엇); }
  else { fail++; console.log(`  ✗ ${무엇}\n      나온 것: ${JSON.stringify(나온것)}\n      나와야:  ${JSON.stringify(나와야할것)}`); }
};

/* ── 가짜 DB — 컬렉션 하나, 문서는 {value, uid, week} 꼴 그대로 ── */
const db = {};                          // 'ranks/2026-09-14__u1' → data
const 쓴것 = [];
const stubs = `
  const todayStr = () => '2026-09-16';
  const weekStartOf = (d) => (d && d < '2026-09-14') ? '2026-09-07' : '2026-09-14';
  const shiftYmd = (d, n) => { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
  const collectionReadFailed = new Set();
  const localStorage = __ls;
  const gameOfWeek = () => ({ key: 'dodge', name: '똥피하기', icon: '💩' });
  const authUid = () => __uid;
  async function dbGetCollectionWhere(c, k, v){
    return Object.entries(__db).filter(([id, d]) => id.startsWith(c + '/') && d[k] === v).map(([, d]) => JSON.parse(JSON.stringify(d)));
  }
  async function dbSetDoc(c, id, data){ __db[c + '/' + id] = JSON.parse(JSON.stringify(data)); __wrote.push(c + '/' + id); return true; }
`;
const src = stubs + '\n'
  + 'const RANK_TOP = 5;\nconst rankCache = {};\n'
  + "const RANK_STORE_KEY = 'khm-rank-cache-v1';\n"
  + lift('rankStoreRead') + '\n' + lift('rankStoreWrite') + '\n'
  + lift('loadRank', 'async function') + '\n'
  + lift('rankRowsOf', 'async function') + '\n'
  + lift('rankSubmit', 'async function') + '\n'
  + 'return { rankSubmit, loadRank, rankCache };';

const AsyncFn = Object.getPrototypeOf(async function(){}).constructor;
/* 가짜 localStorage — 브라우저마다 하나이므로 판마다 새로 준다 */
const 저장소 = () => { const m = {}; return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: k => { delete m[k]; }, _m: m }; };
let __ls = 저장소();
const make = (uid, ls) => new Function('__db', '__wrote', '__uid', '__ls', src)(db, 쓴것, uid, ls || __ls);

console.log('순위 저장 길 —');

/* ① 첫 학생이 한 판 */
{
  const A = make('u1');
  const rows = await A.rankSubmit('s1', '김학생', '고1', 120);
  봄('① 첫 판 — 내 문서 하나가 쓰인다', 쓴것, ['ranks/2026-09-14__u1']);
  봄('① 문서에 uid·week 색인이 들어 있다', [db['ranks/2026-09-14__u1'].uid, db['ranks/2026-09-14__u1'].week], ['u1', '2026-09-14']);
  봄('① 돌려준 순위에 내가 있다', rows.map(r => [r.sid, r.score]), [['s1', 120]]);
}

/* ② 다른 학생이 더 높은 점수 — 남의 문서는 안 건드린다 */
{
  const B = make('u2');
  const rows = await B.rankSubmit('s2', '이학생', '고2', 300);
  봄('② 둘째 학생 — 제 문서만 새로 쓴다', 쓴것.slice(1), ['ranks/2026-09-14__u2']);
  봄('② 순위가 점수순이고 둘 다 있다', rows.map(r => r.sid), ['s2', 's1']);
  봄('② 첫 학생 문서는 그대로다', db['ranks/2026-09-14__u1'].score, 120);
}

/* ③ 첫 학생이 낮은 점수로 다시 — 안 덮는다 · 높은 점수 — 덮는다 */
{
  const A = make('u1');
  const n = 쓴것.length;
  await A.rankSubmit('s1', '김학생', '고1', 50);
  봄('③ 낮은 점수는 안 쓴다', 쓴것.length, n);
  봄('③ 낮은 점수여도 순위는 새로 읽어 남의 점수가 보인다', A.rankCache['2026-09-14'].map(r => r.sid), ['s2', 's1']);
  const rows = await A.rankSubmit('s1', '김학생', '고1', 500);
  봄('③ 높은 점수는 내 문서를 덮는다', [쓴것.length, db['ranks/2026-09-14__u1'].score], [n + 1, 500]);
  봄('③ 그러면 1등이 된다', rows[0].sid, 's1');
}

/* ④ 재우기 — 홈을 다시 열면 DB 를 안 두드린다 · 한 판 뒤에는 새로 읽는다 */
{
  const ls = 저장소();
  const 읽음 = [];
  const C = make('u3', ls);
  const 원래 = db; // 같은 db
  /* dbGetCollectionWhere 를 세려고 한 번 더 감싼다 — loadRank 가 몇 번 DB 로 가는지 */
  const src2 = src.replace('async function dbGetCollectionWhere(c, k, v){', "async function dbGetCollectionWhere(c, k, v){ __reads.push(c + ':' + v);");
  const make2 = (uid, ls) => new Function('__db', '__wrote', '__uid', '__ls', '__reads', src2)(db, 쓴것, uid, ls, 읽음);
  const D = make2('u3', ls);
  await D.loadRank('2026-09-14'); await D.loadRank('2026-09-07');
  봄('④ 처음엔 두 주를 DB 에서 읽는다', 읽음, ['ranks:2026-09-14', 'ranks:2026-09-07']);
  봄('④ 읽은 것을 브라우저에 재웠다', Object.keys(JSON.parse(ls._m['khm-rank-cache-v1'])).sort(), ['2026-09-07', '2026-09-14']);
  const E = make2('u3', ls);              // 앱을 다시 연 것과 같다 (rankCache 는 새것, localStorage 는 그대로)
  await E.loadRank('2026-09-14'); await E.loadRank('2026-09-07');
  봄('④ 🔴 다시 열면 DB 를 안 두드린다 (재운 것)', 읽음.length, 2);
  봄('④ 재운 순위가 그대로 온다', E.rankCache['2026-09-14'].map(r => r.sid), ['s1', 's2']);
  /* 한 판 끝 — rankSubmit 은 새로 읽고 재운 것도 갈아 끼운다 */
  await E.rankSubmit('s3', '박학생', '고1', 700);
  봄('④ 한 판 뒤에는 새로 읽는다', 읽음.length, 3);
  const G = make2('u9', ls);
  await G.loadRank('2026-09-14');
  봄('④ 그 뒤 여는 사람은 새 순위(내 점수 포함)를 재운 것으로 본다', [읽음.length, G.rankCache['2026-09-14'][0].sid], [3, 's3']);
  /* 10분이 지나면 다시 읽는다 */
  const all = JSON.parse(ls._m['khm-rank-cache-v1']); all['2026-09-14'].at -= 31 * 60 * 1000; ls._m['khm-rank-cache-v1'] = JSON.stringify(all);
  const H = make2('u9', ls); await H.loadRank('2026-09-14');
  봄('④ 이번 주는 30분 지나면 다시 읽는다', 읽음.length, 4);
  all['2026-09-07'].at -= 31 * 60 * 1000; ls._m['khm-rank-cache-v1'] = JSON.stringify(all);
  const I = make2('u9', ls); await I.loadRank('2026-09-07');
  봄('④ 지난 주는 30분으로는 안 다시 읽는다 (하루)', 읽음.length, 4);
}

console.log(`\n${pass} 통과 · ${fail} 실패`);
process.exit(fail ? 1 : 0);
