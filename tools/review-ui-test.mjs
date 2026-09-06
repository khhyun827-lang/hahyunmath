// 화면과 워커가 «같은 말»을 하는가 (2026-09-07)
//
// 🔴 **한도 숫자가 두 곳에 산다.** index.html 과 worker/gemini-proxy.js.
//   AI_DAILY_LIMIT 이 어긋났을 때 「남았다고 떠 있는데 429」가 났다(2026-08-10).
//   검토 한도도 똑같이 두 곳이라 같은 사고가 날 수 있다 — 그래서 여기서 맞대 본다.
//
// 🔴 **워커가 내는 판정을 화면이 모두 알아야 한다.** 모르는 판정이 오면 배지가 «조용히»
//   사라진다. 검토를 돌렸는데 아무 표시가 없으면 선생님은 검토가 안 된 줄 안다.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const web = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const wrk = fs.readFileSync(path.join(ROOT, 'worker', 'gemini-proxy.js'), 'utf8');

let 흠 = 0;
const 봄 = (참, 말) => { if (!참) { 흠++; console.log('🔴 ' + 말); } };

// ① 한도가 같은가
const 웹한도 = (web.match(/const REVIEW_DAILY_LIMIT = (\d+);/) || [])[1];
const 워커한도 = (wrk.match(/const REVIEW_DAILY_LIMIT = (\d+);/) || [])[1];
봄(웹한도, 'index.html 에 REVIEW_DAILY_LIMIT 이 없습니다');
봄(워커한도, '워커에 REVIEW_DAILY_LIMIT 이 없습니다');
봄(웹한도 === 워커한도, '한도가 어긋납니다 — 화면 ' + 웹한도 + ' · 워커 ' + 워커한도);

// ② 워커가 내는 판정을 화면이 다 아는가
const 워커판정 = new Set([...wrk.matchAll(/verdict:\s*'([a-z-]+)'/g)].map((m) => m[1]));
const 조각 = web.slice(web.indexOf('const REVIEW_VERDICT'), web.indexOf('function reviewTagHTML'));
const { REVIEW_VERDICT } = new Function(조각 + '; return { REVIEW_VERDICT };')();
봄(워커판정.size > 0, '워커에서 판정 이름을 못 읽었습니다');
for (const v of 워커판정) 봄(REVIEW_VERDICT[v], '화면이 «' + v + '» 판정을 모릅니다 — 배지가 조용히 사라집니다');
for (const v of Object.keys(REVIEW_VERDICT)) 봄(워커판정.has(v), '화면에 «' + v + '» 이 있는데 워커는 안 냅니다 (죽은 갈래)');

// ③ 판정마다 «다른» 배지라야 한다 — 같으면 갈래를 나눈 뜻이 없다
const 배지 = { agree: 'ok', suspect: 'no', unsure: 'late' };
const 쓴것 = new Set(Object.values(배지));
봄(쓴것.size === Object.keys(배지).length, '판정 배지가 겹칩니다');
const tagFn = web.slice(web.indexOf('function reviewTagHTML'), web.indexOf('/* 오른쪽 판에 붙는 판정 조각'));
for (const v of Object.keys(배지)) 봄(tagFn.includes("'" + 배지[v] + "'"), 'reviewTagHTML 이 ' + v + ' 배지를 안 씁니다');

// ④ 🔴 판정이 문항을 «자동으로» 손대면 안 된다 — 사람이 누르는 것이라야 한다
const 몸통 = web.slice(web.indexOf('async function reviewVariantOne'), web.indexOf('function cancelReviewBatch'));
봄(!/approveAutoVariant|discardAutoVariant|advanceBankStatus/.test(몸통),
  '검토가 통과·버리기를 «스스로» 부릅니다 — 판정은 참고여야 합니다');
봄(!/delete\s+nv\.pending|pending:\s*false/.test(몸통), '검토가 pending 을 건드립니다');

// ⑤ 이미 본 것을 또 태우지 않는가 (하루 한도가 있다)
const 일괄 = web.slice(web.indexOf('async function reviewAllPending'), web.indexOf('function cancelReviewBatch'));
봄(/!v\.aiReview/.test(일괄), '일괄 검토가 «이미 검토한 것»을 걸러내지 않습니다');
봄(/REVIEW_DAILY_LIMIT/.test(일괄), '일괄 검토가 남은 한도를 안 봅니다');

// ⑥ 워커가 정답을 모델에게 넘기지 않는가 (여기서도 한 번 더 못 박는다)
const 보냄 = wrk.slice(wrk.indexOf('async function reviewSolve'), wrk.indexOf('async function handleReview'));
봄(!/answer/.test(보냄.slice(보냄.indexOf('messages:'), 보냄.indexOf('});'))),
  'reviewSolve 가 모델에게 정답을 실어 보냅니다');

console.log(흠 ? '🔴 ' + 흠 + '개 어긋남' : '통과 — 한도 · 판정 이름 · 배지 · 자동조작 없음 · 중복 방지 · 정답 유출 없음');
process.exit(흠 ? 1 : 0);
