// 교재 진도율 2단계 C — 교재별 단원 체크 (2026-09-30)
//
//   node tools/book-prog-test.mjs
//
// 사용자가 고른 기획: 분모 = 이번 시즌 범위(A) · 체크는 교재마다(C) · 반 진도 = 어느 교재에서든 마친 단원.
// 🔴 지키는 것 — 올린 날 진도가 0 으로 안 떨어진다(첫 교재가 옛 반 체크를 물려받는다).
// ⚠ 함수를 여기에 옮겨 적지 않는다 — index.html 에서 그대로 뜬다.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/\r\n/g, '\n');
const NL = String.fromCharCode(10);
function lift(name) {
  let at = html.indexOf('function ' + name + '(');
  if (at < 0) throw new Error(name + ' 를 못 찾았습니다');
  if (html.slice(at - 6, at) === 'async ') at -= 6;
  let d = 0;
  for (let j = html.indexOf('{', at); j < html.length; j++) {
    if (html[j] === '{') d++;
    else if (html[j] === '}') { d--; if (!d) return html.slice(at, j + 1); }
  }
  throw new Error(name + ' 의 끝을 못 찾았습니다');
}
let pass = 0, fail = 0;
const 봄 = (무엇, 나온것, 나와야) => {
  const ok = JSON.stringify(나온것) === JSON.stringify(나와야);
  if (ok) pass++; else fail++;
  console.log((ok ? '  ✓ ' : '  🔴 ') + 무엇 +
    (ok ? '' : NL + '      나온 것 ' + JSON.stringify(나온것) + NL + '      나와야 ' + JSON.stringify(나와야)));
};

const 이름들 = ['isVacationSeason', 'currentSeason', 'presetChapters', 'getClassProgress', 'progRangeText',
  'bookUnitsOf', 'bookDoneOf', 'toggleBookUnit', 'setBookScope', 'bookProgText'];
const 상자 = new Function('DATA', 'state', 'UNIT_CHAPTERS', 'SEASON_SPLIT', 'SEASONS', 'dbSetDoc', 'render',
  이름들.map(lift).join(NL) + NL + 'return { ' + 이름들.join(', ') + ' };');

/* 과목 하나(10단원 a~j) · 중간 = 앞 6단원 */
function 판(progress, 시즌) {
  const DATA = { classes: [{ id: 'c1', name: '고1A', progress }] };
  const 쓴것 = [];
  const F = 상자(DATA, { season: { name: 시즌 || '2학기 중간' } },
    { 과목: ['a','b','c','d','e','f','g','h','i','j'] }, { 과목: 6 },
    ['겨울방학','1학기 중간','1학기 기말','여름방학','2학기 중간','2학기 기말'],
    async (col, id, doc) => { 쓴것.push(JSON.parse(JSON.stringify(doc.progress))); }, () => {});
  return { F, DATA, 쓴것, cp: () => F.getClassProgress('c1') };
}
const 옛체크 = { a: true, b: true, c: true, d: false };

console.log(NL + '① 교재가 없는 반 — 예전 그대로' + NL);
{
  const { cp } = 판({ subject: '과목', unitsBySubject: { 과목: 옛체크 }, booksBySubject: {} });
  봄('반 체크로 센다 (6단원 중 3)', [cp().doneCount, cp().total, cp().percent], [3, 6, 50]);
  봄('교재 진도는 빈 목록', cp().bookProg, []);
}

console.log(NL + '② 올린 날 — 첫 교재가 옛 반 체크를 물려받는다' + NL);
{
  const { cp } = 판({ subject: '과목', unitsBySubject: { 과목: 옛체크 }, booksBySubject: { 과목: ['개념서', '쎈'] } });
  봄('🔴 반 진도가 0 으로 안 떨어진다', [cp().doneCount, cp().percent], [3, 50]);
  봄('첫 교재 = 옛 체크 · 둘째 = 빈 것', cp().bookProg.map(b => [b.book, b.done, b.total]), [['개념서', 3, 6], ['쎈', 0, 6]]);
}

console.log(NL + '③ 누르기 — 처음 누르면 옛 체크를 복사해 굳힌다' + NL);
{
  const { F, DATA, 쓴것, cp } = 판({ subject: '과목', unitsBySubject: { 과목: { ...옛체크 } }, booksBySubject: { 과목: ['개념서', '쎈'] } });
  await F.toggleBookUnit('c1', '개념서', 'b', false);
  봄('🔴 옛 체크를 풀 수 있다 (b 를 풀면 2)', cp().bookProg[0].done, 2);
  봄('첫 누름에 a·c 는 그대로 남았다', ['a','b','c'].map(u => !!DATA.classes[0].progress.unitsByBook.과목.개념서[u]), [true, false, true]);
  봄('옛 반 체크는 안 건드린다', DATA.classes[0].progress.unitsBySubject.과목.b, true);
  await F.toggleBookUnit('c1', '쎈', 'e', true);
  봄('🔴 반 진도 = 교재들의 합 (a·c + e)', [cp().doneCount, cp().next], [3, 'b']);
  봄('저장했다', 쓴것.length, 2);
}

console.log(NL + '④ 다루는 단원 — 첫~끝' + NL);
{
  const { F, DATA, cp } = 판({ subject: '과목', unitsBySubject: {}, booksBySubject: { 과목: ['상권', '하권'] } });
  await F.setBookScope('c1', '상권', 1, 'f');
  await F.setBookScope('c1', '하권', 0, 'g');
  봄('상권 a~f · 하권 g~j', cp().bookProg.map(b => b.units.join('')), ['abcdef', 'ghij']);
  봄('🔴 하권은 중간 범위 밖 — 분모 0 · 이름만', [cp().bookProg[1].total, F.bookProgText(cp().bookProg[1])], [0, '하권']);
  await F.setBookScope('c1', '상권', 0, 'h');
  봄('거꾸로 고르면 바꿔 앉힌다 (f~h)', cp().bookProg[0].units.join(''), 'fgh');
  await F.setBookScope('c1', '상권', 0, 'a'); await F.setBookScope('c1', '상권', 1, 'j');
  봄('과목 전체로 돌리면 칸을 지운다', DATA.classes[0].progress.bookScope.과목.상권, undefined);
  await F.toggleBookUnit('c1', '하권', 'h', true);
  봄('범위 밖 교재의 체크는 «선행»으로만', [cp().doneCount, cp().ahead, cp().percent], [0, 1, 0]);
  DATA.classes[0].progress.unitsByBook.과목.하권.a = true;
  봄('교재가 안 다루는 단원의 체크는 안 센다 (하권의 a)', cp().doneMap.a, undefined);
}

console.log(NL + '⑤ 교재를 빼도 체크는 남는다' + NL);
{
  const { F, DATA, cp } = 판({ subject: '과목', unitsBySubject: {}, booksBySubject: { 과목: ['개념서'] } });
  await F.toggleBookUnit('c1', '개념서', 'a', true);
  DATA.classes[0].progress.booksBySubject.과목 = [];
  봄('교재 없으면 반 체크(빈 것)로', cp().doneCount, 0);
  DATA.classes[0].progress.booksBySubject.과목 = ['개념서'];
  봄('다시 더하면 돌아온다', cp().doneCount, 1);
}

console.log(NL + (fail ? '🔴 ' + fail + '개 실패 · ' : '✓ 전부 통과 · ') + pass + '개' + NL);
process.exit(fail ? 1 : 0);
