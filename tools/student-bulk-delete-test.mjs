// 설정 › 학생 — 골라서 한꺼번에 지우기 (2026-09-12 · S-1)
//
//   node tools/student-bulk-delete-test.mjs
//
// 🔴 **왜 재는가** — 사용자가 시켰다. 「명단을 잘못추가해서 삭제하고싶은데 한명한명 눌러서
//   삭제해야하네. 앞에 체크해서 일괄삭제하는게 가능하도록 해줘」. 그런데 이것은
//   **되돌릴 수 없는 일**이고, 조용히 틀리면 **남의 기록이 사라진다.** 무는 자리는 넷이다:
//     ① **고른 수와 지우는 수가 달라지는 자리** — 이미 지운 아이디가 맵에 남아 있으면
//        「12명 삭제」라 적어 놓고 10명을 지운다. 화면의 수와 하는 일이 늘 같아야 한다.
//     ② **안 보이는 사람이 함께 지워지는 자리** — 「1반」을 골라 두고 검색을 「2반」으로 바꾼 뒤
//        삭제를 누르면 1반이 함께 사라진다. 막지는 않되 **수를 세어 말할 수 있어야** 한다.
//     ③ **하나가 터지면 멈추는 자리** — 앞의 것은 이미 지워졌는데 화면이 아무 말도 안 하면
//        「지운 줄 알았던」 학생이 남는다. 터져도 끝까지 가고 무엇이 안 됐는지 말해야 한다.
//     ④ **묻지 않고 지우는 자리** — 취소를 눌렀는데 하나라도 지워지면 그것으로 끝이다.
//
// 🔴 **함수를 여기에 옮겨 적지 않는다.** index.html 에서 그대로 떠 온다.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const NL = String.fromCharCode(10);

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

const 이름들 = ['deleteStudentWork','deleteStudent','stuToggleCheck','stuCheckAll',
  'stuCheckedSids','deleteCheckedStudents'];

/* 화면 밖의 것을 흉내 낸다. 지운 것·장부·알림·물음을 모아 둔다. */
function 판(opts){
  const o = opts || {};
  const 지운문서 = [], 지운계정 = [], 장부 = [], 말 = [], 물음 = [];
  const DATA = { students: (o.students || [
    { studentId:'a1', name:'김가' }, { studentId:'a2', name:'이나' },
    { studentId:'a3', name:'박다' }, { studentId:'a4', name:'최라', withdrawnAt:'2026-08-01' },
  ]).map(x => Object.assign({}, x)) };
  const state = { stuChecked: Object.assign({}, o.checked || {}), stuBulkBusy: null, stuEditId: null };
  const 답 = o.답 === undefined ? true : o.답;
  const F = new Function('DATA','state','confirm','dbDeleteDoc','adminDeleteUser','logAudit',
    'showToast','render','studentKeyOfSid','isWithdrawn','console',
    이름들.map(lift).join(NL) + NL + 'return {' + 이름들.join(',') + '};')(
    DATA, state,
    (q) => { 물음.push(q); return 답; },
    async (col, key) => {
      /* 어느 컬렉션·누구에서 터뜨릴지 시험이 고른다 — 「students 가 터지면 그 사람은 그대로 남는다」와
         「records 만 터지면 사람은 지워졌지만 기록이 남는다」는 **다른 일**이라 갈라 봐야 한다. */
      const 터질것 = o.문서실패 || {};
      const sid = String(key).replace(/^key_/, '');
      if((터질것[sid] || []).indexOf(col) >= 0) throw new Error(col + ' 못 지움');
      지운문서.push(col + '/' + key);
    },
    async (kind, sid) => {
      if((o.계정실패 || []).indexOf(sid) >= 0) throw new Error('계정 못 지움');
      지운계정.push(sid);
    },
    async (a,b,c,d) => 장부.push(a + '|' + b + '|' + d),
    (m) => 말.push(m),
    () => {},
    (sid) => 'key_' + sid,
    (s) => !!(s && s.withdrawnAt),
    { error: () => {} });
  return { F, DATA, state, 지운문서, 지운계정, 장부, 말, 물음 };
}

console.log(NL + '── 고르기 ──');
{
  const { F, state } = 판();
  F.stuToggleCheck('a1');
  F.stuToggleCheck('a3');
  봄('고른 것이 쌓인다', F.stuCheckedSids(), ['a1','a3']);
  F.stuToggleCheck('a1');
  봄('다시 누르면 놓는다', F.stuCheckedSids(), ['a3']);
  F.stuCheckAll(['a1','a2','a3','a4'], true);
  봄('전체 선택', F.stuCheckedSids(), ['a1','a2','a3','a4']);
  F.stuCheckAll(['a1','a2','a3','a4'], false);
  봄('전체 해제', F.stuCheckedSids(), []);
}
{
  /* 🔴 ① 없는 아이디가 맵에 남아도 수가 부풀면 안 된다. */
  const { F } = 판({ checked:{ a1:true, 없는사람:true, a4:true } });
  봄('🔴 «있는 사람»만 센다', F.stuCheckedSids(), ['a1','a4']);
}
{
  /* ⚠ 「전체 선택」이 «보이는 것»만 켜는가 — 부르는 쪽이 준 목록만 건드려야 한다. */
  const { F } = 판({ checked:{ a4:true } });
  F.stuCheckAll(['a1','a2'], true);
  봄('보이는 것만 켠다 (a3 는 안 켜진다)', F.stuCheckedSids(), ['a1','a2','a4']);
  F.stuCheckAll(['a1','a2'], false);
  봄('끌 때도 보이는 것만 (a4 는 그대로)', F.stuCheckedSids(), ['a4']);
}

console.log(NL + '── ④ 묻고 나서 지운다 ──');
{
  const { F, DATA, 지운문서, 물음 } = 판({ checked:{ a1:true, a2:true }, 답:false });
  await F.deleteCheckedStudents();
  봄('🔴 취소하면 아무것도 안 지운다', 지운문서, []);
  봄('학생은 그대로', DATA.students.length, 4);
  봄('한 번만 묻는다', 물음.length, 1);
  봄('이름을 보여 준다', /김가 \(a1\)/.test(물음[0]) && /이나 \(a2\)/.test(물음[0]), true);
  봄('되돌릴 수 없다고 말한다', /되돌릴 수 없습니다/.test(물음[0]), true);
}
{
  const { F, 물음 } = 판({ checked:{ a1:true, a4:true } , 답:false });
  await F.deleteCheckedStudents();
  봄('퇴원생이 섞이면 미리 말한다', /1명은 퇴원 처리된 학생입니다/.test(물음[0]), true);
  봄('퇴원 딱지도 이름 옆에', /최라 \(a4\) \[퇴원\]/.test(물음[0]), true);
}
{
  const { F, 말, 물음 } = 판({ checked:{} });
  await F.deleteCheckedStudents();
  봄('고른 것이 없으면 묻지도 않는다', 물음, []);
  봄('까닭을 말한다', 말, ['고른 학생이 없습니다.']);
}

console.log(NL + '── 지운다 ──');
{
  const { F, DATA, state, 지운문서, 지운계정, 장부, 말 } = 판({ checked:{ a1:true, a3:true } });
  await F.deleteCheckedStudents();
  봄('고른 둘만 사라진다', DATA.students.map(s=>s.studentId), ['a2','a4']);
  봄('딸린 문서 셋을 다 지운다', 지운문서,
     ['students/key_a1','contacts/key_a1','records/key_a1',
      'students/key_a3','contacts/key_a3','records/key_a3']);
  봄('로그인 계정도 지운다', 지운계정, ['a1','a3']);
  봄('🔴 고른 것이 비워진다', F.stuCheckedSids(), []);
  /* ⚠ 맵 «자체»도 본다 — `stuCheckedSids` 가 걸러 주니 화면에는 안 보이지만,
     죽은 열쇠를 안 빼면 세션 내내 쌓이고 「전체 해제」가 해제한 티가 안 난다. */
  봄('죽은 열쇠가 맵에 안 남는다', Object.keys(state.stuChecked), []);
  봄('도는 표시가 꺼진다', state.stuBulkBusy, null);
  봄('한 사람마다 장부에 남는다', 장부.filter(x=>/^학생 삭제/.test(x)).length, 2);
  봄('일괄로도 한 줄 남는다', 장부.filter(x=>/^학생 일괄 삭제/.test(x)).length, 1);
  봄('요약을 한 번만 말한다', 말, ['2명을 삭제했습니다.']);
}

console.log(NL + '── ③ 하나가 터져도 끝까지 간다 ──');
{
  /* 계정 지우기만 실패 — 문서는 이미 지워졌으니 «남았다»고 말해야 한다. */
  const { F, DATA, 말, 장부 } = 판({ checked:{ a1:true, a2:true, a3:true }, 계정실패:['a2'] });
  await F.deleteCheckedStudents();
  봄('셋 다 지운다', DATA.students.map(s=>s.studentId), ['a4']);
  봄('🔴 계정이 남은 사람을 이름으로 말한다', 말[0], '3명을 삭제했습니다. · 로그인 계정이 남은 학생 1명 — a2');
  봄('장부에도 남는다', 장부.some(x=>/계정은 못 지웠다/.test(x)), true);
}
{
  /* 🔴 학생 문서 자체가 안 지워지는 경우 — 그 사람은 «그대로 남아 있다». 멈추지 말고 말해야 한다. */
  const { F, DATA, 말, state } = 판({ checked:{ a1:true, a2:true, a3:true },
    문서실패:{ a2:['students'] } });
  await F.deleteCheckedStudents();
  봄('🔴 터진 하나를 빼고 나머지는 지운다', DATA.students.map(s=>s.studentId).sort(), ['a2','a4']);
  봄('🔴 못 지운 사람을 이름으로 말한다', 말[말.length-1],
     '2명을 삭제했습니다. · 못 지운 학생 1명 — a2');
  봄('못 지운 사람은 고른 채로 남는다 (다시 눌러 볼 수 있게)', F.stuCheckedSids(), ['a2']);
  봄('도는 표시는 꺼진다', state.stuBulkBusy, null);
}
{
  /* 🔴 **차례가 바뀌면 안 된다** — 학생 문서가 안 지워졌는데 화면에서만 사라지면
     다음 새로고침에 되살아난다. `withdrawStudent` 가 못 박아 둔 규칙이다. */
  const { F, DATA } = 판({ 답:true, 문서실패:{ a2:['students'] } });
  let 터졌나 = false;
  try{ await F.deleteStudentWork('a2'); }catch(_){ 터졌나 = true; }
  봄('학생 문서가 안 지워지면 터진다', 터졌나, true);
  봄('🔴 그리고 화면에서도 «안» 사라진다', DATA.students.map(s=>s.studentId), ['a1','a2','a3','a4']);
}
{
  /* 딸린 것만 터지는 경우 — 사람은 지워졌다. 조용히 삼키지 않고 「기록이 남았다」고 말한다. */
  const { F, DATA, 말, 장부 } = 판({ checked:{ a1:true, a2:true },
    문서실패:{ a2:['records'] } });
  await F.deleteCheckedStudents();
  봄('둘 다 사라진다', DATA.students.map(s=>s.studentId), ['a3','a4']);
  봄('🔴 기록이 남은 것을 삼키지 않는다', 말[말.length-1],
     '2명을 삭제했습니다. · 기록이 남은 학생 1명 — a2');
  봄('장부에도 남는다', 장부.some(x=>/남은 문서: records/.test(x)), true);
}

console.log(NL + '── 한 명 삭제는 그대로 도는가 ──');
{
  const { F, DATA, 지운문서, 물음, 말 } = 판({ 답:true });
  await F.deleteStudent('a2');
  봄('한 명은 여전히 한 번 묻는다', 물음.length, 1);
  봄('그 한 명만 사라진다', DATA.students.map(s=>s.studentId), ['a1','a3','a4']);
  봄('딸린 문서 셋', 지운문서, ['students/key_a2','contacts/key_a2','records/key_a2']);
  봄('말도 그대로', 말, ['삭제되었습니다.']);
}
{
  const { F, DATA, 지운문서 } = 판({ 답:false });
  await F.deleteStudent('a2');
  봄('취소하면 안 지운다', [DATA.students.length, 지운문서.length], [4, 0]);
}

console.log(NL + '── 화면이 이 값을 실제로 쓰는가 ──');
{
  const 있나 = (무엇, 조각) => 봄(무엇, html.indexOf(조각) >= 0, true);
  있나('줄 앞에 고르개가 섰다', 'stuToggleCheck(\'${s.studentId}\')');
  있나('고르기 띠가 섰다', 'class="stu-bulk');
  있나('전체 선택이 «보이는 것»만 넘긴다', 'stuCheckAll(${JSON.stringify(보이는것)');
  있나('삭제 단추가 붙었다', 'deleteCheckedStudents()');
  있나('안 보이는 고름을 말한다', 'hidden-warn');
  있나('지우는 동안 잠근다', 'busy ? `지우는 중');
  /* 🔴 **두 벌이 되지 않았는가** — 학생을 지우는 «실제 일»은 한 곳이어야 한다.
     일괄이 제 손으로 문서를 지우기 시작하면, 다음에 「연락처도 지운다」를 더할 때 한쪽만 고쳐진다. */
  봄('🔴 학생 문서를 지우는 곳은 한 군데뿐이다',
     (html.match(/dbDeleteDoc\('students'/g) || []).length, 1);
  있나('일괄도 그 한 곳을 부른다', 'await deleteStudentWork(sid)');
  있나('한 명도 그 한 곳을 부른다', 'await deleteStudentWork(sid)');
  /* 🔴 차례 — 문서를 지운 «뒤»에 메모리를 고친다. 줄 순서를 글자로 못 박는다. */
  봄('🔴 문서 지우기가 메모리 거르기보다 앞이다',
     html.indexOf("await dbDeleteDoc('students', key);")
     < html.indexOf("DATA.students = DATA.students.filter(x=>x.studentId!==sid);"), true);
}

console.log(NL + (fail ? `🔴 ${fail}개 넘어짐 (통과 ${pass})` : `✅ 전부 통과 (${pass}가지)`));
process.exit(fail ? 1 : 0);
