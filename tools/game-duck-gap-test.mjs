/* ============ 달리기 — 차단봉 밑 «구멍»이 숙인 머리를 재우는지 (2026-09-17) ============
   사용자가 짚었다 — 「차단봉 밑으로 들어가는 구멍 조금만 더 넓혀줘」.

   🔴 **취향이 아니라 뚫려 있었다** — 슬라이드는 두 칸(10·11)을 번갈아 그리는데, 그림에서
     직접 재 보니 머리끝이 **57.2px · 65.7px**(바닥 기준)이다. 봉 아래끝은 **62** 였다.
     그러니 **둘째 칸에서는 머리가 봉 위로 나왔다.** 「구멍이 좁다」가 그 자리다.
   🔵 **고침** — 아래끝을 74로 올렸다. 숙인 머리 위로 한 뼘 뜨고, 선 머리보다는 아직 낮다.

   🔵 **이 검사는 숫자를 베껴 두지 않는다** — run-sprite.png 를 열어 알파로 머리끝을 재고,
     game-core.js 에서 HB 를 읽어 둘을 견준다. 그림을 갈아 끼우면 여기서 걸린다.
   ⚠ **덫으로 잰다** — 옛 값(62)으로도 돌려 본다. 옛 값이 안 물면 검사가 아무 말도 안 한 것이다.

   쓰는 법: node tools/game-duck-gap-test.mjs
*/
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

let pass = 0, fail = 0;
const ok = (name, cond) => { if(cond){ pass++; console.log('  ✓ ' + name); }
                             else { fail++; console.log('  ❌ ' + name); } };

/* ── PNG 한 장을 알파까지 펴 놓는다 (8비트 RGBA 만 · 우리 그림이 그것이다) ── */
function png(path){
  const buf = readFileSync(path);
  let p = 8, w = 0, h = 0, bd = 0, ct = 0; const idat = [];
  while(p < buf.length){
    const len = buf.readUInt32BE(p), type = buf.toString('ascii', p + 4, p + 8);
    const data = buf.subarray(p + 8, p + 8 + len);
    if(type === 'IHDR'){ w = data.readUInt32BE(0); h = data.readUInt32BE(4); bd = data[8]; ct = data[9]; }
    if(type === 'IDAT') idat.push(data);
    if(type === 'IEND') break;
    p += 12 + len;
  }
  if(bd !== 8 || ct !== 6) throw new Error('8비트 RGBA 가 아니다 — bd=' + bd + ' ct=' + ct);
  const raw = inflateSync(Buffer.concat(idat));
  const bpp = 4, stride = w * bpp, img = Buffer.alloc(h * stride);
  let q = 0;
  for(let y = 0; y < h; y++){
    const f = raw[q++], line = raw.subarray(q, q + stride); q += stride;
    const cur = img.subarray(y * stride, (y + 1) * stride);
    const prev = y ? img.subarray((y - 1) * stride, y * stride) : Buffer.alloc(stride);
    for(let i = 0; i < stride; i++){
      const a = i >= bpp ? cur[i - bpp] : 0, b = prev[i], c = i >= bpp ? prev[i - bpp] : 0, x = line[i];
      let v;
      if(f === 0) v = x;
      else if(f === 1) v = x + a;
      else if(f === 2) v = x + b;
      else if(f === 3) v = x + ((a + b) >> 1);
      else { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c);
             v = x + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c); }
      cur[i] = v & 255;
    }
  }
  return { w, h, stride, img };
}

/* ── 칸 하나의 «머리끝» — 바닥 기준 px ──
   ⚠ 칸은 «바닥을 맞춰» 묶여 있고 그릴 때 칸 하나를 92px 로 늘린다(player 의 S).
     그러니 칸 안의 y 를 그대로 쓰면 안 되고, 바닥에서 되짚어 그 잣대로 옮겨야 한다. */
function 머리끝(sheet, f, CW, CH, KEY){
  let top = CH;
  for(let y = 0; y < Math.min(CH, sheet.h); y++)
    for(let x = f * CW; x < (f + 1) * CW; x++)
      if(sheet.img[y * sheet.stride + x * 4 + 3] > 16){ if(y < top) top = y; break; }
  return (CH - top) * KEY / CH;
}

/* ── game-core.js 에서 잣대를 읽어 온다 — 숫자를 두 곳에 두지 않는다 ── */
const SRC = readFileSync(join(ROOT, 'game-core.js'), 'utf8');
function 뽑기(re, 이름){
  const m = SRC.match(re);
  if(!m){ console.error('🔴 ' + 이름 + ' 를 game-core.js 에서 못 찾았다 — 이 검사의 정규식을 같이 고칠 것'); process.exit(1); }
  return m;
}
const 칸    = 뽑기(/const RUN_CW = (\d+), RUN_CH = (\d+);/, 'RUN_CW·RUN_CH');
const CW    = +칸[1], CH = +칸[2];
const KEY   = +뽑기(/const S = (\d+) \* \(g\.u \|\| 1\) \/ RUN_CH;/, '사람 키(S)')[1];
const HB    = +뽑기(/const HB = (\d+), dep = /, '봉 아래끝(HB)')[1];
const SEQ   = JSON.parse(뽑기(/slide:\s*(\[[\d,\s]+\])/, '슬라이드 칸(RUN_SEQ.slide)')[1]);
const RUN   = JSON.parse(뽑기(/run:\s*(\[[\d,\s]+\])/, '달리는 칸(RUN_SEQ.run)')[1]);
const 점프  = (() => { const m = 뽑기(/JUMP_H: ([\d.]+) \* (\d+),/, 'JUMP_H'); return +m[1] * +m[2]; })();

const sheet   = png(join(ROOT, 'run-sprite.png'));
const 숙인머리 = SEQ.map(f => 머리끝(sheet, f, CW, CH, KEY));
const 선머리   = RUN.map(f => 머리끝(sheet, f, CW, CH, KEY));
const 숙인최고 = Math.max(...숙인머리);
const 선최저   = Math.min(...선머리);

console.log('\n달리기 — 차단봉 밑 구멍\n');
console.log('  칸 ' + CW + '×' + CH + ' · 사람 키 ' + KEY + 'px 잣대');
console.log('  숙인 머리끝  ' + 숙인머리.map(v => v.toFixed(1)).join(' · ') + '   (가장 높은 것 ' + 숙인최고.toFixed(1) + ')');
console.log('  선   머리끝  ' + 선머리.map(v => v.toFixed(1)).join(' · ') + '   (가장 낮은 것 ' + 선최저.toFixed(1) + ')');
console.log('  봉 아래끝(HB) ' + HB + '\n');

/* ── 잰다 ──────────────────────────────────────────────────────────── */
const 여유 = 4;     // 머리가 «닿을 듯»해도 뚫은 것으로 본다 — 눈은 한두 px 을 본다
const 판정 = (hb) => ({
  숙이면_지난다: hb >= 숙인최고 + 여유,
  서면_막힌다:   hb <= 선최저 - 여유
});

console.log('① 숙이면 머리가 봉 밑으로 지난다\n');
ok('숙인 머리(' + 숙인최고.toFixed(1) + ')보다 봉이 ' + 여유 + 'px 넘게 위다', 판정(HB).숙이면_지난다);

console.log('\n② 그래도 «서서는» 못 지난다\n');
ok('선 머리(' + 선최저.toFixed(1) + ')보다 봉이 ' + 여유 + 'px 넘게 아래다', 판정(HB).서면_막힌다);

console.log('\n③ 봉 꼭대기는 여전히 «점프 꼭대기» 위다 (뛰어서는 못 넘는다)\n');
{
  const TOP = Math.max(HB + 46, Math.round(점프) + 30);
  ok('봉 꼭대기 ' + TOP + ' > 점프 꼭대기 ' + 점프.toFixed(0), TOP > 점프);
  ok('아래끝을 올려도 꼭대기는 «점프 잣대»에서 나온다', TOP === Math.round(점프) + 30);
}

console.log('\n🪤 덫 — 옛 값과 지나친 값으로도 돌려 본다\n');
let 덫물림 = 0;
{
  if(!판정(62).숙이면_지난다){ 덫물림++; console.log('  ✓ 옛 값 62 는 ①에서 물렸다 — 머리가 봉을 뚫었다'); }
  else console.log('  ❌ 옛 값 62 가 안 물었다 — 이 검사는 아무것도 증명하지 않는다');

  if(!판정(선최저).서면_막힌다){ 덫물림++; console.log('  ✓ 선 머리까지 올리면 ②에서 물렸다 — 서서도 지나가진다'); }
  else console.log('  ❌ 선 머리까지 올려도 안 물었다 — ②가 헐겁다');
}

console.log('\n' + (fail === 0 ? '✓ 전부 통과' : '❌ 걸린 것 ' + fail + '개') + ' · ' + (pass + fail) + '개');
console.log('🪤 덫 ' + 덫물림 + '/2 물었다');
process.exit(fail === 0 && 덫물림 === 2 ? 0 : 1);
