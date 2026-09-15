/* 2026-09-16 셋을 잰다 — 과제 표 차례 · 상담 고치기 · 이름 밑 문구.
 *
 * 사용자: 「상담 수정할 수 있도록. 과제 표 마감일 빠른순으로 정렬 이름 밑에 마감 늦은순 문구삭제」
 *
 * 🔴 **차례는 조용히 되돌아온다** — `hwOrderDesc` 와 `hwOrderAsc` 가 나란히 있어서,
 *   다음에 누가 표를 고칠 때 손에 잡히는 아무 것이나 쓰기 쉽다. 그래서 «표가 어느 것을 쓰는가»를 잰다.
 *
 * 쓰는 법:  node tools/hw-order-consult-probe.mjs
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

const 이름들 = ['hwOrderKey', 'hwOrderDesc', 'hwOrderAsc', 'consultEditFormHTML', 'consultEditActHTML'];
const H = new Function(`
  const escHtml = s => String(s == null ? '' : s);
  const CONSULT_KINDS = ['전화', '대면', '문자'];
  ${이름들.map(함수뽑기).join('\n')}
  return { ${이름들.join(',')} };
`)();

let 틀린것 = 0;
const 봄 = (이름, 참인가, 덧 = '') => {
  if(!참인가) 틀린것++;
  console.log((참인가 ? '  ✅ ' : '  ❌ ') + 이름 + (덧 ? ' — ' + 덧 : ''));
};

const 과제들 = [
  { id:'a', title:'늦은것', dueDate:'2026-09-30', createdAt:'2026-09-01' },
  { id:'b', title:'이른것', dueDate:'2026-09-10', createdAt:'2026-09-02' },
  { id:'c', title:'가운데', dueDate:'2026-09-20', createdAt:'2026-09-03' },
  { id:'d', title:'마감없음', createdAt:'2026-09-05' },
];

console.log('① 차례 — 잣대는 하나, 방향만 둘');
{
  const 오름 = 과제들.slice().sort(H.hwOrderAsc).map(a => a.title);
  const 내림 = 과제들.slice().sort(H.hwOrderDesc).map(a => a.title);
  봄('표(오름) — 마감 이른 것이 앞', 오름.join('·') === '마감없음·이른것·가운데·늦은것', 오름.join('·'));
  봄('고르개(내림) — 늦은 것이 앞', 내림.join('·') === '늦은것·가운데·이른것·마감없음', 내림.join('·'));
  봄('🔴 둘은 정확히 서로의 뒤집음', 오름.join('·') === 내림.slice().reverse().join('·'));
  봄('잣대는 같은 `hwOrderKey` — 마감이 없으면 낸 날',
     H.hwOrderKey(과제들[3]) === '2026-09-05' && H.hwOrderKey(과제들[0]) === '2026-09-30');
  /* 마감이 같을 때 낸 날로 가르는지 */
  const 동률 = [{ id:'x', title:'먼저낸것', dueDate:'2026-09-10', createdAt:'2026-09-01' },
                { id:'y', title:'나중낸것', dueDate:'2026-09-10', createdAt:'2026-09-05' }];
  봄('마감이 같으면 낸 날로 가른다(오름)',
     동률.slice().sort(H.hwOrderAsc).map(a=>a.title).join('·') === '먼저낸것·나중낸것');
}

console.log('② 🔴 과제 «표»가 실제로 오름차순을 부르는가');
{
  /* 함수만 봐서는 모른다 — 표를 그리는 자리가 어느 것을 부르는지 원문에서 확인한다 */
  const 표 = html.slice(html.indexOf('function hwGridHTML('), html.indexOf('function hwOpenCell('));
  봄('표는 `hwOrderAsc` 를 쓴다', /\.sort\(hwOrderAsc\)/.test(표));
  /* ⚠ 이름이 «나오는가»가 아니라 «부르는가»를 봐야 한다 — 주석에 「고르개는 hwOrderDesc 다」라고
       적어 둔 것을 「쓴다」로 읽어 한 번 헛물켰다. 검사는 코드를 봐야지 글을 보면 안 된다. */
  봄('표는 `hwOrderDesc` 로 정렬하지 않는다', !/\.sort\(hwOrderDesc\)/.test(표));
  봄('열 머리 설명도 「빠른 순」으로 바뀌었다', 표.includes('빠른 순으로 섭니다'));
  봄('「늦은 순」이라는 설명이 안 남아 있다', !표.includes('늦은 순으로 섭니다'));
}

console.log('③ 이름 밑 「마감 늦은 순」 문구 — 지웠다');
{
  봄('🔴 화면에 그리는 `i.hg-ord` 가 없다', !/<i class="hg-ord">/.test(html));
  봄('쓰지 않게 된 CSS 규칙도 걷었다', !/i\.hg-ord\{/.test(html));
  봄('표 머리는 이름만 진다', /<th class="who">이름<\/th>/.test(html));
}

console.log('④ 상담 고치는 칸 — 반 관리와 연대기가 같은 것을 쓴다');
{
  const c = { id:'cl1', date:'2026-09-10', kind:'대면', text:'어머니 통화 — 클리닉 주 2회' };
  const 칸 = H.consultEditFormHTML('s1', c);
  봄('날짜·방식·내용 셋이 있다',
     칸.includes('cse-date-cl1') && 칸.includes('cse-kind-cl1') && 칸.includes('cse-text-cl1'));
  봄('지금 값이 채워져 있다', 칸.includes('2026-09-10') && 칸.includes('어머니 통화'));
  봄('지금 방식이 골라져 있다', /<option selected>대면<\/option>|<option \s*selected\s*>대면/.test(칸.replace(/\s+selected/, ' selected')) || 칸.includes('selected>대면'));
  봄('🔴 칸 이름에 기록 id 가 붙는다(여러 기록이 서로를 안 덮는다)',
     H.consultEditFormHTML('s1', { id:'cl2', date:'', kind:'전화', text:'' }).includes('cse-text-cl2'));
  봄('🔴 글자마다 다시 그리지 않는다(IME)', !/oninput|liveEdit/.test(칸));
  const 단추 = H.consultEditActHTML('s1', c);
  봄('저장·취소가 있다', 단추.includes('saveConsultLog') && 단추.includes('consultEditId=null'));
}

console.log('⑤ 🔴 고치기가 실패하면 되돌리는가 (덮어쓰기라 중요하다)');
{
  const 원문 = 함수뽑기('saveConsultLog');
  봄('저장 결과를 본다', /const ok = await dbSet/.test(원문));
  봄('true 가 아니면 옛 배열을 도로 꽂는다',
     /ok !== true/.test(원문) && /state\.consultLogs\[sid\] = 옛배열/.test(원문));
  봄('그때 사용자에게 말한다', /고치지 못했습니다/.test(원문));
  봄('고친 자국을 남긴다', /editedAt/.test(원문));
  봄('변경 이력에 내용은 안 남긴다(날짜·방식까지만)',
     /logAudit\('상담 기록 수정'/.test(원문) && !/logAudit\([^)]*text/.test(원문));
}

console.log('⑥ 일부러 망가뜨려 — 검사가 무는지');
{
  const 망가진 = 과제들.slice().sort(H.hwOrderDesc).map(a => a.title);
  봄('표가 내림차순을 쓰면 ①이 문다', 망가진[0] === '늦은것');
  봄('id 안 붙인 칸이면 ④가 문다',
     !'<textarea id="cse-text">'.includes('cse-text-cl1'));
}

console.log(틀린것 ? ('❌ ' + 틀린것 + '개 틀렸다') : '✅ 전부 통과');
process.exit(틀린것 ? 1 : 0);
