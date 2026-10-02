// 학생 상세 새단장 · 설정 줄 눌림 · 수업 머리 단추 (2026-10-02 · 사용자 넷)
//
//   node tools/student-detail-test.mjs
//
// 붙드는 것 —
//   ① 이름 찾기로 다른 학생을 연다(뒤로 안 나가고) · 옛 왼쪽 명단은 안 붙는다
//   ② 오른쪽 칸에 학교·모의고사 성적 · 칸이 판 위로 잘리지 않는다(넓은 화면)
//   ③ 「전체」 연대기 — 데일리퀴즈는 그날 한 줄로 묶이고 과제가 보인다 · 겹쳐 듣는 반의 과제도 든다
//   ④ 설정 › 학생 줄은 눌러도 오그라들지 않는다 · ⑤ 수업 머리에 「지난 수업 보기」가 없다

import { chromium } from 'playwright';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { 씨앗, 무대들 } from './shots-scenes.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PORT = 8822;
const 서버 = spawn(process.execPath, [path.join(HERE, 'serve.js'), String(PORT)], { stdio: 'ignore' });
let pass = 0, fail = 0;
const 봄 = (무엇, 나온것, 나와야) => {
  const ok = JSON.stringify(나온것) === JSON.stringify(나와야);
  if(ok){ pass++; console.log('  ✓ ' + 무엇); }
  else { fail++; console.log(`  ✗ ${무엇}\n      나온 것: ${JSON.stringify(나온것)}\n      나와야:  ${JSON.stringify(나와야)}`); }
};

const 브라우저 = await chromium.launch();
try{
  const page = await 브라우저.newPage({ viewport: { width: 1440, height: 900 } });
  for(let i = 0; i < 40; i++){ try{ await page.goto(`http://127.0.0.1:${PORT}/index.html`); break; }catch{ await page.waitForTimeout(250); } }
  await page.waitForFunction(() => typeof render === 'function' && typeof DATA !== 'undefined');
  await page.evaluate(씨앗);
  await page.evaluate(무대들.학생상세성적.세우기);
  await page.evaluate(() => { state.sdFilter = 'all'; render(); });

  봄('① 옛 왼쪽 명단이 없다', await page.$$eval('.sd-list', e => e.length), 0);
  const 다른 = await page.evaluate(() => DATA.students.find(x => x.studentId !== 's0'));
  await page.fill('.sd-find input', 다른.name);
  await page.press('.sd-find input', 'Enter');
  봄('① 이름을 적고 Enter → 그 학생이 열린다', await page.evaluate(() => state.studentDetailId), 다른.studentId);
  await page.evaluate(() => sdOpen('s0'));

  봄('② 오른쪽 칸에 학교·모의고사 성적', await page.$eval('.sd-ctx', e => /학교 시험/.test(e.textContent) && /모의고사/.test(e.textContent) && /84점/.test(e.textContent)), true);
  봄('② 오른쪽 칸이 판 위로 안 잘린다', await page.evaluate(() =>
    document.querySelector('.sd-ctx').getBoundingClientRect().top >= document.querySelector('.app > .body').getBoundingClientRect().top - 1), true);

  /* ③ 퀴즈 열두 장 + 다른 반(특강) 과제 하나를 심는다 */
  const 연대기 = await page.evaluate(() => {
    const r = DATA.records.s0, 오늘 = todayStr();
    r.dailyQuiz = { log: Array.from({ length: 12 }, (_, i) => ({ id: 'x' + i + ':orig', d: 오늘, ok: i % 3 !== 0 })) };
    DATA.students.find(x => x.studentId === 's0').classIds = ['c2'];
    DATA.assignments.push({ id: 'aSP', classId: 'c2', title: '특강 과제', dueDate: 오늘, createdAt: 오늘 });
    render();
    return [...document.querySelectorAll('.sd-tl .sd-ev')].map(e => e.querySelector('.kind').textContent + '|' + e.querySelector('.ti').textContent);
  });
  봄('③ 전체 — 데일리퀴즈는 그날 한 줄', 연대기.filter(x => x.startsWith('퀴즈')), ['퀴즈|데일리퀴즈 12문항']);
  봄('③ 전체 — 과제가 보인다(겹쳐 듣는 반 것까지)', 연대기.filter(x => x.startsWith('과제')).length >= 3 && 연대기.includes('과제|특강 과제'), true);
  await page.evaluate(() => sdFilter('hw'));
  봄('③ 과제·오답 갈래에서는 퀴즈가 낱장 그대로', await page.$$eval('.sd-tl .sd-ev .kind', e => e.filter(x => x.textContent === '퀴즈').length), 12);

  /* ④ 설정 › 학생 줄 */
  await page.evaluate(() => { state.studentDetailId = null; state.teacherTab = 'settings'; state.settingsSubTab = 'students'; render(); });
  const 줄 = page.locator('.st-row').first(); const b = await 줄.boundingBox();
  await page.mouse.move(b.x + 12, b.y + b.height / 2); await page.mouse.down(); await page.waitForTimeout(150);
  봄('④ 설정 › 학생 줄을 눌러도 오그라들지 않는다', await 줄.evaluate(e => getComputedStyle(e).transform), 'none');
  await page.mouse.up();

  /* ⑤ 수업 머리 */
  await page.evaluate(무대들.수업반여럿.세우기);
  봄('⑤ 수업 머리에 「지난 수업 보기」가 없다', await page.evaluate(() => [...document.querySelectorAll('.cls-mh button')].some(b => /지난 수업 보기/.test(b.textContent))), false);
} finally {
  await 브라우저.close(); 서버.kill();
}
console.log(`\n${pass} 통과 · ${fail} 실패`);
process.exit(fail ? 1 : 0);
