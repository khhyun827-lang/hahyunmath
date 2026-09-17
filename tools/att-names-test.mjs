// 지난 수업 확인 — 결석·지각·조퇴한 «이름»이 뜨는가 (2026-09-17)
//
//   node tools/att-names-test.mjs
//
// 🔴 **왜 재는가** — 사용자 —「수업탭 - 출결 - 지난 수업 확인에서 결석이나 지각생에 대해
//   이름도 적어줬으면 좋겠어」. 예전에는 「12명 중 12명 입력 · 출석 9 · 지각 2 · 결석 1」
//   까지만 적혀 있어서, 누구를 챙겨야 하는지는 출결 화면으로 되돌아가야 알 수 있었다.
// ⚠ 함수를 베끼지 않는다 — index.html 에서 그대로 뜬다.
// ⚠ **덫으로 잰다** — 「출석도 같이 적는」 판을 따로 지어 돌려 본다.
//   전원 출석인 날에 줄이 서면 그 화면은 다시 «누가 챙길 사람인지»를 안 말해 준다.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/\r\n/g, '\n');
const NL = String.fromCharCode(10);

function lift(name) {
  let at = html.indexOf('function ' + name + '(');
  if (at < 0) throw new Error(name + ' 를 못 찾았습니다');
  if (html.slice(at - 6, at) === 'async ') at -= 6;
  let depth = 0;
  for (let j = html.indexOf('{', at); j < html.length; j++) {
    if (html[j] === '{') depth++;
    else if (html[j] === '}') { depth--; if (!depth) return html.slice(at, j + 1); }
  }
  throw new Error(name + ' 의 끝을 못 찾았습니다');
}

let pass = 0, fail = 0;
const 봄 = (무엇, 참) => {
  if (참) { pass++; console.log('  ✓ ' + 무엇); }
  else { fail++; console.log('  🔴 ' + 무엇); }
};

/* ── 화면 것 흉내 ── */
const ATT_STATUSES = ['출석', '지각', '조퇴', '결석'];
const SESSION_SEG = [['출석', 'ok', '출'], ['지각', 'late', '지'], ['조퇴', 'leave', '조'], ['결석', 'no', '결']];
const escHtml = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function 짓기(src) {
  return new Function('ATT_STATUSES', 'SESSION_SEG', 'escHtml',
    src + NL + 'return attMissRowsHTML;')(ATT_STATUSES, SESSION_SEG, escHtml);
}
const 원본 = lift('attMissRowsHTML');
const 줄짓기 = 짓기(원본);

/* ── 요약 만들기 — sessionSavedSummary 를 index.html 에서 그대로 뜬다 ── */
function 요약(명단, 기록) {
  const F = new Function('classRoster', 'state', 'attOn', 'studentMainClassId',
    lift('sessionSavedSummary') + NL + 'return sessionSavedSummary;')(
    () => 명단,
    { allRecords: Object.fromEntries(명단.map(s => [s.studentId, { attendance: 기록[s.studentId] ? [기록[s.studentId]] : [] }])) },
    (rec, date) => ((rec && rec.attendance) || []).find(a => a.date === date) || null,
    () => 'c1');
  return F('c1', '2026-09-15');
}

const 명단 = [
  { studentId: 'a', name: '김가온' }, { studentId: 'b', name: '이나린' },
  { studentId: 'c', name: '박다솔' }, { studentId: 'd', name: '최라온' },
  { studentId: 'e', name: '정마루' }
];

console.log(NL + '① 요약이 «이름»까지 들고 온다' + NL);
{
  const sm = 요약(명단, {
    a: { date: '2026-09-15', status: '출석' },
    b: { date: '2026-09-15', status: '지각', reason: '버스' },
    c: { date: '2026-09-15', status: '결석', reason: '' },
    d: { date: '2026-09-15', status: '조퇴', reason: '병원' },
    e: { date: '2026-09-15', status: '출석' }
  });
  봄('세는 것은 그대로다 (5명 중 5명)', sm.total === 5 && sm.filled === 5);
  봄('결석 1 · 지각 1 · 조퇴 1', sm.cnt['결석'] === 1 && sm.cnt['지각'] === 1 && sm.cnt['조퇴'] === 1);
  봄('who 에 이름이 담긴다', sm.who['지각'][0].name === '이나린' && sm.who['결석'][0].name === '박다솔');
  봄('사유도 같이 담긴다', sm.who['지각'][0].reason === '버스' && sm.who['결석'][0].reason === '');
}

console.log(NL + '② 줄에 이름이 뜬다' + NL);
{
  const sm = 요약(명단, {
    a: { date: '2026-09-15', status: '출석' },
    b: { date: '2026-09-15', status: '지각', reason: '버스' },
    c: { date: '2026-09-15', status: '결석', reason: '' },
    d: { date: '2026-09-15', status: '조퇴', reason: '병원' },
    e: { date: '2026-09-15', status: '출석' }
  });
  const h = 줄짓기(sm);
  봄('지각한 이름이 뜬다', h.includes('이나린'));
  봄('결석한 이름이 뜬다', h.includes('박다솔'));
  봄('조퇴한 이름도 뜬다', h.includes('최라온'));
  봄('출석한 이름은 «안» 뜬다', !h.includes('김가온') && !h.includes('정마루'));
  봄('적어 둔 사유는 괄호로 붙는다', h.includes('(버스)') && h.includes('(병원)'));
  봄('사유가 없으면 빈 괄호를 안 만든다', !h.includes('()'));
  봄('상태마다 제 색을 쓴다', h.includes('badge late') && h.includes('badge no') && h.includes('badge leave'));
}

console.log(NL + '③ 전원 출석인 날에는 줄이 통째로 없다' + NL);
{
  const sm = 요약(명단, Object.fromEntries(명단.map(s => [s.studentId, { date: '2026-09-15', status: '출석' }])));
  봄('빈 문자열이다', 줄짓기(sm) === '');
}

console.log(NL + '④ 기록이 아예 없는 날에도 안 터진다' + NL);
{
  const sm = 요약(명단, {});
  봄('빈 문자열이다', 줄짓기(sm) === '');
  봄('sessionSavedSummary 를 안 거친 요약(who 없음)도 견딘다', 줄짓기({ cnt: {}, total: 5, filled: 0 }) === '');
}

console.log(NL + '⑤ 이름에 든 꺾쇠는 그대로 새지 않는다' + NL);
{
  const sm = 요약([{ studentId: 'x', name: '<b>김</b>' }], { x: { date: '2026-09-15', status: '결석', reason: '<i>아픔</i>' } });
  const h = 줄짓기(sm);
  봄('이름이 막혔다', h.includes('&lt;b&gt;') && !h.includes('<b>김'));
  봄('사유도 막혔다', h.includes('&lt;i&gt;'));
}

console.log(NL + '🪤 덫 — 「출석도 같이 적는」 판을 지어 돌려 본다' + NL);
let 덫물림 = 0;
{
  const 헐거운판 = 짓기(원본.replace("st !== '출석' && ", ''));
  const sm = 요약(명단, Object.fromEntries(명단.map(s => [s.studentId, { date: '2026-09-15', status: '출석' }])));
  if (헐거운판(sm) !== '') { 덫물림++; console.log('  ✓ 헐거운 판은 ③에서 물렸다 — 전원 출석인데 줄이 섰다'); }
  else console.log('  🔴 헐거운 판이 안 물었다 — ③이 아무것도 증명하지 않는다');
}

console.log(NL + (fail === 0 ? '✓ 전부 통과' : '🔴 걸린 것 ' + fail + '개') + ' · ' + (pass + fail) + '개');
console.log('🪤 덫 ' + 덫물림 + '/1 물었다');
process.exit(fail === 0 && 덫물림 === 1 ? 0 : 1);
