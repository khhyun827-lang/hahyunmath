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
const ledger = {
  subject: SUBJECT, book: 'J', kind: 'source', chapter: CHAPTER, chapterName: 단원이름,
  source: path.basename(SRC), updatedAt: new Date().toISOString(),
  count: r.codes.length, chapters: [CHAPTER],
  items: r.것들.map((x, i) => ({
    seq: i + 1, chapter: CHAPTER, code: r.codes[i],
    origin: r.codes[i].slice(0, 7), badge: x.딱지들[0],
    year: x.출처.년, month: x.출처.월, no: x.출처.번,
  })),
};
fs.writeFileSync(OUT, JSON.stringify(ledger, null, 2), 'utf8');
console.log(`\n  장부: ${OUT} (${ledger.count}제)\n`);
