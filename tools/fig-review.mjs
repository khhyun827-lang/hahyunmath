// 변형 그림 재검토 — 카드로 찍고 Claude 가 보고 «이상한 것»만 골라낸다 (2026-10-25 · 사용자 —
//   「어제 검토해서 나갔던 그림들도 이상한 게 많음 · 변형문제 그림검토 다시 쭉 해야 할 듯」 → 「AI 가 이상한 것만 먼저」).
//
//   node tools/fig-review.mjs <덤프.json> <폴더> [코드,코드…]     ← 카드만 찍는다(폴더/cards/*.png)
//   node tools/fig-review.mjs <덤프.json> <폴더> --judge          ← 찍고 Claude 로 판정 → 폴더/verdicts.json
//
// 카드 = [원본 문제 + 원본 그림 | 변형 문제 + 변형 그림]. 정답·해설은 안 넣는다(판정에 필요 없고, 보고서가 밖으로 나갈 수 있다).
// ⚠ 덤프·카드에는 문항 본문이 있다 — 폴더는 %TEMP% 에, 저장소에 두지 말 것.
import fs from 'fs';
import path from 'path';
import { spawn, spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const [덤프, 폴더, 셋째] = process.argv.slice(2);
const 판정 = process.argv.includes('--judge');
const d = JSON.parse(fs.readFileSync(덤프, 'utf8'));
const 고른 = 셋째 && !셋째.startsWith('--') ? new Set(셋째.split(',')) : null;
const 대상 = Object.entries(d.variants).filter(([k, v]) => v.image && v.image.svg && (!고른 || 고른.has(k)));
fs.mkdirSync(path.join(폴더, 'cards'), { recursive: true });

const 원본그림 = o => (o && o.image && o.image.url) || ((String(o && o.content || '').match(/⟦그림:(https?:[^⟧]*)⟧/) || [])[1]) || '';
const 카드들 = 대상.map(([k, v]) => {
  const o = d.items[v.originCode] || d.variants[v.originCode] || null;
  return { k, 원본: o ? o.content : '(원본 없음)', 원본그림: 원본그림(o), 변형: v.content, svg: v.image.svg,
           상태: v.approvedAt ? '통과 ' + String(v.approvedAt).slice(0, 10) : '검토 대기' };
});

const PORT = 8809;
const 서버 = spawn(process.execPath, [path.join(HERE, 'serve.js'), String(PORT)], { stdio: 'ignore' });
const 브 = await chromium.launch();
try {
  const page = await 브.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
  for (let i = 0; i < 40; i++) { try { await page.goto(`http://127.0.0.1:${PORT}/index.html`); break; } catch { await page.waitForTimeout(250); } }
  await page.waitForFunction(() => typeof problemHTML === 'function' && window.renderMathInElement);
  for (const c of 카드들) {
    await page.evaluate(c => {
      /* KaTeX 스타일은 원래 <body> 안에 있다 — 본문을 갈면 같이 지워져 수식이 두 번 찍힌다. 머리에 다시 단다. */
      if (!document.getElementById('kx-css')) {
        const l = document.createElement('link'); l.id = 'kx-css'; l.rel = 'stylesheet';
        l.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css'; document.head.appendChild(l);
      }
      const 칸 = (제목, 글, 그림) => `<div style="flex:1;min-width:0;padding:14px;border:1px solid #ccc;border-radius:8px">
        <div style="font-weight:700;color:#06c;margin-bottom:6px">${제목}</div><div class="pb">${problemHTML(String(글).replace(/^\s+/, ''))}</div>
        <div style="margin-top:10px;text-align:center">${그림}</div></div>`;
      document.body.innerHTML = `<div id="card" style="width:1240px;padding:12px;background:#fff;color:#111;font:15px/1.7 'Malgun Gothic',sans-serif">
        <div style="font-weight:700;margin-bottom:8px">${c.k} · ${c.상태}</div>
        <div style="display:flex;gap:12px;align-items:flex-start">
          ${칸('원본', c.원본, c.원본그림 ? `<img src="${c.원본그림.replace('sz=w2000', 'sz=w800')}" style="max-width:100%;max-height:340px">` : '<i>(원본 그림 없음)</i>')}
          ${칸('변형', c.변형, `<div style="display:inline-block;max-width:100%">${c.svg.replace(/<svg /, '<svg style="max-width:100%;height:auto;max-height:340px" ')}</div>`)}
        </div></div>`;
      renderMathInElement(document.getElementById('card'), { delimiters: [{ left: '$', right: '$', display: false }], throwOnError: false });
    }, c);
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(300);
    await page.locator('#card').screenshot({ path: path.join(폴더, 'cards', c.k + '.png') });
  }
} finally { await 브.close(); 서버.kill(); }
console.log('카드', 카드들.length, '장 →', path.join(폴더, 'cards'));
fs.writeFileSync(path.join(폴더, 'cards.json'), JSON.stringify(카드들.map(({ k, 상태 }) => ({ k, 상태 }))));

if (판정) {
  /* Claude(claude -p · 구독)에게 카드를 다섯 장씩 보인다. 읽기(Read)만 허락한다.
     ⚠ 모델은 Sonnet (10-25 · 사용자 — Opus 로 62장을 보니 5시간 한도가 몇 분 만에 크게 줄었다). 같은 일 되풀이는 가벼운 모델로. */
  const 부탁 = 장들 => `수학 문제 «변형»의 그림을 검토한다. 아래 카드 이미지 ${장들.length}장을 Read 로 열어 본다. 카드마다 왼쪽은 원본 문제와 그림, 오른쪽은 변형 문제와 변형 그림이다.
변형 그림이 «변형 문제»와 맞는지 본다. 문제가 있으면 suspect:
- 문제에 나온 점 이름·좌표·길이·각·곡선·식이 그림과 다르다(위치가 틀림, 이름이 빠지거나 다름, 원본 숫자가 그대로 남음)
- 원본에만 있던 요소가 남았거나, 문제에 필요한 요소가 빠졌다
- 그림이 정답(구해야 할 값)을 직접 보여 준다
- 글자·점·선이 겹치거나 잘려 읽기 어렵다, 그림이 비었거나 깨졌다
원본과 모양이 달라도 변형 문제와 맞으면 ok 다. 확실하지 않으면 suspect 로 두고 까닭을 적는다.
JSON 배열 하나로만 답하라: [{"code": "카드 제목의 코드", "verdict": "ok" 또는 "suspect", "issues": "suspect 면 무엇이 문제인지 한두 문장(한국어)"}]
카드: ${장들.map(k => path.join(폴더, 'cards', k + '.png')).join(' , ')}`;
  /* 이어 하기 — 이미 판정한 것(ok·suspect)은 두고 실패·안 한 것만 (10-25 · 47장이 한때 실패) */
  const 옛 = fs.existsSync(path.join(폴더, 'verdicts.json')) ? JSON.parse(fs.readFileSync(path.join(폴더, 'verdicts.json'), 'utf8')) : [];
  const 결과 = 옛.filter(x => x.verdict === 'ok' || x.verdict === 'suspect');
  const 한것 = new Set(결과.map(x => x.code));
  const ks = 카드들.map(c => c.k).filter(k => !한것.has(k));
  for (let i = 0; i < ks.length; i += 5) {
    const 장들 = ks.slice(i, i + 5);
    const r = spawnSync('claude', ['-p', '--model', 'sonnet', '--output-format', 'json', '--allowedTools', 'Read', '--add-dir', 폴더, '--no-session-persistence'],
      { input: 부탁(장들), encoding: 'utf8', shell: true, maxBuffer: 1 << 26, timeout: 900000 });
    try {
      const t = JSON.parse(r.stdout).result;
      결과.push(...JSON.parse(t.match(/\[[\s\S]*\]/)[0]));
    } catch (e) {
      let 답 = ''; try { 답 = JSON.parse(r.stdout).result; } catch (_) { 답 = r.stdout || r.stderr || String(e); }
      장들.forEach(k => 결과.push({ code: k, verdict: 'error', issues: '판정 실패: ' + String(답).slice(0, 160) }));
    }
    process.stdout.write(`\r  판정 ${Math.min(i + 5, ks.length)} / ${ks.length}`);
    fs.writeFileSync(path.join(폴더, 'verdicts.json'), JSON.stringify(결과, null, 1));
  }
  console.log('\n  suspect', 결과.filter(x => x.verdict === 'suspect').length, '/ ok', 결과.filter(x => x.verdict === 'ok').length, '/ 실패', 결과.filter(x => x.verdict === 'error').length);
}
