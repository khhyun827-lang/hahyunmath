// ⑨단계 — 최종 hwpx 만들기.
// 템플릿의 «표 틀»을 그대로 쓰고 내용만 갈아 끼운다. 새 서식을 짓지 않는다.
//   문제번호(통번호) | 출처(붉은 형광) + 미주([정답]+해설) | 문제 본문 | 선지 틀 4종 중 하나
import fs from 'fs';
import path from 'path';
import { richBook } from './rich.mjs';
import { renumber } from './renumber.mjs';
import { findDecorations } from './decor.mjs';

let DECOR = new Set();   // 쪽 장식 (decor.mjs 가 판정한다)

const TPL = 'extract/[2026][엔딩크레딧]집합';
const OUT = 'build/hwpx';
const BOOKNAME = { A: '고쟁이', B: '올림포스', C: '유형반복R', D: '절대등급' };
const SRCDIR = {
  A: '[공통수학2][고쟁이]05.집합', B: '[공통수학2][올림포스유형편]5.집합_110제',
  C: '[공통수학2][유형반복R] 5. 집합의 뜻과 표현', D: '[공통수학2][절대등급]05.집합',
};

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const P = (f) => fs.readFileSync('parts/' + f, 'utf8');
const tbl4 = P('tbl4_3x3.xml');
// 선지 틀 4종 — 1행 / 2행(3+2) / 3행(2+2+1) / 세로 5
const FRAMES = { r1: P('tbl7_1x10.xml'), r2: P('tbl8_2x6.xml'), r3: P('tbl9_3x4.xml'), r5: P('tbl10_5x2.xml') };
const COND = P('tbl5_1x1.xml');      // 조건틀 (사용자가 새로 넣어 준 것)
const BOGI = P('tbl6_3x3.xml');      // 보기틀 ([보기] 딱지가 달린 상자)
const EQ = P('equation.xml');

// ── 조각 만들기 ────────────────────────────────────────────────────────
const LSEG = '<hp:linesegarray><hp:lineseg textpos="0" vertpos="0" vertsize="1000" textheight="1000"'
  + ' baseline="850" spacing="600" horzpos="0" horzsize="45000" flags="393216"/></hp:linesegarray>';

let eqId = 900000000;
let objId = 700000000;
export const CHOICE_LOG = [];   // 그림마다 새 id·instid (겹치면 한글이 튕긴다)
function eqXml(script, w, h) {
  return EQ
    .replace(/id="\d+"/, `id="${++eqId}"`)
    .replace(/<hp:sz width="\d+"([^>]*?)height="\d+"/, `<hp:sz width="${w || 8600}"$1height="${h || 1365}"`)
    // ⚠ 원본 식은 앞뒤 공백이 뜻을 갖는다(« left {2 right } in A»). xml:space 를 붙여 지킨다.
    .replace(/<hp:script>[\s\S]*?<\/hp:script>/, `<hp:script xml:space="preserve">${script}</hp:script>`);
}

// 그림: 원본 hp:pic 을 통째로 쓰고 그림 id 만 새로 매긴다
const imgMap = new Map();     // "A/image12" -> {newId, srcPath, ext}
function imgXml(book, run) {
  const key = book + '/' + run.bin;
  if (DECOR.has(key)) return '';        // 쪽 장식은 옮기지 않는다
  if (!imgMap.has(key)) {
    const bd = path.join('extract', SRCDIR[book], 'BinData');
    const hit = fs.readdirSync(bd).find((f) => f.replace(/\.[^.]+$/, '') === run.bin);
    if (!hit) return '';
    const ext = path.extname(hit).slice(1);
    imgMap.set(key, { newId: 'img' + String(imgMap.size + 1).padStart(3, '0'), src: path.join(bd, hit), ext });
  }
  const g = imgMap.get(key);
  // ⚠ 그림을 여러 곳에 복사하면서 id·instid 를 그대로 두면 «같은 개체가 둘» 이 된다.
  //    한글이 그 개체를 고치려 할 때 튕기는 원인이다. 부를 때마다 새 번호를 준다.
  return run.xml
    .replace(/binaryItemIDRef="[^"]+"/, `binaryItemIDRef="${g.newId}"`)
    .replace(/\bid="\d+"/, `id="${++objId}"`)
    .replace(/\binstid="\d+"/, `instid="${++objId}"`)
    .replace(/\bzOrder="\d+"/, 'zOrder="0"')
    // 원본에서 «묶음 개체»의 일부였던 흔적을 지운다 (짝이 없는 채로 오면 불안정하다)
    .replace(/\bgroupLevel="\d+"/, 'groupLevel="0"');
}

function runsXml(runs, book, cp) {
  let out = '', buf = '';
  const flush = () => { if (buf) { out += `<hp:run charPrIDRef="${cp}"><hp:t>${esc(buf)}</hp:t></hp:run>`; buf = ''; } };
  for (const r of runs) {
    if (r.t === 'text') { buf += r.v; continue; }
    if (r.t === 'eq') { flush(); out += `<hp:run charPrIDRef="${cp}">${eqXml(r.script, r.w, r.h)}<hp:t/></hp:run>`; continue; }
    if (r.t === 'img') { flush(); const x = imgXml(book, r); if (x) out += `<hp:run charPrIDRef="${cp}">${x}<hp:t/></hp:run>`; continue; }
    if (r.t === 'tbl') {
      // 원본 표의 서식 id 는 새 문서에 없다. 대신 «템플릿의 조건틀/보기틀»에 담는다.
      flush();
      const lines = [];
      for (const row of r.rows) {
        const cells = row.map((c) => runsXml(c, book, cp)).filter((x) => x && !/^<hp:run[^>]*\/>$/.test(x));
        if (cells.length) lines.push(cells.join(`<hp:run charPrIDRef="${cp}"><hp:t>  </hp:t></hp:run>`));
      }
      if (!lines.length) continue;
      const plain = r.rows.map((row) => row.map(runsPlain).join(' ')).join(' ');
      const isBogi = /[ㄱㄴㄷㄹ]\s*[.,]/.test(plain);
      out += `<hp:run charPrIDRef="${cp}">${boxed(isBogi ? BOGI : COND, lines, isBogi)}<hp:t/></hp:run>`;
    }
  }
  flush();
  return out || `<hp:run charPrIDRef="${cp}"/>`;
}
const runsPlain = (runs) => runs.map((r) => (r.t === 'text' ? r.v : '')).join('').trim();

const para = (styleId, ppId, inner) =>
  `<hp:p id="0" paraPrIDRef="${ppId}" styleIDRef="${styleId}" pageBreak="0" columnBreak="0" merged="0">${inner}${LSEG}</hp:p>`;

// ── «보기» 덩어리를 보기틀에 담는다 ────────────────────────────────────
// ⚠ 원본 4권에서 <보기> ㄱ. ㄴ. ㄷ. 는 «표가 아니라 그냥 문단»으로 온다.
//    그래서 표를 담는 길(runsXml 의 tbl)로는 잡히지 않는다. 문단 흐름에서 직접 찾는다.
const BOGI_MARK = /^\s*[<[(]?\s*보\s*기\s*[>\])]?\s*$/;
const BOGI_ITEM = /^\s*[ㄱㄴㄷㄹㅁㅂ]\s*[.,·]/;
// 한 문단을 ㄱ·ㄴ·ㄷ 단위로 자른다 (선지를 ① 로 자르는 것과 같은 방식).
// ⚠ 실제 원본은 «ㄱ. … ㄴ. … ㄷ. …» 이 한 문단에 몰려 있다. 줄이 나뉘어 있지 않다.
function splitBogiItems(rs) {
  const items = [];
  for (const r of rs) {
    if (r.t === 'text') {
      for (const p of r.v.split(/(?=[ㄱㄴㄷㄹㅁㅂ]\s*[.,·])/)) {
        if (!p) continue;
        if (/^[ㄱㄴㄷㄹㅁㅂ]\s*[.,·]/.test(p)) items.push([{ t: 'text', v: p }]);
        else if (items.length) items[items.length - 1].push({ t: 'text', v: p });
        else return null;                    // 앞머리에 딴 글이 있으면 보기 줄이 아니다
      }
    } else if (items.length) items[items.length - 1].push(r);
    else return null;
  }
  return items.length >= 2 ? items : null;
}
function foldBogi(paras) {
  const out = [];
  for (let i = 0; i < paras.length; i++) {
    const txt = runsPlainAll(paras[i]).trim();
    // 홀로 선 «<보기>» 딱지는 틀이 대신하므로 버린다 (다음 문단이 보기일 때만)
    if (BOGI_MARK.test(txt) && paras[i + 1] && splitBogiItems(paras[i + 1])) continue;
    const items = BOGI_ITEM.test(txt) ? splitBogiItems(paras[i]) : null;
    if (items) out.push({ bogi: items });
    else out.push(paras[i]);
  }
  return out;
}

// ── 본문 문단 (표는 문단으로 펴서 여러 줄이 될 수 있다) ─────────────────
// ⚠ 내용이 하나도 없는 문단은 «내보내지 않는다».
//    빈 문단도 한 줄 높이를 차지해 문항 아래가 허옇게 비어 보인다.
//    (그림 파일을 못 찾았거나 표가 비었을 때 이런 껍데기가 생긴다)
const hasContent = (s) => /<hp:t>[^<]/.test(s) || /<hp:script/.test(s)
  || /<hc:img /.test(s) || /<hp:tbl /.test(s);
function bodyParas(paras, book) {
  return paras.map((rs) => {
    if (rs && rs.bogi) {
      const lines = rs.bogi.map((p) => runsXml(p, book, 1));
      return para(6, 0, `<hp:run charPrIDRef="1">${boxed(BOGI, lines, true)}<hp:t/></hp:run>`);
    }
    const inner = runsXml(rs, book, 1);
    return hasContent(inner) ? para(6, 0, inner) : '';
  }).join('');
}

// ── 조건틀/보기틀에 줄을 담는다 ────────────────────────────────────────
// 틀의 «가장 넓은 칸»(보기틀은 맨 아래 전폭 칸)에 넣는다.
function boxed(frame, lines, isBogi) {
  const blocks = tcBlocks(frame);
  // 보기틀은 «맨 아래 전폭 칸»(마지막 칸)이 내용 자리다. 폭을 재서 고르면
  // 속성 순서에 따라 딱지 칸을 집어 [보기] 글자를 덮어쓴다 — 실제로 그렇게 사라졌다.
  // 딱지([보기]) 가 든 칸은 절대 건드리지 않고, 남은 칸 중 «가장 넓은 칸»에 담는다.
  let target = -1, best = -1;
  blocks.forEach(([s, e], i) => {
    const cell = frame.slice(s, e);
    if (/보\s*기/.test(cell.replace(/<[^>]*>/g, ''))) return;
    const w = +((cell.match(/cellSz width="(\d+)"/) || [])[1] || 0);
    if (w > best) { best = w; target = i; }
  });
  if (target < 0 || !blocks.length) return frame;
  const [s, e] = blocks[target];
  const cell = frame.slice(s, e);
  const pi = cell.search(/<hp:p[\s>]/);
  const r = /<(\/?)hp:p(\s[^>]*?)?(\/?)>/g; r.lastIndex = pi;
  let d = 0, n, pe = pi;
  while ((n = r.exec(cell))) { if (n[3]) continue; if (n[1]) { if (--d === 0) { pe = r.lastIndex; break; } } else d++; }
  const inner = lines.map((L) => para(6, 0, L)).join('');
  return frame.slice(0, s) + cell.slice(0, pi) + inner + cell.slice(pe) + frame.slice(e);
}

// ── 미주 안쪽 ──────────────────────────────────────────────────────────
// ⚠ 첫 문단의 run 안에는 «미주 번호»를 찍는 <hp:autoNum> ctrl 이 들어 있다.
//    문단을 통째로 새로 쓰면 그것까지 지워져 번호가 사라진다 (실제로 그랬다).
const AUTONUM = (n) => `<hp:ctrl><hp:autoNum num="${n}" numType="ENDNOTE">`
  + `<hp:autoNumFormat type="DIGIT" userChar="" prefixChar="" suffixChar=")" supscript="0"/></hp:autoNum></hp:ctrl>`;
function noteParas(answer, book, num) {
  return answer.map((rs, i) => {
    let inner = runsXml(rs, book, i === 0 ? 34 : 32);
    if (i === 0) inner = inner.replace(/(<hp:run charPrIDRef="34"[^>]*>)/, `$1${AUTONUM(num)}`);
    return para(0, 0, inner);
  }).join('');
}

// ── 선지 틀 채우기 ─────────────────────────────────────────────────────
// 각 틀은 ①~⑤ 가 적힌 칸과 «내용이 들어갈 빈 칸» 이 번갈아 있다.
// ⚠ 정규식으로 <hp:tc>…</hp:tc> 를 잡으면 «안쪽 subList» 의 닫힘에 걸려 칸이 어긋난다
//    (실제로 ④ 딱지 칸에 내용이 들어가 ④ 가 사라졌다). 짝을 세어 칸을 자른다.
function tcBlocks(x) {
  const out = [];
  const re = /<hp:tc[\s>]/g;
  let m;
  while ((m = re.exec(x))) {
    let d = 0, i = m.index;
    const r2 = /<(\/?)hp:tc(\s[^>]*?)?(\/?)>/g; r2.lastIndex = i;
    let n;
    while ((n = r2.exec(x))) {
      if (n[3]) continue;
      if (n[1]) { if (--d === 0) break; } else d++;
    }
    const end = r2.lastIndex;
    out.push([m.index, end]);
    re.lastIndex = end;
  }
  return out;
}
function contentCells(frame) {
  let n = 0;
  for (const [s2, e2] of tcBlocks(frame)) {
    const cell = frame.slice(s2, e2);
    const txt = [...cell.matchAll(/<hp:t(?:\s[^>]*)?>([\s\S]*?)<\/hp:t>/g)]
      .map((x) => x[1].replace(/<[^>]*>/g, '')).join('');
    if (!/[①②③④⑤]/.test(txt)) n++;
  }
  return n;
}
function fillFrame(frame, choices) {
  let k = 0, out = '', last = 0;
  for (const [s, e] of tcBlocks(frame)) {
    const cell = frame.slice(s, e);
    // ⚠ 딱지 칸이 «<hp:t>④<hp:fwSpace/></hp:t>» 처럼 안쪽 태그를 품고 있다.
    //    [^<]* 로 잡으면 그 칸만 글이 안 잡혀 «내용 칸»으로 오인되고 ④ 가 덮인다.
    const txt = [...cell.matchAll(/<hp:t(?:\s[^>]*)?>([\s\S]*?)<\/hp:t>/g)]
      .map((x) => x[1].replace(/<[^>]*>/g, '')).join('');
    if (/[①②③④⑤]/.test(txt) || k >= choices.length) continue;   // 딱지 칸은 그대로 둔다
    const c = choices[k++];
    const inner = c.inner || `<hp:run charPrIDRef="1"><hp:t>${esc(c.text || '')}</hp:t></hp:run>`;
    // 칸 안의 첫 문단을 내용으로 갈아 끼운다
    const pi = cell.search(/<hp:p[\s>]/);
    const pe = (() => { const r = /<(\/?)hp:p(\s[^>]*?)?(\/?)>/g; r.lastIndex = pi; let d = 0, n;
      while ((n = r.exec(cell))) { if (n[3]) continue; if (n[1]) { if (--d === 0) return r.lastIndex; } else d++; } return pi; })();
    const newCell = cell.slice(0, pi) + para(7, 0, inner) + cell.slice(pe);
    out += frame.slice(last, s) + newCell;
    last = e;
  }
  return out + frame.slice(last);
}

// 본문 문단들에서 ①~⑤ 로 시작하는 선지를 떼어 낸다
function splitChoices(paras) {
  const idx = paras.findIndex((rs) => /^\s*①/.test(runsPlainAll(rs)));
  if (idx < 0) return { stem: paras, choices: null, strays: [] };
  const stem = paras.slice(0, idx);
  const rest = paras.slice(idx);
  // ①~⑤ 를 만나는 자리마다 자른다 (한 문단에 여러 개가 붙어 있을 수 있다)
  const chunks = [];
  const strays = [];        // 선지 자리에 들어가면 안 되는 것 (문제 그림 등)
  for (const rs of rest) {
    for (const r of rs) {
      if (r.t === 'text') {
        const parts = r.v.split(/(?=[①②③④⑤])/);
        for (const p of parts) {
          if (!p) continue;
          if (/^[①②③④⑤]/.test(p)) chunks.push([{ t: 'text', v: p.slice(1).trim() }]);
          else if (chunks.length) chunks[chunks.length - 1].push({ t: 'text', v: p });
          else strays.push({ t: 'text', v: p });
        }
      } else if (r.t === 'img' || r.t === 'tbl') {
        // ⚠ 선지 뒤에 오는 «문제 그림»이 마지막 선지 칸으로 빨려 들어가
        //    「선지 안에 엉뚱한 그림」이 되던 것. 선지에서 빼내 본문 쪽으로 돌린다.
        strays.push(r);
      } else if (chunks.length) chunks[chunks.length - 1].push(r);
      else strays.push(r);
    }
  }
  if (chunks.length < 2) return { stem: paras, choices: null, strays: [] };
  return { stem, choices: chunks, strays };
}
const runsPlainAll = (runs) => runs.map((r) => (r.t === 'text' ? r.v : ' ')).join('');

// 선지 하나가 «차지하는 폭»을 어림한다. 수식은 글자가 아니라 식 길이로 센다.
function width1(c) {
  let w = 0;
  for (const r of c) {
    if (r.t === 'text') w += r.v.trim().length;
    else if (r.t === 'eq') w += r.script.replace(/[`~ ]/g, '').length;   // 공백 표기는 뺀다
    else w += 8;
  }
  return w;
}
// 틀 고르기.
//  ⚠ 1행 틀은 «한두 자리 자연수» 정도만 들어간다 — 그보다 길면 칸을 넘친다.
//  ⚠ ㄱ·ㄴ·ㄷ 을 고르는 선지(「① ㄱ, ㄴ」)는 2행으로 세운다.
function pickFrame(choices) {
  const ws = choices.map(width1);
  const max = Math.max(...ws);
  const hasBogi = choices.some((c) => /[ㄱㄴㄷㄹㅁ]/.test(runsPlainAll(c)));
  if (hasBogi) return 'r2';
  if (max <= 2 && choices.every((c) => c.every((r) => r.t !== 'img'))) return 'r1';
  if (max <= 12) return 'r2';
  if (max <= 22) return 'r3';
  return 'r5';
}

// 견본 표를 «그것만 담고 있던 문단»과 함께 걷어낸다.
// 표만 지우면 `<hp:p><hp:run><hp:t/></hp:run></hp:p>` 가 남아 빈 줄이 된다.
function dropFrameParagraph(t, frame) {
  const i = t.indexOf(frame);
  if (i < 0) return t;
  const ps = t.lastIndexOf('<hp:p ', i);              // 표를 감싼 문단의 시작
  if (ps < 0) return t.split(frame).join('');
  // 짝을 세어 그 문단의 끝을 찾는다 (표 안에도 <hp:p> 가 있다)
  const re = /<(\/?)hp:p(\s[^>]*?)?(\/?)>/g; re.lastIndex = ps;
  let d = 0, m, pe = -1;
  while ((m = re.exec(t))) {
    if (m[3]) continue;
    if (m[1]) { if (--d === 0) { pe = re.lastIndex; break; } } else d++;
  }
  if (pe < 0) return t.split(frame).join('');
  const rest = t.slice(ps, pe).split(frame).join('');
  // 표를 뺀 나머지에 «내용»이 남아 있으면 문단은 살린다
  if (hasContent(rest)) return t.slice(0, ps) + rest + t.slice(pe);
  // ⚠ 견본들 «사이»에 간격용 빈 문단이 하나씩 끼어 있다. 견본만 지우면 그것이 남아
  //    문항 아래에 빈 줄로 나타난다. 바로 뒤에 붙은 빈 문단도 같이 걷어낸다.
  let end = pe;
  for (;;) {
    const nx = /^<hp:p [^>]*>(?:(?!<hp:p )[\s\S])*?<\/hp:p>/.exec(t.slice(end));
    if (!nx || hasContent(nx[0])) break;
    end += nx[0].length;
  }
  return t.slice(0, ps) + t.slice(end);
}

// needle 이 든 «문단 하나»를 통째로 replacement 로 바꾼다.
// ⚠ 바꿀 것이 비면 칸에 문단이 하나도 없게 되므로 그때는 빈 문단을 남긴다.
function replaceParaAt(t, needle, replacement) {
  const i = t.indexOf(needle);
  if (i < 0) return t;
  const ps = t.lastIndexOf('<hp:p ', i);
  if (ps < 0) return t;
  const re = /<(\/?)hp:p(\s[^>]*?)?(\/?)>/g; re.lastIndex = ps;
  let d = 0, m, pe = -1;
  while ((m = re.exec(t))) {
    if (m[3]) continue;
    if (m[1]) { if (--d === 0) { pe = re.lastIndex; break; } } else d++;
  }
  if (pe < 0) return t;
  const body = replacement || para(6, 0, '<hp:run charPrIDRef="1"/>');
  return t.slice(0, ps) + body + t.slice(pe);
}

// 연속된 빈 문단 -> 하나 · 칸(</hp:tc>) 직전의 빈 문단 -> 버림
function squeezeBlanks(t) {
  // 최상위든 칸 안이든 «문단 하나» 단위로 훑는다
  const PARA = /<hp:p [^>]*>(?:(?!<hp:p )[\s\S])*?<\/hp:p>/g;
  const spans = [];
  let m;
  while ((m = PARA.exec(t))) spans.push([m.index, m.index + m[0].length, hasContent(m[0])]);
  const drop = [];
  for (let i = 0; i < spans.length; i++) {
    if (spans[i][2]) continue;                       // 내용이 있으면 둔다
    const prevBlank = i > 0 && !spans[i - 1][2] && spans[i - 1][1] === spans[i][0];
    // 문단 뒤에 바로 </hp:subList> 가 오면 그 문단이 «칸의 마지막»이다
    // ⚠ 단, 그 칸의 «유일한» 문단이면 절대 지우면 안 된다.
    //    문단이 하나도 없는 표 칸이 되어 한글이 파일을 아예 못 연다 (실제로 324개를 만들었다).
    const isFirstInCell = /<hp:subList[^>]*>$/.test(t.slice(0, spans[i][0]));
    const nextIsCellEnd = /^<\/hp:subList>/.test(t.slice(spans[i][1])) && !isFirstInCell;
    if (prevBlank || nextIsCellEnd) drop.push(spans[i]);
  }
  let out = '', last = 0;
  for (const [s, e] of drop) { out += t.slice(last, s); last = e; }
  return out + t.slice(last);
}

// ── 문항 한 덩어리 ─────────────────────────────────────────────────────
let noteNum = 0;
function problemBlock(p, rich, no) {
  const book = p.id[0];
  let t = tbl4;
  // ⚠ 템플릿 tbl4 에는 선지틀 4종 «과 조건틀·보기틀 견본»이 함께 박혀 있다.
  //    다 걷어내야 한다. 안 그러면 문항마다 빈 조건틀·보기틀이 하나씩 딸려 나온다.
  // ⚠ 표만 지우면 «그 표를 담고 있던 문단»이 빈 껍데기로 남아, 문항 아래에
  //    빈 줄이 여섯 개씩 생긴다(사용자가 「공백이 길게 생긴다」고 한 것). 문단째 걷어낸다.
  for (const f of [...Object.values(FRAMES), COND, BOGI]) t = dropFrameParagraph(t, f);

  const { stem, choices, strays } = splitChoices(rich.paras);

  // ⚠ 원본은 미주 앵커 뒤에 공백 한 칸을 두고 발문을 시작한다(« 8보다 작은 …»).
  //    그대로 옮기면 첫 글자가 한 칸 밀려 보인다. 첫 글토막의 앞 공백만 턴다.
  if (stem.length && stem[0].length && stem[0][0].t === 'text') {
    stem[0] = [{ ...stem[0][0], v: stem[0][0].v.replace(/^\s+/, '') }, ...stem[0].slice(1)];
    if (!stem[0][0].v) stem[0] = stem[0].slice(1);
  }

  // 1) 문제번호 (통번호)
  // 1) 문제번호 — 비워 둔다.
  //    사용자가 한글의 «문단 번호» 기능으로 직접 매기므로 글자로 찍지 않는다.
  //    (틀의 빈 run <hp:run charPrIDRef="27"/> 을 그대로 남긴다)
  // 2) 출처 (붉은 형광) — 원출처 번호까지 적는다
  t = t.replace('<hp:markpenBegin color="#FF0000"/>절대등급<hp:markpenEnd/>',
    `<hp:markpenBegin color="#FF0000"/>${esc(p.source)}<hp:markpenEnd/>`);
  // 3) 본문을 «먼저» 넣는다.
  // ⚠ 순서가 중요하다. 미주를 먼저 채우면, 해설 안에 「문제」라는 글이 들어 있는 문항에서
  //    본문 앵커(<hp:t>문제</hp:t>)가 «미주 안쪽»을 먼저 잡아 문제와 선지가 해설 속으로
  //    들어가 버린다 (026·028·033 이 그랬다). 템플릿 미주 견본에는 「문제」가 없으므로
  //    본문을 먼저 꽂으면 충돌이 아예 생기지 않는다.
  let fk = choices ? pickFrame(choices) : null;
  // ⚠ 고른 틀의 «내용 칸»이 선지 수보다 적으면 뒤쪽 선지가 통째로 사라진다.
  if (fk && contentCells(FRAMES[fk]) < choices.length) fk = 'r5';
  if (choices) CHOICE_LOG.push({ no, id: p.id, 찾은선지: choices.length, 틀: fk, 칸: contentCells(FRAMES[fk]) });
  const bodyXml = bodyParas(foldBogi(stem.concat(strays.length ? [strays] : [])), book)
    + (choices ? `<hp:p id="0" paraPrIDRef="0" styleIDRef="6" pageBreak="0" columnBreak="0" merged="0">`
      + `<hp:run charPrIDRef="1">${fillFrame(FRAMES[fk], choices.map((c) => ({ inner: runsXml(c, book, 1) })))}<hp:t/></hp:run>${LSEG}</hp:p>` : '');
  // 「문제」는 틀에서 «문항을 쓸 자리»를 가리키는 표시였다.
  // ⚠ 글자만 지우면 «빈 문단»이 남아 칸 첫 줄이 한 줄 비어 보인다.
  //    그 문단을 통째로 본문으로 «갈아 끼운다».
  t = replaceParaAt(t, '<hp:t>문제</hp:t>', bodyXml);

  // 4) 미주 내용 — 본문을 꽂은 «뒤»에 채운다 (위 ⚠ 참고)
  noteNum++;
  t = t.replace(/(<hp:endNote\b[^>]*>\s*<hp:subList\b[^>]*>)([\s\S]*?)(<\/hp:subList>\s*<\/hp:endNote>)/,
    (all, a, mid, z) => a + noteParas(rich.answer, book, noteNum) + z);
  t = t.replace(/<hp:endNote number="\d+"/, `<hp:endNote number="${noteNum}"`);
  t = t.replace(/<hp:autoNum num="\d+" numType="ENDNOTE">/g, `<hp:autoNum num="${noteNum}" numType="ENDNOTE">`);

  // 5) 빈 줄 정리 — 견본을 걷어낸 자리에 간격용 빈 문단이 남아 «문항 아래가 길게 빈다».
  //    연속된 빈 문단은 하나로 줄이고, 칸이 끝나기 직전의 빈 문단은 버린다.
  //    (템플릿이 «하나»만 둔 여백은 살린다 — 그건 디자인이다)
  t = squeezeBlanks(t);

  // ⚠ tbl4 를 123번 복제하므로 그 «안에 박힌 개체»(장식 그림·상자)의 id·instid 가
  //    전부 같아진다. 한글은 개체를 instid 로 찾으므로, 그 개체를 고치려 하면 튕긴다.
  //    -> 블록을 낼 때마다 개체 번호를 전부 새로 매긴다.
  t = t.replace(/\binstid="\d+"/g, () => `instid="${++objId}"`)
    .replace(/(<hp:(?:pic|rect|equation|line|ellipse|arc|polygon|curve|container|ole)\b[^>]*?\s)id="\d+"/g,
      (all, head) => `${head}id="${++objId}"`);

  return `<hp:p id="0" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">`
    + `<hp:run charPrIDRef="0">${t}<hp:t/></hp:run>${LSEG}</hp:p>`;
}

// ── 조립 ───────────────────────────────────────────────────────────────
const keep = JSON.parse(fs.readFileSync('../analysis/keep_list.json', 'utf8'));
const s1 = JSON.parse(fs.readFileSync('../analysis/step1_list.json', 'utf8'));
const s2 = JSON.parse(fs.readFileSync('../analysis/step2_list.json', 'utf8'));
const s3 = JSON.parse(fs.readFileSync('../analysis/step3_list.json', 'utf8'));
const RICH = {}; for (const c of 'ABCD') RICH[c] = richBook(c);
DECOR = findDecorations(RICH);
console.log('쪽 장식으로 걸러낸 그림', DECOR.size, '종');
const richOf = (id) => RICH[id[0]][+id.slice(2) - 1];

const sceneHdr = JSON.parse('null');   // (SCENE 표는 템플릿 tbl2 를 그대로 쓴다)
const tbl2 = P('tbl2_2x4.xml');
const tbl3 = P('tbl3_1x2.xml');

function sceneBlock(n, label) {
  let t = tbl2.replace(/(<hp:p [^>]*styleIDRef="9"[^>]*>[\s\S]*?<hp:t>)\d+(<\/hp:t>)/, `$1${n}$2`);
  return `<hp:p id="0" paraPrIDRef="5" styleIDRef="0" pageBreak="${n > 1 ? 1 : 0}" columnBreak="0" merged="0">`
    + `<hp:run charPrIDRef="0">${t}<hp:t/></hp:run>${LSEG}</hp:p>`;
}
function takeBlock(no, name) {
  let t = tbl3.replace(/(<hp:p [^>]*styleIDRef="14"[^>]*>[\s\S]*?<hp:t>)[^<]*(<\/hp:t>)/, `$1${no}$2`)
    .replace(/(<hp:p [^>]*styleIDRef="15"[^>]*>[\s\S]*?<hp:t>)[^<]*(<\/hp:t>)/, `$1${esc(name)}$2`);
  return `<hp:p id="0" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">`
    + `<hp:run charPrIDRef="0">${t}<hp:t/></hp:run>${LSEG}</hp:p>`;
}

let body = '', no = 0;
const manifest = [];
for (const [sn, list, label] of [[1, s1, '기본'], [2, s2, '발전'], [3, s3, '실전']]) {
  body += sceneBlock(sn, label);
  let curType = null, takeNo = 0;
  for (const p of list) {
    if (sn < 3 && p.canon !== curType) { curType = p.canon; body += takeBlock(++takeNo, p.canon_name); }
    no++;
    manifest.push({ 통번호: no, scene: sn, id: p.id, 출처: p.source, 유형: sn < 3 ? p.canon_name : '(실전)' });
    body += problemBlock(p, richOf(p.id), no);
  }
}

// section2 를 갈아 끼운다 (머리 표 tbl1 은 남기고 그 뒤를 새로 쓴다)
const s2xml = fs.readFileSync(path.join(TPL, 'Contents/section2.xml'), 'utf8');
// ⚠ 머리 문단(「05 집합」)은 표를 품고 있고 그 표 «안»에도 <hp:p> 가 있다.
//    단순히 첫 </hp:p> 를 찾으면 안쪽 문단의 닫힘을 잡아 바깥 구조가 열린 채로 끊긴다.
//    -> 짝을 세어 «첫 최상위 문단»의 끝을 찾는다.
function endOfFirstPara(x) {
  const s = x.search(/<hp:p[\s>]/);
  const re = /<(\/?)hp:p(\s[^>]*?)?(\/?)>/g;
  re.lastIndex = s;
  let d = 0, m;
  while ((m = re.exec(x))) {
    if (m[3]) continue;
    if (m[1]) { if (--d === 0) return re.lastIndex; } else d++;
  }
  return s;
}
const headEnd = endOfFirstPara(s2xml);
// ⚠ 그 첫 문단 안에는 「05 집합」머리 표(tbl1)와 «SCENE 표»(tbl2)가 «함께» 들어 있다.
//    SCENE 은 내가 3개를 새로 세우므로 템플릿에 박힌 것은 걷어낸다 (안 그러면 4개가 된다).
let out = s2xml.slice(0, headEnd).split(tbl2).join('') + body + '</hs:sec>';
// ⚠ 마지막으로 «문서 전체»의 개체 번호를 한 번 더 훑어 준다.
//    SCENE·Take 표도 복제되므로 문항 블록만 손봐서는 중복이 남는다.
let gid = 500000000;
out = renumber(out);

fs.rmSync(OUT, { recursive: true, force: true });
fs.cpSync(TPL, OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'Contents/section2.xml'), out, 'utf8');

// 그림 복사 + content.hpf 등록
let hpf = fs.readFileSync(path.join(OUT, 'Contents/content.hpf'), 'utf8');
const items = [...imgMap.values()].map((g) => {
  fs.copyFileSync(g.src, path.join(OUT, 'BinData', g.newId + '.' + g.ext));
  return `<opf:item id="${g.newId}" href="BinData/${g.newId}.${g.ext}" media-type="image/${g.ext}" isEmbeded="1"/>`;
}).join('');
hpf = hpf.replace('</opf:manifest>', items + '</opf:manifest>');
fs.writeFileSync(path.join(OUT, 'Contents/content.hpf'), hpf, 'utf8');

fs.mkdirSync('../analysis', { recursive: true });
fs.writeFileSync('../analysis/final_manifest.json', JSON.stringify(manifest, null, 1), 'utf8');
console.log('문항', no, '· 그림', imgMap.size, '· section2', (out.length / 1024).toFixed(0) + 'KB');
