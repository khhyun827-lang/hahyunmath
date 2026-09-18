/* 하루 몇 판인가 — 이번 주 토·일만 두 판 (2026-09-19 · 사용자 요청)
   「게임 하루한판으로 제한했던거 잠깐 토,일요일은 이번주만 2번씩 할수있도록」

     node tools/game-plays-test.mjs

   🔴 **이 검사의 요점은 «안 적힌 날»이다.** 콕 집은 이틀이 두 판이 되는 것보다,
     그 밖의 날이 여전히 한 판인 것이 더 중요하다 — 실수하면 모든 날이 두 판이 된다.
   ⚠ 함수는 베끼지 않는다 — index.html 에서 그대로 뜬다. */
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
const 봄 = (무엇, 나온것, 나와야) => {
  const ok = JSON.stringify(나온것) === JSON.stringify(나와야);
  if (ok) pass++; else fail++;
  console.log((ok ? '  ✓ ' : '  🔴 ') + 무엇 + (ok ? '' : NL + '      나온 것 ' + JSON.stringify(나온것) + NL + '      나와야 ' + JSON.stringify(나와야)));
};

/* 「오늘」을 갈아 끼울 수 있게 떠 온다 */
const 표 = html.match(/^const CK_PLAYS = \{[\s\S]*?^\};/m);
if (!표) throw new Error('CK_PLAYS 를 못 찾았습니다');
let 오늘 = '2026-09-19';
const G = new Function('todayStr',
  표[0] + NL + [lift('ckState'), lift('ckPlaysAllowed'), lift('ckPlaysToday'), lift('ckDoneToday')].join(NL)
  + NL + 'return { CK_PLAYS, ckPlaysAllowed, ckPlaysToday, ckDoneToday };'
)(() => 오늘);

const 기록 = (n, last) => ({ checkin: { last: last || '', streak: 1, best: 1, bests: {},
  days: n ? { [last]: { score: 100, n } } : {} } });

console.log(NL + '① 콕 집은 이틀 — 두 판' + NL);
/* ⚠ **요일을 셈으로 확인한다** — 처음에 09-20·09-21 로 적었다가 이 검사의 출력에서 드러났다.
   09-19 가 «토»요일이고 09-21 은 월요일이다. 「이번 주 토·일」은 09-19·09-20 이다. */
const 요일자 = d => '일월화수목금토'[new Date(d + 'T00:00:00').getDay()];
봄('🔴 콕 집은 이틀이 정말 토·일이다', Object.keys(G.CK_PLAYS).map(요일자), ['토', '일']);
봄('토요일은 두 판', G.ckPlaysAllowed('2026-09-19'), 2);
봄('일요일도 두 판', G.ckPlaysAllowed('2026-09-20'), 2);
{
  오늘 = '2026-09-19';
  봄('안 해 봤으면 열려 있다', G.ckDoneToday(기록(0)), false);
  봄('🔴 한 판 했어도 아직 열려 있다', G.ckDoneToday(기록(1, '2026-09-19')), false);
  봄('🔴 두 판 했으면 닫힌다', G.ckDoneToday(기록(2, '2026-09-19')), true);
  봄('세 판(있을 수 없지만)도 닫힌다', G.ckDoneToday(기록(3, '2026-09-19')), true);
}

console.log(NL + '② 안 적힌 날 — 예전대로 «하루 한 판»' + NL);
{
  for (const d of ['2026-09-18', '2026-09-21', '2026-09-22', '2026-09-26', '2026-09-27', '2026-10-03', '2026-10-04']) {
    오늘 = d;
    const 요일 = '일월화수목금토'[new Date(d + 'T00:00:00').getDay()];
    봄(d + ' (' + 요일 + ') 은 한 판', G.ckPlaysAllowed(d), 1);
    봄('   한 판 하면 닫힌다', G.ckDoneToday(기록(1, d)), true);
  }
  /* 🔴 **다음 주 토·일은 한 판이다** — 「이번 주만」이 그 뜻이다 */
  오늘 = '2026-09-27';
  봄('🔴 다음 주 일요일은 한 판 (이번 주만이라서)', [G.ckPlaysAllowed('2026-09-27'), G.ckDoneToday(기록(1, '2026-09-27'))], [1, true]);
}

console.log(NL + '③ 어제 것은 오늘을 막지 않는다' + NL);
{
  오늘 = '2026-09-20';
  봄('어제 두 판 했어도 오늘은 열려 있다', G.ckDoneToday(기록(2, '2026-09-19')), false);
  오늘 = '2026-09-22';
  봄('토요일에 두 판 했어도 화요일은 열려 있다', G.ckDoneToday(기록(2, '2026-09-20')), false);
}

console.log(NL + '🪤 덫 — 옛 기록과 잘못 셀 자리' + NL);
{
  let 물었다 = 0;
  /* ① `days` 가 없던 옛 기록 — `last` 로 물러서지 않으면 오늘 한 판을 «덤으로» 얻는다 */
  오늘 = '2026-09-18';                                                                    // 한 판인 날로 본다
  const 옛것 = { checkin: { last: '2026-09-18', streak: 3, best: 5, bestScore: 320 } };   // days 없음
  const 막혔다 = G.ckDoneToday(옛것) === true;
  if (막혔다) 물었다++;
  console.log('  ' + (막혔다 ? '✓' : '🔴') + ' days 없는 옛 기록도 last 로 세어 막는다 (안 그러면 한 판 덤)');
  /* ② 표를 안 보고 세면 모든 날이 두 판이 된다 */
  const 한판인날 = ['2026-09-18', '2026-09-22', '2026-10-04'].every(d => G.ckPlaysAllowed(d) === 1);
  if (한판인날) 물었다++;
  console.log('  ' + (한판인날 ? '✓' : '🔴') + ' 표에 없는 날은 1 이다 (기본이 2 면 제한이 통째로 풀린다)');
  /* ③ 화면이 「하루 한 판입니다」라고 거짓말하지 않는가 — 두 판인 날에는 남은 판을 적는다 */
  const 카드 = html.slice(html.indexOf('const 판말 ='), html.indexOf('const 판말 =') + 300);
  const 말이바뀐다 = /판수 > 1/.test(카드) && /남았습니다/.test(카드)
    && !/하루 한 판입니다 · \$\{escHtml\(gameThisWeek/.test(html);
  if (말이바뀐다) 물었다++;
  console.log('  ' + (말이바뀐다 ? '✓' : '🔴') + ' 두 판인 날에는 화면도 그렇게 말한다 (「하루 한 판」이 박혀 있지 않다)');
  console.log(NL + '🪤 덫 ' + 물었다 + '/3 물었다');
  if (물었다 !== 3) fail++;
}

console.log(NL + (fail ? '🔴 걸린 것 ' + fail + '개 · ' + (pass + fail) + '개' : '✓ 전부 통과 · ' + pass + '개') + NL);
process.exit(fail ? 1 : 0);
