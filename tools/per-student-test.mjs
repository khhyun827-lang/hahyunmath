// 학생 기록·채팅 «바뀐 것만» 검사 (2026-10-22)
//
//   node tools/per-student-test.mjs
//
// 🔴 DB 를 안 건드린다 — index.html 에서 loadPerStudent 를 떼어 와 스텁(서버·IndexedDB)으로 돌린다.
//    붙드는 것: 처음엔 학생마다 한 건 · 다음엔 질의 한 번 · 바뀐 것·새 학생만 더 · 못 읽은 학생은 다음에 다시 ·
//    질의가 엎어지거나 12시간이 지나면 통째로 · 쓰는 문이 _t 를 적고 나가면 지운다.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
function liftFn(name) {
  const at = html.indexOf('function ' + name + '(');
  if (at < 0) throw new Error(name + ' 을 못 찾았습니다');
  const from = html.lastIndexOf('\n', at) + 1;
  for (let j = html.indexOf('{', at), d = 0; j < html.length; j++) {
    if (html[j] === '{') d++;
    else if (html[j] === '}' && !--d) return html.slice(from, j + 1);
  }
}

let pass = 0, fail = 0;
const 봄 = (무엇, 나온것, 나와야) => {
  const ok = JSON.stringify(나온것) === JSON.stringify(나와야);
  ok ? pass++ : fail++;
  console.log((ok ? '  ✓ ' : '  ✗ ') + 무엇 + (ok ? '' : `\n      나온 것 ${JSON.stringify(나온것)}\n      나와야 ${JSON.stringify(나와야)}`));
};

const 서버 = { u1: { n: 1 }, u2: { n: 2 }, c: { n: 3 } };    // c = 옛 학번 문서
const idb = new Map();
let 지금 = 1e9, 바뀜 = [], 질의실패 = false, 못읽을 = '';
function 열기(students) {
  const 읽음 = [], dbReadFailed = new Set();
  const f = new Function('DATA', 'Date', 'idbGet', 'idbSet', 'dbGetChangedSince', 'dbGetDoc', 'dbReadFailed', 'PER_STUDENT_TTL', 'DELTA_SKEW',
    liftFn('loadPerStudent') + '\nreturn loadPerStudent;')(
    { students }, { now: () => 지금 },
    async k => (idb.has(k) ? structuredClone(idb.get(k)) : null), async (k, v) => { idb.set(k, structuredClone(v)); },
    async (col, since) => { 읽음.push('질의>' + since); return 질의실패 ? null : 바뀜.filter(x => x.t > since); },
    async (col, id) => { 읽음.push(id); if (id === 못읽을) { dbReadFailed.add(col + '/' + id); return null; } return 서버[id] || null; },
    dbReadFailed, 12 * 3600e3, 600e3);
  return { 부름: () => f('records'), 읽음 };
}
const 명단 = [{ studentId: 'a', uid: 'u1' }, { studentId: 'b', uid: 'u2' }, { studentId: 'c' }, { studentId: 'd', uid: 'u4' }];

console.log('① 처음 — 학생마다 한 건 (못 읽은 학생은 빼 둔다)');
못읽을 = 'u2';
{ const T = 열기(명단); const d = await T.부름();
  봄('낱건 넷', T.읽음, ['u1', 'u2', 'c', 'u4']);
  봄('문서 — 옛 학번도 · 없는 학생은 없다', Object.keys(d).sort(), ['c', 'u1']);
  봄('못 읽은 u2 는 «받음»에 안 적힌다', idb.get('per:records').ids.sort(), ['c', 'u1', 'u4']); }

console.log('② 다음 — 질의 한 번 + 못 읽었던 학생만');
못읽을 = ''; 지금 += 60e3;
{ const T = 열기(명단); const d = await T.부름();
  봄('질의(한 시간 앞에서부터) + u2', T.읽음, ['질의>' + (1e9 - 3600e3), 'u2']);
  봄('u2 가 든다', d.u2, { n: 2 }); }

console.log('③ 바뀐 것 · 새 학생');
지금 += 60e3;
바뀜 = [{ id: 'u1', t: 지금 - 1000, row: { n: 11 } }, { id: 'u4', t: 지금 - 500, row: { n: 4 } }];
{ const T = 열기([...명단, { studentId: 'e', uid: 'u5' }]); const d = await T.부름();
  봄('질의 + 새 학생 u5 만', T.읽음.slice(1), ['u5']);
  봄('바뀐 것이 덮이고 새로 생긴 기록도 든다', [d.u1, d.u4], [{ n: 11 }, { n: 4 }]); }

console.log('④ 질의가 엎어지면 · 12시간이 지나면 — 통째로');
지금 += 60e3; 질의실패 = true;
{ const T = 열기(명단); await T.부름(); 봄('엎어지면 낱건 전부', T.읽음.slice(1).sort(), ['c', 'u1', 'u2', 'u4']); }
질의실패 = false; 지금 += 13 * 3600e3;
{ const T = 열기(명단); await T.부름(); 봄('12시간 넘으면 질의 없이 낱건 전부', T.읽음.sort(), ['c', 'u1', 'u2', 'u4']); }

console.log('⑤ 이어진 자리 (글자로)');
봄('쓰는 문이 기록·채팅에 _t 를 적는다', /PER_STUDENT\[collection\]\) fields\._t/.test(liftFn('deltaStamp')), true);
봄('강사 화면 둘이 이것을 쓴다', /loadPerStudent\('records'\)/.test(liftFn('loadAllRecordsIfNeeded')) && /loadPerStudent\('chats'\)/.test(liftFn('loadAllChatsIfNeeded')), true);
봄('나가면 지운다', /idbClear\(\)/.test(liftFn('logout')), true);

console.log(`\n${fail ? '🔴' : '🟢'} ${pass} 통과 · ${fail} 실패`);
process.exit(fail ? 1 : 0);
