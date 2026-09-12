// 진도 기록 — 그날 「무슨 책으로 어디까지」가 제대로 남고, 엉뚱한 데 안 쓰이는가 (2026-09-12 · P-1)
//
//   node tools/class-prog-test.mjs
//
// 🔴 **왜 재는가** — 사용자가 시켰다. 「진도쓰는 곳에 교재선택하는 것과 텍스트로 디테일하게
//   어디까지 했는지 뭐했는지 적는곳이 있었으면 좋겠어」. 그런데 이 기능은 **조용히 틀릴 자리**가 셋이다:
//     ① **초안이 저장본을 덮는 자리** — 단계를 옮겨도 글이 안 날아가게 초안을 쓰는데,
//        그 초안을 «저장된 것»으로 세면 아직 안 쓴 글이 일지에 뜨고 「진도 적힘」이 거짓이 된다.
//     ② **저절로 저장이 엉뚱한 반에 쓰는 자리** — 화면은 이미 다른 반으로 옮겨 갔는데
//        지금 화면의 반에 쓰면 **남의 반 일지에 오늘 진도가 박힌다.** 초안의 key 가 진실이어야 한다.
//     ③ **빈 껍데기가 남는 자리** — 다 지웠는데 키가 남으면 일지에 빈 줄이 서고 「진도 적힘」이 거짓이 된다.
//
// 🔴 **함수를 여기에 옮겨 적지 않는다.** index.html 에서 그대로 떠 온다 — 두 벌이면 한쪽만 고쳐진다.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const NL = String.fromCharCode(10);

/* ⚠ `async` 를 떼면 몸통의 `await` 가 문법 흠이 된다 (class-edit-test 가 밟았던 자리). */
function lift(name){
  let at = html.indexOf('function ' + name + '(');
  if(at < 0) throw new Error(name + ' 를 못 찾았습니다');
  if(html.slice(at - 6, at) === 'async ') at -= 6;
  let depth = 0;
  for(let j = html.indexOf('{', at); j < html.length; j++){
    if(html[j] === '{') depth++;
    else if(html[j] === '}'){ depth--; if(!depth) return html.slice(at, j + 1); }
  }
  throw new Error(name + ' 의 끝을 못 찾았습니다');
}

let pass = 0, fail = 0;
const 봄 = (무엇, 나온것, 나와야) => {
  const ok = JSON.stringify(나온것) === JSON.stringify(나와야);
  if(ok){ pass++; console.log('  ✓ ' + 무엇); }
  else { fail++; console.log(`  ✗ ${무엇}${NL}      나온 것: ${JSON.stringify(나온것)}${NL}      나와야:  ${JSON.stringify(나와야)}`); }
};

const 이름들 = ['classProgKey','classProgSaved','classProgEntry','classProgInput',
  'saveClassProg','sessionAutoSaveProg','removeClassProgEntry','classProgRecent','addProgBook'];

/* 화면 밖의 것들을 흉내 낸다. 저장·기록·알림은 «무엇을 어디에 썼는지»를 모아 둔다. */
function 판(opts){
  const o = opts || {};
  const 쓴것 = [], 기록 = [], 말 = [], 칸 = o.칸 || {};
  const DATA = { classes: o.classes || [{ id:'c1', name:'고1A',
    progress:{ subject:'수학상', unitsBySubject:{}, booksBySubject:{ 수학상:['쎈 수학(상)'] } } }] };
  const state = {
    classProgLogs: o.logs || { c1: {} },
    classProgLogLoading: {},
    classProgDraft: o.draft || null,
    classProgEditDate: '',
    classProgBookAdd: false,
  };
  const F = new Function('DATA','state','document','dbSet','dbSetDoc','logAudit','showToast','render','getClassProgress','classNameOf',
    이름들.map(lift).join(NL) + NL + 'return {' + 이름들.join(',') + '};')(
    DATA, state,
    { getElementById: (id) => (id in 칸) ? { value: 칸[id] } : null },
    async (k, v) => 쓴것.push({ 문서:k, 값: JSON.parse(JSON.stringify(v)) }),
    async (col, id, doc) => 쓴것.push({ 컬렉션:col, id, doc: JSON.parse(JSON.stringify(doc)) }),
    async (a,b,c,d) => 기록.push(a + ' · ' + d),
    (m) => 말.push(m),
    () => {},
    (cid) => {
      const c = DATA.classes.find(x=>x.id===cid);
      const subject = (c && c.progress && c.progress.subject) || '';
      return { subject, books: (c && c.progress && c.progress.booksBySubject && c.progress.booksBySubject[subject]) || [] };
    },
    (cid) => (DATA.classes.find(x=>x.id===cid) || {}).name || '');
  return { F, DATA, state, 쓴것, 기록, 말 };
}

console.log(NL + '── 저장과 지우기 ──');
{
  const { F, state, 쓴것, 말 } = 판({ 칸:{ 'prog-detail':'쎈 p.45~62 · 3단원 예제 전부' } });
  F.classProgInput('c1','2026-09-12','book','쎈 수학(상)');
  await F.saveClassProg('c1','2026-09-12');
  const e = state.classProgLogs.c1['2026-09-12'];
  봄('그날 것이 남는다', [e.book, e.detail, e.subject], ['쎈 수학(상)','쎈 p.45~62 · 3단원 예제 전부','수학상']);
  봄('kv 문서 하나에 쓴다 (컬렉션을 안 늘린다)', 쓴것.map(x=>x.문서), ['classprog:c1']);
  봄('메모(classnote:)와 다른 통이다', 쓴것.some(x=>String(x.문서).startsWith('classnote:')), false);
  봄('초안은 비워 둔다', state.classProgDraft, null);
  봄('한 마디 한다', 말, ['진도를 저장했습니다.']);
}
{
  /* 🔴 ③ 다 지웠는데 키가 남으면 일지에 빈 줄이 선다. */
  const { F, state } = 판({ logs:{ c1:{ '2026-09-12':{ book:'쎈', detail:'p.1' } } }, 칸:{ 'prog-detail':'   ' } });
  F.classProgInput('c1','2026-09-12','book','');
  await F.saveClassProg('c1','2026-09-12');
  봄('둘 다 비면 그날 키가 사라진다', Object.keys(state.classProgLogs.c1), []);
}
{
  const { F, state } = 판({ logs:{ c1:{ '2026-09-10':{ book:'쎈', detail:'p.1' } } } });
  await F.removeClassProgEntry('c1','2026-09-10');
  봄('빼면 없다', Object.keys(state.classProgLogs.c1), []);
}

console.log(NL + '── ① 초안과 저장본을 가른다 ──');
{
  const { F, state } = 판({ logs:{ c1:{ '2026-09-12':{ book:'쎈', detail:'저장된 것' } } } });
  F.classProgInput('c1','2026-09-12','detail','아직 안 저장한 글');
  봄('화면은 초안을 본다', F.classProgEntry('c1','2026-09-12').detail, '아직 안 저장한 글');
  봄('🔴 일지는 초안을 «안» 본다', F.classProgSaved('c1','2026-09-12').detail, '저장된 것');
  봄('초안은 그 날짜에만 듣는다', F.classProgEntry('c1','2026-09-11').detail, '');
  봄('초안이 있어도 다른 날은 저장본 그대로', F.classProgSaved('c1','2026-09-11'), null);
  /* 초안이 book 만 건드려도 detail 은 저장본에서 이어받아야 한다 — 안 그러면 글이 통째로 날아간다. */
  const { F: F2 } = 판({ logs:{ c1:{ '2026-09-12':{ book:'쎈', detail:'원래 글' } } } });
  F2.classProgInput('c1','2026-09-12','book','개념원리');
  봄('교재만 바꿔도 글은 안 날아간다', F2.classProgEntry('c1','2026-09-12'), { book:'개념원리', detail:'원래 글' });
}

console.log(NL + '── ② 저절로 저장은 «초안의 반·날짜»로 간다 ──');
{
  const { F, state, 쓴것 } = 판({
    classes:[{ id:'c1', name:'고1A', progress:{ subject:'수학상', booksBySubject:{} } },
             { id:'c2', name:'고2B', progress:{ subject:'수학하', booksBySubject:{} } }],
    logs:{ c1:{}, c2:{} },
    draft:{ key:'c1|2026-09-12', book:'쎈', detail:'c1 에 적던 글' } });
  /* 화면은 이미 c2 로 옮겨 갔다고 치고 — 그래도 c1 에 써야 한다. */
  await F.sessionAutoSaveProg();
  봄('🔴 초안이 가리키던 반에 쓴다', 쓴것.map(x=>x.문서), ['classprog:c1']);
  봄('c1 에 남았다', Object.keys(state.classProgLogs.c1), ['2026-09-12']);
  봄('c2 는 안 건드렸다', Object.keys(state.classProgLogs.c2), []);
  봄('저절로 저장은 조용하다(토스트 없음)', state.classProgDraft, null);
}
{
  const { F, 쓴것 } = 판({ logs:{ c1:{ '2026-09-12':{ book:'쎈', detail:'같은 글' } } },
    draft:{ key:'c1|2026-09-12', book:'쎈', detail:'같은 글' } });
  await F.sessionAutoSaveProg();
  봄('바뀐 것이 없으면 «안 쓴다»', 쓴것.length, 0);
}
{
  const { F, 쓴것 } = 판({ draft:null });
  await F.sessionAutoSaveProg();
  봄('초안이 없으면 안 쓴다', 쓴것.length, 0);
}

console.log(NL + '── 지난 회차 ──');
{
  const { F } = 판({ logs:{ c1:{
    '2026-09-05':{ book:'쎈', detail:'a' }, '2026-09-08':{ book:'쎈', detail:'b' },
    '2026-09-10':{ book:'쎈', detail:'c' }, '2026-09-12':{ book:'쎈', detail:'오늘' } } } });
  봄('그날보다 «앞»의 것만, 최근 순', F.classProgRecent('c1','2026-09-12',3).map(x=>x.date),
     ['2026-09-10','2026-09-08','2026-09-05']);
  봄('오늘 것은 「지난 회차」에 안 낀다', F.classProgRecent('c1','2026-09-12',3).some(x=>x.date==='2026-09-12'), false);
  봄('before 가 비면 전부 (일지)', F.classProgRecent('c1','',0).length, 4);
}

console.log(NL + '── 교재를 그 자리에서 더한다 ──');
{
  const { F, DATA, state, 기록 } = 판({ 칸:{ 'pb':'개념원리 수학(상)' } });
  await F.addProgBook('c1','2026-09-12','pb');
  봄('반 › 진도의 교재 목록에 들어간다', DATA.classes[0].progress.booksBySubject.수학상,
     ['쎈 수학(상)','개념원리 수학(상)']);
  봄('🔵 더한 것이 «오늘 것»으로 골라진 채 돌아온다', F.classProgEntry('c1','2026-09-12').book, '개념원리 수학(상)');
  봄('더하는 칸은 닫힌다', state.classProgBookAdd, false);
  봄('장부에 남는다', 기록, ['교재 등록 · 고1A · 수학상 · 개념원리 수학(상)']);
}
{
  const { F, DATA, 기록 } = 판({ 칸:{ 'pb':'쎈 수학(상)' } });
  await F.addProgBook('c1','2026-09-12','pb');
  봄('이미 있는 교재는 두 번 안 넣는다', DATA.classes[0].progress.booksBySubject.수학상, ['쎈 수학(상)']);
  봄('두 번 넣지 않았으니 장부도 조용하다', 기록, []);
  봄('그래도 오늘 것으로는 골라 준다', F.classProgEntry('c1','2026-09-12').book, '쎈 수학(상)');
}
{
  const { F, DATA, 말 } = 판({ 칸:{ 'pb':'   ' } });
  await F.addProgBook('c1','2026-09-12','pb');
  봄('빈 이름은 안 넣는다', DATA.classes[0].progress.booksBySubject.수학상, ['쎈 수학(상)']);
  봄('까닭을 말해 준다', 말, ['교재 이름을 적어 주세요.']);
}
{
  const { F, DATA, 말 } = 판({ classes:[{ id:'c1', name:'고1A', progress:{ subject:'', booksBySubject:{} } }],
    칸:{ 'pb':'쎈' } });
  await F.addProgBook('c1','2026-09-12','pb');
  봄('과목이 없으면 멈추고 까닭을 말한다', 말, ['과목을 먼저 고르세요.']);
  봄('아무것도 안 넣었다', DATA.classes[0].progress.booksBySubject, {});
}

console.log(NL + '── 화면이 이 값을 실제로 쓰는가 (index.html 을 글자로 본다) ──');
{
  const 있나 = (무엇, 조각) => 봄(무엇, html.indexOf(조각) >= 0, true);
  있나('수업 › 진도 단계가 날짜를 받는다', 'function sessionProgHTML(classId, date)');
  있나('부르는 쪽도 날짜를 준다', 'sessionProgHTML(classId, date)');
  있나('나갈 때 저절로 저장한다', 'await sessionAutoSaveProg();');
  있나('수업 화면이 일지를 불러온다', 'loadClassProgLogIfNeeded(classId);');
  있나('글칸이 섰다', 'id="prog-detail"');
  있나('교재 고르개가 섰다', 'progBookPickerHTML(classId, date, books || [], \'prog-book-new\')');
  있나('지난 회차가 보인다', 'prog-past');
  있나('반 › 진도에 일지가 섰다', 'prog-log');
  있나('지난 수업 확인에 그날 진도가 보인다', '그날 진도');
  있나('수업 기록에 「진도 적힘」 거르개가 있다', "pill('prog', '진도 적힘'");
  /* 🔴 메모 통을 안 건드렸는가 — 진도를 메모에 밀어 넣으면 둘 다 못 훑게 된다. */
  봄('메모는 여전히 제 통에 쓴다', html.indexOf("dbSet('classnote:' + classId, map)") >= 0, true);
}

console.log(NL + (fail ? `🔴 ${fail}개 넘어짐 (통과 ${pass})` : `✅ 전부 통과 (${pass}가지)`));
process.exit(fail ? 1 : 0);
