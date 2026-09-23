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
const 봄 = (말, 잰것, 바람) => { const ok = 잰것 === 바람; if(!ok) 틀림++; console.log((ok ? '  ✓ ' : '  ✗ ') + 말 + (ok ? '' : `  (나온 것: ${JSON.stringify(잰것)})`)); };
try{
  const p = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  await p.goto('http://127.0.0.1:8778/index.html');
  await p.waitForFunction(() => typeof render === 'function' && typeof DATA !== 'undefined');
  await p.evaluate(씨앗); await p.evaluate(무대들.질의응답.세우기);
  const 칸 = '#answer-qn1';
  await p.click(칸); await p.keyboard.type('양변에 -1을 곱');
  await p.click('.qn-thread .qn-shots img');                       // 학생 사진을 크게
  봄('사진이 크게 열렸다', await p.evaluate(() => !!state.hwPhotoView), true);
  await p.evaluate(() => { state.hwPhotoView = null; render(); });  // 닫는다
  봄('🔴 닫고 나도 쓰던 답이 그대로', await p.inputValue(칸), '양변에 -1을 곱');
  await p.evaluate(() => { state.qnaSelectedId = 'qn2'; render(); });
  봄('   다른 질문의 칸은 비어 있다(섞이지 않는다)', await p.inputValue('#answer-qn2'), '');
  await p.evaluate(() => { state.qnaSelectedId = 'qn1'; render(); });
  봄('   돌아오면 다시 그 답', await p.inputValue(칸), '양변에 -1을 곱');
}finally{ await b.close(); 서버.kill(); }
console.log(틀림 ? `✗ ${틀림}개 틀림` : '✓ 전부 통과');
process.exitCode = 틀림 ? 1 : 0;
