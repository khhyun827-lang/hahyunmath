// 브랜드 인트로 (2026-09-29) — 언제 돌고·언제 안 돌고·끝에서 마크가 히어로 로고에 «딱» 앉는가
//
//   node tools/intro-test.mjs
//
// 🔴 **왜 재는가** — 날아간 마크와 히어로 로고의 마크가 어긋나면 끝에서 «두 개»로 보인다.
//   만들면서 세 번 어긋났다: ① 한 번만 잰 과녁 ② 다 겹치기 전에 진짜 로고를 흐려 보인 것
//   ③ 앱이 서느라 전환이 늦게 시작했는데 시계로 끝을 잰 것. 눈으로는 셋 다 «살짝 번진다»로만 보였다.
// ⚠ 자동화 브라우저는 인트로를 건너뛴다(다른 검사가 덮개에 가리지 않게) — 여기서는 그 표시를 지운다.
// ⚠ Firebase 로그인·DB 로 가는 길은 막는다 — 막지 않으면 돌릴 때마다 익명 계정이 프로젝트에 쌓인다.
//   그 대신 랜딩을 손으로 그린다(`state.view='home'; render()`). 인트로는 «랜딩이 서기를» 기다리므로 그대로 잰다.

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PORT = 8786, URL = 'http://127.0.0.1:' + PORT + '/index.html';
const NL = String.fromCharCode(10);
let pass = 0, fail = 0;
const 봄 = (무엇, 나온것, 나와야) => {
  const ok = JSON.stringify(나온것) === JSON.stringify(나와야);
  if (ok) pass++; else fail++;
  console.log((ok ? '  ✓ ' : '  🔴 ') + 무엇 + (ok ? '' : NL + '      나온 것 ' + JSON.stringify(나온것) + NL + '      나와야 ' + JSON.stringify(나와야)));
};
const 살아있나 = () => new Promise(r => { const q = http.get(URL, s => { s.resume(); r(s.statusCode === 200); }); q.on('error', () => r(false)); q.setTimeout(700, () => { q.destroy(); r(false); }); });
const 서버 = spawn(process.execPath, [path.join(HERE, 'serve.js'), String(PORT)], { stdio: 'ignore' });
for (let i = 0; i < 40 && !(await 살아있나()); i++) await new Promise(r => setTimeout(r, 250));

/* 사람 브라우저처럼 — webdriver 표시를 지운다. 날아가는 동안 두 마크의 차이를 프레임마다 적는다. */
const 사람 = () => {
  Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => false });
  window.__gap = null; window.__saw = false;
  const loop = () => {
    const i = document.getElementById('intro'), img = document.querySelector('.lp .l-hero .l-logo');
    if (i) window.__saw = true;
    if (i && img && /it-go/.test(i.className)) {
      const s = i.querySelector('.it-logo').getBoundingClientRect(), r = img.getBoundingClientRect();
      window.__gap = [s.left + s.width * 104 / 708 - (r.left + r.width / 966), s.top - (r.top + r.height / 223), s.width * 499 / 708 - r.width * 522 / 966]
        .map(v => Math.round(Math.abs(v) * 10) / 10);
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
};

const 막기 = ctx => ctx.route(/identitytoolkit|securetoken|firestore\.googleapis/, r => r.abort());
async function 열기(page, url) {
  await page.goto(url);
  await page.waitForFunction(() => typeof render === 'function' && typeof state !== 'undefined', null, { timeout: 15000 });
  await page.evaluate(() => { state.view = 'home'; render(); });
}
const br = await chromium.launch();
try {
  for (const W of [390, 1280]) {
    console.log(NL + '① ' + W + 'px — 처음 들어옴 · 날아가 앉기' + NL);
    const ctx = await br.newContext({ viewport: { width: W, height: 820 }, isMobile: W < 560, hasTouch: W < 560 });
    await ctx.addInitScript(사람); await 막기(ctx);
    const page = await ctx.newPage();
    const 탈 = []; page.on('pageerror', e => 탈.push(e.message));
    await 열기(page, URL);
    봄('인트로가 선다', await page.evaluate(() => window.__saw || !!document.getElementById('intro')), true);
    await page.waitForFunction(() => !document.getElementById('intro'), null, { timeout: 9000 });
    const g = await page.evaluate(() => window.__gap);
    봄('마지막 프레임에서 두 마크가 1px 안에 겹친다 (x·y·폭)', g && g.every(v => v <= 1), true);
    if (g && !g.every(v => v <= 1)) console.log('      차이', JSON.stringify(g));
    봄('걷힌 뒤 <html> 에 인트로 반이 안 남는다', await page.evaluate(() => /it-(hold|fly)/.test(document.documentElement.className)), false);
    await page.waitForTimeout(1500);
    봄('히어로가 전부 드러난다', await page.evaluate(() => [...document.querySelectorAll('.lp .l-hero .l-rise')].every(e => getComputedStyle(e).opacity === '1')), true);
    봄('히어로 로고에 잘림·인라인 흔적이 없다', await page.evaluate(() => { const e = document.querySelector('.lp .l-hero .l-logo'); return getComputedStyle(e).clipPath + '|' + (e.getAttribute('style') || ''); }), 'none|');

    console.log(NL + '② ' + W + 'px — 새로고침은 다시 안 돈다' + NL);
    await page.reload();
    await page.waitForTimeout(600);
    봄('같은 탭 새로고침 — 인트로 없음', await page.evaluate(() => window.__saw), false);
    봄('오류 없음', 탈, []);
    await ctx.close();
  }

  console.log(NL + '③ 건너뛰는 경우' + NL);
  {
    const ctx = await br.newContext();
    await ctx.addInitScript(사람); await 막기(ctx);
    await ctx.addInitScript(() => localStorage.setItem('khm-session', '{"type":"student"}'));
    const page = await ctx.newPage();
    await page.goto(URL); await page.waitForTimeout(500);
    봄('로그인해 둔 사람 — 인트로 없음(바로 제 화면으로 간다)', await page.evaluate(() => window.__saw), false);
    await ctx.close();
  }
  {
    const ctx = await br.newContext(); await 막기(ctx);
    const page = await ctx.newPage();
    await page.goto(URL); await page.waitForTimeout(500);
    봄('자동화 브라우저 — 인트로 없음(다른 검사를 가리지 않는다)', await page.evaluate(() => !!document.getElementById('intro')), false);
    await ctx.close();
  }
  {
    const ctx = await br.newContext();
    await ctx.addInitScript(사람); await 막기(ctx);
    const page = await ctx.newPage();
    await page.goto(URL + '#sec-contact'); await page.waitForTimeout(500);
    봄('# 이 붙은 링크 — 인트로 없음', await page.evaluate(() => window.__saw), false);
    await ctx.close();
  }

  console.log(NL + '④ 움직임을 줄여 달라는 기기 · 누르면 바로 걷힘' + NL);
  {
    const ctx = await br.newContext({ reducedMotion: 'reduce' });
    await ctx.addInitScript(사람); await 막기(ctx);
    const page = await ctx.newPage();
    await page.goto(URL);
    봄('선이 이미 다 그려져 있다(그리기 없음)', await page.evaluate(() => getComputedStyle(document.querySelector('#intro .it-d1')).strokeDashoffset), '0px');
    await page.waitForFunction(() => typeof render === 'function' && typeof state !== 'undefined', null, { timeout: 15000 });
    await page.evaluate(() => { state.view = 'home'; render(); });
    await page.waitForFunction(() => !document.getElementById('intro'), null, { timeout: 9000 });
    봄('날지 않고 걷히기만 한다', await page.evaluate(() => window.__gap), null);
    await ctx.close();
  }
  {
    const ctx = await br.newContext();
    await ctx.addInitScript(사람); await 막기(ctx);
    const page = await ctx.newPage();
    await page.goto(URL);
    await page.waitForSelector('#intro');
    const t = Date.now();
    await page.mouse.click(200, 200);
    await page.waitForFunction(() => !document.getElementById('intro'), null, { timeout: 3000 });
    봄('누르면 0.6초 안에 걷힌다', Date.now() - t < 600, true);
    await ctx.close();
  }
} finally { await br.close(); 서버.kill(); }

console.log(NL + (fail ? '🔴 ' + pass + ' 통과 · ' + fail + ' 실패' : '✓ ' + pass + ' 통과 · 0 실패'));
process.exitCode = fail ? 1 : 0;
