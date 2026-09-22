/* 화면을 «폭마다» 찍는다 — Playwright (2026-09-23).
 *
 * 🔴 **왜 있는가** — 이 저장소의 신고는 대부분 「어색하다 · 보기 불편하다」다. 그것은 코드로 못 찾는다.
 *   그동안은 폭을 못 박은 iframe 하네스를 «매번 새로» 지어 크롬으로 열어 봤다(프로브 23개).
 *   그 일을 한 줄로 내린다. 사람이 없어도 돌고, 결과가 파일로 남는다.
 *
 * 쓰는 법 —
 *
 *   node tools/shots.mjs                     무대 목록을 보여 준다
 *   node tools/shots.mjs 영상탭
 *   node tools/shots.mjs 영상탭 --w 864,390
 *   node tools/shots.mjs 질의응답 --webkit    사파리 계열로 (오래된 아이폰에 더 가깝다)
 *   node tools/shots.mjs 영상탭 --full        화면 끝까지 (기본은 보이는 만큼)
 *
 * 그림은 `tools/shots-out/<무대>-<폭>.png` 로 떨어진다(저장소에 안 올린다).
 *
 * 🔴 **실 DB 0줄 · 읽기 0건** — 저장·읽기를 페이지 안에서 갈아 끼운 뒤에 씨앗을 심는다.
 *   2026-09-04에 「비었다」와 「못 읽었다」를 못 갈라 기록을 실제로 잃은 적이 있다.
 *   도구가 진짜 Firestore 를 건드리면 그 사고를 다시 만드는 길이 된다.
 * ⚠ **폭은 «본문 폭»이 아니라 창 폭이다.** 사용자의 주력 판은 브라우저 125% 확대라 CSS 864 다.
 *   반 관리 화면은 왼쪽 반 목록(225px)을 끼고 있어 864 에서 본문이 570px 밖에 안 된다 — 거기가 진짜 판이다.
 */
import { chromium, webkit } from 'playwright';
import { 무대들, 씨앗 } from './shots-scenes.mjs';
import http from 'node:http';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PORT = 8777;
const 인자 = process.argv.slice(2);
const 값 = (이름, 기본) => { const i = 인자.indexOf('--' + 이름); return i >= 0 ? 인자[i + 1] : 기본; };
const 켜짐 = (이름) => 인자.includes('--' + 이름);
const 무대이름 = 인자.find(a => !a.startsWith('--') && 인자[인자.indexOf(a) - 1] !== '--w' && 인자[인자.indexOf(a) - 1] !== '--out');

if(!무대이름){
  console.log('\n무대 —\n' + Object.entries(무대들).map(([k, v]) => '  ' + k.padEnd(12) + v.말).join('\n'));
  console.log('\n  node tools/shots.mjs <무대> [--w 864,390] [--webkit] [--full]\n');
  process.exit(0);
}
const 무대 = 무대들[무대이름];
if(!무대){ console.error('그런 무대가 없다: ' + 무대이름); process.exit(1); }

const 폭들 = String(값('w', 무대.폭 || '1280,864,390')).split(',').map(Number);
const 나갈곳 = 값('out', path.join(HERE, 'shots-out'));
fs.mkdirSync(나갈곳, { recursive: true });

/* 서버가 이미 떠 있으면 그대로 쓰고, 아니면 우리가 띄웠다가 거둔다 */
const 살아있나 = () => new Promise(r => {
  const req = http.get('http://127.0.0.1:' + PORT + '/index.html', res => { res.resume(); r(res.statusCode === 200); });
  req.on('error', () => r(false)); req.setTimeout(700, () => { req.destroy(); r(false); });
});

let 서버 = null;
if(!(await 살아있나())){
  서버 = spawn(process.execPath, [path.join(HERE, 'serve.js'), String(PORT)], { stdio: 'ignore' });
  for(let i = 0; i < 40 && !(await 살아있나()); i++) await new Promise(r => setTimeout(r, 250));
  if(!(await 살아있나())){ console.error('서버가 안 뜬다'); process.exit(1); }
}

const 브라우저 = await (켜짐('webkit') ? webkit : chromium).launch();
const 찍은것 = [];
try{
  for(const 폭 of 폭들){
    const ctx = await 브라우저.newContext({
      viewport: { width: 폭, height: Number(값('h', 900)) },
      /* 좁은 판은 «폰»으로 잡는다 — 손가락 이벤트가 붙어야 진짜 그 화면이다 */
      isMobile: 폭 <= 560, hasTouch: 폭 <= 560, deviceScaleFactor: 2,
      locale: 'ko-KR', timezoneId: 'Asia/Seoul',
    });
    const page = await ctx.newPage();
    const 탈난것 = [];
    page.on('pageerror', e => 탈난것.push(String(e.message)));
    await page.goto('http://127.0.0.1:' + PORT + '/index.html', { waitUntil: 'domcontentloaded' });
    /* 앱이 설 때까지 — 시간이 아니라 «조건»으로 기다린다 */
    await page.waitForFunction(() => typeof render === 'function' && typeof DATA !== 'undefined', null, { timeout: 30000 });
    await page.evaluate(씨앗);            /* 실 DB 를 끊고 흉내 자료를 심는다 */
    await page.evaluate(무대.세우기);     /* 이 무대가 볼 화면으로 */
    await page.waitForTimeout(무대.뜸 || 400);
    const 파일 = path.join(나갈곳, 무대이름 + '-' + 폭 + (켜짐('webkit') ? '-webkit' : '') + '.png');
    await page.screenshot({ path: 파일, fullPage: 켜짐('full') });
    /* 가로 넘침은 눈보다 자가 낫다 — 폰에서 옆으로 밀리면 못 쓰는 화면이다 */
    const 넘침 = await page.evaluate(() => ({
      가로넘침: document.documentElement.scrollWidth > window.innerWidth + 1,
      넘친것: [...document.querySelectorAll('.app *')]
        .filter(e => e.getBoundingClientRect().right > window.innerWidth + 1)
        .slice(0, 5).map(e => e.className && String(e.className).slice(0, 40)).filter(Boolean),
    }));
    찍은것.push({ 폭, 파일, ...넘침, 탈난것 });
    await ctx.close();
  }
}finally{
  await 브라우저.close();
  if(서버) 서버.kill();
}

console.log('');
for(const r of 찍은것){
  const 탈 = r.탈난것.length ? '  🔴 오류 ' + r.탈난것.length + '개: ' + r.탈난것[0].slice(0, 70) : '';
  const 넘 = r.가로넘침 ? '  🔴 가로 넘침 ' + JSON.stringify(r.넘친것) : '';
  console.log('  ' + String(r.폭).padStart(4) + 'px  ' + path.relative(process.cwd(), r.파일) + 탈 + 넘);
}
console.log('');
if(찍은것.some(r => r.탈난것.length || r.가로넘침)) process.exitCode = 1;
