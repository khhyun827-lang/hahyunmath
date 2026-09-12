// 워커가 «되돌려주기»를 하고 있는가 — 올린 뒤에 이걸로 확인한다 (2026-09-06)
//
//   node tools/worker-check.mjs          ← 한도만 본다 (한 건도 «안» 쓴다)
//   node tools/worker-check.mjs --try    ← 한 건 불러서 되돌려주는지 실제로 잰다
//
// 🔵 **왜 필요한가** — 워커를 올렸는지, 올린 것이 도는지 «짐작»하지 않기 위해서다.
//   2026-09-06에 Gemini 가 429(한도)·503(붐빔)을 내는데 **실패해도 우리 하루치가 깎이고**
//   있었다. 워커가 Gemini 를 부르기 «전»에 세기 때문이다. 그래서 `refundQuota` 를 넣었다.
//
// 🔴 **`--try` 는 한 건을 쓸 수도 있다.** 위쪽이 거절하면 되돌려받아 0이 되지만,
//   Gemini 가 «제대로 답하면» 그건 진짜로 한 건을 쓴 것이다(그게 정상이다).
// ⚠ `/quota` 는 세지 않고 보기만 한다 — 그래서 인자 없이 돌리는 것은 언제나 공짜다.

const API_KEY = 'AIzaSyC7dsvcLVjuFUUtnQRtPLurzBN06kZ9MZQ';   // index.html 에 이미 공개된 값
const WORKER = 'https://hahyunmath-gemini-proxy.khhyun827.workers.dev';
const 재볼까 = process.argv.includes('--try');

async function 토큰() {
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ returnSecureToken: true }) });
  if (!r.ok) { console.error('🔴 로그인 실패 — ' + r.status); process.exit(1); }
  return (await r.json()).idToken;
}
const H = { Authorization: 'Bearer ' + (await 토큰()) };
const 한도 = async (bucket) => {
  const r = await fetch(WORKER + '/quota' + (bucket ? '?bucket=' + bucket : ''), { method: 'POST', headers: H });
  if (!r.ok) { console.error('🔴 워커가 대답을 안 합니다 — http ' + r.status); process.exit(1); }
  return JSON.parse(await r.text());
};

const 전 = await 한도();
console.log('\n  워커는 살아 있습니다 · 오늘 쓴 것 ' + 전.used + '/' + 전.limit + ' (남은 것 ' + 전.remaining + ')');
/* 둘째 엔진(Groq 로 만드는 변형)과 검토 통도 같이 (2026-09-12). 옛 판 워커는 twin-groq 를 모르니 ai 통을 돌려준다 — 그때는 같은 수가 보인다 */
try { const g = await 한도('twin-groq'), rv = await 한도('review'); console.log('  Groq 변형 ' + g.used + '/' + g.limit + ' · Groq 검토 ' + rv.used + '/' + rv.limit
    + (typeof rv.raw === 'number' ? '  (한 통이다 — 실제로 검토 ' + rv.raw + '건 · 변형 ' + rv.twins + '건×' + rv.cost + ')' : '  (옛 판 — 통이 따로다)')); } catch (_) {}
/* 🔴 «어느 판이 도는가» — 저장소의 WORKER_VERSION 과 배포본이 돌려준 version 을 견준다 (2026-09-11).
   살아 있다는 것과 새 판이라는 것은 다른 말이다. 붙여넣기를 빠뜨리면 여기서 걸린다. */
{
  const src = (await import('fs')).readFileSync(new URL('../worker/gemini-proxy.js', import.meta.url), 'utf8');
  const 저장소판 = (src.match(/WORKER_VERSION = '([^']+)'/) || [])[1] || '?';
  const 배포판 = 전.version || '(없음 — 09-11 이전 판)';
  if (배포판 === 저장소판) console.log('  ✅ 배포본이 저장소와 같은 판입니다 (' + 저장소판 + ')');
  else console.log('  🔴 배포본 판 ' + 배포판 + ' ≠ 저장소 판 ' + 저장소판 + ' — worker/gemini-proxy.js 를 대시보드에 다시 붙여넣어야 합니다');
}
if (!재볼까) {
  console.log('\n  ⓘ 되돌려주기가 도는지까지 보려면 --try 를 붙이세요 (한 건을 쓸 수도 있습니다).\n');
  process.exit(0);
}

console.log('  한 건 불러 봅니다… (30초쯤 걸립니다)');
const t0 = Date.now();
const r = await fetch(WORKER, { method: 'POST', headers: { ...H, 'Content-Type': 'application/json' },
  body: JSON.stringify({ content: '두 점 $A(1,2)$, $B(4,6)$ 사이의 거리를 구하시오.', answer: '5' }) });
const 몸통 = await r.text();
const 걸린 = ((Date.now() - t0) / 1000).toFixed(1);
const 후 = await 한도();
const 늘어난 = 후.used - 전.used;

console.log('\n  http ' + r.status + ' · ' + 걸린 + '초 · 한도가 ' + 전.used + ' → ' + 후.used + ' (늘어난 것 ' + 늘어난 + ')');
if (r.ok) {
  console.log('  ✅ Gemini 가 제대로 답했습니다 — 한 건 쓴 것이 맞습니다(늘어난 것 1이면 정상).');
  process.exit(0);
}
/* 위쪽이 거절했는가 — 그때만 되돌려줘야 한다. */
let 까닭 = '', 위쪽 = 0;
try { const j = JSON.parse(몸통); 까닭 = String(j.detail || j.error || '');
  const m = 까닭.match(/"code":\s*(\d+)/); 위쪽 = m ? +m[1] : 0; } catch (e) { 까닭 = 몸통.slice(0, 200); }
console.log('  위쪽이 낸 코드: ' + (위쪽 || '(못 읽음)') + ' · ' + 까닭.replace(/\s+/g, ' ').slice(0, 120));
const 거절 = 위쪽 === 429 || (위쪽 >= 500 && 위쪽 <= 599);
if (!거절) {
  console.log('\n  ⚠ 위쪽이 «거절»한 것이 아니라 모델이 이상한 답을 낸 것 같습니다 —');
  console.log('    그건 Gemini 를 진짜로 쓴 것이라 «안» 돌려주는 것이 맞습니다.\n');
  process.exit(0);
}
if (늘어난 === 0) {
  console.log('\n  ✅ **되돌려주기가 돕니다** — 위쪽이 거절했고 한도가 안 깎였습니다. 워커가 최신입니다.\n');
  process.exit(0);
}
console.log('\n  🔴 **아직 옛 워커입니다** — 위쪽이 거절했는데 한도가 ' + 늘어난 + '건 깎였습니다.');
console.log('     worker/gemini-proxy.js 를 Cloudflare 에 올려주세요.\n');
process.exit(1);
