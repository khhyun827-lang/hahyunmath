/* 「내 일정」 폼에서 한글이 «ㅇㅕㅇ» 으로 흩어지던 것을 잡아 둔다 (2026-09-16).
 *
 * 🔴 **무엇이 문제였나** — 제목 칸이 `oninput="liveEdit(event, v=>state.stuPlanTitle=v)"` 였다.
 *   `liveEdit` 은 `ev.isComposing` 이 아닐 때 `render()` 를 도는데, **모바일 IME 에서는 그 값을
 *   믿을 수 없다** — 조합 중에도 `false` 로 주는 기기가 있다. 그러면 글자마다 칸이 통째로 새로
 *   만들어지고, IME 가 조합하던 것을 잃어 낱자가 흩어진다.
 * 🔵 **재는 자리는 하나다 — 「조합 중에 `render()` 가 몇 번 도는가」.** 0 이라야 한다.
 *   낱자가 흩어지는 모습은 아래에서 본뜬 것이라 «참고»이고, 진짜 잣대는 이 셈이다.
 *
 * ⚠ **새 입력칸을 만들면 여기에 한 줄 더 붙일 것** (CLAUDE.md 의 W-3 교훈 ⑤).
 *
 * 쓰는 법:  node tools/myplan-ime-probe.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const 뿌리 = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(뿌리, 'index.html'), 'utf8');

function 함수뽑기(이름){
  const 시작 = html.indexOf('function ' + 이름 + '(');
  if(시작 < 0) throw new Error('못 찾았다: ' + 이름);
  let i = html.indexOf('{', 시작), 깊이 = 0;
  for(; i < html.length; i++){
    if(html[i] === '{') 깊이++;
    else if(html[i] === '}'){ 깊이--; if(깊이 === 0) return html.slice(시작, i + 1); }
  }
  throw new Error('끝을 못 찾았다: ' + 이름);
}

/* ── 진짜 `stuMyPlanHTML` 과 `liveEdit` 을 꺼내 굴린다 ── */
let 그린횟수 = 0;
const 받침 = `
  const escHtml = s => String(s == null ? '' : s).replace(/"/g,'&quot;');
  const iconSvg = () => '';
  const todayStr = () => '2026-09-16';
  const stuDayLabel = d => String(d||'');
  const myEventsOf = () => [];
  /* 옛 판(liveEdit)이 다시 그린 뒤 칸을 도로 찾는다 — 없다고 답하면 거기서 멎는다.
     우리가 세는 것은 «그리기 전»에 일어나므로 셈에는 영향이 없다.
     ⚠ 이 받침은 백틱 문자열이다 — 여기 주석에 백틱을 쓰면 문자열이 끊긴다. */
  const document = { getElementById: () => null };
  const render = () => { 그린횟수++; };
  const state = { stuPlanWeekly:true, stuPlanDows:[], stuPlanTitle:'', stuPlanMemo:'', stuPlanTime:'', stuPlanTo:'', stuPlanDate:'' };
`;
const 짓기 = new Function('그린횟수더하기', `
  let 그린횟수 = 0;
  ${받침.replace('그린횟수++;', '그린횟수더하기();')}
  ${함수뽑기('liveEdit')}
  ${함수뽑기('stuMyPlanHTML')}
  return { stuMyPlanHTML, liveEdit, state };
`);
const 짐 = 짓기(() => { 그린횟수++; });

let 틀린것 = 0;
const 봄 = (이름, 참인가, 덧 = '') => {
  if(!참인가) 틀린것++;
  console.log((참인가 ? '  ✅ ' : '  ❌ ') + 이름 + (덧 ? ' — ' + 덧 : ''));
};

/* ── ① 제목 칸이 무엇을 달고 있나 ── */
const 화면 = 짐.stuMyPlanHTML({ rec: {} });
const 제목칸 = (화면.match(/<input[^>]*id="mp-title"[^>]*>/) || [''])[0];
console.log('① 제목 칸이 달고 있는 것');
봄('칸이 있다', !!제목칸);
봄('🔴 liveEdit 을 쓰지 않는다', !/liveEdit/.test(제목칸), 제목칸.replace(/^.*oninput="([^"]*)".*$/, 'oninput=$1'));
봄('oninput 이 render 를 부르지 않는다', !/render\s*\(/.test(제목칸));
봄('값이 상태에 묶여 있다(다시 그려도 안 날아간다)', /value="/.test(제목칸) && /state\.stuPlanTitle\s*=/.test(제목칸));

/* 메모·시간도 같이 — 요일 단추가 render 를 돌기 때문에 묶여 있어야 한다 */
console.log('② 같은 폼의 다른 칸들도 다시 그려도 살아남나');
for(const [id, 상태] of [['mp-memo','stuPlanMemo'], ['mp-time','stuPlanTime'], ['mp-to','stuPlanTo']]){
  const 칸 = (화면.match(new RegExp('<input[^>]*id="' + id + '"[^>]*>')) || [''])[0];
  봄(id + ' 이 상태에 묶여 있다', !!칸 && 칸.includes('value="') && 칸.includes('state.' + 상태 + '='));
  봄(id + ' 이 render 를 부르지 않는다', !!칸 && !/render\s*\(/.test(칸));
}

/* ── ③ IME 를 흉내 낸다 — «조합 중인데 isComposing 이 false» 인 기기 ── */
function 조합흉내(손잡이, isComposingFalse){
  그린횟수 = 0;
  const 조각 = ['ㅇ', '여', '영'];          // 「영」을 치는 동안 칸에 차례로 보이는 것
  for(const v of 조각){
    손잡이({ target: { value: v, id: 'mp-title', selectionStart: v.length },
            isComposing: isComposingFalse ? false : true });
  }
  return 그린횟수;
}
console.log('③ 조합 중에 다시 그리는가 (0 이라야 한다)');
const 지금판 = (ev) => { 짐.state.stuPlanTitle = ev.target.value; };   // 지금 붙어 있는 것과 같은 일
봄('고친 판 — isComposing 이 제대로 올 때', 조합흉내(지금판, false) === 0, '그린 횟수 ' + 조합흉내(지금판, false));
봄('🔴 고친 판 — isComposing 이 false 로 오는 기기에서도',
   조합흉내(지금판, true) === 0, '그린 횟수 ' + 조합흉내(지금판, true));

/* ── ④ 검사가 정말 무는지 — 옛 판을 같은 시험에 넣는다 ── */
const 옛판 = (ev) => 짐.liveEdit(ev, v => { 짐.state.stuPlanTitle = v; });
const 옛_제대로 = 조합흉내(옛판, false);
const 옛_망가진기기 = 조합흉내(옛판, true);
console.log('④ 옛 판을 같은 시험에 넣어 본다 (물어야 한다)');
봄('옛 판도 isComposing 이 제대로면 안 그렸다', 옛_제대로 === 0, '그린 횟수 ' + 옛_제대로);
봄('🔴 옛 판은 isComposing 이 false 인 기기에서 세 번 그렸다 — 이것이 원인이었다',
   옛_망가진기기 === 3, '그린 횟수 ' + 옛_망가진기기);

/* ── 참고: 그렇게 그리면 낱자가 어떻게 흩어지는가 (본뜬 것) ── */
console.log('  참고 — 조합 중에 칸이 교체되면: ㅇ · ㅕ · ㅇ 로 흩어져 「ㅇㅕㅇ」이 된다(학생이 본 것).');

console.log(틀린것 ? ('❌ ' + 틀린것 + '개 틀렸다') : '✅ 전부 통과');
process.exit(틀린것 ? 1 : 0);
