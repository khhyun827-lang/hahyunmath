// 문항 코드 — 파일에 심기 (2026-09-02)
//
//   node tools/item-code-stamp.mjs <원본.hwpx> <매핑표.json> --out <새파일.hwpx>
//
// 미주 **맨 앞**에 `[K2-E-01-0001|a3f91c7e]` 을 넣는다. 미주 번호 바로 뒤, 「[정답]」 앞자리다.
// 파이프 뒤는 **지문** — 그때 그 본문의 해시 앞 8자리다. 선생님들이 문제 틀을 복사해도
// 그것으로 «복사본»을 알아본다 → docs/코드-숨기기.md · `--no-fp` 로 끌 수 있다.
//
// 🔴 **원본을 고치지 않는다.** 언제나 새 파일로 낸다. --out 이 이미 있으면 멈춘다.
//
// ── 왜 한글(COM)로 타이핑하지 않고 XML 을 고치는가 ──────────────────────
// project2 노트의 「한글이 튕긴다 — id·instid 가 겹쳐서」는 **표를 복제할 때** 나는 일이다.
// 여기서 하는 것은 «글자 한 조각을 더하는 것»이라 새 개체가 안 생기고, 그래서 그 함정이 없다.
// 반대로 COM 으로 미주 76 개를 하나씩 찾아 들어가는 쪽이 훨씬 미끄럽다.
// **대신 한글이 있으면 결과를 한글로 열어 확인한다** — 그게 진짜 검사다.
//
// ⚠ 두 번 돌려도 두 번 안 박힌다 (이미 있으면 건너뛴다).

import fs from 'fs';
import path from 'path';
/* 풀고 묶는 일은 지문 도구와 똑같아서 한곳으로 뺐다 (2026-09-09) → tools/hwpx-zip.mjs */
import { 푼다, 섹션들, 묶는다 } from './hwpx-zip.mjs';

const argv = process.argv.slice(2);
const bare = argv.filter((a, i) => !a.startsWith('--') && !(i > 0 && ['--out', '--chapter', '--bodies'].includes(argv[i - 1])));
const [SRC, MAP] = bare;
const oi = argv.indexOf('--out');
const OUT = oi >= 0 ? argv[oi + 1] : '';
const ci = argv.indexOf('--chapter');
const CHAPTER = ci >= 0 ? argv[ci + 1] : '';
const bi = argv.indexOf('--bodies');
/* 🔵 **코드를 심는 «그 자리»에서 본문도 같이 낸다** (2026-09-05 · 사용자 요청).
   「원본 교재를 추후에 업로드하는 게 아니라 코드 삽입할 때 같이 저장하고 싶다」.
   심고 난 파일에는 미주에 코드가 들어 있으므로, 그것을 그대로 읽으면 코드와 본문이 짝지어진다.
   ⚠ 뽑는 규칙은 여기 없다 — 웹과 같은 `hwpx.js` 를 쓴다 (tools/item-bodies.mjs 참고). */
const BODIES = bi >= 0 && argv[bi + 1] && !argv[bi + 1].startsWith('--') ? argv[bi + 1] : (bi >= 0 ? '' : null);
const PUSH = argv.includes('--push');

if (!SRC || !MAP || !OUT || !CHAPTER) {
  console.error('쓰는 법: node tools/item-code-stamp.mjs <원본.hwpx> <장부.json> --chapter 01 --out <새파일.hwpx>');
  console.error('  [--bodies 본문.json] [--push]  코드를 심은 김에 원본 본문까지 낸다 (--push 면 Firestore items 로 바로).');
  console.error('  ⚠ 장부에는 여러 단원이 들어 있다. --chapter 로 «이 파일의 단원»을 골라야 한다.');
  process.exit(1);
}
if (fs.existsSync(OUT)) {
  console.error(`멈춘다 — 「${OUT}」 이 이미 있다. 덮어쓰지 않는다.`);
  process.exit(1);
}

// ⚠ 장부는 (과목·책) 하나에 한 파일이고 **여러 단원이 섞여 있다.**
//   이 파일에 해당하는 단원만 골라야 한다. 안 고르면 코드가 통째로 밀려 박힌다.
const mapping = JSON.parse(fs.readFileSync(MAP, 'utf8'));
const mine = mapping.items.filter((i) => i.chapter === CHAPTER).sort((a, b) => a.seq - b.seq);
if (!mine.length) {
  console.error(`멈춘다 — 장부에 ${CHAPTER} 단원이 없다. 있는 단원: ${(mapping.chapters || []).join(', ') || '(없음)'}`);
  process.exit(2);
}
const codes = mine.map((i) => i.code);

// ── 푼다 (언제나 임시 폴더. 원본 옆에 아무것도 안 남긴다) ────────────────
const { tmp, cdir } = 푼다(SRC);

// ── 미주 첫 문단 맨 앞에 코드를 꽂는다 ─────────────────────────────────
// ⚠ 첫 run 안에는 미주 번호를 찍는 <hp:autoNum> ctrl 이 들어 있다.
//   그 **뒤에** 넣어야 번호가 앞에 남는다. 앞에 넣으면 번호가 코드 뒤로 밀린다.
//   (build.mjs 의 AUTONUM 주석이 말하는 그 자리다.)
function stampNote(noteXml, code) {
  if (noteXml.includes(`<hp:t>[${code}]`)) return { xml: noteXml, done: false, why: '이미 있다' };

  const runRe = /<hp:run\b[^>]*>/;
  const rm = noteXml.match(runRe);
  if (!rm) return { xml: noteXml, done: false, why: 'run 을 못 찾았다' };

  let at = rm.index + rm[0].length;
  // autoNum ctrl 이 바로 뒤에 있으면 그것을 건너뛴다
  const after = noteXml.slice(at);
  const ctrl = after.match(/^\s*<hp:ctrl>[\s\S]*?<\/hp:ctrl>/);
  if (ctrl) at += ctrl[0].length;

  // ⚠ 뒤에 공백을 붙이지 않는다 — 원본 미주가 이미 « [정답]» 처럼 공백으로 시작한다.
  //   붙이면 「[코드]  [정답]」 처럼 공백이 둘이 되고, 그건 종이에 그대로 나간다.
  return { xml: noteXml.slice(0, at) + `<hp:t>[${code}]</hp:t>` + noteXml.slice(at), done: true, why: '' };
}

const files = 섹션들(cdir);

let seen = 0, stamped = 0;
const skipped = [];
for (const p of files) {
  let xml = fs.readFileSync(p, 'utf8');
  let out = '', last = 0;
  const re = /<hp:endNote\b[^>]*>[\s\S]*?<\/hp:endNote>/g;
  let m;
  while ((m = re.exec(xml))) {
    const code = codes[seen];
    seen++;
    if (!code) { skipped.push(`${seen}번 — 매핑표에 코드가 없다`); continue; }
    const r = stampNote(m[0], code);
    if (r.done) stamped++; else skipped.push(`${code} — ${r.why}`);
    out += xml.slice(last, m.index) + r.xml;
    last = m.index + m[0].length;
  }
  out += xml.slice(last);
  fs.writeFileSync(p, out, 'utf8');
}

if (seen !== codes.length) {
  console.error(`\n🔴 멈춘다 — 파일의 미주는 ${seen}개인데 매핑표는 ${codes.length}개다.`);
  console.error('   두 수가 같지 않으면 코드가 «엉뚱한 문항»에 박힌다. 아무것도 안 냈다.');
  process.exit(2);
}

// ── 다시 묶는다 ────────────────────────────────────────────────────────
const 파일수 = 묶는다(tmp, OUT);

console.log(`\n  미주 ${seen}개 · 코드를 심은 것 ${stamped}개`);
if (skipped.length) { console.log('  ⚠ 건너뛴 것 ' + skipped.length + '건'); skipped.slice(0, 8).forEach((s) => console.log('     ' + s)); }
console.log(`  냈다 → ${OUT}  (${(fs.statSync(OUT).size / 1024 / 1024).toFixed(2)}MB · 파일 ${파일수}개)`);
console.log(`  원본 「${path.basename(SRC)}」 는 한 글자도 안 고쳤다.\n`);


/* ── 코드를 심었으면 «지문»도 이어서 박는다 (2026-09-09) ──────────────
   지문은 본문에서 뜨는데, 본문을 문항별로 가르려면 **미주에 코드가 이미 있어야** 한다.
   그래서 차례가 있다 — 코드를 심고(위) → 그 파일을 읽어 본문을 얻고 → 지문을 박는다.
   ⚠ 같은 자리에 도로 놓는다. OUT 은 방금 우리가 낸 파일이라 덮어도 원본이 안 다친다.
   🔴 `--no-fp` 로 끌 수 있다 — 지문 없는 옛 꼴 그대로 내야 할 일이 있을 때만. */
if (!argv.includes('--no-fp')) {
  const { stampFingerprints } = await import('./item-fp-stamp.mjs');
  const 잠깐 = OUT + '.fp.tmp';
  const s = stampFingerprints(OUT, 잠깐);
  fs.rmSync(OUT); fs.renameSync(잠깐, OUT);
  console.log(`  지문        문항 ${s.문항수}개 중 ${s.박음}개에 박았다`);
  if (s.본문없음.length) console.log(`  ⚠ 본문이 비어 지문을 못 준 문항 ${s.본문없음.length}개: ${s.본문없음.slice(0, 5).join(' ')}`);
  console.log('');
}

/* ── 코드를 심었으면 본문도 같이 낸다 ────────────────────────────────
   ⚠ **심은 파일(OUT)에서 읽는다.** 원본에서 읽으면 미주에 코드가 없어 짝을 못 짓는다. */
if (BODIES !== null || PUSH) {
  const { emitBodies } = await import('./item-bodies.mjs');
  await emitBodies(OUT, BODIES || '', PUSH);
}