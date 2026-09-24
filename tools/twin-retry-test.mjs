// 워커 — 붐비면 곧바로 다시 · 가벼운 길의 생각 상한 · 가벼운 프롬프트 (2026-09-24b)
//
//   node tools/twin-retry-test.mjs
//
// 🔴 망을 안 탄다 — `fetch` 를 가짜로 끼우고 워커 소스에서 함수를 그대로 떠서 돌린다(한도 0건).
//   재는 것: ① 503·500 이면 «두 번 더»만 넣는다(끝없이 두드리지 않는다) ② 400 이 «생각 상한» 때문이면
//   다음 이름으로, 아니면 그만 ③ 첫 시도(가벼운 길 아님)에는 생각 상한을 절대 안 건다 ④ 가벼운 프롬프트는
//   «역산»을 안 시키고 정답 꼴을 원본대로 둔다 · 보통 프롬프트는 예전 그대로.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = fs.readFileSync(path.join(ROOT, 'worker', 'gemini-proxy.js'), 'utf8').replace(/\r\n/g, '\n');

function lift(name) {
  let at = src.indexOf('function ' + name + '(');
  if (at < 0) throw new Error(name + ' 를 못 찾았습니다');
  if (src.slice(at - 6, at) === 'async ') at -= 6;
  let depth = 0;
  for (let j = src.indexOf('{', at); j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}') { depth--; if (!depth) return src.slice(at, j + 1); }
  }
  throw new Error(name + ' 의 끝을 못 찾았습니다');
}
const constLine = n => { const m = src.match(new RegExp('^const ' + n + ' = [^\\n]*;', 'm')); if (!m) throw new Error(n); return m[0]; };

let pass = 0, fail = 0;
const 봄 = (무엇, 나온것, 나와야) => {
  const ok = JSON.stringify(나온것) === JSON.stringify(나와야);
  if (ok) pass++; else fail++;
  console.log((ok ? '  ✓ ' : '  🔴 ') + 무엇 + (ok ? '' : '\n      나온 것 ' + JSON.stringify(나온것) + '\n      나와야 ' + JSON.stringify(나와야)));
};

/* 가짜 망 — 차례대로 [status, body] 를 돌려주고 보낸 몸통을 적는다 */
function 세상(답들) {
  const 보낸것 = [], 쉰것 = [];
  const fakeFetch = async (url, opt) => {
    보낸것.push({ url, body: JSON.parse(opt.body), headers: opt.headers });
    const [status, body] = 답들.shift() || [200, '{}'];
    return new Response(body, { status });
  };
  const fakeSleep = (fn, ms) => { 쉰것.push(ms); fn(); return 0; };
  const gen = new Function('fetch', 'setTimeout',
    [constLine('GEMINI_TWIN_MODEL'), constLine('GEMINI_BUSY_WAITS'), constLine('LIGHT_THINKING'), lift('geminiGenerate')].join('\n')
    + '\nreturn geminiGenerate;')(fakeFetch, fakeSleep);
  return { gen, 보낸것, 쉰것 };
}
const env = { GEMINI_API_KEY: 'k' };
const 붐빔 = [503, '{"error":{"code":503,"status":"UNAVAILABLE","message":"high demand"}}'];

console.log('\n① 붐비면 곧바로 두 번 더\n');
{
  const w = 세상([붐빔, 붐빔, [200, '{"ok":1}']]);
  const r = await w.gen(env, [{ text: 'x' }], false);
  봄('503 · 503 · 200 → 셋째에 들어간다', [r.res.status, r.시도], [200, 3]);
  봄('쉬는 간격은 2.5초 · 6초', w.쉰것, [2500, 6000]);
}
{
  const w = 세상([붐빔, 붐빔, 붐빔, [200, '{}']]);
  const r = await w.gen(env, [{ text: 'x' }], false);
  봄('🔴 세 번 다 붐비면 거기서 그친다 (넷째는 안 넣는다)', [r.res.status, r.시도, w.보낸것.length], [503, 3, 3]);
}
{
  const w = 세상([[500, '{"error":{"code":500,"status":"INTERNAL"}}'], [200, '{}']]);
  const r = await w.gen(env, [{ text: 'x' }], false);
  봄('500 도 한 번 더 넣는다', [r.res.status, r.시도], [200, 2]);
}
{
  const w = 세상([[429, '{"error":{"code":429}}'], [200, '{}']]);
  const r = await w.gen(env, [{ text: 'x' }], false);
  봄('🔴 한도(429)는 다시 안 넣는다 — 하루 몫만 탄다', [r.res.status, r.시도], [429, 1]);
}
{
  const w = 세상([[200, '{}']]);
  await w.gen(env, [{ text: 'x' }], false);
  봄('서버 쪽 마감 머리를 보낸다', w.보낸것[0].headers['X-Server-Timeout'], '170');
  봄('모델은 한 곳에서 정한다', /models\/gemini-3\.6-flash:generateContent/.test(w.보낸것[0].url), true);
}

console.log('\n② 생각 상한 — 가벼운 길에서만\n');
{
  const w = 세상([[200, '{}']]);
  const r = await w.gen(env, [{ text: 'x' }], false);
  봄('🔴 첫 시도(가벼운 길 아님)에는 생각 상한을 안 건다', 'thinkingConfig' in w.보낸것[0].body.generationConfig, false);
  봄('그때 생각 이름은 none', r.생각, 'none');
}
{
  const w = 세상([[200, '{}']]);
  const r = await w.gen(env, [{ text: 'x' }], true);
  봄('가벼운 길은 thinkingLevel low 부터', w.보낸것[0].body.generationConfig.thinkingConfig, { thinkingLevel: 'low' });
  봄('먹힌 이름을 돌려준다', r.생각, 'thinkingLevel');
}
{
  const w = 세상([[400, '{"error":{"message":"Unknown name \\"thinkingLevel\\" at generation_config.thinking_config"}}'], [200, '{}']]);
  const r = await w.gen(env, [{ text: 'x' }], true);
  봄('이름을 모르면(400) thinkingBudget 으로', w.보낸것[1].body.generationConfig.thinkingConfig, { thinkingBudget: 1024 });
  봄('먹힌 이름은 thinkingBudget', r.생각, 'thinkingBudget');
}
{
  const 모름 = [400, '{"error":{"message":"thinking is not supported"}}'];
  const w = 세상([모름, 모름, [200, '{}']]);
  const r = await w.gen(env, [{ text: 'x' }], true);
  봄('둘 다 모르면 상한 없이라도 만든다 (문항을 안 버린다)', ['thinkingConfig' in w.보낸것[2].body.generationConfig, r.res.status, r.생각], [false, 200, 'none']);
}
{
  const w = 세상([[400, '{"error":{"message":"API key not valid"}}'], [200, '{}']]);
  const r = await w.gen(env, [{ text: 'x' }], true);
  봄('🔴 생각과 무관한 400 은 다시 안 넣는다', [r.res.status, w.보낸것.length], [400, 1]);
}

console.log('\n③ 가벼운 프롬프트\n');
{
  const deps = ['SCENE_FORMAT'].map(n => { const m = src.match(new RegExp('^const ' + n + ' = `[\\s\\S]*?`;', 'm')); return m ? m[0] : `const ${n} = '';`; });
  const tp = new Function(deps.join('\n') + '\n' + lift('twinPrompt') + '\nreturn twinPrompt;')();
  const 보통 = tp('문제', '③', false, false);
  const 가벼움 = tp('문제', '③', false, true);
  봄('보통 프롬프트는 예전 그대로 — «1순위 주관식 역산»이 있다', /1순위 — 주관식/.test(보통), true);
  봄('🔴 가벼운 프롬프트에는 «역산»이 없다', /1순위 — 주관식|역산하여/.test(가벼움), false);
  봄('가벼운 프롬프트는 정답 꼴을 원본대로', /원본을 따르세요/.test(가벼움) && /거꾸로 맞추지 마세요/.test(가벼움), true);
  봄('가벼운 프롬프트는 풀이 세 단계', /세 단계 이내로/.test(가벼움) && !/여섯 단계 이내로/.test(가벼움), true);
  봄('입력칸 규칙(자연수 · ①~⑤)은 그대로 말한다', /999 이하의 자연수/.test(가벼움) && /①~⑤/.test(가벼움), true);
  봄('원본 문제·정답은 싣는다', /\[원본 문제\]\n문제/.test(가벼움) && /\[원본 정답\]\n③/.test(가벼움), true);
  봄('그림 문항의 가벼운 길은 그림 갈래 규칙을 그대로 쓴다', /좌표평면 위의 그림/.test(tp('문제', '③', true, true)), true);
}
{
  const h = lift('handleGeminiTwin');
  봄('처리기가 mode:light 를 읽는다', /body\.mode === 'light'/.test(h), true);
  봄('처리기가 geminiGenerate 를 지난다', /geminiGenerate\(env, parts, light\)/.test(h), true);
  봄('생각 조각은 빼고 글만 모은다', /filter\(p => !p\.thought\)/.test(h), true);
}

console.log('\n④ 화면이 워커에 «가볍게»를 실제로 말한다\n');
{
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/\r\n/g, '\n');
  let at = html.indexOf('async function generateTwinViaAI(');
  const g = html.slice(at, html.indexOf('\n}\n', at));
  봄('🔴 engine 이 light 면 mode:light 를 싣는다', g.includes("if(engine === 'light') payload.mode = 'light';"), true);
  봄('가볍게는 Gemini 길(기본 주소)로 간다 — Groq 주소가 아니다', g.includes("(engine === 'groq' ? '/twin-groq' : '')"), true);
}

console.log('\n' + (fail ? '🔴 ' : '✓ ') + pass + ' 통과 · ' + fail + ' 실패\n');
process.exit(fail ? 1 : 0);
