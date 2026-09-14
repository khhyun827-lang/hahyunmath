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
  const weekStartOf = () => '2026-09-14';
  const gameOfWeek = () => ({ key: 'dodge', name: '똥피하기', icon: '💩' });
  const authUid = () => __uid;
  async function dbGetCollectionWhere(c, k, v){
    return Object.entries(__db).filter(([id, d]) => id.startsWith(c + '/') && d[k] === v).map(([, d]) => JSON.parse(JSON.stringify(d)));
  }
  async function dbSetDoc(c, id, data){ __db[c + '/' + id] = JSON.parse(JSON.stringify(data)); __wrote.push(c + '/' + id); return true; }
`;
const src = stubs + '\n'
  + 'const RANK_TOP = 5;\nconst rankCache = {};\n'
  + lift('loadRank', 'async function') + '\n'
  + lift('rankRowsOf', 'async function') + '\n'
  + lift('rankSubmit', 'async function') + '\n'
  + 'return { rankSubmit, loadRank, rankCache };';

const AsyncFn = Object.getPrototypeOf(async function(){}).constructor;
const make = (uid) => new Function('__db', '__wrote', '__uid', src)(db, 쓴것, uid);

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

console.log(`\n${pass} 통과 · ${fail} 실패`);
process.exit(fail ? 1 : 0);
