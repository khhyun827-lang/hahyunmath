// 「AI로 다시 생성」이 «왜» 안 됐는지 말하는가 (2026-09-21 · 사용자가 겪었다 —
//   「검토-내용없음에 있는 4문항 변형하려해도 생성실패하는데 왜그럴까」)
//
//   node tools/regen-why-test.mjs
//
// 🔴 이 문(`regenerateOneWithAI`)만 「생성에 실패했습니다」 다섯 글자로 남아 있었다.
//   다른 두 자리(`requestVariantForCode` 09-04 · `autoFillTick` 09-06)는 이미 까닭을 적는다.
// 🔴 그리고 **원본 본문이 없어도 워커를 불렀다** — 교재 요청(K-17)은 본문이 문항이 아니라
//   창고에 산다. 그 교재를 안 올렸으면 빈 글이 나가고, 워커는 «부르기 전에» 한도를 세므로
//   누를 때마다 하루치가 한 건씩 탄다. 네 문항이면 네 건이다.
//
// 재는 것은 둘이다 — ① 안 부르고 막는가 ② 부르고 나서 까닭을 남기는가.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/\r\n/g, '\n');
const NL = String.fromCharCode(10);

/* 머리말(`async` 든 아니든)부터 짝 맞는 닫는 괄호까지 뜬다 */
function lift(머리){
  const at = html.indexOf(머리);
  if (at < 0) throw new Error('못 찾음: ' + 머리);
  let d = 0;
  for (let j = html.indexOf('{', at); j < html.length; j++) {
    if (html[j] === '{') d++;
    else if (html[j] === '}') { d--; if (!d) return html.slice(at, j + 1); }
  }
  throw new Error('끝을 못 찾음: ' + 머리);
}

let pass = 0, fail = 0;
const 봄 = (무엇, 나온것, 나와야) => {
  const ok = JSON.stringify(나온것) === JSON.stringify(나와야);
  ok ? pass++ : fail++;
  console.log((ok ? '  ✓ ' : '  🔴 ') + 무엇
    + (ok ? '' : NL + '     나온 것: ' + JSON.stringify(나온것) + NL + '     바란 것: ' + JSON.stringify(나와야)));
};

const 원문 = lift('async function regenerateOneWithAI(');

/* 문 하나를 «진짜로» 돌린다 — 바깥것은 전부 가짜로 준다.
   돌려주는 것: 뜬 말들 · 워커를 불렀는가 · 한도를 물어봤는가 */
function 돌린다(원본, opts = {}){
  const 말 = [];
  const 본 = { 워커: 0, 한도: 0 };
  const stubs = {
    state: { aiProcessing:false, itemBody: 원본.창고 || {} },
    DATA: { problemBank: [ 원본.문항 ] },
    showToast: m => 말.push(String(m)),
    render: () => {},
    loadItemStoreIfNeeded: async () => {},
    bankOriginalSrc: null,
    getAIQuotaUsed: async () => { 본.한도++; return opts.used || 0; },
    AI_DAILY_LIMIT: 20,
    dbGet: async () => null,
    generateTwinViaAI: async () => { 본.워커++; return opts.twin || null; },
    applyTwinToBank: async () => {},
    followBankToQueue: () => {},
    aiUpstreamKind: () => opts.upstream || '',
    마지막AI오류: opts.오류 || '',
  };
  delete stubs.bankOriginalSrc;
  const 이름 = Object.keys(stubs);
  const fn = new Function(...이름,
    lift('function bankOriginal(') + NL + (opts.코드 || 원문) + NL + 'return regenerateOneWithAI;'
  )(...이름.map(k => stubs[k]));
  return fn(원본.문항.id).then(() => ({ 말, ...본 }));
}

const 빈교재요청 = { 문항: { id:'b1', itemCode:'K2-E-0007', source:'bookreq' }, 창고: {} };
const 본문있음  = { 문항: { id:'b2', itemCode:'K2-E-0007' },
                    창고: { 'K2-E-0007': { content:'x^2+1 을 인수분해하시오', answer:'3' } } };

console.log(NL + '① 원본 본문이 창고에 없을 때 — 부르기 «전»에 막는다');
const r1 = await 돌린다(빈교재요청);
봄('워커를 아예 안 부른다 (한도를 안 태운다)', r1.워커, 0);
봄('한도를 물어보지도 않는다 (읽기 한 건도 아낀다)', r1.한도, 0);
봄('«창고에 없다»고 말한다', /창고에 없습니다/.test(r1.말.join('')), true);
봄('무엇을 하라는지까지 말한다', /교재 올리기/.test(r1.말.join('')), true);
봄('어느 코드인지 적는다', /K2-E-0007/.test(r1.말.join('')), true);

console.log(NL + '② 본문은 있는데 워커가 엎어졌을 때 — 까닭을 남긴다');
const r2 = await 돌린다(본문있음, { 오류: '워커 502 — gemini error (SAFETY)' });
봄('워커를 부른다', r2.워커, 1);
봄('까닭이 화면에 뜬다', /gemini error \(SAFETY\)/.test(r2.말.join('')), true);
const r3 = await 돌린다(본문있음, { 오류: '워커 429 — quota', upstream: 'rate' });
봄('위쪽이 엎어진 것이면 그렇다고 덧붙인다', /Gemini 쪽이 엎어진/.test(r3.말.join('')), true);
const r4 = await 돌린다(본문있음, { 오류: 'Failed to fetch' });
봄('워커가 답을 못 준 것도 갈라 말한다', /옛 판이거나 연결이 끊긴/.test(r4.말.join('')), true);

console.log(NL + '③ 긴 말이 2.2초 만에 사라지지 않는다');
const 토스트 = lift('function showToast(');
const 머문다 = (msg) => {
  let 몇ms;
  new Function('state', 'setTimeout', 토스트.replace(/render\(\);/g, '') + NL + 'return showToast;')
    ({}, (f, d) => { 몇ms = d; })(msg);
  return 몇ms;
};
봄('짧은 말은 예전 그대로 2.2초 남짓', 머문다('됐습니다'), 2200 + 4 * 60);
봄('긴 말도 9초를 안 넘는다', 머문다('가'.repeat(500)), 9000);

/* 🪤 덫 — 고친 자리를 도로 걷으면 «무는가» */
console.log(NL + '🪤 덫');
let 물음 = 0;
const 재본다 = async (이름, 잰다) => {
  let 걸렸다 = false;
  try { 걸렸다 = !(await 잰다()); } catch (e) { 걸렸다 = true; }
  if (걸렸다) { 물음++; pass++; } else fail++;
  console.log((걸렸다 ? '  ✓ ' : '  🔴 ') + 이름 + (걸렸다 ? '' : ' — 안 물었다'));
};
await 재본다('가드를 걷으면 빈 본문이 워커로 나간다', async () => {
  const 걷음 = 원문.replace(/if\(!원본먼저\.content \|\| !원본먼저\.answer\)\{[\s\S]*?\n  \}\n/, '');
  const r = await 돌린다(빈교재요청, { 코드: 걷음 });
  return r.워커 === 0;
});
await 재본다('까닭을 도로 버리면 화면에 안 보인다', async () => {
  const 버림 = 원문.replace(/showToast\('생성에 실패했습니다 — '[\s\S]*?\);/,
    "showToast('생성에 실패했습니다. 잠시 후 다시 시도해주세요.');");
  const r = await 돌린다(본문있음, { 코드: 버림, 오류: '워커 502 — gemini error (SAFETY)' });
  return /gemini error/.test(r.말.join(''));
});
console.log('  🪤 ' + 물음 + '/2 물었다');

console.log(NL + (fail ? '🔴 ' + fail + '개 틀렸다 · ' + pass + '개 통과'
                       : '✓ 전부 통과 · ' + pass + '개') + NL);
process.exit(fail ? 1 : 0);
