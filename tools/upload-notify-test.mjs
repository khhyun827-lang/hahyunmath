// 올릴 때 알림톡 — 영상 · 공지 · 자료 (2026-10-17)
//
//   node tools/upload-notify-test.mjs
//
// 사용자 — 「영상이나 공지나 자료 업로드 시에도 알림톡 · 영상은 기존 영상 알림톡 그대로」
// 실제 크롬으로 연다. 돈이 나가는 길이라 워커는 부르지 않는다 — notifyPost·confirm 을 가로챈다.
// 🔴 붙드는 것: 영상은 강의 템플릿(vid) 변수 그대로 · 공지·자료는 워커가 «켜졌다»고 할 때만 체크 칸 ·
//    받는 사람 = 고른 반(비면 전체 재원) · 50명씩 나눠 보낸다 · 체크를 끄면 안 보낸다.

import { chromium } from 'playwright';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { 씨앗 } from './shots-scenes.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PORT = 8807;
const 서버 = spawn(process.execPath, [path.join(HERE, 'serve.js'), String(PORT)], { stdio: 'ignore' });
let pass = 0, fail = 0;
const 봄 = (무엇, 나온것, 나와야) => {
  const ok = JSON.stringify(나온것) === JSON.stringify(나와야);
  if(ok){ pass++; console.log('  ✓ ' + 무엇); }
  else { fail++; console.log(`  ✗ ${무엇}\n      나온 것: ${JSON.stringify(나온것)}\n      나와야:  ${JSON.stringify(나와야)}`); }
};

const 브라우저 = await chromium.launch();
try{
  const page = await 브라우저.newPage({ viewport: { width: 1440, height: 900 } });
  for(let i = 0; i < 40; i++){ try{ await page.goto(`http://127.0.0.1:${PORT}/index.html`); break; }catch{ await page.waitForTimeout(250); } }
  await page.waitForFunction(() => typeof render === 'function' && typeof notifyUpload === 'function');
  await page.evaluate(씨앗);
  await page.evaluate(() => {
    window.__보냄 = []; window.notifyPost = (kind, id, items) => { __보냄.push({ kind, id, n: items.length, v: items[0].vars, m: items[0].message });
      return Promise.resolve({ sent: items.length, results: items.map(() => ({ ok: true })) }); };
    window.confirm = () => true; window.showToast = m => { window.__말 = m; };
    window.dbSetDoc = () => Promise.resolve(true); window.logAudit = () => Promise.resolve();
    state.currentUser = { type: 'teacher', name: '김하현T' };
  });

  console.log('\n체크 칸 — 워커가 켜졌다고 할 때만');
  const 칸 = await page.evaluate(() => {
    state.workerVersion = '2026-10-17b'; state.notifyTpl = { vid: true, notice: false, mat: true };
    const a = [notifyBoxHTML('vid', 'x'), notifyBoxHTML('notice', 'x'), notifyBoxHTML('mat', 'x')].map(h => /type="checkbox"/.test(h));
    state.notifyTpl = null; state.workerVersion = '2026-10-13a';   // 옛 워커 — 영상만
    const b = [notifyBoxHTML('vid', 'x'), notifyBoxHTML('notice', 'x')].map(h => /type="checkbox"/.test(h));
    return { a, b, 심사중: /심사/.test((state.notifyTpl = { notice: false }, notifyBoxHTML('notice', 'x'))) };
  });
  봄('켜진 종류만 체크 칸(영상·자료 O · 공지 X)', 칸.a, [true, false, true]);
  봄('옛 워커면 영상만(비밀이 이미 있다)', 칸.b, [true, false]);
  봄('아직이면 «심사가 끝나면» 안내', 칸.심사중, true);

  console.log('\n받는 사람 · 문안');
  const r = await page.evaluate(async () => {
    state.notifyTpl = { vid: true, notice: true, mat: true };
    const 전체 = uploadAudience([]).length, 반 = uploadAudience(['c1']).length;
    await notifyUpload('vid', { id: 'v9', title: '수학(상) 5강', dueDate: '2026-10-20' }, uploadAudience(['c1']), '새 영상');
    await notifyUpload('notice', { id: 77, title: '시험 대비 특강 안내' }, uploadAudience([]), '새 공지');
    const 많이 = Array.from({ length: 120 }, (_, i) => ({ studentId: 's' + (i % 10), name: '학생' + i }));
    __보냄.length = 0;
    await notifyUpload('mat', { id: 'mt1', title: '중간 대비 프린트' }, 많이, '새 자료');
    return { 전체, 반, 보냄: __보냄.map(x => x.n) };
  });
  봄('반을 안 고르면 전체 재원 · 고르면 그 반', [r.전체 > 0, r.반 > 0, r.반 <= r.전체], [true, true, true]);
  봄('🔴 50명씩 나눠 보낸다(워커 한 번 상한)', r.보냄, [50, 50, 20]);
  const 문안 = await page.evaluate(async () => {
    __보냄.length = 0;
    await notifyUpload('vid', { id: 'v9', title: '수학(상) 5강', dueDate: '2026-10-20' }, [DATA.students[0]], '새 영상');
    await notifyUpload('notice', { id: 77, title: '시험 대비 특강 안내' }, [DATA.students[0]], '새 공지');
    return __보냄.map(x => ({ kind: x.kind, id: x.id, 키: Object.keys(x.v), 첫줄: x.m.split('\n')[1] }));
  });
  봄('영상은 강의 템플릿 변수 그대로', 문안[0].키, ['#{학생명}', '#{강의명}', '#{마감일}', '#{남은기간}']);
  봄('공지는 학생명·공지제목 · id 는 글자로', [문안[1].kind, 문안[1].id, 문안[1].키], ['notice', '77', ['#{학생명}', '#{공지제목}']]);
  봄('문안 둘째 줄(이름 뒤)', 문안.map(x => x.첫줄.replace(/^.*? 학생, /, '')), ['아직 보지 않은 강의가 있습니다.', '새 공지가 올라왔습니다.']);
} finally {
  await 브라우저.close();
  서버.kill();
}
console.log(`\n  ${fail ? '🔴' : '✅'} ${pass} 통과 · ${fail} 실패\n`);
process.exit(fail ? 1 : 0);
