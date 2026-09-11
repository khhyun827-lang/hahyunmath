/* 워커 — «쓰기 전에 선언됐나» (2026-09-12)
   node tools/worker-order-test.mjs
   🔴 09-12b 에서 `sceneRule` 이 `hasImage` 보다 «앞»에 놓여 ReferenceError(TDZ)로 **모든 쌍둥이 호출이 터졌다.**
     `node --check` 는 이것을 못 잡는다(문법은 멀쩡하다). 한도는 부르기 전에 세니 누를 때마다 한 건씩 나갔고,
     브라우저에는 CORS 머리 없는 1101 페이지라 「Failed to fetch」로만 보였다.
   여기서는 함수 몸통 안에서 `const/let 이름` 이 «처음 쓰이는 자리»보다 앞에 있는지 잰다. 배포 없이 돈다. */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = fs.readFileSync(path.join(ROOT, 'worker/gemini-proxy.js'), 'utf8');

function body(name) {
  let at = src.indexOf('async function ' + name + '(');
  if (at < 0) at = src.indexOf('function ' + name + '(');
  if (at < 0) throw new Error(name + ' 못 찾음');
  let depth = 0;
  for (let j = src.indexOf('{', at); j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}') { depth--; if (!depth) return src.slice(at, j + 1); }
  }
  throw new Error(name + ' 끝 못 찾음');
}
/* 주석과 문자열을 걷어 낸다 — 주석 속 낱말이 «쓰임»으로 잡히면 헛된 경보가 난다 */
function strip(s) {
  return s.replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '))
          .replace(/\/\/[^\n]*/g, m => ' '.repeat(m.length))
          .replace(/`(?:\\[\s\S]|\$\{[^}]*\}|[^`\\])*`/g, m => m.replace(/[^\n]/g, ' '))
          .replace(/'(?:\\.|[^'\\\n])*'/g, m => ' '.repeat(m.length))
          .replace(/"(?:\\.|[^"\\\n])*"/g, m => ' '.repeat(m.length));
}
let n = 0, bad = 0;
for (const fn of ['handleGeminiTwin', 'handleGroqTwin', 'twinPrompt', 'handleFigureScene', 'handleReview']) {
  let b;
  try { b = strip(body(fn)); } catch (e) { console.log('  ⚠', e.message); continue; }
  const decl = /\b(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=/g;
  let m;
  while ((m = decl.exec(b))) {
    const name = m[1];
    /* 객체의 «열쇠»(`{ text: … }`)는 쓰임이 아니다 — 뒤에 콜론이 오면 뺀다 */
    const firstUse = b.search(new RegExp('(?<![\\w$.])' + name.replace(/\$/g, '\\$') + '(?![\\w$])(?!\\s*:(?!:))'));
    n++;
    if (firstUse >= 0 && firstUse < m.index) {
      bad++;
      const line = b.slice(0, firstUse).split('\n').length;
      console.log('  ✗ ' + fn + ': «' + name + '» 이 선언(' + b.slice(0, m.index).split('\n').length + '줄)보다 앞(' + line + '줄)에서 쓰인다 — TDZ');
    }
  }
}
console.log(`\n${n}개 선언 · ${bad ? '✗ ' + bad + ' 개가 앞에서 쓰인다' : '✓ 전부 선언 뒤에 쓰인다'}`);
process.exit(bad ? 1 : 0);
