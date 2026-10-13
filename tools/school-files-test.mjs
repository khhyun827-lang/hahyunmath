// 학교 프린트 — 시험 범위 화면에서 학교·학년마다 PDF 를 올려 두고, 해가 바뀌어도 찾아볼 수 있다 (2026-09-22)
//
//   node tools/school-files-test.mjs
//
// 사용자 — 「학교별 부교재는 시험일정에 메모 있으니까 기록하면 되는데 학교 프린트를 pdf로 올려둘 수 있었으면 좋겠어. (해가 바꼈을때 찾아볼 수 있도록)」
// ⚠ 보는 것 — ① 올리면 드라이브로 가고 kv/school-files 에 이름·크기·fileId·시즌만 남는다 ② 지우면 드라이브도 지운다
//   ③ 시즌 넘기기(archiveCurrentSeason)가 이 문서를 건드리지 않는다 ④ 학생 로그인은 이 문서를 안 읽는다(읽기 한 건 아낀다)

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/\r\n/g, '\n');
const NL = String.fromCharCode(10);

let 통과 = 0, 틀림 = 0;
const 봄 = (무엇, 잰것, 바란것) => {
  const 같다 = JSON.stringify(잰것) === JSON.stringify(바란것);
  같다 ? 통과++ : 틀림++;
  console.log((같다 ? '  ✓ ' : '  ✗ ') + 무엇 + (같다 ? '' : NL + '      나온 것: ' + JSON.stringify(잰것) + NL + '      나와야:  ' + JSON.stringify(바란것)));
};
function lift(name) {
  const at = html.search(new RegExp('^(async )?function ' + name + '\\(', 'm'));
  if (at < 0) throw new Error(name + ' 를 못 찾았습니다');
  let d = 0;
  for (let j = html.indexOf('{', at); j < html.length; j++) {
    if (html[j] === '{') d++;
    else if (html[j] === '}') { d--; if (!d) return html.slice(at, j + 1); }
  }
}

console.log('학교 프린트 —' + NL);
{
  const 저장 = [], 지움 = [], 말 = [];
  const state = { schoolFiles: null, schoolFilesLoading: false, schoolFileBusy: '' };
  const F = new Function('state', 'dbGet', 'dbSet', 'uploadFileToDrive', 'deleteFromDrive', 'showToast', 'render', 'todayStr', 'currentSeason', 'examSeasonOf', 'SLOT_NAME',
    'fileSizeLabel', 'MATERIAL_MAX_BYTES', 'confirm', 'jsAttr', 'escHtml', 'materialLink', 'SCHOOL_FILE_KINDS', 'SLOT_OF_NAME', 'schoolYearOf',
    [lift('schoolFileSlotOf'), lift('loadSchoolFilesIfNeeded'), lift('schoolFilesOf'), lift('schoolFileSeasonLabel'), lift('addSchoolFile'), lift('removeSchoolFile'), lift('schoolFilesHTML')].join(NL)
    + NL + 'return { schoolFileSlotOf, loadSchoolFilesIfNeeded, schoolFilesOf, addSchoolFile, removeSchoolFile, schoolFilesHTML };')(
    state, async () => ({ 광남고: { '고1': [{ name: '옛것.pdf', fileId: 'F0', size: 1000, at: '2025-10-01', season: '2025 · 2학기 중간' }] } }),
    async (k, v) => { 저장.push([k, JSON.parse(JSON.stringify(v))]); return true; },
    async (file) => ({ fileId: 'F1', url: 'https://drive/thumb' }), (id) => 지움.push(id), m => 말.push(m), () => {},
    () => '2026-09-22', () => '2학기 중간', () => ({ next: { year: '2026', slot: '2-mid' } }), { '2-mid': '2학기 중간' }, n => n + 'B', 15 * 1024 * 1024, () => true, s => s, s => s, f => 'https://drive.google.com/file/d/' + f.fileId + '/view',
    { print: '프린트', paper: '시험지 원본', analysis: '분석자료' }, { '1학기 중간': '1-mid', '2학기 중간': '2-mid' }, d => String(d).slice(0, 4));

  await F.loadSchoolFilesIfNeeded();
  봄('① 지난해 것이 그대로 보인다 — 「해가 바뀌었을 때 찾아볼 수 있도록」', F.schoolFilesOf('광남고', '고1').map(f => f.season), ['2025 · 2학기 중간']);
  await F.addSchoolFile('광남고', '고1', { files: [{ name: '중간 프린트.pdf', type: 'application/pdf', size: 2048 }], value: '' });
  const 문서 = 저장[0][1];
  봄('🔴 올리면 kv/school-files 에 이름·크기·fileId·시즌만 남는다 (내용은 드라이브)',
    [저장[0][0], 문서.광남고.고1.length, Object.keys(문서.광남고.고1[1]).sort()], ['school-files', 2, ['at', 'fileId', 'mime', 'name', 'season', 'size', 'url']]);
  봄('   시즌은 올린 날의 것 — 「연도 · 시즌」', 문서.광남고.고1[1].season, '2026 · 2학기 중간');
  봄('   올렸다고 말한다', 말, ['「중간 프린트.pdf」을 올렸습니다.']);
  const 그림 = F.schoolFilesHTML('광남고', '고1');
  봄('   판에 두 파일이 서고 누르면 «화면 안에서» 연다(10-13 · 잠근 파일 — 드라이브 주소 없음) · 올리는 단추는 PDF·사진만', [(그림.match(/docvOpenSchool\('F[01]'\)/g) || []).length - (/drive\.google/.test(그림) ? 9 : 0), /accept="application\/pdf,image\/\*"/.test(그림)], [2, true]);
  await F.removeSchoolFile('광남고', '고1', 0);
  봄('② 지우면 목록에서 빠지고 드라이브도 지운다', [F.schoolFilesOf('광남고', '고1').map(f => f.name), 지움], [['중간 프린트.pdf'], ['F0']]);
  await F.addSchoolFile('광남고', '고1', { files: [{ name: '큰것.pdf', type: 'application/pdf', size: 20 * 1024 * 1024 }], value: '' });
  봄('   상한을 넘는 파일은 올리기 전에 막는다', [저장.length, /너무 큽니다/.test(말[말.length - 1])], [2, true]);

  /* 2026-10-13 — 시험지 원본·분석자료 */
  await F.addSchoolFile('광남고', '고1', { files: [{ name: '1쪽.jpg', type: 'image/jpeg', size: 9 }, { name: '2쪽.jpg', type: 'image/jpeg', size: 9 }], value: '' }, 'paper', '2026 · 1학기 중간');
  await F.addSchoolFile('광남고', '고1', { files: [{ name: '분석.pdf', type: 'application/pdf', size: 9 }], value: '' }, 'analysis', '2025 · 2학기 중간');
  const 목록 = F.schoolFilesOf('광남고', '고1');
  봄('⑤ 시험지는 여러 장이 한 번에 · kind 와 «누른 칸의 시험»이 붙는다 · 프린트엔 kind 가 없다',
    목록.map(f => [f.name, f.kind, f.season]), [['중간 프린트.pdf', undefined, '2026 · 2학기 중간'], ['1쪽.jpg', 'paper', '2026 · 1학기 중간'], ['2쪽.jpg', 'paper', '2026 · 1학기 중간'], ['분석.pdf', 'analysis', '2025 · 2학기 중간']]);
  봄('   여러 장이면 「외 n개」', 말[말.length - 2], '「1쪽.jpg」 외 1개를 올렸습니다.');
  const 판 = (k, s) => (F.schoolFilesHTML('광남고', '고1', k, s).match(/>[^<>]+\.(pdf|jpg)</g) || []);
  봄('   창은 종류마다 · 시험지·분석은 그 시험 것만 (프린트는 예전처럼 전부)',
    [판('print').length, 판('paper', '2026 · 1학기 중간').length, 판('paper', '2026 · 2학기 중간').length, 판('analysis', '2025 · 2학기 중간').length], [1, 2, 0, 1]);
  봄('🔴 걸러 낸 창에서도 지우기는 «전체 자리»를 넘긴다', /removeSchoolFile\('광남고','고1',3\)/.test(F.schoolFilesHTML('광남고', '고1', 'analysis', '2025 · 2학기 중간')), true);
  봄('   꼬리표의 해가 올린 날보다 먼저 — 작년 시험지를 올해 올려도 작년 칸', F.schoolFileSlotOf({ season: '2025 · 2학기 중간', at: '2026-10-13' }), '2025|2-mid');
}
{
  /* 2026-10-03 — 시즌 넘기기 단추가 없어졌다(학교별로 저절로). 프린트는 지우는 길 자체가 없다 */
  봄('③ 시즌을 넘기며 지우는 함수가 없다', /function (archiveCurrentSeason|saveSeason|endSeason)\(/.test(html), false);
  const 학생로딩 = lift('loadStudentData');
  봄('④ 학생 로그인은 이 문서를 안 읽는다 — 시험 범위 화면에서만 lazy', [/school-files/.test(학생로딩), /loadSchoolFilesIfNeeded\(\);/.test(lift('teacherExamRangeHTML'))], [false, true]);
  /* 2026-10-02 — 펼친 줄이 사라지고 «프린트 칸을 누르면 뜨는 창»에 선다(exam-pop-test 가 실제로 누른다) */
  봄('   프린트 칸 창에 선다', /SCHOOL_FILE_KINDS\[k\][\s\S]{0,120}schoolFilesHTML\(school, grade, k, p\.year/.test(lift('examPopHTML')), true);
}

{
  /* 2026-10-13 — 학교 › 시험 분석: 올린 분석지·원본을 화면 안에서 본다(드라이브 미리보기) */
  console.log(NL + '시험 분석 —' + NL);
  const state = { schoolFiles: {
    광남고: { 고1: [{ name: '프린트.pdf', fileId: 'P0', season: '2026 · 2학기 중간' },
                   { name: '원본.pdf', fileId: 'G1', season: '2026 · 2학기 중간', kind: 'paper' },
                   { name: '분석.pdf', fileId: 'A1', season: '2026 · 2학기 중간', kind: 'analysis' },
                   { name: '옛분석.pdf', fileId: 'A0', season: '2026 · 1학기 기말', kind: 'analysis' }] },
    대원고: { 고1: [{ name: '대원분석.pdf', fileId: 'D1', season: '2026 · 2학기 중간', kind: 'analysis' }] } } };
  const EXAM_SLOTS = [['1-mid'], ['1-fin'], ['2-mid'], ['2-fin']];
  const F = new Function('state', 'EXAM_SLOTS', 'SLOT_NAME', 'SLOT_OF_NAME', 'schoolYearOf', 'examSeasonOf', 'todayStr', 'escHtml', 'jsAttr', 'schoolShort', 'gradeLabel', 'loadSchoolFilesIfNeeded', 'render',
    [lift('schoolFileSlotOf'), lift('examAnalysisGroups'), lift('examAnalysisPick'), lift('teacherExamAnalysisHTML')].join(NL)
    + NL + 'return { examAnalysisGroups, examAnalysisPick, teacherExamAnalysisHTML };')(
    state, EXAM_SLOTS, { '1-fin': '1학기 기말', '2-mid': '2학기 중간' }, { '1학기 기말': '1-fin', '2학기 중간': '2-mid' }, d => String(d).slice(0, 4),
    () => ({ next: {} }), () => '2026-10-13', s => s, s => s, s => s.replace('고', ''), g => g, () => {}, () => {});
  const gs = F.examAnalysisGroups();
  봄('① 새 시험이 위 · 프린트는 안 든다 · 분석과 원본이 한 묶음', gs.map(g => [g.칸, g.school, g.analysis.length, g.paper.length]),
    [['2026|2-mid', '광남고', 1, 1], ['2026|2-mid', '대원고', 1, 0], ['2026|1-fin', '광남고', 1, 0]]);
  const 그림 = () => F.teacherExamAnalysisHTML();
  봄('② 처음엔 맨 위 묶음의 분석지를 화면 안에(드라이브 미리보기)', /data-file="A1"/.test(그림()), true);
  F.examAnalysisPick('G1');
  봄('   원본을 고르면 원본이 · 묶음은 그대로', [/data-file="G1"/.test(그림()), /class="ea-it on"[^>]*>\s*<b>광남/.test(그림())], [true, true]);
  F.examAnalysisPick('A0');
  봄('   지난 시험 묶음으로 옮겨 간다', [/data-file="A0"/.test(그림()), /2026 1학기 기말<\/b>/.test(그림())], [true, true]);
  state.schoolFiles = {};
  봄('③ 없으면 어디서 올리는지 말한다', /시험 일정[\s\S]*분석자료/.test(그림()), true);
  봄('④ 표의 «분석자료» 칸 고리는 내려받기 대신 이 탭으로', /event\.preventDefault\(\); \$\{k === 'analysis' \? `state\.anaPick=[\s\S]{0,60}goTeacherTab\('examanalysis'\)/.test(lift('examRangeTableHTML')), true);
}

console.log(틀림 ? NL + '  🔴 ' + 통과 + ' 통과 · ' + 틀림 + ' 실패' + NL : NL + '  ✅ ' + 통과 + ' 통과 · 0 실패' + NL);
process.exit(틀림 ? 1 : 0);
