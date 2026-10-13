// 옛 파일 잠그기 — 강의자료·학교 파일(프린트·시험지·분석)의 «링크 있는 누구나» 권한을 뗀다 (2026-10-13 · 보안 2단계)
//
//   node tools/lock-files.mjs          ← 세기만 한다(무엇을 잠글지 보여 줌)
//   node tools/lock-files.mjs --go     ← 실제로 잠근다
//
// 🔵 새로 올리는 것은 처음부터 잠겨 올라간다(uploadFileToDrive · private=1). 이것은 그 전에 올린 것을 위한 한 번짜리다.
// ⚠ 워커 2026-10-13a 이상이 붙어 있어야 한다(/admin/lock-files · /file). 먼저 잠그고 앱이 옛 판이면 학생이 자료를 못 연다 —
//   순서: 워커 붙이기 → 앱 배포 → 이것.
// ⚠ 강사로 로그인한다(.keys/firebase.json · fb-login.mjs). 워커가 «강사인지»를 본다.

import fs from 'fs';
import path from 'path';
import { 강사로로그인, ROOT } from './fb-login.mjs';

const 진짜 = process.argv.includes('--go');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const WORKER = (html.match(/AI_WORKER_URL\s*=\s*'([^']+)'/) || [])[1];
if (!WORKER) throw new Error('index.html 에서 AI_WORKER_URL 을 못 읽었습니다');

const { BASE, H, token } = await 강사로로그인();
const 값 = async id => {
  const r = await fetch(BASE + '/kv/' + encodeURIComponent(id), { headers: H });
  if (!r.ok) throw new Error('kv/' + id + ' 읽기 실패 ' + r.status);
  return JSON.parse((await r.json()).fields.value.stringValue || 'null');
};

/* 모으기 — kv/material:* 전부 + kv/school-files */
const 모음 = new Map();      // fileId → 이름
let pt = '';
do {
  const j = await (await fetch(BASE + '/kv?pageSize=300&mask.fieldPaths=__name__' + (pt ? '&pageToken=' + pt : ''), { headers: H })).json();
  for (const d of j.documents || []) {
    const id = decodeURIComponent(d.name.split('/').pop());
    if (!/^material:/.test(id)) continue;
    for (const m of (await 값(id)) || []) if (m && m.fileId) 모음.set(m.fileId, '자료 ' + id.slice(9) + ' · ' + m.name);
  }
  pt = j.nextPageToken || '';
} while (pt);
const sf = (await 값('school-files')) || {};
for (const [학교, byG] of Object.entries(sf)) for (const [학년, list] of Object.entries(byG || {}))
  for (const f of list || []) if (f && f.fileId) 모음.set(f.fileId, '학교 ' + 학교 + ' ' + 학년 + ' · ' + f.name);

console.log(`\n잠글 파일 ${모음.size}개` + (진짜 ? '' : ' — 세기만 했습니다. 잠그려면 --go'));
for (const [id, 이름] of 모음) console.log('  ' + id + '  ' + 이름);
if (!진짜) process.exit(0);

const ids = [...모음.keys()];
const 셈 = {};
for (let i = 0; i < ids.length; i += 15) {
  const r = await fetch(WORKER + '/admin/lock-files', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify({ fileIds: ids.slice(i, i + 15) }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { console.error('\n🔴 워커가 거절했습니다 (' + r.status + ') — ' + JSON.stringify(j).slice(0, 200)); process.exit(1); }
  for (const [id, 결과] of Object.entries(j.결과 || {})) { 셈[결과] = (셈[결과] || 0) + 1; if (!/locked|already/.test(결과)) console.log('  ⚠ ' + id + ' ' + 결과); }
}
console.log('\n결과', 셈);
process.exit(Object.keys(셈).every(k => /locked|already/.test(k)) ? 0 : 1);
