/* 교재는 시즌마다 (2026-10-18) — 사용자 「시즌이 끝나면 지난시즌 교재도 자동으로 정리 · 기록엔 남아 있어야 ·
   이전에 어떤 반에서 어떤 교재 했는지 확인 · 시즌 시작할 때 반마다 교재를 입력」.

     node tools/book-season-test.mjs

   🔴 무는 자리 셋 — ① 학교가 섞인 반은 «모두» 시험이 끝나야 옮긴다 ② 옮겨도 반의 «마친 단원»이 그대로다
   ③ 저장이 안 되면 메모리도 안 바꾼다. ⚠ 함수는 베끼지 않는다 — index.html 에서 그대로 뜬다. */
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
const 상수 = html.match(/const BOOK_ADDED_DEFAULT = '[^']+';/)[0];
let pass = 0, fail = 0;
const 봄 = (무엇, 나온것, 나와야) => {
  const ok = JSON.stringify(나온것) === JSON.stringify(나와야);
  if (ok) pass++; else fail++;
  console.log((ok ? '  ✓ ' : '  🔴 ') + 무엇 + (ok ? '' : NL + '      나온 것 ' + JSON.stringify(나온것) + NL + '      나와야 ' + JSON.stringify(나와야)));
};

const 단원 = ['u1', 'u2', 'u3', 'u4', 'u5', 'u6'];
/* 판 — 학교마다 «지난 시즌 끝»(stuSeasonCut)을 정해 두고, 저장소는 반 문서 통째 */
function 판(opt) {
  opt = opt || {};
  const 끝 = Object.assign({ A: '2026-10-15', B: '2026-07-20', '': '2026-07-31' }, opt.끝 || {});
  const 저장 = [], 말 = [];
  const 반 = opt.반 || [{ id: 'c1', name: '고1 A', progress: { subject: 'S',
    unitsBySubject: { S: { u1: true } },                        // 옛 반 체크 — 첫 책이 물려 읽는다
    booksBySubject: { S: ['개념서', '워크북', '옛책'] },
    bookAdded: { S: { 개념서: '2026-07-01', 워크북: '2026-10-16' } },
    unitsByBook: { S: { 워크북: { u4: true } } } } }];
  const 곁 = {
    DATA: { classes: 반, students: opt.학생 || [{ studentId: 's1', school: 'A', grade: '고1', c: 'c1' }, { studentId: 's2', school: 'B', grade: '고1', c: 'c1' }] },
    state: {},
    UNIT_CHAPTERS: { S: 단원 },
    presetChapters: s => 단원, currentSeason: () => '2학기 기말',
    classRoster: id => 곁.DATA.students.filter(s => s.c === id),
    stuSeasonCut: (school) => 끝[school] || '',
    examSeasonOf: (school, grade, ymd) => ymd < '2026-07-31' ? { year: '2026', slot: '1-fin' } : ymd < '2026-08-20'
      ? { year: '2026', slot: null, next: { year: '2026', slot: '2-mid' } } : { year: '2026', slot: '2-mid' },
    SLOT_NAME: { '1-fin': '1학기 기말', '2-mid': '2학기 중간' },
    todayStr: () => '2026-10-18',
    authIsReal: () => opt.강사 !== false, fbAuth: { currentUser: { email: 'admin@t' } },
    authWhoOf: () => ({ role: opt.강사 === false ? 'assistant' : 'teacher' }),
    dbReadFailed: new Set(opt.못읽음 || []),
    dbSetDoc: async (col, id, doc) => { if (opt.못씀) return null; 저장.push(JSON.parse(JSON.stringify(doc))); return true; },
    logAudit: async () => {}, showToast: m => 말.push(m),
  };
  const 이름들 = ['stampBookAdded', 'pastBookTitles', 'classSeasonCut', 'bookSeasonLabel', 'booksToArchive',
    'archivePastBooks', 'bookDoneOf', 'bookUnitsOf', 'getClassProgress'];
  const api = new Function(...Object.keys(곁), 상수 + NL + 'let bookArchiveDone = false;' + NL
    + 이름들.map(lift).join(NL) + NL + 'return { ' + 이름들.join(', ') + ' };')(...Object.values(곁));
  return { api, 곁, 저장, 말 };
}
const 책 = T => T.곁.DATA.classes[0].progress.booksBySubject.S;
const 기록 = T => (T.곁.DATA.classes[0].progress.bookHistory || []).map(h => [h.title, h.from, h.to, h.season]);

console.log(NL + '① 언제 옮기나 — 반 학생 «모두»가 지나간 시험 날보다 앞서 적은 책만' + NL);
{
  const T = 판();
  봄('🔴 학교가 섞이면 «가장 이른» 끝 (B 가 아직 7-20)', T.api.classSeasonCut('c1'), '2026-07-20');
  await T.api.archivePastBooks();
  봄('🔴 7-20 앞에 적은 «개념서»만 옮긴다', 책(T), ['워크북', '옛책']);
  봄('   기록에 남는다 (책 · 적은 날 · 끝난 날 · 시즌)', 기록(T), [['개념서', '2026-07-01', '2026-07-20', '2026 1학기 기말']]);
  봄('   저장은 한 번', T.저장.length, 1);
  봄('   몇 권 옮겼는지 말한다', /1권/.test(T.말.join(' ')), true);
}
{
  const T = 판({ 끝: { B: '2026-10-20' } });
  봄('B 도 시험을 마치면 끝은 10-15', T.api.classSeasonCut('c1'), '2026-10-15');
  await T.api.archivePastBooks();
  봄('🔴 10-15 뒤에 적은 «워크북»과 날 없는 옛 책(올린 날로 친다)은 남는다', 책(T), ['워크북', '옛책']);
}
{
  const T = 판({ 학생: [{ studentId: 's1', school: 'A', c: 'c1' }, { studentId: 's9', school: 'Z', c: 'c1' }] });
  await T.api.archivePastBooks();
  봄('🔴 끝난 시험이 없는 학생이 하나라도 있으면 아무것도 안 옮긴다', [책(T).length, T.저장.length], [3, 0]);
}

console.log(NL + '② 옮겨도 «마친 단원»은 그대로 · 새 시즌 첫 책은 옛 체크를 안 물려받는다' + NL);
{
  const T = 판();
  const 전 = Object.keys(T.api.getClassProgress('c1').doneMap).sort();
  await T.api.archivePastBooks();
  const p = T.곁.DATA.classes[0].progress;
  봄('🔴 옛 반 체크를 물려 읽던 첫 책은 그 체크를 제 것으로 굳힌다', p.unitsByBook.S.개념서, { u1: true });
  봄('🔴 반의 마친 단원이 옮기기 전과 같다', Object.keys(T.api.getClassProgress('c1').doneMap).sort(), 전);
  p.booksBySubject.S = ['새책'];
  봄('🔴 새 시즌 첫 책은 옛 반 체크(u1)를 안 물려받는다', T.api.bookDoneOf(T.곁.DATA.classes[0], 'S', '새책'), {});
  p.booksBySubject.S = [];
  봄('   이번 시즌 책이 비어도 마친 단원은 지난 책(개념서의 u1)에서 온다', Object.keys(T.api.getClassProgress('c1').doneMap).sort(), ['u1']);
}

console.log(NL + '③ 안 하는 때' + NL);
{
  const T = 판({ 못씀: true });
  await T.api.archivePastBooks();
  봄('🔴 저장이 안 되면 메모리도 그대로 (다음에 다시 한다)', [책(T), 기록(T)], [['개념서', '워크북', '옛책'], []]);
}
{
  const T = 판({ 못읽음: ['exam-ranges'] });
  await T.api.archivePastBooks();
  봄('🔴 시험 일정을 못 읽었으면 안 옮긴다 (기본 날로 셈하면 시험 전에 사라진다)', T.저장.length, 0);
}
{
  const T = 판({ 강사: false });
  await T.api.archivePastBooks();
  봄('조교는 안 한다 (반 쓰기는 강사뿐)', T.저장.length, 0);
}
{
  const T = 판();
  await T.api.archivePastBooks(); await T.api.archivePastBooks();
  봄('한 번 들어올 때 한 번만', T.저장.length, 1);
}

console.log(NL + (fail ? '🔴 ' : '✓ ') + pass + ' 통과 · ' + fail + ' 실패');
process.exit(fail ? 1 : 0);
