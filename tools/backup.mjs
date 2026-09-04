// Firestore 를 통째로 «읽어서» 파일로 받아 둔다 (2026-09-06)
//
//   node tools/backup.mjs [받을폴더]
//
// 🔴 **왜 만들었나** — 사용자가 「출석도장 … 일부 없어진것 같아」라고 물었을 때,
//    **견줄 것이 없어서 답을 못 했다.** 지금 무엇이 있는지는 셀 수 있지만
//    «어제 무엇이 있었나»를 모르면 «없어졌다»를 확인할 방법이 아예 없다.
//    🔵 그래서 첫 일이 백업이다. 한 번 받아 두면 그다음부터는 견줄 수 있다.
//
// ⚠ **읽기만 한다.** 한 줄도 쓰지 않는다.
// ⚠ 받은 파일에는 학생 이름·기록이 그대로 들어 있다 — 저장소에 올리지 않는다(.gitignore).

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const apiKey = (html.match(/apiKey:\s*"([^"]+)"/) || [])[1];
const projectId = (html.match(/projectId:\s*"([^"]+)"/) || [])[1];
if (!apiKey || !projectId) throw new Error('index.html 에서 firebase 설정을 못 읽었습니다.');

const res0 = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=' + apiKey,
  { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ returnSecureToken: true }) });
if (!res0.ok) throw new Error('익명 로그인 실패 (http ' + res0.status + ')');
const token = (await res0.json()).idToken;
const BASE = 'https://firestore.googleapis.com/v1/projects/' + projectId + '/databases/(default)/documents';
const H = { Authorization: 'Bearer ' + token };

const 컬렉션 = ['students', 'notices', 'consults', 'classes', 'clinics', 'clinicslots', 'qnas',
                'videos', 'assistants', 'exams', 'problembank', 'assignments', 'auditlog',
                'variants', 'items'];
const kv키 = ['teacher-pw', 'season', 'exam-ranges', 'school-books', 'grade-cuts', 'itemsVer'];

async function 컬렉션받기(c) {
  const out = []; let pt = '';
  do {
    const res = await fetch(BASE + '/' + c + '?pageSize=300' + (pt ? '&pageToken=' + pt : ''), { headers: H });
    if (res.status === 404) break;
    if (!res.ok) throw new Error(c + ' http ' + res.status);
    const j = await res.json();
    /* 문서 «id»도 같이 남긴다 — 값 안의 id 와 어긋난 문서를 나중에 찾을 수 있다. */
    for (const d of (j.documents || [])) {
      let v = null;
      try { v = JSON.parse(d.fields.value.stringValue); } catch (e) { v = { _못읽음: true }; }
      out.push({ _id: d.name.split('/').pop(), ...v });
    }
    pt = j.nextPageToken || '';
  } while (pt);
  return out;
}
async function kv받기(key) {
  const res = await fetch(BASE + '/kv/' + encodeURIComponent(key), { headers: H });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('kv/' + key + ' http ' + res.status);
  return JSON.parse((await res.json()).fields.value.stringValue);
}

const 이제 = new Date();
const p2 = (n) => String(n).padStart(2, '0');
const 스탬프 = `${이제.getFullYear()}${p2(이제.getMonth() + 1)}${p2(이제.getDate())}-${p2(이제.getHours())}${p2(이제.getMinutes())}`;
const 폴더 = process.argv[2] || path.join(ROOT, '백업', 스탬프);
fs.mkdirSync(폴더, { recursive: true });

console.log('\n받는 중 — ' + 폴더 + '\n');
const 요약 = { 받은때: 이제.toISOString(), 컬렉션: {}, kv: {}, 기록: 0 };

for (const c of 컬렉션) {
  const rows = await 컬렉션받기(c);
  fs.writeFileSync(path.join(폴더, c + '.json'), JSON.stringify(rows, null, 1), 'utf8');
  요약.컬렉션[c] = rows.length;
  console.log('  ' + c.padEnd(14) + String(rows.length).padStart(5) + '건');
}
const kv = {};
for (const k of kv키) kv[k] = await kv받기(k);
fs.writeFileSync(path.join(폴더, 'kv.json'), JSON.stringify(kv, null, 1), 'utf8');
요약.kv = Object.fromEntries(kv키.map(k => [k, kv[k] === null ? '없음' : '있음']));

/* 🔴 **학생 기록이 제일 중요하다** — 출석·성적·도장·오답숙제가 다 여기 있다.
   컬렉션이 아니라 kv 문서(`record:<학번>`)라, 학생 명단을 따라 하나씩 받아야 한다. */
const students = JSON.parse(fs.readFileSync(path.join(폴더, 'students.json'), 'utf8'));
const 기록 = {};
let 출석줄 = 0, 도장일 = 0, 성적줄 = 0;
for (const s of students) {
  if (!s.studentId) continue;
  const rec = await kv받기('record:' + s.studentId);
  if (!rec) continue;
  기록[s.studentId] = rec;
  출석줄 += (rec.attendance || []).length;
  성적줄 += (rec.scores || []).length;
  도장일 += rec.checkin && rec.checkin.days ? Object.keys(rec.checkin.days).length : 0;
}
fs.writeFileSync(path.join(폴더, 'records.json'), JSON.stringify(기록, null, 1), 'utf8');
요약.기록 = Object.keys(기록).length;
요약.출석줄 = 출석줄; 요약.성적줄 = 성적줄; 요약.도장일 = 도장일;
fs.writeFileSync(path.join(폴더, '요약.json'), JSON.stringify(요약, null, 1), 'utf8');

console.log('  ' + 'records'.padEnd(14) + String(Object.keys(기록).length).padStart(5) + '명');
console.log('\n  출석 줄 ' + 출석줄 + ' · 성적 줄 ' + 성적줄 + ' · 도장 ' + 도장일 + '일');
console.log('\n✅ 다 받았습니다 — ' + 폴더 + '\n');
console.log('  다음부터는 이렇게 견줍니다:  node tools/backup-diff.mjs 백업/<옛것> 백업/<새것>\n');
