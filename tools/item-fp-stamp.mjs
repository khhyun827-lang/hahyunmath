// 문항 «지문» — 코드 옆에 박는다. 그리고 **읽을 때마다 다시 박는다** (2026-09-09)
//
//   node tools/item-fp-stamp.mjs <코드심긴.hwpx> --out <새파일.hwpx>
//   node tools/item-fp-stamp.mjs <파일.hwpx> --out <새파일.hwpx> --quiet
//
//   [K2-01-E-0013]            →  [K2-01-E-0013|a3f91c7e]
//   [K2-01-E-0013|(옛 지문)]   →  [K2-01-E-0013|(지금 지문)]
//
// 🔴 **원본을 고치지 않는다.** 언제나 새 파일로 낸다. --out 이 이미 있으면 멈춘다.
//
// ── 왜 «다시» 박는가 ──────────────────────────────────────────────────
// 선생님이 원본을 고치면 파일에 박힌 지문이 낡는다. 그대로 두면 다음에도, 그다음에도
// 「지문 틀림」이 뜬다 — **늘 뜨는 경고는 아무도 안 본다.**
// 창고에 이을 때마다 다시 박아 두면 파일의 지문이 늘 «지난번에 확인한 몸»이고,
// **그 뒤의 고침만** 잡는다. → docs/코드-숨기기.md 2절
//
// ── 왜 코드 심기와 «따로» 하는가 ──────────────────────────────────────
// 지문은 본문에서 뜨는데, 본문을 문항별로 가르려면 **미주에 코드가 이미 있어야** 한다
// (그것이 문항과 코드를 짝지어 주는 유일한 끈이다). 그래서 차례가 있다 —
// ① 코드를 심는다 → ② 그 파일을 읽어 본문을 얻는다 → ③ 지문을 박는다.
// 🔵 덕분에 «이미 심긴 파일»에도 그대로 쓸 수 있다. 다시 박는 일이 곧 이 도구다.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { 푼다, 섹션들, 묶는다 } from './hwpx-zip.mjs';
import { bodiesFromHwpx } from './item-bodies.mjs';
import { 지문 } from './fingerprint.mjs';

/* 파일 하나에 지문을 박아 새 파일로 낸다. 결과를 돌려준다(화면에 찍지 않는다 —
   부르는 쪽이 저마다 다르게 말한다). */
export function stampFingerprints(src, out) {
  if (fs.existsSync(out)) throw new Error(`「${out}」 이 이미 있다. 덮어쓰지 않는다.`);

  /* ① 본문을 얻는다 — 웹과 같은 hwpx.js 를 쓴다. 코드가 붙은 것만 나온다. */
  const { items, endnoteCount } = bodiesFromHwpx(src);
  const 새지문 = new Map();
  const 본문없음 = [];
  for (const it of items) {
    const f = 지문(it.content);
    if (!f) { 본문없음.push(it.code); continue; }   // 빈 본문에는 지문을 안 준다
    새지문.set(it.code, f);
  }

  /* ② 미주의 `[코드]` · `[코드|옛것]` 을 `[코드|지금것]` 으로 갈아 끼운다.
     ⚠ **글자로 갈아 끼운다** — 이 자리는 우리가 심은 것이라 생김새를 안다.
       XML 을 다시 짓지 않으므로 다른 것이 딸려 바뀔 일이 없다.
     ⚠ 코드는 `<hp:t>` 안에 통째로 들어 있다(심을 때 그렇게 넣었다). */
  const { tmp, cdir } = 푼다(src);
  let 박음 = 0, 그대로 = 0, 못찾음 = 0;
  const 바뀐것 = [];
  for (const p of 섹션들(cdir)) {
    const xml = fs.readFileSync(p, 'utf8');
    let 고쳤나 = false;
    const 나온것 = new Set();
    const out2 = xml.replace(
      /\[([A-Z]{1,2}\d?-\d{2}-[A-Z]-\d{4}(?:-[NUD]\d{2})?|[12]\d{6}[AB]?(?:OR|NC|UP|DW)(?:\d{2})?)(?:\|([^\]\s]{0,32}))?\]/g,
      /* 🔴 **함수꼴로 갈아 끼운다.** 바꿔 넣는 글자를 문자열로 주면 `$` 가 특수하게 읽혀
         수식이 든 자리에서 조용히 망가진다 — 이 노트가 여러 번 물린 자리다. */
      (all, code, 옛것) => {
        나온것.add(code);
        const f = 새지문.get(code);
        if (!f) { 못찾음++; return all; }          // 본문을 못 얻은 문항은 그대로 둔다
        if (옛것 === f) { 그대로++; return all; }
        박음++;
        if (옛것) 바뀐것.push({ code, 전: 옛것, 후: f });
        고쳤나 = true;
        return '[' + code + '|' + f + ']';
      });
    if (고쳤나) fs.writeFileSync(p, out2, 'utf8');
  }

  const 파일수 = 묶는다(tmp, out);
  fs.rmSync(tmp, { recursive: true, force: true });
  return { 박음, 그대로, 못찾음, 본문없음, 바뀐것, 문항수: items.length, endnoteCount, 파일수, out };
}

/* 화면에 찍는 말까지 여기서 낸다 — 부르는 쪽이 결과를 해석하지 않게 하려는 것이다. */
export function 지문박기(src, out, { quiet = false } = {}) {
  const r = stampFingerprints(src, out);
  if (quiet) return r;
  console.log(`\n  지문        문항 ${r.문항수}개 중 ${r.박음}개에 박았다`
    + (r.그대로 ? ` · ${r.그대로}개는 이미 맞아서 그대로 뒀다` : ''));
  if (r.바뀐것.length) {
    /* 🔵 **바뀐 것은 이름을 남긴다.** 「몇 개 바뀌었다」만 보면 «왜»를 못 묻는다 —
       지문이 바뀌었다는 것은 그 사이에 누군가 그 문항을 고쳤다는 뜻이다. */
    console.log(`  🔵 지문이 «달라진» 문항 ${r.바뀐것.length}개 — 그 사이에 본문이 고쳐졌다는 뜻이다:`);
    r.바뀐것.slice(0, 8).forEach((x) => console.log(`     ${x.code}  ${x.전} → ${x.후}`));
    if (r.바뀐것.length > 8) console.log(`     … 그리고 ${r.바뀐것.length - 8}개 더`);
  }
  if (r.본문없음.length) console.log(`  ⚠ 본문이 비어 지문을 못 준 문항 ${r.본문없음.length}개: ${r.본문없음.slice(0, 5).join(' ')}`);
  if (r.못찾음) console.log(`  ⚠ 파일에는 있는데 본문을 못 얻은 코드 ${r.못찾음}자리 — 그대로 뒀다`);
  console.log(`  냈다 → ${r.out}  (${(fs.statSync(r.out).size / 1024 / 1024).toFixed(2)}MB · 파일 ${r.파일수}개)`);
  console.log(`  원본 「${path.basename(src)}」 는 한 글자도 안 고쳤다.\n`);
  return r;
}

// ── 혼자 부를 때 ──────────────────────────────────────────────────────
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  const src = argv.find((a, i) => !a.startsWith('--') && !(i > 0 && argv[i - 1] === '--out'));
  const oi = argv.indexOf('--out');
  const out = oi >= 0 ? argv[oi + 1] : '';
  if (!src || !out) {
    console.error('쓰는 법: node tools/item-fp-stamp.mjs <코드심긴.hwpx> --out <새파일.hwpx>');
    console.error('  코드 옆에 «지문»을 박는다. 이미 있으면 지금 본문으로 다시 박는다.');
    process.exit(1);
  }
  지문박기(src, out, { quiet: argv.includes('--quiet') });
}
