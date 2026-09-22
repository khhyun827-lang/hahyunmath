/* 화면을 «재서» 다듬을 자리를 찾는다 — Playwright (2026-09-23).
 *
 * 🔴 **왜 있는가** — 「모서리가 안 맞는다 · 누르는 자리가 좁다」는 눈으로 세면 반드시 빠뜨린다.
 *   브라우저가 실제로 계산한 값(getComputedStyle · getBoundingClientRect)으로 잰다.
 *   고치기 «전»과 «후»에 같은 것을 돌려 숫자가 줄었는지 본다.
 *
 *   node tools/ui-audit.mjs 학생홈          한 무대
 *   node tools/ui-audit.mjs 학생홈 학생과제  여럿
 *   node tools/ui-audit.mjs --all           전부
 *
 * 재는 것 다섯 (두 스킬의 «셀 수 있는» 항목만 — 취향은 안 잰다) —
 *   ① 겹친 모서리   바깥 radius ≠ 안쪽 radius + 사이 padding  (Concentric border radius)
 *   ② 좁은 손잡이   누르는 것이 44×44 미만                    (Minimum hit area · 터치 기준)
 *   ③ transition:all  무엇이 바뀌는지 안 적은 전환            (Transition only what changes)
 *   ④ 눌림 값       :active 의 scale 이 0.95~0.98 밖          (Scale on press)
 *   ⑤ 글줄 감싸기   제목에 balance · 본문에 pretty 가 없는 것  (Text wrapping)
 */
import { chromium } from 'playwright';
import { 무대들, 씨앗 } from './shots-scenes.mjs';
import http from 'node:http';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PORT = 8777;
const 인자 = process.argv.slice(2);
const 폭 = Number((인자.find(a => a.startsWith('--w=')) || '--w=390').slice(4));
const 이름들 = 인자.includes('--all') ? Object.keys(무대들) : 인자.filter(a => !a.startsWith('--'));
if(!이름들.length){ console.log('무대를 대라: ' + Object.keys(무대들).join(' ') + '  (또는 --all)'); process.exit(0); }

const 살아있나 = () => new Promise(r => {
  const req = http.get('http://127.0.0.1:' + PORT + '/index.html', res => { res.resume(); r(res.statusCode === 200); });
  req.on('error', () => r(false)); req.setTimeout(700, () => { req.destroy(); r(false); });
});
let 서버 = null;
if(!(await 살아있나())){
  서버 = spawn(process.execPath, [path.join(HERE, 'serve.js'), String(PORT)], { stdio: 'ignore' });
  for(let i = 0; i < 40 && !(await 살아있나()); i++) await new Promise(r => setTimeout(r, 250));
}

/* 페이지 «안»에서 도는 자 — 바깥에서는 계산된 값을 못 본다 */
function 재기(){
  const 수 = v => Math.round(parseFloat(v) || 0);
  const 보이나 = el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const 이름 = el => el.tagName.toLowerCase() + (el.className && typeof el.className === 'string'
    ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.') : '');
  /* 「어느 줄의 무엇인가」 — 부모 클래스(없으면 태그)와 글자 몇 자를 같이 적는다.
     이름만으로는 `a ↔ a` 처럼 나와 어느 것인지 못 찾는다. */
  const 어디 = el => {
    const p = el.parentElement;
    const 부모 = p ? (String(p.className || '').trim().split(/\s+/)[0] || p.tagName.toLowerCase()) : '?';
    return 이름(el) + '⟨' + 부모 + ':' + (el.textContent || '').trim().slice(0, 8) + '⟩';
  };
  const 앱 = document.querySelector('.app');
  if(!앱) return { 흠: '.app 이 없다' };
  const 전부 = [...앱.querySelectorAll('*')].filter(보이나);
  const 결과 = { 잰것: 전부.length, 겹친모서리: [], 좁은손잡이: [], 겹친손잡이: [], 전부전환: [], 눌림값: [], 글줄: [] };
  const 손잡이들 = [];      /* 겹침을 보려고 «닿는 네모»를 모아 둔다 */

  for(const el of 전부){
    const cs = getComputedStyle(el);

    /* ③ transition:all
       ⚠ `transition-property` 의 **초기값이 `all`** 이다 — 전환이 아예 없는 요소도 'all' 로 읽힌다.
         시간이 0 이 아닌 것만 진짜로 «all 을 전환하는» 것이다(안 가르면 거짓으로 수십 건이 잡힌다). */
    if(cs.transitionProperty === 'all' && parseFloat(cs.transitionDuration) > 0) 결과.전부전환.push(이름(el));

    /* ① 겹친 모서리 — 바깥 radius 는 안쪽 radius + 사이 padding 이어야 한다.
       ⚠ 사이가 24px 를 넘으면 «딴 면»으로 보아 넘긴다(스킬이 그렇게 적었다). */
    const 바깥r = 수(cs.borderTopLeftRadius);
    if(바깥r > 0){
      const pad = 수(cs.paddingTop);
      if(pad > 0 && pad <= 24){
        for(const 자식 of el.children){
          if(!보이나(자식)) continue;
          const 안r = 수(getComputedStyle(자식).borderTopLeftRadius);
          if(안r <= 0) continue;
          const 맞을값 = 안r + pad;
          if(Math.abs(바깥r - 맞을값) > 2)
            결과.겹친모서리.push(이름(el) + ' r=' + 바깥r + ' p=' + pad + ' ⟩ ' + 이름(자식) + ' r=' + 안r + ' (바깥이 ' + 맞을값 + ' 여야)');
        }
      }
    }

    /* ② 좁은 손잡이 — 누르는 것인데 44 미만 */
    const 누르나 = el.tagName === 'BUTTON' || el.tagName === 'A' || el.hasAttribute('data-tap')
      || el.getAttribute('role') === 'button' || (el.onclick != null) || el.hasAttribute('onclick');
    if(누르나){
      const r = el.getBoundingClientRect();
      /* ⚠ **가짜 요소로 넓힌 손잡이는 `getBoundingClientRect` 에 안 잡힌다** — 스킬이 시키는
         고치는 법이 바로 그것이라, 그것을 안 보면 고쳐 놓고도 영영 빨갛다. ::after 까지 재서 큰 쪽을 쓴다. */
      const af = getComputedStyle(el, '::after');
      const 있나 = af.content && af.content !== 'none';
      const h = Math.max(r.height, 있나 ? 수(af.height) : 0);
      const w = Math.max(r.width, 있나 ? 수(af.width) : 0);
      /* 넓힌 «닿는 네모»를 요소 한가운데에 놓고 모아 둔다 — 아래에서 서로 겹치는지 본다.
         🔴 **가로로 미는 띠에서 밀려난 것은 빼야 한다** — 상단바 메뉴(`overflow-x:auto`)에서
           화면 밖으로 나간 탭이 오른쪽 단추와 «겹친다»고 나온다(거짓이다. 잘려서 안 보인다).
           그래서 «가두는 조상»의 네모와 겹치는 만큼만 진짜 닿는 자리로 친다. */
      let box = { x1: r.left + r.width/2 - w/2, x2: r.left + r.width/2 + w/2,
                  y1: r.top + r.height/2 - h/2, y2: r.top + r.height/2 + h/2 };
      for(let p = el.parentElement; p && p !== document.body; p = p.parentElement){
        const ps = getComputedStyle(p);
        if(!/auto|scroll|hidden/.test(ps.overflowX + ps.overflowY)) continue;
        const pr = p.getBoundingClientRect();
        box = { x1: Math.max(box.x1, pr.left), x2: Math.min(box.x2, pr.right),
                y1: Math.max(box.y1, pr.top), y2: Math.min(box.y2, pr.bottom) };
      }
      if(box.x2 - box.x1 > 1 && box.y2 - box.y1 > 1) 손잡이들.push({ 이름: 이름(el), el, ...box });
      if(h < 44 || w < 44)
        결과.좁은손잡이.push(이름(el) + ' ' + Math.round(w) + '×' + Math.round(h)
          + ' ⟨' + String(el.parentElement && el.parentElement.className || '').trim().split(/\s+/)[0] + '⟩');
    }

    /* ⑤ 글줄 — 제목은 balance, 본문은 pretty */
    const 글 = (el.textContent || '').trim();
    const 글자만 = el.children.length === 0 && 글.length > 0;
    if(글자만){
      const w = cs.textWrap || cs.textWrapStyle || 'auto';
      const 굵기 = 수(cs.fontWeight), 크기 = parseFloat(cs.fontSize);
      const 제목인가 = /^h[1-6]$/.test(el.tagName.toLowerCase()) || (굵기 >= 700 && 크기 >= 15);
      if(제목인가 && !/balance/.test(w) && 글.length > 6) 결과.글줄.push('제목 ' + 이름(el) + ' ← balance');
      else if(!제목인가 && 글.length >= 40 && !/pretty|balance/.test(w)) 결과.글줄.push('본문 ' + 이름(el) + ' ← pretty');
    }
  }

  /* ④ 눌림 값 — 스타일시트의 :active 규칙에서 scale 을 훑는다(상태를 만들 필요가 없다).
     기준은 앱이 스스로 들고 있는 `--press` 다 — 도구에 숫자를 또 적으면 잣대가 두 곳이 된다. */
  const 기준눌림 = parseFloat(getComputedStyle(앱).getPropertyValue('--press')) || 0.96;
  for(const ss of document.styleSheets){
    let rules; try{ rules = ss.cssRules; }catch(e){ continue; }
    for(const r of rules || []){
      /* ⚠ **`CSSStyleRule` 도 `cssRules` 를 갖는다**(CSS 중첩이 들어오면서) — 비어 있을 뿐이다.
         「cssRules 가 있으면 내려간다」로 적으면 **모든 규칙을 건너뛴다**(그래서 0건이 나왔다).
         선택자가 있으면 그것부터 보고, 그 «다음»에 안쪽으로 내려간다. */
      const 훑기 = (rule) => {
        if(rule.selectorText === undefined){
          if(rule.cssRules) for(const x of rule.cssRules) 훑기(x);
          return;
        }
        if(rule.cssRules) for(const x of rule.cssRules) 훑기(x);
        if(!/:active/.test(rule.selectorText)) return;
        const m = String(rule.style.transform || '').match(/scale\(([\d.]+)\)/);
        if(!m) return;
        const v = parseFloat(m[1]);
        /* 🔴 **잣대는 «이 제품이 정한 값»이다** — 스킬의 0.95~0.98 이 아니다 (2026-09-23 · P-5).
           사용자가 아이폰식 «튕기는 손맛»을 골라 0.92 로 정했다. 여기서 재는 것은
           「스킬대로인가」가 아니라 **「한 값으로 쓰이는가」**다 — 값이 두 곳으로 갈리면 손맛이 어긋난다. */
        if(Math.abs(v - 기준눌림) > 0.005)
          결과.눌림값.push(rule.selectorText.slice(0, 54) + ' → scale(' + v + ') · 기준 ' + 기준눌림);
      };
      훑기(r);
    }
  }
  /* 🔴 **넓힌 손잡이끼리 겹치면 안 된다** (Jakub ⑯) — 넓혀 놓고 이웃을 먹으면 엉뚱한 것이 눌린다.
     ⚠ 서로 «품은» 사이(부모-자식)는 뺀다 — 그것은 겹침이 아니라 포함이다. */
  for(let i = 0; i < 손잡이들.length; i++){
    for(let j = i + 1; j < 손잡이들.length; j++){
      const a = 손잡이들[i], b = 손잡이들[j];
      if(a.el.contains(b.el) || b.el.contains(a.el)) continue;
      const 가로 = Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1);
      const 세로 = Math.min(a.y2, b.y2) - Math.max(a.y1, b.y1);
      if(가로 > 1 && 세로 > 1)
        결과.겹친손잡이.push(어디(a.el) + ' ↔ ' + 어디(b.el)
          + ' (' + Math.round(가로) + '×' + Math.round(세로) + ' 겹침)');
    }
  }
  /* 같은 것이 여러 번 나오면 한 줄로 */
  for(const k of ['겹친모서리','좁은손잡이','겹친손잡이','전부전환','눌림값','글줄']){
    const 셈 = {};
    결과[k].forEach(x => { 셈[x] = (셈[x] || 0) + 1; });
    결과[k] = Object.entries(셈).sort((a,b) => b[1]-a[1]).map(([x,n]) => n > 1 ? x + '  ×' + n : x);
  }
  return 결과;
}

const 브라우저 = await chromium.launch();
const 모은것 = {};
try{
  for(const 이름 of 이름들){
    const 무대 = 무대들[이름];
    if(!무대){ console.error('그런 무대가 없다: ' + 이름); continue; }
    const ctx = await 브라우저.newContext({ viewport: { width: 폭, height: 1400 },
      isMobile: 폭 <= 560, hasTouch: 폭 <= 560, locale: 'ko-KR' });
    const page = await ctx.newPage();
    await page.goto('http://127.0.0.1:' + PORT + '/index.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof render === 'function' && typeof DATA !== 'undefined', null, { timeout: 30000 });
    await page.evaluate(씨앗);
    await page.evaluate(무대.세우기);
    await page.waitForTimeout(350);
    모은것[이름] = await page.evaluate(재기);
    await ctx.close();
  }
}finally{
  await 브라우저.close();
  if(서버) 서버.kill();
}

const 칸 = [['겹친모서리','① 겹친 모서리'],['좁은손잡이','② 좁은 손잡이(44 미만)'],['겹친손잡이','②-b 손잡이끼리 겹침'],
            ['전부전환','③ transition:all'],['눌림값','④ 눌림 값이 --press 와 다름'],['글줄','⑤ 글줄 감싸기']];
let 합 = 0;
for(const [이름, r] of Object.entries(모은것)){
  console.log('\n══ ' + 이름 + '  (' + 폭 + 'px · 요소 ' + r.잰것 + '개)');
  for(const [k, 말] of 칸){
    const 것 = r[k] || [];
    합 += 것.length;
    console.log('  ' + (것.length ? '🔴' : '✓ ') + ' ' + 말 + ' — ' + (것.length || '없음'));
    것.slice(0, 6).forEach(x => console.log('       · ' + x));
    if(것.length > 6) console.log('       · … 외 ' + (것.length - 6) + '줄');
  }
}
console.log('\n합계 ' + 합 + '건\n');
