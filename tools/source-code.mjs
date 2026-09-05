// 출처 코드 — 읽고 매기기 (모의고사 기출 + 변형 교재 · 2026-09-05)
//
//   node tools/source-code.mjs <파일.hwpx> [--subject K2] [--out 장부.json]
//
// 사용자 요청 — 「교재 자체에 2017년 09월 21번 라고하는 출처가 있어 이를통해서
// 1(학년)17(년)09(월)21(번)OR 이런식으로 코드를 붙이고싶어.」
//
// ── 코드 생김새 ────────────────────────────────────────────────────────
//   1 17 09 21 UP 02
//   │  │  │  │  │  └ 같은 딱지가 둘 이상일 때의 번호. **변형에는 언제나 붙는다**
//   │  │  │  │  └ OR 원본 · NC 숫자변형 · UP 상향 · DW 하향
//   │  │  │  └ 문항 번호      │  └ 시행 월      │ └ 시행 년(두 자리)
//   └ 학년 — **3월 시행이면 2학년, 그 밖은 1학년** (사용자가 정했다)
//
// 🔴 **이 도구는 원본을 한 글자도 안 고친다.** 장부만 낸다.
//    파일에 심는 것은 tools/item-code-stamp.mjs 가 한다 — 그 전에 이 표를 눈으로 봐야 한다.
//
// 🔵 **단원은 파일 이름에서 읽는다** (사용자가 정했다 — 「단원은 파일명따라 가면 될것같아」).
//    `[2026][주기나][1-2중간][1.평면좌표].hwpx` → 단원 01 「평면좌표」
//    ⚠ 못 읽으면 멈춘다. 넘겨짚어서 엉뚱한 단원에 넣지 않는다.
//
// ⚠ 뽑는 규칙은 여기 없다 — 웹과 «같은» hwpx.js 를 쓴다. 규칙이 둘이 되면 어긋난다.

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execFileSync } from 'child_process';
const NL = String.fromCharCode(10);
import { sectionDocs, loadHwpxRules } from './hwpx-node.mjs';

const argv = process.argv.slice(2);
const SRC = argv.find((a) => !a.startsWith('--'));
const 값 = (이름, 기본) => { const i = argv.indexOf(이름); return i >= 0 ? argv[i + 1] : 기본; };
const SUBJECT = 값('--subject', 'K2');
const OUT = 값('--out', '');

if (!SRC) {
  console.error('쓰는 법: node tools/source-code.mjs <파일.hwpx> [--subject K2] [--out 장부.json]');
  process.exit(1);
}

// ── 단원: 파일 이름의 «마지막 대괄호» ──────────────────────────────────
const 이름 = path.basename(SRC).replace(/\.hwpx$/i, '');
const 칸들 = [...이름.matchAll(/\[([^\]]+)\]/g)].map((m) => m[1]);
const 단원칸 = 칸들.map((s) => s.match(/^\s*(\d{1,2})\s*[.·]\s*(.+?)\s*$/)).filter(Boolean).pop();
if (!단원칸) {
  console.error(`🔴 멈춘다 — 파일 이름에서 단원을 못 읽었다: 「${이름}」`);
  console.error('   「[1.평면좌표]」 처럼 «번호.이름» 꼴 칸이 있어야 한다.');
  process.exit(2);
}
const CHAPTER = String(단원칸[1]).padStart(2, '0');
const 단원이름 = 단원칸[2];

/* 🔴 **파일 이름이 우리 단원표와 «맞는지» 대조한다.**
   교재가 매긴 번호와 우리가 매긴 번호가 같다는 보장이 없다 — 지금 맞는 것은 우연일 수 있고,
   어긋나면 **71제가 통째로 엉뚱한 단원에 들어간다.** 조용히 틀리느니 멈춘다.
   ⚠ 단원표는 index.html 에서 «글로 떠 온다» — 표를 둘로 두면 언젠가 갈린다. */
const 표글 = fs.readFileSync('index.html', 'utf8');
const 표 = 표글.slice(표글.indexOf('const UNIT_CHAPTER_DEFS = {'));
const DEFS = new Function(표.slice(0, 표.indexOf(NL + '};') + 3) + ' return UNIT_CHAPTER_DEFS;')();
const 과목이름 = { K1:'공통수학1', K2:'공통수학2', AL:'대수', C1:'미적분Ⅰ', PS:'확률과통계', GE:'기하' }[SUBJECT];
const 우리것 = ((DEFS[과목이름] || []).find(r => r[0] === CHAPTER) || [])[1] || '';
/* 🔴 **백슬래시 하나가 빠져 있었다** (2026-09-06에 잡았다). `[s()·,]` 는 «공백»이 아니라
   **글자 s** 를 지운다. 그래서 띄어쓰기가 다른 단원은 전부 「안 맞는다」로 멈췄다 —
   `직선의방정식` 對 `직선의 방정식`. 01 평면좌표만 띄어쓰기가 없어 **우연히 통과했고**,
   그래서 09-05에는 안 드러났다. 02·03·04 를 돌리는 순간 멈췄을 것이다.
   ⚠ 웹에도 같은 규칙이 있다(`srcChapterFromFileName`) — 둘을 같이 봐야 한다. */
const 다듬 = (s) => String(s).replace(/[\s()·,]/g, '');
if (!우리것) {
  console.error(`🔴 멈춘다 — ${과목이름}에 ${CHAPTER}단원이 없다.`);
  process.exit(2);
}
if (다듬(우리것) !== 다듬(단원이름)) {
  console.error(`🔴 멈춘다 — 단원이 안 맞는다.`);
  console.error(`   파일 이름: ${CHAPTER} 「${단원이름}」`);
  console.error(`   우리 단원표: ${CHAPTER} 「${우리것}」`);
  console.error(`   교재의 번호와 우리 번호가 다르면 문항이 통째로 엉뚱한 단원에 들어간다.`);
  process.exit(2);
}

// ── 그림의 해시 (딱지를 알아보는 유일한 길) ────────────────────────────
// 🔴 참조 이름(image8)에도 shapeComment 에도 기댈 수 없다 — 파일마다 다르고, 넷 다 「번호.png」다.
const tmp = fs.mkdtempSync(path.join(process.env.TEMP || '/tmp', 'srccode-'));
execFileSync('unzip', ['-qo', SRC, '-d', tmp]);
const 해시표 = {};
{
  const rel = path.join(tmp, 'Contents', 'content.hpf');
  const hpf = fs.existsSync(rel) ? fs.readFileSync(rel, 'utf8') : '';
  for (const m of hpf.matchAll(/id="([^"]+)"[^>]*href="([^"]+)"/g)) {
    const f = path.join(tmp, decodeURIComponent(m[2]));
    if (fs.existsSync(f) && fs.statSync(f).isFile())
      해시표[m[1]] = crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex').slice(0, 32);
  }
}
const 해시of = (ref) => 해시표[ref] || '';

// ── 읽는다 ────────────────────────────────────────────────────────────
const R = loadHwpxRules();
const 뽑은것 = R.hwpxSourceBadges(sectionDocs(SRC), 해시of);
const r = R.hwpxMakeSourceCodes(뽑은것);

console.log(`\n  ${이름}`);
console.log(`  단원 ${CHAPTER} 「${단원이름}」 · 과목 ${SUBJECT}`);
console.log(`  미주 ${r.셈.미주} · 출처 ${r.셈.출처} · 딱지 ${r.셈.딱지}`);

if (!r.ok) {
  console.error('\n🔴 멈춘다 — 장부를 안 낸다.');
  for (const 흠 of r.흠) console.error('   ' + 흠);
  process.exit(2);
}

const 셈 = {};
for (const x of r.것들) 셈[x.딱지들[0]] = (셈[x.딱지들[0]] || 0) + 1;
console.log(`  문항 ${r.codes.length}개 · 출처 ${r.묶음수}묶음 · ` +
  Object.entries(셈).map(([k, v]) => `${k}:${v}`).join(' · '));

const 겹침 = r.codes.filter((c, i) => r.codes.indexOf(c) !== i);
if (겹침.length) {
  console.error(`\n🔴 멈춘다 — 코드가 겹친다: ${[...new Set(겹침)].join(' ')}`);
  process.exit(2);
}
console.log('  겹치는 코드 없음 ✓\n');
r.codes.slice(0, 8).forEach((c, i) => console.log('    ' + c + (i === 7 ? ' …' : '')));

if (!OUT) { console.log('\n  (--out 을 안 줘서 장부는 안 냈다)\n'); process.exit(0); }

// ── 장부 ──────────────────────────────────────────────────────────────
// ⚠ 심는 도구(item-code-stamp.mjs)가 `chapter` 로 거르고 `seq` 로 줄 세운다. 그 꼴을 그대로 따른다.
/* 🔵 **창고 장부와 «같은 꼴»로 낸다** (사용자가 정했다 — 「같이담긴하지만 모의고사
   기출을 필터링할수 있으면 좋겠어」). 창고 화면은 `source.book` 으로 거르는 줄을 이미
   그리고 있으므로, 책 이름을 「모의고사 기출」로 적어 두면 **거르개가 공짜로 생긴다.**
   ⚠ 코드에 과목·단원 자리가 없다 — 그래서 항목마다 적어 준다. 화면이 짐작하지 않게.
   ⚠ `book: 'J'` 는 장부 이름표일 뿐 코드에는 안 들어간다 (코드는 기출 번호가 정한다). */
const 책이름 = '모의고사 기출';
const ledger = {
  subject: SUBJECT, book: 'J', kind: 'source',
  chapterName: 단원이름, sourceFile: path.basename(SRC),
  updatedAt: new Date().toISOString().slice(0, 10),
  count: r.codes.length, chapters: [CHAPTER],
  items: r.것들.map((x, i) => ({
    code: r.codes[i], chapter: CHAPTER, chapterName: 단원이름, subject: SUBJECT, seq: i + 1,
    badge: x.딱지들[0], origin: r.codes[i].slice(0, 7) + 'OR',
    source: { book: 책이름,
              label: (+x.출처.년 <= 30 ? 2000 : 1900) + +x.출처.년 + '년 ' + x.출처.월 + '월 ' + (+x.출처.번) + '번' },
  })),
};
fs.writeFileSync(OUT, JSON.stringify(ledger, null, 2), 'utf8');
console.log(`\n  장부: ${OUT} (${ledger.count}제)\n`);
