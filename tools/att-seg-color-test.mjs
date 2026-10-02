// 수업 › 출결 — 출·지·조·결을 누르면 그 칸이 신호색으로 «꽉» 칠해지는가 (2026-10-02)
//
//   node tools/att-seg-color-test.mjs
//
// 사용자 — 「출 지 조 결 버튼 눌러도 색이 안 떠서 뭘 누른 상태인지 몰라」.
// 까닭: 시안 부품(회색 네모 #F1F2F5)을 더 센 선택자로 걸어 고른 칸 색(.on.ok 등)을 덮었다.
// 세 폭(1440 · 864 · 390)에서 넷을 차례로 눌러 «고른 칸만» 색이 서는지 본다.

import { chromium } from 'playwright';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { 씨앗, 무대들 } from './shots-scenes.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PORT = 8814;
const 서버 = spawn(process.execPath, [path.join(HERE, 'serve.js'), String(PORT)], { stdio: 'ignore' });
let pass = 0, fail = 0;
const 봄 = (무엇, 나온것, 나와야) => {
  const ok = JSON.stringify(나온것) === JSON.stringify(나와야);
  if(ok){ pass++; console.log('  ✓ ' + 무엇); }
  else { fail++; console.log(`  ✗ ${무엇}\n      나온 것: ${JSON.stringify(나온것)}\n      나와야:  ${JSON.stringify(나와야)}`); }
};
const 회색 = new Set(['rgb(241, 242, 245)', 'rgba(0, 0, 0, 0)', 'rgb(255, 255, 255)', 'rgb(252, 250, 250)', 'rgb(246, 247, 250)']);

const 브라우저 = await chromium.launch();
try{
  for(const [w, h] of [[1440, 900], [864, 900], [390, 844]]){
    const page = await 브라우저.newPage({ viewport: { width: w, height: h } });
    for(let i = 0; i < 40; i++){ try{ await page.goto(`http://127.0.0.1:${PORT}/index.html`); break; }catch{ await page.waitForTimeout(250); } }
    await page.waitForFunction(() => typeof render === 'function' && typeof DATA !== 'undefined');
    await page.evaluate(씨앗);
    await page.evaluate(무대들.수업반여럿.세우기);
    const 결과 = [];
    for(let k = 0; k < 4; k++){
      await page.locator('.cls-tiles .tile').first().locator('.seg button').nth(k).click();
      결과.push(await page.evaluate(k => [...document.querySelector('.cls-tiles .tile .seg').querySelectorAll('button')]
        .map((b, i) => [i === k, getComputedStyle(b).backgroundColor]), k));
    }
    const 고른칸색 = 결과.map((줄, k) => !회색.has(줄[k][1]));
    const 나머지회색 = 결과.every((줄, k) => 줄.every(([고름, c], i) => i === k || 회색.has(c)));
    봄(`${w} — 고른 칸(출·지·조·결)이 색으로 선다`, 고른칸색, [true, true, true, true]);
    봄(`${w} — 고르지 않은 칸은 색이 없다`, 나머지회색, true);
    봄(`${w} — 넷의 색이 서로 다르다`, new Set(결과.map((줄, k) => 줄[k][1])).size, 4);

    /* 고른 칸을 한 번 더 누르면 지운다 (사용자 — 「눌렀다가 다시 뺄 방법이 없어」) */
    const 첫칸 = page.locator('.cls-tiles .tile').first().locator('.seg button');
    await 첫칸.nth(3).click();                       // 마지막으로 고른 「결」을 다시
    봄(`${w} — 같은 칸을 다시 누르면 지워진다`, await page.evaluate(() =>
      [...document.querySelector('.cls-tiles .tile .seg').querySelectorAll('button')].some(b => b.classList.contains('on'))), false);

    if(w === 1440){
      /* 지운 칸을 저장하면 그날 이 반 줄을 기록에서 뺀다(DB 는 흉내) */
      const 남은 = await page.evaluate(async () => {
        const s = classRoster('c1')[0], 오늘 = todayStr();
        const rec = { attendance: [{ date: 오늘, status: '결석', reason: '', note: '', classId: 'c1' }, { date: '2026-09-01', status: '출석', classId: 'c1' }] };
        state.allRecords[s.studentId] = rec;
        window.loadRecord = async () => rec; window.saveRecord = async () => true; window.logAudit = async () => {};
        state.attDraft[s.studentId] = { status: null, reason: '', videoUrl: '', note: '' };
        await saveClassAttendance('c1', 오늘);
        return state.allRecords[s.studentId].attendance.map(a => a.date + ':' + a.status);
      });
      봄('1440 — 지운 칸을 저장하면 그날 줄만 빠진다', 남은, ['2026-09-01:출석']);

      /* 반 › 출결 표 — 열이 하나뿐인 달에도 판 폭으로 안 늘어난다(이름 열 고정 · 열이 쌓이는 만큼) */
      await page.evaluate(무대들.반여럿.세우기);
      봄('1440 — 반 › 출결 표가 내용만큼만(열 하나 → 400 안)', await page.$eval('.hwg-wrap', e => e.getBoundingClientRect().width < 400), true);
      봄('   이름 열은 108 고정', await page.$eval('.hwg th.who', e => Math.round(e.getBoundingClientRect().width)), 108);
    }

    /* 같은 까닭(부품 한 벌이 옛 상태 규칙을 덮음)으로 꺼진 것처럼 보이던 명단 거르개 — 켜면 꺼진 것과 달라야 한다 */
    await page.evaluate(무대들.학생명단.세우기);
    const 거르개 = page.locator('.rst-fbar .pill:not(.on)').filter({ hasText: '과제 미제출' }).first();
    if(await 거르개.count()){
      const 전 = await 거르개.evaluate(e => getComputedStyle(e).backgroundColor);
      await 거르개.click();
      const 후 = await page.locator('.pill.f').first().evaluate(e => getComputedStyle(e).backgroundColor);
      봄(`${w} — 명단 거르개를 켜면 색이 바뀐다`, 전 !== 후, true);
    }
    await page.close();
  }
} finally {
  await 브라우저.close(); 서버.kill();
}
console.log(`\n${pass} 통과 · ${fail} 실패`);
process.exit(fail ? 1 : 0);
