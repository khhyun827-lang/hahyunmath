/* 오래된 아이폰(사파리)에서 페이지가 통째로 안 뜨는 것을 미리 잡는다.
 *
 * 🔴 **왜 있나** — 2026-09-16, 학생 하나가 «인터넷은 되는데 우리 페이지만 불러오기에서 멈춘다»고 했다.
 *   범인은 `index.html` 안의 정규식 lookbehind `(?<!\\)` 였다. 사파리는 이것을 **16.4 에서야** 지원한다.
 *   🔵 **무서운 것은 «그 줄에 닿지 않아도 죽는다»는 점이다.** 정규식 리터럴은 실행이 아니라 **읽을 때**
 *     검사돼서, 묶음 하나에 하나만 있어도 **스크립트 전체가 문법 오류로 사라진다.** 화면은 처음 그림
 *     그대로 멈추고, 콘솔을 볼 수 없는 학생의 손에서는 «그냥 안 되는 것»이 된다.
 *   ⚠ 강사의 최신 기기·크롬에서는 **절대 재현되지 않는다.** 그래서 눈으로는 영영 못 찾는다.
 *
 * 쓰는 법:  node tools/old-safari-check.mjs
 *   나가는 값 0 = 깨끗함, 1 = 걸린 것 있음.
 *   스스로 미덥나 보려면:  node tools/old-safari-check.mjs --자가검사
 */
import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const 뿌리 = join(dirname(fileURLToPath(import.meta.url)), '..');

/* 학생 화면이 읽는 것들. `<script src>` 로 걸린 것은 따로 죽어도 본체는 살지만,
   학생이 쓰는 갈래를 건드리면 그때 터지므로 같이 본다. */
const 볼것 = ['index.html', 'figure.js', 'game-core.js', 'ds.js', 'hwpx.js'];

/* ⚠ **정규식에 관한 것은 여기 넣지 말 것.** 줄을 글자로 훑으면 나눗셈을 정규식으로 잘못 본다
     (`v.reduce(…)/v.length` 를 「d 깃발」로 읽은 적이 있다 — 2026-09-16). 정규식은 아래에서
     «어디부터 어디까지가 정규식인지 안 뒤에» 따로 본다. */
const 함정 = [
  { 이름: '?. (옵셔널 체이닝)',   결: /\?\./,            부터: 'iOS 13.4', 급: '치명' },
  { 이름: '?? (널 병합)',         결: /\?\?[^=]/,        부터: 'iOS 13.4', 급: '치명' },
  { 이름: '??= ||= &&=',          결: /(\?\?|\|\||&&)=/, 부터: 'iOS 14',   급: '치명' },
  { 이름: 'Array.at() / String.at()', 결: /\.at\(/,      부터: 'iOS 15.4', 급: '터짐' },
  { 이름: 'findLast',             결: /\.findLast/,      부터: 'iOS 15.4', 급: '터짐' },
  { 이름: 'Object.hasOwn',        결: /Object\.hasOwn/,  부터: 'iOS 15.4', 급: '터짐' },
  { 이름: 'structuredClone',      결: /structuredClone/, 부터: 'iOS 15.4', 급: '터짐' },
  { 이름: 'crypto.randomUUID',    결: /randomUUID/,      부터: 'iOS 15.4', 급: '터짐' },
  { 이름: 'replaceAll',           결: /\.replaceAll/,    부터: 'iOS 13.4', 급: '터짐' },
  { 이름: 'toSorted / toReversed', 결: /\.to(Sorted|Reversed|Spliced)\(/, 부터: 'iOS 16.4', 급: '터짐' },
  { 이름: 'AbortSignal.timeout',  결: /AbortSignal\.timeout/, 부터: 'iOS 16', 급: '터짐' },
  { 이름: 'Promise.any',          결: /Promise\.any/,    부터: 'iOS 14',   급: '터짐' },
];

/* ───────────────────────────────────────────────────────────────────────────
   코드를 «살 · 글자열 · 정규식» 셋으로 가른다.

   🔴 **첫 판은 «아무것도 못 무는 검사»였다** (2026-09-16). 두 번 헛디뎠고 둘 다 남겨 둔다:
     ① 글자열을 지우면서 **정규식까지 지웠다** — 찾으려는 것이 바로 거기 있는데.
     ② 템플릿 문자열 안의 `${ }` 를 안 따라가서, 그 안에 또 백틱이 나오면 **그 뒤가 통째로 어긋났다.**
        그래서 `</div>` 의 `/` 를 정규식으로 읽고 `div` 를 「d·v 깃발」이라 우겼다(가짜 102개).
   🔵 그래서 지금은 **쌓임(스택)으로 제대로 따라간다.** 글자열은 모아 두되(`new RegExp('(?<!…)')` 는
     읽을 때 멀쩡하고 **부를 때** 터지므로 급을 낮춰 따로 일러 준다), 정규식은 «어디부터 어디까지»를
     안 뒤에 본다. 살에서는 정규식도 비운다 — 정규식 속의 `??` 가 가짜로 걸리지 않게.
   ⚠ **이 함수를 고치면 반드시 `--자가검사` 를 돌릴 것.** 못 무는 검사는 없느니만 못하다.
   ─────────────────────────────────────────────────────────────────────────── */
const 정규식앞올것 = new Set(['=', '(', ',', ':', '[', '!', '&', '|', '?', '{', '}', ';', '+', '-', '*', '%', '~', '^', '<', '>', '\n']);
const 정규식앞낱말 = /\b(return|typeof|case|in|of|new|delete|void|instanceof|do|else|yield|await)\s*$/;
const 깃발글자 = /[dgimsuvy]/;

function 가르기(코드) {
  const 글자열 = [];      // {줄, 속}
  const 정규식들 = [];    // {줄, 본문, 깃발}
  let 살 = '', i = 0, 줄 = 1, 앞 = '';
  /* 쌓임 — {꼴:'코드', 템플안, 중괄호} 또는 {꼴:'템플', 첫줄, 속} */
  const 쌓임 = [{ 꼴: '코드', 템플안: false, 중괄호: 0 }];
  const 이제 = () => 쌓임[쌓임.length - 1];
  const 비우기 = (s) => { for (const ch of s) { if (ch === '\n') { 살 += '\n'; 줄++; } else 살 += ' '; } };
  const 뱉기 = (s) => { 살 += s; const t = s.trim(); if (t) 앞 = t.slice(-1); };

  while (i < 코드.length) {
    const 칸 = 이제();
    const c = 코드[i], d = 코드[i + 1];

    /* ── 템플릿 문자열 안 ── */
    if (칸.꼴 === '템플') {
      if (c === '\\') { 칸.속 += c + (d || ''); 비우기(코드.slice(i, i + 2)); i += 2; continue; }
      if (c === '`') { 글자열.push({ 줄: 칸.첫줄, 속: 칸.속 }); 쌓임.pop(); 살 += ' '; i++; 앞 = 'x'; continue; }
      if (c === '$' && d === '{') { 쌓임.push({ 꼴: '코드', 템플안: true, 중괄호: 0 }); 살 += '  '; i += 2; 앞 = '{'; continue; }
      칸.속 += c;
      if (c === '\n') { 살 += '\n'; 줄++; } else 살 += ' ';
      i++; continue;
    }

    /* ── 코드 안 ── */
    if (c === '\n') { 살 += '\n'; 줄++; i++; 앞 = '\n'; continue; }

    if (c === '/' && d === '*') {                       // 여러 줄 주석
      i += 2; 살 += '  ';
      while (i < 코드.length && !(코드[i] === '*' && 코드[i + 1] === '/')) { 비우기(코드[i]); i++; }
      i += 2; 살 += '  '; continue;
    }
    if (c === '/' && d === '/') {                       // 한 줄 주석
      while (i < 코드.length && 코드[i] !== '\n') { 살 += ' '; i++; }
      continue;
    }
    if (c === '"' || c === "'") {                       // 여느 글자열
      const 닫 = c, 첫줄 = 줄; let 속 = '';
      i++; 살 += ' ';
      while (i < 코드.length) {
        if (코드[i] === '\\') { 속 += 코드[i] + (코드[i + 1] || ''); 살 += '  '; i += 2; continue; }
        if (코드[i] === 닫) { i++; 살 += ' '; break; }
        속 += 코드[i]; 비우기(코드[i]); i++;
      }
      글자열.push({ 줄: 첫줄, 속 }); 앞 = 'x'; continue;
    }
    if (c === '`') { 쌓임.push({ 꼴: '템플', 첫줄: 줄, 속: '' }); 살 += ' '; i++; continue; }

    if (c === '{') { if (칸.템플안) 칸.중괄호++; 뱉기(c); i++; continue; }
    if (c === '}') {
      if (칸.템플안 && 칸.중괄호 === 0) { 쌓임.pop(); 살 += ' '; i++; 앞 = 'x'; continue; }
      if (칸.템플안) 칸.중괄호--;
      뱉기(c); i++; continue;
    }

    /* 정규식 리터럴인가, 나눗셈인가 — 바로 앞의 뜻있는 글자로 가른다 */
    if (c === '/' && (앞 === '' || 정규식앞올것.has(앞) || 정규식앞낱말.test(살.slice(-14)))) {
      let j = i + 1, 칸안 = false, 닫혔나 = false;
      while (j < 코드.length) {
        const e = 코드[j];
        if (e === '\\') { j += 2; continue; }
        if (e === '\n') break;                          // 한 줄을 넘으면 정규식이 아니었다
        if (e === '[') 칸안 = true;
        else if (e === ']') 칸안 = false;
        else if (e === '/' && !칸안) { 닫혔나 = true; j++; break; }
        j++;
      }
      if (닫혔나) {
        let k = j;
        while (k < 코드.length && 깃발글자.test(코드[k])) k++;
        /* 깃발 뒤에 또 글자가 붙으면 정규식이 아니었다 — `</div>` 를 잡던 자리다 */
        if (!(코드[k] && /[A-Za-z0-9_$]/.test(코드[k]))) {
          정규식들.push({ 줄, 본문: 코드.slice(i, j), 깃발: 코드.slice(j, k) });
          비우기(코드.slice(i, k));                      // 살에서는 비운다(속의 `??` 가 가짜로 걸리지 않게)
          i = k; 앞 = 'x'; continue;
        }
      }
    }

    뱉기(c); i++;
  }
  return { 살, 글자열, 정규식들 };
}

/* `<script>` 안쪽만 뽑는다 — `src=` 로 걸린 것은 내용이 없으니 건너뛴다. */
function 묶음뽑기(html) {
  const 결 = /<script(\b[^>]*)>([\s\S]*?)<\/script>/gi;
  const 묶음 = [];
  let m;
  while ((m = 결.exec(html))) {
    if (/\bsrc\s*=/i.test(m[1])) continue;
    묶음.push({ 코드: m[2], 첫줄: html.slice(0, m.index + m[0].indexOf('>') + 1).split('\n').length });
  }
  return 묶음;
}

/* ── 스스로 미더운지 — 일부러 망가뜨려 무는지 본다 ── */
function 자가검사() {
  const 판 = [
    ['물어야 함: 정규식 lookbehind', 'var r = /(?<!x)y/g;', true],
    ['물어야 함: new RegExp 속 lookbehind', 'var r = new RegExp("(?<!x)y");', true],
    ['물어야 함: ?.', 'var a = b?.c;', true],
    ['물어야 함: ??', 'var a = b ?? 1;', true],
    ['물어야 함: d 깃발', 'var r = /ab/dg;', true],
    ['물지 말 것: 나눗셈', 'var a = v.reduce(function(x,y){return x+y},0)/v.length;', false],
    ['물지 말 것: 템플릿 속 HTML', 'var s = `<div class="a"></div>`;', false],
    ['물지 말 것: 겹친 템플릿', 'var s = `a${ b.map(function(x){ return `<i>${x}</i>` }).join("") }z</div>`;', false],
    ['물지 말 것: 주석 속 경고', '/* lookbehind (?<!x) 를 쓰지 말 것 */ var a = 1;', false],
    ['물지 말 것: 글자열 속 URL', 'var u = "https://a.b/c"; var q = 1;', false],
    ['물지 말 것: 정규식 속 물음표', 'var r = /a\\?\\?b/g;', false],
  ];
  let 틀린것 = 0;
  for (const [이름, 코드, 물어야] of 판) {
    const { 살, 글자열, 정규식들 } = 가르기(코드);
    let 물었나 = false;
    for (const { 본문, 깃발 } of 정규식들) if (/\(\?<[=!]/.test(본문) || /[dv]/.test(깃발)) 물었나 = true;
    for (const { 속 } of 글자열) if (/\(\?<[=!]/.test(속)) 물었나 = true;
    for (const 줄 of 살.split('\n')) for (const f of 함정) if (f.결.test(줄)) 물었나 = true;
    const 맞나 = 물었나 === 물어야;
    if (!맞나) 틀린것++;
    console.log((맞나 ? '  ✅ ' : '  ❌ ') + 이름);
  }
  console.log(틀린것 ? ('❌ 자가검사 ' + 틀린것 + '개 틀렸다 — 이 검사기를 믿지 말 것.') : '✅ 자가검사 통과 — 물 것은 물고, 안 물 것은 안 문다.');
  return 틀린것 === 0;
}

if (process.argv.includes('--자가검사')) process.exit(자가검사() ? 0 : 1);

let 걸린것 = 0, 본묶음 = 0;
const 셈 = {};
for (const 이름 of 볼것) {
  let 원본;
  try { 원본 = readFileSync(join(뿌리, 이름), 'utf8'); }
  catch { console.log('· ' + 이름 + ' — 없다(건너뜀)'); continue; }

  const 조각 = 이름.endsWith('.html') ? 묶음뽑기(원본) : [{ 코드: 원본, 첫줄: 1 }];

  for (const { 코드, 첫줄 } of 조각) {
    본묶음++;
    /* ① 문법이 성한가 — 방금 고친 것이 깨지지 않았는지. (노드 기준이라 lookbehind 는 통과한다) */
    try { new Script(코드); }
    catch (e) {
      걸린것++;
      console.log('❌ ' + 이름 + ' (' + 첫줄 + '째 줄 묶음) — 문법이 깨졌다: ' + e.message);
      continue;
    }
    const { 살, 글자열, 정규식들 } = 가르기(코드);
    const 말하기 = (표, 줄, 말) => {
      걸린것++; 셈[이름] = (셈[이름] || 0) + 1;
      console.log(표 + ' ' + 이름 + ':' + 줄 + ' — ' + 말);
    };
    /* ② 정규식 — 자리를 알고 보므로 나눗셈과 헷갈리지 않는다 */
    for (const { 줄, 본문, 깃발 } of 정규식들) {
      if (/\(\?<[=!]/.test(본문))
        말하기('🔴', 첫줄 + 줄 - 1, '정규식 lookbehind (?<= (?<! (iOS 16.4 부터) · 이 하나로 묶음 전체가 안 뜬다');
      const 나쁜깃발 = (깃발.match(/[dv]/g) || []).join('·');
      if (나쁜깃발)
        말하기('🔴', 첫줄 + 줄 - 1, '정규식 ' + 나쁜깃발 + ' 깃발 (iOS 16.4 부터) · 이 하나로 묶음 전체가 안 뜬다');
    }
    /* ③ 그 밖의 새 문법·새 갈래 */
    살.split('\n').forEach((줄글, k) => {
      for (const f of 함정) {
        if (!f.결.test(줄글)) continue;
        말하기(f.급 === '치명' ? '🔴' : '🟠', 첫줄 + k,
               f.이름 + ' (' + f.부터 + ' 부터) · ' + (f.급 === '치명' ? '이 하나로 묶음 전체가 안 뜬다' : '부를 때 터진다'));
      }
    });
    /* ④ `new RegExp('(?<!…)')` — 읽을 때는 멀쩡하고 **부를 때** 터진다 */
    for (const { 줄, 속 } of 글자열) {
      if (!/\(\?<[=!]/.test(속)) continue;
      말하기('🟠', 첫줄 + 줄 - 1, 'new RegExp 안의 lookbehind (iOS 16.4 부터) · 그 갈래를 부를 때 터진다');
    }
  }
}

console.log('— 묶음 ' + 본묶음 + '개를 봤다.');
if (걸린것) {
  console.log('  갈래별 — ' + Object.entries(셈).map(([k, v]) => k + ' ' + v).join(' · '));
  console.log('❌ 걸린 것 ' + 걸린것 + '개. 🔴 는 «페이지가 통째로 안 뜬다» — 반드시 고칠 것.');
  process.exit(1);
}
console.log('✅ 오래된 아이폰에서도 읽힌다.');
