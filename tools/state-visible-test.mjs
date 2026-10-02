// «켜짐·고름» 표시가 눈에 보이는가 — 모든 무대를 돌며 찾는다 (2026-10-02)
//
//   node tools/state-visible-test.mjs            # 1440 · 864 (check-all 이 돌린다)
//
// 사용자 — 「출 지 조 결 버튼 눌러도 색이 안 떠서 뭘 누른 상태인지 몰라」. 부품 한 벌을 센 선택자로 덮자
// 옛 상태 규칙이 져서 «켜진 것»과 «꺼진 것»이 똑같이 그려졌다. 그 꼴을 화면 전체에서 찾는다.
//
// 재는 법: 상태 클래스(on · sel · f · active · cur · now)가 붙은 요소마다, 같은 부모 아래 «같은 태그 · 상태만 뺀 같은 클래스»
//   형제를 찾아 겉모습(배경 · 글자색 · 테두리색 · 그림자 · 굵기 · 밑줄)을 견준다. 모두 같으면 «안 보이는 상태»다.

import { chromium } from 'playwright';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { 씨앗, 무대들 } from './shots-scenes.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PORT = 8816;
const 서버 = spawn(process.execPath, [path.join(HERE, 'serve.js'), String(PORT)], { stdio: 'ignore' });
const 상태 = ['on', 'sel', 'f', 'active', 'cur', 'now'];
const 강사무대 = Object.keys(무대들).filter(n => !/^학생/.test(n) && !/직보전체그림/.test(n));

const 브라우저 = await chromium.launch();
const 찾음 = new Map();
const 못잡음 = [];
try{
  for(const w of [1440, 864]){
    for(const n of 강사무대){
      const page = await 브라우저.newPage({ viewport: { width: w, height: 900 } });
      try{
        for(let i = 0; i < 40; i++){ try{ await page.goto(`http://127.0.0.1:${PORT}/index.html`); break; }catch{ await page.waitForTimeout(250); } }
        await page.waitForFunction(() => typeof render === 'function' && typeof DATA !== 'undefined');
        await page.evaluate(씨앗);
        await page.evaluate(무대들[n].세우기);
        await page.waitForTimeout(250);
        /* 눌러야 생기는 상태를 만든다 — 출결 칸(넷 다 다르게) · 거르개 알약 하나 */
        const 칸 = page.locator('.cls-tiles .tile');
        for(let t = 0; t < Math.min(4, await 칸.count()); t++) await 칸.nth(t).locator('.seg button').nth(t).click().catch(() => {});
        const 거르개 = page.locator('.rst-fbar a.pill:not(.on)');
        if(await 거르개.count() > 1) await 거르개.last().click().catch(() => {});
        /* 자기 검사 — 아무 규칙도 없는 상태 꼴 하나를 심어 «잡는지» 본다(못 잡으면 이 스캔이 거짓말을 한다) */
        await page.evaluate(() => { const d = document.createElement('div'); d.id = 'scan-self';
          d.innerHTML = '<span class="scan-x">a</span><span class="scan-x on">b</span>'; document.querySelector('#app .app').appendChild(d); });
        const 결과 = await page.evaluate((상태) => {
          const 겉 = e => { const c = getComputedStyle(e);
            return [c.backgroundColor, c.color, c.borderTopColor, c.borderBottomColor, c.boxShadow, c.fontWeight, c.textDecorationLine, c.outlineStyle].join('|'); };
          const out = [];
          document.querySelectorAll('#app *').forEach(e => {
            const cls = [...e.classList]; const s = cls.filter(c => 상태.includes(c));
            if(!s.length || !e.parentElement || !e.offsetParent) return;
            /* 견줄 형제 — 같은 태그 · 상태 클래스 없음 · 클래스가 이것의 «부분»(출결 칸은 고른 것만 `on ok`, 나머지는 클래스가 없다) */
            const 형제 = [...e.parentElement.children].find(x => x !== e && x.tagName === e.tagName && x.offsetParent
              && ![...x.classList].some(c => 상태.includes(c)) && [...x.classList].every(c => cls.includes(c)));
            if(!형제) return;
            if(겉(e) === 겉(형제)) out.push(e.tagName.toLowerCase() + '.' + cls.join('.') + ' — 「' + (e.textContent || '').trim().slice(0, 14) + '」');
          });
          return [...new Set(out)];
        }, 상태);
        const 자기 = 결과.filter(x => x.startsWith('span.scan-x'));
        if(!자기.length) 못잡음.push(n + '@' + w);
        결과.filter(x => !x.startsWith('span.scan-x')).forEach(x => { const k = x.replace(/ — .*/, ''); if(!찾음.has(k)) 찾음.set(k, []); 찾음.get(k).push(`${n}@${w} ${x.replace(/^.* — /, '')}`); });
      } catch(e){ console.log('  (건너뜀) ' + n + '@' + w + ' — ' + e.message.split('\n')[0]); }
      await page.close();
    }
  }
} finally { await 브라우저.close(); 서버.kill(); }

if(못잡음.length){ console.log('\n🔴 자기 검사 실패 — 심어 둔 안 보이는 상태를 못 잡았다: ' + 못잡음.join(', ')); process.exit(1); }
if(!찾음.size){ console.log('\n✓ 안 보이는 상태가 없다 — 무대 ' + 강사무대.length + '개 × 2폭 (자기 검사 통과 · 출결 칸·거르개 눌러 봄)'); process.exit(0); }
console.log('\n🔴 켜져도 꺼진 것과 똑같이 그려지는 것 ' + 찾음.size + '종');
for(const [k, v] of 찾음) console.log('  ' + k + '\n      ' + [...new Set(v)].slice(0, 4).join('\n      '));
process.exit(1);
