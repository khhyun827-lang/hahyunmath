/* 배포된 워커를 화면 없이 직접 눌러 본다 — 쌍둥이 생성의 «갈래»와 figureSpec만 볼 때 쓴다.
   (2026-08-11에 그림 갈래를 A/B/C로 맞추면서 만들었다.)

   왜 필요한가 — 로컬 브라우저는 ALLOW_ORIGIN에 막혀 워커를 못 부른다 (9절 1번).
   그런데 CORS는 «브라우저» 제약이라 Node에서는 걸리지 않는다.
   인증은 클라이언트와 같은 길이다 — 익명 로그인으로 Firebase ID 토큰을 받아 Bearer로 보낸다.
   (워커가 보는 것은 «이 사이트를 연 사람»이지 «강사»가 아니다. worker/gemini-proxy.js 머리말.)

   ⚠ **한 번 부를 때마다 하루 20건 한도를 하나 쓴다.** 화면을 태우기 전에 갈래만 볼 때만 쓴다.

   쓰는 법 —
     node tools/probe-worker.mjs cases.json
   cases.json은 배열이고 항목마다 { label, content, answer, fileId }다.
   fileId는 그 문항의 그림(드라이브)이다. 브라우저 콘솔에서 이렇게 뽑는다 —
     const b = DATA.problemBank.find(x=>x.id==='pb…');
     const img = await dbGet('pbimg:'+b.id, null);
     JSON.stringify([{label:'1번', content:b.originalContent, answer:b.originalAnswer, fileId:img.fileId}])

   ⚠ cases.json은 시험지 본문이라 저장소에 넣지 않는다 (.gitignore — *.hwpx와 같은 이유다). */
const API_KEY = 'AIzaSyC7dsvcLVjuFUUtnQRtPLurzBN06kZ9MZQ';   // index.html에 이미 공개된 값
const WORKER = 'https://hahyunmath-gemini-proxy.khhyun827.workers.dev';
const GAP_MS = 13000;   // 클라이언트(runTwinBatch)와 같은 간격

const path = process.argv[2];
if (!path) { console.error('쓰는 법: node tools/probe-worker.mjs cases.json'); process.exit(1); }
const cases = JSON.parse(await (await import('node:fs/promises')).readFile(path, 'utf8'));

const auth = await fetch(
  `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`,
  { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ returnSecureToken: true }) });
if (!auth.ok) { console.error('로그인 실패', auth.status, await auth.text()); process.exit(1); }
const { idToken } = await auth.json();

/* 세지 않고 보기만 하는 길. 한도의 진실은 워커 하나뿐이다 (2026-08-10). */
const q = await fetch(WORKER + '/quota', { method: 'POST', headers: { Authorization: 'Bearer ' + idToken } });
console.log('[quota]', await q.text());

for (const c of cases) {
  const res = await fetch(WORKER, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + idToken },
    body: JSON.stringify({ content: c.content, answer: c.answer, imageFileId: c.fileId }),
  });
  const text = await res.text();
  console.log('\n===== ' + c.label + ' (http ' + res.status + ') =====');
  try {
    const d = JSON.parse(text);
    if (d.error) {
      /* finishReason이 있어야 «잘린 것»과 «모델이 JSON을 못 쓴 것»을 가른다 — 고치는 법이 다르다. */
      console.log('!! error:', d.error, '| finishReason:', d.finishReason,
        '| raw tail:', String(d.raw).slice(-160));
      continue;
    }
    console.log('mode       :',
      d.needsFigure ? '(B) figure — 사람이 그린다'
      : d.reuseFigure ? '(C) reuse — 원본 그림 그대로'
      : d.figureFree ? '(A) text — 그림 없이 푼다'
      : '— 원본에 그림이 없거나 옛 응답');
    console.log('quota      :', d.quotaUsed + '/' + d.quotaLimit);
    console.log('answer     :', d.answer);
    console.log('--- problem ---\n' + d.content);
    if (d.figureSpec) console.log('--- figureSpec ---\n' + d.figureSpec);
  } catch (e) { console.log('응답을 읽지 못했다:', text.slice(0, 800)); }
  await new Promise(r => setTimeout(r, GAP_MS));
}
