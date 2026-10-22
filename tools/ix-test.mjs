// 창고 색인 칸 검사 (2026-10-22 · 검색 구조 1단계)
//
//   node tools/ix-test.mjs
//
// 🔴 DB 를 안 건드린다. 붙드는 것: 칸 값이 창고 화면이 가르는 것과 같은가(장부 먼저 · 문서 · 코드) ·
//    웹의 쓰는 문(dbSetDoc)과 도구(ix.mjs)가 같은 함수를 쓰는가 · 채우기가 내용·_t 를 안 건드리는가.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { 창고칸 } from './ix.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
function liftFn(name) {
  const at = html.indexOf('function ' + name + '(');
  for (let j = html.indexOf('{', at), d = 0; j < html.length; j++) {
    if (html[j] === '{') d++;
    else if (html[j] === '}' && !--d) return html.slice(at, j + 1);
  }
}
let pass = 0, fail = 0;
const 봄 = (무엇, 나온것, 나와야) => {
  const ok = JSON.stringify(나온것) === JSON.stringify(나와야);
  ok ? pass++ : fail++;
  console.log((ok ? '  ✓ ' : '  ✗ ') + 무엇 + (ok ? '' : `\n      나온 것 ${JSON.stringify(나온것)}\n      나와야 ${JSON.stringify(나와야)}`));
};
const 값 = f => Object.fromEntries(Object.entries(f).filter(([k]) => k !== 'value' && k !== '_t').map(([k, v]) =>
  [k, 'stringValue' in v ? v.stringValue : 'booleanValue' in v ? v.booleanValue : (v.arrayValue.values || []).map(x => x.stringValue)]));

console.log('① items');
봄('①꼴 — 코드가 과목·단원, 장부가 출처', 값(창고칸('items', 'K2-01-E-0001', { content: 'x', answer: '3' })),
  { unit: 'K2-01', book: '유형반복R', eds: [], ready: true });
봄('②꼴 — 코드에 자리가 없으면 장부의 과목·단원', 값(창고칸('items', '1120607', { content: 'x' })).unit, 'K1-01');
봄('②꼴 교재 변형은 원본의 자리', 값(창고칸('items', '1120607-N05', {})).unit, 'K1-01');
봄('장부에 없으면 문서의 과목·단원·출처', 값(창고칸('items', '1990101', { subject: 'K1', chapter: '03', source: { book: '모의고사 기출' } })),
  { unit: 'K1-03', book: '모의고사 기출', eds: [], ready: false });
봄('실린 판 — bookLabel 꼴', 값(창고칸('items', 'K2-01-E-0001', { books: [{ name: '엔크', part: '1-2기말', year: 2026, no: 4 }] })).eds,
  ['엔크 1-2기말 2026']);
봄('아무것도 모르면 빈 단원', 값(창고칸('items', 'zzz', {})).unit, '');

console.log('② variants');
봄('원본의 단원 · 원본 · 검토 대기', 값(창고칸('variants', 'K2-05-E-0431-N01', { originCode: 'K2-05-E-0431', pending: true })),
  { unit: 'K2-05', root: 'K2-05-E-0431', pending: true });
봄('지운 것은 대기가 아니다', 값(창고칸('variants', 'K2-05-E-0431-N02', { originCode: 'K2-05-E-0431', pending: true, deleted: true })).pending, false);
봄('②꼴 원본의 변형 — 장부로', 값(창고칸('variants', '1120607-N03', { originCode: '1120607' })).unit, 'K1-01');

console.log('③ 이어진 자리 (글자로)');
const 쓰기 = liftFn('dbSetDoc');
봄('웹 쓰는 문이 칸을 붙인다', /ixFieldsOf\(collection, id, data, state\.itemByCode\)/.test(쓰기) && /items' \|\| collection === 'variants'/.test(쓰기), true);
봄('장부가 없으면 먼저 싣는다', /if\(!state\.itemByCode\) await loadItemLedgerIfNeeded\(\)/.test(쓰기), true);
const 채움 = liftFn('ixBackfill');
봄('채우기는 칸만 고친다(updateMask · 있는 문서만)', /'updateMask\.fieldPaths'/.test(채움) && /currentDocument\.exists/.test(채움) && !/_t|value:/.test(채움), true);
봄('낡은 창고로 안 채운다', /itemsCacheHit === 'stale'/.test(채움), true);
for (const t of ['item-bodies', 'items-figures', 'items-push', 'items-repair', 'review-local', 'hwpx-push'])
  봄(`도구 ${t} 가 같은 칸을 쓴다`, /창고칸\(/.test(fs.readFileSync(path.join(ROOT, 'tools', t + '.mjs'), 'utf8')), true);

console.log(`\n${fail ? '🔴' : '🟢'} ${pass} 통과 · ${fail} 실패`);
process.exit(fail ? 1 : 0);
