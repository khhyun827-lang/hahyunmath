// 개체 설명문에서 «사람 이름»을 지운다 (2026-09-10 · 사용자 요청)
//
//   node tools/comment-scrub.mjs                      ← 재보기만 한다(아무것도 안 고친다)
//   node tools/comment-scrub.mjs --write              ← 「교재 코드파일」 전부를 «새 파일»로 낸다
//   node tools/comment-scrub.mjs <파일.hwpx> --out <새파일.hwpx>
//   node tools/comment-scrub.mjs … --also "지울 말"   ← 이름 말고 더 지울 것
//
// ── 왜 ────────────────────────────────────────────────────────────────
// 개체 설명문(`<hp:shapeComment>`)은 **화면에도 인쇄에도 안 보이지만 파일에는 남는다.**
// 거기에 사람 이름이 들어 있었고, 나눠 주는 교재에 그대로 딸려 가고 있었다.
// 🔴 **처음엔 5곳으로 알았는데 재 보니 2,195곳이었다** (2026-09-10). 01단원만 5곳이라
//    그렇게 보였다 — 02단원 582 · 03단원 1,592 · 04단원 12 · 05단원 4.
//
// ── 🔴 지우는 방식 — «비운다», 걷어내지 않는다 ─────────────────────────
// `<hp:shapeComment>장은영</hp:shapeComment>` → `<hp:shapeComment></hp:shapeComment>`
// 태그를 통째로 걷어내면 한글이 그 개체를 어떻게 읽을지 이 파일로는 증명이 안 된다.
// **비우는 것은 «설명문이 없는 개체»와 같은 상태**라 위험이 적다. 값이 같으면 덜 손대는 쪽.
//
// 🔴 **원본은 한 글자도 안 고친다.** 언제나 새 파일로 낸다 (item-code-stamp.mjs 와 같은 규칙).
// 🔴 **고치고 나서 «본문이 그대로인지» 스스로 잰다** — 설명문을 건드려 문항 글이 달라지면
//    창고 대조가 통째로 「고쳤다」로 뜬다. 그래서 낸 파일을 다시 읽어 원본과 맞대 보고,
//    한 글자라도 다르면 **낸 파일을 지우고 멈춘다.**

import fs from 'fs';
import path from 'path';
import { 푼다, 섹션들, 묶는다 } from './hwpx-zip.mjs';
import { loadHwpxRules, problemsFromHwpx } from './hwpx-node.mjs';
import { fileURLToPath } from 'url';

/* 지울 말 — 여기 있는 «설명문 전체»가 이 글자와 같을 때만 지운다.
   ⚠ 부분 일치로 지우지 않는다. 「그림입니다. … 장은영이네.png …」 같은 것을 잘못 건드린다. */
export const 지울말 = ['장은영'];

/* 파일 하나를 훑는다. 고치지 않는다. */
export function 훑는다(src, 더 = []) {
  const { cdir } = 푼다(src);
  const 셈 = new Map();
  for (const s of 섹션들(cdir)) {
    const xml = fs.readFileSync(s, 'utf8');
    for (const m of xml.matchAll(/<hp:shapeComment>([\s\S]*?)<\/hp:shapeComment>/g)) {
      const v = m[1].trim();
      셈.set(v, (셈.get(v) || 0) + 1);
    }
  }
  const 지울것 = 지울말.concat(더);
  let 지울수 = 0;
  for (const [v, n] of 셈) if (지울것.includes(v)) 지울수 += n;
  return { 셈, 지울수 };
}

/* 파일 하나를 고쳐 새 파일로 낸다. 돌려주는 것은 «지운 수». */
export function 지운다(src, out, 더 = []) {
  if (fs.existsSync(out)) throw new Error('이미 있는 파일입니다 — ' + out);
  const { cdir, tmp } = 푼다(src);
  const 지울것 = 지울말.concat(더);
  let 지움 = 0;
  for (const s of 섹션들(cdir)) {
    const xml = fs.readFileSync(s, 'utf8');
    const 새 = xml.replace(/<hp:shapeComment>([\s\S]*?)<\/hp:shapeComment>/g, (m, v) => {
      if (!지울것.includes(v.trim())) return m;
      지움++;
      return '<hp:shapeComment></hp:shapeComment>';
    });
    if (새 !== xml) fs.writeFileSync(s, 새);
  }
  묶는다(tmp, out);

  /* 🔴 **낸 파일을 다시 읽어 본문이 한 글자도 안 달라졌는지 잰다.**
     설명문을 건드려 문항 글이 흔들리면 창고 대조가 564제를 통째로 「고쳤다」로 뜬다.
     그러면 이 일이 «이름 지우기»가 아니라 «창고 갈아엎기»가 된다. */
  const rules = loadHwpxRules();
  const 앞 = problemsFromHwpx(src, rules).problems;
  const 뒤 = problemsFromHwpx(out, rules).problems;
  const 같나 = 앞.length === 뒤.length
    && 앞.every((p, i) => (p.content || '') === (뒤[i].content || '') && (p.itemCode || '') === (뒤[i].itemCode || ''));
  if (!같나) {
    fs.unlinkSync(out);
    throw new Error('멈췄습니다 — 지우고 나니 본문이나 코드가 달라졌습니다 (' + 앞.length + '제 → ' + 뒤.length + '제). 낸 파일은 지웠습니다.');
  }
  return { 지움, 문항: 앞.length };
}

/* ── 여기서부터 CLI ──────────────────────────────────────────────── */
const 나를직접부름 = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (나를직접부름) {
  const argv = process.argv.slice(2);
  const 쓸까 = argv.includes('--write');
  const oi = argv.indexOf('--out');
  const OUT = oi >= 0 ? argv[oi + 1] : '';
  const 더 = [];
  for (let i = 0; i < argv.length; i++) if (argv[i] === '--also' && argv[i + 1]) 더.push(argv[i + 1]);
  const 준파일 = argv.filter((a, i) => !a.startsWith('--') && !(i > 0 && ['--out', '--also'].includes(argv[i - 1])));

  const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const 폴더 = path.join(ROOT, '교재 코드파일');
  const 파일들 = 준파일.length ? 준파일
    : fs.readdirSync(폴더).filter((x) => x.endsWith('.hwpx')).sort().map((x) => path.join(폴더, x));

  console.log('\n개체 설명문 — 안 보이지만 파일에 남는 자리');
  const 전체 = new Map();
  for (const f of 파일들) {
    const { 셈, 지울수 } = 훑는다(f, 더);
    let 합 = 0; for (const n of 셈.values()) 합 += n;
    for (const [v, n] of 셈) 전체.set(v, (전체.get(v) || 0) + n);
    console.log('  ' + path.basename(f).replace(/^.*\]/, '').padEnd(24)
      + '설명문 ' + String(합).padStart(6) + '개' + (지울수 ? '   🔴 지울 것 ' + 지울수 : '   ✅ 지울 것 없음'));
  }
  console.log('\n무엇이 들어 있나 (많은 차례로)');
  for (const [v, n] of [...전체].sort((a, b) => b[1] - a[1]).slice(0, 8)) {
    const 표 = 지울말.concat(더).includes(v) ? '🔴 지운다  ' : '           ';
    console.log('  ' + 표 + String(n).padStart(6) + '회  「' + v.replace(/\s+/g, ' ').slice(0, 56) + '」');
  }

  if (!쓸까 && !OUT) {
    console.log('\n  ⓘ 재보기만 했습니다. 실제로 지우려면 --write (원본 옆에 «_이름지움.hwpx» 로 냅니다).\n');
    process.exit(0);
  }
  console.log('');
  let 총지움 = 0;
  for (const f of 파일들) {
    /* 🔴 **낸 파일을 교재 폴더에 나란히 두면 안 된다** (2026-09-10에 밟았다).
       `store-diff`·`items-push` 는 그 폴더의 `*.hwpx` 를 «전부» 읽는다 — 나란히 두면
       같은 교재를 두 벌 읽어 **564제가 1,128제가 되고 코드가 통째로 «복사됨»으로 뜬다.**
       그래서 하위 폴더로 낸다. 그 폴더는 훑기에 안 걸린다(한 겹만 읽는다). */
    const out = OUT || path.join(path.dirname(f), '이름지움', path.basename(f));
    fs.mkdirSync(path.dirname(out), { recursive: true });
    try {
      const { 지움, 문항 } = 지운다(f, out, 더);
      총지움 += 지움;
      console.log('  ✅ ' + path.basename(out).replace(/^.*\]/, '') + '   지움 ' + 지움 + ' · 문항 ' + 문항 + '제 그대로');
    } catch (e) {
      console.log('  🔴 ' + path.basename(f).replace(/^.*\]/, '') + ' — ' + e.message);
    }
  }
  console.log('\n  모두 ' + 총지움 + '곳을 지웠습니다. 🔵 원본은 한 글자도 안 고쳤습니다.');
  console.log('  ▶ 한글로 열어 보시고 괜찮으면 원본을 새 파일로 갈아 주세요.\n');
}
