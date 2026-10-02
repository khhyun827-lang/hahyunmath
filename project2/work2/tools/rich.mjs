// 원문을 «그대로» 옮기기 위한 추출.
// 평문/LaTeX 로 한 번 바꿨다가 되돌리면 원문이 아니게 된다. 그래서 원본 XML 에서
//   · 글자     -> 그대로
//   · 수식     -> <hp:script> 안의 HWP 원본 식을 그대로
//   · 그림     -> <hp:pic> 통째로 (그림 id 만 새로 매긴다)
//   · 표       -> 칸 글을 줄로 편다 (테두리는 잃는다 — 원본 표의 스타일 id 가 새 문서엔 없다)
// 를 뽑아 «문단 -> run 목록» 으로 만든다.
import fs from 'fs';
import path from 'path';

const BOOKDIR = {
  A: "[공통수학2][고쟁이]04.도형의이동",
  B: "[공통수학2][올림포스유형편]04.도형의이동",
  C: "[공통수학2][유형반복R]04.도형의 이동",
  D: "[공통수학2][절대등급]04.도형의이동",
};

// 균형 잡힌 한 덩어리 잘라 내기
function slice(src, from, tag) {
  const re = new RegExp(`<(/?)${tag}(\\s[^>]*?)?(/?)>`, 'g');
  re.lastIndex = from;
  let d = 0, m;
  while ((m = re.exec(src))) {
    if (m[3]) { if (d === 0) return [src.slice(from, re.lastIndex), re.lastIndex]; continue; }
    if (m[1]) { if (--d === 0) return [src.slice(from, re.lastIndex), re.lastIndex]; }
    else d++;
  }
  return [src.slice(from), src.length];
}

// 문단 하나를 run 목록으로 (표는 안쪽 글을 줄로 편다)
function runsOf(pxml) {
  const runs = [];
  let i = 0;
  const re = /<hp:t(?:\s[^>]*)?>([\s\S]*?)<\/hp:t>|<hp:equation\s|<hp:pic\s|<hp:tbl\s|<hp:t\/>/g;
  let m;
  while ((m = re.exec(pxml))) {
    if (m[0].startsWith('<hp:t/>')) continue;
    if (m[1] !== undefined) {
      // ⚠ 엔티티를 여기서 풀어 둔다. 안 풀면 «&lt;보기&gt;» 를 다시 이스케이프해
      //    «&amp;lt;보기&amp;gt;» 가 되어 화면에 그대로 찍힌다.
      const s = m[1].replace(/<hp:fwSpace\b[^>]*\/?>/g, ' ').replace(/<[^>]*>/g, '')
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'").replace(/&amp;/g, '&');
      if (s) runs.push({ t: 'text', v: s });
      continue;
    }
    if (m[0].startsWith('<hp:equation')) {
      const [blk, end] = slice(pxml, m.index, 'hp:equation');
      // ⚠ 스크립트 태그에 속성이 붙는다: <hp:script xml:space="preserve">.
      //    속성 없는 <hp:script> 만 잡으면 «그 수식이 통째로 버려진다».
      //    선지가 빈칸으로 나오던 원인이 이것이다 (009·031·032·116).
      const sc = blk.match(/<hp:script(?:\s[^>]*)?>([\s\S]*?)<\/hp:script>/);
      const sz = blk.match(/<hp:sz width="(\d+)"[^>]*height="(\d+)"/);
      if (sc) runs.push({ t: 'eq', script: sc[1], w: sz ? +sz[1] : 8600, h: sz ? +sz[2] : 1365 });
      else if (blk.includes('<hp:script')) runs.push({ t: 'eq', script: '', w: 1000, h: 1000 });
      re.lastIndex = end; continue;
    }
    if (m[0].startsWith('<hp:pic')) {
      const [blk, end] = slice(pxml, m.index, 'hp:pic');
      const bin = blk.match(/binaryItemIDRef="([^"]+)"/);
      if (bin) runs.push({ t: 'img', bin: bin[1], xml: blk });
      re.lastIndex = end; continue;
    }
    if (m[0].startsWith('<hp:tbl')) {
      const [blk, end] = slice(pxml, m.index, 'hp:tbl');
      // 칸마다 글을 모아 «| 칸 | 칸 |» 한 줄로 (본문 파서와 같은 표기)
      const rows = [];
      let rr = 0;
      const trRe = /<hp:tr(?:\s[^>]*)?>/g;
      let t;
      while ((t = trRe.exec(blk))) {
        const [trx, te] = slice(blk, t.index, 'hp:tr');
        const cells = [];
        const tcRe = /<hp:tc(?:\s[^>]*)?>/g;
        let c;
        while ((c = tcRe.exec(trx))) {
          const [tcx, ce] = slice(trx, c.index, 'hp:tc');
          cells.push(runsOf(tcx));
          tcRe.lastIndex = ce;
        }
        if (cells.length) rows.push(cells);
        trRe.lastIndex = te;
      }
      // ⚠ 쪽 머리말 표(「| 고쟁이 공통수학2 | | 5.집합 |」)가 문항 안에 섞여 들어온다.
      //    그대로 두면 조건틀 상자로 둔갑한다.
      const plainAll = rows.map((rw) => rw.map((c) => c.map((x) => x.v || '').join('')).join(' ')).join(' ');
      if (!/(고쟁이|올림포스|유형반복|절대등급)[^|]*공통수학/.test(plainAll)) runs.push({ t: 'tbl', rows });
      re.lastIndex = end; continue;
    }
  }
  return runs;
}

// 한 권을 문항 단위로.
// ⚠ 경계는 «미주가 열리는 자리» 하나로만 잡는다 — 검증된 hwpx-extract 와 같은 규칙이라야
//    문항 번호(A-001 …)가 분석 결과와 어긋나지 않는다.
//    (최상위 문단을 알아내려는 방식은 유형 머리와 빈 껍데기를 문항으로 세어 어긋났다.)
export function richBook(code) {
  const cdir = path.join('extract', BOOKDIR[code], 'Contents');
  const secs = fs.readdirSync(cdir).filter((f) => /^section\d+\.xml$/.test(f))
    .sort((a, b) => +a.match(/\d+/)[0] - +b.match(/\d+/)[0]);
  const probs = [];

  for (const f of secs) {
    const xml = fs.readFileSync(path.join(cdir, f), 'utf8');
    // ⚠ `<hp:endNotePr>`(미주 «설정») 이 있다. 태그 경계를 요구하지 않으면 그것까지 잡혀
    //    문항이 하나 늘고, 게다가 그 조각이 문서 앞부분을 통째로 삼킨다.
    const spans = [];
    const re = /<hp:endNote[\s>]/g;
    let m;
    while ((m = re.exec(xml))) {
      const [enx, e] = slice(xml, m.index, 'hp:endNote');
      spans.push([m.index, e, enx]);
      re.lastIndex = e;
    }
    spans.forEach(([st, e, enx], k) => {
      const stop = k + 1 < spans.length ? spans[k + 1][0] : xml.length;
      const chunk = xml.slice(e, stop);
      const paras = paraRuns(chunk);
      // ⚠ 미주 앵커는 문항의 «첫 문단 안»에 있다. 그래서 앵커 뒤~다음 <hp:p> 앞에 남는
      //    조각이 곧 발문이다. 이것을 안 주우면 문제는 사라지고 선지만 남는다.
      let fp = chunk.search(/<hp:p[\s>]/);
      if (fp < 0) fp = chunk.length;
      const head = runsOf(chunk.slice(0, fp));
      if (head.length) paras.unshift(head);
      probs.push({ n: probs.length + 1, answer: paraRuns(enx), paras });
    });
  }
  return probs;
}

// 주어진 XML 조각 안의 문단들을 run 목록으로.
// top=true 면 표 안쪽 문단은 표 run 이 이미 담으므로 건너뛴다.
function paraRuns(xml, top = false) {
  const out = [];
  let i = 0;
  while (i < xml.length) {
    const pi = xml.indexOf('<hp:p', i);
    if (pi < 0) break;
    if (!/^<hp:p[\s>]/.test(xml.slice(pi, pi + 6))) { i = pi + 5; continue; }
    const [pxml, end] = slice(xml, pi, 'hp:p');
    const r = runsOf(pxml);
    if (r.length) out.push(r);
    i = end;
  }
  return out;
}

if (process.argv[1] && process.argv[1].endsWith('rich.mjs')) {
  const code = process.argv[2] || 'B';
  const p = richBook(code);
  console.log(code, '문항', p.length);
  const k = +(process.argv[3] || 1) - 1;
  console.log('\n--- #' + (k + 1) + ' 본문 문단', p[k].paras.length, '---');
  for (const para of p[k].paras) console.log(' ', JSON.stringify(para).slice(0, 300));
  console.log('--- 미주 문단', p[k].answer.length, '---');
  for (const para of p[k].answer.slice(0, 3)) console.log(' ', JSON.stringify(para).slice(0, 240));
}
