// 검토용 AI 후보를 «우리 문항으로» 시험한다 (2026-09-06)
//
//   node tools/review-bench.mjs --list                    돌릴 수 있는 무료 모델을 본다
//   node tools/review-bench.mjs <모델id> [--n 40]         한 모델을 시험한다
//   node tools/review-bench.mjs <모델A> <모델B> --n 30    여럿을 같은 시험지로
//
// 🔵 **왜 «짐작»하지 않고 재는가** — 어느 모델이 수학을 잘하는지는 평판으로 고를 일이 아니다.
//   우리에겐 정답이 붙은 452제가 있다. 그게 곧 시험지다.
//
// 🔴 **모델에게 「이 문제 괜찮나요?」라고 묻지 않는다.** LLM 은 그렇게 물으면 대개 괜찮다고 한다.
//   정답을 숨기고 «직접 풀게» 한 뒤 맞대 본다 — 그래야 진짜 검사다.
//   ⚠ 그래서 프롬프트에 정답을 절대 안 넣는다. 넣으면 「맞다」가 공짜로 나온다.
//
// 🔵 시험지는 모델마다 «같은 것»이라야 견줄 수 있다 — 건너뛰며 뽑아 단원이 골고루 섞이게 한다.
// ⚠ 그림이 붙은 문항은 뺀다 — 글만 보내면 아무도 못 푼다(우리가 지는 시험을 내면 안 된다).
//
// 열쇠는 `.keys/openrouter` 에 한 줄로 둔다(.gitignore 에 있다). 환경변수 OPENROUTER_KEY 도 받는다.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = 'https://openrouter.ai/api/v1';
const 값 = (이름, 기본) => { const i = process.argv.indexOf(이름); return i >= 0 ? process.argv[i + 1] : 기본; };
const N = +값('--n', 40);
const 간격 = +값('--gap', 3.5) * 1000;   // 한 건 사이의 쉼(초). 한도가 빡빡한 모델은 늘린다.
const 재시도 = +값('--retry', 3);         // 429·5xx 를 «못 잼»으로 버리기 전에 몇 번 다시 묻나
// 🔴 답이 «틀린» 것과 답을 «적기 전에 잘린» 것은 다르다 — gpt-oss 가 60제 중 3제에서
//   추론에 1만 자를 쓰고 finish_reason=length 로 끊겨 content 가 0자였다.
//   그걸 「틀림」으로 세면 모델을 억울하게 깎고, 검토 기능에서는 «없는 불일치»를 만든다.
const 최대 = +값('--max', 8000);         // 답까지 적을 만큼 넉넉히
const 자리 = 값('--scene', '');        // '3' 이면 SCENE 3(실전)만 — 쉬운 문제로 부풀린 점수를 걷어낸다
// ⚠ 손잡이 값(--gap 12 의 12)을 모델 이름으로 세면 안 된다 — 예전엔 --n 값만 걸러서
//   --gap 을 붙이는 순간 12 라는 «모델»을 시험하려 들었다. 손잡이 «뒤»를 통째로 뺀다.
const 인자 = process.argv.slice(2);
const 모델들 = 인자.filter((a, i) => !a.startsWith(String.fromCharCode(45, 45))
  && !(i > 0 && 인자[i - 1].startsWith(String.fromCharCode(45, 45))));

// 🔵 «어디로 보내는가»를 모델 이름 앞에 붙여 고른다 — groq:… · cerebras:… · 그 밖은 OpenRouter.
//   사용자가 실제로 물은 후보(gpt-oss-120b)는 OpenRouter 무료 목록에 없다. Groq·Cerebras 가 준다.
//   ⚠ 그래서 열쇠를 «미리» 읽지 않는다 — 쓰지도 않을 곳의 열쇠가 없다고 멈추면 안 된다.
const 곳들 = {
  groq:      { 이름: 'Groq',       url: 'https://api.groq.com/openai/v1', 파일: 'groq',      환경: 'GROQ_KEY' },
  cerebras:  { 이름: 'Cerebras',   url: 'https://api.cerebras.ai/v1',     파일: 'cerebras',  환경: 'CEREBRAS_KEY' },
  openrouter:{ 이름: 'OpenRouter', url: BASE,                             파일: 'openrouter',환경: 'OPENROUTER_KEY' },
};
const 열쇠통 = {};
function 열쇠(곳) {
  if (열쇠통[곳]) return 열쇠통[곳];
  const c = 곳들[곳];
  const v = process.env[c.환경] && process.env[c.환경].trim();
  if (v) return (열쇠통[곳] = v);
  // ⚠ 탐색기에서 «확장자 없는» 파일을 만들기가 번거롭다 — .txt 도 받는다.
  //   그리고 파일에 열쇠만 있으리라 믿지 않는다: 빈 줄·메모(#)를 걸러 첫 줄만 쓴다.
  for (const 이름 of [c.파일, c.파일 + '.txt']) {
    const p = path.join(ROOT, '.keys', 이름);
    if (!fs.existsSync(p)) continue;
    const 줄 = fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/)
      .map((t) => t.trim()).filter((t) => t && !t.startsWith('#'));
    if (줄.length) return (열쇠통[곳] = 줄[0]);
  }
  const p = path.join(ROOT, '.keys', c.파일);
  console.error('\n🔴 ' + c.이름 + ' 열쇠가 없습니다. 둘 중 하나로 두세요:');
  console.error('   ① ' + p + '   (파일에 키만 한 줄)');
  console.error('   ② 환경변수 ' + c.환경 + '\n');
  process.exit(1);
}
function 갈래(model) {
  const i = model.indexOf(':');
  const 앞 = i > 0 ? model.slice(0, i) : '';
  if (곳들[앞] && 앞 !== 'openrouter') return { 곳: 곳들[앞], id: model.slice(i + 1) };
  return { 곳: 곳들.openrouter, id: model };
}


if (process.argv.includes('--list')) {
  const r = await fetch(BASE + '/models', { headers: { connection: 'close' } });
  const j = await r.json();
  const 무료 = j.data.filter((m) => m.id.endsWith(':free'));
  console.log('\n  무료 모델 ' + 무료.length + '개 —');
  for (const m of 무료) console.log('    ' + m.id);
  console.log('');
  await new Promise((끝) => setTimeout(끝, 50));
  process.exit(0);
}
if (!모델들.length) { console.error('쓰는 법: node tools/review-bench.mjs <모델id…> [--n 40] | --list'); process.exit(1); }

/* ── 시험지를 만든다 (모델마다 «같은» 것) ────────────────────────────── */
const 정답꼴 = (a) => {
  const s = String(a == null ? '' : a).trim();
  if (/^[①②③④⑤]$/.test(s)) return { kind: '객관식', v: s };
  const m = s.replace(/\$/g, '').replace(/\s/g, '');
  if (/^-?\d{1,4}$/.test(m)) return { kind: '자연수', v: String(+m) };
  return null;
};
// 🔴 «번호»가 아니라 «그 값»을 적은 것도 맞은 것이다 — K2-02-E-0107 은 ①이 $-10$ 인데
//   모델이 「-10」이라 썼고, 나는 틀렸다고 셌다. K2-03-E-0288(② = $9$)도 같다.
//   이걸 그냥 두면 검토 기능에서 「두 AI가 답이 다릅니다」가 거짓으로 뜬다 — 60제에 2건이면 3%다.
// ⚠ 보기를 «본문에서» 읽어야 한다. 창고에 보기가 따로 없기 때문이다.
const 동그라미 = ['①', '②', '③', '④', '⑤'];
function 보기들(글) {
  const s = String(글 || '');
  const 자리 = 동그라미.map((d) => s.lastIndexOf(d));
  if (자리.some((i) => i < 0)) return null;
  for (let i = 1; i < 5; i++) if (자리[i] < 자리[i - 1]) return null;   // 순서가 어긋나면 보기가 아니다
  const 끝 = 자리.concat([s.length]);
  return 동그라미.map((d, i) => 값꼴(s.slice(끝[i] + d.length, 끝[i + 1])));
}
// ⚠ 분수를 한 덩이로 봐야 한다 — ② 가 \\frac{16}{3} 인데 「16」만 집어내면
//   맞은 답이 틀린 답이 된다(K2-03-E-0271 이 그랬다).
function 값꼴(t) {
  return String(t)
    .replace(/\\d?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, '$1/$2')
    .replace(/\\left|\\right/g, '')
    .replace(/[$\s{}]/g, '')
    .replace(/^\(|\)$/g, '');
}

function 맞나(낸답, 정답, 갈래, 본문) {
  if (!낸답) return false;
  if (낸답 === 정답) return true;
  if (갈래 !== '객관식') return false;
  const n = String(낸답).match(/^([1-5])$/);
  if (n) return 동그라미[+n[1] - 1] === 정답;
  const 보기 = 보기들(본문);
  if (!보기) return false;
  const i = 동그라미.indexOf(정답);
  return i >= 0 && 보기[i] !== '' && 보기[i] === 값꼴(낸답);
}

/* ⚠ 창고를 한 번만 읽고 옆에 재워 둔다 — Firestore 읽기 한도를 아낀다(하루 5만 건). */
const 재운곳 = path.join(ROOT, '.keys', 'items-cache.json');
let items = fs.existsSync(재운곳) ? JSON.parse(fs.readFileSync(재운곳, 'utf8')) : null;
if (!items) {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const apiKey = (html.match(/apiKey:\s*"([^"]+)"/) || [])[1];
  const projectId = (html.match(/projectId:\s*"([^"]+)"/) || [])[1];
  const FS = 'https://firestore.googleapis.com/v1/projects/' + projectId + '/databases/(default)/documents';
  const a0 = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=' + apiKey,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ returnSecureToken: true }) });
  const FH = { Authorization: 'Bearer ' + (await a0.json()).idToken };
  items = {};
  for (let pt = ''; ;) {
    const r = await fetch(FS + '/items?pageSize=300' + (pt ? '&pageToken=' + pt : ''), { headers: FH });
    const j = await r.json();
    for (const d of (j.documents || [])) { const id = d.name.split('/').pop(); try { items[id] = JSON.parse(d.fields?.value?.stringValue || '{}'); } catch (e) { } }
    if (!j.nextPageToken) break; pt = j.nextPageToken;
  }
  fs.mkdirSync(path.dirname(재운곳), { recursive: true });
  fs.writeFileSync(재운곳, JSON.stringify(items));
}
// 🔵 «쉬운 문제가 점수를 부풀린다» — 사용자가 짚은 대로다.
//   SCENE 1(기본유형)·2(발전유형)가 섞인 60제에서 96.7% 가 나와도,
//   정작 검토가 어려운 것은 SCENE 3(실전 — 다른 눈이 필요하다)이다.
// ⚠ SCENE 은 창고(items)가 아니라 장부(codes/K2-E.json)에 있다 — 거기서 끌어온다.
let 자리표 = null;
if (자리) {
  const 장부 = JSON.parse(fs.readFileSync(path.join(ROOT, 'codes', 'K2-E.json'), 'utf8'));
  const 목 = Array.isArray(장부) ? 장부 : Object.values(장부).find(Array.isArray);
  자리표 = new Set(목.filter((x) => String(x.scene || '').includes(자리)).map((x) => x.code));
  if (!자리표.size) { console.error('🔴 SCENE ' + 자리 + ' 문항이 장부에 없습니다.'); process.exit(1); }
}
const 후보 = Object.values(items)
  .filter((x) => x.content && !x.image && !x.images && 정답꼴(x.answer))
  .filter((x) => !자리표 || 자리표.has(x.code))
  .sort((a, b) => (a.code < b.code ? -1 : 1));
/* 앞에서부터 자르면 01단원만 나온다 — 건너뛰며 뽑아 단원을 고루 섞는다. */
const 걸음 = Math.max(1, Math.floor(후보.length / N));
const 시험지 = [];
for (let i = 0; i < 후보.length && 시험지.length < N; i += 걸음) 시험지.push(후보[i]);
const 단원 = {}; for (const x of 시험지) { const c = (x.code.match(/-(\d{2})-/) || [])[1]; 단원[c] = (단원[c] || 0) + 1; }
console.log('\n  시험지 ' + 시험지.length + '제' + (자리 ? ' · SCENE ' + 자리 + '만' : '') + ' (창고 ' + 후보.length + '제에서 골고루) · 단원별 ' + JSON.stringify(단원));
console.log('  객관식 ' + 시험지.filter((x) => 정답꼴(x.answer).kind === '객관식').length
  + ' · 자연수 ' + 시험지.filter((x) => 정답꼴(x.answer).kind === '자연수').length);

/* ── 한 문제를 풀린다 ─────────────────────────────────────────────── */
const 지시 = [
  '너는 고등학교 수학 문제를 푸는 사람이다. 아래 문제를 직접 풀어라.',
  '풀이를 간단히 적은 뒤, 마지막 줄에 반드시 다음 꼴로만 답을 적어라:',
  '정답: <답>',
  '객관식(①~⑤)이면 기호 하나만, 아니면 숫자만 적어라. 다른 말을 덧붙이지 마라.',
].join('\n');
const 답뽑기 = (글) => {
  const 줄 = String(글 || '').split('\n').map((s) => s.trim()).filter(Boolean);
  for (let i = 줄.length - 1; i >= 0; i--) {
    const m = 줄[i].match(/정답\s*[:：]\s*(.+)$/);
    if (!m) continue;
    const s = m[1].replace(/[*`$\s]/g, '');
    const c = s.match(/[①②③④⑤]/); if (c) return c[0];
    // ⚠ 「16/3」에서 16 만 떼면 안 된다 — 통째로 넘기고, 견줄 때 값으로 맞춘다.
    if (/^-?\d{1,4}$/.test(s)) return String(+s);
    return 값꼴(s).slice(0, 24);
    return s.slice(0, 12);
  }
  return '';
};
const 키이름 = (c) => Object.keys(곳들).find((k) => 곳들[k] === c);
const 쉼 = (ms) => new Promise((끝) => setTimeout(끝, ms));

// 🔴 429 는 «틀렸다»가 아니라 «못 쟀다» 다 — 그런데 못 잰 것이 쌓이면 점수가 뜻을 잃는다.
//   qwen3.8-27b 이 15제 중 11제를 튕겨 「100%」가 나왔지만 실제로 잰 것은 4제였다. 그건 점수가 아니다.
// ⚠ 원인이 초당 «횟수»가 아니라 분당 «토큰»(8K TPM)이면 간격을 늘려도 결국 넘긴다 —
//   한 건이 900토큰이면 분당 8건이 천장이고, 그건 우리가 고를 수 있는 값이 아니다.
//   그래서 «상대가 알려 주는 만큼» 기다렸다가 다시 묻는다. 안 알려 주면 20초.
function 얼마나쉬랬나(r, t) {
  const h = Number(r.headers.get('retry-after') || 0);
  if (h > 0) return Math.min(h, 90) * 1000;
  const m = String(t).match(/try again in ([0-9.]+)\s*s/i);
  if (m) return Math.min(Number(m[1]) + 0.5, 90) * 1000;
  return 20000;
}
async function 한번(g, 문항) {
  const t0 = Date.now();
  let r;
  try {
    r = await fetch(g.곳.url + '/chat/completions', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + 열쇠(키이름(g.곳)), 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: g.id, max_tokens: 최대,
        messages: [{ role: 'system', content: 지시 }, { role: 'user', content: 문항.content }] }),
    });
  } catch (e) { return { 흠: String(e.message || e).slice(0, 110), 초: (Date.now() - t0) / 1000 }; }
  const 초 = (Date.now() - t0) / 1000;
  const t = await r.text();
  if (r.status === 429 || r.status >= 500) {
    return { 흠: 'http ' + r.status + ' ' + t.replace(/\s+/g, ' ').slice(0, 90), 초, 기다림: 얼마나쉬랬나(r, t) };
  }
  if (!r.ok) return { 흠: 'http ' + r.status + ' ' + t.replace(/\s+/g, ' ').slice(0, 110), 초 };
  let j; try { j = JSON.parse(t); } catch (e) { return { 흠: '응답을 못 읽음', 초 }; }
  if (j.error) return { 흠: String(j.error.message || j.error).slice(0, 110), 초 };
  const ch = j.choices?.[0] || {};
  const 글 = ch.message?.content || '';
  const 답 = 답뽑기(글);
  // ⚠ 답이 없는데 finish_reason 이 length 면 «못 푼 것»이 아니라 «못 적은 것»이다.
  if (!답 && ch.finish_reason === 'length') return { 흠: '답을 적기 전에 잘림(max ' + 최대 + ')', 초, 끝난꼴: ch.finish_reason };
  return { 답, 토큰: j.usage?.total_tokens || 0, 초, 끝난꼴: ch.finish_reason };
}
async function 풀리기(model, 문항) {
  const g = 갈래(model);
  let 쉰초 = 0;
  for (let 판 = 0; ; 판++) {
    const r = await 한번(g, 문항);
    r.쉰초 = 쉰초;
    if (!r.기다림 || 판 >= 재시도) return r;
    process.stdout.write('  (한도 — ' + Math.round(r.기다림 / 1000) + '초 쉬고 다시)   ');
    await 쉼(r.기다림);
    쉰초 += r.기다림 / 1000;
  }
}

const 기록 = path.join(ROOT, '.bench', new Date().toISOString().slice(0, 10) + '.jsonl');
fs.mkdirSync(path.dirname(기록), { recursive: true });

/* ── 돌린다 ───────────────────────────────────────────────────────── */
const 결과 = [];
for (const model of 모델들) {
  console.log('\n── ' + model);
  let 맞음 = 0, 틀림 = 0, 흠 = 0, 토큰 = 0, 시간 = 0;
  const 틀린것 = [];
  for (let i = 0; i < 시험지.length; i++) {
    const x = 시험지[i];
    const 꼴 = 정답꼴(x.answer);
    const 정답 = 꼴.v;
    const r = await 풀리기(model, x);
    시간 += r.초; 토큰 += r.토큰 || 0;
    if (r.흠) { 흠++; if (흠 <= 2) console.log('\n   ⚠ ' + x.code + ' — ' + r.흠); }
    else if (맞나(r.답, 정답, 꼴.kind, x.content)) 맞음++;
    else { 틀림++; 틀린것.push(x.code + ' (정답 ' + 정답 + ' · 낸 답 ' + (r.답 || '못 읽음') + ')'); }
    // ⚠ 낸 답을 남겨 둔다 — 채점을 고쳤을 때 «다시 물어보지 않고» 다시 셀 수 있어야 한다.
    //   OpenRouter 무료는 하루 50번뿐이라, 채점 버그 하나에 하루치를 태울 수는 없다.
    fs.appendFileSync(기록, JSON.stringify({ 때: new Date().toISOString(), model, code: x.code,
      갈래: 꼴.kind, 정답, 낸답: r.답 || null, 흠: r.흠 || null, 끝난꼴: r.끝난꼴 || null }) + '\n');
    process.stdout.write('\r   ' + (i + 1) + '/' + 시험지.length + ' — 맞음 ' + 맞음 + ' · 틀림 ' + 틀림 + ' · 흠 ' + 흠 + '   ');
    await 쉼(간격);
  }
  const 잰것 = 맞음 + 틀림;
  const 율 = 잰것 ? Math.round((맞음 / 잰것) * 1000) / 10 : 0;
  console.log('\r   맞음 ' + 맞음 + ' · 틀림 ' + 틀림 + ' · 못 잼 ' + 흠 + '  →  일치율 ' + 율 + '%'
    + (잰것 ? ' · 한 건에 평균 ' + Math.round(토큰 / 잰것) + '토큰 · ' + (시간 / 시험지.length).toFixed(1) + '초' : ''));
  for (const t of 틀린것.slice(0, 5)) console.log('     틀린 것: ' + t);
  결과.push({ model, 맞음, 틀림, 흠, 율, 토큰: 잰것 ? Math.round(토큰 / 잰것) : 0 });
}

console.log('\n\n  ══ 견줌 ══');
for (const r of 결과.sort((a, b) => b.율 - a.율))
  console.log('   ' + String(r.율).padStart(5) + '%  ' + r.model.padEnd(46) + ' (맞음 ' + r.맞음 + '/' + (r.맞음 + r.틀림) + ' · 못 잼 ' + r.흠 + ' · 평균 ' + r.토큰 + '토큰)');
console.log('\n  🔵 찍어서 맞을 확률은 객관식 20% 다 — 그보다 한참 높아야 «푼 것»이다.');
console.log('  🔴 낮게 나와도 못 쓰는 것은 아니다. 「불일치 → 사람에게」 구조라');
console.log('     검토자가 틀리면 «일이 덜 줄 뿐» 문항이 상하지는 않는다.\n');
