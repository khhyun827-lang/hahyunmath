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

/* 클립보드에 넣을 HTML — 한글이 읽는 꼴. JSON 의 <>&' 는 \uXXXX 로(주석이 안 깨지게). */
function hwpClipHTML(j){
  const js = JSON.stringify(j).replace(/[<>&']/g, c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
  const len = new TextEncoder().encode(js).length;
  return '<html><head><meta charset="utf-8"></head><body><!--StartFragment-->'
    + '<div id="hwpEditorBoardContent" class="hwp_editor_board_content" data-hjsonver="1.0" data-jsonlen="' + len + '">'
    + '<!--[data-hwpjson]' + js + '--></div><!--EndFragment--></body></html>';
}
