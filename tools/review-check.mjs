// 워커의 /review 가 «실제로 도는가» — 올린 뒤 이걸로 확인한다 (2026-09-07)
//
//   node tools/review-check.mjs          ← 길이 뚫렸는지만 본다 (한 건도 «안» 쓴다)
//   node tools/review-check.mjs --try    ← 쉬운 문제 하나를 실제로 검토시킨다 (한 건 쓴다)
//
// 🔵 **짐작하지 않기 위해서다.** 「배포한 것 같아」와 「배포됐다」는 다르다.
//   /quota?bucket=review 가 답하면 코드는 올라간 것이고,
//   /review 가 답하면 GROQ_KEY 비밀까지 살아 있는 것이다. 둘은 따로 확인해야 한다 —
//   코드만 올리고 비밀을 안 넣으면 앞은 되고 뒤는 500 이다.
//
// ⚠ /quota 는 세지 않고 보기만 한다 — 인자 없이 돌리는 것은 언제나 공짜다.

const API_KEY = 'AIzaSyC7dsvcLVjuFUUtnQRtPLurzBN06kZ9MZQ';   // index.html 에 이미 공개된 값
const WORKER = 'https://hahyunmath-gemini-proxy.khhyun827.workers.dev';
const 재볼까 = process.argv.includes('--try');

const r0 = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`,
  { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ returnSecureToken: true }) });
const { idToken } = await r0.json();
if (!idToken) { console.log('🔴 Firebase 익명 토큰을 못 받았습니다'); process.exit(1); }
const H = { Authorization: 'Bearer ' + idToken };

const 한도 = async () => {
  const r = await fetch(WORKER + '/quota?bucket=review', { method: 'POST', headers: H });
  const t = await r.text();
  try { return { ok: r.ok, ...JSON.parse(t) }; } catch (e) { return { ok: false, 글: t.slice(0, 120) }; }
};

const q = await 한도();
if (!q.ok) { console.log('🔴 /quota 가 답하지 않습니다 — ' + JSON.stringify(q)); process.exit(1); }
if (q.limit !== 60) {
  console.log('⚠ 검토 통이 아직 없습니다 (limit ' + q.limit + ') — 옛 코드가 올라가 있습니다.');
  console.log('   새 gemini-proxy.js 를 배포해야 합니다.');
  process.exit(1);
}
console.log('① 코드 — 올라가 있습니다. 검토 한도 ' + q.used + '/' + q.limit + ' (남은 것 ' + q.remaining + ')');

if (!재볼까) {
  console.log('');
  console.log('   비밀(GROQ_KEY)까지 살아 있는지 보려면:  node tools/review-check.mjs --try');
  console.log('   ⚠ 그때는 검토 한 건을 씁니다 (60 중 1).');
  process.exit(0);
}

/* 쉬운 문제 하나. 여기서 틀리면 모델이 아니라 «길»이 잘못된 것이다. */
const 문항 = { content: '2 와 3 의 합은? ① $4$ ② $5$ ③ $6$ ④ $7$ ⑤ $8$', answer: '②' };
const r = await fetch(WORKER + '/review', {
  method: 'POST', headers: { ...H, 'Content-Type': 'application/json' }, body: JSON.stringify(문항),
});
const t = await r.text();
let j; try { j = JSON.parse(t); } catch (e) { j = { 글: t.slice(0, 200) }; }

if (r.status === 500 && j.error === 'no key') {
  console.log('🔴 GROQ_KEY 비밀이 워커에 없습니다 — 이름이 정확히 GROQ_KEY 인지 보세요.');
  process.exit(1);
}
if (r.status === 503) {
  console.log('⚠ Groq 쪽이 거절했습니다(오늘 토큰 소진일 수 있습니다) — ' + (j.detail || '').slice(0, 90));
  const q2 = await 한도();
  console.log('   한도 ' + q.used + ' → ' + q2.used + (q2.used === q.used ? '  ✅ 되돌려줬습니다' : '  🔴 깎였습니다'));
  process.exit(0);
}
if (!r.ok) { console.log('🔴 ' + r.status + ' — ' + JSON.stringify(j).slice(0, 200)); process.exit(1); }

console.log('② 비밀 — 살아 있습니다. 판정 ' + j.verdict + ' · 낸 답 ' + j.answer + ' · 부른 모델 ' + (j.models || []).join(', '));
if (j.verdict !== 'agree') {
  console.log('🔴 쉬운 문제인데 일치가 아닙니다 — 답 맞대기가 어긋났을 수 있습니다: ' + JSON.stringify(j));
  process.exit(1);
}
const q3 = await 한도();
console.log('   한도 ' + q.used + ' → ' + q3.used + ' (한 건 쓴 것이 맞습니다)');
console.log('');
console.log('✅ 워커 /review 가 끝까지 돕니다.');
