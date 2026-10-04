// 기출(주기나) 세 자리 심기 — 지금 꼴 코드(1230928 · -N01 · 2170314A-N01)를 심고 «숨긴 코드만으로» 도로 읽는가
//
//   node tools/jugina-stamp-test.mjs
//
// ⚠ 교재는 git 밖(정답이 있다) — 없으면 건너뛴다.

import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { 기출세자리 } from './item-code-hide.mjs';
import { loadHwpxRules, problemsFromHwpx } from './hwpx-node.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let fail = 0;
const 봄 = (무엇, ok, 말) => { console.log((ok ? '  ✓ ' : '  ✗ ') + 무엇 + (ok ? '' : ' — ' + 말)); if (!ok) fail++; };

// ① 정규식 — hwpx.js 의 설명문 코드 꼴
const src = fs.readFileSync(path.join(ROOT, 'hwpx.js'), 'utf8');
const RE = eval(src.match(/const HWP_SHAPE_CODE_RE = (\/.*\/);/)[1]);
const 문 = (t) => (t.match(RE) || [])[1];
봄('지금 꼴 원본 1230928', 문('그림입니다. [1230928]') === '1230928', 문('그림입니다. [1230928]'));
봄('지금 꼴 변형 1230928-N01', 문('수식입니다. [1230928-N01]') === '1230928-N01', '');
봄('형 붙은 2170314A-N01', 문('[2170314A-N01]') === '2170314A-N01', '');
봄('옛 꼴 1230928NC01 은 통째로', 문('[1230928NC01]') === '1230928NC01', 문('[1230928NC01]'));
봄('여덟 자리 숫자는 안 문다', 문('[12309281]') === undefined, 문('[12309281]'));

// ② 진짜 교재로 — 03 인수분해
const D = path.join(ROOT, '교재 코드파일', '주기나', 'hwpx2');
const f = fs.existsSync(D) && fs.readdirSync(D).find((x) => x.includes('[3.인수분해]'));
if (!f) console.log('  (주기나 hwpx2 인수분해가 없어 ② 를 건너뛴다)');
else {
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'jgst-')), 'out.hwpx');
  let r = null;
  try { r = 기출세자리(path.join(D, f), out); } catch (e) { 봄('심기', false, e.message); }
  if (r) {
    봄('세 자리 40·40·40', r.셈.그림 === 40 && r.셈.수식 === 40 && r.셈.숨은설명 === 40, JSON.stringify(r.셈));
    const 장부 = JSON.parse(fs.readFileSync(path.join(ROOT, 'codes', 'K1-J.json'), 'utf8')).items.filter((i) => i.chapter === '03').map((i) => i.code);
    const 읽은 = problemsFromHwpx(out, loadHwpxRules()).problems.filter((p) => p.itemCode).map((p) => p.itemCode);
    봄('숨긴 코드만으로 장부와 같은 차례', 읽은.join() === 장부.join(), 읽은.slice(0, 3).join(' '));
    let 또 = '';
    try { 기출세자리(out, out + '2.hwpx'); } catch (e) { 또 = e.message; }
    봄('두 번 심지 않는다', /이미/.test(또), 또 || '두 번째도 심어졌다');
  }
}
console.log(fail ? `\n  🔴 ${fail}개 실패` : '\n  ✅ 다 통과');
process.exit(fail ? 1 : 0);
