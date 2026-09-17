// 따로 받아지는 스크립트에 «?v=» 가 붙어 있는가 (2026-09-18)
//
//   node tools/cachebust-test.mjs
//
// 🔴 **왜 재는가** — `index.html` 은 배포할 때마다 새로 받아지지만, 옆에 놓인 `.js` 는
//   **따로** 받아진다. 주소가 그대로면 브라우저가 옛 파일을 그냥 쓴다.
//   `hwpx.js` 에는 09-04부터 이 경고가 주석으로 있었는데 **`figure.js` 에는 없었다.**
//   그래서 09-15에 고친 «축 길이»가 사용자 브라우저에 며칠째 안 닿았을 수 있다
//   (사용자 — 「수정했던것 같은데 … 이번에도 그림에서 축이 또 길게 나와서」).
// 🔵 **주석으로 적어 두는 것으로는 안 된다** — 두 번 다 주석은 있었고 사람이 잊었다. 검사로 옮긴다.
// ⚠ 바깥 것(cdn·gstatic)은 저희가 안 고치므로 안 본다. 여기서 보는 것은 «저장소 안의 파일»뿐이다.

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

/* 검사할 «문서» — 배포되는 html 들 */
const 문서들 = ['index.html', 'game.html'];

console.log(NL + '따로 받아지는 스크립트의 ?v=' + NL);

for (const 문서 of 문서들) {
  const 글 = fs.readFileSync(path.join(ROOT, 문서), 'utf8');
  /* ⚠ 주석 안의 `<script …>` 를 세면 안 된다 — 바로 이 파일들이 주석으로 그 꼴을 적어 둔다. */
  const 알맹이 = 글.replace(/<!--[\s\S]*?-->/g, '');
  const 것들 = [...알맹이.matchAll(/<script[^>]*\ssrc="([^"]+)"/g)].map(m => m[1])
    .filter(s => !/^https?:\/\//.test(s));       // 바깥 것은 안 본다
  봄(문서 + ' — 저장소 안의 스크립트를 찾았다 (' + 것들.length + '개)', 것들.length > 0);
  for (const s of 것들) {
    const 파일 = s.split('?')[0];
    봄('   ' + 문서 + ' › ' + 파일 + ' 에 ?v= 가 붙어 있다', /\?v=/.test(s));
    봄('   ' + 문서 + ' › ' + 파일 + ' 가 실제로 있다', fs.existsSync(path.join(ROOT, 파일)));
  }
}

/* 🔵 **고친 파일과 그 ?v= 가 함께 움직였는가** — 여기까지는 못 잰다(그날의 일이라).
   대신 «값이 서로 다르지 않은가»만 본다: 한 파일만 올리고 딴 파일을 잊는 일이 잦다. */
console.log(NL + '같은 파일은 어느 문서에서나 같은 ?v= 여야 한다' + NL);
{
  const 본것 = {};
  for (const 문서 of 문서들) {
    const 알맹이 = fs.readFileSync(path.join(ROOT, 문서), 'utf8').replace(/<!--[\s\S]*?-->/g, '');
    for (const m of 알맹이.matchAll(/<script[^>]*\ssrc="([^"?]+)\?v=([^"]+)"/g)) {
      (본것[m[1]] || (본것[m[1]] = [])).push(문서 + '=' + m[2]);
    }
  }
  let 어긋난것 = [];
  for (const [f, 값들] of Object.entries(본것)) {
    const v = new Set(값들.map(x => x.split('=')[1]));
    if (v.size > 1) 어긋난것.push(f + ' (' + 값들.join(' · ') + ')');
  }
  봄('어긋난 것이 없다' + (어긋난것.length ? ' — ' + 어긋난것.join(' / ') : ''), 어긋난것.length === 0);
}

console.log(NL + '🪤 덫 — ?v= 를 뗀 줄을 지어 돌려 본다' + NL);
let 덫물림 = 0;
{
  const 가짜 = '<script src="figure.js"></script>';
  const s = (가짜.match(/<script[^>]*\ssrc="([^"]+)"/) || [])[1];
  if (!/\?v=/.test(s)) { 덫물림++; console.log('  ✓ ?v= 없는 줄은 물린다'); }
  else console.log('  🔴 안 물었다');
  /* 주석 안의 것은 «안» 세야 한다 — 이 파일들이 경고를 주석으로 적어 두기 때문이다. */
  const 주석 = '<!-- 🔴 figure.js 를 고치면 ?v= 도 <script src="figure.js"></script> 처럼 -->';
  const 남은것 = [...주석.replace(/<!--[\s\S]*?-->/g, '').matchAll(/<script[^>]*\ssrc="([^"]+)"/g)];
  if (남은것.length === 0) { 덫물림++; console.log('  ✓ 주석 안의 <script> 는 안 센다'); }
  else console.log('  🔴 주석 안의 것을 세고 있다 — 검사가 제 꼬리를 문다');
}

console.log(NL + (fail === 0 ? '✓ 전부 통과' : '🔴 걸린 것 ' + fail + '개') + ' · ' + (pass + fail) + '개');
console.log('🪤 덫 ' + 덫물림 + '/2 물었다');
process.exit(fail === 0 && 덫물림 === 2 ? 0 : 1);
