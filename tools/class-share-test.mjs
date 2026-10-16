// 반끼리 나눠 쓰기 — 교재 · 과제 (2026-10-17)
//
//   node tools/class-share-test.mjs
//
// 사용자 — 「한 반에서 새 교재를 추가하면 다른 반에서 바로 선택」 · 「한 반에서 등록한 과제를 다른 반에서도 그대로 등록」
// 실제 크롬으로 연다. DB 는 안 건드린다(dbSetDoc·logAudit 가로챔).
// 🔴 붙드는 것: 교재는 «같은 과목»만 · 다루는 단원(bookScope)도 따라온다 · 이미 있는 책은 안 뜬다 ·
//    과제 불러오기는 폼을 채우기만 한다(등록은 강사가 누른다).

import { chromium } from 'playwright';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { 씨앗 } from './shots-scenes.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PORT = 8805;
const 서버 = spawn(process.execPath, [path.join(HERE, 'serve.js'), String(PORT)], { stdio: 'ignore' });
let pass = 0, fail = 0;
const 봄 = (무엇, 나온것, 나와야) => {
  const ok = JSON.stringify(나온것) === JSON.stringify(나와야);
  if(ok){ pass++; console.log('  ✓ ' + 무엇); }
  else { fail++; console.log(`  ✗ ${무엇}\n      나온 것: ${JSON.stringify(나온것)}\n      나와야:  ${JSON.stringify(나와야)}`); }
};

const 브라우저 = await chromium.launch();
try{
  const page = await 브라우저.newPage({ viewport: { width: 1440, height: 900 } });
  for(let i = 0; i < 40; i++){ try{ await page.goto(`http://127.0.0.1:${PORT}/index.html`); break; }catch{ await page.waitForTimeout(250); } }
  await page.waitForFunction(() => typeof render === 'function' && typeof sharedBooksFor === 'function');
  await page.evaluate(씨앗);
  await page.evaluate(() => {
    window.__쓴것 = []; window.dbSetDoc = (c, id) => { __쓴것.push(c + '/' + id); return Promise.resolve(true); };
    window.logAudit = () => Promise.resolve(); window.showToast = m => { window.__말 = m; };
    const 과목 = '공통수학1';
    DATA.classes = [
      { id: 'c1', name: 'A반', progress: { subject: 과목, booksBySubject: { [과목]: ['쎈'] } } },
      { id: 'c2', name: 'B반', progress: { subject: 과목, booksBySubject: { [과목]: ['쎈', '개념원리'], '공통수학2': ['RPM'] },
        bookScope: { [과목]: { '개념원리': ['다항식의 연산', '나머지정리'] } } } },
      { id: 'c3', name: 'C반', progress: { subject: 과목, booksBySubject: { [과목]: ['마플'] } } },
    ];
    window.__과목 = 과목;
  });

  console.log('\n교재');
  const 책 = await page.evaluate(async () => {
    const 고를것 = sharedBooksFor('c1', __과목).map(x => x.title).sort();
    await addClassBook('c1', '개념원리');
    const c1 = DATA.classes[0].progress;
    return { 고를것, 들어감: c1.booksBySubject[__과목], 범위: c1.bookScope && c1.bookScope[__과목]['개념원리'], 쓴: __쓴것.slice(-1)[0], 다음: sharedBooksFor('c1', __과목).map(x => x.title) };
  });
  봄('다른 반의 같은 과목 책만 · 이미 있는 «쎈»은 빼고', 책.고를것, ['개념원리', '마플']);
  봄('고르면 이 반에 들어가 저장된다', [책.들어감, 책.쓴], [['쎈', '개념원리'], 'classes/c1']);
  봄('🔵 그 반이 정해 둔 «다루는 단원»도 따라온다', 책.범위, ['다항식의 연산', '나머지정리']);
  봄('넣은 책은 고르개에서 빠진다', 책.다음, ['마플']);

  console.log('\n과제');
  const 과제 = await page.evaluate(() => {
    const 날 = k => shiftYmd(todayStr(), k);
    DATA.assignments = [
      { id: 'a1', classId: 'c2', title: '쎈 p.30~44', description: 'B단계까지', dueDate: 날(3), createdAt: 날(-1) },
      { id: 'a2', classId: 'c3', title: '쎈 p.30~44', description: 'B단계까지', dueDate: 날(4), createdAt: 날(-2) },
      { id: 'a3', classId: 'c2', title: '옛날 과제', createdAt: 날(-90) },
      { id: 'a4', classId: 'c1', title: '이미 낸 과제', createdAt: 날(-1) },
      { id: 'a5', classId: 'c2', title: '이미 낸 과제', createdAt: 날(-1) },
      { id: 'a6', classId: 'c3', title: '지난 마감', dueDate: 날(-3), createdAt: 날(-5) },
    ];
    const 후보 = hwCopyCandidates('c1').map(a => a.id);
    document.body.insertAdjacentHTML('beforeend', '<div id="t"><input id="dhw-title"><textarea id="dhw-desc"></textarea><input id="dhw-due"></div>');
    const n = DATA.assignments.length;
    hwFillFrom('a1', 'dhw-');
    const 채움 = ['title', 'desc', 'due'].map(k => document.getElementById('dhw-' + k).value);
    document.getElementById('dhw-due').value = '';
    hwFillFrom('a6', 'dhw-');
    const 지난마감 = document.getElementById('dhw-due').value;
    return { 후보, 채움, 안만듦: DATA.assignments.length === n, 지난마감, 날3: 날(3) };
  });
  봄('다른 반 최근 것만 · 같은 이름+설명은 하나 · 이 반에 있는 이름은 빼고 · 새것이 위', 과제.후보, ['a1', 'a6']);
  봄('고르면 폼을 채운다(과제명·설명·마감)', 과제.채움, ['쎈 p.30~44', 'B단계까지', 과제.날3]);
  봄('🔴 채우기만 한다 — 과제를 새로 만들지 않는다', 과제.안만듦, true);
  봄('이미 지난 마감은 안 옮긴다', 과제.지난마감, '');
} finally {
  await 브라우저.close();
  서버.kill();
}
console.log(`\n  ${fail ? '🔴' : '✅'} ${pass} 통과 · ${fail} 실패\n`);
process.exit(fail ? 1 : 0);
