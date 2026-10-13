// 화면 안 파일 보기 — 잠근 파일을 워커(/file)로 받아 PDF.js 로 그리고, 학생에게는 이름·로고 워터마크 (2026-10-13 · 보안 2·3단계)
//
//   node tools/docv-test.mjs
//
// 사용자 — 「시험분석탭뿐만이 아니라 학생들이 보는 자료탭도 브라우저 안의 PDF 보기로 · 다운받아서 보는 구조 말고」
//          「이름 워터마크랑 김하현수학연구소 로고 워터마크」.
// 실제 크롬으로 연다. 워커 /file 은 가로채서 이 검사가 지은 두 쪽짜리 PDF 를 돌려준다(실 드라이브·DB 안 건드린다).
// ⚠ PDF.js 는 jsdelivr 에서 받는다 — 망이 없으면 이 검사가 빨갛다.

import { chromium } from 'playwright';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { 씨앗 } from './shots-scenes.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(HERE, '..', 'index.html'), 'utf8').replace(/\r\n/g, '\n');
const PORT = 8796;
const 서버 = spawn(process.execPath, [path.join(HERE, 'serve.js'), String(PORT)], { stdio: 'ignore' });
let pass = 0, fail = 0;
const 봄 = (무엇, 나온것, 나와야) => {
  const ok = JSON.stringify(나온것) === JSON.stringify(나와야);
  if(ok){ pass++; console.log('  ✓ ' + 무엇); }
  else { fail++; console.log(`  ✗ ${무엇}\n      나온 것: ${JSON.stringify(나온것)}\n      나와야:  ${JSON.stringify(나와야)}`); }
};

/* 두 쪽짜리 PDF — 자리(xref)를 바르게 센다 */
function 작은PDF() {
  const 물건 = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R 5 0 R] /Count 2 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 7 0 R >> >> >>',
    null,
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 6 0 R /Resources << /Font << /F1 7 0 R >> >> >>',
    null,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  const 쪽글 = t => { const s = `BT /F1 40 Tf 80 700 Td (${t}) Tj ET`; return `<< /Length ${s.length} >>\nstream\n${s}\nendstream`; };
  물건[3] = 쪽글('PAGE ONE'); 물건[5] = 쪽글('PAGE TWO');
  let 글 = '%PDF-1.4\n';
  const 자리 = [];
  물건.forEach((o, i) => { 자리.push(글.length); 글 += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = 글.length;
  글 += `xref\n0 ${물건.length + 1}\n0000000000 65535 f \n` + 자리.map(n => String(n).padStart(10, '0') + ' 00000 n \n').join('');
  글 += `trailer\n<< /Size ${물건.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(글, 'latin1');
}

const 브라우저 = await chromium.launch();
try{
  const page = await 브라우저.newPage({ viewport: { width: Number(process.env.DOCV_W) || 1280, height: 860 } });
  const 부름 = [];
  await page.route(/\/file$/, async route => {
    부름.push(JSON.parse(route.request().postData() || '{}'));
    await route.fulfill({ status: 200, contentType: 'application/pdf', body: 작은PDF(), headers: { 'Access-Control-Allow-Origin': '*' } });
  });
  for(let i = 0; i < 40; i++){ try{ await page.goto(`http://127.0.0.1:${PORT}/index.html`); break; }catch{ await page.waitForTimeout(250); } }
  await page.waitForFunction(() => typeof render === 'function' && typeof DATA !== 'undefined');
  await page.evaluate(씨앗);
  await page.evaluate(() => { window.getAuthToken = async () => 'TOKEN'; });
  const 캔버스다그림 = () => page.waitForFunction(() => { const c = [...document.querySelectorAll('.docv-wrap canvas, .docv-slot canvas')];
    return c.length === 2 && c.every(x => x.dataset.done === '1' && x.width > 100); }, null, { timeout: 30000 });
  /* 캔버스 픽셀의 «어두운 정도» — 워터마크가 찍히면 빈 종이가 조금 어두워진다 */
  const 잉크 = () => page.evaluate(() => { const cv = document.querySelector('.docv-wrap canvas, .docv-slot canvas');
    const d = cv.getContext('2d').getImageData(0, Math.round(cv.height * 0.3), cv.width, Math.round(cv.height * 0.4)).data;
    let 합 = 0; for(let i = 0; i < d.length; i += 4) 합 += 255 - d[i]; return Math.round(합 / (d.length / 4) * 100) / 100; });

  /* ── ① 학생 — 자료 탭 카드를 누르면 앱 안에서 · 이름 워터마크 · 내려받기 없음 ── */
  console.log('\n① 학생 › 자료\n');
  await page.evaluate(() => {
    const s = DATA.students[0];
    DATA.students = [s];
    state.currentUser = { type: 'student', studentId: s.studentId, name: s.name };
    state.view = 'student';
    state.materials[s.classId] = [{ id: 'mt1', title: '3단원 프린트', name: '3단원.pdf', size: 1000, mime: 'application/pdf', fileId: 'FILE_MAT_00001', at: '2026-10-13' }];
    window.__반 = s.classId; window.__이름 = s.name;
  });
  봄('자료 카드는 드라이브 링크가 아니라 화면 안 보기를 부른다', await page.evaluate(() => { const h = stuMaterialHTML({ classId: __반 });
    return [/docvOpenMaterial\(/.test(h), /drive\.google/.test(h), /href=/.test(h)]; }), [true, false, false]);
  await page.evaluate(() => docvOpenMaterial(__반, 'mt1'));
  await 캔버스다그림();
  봄('🔴 워커 /file 에 «자료 · 그 반 · 그 파일»로 묻는다', 부름[0], { fileId: 'FILE_MAT_00001', scope: 'material', classId: await page.evaluate(() => __반) });
  봄('두 쪽이 캔버스로 그려진다', await page.$$eval('.docv-wrap canvas', c => c.length), 2);
  봄('🔴 학생에게는 내려받기 단추가 없다', await page.$$eval('.docv-wrap .docv-dl', b => b.length), 0);
  const 학생잉크 = await 잉크();
  if(process.env.DOCV_SHOT) await page.screenshot({ path: process.env.DOCV_SHOT });
  await page.keyboard.press('Escape');
  봄('Esc 로 닫힌다', await page.$$eval('.docv-wrap', w => w.length), 0);

  /* ── ② 강사 — 같은 파일 · 워터마크 없음 · 내려받기 있음 ── */
  console.log('\n② 강사 › 자료 (같은 파일)\n');
  await page.evaluate(() => { state.view = 'teacher'; docvOpenMaterial(__반, 'mt1'); });
  await 캔버스다그림();
  const 강사잉크 = await 잉크();
  봄('🔴 학생 화면에만 워터마크가 찍힌다 (같은 쪽인데 학생 쪽 종이가 더 어둡다)', 학생잉크 > 강사잉크 + 1, true);
  봄('강사에게는 내려받기 단추', await page.$$eval('.docv-wrap .docv-dl', b => b.length), 1);
  봄('   한 번 받은 파일은 다시 안 묻는다(이 탭 동안)', 부름.length, 1);
  await page.evaluate(() => docvClose());

  /* ── ③ 시험 분석 탭 — 칸 안에 붙고, 다시 그려도 그대로 ── */
  console.log('\n③ 강사 › 학교 › 시험 분석\n');
  await page.evaluate(() => {
    state.schoolFiles = { 광남고: { 고1: [{ name: '분석.pdf', fileId: 'FILE_ANA_00001', season: '2026 · 2학기 중간', kind: 'analysis', at: '2026-10-13' }] } };
    goTeacherTab('examanalysis');
  });
  await 캔버스다그림();
  봄('칸 안에 보기 창이 선다 (드라이브 iframe 없음)', await page.evaluate(() => [!!document.querySelector('#app .docv-slot .docv'), !!document.querySelector('iframe[src*="drive.google"]')]), [true, false]);
  봄('   학교 파일로 묻는다', 부름[부름.length - 1], { fileId: 'FILE_ANA_00001', scope: 'school', classId: '' });
  await page.evaluate(() => { document.querySelector('.docv-slot canvas').dataset.표 = '그대로'; render(); render(); });
  봄('🔴 render() 를 두 번 해도 같은 캔버스(다시 받지도·그리지도 않는다)', await page.evaluate(() => (document.querySelector('.docv-slot canvas') || {}).dataset.표), '그대로');
  await page.evaluate(() => goTeacherTab('examrange'));
  봄('   다른 갈래로 가면 보기 창을 거둔다', await page.evaluate(() => [!!document.querySelector('.docv'), state.docvInlineReq]), [false, null]);
} finally {
  await 브라우저.close(); 서버.kill();
}

console.log('\n④ 올리기 — 강의자료·학교 파일은 잠가서\n');
{
  const at = html.indexOf('async function uploadFileToDrive(');
  봄('🔴 uploadFileToDrive 가 private=1 을 보낸다', /fd\.append\('private', '1'\)/.test(html.slice(at, at + 900)), true);
  봄('   그 문을 쓰는 것은 강의자료·학교 파일 둘뿐', (html.match(/await uploadFileToDrive\(/g) || []).length, 2);
  봄('   드라이브 주소로 여는 곳이 안 남았다(자료·학교 파일)', [/function materialLink\(/.test(html), /function schoolFileDownload\(/.test(html)], [false, false]);
}
console.log(`\n${pass} 통과 · ${fail} 실패`);
process.exit(fail ? 1 : 0);
