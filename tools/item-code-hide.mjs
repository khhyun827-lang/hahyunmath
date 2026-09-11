// 문항 코드를 미주에서 «개체 설명문»으로 옮긴다 — 안 보이게 (2026-09-10 · 사용자 요청)
//
//   node tools/item-code-hide.mjs                      ← 재보기만 한다(아무것도 안 고친다)
//   node tools/item-code-hide.mjs --write              ← 「교재 코드파일/숨김/」 에 새로 낸다
//   node tools/item-code-hide.mjs <파일.hwpx> --out <새파일.hwpx>
//   node tools/item-code-hide.mjs <파일.hwpx> --out <새파일.hwpx> --back   ← 도로 미주로
//
// ── 어디에 숨기나 ─────────────────────────────────────────────────────
// 교재는 문항마다 «번호 딱지 그림»을 하나씩 넣는다. 그 그림의 **개체 설명문**이
// 화면에도 인쇄에도 안 보이면서 파일에는 남는 자리다. 문항당 정확히 하나씩 있다 —
// 564제에 564개(76·109·137·108·134). **찾아 헤맬 것 없이 이미 있는 칸이다.**
//
//   그림입니다. 원본 그림의 이름: 자산 12@4x.png …        ← 있던 안내문
//   그림입니다. 원본 그림의 이름: 자산 12@4x.png … [K2-01-E-0001]   ← 뒤에 덧붙인다
//
// 🔴 **있던 안내문을 지우지 않는다.** 그것은 화면 낭독기가 그림을 읽어 주는 글이다.
//    지우면 «안 보이는 것»을 고치려다 «안 들리게» 만든다. 그래서 «덧붙인다».
//
// ── 🔵 미주도 그대로 읽힌다 ────────────────────────────────────────────
// 사용자가 정했다 — 「나는 매번 하나하나 개체설명문 열어서 코드를 쓸 수 없으니까
// 문제 미주에 적어도 읽어낼 수 있게도 해줘.」
// 파서는 **미주를 먼저 보고, 없을 때만 설명문을 본다**(hwpx.js). 그래서
//   · 새로 넣은 문항에 손으로 미주에 `[K2-01-E-0565]` 라고 적어도 그대로 읽힌다
//   · 그 손으로 적은 것이 **설명문보다 세다** — 사람이 적은 쪽이 뜻이 있다
//   · 옛 파일(미주에만 있는 것)도 손댈 것 없이 읽힌다
//
// 🔴 **원본은 한 글자도 안 고친다.** 언제나 새 파일로 낸다.
// 🔴 **낸 파일을 다시 읽어 «코드와 본문이 그대로인지» 스스로 잰다** — 하나라도 어긋나면
//    낸 파일을 지우고 멈춘다. 코드를 옮기다 코드를 잃는 것이 이 일의 유일한 사고다.
//
// ⚠ **아직 안 잰 것 하나** — 한글로 열었다 저장해도 설명문이 살아남는지.
//    그건 사람 손이 한 번 필요하다. `--check` 로 잰다:
//      node tools/item-code-hide.mjs <한글로_저장한.hwpx> --check
//    🔵 살아남지 못해도 코드를 잃지는 않는다 — 장부(codes/*.json)와 창고가 들고 있고,
//      본문으로 되찾는 것이 564제 중 562제에서 한 벌로 된다(docs/코드-숨기기.md 0-B).

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { 푼다, 섹션들, 묶는다 } from './hwpx-zip.mjs';
import { loadHwpxRules, problemsFromHwpx } from './hwpx-node.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const 교재폴더 = path.join(ROOT, '교재 코드파일');

/* 미주 맨 앞의 `[코드]` — `item-code-stamp.mjs` 가 심어 둔 그 꼴이다.
   ⚠ 미주 «안»에서만 찾는다. 본문의 대괄호를 건드리면 안 된다. */
const 미주덩이 = /<hp:endNote\b[^>]*>[\s\S]*?<\/hp:endNote>/g;
/* 🔴 **갈래(`|`)는 반드시 괄호로 묶어 쓴다** (2026-09-10에 검사가 잡았다).
   `'\\[' + 코드꼴 + '\\]'` 로 붙이면 `\[앞갈래|뒷갈래\]` 가 되어 **앞 갈래에 닫는 대괄호가
   안 붙는다.** 그래서 `[K2-01-E-0001]` 에서 `[K2-01-E-0001` 만 지우고 `]` 가 남았고,
   미주가 「] [정답] ②…」로 시작해 **정답 76개가 통째로 어긋났다.**
   🔵 그래서 아예 «묶은 꼴»을 하나 더 두고 붙일 때는 이것만 쓴다. */
const 코드꼴 = '[A-Z]{1,2}\\d?-\\d{2}-[A-Z]-\\d{4}(?:-[NUD]\\d{2})?|[12]\\d{6}[AB]?(?:OR|NC|UP|DW)(?:\\d{2})?';
const 묶은코드 = '(?:' + 코드꼴 + ')';
/* 미주에 심긴 통째 꼴 — `[코드]` 또는 `[코드|지문]`. ⚠ 지문은 대괄호 «안»에 있다. */
const 미주코드꼴 = '\\[' + 묶은코드 + '(?:\\|[^\\]\\s]{0,32})?\\]';

/* 미주 한 덩어리에서 심긴 코드를 뽑는다. 없으면 ''. */
function 미주코드(덩이) {
  const m = 덩이.match(new RegExp('<hp:t(?:\\s[^>]*)?>\\s*\\[(' + 코드꼴 + ')(?:\\|[^\\]\\s]{0,32})?\\]'));
  return m ? m[1] : '';
}

/* ── 훑는다 — 코드가 어디에 몇 개나 있나 ──────────────────────────── */
export function 훑는다(src) {
  const { cdir } = 푼다(src);
  let 미주 = 0, 설명문 = 0, 딱지 = 0;
  for (const s of 섹션들(cdir)) {
    const xml = fs.readFileSync(s, 'utf8');
    for (const 덩이 of xml.match(미주덩이) || []) if (미주코드(덩이)) 미주++;
    설명문 += (xml.match(new RegExp('<hp:shapeComment>[^<]*\\[(?:' + 코드꼴 + ')\\][^<]*</hp:shapeComment>', 'g')) || []).length;
    딱지 += (xml.match(/<hp:shapeComment>[^<]*자산 12@4x\.png[^<]*<\/hp:shapeComment>/g) || []).length;
  }
  return { 미주, 설명문, 딱지 };
}

/* ── 옮긴다 ───────────────────────────────────────────────────────────
   ⚠ **문항 차례를 짐작하지 않는다.** 미주와 딱지 그림은 문서에 나오는 차례가 같지만,
     그것을 «믿고» 짝지으면 하나만 어긋나도 코드가 통째로 밀린다.
     그래서 **XML 자리 차례로 나란히 걷고, 개수가 다르면 멈춘다.** */
export function 옮긴다(src, out, { 되돌리기 = false } = {}) {
  if (fs.existsSync(out)) throw new Error('이미 있는 파일입니다 — ' + out);
  const rules = loadHwpxRules();
  const 앞 = problemsFromHwpx(src, rules).problems;

  const { cdir, tmp } = 푼다(src);
  let 옮김 = 0, 못찾음 = 0;

  for (const s of 섹션들(cdir)) {
    let xml = fs.readFileSync(s, 'utf8');

    if (되돌리기) {
      /* 설명문의 코드를 걷고, 그 코드를 미주 맨 앞에 도로 넣는다. */
      const 코드들 = [];
      xml = xml.replace(new RegExp('(<hp:shapeComment>)([^<]*)(</hp:shapeComment>)', 'g'), (m, a, 속, b) => {
        const 짚 = 속.match(new RegExp('\\s*\\[(' + 코드꼴 + ')\\]'));
        if (!짚) return m;
        코드들.push(짚[1]);
        return a + 속.replace(짚[0], '') + b;
      });
      let i = 0;
      xml = xml.replace(미주덩이, (덩이) => {
        if (미주코드(덩이) || i >= 코드들.length) return 덩이;
        const 새 = 덩이.replace(/(<hp:t(?:\s[^>]*)?>)/, '$1[' + 코드들[i] + ']');
        if (새 !== 덩이) { i++; 옮김++; }
        return 새;
      });
      fs.writeFileSync(s, xml);
      continue;
    }

    /* 🔴 미주에서 코드를 «걷어» 딱지 설명문에 «붙인다». 자리 차례로 나란히 간다. */
    const 코드들 = [];
    xml = xml.replace(미주덩이, (덩이) => {
      const code = 미주코드(덩이);
      if (!code) return 덩이;
      코드들.push(code);
      /* 미주 글에서 `[코드]` 만 뺀다 — 뒤의 「[정답] …」은 그대로 둔다. */
      return 덩이.replace(new RegExp(미주코드꼴), '');
    });
    let i = 0;
    xml = xml.replace(/(<hp:shapeComment>)([^<]*)(<\/hp:shapeComment>)/g, (m, a, 속, b) => {
      if (!/자산 12@4x\.png/.test(속)) return m;              // 문항 딱지에만 붙인다
      if (new RegExp('\\[' + 묶은코드 + '\\]').test(속)) return m;  // 이미 있으면 안 덧붙인다
      if (i >= 코드들.length) { 못찾음++; return m; }
      옮김++;
      return a + 속 + ' [' + 코드들[i++] + ']' + b;
    });
    if (i < 코드들.length) 못찾음 += 코드들.length - i;
    fs.writeFileSync(s, xml);
  }

  묶는다(tmp, out);

  /* 🔴 **낸 파일을 다시 읽어 코드와 본문이 그대로인지 잰다.** */
  const 뒤 = problemsFromHwpx(out, rules).problems;
  const 흠 = [];
  if (앞.length !== 뒤.length) 흠.push('문항 수가 ' + 앞.length + ' → ' + 뒤.length);
  else {
    const 코드다름 = 앞.filter((p, i) => (p.itemCode || '') !== (뒤[i].itemCode || '')).length;
    const 본문다름 = 앞.filter((p, i) => (p.content || '') !== (뒤[i].content || '')).length;
    /* 🔴 **정답도 잰다** (2026-09-10에 검사가 잡고 나서 넣었다).
       코드와 본문만 보다가 «정답 76개가 어긋난 파일»을 통과시켰다 — 미주에서 코드를 걷을 때
       닫는 대괄호가 남아 정답이 「] [정답] ②…」로 시작했는데, 코드도 본문도 멀쩡해서
       자기검사가 못 봤다. **손대는 자리(미주)를 안 재고 있었던 것이다.** */
    const 정답다름 = 앞.filter((p, i) => (p.answer || '') !== (뒤[i].answer || '')).length;
    const 해설다름 = 앞.filter((p, i) => (p.solution || '') !== (뒤[i].solution || '')).length;
    if (코드다름) 흠.push('코드가 달라진 문항 ' + 코드다름 + '제');
    if (본문다름) 흠.push('본문이 달라진 문항 ' + 본문다름 + '제');
    if (정답다름) 흠.push('정답이 달라진 문항 ' + 정답다름 + '제');
    if (해설다름) 흠.push('해설이 달라진 문항 ' + 해설다름 + '제');
  }
  if (흠.length) {
    fs.unlinkSync(out);
    throw new Error('멈췄습니다 — ' + 흠.join(' · ') + '. 낸 파일은 지웠습니다.');
  }
  return { 옮김, 못찾음, 문항: 앞.length, 코드있음: 뒤.filter((p) => p.itemCode).length };
}

/* ── CLI ─────────────────────────────────────────────────────────── */
const 나를직접부름 = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (나를직접부름) {
  const argv = process.argv.slice(2);
  const 쓸까 = argv.includes('--write');
  const 되돌리기 = argv.includes('--back');
  const 재기만 = argv.includes('--check');
  const oi = argv.indexOf('--out');
  const OUT = oi >= 0 ? argv[oi + 1] : '';
  const 준파일 = argv.filter((a, i) => !a.startsWith('--') && !(i > 0 && argv[i - 1] === '--out'));
  const 파일들 = 준파일.length ? 준파일
    : fs.readdirSync(교재폴더).filter((x) => x.endsWith('.hwpx')).sort().map((x) => path.join(교재폴더, x));

  console.log('\n코드가 어디에 있나');
  for (const f of 파일들) {
    const { 미주, 설명문, 딱지 } = 훑는다(f);
    console.log('  ' + path.basename(f).replace(/^.*\]/, '').padEnd(24)
      + '미주 ' + String(미주).padStart(4) + ' · 설명문 ' + String(설명문).padStart(4)
      + ' · 숨길 칸(딱지) ' + String(딱지).padStart(4)
      + (미주 && 딱지 && 미주 !== 딱지 ? '   🔴 미주와 칸 수가 다릅니다' : ''));
  }

  if (재기만) {
    console.log('\n  ⓘ 「설명문」 칸에 숫자가 그대로 남아 있으면 한글이 설명문을 지켰다는 뜻입니다.\n');
    process.exit(0);
  }
  if (!쓸까 && !OUT) {
    console.log('\n  ⓘ 재보기만 했습니다. 옮기려면 --write (「교재 코드파일/숨김/」 에 냅니다).');
    console.log('     도로 미주로 꺼내려면 --back 을 같이 줍니다.\n');
    process.exit(0);
  }

  console.log('');
  let 총 = 0;
  for (const f of 파일들) {
    /* ⚠ 낸 파일을 교재 폴더에 나란히 두면 훑기가 같은 교재를 두 벌 읽는다 — 하위 폴더로. */
    const out = OUT || path.join(path.dirname(f), 되돌리기 ? '미주로' : '숨김', path.basename(f));
    fs.mkdirSync(path.dirname(out), { recursive: true });
    try {
      const r = 옮긴다(f, out, { 되돌리기 });
      총 += r.옮김;
      console.log('  ✅ ' + path.basename(out).replace(/^.*\]/, '')
        + '   옮김 ' + r.옮김 + ' · 문항 ' + r.문항 + '제 · 코드 읽히는 것 ' + r.코드있음
        + (r.못찾음 ? '   🔴 자리를 못 찾은 것 ' + r.못찾음 : ''));
    } catch (e) {
      console.log('  🔴 ' + path.basename(f).replace(/^.*\]/, '') + ' — ' + e.message);
    }
  }
  console.log('\n  모두 ' + 총 + '개를 옮겼습니다. 🔵 원본은 한 글자도 안 고쳤습니다.');
  if (!되돌리기) {
    console.log('  ▶ 🙋 **한글로 한 번 열었다 저장해 주세요.** 그러고 나서 이렇게 재면');
    console.log('       설명문이 살아남았는지 알 수 있습니다:');
    console.log('       node tools/item-code-hide.mjs "그 파일.hwpx" --check\n');
  } else console.log('');
}
