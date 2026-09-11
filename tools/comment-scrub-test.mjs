// 개체 설명문에서 이름을 지울 때 «다른 것이 안 다치는가» (2026-09-10)
//
//   node tools/comment-scrub-test.mjs
//
// 🔵 **재는 것은 «지워지나»가 아니다.** 지워지는 것은 눈으로 봐도 안다.
//    무서운 것은 **설명문을 건드리다 문항 글이 흔들리는 것**이다 — 그러면 창고 대조가
//    564제를 통째로 「고쳤다」로 뜨고, 이름 지우기가 «창고 갈아엎기»가 된다.
//    그래서 여기서 붙드는 것은 그 하나다.
// ⚠ 원본은 안 건드린다 — 임시 폴더로만 낸다.

import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { 훑는다, 지운다, 지울말 } from './comment-scrub.mjs';
import { loadHwpxRules, problemsFromHwpx } from './hwpx-node.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const 폴더 = path.join(ROOT, '교재 코드파일');

let 통과 = 0, 실패 = 0;
const 잰다 = (이름, 참) => { 참 ? (통과++, console.log('  ✓ ' + 이름)) : (실패++, console.log('  ✗ ' + 이름)); };

if (!fs.existsSync(폴더)) { console.log('  ⓘ 교재 폴더가 없어 건너뜁니다.'); process.exit(0); }
const 원본 = fs.readdirSync(폴더).filter((x) => /03\..*\.hwpx$/.test(x) && !/_이름지움/.test(x))
  .map((x) => path.join(폴더, x))[0];
if (!원본) { console.log('  ⓘ 03단원 교재가 없어 건너뜁니다.'); process.exit(0); }

const 뜰 = fs.mkdtempSync(path.join(os.tmpdir(), 'scrub-'));
const 낸것 = path.join(뜰, '지움.hwpx');
const 원본크기 = fs.statSync(원본).size;
const rules = loadHwpxRules();
const 앞 = problemsFromHwpx(원본, rules).problems;

/* 🔴 **검사가 «원본이 더러운 것»에 기대면 안 된다** (2026-09-10에 밟았다).
   처음엔 03단원 원본에 이름이 1,592곳 있다고 못 박아 뒀는데, 실제로 그것을 지우고 나니
   검사가 무너졌다 — «한 번 쓰고 마는 검사»였던 것이다.
   🔵 그래서 **더러운 파일을 스스로 만들어 쓴다.** 몇 곳이든 상관없이 언제나 돈다. */
console.log('\n03단원으로 잰다 — 이름을 «심어 넣은» 사본을 만들어서');
const 더러운것 = path.join(뜰, '이름있음.hwpx');
{
  const { 푼다, 섹션들, 묶는다 } = await import('./hwpx-zip.mjs');
  const { cdir, tmp } = 푼다(원본);
  let 심음 = 0;
  for (const s of 섹션들(cdir)) {
    const xml = fs.readFileSync(s, 'utf8');
    /* 자동 문구 하나를 골라 그 자리에 이름을 넣는다 — 진짜 파일에 있던 그 꼴 그대로. */
    const 새 = xml.replace(/<hp:shapeComment>묶음 개체입니다\.<\/hp:shapeComment>/g,
      () => { 심음++; return '<hp:shapeComment>' + 지울말[0] + '</hp:shapeComment>'; });
    if (새 !== xml) fs.writeFileSync(s, 새);
  }
  묶는다(tmp, 더러운것);
  잰다('이름을 심은 사본을 만들었다 (' + 심음 + '곳)', 심음 > 0);
}
const { 지울수 } = 훑는다(더러운것);
잰다('심은 만큼 «지울 것»으로 센다', 지울수 > 0);

const 앞더러운 = problemsFromHwpx(더러운것, rules).problems;
const { 지움, 문항 } = 지운다(더러운것, 낸것);
잰다('심은 만큼 지웠다', 지움 === 지울수);
잰다('🔴 **문항 수가 그대로다**', 문항 === 앞더러운.length);

const 뒤 = problemsFromHwpx(낸것, rules).problems;
잰다('🔴 **본문이 한 글자도 안 달라졌다**', 앞더러운.every((p, i) => (p.content || '') === (뒤[i].content || '')));
잰다('🔴 **코드도 그대로다**', 앞더러운.every((p, i) => (p.itemCode || '') === (뒤[i].itemCode || '')));
잰다('정답(미주)도 그대로다', 앞더러운.every((p, i) => (p.answer || '') === (뒤[i].answer || '')));
잰다('🔵 원본과도 같다 — 사본을 거쳐도 글이 안 흔들렸다',
  앞.every((p, i) => (p.content || '') === (뒤[i].content || '')));

{
  const { 셈 } = 훑는다(낸것);
  잰다('🔴 낸 파일에 그 이름이 하나도 없다', !지울말.some((v) => 셈.has(v)));
  잰다('⚠ 다른 설명문은 그대로 있다 — 「수식입니다.」', (셈.get('수식입니다.') || 0) > 0);
  잰다('⚠ 문항마다 하나씩 있는 그림 설명문도 그대로다',
    [...셈].some(([v, n]) => /자산 12@4x\.png/.test(v) && n > 0));
}

잰다('🔵 원본은 크기까지 그대로다 (한 글자도 안 고쳤다)', fs.statSync(원본).size === 원본크기);
잰다('🔵 더러운 사본에는 이름이 아직 있다 — 지우는 것은 «낸 파일»뿐이다', 훑는다(더러운것).지울수 === 지울수);

console.log('\n이미 있는 파일에는 안 덮어쓴다');
let 막았나 = false;
try { 지운다(원본, 낸것); } catch (e) { 막았나 = /이미 있는 파일/.test(e.message); }
잰다('막는다', 막았나);

fs.rmSync(뜰, { recursive: true, force: true });
console.log('\n  ' + (실패 ? '🔴' : '✅') + ' ' + 통과 + ' 통과 · ' + 실패 + ' 실패\n');
process.exit(실패 ? 1 : 0);
