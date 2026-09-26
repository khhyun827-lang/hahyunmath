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
    g.ptr = 목표 ? 목표.x : null;
    살아 = J.step(g, 1 / 60); g.t += 1 / 60;
  }
  봄(`봇(씨앗 ${seed}) — 2분 동안 ${J.score(g)}점까지 올랐다`, J.score(g) >= 400, '너무 못 오른다 — 발판이 닿는 자리에 없을 수 있다');
}

console.log(`\n  ${fail ? '🔴' : '✅'} ${pass} 통과 · ${fail} 실패\n`);
process.exit(fail ? 1 : 0);
