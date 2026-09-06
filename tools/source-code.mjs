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

/* 🔴 **교재의 문항 번호는 «단원마다 1부터»가 아니다** (2026-09-06 · 사용자가 「번호는 잘못
   말해준 것 같아」라고 해서 찾았다. 내가 단원마다 1부터 세어 **전부 틀린 번호를 댔다**).
   한글은 미주 번호를 `<hp:endNotePr><hp:numbering type="ON_SECTION" newNum="N">` 로 정한다.
   실측: 01→1 · 02→**72** · 03→**153** · 04→**288** · 05→**385**. 71+81+135+97+87=471 로 딱 이어진다.
   즉 **한 권으로 이어 매긴 번호**다 — 그것이 교재에 `72)` `73)` 으로 찍힌다.
   ⚠ 안 적혀 있으면 1부터다. 사람에게 번호를 댈 때는 반드시 이것을 더할 것 —
     **틀린 번호는 «없는 번호»보다 나쁘다. 사용자가 엉뚱한 문항을 고치러 간다.** */
function 미주시작번호(tmp) {
  for (const f of fs.readdirSync(path.join(tmp, 'Contents')).filter((x) => /^section\d+\.xml$/.test(x)).sort()) {
    const s = fs.readFileSync(path.join(tmp, 'Contents', f), 'utf8');
    for (const m of s.matchAll(/<hp:endNotePr>[\s\S]*?<\/hp:endNotePr>/g)) {
      const n = m[0].match(/<hp:numbering type="ON_SECTION" newNum="(\d+)"/);
      if (n) return +n[1];
    }
  }
  return 1;
}

// ── 읽는다 ────────────────────────────────────────────────────────────
const R = loadHwpxRules();
/* ⚠ 문서는 «한 번만» 읽는다 — 아래 진단이 같은 것을 다시 쓴다(다시 풀면 4MB 를 또 읽는다). */
const 문서 = sectionDocs(SRC);
const 뽑은것 = R.hwpxSourceBadges(문서, 해시of);
const r = R.hwpxMakeSourceCodes(뽑은것);

console.log(`\n  ${이름}`);
console.log(`  단원 ${CHAPTER} 「${단원이름}」 · 과목 ${SUBJECT}`);
/* 🔴 **까닭을 말하기 «전»에 터지고 있었다** (2026-09-06 · 03·04·05 를 돌려 보다 겪었다).
   `hwpxMakeSourceCodes` 는 «못 냈을 때» `셈` 을 안 돌려준다. 그런데 여기서 `r.셈` 을
   먼저 찍는 바람에 **TypeError 로 죽어서 아래의 「멈춘다 — 까닭」이 영영 안 나왔다.**
   → 언제나 있는 `뽑은것.셈` 을 쓴다. **까닭을 말하는 코드가 까닭 때문에 죽으면 안 된다.** */
console.log(`  미주 ${뽑은것.셈.미주} · 출처 ${뽑은것.셈.출처} · 딱지 ${뽑은것.셈.딱지}`);

if (!r.ok) {
  console.error('\n🔴 멈춘다 — 장부를 안 낸다.');
  for (const 흠 of r.흠) console.error('   ' + 흠);
  /* 🔵 **«어디»인지 짚어 준다** (2026-09-06 · 04·05 를 손으로 파 보고 나서 넣었다).
     셈만 말하면 「132 대 135」밖에 안 나온다 — 사람은 «어느 문항»인지 알아야 고칠 수 있다.
     미주 하나를 한 덩이로 보고, 그 덩이 안의 출처·딱지를 세어 어긋난 자리를 이웃과 함께 보인다.
     ⚠ 출처 글은 있는데 «못 읽은» 것도 흠이다(`?` 로 보인다) — 1994년 것이 그래서 막혔었다. */
  const 토큰 = [];
  {
    const paras = [];
    for (const d of 문서) { const sec = d.documentElement; if (!sec) continue;
      for (const n of Array.from(sec.childNodes)) if (n.nodeType === 1 && n.localName === 'p') paras.push(n); }
    R.hwpWalkParagraphs(paras, 토큰);
  }
  const 덩이 = [];
  {
    let 지금 = null;
    for (const t of 토큰) {
      if (t.type === 'endnote') { 지금 = { n: 덩이.length + 1, 출처: [], 딱지: [], 글: '' }; 덩이.push(지금); continue; }
      if (!지금) continue;
      if (t.type === 'srctag') { const v = R.hwpxParseSourceTag(t.v); 지금.출처.push(v ? v.년 + '-' + v.월 + '-' + v.번 : '?' + String(t.v).trim()); continue; }
      if (t.type === 'pic') { const b = { '264bb508409ed2736d541bc9f3d3e4e6':'OR', '22c12a6ee18385db377145fca66266b1':'NC',
        'df0ac81572f0612dd9dee9aa0101679f':'UP', 'ba6e591c3e08ac6725ef1b7e6d9e33b5':'DW' }[해시of(t.v)]; if (b) 지금.딱지.push(b); continue; }
      if (t.type === 'text' && 지금.글.length < 60) 지금.글 += t.v;
    }
  }
  const 시작 = 미주시작번호(tmp);
  const 줄 = (x) => '     교재 ' + String(x.n + 시작 - 1).padStart(3) + '번 · 출처 ' + JSON.stringify(x.출처)
    + ' · 딱지 ' + JSON.stringify(x.딱지) + ' · ' + x.글.replace(/\s+/g, ' ').slice(0, 46);
  const 짝틀림 = 덩이.filter((x) => x.출처.length !== 1 || x.딱지.length !== 1 || String(x.출처[0]).startsWith('?'));
  if (짝틀림.length) {
    console.error('\n   ── 출처나 딱지가 «하나»가 아닌 덩이 ' + 짝틀림.length + '개');
    for (const x of 짝틀림.slice(0, 12)) console.error(줄(x));
  }
  const 묶음 = {};
  for (const x of 덩이) if (x.출처.length === 1 && x.딱지.length === 1 && !String(x.출처[0]).startsWith('?'))
    (묶음[x.출처[0]] = 묶음[x.출처[0]] || []).push(x);
  const 안맞음 = Object.entries(묶음).filter(([, v]) => v.filter((y) => y.딱지[0] === 'OR').length !== 1);
  if (안맞음.length) {
    console.error('\n   ── 원본(OR)이 하나가 아닌 출처 묶음 ' + 안맞음.length + '개 (앞뒤 덩이도 같이 보인다)');
    for (const [k, v] of 안맞음.slice(0, 6)) {
      console.error('     [' + k + '] → ' + v.map((y) => y.딱지[0]).join(','));
      const 앞뒤 = new Set(v.flatMap((y) => [y.n - 1, y.n, y.n + 1]));
      for (const n of [...앞뒤].sort((a, b) => a - b)) if (덩이[n - 1]) console.error(줄(덩이[n - 1]));
    }
    console.error('\n   🔵 본문이 «같은데» 출처만 다르면 교재의 출처 표기가 어긋난 것이다.');
    console.error('      본문이 다르면 그 기출의 원본이 교재에 안 실린 것이다 — 어느 쪽인지는 사람이 봐야 한다.');
  }
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
