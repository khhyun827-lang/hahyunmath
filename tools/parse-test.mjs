/* 배포되는 html 의 인라인 스크립트가 «파싱은 되는가» (2026-09-19)

     node tools/parse-test.mjs

   🔴 **왜 이것이 따로 있어야 하나** — 인라인 스크립트에 구문 오류가 하나 나면 그 스크립트가
     통째로 안 돌아 **페이지가 백지가 된다.** 기능 하나가 아니라 앱 전부다.
     그런데 여태 그것을 재는 자리가 없었다. 오늘(09-19) 영상 묶기를 넣다가 템플릿 문법(`${…}`)을
     **일반 코드 자리**에 써서 index.html 이 통째로 깨졌는데, `video-due-test` 가 그 함수를
     `new Function` 으로 떠 보다가 «우연히» 걸렸다. 그 함수를 안 뜨는 판이었으면 **그대로 배포됐다.**
   🔵 `new Function(글)` 은 **파싱만 하고 실행하지 않는다** — DOM 도 네트워크도 안 건드린다.
     그래서 이 검사는 싸고, 빨간 것은 언제나 진짜다.
   ⚠ 바깥 파일(`src=`)은 여기서 안 본다 — 그것들은 제 이름으로 import 되어 다른 검사가 돌린다.
   ⚠ 「돈다」가 아니라 「읽힌다」만 잰다. 구문이 맞아도 틀린 코드는 다른 검사들의 몫이다. */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NL = String.fromCharCode(10);
let pass = 0, fail = 0;
const 봄 = (무엇, 참) => {
  if (참) { pass++; console.log('  ✓ ' + 무엇); }
  else { fail++; console.log('  🔴 ' + 무엇); }
};

/* 배포되는 문서 전부 — 새 html 을 만들면 여기 한 줄 더한다 */
const 문서들 = ['index.html', 'game.html'];

console.log(NL + '인라인 스크립트가 읽히는가' + NL);
for (const 문서 of 문서들) {
  const 글 = fs.readFileSync(path.join(ROOT, 문서), 'utf8').replace(/\r\n/g, '\n');
  /* `src=` 가 붙은 것은 «바깥 파일»이라 안이 비어 있다. 그것 말고 안에 코드가 든 것만 본다. */
  const 조각들 = [...글.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g)]
    .map(m => m[1]).filter(s => s.trim());
  봄(문서 + ' — 인라인 스크립트를 찾았다 (' + 조각들.length + '덩이)', 조각들.length > 0);
  조각들.forEach((조각, i) => {
    let 흠 = null;
    try { new Function(조각); }          // 파싱만 — 돌리지 않는다
    catch (e) {
      /* 몇 번째 줄인지 말해 준다 — 2백만 자 짜리 파일에서 「구문 오류」 한 줄은 쓸모가 없다. */
      const 앞 = 글.slice(0, 글.indexOf(조각));
      흠 = e.message + ' (이 덩이는 파일의 ' + (앞.split('\n').length) + '번째 줄부터다)';
    }
    봄('   ' + 문서 + ' › ' + (i + 1) + '번째 덩이가 읽힌다' + (흠 ? NL + '      ' + 흠 : ''), !흠);
  });
}

console.log(NL + '🪤 덫 — 망가뜨린 글을 넣어 본다' + NL);
{
  let 물었다 = 0;
  /* ① 오늘 실제로 낸 실수 — 템플릿 문법을 «코드 자리»에 썼다 */
  {
    let 물림 = false;
    try { new Function('const a = 1;' + NL + '${/* 주석 */""}' + NL + 'return a;'); }
    catch (e) { 물림 = true; }
    if (물림) 물었다++;
    console.log('  ' + (물림 ? '✓' : '🔴') + ' 코드 자리의 ${…} 는 물린다 (09-19에 낸 그 실수다)');
  }
  /* ② 닫히지 않은 괄호 */
  {
    let 물림 = false;
    try { new Function('function f(){ return 1;'); } catch (e) { 물림 = true; }
    if (물림) 물었다++;
    console.log('  ' + (물림 ? '✓' : '🔴') + ' 안 닫힌 중괄호도 물린다');
  }
  /* ③ 멀쩡한 글은 안 문다 — 늘 빨간 검사는 검사가 아니다 */
  {
    let 멀쩡 = true;
    try { new Function('const s = `값 ${1 + 1}`; return s;'); } catch (e) { 멀쩡 = false; }
    if (멀쩡) 물었다++;
    console.log('  ' + (멀쩡 ? '✓' : '🔴') + ' 진짜 템플릿 문자열은 그대로 읽힌다');
  }
  console.log(NL + '🪤 덫 ' + 물었다 + '/3 물었다');
  if (물었다 !== 3) fail++;
}

console.log(NL + (fail ? '🔴 걸린 것 ' + fail + '개 · ' + (pass + fail) + '개' : '✓ 전부 통과 · ' + pass + '개') + NL);
process.exit(fail ? 1 : 0);
