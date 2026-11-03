// 숫자변형 «한 번에 둘» (2026-11-03 · 워커 2026-11-03b)
//
// 사용자 — 「하나씩 만들고 나중에 하나 더 만들 때 원본과 N01 을 확인해 겹치지 않게 하려면 더 어렵다 ·
//   한 번에 N 두 개를 채우자」. 그래서
//   · 워커: count:2 면 글 문항·보통 길에서만 {"twins":[…]} 둘을 시키고, avoid(이미 있는 변형)를 원본 아래에 싣는다
//   · 화면: N 이 없는 글 문항은 둘을 시키고, 그 밖은 하나를 «이미 있는 것을 피해서» · 받은 것은 하나씩 걸러(그림·칠 수 있는 답·겹침) 담는다
//   · 자동 채우기 후보: «N 이 하나라도 있으면 끝» → «둘이 찰 때까지»
// 함수는 index.html · worker 에서 글자로 떠 와 돌린다.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').split(String.fromCharCode(13)).join('');
const wrk = fs.readFileSync(path.join(ROOT, 'worker', 'gemini-proxy.js'), 'utf8');
const NL = String.fromCharCode(10);

const 함수뜨기 = (src, 머리) => {
  const i = src.indexOf(머리);
  if (i < 0) throw new Error('못 찾음: ' + 머리);
  let d = 0, j = src.indexOf('{', src.indexOf(')', i));
  for (let k = j; k < src.length; k++) {
    if (src[k] === '{') d++;
    else if (src[k] === '}' && --d === 0) return src.slice(i, k + 1);
  }
  throw new Error('끝을 못 찾음: ' + 머리);
};

let 흠 = 0, 봄수 = 0;
const 봄 = (이름, 참) => { 봄수++; if (!참) { 흠++; console.log('🔴 ' + 이름); } };

// ── 워커 · 프롬프트 ──
const { twinPrompt, twinAvoidOf } = new Function('const SCENE_FORMAT = "";' + NL
  + 함수뜨기(wrk, 'function twinPrompt(') + NL + 함수뜨기(wrk, 'function twinAvoidOf(')
  + NL + 'return { twinPrompt, twinAvoidOf };')();
const 하나 = twinPrompt('원본 문제', '12', false, false);
const 둘 = twinPrompt('원본 문제', '12', false, false, { count: 2 });
봄('count 없으면 하나 · twins 꼴 아님', 하나.includes('"쌍둥이 문제" 1개') && !하나.includes('"twins"'));
봄('count:2 면 둘 · twins 꼴 · 둘끼리 다르게', 둘.includes('"쌍둥이 문제" 2개') && 둘.includes('{"twins": [문제1, 문제2]}') && 둘.includes('서로 다르고, 원본 정답과도'));
봄('그림 문항은 count:2 여도 하나', !twinPrompt('원본', '3', true, false, { count: 2 }).includes('"twins"'));
봄('가벼운 길은 count:2 여도 하나', !twinPrompt('원본', '3', false, true, { count: 2 }).includes('"twins"'));
const 피함 = twinPrompt('원본', '3', false, false, { count: 1, avoid: [{ content: 'N01 본문 x^2-5x', answer: '7' }] });
봄('avoid 는 원본 아래에 실린다', 피함.includes('[이미 있는 변형') && 피함.indexOf('N01 본문 x^2-5x') > 피함.indexOf('[원본 정답]') && 피함.includes('정답: 7'));
봄('가벼운 길도 avoid 를 싣는다', twinPrompt('원본', '3', false, true, { avoid: [{ content: 'N01본문', answer: '1' }] }).includes('N01본문'));
봄('avoid 는 셋까지 · 빈 것 거름', twinAvoidOf({ avoid: [{ content: 'a' }, null, { content: '' }, { content: 'b' }, { content: 'c' }, { content: 'd' }] }).length === 3);
봄('avoid 가 없으면 빈 칸', twinAvoidOf({}).length === 0 && !하나.includes('[이미 있는 변형'));

// ── 워커 · 받는 문 (글자로) ──
const gem = 함수뜨기(wrk, 'async function handleGeminiTwin(');
봄('워커: 둘은 글 문항·보통 길에서만', gem.includes('const 둘 = body.count === 2 && !hasImage && !light;'));
봄('워커: twins 를 풀어 첫째를 parsed 로', gem.includes('parsed.twins') && gem.includes('parsed = 받은것[0];'));
봄('워커: 둘째는 more 로', /more: 둘 \? 받은것\.slice\(1, 2\)/.test(gem));
봄('워커: Groq 는 언제나 하나', 함수뜨기(wrk, 'async function handleGroqTwin(').includes("{ count: 1, avoid: twinAvoidOf(body) }"));

// ── 화면 · 워커 부르기 ──
let 보낸;
const 부르기 = new Function('stub', `
  const AI_WORKER_URL = '', state = {}; let 마지막AI오류 = '';
  const withTimeout = p => p, getAuthToken = async () => 't';
  const normalizeTwinBlanks = x => x, sanitizeAiMathText = x => x, aiLiteralNewlines = x => x, normalizeTwinAnswer = x => x;
  const fetch = stub;
  ${함수뜨기(html, 'async function generateTwinViaAI(')}
  return generateTwinViaAI;`)(async (url, o) => { 보낸 = JSON.parse(o.body);
    return { ok: true, status: 200, json: async () => ({ content: '첫째', answer: '5', more: [{ content: '둘째', answer: '8' }] }) }; });
const 받 = await 부르기('본문', '3', null, '', { count: 2, avoid: [{ content: 'N01', answer: '4' }] });
봄('화면: Gemini 글 문항이면 count:2 를 보낸다', 보낸.count === 2 && 보낸.avoid.length === 1);
봄('화면: 둘째를 more 로 받는다', 받 && 받.more.length === 1 && 받.more[0].content === '둘째' && 받.more[0].needsFigure === false);
await 부르기('본문', '3', null, 'groq', { count: 2 });
봄('화면: Groq 에는 count 를 안 보낸다', !('count' in 보낸));
await 부르기('본문', '3', { fileId: 'f' }, '', { count: 2 });
봄('화면: 그림 문항에는 count 를 안 보낸다', !('count' in 보낸));
await 부르기('본문', '3', null, 'light', { count: 2 });
봄('화면: 가벼운 길에는 count 를 안 보낸다', !('count' in 보낸));

// ── 화면 · 겹침 검사 · 둘까지 세기 ──
const 꾸러미 = new Function('VS', `
  const variantsOfCodeAll = c => VS[c] || [];
  ${html.slice(html.indexOf('const AUTOFILL_N_TARGET'), html.indexOf('function autoFillCandidates('))}
  return { autoFillNeeds, autoFillAvoidOf, twinTooClose };`)({
  A: [], B: [{ variantKind: 'N', content: 'b1', answer: '1' }], C: [{ variantKind: 'N', content: 'c1' }, { variantKind: 'N', deleted: true }],
  D: [{ variantKind: 'U', content: 'u' }] });
const { autoFillNeeds, autoFillAvoidOf, twinTooClose } = 꾸러미;
봄('N 없음 → 채운다', autoFillNeeds('A') && autoFillNeeds('D'));
봄('N 하나 → 하나 더 채운다', autoFillNeeds('B'));
봄('N 둘(버린 것 포함) → 다 찼다', !autoFillNeeds('C'));
봄('피할 것에는 버린 것을 안 싣는다', autoFillAvoidOf('C').length === 1 && autoFillAvoidOf('B')[0].content === 'b1');
const 원 = { content: '$x^2-14x+40=0$ 의 두 근 3, 17 에서', answer: '24', 원본: true };
봄('정답이 원본과 같으면 걸린다', /원본/.test(twinTooClose({ content: '전혀 다른 수 91 82', answer: '24' }, [원])));
봄('객관식 기호가 같은 것은 안 걸린다', twinTooClose({ content: '다른 9', answer: '③' }, [{ content: '원 1', answer: '③', 원본: true }]) === '');
봄('수가 거의 같으면 걸린다', /거의 같/.test(twinTooClose({ content: '$x^2-14x+40=0$ 의 두 근 3, 17 에서', answer: '30' }, [원])));
봄('수가 다르면 지난다', twinTooClose({ content: '$x^2+6x-55=0$ 의 두 근 -11, 5 에서', answer: '-6' }, [원]) === '');
봄('이미 있는 변형과도 견준다', /이미 있는 변형/.test(twinTooClose({ content: 'q', answer: '7' }, [원, { content: 'n01', answer: '7' }])));

// ── 화면 · 자동 채우기 고리 (글자로) ──
const 고리 = 함수뜨기(html, 'async function autoFillTick(');
봄('고리: 몇 개를 시키나', 고리.includes("const 더 = { count: (!nVariantsOf(code).length && !itemFigureOf(body)) ? 2 : 1, avoid: autoFillAvoidOf(code) };"));
봄('고리: 세 길(보통·가볍게·Groq) 모두 더를 넘긴다',
  고리.includes("itemFigureOf(body), engine, 더)") && 고리.includes("'light', 더)") && 고리.includes("null, 'groq', 더)"));
봄('고리: 받은 것을 하나씩 거른다', 고리.includes('const 받은 = [twin].concat(twin.more || []);') && 고리.includes('twinTooClose(t, 견줄)') && 고리.includes('견줄.push(t)'));
봄('고리: 담은 것마다 새 번호', 고리.indexOf('const vcode = nextVariantCode(code') > 고리.indexOf('for(const t of 받은)'));
봄('«N 하나라도 있으면 끝» 이 안 남았다', !html.includes("some(v => v.variantKind === 'N')"));

console.log(흠 ? `🔴 ${흠}/${봄수} 어긋남` : `통과 ${봄수}개`);
process.exit(흠 ? 1 : 0);
