// 결석 보충 영상이 «한 학생·한 날짜에 여럿» 난 것을 하나로 (2026-09-13 · K-5)
//
//   node tools/video-dup-repair.mjs          ← 보기만 한다
//   node tools/video-dup-repair.mjs --go     ← 지운다
//
// 🔴 **왜 생겼나** — 수업 화면이 단계를 옮길 때마다 출결을 저장했고(sessionAutoSave), 출결 초안의 보충 영상
//    링크는 그대로 남아 있어 **저장할 때마다 개인 영상이 한 건씩 늘었다.** 사용자가 「세개씩」이라 신고했다.
//    코드는 고쳤고(같은 날 같은 학생이면 안 만든다), 이 도구는 이미 생긴 것을 치운다.
//
// ▶ 같은 (학생 · 제목) 의 영상을 모아 **하나만 남긴다** — 학생이 본 기록(records/<uid>.videoProgress)이 있는 것이
//    있으면 그것을, 없으면 **가장 먼저 만든 것**(id 의 시각이 가장 이른 것)을. 나머지는 지운다.
//    🔴 둘 이상에 시청 기록이 있으면 손대지 않고 사람에게 보인다.

import { 강사로로그인 } from './fb-login.mjs';

const GO = process.argv.includes('--go');
const { BASE, H } = await 강사로로그인();

async function 목록(col) {
  const out = []; let pageToken = '';
  do {
    const r = await fetch(BASE + '/' + col + '?pageSize=300' + (pageToken ? '&pageToken=' + encodeURIComponent(pageToken) : ''), { headers: H });
    if (r.status === 404) break;
    if (!r.ok) throw new Error(col + ' 목록 실패 http ' + r.status);
    const j = await r.json();
    for (const d of (j.documents || [])) {
      let value = null; try { value = JSON.parse(d.fields.value.stringValue); } catch (e) { }
      out.push({ id: d.name.split('/').pop(), value });
    }
    pageToken = j.nextPageToken || '';
  } while (pageToken);
  return out;
}
async function 문서(col, id) {
  const r = await fetch(BASE + '/' + col + '/' + encodeURIComponent(id), { headers: H });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(col + '/' + id + ' http ' + r.status);
  try { return JSON.parse((await r.json()).fields.value.stringValue); } catch (e) { return null; }
}
async function 지우기(col, id) {
  const r = await fetch(BASE + '/' + col + '/' + encodeURIComponent(id), { method: 'DELETE', headers: H });
  if (!r.ok) throw new Error('지우기 실패 ' + col + '/' + id + ' http ' + r.status);
}
const 시각 = id => Number((String(id).match(/^v(\d+)/) || [])[1] || 0);

const videos = (await 목록('videos')).filter(d => d.value && d.value.studentId);
const students = await 목록('students');
const uidOf = sid => { const s = students.find(d => d.value && d.value.studentId === sid); return s && (s.value.uid || s.id); };
console.log('\n개인 배정 영상 ' + videos.length + '건');

const 묶음 = new Map();
for (const d of videos) {
  const k = d.value.studentId + '|' + (d.value.title || '') ;
  if (!묶음.has(k)) 묶음.set(k, []);
  묶음.get(k).push(d);
}
const 겹친것 = [...묶음.entries()].filter(([, v]) => v.length > 1);
if (!겹친것.length) { console.log('겹친 것이 없습니다.\n'); process.exit(0); }
console.log('겹친 묶음 ' + 겹친것.length + '개\n');

const 계획 = []; let 막힘 = 0;
for (const [k, list] of 겹친것) {
  const sid = list[0].value.studentId;
  const rec = await 문서('records', uidOf(sid) || sid);
  const prog = (rec && rec.videoProgress) || {};
  const 본것 = list.filter(d => prog[d.id]);
  if (본것.length > 1) { console.log('  🔴 ' + k + ' — 시청 기록이 ' + 본것.length + '개에 있어 손으로 봐야 합니다'); 막힘++; continue; }
  const keep = 본것[0] || list.slice().sort((a, b) => 시각(a.id) - 시각(b.id))[0];
  const drop = list.filter(d => d !== keep);
  console.log('  ' + k + ' — ' + list.length + '건 → 남김 ' + keep.id + (본것[0] ? ' (시청 기록 있음)' : ' (가장 먼저 만든 것)')
    + ' · 지움 ' + drop.map(d => d.id).join(', '));
  계획.push({ keep, drop });
}
if (막힘) { console.log('\n🔴 ' + 막힘 + '묶음은 손으로 봐야 해서 멈춥니다.\n'); process.exit(1); }
if (!GO) { console.log('\n(보기만 했습니다 — 실제로 지우려면 --go)\n'); process.exit(0); }
async function 쓰기(col, id, data) {
  const r = await fetch(BASE + '/' + col + '/' + encodeURIComponent(id), { method: 'PATCH', headers: { ...H, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { value: { stringValue: JSON.stringify(data) } } }) });
  if (!r.ok) throw new Error('쓰기 실패 ' + col + '/' + id + ' http ' + r.status);
}
let n = 0, m = 0;
for (const p of 계획) {
  for (const d of p.drop) { await 지우기('videos', d.id); n++; }
  /* K-4 전에 만든 것이라 마감이 없다 — 결석일(제목 앞 날짜) +7일을 단다 */
  const v = p.keep.value, day = (String(v.title || '').match(/^(\d{4}-\d{2}-\d{2})/) || [])[1];
  if (!v.dueDate && day) { v.dueDate = new Date(Date.parse(day + 'T00:00:00Z') + 7 * 86400000).toISOString().slice(0, 10); await 쓰기('videos', p.keep.id, v); m++; }
}
console.log('\n✓ ' + n + '건을 지웠고 ' + m + '건에 마감(+7일)을 달았습니다. 앱을 새로고침하면 한 건씩 보입니다.\n');
