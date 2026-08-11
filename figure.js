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
  function autoWindow(scene) {
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

    return { xRange: xRange, yRange: yRange };
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
    var win = autoWindow(scene);
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
      } else {
        fails.push({ type: 'unknown', msg: '모르는 검사 «' + ck.type + '»' });
      }
    });

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

  function renderScene(scene, opt) {
    var o = opt || {};
    var W = o.width || 720, H = o.height || 540;
    var pad = o.pad || { l: 40, r: 46, t: 34, b: 42 };
    var win = autoWindow(scene);
    var xr = win.xRange, yr = win.yRange;
    var cs = compileCurves(scene);
    var plotW = W - pad.l - pad.r, plotH = H - pad.t - pad.b;

    var PX = function (x) { return pad.l + (x - xr[0]) / (xr[1] - xr[0]) * plotW; };
    var PY = function (y) { return pad.t + (yr[1] - y) / (yr[1] - yr[0]) * plotH; };

    /* 축은 0이 창 안에 있으면 그 자리에, 없으면 가장자리에 붙인다. */
    var ax = { x: clamp(0, xr[0], xr[1]), y: clamp(0, yr[0], yr[1]) };
    var ox = PX(ax.x), oy = PY(ax.y);

    /* «잉크»가 있는 자리를 모아 둔다 — 곡선 이름표는 이 자리를 피해 앉는다.
       축·눈금 숫자·원점 표시까지 전부 넣어야 한다. 곡선만 피하게 했더니
       이름표가 눈금 숫자 위에 앉았다 (실제로 그랬다). */
    var ink = [];
    var fs0 = o.fontSize || 18;
    function inkBox(x0, y0, x1, y1) {
      for (var gx = 0; gx <= 5; gx++) for (var gy = 0; gy <= 2; gy++)
        ink.push([x0 + (x1 - x0) * gx / 5, y0 + (y1 - y0) * gy / 2]);
    }
    function inkText(x, y, s, anchor, size) {
      var w = String(s).length * (size || fs0) * 0.52, h = (size || fs0) * 1.15;
      var x0 = anchor === 'end' ? x - w : (anchor === 'middle' ? x - w / 2 : x);
      inkBox(x0 - 3, y - h + 2, x0 + w + 3, y + 4);
    }

    var out = [];
    out.push('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" role="img">');
    out.push('<g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" ' +
      'font-family="Georgia, \'Times New Roman\', serif" font-style="italic" font-size="' + (o.fontSize || 18) + '">');

    /* 축 + 화살촉 */
    var axis = (scene.axis || {});
    out.push('<path d="M' + n(pad.l - 6) + ' ' + n(oy) + 'H' + n(W - pad.r + 12) + '"/>');
    out.push('<path d="M' + n(W - pad.r + 12) + ' ' + n(oy) + 'l-9 -5v10z" fill="currentColor" stroke="none"/>');
    out.push('<path d="M' + n(ox) + ' ' + n(H - pad.b + 6) + 'V' + n(pad.t - 12) + '"/>');
    out.push('<path d="M' + n(ox) + ' ' + n(pad.t - 12) + 'l-5 9h10z" fill="currentColor" stroke="none"/>');
    if (axis.xLabel !== null) { out.push(text(W - pad.r + 8, oy - 12, esc(axis.xLabel || 'x'), 'start')); inkText(W - pad.r + 8, oy - 12, axis.xLabel || 'x', 'start'); }
    if (axis.yLabel !== null) { out.push(text(ox + 10, pad.t - 14, esc(axis.yLabel || 'y'), 'start')); inkText(ox + 10, pad.t - 14, axis.yLabel || 'y', 'start'); }
    if (axis.origin !== null) { out.push(text(ox - 8, oy + 20, esc(axis.origin || 'O'), 'end')); inkText(ox - 8, oy + 20, axis.origin || 'O', 'end'); }

    /* 눈금 */
    (scene.xTicks || []).forEach(function (v) {
      if (v === ax.x) return;
      var px = PX(v);
      out.push('<path d="M' + n(px) + ' ' + n(oy - 5) + 'v10"/>');
      out.push(text(px, oy + 24, esc(fmt(v)), 'middle', 16));
      inkText(px, oy + 24, fmt(v), 'middle', 16);
    });
    (scene.yTicks || []).forEach(function (v) {
      if (v === ax.y) return;
      var py = PY(v);
      out.push('<path d="M' + n(ox - 5) + ' ' + n(py) + 'h10"/>');
      out.push(text(ox - 10, py + 6, esc(fmt(v)), 'end', 16));
      inkText(ox - 10, py + 6, fmt(v), 'end', 16);
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

    /* 축선과 곡선도 잉크다 (눈금 숫자·축 이름은 그리면서 이미 넣었다). */
    for (var ax1 = pad.l - 6; ax1 <= W - pad.r + 12; ax1 += 8) ink.push([ax1, oy]);
    for (var ay1 = pad.t - 12; ay1 <= H - pad.b + 6; ay1 += 8) ink.push([ox, ay1]);
    drawn.forEach(function (dc) { dc.segs.forEach(function (s) { ink = ink.concat(s.pts); }); });

    var placed = [];
    drawn.forEach(function (dc) {
      if (!dc.c.def.label) return;
      var spot = labelSpot(dc.c, dc.segs, PX, PY, ink, placed, W, H, pad, fs0);
      if (!spot) return;
      placed.push(spot);
      out.push(text(spot.x, spot.y, esc(dc.c.def.label), spot.anchor));
    });

    /* 점 · 내린 점선 */
    (scene.points || []).forEach(function (pt) {
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
        out.push(text(px + dx, py + dy, esc(pt.label), anc));
      }
    });

    /* 자유 배치 라벨 */
    (scene.labels || []).forEach(function (l) {
      out.push(text(PX(l.x), PY(l.y), esc(l.text), l.anchor || 'middle'));
    });

    out.push('</g></svg>');
    return out.join('\n');

    function text(x, y, s, anchor, size) {
      return '<text x="' + n(x) + '" y="' + n(y) + '" text-anchor="' + (anchor || 'middle') + '"' +
        (size ? ' font-size="' + size + '"' : '') + ' fill="currentColor" stroke="none">' + s + '</text>';
    }
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
    var tw = label.length * fs * 0.52, th = fs * 1.15;      // 글자 상자 어림값

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
    SCHEMA_VERSION: 1,
    parseExpr: parseExpr,
    autoWindow: autoWindow,
    verifyScene: verifyScene,
    renderScene: renderScene
  };
})();
