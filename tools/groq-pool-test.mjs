// 워커 — Groq 는 통이 하나다 (2026-09-13)
//
//   node tools/groq-pool-test.mjs
//
// 🔴 **왜 재는가** — 사용자가 짚었다: 「AI로 검토 60/60 이라고 뜨는데 그록 중 일부를 문항제작으로
//   돌렸으니까 좀더 줄어들어야 하는 거 아니야?」. 검토와 변형을 통을 따로 세면서 화면은 검토 통만
//   보여 줬다. 둘은 같은 Groq 열쇠·같은 하루 20만 토큰이다. 이제 워커가 «검토 환산» 한 통으로 답한다 —
//   변형 1건 ≈ 검토 3건. 여기서는 워커의 그 함수를 떠 와서 KV 를 흉내 내고 수를 견준다.
//   ⚠ 함수를 베끼지 않는다 — worker/gemini-proxy.js 에서 그대로 뜬다.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = fs.readFileSync(path.join(ROOT, 'worker/gemini-proxy.js'), 'utf8');
const NL = String.fromCharCode(10);

function lift(name) {
  let at = src.indexOf('async function ' + name + '(');
  if (at < 0) at = src.indexOf('function ' + name + '(');
  if (at < 0) throw new Error(name + ' 못 찾음');
  let depth = 0;
  for (let j = src.indexOf('{', at); j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}') { depth--; if (!depth) return src.slice(at, j + 1); }
  }
  throw new Error(name + ' 끝 못 찾음');
}
const num = (name) => {
  const m = src.match(new RegExp('const ' + name + ' = (\\d+);'));
  if (!m) throw new Error(name + ' 못 찾음');
  return Number(m[1]);
};
const REVIEW_DAILY_LIMIT = num('REVIEW_DAILY_LIMIT');
const TWIN_GROQ_DAILY_LIMIT = num('TWIN_GROQ_DAILY_LIMIT');
const GROQ_TWIN_COST = num('GROQ_TWIN_COST');

/* KV 흉내 — 통마다 «오늘 쓴 수»를 넣어 두면 peekQuota 가 그대로 읽는다 */
function envWith(review, twin) {
  const day = new Date().toISOString().slice(0, 10);
  const store = {
    ['q:review:_all:' + day]: String(review),
    ['q:twin-groq:_all:' + day]: String(twin),
  };
  return { QUOTA: { get: async (k) => store[k] ?? null } };
}
const api = new Function('REVIEW_DAILY_LIMIT', 'TWIN_GROQ_DAILY_LIMIT', 'GROQ_TWIN_COST',
  lift('quotaDay') + NL + lift('peekQuota') + NL + lift('groqQuota') + NL + 'return { groqQuota };'
)(REVIEW_DAILY_LIMIT, TWIN_GROQ_DAILY_LIMIT, GROQ_TWIN_COST);

let pass = 0, fail = 0;
const 봄 = (무엇, 나온것, 나와야) => {
  const ok = JSON.stringify(나온것) === JSON.stringify(나와야);
  if (ok) pass++; else fail++;
  console.log((ok ? '  ✓ ' : '  🔴 ') + 무엇 + (ok ? '' : NL + '      나온 것 ' + JSON.stringify(나온것) + NL + '      나와야 ' + JSON.stringify(나와야)));
};

console.log(NL + 'Groq 한 통 — 검토 ' + REVIEW_DAILY_LIMIT + ' · 변형 ' + TWIN_GROQ_DAILY_LIMIT + ' · 변형 1 ≈ 검토 ' + GROQ_TWIN_COST + NL);

async function 봐(review, twin) {
  const q = await api.groqQuota(envWith(review, twin), 'u1');
  return { 검토남음: q.review.remaining, 검토used: q.review.used, 변형남음: q['twin-groq'].remaining, 변형used: q['twin-groq'].used,
           raw: [q.review.raw, q['twin-groq'].raw] };
}

봄('아무것도 안 썼다 → 검토 60 · 변형 20(=60/3)', await 봐(0, 0),
   { 검토남음: 60, 검토used: 0, 변형남음: 20, 변형used: 0, raw: [0, 0] });
봄('🔴 사용자의 그 자리 — 변형 4건 → 검토는 60이 아니라 48', await 봐(0, 4),
   { 검토남음: 48, 검토used: 12, 변형남음: 16, 변형used: 4, raw: [0, 4] });
봄('검토 30건 → 변형은 10건만 남는다', await 봐(30, 0),
   { 검토남음: 30, 검토used: 30, 변형남음: 10, 변형used: 10, raw: [30, 0] });
봄('검토 58 · 변형 0 → 변형 0 (2건으로는 한 건도 못 만든다)', await 봐(58, 0),
   { 검토남음: 2, 검토used: 58, 변형남음: 0, 변형used: 20, raw: [58, 0] });
봄('변형 20 → 통이 다 찼다 · 검토 0 · 변형 0', await 봐(0, 20),
   { 검토남음: 0, 검토used: 60, 변형남음: 0, 변형used: 20, raw: [0, 20] });
봄('넘겨 썼어도 음수로 안 간다 (변형 22 · 검토 5)', await 봐(5, 22),
   { 검토남음: 0, 검토used: 60, 변형남음: 0, 변형used: 20, raw: [5, 22] });
봄('섞어 썼다 — 검토 10 · 변형 5 → 검토 35 · 변형 11', await 봐(10, 5),
   { 검토남음: 35, 검토used: 25, 변형남음: 11, 변형used: 9, raw: [10, 5] });

/* 화면이 하는 셈이 그대로 맞는가 — index.html 은 «한도 − used» 로 남은 것을 그린다 */
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const 앱검토 = Number((html.match(/const REVIEW_DAILY_LIMIT = (\d+);/) || [])[1]);
const 앱변형 = Number((html.match(/const GROQ_TWIN_DAILY_LIMIT = (\d+);/) || [])[1]);
봄('index.html 의 검토 뚜껑이 워커와 같다', 앱검토, REVIEW_DAILY_LIMIT);
봄('index.html 의 Groq 변형 뚜껑이 워커와 같다', 앱변형, TWIN_GROQ_DAILY_LIMIT);
{
  const q = await 봐(0, 4);
  봄('화면의 셈(60 − used)이 남은 것과 같다', 앱검토 - q.검토used, q.검토남음);
  봄('화면의 셈(20 − used)이 남은 변형과 같다', 앱변형 - q.변형used, q.변형남음);
}

console.log(NL + (fail ? '🔴 ' + fail + '개 실패 · ' : '✓ 전부 통과 · ') + pass + '개' + NL);
process.exit(fail ? 1 : 0);
