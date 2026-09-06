// 변형을 «손으로 고치는» 문 — 엉뚱한 곳에 쓰지 않는가 (2026-09-07)
//
// 🔵 사용자 요청: 「변형문제도 수식이나 정답 등을 고칠 수 있으면 좋겠어」.
//
// 🔴 **변형은 두 곳에 산다.** AI 가 만든 것은 `variants`, 교재가 준 ②꼴은 `items`.
//   엉뚱한 곳에 쓰면 «저장했다는데 화면은 그대로»가 된다 — 가장 알아채기 어려운 종류다.
//   그래서 `fromBook` 을 보고 갈라 쓰는지 여기서 잰다.
//
// ⚠ 있던 것 «위에» 얹는지도 본다 — 통째로 갈아치우면 그림·풀이·검토 결과가 사라진다.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8')
  .split(String.fromCharCode(13) + String.fromCharCode(10)).join(String.fromCharCode(10));
const NL = String.fromCharCode(10);
const 뜨기 = (머리) => {
  const a = html.indexOf(머리);
  if (a < 0) throw new Error('못 찾음: ' + 머리);
  const b = html.indexOf(NL + '}' + NL, a);
  return html.slice(a, b + 3);
};

let 흠 = 0;
let 잼 = 0;
const 봄 = (이름, 났다, 바람) => {
  잼++;
  if (JSON.stringify(났다) === JSON.stringify(바람)) return;
  흠++;
  console.log('🔴 ' + 이름 + NL + '   나온 것: ' + JSON.stringify(났다) + NL + '   바란 것: ' + JSON.stringify(바람));
};

const 저장 = 뜨기('async function vEditSave(){');

// ① 갈래를 봐서 «어디에» 쓰는가
봄('fromBook 을 보고 곳을 고른다', /v\.fromBook \? 'items' : 'variants'/.test(저장), true);
봄('items 에도 variants 에도 쓸 수 있다',
  저장.includes("'items'") && 저장.includes("'variants'"), true);
// ② 있던 것 위에 얹는가 — 통째로 갈아치우면 그림·풀이·검토가 날아간다
봄('있던 것 위에 얹는다', /Object\.assign\(\{\}, 바탕/.test(저장), true);
봄('교재 것은 창고 원문을 바탕으로 삼는다', /state\.itemBody \|\| \{\}\)\[e\.code\]/.test(저장), true);
// ③ 본문과 정답을 «함께» 고치는가
봄('본문을 쓴다', /content: 새글/.test(저장), true);
봄('정답을 쓴다', /answer: 새답/.test(저장), true);
봄('손으로 고쳤다고 적는다', /editedByHand: true/.test(저장), true);
// ④ 안 바뀌었으면 안 쓴다 (Firestore 쓰기를 아낀다)
봄('안 바뀌면 그냥 닫는다', /새글 === String\(v\.content[\s\S]*?vEditClose\(\); return;/.test(저장), true);
봄('본문을 비우지 못한다', /if\(!새글\)/.test(저장), true);
// ⑤ 학생이 칠 수 없는 답이면 미리 말한다
봄('칠 수 없는 답을 미리 말한다', /dqAnswerable\(새글, 새답\)/.test(저장), true);
// ⑥ 교재 것을 고치면 창고 판(version)을 올리는가 — 안 올리면 다른 기기가 옛것을 본다
봄('교재 것은 판을 올린다', /itemsBumpVersion\(\)/.test(저장), true);

// ⑦ 화면에 문이 실제로 달려 있는가 — 함수만 있고 안 부르면 아무 소용이 없다
봄('카드에 고치기 단추가 있다', /onclick="vEditOpen\(/.test(html), true);
봄('카드 안에서 열린다', /\$\{vEditHTML\(v\.code\)\}/.test(html), true);

// ⑧ 🔴 드로어가 본문을 «제 줄»에 그리는가 — 한 줄에 다 넣으면 글자가 세로로 선다
봄('변형은 카드다', html.includes('class="ic-vcard"'), true);
봄('본문이 제 줄을 갖는다', html.includes('class="ic-vb"'), true);
const ds = fs.readFileSync(path.join(ROOT, 'ds.css'), 'utf8');
/* ⚠ 2026-09-07: 오른쪽 드로어를 «가운데 창»으로 바꿨다 — 폭만이 아니라 «자리»가 문제였다.
   그래서 재는 것도 폭 하나에서 「가운데에 서는가」로 옮긴다. */
const 창 = (() => { const a = html.indexOf(".ic-hwd{");
                    return a < 0 ? "" : html.slice(a, html.indexOf("}", a) + 1); })();
const 폭 = Number((창.split("width:min(")[1] || "").split("px")[0] || 0);
봄('창이 560px 보다 넓다', Number(폭) > 560, true);
봄('🔵 가운데에 선다', 창.includes('left:50%') && 창.includes('translateX(-50%)'), true);
봄('오른쪽에 안 붙는다', 창.includes('right:auto'), true);
봄('⚠ 다른 드로어는 그대로 오른쪽이다', html.includes('.hwd{position:fixed;top:0;right:0'), true);
/* 🔴 **규칙이 «먹는지»까지 재야 한다** (2026-09-07 · 사용자: 「폭이 너무 작아」).
   `.ic-hwd` 하나로 적었더니 아래에 있는 `.hwd` 가 이겨 폭이 400px 로 눌렸다.
   「규칙이 파일에 있다」와 「그 규칙이 실제로 이긴다」는 다른 말이다 —
   앞서 560px 로 넓혔던 것도 이 까닭에 한 번도 먹은 적이 없었다.
   ⚠ 자리(순서)로 이기는 것에 기대지 않는다. 다음에 누가 옮기면 조용히 도로 눌린다. */
{
  const 셀렉터 = (() => { const b = html.indexOf("ic-hwd{") + "ic-hwd".length;
                          const a2 = html.lastIndexOf(NL, b) + 1;
                          return html.slice(a2, b).trim(); })();
  /* ⚠ 정규식을 안 쓴다 — 셸을 지나며 백슬래시가 깎여 /\./ 가 /./ 가 됐고,
     «모든 글자»를 세는 바람에 무게가 언제나 2를 넘어 검사가 헛돌았다. */
  const 무게 = 셀렉터.split('.').length - 1;
  const 뒤에있나 = html.indexOf(셀렉터 + "{") > html.indexOf(".hwd{position:fixed");
  봄('🔴 창 규칙이 .hwd 를 이긴다 (무게 또는 자리로)', 무게 >= 2 || 뒤에있나, true);
  봄('🔵 무게로 이긴다 — 자리를 옮겨도 안 눌린다', 무게 >= 2, true);
}
봄('넘치면 카드 안에서 민다', /\.ic-vb\{[^}]*overflow-x:auto/.test(html), true);
봄('정답 칸 모양이 있다', /\.v-ans/.test(ds), true);

console.log(흠 ? '🔴 ' + 흠 + '개 어긋남 (' + 잼 + '개 중)' : '통과 ' + 잼 + '개');
process.exit(흠 ? 1 : 0);
