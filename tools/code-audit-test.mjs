// 코드·지문 검사 — **망가뜨려 무는지** 본다 (2026-09-09)
//
//   node tools/code-audit-test.mjs [교재.hwpx]
//   (안 주면 「교재 코드파일」의 01단원을 쓴다)
//
// 🔴 **통과만 보면 안 된다.** 이 노트가 하루에 세 번 넘어진 자리가 「검사 통과를 봤다로 읽었다」다.
//    그래서 여기서는 **일부러 망가뜨린 파일 다섯 벌**을 만들어, 검사가 그걸 무는지를 센다.
//    안 무는 검사는 있으나 마나다.
//
// 재는 것 여섯:
//   ① 옛 파일(지문 없음)   → 못 가림 76 · 경보 0        «없음»을 «틀림»으로 뭉개지 않는가
//   ② 지문을 박은 파일      → 그대로 76 · 경보 0        묶었다 풀어도 지문이 살아남는가
//   ③ 본문을 한 글자 고침   → 고쳤다 1 · 복사 0         고침을 «복사»라 부르지 않는가
//   ④ 코드를 복사          → 복사됨 1 (갈래 2)         복사를 무는가
//   ⑤ 지문을 망가뜨림      → 코드는 살고 못 가림 1      코드까지 잃지 않는가
//   ⑥ 다시 박기            → 고쳤다 0 (③을 다시 박으면) 낡은 지문이 갱신되는가
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { 푼다, 섹션들, 묶는다 } from './hwpx-zip.mjs';
import { stampFingerprints } from './item-fp-stamp.mjs';
import { auditFile } from './code-audit.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const 기본 = path.join(ROOT, '교재 코드파일', '[2026][엔딩크레딧][공통수학2]01.평면좌표_코드.hwpx');
const SRC = process.argv[2] || 기본;
if (!fs.existsSync(SRC)) {
  console.error('교재를 못 찾았다: ' + SRC);
  console.error('쓰는 법: node tools/code-audit-test.mjs [코드심긴.hwpx]');
  process.exit(1);
}

const 일터 = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-test-'));
const 길 = (n) => path.join(일터, n);
let 잰것 = 0, 틀린것 = 0;
function 본다(무엇, 실제, 바람) {
  잰것++;
  const 맞나 = String(실제) === String(바람);
  if (!맞나) 틀린것++;
  console.log(`   ${맞나 ? '✅' : '🔴'} ${무엇.padEnd(42)} ${실제}${맞나 ? '' : '   (바란 것: ' + 바람 + ')'}`);
}

/* 섹션 XML 을 손으로 망가뜨린다. 고친 파일을 새로 낸다. */
function 망가뜨린다(src, out, 손대기) {
  const { tmp, cdir } = 푼다(src);
  let 했나 = false;
  for (const p of 섹션들(cdir)) {
    if (했나) break;
    const xml = fs.readFileSync(p, 'utf8');
    const 새것 = 손대기(xml);
    if (새것 !== null && 새것 !== xml) { fs.writeFileSync(p, 새것, 'utf8'); 했나 = true; }
  }
  묶는다(tmp, out);
  fs.rmSync(tmp, { recursive: true, force: true });
  if (!했나) throw new Error('망가뜨릴 자리를 못 찾았다 — 검사가 헛돌고 있다.');
  return out;
}

/* 미주 «밖»의 한글 글자 한 조각을 고친다.
   ⚠ 미주 «안»을 고치면 본문이 아니라 정답이 바뀐다 — 지문은 본문에서 뜨므로 아무 일도 안 일어난다.
     그래서 미주 구간을 먼저 도려낸다.
   🔴 **미주가 아예 없는 섹션은 건너뛴다** (2026-09-09에 검사가 처음 돌 때 여기서 헛돌았다).
     `section0.xml` 은 표지·목차라 미주가 0개다. 거기 「직선의 방정식」을 고쳐 봐야
     **문항이 아니라 목차**를 고치는 것이라 지문이 하나도 안 바뀐다. 노트가 말한
     「교재 맨 앞 목차·표지가 첫 미주보다 앞에 있다」가 여기서도 물었다.
   🔵 그리고 **첫 미주 «뒤»**에서 고른다 — 미주가 새 문항을 여는 자국이라, 그 뒤 글자는 문항 본문이다. */
function 본문글자고치기(xml) {
  const 미주 = [];
  for (const m of xml.matchAll(/<hp:endNote\b[^>]*>[\s\S]*?<\/hp:endNote>/g)) 미주.push([m.index, m.index + m[0].length]);
  if (!미주.length) return null;
  const 미주안 = (i) => 미주.some(([a, b]) => i >= a && i < b);
  const 첫미주끝 = 미주[0][1];
  for (const m of xml.matchAll(/<hp:t>([^<]{6,})<\/hp:t>/g)) {
    if (m.index < 첫미주끝 || 미주안(m.index)) continue;
    if (!/[가-힣]{3,}/.test(m[1])) continue;
    if (/\[/.test(m[1])) continue;                       // 코드가 든 조각은 건드리지 않는다
    const 고친속 = m[1].replace(/([가-힣])/, '$1가나다');  // 없던 글자를 끼워 넣는다
    return xml.slice(0, m.index) + '<hp:t>' + 고친속 + '</hp:t>' + xml.slice(m.index + m[0].length);
  }
  return null;
}

console.log('\n  code-audit — 망가뜨려 무는지 본다');
console.log('  바탕: ' + path.basename(SRC));

// ── ① 옛 파일 (지문이 아직 없다) ──────────────────────────────────────
console.log('\n  ① 옛 파일 — 지문이 없다');
{
  const r = auditFile(SRC);
  본다('못 가림으로 떨어지는가', r.못가림.length, r.문항수);
  본다('«틀림»으로 뭉개지 않는가 (고쳤다 0)', r.고쳤다.length, 0);
  본다('헛경보가 없는가 (복사 0)', r.복사됨.length, 0);
}

// ── ② 지문을 박는다 ──────────────────────────────────────────────────
console.log('\n  ② 지문을 박은 파일 — 묶었다 풀어도 살아남는가');
const 박은것 = 길('fp.hwpx');
let 문항수 = 0;
{
  const s = stampFingerprints(SRC, 박은것);
  문항수 = s.문항수;
  본다('문항 전부에 박혔는가', s.박음, s.문항수);
  const r = auditFile(박은것);
  본다('전부 «그대로»인가', r.그대로.length, r.문항수);
  본다('못 가림이 사라졌는가', r.못가림.length, 0);
  본다('복사가 0인가', r.복사됨.length, 0);
}

// ── ③ 본문을 한 글자 고친다 ──────────────────────────────────────────
console.log('\n  ③ 본문을 고쳤다 — 이것을 «복사»라 부르면 안 된다');
const 고친것 = 망가뜨린다(박은것, 길('edited.hwpx'), 본문글자고치기);
{
  const r = auditFile(고친것);
  본다('«고쳤다»로 잡는가', r.고쳤다.length, 1);
  본다('«복사»라고 하지 않는가', r.복사됨.length, 0);
  본다('나머지는 그대로인가', r.그대로.length, 문항수 - 1);
}

// ── ④ 코드를 복사한다 (다른 문항에 남의 코드를 붙인다) ────────────────
console.log('\n  ④ 코드가 복사됐다 — 이것이 진짜 경보다');
let 첫코드 = '', 둘째코드 = '';
const 복사된것 = 망가뜨린다(박은것, 길('copied.hwpx'), (xml) => {
  const 나온것 = [...xml.matchAll(/\[([A-Z]{1,2}\d?-\d{2}-[A-Z]-\d{4})\|([0-9a-f]{8})\]/g)];
  if (나온것.length < 2) return null;
  첫코드 = 나온것[0][1]; 둘째코드 = 나온것[1][1];
  /* 둘째 문항의 코드·지문을 첫째 것으로 통째로 바꾼다 = 「틀을 복사했다」와 같은 자국이다.
     ⚠ 함수꼴로 갈아 끼운다 — 바꿔 넣는 글자에 `$` 가 있으면 문자열꼴은 조용히 망가진다. */
  const 자리 = 나온것[1];
  return xml.slice(0, 자리.index) + '[' + 첫코드 + '|' + 나온것[0][2] + ']'
       + xml.slice(자리.index + 자리[0].length);
});
{
  const r = auditFile(복사된것);
  본다('복사를 무는가', r.복사됨.length, 1);
  본다('그 코드가 첫 코드인가', r.복사됨[0]?.code, 첫코드);
  본다('갈래를 둘 다 보여 주는가', r.복사됨[0]?.갈래.length, 2);
  본다('둘 중 하나만 지문이 맞는가', r.복사됨[0]?.갈래.filter((v) => v.판정 === '맞음').length, 1);
  본다('본문이 다르다고 아는가', r.복사됨[0]?.본문도같나, false);
  본다('사라진 코드를 «고쳤다»로 안 세는가', r.고쳤다.length, 0);
}

// ── ⑤ 지문을 망가뜨린다 ──────────────────────────────────────────────
console.log('\n  ⑤ 지문이 망가졌다 — 코드까지 잃으면 안 된다');
const 망친것 = 망가뜨린다(박은것, 길('badfp.hwpx'), (xml) => {
  const m = xml.match(/\[([A-Z]{1,2}\d?-\d{2}-[A-Z]-\d{4})\|([0-9a-f]{8})\]/);
  if (!m) return null;
  return xml.slice(0, m.index) + '[' + m[1] + '|ZZZZ]' + xml.slice(m.index + m[0].length);
});
{
  const r = auditFile(망친것);
  본다('문항 수가 그대로인가 (코드를 안 잃었다)', r.문항수, 문항수);
  본다('«못 가림»으로 떨어지는가', r.못가림.length, 1);
  본다('«고쳤다»라고 하지 않는가', r.고쳤다.length, 0);
}

// ── ⑥ 다시 박으면 낡은 지문이 갱신되는가 ─────────────────────────────
console.log('\n  ⑥ 다시 박는다 — 늘 뜨는 경고를 없앤다');
{
  const 다시 = stampFingerprints(고친것, 길('restamped.hwpx'));
  본다('달라진 지문 하나를 갈아 끼우는가', 다시.바뀐것.length, 1);
  const r = auditFile(길('restamped.hwpx'));
  본다('이제 «고쳤다»가 사라졌는가', r.고쳤다.length, 0);
  본다('전부 그대로인가', r.그대로.length, 문항수);
}

fs.rmSync(일터, { recursive: true, force: true });
console.log(`\n  ${잰것}가지를 쟀고 ${틀린것}가지가 틀렸다.\n`);
process.exit(틀린것 ? 1 : 0);
