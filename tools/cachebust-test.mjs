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
import crypto from 'crypto';
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

/* 🔵 **고친 파일과 그 ?v= 가 함께 움직였는가** — 이제 «잰다» (2026-09-18).
   ~~여기까지는 못 잰다(그날의 일이라)~~ 고 적어 두고 **바로 그날 또 놓쳤다** — figure.js 를
   고쳐 배포하면서 `?v=` 를 `d` 그대로 두었다(09-15에 이어 두 번째다). 경고 주석도, 위의 검사도
   그것을 못 막았다. 그래서 **파일의 지문을 적어 두고 견준다.**
     · 지문이 달라졌는데 `?v=` 가 그대로면 **빨갛다** — 잊은 것이 이것이다.
     · 둘이 «함께» 달라졌으면 통과하고, 새 지문을 적어 둔다(다음 번의 잣대가 된다).
   ⚠ 그래서 이 검사는 `tools/cachebust-stamp.json` 을 «쓴다». 사람이 손으로 적을 것이 아니다 —
     손으로 적게 하면 그것을 또 잊는다. 저장소에 함께 올라가야 다음 사람이 같은 잣대를 본다. */
console.log(NL + '고친 파일과 ?v= 가 함께 움직였는가 — 지문으로 본다' + NL);
{
  const 도장길 = path.join(ROOT, 'tools', 'cachebust-stamp.json');
  let 도장 = {};
  try { 도장 = JSON.parse(fs.readFileSync(도장길, 'utf8')); } catch (_) {}
  const 지문 = f => crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, f))).digest('hex').slice(0, 16);
  const 새도장 = {};
  let 잊은것 = [];
  for (const 문서 of 문서들) {
    const 알맹이 = fs.readFileSync(path.join(ROOT, 문서), 'utf8').replace(/<!--[\s\S]*?-->/g, '');
    for (const m of 알맹이.matchAll(/<script[^>]*\ssrc="([^"?]+)\?v=([^"]+)"/g)) {
      const [, 파일, v] = m;
      if (!fs.existsSync(path.join(ROOT, 파일))) continue;
      const h = 지문(파일);
      새도장[파일] = { 지문: h, v };
      const 옛 = 도장[파일];
      if (옛 && 옛.지문 !== h && 옛.v === v) 잊은것.push(파일 + ' (?v=' + v + ' 그대로)');
    }
  }
  봄('파일이 달라졌으면 ?v= 도 달라졌다' + (잊은것.length ? ' — 🔴 ' + 잊은것.join(' / ') + ' → ?v= 를 올릴 것' : ''),
    잊은것.length === 0);
  /* 빨간 채로 도장을 갈면 다음 번에 조용해진다 — 고친 뒤에만 적는다. */
  if (잊은것.length === 0) {
    const 글 = JSON.stringify(새도장, null, 1) + NL;
    let 옛글 = '';
    try { 옛글 = fs.readFileSync(도장길, 'utf8'); } catch (_) {}
    if (글 !== 옛글) { fs.writeFileSync(도장길, 글); console.log('  · 지문을 새로 적었다 — 이 파일도 함께 커밋할 것'); }
  }
}

/* «값이 서로 다르지 않은가»도 본다: 한 파일만 올리고 딴 문서를 잊는 일이 잦다. */
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
