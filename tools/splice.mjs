/* index.html 처럼 «한 덩이로 사는 파일»을 안전하게 갈아 끼운다 (2026-09-23).
 *
 * 🔴 **왜 있는가** — 이 저장소의 패치는 늘 같은 함정에서 넘어진다:
 *   셸을 거쳐 `sed`·`node -e` 로 짓다 보면 **백슬래시·달러·백틱이 깎인다.**
 *   깎인 채로 들어가면 «검사까지» 멀쩡히 통과하고, 화면에서만 이상해진다.
 *   ⇒ 새 코드 조각은 **파일(.txt)로** 짓고, 이 도구로 «닻과 닻 사이»를 바꿔 끼운다.
 *      그러면 조각에 무엇이 들어 있든 셸을 안 지난다.
 *
 * 쓰는 법 —
 *
 *   import { 열기 } from './splice.mjs';
 *   const F = 열기('index.html');
 *   F.한번('찾을 글', '바꿀 글');              // 딱 하나 있어야 한다. 둘이면 멈춘다.
 *   F.사이('앞 닻', '뒤 닻', F.조각('새것'));  // 앞 닻(포함)~뒤 닻(제외)을 통째로
 *   F.저장();                                   // 몇 자가 됐는지 찍는다
 *
 *   `조각(이름)` 은 이 스크립트 «옆»의 `<이름>.txt` 를 그대로 읽는다.
 *
 * ⚠ **닻은 한 번만 나오는 글이어야 한다.** 둘이면 «어느 쪽을 고쳤는지» 알 수 없어 멈춘다.
 * ⚠ 고친 뒤에는 **덫을 놔 본다** — 고친 자리를 일부러 되돌려 검사가 «무는지» 본다.
 *   통과만 보고 넘어가면, 검사가 그 자리를 안 보고 있다는 사실을 영영 모른다.
 * ⚠ NUL 이스케이프(백슬래시 u 0000)를 소스에 쓰지 말 것 — 편집 도구가 진짜 NUL 로 바꿔 넣고,
 *   그러면 git 이 그 파일을 binary 로 보아 줄끝 정규화를 건너뛴다(2026-09-16에 겪었다).
 */
import fs from 'node:fs';
import path from 'node:path';

export function 열기(파일, 옵션){
  const o = 옵션 || {};
  /* 조각은 «부르는 스크립트» 옆에서 찾는다 — 임시 폴더에 두고 쓰기 좋게. */
  const 조각집 = o.조각집 || path.dirname(process.argv[1] || '.');
  let s = fs.readFileSync(파일, 'utf8');
  const 처음길이 = s.length;

  const 한군데 = (닻) => {
    const i = s.indexOf(닻);
    if(i < 0) throw new Error('닻이 없다: ' + 미리보기(닻));
    if(s.indexOf(닻, i + 1) >= 0) throw new Error('닻이 둘 이상이다 — 더 길게 잡을 것: ' + 미리보기(닻));
    return i;
  };
  const API = {
    글: () => s,
    조각: (이름) => fs.readFileSync(path.join(조각집, 이름 + '.txt'), 'utf8'),
    한번: (닻, 새것) => { const i = 한군데(닻); s = s.slice(0, i) + 새것 + s.slice(i + 닻.length); return API; },
    /* 앞 닻(포함)부터 뒤 닻(제외)까지. 뒤 닻은 앞 닻 «뒤에서» 찾는다. */
    사이: (앞, 뒤, 새것) => {
      const i = 한군데(앞);
      const j = s.indexOf(뒤, i + 앞.length);
      if(j < 0) throw new Error('뒤 닻이 없다: ' + 미리보기(뒤));
      s = s.slice(0, i) + 새것 + s.slice(j);
      return API;
    },
    /* 있는지만 본다 — 이미 고쳐진 파일에 두 번 돌리는 사고를 막는다. */
    있나: (글) => s.includes(글),
    저장: () => {
      fs.writeFileSync(파일, s);
      console.log('OK ' + 파일 + ' ' + 처음길이 + ' → ' + s.length + '자 (' +
        (s.length - 처음길이 >= 0 ? '+' : '') + (s.length - 처음길이) + ')');
      return s.length;
    }
  };
  return API;
}
const 미리보기 = (t) => JSON.stringify(String(t).slice(0, 60)) + (String(t).length > 60 ? '…' : '');

/* 혼자 돌리면 스스로 검사한다 — `node tools/splice.mjs` */
if(process.argv[1] && process.argv[1].endsWith('splice.mjs')){
  const tmp = path.join(process.env.TEMP || '.', 'splice-self-check.txt');
  const 봄 = (무엇, 나온것, 나와야) => {
    const ok = JSON.stringify(나온것) === JSON.stringify(나와야);
    console.log((ok ? '  ✓ ' : '  🔴 ') + 무엇 + (ok ? '' : '\n      나온 것 ' + JSON.stringify(나온것)));
    if(!ok) process.exitCode = 1;
  };
  fs.writeFileSync(tmp, 'AAA<b>BBB</b>CCC<b>DDD</b>');
  const F = 열기(tmp);
  F.한번('<b>BBB</b>', '<i>bbb</i>');
  봄('한번 — 하나를 바꾼다', F.글(), 'AAA<i>bbb</i>CCC<b>DDD</b>');
  F.사이('AAA', 'CCC', 'A-');
  봄('사이 — 앞 닻부터 뒤 닻 앞까지', F.글(), 'A-CCC<b>DDD</b>');
  let 물었나 = false;
  try{ F.한번('없는닻', 'x'); }catch(e){ 물었나 = /닻이 없다/.test(e.message); }
  봄('🔴 없는 닻이면 멈춘다', 물었나, true);
  fs.writeFileSync(tmp, 'xx yy xx');
  const G = 열기(tmp);
  물었나 = false;
  try{ G.한번('xx', 'z'); }catch(e){ 물었나 = /둘 이상/.test(e.message); }
  봄('🔴 닻이 둘이면 멈춘다 — 어느 쪽을 고쳤는지 모를 일을 안 한다', 물었나, true);
  /* 백틱·달러·백슬래시가 든 조각이 «그대로» 들어가는가 — 이 도구가 있는 까닭이다 */
  const 조각 = path.join(path.dirname(tmp), 'splice-frag.txt');
  fs.writeFileSync(조각, '`${a} \\d ${b}`');
  fs.writeFileSync(tmp, '[[여기]]');
  const H = 열기(tmp, { 조각집: path.dirname(조각) });
  H.한번('[[여기]]', H.조각('splice-frag'));
  봄('🔴 백틱·달러·백슬래시가 한 글자도 안 깎인다', H.글(), '`${a} \\d ${b}`');
  fs.unlinkSync(tmp); fs.unlinkSync(조각);
  console.log(process.exitCode ? '\n🔴 splice 자체 검사 실패\n' : '\n✓ splice 자체 검사 통과\n');
}
