// 검사를 «다른 날»에 돌려 본다 (2026-11-02) — 날짜를 글자로 박아 둔 검사가 시즌이 넘어가는 날 한꺼번에 빨개졌다.
//   node tools/check-all.mjs --today 2027-01-05      ← 이 파일을 node 에 미리 싣고(NODE_OPTIONS), serve.js 는 페이지에 같은 시계를 심는다
// 시계는 그 날 10:00(한국)에서 «흘러간다» — 멈추면 기다리기(setTimeout·waitFor)가 어긋난다.
// ⚠ 검사가 제 시계를 이미 박아 두었으면(page.clock.setFixedTime — Date.now 가 native 가 아니다) 비켜선다. 그 검사는 날짜가 굳어 있어 탈이 없다.
export const FAKE_CLOCK = T => `(()=>{if(!String(Date.now).includes('[native code]'))return;const R=Date,off=R.parse(${JSON.stringify(T)}+'T10:00:00+09:00')-R.now();`
  + `class D extends R{constructor(...a){super(...(a.length?a:[R.now()+off]))}static now(){return R.now()+off}}`
  + `globalThis.Date=D;})();`;
if (process.env.KHM_TODAY) new Function(FAKE_CLOCK(process.env.KHM_TODAY))();
