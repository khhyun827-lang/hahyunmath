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
  const w = { 문서: [], 컬렉션: [], 내것: [] };
  const DATA = {};
  const fn = new Function('DATA', 'dbGetDoc', 'dbGetCollection', 'dbGetCollectionByUid',
    떠내기('loadStudentData') + '; return loadStudentData;')(
    DATA,
    async (c, id, fb) => { w.문서.push(c + '/' + id); return { studentId: 's1', uid: id, name: '나' }; },
    async (c) => { w.컬렉션.push(c); return [{ id: 'x' }]; },
    async (c, uid) => { w.내것.push(c + '@' + uid); return [{ id: 'y', uid }]; },
  );
  await fn('U1');

  봄('🔴 명단은 «제 문서 하나»만 읽는다', w.문서, ['students/U1']);
  봄('🔴 명단 전체(students 컬렉션)는 «안» 읽는다', w.컬렉션.includes('students'), false);
  봄('   그래도 DATA.students 에 내가 들어 있다 — 화면이 나를 찾는다', DATA.students.length, 1);
  봄('🔴 클리닉·질문은 «내 것만» 거른다', w.내것, ['clinics@U1', 'qnas@U1']);

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
  const 조각 = 떠내기('docFields', 'function ');
  const docFields = new Function(조각 + '; return docFields;')();
  const f = docFields({ id: 'c1', uid: 'U9', 이름: '가' });
  봄('🔴 uid 가 진짜 칸으로도 적힌다', f.uid && f.uid.stringValue, 'U9');
  봄('   내용은 그대로 value 에 있다', JSON.parse(f.value.stringValue).uid, 'U9');
  봄('uid 가 없으면 칸도 안 만든다', 'uid' in docFields({ id: 'c1' }), false);
  봄('빈 uid 도 안 만든다', 'uid' in docFields({ uid: '' }), false);
  // 🔴 값이 두 벌이 되는 자리다 — 반드시 «한 곳(data.uid)»에서 떠야 어긋나지 않는다.
  봄('🔴 언제나 data.uid 에서 뜬다', docFields({ uid: 'A' }).uid.stringValue, 'A');
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

/* ── ⑤ 규칙이 앱과 «같은 것»을 보는가 ───────────────────────── */
{
  봄('🔴 조교가 규칙에 있다 — 없으면 로그인해도 아무것도 못 본다',
    /match \/assistants\/\{doc\}/.test(rules), true);
  봄('클리닉을 «내 것만» 읽게 한다', /match \/clinics[\s\S]{0,220}resource\.data\.uid == request\.auth\.uid/.test(rules), true);
  봄('연락처는 강사만', /match \/contacts\/\{uid\} \{\s*allow read, write: if 강사인가\(\);/.test(rules), true);
  봄('맨 끝에 «그 밖은 전부 막는다»가 있다', /match \/\{document=\*\*\} \{\s*allow read, write: if false;/.test(rules), true);

  /* 🔵 앱이 만지는 컬렉션이 규칙에 «하나도 안 빠졌는지» 센다.
     ⚠ 조교가 빠져 있던 것을 이렇게 찾았다. 눈으로는 안 걸린다. */
  const 볼것 = fs.readFileSync(path.join(ROOT, 'tools/rules-check.mjs'), 'utf8');
  const 앱이만지는것 = [...볼것.matchAll(/\['([a-z]+)', '/g)].map((m) => m[1]);
  const 규칙에있는것 = new Set([...rules.matchAll(/match \/([a-z]+)\//g)].map((m) => m[1]));
  const 빠진것 = 앱이만지는것.filter((c) => !규칙에있는것.has(c));
  봄('🔴 앱이 만지는 컬렉션이 규칙에 하나도 안 빠졌다', 빠진것, []);
}

console.log(틀림 ? '\n  🔴 ' + 통과 + ' 통과 · ' + 틀림 + ' 실패\n' : '\n  ✅ ' + 통과 + ' 통과 · 0 실패\n');
process.exit(틀림 ? 1 : 0);
