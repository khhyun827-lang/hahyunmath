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
  const F = new Function('state', 'dbGet', 'dbSet', 'uploadFileToDrive', 'deleteFromDrive', 'showToast', 'render', 'todayStr', 'currentSeason',
    'fileSizeLabel', 'MATERIAL_MAX_BYTES', 'confirm', 'jsAttr', 'escHtml', 'materialLink',
    [lift('schoolFileDownload'), lift('loadSchoolFilesIfNeeded'), lift('schoolFilesOf'), lift('schoolFileSeasonLabel'), lift('addSchoolFile'), lift('removeSchoolFile'), lift('schoolFilesHTML')].join(NL)
    + NL + 'return { loadSchoolFilesIfNeeded, schoolFilesOf, addSchoolFile, removeSchoolFile, schoolFilesHTML };')(
    state, async () => ({ 광남고: { '고1': [{ name: '옛것.pdf', fileId: 'F0', size: 1000, at: '2025-10-01', season: '2025 · 2학기 중간' }] } }),
    async (k, v) => { 저장.push([k, JSON.parse(JSON.stringify(v))]); return true; },
    async (file) => ({ fileId: 'F1', url: 'https://drive/thumb' }), (id) => 지움.push(id), m => 말.push(m), () => {},
    () => '2026-09-22', () => '2학기 중간', n => n + 'B', 15 * 1024 * 1024, () => true, s => s, s => s, f => 'https://drive.google.com/file/d/' + f.fileId + '/view');

  await F.loadSchoolFilesIfNeeded();
  봄('① 지난해 것이 그대로 보인다 — 「해가 바뀌었을 때 찾아볼 수 있도록」', F.schoolFilesOf('광남고', '고1').map(f => f.season), ['2025 · 2학기 중간']);
  await F.addSchoolFile('광남고', '고1', { files: [{ name: '중간 프린트.pdf', type: 'application/pdf', size: 2048 }], value: '' });
  const 문서 = 저장[0][1];
  봄('🔴 올리면 kv/school-files 에 이름·크기·fileId·시즌만 남는다 (내용은 드라이브)',
    [저장[0][0], 문서.광남고.고1.length, Object.keys(문서.광남고.고1[1]).sort()], ['school-files', 2, ['at', 'fileId', 'mime', 'name', 'season', 'size', 'url']]);
  봄('   시즌은 올린 날의 것 — 「연도 · 시즌」', 문서.광남고.고1[1].season, '2026 · 2학기 중간');
  봄('   올렸다고 말한다', 말, ['「중간 프린트.pdf」을 올렸습니다.']);
  const 그림 = F.schoolFilesHTML('광남고', '고1');
  봄('   판에 두 파일이 서고 누르면 드라이브에서 «내려받는다»(09-24) · 올리는 단추는 PDF·사진만', [(그림.match(/drive\.google\.com\/uc\?export=download&id=F[01]"/g) || []).length, /accept="application\/pdf,image\/\*"/.test(그림)], [2, true]);
  await F.removeSchoolFile('광남고', '고1', 0);
  봄('② 지우면 목록에서 빠지고 드라이브도 지운다', [F.schoolFilesOf('광남고', '고1').map(f => f.name), 지움], [['중간 프린트.pdf'], ['F0']]);
  await F.addSchoolFile('광남고', '고1', { files: [{ name: '큰것.pdf', type: 'application/pdf', size: 20 * 1024 * 1024 }], value: '' });
  봄('   상한을 넘는 파일은 올리기 전에 막는다', [저장.length, /너무 큽니다/.test(말[말.length - 1])], [2, true]);
}
{
  const 넘기기 = lift('archiveCurrentSeason');
  봄('③ 시즌 넘기기는 학교 프린트를 건드리지 않는다', /schoolFiles|school-files/.test(넘기기), false);
  const 학생로딩 = lift('loadStudentData');
  봄('④ 학생 로그인은 이 문서를 안 읽는다 — 시험 범위 화면에서만 lazy', [/school-files/.test(학생로딩), /loadSchoolFilesIfNeeded\(\);/.test(lift('teacherExamRangeHTML'))], [false, true]);
  봄('   교재·메모 칸 바로 아래에 선다', /onchange="setSchoolBook\('\$\{sc\}','\$\{gr\}',this\.value\)"><\/label>\s*<\/div>\s*\$\{schoolFilesHTML\(school, grade\)\}/.test(html), true);
}

console.log(틀림 ? NL + '  🔴 ' + 통과 + ' 통과 · ' + 틀림 + ' 실패' + NL : NL + '  ✅ ' + 통과 + ' 통과 · 0 실패' + NL);
process.exit(틀림 ? 1 : 0);
