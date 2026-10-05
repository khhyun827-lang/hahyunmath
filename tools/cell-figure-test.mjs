// 표 안 그림 — 제자리에 남는가 (2026-10-05 · 1060918 「[그림1] ⇨ [그림2]」 · 사용자가 짚었다)
//   node tools/cell-figure-test.mjs
// ① 화면: `⟦그림:주소⟧` 가 그 칸에 그림으로 · 안 올린 참조는 자리만 · AI 에게 줄 그림(itemFigureOf) · 지문은 표지를 안 본다
// ② 파서(진짜 교재가 있을 때만): 1060918 은 격자 칸에 표지 둘 · 그림 보기 표(K2-02-E-0083)·상자는 예전 그대로(표지 없음)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadHwpxRules, problemsFromHwpx } from './hwpx-node.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const lift = (n) => { const at = html.indexOf('function ' + n + '('); let d = 0;
  for (let j = html.indexOf('{', at); ; j++) { if (html[j] === '{') d++; else if (html[j] === '}' && !--d) return html.slice(at, j + 1); } };
const { 칸그림세우기, itemFigureOf } = new Function(lift('칸그림세우기') + '\n' + lift('itemFigureOf') + '\nreturn { 칸그림세우기, itemFigureOf };')();
const rules = loadHwpxRules();
let fail = 0;
const 봄 = (무엇, ok, 말) => { console.log((ok ? '  ✓ ' : '  ✗ ') + 무엇 + (ok ? '' : ' — ' + (말 || ''))); if (!ok) fail++; };

const U = 'https://drive.google.com/thumbnail?id=AbC_12-x&amp;sz=w2000';
봄('주소 표지 → 그 칸에 그림', /<img class="pb-cfig" src="https:\/\/drive\.google\.com\/thumbnail\?id=AbC_12-x&amp;sz=w2000"/.test(칸그림세우기('⟦그림:' + U + '⟧')));
봄('안 올린 참조 → 자리만', 칸그림세우기('⟦그림:image21⟧').includes('[그림]') && !칸그림세우기('⟦그림:image21⟧').includes('<img'));
봄('표지 없는 칸은 그대로', 칸그림세우기('[그림 $1$]') === '[그림 $1$]');
const f = itemFigureOf({ content: '| ⟦그림:https://drive.google.com/thumbnail?id=AbC_12-x&sz=w2000⟧ | ⇨ | ⟦그림:https://x/thumbnail?id=Z&sz=1⟧ |' });
봄('AI 에게 줄 그림 = 표 안 첫 그림(fileId)', f && f.fileId === 'AbC_12-x', JSON.stringify(f));
봄('표 밖 그림(image)이 있으면 그것이 먼저', itemFigureOf({ image: { fileId: 'out' }, content: '⟦그림:https://a?id=in⟧' }).fileId === 'out');
봄('그림 없으면 null', itemFigureOf({ content: '글만' }) === null);
const fp = rules.hwpItemFpText;
봄('지문은 표지를 안 본다(참조 ↔ 주소)', fp('| ⟦그림:image21⟧ | ⇨ |') === fp('| ⟦그림:https://a?id=1⟧ | ⇨ |') && fp('| ⟦그림:image21⟧ | ⇨ |') === fp('| | ⇨ |'));

const 파일 = (dir, 조각) => { const D = path.join(ROOT, '교재 코드파일', ...dir); return fs.existsSync(D) && fs.readdirSync(D).find((x) => x.includes(조각) && x.endsWith('.hwpx')) ? path.join(D, fs.readdirSync(D).find((x) => x.includes(조각) && x.endsWith('.hwpx'))) : null; };
const 인수 = 파일(['주기나', 'hwpx2', '코드'], '[3.인수분해]');
if (!인수) console.log('  (주기나 인수분해가 없어 ② 를 건너뛴다)');
else {
  const p = problemsFromHwpx(인수, rules).problems.find((x) => x.itemCode === '1060918');
  const 줄 = String(p && p.content || '').split('\n').find((l) => l.includes('⇨')) || '';
  봄('1060918 — 격자 칸에 그림 표지 둘(⇨ 양옆)', /^\| ⟦그림:[^⟧]+⟧ \| ⇨ \| ⟦그림:[^⟧]+⟧ \|$/.test(줄), 줄);
  봄('1060918 — 그림 둘 다 pics 에 남는다', p && p.pics && p.pics.length >= 2, JSON.stringify(p && p.pics));
}
const 직선 = 파일(['숨김2', '코드'], '2.직선의방정식');
if (!직선) console.log('  (엔딩크레딧 직선의 방정식이 없어 그림 보기 표를 건너뛴다)');
else {
  const ps = problemsFromHwpx(직선, rules).problems;
  const q = ps.find((x) => x.itemCode === 'K2-02-E-0083');
  봄('그림 보기 표(K2-02-E-0083)는 예전 그대로 — 표지 없음', q && !/⟦그림:/.test(q.content), q ? q.content.slice(0, 80) : '못 찾음');
  봄('엔딩크레딧 직선의 방정식 — 표지 든 문항 0', ps.every((x) => !/⟦그림:/.test(x.content || '')), ps.filter((x) => /⟦그림:/.test(x.content || '')).map((x) => x.itemCode).join(','));
}
console.log(fail ? `\n  🔴 ${fail}개 실패` : '\n  ✅ 다 통과');
process.exit(fail ? 1 : 0);
