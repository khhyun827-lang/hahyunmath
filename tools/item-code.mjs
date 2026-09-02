// 문항 코드 — 읽고 매기기 (1단계 · 2026-09-02)
//
// hwpx 를 읽어 문항을 가르고, 문항마다 코드를 매겨 «매핑표»를 낸다.
// 🔴 **이 도구는 원본을 한 글자도 안 고친다.** 읽고 세고 적을 뿐이다.
//    파일에 코드를 심는 것은 다음 단계고, 그 전에 이 표를 눈으로 봐야 한다.
//
//   node tools/item-code.mjs <파일.hwpx | 풀린폴더> --subject K2 --book E --chapter 01
//        [--start 1] [--out 매핑표.json]
//
// ── 코드 생김새 ────────────────────────────────────────────────────────
//   K2 - E - 01 - 0001 - N01
//   │    │    │     │     └ 변형 (N 숫자 · U 상향 · D 하향).  원본에는 없다
//   │    │    │     └ 일련번호. **뜻이 없다** — 한 번 매기면 안 바꾼다
//   │    │    └ 단원
//   │    └ 어느 책 (S 학교기출 · E 엔딩크레딧 · D 동그랑땡 · R 복습테스트)
//   └ 과목 (K1 K2 AL C1 C2 PS GE)
//
// ⚠ **일련번호를 «교재에 실린 순서»로 다시 뽑지 않는다.** 문항 하나를 빼면 뒤가 전부 밀린다
//   (project2 노트: 「문항을 빼거나 SCENE 을 옮기면 번호가 전부 밀린다」).
//   처음 한 번만 순서대로 매기고, 그 뒤로는 이 매핑표가 진실이다.
//   그래서 --out 으로 나온 파일을 **반드시 보관**해야 한다.

import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFileSync } from 'child_process';

// ── 인자 ──────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const src = argv.find((a) => !a.startsWith('--'));
function opt(name, dflt) {
  const i = argv.indexOf('--' + name);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : dflt;
}
const SUBJECT = opt('subject', '');
const BOOK    = opt('book', '');
const CHAPTER = opt('chapter', '');
const START   = parseInt(opt('start', '1'), 10);
const OUT     = opt('out', '');

if (!src || !SUBJECT || !BOOK || !CHAPTER) {
  console.error('쓰는 법: node tools/item-code.mjs <파일.hwpx|폴더> --subject K2 --book E --chapter 01 [--start 1] [--out 표.json]');
  process.exit(1);
}

// ── hwpx 는 ZIP 이다. 폴더를 주면 그대로 쓰고, 파일을 주면 임시로 푼다 ──
// ⚠ 푸는 곳은 언제나 임시 폴더다. 원본 옆에 아무것도 안 남긴다.
function contentsDir(p) {
  if (fs.statSync(p).isDirectory()) return path.join(p, 'Contents');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'itemcode-'));
  execFileSync('unzip', ['-qo', p, '-d', tmp]);
  return path.join(tmp, 'Contents');
}

// ── 문서 차례대로 «미주»와 «출처 딱지»를 줄 세운다 ──────────────────────
// 미주는 문항의 «앞»에 온다 — 그래서 미주 n 부터 미주 n+1 직전까지가 문항 n 이고,
// 그 사이에 나오는 출처 딱지가 문항 n 의 것이다.
// (project2 의 splitProblems 가 쓰는 전제와 같다.)
// ⚠ **교재 이름을 박아 두고 찾으면 안 된다.** 처음에 넷(유형반복R·올림포스·절대등급·고쟁이)만
//   박아 두고 훑었더니 `[올유]`(올림포스 유형편의 줄임) 14건과 `[자작]` 2건 · `[퍼옴]` 1건이
//   통째로 «출처 없음»으로 잡혀, **있지도 않은 흠 17건을 보고했다.**
//   그래서 지금은 **딱지를 생김새로 읽는다** — 미주 바로 뒤의 `[…]` 한 조각.
//   그리고 **모르는 딱지는 조용히 버리지 않고 보고한다.** 버리면 같은 사고가 또 난다.
const LABEL_RE = /^\[([^\]]{1,20})\]$/;

// 줄여 적은 딱지를 제 이름으로 편다. 여기 없는 것은 딱지 글자 그대로 쓴다.
// ⚠ 같은 책을 단원마다 다르게 적어 놨다 — 01~03 은 `[올유]`, 04 는 `올림포스`.
//   둘 다 **올림포스 유형편**이다 (사용자 확인, 2026-09-03). 장부에서 한 이름으로 모은다.
//   안 모으면 「올림포스 유형편 85제」가 「올유 71 + 올림포스 38」로 갈려 보인다.
const BOOK_NAME = {
  '올유': '올림포스 유형편',
  '올림포스': '올림포스 유형편',
  '자작': '제작',
};
// 대괄호를 쓰지만 «출처가 아닌» 딱지. 이것까지 세면 한 문항에 출처가 둘로 보인다.
const NOT_SOURCE = new Set(['보기', '다른 풀이', '정답', '참고']);

function textOf(xml) {
  return [...xml.matchAll(/<hp:t(?:\s[^>]*)?>([\s\S]*?)<\/hp:t>/g)]
    .map((m) => m[1].replace(/<[^>]*>/g, ''))
    .join('');
}
function unesc(s) {
  return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
}

function scan(cdir) {
  const files = fs.readdirSync(cdir)
    .filter((f) => /^section\d+\.xml$/.test(f))
    .sort((a, b) => (+a.match(/\d+/)[0]) - (+b.match(/\d+/)[0]));

  const toks = [];
  // ⚠ 「SCENE」 과 그 번호는 **다른 run** 에 있다 (`<SCENE ><1>`).
  //   한 조각만 보고 적으면 번호 없이 「SCENE」 이라고만 적히는데,
  //   그러면 모든 문항이 같은 SCENE 으로 보고돼 «틀린 표»가 나간다.
  //   그래서 SCENE 을 만나면 **다음 글자 조각에서 숫자를 받아** 온다.
  let wantSceneNo = false;
  let prevText = '';                 // 바로 앞에 온 글자 조각 — «판 B» 의 출처가 여기 있다
  for (const f of files) {
    const xml = fs.readFileSync(path.join(cdir, f), 'utf8');
    // 미주 한 덩어리, 또는 글자 한 조각. 문서에 놓인 차례 그대로 훑는다.
    const re = /<hp:endNote\b[^>]*>[\s\S]*?<\/hp:endNote>|<hp:t(?:\s[^>]*)?>([\s\S]*?)<\/hp:t>/g;
    let m;
    while ((m = re.exec(xml))) {
      if (m[0].startsWith('<hp:endNote')) {
        toks.push({ k: 'NOTE', v: unesc(textOf(m[0])), before: prevText, file: f });
        wantSceneNo = false;
        prevText = '';
        continue;
      }
      const s = unesc(m[1].replace(/<[^>]*>/g, ''));
      if (!s.trim()) continue;
      if (wantSceneNo) {
        wantSceneNo = false;
        const d = s.trim().match(/^(\d)/);
        if (d) { toks.push({ k: 'SCENE', v: 'SCENE ' + d[1] }); prevText = s.trim(); continue; }
      }
      const lab = s.trim().match(LABEL_RE);
      if (lab) {
        const name = lab[1].trim();
        if (!NOT_SOURCE.has(name)) toks.push({ k: 'SRC', v: name });
        prevText = s.trim();
        continue;
      }
      const inline = s.trim().match(/^SCENE\s*(\d)/i);
      if (inline) { toks.push({ k: 'SCENE', v: 'SCENE ' + inline[1] }); prevText = s.trim(); continue; }
      if (/^\s*SCENE\s*$/i.test(s)) wantSceneNo = true;   // 번호는 다음 조각에 온다
      prevText = s.trim();
    }
  }
  return toks;
}

// ── 미주 속에서 정답을 읽는다 ──────────────────────────────────────────
// 흔한 꼴: " [정답] ②이므로…"  ·  주관식이면 딱지 뒤에 ①~⑤ 가 없다.
// ⚠ 76 개 중 둘이 이 꼴이 아니었다 — 「정답」에 대괄호가 없거나, 딱지 자체가 없다.
//   그런 것은 answer 를 비우고 flag 를 남긴다. 조용히 넘기면 안 된다.
function readAnswer(note) {
  const m = note.match(/\[정답\]\s*([①②③④⑤])?/);
  if (m) return { answer: m[1] || '', kind: m[1] ? '객관식' : '주관식', flag: '' };
  const bare = note.match(/정답\s*([①②③④⑤])?/);
  if (bare) return { answer: bare[1] || '', kind: bare[1] ? '객관식' : '주관식', flag: '대괄호 없음 — 「[정답]」이 아니라 「정답」' };
  const only = note.trim().match(/^([①②③④⑤])/);
  if (only) return { answer: only[1], kind: '객관식', flag: '「[정답]」 딱지가 없다' };
  return { answer: '', kind: '?', flag: '정답을 못 찾았다' };
}

// ── 문항으로 묶는다 ───────────────────────────────────────────────────
// 🔴 **조판이 두 판 있다. 이름 목록을 박아 두지 말고 «자리»로 읽는다.**
//   판 A (01~03 단원) : 미주 → `[유형반복R]`   출처가 미주 **뒤**에, 대괄호를 쓴다
//   판 B (04 단원)    : `유형반복R` → 미주      출처가 미주 **앞**에, 대괄호가 없다
//   두 판을 동시에 보면 안 된다 — B 를 A 로 읽으면 출처가 통째로 한 칸씩 밀린다.
//   그래서 **어느 판인지 세어 보고 정한다.** 짐작하지 않는다.
function toItems(toks) {
  const notes = toks.filter((t) => t.k === 'NOTE');

  // 판 A 로 읽으면 몇 개나 출처가 붙나 — 미주와 다음 미주 사이의 첫 딱지
  let hitA = 0;
  {
    let cur = null;
    for (const t of toks) {
      if (t.k === 'NOTE') { cur = { got: false }; notes.push; continue; }
      if (t.k === 'SRC' && cur && !cur.got) { cur.got = true; hitA++; }
    }
  }
  // 판 B 로 읽으면 몇 개나 붙나 — 미주 «바로 앞» 조각이 짧은 이름꼴인가
  //   (본문 발문은 길고 문장부호가 섞인다. 출처는 짧은 낱말 하나다.)
  const looksName = (s) => !!s && s.length <= 14 && !/[.,?!()①②③④⑤]/.test(s) && !/^\d+$/.test(s);
  const hitB = notes.filter((n) => looksName(n.before)).length;

  const style = hitB > hitA ? 'B' : 'A';

  const items = [];
  let scene = '';
  for (const t of toks) {
    if (t.k === 'SCENE') { scene = t.v; continue; }
    if (t.k === 'NOTE') {
      const src = style === 'B' && looksName(t.before) ? [t.before] : [];
      items.push({ note: t.v, scene, sources: src, file: t.file });
      continue;
    }
    if (t.k === 'SRC' && style === 'A' && items.length) items[items.length - 1].sources.push(t.v);
  }
  return { items, style, hitA, hitB };
}

const cdir = contentsDir(src);
const { items, style, hitA, hitB } = toItems(scan(cdir));

if (!items.length) {
  console.error('미주를 하나도 못 찾았다 — 이 파일은 이 구조가 아니다. 심기 전에 봐야 한다.');
  process.exit(2);
}

// ── 장부를 읽는다 ─────────────────────────────────────────────────────
// 🔴 **번호를 매기는 곳은 한 곳이어야 한다.** 일련번호는 (과목·책)마다 통으로 세고
//   **단원을 가로질러 이어진다.** 단원마다 파일을 따로 두면 두 단원이 각자 0001 을
//   주장하게 되고, 그러면 학생이 단원을 잘못 골라도 «있는 코드»가 되어 조용히 다른 문항이 나온다.
//   그래서 --out 은 (과목·책) 하나에 한 파일이다:  codes/K2-E.json
let ledger = { subject: SUBJECT, book: BOOK, items: [] };
if (OUT && fs.existsSync(OUT)) {
  ledger = JSON.parse(fs.readFileSync(OUT, 'utf8'));
  if (ledger.subject !== SUBJECT || ledger.book !== BOOK) {
    console.error(`멈춘다 — 장부는 ${ledger.subject}-${ledger.book} 인데 ${SUBJECT}-${BOOK} 을 넣으려 한다.`);
    process.exit(2);
  }
  if (ledger.items.some((x) => x.chapter === CHAPTER) && !argv.includes('--replace')) {
    console.error(`멈춘다 — 장부에 ${CHAPTER} 단원이 이미 있다 (${ledger.items.filter((x) => x.chapter === CHAPTER).length}제).`);
    console.error('   다시 매기면 이미 파일에 심은 코드와 어긋난다. 정말 다시 매기려면 --replace 를 준다.');
    process.exit(2);
  }
  if (argv.includes('--replace')) ledger.items = ledger.items.filter((x) => x.chapter !== CHAPTER);
}
// 이어서 매긴다 — 장부에서 제일 큰 번호 다음부터. --start 를 주면 그것을 쓴다.
const maxSeq = ledger.items.reduce((m, x) => Math.max(m, x.seq || 0), 0);
const FROM = argv.includes('--start') ? START : maxSeq + 1;

// ── 코드를 매긴다 ─────────────────────────────────────────────────────
// 자리 차례: 과목 - 단원 - 책 - 일련번호.  학생은 앞 둘을 고르고 뒤 다섯 자만 친다(E0123).
// 단원이 앞에 오면 정렬이 «단원»으로 모인다 — 진도·시험범위·오답이 전부 단원 단위다.
const pad = (n) => String(n).padStart(4, '0');
const rows = items.map((it, i) => {
  const seq = FROM + i;
  const a = readAnswer(it.note);
  return {
    code: `${SUBJECT}-${CHAPTER}-${BOOK}-${pad(seq)}`,
    chapter: CHAPTER,
    seq,
    scene: it.scene,
    answer: a.answer,
    answerKind: a.kind,
    source: it.sources.length
      ? { label: it.sources[0], book: BOOK_NAME[it.sources[0]] || it.sources[0] }
      : { label: '', book: '출처없음' },
    noteHead: it.note.replace(/\s+/g, ' ').trim().slice(0, 40),
    flag: [a.flag, it.sources.length ? '' : '출처 딱지 없음',
           it.sources.length > 1 ? '딱지가 둘 이상: ' + it.sources.join(',') : ''].filter(Boolean).join(' · '),
  };
});

// ── 보고 ──────────────────────────────────────────────────────────────
const noSrc  = rows.filter((r) => !r.source.label);
const flags  = rows.filter((r) => r.flag && r.flag !== '출처 딱지 없음');
// 🔴 **딱지는 «전부» 보여 준다.** 아는 것만 세면 모르는 것이 조용히 사라진다 —
//    실제로 그렇게 `[올유]` 14 건을 «출처 없음»으로 잘못 보고했다.
const byBook = {};
for (const r of rows) {
  const k = r.source.label ? `${r.source.book}${BOOK_NAME[r.source.label] ? ` [${r.source.label}]` : ''}` : '출처없음';
  byBook[k] = (byBook[k] || 0) + 1;
}
const byKind = {};
for (const r of rows) byKind[r.answerKind] = (byKind[r.answerKind] || 0) + 1;

console.log('\n  ' + path.basename(src));
console.log('  ' + '─'.repeat(64));
console.log(`  문항        ${rows.length} 개      ${rows[0].code}  ~  ${rows[rows.length - 1].code}`);
console.log(`  출처        ` + Object.entries(byBook).sort((a, b) => b[1] - a[1])
  .map(([k, v]) => `${k} ${v}`).join('  ·  '));
console.log(`  조판        판 ${style} — ` + (style === 'A' ? '미주 뒤에 [딱지]' : '미주 앞에 이름')
  + `  (A로 읽으면 ${hitA}건 · B로 읽으면 ${hitB}건)`);
console.log(`  정답        ` + Object.entries(byKind).map(([k, v]) => `${k} ${v}`).join('  ·  '));
const scenes = {};
for (const r of rows) if (r.scene) scenes[r.scene] = (scenes[r.scene] || 0) + 1;
if (Object.keys(scenes).length) console.log(`  SCENE       ` + Object.entries(scenes).map(([k, v]) => `${k} ${v}`).join('  ·  '));

if (flags.length) {
  console.log('\n  ⚠ 눈으로 봐야 할 것 ' + flags.length + '건');
  for (const r of flags) console.log(`     ${r.code}  ${r.flag}\n        「${r.noteHead}」`);
}
if (noSrc.length) {
  console.log(`\n  ⚠ 출처 딱지가 없는 문항 ${noSrc.length}건 — 자작이면 그대로 두고, 빠진 것이면 채워야 한다`);
  console.log('     ' + noSrc.map((r) => r.code.split('-').pop()).join(' '));
}

console.log('\n  ' + '─'.repeat(64));
console.log('  처음 열 개');
for (const r of rows.slice(0, 10)) {
  console.log(`    ${r.code}  ${r.source.book.padEnd(11)} ${(r.answer || '·').padEnd(2)} ${r.noteHead}`);
}

if (OUT) {
  ledger.subject = SUBJECT;
  ledger.book = BOOK;
  ledger.items = ledger.items.concat(rows).sort((a, b) => a.seq - b.seq);
  ledger.count = ledger.items.length;
  ledger.updatedAt = new Date().toISOString().slice(0, 10);
  ledger.chapters = [...new Set(ledger.items.map((x) => x.chapter))].sort();
  ledger.files = [...new Set((ledger.files || []).concat(path.basename(src)))];
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(ledger, null, 2), 'utf8');
  console.log(`\n  장부에 적었다 → ${OUT}`);
  console.log(`  장부 전체 : ${ledger.count}제 · 단원 ${ledger.chapters.join(', ')}`);
  console.log('  🔴 이 파일이 코드의 «진실»이다. 보관할 것 — 다음 단원의 번호가 여기서 이어진다.');
}
console.log('\n  원본은 한 글자도 안 고쳤다.\n');
