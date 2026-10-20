/* 교재 «판» 표 · 시즌 꼬리표 (2026-10-21) — 사용자 「엔딩크레딧만 입력하면 년도와 1-2기말은 알아서 ·
   그 시즌일 때 엔딩크레딧 35번이라 하면 지금에 맞는 것으로」 · 교재 문제 요청이 1-2기말 번호를 1-2중간 문항으로 찾던 흠.

     node tools/book-edition-test.mjs

   🔴 무는 자리 — ① 책 번호 ≠ 일련번호(1-2기말 61번 = 0625) ② 학생은 «제 지금 시즌» 판만 ③ 이미 [해]를 적은 이름은 안 건드린다
   ⚠ 함수는 베끼지 않는다 — index.html 에서 그대로 뜬다. */
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
  let depth = 0;
  for (let j = html.indexOf('{', at); j < html.length; j++) {
    if (html[j] === '{') depth++;
    else if (html[j] === '}') { depth--; if (!depth) return html.slice(at, j + 1); }
  }
  throw new Error(name + ' 의 끝을 못 찾았습니다');
}
const liftConst = name => { const m = html.match(new RegExp('const ' + name + ' *=[^;]+;')); if (!m) throw new Error(name); return m[0]; };
let pass = 0, fail = 0;
const 봄 = (무엇, 나온것, 나와야) => {
  const ok = JSON.stringify(나온것) === JSON.stringify(나와야);
  if (ok) pass++; else fail++;
  console.log((ok ? '  ✓ ' : '  🔴 ') + 무엇 + (ok ? '' : NL + '      나온 것 ' + JSON.stringify(나온것) + NL + '      나와야 ' + JSON.stringify(나와야)));
};

const 이름들 = ['schoolYearOf', 'examSlotDone', 'examSeasonOf', 'seasonTagOf', 'classSeasonTag', 'bookWithSeason', 'bookTitleParts',
  'bookShortLabel', 'bookEditionsBuild', 'bookEditionOfCode', 'bookReqBooks', 'bookReqFind', 'bookReqLabelOf', 'bookEditionsSync'];
const 만들기 = (state, DATA, 반명단, kv) => new Function('state', 'DATA', 'classRoster', 'dbGet', 'dbSet', 'dbReadFailed',
  [liftConst('EXAM_SLOTS'), liftConst('SLOT_NAME'), liftConst('ITEM_CODE_RE'), liftConst('BOOK_OF_CODE'),
   'function examSlotOf(){ return null; }', 'function todayStr(){ return "2026-11-05"; }', 'function bookEditionsEnsure(){}',
   ...이름들.map(lift)].join(NL) + NL + 'return {' + 이름들.join(',') + '};')(
  state, DATA, () => 반명단 || [], async k => kv.값, async (k, v) => { kv.씀.push(v); return true; }, kv.실패 || new Set());

console.log(NL + '① 시즌 꼬리표');
{
  const F = 만들기({}, {}, [{ grade: '1' }, { grade: '1' }, { grade: '2' }], { 씀: [] });
  봄('기본 날 — 10-31 전은 2학기 중간 · 뒤는 기말 · 여름방학은 다음 시험',
    ['2026-10-01', '2026-11-05', '2026-08-01'].map(d => F.seasonTagOf('A', '1', d)),
    [{ year: 2026, part: '1-2중간' }, { year: 2026, part: '1-2기말' }, { year: 2026, part: '1-2중간' }]);
  봄('학년이 숫자가 아니면 꼬리표 없음', [F.seasonTagOf('A', 'r'), F.seasonTagOf('A', '')], [null, null]);
  봄('반은 가장 많은 학년', F.classSeasonTag('c1'), { year: 2026, part: '1-2기말' });
  봄('🔴 이름만 치면 붙는다', F.bookWithSeason('엔딩크레딧', { year: 2026, part: '1-2기말' }), '[2026][1-2기말][엔딩크레딧]');
  봄('🔴 이미 [해]를 적은 이름은 그대로', F.bookWithSeason('[2026][1-2중간]엔딩크레딧', { year: 2026, part: '1-2기말' }), '[2026][1-2중간]엔딩크레딧');
  봄('학생이 없는 반은 꼬리표 없이 그대로', F.bookWithSeason('개념서', 만들기({}, {}, [], { 씀: [] }).classSeasonTag('c9')), '개념서');
  봄('이름 읽기 — 대괄호 셋 · 둘+꼬리 · 꼬리표 없음',
    ['[2026][1-2기말][엔딩크레딧]', '[2026][1-2기말]엔딩크레딧', '쎈 수학(상)'].map(F.bookTitleParts),
    [{ year: 2026, part: '1-2기말', name: '엔딩크레딧' }, { year: 2026, part: '1-2기말', name: '엔딩크레딧' }, { year: null, part: '', name: '쎈 수학(상)' }]);
  봄('학생 고르개 짧은 이름', ['[2026][1-2기말][엔딩크레딧]', '쎈 수학(상)'].map(F.bookShortLabel), ['엔딩크레딧 (1-2기말)', '쎈 수학(상)']);
}

console.log(NL + '② 판 표 — 창고 books 에서');
const itemBody = {
  'K2-01-E-0061': { books: [{ name: '엔딩크레딧', part: '1-2중간', year: 2026, ch: '01', no: 61 }] },
  'K2-06-E-0625': { books: [{ name: '엔딩크레딧', part: '1-2기말', year: 2026, ch: '06', no: 61 }] },
  'K2-06-E-0599': { books: [{ name: '엔딩크레딧', part: '1-2기말', year: 2026, ch: '06', no: 35 }] },
  'K2-02-S-0007': {},
};
const 장부 = { 'K2-01-E-0061': {}, 'K2-06-E-0625': {}, 'K2-06-E-0599': {}, 'K2-02-S-0007': {} };
{
  const kv = { 값: null, 씀: [] };
  const F = 만들기({ itemBody }, {}, [], kv);
  const 표 = F.bookEditionsBuild();
  봄('판마다 책 번호 → 코드', 표, [
    { name: '엔딩크레딧', part: '1-2기말', year: 2026, nos: { 35: 'K2-06-E-0599', 61: 'K2-06-E-0625' } },
    { name: '엔딩크레딧', part: '1-2중간', year: 2026, nos: { 61: 'K2-01-E-0061' } }]);
  await F.bookEditionsSync();
  봄('kv 가 비었으면 쓴다', kv.씀.length, 1);
  const kv2 = { 값: { editions: 표 }, 씀: [] };
  await 만들기({ itemBody }, {}, [], kv2).bookEditionsSync();
  봄('같으면 안 쓴다 (쓰기 한도)', kv2.씀.length, 0);
  const kv3 = { 값: null, 씀: [], 실패: new Set(['book-editions']) };
  await 만들기({ itemBody }, {}, [], kv3).bookEditionsSync();
  봄('🔴 못 읽었으면 안 쓴다 (남의 것을 덮을 수 있다)', kv3.씀.length, 0);
}

console.log(NL + '③ 학생 «교재 문제 요청» — 지금 시즌 판으로');
{
  const 표 = 만들기({ itemBody }, {}, [], { 씀: [] }).bookEditionsBuild();
  const DATA = { students: [{ studentId: 's1', school: 'A', grade: '1' }, { studentId: 's2', school: 'A', grade: '2' }] };
  const F = 만들기({ bookEditions: 표, itemByCode: 장부, currentUser: { studentId: 's1' } }, DATA, [], { 씀: [] });
  const 책들 = F.bookReqBooks();
  봄('🔴 고1 기말 학생 — 엔딩크레딧은 1-2기말 판 하나 · 판 없는 책(S)은 옛 길', 책들,
    [{ code: 'ed:2026|1-2기말|엔딩크레딧', name: '엔딩크레딧 (1-2기말)' }, { code: 'S', name: '학교 기출' }]);
  봄('🔴 「엔딩크레딧 61」 → 1-2기말 61번 = K2-06-E-0625 (1-2중간 0061 이 아니다)', (F.bookReqFind(책들[0].code, '61') || {}).code, 'K2-06-E-0625');
  봄('35번 → 0599', (F.bookReqFind(책들[0].code, '35번') || {}).code, 'K2-06-E-0599');
  봄('그 판에 없는 번호는 없다', F.bookReqFind(책들[0].code, '62'), null);
  봄('이름표는 책 번호로', [F.bookReqLabelOf('K2-06-E-0625'), F.bookReqLabelOf('K2-02-S-0007')], ['엔딩크레딧 1-2기말 61번', '학교 기출 7']);
  const G = 만들기({ bookEditions: 표, itemByCode: 장부, currentUser: { studentId: 's2' } }, DATA, [], { 씀: [] });
  봄('고2 학생에겐 고1 판이 안 뜬다', G.bookReqBooks().map(b => b.code), ['S']);
  const H = 만들기({ bookEditions: [], itemByCode: 장부, currentUser: { studentId: 's1' } }, DATA, [], { 씀: [] });
  봄('판 표가 아직 없으면 옛 길 그대로', H.bookReqBooks().map(b => b.code), ['E', 'S']);
}

console.log(NL + (fail ? '🔴 ' : '✓ ') + pass + ' 통과 · ' + fail + ' 실패');
process.exit(fail ? 1 : 0);
