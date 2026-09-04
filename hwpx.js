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
          /* ⚠ **분모에 중괄호가 없는 꼴도 온다** — `{sqrt{5}} over 5` (2026-09-05).
             분자만 중괄호면 위 갈래에 안 걸려 `over` 가 글자로 남는다. 분모가 «숫자 하나 또는
             낱글자»일 때만 받는다 — 그보다 넓히면 어디까지가 분모인지 알 수 없다. */
          const bare = s.slice(k).match(/^([0-9]+|[A-Za-z])/);
          if(bare){
            const num = convertOverToFrac(s.slice(i+1, close1));
            result += '\\frac{'+num+'}{'+bare[1]+'}';
            i = k + bare[1].length;
            continue;
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
  /* 🔴 **백틱은 «지우는 것»이 아니라 «공백»이다** (2026-09-04에 사용자가 짚어 찾았다).
     한글 수식에서 ` 는 얇은 공백이다. 지워 버리면 앞뒤 낱말이 **붙는다** —
     `left|` a`right|` 가 `left| aright|` 가 되고, 그러면 아래 LEFT/RIGHT 규칙이
     `RIGHT` 의 낱말 경계를 못 찾아 **RIGHT 가 날글자로 남는다.** 그 수식은 안 그려진다.
     (사용자가 K2-01-E-0009 에서 `4RIGHT )` 로 겪었다 — 원본은 `4`right|` 꼴이었다.) */
  s = s.replace(/`/g, ' ');
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
  /* 🔴 **`le` 가 `left` 를 물어뜯고 있었다** (2026-09-05 · 교재 564제 중 315개가 깨져 있었다).
     뒤쪽 낱말 경계를 안 본 탓에 `left(` 가 **`\leqft(`** 이 되고, 그러면 아래 LEFT/RIGHT 규칙도
     못 알아봐 **수식이 통째로 안 그려진다.** 학교 시험지는 대문자 `LEFT` 를 써서 여태 안 드러났다.
     ⚠ 그렇다고 뒤에 `\b` 를 붙이면 안 된다 — `le5` 처럼 숫자가 바로 붙는 꼴을 놓친다(옛 주석의 그 까닭).
     🔵 그래서 **«뒤가 글자일 때만» 비켜선다.** 숫자·공백·괄호 앞에서는 그대로 뜻이 산다. */
  s = s.replace(/(?<!\\)\ble(?![a-zA-Z])/g, '\\leq').replace(/(?<!\\)\bge(?![a-zA-Z])/g, '\\geq');
  s = s.replace(/\bTIMES\b/gi, '\\times');
  /* 🔵 **교재에서 새로 나온 셋** (2026-09-05 · 564제를 훑어보고 찾았다).
     학교 시험지에는 없던 표기라 여태 안 드러났다 — `90 DEG` 는 「DEG」 라는 글자로,
     `l prime` 은 「prime」 이라는 글자로 그대로 화면에 떴다. */
  s = s.replace(/\bDEG\b/gi, '^{\\circ}');
  /* 🔵 교재에서 더 나온 셋 (2026-09-05 · 564제를 훑어 세어 보고 더했다).
     ⚠ **맨몸 `over`** — `convertOverToFrac` 은 `{분자} over {분모}` 만 다루는데 교재는
       `11 over 2` 처럼 중괄호 없이도 쓴다(13건). 양쪽이 «숫자 하나 또는 낱글자»일 때만 받는다 —
       그보다 넓히면 어디까지가 분자인지 기계가 알 수 없다. */
  s = s.replace(/\s*(?<!\\)\btherefore\b/g, '\\therefore ');
  s = s.replace(/\s*(?<!\\)\bbecause\b/g, '\\because ');
  s = s.replace(/([0-9]+|[A-Za-z])\s*(?<!\\)\bover\s+([0-9]+|[A-Za-z])/g, '\\frac{$1}{$2}');
  /* ⚠ 붙여 쓴 것도 온다 — `1over 2`. 왼쪽이 «숫자»일 때만 낱말 경계 없이 받는다
     (글자까지 허용하면 `lover 2` 같은 것을 물어뜯는다). */
  s = s.replace(/([0-9]+)over\s+([0-9]+|[A-Za-z])/g, '\\frac{$1}{$2}');
  /* ⚠ 뒤 경계를 빼야 `O primeA primeB` 를 다 잡는다 — 백틱을 공백으로 바꾸면서 생긴 꼴이다. */
  s = s.replace(/\s*(?<!\\)\bprime/g, '^{\\prime}');
  /* ⚠ **`prime` 도 붙여 쓴 꼴이 온다** — `OprimeAprimeBprime` (angle·bar 와 같은 사정이다).
     낱말 경계가 없어 위 규칙에 안 걸린다. 앞 글자를 남기고 프라임만 올린다. */
  s = s.replace(/([A-Za-z}])prime/g, '$1^{\\prime}');
  /* ⚠ **`it` 이 «맨 끝»에도 온다** — 위쪽 규칙은 뒤에 글자·숫자·괄호가 올 때만 걷어서
     `{{ABC}}it$` 처럼 끝에 붙은 것 54개가 그대로 남았다. 서체 지정이라 뜻이 없으니 걷는다. */
  s = s.replace(/\bit\b\s*/g, '');
  // angle/bar는 "angle{BAD}"(중괄호), "angle BAD"(공백), "angleBAD"(붙여쓰기) 세 가지 형태가
  // 모두 나오므로 각각 처리한다. 방금 만든 "\angle"/"\overline"을 다시 건드리지 않도록
  // (무한 중복 방지) 바로 앞이 백슬래시가 아닐 때만 매치한다.
  /* ⚠ 교재는 `ANGLE` 을 대문자로도 쓴다 — 아래 규칙들이 전부 소문자만 보므로 먼저 낮춘다. */
  s = s.replace(/\bANGLE\b/g, 'angle');
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
  /* ⚠ **교재는 소문자 `left(` `right)` 를 쓴다** — 시험지는 대문자였다. 둘 다 받는다 (2026-09-05). */
  /* 🔴 **낱말 경계를 요구하면 «붙여 쓴 것»을 통째로 놓친다** (2026-09-04에 사용자가 짚었다).
     교재에는 `4RIGHT )` · `1right}` · `subsetleft{` 처럼 앞 글자·숫자에 **붙어 있는** 것이 나온다.
     그러면 경계를 못 찾아 **RIGHT 가 날글자로 남고, 그 수식은 통째로 안 그려진다.**
     🔵 그래도 위험하지 않은 까닭 — **뒤에 괄호가 오는 것만** 바꾼다. `right}` · `left(` 처럼
       괄호가 붙어 있으면 그것은 사실상 언제나 그 명령어다.
     ⚠ 앞이 역슬래시면 비켜선다 — 방금 만든 것을 다시 건드리면 안 된다. */
  s = s.replace(/(?<!\\)LEFT\s*\{/gi, '\\left\\{')
       .replace(/(?<!\\)RIGHT\s*\}/gi, '\\right\\}');
  s = s.replace(/(?<!\\)LEFT\s*([([|])/gi, (m,d)=>'\\left'+d)
       .replace(/(?<!\\)RIGHT\s*([)\]|])/gi, (m,d)=>'\\right'+d);
  /* ⚠ **여기서 «방금 만든 것»을 지우면 안 된다** — 위에서 `\left(` 를 만들어 놓고
     대소문자를 안 가리고 지우면 `left` 가 통째로 날아가 `\(` 만 남는다.
     그래서 **바로 앞이 역슬래시면 비켜선다** (angle·bar 규칙과 같은 장치다). */
  s = s.replace(/(?<!\\)(?<![A-Za-z])LEFT\b\s*/gi, '').replace(/(?<!\\)(?<![A-Za-z])RIGHT\b\s*/gi, '');
  /* 🔵 **집합 기호** (2026-09-04 · 사용자가 「수식이 제대로 뜨지 않는」 것으로 짚어 찾았다).
     교재 05 집합 단원이 이 낱말들을 쓰는데 변환기에 없어서 **날글자로 그대로 떴다**
     (`A subset B` · `emptyset` · `A CUP B`). 실측 78문항(14%)에 들어 있었다.
     ⚠ **뒤에 공백을 붙여야 한다** — 교재는 `A capB` 처럼 붙여 쓰는데, 공백 없이 바꾸면
       `\\capB` 라는 **없는 명령**이 되어 그 수식이 통째로 안 그려진다.
  /* 🔵 **집합 기호** (2026-09-04 · 사용자가 「수식이 제대로 뜨지 않는」 것으로 짚어 찾았다).
     교재 05 집합 단원이 이 낱말들을 쓰는데 변환기에 없어서 **날글자로 그대로 떴다**
     (`A subset B` · `emptyset` · `A CUP B`). 실측 78문항(14%)에 들어 있었다.

     ⚠ **뒤에 공백을 붙여야 한다** — 교재는 `A capB` 처럼 붙여 쓰는데 공백 없이 바꾸면
       `\\capB` 라는 **없는 명령**이 되어 그 수식이 통째로 안 그려진다.
     ⚠ **긴 것부터** 바꾼다 — `notsubset` 이 `subset` 뒤에 있으면 `not\\subset` 이 된다.
     🔴 **`/i` 플래그를 쓰면 안 된다.** 그러면 뒤를 막는 `(?![a-z])` 까지 대소문자를 안 가려
       `A capB` 의 `B` 를 «소문자»로 보고 비켜선다 — 그래서 안 바뀌었다(실제로 겪었다).
       낱말만 대소문자를 펴서 [cC][aA][pP] 꼴로 만들고, 뒤 조건은 소문자만 막는다. */
  const 대소문자펴기 = w => w.split('').map(c => '[' + c + c.toUpperCase() + ']').join('');
  for(const [낱말, 기호] of [
    ['notsubset', 'not\\subset'], ['smallinter', 'cap'], ['smallunion', 'cup'],
    ['setminus', 'setminus'], ['emptyset', 'emptyset'], ['notin', 'notin'],
    ['subset', 'subset'], ['supset', 'supset'], ['cap', 'cap'], ['cup', 'cup'],
  ]){
    /* 앞이 글자여도 바꾼다 — 교재는 `AcapB` · `0inemptyset` 처럼 양쪽을 다 붙여 쓴다.
       뒤가 소문자면 비켜서므로 `escape` 같은 평범한 낱말은 안 걸린다. */
    s = s.replace(new RegExp('(?<!\\\\)' + 대소문자펴기(낱말) + '(?![a-z])', 'g'), '\\' + 기호 + ' ');
  }
  /* 🔴 **`in` 만은 앞 경계를 지킨다** — 풀면 `sin` · `min` 의 뒤 두 글자가 걸려 `s\\in` 이 된다.
     그래도 `0inemptyset` 은 잡힌다 — 위에서 emptyset 이 먼저 `\\emptyset` 이 되므로
     `in` 뒤가 역슬래시가 되어 조건을 지나간다. **그래서 이 줄은 반드시 위 고리 «다음»이다.** */
  s = s.replace(/(?<![A-Za-z\\\\])[iI][nN](?![a-z])/g, '\\in ');
  s = s.replace(/\bCDOTS\b/gi, '\\cdots').replace(/\bLDOTS\b/gi, '\\ldots')
       .replace(/\bDOTSAXIS\b/gi, '\\cdots').replace(/\bDOTS\b/gi, '\\cdots');
  /* «같지 않다»가 세 가지 표기로 온다 — != 와 NEQ(위에서 처리) 와 ne. */
  s = s.replace(/!=/g, '\\neq').replace(/(?<!\\)\bne\b/g, '\\neq');
  /* pile{a#b}는 «세로로 쌓기»다. 열이 하나인 행렬로 옮긴다 (행 구분은 cases·pmatrix와 같은 #). */
  s = replaceBalancedKeyword(s, 'pile', inner =>
    '\\begin{matrix}' + inner.replace(/#/g,'\\\\') + '\\end{matrix}');
  /* 🔵 **수식 안의 `#` 는 줄바꿈이고 `~` 는 공백이다** (2026-09-04).
     행렬·cases·pile 안의 `#` 는 위에서 이미 `\` 로 바뀌었다. 여기 남은 것은
     **한 줄짜리 수식을 편집기에서 두 줄로 접어 놓은 자국**이라, 화면에서는 한 줄이면 된다.
     ⚠ 그대로 두면 `#` 가 날글자로 뜨고, 접은 자리를 맞추려고 넣은 `~` 스무 개가
       **한 줄을 통째로 밀어낸다**(사용자가 K2-01-E-0011 에서 겪었다). */
  s = s.replace(/#/g, ' ');
  s = s.replace(/~{3,}/g, '~');
  s = convertOverToFrac(s);
  s = replaceBalancedKeyword(s, 'sqrt', inner => '\\sqrt{' + inner + '}');
  /* 중괄호를 안 쓴 `sqrt 17` 꼴도 받는다 — 위 함수는 `sqrt{` 만 본다 (2026-09-04). */
  s = fixBareSqrt(s);
  // 첨자가 여러 글자인데 중괄호 없이 붙어있으면(a_11 등) LaTeX에서 첫 글자만
  // 첨자로 처리되어 깨지므로, 중괄호로 다시 감싸준다.
  s = s.replace(/([_^])(?!\{)([0-9a-zA-Z]+)/g, '$1{$2}');
  s = s.replace(/\s+/g, ' ').trim();
  /* 🔴 **`\left` 와 `\right` 는 «짝»이어야 한다 — 안 맞으면 KaTeX 는 그 수식을 통째로 안 그린다** (2026-09-04).
     원본에 짝이 안 맞게 적힌 것이 실제로 있다(`\left\{0,~9right` 처럼 닫는 쪽이 빠진 것).
     위에서 «못 알아본 RIGHT 는 지운다»를 하고 나면 여는 쪽만 남기도 한다.
     🔵 LaTeX 에는 **«보이지 않는 짝»**이 있다 — `\right.` 와 `\left.` 다.
       그것으로 수를 맞추면 **원본이 깨져 있어도 나머지는 제대로 그려진다.**
       아무것도 안 하면 그 문항은 화면에서 날 LaTeX 로 뜬다 — 그쪽이 훨씬 나쁘다. */
  {
    const 여는수 = (s.match(/\\left(?![a-zA-Z])/g) || []).length;
    const 닫는수 = (s.match(/\\right(?![a-zA-Z])/g) || []).length;
    if(여는수 > 닫는수) s = s + ' \\right.'.repeat(여는수 - 닫는수);
    else if(닫는수 > 여는수) s = '\\left. '.repeat(닫는수 - 여는수) + s;
  }
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
          /* 🔴 **미주를 품은 표는 «상자»가 아니라 «문항 그 자체»다** (2026-09-05).
             교재는 문항 하나를 표 하나로 감싸고 그 안에 또 «보기» 상자를 둔다. 그런데 셀을 글자로
             납작하게 만드는 동안 **안쪽 상자의 `|` 가 지워져** 보기·조건 상자가 통째로 줄글이 됐다.
             (사용자가 모바일에서 짚었다. 2026-08-10에 고친 「표가 글 뭉치로 뭉개진다」의 **한 겹 안쪽 판**이다.)
             🔵 껍질과 상자는 **모양이 똑같아서**(둘 다 「머리 3칸 + 내용 1칸」) 모양으로는 못 가른다.
               가르는 것은 **미주다** — 정답 미주가 든 표는 문항이고, 안 든 표는 상자다.
               실측: 교재 05 집합의 표 432개 중 미주를 품은 것이 **정확히 134개 = 문항 수**였고,
               광남고 시험지는 **0개**였다(= 시험지 쪽은 한 글자도 안 바뀐다). */
          const shellCells = [];
          let isProblemShell = false;
          for(const tr of trs){
            const tcs = Array.from(tr.childNodes).filter(n=>n.nodeType===1 && n.localName==='tc');
            const cells = [];
            for(const tc of tcs){
              const subList = Array.from(tc.childNodes).find(n=>n.nodeType===1 && n.localName==='subList');
              if(!subList){ cells.push(''); continue; }
              const cellParas = Array.from(subList.childNodes).filter(n=>n.nodeType===1 && n.localName==='p');
              const cellTokens = [];
              hwpWalkParagraphs(cellParas, cellTokens);
              shellCells.push(cellTokens);
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
                else if(t.type==='endnote'){ isProblemShell = true; tokens.push(t); }  // 정답 미주도 마찬가지
              }
              cells.push(s.replace(/[ \t]+/g,' ').replace(/\n{2,}/g,'\n').trim());
            }
            if(cells.some(c=>c)) rows.push(cells);
          }
          if(isProblemShell){
            /* 껍질은 그리지 않는다 — 안의 토큰을 그대로 흘려보낸다.
               그러면 ① 발문이 표에 안 갇히고 ② **안쪽 보기 상자가 최상위 표가 되어 살아난다.**
               ⚠ 그림·미주는 위에서 이미 내보냈으므로 여기서 또 넣지 않는다.
               ⚠ **출처 딱지 칸은 버린다** — 「고쟁이」·「[유형반복R]」 같은 짧은 이름이다.
                 문항의 일부가 아니고, 장부에 이미 있으며 화면의 「출처」 칸이 따로 보여 준다.
                 잣대는 item-code.mjs 의 looksName 과 같다 — 짧고, 문장부호도 번호도 없는 낱말. */
            for(const cellTokens of shellCells){
              let plain = '';
              for(const t of cellTokens) if(t.type==='text' || t.type==='eq') plain += String(t.v);
              plain = plain.trim();
              const looksLikeSourceTag = plain.length > 0 && plain.replace(/^\[|\]$/g,'').length <= 14
                && !/[.,?!()①②③④⑤]/.test(plain) && !/^\d+$/.test(plain);
              if(looksLikeSourceTag) continue;
              for(const t of cellTokens) if(t.type !== 'pic' && t.type !== 'endnote') tokens.push(t);
              tokens.push({type:'break'});
            }
            continue;
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
              /* 🔵 **«열이 하나»가 아니라 «값이 든 칸이 하나»로 센다** (2026-09-05).
                 교재의 보기·조건 상자는 머리가 세 칸이다 — `| | [보기] | |`. 가운데만 값이 있고
                 양옆은 여백용 빈 칸이다. 그런데 «칸 수»로 세면 세 칸이라 **격자로 오판**되고,
                 격자는 칸을 지키려고 줄바꿈을 공백으로 접으므로 **상자 안이 통째로 한 줄이 된다.**
                 (사용자가 모바일에서 짚은 「조건박스·보기박스가 줄글로 뜬다」가 이것이다.)
                 ⚠ 값이 든 칸이 둘 이상인 행이 하나라도 있으면 **진짜 격자**다 — 그때는 손대지 않는다.
                 ⚠ 그리고 값은 `cells[0]` 이 아니라 **«값이 든 칸»**에서 가져와야 한다.
                   빈 칸이 앞에 오는 상자에서 `cells[0]` 을 쓰면 제목이 통째로 사라진다. */
              const filled = cells => cells.filter(c => c.trim());
              const isBox = rows.every(cells => filled(cells).length <= 1);
              for(const cells of rows){
                const out = isBox
                  ? (filled(cells)[0] || '').split('\n').map(l=>l.trim()).filter(Boolean).map(l=>[l])
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

/* ── 장식 그림을 가려낸다 ─────────────────────────────────────────────
   🔴 **«그림이 붙어 있다»와 «그림이 있어야 푸는 문제다»는 다른 말이다** (2026-09-05).
   교재는 문항마다 번호 딱지를 그림 개체로 넣는다. 그대로 두면 564제가 **전부** «그림 문항»이
   되고, 첫 그림을 문항 그림으로 삼는 자리에서는 문항마다 딱지가 붙는다.

   🔵 가르는 잣대는 **되풀이**다 — 여러 문항에 나오는 그림은 내용이 아니라 장식이다.

   🔴 ⚠ **«참조 이름»으로 세면 안 된다** (사용자가 화면에서 필름릴 아이콘을 보고 짚었다).
     한글은 같은 딱지를 문서 안에 **여러 벌로 따로 저장**한다 — `image10`(57번) · `image23`(7번) ·
     `image18`(1번)이 **md5 가 같은 한 파일**이었다. 이름으로 세면 `image18` 은 «한 번뿐»이라
     진짜 그림으로 통과한다. **내용으로 묶어야** 65번 쓰인 딱지로 보인다.
     (진짜 그림은 1.1~1.5MB BMP 였고 딱지는 34KB PNG 였다 — 크기로도 갈렸지만 그건 이 교재의
      사정일 뿐이라 기대지 않는다. 내용이 같으냐가 언제나 참인 잣대다.)

   `keyOf(ref)` 는 «그 그림의 내용 열쇠»를 돌려준다 — node 는 md5, 브라우저는 길이+표본 해시.
   안 주면 참조 이름으로 센다(옛 동작).
   ⚠ 지우지 않고 `decorPics` 로 남긴다 — 「딱지가 왜 없냐」를 나중에 되짚을 수 있어야 한다. */
function hwpxMarkDecorPics(problems, keyOf){
  const key = typeof keyOf === 'function' ? keyOf : (ref => ref);
  const use = {};
  for(const p of problems){
    const seen = new Set();
    for(const ref of (p.pics || [])){ const k = key(ref); if(seen.has(k)) continue; seen.add(k); use[k] = (use[k]||0) + 1; }
  }
  const DECOR_MIN = 5;   // 같은 그림이 다섯 문항 넘게 나오면 장식이다
  for(const p of problems){
    const pics = p.pics || [];
    p.decorPics = pics.filter(ref => use[key(ref)] >= DECOR_MIN);
    p.pics      = pics.filter(ref => use[key(ref)] <  DECOR_MIN);
  }
  return problems;
}

/* ── 문서(여럿) → 문항 목록 ────────────────────────────────────────────
   🔴 **여기가 «문항이 몇 개인가»를 정하는 자리다.** 웹과 도구가 갈리면 안 되는 곳이라
      2026-09-05 에 index.html 의 parseHwpxToProblems 에서 이리로 올렸다.
      브라우저는 DOMParser 로, node 는 제 셈으로 만든 문서를 넣어 준다 —
      **필요한 것은 documentElement 와 getElementsByTagNameNS 둘뿐**이다.
   ⚠ 그림은 여기서 안 붙인다. `pics` 에 참조만 남기고, 실제 바이트를 꺼내는 것은
      zip 을 쥔 쪽(브라우저)의 몫이다. node 는 글만 가져간다. */
/* 🔴 **«다음 유형의 제목»이 이 문항 끝에 딸려 온다** (2026-09-04 · 사용자가 짚었다 —
   「문제 외에 다른 글자들이 문제 아래에 적혀져 있는 경우들이 있어」, K2-01-E-0012·0027·0035).
   교재는 유형이 바뀔 때 «제목 줄»을 표 한 칸으로 넣는데, 그 표가 앞 문항의 끝에 붙는다.

   ⚠ **그냥 «끝의 표 줄»을 다 버리면 안 된다** — 조건 상자가 마지막인 문항이 있다.
     둘을 가르는 잣대 셋을 같이 본다:
       ① 조건 표시로 시작하면 남긴다 — `(가)`·`ㄱ.`·`1.` (조건 상자는 이렇게 시작한다)
       ② 앞에 선지(①~⑤)가 있었으면 문항은 이미 끝난 것이다 → 제목이다
       ③ 선지가 없어도 **빈 줄 둘 이상**을 사이에 두고 떨어져 있으면 제목이다
     실측(교재 564제): 뺄 것 113 · 남길 것 9 · 애매 0 으로 깨끗하게 갈렸다.
   ⚠ 시험지에는 이런 제목 줄이 없다 — 한 줄도 안 바뀐다. */
function stripTrailingTypeTitle(text){
  /* 조건 상자는 `(가)` · `ㄱ.` · `1.` 로 시작한다 — 그런 줄은 문항의 일부다. */
  const 조건표시 = /^\s*(\([가-힣]\)|[ㄱ-ㅎ][.)]|[0-9]+[.)])/;
  const 선지 = /[①②③④⑤]/;
  let ls = String(text || '').split('\n');
  for(let 바퀴 = 0; 바퀴 < 3; 바퀴++){          // 제목이 둘 붙는 일도 있다
    let i = ls.length - 1;
    while(i >= 0 && !ls[i].trim()) i--;
    if(i < 0) break;
    const last = ls[i].trim();
    if(!(last.startsWith('|') && last.endsWith('|') && last.length > 2)) break;
    const inner = last.slice(1, -1).trim();
    if(inner.includes('|')) break;              // 칸이 둘 이상이면 진짜 표다
    if(조건표시.test(inner)) break;              // ① 조건 상자는 남긴다
    let 빈 = 0, j = i - 1;
    while(j >= 0 && !ls[j].trim()){ 빈++; j--; }
    const 앞에선지 = 선지.test(ls.slice(0, i).join('\n'));
    if(!(앞에선지 || 빈 >= 2)) break;             // ②③ 둘 다 아니면 손대지 않는다
    ls = ls.slice(0, i);
  }
  return ls.join('\n').replace(/\s+$/, '');
}

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
    content: stripTrailingTypeTitle(stripScoreMarks(b.text.trim())),
    answer: (b.answer||'').trim(),
    itemCode: b.itemCode || '',
    solution: b.solution || '',
    pics: b.pics || [],
    image: null,
  }));

  return { problems, watermarkedCount, endnoteCount };
}
