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
봄('지문은 그림만 든 줄을 안 본다', fp('글\n| ⟦그림:a⟧ | ⟦그림:b⟧ |\n① 1') === fp('글\n① 1'));
const 데코 = rules.hwpxMarkDecorPics([{ content: '| ⟦그림:x⟧ |\n본문 | ⟦그림:y⟧ |', pics: ['y'] }])[0].content;
봄('제 그림이 아닌 표지는 지운다(딱지만 든 줄은 줄째)', 데코 === '\n본문 | ⟦그림:y⟧ |', JSON.stringify(데코));

/* 2026-10-06 — 그림 든 표(한 줄 한 칸 「[그림 1]/[그림 2]」 · 글 없는 두 칸)를 상자로 펴서 첫 장만 붙던 것 */
const 다항 = 파일(['주기나', 'hwpx2', '코드'], '[1.다항식의연산]');
if (다항) {
  const ps = problemsFromHwpx(다항, rules).problems;
  const 표지수 = (c) => new Set((String(c || '').match(/⟦그림:[^⟧]*⟧/g) || [])).size;
  for (const c of ['1190619', '1190619-N01', '2170314B', '2170314B-N01', '2170314B-U01', '1231128', '1231128-N01', '1231128-U01']) {
    const p = ps.find((x) => x.itemCode === c);
    봄(c + ' — 그림 둘 다 표 칸에', p && 표지수(p.content) === 2, p ? p.content.split('\n').filter((l) => l.includes('|')).join(' / ') : '못 찾음');
  }
  const u2 = ps.find((x) => x.itemCode === '2170314B-U02');
  봄('2170314B-U02 — 한 그림을 칸마다 잘라 쓴 표는 예전대로(표지 없음)', u2 && !/⟦그림:/.test(u2.content));
  const 뜬 = (p) => [...new Set(p.freePics)].filter((r) => p.pics.includes(r));
  봄('본문에 떠 있는 그림 여럿 = 1170629·-N01 뿐(다항식)', ps.filter((p) => 뜬(p).length > 1).map((p) => p.itemCode).join(',') === '1170629,1170629-N01',
    ps.filter((p) => 뜬(p).length > 1).map((p) => p.itemCode).join(','));
  봄('다항식 — 제 것 아닌 표지(번호 딱지) 0', ps.every((x) => [...String(x.content).matchAll(/⟦그림:([^⟧]*)⟧/g)].every((m) => (x.pics || []).includes(m[1]))));
}
const 직선 = 파일(['숨김2', '코드'], '2.직선의방정식');
if (!직선) console.log('  (엔딩크레딧 직선의 방정식이 없어 그림 보기 표를 건너뛴다)');
else {
  const ps = problemsFromHwpx(직선, rules).problems;
  const q = ps.find((x) => x.itemCode === 'K2-02-E-0083');
  봄('그림 보기 표(K2-02-E-0083)는 예전 그대로 — 표지 없음', q && !/⟦그림:/.test(q.content), q ? q.content.slice(0, 80) : '못 찾음');
  봄('그림 보기 표 그림은 «떠 있는 그림»이 아니다(K2-02-E-0083)', q && !(q.freePics || []).some((r) => q.pics.includes(r)), JSON.stringify(q && q.freePics));
  봄('엔딩크레딧 직선의 방정식 — 표지 든 문항 0', ps.every((x) => !/⟦그림:/.test(x.content || '')), ps.filter((x) => /⟦그림:/.test(x.content || '')).map((x) => x.itemCode).join(','));
}
console.log(fail ? `\n  🔴 ${fail}개 실패` : '\n  ✅ 다 통과');
process.exit(fail ? 1 : 0);
