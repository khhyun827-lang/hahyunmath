// 워커 /review 의 «판정 갈래»를 배포 전에 못 박는다
//
// 🔵 갈래가 다섯이라 눈으로는 못 믿는다. 위쪽(Groq)에 진짜로 묻지 않고,
//   모델이 낼 답만 흉내 내서 «어떤 판정이 나오는가»만 잰다 — 토큰도 안 든다.
//
// 🔴 여기서 지켜야 하는 것 —
//   ① 정답이 프롬프트에 절대 안 들어간다 (들어가면 검토가 하나 마나가 된다)
//   ② 「AI가 틀렸다(suspect)」와 「AI가 못 풀었다(unsure)」가 갈린다
//   ③ 위쪽이 거절하면(429·5xx) 하루치를 돌려준다 — 못 받았으면 안 쓴 것이다
//   ④ 답이 갈릴 때만 둘째 모델을 부른다 (전부 두 번 부르면 값이 두 배다)

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = fs.readFileSync(path.join(ROOT, 'worker', 'gemini-proxy.js'), 'utf8');
const 조각 = src.slice(src.indexOf('/* =================== 검토:'));
if (!조각) throw new Error('검토 조각을 못 찾았습니다');

/* 되돌림 — «검토 하루치»(review)만 센다. Groq 몫(review-groq)은 따로 센다 (2026-09-28 · 사슬). */
let 되돌림 = 0, 그록셈 = 0, 그록되돌림 = 0, 그록남음 = 60;
const 앞부분 = [
  'const upstreamRefused = (s) => s === 429 || (s >= 500 && s <= 599);',
  'const refundQuota = async (env, b) => 알림("refund", b);',
  'const bumpQuota = async (env, b) => { 알림("bump", b); return { ok: true }; };',
  'const groqQuota = async () => ({ review: { remaining: 알림("groq-left") } });',
].join(String.fromCharCode(10));
const 뒷부분 = '; return { handleReview, reviewSameAnswer, reviewChoices, reviewAnswerKind, reviewPickAnswer, REVIEW_PROMPT };';
const 만들기 = new Function('알림', 'fetch', 'Response', 앞부분 + 조각 + 뒷부분);
const 알림 = (무엇, b) => {
  if (무엇 === 'refund') { if (b === 'review') 되돌림++; else if (b === 'review-groq') 그록되돌림++; }
  if (무엇 === 'bump' && b === 'review-groq') 그록셈++;
  if (무엇 === 'groq-left') return 그록남음;
};

/* 모델이 낼 답을 흉내 낸다. 부른 차례대로 꺼내 쓴다. */
let 부른것 = [];
function 가짜(답들) {
  let i = 0;
  return async (url, opt) => {
    const 몸 = JSON.parse(opt.body);
    부른것.push({ url, model: 몸.model, 보낸글: JSON.stringify(몸.messages) });
    const 이번 = 답들[i++];
    if (!이번) throw new Error('답들을 다 썼는데 또 불렀다 — ' + 몸.model);
    if (이번.던짐) throw new Error(이번.던짐);
    if (이번.status) return { ok: false, status: 이번.status, text: async () => 'busy' };
    return {
      ok: true, status: 200,
      text: async () => JSON.stringify({
        choices: [{ message: { content: 이번.글 }, finish_reason: 이번.끝 || 'stop' }],
        usage: { total_tokens: 100 },
      }),
    };
  };
}
class 가짜응답 {
  constructor(body, init) { this.body = body; this.status = (init && init.status) || 200; }
  async json() { return JSON.parse(this.body); }
}

/* 기본 env 는 Groq 만 — 옛 갈래(①~⑪)가 그대로 서는지 본다. NVIDIA 길은 아래 ⑫ 에서 따로 본다. */
async function 재기(답들, 보낼것, env) {
  부른것 = []; 되돌림 = 0; 그록셈 = 0; 그록되돌림 = 0;
  const { handleReview } = 만들기(알림, 가짜(답들), 가짜응답);
  const req = { json: async () => 보낼것 };
  const res = await handleReview(req, env || { GROQ_KEY: 'x', QUOTA: null }, {}, 'u1');
  return { 판정: await res.json(), status: res.status };
}

const 보기5 = '값은? ① $12$ ② $13$ ③ $14$ ④ $15$ ⑤ $16$';
const 문항 = { content: '어떤 수를 구하시오. ' + 보기5, answer: '②' };
const 주관식 = { content: '값을 구하시오.', answer: '62' };

let 흠 = 0;
const 봄 = async (이름, 답들, 보낼것, 바람, 더보기, env) => {
  let 판정;
  try { ({ 판정 } = await 재기(답들, 보낼것, env)); }
  catch (e) { 흠++; console.log('🔴 ' + 이름 + ' — 넘어졌다: ' + e.message); return; }
  const 났다 = 판정.verdict ||판정.error;
  if (났다 !== 바람) { 흠++; console.log('🔴 ' + 이름 + ' — 바란 것 ' + 바람 + ' · 나온 것 ' + 났다 + ' ' + JSON.stringify(판정)); return; }
  if (더보기) { const 말 = 더보기(판정); if (말) { 흠++; console.log('🔴 ' + 이름 + ' — ' + 말); } }
};

// ① 첫 모델이 창고와 맞으면 통과 — 둘째는 «안 부른다»
await 봄('첫 모델 일치 → agree', [{ 글: '정답: ②' }], 문항, 'agree',
  () => 부른것.length !== 1 ? '둘째 모델을 괜히 불렀다(' + 부른것.length + '번)' : '');

// ② 번호를 맨숫자로 적어도 일치다
await 봄('「2」도 ② 다', [{ 글: '정답: 2' }], 문항, 'agree');

// ③ 보기의 «값»으로 적어도 일치다
await 봄('「13」도 ② 다', [{ 글: '정답: 13' }], 문항, 'agree');

// ④ 계보가 다른 둘이 «같은» 다른 답 → 문항 의심
await 봄('둘이 같은 다른 답 → suspect', [{ 글: '정답: ④' }, { 글: '정답: ④' }], 문항, 'suspect',
  (p) => 부른것.length !== 2 ? '둘째를 안 불렀다' : (p.stored !== '②' ? '창고 답을 안 실어 보냈다' : ''));

// ⑤ 둘째가 창고와 맞으면 통과 — 첫째가 혼자 틀린 것
await 봄('둘째가 맞으면 agree', [{ 글: '정답: ④' }, { 글: '정답: ②' }], 문항, 'agree',
  (p) => p.lone !== '④' ? '혼자 틀린 답을 안 남겼다' : '');

// ⑥ 셋이 다 다르면 «검토 못 함» — 문항을 의심하지 않는다
await 봄('셋이 다 다르면 unsure', [{ 글: '정답: ④' }, { 글: '정답: ⑤' }], 문항, 'unsure',
  (p) => p.reason !== 'disagree' ? '까닭이 disagree 가 아니다: ' + p.reason : '');

// ⑦ 답을 적기 전에 잘린 것은 «틀림»이 아니다
//    (2026-09-28 · 사슬) 잘리면 «다음 모델»에게 묻는다 — 모두 잘려야 unsure 다
await 봄('모두 잘리면 unsure', [{ 글: '', 끝: 'length' }, { 글: '', 끝: 'length' }], 문항, 'unsure',
  (p) => p.reason !== 'truncated' ? '까닭이 truncated 가 아니다: ' + p.reason : '');
await 봄('첫째가 잘리면 다음 모델이 첫째다', [{ 글: '', 끝: 'length' }, { 글: '정답: ②' }], 문항, 'agree',
  (p) => p.models[0] !== 'qwen/qwen3.8-27b' ? '다음 모델로 안 넘어갔다: ' + JSON.stringify(p.models) : '');

// ⑧ 위쪽이 거절하면 하루치를 돌려준다
//    (사슬) «모두» 거절해야 upstream 이다 · Groq 몫도 부른 만큼 돌려준다
await 봄('429 면 한도 되돌림', [{ status: 429 }, { status: 429 }], 문항, 'upstream',
  () => 되돌림 !== 1 ? '되돌리지 않았다(' + 되돌림 + ')' : (그록되돌림 !== 2 ? 'Groq 몫을 안 돌려줬다(' + 그록되돌림 + ')' : ''));
await 봄('503 도 되돌림', [{ status: 503 }, { status: 503 }], 문항, 'upstream',
  () => 되돌림 !== 1 ? '되돌리지 않았다(' + 되돌림 + ')' : '');

// ⑨ 검토할 수 없는 요청은 한도를 먹지 않는다
await 봄('정답 없는 문항은 안 센다', [{ 글: '정답: ②' }], { content: '풀어라', answer: '' }, 'bad request',
  () => 되돌림 !== 1 ? '되돌리지 않았다' : (부른것.length ? '위쪽에 괜히 물었다' : ''));

// ⑩ 주관식에서 숫자는 숫자로만 견준다
await 봄('주관식 62 일치', [{ 글: '정답: 62' }], 주관식, 'agree');
await 봄('주관식 2 는 ② 가 아니다', [{ 글: '정답: 2' }, { 글: '정답: 2' }], 주관식, 'suspect');

// ⑪ 🔴 정답이 프롬프트에 절대 안 들어간다
await 재기([{ 글: '정답: ④' }, { 글: '정답: ⑤' }], 문항);
for (const 부 of 부른것) {
  if (부.보낸글.includes('62') === false && /"정답"|정답은|answer/.test(부.보낸글) && 부.보낸글.includes('②')) {
    흠++; console.log('🔴 정답이 프롬프트에 실려 나갔다: ' + 부.보낸글.slice(0, 160));
  }
}
const 프롬 = 부른것[0].보낸글;
if (프롬.includes('창고') || /정답\s*[:：]\s*[①②③④⑤]/.test(프롬.replace('정답: <답>', ''))) {
  흠++; console.log('🔴 프롬프트에 정답 꼴이 들어 있다');
}

// ⑫ 🔵 NVIDIA 가 먼저, Groq 가 뒤 (2026-09-28 · 사용자가 골랐다)
const 둘다 = { NVIDIA_KEY: 'n', GROQ_KEY: 'g', QUOTA: null };
const 엔비 = (i) => 부른것[i] && 부른것[i].url.includes('nvidia.com') && 부른것[i].model === 'deepseek-ai/deepseek-v4.1-flash';
const 그록 = (i) => 부른것[i] && 부른것[i].url.includes('groq.com') && 부른것[i].model === 'openai/gpt-oss-120b';
await 봄('🔴 NVIDIA 가 첫째다 · 맞으면 Groq 를 안 부른다', [{ 글: '정답: ②' }], 문항, 'agree',
  () => !엔비(0) ? 'NVIDIA DeepSeek 을 먼저 안 불렀다: ' + JSON.stringify(부른것.map(x => x.model))
    : 부른것.length !== 1 ? 'Groq 를 괜히 불렀다' : 그록셈 ? 'Groq 를 안 불렀는데 Groq 몫을 셌다' : '', 둘다);
await 봄('🔴 갈리면 Groq gpt-oss 가 둘째다', [{ 글: '정답: ④' }, { 글: '정답: ④' }], 문항, 'suspect',
  (p) => !(엔비(0) && 그록(1)) ? '둘째가 Groq gpt-oss 가 아니다' : 그록셈 !== 1 ? 'Groq 몫을 부른 만큼 안 셌다(' + 그록셈 + ')'
    : p.models.join() !== 'deepseek-ai/deepseek-v4.1-flash,openai/gpt-oss-120b' ? 'models 가 틀렸다' : '', 둘다);
await 봄('🔴 NVIDIA 504 면 Groq 가 첫째가 된다', [{ status: 504 }, { 글: '정답: ②' }], 문항, 'agree',
  (p) => p.models.join() !== 'openai/gpt-oss-120b' ? '넘어가지 않았다: ' + JSON.stringify(p.models) : 되돌림 ? '받았는데 하루치를 돌려줬다' : '', 둘다);
await 봄('🔴 NVIDIA 시간 넘김(던짐)도 Groq 로 간다', [{ 던짐: 'The operation was aborted due to timeout' }, { 글: '정답: ②' }], 문항, 'agree',
  (p) => p.models[0] !== 'openai/gpt-oss-120b' ? '넘어가지 않았다' : '', 둘다);
그록남음 = 0;
await 봄('🔴 Groq 몫이 없으면 둘째를 안 부른다 (변형 몫을 안 뺏는다)', [{ 글: '정답: ④' }], 문항, 'unsure',
  (p) => 부른것.length !== 1 ? 'Groq 를 불렀다' : p.reason !== 'second-refused' ? '까닭: ' + p.reason : '', 둘다);
await 봄('NVIDIA 도 없고 Groq 몫도 없으면 upstream + 하루치 되돌림', [{ status: 504 }], 문항, 'upstream',
  () => 되돌림 !== 1 ? '되돌리지 않았다' : '', 둘다);
그록남음 = 60;
await 봄('NVIDIA 열쇠만 있어도 돈다', [{ 글: '정답: ②' }], 문항, 'agree', () => !엔비(0) ? 'NVIDIA 를 안 불렀다' : '',
  { NVIDIA_KEY: 'n', QUOTA: null });

console.log(흠 ? '🔴 ' + 흠 + '개 어긋남' : '통과 22개');
process.exit(흠 ? 1 : 0);
