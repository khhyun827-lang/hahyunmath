// 영상 — 선생님이 «본 걸로» 처리 · 이 영상에서 학생 빼기 (2026-10-17)
//
//   node tools/video-override-test.mjs
//
// 사용자 — 「영상 미시청으로 기록된 학생 시청으로 선생님이 바꾸기 기능(안 봐도 되는 학생인데 영상이 들어간 경우) ·
//          특정 학생만 빼버리는 기능」
// 실제 크롬으로 연다. DB 는 안 건드린다 — dbSetDoc·dbGetDoc·logAudit 을 가로챈다.
// 🔴 붙드는 것: 본 시간(watchedSeconds)은 그대로 두고 manualDone 만 단다(되돌리면 원래 수) ·
//    뺀 학생은 드로어·반 평균·학생 화면·강사 요약 어디서도 안 센다.

import { chromium } from 'playwright';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { 씨앗, 무대들 } from './shots-scenes.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PORT = 8803;
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
  await page.waitForFunction(() => typeof render === 'function' && typeof videoMarkDone === 'function');
  await page.evaluate(씨앗);
  await page.evaluate(() => {
    window.__쓴것 = [];
    window.dbSetDoc = (col, id, d) => { __쓴것.push(col + '/' + id); return Promise.resolve(true); };
    window.logAudit = () => Promise.resolve();
    window.saveRecord = sid => { __쓴것.push('records/' + sid); return Promise.resolve(true); };   /* 씨앗 기록은 recordLoaded 에 안 걸려 진짜 문은 막는다 */
    window.showToast = () => {};
  });
  await page.evaluate(무대들.영상상세.세우기);

  console.log('\n«본 걸로» — s4(0%)');
  const 처리 = await page.evaluate(async () => {
    const 전 = state.allRecords.s4.videoProgress.v1.watchedSeconds;
    const 미시청전 = document.querySelectorAll('.vd-grp.no .vd-sv, .vd-grp .vd-sv').length;
    await videoMarkDone('v1', 's4');
    const p = state.allRecords.s4.videoProgress.v1;
    const 칸 = [...document.querySelectorAll('.vd-sv')].find(e => e.querySelector('.who b') && e.querySelector('.who b').textContent.includes(DATA.students[4].name));
    return { 쓴: __쓴것.slice(-1)[0], done: videoDone(p), pct: videoPct(p), 본시간그대로: p.watchedSeconds === 전, 표: !!(칸 && /선생님 처리/.test(칸.textContent)), 미시청전 };
  });
  봄('기록에 쓴다 · 완주로 친다 · 100%', [처리.쓴.startsWith('records/'), 처리.done, 처리.pct], [true, true, 100]);
  봄('🔴 본 시간은 손대지 않는다', 처리.본시간그대로, true);
  봄('드로어 줄에 «선생님 처리»', 처리.표, true);
  const 되돌림 = await page.evaluate(async () => { await videoMarkDone('v1', 's4', true); const p = state.allRecords.s4.videoProgress.v1; return [videoDone(p), !!p.manualDone]; });
  봄('되돌리면 원래대로(미시청)', 되돌림, [false, false]);

  console.log('\n«빼기» — s9(0%)');
  const 빼기 = await page.evaluate(async () => {
    const m = chubVideoModel('c1');
    const v = DATA.videos.find(x => x.id === 'v1');
    const 전수 = videoTakers(classRoster('c1'), v).length;
    await videoExclude('v1', 's9');
    const 후수 = videoTakers(classRoster('c1'), v).length;
    const 뺀칸 = [...document.querySelectorAll('.vd-grp .t-sec')].some(e => /이 영상에서 뺀 학생/.test(e.textContent));
    state.currentUser = { type: 'student', studentId: 's9', name: '학생' }; state.view = 'student';
    const 학생에게 = stuCtx().videos.some(x => x.id === 'v1');
    state.currentUser = { type: 'teacher', name: '김하현T' }; state.view = 'teacher';
    const 요약 = studentVideoSummary('s9', 'c1').details.some(d => d.video.id === 'v1');
    return { 문서: v.excludeIds, 전수, 후수, 뺀칸, 학생에게, 요약 };
  });
  봄('영상 문서에 excludeIds', 빼기.문서, ['s9']);
  봄('받는 사람에서 한 명 빠진다', 빼기.후수, 빼기.전수 - 1);
  봄('드로어에 «이 영상에서 뺀 학생»', 빼기.뺀칸, true);
  봄('🔴 학생 화면에도 · 강사 요약에도 없다', [빼기.학생에게, 빼기.요약], [false, false]);
  const 복귀 = await page.evaluate(async () => { await videoExclude('v1', 's9', true); return DATA.videos.find(x => x.id === 'v1').excludeIds; });
  봄('되돌리면 다시 받는다', 복귀, []);
} finally {
  await 브라우저.close();
  서버.kill();
}
console.log(`\n  ${fail ? '🔴' : '✅'} ${pass} 통과 · ${fail} 실패\n`);
process.exit(fail ? 1 : 0);
