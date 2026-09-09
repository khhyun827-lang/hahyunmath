// 「내년 판」 — 고친 파일을 다시 넣어도 번호가 안 밀리는가 (2026-09-09)
//
//   node tools/item-code-again-test.mjs
//
// 🔴 **왜 재는가** — `item-code.mjs` 는 여태 «처음 한 번»만 되는 도구였다.
//    코드를 «문서에 놓인 차례»로 매기고(`seq = FROM + i`), 이미 매긴 단원은 아예 막았다.
//    `--replace` 는 더 나빴다 — 통째로 다시 매기니 **앞에 문항 하나만 끼워 넣어도
//    뒤가 전부 한 칸씩 밀려** 파일·창고·학생 오답기록과 어긋난다.
//    사용자가 말한 「내년 버전 만들 때 수정한 이후로 다시 업로드」가 막히던 자리다.
//
// 🔵 **여기서 붙드는 것은 «맞게 매기나»가 아니라 «안 밀리나»다.** 밀리는 것이
//    이 일에서 되돌리기 가장 어려운 사고다 — 이미 나눠 준 교재의 코드가 통째로 틀려진다.
//
// ⚠ 네트워크에 안 기댄다 — `--local` 로 «손에 있는 본문»을 창고 자리에 놓는다.
// ⚠ **장부와 교재 원본은 한 글자도 안 건드린다** — 임시 폴더에 복사해서 돌린다.

import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const 교재폴더 = path.join(ROOT, '교재 코드파일');
const 장부원본 = path.join(ROOT, 'codes', 'K2-E.json');

let 통과 = 0, 실패 = 0;
const 잰다 = (이름, 참) => { 참 ? (통과++, console.log('  ✓ ' + 이름)) : (실패++, console.log('  ✗ ' + 이름)); };

if (!fs.existsSync(장부원본) || !fs.existsSync(교재폴더)) {
  console.log('  ⓘ 장부나 교재 폴더가 없어 건너뜁니다 (다른 사람의 저장소에서는 정상입니다).');
  process.exit(0);
}

const 파일 = fs.readdirSync(교재폴더).filter((x) => /01\..*\.hwpx$/.test(x))[0];
if (!파일) { console.log('  ⓘ 01단원 교재가 없어 건너뜁니다.'); process.exit(0); }

const 뜰 = fs.mkdtempSync(path.join(os.tmpdir(), 'itemcode-again-'));
const 장부 = path.join(뜰, 'K2-E.json');
fs.copyFileSync(장부원본, 장부);
const 옛 = JSON.parse(fs.readFileSync(장부, 'utf8'));

function 돌린다(더줄것 = []) {
  return execFileSync('node', [path.join(ROOT, 'tools', 'item-code.mjs'), path.join(교재폴더, 파일),
    '--subject', 'K2', '--book', 'E', '--chapter', '01', '--again', '--local', '--out', 장부, ...더줄것],
    { encoding: 'utf8', cwd: ROOT });
}

console.log('\n코드가 다 심긴 파일을 «그대로» 다시 넣는다');
let 말 = '';
try { 말 = 돌린다(); } catch (e) { 말 = (e.stdout || '') + (e.stderr || ''); }
const 새 = JSON.parse(fs.readFileSync(장부, 'utf8'));

잰다('🔴 막히지 않는다 — 여태 「장부에 01단원이 이미 있다」로 멈췄다', /다시 매김/.test(말));
잰다('심긴 코드 76개를 그대로 뒀다', /그대로 둔 코드 76/.test(말));
잰다('🔵 되찾은 코드 0 · 새로 준 코드 0 — 줄 것이 없다', /되찾은 코드 0 · 새로 준 코드 0/.test(말));
잰다('🔴 장부 크기가 안 늘었다 — 같은 코드를 두 줄로 안 만든다', 새.items.length === 옛.items.length);
잰다('🔴 **코드 차례가 한 칸도 안 밀렸다**',
  새.items.map((x) => x.code).join() === 옛.items.map((x) => x.code).join());
잰다('일련번호도 그대로', 새.items.map((x) => x.seq).join() === 옛.items.map((x) => x.seq).join());
잰다('다른 단원(02~05)은 손도 안 댔다',
  JSON.stringify(새.items.filter((x) => x.chapter !== '01')) === JSON.stringify(옛.items.filter((x) => x.chapter !== '01')));

console.log('\n두 번 세 번 돌려도 같은가 (같은 일을 여러 번 해도 같은 자리)');
try { 돌린다(); 돌린다(); } catch (e) { /* 아래에서 값으로 본다 */ }
const 세번째 = JSON.parse(fs.readFileSync(장부, 'utf8'));
잰다('🔵 세 번 돌려도 장부가 같다', JSON.stringify(세번째.items.map((x) => x.code)) === JSON.stringify(새.items.map((x) => x.code)));
잰다('크기도 같다', 세번째.items.length === 옛.items.length);

console.log('\n🔴 --again 없이 돌리면 여전히 막는다 (실수로 다시 매기는 것을 막는 문)');
let 막말 = '';
try {
  execFileSync('node', [path.join(ROOT, 'tools', 'item-code.mjs'), path.join(교재폴더, 파일),
    '--subject', 'K2', '--book', 'E', '--chapter', '01', '--out', 장부], { encoding: 'utf8', cwd: ROOT });
  막말 = '(안 막혔다)';
} catch (e) { 막말 = (e.stdout || '') + (e.stderr || ''); }
잰다('막는다', /장부에 01 단원이 이미 있다/.test(막말));
잰다('🔵 그리고 --again 을 알려 준다 — 막기만 하면 사람이 --replace 를 쓴다', /--again/.test(막말));
잰다('⚠ --replace 가 왜 위험한지도 말해 준다', /뒤가 전부 밀린다/.test(막말));

/* ── 🔴 진짜 「내년 판」 — 코드가 빠진 파일 ────────────────────────────────
   위까지는 «아무것도 안 바뀐 파일»을 잰다. 정작 붙들어야 하는 것은 **코드가 빠졌을 때**다.
   그래서 진짜 hwpx 를 풀어 미주에서 코드 셋을 지우고 다시 묶어, 그 파일로 돌린다.
   ⚠ 원본은 안 건드린다 — 임시 폴더에서 푼 것을 고쳐 임시 파일로 낸다. */
console.log('\n🔴 코드를 셋 지운 파일 — 창고 본문으로 되찾는가 (⑤)');
{
  const { 푼다, 섹션들, 묶는다 } = await import('./hwpx-zip.mjs');
  const { cdir, tmp } = 푼다(path.join(교재폴더, 파일));
  const 지운코드 = [];
  for (const s of 섹션들(cdir)) {
    let xml = fs.readFileSync(s, 'utf8');
    xml = xml.replace(/\[(K2-01-E-\d{4})\]/g, (m, code) => {
      if (지운코드.length >= 3) return m;
      지운코드.push(code); return '';
    });
    fs.writeFileSync(s, xml);
  }
  const 깎인파일 = path.join(뜰, '코드셋을지운.hwpx');
  묶는다(tmp, 깎인파일);
  잰다('셋을 지웠다 — ' + 지운코드.join(', '), 지운코드.length === 3);

  const 장부2 = path.join(뜰, 'K2-E-2.json');
  fs.copyFileSync(장부원본, 장부2);
  let 말2 = '';
  try {
    말2 = execFileSync('node', [path.join(ROOT, 'tools', 'item-code.mjs'), 깎인파일,
      '--subject', 'K2', '--book', 'E', '--chapter', '01', '--again', '--local', '--out', 장부2],
      { encoding: 'utf8', cwd: ROOT });
  } catch (e) { 말2 = (e.stdout || '') + (e.stderr || ''); }

  잰다('🔵 셋을 «되찾았다» — 새 코드를 안 줬다', /그대로 둔 코드 73 · 되찾은 코드 3 · 새로 준 코드 0/.test(말2));
  const 새2 = JSON.parse(fs.readFileSync(장부2, 'utf8'));
  잰다('🔴 장부가 안 늘었다 — 되찾기가 새 문항을 만들지 않는다', 새2.items.length === 옛.items.length);
  잰다('🔴 코드 차례가 한 칸도 안 밀렸다',
    새2.items.map((x) => x.code).join() === 옛.items.map((x) => x.code).join());
  잰다('지운 코드 셋이 장부에 그대로 있다', 지운코드.every((c) => 새2.items.some((x) => x.code === c)));
  잰다('⚠ 0565(새 번호)를 준 적이 없다', !새2.items.some((x) => x.seq > 564));
}

fs.rmSync(뜰, { recursive: true, force: true });
console.log('\n  ' + (실패 ? '🔴' : '✅') + ' ' + 통과 + ' 통과 · ' + 실패 + ' 실패');
console.log('  ⓘ 장부 원본과 교재는 한 글자도 안 건드렸습니다.\n');
process.exit(실패 ? 1 : 0);
