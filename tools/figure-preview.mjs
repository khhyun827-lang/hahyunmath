/* 장면(scene) → 검산 → SVG. **배포도 AI 한도도 안 쓴다.**
   figure.js가 실제로 쓸 만한지 눈으로 보는 자리다 (「▶ 다음 차례」 0-F 1단계).

   쓰는 법 —
     node tools/figure-preview.mjs                 붙박이 다섯 장면을 그린다
     node tools/figure-preview.mjs scenes.json     배열이든 하나든 다 받는다

   결과는 둘이다 —
     · 콘솔에 검산 결과 (여기서 FAIL이 나면 그 초안은 «쓰지 않는다»가 규칙이다)
     · tools/figure-preview.html — 한 장에 모아 놓은 대조표. 브라우저로 그냥 열면 된다

   붙박이 장면 다섯은 전부 **실제로 있었던 (B)**다 (2026-08-11 밤 배포본 확인).
   마지막 하나는 **일부러 틀린 장면**이다 — 검문이 실제로 잡는지 보려면 통과하는 것만
   모아 두면 안 된다 (test-json-repair가 «옛 동작»을 재현해 두는 것과 같은 이유). */
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');

/* figure.js는 브라우저용 고전 스크립트다 (globalThis.Figure를 세운다).
   package.json이 없어 node는 .js를 CommonJS로 읽는데, 그래도 부수효과는 그대로 돈다. */
await import(pathToFileURL(join(ROOT, 'figure.js')).href);
const { verifyScene, renderScene, autoWindow } = globalThis.Figure;

/* ---------------- 붙박이 장면 ---------------- */

/* 두 이차함수 y=f(x), y=g(x). g(x)<f(x)<0의 해가 α<x<β.
   f는 위로 볼록이고 x절편이 둘, g는 아래로 볼록, 교점이 둘 — 이 네 개가 이 유형의 뼈대다.
   g는 지침이 안 정해 준다. f와 교점 둘에서 나온다: g = f + k(x-p)(x-q), k>1이면 아래로 볼록. */
function quadPair({ roots, meet, k = 2, label }) {
  const [r1, r2] = roots, [m1, m2] = meet;
  /* f = -(x-r1)(x-r2)  →  전개하면 -x² + (r1+r2)x - r1r2 */
  const f = `-(x-${r1})*(x-${r2})`;
  /* g = f + k(x-m1)(x-m2) */
  const g = `${f} + ${k}*(x-${m1})*(x-${m2})`;
  return {
    kind: 'graph',
    _title: label,
    curves: [
      { expr: f, label: 'y=f(x)' },
      { expr: g, label: 'y=g(x)' }
    ],
    points: [
      { x: m1, curve: 0, dot: true, dropTo: 'axis' },
      { x: m2, curve: 0, dot: true, dropTo: 'axis' }
    ],
    xTicks: [m1, r1, m2, r2].sort((a, b) => a - b),
    axis: { xLabel: 'x', yLabel: 'y', origin: 'O' },
    checks: [
      { type: 'root', curve: 0, x: r1 },
      { type: 'root', curve: 0, x: r2 },
      { type: 'intersect', curves: [0, 1], x: m1 },
      { type: 'intersect', curves: [0, 1], x: m2 },
      { type: 'convex', curve: 0, dir: 'down' },
      { type: 'convex', curve: 1, dir: 'up' }
    ]
  };
}

const BUILTIN = [
  /* ① 원본 그림 자체. 재현되는지부터 본다 — 못 그리면 변형은 볼 것도 없다.
        해 -2<x<-1 → α+β=-3 (원본 정답 ②) */
  quadPair({ roots: [-1, 2], meet: [-2, 2], k: 2, label: '원본 · test 1번 (해 -2<x<-1, α+β=-3)' }),

  /* ② 2026-08-11 밤에 받은 첫 (B). 사람이 그려 붙였던 바로 그 그림. α+β=3 */
  quadPair({ roots: [2, 6], meet: [1, 5], k: 2, label: '(B) 1차 · f절편 2·6, 교점 1·5 (α+β=3)' }),

  /* ③ 「AI로 다시 생성」이 낸 두 번째 (B). α+β=4 */
  quadPair({ roots: [3, 9], meet: [1, 7], k: 2, label: '(B) 2차 · f절편 3·9, 교점 1·7 (α+β=4)' }),

  /* ④ 창 잡기가 정말 저절로 되는지 — 눈금이 넓게 벌어진 것. */
  quadPair({ roots: [-6, 10], meet: [-8, 6], k: 1.6, label: '창 잡기 시험 · 넓게 벌어진 경우' }),

  /* ⑤ ⚠ 일부러 틀린 장면. 「교점이 1·5」라고 적어 놓고 g는 1·4에서 만나게 만들었다.
        모델이 지침과 다른 식을 낼 때가 정확히 이 모양이다 — 그림만 보면 그럴듯하다. */
  {
    kind: 'graph',
    _title: '⚠ 일부러 틀린 장면 — 검문이 잡아야 한다',
    curves: [
      { expr: '-(x-2)*(x-6)', label: 'y=f(x)' },
      { expr: '-(x-2)*(x-6) + 2*(x-1)*(x-4)', label: 'y=g(x)' }
    ],
    points: [{ x: 1, curve: 0, dot: true, dropTo: 'axis' }, { x: 5, curve: 0, dot: true, dropTo: 'axis' }],
    xTicks: [1, 2, 5, 6],
    axis: { xLabel: 'x', yLabel: 'y', origin: 'O' },
    checks: [
      { type: 'root', curve: 0, x: 2 },
      { type: 'root', curve: 0, x: 6 },
      { type: 'intersect', curves: [0, 1], x: 1 },
      { type: 'intersect', curves: [0, 1], x: 5 },      // ← 여기서 걸린다
      { type: 'convex', curve: 0, dir: 'down' }
    ]
  }
];

/* ---------------- 돌린다 ---------------- */

const arg = process.argv[2];
let scenes = BUILTIN;
if (arg) {
  const raw = JSON.parse(fs.readFileSync(arg, 'utf8'));
  scenes = Array.isArray(raw) ? raw : [raw];
}

const cards = [];
let pass = 0, fail = 0;

scenes.forEach((scene, i) => {
  const title = scene._title || ('장면 ' + (i + 1));
  const v = verifyScene(scene);
  const w = autoWindow(scene);
  v.ok ? pass++ : fail++;

  console.log('\n' + (v.ok ? 'ok  ' : 'FAIL') + '  ' + title);
  console.log('      창  x[' + fmt(w.xRange[0]) + ', ' + fmt(w.xRange[1]) + ']  y[' +
    fmt(w.yRange[0]) + ', ' + fmt(w.yRange[1]) + ']   검사 ' + v.ran + '건');
  v.failures.forEach(f => console.log('      · ' + f.msg));

  let svg = '';
  try { svg = renderScene(scene); }
  catch (e) { console.log('      !! 그리다 터졌다: ' + e.message); }

  cards.push({ title, ok: v.ok, failures: v.failures, svg, window: w });
});

console.log('\n' + pass + ' ok · ' + fail + ' fail   (⚠ 표시가 붙은 장면은 FAIL이 나야 정상이다)');

/* ---------------- 대조표 ---------------- */

const html = `<!doctype html><meta charset="utf-8"><title>figure.js 미리보기</title>
<style>
  body{margin:0;padding:28px;background:#faf9f7;color:#1a1a1a;
       font:14px/1.7 -apple-system,'Segoe UI','Malgun Gothic',sans-serif}
  h1{font-size:19px;margin:0 0 4px}
  .sub{color:#8a8578;font-size:12.5px;margin-bottom:22px}
  .card{background:#fff;border:1px solid #e6e2d9;border-radius:10px;padding:16px 18px;margin-bottom:18px}
  .hd{display:flex;align-items:center;gap:10px;margin-bottom:10px}
  .t{font-weight:600;font-size:14.5px}
  .b{font-size:11.5px;padding:2px 8px;border-radius:999px;font-weight:600}
  .ok{background:#e8f3ea;color:#2c6b3f}.no{background:#fbe9e9;color:#9d2f2f}
  .win{color:#8a8578;font-size:12px;font-family:ui-monospace,Consolas,monospace}
  ul{margin:8px 0 0;padding-left:18px;color:#9d2f2f;font-size:12.5px}
  .fig{overflow-x:auto}
  svg{max-width:100%;height:auto;display:block}
</style>
<h1>figure.js — 장면에서 그린 그림</h1>
<div class="sub">${pass} ok · ${fail} fail · 만든 때 ${new Date().toLocaleString('ko-KR')}
  &nbsp;— ⚠ 가 붙은 장면은 <b>FAIL이 나야 정상</b>이다.</div>
${cards.map(c => `<div class="card">
  <div class="hd"><span class="t">${escHtml(c.title)}</span>
    <span class="b ${c.ok ? 'ok' : 'no'}">${c.ok ? '검산 통과' : '검산 실패'}</span>
    <span class="win">x[${fmt(c.window.xRange[0])}, ${fmt(c.window.xRange[1])}]
      y[${fmt(c.window.yRange[0])}, ${fmt(c.window.yRange[1])}]</span></div>
  ${c.failures.length ? '<ul>' + c.failures.map(f => '<li>' + escHtml(f.msg) + '</li>').join('') + '</ul>' : ''}
  <div class="fig">${c.svg}</div>
</div>`).join('\n')}
`;

const outPath = join(HERE, 'figure-preview.html');
fs.writeFileSync(outPath, html, 'utf8');
console.log('\n대조표 → ' + outPath);

function fmt(v) { return String(Math.round(v * 100) / 100); }
function escHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
