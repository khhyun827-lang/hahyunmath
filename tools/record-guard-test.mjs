// 「빈 기록으로 있는 기록을 덮지 않는다」 — 쓰는 문 하나에 세운 안전망 (2026-09-04)
//
//   node tools/record-guard-test.mjs
//
// 🔴 **기록 문서 하나에 출석·성적·오답숙제·출석 도장이 다 들어 있다.**
//    그래서 이 문서를 빈 것으로 덮는 것은 그 학생의 모든 것을 지우는 일이다.
//    실제로 당했다 — 씨앗 심기가 record:test 를 emptyRecord() 로 덮었다.
//
// ⚠ **자리를 세 군데서 찾았다** — 씨앗 심기 · 학생 추가 · 명단 가져오기.
//    셋 다 «이미 있나»를 DATA.students 로 보는데, 그 배열은 읽기가 엎어지면 빈 배열이다.
//    🔴 자리마다 막으면 다음에 네 번째 자리가 생긴다. 그래서 «쓰는 문»에 세웠고,
//       이 검사는 그 문이 실제로 잠기는지를 본다.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

function lift(name, kind = 'function') {
  const at = html.indexOf(kind + ' ' + name + '(');
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

const 빈것 = () => ({ attendance: [], scores: [], wrongHomework: [], checkin: { days: {} },
                     videoProgress: {}, assignmentsDone: {}, dailyQuiz: { log: [] } });
const 있는것 = () => ({ attendance: [{}, {}], scores: [1], wrongHomework: [],
                       checkin: { days: { '2026-08-23': {} } }, videoProgress: {},
                       assignmentsDone: {}, dailyQuiz: { log: [] } });

function makeWorld({ 저장된것 = null, 읽어봤나 = false } = {}) {
  const w = { 쓴것: [], kv: {}, 토스트: 0 };
  if (저장된것) w.kv['record:s1'] = 저장된것;
  const DATA = { records: {} };
  const recordLoaded = new Map();
  const dbReadOK = new Set(읽어봤나 ? ['record:s1'] : []);
  const api = new Function(
    'DATA', 'recordLoaded', 'dbReadOK', 'dbGet', 'dbSet', 'adoptRecord', 'warnDbBlocked', 'console',
    lift('recordLooksEmpty') + '\n' + lift('saveRecord', 'async function')
      + '\nreturn { recordLooksEmpty, saveRecord };'
  )(DATA, recordLoaded, dbReadOK,
    async (k, fb) => (k in w.kv ? w.kv[k] : fb),
    async (k, v) => { w.kv[k] = v; w.쓴것.push(k); return true; },
    (id, rec) => { DATA.records[id] = rec; recordLoaded.set(id, rec); return rec; },
    () => { w.토스트++; },
    { warn: () => {}, error: () => {}, log: () => {} });
  /* adoptRecord 는 스텁이라 api 에 없다 — 시험이 부를 수 있게 같이 실어 준다. */
  const adoptRecord = (id, rec) => { DATA.records[id] = rec; recordLoaded.set(id, rec); return rec; };
  return Object.assign(w, api, { DATA, recordLoaded, adoptRecord });
}

console.log('\n기록 쓰는 문 — 빈 것이 있는 것을 덮지 않는가\n');

{ // 🔴 실제로 일어난 그 일 — 읽어 본 적 없이 빈 것을 쓰려 한다
  const w = makeWorld({ 저장된것: 있는것(), 읽어봤나: false });
  w.adoptRecord('s1', 빈것());
  const r = await w.saveRecord('s1');
  봄('🔴 막는다', r, null);
  봄('🔴 있던 출석이 그대로다', w.kv['record:s1'].attendance.length, 2);
  봄('🔴 있던 도장도 그대로다', Object.keys(w.kv['record:s1'].checkin.days).length, 1);
  봄('아무것도 안 썼다', w.쓴것.length, 0);
  봄('사람에게 말한다', w.토스트, 1);
  봄('🔵 그리고 «있는 것»을 살려 쓴다 — 화면도 진짜를 본다', w.DATA.records.s1.attendance.length, 2);
}
{ // 정말로 처음인 학생 — 만들어져야 한다
  const w = makeWorld({ 저장된것: null, 읽어봤나: false });
  w.adoptRecord('s1', 빈것());
  await w.saveRecord('s1');
  봄('없던 학생이면 빈 기록을 만든다', w.쓴것, ['record:s1']);
}
{ // 읽어 봤으면 «비어 있는 것»이 사실이다 — 그대로 쓴다
  const w = makeWorld({ 저장된것: 빈것(), 읽어봤나: true });
  w.adoptRecord('s1', 빈것());
  await w.saveRecord('s1');
  봄('읽어 본 뒤라면 빈 것도 그대로 쓴다', w.쓴것, ['record:s1']);
}
{ // 내용이 있는 기록을 쓰는 것은 언제나 된다
  const w = makeWorld({ 저장된것: 있는것(), 읽어봤나: false });
  const rec = 있는것(); rec.scores.push(2);
  w.adoptRecord('s1', rec);
  await w.saveRecord('s1');
  봄('내용이 있는 기록은 그냥 쓴다', w.쓴것, ['record:s1']);
  봄('그 내용이 들어갔다', w.kv['record:s1'].scores.length, 2);
}
{ // 읽어 온 것이 아니면 애초에 못 쓴다 (예전부터 있던 막이)
  const w = makeWorld({ 저장된것: 있는것(), 읽어봤나: true });
  w.DATA.records.s1 = 빈것();          // adoptRecord 를 안 거친 «남의 물건»
  const r = await w.saveRecord('s1');
  봄('읽어 온 기록이 아니면 안 쓴다', r, null);
}

// 🔵 «비었나»의 잣대 자체도 본다 — 한 줄만 있어도 «있는 것»이어야 한다
console.log('\n«비었다»의 잣대\n');
const w0 = makeWorld({});
봄('아무것도 없으면 비었다', w0.recordLooksEmpty(빈것()), true);
봄('null 도 비었다', w0.recordLooksEmpty(null), true);
봄('출석 한 줄이면 «있는 것»', w0.recordLooksEmpty({ attendance: [{}] }), false);
봄('도장 하루만 있어도 «있는 것»', w0.recordLooksEmpty({ checkin: { days: { '2026-08-23': {} } } }), false);
봄('데일리퀴즈 기록만 있어도 «있는 것»', w0.recordLooksEmpty({ dailyQuiz: { log: [{}] } }), false);
봄('영상 진도만 있어도 «있는 것»', w0.recordLooksEmpty({ videoProgress: { v1: 3 } }), false);

console.log(`\n  ${fail ? '🔴' : '✅'} ${pass} 통과 · ${fail} 실패\n`);
process.exit(fail ? 1 : 0);
