/* 한글 붙여넣기 묶음 — 창고 문항을 «한글 클립보드» 꼴로 낸다 (2026-10-14)
 *
 * 한글은 복사할 때 클립보드 HTML 속 주석에 문서 조각을 JSON 으로 싣는다:
 *   <div id="hwpEditorBoardContent" data-hjsonver="1.0" data-jsonlen=N><!--[data-hwpjson]{…}--></div>
 * 붙일 때 이 JSON 만 있으면 한글이 원본 그대로 되살린다(상자·수식·그림·미주 정답·해설).
 * 문항마다 이 JSON 을 교재 원본에서 한글로 뽑아 `hwpclip/{코드}` 에 둔다(강사·조교만 읽는다 — 정답·해설이 들었다).
 *
 * JSON 의 뼈: ro = 본문 문단 사슬(hp → 문단.np → …) · cs = 개체 · sl = 칸·미주 속 문단
 *   · bf/cp/pp/st/… = 모양 · bi/bidt = 그림. 열쇠는 모두 24자리 16진수 글자다.
 * 🔴 여러 문항을 합칠 때 그 열쇠가 겹치면 안 된다 → 문항마다 새 열쇠로 갈아 끼운다.
 *    (정규식 뒤보기(lookbehind)는 옛 사파리에서 파일째 죽는다 — 글자로 갈지 말고 짜임을 걸어 다닌다.)
 * 수식 미리보기 그림(eq.pi)은 뽑을 때 뗀다 — 한글이 붙이며 다시 그린다(10-14 실험). */

const HWPCLIP_ID_RE = /^[0-9A-F]{24}(\.[A-Za-z0-9]+)?$/;

/* 한 문항의 JSON 을 열쇠만 새로 갈아 돌려준다 (n 번째 문항 → 앞 8자리가 n). */
function hwpClipRekey(j, n){
  const map = new Map();
  let seq = 0;
  const pre = (n + 1).toString(16).toUpperCase().padStart(8, '0');
  const nid = s => {
    const m = s.match(HWPCLIP_ID_RE);
    if(!m) return s;
    const id = s.slice(0, 24);
    if(!map.has(id)) map.set(id, pre + (++seq).toString(16).toUpperCase().padStart(16, '0'));
    return map.get(id) + (m[1] || '');
  };
  const walk = v => {
    if(typeof v === 'string') return nid(v);
    if(Array.isArray(v)) return v.map(walk);
    if(v && typeof v === 'object'){
      const o = {};
      for(const k of Object.keys(v)) o[nid(k)] = walk(v[k]);
      return o;
    }
    return v;
  };
  const { bidt, ...rest } = j;
  const out = walk(rest);
  out.bidt = {};
  for(const k of Object.keys(bidt || {})) out.bidt[nid(k)] = bidt[k];   // 그림 바이트(base64)는 안 건드린다
  return out;
}

/* 본문 사슬의 마지막 문단 열쇠 */
function hwpClipLastPara(ro){
  let k = ro.hp, guard = 0;
  while(ro[k] && ro[k].np && guard++ < 100000) k = ro[k].np;
  return k;
}

/* 한글은 조각 첫 문단에 «구역 정의(secd)·단 정의(cold)»를 싣는다. 그대로 이으면 문항마다 새 구역 = 새 쪽이 되고
   번호(001)도 구역마다 새로 센다(10-14 실험). 붙는 자리의 구역을 따르게 뗀다. */
const HWPCLIP_SEC_CI = [1936024420, 1668246628];   // 'secd' · 'cold'
function hwpClipDropSection(j){
  const p = j.ro && j.ro[j.ro.hp];
  if(!p) return j;
  for(const r of p.ru || []) r.ch = r.ch.filter(c => {
    const o = c.co && j.cs[c.co];
    if(c.cc === 2 && o && HWPCLIP_SEC_CI.includes(o.ci)){ delete j.cs[c.co]; return false; }
    return true;
  });
  return j;
}

/* 문항마다 새 열쇠를 받은 모양(테두리·글자·문단·번호·스타일) 중 «속이 같은 것»을 하나로 접는다.
   🔵 번호 정의(nu)가 하나여야 001·002·003 으로 이어 센다 — 따로면 문항마다 001 이다(10-14 실험).
   잎부터(bf·tp·nu·bu → cp → pp → st) 접어야 위의 것이 같아진다. */
function hwpClipDedupe(j){
  const swap = (v, m) => typeof v === 'string' ? (m.has(v) ? m.get(v) : v)
    : Array.isArray(v) ? v.map(x => swap(x, m))
    : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [m.has(k) ? m.get(k) : k, swap(x, m)]))
    : v;
  for(const t of ['bf', 'tp', 'nu', 'bu', 'cp', 'pp', 'st']){
    if(!j[t]) continue;
    const seen = new Map(), m = new Map();
    for(const [k, v] of Object.entries(j[t])){
      const { id, ...rest } = v;
      const canon = JSON.stringify(rest).split(k).join('#');   // 스타일은 «다음 스타일»로 저를 가리킨다
      if(seen.has(canon)) m.set(k, seen.get(canon)); else seen.set(canon, k);
    }
    if(!m.size) continue;
    for(const k of m.keys()) delete j[t][k];
    const { bidt, ...rest } = j;
    j = Object.assign(swap(rest, m), { bidt });
  }
  return j;
}

/* 여러 문항을 차례대로 한 조각으로 잇는다. 모양 표는 합치고, 본문 사슬은 꼬리에 머리를 단다. */
function hwpClipMerge(list){
  if(!list.length) throw new Error('빈 묶음');
  const parts = list.map((j, n) => hwpClipDropSection(hwpClipRekey(j, n)));
  /* 번호 정의는 «시작 번호»를 교재 자리대로 들고 온다(주기나 401·315… · 엔크 431…) — 그대로면 단원이 섞일 때
     번호가 들쭉날쭉하다. 담은 묶음은 1번부터 차례로 센다(시작을 맞춰야 아래 접기에서 하나로 접힌다). */
  /* 🔵 교재는 번호 자리에 따라 정의를 갈아 끼워 세 자리를 맞춘다(00^1 → 001 · 0^1 → 045 · ^1 → 431) — 한 정의로는 못 한다.
     그래서 문항 번호 정의(00^1·0^1·^1)는 모두 첫 것 하나로 같게 만들고(1·2·3…) 아래 접기가 하나로 접게 한다.
     그 밖의 번호(^1. 같은 목록)는 건드리지 않는다. */
  /* 🔴 번호 문단의 «문단 모양»도 하나여야 한다 (10-15) — 정의가 하나여도 문단 모양이 다르면(정렬 값 ah 2·3 만 달라도)
     한글이 따로 센다: 엔크 0057·0050·0476·0019 를 이으니 1·2·1·3. 첫 번호 문단 모양을 모두에 입혀 아래 접기가 하나로 접게 한다. */
  let 문항번호 = null, 번호모양 = null;
  for(const p of parts) for(const [k, v] of Object.entries(p.nu || {})){
    if(!(v.ph && v.ph[0] && /^0*\^1$/.test(v.ph[0].sf))) continue;
    if(!문항번호){
      문항번호 = JSON.parse(JSON.stringify(v));
      문항번호.sn = 1;
      문항번호.ph[0].sf = '^1';
      for(const ph of 문항번호.ph) ph.st = 1;   // 수준마다 시작값도 한 벌 더 있다(엔크 ph[0].st = 431)
    }
    p.nu[k] = Object.assign(JSON.parse(JSON.stringify(문항번호)), { id: v.id });
    for(const [pk, pv] of Object.entries(p.pp || {})){
      if(pv.hi !== k) continue;
      if(!번호모양) 번호모양 = JSON.parse(JSON.stringify(pv));
      else p.pp[pk] = Object.assign(JSON.parse(JSON.stringify(번호모양)), { id: pv.id, hi: k });
    }
  }
  const out = JSON.parse(JSON.stringify(parts[0]));
  for(const p of parts.slice(1)){
    for(const k of Object.keys(p)){
      if(k === 'ro' || k === 'documentPr' || k === 'dh') continue;
      if(Array.isArray(p[k])) out[k] = (out[k] || []).concat(p[k]);
      else if(p[k] && typeof p[k] === 'object') out[k] = Object.assign(out[k] || {}, p[k]);
    }
    const tail = hwpClipLastPara(out.ro);
    const { hp, ...paras } = p.ro;
    Object.assign(out.ro, paras);
    out.ro[tail].np = hp;
  }
  return hwpClipDedupe(out);
}

/* 변형 그림(SVG 글) → PNG {b64, w, h, ext} — hwpClipFromVariant 의 fig. 브라우저 전용(캔버스).
   3배로 그려 인쇄에도 또렷하게 · 흰 바탕을 깐다(투명이면 한글 어두운 배경에서 안 보인다).
   ⚠ <img> 로 그린 SVG 는 웹글꼴을 못 쓴다 — 'Noto Serif' 가 없으면 Georgia 등 설치된 글꼴로 나온다. */
function hwpClipSvgToPng(svg, scale){
  scale = scale || 3;
  return new Promise((ok, no) => {
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth || 560, h = img.naturalHeight || 430;
      const c = document.createElement('canvas');
      c.width = w * scale; c.height = h * scale;
      const g = c.getContext('2d');
      g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
      g.drawImage(img, 0, 0, c.width, c.height);
      ok({ b64: c.toDataURL('image/png').split(',')[1], w, h, ext: 'png' });
    };
    img.onerror = () => no(new Error('그림을 그리지 못했습니다'));
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  });
}

/* 클립보드에 넣을 HTML — 한글이 읽는 꼴. JSON 의 <>&' 는 \uXXXX 로(주석이 안 깨지게). */
function hwpClipHTML(j){
  const js = JSON.stringify(j).replace(/[<>&']/g, c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
  const len = new TextEncoder().encode(js).length;
  return '<html><head><meta charset="utf-8"></head><body><!--StartFragment-->'
    + '<div id="hwpEditorBoardContent" class="hwp_editor_board_content" data-hjsonver="1.0" data-jsonlen="' + len + '">'
    + '<!--[data-hwpjson]' + js + '--></div><!--EndFragment--></body></html>';
}

/* LaTeX(AI 변형 문항의 `$…$` 속) → 한글 수식 스크립트 (2026-10-15 · 한글로 그려 보고 정한 것 — ~/.claude/tools/hwpclip/eqprobe.py)
   정규식 사슬 대신 한 글자씩 읽는다(LaTeX 는 짜임이 분명하다). 토막은 띄어쓰기로 잇는다 — 한글 수식은 띄어쓰기를 안 그린다.
   🔴 글자는 «한 자씩» 띄어 낸다 — 붙여 두면 한글이 `it`·`rm`·`in`·`pi` 를 명령으로 먹는다(`x+it` 의 it 이 사라졌다).
   🔴 첨자는 늘 `{}` 로 묶는다 — 한글은 띄어쓰기까지 첨자로 본다(`x^2-7x` = x^(2−7x)).
   `{rm "…"}` = 띄어쓰기까지 바로 선 글자(\text·\mathrm·max). 한글이 모르는 것: setminus(→ -)·perp(→ bot)·mathbb(→ bold).
   miss 를 주면 못 알아본 \명령 이름을 담는다(검사용). */
const HWPEQ_SYM = {
  times:'TIMES', div:'DIV', pm:'+-', mp:'-+', cdot:'cdot', cdots:'cdots', ldots:'LDOTS', dots:'LDOTS', vdots:'vdots', ddots:'ddots',
  le:'LEQ', leq:'LEQ', leqslant:'LEQ', ge:'GEQ', geq:'GEQ', geqslant:'GEQ', ne:'!=', neq:'!=', lt:'<', gt:'>',
  in:'in', ni:'owns', notin:'notin', subset:'subset', subseteq:'subseteq', subsetneq:'subset', supset:'supset', supseteq:'supseteq',
  cap:'cap', cup:'cup', emptyset:'emptyset', varnothing:'emptyset', setminus:'-', mid:'|', vert:'|', lvert:'|', rvert:'|', '|':'||', Vert:'||',
  therefore:'THEREFORE', because:'BECAUSE', Rightarrow:'RARROW', implies:'RARROW', Leftarrow:'LARROW', Leftrightarrow:'LRARROW', iff:'LRARROW',
  rightarrow:'rarrow', to:'rarrow', mapsto:'rarrow', leftarrow:'larrow', leftrightarrow:'lrarrow',
  triangle:'triangle', angle:'angle', circ:'circ', prime:'prime', infty:'inf', approx:'approx', sim:'sim', simeq:'simeq', equiv:'equiv',
  perp:'bot', parallel:'parallel', star:'star', ast:'*', oplus:'oplus', otimes:'otimes',
  lfloor:'lfloor', rfloor:'rfloor', lceil:'lceil', rceil:'rceil', langle:'<', rangle:'>',
  sin:'sin', cos:'cos', tan:'tan', sec:'sec', csc:'csc', cot:'cot', log:'log', ln:'ln', exp:'exp', lim:'lim', sum:'sum', prod:'prod', int:'int',
  '{':'lbrace', '}':'rbrace', '%':'%', '&':'&', '#':'#', '_':'_', '$':'$', '\\':'#',
  ',':'`', ':':'~', ';':'~', '>':'~', ' ':'~', quad:'~~', qquad:'~~~~', '!':'',
  displaystyle:'', textstyle:'', limits:'', nolimits:'', big:'', Big:'', bigl:'', bigr:'', Bigl:'', Bigr:'', bigg:'', biggl:'', biggr:'',
};
'alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu xi pi rho sigma tau upsilon phi chi psi omega'
  .split(' ').forEach(g => { HWPEQ_SYM[g] = g; HWPEQ_SYM[g[0].toUpperCase() + g.slice(1)] = g.toUpperCase(); });
Object.assign(HWPEQ_SYM, { varepsilon:'epsilon', vartheta:'theta', varphi:'phi' });
const HWPEQ_ROMAN = /^(max|min|det|gcd|lcm|arcsin|arccos|arctan|sinh|cosh|tanh|deg|dim|ker|arg)$/;
const HWPEQ_ENV = { pmatrix:'pmatrix', bmatrix:'bmatrix', vmatrix:'dmatrix', matrix:'matrix', cases:'cases' };

function latexToHwpEq(src, miss){
  const s = String(src || '');
  let i = 0;
  const sp = () => { while(i < s.length && /\s/.test(s[i])) i++; };
  const raw = () => {                                 // 묶음 속 글자 그대로(\text 용)
    sp();
    if(s[i] !== '{') return s[i++] || '';
    let d = 0;
    const a = ++i;
    for(; i < s.length; i++){ if(s[i] === '\\'){ i++; continue; } if(s[i] === '{') d++; else if(s[i] === '}' && !d--) break; }
    return s.slice(a, i++);
  };
  const roman = t => '{rm "' + t.replace(/\\[,;: ]|~/g, ' ').replace(/[\\"]/g, '') + '"}';
  const name = () => {                               // \ 뒤의 이름
    if(/[A-Za-z]/.test(s[i] || '')){ const a = i; while(/[A-Za-z]/.test(s[i] || '')) i++; return s.slice(a, i); }
    return s[i++] || '';
  };
  const delim = () => {                              // \left · \right · \middle 뒤
    sp();
    if(s[i] !== '\\') return s[i++] || '';
    i++;
    const n = name();
    return HWPEQ_SYM[n] !== undefined ? HWPEQ_SYM[n] : n;
  };
  const arg = () => {                                // 인자 하나 — 묶음이면 속만 · \frac12 · x^23 은 숫자 한 자
    sp();
    if(s[i] === '{'){ i++; const t = seq('}'); i++; return t; }
    return /[0-9]/.test(s[i] || '') ? s[i++] : atom();
  };
  const seq = stop => {
    const out = [];
    while(i < s.length && s[i] !== stop){ const t = atom(); if(t) out.push(t); }
    return out.join(' ');
  };
  const script = op => {
    const a = arg().trim();
    if(op === '^' && /^\{?circ\}?$/.test(a)) return 'DEG';
    if(/^\{?(prime ?)+\}?$/.test(a)) return a.replace(/[{}]/g, '');
    return op + '{' + a + '}';
  };
  function atom(){
    const c = s[i];
    if(c === undefined) return '';
    if(/\s/.test(c)){ i++; return ''; }
    if(c === '{'){ i++; const t = seq('}'); i++; return '{' + t + '}'; }
    if(c === '}'){ i++; return ''; }                   // 짝 없는 닫힘
    if(c === '^' || c === '_'){ i++; return script(c); }
    if(/[0-9]/.test(c)){ const a = i; while(/[0-9]/.test(s[i] || '')) i++; return s.slice(a, i); }
    if(/[A-Za-z]/.test(c)){ i++; return c; }
    if(c === "'"){ i++; return 'prime'; }
    if(c === '·'){ i++; return 'cdot'; }
    if(c === '"'){ i++; return ''; }
    if(c.charCodeAt(0) > 127){ const a = i; while(i < s.length && s.charCodeAt(i) > 127 && s[i] !== '·') i++; return '"' + s.slice(a, i) + '"'; }
    if(c !== '\\'){ i++; return c; }
    i++;
    const n = name();
    switch(n){
      case 'frac': case 'dfrac': case 'tfrac': case 'cfrac': { const a = arg(), b = arg(); return '{{' + a + '} over {' + b + '}}'; }
      case 'binom': { const a = arg(), b = arg(); return 'LEFT ( {' + a + '} atop {' + b + '} RIGHT )'; }
      case 'sqrt': {
        sp();
        if(s[i] === '['){ i++; const k = seq(']'); i++; return 'root {' + k + '} of {' + arg() + '}'; }
        return 'sqrt {' + arg() + '}';
      }
      case 'left': return 'LEFT ' + delim();
      case 'right': return 'RIGHT ' + delim();
      case 'middle': return delim();
      case 'text': case 'textrm': case 'mbox': case 'mathrm': case 'operatorname': case 'textnormal': return roman(raw());
      case 'mathbf': case 'boldsymbol': case 'mathbb': case 'textbf': return 'bold{' + arg() + '}';
      case 'mathit': case 'mathcal': case 'mathsf': case 'mathscr': return arg();
      case 'overline': case 'bar': return 'bar{' + arg() + '}';
      case 'vec': case 'overrightarrow': return 'vec{' + arg() + '}';
      case 'hat': case 'widehat': return 'hat{' + arg() + '}';
      case 'dot': return 'dot{' + arg() + '}';
      case 'boxed': return 'box{' + arg() + '}';
      case 'underbrace': case 'overbrace': {
        const body = arg();
        const op = n === 'underbrace' ? '_' : '^';
        sp();
        if(s[i] !== op) return '{' + body + '}';
        i++;
        return (n === 'underbrace' ? 'UNDERBRACE{' : 'OVERBRACE{') + arg() + '}{' + body + '}';
      }
      case 'not': {
        sp();
        if(s[i] === '='){ i++; return '!='; }
        if(s.startsWith('\\subset', i) && !/[A-Za-z]/.test(s[i + 7] || '')){ i += 7; return 'notsubset'; }
        if(s.startsWith('\\in', i) && !/[A-Za-z]/.test(s[i + 3] || '')){ i += 3; return 'notin'; }
        return '';
      }
      case 'begin': {
        const env = raw();
        const end = s.indexOf('\\end{' + env + '}', i);
        let body = s.slice(i, end < 0 ? s.length : end);
        i = end < 0 ? s.length : end + env.length + 6;
        if(env === 'array') body = body.replace(/^\s*\{[^}]*\}/, '');
        const t = latexToHwpEq(body, miss);
        return HWPEQ_ENV[env] ? HWPEQ_ENV[env] + '{' + t + '}' : t;
      }
      case 'end': raw(); return '';
    }
    if(HWPEQ_ROMAN.test(n)) return roman(n);
    if(HWPEQ_SYM[n] !== undefined) return HWPEQ_SYM[n];
    if(miss) miss.push(n);
    return n;
  }
  return seq(undefined).replace(/\s+/g, ' ').trim();
}

/* AI 변형 문항 → 한글 조각 (2026-10-15). 변형은 한글 원본이 없다 → 원본 문항 조각을 틀로 빌려 속만 간다.
   원본 뼈(엔크 실측): 맨 위 문단 = [secd][cold][상자 표] · 상자 칸 중 글이 가장 긴 것 = 본문 칸
   (본문 문단들 → 선지 표(①│값│②│값…) → 그림 gso) · 미주 목록 = [자동번호][숨은 설명 «[코드]»] [정답] 값 → 해설 문단들.
   갈기: 본문 문단은 변형 content 로 새로(첫 문단의 모양을 빌림) · 선지는 원본 선지 표의 값 칸만 · 정답·해설 · 숨은 코드.
   그림: fig = {b64, w, h, ext}(PNG) 를 주면 원본 본문 그림 자리에 넣고, 없으면 그 문단을 뗀다.
   마지막에 «맨 위에서 닿는 것만» 남긴다 — 지운 문단이 가리키던 개체·그림이 남으면 한글이 헷갈린다. */
const HWPCLIP_CI = { tbl: 1952607264, en: 1701716000, eq: 1701930340, gso: 1735618336, atno: 1635020399, tcmt: 1952673140 };
function hwpClipFromVariant(orig, v, fig, info){
  const j = JSON.parse(JSON.stringify(orig));
  const P = k => j.ro[k] || j.sl[k];
  const heads = Object.keys(j.sl).filter(k => j.sl[k].hp && j.sl[k].co);
  const listsOf = co => heads.filter(k => j.sl[k].co === co);
  const chain = hp => { const a = []; for(let k = hp, g = 0; k && P(k) && g < 5000; k = P(k).np, g++) a.push(k); return a; };
  const chs = k => [].concat(...(P(k).ru || []).map(r => r.ch || []));
  const textOf = hp => chain(hp).map(k => chs(k).map(c => c.t || (c.co && j.cs[c.co] && j.cs[c.co].ci === HWPCLIP_CI.eq ? '§' : '')).join('')).join('\n');
  let seq = 0;
  const newKey = () => 'FFFFFFFF' + (++seq).toString(16).toUpperCase().padStart(16, '0');
  const ids = Object.values(j.cs).map(o => o.id || 0);
  let nextId = Math.max(0, ...ids) + 1;
  const eqTpl = Object.values(j.cs).find(o => o.ci === HWPCLIP_CI.eq);
  /* 글 + $LaTeX$ → 문단의 ch 목록 */
  const runs = str => {
    const ch = [];
    String(str).split('$').forEach((t, n) => {
      if(!(n % 2)){ if(t) ch.push({ t }); return; }
      if(!t.trim()) return;
      const k = newKey();
      j.cs[k] = Object.assign(JSON.parse(JSON.stringify(eqTpl)), { id: nextId++, sc: '수식입니다.' });
      j.cs[k].eq = Object.assign({}, eqTpl.eq, { sc: latexToHwpEq(t) });
      ch.push({ cc: 11, ci: HWPCLIP_CI.eq, co: k });
    });
    if(!ch.length || ch[ch.length - 1].co) ch.push({ t: '' });
    return ch;
  };
  const para = (tpl, ch) => ({ np: '', id: tpl.id, pp: tpl.pp, si: tpl.si, bf: tpl.bf, ru: [{ cp: (tpl.ru && tpl.ru[0] || {}).cp, ch }] });
  /* 머리 h 의 사슬을 문단 목록 ps 로 갈아 끼운다(문단은 sl 에 둔다) */
  const setChain = (h, ps) => {
    for(const k of chain(j.sl[h].hp)) delete j.sl[k];
    const ks = ps.map(() => newKey());
    ps.forEach((p, n) => { p.np = ks[n + 1] || ''; j.sl[ks[n]] = p; });
    j.sl[h].hp = ks[0];
  };

  /* 맨 위 상자와 그 칸들 */
  const top = chs(j.ro.hp).find(c => c.co && j.cs[c.co] && j.cs[c.co].ci === HWPCLIP_CI.tbl);
  if(!top) throw new Error('원본 조각에 상자 표가 없다');
  const cells = listsOf(top.co);
  const body = cells.slice().sort((a, b) => textOf(j.sl[b].hp).length - textOf(j.sl[a].hp).length)[0];
  const bodyKeys = chain(j.sl[body].hp);
  const isTbl = (k, ci) => chs(k).some(c => c.co && j.cs[c.co] && j.cs[c.co].ci === ci);
  const cellText = k => chs(k).filter(c => c.co).map(c => listsOf(c.co).map(h => textOf(j.sl[h].hp)).join('\n')).join('\n');   // 이 문단 속 표 칸 글
  const choicePara = bodyKeys.find(k => isTbl(k, HWPCLIP_CI.tbl) && /①/.test(cellText(k)));
  const boxPara = bodyKeys.find(k => k !== choicePara && isTbl(k, HWPCLIP_CI.tbl) && /\[보\W?기\]|(^|\n)\s*(ㄱ\s*\.|\(가\))/.test(cellText(k)));   // [보기]·조건 (가)(나) 상자 — 머리 «[보기]» 가 그림인 것도 있다(0476)
  const figPara = bodyKeys.slice().reverse().find(k => isTbl(k, HWPCLIP_CI.gso) && !chs(k).some(c => c.t && c.t.trim()));
  const tplPara = P(bodyKeys.find(k => ![choicePara, boxPara, figPara].includes(k)) || bodyKeys[0]);

  /* 본문 · [보기] · 선지 — 변형 content 꼴: 글 줄 · `| [보기] |` `| ㄱ. … |` 표 줄 · `① … ② …` 선지 줄 */
  const rows = String(v.content || '').split('\n').filter(s => s.trim());
  const isRow = s => /^\s*\|/.test(s);
  const strip = s => s.replace(/^\s*\|\s?|\s?\|\s*$/g, '');
  const 선지시작 = rows.findIndex(s => /^\s*①/.test(s));
  const 선지줄 = 선지시작 < 0 ? [] : rows.slice(선지시작).filter(s => /^\s*[①②③④⑤]/.test(s));
  const 선지 = 선지줄.join(' ').split(/(?=[①②③④⑤])/).map(s => s.replace(/^[①②③④⑤]\s*/, '').trim()).filter((s, n, a) => a.length === 5 || s);
  /* [보기] — 원본 보기 표의 내용 칸(글이 가장 긴 칸)만 간다. 첫 문단 앞의 정의 개체(단 정의 cold 등)는 둔다. */
  const 보기줄 = rows.filter(isRow).map(strip).filter(s => s.trim() && !/^\s*\[보\s?기\]\s*$/.test(s));
  let 보기채움 = false;
  if(boxPara && 보기줄.length){
    const tbl = chs(boxPara).find(c => c.co && j.cs[c.co].ci === HWPCLIP_CI.tbl).co;
    const c = listsOf(tbl).sort((a, b) => textOf(j.sl[b].hp).length - textOf(j.sl[a].hp).length)[0];
    const k0 = j.sl[c].hp, f = P(k0);
    const lead = chs(k0).filter(x => x.co && j.cs[x.co] && j.cs[x.co].ci !== HWPCLIP_CI.eq);
    setChain(c, 보기줄.map((s, n) => { const p = para(f, runs(s)); if(!n) p.ru[0].ch = lead.concat(p.ru[0].ch); return p; }));
    보기채움 = true;
  }
  const ps = [];
  for(const s of rows){
    if(선지줄.includes(s)) continue;
    if(isRow(s) && 보기채움){ if(!ps.includes(P(boxPara))) ps.push(P(boxPara)); continue; }
    const t = isRow(s) ? strip(s) : s;
    if(t.trim()) ps.push(para(tplPara, runs(t)));
  }
  let 선지채움 = false;
  if(choicePara && 선지.length === 5){
    const tbl = chs(choicePara).find(c => c.co && j.cs[c.co].ci === HWPCLIP_CI.tbl).co;
    const cs = listsOf(tbl).sort((a, b) => (j.sl[a].tc.ar - j.sl[b].tc.ar) || (j.sl[a].tc.ac - j.sl[b].tc.ac));
    선지채움 = '①②③④⑤'.split('').every((m, n) => {
      const 칸 = h => textOf(j.sl[h].hp).replace(/[\s\u0000-\u001f]/g, '');   // «④\u001f» — 한글은 보이지 않는 제어 글자를 싣는다
      const at = cs.findIndex(h => 칸(h).startsWith(m));
      if(at < 0) return false;
      const 칸글 = 칸(cs[at]);
      const tp = P(j.sl[cs[at]].hp);
      if(칸글 === m && cs[at + 1]) setChain(cs[at + 1], [para(P(j.sl[cs[at + 1]].hp), runs(선지[n]))]);
      else setChain(cs[at], [para(tp, runs(m + ' ' + 선지[n]))]);
      return true;
    });
  }
  if(info) Object.assign(info, { 선지: 선지.length === 5 ? (선지채움 ? '표' : '글') : '', 보기: 보기줄.length ? (보기채움 ? '표' : '글') : '', 그림: figPara ? (fig ? '갈음' : '뗌') : '' });
  if(선지.length === 5 && !선지채움) ps.push(para(tplPara, runs(선지.map((s, n) => '①②③④⑤'[n] + ' ' + s).join('   '))));
  if(선지채움) ps.push(P(choicePara));
  if(figPara && fig){
    const g = j.cs[chs(figPara).find(c => c.co && j.cs[c.co].ci === HWPCLIP_CI.gso).co];
    if(g.rc && g.rc.img){
      const name = g.rc.img.bi.replace(/\.[A-Za-z0-9]+$/, '') + '.' + (fig.ext || 'png');
      j.bi = (j.bi || []).filter(b => b.sr !== g.rc.img.bi).concat([{ ty: 'image/' + (fig.ext || 'png'), sr: name }]);
      delete j.bidt[g.rc.img.bi];
      j.bidt[name] = fig.b64;
      g.rc.img.bi = name;
      /* 크기: 원본 폭을 두고 높이만 비율대로 — 높이는 여러 자리에 겹쳐 적혀 있다(보이는 높이 ch·she · 원래 높이 oh 와
         그림 속 좌표 ih·iy2·iy3·ib · 축척 행렬 sm.e5 = ch/oh). 하나만 바꾸면 한글이 납작하게 그린다(10-15 실험). */
      const r = fig.h / fig.w, ch = Math.round(g.swi * r), oh = Math.round(g.rc.ow * r);
      g.she = ch;
      Object.assign(g.rc, { cw: g.swi, ch, rcy: Math.round(ch / 2), oh, ih: oh, iy2: oh, iy3: oh, ib: oh });
      const sm = g.rc.in && g.rc.in.re && g.rc.in.re[0] && g.rc.in.re[0].sm;
      if(sm) sm.e5 = sm.e1;
    }
    ps.push(P(figPara));
  }
  const keep = ps.map(p => JSON.parse(JSON.stringify(p)));
  setChain(body, keep);

  /* 미주 — 정답 · 해설 */
  const en = Object.keys(j.cs).find(k => j.cs[k].ci === HWPCLIP_CI.en);
  if(en){
    const h = j.cs[en].en.so;
    const ks = chain(j.sl[h].hp), first = P(ks[0]), second = ks[1] && P(ks[1]);
    const lead = chs(ks[0]).filter(c => c.co && [HWPCLIP_CI.atno, HWPCLIP_CI.tcmt].includes(j.cs[c.co] && j.cs[c.co].ci));
    const a = String(v.answer == null ? '' : v.answer);
    const 답 = /\$/.test(a) ? runs(a) : /[가-힣①-⑤]/.test(a) || !a.trim() ? [{ t: a }] : runs('$' + a + '$');
    const p0 = Object.assign(JSON.parse(JSON.stringify(first)), { ru: [{ cp: first.ru[0].cp, ch: lead.concat([{ t: ' [정답] ' }], 답) }] });
    const sp = second || first;
    const sol = String(v.solution || '').split('\n').filter(s => s.trim()).map(s => para(sp, runs(s)));
    setChain(h, [p0].concat(sol));
  }

  /* 숨은 설명·수식 설명 속 [원본 코드] → [변형 코드] */
  const from = '[' + v.originCode + ']', to = '[' + v.code + ']';
  for(const k of Object.keys(j.sl)) for(const r of j.sl[k].ru || []) for(const c of r.ch || []) if(c.t && c.t.includes(from)) c.t = c.t.split(from).join(to);
  for(const o of Object.values(j.cs)) if(typeof o.sc === 'string' && o.sc.includes(from)) o.sc = o.sc.split(from).join(to);
  return hwpClipPrune(j);
}

/* 맨 위 사슬에서 닿는 문단·개체·목록·그림만 남긴다.
   앞으로: 문단 → np · ch.co · 개체 속 so(미주·숨은 설명) · 그림 이름. 거꾸로: 목록 머리(co = 닿은 개체 — 표 칸). */
function hwpClipPrune(j){
  const live = new Set(), q = [];
  const add = k => { if(k && !live.has(k) && (j.ro[k] || j.sl[k] || j.cs[k])){ live.add(k); q.push(k); } };
  const pics = new Set();
  add(j.ro.hp);
  for(;;){
    while(q.length){
      const k = q.pop();
      const v = j.ro[k] || j.sl[k] || j.cs[k];
      JSON.stringify(v, (kk, x) => {
        if(typeof x === 'string'){ if(/^[0-9A-F]{24}$/.test(x)) add(x); else if(/^[0-9A-F]{24}\.[A-Za-z0-9]+$/.test(x)) pics.add(x); }
        return x;
      });
    }
    const more = Object.keys(j.sl).filter(k => !live.has(k) && j.sl[k].co && live.has(j.sl[k].co));
    if(!more.length) break;
    more.forEach(add);
  }
  for(const t of ['sl', 'cs']) for(const k of Object.keys(j[t])) if(!live.has(k)) delete j[t][k];
  for(const k of Object.keys(j.ro)) if(k !== 'hp' && !live.has(k)) delete j.ro[k];
  j.bi = (j.bi || []).filter(b => pics.has(b.sr));
  for(const k of Object.keys(j.bidt || {})) if(!pics.has(k)) delete j.bidt[k];
  return j;
}
