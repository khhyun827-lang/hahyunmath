// 「검토 못 함」을 «이 컴퓨터에서» 다시 검토한다 (2026-10-05)
//
//   node tools/review-local.mjs                 ← 검토 대기 중 «검토 못 함»(unsure) 전부 · 재보기만(안 쓴다)
//   node tools/review-local.mjs --save          ← 판정을 창고(variants)에 쓴다
//   node tools/review-local.mjs --codes A,B --save
//
// 🔴 **왜 로컬인가** — 워커(Cloudflare · 미국)에서 NVIDIA DeepSeek 은 오래 걸리는 문항이면 약 125초에 `524`
//   (Cloudflare «원본 응답 시간 넘김»)로 끊겼다. 흘려 받아도 같았다. 그 뒤 Groq 는 4000 토큰에서 잘린다.
//   같은 코드를 이 컴퓨터에서 돌리면 4~5분 걸려도 끝까지 받는다 — 잘린 11제 중 5제가 풀렸고 4제가 우리 답이었다.
// 🔵 **판정 규칙을 베끼지 않는다** — worker/gemini-proxy.js 의 handleReview 를 그대로 떠 와 진짜 열쇠로 부른다.
//   그래서 워커와 «같은 사슬·같은 판정»이다(정답은 프롬프트에 안 들어간다).
// ⚠ 열쇠는 `.keys/nvidia.txt`·`.keys/groq.txt`(git 밖). 워커의 하루 몫(KV)은 안 센다 — Groq 의 하루 토큰은 같은 계정이라 실제로 줄어든다.
// ⚠ 웹을 안 거치므로 `kv/variantsVer` 를 직접 올린다 — 안 올리면 다른 기기는 최대 12시간 뒤에 본다.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { 강사로로그인 } from './fb-login.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const 값 = (이름) => { const i = process.argv.indexOf(이름); return i >= 0 ? process.argv[i + 1] : ''; };
const 쓸까 = process.argv.includes('--save');
const 고른것 = 값('--codes').split(',').map((s) => s.trim()).filter(Boolean);

const src = fs.readFileSync(path.join(ROOT, 'worker/gemini-proxy.js'), 'utf8');
const 조각 = src.slice(src.indexOf('/* =================== 검토:'));
const 앞 = [
  'const upstreamRefused = (s) => s === 429 || (s >= 500 && s <= 599);',
  'const refundQuota = async () => {};',
  'const bumpQuota = async () => ({ ok: true });',
  'const groqQuota = async () => ({ review: { remaining: 999 } });',
].join(String.fromCharCode(10));
const { handleReview, reviewAnswerKind } = new Function(앞 + 조각 + '; return { handleReview, reviewAnswerKind };')();
const 열쇠 = (n) => fs.readFileSync(path.join(ROOT, '.keys', n + '.txt'), 'utf8').trim();
const env = { NVIDIA_KEY: 열쇠('nvidia'), GROQ_KEY: 열쇠('groq'), QUOTA: null };

const { BASE, H } = await 강사로로그인();
const 읽기 = async (code) => {
  const r = await fetch(BASE + '/variants/' + encodeURIComponent(code), { headers: H });
  return r.ok ? JSON.parse((await r.json()).fields.value.stringValue) : null;
};
let 대상;
if (고른것.length) 대상 = (await Promise.all(고른것.map(읽기))).filter(Boolean);
else {
  대상 = []; let pt = '';
  do {
    const r = await fetch(BASE + '/variants?pageSize=300' + (pt ? '&pageToken=' + pt : ''), { headers: H });
    const j = await r.json();
    for (const d of j.documents || []) { try { 대상.push(JSON.parse(d.fields.value.stringValue)); } catch (e) {} }
    pt = j.nextPageToken || '';
  } while (pt);
  대상 = 대상.filter((v) => v && v.pending && !v.deleted && v.aiReview && v.aiReview.verdict === 'unsure');
}
대상 = 대상.filter((v) => reviewAnswerKind(v.answer));
console.log('검토할 것 ' + 대상.length + '개' + (쓸까 ? '' : ' (재보기 — 안 쓴다 · 쓰려면 --save)'));

const put = async (col, id, data) => (await fetch(BASE + '/' + col + '/' + encodeURIComponent(id), {
  method: 'PATCH', headers: { ...H, 'Content-Type': 'application/json' },
  body: JSON.stringify({ fields: { value: { stringValue: JSON.stringify(data) } } }) })).status;   // items-push 의 putDoc 과 같은 꼴
const NOW = () => { const d = new Date(); const p = (n) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()); };

let 씀 = 0; const 셈 = {};
for (const v of 대상) {
  const t0 = Date.now();
  const res = await handleReview({ json: async () => ({ content: v.content, answer: v.answer }) }, env, {}, 'local');
  const r = await res.json();
  const 초 = Math.round((Date.now() - t0) / 1000);
  셈[r.verdict || r.error] = (셈[r.verdict || r.error] || 0) + 1;
  console.log(v.code, (r.verdict || r.error), r.answer || '', '· 우리', v.answer, '·', 초 + '초', r.trail ? JSON.stringify(r.trail) : (r.models || []).join(','));
  if (!쓸까 || !r.verdict) continue;
  const 지금 = await 읽기(v.code);                                   // 그사이 화면에서 바뀌었을 수 있다 — 새로 읽어 얹는다
  if (!지금 || !지금.pending || 지금.deleted || 지금.content !== v.content || 지금.answer !== v.answer) { console.log('  ⓘ 그사이 바뀌어 안 씀'); continue; }
  const 판정 = { verdict: r.verdict, answer: r.answer || '', reason: r.reason || '', lone: r.lone || '', first: r.first || '',
    second: r.second || '', models: r.models || [], at: NOW(), via: 'local', ...(r.trail ? { trail: r.trail } : {}) };
  const st = await put('variants', v.code, { ...지금, aiReview: 판정 });
  if (st === 200) 씀++; else console.log('  🔴 저장 실패 http ' + st);
}
if (씀) console.log('variantsVer', await put('kv', 'variantsVer', String(Date.now())));
console.log('끝 — ' + JSON.stringify(셈) + (쓸까 ? ' · 쓴 것 ' + 씀 : ''));
