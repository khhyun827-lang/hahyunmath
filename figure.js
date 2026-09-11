/* ============================================================
   김하현수학연구소 — 그림 장면(scene) → SVG
   ============================================================

   ## 왜 이런 모양인가

   AI에게 «그림»을 그리게 하지 않는다. 그리게 하면 그럴듯한데 좌표가 틀린 그림이 나오고,
   그 순간 문제 자체가 거짓이 된다 (CLAUDE.md 「그림도 AI로 생성은 여전히 안 한다」).
   AI가 내는 것은 **«무엇을 그릴지»를 적은 데이터**뿐이고, 그리는 것은 이 파일이다.

   그래서 얻는 것이 셋이다 —
   ① **검산할 수 있다.** 장면에 `checks`를 같이 받아 «곡선이 정말 x=2에서 x축을 만나는가»를
      수치로 확인한다. 어긋나면 그 초안은 버린다. 이것이 이 설계의 값어치 전부다.
   ② **강사가 고칠 수 있다.** 좌표 하나를 고쳐 즉시 다시 그린다 — AI 한도를 안 쓴다.
   ③ **SVG라 드라이브를 안 탄다.** 업로드·압축·주인 없는 파일 청소가 통째로 없다.
      태블릿에서도 안 뭉갠다 (「▶ 다음 차례」 1번과 맞물린다).

   ## 쓰는 법

     const { xRange, yRange } = Figure.autoWindow(scene);      // 창은 저절로 잡힌다
     const v = Figure.verifyScene(scene);                      // ← 먼저 이것부터
     if (!v.ok) return null;                                   // 초안을 버리고 「그림 필요」에 그대로 둔다
     const svg = Figure.renderScene(scene);                    // 문자열 하나

   브라우저에서는 <script src="figure.js">, node에서는 그냥 import 하면
   `globalThis.Figure`가 선다 (tools/figure-preview.mjs가 그렇게 쓴다).

   ## 장면 스키마 v1 — kind:'graph' (함수 그래프)

   {
     kind: 'graph',
     xRange: [-1, 7],            // 생략하면 autoWindow가 잡는다. 되도록 생략하는 쪽이 낫다
     yRange: [-9, 6],
     curves: [
       { expr: '-(x-2)*(x-6)',   // ⚠ eval을 쓰지 않는다 — 아래 «식» 참고
         label: 'y=f(x)',        // 곡선 옆에 붙는 이름
         labelAt: 5.6,           // 이름을 붙일 x. 생략하면 알아서 고른다
         domain: [0, 7],         // 그 곡선만 좁게 그릴 때
         dash: false }
     ],
     points: [
       { x: 1, y: -5,            // y를 생략하면 curve번째 곡선 위의 점으로 친다
         curve: 0,
         dot: true,              // 까만 점
         dropTo: 'axis',         // 'axis' | 'x' | 'y' | null — 점선을 내린다
         label: 'P', labelPos: 'above' }   // above|below|left|right
     ],
     xTicks: [1, 2, 5, 6],       // x축 눈금 + 숫자
     yTicks: [],
     labels: [ {x, y, text, anchor} ],     // 자유 배치. 최후수단이다
     axis:   { xLabel: 'x', yLabel: 'y', origin: 'O' },

     checks: [                   // ★ 이것이 없으면 초안을 믿을 근거가 없다
       { type:'root',      curve:0, x:2 },              // 곡선0이 x=2에서 x축을 만난다
       { type:'intersect', curves:[0,1], x:1 },         // 곡선0과 곡선1이 x=1에서 만난다
       { type:'value',     curve:0, x:4, y:4 },         // f(4)=4
       { type:'convex',    curve:0, dir:'down' }        // 'down'=위로 볼록(∩) · 'up'=아래로 볼록(∪)
     ]
   }

   xTicks와 points는 **자동으로 «창 안에 들어오는가»가 검사된다** — 「반드시 표시할 값」이
   화면 밖에 있으면 그 그림은 지침을 안 지킨 것이다.

   ## 장면 스키마 v2 — 좌표평면 위의 도형 (2026-09-12 · 사용자 — 「좌표화된 도형의 상황도 충분히 할 수 있지 않아?」)

   위 v1 에 아래 배열을 **더한다** (kind 는 그대로 'graph'. 곡선이 없어도 된다):

     segments: [ { from:[0,0], to:[4,3], dash:false, label:'AB', arrow:false } ],
     polygons: [ { pts:[[0,0],[4,0],[4,3]], fill:true, label:'S' } ],      // 닫힌 도형. fill 이면 옅게 칠한다
     circles:  [ { c:[2,1], r:2, dash:false, label:'C' } ],
     angles:   [ { at:[4,0], from:[0,0], to:[4,3], right:true, label:'' } ],   // right 면 직각 표시(작은 네모), 아니면 호
     points:   [ { x:4, y:3, label:'A', labelPos:'above' } ],                  // y 를 주면 곡선과 무관한 점이다

   🔴 **도형이 하나라도 있으면 x·y 축의 비율을 같게 잡는다** (equalAxes). 안 그러면 원이 타원으로,
     직각이 예각으로 보인다. 함수 그래프만 있을 때는 예전처럼 창을 따로 잡는다 — 포물선은 눌러도 된다.
     scene.equalAxes 로 강제할 수도 있다.

   checks 에 더해진 것:
     { type:'dist',      a:[0,0], b:[4,3], d:5 }                 |AB| = 5
     { type:'oncircle',  circle:0, p:[4,1] }                     점이 원 위에 있다
     { type:'right',     at:[4,0], from:[0,0], to:[4,3] }        ∠ 가 직각이다
     { type:'collinear', pts:[[0,0],[2,1],[4,2]] }               세 점이 한 직선 위
     { type:'midpoint',  m:[2,1.5], a:[0,0], b:[4,3] }           중점
     { type:'area',      polygon:0, a:6 }                        다각형 넓이
     { type:'oncurve',   curve:0, p:[1,-5] }                     점이 곡선 위 (value 와 같다)

   ## 식(expr)

   `Function`도 `eval`도 쓰지 않는다. 모델이 낸 문자열을 그대로 실행하면
   **강사 브라우저에서 임의 코드가 도는 문이 열린다.** 직접 읽는다 (parseExpr).
   되는 것 — 숫자 · x · + - * / ^ · 괄호 · 단항 부호 · 생략된 곱셈(`2x`, `3(x-1)`) ·
   함수 abs sqrt sin cos tan exp ln log log10 · 상수 pi e.
   그 밖의 이름은 **읽기를 거부한다** (검증에서 «식을 못 읽었다»로 잡힌다).
   ============================================================ */
(function () {
  'use strict';

  /* ==================== 식 읽기 ====================
     재귀 하강. 컴파일해서 «닫힌 함수»를 돌려준다 — 한 번 읽고 수천 번 부르기 때문이다. */

  var FUNCS = {
    abs: Math.abs, sqrt: Math.sqrt, sin: Math.sin, cos: Math.cos, tan: Math.tan,
    exp: Math.exp, ln: Math.log, log: Math.log, log10: function (v) { return Math.log(v) / Math.LN10; }
  };
  var CONSTS = { pi: Math.PI, e: Math.E };

  function tokenize(s) {
    var out = [], i = 0;
    while (i < s.length) {
      var c = s[i];
      if (c === ' ' || c === '\t' || c === '\n') { i++; continue; }
      if (c >= '0' && c <= '9' || c === '.') {
        var j = i; while (j < s.length && (s[j] >= '0' && s[j] <= '9' || s[j] === '.')) j++;
        out.push({ t: 'num', v: parseFloat(s.slice(i, j)) }); i = j; continue;
      }
      if (/[A-Za-z_]/.test(c)) {
        var k = i; while (k < s.length && /[A-Za-z0-9_]/.test(s[k])) k++;
        out.push({ t: 'name', v: s.slice(i, k) }); i = k; continue;
      }
      if ('+-*/^()'.indexOf(c) >= 0) { out.push({ t: c }); i++; continue; }
      return { err: '읽을 수 없는 글자 «' + c + '»' };
    }
    return { toks: out };
  }

  /* 여는 자리에 올 수 있는 토큰인가 — 생략된 곱셈(2x · 3(x-1) · (x+1)(x-2))을 알아보는 데 쓴다. */
  function startsAtom(tk) {
    return tk && (tk.t === 'num' || tk.t === 'name' || tk.t === '(');
  }

  function parseExpr(src) {
    var tz = tokenize(String(src == null ? '' : src));
    if (tz.err) return { err: tz.err };
    var toks = tz.toks, p = 0;
    var fail = null;
    function peek() { return toks[p]; }
    function eat(t) { if (toks[p] && toks[p].t === t) { p++; return true; } return false; }

    function atom() {
      var tk = toks[p];
      if (!tk) { fail = fail || '식이 도중에 끝났다'; return function () { return NaN; }; }
      if (tk.t === 'num') { p++; var n = tk.v; return function () { return n; }; }
      if (tk.t === 'name') {
        p++;
        var nm = tk.v;
        if (nm === 'x' || nm === 'X') return function (x) { return x; };
        if (Object.prototype.hasOwnProperty.call(CONSTS, nm)) { var cv = CONSTS[nm]; return function () { return cv; }; }
        if (Object.prototype.hasOwnProperty.call(FUNCS, nm)) {
          var fn = FUNCS[nm];
          if (!eat('(')) { fail = fail || ('«' + nm + '» 뒤에 괄호가 없다'); return function () { return NaN; }; }
          var arg = expr();
          if (!eat(')')) { fail = fail || ('«' + nm + '»의 괄호가 안 닫혔다'); return function () { return NaN; }; }
          return function (x) { return fn(arg(x)); };
        }
        fail = fail || ('모르는 이름 «' + nm + '»');       // 화이트리스트 밖은 여기서 막힌다
        return function () { return NaN; };
      }
      if (tk.t === '(') {
        p++;
        var inner = expr();
        if (!eat(')')) { fail = fail || '괄호가 안 닫혔다'; }
        return inner;
      }
      fail = fail || ('여기 올 수 없는 토큰 «' + tk.t + '»');
      p++;
      return function () { return NaN; };
    }

    function power() {                                   // ^ 는 오른쪽 결합 (2^3^2 = 2^9)
      var base = atom();
      if (eat('^')) { var ex = unary(); return function (x) { return Math.pow(base(x), ex(x)); }; }
      return base;
    }

    function unary() {
      if (eat('-')) { var a = unary(); return function (x) { return -a(x); }; }
      if (eat('+')) return unary();
      return power();
    }

    function term() {
      var left = unary();
      for (;;) {
        if (eat('*')) { var r1 = unary(); left = mul(left, r1); continue; }
        if (eat('/')) { var r2 = unary(); left = div(left, r2); continue; }
        /* 생략된 곱셈. 단, «2 sin(x)»처럼 이름이 오는 경우도 여기서 잡힌다. */
        if (startsAtom(peek())) { var r3 = unary(); left = mul(left, r3); continue; }
        return left;
      }
      function mul(a, b) { return function (x) { return a(x) * b(x); }; }
      function div(a, b) { return function (x) { return a(x) / b(x); }; }
    }

    function expr() {
      var left = term();
      for (;;) {
        if (eat('+')) { var r1 = term(); left = (function (a, b) { return function (x) { return a(x) + b(x); }; })(left, r1); continue; }
        if (eat('-')) { var r2 = term(); left = (function (a, b) { return function (x) { return a(x) - b(x); }; })(left, r2); continue; }
        return left;
      }
    }

    var f = expr();
    if (!fail && p < toks.length) fail = '식 뒤에 남는 것이 있다';
    if (fail) return { err: fail };
    return { fn: f };
  }

  /* 장면의 곡선을 한 번에 컴파일한다. 못 읽은 것은 err를 달아 둔다. */
  function compileCurves(scene) {
    return (scene.curves || []).map(function (c, i) {
      var r = parseExpr(c.expr);
      return { i: i, def: c, fn: r.fn || null, err: r.err || null };
    });
  }

  /* ==================== 창 잡기 ====================
     손으로 그릴 때 제일 오래 걸리는 일이 이것이다 — 산수가 아니라 «어디까지 보여 줄까».
     규칙: ① 이름 붙은 값(눈금·점·checks의 x)은 반드시 들어온다
           ② 곡선도 되도록 담되, 가파른 포물선 하나 때문에 나머지가 납작해지지 않게 **가둔다** */
  function autoWindow(scene, opt) {
    var cs = compileCurves(scene);
    var xs = [], ys = [];

    (scene.xTicks || []).forEach(function (v) { xs.push(v); });
    (scene.yTicks || []).forEach(function (v) { ys.push(v); });
    (scene.points || []).forEach(function (pt) {
      xs.push(pt.x);
      var y = pointY(pt, cs);
      if (isFinite(y)) ys.push(y);
    });
    (scene.checks || []).forEach(function (ck) {
      if (typeof ck.x === 'number') xs.push(ck.x);
      if (typeof ck.y === 'number') ys.push(ck.y);
    });
    (scene.labels || []).forEach(function (l) { xs.push(l.x); ys.push(l.y); });
    /* v2 — 도형의 끝점·꼭짓점·원의 네 끝 */
    (scene.segments || []).forEach(function (s) { [s.from, s.to].forEach(function (p) { if (p) { xs.push(p[0]); ys.push(p[1]); } }); });
    (scene.polygons || []).forEach(function (pg) { (pg.pts || []).forEach(function (p) { xs.push(p[0]); ys.push(p[1]); }); });
    (scene.circles || []).forEach(function (c) { if (c.c) { xs.push(c.c[0] - c.r); xs.push(c.c[0] + c.r); ys.push(c.c[1] - c.r); ys.push(c.c[1] + c.r); } });
    (scene.angles || []).forEach(function (a) { [a.at, a.from, a.to].forEach(function (p) { if (p) { xs.push(p[0]); ys.push(p[1]); } }); });
    xs.push(0); ys.push(0);                              // 원점은 늘 보인다

    var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs);
    if (!(x1 > x0)) { x0 -= 3; x1 += 3; }
    var padX = (x1 - x0) * 0.22;
    var xRange = scene.xRange ? scene.xRange.slice() : [x0 - padX, x1 + padX];

    /* y는 «봉우리와 골»로 잡는다. 곡선의 **끝값**을 따라가면 가파른 포물선 하나가
       창을 몇 배로 벌려 나머지를 납작하게 만든다 — 손으로 그릴 때 제일 먼저 자르는 것이
       바로 그 끝자락이고, 원본 시험지 그림도 거기서 잘려 있다. */
    var ends = [];
    cs.forEach(function (c) {
      if (!c.fn) return;
      var d = c.def.domain || xRange;
      var a = Math.max(d[0], xRange[0]), b = Math.min(d[1], xRange[1]);
      var N = 240, prevV = null, prevS = null, firstV = null, lastV = null;
      for (var i = 0; i <= N; i++) {
        var v = c.fn(a + (b - a) * i / N);
        if (!isFinite(v)) continue;
        if (firstV === null) firstV = v;
        lastV = v;
        if (prevV !== null) {
          var s = v - prevV;
          if (prevS !== null && s * prevS < 0) ys.push(prevV);   // 국소 극값 — 이건 반드시 보인다
          if (s !== 0) prevS = s;
        }
        prevV = v;
      }
      if (firstV !== null) { ends.push(firstV); ends.push(lastV); }
    });

    var lo = Math.min.apply(null, ys), hi = Math.max.apply(null, ys);
    if (!(hi > lo)) { lo -= 3; hi += 3; }
    /* 끝값은 «봉우리와 골»이 요구한 폭의 0.8배까지만 따라간다. 그 밖은 잘린 채로 둔다. */
    var span = hi - lo, capLo = lo - span * 0.8, capHi = hi + span * 0.8;
    ends.forEach(function (v) {
      if (v < lo && v > capLo) lo = v;
      if (v > hi && v < capHi) hi = v;
    });
    var padY = (hi - lo) * 0.16;
    var yRange = scene.yRange ? scene.yRange.slice() : [lo - padY, hi + padY];

    /* 🔴 도형이 있으면 «한 칸»이 가로세로 같은 px 여야 한다 — 원이 원으로, 직각이 직각으로 보이려면.
       좁은 쪽 범위를 넓혀 맞춘다(잘라 내지 않는다 — 잘라 내면 「반드시 보일 값」이 밖으로 나간다). */
    if (hasShapes(scene)) {
      var o2 = opt || {}, W = o2.width || 560, H = o2.height || 430, pad = o2.pad || { l: 38, r: 42, t: 30, b: 38 };
      var plotW = W - pad.l - pad.r, plotH = H - pad.t - pad.b;
      var sx = plotW / (xRange[1] - xRange[0]), sy = plotH / (yRange[1] - yRange[0]);
      if (sx > sy) { var needX = plotW / sy, mx = (xRange[0] + xRange[1]) / 2; xRange = [mx - needX / 2, mx + needX / 2]; }
      else if (sy > sx) { var needY = plotH / sx, my = (yRange[0] + yRange[1]) / 2; yRange = [my - needY / 2, my + needY / 2]; }
    }

    return { xRange: xRange, yRange: yRange };
  }
  function hasShapes(scene) {
    if (scene.equalAxes === true) return true;
    if (scene.equalAxes === false) return false;
    return !!((scene.segments || []).length || (scene.polygons || []).length || (scene.circles || []).length || (scene.angles || []).length);
  }
  function dist(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1]); }
  function polyArea(pts) {
    var s = 0;
    for (var i = 0; i < pts.length; i++) { var p = pts[i], q = pts[(i + 1) % pts.length]; s += p[0] * q[1] - q[0] * p[1]; }
    return Math.abs(s) / 2;
  }

  function pointY(pt, cs) {
    if (typeof pt.y === 'number') return pt.y;
    var c = cs[pt.curve || 0];
    return c && c.fn ? c.fn(pt.x) : NaN;
  }

  /* ==================== 검산 ====================
     초안을 믿을 근거는 이 함수 하나다. 통과 못 하면 그 그림은 쓰지 않는다. */
  function verifyScene(scene, opt) {
    var o = opt || {};
    var cs = compileCurves(scene);
    var win = autoWindow(scene, o);
    var span = Math.max(Math.abs(win.yRange[1] - win.yRange[0]), 1);
    var tol = o.tol != null ? o.tol : 1e-4 * span;
    var fails = [];
    var ran = 0;

    cs.forEach(function (c) {
      if (c.err) fails.push({ type: 'expr', curve: c.i, msg: '식을 못 읽었다 (' + c.err + '): ' + c.def.expr });
    });

    function fn(i) { var c = cs[i]; return c && c.fn ? c.fn : null; }

    (scene.checks || []).forEach(function (ck) {
      ran++;
      if (ck.type === 'root') {
        var f = fn(ck.curve || 0);
        if (!f) return;
        var v = f(ck.x);
        if (!(Math.abs(v) <= tol)) fails.push({ type: 'root', msg: '곡선' + (ck.curve || 0) + '이 x=' + ck.x + '에서 x축을 안 만난다 (값 ' + fmt(v) + ')' });
      } else if (ck.type === 'intersect') {
        var a = fn(ck.curves[0]), b = fn(ck.curves[1]);
        if (!a || !b) return;
        var d = a(ck.x) - b(ck.x);
        if (!(Math.abs(d) <= tol)) fails.push({ type: 'intersect', msg: '곡선' + ck.curves[0] + '·' + ck.curves[1] + '이 x=' + ck.x + '에서 안 만난다 (차 ' + fmt(d) + ')' });
      } else if (ck.type === 'value') {
        var g = fn(ck.curve || 0);
        if (!g) return;
        var w = g(ck.x);
        if (!(Math.abs(w - ck.y) <= tol)) fails.push({ type: 'value', msg: '곡선' + (ck.curve || 0) + '의 x=' + ck.x + ' 값이 ' + fmt(ck.y) + '가 아니다 (' + fmt(w) + ')' });
      } else if (ck.type === 'convex') {
        var h = fn(ck.curve || 0);
        if (!h) return;
        var bad = 0, tot = 0, step = (win.xRange[1] - win.xRange[0]) / 40;
        for (var x = win.xRange[0] + step; x < win.xRange[1] - step; x += step) {
          var s2 = h(x - step) - 2 * h(x) + h(x + step);
          if (!isFinite(s2)) continue;
          tot++;
          if (Math.abs(s2) < 1e-12) continue;
          if ((ck.dir === 'up' && s2 < 0) || (ck.dir === 'down' && s2 > 0)) bad++;
        }
        if (tot && bad > tot * 0.05)
          fails.push({ type: 'convex', msg: '곡선' + (ck.curve || 0) + '의 볼록 방향이 «' + ck.dir + '»가 아니다' });
      } else if (ck.type === 'dist') {
        var dd = dist(ck.a, ck.b);
        if (!(Math.abs(dd - ck.d) <= tol)) fails.push({ type: 'dist', msg: '두 점 (' + ck.a + ')·(' + ck.b + ') 사이가 ' + fmt(ck.d) + '가 아니다 (' + fmt(dd) + ')' });
      } else if (ck.type === 'oncircle') {
        var cc = (scene.circles || [])[ck.circle || 0];
        if (!cc) { fails.push({ type: 'oncircle', msg: '원 ' + (ck.circle || 0) + '이 없다' }); return; }
        var dr = dist(ck.p, cc.c) - cc.r;
        if (!(Math.abs(dr) <= tol)) fails.push({ type: 'oncircle', msg: '점 (' + ck.p + ')이 원' + (ck.circle || 0) + ' 위에 없다 (반지름과 차 ' + fmt(dr) + ')' });
      } else if (ck.type === 'right') {
        var u = [ck.from[0] - ck.at[0], ck.from[1] - ck.at[1]], w2 = [ck.to[0] - ck.at[0], ck.to[1] - ck.at[1]];
        var dot = u[0] * w2[0] + u[1] * w2[1], nn = Math.hypot(u[0], u[1]) * Math.hypot(w2[0], w2[1]) || 1;
        if (!(Math.abs(dot / nn) <= 1e-4)) fails.push({ type: 'right', msg: '(' + ck.at + ')에서의 각이 직각이 아니다' });
      } else if (ck.type === 'collinear') {
        var p0 = ck.pts[0], p1 = ck.pts[1], bad2 = false;
        for (var k = 2; k < ck.pts.length; k++) {
          var cr = (p1[0] - p0[0]) * (ck.pts[k][1] - p0[1]) - (p1[1] - p0[1]) * (ck.pts[k][0] - p0[0]);
          if (Math.abs(cr) > tol * 10) bad2 = true;
        }
        if (bad2) fails.push({ type: 'collinear', msg: '점들이 한 직선 위에 있지 않다: ' + JSON.stringify(ck.pts) });
      } else if (ck.type === 'midpoint') {
        var mm = [(ck.a[0] + ck.b[0]) / 2, (ck.a[1] + ck.b[1]) / 2];
        if (!(dist(mm, ck.m) <= tol)) fails.push({ type: 'midpoint', msg: '(' + ck.m + ')이 (' + ck.a + ')·(' + ck.b + ')의 중점이 아니다 (' + mm + ')' });
      } else if (ck.type === 'area') {
        var pg = (scene.polygons || [])[ck.polygon || 0];
        if (!pg) { fails.push({ type: 'area', msg: '다각형 ' + (ck.polygon || 0) + '이 없다' }); return; }
        var ar = polyArea(pg.pts || []);
        if (!(Math.abs(ar - ck.a) <= tol * 10)) fails.push({ type: 'area', msg: '다각형' + (ck.polygon || 0) + '의 넓이가 ' + fmt(ck.a) + '가 아니다 (' + fmt(ar) + ')' });
      } else if (ck.type === 'oncurve') {
        var fc = fn(ck.curve || 0);
        if (!fc) return;
        var vv = fc(ck.p[0]);
        if (!(Math.abs(vv - ck.p[1]) <= tol)) fails.push({ type: 'oncurve', msg: '점 (' + ck.p + ')이 곡선' + (ck.curve || 0) + ' 위에 없다 (' + fmt(vv) + ')' });
      } else {
        fails.push({ type: 'unknown', msg: '모르는 검사 «' + ck.type + '»' });
      }
    });
    /* 도형의 꼭짓점·끝점도 «반드시 보일 값»이다 */
    var inWin = function (p) { return p[0] >= win.xRange[0] && p[0] <= win.xRange[1] && p[1] >= win.yRange[0] && p[1] <= win.yRange[1]; };
    (scene.segments || []).forEach(function (s, i) { ran++; if (!s.from || !s.to) fails.push({ type: 'shape', msg: '선분 ' + i + '에 from/to 가 없다' }); else if (!inWin(s.from) || !inWin(s.to)) fails.push({ type: 'visible', msg: '선분 ' + i + '이 창 밖이다' }); });
    (scene.polygons || []).forEach(function (pg, i) { ran++; if (!pg.pts || pg.pts.length < 3) fails.push({ type: 'shape', msg: '다각형 ' + i + '의 꼭짓점이 셋 미만이다' }); else if (!pg.pts.every(inWin)) fails.push({ type: 'visible', msg: '다각형 ' + i + '이 창 밖이다' }); });
    (scene.circles || []).forEach(function (c, i) { ran++; if (!c.c || !(c.r > 0)) fails.push({ type: 'shape', msg: '원 ' + i + '에 중심이나 반지름이 없다' }); });

    /* 「반드시 표시할 값」이 창 밖이면 그린 것과 시킨 것이 다르다 — 자동으로 본다. */
    (scene.xTicks || []).forEach(function (v) {
      ran++;
      if (v < win.xRange[0] || v > win.xRange[1])
        fails.push({ type: 'visible', msg: 'x눈금 ' + fmt(v) + '이 창 밖이다' });
    });
    (scene.points || []).forEach(function (pt, i) {
      ran++;
      var y = pointY(pt, cs);
      if (pt.x < win.xRange[0] || pt.x > win.xRange[1] || !(y >= win.yRange[0] && y <= win.yRange[1]))
        fails.push({ type: 'visible', msg: '점 ' + i + '(' + fmt(pt.x) + ', ' + fmt(y) + ')이 창 밖이다' });
    });

    if (!(scene.checks || []).length)
      fails.push({ type: 'nochecks', msg: 'checks가 비어 있다 — 검산할 것이 없는 초안은 쓰지 않는다' });

    return { ok: fails.length === 0, failures: fails, ran: ran, window: win, tol: tol };
  }

  /* ==================== 그리기 ==================== */

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function fmt(v) {
    if (!isFinite(v)) return String(v);
    var r = Math.round(v * 1e6) / 1e6;
    return String(r);
  }
  function n(v) { return Math.round(v * 100) / 100; }

  /* ==================== 글자 조판 — 이탤릭과 로만 ====================
     수학 조판의 오랜 규칙 (2026-09-11 · 사용자가 시켰다) —
       · 변수(x, y, f, P, O …)는 **이탤릭**
       · 숫자·연산자·괄호·등호는 **로만(세움)**
       · 이름 있는 함수(sin, log, lim …)는 **로만**
       · 그리스 소문자는 이탤릭, 대문자·한글은 로만
       · `x_1`·`x^2`·`_{12}`·`^{-1}` 는 아래·위첨자 (글자 70%)
     예전에는 <g font-style="italic"> 하나로 전부 기울였다 — 「5」도 「=」도 기울어 있었다.

     ⚠ 여기서 나온 조각은 전부 esc() 를 지난다. 장면의 글자는 워커(모델)가 낸 것이다. */
  var UPRIGHT_FN = { sin: 1, cos: 1, tan: 1, cot: 1, sec: 1, csc: 1, log: 1, ln: 1, exp: 1, lim: 1, max: 1, min: 1, det: 1, arg: 1, mod: 1 };
  function mathRuns(raw) {
    var s = String(raw == null ? '' : raw);
    var runs = [];
    var i = 0;
    function push(t, it, sh) {
      if (!t) return;
      var last = runs[runs.length - 1];
      if (last && last.it === it && last.sh === sh) last.t += t;
      else runs.push({ t: t, it: it, sh: sh });
    }
    function classify(t) {                       // 한 덩이의 «기울임»을 정한다
      if (t === '-') return [['−', false]];         // 보기용 마이너스
      if (/^[a-z]+$/i.test(t)) return UPRIGHT_FN[t.toLowerCase()] ? [[t, false]] :
        t.split('').map(function (ch) { return [ch, true]; });
      if (/^[α-ω]$/.test(t)) return [[t, true]];
      return [[t, false]];
    }
    function emit(t, sh) {
      var re = /[a-z]+|[0-9.]+|[α-ωΑ-Ω]|-|[^a-z0-9.α-ωΑ-Ω-]+/gi, m;
      while ((m = re.exec(t))) classify(m[0]).forEach(function (c) { push(c[0], c[1], sh); });
    }
    while (i < s.length) {
      var ch = s[i];
      if ((ch === '_' || ch === '^') && i + 1 < s.length) {
        var sh = ch === '_' ? 'sub' : 'sup', j = i + 1, body;
        if (s[j] === '{') {
          var k = s.indexOf('}', j + 1);
          if (k < 0) k = s.length;
          body = s.slice(j + 1, k); i = k + 1;
        } else { body = s[j]; i = j + 1; }
        emit(body, sh);
        continue;
      }
      var j2 = i;
      while (j2 < s.length && s[j2] !== '_' && s[j2] !== '^') j2++;
      emit(s.slice(i, j2), null);
      i = j2;
    }
    return runs;
  }
  /* 글자 폭 어림 — 잉크·겹침 검사가 쓴다. 첨자는 0.7배. */
  function visLen(raw) {
    return mathRuns(raw).reduce(function (a, r) { return a + r.t.length * (r.sh ? 0.7 : 1); }, 0);
  }
  function runsToSVG(raw, size) {
    var out = '', pending = 0;                   // 첨자 뒤에는 기준선을 되돌려야 한다
    mathRuns(raw).forEach(function (r) {
      var attrs = ' font-style="' + (r.it ? 'italic' : 'normal') + '"';
      var dy = pending; pending = 0;
      if (r.sh) {
        var shift = r.sh === 'sub' ? size * 0.28 : -size * 0.45;
        dy += shift; pending = -shift;
        attrs += ' font-size="' + n(size * 0.7) + '"';
      }
      if (dy) attrs += ' dy="' + n(dy) + '"';
      out += '<tspan' + attrs + '>' + esc(r.t) + '</tspan>';
    });
    return out;
  }

  /* ==================== 핀 — 이름표를 «종이 위 어디»에 ====================
     scene.pins = { size:[560,430], at:{ 'curve:0':{x,y,anchor}, … } }
     좌표는 viewBox 의 px 다. 핀이 없는 이름표는 지금처럼 자동으로 앉는다.
     🔴 숫자 셋과 anchor 열거값뿐이다 — 글자는 여기 없다 (docs/그림-편집기-계획.md 1-1). */
  var ANCHORS = { start: 1, middle: 1, end: 1 };
  function cleanPins(pins, W, H) {
    if (!pins || typeof pins !== 'object' || !pins.at || typeof pins.at !== 'object') return null;
    var sz = pins.size;
    if (!Array.isArray(sz) || sz[0] !== W || sz[1] !== H) return null;    // 다른 크기에서 찍은 핀은 안 믿는다
    var at = {};
    Object.keys(pins.at).forEach(function (id) {
      var p = pins.at[id];
      if (!p || typeof p !== 'object') return;
      var x = Number(p.x), y = Number(p.y);
      if (!isFinite(x) || !isFinite(y)) return;
      at[id] = { x: clamp(x, 0, W), y: clamp(y, 0, H), anchor: ANCHORS[p.anchor] ? p.anchor : 'middle' };
    });
    return { size: [W, H], at: at };
  }

  /* ⚠ 기본 크기가 «화면에서 글자가 읽히는가»를 정한다.
     학생 앱은 폭 480px 열이라 카드 안이 약 400px다. 캔버스를 720으로 잡으면 0.56배로 줄어
     18px 글자가 10px이 되어 **눈금 숫자를 못 읽는다** (실제로 그랬다).
     560으로 좁히면 0.72배라 13px로 읽힌다 — 벡터라 폭을 좁혀도 선은 그대로 선명하다.
     🔴 그리고 핀이 이 px 위에 찍히므로 **560×430 은 약속이다** — 바꾸면 핀이 전부 버려진다(cleanPins). */
  function build(scene, opt) {
    var o = opt || {};
    var W = o.width || 560, H = o.height || 430;
    var pad = o.pad || { l: 38, r: 42, t: 30, b: 38 };
    var win = autoWindow(scene, { width: W, height: H, pad: pad });
    var xr = win.xRange, yr = win.yRange;
    var cs = compileCurves(scene);
    var plotW = W - pad.l - pad.r, plotH = H - pad.t - pad.b;
    var pins = cleanPins(scene.pins, W, H);
    var at = pins ? pins.at : {};

    var PX = function (x) { return pad.l + (x - xr[0]) / (xr[1] - xr[0]) * plotW; };
    var PY = function (y) { return pad.t + (yr[1] - y) / (yr[1] - yr[0]) * plotH; };

    /* 축은 0이 창 안에 있으면 그 자리에, 없으면 가장자리에 붙인다. */
    var ax = { x: clamp(0, xr[0], xr[1]), y: clamp(0, yr[0], yr[1]) };
    var ox = PX(ax.x), oy = PY(ax.y);

    /* «잉크»가 있는 자리를 모아 둔다 — 곡선 이름표는 이 자리를 피해 앉는다.
       축·눈금 숫자·원점 표시까지 전부 넣어야 한다. 곡선만 피하게 했더니
       이름표가 눈금 숫자 위에 앉았다 (실제로 그랬다). 핀으로 고정된 이름표도 잉크다. */
    var ink = [];
    var fs0 = o.fontSize || 18;
    function inkBox(x0, y0, x1, y1) {
      for (var gx = 0; gx <= 5; gx++) for (var gy = 0; gy <= 2; gy++)
        ink.push([x0 + (x1 - x0) * gx / 5, y0 + (y1 - y0) * gy / 2]);
    }
    function textBox(l) {
      var size = l.size || fs0;
      var w = visLen(l.text) * size * 0.52, h = size * 1.15;
      var x0 = l.anchor === 'end' ? l.x - w : (l.anchor === 'middle' ? l.x - w / 2 : l.x);
      return { x0: x0 - 3, y0: l.y - h + 2, x1: x0 + w + 3, y1: l.y + 4 };
    }

    /* 이름표는 먼저 «집»(자동 자리)을 정하고, 핀이 있으면 그리로 옮긴다.
       집을 같이 돌려주는 이유 — 편집기의 「원래 자리로」가 그것이다. */
    var labels = [];
    function lab(id, x, y, text, anchor, size, editable) {
      var home = { x: n(x), y: n(y), anchor: anchor || 'middle' };
      var p = at[id];
      var l = { id: id, text: String(text), size: size || null, editable: !!editable,
        home: home, x: p ? p.x : home.x, y: p ? p.y : home.y, anchor: p ? p.anchor : home.anchor, pinned: !!p };
      labels.push(l);
      var b = textBox(l); inkBox(b.x0, b.y0, b.x1, b.y1);
      return l;
    }

    var out = [];
    out.push('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" role="img">');
    /* 🔵 글꼴은 앱이 모두에게 내려 주는 Noto Serif (Google Fonts) 다 — 기기 글꼴을 쓰면
       강사 PC 와 학생 태블릿에서 글자 폭이 달라 «여기선 안 겹치는데 거기선 겹친다»가 된다.
       기울임은 <g> 가 아니라 글자 조각(tspan)마다 정한다 — 위 mathRuns. */
    out.push('<g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" ' +
      'font-family="\'Noto Serif\', \'Noto Serif KR\', Georgia, \'Times New Roman\', serif" font-size="' + fs0 + '">');

    /* 축 + 화살촉 */
    var axis = (scene.axis || {});
    out.push('<path d="M' + n(pad.l - 6) + ' ' + n(oy) + 'H' + n(W - pad.r + 12) + '"/>');
    out.push('<path d="M' + n(W - pad.r + 12) + ' ' + n(oy) + 'l-9 -5v10z" fill="currentColor" stroke="none"/>');
    out.push('<path d="M' + n(ox) + ' ' + n(H - pad.b + 6) + 'V' + n(pad.t - 12) + '"/>');
    out.push('<path d="M' + n(ox) + ' ' + n(pad.t - 12) + 'l-5 9h10z" fill="currentColor" stroke="none"/>');
    if (axis.xLabel !== null) lab('axis:x', W - pad.r + 8, oy - 12, axis.xLabel || 'x', 'start', null, true);
    if (axis.yLabel !== null) lab('axis:y', ox + 10, pad.t - 14, axis.yLabel || 'y', 'start', null, true);
    if (axis.origin !== null) lab('axis:origin', ox - 8, oy + 20, axis.origin || 'O', 'end', null, true);

    /* 눈금 — 숫자는 «값»이라 글자를 못 고친다 (editable:false) */
    (scene.xTicks || []).forEach(function (v, i) {
      if (v === ax.x) return;
      var px = PX(v);
      out.push('<path d="M' + n(px) + ' ' + n(oy - 5) + 'v10"/>');
      lab('xtick:' + i, px, oy + 24, fmt(v), 'middle', 17, false);
    });
    (scene.yTicks || []).forEach(function (v, i) {
      if (v === ax.y) return;
      var py = PY(v);
      out.push('<path d="M' + n(ox - 5) + ' ' + n(py) + 'h10"/>');
      lab('ytick:' + i, ox - 10, py + 6, fmt(v), 'end', 17, false);
    });

    /* 축선은 잉크다 — 도형 이름표보다 먼저 넣어야 원 이름이 y축 위에 앉지 않는다. */
    for (var ax1 = pad.l - 6; ax1 <= W - pad.r + 12; ax1 += 8) ink.push([ax1, oy]);
    for (var ay1 = pad.t - 12; ay1 <= H - pad.b + 6; ay1 += 8) ink.push([ox, ay1]);
    /* 점이 «있을 자리»를 먼저 잉크로 넣는다 — 점은 나중에 그리지만(맨 위에 보이게), 도형 이름표가
       그 자리를 피해야 한다. 점 이름표의 집도 같이(글자만 어림). */
    (scene.points || []).forEach(function (pt) {
      var y0 = pointY(pt, cs);
      if (!isFinite(y0)) return;
      var qx = PX(pt.x), qy = PY(y0);
      inkBox(qx - 5, qy - 5, qx + 5, qy + 5);
      if (pt.label) {
        var ddx = 0, ddy = -12, aa = 'middle';
        if (pt.labelPos === 'below') ddy = 24; else if (pt.labelPos === 'left') { ddx = -10; ddy = 6; aa = 'end'; } else if (pt.labelPos === 'right') { ddx = 10; ddy = 6; aa = 'start'; }
        var tb0 = textBox({ x: qx + ddx, y: qy + ddy, anchor: aa, text: pt.label }); inkBox(tb0.x0, tb0.y0, tb0.x1, tb0.y1);
      }
    });
    /* v2 — 도형. 칠하는 것(다각형)을 먼저, 선을 그 위에. 잉크로도 센다(이름표가 피하게). */
    var P2 = function (p) { return [PX(p[0]), PY(p[1])]; };
    function inkLine(a, b) { var L = Math.hypot(b[0] - a[0], b[1] - a[1]), k = Math.max(2, Math.round(L / 8)); for (var i = 0; i <= k; i++) ink.push([a[0] + (b[0] - a[0]) * i / k, a[1] + (b[1] - a[1]) * i / k]); }
    (scene.polygons || []).forEach(function (pg, i) {
      var ps = (pg.pts || []).map(P2);
      if (ps.length < 3) return;
      out.push('<path d="M' + ps.map(function (p) { return n(p[0]) + ' ' + n(p[1]); }).join('L') + 'Z"' +
        (pg.fill ? ' fill="currentColor" fill-opacity="0.08"' : '') + ' stroke-width="2"/>');
      for (var k = 0; k < ps.length; k++) inkLine(ps[k], ps[(k + 1) % ps.length]);
      if (pg.label) { var cx = 0, cy = 0; ps.forEach(function (p) { cx += p[0]; cy += p[1]; }); lab('poly:' + i, cx / ps.length, cy / ps.length + 6, pg.label, 'middle', null, true); }
    });
    (scene.segments || []).forEach(function (s, i) {
      if (!s.from || !s.to) return;
      var a = P2(s.from), b = P2(s.to);
      out.push('<path d="M' + n(a[0]) + ' ' + n(a[1]) + 'L' + n(b[0]) + ' ' + n(b[1]) + '"' + (s.dash ? ' stroke-dasharray="7 6"' : '') + ' stroke-width="2"/>');
      if (s.arrow) { var ang = Math.atan2(b[1] - a[1], b[0] - a[0]); out.push('<path d="M' + n(b[0]) + ' ' + n(b[1]) + 'l' + n(-10 * Math.cos(ang - 0.45)) + ' ' + n(-10 * Math.sin(ang - 0.45)) + 'M' + n(b[0]) + ' ' + n(b[1]) + 'l' + n(-10 * Math.cos(ang + 0.45)) + ' ' + n(-10 * Math.sin(ang + 0.45)) + '"/>'); }
      inkLine(a, b);
      if (s.label) {   /* 중점에서 수직 방향으로 12px 비켜 앉힌다 */
        var mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
        var nx = -(b[1] - a[1]) / L, ny = (b[0] - a[0]) / L;
        if (ny > 0) { nx = -nx; ny = -ny; }                       // 위쪽으로
        lab('seg:' + i, mx + nx * 14, my + ny * 14 + 6, s.label, 'middle', null, true);
      }
    });
    (scene.circles || []).forEach(function (c, i) {
      if (!c.c || !(c.r > 0)) return;
      var cc = P2(c.c), rpx = c.r * plotW / (xr[1] - xr[0]);
      out.push('<circle cx="' + n(cc[0]) + '" cy="' + n(cc[1]) + '" r="' + n(rpx) + '"' + (c.dash ? ' stroke-dasharray="7 6"' : '') + ' stroke-width="2"/>');
      for (var t = 0; t < 40; t++) ink.push([cc[0] + rpx * Math.cos(t / 40 * 2 * Math.PI), cc[1] + rpx * Math.sin(t / 40 * 2 * Math.PI)]);
      if (c.label) {   /* 네 귀퉁이 중 잉크가 없는 첫 자리 — 꼭짓점이 오른쪽 위에 오는 일이 잦다 */
        var cands = [[0.72, -0.72, 'start'], [-0.72, -0.72, 'end'], [0.72, 0.72, 'start'], [-0.72, 0.72, 'end']];
        var pick = cands[0];
        for (var q = 0; q < cands.length; q++) {
          var tb = textBox({ x: cc[0] + rpx * cands[q][0] + (cands[q][2] === 'start' ? 8 : -8), y: cc[1] + rpx * cands[q][1] + (cands[q][1] < 0 ? -6 : 18), anchor: cands[q][2], text: c.label });
          var hit = false;
          for (var z = 0; z < ink.length && !hit; z++) if (ink[z][0] >= tb.x0 && ink[z][0] <= tb.x1 && ink[z][1] >= tb.y0 && ink[z][1] <= tb.y1) hit = true;
          if (!hit) { pick = cands[q]; break; }
        }
        lab('circle:' + i, cc[0] + rpx * pick[0] + (pick[2] === 'start' ? 8 : -8), cc[1] + rpx * pick[1] + (pick[1] < 0 ? -6 : 18), c.label, pick[2], null, true);
      }
    });
    (scene.angles || []).forEach(function (g, i) {
      if (!g.at || !g.from || !g.to) return;
      var v0 = P2(g.at), a1 = Math.atan2(P2(g.from)[1] - v0[1], P2(g.from)[0] - v0[0]), a2 = Math.atan2(P2(g.to)[1] - v0[1], P2(g.to)[0] - v0[0]);
      var d = a2 - a1; while (d <= -Math.PI) d += 2 * Math.PI; while (d > Math.PI) d -= 2 * Math.PI;
      var R = 18;
      if (g.right) {
        var e1 = [Math.cos(a1) * 13, Math.sin(a1) * 13], e2 = [Math.cos(a2) * 13, Math.sin(a2) * 13];
        out.push('<path d="M' + n(v0[0] + e1[0]) + ' ' + n(v0[1] + e1[1]) + 'l' + n(e2[0]) + ' ' + n(e2[1]) + 'l' + n(-e1[0]) + ' ' + n(-e1[1]) + '" stroke-width="1.4"/>');
      } else {
        var s1 = [v0[0] + R * Math.cos(a1), v0[1] + R * Math.sin(a1)], s2 = [v0[0] + R * Math.cos(a2), v0[1] + R * Math.sin(a2)];
        out.push('<path d="M' + n(s1[0]) + ' ' + n(s1[1]) + 'A' + R + ' ' + R + ' 0 0 ' + (d > 0 ? 1 : 0) + ' ' + n(s2[0]) + ' ' + n(s2[1]) + '" stroke-width="1.4"/>');
      }
      if (g.label) { var am = a1 + d / 2; lab('angle:' + i, v0[0] + (R + 16) * Math.cos(am), v0[1] + (R + 16) * Math.sin(am) + 6, g.label, 'middle', null, true); }
    });

    /* 곡선 — 창 밖으로 나가면 선을 끊는다. 잘린 자리가 자연스러워 보인다.
       이름표는 **두 번째 바퀴에서** 놓는다. 그리면서 놓으면 첫 곡선의 이름표가
       아직 안 그려진 곡선 위에 앉는다 (실제로 그렇게 됐다). */
    var drawn = [];
    cs.forEach(function (c) {
      if (!c.fn) return;
      var d = c.def.domain || xr;
      var a = Math.max(d[0], xr[0]), b = Math.min(d[1], xr[1]);
      var segs = sample(c.fn, a, b, xr, yr, PX, PY, plotW);
      segs.forEach(function (seg) {
        out.push('<path d="' + seg.d + '"' + (c.def.dash ? ' stroke-dasharray="7 6"' : '') + ' stroke-width="2.1"/>');
      });
      drawn.push({ c: c, segs: segs });
    });

    /* 곡선도 잉크다 (축선은 도형 앞에서, 눈금 숫자·축 이름은 lab() 이 이미 넣었다). */
    drawn.forEach(function (dc) { dc.segs.forEach(function (s) { ink = ink.concat(s.pts); }); });

    /* 점 · 내린 점선 — 점 이름표를 곡선 이름표보다 먼저 앉힌다. 그래야 곡선 이름표가 그것을 피한다. */
    (scene.points || []).forEach(function (pt, i) {
      var y = pointY(pt, cs);
      if (!isFinite(y)) return;
      var px = PX(pt.x), py = PY(y);
      if (pt.dropTo === 'axis' || pt.dropTo === 'x')
        out.push('<path d="M' + n(px) + ' ' + n(py) + 'V' + n(oy) + '" stroke-dasharray="6 5" stroke-width="1.3"/>');
      if (pt.dropTo === 'y')
        out.push('<path d="M' + n(px) + ' ' + n(py) + 'H' + n(ox) + '" stroke-dasharray="6 5" stroke-width="1.3"/>');
      if (pt.dot !== false)
        out.push('<circle cx="' + n(px) + '" cy="' + n(py) + '" r="4" fill="currentColor" stroke="none"/>');
      if (pt.label) {
        var dx = 0, dy = -12, anc = 'middle';
        if (pt.labelPos === 'below') dy = 24;
        else if (pt.labelPos === 'left') { dx = -10; dy = 6; anc = 'end'; }
        else if (pt.labelPos === 'right') { dx = 10; dy = 6; anc = 'start'; }
        lab('point:' + i, px + dx, py + dy, pt.label, anc, null, true);
      }
    });

    /* 자유 배치 라벨 */
    (scene.labels || []).forEach(function (l, i) {
      lab('label:' + i, PX(l.x), PY(l.y), l.text, l.anchor || 'middle', null, true);
    });

    /* 곡선 이름표 — 핀이 있으면 그 자리, 없으면 잉크를 피해 자동으로 */
    var placed = [];
    /* placed 는 «곡선 이름표끼리» 떨어뜨리는 값이다 — 다른 이름표는 잉크로 이미 피한다.
       점·눈금까지 넣으면 핀을 찍는 순간 자동 자리가 달라져 「원래 자리로」가 딴 데로 간다. */
    labels.forEach(function (l) { if (l.pinned && l.id.indexOf('curve:') === 0) placed.push({ x: l.x, y: l.y }); });
    drawn.forEach(function (dc) {
      if (!dc.c.def.label) return;
      var id = 'curve:' + dc.c.i;
      var spot = labelSpot(dc.c, dc.segs, PX, PY, ink, placed, W, H, pad, fs0);
      if (!spot && !at[id]) return;                 // 앉힐 자리도 핀도 없다
      var hm = spot || at[id];
      var l = lab(id, hm.x, hm.y, dc.c.def.label, hm.anchor, null, true);
      placed.push({ x: l.x, y: l.y });
    });

    /* 글자는 맨 뒤에 — 편집 모드면 잡기 상자를 깔고 <g data-lbl> 로 싼다 */
    labels.forEach(function (l) {
      var size = l.size || fs0;
      var t = '<text x="' + n(l.x) + '" y="' + n(l.y) + '" text-anchor="' + l.anchor + '"' +
        (l.size ? ' font-size="' + l.size + '"' : '') + ' fill="currentColor" stroke="none">' + runsToSVG(l.text, size) + '</text>';
      if (!o.edit) { out.push(t); return; }
      var b = textBox(l);
      out.push('<g data-lbl="' + esc(l.id) + '" data-x="' + n(l.x) + '" data-y="' + n(l.y) + '" data-anchor="' + l.anchor + '">' +
        '<rect x="' + n(b.x0 - 5) + '" y="' + n(b.y0 - 5) + '" width="' + n(b.x1 - b.x0 + 10) + '" height="' + n(b.y1 - b.y0 + 10) +
        '" rx="4" fill="transparent" stroke="none" pointer-events="all"/>' + t + '</g>');
    });

    out.push('</g></svg>');
    return { svg: out.join('\n'), labels: labels, size: [W, H], pinned: !!pins };
  }

  function renderScene(scene, opt) { return build(scene, opt).svg; }
  function layoutLabels(scene, opt) { return build(scene, opt).labels; }

  /* 「첫 손길에 전부 핀」 — 하나만 핀하면 나머지 자동 이름표가 잉크가 달라졌다고 딴 데로 옮겨 앉는다. */
  function pinAll(scene, opt) {
    var r = build(scene, opt);
    var at = {};
    r.labels.forEach(function (l) { at[l.id] = { x: l.x, y: l.y, anchor: l.anchor }; });
    return { size: r.size, at: at };
  }

  /* 이름표 «글자»를 장면의 원래 자리에 쓴다. 눈금은 값이라 안 된다. */
  function setLabelText(scene, id, text) {
    var m = /^(curve|point|label|axis|seg|poly|circle|angle):(.+)$/.exec(String(id));
    if (!m) return false;
    var t = String(text == null ? '' : text);
    var arr = { seg: 'segments', poly: 'polygons', circle: 'circles', angle: 'angles' }[m[1]];
    if (arr) { var el = (scene[arr] || [])[+m[2]]; if (!el) return false; el.label = t; return true; }
    if (m[1] === 'curve') { var c = (scene.curves || [])[+m[2]]; if (!c) return false; c.label = t; return true; }
    if (m[1] === 'point') { var p = (scene.points || [])[+m[2]]; if (!p) return false; p.label = t; return true; }
    if (m[1] === 'label') { var l = (scene.labels || [])[+m[2]]; if (!l) return false; l.text = t; return true; }
    scene.axis = scene.axis || {};
    if (m[2] === 'x') scene.axis.xLabel = t; else if (m[2] === 'y') scene.axis.yLabel = t;
    else if (m[2] === 'origin') scene.axis.origin = t; else return false;
    return true;
  }

  /* 자유 라벨을 «창 한가운데»에 더한다 — 끌어서 놓으면 된다. 데이터 좌표라 창을 안 넓힌다(가운데니까).
     돌려주는 것은 새 이름표의 id. */
  function addLabel(scene, text, opt) {
    var win = autoWindow(scene, opt);
    scene.labels = scene.labels || [];
    scene.labels.push({ x: (win.xRange[0] + win.xRange[1]) / 2, y: (win.yRange[0] + win.yRange[1]) / 2, text: String(text || 'A'), anchor: 'middle' });
    return 'label:' + (scene.labels.length - 1);
  }
  /* 자유 라벨을 뺀다. 뒤 번호의 핀을 한 칸씩 당긴다 — 안 당기면 남의 핀을 쓴다. */
  function removeLabel(scene, id) {
    var m = /^label:(\d+)$/.exec(String(id));
    if (!m || !scene.labels || !scene.labels[+m[1]]) return false;
    var i = +m[1];
    scene.labels.splice(i, 1);
    if (scene.pins && scene.pins.at) {
      var at = scene.pins.at, next = {};
      Object.keys(at).forEach(function (k) {
        var mm = /^label:(\d+)$/.exec(k);
        if (!mm) { next[k] = at[k]; return; }
        var j = +mm[1];
        if (j < i) next[k] = at[k]; else if (j > i) next['label:' + (j - 1)] = at[k];
      });
      scene.pins.at = next;
    }
    return true;
  }

  /* 겹침 — 어림 글자 상자끼리. 브라우저에서는 getBBox 가 더 정확하지만 node 검사는 이걸로 잰다. */
  function labelBoxes(scene, opt) {
    var o = opt || {}, fs0 = o.fontSize || 18;
    return layoutLabels(scene, opt).map(function (l) {
      var size = l.size || fs0;
      var w = visLen(l.text) * size * 0.52, h = size * 1.15;
      var x0 = l.anchor === 'end' ? l.x - w : (l.anchor === 'middle' ? l.x - w / 2 : l.x);
      return { id: l.id, x0: x0, y0: l.y - h + 2, x1: x0 + w, y1: l.y + 4 };
    });
  }
  function overlaps(boxes) {
    var hits = [];
    for (var i = 0; i < boxes.length; i++) for (var j = i + 1; j < boxes.length; j++) {
      var a = boxes[i], b = boxes[j];
      if (a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1) hits.push([a.id, b.id]);
    }
    return hits;
  }

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  /* 화면에서 2px 간격으로 훑는다. 창을 벗어나면 조각을 끊는다. */
  function sample(fn, a, b, xr, yr, PX, PY, plotW) {
    var steps = Math.max(60, Math.round(plotW / 2));
    var segs = [], cur = null;
    for (var i = 0; i <= steps; i++) {
      var x = a + (b - a) * i / steps;
      var y = fn(x);
      var inside = isFinite(y) && y >= yr[0] && y <= yr[1];
      if (inside) {
        var px = n(PX(x)), py = n(PY(y));
        if (!cur) { cur = { d: 'M' + px + ' ' + py, pts: [[px, py]] }; }
        else { cur.d += 'L' + px + ' ' + py; cur.pts.push([px, py]); }
      } else if (cur) { segs.push(cur); cur = null; }
    }
    if (cur) segs.push(cur);
    return segs.filter(function (s) { return s.pts.length > 2; });
  }

  /* 이름표 자리 — 여기가 «못나 보이는» 사고가 나는 자리다. 규칙을 눈에 보이게 둔다.

     ① 후보는 «제일 긴 조각» 위 여러 지점의 네 방향 바깥쪽
     ② 후보마다 **글자가 앉을 상자**를 만들고, 그 안에 잉크(곡선·축)가 하나라도 들어오면 버린다
     ③ 남은 것 중 «자기 곡선에는 가깝고 남의 이름표와는 먼» 쪽을 고른다
        — 너무 멀면 어느 곡선의 이름인지 알 수 없게 된다 */
  function labelSpot(c, segs, PX, PY, ink, placed, W, H, pad, fs) {
    if (!segs.length) return null;
    var seg = segs.reduce(function (m, s) { return s.pts.length > m.pts.length ? s : m; }, segs[0]);
    var pts = seg.pts;
    var label = String(c.def.label);
    var tw = visLen(label) * fs * 0.52, th = fs * 1.15;     // 글자 상자 어림값 (첨자는 0.7)

    function box(cd) {
      var x0 = cd.anchor === 'end' ? cd.x - tw : (cd.anchor === 'middle' ? cd.x - tw / 2 : cd.x);
      return { x0: x0 - 4, x1: x0 + tw + 4, y0: cd.y - th + 2, y1: cd.y + 5 };
    }
    function inkIn(b) {
      var hit = 0;
      for (var i = 0; i < ink.length; i++) {
        var p = ink[i];
        if (p[0] >= b.x0 && p[0] <= b.x1 && p[1] >= b.y0 && p[1] <= b.y1) { hit++; if (hit > 0) return hit; }
      }
      return hit;
    }

    var cands = [];
    if (typeof c.def.labelAt === 'number') {
      var lx = PX(c.def.labelAt), ly = PY(c.fn(c.def.labelAt));
      [[16, -12, 'start'], [16, 26, 'start'], [-16, -12, 'end'], [-16, 26, 'end']].forEach(function (off) {
        cands.push({ x: lx + off[0], y: ly + off[1], anchor: off[2], anchorPt: [lx, ly] });
      });
    } else {
      [0.94, 0.86, 0.10, 0.04, 0.70, 0.30, 0.50].forEach(function (t) {
        var idx = Math.max(0, Math.min(pts.length - 1, Math.round((pts.length - 1) * t)));
        var p = pts[idx];
        [[20, -14, 'start'], [20, 28, 'start'], [-20, -14, 'end'], [-20, 28, 'end']].forEach(function (off) {
          cands.push({ x: p[0] + off[0], y: p[1] + off[1], anchor: off[2], anchorPt: p });
        });
      });
    }

    var best = null, bestCost = Infinity;
    cands.forEach(function (cd) {
      var b = box(cd);
      if (b.x0 < 4 || b.x1 > W - 4 || b.y0 < 4 || b.y1 > H - 4) return;     // 화면 밖
      if (inkIn(b)) return;                                                  // 잉크 위에 앉는다
      var far = 1e9;
      placed.forEach(function (pl) { far = Math.min(far, Math.abs(pl.x - cd.x) + Math.abs(pl.y - cd.y)); });
      var near = Math.abs(cd.x - cd.anchorPt[0]) + Math.abs(cd.y - cd.anchorPt[1]);
      var cost = near - Math.min(far, 120) * 0.6;
      if (cost < bestCost) { bestCost = cost; best = cd; }
    });
    return best;
  }

  globalThis.Figure = {
    SCHEMA_VERSION: 2,
    parseExpr: parseExpr,
    autoWindow: autoWindow,
    verifyScene: verifyScene,
    renderScene: renderScene,
    /* 이름표 편집기 (2026-09-11 · docs/그림-편집기-계획.md) */
    layoutLabels: layoutLabels,
    pinAll: pinAll,
    cleanPins: cleanPins,
    setLabelText: setLabelText,
    addLabel: addLabel,
    removeLabel: removeLabel,
    hasShapes: hasShapes,
    labelBoxes: labelBoxes,
    overlaps: overlaps,
    mathRuns: mathRuns
  };
})();
