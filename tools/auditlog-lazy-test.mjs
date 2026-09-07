// 변경 이력을 «로그인 때»가 아니라 «화면을 열 때» 받는가 (2026-09-07)
//
//   node tools/auditlog-lazy-test.mjs
//
// 🔵 왜 — 로그인 한 번이 Firestore 334건을 읽는데 그중 **190건이 이것 하나**였다
//   (`tools/read-cost.mjs` 실측). 화면을 안 열면 한 건도 안 써야 한다.
//
// 🔴 여기서 못 박는 것은 «덜 읽는다»만이 아니다. 덜 읽으면 **화면이 거짓말을 하기 쉬워진다** —
//   아직 안 받았는데 「0건」·「기록이 없습니다」라고 적는 자리가 생긴다.
//   09-06에도 같은 갈래로 한 번 넘어졌다(「최근 300건」이 실은 옛것 300건이었다).
//   그래서 **읽는 수**와 **화면이 하는 말**을 같이 잰다.
//
// ⚠ 스텁으로 볼 수 있는 것만 본다 — 실제 Firestore 질의 모양은 `tools/firestore-probe.mjs`.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

function 떠내기(이름) {
  const at = html.indexOf('async function ' + 이름 + '(');
  if (at < 0) throw new Error(이름 + ' 를 못 찾았습니다');
  let 깊이 = 0;
  for (let j = html.indexOf('{', at); j < html.length; j++) {
    if (html[j] === '{') 깊이++;
    else if (html[j] === '}') { 깊이--; if (!깊이) return html.slice(at, j + 1); }
  }
  throw new Error(이름 + ' 의 끝을 못 찾았습니다');
}

let 통과 = 0, 틀림 = 0;
const 봄 = (무엇, 나온것, 나와야) => {
  const ok = JSON.stringify(나온것) === JSON.stringify(나와야);
  if (ok) { 통과++; console.log('  ✓ ' + 무엇); }
  else { 틀림++; console.log('  ✗ ' + 무엇 + '\n      나온 것: ' + JSON.stringify(나온것) + '\n      나와야:  ' + JSON.stringify(나와야)); }
};

/* ── ① 로그인이 이것을 안 읽는가 ─────────────────────────────────── */
{
  const 로그인 = 떠내기('loadAll');
  봄('🔴 loadAll 이 변경 이력을 안 읽는다', /loadAuditLogRecent\(\)/.test(로그인), false);
  봄('그 자리는 빈 배열로 채운다', /Promise\.resolve\(\[\]\)/.test(로그인), true);
  봄('화면 쪽 함수는 여전히 있다', html.includes('async function loadAuditLogRecent('), true);
}

/* ── ② 화면이 열릴 때 부르는가 ───────────────────────────────────── */
{
  const at = html.indexOf('function teacherAuditLogHTML()');
  봄('변경 이력 화면이 auditLogEnsureRecent 를 부른다',
    at > 0 && html.slice(at, at + 400).includes('auditLogEnsureRecent()'), true);
}

/* ── ③ 받아 올 때 «이 세션에서 찍힌 줄»을 안 잃는가 ─────────────── */
//
// 🔴 받은 것으로 그냥 덮으면, 받는 사이에 누가 남긴 기록이 화면에서 사라진다.
//   기록이 «사라지는» 것은 이 화면에서 가장 나쁜 흠이다 — 되돌리기 어려운 변경만 남기는 자리다.
{
  const 몸 = 떠내기('auditLogEnsureRecent');
  const 만들기 = (있던, 받을것, 깃발 = {}) => {
    const DATA = { auditLog: 있던.slice() };
    const state = Object.assign({ auditLogRecent: false, auditLogAll: false, auditLogLoading: false }, 깃발);
    let 그린수 = 0, 부른수 = 0;
    const 세상 = new Function('DATA', 'state', 'render', 'loadAuditLogRecent', '센다',
      몸 + '; return auditLogEnsureRecent;')(
      DATA, state, () => 그린수++,
      async () => { 부른수++; return 받을것.slice(); }, null);
    return { 돌려라: 세상, DATA, state, 셈: () => ({ 그린수, 부른수 }) };
  };

  {
    const w = 만들기([{ id: 'log999', at: 'z' }], [{ id: 'log001', at: 'a' }, { id: 'log002', at: 'b' }]);
    await w.돌려라();
    봄('받아 온 것이 들어온다', w.DATA.auditLog.map((e) => e.id).sort(), ['log001', 'log002', 'log999']);
    봄('🔴 이 세션에서 찍힌 줄이 «맨 앞»에 남는다', w.DATA.auditLog[0].id, 'log999');
    봄('받았다는 깃발이 선다', w.state.auditLogRecent, true);
    봄('불러오는 중 깃발은 내려간다', w.state.auditLogLoading, false);
  }
  {
    const w = 만들기([{ id: 'log001', at: 'a' }], [{ id: 'log001', at: 'a' }, { id: 'log002', at: 'b' }]);
    await w.돌려라();
    봄('겹치는 것은 두 번 안 들어간다', w.DATA.auditLog.length, 2);
  }
  {
    const w = 만들기([], [{ id: 'log001' }], { auditLogRecent: true });
    await w.돌려라();
    봄('이미 받았으면 다시 안 부른다', w.셈().부른수, 0);
  }
  {
    const w = 만들기([], [{ id: 'log001' }], { auditLogAll: true });
    await w.돌려라();
    봄('«전체»를 받아 두었으면 다시 안 부른다', w.셈().부른수, 0);
  }
  {
    const w = 만들기([], [{ id: 'log001' }], { auditLogLoading: true });
    await w.돌려라();
    봄('이미 받는 중이면 두 번 안 부른다 — 렌더는 여러 번 돈다', w.셈().부른수, 0);
  }
}

/* ── ④ 화면이 «못 받은 것»을 «없는 것»이라 하지 않는가 ──────────── */
{
  const at = html.indexOf('function teacherAuditLogHTML()');
  const 몸 = html.slice(at, at + 4000);
  봄('🔴 받는 동안은 「없습니다」가 아니라 「불러오는 중」이라 적는다',
    /auditLogLoading && DATA\.auditLog\.length===0[\s\S]{0,90}불러오는 중/.test(몸), true);
  봄('안 받았으면 «건수»를 적지 않는다',
    /!state\.auditLogRecent && !state\.auditLogAll \? '불러오는 중…'/.test(몸), true);
}

/* ── ⑤ 깃발 둘을 하나로 합치지 않았는가 ─────────────────────────── */
//
// ⚠ 합치면 「전체를 받았다」와 「최근 것만 받았다」가 같은 말이 되어,
//   화면이 «최근 60일 안에서만 찾았다»는 사실을 말할 수 없게 된다.
{
  봄('깃발이 둘이다', /auditLogRecent: false, auditLogAll: false/.test(html), true);
  봄('전체를 받으면 «최근 것»도 받은 것으로 친다',
    /state\.auditLogAll = true; state\.auditLogRecent = true;/.test(html), true);
  봄('«최근 창만 받았나»는 여전히 auditLogAll 로 가른다',
    html.includes('const partial = !state.auditLogAll;'), true);
}

console.log(틀림 ? '\n  🔴 ' + 통과 + ' 통과 · ' + 틀림 + ' 실패\n' : '\n  ✅ ' + 통과 + ' 통과 · 0 실패\n');
process.exit(틀림 ? 1 : 0);
