// 학생 화면 — 지난 시즌 과제·영상은 안 보이고 새것이 위 (2026-10-17)
//
//   node tools/stu-season-test.mjs
//
// 사용자 — 「학생페이지에 과제나 영상이 계속 쌓이기만 하는데 시즌이 끝난 것들은 지워지게」 · 「최신이 위에 쌓이도록」
// 실제 크롬으로 연다. DB 는 안 건드린다(씨앗 데이터).
// 🔴 붙드는 것: 시즌 끝 = 이 학교·학년의 «끝난» 시험 가운데 가장 늦은 날 · 마감이 새 시즌까지 걸치면 남긴다 ·
//    시청률·벨의 «본 수»는 전체로 센다(강사 화면과 같은 수 · 숨긴 뒤에도 새 과제 벨이 울린다).

import { chromium } from 'playwright';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { 씨앗 } from './shots-scenes.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PORT = 8801;
const 서버 = spawn(process.execPath, [path.join(HERE, 'serve.js'), String(PORT)], { stdio: 'ignore' });
let pass = 0, fail = 0;
const 봄 = (무엇, 나온것, 나와야) => {
  const ok = JSON.stringify(나온것) === JSON.stringify(나와야);
  if(ok){ pass++; console.log('  ✓ ' + 무엇); }
  else { fail++; console.log(`  ✗ ${무엇}\n      나온 것: ${JSON.stringify(나온것)}\n      나와야:  ${JSON.stringify(나와야)}`); }
};

const 브라우저 = await chromium.launch();
try{
  const page = await 브라우저.newPage({ viewport: { width: 390, height: 844 } });
  for(let i = 0; i < 40; i++){ try{ await page.goto(`http://127.0.0.1:${PORT}/index.html`); break; }catch{ await page.waitForTimeout(250); } }
  await page.waitForFunction(() => typeof render === 'function' && typeof stuSeasonCut === 'function');
  await page.evaluate(씨앗);

  console.log('\n시즌 끝 — 학교·학년의 시험 일정에서');
  const 끝 = await page.evaluate(() => {
    state.examRanges = { migrated: true, years: { '2026': { '광남고': { '1': { '2-mid': { start: '2026-09-29', end: '2026-10-02', math: '2026-10-01' } } } } } };
    return [stuSeasonCut('광남고', '1', '2026-10-17'), stuSeasonCut('광남고', '1', '2026-09-30'),
            stuSeasonCut('없는고', '1', '2026-10-17'), stuSeasonCut('없는고', '1', '2026-03-05')];
  });
  봄('수학 시험일이 끝 · 시험 전이면 1학기 기말(기본 07-31) · 날짜 없는 학교는 기본 날 · 3월 초엔 작년 2학기 기말',
    끝, ['2026-10-01', '2026-07-31', '2026-07-31', '2025-12-31']);

  console.log('\n학생 화면의 목록');
  const r = await page.evaluate(() => {
    const 날 = k => shiftYmd(todayStr(), k);
    window.stuSeasonCut = () => 날(-5);
    DATA.assignments = [
      { id: 'h-old', classId: 'c1', title: '지난 시즌 과제', createdAt: 날(-20), dueDate: 날(-15) },
      { id: 'h-cross', classId: 'c1', title: '시즌 걸친 과제', createdAt: 날(-20), dueDate: 날(3) },
      { id: 'h-new1', classId: 'c1', title: '새 과제 1', createdAt: 날(-3) },
      { id: 'h-new2', classId: 'c1', title: '새 과제 2', createdAt: 날(-1) },
    ];
    DATA.videos = [
      { id: 'v-old', classId: 'c1', title: '지난 영상', createdAt: 날(-30), url: 'https://youtu.be/dQw4w9WgXcQ' },
      { id: 'v-a', classId: 'c1', title: '영상 A', createdAt: 날(-4), url: 'https://youtu.be/dQw4w9WgXcQ' },
      { id: 'v-b', classId: 'c1', title: '영상 B', createdAt: 날(-2), url: 'https://youtu.be/dQw4w9WgXcQ' },
    ];
    state.currentUser = { type: 'student', studentId: 's1', name: '학생' }; state.view = 'student';
    const c = stuCtx();
    state.studentTab = 'video'; render();
    const 영상차례 = [...document.querySelectorAll('.sap .mc .row span:first-child')].map(e => e.textContent.trim()).filter(t => /영상/.test(t));
    const 본수 = localStorage.getItem('khm-video-seen');
    state.studentTab = 'progress'; render();
    return { 과제: c.homework.map(a => a.id), 영상: c.videos.map(v => v.id), 전체: [c.homeworkAll.length, c.videosAll.length],
      영상차례, 본수, 과제본수: localStorage.getItem('khm-homework-seen') };
  });
  봄('지난 시즌 과제는 빠지고 · 마감이 걸친 것은 남는다 · 새것이 위', r.과제, ['h-new2', 'h-new1', 'h-cross']);
  봄('영상도 지난 것은 빠지고 새것이 위', r.영상, ['v-b', 'v-a']);
  봄('화면 차례도 새것이 위', r.영상차례, ['영상 B', '영상 A']);
  봄('전체 목록은 그대로 남아 있다(시청률·벨용)', r.전체, [4, 3]);
  봄('🔴 «본 수»는 전체로 — 숨겨도 새 과제·영상 벨이 맞게 울린다', [r.본수, r.과제본수], ['3', '4']);
} finally {
  await 브라우저.close();
  서버.kill();
}
console.log(`\n  ${fail ? '🔴' : '✅'} ${pass} 통과 · ${fail} 실패\n`);
process.exit(fail ? 1 : 0);
