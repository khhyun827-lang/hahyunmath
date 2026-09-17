// figure.js — 축은 내용까지만 · 점선 안내선은 축에서 끊는다 (2026-09-15)
//
//   node tools/figure-axis-test.mjs            (끝에 임시 폴더로 SVG 도 떨군다 — 눈으로 볼 것)
//
// 사용자 — 「x축이 주된 그림 도형과 관계없이 좌우로 너무 길어서 보기 안 좋은 문제랑, 점선이 축에 닿고 끝냈으면
//   좋겠는데 축을 살짝 넘어서까지 점선이 이어지는 것이 안 나오도록」 (직사각형 둘 · y 0~18 · x −5~3 인 그림).

import fs from 'fs';
import path from 'path';
import os from 'os';
import '../figure.js';
const F = globalThis.Figure;
const NL = String.fromCharCode(10);
let pass = 0, fail = 0;
const 봄 = (무엇, 나온것, 나와야) => {
  const ok = JSON.stringify(나온것) === JSON.stringify(나와야);
  if (ok) pass++; else fail++;
  console.log((ok ? '  ✓ ' : '  🔴 ') + 무엇 + (ok ? '' : NL + '      나온 것 ' + JSON.stringify(나온것) + NL + '      나와야 ' + JSON.stringify(나와야)));
};
const num = s => Number(s);

/* 그 그림 — 작은 직사각형 ABCD(−5~−3 · 1~3), 큰 직사각형 EFGH(1~3 · 10~18), 점선 안내선(축을 살짝 넘긴 것 포함) */
const scene = {
  xTicks: [-5, -3, 1, 3], yTicks: [1, 3, 10, 18],
  axis: { xLabel: 'x', yLabel: 'y', origin: 'O' },
  polygons: [
    { pts: [[-5, 3], [-3, 3], [-3, 1], [-5, 1]], fill: true },
    { pts: [[1, 18], [3, 18], [3, 10], [1, 10]], fill: true },
  ],
  points: [
    { x: -5, y: 3, label: 'A' }, { x: -3, y: 3, label: 'D' }, { x: -5, y: 1, label: 'B', labelPos: 'left' }, { x: -3, y: 1, label: 'C' },
    { x: 1, y: 18, label: 'E' }, { x: 3, y: 18, label: 'H', labelPos: 'right' }, { x: 1, y: 10, label: 'F', labelPos: 'below' }, { x: 3, y: 10, label: 'G', labelPos: 'right' },
  ],
  segments: [
    { from: [-5, 3], to: [0.4, 3], dash: true },      // 가로 점선 — y축을 0.4 넘겼다 → 0 에서 끊겨야 한다
    { from: [-5, 1], to: [-5, -0.6], dash: true },    // 세로 점선 — x축을 0.6 넘겼다 → 0 에서 끊겨야 한다
    { from: [1, 10], to: [1, 0], dash: true },        // 정확히 축까지 — 그대로
    { from: [-4, 2], to: [2, 2], dash: true },        // 진짜로 y축을 가로지르는 점선 — 그대로
  ],
};
/* ⚠ 눈금 «작대기»는 2026-09-18에 걷었다 — 자리는 이제 «숫자»에서 읽는다.
   이름표는 이미 밖으로 나와 있다(`layoutLabels` — 편집기가 쓰는 그것). 새 창구를 내지 않는다. */
const 이름표 = F.layoutLabels(scene);
const r = F.renderScene(scene);
const svg = typeof r === 'string' ? r : r.svg;
const paths = [...svg.matchAll(/<path d="([^"]+)"([^>]*)>/g)].map(m => ({ d: m[1], attrs: m[2] }));

console.log(NL + '① 축은 내용까지만' + NL);
{
  const xAxis = paths.find(p => /^M[\d.]+ [\d.]+H[\d.]+$/.test(p.d));   // 첫 가로선이 x축
  const [, x0, , x1] = xAxis.d.match(/^M([\d.]+) ([\d.]+)H([\d.]+)$/);
  봄('x축이 창 끝(pad.l−6=32)에서 시작하지 않는다', num(x0) > 60, true);
  봄('x축이 창 끝(W−pad.r+12=530)까지 가지 않는다', num(x1) < 470, true);
  /* 내용(−5~3)과 원점을 다 덮는다 — 짧아졌다고 눈금이 축 밖에 나가면 안 된다.
     🔵 **눈금 «작대기»는 2026-09-18에 걷었다** (사용자 —「축에 수직인 선분 … 안그리도록」).
       그러니 자리는 «숫자»에서 읽는다 — 재려던 것(눈금이 축 밖으로 안 나간다)은 그대로다. */
  봄('🔴 축을 가로지르는 눈금 작대기가 하나도 없다',
    /<path d="M[\d.]+ [\d.]+v10"/.test(svg) || /<path d="M[\d.]+ [\d.]+h10"/.test(svg), false);
  const 눈금 = 이름표.filter(l => /^xtick:/.test(l.id));
  const xs = 눈금.map(l => num(l.x));
  봄('x 눈금 넷이 전부 축 위에 있다', xs.every(x => x > num(x0) && x < num(x1)) && xs.length === 4, true);
  봄('   숫자는 그대로 남아 있다 (없어진 것은 선분뿐)', 눈금.map(l => l.text).join(' '), '-5 -3 1 3');
  const yAxis = paths.find(p => /^M[\d.]+ [\d.]+V[\d.]+$/.test(p.d));
  const [, , yB, yT] = yAxis.d.match(/^M([\d.]+) ([\d.]+)V([\d.]+)$/);
  봄('y축도 위쪽 내용(18) 조금 위에서 끝난다', num(yT) > 10, true);
  봄('y축은 원점 아래로 조금만 내려간다', num(yB) < 430, true);
}

console.log(NL + '② 점선 안내선' + NL);
{
  const dashed = paths.filter(p => /stroke-dasharray="7 6"/.test(p.attrs)).map(p => p.d.match(/^M([\d.]+) ([\d.]+)L([\d.]+) ([\d.]+)$/).slice(1).map(num));
  /* 원점의 px — 축선 교차점 */
  const xAxis = paths.find(p => /^M[\d.]+ [\d.]+H[\d.]+$/.test(p.d)); const oy = num(xAxis.d.match(/^M[\d.]+ ([\d.]+)H/)[1]);
  const yAxis = paths.find(p => /^M[\d.]+ [\d.]+V[\d.]+$/.test(p.d)); const ox = num(yAxis.d.match(/^M([\d.]+) /)[1]);
  const h = dashed[0], v = dashed[1], exact = dashed[2], cross = dashed[3];
  봄('🔴 가로 점선(y=3)은 y축에서 끊긴다 (0.4 를 안 넘긴다)', Math.abs(Math.max(h[0], h[2]) - ox) < 0.6, true);
  봄('🔴 세로 점선(x=−5)은 x축에서 끊긴다 (−0.6 으로 안 내려간다)', Math.abs(Math.max(v[1], v[3]) - oy) < 0.6, true);
  봄('정확히 축까지인 점선은 그대로다', Math.abs(Math.max(exact[1], exact[3]) - oy) < 0.6, true);
  봄('⚠ 진짜로 축을 가로지르는 점선은 안 자른다', Math.min(cross[0], cross[2]) < ox - 20 && Math.max(cross[0], cross[2]) > ox + 20, true);
  봄('장면은 안 고쳤다 (검산·핀이 보는 값)', scene.segments[0].to, [0.4, 3]);
}

console.log(NL + '③ 곡선이 있어도 «그려진 곡선»까지만' + NL);
{
  /* 🔴 **2026-09-18에 갈렸다** — 09-15 에는 곡선이 있으면 창 끝까지 그었다. 까닭은
     「곡선은 창 끝까지 그려지니 축이 그보다 짧으면 잘린 것처럼 읽힌다」였는데 **그 전제가 틀렸다.**
     곡선은 제 domain 과 창이 겹치는 데까지만 그려진다. 사용자가 다시 짚었다 —
     「이번에도 그림에서 축이 또 길게 나와서」. 이제 «곡선이 실제로 그려진 끝»에 맞춘다. */
  const 창끝 = [32, 530];
  const x축 = (s) => {
    const svg2 = (t => typeof t === 'string' ? t : t.svg)(F.renderScene(s));
    const xa = svg2.match(/<path d="M([\d.]+) [\d.]+H([\d.]+)"/);
    return [num(xa[1]), num(xa[2])];
  };
  /* ⓐ **끝에서 끝까지 그려지는 곡선이면 축도 창 끝까지** — 짧게 자르면 정말 잘린 것처럼 읽힌다.
     ⚠ 그런 곡선으로 포물선을 쓰면 안 된다 — 팔이 창 «위»로 빠져나가 거기서 끊기므로,
       가로로도 창을 다 못 채운다(그래서 70~502 다). 창을 정말 가로지르는 것은 완만한 «직선»이다. */
  봄('끝까지 그려지는 곡선(직선)이면 축도 창 끝까지',
    x축({ curves: [{ expr: '0.5*x' }], xTicks: [-2, 2], yTicks: [-1, 1], axis: {} }), 창끝);
  /* ⚠ 팔이 창 위로 빠지는 포물선은 «그려진 데»까지다 — 창 끝이 아니다. 이것이 09-15의 틀린 전제였다. */
  {
    const [a, b] = x축({ curves: [{ expr: 'x*x-4' }], xTicks: [-2, 2], yTicks: [-4], axis: {} });
    봄('🔴 팔이 창 위로 빠지는 포물선은 축도 그만큼만',
      [a > 창끝[0] + 1, b < 창끝[1] - 1], [true, true]);
  }
  /* ⓑ domain 이 좁은 곡선 — 여기가 사용자가 본 그림이다. 축이 창 끝까지 가면 안 된다. */
  {
    const s = { curves: [{ expr: 'x*x-4', domain: [-1, 1] }], xTicks: [-1, 1], yTicks: [-4], axis: {} };
    const svg2 = (t => typeof t === 'string' ? t : t.svg)(F.renderScene(s));
    const xa = svg2.match(/<path d="M([\d.]+) [\d.]+H([\d.]+)"/);
    봄('🔴 좁은 곡선이면 x축도 짧다 (창 끝까지 안 간다)',
      [num(xa[1]) > 창끝[0] + 1, num(xa[2]) < 창끝[1] - 1], [true, true]);
    /* ⚠ 그래도 곡선보다는 길어야 한다 — 짧으면 곡선이 축 밖으로 삐져나온 그림이 된다. */
    const 곡선 = [...svg2.matchAll(/<path d="(M[-\d.]+ [-\d.]+(?:L[-\d.]+ [-\d.]+)+)" stroke-width="2\.1"/g)]
      .flatMap(m => [...m[1].matchAll(/([-\d.]+) ([-\d.]+)/g)].map(p => num(p[1])));
    봄('   그래도 곡선 양 끝은 축 안에 든다',
      [Math.min(...곡선) >= num(xa[1]), Math.max(...곡선) <= num(xa[2])], [true, true]);
  }
}

const out = path.join(os.tmpdir(), 'figure-axis-sample.svg');   // 저장소 밖에 떨군다
try { fs.writeFileSync(out, svg); console.log(NL + '보기 → ' + out); } catch (e) {}
console.log(NL + (fail ? `🔴 ${fail}개 실패 · ${pass + fail}개` : `✓ 전부 통과 · ${pass}개`));
process.exit(fail ? 1 : 0);
