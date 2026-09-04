// 창고에서 «닮은 문항»을 찾는다 — 서로 변형일 만한 짝의 후보 (2026-09-05)
//
//   node tools/similar-items.mjs            ← 몇 쌍이나 나오는지 재 본다
//   node tools/similar-items.mjs --show 20  ← 위에서 20쌍을 눈으로 본다
//   node tools/similar-items.mjs --min 0.55 ← 잣대를 바꿔 본다
//
// 🔴 **판단은 기계가 하지 않는다. 후보만 좁힌다.**
//    「이 둘이 서로 변형인가」는 글자로 못 가른다 — 숫자만 다른 같은 문제와, 소재만 같고
//    푸는 법이 다른 문제가 글자로는 똑같이 닮아 보인다. 그건 사람이 봐야 안다.
//    🔵 그런데 «564제 중 어느 셋을 볼지» 좁히는 일은 기계가 훨씬 잘한다. 그것만 한다.
//
// 🔵 **AI 를 한 건도 안 쓴다.** 수식의 «뼈대»와 낱말을 견주는 것으로 충분하다 —
//    한도는 하루 20건뿐이고, 이 일에 쓰면 정작 문제를 못 만든다.
//
// ⚠ 읽기만 한다. 창고를 한 번 읽는다(564건 남짓).

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const 보기수 = (() => { const i = process.argv.indexOf('--show'); return i > 0 ? +process.argv[i+1] : 0; })();
const 잣대   = (() => { const i = process.argv.indexOf('--min');  return i > 0 ? +process.argv[i+1] : 0.5; })();
/* 겹친 낱말들의 무게 합이 이보다 가벼우면 후보로 안 본다. 값은 실측으로 골랐다. */
const 최소증거 = (() => { const i = process.argv.indexOf('--ev'); return i > 0 ? +process.argv[i+1] : 8; })();

const NL2 = String.fromCharCode(10);
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const apiKey = (html.match(/apiKey:\s*"([^"]+)"/) || [])[1];
const projectId = (html.match(/projectId:\s*"([^"]+)"/) || [])[1];
const r0 = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=' + apiKey,
  { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"returnSecureToken":true}' });
const token = (await r0.json()).idToken;
const BASE = 'https://firestore.googleapis.com/v1/projects/' + projectId + '/databases/(default)/documents';

const items = [];
{
  let pt = '';
  do {
    const r = await fetch(BASE + '/items?pageSize=300' + (pt ? '&pageToken=' + pt : ''),
      { headers: { Authorization: 'Bearer ' + token } });
    const j = await r.json();
    for (const d of (j.documents || [])) {
      const v = JSON.parse(d.fields.value.stringValue);
      if (v && v.code && v.content) items.push(v);
    }
    pt = j.nextPageToken || '';
  } while (pt);
}

/* ── 문항 하나를 «뼈대»로 바꾼다 ─────────────────────────────────────
   🔵 **숫자는 지운다** — 숫자변형은 «숫자만 다른» 것이라, 숫자를 남기면 정작 찾으려는 짝이
     제일 안 닮아 보인다. 뒤집힌 잣대가 된다.
   🔵 **선지는 뺀다** — ①~⑤ 는 답의 모양일 뿐 문제의 뼈대가 아니다.
   ⚠ 수식 명령(\sqrt · \frac · \overline)은 남긴다 — 그것이 «어떤 계산인가»를 말한다. */
function 뼈대(content){
  let s = String(content || '');
  const 선지at = s.search(/[①②③④⑤]/);
  if (선지at > 0) s = s.slice(0, 선지at);
  s = s.replace(/\|[^\n]*\|/g, ' ');                 // 표 줄은 뺀다(조건 상자는 문제마다 붙는다)
  const 토큰 = [];
  for (const m of s.matchAll(/\[a-zA-Z]+/g)) 토큰.push(m[0]);          // 수식 명령
  for (const m of s.matchAll(/[가-힣]{2,}/g)) 토큰.push(m[0]);          // 한글 낱말
  for (const m of s.matchAll(/\^\{?[0-9]\}?/g)) 토큰.push('^' + m[0].replace(/[^0-9]/g, ''));
  return 토큰;
}
/* 🔴 **흔한 말은 값이 없다** (2026-09-05 · 처음 돌려 보고 알았다).
   집합 단원은 발문이 죄다 「전체집합 $U$의 두 부분집합 $A$, $B$에 대하여」로 시작한다.
   그냥 겹치는 낱말을 세면 **그 상투구 하나로 서로 다른 문제 둘이 1.00 이 된다.**
   → 낱말마다 «몇 문항에 나오는가»를 세어, 흔할수록 무게를 낮춘다(IDF).
     564제 중 500제에 나오는 말은 «이 둘이 닮았다»는 증거가 못 된다.
   🔵 AI 없이 되는 일이다 — 세기와 나눗셈뿐이다. */
/* 🔴 **흔한 말은 «단원 안에서» 재야 한다** (2026-09-05 · 두 번 고쳐서 알았다).
   처음엔 낱말 겹침만 셌더니, 집합 단원의 발문 상투구(「전체집합 U의 두 부분집합 A, B에
   대하여」) 하나로 서로 다른 문제 둘이 1.00 이 됐다.
   그래서 창고 전체에서 흔한 말의 무게를 낮췄는데(IDF) **그래도 안 갈렸다** —
   그 상투구는 «창고 전체»로 보면 그리 흔하지 않기 때문이다(집합 단원에만 몰려 있다).
   🔵 **단원 안에서 세면 갈린다.** 집합 문항 130개 중 120개에 나오는 말은 그 단원에서
     «아무것도 말해 주지 않는 말»이다. 견주는 자리가 단원 안이므로 무게도 단원 안에서 잰다. */
function 무게표(뼈대들){
  const df = new Map();
  for(const t of 뼈대들) for(const w of new Set(t)) df.set(w, (df.get(w) || 0) + 1);
  const N = 뼈대들.length || 1;
  return (w) => Math.log((N + 1) / ((df.get(w) || 0) + 1)) + 0.05;
}
/* 🔴 **닮은 «비율»만 보면 안 된다 — «증거의 양»을 같이 봐야 한다** (2026-09-05).
   짧은 문항 둘은 뼈대가 서너 낱말뿐이라, 그것이 겹치면 비율이 1.00 이 된다.
   실제로 「전체집합 U의 두 부분집합 A, B에 대하여」로 시작하는 서로 다른 문제 둘이
   1.00 으로 떴다. **세 낱말이 겹친 것은 증거가 아니다.**
   → 겹친 낱말들의 «무게 합»을 따로 낸다. 비율이 높아도 무게가 가벼우면 후보가 아니다. */
function 닮음(a, b, 무게){
  const A = new Set(a), B = new Set(b);
  if(!A.size || !B.size) return { 비율:0, 증거:0 };
  let 겹침 = 0, 합 = 0;
  for(const w of new Set([...A, ...B])){
    const v = 무게(w);
    합 += v;
    if(A.has(w) && B.has(w)) 겹침 += v;
  }
  return { 비율: 합 ? 겹침 / 합 : 0, 증거: 겹침 };
}
const 답모양 = (a) => /^[①②③④⑤]$/.test(String(a || '').trim()) ? '객관식'
  : /^\$?-?[0-9]+\$?$/.test(String(a || '').replace(/\s/g, '')) ? '정수' : '식';
const 단원 = (code) => String(code).slice(0, 8);        // K2-01-E → 과목+단원까지

/* ── 단원 안에서만 견준다 ── 다른 단원의 문항이 서로 변형일 일은 거의 없고,
     564×564 를 다 견주면 느리다. 단원으로 가르면 한 묶음이 100 남짓이 된다. */
const 묶음 = {};
for (const it of items) {
  const k = 단원(it.code).slice(0, 5) + 단원(it.code).slice(2, 5);   // K2-01
  (묶음[String(it.code).match(/^([A-Z0-9]+-[0-9]+)/)[1]] = 묶음[String(it.code).match(/^([A-Z0-9]+-[0-9]+)/)[1]] || []).push(it);
}
const 뼈 = new Map(items.map(x => [x.code, 뼈대(x.content)]));


const 짝 = [];
for (const k in 묶음) {
  const 목록 = 묶음[k];
  const 무게 = 무게표(목록.map(x => 뼈.get(x.code)));
  for (let i = 0; i < 목록.length; i++) {
    for (let j = i + 1; j < 목록.length; j++) {
      const a = 목록[i], b = 목록[j];
      const { 비율, 증거 } = 닮음(뼈.get(a.code), 뼈.get(b.code), 무게);
      /* 증거가 가벼우면 «닮았다»고 하지 않는다 — 흔한 상투구 몇 개가 겹쳤을 뿐이다. */
      if(증거 < 최소증거) continue;
      const s = 비율;
      if (s < 잣대) continue;
      짝.push({ a, b, s, 증거, 같은답: 답모양(a.answer) === 답모양(b.answer),
                다른교재: a.code.split('-')[2] !== b.code.split('-')[2] });
    }
  }
}
짝.sort((x, y) => y.s - x.s);

console.log('\n창고 ' + items.length + '제 · 단원 묶음 ' + Object.keys(묶음).length + '개');
console.log('닮음 잣대 ' + 잣대 + ' 이상인 짝: ' + 짝.length + '쌍\n');
const 칸 = [[0.9, '거의 같다(중복일 수 있음)'], [0.75, '매우 닮음'], [0.65, '닮음'], [0.55, '조금 닮음'], [0, '느슨함']];
for (let i = 0; i < 칸.length; i++) {
  const 위 = i === 0 ? 1.01 : 칸[i-1][0];
  const n = 짝.filter(x => x.s >= 칸[i][0] && x.s < 위).length;
  if (n) console.log('  ' + String(칸[i][0]).padEnd(5) + '~ ' + String(위 === 1.01 ? 1 : 위).padEnd(5)
    + String(n).padStart(5) + '쌍  ' + 칸[i][1]);
}
console.log('\n  그중 «다른 교재끼리»: ' + 짝.filter(x => x.다른교재).length + '쌍'
  + '  (같은 교재 안: ' + 짝.filter(x => !x.다른교재).length + '쌍)');
console.log('  답 모양까지 같은 것: ' + 짝.filter(x => x.같은답).length + '쌍');

if (보기수) {
  console.log('\n── 위에서 ' + 보기수 + '쌍 ──');
  for (const x of 짝.slice(0, 보기수)) {
    console.log([NL2, '  닮음 ' + x.s.toFixed(2) + ' · 증거 ' + x.증거.toFixed(1) + '  ' + x.a.code + '  ↔  ' + x.b.code + (x.다른교재 ? '  [다른 교재]' : '') + (x.같은답 ? '' : '  [답 모양 다름]')].join(''));
    console.log('    A: ' + String(x.a.content).replace(/\s+/g, ' ').slice(0, 78));
    console.log('    B: ' + String(x.b.content).replace(/\s+/g, ' ').slice(0, 78));
  }
}
console.log('\n  ⓘ 이 수는 «후보»다 — 진짜 변형인지는 사람이 봐야 안다.\n');

/* ── 눈으로 보는 판 ────────────────────────────────────────────────
   🔴 **저장소에도 인터넷에도 안 올린다.** 문항 본문은 남의 저작물이라 `.gitignore` 가
     시험지·본문을 막고 있다(그 판단은 이 파일에도 그대로 적용된다).
     여기서는 **내 컴퓨터에 파일 하나**를 만들 뿐이고, 그 파일도 저장소에서 빠진다.
   🔵 수식은 KaTeX 로 그린다 — 날 LaTeX 를 견주는 것으로는 «닮았는지»를 사람이 못 본다. */
if(process.argv.includes('--html')){
  const 몇 = 보기수 || 20;
  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const 줄 = 짝.slice(0, 몇).map((x, i) => `
    <section>
      <h2>${i+1}. <span class=q>닮음 ${x.s.toFixed(2)}</span>
        <span class=q>증거 ${x.증거.toFixed(1)}</span>
        ${x.다른교재 ? '<span class="q hot">다른 교재</span>' : ''}
        ${x.같은답 ? '' : '<span class="q warn">답 모양 다름</span>'}</h2>
      <div class=two>
        <article><b>${esc(x.a.code)}</b><div class=body>${esc(x.a.content)}</div>
          <div class=ans>정답 ${esc(x.a.answer || '—')}</div></article>
        <article><b>${esc(x.b.code)}</b><div class=body>${esc(x.b.content)}</div>
          <div class=ans>정답 ${esc(x.b.answer || '—')}</div></article>
      </div>
    </section>`).join('');
  const 판 = `<!doctype html><html lang=ko><head><meta charset=utf-8>
<meta name=viewport content="width=device-width,initial-scale=1">
<title>닮은 문항 후보 ${몇}쌍</title>
<link rel=stylesheet href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"
  onload="renderMathInElement(document.body,{delimiters:[{left:'$',right:'$',display:false}],throwOnError:false})"></script>
<style>
  body{margin:0;padding:20px;background:#faf9f7;color:#1b1b1d;
    font:14px/1.7 Pretendard,-apple-system,'맑은 고딕',sans-serif;}
  h1{font-size:19px;margin:0 0 4px} .sub{color:#8a8580;font-size:12.5px;margin-bottom:18px}
  section{background:#fff;border:1px solid #e7e3dd;border-radius:10px;padding:14px 16px;margin-bottom:12px}
  h2{font-size:13px;margin:0 0 10px;font-weight:700;display:flex;gap:6px;align-items:center;flex-wrap:wrap}
  .q{font-size:11px;font-weight:600;color:#8a8580;background:#f3f1ee;border-radius:4px;padding:2px 7px}
  .q.hot{background:#e8f3ea;color:#2f6b3f} .q.warn{background:#fdf0e8;color:#9a5b2a}
  .two{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  @media(max-width:760px){.two{grid-template-columns:1fr}}
  article{border:1px solid #eee9e2;border-radius:8px;padding:11px 13px;background:#fdfcfa}
  article b{font:600 12px/1 ui-monospace,monospace;color:#3f6f4f}
  .body{margin-top:8px;white-space:pre-wrap;font-size:13px}
  .ans{margin-top:9px;padding-top:8px;border-top:1px solid #f0ece6;font-size:11.5px;color:#8a8580}
</style></head><body>
<h1>닮은 문항 후보 ${몇}쌍</h1>
<div class=sub>창고 ${items.length}제에서 찾은 것 · 위에서부터 닮은 순서 ·
  <b>진짜 변형인지는 눈으로 판단하셔야 합니다</b></div>
${줄}</body></html>`;
  const 어디 = 'C:/Users/hahyun/Desktop/닮은문항.html';
  fs.writeFileSync(어디, 판, 'utf8');
  console.log('  🔵 바탕화면에 «닮은문항.html» 을 만들었습니다 — 눌러서 여시면 됩니다.' + String.fromCharCode(10));
}
