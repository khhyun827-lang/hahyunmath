// 시험 일정 — 펼치지 않고 칸을 누르면 그 칸만 고친다 (2026-10-02)
//
//   node tools/exam-pop-test.mjs
//
// 사용자 — 「시험기간·수학을 누르면 달력, 범위를 누르면 색칠된 단원, 교재·메모를 누르면 입력창, 프린트를 누르면 업로드」.
// 실제 크롬으로 칸을 누르고 고친다. 저장 함수(saveExamDates·saveSchoolBook·saveSchoolRange)는 흉내 — 실 DB 안 건드린다.

import { chromium } from 'playwright';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { 씨앗, 무대들 } from './shots-scenes.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PORT = 8794;
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
  await page.evaluate(무대들.시험일정.세우기);
  await page.evaluate(() => {
    window.저장 = [];
    window.saveExamDates = async (...a) => { 저장.push(['날짜', ...a]); };
    window.saveSchoolBook = async (...a) => { 저장.push(['교재', ...a]); };
    window.saveSchoolRange = async (...a) => { 저장.push(['범위', a[0], a[1], a[2], a[3] && a[3].length]); };
  });
  const 줄 = n => `.rst-wrap tbody tr:nth-child(${n})`;   // 1 = 대원 1 (프린트 있음) · 4 = 경기여 1 (날짜·프린트 없음)
  const 칸 = (n, aria) => page.locator(`${줄(n)} td.xr-ed[aria-label$="${aria}"]`);
  const 창 = () => page.$$eval('.xp .xp-h b', e => e.map(x => x.textContent));

  봄('펼치기 줄이 없다', await page.$$eval('.rst-wrap td[colspan]', e => e.length), 0);
  봄('누를 수 있는 칸 — 줄마다 다섯', await page.locator(`${줄(1)} td.xr-ed`).count(), 5);

  /* 범위 — 색칠된 단원이 뜨고, 누르면 넣고 뺀다 */
  await 칸(1, '범위 고르기').click();
  봄('범위 창', await 창(), ['시험 범위']);
  봄('켜진 단원이 색칠돼 있다', await page.locator('.xp .pill.on').count() > 0, true);
  await page.locator('.xp .pill').last().click();
  봄('단원을 누르면 범위 저장', (await page.evaluate(() => 저장.at(-1)))[0], '범위');
  봄('저장해도 창이 남는다(더 고를 수 있게)', await 창(), ['시험 범위']);
  await page.click('.xp-back', { position: { x: 5, y: 5 } });
  봄('바깥을 누르면 닫힌다', await 창(), []);

  /* 교재·메모 — 입력창, Enter 로 저장하고 닫힌다 */
  await 칸(4, '교재 메모 적기').click();
  봄('교재 창 · 입력칸에 커서', await page.evaluate(() => [document.querySelector('.xp .xp-h b').textContent, document.activeElement.type]), ['교재 · 메모', 'text']);
  await page.keyboard.type('쎈 B단계'); await page.keyboard.press('Enter');
  await page.waitForFunction(() => 저장.some(x => x[0] === '교재'));
  봄('Enter → 저장', (await page.evaluate(() => 저장.find(x => x[0] === '교재'))).slice(1), ['경기여자고등학교', '1', '쎈 B단계']);
  봄('저장하면 닫힌다', await 창(), []);

  /* 시험 기간 — 날짜 두 칸, 고르면 저장 */
  await 칸(4, '시험 기간 고르기').click();
  봄('기간 창 — 날짜 칸 둘', await page.$$eval('.xp input[type=date]', e => e.length), 2);
  await page.fill('.xp input[type=date] >> nth=0', '2026-10-20');
  await page.waitForFunction(() => 저장.some(x => x[0] === '날짜'));
  봄('시작일 저장', (await page.evaluate(() => 저장.find(x => x[0] === '날짜'))).slice(1, 4), ['경기여자고등학교', '1', '2026-10-20']);
  await page.keyboard.press('Escape');
  봄('Esc 로 닫힌다', await 창(), []);

  /* 수학 — 하나 고르면 닫힌다 */
  await 칸(4, '수학 시험일 고르기').click();
  봄('수학 창', await 창(), ['수학 시험일']);
  await page.fill('.xp input[type=date]', '2026-10-22');
  await page.waitForFunction(() => 저장.filter(x => x[0] === '날짜').length >= 2);
  봄('수학은 고르면 닫힌다', await 창(), []);

  /* 프린트 — 없으면 누르자마자 파일 고르기 창 · 있으면 목록 + 올리기 */
  const [고르기] = await Promise.all([page.waitForEvent('filechooser', { timeout: 3000 }).catch(() => null), 칸(4, '프린트 올리기').click()]);
  봄('프린트 없는 칸 → 바로 파일 고르기', !!고르기, true);
  await page.keyboard.press('Escape');
  await page.evaluate(() => closeExamPop());
  await 칸(1, '프린트 올리기').click({ position: { x: 134, y: 10 } });   // 파일 이름 고리 옆 빈 자리(칸 폭 140)
  봄('프린트 있는 칸 → 목록과 올리기 단추', await page.evaluate(() => [document.querySelectorAll('.xp .pill').length, /프린트 올리기/.test(document.querySelector('.xp').textContent)]), [2, true]);
  await page.evaluate(() => closeExamPop());
  봄('파일 이름을 누르면 창 대신 내려받기(고리)', await page.$eval(`${줄(1)} .xr-print`, a => [a.target, /onclick="event\.stopPropagation\(\)"/.test(a.outerHTML)]), ['_blank', true]);

  /* 지난 기록 — 읽기 전용이라 누를 칸이 없다 */
  await page.evaluate(() => { state.examHistory = { items: [{ season: '2학기 중간', startedAt: '2026-08-20', endedAt: '2026-09-30',
    dates: { '광남고': { '1': { start: '2026-09-01' } } } }] }; goExamSeason('0'); });
  봄('지난 기록엔 누를 칸이 없다', await page.locator('.rst-wrap td.xr-ed').count(), 0);
} finally {
  await 브라우저.close(); 서버.kill();
}
console.log(`\n${pass} 통과 · ${fail} 실패`);
process.exit(fail ? 1 : 0);
