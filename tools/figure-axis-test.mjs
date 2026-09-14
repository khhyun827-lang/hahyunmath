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
const r = F.renderScene(scene);
const svg = typeof r === 'string' ? r : r.svg;
const paths = [...svg.matchAll(/<path d="([^"]+)"([^>]*)>/g)].map(m => ({ d: m[1], attrs: m[2] }));

console.log(NL + '① 축은 내용까지만' + NL);
{
  const xAxis = paths.find(p => /^M[\d.]+ [\d.]+H[\d.]+$/.test(p.d));   // 첫 가로선이 x축
  const [, x0, , x1] = xAxis.d.match(/^M([\d.]+) ([\d.]+)H([\d.]+)$/);
  봄('x축이 창 끝(pad.l−6=32)에서 시작하지 않는다', num(x0) > 60, true);
  봄('x축이 창 끝(W−pad.r+12=530)까지 가지 않는다', num(x1) < 470, true);
  /* 내용(−5~3)과 원점을 다 덮는다 — 짧아졌다고 눈금이 축 밖에 나가면 안 된다 */
  const xs = [...svg.matchAll(/<path d="M([\d.]+) [\d.]+v10"/g)].map(m => num(m[1]));   // x 눈금 자리
  봄('x 눈금 넷이 전부 축 위에 있다', xs.every(x => x > num(x0) && x < num(x1)) && xs.length === 4, true);
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

console.log(NL + '③ 곡선이 있으면 예전처럼 창 끝까지' + NL);
{
  const s2 = { curves: [{ expr: 'x*x-4' }], xTicks: [-2, 2], yTicks: [-4], axis: {} };
  const svg2 = (t => typeof t === 'string' ? t : t.svg)(F.renderScene(s2));
  const xa = svg2.match(/<path d="M([\d.]+) [\d.]+H([\d.]+)"/);
  봄('곡선 그림의 x축은 창 끝에서 창 끝까지', [num(xa[1]), num(xa[2])], [32, 530]);
}

const out = path.join(os.tmpdir(), 'figure-axis-sample.svg');   // 저장소 밖에 떨군다
try { fs.writeFileSync(out, svg); console.log(NL + '보기 → ' + out); } catch (e) {}
console.log(NL + (fail ? `🔴 ${fail}개 실패 · ${pass + fail}개` : `✓ 전부 통과 · ${pass}개`));
process.exit(fail ? 1 : 0);
