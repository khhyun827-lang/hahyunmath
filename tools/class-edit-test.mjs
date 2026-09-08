// 만든 반을 고친다 — 값이 제대로 바뀌고, 딸린 것이 안 날아가는가 (2026-09-08)
//
//   node tools/class-edit-test.mjs
//
// 🔴 **왜 재는가** — 사용자가 짚었다. 「올려놓은 반 시간 수정이 안되네. 이미 올려둔 반에
//   대해서 수정가능하게 했으면 좋겠어」. 여태 만들기·종료·삭제만 있어서, 오타 하나를
//   고치려면 **반을 지우고 다시 만들어야 했고 그러면 출결·성적·과제가 통째로 날아갔다.**
//   🔵 그래서 이 검사가 붙드는 것은 «고쳐지는가»보다 **«고칠 때 딴것이 안 날아가는가»**다.
//
// 🔴 **함수를 여기에 옮겨 적지 않는다.** index.html 에서 그대로 떠 온다.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const NL = String.fromCharCode(10);

/* ⚠ **`async` 를 떼면 안 된다** — 떼고 나면 몸통의 `await` 가 문법 흠이 된다.
   이 저장소의 다른 검사들은 동기 함수만 떠 와서 이 자리를 안 밟았다. */
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

/* 화면 밖의 것들을 흉내 낸다. 저장·기록·알림은 «불렀는지»만 센다. */
function 판(반들, 칸){
  const 쓴것 = [], 기록 = [], 말 = [];
  const DATA = {classes: 반들};
  const state = {classEditId: 반들[0] && 반들[0].id};
  const F = new Function('DATA', 'state', 'document', 'dbSetDoc', 'logAudit', 'showToast', 'render', 'escHtml',
    lift('saveClassEdit') + NL + lift('classEditOpen') + NL + lift('classEditHTML')
    + NL + 'return {saveClassEdit, classEditOpen, classEditHTML};')(
    DATA, state,
    {getElementById: (id) => (id in 칸) ? {value: 칸[id]} : null},
    async (col, id, doc) => 쓴것.push({col, id, doc}),
    async (a, b, c, d) => 기록.push(d),
    (m) => 말.push(m),
    () => {},
    (s) => String(s == null ? '' : s));
  return {F, DATA, state, 쓴것, 기록, 말};
}
const 반하나 = () => [{id:'c1', name:'고10.5B', schedule:'화,목 19시반~22시, 토 14시~16시',
  period:'26.03~26.12', status:'진행중', kind:'정규',
  /* 🔴 이 셋이 «딸린 것»이다 — 고치다 날아가면 안 된다. */
  progress:{subject:'공통수학2', done:['01','02']}, books:['천재홍'], memo:'중요'}];

// ── ① 값이 바뀐다 ────────────────────────────────────────────────────
console.log(NL + '① 시간을 고친다' + NL);
{
  const 반들 = 반하나();
  const {F, DATA, 쓴것, 기록, state} = 판(반들, {
    'ce-namec1':'고10.5B', 'ce-schedc1':'화,목 18시~21시, 토 10시~14시',
    'ce-periodc1':'26.03~26.12', 'ce-kindc1':'정규'});
  await F.saveClassEdit('c1');
  봄('시간이 바뀐다', DATA.classes[0].schedule, '화,목 18시~21시, 토 10시~14시');
  봄('Firestore 에 한 번 쓴다', 쓴것.length, 1);
  봄('   컬렉션과 문서 id 가 맞다', [쓴것[0].col, 쓴것[0].id], ['classes', 'c1']);
  봄('🔴 변경 이력에 남는다', 기록.length, 1);
  봄('   무엇이 어떻게 바뀌었는지 적는다',
     기록[0], '고10.5B — 시간 화,목 19시반~22시, 토 14시~16시→화,목 18시~21시, 토 10시~14시');
  봄('고치고 나면 폼이 닫힌다', state.classEditId, '');
}

// ── ② 🔴 딸린 것이 안 날아간다 ──────────────────────────────────────
console.log(NL + '② 🔴 고쳐도 딸린 것이 안 날아간다' + NL);
{
  const 반들 = 반하나();
  const {F, DATA, 쓴것} = 판(반들, {
    'ce-namec1':'고1 0.5B', 'ce-schedc1':'화,목 19시반~22시, 토 14시~16시',
    'ce-periodc1':'26.03~26.12', 'ce-kindc1':'정규'});
  await F.saveClassEdit('c1');
  /* 🔴 통째로 새 객체를 만들어 쓰면 여기가 무너진다 — 그래서 `Object.assign` 으로 덮는다. */
  봄('🔴 진도가 그대로', DATA.classes[0].progress, {subject:'공통수학2', done:['01','02']});
  봄('🔴 교재가 그대로', DATA.classes[0].books, ['천재홍']);
  봄('🔴 상태가 그대로', DATA.classes[0].status, '진행중');
  봄('   메모도 그대로', DATA.classes[0].memo, '중요');
  봄('   쓴 문서에도 딸린 것이 들어 있다', 쓴것[0].doc.books, ['천재홍']);
  봄('이름은 바뀐다', DATA.classes[0].name, '고1 0.5B');
}

// ── ③ 막는 것들 ─────────────────────────────────────────────────────
console.log(NL + '③ 막는 것 — 빈 이름 · 안 바뀐 값' + NL);
{
  const 반들 = 반하나();
  const {F, DATA, 쓴것, 말} = 판(반들, {
    'ce-namec1':'   ', 'ce-schedc1':'화 1시~2시', 'ce-periodc1':'', 'ce-kindc1':'정규'});
  await F.saveClassEdit('c1');
  봄('🔴 이름을 비우면 저장하지 않는다', 쓴것.length, 0);
  봄('   그리고 시간도 안 바뀐다', DATA.classes[0].schedule, '화,목 19시반~22시, 토 14시~16시');
  봄('   까닭을 말한다', 말[0], '반 이름을 비울 수 없습니다.');

  const 반들2 = 반하나();
  const b = 판(반들2, {'ce-namec1':'고10.5B', 'ce-schedc1':'화,목 19시반~22시, 토 14시~16시',
    'ce-periodc1':'26.03~26.12', 'ce-kindc1':'정규'});
  await b.F.saveClassEdit('c1');
  /* ⚠ 안 바뀐 것을 쓰면 변경 이력이 «아무 일도 없었던 줄»로 지저분해진다. */
  봄('⚠ 바뀐 값이 없으면 안 쓴다', b.쓴것.length, 0);
  봄('   변경 이력에도 안 남는다', b.기록.length, 0);
  봄('   그래도 폼은 닫힌다', b.state.classEditId, '');

  const c = 판(반하나(), {});
  await c.F.saveClassEdit('없는반');
  봄('없는 반이면 아무 일도 안 한다', [c.쓴것.length, c.기록.length], [0, 0]);
}

// ── ④ 폼이 지금 값을 들고 열린다 ────────────────────────────────────
console.log(NL + '④ 폼은 «지금 값»을 들고 열린다' + NL);
{
  const 반들 = 반하나();
  const {F, state} = 판(반들, {});
  const h = F.classEditHTML(반들[0]);
  봄('시간 칸에 지금 값이 들어 있다', h.includes('value="화,목 19시반~22시, 토 14시~16시"'), true);
  봄('이름 칸에도', h.includes('value="고10.5B"'), true);
  봄('기간 칸에도', h.includes('value="26.03~26.12"'), true);
  봄('갈래가 지금 것으로 골라져 있다', h.includes('<option selected>정규</option>'), true);
  /* 🔴 열지 않은 반의 폼은 그리지 않는다 — 목록이 통째로 폼이 되면 못 읽는다. */
  state.classEditId = '';
  봄('🔴 안 연 반은 폼을 안 그린다', F.classEditHTML(반들[0]), '');
  state.classEditId = 'c1';
  F.classEditOpen('c1');
  봄('같은 반을 다시 누르면 닫힌다', state.classEditId, '');
  F.classEditOpen('c1');
  봄('다시 누르면 열린다', state.classEditId, 'c1');
}

// ── ⑤ 망가뜨려 무는지 ───────────────────────────────────────────────
console.log(NL + '⑤ ⚠ 망가뜨려 무는지 본다' + NL);
{
  /* 딸린 것을 지키는 것은 «덮어쓰기»(Object.assign)다. 통째로 갈아 끼우면 다 날아간다. */
  const 지키는줄 = 'Object.assign(c, 후);';
  봄('⚠ 덮어쓰는 줄이 실제로 그 글자다', lift('saveClassEdit').includes(지키는줄), true);
  /* «통째로 갈아 끼운다»를 흉내 낸다 — id 만 남기고 나머지를 지운 뒤 새 값을 얹는다. */
  const 망친 = lift('saveClassEdit').split(지키는줄)
    .join("Object.keys(c).forEach(k => { if(k !== 'id') delete c[k]; }); Object.assign(c, 후);");
  const 반들 = 반하나();
  const 쓴것 = [];
  const state = {classEditId:'c1'};
  const G = new Function('DATA','state','document','dbSetDoc','logAudit','showToast','render','escHtml',
    망친 + NL + 'return {saveClassEdit};')(
    {classes: 반들}, state,
    {getElementById:(id)=>({value:({'ce-namec1':'새이름','ce-schedc1':'월 1시~2시',
      'ce-periodc1':'','ce-kindc1':'정규'})[id] || ''})},
    async (col,id,doc)=>쓴것.push(doc), async ()=>{}, ()=>{}, ()=>{}, (s)=>String(s==null?'':s));
  await G.saveClassEdit('c1');
  봄('⚠ 통째로 갈아 끼우면 진도가 날아간다(=검사가 문다)',
     반들[0].progress === undefined, true);
}

console.log(`${NL}  ${fail ? '🔴' : '✅'} ${pass} 통과 · ${fail} 실패${NL}`);
process.exit(fail ? 1 : 0);
