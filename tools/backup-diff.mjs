// 백업 둘을 견준다 — «없어졌다»를 눈으로 본다 (2026-09-04)
//
//   node tools/backup-diff.mjs 백업/<옛것> 백업/<새것>
//   node tools/backup-diff.mjs 백업/<옛것>              (새것 자리는 «지금»으로 본다 → 먼저 backup 을 받는다)
//
// 🔴 **줄어든 것만 크게 말한다.** 늘어난 것은 평소에 늘 있는 일이라 세기만 한다.
//    사라진 학생·사라진 출석 줄·사라진 도장이 이 도구가 잡으려는 것 전부다.

import fs from 'fs';
import path from 'path';

const [옛, 새] = process.argv.slice(2);
if (!옛) { console.error('쓰는 법: node tools/backup-diff.mjs 백업/<옛것> [백업/<새것>]'); process.exit(1); }
if (!새) { console.error('새것 폴더도 주세요 — 먼저 `node tools/backup.mjs` 로 지금을 받으면 됩니다.'); process.exit(1); }

const 읽기 = (dir, f) => {
  const p = path.join(dir, f);
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null;
};

let 경고 = 0;
const 줄 = (mark, s) => console.log('  ' + mark + ' ' + s);

console.log('\n' + 옛 + '  →  ' + 새 + '\n');

/* ① 컬렉션 건수 */
console.log('컬렉션');
for (const f of fs.readdirSync(옛).filter(x => x.endsWith('.json') && !['kv.json', 'records.json', '요약.json'].includes(x))) {
  const a = 읽기(옛, f) || [], b = 읽기(새, f) || [];
  const d = b.length - a.length;
  if (d < 0) { 경고++; 줄('🔴', f.replace('.json', '').padEnd(14) + a.length + ' → ' + b.length + '  (' + d + ')'); }
  else if (d > 0) 줄('+', f.replace('.json', '').padEnd(14) + a.length + ' → ' + b.length + '  (+' + d + ')');
}

/* ② 학생 기록 — 여기가 진짜다 */
const A = 읽기(옛, 'records.json') || {}, B = 읽기(새, 'records.json') || {};
const 이름 = {};
for (const s of (읽기(옛, 'students.json') || [])) 이름[s.studentId] = s.name;
const 센다 = (rec) => ({
  출석: (rec.attendance || []).length,
  성적: (rec.scores || []).length,
  오답: (rec.wrongHomework || []).length,
  도장: Object.keys((rec.checkin || {}).days || {}).length,
  퀴즈: (((rec.dailyQuiz || {}).log) || []).length,
});

console.log('\n학생 기록');
let 줄어든학생 = 0;
for (const sid of Object.keys(A)) {
  if (!B[sid]) { 경고++; 줄어든학생++; 줄('🔴', (이름[sid] || sid) + '  기록 문서가 통째로 없어졌다'); continue; }
  const a = 센다(A[sid]), b = 센다(B[sid]);
  const 준 = Object.keys(a).filter(k => b[k] < a[k]);
  if (준.length) {
    경고++; 줄어든학생++;
    줄('🔴', String(이름[sid] || sid).padEnd(9) + 준.map(k => k + ' ' + a[k] + '→' + b[k]).join(' · '));
  }
}
if (!줄어든학생) 줄('✓', '줄어든 학생 없음 (' + Object.keys(A).length + '명 확인)');

const 합 = (R) => Object.values(R).reduce((t, r) => {
  const c = 센다(r); return { 출석: t.출석 + c.출석, 성적: t.성적 + c.성적, 도장: t.도장 + c.도장 };
}, { 출석: 0, 성적: 0, 도장: 0 });
const ha = 합(A), hb = 합(B);
console.log('\n합계   출석 ' + ha.출석 + ' → ' + hb.출석
          + ' · 성적 ' + ha.성적 + ' → ' + hb.성적
          + ' · 도장 ' + ha.도장 + ' → ' + hb.도장);

console.log('\n' + (경고 ? '  🔴 줄어든 곳 ' + 경고 + '군데 — 위를 봐주세요.\n'
                         : '  ✅ 줄어든 것이 없습니다.\n'));
process.exit(경고 ? 1 : 0);
