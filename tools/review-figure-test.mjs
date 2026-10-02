// 검토 — 그림이 문제 «안»에, 교재 크기로 (2026-10-02 · 사용자 — 「그림이 본문이랑 어울리지 못하고 엄청 크게 그려져 같이 읽기 어렵다」)
//
//   node tools/review-figure-test.mjs
//
// 붙드는 것: 그림이 발문과 보기 사이 · 폭 ≤ 340 · 화면 폭을 먹는 큰 상자는 «편집 중»에만 ·
//   1440×900 한 화면에 원본·변형의 보기까지 보인다 · 누르면 크게 본다 · 그림 칸 밑이 비지 않는다(pre-wrap 빈 줄).

import { chromium } from 'playwright';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { 씨앗, 무대들 } from './shots-scenes.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PORT = 8812;
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
  await page.evaluate(무대들.검토그림.세우기);

  const 잼 = () => page.evaluate(() => {
    const r = q => { const e = document.querySelector(q); return e ? e.getBoundingClientRect() : null; };
    const 발문 = r('.side.ai .pb-stem'), 그림 = r('.side.ai .rv-ifig'), 보기 = r('.side.ai .pb-ch'), 칸 = r('.side.ai .rv-ifw');
    const 띠 = r('.actbar');
    return { 차례: !!(발문 && 그림 && 보기) && 발문.bottom <= 그림.top + 1 && 칸.bottom <= 보기.top + 1,
      폭: 그림 ? Math.round(그림.width) : 0, 큰상자: document.querySelectorAll('.rv-work > .rv-body > .rv-fig').length,
      보기보임: !!보기 && 보기.bottom <= 띠.top, 원본보기보임: r('.side:not(.ai) .pb-ch').bottom <= 띠.top,
      그림밑틈: 칸 && 그림 ? Math.round(칸.bottom - 그림.bottom) : -1 };
  });
  const a = await 잼();
  봄('그림은 발문 다음 · 보기 앞', a.차례, true);
  봄('그림 폭 ≤ 340 (교재 크기)', a.폭 > 200 && a.폭 <= 340, true);
  봄('화면 폭 큰 상자는 없다(편집 중이 아니면)', a.큰상자, 0);
  봄('🔴 1440×900 한 화면에 변형·원본의 보기까지', [a.보기보임, a.원본보기보임], [true, true]);
  봄('그림 칸 밑이 비지 않는다(단추 줄만)', a.그림밑틈 < 60, true);

  await page.click('.side.ai .rv-ifig');
  await page.waitForSelector('.hw-view img');
  봄('누르면 크게 본다', await page.$eval('.hw-view img', e => e.src.startsWith('data:image/svg+xml')), true);
  await page.evaluate(() => closeHwPhoto());

  /* 저장된 SVG 는 옛 크기로 굳어 있다 — 장면이 있으면 그 장면으로 다시 그린다(figSvgOf · 2026-10-02 글자·선 키움) */
  await page.evaluate(() => { const v = state.variants.K2[0]; v.image = { ...v.image, svg: '<svg data-old="1"></svg>' }; render(); });
  봄('🔴 저장된 옛 SVG 대신 장면으로 다시 그린다(새 선 굵기 3.4)', await page.$eval('.side.ai .rv-ifig', e => [!!e.querySelector('[data-old]'), /stroke-width="3\.4"/.test(e.innerHTML)]), [false, true]);
  await page.evaluate(() => { const v = state.variants.K2[0]; v.image = { kind:'svg', svg: '<svg data-old="1"></svg>' }; render(); });
  봄('장면이 없으면 저장된 SVG 그대로', await page.$eval('.side.ai .rv-ifig', e => !!e.querySelector('[data-old]')), true);

  await page.evaluate(() => { state.figureDrafting = 'K2-02-E-0139-N01'; render(); });
  봄('편집·초안 중에는 넓은 편집 상자가 위에', await page.evaluate(() => document.querySelectorAll('.rv-body > .rv-fig').length), 1);

  /* 시험지 문항 검토 · 시험지 화면도 같은 꼴 — 원본·변형 그림이 각 카드 본문 안, 폭 ≤ 340 */
  const 두카드 = () => page.evaluate(() => [...document.querySelectorAll('.has-fig')].map(q => {
    const f = q.querySelector(':scope > .rv-ifw .rv-ifig'); const st = q.querySelector(':scope > .pb-stem');
    return !!f && !!st && st.getBoundingClientRect().bottom <= f.getBoundingClientRect().top + 1 && f.getBoundingClientRect().width <= 340;
  }));
  await page.evaluate(무대들.검토교재그림.세우기);
  봄('시험지 문항 검토 — 원본·변형 둘 다 본문 안 · 교재 크기', await 두카드(), [true, true]);
  봄('   그림 도구 상자엔 그림을 다시 안 그린다', await page.evaluate(() => document.querySelectorAll('.rv-fig .pb-fig').length), 0);
  await page.evaluate(무대들.시험지그림.세우기);
  봄('시험지 — 원본·변형 둘 다 본문 안 · 교재 크기', await 두카드(), [true, true]);

  /* 문항 창고 — 목록 카드 · 코드 화면(원본 · 변형 카드) 셋 다 같은 꼴 */
  await page.evaluate(무대들.창고그림.세우기);
  봄('문항 창고 — 목록 카드 · 코드 화면 원본 · 변형 카드', await page.evaluate(() =>
    ['.ist-body.has-fig', '.ic-cbody.has-fig', '.ic-vb.has-fig'].map(q => { const e = document.querySelector(q);
      const f = e && e.querySelector(':scope > .rv-ifw .rv-ifig'); return !!f && f.getBoundingClientRect().width <= 340; })), [true, true, true]);
  봄('   한 장은 본문 안에만 — 밑 줄(ist-figs)에 다시 안 그린다', await page.evaluate(() => document.querySelectorAll('.ist-figs').length), 0);
} finally {
  await 브라우저.close(); 서버.kill();
}
console.log(`\n${pass} 통과 · ${fail} 실패`);
process.exit(fail ? 1 : 0);
