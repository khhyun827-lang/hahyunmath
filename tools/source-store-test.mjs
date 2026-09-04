// 모의고사 기출이 «창고에» 제대로 서는가 (2026-09-05)
//
//   node tools/source-store-test.mjs
//
// 사용자 요청 — 「같이담긴하지만 모의고사 기출을 필터링할수 있으면 좋겠어」.
//
// 🔴 **함수를 여기에 옮겨 적지 않는다.** index.html 에서 «글로» 떠 온다.
//   옮겨 적으면 검사는 통과하는데 화면은 틀리는 일이 생긴다(firestore-probe 가 그랬다).

import fs from 'fs';

const HTML = fs.readFileSync('index.html', 'utf8');
const 떠오기 = (시작, 끝표) => {
  const a = HTML.indexOf(시작);
  if (a < 0) throw new Error('못 찾음: ' + 시작);
  const b = HTML.indexOf(끝표, a);
  return HTML.slice(a, b + 끝표.length);
};
const NL = String.fromCharCode(10);
const 함수 = (머리) => {
  const a = HTML.indexOf(머리);
  if (a < 0) throw new Error('못 찾음: ' + 머리);
  const b = HTML.indexOf(NL + '}' + NL, a);
  return HTML.slice(a, b + 3);
};

const 짐 = [
  떠오기('const SRC_CODE_RE', "DW:'하향' };"),
  함수('function srcCodeInfo(code){'),
  함수('function storeSubjectCode(x){'),
  함수('function storeMatches(x, subj, ch){'),
  함수('function srcSiblings(code){'),
].join(NL);
const F = new Function('state', 짐 + NL +
  'return { srcCodeInfo, storeSubjectCode, storeMatches, srcSiblings };');

const 장부 = JSON.parse(fs.readFileSync('codes/K2-J.json', 'utf8'));
const 엔딩 = JSON.parse(fs.readFileSync('codes/K2-E.json', 'utf8'));
const byCode = {};
for (const it of [...엔딩.items, ...장부.items]) byCode[it.code] = it;
const R = F({ itemByCode: byCode, itemBody: null });

let pass = 0, fail = 0;
const 봄 = (무엇, 나온것, 나와야) => {
  const ok = JSON.stringify(나온것) === JSON.stringify(나와야);
  if (ok) { pass++; console.log('  ✓ ' + 무엇); }
  else { fail++; console.log(`  ✗ ${무엇}${NL}      나온 것: ${JSON.stringify(나온것)}${NL}      나와야:  ${JSON.stringify(나와야)}`); }
};

console.log(NL + '모의고사 기출이 창고에 서는가' + NL);

const 다 = Object.values(byCode);
봄('창고에 둘이 같이 있다', 다.length, 564 + 71);

// ── 과목 · 단원 ──────────────────────────────────────────────────────
// 🔴 `1230928OR` 에는 과목 자리가 없다. 장부가 든 것을 써야 한다 — 못 읽으면 «전체»에서 사라진다.
봄('기출도 과목이 K2 로 선다', R.storeSubjectCode(byCode['1230928OR']), 'K2');
봄('교재 문항은 코드에서 그대로', R.storeSubjectCode(byCode['K2-01-E-0001']), 'K2');
봄('공통수학2 01단원으로 걸러진다', R.storeMatches(byCode['1230928UP01'], 'K2', '01'), true);
봄('02단원에는 안 걸린다', R.storeMatches(byCode['1230928UP01'], 'K2', '02'), false);

// ── 🔵 거르개 (사용자가 바란 것) ─────────────────────────────────────
const 책 = (c) => (byCode[c].source || {}).book || '';
봄('🔵 기출은 「모의고사 기출」로 적힌다', 책('1230928OR'), '모의고사 기출');
봄('교재는 그대로다', 책('K2-01-E-0001'), '유형반복R');
const 기출만 = 다.filter(x => (x.source || {}).book === '모의고사 기출');
봄('🔵 「모의고사 기출」만 고르면 71제', 기출만.length, 71);
봄('그중 교재 코드는 하나도 없다', 기출만.filter(x => x.code.includes('-')).length, 0);
const 단원01 = 다.filter(x => R.storeMatches(x, 'K2', '01'));
봄('01단원에는 둘이 섞여 있다', 단원01.length > 71 && 기출만.every(x => 단원01.includes(x)), true);

// ── 🔵 형제 (변형 엮기의 답) ─────────────────────────────────────────
// 코드 앞 7자리가 같으면 한 기출에서 나온 것이다 — 닮음을 잴 필요가 없다.
봄('🔵 한 기출의 형제가 모인다', R.srcSiblings('1230928UP01'),
   ['1230928OR', '1230928NC01', '1230928UP01', '1230928UP02']);
봄('원본이 맨 앞에 온다', R.srcSiblings('1230928NC01')[0], '1230928OR');
봄('교재 문항에는 형제가 없다', R.srcSiblings('K2-01-E-0001'), []);
봄('갈래를 코드가 말한다', R.srcCodeInfo('1230928UP01').badge, 'UP');
봄('출처를 코드가 말한다', R.srcCodeInfo('1230928UP01').label, '2023년 09월 28번');

// ── 🔴 섞이면 안 되는 자리 ───────────────────────────────────────────
봄('🔴 교재 코드가 기출로 읽히지 않는다', R.srcCodeInfo('K2-01-E-0013'), null);
const 겹침 = Object.keys(byCode).length !== 564 + 71;
봄('🔴 두 장부의 코드가 하나도 안 겹친다', 겹침, false);

console.log(`${NL}  ${fail ? '🔴' : '✅'} ${pass} 통과 · ${fail} 실패${NL}`);
process.exit(fail ? 1 : 0);
