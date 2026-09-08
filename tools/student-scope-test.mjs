// 학생이 «제 것만» 읽는가 (2026-09-07 · 인증 옮기기 6-c)
//
//   node tools/student-scope-test.mjs
//
// 🔵 왜 — 여태는 누가 로그인하든 컬렉션을 통째로 읽었다. 그래서 **학생 브라우저에 남의
//   이름·전화번호가 다 내려갔다.** 규칙이 그걸 막게 되므로, **앱도 안 물어봐야** 한다 —
//   안 그러면 막힌 자리마다 «빨간 딱지»가 뜨고 화면이 반쯤 죽는다.
//
// 🔴 그리고 uid 를 «문서 밖 칸»으로 적는 자리를 붙든다. 이 앱은 내용을 value 한 칸에
//   JSON 글자로 넣는데, 규칙도 질의도 그 «안»은 못 본다. 밖에 적는 것을 한 번이라도
//   빠뜨리면 «내 것만 보기»가 통째로 무너진다.

import fs from 'fs';
import { stripComments } from './strip-comments.mjs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/\r\n/g, '\n');
const rules = fs.readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8');
/* 🔴 예전에는 여기서 정규식으로 주석을 걷었는데, 문자열 안의 «/*»를 주석 시작으로 읽어
   **진짜 코드를 29%나 삼켰다**(실측 1,171,182자 → 836,789자).
   검사가 «없어서»가 아니라 «먹혀서» 통과할 수 있었다 — 조용히 눈이 머는 자리였다.
   그래서 줄 첫머리만 보는 공용 것으로 옮겼다 → tools/strip-comments.mjs */
const 벗기기 = stripComments;

function 떠내기(이름, 꼴) {
  const at = html.indexOf((꼴 || 'async function ') + 이름 + '(');
  if (at < 0) throw new Error(이름 + ' 를 못 찾았습니다');
  let 깊이 = 0;
  for (let j = html.indexOf('{', at); j < html.length; j++) {
    if (html[j] === '{') 깊이++;
    else if (html[j] === '}') { 깊이--; if (!깊이) return html.slice(at, j + 1); }
  }
  throw new Error(이름 + ' 의 끝을 못 찾았습니다');
}

let 통과 = 0, 틀림 = 0;
const 봄 = (무엇, 잰것, 바란것) => {
  const 같다 = JSON.stringify(잰것) === JSON.stringify(바란것);
  같다 ? 통과++ : 틀림++;
  console.log((같다 ? '  ✓ ' : '  ✗ ') + 무엇
    + (같다 ? '' : '\n      나온 것: ' + JSON.stringify(잰것) + '\n      나와야:  ' + JSON.stringify(바란것)));
};

console.log('\n학생이 제 것만 읽는가\n');

/* ── ① 학생용 읽기가 «무엇을 물어보는가» ────────────────────── */
{
  const w = { 문서: [], 컬렉션: [], 내것: [], 낱건: [] };
  const DATA = {};
  const state = {};
  const fn = new Function('DATA', 'state', 'dbReadClear', 'dbGetDoc', 'dbGetCollection',
    'dbGetCollectionByUid', 'dbGet', 'currentSeason',
    떠내기('loadStudentData') + '; return loadStudentData;')(
    DATA, state,
    () => { w.지웠나 = true; },
    async (c, id, fb) => { w.문서.push(c + '/' + id); return { studentId: 's1', uid: id, name: '나' }; },
    async (c) => { w.컬렉션.push(c); return [{ id: 'x' }]; },
    async (c, uid) => { w.내것.push(c + '@' + uid); return [{ id: 'y', uid }]; },
    async (k, fb) => { w.낱건.push(k); return null; },
    () => '1학기 기말',
  );
  await fn('U1');

  /* 🔴 앞사람(익명)의 «못 읽었다» 표시를 물려받으면, 멀쩡히 도는 화면에 빨간 띠가 뜬다.
     2026-09-08에 실제로 그랬다 — 화면은 다 도는데 띠만 거짓말을 했다. */
  봄('🔴 읽기 전에 «못 읽었다» 표시를 지운다', w.지웠나, true);
  봄('🔴 명단은 «제 문서 하나»만 읽는다', w.문서, ['students/U1']);
  봄('🔴 명단 전체(students 컬렉션)는 «안» 읽는다', w.컬렉션.includes('students'), false);
  봄('   그래도 DATA.students 에 내가 들어 있다 — 화면이 나를 찾는다', DATA.students.length, 1);
  봄('🔴 클리닉·질문은 «내 것만» 거른다', w.내것, ['clinics@U1', 'qnas@U1']);
  /* 🔴 2026-09-08에 이 넷을 빠뜨렸다 — 학생 화면의 시험 D-day·범위 거르기·데일리퀴즈가 쓴다.
     안 읽으면 «시험이 없는 것처럼» 보이는데, 화면은 멀쩡해서 알아채기 어렵다.
     ⚠ 읽는 것을 좁힐 때는 좁히고 나서 «무엇이 안 보이나»를 세어 볼 것. */
  /* ⚠ 2026-09-08에 다섯째가 붙었다 — 직보 일정표(`exam-plan`). **학생 달력이 이것을 본다.**
     안 읽으면 「나 언제 와?」의 답이 통째로 빈 채로 뜬다 — 여기가 그 자리다. */
  /* ⚠ 2026-09-08 저녁에 여섯째가 붙었다 — 휴강·보강(class-offdays). 안 읽으면
     추석에도 수업이 있다고 말한다. */
  봄('🔴 시즌·시험범위·교재·등급컷·직보일정표·휴강도 읽는다',
    w.낱건, ['season', 'exam-ranges', 'school-books', 'grade-cuts', 'exam-plan', 'class-offdays']);
  봄('   못 받아도 «빈 모양»을 세워 둔다 — 화면이 터지면 안 된다',
    !!(state.examRanges && state.examRanges.dates && state.gradeCuts && state.gradeCuts.byKey
       && state.examPlan && state.examPlan.byKey
       && state.offDays && Array.isArray(state.offDays.days)), true);

  // 🔴 이 넷은 학생이 읽을 것도, 규칙이 열어 줄 것도 아니다.
  for (const c of ['contacts', 'auditlog', 'consults', 'assistants']) {
    봄('🔴 ' + c + ' 는 아예 안 읽는다', w.컬렉션.includes(c), false);
  }
  // ⚠ 빈 «배열»이라야 한다 — null 이면 화면이 .filter 를 부르다 터진다.
  봄('상담은 빈 배열이다', Array.isArray(DATA.consults) && DATA.consults.length, 0);
  봄('조교도 빈 배열이다', Array.isArray(DATA.assistants) && DATA.assistants.length, 0);
  봄('변경 이력도 빈 배열이다', Array.isArray(DATA.auditLog) && DATA.auditLog.length, 0);
  봄('강사 비밀번호는 아예 안 쥔다', DATA.teacherPw, null);

  // 학생 화면이 실제로 쓰는 것들은 그대로 읽어야 한다.
  for (const c of ['classes', 'notices', 'videos', 'exams', 'problembank', 'assignments', 'clinicslots'])
    봄('   ' + c + ' 는 읽는다', w.컬렉션.includes(c), true);
}

/* ── ② 갈림길이 «토큰»으로 갈리는가 ─────────────────────────── */
{
  const 조각 = 벗기기(떠내기('loadAllData'));
  봄('🔴 학생이면 학생용으로 간다', /나\.role === 'student'[\s\S]{0,60}loadStudentData/.test(조각), true);
  // ⚠ 저장된 값(localStorage)이 아니라 토큰에서 갈래를 읽어야 한다 — 저장값은 누구나 적을 수 있다.
  봄('🔴 갈래는 «토큰»에서 읽는다', /authWhoOf\(fbAuth\.currentUser\.email\)/.test(조각), true);
  봄('   익명은 «진짜 계정»이 아니다', /authIsReal\(\)/.test(조각), true);
}

/* ── ③ uid 를 «문서 밖»에도 적는가 ──────────────────────────── */
{
  /* ⚠ `docFields` 는 위의 `색인칸` 목록을 본다 — 함수만 떠내면 그것이 없어 터진다.
     그래서 목록 줄부터 같이 떠낸다. */
  const 목록줄 = html.split('\n').find((t) => t.startsWith('const 색인칸 ='));
  const 조각 = 목록줄 + '\n' + 떠내기('docFields', 'function ');
  const docFields = new Function(조각 + '; return docFields;')();
  const f = docFields({ id: 'c1', uid: 'U9', week: '2026-09-07', 이름: '가' });
  봄('🔴 uid 가 진짜 칸으로도 적힌다', f.uid && f.uid.stringValue, 'U9');
  봄('🔴 week 도 진짜 칸으로 적힌다 — 그 주의 순위를 거르는 열쇠다', f.week && f.week.stringValue, '2026-09-07');
  봄('   내용은 그대로 value 에 있다', JSON.parse(f.value.stringValue).uid, 'U9');
  봄('uid 가 없으면 칸도 안 만든다', 'uid' in docFields({ id: 'c1' }), false);
  봄('빈 uid 도 안 만든다', 'uid' in docFields({ uid: '' }), false);
  // 🔴 값이 두 벌이 되는 자리다 — 반드시 «한 곳(data.<칸>)»에서 떠야 어긋나지 않는다.
  봄('🔴 언제나 data 에서 뜬다', docFields({ uid: 'A' }).uid.stringValue, 'A');
  // ⚠ 색인 칸을 늘릴수록 «두 벌인 값»이 는다. 지금은 둘뿐이다.
  봄('색인 칸은 둘뿐이다 — 함부로 늘리지 않는다', 목록줄.includes("'uid', 'week'"), true);
}

/* ── ④ 만드는 자리마다 uid 를 넣는가 ────────────────────────── */
{
  const 코드 = 벗기기(html);
  봄('🔴 학생이 내는 클리닉에 uid 가 있다', /uid: authUid\(\), studentId:sid, name:state\.currentUser\.name/.test(코드), true);
  봄('🔴 질문에도 uid 가 있다', /const qna = \{id:'qn'\+Date\.now\(\), uid: authUid\(\)/.test(코드), true);
  // 🔴 강사가 «대신» 잡아 주는 자리에서 authUid() 를 쓰면 강사 uid 가 박혀
  //   정작 그 학생이 제 클리닉을 못 본다.
  봄('🔴 강사가 대신 잡을 때는 «그 학생»의 uid 를 넣는다',
    /uid: studentKeyOfSid\(sid\), studentId:sid, name:studentNameOf\(sid\)/.test(코드), true);
}

/* ── ④-b 순위가 «학생마다 한 문서»인가 ──────────────────────── */
//
// 🔴 2026-09-08 전에는 kv/rank:<월요일> 문서 «하나»에 모두의 점수가 배열로 있었다.
//   학생이 제 점수를 올리려면 그 문서를 통째로 써야 했고,
//   **한 학생이 남의 점수를 통째로 지울 수 있었다.** 규칙으로는 못 막는 모양이었다.
//   🔵 **모양을 바꿔야 규칙이 일할 수 있다** — 그것이 이 옮김의 요지다.
{
  const 코드 = 벗기기(html);
  봄('🔴 옛 «공용 배열 한 문서»를 안 쓴다', /dbSet\('rank:'/.test(코드), false);
  봄('🔴 내 문서 하나만 쓴다', /dbSetDoc\('ranks', monday \+ '__' \+ uid, mine\)/.test(코드), true);
  봄('그 주의 줄만 받아 온다', /dbGetCollectionWhere\('ranks', 'week', monday\)/.test(코드), true);
  봄('규칙이 «내 uid 가 박힌 것»만 쓰게 한다',
    /match \/ranks[\s\S]{0,300}request\.resource\.data\.uid == request\.auth\.uid/.test(rules), true);
  봄('🔵 읽기는 열어 둔다 — 순위표는 서로 보는 것이 의도다',
    /match \/ranks[\s\S]{0,160}allow read: if realAccount\(\);/.test(rules), true);
  봄('🔴 kv 에서 학생 쓰기 예외(rank:)가 사라졌다', /doc\.matches\('rank:/.test(rules), false);
}
/* ── ⑤ 규칙이 앱과 «같은 것»을 보는가 ───────────────────────── */
{
  봄('🔴 조교가 규칙에 있다 — 없으면 로그인해도 아무것도 못 본다',
    /match \/assistants\/\{doc\}/.test(rules), true);
  봄('클리닉을 «내 것만» 읽게 한다', /match \/clinics[\s\S]{0,220}resource\.data\.uid == request\.auth\.uid/.test(rules), true);
  봄('연락처는 강사만 — 학생끼리도 전화번호는 못 본다',
    /match \/contacts\/\{uid\} \{\s*allow read, write: if isTeacher\(\);/.test(rules), true);
  봄('맨 끝에 «그 밖은 전부 막는다»가 있다', /match \/\{document=\*\*\} \{\s*allow read, write: if false;/.test(rules), true);

  /* 🔵 앱이 만지는 컬렉션이 규칙에 «하나도 안 빠졌는지» 센다.
     ⚠ 조교가 빠져 있던 것을 이렇게 찾았다. 눈으로는 안 걸린다. */
  const 볼것 = fs.readFileSync(path.join(ROOT, 'tools/rules-check.mjs'), 'utf8');
  const 앱이만지는것 = [...볼것.matchAll(/\['([a-z]+)', '/g)].map((m) => m[1]);
  const 규칙에있는것 = new Set([...rules.matchAll(/match \/([a-z]+)\//g)].map((m) => m[1]));
  const 빠진것 = 앱이만지는것.filter((c) => !규칙에있는것.has(c));
  봄('🔴 앱이 만지는 컬렉션이 규칙에 하나도 안 빠졌다', 빠진것, []);

  /* 🔴 **규칙 언어는 한글 이름을 못 받는다** — 2026-09-08에 게시하려다 알았다
     (「token recognition error at: '강'」이 한 글자씩 쏟아졌다).
     이 프로젝트는 무엇이든 한글로 이름 짓기 때문에 **또 그럴 수 있다.** 그래서 못 박는다.
     ⚠ 주석은 한글 그대로 둔다 — 막히는 것은 «이름»뿐이다. 그래서 주석을 걷고 본다. */
  const 규칙알맹이 = stripComments(rules);
  const 한글이름 = [...규칙알맹이.matchAll(/([가-힣][가-힣A-Za-z0-9_]*)\s*\(/g)].map((m) => m[1]);
  봄('🔴 규칙 «코드»에 한글 이름이 없다', [...new Set(한글이름)], []);
}

console.log(틀림 ? '\n  🔴 ' + 통과 + ' 통과 · ' + 틀림 + ' 실패\n' : '\n  ✅ ' + 통과 + ' 통과 · 0 실패\n');
process.exit(틀림 ? 1 : 0);
