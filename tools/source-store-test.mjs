// 모의고사 기출이 «창고에» 제대로 서는가 (2026-09-05)
//
//   node tools/source-store-test.mjs
//
// 사용자 요청 — 「같이담긴하지만 모의고사 기출을 필터링할수 있으면 좋겠어」.
//
// 🔴 **함수를 여기에 옮겨 적지 않는다.** index.html 에서 «글로» 떠 온다.
//   옮겨 적으면 검사는 통과하는데 화면은 틀리는 일이 생긴다(firestore-probe 가 그랬다).

import fs from 'fs';

/* ⚠ **줄끝을 여기서 한 번 고른다.** git 이 체크아웃하며 CRLF 로 바꿔 놓으면
   아래의 `NL + '}' + NL` 이 통째로 안 맞아 **규칙은 멀쩡한데 검사만 죽는다**
   (2026-09-07에 실제로 그랬다 — 함수 조각이 3123줄로 잘려 나왔다).
   CR 은 여기서 아무 뜻도 없으므로 읽자마자 떼어 낸다. */
const HTML = fs.readFileSync('index.html', 'utf8')
  .split(String.fromCharCode(13) + String.fromCharCode(10)).join(String.fromCharCode(10));
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

/* 🔴 **검사가 «데이터 파일»에 기대면 안 된다** (2026-09-06에 바로잡았다).
   여기는 `codes/K2-J.json` 을 읽고 있었는데, 주기나를 지우고 다시 시작하면서 그 파일이
   없어지자 **검사가 통째로 죽었다.** 규칙은 멀쩡한데. 검사는 «규칙»을 재는 것이지
   «지금 담긴 데이터»를 재는 것이 아니다. → 표본을 여기서 만든다.
   ⚠ 엔딩크레딧(①꼴)은 규칙을 견주는 짝이라 몇 개만 손으로 둔다. */
const byCode = {};
for (const it of [
  { code: 'K2-01-E-0001', chapter: '01', subject: 'K2', source: { book: '엔딩크레딧' } },
  { code: 'K2-05-E-0431', chapter: '05', subject: 'K2', source: { book: '엔딩크레딧' } },
  /* ②꼴 — 2026-09-06부터 변형이 ①꼴과 «같은» 꼴이다(`-N01`). */
  { code: '1230928',     chapter: '01', subject: 'K2', source: { book: '모의고사 기출' } },
  { code: '1230928-N01', chapter: '01', subject: 'K2', source: { book: '모의고사 기출' } },
  { code: '1230928-U01', chapter: '01', subject: 'K2', source: { book: '모의고사 기출' } },
  { code: '2050310',     chapter: '01', subject: 'K2', source: { book: '모의고사 기출' } },
  { code: '2160321B',    chapter: '02', subject: 'K2', source: { book: '모의고사 기출' } },
]) byCode[it.code] = it;
const R = F({ itemByCode: byCode, itemBody: null });

let pass = 0, fail = 0;
const 봄 = (무엇, 나온것, 나와야) => {
  const ok = JSON.stringify(나온것) === JSON.stringify(나와야);
  if (ok) { pass++; console.log('  ✓ ' + 무엇); }
  else { fail++; console.log(`  ✗ ${무엇}${NL}      나온 것: ${JSON.stringify(나온것)}${NL}      나와야:  ${JSON.stringify(나와야)}`); }
};

console.log(NL + '모의고사 기출이 창고에 서는가' + NL);

const 다 = Object.values(byCode);
봄('표본이 둘 다 있다', 다.length, 7);

// ── 과목 · 단원 ──────────────────────────────────────────────────────
// 🔴 `1230928` 에는 과목 자리가 없다. 장부가 든 것을 써야 한다 — 못 읽으면 «전체»에서 사라진다.
봄('기출도 과목이 K2 로 선다', R.storeSubjectCode(byCode['1230928']), 'K2');
봄('교재 문항은 코드에서 그대로', R.storeSubjectCode(byCode['K2-01-E-0001']), 'K2');
봄('공통수학2 01단원으로 걸러진다', R.storeMatches(byCode['1230928-U01'], 'K2', '01'), true);
봄('02단원에는 안 걸린다', R.storeMatches(byCode['1230928-U01'], 'K2', '02'), false);

// ── 🔵 거르개 (사용자가 바란 것) ─────────────────────────────────────
const 책 = (c) => (byCode[c].source || {}).book || '';
봄('🔵 기출은 「모의고사 기출」로 적힌다', 책('1230928'), '모의고사 기출');
봄('교재는 그대로다', 책('K2-01-E-0001'), '엔딩크레딧');
const 기출만 = 다.filter(x => (x.source || {}).book === '모의고사 기출');
봄('🔵 「모의고사 기출」만 고르면 다섯', 기출만.length, 5);

// ── 🔵 형제 (변형 엮기의 답) ─────────────────────────────────────────
/* 🔵 **2026-09-06부터 ②꼴 변형도 ①꼴과 «같은» 꼴이다** — `1230928-N01`.
   앞서는 `1230928NC01` 이었는데 그러면 변형이 «원본»처럼 취급돼,
   AI 가 이미 있는 변형을 또 만들고 창고가 「변형 없음」이라 말했다. */
봄('🔵 한 기출의 형제가 모인다', R.srcSiblings('1230928-U01'),
   ['1230928', '1230928-N01', '1230928-U01']);
봄('원본이 맨 앞에 온다', R.srcSiblings('1230928-N01')[0], '1230928');
봄('교재 문항에는 형제가 없다', R.srcSiblings('K2-01-E-0001'), []);
봄('갈래를 코드가 말한다', R.srcCodeInfo('1230928-U01').kind, 'U');
봄('원본은 갈래가 비어 있다', R.srcCodeInfo('1230928').kind, '');
봄('출처를 코드가 말한다', R.srcCodeInfo('1230928-U01').label, '2023년 09월 28번');
/* 🔴 가형·나형은 서로 다른 뿌리다 — 앞자리만 보면 뭉친다. */
봄('🔴 나형은 형까지 뿌리에 든다', R.srcCodeInfo('2160321B').origin, '2160321B');
봄('화면에는 형까지 적는다', R.srcCodeInfo('2160321B').label, '2016년 03월 21번 나형');

// ── 🔴 섞이면 안 되는 자리 ───────────────────────────────────────────
봄('🔴 교재 코드가 기출로 읽히지 않는다', R.srcCodeInfo('K2-01-E-0013'), null);
봄('🔴 교재 변형도 기출로 안 읽힌다', R.srcCodeInfo('K2-01-E-0013-N01'), null);

console.log(NL + '  ' + (fail ? '🔴' : '✅') + ' ' + pass + ' 통과 · ' + fail + ' 실패' + NL);
process.exit(fail ? 1 : 0);
