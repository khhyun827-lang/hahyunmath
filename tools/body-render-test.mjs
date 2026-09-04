// «문제 본문을 그리는 자리»가 다 problemHTML 을 거치는가 (2026-09-04)
//
//   node tools/body-render-test.mjs
//
// 🔴 **왜 필요한가** — 문항 창고 카드 하나만 `escHtml(body.content)` 로 날글자를 그리고 있었다.
//    그래서 **그 화면에서만** 선지가 격자가 안 되고 조건·보기 상자가 표로 안 살아났다.
//    사용자가 화면을 캡처해서 짚어 줘야 알았다 — 코드로는 어디서도 안 드러난다.
//
// 🔵 본문을 그리는 자리는 열 곳이 넘는다(검토 · 문항 코드 · 문항 창고 · 학생 앱 · 시험지 · 리포트).
//    **하나라도 빠지면 그 화면에서만 깨지고, 다른 화면이 멀쩡해서 더 늦게 발견된다.**
//    그래서 «본문이 들어가는 칸»의 이름을 적어 두고, 그 칸이 problemHTML 을 거치는지 본다.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const lines = html.split(/\r?\n/);

let pass = 0, fail = 0;
const 봄 = (무엇, ok, 곁) => {
  if (ok) { pass++; console.log('  ✓ ' + 무엇); }
  else { fail++; console.log('  ✗ ' + 무엇 + (곁 ? '\n      ' + 곁 : '')); }
};

/* 본문이 들어가는 칸들. 새 칸을 만들면 여기에도 적을 것. */
const 칸 = ['ist-body', 'q-body', 'ic-cbody', 'sap-q', 'rpt-fb'];

console.log('\n문제 본문을 그리는 자리 — 다 problemHTML 을 거치는가\n');

for (const c of 칸) {
  /* 그 칸을 여는 줄들을 다 찾는다. 「내용 없음」만 적는 자리(none)는 뺀다. */
  const 자리 = [];
  lines.forEach((l, i) => {
    if (!l.includes('class="' + c + '"')) return;
    if (l.includes(c + ' none')) return;
    /* 삼항이라 다음 줄에 이어지는 자리가 있다 — 두 줄을 같이 본다. */
    자리.push({ no: i + 1, 글: l + (lines[i + 1] || '') });
  });
  봄(c + ' 칸이 있다 (' + 자리.length + '곳)', 자리.length > 0);
  for (const z of 자리) {
    const 거침 = z.글.includes('problemHTML(');
    봄('  줄 ' + z.no + ' — problemHTML 을 거친다', 거침,
       거침 ? null : '날글자로 그리고 있습니다: ' + z.글.trim().slice(0, 90));
  }
}

/* 🔴 되돌이 방지 — 창고 카드가 다시 escHtml 로 돌아가지 않았나 */
const 창고 = lines.find(l => l.includes('class="ist-body"') && !l.includes('none'));
봄('🔴 문항 창고 카드가 날글자로 안 돌아갔다',
   !!창고 && !/escHtml\(body\.content\)/.test(창고 + ''), 창고);

console.log('\n  ' + (fail ? '🔴' : '✅') + ' ' + pass + ' 통과 · ' + fail + ' 실패\n');
process.exit(fail ? 1 : 0);
