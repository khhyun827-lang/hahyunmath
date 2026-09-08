// 문항 «지문» — 그때 그 본문의 해시 앞 8자리 (2026-09-09)
//
//   import { 지문 } from './fingerprint.mjs';
//   지문('좌표평면 위의 두 점 …')   →  'a3f91c7e'
//
// 🔴 **가르는 잣대는 여기 없다.** 루트 `hwpx.js` 의 `hwpItemFpText()` 하나뿐이고,
//    웹도 이 함수를 부른다. 여기는 «그 위에 해시를 얹는» 자리다.
//    잣대를 두 벌로 두면 반드시 어긋난다 — 그러면 멀쩡한 문항이 죄다 「고쳐졌다」가 된다.
//
// ⚠ **해시를 hwpx.js 안에서 못 뜬다.** 브라우저는 `crypto.subtle.digest`(비동기)고
//    node 는 `createHash`(동기)라 한 함수로 안 담긴다. 값은 같다 — 2026-09-06에 실측했다.
//    그래서 «가르는 규칙»만 hwpx.js 에 두고 해시는 부르는 쪽에서 뜬다.
//
// 왜 8자리인가 — 564제로 재 보니 8·12·64자리의 결과가 **같았다**. 미주에 보이는 글자라
// 짧을수록 좋다. → docs/코드-숨기기.md 3절
import { createHash } from 'node:crypto';
import { loadHwpxRules } from './hwpx-node.mjs';

let 잣대 = null;
function 규칙(){
  if (!잣대) {
    const r = loadHwpxRules();
    if (typeof r.hwpItemFpText !== 'function')
      throw new Error('hwpx.js 에 hwpItemFpText 가 없습니다 — 이름이 바뀌었으면 hwpx-node.mjs 의 RULE_NAMES 도 같이 고쳐야 합니다.');
    잣대 = r.hwpItemFpText;
  }
  return 잣대;
}

export const 지문길이 = 8;

/* 본문 하나의 지문. 빈 본문은 빈 글자를 돌려준다 —
   ⚠ **빈 것에 지문을 주면 안 된다.** 빈 본문끼리는 죄다 같은 값이 되어 「같은 문항」이 된다. */
export function 지문(content){
  const t = 규칙()(content);
  if (!t) return '';
  return createHash('sha256').update(t, 'utf8').digest('hex').slice(0, 지문길이);
}

/* 심긴 지문과 지금 본문이 맞는가. 셋으로 답한다 —
   🔴 **«지문 없음»을 «틀림»으로 뭉개면 안 된다.** 이미 심어 둔 564제가 전부 지문 없음이고,
     그것을 틀렸다고 하면 첫 검사에서 564건이 빨갛게 뜬다. 없는 것은 «아직 못 가림»이다. */
export function 지문맞나(심긴, content){
  if (!심긴) return '못가림';
  return 지문(content) === 심긴 ? '맞음' : '틀림';
}
