// 학생 문서가 «한 사람에 둘» 난 것을 찾아 하나로 합친다 (2026-09-13)
//
//   node tools/student-dup-repair.mjs          ← 보기만 한다 (아무것도 안 바꾼다)
//   node tools/student-dup-repair.mjs --go     ← 합치고 지운다
//
// 🔴 **왜 생겼나** — 사용자가 엑셀로 14명을 한꺼번에 넣고, 명단에서 골라 「반 이동」으로
//    고1GA1 에 넣었더니 **한 사람이 «미배정»·«고1GA1» 둘로 복제**됐다. 설정에서 하나를
//    고르면 둘이 같이 골라져 지울 수도 없었다.
//    까닭: 09-07에 저장 열쇠를 학번 → Auth uid 로 옮기면서(`studentKeyOfSid`) **세 자리를
//    빠뜨렸다** — `rosterBulkMoveClass` · `withdrawStudent` · `restoreStudent` 가 여전히
//    학번을 문서 이름으로 썼다. 그래서 `students/<uid>`(반 없음) 옆에 `students/<학번>`(반 있음)이
//    하나 더 생겼고, 화면은 둘 다 읽어 두 줄로 그렸다. 고르기는 학번으로 하니 둘이 같이 켜졌다.
//    코드는 고쳤고, 이 도구는 **이미 생긴 것**을 치운다.
//
// ▶ 어떻게 합치나
//    · 같은 학번의 문서를 모아 **이름이 uid 인 것을 남긴다** (규칙이 `students/{uid}` 를 원한다).
//    · 값은 **나중에 저장된 것이 이긴다** — 반 이동은 학번 문서에 «나중에» 적혔으니 그 반이 산다.
//    · 나머지 문서는 지운다. 🔴 `--go` 없이는 한 글자도 안 바꾼다.
//    · 딸린 것(contacts · records)이 학번 이름으로도 있는지 **보고만 한다** —
//      `saveRecord` 는 처음부터 uid 로 썼으니 없어야 맞다. 있으면 여기서 멈추고 사람이 본다.

import { 강사로로그인 } from './fb-login.mjs';

const GO = process.argv.includes('--go');
const { BASE, H } = await 강사로로그인();

async function 목록(col) {
  const out = [];
  let pageToken = '';
  do {
    const r = await fetch(BASE + '/' + col + '?pageSize=300' + (pageToken ? '&pageToken=' + encodeURIComponent(pageToken) : ''), { headers: H });
    if (r.status === 404) break;
    if (!r.ok) throw new Error(col + ' 목록 실패 http ' + r.status + ' ' + (await r.text()).slice(0, 200));
    const j = await r.json();
    for (const d of (j.documents || [])) {
      let value = null;
      try { value = JSON.parse(d.fields.value.stringValue); } catch (e) { }
      out.push({ id: d.name.split('/').pop(), value, updateTime: d.updateTime || '' });
    }
    pageToken = j.nextPageToken || '';
  } while (pageToken);
  return out;
}

/* 앱의 docFields 와 같은 꼴로 쓴다 — 색인칸은 학생 문서에 없으니 value 하나면 된다. */
async function 쓰기(col, id, data) {
  const r = await fetch(BASE + '/' + col + '/' + encodeURIComponent(id), {
    method: 'PATCH', headers: { ...H, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { value: { stringValue: JSON.stringify(data) } } }),
  });
  if (!r.ok) throw new Error('쓰기 실패 ' + col + '/' + id + ' http ' + r.status);
}
async function 지우기(col, id) {
  const r = await fetch(BASE + '/' + col + '/' + encodeURIComponent(id), { method: 'DELETE', headers: H });
  if (!r.ok) throw new Error('지우기 실패 ' + col + '/' + id + ' http ' + r.status);
}

const docs = await 목록('students');
console.log('\n학생 문서 ' + docs.length + '건');

const 묶음 = new Map();   // 학번 → [문서]
for (const d of docs) {
  const sid = d.value && d.value.studentId;
  if (!sid) { console.log('  ⚠ 학번이 없는 문서: ' + d.id); continue; }
  if (!묶음.has(sid)) 묶음.set(sid, []);
  묶음.get(sid).push(d);
}
const 겹친것 = [...묶음.entries()].filter(([, v]) => v.length > 1);
if (!겹친것.length) { console.log('겹친 학생이 없습니다. 할 일이 없습니다.\n'); process.exit(0); }

/* 딸린 것도 학번 이름으로 새지 않았는지 본다 — 새었으면 손대기 전에 사람이 봐야 한다. */
const contacts = new Set((await 목록('contacts')).map(d => d.id));
const records = new Set((await 목록('records')).map(d => d.id));

console.log('겹친 학생 ' + 겹친것.length + '명\n');
const 계획 = [];
let 막힘 = 0;
for (const [sid, list] of 겹친것) {
  const uidDocs = list.filter(d => d.value.uid && d.id === d.value.uid);
  const keep = uidDocs[0] || list.find(d => d.id === sid) || list[0];
  if (uidDocs.length > 1) { console.log('  🔴 ' + sid + ': uid 문서가 ' + uidDocs.length + '개 — 손으로 봐야 합니다'); 막힘++; continue; }
  const drop = list.filter(d => d !== keep);
  /* 나중 것이 이긴다 — 단, 문서 이름과 uid 는 남기는 쪽 것이다. */
  const byTime = list.slice().sort((a, b) => a.updateTime.localeCompare(b.updateTime));
  const merged = Object.assign({}, ...byTime.map(d => d.value));
  if (keep.value.uid) merged.uid = keep.value.uid;
  const 딸린것새김 = drop.filter(d => contacts.has(d.id) || records.has(d.id)).map(d => d.id);
  if (딸린것새김.length) { console.log('  🔴 ' + sid + ': contacts/records 가 ' + 딸린것새김.join(',') + ' 이름으로도 있습니다 — 손으로 봐야 합니다'); 막힘++; continue; }
  const 반 = v => (v.classId || '(미배정)') + (v.classIds && v.classIds.length ? '+' + v.classIds.join(',') : '') + (v.withdrawnAt ? ' [퇴원]' : '');
  console.log('  ' + sid + ' ' + (merged.name || '') + ' — 남김 ' + keep.id + ' (' + 반(keep.value) + ')'
    + drop.map(d => ' · 지움 ' + d.id + ' (' + 반(d.value) + ')').join('')
    + ' → 합친 값: ' + 반(merged));
  계획.push({ sid, keep, drop, merged });
}

if (막힘) { console.log('\n🔴 ' + 막힘 + '명은 손으로 봐야 해서 멈춥니다. 나머지도 안 건드립니다.\n'); process.exit(1); }
if (!GO) { console.log('\n(보기만 했습니다 — 실제로 합치려면 --go)\n'); process.exit(0); }

let 됨 = 0;
for (const p of 계획) {
  await 쓰기('students', p.keep.id, p.merged);
  for (const d of p.drop) await 지우기('students', d.id);
  됨++;
}
console.log('\n✓ ' + 됨 + '명을 하나로 합쳤습니다. 앱을 새로고침하면 한 줄씩 보입니다.\n');
