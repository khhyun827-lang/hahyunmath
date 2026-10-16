// 매쓰드로로 편집 — 검토 탭 ↔ 매쓰드로 앱(localhost:47615) 왕복 (2026-10-16)
//
//   node tools/mdraw-bridge-test.mjs
//
// 사용자 — 「검토탭에서 그림 편집할때 매쓰드로로 바로 웹페이지에서 연결해서 편집하도록」
// 실제 크롬으로 연다. 매쓰드로 앱은 page.route 로 흉내 낸다 · DB 는 안 건드린다(dbGet·dbSet·dbSetDoc 가로챔).
// 🔴 붙드는 것: 돌아온 것에서 PNG 데이터 URI 만 쓰고 꼴이 어긋나면 저장하지 않는다(주입 구멍) ·
//    원본(.mdraw)은 kv 로 따로 가고 다시 열 때 실려 간다 · 한글 복사가 새 그림의 비율을 받는다.

import { chromium } from 'playwright';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PORT = 8798;
const 서버 = spawn(process.execPath, [path.join(HERE, 'serve.js'), String(PORT)], { stdio: 'ignore' });
let pass = 0, fail = 0;
const 봄 = (무엇, 나온것, 나와야) => {
  const ok = JSON.stringify(나온것) === JSON.stringify(나와야);
  if(ok){ pass++; console.log('  ✓ ' + 무엇); }
  else { fail++; console.log(`  ✗ ${무엇}\n      나온 것: ${JSON.stringify(나온것)}\n      나와야:  ${JSON.stringify(나와야)}`); }
};

// 1×1 흰 PNG
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=';
const 브라우저 = await chromium.launch();
try{
  const page = await 브라우저.newPage();
  /* 가짜 매쓰드로 — 켜짐/꺼짐 · /result 는 한 번 wait 뒤 정해 둔 답 */
  const 앱 = { on: true, edits: [], answer: null, polls: 0 };
  await page.route('http://localhost:47615/**', async route => {
    const u = new URL(route.request().url());
    if(!앱.on) return route.abort('connectionrefused');
    let body = { app: 'mathdraw', v: 1 };
    if(u.pathname === '/edit'){ 앱.edits.push(JSON.parse(route.request().postData())); 앱.polls = 0; body = { ok: true }; }
    if(u.pathname === '/result') body = ++앱.polls < 2 ? { state: 'wait' } : 앱.answer;
    route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(body) });
  });
  for(let i = 0; i < 40; i++){ try{ await page.goto(`http://127.0.0.1:${PORT}/index.html`); break; }catch{ await page.waitForTimeout(250); } }
  await page.waitForFunction(() => typeof render === 'function' && typeof openInMathDraw === 'function');
  await page.evaluate(() => {
    const root = 'K2-06-E-0618', code = root + '-N01';
    state.variants = Object.assign({}, state.variants, { [root]: [{ code, originCode: root, content: '변형', pending: true, needsFigure: true,
      image: { kind: 'svg', svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 430"><path d="M0 0L9 9"/></svg>', scene: null } }] });
    window.__log = { set: [], doc: [], get: [], toast: [] };
    window.dbSet = (k, v) => { __log.set.push([k, v]); return Promise.resolve(true); };
    window.dbGet = (k, f) => { __log.get.push(k); return Promise.resolve(k === 'mdraw:' + code ? '{"app":"mathdraw","v":2}' : f); };
    window.dbSetDoc = (c, id, d) => { __log.doc.push([c, id, d]); return Promise.resolve(true); };
    window.showToast = m => { __log.toast.push(m); };
    window.render = () => {};
  });
  const code = 'K2-06-E-0618-N01';
  const 기다림 = () => page.waitForFunction(() => !state.mdrawWaiting, null, { timeout: 8000 });

  console.log('\n처음 — AI 장면 그림을 보낸다');
  앱.answer = { id: code, state: 'done', png: PNG, wmm: 100, hmm: 77, mdraw: '{"app":"mathdraw","v":2,"layers":[]}' };
  await page.evaluate(c => { openInMathDraw(c); }, code);
  await page.waitForFunction(() => state.mdrawWaiting);
  봄('기다리는 동안 «그만 기다리기»가 보인다', await page.evaluate(c => /그만 기다리기/.test(mathDrawBtnHTML(variantByCode(c), 'x')), code), true);
  await 기다림();
  봄('/edit 에 코드·SVG 가 가고 원본(mdraw)은 없다', [앱.edits[0].id, /<svg/.test(앱.edits[0].svg), 앱.edits[0].mdraw], [code, true, null]);
  const 첫 = await page.evaluate(() => { const d = __log.doc[0]; return { col: d && d[0], id: d && d[1], img: d && d[2].image, set: __log.set.map(x => x[0]), get: __log.get }; });
  봄('변형 문서에 저장 · 원본은 kv mdraw:코드 로', [첫.col, 첫.id, 첫.set], ['variants', code, ['mdraw:' + code]]);
  봄('처음엔 원본을 안 읽는다(없으니)', 첫.get, []);
  봄('그림 = 여기서 지은 SVG · PNG 하나 · 제 크기 378×291', [첫.img.kind, 첫.img.mdraw, 첫.img.scene, /^<svg [^>]*width="378" height="291"/.test(첫.img.svg),
    (첫.img.svg.match(/<image /g) || []).length, 첫.img.svg.includes(PNG)], ['svg', true, undefined, true, 1, true]);

  console.log('\n그 그림을 화면·한글이 받는다');
  const 받음 = await page.evaluate(img => {
    const h = variantImageHTML(img, 'x');
    return hwpClipSvgToPng(img.svg).then(p => ({ img: /<image /.test(h), w: p.w, h: p.h }));
  }, 첫.img);
  봄('variantImageHTML 이 그리고, 한글 복사는 378×291 비율로', 받음, { img: true, w: 378, h: 291 });
  봄('«그림 편집»은 장면이 없으니 매쓰드로로 간다', await page.evaluate(c => {
    const v = variantByCode(c); let sent = 0; const o = window.openInMathDraw; window.openInMathDraw = () => { sent++; };
    openFigureEditorFromSaved(c); window.openInMathDraw = o; return [sent, state.figureDraft];
  }, code), [1, null]);

  console.log('\n두 번째 — 원본으로 다시 연다');
  await page.evaluate(c => { openInMathDraw(c); }, code);
  await page.waitForFunction(() => state.mdrawWaiting); await 기다림();
  봄('kv 원본을 읽어 mdraw 로 보낸다', [await page.evaluate(() => __log.get), 앱.edits[1].mdraw], [['mdraw:' + code], '{"app":"mathdraw","v":2}']);

  console.log('\n🔴 꼴이 어긋난 답은 저장하지 않는다');
  for(const [이름, 답] of [
    ['PNG 자리에 따옴표·스크립트', { png: PNG + '"/><script>alert(1)</script>', wmm: 100, hmm: 77 }],
    ['PNG 가 아닌 SVG 데이터', { png: 'data:image/svg+xml;base64,PHN2Zz4=', wmm: 100, hmm: 77 }],
    ['크기가 숫자가 아님', { png: PNG, wmm: '100" onload="x', hmm: 77 }],
    ['너무 큰 PNG', { png: 'data:image/png;base64,' + 'A'.repeat(700001), wmm: 100, hmm: 77 }],
  ]){
    const n = await page.evaluate(() => __log.doc.length);
    앱.answer = Object.assign({ id: code, state: 'done', svg: '<svg onload="x">' }, 답);
    await page.evaluate(c => { openInMathDraw(c); }, code);
    await page.waitForFunction(() => state.mdrawWaiting); await 기다림();
    봄(이름 + ' — 저장 안 함', [await page.evaluate(() => __log.doc.length) - n, await page.evaluate(() => /꼴이 맞지 않아/.test(__log.toast.slice(-1)[0]))], [0, true]);
  }

  console.log('\n취소 · 꺼짐');
  앱.answer = { id: code, state: 'cancel' };
  const n = await page.evaluate(() => __log.doc.length);
  await page.evaluate(c => { openInMathDraw(c); }, code);
  await page.waitForFunction(() => state.mdrawWaiting); await 기다림();
  봄('매쓰드로에서 취소 — 저장 안 함', [await page.evaluate(() => __log.doc.length) - n, await page.evaluate(() => __log.toast.slice(-1)[0])], [0, '매쓰드로에서 취소했습니다.']);
  앱.on = false; const e = 앱.edits.length;
  await page.evaluate(c => openInMathDraw(c), code);
  봄('앱이 꺼져 있으면 알려 주고 보내지 않는다', [앱.edits.length - e, await page.evaluate(() => /켜져 있지 않습니다/.test(__log.toast.slice(-1)[0]))], [0, true]);
} finally {
  await 브라우저.close();
  서버.kill();
}
console.log(`\n  ${fail ? '🔴' : '✅'} ${pass} 통과 · ${fail} 실패\n`);
process.exit(fail ? 1 : 0);
