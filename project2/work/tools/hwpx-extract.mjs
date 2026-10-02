// HWPX -> 구조를 보존한 평문.
// 문단(hp:p) / 표(hp:tbl>tr>tc) / 수식(hp:equation>hp:script) / 그림(hp:pic) 을
// 순서 그대로 훑는다. 표는 `| 칸 | 칸 |` 한 줄로 적는다 (index.html 파서와 같은 표기).
import fs from 'fs';
import path from 'path';

// ── HWP 수식 문법 -> LaTeX ────────────────────────────────────────────
// ⚠ 낱말 단위(\b...\b) 치환으로는 안 된다. HWP 는 띄어쓰기 없이 붙여 쓴다
//    (`A cupB`, `2 inA`, `RIGHT )gen LEFT (` = `) ≥ n(`).
//    그래서 «글자 뭉치»를 왼쪽부터 최장일치로 훑는다.
// ⚠ 그리고 치환을 두 번 돌리면 안 된다. 예전 판은 LEFT 를 \left 로 바꾼 뒤
//    다시 일반 LEFT 규칙에 걸려 \\left 가 됐다.
const KW = {
  // 집합 (이 단원의 주력)
  smallinter: '\\cap', smallunion: '\\cup',
  cap: '\\cap', cup: '\\cup', inter: '\\cap', union: '\\cup',
  emptyset: '\\varnothing', notin: '\\notin', nin: '\\notin',
  nsubset: '\\not\\subset', notsubset: '\\not\\subset',
  subset: '\\subset', supset: '\\supset', in: '\\in',
  // 연산 기호 (사용자 정의 연산에 자주 쓰인다)
  diamond: '\\diamond', circ: '\\circ', times: '\\times', div: '\\div',
  cdots: '\\cdots', cdot: '\\cdot', ldots: '\\ldots', vdots: '\\vdots',
  dotaxis: '\\cdots',
  // 괄호  ⚠ left/right 를 반드시 여기 둔다. 없으면 최장일치가 LEFT 를
  //        le+FT 로 끊어 «\leq FT» 가 된다 (실제로 그렇게 깨졌다)
  left: '\\left', right: '\\right',
  // 부등호  ⚠ ge/le 가 gen·lea 같은 붙여쓰기의 앞머리다
  leq: '\\leq', geq: '\\geq', neq: '\\neq', le: '\\leq', ge: '\\geq', ne: '\\neq',
  sim: '\\sim', approx: '\\approx',
  pm: '\\pm', plusminus: '\\pm', minusplus: '\\mp',
  // 그리스
  alpha: '\\alpha', beta: '\\beta', gamma: '\\gamma', delta: '\\delta',
  epsilon: '\\epsilon', theta: '\\theta', lambda: '\\lambda', mu: '\\mu',
  pi: '\\pi', sigma: '\\sigma', phi: '\\phi', omega: '\\omega',
  // 논리·기타
  therefore: '\\therefore', because: '\\because',
  forall: '\\forall', exist: '\\exists', infinity: '\\infty', inf: '\\infty',
  rightarrow: '\\rightarrow', leftarrow: '\\leftarrow',
  triangle: '\\triangle', angle: '\\angle', perp: '\\perp',
  sum: '\\sum', prod: '\\prod', int: '\\int', lim: '\\lim', log: '\\log',
  sqrt: '\\sqrt', root: '\\sqrt', over: '\\over', bar: '\\bar',
  underbrace: '\\underbrace', box: '\\boxed', pile: '\\pile',
  matrix: '\\matrix', pmatrix: '\\pmatrix',
  // 서체 지정 — 버린다
  rm: '', it: '', bold: '',
};
const KW_KEYS = Object.keys(KW).sort((a, b) => b.length - a.length);

export function eqToLatex(src) {
  if (!src) return '';
  let s = String(src).replace(/[`~]/g, ' ').replace(/\r?\n/g, ' ');

  // 글자 뭉치마다 최장일치로 키워드를 떼어 낸다. 못 떼면 한 글자를 변수로 흘린다.
  s = s.replace(/[A-Za-z]+/g, (run) => {
    let out = '', i = 0;
    while (i < run.length) {
      const rest = run.slice(i).toLowerCase();
      const hit = KW_KEYS.find((k) => rest.startsWith(k));
      if (hit) { out += ' ' + KW[hit] + ' '; i += hit.length; }
      else { out += run[i]; i += 1; }
    }
    return out;
  });

  s = s.replace(/<=/g, '\\leq ').replace(/>=/g, '\\geq ').replace(/!=/g, '\\neq ');

  // 구조 명령 — 토큰이 된 뒤에 모양을 잡는다
  s = s.replace(/\\pile\s*\{([^{}]*)\}/g, (_, b) => '\\begin{matrix}' + b.replace(/#/g, '\\\\') + '\\end{matrix}');
  s = s.replace(/\\p?matrix\s*\{([^{}]*)\}/g, (_, b) => '\\begin{matrix}' + b.replace(/#/g, '\\\\') + '\\end{matrix}');
  // UNDERBRACE {설명}{식}  ->  \underbrace{식}_{설명}
  s = s.replace(/\\underbrace\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, (_, lab, ex) => `\\underbrace{${ex}}_{${lab}}`);

  // LEFT/RIGHT 뒤의 구분자를 붙여 준다.
  //  · KaTeX 는 \left{ 를 못 읽는다 -> \left\{
  //  · 구분자가 없으면 \left. 로 채운다 (안 채우면 수식 전체가 안 그려진다)
  s = s.replace(/\\left\s*([({[|.])?/g, (_, d) => '\\left' + (d === '{' ? '\\{' : d || '.'));
  s = s.replace(/\\right\s*([)}\]|.])?/g, (_, d) => '\\right' + (d === '}' ? '\\}' : d || '.'));

  // 짝이 안 맞으면 통째로 버린다 (수식 전체가 안 그려지는 것보다 낫다)
  const nl = (s.match(/\\left/g) || []).length, nr = (s.match(/\\right/g) || []).length;
  if (nl !== nr) s = s.replace(/\\left|\\right/g, '');

  return s.replace(/\s+/g, ' ').trim();
}

const ENT = { '&lt;': '<', '&gt;': '>', '&amp;': '&', '&quot;': '"', '&apos;': "'" };
const unent = (t) => t.replace(/&(lt|gt|amp|quot|apos);/g, (m) => ENT[m])
  .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d))
  .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)));

// ── 섹션 XML 한 장을 훑는다 ────────────────────────────────────────────
// ⚠ 정답·해설은 본문이 아니라 «미주»(hp:endNote) 안에 있다.
//    그래서 본문과 해설을 글 내용으로 갈라낼 필요가 없다 — 구조가 이미 갈라 놨다.
//    미주가 놓인 자리에 ⟪ANS:n⟫ 표시를 남기고, 내용은 따로 모은다.
function parseSection(xml, notes) {
  const out = [];          // 완성된 줄들
  let para = '';           // 지금 쌓고 있는 문단
  const tblStack = [];     // 표 중첩
  let imgN = 0;
  let noteDepth = 0;       // 미주 안인가
  let noteBuf = null;

  const flushPara = () => {
    const t = para.replace(/[ \t]+/g, ' ').trim();
    if (tblStack.length) {
      const top = tblStack[tblStack.length - 1];
      if (t && top.cell) top.cell.push(t);
    } else if (t) (noteDepth ? noteBuf : out).push(t);
    para = '';
  };

  const re = /<(\/?)([a-zA-Z]+:[a-zA-Z]+)([^>]*?)(\/?)>|([^<]+)/g;
  let m;
  let inScript = false, script = '';

  while ((m = re.exec(xml))) {
    const [, close, tag, attrs, selfClose, text] = m;

    if (text !== undefined) {
      if (inScript) script += text;
      continue;
    }

    if (tag === 'hp:script') {
      if (close) {
        inScript = false;
        const tex = eqToLatex(unent(script));
        if (tex) para += ' $' + tex + '$ ';
        script = '';
      } else if (!selfClose) { inScript = true; script = ''; }
      continue;
    }
    if (inScript) continue;

    switch (tag) {
      case 'hp:t':
        // ⚠ <hp:t/> (빈 자기닫음) 를 걸러야 한다. 안 그러면 indexOf 가
        //   한참 뒤의 </hp:t> 를 찾아 그 사이 XML 을 통째로 삼킨다.
        if (close || selfClose) break;
        // hp:t 의 내용은 다음 반복의 text 로 들어온다 -> 직접 잘라 온다
        {
          const start = re.lastIndex;
          const end = xml.indexOf('</hp:t>', start);
          if (end > -1) {
            // hp:t 안에는 강조·공백 같은 인라인 제어 태그가 섞여 있다.
            // 태그는 «먼저» 걷어내고 그다음 엔티티를 푼다 (순서를 바꾸면
            // 본문의 &lt; 가 태그로 오인된다).
            const raw = xml.slice(start, end)
              .replace(/<hp:(fwSpace|tab)\b[^>]*\/?>/g, ' ')
              .replace(/<[^>]*>/g, '');
            para += unent(raw);
            re.lastIndex = end;
          }
        }
        break;
      case 'hp:tab': para += '\t'; break;
      case 'hp:lineBreak': para += ' '; break;
      case 'hp:pic':
        if (!close) para += ` [그림${++imgN}] `;
        break;
      case 'hp:tbl':
        if (close) {
          const t = tblStack.pop();
          if (t && t.rows.length) {
            const line = t.rows.map((r) => '| ' + r.join(' | ') + ' |').join('\n');
            if (tblStack.length) tblStack[tblStack.length - 1].cell.push(line);
            else out.push(line);
          }
        } else if (!selfClose) {
          flushPara();
          tblStack.push({ rows: [], row: null, cell: null });
        }
        break;
      case 'hp:tr': {
        const t = tblStack[tblStack.length - 1]; if (!t) break;
        if (close) { if (t.row) t.rows.push(t.row); t.row = null; }
        else t.row = [];
        break;
      }
      case 'hp:tc': {
        const t = tblStack[tblStack.length - 1]; if (!t) break;
        if (close) {
          flushPara();
          if (t.row) t.row.push((t.cell || []).join(' ').trim());
          t.cell = null;
        } else { flushPara(); t.cell = []; }
        break;
      }
      case 'hp:p':
        if (close || selfClose) flushPara();
        break;
      case 'hp:endNote':
        if (close) {
          flushPara();
          noteDepth -= 1;
          if (noteDepth === 0) { notes.push(noteBuf.join('\n')); noteBuf = null; }
        } else if (!selfClose) {
          flushPara();
          if (noteDepth === 0) { noteBuf = []; out.push(`⟪ANS:${notes.length + 1}⟫`); }
          noteDepth += 1;
        }
        break;
    }
  }
  flushPara();
  return out.join('\n');
}

export function extractHwpx(dir) {
  const cdir = path.join(dir, 'Contents');
  const secs = fs.readdirSync(cdir).filter((f) => /^section\d+\.xml$/.test(f))
    .sort((a, b) => (+a.match(/\d+/)[0]) - (+b.match(/\d+/)[0]));
  const notes = [];
  const body = secs.map((f) => parseSection(fs.readFileSync(path.join(cdir, f), 'utf8'), notes)).join('\n');
  return { body, notes };
}

// 본문을 «미주 자리»로 잘라 문항 단위로 만든다.
// 미주 표시는 문항의 «앞»에 온다 -> 표시 n 부터 표시 n+1 직전까지가 문항 n 이다.
export function splitProblems(body, notes) {
  const parts = body.split(/⟪ANS:(\d+)⟫/);
  const probs = [];
  for (let i = 1; i < parts.length; i += 2) {
    const n = +parts[i];
    probs.push({ n, body: (parts[i + 1] || '').trim(), answer: (notes[n - 1] || '').trim() });
  }
  return { preamble: parts[0].trim(), probs };
}

if (process.argv[1] && process.argv[1].endsWith('hwpx-extract.mjs')) {
  const { body, notes } = extractHwpx(process.argv[2]);
  const out = process.argv[3];
  const { probs } = splitProblems(body, notes);
  if (out) {
    fs.writeFileSync(out, body, 'utf8');
    fs.writeFileSync(out.replace(/\.txt$/, '.json'), JSON.stringify(probs, null, 1), 'utf8');
    console.error('wrote', out, `본문 ${body.length}자 · 미주 ${notes.length}개 · 문항 ${probs.length}개`);
  } else console.log(body);
}
