// 교재 hwpx + 빠른정답표 → Firestore `items` 로 «판정을 거쳐» 올린다 (2026-09-04 · 09-09에 문을 세웠다)
//
//   node tools/items-push.mjs                ← 재보기만 한다(아무것도 안 쓴다)
//   node tools/items-push.mjs --push         ← 판정대로 올린다
//   node tools/items-push.mjs --push --only-new
//        ← 🔵 「추가된 문제만 창고에 받아들인다」 — «고쳤다»는 손대지 않는다
//   node tools/items-push.mjs <파일.hwpx> …  ← 고른 파일만
//
// ── 🔴 2026-09-09에 여기에 «문»을 세웠다 ────────────────────────────────
// 여태 이 도구는 **564건을 매번 통째로 덮어썼다.** 「본문이 바뀌는 것 n개」를 세어서
// 찍기만 하고 그대로 다 올렸다. 사용자가 말한 세 가지가 전부 이 자리였다:
//   「기존 문제랑 중복해서 올려지지 않고」 → ②(그대로)는 이제 **쓰지 않는다**
//   「수정된 문제 비교 가능」             → ③은 **달라진 자리를 보여 주고** 올린다
//   「추가된 문제만 받아들일 수 있도록」    → `--only-new`
// 판정 규칙은 여기 없다 — 루트 `hwpx.js` 하나뿐이고 웹도 같은 것을 부른다.
// 갈래와 까닭 → docs/코드-숨기기.md **0-B** · 잠금 → **0-C** · 문이 셋인 것 → **0-E**
//
// 🔴 **덮어쓰지 않고 «합친다».** `items` 문서 하나에 본문·정답·그림이 같이 산다.
//    `dbSetDoc` 은 문서를 통째로 갈아 끼운다 — 빠뜨린 필드는 지워진다. 그래서 «얹는다».
// ⚠ **그림은 여기서 못 만든다** — 드라이브 업로드는 브라우저의 일이다.
//    이미 올라가 있는 그림은 **그대로 지킨다.**

import fs from 'fs';
import path from 'path';
import { loadHwpxRules } from './hwpx-node.mjs';
import { 창고읽기, 창고읽기_손에있는것, 교재읽기, 달라진자리, 교재폴더 } from './store-diff.mjs';

const argv = process.argv.slice(2);
/* 🔵 `--local` — 창고 대신 «손에 있는 본문»(*-bodies.json)으로 판정만 미리 본다.
   ⚠ **이때는 절대 안 올린다.** 그 본문은 마지막으로 내려받은 사본이라 낡았을 수 있고,
     낡은 것을 기준으로 쓰면 창고를 뒤로 되돌리게 된다. */
const 손것 = argv.includes('--local');
const 쓸까 = argv.includes('--push') && !손것;
const 새것만 = argv.includes('--only-new');
const 준파일 = argv.filter((a) => !a.startsWith('--'));
const 정답파일 = path.join(교재폴더, 'answer-key.json');

const 파일들 = 준파일.length
  ? 준파일
  : fs.readdirSync(교재폴더).filter((x) => x.endsWith('.hwpx')).sort().map((x) => path.join(교재폴더, x));
if (!파일들.length) { console.error('읽을 hwpx 가 없습니다.'); process.exit(2); }

const rules = loadHwpxRules();

/* ── ① 창고를 «먼저» 읽는다 ────────────────────────────────────────────
   🔴 읽지 않고 쓰면 그림이 날아간다. 564건을 읽는 값을 치르더라도 이건 읽어야 한다.
   🔵 그리고 그 읽은 값이 곧 «대조 상대»다 — 판정에 드는 값이 0인 까닭이다. */
const { 창고, BASE, H } = 손것 ? 창고읽기_손에있는것() : await 창고읽기();
if (손것) console.log('\n  ⓘ --local — 창고 대신 «손에 있는 본문»과 맞댑니다. 미리 보기이고 아무것도 안 올립니다.');
if (손것 && argv.includes('--push')) console.log('  ⚠ --local 과 --push 를 같이 주셨습니다 — 안 올립니다.');

/* ── ② 교재에서 문항을 뽑는다 (웹과 같은 파서 · 미주로 가른다) ────────── */
const { 문항, 파일별 } = 교재읽기(파일들, rules);

/* ── ③ 정답표 ────────────────────────────────────────────────────── */
const 정답 = {};
if (fs.existsSync(정답파일)) {
  for (const r of JSON.parse(fs.readFileSync(정답파일, 'utf8')).items || []) {
    if (r.code && r.answer) 정답[r.code] = r.answer;
  }
} else console.log('  ⚠ answer-key.json 이 없습니다 — 정답은 건드리지 않습니다.');

/* ── ④ 가른다 ────────────────────────────────────────────────────── */
const v = rules.hwpItemVerdicts(문항, 창고);
/* 🔴 **이 도구는 파일에 코드를 못 심는다** — 심는 것은 `item-code-stamp.mjs` 다.
   그래서 코드 없는 문항(⑤⑥)은 여기서도 «막는 것»이다. 창고에만 코드를 만들어 넣으면
   파일은 여전히 코드가 없고, 내년에 그 문항이 또 새 코드를 받는다(웹과 같은 까닭). */
const 막힘 = rules.hwpVerdictBlockers(v, { 심을수있나: false });

console.log('\n읽은 교재');
for (const f of 파일별)
  console.log('  ' + f.파일.replace(/^.*\]/, '').padEnd(24) + String(f.코드있음).padStart(4) + '제'
    + (f.코드없음 ? '  🔴 코드 없는 것 ' + f.코드없음 : '')
    + (f.앞장 ? '  ⓘ 미주 없는 앞장 ' + f.앞장 + '개는 뺐습니다' : ''));
console.log('  창고에 있는 것            ' + Object.keys(창고).length + '제');

console.log('\n판정 (docs/코드-숨기기.md 0-B)');
console.log('  🔵 ② 그대로       ' + String(v.그대로.length).padStart(4) + '  — 올리지 않습니다');
console.log('  ⚠  ③ 고쳤다       ' + String(v.고쳤다.length).padStart(4) + (새것만 ? '  — 🔵 --only-new 라 손대지 않습니다' : ''));
console.log('  🔵 ⑤ 코드를 잃음   ' + String(v.코드잃음.length).padStart(4));
console.log('  🔵 ⑥ 새 문항      ' + String(v.새문항.length).padStart(4));
console.log('  🔴 ① 복사됨       ' + String(v.복사됨.length).padStart(4) + '무리');
console.log('  🔴 ④ 모르는 코드   ' + String(v.모르는코드.length).padStart(4));
console.log('  ⚠  ⑦ 겹친 문항    ' + String(v.겹침.length).padStart(4) + '무리'
  + (v.겹침.length ? '  ' + v.겹침.map((c) => c.join(' = ')).join(' · ') : ''));
console.log('  ⓘ  ⑧ 파일에 없음   ' + String(v.빠졌다.length).padStart(4) + '  — 🔵 지우지 않습니다');

if (v.고쳤다.length) {
  console.log('\n③ 고쳤다 — 달라진 자리');
  for (const x of v.고쳤다.slice(0, 12)) {
    const d = 달라진자리(x.옛글, x.새글);
    console.log('  ' + x.code);
    console.log('    옛  …' + d.앞 + '「' + d.옛 + '」');
    console.log('    새  …' + d.앞 + '「' + d.새 + '」');
  }
  if (v.고쳤다.length > 12) console.log('  … 외 ' + (v.고쳤다.length - 12) + '개');
}

/* ── ⑤ 🔴 사람이 답해야 할 것이 남아 있으면 아무것도 안 올린다 (0-C) ──── */
if (막힘.length) {
  console.log('\n🔴 멈춥니다 — 사람이 답해야 할 것이 남았습니다 (docs/코드-숨기기.md 0-C)');
  for (const m of 막힘) console.log('  · ' + m.갈래 + ' ' + m.n + '건 — ' + m.말);
  if (v.복사됨.length) console.log('    복사된 코드: ' + v.복사됨.map((x) => x.code).slice(0, 8).join(', '));
  if (v.모르는코드.length) console.log('    모르는 코드: ' + v.모르는코드.map((x) => x.code).slice(0, 8).join(', '));
  if (v.코드잃음.length || v.새문항.length)
    console.log('    ▶ 코드를 먼저 심으세요:  node tools/item-code.mjs <파일.hwpx> --subject … --book … --chapter … --out codes/K2-E.json\n'
              + '                            node tools/item-code-stamp.mjs <파일.hwpx> codes/K2-E.json --chapter … --out <새파일.hwpx>');
  console.log('');
  process.exit(1);
}

/* ── ⑥ 올릴 것을 고른다 ──────────────────────────────────────────────
   🔵 **②(그대로)는 여기 안 들어온다** — 그것이 「중복해서 올려지지 않고」다.
   ⚠ 다만 **정답이 이번에 새로 왔으면 «그대로»여도 쓴다** — 본문은 같아도 담을 것이 는다.
     (웹의 `icNeedsWrite()` 와 같은 판단이다. 갈리면 안 된다.) */
const p2 = (n) => String(n).padStart(2, '0');
const d0 = new Date();
const stamp = `${d0.getFullYear()}-${p2(d0.getMonth() + 1)}-${p2(d0.getDate())} ${p2(d0.getHours())}:${p2(d0.getMinutes())}`;

function 얹는다(code, content) {
  const 옛 = 창고[code] || {};
  /* 🔴 **있던 문서 «위에» 얹는다 — 새로 만들지 않는다** (2026-09-04에 여기서 당했다).
     예전에는 {code, content, updatedAt} 으로 새 문서를 짓고 image 만 골라 옮겼는데,
     그 사이에 images(선지 그림 여럿)가 생겨서 **17장이 통째로 날아갔다.**
     🔵 «골라 옮기기»는 새 칸이 생길 때마다 조용히 잃는다. «얹기»는 안 그렇다. */
  const doc = Object.assign({}, 옛, { code, content, updatedAt: stamp });
  const a = 정답[code] || 옛.answer || '';
  if (a) doc.answer = a;
  return doc;
}

const 쓸것 = [];
let 정답만 = 0;
if (!새것만) for (const x of v.고쳤다) 쓸것.push(얹는다(x.code, x.새글));
for (const x of v.그대로) {
  const 새정답 = 정답[x.code];
  if (새정답 && 새정답 !== (창고[x.code] || {}).answer) { 쓸것.push(얹는다(x.code, x.문항.content)); 정답만++; }
}

console.log('\n올릴 것              ' + 쓸것.length + '개'
  + (새것만 ? '   (--only-new — 고친 것은 뺐습니다)' : '')
  + (정답만 ? '\n  그중 정답만 새로 온 것 ' + 정답만 : ''));
const 그림지킴 = 쓸것.filter((d) => d.image || d.images).length;
if (그림지킴) console.log('  🔵 그림을 지켜 옮김 ' + 그림지킴);

/* ── ⑦ 🔴 올리기 전에 스스로 막는다 ──────────────────────────────────
   ⚠ **«올릴 것»이 아니라 «읽은 것»을 센다** (2026-09-09에 고쳤다).
     예전에는 「올릴 것이 500개 미만이면 멈춤」이었다. 그때는 늘 564개를 통째로 올렸으니
     그 수가 곧 «제대로 읽었나»였다. 이제는 **아무것도 안 바뀌면 올릴 것이 0개인 것이 정상**이라
     그 잣대를 그대로 두면 «다 잘된 날»마다 멈춘다. 지키려던 것(파서가 통째로 헛읽는 것)은
     **읽은 문항 수**로 재야 맞다. */
const 막이 = [];
if (!준파일.length && 문항.length < 500)
  막이.push('교재에서 읽은 문항이 ' + 문항.length + '제뿐입니다 (564 언저리여야 합니다) — 파서가 헛읽었을 수 있습니다');
if (쓸것.some((x) => !x.content || !x.content.trim())) 막이.push('본문이 빈 문서가 있습니다');
if (Object.keys(창고).length === 0) 막이.push('창고가 비어 보입니다 — 못 읽은 것일 수 있습니다');
if (막이.length) { console.log('\n🔴 멈춥니다 —\n  ' + 막이.join('\n  ') + '\n'); process.exit(1); }

if (!쓸것.length) { console.log('\n  ✅ 창고가 교재와 같습니다. 올릴 것이 없습니다.\n'); process.exit(0); }
if (!쓸까) { console.log('\n  ⓘ 재보기만 했습니다. 실제로 올리려면 --push 를 붙이세요.\n'); process.exit(0); }

/* ── ⑧ 올린다 ────────────────────────────────────────────────────── */
async function putDoc(collection, id, data) {
  const r = await fetch(BASE + '/' + collection + '/' + encodeURIComponent(id), {
    method: 'PATCH', headers: { ...H, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { value: { stringValue: JSON.stringify(data) } } }),
  });
  return r.ok ? null : r.status;
}
let 됨 = 0, 막 = 0;
for (let i = 0; i < 쓸것.length; i++) {
  const bad = await putDoc('items', 쓸것[i].code, 쓸것[i]);
  if (bad === null) 됨++;
  else { 막++; if (막 <= 3) console.log('  🔴 ' + 쓸것[i].code + ' — http ' + bad); if (bad === 403) break; }
  if (i % 25 === 0) process.stdout.write('\r  올리는 중… ' + (i + 1) + ' / ' + 쓸것.length);
}
process.stdout.write('\r' + ' '.repeat(40) + '\r');
/* 🔴 창고를 바꿨으면 «바뀌었다»고 적어 둔다 — 브라우저들이 이 값 하나를 보고 다시 읽는다. */
if (됨) {
  const bad = await putDoc('kv', 'itemsVer', String(Date.now()));
  console.log(bad === null ? '  버전 표시를 올렸습니다 — 브라우저가 다음에 열 때 새로 읽습니다.'
                           : '  ⚠ 버전 표시를 못 올렸습니다 (http ' + bad + ') — 최대 12시간 뒤에 맞습니다.');
}
console.log('\n  올렸습니다   ' + 됨 + '개' + (막 ? ' · 막힌 것 ' + 막 : '') + '\n');
process.exit(막 ? 1 : 0);
