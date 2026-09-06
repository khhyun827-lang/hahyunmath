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

let 되돌림 = 0;
const 앞부분 = [
  'const upstreamRefused = (s) => s === 429 || (s >= 500 && s <= 599);',
  'const refundQuota = async () => { 되돌림++; };',
].join(String.fromCharCode(10));
const 뒷부분 = '; return { handleReview, reviewSameAnswer, reviewChoices, reviewAnswerKind, reviewPickAnswer, REVIEW_PROMPT };';
const 만들기 = new Function('되돌림올리기', 'fetch', 'Response',
  'let 되돌림 = { get v(){return 0;} };' + 앞부분.replace('되돌림++;', '되돌림올리기();') + 조각 + 뒷부분);

/* 모델이 낼 답을 흉내 낸다. 부른 차례대로 꺼내 쓴다. */
let 부른것 = [];
function 가짜(답들) {
  let i = 0;
  return async (url, opt) => {
    const 몸 = JSON.parse(opt.body);
    부른것.push({ model: 몸.model, 보낸글: JSON.stringify(몸.messages) });
    const 이번 = 답들[i++];
    if (이번 && 이번.status) return { ok: false, status: 이번.status, text: async () => 'busy' };
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

async function 재기(답들, 보낼것) {
  부른것 = []; 되돌림 = 0;
  const { handleReview } = 만들기(() => { 되돌림++; }, 가짜(답들), 가짜응답);
  const req = { json: async () => 보낼것 };
  const res = await handleReview(req, { GROQ_KEY: 'x', QUOTA: null }, {}, 'u1');
  return { 판정: await res.json(), status: res.status };
}

const 보기5 = '값은? ① $12$ ② $13$ ③ $14$ ④ $15$ ⑤ $16$';
const 문항 = { content: '어떤 수를 구하시오. ' + 보기5, answer: '②' };
const 주관식 = { content: '값을 구하시오.', answer: '62' };

let 흠 = 0;
const 봄 = async (이름, 답들, 보낼것, 바람, 더보기) => {
  const { 판정 } = await 재기(답들, 보낼것);
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
await 봄('잘리면 unsure', [{ 글: '', 끝: 'length' }], 문항, 'unsure',
  (p) => p.reason !== 'truncated' ? '까닭이 truncated 가 아니다: ' + p.reason : '');

// ⑧ 위쪽이 거절하면 하루치를 돌려준다
await 봄('429 면 한도 되돌림', [{ status: 429 }], 문항, 'upstream',
  () => 되돌림 !== 1 ? '되돌리지 않았다(' + 되돌림 + ')' : '');
await 봄('503 도 되돌림', [{ status: 503 }], 문항, 'upstream',
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

console.log(흠 ? '🔴 ' + 흠 + '개 어긋남' : '통과 13개');
process.exit(흠 ? 1 : 0);
