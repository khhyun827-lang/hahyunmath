// 검토 대기의 네 칸 · 셋째 AI · 고치면 판정 지우기 (2026-10-05 · 사용자 개편)
//   node tools/review-subs-test.mjs   (실제 크롬 · 무대 «검토칸» · 워커·DB 는 흉내)
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
const 브라우저 = await chromium.launch();
try{
  const page = await 브라우저.newPage({ viewport: { width: 1440, height: 900 } });
  for(let i = 0; i < 40; i++){ try{ await page.goto(`http://127.0.0.1:${PORT}/index.html`); break; }catch{ await page.waitForTimeout(250); } }
  await page.waitForFunction(() => typeof render === 'function' && typeof DATA !== 'undefined');
  await page.evaluate(씨앗);
  await page.evaluate(무대들.검토칸.세우기);
  /* 워커·DB 흉내 — 보낸 것을 적어 둔다 */
  await page.evaluate(() => {
    window.보낸것 = [];
    window.askReview = async (content, answer, 더) => { 보낸것.push(더 || null);
      return { verdict: 'suspect', answer: '④', third: '④', models: ['deepseek-ai/deepseek-v4.1-flash', 'openai/gpt-oss-120b', 'qwen/qwen3.8-27b'] }; };
    window.dbSetDoc = async (col, id, data) => { window.저장 = data; return true; };
    window.getReviewQuotaUsed = async () => 0;
    window.workerVersion = async () => window.워커판 || '2026-10-05b';
  });

  const 칸 = () => page.$$eval('.subnav a.sn-ch', els => els.map(e => e.textContent.replace(/\s+/g, ' ').trim()));
  봄('사이드에 네 칸과 수', await 칸(), ['AI 검토 전1', '정답 일치1', '그림 확인1', '답 다름2']);
  await page.locator('.subnav a.sn-ch', { hasText: '정답 일치' }).click();
  봄('정답 일치 — 그림 없는 일치만', await page.evaluate(() => reviewWalkList().map(x => x.key)), ['K2-03-M-0211']);
  await page.locator('.subnav a.sn-ch', { hasText: '그림 확인' }).click();
  봄('그림 확인 — 그림 있는 일치', await page.evaluate(() => reviewWalkList().map(x => x.key)), ['K2-04-M-0318']);
  await page.locator('.subnav a.sn-ch', { hasText: '답 다름' }).click();
  봄('답 다름 — 둘이 같은 다른 답 + 서로 갈림', await page.evaluate(() => reviewWalkList().map(x => x.key).sort()), ['K2-03-M-0212', 'K2-05-E-0560']);
  봄('띠에 「갈린 1개 셋째 AI로」', await page.locator('.rv-aibar button', { hasText: '셋째 AI로' }).count(), 1);

  /* 옛 워커면 셋째를 안 부른다 */
  봄('🔴 옛 워커면 셋째를 안 부른다', await page.evaluate(async () => { window.워커판 = '2026-09-28a';
    const r = await reviewThirdOne('K2-03-M-0212'); window.워커판 = ''; return [r && r.error, 보낸것.length]; }), ['old', 0]);

  /* A — 갈린 것은 셋째 AI: 이미 푼 둘을 빼고, 그 둘의 답을 실어 보낸다 */
  await page.evaluate(() => { state.reviewVariantCode = 'K2-03-M-0212'; render(); });
  봄('갈린 것의 A 단추는 「셋째 AI」', (await page.locator('.actbar button', { hasText: '셋째 AI' }).count()) === 1, true);
  await page.keyboard.press('a');
  await page.waitForFunction(() => 보낸것.length === 1);
  봄('셋째 요청 — skip 둘 · prior 둘', await page.evaluate(() => 보낸것[0]),
    { skip: ['deepseek-ai/deepseek-v4.1-flash', 'openai/gpt-oss-120b'], prior: ['④', '⑤'] });
  봄('판정이 셋째 것으로 · 앞 답도 남는다', await page.evaluate(() => { const r = pendingVariants().find(v => v.code === 'K2-03-M-0212').aiReview;
    return [r.verdict, r.third, r.first, r.second, r.models.length]; }), ['suspect', '④', '④', '⑤', 3]);
  봄('셋째를 마치면 더는 셋째 대상이 아니다', await page.evaluate(() => reviewNeedsThird(pendingVariants().find(v => v.code === 'K2-03-M-0212'))), false);

  /* 고치면 AI 판정을 지운다 → 「AI 검토 전」으로 */
  봄('🔴 글을 고치면 판정이 지워져 AI 검토 전으로', await page.evaluate(async () => {
    const v = pendingVariants().find(x => x.code === 'K2-03-M-0211');
    window.변형찾기 = () => v;
    state.vEdit = { code: v.code, text: v.content + ' (고침)', answer: v.answer, kind: 'N', saving: false };
    await vEditSave();
    return [!!v.aiReview, 'aiReview' in 저장, 저장.content.endsWith('(고침)'), reviewSubOf(v)];
  }), [false, false, true, 'todo']);
} finally {
  await 브라우저.close(); 서버.kill();
}
console.log(`\n${pass} 통과 · ${fail} 실패`);
process.exit(fail ? 1 : 0);
