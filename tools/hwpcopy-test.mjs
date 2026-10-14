// 한글로 복사 — AI 변형을 원본 조각 틀로 지어 넣기 (2026-10-15 · 2단계)
//
//   node tools/hwpcopy-test.mjs
//
// 사용자 — 「엔딩크레딧에 ai가 변형한 문제는 안되는거야?」
// 실제 크롬으로 연다. DB 는 안 건드린다 — dbGetDoc 을 가짜 원본(hwpclip-fake.mjs)으로, 클립보드 쓰기를 가로챈다.
// 보는 것: 변형 그림 SVG → PNG(캔버스, 3배) · 어느 코드를 «지을지»(원본만 hwpCodes 에 있는 변형) ·
//          «한글로 복사»가 원본은 한 번만 읽고, 변형을 지어 원본과 이어 클립보드 HTML 로 넣는다.

import { chromium } from 'playwright';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { 씨앗 } from './shots-scenes.mjs';
import { 가짜원본, 가짜변형 } from './hwpclip-fake.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PORT = 8797;
const 서버 = spawn(process.execPath, [path.join(HERE, 'serve.js'), String(PORT)], { stdio: 'ignore' });
let pass = 0, fail = 0;
const 봄 = (무엇, 나온것, 나와야) => {
  const ok = JSON.stringify(나온것) === JSON.stringify(나와야);
  if(ok){ pass++; console.log('  ✓ ' + 무엇); }
  else { fail++; console.log(`  ✗ ${무엇}\n      나온 것: ${JSON.stringify(나온것)}\n      나와야:  ${JSON.stringify(나와야)}`); }
};

const 브라우저 = await chromium.launch();
try{
  const page = await 브라우저.newPage();
  for(let i = 0; i < 40; i++){ try{ await page.goto(`http://127.0.0.1:${PORT}/index.html`); break; }catch{ await page.waitForTimeout(250); } }
  await page.waitForFunction(() => typeof render === 'function' && typeof hwpClipFromVariant === 'function');
  await page.evaluate(씨앗);

  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50" width="100" height="50"><rect x="10" y="10" width="30" height="20" fill="#000"/></svg>';
  const png = await page.evaluate(s => hwpClipSvgToPng(s).then(p => {
    const b = atob(p.b64), u = i => (b.charCodeAt(i) << 24 | b.charCodeAt(i + 1) << 16 | b.charCodeAt(i + 2) << 8 | b.charCodeAt(i + 3)) >>> 0;
    return { w: p.w, h: p.h, ext: p.ext, sig: b.slice(1, 4), pw: u(16), ph: u(20) };
  }), svg);
  봄('SVG → PNG — 원래 크기(w·h)와 3배로 그린 PNG', png, { w: 100, h: 50, ext: 'png', sig: 'PNG', pw: 300, ph: 150 });

  const 결과 = await page.evaluate(({ 원본, 변형, svg }) => {
    const root = 'K2-01-E-0999', code = root + '-N01';
    state.hwpCodes = new Set([root, 'K2-01-E-0998-N01']);
    state.variants = Object.assign({}, state.variants, {
      [root]: [Object.assign({}, 변형, { code, originCode: root, image: { kind: 'svg', svg } })],
      'K2-01-E-0998': [{ code: 'K2-01-E-0998-N01', originCode: 'K2-01-E-0998', content: '교재에 실린 변형' }],
    });
    const 가름 = [code, root, 'K2-01-E-0998-N01', 'K2-01-E-0997-N01'].map(c => !!hwpVariantToBuild(c));
    const 읽기 = [];
    window.dbGetDoc = (col, id) => { 읽기.push(col + '/' + id); return Promise.resolve(col === 'hwpclip' && id === root ? { j: 원본 } : null); };
    let 받음;
    const 끝 = new Promise(r => { 받음 = r; });
    navigator.clipboard.write = items => items[0].getType('text/html').then(b => b.text()).then(t => { 받음(t); });
    state.hwpPick = [code, root];
    hwpCopyPicked();
    return 끝.then(html => {
      const j = JSON.parse(html.match(/<!--\[data-hwpjson\]([\s\S]*?)-->/)[1]);
      const 글 = JSON.stringify(Object.assign({}, j.ro, j.sl));
      return { 가름, 읽기,
        새본문: 글.includes('새 본문'), 옛본문: 글.includes('옛 본문 아주 긴 글'),
        그림: j.bi.map(b => b.ty).sort(), 그림바이트: Object.keys(j.bidt).length };
    });
  }, { 원본: 가짜원본(), 변형: 가짜변형, svg });
  봄('지을 것만 고른다 — [원본만 창고에 있는 변형, 원본, 교재에 실린 변형(제 원본 있음), 원본 없는 변형]', 결과.가름, [true, false, false, false]);
  봄('같은 원본 조각은 한 번만 읽는다', 결과.읽기, ['hwpclip/K2-01-E-0999']);
  봄('변형(새 본문)과 원본(옛 본문)이 한 조각에 이어졌다', [결과.새본문, 결과.옛본문], [true, true]);
  /* 원본: jpg(본문)+png(해설) · 변형: SVG 에서 뽑은 png(본문 자리) — 변형의 옛 해설 그림은 걷혔다 */
  봄('그림 — 원본 둘 + 변형의 새 PNG 하나', [결과.그림, 결과.그림바이트], [['image/jpg', 'image/png', 'image/png'], 3]);
} finally {
  await 브라우저.close();
  서버.kill();
}
console.log(fail ? `\n🔴 ${fail}개 틀림 (맞음 ${pass})` : `\n🟢 모두 맞음 (${pass})`);
process.exit(fail ? 1 : 0);
