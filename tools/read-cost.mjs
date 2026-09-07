// 로그인 한 번이 Firestore 를 «몇 건» 읽는지 센다 (2026-09-07)
//
//   node tools/read-cost.mjs
//
// 🔵 왜 — `loadAll` 이 로그인마다 컬렉션 여럿을 통째로 읽는다. 어디를 고쳐야 값이 큰지는
//   «짐작»으로 고를 일이 아니다. 하루 읽기 한도가 5만 건이고, 테스트 새로고침만으로
//   태운 적이 실제로 있다.
//
// 🔴 **세는 것 자체가 한도를 쓰면 안 된다.** 그래서 문서를 «받지» 않고 COUNT 만 묻는다
//   (`runAggregationQuery`). 셈 하나가 1000건까지 **읽기 1건**으로 쳐지므로,
//   컬렉션 열둘을 다 세도 **열댓 건**이면 끝난다. 통째로 받으면 그 자리에서 수천 건이다.
//
// ⚠ 이 도구는 «지금 이 순간»의 크기를 잰다. 자라는 컬렉션은 다음 달에 다시 재야 한다 —
//   그래서 「몇 건이더라」가 아니라 **「무엇이 자라나」**를 같이 적는다.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const apiKey = (html.match(/apiKey:\s*"([^"]+)"/) || [])[1];
const projectId = (html.match(/projectId:\s*"([^"]+)"/) || [])[1];
if (!apiKey || !projectId) { console.error('🔴 index.html 에서 Firebase 설정을 못 읽었다'); process.exit(1); }
const FS = 'https://firestore.googleapis.com/v1/projects/' + projectId + '/databases/(default)/documents';

const a0 = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=' + apiKey,
  { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ returnSecureToken: true }) });
const 표 = await a0.json();
if (!표.idToken) { console.error('🔴 익명 로그인 실패: ' + JSON.stringify(표).slice(0, 200)); process.exit(1); }
const FH = { Authorization: 'Bearer ' + 표.idToken, 'Content-Type': 'application/json' };

/* ── loadAll 이 읽는 것들 ────────────────────────────────────────────
   ⚠ 이 표는 `index.html` 의 `loadAll` 을 손으로 옮긴 것이다. loadAll 을 고치면
     여기도 같이 고칠 것 — 안 그러면 «고친 뒤에도 옛 값»을 재게 된다. */
const 컬렉션 = [
  ['students',    '학생',        '자란다(신입생)'],
  ['notices',     '공지',        '자란다'],
  ['consults',    '상담',        '자란다'],
  ['classes',     '반',          '거의 안 자란다'],
  ['clinics',     '클리닉',      '🔴 끝없이 자란다'],
  ['clinicslots', '클리닉 시간',  '거의 안 자란다'],
  ['qnas',        '질문',        '🔴 끝없이 자란다'],
  ['videos',      '영상',        '자란다'],
  ['assistants',  '조교',        '거의 안 자란다'],
  ['exams',       '시험지',      '🔴 끝없이 자란다'],
  ['problembank', '문제은행',    '🔴 끝없이 자란다'],
  ['assignments', '과제',        '🔴 끝없이 자란다'],
];
const 낱건 = [
  ['teacher-pw', '강사 비번'], ['season', '시즌'], ['exam-ranges', '시험 범위'],
  ['school-books', '학교 교재'], ['grade-cuts', '등급컷'],
];

async function 세기(c) {
  const r = await fetch(FS + ':runAggregationQuery', {
    method: 'POST', headers: FH,
    body: JSON.stringify({ structuredAggregationQuery: {
      structuredQuery: { from: [{ collectionId: c }] },
      aggregations: [{ alias: 'n', count: {} }],
    } }),
  });
  if (!r.ok) return { 흠: 'http ' + r.status + ' ' + (await r.text()).replace(/\s+/g, ' ').slice(0, 90) };
  const j = await r.json();
  const v = j?.[0]?.result?.aggregateFields?.n?.integerValue;
  if (v == null) return { 흠: '셈을 못 읽음' };
  return { n: +v };
}

console.log('\n  ══ 로그인 한 번이 읽는 것 ══\n');
let 합 = 0;
const 큰것 = [];
for (const [c, 이름, 결] of 컬렉션) {
  const r = await 세기(c);
  if (r.흠) { console.log('  🔴 ' + 이름.padEnd(10) + r.흠); continue; }
  합 += r.n;
  // ⚠ 컬렉션이 «비면» migrateBlobToCollection 이 옛 kv 블롭을 한 번 더 읽는다 — 그것도 센다.
  const 덤 = r.n === 0 ? 1 : 0;
  합 += 덤;
  큰것.push({ c, 이름, n: r.n, 결 });
  console.log('  ' + String(r.n).padStart(6) + '  ' + 이름.padEnd(12) + (c + '').padEnd(14) + 결
    + (덤 ? '   ⚠ 비어 있어 옛 블롭을 한 건 더 읽는다' : ''));
}
const 로그 = await 세기('auditlog');
console.log('\n  ' + String(로그.n ?? '?').padStart(6) + '  변경 이력    auditlog      '
  + '🔴 끝없이 자란다 — 하지만 로그인 때는 **한 건도 안 읽는다**(09-07 · 화면을 열 때만)');
// ⚠ 로그인 셈에 안 더한다. 「설정 › 변경 이력」을 열면 그때 최근 60일치를 받는다.
console.log('  ' + String(1).padStart(6) + '  문항 창고    items         564제이지만 **한 건**만 읽는다(#1, 09-06에 고쳤다)');
합 += 1;
합 += 낱건.length;
console.log('  ' + String(낱건.length).padStart(6) + '  낱건 다섯    ' + 낱건.map((x) => x[0]).join(' · '));

console.log('\n  ── 합 ' + 합 + '건 / 로그인 한 번');
console.log('     하루 5만 건이면 새로고침 ' + Math.floor(50000 / Math.max(1, 합)) + '번쯤에서 바닥난다.');

큰것.sort((a, b) => b.n - a.n);
console.log('\n  ── 큰 것부터 (고칠 값이 큰 차례)');
for (const x of 큰것.slice(0, 5))
  console.log('     ' + String(x.n).padStart(6) + '  ' + x.이름.padEnd(12) + x.결);
console.log('\n  🔵 «자라는데 큰 것»만 고칠 값이 있다 — 작은 것은 몇 건 아껴 봐야 티가 안 난다.');
console.log('  ⚠ 캐시가 언제나 답은 아니다 — 클리닉·질문을 재우면 «낡은 화면»을 보게 된다.\n');
