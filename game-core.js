/* =================== 출석 도장 게임 — 셸과 갈래 (2026-09-01 · S-D-3) ===================
   🔴 **이 파일은 index.html 과 game.html 이 «함께» 쓴다.** 연습 페이지를 만들면서
     코드를 복사하려다 말았다 — 두 벌이 되면 한쪽만 고쳐지는 날이 반드시 온다.
   ⚠ 여기는 «게임»만 안다. 도장·순위·하루 한 판·주 로테이션은 index.html 의 일이다.
     그래서 이 파일은 DATA·state·dbSet 을 한 번도 안 본다. */
/* ---------- 게임 셸 ----------
   캔버스 하나 · 루프 하나 · 입력 한 벌. 게임이 바뀌면 _step 과 _draw 만 갈아 끼운다.
   ⚠ 지켜야 할 것 셋 —
     ① 캔버스는 #app «밖»(#gamehost)에 둔다. render() 가 app.innerHTML 을 갈아치운다
     ② 화면을 떠나면 반드시 stop() 한다. 안 그러면 루프와 리스너가 살아남는다
     ③ 점수는 «판이 끝날 때 한 번»만 저장한다. 루프 안에서 저장하면 초당 60번 쓴다 */
const CHAR_IMG = new Image();
CHAR_IMG.src = 'game-char.webp';
const CHAR_ANCHOR = 0.479;     // «색이 있는 픽셀»의 무게중심. 상자 중앙이 아니다
const CHAR_H = 46;
(new Image()).src = 'stamp.webp';   // 미리 받아 둔다 — 찍히는 순간에 늦게 뜨면 «쿵»이 죽는다

/* ---------- 갈래 ① 똥피하기 ---------- */
const MODE_DODGE = {
  reset(g){
    g.spawnIn = .6; g.items = [];
    g.px = g.w / 2; g.py = g.h - 58; g.face = 1;
  },
  step(g, dt){
    /* 손가락을 «따라가되» 즉시 붙지는 않는다. 붙여 버리면 조작감이 없다 */
    const pr = 15, was = g.px;
    if(g.ptr !== null) g.px += (g.ptr - g.px) * Math.min(1, dt * 14);
    const k = (g.keys.r ? 1 : 0) - (g.keys.l ? 1 : 0);
    if(k) g.px += k * 300 * dt;
    if(g.px < pr) g.px = pr;
    if(g.px > g.w - pr) g.px = g.w - pr;
    /* ⚠ 문턱을 둔다. 0 이면 제자리에서 좌우가 깜빡인다 */
    const moved = g.px - was;
    if(moved > .5) g.face = 1; else if(moved < -.5) g.face = -1;

    /* 난이도 — **서로 다른 시각에 오르는 셋**.
       ⚠ 개수를 따로 올리는 것이 핵심이다. 속도만 올리면 화면은 오히려 «비어» 보인다 —
         빨리 떨어질수록 화면에 머무는 시간이 짧아지기 때문이다.
       ⚠ 처음 30초는 일부러 느슨하게 둔다. 초반부터 조이면 뒤쪽 단계를 아무도 못 본다. */
    const fall = Math.min(155 + g.t * 9, 540);
    g.spawnIn -= dt;
    if(g.spawnIn <= 0){
      g.spawnIn = Math.max(.14, .70 - g.t * .016);
      const burst = g.t > 80 ? 4 : g.t > 55 ? 3 : g.t > 30 ? 2 : 1;
      const r = 13, xs = [];
      for(let b = 0; b < burst; b++){
        /* ⚠ 한 번에 여럿을 낼 때 서로 붙여 놓으면 «피할 수 없는 벽»이 된다 */
        let x, tries = 0, ok;
        do{
          x = r + Math.random() * (g.w - r * 2);
          ok = !xs.some(v => Math.abs(v - x) < 58);
          tries++;
        } while(!ok && tries < 14);
        xs.push(x);
        g.items.push({x, y: -r - b * 7, r,
          v: fall * (.85 + Math.random() * .3), star: Math.random() < .16});
      }
    }

    for(let i = g.items.length - 1; i >= 0; i--){
      const it = g.items[i];
      it.y += it.v * dt;
      /* ⚠ 판정은 그림보다 «작게» 잡는다. 후하지 않으면 억울하고, 억울하면 안 한다 */
      const dx = it.x - g.px, dy = it.y - g.py, reach = it.r * .72 + 10;
      if(dx*dx + dy*dy < reach*reach){
        if(it.star){ g.stars++; g.items.splice(i,1); continue; }
        return false;
      }
      if(it.y > g.h + it.r) g.items.splice(i,1);
    }
    return true;
  },
  draw(g){
    const c = g.cx, w = g.w, h = g.h;
    c.strokeStyle = '#E7E5DE'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(0, g.py + 22.5); c.lineTo(w, g.py + 22.5); c.stroke();
    c.textAlign = 'center'; c.textBaseline = 'middle';
    for(const it of g.items){
      c.font = (it.r * 2) + 'px serif';
      c.fillText(it.star ? '⭐' : '💩', it.x, it.y);
    }
    g._player(g.px, g.py, g.face);
  }
};

/* ---------- 달리는 사람 그림 (2026-09-01 · S-D-3) ----------
   사용자가 준 시트(`책표지/캐릭터.png`)에서 열두 칸을 골라 게임 크기로 묶었다.
   🔵 **배경은 손댈 것이 없었다** — 알파가 이미 캐릭터를 가르고 있다.
   ⚠ 칸 하나가 86×119다. **바닥을 맞추고 가로는 «캐릭터의 가운데»로** 맞춰 두었으므로,
     그릴 때도 바닥 기준으로 놓아야 달릴 때 키가 안 흔들린다. */
const RUN_IMG = new Image();
RUN_IMG.src = 'run-sprite.png';
const RUN_CW = 86, RUN_CH = 119;
const RUN_SEQ = {
  run:   [0,1,2,3,4,5],
  jump:  [6,7],
  fall:  [8,9],
  slide: [10,11]
};

/* ---------- 갈래 ② 달리기 — 3레인 러너 (2026-09-01 · S-D) ----------
   사용자가 시킨 것 —
   · 조작: ←→ 레인 · ↑/Space 점프 · ↓ 슬라이드 / 폰은 **스와이프 우선**(큰 버튼 없이)
   · 화면: 학생관리 디자인 시스템과 어울리게. 단순한 도로·3레인·하늘·장애물·캐릭터·점수·속도
   · 장애물 **세 종류 이상** — 뛰어넘는 것 · 레인을 바꿔야 하는 것 · 슬라이드로 지나는 것
   · 멀리서 다가오게 만들어 **앞으로 나아가는 것처럼** 보이게. 난이도는 시간이 지날수록

   🔴 **원근을 준 것이 이 판의 핵심이다.** 위에서 아래로 «떨어지게» 두면 피하기 게임이지
     달리기가 아니다. 장애물에 «깊이(z)»를 주고 지평선에서 커지며 다가오게 했다.
   🔵 **색은 화면에서 읽어 온다**(`--paper`·`--ink`…). 캔버스는 CSS 변수를 모르므로
     mount 할 때 한 번 읽어 둔다 — 디자인 시스템이 바뀌면 게임도 따라간다.
   ⚠ **바깥 그림은 캐릭터 하나뿐이다.** 하늘·도로·장애물은 전부 도형이다(사용자가 그렇게 정했다). */
const MODE_RUNNER = {
  /* 깊이 — 0이 사람 발밑, Z_FAR가 지평선이다 */
  Z_FAR: 1,
  reset(g){
    g.lane = 1; g.lanes = 3; g.laneF = 1;        // laneF = 부드럽게 따라가는 «지금 자리»
    g.items = []; g.spawnZ = .55; g.freeLane = 1;
    /* 🔴 **점프는 «높이»로 다룬다** (2026-09-01). 예전에는 0~1짜리 값을 `sin(v·π)`로 옮겼는데,
       그 값을 **1에서 시작**해 버려서 `sin(π)=0` — **올라가는 내내 높이가 0**이었다.
       그래서 «누르고 한참 있다 뛰는» 것으로 보였다. 이제 그냥 위로 던지고 중력으로 내린다. */
    g.jy = 0; g.jv = 0; g.slide = 0; g.anim = 0; g.road = 0;
    g.dist = 0; g.hurtAt = -9;
    /* 🔴 사람을 위로 올린다 (2026-09-02 · 사용자가 짚었다) — 발밑에 길이 더 남아야
       그 길이 «내 뒤로 흘러가는» 것이 보이고, 그래야 앞으로 나아가는 느낌이 든다. */
    g.py = Math.round(g.h * .70);                 // 사람이 서는 자리(바닥선)
    g.horizon = Math.round(g.h * .30);
  },
  /* ── 조작 ── */
  key(g, k, down){
    if(!down) return;
    if(k === 'ArrowLeft')  this.move(g, -1);
    if(k === 'ArrowRight') this.move(g, 1);
    if(k === 'ArrowUp' || k === ' ' || k === 'Spacebar') this.up(g);
    if(k === 'ArrowDown')  this.down(g);
  },
  /* 🔵 **스와이프를 먼저 본다** — 사용자가 그렇게 정했다. 큰 버튼을 두지 않는다.
     ⚠ 문턱(28px)이 없으면 «누르기»가 전부 스와이프로 읽혀 손가락을 뗄 때마다 뛴다. */
  swipe(g, dx, dy){
    const ax = Math.abs(dx), ay = Math.abs(dy);
    if(ax < 28 && ay < 28){ this.up(g); return; }   // 그냥 누르면 점프 — 러너의 관행이다
    if(ax > ay) this.move(g, dx > 0 ? 1 : -1);
    else if(dy < 0) this.up(g);
    else this.down(g);
  },
  move(g, d){
    const n = Math.max(0, Math.min(2, g.lane + d));
    if(n !== g.lane){ g.lane = n; g.face = d; }
  },
  /* 뛰는 높이와 떠 있는 시간을 «화면 크기»로 잡는다 — 폰에서도 같은 느낌이 되어야 한다.
     꼭대기 = 화면의 0.17 · 떠 있는 시간 ≈ 0.62초. 거기서 중력과 처음 속도가 나온다. */
  jumpG(g){ return 3.54 * g.h; },
  up(g){ if(g.jy <= 0 && g.slide <= 0) g.jv = 1.10 * g.h; },
  down(g){ if(g.jy <= 0) g.slide = .52; },

  /* ── 한 걸음 ── */
  step(g, dt){
    /* 난이도 셋 — 사용자가 말한 초반·중반·후반이 그대로 값이 된다.
       ⚠ 속도와 «사이»를 따로 올린다. 속도만 올리면 화면이 오히려 비어 보인다. */
    const ph = g.t < 25 ? 0 : g.t < 60 ? 1 : 2;
    const spd = Math.min(.62 + g.t * .011, 1.75);          // 다가오는 빠르기(깊이/초)
    const gapZ = ph === 0 ? .62 : ph === 1 ? .50 : .40;    // 물결 사이 «거리»
    g.dist += spd * dt * 34;
    g.road = (g.road + spd * dt * 3.2) % 1;

    /* 레인은 «짧게, 그러나 부드럽게» 옮긴다 (사용자가 답답하지 않게 해 달라 했다) */
    g.laneF += (g.lane - g.laneF) * Math.min(1, dt * 19);
    /* 점프 — 던지고 중력으로 내린다. jy가 0이면 땅이다.
       ⚠ **누른 그 프레임부터 곧장 오른다** — 이것이 «딜레이»의 답이다. */
    if(g.jv !== 0 || g.jy > 0){
      g.jv -= this.jumpG(g) * dt;
      g.jy += g.jv * dt;
      if(g.jy <= 0){ g.jy = 0; g.jv = 0; }
    }
    if(g.slide > 0){ g.slide -= dt; if(g.slide < 0) g.slide = 0; }
    g.anim += dt * (7 + spd * 3);

    /* ── 장애물을 낸다 ──
       🔴 **빈 줄을 «이어» 놓는다** — 다음에 비울 줄은 지난번 빈 줄의 옆 칸까지다.
         이것이 없으면 물결이 겹쳐 «피할 수 없는 벽»이 된다(09-01에 검사로 잡았다). */
    g.spawnZ -= spd * dt;
    if(g.spawnZ <= 0){
      g.spawnZ = gapZ;
      const near = [g.freeLane-1, g.freeLane, g.freeLane+1].filter(l => l >= 0 && l < 3);
      const free = near[Math.floor(Math.random() * near.length)];
      g.freeLane = free;
      const others = [0,1,2].filter(l => l !== free);
      /* 중반부터 두 줄, 후반에 가끔 «빈 줄 하나만» 남는 판 */
      const many = ph === 0 ? 1 : (ph === 1 ? (Math.random() < .35 ? 2 : 1)
                                            : (Math.random() < .6 ? 2 : 1));
      const lanes = many === 2 ? others : [others[Math.floor(Math.random()*2)]];
      lanes.forEach(l => {
        /* 종류 — 초반은 «비켜 가는 것»만, 그다음 뛰는 것, 후반에 슬라이드까지 */
        const r = Math.random();
        const kind = ph === 0 ? (r < .65 ? 'block' : 'low')
                   : ph === 1 ? (r < .45 ? 'block' : r < .8 ? 'low' : 'high')
                              : (r < .34 ? 'block' : r < .67 ? 'low' : 'high');
        g.items.push({lane:l, z:this.Z_FAR, kind, hit:false});
      });
      /* 별은 «빈 줄»에만. 장애물과 겹치면 먹으러 갔다가 죽는다 */
      if(Math.random() < .34) g.items.push({lane:free, z:this.Z_FAR, kind:'star', hit:false});
    }

    /* ── 다가오게 하고, 부딪히는지 본다 ──
       🔴 **한 순간만 보고 «넘었다»로 굳히면 안 된다** (2026-09-02 · 사용자가 짚었다).
         예전에는 띠에 들어온 첫 프레임에 `hit`을 찍고 그 판정을 끝까지 썼다. 그래서
         **뛰어올랐다가 장애물 위에서 내려앉아도 «넘은 것»으로 남았다.**
         이제 몸이 겹치는 **모든 프레임**을 본다 — 한 프레임이라도 안전하지 않으면 부딪힌 것이다. */
    for(let i = g.items.length - 1; i >= 0; i--){
      const it = g.items[i];
      it.z -= spd * dt;
      if(it.z < -.16){ g.items.splice(i, 1); continue; }
      if(Math.abs(it.lane - g.laneF) > .45) continue;
      if(it.kind === 'star'){
        if(!it.hit && Math.abs(it.z) < .09){ it.hit = true; g.stars++; g.items.splice(i, 1); }
        continue;
      }
      if(Math.abs(it.z) > .075) continue;              // 아직 몸에 안 닿았다
      /* 🔵 **어떻게 피하는지가 종류마다 다르다** — 이것이 이 게임의 전부다 */
      const safe = it.kind === 'low'  ? (g.jy > g.h * .055)   // 낮은 것 — 뛰어넘는다
                 : it.kind === 'high' ? (g.slide > 0)         // 높은 것 — 미끄러져 지난다
                 : false;                                     // block — 줄을 바꾸는 수밖에
      if(!safe) return false;
    }
    return true;
  },

  /* ── 그리기 ── */
  /* 깊이 → 화면. 1/(1+z) 꼴이라 멀수록 촘촘해진다 — 그것이 «다가오는» 느낌을 만든다 */
  proj(g, z){
    const k = 1 / (1 + Math.max(0, z) * 3.1);
    return { y: g.horizon + (g.py - g.horizon) * k, k };
  },
  /* 🔴 **한 줄의 폭은 «도로의 1/3»이다.** 처음엔 0.62 같은 어림수를 곱했다가
     장애물이 도로 밖으로 튀어나왔다 — 줄과 장애물이 서로 다른 잣대를 보고 있었다.
     이제 자리도 폭도 이 함수 하나에서 나온다. */
  laneW(g, k){ return g.roadW() / 3 * k; },
  laneCX(g, laneF, k){ return g.w / 2 + (laneF - 1) * this.laneW(g, k); },
  /* 🔴 **길의 반폭도 같은 k에서 나온다** (2026-09-02). 예전에는 길을 «화면 맨 아래»의 폭으로
     그려 놓고 줄은 «사람 자리»의 폭으로 놓았다. 둘이 어긋나서 **바깥 줄이 길 끝에 바짝 붙어**
     캐릭터가 옆으로 치우쳐 보였다 — 사용자가 짚은 그 자리다. */
  roadHalf(g, k){ return g.roadW() / 2 * k; },
  kAtY(g, y){ return (y - g.horizon) / (g.py - g.horizon); },
  draw(g){
    const c = g.cx, w = g.w, h = g.h, C = g.col;
    /* 하늘 — 단순한 두 색. 사용자가 «복잡하게 하지 말라» 했다 */
    const sky = c.createLinearGradient(0, 0, 0, g.horizon);
    sky.addColorStop(0, C.sky0); sky.addColorStop(1, C.sky1);
    c.fillStyle = sky; c.fillRect(0, 0, w, g.horizon);
    /* 땅 */
    c.fillStyle = C.ground; c.fillRect(0, g.horizon, w, h - g.horizon);
    c.strokeStyle = C.line; c.lineWidth = 1;
    c.beginPath(); c.moveTo(0, g.horizon + .5); c.lineTo(w, g.horizon + .5); c.stroke();

    /* 도로 — 지평선의 한 점에서 발밑으로 벌어지는 사다리꼴 */
    const far = this.proj(g, this.Z_FAR);
    const kb = this.kAtY(g, h);                       // 화면 아래끝의 잣대(1보다 크다)
    const nx = this.roadHalf(g, kb), fx = this.roadHalf(g, far.k);
    c.fillStyle = C.road;
    c.beginPath();
    c.moveTo(w/2 - fx, far.y); c.lineTo(w/2 + fx, far.y);
    c.lineTo(w/2 + nx, h);     c.lineTo(w/2 - nx, h);
    c.closePath(); c.fill();

    /* 줄 사이 선 — 흐르면 «달리는 중»이 된다. 이 게임의 속도감은 전부 여기서 온다 */
    c.strokeStyle = C.line; c.lineWidth = 2;
    for(let i = 1; i < 3; i++){
      c.beginPath();
      for(let s = 0; s <= 23; s++){
        const z = this.Z_FAR * s / 20 - this.Z_FAR * .12, p = this.proj(g, z);
        const x = w/2 + (i - 1.5) * this.laneW(g, p.k);
        s ? c.lineTo(x, p.y) : c.moveTo(x, p.y);
      }
      c.stroke();
    }
    /* 가로 줄무늬 — 흐르는 것이 눈에 보여야 «앞으로 간다»가 된다 */
    c.strokeStyle = C.line2; c.lineWidth = 2;
    for(let s = 0; s < 12; s++){
      /* 🔴 **빼야 다가온다.** 더하면 줄무늬의 깊이가 «커져» 지평선 쪽으로 멀어진다 —
         장애물은 다가오는데 바닥은 멀어지니 **뒤로 달리는 것처럼** 보였다.
         사용자가 실제로 해 보고 짚은 그 자리다(2026-09-01). */
      /* ⚠ 사람 «뒤»(z<0)까지 이어 그린다 (2026-09-02 · 사용자가 짚었다) — 사람 앞에서 끊기면
         발밑에서 길이 사라져 «제자리걸음»처럼 보인다. 뒤로 흘러 나가야 앞으로 가는 것이다. */
      const z = ((((s - g.road) % 12) + 12) % 12 / 12) * (this.Z_FAR * 1.3) - this.Z_FAR * .3;
      if(z < -this.Z_FAR * .29) continue;
      const p = this.proj(g, z), x = this.roadHalf(g, p.k);
      c.globalAlpha = Math.max(0, Math.min(1, 1 - z / this.Z_FAR));
      c.beginPath(); c.moveTo(w/2 - x, p.y); c.lineTo(w/2 + x, p.y); c.stroke();
    }
    /* 길가 표시 — 줄무늬와 «같은 방향»으로 다가온다. 앞으로 간다는 것을 옆에서도 말해 준다 */
    c.fillStyle = C.line2;
    for(let s = 0; s < 6; s++){
      const z = ((((s - g.road * .8) % 6) + 6) % 6 / 6) * this.Z_FAR;
      const q = this.proj(g, z), rx = this.roadHalf(g, q.k);
      const sz = Math.max(1, 7 * q.k);
      c.globalAlpha = Math.max(0, .85 - z / this.Z_FAR);
      c.fillRect(w/2 - rx - sz * 1.6, q.y - sz, sz, sz * 2);
      c.fillRect(w/2 + rx + sz * .6,  q.y - sz, sz, sz * 2);
    }
    c.globalAlpha = 1;

    /* 장애물 — 먼 것부터 그린다(뒤엣것이 앞엣것에 가려야 한다) */
    const sorted = g.items.slice().sort((a,b) => b.z - a.z);
    for(const it of sorted) this.obstacle(g, it);

    /* 사람 */
    this.player(g);

    /* 속도 — 사용자가 «현재 속도 또는 진행 상태»를 달라고 했다 */
    const spd = Math.min(.62 + g.t * .011, 1.75);
    const pct = (spd - .62) / (1.75 - .62);
    c.fillStyle = C.line; c.fillRect(14, 14, 74, 4);
    c.fillStyle = C.accent; c.fillRect(14, 14, 74 * Math.max(.04, pct), 4);
    c.fillStyle = C.dim; c.font = '10px Pretendard, sans-serif';
    c.textAlign = 'left'; c.textBaseline = 'top';
    c.fillText(Math.round(g.dist) + 'm', 14, 23);
  },

  /* 🔴 **모양이 곧 «무엇을 하라»는 말이어야 한다** (2026-09-02 · 사용자가 짚었다).
     색만 다르고 다 네모라 무엇을 하는 것인지 구분이 안 갔다. 셋을 다른 «물건»으로 그린다 —
     허들(다리 둘 + 가로대) · 매달린 가로대(위에서 내려온 끈) · 통행 차단대(빗금 판).
     ⚠ 높은 것에 **바닥 받침대를 두지 않는다** — 밑이 막혀 보이면 «지나갈 수 있다»가 안 읽힌다.
     ⚠ 가까워지면 작은 화살표를 얹는다(↑ 뛰기 · ↓ 미끄러지기). 멀 때는 안 그린다 — 글자가 뭉갠다. */
  obstacle(g, it){
    const c = g.cx, C = g.col, p = this.proj(g, it.z);
    if(p.k < .02) return;
    const x = this.laneCX(g, it.lane, p.k);
    const lw = this.laneW(g, p.k) * .8;
    const H0 = 78 * p.k;                              // 사람 키쯤
    const near = p.k > .55;                           // 가까울 때만 화살표를 적는다
    c.textAlign = 'center'; c.textBaseline = 'middle';

    if(it.kind === 'star'){
      c.fillStyle = C.star;
      c.font = Math.max(9, 30 * p.k) + 'px serif';
      c.fillText('★', x, p.y - 40 * p.k);
      return;
    }
    if(it.kind === 'low'){
      /* 허들 — 다리 둘 위에 가로대 하나. «뛰어넘는 것»의 생김새다 */
      const top = p.y - H0 * .40, bar = Math.max(2, H0 * .11), leg = Math.max(1.5, lw * .07);
      c.fillStyle = C.low;
      c.fillRect(x - lw * .40, top, leg, H0 * .40);
      c.fillRect(x + lw * .40 - leg, top, leg, H0 * .40);
      this.box(c, x - lw / 2, top, lw, bar, bar * .4);
      c.globalAlpha = .5;
      c.fillRect(x - lw * .34, top + bar * 1.9, lw * .68, Math.max(1, bar * .45));
      c.globalAlpha = 1;
      if(near){ c.fillStyle = C.low; c.font = '700 ' + Math.round(13 * p.k) + 'px Pretendard, sans-serif';
        c.fillText('↑', x, top - 11 * p.k); }
      return;
    }
    if(it.kind === 'high'){
      /* 위에서 내려온 가로대 — **밑이 뻥 뚫려** 있어야 «미끄러져 지난다»가 읽힌다.
         끈은 «위로» 뻗는다. 바닥으로 내리면 못 지나가는 것처럼 보인다. */
      const bot = p.y - H0 * .62, hh = H0 * .34;
      c.strokeStyle = C.high; c.lineWidth = Math.max(1, 1.6 * p.k);
      c.beginPath();
      c.moveTo(x - lw * .3, bot - hh); c.lineTo(x - lw * .3, bot - hh - H0 * .3);
      c.moveTo(x + lw * .3, bot - hh); c.lineTo(x + lw * .3, bot - hh - H0 * .3);
      c.stroke();
      c.fillStyle = C.high;
      this.box(c, x - lw / 2, bot - hh, lw, hh, 3 * p.k);
      if(near){ c.fillStyle = C.high; c.font = '700 ' + Math.round(13 * p.k) + 'px Pretendard, sans-serif';
        c.fillText('↓', x, p.y - H0 * .18); }
      return;
    }
    /* 통행 차단대 — 빗금 판. «못 지나간다»는 말은 빗금이 제일 잘 한다 */
    const top = p.y - H0;
    c.fillStyle = C.block;
    this.box(c, x - lw / 2, top, lw, H0, 3 * p.k);
    c.save();
    c.beginPath(); c.rect(x - lw / 2, top, lw, H0); c.clip();
    c.globalAlpha = .28; c.strokeStyle = '#FFFFFF'; c.lineWidth = Math.max(2, lw * .13);
    for(let d = -H0; d < lw + H0; d += Math.max(6, lw * .3)){
      c.beginPath(); c.moveTo(x - lw / 2 + d, top + H0); c.lineTo(x - lw / 2 + d + H0, top); c.stroke();
    }
    c.restore(); c.globalAlpha = 1;
    if(near){ c.fillStyle = C.block; c.font = '700 ' + Math.round(12 * p.k) + 'px Pretendard, sans-serif';
      c.fillText('↔', x, top - 10 * p.k); }
  },
  box(c, x, y, w, h, r){
    c.beginPath();
    if(c.roundRect) c.roundRect(x, y, w, h, Math.max(1, r)); else c.rect(x, y, w, h);
    c.fill();
  },

  player(g){
    const c = g.cx, C = g.col;
    const k = 1;                                     // 사람은 늘 발밑(z=0)이다
    const x = this.laneCX(g, g.laneF, k);
    const lift = g.jy;
    const y = g.py - lift;
    const sliding = g.slide > 0;
    const seq = sliding ? RUN_SEQ.slide
              : g.jy > 0 ? (g.jv > 0 ? RUN_SEQ.jump : RUN_SEQ.fall)
              : RUN_SEQ.run;
    const fi = seq[Math.floor(g.anim) % seq.length];

    /* 그림자 — 발밑에 두면 «떠 있는 정도»가 보인다. 점프의 높이를 이것이 말해 준다 */
    c.globalAlpha = .16 - Math.min(.1, lift / g.h * .5);
    c.fillStyle = C.ink;
    c.beginPath(); c.ellipse(x, g.py + 2, 22 - lift * .03, 6, 0, 0, 6.2832); c.fill();
    c.globalAlpha = 1;

    /* 🔴 **칸을 «같은 배율»로 그린다** (2026-09-02 · 사용자가 짚었다).
       예전에는 슬라이드일 때 높이를 46으로 줄여 그렸다 — 칸 안에서 이미 낮은 자세인데
       거기에 또 줄이니 **사람이 통째로 작아졌다.** 칸은 바닥을 맞춰 묶어 두었으므로
       배율 하나로 그리면 자세만 낮아지고 «몸집»은 그대로다. */
    const S = 78 / RUN_CH;                            // 칸 하나를 78px 높이로
    const ww = RUN_CW * S, hh = RUN_CH * S;
    if(RUN_IMG.complete && RUN_IMG.naturalWidth){
      c.drawImage(RUN_IMG, fi * RUN_CW, 0, RUN_CW, RUN_CH,
        Math.round(x - ww/2), Math.round(y - hh), Math.round(ww), Math.round(hh));
    }else{
      /* 그림을 못 읽어도 게임은 돌아야 한다 */
      c.fillStyle = C.accent;
      const fh = sliding ? 26 : 58;
      this.box(c, x - 13, y - fh, 26, fh, 6);
    }
  }
};

const Game = {
  cv:null, cx:null, w:0, h:0,
  raf:0, running:false, started:false,
  t:0, last:0, spawnIn:0,
  px:0, py:0, items:[], score:0, stars:0,
  face:1, onScore:null, onEnd:null,
  ptr:null, keys:null, _h:null, sw:null, col:null, tips:null,
  mode:null, lane:1, lanes:3, road:0,

  /* 3레인 자리 계산 — 길은 화면 가운데에 두되 너무 넓히지 않는다.
     폰을 가로로 눕혀도 줄이 손 닿는 곳에 있어야 한다. */
  roadW(){ return Math.min(this.w, 330); },
  roadX(){ return (this.w - this.roadW()) / 2; },
  laneW(){ return this.roadW() / 3; },
  laneX(i){ return this.roadX() + this.laneW() * (i + .5); },

  /* 🔵 **색을 화면에서 읽어 온다** (2026-09-01 · S-D). 캔버스는 CSS 변수를 모르므로
     한 번 읽어 둔다 — 디자인 시스템(ds.css)이 바뀌면 게임 색도 따라간다.
     ⚠ 값이 비어 있을 수 있다(옛 브라우저·읽기 실패) — 그때 쓸 것을 옆에 둔다. */
  readColors(){
    const cs = getComputedStyle(document.documentElement);
    const v = (k, d) => (cs.getPropertyValue(k) || '').trim() || d;
    const paper = v('--paper', '#FAF9F6'), line = v('--line', '#E7E5DE');
    return {
      /* 🔵 하늘은 옅은 파랑(성적 칸의 `--bluebg`)에서 종이색으로 내려온다.
         둘 다 흰색이면 지평선이 안 보이고, 지평선이 없으면 «달린다»가 아니라 «떠 있다»가 된다. */
      sky0: v('--bluebg', '#E8EFF4'), sky1: paper,
      ground: v('--hover', '#FBFAF6'), road: v('--line2', '#F1EFE9'),
      line: line, line2: v('--accent-line', '#D5D0CA'),
      ink: v('--ink', '#22221E'), dim: v('--dim', '#96968C'),
      accent: v('--accent', '#3F3537'),
      low: v('--late', '#9A7000'),      // 뛰어넘는 것 — 노랑
      high: v('--leave', '#6B46A8'),    // 미끄러져 지나는 것 — 보라
      block: v('--no', '#B03A2E'),      // 비켜 가는 수밖에 없는 것 — 빨강
      star: v('--brand', '#BA5054')
    };
  },
  mount(cv, o){
    o = o || {};
    this.stop();
    this.mode = o.mode || MODE_DODGE;
    this.tips = o.tips || null;
    this.col = this.readColors();
    this.cv = cv;
    const wrap = cv.parentNode;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = wrap.clientWidth, h = wrap.clientHeight;
    /* ⚠ width 를 넣는 순간 컨텍스트가 초기화된다. transform 은 «그 뒤에» 건다 */
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    cv.style.width = w + 'px'; cv.style.height = h + 'px';
    this.cx = cv.getContext('2d');
    this.cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.w = w; this.h = h;
    this.onScore = o.onScore || null; this.onEnd = o.onEnd || null;

    this.started = false;
    this.t = 0; this.score = 0; this.stars = 0;
    this.ptr = null; this.keys = {l:false, r:false};
    this.mode.reset(this);            // 자리·장애물·난이도는 갈래가 정한다

    const self = this;
    this._h = {
      down(e){
        const x = self._x(e);
        const first = !self.started;
        self.started = true; self.ptr = x;
        self.sw = first ? null : {x: e.clientX, y: e.clientY};   // 스와이프 시작점
        e.preventDefault();
      },
      /* ⚠ move 를 캔버스에 걸면 손가락이 밖으로 나갔을 때 놓친다. window 에 건다 */
      move(e){ if(self.ptr !== null){ self.ptr = self._x(e); e.preventDefault(); } },
      /* 🔵 **폰은 스와이프로 한다** — 사용자가 그렇게 정했다(큰 버튼을 두지 않는다).
         손을 뗄 때 «어디서 어디로»를 갈래에 넘긴다. */
      up(e){
        if(self.sw && self.mode.swipe && e){
          self.mode.swipe(self, e.clientX - self.sw.x, e.clientY - self.sw.y);
        }
        self.sw = null; self.ptr = null;
      },
      key(e){
        const d = (e.type === 'keydown');
        const K = ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' ','Spacebar'];
        if(K.indexOf(e.key) < 0) return;
        /* ⚠ 눌러 둔 채로 두면 keydown 이 되풀이해서 온다 — 칸을 옮기는 갈래에서는
           그 되풀이가 «주르륵»이 되므로 처음 한 번만 받는다 */
        const repeat = d && e.repeat;
        const first = !self.started;
        self.started = true;
        if(e.key === 'ArrowLeft') self.keys.l = d;
        else if(e.key === 'ArrowRight') self.keys.r = d;
        if(!first && !repeat && self.mode.key) self.mode.key(self, e.key, d);
        e.preventDefault();
      },
      /* ⚠ 폰에서 앱을 바꿨다 돌아오면 손가락은 없는데 마지막 자리가 남아 혼자 미끄러진다 */
      vis(){ if(document.hidden) self.ptr = null; }
    };
    cv.addEventListener('pointerdown', this._h.down);
    window.addEventListener('pointermove', this._h.move, {passive:false});
    window.addEventListener('pointerup', this._h.up);
    window.addEventListener('pointercancel', this._h.up);
    window.addEventListener('keydown', this._h.key);
    window.addEventListener('keyup', this._h.key);
    document.addEventListener('visibilitychange', this._h.vis);

    this.running = true;
    this.last = performance.now();
    this.raf = requestAnimationFrame(ts => self._loop(ts));
  },

  stop(){
    this.running = false;
    if(this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    if(this._h){
      if(this.cv) this.cv.removeEventListener('pointerdown', this._h.down);
      window.removeEventListener('pointermove', this._h.move);
      window.removeEventListener('pointerup', this._h.up);
      window.removeEventListener('pointercancel', this._h.up);
      window.removeEventListener('keydown', this._h.key);
      window.removeEventListener('keyup', this._h.key);
      document.removeEventListener('visibilitychange', this._h.vis);
      this._h = null;
    }
  },

  _x(e){ return e.clientX - this.cv.getBoundingClientRect().left; },

  _loop(ts){
    if(!this.running) return;
    /* ⚠ dt 에 상한을 둔다. 화면이 잠겼다 돌아오면 한 프레임이 몇 초가 되고,
       그 한 번에 똥이 화면을 «통과»해 버린다 (터널링) */
    const dt = Math.min((ts - this.last) / 1000, 1/30);
    this.last = ts;
    this._step(dt);
    this._draw();
    if(this.running) this.raf = requestAnimationFrame(t => this._loop(t));
  },

  _step(dt){
    if(!this.started) return;
    this.t += dt;
    /* 🔴 **갈래가 `false` 를 돌려주면 그 판은 끝이다.** 갈래 안에서 직접 끝내지 않는다 —
       끝내는 길이 둘이 되면 «저장을 한 번만»이라는 약속이 깨진다. */
    if(this.mode.step(this, dt) === false){ this._end(); return; }
    const s = Math.floor(this.t * 10) + this.stars * 50;
    if(s !== this.score){ this.score = s; if(this.onScore) this.onScore(s); }
  },

  _end(){
    this.running = false;
    const s = this.score, cb = this.onEnd;
    this.stop();
    if(cb) cb(s);
  },

  _draw(){
    const c = this.cx, w = this.w, h = this.h;
    c.clearRect(0, 0, w, h);
    this.mode.draw(this);
    if(!this.started){
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillStyle = '#22221E'; c.font = '700 15px Pretendard, sans-serif';
      c.fillText('화면을 눌러 시작', w/2, h/2 - 16);
      c.fillStyle = '#96968C'; c.font = '12.5px Pretendard, sans-serif';
      /* 🔵 안내 문구는 «받아서» 쓴다 — 이래야 게임 파일이 주 로테이션(GAMES)을 몰라도 된다.
         연습 페이지(game.html)도 같은 파일을 그대로 쓴다. */
      const tp = this.tips || (this.mode === MODE_RUNNER
        ? ['← → 옮기기 · ↑ 뛰기 · ↓ 미끄러지기', '폰에서는 옆으로 · 위로 · 아래로 쓸어 넘기세요']
        : ['손가락을 끌어 좌우로 피하세요', '⭐ 를 먹으면 50점']);
      c.fillText(tp[0], w/2, h/2 + 8);
      c.fillText(tp[1], w/2, h/2 + 28);
    }
  },

  _player(px, py, face){
    const c = this.cx, x = (px===undefined?this.px:px), y = (py===undefined?this.py:py), r = 15;
    face = (face===undefined ? this.face : face);
    if(CHAR_IMG.complete && CHAR_IMG.naturalWidth){
      const hh = CHAR_H, ww = hh * (CHAR_IMG.naturalWidth / CHAR_IMG.naturalHeight);
      c.save(); c.translate(x, y);
      /* ⚠ 그림은 «왼쪽으로 달리는» 자세다 — 먼지 자국이 오른쪽에 있다.
         자국은 «가던 길 뒤»에 남으므로 오른쪽에 자국이면 왼쪽으로 가는 것이다.
         그래서 **오른쪽으로 갈 때** 뒤집는다. */
      if(face > 0) c.scale(-1, 1);
      c.drawImage(CHAR_IMG, -ww * CHAR_ANCHOR, -hh / 2, ww, hh);
      c.restore();
      return;
    }
    /* 그림을 못 읽었을 때 — 도형으로 떨어진다. 그림 하나 때문에 게임이 안 열리면 안 된다 */
    c.fillStyle = '#3F3537';
    c.beginPath();
    if(c.roundRect) c.roundRect(x-r, y-r, r*2, r*2, 7); else c.arc(x, y, r, 0, 6.2832);
    c.fill();
    c.fillStyle = '#FAF9F6';
    c.beginPath(); c.arc(x-4.6, y-2, 2.3, 0, 6.2832); c.fill();
    c.beginPath(); c.arc(x+4.6, y-2, 2.3, 0, 6.2832); c.fill();
  }
};
