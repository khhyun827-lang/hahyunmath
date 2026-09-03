/* hwpx(한글) 문항 파서 — 웹(index.html)과 도구(tools/)가 «같이» 쓴다.  2026-09-05 에 갈라 냈다.

   🔴 **평범한 스크립트다. 모듈로 바꾸지 말 것.**
      index.html 은 `<script src="hwpx.js">` 로 읽어 전역으로 쓰고,
      node 는 이 파일을 «글자»로 읽어 `new Function` 으로 부른다 (tools/hwpx-node.mjs).
      `export` 를 붙이는 순간 둘 중 한쪽이 깨진다 — 빌드 단계가 없는 프로젝트다.

   🔴 **DOM 을 쓴다** — childNodes · nodeType · localName · textContent · getAttribute ·
      getElementsByTagNameNS 여섯이 전부다. 브라우저는 DOMParser 가 주고,
      node 는 `tools/hwpx-node.mjs` 의 작은 셈이 같은 여섯을 흉내 낸다.
      **일곱 번째를 쓰기 시작하면 그 셈도 같이 고쳐야 한다.**

   ⚠ zip 풀기와 그림 뽑기는 여기 없다 — 그건 브라우저·node 가 각자 한다. */

const HP_NS = 'http://www.hancom.co.kr/hwpml/2011/paragraph';
// 한글 수식 스크립트를 KaTeX가 그릴 수 있는 LaTeX로 변환하고 $..$ 로 감싼다.
// (완벽한 변환기는 아니고, 고등수학에서 자주 쓰는 패턴 위주로 처리한다)
// 문자열에서 openIdx가 가리키는 '{'와 짝이 맞는 ')'를 중첩까지 고려해서 찾는다.
// (예: sqrt{ ( x ^{2} ) ^{2} }처럼 안에 또 중괄호가 있는 경우 단순 정규식으론 못 잡음)
function findMatchingBrace(s, openIdx){
  let depth = 0;
  for(let i=openIdx;i<s.length;i++){
    if(s[i]==='{') depth++;
    else if(s[i]==='}'){ depth--; if(depth===0) return i; }
  }
  return -1;
}
// keyword 뒤의 "{...}"를 중첩 중괄호까지 포함해서 통째로 찾아 wrap(inner)로 치환한다.
function replaceBalancedKeyword(s, keyword, wrap){
  const re = new RegExp('\\b'+keyword+'\\s*\\{','g');
  let result = '', lastIndex = 0, m;
  while((m = re.exec(s))){
    const openIdx = m.index + m[0].length - 1;
    const closeIdx = findMatchingBrace(s, openIdx);
    if(closeIdx===-1) continue;
    const inner = s.slice(openIdx+1, closeIdx);
    result += s.slice(lastIndex, m.index) + wrap(inner);
    lastIndex = closeIdx+1;
    re.lastIndex = closeIdx+1;
  }
  result += s.slice(lastIndex);
  return result;
}
// "{분자} over {분모}"를 \frac{}{}로 바꾼다. 분자/분모 안에 또 중괄호(예: 지수)가 있어도
// 괄호 짝을 직접 세어가며 찾기 때문에 중첩된 경우도 정확히 처리되고, 재귀적으로 안쪽도 변환한다.
function convertOverToFrac(s){
  let result = '', i = 0;
  while(i < s.length){
    if(s[i]==='{'){
      const close1 = findMatchingBrace(s, i);
      if(close1!==-1){
        let j = close1+1;
        while(s[j]===' ') j++;
        if(s.slice(j,j+4)==='over'){
          let k = j+4;
          while(s[k]===' ') k++;
          if(s[k]==='{'){
            const close2 = findMatchingBrace(s, k);
            if(close2!==-1){
              const num = convertOverToFrac(s.slice(i+1, close1));
              const den = convertOverToFrac(s.slice(k+1, close2));
              result += '\\frac{'+num+'}{'+den+'}';
              i = close2+1;
              continue;
            }
          }
        }
      }
    }
    result += s[i];
    i++;
  }
  return result;
}
function convertHwpEq(script){
  let s = script || '';
  if(!s.trim()) return '';
  s = s.replace(/`/g, '');
  s = s.replace(/\brm\s*/g, '');
  // "it"(이탤릭 지정)은 rm과 같은 서체 지정 명령이라 내용만 남기고 지운다.
  // "it2r+3"(공백 없음), "it r ^{2}"(공백 있음) 둘 다 나오므로 뒤 공백까지 함께 지운다.
  s = s.replace(/\bit\s*(?=[0-9a-zA-Z(])/g, '');
  s = replaceBalancedKeyword(s, 'pmatrix', inner => '\\begin{pmatrix}' + inner.replace(/#/g,'\\\\') + '\\end{pmatrix}');
  s = replaceBalancedKeyword(s, 'cases', inner => '\\begin{cases}' + inner.replace(/#/g,'\\\\') + '\\end{cases}');
  const greek = {alpha:'\\alpha',beta:'\\beta',gamma:'\\gamma',delta:'\\delta',theta:'\\theta',pi:'\\pi',lambda:'\\lambda',mu:'\\mu',sigma:'\\sigma',phi:'\\phi',omega:'\\omega'};
  for(const k in greek) s = s.replace(new RegExp('\\b'+k+'\\b','g'), greek[k]);
  // le/ge/LEQ 등은 it과 마찬가지로 뒤에 공백 없이 숫자가 바로 붙는 경우(le5)가 있어
  // 뒤쪽 \b는 안 쓰고 시작 위치만 단어 경계로 확인한다. 방금 만든 "\leq"의 "le"를
  // 다시 건드리지 않도록(무한 중복 방지) 바로 앞이 백슬래시가 아닐 때만 매치한다.
  s = s.replace(/(?<!\\)\bLEQ/gi, '\\leq').replace(/(?<!\\)\bGEQ/gi, '\\geq').replace(/(?<!\\)\bNEQ/gi, '\\neq');
  s = s.replace(/(?<!\\)\ble/g, '\\leq').replace(/(?<!\\)\bge/g, '\\geq');
  s = s.replace(/\bTIMES\b/gi, '\\times');
  // angle/bar는 "angle{BAD}"(중괄호), "angle BAD"(공백), "angleBAD"(붙여쓰기) 세 가지 형태가
  // 모두 나오므로 각각 처리한다. 방금 만든 "\angle"/"\overline"을 다시 건드리지 않도록
  // (무한 중복 방지) 바로 앞이 백슬래시가 아닐 때만 매치한다.
  s = replaceBalancedKeyword(s, 'angle', inner => '\\angle ' + inner);
  s = s.replace(/(?<!\\)\bangle\s+([A-Za-z]+)\b/g, '\\angle $1');
  s = s.replace(/(?<!\\)\bangle([A-Z]{1,3})\b/g, '\\angle $1');
  s = s.replace(/(?<!\\)\bangle\b/g, '\\angle');
  s = replaceBalancedKeyword(s, 'bar', inner => '\\overline{' + inner + '}');
  s = s.replace(/(?<!\\)\bbar\s+([A-Za-z]+)\b/g, '\\overline{$1}');
  s = s.replace(/(?<!\\)\bbar([A-Z]{1,3})\b/g, '\\overline{$1}');
  /* LEFT/RIGHT는 괄호만이 아니다 — 절댓값 LEFT | … RIGHT |, 대괄호, 중괄호가 다 온다.
     ⚠ 중괄호는 LaTeX에서 \left\{ 로 이스케이프해야 한다 (\left{ 는 KaTeX가 못 읽는다).
     짝이 안 맞는 LEFT/RIGHT가 남으면 수식 전체가 안 그려지므로, 못 알아본 것은 그냥 지운다. */
  s = s.replace(/\bLEFT\s*\{/g, '\\left\\{').replace(/\bRIGHT\s*\}/g, '\\right\\}');
  s = s.replace(/\bLEFT\s*([([|])/g, (m,d)=>'\\left'+d)
       .replace(/\bRIGHT\s*([)\]|])/g, (m,d)=>'\\right'+d);
  s = s.replace(/\bLEFT\b\s*/g, '').replace(/\bRIGHT\b\s*/g, '');
  s = s.replace(/\bCDOTS\b/gi, '\\cdots').replace(/\bLDOTS\b/gi, '\\ldots')
       .replace(/\bDOTSAXIS\b/gi, '\\cdots').replace(/\bDOTS\b/gi, '\\cdots');
  /* «같지 않다»가 세 가지 표기로 온다 — != 와 NEQ(위에서 처리) 와 ne. */
  s = s.replace(/!=/g, '\\neq').replace(/(?<!\\)\bne\b/g, '\\neq');
  /* pile{a#b}는 «세로로 쌓기»다. 열이 하나인 행렬로 옮긴다 (행 구분은 cases·pmatrix와 같은 #). */
  s = replaceBalancedKeyword(s, 'pile', inner =>
    '\\begin{matrix}' + inner.replace(/#/g,'\\\\') + '\\end{matrix}');
  s = convertOverToFrac(s);
  s = replaceBalancedKeyword(s, 'sqrt', inner => '\\sqrt{' + inner + '}');
  /* 중괄호를 안 쓴 `sqrt 17` 꼴도 받는다 — 위 함수는 `sqrt{` 만 본다 (2026-09-04). */
  s = fixBareSqrt(s);
  // 첨자가 여러 글자인데 중괄호 없이 붙어있으면(a_11 등) LaTeX에서 첫 글자만
  // 첨자로 처리되어 깨지므로, 중괄호로 다시 감싸준다.
  s = s.replace(/([_^])(?!\{)([0-9a-zA-Z]+)/g, '$1{$2}');
  s = s.replace(/\s+/g, ' ').trim();
  return s ? '$' + s + '$' : '';
}
// 수식 개체가 아니라 그냥 평문(<hp:t>)으로 "barAD", "angleBAD"처럼 붙여 쓴 경우를 정리한다.
function cleanHwpPlainText(t){
  if(!t) return t;
  return t
    .replace(/\bbar([A-Z]{1,3})\b/g, '$\\overline{$1}$')
    .replace(/\bangle([A-Z]{1,3})\b/g, '$\\angle $1$');
}
const HWP_CORE_NS = 'http://www.hancom.co.kr/hwpml/2011/core';
const HWP_WATERMARK_PATTERNS = [/족보닷컴/, /zocbo\.com/i];
// 문단 목록을 재귀적으로 순회하며 텍스트/수식/그림참조/미주를 평평한 토큰 스트림으로 만든다.
// 표(hp:tbl) 안에 들어있는 문항도 셀 하나하나를 재귀 호출로 처리해서 놓치지 않는다.
// (표 안에 중첩 표가 또 있을 수 있어서, 바깥 표 처리 시 tr/tc는 반드시 "직계 자식"만
//  본다 — getElementsByTagNameNS처럼 깊은 검색을 쓰면 중첩 표의 셀까지 중복으로 잡힌다.)
// 문단 목록을 재귀적으로 순회하며 텍스트/수식/그림참조/미주를 평평한 토큰 스트림으로 만든다.
// 표(hp:tbl) 안에 들어있는 문항도 셀 하나하나를 재귀 호출로 처리해서 놓치지 않는다.
// (표 안에 중첩 표가 또 있을 수 있어서, 바깥 표 처리 시 tr/tc는 반드시 "직계 자식"만
//  본다 — getElementsByTagNameNS처럼 깊은 검색을 쓰면 중첩 표의 셀까지 중복으로 잡힌다.)
function hwpWalkParagraphs(paras, tokens){
  for(const p of paras){
    for(const runEl of Array.from(p.childNodes)){
      if(runEl.nodeType!==1 || runEl.localName!=='run') continue;
      for(const child of Array.from(runEl.childNodes)){
        if(child.nodeType !== 1) continue;
        const local = child.localName;
        if(local === 't'){
          tokens.push({type:'text', v: cleanHwpPlainText(child.textContent||'')});
        } else if(local === 'equation'){
          const scriptEl = child.getElementsByTagNameNS(HP_NS,'script')[0];
          tokens.push({type:'eq', v: convertHwpEq(scriptEl?scriptEl.textContent:'')});
        } else if(local === 'pic'){
          const imgEl = child.getElementsByTagNameNS(HWP_CORE_NS,'img')[0];
          const ref = imgEl ? imgEl.getAttribute('binaryItemIDRef') : null;
          if(ref) tokens.push({type:'pic', v: ref});
        } else if(local === 'tbl'){
          /* 표를 «줄 하나로 뭉개지» 않고 행·열을 살려 둔다.
             예전에는 셀을 공백으로 이어 붙여서, 대진표나 조건 표가 테두리도 칸도 없는
             글 뭉치가 됐다. 지금은 한 행을 `| 칸 | 칸 |` 한 줄로 적는다 —
             글로 봐도 읽히고, 화면에서는 problemHTML()이 진짜 표로 되살린다.
             (내용은 평문으로 저장되므로 HTML을 넣을 수는 없다. 그래서 이 표기를 쓴다.) */
          const trs = Array.from(child.childNodes).filter(n=>n.nodeType===1 && n.localName==='tr');
          const rows = [];
          for(const tr of trs){
            const tcs = Array.from(tr.childNodes).filter(n=>n.nodeType===1 && n.localName==='tc');
            const cells = [];
            for(const tc of tcs){
              const subList = Array.from(tc.childNodes).find(n=>n.nodeType===1 && n.localName==='subList');
              if(!subList){ cells.push(''); continue; }
              const cellParas = Array.from(subList.childNodes).filter(n=>n.nodeType===1 && n.localName==='p');
              const cellTokens = [];
              hwpWalkParagraphs(cellParas, cellTokens);
              let s = '';
              for(const t of cellTokens){
                /* ⚠ 세로줄(`|`)은 표 행 문법과 부딪힌다. 그런데 **그냥 지우면 안 된다** —
                   수식의 절댓값이 이미 `\left|…\right|`로 바뀌어 있어서 막대를 지우면
                   `\left ` 만 남아 수식 전체가 안 그려진다 (실제로 겪었다).
                   수식 안에서는 LaTeX가 알아듣는 `\vert`로 바꾸고, 평문에서만 지운다. */
                if(t.type==='eq') s += String(t.v).replace(/\|/g, '\\vert ');
                else if(t.type==='text') s += String(t.v).replace(/\|/g, '');
                else if(t.type==='break') s += '\n';           // 줄바꿈을 살린다
                else if(t.type==='pic') tokens.push(t);        // 그림은 표 밖으로 빼서 살린다
                else if(t.type==='endnote') tokens.push(t);    // 정답 미주도 마찬가지
              }
              cells.push(s.replace(/[ \t]+/g,' ').replace(/\n{2,}/g,'\n').trim());
            }
            if(cells.some(c=>c)) rows.push(cells);
          }
          if(rows.length){
            /* ⚠ 표라고 다 «격자»가 아니다. 셋으로 갈린다.
               ① 보기 표 — 선지를 표로 그린 시험지가 흔하다 (칸 하나가 딱 ①②③④⑤).
                  격자로 두면 10칸짜리 한 줄이 되어 읽기 나쁘다 → 글로 펴고
                  problemHTML의 spaceChoices가 한 줄에 하나씩 세운다
               ② 상자 — 열이 하나뿐인 표 (조건 (가)(나) 상자). 한 행으로 뭉치면 그 안의
                  줄바꿈이 사라지므로 **줄마다 한 행**으로 편다
               ③ 진짜 격자 — 열이 둘 이상. 칸을 지켜야 하므로 줄바꿈은 공백으로 접는다
               ④ «자리»표 — 아래 isSeatLike 참고. ①보다 먼저 갈라야 한다 */
            const isMark = c => /^[①②③④⑤⑥⑦⑧⑨⑩]$/.test(c.trim());
            /* ⚠ ④ «자리»표 — 칸이 **전부** 맨 기호뿐인 표는 선지가 아니다.
               좌석 배치도·도형 라벨처럼 **기호의 위치가 곧 문제**라, 글로 펴면
               어느 칸이 1번인지 알 수 없어진다. 빈 칸(운전석 자리)까지 지워지므로
               더 나빠진다. 실제로 8인승 좌석 배치도가 이 길로 무너져 있었다.
               선지 표는 기호 «옆에 값»이 있어서 (`| ① | $4$ | ② | …`) 여기 안 걸린다. */
            const marked = rows.flat().filter(c => c.trim());
            const isSeatLike = marked.length > 0 && marked.every(isMark);
            const isChoiceTable = !isSeatLike && rows.some(cells => cells.some(isMark));
            tokens.push({type:'break'});
            if(isChoiceTable){
              for(const cells of rows){
                const line = cells.map(c=>c.replace(/\s+/g,' ').trim()).filter(Boolean).join(' ');
                if(line){ tokens.push({type:'text', v:line}); tokens.push({type:'break'}); }
              }
            } else {
              const singleCol = rows.every(cells=>cells.length===1);
              for(const cells of rows){
                const out = singleCol
                  ? cells[0].split('\n').map(l=>l.trim()).filter(Boolean).map(l=>[l])
                  : [cells.map(c=>c.replace(/\s+/g,' ').trim())];
                for(const row of out){
                  tokens.push({type:'text', v:'| ' + row.join(' | ') + ' |'});
                  tokens.push({type:'break'});
                }
              }
            }
          }
        } else if(local === 'ctrl'){
          const endNoteEl = child.getElementsByTagNameNS(HP_NS,'endNote')[0];
          if(endNoteEl){
            { const _p = hwpEndnoteParts(endNoteEl);
              tokens.push({type:'endnote', v: _p.answer, code: _p.code, sol: _p.solution}); }
          } else if(child.getElementsByTagNameNS(HP_NS,'autoNum')[0]?.getAttribute('numType')==='ENDNOTE'){
            // 문서 맨 뒤 "빠른정답" 요약처럼 진짜 hp:endNote가 아닌 평문 목록을 만나면
            // 문항 구간이 끝난 것으로 보고 멈춘다.
            tokens.push({type:'stop'});
          }
        }
      }
    }
    tokens.push({type:'break'});
  }
}
/* 🔴 **미주 맨 앞의 문항 코드를 여기서 떼어 낸다** (2026-09-03 · I-2).
   안 떼면 `[정답]` 라벨이 «맨 앞»이 아니게 되어 아래 정규식이 빗나가고,
   **정답에 코드와 라벨이 통째로 들어간다.** 코드를 심자마자 실제로 그렇게 됐다.
   ⚠ **코드를 미주의 다른 자리로 옮겨도 이 문제는 안 사라진다** — 아래에서 보듯
     미주 속 글자를 «전부 이어 붙인 뒤» 라벨을 떼기 때문에, 끝에 두든 다음 줄에 두든
     정답 텍스트에 섞인다. 자리를 옮길 일이 아니라 **떼어 내야 하는 일**이다.
   🔵 그리고 떼어 낸 코드는 버리지 않는다 — 그대로 문항의 `itemCode` 가 된다. */
/* ⚠ **변형 코드(`-N01`)까지 받는다.** 복습테스트처럼 «이미 변형인 문항»으로 시험지를 만들면
     미주에 `[K2-01-E-0001-N01]` 이 적힌다. 접미사를 안 받으면 그것도 못 알아보고
     **정답에 통째로 섞인다** — 원본 코드에서 겪은 것과 똑같은 흠이다. */
const HWP_CODE_RE = /^\s*\[([A-Z]{1,2}\d?-\d{2}-[A-Z]-\d{4}(?:-[NUD]\d{2})?)\]\s*/;

/* 문제 끝의 배점 표기를 걷어낸다 — 「[5.0점]」·「[4점]」·「(3점)」 (2026-09-04 · 사용자 요청).
   🔵 배점은 **그 시험지에서만 참인 값**이다. 문항을 창고에 담아 다른 시험지로 돌려 쓰면
     거짓말이 되고, 학생 화면에도 남의 시험 배점이 따라다닌다.
   ⚠ **줄 끝에 있는 것만** 걷는다 — 본문 한가운데의 「(3점)」은 문제의 일부일 수 있다. */
function stripScoreMarks(s){
  return String(s || '')
    .split('\n')
    /* 🔴 **줄 끝에만 있는 게 아니다** (2026-09-04에 사용자가 짚었다) —
       hwpx 를 읽으면 선지가 같은 줄로 붙어서 「…최솟값은? [3.5점] ① 4 ② …」가 된다.
       그래서 **대괄호 배점은 줄 어디에 있든** 걷는다 — `[3점]`은 배점 말고 쓰일 일이 없다.
       ⚠ **둥근 괄호 `(3점)` 은 줄 끝의 것만** 걷는다. 문장 속의 「(3점) 짜리 문제」는 글의 일부일 수 있다. */
    .map(line => line
    /* ⚠ **배점 숫자가 «수식»으로 들어오는 교재가 있다** (2026-09-05).
       한글이 4.0 을 수식 개체로 두면 변환기를 거쳐 `[$4.0$점]` 이 된다 —
       `$` 를 안 보던 옛 정규식은 이것을 통째로 놓쳤다 (광남고 1-1b 20문항이 전부 그랬다).
       그래서 숫자 양옆의 `$` 를 있어도 없어도 되게 두었다. */
      .replace(/\s*\[\s*\$?\s*\d+(?:\.\d+)?\s*\$?\s*점\s*\]\s*/g, ' ')
      .replace(/\s*\(\s*\$?\s*\d+(?:\.\d+)?\s*\$?\s*점\s*\)\s*$/, ''))
    .map(line => line.replace(/[ \t]{2,}/g, ' ').trimEnd())
    .join('\n')
    .trim();
}

/* 🔴 **한글 수식의 «중괄호 없는 sqrt»** (2026-09-04에 사용자가 짚었다).
   변환기는 `sqrt{…}` 꼴만 다루는데 한글은 `sqrt 17` 처럼도 쓴다.
   그러면 `$sqrt17$` 이 되어 KaTeX 가 **글자 세 개를 이어 놓은 것**으로 그린다 —
   화면에는 「sqrt17」이 수식체로 뜬다. 실제로 그렇게 나갔다.
   ⚠ 이미 `\sqrt{` 로 바뀐 것은 안 건드린다 — 뒤에 `{` 가 오면 안 걸리게 해 두었다. */
function fixBareSqrt(s){
  /* ⚠ `\b` 를 쓰면 `2sqrt5` 를 놓친다 — 앞이 숫자면 «낱말 경계»가 아니어서다.
     대신 **바로 앞이 역슬래시일 때만** 건너뛴다 (이미 `\sqrt` 로 바뀐 것). */
  return String(s || '').replace(/(?<!\\)sqrt\s*([A-Za-z0-9]+)/g, '\\sqrt{$1}');
}

function hwpEndnoteParts(endNoteEl){
  const subList = endNoteEl.getElementsByTagNameNS(HP_NS,'subList')[0];
  const innerParas = subList ? Array.from(subList.childNodes).filter(n=>n.nodeType===1 && n.localName==='p') : [];
  const innerTokens = [];
  hwpWalkParagraphs(innerParas, innerTokens);
  let ans = '';
  for(const it of innerTokens){ if(it.type==='text'||it.type==='eq') ans += it.v; }
  let code = '';
  const m = ans.match(HWP_CODE_RE);
  if(m){ code = m[1]; ans = ans.slice(m[0].length); }
  // "[정답]" 라벨과, 일부 문서에서 수식 앞에 자동으로 붙는 "수식입니다." 안내 문구를 제거한다.
  let rest = ans.replace(/^\s*\[정답\]\s*/,'').replace(/수식입니다\.?/g,'').trim();

  /* 🔴 **정답과 해설을 가른다** (2026-09-04).
     학교 시험지의 미주는 「[정답] ②」로 끝나서 그동안 문제가 없었다. 그런데 **교재의 미주에는**
     **해설이 통째로 들어 있다.** 그것을 다 «정답»으로 받았더니 창고의 변형 목록에
     **문제 대신 풀이가 줄줄이 떴다** (사용자가 겪었다).
     ⚠ **확실할 때만 가른다** — 첫 글자가 ①~⑤ 면 그것이 정답이고 나머지는 해설이다.
       주관식은 어디까지가 답인지 기계가 모르므로 **가르지 않고 그대로 둔다.**
       짐작으로 자르면 «답이 잘린» 문항이 조용히 생긴다. */
  const mk = rest.match(/^\s*([①②③④⑤])\s*/);
  if(mk) return { code, answer: mk[1], solution: rest.slice(mk[0].length).trim() };
  return { code, answer: rest, solution: '' };
}
function hwpEndnoteText(endNoteEl){ return hwpEndnoteParts(endNoteEl).answer; }
// 표의 셀 하나를 문제 하나로 취급해서 텍스트/그림/(있다면) 정답을 뽑는다.
// 표 기반 시험지는 "번호 인식"을 미주 등장 시점에 의존하면 정답이 없는 문항에서
// 여러 문제가 한 덩어리로 뭉쳐버리는 문제가 있어서, 셀 경계를 기준으로 삼는 게 훨씬 안정적이다.
function hwpCellToBlock(cellParas){
  const tokens = [];
  hwpWalkParagraphs(cellParas, tokens);
  let text = '', answer = null, pics = [], itemCode = '', solution = '';
  for(const tok of tokens){
    if(tok.type === 'endnote'){ answer = tok.v; if(tok.code) itemCode = tok.code; if(tok.sol) solution = tok.sol; }
    else if(tok.type === 'text' || tok.type === 'eq') text += tok.v;
    else if(tok.type === 'pic') pics.push(tok.v);
    else if(tok.type === 'break') text += '\n';
  }
  return { text, answer, pics, itemCode, solution };
}
/* 최상위 표를 «문항 컨테이너»로 볼 것인가, «문항 안의 상자»로 볼 것인가.

   ⚠ 이 둘을 한 규칙으로 못 가른다. 시험지 양식이 두 가지다 —
   ① 표 한 칸이 문항 하나인 시험지 (원래 이 파서가 맞춘 양식)
   ② 문항은 본문에 흐르고, 표는 «다음 조건을 만족시킨다» 상자나 보기 격자로 쓰이는 시험지
   ②를 ①로 읽으면 **한 문제가 조각조각 갈라진다.** 실제로 20문항짜리가 39개로 쪼개졌고,
   좌석 번호 표(①~⑧)가 든 문항 하나가 12조각이 났다 (2026-08-10, 광남고 1-1b).

   그래서 **양쪽으로 다 읽어 보고 미주(정답) 개수와 맞는 쪽을 고른다.**
   문항 하나에 정답 미주가 하나씩 달리므로 미주 개수가 곧 «문항 수»의 근거다.
   양식을 미리 알아맞히려 들지 않는 것이 요점이다 — 알아맞히는 규칙은 다음 양식에서 또 깨진다. */
function hwpParseBlocks(topParas, tablesAsProblems){
  const blocks = [];
  let plainTokens = [];
  let stopped = false;
  function flushPlain(){
    if(plainTokens.length===0) return;
    let cur = { text:'', answer:null, pics:[] };
    for(const tok of plainTokens){
      if(tok.type === 'stop'){ stopped = true; break; }
      if(tok.type === 'endnote'){
        if(cur.text.trim()) blocks.push(cur);
        cur = { text:'', answer: tok.v, itemCode: tok.code || '', solution: tok.sol || '', pics:[] };
      } else if(tok.type === 'text') cur.text += tok.v;
      else if(tok.type === 'eq') cur.text += tok.v;
      else if(tok.type === 'pic') cur.pics.push(tok.v);
      else if(tok.type === 'break') cur.text += '\n';
    }
    if(cur.text.trim()) blocks.push(cur);
    plainTokens = [];
  }
  for(const p of topParas){
    if(stopped) break;
    // 이 문단 바로 아래에 최상위 표(문항 박스 레이아웃)가 있는지 찾는다.
    let foundTable = null;
    for(const runEl of Array.from(p.childNodes)){
      if(runEl.nodeType!==1 || runEl.localName!=='run') continue;
      for(const child of Array.from(runEl.childNodes)){
        if(child.nodeType===1 && child.localName==='tbl') foundTable = child;
      }
    }
    if(foundTable && tablesAsProblems){
      flushPlain();
      const trs = Array.from(foundTable.childNodes).filter(n=>n.nodeType===1 && n.localName==='tr');
      for(const tr of trs){
        const tcs = Array.from(tr.childNodes).filter(n=>n.nodeType===1 && n.localName==='tc');
        for(const tc of tcs){
          const subList = Array.from(tc.childNodes).find(n=>n.nodeType===1 && n.localName==='subList');
          if(subList){
            const cellParas = Array.from(subList.childNodes).filter(n=>n.nodeType===1 && n.localName==='p');
            const b = hwpCellToBlock(cellParas);
            if(b.text.trim()) blocks.push(b);
          }
        }
      }
    } else {
      hwpWalkParagraphs([p], plainTokens);
    }
  }
  flushPlain();
  return blocks;
}

/* ── 문서(여럿) → 문항 목록 ────────────────────────────────────────────
   🔴 **여기가 «문항이 몇 개인가»를 정하는 자리다.** 웹과 도구가 갈리면 안 되는 곳이라
      2026-09-05 에 index.html 의 parseHwpxToProblems 에서 이리로 올렸다.
      브라우저는 DOMParser 로, node 는 제 셈으로 만든 문서를 넣어 준다 —
      **필요한 것은 documentElement 와 getElementsByTagNameNS 둘뿐**이다.
   ⚠ 그림은 여기서 안 붙인다. `pics` 에 참조만 남기고, 실제 바이트를 꺼내는 것은
      zip 을 쥔 쪽(브라우저)의 몫이다. node 는 글만 가져간다. */
function hwpxProblemsFromDocs(docs){
  const topParas = [];
  const allEndnotes = [];
  for(const doc of docs){
    const sec = doc.documentElement;
    if(!sec) continue;
    for(const n of Array.from(sec.childNodes)) if(n.nodeType===1 && n.localName==='p') topParas.push(n);
    for(const e of Array.from(doc.getElementsByTagNameNS(HP_NS,'endNote'))) allEndnotes.push(e);
  }

  /* 미주 개수 = 문항 개수의 근거. 두 가지로 읽어 보고 여기에 맞는 쪽을 고른다. */
  const orderedParts   = allEndnotes.map(hwpEndnoteParts);
  const orderedAnswers = orderedParts.map(x=>x.answer);
  const endnoteCount = orderedAnswers.length;

  /* ⚠ 미주 순서 매칭을 «점수를 매기기 전»에 해야 한다.
     정답이 문제 칸 «밖»에 있는 양식(문항마다 표로 감싼 시험지가 그렇다)에서는
     표=문항 해석이 정답을 하나도 못 붙여 0점이 되고, 그러면 문항 전체가 한 셀에 든
     표=상자 해석이 이겨 **문항이 통째로 한 줄로 뭉개진다** (2026-08-10).
     보정까지 마친 «최종 모습»끼리 견줘야 옳은 쪽이 뽑힌다. */
  const fillAnswers = bs => {
    if(bs.some(b=>!b.answer) && orderedAnswers.length === bs.length){
      bs.forEach((b,i)=>{ if(!b.answer) b.answer = orderedAnswers[i]; });
    }
    /* 코드도 같은 차례로 채운다 — 정답이 이미 붙어 있어도 코드는 비어 있을 수 있다. */
    if(orderedParts.length === bs.length){
      bs.forEach((b,i)=>{
        if(!b.itemCode && orderedParts[i].code) b.itemCode = orderedParts[i].code;
        if(!b.solution && orderedParts[i].solution) b.solution = orderedParts[i].solution;
      });
    }
    return bs;
  };
  const candidates = [
    fillAnswers(hwpParseBlocks(topParas, true)),
    fillAnswers(hwpParseBlocks(topParas, false)),
  ];
  const scoreOf = bs => {
    const answered = bs.filter(b=>b.answer && b.answer.trim()).length;
    /* ① 미주 수와 문항 수가 맞으면 압도적으로 좋다 ② 그다음은 정답이 붙은 비율 */
    return (endnoteCount && bs.length === endnoteCount ? 1000 : 0)
         + (bs.length ? Math.round(answered / bs.length * 100) : 0);
  };
  /* 동점이면 «표를 문항으로 보는» 해석을 택한다 — 그쪽이 셀 안의 줄바꿈을 지킨다. */
  const blocks = scoreOf(candidates[1]) > scoreOf(candidates[0]) ? candidates[1] : candidates[0];

  // 저작권 보호 워터마크(예: 족보닷컴)가 문제나 정답에 섞인 문항은 자동 인식에서 제외한다.
  let watermarkedCount = 0;
  const clean = blocks.filter(b=>{
    const hay = b.text + ' ' + (b.answer||'');
    if(HWP_WATERMARK_PATTERNS.some(re=>re.test(hay))){ watermarkedCount++; return false; }
    return true;
  });

  const problems = clean.map(b => ({
    content: stripScoreMarks(b.text.trim()),
    answer: (b.answer||'').trim(),
    itemCode: b.itemCode || '',
    solution: b.solution || '',
    pics: b.pics || [],
    image: null,
  }));
  return { problems, watermarkedCount, endnoteCount };
}
