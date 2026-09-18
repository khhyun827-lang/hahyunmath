/* 조교 계정 — 만들기와 로그인이 «같은 문»을 쓰는가 (2026-09-19)
   사용자 —「조교계정 로그인이 안되는 것 같은데 확인한번해줘」.

     node tools/ta-account-test.mjs

   🔴 **무엇이 났던가** — 09-07 에 인증을 Firebase Auth 로 옮길 때 조교의 **로그인**과
     **비밀번호 재설정**은 옮기고 **만들기**를 안 옮겼다. 그래서 설정에서 조교를 더하면
     Firestore 문서만 생기고 계정은 안 생겼고, 로그인은 `auth/user-not-found` 로 튕기면서
     「아이디 또는 비밀번호가 일치하지 않습니다」라고 말했다 — 비밀번호를 의심할 말이다.
   🔵 **그래서 재는 것은 «짝»이다.** 들어오는 문이 Auth 면 만드는 문도 Auth 여야 한다.
     한쪽만 보면 둘 다 멀쩡해 보인다 — 이 검사가 붙는 까닭이 그것이다.
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
let pass = 0, fail = 0;
const 봄 = (무엇, 나온것, 나와야) => {
  const ok = JSON.stringify(나온것) === JSON.stringify(나와야);
  if (ok) pass++; else fail++;
  console.log((ok ? '  ✓ ' : '  🔴 ') + 무엇 + (ok ? '' : NL + '      나온 것 ' + JSON.stringify(나온것) + NL + '      나와야 ' + JSON.stringify(나와야)));
};

/* ── 판 차리기 ── */
function 판(opt) {
  opt = opt || {};
  const 폼 = Object.assign({ 'ta-id': 'ta01', 'ta-pw': 'secret1', 'ta-name': '조교하나', 'ta-phone': '010-0000-0000' }, opt.폼 || {});
  const 간것 = { 계정: [], 문서: [], 지운계정: [], 지운문서: [], 말: [], 기록: [] };
  const 곁 = {
    DATA: { assistants: (opt.조교들 || []).map(a => Object.assign({}, a)), classes: [{ id: 'c1', name: '고1 A' }] },
    state: {},
    document: { getElementById: id => id in 폼 ? { get value(){ return 폼[id]; }, set value(v){ 폼[id] = v; } } : null },
    readCheckedClassIds: () => opt.반 || ['c1'],
    AUTH_아이디꼴: /^[A-Za-z0-9][A-Za-z0-9._-]{0,62}$/,
    authCreateAccount: async (role, id, pw) => {
      if (opt.계정만들기실패) { const e = new Error('안 된다'); e.code = opt.계정만들기실패; throw e; }
      간것.계정.push(role + ':' + id + ':' + pw); return 'UID-' + id;
    },
    adminDeleteUser: async (role, id) => { if (opt.계정지우기실패) throw new Error('없는 계정'); 간것.지운계정.push(role + ':' + id); },
    /* 저장실패: true = 전부 실패 · 'staff' = 권한 문서만 실패 */
    dbSetDoc: async (col, id, d) => {
      if (opt.저장실패 === true || opt.저장실패 === col) return null;
      간것.문서.push([col, id, d]); return true;
    },
    dbDeleteDoc: async (col, id) => { 간것.지운문서.push([col, id]); return true; },
    logAudit: async (a, b, c, d) => 간것.기록.push([a, c, d]),
    showToast: m => 간것.말.push(m),
    render: () => {}, confirm: () => opt.확인 !== false, prompt: () => opt.물음답 || null,
    assistantClassLabel: () => '고1 A', assistantClassIds: a => a.classIds || [],
  };
  const 이름들 = ['authIdOk', 'authIdWhyBad', 'authWhyFailed', 'addAssistant', 'deleteAssistant',
    'fixAssistantAccount', 'staffEnsureLoaded', 'taHasStaff', 'taGrantStaff', 'taRevokeStaff'];
  /* ⚠ 읽기 횟수는 여기서 센다 — `new Function` 이 값을 «그때» 받아 가므로 나중에 곁을 갈아도 안 먹는다 */
  간것.읽기 = 0;
  곁.dbGetCollection = async col => { 간것.읽기++; return (opt.권한들 || []).map(u => ({ uid: u })); };
  곁.nowStamp = () => '2026-09-19 21:00';
  const api = new Function(...Object.keys(곁),
    'let staffUids = null;' + NL + 이름들.map(lift).join(NL)
    + NL + 'return { ' + 이름들.join(', ') + ', 권한목록: () => staffUids };')(...Object.values(곁));
  return { api, 간것, 곁 };
}

console.log(NL + '① 조교를 더하면 «계정»도 생긴다' + NL);
{
  const T = 판();
  await T.api.addAssistant();
  봄('🔴 Auth 계정을 만든다 (이것이 빠져서 로그인이 안 됐다)', T.간것.계정, ['assistant:ta01:secret1']);
  봄('   계정을 «먼저» 만들고 문서를 나중에 쓴다 (조교 문서 → 권한 문서)',
    T.간것.문서.map(d => d[0]), ['assistants', 'staff']);
  봄('문서에 uid 가 적힌다', T.간것.문서[0][2].uid, 'UID-ta01');
  봄('🔴 문서에 비밀번호를 «안» 적는다 (학생도 읽는 자리다)', 'pw' in T.간것.문서[0][2], false);
  봄('이름·아이디·담당 반은 그대로 적는다',
    [T.간것.문서[0][2].taId, T.간것.문서[0][2].name, T.간것.문서[0][2].classIds], ['ta01', '조교하나', ['c1']]);
}
{
  const T = 판({ 폼: { 'ta-pw': '1234' } });
  await T.api.addAssistant();
  봄('🔴 6자 아래는 막는다 (Auth 가 안 받는다 — 4자로 받아 두면 「추가」에서 튕긴다)',
    [T.간것.계정.length, /6자/.test(T.간것.말.join(' '))], [0, true]);
}
{
  const T = 판({ 폼: { 'ta-id': '조교하나' } });
  await T.api.addAssistant();
  봄('한글 아이디는 «만들 때» 막는다 (로그인할 때 조용히 실패하던 자리다)',
    [T.간것.계정.length, /한글/.test(T.간것.말.join(' '))], [0, true]);
}
{
  const T = 판({ 계정만들기실패: 'auth/email-already-in-use' });
  await T.api.addAssistant();
  봄('계정이 이미 있으면 문서를 안 만든다', [T.간것.문서.length, /이미 있는 아이디/.test(T.간것.말.join(' '))], [0, true]);
}
{
  const T = 판({ 저장실패: true });
  await T.api.addAssistant();
  봄('🔴 문서를 못 쓰면 «추가했다»고 하지 않는다', /저장하지 못했습니다/.test(T.간것.말.join(' ')), true);
  봄('   명단에도 안 남긴다 (화면에만 있는 조교가 되면 안 된다)', T.곁.DATA.assistants.length, 0);
}

console.log(NL + '② 문서만 있던 옛 조교 — 계정만 붙인다' + NL);
{
  const T = 판({ 조교들: [{ id: 'ta9', taId: 'ta01', pw: 'oldpass1', name: '조교하나', classIds: ['c1'] }] });
  await T.api.fixAssistantAccount('ta9');
  봄('🔴 적혀 있던 비밀번호로 계정을 만든다 (다시 묻지 않는다)', T.간것.계정, ['assistant:ta01:oldpass1']);
  봄('🔴 문서에서 평문 비밀번호를 지운다', 'pw' in T.간것.문서[0][2], false);
  봄('   uid 를 적는다', T.간것.문서[0][2].uid, 'UID-ta01');
  봄('   담당 반·이름은 그대로 둔다 (지우고 다시 만들지 않는다)',
    [T.간것.문서[0][2].classIds, T.간것.문서[0][2].name], [['c1'], '조교하나']);
  봄('메모리에서도 비밀번호가 사라진다', 'pw' in T.곁.DATA.assistants[0], false);
  봄('이제 들어와서 볼 수 있다고 말해 준다', /담당 반을 볼 수 있습니다/.test(T.간것.말.join(' ')), true);
}
{
  const T = 판({ 조교들: [{ id: 'ta9', taId: 'ta01', name: '조교하나', classIds: ['c1'] }], 물음답: 'brandnew1' });
  await T.api.fixAssistantAccount('ta9');
  봄('비밀번호가 없으면 새로 받아 만든다', T.간것.계정, ['assistant:ta01:brandnew1']);
}
{
  const T = 판({ 조교들: [{ id: 'ta9', taId: 'ta01', name: '조교하나', classIds: ['c1'] }], 물음답: null });
  await T.api.fixAssistantAccount('ta9');
  봄('비밀번호를 안 적으면 아무 일도 없다', [T.간것.계정.length, T.간것.문서.length], [0, 0]);
}
{
  const T = 판({ 조교들: [{ id: 'ta9', taId: 'ta01', uid: 'UID-ta01', name: '조교하나', classIds: ['c1'] }] });
  await T.api.fixAssistantAccount('ta9');
  봄('이미 계정이 있는 조교에는 아무 일도 안 한다', T.간것.계정.length, 0);
}
{
  const T = 판({ 조교들: [{ id: 'ta9', taId: 'ta01', pw: 'oldpass1', name: '조교하나' }], 계정만들기실패: 'auth/email-already-in-use' });
  await T.api.fixAssistantAccount('ta9');
  봄('콘솔에서 만든 계정이면 «비밀번호 재설정»으로 보낸다',
    /이미 있습니다/.test(T.간것.말.join(' ')) && /비밀번호 재설정/.test(T.간것.말.join(' ')), true);
  봄('   그때는 문서를 안 건드린다', T.간것.문서.length, 0);
}

console.log(NL + '③ 지울 때 계정도 지운다 — 같은 아이디를 다시 쓸 수 있도록' + NL);
{
  const T = 판({ 조교들: [{ id: 'ta9', taId: 'ta01', uid: 'UID-ta01', name: '조교하나' }] });
  await T.api.deleteAssistant('ta9');
  봄('문서를 지운다 (권한 문서까지 — ④에서 따로 잰다)', T.간것.지운문서[0], ['assistants', 'ta9']);
  봄('🔴 계정도 지운다 (안 지우면 같은 아이디를 다시 못 쓴다)', T.간것.지운계정, ['assistant:ta01']);
}
{
  const T = 판({ 조교들: [{ id: 'ta9', taId: 'ta01', name: '조교하나' }], 계정지우기실패: true });
  await T.api.deleteAssistant('ta9');
  봄('계정을 못 지우면 남았다고 말해 준다', /계정이 남았습니다/.test(T.간것.말.join(' ')), true);
  봄('   그래도 문서는 지워졌다', T.간것.지운문서.length, 1);
}
{
  const T = 판({ 조교들: [{ id: 'ta9', taId: 'ta01', name: '조교하나' }], 확인: false });
  await T.api.deleteAssistant('ta9');
  봄('안 물으면 아무 일도 없다', [T.간것.지운문서.length, T.간것.지운계정.length], [0, 0]);
}

console.log(NL + '④ 권한 문서(staff) — 콘솔에 들어갈 일이 없다' + NL);
{
  /* 🔴 **계정만으로는 아무것도 못 본다** — 명단·기록은 규칙이 가리고, 그 문을 여는 것이 이 문서다.
     어제까지 이것은 `teachers/<uid>` 였고 **콘솔에서 손으로** 만들어야 했다(조교마다 한 번씩).
     이제 조교를 더할 때 앱이 같이 만든다 — 그것을 여기서 잰다. */
  const T = 판();
  await T.api.addAssistant();
  const staff = T.간것.문서.filter(d => d[0] === 'staff');
  봄('🔴 조교를 더하면 권한 문서도 함께 만든다 (콘솔 작업이 사라졌다)', staff.length, 1);
  봄('   문서 이름은 uid 다 (규칙이 그 이름으로 찾는다)', staff[0][1], 'UID-ta01');
  봄('   안에도 uid 를 적는다', staff[0][2].uid, 'UID-ta01');
  봄('   누구인지 알아볼 칸도 둔다', [staff[0][2].taId, staff[0][2].name], ['ta01', '조교하나']);
  봄('바로 로그인할 수 있다고 말해 준다', /바로 로그인할 수 있습니다/.test(T.간것.말.join(' ')), true);
}
{
  /* ⚠ 권한 문서만 실패하면 «조교는 남기고» 다시 시킬 수 있어야 한다 — 계정까지 버리면 손이 두 번 간다 */
  const T = 판({ 저장실패: 'staff' });
  await T.api.addAssistant();
  봄('권한 문서만 실패하면 조교는 남기고 알려 준다',
    [T.곁.DATA.assistants.length, /「권한 주기」/.test(T.간것.말.join(' '))], [1, true]);
}
{
  const T = 판({ 조교들: [{ id: 'ta9', taId: 'ta01', uid: 'UID-ta01', name: '조교하나' }], 권한들: [] });
  await T.api.staffEnsureLoaded();
  봄('권한 없는 조교를 알아낸다', T.api.taHasStaff(T.곁.DATA.assistants[0]), false);
  await T.api.taGrantStaff('ta9');
  봄('🔴 「권한 주기」가 문서를 만든다', T.간것.문서.filter(d => d[0] === 'staff').map(d => d[1]), ['UID-ta01']);
  봄('   그 자리에서 «있음»으로 바뀐다 (다시 읽지 않는다)', T.api.taHasStaff(T.곁.DATA.assistants[0]), true);
  봄('   이력에도 남는다', T.간것.기록.some(r => r[0] === '조교 권한 부여'), true);
}
{
  const T = 판({ 조교들: [{ id: 'ta9', taId: 'ta01', uid: 'UID-ta01', name: '조교하나' }], 권한들: ['UID-ta01'] });
  await T.api.staffEnsureLoaded();
  봄('있는 권한을 읽어 온다', T.api.taHasStaff(T.곁.DATA.assistants[0]), true);
  await T.api.taRevokeStaff('ta9');
  봄('거두면 문서를 지운다', T.간것.지운문서.filter(d => d[0] === 'staff').map(d => d[1]), ['UID-ta01']);
  봄('   그 자리에서 «없음»으로 바뀐다', T.api.taHasStaff(T.곁.DATA.assistants[0]), false);
}
{
  const T = 판({ 조교들: [{ id: 'ta9', taId: 'ta01', uid: 'UID-ta01', name: '조교하나' }], 권한들: ['UID-ta01'], 확인: false });
  await T.api.staffEnsureLoaded();
  await T.api.taRevokeStaff('ta9');
  봄('안 물으면 권한을 안 거둔다', [T.간것.지운문서.length, T.api.taHasStaff(T.곁.DATA.assistants[0])], [0, true]);
}
{
  /* 🔴 조교를 지우면 권한 문서도 지운다 — 남겨 두면 «없는 조교»의 uid 가 규칙에서 계속 조교로 센다 */
  const T = 판({ 조교들: [{ id: 'ta9', taId: 'ta01', uid: 'UID-ta01', name: '조교하나' }] });
  await T.api.deleteAssistant('ta9');
  봄('🔴 조교를 지우면 권한 문서도 지운다 (떠도는 권한이 남으면 안 된다)',
    T.간것.지운문서.map(d => d[0] + ':' + d[1]), ['assistants:ta9', 'staff:UID-ta01']);
}
{
  /* 옛 조교 고치기 — 계정과 권한을 한 번에 */
  const T = 판({ 조교들: [{ id: 'ta9', taId: 'ta01', pw: 'oldpass1', name: '조교하나', classIds: ['c1'] }] });
  await T.api.fixAssistantAccount('ta9');
  봄('🔴 「로그인 계정 만들기」가 권한까지 붙인다', T.간것.문서.map(d => d[0]), ['assistants', 'staff']);
  봄('   그래서 한 번 누르면 끝난다고 말한다', /담당 반을 볼 수 있습니다/.test(T.간것.말.join(' ')), true);
}
{
  /* 읽기는 «화면을 열 때» 한 번뿐이다 — 로그인마다 읽으면 안 쓰는 사람에게도 읽기가 붙는다 */
  const T = 판({ 조교들: [{ id: 'ta9', taId: 'ta01', uid: 'UID-ta01', name: '조교하나' }], 권한들: ['UID-ta01'] });
  await T.api.staffEnsureLoaded();
  await T.api.staffEnsureLoaded();
  await T.api.staffEnsureLoaded();
  봄('여러 번 불러도 한 번만 읽는다 (그리는 함수가 부르므로 render 마다 읽으면 안 된다)', T.간것.읽기, 1);
}

console.log(NL + '⑤ 규칙 — 조교에게 «딱 그만큼»만 열렸는가' + NL);
{
  /* 🔴 여기가 틀리면 조용히 너무 많이 열린다. 규칙 파일은 손으로 게시하는 것이라
     검사가 대신 읽어 준다(게시했는지는 못 본다 — 그것은 콘솔의 일이다).
     ⚠ `tools/rules-check.mjs` 는 «지금 게시된» 규칙을 실제로 두드린다. 이 절은 «적어 둔» 규칙을 읽는다. */
  const rules = fs.readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8').replace(/\r\n/g, '\n');
  /* ⚠ 여는 중괄호로 끝을 찾으면 안 된다 — `match /students/{uid} {` 의 첫 `{` 는 **와일드카드**다.
     그래서 「줄머리가 4칸인 닫는 중괄호」까지로 자른다(이 파일의 꼴이 그렇다). */
  const 덩이 = 이름 => {
    const at = rules.indexOf('match /' + 이름 + '/');
    if (at < 0) return '';
    const end = rules.indexOf(NL + '    }', at);
    return end < 0 ? rules.slice(at) : rules.slice(at, end);
  };
  봄('🔴 조교를 가리는 함수가 있다', /function isStaff\(\)[\s\S]{0,200}documents\/staff\//.test(rules), true);
  봄('🔴 명단은 조교도 읽는다', /allow read: if isTeacher\(\) \|\| isStaff\(\) \|\| isMine\(uid\)/.test(덩이('students')), true);
  봄('🔴 명단 «쓰기»는 강사만 (반 이동·삭제는 강사의 일이다)', /allow write: if isTeacher\(\);/.test(덩이('students')), true);
  봄('🔴 기록은 조교가 읽고 쓴다 (출결·과제를 넣는다)',
    /allow read, write: if isTeacher\(\) \|\| isStaff\(\) \|\| isMine\(uid\)/.test(덩이('records')), true);
  봄('🔴 전화번호는 조교에게 «안» 열린다 — 이것이 teachers 문서를 버린 까닭이다',
    /isStaff\(\)/.test(덩이('contacts')), false);
  봄('   채팅도 안 열린다', /isStaff\(\)/.test(덩이('chats')), false);
  봄('   상담도 안 열린다', /isStaff\(\)/.test(덩이('consults')), false);
  봄('   낱건(kv) 쓰기도 안 열린다', /isStaff\(\)/.test(덩이('kv')), false);
  봄('🔴 권한 문서는 «강사»만 쓴다 (조교가 스스로 조교가 되면 안 된다)',
    [/allow read:  if isTeacher\(\);/.test(덩이('staff')), /allow write: if isTeacher\(\);/.test(덩이('staff'))], [true, true]);
  봄('🔴 강사를 만드는 문은 그대로 잠겨 있다 (콘솔에서만)', /allow write: if false;/.test(덩이('teachers')), true);
  봄('변경 이력은 조교가 «남기기만» 한다',
    [/allow create: if isTeacher\(\) \|\| isStaff\(\)/.test(덩이('auditlog')),
     /allow read: if isTeacher\(\);/.test(덩이('auditlog'))], [true, true]);
}

console.log(NL + '🪤 덫 — 들어오는 문과 만드는 문이 어긋나 있지 않은가 (글로 잰다)' + NL);
{
  let 물었다 = 0;
  const 로그인 = lift('doAssistantLogin');
  const 더하기 = lift('addAssistant');
  const 재설정 = lift('resetAssistantPw');
  /* ① 로그인이 Auth 를 쓰면 만들기도 Auth 를 써야 한다 — 이 «짝»이 09-07 에 깨졌다 */
  const 짝 = /authSignIn\('assistant'/.test(로그인) && /authCreateAccount\('assistant'/.test(더하기);
  if (짝) 물었다++;
  console.log('  ' + (짝 ? '✓' : '🔴') + ' 로그인이 Auth 면 만들기도 Auth 다 (한쪽만 보면 둘 다 멀쩡해 보인다)');
  /* ② 비밀번호 재설정도 같은 문이다 */
  const 셋다 = /adminResetPassword\('assistant'/.test(재설정);
  if (셋다) 물었다++;
  console.log('  ' + (셋다 ? '✓' : '🔴') + ' 비밀번호 재설정도 Auth 다');
  /* ③ 화면에 평문 비밀번호를 다시 세우지 않는가 */
  const 안보인다 = !/pwRevealHTML\('assistant'/.test(html);
  if (안보인다) 물었다++;
  console.log('  ' + (안보인다 ? '✓' : '🔴') + ' 조교 줄에 평문 비밀번호를 안 세운다 (assistants 는 학생도 읽는다)');
  console.log(NL + '🪤 덫 ' + 물었다 + '/3 물었다');
  if (물었다 !== 3) fail++;
}

console.log(NL + (fail ? '🔴 걸린 것 ' + fail + '개 · ' + (pass + fail) + '개' : '✓ 전부 통과 · ' + pass + '개') + NL);
process.exit(fail ? 1 : 0);
