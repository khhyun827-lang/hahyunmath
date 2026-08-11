/* 배포된 워커의 `/figure`를 화면 없이 두드린다 — 받은 «장면»을 그 자리에서 검산하고 그린다.
   (2026-08-12에 그림 초안 2단계를 붙이면서 만들었다. probe-worker.mjs의 그림 판이다.)

   왜 필요한가 — 로컬 브라우저는 ALLOW_ORIGIN에 막혀 워커를 못 부른다 (9절 1번).
   CORS는 «브라우저» 제약이라 Node에서는 안 걸린다. 인증은 클라이언트와 같은 길이다.
   그리고 클라이언트를 배포하기 «전»에 **모델이 쓸 만한 장면을 내는지**부터 볼 수 있다 —
   그게 이 설계의 전부라 먼저 알아야 한다.

   ⚠ **한 건마다 하루 20건 한도를 하나 쓴다.**

   쓰는 법 —
     node tools/probe-figure.mjs figure-cases.json
   figure-cases.json은 배열이고 항목마다 { label, spec, content, fileId }다.
   브라우저 콘솔에서 이렇게 뽑는다 —
     const b = DATA.problemBank.find(x=>x.id==='pb…');
     const img = await dbGet('pbimg:'+b.id, null);
     JSON.stringify([{label:'1번', spec:b.variantFigureSpec, content:b.variantContent,
                      fileId: img && img.fileId}])

   ⚠ figure-cases.json은 시험지 본문이라 저장소에 넣지 않는다 (.gitignore). */
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const API_KEY = 'AIzaSyC7dsvcLVjuFUUtnQRtPLurzBN06kZ9MZQ';   // index.html에 이미 공개된 값
const WORKER = 'https://hahyunmath-gemini-proxy.khhyun827.workers.dev';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
await import(pathToFileURL(join(ROOT, 'figure.js')).href);
const { verifyScene, renderScene, autoWindow } = globalThis.Figure;

const path = process.argv[2];
if (!path) { console.error('쓰는 법: node tools/probe-figure.mjs figure-cases.json'); process.exit(1); }
const cases = JSON.parse(fs.readFileSync(path, 'utf8'));

const auth = await fetch(
  `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`,
  { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ returnSecureToken: true }) });
if (!auth.ok) { console.error('로그인 실패', auth.status, await auth.text()); process.exit(1); }
const { idToken } = await auth.json();

const q = await fetch(WORKER + '/quota', { method: 'POST', headers: { Authorization: 'Bearer ' + idToken } });
console.log('[quota]', await q.text());

const cards = [];
for (const c of cases) {
  const res = await fetch(WORKER + '/figure', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + idToken },
    body: JSON.stringify({ spec: c.spec, content: c.content, imageFileId: c.fileId }),
  });
  const text = await res.text();
  console.log('\n===== ' + c.label + ' (http ' + res.status + ') =====');
  let data;
  try { data = JSON.parse(text); }
  catch (e) { console.log('!! 응답을 못 읽었다:', text.slice(0, 300)); continue; }

  if (data.error) { console.log('!! error:', data.error, '| finishReason:', data.finishReason,
    '| raw tail:', String(data.raw).slice(-200)); continue; }
  if (typeof data.quotaUsed === 'number') console.log('quota      :', data.quotaUsed + '/' + data.quotaLimit);

  /* «못 그린다»는 실패가 아니다. 지도·입체도형이 여기로 와야 정상이다. */
  if (data.unsupported) {
    console.log('mode       : unsupported — 사람이 그린다');
    console.log('reason     :', data.reason);
    cards.push({ title: c.label, unsupported: true, reason: data.reason });
    continue;
  }

  const scene = data.scene;
  console.log('curves     :', (scene.curves || []).map(x => x.expr).join('   |   '));
  console.log('xTicks     :', JSON.stringify(scene.xTicks));
  console.log('checks     :', (scene.checks || []).length + '건');

  const v = verifyScene(scene);
  const w = autoWindow(scene);
  console.log((v.ok ? 'VERIFY ok  ' : 'VERIFY FAIL') + ' 검사 ' + v.ran + '건   창 x[' +
    f(w.xRange[0]) + ', ' + f(w.xRange[1]) + '] y[' + f(w.yRange[0]) + ', ' + f(w.yRange[1]) + ']');
  v.failures.forEach(x => console.log('      · ' + x.msg));

  let svg = '';
  try { svg = renderScene(scene); } catch (e) { console.log('!! 그리다 터졌다: ' + e.message); }
  cards.push({ title: c.label, ok: v.ok, failures: v.failures, svg, window: w, scene });
}

/* 눈으로 볼 것이 있으므로 대조표를 낸다 — figure-preview와 같은 자리에 쓴다. */
const html = `<!doctype html><meta charset="utf-8"><title>/figure 실측</title>
<style>
  body{margin:0;padding:28px;background:#faf9f7;color:#1a1a1a;
       font:14px/1.7 -apple-system,'Segoe UI','Malgun Gothic',sans-serif}
  h1{font-size:19px;margin:0 0 18px}
  .card{background:#fff;border:1px solid #e6e2d9;border-radius:10px;padding:16px 18px;margin-bottom:18px}
  .hd{display:flex;align-items:center;gap:10px;margin-bottom:10px}
  .t{font-weight:600}.b{font-size:11.5px;padding:2px 8px;border-radius:999px;font-weight:600}
  .ok{background:#e8f3ea;color:#2c6b3f}.no{background:#fbe9e9;color:#9d2f2f}
  .un{background:#f0eee9;color:#6b6558}
  ul{margin:8px 0 0;padding-left:18px;color:#9d2f2f;font-size:12.5px}
  pre{background:#f6f4f0;padding:9px 11px;border-radius:6px;font-size:11.5px;overflow-x:auto}
  svg{max-width:100%;height:auto;display:block}
</style>
<h1>워커 /figure 실측 — ${new Date().toLocaleString('ko-KR')}</h1>
${cards.map(c => `<div class="card">
  <div class="hd"><span class="t">${esc(c.title)}</span>
    ${c.unsupported ? '<span class="b un">못 그림 — 사람에게</span>'
      : `<span class="b ${c.ok ? 'ok' : 'no'}">${c.ok ? '검산 통과' : '검산 실패'}</span>`}</div>
  ${c.unsupported ? `<div>${esc(c.reason || '')}</div>` : `
    ${c.failures.length ? '<ul>' + c.failures.map(x => '<li>' + esc(x.msg) + '</li>').join('') + '</ul>' : ''}
    ${c.svg || ''}
    <pre>${esc(JSON.stringify(c.scene, null, 1))}</pre>`}
</div>`).join('\n')}
`;
const out = join(HERE, 'figure-probe.html');
fs.writeFileSync(out, html, 'utf8');
console.log('\n대조표 → ' + out);

function f(v) { return String(Math.round(v * 100) / 100); }
function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
