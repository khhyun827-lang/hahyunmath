/* 명단 머리줄이 스크롤에 붙을 때 «흰 바탕»으로 아래 행을 가리는가 (2026-10-12 · 사용자 신고 —
 *   「학생 명단에서 스크롤 내리면 위에 학생, 학년 … 글자만 쫓아와서 다른 글자들이랑 겹쳐」).
 *
 *   node tools/roster-head-test.mjs      → tools/shots-out/roster-head-864.png · 머리 칸 바탕색을 적는다
 *
 * 🔴 실 DB 0줄 — shots.mjs 와 같은 씨앗을 심는다.
 */
import { chromium } from 'playwright';
import { 씨앗 } from './shots-scenes.mjs';
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PORT = 8778;
const 살아있나 = () => new Promise(r => {
  const req = http.get('http://127.0.0.1:' + PORT + '/index.html', res => { res.resume(); r(res.statusCode === 200); });
  req.on('error', () => r(false)); req.setTimeout(700, () => { req.destroy(); r(false); });
});
const 서버 = spawn(process.execPath, [path.join(HERE, 'serve.js'), String(PORT)], { stdio: 'ignore' });
for(let i = 0; i < 40 && !(await 살아있나()); i++) await new Promise(r => setTimeout(r, 250));

const 브라우저 = await chromium.launch();
let 나쁨 = 0;
try{
  const page = await 브라우저.newPage({ viewport: { width: 864, height: 700 }, deviceScaleFactor: 2 });
  await page.goto('http://127.0.0.1:' + PORT + '/index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof render === 'function' && typeof DATA !== 'undefined', null, { timeout: 30000 });
  await page.evaluate(씨앗);
  await page.evaluate(() => {
    /* 스크롤이 생기게 학생을 불린다 */
    const 원 = DATA.students.slice();
    for(let k = 0; k < 3; k++) 원.forEach((s, i) => DATA.students.push(Object.assign({}, s, { studentId: s.studentId + '_' + k, name: s.name + k })));
    state.currentUser = { type:'teacher', name:'김하현T' }; state.view = 'teacher'; state.teacherTab = 'roster'; render();
  });
  await page.waitForTimeout(500);
  const 결과 = await page.evaluate(() => {
    const w = document.querySelector('.rst-wrap'); if(!w) return { 없음: true };
    w.scrollTop = 260;
    const th = w.querySelector('table.grid thead th');
    return { 굴렀나: w.scrollTop, 바탕: getComputedStyle(th).backgroundColor, 위치: getComputedStyle(th).position };
  });
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(HERE, 'shots-out', 'roster-head-864.png') });
  console.log(JSON.stringify(결과));
  if(결과.없음 || !결과.굴렀나 || /rgba\(0, 0, 0, 0\)|transparent/.test(결과.바탕)) 나쁨 = 1;
}finally{ await 브라우저.close(); 서버.kill(); }
console.log(나쁨 ? '🔴 머리줄 바탕이 투명하다 (또는 굴러가지 않았다)' : '✓ 머리줄이 흰 바탕으로 붙는다');
process.exit(나쁨);
