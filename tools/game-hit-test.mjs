/* =================== 달리기 게임 — 부딪힘 판정 검사 (2026-09-17) ===================
   사용자가 짚었다 — 「물웅덩이랑 아래로 피하는 장애물 둘 다 지나간 상태로 장애물 쪽으로
   이동하면 **분명 그림은 지나갔는데 장애물에 걸린 판정**이 나와」.

   🔴 **원인** — 부딪힘 띠(`|z| ≤ .075`)는 앞뒤가 같은데, 화면에서 «지나갔다»는 z<0 에서
     이미 끝난다(`proj` 가 z<0 을 사람보다 아래로 크게 던진다). 그래서 다른 줄에서 그것이
     지나가는 것을 보고 그 줄로 옮기면 **눈에 없는 것에 걸렸다.**
   🔵 **고침** — 뒤쪽 띠는 «그때 그 줄에서 맞이한 사람»(`it.eng`)만 본다.
     뒤쪽 띠를 둔 까닭은 «뛰어넘었다가 그 위에 내려앉는 것»을 잡으려던 것이지,
     지나간 뒤에 새로 들어온 사람을 잡으려던 것이 아니다.

   ⚠ **덫으로 잰다** — 같은 파일을 «옛 판»(고침 두 줄을 뺀 것)으로도 지어서 함께 돌린다.
     옛 판이 물지 않는 검사는 아무것도 증명하지 않는다.

   쓰는 법: node tools/game-hit-test.mjs
*/
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = readFileSync(join(ROOT, 'game-core.js'), 'utf8');

/* ── 고침 두 줄 — 이것을 빼면 «옛 판»이다 ───────────────────────────── */
const FIX = [
  "      if(it.z >= 0) it.eng = true;                     // 앞에서 맞이했다 — 끝까지 본다",
  "      else if(!it.eng) continue;                       // 이미 지나간 것 · 그때 나는 다른 줄이었다"
].join('\n');
if(!SRC.includes(FIX)){
  console.error('🔴 고침 두 줄을 game-core.js 에서 못 찾았다 — 검사가 옛 판을 못 짓는다.');
  console.error('   (줄을 고쳤으면 이 파일의 FIX 도 같이 고칠 것)');
  process.exit(1);
}

/* 브라우저 것 흉내 — 이 파일이 쓰는 것은 Image 하나뿐이다 (그리기는 안 부른다) */
function load(src){
  const Image = function(){ return { set src(v){}, get src(){ return ''; } }; };
  return new Function('Image', src + '\nreturn { MODE_RUNNER };')(Image);
}
const NEW = load(SRC).MODE_RUNNER;
const OLD = load(SRC.replace(FIX, '')).MODE_RUNNER;

/* ── 판 하나 ─────────────────────────────────────────────────────────
   그리기는 한 번도 안 부른다. `step` 이 보는 것만 채운다. */
function 판(MODE, {lane = 1, t = 0} = {}){
  /* ⚠ `stars`·`score` 는 셸(Game)이 채우는 것이라 `reset` 에 없다 — 여기서 채운다.
     안 채우면 `g.stars++` 가 NaN 이 되어 별 검사가 «조용히» 거짓이 된다. */
  const g = {
    w: 400, h: 800, pad: 0, t, ptr: null, face: 1, stars: 0, score: 0,
    roadW(){ return 360; }
  };
  MODE.reset(g);
  g.lane = g.laneF = lane;
  g.spawnZ = 999;            // 이 검사 동안에는 새 장애물이 안 난다
  g.items = [];
  return g;
}
const 놓기 = (g, lane, kind, z) => {
  const it = { lane, z, kind, hit:false, eng:false, seed:0 };
  g.items.push(it);
  return it;
};
/* n 프레임을 돌린다. 한 프레임이라도 죽으면 그 자리를 돌려준다 */
function 돌리기(MODE, g, n, dt = 1/60, 손 = null){
  for(let i = 0; i < n; i++){
    if(손) 손(g, i);
    if(MODE.step(g, dt) === false) return { alive:false, at:i };
  }
  return { alive:true, at:-1 };
}

/* ── 검사 ─────────────────────────────────────────────────────────── */
let pass = 0, fail = 0, 덫놓음 = 0, 덫물림 = 0;
function ok(name, cond){
  if(cond){ pass++; console.log('  ✓ ' + name); }
  else    { fail++; console.log('  ✗ ' + name); }
}
/* 덫 — 옛 판에서는 «반대로» 나와야 한다. 안 그러면 이 검사는 아무것도 안 잡는다 */
function 덫(name, cond){
  덫놓음++;
  if(cond){ 덫물림++; console.log('    🪤 옛 판이 물었다 — ' + name); }
  else console.log('    ⚠ 옛 판도 통과한다 — 이 검사는 고침을 증명하지 못한다: ' + name);
}

/* 사용자가 겪은 그대로 — 빈 줄(1)에 서서 양옆(0·2)이 지나가는 것을 보고, 지나간 뒤 옮긴다.
   `늦게` = 장애물이 발밑(z=0)을 지나고 몇 프레임 뒤에 손을 대는가 */
function 지나간뒤옮기기(MODE, 늦게){
  const g = 판(MODE, {lane:1});
  const 웅덩이 = 놓기(g, 0, 'low',  .5);     // 물웅덩이
  const 차단봉 = 놓기(g, 2, 'high', .5);     // 아래로 피하는 것
  /* ① 빈 줄(1)에 서서 양옆이 «발밑을 지날» 때까지 본다 */
  let n = 0;
  while(웅덩이.z > 0 && n < 600){
    if(MODE.step(g, 1/60) === false) return { alive:false, when:'지나기 전' };
    n++;
  }
  /* ② 몇 프레임 더 기다린다 — 눈에는 이미 지나간 뒤다 */
  for(let i = 0; i < 늦게; i++){
    if(MODE.step(g, 1/60) === false) return { alive:false, when:'기다리는 중' };
  }
  /* ③ 「장애물 쪽으로 이동」 */
  g.lane = 2;
  const r = 돌리기(MODE, g, 40);
  return { alive: r.alive, when:'옮기는 중', z: 차단봉.z };
}

console.log('\n① 🔴 지나간 것에 «옆에서» 들어가 부딪히던 것 (사용자가 짚은 자리)\n');
for(const 늦게 of [0, 1, 2]){
  const n = 지나간뒤옮기기(NEW, 늦게);
  ok(`발밑을 지나고 ${늦게} 프레임 뒤에 그 줄로 옮겨도 안 걸린다`, n.alive);
  덫(`옛 판은 ${늦게} 프레임 뒤에 걸렸다`, !지나간뒤옮기기(OLD, 늦게).alive);
}
/* 🔵 **옛 판의 «죽는 창»이 얼마나 넓었는지 적어 둔다** — 좁다고 없는 일이 아니다.
   지나가자마자 옮기는 것이 이 게임의 «제일 좋은 수»라, 잘하는 사람일수록 이 창에 들어간다. */
{
  for(const t of [0, 40, 90]){
    let last = -1;
    for(let f = 0; f <= 20; f++){
      const g = 판(OLD, {lane:1, t});
      const a = 놓기(g, 0, 'low', .5), b = 놓기(g, 2, 'high', .5);
      let n = 0, dead = false;
      while(a.z > 0 && n < 900){ if(OLD.step(g, 1/60) === false){ dead = true; break; } n++; }
      if(dead) continue;
      for(let i = 0; i < f && !dead; i++) if(OLD.step(g, 1/60) === false) dead = true;
      if(dead) continue;
      g.lane = 2;
      if(!돌리기(OLD, g, 40).alive) last = f;
    }
    console.log(`    · 옛 판 — ${t}초 지점: 지나고 ${last < 0 ? '0' : last + 1}프레임(${
      ((last + 1) / 60 * 1000).toFixed(0)}ms) 안에 옮기면 걸렸다`);
  }
}

console.log('\n② 뒤쪽 띠를 둔 «원래 까닭»은 그대로다 — 넘었다가 그 위에 내려앉으면 걸린다\n');
{
  /* 내 줄의 물웅덩이를 뛰어넘되, 아직 띠 안(z<0)일 때 땅에 닿게 한다.
     ⚠ **띠에 «닿기 전»에 눌러야 한다** — 누른 그 프레임의 높이는 아직 0에 가까워서
       띠 안에서 누르면 그냥 걸린다(처음에 검사를 그렇게 짰다가 헛다리를 짚었다).
       문턱(h·.055)을 넘는 데 네 프레임쯤 걸리므로 z=.18 에서 누른다. */
  const g = 판(NEW, {lane:1});
  const it = 놓기(g, 1, 'low', .35);
  let n = 0, died = false;
  while(it.z > .18 && n < 600){ if(NEW.step(g, 1/60) === false){ died = true; break; } n++; }
  NEW.up(g);
  /* 앞쪽 띠는 뛰어서 지난다 — 뒤쪽 띠에 들어서면 «내려앉는다» */
  const r = 돌리기(NEW, g, 40, 1/60, (gg) => { if(it.z < 0){ gg.jy = 0; gg.jv = 0; } });
  ok('🔴 뛰어넘었다가 장애물 «위»에 내려앉으면 걸린다 (2026-09-02 에 고친 것이 안 풀렸다)',
      !died && !r.alive);
}

console.log('\n③ 앞에서 그 줄로 뛰어들면 여전히 걸린다 (고침이 «다 열어 준» 것이 아니다)\n');
{
  const g = 판(NEW, {lane:1});
  const it = 놓기(g, 2, 'block', .5);
  let n = 0;
  while(it.z > .06 && n < 600){ NEW.step(g, 1/60); n++; }
  g.lane = 2;                                   // 아직 앞에 있는데 그 줄로 들어간다
  const r = 돌리기(NEW, g, 40);
  ok('아직 앞(z>0)에 있는 장애물 줄로 들어가면 걸린다', !r.alive);
}

console.log('\n④ 종류마다 «피하는 법»은 그대로다\n');
{
  /* ⚠ 여기도 «띠에 닿기 전»(z=.18)에 손을 댄다 — 위 ②의 주석과 같은 까닭 */
  const 한판 = (kind, 손) => {
    const g = 판(NEW, {lane:1});
    const it = 놓기(g, 1, kind, .5);
    let n = 0;
    while(it.z > .18 && n < 600){ if(NEW.step(g, 1/60) === false) return false; n++; }
    if(손) 손(g);
    return 돌리기(NEW, g, 40).alive;
  };
  ok('물웅덩이 — 뛰면 산다',        한판('low',  g => NEW.up(g)));
  ok('물웅덩이 — 그냥 가면 걸린다', !한판('low',  null));
  ok('차단봉 — 미끄러지면 산다',    한판('high', g => NEW.down(g)));
  ok('차단봉 — 그냥 가면 걸린다',  !한판('high', null));
  ok('차 — 뛰어도 걸린다 (줄을 바꾸는 수밖에)', !한판('block', g => NEW.up(g)));
}

console.log('\n⑤ 별은 건드리지 않았다\n');
{
  const g = 판(NEW, {lane:1});
  놓기(g, 1, 'star', .5);
  const r = 돌리기(NEW, g, 300);
  ok('내 줄의 별은 먹힌다', r.alive && g.stars === 1);

  const g2 = 판(NEW, {lane:1});
  놓기(g2, 0, 'star', .5);
  돌리기(NEW, g2, 300);
  ok('다른 줄의 별은 안 먹힌다', g2.stars === 0);
}

console.log('\n⑥ 지나간 뒤에도 «계속 그 줄에 있었으면» 이야기가 다르다\n');
{
  /* 내 줄로 오는 차를 피하지 않으면 앞쪽 띠에서 이미 걸린다 — 고침이 이것을 늦추지 않는다 */
  const g = 판(NEW, {lane:1});
  const it = 놓기(g, 1, 'block', .5);
  const r = 돌리기(NEW, g, 300);
  ok('내 줄의 차는 «앞쪽 띠»에서 걸린다', !r.alive && it.z > -.075);
}

console.log('\n' + (fail === 0 ? '✓ 전부 통과' : '❌ 걸린 것 ' + fail + '개') + ' · ' + (pass + fail) + '개');
console.log('🪤 덫 ' + 덫물림 + '/' + 덫놓음 + ' 물었다' + (덫물림 === 덫놓음 ? '' : ' — 안 문 덫은 지울지 고칠지 정할 것'));
process.exit(fail === 0 && 덫물림 > 0 ? 0 : 1);
