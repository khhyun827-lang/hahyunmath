/* =================== 점프 게임 검사 (2026-09-27) ===================
   재는 것 — ① 줄기 발판 사이는 언제나 닿는 높이인가 ② 한 번 튀면 정말 JUMP_H 만큼 오르나(용수철은 더)
   ③ 금 간 발판은 줄기에 안 드는가 ④ 떨어지면 끝나는가 ⑤ 발판을 따라가는 봇이 실제로 오를 수 있는가.
   난수는 씨앗으로 고정한다 — 판마다 다르면 검사가 흔들린다.
   쓰는 법: node tools/game-jump-test.mjs */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = readFileSync(join(ROOT, 'game-core.js'), 'utf8');
function load(seed){
  let s = seed >>> 0;
  const M = Object.create(Math);
  M.random = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const Image = function(){ return { set src(v){}, get src(){ return ''; } }; };
  return new Function('Image', 'Math', SRC + '\nreturn { MODE_JUMP };')(Image, M).MODE_JUMP;
}

let pass = 0, fail = 0;
const 봄 = (무엇, ok, 덧) => { if(ok){ pass++; console.log('  ✓ ' + 무엇); } else { fail++; console.log('  ✗ ' + 무엇 + (덧 ? '  — ' + 덧 : '')); } };
const 판 = (J) => { const g = { w: 390, h: 760, pad: 84, t: 0, ptr: null, keys: { l: false, r: false }, stars: 0, score: 0 }; J.reset(g); return g; };

console.log('\n점프 게임\n');

// ① 줄기 간격 — 높이 12000px 까지 채워 보며 이웃한 줄기 사이를 모두 잰다
{
  const J = load(7), g = 판(J);
  let 최대 = 0, 셈 = 0, 나쁜 = 0;
  const 줄기높이 = [];
  for(let i = 0; i < 60; i++){
    for(const p of g.plats) if(p.chain && !p.seen){ p.seen = true; 줄기높이.push(p.y - g.climb); }
    for(const p of g.plats) p.y += 200; g.climb += 200; J.fill(g);
  }
  줄기높이.sort((a, b) => b - a);
  for(let i = 1; i < 줄기높이.length; i++){ const d = 줄기높이[i - 1] - 줄기높이[i]; 최대 = Math.max(최대, d); 셈++; if(d >= J.JUMP_H) 나쁜++; }
  봄(`줄기 간격 ${셈}개 모두 점프 높이(${J.JUMP_H}) 안 — 가장 큰 것 ${최대.toFixed(0)}`, 나쁜 === 0 && 셈 > 50, 나쁜 + '개가 못 닿는다');
  봄('금 간 발판은 줄기에 안 든다', g.plats.every(p => p.kind !== 'c' || !p.chain));
  봄('높이 오르면 금 간·움직이는 발판이 나온다', g.plats.some(p => p.kind === 'c') && g.plats.some(p => p.kind === 'm'));
}

// ② 튀는 높이
function 오르는높이(kind){
  const J = load(1), g = 판(J);
  g.plats = [{ x: 195, y: 600, w: 200, kind, chain: true, vx: 0 }];
  g.py = 600 - J.FEET - 1; g.vy = 50;             // 막 내려와 밟는 순간
  J.fill = () => {};                               // 채우기·화면 올리기 없이 높이만 잰다
  let 꼭대기 = g.py, t = 0; const dt = 1 / 240;
  J.step(g, dt);
  while(t < 2 && g.vy < 0 || t < .05){ J.step(g, dt); t += dt; 꼭대기 = Math.min(꼭대기, g.py - (g.climb || 0)); if(g.vy >= 0 && t > .05) break; }
  return (600 - J.FEET) - 꼭대기;          // 꼭대기는 이미 «화면이 올라간 만큼»을 뺀 세상 높이다
}
{
  const J = load(1);
  const n = 오르는높이('n'), sp = 오르는높이('s');
  봄(`보통 발판 — ${n.toFixed(0)}px 오른다(≈${J.JUMP_H})`, Math.abs(n - J.JUMP_H) < J.JUMP_H * .05);
  봄(`용수철 — ${sp.toFixed(0)}px (보통의 ${J.SPRING}배쯤)`, Math.abs(sp / n - J.SPRING) < .15);
}

// ③ 금 간 발판은 밟아도 안 튄다
{
  const J = load(1), g = 판(J);
  g.plats = [{ x: 195, y: 600, w: 200, kind: 'c', chain: false, vx: 0 }];
  g.py = 600 - J.FEET - 1; g.vy = 50; J.fill = () => {};
  for(let i = 0; i < 30 && !g.plats[0].broken; i++) J.step(g, 1 / 120);
  봄('금 간 발판 — 부서지고 그대로 떨어진다', g.plats[0].broken === true && g.vy > 0);
}

// ④ 떨어지면 끝
{
  const J = load(1), g = 판(J);
  g.plats = []; g.vy = 0; J.fill = () => {};
  let 살아 = true, t = 0; while(살아 && t < 5){ 살아 = J.step(g, 1 / 60); t += 1 / 60; }
  봄('발판이 없으면 떨어져 끝난다', !살아);
}

// ⑤ 봇 — 발밑보다 위에 있는 가장 가까운 줄기 발판으로 손가락을 옮긴다
for(const seed of [3, 11, 29]){
  const J = load(seed), g = 판(J);
  let 살아 = true;
  while(살아 && g.t < 120){
    const feet = g.py + J.FEET;
    const 목표 = g.vy > 0
      ? g.plats.filter(p => !p.broken && p.kind !== 'c' && p.y >= feet - 2).sort((a, b) => a.y - b.y)[0]
      : g.plats.filter(p => !p.broken && p.kind !== 'c' && p.y < feet - 20).sort((a, b) => b.y - a.y)[0];
    /* 손가락이 «끈 만큼»만 움직이므로(09-27) 봇도 손가락을 «끈다» — 사람 손처럼 초당 1200px 까지만 */
    let dx = 목표 ? 목표.x - g.px : 0;
    if(dx > g.w / 2) dx -= g.w; else if(dx < -g.w / 2) dx += g.w;   // 끝을 넘어 반대편으로 가는 쪽이 가까우면 그리로
    if(g.ptr === null) g.ptr = g.w / 2;
    g.ptr += Math.max(-20, Math.min(20, dx / J.DRAG_GAIN));
    살아 = J.step(g, 1 / 60); g.t += 1 / 60;
  }
  봄(`봇(씨앗 ${seed}) — 2분 동안 ${J.score(g)}점까지 올랐다`, J.score(g) >= 400, '너무 못 오른다 — 발판이 닿는 자리에 없을 수 있다');
}

// ⑥ 한자리에서 버티면 물에 잠긴다 (사용자 — 「무한히 한자리에서 계속 쉴 수가 있어서」)
{
  const J = load(5), g = 판(J);
  g.plats = [{ x: 195, y: 600, w: 300, kind: 'n', chain: true, vx: 0 }];
  g.py = 600 - J.FEET; g.vy = -J.v0(); J.fill = () => {};
  let 살아 = true; while(살아 && g.t < 60){ 살아 = J.step(g, 1 / 60); g.t += 1 / 60; }
  봄(`제자리에서 튀기만 하면 ${g.t.toFixed(1)}초에 물에 잠긴다`, !살아 && g.t < 25, '너무 오래 버틴다');
  봄('처음 몇 초는 물이 안 올라온다', (() => { const g2 = 판(load(5)); const f0 = g2.flood; J.step(g2, 1 / 60); return g2.flood === f0; })());
}
{
  const J = load(5);
  봄('물의 빠르기 상한은 봇의 평균 오름(≈180px/s)보다 한참 느리다', J.FLOOD_MAX < 130);
}

// ⑦ 배경 — 층이 경계에서 툭 바뀌지 않는다 (사용자 — 「그라데이션으로 서서히 블렌딩」)
{
  const J = load(1);
  const rgb = s => s.match(/\d+/g).map(Number);
  let 최대점프 = 0;
  for(let y = 0; y < 11000; y += 10){
    const a = rgb(J.skyAt(y).top), b = rgb(J.skyAt(y + 10).top);
    최대점프 = Math.max(최대점프, ...a.map((v, k) => Math.abs(v - b[k])));
  }
  봄(`하늘색이 10px 오를 때 한 번에 바뀌는 폭 ≤ 2 (가장 큰 것 ${최대점프})`, 최대점프 <= 2);
  const 층 = ['풀밭', '나무', '새', '하늘', '우주'];
  const 가장센 = y => { const f = J.stageF(y); return 층[[0, 1, 2, 3, 4].reduce((m, i) => J.weight(f, i) > J.weight(f, m) ? i : m, 0)]; };
  봄('높이마다 층이 차례로 — 풀밭→나무→새→하늘→우주', JSON.stringify([0, 1500, 3500, 6000, 9500].map(가장센)) === JSON.stringify(층));
  봄('두 층 사이에서는 둘 다 보인다(섞인다)', (() => { const f = J.stageF(2500); return J.weight(f, 1) > .3 && J.weight(f, 2) > .3; })());
}

// ⑧ 손가락은 «끈 만큼»만 (사용자 — 「어딜 터치하든 좌우 드래그로만」)
{
  const J = load(1), g = 판(J);
  J.fill = () => {};
  const x0 = g.px, 한번 = () => J.step(g, 1 / 60);
  g.ptr = 10; 한번();
  봄('왼쪽 끝을 눌러도 사람이 순간이동하지 않는다', Math.abs(g.px - x0) < 1, `${x0} → ${g.px}`);
  g.ptr = 60; 한번();
  봄(`손가락을 50 끌면 ${50 * J.DRAG_GAIN} 만큼 간다`, Math.abs(g.px - (x0 + 50 * J.DRAG_GAIN)) < 1, `${g.px - x0}`);
  const x1 = g.px;
  g.ptr = null; 한번(); g.ptr = 380; 한번();
  봄('떼었다가 오른쪽 끝을 다시 눌러도 그 자리 그대로', Math.abs(g.px - x1) < 1, `${x1} → ${g.px}`);
}

console.log(`\n  ${fail ? '🔴' : '✅'} ${pass} 통과 · ${fail} 실패\n`);
process.exit(fail ? 1 : 0);
