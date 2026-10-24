// 창고(items·variants) 글의 «깨진 수식»을 일괄로 고친다 (2026-10-24 · 사용자 — 「수식 표현 망가진 것이 많다 ·
//   이것 외에도 같은 증상이 굉장히 많을 테니 일괄적으로」).
//
//   node tools/eq-fix.mjs --from <받은.json>   ← 손에 있는 덤프로 재보기만(읽기 0) · 전후를 --out 파일로
//   node tools/eq-fix.mjs                      ← 창고를 읽어 재보기만
//   node tools/eq-fix.mjs --go                 ← 쓴다 — 문서마다 «쓰기 직전에 다시 읽고» 다시 고쳐 쓴다(그 사이 고친 것을 안 덮게)
//
// 고치는 것 셋 — 규칙은 여기 «글자»로 두지 않고 hwpx.js 의 hwpEqLeftovers 를 부른다(교재를 새로 올릴 때와 같은 잣대):
//   ① 수식마다 hwpEqLeftovers — sim·CIRC·->·le·맨 sqrt·sup·sub·over·bar·빈 행렬·To03033
//   ② 빈 중괄호 + 표로 흩어진 구간별 함수 → \begin{cases}
//   ③ KaTeX 가 모르는 대문자 «명령»(`$\OA$` · `$\A$`) → 글자(앞이 «선분»이면 윗줄) · 그 밖 한 문항씩 깨진 꼴
// ⚠ 덤프·--out 파일에는 문항 본문·정답이 들어 있다 — 저장소에 두지 말 것(%TEMP% 에).
import fs from 'fs';
import { loadHwpxRules } from './hwpx-node.mjs';

const { hwpEqLeftovers } = loadHwpxRules();
const argv = process.argv.slice(2);
const 값 = k => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };

/* ── ③ 한 문항씩 깨진 꼴 (2026-10-24 KaTeX 로 그려 찾은 것) ─────────────────── */
const 손고침 = [
  [/cases\{\s*x\+3~&\s*\\left\( x \\leq 2 \\right\) -x\+a~&\s*\\left\( x>2 \\right\)\}/g,
    '\\begin{cases} x+3 & \\left( x \\leq 2 \\right) \\\\ -x+a & \\left( x>2 \\right) \\end{cases}'],                       // 2151119-N01
  [/\\left\\\{ \{matrix\{ f\(x\)&~~\(f\(x\)<g\(x\)\) g\(x\)&~~\(f\(x\) \\geq g\(x\)\)\}\} \. \\right\./g,
    '\\begin{cases} f(x) & (f(x)<g(x)) \\\\ g(x) & (f(x) \\geq g(x)) \\end{cases}'],                                         // 2190330B
  [/x\^\{2&~\}/g, 'x^{2}&~'],                                                                                                 // 2150626
  [/\$\\boxed\{~ \$\(([가-하])\)\$ ~\}\$/g, '($1)'],                                                                          // K2-04-E-0384-N01
  [/(\{\{[A-Z]\}\})it(?=_\{)/g, '$1'],                                                                                       // K2-02-E-0159 «it» = 한글 기울임 표시
  [/\\begin\{matrix\}1\\\\3\\end\{matrix\}/g, '\\frac{1}{3}'],                                                               // 2150919-N01 쌓은 1/3
  [/sqrt\\frac\{b\}\{s\}qrta/g, '\\frac{\\sqrt{b}}{\\sqrt{a}}'],                                                            // 1120617-N01 √b/√a
];

/* 셀 글(수식·글 섞임) → 한 수식. 글은 \text{} 로 감싼다. 반쪽 괄호(\right. · \left.)는 걷는다 — 칸이 갈려 생긴 것이다. */
function 칸수식(t) {
  const 조각 = String(t || '').trim().split('$');
  const m = 조각.map((x, i) => i % 2 ? x : (x.trim() ? '\\text{' + x.replace(/[{}\\]/g, '') + '}' : ' ')).join('');
  return m.replace(/\s*\.?\s*\\right\./g, ' ').replace(/\\left\.\s*\.?/g, ' ').replace(/\s+/g, ' ').trim();
}
const 빈괄호 = /\\left\\\{\s*\.?\s*\\right\.|\{?\\begin\{cases\}(?:\s|&|\\\\)*\\end\{cases\}\}?/;
const 칸들 = 줄 => 줄.trim().slice(1, -1).split('|');
const 표줄 = 줄 => /^\s*\|.*\|\s*$/.test(줄);
const 머리표 = 칸 => /^\s*(\([가-하]\)|[ㄱ-ㅎ]\.|\[)/.test(칸);

/* ② 구간별 함수: 빈 중괄호가 든 칸을 찾아 그 오른쪽 칸 + 아랫줄들을 «식 & 조건»으로 묶는다. */
function 구간함수(text) {
  const 줄 = text.split('\n');
  for (let i = 0; i < 줄.length; i++) {
    if (!표줄(줄[i])) continue;
    const 칸 = 칸들(줄[i]);
    const ci = 칸.findIndex(c => c.split('$').some((x, j) => j % 2 && 빈괄호.test(x)));
    if (ci < 0) continue;
    /* 표시가 든 칸: 표시 앞 = 머리(글) + 좌변(수식), 표시 뒤 = 첫 줄 식(같은 칸에 있으면) */
    const 조각 = 칸[ci].split('$');
    const mi = 조각.findIndex((x, j) => j % 2 && 빈괄호.test(x));
    const [앞, 뒤] = 조각[mi].split(빈괄호);
    /* 좌변이 앞 칸에 따로 있기도 하다(`| $h(x)$ | $= {빈 cases}$ | …` · 1240921 · K2-06-E-0671) — 앞 칸들까지 좌변이다 */
    const 앞글 = [...칸.slice(0, ci), 조각.slice(0, mi).join('$') + '$' + 앞 + '$'].join(' ').trim();
    const 뒤글 = ('$' + 뒤 + '$' + 조각.slice(mi + 1).join('$')).replace(/^\$\s*\$/, '').trim();
    const 머리 = (앞글.match(/^[^$]*/) || [''])[0];   // «(나) » 같은 앞 글 — 수식 밖에 둔다
    const 좌변 = 칸수식(앞글.slice(머리.length));
    const 행들 = [];
    const 행 = cs => {
      cs = cs.map(c => c.trim()).filter(c => c !== '');
      if (!cs.length) return [];
      if (cs.length === 1) {   // «식 (조건)» 한 칸 — 맨 앞 수식이 식
        const m = cs[0].match(/^\$[^$]*\$/);
        cs = m ? [m[0], cs[0].slice(m[0].length)] : cs;
      }
      행들.push(칸수식(cs[0]) + ' & ' + 칸수식(cs[1] || ''));
      return cs.slice(2);
    };
    let 덧 = 행([뒤글, ...칸.slice(ci + 1)].filter(Boolean));
    let j = i + 1;
    while (j < 줄.length && 표줄(줄[j]) && !머리표(칸들(줄[j])[0])) { 덧 = 덧.concat(행(칸들(줄[j]))); j++; }
    if (행들.length < 2) continue;   // 못 읽었다 — 손대지 않는다
    const 식 = 머리.trim() + (머리.trim() ? ' ' : '') + '$' + 좌변 + ' \\begin{cases} ' + 행들.join(' \\\\ ') + ' \\end{cases}$' + (덧.length ? ' ' + 덧.join(' ') : '');
    const 상자안 = (i > 0 && 표줄(줄[i - 1])) || (j < 줄.length && 표줄(줄[j]));
    줄.splice(i, j - i, 상자안 ? '| ' + 식 + ' |' : 식);
  }
  return 줄.join('\n');
}

/* ① + ③ — 수식 조각마다 */
function 수식마다(text) {
  const 조각 = text.split('$');
  let 선분중 = false;
  for (let i = 1; i < 조각.length; i += 2) {
    let m = hwpEqLeftovers(조각[i]);
    /* 대문자 «명령»: 수식 전체가 `\OA` 꼴이면 글자로(앞 글이 «선분»이면 윗줄) · \overline{\AC} 안도 */
    const 통째 = m.trim().match(/^\\([A-Z]{1,6})$/);
    /* «세 선분 $\OA$, $\OB$, $\OC$» — 바로 앞이 «선분»이거나, 앞 수식이 선분이고 사이가 쉼표뿐이면 윗줄 */
    if (통째) {
      선분중 = /선분\s*$/.test(조각[i - 1]) || (선분중 && /^\s*,\s*$/.test(조각[i - 1]));
      m = 선분중 ? '\\overline{' + 통째[1] + '}' : 통째[1];
    } else 선분중 = false;
    m = m.replace(/\\overline\{\\([A-Z]{2,6})\}/g, '\\overline{$1}')
      .replace(/\\(A|B|C|D|OA|OB|OC|AC|ABCDEF)(?![A-Za-z])/g, '$1');   // 그 밖의 자리(`\A ,~ B`) — KaTeX 가 모르는 것만(창고에서 찾은 것)
    조각[i] = m;
  }
  return 조각.join('$');
}

export function fixText(t) {
  if (typeof t !== 'string' || !t) return t;
  let s = t;
  for (const [re, 새] of 손고침) s = s.replace(re, 새);
  s = 수식마다(s);          // 먼저 — 빈 행렬이 걷혀야 빈 중괄호 표시가 한 꼴이 된다
  s = 구간함수(s);
  return s;
}
const 칸이름 = col => col === 'items' ? ['content'] : ['content', 'solution'];
export function fixDoc(col, v) {
  const nv = { ...v };
  let 바뀜 = false;
  for (const f of 칸이름(col)) {
    const n = fixText(v[f]);
    if (n !== v[f]) { nv[f] = n; 바뀜 = true; }
  }
  return 바뀜 ? nv : null;
}

if (import.meta.url === 'file:///' + process.argv[1].replace(/\\/g, '/').replace(/^\//, '') || process.argv[1].endsWith('eq-fix.mjs')) {
  const 쓸까 = argv.includes('--go');
  let 창고, BASE, H;
  if (값('--from') && !쓸까) 창고 = JSON.parse(fs.readFileSync(값('--from'), 'utf8'));
  else {
    ({ BASE, H } = await (await import('./fb-login.mjs')).강사로로그인());
    창고 = {};
    for (const col of ['items', 'variants']) {
      창고[col] = {};
      let tok = '';
      do {
        const r = await fetch(`${BASE}/${col}?pageSize=300${tok ? '&pageToken=' + tok : ''}`, { headers: H });
        if (!r.ok) throw new Error(col + ' 읽기 실패 ' + r.status + ' — 멈춘다');
        const j = await r.json();
        for (const d of j.documents || []) 창고[col][d.name.split('/').pop()] = JSON.parse(d.fields.value.stringValue);
        tok = j.nextPageToken || '';
      } while (tok);
    }
  }
  const 고칠것 = [];
  for (const col of ['items', 'variants'])
    for (const [id, v] of Object.entries(창고[col] || {})) { const nv = fixDoc(col, v); if (nv) 고칠것.push({ col, id, v, nv }); }
  console.log(`고칠 문서: 원본 ${고칠것.filter(x => x.col === 'items').length} · 변형 ${고칠것.filter(x => x.col === 'variants').length}`);
  if (값('--out')) fs.writeFileSync(값('--out'), JSON.stringify(고칠것.map(({ col, id, v, nv }) => ({ col, id, 전: 칸이름(col).map(f => v[f]), 후: 칸이름(col).map(f => nv[f]) }))));
  if (!쓸까) { console.log('재보기만 했습니다 — 쓰려면 --go'); process.exit(0); }
  const { 창고칸 } = await import('./ix.mjs');
  let 됨 = 0, 막 = 0, 그새 = 0;
  for (const { col, id } of 고칠것) {
    const r = await fetch(`${BASE}/${col}/${encodeURIComponent(id)}`, { headers: H });   // 쓰기 직전에 다시 읽는다
    if (!r.ok) { 막++; continue; }
    const 지금 = JSON.parse((await r.json()).fields.value.stringValue);
    const nv = fixDoc(col, 지금);
    if (!nv) { 그새++; continue; }
    const w = await fetch(`${BASE}/${col}/${encodeURIComponent(id)}`, { method: 'PATCH', headers: { ...H, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: 창고칸(col, id, nv) }) });
    if (w.ok) 됨++; else { 막++; if (w.status === 403) break; }
    if ((됨 + 막) % 25 === 0) process.stdout.write(`\r  쓰는 중… ${됨 + 막} / ${고칠것.length}`);
  }
  /* 브라우저들이 이 값을 보고 창고를 다시 읽는다 — 원본·변형 둘 다 */
  for (const k of ['itemsVer', 'variantsVer'])
    await fetch(`${BASE}/kv/${k}`, { method: 'PATCH', headers: { ...H, 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: 창고칸('kv', k, String(Date.now())) }) });
  console.log(`\n  고쳐 썼습니다 ${됨} · 그사이 이미 고쳐진 것 ${그새} · 막힌 것 ${막}`);
  process.exit(막 ? 1 : 0);
}
