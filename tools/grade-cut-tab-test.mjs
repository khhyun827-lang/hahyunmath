// 등급컷 갈래 (2026-10-02) — 시험 일정 표에서 떼어 «시험 일정 · 직보 일정표 · 등급컷» 셋째 갈래로
//
//   node tools/grade-cut-tab-test.mjs
//
// 붙드는 것: 갈래 단추 셋 · 시험 일정 표엔 등급컷 칸이 없다 · 등급컷 표는 줄마다 칸 넷 ·
//   칸을 고치면 «화면이 고른 시즌 열쇠»로 저장한다(지난 시즌을 보면 그 시즌 열쇠).
// 실 DB 는 안 건드린다 — saveGradeCut 을 흉내 낸다.

import { chromium } from 'playwright';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { 씨앗, 무대들 } from './shots-scenes.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PORT = 8793;
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
  await page.evaluate(무대들.등급컷.세우기);
  await page.evaluate(() => { window.저장 = []; window.saveGradeCut = async (...a) => { 저장.push(a); return true; }; });

  /* 2026-10-03 — 설정 안 단추 줄이 「학교」 탭의 서브탭이 됐다 */
  봄('갈래 단추 셋', await page.$$eval('.subnav > a > span', e => e.map(x => x.textContent.trim())), ['시험 일정', '직보 일정표', '등급컷']);
  봄('등급컷 표 — 줄마다 칸 넷', await page.$$eval('.rst-wrap tbody tr', rs => rs.map(r => r.querySelectorAll('input.gc-in').length)), [4, 4, 4, 4, 4, 4]);
  봄('적힌 값이 칸에 뜬다', await page.$$eval('.rst-wrap tbody tr:first-child input.gc-in', e => e.map(x => x.value)), ['90', '81', '72', '63']);

  const 열쇠 = await page.evaluate(() => curSeasonKey());
  await page.fill('.rst-wrap tbody tr:nth-child(2) input.gc-in >> nth=0', '91');
  await page.press('.rst-wrap tbody tr:nth-child(2) input.gc-in >> nth=0', 'Tab');
  await page.waitForFunction(() => 저장.length > 0);
  봄('지금 시즌 열쇠로 저장', await page.evaluate(() => 저장[0]), [열쇠, '경기여자고등학교', '1', '공통수학1', 1, '91']);
  /* Tab 뒤 render 가 칸을 새로 지어도 커서는 다음 칸에 (2026-10-08 · 사용자 — 「칸 밖으로 커서가 벗어남」) */
  await page.waitForTimeout(50);
  봄('Tab → 커서가 같은 줄 2등급컷에', await page.evaluate(() => (document.activeElement.getAttribute('aria-label') || '').endsWith('2등급컷') && document.activeElement.classList.contains('gc-in')), true);
  await page.keyboard.type('82'); await page.keyboard.press('Tab');
  await page.waitForFunction(() => 저장.length > 1);
  await page.waitForTimeout(50);
  봄('이어서 쳐도 들어가고 다시 다음 칸', [await page.evaluate(() => 저장[1].slice(4)), await page.evaluate(() => document.activeElement.getAttribute('aria-label').endsWith('3등급컷'))], [[2, '82'], true]);

  /* 다른 시험 칸(1학기 기말)을 펼쳐 적으면 그 시험 열쇠로 — curSeasonKey() 로 쓰면 지금 시험에 적힌다 (2026-10-03) */
  await page.evaluate(() => { 저장.length = 0; examSlotToggle(schoolYearOf(todayStr()) + '|1-fin', true); });
  await page.fill('section.xs-sec:nth-of-type(2) tbody tr:first-child input.gc-in >> nth=3', '60');
  await page.press('section.xs-sec:nth-of-type(2) tbody tr:first-child input.gc-in >> nth=3', 'Tab');
  await page.waitForFunction(() => 저장.length > 0);
  봄('다른 시험은 그 시험 열쇠로', await page.evaluate(() => 저장[0][0] === seasonKeyOf('1학기 기말', schoolYearOf(todayStr()))), true);

  await page.evaluate(() => { state.teacherTab = 'examrange'; state.examSeasonView = ''; render(); });
  봄('시험 일정 표엔 등급컷 칸이 없다', await page.$$eval('.rst-wrap thead th', e => e.some(x => /등급컷/.test(x.textContent))), false);
} finally {
  await 브라우저.close(); 서버.kill();
}
console.log(`\n${pass} 통과 · ${fail} 실패`);
process.exit(fail ? 1 : 0);
