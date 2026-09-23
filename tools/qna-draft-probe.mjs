/* 쓰던 답이 «사진 크게 보기»를 지나도 남는가 — 실제 브라우저로 (2026-09-24 · 사용자 신고)
 *   node tools/qna-draft-probe.mjs      (tools/serve.js 를 8777 로 띄운 뒤, 또는 shots 가 떠 있을 때)
 * 한글을 한 글자씩 «자판으로» 친다 — 붙여넣기로는 조합(IME)을 못 흉내 내지만 input 이 글자마다 도는지는 본다. */
import { chromium } from 'playwright';
import { 씨앗, 무대들 } from './shots-scenes.mjs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const 서버 = spawn(process.execPath, [path.join(HERE, 'serve.js'), '8778'], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 800));
const b = await chromium.launch();
let 틀림 = 0;
const 봄 = (말, 잰것, 바람) => { const ok = JSON.stringify(잰것) === JSON.stringify(바람); if(!ok) 틀림++; console.log((ok ? '  ✓ ' : '  ✗ ') + 말 + (ok ? '' : `  (나온 것: ${JSON.stringify(잰것)})`)); };
try{
  const p = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  await p.goto('http://127.0.0.1:8778/index.html');
  await p.waitForFunction(() => typeof render === 'function' && typeof DATA !== 'undefined');
  await p.evaluate(씨앗); await p.evaluate(무대들.질의응답.세우기);
  const 칸 = '#answer-qn1';
  await p.click(칸); await p.keyboard.type('양변에 -1을 곱');
  await p.click('.qn-thread .qn-shots img');                       // 학생 사진을 크게
  봄('사진이 크게 열렸다', await p.evaluate(() => !!state.hwPhotoView), true);
  /* 확대 (2026-09-24 · 사용자 — 「학생이 올린 사진을 확대하고싶어」) */
  await p.waitForTimeout(400);
  const 사진 = '.hw-view .hw-scroll img', 상자 = '.hw-view .hw-scroll';
  const 폭0 = await p.$eval(사진, e => e.getBoundingClientRect().width);
  await p.click(사진);
  const 확대 = await p.$eval(상자, b => ({ on: b.classList.contains('zoom'), w: b.querySelector('img').getBoundingClientRect().width, l: b.scrollLeft, t: b.scrollTop }));
  봄('🔵 사진을 누르면 확대된다(2.5배)', 확대.on && Math.abs(확대.w / 폭0 - 2.5) < 0.05, true);
  봄('   누른 자리 쪽으로 옮겨 가 있다(스크롤이 0 이 아니다)', 확대.l > 0 && 확대.t > 0, true);
  const bx = await p.$eval(상자, b => { const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  await p.mouse.move(bx.x, bx.y); await p.mouse.down(); await p.mouse.move(bx.x - 150, bx.y - 90, { steps: 6 }); await p.mouse.up();
  const 끈뒤 = await p.$eval(상자, b => ({ on: b.classList.contains('zoom'), l: b.scrollLeft }));
  봄('🔵 끌면 옮겨진다 · 끌고 떼도 확대가 안 풀리고 창도 안 닫힌다',
    [끈뒤.l > 확대.l, 끈뒤.on, await p.evaluate(() => !!state.hwPhotoView)], [true, true, true]);
  await p.click(사진);
  봄('   한 번 더 누르면 원래 크기', await p.$eval(상자, b => b.classList.contains('zoom')), false);
  봄('   확대하는 동안 뒤의 답은 그대로', await p.inputValue(칸), '양변에 -1을 곱');
  await p.mouse.click(8, 450);                                     // 사진 밖(검은 바탕)을 누르면 닫힌다
  await p.waitForTimeout(400);
  봄('   바탕을 누르면 닫힌다', await p.evaluate(() => !!state.hwPhotoView), false);
  봄('🔴 닫고 나도 쓰던 답이 그대로', await p.inputValue(칸), '양변에 -1을 곱');
  await p.evaluate(() => { state.qnaSelectedId = 'qn2'; render(); });
  봄('   다른 질문의 칸은 비어 있다(섞이지 않는다)', await p.inputValue('#answer-qn2'), '');
  await p.evaluate(() => { state.qnaSelectedId = 'qn1'; render(); });
  봄('   돌아오면 다시 그 답', await p.inputValue(칸), '양변에 -1을 곱');
}finally{ await b.close(); 서버.kill(); }
console.log(틀림 ? `✗ ${틀림}개 틀림` : '✓ 전부 통과');
process.exitCode = 틀림 ? 1 : 0;
