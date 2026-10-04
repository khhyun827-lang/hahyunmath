// 묶음 표 — 한 기출의 문항 여럿을 담은 바깥 표 (2026-10-04 · 주기나 1-1)
//
//   node tools/bundle-table-test.mjs
//
// 바깥 표를 문항 껍질로 읽으면 미주를 모두 앞으로 끌어올려 한 묶음이 덩이 하나로 뭉친다
// (인수분해 40문항 → 덩이 17 · 코드 0개). 진짜 교재로 «문항마다 코드가 붙는가»를 잰다.
// ⚠ 교재는 git 밖(정답이 있다) — 없으면 건너뛴다.

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';
import { sectionDocs, loadHwpxRules } from './hwpx-node.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const D = path.join(ROOT, '교재 코드파일', '주기나', 'hwpx');
const f = fs.existsSync(D) && fs.readdirSync(D).find((x) => x.includes('[3.인수분해]'));
if (!f) { console.log('  (주기나 1-1 인수분해 hwpx 가 없어 건너뛴다)'); process.exit(0); }
const SRC = path.join(D, f);

const R = loadHwpxRules();
const tmp = fs.mkdtempSync(path.join(process.env.TEMP || '/tmp', 'bundle-'));
execFileSync('unzip', ['-qo', SRC, '-d', tmp]);
const 해시 = {};
const hpf = fs.readFileSync(path.join(tmp, 'Contents', 'content.hpf'), 'utf8');
for (const m of hpf.matchAll(/id="([^"]+)"[^>]*href="([^"]+)"/g)) {
  const p = path.join(tmp, decodeURIComponent(m[2]));
  if (fs.existsSync(p) && fs.statSync(p).isFile()) 해시[m[1]] = crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex').slice(0, 32);
}
const 문서 = sectionDocs(SRC);
const r = R.hwpxMakeSourceCodes(R.hwpxSourceBadges(문서, (ref) => 해시[ref] || ''));
const { problems } = R.hwpxProblemsFromDocs(문서, { codes: r.ok ? r.codesAll : null });
const 붙은 = problems.filter((b) => b.itemCode).map((b) => b.itemCode);

let fail = 0;
const 봄 = (무엇, ok, 말) => { console.log((ok ? '  ✓ ' : '  ✗ ') + 무엇 + (ok ? '' : ' — ' + 말)); if (!ok) fail++; };
봄('출처·딱지로 코드 40개', r.ok && r.codes.length === 40, JSON.stringify(r.흠 || r.codes.length));
봄('문항마다 코드가 붙는다(40/40)', 붙은.length === 40, '붙은 것 ' + 붙은.length);
봄('코드가 출처 차례 그대로', JSON.stringify(붙은) === JSON.stringify(r.codes), 붙은.slice(0, 4).join(' '));
봄('묶음 하나가 덩이 하나로 뭉치지 않는다', problems.length === 41, '덩이 ' + problems.length + ' (목차 1 + 문항 40 이어야)');
console.log(fail ? `\n  🔴 ${fail}개 실패` : '\n  ✅ 다 통과');
process.exit(fail ? 1 : 0);
