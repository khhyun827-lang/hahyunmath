// 교재 hwpx 를 «창고와 맞대» 여덟 갈래로 가른다 (2026-09-09)
//
//   node tools/store-diff.mjs                          ← 「교재 코드파일」 폴더를 통째로
//   node tools/store-diff.mjs <파일.hwpx> [<파일2>…]   ← 고른 파일만
//   node tools/store-diff.mjs … --json                 ← 다른 도구가 읽을 꼴로
//
// 🔴 **판정 규칙은 여기 없다.** 루트 `hwpx.js` 의 `hwpItemVerdicts()` 하나뿐이고,
//    웹(「교재에서 본문 채우기」)도 같은 함수를 부른다. 두 벌로 두면 «도구로는 막혔는데
//    웹으로는 들어간» 문항이 생긴다 — 창고에 쓰는 문이 셋이다 (docs/코드-숨기기.md 0-E).
//
// 🔵 **이 도구는 아무것도 안 쓴다.** 읽고 가르고 보여 줄 뿐이다.
//    쓰는 것은 `items-push.mjs` 고, 그 도구가 여기 판정을 앞에 세운다.
//
// 갈래와 까닭 → docs/코드-숨기기.md **0-B** · 잠금 하나 → **0-C**

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadHwpxRules, problemsFromHwpx } from './hwpx-node.mjs';
/* 🔴 붙는 길은 한 곳뿐이다 — 09-08에 익명이 막힌 뒤로 도구는 강사로 로그인한다. */
import { 강사로로그인 } from './fb-login.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(HERE, '..');
export const 교재폴더 = path.join(ROOT, '교재 코드파일');

/* ── 창고를 통째로 읽는다 ────────────────────────────────────────────────
   🔴 **어차피 읽어야 하는 값이다.** `items-push.mjs` 는 그림을 지키려고 이미 창고를
     통째로 읽고 시작한다 — 대조는 «이미 읽은 것을 한 번 더 보는» 일이라 값이 0이다.
   ⚠ 읽기 한도는 하루 5만 건이다. 564건이면 한 번에 1% 남짓이다. */
export async function 창고읽기() {
  const { BASE, H } = await 강사로로그인();

  const 창고 = {};
  let pt = '';
  do {
    const r = await fetch(BASE + '/items?pageSize=300' + (pt ? '&pageToken=' + pt : ''), { headers: H });
    if (r.status === 404) break;
    if (!r.ok) throw new Error('items 읽기 실패 http ' + r.status);
    const j = await r.json();
    for (const d of (j.documents || [])) {
      const v = JSON.parse(d.fields.value.stringValue);
      if (v && v.code) 창고[v.code] = v;
    }
    pt = j.nextPageToken || '';
  } while (pt);
  /* 🔴 **«비었다»와 «못 읽었다»를 가른다** — 09-04에 이 둘을 못 갈라서 기록을 지웠다.
     창고가 진짜 빈 것은 첫 업로드뿐이고, 그때는 부르는 쪽이 알고 있다.
     🔵 못 읽는 경우는 여기 안 온다 — `fb-login.mjs` 가 먼저 멈춘다. */
  return { 창고, BASE, H, 빔: Object.keys(창고).length === 0 };
}

/* ── 창고 대신 «손에 있는 본문»으로 맞대 본다 (`--local`) ────────────────
   🔵 왜 두는가 — 셋이다.
     ① Firestore 를 안 건드리고 판정을 미리 볼 수 있다 (읽기 한도를 안 쓴다)
     ② 강사 열쇠(`.keys/firebase.json`)가 없어도 «무엇이 나올지»를 본다
     ③ 검사가 진짜 교재로 돌 수 있다 — 검사는 네트워크에 기대면 안 된다
   🔴 **이것으로 «올리지»는 못한다.** 여기 본문은 마지막으로 내려받은 사본이라,
     그 뒤에 창고가 바뀌었으면 낡았다. 판정을 «미리 보는» 자리일 뿐이다. */
export function 창고읽기_손에있는것(폴더 = 교재폴더) {
  const 창고 = {};
  if (!fs.existsSync(폴더)) return { 창고, 빔: true };
  for (const f of fs.readdirSync(폴더).filter((x) => x.endsWith('-bodies.json'))) {
    const j = JSON.parse(fs.readFileSync(path.join(폴더, f), 'utf8'));
    for (const it of (j.items || j)) if (it && it.code && it.content) 창고[it.code] = it;
  }
  return { 창고, 빔: Object.keys(창고).length === 0 };
}

/* ── 교재에서 «코드와 본문»을 뽑는다 ─────────────────────────────────────
   🔴 **코드 없는 문항도 빼지 않는다.** 여태 도구도 웹(`icClassify`)도 `p.itemCode` 가
     있는 것만 골라 썼는데, 그러면 «내년에 새로 넣은 문항»이 **말없이 사라진다** —
     판정 ⑤⑥이 통째로 못 도는 것이다 (docs/코드-숨기기.md 0-E).

   🔴 **그러면 «무엇이 문항인가»를 코드 말고 무엇으로 가르나 — 미주다.**
     ⚠ 코드로 가르면 «코드 없는 새 문항»을 못 본다. 아무것으로도 안 가르면
       **목차와 표지가 문항으로 들어온다**(실제로 그렇게 나왔다).
     ✅ 잰 값 (564제 · 2026-09-09):
          코드 있고 미주 있음  564      ← 문항
          코드 없고 미주 없음    5      ← 목차 (파일마다 하나씩)
          코드 없고 미주 있음    0  ·  코드 있고 미주 없음  0
       **두 갈래로 깨끗하게 갈린다.** 그리고 이것은 `item-code.mjs` 가 처음부터 쓰던
       전제와 같다 — 「미주는 문항의 앞에 온다. 미주 n 부터 미주 n+1 직전까지가 문항 n」.
     🔵 그래서 **미주가 붙은 덩어리만 문항으로 센다.** 코드는 그다음 문제다. */
export function 교재읽기(파일들, rules = loadHwpxRules()) {
  const 문항 = [], 파일별 = [];
  for (const f of 파일들) {
    const { problems } = problemsFromHwpx(f, rules);
    let 코드있음 = 0, 코드없음 = 0, 앞장 = 0;
    for (const p of problems) {
      if (!p.content || !p.content.trim()) continue;
      const 미주 = !!((p.answer && String(p.answer).trim()) || (p.solution && String(p.solution).trim()));
      if (!미주) { 앞장++; continue; }                       // 목차·표지 — 문항이 아니다
      문항.push({ code: p.itemCode || '', content: p.content, 파일: path.basename(f), answer: p.answer || '' });
      if (p.itemCode) 코드있음++; else 코드없음++;
    }
    파일별.push({ 파일: path.basename(f), 코드있음, 코드없음, 앞장 });
  }
  return { 문항, 파일별 };
}

/* ── 가른다 ─────────────────────────────────────────────────────────── */
export function 가른다(문항, 창고, rules = loadHwpxRules()) {
  const 판정 = rules.hwpItemVerdicts(문항, 창고);
  return { 판정, 막힘: rules.hwpVerdictBlockers(판정) };
}

/* 「…원 x²+y²=r²의 교점이」 처럼, **달라진 자리만** 잘라 보여 준다.
   🔵 본문이 최대 961자다 — 통째로 찍으면 사람이 뭐가 달라졌는지 못 찾는다. */
export function 달라진자리(옛, 새, 폭 = 34) {
  const a = String(옛 || ''), b = String(새 || '');
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  let j = 0;
  while (j < a.length - i && j < b.length - i && a[a.length - 1 - j] === b[b.length - 1 - j]) j++;
  const 앞 = a.slice(Math.max(0, i - 12), i).replace(/\s+/g, ' ');
  const 옛속 = a.slice(i, a.length - j).replace(/\s+/g, ' ');
  const 새속 = b.slice(i, b.length - j).replace(/\s+/g, ' ');
  const 자르 = (s) => (s.length > 폭 ? s.slice(0, 폭) + '…' : s);
  return { 앞: 자르(앞), 옛: 자르(옛속), 새: 자르(새속) };
}

/* ── 여기서부터는 CLI ──────────────────────────────────────────────── */
const 나를직접부름 = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (나를직접부름) {
  const argv = process.argv.slice(2);
  const JSON쓰기 = argv.includes('--json');
  const 준파일 = argv.filter((a) => !a.startsWith('--'));
  const 파일들 = 준파일.length
    ? 준파일
    : fs.readdirSync(교재폴더).filter((x) => x.endsWith('.hwpx')).sort().map((x) => path.join(교재폴더, x));
  if (!파일들.length) { console.error('읽을 hwpx 가 없습니다.'); process.exit(2); }

  const 손것 = argv.includes('--local');
  const rules = loadHwpxRules();
  const { 창고 } = 손것 ? 창고읽기_손에있는것() : await 창고읽기();
  if (손것) console.log('\n  ⓘ --local — 창고 대신 «손에 있는 본문»(*-bodies.json)과 맞댑니다. 미리 보기입니다.');
  const { 문항, 파일별 } = 교재읽기(파일들, rules);
  const { 판정: v, 막힘 } = 가른다(문항, 창고, rules);

  if (JSON쓰기) {
    console.log(JSON.stringify({ 파일별, 판정: v, 막힘 }, null, 2));
    process.exit(막힘.length ? 1 : 0);
  }

  console.log('\n읽은 교재');
  for (const f of 파일별)
    console.log('  ' + f.파일.replace(/^.*\]/, '').padEnd(24)
      + String(f.코드있음).padStart(4) + '제'
      + (f.코드없음 ? '  🔴 코드 없는 것 ' + f.코드없음 : '')
      + (f.앞장 ? '  ⓘ 미주 없는 앞장 ' + f.앞장 + '개는 뺐습니다' : ''));
  console.log('  창고에 있는 것            ' + Object.keys(창고).length + '제');

  console.log('\n판정 (docs/코드-숨기기.md 0-B)');
  console.log('  🔵 ② 그대로       ' + String(v.그대로.length).padStart(4) + '  — 올리지 않습니다');
  console.log('  ⚠  ③ 고쳤다       ' + String(v.고쳤다.length).padStart(4) + '  — 승인하면 갱신합니다');
  console.log('  🔵 ⑤ 코드를 잃음   ' + String(v.코드잃음.length).padStart(4) + '  — 창고 코드를 돌려줍니다'
    + (v.코드잃음.some((x) => x.갈림) ? '  🔴 그중 갈린 것 ' + v.코드잃음.filter((x) => x.갈림).length : ''));
  console.log('  🔵 ⑥ 새 문항      ' + String(v.새문항.length).padStart(4) + '  — 새 코드를 줍니다');
  console.log('  🔴 ① 복사됨       ' + String(v.복사됨.length).padStart(4) + '무리');
  console.log('  🔴 ④ 모르는 코드   ' + String(v.모르는코드.length).padStart(4));
  console.log('  ⚠  ⑦ 겹친 문항    ' + String(v.겹침.length).padStart(4) + '무리');
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
  if (v.코드잃음.length) {
    console.log('\n⑤ 코드를 잃은 문항 — 창고에서 되찾습니다');
    for (const x of v.코드잃음.slice(0, 12))
      console.log('  ' + (x.갈림 ? '🔴 갈림 ' + x.후보.join(' / ') : '→ ' + x.후보[0])
        + '   「' + x.문항.content.replace(/\s+/g, ' ').slice(0, 40) + '…」');
  }
  if (v.복사됨.length) {
    console.log('\n① 복사됨 — 🔴 사람이 골라야 합니다');
    for (const x of v.복사됨)
      console.log('  ' + x.code + (x.코드지움 ? '  (코드를 지운 사본이 같이 왔습니다)' : '  · ' + x.무리.length + '군데'));
  }
  if (v.모르는코드.length)
    console.log('\n④ 창고에 없는 코드 — ' + v.모르는코드.map((x) => x.code).slice(0, 10).join(', '));
  if (v.겹침.length)
    console.log('\n⑦ 코드는 다른데 본문이 같음 — ' + v.겹침.map((c) => c.join(' = ')).join(' · '));

  if (막힘.length) {
    console.log('\n🔴 이대로는 아무것도 안 올립니다 (docs/코드-숨기기.md 0-C) —');
    for (const m of 막힘) console.log('  · ' + m.갈래 + ' ' + m.n + '건 — ' + m.말);
    console.log('');
    process.exit(1);
  }
  console.log('\n  ✅ 막을 것이 없습니다. 올리려면  node tools/items-push.mjs --push\n');
}
