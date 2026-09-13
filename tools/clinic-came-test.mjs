// 클리닉 › 온 학생 기록 · 연락처 · 확대 단추 빼기 (2026-09-13 · K-11 → K-12)
//
//   node tools/session-clinic-test.mjs
//
// 🔴 **왜 재는가** — 사용자가 셋을 짚었다:
//   ① 「배율(돋보기모양)버튼의 숫자랑 배속 숫자랑 비슷해서 … 안필요할 것 같아」
//   ② 「등록할떄 학부모 학생 전화번호 등록다했는데 번호등록이 안되었음」
//      → 저장은 되고 있었다. **`contacts` 컬렉션을 아무도 읽지 않았다.**
//   ③ 「수업 없는날에도 클리닉을 추가해서 누가 온지 기록 … 반에 구분짓지 않고 특정요일에」
//      ⚠ K-11에서 «수업 탭의 한 단계»로 지었다가 사용자가 바로잡았다 — 그러면 수업 없는 날은 못 연다.
//
// ⚠ 함수를 여기에 옮겨 적지 않는다 — index.html 에서 그대로 뜬다.
// ⚠ 닻은 «함수 몸통»에 건다. 09-13에 네 번 주석을 물었다.

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
const esc = s => (s === null || s === undefined) ? '' : String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* ═══ ① 확대 «숫자» 단추를 뺐다 ═══ */
console.log(NL + '① 조작줄에서 확대 숫자 단추를 뺐다' + NL);
{
  const bar = lift('videoControlsHTML'), paint = lift('vcPaint');
  봄('🔴 조작줄에 확대 단추가 없다', /<button class="vc-b zoom"/.test(bar), false);
  봄('🔴 그릴 것도 안 뒤진다', paint.includes(".vc-b.zoom"), false);
  봄('배속 단추는 그대로 있다', /<button class="vc-b rate"/.test(bar), true);
  /* 확대 «자체»는 살아 있어야 한다 — 손가락과 휠 */
  /* ⚠ «손.size === 2» 는 이 함수에 두 번 나온다(시작할 때·움직일 때) — 그것만 보면
     시작 가지를 지워도 통과한다. **핀치를 «시작하는» 줄**을 본다. */
  봄('🔴 핀치는 그대로다', /핀치 = \{ d: Math\.hypot/.test(lift('vzBindVeil')), true);
  봄('🔴 Ctrl/⌘ + 휠도 그대로다', lift('vzBindVeil').includes("ev.ctrlKey || ev.metaKey"), true);
  봄('확대를 거는 함수도 그대로다', [html.includes('function vzSet('), html.includes('function vzApply(')], [true, true]);
}

/* ═══ ② 연락처 — 쓰기만 하고 읽지 않던 통 ═══ */
console.log(NL + '② 전화번호 — 저장은 됐는데 아무도 안 읽고 있었다' + NL);
{
  봄('🔴 이제 읽는 자리가 생겼다', html.includes('async function loadContactsIfNeeded()'), true);
  const load = lift('loadContactsIfNeeded');
  봄('contacts 컬렉션을 읽는다', load.includes("dbGetCollection('contacts')"), true);
  봄('두 번 안 읽는다', load.includes('state.contactsLoaded || state.contactsLoading'), true);
  봄('🔴 명단·상세가 부른다 (상세로 빠지기 «전»에)',
    /loadContactsIfNeeded\(\);\s*\n\s*if\(state\.studentDetailId\)/.test(lift('teacherRosterHTML')), true);
  봄('내보내기 둘도 기다린다',
    [lift('exportRosterExcel').includes('await loadContactsIfNeeded()'),
     lift('exportClassExcel').includes('await loadContactsIfNeeded()')], [true, true]);

  /* 실제로 합쳐지는가 — 문서 이름이 uid 든 학번이든 «안»의 studentId 로 맞춘다 */
  const DATA = { students: [
    { studentId: 'a1', uid: 'uid1', name: '가나' },
    { studentId: 'a2', uid: 'uid2', name: '다라', phone: '010-9999-9999' },
    { studentId: 'a3', uid: 'uid3', name: '가가' },
  ] };
  const state = { contactsLoaded: false, contactsLoading: false };
  const 읽은것 = [
    { studentId: 'a1', phone: '010-1111-1111', parentPhone: '010-2222-2222' },
    { studentId: 'a2', phone: '', parentPhone: '010-3333-3333' },   // 옛 문서 — 빈 칸이 섞여 있다
    { studentId: 'a2', phone: '010-4444-4444', parentPhone: '' },   // 학번 이름으로도 있던 것
    { studentId: 'zz', phone: '010-5555-5555', parentPhone: '' },   // 명단에 없는 학생
  ];
  const F = new Function('DATA', 'state', 'dbGetCollection', 'render',
    lift('loadContactsIfNeeded') + NL + 'return { loadContactsIfNeeded };')(
    DATA, state, async () => 읽은것, () => {});
  await F.loadContactsIfNeeded();
  봄('🔴 등록만 해 둔 번호가 살아난다', [DATA.students[0].phone, DATA.students[0].parentPhone],
    ['010-1111-1111', '010-2222-2222']);
  봄('🔴 이미 있는 값은 안 덮는다', DATA.students[1].phone, '010-9999-9999');
  봄('여러 문서가 흩어져 있으면 빈 칸만 메운다', DATA.students[1].parentPhone, '010-3333-3333');
  봄('연락처가 없는 학생은 그대로', [DATA.students[2].phone, DATA.students[2].parentPhone], [undefined, undefined]);
  봄('두 번째로 불러도 다시 안 읽는다', await (async () => {
    let 부름 = 0;
    const G = new Function('DATA', 'state', 'dbGetCollection', 'render',
      lift('loadContactsIfNeeded') + NL + 'return { loadContactsIfNeeded };')(
      DATA, state, async () => { 부름++; return []; }, () => {});
    await G.loadContactsIfNeeded();
    return 부름;
  })(), 0);

  /* 🔴 수정할 때 번호가 «학생 문서»로 새지 않는가 */
  const upd = lift('updateStudentInfo');
  봄('🔴 학생 문서에는 번호를 빼고 쓴다',
    upd.includes('delete 저장할것.phone; delete 저장할것.parentPhone;')
    && upd.includes("dbSetDoc('students', studentKeyOfSid(sid), 저장할것)"), true);
  봄('🔴 번호를 «비워도» 연락처를 쓴다 (예전엔 옛 번호가 남았다)',
    /if\(phone \|\| parentPhone\)\s*\n\s*await dbSetDoc\('contacts'/.test(upd), false);
  봄('연락처는 그대로 contacts 로 간다', upd.includes("dbSetDoc('contacts', studentKeyOfSid(sid), {studentId:sid, phone, parentPhone})"), true);
  봄('학생을 만들 때도 여전히 contacts 로 간다', lift('addStudent').includes("dbSetDoc('contacts', uid, 연락처)"), true);
  봄('🔴 학생 문서에는 예나 지금이나 번호가 없다',
    /const newStudent = \{studentId:sid, uid, name, grade, school, classId\}/.test(lift('addStudent')), true);
}

/* ═══ ③ 클리닉 › 온 학생 기록 — 날짜만 있으면 된다 ═══ */
console.log(NL + '③ 클리닉 › 온 학생 기록 — 수업도 반도 안 본다' + NL);
{
  /* 🔴 K-11에서 이것을 «수업 탭의 한 단계»로 지었다가 사용자가 바로잡았다 —
     그러면 «반 + 그 반의 수업일»이 둘 다 있어야 열려서 **수업 없는 날은 아예 못 연다.**
     그 자리가 정말로 걷혔는지부터 본다. */
  봄('🔴 수업 단계에서 걷혔다 (수업 없는 날에도 열려야 한다)',
    /\['clinic', '클리닉'\]/.test(html), false);
  봄('🔴 수업 단계 함수도 안 남았다', /function sessionClinic/.test(html), false);
  봄('메모 발판에 그 문이 안 남았다', lift('sessionMemoHTML').includes("goSessionStep('clinic')"), false);
  봄('🔴 이제 클리닉 화면의 판이다', html.includes('function clinicCamePanelHTML()'), true);
  /* ⚠ `clinicPanel==='came'` 만 보면 안 된다 — 그 글자는 단추의 «강조» 자리에도 있어서
     단추를 통째로 지워도 남는다. **여는 동작과 이름**을 함께 본다. */
  봄('머리말에 «온 학생 기록» 단추',
    lift('teacherClinicHTML').includes("clinicOpenCame('')") && lift('teacherClinicHTML').includes('온 학생 기록</button>'), true);
  /* 🔴 **단추가 있는 것과 판이 그려지는 것은 다른 말이다.** 그리는 자리를 통째로 지워도
     단추만 보는 덫은 멀쩡히 통과했다(덫을 확인하다 드러났다). 부르는 자리를 직접 본다. */
  봄('🔴 그 판을 실제로 그린다',
    lift('teacherClinicHTML').includes("state.clinicPanel !== 'came' ? '' : clinicCamePanelHTML()"), true);
  봄('🔴 주간 판의 날짜 칸마다 문이 있다 (특정 요일에 바로)',
    /<button class="cn-add came" onclick="clinicOpenCame\('\$\{d\}'\)"/.test(lift('teacherClinicHTML')), true);
  봄('날짜를 안 고르면 오늘이다', lift('clinicCameDate').includes('state.clinicCameDate || todayStr()'), true);

  /* 화면을 실제로 그려 본다 */
  const 학생들 = [
    { studentId: 'a1', uid: 'u1', name: '가나', classId: 'c1' },
    { studentId: 'a2', uid: 'u2', name: '다라', classId: 'c1' },
    { studentId: 'a3', uid: 'u3', name: '가가', classId: 'c2' },
    { studentId: 'a9', uid: 'u9', name: '퇴원', classId: 'c1', withdrawnAt: '2026-08-01' },
  ];
  const DATA = { students: 학생들, clinics: [
    { id: 'cl1', studentId: 'a3', name: '가가', day: '2026-09-13', status: '승인', slotIds: [], walkIn: true },
    { id: 'cl2', studentId: 'a2', name: '다라', day: '2026-09-13', status: '승인', slotIds: ['s1'] },
    { id: 'cl3', studentId: 'a1', name: '가나', day: '2026-09-13', status: '취소', slotIds: [], walkIn: true },
    { id: 'cl4', studentId: 'a1', name: '가나', day: '2026-09-12', status: '승인', slotIds: [], walkIn: true },
  ], clinicSlots: [{ id: 's1', date: '2026-09-13', time: '16:00' }] };
  const state = { clinicCameQ: '', clinicCameDate: '2026-09-13', clinicPanel: 'came' };
  const 곁 = ['DATA', 'state', 'isWithdrawn', 'studentClassTitle', 'clinicWhenLabel', 'escHtml', 'iconSvg',
    'todayStr', 'WEEKDAY_LABEL'];
  const 값 = [DATA, state, s => !!s.withdrawnAt, s => s.classId === 'c1' ? '고1GA1' : '고2GB1',
    c => (c.slotIds || []).length ? '16:00' : '', esc, () => '', () => '2026-09-20',
    ['일', '월', '화', '수', '목', '금', '토']];
  const C = new Function(...곁,
    lift('clinicCameDate') + NL + lift('clinicCameOn') + NL + lift('clinicCamePanelHTML') + NL +
    'return { clinicCameDate, clinicCameOn, clinicCamePanelHTML };')(...값);

  봄('🔴 취소한 것은 안 센다 · 다른 날 것도 안 센다',
    C.clinicCameOn('2026-09-13').map(c => c.id), ['cl1', 'cl2']);
  const 그림 = C.clinicCamePanelHTML();
  봄('고른 날짜가 칸에 박힌다', 그림.includes('id="cn-came-date" type="date" value="2026-09-13"'), true);
  봄('요일도 적는다 (2026-09-13 은 일요일)', 그림.includes('>일요일<s>·</s>'), true);
  봄('🔴 수업이 없어도 된다고 말한다', 그림.includes('수업이 없는 날에도 됩니다'), true);
  봄('머리에 온 사람 수', 그림.includes('클리닉에 온 학생 <span class="mono">2</span>'), true);
  봄('🔴 여기서 담은 것만 «빼기»가 선다', (그림.match(/>빼기</g) || []).length, 1);
  봄('🔴 시간대를 잡아 둔 것은 «시간대 신청»으로 서고 못 뺀다',
    /가가[\s\S]*?>빼기</.test(그림) && /다라[\s\S]*?시간대 신청/.test(그림), true);
  /* ⚠ 칩의 이름 앞에 줄바꿈이 있다 — «>이름<» 으로 찾으면 없는데도 -1 끼리 비교해 통과한다. */
  const 칩 = [...그림.matchAll(/data-nm="([^"]*)"/g)].map(m => m[1]);
  봄('🔴 반을 안 가르고 이름 순 하나로 세운다 (사용자가 그렇게 정했다)',
    칩, ['가가 a3', '가나 a1', '다라 a2']);
  봄('🔴 퇴원생은 안 든다', 칩.some(x => x.startsWith('퇴원')), false);
  봄('담긴 학생은 켜져 보인다 (가가 · 다라)', (그림.match(/class="cln-p on"/g) || []).length, 2);
  봄('어느 반인지 곁말이 붙는다', 그림.includes('<i>고1GA1</i>') && 그림.includes('<i>고2GB1</i>'), true);

  /* 날짜를 옮기면 그날 것만 */
  state.clinicCameDate = '2026-09-12';
  const 어제 = C.clinicCamePanelHTML();
  봄('🔴 날짜를 옮기면 그날 것만 선다', 어제.includes('클리닉에 온 학생 <span class="mono">1</span>'), true);
  봄('그날 칸 값도 따라간다', 어제.includes('value="2026-09-12"'), true);
  state.clinicCameDate = '2026-09-13';

  /* 찾기 */
  state.clinicCameQ = '가나';
  const 걸러낸 = C.clinicCamePanelHTML();
  봄('찾으면 그 학생만', [/data-nm="가나 a1"/.test(걸러낸), /data-nm="다라 a2"/.test(걸러낸)], [true, false]);
  state.clinicCameQ = 'a2';
  봄('아이디로도 찾는다', /data-nm="다라 a2"/.test(C.clinicCamePanelHTML()), true);
  state.clinicCameQ = '없는이름';
  봄('없으면 없다고 말한다', C.clinicCamePanelHTML().includes('찾는 학생이 없습니다'), true);
  state.clinicCameQ = '';
  봄('🔴 글자마다 render() 를 안 부른다 — 한글 조합이 끊긴다',
    /(^|[^a-zA-Z])render\(\)/.test(lift('clinicCameFilter')), false);
  봄('대신 그 자리에서 숨긴다', lift('clinicCameFilter').includes('el.hidden'), true);

  /* 담기·빼기를 실제로 돌린다 */
  const 쓴것 = [], 지운것 = [], 장부 = [], 말 = [];
  const T = new Function('DATA', 'state', 'dbSetDoc', 'dbDeleteDoc', 'logAudit', 'showToast', 'render',
    'studentKeyOfSid', 'todayStr',
    lift('clinicCameOn') + NL + lift('clinicCameToggle') + NL + 'return { clinicCameToggle };')(
    DATA, state, async (c, id, v) => { 쓴것.push(v); return true; }, async (c, id) => { 지운것.push(id); },
    async (a, b, c, d) => 장부.push(a + '|' + d), m => 말.push(m), () => {},
    sid => (학생들.find(s => s.studentId === sid) || {}).uid || sid, () => '2026-09-20');

  await T.clinicCameToggle('a1', '2026-09-13');
  봄('🔴 담으면 클리닉 문서가 하나 생긴다',
    [쓴것.length, 쓴것[0].studentId, 쓴것[0].day, 쓴것[0].status, 쓴것[0].walkIn, 쓴것[0].slotIds],
    [1, 'a1', '2026-09-13', '승인', true, []]);
  봄('🔴 uid 는 «그 학생» 것이다 (강사 것을 박으면 학생이 제 클리닉을 못 본다)', 쓴것[0].uid, 'u1');
  봄('🔴 «신청한 날»은 오늘이고 «클리닉 날»은 고른 날이다 (지난 날도 적을 수 있다)',
    [쓴것[0].requestedAt, 쓴것[0].day], ['2026-09-20', '2026-09-13']);
  봄('메모리에도 든다', C.clinicCameOn('2026-09-13').map(c => c.studentId).sort(), ['a1', 'a2', 'a3']);
  봄('장부에 남는다', 장부[0], '클리닉 참여 담기|2026-09-13');

  await T.clinicCameToggle('a1', '2026-09-13');
  봄('🔴 다시 누르면 빠진다', [지운것.length, C.clinicCameOn('2026-09-13').map(c => c.studentId).sort()],
    [1, ['a2', 'a3']]);

  await T.clinicCameToggle('a2', '2026-09-13');
  봄('🔴 시간대를 잡아 둔 신청은 여기서 안 지운다', [지운것.length, 말[말.length - 1]],
    [1, '시간대를 잡아 둔 신청입니다 — 위 주간 판에서 다루세요.']);
  봄('명단에 없는 학생은 아무 일도 안 한다', await (async () => {
    const 앞 = [쓴것.length, 지운것.length];
    await T.clinicCameToggle('없는학생', '2026-09-13');
    return [쓴것.length, 지운것.length].join() === 앞.join();
  })(), true);
  봄('🔴 저장이 막히면 화면에도 안 담긴다', await (async () => {
    const U = new Function('DATA', 'state', 'dbSetDoc', 'dbDeleteDoc', 'logAudit', 'showToast', 'render',
      'studentKeyOfSid', 'todayStr',
      lift('clinicCameOn') + NL + lift('clinicCameToggle') + NL + 'return { clinicCameToggle };')(
      DATA, state, async () => null, async () => {}, async () => {}, m => 말.push(m), () => {},
      sid => sid, () => '2026-09-20');
    await U.clinicCameToggle('a1', '2026-09-13');
    return C.clinicCameOn('2026-09-13').map(c => c.studentId).sort();
  })(), ['a2', 'a3']);
}

console.log(NL + (fail ? '🔴 ' + fail + '개 실패 · ' : '✓ 전부 통과 · ') + pass + '개' + NL);
process.exit(fail ? 1 : 0);
