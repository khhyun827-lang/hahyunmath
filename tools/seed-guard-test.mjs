// 씨앗 심기가 «있는 기록»을 지우지 않는가 (2026-09-04)
//
//   node tools/seed-guard-test.mjs
//
// 🔴 **이것 때문에 실제로 데이터가 지워졌다.** `dbGetCollection` 은 읽기가 엎어져도 빈 배열을
//    주는데(앱이 서면 안 되니까), `seedTestAccountIfEmpty` 가 그것을 «학생이 없다»로 읽고
//    씨앗을 심으면서 마지막 줄에서 `record:test` 를 **빈 기록으로 덮었다.**
//    출석·성적·오답숙제·출석 도장이 그 문서 하나에 다 들어 있었다.
//
//    증거 — 주간 순위(rank:2026-08-17·2026-08-24)에는 테스트학생이 08-23·08-30에 도장을
//    찍은 것이 남아 있는데 record:test 에는 그 날들이 없다.
//
// ⚠ 화면으로는 못 본다 — 읽기가 엎어진 «그 순간»에만 일어나고, 지나고 나면 그냥 «비어 있다».

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

function lift(name) {
  const at = html.indexOf('async function ' + name + '(');
  if (at < 0) throw new Error(name + ' 를 못 찾았습니다');
  let depth = 0;
  for (let j = html.indexOf('{', at); j < html.length; j++) {
    if (html[j] === '{') depth++;
    else if (html[j] === '}') { depth--; if (!depth) return html.slice(at, j + 1); }
  }
  throw new Error(name + ' 의 끝을 못 찾았습니다');
}

let pass = 0, fail = 0;
const 봄 = (무엇, 나온것, 나와야할것) => {
  const ok = JSON.stringify(나온것) === JSON.stringify(나와야할것);
  if (ok) { pass++; console.log('  ✓ ' + 무엇); }
  else { fail++; console.log(`  ✗ ${무엇}\n      나온 것: ${JSON.stringify(나온것)}\n      나와야:  ${JSON.stringify(나와야할것)}`); }
};

/* 있던 기록 — 출석 24줄, 도장 3일. 이것이 지워지면 안 된다. */
const 있던기록 = () => ({ attendance: new Array(24).fill({}), scores: [1, 2, 3],
  checkin: { last: '2026-08-30', days: { '2026-08-23': {}, '2026-08-27': {}, '2026-08-30': {} } } });

function makeWorld({ 못읽음 = false, 기록있음 = true, 학생있음 = false } = {}) {
  const w = { 쓴것: [], kv: {} };
  if (기록있음) w.kv['record:test'] = 있던기록();
  const DATA = { classes: 학생있음 ? [{ id: 'c1' }] : [], students: 학생있음 ? [{ studentId: 's1' }] : [], records: {} };
  const recordLoaded = new Map();
  const api = new Function(
    'DATA', 'dbReadTrouble', 'dbSetDoc', 'dbGet', 'dbSet', 'adoptRecord', 'saveRecord',
    'emptyRecord', 'recordLoaded', 'console',
    lift('seedTestAccountIfEmpty') + '\nreturn { seedTestAccountIfEmpty };'
  )(DATA,
    () => 못읽음,
    async (c, id, d) => { w.쓴것.push({ coll: c, id }); return true; },
    async (k, fb) => (k in w.kv ? w.kv[k] : fb),
    async (k, v) => { w.kv[k] = v; w.쓴것.push({ coll: 'kv', id: k }); return true; },
    (id, rec) => { DATA.records[id] = rec; recordLoaded.set(id, rec); return rec; },
    async (id) => { w.kv['record:' + id] = DATA.records[id]; w.쓴것.push({ coll: 'kv', id: 'record:' + id }); return true; },
    () => ({ attendance: [], scores: [], checkin: { last: '', days: {} } }),
    recordLoaded, { warn: () => {}, error: () => {}, log: () => {}, info: () => {} });
  return Object.assign(w, api, { DATA });
}

console.log('\n씨앗 심기 — 있는 기록을 지우지 않는가\n');

{ // 🔴 실제로 일어난 그 일
  const w = makeWorld({ 못읽음: true, 기록있음: true });
  await w.seedTestAccountIfEmpty();
  봄('🔴 못 읽은 것이 있으면 아예 안 심는다', w.쓴것.length, 0);
  봄('🔴 도장이 그대로 남는다', Object.keys(w.kv['record:test'].checkin.days).length, 3);
  봄('🔴 출석도 그대로 남는다', w.kv['record:test'].attendance.length, 24);
}
/* 🔵 **2026-09-07 — 씨앗 심기를 껐다. 그래서 잣대가 뒤집혔다.**
   여기는 빈 DB 를 보면 `{studentId:'test', pw:'1234'}` 를 심었는데, 인증을 Firebase Auth 로
   옮기는 일의 요지가 **비밀번호를 Firestore 에서 없애는 것**이다. 그대로 두면 사이트를 한 번
   열 때마다 **평문 비밀번호를 도로 넣는다.**
   ⚠ 그래서 이제 「심는가」가 아니라 **「안 심는가」**를 붙든다. 위 ①(못 읽었을 때 안 심는다)은
     그대로 두었다 — 그 잣대는 여전히 옳고, 09-04의 사고를 붙드는 자리다. */
{ // ② 진짜로 비어 있어도 이제는 아무것도 안 심는다
  const w = makeWorld({ 못읽음: false, 기록있음: true });
  await w.seedTestAccountIfEmpty();
  봄('🔴 비어 있어도 아무것도 안 쓴다', w.쓴것.length, 0);
  봄('🔴 있는 기록은 그대로다', Object.keys(w.kv['record:test'].checkin.days).length, 3);
}
{ // ③ 처음이어도 안 심는다 — 계정은 강사가 만든다
  const w = makeWorld({ 못읽음: false, 기록있음: false });
  await w.seedTestAccountIfEmpty();
  봄('🔴 처음이어도 안 심는다', w.쓴것.length, 0);
  봄('🔴 학생을 메모리에도 안 얹는다', w.DATA.students.length, 0);
}
{ // ④ 🔴 «평문 비밀번호»를 도로 심지 않는가 — 이게 이번 일의 요지다
  //   ⚠ 소스 «글자»만 보면 주석에 적힌 옛 코드에 걸린다(실제로 걸렸다).
  //     검사가 「무엇을 보고 있는지」를 헷갈리면 이렇게 거짓으로 운다.
  //     그래서 주석을 걷어낸 «진짜 코드»를 본다.
  const 코드 = lift('seedTestAccountIfEmpty')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '');
  봄('🔴 pw 를 심는 줄이 «코드»에 없다', /pw\s*:/.test(코드), false);
  봄('🔴 문서를 아예 안 쓴다', /dbSetDoc|dbSet\(/.test(코드), false);
}
{ // ④ 학생이 이미 있으면 아무것도 안 한다
  const w = makeWorld({ 못읽음: false, 기록있음: true, 학생있음: true });
  await w.seedTestAccountIfEmpty();
  봄('학생이 있으면 손대지 않는다', w.쓴것.length, 0);
}

console.log(`\n  ${fail ? '🔴' : '✅'} ${pass} 통과 · ${fail} 실패\n`);
process.exit(fail ? 1 : 0);
